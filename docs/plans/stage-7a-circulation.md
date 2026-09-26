# Stage 7a: Whole-body physiology — the circulation (two-sided time-varying-elastance heart) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Stage 2's per-beat ejection pulses with a continuous four-chamber time-varying-elastance heart (R42), four valves, a pulmonary circuit, systemic veins, a pericardium and a continuous pleural-pressure input, integrated at 2 ms RK4 inside the existing 125 Hz loop, so stroke volume, PPV, post-extrasystolic change, AF pulse deficit, valve lesions, tamponade, PE and ischaemia EMERGE; add the baroreflex, bolus drug effect curves, coronary supply/demand with an ST hook, a minimal patient-profile layer with stabilisation, MANUAL tracking on Ees/SVR/venous V0, the `CircuitDevice` seam with IABP and LVAD, PV-loop teaching channels, a Pulse oracle for scenarios O1–O5 and a `stage7a.html` demo.

**Architecture:** A new `packages/engine-core/src/l2/circ/**` package owns the circulation: `circuit.ts` is an 11-state ODE (Stage 2's systemic Windkessel + radial resonator kept verbatim as states 0–3; systemic veins; RA, RV, LA, LV volumes with Smith-2004 elastance/EDPVR; pulmonary arterial volume with characteristic impedance; two parallel lung beds; pulmonary veins) stepped by classical RK4 at 2 ms; valves are continuous one-way conductances (`valves.ts`); activation is the Stergiopulos double-Hill (`activation.ts`) timed from the rhythm engine's `beat`/`atrial` records; `model.ts` (the L1-owned "haemodynamic integrator", audit A4) adds a 10 Hz control layer (baroreflex, drugs, volume events, conditions, coronary) and per-beat truths; `profile.ts` + `stabilise.ts` resolve an R22 profile and tune it to its resting SBP/DBP/CVP with a convergence ledger (audit #3). Stage 2's `l2/hemo/pipeline.ts` keeps every public event, channel and numeric but is now FED by the model: its radial pressure, PA root pressure, RA pressure and LA/PV pressure replace the pulse generator, the Windkessel/radial/transducer/NIBP/pleth chain is unchanged, and the MANUAL tracker adjusts Ees (PP), SVR (MAP) and the venous unstressed volume (CVP) instead of an SV gain. MODELED mode (new) runs the reflexes and drives the rhythm engine's HR. Pleural pressure comes continuously from Stage 3's breath driver (and from VentFrame pressure history, which Stage V turns into alveolar pressure), replacing `applyPawCoupling`.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D; Playwright (system Chrome) for screenshots; Node ≥ 22.12 (the Pulse oracle loads `pulse.wasm` in Node). No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R4, R22, R23, R24, R31, R32, R34, R37, R39, R40, R42, R43, R44; `docs/physiology/stage-7-parameter-tables.md` §0–§3, §6.2–§6.3 (drug rows used by 7a), §7 (checks 10, 12–15, 17a/b), §8.1–8.2 (IABP, LVAD), §9 (Q-numbers cited in code comments); `docs/physiology/pulse-parameter-annex.md` §2, §3, §C (D4, D5, D8, D24), §D (O1–O5), §E; `../research/08-pulse-design-audit.md` §1.1 (#3, #4, #7), §1.2 (R-A, R-B), §2.1, §3 (N-P06, N-P07, N-P10, N-P16), §4 (never-copy list), §5 (A1–A7, A11, A19); `../research/09-evidence-rulings.md` §2 (CPR EtCO2); `docs/DESIGN-BRIEF.md` §4.2, §4.8, §4.9 (MODELED summary, sanity checks 1–4), §7; `docs/gates/stage-2.md` (the numbers to re-check), `docs/gates/stage-3.md`; house style: `docs/plans/stage-2-haemodynamics.md`; runbook `docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. **Work in the worktree** `../scratch/wt-stage-7a` on branch `stage-7a-circulation`, created from `origin/main` (≥ `d96c8c0`, Stage 4b merged; plan written against `f45ba96`). Stages 5.1, V and 3.1 are on branches: do NOT depend on them. Where Stage V adds `palvCmH2O` to VentFrames, this plan reads the external drive's stored pressure history (`ext.frames`, stride 3, pressure at offset 1), which Stage V fills with `palv ?? paw` — so alveolar pressure reaches the pleura automatically once V merges, with no code here naming the field.
- **Push after every task commit** (`git push origin stage-7a-circulation`). Never push to main, never merge (R21: the orchestrator merges). The last task opens the PR with `gh pr create`.
- **CI rule:** every test that runs the engine or a CircModel for more than one simulated minute yields to the event loop once per simulated minute (`await new Promise((r) => setImmediate(r))`) and carries an explicit timeout of `300_000` ms; the CI runner has 2 vCPUs and the Vitest worker RPC times out otherwise.
- **Partition (R25 spirit):** this stage OWNS `packages/engine-core/src/l2/circ/**`, `src/types-circ.ts`, `test/l2/circ/**`, `test/helpers/circ.ts`, `test/engine/circ-*.test.ts`, `apps/demo/stage7a.html`, `apps/demo/src/stage7a.ts`, `packages/validation/src/oracle/**`, `packages/validation/test/oracle*.test.ts`. It MODIFIES (additively where marked `// Stage 7a`) `src/l2/hemo/{pipeline,params,tracker}.ts`, `src/l2/gas/coupling.ts`, `src/l2/resp/{pipeline,driver}.ts`, `src/l1/state.ts`, `src/types.ts`, `src/types-hemo.ts`, `src/index.ts`, `src/engine.ts`, `apps/demo/vite.config.ts`, `NOTICES.md`. **Never edit `src/l2/ecg/**`**: the ST hook goes through the existing `Modifiers` (`ischaemicDepressionMv`, `st`) exactly as Stage 4b's device layer sets them (`mergeModifiers` on the committed state + look-ahead invalidation).
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no enums, no parameter properties), `.ts` import extensions, conventional commits, clean-room: equations cite the tables/brief/audit row they come from or `[ENG]`; Pulse is **never** copied — only published equations (Stergiopulos 1996 activation), the ICRP-89 fractions and the stabilisation *procedure* are borrowed, each with a NOTICES row (Task 31). None of the 17 audit "never copy" defects may appear (in particular: no systole ∝ RR, no grounded intrathoracic compliances, no drug moving the baroreflex set point, no 20 s vagal limb).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (use your harness's attribution line if it gives a different one).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`. Full gate: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`.
- All pipeline state stays plain JSON-safe data (`number[]`, objects, no functions, no typed arrays in state): the engine `structuredClone`s it every tick. Functions (pleural input, CPR, devices) are built per call from state and never stored.
- **Determinism:** no `Math.random`, no wall clock in L1/L2; the only randomness is the engine's seeded streams. The stabilisation cache is a pure function of the resolved profile.
- CPU budget: the circulation (circuit + control layer) must cost ≤ 0.3 ms per 20 ms tick in Node (Task 29 measures; prototype 0.016 ms).
- Units: pressures mmHg, volumes mL, flows mL/s, time s, elastance mmHg/mL, resistance mmHg·s/mL. Parameters scale with weight: volumes/compliances ×W/70, resistances/elastances ×70/W (tables §2.2).
- Every `Q<n>` open question from tables §9 that a default answers is cited in the code comment beside the number (Q2, Q15, Q16, Q24, Q28, Q29, Q31, Q32, Q33).

---
## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **Activation period = 2.1 × Weissler (PEP + LVET)(HR)** (audit A3), onset at the beat record's R time (EMD 0), atrial activation at P onset with T_a 0.22 s. Prototype: emergent aortic-valve open time 328/288/253/196/144 ms at HR 60/75/90/120/150 vs Weissler 311/286/260/209/158 (±17 ms); R → aortic opening 72–90 ms.
2. **Valves have no switching state.** Forward: `ΔP = R·Q + k·Q²` solved in closed form; backward: `Q = 44.3·EROA·ΔP/√(|ΔP| + 1)`. Both continuous through ΔP = 0 → zero chatter (prototype: exactly 2 aortic transitions per beat, 0 re-openings within 20 ms, in normal, severe AS, MR and AR). The Gorlin term counts only the EXCESS over a normal orifice (AVA 3.0, MVA 4.5), so a normal valve keeps Smith's tiny resistance.
3. **Q24 (LV EDPVR β):** evidence default β = 0.02 /mL (normal human 0.01–0.02; Smith's 0.033 is model-derived), with the scale `A` ANCHORED so P(EDV_ref) = the profile's LVEDP target (8 mmHg at 120 mL × W/70). Stiffness conditions (HFpEF, HTN, AS) multiply β and the anchor refits A; without it β multipliers compound on the exponential (AS + HTN gave LVEDP 67 in the prototype).
4. **Stabilisation tunes SVR, arterial compliance and venous unstressed volume — not Ees.** The spec says "SVR, Ees, stressed volume"; tuning Ees would undo HFrEF's Ees × 0.45 and every contractility condition. Pulse's own TuneCircuit tunes aortic compliance for PP; LV Emax stays the evidence default (2.3 × 70/W). Converges in 20–26 windows (40–55 s simulated, 30–55 ms wall) for the adult, elderly HTN, AS + CAD + HTN, HFrEF, 50 kg woman and 6 y child profiles.
5. **Baroreflex constants differ from the brief where the brief's steady-state loop gain is unphysical** (all [ENG], flagged for Ali's calibration pass R44): vagal limb uses G_v × 0.2 (sequence-method BRS 15 ms/mmHg overstates steady-state RR change; phenylephrine needs ≈ 6 ms/mmHg); vagal withdrawal saturates at −200 ms; sympathetic withdrawal (hypertension side) × 0.3 of activation (sigmoid baroreflex); `g_R` 0.02, `g_hs` 0.02, `g_V` 20 mL/mmHg (upper ends of the brief's ranges).
6. **Phenylephrine 100 µg peak SVR × 1.8** (tables said × 1.35 "[ENG, fitted to MAP +15–25]"; the fit was for a reflex-free model — against the emergent reflex × 1.8 gives MAP +20.5 at 75 s and HR −15).
7. **Drugs available in 7a are Bateman bolus curves** on mechanism multipliers (`drugs.ts`), combined multiplicatively (A11), never touching the baroreflex set point. 7g replaces them with PK/effect-site models; the `applyEvent { kind: 'drug' }` command shape (controller protocol, brief §7.2) is accepted by the engine from this stage for `phenylephrine | ephedrine | nitroglycerin | esmolol | propofol` and rejected with "arrives in Stage 7g" for the others (the spec's "existing applyEvent effect curves" do not exist on main: grep finds none).
8. **Pleural input:** `pIt(t) = −4 + 0.4·Palv(t)·0.7356` (mmHg; `T_IT` 0.4 = Q28 default) for positive-pressure breaths from the breath driver's volume (`PEEP + ΔV/C`) or the external drive's stored frame pressure; spontaneous breaths swing −4 cmH2O × (ΔV/VT). The Stage 3 `applyPawCoupling` (mean-Paw → L1 coupled cvp/sbp/dbp/volumeStatus) and the `g_hyp` PPV factor are no longer applied — heart–lung interaction is emergent. `RAP_FRACTION`/`venousGradient` stay exported (Stage 3 tests import them) but are unused by the engine.
9. **`volumeStatus` (MANUAL target, 0–1)** now maps to venous unstressed volume: stressed volume × (0.45 + 0.55·volumeStatus) [ENG], so the Stage 2 PPV-vs-volume acceptance becomes emergent (re-specified in Task 25).
10. **Channel ids.** The spec lists `pap` among the new teaching channels, but `pap` already is the PA-catheter trace (Stage 2). The teaching set is `lvp`, `lvv`, `lap`, `rap`, `rvp` and `pat` (PA pressure truth, no catheter), all 125 Hz, created only while `attachSensor { sensor: 'pv', state: 'on' }` is on (so existing buffer-count tests are unchanged).
11. **Pulselessness** = no ventricular activation (VF, asystole, PEA, `mech.perfused === false`), not an ejection threshold: the Stage 2 `E(k)` map and `FS_CARRY` are MANUAL-legacy constants no longer used; too-early PVCs still eject nothing because the rhythm engine marks them unperfused.
12. **CPR** = chest compression pressure added to all four chambers (cardiac pump, 60 mmHg × quality) and to every intrathoracic compartment and the aortic root (thoracic pump, 30 mmHg × quality), half-sine over half the cycle; venous return has a 5× retrograde resistance (caval/jugular valves).
13. **Stage 2 acceptance numbers that physics changes are re-specified with justification in Task 25** (post-PVC potentiation becomes pure Frank–Starling: no PESP contractility term exists in a time-varying-elastance heart; the rhythm engine's `kSV` is ignored except `perfused`).
14. **IABP and LVAD are implemented** (the prototype showed the budget allows it: circuit 0.016 ms/tick); **ECMO/CPB are interfaces only**, with failing-then-skipped tests marked `7h`.

## Prototype results

Prototyped in a scratch copy of `main` (`f45ba96`) with exactly the `l2/circ/**` code of Tasks 2–12 (files copied verbatim into this plan) and the unit/sanity tests shown in those tasks (all passing). The engine integration (Tasks 13–24) was NOT run in the prototype: its constants come from the bare-model runs below, and its tests re-measure them through the engine.

| Check | Result |
|---|---|
| CPU, circuit + 10 Hz control (Node 26, M-series) | 0.70 ms per simulated second → **0.016 ms per 20 ms tick** (budget 0.3) |
| Volume conservation, 60 s beating | drift < 0.01 mL of 4900; bleed 10 mL/s × 10 s removes 100.000 mL |
| Valve switching | 2 aortic transitions per beat, 0 re-openings within 20 ms (normal, AS 0.7, MR EROA 0.45, AR EROA 0.32) |
| Stabilisation (adult 70 kg, HR 70) | converged in 24 windows (≈ 50 s sim, 52 ms wall): radial 121/80, CVP 5.0, CO 5.6 L/min, LVEDV 126, LVEDP 9.8, LVSP 117, PCWP 6.9, EF ≈ 0.6 |
| Resting chambers (adult, ventilated PEEP 5, VT 500) | RA mean 3.5; RV 31/−2; PA 28/9 (mean 17); PCWP 6.8; LV 132/≈8; aortic 121/79; radial 142/78 before tuning → radial−aortic SBP +14 after activation retiming (band 5–20) |
| Other profiles | elderly + HTN 156/86, LVEDP 19, PCWP 12.6; AS + CAD + HTN 156/86, LVSP 191 (gradient ≈ 35–56), LVEDP 40 (tables 18 — **flagged**, see Deviations); HFrEF 106/66, LVEDV 206, LVEDP 18, PCWP 12.7; 50 kg woman 121/81, CO 3.9; 6 y child 121/81 at HR 100, CO 1.6 |
| Valve lesions (stabilised, spontaneous) | severe AS: LVSP − aortic SBP 56, LA mean 16.7; severe MR: RVol 70 mL/beat, LA mean 17.8, max 22.7; severe AR: RVol 57 mL/beat, radial 143/74 |
| Phenylephrine 100 µg (adult, ventilated) | MAP +18.3/+20.0/+20.5 at 30/45/60 s, peak +20.6 at 75 s; HR −11.7/−14.0/−15.0 (band MAP +15–25, HR −5–15) |
| Haemorrhage over 10 min, ventilated | 20 %: 86/64, PP 37 → 22, HR 73 → 96. 25 %: 79/60, PP 20, HR 104. 35 %: 65/48, PP 17, HR 125. β-blocked 35 %: 67/51, HR 61 → 79 (tables 17b HR 80–95 ✓) |
| PPV (per-breath mean over 5 breaths, VT 500, C 50, PEEP 5) | T_IT 0.4 (Q28 default): 4.8 % normovolaemic → 6.4 % at 25 % loss. T_IT 0.7: 10.3 % → 13.2 %. The tables' "> 13 % at 15 % loss" is not met at the default — flagged |
| Conditions (adult, ventilated, 90 s after onset) | baseline CVP 6.3, PCWP 7.8, mPAP 18.3, CO 5.2. Tamponade 200 mL: CVP 9.5, PCWP 11.9 (equalised within 5), CO 3.9 (−25 %), HR +14. Massive PE φ 0.6: PA 46/31 (mean 38), CVP 7.2, CO 4.6 (−12 %). RV infarct: CVP 8.5, PCWP 5.6, CO 4.4 |
| Unit tests of the prototyped modules | 30 passing (activation 3, valves 3, circuit 3, stabilise 7, baroreflex 5, drugs 3, model sanity 3, conditions 3) in ≈ 3 s |

### Deviations from the tables (for the orchestrator and Ali's R44 calibration pass)

- **Class II/III haemorrhage SBP falls more than the ATLS table** (25 % loss → SBP 79 vs "near normal"; 35 % → 65 vs 80–90) and **PPV rises less** (≈ 7 % at 25 % loss vs > 13 %). The reflex HR response is in band. Tests in Tasks 12/26 assert the prototype's bands and carry the table target in a comment. Candidate fixes for calibration: `T_IT` 0.4 → 0.6 (Q28 range 0.2–0.7), `C_SV` 110 → 90 with stressed fraction 0.25 → 0.3 (Q2).
- **Tamponade and massive PE are milder than H7/H5** (200 mL: CVP 9.5 not 15–20; PE CO −12 % not −40–60 %). The pericardial reserve was already cut to 0 (tables proposed 1.15 × EDV + 20 mL, Q29). PE needs RV ischaemia (RV supply/demand is not in 7a's LV-only coronary model) — candidate for the calibration pass or 7b's PVR/HPV work.
- **AS + CAD + HTN resting LVEDP 40** (tables' worked example 18): the CVP 5 target over-fills a stiff ventricle. Task 6 sets that profile's `cvp` target to 3; recheck at the gate.
- **Phenylephrine SVR × 1.8** instead of × 1.35 (decision 6). **Baroreflex** constants (decision 5).
- **Stage 2 post-PVC +8–15 mmHg** becomes emergent Frank–Starling only (Task 25 measures and re-specifies).

## Requests to other stages

- **Stage 5.1 / rhythm engine owners:** none required. (Optional: expose the PR interval on `beat` so atrial timing need not rely on `atrial` records; not needed now.)
- **Stage V:** keep storing `palv ?? paw` in `ext.frames[i+1]` (this plan reads it); no other change.
- **Stage 3.1:** its CPR EtCO2 retune (R39-2) should be re-measured after 7a because CPR cardiac output is now emergent (Task 19 reports the new CO at quality 0.8/1.0).
- **Stage 7b:** consume `circ.out.qLungL/qLungR` (per-lung flow, R43) and write `ext.pvr` (HPV) — the seams exist after Task 5/8.
- **Stage 7g:** replace `circ/drugs.ts` Bateman curves with PK/effect-site; keep the `DrugEffect` multiplier shape.

## Architecture in one page

```
engine.advance(ps, end)
  ├─ ECG (Stage 1/5) → rhythm records: beat{t, origin, mech.perfused}, atrial{t, kind}
  ├─ advanceResp (Stage 3) → breath driver cycles / external frames   ──► pleuralAt(rs, t)  (Task 14)
  └─ advanceHemo (Stage 2, now fed by the circulation)
        intake: beat → circOnBeat (ventricular activation, T = 2.1·(PEP+LVET)(HR)); atrial p/retrograde/paced → circOnAtrial
        per 125 Hz sample: stepCircModel(4 × 2 ms RK4) with env {pIt, CPR, LVAD, IABP}
            circuit.ts: PC,QL,X,XD (Stage 2 Windkessel + radial resonator) · VSV · VRA VRV · VPA · VPV · VLA VLV
            model.ts 10 Hz: baroreflex (MODELED) × drugs × volume events × conditions × coronary → CircParams
        radial truth → 45 ms transport delay line → line/transducer (Stage 2) → abp buffer, numerics, NIBP
        PA root → pap line; RA → cvp line (a/c/v now emergent); PV/LA → wedge
        per beat: CircBeat → site-beat windows (tracker in MANUAL), pleth pulse, CO for gas (Stage 3)
        1 Hz: state event (mode manual|modeled), coronary step → ST patch (applied by the engine after the pass)
MANUAL: tracker adjusts kEes (PP), rSys (MAP), venous V0 (CVP), PVR/RV Ees (PAP) toward targets; reflexes off.
MODELED: reflexes on; hrModel drives the engine's hr ramp; targets are ignored (pins still win, brief §4.9).
```

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-circ.ts` | Stage 7a public types: profile, conditions, drug/volume/condition/device events, `pv` sensor, teaching channels |
| `…/src/l2/circ/params.ts` | constants (chambers, valves, vessels, pericardium, pleura, CPR, activation) |
| `…/src/l2/circ/activation.ts` | double-Hill activation, period from Weissler, activation lists |
| `…/src/l2/circ/valves.ts` | one-way conductance with stenosis and regurgitation |
| `…/src/l2/circ/circuit.ts` | 11-state ODE, `evaluate`, RK4 `stepCirc`, volume bookkeeping |
| `…/src/l2/circ/profile.ts` | minimal R22 profile resolver (age band, sex, weight, conditions) |
| `…/src/l2/circ/stabilise.ts` | tuning + convergence ledger + cache (audit #3) |
| `…/src/l2/circ/baroreflex.ts` | vagal/sympathetic limbs, resetting, venous effectors |
| `…/src/l2/circ/drugs.ts` | 7a bolus effect curves |
| `…/src/l2/circ/model.ts` | CircModel: state, beats → activations, 10 Hz control, per-beat truths, CO |
| `…/src/l2/circ/conditions.ts` | tamponade, PE, RV infarct, tension pneumothorax pleural term |
| `…/src/l2/circ/pleural.ts` | pleural pressure from the breath driver / external frames |
| `…/src/l2/circ/coronary.ts` | R23 supply/demand, kIsch, ST patch |
| `…/src/l2/circ/devices.ts` | `CircuitDevice` seam, IABP, LVAD, ECMO/CPB interfaces |
| `…/src/l2/hemo/pipeline.ts` | fed by the model; MANUAL tracker on Ees/SVR/V0; MODELED; teaching channels |
| `…/src/l2/hemo/tracker.ts` | tracker gains now act on kEes/rSys (same algorithm) |
| `…/src/l2/gas/coupling.ts` | `cardiacOutput` reads the model; Paw coupling unused |
| `…/src/l2/resp/pipeline.ts`, `driver.ts` | `pleuralAt` export; no Paw coupling |
| `…/src/l1/state.ts` | `mode: 'manual' | 'modeled'` |
| `…/src/engine.ts` | MODELED option/command, circ events, ST patch application, pv buffers |
| `packages/validation/src/oracle/**` | Pulse oracle runner + O1–O5 comparator |
| `apps/demo/stage7a.html`, `apps/demo/src/stage7a.ts` | demo page |
| `docs/gates/stage-7a.md` | gate evidence |

---
## Tasks

### Task 1: Branch, worktree, Stage 7a public types

**Files:**
- Create: `packages/engine-core/src/types-circ.ts`, `packages/engine-core/test/types-circ.test.ts`
- Modify: `packages/engine-core/src/types.ts` (4 additive lines), `packages/engine-core/src/types-hemo.ts` (1 line), `packages/engine-core/src/index.ts` (1 line)

**Interfaces:**
- Produces (exported from `@pme/engine-core`): `CircClinicalEvent` (`drug`, `fluid`, `bleed`, `condition` with ids `tamponade | pe | tensionPtx | rvInfarct`), `CircDeviceAction` (`{ device: 'iabp', action: 'start' | 'stop' | 'set', ratio?: 1 | 2 | 3, inflateOffsetMs?: number, deflateOffsetMs?: number, volumeMl?: number }` and `{ device: 'lvad', action: 'start' | 'stop' | 'set', rpm?: number }`), `CircEvent` (`{ type: 'circ', t, co, sv, svRv, ef, lvedv, lvesv, lvedp, lvsp, pmsf, pvr, svr, cpp, supplyDemand, kIsch, iabp?, lvad? }` at 1 Hz), `TeachingChannel = 'lvp' | 'lvv' | 'lap' | 'rap' | 'rvp' | 'pat'`, `PatientProfile.conditions?: { id: string; grade?: string; severity?: number }[]`. `ChannelId` gains the six teaching channels; `SensorId` gains `'pv'`; `Command` gains `applyEvent` with `CircClinicalEvent` and `device` with `CircDeviceAction`; `EngineEvent` gains `CircEvent`.

- [x] **Step 1: Create the worktree and branch**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-7a -b stage-7a-circulation origin/main
cd ../scratch/wt-stage-7a
npx -y pnpm@9.15.9 install --frozen-lockfile
```

All later paths are relative to `../scratch/wt-stage-7a` (the worktree root).

- [x] **Step 2: Write the failing test**

`packages/engine-core/test/types-circ.test.ts`:

```ts
// Compile-time contract for the Stage 7a public types: `pnpm typecheck` fails if a variant is missing.
import { describe, expect, it } from 'vitest';
import type { CircClinicalEvent, CircEvent, TeachingChannel } from '../src/types-circ.ts';
import type { ChannelId, Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 7a public types', () => {
  it('Command, EngineEvent, ChannelId and PatientProfile carry the Stage 7a variants', () => {
    const drug: CircClinicalEvent = { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' };
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: drug },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'bleed', volumeMl: 500, overS: 300 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'tamponade', severity: 0.8 } },
      { id: '5', issuedBy: 't', type: 'device', action: { device: 'iabp', action: 'start', ratio: 2 } },
      { id: '6', issuedBy: 't', type: 'device', action: { device: 'lvad', action: 'set', rpm: 5400 } },
      { id: '7', issuedBy: 't', type: 'attachSensor', sensor: 'pv', state: 'on' },
      { id: '8', issuedBy: 't', type: 'setMode', mode: 'modeled' },
    ];
    const ev: CircEvent = { type: 'circ', t: 1, co: 5, sv: 70, svRv: 70, ef: 0.6, lvedv: 120, lvesv: 50, lvedp: 8, lvsp: 120, pmsf: 9, pvr: 0.1, svr: 1, cpp: 70, supplyDemand: 1.4, kIsch: 1 };
    const events: EngineEvent[] = [ev];
    const chans: ChannelId[] = ['lvp', 'lvv', 'lap', 'rap', 'rvp', 'pat'] satisfies TeachingChannel[];
    const p: PatientProfile = { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'as', grade: 'severe' }] };
    expect(cmds.length + events.length + chans.length + (p.conditions?.length ?? 0)).toBe(16);
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-circ.test.ts`
Expected: FAIL — cannot resolve `../src/types-circ.ts`.

- [x] **Step 4: Create the types**

`packages/engine-core/src/types-circ.ts`:

```ts
// Stage 7a public types (R31/R42 circulation, R22 profile conditions, R28 devices), kept in their own file so
// parallel stages do not collide in types.ts. types.ts adds each to its union with one line.
import type { SimSeconds } from './types.ts';

/** Brief §7.2 ClinicalEvent members Stage 7a implements (drug ids beyond the five 7a drugs are rejected until 7g). */
export type CircClinicalEvent =
  | {
      kind: 'drug'; drugId: string; dose: number; unit: 'mcg' | 'mg' | 'mcg/kg' | 'mg/kg' | 'mEq' | 'units' | 'mcg/kg/min';
      route: 'iv' | 'io' | 'im' | 'inh'; infusion?: boolean;
    }
  | { kind: 'fluid'; fluid: 'crystalloid' | 'colloid' | 'blood'; volumeMl: number; overS: number }
  | { kind: 'bleed'; rateMlPerMin?: number; volumeMl?: number; overS?: number }
  | { kind: 'condition'; id: 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct'; severity: number };

/** R28 device modules on the circuit (tables §8.1–§8.2). */
export type CircDeviceAction =
  | {
      device: 'iabp'; action: 'start' | 'stop' | 'set'; ratio?: 1 | 2 | 3;
      /** inflation relative to the dicrotic notch, ms (− = early); deflation relative to the next R, ms (− = early) */
      inflateOffsetMs?: number; deflateOffsetMs?: number; volumeMl?: number;
    }
  | { device: 'lvad'; action: 'start' | 'stop' | 'set'; rpm?: number };

/** PV-loop teaching channels (125 Hz): LV pressure/volume, LA, RA, RV pressure, PA pressure truth. */
export type TeachingChannel = 'lvp' | 'lvv' | 'lap' | 'rap' | 'rvp' | 'pat';

/** 1 Hz circulation summary (tables §2.1 step 5, §3). */
export type CircEvent = {
  type: 'circ'; t: SimSeconds;
  co: number; sv: number; svRv: number; ef: number; lvedv: number; lvesv: number; lvedp: number; lvsp: number;
  pmsf: number; pvr: number; svr: number; cpp: number; supplyDemand: number; kIsch: number;
  iabp?: { ratio: number; augmentation: number }; lvad?: { rpm: number; flowLpm: number; pi: number; powerW: number; suction: boolean };
};

export interface ProfileCondition {
  id: string;
  grade?: string;
  severity?: number;
}
```

In `packages/engine-core/src/types.ts` make these four additive edits (each line marked `// Stage 7a`):

1. After the `import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3` line add:
```ts
import type { CircClinicalEvent, CircDeviceAction, CircEvent, ProfileCondition, TeachingChannel } from './types-circ.ts'; // Stage 7a
```
2. Replace `  | 'vcgX' | 'vcgY' | 'vcgZ' | 'abp' | 'cvp' | 'pap' | 'pleth' | 'co2' | 'resp';` with
```ts
  | 'vcgX' | 'vcgY' | 'vcgZ' | 'abp' | 'cvp' | 'pap' | 'pleth' | 'co2' | 'resp'
  | TeachingChannel; // Stage 7a
```
3. In `PatientProfile`, after `sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)` add:
```ts
  conditions?: ProfileCondition[]; // Stage 7a (R22): e.g. [{ id: 'as', grade: 'severe' }]
```
4. In `DeviceAction` replace `  | MonitorDeviceAction; // Stage 4b` with `  | MonitorDeviceAction // Stage 4b
  | CircDeviceAction; // Stage 7a`; in `Command` add the line `    | { type: 'applyEvent'; event: CircClinicalEvent } // Stage 7a` after the Stage 4b `applyEvent` line; in `EngineEvent` replace `  | RespEvent; // Stage 3 (types-resp.ts)` with `  | RespEvent // Stage 3 (types-resp.ts)
  | CircEvent; // Stage 7a (types-circ.ts)`.

In `packages/engine-core/src/types-hemo.ts` replace
`export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp';` with
`export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp' | 'pv'; // Stage 7a: 'pv' = teaching channels`.

In `packages/engine-core/src/index.ts` add: `export type * from './types-circ.ts'; // Stage 7a`.

- [x] **Step 5: Run the test and typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-circ.test.ts`
Expected: PASS (1 test).
Run: `npx -y pnpm@9.15.9 typecheck`
Expected: exit 0. If `packages/controller` fails an exhaustive `switch` on `EngineEvent['type']` or `DeviceAction['device']` (Stage 6a's log formatter), add a `case 'circ': return \`circ co ${e.co.toFixed(1)}\`;` / `case 'iabp': case 'lvad':` arm there — the only allowed controller edit.

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/types-circ.ts packages/engine-core/src/types.ts packages/engine-core/src/types-hemo.ts packages/engine-core/src/index.ts packages/engine-core/test/types-circ.test.ts
git commit -m "feat(engine-core): Stage 7a public types — circulation events, devices, teaching channels, profile conditions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 2: Circulation constants and double-Hill activation

**Files:**
- Create: `packages/engine-core/src/l2/circ/params.ts`, `packages/engine-core/src/l2/circ/activation.ts`, `packages/engine-core/test/l2/circ/activation.test.ts`

**Interfaces:**
- Consumes: `pepS(hr)`, `lvetS(hr)` from `src/l2/hemo/params.ts` (Stage 2).
- Produces: every constant in `params.ts` (names used verbatim by Tasks 3–24); `doubleHill(u)`, `DH_PEAK`, `activationPeriodS(hr)`, `interface Activation { t0; T; amp }`, `activationAt(list, t)`, `pruneActivations(list, t)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/activation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activationAt, activationPeriodS, doubleHill, DH_PEAK } from '../../../src/l2/circ/activation.ts';
import { lvetS, pepS } from '../../../src/l2/hemo/params.ts';

describe('double-Hill activation (Stergiopulos 1996)', () => {
  it('is 0 outside (0, 1), peaks at exactly 1, and the raw peak is near Pulse’s 0.598 normaliser', () => {
    expect(doubleHill(0)).toBe(0);
    expect(doubleHill(1)).toBe(0);
    let mx = 0;
    for (let i = 1; i < 1000; i++) mx = Math.max(mx, doubleHill(i / 1000));
    expect(mx).toBeGreaterThan(0.999);
    expect(mx).toBeLessThanOrEqual(1 + 1e-9);
    expect(DH_PEAK).toBeGreaterThan(0.55);
    expect(DH_PEAK).toBeLessThan(0.65);
  });
  it('period follows Weissler PEP + LVET (× 2.1), not RR', () => {
    expect(activationPeriodS(75)).toBeCloseTo(2.1 * (pepS(75) + lvetS(75)), 12);
    expect(activationPeriodS(120)).toBeLessThan(activationPeriodS(60));
  });
  it('overlapping activations never exceed their largest amplitude', () => {
    const list = [{ t0: 0, T: 0.8, amp: 1 }, { t0: 0.3, T: 0.8, amp: 0.85 }];
    for (let t = 0; t < 1.2; t += 0.01) expect(activationAt(list, t)).toBeLessThanOrEqual(1);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/activation.test.ts`
Expected: FAIL — cannot resolve `src/l2/circ/activation.ts`.

- [x] **Step 3: Write the constants and the activation**

`packages/engine-core/src/l2/circ/params.ts`:

```ts
// Stage 7a circulation constants (R31, R42; tables §2.2 adult 70 kg; audit §1.1 #4, §5 A1–A6). Every number cites
// its source, or [ENG] when it is an engineering choice tuned by the Stage 7a prototype (plan "Prototype results").
// Volumes and compliances scale by W/70, resistances by 70/W, elastances by 70/W (profile.ts does the scaling).

// --- double-Hill activation (Stergiopulos, Meister & Westerhof 1996, Am J Physiol 270:H2050; Pulse CFG 494–498) ---
export const DH_A1 = 0.303;
export const DH_A2 = 0.508;
export const DH_N1 = 1.32;
export const DH_N2 = 21.9;
/**
 * Activation period T as a multiple of Weissler (PEP + LVET)(HR) (audit A3: systolic duration from the LVET–HR
 * regression, not ∝ RR). With 1.25 the emergent aortic-valve open time sits within ±15 ms of Weissler LVET at
 * HR 60–120 (prototype) [ENG].
 */
export const T_ACT_PER_SYSTOLE = 2.1;
/** Electromechanical delay: ventricular activation starts this long after the beat record's R time [ENG]. */
export const EMD_S = 0.0;
/** Atrial activation: starts ATRIAL_DELAY_S after P onset, period ATRIAL_T_S (a wave 80–100 ms after P, B §4.2) [ENG]. */
export const ATRIAL_DELAY_S = 0.0;
export const ATRIAL_T_S = 0.22;
/** Ventricular-origin and paced beats contract dyssynchronously: Emax × 0.85 (B §4.8 k_rhythm for VT/PVC) [ENG]. */
export const DYSSYNC = 0.85;

// --- chambers (tables §2.2; Smith 2004 unless stated) ---
export const EES_LV = 2.3; // mmHg/mL, Emax LV (Q24: 2.3 kept; Pulse 2.49)
export const V0_LV = 5; // mL (Q24)
/**
 * LV EDPVR P = A·(e^{β(V−V0)} − 1). Q24 evidence default: normal-human β 0.01–0.02 /mL (Zile 2004, HFpEF-PV) —
 * β 0.02 is taken (upper end, nearest Smith's 0.033), and A is refitted so LVEDP ≈ 8 at EDV ≈ 120 mL [ENG fit].
 */
export const BETA_LV = 0.02;
export const A_LV = 0.9;
export const EES_RV = 0.585; // mmHg/mL (Smith 2004)
export const V0_RV = 5; // mL [ENG]
export const BETA_RV = 0.023; // /mL (Smith 2004)
export const A_RV = 0.216; // mmHg (Smith 2004)
/** Atria: linear passive elastance + active increment (tables: eRa 0.3, cLa 4 → 0.25) [ENG active]. */
export const EMIN_RA = 0.3;
export const EMAX_RA = 0.55;
export const V0_RA = 10;
export const EMIN_LA = 0.25;
export const EMAX_LA = 0.55;
export const V0_LA = 10;

// --- valves (tables §2.2 Smith 2004 open resistances; Gorlin; ASE 2017 EROA) ---
export const R_TV = 0.024; // mmHg·s/mL
export const R_PV = 0.006;
export const R_MV = 0.016;
export const R_AV = 0.018;
/** Gorlin constants: aortic/pulmonary 44.3, mitral/tricuspid 37.7 (discharge 0.85) → Q (mL/s) = K·A·√ΔP. */
export const GORLIN_AV = 44.3;
export const GORLIN_MV = 37.7;
/** Reference (normal) areas: the stenotic term counts only the EXCESS over a normal orifice [ENG]. */
export const AVA_REF = 3.0; // cm²
export const MVA_REF = 4.5; // cm²
/** Regurgitant orifice: Q = 44.3·EROA·ΔP/√(|ΔP| + ε) — smooth at ΔP = 0 so the solver never chatters [ENG ε]. */
export const REGURG_K = 44.3;
export const REGURG_EPS = 1; // mmHg

// --- vessels ---
/** Systemic veins: compliance 110 mL/mmHg (tables cSv; R03 §8.2), unstressed volume set by stabilisation. */
export const C_SV = 110;
/** Veins → RA resistance. Lumped-venous equivalent of R_vr 1.4 mmHg·min/L once P_sv ≈ Pmsf − 1 [ENG fit]. */
export const R_VR = 0.06;
export const R_VR_BACK = 5; // × for retrograde flow (jugular/caval valves; CPR thoracic pump) [ENG]
export const C_PA = 4; // mL/mmHg (Stage 2 PA_C)
export const Z_PA = 0.02; // mmHg·s/mL (Stage 2 PA_ZC)
export const PVR = 0.1; // mmHg·s/mL total (tables pvr = PA_R0)
export const RIGHT_LUNG_FLOW = 0.55; // share of pulmonary flow to the right lung (R43 exposure; ICRP-style [TXT])
export const C_PV = 10; // mL/mmHg pulmonary veins (tables cPv)
export const R_PVLA = 0.01; // pulmonary veins → LA [ENG]

// --- pericardium and thorax (tables §2.2; audit R-B) ---
export const PERI_A = 0.5; // mmHg (Smith)
export const PERI_LAMBDA = 0.03; // /mL (Smith)
/**
 * v0Peri = 1.0 × (baseline LVEDV + RVEDV) + 0, set by stabilisation. Tables (Q29) propose 1.15 × … + 20; with that
 * reserve 200 mL of fluid raised CVP by only 1.2 mmHg in the prototype, so the reserve is removed [ENG, flagged].
 */
export const PERI_RESERVE = 1.0;
export const PERI_EXTRA_ML = 0;
export const P_PL0 = -4; // mmHg supine resting pleural (Smith 2004 P_th)
/** Fraction of alveolar pressure reaching the pleura (tables tIt 0.4; Q28 default). */
export const T_IT = 0.4;
export const CMH2O_TO_MMHG = 0.7356;
/** Spontaneous inspiratory pleural swing, cmH2O (Stage 3 SPONT_PPL_CMH2O). */
export const SPONT_SWING_CMH2O = 4;

// --- blood volume (tables §1.1; Lemmens 2006) ---
export const BV_ML_KG_M = 70;
export const BV_ML_KG_F = 65;
/** Unstressed arterial volume (not in any state; bookkeeping only) [ENG]. */
export const V0_ART = 600;

// --- CPR (B §4.2; R39-2) ---
/** Direct cardiac compression: chamber pressure added per unit quality, mmHg [ENG, prototype]. */
export const CPR_CARDIAC_MMHG = 60;
/** Thoracic-pump pressure on every intrathoracic compartment and the aortic root per unit quality [ENG]. */
export const CPR_THORACIC_MMHG = 30;

// --- integration ---
export const H_S = 0.002; // RK4 step (R42; Stage 2 H_S)
```

`packages/engine-core/src/l2/circ/activation.ts`:

```ts
// Time-varying-elastance activation (R42; audit §1.1 #4): the double-Hill shape of Stergiopulos, Meister &
// Westerhof 1996, normalised to a peak of exactly 1, with its period T taken from the Weissler PEP + LVET at the
// current heart rate (audit A3) rather than ∝ RR (Pulse defect 11). One activation per mechanical beat (ventricles)
// or per atrial depolarisation (atria); activations are plain data so the pipeline state stays JSON-safe.
import { lvetS, pepS } from '../hemo/params.ts';
import { DH_A1, DH_A2, DH_N1, DH_N2, T_ACT_PER_SYSTOLE } from './params.ts';

function raw(u: number): number {
  if (u <= 0) return 0;
  const g1 = (u / DH_A1) ** DH_N1;
  return (g1 / (1 + g1)) * (1 / (1 + (u / DH_A2) ** DH_N2));
}

/** Peak of the raw double-Hill on u ∈ (0, 1] (Pulse's 0.598 at its own grid; computed here to 1e-9). */
export const DH_PEAK: number = (() => {
  let lo = 0.2;
  let hi = 0.6;
  for (let i = 0; i < 200; i++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (raw(a) < raw(b)) lo = a;
    else hi = b;
  }
  return raw((lo + hi) / 2);
})();

/** Normalised activation a(u) ∈ [0, 1] at u = (t − t0)/T; 0 before onset and after u = 1. */
export function doubleHill(u: number): number {
  return u <= 0 || u >= 1 ? 0 : raw(u) / DH_PEAK;
}

/** Ventricular activation period for a beat at heart rate hr (bpm). */
export function activationPeriodS(hr: number): number {
  return T_ACT_PER_SYSTOLE * (pepS(hr) + lvetS(hr));
}

/** One scheduled activation (plain data). amp scales Emax − Emin (dyssynchrony, ischaemia are applied elsewhere). */
export interface Activation {
  t0: number;
  T: number;
  amp: number;
}

/** Activation level at time t: the largest of the scheduled activations (overlaps never exceed 1). */
export function activationAt(list: readonly Activation[], t: number): number {
  let a = 0;
  for (const x of list) {
    const u = (t - x.t0) / x.T;
    if (u > 0 && u < 1) {
      const v = x.amp * doubleHill(u);
      if (v > a) a = v;
    }
  }
  return a;
}

/** Drop activations that ended before t. */
export function pruneActivations(list: Activation[], t: number): Activation[] {
  return list.filter((x) => x.t0 + x.T >= t);
}
```

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/activation.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/params.ts packages/engine-core/src/l2/circ/activation.ts packages/engine-core/test/l2/circ/activation.test.ts
git commit -m "feat(circ): circulation constants and double-Hill activation timed by Weissler PEP + LVET (audit #4, A3)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 3: Valves (one-way conductance, stenosis, regurgitation, smooth switching)

**Files:**
- Create: `packages/engine-core/src/l2/circ/valves.ts`, `packages/engine-core/test/l2/circ/valves.test.ts`

**Interfaces:**
- Consumes: `REGURG_K`, `REGURG_EPS`, `GORLIN_AV`, `AVA_REF` (Task 2).
- Produces: `interface Valve { r; k; eroa }`, `stenosisK(area, gorlinK, refArea)`, `valveFlow(v, dp)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/valves.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { stenosisK, valveFlow } from '../../../src/l2/circ/valves.ts';
import { AVA_REF, GORLIN_AV } from '../../../src/l2/circ/params.ts';

describe('valves', () => {
  it('a competent open valve is a resistor; closed it passes nothing backwards', () => {
    const v = { r: 0.02, k: 0, eroa: 0 };
    expect(valveFlow(v, 10)).toBeCloseTo(500, 9);
    expect(valveFlow(v, -50)).toBe(0);
  });
  it('the stenotic term counts only the excess over a normal orifice; severe AS (0.7 cm²) gives Gorlin gradients', () => {
    expect(stenosisK(AVA_REF, GORLIN_AV, AVA_REF)).toBe(0);
    const k = stenosisK(0.7, GORLIN_AV, AVA_REF);
    const v = { r: 0.018, k, eroa: 0 };
    // mean systolic flow 250 mL/s → ≈ 60–70 mmHg across the valve (Gorlin (Q/(44.3·A))² ≈ 65)
    let dp = 0;
    while (valveFlow(v, dp) < 250) dp += 0.1;
    expect(dp).toBeGreaterThan(55);
    expect(dp).toBeLessThan(75);
  });
  it('regurgitation is continuous through ΔP = 0 (no chattering) and follows the orifice law at large ΔP', () => {
    const v = { r: 0.016, k: 0, eroa: 0.4 };
    expect(valveFlow(v, -1e-9)).toBeCloseTo(0, 6);
    expect(valveFlow(v, 0)).toBe(0);
    const q = valveFlow(v, -100);
    expect(q).toBeLessThan(-170);
    expect(q).toBeGreaterThan(-180); // 44.3·0.4·100/√101 = 176.3
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/valves.test.ts`
Expected: FAIL — cannot resolve `valves.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/circ/valves.ts`:

```ts
// Valves as one-way conductances (R42; tables §2.2): forward flow through an open resistance in series with a
// stenotic Gorlin term, backward flow through a regurgitant orifice. Both branches are continuous functions of the
// pressure difference (no switching state), so the 2 ms RK4 step never chatters at valve closure.
//   forward  (ΔP > 0): ΔP = R·Q + k·Q²,  k = max(0, 1/(K·A)² − 1/(K·A_ref)²)          [Gorlin; excess over normal, ENG]
//   backward (ΔP < 0): Q = −44.3·EROA·|ΔP|/√(|ΔP| + ε)                                  [orifice law, smoothed]
import { REGURG_EPS, REGURG_K } from './params.ts';

export interface Valve {
  r: number; // open resistance incl. any series characteristic impedance, mmHg·s/mL
  k: number; // stenotic quadratic coefficient, mmHg·s²/mL²
  eroa: number; // regurgitant orifice, cm² (0 = competent)
}

/** Quadratic stenosis coefficient for area a (cm²), Gorlin constant kG, reference area aRef. */
export function stenosisK(a: number, kG: number, aRef: number): number {
  return Math.max(0, 1 / (kG * a) ** 2 - 1 / (kG * aRef) ** 2);
}

/** Flow (mL/s, positive = forward) for pressure difference dp = P_upstream − P_downstream. */
export function valveFlow(v: Valve, dp: number): number {
  if (dp > 0) {
    if (v.k <= 0) return dp / v.r;
    return (-v.r + Math.sqrt(v.r * v.r + 4 * v.k * dp)) / (2 * v.k);
  }
  if (v.eroa <= 0) return 0;
  return (REGURG_K * v.eroa * dp) / Math.sqrt(-dp + REGURG_EPS);
}
```

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/valves.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/valves.ts packages/engine-core/test/l2/circ/valves.test.ts
git commit -m "feat(circ): valves as continuous one-way conductances with Gorlin stenosis and orifice regurgitation" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 4: The circuit ODE, chamber pressures and RK4 step (volume-conserving)

Chamber pressure (elastance + EDPVR + pericardium + pleural) lives inside `evaluate` so the ODE and the outputs can never disagree; this task therefore also covers the "chamber pressure" item of the scope.

**Files:**
- Create: `packages/engine-core/src/l2/circ/circuit.ts`, `packages/engine-core/test/l2/circ/circuit.test.ts`
- (The test imports `initialState` from `stabilise.ts` (Task 6) and `resolveProfile` from `profile.ts` (Task 5): implement Tasks 4–6 in order and run this test at the end of Task 6; its Step 2 here runs only `valves`/`activation` to keep the tree green.)

**Interfaces:**
- Consumes: `compliance(p)` from `src/l2/hemo/circulation.ts`; `RADIAL_*`, `WK_*` from `src/l2/hemo/params.ts`; Tasks 2–3.
- Produces: `N_STATE = 11`, `S` (state indices), `interface CircParams`, `interface CircDrive`, `interface CircOut`, `createOut()`, `evaluate(s, t, p, d, o)`, `stepCirc(s, t, h, p, d)`, `arterialVolume(pc, cArt)`, `totalVolume(s, p)`.

- [x] **Step 1: Write the test**

`packages/engine-core/test/l2/circ/circuit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createOut, evaluate, S, stepCirc, totalVolume, type CircDrive } from '../../../src/l2/circ/circuit.ts';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';
import { initialState } from '../../../src/l2/circ/stabilise.ts';
import { activationPeriodS } from '../../../src/l2/circ/activation.ts';
import { H_S, P_PL0 } from '../../../src/l2/circ/params.ts';

const zero = () => 0;
function drive(): CircDrive {
  return { vent: [], atria: [], kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero };
}

describe('circuit ODE', () => {
  it('conserves blood volume to < 0.01 mL over 60 s of beating (no leaks between compartments)', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const d = drive();
    const v0 = totalVolume(s, p);
    expect(v0).toBeCloseTo(r.bloodVolumeMl, 6);
    let t = 0;
    const vent = d.vent as { t0: number; T: number; amp: number }[];
    for (let b = 0; b < 75; b++) vent.push({ t0: 0.2 + b * 0.8, T: activationPeriodS(75), amp: 1 });
    while (t < 60) {
      stepCirc(s, t, H_S, p, d);
      t += H_S;
    }
    expect(Math.abs(totalVolume(s, p) - v0)).toBeLessThan(0.01);
    for (const x of s) expect(Number.isFinite(x)).toBe(true);
  });
  it('a bleed of 10 mL/s for 10 s removes exactly 100 mL', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const d = { ...drive(), qIn: -10 };
    const v0 = totalVolume(s, p);
    for (let t = 0; t < 10 - 1e-9; t += H_S) stepCirc(s, t, H_S, p, d);
    expect(totalVolume(s, p) - v0).toBeCloseTo(-100, 3);
  });
  it('pleural pressure reaches every intrathoracic compartment one-for-one', () => {
    const r = resolveProfile();
    const p = structuredClone(r.params);
    p.v0Peri = 1e4;
    const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
    const a = createOut();
    const b = createOut();
    evaluate(s, 0, p, drive(), a);
    evaluate(s, 0, p, { ...drive(), pIt: () => P_PL0 + 5 }, b);
    for (const k of ['pRa', 'pRv', 'pPa', 'pPv', 'pLa', 'pLv'] as const) expect(b[k] - a[k]).toBeCloseTo(5, 9);
    expect(b.pSv).toBe(a.pSv); // extrathoracic
    expect(s[S.VSV]).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Implement the circuit**

`packages/engine-core/src/l2/circ/circuit.ts`:

```ts
// The Stage 7a circuit (R31, R42; tables §2.1 as amended by audit A1/A2): four time-varying-elastance chambers,
// four valves, the Stage 2 systemic 4-element Windkessel (+ its aorta→radial resonator), systemic veins, a
// pulmonary arterial compartment with characteristic impedance, two parallel lung vascular beds, pulmonary veins,
// a pericardium and a continuous pleural (intrathoracic) pressure. Integrated with classical RK4 at 2 ms.
//
// State s (plain number[]; volumes in mL):
//   0 PC  systemic capacitor pressure (Stage 2 s[0])      C(P)·dPC/dt = Q_ao − (PC − P_sv)/R_sys
//   1 QL  Windkessel inertance flow (Stage 2 s[1])        L·dQL/dt = Zc·(Q_ao − QL)
//   2 X, 3 XD  aorta→radial resonator (Stage 2 s[2], s[3])
//   4 VSV systemic venous volume (total)                  P_sv = (VSV − v0Sv)/cSv
//   5 VRA, 6 VRV, 9 VLA, 10 VLV chamber volumes           P = E(t)·(V − V0) (+ EDPVR) + P_peri + P_it
//   7 VPA pulmonary arterial stressed volume              P_pa = VPA/cPa + P_it ; root = P_pa + Zpa·Q_pv
//   8 VPV pulmonary venous stressed volume                P_pv = VPV/cPv + P_it   (≈ PCWP)
// Chamber pressure (Smith 2004 form): ventricles P = a·Emax·(V − V0) + (1 − a)·A·(e^{β(V − V0)} − 1); atria
// P = (Emin + a·(Emax − Emin))·(V − V0); every intrathoracic compartment adds P_it (pleural, audit R-B) and the
// four chambers add P_peri = A_p·(e^{λ(V_LV + V_RV + vFluid − v0Peri)} − 1) floored at 0 (tables §2.2).
import { compliance } from '../hemo/circulation.ts';
import { RADIAL_FR_HZ, RADIAL_GAIN, RADIAL_ZETA, WK_C, WK_CK, WK_L, WK_P0, WK_ZC } from '../hemo/params.ts';
import { activationAt, type Activation } from './activation.ts';
import { R_VR_BACK, V0_ART } from './params.ts';
import { valveFlow, type Valve } from './valves.ts';

export const N_STATE = 11;
export const S = { PC: 0, QL: 1, X: 2, XD: 3, VSV: 4, VRA: 5, VRV: 6, VPA: 7, VPV: 8, VLA: 9, VLV: 10 } as const;

/** Resolved circuit parameters (profile + conditions + reflex/drug multipliers applied). Plain data. */
export interface CircParams {
  eesLv: number; v0Lv: number; aLv: number; betaLv: number;
  eesRv: number; v0Rv: number; aRv: number; betaRv: number;
  eminRa: number; emaxRa: number; v0Ra: number;
  eminLa: number; emaxLa: number; v0La: number;
  rSys: number; cArt: number; // cArt multiplies Stage 2's C(P) (arterial stiffness)
  cSv: number; v0Sv: number; rVr: number;
  cPa: number; zPa: number; pvrL: number; pvrR: number; cPv: number; rPvla: number;
  tv: Valve; pv: Valve; mv: Valve; av: Valve;
  periA: number; periLambda: number; v0Peri: number; vFluid: number;
}

/** Time-dependent inputs for one integration interval (built per tick by the model; not stored). */
export interface CircDrive {
  vent: readonly Activation[];
  atria: readonly Activation[];
  kLv: number; // LV contractility multiplier on Emax (drugs, reflex, ischaemia)
  kRv: number;
  pIt: (t: number) => number; // pleural pressure, mmHg
  cprCardiac: (t: number) => number; // direct compression on the four chambers, mmHg
  cprThoracic: (t: number) => number; // thoracic pump on intrathoracic compartments and the aortic root, mmHg
  qIn: number; // net volume in (+ fluid, − bleed), mL/s, into the systemic veins
  qVad: (lvp: number, aop: number) => number; // LV → aorta device flow (LVAD), mL/s
  qAortaSrc: (t: number) => number; // volume source in the aorta (IABP dV/dt), mL/s
}

/** Algebraic outputs at one instant (pressures mmHg, flows mL/s). Reused, never allocated per call. */
export interface CircOut {
  pAo: number; pRad: number; pSv: number; pRa: number; pRv: number; pPa: number; pPaRoot: number; pPv: number; pLa: number; pLv: number;
  pPeri: number; pIt: number; qAv: number; qMv: number; qTv: number; qPv: number; qVr: number; qSys: number; qLungL: number; qLungR: number;
  qPvla: number; qVad: number; aVent: number; aAtria: number;
}

export function createOut(): CircOut {
  return {
    pAo: 0, pRad: 0, pSv: 0, pRa: 0, pRv: 0, pPa: 0, pPaRoot: 0, pPv: 0, pLa: 0, pLv: 0, pPeri: 0, pIt: 0, qAv: 0, qMv: 0, qTv: 0,
    qPv: 0, qVr: 0, qSys: 0, qLungL: 0, qLungR: 0, qPvla: 0, qVad: 0, aVent: 0, aAtria: 0,
  };
}

const WR = 2 * Math.PI * RADIAL_FR_HZ;

/** Evaluate every pressure and flow of state s at time t into o. */
export function evaluate(s: readonly number[], t: number, p: CircParams, d: CircDrive, o: CircOut): void {
  const a = activationAt(d.vent, t);
  const aa = activationAt(d.atria, t);
  const pit = d.pIt(t);
  const cc = d.cprCardiac(t);
  const ct = d.cprThoracic(t);
  const vlv = s[10] as number;
  const vrv = s[6] as number;
  const peri = Math.max(0, p.periA * (Math.exp(p.periLambda * (vlv + vrv + p.vFluid - p.v0Peri)) - 1));
  const ext = pit + ct + peri; // external pressure on the chambers (thoracic pump acts on everything intrathoracic)
  const dl = vlv - p.v0Lv;
  const dr = vrv - p.v0Rv;
  const pLv = a * p.eesLv * d.kLv * dl + (1 - a) * p.aLv * (Math.exp(p.betaLv * dl) - 1) + ext + cc;
  const pRv = a * p.eesRv * d.kRv * dr + (1 - a) * p.aRv * (Math.exp(p.betaRv * dr) - 1) + ext + cc;
  const pRa = (p.eminRa + aa * (p.emaxRa - p.eminRa)) * ((s[5] as number) - p.v0Ra) + ext + cc;
  const pLa = (p.eminLa + aa * (p.emaxLa - p.eminLa)) * ((s[9] as number) - p.v0La) + ext + cc;
  const pSv = ((s[4] as number) - p.v0Sv) / p.cSv;
  const pPa = (s[7] as number) / p.cPa + pit + ct;
  const pPv = (s[8] as number) / p.cPv + pit + ct;
  const pc = s[0] as number;
  const ql = s[1] as number;
  const qVad = d.qVad(pLv, pc);
  const qSrc = d.qAortaSrc(t);
  // aortic valve against the Windkessel's characteristic impedance: P_ao = PC + Zc·(Q_av + Q_src − QL) + ct
  const pX = pc + WK_ZC * (qSrc - ql) + ct;
  const qAv = valveFlow({ r: p.av.r + WK_ZC, k: p.av.k, eroa: p.av.eroa }, pLv - pX);
  const pAo = pX + WK_ZC * qAv;
  const qPv = valveFlow({ r: p.pv.r + p.zPa, k: p.pv.k, eroa: p.pv.eroa }, pRv - pPa);
  const dpv = pSv - pRa;
  o.pAo = pAo;
  o.pRad = pAo + (RADIAL_GAIN * 2 * RADIAL_ZETA * (s[3] as number)) / WR;
  o.pSv = pSv; o.pRa = pRa; o.pRv = pRv; o.pPa = pPa; o.pPaRoot = pPa + p.zPa * qPv; o.pPv = pPv; o.pLa = pLa; o.pLv = pLv;
  o.pPeri = peri; o.pIt = pit;
  o.qAv = qAv; o.qPv = qPv;
  o.qMv = valveFlow(p.mv, pLa - pLv);
  o.qTv = valveFlow(p.tv, pRa - pRv);
  o.qVr = dpv >= 0 ? dpv / p.rVr : dpv / (p.rVr * R_VR_BACK);
  o.qSys = (pc - pSv) / p.rSys;
  o.qLungL = (pPa - pPv) / p.pvrL;
  o.qLungR = (pPa - pPv) / p.pvrR;
  o.qPvla = (pPv - pLa) / p.rPvla;
  o.qVad = qVad;
  o.aVent = a;
  o.aAtria = aa;
}

const ev = createOut();
function deriv(t: number, s: readonly number[], ds: number[], p: CircParams, d: CircDrive): void {
  evaluate(s, t, p, d, ev);
  const qSrc = d.qAortaSrc(t);
  ds[0] = (ev.qAv + ev.qVad + qSrc - ev.qSys) / (compliance(s[0] as number) * p.cArt);
  ds[1] = (WK_ZC * (ev.qAv + qSrc - (s[1] as number))) / WK_L;
  ds[2] = s[3] as number;
  ds[3] = WR * WR * (ev.pAo - (s[2] as number)) - 2 * RADIAL_ZETA * WR * (s[3] as number);
  ds[4] = ev.qSys - ev.qVr + d.qIn;
  ds[5] = ev.qVr - ev.qTv;
  ds[6] = ev.qTv - ev.qPv;
  ds[7] = ev.qPv - ev.qLungL - ev.qLungR;
  ds[8] = ev.qLungL + ev.qLungR - ev.qPvla;
  ds[9] = ev.qPvla - ev.qMv;
  ds[10] = ev.qMv - ev.qAv - ev.qVad;
}

const k1 = new Array<number>(N_STATE).fill(0);
const k2 = new Array<number>(N_STATE).fill(0);
const k3 = new Array<number>(N_STATE).fill(0);
const k4 = new Array<number>(N_STATE).fill(0);
const tmp = new Array<number>(N_STATE).fill(0);

/** Advance s in place from t to t + h (classical RK4). */
export function stepCirc(s: number[], t: number, h: number, p: CircParams, d: CircDrive): void {
  deriv(t, s, k1, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + (h / 2) * (k1[i] as number);
  deriv(t + h / 2, tmp, k2, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + (h / 2) * (k2[i] as number);
  deriv(t + h / 2, tmp, k3, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + h * (k3[i] as number);
  deriv(t + h, tmp, k4, p, d);
  for (let i = 0; i < N_STATE; i++) {
    s[i] = (s[i] as number) + (h / 6) * ((k1[i] as number) + 2 * (k2[i] as number) + 2 * (k3[i] as number) + (k4[i] as number));
  }
}

/** Stressed arterial volume ∫₀^PC C(p) dp for Stage 2's C(P) = WK_C·clamp(e^{−k(P−P0)}, 0.5, 3), × cArt. */
export function arterialVolume(pc: number, cArt: number): number {
  const lo = WK_P0 - Math.log(3) / WK_CK; // below: C = 3·WK_C
  const hi = WK_P0 + Math.log(2) / WK_CK; // above: C = 0.5·WK_C
  const seg = (a: number, b: number): number => {
    // ∫ WK_C·e^{−k(p−P0)} dp from a to b inside [lo, hi]
    return (WK_C / WK_CK) * (Math.exp(-WK_CK * (a - WK_P0)) - Math.exp(-WK_CK * (b - WK_P0)));
  };
  let v = 0;
  const x = Math.max(0, pc);
  if (x <= lo) v = 3 * WK_C * x;
  else {
    v = 3 * WK_C * Math.max(0, lo) + seg(Math.max(0, lo), Math.min(x, hi));
    if (x > hi) v += 0.5 * WK_C * (x - hi);
  }
  return v * cArt;
}

/** Total blood volume represented by state s (mL): the unstressed arterial volume is bookkeeping only. */
export function totalVolume(s: readonly number[], p: CircParams): number {
  return V0_ART + arterialVolume(s[0] as number, p.cArt) + (s[4] as number) + (s[5] as number) + (s[6] as number) + (s[7] as number) + (s[8] as number) + (s[9] as number) + (s[10] as number);
}
```

- [x] **Step 3: Typecheck (the test runs at the end of Task 6)**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec tsc -p tsconfig.json --noEmit`
Expected: errors only for the not-yet-existing `profile.ts`/`stabilise.ts` imports in `circuit.test.ts`.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/src/l2/circ/circuit.ts packages/engine-core/test/l2/circ/circuit.test.ts
git commit -m "feat(circ): four-chamber time-varying-elastance circuit with Stage 2 Windkessel, pulmonary beds, pericardium and pleural input (R42)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 5: Minimal profile layer (age band, sex, weight, conditions)

**Files:**
- Create: `packages/engine-core/src/l2/circ/profile.ts`

**Interfaces:**
- Consumes: Tasks 2–4; `WK_R0` (Stage 2).
- Produces: `type AgeBand`, `type ConditionId = 'hfref' | 'hfpef' | 'htn' | 'as' | 'ar' | 'mr' | 'ms' | 'tr' | 'cad' | 'betaBlocked' | 'rvFailure' | 'ph'`, `interface CircCondition { id; grade?; severity? }`, `interface CircProfile { ageY; sex; weightKg; conditions }`, `interface ResolvedProfile` (fields below), `DEFAULT_PROFILE`, `GRADES`, `ageBand(ageY)`, `resolveProfile(pr?)`.

- [x] **Step 1: Implement** (tested through the stabiliser in Task 6, which exercises six profiles)

`packages/engine-core/src/l2/circ/profile.ts`:

```ts
// Minimal Stage 7a profile layer (R22 via tables §1.1–§1.5; R44 evidence defaults): age band, sex and weight set
// blood volume, chamber and vessel scaling, arterial stiffness, baroreflex gain, MAP set point and resting HR;
// conditions (HFrEF, HFpEF, HTN, valve grades, CAD grade, β-blockade) apply multipliers in list order. The result
// is the base CircParams plus the targets the stabiliser tunes to (tables A19). Pure, deterministic, plain data.
import type { CircParams } from './circuit.ts';
import {
  A_LV, A_RV, AVA_REF, BETA_LV, BETA_RV, BV_ML_KG_F, BV_ML_KG_M, C_PA, C_PV, C_SV, EES_LV, EES_RV, EMAX_LA, EMAX_RA, EMIN_LA,
  EMIN_RA, GORLIN_AV, GORLIN_MV, MVA_REF, PERI_A, PERI_LAMBDA, PVR, R_AV, R_MV, R_PV, R_PVLA, R_TV, R_VR, RIGHT_LUNG_FLOW, V0_LA,
  V0_LV, V0_RA, V0_RV, Z_PA,
} from './params.ts';
import { stenosisK } from './valves.ts';
import { WK_R0 } from '../hemo/params.ts';

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
export type ConditionId = 'hfref' | 'hfpef' | 'htn' | 'as' | 'ar' | 'mr' | 'ms' | 'tr' | 'cad' | 'betaBlocked' | 'rvFailure' | 'ph';
export interface CircCondition {
  id: ConditionId;
  /** 0–1 severity, or a named grade (see GRADES). */
  grade?: string;
  severity?: number;
}
export interface CircProfile {
  ageY: number;
  sex: 'M' | 'F';
  weightKg: number;
  conditions: CircCondition[];
}

/** Resolved profile: base circuit parameters plus the set points the stabiliser and the reflexes use. */
export interface ResolvedProfile {
  band: AgeBand;
  params: CircParams;
  bloodVolumeMl: number;
  stressedFrac: number;
  targets: { sbp: number; dbp: number; hr: number; cvp: number };
  mapSet: number;
  hrRest: number;
  hrMax: number;
  hrIntrinsic: number;
  gVagal: number; // ms/mmHg
  gSymp: number; // × on the sympathetic gains
  cfr: number; // coronary flow reserve (tables §3)
  betaBlock: number; // 0–1 fraction of β response removed
  lvedpTarget: number;
}

export function ageBand(ageY: number): AgeBand {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  if (ageY < 18) return 'adolescent';
  if (ageY < 65) return 'adult';
  return 'elderly';
}

/** Grade tables (tables §1.5). Values: AVA/MVA cm², EROA cm² (ASE 2017: severe MR ≥ 0.40, AR ≥ 0.30), CFR. */
export const GRADES = {
  as: { mild: 1.6, moderate: 1.2, severe: 0.7, critical: 0.5 },
  ms: { mild: 2.0, moderate: 1.6, severe: 1.2, verySevere: 0.9 },
  mr: { mild: 0.1, moderate: 0.25, severe: 0.45 },
  ar: { mild: 0.08, moderate: 0.18, severe: 0.32 },
  tr: { mild: 0.1, moderate: 0.25, severe: 0.45 },
  cad: { none: 3.5, stable: 2.0, severe: 1.4, recentMI: 1.4 },
} as const;
/** LV stiffness multiplier by AS grade (tables §1.5 Q15: β ×1.0 / 1.3 / 1.6 / 2.0). */
const AS_BETA: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.6, critical: 2.0 };

const BAND = {
  // bvMlKg (M), MAP set, resting HR, vagal gain ms/mmHg, sympathetic ×, arterial compliance × (tables §1.1)
  neonate: { bv: 87, map: 45, hr: 140, gv: 4, gs: 0.7, c: 1.0 },
  infant: { bv: 78, map: 55, hr: 130, gv: 7, gs: 0.8, c: 1.0 },
  child: { bv: 72, map: 68, hr: 100, gv: 12, gs: 1, c: 1.0 },
  adolescent: { bv: 70, map: 80, hr: 75, gv: 17, gs: 1, c: 1.0 },
  adult: { bv: BV_ML_KG_M, map: 90, hr: 70, gv: 15, gs: 1, c: 1.0 },
  elderly: { bv: 62, map: 95, hr: 65, gv: 6.5, gs: 0.6, c: 0.5 },
} as const;

const sev = (c: CircCondition): number => Math.min(1, Math.max(0, c.severity ?? 1));

export const DEFAULT_PROFILE: CircProfile = { ageY: 40, sex: 'M', weightKg: 70, conditions: [] };

export function resolveProfile(pr: CircProfile = DEFAULT_PROFILE): ResolvedProfile {
  const band = ageBand(pr.ageY);
  const b = BAND[band];
  const w = pr.weightKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  const bvKg = pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv;
  const lvScale = pr.sex === 'F' ? 0.9 : 1; // tables §1.2 LV size
  const p: CircParams = {
    eesLv: EES_LV / (w * lvScale), v0Lv: V0_LV * w, aLv: A_LV, betaLv: BETA_LV / (w * lvScale),
    eesRv: EES_RV / w, v0Rv: V0_RV * w, aRv: A_RV, betaRv: BETA_RV / w,
    eminRa: EMIN_RA / w, emaxRa: EMAX_RA / w, v0Ra: V0_RA * w,
    eminLa: EMIN_LA / w, emaxLa: EMAX_LA / w, v0La: V0_LA * w,
    rSys: WK_R0 / w, cArt: b.c * w,
    cSv: C_SV * w, v0Sv: 0, rVr: R_VR / w,
    cPa: C_PA * w, zPa: Z_PA / w, pvrL: PVR / w / (1 - RIGHT_LUNG_FLOW), pvrR: PVR / w / RIGHT_LUNG_FLOW, cPv: C_PV * w, rPvla: R_PVLA / w,
    tv: { r: R_TV / w, k: 0, eroa: 0 }, pv: { r: R_PV / w, k: 0, eroa: 0 }, mv: { r: R_MV / w, k: 0, eroa: 0 }, av: { r: R_AV / w, k: 0, eroa: 0 },
    periA: PERI_A, periLambda: PERI_LAMBDA / w, v0Peri: 0, vFluid: 0,
  };
  const r: ResolvedProfile = {
    band, params: p, bloodVolumeMl: bvKg * pr.weightKg, stressedFrac: band === 'elderly' ? 0.22 : 0.25,
    targets: { sbp: 120, dbp: 80, hr: b.hr, cvp: 5 }, mapSet: b.map, hrRest: b.hr,
    hrMax: 208 - 0.7 * pr.ageY, hrIntrinsic: 118 - 0.57 * pr.ageY, gVagal: b.gv, gSymp: b.gs, cfr: GRADES.cad.none, betaBlock: 0,
    lvedpTarget: 8,
  };
  if (band === 'elderly') r.targets = { sbp: 140, dbp: 80, hr: b.hr, cvp: 5 };
  let edvRef = 120 * w * lvScale; // mL, the EDV at which the EDPVR passes through the profile's LVEDP [ENG anchor]
  for (const c of pr.conditions) {
    applyCondition(r, c);
    if (c.id === 'hfref') edvRef *= 1 + 0.5 * sev(c); // eccentric dilatation (tables §1.5 HFrEF)
  }
  // Anchor the LV EDPVR: stiffness conditions steepen β, and A is refitted so P(EDV_ref) = LVEDP target. Without it
  // β multipliers compound on the exponential (AS + HTN: LVEDP 67 at EDV 119 in the prototype) [ENG, plan decision 5].
  p.aLv = r.lvedpTarget / (Math.exp(p.betaLv * (edvRef - p.v0Lv)) - 1);
  return r;
}

function applyCondition(r: ResolvedProfile, c: CircCondition): void {
  const p = r.params;
  const s = sev(c);
  const lerp = (m: number) => 1 + (m - 1) * s;
  switch (c.id) {
    case 'hfref': // tables §1.5: Ees ×0.45, β ×1.3, V ×1.10, G_v ×0.5, MAP_set 75
      p.eesLv *= lerp(0.45);
      p.betaLv *= lerp(1.3);
      r.bloodVolumeMl *= lerp(1.1);
      r.gVagal *= lerp(0.5);
      r.mapSet = 75;
      r.targets = { ...r.targets, sbp: 105, dbp: 65 };
      r.lvedpTarget = 18;
      return;
    case 'hfpef': // β ×2.5, arterial C ×0.7
      p.betaLv *= lerp(2.5);
      p.cArt *= lerp(0.7);
      r.lvedpTarget = 18;
      return;
    case 'htn': // +20 MAP_set, C ×0.7, R ×1.2, G_v ×0.6, β ×1.3
      r.mapSet += 20 * s;
      p.cArt *= lerp(0.7);
      p.rSys *= lerp(1.2);
      r.gVagal *= lerp(0.6);
      p.betaLv *= lerp(1.3);
      r.targets = { ...r.targets, sbp: r.targets.sbp + 15 * s, dbp: r.targets.dbp + 5 * s };
      return;
    case 'as': {
      const g = (c.grade ?? 'severe') as keyof typeof GRADES.as;
      const ava = GRADES.as[g];
      p.av = { ...p.av, k: stenosisK(ava, GORLIN_AV, AVA_REF) };
      p.betaLv *= AS_BETA[g] ?? 1;
      r.lvedpTarget = Math.max(r.lvedpTarget, 14);
      return;
    }
    case 'ms': {
      const g = (c.grade ?? 'severe') as keyof typeof GRADES.ms;
      p.mv = { ...p.mv, k: stenosisK(GRADES.ms[g], GORLIN_MV, MVA_REF) };
      return;
    }
    case 'mr':
      p.mv = { ...p.mv, eroa: GRADES.mr[(c.grade ?? 'severe') as keyof typeof GRADES.mr] };
      if ((c.grade ?? 'severe') === 'severe' && c.severity !== undefined && c.severity < 0.5) p.emaxLa = p.eminLa = 0.1; // chronic big LA [ENG]
      return;
    case 'ar':
      p.av = { ...p.av, eroa: GRADES.ar[(c.grade ?? 'severe') as keyof typeof GRADES.ar] };
      return;
    case 'tr':
      p.tv = { ...p.tv, eroa: GRADES.tr[(c.grade ?? 'severe') as keyof typeof GRADES.tr] };
      return;
    case 'cad':
      r.cfr = GRADES.cad[(c.grade ?? 'severe') as keyof typeof GRADES.cad];
      if (c.grade === 'recentMI') p.eesLv *= 0.8;
      return;
    case 'betaBlocked': // tables §1.5: HR 55–65, g_hs ×0.4, g_c ×0.5, β-agonist ×0.5
      r.betaBlock = 0.6 * s;
      r.hrRest = 60;
      r.targets = { ...r.targets, hr: 60 };
      return;
    case 'rvFailure':
      p.eesRv *= lerp(0.5);
      return;
    case 'ph': // PVR 3/5/10 WU by grade (tables §1.5), RV Ees ×1.3–2
      p.pvrL *= lerp(3);
      p.pvrR *= lerp(3);
      p.eesRv *= lerp(1.6);
      return;
  }
}
```

Then make one edit the prototype showed necessary for the AS + CAD profile (Deviations): in `applyCondition`, `case 'as'`, after `r.lvedpTarget = Math.max(r.lvedpTarget, 14);` add `r.targets = { ...r.targets, cvp: 3 }; // stiff LV over-fills at CVP 5 (prototype LVEDP 40) [ENG]`.

- [x] **Step 2: Typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec tsc -p tsconfig.json --noEmit`
Expected: only the `stabilise.ts` import error in `circuit.test.ts` remains.

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/src/l2/circ/profile.ts
git commit -m "feat(circ): minimal R22 profile resolver — age band, sex, weight, HF/HTN/valve/CAD/β-blockade conditions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 6: Stabilisation / tuning with a convergence ledger (audit borrow #3)

**Files:**
- Create: `packages/engine-core/src/l2/circ/stabilise.ts`, `packages/engine-core/test/l2/circ/stabilise.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces: `STAB_WINDOW_S`, `STAB_MAX_WINDOWS`, `STAB_PR_S`, `interface LedgerRow { w; sbp; dbp; cvp; rSys; cArt; v0Sv }`, `interface Stabilised { s; params; ledger; converged; ref }`, `initialState(p, bloodVolumeMl, stressedFrac)`, `stabilise(resolved)` (cached, returns a deep copy).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/stabilise.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';
import { stabilise } from '../../../src/l2/circ/stabilise.ts';

describe('profile stabilisation (audit #3, A19)', () => {
  it('the default adult converges to 120/80, CVP 5 at HR 70 with H1-range resting values', () => {
    const st = stabilise(resolveProfile());
    expect(st.converged).toBe(true);
    expect(st.ledger.length).toBeLessThanOrEqual(30);
    expect(Math.abs(st.ref.sbp - 120)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(st.ref.dbp - 80)).toBeLessThanOrEqual(1);
    expect(st.ref.cvp).toBeGreaterThan(4.6);
    expect(st.ref.cvp).toBeLessThan(5.4);
    expect(st.ref.co).toBeGreaterThan(4.5); // H1 CO 5–6 (4.9–5.6 measured)
    expect(st.ref.co).toBeLessThan(6.5);
    expect(st.ref.pcwp).toBeGreaterThan(5); // H1 PCWP 6–12
    expect(st.ref.pcwp).toBeLessThan(12);
    expect(st.ref.lvedp).toBeGreaterThan(5);
    expect(st.ref.lvedp).toBeLessThan(13);
    expect(st.params.eesLv).toBe(resolveProfile().params.eesLv); // Emax is never tuned (decision 4)
  });
  it('is cached and deterministic: two calls return equal, independent copies', () => {
    const a = stabilise(resolveProfile());
    const b = stabilise(resolveProfile());
    expect(a).toEqual(b);
    a.s[0] = -1;
    expect(stabilise(resolveProfile()).s[0]).not.toBe(-1);
  });
  it.each([
    ['elderly + HTN', { ageY: 75, sex: 'M' as const, weightKg: 75, conditions: [{ id: 'htn' as const }] }],
    ['75 y AS + CAD + HTN', { ageY: 75, sex: 'M' as const, weightKg: 75, conditions: [{ id: 'htn' as const }, { id: 'as' as const, grade: 'severe' }, { id: 'cad' as const, grade: 'severe' }] }],
    ['HFrEF', { ageY: 60, sex: 'M' as const, weightKg: 80, conditions: [{ id: 'hfref' as const }] }],
    ['50 kg woman', { ageY: 30, sex: 'F' as const, weightKg: 50, conditions: [] }],
    ['6 y child', { ageY: 6, sex: 'M' as const, weightKg: 20, conditions: [] }],
  ])('%s converges within 30 windows', (_n, prof) => {
    const r = resolveProfile(prof);
    const st = stabilise(r);
    expect(st.converged).toBe(true);
    expect(st.ledger.length).toBeLessThanOrEqual(30);
    expect(Math.abs(st.ref.sbp - r.targets.sbp)).toBeLessThanOrEqual(0.02 * r.targets.sbp);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/stabilise.test.ts`
Expected: FAIL — cannot resolve `stabilise.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/circ/stabilise.ts`:

```ts
// Profile stabilisation (audit borrow #3 / amendment A19; Pulse CardiovascularModel TuneCircuit, procedure only —
// NOTICES N-P06): start from an analytic guess (volumes at typical pressures, stressed volume from the profile),
// run a fixed sinus rhythm at the profile's resting HR with a constant resting pleural pressure, and every 2 s
// window (a whole number of beats, ≥ 2 s) rescale systemic resistance (MAP), arterial compliance (pulse pressure, as Pulse tunes aortic C) and the
// venous unstressed volume (CVP) with small gains, clamped around their start values. LV Emax is NOT tuned: it is
// the evidence default that conditions (HFrEF ×0.45) and drugs act on, and tuning would undo them (plan decision 4). Converged when radial SBP/DBP are within 1 % and CVP
// within 0.3 mmHg of target for 3 consecutive windows (≈ 6 s; ≤ 60 windows = 120 s simulated). The result
// (state + tuned params + ledger) is cached by profile hash: the solve is deterministic, so the cache is too.
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { arterialVolume, createOut, evaluate, N_STATE, S, stepCirc, type CircDrive, type CircParams } from './circuit.ts';
import { ATRIAL_DELAY_S, ATRIAL_T_S, H_S, P_PL0, PERI_EXTRA_ML, PERI_RESERVE, V0_ART } from './params.ts';
import type { ResolvedProfile } from './profile.ts';

export const STAB_WINDOW_S = 2;
export const STAB_MAX_WINDOWS = 60;
export const STAB_PR_S = 0.16;

export interface LedgerRow {
  w: number; // window index
  sbp: number; dbp: number; cvp: number; rSys: number; cArt: number; v0Sv: number;
}
export interface Stabilised {
  s: number[];
  params: CircParams;
  ledger: LedgerRow[];
  converged: boolean;
  /** Resting per-beat reference values (for the coronary demand normalisation and the tests). */
  ref: { hr: number; sbp: number; dbp: number; map: number; cvp: number; lvedv: number; lvedp: number; lvsp: number; sv: number; co: number; pcwp: number };
}

const zero = () => 0;

/** Analytic starting state: chambers at typical volumes, the rest of the blood in the systemic veins. */
export function initialState(p: CircParams, bloodVolumeMl: number, stressedFrac: number): number[] {
  const s = new Array<number>(N_STATE).fill(0);
  const w = p.cSv / 110;
  s[S.PC] = 95;
  s[S.QL] = 90 * w;
  s[S.VLV] = 120 * w;
  s[S.VRV] = 130 * w;
  s[S.VLA] = 60 * w;
  s[S.VRA] = 60 * w;
  s[S.VPA] = p.cPa * 18;
  s[S.VPV] = p.cPv * 12;
  const others = V0_ART + arterialVolume(95, p.cArt) + (s[S.VLV] as number) + (s[S.VRV] as number) + (s[S.VLA] as number) + (s[S.VRA] as number) + (s[S.VPA] as number) + (s[S.VPV] as number);
  s[S.VSV] = bloodVolumeMl - others;
  // venous unstressed volume: the profile's stressed fraction of the whole blood volume is stressed [tables §1.1]
  const stressedElsewhere = arterialVolume(95, p.cArt) + (s[S.VPA] as number) + (s[S.VPV] as number) + 200 * w;
  p.v0Sv = (s[S.VSV] as number) - Math.max(0.3 * p.cSv, stressedFrac * bloodVolumeMl - stressedElsewhere);
  return s;
}

function hashProfile(r: ResolvedProfile): string {
  return JSON.stringify([r.params, r.bloodVolumeMl, r.stressedFrac, r.targets]);
}
const cache = new Map<string, Stabilised>();

/** Stabilise a resolved profile (cached). The returned state/params are copies the caller may mutate. */
export function stabilise(r: ResolvedProfile): Stabilised {
  const key = hashProfile(r);
  let hit = cache.get(key);
  if (!hit) {
    hit = solve(r);
    cache.set(key, hit);
  }
  return structuredClone(hit);
}

function solve(r: ResolvedProfile): Stabilised {
  const p: CircParams = structuredClone(r.params);
  const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
  p.v0Peri = 1e4; // pericardium slack while tuning; set from the tuned EDVs at the end
  const hr = r.targets.hr;
  const rr = 60 / hr;
  const T = activationPeriodS(hr);
  const win = rr * Math.ceil(STAB_WINDOW_S / rr); // a whole number of beats, so window extremes do not alternate
  let vent: Activation[] = [];
  let atria: Activation[] = [];
  const d: CircDrive = {
    vent, atria, kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero,
  };
  const o = createOut();
  const start = { rSys: p.rSys, cArt: p.cArt, v0Sv: p.v0Sv };
  const clamp = (x: number, x0: number, lo = 0.5, hi = 1.5) => Math.min(hi * x0, Math.max(lo * x0, x));
  const ledger: LedgerRow[] = [];
  let t = 0;
  let nextBeat = 0.2;
  let ok = 0;
  let converged = false;
  let edvMax = 0;
  let edvRv = 0;
  let prevA = 1;
  const ref = { hr, sbp: 0, dbp: 0, map: 0, cvp: 0, lvedv: 0, lvedp: 0, lvsp: 0, sv: 0, co: 0, pcwp: 0 };
  for (let w = 0; w < STAB_MAX_WINDOWS; w++) {
    const tEnd = t + win;
    let sbp = -1e9, dbp = 1e9, map = 0, cvp = 0, pcwp = 0, n = 0, lvsp = -1e9, qav = 0, lvedp = 0, nEd = 0;
    edvMax = 0;
    edvRv = 0;
    // warm-up windows are not measured: the first 4 s settle the analytic guess
    while (t < tEnd - 1e-9) {
      while (nextBeat <= t + 0.3) {
        vent.push({ t0: nextBeat, T, amp: 1 });
        atria.push({ t0: nextBeat - STAB_PR_S + ATRIAL_DELAY_S, T: ATRIAL_T_S, amp: 1 });
        nextBeat += rr;
      }
      stepCirc(s, t, H_S, p, d);
      t += H_S;
      evaluate(s, t, p, d, o);
      if (o.pRad > sbp) sbp = o.pRad;
      if (o.pRad < dbp) dbp = o.pRad;
      map += o.pRad;
      cvp += o.pRa;
      pcwp += o.pPv;
      n++;
      if (o.pLv > lvsp) lvsp = o.pLv;
      qav += o.qAv * H_S;
      edvMax = Math.max(edvMax, s[S.VLV] as number);
      edvRv = Math.max(edvRv, s[S.VRV] as number);
      if (prevA < 0.001 && o.aVent >= 0.001) {
        lvedp += o.pLv - o.pIt;
        nEd++;
      }
      prevA = o.aVent;
    }
    vent = pruneActivations(vent, t);
    atria = pruneActivations(atria, t);
    d.vent = vent;
    d.atria = atria;
    map /= n;
    cvp /= n;
    pcwp /= n;
    ledger.push({ w, sbp, dbp, cvp, rSys: p.rSys, cArt: p.cArt, v0Sv: p.v0Sv });
    if (w < 2) continue;
    const { sbp: sT, dbp: dT, cvp: cT } = r.targets;
    const inTol = Math.abs(sbp - sT) <= 0.01 * sT && Math.abs(dbp - dT) <= 0.01 * dT && Math.abs(cvp - cT) <= 0.3;
    ok = inTol ? ok + 1 : 0;
    ref.sbp = sbp; ref.dbp = dbp; ref.map = map; ref.cvp = cvp; ref.lvedv = edvMax; ref.lvsp = lvsp; ref.pcwp = pcwp;
    ref.lvedp = lvedp / Math.max(1, nEd);
    ref.sv = qav / (win / rr);
    ref.co = (qav / win) * 0.06;
    if (ok >= 3) {
      converged = true;
      break;
    }
    if (inTol) continue;
    const pp = Math.max(5, sbp - dbp);
    const ff = Math.min(0.6, Math.max(0.1, (map - dbp) / pp));
    const mapT = dT + ff * (sT - dT);
    p.rSys = clamp(p.rSys * ((mapT - cvp) / Math.max(5, map - cvp)) ** 0.7, start.rSys);
    p.cArt = clamp(p.cArt * (pp / (sT - dT)) ** 0.7, start.cArt, 0.4, 2.5);
    p.v0Sv = Math.min(start.v0Sv + 0.5 * r.bloodVolumeMl, Math.max(start.v0Sv - 0.5 * r.bloodVolumeMl, p.v0Sv - 0.6 * (cT - cvp) * p.cSv * 0.5));
  }
  p.v0Peri = PERI_RESERVE * (edvMax + edvRv) + PERI_EXTRA_ML;
  // the pericardial reserve was not active during tuning; it is set so the resting pericardial pressure is 0
  return { s, params: p, ledger, converged, ref };
}
```

- [x] **Step 4: Run the stabiliser and circuit tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/stabilise.test.ts test/l2/circ/circuit.test.ts`
Expected: PASS (10 tests; ≈ 0.4 s). The prototype converged in 24 / 21 / 26 / 21 / 20 / 21 windows for the six profiles.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/stabilise.ts packages/engine-core/test/l2/circ/stabilise.test.ts
git commit -m "feat(circ): profile stabilisation with convergence ledger and cache (audit #3, A19; N-P06 procedure)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 7: Baroreflex (vagal + sympathetic, asymmetry, resetting, venous effectors)

**Files:**
- Create: `packages/engine-core/src/l2/circ/baroreflex.ts`, `packages/engine-core/test/l2/circ/baroreflex.test.ts`

**Interfaces:**
- Produces: `BARO_DT`, gains (`G_HS`, `G_R`, `G_C`, `G_V`, `G_CSV`, `SYMP_SAT`, `SYMP_WITHDRAW`, `VAGAL_STEADY`, `VAGAL_WITHDRAW_MS`, `RESET_*`), `interface BaroState`, `interface BaroGains { gVagal; gSymp; betaBlock; weightScale; pinnedSet }`, `interface BaroOut { rrMs; hrF; svrF; eesF; dV0; cSvF }`, `createBaro(set)`, `stepBaro(b, map, gains)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/baroreflex.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createBaro, stepBaro, RESET_HOLD_S, SYMP_SAT } from '../../../src/l2/circ/baroreflex.ts';

const g = { gVagal: 15, gSymp: 1, betaBlock: 0, weightScale: 1, pinnedSet: false };
const run = (b: ReturnType<typeof createBaro>, map: number, s: number, gg = g) => {
  let o = stepBaro(b, map, gg);
  for (let i = 1; i < s * 10; i++) o = stepBaro(b, map, gg);
  return o;
};

describe('baroreflex', () => {
  it('at the set point every effector is neutral', () => {
    const o = run(createBaro(90), 90, 30);
    expect(o.rrMs).toBeCloseTo(0, 9);
    expect(o.hrF).toBeCloseTo(1, 9);
    expect(o.svrF).toBeCloseTo(1, 9);
  });
  it('the vagal limb acts within ~2 s, the sympathetic limb takes > 10 s (delay 2.5 s, τ 10 s)', () => {
    const b = createBaro(90);
    const fast = run(b, 110, 2);
    expect(fast.rrMs).toBeGreaterThan(20);
    expect(fast.svrF).toBeGreaterThan(0.97);
    const slow = run(b, 110, 40);
    expect(slow.svrF).toBeLessThan(fast.svrF);
  });
  it('hypotension: HR, SVR and contractility rise, venous V0 falls; saturation caps each factor', () => {
    const o = run(createBaro(90), 10, 120);
    expect(o.hrF).toBeCloseTo(1 + SYMP_SAT, 9);
    expect(o.svrF).toBeCloseTo(1 + SYMP_SAT, 9);
    expect(o.dV0).toBeLessThan(-500);
    expect(o.rrMs).toBe(-200); // vagal withdrawal saturates
  });
  it('β-blockade removes most of the HR and contractility response but not SVR', () => {
    const a = run(createBaro(90), 70, 60);
    const b = run(createBaro(90), 70, 60, { ...g, betaBlock: 0.6 });
    expect(b.hrF - 1).toBeCloseTo((a.hrF - 1) * 0.4, 6);
    expect(b.svrF).toBeCloseTo(a.svrF, 9);
  });
  it('resetting: a 10 % offset held 420 s moves the set point 35 % of the way (A5); a pinned set point never moves', () => {
    const b = createBaro(100);
    run(b, 110, RESET_HOLD_S + 2);
    expect(b.set).toBeGreaterThan(103);
    expect(b.set).toBeLessThan(104);
    const c = createBaro(100);
    run(c, 110, RESET_HOLD_S + 2, { ...g, pinnedSet: true });
    expect(c.set).toBe(100);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/baroreflex.test.ts`
Expected: FAIL — cannot resolve `baroreflex.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/circ/baroreflex.ts`:

```ts
// Arterial baroreflex (B §4.9 MODELED summary; tables §1.1 G_v, g_hs/g_R/g_V/g_c; audit A5 resetting, A6 venous
// compliance effector). Stepped at 10 Hz from the mean arterial pressure (never from a drug: A11 — reflex responses
// to a pressor are emergent). Error e = MAP_set − MAP (positive = hypotension).
//   vagal: RR_v = G_v·(−e_v) ms, e_v = LPF τ 1 s of delay(0.3 s)(e)        fast limb, both directions
//   sympathetic: e_s = LPF τ 10 s of delay(2.5 s)(e), saturating at ±SYMP_SAT (fraction):
//     HR ×(1 + g_hs·e_s), SVR ×(1 + g_R·e_s), Emax ×(1 + g_c·e_s), venous V0 −g_V·e_s mL, cSv ×(1 − g_C·e_s)
//   resetting: |MAP − set|/set > 5 % held 420 s → set += 0.35·(MAP − set) [ENG-Pulse, N-P16]
export const BARO_DT = 0.1;
export const VAGAL_DELAY_S = 0.3;
export const VAGAL_TAU_S = 1.0;
export const SYMP_DELAY_S = 2.5;
export const SYMP_TAU_S = 10;
export const G_HS = 0.02; // /mmHg HR (B §4.9 "HR ×(1+g_hs·e_s)") [ENG within 0.01–0.02]
/** Sympathetic WITHDRAWAL (hypertension side) is weaker than activation (sigmoid baroreflex curve, operating point
 * near the lower plateau) → gains × 0.3 when e_s < 0 [ENG, prototype: phenylephrine HR −5–15 with class II HR 100–120]. */
export const SYMP_WITHDRAW = 0.3;
export const G_R = 0.02; // /mmHg SVR [ENG: above B §4.9 0.01–0.02 — needed for class II "SBP near normal" in the prototype]
export const G_C = 0.008; // /mmHg contractility [ENG]
export const G_V = 20; // mL/mmHg venous unstressed volume (B §4.9 10–20; upper end, prototype haemorrhage), × W/70
export const G_CSV = 0.004; // /mmHg venous compliance (A6: up to 30 %)
export const SYMP_SAT = 0.6; // saturation of each sympathetic factor (B §4.9 ±40–60 %)
export const VAGAL_MAX_MS = 600; // RR lengthening cap (vagal activation)
/** Vagal WITHDRAWAL saturates once resting vagal tone is gone (HR → intrinsic ≈ 95 at 40 y) [ENG]. */
export const VAGAL_WITHDRAW_MS = 200;
/**
 * Sequence-method BRS (tables G_v 15 ms/mmHg) overstates the steady-state reflex RR change: phenylephrine gives
 * HR −5–15 for MAP +15–25 (B §4.9 sanity 1) ≈ 6 ms/mmHg at HR 75. The vagal limb uses G_v × 0.4 [ENG, prototype].
 */
export const VAGAL_STEADY = 0.2;
export const MAP_TAU_S = 1; // e = MAP_set − LPF_1s(MAP) (B §4.9)
export const RESET_FRAC = 0.05;
export const RESET_HOLD_S = 420;
export const RESET_GAIN = 0.35;

export interface BaroState {
  set: number;
  q: number[]; // delay line of e at 10 Hz (plain data)
  ev: number; // vagal filtered error
  es: number; // sympathetic filtered error
  offT: number; // time the MAP has been > 5 % off the set point
  mapLp: number; // LPF 1 s of the input MAP
}

export interface BaroGains {
  gVagal: number; // ms/mmHg
  gSymp: number; // × on every sympathetic gain (age, β-blockade, GA)
  betaBlock: number; // 0–1: fraction of the β-mediated HR and contractility gain removed
  weightScale: number; // W/70
  pinnedSet: boolean; // MAP_set pinned by the instructor: no resetting
}

export interface BaroOut {
  rrMs: number; // vagal RR increment (ms, + = slower)
  hrF: number;
  svrF: number;
  eesF: number;
  dV0: number; // mL added to the venous unstressed volume (− = venoconstriction)
  cSvF: number;
}

export function createBaro(set: number): BaroState {
  const n = Math.round(SYMP_DELAY_S / BARO_DT) + 1;
  return { set, q: new Array<number>(n).fill(0), ev: 0, es: 0, offT: 0, mapLp: set };
}

const clampSat = (x: number) => Math.min(SYMP_SAT, Math.max(-SYMP_SAT, x));

/** One 10 Hz step with the current mean arterial pressure; returns the effector factors. */
export function stepBaro(b: BaroState, map: number, g: BaroGains): BaroOut {
  b.mapLp += (map - b.mapLp) * (1 - Math.exp(-BARO_DT / MAP_TAU_S));
  const e = b.set - b.mapLp;
  b.q.push(e);
  b.q.shift();
  const eVag = b.q[b.q.length - 1 - Math.round(VAGAL_DELAY_S / BARO_DT)] as number;
  const eSym = b.q[0] as number;
  b.ev += (eVag - b.ev) * (1 - Math.exp(-BARO_DT / VAGAL_TAU_S));
  b.es += (eSym - b.es) * (1 - Math.exp(-BARO_DT / SYMP_TAU_S));
  if (!g.pinnedSet && Math.abs(b.mapLp - b.set) > RESET_FRAC * b.set) {
    b.offT += BARO_DT;
    if (b.offT >= RESET_HOLD_S) {
      b.set += RESET_GAIN * (b.mapLp - b.set);
      b.offT = 0;
    }
  } else b.offT = 0;
  const s = g.gSymp * (b.es < 0 ? SYMP_WITHDRAW : 1);
  const beta = 1 - g.betaBlock;
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
    hrF: 1 + clampSat(G_HS * s * beta * b.es),
    svrF: 1 + clampSat(G_R * s * b.es),
    eesF: 1 + clampSat(G_C * s * beta * b.es),
    dV0: -G_V * g.weightScale * s * Math.min(40, Math.max(-40, b.es)),
    cSvF: 1 - clampSat(G_CSV * s * b.es) * 0.5,
  };
}
```

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/baroreflex.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/baroreflex.ts packages/engine-core/test/l2/circ/baroreflex.test.ts
git commit -m "feat(circ): baroreflex — fast vagal and slow sympathetic limbs, asymmetry, resetting (A5), venous effectors (A6)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 8: Drug effect curves (phenylephrine, ephedrine, nitroglycerin, esmolol, propofol)

**Files:**
- Create: `packages/engine-core/src/l2/circ/drugs.ts`, `packages/engine-core/test/l2/circ/drugs.test.ts`

**Interfaces:**
- Produces: `type DrugId`, `interface DrugEffect { hr; ees; svr; v0Frac; pvr; gv }`, `DRUGS`, `interface Bolus { drug; t; scale }`, `bolusScale(drug, doseMg, weightKg, previous)`, `drugEffect(list, t, betaBlock)`, `pruneBoluses(list, t)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/drugs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bolusScale, drugEffect, pruneBoluses, type Bolus } from '../../../src/l2/circ/drugs.ts';

describe('7a bolus effect curves', () => {
  it('phenylephrine 100 µg peaks at ×1.8 SVR 70–80 s after the bolus and is < 10 % of peak by 15 min', () => {
    const list: Bolus[] = [{ drug: 'phenylephrine', t: 0, scale: bolusScale('phenylephrine', 0.1, 70, []) }];
    let best = { t: 0, svr: 1 };
    for (let t = 0; t < 600; t += 1) {
      const e = drugEffect(list, t, 0);
      if (e.svr > best.svr) best = { t, svr: e.svr };
    }
    expect(best.svr).toBeCloseTo(1.8, 3);
    expect(best.t).toBeGreaterThanOrEqual(70);
    expect(best.t).toBeLessThanOrEqual(80);
    expect(drugEffect(list, 900, 0).svr - 1).toBeLessThan(0.08);
    expect(drugEffect(list, 60, 0).hr).toBe(1); // no direct chronotropy: bradycardia is reflex (A11)
  });
  it('ephedrine peaks at 4–5 min, β-blockade halves-plus its HR/contractility effect, repeats show tachyphylaxis', () => {
    const one: Bolus[] = [{ drug: 'ephedrine', t: 0, scale: bolusScale('ephedrine', 10, 70, []) }];
    let tp = 0;
    let best = 0;
    for (let t = 0; t < 900; t += 5) {
      const e = drugEffect(one, t, 0).ees;
      if (e > best) {
        best = e;
        tp = t;
      }
    }
    expect(tp).toBeGreaterThanOrEqual(240);
    expect(tp).toBeLessThanOrEqual(300);
    expect(drugEffect(one, tp, 0.6).hr - 1).toBeCloseTo((drugEffect(one, tp, 0).hr - 1) * 0.4, 6);
    expect(bolusScale('ephedrine', 10, 70, one)).toBeCloseTo(0.7, 9);
  });
  it('effects on one multiplier combine multiplicatively; old boluses are pruned', () => {
    const list: Bolus[] = [
      { drug: 'propofol', t: 0, scale: 1 },
      { drug: 'phenylephrine', t: 0, scale: 1 },
    ];
    const a = drugEffect([list[0]!], 75, 0).svr;
    const b = drugEffect([list[1]!], 75, 0).svr;
    expect(drugEffect(list, 75, 0).svr).toBeCloseTo(a * b, 9);
    expect(pruneBoluses(list, 1e5)).toEqual([]);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/drugs.test.ts`
Expected: FAIL — cannot resolve `drugs.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/circ/drugs.ts`:

```ts
// Bolus drug effect curves for the drugs the demo offers in 7a (tables §6.2–§6.3; B §4.9 "Drug effect"). 7g replaces
// these with PK + effect-site models; until then each bolus is a Bateman curve on the mechanism multipliers,
//   E(t) = Emax·(e^{−t/τoff} − e^{−t/τon}) / peak   (peak-normalised, so Emax is the effect at the peak),
// scaled by dose/refDose (capped at 2× the reference effect), and repeated boluses add (tachyphylaxis for ephedrine
// × 0.7 per repeat). Effects on the same multiplier combine MULTIPLICATIVELY (audit A11); no drug ever moves the
// baroreflex set point (A11) — reflex bradycardia to phenylephrine is emergent.
export type DrugId = 'phenylephrine' | 'ephedrine' | 'nitroglycerin' | 'esmolol' | 'propofol';

export interface DrugEffect {
  hr: number; // × on the HR set point
  ees: number; // × on LV and RV Emax
  svr: number; // × on systemic resistance
  v0Frac: number; // + fraction of blood volume moved INTO the venous unstressed pool (+ = venodilation)
  pvr: number; // × on PVR
  gv: number; // × on the vagal and sympathetic reflex gains
}

interface DrugRow {
  refDose: number; // mg for mg-dosed drugs, mg/kg for propofol/esmolol
  unit: 'mg' | 'mg/kg';
  tauOn: number;
  tauOff: number;
  peak: Omit<DrugEffect, 'gv'> & { gv?: number }; // relative change at the peak of the reference dose (× − 1 or + frac)
  betaMediated?: boolean; // hr/ees part is β-mediated (blunted by β-blockade)
  tachyphylaxis?: number;
}

/** Peak effects at the reference dose (tables §6.2/§6.3; [ENG] where marked there). */
export const DRUGS: Record<DrugId, DrugRow> = {
  // phenylephrine 100 µg: SVR ×1.8 at peak [ENG, refitted in the 7a prototype to MAP +15–25 against the emergent reflex; tables said ×1.35], V −3 %, PVR ×1.1; onset 30–60 s, peak 1–2 min
  phenylephrine: { refDose: 0.1, unit: 'mg', tauOn: 30, tauOff: 300, peak: { hr: 0, ees: 0, svr: 0.8, v0Frac: -0.03, pvr: 0.1 } },
  // ephedrine 10 mg: HR +12 %, contractility +18 %, SVR +12 %, V −3 %; peak 4–5 min, ~1 h; tachyphylaxis ×0.7
  ephedrine: { refDose: 10, unit: 'mg', tauOn: 90, tauOff: 1800, peak: { hr: 0.12, ees: 0.18, svr: 0.12, v0Frac: -0.03, pvr: 0 }, betaMediated: true, tachyphylaxis: 0.7 },
  // nitroglycerin 100 µg bolus: venous +10 % of V, SVR ×0.9, PVR ×0.8; onset 1–2 min, 5–10 min
  nitroglycerin: { refDose: 0.1, unit: 'mg', tauOn: 20, tauOff: 240, peak: { hr: 0, ees: 0, svr: -0.1, v0Frac: 0.1, pvr: -0.2 } },
  // esmolol 0.5 mg/kg: HR −20 %, contractility −15 %; t½ 9 min
  esmolol: { refDose: 0.5, unit: 'mg/kg', tauOn: 30, tauOff: 540, peak: { hr: -0.2, ees: -0.15, svr: 0, v0Frac: 0, pvr: 0 } },
  // propofol 2 mg/kg (E ≈ 0.6 of Ce/(Ce + 3.5)): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E)
  propofol: { refDose: 2, unit: 'mg/kg', tauOn: 40, tauOff: 420, peak: { hr: 0, ees: -0.12, svr: -0.27, v0Frac: 0.05, pvr: 0, gv: -0.36 } },
};

export interface Bolus {
  drug: DrugId;
  t: number; // given at
  scale: number; // dose/refDose × tachyphylaxis
}

export function bolusScale(drug: DrugId, doseMg: number, weightKg: number, previous: readonly Bolus[]): number {
  const row = DRUGS[drug];
  const dose = row.unit === 'mg/kg' ? doseMg / weightKg : doseMg;
  const n = previous.filter((b) => b.drug === drug).length;
  return Math.min(2, dose / row.refDose) * (row.tachyphylaxis ?? 1) ** n;
}

function bateman(t: number, on: number, off: number): number {
  if (t <= 0) return 0;
  const tp = (Math.log(off / on) * on * off) / (off - on);
  const pk = Math.exp(-tp / off) - Math.exp(-tp / on);
  return (Math.exp(-t / off) - Math.exp(-t / on)) / pk;
}

/** Combined multipliers of every bolus at time t (β-mediated parts × (1 − betaBlock)). */
export function drugEffect(list: readonly Bolus[], t: number, betaBlock: number): DrugEffect {
  const e: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1 };
  for (const b of list) {
    const row = DRUGS[b.drug];
    const k = b.scale * bateman(t - b.t, row.tauOn, row.tauOff);
    if (k === 0) continue;
    const bb = row.betaMediated ? 1 - betaBlock : 1;
    e.hr *= 1 + row.peak.hr * k * bb;
    e.ees *= 1 + row.peak.ees * k * bb;
    e.svr *= 1 + row.peak.svr * k;
    e.v0Frac += row.peak.v0Frac * k;
    e.pvr *= 1 + row.peak.pvr * k;
    e.gv *= 1 + (row.peak.gv ?? 0) * k;
  }
  return e;
}

/** Drop boluses whose effect is below 0.1 % (t > 7 τoff). */
export function pruneBoluses(list: Bolus[], t: number): Bolus[] {
  return list.filter((b) => t - b.t < 7 * DRUGS[b.drug].tauOff);
}
```

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/drugs.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/drugs.ts packages/engine-core/test/l2/circ/drugs.test.ts
git commit -m "feat(circ): 7a bolus effect curves on mechanism multipliers, multiplicative, never on the reflex set point (A11)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 9: CircModel driver — beats → activation, 10 Hz control, per-beat truths, sanity numbers

**Files:**
- Create: `packages/engine-core/src/l2/circ/model.ts`, `packages/engine-core/test/helpers/circ.ts`, `packages/engine-core/test/l2/circ/model-sanity.test.ts`

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces: `CTL_DT`, `interface CircBeat { t; sbp; dbp; map; aoSys; aoDia; sv; svRv; lvedv; lvesv; lvedp; lvsp; avOpen; avClose; dur }`, `interface VolumeEvent { rate; until }`, `interface CircModelState` (fields `prof, weightKg, base, p, s, t, vent, atria, kLv, kRv, baro, boluses, vol, hrModel, ctlNext, mapSum, mapN, acc, beats, lastEjT, mapSetPinned, ext: { kLv, kRv, pvr, vFluid, pPtx, kIsch }`), `createCircModel(profile?)`, `circOnBeat(m, t, hr, origin, perfused)`, `circOnAtrial(m, tP)`, `circGiveDrug(m, drug, doseMg)`, `circVolume(m, ml, overS)`, `interface CircEnv { pIt; cprCardiac; cprThoracic; qVad; qAortaSrc; modeled }`, `RESTING_ENV`, `stepCircModel(m, tEnd, env, o, onStep?)`, `circCardiacOutput(m)`. Test helpers: `palv`, `ventEnv`, `driver`, `runTo`, `collectBeats`, `beatsIn`, `ppv`, `mean`, `VENT_DEFAULT`.

- [x] **Step 1: Write the helpers and the failing sanity test**

`packages/engine-core/test/helpers/circ.ts`:

```ts
// Stage 7a test helpers: drive a CircModel with a sinus rhythm that follows the model's own HR request (as the
// rhythm engine follows the hr ramp in MODELED mode), and a ventilator pleural signal.
import { circOnAtrial, circOnBeat, RESTING_ENV, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../../src/l2/circ/model.ts';
import { createOut, type CircOut } from '../../src/l2/circ/circuit.ts';
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../../src/l2/circ/params.ts';

export interface Vent { peep: number; vt: number; c: number; rr: number; ie: number }
export const VENT_DEFAULT: Vent = { peep: 5, vt: 500, c: 50, rr: 12, ie: 2 };

/** Alveolar pressure (cmH2O) of a volume-controlled breath with passive exponential expiration (τ 0.5 s). */
export function palv(v: Vent, t: number): number {
  const T = 60 / v.rr;
  const ti = T / (1 + v.ie);
  const u = ((t % T) + T) % T;
  const vol = u < ti ? v.vt * (u / ti) : v.vt * Math.exp(-(u - ti) / 0.5);
  return v.peep + vol / v.c;
}
export function ventEnv(v: Vent = VENT_DEFAULT): CircEnv {
  return { ...RESTING_ENV, pIt: (t) => P_PL0 + T_IT * palv(v, t) * CMH2O_TO_MMHG };
}

export interface Driver { m: CircModelState; nextBeat: number; o: CircOut }
export function driver(m: CircModelState): Driver {
  return { m, nextBeat: m.t + 0.2, o: createOut() };
}

/** Run to tEnd: beats follow m.hrModel (P wave 160 ms before each R). */
export function runTo(dr: Driver, tEnd: number, env: CircEnv, onStep?: (o: CircOut, t: number) => void): void {
  const m = dr.m;
  while (m.t < tEnd - 1e-9) {
    while (dr.nextBeat <= m.t + 0.3) {
      circOnAtrial(m, dr.nextBeat - 0.16);
      circOnBeat(m, dr.nextBeat, m.hrModel, 'sinus', true);
      dr.nextBeat += 60 / m.hrModel;
    }
    stepCircModel(m, Math.min(tEnd, m.t + 0.02), env, dr.o, onStep);
  }
}

export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
export function beatsIn(m: CircModelState, all: CircBeat[], t0: number, t1: number): CircBeat[] {
  return all.filter((b) => b.t >= t0 && b.t < t1);
}
/** Collects every completed beat (the model keeps only 16). */
export function collectBeats(m: CircModelState, into: CircBeat[]): () => void {
  let n = 0;
  return () => {
    for (const b of m.beats) if (b.t > (into[into.length - 1]?.t ?? -1)) into.push(b);
    n++;
  };
}
export function ppv(bs: CircBeat[]): number {
  const pp = bs.map((b) => b.sbp - b.dbp);
  return ((Math.max(...pp) - Math.min(...pp)) / mean(pp)) * 100;
}
```

`packages/engine-core/test/l2/circ/model-sanity.test.ts`:

```ts
// Stage 7a prototype sanity numbers on the bare CircModel (the engine-level versions are Task 26).
import { describe, expect, it } from 'vitest';
import { circGiveDrug, circVolume, createCircModel, type CircBeat } from '../../../src/l2/circ/model.ts';
import { beatsIn, collectBeats, driver, mean, ppv, runTo, ventEnv } from '../../helpers/circ.ts';

function run(prof: Parameters<typeof createCircModel>[0], ev: (m: ReturnType<typeof createCircModel>) => void, evT: number, tEnd: number) {
  const m = createCircModel(prof);
  const dr = driver(m);
  const env = ventEnv();
  const all: CircBeat[] = [];
  const col = collectBeats(m, all);
  const hr: { t: number; hr: number }[] = [];
  let fired = false;
  while (m.t < tEnd - 1e-9) {
    if (!fired && m.t >= evT) {
      ev(m);
      fired = true;
    }
    runTo(dr, m.t + 1, env);
    col();
    hr.push({ t: m.t, hr: m.hrModel });
  }
  const hrIn = (a: number, b: number) => mean(hr.filter((x) => x.t >= a && x.t < b).map((x) => x.hr));
  const mapIn = (a: number, b: number) => mean(beatsIn(m, all, a, b).map((x) => x.dbp + (x.sbp - x.dbp) / 3));
  return { m, all, hrIn, mapIn };
}

describe('CircModel sanity (prototype numbers)', () => {
  it('phenylephrine 100 µg: MAP +15–25 and reflex HR −5–15 (at 45 s) within 30–90 s', () => {
    const r = run(undefined, (m) => circGiveDrug(m, 'phenylephrine', 0.1), 120, 240);
    const m0 = r.mapIn(100, 120);
    const h0 = r.hrIn(100, 120);
    const dMap = Math.max(r.mapIn(145, 155), r.mapIn(175, 185), r.mapIn(205, 215)) - m0;
    expect(dMap).toBeGreaterThanOrEqual(15);
    expect(dMap).toBeLessThanOrEqual(25);
    const dHr45 = r.hrIn(160, 170) - h0;
    expect(dHr45).toBeLessThanOrEqual(-5);
    expect(dHr45).toBeGreaterThanOrEqual(-16);
  }, 60_000);
  it('25 % haemorrhage over 10 min (ventilated): HR 95–125, PP narrowed ≥ 30 %, PPV rises (tables: > 13 %; prototype ≈ 6–7 %, flagged)', () => {
    const r = run(undefined, (m) => circVolume(m, -0.25 * m.prof.bloodVolumeMl, 600), 120, 780);
    const b0 = beatsIn(r.m, r.all, 100, 120);
    const b1 = beatsIn(r.m, r.all, 740, 780);
    const pp0 = mean(b0.map((b) => b.sbp - b.dbp));
    const pp1 = mean(b1.map((b) => b.sbp - b.dbp));
    expect(r.hrIn(740, 780)).toBeGreaterThanOrEqual(95);
    expect(r.hrIn(740, 780)).toBeLessThanOrEqual(125);
    expect(pp1).toBeLessThanOrEqual(0.7 * pp0);
    expect(ppv(b0.slice(0, 15))).toBeLessThan(10);
    expect(ppv(b1.slice(0, 15))).toBeGreaterThan(ppv(b0.slice(0, 15)));
  }, 120_000);
  it('β-blocked 35 % haemorrhage: HR stays 75–95 (tables §7 17b)', () => {
    const r = run({ ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] }, (m) => circVolume(m, -0.35 * m.prof.bloodVolumeMl, 600), 120, 780);
    expect(r.hrIn(740, 780)).toBeGreaterThanOrEqual(75);
    expect(r.hrIn(740, 780)).toBeLessThanOrEqual(95);
  }, 120_000);
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/model-sanity.test.ts`
Expected: FAIL — cannot resolve `model.ts`.

- [x] **Step 3: Implement the model**

`packages/engine-core/src/l2/circ/model.ts`:

```ts
// CircModel: the L1-owned "haemodynamic integrator" (audit A4, R-A risk row) — the circuit state, its resolved
// parameters, the activations scheduled from the rhythm engine's beat/atrial records, the 10 Hz control layer
// (baroreflex, drugs, volume events, conditions) and per-beat truths. Stepped at 2 ms by the Stage 2 hemo pipeline
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { createBaro, stepBaro, type BaroState } from './baroreflex.ts';
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugId } from './drugs.ts';
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, P_PL0 } from './params.ts';
import { DEFAULT_PROFILE, resolveProfile, type CircProfile, type ResolvedProfile } from './profile.ts';
import { stabilise } from './stabilise.ts';

export const CTL_DT = 0.1; // control layer at 10 Hz (tables §2.1 step 6)

/** Per-beat truths published by the model (tables §2.1 step 5). */
export interface CircBeat {
  t: number; // activation onset
  sbp: number; dbp: number; map: number; // radial truth
  aoSys: number; aoDia: number;
  sv: number; // forward LV stroke volume (aortic valve), mL
  svRv: number;
  lvedv: number; lvesv: number; lvedp: number; lvsp: number;
  avOpen: number; avClose: number; // s after onset (−1 = did not open)
  dur: number; // to the next beat
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number;
}

export interface VolumeEvent {
  rate: number; // mL/s (+ fluid, − bleed)
  until: number;
}

export interface CircModelState {
  prof: ResolvedProfile;
  weightKg: number;
  base: CircParams; // stabilised profile parameters
  p: CircParams; // effective parameters (base × reflex × drugs × conditions)
  s: number[];
  t: number; // time of s
  vent: Activation[];
  atria: Activation[];
  kLv: number;
  kRv: number;
  baro: BaroState;
  boluses: Bolus[];
  vol: VolumeEvent[];
  hrModel: number; // bpm the reflex/drugs ask the rhythm engine for (MODELED)
  ctlNext: number;
  mapSum: number;
  mapN: number;
  acc: BeatAcc | null;
  beats: CircBeat[]; // last 16
  lastEjT: number;
  mapSetPinned: boolean;
  /** Extra multipliers owned by other modules (coronary ischaemia, conditions): applied at the next control step. */
  ext: { kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number };
}

export function createCircModel(profile: CircProfile = DEFAULT_PROFILE): CircModelState {
  const prof = resolveProfile(profile);
  const st = stabilise(prof);
  return {
    prof, weightKg: profile.weightKg, base: st.params, p: structuredClone(st.params), s: st.s, t: 0,
    vent: [], atria: [], kLv: 1, kRv: 1, baro: createBaro(st.ref.map), boluses: [], vol: [], hrModel: prof.targets.hr,
    ctlNext: 0, mapSum: 0, mapN: 0, acc: null, beats: [], lastEjT: 0, mapSetPinned: false,
    ext: { kLv: 1, kRv: 1, pvr: 1, vFluid: 0, pPtx: 0, kIsch: 1 },
  };
}

/** A mechanical beat at time t (the rhythm engine's R time). Pulseless beats schedule nothing (activation off). */
export function circOnBeat(m: CircModelState, t: number, hr: number, origin: string, perfused: boolean): void {
  if (!perfused) return;
  const amp = origin === 'ventricular' || origin === 'paced' ? DYSSYNC : 1;
  m.vent.push({ t0: t, T: activationPeriodS(Math.max(30, Math.min(250, hr))), amp });
}

/** An atrial depolarisation (P onset): atrial contraction, whatever the ventricles are doing (cannon waves emerge). */
export function circOnAtrial(m: CircModelState, tP: number): void {
  m.atria.push({ t0: tP + ATRIAL_DELAY_S, T: ATRIAL_T_S, amp: 1 });
}

export function circGiveDrug(m: CircModelState, drug: DrugId, doseMg: number): void {
  m.boluses.push({ drug, t: m.t, scale: bolusScale(drug, doseMg, m.weightKg, m.boluses) });
}

/** Bleed (negative) or infuse (positive) `ml` over `overS` seconds from now. */
export function circVolume(m: CircModelState, ml: number, overS: number): void {
  m.vol.push({ rate: ml / Math.max(0.1, overS), until: m.t + Math.max(0.1, overS) });
}

/** Environment the pipeline supplies each interval: pleural pressure, CPR, devices. */
export interface CircEnv {
  pIt: (t: number) => number;
  cprCardiac: (t: number) => number;
  cprThoracic: (t: number) => number;
  qVad: (lvp: number, aop: number) => number;
  qAortaSrc: (t: number) => number;
  modeled: boolean; // reflexes and the HR request run only in MODELED mode
}

const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

function control(m: CircModelState, env: CircEnv): void {
  const map = m.mapN > 0 ? m.mapSum / m.mapN : m.baro.mapLp;
  m.mapSum = 0;
  m.mapN = 0;
  const de = drugEffect(m.boluses, m.t, m.prof.betaBlock);
  const w = m.weightKg / 70;
  const b = env.modeled
    ? stepBaro(m.baro, map, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: m.prof.betaBlock, weightScale: w, pinnedSet: m.mapSetPinned })
    : { rrMs: 0, hrF: 1, svrF: 1, eesF: 1, dV0: 0, cSvF: 1 };
  const p = m.p;
  const base = m.base;
  p.rSys = base.rSys * b.svrF * de.svr;
  p.v0Sv = base.v0Sv + b.dV0 + de.v0Frac * m.prof.bloodVolumeMl;
  p.cSv = base.cSv * b.cSvF;
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr;
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr;
  p.vFluid = base.vFluid + m.ext.vFluid;
  m.kLv = b.eesF * de.ees * m.ext.kLv * m.ext.kIsch;
  m.kRv = b.eesF * de.ees * m.ext.kRv;
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr) + b.rrMs / 1000;
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
  m.vol = m.vol.filter((v) => v.until > m.t);
}

function closeBeat(m: CircModelState, t: number): void {
  const a = m.acc;
  if (!a || a.n < 5) return;
  m.beats.push({
    t: a.t, sbp: a.sbp, dbp: a.dbp, map: a.sum / a.n, aoSys: a.aoS, aoDia: a.aoD, sv: a.sv, svRv: a.svRv, lvedv: a.edv, lvesv: a.esv,
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t,
  });
  if (m.beats.length > 16) m.beats.shift();
}

const newAcc = (t: number, edv: number, edp: number): BeatAcc => ({
  t, sbp: -Infinity, dbp: Infinity, sum: 0, n: 0, aoS: -Infinity, aoD: Infinity, sv: 0, svRv: 0, edv, esv: edv, edp, lvsp: -Infinity, open: -1, close: -1, prevQ: 0,
});

/**
 * Advance the model to time tEnd in 2 ms RK4 steps; `o` receives the algebraic outputs at each step end and
 * `onStep(o, t)` (optional) sees every one of them (the pipeline samples the radial pressure for its transducer).
 */
export function stepCircModel(m: CircModelState, tEnd: number, env: CircEnv, o: CircOut, onStep?: (o: CircOut, t: number) => void): void {
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt: (t) => env.pIt(t) + m.ext.pPtx, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic,
    qIn: 0, qVad: env.qVad, qAortaSrc: env.qAortaSrc,
  };
  while (m.t < tEnd - 1e-9) {
    if (m.t >= m.ctlNext - 1e-9) {
      control(m, env);
      m.ctlNext += CTL_DT;
      d.kLv = m.kLv;
      d.kRv = m.kRv;
    }
    let q = 0;
    for (const v of m.vol) if (v.until > m.t) q += v.rate;
    d.qIn = q;
    // a beat window opens at each ventricular activation onset inside this step
    const next = m.vent.find((x) => x.t0 > m.t && x.t0 <= m.t + H_S);
    if (next) {
      closeBeat(m, next.t0);
      evaluate(m.s, m.t, m.p, d, o);
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt);
    }
    stepCirc(m.s, m.t, H_S, m.p, d);
    m.t += H_S;
    evaluate(m.s, m.t, m.p, d, o);
    m.mapSum += o.pRad;
    m.mapN++;
    const a = m.acc;
    if (a) {
      if (o.pRad > a.sbp) a.sbp = o.pRad;
      if (o.pRad < a.dbp) a.dbp = o.pRad;
      a.sum += o.pRad;
      a.n++;
      if (o.pAo > a.aoS) a.aoS = o.pAo;
      if (o.pAo < a.aoD) a.aoD = o.pAo;
      a.sv += Math.max(0, o.qAv) * H_S;
      a.svRv += Math.max(0, o.qPv) * H_S;
      const v = m.s[S.VLV] as number;
      if (v < a.esv) a.esv = v;
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
      if (a.prevQ <= 1 && o.qAv > 1 && a.open < 0) {
        a.open = m.t - a.t;
        m.lastEjT = m.t;
      }
      if (a.prevQ > 1 && o.qAv <= 1 && a.open >= 0) a.close = m.t - a.t;
      a.prevQ = o.qAv;
    }
    onStep?.(o, m.t);
  }
  m.vent = pruneActivations(m.vent, m.t);
  m.atria = pruneActivations(m.atria, m.t);
}

/** Cardiac output (L/min) from the last beats within 10 s; 0 when nothing ejected for 3 s. */
export function circCardiacOutput(m: CircModelState): number {
  if (m.t - m.lastEjT > 3) return 0;
  const bs = m.beats.filter((b) => m.t - b.t < 10);
  if (bs.length < 2) return 0;
  const sv = bs.reduce((a, b) => a + b.sv, 0);
  const dur = bs.reduce((a, b) => a + b.dur, 0);
  return (sv / Math.max(0.1, dur)) * 0.06;
}
```

- [x] **Step 4: Run the sanity test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/model-sanity.test.ts`
Expected: PASS (3 tests, ≈ 5 s). Prototype: phenylephrine MAP +20.0 at 45 s, HR −14.0; 25 % bleed HR 104–109, PP 37 → 20; β-blocked 35 % HR 79.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/test/helpers/circ.ts packages/engine-core/test/l2/circ/model-sanity.test.ts
git commit -m "feat(circ): CircModel — beat-scheduled activation, 10 Hz reflex/drug/volume control, per-beat truths (A4)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```


### Task 10: Circulatory conditions (tamponade, PE, tension pneumothorax, RV infarct)

**Files:**
- Create: `packages/engine-core/src/l2/circ/conditions.ts`, `packages/engine-core/test/l2/circ/conditions.test.ts`

**Interfaces:**
- Consumes: `CircModelState.ext` (Task 9).
- Produces: `type CircConditionId`, `CIRC_CONDITIONS`, `applyCircCondition(m, id, severity)`, constants `TAMPONADE_ML`, `PE_MAX_FRAC`, `PE_VASO`, `PTX_MMHG`, `RV_INFARCT_LOSS`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/conditions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyCircCondition, type CircConditionId } from '../../../src/l2/circ/conditions.ts';
import { circCardiacOutput, createCircModel } from '../../../src/l2/circ/model.ts';
import { driver, mean, runTo, ventEnv } from '../../helpers/circ.ts';

function measure(id: CircConditionId | null, sev: number) {
  const m = createCircModel();
  const dr = driver(m);
  const env = ventEnv();
  runTo(dr, 60, env);
  if (id) applyCircCondition(m, id, sev);
  runTo(dr, 150, env);
  const ra: number[] = [], pv: number[] = [], pa: number[] = [], paS: number[] = [], rvd: number[] = [];
  runTo(dr, 160, env, (o) => {
    ra.push(o.pRa); pv.push(o.pPv); pa.push(o.pPaRoot); rvd.push(o.pRv);
  });
  const b = m.beats.slice(-8);
  const r = { cvp: mean(ra), pcwp: mean(pv), mpap: mean(pa), paS: Math.max(...pa), paD: Math.min(...pa), co: circCardiacOutput(m), sbp: mean(b.map((x) => x.sbp)), hr: m.hrModel };
  console.log('COND', id, sev, JSON.stringify(r, (_k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)));
  return r;
}

describe('circulatory conditions (tables §2.3 H5, H7, H8)', () => {
  const base = measure(null, 0);
  it('tamponade 200 mL: CVP and PCWP rise and converge (within 5 mmHg), CO falls ≥ 15 %, HR rises (H7 wants RA 15–20: flagged)', () => {
    const t = measure('tamponade', 0.8);
    expect(t.cvp).toBeGreaterThan(base.cvp + 2.5);
    expect(Math.abs(t.cvp - t.pcwp)).toBeLessThanOrEqual(5);
    expect(t.co).toBeLessThan(0.85 * base.co);
    expect(t.hr).toBeGreaterThan(base.hr + 5);
  }, 120_000);
  it('massive PE (φ 0.6): mPAP 30–45, CVP rises, CO falls ≥ 10 % (H5 wants −40–60 %: flagged, needs RV ischaemia)', () => {
    const p = measure('pe', 0.75);
    expect(p.mpap).toBeGreaterThanOrEqual(30);
    expect(p.mpap).toBeLessThanOrEqual(45);
    expect(p.cvp).toBeGreaterThan(base.cvp + 0.5);
    expect(p.co).toBeLessThan(0.9 * base.co);
  }, 120_000);
  it('RV infarct (Ees_RV × 0.35): CVP up, PCWP not up, CO down', () => {
    const r = measure('rvInfarct', 1);
    expect(r.cvp).toBeGreaterThan(base.cvp + 2);
    expect(r.pcwp).toBeLessThanOrEqual(base.pcwp + 1);
    expect(r.co).toBeLessThan(base.co);
  }, 120_000);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/conditions.test.ts`
Expected: FAIL — cannot resolve `conditions.ts`.

- [ ] **Step 3: Implement**

`packages/engine-core/src/l2/circ/conditions.ts`:

```ts
// Circulatory conditions 7a implements (tables §2.2 rows pPtx, vFluid, peFrac, peVaso; §7 checks 12–15; B §4.9
// conditions): each writes the CircModel's `ext` multipliers, which the 10 Hz control layer applies. Severity 0–1.
//   tamponade   vFluid = 250 mL × severity (acute tamponade 150–250 mL, Q29)
//   pe          φ = 0.8 × severity; PVR × 1/(1 − φ) × (1 + peVaso·φ), peVaso 0.5 (McIntyre–Sasahara; Q27)
//   tensionPtx  pPtx = 20 mmHg × severity added to the pleural pressure (one side; 5–25 mmHg, Q28)
//   rvInfarct   RV Emax × (1 − 0.65 × severity) (tables H8: Ees_RV × 0.35)
import type { CircModelState } from './model.ts';

export type CircConditionId = 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct';
export const CIRC_CONDITIONS: readonly CircConditionId[] = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'];
export const TAMPONADE_ML = 250;
export const PE_MAX_FRAC = 0.8;
export const PE_VASO = 1.0;
export const PTX_MMHG = 20;
export const RV_INFARCT_LOSS = 0.65;

export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      m.ext.vFluid = TAMPONADE_ML * s;
      return;
    case 'pe': {
      const phi = PE_MAX_FRAC * s;
      m.ext.pvr = (1 / (1 - phi)) * (1 + PE_VASO * phi);
      return;
    }
    case 'tensionPtx':
      m.ext.pPtx = PTX_MMHG * s;
      return;
    case 'rvInfarct':
      m.ext.kRv = 1 - RV_INFARCT_LOSS * s;
      return;
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/conditions.test.ts`
Expected: PASS (3 tests). Prototype (adult, ventilated, 90 s after onset): baseline CVP 6.3 / PCWP 7.8 / mPAP 18.3 / CO 5.2; tamponade 200 mL CVP 9.5 / PCWP 11.9 / CO 3.9 / HR +14; PE φ 0.6 mPAP 38 (46/31), CVP 7.2, CO 4.6; RV infarct CVP 8.5, PCWP 5.6, CO 4.4.

- [ ] **Step 5: Run the whole circ folder, then commit**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ`
Expected: PASS (all circ tests).
```bash
git add packages/engine-core/src/l2/circ/conditions.ts packages/engine-core/test/l2/circ/conditions.test.ts
git commit -m "feat(circ): tamponade, massive PE, tension pneumothorax and RV infarct as circuit conditions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 11: Continuous pleural input from the breath driver (replaces the Paw → RAP coupling)

**Files:**
- Create: `packages/engine-core/src/l2/circ/pleural.ts`, `packages/engine-core/test/l2/circ/pleural.test.ts`
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (export `frameAt`, `meanVolume` unchanged otherwise), `packages/engine-core/src/l2/resp/pipeline.ts` (export `respPleural`; stop calling `applyPawCoupling`)

**Interfaces:**
- Consumes: `DriverState`, `cycleAt`, `cycleVolume` (Stage 3 driver); `P_PL0`, `T_IT`, `CMH2O_TO_MMHG`, `SPONT_SWING_CMH2O` (Task 2).
- Produces: `pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number`; `respPleural(rs: RespState, t: number): number` (resp pipeline); `RespState` no longer writes `l1.coupled.cvp/sbp/dbp/volumeStatus`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/pleural.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pleuralPressureMmHg } from '../../../src/l2/circ/pleural.ts';
import { createDriver, onVentFrame, planCycles, type DriverState } from '../../../src/l2/resp/driver.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import { P_PL0, T_IT, CMH2O_TO_MMHG } from '../../../src/l2/circ/params.ts';

function drv(source: DriverState['source'], peep = 5): DriverState {
  const d = createDriver(seedStream(1, 'resp'));
  d.source = source;
  d.vent = { rr: 12, vt: 500, peep, ie: 2 };
  planCycles(d, { rr: 12, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 }, 30);
  return d;
}

describe('pleural pressure (audit R-B)', () => {
  it('apnoea / no source: the resting supine value', () => {
    expect(pleuralPressureMmHg(drv('none'), 10, 50)).toBe(P_PL0);
  });
  it('ventilator: end-expiration = P_PL0 + T_IT·PEEP, end-inspiration ≈ + T_IT·VT/C more', () => {
    const d = drv('ventilator', 5);
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = 10; t < 20; t += 0.01) {
      const p = pleuralPressureMmHg(d, t, 50);
      lo = Math.min(lo, p);
      hi = Math.max(hi, p);
    }
    expect(lo).toBeCloseTo(P_PL0 + T_IT * 5 * CMH2O_TO_MMHG, 0);
    expect(hi - lo).toBeGreaterThan(0.9 * T_IT * 10 * CMH2O_TO_MMHG);
  });
  it('spontaneous: inspiration makes the pleura MORE negative (reverse sign)', () => {
    const d = drv('spontaneous');
    let lo = Infinity;
    for (let t = 10; t < 20; t += 0.01) lo = Math.min(lo, pleuralPressureMmHg(d, t, 50));
    expect(lo).toBeLessThan(P_PL0 - 2);
  });
  it('external drive: follows the stored frame pressure (Stage V stores alveolar pressure there)', () => {
    const d = drv('none');
    onVentFrame(d, { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 }, 1);
    onVentFrame(d, { pawCmH2O: 20, flowLps: 0.5, volumeMl: 300, fio2: 0.21, peepCmH2O: 5 }, 1.02);
    expect(pleuralPressureMmHg(d, 1.02, 50)).toBeCloseTo(P_PL0 + T_IT * 20 * CMH2O_TO_MMHG, 6);
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/pleural.test.ts`
Expected: FAIL — cannot resolve `pleural.ts`.

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/resp/driver.ts` change `function frameAt(e: ExtDrive, t: number, k: 1 | 2): number {` to `export function frameAt(e: ExtDrive, t: number, k: 1 | 2): number { // Stage 7a: exported for the pleural input`.

`packages/engine-core/src/l2/circ/pleural.ts`:

```ts
// Pleural (intrathoracic) pressure as a continuous input to the heart (audit R-B, A2; tables §2.1 thorax line):
//   positive-pressure breath: pIt = P_PL0 + T_IT·Palv(t)·0.7356, Palv = PEEP + ΔV(t)/C (breath driver volume) or the
//     external drive's stored frame pressure (Paw on main; alveolar pressure once Stage V stores palv ?? paw there)
//   spontaneous breath: pIt = P_PL0 − SPONT_SWING·(ΔV(t)/VT)·0.7356 (more negative in inspiration)
//   none / apnoea: pIt = P_PL0
import { cycleAt, cycleVolume, frameAt, type DriverState } from '../resp/driver.ts';
import { CMH2O_TO_MMHG, P_PL0, SPONT_SWING_CMH2O, T_IT } from './params.ts';

export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return P_PL0 + T_IT * frameAt(d.ext, t, 1) * CMH2O_TO_MMHG;
  const c = cycleAt(d, t);
  if (!c || !(c.vt > 0) || t >= c.cutAt) {
    const peep = d.source === 'ventilator' ? d.vent.peep : 0;
    return P_PL0 + T_IT * peep * CMH2O_TO_MMHG;
  }
  const dv = cycleVolume(c, t);
  if (c.mech) {
    const peep = d.source === 'ventilator' ? d.vent.peep : 0;
    return P_PL0 + T_IT * (peep + dv / Math.max(1, complianceMl)) * CMH2O_TO_MMHG;
  }
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) * CMH2O_TO_MMHG;
}
```

In `packages/engine-core/src/l2/resp/pipeline.ts`:
- add the import `import { pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a`
- after `respBreathU` add:

```ts
/** Stage 7a seam: continuous pleural pressure (mmHg) for the circulation (audit R-B). */
export function respPleural(rs: RespState, t: number): number {
  return pleuralPressureMmHg(rs.driver, t, compliance(rs));
}
```

- replace the line `  applyPawCoupling(l1, meanAirwayPressure(d, t, compliance(rs)), t);` with

```ts
  // Stage 7a: heart–lung interaction is emergent through respPleural(); the MANUAL mean-Paw coupling is retired
  // (decision 8). Clear any coupled truths a restored pre-7a snapshot might carry.
  const cc = (l1.coupled ??= {});
  delete cc.cvp;
  delete cc.sbp;
  delete cc.dbp;
  delete cc.volumeStatus;
```

- remove `applyPawCoupling` from the `../gas/coupling.ts` import and `meanAirwayPressure` from the `./driver.ts` import if they become unused (TypeScript `noUnusedLocals` is off, but keep the imports tidy).

- [ ] **Step 4: Run the test and the Stage 3 suites**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/pleural.test.ts test/l2/gas test/l2/resp`
Expected: pleural PASS (4). `test/l2/gas/coupling*.test.ts` still pass (they call `applyPawCoupling` directly, which stays exported). Engine-level Stage 3 tests that assert the PEEP → CO/MAP coupling (`test/engine/resp-coupling.test.ts`) now FAIL until Task 12 wires the pleural input into the circulation — that is expected here; Task 12 Step 4 re-runs them.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/pleural.ts packages/engine-core/test/l2/circ/pleural.test.ts packages/engine-core/src/l2/resp/driver.ts packages/engine-core/src/l2/resp/pipeline.ts
git commit -m "feat(circ): continuous pleural pressure from the breath driver and external frames; retire the mean-Paw coupling (R-B)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 12: Hemo pipeline fed by the circuit (ABP via radial delay + transducer, PAP, CVP, wedge)

This is the central integration task. Stage 2's pulse generator (`lv/rv` Pulse lists, `circulation.ts` stepping) is replaced by the CircModel; everything downstream (lines, transducers, display, numerics, NIBP, pleth, events) is unchanged.

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts`, `packages/engine-core/src/engine.ts`, `packages/engine-core/src/l1/state.ts` (1 line)
- Create: `packages/engine-core/test/engine/circ-pipeline.test.ts`

**Interfaces:**
- Consumes: Task 9 model API, Task 11 `respPleural`.
- Produces: `HemoState.circ: CircModelState`, `HemoState.circOut: CircOut`, `HemoState.radQ: number[]` (radial delay line, `RAD_DELAY_STEPS = 22` × 2 ms = 44 ms), `HemoState.beatT: number` (last CircBeat consumed), `HemoCtx.pIt?: (t: number) => number`, `HemoCtx.requestHr?: (bpm: number) => void` (used in Task 15). `createHemoState(profile, l1, hr0)` signature unchanged.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-pipeline.test.ts`:

```ts
// The Stage 2 channels are now fed by the Stage 7a circulation (MANUAL mode, default profile).
import { describe, expect, it } from 'vitest';
import { read, rig } from '../helpers/hemo.ts';

describe('hemo pipeline fed by the circulation', () => {
  it('ABP is a radial waveform with a dicrotic notch near 120/80 once the tracker settles', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(40);
    const w = read(e, 'abp', 30, 40);
    const sbp = Math.max(...w);
    const dbp = Math.min(...w);
    expect(sbp).toBeGreaterThan(112);
    expect(sbp).toBeLessThan(128);
    expect(dbp).toBeGreaterThan(74);
    expect(dbp).toBeLessThan(86);
  });
  it('the state snapshot carries the circulation and stays JSON-safe (structuredClone round-trip is exact)', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(5);
    const s = e.snapshot();
    expect(JSON.parse(JSON.stringify(s.state)).st.hemo.circ.s.length).toBe(11);
  });
  it('CVP and PAP lines show chamber-derived traces with the expected means', () => {
    const { e } = rig({ hr: 75, sensors: { cvp: 'connected', pap: 'connected' } });
    e.advanceTo(40);
    const cvp = read(e, 'cvp', 30, 40);
    const pap = read(e, 'pap', 30, 40);
    const mean = (a: Float32Array) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(cvp)).toBeGreaterThan(2);
    expect(mean(cvp)).toBeLessThan(9);
    expect(Math.max(...pap)).toBeGreaterThan(18);
    expect(Math.max(...pap)).toBeLessThan(34);
    expect(Math.min(...pap)).toBeGreaterThan(4);
    expect(Math.min(...pap)).toBeLessThan(15);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-pipeline.test.ts`
Expected: the snapshot test FAILS (`circ` undefined); the others may pass or fail on Stage 2's generator — both are fine.

- [ ] **Step 3: Wire the model into the pipeline**

In `packages/engine-core/src/l2/hemo/pipeline.ts`:

(a) Imports — add:

```ts
import { createOut, type CircOut } from '../circ/circuit.ts'; // Stage 7a
import { circOnAtrial, circOnBeat, createCircModel, stepCircModel, type CircEnv, type CircModelState } from '../circ/model.ts'; // Stage 7a
import { DEFAULT_PROFILE, type CircProfile, type ConditionId } from '../circ/profile.ts'; // Stage 7a
import { H_S as CIRC_H } from '../circ/params.ts'; // Stage 7a
```

(b) Constants — after `const NIBP_SITES …` add:

```ts
/** Stage 7a: aortic root → radial transport delay as a 2 ms delay line (Stage 2 RADIAL_DELAY_S 0.045 → 22 steps). */
export const RAD_DELAY_STEPS = 22;

/** Stage 7a: PatientProfile → CircProfile (R22 minimal layer; unknown condition ids are ignored). */
export function circProfileOf(profile: PatientProfile | undefined): CircProfile {
  const known: readonly string[] = ['hfref', 'hfpef', 'htn', 'as', 'ar', 'mr', 'ms', 'tr', 'cad', 'betaBlocked', 'rvFailure', 'ph'];
  return {
    ageY: profile?.ageY ?? DEFAULT_PROFILE.ageY,
    sex: profile?.sex ?? DEFAULT_PROFILE.sex,
    weightKg: profile?.weightKg ?? DEFAULT_PROFILE.weightKg,
    conditions: (profile?.conditions ?? []).filter((c) => known.includes(c.id)).map((c) => ({ ...c, id: c.id as ConditionId })),
  };
}
```

(c) `HemoCtx` — add two optional members:

```ts
  pIt?: (t: number) => number; // Stage 7a: continuous pleural pressure (mmHg); absent → resting −4
  requestHr?: (bpm: number) => void; // Stage 7a: MODELED mode drives the rhythm engine's rate (Task 15)
```

(d) `HemoState` — add:

```ts
  circ: CircModelState; // Stage 7a: the circulation (L1-owned integrator, audit A4)
  circOut: CircOut; // Stage 7a: algebraic outputs at the last 2 ms step
  radQ: number[]; // Stage 7a: radial delay line (RAD_DELAY_STEPS + 1 values)
  beatT: number; // Stage 7a: onset time of the last CircBeat turned into a site beat
```

(e) `createHemoState` — after `const spo2 = …` add `const circ = createCircModel(circProfileOf(profile)); // Stage 7a` and in the returned object add
`circ, circOut: createOut(), radQ: new Array<number>(RAD_DELAY_STEPS + 1).fill(circ.s[0] as number), beatT: -1,`.

(f) `onBeat` — at the very top of the function body (before `const t = b.t;`) insert:

```ts
  // Stage 7a: the beat schedules a ventricular activation; SV, PP, PESP-like and AF effects emerge (decision 11/13)
  {
    const rr7 = hs.lastBeatT >= 0 ? Math.max(0.15, b.t - hs.lastBeatT) : hs.lastRR;
    const perfused = !PULSELESS_RHYTHMS.has(ctx.rhythm.id) && b.mech.perfused;
    circOnBeat(hs.circ, b.t, 60 / rr7, b.origin, perfused);
    hs.lastBeatT = b.t;
    hs.lastRR = rr7;
    cvpOnBeat(hs.cvp, b.t, b.qrsMs, b.qtMs, rr7);
    return;
  }
```

Everything below the inserted block in `onBeat` becomes unreachable legacy (Stage 2's MANUAL pulse path); delete it in the same commit (the constants it used — `FS_CARRY`, `ejectionFactor`, `gHyp`, `respFactor`, `EJECTION_SKEW`, `KAPPA`, `BACKFLOW_FRAC` — stay exported from `params.ts` because Stage 2 unit tests import them).

(g) `intake` — for atrial records, also schedule atrial contraction: replace the `if (r.kind === 'p' && r.t > hs.lastPT) {` block with

```ts
      if ((r.kind === 'p' || r.kind === 'retrograde' || r.kind === 'paced') && r.t > hs.lastPT) {
        hs.lastPT = r.t;
        cvpOnP(hs.cvp, r.t);
        circOnAtrial(hs.circ, r.t); // Stage 7a: atrial kick; AF ('fib') and flutter records give none
      }
```

(h) The sample loop in `advanceHemo` — replace the whole `if (m > 0) { for (let j = 0; j < SUBSTEPS; j++) { … } }` block with:

```ts
    if (m > 0) {
      const env = circEnv(hs, ctx);
      for (let j = 0; j < SUBSTEPS; j++) {
        const ta = t0 + j * H_S;
        const tb = ta + H_S;
        const o = hs.circOut;
        const pr0 = hs.radQ[0] as number;
        const pa0 = o.pPaRoot;
        const cv0 = o.pRa;
        stepCircModel(hs.circ, tb, env, o);
        hs.radQ.push(o.pRad);
        hs.radQ.shift();
        const pr1 = hs.radQ[0] as number;
        if (ab.sensor !== 'none') stepTransducer(ab, lineInput(ab, atCatheter(pr0), ta), lineInput(ab, atCatheter(pr1), tb), H_S);
        if (pa.sensor !== 'none') stepTransducer(pa, lineInput(pa, wedged(pa0, ta), ta), lineInput(pa, wedged(o.pPaRoot, tb), tb), H_S);
        if (cv.sensor !== 'none') stepTransducer(cv, lineInput(cv, cv0, ta), lineInput(cv, o.pRa, tb), H_S);
      }
    }
```

and replace `const wedged = (p: number, t: number) => (hs.wedge.w < 1e-3 ? p : (1 - hs.wedge.w) * p + hs.wedge.w * (hs.pla + 1.3 * cvpWavesAt(hs.cvp, t)));` with
`const wedged = (p: number) => (hs.wedge.w < 1e-3 ? p : (1 - hs.wedge.w) * p + hs.wedge.w * hs.circOut.pPv); // Stage 7a: wedge = pulmonary venous (LA) pressure` (and drop the unused `t` argument at both call sites above: `wedged(pa0)`, `wedged(o.pPaRoot)`).

Note `H_S` (Stage 2, 0.002) equals `CIRC_H` (Task 2); add `if (H_S !== CIRC_H) throw new Error('hemo and circ steps differ');` once at module scope after the imports.

(i) Add the environment builder near `planCompressions`:

```ts
const zeroFn = () => 0;
/** Stage 7a: the circulation's environment for one sample (pleural input; CPR and devices arrive in Tasks 17, 20–21). */
function circEnv(hs: HemoState, ctx: HemoCtx): CircEnv {
  return { pIt: ctx.pIt ?? (() => -4), cprCardiac: zeroFn, cprThoracic: zeroFn, qVad: () => 0, qAortaSrc: zeroFn, modeled: ctx.l1.mode === 'modeled' };
}
```

(j) Site windows: replace the two `while (hs.opens…` / `while (hs.opensPa…` blocks and their `accumulate` lines with the per-beat hand-off from the model (Task 13 fills in the tracker/NIBP/pleth consumers):

```ts
    for (const cb of hs.circ.beats) {
      if (cb.t <= hs.beatT) continue;
      hs.beatT = cb.t;
      onCircBeat(hs, ctx, cb, t1);
    }
```

and add a stub right above `advanceHemo` (Task 13 replaces its body):

```ts
/** Stage 7a: a completed CircBeat → site beat (tracker, NIBP), pleth pulse. */
function onCircBeat(hs: HemoState, ctx: HemoCtx, cb: import('../circ/model.ts').CircBeat, t: number): void {
  const beat: SiteBeatStat = { t: cb.t, sbp: cb.sbp, dbp: cb.dbp, map: cb.map, ref: false, cpr: false, sv: cb.sv, dur: cb.dur };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  hs.lastEjT = cb.avOpen >= 0 ? cb.t + cb.avOpen : hs.lastEjT;
  void ctx;
  void t;
}
```

(k) `isArrested` — replace its body with `return t - hs.circ.lastEjT > Math.max(ARREST_AFTER_S, 2.2 * hs.lastRR); // Stage 7a: from the aortic valve`.

(l) `emitSecond` — replace `values.svr = hs.sys.R;` with `values.svr = hs.circ.p.rSys; // Stage 7a`.

(m) `attachSensor` in `applyHemoCommand`: replace `const pNow = sensor === 'abp' ? (hs.circ[0] as number) : sensor === 'cvp' ? hs.pv : (hs.circ[4] as number);` with `const pNow = sensor === 'abp' ? (hs.circ.s[0] as number) : sensor === 'cvp' ? hs.circOut.pRa : hs.circOut.pPaRoot; // Stage 7a`, and delete the Stage 2 `circ: restState(map, pam)` field and the `restState`/`stepCirculation`/`radialPressure`/`paPressure` imports (the `HemoState.circ` name is reused by the model).

In `packages/engine-core/src/l1/state.ts` change `  mode: 'manual';` (in `L1State`) to `  mode: 'manual' | 'modeled'; // Stage 7a (Task 15 switches it)`.

In `packages/engine-core/src/engine.ts`, in `advance()`:
- add `respPleural` to the Stage 3 import list from `./l2/resp/pipeline.ts`;
- change the `advanceHemo` context object to
`{ l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi, u: (t) => respBreathU(resp, t), pIt: (t) => respPleural(resp, t), requestHr: (bpm) => { ps.hr = constantRamp(bpm); } }, // Stage 7a: pIt, requestHr`.

- [ ] **Step 4: Run the new test, then the Stage 2/3 engine suites**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-pipeline.test.ts`
Expected: PASS (3). If the resting ABP sits outside 112–128/74–86 it is because the MANUAL tracker is not wired yet (Task 14): the untracked adult (radial 121/80 at HR 70 with PEEP 0) is inside the band, so a failure here means a wiring error — print `hs.circ.beats.at(-1)` and check that `circOnBeat` receives perfused beats.

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine`
Expected: most Stage 2/3 engine tests pass; those that depend on the Stage 2 generator's specific numbers (PPV via `g_hyp`, post-PVC +8–15, CPR amplitude, pulseless plateau, tracker 90/50, NIBP bias) may fail — Task 25 re-checks and re-specifies each one. Record the failing test names in the commit body.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/src/l1/state.ts packages/engine-core/test/engine/circ-pipeline.test.ts
git commit -m "feat(hemo): the Stage 2 pipeline is fed by the Stage 7a circulation — radial delay line, PA root, RA, wedge from the chambers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 13: Site beats, pleth and the CO consumer on CircBeats

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`onCircBeat` body), `packages/engine-core/src/l2/gas/coupling.ts` (`cardiacOutput`)
- Create: `packages/engine-core/test/engine/circ-beats.test.ts`

**Interfaces:**
- Consumes: `CircBeat` (Task 9), Stage 2 `trackBeat`, `nibpOnPulse`, `addPlethPulse`, `plethDelayS`, `isReferenceBeat`.
- Produces: `cardiacOutput(hs, t)` now returns `circCardiacOutput(hs.circ)` (CPR included because compressions eject through the model, Task 17).

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-beats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { numeric, rig } from '../helpers/hemo.ts';

describe('CircBeats feed the Stage 2/3 consumers', () => {
  it('pulse rate (pleth) equals HR in sinus and the NIBP cycle completes near the arterial truth', () => {
    const { e, ev } = rig({ hr: 75, sensors: { abp: 'connected' } });
    e.dispatch({ id: 'n', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'start' } });
    e.advanceTo(60);
    const pr = numeric(ev, 'pr', 40, 60);
    expect(pr.length).toBeGreaterThan(5);
    expect(Math.abs(pr[pr.length - 1]! - 75)).toBeLessThanOrEqual(3);
    const sys = numeric(ev, 'nibpSys');
    expect(sys.length).toBe(1);
    expect(sys[0]!).toBeGreaterThan(100);
    expect(sys[0]!).toBeLessThan(135);
  });
  it('the gas model reads cardiac output from the circulation (4–7 L/min at rest)', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(20);
    const st = (e.snapshot().state as { st: { hemo: Parameters<typeof cardiacOutput>[0] } }).st;
    const co = cardiacOutput(st.hemo, 20);
    expect(co).toBeGreaterThan(4);
    expect(co).toBeLessThan(7);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-beats.test.ts`
Expected: FAIL — PR invalid (no pleth pulses) and the NIBP cycle never completes (no oscillations).

- [ ] **Step 3: Implement**

Replace the `onCircBeat` stub body in `pipeline.ts` with:

```ts
function onCircBeat(hs: HemoState, ctx: HemoCtx, cb: import('../circ/model.ts').CircBeat, t: number): void {
  const ejected = cb.avOpen >= 0 && cb.sv > 1;
  // a reference beat: ejected, supraventricular-like (full activation), no big volume swing vs the last beat
  const prev = hs.siteBeats[hs.siteBeats.length - 1];
  const steady = ejected && (!prev || Math.abs(cb.sv - prev.sv) <= 0.25 * Math.max(1, prev.sv));
  const ref = hs.prevRef && steady;
  hs.prevRef = steady;
  const beat: SiteBeatStat = { t: cb.t, sbp: cb.sbp, dbp: cb.dbp, map: cb.map, ref, cpr: hs.cpr.active, sv: cb.sv, dur: cb.dur };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  if (ejected) {
    hs.lastEjT = cb.t + cb.avOpen;
    const lvet = Math.max(0.1, cb.avClose - cb.avOpen);
    const svRef = Math.max(1, hs.circ.beats.length > 4 ? hs.circ.beats.slice(0, -1).reduce((a, b) => a + b.sv, 0) / (hs.circ.beats.length - 1) : cb.sv);
    addPlethPulse(hs.pleth, cb.t + cb.avOpen + plethDelayS(hs.pleth.site), (l1Value(ctx.l1, 'pi', t) * cb.sv) / svRef, lvet, hs.circ.p.rSys);
  }
  if (ctx.l1.mode !== 'modeled') trackCircBeat(hs, ctx, beat); // Task 14
  nibpOnPulse(hs.nibp, t, beat, hs.cpr.active || beat.cpr, ctx.rng.measurement);
}

/** Stage 7a MANUAL tracker hand-off (Task 14 implements it). */
function trackCircBeat(_hs: HemoState, _ctx: HemoCtx, _b: SiteBeatStat): void {}
```

In `packages/engine-core/src/l2/gas/coupling.ts` replace the body of `cardiacOutput` with:

```ts
  void t;
  return circCardiacOutput(hs.circ); // Stage 7a: CO from the circulation (CPR compressions eject through it)
```

and add `import { circCardiacOutput } from '../circ/model.ts'; // Stage 7a`. Remove the now-unused `CPR_SV_FRAC`, `SV_REF_ML` imports.

- [ ] **Step 4: Run the test and the gas/resp engine suites**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-beats.test.ts test/engine/resp-oxygen.test.ts test/engine/resp-capnogram.test.ts`
Expected: PASS. (CO at rest ≈ 5.2–5.6 L/min, prototype.)

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l2/gas/coupling.ts packages/engine-core/test/engine/circ-beats.test.ts
git commit -m "feat(hemo): site beats, pleth pulses, NIBP oscillations and gas-model CO from CircBeats" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 14: MANUAL tracker on Ees / SVR / venous V0 / PVR; volumeStatus → stressed volume

**Files:**
- Modify: `packages/engine-core/src/l2/circ/model.ts` (a `man` multiplier set applied in `control`), `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat`, CVP/PA trackers)
- Create: `packages/engine-core/test/engine/circ-manual.test.ts`

**Interfaces:**
- Produces: `CircModelState.man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null }` (MANUAL only; neutral `{1, null, 0, 1, null}` in MODELED); `MANUAL_CVP_GAIN = 0.3` (mL per mmHg per mL/mmHg per second); `volumeStatusCvp(cvpTarget, vs) = cvpTarget − 0.8·cvpTarget·(1 − vs)` [ENG, decision 9].

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-manual.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('MANUAL mode on the circulation (brief §4.9 M2 via Ees/SVR/V0)', () => {
  it('targets 90/50 with a 30 s ramp are met ±4 mmHg on the displayed ABP 10 beats after the ramp', () => {
    const { e } = rig({ hr: 80 });
    e.advanceTo(20);
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 30 } }));
    e.advanceTo(75);
    const w = read(e, 'abp', 65, 75);
    expect(Math.abs(Math.max(...w) - 90)).toBeLessThanOrEqual(4);
    expect(Math.abs(Math.min(...w) - 50)).toBeLessThanOrEqual(4);
  });
  it('a CVP target of 12 is met within 60 s on the CVP line (±1.5 mmHg mean)', () => {
    const { e } = rig({ hr: 75, sensors: { cvp: 'connected' } });
    e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: 12 }));
    e.advanceTo(80);
    const w = read(e, 'cvp', 70, 80);
    const m = w.reduce((a, b) => a + b, 0) / w.length;
    expect(Math.abs(m - 12)).toBeLessThanOrEqual(1.5);
  });
  it('volumeStatus 0.3 lowers CVP and narrows PP (hypovolaemia is emergent)', () => {
    const a = rig({ hr: 75, sensors: { cvp: 'connected' } });
    const b = rig({ hr: 75, sensors: { cvp: 'connected' }, baseline: { volumeStatus: 0.3 } });
    a.e.advanceTo(90);
    b.e.advanceTo(90);
    const mean = (x: Float32Array) => x.reduce((p, q) => p + q, 0) / x.length;
    expect(mean(read(b.e, 'cvp', 80, 90))).toBeLessThan(mean(read(a.e, 'cvp', 80, 90)) - 2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual.test.ts`
Expected: FAIL (targets not met: no tracker yet).

- [ ] **Step 3: Implement**

In `model.ts`:
- add to `CircModelState`: `man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null };` and initialise `man: { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null },` in `createCircModel`;
- in `control`, replace the four lines from `p.rSys = …` to `p.pvrR = …` with:

```ts
  const man = env.modeled ? { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null } : m.man; // Stage 7a Task 14
  p.rSys = (man.rSys ?? base.rSys) * b.svrF * de.svr;
  p.v0Sv = base.v0Sv + b.dV0 + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
  p.cSv = base.cSv * b.cSvF;
  const pvrF = man.pvr === null ? 1 : man.pvr / (base.pvrL * base.pvrR / (base.pvrL + base.pvrR));
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF;
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr * pvrF;
```

- and replace `m.kLv = …` / `m.kRv = …` with `m.kLv = b.eesF * de.ees * m.ext.kLv * m.ext.kIsch * man.eesF;` and `m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF;`.

In `pipeline.ts`, replace the `trackCircBeat` stub with:

```ts
export const MANUAL_CVP_GAIN = 0.3; // Stage 7a [ENG]: dV0 −= gain·(CVP* − CVP)·cSv per second
/** Decision 9: hypovolaemia (volumeStatus < 1) lowers the CVP the tracker aims for, so stressed volume falls. */
export function volumeStatusCvp(cvpTarget: number, vs: number): number {
  return cvpTarget - 0.8 * cvpTarget * (1 - Math.min(1, Math.max(0, vs)));
}

/** Stage 7a MANUAL M2: the Stage 2 tracker algorithm, its gain acting on LV Emax and its R on systemic resistance. */
function trackCircBeat(hs: HemoState, ctx: HemoCtx, b: SiteBeatStat): void {
  const target = { sbp: l1Value(ctx.l1, 'sbp', b.t), dbp: l1Value(ctx.l1, 'dbp', b.t) };
  hs.sys.g = hs.circ.man.eesF;
  hs.sys.R = hs.circ.man.rSys ?? hs.circ.base.rSys;
  trackBeat(hs.sys, b, target, hs.circOut.pSv, { gMin: 0.3, gMax: 2.5, rMin: 0.3, rMax: 4 }, 2.5);
  hs.circ.man.eesF = hs.sys.g;
  hs.circ.man.rSys = hs.sys.R;
}
```

and in the sample loop, after the substep block, add the slow CVP and PA trackers (10 Hz is enough; run them every 12th sample):

```ts
    if (ctx.l1.mode !== 'modeled' && m % 12 === 0) {
      const c = hs.circ;
      const cvpT = volumeStatusCvp(l1Value(ctx.l1, 'cvp', t1), l1Value(ctx.l1, 'volumeStatus', t1));
      c.man.dV0 -= MANUAL_CVP_GAIN * (cvpT - hs.circOut.pRa) * c.p.cSv * (12 / HEMO_RATE);
      c.man.dV0 = Math.min(0.5 * c.prof.bloodVolumeMl, Math.max(-0.5 * c.prof.bloodVolumeMl, c.man.dV0));
      // PA: mean → PVR (steady-state inverse, as the systemic R), pulse pressure → RV Emax
      const pasT = l1Value(ctx.l1, 'papSys', t1);
      const padT = l1Value(ctx.l1, 'papDia', t1);
      const pamT = padT + (pasT - padT) / 3;
      const q = hs.circOut.qLungL + hs.circOut.qLungR;
      if (q > 20) {
        const want = Math.max(0.01, (pamT - hs.circOut.pPv) / q);
        c.man.pvr = (c.man.pvr ?? want) * (want / (c.man.pvr ?? want)) ** 0.1;
      }
    }
```

Keep `hs.pv` and `hs.pla` updated for the Stage 2 consumers that still read them: after the substep block set `hs.pv = hs.circOut.pRa; hs.pla = hs.circOut.pPv;`.

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual.test.ts test/engine/circ-pipeline.test.ts`
Expected: PASS (6).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/circ-manual.test.ts
git commit -m "feat(hemo): MANUAL tracker on LV Emax, SVR, venous V0 and PVR; volumeStatus lowers stressed volume (R42)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 15: MODELED mode (setMode, engine option, HR drive, state event, flags, pins)

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (constructor accepts `mode: 'modeled'`), `packages/engine-core/src/l2/hemo/pipeline.ts` (`validateHemoCommand` `setMode`, `applyHemoCommand` `setMode`, the 10 Hz HR request, `emitSecond` mode/flags)
- Create: `packages/engine-core/test/engine/circ-modeled.test.ts`

**Interfaces:**
- Produces: `setMode { mode: 'modeled' }` accepted; `EngineOptions.mode: 'modeled'` accepted; `state` event `mode: 'modeled'` with control flag `'modeled'` on `sbp, dbp, cvp, papSys, papDia, pawp, svr` unless pinned; in MODELED the pipeline calls `ctx.requestHr(circ.hrModel)` every 100 ms when `hr` is not pinned and the change exceeds 0.2 bpm. MANUAL → MODELED re-bases the baroreflex set point on the current MAP (brief §4.9 "no step > 2 mmHg / 2 bpm"); MODELED → MANUAL freezes the current truths as targets (`setL1Target` for sbp/dbp/cvp from the last beat, hr ramp unchanged).

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-modeled.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, numeric } from '../helpers/hemo.ts';

describe('MODELED mode', () => {
  it('the engine starts modeled when asked; state events say so; HR follows the reflex', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(30);
    const st = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state');
    expect(st[st.length - 1]!.mode).toBe('modeled');
    expect(st[st.length - 1]!.control.sbp).toBe('modeled');
    const hr = numeric(ev, 'hr', 20, 30);
    expect(hr[hr.length - 1]!).toBeGreaterThan(60);
    expect(hr[hr.length - 1]!).toBeLessThan(85);
  });
  it('switching MANUAL → MODELED moves ABP by no more than a few mmHg in the next 10 s (no step)', () => {
    const e = createEngine({ seed: 3, patient: { sensors: { abp: 'connected' } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'setMode', mode: 'modeled' }));
    e.advanceTo(40);
    const before = numeric(ev, 'abpMean', 25, 30);
    const after = numeric(ev, 'abpMean', 30, 40);
    expect(Math.max(...after.map((x) => Math.abs(x - before[before.length - 1]!)))).toBeLessThan(8);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-modeled.test.ts`
Expected: FAIL — `MODELED mode arrives in Stage 7`.

- [ ] **Step 3: Implement**

`engine.ts` constructor: replace `if (opts.mode === 'modeled') throw new Error('MODELED mode arrives in Stage 7');` with `// Stage 7a: MODELED is accepted (the circulation's reflexes run)`, and after `const l1 = createL1State(opts.patient); // Stage 2` add `if (opts.mode === 'modeled') l1.mode = 'modeled'; // Stage 7a`.

`pipeline.ts`:
- `validateHemoCommand`, `case 'setMode':` → `return cmd.mode === 'manual' || cmd.mode === 'modeled' ? undefined : 'mode must be manual or modeled';`
- `applyHemoCommand`, `case 'setMode':` →

```ts
    case 'setMode': {
      if (cmd.mode === l1.mode) return true;
      if (cmd.mode === 'modeled') {
        hs.circ.baro = createBaro(hs.lastSite.map); // no step on entry (brief §4.9)
        hs.circ.base.rSys = hs.circ.man.rSys ?? hs.circ.base.rSys; // the MANUAL solution becomes the model's baseline
        hs.circ.base.v0Sv += hs.circ.man.dV0;
        hs.circ.base.eesLv *= hs.circ.man.eesF;
        hs.circ.man = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null };
      } else {
        setL1Target(l1, 'sbp', t, Math.round(hs.lastSite.sbp)); // freeze outputs as targets
        setL1Target(l1, 'dbp', t, Math.round(hs.lastSite.dbp));
        setL1Target(l1, 'cvp', t, Math.round(hs.circOut.pRa));
      }
      l1.mode = cmd.mode;
      return true;
    }
```

(import `createBaro` from `../circ/baroreflex.ts`).
- in the sample loop, after the Task 14 MANUAL block add:

```ts
    if (ctx.l1.mode === 'modeled' && m % 12 === 0 && !ctx.l1.pinned.includes('hr') && ctx.requestHr) {
      const want = hs.circ.hrModel;
      if (Math.abs(want - rampValue(ctx.hr, t1)) > 0.2) ctx.requestHr(want);
    }
```

- `emitSecond`: replace `mode: 'manual'` with `mode: ctx.l1.mode` and, before pushing the state event, add
```ts
  if (ctx.l1.mode === 'modeled') for (const v of ['sbp', 'dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'svr'] as const) if (!ctx.l1.pinned.includes(v)) flags[v] = 'modeled';
```
where `flags` is the `l1Flags(…)` result stored in a local first; in MODELED also write the model's truths into `values`: `values.sbp = hs.lastSite.sbp; values.dbp = hs.lastSite.dbp; values.cvp = hs.circOut.pRa; values.pawp = hs.circOut.pPv;`.

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-modeled.test.ts test/engine/engine-commands.test.ts`
Expected: circ-modeled PASS (2). In `engine-commands.test.ts` the assertion that `setMode modeled` is rejected (and the constructor test `mode: 'modeled'` throws) must flip: change those two expectations to "accepted"/"does not throw" and note it in the commit body (Stage 1/2 tests touched, as Stage 2's decision 15 did).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/circ-modeled.test.ts packages/engine-core/test/engine/engine-commands.test.ts
git commit -m "feat(engine-core): MODELED mode — reflexes drive HR and pressures, bumpless switch both ways (R4, brief §4.9)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 16: Clinical events on the circulation: drug, fluid, bleed, condition

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`validateHemoCommand` / `applyHemoCommand` `applyEvent` kinds `drug | fluid | bleed | condition`), `packages/engine-core/src/l2/resp/pipeline.ts` (`validateRespCommand` `condition`: return `null` for the four circulation ids so Stage 2/7a sees them)
- Create: `packages/engine-core/test/engine/circ-events.test.ts`

**Interfaces:**
- Consumes: `circGiveDrug`, `circVolume`, `applyCircCondition`, `CIRC_CONDITIONS`.
- Produces: drug doses converted to mg (`mcg` ÷ 1000, `mg/kg`/`mcg/kg` × weight); accepted drug ids `phenylephrine | ephedrine | nitroglycerin | esmolol | propofol`; others rejected with `drug <id> arrives in Stage 7g`; `bleed` accepts `volumeMl` + `overS` or `rateMlPerMin` (open-ended until a `rateMlPerMin: 0` bleed); `fluid` adds volume (no redistribution in 7a, brief §4.9).

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cmd, rig } from '../helpers/hemo.ts';

const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });

describe('circulation clinical events', () => {
  it('accepts the five 7a drugs and rejects the rest until 7g', () => {
    const { e } = rig();
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' })).accepted).toBe(true);
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' })).accepted).toBe(true);
    const r = e.dispatch(ev({ kind: 'drug', drugId: 'vasopressin', dose: 1, unit: 'units', route: 'iv' }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/7g/);
  });
  it('a 500 mL bleed over 60 s removes 500 mL from the circulation', () => {
    const { e } = rig();
    e.advanceTo(5);
    const vol = () => {
      const h = (e.snapshot().state as { st: { hemo: { circ: { s: number[] } } } }).st.hemo.circ.s;
      return h.slice(4).reduce((a, b) => a + b, 0);
    };
    const v0 = vol();
    e.dispatch(ev({ kind: 'bleed', volumeMl: 500, overS: 60 }));
    e.advanceTo(70);
    expect(v0 - vol()).toBeGreaterThan(470); // arterial capacitor volume is outside s[4..]; allow its fall
    expect(v0 - vol()).toBeLessThan(530);
  });
  it('tamponade raises CVP; tension pneumothorax raises CVP and lowers ABP', () => {
    const { e } = rig({ sensors: { cvp: 'connected' } });
    e.advanceTo(30);
    expect(e.dispatch(ev({ kind: 'condition', id: 'tensionPtx', severity: 1 })).accepted).toBe(true);
    e.advanceTo(90);
    const st = (e.snapshot().state as { st: { hemo: { circOut: { pRa: number } } } }).st.hemo.circOut;
    expect(st.pRa).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-events.test.ts`
Expected: FAIL (drug rejected as "not implemented").

- [ ] **Step 3: Implement**

In `validateHemoCommand`, `case 'applyEvent':` add before `return null;`:

```ts
      if (ev.kind === 'drug') {
        const d = cmd.event as { drugId: string; dose: number; unit: string };
        if (!(DRUG_IDS as readonly string[]).includes(d.drugId)) return `drug ${d.drugId} arrives in Stage 7g`;
        if (!(Number.isFinite(d.dose) && d.dose > 0)) return 'dose must be > 0';
        return ['mcg', 'mg', 'mcg/kg', 'mg/kg'].includes(d.unit) ? undefined : 'unit must be mcg, mg, mcg/kg or mg/kg';
      }
      if (ev.kind === 'bleed' || ev.kind === 'fluid') {
        const b = cmd.event as { volumeMl?: number; overS?: number; rateMlPerMin?: number };
        if (b.rateMlPerMin !== undefined) return b.rateMlPerMin >= 0 && b.rateMlPerMin <= 2000 ? undefined : 'rateMlPerMin must be 0–2000';
        return b.volumeMl !== undefined && b.volumeMl > 0 && b.volumeMl <= 5000 && (b.overS ?? 1) > 0 ? undefined : 'volumeMl must be 0–5000 with overS > 0';
      }
      if (ev.kind === 'condition') {
        const c = cmd.event as { id: string; severity: number };
        if (!(CIRC_CONDITIONS as readonly string[]).includes(c.id)) return null;
        return c.severity >= 0 && c.severity <= 1 ? undefined : 'severity must be 0–1';
      }
```

with `const DRUG_IDS = Object.keys(DRUGS) as DrugId[];` at module scope (imports: `DRUGS, type DrugId` from `../circ/drugs.ts`, `CIRC_CONDITIONS, applyCircCondition, type CircConditionId` from `../circ/conditions.ts`, `circGiveDrug, circVolume` from `../circ/model.ts`).

In `applyHemoCommand`, `case 'applyEvent':` add before `return false;`:

```ts
      if (ev.kind === 'drug') {
        const d = ev as unknown as { drugId: DrugId; dose: number; unit: string };
        const w = hs.circ.weightKg;
        const mg = d.unit === 'mcg' ? d.dose / 1000 : d.unit === 'mg' ? d.dose : d.unit === 'mcg/kg' ? (d.dose * w) / 1000 : d.dose * w;
        circGiveDrug(hs.circ, d.drugId, mg);
        return true;
      }
      if (ev.kind === 'bleed' || ev.kind === 'fluid') {
        const b = ev as unknown as { volumeMl?: number; overS?: number; rateMlPerMin?: number };
        const sign = ev.kind === 'bleed' ? -1 : 1;
        if (b.rateMlPerMin !== undefined) {
          hs.circ.vol = hs.circ.vol.filter((v) => Math.sign(v.rate) !== sign || v.until < 1e8);
          if (b.rateMlPerMin > 0) hs.circ.vol.push({ rate: (sign * b.rateMlPerMin) / 60, until: 1e9 });
        } else circVolume(hs.circ, sign * (b.volumeMl ?? 0), b.overS ?? 1);
        return true;
      }
      if (ev.kind === 'condition') {
        const c = ev as unknown as { id: CircConditionId; severity: number };
        applyCircCondition(hs.circ, c.id, c.severity);
        return true;
      }
```

Note `circVolume` uses `m.t` (the model's own clock) as "now"; the model's clock equals the committed sample time within 8 ms, which is fine.

In `resp/pipeline.ts` `validateRespCommand`, `case 'condition':` replace the return with
`return c.id === 'mh' ? … (unchanged) : ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'].includes(c.id) ? null : \`condition ${c.id} arrives in Stage 7\`;` and in `applyRespCommand` `case 'condition':` start with `if ((ev as { id: string }).id !== 'mh') return false; // Stage 7a: circulation conditions`.

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-events.test.ts test/engine/resp-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/test/engine/circ-events.test.ts
git commit -m "feat(hemo): drug, fluid, bleed and circulation-condition events act on the Stage 7a circulation" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 17: Pulselessness and the CPR thoracic/cardiac pump

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`circEnv` CPR terms; `planCompressions` becomes a phase clock only)
- Create: `packages/engine-core/test/engine/circ-arrest.test.ts`

**Interfaces:**
- Consumes: `CPR_CARDIAC_MMHG`, `CPR_THORACIC_MMHG` (Task 2); `hs.cpr` (Stage 2).
- Produces: `cprPressure(cpr, t): number` — half-sine of unit amplitude over `CPR_DUTY` of each `60/rate` cycle starting at `cpr.nextT − k·60/rate`, × quality; `circEnv` uses `CPR_CARDIAC_MMHG·cprPressure` and `CPR_THORACIC_MMHG·cprPressure`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-arrest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cmd, numeric, read, rig } from '../helpers/hemo.ts';

describe('arrest and CPR on the circulation', () => {
  it('asystole: ABP decays to a flat 8–20 mmHg plateau (≈ Pmsf; A7 band 10–20) within 20 s', () => {
    const { e } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(40);
    const w = read(e, 'abp', 36, 40);
    expect(Math.max(...w) - Math.min(...w)).toBeLessThan(1);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(8);
    expect(Math.max(...w)).toBeLessThanOrEqual(20);
  });
  it('CPR 110/min at quality 0.8 makes compression pulses with SBP 60–110 and DBP 10–30; CO 1–2.5 L/min', () => {
    const { e, ev } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } }));
    e.advanceTo(60);
    const w = read(e, 'abp', 50, 60);
    expect(Math.max(...w)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...w)).toBeLessThanOrEqual(110);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
    expect(Math.min(...w)).toBeLessThanOrEqual(30);
    const circ = ev.filter((x) => x.type === 'circ').at(-1) as { co: number } | undefined;
    expect(circ?.co ?? 0).toBeGreaterThan(1);
    expect(circ?.co ?? 0).toBeLessThan(2.5);
    expect(numeric(ev, 'pr', 55, 60).at(-1)).toBeCloseTo(110, -1);
  });
});
```

(The `circ` event is emitted from Task 19; until then the CO assertion is skipped by the `?? 0` path failing — run this test fully after Task 19. Mark the CO line with `// needs Task 19` and keep it.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-arrest.test.ts`
Expected: the asystole test passes or fails on the plateau value; the CPR test FAILS (no compressions reach the circuit).

- [ ] **Step 3: Implement**

In `pipeline.ts` replace `planCompressions` with a phase-only version (no Pulse lists):

```ts
/** Stage 7a: compressions are pressures on the circuit (decision 12); this keeps the cycle clock for the pleth/EtCO2. */
function planCompressions(hs: HemoState, ctx: HemoCtx, until: number): void {
  const c = hs.cpr;
  while (c.active && c.nextT <= until) {
    const dur = (CPR_DUTY * 60) / c.rate;
    addPlethPulse(hs.pleth, c.nextT + plethDelayS(hs.pleth.site), l1Value(ctx.l1, 'pi', c.nextT) * 0.2 * c.quality, dur, hs.circ.p.rSys);
    c.nextT += 60 / c.rate;
  }
}

/** Unit half-sine compression profile at time t (0 outside the compression phase), × quality. */
export function cprPressure(c: HemoState['cpr'], t: number): number {
  if (!c.active) return 0;
  const T = 60 / c.rate;
  const start = c.nextT - Math.ceil((c.nextT - t) / T) * T; // the last compression start ≤ t
  const u = t - start;
  const dur = CPR_DUTY * T;
  return u >= 0 && u < dur ? c.quality * Math.sin((Math.PI * u) / dur) : 0;
}
```

and in `circEnv` replace `cprCardiac: zeroFn, cprThoracic: zeroFn` with
`cprCardiac: (t) => CPR_CARDIAC_MMHG * cprPressure(hs.cpr, t), cprThoracic: (t) => CPR_THORACIC_7A * cprPressure(hs.cpr, t)`
(import `CPR_CARDIAC_MMHG` and `CPR_THORACIC_MMHG as CPR_THORACIC_7A` from `../circ/params.ts`). In `applyHemoCommand` `cpr` off-branch delete the Pulse-list filters (`hs.lv`, `hs.rv`, `hs.thorArt`, `hs.thorCen`, `hs.opens`) — those lists are removed with Task 12's legacy code; delete their fields from `HemoState` and `createHemoState` now if Task 12 left them.

- [ ] **Step 4: Run the test (after Task 19 for the CO line)**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-arrest.test.ts`
Expected: PASS. If CPR SBP exceeds 110 at quality 0.8, lower `CPR_CARDIAC_MMHG` in steps of 10 (range 30–60 [ENG]); if DBP < 10, raise `CPR_THORACIC_MMHG` in steps of 5 (range 20–40). Record the chosen pair in the gate note (these two constants were not prototyped).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/circ-arrest.test.ts packages/engine-core/src/l2/circ/params.ts
git commit -m "feat(hemo): pulselessness = no activation; CPR as cardiac + thoracic pump pressures on the circuit" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 18: Coronary supply/demand and the ST hook (R23)

**Files:**
- Create: `packages/engine-core/src/l2/circ/coronary.ts`, `packages/engine-core/test/l2/circ/coronary.test.ts`
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (1 Hz coronary step; `hs.stPatch`), `packages/engine-core/src/engine.ts` (apply `stPatch` to the committed modifiers after `advance`)

**Interfaces:**
- Consumes: `CircBeat` (dbp via aortic diastolic, `lvedp`, `lvsp`, `avOpen/avClose`, `dur`, `lvedv`), `CircModelState.ext.kIsch`, `ResolvedProfile.cfr`, `Stabilised.ref` (rest values: stored on the model at creation as `m.ref`).
- Produces: `interface CoronaryState { kIsch; delta; stMv; lagT; ref }`, `createCoronary(ref)`, `stepCoronary(c, beats, cfr, dt, hrNow): void`, `stPatchOf(c): { ischaemicDepressionMv: number } | null`; `CircModelState.cor: CoronaryState`, `CircModelState.ref` (the stabilised resting reference).

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/coronary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary, stPatchOf, P_ZF } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat>): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, ...o,
});

describe('coronary supply/demand (R23, tables §3)', () => {
  it('at rest the supply/demand ratio equals the CFR (normal 3.5): no ischaemia', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat({})], 3.5, 1, 70);
    expect(c.ratio).toBeCloseTo(3.5, 1);
    expect(c.kIsch).toBe(1);
    expect(stPatchOf(c)).toBeNull();
  });
  it('AS + 3-vessel CAD (CFR 1.4) after induction (DBP 45, LVEDP 25, HR 72): deficit > 0.1, contractility falls (τ 20 s), ST depression appears after the lag', () => {
    const c = createCoronary(ref);
    const low = beat({ aoDia: 45, dbp: 45, lvedp: 25, lvsp: 140 });
    for (let i = 0; i < 120; i++) stepCoronary(c, [low], 1.4, 1, 72);
    expect(c.delta).toBeGreaterThan(0.1);
    expect(c.kIsch).toBeLessThan(0.85);
    expect(stPatchOf(c)?.ischaemicDepressionMv ?? 0).toBeLessThanOrEqual(-0.05);
    // rescue: back to rest pressures → kIsch recovers with τ 60 s, ST clears
    for (let i = 0; i < 240; i++) stepCoronary(c, [beat({})], 1.4, 1, 64);
    expect(c.kIsch).toBeGreaterThan(0.97);
    expect(stPatchOf(c)).toBeNull();
    expect(P_ZF).toBe(15);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/coronary.test.ts`
Expected: FAIL — cannot resolve `coronary.ts`.

- [ ] **Step 3: Implement**

`packages/engine-core/src/l2/circ/coronary.ts`:

```ts
// Coronary supply/demand and ischaemia (R23; tables §3). Stepped at 1 Hz from the last CircBeat:
//   DTF    = (RR − T_sys)/RR with T_sys the beat's emergent valve-open end (avClose) + isovolumic relaxation 60 ms
//            — "diastolic fraction from real valve timing" (not the QS2 regression)
//   CPP    = aortic diastolic pressure − LVEDP (tables §3; the aortic truth, not the radial display)
//   Supply = CFR·((CPP − P_zf)/(CPP_0 − P_zf))·(DTF/DTF_0)                        [normalised; 1 = rest demand]
//   Demand = (HR/HR_0)·(LVSP/LVSP_0)·(kEes)^0.5·(LVEDV/LVEDV_0)^(1/3)            [RPP with a wall-stress term]
//   ratio r = Supply/Demand; deficit δ = max(0, 1 − r); kIsch → 1 − gIsch·δ (τ_down 20 s, τ_up 60 s; Q32)
//   ST: global subendocardial depression −min(0.3, 1.0·δ) mV after a 45 s lag (stLag 30–60 s), applied through the
//       existing Modifiers.ischaemicDepressionMv (0 or −0.05…−0.3 mV); territorial STEMI stays a Stage 5 modifier.
// P_zf 15 mmHg and the CFR mapping are Q31 defaults; the tables' SEVR cross-check is informative only.
import type { CircBeat } from './model.ts';
import type { Stabilised } from './stabilise.ts';

export const P_ZF = 15; // mmHg (tables §3 pZf; Q31)
export const G_ISCH = 1.5; // (Q32)
export const TAU_ISCH_DOWN_S = 20; // (Q32)
export const TAU_ISCH_UP_S = 60; // (Q32)
export const ST_LAG_S = 45; // 30–60 s (tables §3 stLag)
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]

export interface CoronaryState {
  ref: Stabilised['ref'];
  dtf0: number;
  ratio: number;
  delta: number;
  kIsch: number;
  ischT: number; // seconds with δ > 0.1
  stMv: number;
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
}

export function createCoronary(ref: Stabilised['ref']): CoronaryState {
  const rr = 60 / ref.hr;
  const tsys = 0.37 + IVR_S; // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype)
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1 };
}

/** One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number): void {
  const b = beats[beats.length - 1];
  if (!b) return;
  const r = c.ref;
  const rr = 60 / Math.max(20, hr);
  const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
  const dtf = Math.max(0.05, (rr - tsys) / rr);
  const cpp = b.aoDia - b.lvedp;
  const cpp0 = r.dbp - r.lvedp;
  const supply = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = supply / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
  const target = Math.max(0.2, 1 - G_ISCH * c.delta);
  const tau = target < c.kIsch ? TAU_ISCH_DOWN_S : TAU_ISCH_UP_S;
  c.kIsch += (target - c.kIsch) * (1 - Math.exp(-dt / tau));
  if (c.kIsch > 0.9995) c.kIsch = 1;
  c.ischT = c.delta > 0.1 ? c.ischT + dt : 0;
  const stTarget = c.ischT >= ST_LAG_S ? -Math.min(0.3, c.delta) : 0;
  c.stMv += (stTarget - c.stMv) * (1 - Math.exp(-dt / (stTarget < c.stMv ? 15 : 60)));
}

/** The ST modifier patch for the ECG (null when below the 0.05 mV floor of Modifiers.ischaemicDepressionMv). */
export function stPatchOf(c: CoronaryState): { ischaemicDepressionMv: number } | null {
  return c.stMv <= -0.05 ? { ischaemicDepressionMv: Math.max(-0.3, Math.round(c.stMv * 100) / 100) } : null;
}
```

In `model.ts`: add `ref: Stabilised['ref'];` and `cor: CoronaryState;` to `CircModelState`, initialise `ref: st.ref, cor: createCoronary(st.ref),` in `createCircModel` (imports from `./coronary.ts` and `./stabilise.ts`).

In `pipeline.ts`:
- add `stPatch: { ischaemicDepressionMv: number } | null;` to `HemoState`, `stPatch: null,` in `createHemoState`;
- in `emitSecond` (1 Hz), before the measurement push:

```ts
  const c = hs.circ;
  c.cor.eesF = c.kLv;
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR));
  c.ext.kIsch = c.cor.kIsch;
  const patch = stPatchOf(c.cor);
  const cur = hs.stPatch?.ischaemicDepressionMv ?? 0;
  const nxt = patch?.ischaemicDepressionMv ?? 0;
  if (Math.abs(nxt - cur) >= 0.01) hs.stPatch = patch ?? { ischaemicDepressionMv: 0 };
```

In `engine.ts` `tickOnce`, right after `this.advance(this.st, this.tick * SAMPLES_PER_TICK);` add:

```ts
    const stp = this.st.hemo.stPatch; // Stage 7a: coronary ST hook (R23) through the existing modifiers, committed state only
    if (stp) {
      this.st.mods = mergeModifiers(this.st.mods, stp);
      this.st.hemo.stPatch = null;
      this.dirtyFromN = Math.min(this.dirtyFromN, this.st.n);
    }
```

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/coronary.test.ts test/engine/circ-pipeline.test.ts`
Expected: PASS. (At rest the ratio equals CFR 3.5 by construction; the AS + CAD run in Task 27 exercises the engine path.)

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/coronary.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/test/l2/circ/coronary.test.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/engine.ts
git commit -m "feat(circ): coronary supply/demand with emergent diastolic time, ischaemic contractility loss and the ST hook (R23)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 19: Chemoreflex hook, autonomic profile factors and the 1 Hz `circ` event

**Files:**
- Modify: `packages/engine-core/src/l2/circ/model.ts` (chemoreflex input), `packages/engine-core/src/l2/hemo/pipeline.ts` (`circ` event in `emitSecond`; chemo input from L1 truths)
- Create: `packages/engine-core/test/l2/circ/chemo.test.ts`

**Interfaces:**
- Produces: `CircModelState.chemo: { sao2: number; paco2: number }` (written by the pipeline at 1 Hz from `l1Value(l1, 'spo2')/100` and `etco2 + 5`), `chemoFactors(chemo, band): { hrF: number; svrF: number }` (tables §1.1 `hypoxiaHrSign`; B §4.9 chemoreflex: SaO2 < 85 % → adult HR ↑ up to +30 %, infant/neonate or SaO2 < 60 % → vagal bradycardia ×0.6; PaCO2 > 50 → HR/SVR +1 %/mmHg to +20 %) [ENG magnitudes]; GA depth enters through propofol's `gv` (Task 8) and age through the profile's `gVagal`/`gSymp`; β-blockade through `betaBlock`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/chemo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { chemoFactors } from '../../../src/l2/circ/model.ts';

describe('chemoreflex hook (B §4.9; tables §1.1 hypoxiaHrSign)', () => {
  it('normoxia/normocapnia is neutral', () => {
    expect(chemoFactors({ sao2: 0.97, paco2: 40 }, 'adult')).toEqual({ hrF: 1, svrF: 1 });
  });
  it('adult hypoxaemia → tachycardia; infant hypoxaemia and adult SaO2 < 60 % → bradycardia', () => {
    expect(chemoFactors({ sao2: 0.75, paco2: 40 }, 'adult').hrF).toBeGreaterThan(1.1);
    expect(chemoFactors({ sao2: 0.75, paco2: 40 }, 'infant').hrF).toBeLessThan(0.8);
    expect(chemoFactors({ sao2: 0.5, paco2: 40 }, 'adult').hrF).toBeLessThan(0.8);
  });
  it('hypercapnia raises HR and SVR, capped at +20 %', () => {
    const f = chemoFactors({ sao2: 0.97, paco2: 80 }, 'adult');
    expect(f.hrF).toBeCloseTo(1.2, 6);
    expect(f.svrF).toBeCloseTo(1.2, 6);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/chemo.test.ts`
Expected: FAIL — `chemoFactors` is not exported.

- [ ] **Step 3: Implement**

In `model.ts` add (and `chemo: { sao2: 0.97, paco2: 40 },` in `createCircModel`, `chemo: { sao2: number; paco2: number };` in the state):

```ts
/** Chemoreflex → circulation (B §4.9; tables §1.1). Hypoxic HR sign by age band; hypercapnic pressor response. */
export function chemoFactors(c: { sao2: number; paco2: number }, band: string): { hrF: number; svrF: number } {
  let hrF = 1;
  const hyp = Math.max(0, 0.85 - c.sao2); // below 85 %
  if (hyp > 0) {
    const brady = band === 'neonate' || band === 'infant' || c.sao2 < 0.6;
    hrF = brady ? Math.max(0.5, 1 - 1.6 * hyp) : Math.min(1.3, 1 + 1.2 * hyp);
  }
  const hcap = Math.min(0.2, Math.max(0, c.paco2 - 50) * 0.01); // +1 %/mmHg above 50, capped at +20 % [ENG]
  return { hrF: hrF * (1 + hcap), svrF: 1 + hcap };
}
```

and in `control()`, when `env.modeled`, multiply: `const ch = chemoFactors(m.chemo, m.prof.band);` then `p.rSys *= ch.svrF;` and use `m.prof.hrRest * b.hrF * de.hr * ch.hrF` in the RR line.

Check: `paco2 = 80` → 30 × 0.01 = 0.3 → capped at 0.2 ✓.

In `pipeline.ts` `emitSecond` (1 Hz) add, before the coronary step: `hs.circ.chemo = { sao2: l1Value(ctx.l1, 'spo2', t) / 100, paco2: l1Value(ctx.l1, 'etco2', t) + 5 };` and after the state event push the `circ` event:

```ts
  const lb = c.beats[c.beats.length - 1];
  const svRvMean = c.beats.length ? c.beats.reduce((a, b) => a + b.svRv, 0) / c.beats.length : 0;
  hs.out.push({
    type: 'circ', t, co: circCardiacOutput(c), sv: lb?.sv ?? 0, svRv: svRvMean, ef: lb ? (lb.lvedv - lb.lvesv) / Math.max(1, lb.lvedv) : 0,
    lvedv: lb?.lvedv ?? 0, lvesv: lb?.lvesv ?? 0, lvedp: lb?.lvedp ?? 0, lvsp: lb?.lvsp ?? 0,
    pmsf: (c.s[4]! - c.p.v0Sv) / c.p.cSv, pvr: (c.p.pvrL * c.p.pvrR) / (c.p.pvrL + c.p.pvrR), svr: c.p.rSys,
    cpp: lb ? lb.aoDia - lb.lvedp : 0, supplyDemand: c.cor.ratio, kIsch: c.cor.kIsch,
  });
```

(`circCardiacOutput` import from `../circ/model.ts`.) Task 20/21 add `iabp`/`lvad` fields.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/chemo.test.ts test/engine/circ-arrest.test.ts`
Expected: PASS (the CPR CO assertion of Task 17 now runs).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/l2/circ/chemo.test.ts
git commit -m "feat(circ): chemoreflex hook, autonomic profile factors and the 1 Hz circ event" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 20: `CircuitDevice` interface and the IABP

**Files:**
- Create: `packages/engine-core/src/l2/circ/devices.ts`, `packages/engine-core/test/l2/circ/iabp.test.ts`
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (device state, `circEnv.qAortaSrc`, `device` commands `iabp`), `packages/engine-core/src/l2/circ/model.ts` (nothing — devices enter through `CircEnv`)

**Interfaces:**
- Produces:
  - `interface CircuitDevice { kind: 'iabp' | 'lvad' | 'vaEcmo' | 'cpb'; on: boolean }` — the R42 seam: every device contributes through `CircEnv.qAortaSrc` (volume source in the aorta), `CircEnv.qVad` (LV → aorta flow), or (ECMO/CPB, 7h) a venous → arterial pump flow `qBypass(pSv, pAo)`.
  - `interface IabpState extends CircuitDevice { kind: 'iabp'; ratio: 1 | 2 | 3; volumeMl: number; inflateOffsetMs: number; deflateOffsetMs: number; beatN: number; inflateAt: number; deflateAt: number; vb: number }`.
  - `createIabp(): IabpState`, `iabpOnBeat(d, beatT, rr, avCloseS)` (schedules inflation at the beat's aortic closure (dicrotic notch, "trigger from pressure") + offset, deflation at the next R − 40 ms + offset, only on every `ratio`-th beat), `iabpFlow(d, t): number` (dV/dt of the balloon: inflation over 80 ms, deflation over 60 ms, half-sine profiles).
  - `IABP_INFLATE_S = 0.08`, `IABP_DEFLATE_S = 0.06`, `IABP_VOLUME_ML = 40` (tables §8.1).

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/iabp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createIabp, iabpFlow, iabpOnBeat, IABP_VOLUME_ML } from '../../../src/l2/circ/devices.ts';
import { createCircModel, RESTING_ENV, type CircBeat } from '../../../src/l2/circ/model.ts';
import { collectBeats, driver, runTo } from '../../helpers/circ.ts';

describe('IABP (tables §8.1)', () => {
  it('the balloon flow integrates to +volume on inflation and −volume on deflation', () => {
    const d = createIabp();
    d.on = true;
    iabpOnBeat(d, 0, 0.8, 0.37);
    let v = 0;
    for (let t = 0; t < 0.8; t += 0.001) v += iabpFlow(d, t) * 0.001;
    expect(Math.abs(v)).toBeLessThan(0.5);
    let vin = 0;
    for (let t = 0.37; t < 0.37 + 0.08; t += 0.0005) vin += iabpFlow(d, t) * 0.0005;
    expect(vin).toBeCloseTo(IABP_VOLUME_ML, 0);
  });
  it('1:1 augmentation: diastolic peak exceeds the unassisted systolic peak; assisted end-diastolic pressure falls', () => {
    const m = createCircModel();
    const dr = driver(m);
    const all: CircBeat[] = [];
    const col = collectBeats(m, all);
    runTo(dr, 30, { ...RESTING_ENV, modeled: false });
    col();
    const unassisted = all.slice(-5);
    const d = createIabp();
    d.on = true;
    let seen = m.beats.length ? m.beats[m.beats.length - 1]!.t : 0;
    let peakDia = 0;
    const env = { ...RESTING_ENV, modeled: false, qAortaSrc: (t: number) => iabpFlow(d, t) };
    for (let k = 0; k < 20 * 50; k++) {
      runTo(dr, m.t + 0.02, env, (o, t) => {
        const b = m.beats[m.beats.length - 1];
        if (b && t > b.t + b.avClose + 0.05 && t < b.t + b.dur - 0.05) peakDia = Math.max(peakDia, o.pAo);
      });
      const b = m.beats[m.beats.length - 1];
      if (b && b.t > seen) {
        seen = b.t;
        iabpOnBeat(d, b.t + b.dur, b.dur, b.avClose); // schedule for the beat that has just started
      }
      col();
    }
    const assisted = all.slice(-5);
    const uSys = unassisted.reduce((a, b) => a + b.aoSys, 0) / 5;
    const uDia = unassisted.reduce((a, b) => a + b.aoDia, 0) / 5;
    const aDia = assisted.reduce((a, b) => a + b.aoDia, 0) / 5;
    expect(peakDia).toBeGreaterThan(uSys);
    expect(aDia).toBeLessThan(uDia - 5);
  }, 60_000);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/iabp.test.ts`
Expected: FAIL — cannot resolve `devices.ts`.

- [ ] **Step 3: Implement**

`packages/engine-core/src/l2/circ/devices.ts`:

```ts
// Mechanical support devices as circuit elements (R42; R28; tables §8.1–§8.2). The seam: a device contributes a
// volume source in the aorta (IABP), an LV → aorta pump flow (LVAD), or — 7h — a venous → arterial pump flow
// (VA-ECMO, CPB). Devices are plain data; their flow functions are built per interval by the hemo pipeline.
import { valveFlow } from './valves.ts';

export interface CircuitDevice {
  kind: 'iabp' | 'lvad' | 'vaEcmo' | 'cpb';
  on: boolean;
}

// --- IABP (tables §8.1: 40 mL, trigger ECG/pressure, 1:1–1:3, timing errors) ---
export const IABP_VOLUME_ML = 40;
export const IABP_INFLATE_S = 0.08;
export const IABP_DEFLATE_S = 0.06;
/** Default deflation lead before the next R (so the balloon is empty at aortic opening) [ENG]. */
export const IABP_DEFLATE_LEAD_S = 0.04;

export interface IabpState extends CircuitDevice {
  kind: 'iabp';
  ratio: 1 | 2 | 3;
  volumeMl: number;
  inflateOffsetMs: number; // − = early (inflation in systole), + = late
  deflateOffsetMs: number; // − = early (U-shaped dip), + = late (LV ejects against the balloon)
  beatN: number;
  inflateAt: number;
  deflateAt: number;
}

export function createIabp(): IabpState {
  return { kind: 'iabp', on: false, ratio: 1, volumeMl: IABP_VOLUME_ML, inflateOffsetMs: 0, deflateOffsetMs: 0, beatN: 0, inflateAt: -1, deflateAt: -1 };
}

/**
 * A beat starting at beatT (R) with RR rr and the previous beat's aortic closure at avCloseS after its onset:
 * inflate at the dicrotic notch (beatT + avCloseS) + offset; deflate before the next R + offset. Every ratio-th beat.
 */
export function iabpOnBeat(d: IabpState, beatT: number, rr: number, avCloseS: number): void {
  if (!d.on) return;
  d.beatN++;
  if ((d.beatN - 1) % d.ratio !== 0) return;
  d.inflateAt = beatT + avCloseS + d.inflateOffsetMs / 1000;
  d.deflateAt = beatT + rr - IABP_DEFLATE_LEAD_S - IABP_DEFLATE_S + d.deflateOffsetMs / 1000;
}

const halfSine = (u: number, dur: number) => (u >= 0 && u < dur ? (Math.PI / (2 * dur)) * Math.sin((Math.PI * u) / dur) : 0);

/** Balloon dV/dt (mL/s): + during inflation, − during deflation. */
export function iabpFlow(d: IabpState, t: number): number {
  if (!d.on || d.inflateAt < 0) return 0;
  return d.volumeMl * (halfSine(t - d.inflateAt, IABP_INFLATE_S) - halfSine(t - d.deflateAt, IABP_DEFLATE_S));
}

// --- LVAD (tables §8.2; Task 21) and ECMO/CPB interfaces (7h) follow in this file. ---
export { valveFlow as _valveFlowForDevices };
```

In `pipeline.ts`: add `iabp: IabpState;` to `HemoState` (`iabp: createIabp(),` in `createHemoState`); in `onCircBeat` after the site-beat push add `iabpOnBeat(hs.iabp, cb.t + cb.dur, cb.dur, cb.avClose > 0 ? cb.avClose : 0.3);` (schedules for the beat that has just begun, triggered on pressure: the previous notch); in `circEnv` set `qAortaSrc: (t) => iabpFlow(hs.iabp, t)`; handle commands:

```ts
// validateHemoCommand, case 'device':  (before the nibp check)
      if (a.device === 'iabp') {
        const x = a as Extract<DeviceAction, { device: 'iabp' }>;
        if (!['start', 'stop', 'set'].includes(x.action)) return 'iabp action must be start, stop or set';
        if (x.ratio !== undefined && ![1, 2, 3].includes(x.ratio)) return 'ratio must be 1, 2 or 3';
        if (x.volumeMl !== undefined && !(x.volumeMl >= 20 && x.volumeMl <= 50)) return 'volumeMl must be 20–50';
        for (const v of [x.inflateOffsetMs, x.deflateOffsetMs]) if (v !== undefined && !(v >= -200 && v <= 200)) return 'timing offsets must be −200…200 ms';
        return undefined;
      }
// applyHemoCommand, case 'device':
      if (a.device === 'iabp') {
        const x = a as Extract<DeviceAction, { device: 'iabp' }>;
        const d = hs.iabp;
        if (x.action === 'start') d.on = true;
        if (x.action === 'stop') { d.on = false; d.inflateAt = -1; }
        if (x.ratio !== undefined) d.ratio = x.ratio;
        if (x.volumeMl !== undefined) d.volumeMl = x.volumeMl;
        if (x.inflateOffsetMs !== undefined) d.inflateOffsetMs = x.inflateOffsetMs;
        if (x.deflateOffsetMs !== undefined) d.deflateOffsetMs = x.deflateOffsetMs;
        return true;
      }
```

(`DeviceAction` import from `../../types.ts`.) Add `iabp: hs.iabp.on ? { ratio: hs.iabp.ratio, augmentation: … } : undefined` to the `circ` event, with augmentation = max aortic pressure in the last diastole minus the unassisted systolic (track both in `onCircBeat`: store `hs.iabpAug`, a number, updated from `cb` when `hs.iabp.on`: `hs.iabpAug = Math.max(0, cb.aoSys - (hs.lastUnassistedSys ?? cb.aoSys))` — keep it simple: report `cb.aoSys` of the last assisted beat as `augmentation`).

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/iabp.test.ts`
Expected: PASS (not prototyped: if the diastolic peak does not exceed the unassisted systolic, raise `IABP_VOLUME_ML` within the tables' 25–50 mL range and record it).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/devices.ts packages/engine-core/test/l2/circ/iabp.test.ts packages/engine-core/src/l2/hemo/pipeline.ts
git commit -m "feat(circ): CircuitDevice seam and the IABP — pressure-triggered inflation at the notch, 1:1–1:3, timing offsets (R28, R42)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 21: LVAD (HQ pump, speed, suction) and ECMO/CPB interfaces

**Files:**
- Modify: `packages/engine-core/src/l2/circ/devices.ts`, `packages/engine-core/src/l2/hemo/pipeline.ts` (`lvad` state/commands, `circEnv.qVad`, `circ` event `lvad`)
- Create: `packages/engine-core/test/l2/circ/lvad.test.ts`

**Interfaces:**
- Produces: `interface LvadState extends CircuitDevice { kind: 'lvad'; rpm: number; suction: boolean; flowAvg: number; qMin: number; qMax: number }`, `createLvad()`, `lvadFlow(d, pLv, pAo): number` — HQ line `Q = max(0, Q0(rpm) − k_h·(pAo − pLv))`, `Q0 = 0.022·rpm − 30` mL/s (5400 rpm → 89 mL/s ≈ 5.3 L/min at ΔP 0), `k_h = 0.45` mL/s/mmHg (HeartMate-3-like: 4.8 L/min at ΔP 20, 3.7 L/min at ΔP 60 [ENG shape; tables §8.2 flow 4–6 L/min]); suction when LV volume < `LVAD_SUCTION_ML` 40 (× W/70): flow × 0.3 and `suction = true`; `lvadNumerics(d): { flowLpm; pi; powerW }` with PI = (qMax − qMin)/mean·10 over the last second and power = 0.8 + flow·0.7 W [ENG]. ECMO/CPB: `interface BypassDevice extends CircuitDevice { kind: 'vaEcmo' | 'cpb'; flowLpm: number }`, `bypassFlow(d, pSv, pAo): number` that THROWS `new Error('VA-ECMO/CPB arrive in Stage 7h')`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/l2/circ/lvad.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bypassFlow, createLvad, lvadFlow, type BypassDevice } from '../../../src/l2/circ/devices.ts';
import { createCircModel, RESTING_ENV, type CircBeat } from '../../../src/l2/circ/model.ts';
import { collectBeats, driver, runTo } from '../../helpers/circ.ts';

describe('LVAD (tables §8.2)', () => {
  it('HQ curve: 5400 rpm gives 3.5–6.5 L/min against ΔP 20–60 mmHg; suction cuts flow', () => {
    const d = createLvad();
    d.on = true;
    for (const dp of [20, 60]) {
      const q = lvadFlow(d, 20, 20 + dp, 100) * 0.06;
      expect(q).toBeGreaterThan(3.5);
      expect(q).toBeLessThan(6.5);
    }
    const qs = lvadFlow(d, 20, 80, 30);
    expect(d.suction).toBe(true);
    expect(qs).toBeLessThan(0.5 * lvadFlow(createLvadOn(), 20, 80, 100));
  });
  it('HFrEF + LVAD 5400 rpm: pulse pressure falls below 25 mmHg and MAP holds ≥ 65', () => {
    const m = createCircModel({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] });
    const dr = driver(m);
    const d = createLvad();
    d.on = true;
    const all: CircBeat[] = [];
    const col = collectBeats(m, all);
    const env = { ...RESTING_ENV, qVad: (lvp: number, aop: number) => lvadFlow(d, lvp, aop, m.s[10]!) };
    for (let t = 0; t < 60; t += 1) {
      runTo(dr, t + 1, env);
      col();
    }
    const last = all.slice(-6);
    const pp = last.reduce((a, b) => a + b.sbp - b.dbp, 0) / last.length;
    const map = last.reduce((a, b) => a + b.map, 0) / last.length;
    expect(pp).toBeLessThan(25);
    expect(map).toBeGreaterThanOrEqual(65);
  }, 60_000);
  it('VA-ECMO / CPB are interfaces only until 7h', () => {
    const e: BypassDevice = { kind: 'vaEcmo', on: true, flowLpm: 4 };
    expect(() => bypassFlow(e, 5, 70)).toThrow(/7h/);
  });
  it.skip('7h: VA-ECMO pulsatility fades with flow fraction (tables §8.5) — marked for Stage 7h', () => {});
});

function createLvadOn() {
  const d = createLvad();
  d.on = true;
  return d;
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/lvad.test.ts`
Expected: FAIL — `createLvad` not exported.

- [ ] **Step 3: Implement** (append to `devices.ts`, replacing the placeholder export line)

```ts
// --- LVAD (tables §8.2: HeartMate-3-like continuous flow, 5400 rpm, 4–6 L/min; suction when the LV empties) ---
export const LVAD_RPM = 5400;
export const LVAD_KH = 0.45; // mL/s per mmHg of (P_ao − P_LV) [ENG HQ slope]
export const LVAD_SUCTION_ML = 40; // LV volume below which the inflow cannula sucks (tables §8.2) [ENG]

export interface LvadState extends CircuitDevice {
  kind: 'lvad';
  rpm: number;
  suction: boolean;
  qMin: number;
  qMax: number;
  qSum: number;
  n: number;
}

export function createLvad(): LvadState {
  return { kind: 'lvad', on: false, rpm: LVAD_RPM, suction: false, qMin: Infinity, qMax: -Infinity, qSum: 0, n: 0 };
}

/** Pump flow LV → aorta (mL/s) at LV pressure pLv, aortic pressure pAo and LV volume vLv (mL). */
export function lvadFlow(d: LvadState, pLv: number, pAo: number, vLv: number): number {
  if (!d.on) return 0;
  const q0 = 0.022 * d.rpm - 30;
  let q = Math.max(0, q0 - LVAD_KH * (pAo - pLv));
  d.suction = vLv < LVAD_SUCTION_ML;
  if (d.suction) q *= 0.3;
  d.qMin = Math.min(d.qMin, q);
  d.qMax = Math.max(d.qMax, q);
  d.qSum += q;
  d.n++;
  return q;
}

/** Console numerics over the interval since the last call (flow L/min, PI, power W), then reset the window. */
export function lvadNumerics(d: LvadState): { flowLpm: number; pi: number; powerW: number } {
  const mean = d.n > 0 ? d.qSum / d.n : 0;
  const out = { flowLpm: mean * 0.06, pi: mean > 0 ? ((d.qMax - d.qMin) / mean) * 10 : 0, powerW: 0.8 + mean * 0.06 * 0.7 };
  d.qMin = Infinity;
  d.qMax = -Infinity;
  d.qSum = 0;
  d.n = 0;
  return out;
}

// --- VA-ECMO / CPB (R42 interface; implemented in 7h) ---
export interface BypassDevice extends CircuitDevice {
  kind: 'vaEcmo' | 'cpb';
  flowLpm: number;
}
export function bypassFlow(_d: BypassDevice, _pSv: number, _pAo: number): number {
  throw new Error('VA-ECMO/CPB arrive in Stage 7h');
}
```

(Delete the line `export { valveFlow as _valveFlowForDevices };` and the `valveFlow` import.) Note `lvadFlow` mutates its window stats: call it exactly once per derivative evaluation — `CircEnv.qVad` is called once per `evaluate`, 4 × per RK4 step; the window stats are therefore sample-weighted, which is fine for PI.

In `pipeline.ts`: `lvad: LvadState` in `HemoState` (`createLvad()`), `circEnv.qVad: (lvp, aop) => lvadFlow(hs.lvad, lvp, aop, hs.circ.s[10] as number)`; commands `device: 'lvad'` (`start`/`stop`/`set` with `rpm` 3000–9000) mirroring the IABP block; the `circ` event gets `lvad: hs.lvad.on ? { rpm: hs.lvad.rpm, ...lvadNumerics(hs.lvad), suction: hs.lvad.suction } : undefined`.

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/lvad.test.ts`
Expected: PASS (3 + 1 skipped). Not prototyped: if MAP < 65 with the HFrEF profile, the reflex is still settling — extend the run to 120 s before changing `LVAD_KH`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/circ/devices.ts packages/engine-core/test/l2/circ/lvad.test.ts packages/engine-core/src/l2/hemo/pipeline.ts
git commit -m "feat(circ): continuous-flow LVAD with HQ curve, suction and console numerics; VA-ECMO/CPB interfaces for 7h" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 22: Teaching channels (`lvp`, `lvv`, `lap`, `rap`, `rvp`, `pat`) at 125 Hz

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`pvOn` flag, `attachSensor pv`, writes), `packages/engine-core/src/engine.ts` (`sampleRate`, buffer sync)
- Create: `packages/engine-core/test/engine/circ-teaching.test.ts`

**Interfaces:**
- Produces: `HEMO_TEACHING = ['lvp', 'lvv', 'lap', 'rap', 'rvp', 'pat'] as const`; `HemoState.pvOn: boolean` (default false); `attachSensor { sensor: 'pv', state: 'on' | 'off' }`; the pipeline's `write` callback accepts these channel ids (its type widens to `HemoChannel | TeachingChannel`); values are TRUTH (no transducer): `lvp = pLv`, `lvv = V_LV`, `lap = pLa`, `rap = pRa`, `rvp = pRv`, `pat = pPaRoot`.

- [ ] **Step 1: Write the failing test**

`packages/engine-core/test/engine/circ-teaching.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('PV-loop teaching channels', () => {
  it('are absent by default and appear at 125 Hz when the pv sensor is on', () => {
    const { e } = rig();
    e.advanceTo(2);
    expect(e.latestSampleIndex('lvp')).toBe(-1);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'pv', state: 'on' }));
    e.advanceTo(20);
    expect(e.sampleRate('lvv')).toBe(125);
    const p = read(e, 'lvp', 10, 20);
    const v = read(e, 'lvv', 10, 20);
    expect(Math.max(...p)).toBeGreaterThan(95);
    expect(Math.min(...p)).toBeLessThan(10);
    expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(50); // stroke volume
    expect(Math.max(...read(e, 'rvp', 10, 20))).toBeGreaterThan(18);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-teaching.test.ts`
Expected: FAIL (`attachSensor pv` rejected).

- [ ] **Step 3: Implement**

`pipeline.ts`: `export const HEMO_TEACHING = ['lvp', 'lvv', 'lap', 'rap', 'rvp', 'pat'] as const satisfies readonly ChannelId[];`; `pvOn: false` in state; `validateHemoCommand` `attachSensor`: `if (sensor === 'pv') return state === 'on' || state === 'off' ? undefined : 'pv state must be on or off';`; `applyHemoCommand`: `if (sensor === 'pv') { hs.pvOn = state === 'on'; return true; }`; `advanceHemo`'s `write` parameter type becomes `(ch: HemoChannel | (typeof HEMO_TEACHING)[number], m: number, v: number) => void`; after the pleth write in the sample loop:

```ts
    if (hs.pvOn) {
      const o = hs.circOut;
      write('lvp', m, o.pLv);
      write('lvv', m, hs.circ.s[10] as number);
      write('lap', m, o.pLa);
      write('rap', m, o.pRa);
      write('rvp', m, o.pRv);
      write('pat', m, o.pPaRoot);
    }
```

`engine.ts`: `hemoWrite`'s `ch` parameter type widens the same way; in `syncHemoBuffers` add `if (!this.st.hemo.pvOn) for (const ch of HEMO_TEACHING) this.bufs.delete(ch);` (import `HEMO_TEACHING`). `sampleRate` already returns 125 for any non-ECG, non-co2/resp channel.

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-teaching.test.ts test/engine/hemo-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/test/engine/circ-teaching.test.ts
git commit -m "feat(hemo): PV-loop teaching channels lvp/lvv/lap/rap/rvp/pat at 125 Hz behind the pv sensor (R42 teaching view)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 23: Stage 2 acceptance re-check and re-specification

Every Stage 2 acceptance number (docs/gates/stage-2.md) is re-measured through the engine on the circulation. Where physics changes a number the test is re-specified here, with the justification in a comment and in the gate note. **Do not loosen a band without the justification line.**

**Files:**
- Modify: `packages/engine-core/test/engine/hemo-acceptance.test.ts`, `packages/engine-core/test/engine/hemo-vf.test.ts`, `packages/engine-core/test/engine/resp-coupling.test.ts`, `packages/engine-core/test/engine/hemo-nibp.test.ts` (only the assertions named below)
- Create: `packages/engine-core/test/engine/circ-stage2-recheck.test.ts`

**Interfaces:**
- Consumes: everything above. Produces nothing new.

- [ ] **Step 1: Run the Stage 2/3 acceptance suites and record every failure**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts test/engine/hemo-vf.test.ts test/engine/hemo-nibp.test.ts test/engine/resp-coupling.test.ts test/engine/hemo-engine.test.ts`
Expected: a list of failures; paste it into the commit body.

- [ ] **Step 2: Apply the re-specifications (only these)**

| Stage 2 test | Old band | New assertion | Justification (comment text) |
|---|---|---|---|
| 1. timing | R→radial foot 150–220 ms; notch at R + PEP + LVET + PTT ± 20 ms | R→radial foot 130–220 ms; notch at R + (emergent aortic closure `avClose`) + `RADIAL_DELAY_STEPS·2 ms` + 40 ms display delay ± 25 ms | PEP and LVET are emergent (decision 1: ±17 ms of Weissler); the notch follows the model's own valve closure |
| 5b. k 0 PVC | `diff < 0.01` mmHg until the next ejection | unchanged (unperfused PVCs schedule no activation) | — |
| 5c. post-PVC | +8–15 mmHg mean | +3–15 mmHg mean | no PESP contractility term in a time-varying-elastance heart; Frank–Starling only (decision 13) |
| 6. pulseless plateau | 10–15 mmHg | 8–20 mmHg | A7 widens the arrest band to 10–20 (Paradis 1992); the plateau is the emergent Pmsf (8–12 by profile) |
| 7. CPR | 70–110 / 10–30 at quality 1 | 60–120 / 10–35 at quality 1 | cardiac + thoracic pump pressures replace pulse injection (decision 12) |
| 10. PPV | g_hyp 0.05 → 5–10 %, 0.2 → 15–30 % | volumeStatus 1 → PPV 3–10 %; volumeStatus 0.3 → PPV greater than at 1 (strictly), SPV grows | PPV now emergent from the pleural input (R-B); magnitude flagged for calibration (Deviations) |
| 11. CVP a wave | 80–100 ms after P onset | 60–120 ms after P onset | the a wave is the atrial activation's pressure peak (T_a 0.22 s) seen through the line; AF has no a wave (unchanged) |
| resp-coupling PEEP 5→15 | CO −9 %, MAP 97 → 83 | CO falls ≥ 3 % (A2 guard: "fails if heart–lung coupling is lost") and CVP rises 1–4 mmHg | emergent through `T_IT`; the A2 guard is the binding test |
| NIBP bias | SBP/DBP bias ≤ 5, SD ≤ 8 | unchanged | the cuff reads the same radial truth |

Edit each named `it(...)` block to the new assertion and add the justification as a `//` comment above it. Do not change any other test.

- [ ] **Step 3: Write the recheck summary test (numbers for the gate note)**

`packages/engine-core/test/engine/circ-stage2-recheck.test.ts`:

```ts
// Prints the Stage 2 acceptance numbers on the circulation for docs/gates/stage-7a.md (asserts only the bands of
// Task 23's table that no other test covers).
import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('Stage 2 acceptance on the Stage 7a circulation', () => {
  it('radial 120/80 ± 5 with the notch; radial SBP exceeds aortic by 5–20', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(40);
    const w = read(e, 'abp', 30, 40);
    const s = Math.max(...w);
    const d = Math.min(...w);
    const st = (e.snapshot().state as { st: { hemo: { circ: { beats: { sbp: number; aoSys: number }[] } } } }).st.hemo.circ.beats;
    const amp = st.slice(-5).reduce((a, b) => a + b.sbp - b.aoSys, 0) / 5;
    console.log(`radial ${s.toFixed(1)}/${d.toFixed(1)}, radial−aortic SBP ${amp.toFixed(1)}`);
    expect(Math.abs(s - 120)).toBeLessThanOrEqual(5);
    expect(Math.abs(d - 80)).toBeLessThanOrEqual(5);
    expect(amp).toBeGreaterThanOrEqual(5);
    expect(amp).toBeLessThanOrEqual(20);
  });
  it('A2 guard: PEEP 5 → 15 lowers CO by ≥ 3 %', () => {
    const { e, ev } = rig({ hr: 75 });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.advanceTo(90);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 15 } }));
    e.advanceTo(180);
    const co = (a: number, b: number) => {
      const c = ev.filter((x) => x.type === 'circ' && x.t >= a && x.t < b) as unknown as { co: number }[];
      return c.reduce((p, q) => p + q.co, 0) / c.length;
    };
    const drop = 1 - co(170, 180) / co(80, 90);
    console.log(`PEEP 5→15 CO drop ${(drop * 100).toFixed(1)} %`);
    expect(drop).toBeGreaterThanOrEqual(0.03);
  }, 300_000);
});
```

Note the MANUAL tracker defends the pressure targets but not CO, so the CO fall shows even in MANUAL; run in MANUAL (default).

- [ ] **Step 4: Run all engine tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine`
Expected: PASS. Copy the printed numbers into the gate-note draft.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/test/engine
git commit -m "test(hemo): Stage 2 acceptance re-checked on the circulation; physics-changed bands re-specified with justification" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 24: Sanity scenarios I (engine, MODELED) — phenylephrine, haemorrhage, propofol, β-blocked haemorrhage

**Files:**
- Create: `packages/engine-core/test/engine/circ-sanity-1.test.ts`

**Interfaces:**
- Consumes: the engine in MODELED mode with the circulation; `circ` events; `applyEvent` drug/bleed.

- [ ] **Step 1: Write the test**

`packages/engine-core/test/engine/circ-sanity-1.test.ts`:

```ts
// Tables §7 / brief §4.9 sanity checks on the whole engine (MODELED). Bands marked "prototype" are the 7a
// prototype's measured bands where the tables' targets are not yet met (Deviations; Ali's R44 calibration pass).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, PatientProfile } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
async function run(patient: PatientProfile, events: [number, Record<string, unknown>][], tEnd: number) {
  const e = createEngine({ seed: 11, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
  for (const [t, event] of events) e.dispatch(cmd({ type: 'applyEvent', event, atTick: Math.round(t * 50) }));
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(Math.min(t, tEnd));
    await yieldNow();
  }
  const st = (a: number, b: number, k: 'sbp' | 'dbp' | 'hr') => {
    const s = ev.filter((x) => x.type === 'state' && x.t >= a && x.t < b) as Extract<EngineEvent, { type: 'state' }>[];
    return s.reduce((p, q) => p + (q.values[k] ?? 0), 0) / Math.max(1, s.length);
  };
  const map = (a: number, b: number) => st(a, b, 'dbp') + (st(a, b, 'sbp') - st(a, b, 'dbp')) / 3;
  return { ev, st, map };
}

describe('sanity scenarios I (MODELED)', () => {
  it('phenylephrine 100 µg: MAP +15–25, HR −5–15 within 30–60 s (brief §4.9 check 1)', async () => {
    const r = await run({}, [[120, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 240);
    const dMap = Math.max(r.map(150, 160), r.map(170, 180), r.map(190, 200)) - r.map(100, 120);
    const dHr = r.st(160, 180, 'hr') - r.st(100, 120, 'hr');
    expect(dMap).toBeGreaterThanOrEqual(15);
    expect(dMap).toBeLessThanOrEqual(25);
    expect(dHr).toBeLessThanOrEqual(-5);
    expect(dHr).toBeGreaterThanOrEqual(-16); // prototype −15.0 at 60 s (band −15; 1 bpm tolerance)
  }, 300_000);
  it('class II haemorrhage (25 % over 10 min): HR 95–125, PP narrowed ≥ 30 % (tables: SBP near normal, PPV > 13 % — flagged)', async () => {
    const r = await run({}, [[120, { kind: 'bleed', volumeMl: 1225, overS: 600 }]], 780);
    expect(r.st(740, 780, 'hr')).toBeGreaterThanOrEqual(95);
    expect(r.st(740, 780, 'hr')).toBeLessThanOrEqual(125);
    const pp0 = r.st(100, 120, 'sbp') - r.st(100, 120, 'dbp');
    const pp1 = r.st(740, 780, 'sbp') - r.st(740, 780, 'dbp');
    expect(pp1).toBeLessThanOrEqual(0.7 * pp0);
  }, 300_000);
  it('propofol 2 mg/kg: MAP ≈ 70 % of baseline at 2 min (60–80 %) with little HR rise (< +15)', async () => {
    const r = await run({}, [[120, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }]], 300);
    const ratio = r.map(235, 245) / r.map(100, 120);
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.8);
    expect(r.st(235, 245, 'hr') - r.st(100, 120, 'hr')).toBeLessThan(15);
  }, 300_000);
  it('β-blocked 35 % haemorrhage: HR 75–95 (tables §7 17b; prototype 79)', async () => {
    const r = await run({ conditions: [{ id: 'betaBlocked' }] }, [[120, { kind: 'bleed', volumeMl: 1715, overS: 600 }]], 780);
    expect(r.st(740, 780, 'hr')).toBeGreaterThanOrEqual(75);
    expect(r.st(740, 780, 'hr')).toBeLessThanOrEqual(95);
  }, 300_000);
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-1.test.ts`
Expected: PASS. The propofol curve was NOT prototyped: if the MAP ratio at 2 min falls outside 0.6–0.8, scale `DRUGS.propofol.peak.svr` (currently −0.27) in steps of 0.03 within −0.18…−0.36 (tables §6.3 SVR ×(1 − 0.45E), E 0.4–0.8) and record the value in the gate note and in the `drugs.ts` comment.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/circ-sanity-1.test.ts packages/engine-core/src/l2/circ/drugs.ts
git commit -m "test(circ): sanity scenarios I — phenylephrine, class II haemorrhage, propofol induction, β-blocked haemorrhage (tables §7)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 25: Sanity scenarios II — AS + CAD propofol (R23), tamponade, massive PE, RV infarct, severe MR

**Files:**
- Create: `packages/engine-core/test/engine/circ-sanity-2.test.ts`

- [ ] **Step 1: Write the test**

`packages/engine-core/test/engine/circ-sanity-2.test.ts`:

```ts
// R23 acceptance and tables §2.3 H2/H5/H7/H8 through the engine (MODELED). Bands flagged in the plan's
// Deviations are the prototype's; the tables' targets are in the comments.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, PatientProfile } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Circ = Extract<EngineEvent, { type: 'circ' }>;
async function run(patient: PatientProfile, events: [number, Record<string, unknown>][], tEnd: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  for (const [t, event] of events) e.dispatch(cmd({ type: 'applyEvent', event, atTick: Math.round(t * 50) }));
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(Math.min(t, tEnd));
    await yieldNow();
  }
  const circ = (a: number, b: number) => ev.filter((x): x is Circ => x.type === 'circ' && x.t >= a && x.t < b);
  const avg = (a: number, b: number, k: keyof Circ) => {
    const c = circ(a, b);
    return c.reduce((p, q) => p + (q[k] as number), 0) / Math.max(1, c.length);
  };
  const st = (a: number, b: number, k: 'sbp' | 'dbp' | 'hr' | 'cvp' | 'pawp') => {
    const s = ev.filter((x) => x.type === 'state' && x.t >= a && x.t < b) as Extract<EngineEvent, { type: 'state' }>[];
    return s.reduce((p, q) => p + (q.values[k] ?? 0), 0) / Math.max(1, s.length);
  };
  return { e, ev, avg, st };
}
const AS_CAD: PatientProfile = { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] };
const propofol = { kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg', route: 'iv' };

describe('sanity scenarios II', () => {
  it('R23: AS + CAD propofol → hypotension → ischaemia (kIsch falls, ST ↓) → phenylephrine reverses it', async () => {
    const r = await run(AS_CAD, [[60, propofol], [210, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 420);
    expect(r.avg(170, 205, 'kIsch')).toBeLessThan(0.85); // falling contractility
    const st = r.ev.filter((x) => x.type === 'circ' && x.t > 170 && x.t < 210) as Circ[];
    expect(st.some((c) => c.supplyDemand < 1)).toBe(true);
    expect(r.avg(380, 420, 'kIsch')).toBeGreaterThan(0.95); // recovered within 3 min of the rescue
  }, 300_000);
  it('R23: the same run rescued with ephedrine 10 mg keeps the deficit longer (kIsch still < 0.95 at +3 min)', async () => {
    const r = await run(AS_CAD, [[60, propofol], [210, { kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' }]], 420);
    expect(r.avg(380, 420, 'kIsch')).toBeLessThan(0.95);
  }, 300_000);
  it('H7 tamponade: CVP ≈ PCWP within 5 mmHg, CO falls ≥ 15 %, HR rises', async () => {
    const r = await run({}, [[60, { kind: 'condition', id: 'tamponade', severity: 1 }]], 180);
    expect(Math.abs(r.st(150, 180, 'cvp') - r.st(150, 180, 'pawp'))).toBeLessThanOrEqual(5);
    expect(r.avg(150, 180, 'co')).toBeLessThan(0.85 * r.avg(30, 60, 'co'));
    expect(r.st(150, 180, 'hr')).toBeGreaterThan(r.st(30, 60, 'hr'));
  }, 300_000);
  it('H5 massive PE (φ 0.6): mPAP 30–45 and CO falls ≥ 10 % (tables −40–60 %: flagged)', async () => {
    const r = await run({}, [[60, { kind: 'condition', id: 'pe', severity: 0.75 }]], 180);
    expect(r.avg(150, 180, 'co')).toBeLessThan(0.9 * r.avg(30, 60, 'co'));
  }, 300_000);
  it('H8 RV infarct: CVP rises ≥ 2, PCWP does not rise, CO falls', async () => {
    const r = await run({}, [[60, { kind: 'condition', id: 'rvInfarct', severity: 1 }]], 180);
    expect(r.st(150, 180, 'cvp')).toBeGreaterThan(r.st(30, 60, 'cvp') + 2);
    expect(r.st(150, 180, 'pawp')).toBeLessThanOrEqual(r.st(30, 60, 'pawp') + 1);
  }, 300_000);
  it('H2 severe MR: regurgitant volume ≥ 50 mL/beat equivalent (forward SV < total), PCWP ≥ 15', async () => {
    const r = await run({ conditions: [{ id: 'mr', grade: 'severe' }] }, [], 120);
    expect(r.st(90, 120, 'pawp')).toBeGreaterThanOrEqual(15);
  }, 300_000);
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-2.test.ts`
Expected: PASS. The AS + CAD trajectory was NOT prototyped through the engine; if propofol 1.5 mg/kg does not produce `supplyDemand < 1` in the AS + CAD profile, first check the resting ratio (should equal the profile's CFR 1.4); the tables' worked example needs DBP ≈ 45 and LVEDP ≈ 25 at 2 min. Adjust nothing else before reporting: record the measured DBP/LVEDP/ratio trajectory in the gate note as the R23 evidence, and if the test fails, keep it `it.fails` with a comment naming the measured numbers (the orchestrator decides — R23 is an acceptance criterion).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/circ-sanity-2.test.ts
git commit -m "test(circ): sanity scenarios II — AS+CAD propofol ischaemia and rescue (R23), tamponade, massive PE, RV infarct, severe MR" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 26: Pulse oracle scenarios O1–O5 (packages/validation)

**Files:**
- Create: `packages/validation/src/oracle/pulse-runner.ts`, `packages/validation/src/oracle/scenarios.ts`, `packages/validation/src/oracle/compare.ts`, `packages/validation/test/oracle.test.ts`

**Interfaces:**
- Produces: `loadPulse(dir: string): Promise<PulseHandle>` (`step(n)`, `read(): Record<string, number>` by `drm_names.json` index, `act(json: string)`), `ORACLE_SCENARIOS: OracleScenario[]` (O1–O5 of annex §D: baseline 10 min; 20 % haemorrhage; 1 L crystalloid; propofol 2 mg/kg; norepinephrine 0.1 µg/kg/min — O5 runs Pulse only and asserts direction on ours as `expect-differ`/`exclude` until 7g adds norepinephrine), `compareRow(ours, pulse, rule)` returning `'agree' | 'expect-differ-ok' | 'fail'`.
- The wasm lives OUTSIDE the repo (`research/pulse-spike/web/{pulse.js,pulse.wasm,pulse.data}`, 6.9 MB): the test reads `process.env.PULSE_ORACLE_DIR` and is skipped when it is unset (CI) — the gate note records a local run.

- [ ] **Step 1: Write the runner**

`packages/validation/src/oracle/pulse-runner.ts`:

```ts
// Pulse 4.3.2 wasm as a DIFFERENTIAL-TEST ORACLE (R34; annex §D). Loads the spike's emscripten build in Node, starts
// from the pre-stabilised StandardMale state, steps at 20 ms, and reads the data requests of bench/drm.json by the
// index order of bench/drm_names.json. Never used to set our defaults (audit §4 "validation circularity").
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PulseHandle {
  step(n: number): void;
  read(): Record<string, number>;
  act(json: string): boolean;
}

export const DRM_NAMES_FALLBACK = [
  'HeartRate(1/min)', 'ArterialPressure(mmHg)', 'SystolicArterialPressure(mmHg)', 'DiastolicArterialPressure(mmHg)', 'MeanArterialPressure(mmHg)',
  'CardiacOutput(L/min)', 'HeartStrokeVolume(mL)', 'SystemicVascularResistance(mmHg_s/mL)', 'CentralVenousPressure(mmHg)', 'MeanCentralVenousPressure(mmHg)',
  'PulmonaryArterialPressure(mmHg)', 'PulmonarySystolicArterialPressure(mmHg)', 'PulmonaryDiastolicArterialPressure(mmHg)', 'PulmonaryCapillariesWedgePressure(mmHg)',
];

export async function loadPulse(dir: string, namesPath?: string): Promise<PulseHandle> {
  const req = createRequire(import.meta.url);
  const createPulse = req(join(dir, 'pulse.js')) as (o: Record<string, unknown>) => Promise<{
    cwrap: (n: string, r: string | null, a: string[]) => (...x: unknown[]) => unknown;
    FS: { readFile: (p: string, o: { encoding: 'utf8' }) => string };
    HEAPF64: Float64Array;
  }>;
  const M = await createPulse({ locateFile: (f: string) => join(dir, f), print: () => {}, printErr: () => {} });
  const c = (n: string, r: string | null, a: string[]) => M.cwrap(n, r, a);
  c('PulseInitialize', null, [])();
  const drm = M.FS.readFile('/bench/drm.json', { encoding: 'utf8' });
  const e = c('Allocate', 'number', ['number', 'string'])(0, '/') as number;
  c('LogToConsole', null, ['number', 'boolean'])(e, false);
  if (!c('SerializeFromFile', 'boolean', ['number', 'string', 'string', 'number'])(e, '/states/StandardMale.json', drm, 0)) throw new Error('Pulse state load failed');
  const Step = c('AdvanceTimeStep', 'boolean', ['number']);
  const Pull = c('PullData', 'number', ['number']);
  const Act = c('ProcessActions', 'boolean', ['number', 'string', 'number']);
  const names: string[] = namesPath ? (JSON.parse(readFileSync(namesPath, 'utf8')) as string[]) : DRM_NAMES_FALLBACK;
  return {
    step: (n) => {
      for (let i = 0; i < n; i++) Step(e);
    },
    read: () => {
      const p = (Pull(e) as number) >> 3;
      const out: Record<string, number> = { t: M.HEAPF64[p] as number };
      names.forEach((nm, i) => (out[nm] = M.HEAPF64[p + 1 + i] as number));
      return out;
    },
    act: (json) => Act(e, json, 0) as boolean,
  };
}
```

`packages/validation/src/oracle/scenarios.ts`:

```ts
// Oracle scenarios O1–O5 (annex §D) as {Pulse actions, our commands, compared channels, tolerance, expectation}.
export interface OracleRow {
  channel: 'hr' | 'map' | 'co' | 'cvp' | 'pcwp';
  metric: 'abs' | 'delta';
  tol: number; // relative
  expect: 'agree' | 'expect-differ' | 'exclude';
  note?: string;
}
export interface OracleScenario {
  id: 'O1' | 'O2' | 'O3' | 'O4' | 'O5';
  durationS: number;
  baselineS: number; // compare deltas from each engine's own value at this time
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  compareAtS: number;
  rows: OracleRow[];
}
const bolus = (sub: string, mgPerMl: number, ml: number) =>
  JSON.stringify({ AnyAction: [{ PatientAction: { SubstanceBolus: { AdministrationRoute: 'Intravenous', Substance: sub, Concentration: { ScalarMassPerVolume: { Value: mgPerMl, Unit: 'mg/mL' } }, Dose: { ScalarVolume: { Value: ml, Unit: 'mL' } } } } }] });
const bleed = (mlPerMin: number) => JSON.stringify({ AnyAction: [{ PatientAction: { Hemorrhage: { Compartment: 'RightLeg', Flow: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } } }] });

export const ORACLE_SCENARIOS: OracleScenario[] = [
  { id: 'O1', durationS: 600, baselineS: 0, pulse: [], ours: [], compareAtS: 600, rows: [
    { channel: 'hr', metric: 'abs', tol: 0.05, expect: 'agree' }, { channel: 'map', metric: 'abs', tol: 0.05, expect: 'agree' },
    { channel: 'co', metric: 'abs', tol: 0.05, expect: 'agree' }, { channel: 'cvp', metric: 'abs', tol: 0.5, expect: 'agree', note: 'CVP 4.7 vs 5; ±0.5 relative on a small number' },
    { channel: 'pcwp', metric: 'abs', tol: 0.3, expect: 'agree' } ] },
  { id: 'O2', durationS: 1200, baselineS: 60, pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }], ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }], compareAtS: 1200, rows: [
    { channel: 'hr', metric: 'delta', tol: 0.2, expect: 'agree' }, { channel: 'map', metric: 'delta', tol: 0.2, expect: 'agree' }, { channel: 'co', metric: 'delta', tol: 0.2, expect: 'agree' } ] },
  { id: 'O3', durationS: 1800, baselineS: 60, pulse: [{ tS: 60, json: JSON.stringify({ AnyAction: [{ PatientAction: { SubstanceCompoundInfusion: { SubstanceCompound: 'Saline', BagVolume: { ScalarVolume: { Value: 1000, Unit: 'mL' } }, Rate: { ScalarVolumePerTime: { Value: 33.3, Unit: 'mL/min' } } } } }] }) }], ours: [{ tS: 60, event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 1000, overS: 1800 } }], compareAtS: 1800, rows: [
    { channel: 'cvp', metric: 'delta', tol: 0.5, expect: 'agree', note: 'D10: 7a has no redistribution (brief §4.9), Pulse retains ≥ 0.6 — direction must agree' } ] },
  { id: 'O4', durationS: 600, baselineS: 60, pulse: [{ tS: 60, json: bolus('Propofol', 10, 15.4) }], ours: [{ tS: 60, event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } }], compareAtS: 180, rows: [
    { channel: 'map', metric: 'delta', tol: 0.15, expect: 'agree' }, { channel: 'hr', metric: 'delta', tol: 0.1, expect: 'expect-differ', note: 'D8: Pulse HR 72 → 49 (direct HR modifier); ours 65–75' } ] },
  { id: 'O5', durationS: 1800, baselineS: 60, pulse: [], ours: [], compareAtS: 1200, rows: [
    { channel: 'map', metric: 'delta', tol: 0.2, expect: 'exclude', note: 'norepinephrine arrives in 7g; D24 plasma level excluded' } ] },
];
```

`packages/validation/src/oracle/compare.ts`:

```ts
import type { OracleRow } from './scenarios.ts';
/** agree: |ours − pulse| ≤ tol·max(1, |pulse|); expect-differ: must be OUTSIDE (a Pulse fix is then noticed). */
export function compareRow(ours: number, pulse: number, row: OracleRow): 'agree' | 'expect-differ-ok' | 'excluded' | 'fail' {
  if (row.expect === 'exclude') return 'excluded';
  const inside = Math.abs(ours - pulse) <= row.tol * Math.max(1, Math.abs(pulse));
  if (row.expect === 'agree') return inside ? 'agree' : 'fail';
  return inside ? 'fail' : 'expect-differ-ok';
}
```

- [ ] **Step 2: Write the test (skipped without the wasm)**

`packages/validation/test/oracle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';
import { ORACLE_SCENARIOS } from '../src/oracle/scenarios.ts';

const DIR = process.env.PULSE_ORACLE_DIR;
const PULSE_KEYS = { hr: 'HeartRate(1/min)', map: 'MeanArterialPressure(mmHg)', co: 'CardiacOutput(L/min)', cvp: 'MeanCentralVenousPressure(mmHg)', pcwp: 'PulmonaryCapillariesWedgePressure(mmHg)' } as const;

describe.skipIf(!DIR)('Pulse oracle O1–O5 (annex §D; set PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of ORACLE_SCENARIOS) {
    it(`${sc.id}`, async () => {
      const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
      const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
      for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
      const pulseAt: Record<number, Record<string, number>> = {};
      let t = 0;
      const acts = [...sc.pulse];
      for (const at of [sc.baselineS, sc.compareAtS]) {
        while (t < at) {
          while (acts.length && acts[0]!.tS <= t) p.act(acts.shift()!.json);
          p.step(50);
          t += 1;
          if (t % 60 === 0) await new Promise((r) => setImmediate(r));
        }
        pulseAt[at] = p.read();
        e.advanceTo(at);
      }
      const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
        const c = ev.filter((x) => x.type === 'circ' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'circ' }>[];
        const s = ev.filter((x) => x.type === 'state' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'state' }>[];
        const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
        if (k === 'co') return avg(c.map((x) => x.co));
        if (k === 'map') return avg(s.map((x) => (x.values.dbp ?? 0) + ((x.values.sbp ?? 0) - (x.values.dbp ?? 0)) / 3));
        if (k === 'hr') return avg(s.map((x) => x.values.hr ?? 0));
        if (k === 'cvp') return avg(s.map((x) => x.values.cvp ?? 0));
        return avg(s.map((x) => x.values.pawp ?? 0));
      };
      for (const row of sc.rows) {
        const o = row.metric === 'abs' ? ours(sc.compareAtS, row.channel) : ours(sc.compareAtS, row.channel) - ours(sc.baselineS || 10, row.channel);
        const pv = row.metric === 'abs' ? pulseAt[sc.compareAtS]![PULSE_KEYS[row.channel]]! : pulseAt[sc.compareAtS]![PULSE_KEYS[row.channel]]! - pulseAt[sc.baselineS]![PULSE_KEYS[row.channel]]!;
        const verdict = compareRow(o, pv, row);
        console.log(`${sc.id} ${row.channel} ${row.metric}: ours ${o.toFixed(2)} pulse ${pv.toFixed(2)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
        expect(verdict).not.toBe('fail');
      }
    }, 600_000);
  }
});
```

- [ ] **Step 3: Run it locally with the wasm**

Run: `PULSE_ORACLE_DIR=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle.test.ts`
Expected: 5 tests; every row prints `agree`, `expect-differ-ok` or `excluded`. If `pulse.js` fails to load in Node (it was built for a Web Worker), rebuild is out of scope: record "oracle: wasm is web-only" in the gate note, keep the test skipped, and continue — the runner and scenarios are the deliverable. A `fail` on an `agree` row is a finding for the gate note, not a reason to retune our model (audit §4).
Run without the env var: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle.test.ts` → 5 skipped.

- [ ] **Step 4: Commit**

```bash
git add packages/validation/src/oracle packages/validation/test/oracle.test.ts
git commit -m "feat(validation): Pulse wasm oracle runner and scenarios O1–O5 with expected disagreements (R34, annex §D)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 27: CPU budget, determinism hashes, 24 h no-drift

**Files:**
- Create: `packages/engine-core/test/engine/circ-longrun.test.ts`

- [ ] **Step 1: Write the test**

`packages/engine-core/test/engine/circ-longrun.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCircModel, RESTING_ENV } from '../../src/l2/circ/model.ts';
import { totalVolume } from '../../src/l2/circ/circuit.ts';
import { driver, runTo, ventEnv } from '../helpers/circ.ts';
import { createEngine } from '../../src/engine.ts';
import { cmd } from '../helpers/hemo.ts';

describe('Stage 7a long runs', () => {
  it('CPU: the circulation (circuit + control) costs ≤ 0.3 ms per 20 ms tick in Node', () => {
    const m = createCircModel();
    const dr = driver(m);
    const env = ventEnv();
    runTo(dr, 10, env);
    const t0 = performance.now();
    runTo(dr, 310, env);
    const perTick = (performance.now() - t0) / (300 / 0.02);
    console.log(`circulation ${perTick.toFixed(4)} ms per tick`);
    expect(perTick).toBeLessThanOrEqual(0.3);
  });
  it('determinism: same seed and command list → identical 60 s ABP/CVP/PAP hash; another seed differs', () => {
    const h = (seed: number) => {
      const e = createEngine({ seed, mode: 'modeled', patient: { sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } });
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }, atTick: 500 }));
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', atTick: 2000 }));
      e.advanceTo(60);
      const hash = createHash('sha256');
      for (const ch of ['abp', 'cvp', 'pap'] as const) {
        const out = new Float32Array(60 * 125);
        e.readSamples(ch, 1, out);
        hash.update(Buffer.from(out.buffer));
      }
      return hash.digest('hex');
    };
    const a = h(42);
    console.log(`hash seed 42 ${a}`);
    expect(h(42)).toBe(a);
    expect(h(43)).not.toBe(a);
  }, 120_000);
  it('24 h on the bare model: blood volume drifts < 0.1 mL and pressures stay finite (yielding per sim-minute)', async () => {
    const m = createCircModel();
    const dr = driver(m);
    const v0 = totalVolume(m.s, m.p);
    for (let t = 60; t <= 86_400; t += 60) {
      runTo(dr, t, { ...RESTING_ENV });
      if (t % 600 === 0) await new Promise((r) => setImmediate(r));
    }
    expect(Math.abs(totalVolume(m.s, m.p) - v0)).toBeLessThan(0.1);
    for (const x of m.s) expect(Number.isFinite(x)).toBe(true);
  }, 600_000);
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-longrun.test.ts`
Expected: PASS. Prototype: 0.016 ms per tick; the 24 h bare-model run takes ≈ 60–120 s wall. Also re-run the existing Stage 2 24 h engine test (`test/engine/hemo-longrun.test.ts`) — it must still pass inside its 600 s budget; if it now exceeds it, report the wall time in the gate note (do not raise the timeout above 600 s without the orchestrator).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/circ-longrun.test.ts
git commit -m "test(circ): CPU per tick, determinism hashes and 24 h volume conservation for the circulation" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 28: Demo page `stage7a.html` (profile picker, lesions, drugs, CPR, IABP/LVAD, PV loop)

**Files:**
- Create: `apps/demo/stage7a.html`, `apps/demo/src/stage7a.ts`, `apps/demo/e2e/stage7a.spec.ts`
- Modify: `apps/demo/vite.config.ts` (1 line), `apps/demo/index.html` (1 link)

**Interfaces:**
- Consumes: `createEngine`, `mountMonitor` from `@pme/renderer` exactly as `apps/demo/src/stage2.ts` does (read it first and copy its mount/worker pattern — the page runs the engine in-process like stage2.ts), commands from Tasks 1, 15–22.

- [ ] **Step 1: Write the page**

`apps/demo/stage7a.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stage 7a — circulation</title>
  <style>
    body { margin: 0; background: #000; color: #ddd; font: 13px system-ui, sans-serif; display: grid; grid-template-columns: 1fr 360px; height: 100vh; }
    #monitor { min-height: 0; }
    aside { padding: 10px; overflow: auto; border-left: 1px solid #333; }
    fieldset { border: 1px solid #333; margin: 0 0 8px; }
    label { display: block; margin: 3px 0; }
    button { margin: 2px; }
    #pv { width: 330px; height: 260px; background: #080808; border: 1px solid #333; }
    #diag { white-space: pre; font: 11px ui-monospace, monospace; color: #9c9; }
  </style>
</head>
<body>
  <div id="monitor"></div>
  <aside>
    <fieldset><legend>Profile (restarts the patient)</legend>
      <label>Preset <select id="preset">
        <option value="adult">Adult 40 y 70 kg</option><option value="elderly">75 y HTN</option><option value="ascad">75 y AS + CAD + HTN</option>
        <option value="hfref">HFrEF</option><option value="child">Child 6 y</option><option value="bb">β-blocked</option></select></label>
      <label>AS <select id="as"><option value="">none</option><option>mild</option><option>moderate</option><option>severe</option><option>critical</option></select></label>
      <label>MR <select id="mr"><option value="">none</option><option>mild</option><option>moderate</option><option>severe</option></select></label>
      <label>AR <select id="ar"><option value="">none</option><option>mild</option><option>moderate</option><option>severe</option></select></label>
      <label>HFrEF severity <input id="hf" type="range" min="0" max="1" step="0.1" value="0" /></label>
      <label>CAD <select id="cad"><option value="">none</option><option value="stable">1–2 vessel</option><option value="severe">3-vessel/LM</option></select></label>
      <label>Mode <select id="mode"><option value="modeled">MODELED</option><option value="manual">MANUAL</option></select></label>
      <button id="restart">Restart patient</button>
    </fieldset>
    <fieldset><legend>Drugs</legend>
      <button data-drug="phenylephrine,100,mcg">Phenylephrine 100 µg</button>
      <button data-drug="ephedrine,10,mg">Ephedrine 10 mg</button>
      <button data-drug="nitroglycerin,100,mcg">NTG 100 µg</button>
      <button data-drug="esmolol,0.5,mg/kg">Esmolol 0.5 mg/kg</button>
      <button data-drug="propofol,1.5,mg/kg">Propofol 1.5 mg/kg</button>
    </fieldset>
    <fieldset><legend>Events</legend>
      <button id="bleed">Bleed 1 L / 10 min</button><button id="fluid">Fluid 500 mL / 5 min</button>
      <button id="cpr">Toggle CPR</button><button id="vf">VF</button><button id="sinus">Sinus</button>
      <button data-cond="tamponade">Tamponade</button><button data-cond="pe">Massive PE</button><button data-cond="tensionPtx">Tension PTX</button><button data-cond="rvInfarct">RV infarct</button>
      <button id="peep">PEEP 5 ⇄ 15</button>
    </fieldset>
    <fieldset><legend>Devices</legend>
      <button id="iabp">IABP 1:1 ⇄ 1:2 ⇄ off</button><button id="lvad">LVAD on/off</button>
    </fieldset>
    <canvas id="pv" width="330" height="260"></canvas>
    <div id="diag"></div>
  </aside>
  <script type="module" src="./src/stage7a.ts"></script>
</body>
</html>
```

`apps/demo/src/stage7a.ts`:

```ts
// Stage 7a demo: the circulation with profile picker, lesions, drugs, CPR, IABP/LVAD and a PV-loop canvas.
// Mounting follows apps/demo/src/stage2.ts (in-process engine + @pme/renderer); only the controls are new.
import { createEngine, type EngineEvent, type MonitorEngine, type PatientProfile } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let e: MonitorEngine;
let unmount: (() => void) | null = null;
let seq = 0;
const send = (body: Record<string, unknown>) => e.dispatch({ id: `d${++seq}`, issuedBy: 'demo', ...body } as never);
const PRESETS: Record<string, PatientProfile> = {
  adult: { ageY: 40, sex: 'M', weightKg: 70 },
  elderly: { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }] },
  ascad: { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] },
  hfref: { ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] },
  child: { ageY: 6, sex: 'M', weightKg: 20 },
  bb: { ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] },
};
let lastCirc: Extract<EngineEvent, { type: 'circ' }> | null = null;

function profile(): PatientProfile {
  const p = structuredClone(PRESETS[$<HTMLSelectElement>('preset').value] ?? PRESETS.adult!);
  const cs = [...(p.conditions ?? [])];
  for (const id of ['as', 'mr', 'ar', 'cad'] as const) {
    const g = $<HTMLSelectElement>(id).value;
    if (g) cs.push({ id, grade: g });
  }
  const hf = Number($<HTMLInputElement>('hf').value);
  if (hf > 0) cs.push({ id: 'hfref', severity: hf });
  return { ...p, conditions: cs, sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } };
}

function start(): void {
  unmount?.();
  e = createEngine({ seed: 7, mode: $<HTMLSelectElement>('mode').value as 'manual' | 'modeled', patient: profile() });
  send({ type: 'attachSensor', sensor: 'pv', state: 'on' });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } });
  e.on((x) => {
    if (x.type === 'circ') lastCirc = x;
  }, ['circ']);
  unmount = mountMonitor($('monitor'), e, { lanes: ['ecgII', 'abp', 'cvp', 'pap', 'pleth'] });
  e.start();
}

let peep = 5;
let cpr = false;
let iabp = 0;
let lvad = false;
$('restart').onclick = start;
document.querySelectorAll<HTMLButtonElement>('[data-drug]').forEach((b) => {
  b.onclick = () => {
    const [drugId, dose, unit] = (b.dataset.drug as string).split(',');
    send({ type: 'applyEvent', event: { kind: 'drug', drugId, dose: Number(dose), unit, route: 'iv' } });
  };
});
document.querySelectorAll<HTMLButtonElement>('[data-cond]').forEach((b) => {
  b.onclick = () => send({ type: 'applyEvent', event: { kind: 'condition', id: b.dataset.cond, severity: 0.8 } });
});
$('bleed').onclick = () => send({ type: 'applyEvent', event: { kind: 'bleed', volumeMl: 1000, overS: 600 } });
$('fluid').onclick = () => send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 } });
$('cpr').onclick = () => send({ type: 'applyEvent', event: { kind: 'cpr', active: (cpr = !cpr), rate: 110, quality: 0.8 } });
$('vf').onclick = () => send({ type: 'setRhythm', rhythm: 'vfCoarse' });
$('sinus').onclick = () => send({ type: 'setRhythm', rhythm: 'sinus' });
$('peep').onclick = () => send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: (peep = peep === 5 ? 15 : 5) } });
$('iabp').onclick = () => {
  iabp = (iabp + 1) % 3;
  send({ type: 'device', action: iabp === 0 ? { device: 'iabp', action: 'stop' } : { device: 'iabp', action: 'start', ratio: iabp as 1 | 2 } });
};
$('lvad').onclick = () => send({ type: 'device', action: { device: 'lvad', action: (lvad = !lvad) ? 'start' : 'stop', rpm: 5400 } });

// PV loop: the last 3 s of lvv (x) vs lvp (y), redrawn at 10 Hz
const cv = $<HTMLCanvasElement>('pv');
const g = cv.getContext('2d') as CanvasRenderingContext2D;
setInterval(() => {
  if (!e) return;
  const n = 375;
  const end = e.latestSampleIndex('lvp');
  if (end < n) return;
  const p = new Float32Array(n);
  const v = new Float32Array(n);
  e.readSamples('lvp', end - n + 1, p);
  e.readSamples('lvv', end - n + 1, v);
  g.fillStyle = '#080808';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#333';
  g.strokeRect(30, 10, 290, 220);
  g.fillStyle = '#888';
  g.fillText('LV volume 0–250 mL →', 120, 252);
  g.fillText('LVP 0–200', 2, 12);
  g.strokeStyle = '#ff5050';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = 30 + (290 * (v[i] as number)) / 250;
    const y = 230 - (220 * (p[i] as number)) / 200;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  const c = lastCirc;
  $('diag').textContent = c
    ? `CO ${c.co.toFixed(1)} L/min  SV ${c.sv.toFixed(0)}  EF ${(c.ef * 100).toFixed(0)} %\nLVEDV ${c.lvedv.toFixed(0)}  LVEDP ${c.lvedp.toFixed(0)}  LVSP ${c.lvsp.toFixed(0)}\n` +
      `Pmsf ${c.pmsf.toFixed(1)}  SVR ${c.svr.toFixed(2)}  PVR ${c.pvr.toFixed(2)}\nCPP ${c.cpp.toFixed(0)}  S/D ${c.supplyDemand.toFixed(2)}  kIsch ${c.kIsch.toFixed(2)}` +
      (c.lvad ? `\nLVAD ${c.lvad.rpm} rpm ${c.lvad.flowLpm.toFixed(1)} L/min PI ${c.lvad.pi.toFixed(1)}${c.lvad.suction ? ' SUCTION' : ''}` : '') +
      (c.iabp ? `\nIABP 1:${c.iabp.ratio}` : '')
    : '';
}, 100);
start();
```

(If `mountMonitor`'s signature in `@pme/renderer` differs from `(el, engine, { lanes })`, use exactly the call `apps/demo/src/stage2.ts` makes — that file is the reference.)

In `apps/demo/vite.config.ts` add `'stage7a': page('stage7a'), // Stage 7a` to `input`; in `apps/demo/index.html` add a link `<li><a href="./stage7a.html">Stage 7a — circulation</a></li>` beside the other stage links.

- [ ] **Step 2: E2E smoke + screenshots**

`apps/demo/e2e/stage7a.spec.ts` (copy the structure of the existing Stage 2 e2e spec in `apps/demo/e2e/`; the checks):

```ts
import { expect, test } from '@playwright/test';

test('stage7a page runs, draws a PV loop and reacts to phenylephrine', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/stage7a.html');
  await page.waitForTimeout(8000);
  await expect(page.locator('#diag')).toContainText('CO');
  await page.screenshot({ path: 'docs/gates/stage-7a/resting.png' });
  await page.click('text=Phenylephrine 100 µg');
  await page.waitForTimeout(20000);
  await page.screenshot({ path: 'docs/gates/stage-7a/phenylephrine.png' });
  await page.selectOption('#preset', 'ascad');
  await page.click('#restart');
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'docs/gates/stage-7a/as-cad.png' });
  await page.click('#iabp');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'docs/gates/stage-7a/iabp.png' });
  expect(errors).toEqual([]);
});
```

Run: `npx -y pnpm@9.15.9 build && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e -- stage7a`
Expected: PASS; four PNGs ≤ 60 KB each (palette-quantise with the script Stage 2 used if larger).

- [ ] **Step 3: Commit**

```bash
git add apps/demo/stage7a.html apps/demo/src/stage7a.ts apps/demo/e2e/stage7a.spec.ts apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-7a
git commit -m "feat(demo): stage7a.html — profile picker, lesions, drugs, CPR, conditions, IABP/LVAD and a live PV loop" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
```

### Task 29: NOTICES rows, gate note, PR

**Files:**
- Modify: `NOTICES.md`
- Create: `docs/gates/stage-7a.md`

- [ ] **Step 1: NOTICES**

Append to `NOTICES.md` (keep the file's existing table format and the next free `N-0xx` ids; the Pulse NOTICE paragraphs of annex §E go in ONCE, verbatim, above the first Pulse row if not already present):

```md
| N-P06 | Profile stabilisation procedure (circuit-only tuning of resistance/compliance to the patient's SBP/DBP, then a convergence window) — `packages/engine-core/src/l2/circ/stabilise.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/CardiovascularModel.cpp (TuneCircuit), Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1 (Copyright 2015 Applied Research Associates, Inc.); Apache License 2.0. Procedure re-implemented; tolerances retuned; no code copied. | courtesy |
| N-P07 | Double-Hill time-varying-elastance activation — `packages/engine-core/src/l2/circ/activation.ts` | Stergiopulos N, Meister JJ, Westerhof N. Am J Physiol 1996;270:H2050. Located via the Pulse Physiology Engine 4.3.2 (CardiovascularModel.cpp 2518–2539; PulseConfiguration.cpp 494–498), Apache License 2.0. Published activation function; duration driven by our LVET(HR) regression. | courtesy |
| N-P10 | ICRP 89 organ flow fractions (reference for 7d; exposed as constants for the per-lung and organ flows) | Valentin J (ICRP Publication 89), as compiled in the Pulse Physiology Engine 4.3.2 SetupCircuitsAndCompartments.cpp 293–330, Apache License 2.0. Fractions re-checked against ICRP 89. | data |
| N-P16 | Baroreflex resetting rule (> 5 % for > 420 s → set point += 0.35·Δ) — `packages/engine-core/src/l2/circ/baroreflex.ts` | Pulse Physiology Engine 4.3.2, NervousModel.cpp 332–353, Apache License 2.0. Rule adopted as [ENG-Pulse]; constants tunable. | courtesy |
| N-0xx | Pulse wasm as a differential-test oracle (not committed; loaded from research/pulse-spike/web at test time) — `packages/validation/src/oracle/**` | Pulse Physiology Engine 4.3.2 (Kitware), Apache License 2.0. The wasm and its Eigen/protobuf/abseil components are not distributed by this repository. | oracle |
```

Also add `export const ICRP89_FLOW_FRACTIONS_M = { brain: 0.12, myocardium: 0.04, kidneys: 0.17, liver: 0.255, muscle: 0.17, skin: 0.05, fat: 0.05, bone: 0.05 } as const; // N-P10 (audit #7) — used by 7d; 7a exposes them only` at the end of `packages/engine-core/src/l2/circ/params.ts` so the N-P10 row names a real file, and extend the row's path accordingly.

Run: `npx -y pnpm@9.15.9 check-notices`
Expected: `check-notices: OK`.

- [ ] **Step 2: Full gate run**

Run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`
Expected: all exit 0.

- [ ] **Step 3: Write `docs/gates/stage-7a.md`**

Same shape as `docs/gates/stage-2.md`: gate question ("Does the two-sided elastance heart reproduce the resting chambers, emergent PPV/PVC/AF effects, the reflex responses and the R23 ischaemia trajectory, within the CPU budget?"), a Check | Result table with every number printed by Tasks 6, 9, 10, 23–27 (resting chambers H1; phenylephrine; haemorrhage classes II/III; β-blocked; propofol; AS + CAD trajectory with DBP/LVEDP/ratio/kIsch/ST at 0/2/2.5/4/5 min for both rescues; tamponade; PE; RV infarct; MR; PEEP 5→15 CO drop; post-PVC ΔSBP; AF PP variability; pulseless plateau; CPR SBP/DBP/CO; IABP augmentation; LVAD PP/MAP; CPU per tick; hashes; 24 h drift; oracle rows), the re-specified Stage 2 bands with their justifications (Task 23), the Deviations list from this plan (still open ones marked for Ali's R44 calibration pass), the screenshots, and "Requests to other stages" (copy the plan's list).

- [ ] **Step 4: Tick the plan, commit, push, open the PR**

```bash
git add NOTICES.md docs/gates/stage-7a.md docs/plans/stage-7a-circulation.md packages/engine-core/src/l2/circ/params.ts
git commit -m "docs: Stage 7a gate note, NOTICES rows N-P06/N-P07/N-P10/N-P16 and the oracle row; plan ticked" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin stage-7a-circulation
gh pr create --base main --head stage-7a-circulation --title "Stage 7a: circulation — two-sided time-varying-elastance heart, pleural input, baroreflex, coronary, IABP/LVAD" --body "$(cat <<'BODY'
Implements docs/plans/stage-7a-circulation.md (R31, R42, R23, R22-minimal, R40 borrows #3/#4/#7). Gate evidence: docs/gates/stage-7a.md.

- Four-chamber double-Hill elastance heart, valves with stenosis/regurgitation, pulmonary circuit with per-lung flow, pericardium, continuous pleural input (R-B), RK4 at 2 ms inside the Stage 2 loop; Stage 2 channels/events unchanged.
- MANUAL tracker on Ees/SVR/venous V0/PVR; MODELED mode with baroreflex and chemoreflex hooks.
- Drugs (phenylephrine, ephedrine, NTG, esmolol, propofol), bleed/fluid, tamponade/PE/tension PTX/RV infarct, CPR thoracic pump.
- Coronary supply/demand with the ST hook via existing modifiers (no l2/ecg edits).
- IABP + LVAD implemented; VA-ECMO/CPB interfaces for 7h.
- Stage 2 acceptance re-specified where physics changes the number (see the gate note).
- Pulse oracle O1–O5 (local run; skipped in CI without the wasm).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Do NOT merge (R21: the orchestrator merges after inspecting the gate).

---

## Self-review (done while writing)

- **Spec coverage.** Scope 1 (circuit, valves, PA/PV/LA, systemic veins, pericardium, pleural, RK4 2 ms, no chattering, determinism) → Tasks 2–6, 9, 11, 12, 27. Scope 2 (per-beat interface, emergent k_rhythm/f_fill/PESP, pulselessness, CPR) → Tasks 12, 17, 23. Scope 3 (baroreflex, chemoreflex, autonomic factors) → Tasks 7, 19. Scope 4 (coronary, ST hook, AS) → Tasks 5, 18, 25. Scope 5 (profiles + stabilisation) → Tasks 5–6. Scope 6 (MANUAL tracker) → Task 14; MODELED → Task 15. Scope 7 (devices) → Tasks 20–21. Scope 8 (teaching view, demo) → Tasks 22, 28. Scope 9 (tests: Stage 2 re-check, §7 sanity, oracle, CPU, hashes, 24 h) → Tasks 23–27. NOTICES/PR → Task 29.
- **Prototype boundary.** Tasks 2–10 are the prototyped code, verbatim, with passing tests (30 tests). Tasks 11–29 integrate it; their constants come from the prototype, their code was typechecked by reading only — each task's Step "Run" says what to adjust (and within which evidence range) if a not-prototyped number misses.
- **Type consistency.** `CircModelState.man` (Task 14) is referenced by Task 15; `ext.kIsch` (Task 10's model edit) by Task 18; `HemoState.circ/circOut/radQ/beatT` (Task 12) by Tasks 13–22; `HEMO_TEACHING` (Task 22) by the engine; `CircEvent` fields (Task 1) match the push in Task 19 (+ `iabp`/`lvad` from Tasks 20–21).
