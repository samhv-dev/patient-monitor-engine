# Stage V: Ventilator fork + two-way ventilator ↔ patient-monitor link (R27, R35, R36) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Ali's ventilator simulator (v1.9, Hamilton-style cockpit) into this repo as `@pme/ventilator` — its mechanics engine ported to tick-driven TypeScript and proven bit-exact against traces captured from the original — and link it both ways to the patient engine: ventilator → `externalDrive` VentFrames at 50 Hz, engine → `lungState` into the ventilator's lung; add a sourced 39-row lung-pathology catalogue (R36/R37), the Hamilton front end as `apps/demo/vent-hamilton.html`, and a combined `apps/demo/vent-link.html` (ventilator + monitor, pathology picker, ten scripted demonstrations).

**Architecture:** `packages/ventilator` holds (1) the engine: the original's `S` config and `P` physics as plain JSON `VentState`, one pure `stepVent` per 5 ms (4 Euler sub-steps), 4 steps per 20 ms engine tick; (2) alarms and the VentFrame builder; (3) the lung input (lungState as a relative change of the profile lung) and an interim PEEP-recruitment → shunt model; (4) the pathology catalogue and its mapping to ventilator mechanics; (5) the link — a transport-agnostic core (`linkTick`/`linkEvent`), an in-process lockstep link for tests, and a window link over BroadcastChannel in which the ENGINE is the master clock (frames are stamped with engine ticks; the ventilator never runs more than 1.5 s ahead). Engine-core gets ONE additive change: an optional `palvCmH2O` (and `mode`) on the VentFrame in a new `types-vent-link.ts`, read with `??` in the external drive, so intrinsic PEEP reaches the venous-return coupling. The demo pages reuse the original markup/CSS verbatim and a TypeScript port of its UI.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Playwright 1.63 (system Chrome), Canvas 2D. No new runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R27 (link contract and demonstrations), R29 (PEEP coupling only above mean pressure 10 cmH2O), R31 (lung module is Stage 7b — the link must not wait for it), R35 (fork; the Hamilton file is the newest source), R36 (lung-pathology catalogue), R37 (evidence policy), R25 (partition, worktrees); `../research/09-evidence-rulings.md` R39 §5 (sidestream delay per skin: Philips-like 2.3 s, Masimo 2.6 s, Mindray/GE 3.5 s — the link's disconnection timing inherits the skin's delay) and §6 (capnogram α: 105° normal, 120/135/145° with bronchospasm severity — the link does not draw capnograms, the engine does; a bronchospasm `lungState` changes the ventilator's resistance, the engine's capnogram shape follows R39 §6); `docs/gates/stage-3.md` and `docs/plans/stage-3-respiratory-gas.md` (the VentFrame/lungState contract, decision 14 external drive, decision 7 PEEP coupling); the original simulator `projects/ventilator-simulator/repo/ventilator-sim-hamilton.html` (commit 65d80b6), its README/CHANGELOG/ROADMAP.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` unless absolute. **Base: `origin/main` ≥ `7d9c26f` (Stage 3 merged).** Prototyped on a copy of `main` `32b539f`; `main` has since moved to `d3027d0` (docs only). Every find/replace block below was checked to occur exactly once in that tree.
- **Branch and PR (R20/R21):** branch `stage-v-ventilator-link` in worktree `../scratch/wt-stage-v` (Task 1 creates both from `origin/main`). **Push after every task** (`git push origin stage-v-ventilator-link`). Never push to `main`, never merge; Task 21 opens the PR.
- **Partition (binding, R25).** Stage V OWNS `packages/ventilator/**`, `apps/demo/vent-*.html`, `apps/demo/src/vent/**`, `apps/demo/e2e/vent-link.e2e.ts`, `apps/demo/scripts/vent-shots.mjs`, `docs/gates/stage-V*`, and this plan. **Additive only elsewhere:** `packages/engine-core/src/types-vent-link.ts` (new), three `framePressure` reads in `src/l2/resp/driver.ts`, one validation term + one import in `src/l2/resp/pipeline.ts`, one export line in `src/index.ts`, one new test file; `apps/demo/package.json` (one dependency), `apps/demo/vite.config.ts` (one input line), `apps/demo/index.html` (one list item), `NOTICES.md` (two rows), `docs/physiology/stage-7-parameter-tables.md` (append §4b, generated). **Never edit** Stage 4b's files (`src/l3/alarms/**`, `src/l3/defib-pacer/**`, `packages/renderer/src/layout*`, skins) or Stage 5.1's (`src/l2/ecg/**`). If a concurrent stage merges first and a find block no longer matches, locate the quoted line by its neighbouring comment and apply the same change; never re-type a line you are not changing.
- Strict TS: `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (no enums, no parameter properties), `.ts` import extensions, `verbatimModuleSyntax`. Conventional commits ending with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (use your harness's attribution line if it gives a different one).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Package tests: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run <file>`; engine-core the same with `@pme/engine-core`. Adding the package changes `pnpm-lock.yaml`: run `npx -y pnpm@9.15.9 install` (not `--frozen-lockfile`) in Tasks 1 and 17 and commit the lockfile.
- **CI rule (G2, binding):** any test that runs the engine for more than ~1 sim-minute advances one sim-minute at a time and yields (`await new Promise((r) => setImmediate(r))`) — the `run()` helper in `packages/ventilator/test/helpers.ts`; such describes take `{ timeout: 300_000 }`.
- **Fidelity rule:** `src/mechanics.ts` and `src/vent.ts` keep the original's arithmetic in the original order (the LCG's float multiply included). The only behavioural change to v1.9 physics is Correction C1 (Task 5), which the orchestrator may reject on its own; everything marked `// Stage V` is new behaviour that never runs in the reference scenarios.
- Visual checks and screenshots use headless system Chrome (`channel: 'chrome'`), never the desktop Browser pane. Gate screenshots ≤ 60 KB (the script lowers JPEG quality until they fit).
- No logos, no vendor names in UI text beyond "Hamilton-style" in comments/docs; the original's credit line ("Independent educational reimplementation — not affiliated with any manufacturer.") stays on the page.
- Evidence (R37): every number in the pathology catalogue carries a source or `ENG` with its reasoning; textbook citations use the extracted sentence. The catalogue is data for Ali's review (§4b of the parameter tables), not settled physiology.

## What the original engine contains (read of `ventilator-sim-hamilton.html` v1.9, 595 lines)

- **Engine block (lines 170–256, ≈ 90 dense lines):** `S` (one flat record: settings, alarm limits AND the patient's lung), `P` (physics + per-breath bookkeeping), `PRESETS` (ARDS ×3, COPD, asthma), `SCENARIOS` (7 asynchronies), `recoilPressure` (linear V/C with airway closure, upper inflection ×2.2, stress index), `expResistance` (flow limitation × severity, PEEP stenting), `pmusValue` (rise/hold/decay effort), `stepPhysics` (5 ms step = 4 Euler sub-steps of the equation of motion; VC is a flow source with a Pmax clamp, every other mode a pressure source with a half-cosine rise), `controller` (per-mode targets), `advancePhase` (cycling: VC volume/time, PC/PRVC time, PSV flow-%, PAV effort end; triggering: mandatory period, patient flow/pressure trigger, 6 s backup in spontaneous modes; holds), `patientTriggers`, `startInspiration`/`startExpiration` (auto-PEEP = recoil at breath start, PRVC ±3 cmH2O adaptation, latched numerics), `updateMeasurements` (Pmean EMA, RR over 8 breaths, MV, P0.1), `pushSample` (display lag 0.11/step + 72/min ripple + noise, sharing the LCG with the variability draw).
- **Five engine modes only** — VC, PC, PRVC, PSV, PAV. The Hamilton names are a menu layer: (S)CMV+ → VC; APVcmv/APVsimv → PRVC; PCV+/DuoPAP/APRV → PC; PSIMV+/SPONT/NIV/NIV-ST → PSV; ASV → PAV.
- **Settings without behaviour in v1.9:** sigh, TRC, apnoea backup, apnoea time, FiO2 (no gas exchange at all). The port keeps them as settings; Stage V wires FiO2 (into the VentFrame) and the apnoea time (an `apnea` alarm).
- **UI block (lines 258–592):** header/alarm banner, numeric column, three canvas lanes with sweep/erase gap/trigger markers, Dynamic Lung view + three cockpit panels, round drag/scroll knobs, Modes/Controls(Basic/More/Apnea)/Alarms sheets, patient drawer, asynchrony buttons, rAF loop.

## Decisions this plan makes where the spec was silent or the pieces did not fit

1. **Port first, bit-exact.** Ten reference scenarios are captured from the ORIGINAL file in headless Chrome (its rAF loop disabled, `stepPhysics` called by hand, 50 Hz rows of Paw/flow/volume/Pmus/phase/displayed Paw + final numerics). The port runs the same setup strings (the test binds `S`, `setMode`, `loadPreset`, `runScenario` to the port) and must match to the fixture's 0.001 rounding. Prototype: every trace matches to ≤ 5 × 10⁻⁴ (pure rounding) on all six columns, and breath counts and final PIP/PLAT/RR/VTE/MV/auto-PEEP/Pmean match to 2 decimals.
2. **Correction C1 (VC volume cycling).** v1.9 cycles a VC breath when the ABSOLUTE lung volume (`vtDelivered = V`) reaches VT, so trapped gas shortens every breath and caps dynamic hyperinflation (COPD at RR 20 delivered 275 of 560 mL; the breath-stacking scenario's stacked breath was 104 mL). The correction measures the breath's own volume (`V − breathVstart`). It changes 3 of 10 reference traces from the first VC breath that starts on trapped gas (3.26 s, 1.08 s, 3.26 s); the fidelity test compares those three bit-for-bit up to that time and a separate test asserts the corrected behaviour. Without C1 the COPD demonstration shows MAP −5 mmHg instead of −20 (both measured). **Ali to confirm at the gate** (it changes his engine's behaviour); Task 5 is separately revertible.
3. **Time base.** One ventilator step is 5 ms; the ventilator advances by whole 20 ms engine ticks (4 steps) and sends ONE frame per tick (50 Hz, R27's ceiling). In process the two run in lockstep (vent to t → frame → `engine.advanceTo(t)` → lungState to the vent). Across windows the ENGINE is the master clock: the monitor side stamps each frame `atTick = ventTick + offset` (offset learnt from the first unstamped dispatch, which returns engine tick + 1, plus a 5-tick lead; it only grows by lateness the engine reports) and publishes a `clock` limit derived from engine event timestamps; the ventilator never runs more than 75 ticks (1.5 s) ahead. Pause and time-scale messages go both ways. Measured in headless Chrome: ×1 and ×4 exact, ventilator 30 ms ahead; at ×10 the headless worker holds only ×4 and the ventilator stays 1.33 s ahead (without the limit it ran 10× ahead and breath detection read RR 100).
4. **Intrinsic PEEP must reach the circulation → optional `palvCmH2O` on the VentFrame.** Stage 3's coupling acts on the mean of the frames' pressure; mean AIRWAY pressure barely sees gas trapping (Paw = set PEEP throughout expiration). The ventilator knows alveolar pressure, so frames carry it and the external drive integrates `palvCmH2O ?? pawCmH2O` (new file `types-vent-link.ts`, three `??` reads — a Paw-only frame behaves exactly as before; Stage 3's u(t) reference `U_REF_CMH2O` is itself an alveolar swing). Measured: COPD GOLD 3–4 at RR 20 has mean Palv 21.7 vs mean Paw 9.8 cmH2O. `mode` rides along (R27 lists it) and is not consumed.
5. **Volume in the frame = the breath's own volume** (`V − breathVstart`, floor 0), like a ventilator's VT trace, so trapped gas never inflates the engine's VT; pause and inspiratory hold count as inspiration (Ti includes the pause, as ventilators report it).
6. **lungState is a RELATIVE change of the profile's lung** until Stage 7 profiles put COPD/ARDS mechanics into lungState itself: compliance and resistance = profile value × (current / first lungState); `autoPeepTendency > 0` switches on flow limitation (≥ 0.6 severe, ≥ 0.3 moderate); `effort` adds a patient Pmus of 8 × effort cmH2O only when the profile does not breathe on its own; shunt, dead space and FRC are carried for display. A local change to the lung (drawer, demo, page) moves the base (`patchVent`), or the next lungState would put the old lung back.
7. **PEEP recruitment is interim and lives in the link** (R31 puts it in Stage 7b). Recruited fraction r = logistic(total PEEP; P50, k) reached with τ 40 s up / 10 s down [ENG]; shunt = shuntMin + (shuntMax − shuntMin)(1 − r), sent as `setTarget shunt` when it moves ≥ 0.005. Rows that do not recruit get their fixed shunt once at start. Delete when 7b emits shunt.
8. **Vascular events the ventilator cannot cause get STAND-INS** (`STAND_INS`, [ENG]): in MANUAL mode pressures are targets, so massive PE, tension pneumothorax, anaphylaxis and air embolism set SBP/DBP/CVP/HR over 20 s (EtCO2 then falls through Stage 3's low-flow factor). `volumeStatus` alone was tried and does not move BP or CO in MANUAL. Deleted when Stage 7a's right heart consumes `pvrMultiplier`.
9. **Disconnection** is a ventilator event (the circuit opens at the Y-piece): the ventilator reads Paw 0, the lung empties, frames go empty, and the link sends `applyEvent airway disconnected` (and `patent` on reconnection) so the engine cuts gas exchange at once (Stage 3 M4). The ventilator alarm `Disconnection on patient side` fires when a delivered breath raised no pressure (PIP < PEEP + 2): +0.94 s at 14/min. The capnogram goes flat after the skin's sidestream delay (R39 §5: 2.3 s Philips-like; up to 3.5 s Mindray/GE-like) and the EtCO2 numeric reaches 0 when its 10 s peak window empties.
10. **Window link has its own tiny protocol** (`pme-vent/<session>` BroadcastChannel: `cmds`, `lungState`, `clock`, `time`, `control`), not the controller's HostSession: the ventilator is a device on the host, not a controller, and the controller's samples guard/roles add nothing here. The combined page hosts the ventilator in an `<iframe>` (its own window context, exactly the path a separate window uses).
11. **Freeze** freezes the ventilator DISPLAY only (v1.9 also stopped the physics; with a patient behind it the physics cannot stop — frames would stop and the engine's 5 s drive watchdog would call apnoea). Holds run on sim time (v1.9 ran 2 steps per animation frame).
12. **Profiles = pathology rows.** The picker lists all 39 catalogue rows (grouped); each row maps to a patient (`PatientProfile` fields that exist today: size, sex, age, baseline; obese/pregnant/neonate/COPD/HF differ from the 70 kg adult), the ventilator lung (`mechanicsToVent`), the recruitment curve and stand-ins. Expiratory resistance above inspiratory is expressed with v1.9's flow-limitation term using a custom factor (`eflK = R_insp/R_exp`, no stenting).
13. **Catalogue sourcing (R37).** The three local textbooks were extracted to text with PyMuPDF and searched; each row cites the sentences found (Miller 10e by PDF page — its running heads carry no chapter number in extraction; Co-Existing 8e and Dellinger 5e by chapter and printed page). Where no sentence gives the number, the value is `ENG` with its reasoning, listed for Ali in §4b. Signature bands are the clinically reported ranges at the reference settings; the per-row test runs the ventilator model and requires plateau, driving pressure, auto-PEEP and peak−plateau inside them (it guards the mapping and internal consistency; the bands themselves are the review item).
14. **Test imports across packages.** The link tests read cardiac output with `cardiacOutput` from `../../engine-core/src/l2/gas/coupling.ts` through the engine snapshot (as Stage 3's `hemoOf` does) — test-only, no runtime dependency.

## Prototype results (a copy of `main` `32b539f` with exactly the code in this plan)

Full run: `typecheck` clean in every package; `@pme/ventilator` **87 tests** (13 files); engine-core **372** (369 + 3 new); `check-notices` OK; `build` OK (vent-hamilton 32.6 kB JS, vent-link 4.7 kB); Playwright `vent-link.e2e.ts` **2 passed (1.1 min)**; engine-core's full suite unchanged by the `palvCmH2O` change.

| Check | Result |
|---|---|
| Port fidelity, 10 scenarios (VC, VC decel COPD RR 20, PC ARDS, PRVC convergence, PSV, PAV/ASV, ineffective efforts, breath stacking, auto-trigger, VC + spontaneous variability) | max |error| ≤ 5.0 × 10⁻⁴ on Paw, flow, volume, Pmus, displayed Paw (= the fixture's rounding); phase identical; breath counts and final numerics equal to 2 decimals. After C1: 7 traces whole, 3 identical up to 3.26/1.08/3.26 s |
| C1 | COPD RR 20 VT 560 (Pmax 60): VTE 561.7 (±1 step of flow), auto-PEEP 8.1 → 11.9 cmH2O; breath-stacking stacked VT 350 (v1.9: 104) |
| In-process speed | 240 sim-s of ventilator + engine in 4.1 s (≈ 60 × real time) |
| PEEP 5 → 15 (normal) | CO 4.90 → 4.44 (−9.4 %), MAP 97.1 → 83.6, CVP 6.0 → 8.1 (Stage 3's gate: −9 %, 97 → 83, 6.0 → 8.2) |
| FiO2 0.4 → 1.0 (ARDS moderate, VT 420) | SpO2 89 → 94.3 in 3 min (shunt-limited, refractory as expected) |
| RR 14 → 22 (VT 500) | EtCO2 37.9 → 34.0 at +2 min → 31.0 at +10 min (Stage 3's two-compartment kinetics) |
| COPD GOLD 3–4, VT 560, RR 10 → 20 | auto-PEEP 2.8 → 9.9 cmH2O, MAP 93.7 → 73.9, CO 4.80 → 4.03, CVP 6.4 → 8.6; back to RR 10: MAP 93.6 |
| ARDS moderate, FiO2 0.6, PEEP 5 → 15 → 5 | SpO2 91 → 98 (recruitment over 1–4 min), CO 4.96 → 4.34, MAP 97 → 83; PEEP 5 again: 92.9 within 60 s |
| Cardiogenic oedema PEEP 5 → 12 | SpO2 95 → 98, CO 4.95 → 4.50, MAP 97 → 85 |
| PH crisis (PEEP 15 + RR 8) | EtCO2 37 → 42, CVP 6.0 → 7.9, MAP 97 → 85 (RV-failure signature waits for 7a) |
| Tension pneumothorax (C 38 → 18 + stand-in) | plateau 18.2 → 32.8, SpO2 98 → 91, MAP 97 → 50, CVP 6 → 18, EtCO2 37 → 30 |
| Massive PE (stand-in, ventilation unchanged) | EtCO2 37 → 31, CO 4.87 → 3.60, MAP 97 → 55, plateau unchanged |
| Fibrosis | driving pressure 16.7 at VT 490 → 11.7 at VT 350 × RR 20 |
| Disconnection | ventilator alarm +0.94 s; capnogram < 1 mmHg from +4 s (sidestream 2.3 s); EtCO2 numeric 0 by +14 s |
| Determinism | seed 42 twice → identical SHA-256 over ventilator Paw/Q/V and engine co2/abp/pleth; seed 43 differs |
| Catalogue | 39 rows; every row's plateau / ΔP / auto-PEEP / peak−plateau inside its band (e.g. ARDS moderate 20.3 / 15.3 / 0 / 12.8; COPD 3–4 17.7 / 7.5 / 5.2 / 21.9; tension PTX 32.2 / 27.2 / 0 / 13.7; neonatal RDS 15.0 / 10.0 / 0 / 5.6) |
| Browser | vent-hamilton.html: breathes, Modes → PCV+ → Confirm, a knob scroll turns PEEP; vent-link.html at ×4: awRR 14, lungState reaches the ventilator, Disconnection alarm and EtCO2 0, COPD demo MAP −10 or more, `page errors: []` |

## Hooks for later stages

- **Stage 7a (two-sided heart):** `pvrMultiplier`/`hpvSensitivity` in every catalogue row are ready; delete `STAND_INS` (`link/profiles.ts`) and the demos' `engineStep` when the engine produces RV failure itself.
- **Stage 7b (lungs):** when lungState carries the profile's own mechanics and shunt, `LinkProfile.vent` shrinks to ventilator settings, `link/recruit.ts` is deleted, and `applyLungState` takes absolute values instead of ratios (one function).
- **R39 skins:** the disconnection/EtCO2 timing follows whatever sidestream delay the active skin sets; the link does not hard-code it.
- **Stage 8:** the IIFE embed can host `createVentDriver` + `attachMonitorToLink` unchanged.

## File map

| Path | Responsibility |
|---|---|
| `packages/ventilator/{package.json,tsconfig.json,vite.config.ts}` | the package (depends on `@pme/engine-core`) |
| `packages/ventilator/reference/{ventilator-sim-hamilton.v1.9.html,LICENSE,scenarios.json}` | the original (provenance + fidelity source), the author's MIT grant, the 10 reference scenarios |
| `packages/ventilator/scripts/capture-reference.mjs` | runs the original in headless Chrome → `test/fixtures/reference-traces.json` |
| `packages/ventilator/scripts/catalogue-md.ts` | prints the catalogue as §4b of the parameter tables |
| `packages/ventilator/src/types.ts` | `VentConfig` (the original `S`), `VentPhysics` (`P`), `VentState`, alarm types |
| `packages/ventilator/src/mechanics.ts` | recoil, expiratory resistance, Pmus, PBW, the LCG |
| `packages/ventilator/src/presets.ts` | defaults, presets, Hamilton mode names |
| `packages/ventilator/src/vent.ts` | the engine: step, advance, phases, triggers, measurements, display chain, scenarios, front-panel actions |
| `packages/ventilator/src/alarms.ts` | v1.9 banner rules + disconnection + apnea |
| `packages/ventilator/src/frame.ts` | VentState → R27 VentFrame |
| `packages/ventilator/src/lung-input.ts` | lungState → ventilator lung |
| `packages/ventilator/src/pathology/{catalogue,mechanics}.ts` | the R36 catalogue; row → ventilator lung, recruitment, reference run |
| `packages/ventilator/src/link/{recruit,profiles,core,in-process,port,vent-driver}.ts` | interim recruitment; link profiles + stand-ins; transport-agnostic core; lockstep link; window link (monitor side); ventilator side |
| `packages/ventilator/src/index.ts` | public exports |
| `packages/ventilator/test/*.test.ts`, `test/helpers.ts`, `test/fixtures/reference-traces.json` | unit, fidelity, link, R36, ports, determinism tests |
| `packages/engine-core/src/types-vent-link.ts` (+ 3 reads in `l2/resp/driver.ts`, 2 lines in `l2/resp/pipeline.ts`, 1 in `index.ts`), `test/l2/resp/vent-frame-ext.test.ts` | the optional `palvCmH2O`/`mode` frame fields |
| `apps/demo/vent-hamilton.html`, `apps/demo/src/vent/{hamilton-ui,hamilton-page}.ts` | the Hamilton front end on the TS engine |
| `apps/demo/vent-link.html`, `apps/demo/src/vent/{demos,link-page}.ts` | combined page, pathology picker, ten demonstrations |
| `apps/demo/e2e/vent-link.e2e.ts`, `apps/demo/scripts/vent-shots.mjs` | browser test; gate screenshots |
| `apps/demo/{package.json,vite.config.ts,index.html}` | one line each |
| `NOTICES.md` | N-060 (the fork), N-061 (rtmaven inspiration note) |
| `docs/gates/stage-V.md`, `docs/gates/stage-V/*.jpg`, `docs/physiology/stage-7-parameter-tables.md` §4b | gate evidence; the catalogue for Ali's review |

## Tasks

1. Branch, worktree, package scaffold, reference copy, licence, NOTICES
2. Types, lung mechanics and presets data
3. The ventilator engine (faithful port)
4. Reference-trace capture and the fidelity test
5. Correction C1: VC volume cycling
6. Engine-core: optional `palvCmH2O`/`mode` on the VentFrame
7. Ventilator alarms and the VentFrame builder
8. lungState input and interim recruitment
9. Pathology catalogue I: schema, mapping, signature test; normal, obstructive and airway rows
10. Pathology catalogue II: parenchymal and restrictive rows
11. Pathology catalogue III: vascular, pleural, device and special rows
12. Link profiles, link core and the in-process link
13. R27 link acceptance tests
14. R36 demonstration tests
15. Linked determinism
16. Window link: BroadcastChannel port, monitor side, ventilator driver
17. Demo: the Hamilton front end (`vent-hamilton.html`)
18. Demo: the combined page (`vent-link.html`) with picker and demonstrations
19. Gate screenshots and the catalogue §4b for Ali
20. Gate note
21. Full verification and PR

---

### Task 1: Branch, worktree, package scaffold, reference copy, licence, NOTICES

**Files:**
- Create: `packages/ventilator/{package.json,tsconfig.json,vite.config.ts,src/index.ts}`, `packages/ventilator/reference/{ventilator-sim-hamilton.v1.9.html,LICENSE}`, `packages/ventilator/test/reference.test.ts`
- Modify: `NOTICES.md` (append two rows), `pnpm-lock.yaml` (by `pnpm install`)

**Interfaces:**
- Produces: workspace package `@pme/ventilator` (entry `src/index.ts`), dependency `@pme/engine-core: workspace:*`; the reference copy later tasks read (`reference/ventilator-sim-hamilton.v1.9.html`, sha256 `47b31a23…7472`).

- [x] **Step 1: Create the branch and worktree**

```bash
git fetch origin && git worktree add ../scratch/wt-stage-v -b stage-v-ventilator-link origin/main
cd ../scratch/wt-stage-v
git log --oneline -1 origin/main   # must contain 7d9c26f (Stage 3 merge) in its history: git merge-base --is-ancestor 7d9c26f HEAD && echo ok
npx -y pnpm@9.15.9 install --frozen-lockfile
```

From here on every command runs inside `../scratch/wt-stage-v` (the worktree is the repo root for this plan's relative paths). Copy this plan into the branch: `cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-v-ventilator-link.md docs/plans/` (tick its checkboxes as you go).

- [x] **Step 2: Write the failing test**

**Create `packages/ventilator/test/reference.test.ts`:**

```ts
// Provenance of the fork (R35, NOTICES N-060): the reference copy is byte-identical to ventilator-simulator
// commit 65d80b6's ventilator-sim-hamilton.html (v1.9), and carries the author's MIT grant beside it.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ref = (f: string) => resolve(import.meta.dirname, '../reference', f);

describe('ventilator-simulator reference copy', () => {
  it('is v1.9 exactly (sha256) and has its licence', () => {
    const sha = createHash('sha256').update(readFileSync(ref('ventilator-sim-hamilton.v1.9.html'))).digest('hex');
    expect(sha).toBe('47b31a2304b94c1e93142c822c10dd405c0fd5f8588821c26d144997de347472');
    expect(readFileSync(ref('LICENSE'), 'utf8')).toMatch(/MIT License\s+Copyright \(c\) 2026 Ali Mahdavi/);
  });
});
```

- [x] **Step 3: Create the package**

**Create `packages/ventilator/package.json`:**

```json
{
  "name": "@pme/ventilator",
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
    "@pme/engine-core": "workspace:*"
  }
}
```

**Create `packages/ventilator/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "vite.config.ts"]
}
```

**Create `packages/ventilator/vite.config.ts`:**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

**Create `packages/ventilator/src/index.ts`** (Task 2 replaces the `export {};` line):

```ts
// @pme/ventilator — the ventilator fork (R35) and the R27 two-way link to @pme/engine-core.
export {};
```

- [x] **Step 4: Run the test to verify it fails**

Run: `npx -y pnpm@9.15.9 install && npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/reference.test.ts`
Expected: FAIL — `ENOENT … reference/ventilator-sim-hamilton.v1.9.html`.

- [x] **Step 5: Copy the reference and add the licence**

```bash
mkdir -p packages/ventilator/reference
git -C ../../../ventilator-simulator/repo log -1 --format=%h -- ventilator-sim-hamilton.html   # expect 65d80b6
cp ../../../ventilator-simulator/repo/ventilator-sim-hamilton.html packages/ventilator/reference/ventilator-sim-hamilton.v1.9.html
shasum -a 256 packages/ventilator/reference/ventilator-sim-hamilton.v1.9.html   # expect 47b31a2304b94c1e93142c822c10dd405c0fd5f8588821c26d144997de347472
```

(`../../../ventilator-simulator` is `projects/ventilator-simulator`. If the hash differs, STOP and report: the source of truth moved after R35.)

The original project has no licence file; Ali's grant for the fork (R35) is recorded beside the copy. **Create `packages/ventilator/reference/LICENSE`:**

```
MIT License

Copyright (c) 2026 Ali Mahdavi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [x] **Step 6: NOTICES rows**

Append these two rows at the end of the table in `NOTICES.md` (IDs N-060/N-061 are a Stage V block, clear of N-001–N-013 and N-050–N-052 on every branch; the Pulse ports of Stage 7c will take their own block):

```markdown
| N-060 | Mechanical ventilator simulator v1.9 (`ventilator-sim-hamilton.html`, projects/ventilator-simulator commit 65d80b6, 2026-07-19) — Ali Mahdavi's own project; reference copy at `packages/ventilator/reference/ventilator-sim-hamilton.v1.9.html` | Local repository (no public URL); author Ali Mahdavi | MIT (the original carried no licence file; the author's grant is recorded in `packages/ventilator/reference/LICENSE`) | Forked (ruling R35): the mechanics engine is ported to TypeScript in `packages/ventilator/src` (bit-exact against captured traces, plus correction C1), the Hamilton-style front end to `apps/demo/vent-hamilton.html` + `src/vent/`; the reference copy is used only to capture fidelity traces and is not bundled | 2026-09-25 |
| N-061 | RT Maven ventilator simulator (inspiration note, carried from the ventilator-simulator README/ROADMAP) | https://sim.rtmaven.com | Not applicable — nothing copied | The ventilator-simulator's v1.0 "Classic" skin was designed from a feature description of this simulator (no code, assets or screen captures); the Hamilton-style front end ported here descends from that project, so the credit travels with it | 2026-09-25 |
```

- [x] **Step 7: Run the test and the checks**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/reference.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck && npx -y pnpm@9.15.9 check-notices`
Expected: 1 passed; typecheck clean; `check-notices: OK`.

- [x] **Step 8: Commit and push**

```bash
git add packages/ventilator NOTICES.md pnpm-lock.yaml docs/plans/stage-v-ventilator-link.md
git commit -m "feat(ventilator): @pme/ventilator scaffold with the v1.9 reference copy, MIT grant and NOTICES N-060/N-061

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin stage-v-ventilator-link
```

### Task 2: Types and lung mechanics

**Files:**
- Create: `packages/ventilator/src/types.ts`, `packages/ventilator/src/mechanics.ts`, `packages/ventilator/test/mechanics.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Produces: `VentMode` (`'VC'|'PC'|'PRVC'|'PSV'|'PAV'`), `Shape`, `VentPhase`, `VentConfig` (the original `S`, every key), `Measured`, `Marker`, `VentPhysics` (the original `P` + `dPaw`, `dFlow`, `dispPaw`, `dispFlowLpm`), `VentState { cfg, p, seed, flowTarget, hold, pendingHold, n, circuit, lastBreathT, silenceUntil }`, `VentAlarmId`, `VentAlarm`; `clamp(x,a,b)`, `easeShape(x, sh)`, `pbw(cfg)`, `recoilPressure(cfg, v)`, `expResistance(cfg)`, `pmusValue(cfg, t)`, `pmusDuration(cfg)`, `simRand(vs)`. From `presets.ts` (created here, used by Task 3): `DEFAULT_CONFIG`, `PresetId`, `PRESETS`, `PRESET_KEYS`, `HAMILTON_MODES`, `MODE_MAP`, `modeName(cfg)`.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/mechanics.test.ts`:**

```ts
// The ported lung mechanics (v1.9 formulas) and the original's LCG stream.
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, easeShape, expResistance, pbw, pmusValue, recoilPressure, simRand, type VentConfig, type VentState } from '../src/index.ts';

const cfg = (o: Partial<VentConfig> = {}): VentConfig => ({ ...DEFAULT_CONFIG, ...o });

describe('v1.9 mechanics', () => {
  it('linear recoil V/C; airway closure (sqrt below the recruited volume); upper inflection ×2.2 above threshold − PEEP', () => {
    expect(recoilPressure(cfg(), 500)).toBe(10);
    const ards = cfg({ compliance: 33, airwayClosure: true, openPressure: 14, recruitedVol: 180 });
    expect(recoilPressure(ards, 45)).toBeCloseTo(7, 9);
    expect(recoilPressure(ards, 510)).toBeCloseTo(24, 9);
    expect(recoilPressure(cfg({ uip: true, uipThresh: 20, peep: 5 }), 1000)).toBeCloseTo(15 + 5 * 2.2, 9);
  });
  it('expiratory resistance: flow limitation × severity, PEEP stenting down to 30 %; custom factor 1/eflK', () => {
    expect(expResistance(cfg())).toBe(10);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'moderate', peep: 3 }))).toBe(30);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'severe', peep: 15, peepStent: 100 }))).toBeCloseTo(15, 9);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'custom', eflK: 0.25, peepStent: 0 }))).toBeCloseTo(40, 9);
  });
  it('Pmus: smoothstep rise to A = pmus·(0.4 + 0.6·responsiveness), hold, half-cosine decay; PBW (Devine)', () => {
    const c = cfg({ pmus: 10, responsiveness: 50 });
    expect(pmusValue(c, 0.15)).toBeCloseTo(7 * easeShape(0.5, 'smoothstep'), 9);
    expect(pmusValue(c, 0.32)).toBeCloseTo(7, 9);
    expect(pmusValue(c, 0.35 + 0.2)).toBeCloseTo(3.5, 9);
    expect(pmusValue(c, 2)).toBe(0);
    expect(pbw(cfg({ sex: 'female', height: 165 }))).toBeCloseTo(45.5 + 2.3 * (165 / 2.54 - 60), 9);
  });
  it('simRand reproduces the original float-multiply LCG from seed 12345', () => {
    const vs = { seed: 12345 } as VentState;
    const xs = [simRand(vs), simRand(vs), simRand(vs)];
    let s = 12345;
    const ref = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    expect(xs).toEqual([ref(), ref(), ref()]);
    let m = 12345;
    const imul = () => { m = (Math.imul(m, 1103515245) + 12345) & 0x7fffffff; return m / 0x7fffffff; };
    expect(xs).not.toEqual([imul(), imul(), imul()]); // the rounding of the float product is part of the stream
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/mechanics.test.ts`
Expected: FAIL — `DEFAULT_CONFIG`/`recoilPressure` not exported.

- [x] **Step 3: Create the types**

**Create `packages/ventilator/src/types.ts`:**

```ts
// @pme/ventilator public types. The configuration is ONE flat record, exactly the original simulator's `S`
// (ventilator-sim-hamilton.html v1.9): ventilator settings, alarm limits AND the patient's lung mechanics, so the
// reference scenarios (reference/scenarios.json) run unchanged on the port. `LUNG_KEYS` (lung-input.ts) lists
// the keys the patient engine's `lungState` owns.
export type VentMode = 'VC' | 'PC' | 'PRVC' | 'PSV' | 'PAV';
export type Shape = 'linear' | 'smoothstep' | 'halfcos' | 'exp';
export type VentPhase = 'insp' | 'pause' | 'exp';

export interface VentConfig {
  mode: VentMode; peep: number; rate: number; itime: number; fio2: number; riseTime: number;
  trigType: 'flow' | 'pressure'; flowTrig: number; presTrig: number;
  vt: number; vcFlow: number; flowPattern: 'square' | 'decel'; pause: number; pc: number; prvcTarget: number;
  ps: number; cycleOff: number; pmax: number; pavAssist: number;
  sex: '' | 'male' | 'female'; height: number; compliance: number; resistance: number;
  spont: boolean; spontRate: number; pmus: number; responsiveness: number;
  pmusRise: number; pmusHold: number; pmusDecay: number; riseShape: Shape; decayShape: Shape; pmusOffset: number;
  airwayClosure: boolean; openPressure: number; recruitedVol: number; stressIdx: boolean; stressB: number;
  uip: boolean; uipThresh: number; reverseTrig: boolean; entrainRatio: '1:1' | '1:2' | '1:3';
  efl: boolean; eflSeverity: 'mild' | 'moderate' | 'severe' | 'custom'; pcrit: number; eflK: number; peepStent: number;
  cardiac: boolean; hr: number; variability: boolean; varPct: number;
  showPmus: boolean; showP01: boolean; sweepSec: number;
  /** Hamilton-style name shown in the header when several names share one engine mode (HAMILTON_MODES). */
  modeLabel: string | null;
  /** Carried from v1.9, where they are settings without behaviour (sigh, TRC, apnoea backup): kept unwired. */
  sigh: boolean; trc: boolean; trcPct: number; apneaTime: number; backup: boolean; backupRate: number;
  almMVlo: number; almMVhi: number; almFlo: number; almFhi: number; almVTlo: number; almVThi: number;
  _preset?: string | null;
}

export interface Measured {
  PIP: number; PLAT: number; RR: number; VTE: number; MV: number; P01: number; autoPEEP: number; Pmean: number;
}

export interface Marker { t: number; type: 'mand' | 'pt' }

/** The original's `P` (physics + per-breath bookkeeping). Plain JSON data. */
export interface VentPhysics {
  V: number; Q: number; Paw: number; Pmus: number; Palv: number; t: number; phase: VentPhase; phaseT: number; breathT: number;
  targetPaw: number; peakInspFlow: number; vtDelivered: number; prvcPressure: number; lastVTE: number;
  neuralT: number; neuralMult: number; lastMandStart: number; breathCount: number; pipCur: number; breathVstart: number;
  curBreathSpont: boolean; lastPtT: number | null; measured: Measured; shown: Measured | null;
  breathTimes: number[]; markers: Marker[];
  /** Display chain (valve/sensor lag + cardiogenic ripple + noise), what the screen draws. */
  dPaw: number | null; dFlow: number | null; dispPaw: number; dispFlowLpm: number;
}

export interface VentState {
  cfg: VentConfig;
  p: VentPhysics;
  /** The original's LCG seed (`_seed`); shared by the variability draw and the display noise, as in v1.9. */
  seed: number;
  flowTarget: number;
  hold: 'insp' | 'exp' | null;
  pendingHold: 'insp' | 'exp' | null;
  /** 5 ms steps taken (the scheduling clock; `p.t` accumulates exactly as the original does). */
  n: number;
  /** Stage V addition: circuit disconnected at the Y-piece. */
  circuit: 'connected' | 'disconnected';
  /** Stage V addition: last time a breath started (apnoea alarm). */
  lastBreathT: number;
  silenceUntil: number;
}

export type VentAlarmId =
  | 'pmax' | 'mvHigh' | 'mvLow' | 'vtHigh' | 'vtLow' | 'fHigh' | 'fLow' | 'intrinsicPeep' | 'disconnection' | 'apnea';
export interface VentAlarm { id: VentAlarmId; text: string; priority: 'high' | 'medium' }
```

- [x] **Step 4: Create the mechanics and the presets data**

**Create `packages/ventilator/src/mechanics.ts`** (line-for-line port; keep the arithmetic order):

```ts
// Lung mechanics of the original simulator (ventilator-sim-hamilton.html v1.9, "ENGINE" block), ported line
// for line: single-compartment equation of motion Paw + Pmus = V/C + R·Q + PEEP with a non-linear recoil
// (airway closure, upper inflection, stress index), expiratory flow limitation and the patient's Pmus waveform.
// Keep the arithmetic in the original order: the fidelity test compares against traces of the original.
import type { Shape, VentConfig, VentState } from './types.ts';

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);

export function easeShape(x: number, sh: Shape): number {
  x = clamp(x, 0, 1);
  if (sh === 'linear') return x;
  if (sh === 'smoothstep') return x * x * (3 - 2 * x);
  if (sh === 'halfcos') return 0.5 - 0.5 * Math.cos(Math.PI * x);
  if (sh === 'exp') return 1 - Math.exp(-3 * x);
  return x;
}

/** Predicted body weight (kg) from height and sex (Devine; the original's `pbw`). */
export function pbw(c: VentConfig): number {
  const hin = c.height / 2.54;
  const base = c.sex === 'female' ? 45.5 : 50;
  return Math.max(30, base + 2.3 * (hin - 60));
}

/** Elastic recoil (cmH2O above PEEP) at volume v (mL above the PEEP volume). */
export function recoilPressure(c: VentConfig, v: number): number {
  const C = c.compliance;
  let p = v / C;
  if (c.airwayClosure) {
    const vO = c.recruitedVol > 0 ? c.recruitedVol : 150;
    if (v < vO) p = c.openPressure * Math.sqrt(clamp(v / vO, 0, 1));
    else p = c.openPressure + (v - vO) / C;
  }
  if (c.uip) {
    const pU = c.uipThresh - c.peep;
    if (p > pU) p = pU + (p - pU) * 2.2;
  }
  if (c.stressIdx && c.stressB !== 1.0) {
    const f = clamp(v / 700, 0.001, 1.2);
    p *= Math.pow(f, c.stressB - 1);
  }
  return p;
}

const EFL_SEVERITY = { mild: 1.8, moderate: 3.0, severe: 5.0 } as const;

/** Expiratory resistance (cmH2O/L/s): flow limitation multiplies R, PEEP stents it (floor 0.3). */
export function expResistance(c: VentConfig): number {
  let R = c.resistance;
  if (c.efl) {
    const sev = c.eflSeverity === 'custom' ? 1 / Math.max(0.05, c.eflK) : EFL_SEVERITY[c.eflSeverity] || 3;
    const st = 1 - (c.peepStent / 100) * clamp((c.peep - 3) / 12, 0, 1);
    R *= sev * clamp(st, 0.3, 1);
  }
  return R;
}

/** Patient muscle pressure (cmH2O, positive = inspiratory) t seconds into a neural breath. */
export function pmusValue(c: VentConfig, t: number): number {
  const A = c.pmus * (0.4 + 0.6 * (c.responsiveness / 100));
  const tr = c.pmusRise;
  const th = c.pmusHold;
  const td = c.pmusDecay;
  if (t < 0) return 0;
  if (t < tr) return A * easeShape(t / tr, c.riseShape);
  if (t < tr + th) return A;
  if (t < tr + th + td) return A * (1 - easeShape((t - tr - th) / td, c.decayShape));
  return 0;
}
export const pmusDuration = (c: VentConfig): number => c.pmusRise + c.pmusHold + c.pmusDecay;

/**
 * The original's LCG (`simRand`). The float multiply is DELIBERATE: `seed * 1103515245` exceeds 2^53 and the
 * rounding is part of the sequence — Math.imul would give a different stream and break the fidelity traces.
 */
export function simRand(vs: VentState): number {
  vs.seed = (vs.seed * 1103515245 + 12345) & 0x7fffffff;
  return vs.seed / 0x7fffffff;
}
```

**Create `packages/ventilator/src/presets.ts`** (v1.9 defaults, presets and mode names as data):

```ts
// Defaults, patient presets, asynchrony scenarios and the Hamilton-style mode names of v1.9, as data.
import type { VentConfig, VentMode } from './types.ts';

export const DEFAULT_CONFIG: VentConfig = {
  mode: 'VC', peep: 5, rate: 14, itime: 1.0, fio2: 40, riseTime: 0.15, trigType: 'flow', flowTrig: 2.0, presTrig: -2.0,
  vt: 500, vcFlow: 60, flowPattern: 'square', pause: 0.3, pc: 15, prvcTarget: 450, ps: 12, cycleOff: 25, pmax: 35, pavAssist: 60,
  sex: '', height: 170, compliance: 50, resistance: 10, spont: false, spontRate: 16, pmus: 6, responsiveness: 80,
  pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, riseShape: 'smoothstep', decayShape: 'halfcos', pmusOffset: 0.0,
  airwayClosure: false, openPressure: 0, recruitedVol: 0, stressIdx: false, stressB: 1.0, uip: false, uipThresh: 28,
  reverseTrig: false, entrainRatio: '1:1', efl: false, eflSeverity: 'moderate', pcrit: 6, eflK: 0.35, peepStent: 40,
  cardiac: false, hr: 75, variability: false, varPct: 8, showPmus: false, showP01: false, sweepSec: 12,
  modeLabel: null,
  sigh: false, trc: false, trcPct: 100, apneaTime: 20, backup: true, backupRate: 12,
  almMVlo: 3.0, almMVhi: 12.0, almFlo: 5, almFhi: 40, almVTlo: 200, almVThi: 800,
};

export type PresetId = 'ardsMild' | 'ardsMod' | 'ardsSev' | 'copd' | 'asthma';
export const PRESETS: Record<PresetId, { label: string; cls: string } & Partial<VentConfig>> = {
  ardsMild: { label: 'ARDS Mild', cls: 'pill-ylw', compliance: 45, resistance: 12, airwayClosure: true, openPressure: 10, recruitedVol: 120 },
  ardsMod: { label: 'ARDS Mod', cls: 'pill-ylw', compliance: 33, resistance: 13, airwayClosure: true, openPressure: 14, recruitedVol: 180, uip: true, uipThresh: 27 },
  ardsSev: { label: 'ARDS Severe', cls: 'pill-org', compliance: 22, resistance: 15, airwayClosure: true, openPressure: 18, recruitedVol: 220, uip: true, uipThresh: 25 },
  copd: { label: 'COPD', cls: 'pill-red', compliance: 60, resistance: 22, efl: true, eflSeverity: 'moderate', pcrit: 7 },
  asthma: { label: 'Asthma', cls: 'pill-blu', compliance: 50, resistance: 35, efl: true, eflSeverity: 'severe', pcrit: 9 },
};
export const PRESET_KEYS = ['compliance', 'resistance', 'airwayClosure', 'openPressure', 'recruitedVol', 'efl', 'eflSeverity', 'pcrit', 'uip', 'uipThresh'] as const;

/** Hamilton-style mode groups → the engine mode that drives them (v1.9 `HMODES`). */
export const HAMILTON_MODES: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, VentMode]>]> = [
  ['Volume controlled (adaptive)', [['(S)CMV+', 'VC'], ['APVcmv', 'PRVC'], ['APVsimv', 'PRVC']]],
  ['Pressure controlled (biphasic)', [['PCV+', 'PC'], ['PSIMV+', 'PSV'], ['SPONT', 'PSV'], ['DuoPAP', 'PC'], ['APRV', 'PC']]],
  ['Intelligent Ventilation', [['ASV', 'PAV']]],
  ['Noninvasive', [['NIV', 'PSV'], ['NIV-ST', 'PSV']]],
];
export const MODE_MAP: Record<string, VentMode> = Object.fromEntries(HAMILTON_MODES.flatMap(([, l]) => l.map(([nm, m]) => [nm, m])));
const DEFAULT_NAME: Record<VentMode, string> = { VC: '(S)CMV+', PC: 'PCV+', PRVC: 'APVcmv', PSV: 'PSIMV+', PAV: 'ASV' };
export const modeName = (c: VentConfig): string => c.modeLabel ?? DEFAULT_NAME[c.mode];
```

In `packages/ventilator/src/index.ts` replace `export {};` with:

```ts
export * from './types.ts';
export * from './mechanics.ts';
export * from './presets.ts';
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/mechanics.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 4 passed; typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): v1.9 config/physics types, lung mechanics and presets ported to TypeScript

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 3: The ventilator engine (faithful port)

**Files:**
- Create: `packages/ventilator/src/vent.ts`, `packages/ventilator/test/vent-basics.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: Task 2's types, mechanics, presets.
- Produces: `DT = 0.005`, `SUBSTEPS = 4`, `SEED0 = 12345`; `createVent(cfg?: Partial<VentConfig>): VentState`; `resetPhysics(vs)`; `setMode(vs, m)`; `loadPreset(vs, id)`; `SCENARIOS: Record<string, {name, apply(vs)}>`; `runScenario(vs, id)`; `startInspiration(vs, mandatory)`; `stepVent(vs)` (one 5 ms step); `advanceVent(vs, t, onStep?)` (steps while `(n+1)·DT ≤ t`, calling `onStep` after each); `toggleHold(vs, 'insp'|'exp')`; `manualBreath(vs)`; `setCircuit(vs, 'connected'|'disconnected')`; `silenceAlarms(vs)`.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/vent-basics.test.ts`:**

```ts
// The ported engine's headline behaviours (the exact traces are Task 4's fidelity test).
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, manualBreath, MODE_MAP, modeName, runScenario, setMode, toggleHold } from '../src/index.ts';

describe('ventilator engine', () => {
  it('default (S)CMV+: 5 breaths in 20 s, VTE 500, PIP 24.9, plateau 15, 4 steps per 20 ms', () => {
    const vs = createVent();
    advanceVent(vs, 20);
    expect(vs.n).toBe(4000);
    expect(vs.p.breathCount).toBe(5);
    expect(vs.p.measured.VTE).toBeCloseTo(500, 0);
    expect(vs.p.measured.PIP).toBeCloseTo(24.88, 1);
    expect(vs.p.measured.PLAT).toBeCloseTo(15, 0);
    expect(modeName(vs.cfg)).toBe('(S)CMV+');
  });
  it('APVcmv (PRVC) converges on its 450 mL target in 60 s at C 35', () => {
    const vs = createVent({ compliance: 35, rate: 16 });
    setMode(vs, 'PRVC');
    advanceVent(vs, 60);
    expect(Math.abs(vs.p.measured.VTE - 450)).toBeLessThan(5);
  });
  it('holds: an inspiratory hold stops flow at the next cycle point; a manual breath is patient-type', () => {
    const vs = createVent();
    toggleHold(vs, 'insp');
    advanceVent(vs, 5);
    expect(vs.hold).toBe('insp');
    expect(vs.p.Q).toBe(0);
    toggleHold(vs, 'insp');
    advanceVent(vs, 8);
    while (vs.p.phase !== 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    manualBreath(vs);
    expect(vs.p.markers.at(-1)?.type).toBe('pt');
  });
  it('asynchrony scenarios load and run; Hamilton names map to engine modes', () => {
    const vs = createVent();
    runScenario(vs, 'autoTrig');
    advanceVent(vs, 20);
    expect(vs.p.breathCount).toBe(11);
    expect([MODE_MAP.DuoPAP, MODE_MAP.ASV, MODE_MAP['NIV-ST']]).toEqual(['PC', 'PAV', 'PSV']);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/vent-basics.test.ts`
Expected: FAIL — `createVent` is not exported.

- [x] **Step 3: Implement the engine**

**Create `packages/ventilator/src/vent.ts`** — the v1.9 functions in their original order and arithmetic. The VC cycling line is v1.9's (`p.vtDelivered >= c.vt`); Task 5 corrects it. Lines marked `// Stage V` (open circuit, apnoea clock) never run in the reference scenarios.

```ts
// The ventilator engine: the original simulator's stepPhysics / controller / advancePhase / patientTriggers /
// startInspiration / startExpiration / updateMeasurements / pushSample (v1.9), as pure functions over a plain
// JSON `VentState`. One step = 5 ms (4 Euler sub-steps of 1.25 ms), so one 20 ms patient-engine tick = 4 steps.
// Stage V additions are marked `// Stage V` and never run on the reference scenarios (circuit, apnoea clock).
import { clamp, easeShape, expResistance, pmusDuration, pmusValue, recoilPressure, simRand } from './mechanics.ts';
import { DEFAULT_CONFIG, PRESET_KEYS, PRESETS, type PresetId } from './presets.ts';
import type { Measured, VentConfig, VentMode, VentPhysics, VentState } from './types.ts';

export const DT = 0.005;
export const SUBSTEPS = 4;
export const SEED0 = 12345;
const DISPLAY_LAG = 0.11; // first-order display lag per step (v1.8 "valve/sensor dynamics")

const zeroMeasured = (peep: number): Measured => ({ PIP: 0, PLAT: 0, RR: 0, VTE: 0, MV: 0, P01: 0, autoPEEP: 0, Pmean: peep });

export function createVent(cfg: Partial<VentConfig> = {}): VentState {
  const c: VentConfig = { ...DEFAULT_CONFIG, ...cfg };
  const p: VentPhysics = {
    V: 0, Q: 0, Paw: 5, Pmus: 0, Palv: 5, t: 0, phase: 'exp', phaseT: 0, breathT: 0, targetPaw: 5, peakInspFlow: 0, vtDelivered: 0,
    prvcPressure: 15, lastVTE: 0, neuralT: 0, neuralMult: 1, lastMandStart: 0, breathCount: 0, pipCur: 5, breathVstart: 0,
    curBreathSpont: false, lastPtT: null, measured: zeroMeasured(5), shown: null, breathTimes: [], markers: [],
    dPaw: null, dFlow: null, dispPaw: 5, dispFlowLpm: 0,
  };
  const vs: VentState = { cfg: c, p, seed: SEED0, flowTarget: 0, hold: null, pendingHold: null, n: 0, circuit: 'connected', lastBreathT: 0, silenceUntil: 0 };
  resetPhysics(vs);
  return vs;
}

/** v1.9 `resetPhysics` (the Reset button; also every scenario load). */
export function resetPhysics(vs: VentState): void {
  const c = vs.cfg;
  Object.assign(vs.p, {
    V: 0, Q: 0, Paw: c.peep, Palv: c.peep, phase: 'exp', phaseT: 0, breathT: 999, vtDelivered: 0, lastVTE: 0, prvcPressure: c.pc,
    neuralT: 0, neuralMult: 1, lastMandStart: 0, breathCount: 0, pipCur: c.peep, breathVstart: 0, curBreathSpont: false,
    measured: zeroMeasured(c.peep), breathTimes: [], markers: [], shown: null, dPaw: null, dFlow: null,
  } satisfies Partial<VentPhysics>);
  vs.hold = null;
  vs.pendingHold = null;
  vs.lastBreathT = vs.p.t; // Stage V
}

export function setMode(vs: VentState, m: VentMode): void {
  vs.cfg.mode = m;
  vs.cfg.modeLabel = null;
  if (m === 'PSV' || m === 'PAV') vs.cfg.spont = true;
}

export function loadPreset(vs: VentState, id: PresetId): void {
  const pr = PRESETS[id];
  if (!pr) return;
  Object.assign(vs.cfg, { airwayClosure: false, efl: false, uip: false });
  const target = vs.cfg as unknown as Record<string, unknown>;
  for (const k of PRESET_KEYS) if (pr[k] !== undefined) target[k] = pr[k];
  vs.cfg._preset = id;
}

function resetPatientDefaults(c: VentConfig): void {
  Object.assign(c, {
    spont: false, reverseTrig: false, cardiac: false, variability: false, efl: false, airwayClosure: false, uip: false, stressIdx: false,
    trigType: 'flow', flowTrig: 2.0, presTrig: -2.0, responsiveness: 80, pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, pmusOffset: 0.0,
  } satisfies Partial<VentConfig>);
}

/** v1.9 asynchrony scenarios (`SCENARIOS`). */
export const SCENARIOS: Record<string, { name: string; apply(vs: VentState): void }> = {
  revTrigPC: { name: 'Reverse Triggering (Early) PC', apply(vs) { setMode(vs, 'PC'); Object.assign(vs.cfg, { pc: 14, rate: 16, itime: 1.0, peep: 6, spont: true, pmus: 7, spontRate: 16, reverseTrig: true, entrainRatio: '1:1', pmusOffset: 0.25, compliance: 35, resistance: 12 }); } },
  revTrigVC: { name: 'Reverse Triggering (Early) VC', apply(vs) { setMode(vs, 'VC'); Object.assign(vs.cfg, { vt: 420, rate: 16, peep: 6, spont: true, pmus: 8, spontRate: 16, reverseTrig: true, entrainRatio: '1:1', pmusOffset: 0.3, compliance: 35, resistance: 12, vcFlow: 45 }); } },
  ineffective: { name: 'Ineffective Efforts', apply(vs) { setMode(vs, 'PC'); loadPreset(vs, 'copd'); Object.assign(vs.cfg, { pc: 14, rate: 12, itime: 1.0, peep: 5, spont: true, pmus: 4, spontRate: 22, responsiveness: 60, efl: true, eflSeverity: 'severe' }); } },
  earlyCycle: { name: 'Early Cycling', apply(vs) { setMode(vs, 'PSV'); Object.assign(vs.cfg, { ps: 10, peep: 5, cycleOff: 60, spont: true, pmus: 7, spontRate: 16, pmusRise: 0.3, pmusHold: 0.25, pmusDecay: 0.6, responsiveness: 100, flowTrig: 1.0, compliance: 30, resistance: 6 }); } },
  lateCycle: { name: 'Late Cycling', apply(vs) { setMode(vs, 'PSV'); loadPreset(vs, 'copd'); Object.assign(vs.cfg, { ps: 14, peep: 5, cycleOff: 10, spont: true, pmus: 8, spontRate: 16 }); } },
  breathStack: { name: 'Breath-Stacking', apply(vs) { setMode(vs, 'VC'); Object.assign(vs.cfg, { vt: 350, rate: 18, peep: 5, spont: true, pmus: 11, spontRate: 20, pmusDecay: 0.8, responsiveness: 95, compliance: 40, resistance: 12, vcFlow: 50 }); } },
  autoTrig: { name: 'Auto-trigger (False Trigger)', apply(vs) { setMode(vs, 'PSV'); Object.assign(vs.cfg, { ps: 10, peep: 5, flowTrig: 0.6, trigType: 'flow', spont: false, pmus: 0, cardiac: true, hr: 95, compliance: 55, resistance: 10 }); } },
};

export function runScenario(vs: VentState, id: string): void {
  const s = SCENARIOS[id];
  if (!s) return;
  resetPatientDefaults(vs.cfg);
  s.apply(vs);
  vs.cfg._preset = null;
  resetPhysics(vs);
}

const spontActive = (c: VentConfig) => c.spont || c.mode === 'PSV' || c.mode === 'PAV' || c.reverseTrig;
const vcTi = (c: VentConfig) => c.vt / 1000 / Math.max(0.05, c.vcFlow / 60);

function updateSpontaneous(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  if (!spontActive(c)) {
    p.neuralT = 0;
    return;
  }
  if (c.reverseTrig) return;
  p.neuralT += DT;
  const per = (60 / Math.max(4, c.spontRate)) * (p.neuralMult || 1);
  if (p.neuralT >= per) {
    p.neuralT -= per;
    p.neuralMult = c.variability ? 1 + (simRand(vs) - 0.5) * 2 * (c.varPct / 100) : 1;
  }
}

function currentPmus(vs: VentState): number {
  const c = vs.cfg;
  const p = vs.p;
  if (!spontActive(c)) return 0;
  let ph: number;
  if (c.reverseTrig) {
    const r = { '1:1': 1, '1:2': 2, '1:3': 3 }[c.entrainRatio] || 1;
    if ((p.breathCount || 0) % r !== 0) return 0;
    ph = p.t - ((p.lastMandStart || 0) + c.pmusOffset);
  } else ph = p.neuralT;
  if (ph < 0 || ph > pmusDuration(c)) return 0;
  return pmusValue(c, ph);
}

const rampTo = (vs: VentState, target: number) => target * Math.min(1, easeShape(vs.p.phaseT / Math.max(0.02, vs.cfg.riseTime), 'halfcos'));

function controller(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const peep = c.peep;
  if (p.phase === 'insp') {
    if (c.mode === 'VC') {
      const Ti = vcTi(c);
      const mean = c.vcFlow / 60;
      if (c.flowPattern === 'square') vs.flowTarget = mean;
      else vs.flowTarget = mean * (4 / 3 - (2 / 3) * clamp(p.phaseT / Ti, 0, 1));
    } else if (c.mode === 'PC') p.targetPaw = peep + Math.min(rampTo(vs, c.pc), c.pmax - peep);
    else if (c.mode === 'PRVC') p.targetPaw = peep + Math.min(rampTo(vs, p.prvcPressure), c.pmax - peep);
    else if (c.mode === 'PSV') p.targetPaw = peep + Math.min(rampTo(vs, c.ps), c.pmax - peep);
    else if (c.mode === 'PAV') {
      const g = c.pavAssist / 100;
      const as = g * (recoilPressure(c, p.V) + c.resistance * Math.max(0, p.Q));
      p.targetPaw = peep + clamp(as, 0, c.pmax - peep);
    }
  } else {
    p.targetPaw = peep;
    vs.flowTarget = 0;
  }
}

function patientTriggers(vs: VentState): boolean {
  const c = vs.cfg;
  const p = vs.p;
  const ap = p.measured.autoPEEP || 0;
  const net = Math.max(0, p.Pmus - ap);
  let sL = (net / Math.max(2, c.resistance)) * 60;
  let sP = net;
  if (c.cardiac && Math.abs(p.Q * 60) < 12) {
    const b = Math.max(0, Math.sin(2 * Math.PI * (c.hr / 60) * p.t));
    sL += b * 1.05;
    sP += b * 0.45;
  }
  if (sL <= 0.01 && sP <= 0.01) return false;
  if (c.trigType === 'flow') return sL >= c.flowTrig;
  return sP >= -c.presTrig;
}

export function startInspiration(vs: VentState, mandatory: boolean): void {
  const p = vs.p;
  p.measured.autoPEEP = Math.max(0, recoilPressure(vs.cfg, p.V));
  p.phase = 'insp';
  p.phaseT = 0;
  p.breathT = 0;
  p.vtDelivered = 0;
  p.peakInspFlow = 0;
  p.pipCur = p.Paw;
  if (mandatory) p.lastMandStart = p.t;
  p.breathVstart = p.V;
  p.breathCount++;
  p.curBreathSpont = !mandatory;
  if (!mandatory) p.lastPtT = p.t;
  p.markers.push({ t: p.t, type: mandatory ? 'mand' : 'pt' });
  if (p.markers.length > 60) p.markers.shift();
  vs.lastBreathT = p.t; // Stage V: apnoea clock
}

function startExpiration(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  p.phase = 'exp';
  p.phaseT = 0;
  p.measured.PIP = p.pipCur || p.Paw;
  const tidal = Math.max(0, p.V - (p.breathVstart || 0));
  p.lastVTE = tidal;
  p.measured.VTE = tidal;
  if (c.mode === 'PRVC') {
    const err = c.prvcTarget - tidal;
    p.prvcPressure = clamp(p.prvcPressure + clamp(err * 0.01, -3, 3), 5, c.pmax - c.peep);
  }
  p.breathTimes.push(p.t);
  while (p.breathTimes.length > 8) p.breathTimes.shift();
  p.shown = { ...p.measured };
}

function advancePhase(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  p.phaseT += DT;
  p.breathT += DT;
  const mp = 60 / Math.max(4, c.rate);
  const isSpont = c.mode === 'PSV' || c.mode === 'PAV';
  if (p.phase === 'insp') {
    let cyc = false;
    const Ti = c.mode === 'VC' ? vcTi(c) : c.itime;
    if (c.mode === 'VC') {
      if (p.vtDelivered >= c.vt || p.phaseT >= Ti) cyc = true;
    } else if (c.mode === 'PC' || c.mode === 'PRVC') {
      if (p.phaseT >= c.itime) cyc = true;
    } else if (c.mode === 'PSV') {
      p.peakInspFlow = Math.max(p.peakInspFlow, p.Q);
      if (p.Q <= p.peakInspFlow * (c.cycleOff / 100) && p.phaseT > 0.15) cyc = true;
      if (p.phaseT > 3) cyc = true;
    } else if (c.mode === 'PAV') {
      if (p.Pmus <= 0.2 && p.phaseT > 0.2) cyc = true;
      if (p.phaseT > 3) cyc = true;
    }
    if (cyc) {
      p.measured.PLAT = c.peep + recoilPressure(c, p.V);
      if (c.pause > 0 && c.mode === 'VC') {
        p.phase = 'pause';
        p.phaseT = 0;
      } else startExpiration(vs);
      if (vs.pendingHold === 'insp') {
        vs.hold = 'insp';
        vs.pendingHold = null;
        p.measured.PLAT = c.peep + recoilPressure(c, p.V);
      }
    }
  } else if (p.phase === 'pause') {
    p.measured.PLAT = p.Palv;
    if (p.phaseT >= c.pause) startExpiration(vs);
  } else {
    const minEx = 0.25;
    let tg = false;
    let md = false;
    if (!isSpont && p.breathT >= mp) {
      tg = true;
      md = true;
    }
    if (p.phaseT >= minEx && patientTriggers(vs)) tg = true;
    if (isSpont && p.breathT >= Math.max(mp, 6)) {
      tg = true;
      md = true;
    }
    if (vs.pendingHold === 'exp' && p.phaseT > 0.3) {
      vs.hold = 'exp';
      vs.pendingHold = null;
      p.measured.autoPEEP = Math.max(0, recoilPressure(c, p.V));
      return;
    }
    if (tg) startInspiration(vs, md);
  }
}

function updateMeasurements(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const m = p.measured;
  if (p.phase === 'insp') p.pipCur = Math.max(p.pipCur || 0, p.Paw);
  m.Pmean = m.Pmean * 0.997 + p.Paw * 0.003;
  if (p.breathTimes.length >= 2) {
    let s = 0;
    for (let i = 1; i < p.breathTimes.length; i++) s += (p.breathTimes[i] as number) - (p.breathTimes[i - 1] as number);
    const a = s / (p.breathTimes.length - 1);
    m.RR = a > 0 ? 60 / a : 0;
  }
  m.VTE = p.lastVTE;
  m.MV = (m.RR * m.VTE) / 1000;
  m.P01 = c.spont || c.mode === 'PSV' || c.mode === 'PAV' ? Math.min(p.Pmus, pmusValue(c, 0.1)) : 0;
}

/** Display chain (v1.8 pushSample): first-order lag, then a 72/min cardiogenic ripple and sensor noise. */
function displaySample(vs: VentState): void {
  const p = vs.p;
  p.dPaw = p.dPaw == null ? p.Paw : p.dPaw + (p.Paw - p.dPaw) * DISPLAY_LAG;
  p.dFlow = p.dFlow == null ? p.Q * 60 : p.dFlow + (p.Q * 60 - p.dFlow) * DISPLAY_LAG;
  const card = Math.sin(2 * Math.PI * (72 / 60) * p.t);
  const pN = card * 0.12 + (simRand(vs) - 0.5) * 0.09;
  const fN = card * 0.9 + (simRand(vs) - 0.5) * 0.8;
  p.dispPaw = p.dPaw + pN;
  p.dispFlowLpm = p.dFlow + fN;
}

/** One 5 ms step (v1.9 `stepPhysics`). */
export function stepVent(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const R_in = c.resistance;
  const Rexp = expResistance(c);
  const peep = c.peep;
  const open = vs.circuit === 'disconnected'; // Stage V: the lung empties to the room, the vent reads 0
  updateSpontaneous(vs);
  p.Pmus = currentPmus(vs);
  controller(vs);
  for (let s = 0; s < SUBSTEPS; s++) {
    const dt = DT / SUBSTEPS;
    const recoil = recoilPressure(c, p.V);
    const Palv = peep + recoil - p.Pmus;
    let Q: number;
    if (open) {
      Q = (p.Pmus - peep - recoil) / Rexp;
      p.Paw = 0;
    } else if (vs.hold) {
      Q = 0;
      p.Paw = peep + recoil;
    } else if (p.phase === 'insp' && c.mode === 'VC') {
      Q = vs.flowTarget;
      p.Paw = peep + recoil + Q * R_in - p.Pmus;
      if (p.Paw > c.pmax) {
        p.Paw = c.pmax;
        Q = (p.Paw - peep - recoil + p.Pmus) / R_in;
      }
    } else if (p.phase === 'pause') {
      Q = 0;
      p.Paw = peep + recoil;
    } else {
      const paw = p.targetPaw;
      const Rn = p.phase === 'exp' ? Rexp : R_in;
      Q = (paw + p.Pmus - peep - recoil) / Rn;
      p.Paw = paw;
    }
    p.V += Q * 1000 * dt;
    if (p.V < 0) {
      p.V = 0;
      if (Q < 0) Q = 0;
    }
    p.Q = Q;
    p.Palv = Palv;
    p.t += dt;
  }
  if (c.cardiac) {
    const osc = Math.sin(2 * Math.PI * (c.hr / 60) * p.t);
    p.Q += osc * 0.006;
    p.Paw += osc * 0.15;
  }
  if (p.phase === 'insp') p.vtDelivered = p.V;
  if (!vs.hold) advancePhase(vs);
  updateMeasurements(vs);
  displaySample(vs);
  vs.n++;
}

/** Step until the vent clock reaches sim time `t` (s). Sim time = n·DT, so 4 steps per 20 ms engine tick. */
export function advanceVent(vs: VentState, t: number, onStep?: (vs: VentState) => void): void {
  while ((vs.n + 1) * DT <= t + 1e-9) {
    stepVent(vs);
    onStep?.(vs);
  }
}

// --- front-panel actions (v1.9 rail buttons) -------------------------------------------------------------
/** Insp/Exp hold: arm on the next cycle point; pressing again releases. */
export function toggleHold(vs: VentState, kind: 'insp' | 'exp'): void {
  if (vs.hold) vs.hold = null;
  else vs.pendingHold = kind;
}
/** Manual breath: a patient-type (non-mandatory) breath, only from expiration. */
export function manualBreath(vs: VentState): void {
  if (vs.p.phase === 'exp') startInspiration(vs, false);
}
export function setCircuit(vs: VentState, state: 'connected' | 'disconnected'): void {
  vs.circuit = state;
}
export const silenceAlarms = (vs: VentState): void => {
  vs.silenceUntil = vs.p.t + 120;
};
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './vent.ts';
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 9 passed (reference 1, mechanics 4, basics 4); typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): tick-driven port of the v1.9 engine (modes, triggers, cycling, holds, measurements, display chain)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 4: Reference-trace capture and the fidelity test

**Files:**
- Create: `packages/ventilator/reference/scenarios.json`, `packages/ventilator/scripts/capture-reference.mjs`, `packages/ventilator/test/fixtures/reference-traces.json` (generated), `packages/ventilator/test/fidelity.test.ts`

**Interfaces:**
- Consumes: the reference copy (Task 1); `createVent`, `setMode`, `loadPreset`, `runScenario`, `resetPhysics`, `stepVent`, `DT`, `SEED0` (Task 3).
- Produces: `runReference(tr)` and `maxErr(a, b, col, until?)` exported from `test/fidelity.test.ts`; `CORRECTED_FROM_S` (empty here; Task 5 fills it).

- [x] **Step 1: Write the scenarios**

**Create `packages/ventilator/reference/scenarios.json`** — each `setup` is JavaScript run against the ORIGINAL page's globals (`S`, `setMode`, `loadPreset`, `runScenario`); the fidelity test runs the same strings against the port:

```json
[
  { "id": "vc-default", "durS": 20, "setup": "" },
  { "id": "vc-decel-copd-rr20", "durS": 30, "setup": "loadPreset('copd');Object.assign(S,{flowPattern:'decel',rate:20,vt:560,vcFlow:60,pause:0})" },
  { "id": "pc-ards-mod", "durS": 20, "setup": "setMode('PC');loadPreset('ardsMod');Object.assign(S,{pc:18,peep:10,itime:0.9,rate:20})" },
  { "id": "prvc-convergence", "durS": 60, "setup": "setMode('PRVC');Object.assign(S,{prvcTarget:450,rate:16,itime:1.0,compliance:35})" },
  { "id": "psv-spont", "durS": 20, "setup": "setMode('PSV');Object.assign(S,{ps:10,cycleOff:25,spont:true,spontRate:18,pmus:6})" },
  { "id": "asv-pav", "durS": 20, "setup": "setMode('PAV');Object.assign(S,{pavAssist:60,spont:true,spontRate:16,pmus:8})" },
  { "id": "scn-ineffective", "durS": 30, "setup": "runScenario('ineffective')" },
  { "id": "scn-breath-stack", "durS": 20, "setup": "runScenario('breathStack')" },
  { "id": "scn-auto-trigger", "durS": 20, "setup": "runScenario('autoTrig')" },
  { "id": "vc-spont-variability", "durS": 30, "setup": "Object.assign(S,{spont:true,spontRate:22,pmus:5,variability:true,varPct:15})" }
]
```

- [x] **Step 2: Write the failing test**

**Create `packages/ventilator/test/fidelity.test.ts`:**

```ts
// Port fidelity: every reference scenario captured from the ORIGINAL simulator in headless Chrome
// (scripts/capture-reference.mjs → test/fixtures/reference-traces.json) runs on the TypeScript port with the
// same setup string, and the 50 Hz traces and final numerics must match.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVent, loadPreset, resetPhysics, runScenario, setMode, stepVent, DT, SEED0, type VentState } from '../src/index.ts';

interface Trace { id: string; durS: number; setup: string; rows: number[][]; measured: Record<string, number>; breaths: number }
const ref = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/reference-traces.json'), 'utf8')) as { traces: Trace[] };
const PHASE = { insp: 0, pause: 1, exp: 2 } as const;
/**
 * Correction C1 (VC cycles on the breath's own volume) changes three reference scenarios from the first VC breath
 * that starts on trapped gas: they are compared bit-for-bit UP TO that time (s); the corrected behaviour after it
 * is asserted in vent-corrections.test.ts. Every other scenario is compared whole.
 */
export const CORRECTED_FROM_S: Record<string, number> = {};

/** Run a reference scenario on the port: the SAME setup string, with S/setMode/loadPreset/runScenario bound to the port. */
export function runReference(tr: Trace): { vs: VentState; rows: number[][] } {
  const vs = createVent();
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('S', 'setMode', 'loadPreset', 'runScenario', tr.setup)(
    vs.cfg, (m: never) => setMode(vs, m), (id: never) => loadPreset(vs, id), (id: string) => runScenario(vs, id),
  );
  resetPhysics(vs);
  vs.seed = SEED0;
  const rows: number[][] = [];
  const n = Math.round(tr.durS / DT);
  for (let i = 1; i <= n; i++) {
    stepVent(vs);
    const p = vs.p;
    if (i % 4 === 0) rows.push([p.Paw, p.Q, p.V, p.Pmus, PHASE[p.phase], p.dPaw ?? 0]);
  }
  return { vs, rows };
}

export function maxErr(a: number[][], b: number[][], col: number, until = Infinity): number {
  let e = 0;
  for (let i = 0; i < Math.min(a.length, b.length, Math.round(until * 50)); i++) e = Math.max(e, Math.abs((a[i]![col] as number) - (b[i]![col] as number)));
  return e;
}

describe('port fidelity against the original v1.9 simulator', () => {
  it.each(ref.traces.map((t) => [t.id, t] as const))('%s', (id, tr) => {
    const { vs, rows } = runReference(tr);
    const until = CORRECTED_FROM_S[id] ?? Infinity;
    expect(rows.length).toBe(tr.rows.length);
    const tol = [1e-3, 1e-3, 1e-3, 1e-3, 0, 1e-3]; // Paw, flow L/s, volume mL, Pmus, phase, displayed Paw (fixture rounded to 0.001)
    tol.forEach((tl, col) => expect(maxErr(rows, tr.rows, col, until)).toBeLessThanOrEqual(tl));
    if (until === Infinity) {
      expect(vs.p.breathCount).toBe(tr.breaths);
      for (const k of ['PIP', 'PLAT', 'RR', 'VTE', 'MV', 'autoPEEP', 'Pmean'] as const) expect(vs.p.measured[k]).toBeCloseTo(tr.measured[k]!, 2);
    }
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/fidelity.test.ts`
Expected: FAIL — `ENOENT … fixtures/reference-traces.json`.

- [x] **Step 4: Write the capture script and capture the traces**

**Create `packages/ventilator/scripts/capture-reference.mjs`:**

```js
// Captures reference traces from the ORIGINAL single-file simulator (reference/ventilator-sim-hamilton.v1.9.html,
// ventilator-simulator repo commit 65d80b6) in headless Chrome: for each scenario in reference/scenarios.json the
// page's own engine is stepped by hand (its rAF loop is disabled), 50 Hz rows [Paw, Q L/s, V mL, Pmus, phase,
// displayed Paw] and the final numerics are written to test/fixtures/reference-traces.json.
// Run: node packages/ventilator/scripts/capture-reference.mjs   (needs Google Chrome; Playwright channel 'chrome')
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const pkg = resolve(import.meta.dirname, '..');
const html = pathToFileURL(resolve(pkg, 'reference/ventilator-sim-hamilton.v1.9.html')).href;
const scenarios = JSON.parse(readFileSync(resolve(pkg, 'reference/scenarios.json'), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome' });
const out = { source: 'ventilator-sim-hamilton.html v1.9 (ventilator-simulator 65d80b6)', rateHz: 50, traces: [] };
for (const sc of scenarios) {
  const page = await browser.newPage();
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; }); // no free-running loop
  await page.goto(html);
  const tr = await page.evaluate(({ setup, durS }) => {
    /* global S, P, stepPhysics, resetPhysics, DT */
    // eslint-disable-next-line no-eval
    (0, eval)(setup);
    resetPhysics();
    (0, eval)('_seed = 12345');
    const ph = { insp: 0, pause: 1, exp: 2 };
    const rows = [];
    const n = Math.round(durS / DT);
    for (let i = 1; i <= n; i++) {
      stepPhysics();
      if (i % 4 === 0) rows.push([P.Paw, P.Q, P.V, P.Pmus, ph[P.phase], P.dPaw].map((x) => Math.round(x * 1000) / 1000));
    }
    const m = P.measured;
    return { settings: JSON.parse(JSON.stringify(S)), rows, measured: { PIP: m.PIP, PLAT: m.PLAT, RR: m.RR, VTE: m.VTE, MV: m.MV, autoPEEP: m.autoPEEP, Pmean: m.Pmean }, breaths: P.breathCount };
  }, sc);
  out.traces.push({ id: sc.id, durS: sc.durS, setup: sc.setup, ...tr });
  await page.close();
}
await browser.close();
mkdirSync(resolve(pkg, 'test/fixtures'), { recursive: true });
writeFileSync(resolve(pkg, 'test/fixtures/reference-traces.json'), JSON.stringify(out));
console.log(out.traces.map((t) => `${t.id}: ${t.rows.length} rows, breaths ${t.breaths}, PIP ${t.measured.PIP.toFixed(1)}, autoPEEP ${t.measured.autoPEEP.toFixed(2)}, VTE ${t.measured.VTE.toFixed(0)}`).join('\n'));
```

Run (needs Google Chrome installed; the script disables the page's rAF loop before load and steps `stepPhysics` itself):

```bash
node packages/ventilator/scripts/capture-reference.mjs
```

Expected output (these are the ORIGINAL's numbers):

```
vc-default: 1000 rows, breaths 5, PIP 24.9, autoPEEP 0.01, VTE 500
vc-decel-copd-rr20: 1500 rows, breaths 10, PIP 35.0, autoPEEP 4.48, VTE 293
pc-ards-mod: 1000 rows, breaths 7, PIP 28.0, autoPEEP 0.00, VTE 271
prvc-convergence: 3000 rows, breaths 16, PIP 18.9, autoPEEP 0.00, VTE 450
psv-spont: 1000 rows, breaths 6, PIP 15.0, autoPEEP 0.05, VTE 428
asv-pav: 1000 rows, breaths 6, PIP 15.6, autoPEEP 0.03, VTE 394
scn-ineffective: 1500 rows, breaths 7, PIP 19.0, autoPEEP 5.27, VTE 256
scn-breath-stack: 1000 rows, breaths 10, PIP 23.7, autoPEEP 6.22, VTE 104
scn-auto-trigger: 1000 rows, breaths 11, PIP 15.1, autoPEEP 1.34, VTE 369
vc-spont-variability: 1500 rows, breaths 12, PIP 23.1, autoPEEP 0.22, VTE 495
```

The fixture is ≈ 375 KB; commit it (CI does not have the original's page open — the fixture IS the reference).

- [x] **Step 5: Run the test to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/fidelity.test.ts`
Expected: 10 passed. (Prototype: every column's max error ≤ 5 × 10⁻⁴, i.e. the fixture's rounding.) If a trace fails, the port's arithmetic order differs from the original somewhere — diff the function against the reference file's line; never widen the tolerance.

- [x] **Step 6: Commit and push**

```bash
git add packages/ventilator
git commit -m "test(ventilator): 10 reference traces captured from the original v1.9 in headless Chrome; port matches to fixture rounding

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 5: Correction C1 — VC volume cycling measures the breath

**Files:**
- Create: `packages/ventilator/test/vent-corrections.test.ts`
- Modify: `packages/ventilator/src/vent.ts` (one line → three), `packages/ventilator/test/fidelity.test.ts` (one line)

**Interfaces:** none new. Behaviour: a VC breath cycles when `V − breathVstart ≥ vt` (or at Ti).

This task is the only change to v1.9's physics (plan decision 2); it can be rejected at the gate on its own (revert this commit).

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/vent-corrections.test.ts`:**

```ts
// Correction C1: a volume-controlled breath delivers the set VT on top of trapped gas (v1.9 cut it short).
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, loadPreset, runScenario } from '../src/index.ts';

describe('correction C1 — VC volume cycling measures the breath, not the lung', () => {
  it('COPD at RR 20, VT 560 (Pmax 60): every breath delivers 560 mL (± one 5 ms step of flow) while auto-PEEP climbs above 8 cmH2O', () => {
    const vs = createVent({ rate: 20, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' });
    loadPreset(vs, 'copd');
    advanceVent(vs, 60);
    expect(Math.abs(vs.p.measured.VTE - 560)).toBeLessThanOrEqual(5);
    expect(vs.p.measured.autoPEEP).toBeGreaterThan(8);
  });
  it('breath stacking: the stacked breath is a second full VT (v1.9 delivered ≈ 100 mL)', () => {
    const vs = createVent();
    runScenario(vs, 'breathStack');
    advanceVent(vs, 20);
    expect(vs.p.measured.VTE).toBeGreaterThan(340);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/vent-corrections.test.ts`
Expected: FAIL — VTE ≈ 293 mL (not 560), breath-stack VTE ≈ 104.

- [x] **Step 3: Implement**

In `packages/ventilator/src/vent.ts` replace

```ts
      if (p.vtDelivered >= c.vt || p.phaseT >= Ti) cyc = true;
```

with

```ts
      // Correction C1 (Stage V): v1.9 compared the ABSOLUTE lung volume (vtDelivered = V) with VT, so trapped gas
      // shortened every breath and capped auto-PEEP; a volume-controlled breath delivers VT on top of trapped gas.
      if (p.V - p.breathVstart >= c.vt || p.phaseT >= Ti) cyc = true;
```

In `packages/ventilator/test/fidelity.test.ts` replace

```ts
export const CORRECTED_FROM_S: Record<string, number> = {};
```

with

```ts
export const CORRECTED_FROM_S: Record<string, number> = { 'vc-decel-copd-rr20': 3.26, 'scn-breath-stack': 1.08, 'vc-spont-variability': 3.26 };
```

(The three times are where the first VC breath starts on trapped gas; the traces are identical to the original up to them.)

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run`
Expected: 21 passed (reference 1, mechanics 4, basics 4, fidelity 10, corrections 2).

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "fix(ventilator): C1 — VC cycles on the breath's own volume, so trapped gas no longer shortens breaths or caps auto-PEEP

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 6: Engine-core — optional `palvCmH2O`/`mode` on the VentFrame

**Files:**
- Create: `packages/engine-core/src/types-vent-link.ts`, `packages/engine-core/test/l2/resp/vent-frame-ext.test.ts`
- Modify (additive, marked `// Stage V`): `packages/engine-core/src/l2/resp/driver.ts` (1 import + 3 reads), `packages/engine-core/src/l2/resp/pipeline.ts` (1 import + 1 validation term), `packages/engine-core/src/index.ts` (1 export)

**Interfaces:**
- Produces (exported from `@pme/engine-core`): `VentFrameExt = VentFrame & { palvCmH2O?: number; mode?: string }`, `framePressure(f): number` (= `f.palvCmH2O ?? f.pawCmH2O`). The external drive's pressure history (its mean → venous-return coupling; its swing → u(t)) uses `framePressure`. `palvCmH2O` is validated to −30…150 like Paw.

- [x] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/resp/vent-frame-ext.test.ts`:**

```ts
// Stage V additive VentFrame fields (types-vent-link.ts): alveolar pressure, when sent, drives the external
// drive's mean pressure (venous-return coupling) and u(t); Paw-only frames behave exactly as in Stage 3.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import { breathSignal, createDriver, meanAirwayPressure, onVentFrame } from '../../../src/l2/resp/driver.ts';
import { framePressure, type VentFrameExt } from '../../../src/types-vent-link.ts';
import type { Command } from '../../../src/types.ts';

const frames = (palv: boolean) => {
  const d = createDriver(seedStream(1, 'resp'));
  for (let i = 0; i <= 300; i++) {
    const t = i * 0.02;
    const insp = t % 3 < 1;
    const f: VentFrameExt = { pawCmH2O: insp ? 25 : 5, flowLps: insp ? 0.5 : -0.2, volumeMl: insp ? 400 * (t % 3) : 0, fio2: 0.4, peepCmH2O: 5 };
    if (palv) f.palvCmH2O = 13; // trapped gas keeps the alveoli at 13 all cycle
    onVentFrame(d, f, t);
  }
  return d;
};

describe('Stage V VentFrame extension', () => {
  it('framePressure prefers palvCmH2O', () => {
    expect(framePressure({ pawCmH2O: 20, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 })).toBe(20);
    expect(framePressure({ pawCmH2O: 20, palvCmH2O: 12, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 })).toBe(12);
  });
  it('the drive mean and u(t) follow alveolar pressure when it is sent; Paw-only frames are unchanged', () => {
    const paw = frames(false);
    const alv = frames(true);
    expect(meanAirwayPressure(paw, 6, 50)).toBeGreaterThan(10);
    expect(meanAirwayPressure(paw, 6, 50)).toBeLessThan(13);
    expect(meanAirwayPressure(alv, 6, 50)).toBeCloseTo(13, 6);
    expect(breathSignal(alv, 5.5, 50)).toBeCloseTo(0.5, 6); // constant alveolar pressure → no swing
  });
  it('the engine validates palvCmH2O and accepts mode', () => {
    const e = createEngine({ seed: 1 });
    const cmd = (frame: Record<string, unknown>) => ({ id: 'f', issuedBy: 't', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 10, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5, ...frame } }) as Command;
    expect(e.dispatch(cmd({ palvCmH2O: 12, mode: 'PCV+' })).accepted).toBe(true);
    expect(e.dispatch(cmd({ palvCmH2O: 400 })).reason).toMatch(/palvCmH2O/);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp/vent-frame-ext.test.ts`
Expected: FAIL — cannot resolve `../../../src/types-vent-link.ts`.

- [x] **Step 3: Implement**

**Create `packages/engine-core/src/types-vent-link.ts`:**

```ts
// Stage V (R27 ventilator link): additive VentFrame fields, in their own file so Stage 3's types stay untouched.
// Both are optional: a Stage 3 frame is still a valid frame and behaves exactly as before.
import type { VentFrame } from './types-resp.ts';

export type VentFrameExt = VentFrame & {
  /**
   * Alveolar pressure (cmH2O). When present, the drive's pressure history (mean for the venous-return coupling,
   * swing for u(t)) uses it instead of Paw: intrinsic PEEP raises mean ALVEOLAR pressure but not mean airway
   * pressure, and u(t)'s reference (U_REF_CMH2O) is an alveolar swing.
   */
  palvCmH2O?: number;
  /** Ventilator mode name (R27 "mode"): carried for logs/controllers, not used by the physiology. */
  mode?: string;
};

/** The pressure the drive integrates: alveolar when the ventilator sends it, else airway. */
export const framePressure = (f: VentFrameExt): number => f.palvCmH2O ?? f.pawCmH2O;
```

In `packages/engine-core/src/l2/resp/driver.ts`:
- after the line `import type { AirwayState, BreathKind, VentFrame, VentSource } from '../../types-resp.ts';` add
  ```ts
  import { framePressure } from '../../types-vent-link.ts'; // Stage V
  ```
- replace `meanPaw: f.pawCmH2O,` (in `onVentFrame`, the `e = { lastT: t, …` line) with `meanPaw: framePressure(f),`
- replace `e.frames.push(t, f.pawCmH2O, f.volumeMl);` with `e.frames.push(t, framePressure(f), f.volumeMl); // Stage V: alveolar when sent`
- replace `e.meanPaw = n > 0 ? sum / n : f.pawCmH2O;` with `e.meanPaw = n > 0 ? sum / n : framePressure(f);`

In `packages/engine-core/src/l2/resp/pipeline.ts`:
- after `import type { AirwayState, RespClinicalEvent, TempSite, VentSource } from '../../types-resp.ts';` add
  ```ts
  import type { VentFrameExt } from '../../types-vent-link.ts'; // Stage V
  ```
- in `validateRespCommand`, replace `?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? (f.pawCmH2O` with
  ```ts
  ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? num('palvCmH2O', (f as VentFrameExt).palvCmH2O, -30, 150) ?? (f.pawCmH2O
  ```

In `packages/engine-core/src/index.ts`, after `export * from './types-resp.ts'; // Stage 3` add:

```ts
export * from './types-vent-link.ts'; // Stage V
```

- [x] **Step 4: Run the new test and the whole engine-core suite**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp/vent-frame-ext.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core test && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: 3 passed; then engine-core **372 passed** (369 + 3; ≈ 105 s — Stage 3's ventilator-link test still passes: Paw-only frames are unchanged); typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): optional alveolar pressure and mode on the VentFrame (Stage V, additive) — intrinsic PEEP reaches the coupling

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 7: Ventilator alarms and the VentFrame builder

**Files:**
- Create: `packages/ventilator/src/alarms.ts`, `packages/ventilator/src/frame.ts`, `packages/ventilator/test/alarms-frame.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: `VentState`, `VentAlarm` (Task 2); `VentFrameExt` (Task 6).
- Produces: `ventAlarms(vs): VentAlarm[]` (priority order: disconnection, apnea, then v1.9's pmax, mvHigh, mvLow, vtHigh, vtLow, fHigh, fLow, intrinsicPeep); `bannerText(vs): { cls: '' | 'armed' | 'silenced'; text }`; `LinkFrame = VentFrameExt & { palvCmH2O: number; mode: string }`; `toVentFrame(vs, mode): LinkFrame`.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/alarms-frame.test.ts`:**

```ts
// Ventilator alarms (v1.9 rules + disconnection/apnea) and the VentFrame the link sends.
import { describe, expect, it } from 'vitest';
import { advanceVent, bannerText, createVent, loadPreset, setCircuit, silenceAlarms, toggleHold, toVentFrame, ventAlarms } from '../src/index.ts';

describe('ventilator alarms', () => {
  it('default VC is alarm-free; Pmax, Vt low and Intrinsic PEEP raise in v1.9 order', () => {
    const vs = createVent();
    advanceVent(vs, 20);
    expect(ventAlarms(vs)).toEqual([]);
    expect(bannerText(vs).text).toBe('No active alarms');
    const hi = createVent({ compliance: 20, pmax: 30 });
    advanceVent(hi, 20);
    expect(ventAlarms(hi)[0]?.id).toBe('pmax');
    const copd = createVent({ rate: 24, vt: 560, pmax: 70, pause: 0 });
    loadPreset(copd, 'copd');
    advanceVent(copd, 30);
    expect(ventAlarms(copd).map((a) => a.id)).toContain('intrinsicPeep');
  });
  it('disconnection raises within one breath; apnea after the set apnoea time without breaths; silence shows a countdown', () => {
    const vs = createVent();
    advanceVent(vs, 10);
    setCircuit(vs, 'disconnected');
    advanceVent(vs, 10 + 60 / 14 + 0.5);
    expect(ventAlarms(vs)[0]?.id).toBe('disconnection');
    const ap = createVent({ mode: 'PSV', spont: true, pmus: 0, rate: 4 }); // no effort, backup only every 15 s → apnea at 20 s
    advanceVent(ap, 60);
    silenceAlarms(ap);
    expect(bannerText(ap).cls).toBe('silenced');
    const quiet = createVent({ apneaTime: 10, rate: 4 });
    advanceVent(quiet, 14);
    expect(ventAlarms(quiet).map((a) => a.id)).toContain('apnea');
  });
});

describe('VentFrame', () => {
  it('carries Paw, alveolar pressure, flow, breath volume, FiO2 fraction, PEEP, phase and mode', () => {
    const vs = createVent({ fio2: 60, peep: 8 });
    advanceVent(vs, 60 / 14 + 0.3); // mid-inspiration of the 2nd breath (period 4.29 s, Ti 0.5 s)
    const f = toVentFrame(vs, '(S)CMV+');
    expect(f.phase).toBe('insp');
    expect(f.fio2).toBeCloseTo(0.6, 6);
    expect(f.peepCmH2O).toBe(8);
    expect(f.flowLps).toBeCloseTo(1, 6);
    expect(f.volumeMl).toBeGreaterThan(200);
    expect(f.pawCmH2O - f.palvCmH2O).toBeCloseTo(10, 1); // R 10 × 1 L/s
    expect(f.mode).toBe('(S)CMV+');
  });
  it('trapped gas does not count as tidal volume; holds and pauses are inspiration; disconnected frames are empty', () => {
    const vs = createVent({ rate: 24, vt: 560, pmax: 70, pause: 0 });
    loadPreset(vs, 'copd');
    advanceVent(vs, 30);
    while (vs.p.phase !== 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    while (vs.p.phase === 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    expect(toVentFrame(vs, 'x').volumeMl).toBeLessThan(10); // new breath: volume counts from its own start
    toggleHold(vs, 'exp');
    advanceVent(vs, 40);
    expect(vs.hold).toBe('exp');
    expect(toVentFrame(vs, 'x').phase).toBe('exp');
    setCircuit(vs, 'disconnected');
    expect(toVentFrame(vs, 'x')).toMatchObject({ pawCmH2O: vs.p.Paw, flowLps: 0, volumeMl: 0, palvCmH2O: 0, phase: 'exp' });
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/alarms-frame.test.ts`
Expected: FAIL — `ventAlarms` is not exported.

- [x] **Step 3: Implement**

**Create `packages/ventilator/src/alarms.ts`:**

```ts
// Ventilator alarms: v1.9's banner rules (syncHeader), in the same priority order, plus two Stage V alarms the
// link needs — `disconnection` (a delivered breath that raised no pressure) and `apnea` (no breath for the set
// apnoea time; the v1.9 setting existed but was never wired).
import type { VentAlarm, VentState } from './types.ts';

export function ventAlarms(vs: VentState): VentAlarm[] {
  const c = vs.cfg;
  const p = vs.p;
  const m = p.shown ?? p.measured;
  const out: VentAlarm[] = [];
  const add = (id: VentAlarm['id'], text: string, priority: VentAlarm['priority'] = 'high') => out.push({ id, text, priority });
  if (vs.circuit === 'disconnected' && p.breathCount > 0 && m.PIP < c.peep + 2) add('disconnection', 'Disconnection on patient side'); // Stage V
  if (p.t - vs.lastBreathT > c.apneaTime) add('apnea', 'Apnea'); // Stage V
  if (m.PIP >= c.pmax) add('pmax', 'High pressure (Pmax)');
  if (m.MV > c.almMVhi) add('mvHigh', 'ExpMinVol high');
  if (m.VTE > 0 && m.MV < c.almMVlo) add('mvLow', 'ExpMinVol low');
  if (m.VTE > c.almVThi) add('vtHigh', 'Vt high');
  if (m.VTE > 0 && m.VTE < c.almVTlo) add('vtLow', 'Vt low');
  if (m.RR > c.almFhi) add('fHigh', 'fTotal high');
  if (m.RR > 3 && m.RR < c.almFlo) add('fLow', 'fTotal low');
  if (m.autoPEEP > 5) add('intrinsicPeep', 'Intrinsic PEEP', 'medium');
  return out;
}

/** The banner text: silenced countdown, the first active alarm, or none (v1.9). */
export function bannerText(vs: VentState): { cls: '' | 'armed' | 'silenced'; text: string } {
  if (vs.silenceUntil > vs.p.t) return { cls: 'silenced', text: `alarms silenced — ${Math.ceil(vs.silenceUntil - vs.p.t)} s` };
  const a = ventAlarms(vs)[0];
  return a ? { cls: 'armed', text: `⚠ ${a.text}` } : { cls: '', text: 'No active alarms' };
}
```

**Create `packages/ventilator/src/frame.ts`:**

```ts
// vent → engine: one R27 VentFrame from the ventilator's current step. Volume is the volume delivered since the
// breath started (a real ventilator's VT trace), so trapped gas (auto-PEEP) never inflates the engine's VT.
// Pause and inspiratory hold count as inspiration (Ti includes the pause, as a ventilator reports it).
import type { VentFrameExt } from '@pme/engine-core';
import type { VentState } from './types.ts';

/** The R27 frame: Stage 3's VentFrame + Stage V's optional alveolar pressure and mode (engine-core types-vent-link.ts). */
export type LinkFrame = VentFrameExt & { palvCmH2O: number; mode: string };

export function toVentFrame(vs: VentState, mode: string): LinkFrame {
  const p = vs.p;
  const open = vs.circuit === 'disconnected';
  const insp = !open && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
  return {
    pawCmH2O: p.Paw,
    palvCmH2O: open ? 0 : p.Palv,
    flowLps: open ? 0 : p.Q,
    volumeMl: open ? 0 : Math.max(0, p.V - p.breathVstart),
    fio2: vs.cfg.fio2 / 100,
    peepCmH2O: vs.cfg.peep,
    phase: insp ? 'insp' : 'exp',
    mode,
  };
}
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './alarms.ts';
export * from './frame.ts';
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/alarms-frame.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 4 passed; typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): alarm banner rules (+ disconnection, apnea) and the R27 VentFrame builder

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 8: lungState input and interim recruitment

**Files:**
- Create: `packages/ventilator/src/lung-input.ts`, `packages/ventilator/src/link/recruit.ts`, `packages/ventilator/test/lung-recruit.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: `EngineEvent` (engine-core); `VentConfig`, `VentState`.
- Produces: `LungStateEvent`; `LUNG_KEYS = ['compliance','resistance','efl','eflSeverity','spont','pmus']`; `LungBase`; `lungBaseOf(cfg)`; `EFFORT_PMUS_CMH2O = 8`; `LungLink { base, ref, last }`; `createLungLink(cfg)`; `applyLungState(vs, ll, ev)`; `RecruitParams { shuntMax, shuntMin, p50, k }`; `TAU_RECRUIT_S = 40`, `TAU_DERECRUIT_S = 10`; `RecruitState { r, sent }`; `recruitTarget(p, totalPeep)`; `shuntOf(p, r)`; `createRecruit(p, totalPeep)`; `stepRecruit(s, p, totalPeep, dt): number | null`.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/lung-recruit.test.ts`:**

```ts
// engine → vent lungState mapping and the interim recruitment model.
import { describe, expect, it } from 'vitest';
import { applyLungState, createLungLink, createRecruit, createVent, recruitTarget, stepRecruit, type LungStateEvent } from '../src/index.ts';

const ls = (o: Partial<LungStateEvent>): LungStateEvent => ({ type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100, ...o });

describe('lungState → ventilator lung', () => {
  it('scales the profile lung by the change from the engine baseline; bronchospasm switches on flow limitation', () => {
    const vs = createVent({ compliance: 33, resistance: 13 });
    const ll = createLungLink(vs.cfg);
    applyLungState(vs, ll, ls({}));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl]).toEqual([33, 13, false]);
    applyLungState(vs, ll, ls({ resistanceCmH2OPerLps: 40, autoPeepTendency: 0.8 }));
    expect([vs.cfg.resistance, vs.cfg.efl, vs.cfg.eflSeverity]).toEqual([52, true, 'severe']);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 25 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl]).toEqual([17, 13, false]);
  });
  it('effort adds patient Pmus (8 cmH2O × effort) only when the profile does not breathe itself', () => {
    const vs = createVent();
    const ll = createLungLink(vs.cfg);
    applyLungState(vs, ll, ls({ effort: 0.5 }));
    expect([vs.cfg.spont, vs.cfg.pmus]).toEqual([true, 4]);
    applyLungState(vs, ll, ls({ effort: 0 }));
    expect(vs.cfg.spont).toBe(false);
  });
});

describe('interim recruitment → shunt', () => {
  const p = { shuntMax: 0.4, shuntMin: 0.15, p50: 10, k: 2.5 };
  it('logistic in total PEEP; slow to recruit (τ 40 s), faster to derecruit (τ 10 s); sends only moves ≥ 0.005', () => {
    expect(recruitTarget(p, 10)).toBeCloseTo(0.5, 6);
    const s = createRecruit(p, 5);
    const first = stepRecruit(s, p, 5, 0.02);
    expect(first).toBeCloseTo(0.4 - 0.25 * recruitTarget(p, 5), 3);
    expect(stepRecruit(s, p, 5, 0.02)).toBeNull();
    let t = 0;
    while (s.r < 0.5 * (recruitTarget(p, 5) + recruitTarget(p, 15))) { stepRecruit(s, p, 15, 0.02); t += 0.02; }
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(35);
    let u = 0;
    const hi = s.r;
    while (s.r > 0.5 * (hi + recruitTarget(p, 5))) { stepRecruit(s, p, 5, 0.02); u += 0.02; }
    expect(u).toBeLessThan(t / 3);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/lung-recruit.test.ts`
Expected: FAIL — `applyLungState` is not exported.

- [x] **Step 3: Implement**

**Create `packages/ventilator/src/lung-input.ts`:**

```ts
// engine → vent: the R27 `lungState` event updates the ventilator's lung. Until Stage 7's profiles put COPD/ARDS
// mechanics into `lungState` itself, the comorbidity profile's mechanics are the BASE and lungState acts as a
// RELATIVE change from the engine's own baseline (the first lungState): bronchospasm ×4 resistance, endobronchial
// ×0.5 compliance, etc. autoPeepTendency switches on expiratory flow limitation; effort drives the patient's Pmus.
// shunt, dead space and FRC are passed through for display (the Dynamic Lung view).
import type { EngineEvent } from '@pme/engine-core';
import type { VentConfig, VentState } from './types.ts';

export type LungStateEvent = Extract<EngineEvent, { type: 'lungState' }>;
export const LUNG_KEYS = ['compliance', 'resistance', 'efl', 'eflSeverity', 'spont', 'pmus'] as const;
export type LungBase = Pick<VentConfig, (typeof LUNG_KEYS)[number]>;
export const lungBaseOf = (c: VentConfig): LungBase => ({ compliance: c.compliance, resistance: c.resistance, efl: c.efl, eflSeverity: c.eflSeverity, spont: c.spont, pmus: c.pmus });

export const EFFORT_PMUS_CMH2O = 8; // effort 1 → Pmus 8 cmH2O [ENG: the v1.9 default spontaneous effort is 6–8]

export interface LungLink {
  base: LungBase;
  ref: LungStateEvent | null; // the engine's first lungState (its own baseline)
  last: LungStateEvent | null;
}
export const createLungLink = (c: VentConfig): LungLink => ({ base: lungBaseOf(c), ref: null, last: null });

export function applyLungState(vs: VentState, ll: LungLink, ls: LungStateEvent): void {
  ll.ref ??= ls;
  ll.last = ls;
  const c = vs.cfg;
  const b = ll.base;
  c.compliance = Math.round(b.compliance * (ls.complianceMlPerCmH2O / ll.ref.complianceMlPerCmH2O));
  c.resistance = Math.round(b.resistance * (ls.resistanceCmH2OPerLps / ll.ref.resistanceCmH2OPerLps));
  const a = ls.autoPeepTendency;
  if (a > 0) {
    c.efl = true;
    c.eflSeverity = a >= 0.6 ? 'severe' : a >= 0.3 ? 'moderate' : b.efl ? b.eflSeverity : 'mild';
  } else {
    c.efl = b.efl;
    c.eflSeverity = b.eflSeverity;
  }
  // effort only ADDS a patient: a profile that breathes keeps its own effort
  c.spont = b.spont || ls.effort > 0.05;
  c.pmus = b.spont ? b.pmus : EFFORT_PMUS_CMH2O * ls.effort;
}
```

**Create `packages/ventilator/src/link/recruit.ts`:**

```ts
// Interim PEEP-recruitment → shunt model for the link demo [ENG]. Stage 3's gas exchange takes shunt as an
// input; PEEP recruitment is Stage 7b's lung module (R31). Until it lands, the link owns this small model and
// sends `setTarget shunt`: the recruited fraction follows a logistic curve of total PEEP (set + intrinsic),
// reached with a first-order lag — slow to recruit, faster to derecruit (research 03 §8.7 direction; the time
// constants are teaching values, not data). DELETE when Stage 7b emits shunt from its own recruitment model.
export interface RecruitParams {
  shuntMax: number; // fully derecruited (PEEP 0)
  shuntMin: number; // fully recruited
  p50: number; // total PEEP (cmH2O) at half recruitment
  k: number; // slope (cmH2O)
}
export const TAU_RECRUIT_S = 40;
export const TAU_DERECRUIT_S = 10;

export interface RecruitState { r: number; sent: number }

export const recruitTarget = (p: RecruitParams, totalPeep: number): number => 1 / (1 + Math.exp(-(totalPeep - p.p50) / p.k));
export const shuntOf = (p: RecruitParams, r: number): number => p.shuntMin + (p.shuntMax - p.shuntMin) * (1 - r);

export function createRecruit(p: RecruitParams, totalPeep: number): RecruitState {
  const r = recruitTarget(p, totalPeep);
  return { r, sent: Number.NaN };
}

/** Advance by dt seconds; returns the shunt to send when it moved ≥ 0.005 since the last send, else null. */
export function stepRecruit(s: RecruitState, p: RecruitParams, totalPeep: number, dt: number): number | null {
  const target = recruitTarget(p, totalPeep);
  const tau = target > s.r ? TAU_RECRUIT_S : TAU_DERECRUIT_S;
  s.r += (target - s.r) * Math.min(1, dt / tau);
  const sh = Math.round(shuntOf(p, s.r) * 1000) / 1000;
  if (Number.isNaN(s.sent) || Math.abs(sh - s.sent) >= 0.005) {
    s.sent = sh;
    return sh;
  }
  return null;
}
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './lung-input.ts';
export * from './link/recruit.ts';
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/lung-recruit.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 3 passed; typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): lungState moves the ventilator's lung (relative to the profile); interim PEEP recruitment → shunt

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 9: Pathology catalogue I — schema, mapping, signature test; normal, obstructive and airway rows

**Files:**
- Create: `packages/ventilator/src/pathology/catalogue.ts`, `packages/ventilator/src/pathology/mechanics.ts`, `packages/ventilator/test/pathology-signature.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: `createVent`, `advanceVent` (Task 3); `RecruitParams` (Task 8).
- Produces: `Band { value, lo, hi }`, `Cite { field, src }`, `Wired = 'vent'|'engine-now'|'stage7a'|'stage7b'|'not-modelled'`, `LungPathology` (fields: `id, label, group, complianceMl, rInsp, rExp, autoPeepTendency, shunt, deadSpaceFraction, diffusionFactor, pvrMultiplier, hpvSensitivity, recruitability, recruitP50?, signature { plateau, drivingPressure, autoPeep, peakMinusPlateau }, ref?, wired, monitor, pitfall, sources, disagreements? }`), `REF_SETTINGS`, `LUNG_PATHOLOGIES` (grows to 39 rows by Task 11); `mechanicsToVent(row): Partial<VentConfig>`; `recruitOf(row): RecruitParams | null`; `Signature`; `referenceRun(row): { vs, sig }`.

R36 rows are grouped into three tasks (9: normal, obstructive, airway; 10: parenchymal, restrictive; 11: vascular, pleural, device, special). Every value follows R37: the default is where the sources agree, the band is what they span, citations are extracted textbook sentences (Miller 10e by PDF page; Co-Existing 8e and Dellinger 5e by chapter/printed page), `ENG` marks judgement with its reason. These are for Ali's review (Task 20 publishes them as §4b), so copy them exactly — do not "improve" numbers here.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/pathology-signature.test.ts`:**

```ts
// R36 catalogue: every row, run at its reference settings, shows the ventilator numbers its sources report.
import { describe, expect, it } from 'vitest';
import { LUNG_PATHOLOGIES, referenceRun } from '../src/index.ts';

const inBand = (x: number, b: { lo: number; hi: number }) => x >= b.lo - 0.05 && x <= b.hi + 0.05;

describe('lung pathology catalogue — ventilator signatures at the reference settings', () => {
  it.each(LUNG_PATHOLOGIES.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    const { sig } = referenceRun(row);
    for (const k of ['plateau', 'drivingPressure', 'autoPeep', 'peakMinusPlateau'] as const) {
      expect(inBand(sig[k], row.signature[k]), `${k} ${sig[k].toFixed(1)} outside ${row.signature[k].lo}–${row.signature[k].hi}`).toBe(true);
    }
  });
});

describe('catalogue coverage', () => {
  it('has the R36 parenchymal/restrictive rows (Task 10)', () => {
    const ids = LUNG_PATHOLOGIES.map((r) => r.id);
    for (const id of ['ards-mild', 'ards-moderate', 'ards-severe-recruitable', 'ards-severe-nonrecruitable', 'fibrosis-ild', 'scleroderma', 'chest-wall-restriction', 'obesity-ohs', 'pneumonia-lobar', 'atelectasis', 'oedema-cardiogenic', 'oedema-noncardiogenic', 'aspiration', 'covid-pneumonitis']) expect(ids).toContain(id);
  });
  it('has all 39 R36 rows, unique ids, and every row cites its compliance and signature (Task 11)', () => {
    expect(LUNG_PATHOLOGIES).toHaveLength(39);
    expect(new Set(LUNG_PATHOLOGIES.map((r) => r.id)).size).toBe(39);
    for (const r of LUNG_PATHOLOGIES) {
      expect(r.sources.length).toBeGreaterThanOrEqual(2);
      for (const b of [r.complianceMl, r.rInsp, r.rExp, r.shunt, r.deadSpaceFraction, r.pvrMultiplier]) expect(b.lo <= b.value && b.value <= b.hi).toBe(true);
    }
    expect(LUNG_PATHOLOGIES.find((r) => r.id === 'bronchopleural-fistula')!.monitor).toMatch(/NOT modelled/);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts`
Expected: FAIL — `LUNG_PATHOLOGIES` is not exported.

- [x] **Step 3: Create the catalogue (schema + first group)**

**Create `packages/ventilator/src/pathology/catalogue.ts`:**

```ts
// Lung pathology catalogue (rulings R36/R37): one row per condition, weight-of-evidence defaults (`value`) and the
// band the sources span (`lo`–`hi`). Reference patient: passive intubated adult, PBW 70 kg, 8.0 ETT; reference
// settings REF_SETTINGS (VC 490 mL, 14/min, PEEP 5, 60 L/min square, 0.3 s pause) unless a row gives `ref`.
// With them the ventilator shows plateau = PEEP + autoPEEP + VT/C, driving pressure = VT/C, peak − plateau =
// R_insp × 1 L/s; `signature` bands are the clinically reported ranges and the tests require the model inside
// them. Textbook citations: "Miller 10e pdf p. N" (running heads carry no chapter number in the extraction),
// "Co-Existing 8e ch. N p. M", "Dellinger 5e ch. N p. M". `ENG` = engineering judgement, reasoning given; every
// ENG number is a row for Ali's review in docs/physiology/stage-7-parameter-tables.md §4b.
// `wired`: what acts on the field TODAY — 'vent' (ventilator mechanics), 'engine-now' (Stage 3 shunt input),
// 'stage7a' (PVR/HPV/RV: the two-sided heart), 'stage7b' (dead space, diffusion: the lung module), 'not-modelled'.
export interface Band { value: number; lo: number; hi: number }
export interface Cite { field: string; src: string }
export type Wired = 'vent' | 'engine-now' | 'stage7a' | 'stage7b' | 'not-modelled';
export interface LungPathology {
  id: string;
  label: string;
  group: 'normal' | 'obstructive' | 'restrictive' | 'parenchymal' | 'vascular' | 'pleural' | 'airway-device' | 'neuromuscular' | 'special';
  complianceMl: Band;
  rInsp: Band;
  rExp: Band;
  autoPeepTendency: number;
  shunt: Band;
  deadSpaceFraction: Band;
  diffusionFactor: number;
  pvrMultiplier: Band;
  hpvSensitivity: number;
  recruitability: 'high' | 'moderate' | 'low' | 'none';
  recruitP50?: number;
  signature: { plateau: Band; drivingPressure: Band; autoPeep: Band; peakMinusPlateau: Band };
  ref?: { vtMl?: number; rr?: number; peep?: number; pbwKg?: number; flowLpm?: number };
  wired: Partial<Record<'mechanics' | 'shunt' | 'deadSpace' | 'diffusion' | 'pvr' | 'hpv', Wired>>;
  monitor: string;
  pitfall: string;
  sources: Cite[];
  disagreements?: string;
}
export const REF_SETTINGS = { vtMl: 490, rr: 14, peep: 5, flowLpm: 60, pauseS: 0.3, pbwKg: 70 } as const;

const b = (value: number, lo: number, hi: number): Band => ({ value, lo, hi });
const W_STD: LungPathology['wired'] = { mechanics: 'vent', shunt: 'engine-now', deadSpace: 'stage7b', diffusion: 'stage7b', pvr: 'stage7a', hpv: 'stage7a' };
const PV1 = b(1, 1, 1.2);
const NO_AP = b(0, 0, 1);
const S_MECH = 'ENG: the model is linear, so plateau/ΔP/peak−plateau follow from C and R at REF_SETTINGS';
const S_NORMAL_C = 'Dellinger 5e ch. 11 (pdf 226, fig.): respiratory-system compliance at PEEP 5 reported in mL/cmH2O per patient; normal intubated 50–60 (ENG consensus: 50–100 mL/cmH2O quoted across texts)';

  // --- normal, obstructive and airway (Task 9) ---
  {
    id: 'normal', label: 'Normal (intubated adult)', group: 'normal',
    complianceMl: b(55, 45, 70), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: b(1, 1, 1), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 3,
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 6, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Ppeak ≈ 20–25, Pplat ≈ 13–16 cmH2O at 7 mL/kg; square capnogram; SpO2 ≥ 97 % on FiO2 0.4.',
    pitfall: 'Anaesthesia alone creates 5–10 % shunt within minutes (atelectasis): "normal" intubated is not normal awake.',
    sources: [{ field: 'complianceMl', src: S_NORMAL_C }, { field: 'shunt', src: 'Miller 10e pdf p. 341: "Although the SaO2 is usually well maintained with this approach, atelectasis inevitably forms."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'bronchospasm', label: 'Acute bronchospasm / asthma', group: 'obstructive',
    complianceMl: b(50, 35, 60), rInsp: b(30, 20, 50), rExp: b(60, 35, 100), autoPeepTendency: 0.8,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(18, 13, 25), drivingPressure: b(10, 7, 14), autoPeep: b(4, 1, 15), peakMinusPlateau: b(30, 18, 50) },
    wired: W_STD, monitor: 'High peak with a normal-ish plateau (large peak−plateau gap), expiratory flow not returning to zero, shark-fin capnogram.',
    pitfall: 'Raising the rate to fix the CO2 worsens trapping: lengthen expiration, accept hypercapnia.',
    sources: [
      { field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 26: "Signs may include high peak airway pressure, upsloping of the end-tidal carbon dioxide (ETCO2) waveform, wheezing, and desaturation"' },
      { field: 'autoPeepTendency', src: 'Co-Existing 8e ch. 2 p. 32: "air trapping, also called auto-PEEP or dynamic hyperinflation, occurs when positive pressure ventilation is applied and insufficient expiratory time is allowed."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'anaphylaxis-bronchospasm', label: 'Anaphylaxis with bronchospasm', group: 'obstructive',
    complianceMl: b(45, 30, 55), rInsp: b(35, 20, 60), rExp: b(70, 40, 120), autoPeepTendency: 0.8,
    shunt: b(0.1, 0.05, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(19, 13, 26), drivingPressure: b(11, 8, 16), autoPeep: b(4, 1, 15), peakMinusPlateau: b(35, 18, 60) },
    wired: W_STD, monitor: 'Bronchospasm signature plus vasodilatory shock (BP ↓, HR ↑); EtCO2 falls with CO.',
    pitfall: 'Under anaesthesia the first sign is often hypotension or high airway pressure, not rash; wheeze may be absent.',
    sources: [
      { field: 'rInsp', src: 'Co-Existing 8e ch. 31 p. 692: "Manifesting as atypical bronchospasm, wheezing is generally not present."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'copd-gold-1-2', label: 'COPD GOLD 1–2', group: 'obstructive',
    complianceMl: b(60, 50, 75), rInsp: b(15, 12, 20), rExp: b(30, 20, 45), autoPeepTendency: 0.4,
    shunt: b(0.06, 0.03, 0.1), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(1.2, 1, 1.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(13, 10, 17), drivingPressure: b(8, 6, 11), autoPeep: b(1, 0, 4), peakMinusPlateau: b(15, 11, 21) },
    wired: W_STD, monitor: 'Mild peak−plateau gap; small auto-PEEP at 14/min; sloping phase III.',
    pitfall: 'Normal settings are usually safe; trapping appears only with high rates or short Te.',
    sources: [
      { field: 'group', src: 'Co-Existing 8e ch. 2 p. 28: "I: Mild COPD FEV1 ≥ 80% predicted II: Moderate COPD 50% ≤ FEV1 < 80% predicted III: Severe COPD 30% ≤ FEV1 …"' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'copd-gold-3-4', label: 'COPD GOLD 3–4 (emphysema)', group: 'obstructive',
    complianceMl: b(65, 50, 90), rInsp: b(22, 15, 30), rExp: b(60, 35, 100), autoPeepTendency: 0.8,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.5, 0.4, 0.65), diffusionFactor: 0.7, pvrMultiplier: b(1.6, 1.2, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(16, 11, 24), drivingPressure: b(8, 5, 10), autoPeep: b(4, 2, 12), peakMinusPlateau: b(22, 15, 30) },
    wired: W_STD, monitor: 'Auto-PEEP on an expiratory hold; flow not reaching zero; RR ↑ → auto-PEEP ↑ → BP ↓ (dynamic hyperinflation).',
    pitfall: 'Hypotension after intubation is trapped gas until proven otherwise: disconnect and let the patient exhale.',
    sources: [
      { field: 'autoPeepTendency', src: 'Co-Existing 8e ch. 2 p. 32: "This contributes to increased intrathoracic pressure" (dynamic hyperinflation)' },
      { field: 'rExp', src: 'Miller 10e pdf p. 1849: "Patients with low auto-PEEP (<2 cmH2O) will experience a greater increase in total PEEP from a moderate (5 cmH2O) external PEEP than those with a high level of auto-PEEP (>10 cmH2O)."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'cystic-fibrosis', label: 'Cystic fibrosis', group: 'obstructive',
    complianceMl: b(45, 35, 60), rInsp: b(22, 15, 30), rExp: b(40, 25, 60), autoPeepTendency: 0.6,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(1.5, 1.1, 2.5), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(18, 13, 25), drivingPressure: b(11, 8, 14), autoPeep: b(2, 0, 8), peakMinusPlateau: b(22, 15, 30) },
    wired: W_STD, monitor: 'Obstructive signature with secretions; shunt from plugging.',
    pitfall: 'Suction and humidify; secretions change resistance minute to minute.',
    sources: [{ field: 'group', src: 'Co-Existing 8e ch. 3 p. 54 (lung transplant indications table) lists "Chronic obstructive pulmonary disease Cystic fibrosis Idiopathic pulmonary fibrosis Primary pulmonary hypertension"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'tube-obstruction', label: 'Tube obstruction / kink (partial)', group: 'airway-device',
    complianceMl: b(55, 45, 70), rInsp: b(40, 25, 80), rExp: b(50, 30, 100), autoPeepTendency: 0.5,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 20), drivingPressure: b(9, 6, 12), autoPeep: b(1, 0, 8), peakMinusPlateau: b(40, 25, 80) },
    wired: W_STD, monitor: 'Peak rises with a normal plateau (resistive), Pmax alarm; a suction catheter will not pass.',
    pitfall: 'Same ventilator picture as bronchospasm — pass a suction catheter before giving bronchodilators.',
    sources: [{ field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 21: flattened flow–volume loops "distinguish wheezing caused by airway obstruction (i.e., due to a foreign body, tracheal stenosis, or mediastinal tumor) from asthma"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'tracheal-obstruction', label: 'Tracheal stenosis / obstruction', group: 'airway-device',
    complianceMl: b(55, 45, 70), rInsp: b(30, 20, 60), rExp: b(35, 20, 70), autoPeepTendency: 0.3,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 18), drivingPressure: b(9, 6, 12), autoPeep: b(0, 0, 5), peakMinusPlateau: b(30, 20, 60) },
    wired: W_STD, monitor: 'Fixed resistive load: high peak, normal plateau, slow expiratory flow.',
    pitfall: 'A tube passed beyond the lesion normalises the numbers; above it, nothing improves.',
    sources: [{ field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 21 (tracheal stenosis flattens the flow–volume loop)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'smoke-co', label: 'Smoke inhalation / CO poisoning', group: 'special',
    complianceMl: b(45, 30, 55), rInsp: b(18, 12, 30), rExp: b(22, 12, 40), autoPeepTendency: 0.3,
    shunt: b(0.12, 0.05, 0.25), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(16, 12, 22), drivingPressure: b(11, 8, 16), autoPeep: b(0, 0, 4), peakMinusPlateau: b(18, 12, 30) },
    wired: W_STD, monitor: 'Airway oedema and bronchospasm; SpO2 reads falsely normal with carboxyhaemoglobin.',
    pitfall: 'Pulse oximetry over-reads with COHb — use co-oximetry; give FiO2 1.0 regardless of SpO2.',
    sources: [{ field: 'pitfall', src: 'ENG: dual-wavelength oximetry reads COHb as oxyhaemoglobin (standard physiology; COHb/SpO2 display is Stage 7c)' }, { field: 'signature', src: S_MECH }],
  },
];
```

**Create `packages/ventilator/src/pathology/mechanics.ts`:**

```ts
// Catalogue row → ventilator lung (the `vent` part of a link profile) and the reference-settings run the
// signature tests use. Expiratory resistance above inspiratory is expressed through v1.9's flow-limitation term
// with a custom factor (eflK = rInsp/rExp) and no PEEP stenting, so R_exp is exactly the row's value.
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import type { RecruitParams } from '../link/recruit.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

export function mechanicsToVent(row: LungPathology): Partial<VentConfig> {
  const ri = row.rInsp.value;
  const re = row.rExp.value;
  const efl = re > ri * 1.05;
  return {
    compliance: row.complianceMl.value, resistance: ri, airwayClosure: false, uip: false, stressIdx: false,
    efl, eflSeverity: efl ? 'custom' : 'moderate', eflK: efl ? ri / re : 0.35, peepStent: efl ? 0 : 40,
  };
}

/** PEEP recruitment for the link (link/recruit.ts): shunt spans the row's band; none when not recruitable. */
export function recruitOf(row: LungPathology): RecruitParams | null {
  if (row.recruitability === 'none' || row.recruitP50 === undefined) return null;
  const k = { high: 2, moderate: 2.5, low: 4 }[row.recruitability];
  return { shuntMax: row.shunt.hi, shuntMin: row.shunt.lo, p50: row.recruitP50, k };
}

export interface Signature { plateau: number; drivingPressure: number; autoPeep: number; peakMinusPlateau: number }

/** Run the row at its reference settings for 60 s (VC, square flow, 0.3 s pause, no pressure limit). */
export function referenceRun(row: LungPathology): { vs: VentState; sig: Signature } {
  const r = { ...REF_SETTINGS, ...row.ref };
  const vs = createVent({
    ...mechanicsToVent(row), mode: 'VC', vt: r.vtMl, rate: r.rr, peep: r.peep, vcFlow: r.flowLpm, pause: r.pauseS,
    flowPattern: 'square', pmax: 120,
  });
  advanceVent(vs, 60);
  const m = vs.p.measured;
  return {
    vs,
    sig: { plateau: m.PLAT, drivingPressure: m.PLAT - r.peep - m.autoPEEP, autoPeep: m.autoPEEP, peakMinusPlateau: m.PIP - m.PLAT },
  };
}
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './pathology/catalogue.ts';
export * from './pathology/mechanics.ts';
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 9 passed. Prototype values (plateau / ΔP / auto-PEEP / peak−plateau): normal 13.9/8.9/0.0/9.9; bronchospasm 19.2/9.8/4.4/29.9; anaphylaxis 21.2/10.9/5.3/34.9; COPD 1–2 14.5/8.2/1.4/14.9; COPD 3–4 17.7/7.5/5.2/21.9; CF 17.7/10.9/1.8/21.9; tube obstruction 17.4/8.9/3.5/39.9; tracheal 15.6/8.9/1.7/29.9; smoke 16.2/10.9/0.3/17.9.

- [x] **Step 5: Spot-check three citations against the books (R37: the page must be opened)**

```bash
/Users/samhv/Desktop/Claude/CODE/.venv-studyaid/bin/python - <<'PY'
import pymupdf
L = '/Users/samhv/Desktop/Claude/library/sources/full-pdfs/'
for book, pdfp, needle in [('coexist-8th', 44, 'air trapping'), ('coexist-8th', 38, 'high peak airway pressure'), ('miller-10th', 1849, 'auto-PEEP')]:
    t = ' '.join(pymupdf.open(L + book + '.pdf')[pdfp - 1].get_text().split()).replace('- ', '-')
    print(book, pdfp, needle.lower() in t.lower())
PY
```

Expected: three `True`. (Co-Existing 8e ch. 2 p. 32 is PDF page 44, p. 26 is PDF page 38.) A `False` means the citation is wrong: fix the `src` text to what the page says and note it in the gate note.

- [x] **Step 6: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): R36 lung-pathology catalogue schema, mechanics mapping, signature test; normal/obstructive/airway rows

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 10: Pathology catalogue II — parenchymal and restrictive rows

**Files:**
- Modify: `packages/ventilator/src/pathology/catalogue.ts` (insert 14 rows)
- Test: `packages/ventilator/test/pathology-signature.test.ts` (unchanged; it iterates every row)

**Interfaces:** adds rows `ards-mild`, `ards-moderate`, `ards-severe-recruitable`, `ards-severe-nonrecruitable`, `fibrosis-ild`, `scleroderma`, `chest-wall-restriction`, `obesity-ohs`, `pneumonia-lobar`, `atelectasis`, `oedema-cardiogenic`, `oedema-noncardiogenic`, `aspiration`, `covid-pneumonitis` (Tasks 12–14 and 18 use these ids).

- [x] **Step 1: Write the failing test**

Append to `packages/ventilator/test/pathology-signature.test.ts` (after the `describe` block):

```ts
describe('catalogue coverage', () => {
  it('has the R36 parenchymal/restrictive rows (Task 10)', () => {
    const ids = LUNG_PATHOLOGIES.map((r) => r.id);
    for (const id of ['ards-mild', 'ards-moderate', 'ards-severe-recruitable', 'ards-severe-nonrecruitable', 'fibrosis-ild', 'scleroderma', 'chest-wall-restriction', 'obesity-ohs', 'pneumonia-lobar', 'atelectasis', 'oedema-cardiogenic', 'oedema-noncardiogenic', 'aspiration', 'covid-pneumonitis']) expect(ids).toContain(id);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts`
Expected: FAIL — `expected [...] to include 'ards-mild'`.

- [x] **Step 3: Insert the rows**

In `packages/ventilator/src/pathology/catalogue.ts`, insert the following block immediately BEFORE the final `];` line:

```ts
  // --- parenchymal and restrictive (Task 10) ---
  {
    id: 'ards-mild', label: 'ARDS — Berlin mild', group: 'parenchymal',
    complianceMl: b(40, 32, 50), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.5, 0.4, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.3, 1, 1.8), hpvSensitivity: 0.7,
    recruitability: 'moderate', recruitP50: 8,
    signature: { plateau: b(17, 14, 22), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 9, 16) },
    wired: W_STD, monitor: 'P/F 200–300 on PEEP ≥ 5; ΔP 10–15 at 6–7 mL/kg.',
    pitfall: 'Keep ΔP ≤ 15 and Pplat ≤ 30; the P/F category depends on the PEEP it was measured at.',
    sources: [
      { field: 'signature', src: 'Miller 10e pdf p. 1851: "titrate PEEP between 5 and 10 cmH2O to maximize compliance while maintaining a driving pressure (plateau pressure-PEEP) ≤15 cmH2O."' },
      { field: 'shunt', src: 'Dellinger 5e ch. 36 p. 595: "there should be a minimum of 5 cm H2O PEEP and 10 cm H2O in those patients with severe ARDS (Pao2/FIO2 < 100)." (Berlin grading; shunt fractions ENG from P/F bands)' },
    ],
  },
  {
    id: 'ards-moderate', label: 'ARDS — Berlin moderate', group: 'parenchymal',
    complianceMl: b(32, 25, 40), rInsp: b(13, 10, 16), rExp: b(13, 10, 16), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.55, 0.45, 0.65), diffusionFactor: 1, pvrMultiplier: b(1.5, 1.2, 2.2), hpvSensitivity: 0.6,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(20, 16, 27), drivingPressure: b(15, 12, 20), autoPeep: NO_AP, peakMinusPlateau: b(13, 10, 16) },
    wired: W_STD, monitor: 'P/F 100–200; SpO2 responds to PEEP over minutes (recruitment) and falls fast when PEEP is dropped.',
    pitfall: 'A PEEP step that raises SpO2 but also ΔP means overdistension, not recruitment.',
    sources: [
      { field: 'signature', src: 'Miller 10e pdf p. 1438 cites Amato, NEJM 2015;372:747 ("Driving pressure and survival in the acute respiratory distress syndrome"); ΔP > 15 marks risk (ENG band from that paper\'s groups)' },
      { field: 'recruitP50', src: 'ENG: half-recruitment at total PEEP ≈ 10 cmH2O, midway through the 5–15 cmH2O range trials titrate over (Dellinger 5e ch. 36 p. 595)' },
    ],
  },
  {
    id: 'ards-severe-recruitable', label: 'ARDS — severe, recruitable', group: 'parenchymal',
    complianceMl: b(25, 18, 32), rInsp: b(15, 12, 18), rExp: b(15, 12, 18), autoPeepTendency: 0,
    shunt: b(0.4, 0.25, 0.5), deadSpaceFraction: b(0.6, 0.5, 0.7), diffusionFactor: 1, pvrMultiplier: b(1.8, 1.3, 2.5), hpvSensitivity: 0.5,
    recruitability: 'high', recruitP50: 12,
    signature: { plateau: b(25, 20, 32), drivingPressure: b(20, 15, 27), autoPeep: NO_AP, peakMinusPlateau: b(15, 12, 18) },
    wired: W_STD, monitor: 'P/F < 100; high PEEP improves SpO2 AND compliance (ΔP falls).',
    pitfall: 'Recruitment takes tens of seconds to minutes; derecruitment on disconnection takes seconds.',
    sources: [{ field: 'recruitability', src: 'Dellinger 5e ch. 9 (pdf 200) cites Meade, JAMA 2008;299:637 ("low tidal volumes, recruitment maneuvers, and high positive end-expiratory pressure")' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'ards-severe-nonrecruitable', label: 'ARDS — severe, non-recruitable', group: 'parenchymal',
    complianceMl: b(22, 15, 30), rInsp: b(15, 12, 18), rExp: b(15, 12, 18), autoPeepTendency: 0,
    shunt: b(0.4, 0.35, 0.45), deadSpaceFraction: b(0.65, 0.55, 0.75), diffusionFactor: 0.9, pvrMultiplier: b(2, 1.5, 3), hpvSensitivity: 0.5,
    recruitability: 'low', recruitP50: 20,
    signature: { plateau: b(27, 20, 35), drivingPressure: b(22, 16, 33), autoPeep: NO_AP, peakMinusPlateau: b(15, 12, 18) },
    wired: W_STD, monitor: 'Raising PEEP raises plateau and ΔP, SpO2 barely moves, BP falls.',
    pitfall: 'High PEEP here only overdistends and depresses CO — the reason PEEP must be titrated, not prescribed.',
    sources: [{ field: 'recruitability', src: 'ENG: the non-recruitable phenotype of the recruitment trials (Dellinger 5e ch. 36); shunt band narrow because PEEP barely changes it' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'fibrosis-ild', label: 'Pulmonary fibrosis / ILD', group: 'restrictive',
    complianceMl: b(30, 20, 40), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.5, pvrMultiplier: b(1.8, 1.2, 3), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(21, 16, 30), drivingPressure: b(16, 12, 25), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'High plateau and driving pressure at a normal VT; desaturates fast (low FRC, diffusion limit); PEEP does not help.',
    pitfall: 'Driving pressure is high at "normal" VT — use smaller VT and higher RR; no recruitable lung.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 p. 47: "ILD is a term used for a group of diseases with similar presentation" (chronic intrinsic restrictive lung disease; decreased compliance and diffusing capacity)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'scleroderma', label: 'Scleroderma (ILD + PH + stiff chest wall)', group: 'restrictive',
    complianceMl: b(33, 22, 45), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.55, pvrMultiplier: b(2.5, 1.5, 5), hpvSensitivity: 1.2,
    recruitability: 'none',
    signature: { plateau: b(20, 15, 28), drivingPressure: b(15, 10, 23), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Restrictive mechanics plus PH physiology; finger SpO2 may read poorly (Raynaud) — use ear/forehead probe.',
    pitfall: 'A low finger SpO2 may be vasospasm, not hypoxaemia; decreased diffusion capacity shortens safe apnoea.',
    sources: [
      { field: 'diffusionFactor', src: 'Co-Existing 8e ch. 24 p. 502: "prolonged periods of preoxygenation to compensate for the decreased pulmonary oxygen reserve and diffusion ca[pacity]"' },
      { field: 'pitfall', src: 'Co-Existing 8e ch. 12 p. 265: "Raynaud phenomenon sometimes appears as part of the constellation of symptoms seen with the scleroderma subtype known as CREST syndrome."' },
    ],
  },
  {
    id: 'chest-wall-restriction', label: 'Kyphoscoliosis / chest-wall restriction', group: 'restrictive',
    complianceMl: b(30, 20, 40), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 8,
    signature: { plateau: b(21, 16, 30), drivingPressure: b(16, 12, 25), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'High plateau from the chest wall, transpulmonary pressure lower than it looks.',
    pitfall: 'Plateau overstates lung stress when the chest wall is stiff; chronic hypoxia leads to PH/cor pulmonale.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 (chronic extrinsic restrictive disease): chest-wall deformities decrease total respiratory compliance (ENG value)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'obesity-ohs', label: 'Obesity (BMI ≥ 40) / OHS', group: 'restrictive',
    complianceMl: b(35, 25, 45), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0.1,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: b(1.3, 1, 2), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 10,
    signature: { plateau: b(19, 14, 26), drivingPressure: b(14, 11, 20), autoPeep: b(0, 0, 2), peakMinusPlateau: b(14, 10, 18) },
    ref: { pbwKg: 66 },
    wired: W_STD, monitor: 'Rapid desaturation at induction (small FRC); SpO2 improves with PEEP 10–15; higher plateau from the chest wall.',
    pitfall: 'Set VT on predicted, not actual, weight; PEEP counters the abdominal load.',
    sources: [
      { field: 'shunt', src: 'Co-Existing 8e ch. 19 p. 388: "patients with obesity have higher oxygen requirements and a decreased FRC, which predisposes them to desaturation during induction"' },
      { field: 'recruitability', src: 'Co-Existing 8e ch. 3 p. 52: "With extreme clinical obesity, FRC may exceed closing volume and approach residual volume." (airway closure → PEEP-responsive)' },
    ],
  },
  {
    id: 'pneumonia-lobar', label: 'Lobar pneumonia (unilateral)', group: 'parenchymal',
    complianceMl: b(42, 32, 52), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.1, 1, 1.4), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 14,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: W_STD, monitor: 'Shunt-type hypoxaemia that responds poorly to FiO2 and PEEP; mechanics mildly worse.',
    pitfall: 'PEEP may overdistend the healthy lung and divert blood to the consolidated one (shunt ↑).',
    sources: [{ field: 'shunt', src: 'Dellinger 5e ch. 24 (pdf 484): multilobar pneumonia with "moderate oxygen requirement" progressing (case); shunt band ENG from consolidated-lobe fraction' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'atelectasis', label: 'Atelectasis (post-induction)', group: 'parenchymal',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.15), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: b(1, 1, 1.1), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 8, 12) },
    wired: W_STD, monitor: 'SpO2 a few points low on FiO2 1.0; improves with a recruitment manoeuvre and PEEP.',
    pitfall: 'FiO2 1.0 at induction worsens absorption atelectasis.',
    sources: [{ field: 'shunt', src: 'Miller 10e pdf p. 341: "The use of 30% versus 100% O2 during induction was demonstrated in a clinical study to eliminate the formation of atelectasis."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'oedema-cardiogenic', label: 'Cardiogenic pulmonary oedema', group: 'parenchymal',
    complianceMl: b(38, 28, 48), rInsp: b(14, 10, 18), rExp: b(16, 10, 22), autoPeepTendency: 0.1,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(1.5, 1.2, 2.5), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 7,
    signature: { plateau: b(18, 15, 23), drivingPressure: b(13, 10, 18), autoPeep: b(0, 0, 2), peakMinusPlateau: b(14, 10, 18) },
    wired: W_STD, monitor: 'PEEP improves SpO2 quickly; in the failing LV it may also help CO (afterload) — in this model (until 7a) CO falls with mean Palv.',
    pitfall: 'PEEP lowers LV afterload: the preload-dependent fall in CO seen in normal hearts may not happen (Stage 7a).',
    sources: [{ field: 'recruitability', src: 'Dellinger 5e ch. 27 p. 419 cites Gray, NEJM 2008;359:142 ("Noninvasive ventilation in acute cardiogenic pulmonary edema")' }, { field: 'signature', src: S_MECH }],
    disagreements: 'Positive pressure raises or lowers CO in LV failure depending on filling; the Stage 3 coupling can only lower it.',
  },
  {
    id: 'oedema-noncardiogenic', label: 'Non-cardiogenic oedema (negative-pressure / TRALI)', group: 'parenchymal',
    complianceMl: b(35, 25, 45), rInsp: b(13, 10, 16), rExp: b(13, 10, 16), autoPeepTendency: 0,
    shunt: b(0.25, 0.12, 0.35), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(1.3, 1, 2), hpvSensitivity: 0.8,
    recruitability: 'high', recruitP50: 8,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 11, 20), autoPeep: NO_AP, peakMinusPlateau: b(13, 10, 16) },
    wired: W_STD, monitor: 'Pink frothy secretions, sudden desaturation after airway obstruction or transfusion; PEEP-responsive.',
    pitfall: 'Negative-pressure oedema follows laryngospasm against a closed glottis — it appears after the obstruction is relieved.',
    sources: [{ field: 'group', src: 'Co-Existing 8e ch. 3 p. 39: acute intrinsic restrictive disease (pulmonary edema) causes include "Upper airway obstruction (negative pressur[e])"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'aspiration', label: 'Aspiration pneumonitis', group: 'parenchymal',
    complianceMl: b(38, 28, 48), rInsp: b(16, 12, 25), rExp: b(20, 12, 30), autoPeepTendency: 0.2,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.2, 1, 1.6), hpvSensitivity: 0.8,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(18, 14, 23), drivingPressure: b(13, 10, 18), autoPeep: b(0, 0, 3), peakMinusPlateau: b(16, 12, 25) },
    wired: W_STD, monitor: 'Bronchospasm and desaturation soon after regurgitation; ARDS-like within hours.',
    pitfall: 'Early antibiotics and steroids are not indicated for sterile pneumonitis.',
    sources: [{ field: 'group', src: 'Dellinger 5e ch. 39 (pdf 881): "Aspiration pneumonitis and secondary infectious pneumonia compromise this criterion."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'covid-pneumonitis', label: 'COVID-type pneumonitis', group: 'parenchymal',
    complianceMl: b(40, 25, 55), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.55, 0.45, 0.65), diffusionFactor: 0.8, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 0.4,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(17, 13, 25), drivingPressure: b(12, 9, 20), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: W_STD, monitor: 'Hypoxaemia out of proportion to mechanics early (lost HPV, microthrombi: high dead space).',
    pitfall: 'High PEEP in the compliant early phenotype overdistends without improving SpO2.',
    sources: [{ field: 'hpvSensitivity', src: 'ENG: the "L vs H phenotype" debate; values mid-way' }, { field: 'signature', src: S_MECH }],
    disagreements: 'L phenotype (C ≈ 50, low recruitability) vs H phenotype (C ≈ 30, ARDS-like, recruitable); the row sits between; later literature treats COVID ARDS as ARDS.',
  },
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 24 passed (23 rows + coverage). Prototype: ARDS mild 17.3/12.3/0/11.8, moderate 20.3/15.3/0/12.8, severe recruitable 24.6/19.6/0/14.8, severe non-recruitable 27.3/22.3/0/14.7, fibrosis 21.3/16.3/0/9.8, obesity 19.0/14.0/0/13.8.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): catalogue rows — ARDS by Berlin grade and recruitability, ILD, scleroderma, chest wall, obesity, pneumonia, atelectasis, oedema, aspiration, COVID

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 11: Pathology catalogue III — vascular, pleural, device and special rows

**Files:**
- Modify: `packages/ventilator/src/pathology/catalogue.ts` (insert 16 rows), `packages/ventilator/test/pathology-signature.test.ts` (one coverage test)

**Interfaces:** adds `pulmonary-hypertension`, `pe-massive`, `pe-submassive`, `fat-embolism`, `air-embolism`, `pleural-effusion`, `pneumothorax-simple`, `pneumothorax-tension`, `haemothorax`, `one-lung-ventilation`, `endobronchial`, `bronchopleural-fistula`, `neuromuscular-weakness`, `diaphragm-paralysis`, `pregnancy`, `neonatal-rds`. `LUNG_PATHOLOGIES.length === 39` afterwards.

- [x] **Step 1: Write the failing test**

Append to the `describe('catalogue coverage', …)` block in `packages/ventilator/test/pathology-signature.test.ts`:

```ts
  it('has all 39 R36 rows, unique ids, and every row cites its compliance and signature (Task 11)', () => {
    expect(LUNG_PATHOLOGIES).toHaveLength(39);
    expect(new Set(LUNG_PATHOLOGIES.map((r) => r.id)).size).toBe(39);
    for (const r of LUNG_PATHOLOGIES) {
      expect(r.sources.length).toBeGreaterThanOrEqual(2);
      for (const b of [r.complianceMl, r.rInsp, r.rExp, r.shunt, r.deadSpaceFraction, r.pvrMultiplier]) expect(b.lo <= b.value && b.value <= b.hi).toBe(true);
    }
    expect(LUNG_PATHOLOGIES.find((r) => r.id === 'bronchopleural-fistula')!.monitor).toMatch(/NOT modelled/);
  });
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts`
Expected: FAIL — `expected [ …23 items ] to have a length of 39`.

- [x] **Step 3: Insert the rows**

Insert immediately BEFORE the final `];` of `packages/ventilator/src/pathology/catalogue.ts`:

```ts
  // --- vascular, pleural, device and special (Task 11) ---
  {
    id: 'pulmonary-hypertension', label: 'Pulmonary hypertension (PH crisis risk)', group: 'vascular',
    complianceMl: b(50, 40, 60), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.38, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(3, 2, 6), hpvSensitivity: 1.5,
    recruitability: 'low', recruitP50: 4,
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 7, 13), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Mechanics near normal; the danger is haemodynamic: high PEEP/plateau, hypoxia or hypercapnia → PVR ↑ → RV failure (CVP ↑, BP ↓, SpO2 ↓).',
    pitfall: 'Hypercapnia, acidosis, hypoxia, light anaesthesia and high intrathoracic pressure each raise PVR — permissive hypercapnia is harmful here.',
    sources: [
      { field: 'pvrMultiplier', src: 'Co-Existing 8e ch. 9 p. 197: "pulmonary hypertension as a broad entity is defined as mPAP over 20 mm Hg measured by right heart catheterization." (PVR × 3 = moderate group 1/3 disease, ENG)' },
      { field: 'hpvSensitivity', src: 'ENG: HPV and hypercapnic vasoconstriction on an already-constricted bed; Stage 7a acts on it' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'pe-massive', label: 'Massive pulmonary embolism', group: 'vascular',
    complianceMl: b(50, 40, 60), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.12, 0.05, 0.25), deadSpaceFraction: b(0.6, 0.45, 0.75), diffusionFactor: 1, pvrMultiplier: b(4, 2.5, 6), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 7, 13), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Sudden EtCO2 fall with unchanged ventilation, hypotension, SpO2 fall; airway pressures unchanged.',
    pitfall: 'Normal airway pressures with a falling EtCO2 point to the circulation (PE, low CO), not the lung.',
    sources: [
      { field: 'deadSpaceFraction', src: 'Dellinger 5e ch. 42 (pdf 921): "If the patient has end-tidal CO2 (PETCO2) monitoring, an increase in the PaCO2-PETCO2 gradient may occur."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'pe-submassive', label: 'Submassive pulmonary embolism', group: 'vascular',
    complianceMl: b(52, 42, 62), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 1, pvrMultiplier: b(2, 1.5, 3), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 7, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Widened Pa–EtCO2 gradient, tachycardia, RV strain; BP preserved.',
    pitfall: 'Normotensive does not mean safe: RV dysfunction predicts deterioration.',
    sources: [{ field: 'deadSpaceFraction', src: 'Dellinger 5e ch. 42 (pdf 921): "an increase in the PaCO2-PETCO2 gradient may occur."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'fat-embolism', label: 'Fat embolism', group: 'vascular',
    complianceMl: b(42, 30, 52), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(2, 1.3, 3), hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(17, 14, 22), drivingPressure: b(12, 9, 17), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Hypoxaemia 24–72 h after long-bone fracture/fixation, then an ARDS-like picture; EtCO2 dip at reaming.',
    pitfall: 'The triad (hypoxaemia, neurological change, petechiae) is incomplete under anaesthesia.',
    sources: [{ field: 'group', src: 'Dellinger 5e ch. 26 p. 386 cites "Fat embolism in patients with an isolated fracture of the femoral shaft. J Trauma. 1988;28:383"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'air-embolism', label: 'Venous air embolism', group: 'vascular',
    complianceMl: b(52, 42, 62), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.5, 0.35, 0.65), diffusionFactor: 1, pvrMultiplier: b(2.5, 1.5, 4), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 7, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Abrupt EtCO2 fall (sitting craniotomy, laparoscopy), then hypotension and arrhythmia.',
    pitfall: 'EtCO2 falls before the blood pressure — the capnograph is the early monitor.',
    sources: [{ field: 'monitor', src: 'Miller 10e pdf p. 505: N2O expands trapped air (VAE management context); EtCO2 as the sensitive monitor is ENG consensus' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pleural-effusion', label: 'Large pleural effusion', group: 'pleural',
    complianceMl: b(40, 30, 50), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.33, 0.28, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(10, 8, 12) },
    wired: W_STD, monitor: 'Compressive atelectasis: modest shunt, compliance falls; improves after drainage.',
    pitfall: 'Re-expansion pulmonary oedema after rapid drainage of a large effusion.',
    sources: [{ field: 'pitfall', src: 'Co-Existing 8e ch. 3 p. 39 lists "Reexpansion of collapsed lung" among causes of acute pulmonary edema' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pneumothorax-simple', label: 'Pneumothorax — simple', group: 'pleural',
    complianceMl: b(38, 28, 48), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(18, 14, 23), drivingPressure: b(13, 10, 18), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Rising peak and plateau, falling SpO2; haemodynamics preserved.',
    pitfall: 'Positive pressure (and N2O) converts a simple pneumothorax into a tension one.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 1823: "whenever positive-pressure ventilation is used, the pressure [in a bulla rises]" (bullae and pneumothorax under PPV)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pneumothorax-tension', label: 'Pneumothorax — tension', group: 'pleural',
    complianceMl: b(18, 10, 25), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.45), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(32, 25, 50), drivingPressure: b(27, 20, 45), autoPeep: NO_AP, peakMinusPlateau: b(14, 10, 18) },
    wired: { ...W_STD, pvr: 'stage7a' }, monitor: 'Airway pressures climb breath by breath, SpO2 falls, then BP collapses with a high CVP (obstructive shock).',
    pitfall: 'Treated as "hypotension and hypoxaemia" without examining the chest — a framing error; decompress before imaging.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 142: "provides supportive care for hypotension and hypoxemia without further evaluation, delaying the diagnosis and treatment of tension pneumothorax."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'haemothorax', label: 'Haemothorax', group: 'pleural',
    complianceMl: b(35, 25, 45), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 11, 20), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Effusion mechanics plus haemorrhage (BP ↓, HR ↑, PPV ↑).',
    pitfall: 'The circulation, not the lung, usually decides the outcome: it is a haemorrhage.',
    sources: [{ field: 'complianceMl', src: 'ENG: as a large effusion (compressive atelectasis), Co-Existing 8e ch. 3' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'one-lung-ventilation', label: 'One-lung ventilation (lateral, open chest)', group: 'airway-device',
    complianceMl: b(25, 18, 32), rInsp: b(18, 12, 25), rExp: b(18, 12, 25), autoPeepTendency: 0.3,
    shunt: b(0.25, 0.2, 0.35), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 6,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 10, 20), autoPeep: b(1, 0, 5), peakMinusPlateau: b(18, 12, 25) },
    ref: { vtMl: 350 }, wired: W_STD, monitor: 'Peak and plateau rise when one lung is isolated; SpO2 nadir ~20–30 min in as HPV builds.',
    pitfall: 'Hypoxaemia on OLV: check the tube position first; volatile agents and vasodilators blunt HPV.',
    sources: [
      { field: 'shunt', src: 'Miller 10e pdf p. 499: "Pulmonary right-to-left shunting can be either physiologic, pathologic, or iatrogenic, such as during one-lung ventilation."' },
      { field: 'autoPeepTendency', src: 'Miller 10e pdf p. 1888: "The interaction between applied PEEP and auto-PEEP during one-lung ventilation."' },
    ],
  },
  {
    id: 'endobronchial', label: 'Endobronchial intubation', group: 'airway-device',
    complianceMl: b(28, 20, 35), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.4), deadSpaceFraction: b(0.3, 0.25, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(23, 18, 30), drivingPressure: b(18, 13, 25), autoPeep: NO_AP, peakMinusPlateau: b(14, 10, 18) },
    wired: W_STD, monitor: 'Peak and plateau jump, SpO2 falls over minutes, unilateral breath sounds; EtCO2 near normal.',
    pitfall: 'Head flexion or pneumoperitoneum pushes the tube in: recheck depth after positioning.',
    sources: [{ field: 'monitor', src: 'Miller 10e pdf p. 1508: "Flexible bronchoscopy or chest radiography can be used if the clinical picture is unclear." (confirming ETT depth)' }, { field: 'complianceMl', src: 'Stage 3 driver: endobronchial halves compliance (ENG, kept consistent)' }],
  },
  {
    id: 'bronchopleural-fistula', label: 'Bronchopleural fistula', group: 'airway-device',
    complianceMl: b(40, 30, 50), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: { ...W_STD, mechanics: 'vent' }, monitor: 'VTE < VTI (leak through the chest drain) — the leak is NOT modelled by the single-compartment ventilator yet.',
    pitfall: 'Every extra cmH2O of PEEP/plateau enlarges the leak; lowest pressures that oxygenate.',
    sources: [{ field: 'monitor', src: 'ENG: leak not modelled (single compartment, no leak path); listed so the picker is complete' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'neuromuscular-weakness', label: 'Neuromuscular weakness (MG, GBS)', group: 'neuromuscular',
    complianceMl: b(50, 40, 60), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 6,
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 8, 13), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Normal mechanics on the ventilator; weak or absent spontaneous effort (low P0.1) — failure is of the pump.',
    pitfall: 'Normal gas exchange on the ventilator says nothing about readiness to breathe alone.',
    sources: [{ field: 'monitor', src: 'Co-Existing 8e ch. 3 p. 52: "Respiratory insufficiency that requires mechanical ventilation occurs in 20% to 25% of patients with Guillain-Barré syndrome."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'diaphragm-paralysis', label: 'Bilateral diaphragmatic paralysis', group: 'neuromuscular',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.15), deadSpaceFraction: b(0.33, 0.28, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Basal atelectasis (supine), PEEP-responsive; hypercapnic when weaned.',
    pitfall: 'Worse supine — the abdomen pushes the flaccid diaphragm up.',
    sources: [{ field: 'monitor', src: 'Co-Existing 8e ch. 3 p. 52: neuromuscular disorders "rarely progress to the point of hypercapnic respiratory failure unless diaphragmatic weakness or paralysis is present."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pregnancy', label: 'Pregnancy (3rd trimester)', group: 'special',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.12), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 7,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    ref: { pbwKg: 57 }, wired: W_STD, monitor: 'Fast desaturation (FRC −20–25 %, VO2 +20 %); normal PaCO2 is ~30 mmHg.',
    pitfall: 'An EtCO2 of 38 is hypoventilation in late pregnancy; supine aortocaval compression lowers CO.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 p. 54: "Intrinsic lung compliance is unaffected by pregnancy. At term, FRC decreases by another 25% in the supine compared to the sitting position." (chest-wall compliance falls: ENG 45)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'neonatal-rds', label: 'Neonatal RDS (3 kg preterm)', group: 'special',
    complianceMl: b(1.5, 0.8, 2.5), rInsp: b(60, 40, 100), rExp: b(60, 40, 100), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.35, 0.3, 0.45), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 3), hpvSensitivity: 1.2,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(15, 11, 25), drivingPressure: b(10, 6, 19), autoPeep: NO_AP, peakMinusPlateau: b(6, 4, 10) },
    ref: { vtMl: 15, rr: 40, peep: 5, pbwKg: 3, flowLpm: 6 }, wired: W_STD,
    monitor: 'Very low compliance (≈ 0.5 mL/cmH2O/kg), PEEP- and surfactant-responsive; high rates with small VT.',
    pitfall: 'Surfactant changes compliance within minutes: pressures that were needed become injurious.',
    sources: [{ field: 'complianceMl', src: 'ENG: surfactant-deficient lung ≈ 0.5 mL/cmH2O/kg (3 kg → 1.5); 3.0 ETT ≈ 60 cmH2O/L/s — neonatal texts not in the local library; flagged for Ali' }, { field: 'signature', src: S_MECH }],
  },
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pathology-signature.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 41 passed (39 rows + 2 coverage). Prototype: tension pneumothorax 32.2/27.2/0/13.7; endobronchial 22.5/17.5/0/13.8; OLV (VT 350) 19.0/14.0/0/17.8; neonatal RDS (VT 15, 6 L/min) 15.0/10.0/0/5.6; PE massive 14.8/9.8/0/10.9.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): catalogue rows — PH, PE, fat/air embolism, effusion, pneumothorax, haemothorax, OLV, endobronchial, BPF, neuromuscular, pregnancy, neonatal RDS (39 total)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 12: Link profiles, link core and the in-process link

**Files:**
- Create: `packages/ventilator/src/link/profiles.ts`, `packages/ventilator/src/link/core.ts`, `packages/ventilator/src/link/in-process.ts`, `packages/ventilator/test/link-core.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: `LUNG_PATHOLOGIES`, `mechanicsToVent`, `recruitOf` (Task 9); `applyLungState`, `createLungLink`, `LUNG_KEYS`, `lungBaseOf` (Task 8); `createRecruit`, `stepRecruit` (Task 8); `toVentFrame` (Task 7); `createVent`, `advanceVent` (Task 3); `createEngine` (engine-core).
- Produces: `ProfileId = string`; `StandIn { variable: StateVar; value; rampS }`; `LinkProfile { id, label, group, patient, vent, recruit, shunt, standIn, stage7 }`; `STAND_INS: Record<string, StandIn[]>`; `profileOf(row)`; `PROFILES: Record<ProfileId, LinkProfile>` (one per catalogue row); `LINK_TICK_S = 0.02`; `LinkCore { vs, lung, profile, recruit, circuitSent, started, seq }`; `createLinkCore(vs, profile)` (applies `profile.vent`); `linkTick(core, dt): Command[]` (first tick: shunt when not recruitable, stand-ins; each tick: airway event on a circuit change, one `externalDrive` frame, `setTarget shunt` when recruitment moves it); `linkEvent(core, ev)`; `patchVent(core, patch)`; `LinkedSim { engine, vs, core, events, set(patch), send(body), advanceTo(t), now() }`; `createLinkedSim({ profile?, seed?, vent? })` (throws on any rejected command; dispatches `thermal anaesthesia general` at start: a sedated ventilated patient).

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/link-core.test.ts`:**

```ts
// Link core: a profile per catalogue row; the first tick sends the profile's shunt/stand-ins and a frame;
// lungState updates the lung; the in-process lockstep link breathes the engine at the ventilator's rate.
import { describe, expect, it } from 'vitest';
import { createLinkCore, createLinkedSim, createVent, linkEvent, linkTick, LUNG_PATHOLOGIES, patchVent, PROFILES } from '../src/index.ts';

describe('link core', () => {
  it('one profile per row; the first tick sends shunt (or recruitment shunt), stand-ins, then a frame each tick', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(LUNG_PATHOLOGIES.map((r) => r.id).sort());
    const pe = createLinkCore(createVent(), PROFILES['pe-massive']!);
    const first = linkTick(pe, 0.02).map((c) => c.type + ('variable' in c ? `:${c.variable}` : ''));
    expect(first).toEqual(['setTarget:shunt', 'setTarget:sbp', 'setTarget:dbp', 'setTarget:cvp', 'setTarget:hr', 'externalDrive']);
    expect(linkTick(pe, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    const ards = createLinkCore(createVent(), PROFILES['ards-moderate']!);
    expect(ards.vs.cfg.compliance).toBe(32);
    expect(linkTick(ards, 0.02).map((c) => c.type)).toEqual(['externalDrive', 'setTarget']);
  });
  it('lungState moves the lung; a patch to the lung moves the base with it', () => {
    const core = createLinkCore(createVent(), PROFILES.normal!);
    const ev = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 } as const;
    linkEvent(core, ev);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40 });
    expect(core.vs.cfg.resistance).toBe(40);
    patchVent(core, { compliance: 20, resistance: 10 });
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40, shunt: 0.1 }); // still bronchospastic: ×4 of the NEW base
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([20, 40]);
  });
  it('in-process: the engine counts the ventilator’s 14 breaths/min', () => {
    const s = createLinkedSim({ profile: 'normal' });
    s.advanceTo(60);
    const br = s.events.filter((e) => e.type === 'breath' && e.t > 15);
    expect(br.length).toBeGreaterThanOrEqual(10);
    expect(br.length).toBeLessThanOrEqual(11);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-core.test.ts`
Expected: FAIL — `createLinkCore` is not exported.

- [x] **Step 3: Implement**

**Create `packages/ventilator/src/link/profiles.ts`:**

```ts
// Link profiles: one per lung-pathology row (pathology/catalogue.ts). Each has
//  • `patient` — the engine PatientProfile using ONLY fields on main today (ageY, weightKg, heightCm, sex,
//                baseline StateVars, sensors). Obesity reaches the engine's FRC rule; nothing else does yet.
//  • `vent`    — the ventilator's lung (mechanicsToVent) plus the row's reference settings when it has its own
//                (neonate, one-lung ventilation) — the BASE that lungState modulates (lung-input.ts).
//  • `recruit` — the interim PEEP → shunt curve (link/recruit.ts), or null; `shunt` is sent once when null.
//  • `standIn` — engine targets set at link start that STAND IN for Stage 7a physiology the engine lacks
//                (RV failure in massive PE, obstructive shock in tension pneumothorax, vasoplegia in anaphylaxis).
// STAGE 7 TARGETS (R22/R24/R31/R36): pvrMultiplier/hpvSensitivity (7a), dead space/diffusion (7b), and the
// profile mechanics themselves move into lungState; `standIn` is deleted when 7a lands.
import type { PatientProfile, StateVar } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import { LUNG_PATHOLOGIES, type LungPathology } from '../pathology/catalogue.ts';
import { mechanicsToVent, recruitOf } from '../pathology/mechanics.ts';
import type { RecruitParams } from './recruit.ts';

export type ProfileId = string;
/** An engine target set over `rampS` seconds; in MANUAL mode pressures are targets, so shock is set, not caused. */
export interface StandIn { variable: StateVar; value: number; rampS: number }
export interface LinkProfile {
  id: string;
  label: string;
  group: LungPathology['group'];
  patient: PatientProfile;
  vent: Partial<VentConfig>;
  recruit: RecruitParams | null;
  shunt: number;
  standIn: StandIn[];
  /** Fields this row carries that the engine cannot act on yet (shown in the picker tooltip and the gate note). */
  stage7: string;
}

const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } as const;
const ADULT: PatientProfile = { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M', sensors: SENSORS };
/** Patients that differ from the 70 kg adult (engine fields available today). */
const PATIENTS: Record<string, PatientProfile> = {
  'obesity-ohs': { ageY: 45, weightKg: 130, heightCm: 170, sex: 'M', sensors: SENSORS },
  pregnancy: { ageY: 30, weightKg: 80, heightCm: 165, sex: 'F', sensors: SENSORS, baseline: { hr: 92 } },
  'neonatal-rds': { ageY: 0.01, weightKg: 3, heightCm: 50, sex: 'M', sensors: SENSORS, baseline: { hr: 150, sbp: 55, dbp: 32 } },
  'copd-gold-3-4': { ...ADULT, ageY: 68, baseline: { volumeStatus: 0.6 } },
  'oedema-cardiogenic': { ...ADULT, ageY: 70, baseline: { volumeStatus: 0.8 } },
};
const shock = (sbp: number, dbp: number, cvp: number, hr: number): StandIn[] =>
  ([['sbp', sbp], ['dbp', dbp], ['cvp', cvp], ['hr', hr]] as const).map(([variable, value]) => ({ variable, value, rampS: 20 }));
/** Stage 7a/7g stand-ins [ENG]: the haemodynamic picture each condition produces, set as MANUAL targets. */
export const STAND_INS: Record<string, StandIn[]> = {
  'pe-massive': shock(70, 45, 15, 120), // RV failure → low CO; EtCO2 falls through Stage 3's low-flow factor
  'pneumothorax-tension': shock(65, 40, 18, 125), // obstructive shock
  'anaphylaxis-bronchospasm': shock(70, 35, 3, 125), // vasoplegia (Stage 7g)
  'air-embolism': shock(80, 50, 12, 110), // RV outflow air lock
};

export function profileOf(row: LungPathology): LinkProfile {
  const ref = row.ref;
  const refVent: Partial<VentConfig> = ref
    ? { ...(ref.vtMl !== undefined ? { vt: ref.vtMl } : {}), ...(ref.rr !== undefined ? { rate: ref.rr } : {}), ...(ref.peep !== undefined ? { peep: ref.peep } : {}), ...(ref.flowLpm !== undefined ? { vcFlow: ref.flowLpm } : {}) }
    : {};
  const later = Object.entries(row.wired).filter(([, w]) => w === 'stage7a' || w === 'stage7b' || w === 'not-modelled').map(([k, w]) => `${k}: ${w}`);
  return {
    id: row.id, label: row.label, group: row.group, patient: PATIENTS[row.id] ?? ADULT,
    vent: { ...mechanicsToVent(row), ...refVent }, recruit: recruitOf(row), shunt: row.shunt.value,
    standIn: STAND_INS[row.id] ?? [], stage7: later.join(', '),
  };
}

export const PROFILES: Record<ProfileId, LinkProfile> = Object.fromEntries(LUNG_PATHOLOGIES.map((r) => [r.id, profileOf(r)]));
```

**Create `packages/ventilator/src/link/core.ts`:**

```ts
// The transport-agnostic half of the R27 link: what the ventilator side sends every 20 ms tick, and what it does
// with the engine's events. Both the in-process link (in-process.ts) and the window link (port.ts) use it.
//   vent → engine: one `externalDrive` VentFrame per tick (50 Hz, the R27 ceiling); at start the profile's shunt
//                  (or the interim recruitment model's, whenever it moves) and its Stage 7 stand-ins; `applyEvent airway disconnected|patent` when the
//                  circuit is opened/closed at the Y-piece (so EtCO2 goes flat at once, Stage 3 M4).
//   engine → vent: `lungState` → applyLungState (lung-input.ts).
import type { Command, EngineEvent } from '@pme/engine-core';
import { applyLungState, createLungLink, LUNG_KEYS, lungBaseOf, type LungLink } from '../lung-input.ts';
import type { VentConfig } from '../types.ts';
import { toVentFrame } from '../frame.ts';
import { modeName } from '../presets.ts';
import type { VentState } from '../types.ts';
import { createRecruit, stepRecruit, type RecruitState } from './recruit.ts';
import type { LinkProfile } from './profiles.ts';

export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz

export interface LinkCore {
  vs: VentState;
  lung: LungLink;
  profile: LinkProfile;
  recruit: RecruitState | null;
  circuitSent: 'connected' | 'disconnected';
  started: boolean;
  seq: number;
}

export function createLinkCore(vs: VentState, profile: LinkProfile): LinkCore {
  Object.assign(vs.cfg, profile.vent);
  return {
    vs, lung: createLungLink(vs.cfg), profile,
    recruit: profile.recruit ? createRecruit(profile.recruit, vs.cfg.peep) : null,
    circuitSent: 'connected', started: false, seq: 0,
  };
}

const mk = (core: LinkCore, body: Record<string, unknown>): Command => ({ id: `vent-${++core.seq}`, issuedBy: 'ventilator', ...body }) as Command;

/** Commands for the engine after the ventilator has advanced to the current tick. */
export function linkTick(core: LinkCore, dt: number): Command[] {
  const vs = core.vs;
  const out: Command[] = [];
  if (!core.started) { // the profile's fixed shunt and Stage 7 stand-ins, once
    core.started = true;
    if (!core.recruit) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: core.profile.shunt }));
    for (const s of core.profile.standIn) out.push(mk(core, { type: 'setTarget', variable: s.variable, value: s.value, ramp: { durationS: s.rampS } }));
  }
  if (vs.circuit !== core.circuitSent) {
    core.circuitSent = vs.circuit;
    out.push(mk(core, { type: 'applyEvent', event: { kind: 'airway', state: vs.circuit === 'disconnected' ? 'disconnected' : 'patent' } }));
  }
  out.push(mk(core, { type: 'externalDrive', source: 'ventilator', frame: toVentFrame(vs, modeName(vs.cfg)) }));
  if (core.recruit && core.profile.recruit) {
    const totalPeep = vs.circuit === 'disconnected' ? 0 : vs.cfg.peep + vs.p.measured.autoPEEP;
    const sh = stepRecruit(core.recruit, core.profile.recruit, totalPeep, dt);
    if (sh !== null) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: sh }));
  }
  return out;
}

/** Engine events the ventilator consumes. */
export function linkEvent(core: LinkCore, ev: EngineEvent): void {
  if (ev.type === 'lungState') applyLungState(core.vs, core.lung, ev);
}

/**
 * Change ventilator settings from outside (a page, a demo, a test). A patch that touches the lung (LUNG_KEYS)
 * also moves the lungState base, or the next lungState would put the old lung back.
 */
export function patchVent(core: LinkCore, patch: Partial<VentConfig>): void {
  Object.assign(core.vs.cfg, patch);
  if (LUNG_KEYS.some((k) => k in patch)) core.lung.base = lungBaseOf(core.vs.cfg);
}
```

**Create `packages/ventilator/src/link/in-process.ts`:**

```ts
// In-process link: the ventilator and the patient engine in ONE loop on ONE sim clock (lockstep, deterministic).
// Each 20 ms tick: ventilator to t → its commands dispatched → engine.advanceTo(t) → the engine's events reach
// the ventilator before its next step. Used by the tests and by pages that host both (vent-link.html's headless
// mode); a page with a worker-hosted monitor uses port.ts instead.
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import { createLinkCore, linkEvent, linkTick, patchVent, LINK_TICK_S, type LinkCore } from './core.ts';
import { PROFILES, type ProfileId } from './profiles.ts';

export interface LinkedSim {
  engine: MonitorEngine;
  vs: VentState;
  core: LinkCore;
  /** Every engine event, in order. */
  events: EngineEvent[];
  /** Change ventilator settings (patchVent). */
  set(patch: Partial<VentConfig>): void;
  /** Dispatch an engine command now (a demo's engine step). */
  send(body: Record<string, unknown>): void;
  /** Advance both to sim time t (whole 20 ms ticks). */
  advanceTo(t: number): void;
  now(): number;
}

export function createLinkedSim(opts: { profile?: ProfileId; seed?: number; vent?: Partial<VentConfig> } = {}): LinkedSim {
  const profile = PROFILES[opts.profile ?? 'normal'];
  if (!profile) throw new Error(`unknown profile ${opts.profile}`);
  const engine = createEngine({ seed: opts.seed ?? 7, patient: profile.patient });
  const vs = createVent();
  const core = createLinkCore(vs, profile);
  patchVent(core, opts.vent ?? {});
  const events: EngineEvent[] = [];
  const pending: EngineEvent[] = [];
  engine.on((e) => {
    events.push(e);
    if (e.type === 'lungState') pending.push(e);
  });
  let k = 0;
  let n = 0;
  const send = (cmds: Command[]) => {
    for (const c of cmds) {
      const r = engine.dispatch(c);
      if (!r.accepted) throw new Error(`link command rejected: ${r.reason}`);
    }
  };
  // a sedated, ventilated patient: GA thermal/metabolic state, and the drive owns breathing from t = 0
  send([{ id: 'vent-ga', issuedBy: 'ventilator', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } } as Command]);
  send(linkTick(core, 0));
  const sim: LinkedSim = {
    engine, vs, core, events,
    set: (patch) => patchVent(core, patch),
    send: (body) => send([{ id: `page-${++n}`, issuedBy: 'page', ...body } as Command]),
    advanceTo(t: number) {
      while ((k + 1) * LINK_TICK_S <= t + 1e-9) {
        k++;
        const tk = k * LINK_TICK_S;
        while (pending.length) linkEvent(core, pending.shift() as EngineEvent);
        advanceVent(vs, tk);
        send(linkTick(core, LINK_TICK_S));
        engine.advanceTo(tk);
      }
    },
    now: () => k * LINK_TICK_S,
  };
  return sim;
}
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './link/profiles.ts';
export * from './link/core.ts';
export * from './link/in-process.ts';
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-core.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: 3 passed; typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): link profiles per pathology row (+ Stage 7a stand-ins), transport-agnostic link core, in-process lockstep link

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 13: R27 link acceptance tests

**Files:**
- Create: `packages/ventilator/test/helpers.ts`, `packages/ventilator/test/link-r27.test.ts`

**Interfaces:**
- Consumes: `createLinkedSim`, `setCircuit`, `ventAlarms`.
- Produces (test helpers): `mean`, `num(ev, id, t0, t1)`, `truth(ev, stateVar, t0, t1)`, `co(sim)`, `run(sim, t)` (yields per sim-minute), `snap(sim, t0, t1)` → `{ co, map, cvp, spo2, sao2, etco2, autoPeep, vte, pip, plat }`, `fmt(o)`.

These tests assert behaviour the previous tasks already built; they are the R27 acceptance record. If one fails, do not loosen it — report the measured number (run with `PRINT=1`) and stop.

- [x] **Step 1: Write the helpers and the tests**

**Create `packages/ventilator/test/helpers.ts`:**

```ts
// Shared by the link tests: series from engine events, CO from the engine snapshot, and the CI rule's yielding run.
import type { EngineEvent, NumericId, StateVar } from '@pme/engine-core';
import { cardiacOutput } from '../../engine-core/src/l2/gas/coupling.ts';
import type { HemoState } from '../../engine-core/src/l2/hemo/pipeline.ts';
import type { LinkedSim } from '../src/index.ts';

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
export const num = (ev: EngineEvent[], id: NumericId, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'measurement' && x.t >= t0 && x.t <= t1 && x.values[id] && x.values[id]!.value !== null ? [x.values[id]!.value as number] : []));
export const truth = (ev: EngineEvent[], v: StateVar, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined ? [x.values[v] as number] : []));
export const co = (s: LinkedSim): number => cardiacOutput((s.engine.snapshot().state as { st: { hemo: HemoState } }).st.hemo, s.now());
/** Advance to t one sim-minute at a time, yielding between chunks (CI rule, G2). */
export async function run(s: LinkedSim, t: number): Promise<void> {
  while (s.now() < t - 1e-9) {
    s.advanceTo(Math.min(t, s.now() + 60));
    await new Promise<void>((r) => setImmediate(r));
  }
}
/** Numbers over a window (sim s), for assertions and the gate note. */
export function snap(s: LinkedSim, t0: number, t1: number) {
  const m = s.vs.p.measured;
  return {
    co: co(s), map: mean(num(s.events, 'abpMean', t0, t1)), cvp: mean(num(s.events, 'cvpMean', t0, t1)), spo2: mean(num(s.events, 'spo2', t0, t1)),
    sao2: mean(truth(s.events, 'spo2', t0, t1)), etco2: mean(num(s.events, 'etco2', t0, t1)),
    autoPeep: m.autoPEEP, vte: m.VTE, pip: m.PIP, plat: m.PLAT,
  };
}
export const fmt = (o: Record<string, number>): string => Object.entries(o).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ');
```

**Create `packages/ventilator/test/link-r27.test.ts`:**

```ts
// R27 two-way link, in process (lockstep): the ventilator's settings move SpO2, EtCO2, ABP and CVP through the
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`LINK ${tag}: ${fmt(o)}`); };

describe('R27 link — ventilator settings move the monitor', { timeout: 300_000 }, () => {
  it('PEEP 5 → 15 (normal): CO −5…−15 %, MAP falls > 8 mmHg, CVP rises 1.5–3.5 mmHg (Stage 3 coupling)', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 240);
    const a = snap(s, 200, 240);
    s.set({ peep: 15 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    log('peep5', a); log('peep15', b);
    expect(b.co / a.co).toBeLessThan(0.95);
    expect(b.co / a.co).toBeGreaterThan(0.85);
    expect(a.map - b.map).toBeGreaterThan(8);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(1.5);
    expect(b.cvp - a.cvp).toBeLessThanOrEqual(3.5);
  });

  it('FiO2 0.4 → 1.0 (ARDS moderate): SpO2 rises ≥ 4 points and settles within 3 min', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ fio2: 100 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    const mid = snap(s, 350, 360);
    log('fio2 40', a); log('fio2 100', b);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(4);
    expect(Math.abs(mid.spo2 - b.spo2)).toBeLessThanOrEqual(1);
  });

  it('RR 14 → 22 (VT 500): EtCO2 falls ≥ 2 mmHg in 2 min and keeps falling (Stage 3 kinetics: slow compartment)', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 300);
    const a = snap(s, 280, 300);
    s.set({ rate: 22 });
    await run(s, 420);
    const b = snap(s, 410, 420);
    await run(s, 900);
    const c = snap(s, 890, 900);
    log('rr14', a); log('rr22 +2min', b); log('rr22 +10min', c);
    expect(a.etco2 - b.etco2).toBeGreaterThanOrEqual(2);
    expect(c.etco2).toBeLessThan(b.etco2 - 1);
  });

  it('COPD GOLD 3–4 at RR 20 / VT 8 mL/kg: auto-PEEP > 8 cmH2O and MAP falls > 15 mmHg; RR 10 reverses it', async () => {
    const s = createLinkedSim({ profile: 'copd-gold-3-4', vent: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ rate: 20 });
    await run(s, 300);
    const b = snap(s, 270, 300);
    s.set({ rate: 10 });
    await run(s, 420);
    const c = snap(s, 390, 420);
    log('copd rr10', a); log('copd rr20', b); log('copd back', c);
    expect(b.autoPeep).toBeGreaterThan(8);
    expect(a.map - b.map).toBeGreaterThan(15);
    expect(c.map).toBeGreaterThan(b.map + 10);
  });

  it('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 15 });
    await run(s, 420);
    const b = snap(s, 400, 420);
    s.set({ peep: 5 });
    await run(s, 480);
    const c = snap(s, 470, 480);
    log('ards peep5', a); log('ards peep15', b); log('ards back', c);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(5);
    expect(b.co).toBeLessThan(a.co);
    expect(c.spo2).toBeLessThan(b.spo2 - 3);
  });

  it('cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls', async () => {
    const s = createLinkedSim({ profile: 'oedema-cardiogenic' });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 12 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    log('hf peep5', a); log('hf peep12', b);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    expect(b.co).toBeLessThan(0.97 * a.co);
  });

  it('disconnection: capnogram < 1 mmHg within 4 s, EtCO2 numeric 0 within 14 s (10 s peak window after the last breath), ventilator Disconnection alarm within one breath', async () => {
    const { ventAlarms, setCircuit } = await import('../src/index.ts');
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 120);
    setCircuit(s.vs, 'disconnected');
    let alarmAt = Infinity;
    for (let k = 1; k <= 750; k++) {
      s.advanceTo(120 + k * 0.02);
      if (alarmAt === Infinity && ventAlarms(s.vs).some((a) => a.id === 'disconnection')) alarmAt = s.now() - 120;
    }
    const co2 = new Float32Array(Math.round(11 * 62.5));
    s.engine.readSamples('co2', Math.round(124 * 62.5), co2);
    const { num } = await import('./helpers.ts');
    if (process.env.PRINT) console.log(`LINK disconnect: alarm +${alarmAt.toFixed(2)} s, co2 max 124–135 ${Math.max(...co2).toFixed(2)}, etco2 ${num(s.events, 'etco2', 131, 135).join(',')}`);
    expect(alarmAt).toBeLessThanOrEqual(60 / 14 + 0.5);
    expect(Math.max(...co2)).toBeLessThan(1);
    expect(Math.max(...num(s.events, 'etco2', 134, 135))).toBe(0);
  });
});
```

- [x] **Step 2: Run with the numbers printed**

Run: `PRINT=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-r27.test.ts`
Expected: 7 passed (≈ 50 s). Prototype lines:

```
LINK peep5: co 4.90 map 97.09 cvp 5.99 spo2 99.00 …   LINK peep15: co 4.44 map 83.62 cvp 8.14 …
LINK fio2 40: … spo2 89.00 …                            LINK fio2 100: … spo2 94.29 …
LINK rr14: … etco2 37.90   LINK rr22 +2min: … etco2 34.00   LINK rr22 +10min: … etco2 31.00
LINK copd rr10: co 4.80 map 93.74 cvp 6.38 … autoPeep 2.84   LINK copd rr20: co 4.03 map 73.89 cvp 8.64 … autoPeep 9.91   LINK copd back: map 93.64
LINK ards peep5: co 4.96 map 97.27 … spo2 91.00   LINK ards peep15: co 4.34 map 82.65 … spo2 98.00   LINK ards back: spo2 92.91
LINK hf peep5: co 4.95 map 97.27 … spo2 95.00   LINK hf peep12: co 4.50 map 85.44 … spo2 98.00
LINK disconnect: alarm +0.94 s, co2 max 124–135 0.00, etco2 37,37,0,0
```

Copy these lines into the gate note (Task 20).

- [x] **Step 3: Commit and push**

```bash
git add packages/ventilator/test
git commit -m "test(ventilator): R27 acceptance — PEEP, FiO2, RR, COPD auto-PEEP → hypotension, ARDS recruitment, HF oedema, disconnection

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 14: R36 demonstration tests

**Files:**
- Create: `packages/ventilator/test/link-r36.test.ts`

**Interfaces:**
- Consumes: `createLinkedSim`, `PROFILES`, `LUNG_PATHOLOGIES`, `STAND_INS`, `LinkedSim`; `run`, `snap`, `fmt` (Task 13).

The four R36 demonstrations (PH crisis under high PEEP + hypercapnia, tension pneumothorax, massive PE, fibrosis) plus a start-up check of every catalogue row as a link profile. Vascular events use `STAND_INS` (plan decision 8) until Stage 7a.

- [x] **Step 1: Write the tests**

**Create `packages/ventilator/test/link-r36.test.ts`:**

```ts
// R36 demonstrations through the in-process link: PH crisis, tension pneumothorax, massive PE, fibrosis.
// Vascular events use the profile/demo stand-ins (engine volumeStatus/shunt) until Stage 7a's right heart.
import { describe, expect, it } from 'vitest';
import { createLinkedSim, PROFILES, LUNG_PATHOLOGIES, STAND_INS, type LinkedSim } from '../src/index.ts';

const standIn = (s: LinkedSim, id: string) => { for (const x of STAND_INS[id] ?? []) s.send({ type: 'setTarget', variable: x.variable, value: x.value, ramp: { durationS: x.rampS } }); };
import { fmt, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`R36 ${tag}: ${fmt(o)}`); };

describe('R36 demonstrations', { timeout: 300_000 }, () => {
  it('every catalogue row is a link profile and starts cleanly (60 s, no rejected command)', async () => {
    expect(Object.keys(PROFILES)).toHaveLength(LUNG_PATHOLOGIES.length);
    for (const row of LUNG_PATHOLOGIES) {
      const s = createLinkedSim({ profile: row.id });
      await run(s, 60); // createLinkedSim throws on a rejected command
      expect(s.events.some((e) => e.type === 'breath')).toBe(true);
    }
  });

  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (RV signature waits for 7a)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 15, rate: 8 });
    await run(s, 420);
    const b = snap(s, 390, 420);
    log('ph before', a); log('ph crisis', b);
    expect(b.etco2 - a.etco2).toBeGreaterThanOrEqual(5);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(1.5);
    expect(a.map - b.map).toBeGreaterThanOrEqual(8);
  });

  it('tension pneumothorax: plateau rises ≥ 10 cmH2O, SpO2 falls ≥ 4, MAP falls ≥ 20 with CVP rising ≥ 5', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-simple', vent: { pmax: 60 } });
    await run(s, 120);
    const a = snap(s, 90, 120);
    s.set({ compliance: 18, resistance: 14 });
    standIn(s, 'pneumothorax-tension');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.3 });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('ptx simple', a); log('ptx tension', b);
    expect(b.plat - a.plat).toBeGreaterThanOrEqual(10);
    expect(a.spo2 - b.spo2).toBeGreaterThanOrEqual(4);
    expect(a.map - b.map).toBeGreaterThanOrEqual(20);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(5);
  });

  it('massive PE (stand-in): EtCO2 falls ≥ 4 mmHg with ventilation unchanged; airway pressures unchanged', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 120);
    const a = snap(s, 90, 120);
    standIn(s, 'pe-massive');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.12 });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('pe before', a); log('pe after', b);
    expect(a.etco2 - b.etco2).toBeGreaterThanOrEqual(4);
    expect(Math.abs(b.plat - a.plat)).toBeLessThan(0.5);
  });

  it('fibrosis: driving pressure ≥ 15 at VT 490; VT 350 × RR 20 lowers it below 13 at the same minute volume', async () => {
    const s = createLinkedSim({ profile: 'fibrosis-ild' });
    await run(s, 60);
    const dp1 = s.vs.p.measured.PLAT - s.vs.cfg.peep;
    s.set({ vt: 350, rate: 20 });
    await run(s, 120);
    const dp2 = s.vs.p.measured.PLAT - s.vs.cfg.peep;
    if (process.env.PRINT) console.log(`R36 fibrosis ΔP ${dp1.toFixed(1)} → ${dp2.toFixed(1)}`);
    expect(dp1).toBeGreaterThanOrEqual(15);
    expect(dp2).toBeLessThan(13);
  });
});
```

- [x] **Step 2: Run with the numbers printed**

Run: `PRINT=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-r36.test.ts`
Expected: 5 passed (≈ 60 s; the 39-profile start-up is ≈ 40 s). Prototype:

```
R36 ph before: co 4.96 map 97.30 cvp 5.99 … etco2 37.00       R36 ph crisis: co 4.47 map 85.26 cvp 7.88 … etco2 42.00
R36 ptx simple: map 97.13 cvp 5.99 spo2 98.00 … plat 18.16      R36 ptx tension: co 3.47 map 49.78 cvp 18.04 spo2 91.35 etco2 30.00 … plat 32.78
R36 pe before: co 4.87 map 97.13 … etco2 37.00 … plat 14.11     R36 pe after: co 3.60 map 54.69 cvp 14.98 … etco2 31.00 … plat 14.11
R36 fibrosis ΔP 16.7 → 11.7
```

- [x] **Step 3: Commit and push**

```bash
git add packages/ventilator/test
git commit -m "test(ventilator): R36 demonstrations — PH crisis, tension pneumothorax, massive PE, fibrosis; every catalogue row starts as a link profile

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 15: Linked determinism

**Files:**
- Create: `packages/ventilator/test/determinism.test.ts`

**Interfaces:** consumes `createLinkedSim`, `run`.

- [x] **Step 1: Write the test**

**Create `packages/ventilator/test/determinism.test.ts`:**

```ts
// Same seed + same script → identical ventilator trace and engine samples; another engine seed differs.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { run } from './helpers.ts';

async function hashRun(seed: number): Promise<string> {
  const s = createLinkedSim({ profile: 'ards-moderate', seed, vent: { vt: 420, pmax: 45 } });
  const h = createHash('sha256');
  const tick = () => h.update(Float64Array.of(s.vs.p.Paw, s.vs.p.Q, s.vs.p.V));
  for (let k = 1; k <= 3000; k++) {
    if (k === 1500) s.set({ peep: 12, fio2: 80 });
    s.advanceTo(k * 0.02);
    tick();
  }
  await run(s, 60);
  for (const ch of ['co2', 'abp', 'pleth'] as const) {
    const n = ch === 'co2' ? 60 * 62.5 : 60 * 125;
    const x = new Float32Array(n);
    s.engine.readSamples(ch, 0, x);
    h.update(x);
  }
  return h.digest('hex');
}

describe('linked determinism', { timeout: 120_000 }, () => {
  it('two runs with seed 42 hash identically; seed 43 differs', async () => {
    const a = await hashRun(42);
    expect(await hashRun(42)).toBe(a);
    expect(await hashRun(43)).not.toBe(a);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/determinism.test.ts`
Expected: 1 passed. (A failure means hidden state outside `VentState`/the engine snapshot — e.g. a module-level variable, `Math.random`, or `Date` — find and remove it.)

- [x] **Step 3: Commit and push**

```bash
git add packages/ventilator/test
git commit -m "test(ventilator): linked determinism — same seed and script hash identically across ventilator and engine samples

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 16: Window link — BroadcastChannel port, monitor side, ventilator driver

**Files:**
- Create: `packages/ventilator/src/link/port.ts`, `packages/ventilator/src/link/vent-driver.ts`, `packages/ventilator/test/ports.test.ts`
- Modify: `packages/ventilator/src/index.ts`

**Interfaces:**
- Consumes: `createLinkCore`, `linkTick`, `linkEvent`, `patchVent`, `LINK_TICK_S`, `PROFILES` (Task 12); `advanceVent`, `createVent`, `resetPhysics`, `setCircuit` (Task 3).
- Produces: `LinkMsg` (`cmds {tick, cmds}`, `lungState {ev}`, `clock {ventTick}`, `time {action, value?}`, `control {patch?, circuit?, profile?}`, all `v: 1`); `LinkPort { post, onMessage, close }`; `linkChannelName(session)` = `pme-vent/<session>`; `createBroadcastPort(session, Impl?)`; `createLocalPortPair()`; `MonitorLike { dispatch, on, pause?, resume?, setTimeScale? }` (a `MonitorHandle` or a `MonitorEngine` fits); `LEAD_TICKS = 5`; `MAX_AHEAD_TICKS = 75`; `attachMonitorToLink(mon, port, onRejected?)`; `VentDriver { vs, core, simT(), frame(nowMs), setProfile(id), paused, scale, onStep, onControl, dispose() }`; `createVentDriver(port | null, profile = 'normal', vs = createVent())`.

- [x] **Step 1: Write the failing test**

**Create `packages/ventilator/test/ports.test.ts`:**

```ts
// Window link plumbing without a browser: local port pair, BroadcastChannel port (fake channel), the monitor side
// stamping frames with engine ticks, and the ventilator following the engine's clock.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createBroadcastPort, createLocalPortPair, createVentDriver, LEAD_TICKS, MAX_AHEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

class FakeChannel {
  static all = new Map<string, Set<FakeChannel>>();
  onmessage: ((e: MessageEvent) => void) | null = null;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
    if (!FakeChannel.all.has(name)) FakeChannel.all.set(name, new Set());
    FakeChannel.all.get(name)!.add(this);
  }
  postMessage(d: unknown) {
    for (const c of FakeChannel.all.get(this.name)!) if (c !== this) c.onmessage?.({ data: structuredClone(d) } as MessageEvent);
  }
  close() { FakeChannel.all.get(this.name)!.delete(this); }
}

describe('link ports', () => {
  it('BroadcastChannel port: named pme-vent/<session>, never hears itself, drops foreign messages', () => {
    const Impl = FakeChannel as unknown as new (n: string) => BroadcastChannel;
    const a = createBroadcastPort('s1', Impl);
    const b = createBroadcastPort('s1', Impl);
    const got: LinkMsg[] = [];
    const mine: LinkMsg[] = [];
    b.onMessage((m) => got.push(m));
    a.onMessage((m) => mine.push(m));
    a.post({ v: 1, kind: 'time', action: 'pause' });
    new FakeChannel('pme-vent/s1').postMessage({ hello: 1 });
    expect(got).toEqual([{ v: 1, kind: 'time', action: 'pause' }]);
    expect(mine).toEqual([]);
    expect([...FakeChannel.all.keys()]).toEqual(['pme-vent/s1']);
    a.close();
    b.close();
  });

  it('monitor side: frames replay on their own engine ticks, lungState goes back, the ventilator never outruns the engine', async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const scheduled: number[] = [];
    const mon = {
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive') scheduled.push(r.tick);
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    };
    attachMonitorToLink(mon, monPort);
    const d = createVentDriver(ventPort, 'normal');
    // the ventilator gets 1 s of wall time in one frame (a stalled tab): it may only run to the first clock limit
    d.frame(0);
    d.frame(1000);
    expect(d.simT()).toBeLessThanOrEqual(2 * LEAD_TICKS * 0.02 + 1e-9);
    await Promise.resolve();
    // now drive both: engine at real time, ventilator frames 20 ms apart
    for (let i = 1; i <= 500; i++) {
      d.frame(1000 + i * 20);
      e.advanceTo(i * 0.02);
      await Promise.resolve();
    }
    const gaps = scheduled.slice(10).map((t, i, a) => (i ? t - (a[i - 1] as number) : 1));
    expect(Math.max(...gaps)).toBe(1); // one frame per engine tick, in order
    expect(d.simT() - e.now().simT).toBeLessThanOrEqual(MAX_AHEAD_TICKS * 0.02 + 0.1);
    expect(d.core.lung.ref).not.toBeNull(); // lungState arrived
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/ports.test.ts`
Expected: FAIL — `createBroadcastPort` is not exported.

- [x] **Step 3: Implement**

**Create `packages/ventilator/src/link/port.ts`:**

```ts
// The window link (R27 second transport): the ventilator in its own window/iframe, the monitor elsewhere in the
// same browser. A tiny versioned message set over a `LinkPort` — BroadcastChannel `pme-vent/<session>` across
// windows, or a local pair in one page. It deliberately does NOT go through the controller's HostSession (roles,
// auth, samples guard): the ventilator is a device on the host, not a controller.
//   vent → monitor: { kind: 'cmds' }      the linkTick commands of ventilator tick `tick` (frame, shunt, airway);
//                                         the monitor side stamps them `atTick` so bursts replay on their own ticks
//   monitor → vent: { kind: 'lungState' } every lungState event of the engine
//                   { kind: 'clock' }     the ventilator tick it may run up to: the ENGINE is the master clock, the
//                                         ventilator never runs more than MAX_AHEAD_TICKS ahead of the newest engine
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
//   either way:     { kind: 'time' }      pause / resume / scale, so both sides stay on one sim time base
//   page → vent:    { kind: 'control' }   settings patch, circuit, profile (the combined page's scripted demos)
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import type { LungStateEvent } from '../lung-input.ts';
import type { ProfileId } from './profiles.ts';

export type LinkMsg =
  | { v: 1; kind: 'cmds'; tick: number; cmds: Command[] }
  | { v: 1; kind: 'lungState'; ev: LungStateEvent }
  | { v: 1; kind: 'clock'; ventTick: number }
  | { v: 1; kind: 'time'; action: 'pause' | 'resume' | 'scale'; value?: number }
  | { v: 1; kind: 'control'; patch?: Partial<VentConfig>; circuit?: 'connected' | 'disconnected'; profile?: ProfileId };

export interface LinkPort {
  post(m: LinkMsg): void;
  onMessage(fn: (m: LinkMsg) => void): () => void;
  close(): void;
}

export const linkChannelName = (session: string): string => `pme-vent/${session}`;
const isMsg = (d: unknown): d is LinkMsg => typeof d === 'object' && d !== null && (d as { v?: unknown }).v === 1 && typeof (d as { kind?: unknown }).kind === 'string';

/** BroadcastChannel port (a channel never hears its own posts). `Impl` is injectable for tests. */
export function createBroadcastPort(session: string, Impl: new (name: string) => BroadcastChannel = BroadcastChannel): LinkPort {
  const ch = new Impl(linkChannelName(session));
  const fns = new Set<(m: LinkMsg) => void>();
  ch.onmessage = (e: MessageEvent) => {
    if (isMsg(e.data)) for (const fn of [...fns]) fn(e.data);
  };
  return {
    post: (m) => ch.postMessage(m),
    onMessage(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    close() {
      fns.clear();
      ch.close();
    },
  };
}

/** Two connected ports in one page (synchronous delivery). */
export function createLocalPortPair(): [LinkPort, LinkPort] {
  const mk = (): LinkPort & { peer?: Set<(m: LinkMsg) => void>; own: Set<(m: LinkMsg) => void> } => {
    const own = new Set<(m: LinkMsg) => void>();
    const p: LinkPort & { peer?: Set<(m: LinkMsg) => void>; own: Set<(m: LinkMsg) => void> } = {
      own,
      post: (m) => {
        for (const fn of [...(p.peer ?? [])]) fn(m);
      },
      onMessage(fn) {
        own.add(fn);
        return () => own.delete(fn);
      },
      close: () => own.clear(),
    };
    return p;
  };
  const a = mk();
  const b = mk();
  a.peer = b.own;
  b.peer = a.own;
  return [a, b];
}

/** What the monitor side needs of a MonitorHandle (@pme/renderer) or a MonitorEngine — structurally typed. */
export interface MonitorLike {
  dispatch(cmd: Command): Promise<DispatchResult> | DispatchResult;
  on(fn: (e: EngineEvent) => void): () => void;
  pause?(): void;
  resume?(): void;
  setTimeScale?(k: number): void;
}

/** Frames are scheduled this many engine ticks ahead of the first measured arrival (jitter of one rAF frame). */
export const LEAD_TICKS = 5;
/** The ventilator may run this far ahead of the newest engine event (events carry sim time; beats and 1 Hz state). */
export const MAX_AHEAD_TICKS = 75;

/**
 * Monitor side: dispatch the ventilator's commands on the engine tick that matches the ventilator tick (so a burst
 * of frames from one animation frame, or a ×10 time scale, replays at 50 Hz sim time), forward lungState, apply
 * time messages, and publish the engine's clock. The tick offset is learnt from the first (unstamped) dispatch
 * result — which is the engine's current tick + 1 — and only ever grows by the lateness the engine reports; a
 * ventilator restart (its tick goes backwards) relearns it. Returns a detach function.
 */
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): () => void {
  let offset: number | null = null;
  let learning = false;
  let lastTick = -1;
  let allowed = -Infinity;
  let engTick = 0;
  const publishClock = () => {
    if (offset === null) return;
    const allow = engTick - offset + MAX_AHEAD_TICKS;
    if (allow >= allowed + 2) {
      allowed = allow;
      port.post({ v: 1, kind: 'clock', ventTick: allow });
    }
  };
  const offPort = port.onMessage((m) => {
    if (m.kind === 'cmds') {
      if (m.tick < lastTick) {
        offset = null;
        allowed = -Infinity;
      }
      lastTick = m.tick;
      for (const c of m.cmds) {
        const at = offset === null ? undefined : m.tick + offset;
        const probe = offset === null && !learning;
        if (probe) learning = true;
        void Promise.resolve(mon.dispatch(at === undefined ? c : { ...c, atTick: at })).then((r) => {
          if (!r.accepted) onRejected(c, r.reason);
          else if (probe) {
            offset = r.tick - m.tick + LEAD_TICKS;
            learning = false;
            engTick = Math.max(engTick, r.tick - 1);
            publishClock();
          } else if (at !== undefined && r.tick > at) offset = (offset ?? 0) + r.tick - at;
        });
      }
    } else if (m.kind === 'time') {
      if (m.action === 'pause') mon.pause?.();
      else if (m.action === 'resume') mon.resume?.();
      else if (m.value !== undefined) mon.setTimeScale?.(m.value);
    }
  });
  const offEng = mon.on((e) => {
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (tk > engTick) {
      engTick = tk;
      publishClock();
    }
    if (e.type === 'lungState') port.post({ v: 1, kind: 'lungState', ev: e });
  });
  return () => {
    offPort();
    offEng();
  };
}
```

**Create `packages/ventilator/src/link/vent-driver.ts`:**

```ts
// Ventilator side of the window link: runs the ventilator on real time × scale, but never past the tick the
// monitor's `clock` messages allow (the engine is the master clock; before the first clock message it may run
// 2·LEAD_TICKS, enough to send the frame the monitor learns the offset from), posts each tick's commands, and applies lungState / time / control messages. Without a port
// (vent-hamilton.html alone) it free-runs.
// `frame(nowMs)` is called by the page's requestAnimationFrame loop (or by a test with a fake clock).
import { advanceVent, createVent, resetPhysics, setCircuit } from '../vent.ts';
import type { VentState } from '../types.ts';
import { createLinkCore, linkEvent, linkTick, patchVent, LINK_TICK_S, type LinkCore } from './core.ts';
import { LEAD_TICKS, type LinkPort } from './port.ts';
import { PROFILES, type ProfileId } from './profiles.ts';

export interface VentDriver {
  vs: VentState;
  core: LinkCore;
  /** Sim time of the ventilator (s). */
  simT(): number;
  frame(nowMs: number): void;
  setProfile(id: ProfileId): void;
  paused: boolean;
  scale: number;
  /** Called after every 5 ms step (the front end's 200 Hz sample buffers). */
  onStep: ((vs: VentState) => void) | undefined;
  /** Called after a `control` message changed settings (the front end redraws its knobs and sheets). */
  onControl: (() => void) | undefined;
  dispose(): void;
}

export function createVentDriver(port: LinkPort | null, profile: ProfileId = 'normal', vs: VentState = createVent()): VentDriver {
  const prof = (id: ProfileId) => PROFILES[id] ?? (PROFILES.normal as NonNullable<(typeof PROFILES)[string]>);
  let core = createLinkCore(vs, prof(profile));
  let k = Math.round(vs.p.t / LINK_TICK_S);
  let sim = k * LINK_TICK_S;
  let lastMs: number | null = null;
  let allowed = port ? k + 2 * LEAD_TICKS : Infinity;
  const d: VentDriver = {
    vs,
    get core() {
      return core;
    },
    simT: () => sim,
    paused: false,
    scale: 1,
    onStep: undefined,
    onControl: undefined,
    frame(nowMs: number) {
      const dt = lastMs === null ? 0 : Math.min(0.1, (nowMs - lastMs) / 1000); // v1.9: clamp long frames
      lastMs = nowMs;
      if (d.paused) return;
      sim = Math.min(sim + dt * d.scale, allowed * LINK_TICK_S);
      while ((k + 1) * LINK_TICK_S <= sim + 1e-9) {
        k++;
        advanceVent(vs, k * LINK_TICK_S, d.onStep);
        const cmds = linkTick(core, LINK_TICK_S);
        port?.post({ v: 1, kind: 'cmds', tick: k, cmds });
      }
    },
    setProfile(id: ProfileId) {
      core = createLinkCore(vs, prof(id));
      resetPhysics(vs);
    },
    dispose: () => off?.(),
  };
  const off = port?.onMessage((m) => {
    if (m.kind === 'lungState') linkEvent(core, m.ev);
    else if (m.kind === 'clock') allowed = Math.max(allowed, m.ventTick);
    else if (m.kind === 'time') {
      if (m.action === 'pause') d.paused = true;
      else if (m.action === 'resume') d.paused = false;
      else if (m.value !== undefined) d.scale = m.value;
    } else if (m.kind === 'control') {
      if (m.profile) d.setProfile(m.profile);
      if (m.patch) patchVent(core, m.patch);
      if (m.circuit) setCircuit(vs, m.circuit);
      d.onControl?.();
    }
  });
  return d;
}
```

Append to `packages/ventilator/src/index.ts`:

```ts
export * from './link/port.ts';
export * from './link/vent-driver.ts';
```

- [x] **Step 4: Run the whole package**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator test && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck && npx -y pnpm@9.15.9 --filter @pme/ventilator build`
Expected: **87 passed** (13 files); typecheck clean; build OK.

- [x] **Step 5: Commit and push**

```bash
git add packages/ventilator
git commit -m "feat(ventilator): window link over BroadcastChannel — engine-tick stamping, engine as master clock, ventilator driver

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 17: Demo — the Hamilton front end (`vent-hamilton.html`)

**Files:**
- Create: `apps/demo/vent-hamilton.html` (generated from the reference copy), `apps/demo/src/vent/hamilton-ui.ts`, `apps/demo/src/vent/hamilton-page.ts`, `apps/demo/e2e/vent-link.e2e.ts` (first test)
- Modify: `apps/demo/package.json` (one dependency), `apps/demo/vite.config.ts` (one input), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `@pme/ventilator` (everything the UI touches: `bannerText, clamp, HAMILTON_MODES, loadPreset, lungBaseOf, manualBreath, MODE_MAP, modeName, pbw, PRESETS, resetPhysics, runScenario, SCENARIOS, setMode, silenceAlarms, toggleHold, DT, createBroadcastPort, createVentDriver, PROFILES`, types).
- Produces: `mountHamiltonUi(d: VentDriver): { stop(): void }`; page `vent-hamilton.html[?link=<session>&profile=<id>]`; `window.__vent` (the `VentDriver`, e2e hook).

The markup and CSS are the original's, byte for byte (the page is generated from the reference copy, so there is nothing to retype and no drift); only the inline script is replaced by the TypeScript port. No logos exist in the original; its credit line stays.

- [x] **Step 1: Write the failing e2e test**

**Create `apps/demo/e2e/vent-link.e2e.ts`** (Task 18 appends the combined-page test):

```ts
// Stage V in a browser: the Hamilton ventilator alone (menus, knobs), then linked to the monitor in
// vent-link.html (BroadcastChannel, iframe): breaths reach the monitor, lungState reaches the ventilator,
// disconnection alarms on both sides, and the COPD demonstration lowers MAP.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/vent-link.e2e.ts
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
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

const errorsOf = (p: Page) => {
  const errs: string[] = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  return errs;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const last = (p: Page, k: string) => p.evaluate((key) => (window as Any).__link.last[key] as number | undefined, k);
const vent = <T>(p: Page, fn: string) => p.evaluate(`(${fn})(document.getElementById('vent').contentWindow.__vent)`) as Promise<T>;

test('vent-hamilton.html: breathes, Modes → PCV+ → Confirm, a knob turns PEEP', async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto(`${base}/vent-hamilton.html`);
  await page.waitForFunction(() => (window as Any).__vent?.vs.p.breathCount >= 2, null, { timeout: 15_000 });
  await page.click('#modesBtn');
  await page.getByRole('button', { name: 'PCV+', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('#mnMain')).toHaveText('PCV+');
  const peep = page.locator('.dial[data-key="peep"]');
  await peep.hover();
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  expect(await page.evaluate(() => (window as Any).__vent.vs.cfg.peep)).toBe(7);
  expect(errs).toEqual([]);
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/vent-link.e2e.ts`
Expected: FAIL — 404 / `__vent` never defined.

- [x] **Step 3: Wire the package into the demo app**

In `apps/demo/package.json` replace `"@pme/skins": "workspace:*"` with:

```json
    "@pme/skins": "workspace:*",
    "@pme/ventilator": "workspace:*"
```

In `apps/demo/vite.config.ts`, after `'stage6b-acls': page('stage6b-acls'),` add:

```ts
        'vent-hamilton': page('vent-hamilton'), // Stage V
```

Run `npx -y pnpm@9.15.9 install` (updates `pnpm-lock.yaml`).

- [x] **Step 4: Generate the page from the reference copy**

```bash
node -e "
const fs=require('fs');const src=fs.readFileSync('packages/ventilator/reference/ventilator-sim-hamilton.v1.9.html','utf8');
const head=src.slice(0,src.indexOf('<script>')).replace('<title>Ventilator Monitor — Navy Cockpit</title>','<title>Ventilator — navy cockpit (PME Stage V)</title>');
fs.writeFileSync('apps/demo/vent-hamilton.html',head+'<script type=\"module\" src=\"./src/vent/hamilton-page.ts\"></script>\n</body>\n</html>\n');"
grep -c "<style>" apps/demo/vent-hamilton.html   # 1
tail -3 apps/demo/vent-hamilton.html             # the module script, </body>, </html>
```

- [x] **Step 5: Port the UI**

**Create `apps/demo/src/vent/hamilton-ui.ts`** (the v1.9 UI block rendering from the TS engine; deviations listed in its header comment):

```ts
// The v1.9 Hamilton-style front end (ventilator-sim-hamilton.html "UI" block), ported to TypeScript and
// rendering from @pme/ventilator instead of page globals. Markup and CSS are the original's (vent-hamilton.html).
// Deviations from v1.9, all forced by the live patient behind the ventilator: Freeze freezes the DISPLAY only
// (the physics keeps running, as on a real ventilator); holds run on sim time (v1.9 ran 2 steps per frame);
// the sample buffers are filled here from the driver's steps.
import {
  bannerText, clamp, HAMILTON_MODES, loadPreset, manualBreath, MODE_MAP, modeName, pbw, PRESETS, resetPhysics, runScenario,
  SCENARIOS, lungBaseOf, setMode, silenceAlarms, toggleHold, DT, type PresetId, type VentConfig, type VentDriver, type VentMode,
} from '@pme/ventilator';

type Num = keyof { [K in keyof VentConfig as VentConfig[K] extends number ? K : never]: 1 };
type Bool = keyof { [K in keyof VentConfig as VentConfig[K] extends boolean ? K : never]: 1 };
const $ = (id: string) => document.getElementById(id) as HTMLElement;
function el(t: string, a: Record<string, string | number> = {}, ...k: Array<Node | string | null>): HTMLElement {
  const e = document.createElement(t);
  for (const n in a) {
    if (n === 'class') e.className = String(a[n]);
    else if (n === 'html') e.innerHTML = String(a[n]);
    else e.setAttribute(n, String(a[n]));
  }
  k.forEach((c) => c != null && e.append(c));
  return e;
}
const cssv = (v: string) => getComputedStyle(document.body).getPropertyValue(v).trim();

export function mountHamiltonUi(d: VentDriver): { stop(): void } {
  const vs = d.vs;
  const S = vs.cfg;
  const P = vs.p;
  const num = S as unknown as Record<Num, number>;
  const bool = S as unknown as Record<Bool, boolean>;
  const BUF = { p: [] as number[], f: [] as number[], v: [] as number[], t: [] as number[] };
  let frozen = false;
  let numsDirty = true;
  let lastNumT = 0;
  let viewMode: 'graphics' | 'cockpit' = 'graphics';
  let cockpitPaw: HTMLCanvasElement | null = null;
  let lungCanvas: HTMLCanvasElement | null = null;
  let pendingMode: string | null = null;
  let sheetTab: 'basic' | 'more' | 'apnea' = 'basic';
  const M = () => P.shown ?? P.measured;
  /** The drawer edits the patient's lung: it becomes the lungState base (link/core.ts patchVent). */
  const syncBase = () => { d.core.lung.base = lungBaseOf(S); };
  const isSpontMode = () => S.mode === 'PSV' || S.mode === 'PAV';
  const vcTi = () => S.vt / 1000 / Math.max(0.05, S.vcFlow / 60);

  // ---- header ----
  function syncHeader() {
    $('mnMain').textContent = modeName(S);
    const b = bannerText(vs);
    const a = $('alarmBanner');
    a.className = b.cls;
    a.textContent = b.cls === 'silenced' ? `🔕 ${b.text}` : b.text;
  }
  // ---- numeric monitoring ----
  function buildNums() {
    const wrap = $('nums');
    const m = M();
    const tiles: Array<[string, string, string | number, boolean, string?]> = [
      ['RR', '/min', Math.round(m.RR), m.RR > 35, 'fTotal'],
      ['VTE', 'ml', Math.round(m.VTE), false],
      ['Ppeak', 'cmH₂O', Math.round(m.PIP), m.PIP > 35],
      ['MVe', 'l/min', m.MV.toFixed(1), m.MV > 12, 'ExpMinVol'],
      ['Pmean', 'cmH₂O', Math.round(m.Pmean), false],
    ];
    if (isSpontMode() && S.showP01) tiles.push(['P0.1', 'cmH₂O', m.P01.toFixed(1), m.P01 > 3.5]);
    wrap.innerHTML = '';
    tiles.forEach(([lab, u, val, warn, alt]) =>
      wrap.append(el('div', { class: 'num' + (warn ? ' warn' : '') }, el('div', { class: 'v' }, '' + val), el('div', { class: 'l', html: `${alt ?? lab} <span class="u">${u}</span>` }))),
    );
  }
  // ---- waveforms ----
  const LANES = [
    { key: 'p' as const, unit: 'Paw  cmH₂O', color: '--paw' },
    { key: 'f' as const, unit: 'Flow  l/min', color: '--flow' },
    { key: 'v' as const, unit: 'Volume  ml', color: '--vol' },
  ];
  const canvases: Partial<Record<'p' | 'f' | 'v', HTMLCanvasElement>> = {};
  function buildWaves() {
    const w = $('waves');
    w.innerHTML = '';
    LANES.forEach((l) => {
      const wv = el('div', { class: 'wv' });
      const cv = el('canvas') as HTMLCanvasElement;
      wv.append(cv);
      w.append(wv);
      canvases[l.key] = cv;
    });
    sizeCanvases();
  }
  function sizeOne(cv: HTMLCanvasElement | null | undefined) {
    if (!cv) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.clientWidth * DPR;
    cv.height = cv.clientHeight * DPR;
    cv.getContext('2d')?.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function sizeCanvases() {
    LANES.forEach((l) => sizeOne(canvases[l.key]));
    sizeOne(cockpitPaw);
    sizeOne(lungCanvas);
  }
  window.addEventListener('resize', sizeCanvases);
  function buildCockpit() {
    const c = $('cockpit');
    c.innerHTML = '';
    const paw = el('div', { class: 'cpaw' });
    cockpitPaw = el('canvas') as HTMLCanvasElement;
    paw.append(cockpitPaw);
    const low = el('div', { class: 'clow' });
    const lw = el('div', { id: 'lungWrap' });
    lungCanvas = el('canvas') as HTMLCanvasElement;
    lw.append(lungCanvas);
    const panels = el('div', { class: 'panels' });
    ['Oxygenation', 'CO₂ Elimination', 'Spont / Activity'].forEach((t) => {
      const p = el('div', { class: 'ipanel' });
      p.append(el('div', { class: 'pt' }, t), el('div', { class: 'bars' }));
      panels.append(p);
    });
    low.append(lw, panels);
    c.append(paw, low);
    sizeCanvases();
    updatePanels();
  }
  function updatePanels() {
    const m = M();
    const rsb = m.VTE > 10 ? m.RR / (m.VTE / 1000) : 0;
    const last = P.markers.slice(-8);
    const fspont = last.length ? Math.round((last.filter((k) => k.type === 'pt').length / Math.min(8, P.markers.length)) * 100) : 0;
    const defs: Array<Array<[string, number, number, number, string]>> = [
      [['Oxygen', S.fio2, 21, 100, '#46c9e0'], ['PEEP', S.peep, 0, 20, '#46c9e0']],
      [['MinVol', +m.MV.toFixed(1), 0, 20, '#40d47f'], ['Ppeak', Math.round(m.PIP), 0, 45, '#40d47f']],
      [['RSB', Math.round(rsb), 0, 150, '#ffd21e'], ['%Spont', fspont, 0, 100, '#ffd21e']],
    ];
    document.querySelectorAll('#cockpit .ipanel').forEach((p, i) => {
      const row = defs[i];
      if (!row) return;
      const bars = p.querySelector('.bars') as HTMLElement;
      bars.innerHTML = '';
      row.forEach(([nm, val, mn, mx, col]) => {
        const h = clamp((val - mn) / (mx - mn || 1), 0, 1) * 100;
        bars.append(el('div', { class: 'ibar' }, el('div', { class: 'val' }, '' + val), el('div', { class: 'fill', style: `height:${h}%;background:${col}` }), el('div', { class: 'nm' }, nm)));
      });
    });
  }
  function drawLung(cv: HTMLCanvasElement | null) {
    if (!cv) return;
    const cx = cv.getContext('2d') as CanvasRenderingContext2D;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    cx.clearRect(0, 0, W, H);
    const infl = clamp(P.V / Math.max(500, pbw(S) * 9), 0, 1);
    const comp = clamp(S.compliance / 55, 0.5, 1.15);
    const airwayW = clamp(13 - S.resistance * 0.22, 3.5, 13);
    const good = S.compliance >= 35 && S.resistance <= 15;
    const warn = S.compliance >= 24 && S.resistance <= 26;
    const border = good ? '#40d47f' : warn ? '#ffd21e' : '#e0625d';
    const cxm = W / 2, topY = H * 0.1, lobeTop = H * 0.26, lobeH = H * 0.48 * (0.62 + 0.38 * infl), lobeW = W * 0.17 * comp;
    cx.strokeStyle = '#a9c8ea'; cx.lineWidth = airwayW; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(cxm, topY); cx.lineTo(cxm, lobeTop); cx.stroke();
    cx.lineWidth = Math.max(2, airwayW * 0.6);
    cx.beginPath(); cx.moveTo(cxm, lobeTop); cx.lineTo(cxm - lobeW * 0.5, lobeTop + lobeH * 0.16); cx.moveTo(cxm, lobeTop); cx.lineTo(cxm + lobeW * 0.5, lobeTop + lobeH * 0.16); cx.stroke();
    const lobe = (dir: number) => {
      const bt = lobeTop + lobeH * 0.1, bb = lobeTop + lobeH, bx = cxm + dir * lobeW * 0.6;
      const g = cx.createLinearGradient(0, bt, 0, bb);
      g.addColorStop(0, 'rgba(120,185,235,.92)'); g.addColorStop(1, 'rgba(40,105,170,.85)');
      cx.beginPath(); cx.moveTo(cxm + dir * airwayW * 0.4, bt);
      cx.quadraticCurveTo(bx + dir * lobeW, bt, bx + dir * lobeW * 1.05, (bt + bb) / 2);
      cx.quadraticCurveTo(bx + dir * lobeW * 0.85, bb, cxm + dir * lobeW * 0.18, bb - 2);
      cx.quadraticCurveTo(cxm + dir * airwayW * 0.3, (bt + bb) / 2, cxm + dir * airwayW * 0.4, bt);
      cx.closePath(); cx.fillStyle = g; cx.fill(); cx.strokeStyle = border; cx.lineWidth = 2.5; cx.lineJoin = 'round'; cx.stroke();
    };
    lobe(-1); lobe(1);
    const dy = lobeTop + lobeH + 5;
    cx.strokeStyle = '#4a6a92'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(cxm - lobeW * 1.5, dy - 6 * (1 - infl)); cx.quadraticCurveTo(cxm, dy + 6 * infl, cxm + lobeW * 1.5, dy - 6 * (1 - infl)); cx.stroke();
    if (P.lastPtT !== null && P.t - P.lastPtT < 0.4) {
      cx.fillStyle = '#ff6b6b'; cx.beginPath(); cx.arc(cxm, topY - 1, 3.5 + 2.5 * Math.abs(Math.sin(P.t * 26)), 0, 7); cx.fill();
    }
    const m = M();
    const cst = m.PLAT > S.peep + 0.5 ? m.VTE / (m.PLAT - S.peep) : S.compliance;
    cx.textAlign = 'center'; cx.fillStyle = '#cfe0ff'; cx.font = '700 11px ' + cssv('--font');
    cx.fillText('Dynamic Lung', cxm, H - 28);
    cx.fillStyle = border; cx.font = '10px ' + cssv('--mono');
    cx.fillText(`Cstat ${cst > 0 ? cst.toFixed(0) : '--'}   Raw ${S.resistance}   VT ${Math.round(m.VTE)}`, cxm, H - 13);
  }
  function niceTicks(mn: number, mx: number, n: number) {
    const span = mx - mn;
    let step = Math.pow(10, Math.floor(Math.log10(span / n)));
    const e = span / n / step;
    if (e > 5) step *= 10; else if (e > 2) step *= 5; else if (e > 1) step *= 2;
    const t: number[] = [];
    for (let v = Math.ceil(mn / step) * step; v <= mx + 1e-6; v += step) t.push(v);
    return t;
  }
  function drawLaneOn(cv: HTMLCanvasElement | null | undefined, lane: (typeof LANES)[number]) {
    if (!cv) return;
    const cx = cv.getContext('2d') as CanvasRenderingContext2D;
    const W = cv.clientWidth, H = cv.clientHeight;
    cx.clearRect(0, 0, W, H);
    const mL = 34, mR = 6, mT = 12, mB = 13, plotW = W - mL - mR, plotH = H - mT - mB, n = BUF.t.length, sweep = S.sweepSec, arr = BUF[lane.key];
    let mn: number, mx: number;
    if (lane.key === 'p') { mn = -10; let hi = 30; for (let i = 0; i < n; i++) hi = Math.max(hi, arr[i] as number); mx = Math.max(30, Math.ceil(hi / 5) * 5); }
    else if (lane.key === 'f') { let Mx = 40; for (let i = 0; i < n; i++) Mx = Math.max(Mx, Math.abs(arr[i] as number)); Mx = Math.ceil(Mx / 10) * 10; mn = -Mx; mx = Mx; }
    else { mn = 0; let hi = 100; for (let i = 0; i < n; i++) hi = Math.max(hi, arr[i] as number); mx = Math.max(100, Math.ceil(hi / 50) * 50 + 50); }
    const span = mx - mn || 1;
    const xOf = (t: number) => mL + ((((t % sweep) + sweep) % sweep) / sweep) * plotW;
    const yOf = (v: number) => mT + plotH - ((v - mn) / span) * plotH;
    cx.font = '9px ' + cssv('--font'); cx.textBaseline = 'middle'; cx.strokeStyle = cssv('--grid'); cx.lineWidth = 1;
    niceTicks(mn, mx, 4).forEach((v) => {
      const y = yOf(v);
      cx.beginPath(); cx.moveTo(mL, y); cx.lineTo(W - mR, y); cx.stroke();
      if (y > mT + 10) { cx.fillStyle = cssv('--dim'); cx.textAlign = 'right'; cx.fillText(Math.abs(v) < 1 ? '0' : '' + Math.round(v), mL - 3, y); }
    });
    cx.textAlign = 'center'; cx.textBaseline = 'top';
    for (let s = 0; s <= sweep; s += 2) {
      const x = mL + (s / sweep) * plotW;
      cx.strokeStyle = cssv('--grid'); cx.beginPath(); cx.moveTo(x, mT); cx.lineTo(x, mT + plotH); cx.stroke();
      cx.fillStyle = cssv('--dim'); cx.fillText('' + s, x, mT + plotH + 2);
    }
    cx.textAlign = 'left'; cx.fillStyle = cssv('--numlab'); cx.font = '9px ' + cssv('--font'); cx.fillText(lane.unit, 2, 2);
    if (lane.key === 'p') { cx.strokeStyle = cssv('--redline'); cx.setLineDash([5, 3]); const yh = yOf(Math.min(mx, S.pmax)); cx.beginPath(); cx.moveTo(mL, yh); cx.lineTo(W - mR, yh); cx.stroke(); cx.setLineDash([]); }
    if (lane.key === 'f') { cx.strokeStyle = cssv('--zero'); cx.setLineDash([3, 3]); const yz = yOf(0); cx.beginPath(); cx.moveTo(mL, yz); cx.lineTo(W - mR, yz); cx.stroke(); cx.setLineDash([]); }
    cx.save(); cx.beginPath(); cx.rect(mL, mT, plotW, plotH); cx.clip();
    if (n >= 2) {
      const tEnd = BUF.t[n - 1] as number, xc = xOf(tEnd), gap = Math.max(7, plotW * 0.02), win = 2;
      const pts: Array<{ x: number; y: number; wrap: boolean }> = [];
      let px: number | null = null;
      for (let i = 0; i < n; i++) {
        const t = BUF.t[i] as number;
        if (tEnd - t >= sweep) continue;
        let s = 0, c = 0;
        for (let k = -win; k <= win; k++) { const j = i + k; if (j >= 0 && j < n) { s += arr[j] as number; c++; } }
        pts.push({ x: xOf(t), y: yOf(s / c), wrap: px != null && xOf(t) < px - plotW * 0.5 });
        px = xOf(t);
      }
      cx.strokeStyle = cssv(lane.color); cx.lineWidth = 1.8; cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.beginPath();
      let started = false;
      let prev: { x: number; y: number } | null = null;
      for (const p of pts) {
        if (!started || p.wrap || !prev) { cx.moveTo(p.x, p.y); started = true; prev = p; continue; }
        cx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
        prev = p;
      }
      if (prev && started) cx.lineTo(prev.x, prev.y);
      cx.stroke();
      cx.fillStyle = '#061530';
      if (xc + gap <= W - mR) cx.fillRect(xc, mT, gap, plotH);
      else { cx.fillRect(xc, mT, W - mR - xc, plotH); cx.fillRect(mL, mT, xc + gap - (W - mR), plotH); }
      if (frozen || vs.hold) { cx.strokeStyle = cssv('--dim'); cx.setLineDash([4, 4]); cx.beginPath(); cx.moveTo(xc, mT); cx.lineTo(xc, mT + plotH); cx.stroke(); cx.setLineDash([]); }
      if (lane.key === 'p') {
        P.markers.forEach((mk) => {
          if (tEnd - mk.t >= sweep || mk.type !== 'pt') return;
          const x = xOf(mk.t);
          cx.fillStyle = cssv('--redline'); cx.beginPath(); cx.moveTo(x, mT + plotH - 7); cx.lineTo(x - 4, mT + plotH); cx.lineTo(x + 4, mT + plotH); cx.closePath(); cx.fill();
        });
      }
    }
    cx.restore();
  }
  // ---- round setting buttons (right rail) ----
  const HKNOBS: Record<VentMode, Array<[Num, string, string]>> = {
    VC: [['vt', 'VT', 'ml'], ['rate', 'Rate', 'b/min'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PC: [['pc', 'Pinsp', 'cmH₂O'], ['rate', 'Rate', 'b/min'], ['itime', 'Ti', 's'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PRVC: [['prvcTarget', 'VT', 'ml'], ['rate', 'Rate', 'b/min'], ['itime', 'Ti', 's'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PSV: [['ps', 'Psupp', 'cmH₂O'], ['peep', 'PEEP', 'cmH₂O'], ['cycleOff', 'ETS', '%'], ['fio2', 'Oxygen', '%']],
    PAV: [['pavAssist', '%Supp', '%'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
  };
  const KRANGE: Partial<Record<Num, [number, number, number]>> = { peep: [0, 20, 1], vt: [150, 800, 10], vcFlow: [10, 120, 1], rate: [4, 40, 1], pause: [0, 0.6, 0.05], fio2: [21, 100, 1], pc: [5, 40, 1], itime: [0.3, 2.5, 0.05], riseTime: [0.02, 0.6, 0.01], prvcTarget: [150, 800, 10], pmax: [15, 60, 1], ps: [0, 40, 1], cycleOff: [5, 70, 1], pavAssist: [10, 90, 5] };
  function buildRail() {
    const rail = $('rail');
    rail.innerHTML = '';
    HKNOBS[S.mode].forEach(([key, lab, u]) => {
      const [min, max, step] = KRANGE[key] ?? [0, 100, 1];
      const dl = el('div', { class: 'dial', 'data-key': key });
      const dv = el('div', { class: 'dv' }, '');
      dl.append(dv, el('div', { class: 'du' }, u), el('div', { class: 'dl' }, lab));
      const show = () => (dv.textContent = step < 1 ? (+num[key]).toFixed(step < 0.1 ? 2 : 1) : '' + num[key]);
      const change = (v: number) => { num[key] = clamp(Math.round(v / step) * step, min, max); show(); numsDirty = true; };
      show();
      let dg = false, sy = 0, sv = 0;
      dl.onpointerdown = (e) => { dg = true; sy = e.clientY; sv = num[key]; try { dl.setPointerCapture(e.pointerId); } catch { /* synthetic events */ } dl.classList.add('turning'); e.preventDefault(); };
      dl.onpointermove = (e) => { if (dg) change(sv + Math.round((sy - e.clientY) / 4) * step); };
      const end = () => { dg = false; dl.classList.remove('turning'); };
      dl.onpointerup = end; dl.onpointercancel = end;
      dl.onwheel = (e) => { e.preventDefault(); change(num[key] + (e.deltaY < 0 ? step : -step)); };
      dl.ondblclick = () => openSheet('controls');
      rail.append(dl);
    });
    const ctrl = el('div', { class: 'railbtn' }, 'Controls'); ctrl.onclick = () => openSheet('controls');
    const alarms = el('div', { class: 'railbtn' }, 'Alarms'); alarms.onclick = () => openSheet('alarms');
    rail.append(ctrl, alarms);
    const mini = el('div', { class: 'railmini' });
    const mk = (t: string, fn: () => void, on = false) => { const b = el('div', { class: 'railbtn' + (on ? ' on' : '') }, t); b.onclick = fn; return b; };
    mini.append(
      mk(frozen ? 'Resume' : 'Freeze', () => { frozen = !frozen; buildRail(); }, frozen),
      mk('Insp hold', () => { toggleHold(vs, 'insp'); buildRail(); }, vs.hold === 'insp'),
      mk('Exp hold', () => { toggleHold(vs, 'exp'); buildRail(); }, vs.hold === 'exp'),
      mk('Patient', () => openDrawer()),
      mk('Man. breath', () => manualBreath(vs)),
      mk('Reset', () => { resetPhysics(vs); clearBuf(); }),
    );
    rail.append(mini);
  }
  // ---- settings sheet ----
  function sld(key: Num, label: string, min: number, max: number, step: number, unit: string, fmt?: (v: number) => string, after?: () => void) {
    const f = el('div', { class: 'fld' });
    const lab = el('div', { class: 'lab' });
    lab.append(el('span', {}, label), el('span', { class: 'u' }));
    const inp = el('input', { type: 'range', min, max, step, value: num[key] }) as HTMLInputElement;
    inp.dataset.key = key;
    const upd = () => ((lab.querySelector('.u') as HTMLElement).textContent = (fmt ? fmt(num[key]) : num[key]) + (unit ? ' ' + unit : ''));
    inp.oninput = () => { num[key] = parseFloat(inp.value); upd(); after?.(); numsDirty = true; buildRail(); };
    f.append(lab, inp);
    upd();
    return f;
  }
  function numFld(key: Num, label: string) {
    const f = el('div', { class: 'fld' });
    f.append(el('div', { class: 'lab' }, el('span', {}, label)));
    const inp = el('input', { type: 'number', value: num[key] }) as HTMLInputElement;
    inp.oninput = () => { const v = parseFloat(inp.value); if (!Number.isNaN(v)) { num[key] = v; numsDirty = true; buildRail(); } };
    f.append(inp);
    return f;
  }
  function seg<K extends 'flowPattern' | 'trigType'>(key: K, label: string, opts: Array<[VentConfig[K], string]>) {
    const f = el('div', { class: 'fld' });
    if (label) f.append(el('div', { class: 'lab' }, el('span', {}, label)));
    const g = el('div', { class: 'seg2' });
    opts.forEach(([v, t]) => {
      const b = el('button', {}, t);
      if (S[key] === v) b.classList.add('on');
      b.onclick = () => { S[key] = v; [...g.children].forEach((c) => c.classList.remove('on')); b.classList.add('on'); buildRail(); };
      g.append(b);
    });
    f.append(g);
    return f;
  }
  function sheetTog(key: Bool, label: string, after?: () => void) {
    const f = el('div', { class: 'fld' });
    const w = el('label', { class: 'en', style: 'font-size:13px;color:var(--ink);gap:8px' });
    const c = el('input', { type: 'checkbox' }) as HTMLInputElement;
    c.checked = bool[key];
    c.onchange = () => { bool[key] = c.checked; after?.(); buildRail(); };
    w.append(c, label);
    f.append(w);
    return f;
  }
  function ieHelper() {
    const Ti = vcTi(), period = 60 / Math.max(4, S.rate), te = Math.max(0.05, period - Ti - S.pause);
    return el('div', { class: 'helper', id: 'ieh' }, `Ti ${Ti.toFixed(2)}s · I:E 1:${(te / Ti).toFixed(1)}`);
  }
  function buildSheet(which: 'modes' | 'controls' | 'alarms') {
    $('sheetTitle').textContent = { modes: 'Modes', controls: 'Controls', alarms: 'Alarms' }[which];
    const b = $('sheetBody');
    b.innerHTML = '';
    if (which === 'modes') return buildModes(b);
    if (which === 'alarms') return buildAlarms(b);
    const tabs = el('div', { class: 'sheettabs' });
    ([['basic', 'Basic'], ['more', 'More'], ['apnea', 'Apnea']] as const).forEach(([k, t]) => {
      const bt = el('button', { class: 'stab' + (sheetTab === k ? ' on' : '') }, t);
      bt.onclick = () => { sheetTab = k; buildSheet('controls'); };
      tabs.append(bt);
    });
    b.append(tabs);
    const g = el('div', { class: 'sheetgrid' });
    if (sheetTab === 'basic') buildBasic(g); else if (sheetTab === 'more') buildMore(g); else buildApnea(g);
    b.append(g);
  }
  function buildModes(b: HTMLElement) {
    b.append(el('div', { class: 'helper' }, 'Select a mode, then Confirm. (All modes drive the same single-compartment lung model — the point is navigating the menu.)'));
    pendingMode ??= modeName(S);
    HAMILTON_MODES.forEach(([grp, list]) => {
      b.append(el('div', { class: 'modegrp' }, grp));
      const row = el('div', { class: 'moderow' });
      list.forEach(([nm]) => {
        const bt = el('button', { class: 'modebtn' + (pendingMode === nm ? ' on' : '') }, nm);
        bt.onclick = () => { pendingMode = nm; buildSheet('modes'); };
        row.append(bt);
      });
      b.append(row);
    });
    const foot = el('div', { class: 'modefoot' });
    const cancel = el('button', { class: 'railbtn' }, 'Cancel');
    cancel.onclick = () => { pendingMode = null; closeSheet(); };
    const confirm = el('button', { class: 'railbtn on' }, 'Confirm');
    confirm.onclick = () => { const nm = pendingMode ?? '(S)CMV+'; setMode(vs, MODE_MAP[nm] ?? 'VC'); S.modeLabel = nm; pendingMode = null; syncAll(); closeSheet(); };
    foot.append(cancel, confirm);
    b.append(foot);
  }
  function buildBasic(g: HTMLElement) {
    g.append(sld('peep', 'PEEP / CPAP', 0, 20, 1, 'cmH₂O'));
    if (S.mode === 'VC') {
      g.append(numFld('vt', 'Tidal Volume (ml)'));
      const fl = el('div');
      fl.append(sld('vcFlow', 'Flow', 10, 120, 1, 'l/min', undefined, () => document.getElementById('ieh')?.replaceWith(ieHelper())), ieHelper());
      g.append(fl, sld('rate', 'Rate', 4, 40, 1, 'b/min'));
    } else if (S.mode === 'PC') g.append(sld('pc', 'Pcontrol (Pinsp)', 5, 40, 1, 'cmH₂O'), sld('rate', 'Rate', 4, 40, 1, 'b/min'), sld('itime', 'Ti', 0.3, 2.5, 0.05, 's', (v) => v.toFixed(2)));
    else if (S.mode === 'PRVC') g.append(sld('prvcTarget', 'Target VT', 150, 800, 10, 'ml'), sld('rate', 'Rate', 4, 40, 1, 'b/min'), sld('itime', 'Ti', 0.3, 2.5, 0.05, 's', (v) => v.toFixed(2)));
    else if (S.mode === 'PSV') g.append(sld('ps', 'Psupport', 0, 40, 1, 'cmH₂O'), sld('cycleOff', 'ETS (exp. trigger)', 5, 70, 1, '%'));
    else g.append(sld('pavAssist', '% Support', 10, 90, 5, '%'));
    g.append(sld('fio2', 'Oxygen', 21, 100, 1, '%'));
  }
  function buildMore(g: HTMLElement) {
    g.append(sld('riseTime', 'Pramp (rise time)', 0.02, 0.6, 0.01, 's', (v) => v.toFixed(2)));
    if (S.mode === 'VC') g.append(seg('flowPattern', 'Flow Pattern', [['square', 'Constant'], ['decel', 'Decel']]), sld('pause', 'Insp. Pause', 0, 0.6, 0.05, 's', (v) => v.toFixed(2)));
    if (S.mode === 'PRVC') g.append(sld('pmax', 'Pmax', 15, 60, 1, 'cmH₂O'));
    g.append(seg('trigType', 'Trigger type', [['pressure', 'P-trig'], ['flow', 'Flowtrigger']]));
    g.append(sld('flowTrig', 'Trigger sens.', 0.3, 10, 0.1, 'l/min', (v) => v.toFixed(1)));
    g.append(sheetTog('sigh', 'Sigh (a deep breath every ~50 breaths)'));
    g.append(sheetTog('trc', 'TRC — Tube Resistance Compensation', () => buildSheet('controls')));
    if (S.trc) g.append(sld('trcPct', 'TRC compensation', 0, 100, 5, '%'));
  }
  function buildApnea(g: HTMLElement) {
    g.append(el('div', { class: 'helper', style: 'grid-column:1/-1' }, 'Apnea backup takes over if no breath is detected within the apnea time (available in spontaneous modes).'));
    g.append(sheetTog('backup', 'Apnea backup ventilation'), sld('apneaTime', 'Apnea time', 10, 60, 1, 's'), sld('backupRate', 'Backup rate', 6, 30, 1, 'b/min'));
  }
  function buildAlarms(b: HTMLElement) {
    b.append(el('div', { class: 'helper' }, 'Set alarm limits — crossing one raises the banner alarm (high-priority in red). Tap the banner to silence for 2 min.'));
    const g = el('div', { class: 'sheetgrid' });
    g.append(
      sld('pmax', 'Pressure limit (Pmax)', 15, 70, 1, 'cmH₂O'),
      sld('almMVlo', 'ExpMinVol low', 0, 20, 0.5, 'l/min', (v) => v.toFixed(1)),
      sld('almMVhi', 'ExpMinVol high', 1, 30, 0.5, 'l/min', (v) => v.toFixed(1)),
      sld('almFlo', 'fTotal low', 0, 40, 1, 'b/min'),
      sld('almFhi', 'fTotal high', 10, 80, 1, 'b/min'),
      sld('almVTlo', 'Vt low', 0, 800, 10, 'ml'),
      sld('almVThi', 'Vt high', 200, 2000, 10, 'ml'),
      sld('apneaTime', 'Apnea time', 10, 60, 1, 's'),
    );
    b.append(g);
  }
  // ---- patient drawer ----
  function dSld(key: Num, label: string, min: number, max: number, step: number, unit: string, fmt?: (v: number) => string, status?: () => string) {
    const f = el('div', { class: 'dfld' });
    const lab = el('div', { class: 'lab' });
    const txt = () => `${label}: ${fmt ? fmt(num[key]) : num[key]}${unit ? ' ' + unit : ''}`;
    lab.append(el('span', {}, txt()));
    const inp = el('input', { type: 'range', min, max, step, value: num[key] }) as HTMLInputElement;
    const st = status ? el('div', { class: 'status' }, status()) : null;
    inp.oninput = () => { num[key] = parseFloat(inp.value); syncBase(); (lab.firstChild as HTMLElement).textContent = txt(); if (st && status) st.textContent = status(); numsDirty = true; buildRail(); };
    f.append(lab, inp);
    if (st) f.append(st);
    return f;
  }
  function dTog(key: Bool, label: string) {
    const en = el('label', { class: 'en' });
    const c = el('input', { type: 'checkbox' }) as HTMLInputElement;
    c.checked = bool[key];
    c.onchange = () => { bool[key] = c.checked; syncBase(); buildDrawer(); };
    en.append(c, 'Enable');
    return el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, label), en));
  }
  function buildDrawer() {
    const dc = $('dcols');
    dc.innerHTML = '';
    const L = el('div'), R = el('div');
    L.append(el('h3', {}, 'Patient Characteristics'));
    const pr = el('div', { class: 'presets' });
    (Object.entries(PRESETS) as Array<[PresetId, (typeof PRESETS)[PresetId]]>).forEach(([id, p]) => {
      const b = el('button', { class: p.cls }, p.label);
      b.onclick = () => { loadPreset(vs, id); syncBase(); syncAll(); };
      pr.append(b);
    });
    L.append(el('div', { style: 'font-size:12px;color:var(--numlab);margin-bottom:6px' }, 'Presets'), pr);
    L.append(dSld('compliance', 'Compliance', 10, 90, 1, 'ml/cmH₂O', undefined, () => (S.compliance >= 40 ? 'Normal' : S.compliance >= 25 ? 'Reduced' : 'Severely reduced')));
    L.append(dSld('resistance', 'Resistance', 5, 50, 1, 'cmH₂O/l/s', undefined, () => (S.resistance <= 15 ? 'Normal' : S.resistance <= 25 ? 'Elevated' : 'High')));
    const tau = (S.resistance * S.compliance) / 1000;
    L.append(el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, `Time Constant τ: ${tau.toFixed(2)} s`)), el('div', { class: 'status', style: 'color:var(--numlab)' }, `95% equilibration ${(3 * tau).toFixed(2)} s`)));
    L.append(el('div', { class: 'hr' }), dTog('airwayClosure', 'Airway Closure'));
    if (S.airwayClosure) L.append(dSld('recruitedVol', 'Recruited Volume', 0, 400, 10, 'ml'), dSld('openPressure', 'Opening Pressure', 0, 25, 1, 'cmH₂O'));
    L.append(el('div', { class: 'hr' }), dTog('stressIdx', 'Stress Index'));
    if (S.stressIdx) L.append(dSld('stressB', 'Stress Index', 0.7, 1.4, 0.01, '', (v) => v.toFixed(2), () => (S.stressB < 0.9 ? 'SI<0.9 concave' : S.stressB > 1.1 ? 'SI>1.1 convex' : 'SI 0.9–1.1 normal')));
    L.append(el('div', { class: 'hr' }), dTog('reverseTrig', 'Reverse Triggering'), dTog('spont', 'Spontaneous Breathing'));
    if (S.spont) L.append(dSld('spontRate', 'Spont. Rate', 6, 40, 1, '/min'), dSld('pmus', 'Peak Effort (Pmus)', 0, 20, 0.5, 'cmH₂O', (v) => v.toFixed(1)), dSld('responsiveness', 'Responsiveness', 0, 100, 5, '%'));
    R.append(el('h3', {}, 'Advanced'), dTog('efl', 'Expiratory Flow Limitation'));
    if (S.efl) R.append(dSld('pcrit', 'Critical Closing P', 2, 15, 1, 'cmH₂O'), dSld('peepStent', 'PEEP Stenting', 0, 100, 5, '%'));
    R.append(dTog('cardiac', 'Cardiac Oscillations'));
    if (S.cardiac) R.append(dSld('hr', 'Heart Rate', 40, 140, 1, 'bpm'));
    R.append(dTog('variability', 'Natural Variability'));
    if (S.variability) R.append(dSld('varPct', 'Variability', 5, 20, 1, '%'));
    R.append(dTog('uip', 'Upper Inflection'));
    if (S.uip) R.append(dSld('uipThresh', 'UIP Threshold', 20, 40, 1, 'cmH₂O'));
    R.append(el('div', { class: 'hr' }), dTog('showP01', 'Show P0.1'));
    dc.append(L, R);
  }
  function buildAsync() {
    const w = $('asyncBtns');
    w.innerHTML = '';
    Object.entries(SCENARIOS).forEach(([id, s]) => {
      const b = el('button', {}, s.name);
      b.onclick = () => { runScenario(vs, id); clearBuf(); syncAll(); closeDrawer(); };
      w.append(b);
    });
  }
  // ---- open/close ----
  const openSheet = (which: 'modes' | 'controls' | 'alarms') => { if (which === 'controls') sheetTab = 'basic'; if (which === 'modes') pendingMode = null; buildSheet(which); $('sheet').classList.add('on'); $('scrim').classList.add('on'); };
  const closeSheet = () => { $('sheet').classList.remove('on'); $('scrim').classList.remove('on'); };
  const openDrawer = () => { buildDrawer(); $('drawer').classList.add('on'); $('scrim').classList.add('on'); };
  const closeDrawer = () => { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); };
  $('closeSheet').onclick = closeSheet;
  $('closeDrawer').onclick = closeDrawer;
  $('scrim').onclick = () => { closeSheet(); closeDrawer(); };
  $('modesBtn').onclick = () => openSheet('modes');
  $('tabUtil').onclick = () => openDrawer();
  $('tabSystem').onclick = () => openSheet('controls');
  $('alarmBanner').onclick = () => silenceAlarms(vs);
  document.querySelectorAll<HTMLElement>('.vtab').forEach((bt) => (bt.onclick = () => {
    viewMode = bt.dataset.view === 'cockpit' ? 'cockpit' : 'graphics';
    document.querySelectorAll('.vtab').forEach((x) => x.classList.toggle('on', x === bt));
    $('waves').style.display = viewMode === 'graphics' ? '' : 'none';
    $('cockpit').style.display = viewMode === 'cockpit' ? '' : 'none';
    sizeCanvases();
    if (viewMode === 'cockpit') updatePanels();
  }));
  const syncAll = () => { buildWaves(); buildNums(); buildRail(); buildDrawer(); syncHeader(); };
  const clearBuf = () => { BUF.p.length = BUF.f.length = BUF.v.length = BUF.t.length = 0; };
  // ---- main loop: the driver steps the ventilator (and posts link frames); every 5 ms step is sampled ----
  let raf = 0;
  const keep = () => Math.ceil(((S.sweepSec || 12) * 1.15) / DT) + 40;
  d.onStep = () => {
    if (frozen) return;
    BUF.p.push(P.dispPaw); BUF.f.push(P.dispFlowLpm); BUF.v.push(P.V); BUF.t.push(P.t);
    const k = keep();
    while (BUF.t.length > k) { BUF.p.shift(); BUF.f.shift(); BUF.v.shift(); BUF.t.shift(); }
  };
  function loop(ts: number) {
    d.frame(ts);
    if (viewMode === 'graphics') LANES.forEach((l) => drawLaneOn(canvases[l.key], l));
    else { drawLaneOn(cockpitPaw, LANES[0]!); drawLung(lungCanvas); }
    if (numsDirty || P.t - lastNumT > 1.4) { buildNums(); if (viewMode === 'cockpit') updatePanels(); lastNumT = P.t; numsDirty = false; }
    syncHeader();
    raf = requestAnimationFrame(loop);
  }
  d.onControl = syncAll; // a remote patch (link page, demo) redraws the knobs and sheets
  buildWaves(); buildCockpit(); buildNums(); buildRail(); buildDrawer(); buildAsync(); syncHeader();
  raf = requestAnimationFrame(loop);
  return { stop: () => { cancelAnimationFrame(raf); d.onStep = undefined; d.onControl = undefined; } };
}
```

**Create `apps/demo/src/vent/hamilton-page.ts`:**

```ts
// vent-hamilton.html: the ventilator alone (no ?link) or linked to a monitor in another window/iframe
// (?link=<session>[&profile=<id>]) over BroadcastChannel `pme-vent/<session>`.
import { createBroadcastPort, createVentDriver, PROFILES, type ProfileId } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const session = q.get('link');
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const port = session ? createBroadcastPort(session) : null;
const driver = createVentDriver(port, profile);
mountHamiltonUi(driver);
(window as unknown as { __vent: typeof driver }).__vent = driver; // e2e hook
```

- [x] **Step 6: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/vent-link.e2e.ts`
Expected: typecheck clean; 1 passed (≈ 5 s). Open `npx -y pnpm@9.15.9 --filter @pme/demo dev` → `/vent-hamilton.html` once by eye (headless Chrome screenshot if no display): navy cockpit, yellow/green/cyan traces, round knobs, Graphics/Dynamic Lung tabs.

- [x] **Step 7: Commit and push**

```bash
git add apps/demo pnpm-lock.yaml
git commit -m "feat(demo): vent-hamilton.html — the v1.9 Hamilton-style front end on the TypeScript engine (markup/CSS generated from the reference)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 18: Demo — the combined page (`vent-link.html`) with picker and demonstrations

**Files:**
- Create: `apps/demo/vent-link.html`, `apps/demo/src/vent/demos.ts`, `apps/demo/src/vent/link-page.ts`
- Modify: `apps/demo/vite.config.ts` (one input), `apps/demo/index.html` (one list item), `apps/demo/e2e/vent-link.e2e.ts` (append the second test)

**Interfaces:**
- Consumes: `mountMonitor`, `MonitorHandle` (renderer); `attachMonitorToLink`, `createBroadcastPort`, `PROFILES`, `STAND_INS`, `LinkMsg`, `ProfileId`, `VentConfig` (ventilator).
- Produces: `LinkDemo { id, label, profile, start, step, engineStep?, settleS, watch }`; `DEMOS` (ten: `peep`, `fio2`, `rr`, `copd`, `ards`, `hf` — R27; `ph`, `tension`, `pe`, `fibrosis` — R36); page hook `window.__link { session, last, simT, pm, post, DEMOS }`.

Layout: the ventilator in an `<iframe>` (`vent-hamilton.html?link=<session>&profile=<id>` — the same path a separate window uses) on the left, the monitor (ECG II, ABP, CVP, pleth, CO2 lanes) on the right; a pathology picker grouped by catalogue group (tooltip lists what does not act yet); speed ×1/×4/×10; the ten demonstration buttons (each loads its profile and start settings, then applies its step after `settleS` sim seconds, engine stand-ins included); a Disconnect/Reconnect button; a status line with SpO2, EtCO2, ABP, CVP, HR.

- [x] **Step 1: Write the failing e2e test**

Append to `apps/demo/e2e/vent-link.e2e.ts`:

```ts
test('vent-link.html: two-way link, disconnection, COPD demonstration', async ({ page }) => {
  test.setTimeout(180_000);
  const errs = errorsOf(page);
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-link.html`);
  await page.selectOption('#speed', '4');
  // vent → engine: the monitor counts the ventilator's 14/min
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14);
  // engine → vent: lungState arrived
  expect(await vent<boolean>(page, '(v) => v.core.lung.ref !== null')).toBe(true);
  // disconnection: ventilator alarm, then EtCO2 0 on the monitor
  await page.click('#disc');
  await expect.poll(() => page.frameLocator('#vent').locator('#alarmBanner').textContent(), { timeout: 10_000 }).toContain('Disconnection');
  await expect.poll(() => last(page, 'etco2'), { timeout: 20_000 }).toBe(0);
  await page.click('#disc');
  await expect.poll(() => last(page, 'etco2'), { timeout: 30_000 }).toBeGreaterThan(25);
  // COPD: RR 10 → 20 at 90 s sim; MAP falls
  await page.click('button[data-demo="copd"]');
  await page.selectOption('#speed', '4');
  await page.waitForFunction(() => (window as Any).__link.simT >= 85, null, { timeout: 60_000 });
  const before = (await last(page, 'abpMean')) as number;
  await page.waitForFunction(() => (window as Any).__link.simT >= 200, null, { timeout: 90_000 });
  const after = (await last(page, 'abpMean')) as number;
  expect(await vent<number>(page, '(v) => v.vs.cfg.rate')).toBe(20);
  expect(await vent<number>(page, '(v) => v.vs.p.measured.autoPEEP')).toBeGreaterThan(6);
  expect(before - after).toBeGreaterThan(10);
  expect(errs).toEqual([]);
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/vent-link.e2e.ts -g "two-way"`
Expected: FAIL — 404 on `/vent-link.html`.

- [x] **Step 3: Implement the page**

**Create `apps/demo/vent-link.html`:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage V: ventilator ↔ patient monitor</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 10px; }
      #bar { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-bottom: 8px; }
      #bar fieldset { border: 1px solid #333; padding: 4px 8px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      #bar legend { color: #888; }
      button, select { font: inherit; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #split { display: grid; grid-template-columns: minmax(540px, 1fr) minmax(600px, 1.15fr); gap: 8px; height: 560px; }
      #vent { width: 100%; height: 100%; border: 1px solid #333; background: #071634; }
      #monitor { height: 100%; border: 1px solid #333; }
      #status { font: 13px ui-monospace, monospace; color: #8f8; white-space: pre; min-height: 2.6em; margin-top: 6px; }
    </style>
  </head>
  <body>
    <div id="bar">
      <fieldset><legend>Patient</legend>
        <select id="profile"></select>
        <label>Speed <select id="speed"><option value="1">×1</option><option value="4">×4</option><option value="10">×10</option></select></label>
      </fieldset>
      <fieldset id="demos"><legend>R27 demonstrations</legend></fieldset>
      <fieldset><legend>Circuit</legend><button id="disc" aria-pressed="false">Disconnect</button></fieldset>
    </div>
    <div id="split">
      <iframe id="vent" title="Ventilator"></iframe>
      <div id="monitor"></div>
    </div>
    <div id="status"></div>
    <script type="module" src="./src/vent/link-page.ts"></script>
  </body>
</html>
```

**Create `apps/demo/src/vent/demos.ts`:**

```ts
// The R27 + R36 demonstrations as data: a profile (lung-pathology row), starting settings, and the step applied
// after `settleS` sim seconds — ventilator settings and, for the vascular events the ventilator cannot cause,
// engine targets (Stage 7a stand-ins). The combined page runs them; the link tests assert the same steps.
import { STAND_INS, type ProfileId, type VentConfig } from '@pme/ventilator';

const withShunt = (id: string, shunt: number): NonNullable<LinkDemo['engineStep']> =>
  [...(STAND_INS[id] ?? []).map((x) => ({ variable: x.variable as 'sbp' | 'dbp' | 'cvp' | 'hr', value: x.value, rampS: x.rampS })), { variable: 'shunt', value: shunt, rampS: 0 }];

export interface LinkDemo {
  id: string;
  label: string;
  profile: ProfileId;
  start: Partial<VentConfig>;
  step: Partial<VentConfig>;
  /** Engine targets applied with the step (Stage 7a stand-ins: link/profiles.ts STAND_INS). */
  engineStep?: Array<{ variable: 'sbp' | 'dbp' | 'cvp' | 'hr' | 'shunt'; value: number; rampS: number }>;
  settleS: number;
  watch: string;
}

export const DEMOS: LinkDemo[] = [
  { id: 'peep', label: 'PEEP 5 → 15', profile: 'normal', start: { peep: 5, fio2: 40 }, step: { peep: 15 }, settleS: 60, watch: 'CO/MAP fall, CVP rises' },
  { id: 'fio2', label: 'FiO2 40 → 100 %', profile: 'ards-moderate', start: { peep: 5, fio2: 40, vt: 420, pmax: 45 }, step: { fio2: 100 }, settleS: 60, watch: 'SpO2 rises over ~1–2 min' },
  { id: 'rr', label: 'RR 14 → 22', profile: 'normal', start: { rate: 14, vt: 500 }, step: { rate: 22 }, settleS: 60, watch: 'EtCO2 falls over minutes' },
  { id: 'copd', label: 'COPD: RR 10 → 20', profile: 'copd-gold-3-4', start: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' }, step: { rate: 20 }, settleS: 90, watch: 'auto-PEEP ↑ → MAP ↓' },
  { id: 'ards', label: 'ARDS: PEEP 5 → 15', profile: 'ards-moderate', start: { peep: 5, fio2: 60, vt: 420, pmax: 45 }, step: { peep: 15 }, settleS: 90, watch: 'SpO2 ↑ (recruitment), CO ↓' },
  { id: 'hf', label: 'HF oedema: PEEP 5 → 12', profile: 'oedema-cardiogenic', start: { peep: 5, fio2: 40 }, step: { peep: 12 }, settleS: 90, watch: 'SpO2 ↑, CO ↓' },
  { id: 'ph', label: 'PH crisis: PEEP 15 + RR 8', profile: 'pulmonary-hypertension', start: { peep: 5, rate: 14 }, step: { peep: 15, rate: 8 }, settleS: 60, watch: 'hypercapnia + high PEEP: CVP ↑, BP ↓ (RV failure signature when 7a lands)' },
  { id: 'tension', label: 'Tension pneumothorax', profile: 'pneumothorax-simple', start: { pmax: 60 }, step: { compliance: 18, resistance: 14 }, engineStep: withShunt('pneumothorax-tension', 0.3), settleS: 60, watch: 'Ppeak/Pplat climb, SpO2 ↓, BP ↓ with CVP ↑' },
  { id: 'pe', label: 'Massive PE', profile: 'normal', start: {}, step: {}, engineStep: withShunt('pe-massive', 0.12), settleS: 60, watch: 'EtCO2 falls with unchanged ventilation; BP ↓' },
  { id: 'fibrosis', label: 'Fibrosis: VT 490 → 350, RR 20', profile: 'fibrosis-ild', start: { vt: 490, rate: 14 }, step: { vt: 350, rate: 20 }, settleS: 60, watch: 'driving pressure 16 → 12 cmH2O at the same minute ventilation' },
];
```

**Create `apps/demo/src/vent/link-page.ts`:**

```ts
// vent-link.html: the Hamilton ventilator (iframe, its own window context) and the patient monitor side by side,
// linked over BroadcastChannel `pme-vent/<session>` (R27 both ways). The profile picker remounts the monitor
// with the profile's patient and tells the ventilator to load the profile's lung; the demo buttons run DEMOS.
import type { EngineEvent } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { attachMonitorToLink, createBroadcastPort, PROFILES, type LinkMsg, type ProfileId, type VentConfig } from '@pme/ventilator';
import { DEMOS, type LinkDemo } from './demos.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const session = `v${Math.floor(Math.random() * 1e9).toString(36)}`;
const port = createBroadcastPort(session);
const post = (m: Omit<Extract<LinkMsg, { kind: 'control' }>, 'v' | 'kind'>) => port.post({ v: 1, kind: 'control', ...m });

let profile: ProfileId = 'normal';
let pm: MonitorHandle | null = null;
let detach: () => void = () => {};
const last: Record<string, number> = {};
let simT = 0;
let pending: { demo: LinkDemo; at: number } | null = null;

function mount(id: ProfileId) {
  detach();
  pm?.destroy();
  profile = id;
  const m = mountMonitor($('monitor'), {
    skin: 'philips-like', engine: { seed: 7, patient: (PROFILES[id] ?? PROFILES.normal)!.patient },
    lanes: ['ecgII'], waves: ['abp', 'cvp', 'pleth', 'co2'], temp: false,
  });
  pm = m;
  void m.dispatch({ id: 'link-ga', issuedBy: 'vent-link', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  detach = attachMonitorToLink(m, port, (c, r) => console.warn('link command rejected', c.type, r));
  m.on(onEvent);
  m.setTimeScale(Number($<HTMLSelectElement>('speed').value));
}

function onEvent(e: EngineEvent) {
  if (e.type === 'state') simT = e.t;
  if (e.type === 'measurement') for (const [k, v] of Object.entries(e.values)) if (v && v.value !== null) last[k] = v.value;
  if (pending && simT >= pending.at) {
    post({ patch: pending.demo.step });
    for (const t of pending.demo.engineStep ?? []) void pm?.dispatch({ id: `demo-${t.variable}-${simT}`, issuedBy: 'vent-link', type: 'setTarget', variable: t.variable, value: t.value, ...(t.rampS ? { ramp: { durationS: t.rampS } } : {}) });
    pending = null;
  }
  const f = (k: string, d = 0) => (last[k] === undefined ? '--' : (last[k] as number).toFixed(d));
  $('status').textContent =
    `profile ${PROFILES[profile]?.label}   t ${simT.toFixed(0)} s${pending ? `   step in ${(pending.at - simT).toFixed(0)} s` : ''}\n` +
    `SpO2 ${f('spo2')}  EtCO2 ${f('etco2')}  ABP ${f('abpSys')}/${f('abpDia')} (${f('abpMean')})  CVP ${f('cvpMean')}  HR ${f('hr')}`;
}

function loadVent(id: ProfileId, patch: Partial<VentConfig> = {}) {
  $<HTMLIFrameElement>('vent').src = `vent-hamilton.html?link=${session}&profile=${id}`;
  $<HTMLIFrameElement>('vent').onload = () => {
    post({ patch });
    port.post({ v: 1, kind: 'time', action: 'scale', value: Number($<HTMLSelectElement>('speed').value) });
  };
}

const sel = $<HTMLSelectElement>('profile');
const groups = new Map<string, HTMLOptGroupElement>();
for (const [id, p] of Object.entries(PROFILES)) {
  let g = groups.get(p.group);
  if (!g) {
    g = document.createElement('optgroup');
    g.label = p.group;
    groups.set(p.group, g);
    sel.append(g);
  }
  const o = new Option(p.label, id);
  if (p.stage7) o.title = `not yet acting: ${p.stage7}`;
  g.append(o);
}
sel.addEventListener('change', () => {
  pending = null;
  mount(sel.value as ProfileId);
  loadVent(profile);
});
$('speed').addEventListener('change', () => {
  const k = Number($<HTMLSelectElement>('speed').value);
  pm?.setTimeScale(k);
  port.post({ v: 1, kind: 'time', action: 'scale', value: k });
});
for (const demo of DEMOS) {
  const b = document.createElement('button');
  b.textContent = demo.label;
  b.title = demo.watch;
  b.dataset.demo = demo.id;
  b.addEventListener('click', () => {
    sel.value = demo.profile;
    mount(demo.profile);
    loadVent(demo.profile, demo.start);
    pending = { demo, at: demo.settleS };
  });
  $('demos').append(b);
}
$('disc').addEventListener('click', () => {
  const on = $('disc').getAttribute('aria-pressed') !== 'true';
  $('disc').setAttribute('aria-pressed', String(on));
  $('disc').textContent = on ? 'Reconnect' : 'Disconnect';
  post({ circuit: on ? 'disconnected' : 'connected' });
});

mount('normal');
loadVent('normal');
(window as unknown as { __link: unknown }).__link = { session, last, get simT() { return simT; }, get pm() { return pm; }, post, DEMOS };
```

In `apps/demo/vite.config.ts`, after the `'vent-hamilton': page('vent-hamilton'), // Stage V` line add:

```ts
        'vent-link': page('vent-link'), // Stage V
```

In `apps/demo/index.html`, after the `stage6b-acls.html` list item add:

```html
      <li><a href="./vent-link.html">Stage V: ventilator ↔ monitor link</a> · <a href="./vent-hamilton.html">ventilator alone</a></li>
```

- [x] **Step 4: Run to verify it passes**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo build && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/vent-link.e2e.ts`
Expected: typecheck clean; build lists `dist/vent-link.html` and `dist/vent-hamilton.html`; **2 passed (≈ 1.1 min)**. Measured in the prototype on the page: ×1 and ×4 hold exactly with the ventilator 30 ms ahead of the engine; at ×10 the headless worker runs ×4 and the ventilator stays ≤ 1.5 s ahead (MAX_AHEAD_TICKS) — record what your machine does in the gate note.

- [x] **Step 5: Commit and push**

```bash
git add apps/demo
git commit -m "feat(demo): vent-link.html — ventilator iframe + monitor, 39-row pathology picker, ten R27/R36 demonstrations, disconnection

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 19: Gate screenshots and the catalogue §4b for Ali

**Files:**
- Create: `apps/demo/scripts/vent-shots.mjs`, `packages/ventilator/scripts/catalogue-md.ts`, `docs/gates/stage-V/*.jpg` (9 files, generated)
- Modify: `docs/physiology/stage-7-parameter-tables.md` (append §4b, generated — R36 names this document)

**Interfaces:** consumes `window.__link.DEMOS` / `simT` (Task 18), `LUNG_PATHOLOGIES` and `REF_SETTINGS` (Task 9).

- [x] **Step 1: Write the screenshot script**

**Create `apps/demo/scripts/vent-shots.mjs`:**

```js
// Stage V gate screenshots (docs/gates/stage-V/*.jpg, each ≤ 60 KB): the Hamilton page, the combined page, and
// the R27/R36 demonstrations after their step has acted. Run from the repo root: node apps/demo/scripts/vent-shots.mjs
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '../../docs/gates/stage-V');
mkdirSync(out, { recursive: true });
const vite = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const W = 1200;
const H = 720;
const page = await browser.newPage({ viewport: { width: W, height: H } });
const shot = async (name, clip) => {
  const path = resolve(out, `${name}.jpg`);
  for (const quality of [70, 55, 40, 30, 22]) {
    await page.screenshot({ path, type: 'jpeg', quality, clip });
    if (statSync(path).size <= 60_000) break;
  }
  console.log(name, statSync(path).size, 'bytes');
};
await page.goto(`${base}/vent-hamilton.html`);
await page.waitForTimeout(9000);
await shot('hamilton', { x: 0, y: 0, width: W, height: H });
await page.goto(`${base}/vent-link.html`);
await page.selectOption('#speed', '4');
await page.waitForTimeout(12_000);
await shot('combined', { x: 0, y: 0, width: W, height: H });
// each demonstration: its settle time plus 90 s of sim after the step, at ×4
for (const [id, after] of [['copd', 90], ['ards', 180], ['hf', 120], ['ph', 120], ['tension', 90], ['pe', 90], ['fibrosis', 60]]) {
  await page.click(`button[data-demo="${id}"]`);
  await page.selectOption('#speed', '4');
  const settle = await page.evaluate((d) => window.__link.DEMOS.find((x) => x.id === d).settleS, id);
  await page.waitForFunction((t) => window.__link.simT >= t, settle + after, { timeout: 240_000 });
  await shot(`demo-${id}`, { x: 0, y: 0, width: W, height: H });
}
await browser.close();
await vite.close();
```

- [x] **Step 2: Take the screenshots and check their size**

```bash
node apps/demo/scripts/vent-shots.mjs      # ≈ 8 min at ×4
ls -l docs/gates/stage-V/
find docs/gates/stage-V -name '*.jpg' -size +60k   # must print nothing
```

Expected: `hamilton`, `combined`, `demo-copd`, `demo-ards`, `demo-hf` (the three R27 demonstrations), `demo-ph`, `demo-tension`, `demo-pe`, `demo-fibrosis` (R36); prototype sizes 48–60 KB. Open each (`Read` the JPEG): the ventilator's knobs show the step's settings (e.g. COPD: Rate 20, "Intrinsic PEEP" banner), the monitor's ABP/CVP tiles show the consequence (COPD ≈ 94/63 (75), CVP 9).

- [x] **Step 3: Generate §4b**

**Create `packages/ventilator/scripts/catalogue-md.ts`:**

```ts
// Prints the lung-pathology catalogue as the Markdown section for docs/physiology/stage-7-parameter-tables.md §4b
// (R36: for Ali's review). Run: node --experimental-strip-types packages/ventilator/scripts/catalogue-md.ts
import { LUNG_PATHOLOGIES, REF_SETTINGS, type Band } from '../src/pathology/catalogue.ts';

const f = (b: Band) => `${b.value} (${b.lo}–${b.hi})`;
const out: string[] = [
  '## §4b Lung pathology catalogue (R36, Stage V)',
  '',
  `Generated from \`packages/ventilator/src/pathology/catalogue.ts\` — edit the source, not this table. Reference: passive intubated adult, PBW ${REF_SETTINGS.pbwKg} kg; VC ${REF_SETTINGS.vtMl} mL, ${REF_SETTINGS.rr}/min, PEEP ${REF_SETTINGS.peep}, ${REF_SETTINGS.flowLpm} L/min, pause ${REF_SETTINGS.pauseS} s. Values: default (band). "ENG" in a source = engineering judgement for review.`,
  '',
  '| Condition | C mL/cmH2O | R insp / exp | Auto-PEEP tend. | Shunt | VD/VT | Diffusion | PVR × | HPV | Recruit. | Plateau / ΔP / P peak−plat | Not acting yet | Sources | Question for Ali |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of LUNG_PATHOLOGIES) {
  const later = Object.entries(r.wired).filter(([, w]) => w !== 'vent' && w !== 'engine-now').map(([k, w]) => `${k} (${w})`).join(', ');
  const src = r.sources.map((s) => `${s.field}: ${s.src}`).join(' · ').replace(/\|/g, '/');
  const eng = r.sources.some((s) => s.src.startsWith('ENG') || s.src.includes('ENG'));
  out.push(`| ${r.label} | ${f(r.complianceMl)} | ${f(r.rInsp)} / ${f(r.rExp)} | ${r.autoPeepTendency} | ${f(r.shunt)} | ${f(r.deadSpaceFraction)} | ${r.diffusionFactor} | ${f(r.pvrMultiplier)} | ${r.hpvSensitivity} | ${r.recruitability}${r.recruitP50 ? ` (P50 ${r.recruitP50})` : ''} | ${f(r.signature.plateau)} / ${f(r.signature.drivingPressure)} / ${f(r.signature.peakMinusPlateau)} | ${later} | ${src} | ${eng ? 'ENG values — confirm or correct' : ''}${r.disagreements ? ` Disagreement: ${r.disagreements}` : ''} |`);
}
console.log(out.join('\n'));
```

```bash
node --experimental-strip-types packages/ventilator/scripts/catalogue-md.ts > /tmp/pme-4b.md
grep -c '^| ' /tmp/pme-4b.md        # 41 (header + separator + 39 rows)
printf '\n' >> docs/physiology/stage-7-parameter-tables.md && cat /tmp/pme-4b.md >> docs/physiology/stage-7-parameter-tables.md
```

(If `stage-7-parameter-tables.md` already has a `## §4b` heading on your base — another stage added one — put this section under a heading `## §4b-V Lung pathology catalogue (Stage V)` instead and say so in the gate note.)

- [x] **Step 4: Commit and push**

```bash
git add apps/demo/scripts/vent-shots.mjs packages/ventilator/scripts/catalogue-md.ts docs/gates/stage-V docs/physiology/stage-7-parameter-tables.md
git commit -m "docs(stage-V): gate screenshots (Hamilton, combined, 7 demonstrations) and the lung-pathology catalogue as §4b for review

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 20: Gate note

**Files:**
- Create: `docs/gates/stage-V.md`

- [ ] **Step 1: Re-measure**

Run `PRINT=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-r27.test.ts test/link-r36.test.ts` and the fidelity maximum errors:

```bash
mkdir -p packages/ventilator/test/tmp
cat > packages/ventilator/test/tmp/fid.test.ts <<'TS'
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it } from 'vitest';
import { CORRECTED_FROM_S, maxErr, runReference } from '../fidelity.test.ts';
it('fidelity numbers', () => {
  const ref = JSON.parse(readFileSync(resolve(import.meta.dirname, '../fixtures/reference-traces.json'), 'utf8'));
  for (const tr of ref.traces) {
    const { rows } = runReference(tr);
    const u = CORRECTED_FROM_S[tr.id] ?? Infinity;
    console.log(tr.id, [0, 1, 2, 3, 4, 5].map((c) => maxErr(rows, tr.rows, c, u).toExponential(1)).join(' '));
  }
});
TS
npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/tmp/fid.test.ts; rm -r packages/ventilator/test/tmp
```

(Scratch only — nothing under `test/tmp` is committed.)

- [ ] **Step 2: Write the gate note**

**Create `docs/gates/stage-V.md`** with this structure, replacing every number with what Step 1 and Tasks 13–19 printed on YOUR run (the prototype's numbers are shown; a difference beyond the last digit is a finding to report, not to smooth over):

```markdown
# Gate V — Ventilator fork and the two-way link (date: <today>)

Gate question: "Does changing the ventilator move the monitor the way it does at the bedside — PEEP lowers BP and raises CVP, FiO2 and PEEP move SpO2 on their own time scales, gas trapping in COPD drops the pressure, and a disconnected circuit alarms on both devices at once?"

Branch `stage-v-ventilator-link`, based on `main` `<sha>`, built from `docs/plans/stage-v-ventilator-link.md` (21 tasks).

| Check | Result |
|---|---|
| typecheck / `pnpm -r test` / build / check-notices / e2e | exit 0 ×4; ventilator 87, engine-core 372 (+3), …; `check-notices: OK`; `PW_SYSTEM_CHROME=1 test:e2e`: all passed incl. vent-link 2 |
| Port fidelity (10 traces captured from the original v1.9) | max error ≤ 5.0e-4 on Paw/flow/volume/Pmus/displayed Paw (fixture rounding), phase identical, numerics equal to 2 dp; 3 traces compared up to C1's first trapped-gas breath (3.26/1.08/3.26 s) |
| C1 (needs Ali) | COPD RR 20 VT 560: VTE 561.7, auto-PEEP 11.9 (v1.9: VTE 293, 4.5); breath-stacking stacked VT 350 (v1.9: 104). Without C1 the COPD demo shows MAP −5 instead of −20 |
| PEEP 5 → 15 | CO 4.90 → 4.44 (−9.4 %), MAP 97.1 → 83.6, CVP 6.0 → 8.1 (Stage 3 gate: −9 %, 97 → 83, 6.0 → 8.2) |
| FiO2 0.4 → 1.0 (ARDS moderate) | SpO2 89 → 94.3 within 3 min |
| RR 14 → 22 | EtCO2 37.9 → 34.0 (+2 min) → 31.0 (+10 min) |
| COPD GOLD 3–4, VT 8 mL/kg, RR 10 → 20 | auto-PEEP 2.8 → 9.9, MAP 93.7 → 73.9, CO 4.80 → 4.03, CVP 6.4 → 8.6; reversed at RR 10 |
| ARDS PEEP 5 → 15 → 5 (FiO2 0.6) | SpO2 91 → 98 (1–4 min), CO −12 %, MAP 97 → 83; 92.9 within 60 s of PEEP 5 |
| HF oedema PEEP 5 → 12 | SpO2 95 → 98, CO 4.95 → 4.50, MAP 97 → 85 |
| R36: PH crisis / tension PTX / massive PE / fibrosis | EtCO2 37 → 42, CVP +1.9, MAP −12 / plateau 18 → 33, SpO2 98 → 91, MAP 97 → 50, CVP 6 → 18 / EtCO2 37 → 31 with plateau unchanged / ΔP 16.7 → 11.7 |
| Disconnection | ventilator alarm +0.94 s; capnogram < 1 mmHg from +4 s (sidestream 2.3 s, R39 §5); EtCO2 0 by +14 s |
| Determinism | seed 42 ×2 identical, 43 differs |
| Catalogue | 39 rows, every signature inside its band; 3 citations spot-checked against the PDFs |
| Browser clocks | ×1, ×4 exact; ×10 → <what your machine held>, ventilator ≤ 1.5 s ahead |

## Screenshots (`docs/gates/stage-V/`, ≤ 60 KB)
- **hamilton** — …, **combined** — …, **demo-copd**, **demo-ards**, **demo-hf** (R27), **demo-ph**, **demo-tension**, **demo-pe**, **demo-fibrosis** (R36): one line each on what the frame shows.

## Needs a ruling
1. **Correction C1** (plan decision 2) — accept or revert Task 5.
2. **Catalogue values** — §4b of `docs/physiology/stage-7-parameter-tables.md`; rows marked ENG need Ali's number (neonatal RDS, COVID phenotypes, pregnancy chest wall, stand-in haemodynamics).
3. **Stand-ins** (plan decision 8) — shock is SET in MANUAL until Stage 7a; acceptable for the demo?
4. **Interim recruitment** time constants τ 40 s / 10 s [ENG] until Stage 7b.

## Deviations from the plan
(list every one, or "none")

## Partition
- engine-core: `types-vent-link.ts` (new), `l2/resp/driver.ts` (+1 import, 3 reads), `l2/resp/pipeline.ts` (+1 import, 1 term), `index.ts` (+1) — `git diff origin/main --stat -- packages/engine-core` pasted here.
- Nothing under Stage 4b's or 5.1's paths changed: `git diff origin/main --stat -- packages/engine-core/src/l2/ecg packages/engine-core/src/l3/alarms packages/renderer packages/skins` is empty.
```

- [ ] **Step 3: Commit and push**

```bash
git add docs/gates/stage-V.md
git commit -m "docs(gates): stage V gate evidence

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-v-ventilator-link
```

### Task 21: Full verification and PR

**Files:** none new (fix-ups only if a check fails; each fix is its own commit with its own test).

- [ ] **Step 1: Clean install and every check**

```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules && npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

Expected: all exit 0; `@pme/ventilator` 87 passed; engine-core 372 passed; every existing e2e still passes plus `vent-link.e2e.ts` (2).

- [ ] **Step 2: Partition check**

```bash
git diff origin/main --stat -- packages/engine-core    # only types-vent-link.ts, l2/resp/driver.ts, l2/resp/pipeline.ts, index.ts, test/l2/resp/vent-frame-ext.test.ts
git diff origin/main --stat -- packages/renderer packages/skins packages/audio packages/controller packages/engine-core/src/l2/ecg packages/engine-core/src/l3   # empty
```

If `origin/main` moved (Stage 4b/5.1 merged), `git merge origin/main` (keep both sides; NOTICES keeps every row), rerun Step 1, push.

- [ ] **Step 3: Tick the plan, push, open the PR**

Tick every checkbox of `docs/plans/stage-v-ventilator-link.md` in the branch, commit (`docs: stage V plan fully ticked`), push, then:

```bash
gh pr create --base main --head stage-v-ventilator-link --title "Stage V: ventilator fork (@pme/ventilator) + two-way link to the monitor (R27/R35/R36)" --body "$(cat <<'BODY'
Implements docs/plans/stage-v-ventilator-link.md (21 tasks). Gate evidence: docs/gates/stage-V.md.

- @pme/ventilator: the v1.9 ventilator engine ported to TypeScript, bit-exact against 10 traces captured from the original (plus correction C1, separately revertible — needs Ali).
- Two-way link: 50 Hz externalDrive VentFrames (with optional alveolar pressure, engine-core additive) in; lungState out; in-process lockstep and a BroadcastChannel window link with the engine as master clock.
- R36 lung-pathology catalogue: 39 sourced rows (R37), §4b in the parameter tables for review; interim PEEP recruitment and Stage 7a stand-ins.
- Demos: vent-hamilton.html (the Hamilton-style front end) and vent-link.html (ventilator + monitor, pathology picker, ten R27/R36 demonstrations).

Not merged: R21 — the orchestrator/Ali gate it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Do NOT merge. Report: commits, test counts, the gate numbers, deviations, anything undone.

---

## Self-review (done while writing)

- **Spec coverage.** R27 vent → engine (Tasks 6, 7, 12, 16), engine → vent (8, 12, 16), time base with pause/scale (12, 16), demos incl. comorbidity picker and the three R27 demonstrations (18, 19); R35 fork, NOTICES, licence (1, 4, 17); R36 catalogue in 3 grouped tasks with per-row tests (9–11), picker rows (12, 18), the four extra demonstrations (14, 18, 19), §4b (19); R37 sourcing and a PDF spot-check (9); R39 sidestream delay referenced where disconnection touches CO2 (decision 9, Task 13); tests: fidelity (4), link (13, 14), determinism (15), Playwright (17, 18); gate note with ≤ 60 KB screenshots (19, 20); PR without merge (21).
- **Ambiguities resolved here (for the orchestrator):** C1 changes Ali's physics (decision 2); the R27 VentFrame's `mode` and the new `palvCmH2O` are optional fields in a new engine-core file rather than a change to Stage 3's `VentFrame` (decision 4); profiles use only today's `PatientProfile` fields, everything else is marked Stage 7 (decision 12); shock in PE/tension/anaphylaxis is set as MANUAL targets (decision 8); the combined page uses an iframe + BroadcastChannel rather than the controller's HostSession (decision 10); Freeze is display-only (decision 11).
- **Known limits.** Bronchopleural-fistula leak and one-sided ventilation are not modelled by the single-compartment ventilator (rows say so); the catalogue's signature test is partly a consistency test (bands and mechanics come from the same review), so the review item is the table itself; ×10 in a headless browser ran at ×4.
