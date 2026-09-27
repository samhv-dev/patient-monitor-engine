# Stage 7f: Neuromuscular block, anaesthetic depth, respiratory-drive depression and the anaesthetic state — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **R51 fixer pass (2026-09-26):** this plan was rewritten to the 7g/7f/7c drug-layer contract (orchestrator ruling R51 and its addenda 8–11). 7f has NO PK of its own: it reads effect-site concentrations from Stage 7g's `ps.pk.bus`, observes 7g's accepted doses, and owns only the NMB/depth/ventilatory PD, the TOF device and the anaesthetic-state event.
>
> **Re-review fix pass (2026-09-27, R51 addendum 17):** every bus name is now the MERGED 7g code's (`agents[id].{unit, plasma, brain, vent, nmj, dia, cumulativeMgPerKg}`, `volatiles[agent].{fet, brain, macAge, macFrac}`, `doses[] {agent, mgPerKg | null, amount, amountUnit, t}`, `antagonist.opioid`); naloxone is applied to the per-agent opioid sites (F2, decision 20); `stimulus` is 7e's shape, observed (F3, decision 17); a new Task 13 wires 7b's MODELED spontaneous drive with Winter's compensation (F4, decision 18); the NMB bands and fits are re-measured on 7g's PK (F5, F6: rocuronium TOFR 0.9 55–95 min, NEO_G50 0.3, vecuronium EC50 158/γ 4, succinylcholine pre-declared `it.fails` for FU-3 item 1); stale names fixed (F7). **Every code block of Tasks 1–19 was prototyped (the demo typechecked, not screenshotted) on `origin/main` 5670fe5 (7a+7b+7g+7x) merged locally with `origin/stage-7c-blood` and `origin/fu-2-engine-followups`** — the base this stage executes on — and is the file that passed there (numbers in "Prototype"). 20 tasks.

**Goal:** The anaesthesia layer of the whole-body model (R32 sub-stage 7f), built on Stage 7g's PK: effect-site neuromuscular block with a train-of-four picture (count, ratio, post-tetanic count, single twitch) for rocuronium, vecuronium, cisatracurium and succinylcholine (phase I/II, cholinesterase variants through 7g's PK), reversal by sugammadex (7g's plasma + effect-site binding, 7f's bands) and neostigmine (7f's ceiling on 7g's acetylcholine gain), interactions and neuromuscular profiles; a BIS-like depth index from propofol, volatile brain MAC fraction (7g's age-adjusted `macFrac`; opioid-reduced, MAC-awake, MAC-BAR), benzodiazepine, ketamine and opioid terms (naloxone applied), with burst suppression, awareness and emergence; respiratory-drive depression per agent feeding Stage 3's MANUAL spontaneous breathing, and Stage 7b's chemoreflex drive wired for MODELED spontaneous breathing with Winter's compensation from 7c's HCO3; NMB apnoea/weak breaths/cleft and residual-block obstruction; outputs for 7d/7e (`ps.neuro.{antinoc, nmb, thermoDepth}`); a TOF stimulator device; the instructor "anaesthetic state" event; six scenarios; and a `stage7f.html` demo.

**Architecture:** A new `packages/engine-core/src/l2/neuro/**` owns the PD. `bus.ts` is 7f's READER of 7g's `DrugBus` (R51 §1–2): it converts, once, the bus concentrations into 7f's units (ng/mL; age-adjusted MAC fractions), applies naloxone's class multiplier to the per-agent opioid sites, and lists the doses 7g accepted (R51 §3). PD modules are pure functions: `nmb.ts` (Hill block → TOF), `neostigmine.ts` (ceiling on 7g's acetylcholine gain), `interactions.ts`, `depth.ts`, `drive.ts`, `outputs.ts`, and `spont.ts` (MODELED spontaneous breathing: 7b's `drive()`/`pti()`/`stepFatigue()` with Winter's set point). `pipeline.ts` holds `NeuroState`, validates/applies the neuro commands (TOF/depth devices, `airwayDevice`, `neuroProfile`; it OBSERVES 7e's `stimulus` and never consumes a drug or vaporiser event: those are 7g's), and `stepNeuroTo` runs at 10 Hz inside the engine's `advance()` AFTER 7g's `advancePk` and BEFORE Stage 3's respiratory pipeline, publishing `ns.resp` (the drive hook the breath driver reads when it builds a cycle), `ns.outputs` and `ns.{antinoc, nmb, thermoDepth}` (7e), the 1 Hz `anaesthesia` event and, via `tof-device.ts`, `tof` events and the `tofCount/tofRatio/ptc/di/sr/mac/etAa` numerics. All state is plain data (the engine clones it for the 100 ms look-ahead and snapshots it as JSON).

**Tech Stack:** TypeScript 5.9 strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), Vitest 3.2, Vite 6.4, Playwright (system Chrome) for the demo screenshots. No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R32 (7f scope), R37/R39 (evidence policy), R40 (Pulse defects: NMB as a switch, no TOF, no effect site — none may appear here), R44 (tables review is non-blocking: defaults + bands now, calibration at Stage 8), R45 (wiring numbers are targets; add mechanisms, never loosen tests), **R51 + addenda 8–17 (the 7g/7f/7c drug-layer contract — binding; addendum 12: the one `stimulus` shape; addendum 14: canonical names and the chain order; addendum 17: this fix pass)**, G7b ruling 8 (Winter's compensation lands with the MODELED drive wiring in 7f), G7x (the physiology console: organ map and `INTERNAL_PREFIXES`); the merged 7g code (`src/types-pk.ts`, `src/l2/pk/{pipeline,combine,nmb,covariates}.ts`); `docs/plans/stage-7e-endocrine-thermal.md` (its `stimulus` event, its `ps.neuro` reads, `endo.core.out.neuroglycopenia`, `cascade(th).macF`); `docs/physiology/stage-7-parameter-tables.md` §4.6 (drive equation), §5d (all NMB/depth/drive rows), §6.1 (PK rows — implemented by 7g), §6.3 (anaesthetic haemodynamic rows — 7g), §7 check 21 (MH — 7e) and 25 (roc → sugammadex), §9 Q9, Q36, Q48, Q50–Q54, Q57, Q58; `../research/pulse-audit/02-drugs-energy-architecture.md` §2–3 (Pulse's PD channels, used only as the counter-example); `../research/09-evidence-rulings.md` (no 7f row; policy only); house style `docs/plans/stage-3-respiratory-gas.md`; runbook `docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. **Work in the worktree `../scratch/wt-stage-7f` on branch `stage-7f-neuro-depth`** (Task 1 creates both from `origin/main`). **Base: `origin/main` AFTER Stage 7g, 7b, 7c (`stage-7c-blood`) and FU-2 (`fu-2-engine-followups`) have merged.** Task 1 checks for 7g's `src/l2/pk/pipeline.ts` and the merged bus fields in `src/types-pk.ts`, 7b's `src/l2/lung/drive.ts`, 7c's `src/l2/blood/pipeline.ts` and FU-2's `SINUS_FAMILY` (`src/l2/circ/rate-rule.ts`), and STOPS if any is missing — report to the orchestrator; do not start on an older main and never add the missing fields yourself.
- **R51 §7 — merge before every `engine.ts` edit:** run `git fetch origin && git merge origin/main` (resolve, re-run the suite) before each task that edits `packages/engine-core/src/engine.ts` (Tasks 12 and 13), and place 7f's `validate()`/`apply()`/`advance()` inserts by the CHAIN ORDER (R51 addendum 14) **validate/apply: device → 7g pk → 7f neuro → 7d organs → 7c blood → 7e endo → Stage 3 → hemo; advance: 7g pk → 7f neuro → resp/lung → blood → endo → organs → hemo**, re-anchoring on the merged content rather than on the literal find blocks quoted in this plan. Record every re-anchoring in the gate note.
- Every code block from Task 1 on was prototyped on the merged base (see "Prototype"); the time-course bands are still TARGETS (R45): add the mechanism or fit the [ENG] constant this plan names, never widen a band; stop and report if a wiring task moves a Stage 3/7a/7b/7c/7g acceptance number out of its band. Tests this plan PRE-DECLARES as `it.fails` (a 7g PK/PD gap with its measured numbers and a request id) stay `it.fails`; if one starts passing on your branch, report it rather than editing it.
- **Branch and PR (R20/R21):** push the branch after EVERY task commit (`git push origin stage-7f-neuro-depth`); never push to `main`, never merge. The last task opens the PR with `gh pr create`.
- **CI rule:** the CI runner has 2 vCPUs. Any test that runs the engine for more than ~1 sim-minute yields to the event loop once per sim-minute (`await new Promise((r) => setImmediate(r))`, the pattern of `packages/engine-core/test/engine/engine-pipeline.test.ts`) and sets an explicit `{ timeout }`.
- **Partition (R25 spirit).** This stage OWNS `packages/engine-core/src/l2/neuro/**` (incl. `spont.ts`), `src/types-neuro.ts`, `test/l2/neuro/**`, `test/helpers/neuro.ts`, `test/helpers/neuro-bus.ts`, `test/helpers/neuro-nmb.ts`, `test/engine/neuro-*.test.ts`, `test/types-neuro.test.ts`, `packages/skins/test/neuro-tiles.test.ts`, `packages/controller/scenarios/nmb-*.json` + `depth-*.json` (six files), `packages/controller/test/scenario/neuro-scenarios.test.ts`, `apps/demo/{stage7f.html,src/stage7f.ts,scripts/stage7f-shots.mjs}`, `apps/demo/src/physiology-console/organs-neuro.test.ts`, `docs/gates/stage-7f.md`, `docs/gates/stage-7f/*.png`. It MODIFIES, additively and marked `// Stage 7f`: `packages/engine-core/src/types.ts` (import + one line appended after the LAST member of each of `NumericId`, `DeviceAction`, `Command`, `EngineEvent`, and one `PatientProfile` field), `src/engine.ts` (state field, constructor incl. the cholinesterase phenotype for 7g's PK patient, validate/apply after 7g's pk hooks, one call in `advance()` after 7g's block, `neuro`/`hco3` in the `advanceResp` context, flush, restore, fasciculation EMG on the committed state), `src/l2/resp/pipeline.ts` (imports, `RespCtx.neuro?`/`hco3?`, `RespState.spont?`, `driverCtx`, `modeledSpont`, one line in the MANUAL etco2 calibration, the 1 Hz MODELED drive call in `gasStep` — Tasks 12–13), `src/l2/resp/driver.ts` (two optional `DriverCtx` fields, the obstruction/cleft lines in `makeCycle`), `src/index.ts` (one export), `packages/engine-core/vite.config.ts` (one SLOW line), `packages/skins/src/types.ts` (two tile params, one colour key), `packages/skins/src/resolve.ts` (two `TILE_COLOR_KEY` entries), `packages/renderer/src/alarm-view.ts` (two `TILE_NUMERICS` entries), `apps/demo/src/stage4a/screen.ts` (two `SAMPLE` entries), `packages/controller/scenarios/pme-scenario-1.schema.json` (event kinds, device enum, `patient.neuro`, `patient.blood`), `apps/demo/vite.config.ts` (one input), `apps/demo/index.html` (one link), `apps/demo/src/physiology-console/organs.ts` (7x's `INTERNAL_PREFIXES`: one block of neuro machinery paths, its own commit — G7x). **Declared exceptions:** **E-7f-1** (Task 12) — one line in `packages/controller/src/session/controller-session.ts` (the log formatter's `device` case; without it the grown `DeviceAction` union fails the controller typecheck); **E-7f-2** (Task 18) — 7a's `test/engine/circ-sanity-2.test.ts`: its two R23 runs get a supraglottic airway at t = 0 (propofol now obstructs an unprotected natural airway; measured reason in Task 18). It READS, never writes, `ps.pk` (7g), `ps.blood.core.ab.hco3` (7c) and, duck-typed, 7e's `ps.endo` (decision 19). It IMPORTS 7b's pure `l2/lung/drive.ts` (`drive`, `pti`, `stepFatigue`) without editing it. **Never edit** `src/l2/pk/**` and `src/types-pk.ts` (7g's: a missing or differently named bus field is STOP-and-report, R51), `src/l2/lung/**` (7b), `src/l2/blood/**` (7c), `src/l2/circ/**` (7a; the anaesthetic baroreflex blunting is 7g's circulation PD, R51 addendum 8), `src/l2/ecg/**`, `src/l3/alarms/**`, `src/l3/defib-pacer/**`, `docs/physiology/**` (Ali's review documents).
- Strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` (no enums, no parameter properties); `.ts` import extensions; conventional commits; clean-room: every equation cites the tables row / paper it comes from or `[ENG]` with the number it was fitted to. Nothing is borrowed from Pulse (only its PD *defects* are named, as things we do not do) → **no NOTICES rows**.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (every commit block below carries it).
- pnpm is not on PATH: `npx -y pnpm@9.15.9`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`. Full gate: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`.
- Units: every concentration inside `l2/neuro/**` is **ng/mL** (propofol 3 µg/mL = 3000). `bus.ts` converts once at the boundary: 7g's `bus.cns.propCe` is µg/mL; its gamma rows (midazolam, ketamine) are in reference-dose units and become ng/mL-equivalents with two [ENG] factors. Volatile quantities are **age-adjusted MAC fractions** as 7g publishes them in `bus.volatiles[agent]`: `macFrac` is the BRAIN (VRG) fraction (depth, drive, interactions); the END-TIDAL fraction `fet/macAge` is what the gas monitor's `mac` numeric shows (MAC(age) is 7g's). Drug doses, units and the `drug`/`vaporiser` events are 7g's. `stepNeuroTo` takes seconds.
- Rates: `stepNeuroTo` runs on the 0.1 s grid (10 Hz, the same absolute grid as 7g's `advancePk`), reading the bus as `advancePk` left it in the same pass; the `anaesthesia` event at 1 Hz on whole seconds; TOF trains every `intervalS` (default 15 s, 12–60).
- CPU budget: the neuro step (PD + events; the PK is 7g's) ≤ **0.05 ms per 20 ms tick** averaged.

---

## Decisions this plan makes where the spec was silent, inconsistent or unreachable

1. **No PK in 7f; the bus is the interface (R51 §1–2).** 7g owns all PK (`ps.pk`, the `DrugBus`). 7f reads only `ps.pk.bus`, through `src/l2/neuro/bus.ts`, under the names of the MERGED 7g code (`src/types-pk.ts`; verified by Task 1's guard and Task 3's contract test — a renamed field is STOP-and-report, 7f never edits the file):

   ```ts
   // 7g's src/types-pk.ts as merged (read-only for 7f)
   interface BusAgent { unit: string; plasma: number; brain: number; vent?: number; nmj?: number; dia?: number; cumulativeMgPerKg: number; sgxBoundFrac?: number }
   //   concentrations in `unit` (propofol µg/mL; opioids, NMB agents, succinylcholine ng/mL; gamma rows "× ref dose"), net of
   //   sugammadex binding; `vent` = the SEPARATE opioid ventilatory site (remifentanil ke0 0.92/min); nmj/dia = thumb/diaphragm
   interface BusVolatile { fet: number; brain: number; macAge: number; macFrac: number } // % atm; macFrac = BRAIN (VRG) fraction
   interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds } // one advance pass
   interface DrugBus {
     agents: Record<string, BusAgent>;
     volatiles: Partial<Record<'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o', BusVolatile>>;
     doses: DoseLogEntry[];
     antagonist: { opioid: number; benzodiazepine: number }; // EC50 multipliers (1 = none): naloxone, flumazenil
     cns: { propCe; opioidCeRemiEq; macBrain; ketamineCe; benzoCeMidazEq; … }; // opioidCeRemiEq/benzoCeMidazEq already antagonised
     nmb: { achGain: number }; // neostigmine, 1 = none
     …
   }
   // the vaporiser event is 7g's: { kind: 'vaporiser', agent, dialPct, fgfLpm?, n2oFrac? } (R51 §4)
   ```

   Tests that need concentrations construct a bus fixture with 7g's full shapes (`test/helpers/neuro-bus.ts`: `opioid()`, `nmbAgent()`, `vol()`, `dose()` carry `unit`/`plasma`/`fet`/`macAge`/`amount`/`amountUnit`); tests that need a time course drive 7g's REAL pipeline (`createPkState`/`applyPkCommand`/`advancePk`) through `test/helpers/neuro.ts`. 7g's `pkPatientOf` does not map the cholinesterase phenotype: the engine passes `pche: pcheOf(profile)` (Task 12).
2. **Drug events are 7g's; 7f observes (R51 §3).** 7g validates and consumes every library `drug` event and the `vaporiser` event; the chain is device → 7g pk → 7f neuro → 7d → 7c → 7e → Stage 3 (R51 addendum 14). 7f's `validate()` hook returns `null` ("not mine") and its `apply()` hook returns `false` for every drug and vaporiser event; its hooks run AFTER 7g's. 7f takes what it needs from `bus.doses`: succinylcholine → the fasciculation window and, for an MH-susceptible profile, the `mhTrigger` mark. The succinylcholine potassium rise is 7c's; 7f touches no potassium (R51 §6). Neostigmine is 7g's gamma row: 7f reads `bus.nmb.achGain` and applies the ceiling (decision 5).
3. **7f owns the NMB PD; its EC50s are fitted against 7g's PK (R51 §2, §5).** The PK sets are 7g's (`src/l2/pk/nmb.ts`): rocuronium ke0 0.16 (thumb) / 0.26 (diaphragm), Vss 0.26 L/kg; vecuronium ke0 0.10/0.16; cisatracurium 0.08/0.128; succinylcholine hydrolysis CL 0.2 L/kg/min, ke0 0.15/0.24 [ENG, 7g]; cholinesterase `PCHE_CL_MULT` het 0.5 / hom 0.003. EC50/γ: rocuronium 823 / 1424 ng/mL, γ 4.8 (tables §5d, Plaud 1995 [P]); vecuronium **158 / γ 4** [ENG, fitted on 7g's PK: max block 3.03 / T1 25 % 25.2 min]; cisatracurium **230 / γ 6.9** (7g's starting value, meets 2.48 / 42.4 min); succinylcholine 200 / γ 4 (7g's effect-site value). Targets (tables §5d labels): rocuronium 0.6 mg/kg TOF 0 ~1.8 min, T1 25 % ~31 min, **spontaneous TOFR 0.9 55–95 min** (R51 addendum 17: Debaene 2003; label — the old 40–60 caller band was unsourced and wrong); 1.2 mg/kg 1.0 / 67 min (range 38–150); vecuronium max block 3–5, T1 25 % 25–30; cisatracurium max block 2–3, ≈ 45; succinylcholine block ~1 min, T1 10 % 7.1, 90 % 10.9 min; cholinesterase heterozygous ×2, homozygous 4–8 h (Lee 2009). **"Max block" (the labels' onset) = the first second with T1 < 10 % after which T1 falls < 1 point over the next 45 s (three 15 s trains)** [ENG operational rule: a one-compartment effect site keeps creeping toward its nadir for minutes below the stimulator's resolution; T1 ≤ 5 % would put vecuronium at 1.95 min]. **Succinylcholine onset is a 7g PK defect (FU-3 item 1, R51 addendum 17):** 7g's ke0 0.15 puts T1 ≤ 5 % at 0.17 min and T1 10 % at 5.4 min; 7f pre-declares that test `it.fails` with the numbers and never compensates in its EC50. Diaphragm EC50 = thumb × 1.73 (Plaud's 1424/823) for every agent. D-7f-1 (interim rocuronium Vss 0.45) is RETIRED.
4. **TOF count thresholds and the fade law are the tables' rows** (T1 > 3 / 10 / 20 / 25 % for 1–4 twitches [TXT, VERIFY]; TOFR = T1^2.5 [ENG]); succinylcholine phase I has no fade; phase II grows linearly from 3 to 7 mg/kg cumulative [ENG: onset at the brief §4.9 "> 3–5 mg/kg or infusion"; full at 7 mg/kg]; **PTC** follows the tables' "PTC appears when T1 = 0 and B < 0.99 [ENG]": PTC 0 until T1 exceeds 1 % (B < 0.99), then 1–15 linearly up to T1 3 % (the first TOF twitch) [ENG].
5. **Neostigmine** is an EC50 multiplier on the non-depolarisers driven by 7g's acetylcholine gain: `m = 1 + 0.7·x/(x + NEO_G50)`, `x = achGain − 1` [ENG]. The bounded maximum makes the ceiling structural (tables §5d: no reversal from TOF < 2). **NEO_G50 = 0.3** [ENG, fitted on 7g's gain curve within the permitted 0.3–1.2: 0.05 mg/kg at TOF 2 → TOFR 0.9 in 18.3 min (band 8–20, Kirkegaard 2002 median 10–15; 0.6 gave 22.0), ceiling 0.07 mg/kg at PTC → TOFR 0.35 at 10 min]; `NEO_SMAX` 0.7 IS the ceiling and is not fitted. The fade law stays the tables' T1^2.5 (TOFR 0.9 at T1 0.96, 0.7 at 0.87 — both tables rows). Its time course and muscarinic effects are 7g's gamma row (**R-7f-2**).
6. **Fentanyl ventilatory potency (deviation D-7f-3, Q54).** The tables derive fentanyl's ventilatory C50 ≈ 0.6 ng/mL (1.6× remifentanil by EEG potency). With it, fentanyl 1.5 µg/kg alone (Ce 2.3 ng/mL) makes a healthy adult apnoeic, against clinical experience (RR ~8–10). The plan uses 0.55× remifentanil (C50 ≈ 1.7 ng/mL) [ENG] on fentanyl's `vent` site and flags Q54 for Ali. Remifentanil keeps Bouillon's C50 0.92 ng/mL, h 1.25 (on 7g's separate `vent` site, ke0 0.92/min).
7. **Two depression measures, one source.** `opioidDep`/`hypnoticDep` are depression of ventilation at a FIXED PaCO2 (what Stage 7b's chemoreflex equation multiplies: tables §4.6). Stage 3's MANUAL spontaneous breathing has no chemical loop, so it uses the RESTING multiplier `veRest = (1 − dOp²)(1 − dHyp^2.48)(1 − 0.5·dOp·dHyp)`, whose exponents make remifentanil 1 ng/mL −28 % and propofol 1 µg/mL −13 % (Nieuwenhuijs 2003 resting values) while the fixed-CO2 values are −53 % / −44 % (−58 / −44 measured). Pattern: opioid lowers RR, hypnotics lower VT and raise RR (tables §5d). Apnoea when `veRest` < 0.42 (resumes > 0.5) [ENG]. In MODELED mode the chemoreflex loop exists (decision 18): the fixed-CO2 values multiply 7b's drive and the resting fall EMERGES from the rise in PaCO2.
8. **Depth index = the tables' formula, with MAC_DI50 0.876** so 1.0 MAC reads 42 (tables 40–45); N2O weighs 0.1 on the index [TXT "N2O ~0"]; consciousness is a separate hypnotic level (propofol Schnider LOC C50, MAC-awake 0.33 reduced by opioids, midazolam, ketamine) because the index is not consciousness (ketamine: DI 98 while unconscious; awareness under NMB). The displayed index is smoothed (τ 20 s) and shown only when the `depth` device is on. MAC(age) (Mapleson) is 7g's; 7f uses 7g's age-adjusted BRAIN fractions (`bus.volatiles[agent].macFrac`), divided by 7e's hypothermic `macF` when 7e is present (decision 19).
9. **Outputs to other systems.** 7a: NOTHING — the propofol/volatile baroreflex-gain depression lives in 7g's circulation PD only (R51 addendum 8); 7f's former `baroGainMult`/`neuroBaroGain` and its `circ/model.ts` edit are deleted. `mapSetShiftMmHg` is PUBLISHED ONLY (audit A11 forbids drugs moving the baroreflex set point; **Q-7f-1** for Ali). 7d reads `cmro2Mult` (**R-7f-3**). 7e reads `ps.neuro.{antinoc, nmb, thermoDepth}` (R51 §6; the 7e plan's Requests): antinociception 0–1 (the opioid and hypnotic blunting of the noxious response), the peripheral NMB fraction (thumb block; abolishes shivering), and the thermoregulatory depth 0–1.5 (hypnotic MAC-equivalents; Sessler: thresholds fall linearly with concentration [ENG scale]).
10. **Potassium is 7c's (R51 §3, §6).** 7f publishes no potassium and never writes `mods.k` (if it ever needed to, it would push DELTAS, 7c's pattern). The only ECG modifier 7f touches is the fasciculation EMG artefact, saved and restored on the committed state.
11. **MH is 7e's (R51 §6).** 7f detects the exposure — succinylcholine on `bus.doses` or a potent volatile above 0.1 MAC in a profile with `neuro.mhSusceptible` — and emits the `mhTrigger` mark once; it publishes `ps.neuro.thermoDepth` for 7e and issues no condition. The MH crisis is Stage 3's `condition mh`, modelled by 7e; the MH scenario scripts it.
12. **Airway device.** Stage 3 has no tube concept; 7f adds a neuro event `{ kind: 'airwayDevice', device: 'none' | 'ett' | 'sga' }` (default `'auto'`: a tube when the ventilation source is ventilator/external/bvm, else none). Upper-airway obstruction from sedation or residual block acts only with a natural airway: partial obstruction scales VT; ≥ 0.9 makes the cycle an obstructed effort (no flow, chest moves) — the Stage 3 airway command still wins when the instructor sets it.
13. **TOF/depth numerics are device-measured, not truth:** the TOF stimulator reports a train every `intervalS` (default 15 s) with acceleromyography noise (SD 0.02 on the ratio, ratio shown only at count 4, values up to 1.05 as AMG over-recovers) and a `marker` for the train; the depth index is shown with a 20 s smoothing lag and flagged questionable during EMG (stimulus while unparalysed). **`mac` numeric = END-TIDAL MAC** = Σ over agents of 7g's `fet/macAge` (what a gas monitor computes; R51 addendum 17), `etAa` = the dominant potent agent's `fet`; the BRAIN MAC (Σ `macFrac`, what the depth index uses) is shown separately as the `anaesthesia` event's `macBrain` (during wash-in the end-tidal value leads the brain one; on emergence it falls first).
14. **Skins**: `TILE_PARAMS` gains `'NMT'` and `'BFA'` and `COLOR_KEYS` gains `'NMT'` (`'BFA'` already exists); drawing the tiles inside `@pme/renderer` is a follow-up (**request R-7f-6** to the renderer owner): the demo draws its TOF/depth tiles in DOM with the skin colours.
15. **Scope excluded** (R32 also names them for 7f, but this plan's brief does not): sepsis/anaphylaxis/SIRS system conditions (tables §5e; 7e now implements them in `l2/endo/conditions.ts`). **Q-7f-2** for the orchestrator.
16. **Sugammadex binding is 7g's (deviation D-7f-2, R51 §5).** 7g binds free rocuronium/vecuronium 1:1 in plasma (`bindSugammadex`) AND at both effect sites (`bindSugammadexSites`), sugammadex reaching them through its own effect-site ke0 **0.095/0.152 /min** [ENG, 7g's fit]. 7f's reversal bands are measured on that binding with 7f's PD: 2 mg/kg at TOF 2 → TOFR 0.9 in 2.12 min (label 2.2), 4 mg/kg at PTC → 2.23 (IQR 2.1–4.3), 16 mg/kg 3 min after roc 1.2 → T1 10 % in 1.80 (label 1.2, band 0.8–2). The underdose/recurarisation test (0.5 mg/kg at PTC after roc 1.2) reaches only TOFR 0.83 and never falls: pre-declared `it.fails`, **R-7f-7** to 7g (FU-3 list). A miss is never compensated in 7f's EC50s.
17. **`stimulus` is 7e's event; 7f observes it (R51 addenda 12 and 17; closes Q-7f-3).** The one shape is `{ kind: 'stimulus', intensity: 0–2 }` (0 none … 1 incision … 1.5 laryngoscopy/sternotomy … 2 maximal), held until the next `stimulus` event (intensity 0 ends it), declared in `types-neuro.ts` as `StimulusEvent` (7e imports it if 7f merges first — the 7e plan's Task 1 note; if 7e merged first, `types-neuro.ts` imports 7e's instead of declaring it). 7f's `apply()` records it and returns **false** (7e consumes it); 7f maps it to its 0–1 depth stimulus as `min(1, intensity / STIM_FULL)`, `STIM_FULL` 1.5 [ENG: 7e's laryngoscopy = 7f's full stimulus]. **Temporary owner:** if 7f lands before 7e, 7f's validator validates `stimulus` (intensity required, 0–2, 7e's own messages) in ONE block marked `TEMPORARY OWNER` plus one marked test; the 7e executor deletes both (recorded in both briefs). If 7e is already on the base, Task 11 omits them.
18. **MODELED spontaneous breathing = 7b's chemoreflex drive with Winter's compensation (G7b ruling 8, R51 addendum 17; new Task 13).** 7b left `l2/lung/drive.ts` unwired. In MODELED mode with a spontaneous source, `spont.ts` evaluates 7b's `drive()` at 1 Hz on the gas grid (PaCO2 = Stage 3's fast CO2 compartment, PaO2, 7b's `co2Slope`/`pMax` condition multipliers, 7f's `opioidDep`/`hypnoticDep`, fatigue F), with the resting pattern = the instructor's rr/vt targets and the set point `paco2Set = min(paco2Rest, 1.5·HCO3 + 8)` — `paco2Rest` is the PaCO2 the MANUAL etco2 calibration placed, HCO3 is 7c's `blood.core.ab.hco3` (24 without 7c → no shift); Winter's (Albert, Dell & Winters 1967, ±2) acts in metabolic acidosis only (metabolic alkalosis uncompensated in v1). 7f's NMB terms apply on top (VT × `nmbVtMult` × (1 − obstruction), apnoea below 5 % diaphragm strength), and `pti()`/`stepFatigue()` run on the resulting breath (pMax × diaphragm strength × 7b's `pMax`). `driverCtx` then uses the drive's rr/vt instead of target × 7f's MANUAL multipliers. This replaces the old Task 12 Step 5 guesswork. Measured: no drugs → RR 15.2 / PaCO2 38.6 (MANUAL 15.2 / 38.5); profile HCO3 15 → HCO3 13.6, PaCO2 29.4 (Winter's 28.5; the ruling's 30.5 ± 2), VE 9.5 vs 7.6 L/min.
19. **7e seams, duck-typed with neutral fallbacks (F7).** The engine hands `stepNeuroTo` 7e's `endo.core.out.neuroglycopenia` (0–1; fallback 0) — a hypnotic term in `depth()` (`GLYCO_U` 1.2: 1 = unconscious) — and `endo.cascade.macF` (MAC requirement × −5 %/°C below 37; fallback 1): 7f divides the brain MAC fractions by it. `cascade(th)` is a 7e FUNCTION, so the engine can only read it if 7e stores the per-pass result: **request R-7f-8** to 7e (one line in `advanceEndo`: `es.cascade = cascade(th)`); until then the fallback holds.
20. **Naloxone reaches 7f's opioid PD (F2 — a real bug: opioid apnoea was untreatable).** 7g divides every opioid's concentration by `bus.antagonist.opioid` for its own `cns.opioidCeRemiEq` but publishes the per-agent `brain`/`vent` totals raw. `readBus` divides the per-agent remifentanil/fentanyl `brain` and `vent` by the multiplier and computes the other-opioid remainder from 7g's already-antagonised total. Measured on 7g's PK: remifentanil 0.3 µg/kg/min → apnoea; naloxone 0.4 mg → breathing again within 3 min (without the fix: never).

## Prototype (measured 2026-09-27 on the merged base: `origin/main` 5670fe5 = 7a+7b+7g+7x, merged locally with `origin/stage-7c-blood` and `origin/fu-2-engine-followups`; Node 26)

Every code block of Tasks 1–19 below is the file that ran there (the demo was typechecked, not screenshotted). Bands are the tests' (sources in the tests); ✓ met, ✗ pre-declared `it.fails` with a request id.

| Check (70 kg, 170 cm, 40 y, M) | Measured on 7g's PK + 7f's PD | Band (source) |
|---|---|---|
| Rocuronium 0.6 mg/kg | TOF 0 at 1.32 min; T1 25 % 30.0; spontaneous TOFR 0.9 80.7 | 1–2.2 / 26–38 / **55–95** (R51 addendum 17: Debaene 2003; label) ✓ |
| Rocuronium 1.2 mg/kg | TOF 0 at 0.58 min; T1 25 % 62.9 | ≤ 1.2 / 40–90 (label 67, range 38–150) ✓ |
| Vecuronium 0.1 mg/kg (EC50 158, γ 4 fitted) | max block 3.03 min; T1 25 % 25.2 | label 3–5 / 25–30; test 2.5–5 / 24–32 ✓ |
| Cisatracurium 0.15 mg/kg (230, γ 6.9) | max block 2.48; T1 25 % 42.4 | label 2–3 / ≈ 45; test 2–3.5 / 40–50 ✓ |
| Succinylcholine 1 mg/kg (200, γ 4) | T1 ≤ 5 % at **0.17** min; T1 10 % **5.37**; T1 90 % **12.68**; no fade ✓ | ~1 (0.6–1.4) / 7.1 (6–8.5) / 10.9 (9.5–12.5) ✗ **FU-3 item 1** (7g ke0 0.15) — `it.fails` |
| Succinylcholine, cholinesterase het / hom | T1 90 % 17.4 min / 6.09 h | 14–25 min / 4–8 h ✓ |
| Sugammadex 2 mg/kg at TOF 2; 4 at PTC; 16 after roc 1.2 | TOFR 0.9 2.12 / 2.23 min; T1 10 % 1.80 min | 1.5–3 / 2.1–4.3 / 0.8–2 ✓ |
| Sugammadex 0.5 mg/kg at PTC after roc 1.2 | TOFR peaks 0.83 at +90 min, never falls (0.75 mg/kg: 0.997 → 0.42; 1 mg/kg: 1.0 → 0.70) | recovery > 0.95 then fall ≥ 0.04 ✗ **R-7f-7** — `it.fails` |
| Neostigmine 0.05 mg/kg at TOF 2 (NEO_G50 0.3) | TOFR 0.9 in 18.3 min (0.6 gave 22.0; spontaneous from TOF 2 ≈ 55) | 8–20, ≥ 5 min faster ✓ |
| Neostigmine 0.07 mg/kg at PTC | TOFR 0.35 at 10 min | < 0.9 (ceiling) ✓ |
| Interactions on the rocuronium course | 1 MAC ×1.42; 34 °C ×1.86; myasthenia ×3.71; burn ×2.5 EC50: no complete block | 1.2–1.45 / > 1.3 / > 1.8 / none ✓ |
| Depth PD (unchanged formulas) | propofol Ce 3 / 4 µg/mL (35 y) DI 48 / 38; 1 MAC 42; remifentanil 4 ng/mL 92; ketamine 98 unconscious | 44–50 / 35–40 / 40–45 / > 90 / > 93 ✓ |
| Engine: sevoflurane dial **2.5 %** FGF 6, 30 min | end-tidal MAC 1.00 → displayed DI 44.0; off → emergence 7.0 min | input 0.9–1.1; DI 38–48; 5–12 [ENG] ✓ |
| Engine: propofol 2 mg/kg | DI nadir 46, unconscious; MAP 94.6 → 85.4 (0.903 = 7g's NR-7g-1) | DI 38–52 ✓; MAP moved (the 60–80 % band is 7g's, open) |
| Engine: remifentanil 1 µg/kg + 0.4 µg/kg/min (MANUAL) | apnoea mark, no breaths; off → breathing, > 40 breaths in 5 min | ✓ |
| Engine: naloxone 0.4 mg on remifentanil 0.3 µg/kg/min (F2) | breathing mark < 3 min after the dose; > 10 breaths in the last 2 min (without F2: never) | < 3 min ✓ |
| Engine: residual block at 32–35 min, natural airway | VT 100 vs 500 mL (×0.20) | < 0.75 × control ✓ |
| Engine: sevoflurane ≈ 1 MAC reflex blunting (phenylephrine 100 µg) | HR drop 25.4 bpm vs 11.9 awake (ΔHR/ΔMAP 1.9 vs 0.63; baseline HR 93 vs 73) | anaesthetised < 0.8 × awake ✗ **R-7f-9** (7g circulation PD) — `it.fails` |
| MODELED drive, no drugs | RR 15.2, PaCO2 38.6 (MANUAL 15.2 / 38.5) | RR ±10 %, PaCO2 ±2 ✓ |
| MODELED drive, profile HCO3 15 (7c) | HCO3 13.6 → PaCO2 29.4 (Winter's 28.5); VE 9.5 vs 7.6 L/min; RR 17.0 vs 15.2 | Winter's ± 2; 30.5 ± 2; VE > 1.2× ✓ |
| MODELED drive + remifentanil 1 µg/kg + 0.3 µg/kg/min | RR 4.0 vs 15.0 (PaCO2 50.6) | < 0.6 × control ✓ |
| MODELED acidosis + remifentanil 0.1 µg/kg/min | PaCO2 38.4 vs 29.5 | > +3 ✓ |
| Neuro step CPU (every agent on the bus) | 0.0003 ms per 20 ms tick | ≤ 0.05 ✓ |
| Suites | engine-core fast set 211 files / 926 passed + 1 skipped; slow set 27 files / 115 passed + 1 sibling flip fixed by E-7f-2 (Task 18; then 6/6), neuro-longrun 24 h 175 s; skins 169, renderer 67, controller 203, demo console 116; `pnpm -r typecheck` clean | green |

## File structure

| File | Responsibility |
|---|---|
| `packages/engine-core/src/types-neuro.ts` | public types: `StimulusEvent` (7e's shape), `NeuroClinicalEvent` (`stimulus`, `airwayDevice`, `neuroProfile`), `NeuroDeviceAction`, `NeuroEvent` (`anaesthesia`, `tof`, `neuroMark`), `NeuroNumericId`, `NeuroProfile` |
| `…/src/l2/neuro/bus.ts` | 7f's reader of 7g's `DrugBus` (R51): `readBus` (naloxone applied), `newDoses`, `pcheOf`, agent/volatile ids, unit factors, fentanyl potencies |
| `…/src/l2/neuro/nmb.ts` | Hill block per site, TOF reading, PTC, phase II (EC50/γ fitted to 7g's PK) |
| `…/src/l2/neuro/neostigmine.ts` | EC50 shift with ceiling from 7g's acetylcholine gain |
| `…/src/l2/neuro/interactions.ts` | EC50 multipliers: volatiles, Mg, hypothermia, profiles |
| `…/src/l2/neuro/depth.ts` | depth index, consciousness, stress, antinociception, movement |
| `…/src/l2/neuro/drive.ts` | ventilatory depression, NMB breathing, obstruction, cleft |
| `…/src/l2/neuro/outputs.ts` | outputs for 7d/7e (CMRO2, antinociception, NMB fraction, thermoregulatory depth), published-only MAP shift and pupil |
| `…/src/l2/neuro/tof-device.ts` | TOF stimulator device (trains, PTC, noise, events, numerics) |
| `…/src/l2/neuro/pipeline.ts` | `NeuroState`, commands, dose and stimulus observation, `stepNeuroTo`, events, resp hook |
| `…/src/l2/neuro/spont.ts` | MODELED spontaneous breathing: 7b's `drive()`/`pti()`/`stepFatigue()` with Winter's set point (Task 13) |
| `packages/engine-core/test/helpers/neuro-bus.ts` | `busFixture()` — a 7g `DrugBus` with chosen fields set; `opioid()`, `nmbAgent()`, `vol()`, `dose()` in 7g's full shapes |
| `packages/engine-core/test/helpers/neuro.ts` | rig over 7g's REAL pipeline (time-course tests) |
| `packages/engine-core/test/helpers/neuro-nmb.ts` | TOF reading on the rig; `t1Course`, `onsetMin` (max block), `recoveryMin` |
| `packages/engine-core/test/l2/neuro/*.test.ts`, `test/engine/neuro-*.test.ts`, `test/types-neuro.test.ts` | tests |
| `packages/skins/test/neuro-tiles.test.ts` | tile params and colour key |
| `packages/controller/scenarios/{nmb-residual-block,nmb-sux-burn,depth-light-anaesthesia,depth-awareness,depth-opioid-apnoea,nmb-mh-trigger}.json`, `packages/controller/test/scenario/neuro-scenarios.test.ts` | scenario events and their test |
| `apps/demo/stage7f.html`, `apps/demo/src/stage7f.ts`, `apps/demo/scripts/stage7f-shots.mjs` | demo + screenshots |
| `apps/demo/src/physiology-console/organs.ts` (one block), `…/organs-neuro.test.ts` | 7x console: neuro machinery marked internal (G7x) |
| `docs/gates/stage-7f.md` | gate note |

```
engine.advance(ps, end)                                    (the private method that runs every sub-pipeline)
  ├─ advancePk(ps.pk, …) + circ.ext.drug + rhythm hook    ← Stage 7g (+ FU-2): PK, 7g's circulation PD, ps.pk.bus
  ├─ stepNeuroTo(ps.neuro, t, env, ps.pk.bus)             ← Stage 7f, 10 Hz: doses → bus → NMB/TOF → depth → drive → outputs → events
  │                                                          env: tempC, mechanical, 7e's neuroglycopenia / cascade.macF (duck-typed)
  ├─ advanceResp(ps.resp, { …, neuro: ps.neuro.resp, hco3 }) ← MANUAL: driverCtx rr×rrMult, vt×vtMult, apnoea, obstruction, cleft
  │                                                          MODELED spontaneous: spont.ts (7b drive + Winter's) sets rr/vt at 1 Hz
  ├─ advanceBlood(ps.blood, …)                            ← Stage 7c (publishes blood.core.ab.hco3, read next pass)
  └─ advanceHemo(ps.hemo, …)                              ← 7a reads 7g's DrugEffect; 7f adds nothing to 7a (R51 addendum 8)
validate/apply chain: device → 7g pk → 7f neuro → 7d → 7c → 7e → Stage 3 → hemo (R51 addendum 14)
tickOnce: flush(neuro.out) → events; fasciculation EMG artefact on the committed state
```

---

## Tasks

### Task 1: Worktree, base check, public types

**Files:**
- Create: `packages/engine-core/src/types-neuro.ts`, `packages/engine-core/test/types-neuro.test.ts`
- Modify: `packages/engine-core/src/types.ts` (one import + five one-line additions, each marked `// Stage 7f`), `packages/engine-core/src/index.ts` (one export line)

**Interfaces:**
- Consumes: 7g's `src/types-pk.ts` (only through `bus.ts`); 7e's `StimulusEvent` if 7e merged first (decision 17). `types-neuro.ts` imports types that Tasks 2, 6 and 9 create: to keep this task compiling on its own, Step 4 creates those three files first as the exact files of Tasks 2, 6 and 9 — copy them from those tasks now; their tests arrive with their own tasks.
- Produces: `NeuroProfile { nm?; cholinesterase?; mhSusceptible?; mgMmolL? }`, `StimulusEvent = { kind: 'stimulus'; intensity: number }` (7e's shape, decision 17), `NeuroClinicalEvent` (`StimulusEvent` | `airwayDevice` | `neuroProfile` — no drug and no volatile/vaporiser event: those are 7g's, R51 §3–4), `NeuroDeviceAction` (`tof` start/stop/train/ptc + intervalS; `depth` on/off), `NeuroNumericId` (`tofCount | tofRatio | ptc | di | sr | mac | etAa`), `NeuroMarkKind`, `NeuroEvent` (`anaesthesia` with `mac` end-tidal / `macBrain` / `block: { thumb, dia }`, `tof`, `neuroMark`), `NeuroCommandBody`. `NumericId`, `DeviceAction`, `Command`, `EngineEvent`, `PatientProfile.neuro` gain them.

- [x] **Step 1: Worktree, branch and base check**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-7f -b stage-7f-neuro-depth origin/main
cd ../scratch/wt-stage-7f
E=packages/engine-core/src
test -f $E/l2/pk/pipeline.ts && test -f $E/types-pk.ts && test -f $E/l2/lung/drive.ts && test -f $E/l2/blood/pipeline.ts && grep -q 'SINUS_FAMILY' $E/l2/circ/rate-rule.ts && echo BASE-OK || echo "STOP: 7g, 7b, 7c and/or FU-2 not merged on origin/main — report to the orchestrator"
grep -q 'cumulativeMgPerKg' $E/types-pk.ts && grep -Eq '\bvent\?: number' $E/types-pk.ts && grep -Eq '\bdia\?: number' $E/types-pk.ts && grep -Eq '\bvolatiles: ' $E/types-pk.ts && grep -Eq 'interface BusVolatile \{ fet: number; brain: number; macAge: number; macFrac: number \}' $E/types-pk.ts && grep -Eq 'mgPerKg: number \| null; amount: number; amountUnit: string' $E/types-pk.ts && grep -Eq 'antagonist: \{ opioid: number' $E/types-pk.ts && grep -q "'n2o'" $E/types-pk.ts && grep -q 'export function bindSugammadexSites' $E/l2/pk/nmb.ts && echo BUS-OK || echo "STOP: 7g's DrugBus differs from decision 1 (agents[].{vent,dia,cumulativeMgPerKg}, volatiles{fet,brain,macAge,macFrac}, doses{mgPerKg|null,amount,amountUnit}, antagonist.opioid, n2o) — report the names to the orchestrator"
grep -q 'hco3' $E/l2/blood/acid-base.ts && grep -q 'export function drive(' $E/l2/lung/drive.ts && echo SEAMS-OK || echo "STOP: 7c's blood.core.ab.hco3 or 7b's drive() is missing"
test -f $E/l2/endo/pipeline.ts && echo "7e ALREADY MERGED: omit the TEMPORARY OWNER stimulus block and its test (Task 11), import StimulusEvent from types-endo.ts (Step 4)" || echo "7e not merged: 7f is the temporary owner of stimulus validation (decision 17)"
npx -y pnpm@9.15.9 install
```
Expected: `BASE-OK`, `BUS-OK`, `SEAMS-OK` and one of the two 7e lines. If any says STOP: do not continue, and do not add the fields yourself (R51: `types-pk.ts` is 7g's). If the fields exist under DIFFERENT names than decision 1 lists, also STOP and report the names (the orchestrator decides which plan renames). (If the branch already exists on origin: `git worktree add ../scratch/wt-stage-7f stage-7f-neuro-depth`.)

- [x] **Step 2: Write the failing test** `packages/engine-core/test/types-neuro.test.ts`

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Command, EngineEvent, NumericId, PatientProfile } from '../src/types.ts';
import type { NeuroClinicalEvent, NeuroEvent, StimulusEvent } from '../src/types-neuro.ts';

describe('Stage 7f public types', () => {
  it('commands, events, numerics and the profile accept the neuro members; drug/vaporiser events stay 7g\'s', () => {
    const c: Command = { id: '1', issuedBy: 't', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'none' } };
    const s: Command = { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'stimulus', intensity: 1.5 } };
    const d: Command = { id: '2', issuedBy: 't', type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } };
    const n: NumericId[] = ['tofCount', 'tofRatio', 'ptc', 'di', 'sr', 'mac', 'etAa'];
    const p: PatientProfile = { neuro: { nm: 'myasthenia', cholinesterase: 'heterozygous', mhSusceptible: true, mgMmolL: 1.2 } };
    const e: EngineEvent = { type: 'neuroMark', t: 1, kind: 'awareness' };
    expect([c.type, s.type, d.type, n.length, p.neuro?.nm, e.type]).toEqual(['applyEvent', 'applyEvent', 'device', 7, 'myasthenia', 'neuroMark']);
    expectTypeOf<Extract<NeuroEvent, { type: 'tof' }>['ratio']>().toEqualTypeOf<number | null>();
    expectTypeOf<Extract<NeuroEvent, { type: 'anaesthesia' }>['block']>().toEqualTypeOf<{ thumb: number; dia: number }>();
    expectTypeOf<NeuroClinicalEvent['kind']>().toEqualTypeOf<'stimulus' | 'airwayDevice' | 'neuroProfile'>();
    expectTypeOf<StimulusEvent>().toEqualTypeOf<{ kind: 'stimulus'; intensity: number }>(); // 7e's shape (R51 addenda 12, 17)
  });
});
```

- [x] **Step 3: Run it; expect FAIL** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-neuro.test.ts` → "Failed to resolve import ../src/types-neuro.ts".

- [x] **Step 4: Implement.** First create `src/l2/neuro/bus.ts` (Task 2 Step 3, verbatim), `src/l2/neuro/interactions.ts` (Task 6 Step 3, verbatim) and `src/l2/neuro/outputs.ts` (Task 9 Step 3, verbatim). Then create `packages/engine-core/src/types-neuro.ts` (if Step 1 printed "7E ALREADY MERGED": replace the `StimulusEvent` declaration with `import type { StimulusEvent } from './types-endo.ts';` + `export type { StimulusEvent };`, keep the rest):

```ts
// Stage 7f public types (R32: neuromuscular block, anaesthetic depth, respiratory-drive depression), in their own file
// so parallel stages do not collide in types.ts; types.ts adds each to its union with one line marked `// Stage 7f`.
// The `drug` and `vaporiser` events are Stage 7g's (types-pk.ts; R51 §3–4): 7f declares none and consumes none.
import type { SimSeconds } from './types.ts';
import type { NeuroAgentId, VolatileId } from './l2/neuro/bus.ts';
import type { NeuroOutputs } from './l2/neuro/outputs.ts';
import type { NmProfile } from './l2/neuro/interactions.ts';

export type { NeuroOutputs, NmProfile };

/** Patient-profile additions (brief §7.4 `patient`), all optional. */
export interface NeuroProfile {
  nm?: NmProfile;
  /** Plasma cholinesterase phenotype; the engine hands it to 7g's PK patient as `pche` (R51 addendum 10). */
  cholinesterase?: 'normal' | 'heterozygous' | 'homozygous';
  mhSusceptible?: boolean;
  /** Plasma magnesium, mmol/L (default 0.9); 7c supplies it when it lands. */
  mgMmolL?: number;
}

/**
 * The ONE `stimulus` shape (R51 addenda 12 and 17): Stage 7e's — nociception 0 none … 1 incision … 1.5
 * laryngoscopy/sternotomy … 2 maximal; it holds until the next `stimulus` event (intensity 0 ends it). 7e consumes it
 * (stress hormones); 7f OBSERVES it (apply returns false) for its antinociception/movement/EMG terms. If 7e's
 * types-endo.ts lands after this file, 7e imports this type instead of declaring its own (the 7e plan's Task 1 note).
 */
export type StimulusEvent = { kind: 'stimulus'; intensity: number };

/** Brief §7.2 ClinicalEvent members Stage 7f validates (`stimulus` only until 7e lands: decision 17). */
export type NeuroClinicalEvent =
  | StimulusEvent
  | { kind: 'airwayDevice'; device: 'none' | 'ett' | 'sga' }
  | ({ kind: 'neuroProfile' } & NeuroProfile);

/** TOF stimulator and depth-monitor device actions (plan decision 13). */
export type NeuroDeviceAction =
  | { device: 'tof'; action: 'start' | 'stop' | 'train' | 'ptc'; intervalS?: number }
  | { device: 'depth'; action: 'on' | 'off' };

export type NeuroNumericId = 'tofCount' | 'tofRatio' | 'ptc' | 'di' | 'sr' | 'mac' | 'etAa';

export type NeuroMarkKind =
  | 'fasciculation' | 'movement' | 'awareness' | 'emergence' | 'lossOfConsciousness'
  | 'apnoea' | 'breathing' | 'recurarisation' | 'mhTrigger';

export type NeuroEvent =
  /**
   * 1 Hz instructor "anaesthetic state" (truth, not measured). Concentrations in ng/mL (propofol too), read from 7g's
   * bus. `mac` = END-TIDAL MAC fraction (Σ fet/macAge, what the gas monitor shows); `macBrain` = the BRAIN fraction
   * (Σ 7g's macFrac, what the depth index uses); `macEff` = brain MAC after opioid reduction.
   */
  | {
      type: 'anaesthesia'; t: SimSeconds;
      di: number; sr: number; mac: number; macBrain: number; macEff: number; etPct: Partial<Record<VolatileId, number>>;
      ce: Partial<Record<NeuroAgentId, number>>;
      tof: { count: number; ratio: number; ptc: number; t1: number };
      block: { thumb: number; dia: number };
      drive: { opioidDep: number; hypnoticDep: number; veRest: number; apnoea: boolean; obstruction: number };
      conscious: boolean; awarenessRisk: boolean; stress: number; movement: boolean;
      outputs: NeuroOutputs;
    }
  /** One stimulator train (measured): the "marker" of the train, time-stamped at the stimulus. */
  | { type: 'tof'; t: SimSeconds; mode: 'tof' | 'ptc'; count: number; ratio: number | null; ptc: number | null; twitches: number[] }
  | { type: 'neuroMark'; t: SimSeconds; kind: NeuroMarkKind };

export type NeuroCommandBody =
  | { type: 'applyEvent'; event: NeuroClinicalEvent }
  | { type: 'device'; action: NeuroDeviceAction };
```

Then in `packages/engine-core/src/types.ts` — each union gains ONE line appended after its LAST member, whatever that member is on your base (the anchors quoted are the merged base's last members as of 5670fe5 + 7c + FU-2; if another stage appended after them, append after that one instead):
- after the LAST `import type … from './types-….ts'; // Stage …` line (on the prototype base: `import type { TruthEvent } from './types-truth.ts'; // Stage 7x`) add
  `import type { NeuroCommandBody, NeuroDeviceAction, NeuroEvent, NeuroNumericId, NeuroProfile } from './types-neuro.ts'; // Stage 7f`
- `NumericId`: its last line ends `| 'tempCore' | 'tempSite' | 'stII' | 'qtc';` — drop the `;` and add a new line `  | NeuroNumericId; // Stage 7f`
- `PatientProfile`: after its last field (prototype base: `lungConditions?: LungConditionSpec[]; // Stage 7b: catalogue conditions on the patient (R36)`) add `  neuro?: NeuroProfile; // Stage 7f: neuromuscular profile, cholinesterase, MH susceptibility, Mg`
- `DeviceAction`: its last member (prototype base: `  | CircDeviceAction; // Stage 7a`) loses its `;` and is followed by `  | NeuroDeviceAction; // Stage 7f`
- `Command`: after its last body member (prototype base: `    | LungCommandBody // Stage 7b (types-lung.ts)`) add `    | NeuroCommandBody // Stage 7f (types-neuro.ts)`
- `EngineEvent`: its last member (prototype base: `  | BloodEvent; // Stage 7c (types-blood.ts)`) loses its `;` and is followed by `  | NeuroEvent; // Stage 7f (types-neuro.ts)`

In `packages/engine-core/src/index.ts`, after the last `export type * from './types-…'` line (prototype base: `export type * from './types-truth.ts'; // Stage 7x`) add: `export type * from './types-neuro.ts'; // Stage 7f`.

- [x] **Step 5: Run the test and typecheck; expect PASS** — the test above, then `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck` (no errors; the engine's `validate()` still rejects the new device actions until Task 12, which is fine). If `export type *` reports a duplicate export name against another stage's types file, rename the clashing 7f type with a `Neuro` prefix in `types-neuro.ts` and its test — never rename the other stage's.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/types-neuro.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/src/l2/neuro/bus.ts packages/engine-core/src/l2/neuro/interactions.ts packages/engine-core/src/l2/neuro/outputs.ts packages/engine-core/test/types-neuro.test.ts
git commit -m "feat(neuro): Stage 7f public types — TOF/depth devices, stimulus/airway/profile events, numerics (R32, R51)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin stage-7f-neuro-depth
```

---

### Task 2: The 7g bus reader (`bus.ts`, R51)

**Files:**
- Create (`bus.ts` already created in Task 1 Step 4; this task adds its tests): `packages/engine-core/src/l2/neuro/bus.ts`, `packages/engine-core/test/helpers/neuro-bus.ts`, `packages/engine-core/test/l2/neuro/bus.test.ts`

**Interfaces:**
- Consumes: 7g's `DrugBus`, `DRUG_BUS_NEUTRAL` (`src/types-pk.ts`) as merged (decision 1).
- Produces: `NmbAgent`, `NMB_AGENTS`, `VolatileId` (`'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o'`), `VOLATILE_IDS`, `NeuroAgentId`, `FENT_EEG_POT` 1.6, `FENT_VENT_POT` 0.55 (D-7f-3), `MIDAZ_NG_PER_REF` 100, `KET_NG_PER_REF` 1500, `NeuroInputs { brain; vent; nmj; dia; suxCumMgPerKg; macPotent; macN2o; macEt; et: {fet, macAge}; achGain; opioidAntag }`, `readBus(bus)` (naloxone applied to the per-agent opioid sites, decision 20), `newDoses(bus, seenT)`, `pcheOf(profile)`; test helpers `busFixture(patch)` (patch keys `cns`, `nmb`, `antagonist`, `agents`, `doses`, `volatiles`), `opioid(brain, vent)`, `nmbAgent(nmj, dia, cumMgPerKg)`, `vol(macFrac, macAge)`, `dose(agent, mgPerKg, t)`.

- [x] **Step 1: Write the test helper and the failing test.** `packages/engine-core/test/helpers/neuro-bus.ts` (exact):

```ts
// Stage 7f: a 7g DrugBus with chosen fields set (R51: tests that need concentrations build the bus directly). Every
// fixture carries 7g's full shapes (BusAgent `unit`/`plasma`, BusVolatile `fet`/`brain`/`macAge`/`macFrac`,
// DoseLogEntry `amount`/`amountUnit`), so a renamed 7g field fails the typecheck here first.
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../src/types-pk.ts';

export interface BusPatch {
  cns?: Partial<DrugBus['cns']>;
  nmb?: Partial<DrugBus['nmb']>;
  antagonist?: Partial<DrugBus['antagonist']>;
  agents?: DrugBus['agents'];
  doses?: DrugBus['doses'];
  volatiles?: DrugBus['volatiles'];
}

export function busFixture(p: BusPatch = {}): DrugBus {
  const b = structuredClone(DRUG_BUS_NEUTRAL);
  Object.assign(b.cns, p.cns ?? {});
  Object.assign(b.nmb, p.nmb ?? {});
  Object.assign(b.antagonist, p.antagonist ?? {});
  b.agents = { ...b.agents, ...(p.agents ?? {}) };
  b.doses = [...b.doses, ...(p.doses ?? [])];
  b.volatiles = { ...b.volatiles, ...(p.volatiles ?? {}) };
  return b;
}

/** An opioid bus entry (ng/mL): brain and ventilatory sites. */
export const opioid = (brain: number, vent: number) => ({ unit: 'ng/mL', plasma: brain, brain, vent, cumulativeMgPerKg: 0 });
/** An NMB bus entry (ng/mL): thumb and diaphragm sites. */
export const nmbAgent = (nmj: number, dia: number, cumulativeMgPerKg: number) => ({ unit: 'ng/mL', plasma: nmj, brain: nmj, nmj, dia, cumulativeMgPerKg });
/** A volatile bus entry at steady state: end-tidal = brain tension; `macAge` % atm (sevoflurane 1.8 at 40 y, N2O 104). */
export const vol = (macFrac: number, macAge: number) => ({ fet: macFrac * macAge, brain: macFrac * macAge, macAge, macFrac });
/** A dose-log entry as 7g writes it (a µg row: amount in µg). */
export const dose = (agent: string, mgPerKg: number, t: number, weightKg = 70) => ({ agent, mgPerKg, amount: mgPerKg * weightKg * 1000, amountUnit: 'mcg', t });
```

`packages/engine-core/test/l2/neuro/bus.test.ts` (exact):

```ts
import { describe, expect, it } from 'vitest';
import { FENT_EEG_POT, FENT_VENT_POT, KET_NG_PER_REF, MIDAZ_NG_PER_REF, newDoses, pcheOf, readBus } from '../../../src/l2/neuro/bus.ts';
import { busFixture, dose, nmbAgent, opioid, vol } from '../../helpers/neuro-bus.ts';

describe('7f reads 7g\'s DrugBus (R51)', () => {
  it('the neutral bus reads as no drug', () => {
    const x = readBus(busFixture());
    expect(x.brain).toEqual({ propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 });
    expect(x.vent.opioid).toBe(0);
    expect(x.nmj.rocuronium).toBe(0);
    expect([x.macPotent, x.macN2o, x.macEt, x.suxCumMgPerKg, x.achGain, x.opioidAntag]).toEqual([0, 0, 0, 0, 1, 1]);
  });
  it('units: propofol µg/mL → ng/mL; gamma rows (midazolam, ketamine) → ng/mL-equivalents', () => {
    const x = readBus(busFixture({ cns: { propCe: 3, benzoCeMidazEq: 1, ketamineCe: 0.5 } }));
    expect(x.brain.propofol).toBe(3000);
    expect(x.brain.midazolam).toBe(MIDAZ_NG_PER_REF);
    expect(x.brain.ketamine).toBe(0.5 * KET_NG_PER_REF);
    expect(x.vent.propofol).toBe(3000);
  });
  it('opioids: brain from the per-agent sites, other opioids as remifentanil-equivalents; the ventilatory site is separate', () => {
    const x = readBus(busFixture({
      cns: { opioidCeRemiEq: 2 + FENT_EEG_POT * 1 + 1.2 },
      agents: { remifentanil: opioid(2, 2.5), fentanyl: opioid(1, 1.1) },
    }));
    expect(x.brain.remifentanil).toBeCloseTo(3.2, 9);
    expect(x.brain.fentanyl).toBe(1);
    expect(x.vent.opioid).toBeCloseTo(2.5 + FENT_VENT_POT * 1.1 + 1.2, 9);
  });
  it('naloxone (F2): 7g\'s antagonist multiplier divides the per-agent opioid sites; the remainder uses 7g\'s antagonised total', () => {
    // 7g's cns.opioidCeRemiEq is already divided by the multiplier (combine.ts); its per-agent totals are not
    const x = readBus(busFixture({ antagonist: { opioid: 8 }, cns: { opioidCeRemiEq: 8 / 8 }, agents: { remifentanil: opioid(8, 10) } }));
    expect(x.opioidAntag).toBe(8);
    expect(x.brain.remifentanil).toBeCloseTo(1, 9);
    expect(x.vent.opioid).toBeCloseTo(10 / 8, 9);
  });
  it('NMB sites (nmj, dia), the succinylcholine cumulative dose and the neostigmine gain', () => {
    const x = readBus(busFixture({
      nmb: { achGain: 2.5 },
      agents: { rocuronium: nmbAgent(900, 700, 0.6), succinylcholine: nmbAgent(10, 12, 4) },
    }));
    expect(x.nmj.rocuronium).toBe(900);
    expect(x.dia.rocuronium).toBe(700);
    expect(x.suxCumMgPerKg).toBe(4);
    expect(x.achGain).toBe(2.5);
  });
  it('volatiles incl. N2O (R51 addendum 9): brain MAC from each agent\'s macFrac; end-tidal MAC = Σ fet/macAge', () => {
    const x = readBus(busFixture({
      volatiles: { sevoflurane: { fet: 1.8, brain: 1.44, macAge: 1.8, macFrac: 0.8 }, n2o: vol(0.4, 104) },
    }));
    expect(x.macPotent).toBeCloseTo(0.8, 9);
    expect(x.macN2o).toBeCloseTo(0.4, 9);
    expect(x.macEt).toBeCloseTo(1 + 0.4, 9);
    expect(x.et.n2o?.fet).toBeCloseTo(41.6, 9);
  });
  it('doses are observed once each; the cholinesterase phenotype maps to 7g\'s patient field', () => {
    const bus = busFixture({ doses: [dose('succinylcholine', 1, 10)] });
    const a = newDoses(bus, -1);
    expect(a.doses).toHaveLength(1);
    expect(newDoses(bus, a.seenT).doses).toHaveLength(0);
    expect([pcheOf(undefined), pcheOf({ neuro: { cholinesterase: 'heterozygous' } }), pcheOf({ neuro: { cholinesterase: 'homozygous' } })]).toEqual(['normal', 'het', 'hom']);
  });
});
```

- [x] **Step 2: Run; expect PASS** (the module exists since Task 1): `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/bus.test.ts` → 7 passed. A type error on `DrugBus['agents' | 'doses' | 'volatiles' | 'antagonist']` or on a helper's shape means 7g's bus differs from decision 1: STOP and report (Task 1 Step 1 should have caught it). The module's content, for reference and for Task 1 Step 4:

- [x] **Step 3: `packages/engine-core/src/l2/neuro/bus.ts`** (exact content)

```ts
// Stage 7f's READER of Stage 7g's DrugBus (R51 §1–2). 7f has NO PK: every concentration it uses comes from
// `ps.pk.bus` and is converted here, once, into 7f's units (ng/mL; age-adjusted MAC fractions). Pure functions.
// Field provenance — 7g's `src/types-pk.ts` as merged (7f never edits it; a renamed field is STOP-and-report):
//   bus.agents[id]: BusAgent = { unit, plasma, brain, vent?, nmj?, dia?, cumulativeMgPerKg, sgxBoundFrac? } in the
//     row's `unit` (propofol µg/mL; opioids, NMB agents and succinylcholine ng/mL; gamma rows "× ref dose"); totals net
//     of sugammadex binding; `vent` = the SEPARATE opioid ventilatory site (remifentanil ke0 0.92/min, R51 §2);
//     `nmj`/`dia` = adductor pollicis / diaphragm–larynx;
//   bus.volatiles[agent]: BusVolatile = { fet, brain, macAge, macFrac } for sevoflurane/isoflurane/desflurane AND n2o
//     (addendum 9): `fet` end-tidal % atm, `brain` VRG tension %, `macAge` MAC(age) %, `macFrac` = BRAIN (VRG) MAC fraction;
//   bus.doses: DoseLogEntry[] = { agent, mgPerKg | null, amount, amountUnit, t } — the boluses 7g accepted, listed for
//     exactly one engine advance pass (R51 §3: 7f observes, never consumes);
//   bus.antagonist.opioid: naloxone's EC50 multiplier on the opioid class (1 = none). 7g applies it to its own
//     `cns.opioidCeRemiEq` but NOT to the per-agent `brain`/`vent` totals, so this reader divides them by it (F2);
//   bus.cns.propCe (µg/mL), bus.cns.opioidCeRemiEq (ng/mL remifentanil-eq at EEG potency, antagonist applied:
//     fentanyl ×1.6, sufentanil ×12, morphine ×1.5), bus.cns.benzoCeMidazEq / bus.cns.ketamineCe (gamma rows,
//     reference-dose units; flumazenil already applied), bus.nmb.achGain (neostigmine, 1 = none).
import type { PatientProfile } from '../../types.ts';
import type { DrugBus } from '../../types-pk.ts';

export type NmbAgent = 'rocuronium' | 'vecuronium' | 'cisatracurium' | 'succinylcholine';
export const NMB_AGENTS: readonly NmbAgent[] = ['rocuronium', 'vecuronium', 'cisatracurium', 'succinylcholine'];
export type VolatileId = 'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o';
export const VOLATILE_IDS: readonly VolatileId[] = ['sevoflurane', 'isoflurane', 'desflurane', 'n2o'];
/** The agents the instructor `anaesthesia` event lists (ng/mL; NMB agents at the adductor-pollicis site). */
export type NeuroAgentId = 'propofol' | 'remifentanil' | 'fentanyl' | 'midazolam' | 'ketamine' | NmbAgent;

/** Fentanyl EEG potency relative to remifentanil (tables §5d: EEG EC50 6.9 vs 11.2 ng/mL; the weight 7g's opioidCeRemiEq uses). */
export const FENT_EEG_POT = 1.6;
/**
 * Fentanyl VENTILATORY potency relative to remifentanil — deviation D-7f-3 (Q54). The tables derive 1.6× (C50 ≈ 0.6
 * ng/mL) from EEG potency; with it fentanyl 1.5 µg/kg alone (Ce ≈ 2.3 ng/mL) makes a healthy adult apnoeic, against
 * clinical experience (RR ~8–10). 0.55× (C50 ≈ 1.7 ng/mL) [ENG], flagged for Ali.
 */
export const FENT_VENT_POT = 0.55;
/**
 * Gamma-row reference units → ng/mL-equivalents [ENG]: 7g keeps midazolam and ketamine as gamma curves (tables §6.1)
 * whose "concentration" is in units of the reference dose; midazolam 0.05 mg/kg ≈ 100 ng/mL, ketamine 1.5 mg/kg ≈
 * 1500 ng/mL (M10 ch. 21 p. 536: 0.7–2.2 µg/mL for hypnosis).
 */
export const MIDAZ_NG_PER_REF = 100;
export const KET_NG_PER_REF = 1500;

export interface NeuroInputs {
  /** Brain effect-site Ce, ng/mL(-eq), naloxone applied. `remifentanil` also carries the other opioids (sufentanil, morphine) as remifentanil-equivalents. */
  brain: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number };
  /** Ventilatory drive inputs, ng/mL(-eq): `opioid` = remifentanil-equivalent at the opioid ventilatory site(s), naloxone applied. */
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number };
  nmj: Record<NmbAgent, number>; // adductor pollicis Ce, ng/mL
  dia: Record<NmbAgent, number>; // diaphragm/larynx Ce, ng/mL
  suxCumMgPerKg: number;
  macPotent: number; // BRAIN age-adjusted MAC fraction of the potent agents (Σ bus.volatiles[potent].macFrac)
  macN2o: number; // BRAIN MAC fraction of N2O
  macEt: number; // END-TIDAL MAC fraction, all agents: Σ fet/macAge (the gas monitor's `mac` numeric)
  et: Partial<Record<VolatileId, { fet: number; macAge: number }>>; // end-tidal % and MAC(age) % (gas-monitor display)
  achGain: number; // neostigmine (7g), 1 = none
  opioidAntag: number; // naloxone EC50 multiplier (7g), 1 = none
}

function nmbSite(bus: DrugBus, site: 'nmj' | 'dia'): Record<NmbAgent, number> {
  const o = {} as Record<NmbAgent, number>;
  for (const a of NMB_AGENTS) o[a] = Math.max(0, bus.agents[a]?.[site] ?? 0);
  return o;
}

export function readBus(bus: DrugBus): NeuroInputs {
  const ag = bus.agents;
  // naloxone (F2): 7g divides every opioid's concentration by the class multiplier for its own summary
  // (`cns.opioidCeRemiEq`) but publishes the per-agent totals raw — apply the same division here, once
  const antag = Math.max(1, bus.antagonist.opioid);
  const remiB = (ag.remifentanil?.brain ?? 0) / antag;
  const fentB = (ag.fentanyl?.brain ?? 0) / antag;
  // opioids 7f does not name one by one: 7g's (already antagonised) remifentanil-equivalent total minus the two 7f names [ENG]
  const otherRemiEq = Math.max(0, bus.cns.opioidCeRemiEq - remiB - FENT_EEG_POT * fentB);
  const propofol = bus.cns.propCe * 1000;
  const midazolam = bus.cns.benzoCeMidazEq * MIDAZ_NG_PER_REF;
  const ketamine = bus.cns.ketamineCe * KET_NG_PER_REF;
  let macPotent = 0;
  let macN2o = 0;
  let macEt = 0;
  const et: NeuroInputs['et'] = {};
  for (const id of VOLATILE_IDS) {
    const v = bus.volatiles[id];
    if (!v) continue;
    et[id] = { fet: v.fet, macAge: v.macAge };
    macEt += v.macAge > 0 ? v.fet / v.macAge : 0;
    if (id === 'n2o') macN2o += v.macFrac;
    else macPotent += v.macFrac;
  }
  return {
    brain: { propofol, remifentanil: remiB + otherRemiEq, fentanyl: fentB, midazolam, ketamine },
    vent: {
      // a missing `vent` entry falls back to the brain site (never to zero: an opioid always depresses breathing)
      opioid: (ag.remifentanil?.vent ?? ag.remifentanil?.brain ?? 0) / antag + (FENT_VENT_POT * (ag.fentanyl?.vent ?? ag.fentanyl?.brain ?? 0)) / antag + otherRemiEq,
      propofol, midazolam, ketamine,
    },
    nmj: nmbSite(bus, 'nmj'),
    dia: nmbSite(bus, 'dia'),
    suxCumMgPerKg: ag.succinylcholine?.cumulativeMgPerKg ?? 0,
    macPotent, macN2o, macEt, et,
    achGain: bus.nmb.achGain,
    opioidAntag: antag,
  };
}

/** Doses 7g accepted after `seenT` (R51 §3: 7f observes, never consumes). The caller keeps the returned `seenT`. */
export function newDoses(bus: DrugBus, seenT: number): { doses: DrugBus['doses']; seenT: number } {
  const doses = bus.doses.filter((d) => d.t > seenT);
  return { doses, seenT: doses.reduce((m, d) => Math.max(m, d.t), seenT) };
}

/**
 * Cholinesterase phenotype for 7g's PK patient (`PkPatient.pche`; 7g's `pkPatientOf` does not map it). The clearance
 * multiplier is 7g's single `PCHE_CL_MULT` (R51 addendum 10: het 0.5 → 12 min, hom 0.003 → 5.2 h, [ENG, fitted to
 * tables §5d / Lee 2009 durations]); 7f uses the same value by construction.
 */
export function pcheOf(p: PatientProfile | undefined): 'normal' | 'het' | 'hom' {
  const c = p?.neuro?.cholinesterase;
  return c === 'homozygous' ? 'hom' : c === 'heterozygous' ? 'het' : 'normal';
}
```

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/helpers/neuro-bus.ts packages/engine-core/test/l2/neuro/bus.test.ts
git commit -m "test(neuro): 7f reads 7g's DrugBus — units, opioid sites with naloxone, NMB sites (nmj/dia), volatiles incl. N2O (brain and end-tidal MAC), observed doses (R51)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: The 7g PK rig and the R51 contract test

**Files:**
- Create: `packages/engine-core/test/helpers/neuro.ts`, `packages/engine-core/test/l2/neuro/pk-bus-contract.test.ts`

**Interfaces:**
- Consumes: 7g's `createPkState`, `applyPkCommand`, `advancePk`, `NEUTRAL_PK_CTX`, `PkState` (`src/l2/pk/pipeline.ts`), `PkPatient` (`src/l2/pk/covariates.ts`, incl. `pche`), `DrugBus`.
- Produces (test helper): `ADULT: PkPatient`, `Rig { pk; tS; tempC }`, `rig(patch?)`, `give(r, drugId, dose, unit = 'mg/kg', infusion = false)`, `vaporiser(r, agent, dialPct, fgfLpm = 6, n2oFrac?)`, `tMin(r)`, `runTo(r, untilMin, each?)`, `until(r, pred, maxMin)` (minutes from now, NaN if never). Tasks 4–6 build every time-course test on it.

- [x] **Step 1: Write the contract test** `packages/engine-core/test/l2/neuro/pk-bus-contract.test.ts` (exact):

```ts
// The R51 bus fields 7f reads, produced by 7g's REAL pipeline. A failure here is a 7g gap: STOP and report it to the
// orchestrator (R51) — never patch src/l2/pk/** or src/types-pk.ts from this branch.
import { describe, expect, it } from 'vitest';
import { give, rig, runTo, vaporiser } from '../../helpers/neuro.ts';

describe('7g → 7f bus contract (R51 §2–3, addenda 9–10)', { timeout: 120_000 }, () => {
  it('opioids publish a separate ventilatory site: remifentanil vent leads brain early (ke0 0.92 vs Minto)', () => {
    const r = rig();
    give(r, 'remifentanil', 0.5, 'mcg/kg');
    runTo(r, 0.5);
    const a = r.pk.bus.agents.remifentanil;
    expect(a?.vent ?? 0).toBeGreaterThan(0);
    expect(a?.vent ?? 0).toBeGreaterThan(a?.brain ?? 0);
  });
  it('NMB agents publish thumb and diaphragm Ce (ng/mL); the diaphragm leads early (ke0 0.26 vs 0.16)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    runTo(r, 1);
    const a = r.pk.bus.agents.rocuronium;
    expect(a?.nmj ?? 0).toBeGreaterThan(100);
    expect(a?.dia ?? 0).toBeGreaterThan(a?.nmj ?? 0);
    expect(a?.unit).toBe('ng/mL');
    expect(a?.plasma ?? 0).toBeGreaterThan(0);
  });
  it('an accepted dose is on bus.doses after the next advance; cumulativeMgPerKg sums repeat doses', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    runTo(r, 1 / 60);
    expect(r.pk.bus.doses.some((d) => d.agent === 'succinylcholine' && Math.abs((d.mgPerKg ?? 0) - 1) < 1e-9 && d.amountUnit === 'mcg' && d.t === 0)).toBe(true);
    give(r, 'succinylcholine', 1);
    runTo(r, 2 / 60);
    expect(r.pk.bus.agents.succinylcholine?.cumulativeMgPerKg ?? 0).toBeCloseTo(2, 9);
  });
  it('volatiles: the dialled agent AND n2o each publish fet, brain, macAge and the brain macFrac (addendum 9)', () => {
    const r = rig();
    vaporiser(r, 'sevoflurane', 2, 6, 0.5);
    runTo(r, 10);
    const v = r.pk.bus.volatiles;
    expect(v.sevoflurane?.fet ?? 0).toBeGreaterThan(0.5);
    expect(v.sevoflurane?.macAge ?? 0).toBeCloseTo(1.8, 1);
    expect(v.sevoflurane?.macFrac ?? 0).toBeGreaterThan(0.3);
    expect(v.sevoflurane?.macFrac ?? 0).toBeCloseTo((v.sevoflurane?.brain ?? 0) / (v.sevoflurane?.macAge ?? 1), 9); // macFrac = BRAIN fraction
    expect(v.n2o?.fet ?? 0).toBeGreaterThan(20);
    expect(r.pk.bus.cns.macBrain).toBeGreaterThan(0);
  });
  it('naloxone publishes bus.antagonist.opioid > 1 and applies it to cns.opioidCeRemiEq but not to the per-agent totals (F2: 7f divides them)', () => {
    const r = rig();
    give(r, 'remifentanil', 0.3, 'mcg/kg/min', true);
    runTo(r, 10);
    give(r, 'naloxone', 0.4, 'mg');
    runTo(r, 12);
    const b = r.pk.bus;
    expect(b.antagonist.opioid).toBeGreaterThan(3);
    const remi = b.agents.remifentanil?.brain ?? 0;
    expect(b.cns.opioidCeRemiEq).toBeCloseTo(remi / b.antagonist.opioid, 6);
  });
  it('neostigmine raises bus.nmb.achGain; homozygous cholinesterase slows succinylcholine (addendum 10)', () => {
    const r = rig();
    give(r, 'neostigmine', 0.05);
    runTo(r, 10);
    expect(r.pk.bus.nmb.achGain).toBeGreaterThan(1.5);
    const norm = rig();
    const hom = rig({ pche: 'hom' });
    give(norm, 'succinylcholine', 1);
    give(hom, 'succinylcholine', 1);
    runTo(norm, 30);
    runTo(hom, 30);
    expect(hom.pk.bus.agents.succinylcholine?.nmj ?? 0).toBeGreaterThan(10 * (norm.pk.bus.agents.succinylcholine?.nmj ?? 0) + 1);
  });
});
```

- [x] **Step 2: Run; expect FAIL** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/pk-bus-contract.test.ts` → "Failed to resolve import ../../helpers/neuro.ts".

- [x] **Step 3: Create the rig** `packages/engine-core/test/helpers/neuro.ts` (exact):

```ts
// Stage 7f test rig over Stage 7g's REAL PK (R51 §1: 7f has none). Drives 7g's pipeline without the engine on its
// 10 Hz grid, one simulated second per call, and hands the DrugBus to the caller. Times in minutes for the NMB tests.
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, type PkState } from '../../src/l2/pk/pipeline.ts';
import type { PkPatient } from '../../src/l2/pk/covariates.ts';
import type { Command } from '../../src/types.ts';
import type { DrugBus } from '../../src/types-pk.ts';

export const ADULT: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };

export interface Rig {
  pk: PkState;
  tS: number;
  tempC: number;
}

export function rig(p: Partial<PkPatient> = {}): Rig {
  return { pk: createPkState({ ...ADULT, ...p }), tS: 0, tempC: 37 };
}

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `rig-${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;

/** A `drug` event through 7g (bolus; `infusion` with a rate unit). Returns what 7g's apply returned. */
export function give(r: Rig, drugId: string, dose: number, unit = 'mg/kg', infusion = false): boolean {
  return applyPkCommand(r.pk, ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) }), r.tS);
}

/** 7g's vaporiser event (R51 §4), optionally with N2O as a fraction of the fresh gas. */
export function vaporiser(r: Rig, agent: 'sevoflurane' | 'isoflurane' | 'desflurane', dialPct: number, fgfLpm = 6, n2oFrac?: number): boolean {
  return applyPkCommand(r.pk, ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, ...(n2oFrac !== undefined ? { n2oFrac } : {}) }), r.tS);
}

export const tMin = (r: Rig): number => r.tS / 60;

/** Advance 7g's PK by one simulated second (ten 0.1 s steps) at the rig's temperature. */
function second(r: Rig): void {
  r.tS = Math.round(r.tS + 1);
  advancePk(r.pk, { ...NEUTRAL_PK_CTX, tempC: r.tempC }, r.tS);
}

/** Step to `untilMin`, calling `each` every simulated second with the bus. */
export function runTo(r: Rig, untilMin: number, each?: (bus: DrugBus, tMin: number) => void): void {
  while (r.tS < untilMin * 60 - 1e-9) {
    second(r);
    each?.(r.pk.bus, r.tS / 60);
  }
}

/** Minutes from now until `pred` first holds (checked every second), up to `maxMin`; NaN if never. */
export function until(r: Rig, pred: (bus: DrugBus, tMin: number) => boolean, maxMin: number): number {
  const t0 = r.tS;
  while (r.tS < t0 + maxMin * 60 - 1e-9) {
    second(r);
    if (pred(r.pk.bus, r.tS / 60)) return (r.tS - t0) / 60;
  }
  return Number.NaN;
}
```

- [x] **Step 4: Run; expect PASS** (6 tests; prototype: all 6 on the merged base). Any failure other than a typo in this task's two files is a 7g gap against R51: STOP and report the failing assertion and the measured value to the orchestrator (a request to 7g); do not edit 7g's files and do not continue to Task 4.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/helpers/neuro.ts packages/engine-core/test/l2/neuro/pk-bus-contract.test.ts
git commit -m "test(neuro): rig over 7g's PK and the bus contract — vent site, nmj/dia sites with unit/plasma, dose log, volatiles {fet, brain, macAge, macFrac} incl. N2O, naloxone multiplier, cholinesterase" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: NMB pharmacodynamics and the TOF picture (`nmb.ts`), fitted to 7g's PK

**Files:**
- Create: `packages/engine-core/src/l2/neuro/nmb.ts`, `packages/engine-core/test/helpers/neuro-nmb.ts`, `packages/engine-core/test/l2/neuro/nmb.test.ts`, `packages/engine-core/test/l2/neuro/nmb-course.test.ts`
- Scratch (run once, never committed): `packages/engine-core/test/l2/neuro/nmb-fit.scratch.test.ts`

**Interfaces:**
- Consumes: `readBus`, `NmbAgent`, `NMB_AGENTS` (Task 2); the rig (Task 3); `neoEc50Mult` from Task 5 is imported by the helper — **create `src/l2/neuro/neostigmine.ts` now from Task 5 Step 3 verbatim** (its own test comes in Task 5).
- Produces: `NmbPd { ec50Thumb; ec50Dia; gamma; depolarising }`, `NMB_PD`, `DIA_EC50_RATIO` 1.73, `TOF_THRESH`, `TOFR_EXP`, `PTC_LO` 0.01, `PTC_HI` 0.03, `hillBlock(ce, ec50, gamma)`, `siteBlock(ce, site: 'thumb' | 'dia', ec50Mult) → { b; nd; dep }`, `TofReading { t1; count; ratio; ptc; twitches }`, `tofFrom(b, ndShare, phase2)`, `phase2Fraction(cumMgPerKg)`; re-exports `NmbAgent`, `NMB_AGENTS`; test helper `ONE`, `NmbPoint { tof; dia }`, `readNmb(bus, ec50?)`, `untilTof(r, pred, maxMin, ec50?)`, `t1Course(r, min, ec50?)`, `onsetMin(t1)` (max block, decision 3), `recoveryMin(t1, level)`.

- [x] **Step 1: Write the failing tests.** `packages/engine-core/test/l2/neuro/nmb.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hillBlock, NMB_PD, phase2Fraction, siteBlock, tofFrom } from '../../../src/l2/neuro/nmb.ts';

const ONE = { rocuronium: 1, vecuronium: 1, cisatracurium: 1, succinylcholine: 1 };
const Z = { rocuronium: 0, vecuronium: 0, cisatracurium: 0, succinylcholine: 0 };
describe('NMB PD (tables §5d)', () => {
  it('Hill block: 50 % at EC50, steep with γ 4.8', () => {
    expect(hillBlock(823, 823, 4.8)).toBeCloseTo(0.5, 9);
    expect(hillBlock(2 * 823, 823, 4.8)).toBeGreaterThan(0.96);
    expect(hillBlock(0, 823, 4.8)).toBe(0);
  });
  it('TOF count thresholds: T1 > 3 / 10 / 20 / 25 % → 1 / 2 / 3 / 4 twitches', () => {
    expect([0.02, 0.05, 0.15, 0.22, 0.3].map((t1) => tofFrom(1 - t1, 1, 0).count)).toEqual([0, 1, 2, 3, 4]);
  });
  it('fade: TOFR = T1^2.5 for a non-depolariser (0.9 at T1 0.959), none for succinylcholine phase I, back in phase II', () => {
    expect(tofFrom(1 - 0.959, 1, 0).ratio).toBeCloseTo(0.9, 2);
    expect(tofFrom(1 - 0.5, 0, 0).ratio).toBe(1);
    expect(tofFrom(1 - 0.5, 0, 1).ratio).toBeCloseTo(0.5 ** 2.5, 9);
    expect(phase2Fraction(2)).toBe(0);
    expect(phase2Fraction(5)).toBeCloseTo(0.5, 9);
  });
  it('PTC appears only at TOF count 0 once B < 0.99 (tables §5d); twitch heights fall T1 → T4', () => {
    expect(tofFrom(1 - 0.005, 1, 0).ptc).toBe(0);
    expect(tofFrom(1 - 0.011, 1, 0).ptc).toBeGreaterThanOrEqual(1);
    expect(tofFrom(1 - 0.02, 1, 0).ptc).toBeGreaterThan(5);
    const r = tofFrom(1 - 0.6, 1, 0);
    expect(r.twitches[0]).toBeGreaterThan(r.twitches[3]);
  });
  it('rocuronium and vecuronium add as equipotent fractions; the diaphragm needs ~1.7× the concentration', () => {
    const half = siteBlock({ ...Z, rocuronium: NMB_PD.rocuronium.ec50Thumb / 2, vecuronium: NMB_PD.vecuronium.ec50Thumb / 2 }, 'thumb', ONE);
    expect(half.b).toBeCloseTo(0.5, 6);
    expect(siteBlock({ ...Z, rocuronium: 1000 }, 'dia', ONE).b).toBeLessThan(siteBlock({ ...Z, rocuronium: 1000 }, 'thumb', ONE).b);
  });
});
```

`packages/engine-core/test/helpers/neuro-nmb.ts` (exact):

```ts
// TOF reading on the 7g rig (Task 3): 7f's NMB PD (nmb.ts, neostigmine.ts) applied to the bus concentrations.
import { readBus, type NmbAgent } from '../../src/l2/neuro/bus.ts';
import { neoEc50Mult } from '../../src/l2/neuro/neostigmine.ts';
import { phase2Fraction, siteBlock, tofFrom, type TofReading } from '../../src/l2/neuro/nmb.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { runTo, until, type Rig } from './neuro.ts';

export const ONE: Record<NmbAgent, number> = { rocuronium: 1, vecuronium: 1, cisatracurium: 1, succinylcholine: 1 };

export interface NmbPoint {
  tof: TofReading;
  dia: number; // diaphragm block 0–1
}

/** The TOF picture and the diaphragm block from a bus, with interaction multipliers `ec50` (neostigmine read from the bus). */
export function readNmb(bus: DrugBus, ec50: Record<NmbAgent, number> = ONE): NmbPoint {
  const x = readBus(bus);
  const neo = neoEc50Mult(x.achGain);
  const m: Record<NmbAgent, number> = {
    rocuronium: ec50.rocuronium * neo, vecuronium: ec50.vecuronium * neo, cisatracurium: ec50.cisatracurium * neo, succinylcholine: ec50.succinylcholine,
  };
  const th = siteBlock(x.nmj, 'thumb', m);
  const di = siteBlock(x.dia, 'dia', m);
  const ndShare = th.b > 0 ? th.nd / Math.max(1e-9, th.nd + th.dep) : 0;
  return { tof: tofFrom(th.b, ndShare, phase2Fraction(x.suxCumMgPerKg)), dia: di.b };
}

/** Minutes from now until the TOF predicate holds (checked every second); NaN if never within `maxMin`. */
export function untilTof(r: Rig, pred: (p: NmbPoint) => boolean, maxMin: number, ec50: Record<NmbAgent, number> = ONE): number {
  return until(r, (bus) => pred(readNmb(bus, ec50)), maxMin);
}

/** T1 (thumb, fraction of control) every simulated second from now for `min` minutes: index i = second i + 1. */
export function t1Course(r: Rig, min: number, ec50: Record<NmbAgent, number> = ONE): number[] {
  const out: number[] = [];
  runTo(r, r.tS / 60 + min, (bus) => out.push(readNmb(bus, ec50).tof.t1));
  return out;
}

/**
 * Onset = time to MAXIMUM block as a stimulator sees it — the labels' "max block" (tables §5d: vecuronium 3–5 min,
 * cisatracurium 2–3 min): the first second with T1 < 10 % after which T1 falls by less than 1 point over the next
 * 45 s (three 15 s trains) [ENG operational rule: a one-compartment effect site keeps creeping toward its nadir for
 * minutes, below the stimulator's resolution]. Minutes from the start of the course; NaN if never.
 */
export function onsetMin(t1: number[]): number {
  for (let i = 0; i + 45 < t1.length; i++) if ((t1[i] as number) < 0.1 && (t1[i] as number) - (t1[i + 45] as number) < 0.01) return (i + 1) / 60;
  return Number.NaN;
}

/** Minutes from the start of the course until T1 first reaches `level` AFTER the nadir; NaN if never. */
export function recoveryMin(t1: number[], level: number): number {
  let im = 0;
  for (let i = 1; i < t1.length; i++) if ((t1[i] as number) < (t1[im] as number)) im = i;
  for (let i = im; i < t1.length; i++) if ((t1[i] as number) >= level) return (i + 1) / 60;
  return Number.NaN;
}
```

`packages/engine-core/test/l2/neuro/nmb-course.test.ts` (exact):

```ts
// NMB time courses on 7g's PK (tables §6.1: rocuronium ke0 0.16/0.26, Vss 0.26 L/kg; succinylcholine hydrolysis CL
// 0.2 L/kg/min) with 7f's PD. Bands: tables §5d label rows [P] unless marked; the rocuronium TOFR 0.9 band is R51
// addendum 17's (Debaene 2003; label). EC50s other than rocuronium's are [ENG] fits (Step 5). R45: a missed band is
// fitted within the stated ranges or reported, never widened; succinylcholine is a declared 7g PK defect (FU-3 item 1).
import { describe, expect, it } from 'vitest';
import { give, rig } from '../../helpers/neuro.ts';
import { onsetMin, recoveryMin, t1Course, untilTof } from '../../helpers/neuro-nmb.ts';

describe('NMB time course on 7g\'s PK', { timeout: 120_000 }, () => {
  it('rocuronium 0.6 mg/kg: TOF 0 by ~1.8 min, T1 25 % at ~31 min (label); spontaneous TOFR 0.9 at 55–95 min (R51 addendum 17: Debaene 2003; label)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    const tof0 = untilTof(r, (p) => p.tof.count === 0, 5);
    expect(tof0).toBeGreaterThan(1);
    expect(tof0).toBeLessThan(2.2);
    const rec25 = tof0 + untilTof(r, (p) => p.tof.t1 >= 0.25, 90);
    expect(rec25).toBeGreaterThan(26);
    expect(rec25).toBeLessThan(38);
    const tofr9 = rec25 + untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 90);
    expect(tofr9).toBeGreaterThan(55);
    expect(tofr9).toBeLessThan(95);
  });
  it('rocuronium 1.2 mg/kg: faster onset (≤ 1.2 min) and a longer block (T1 25 % 40–90 min; label 67, range 38–150)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    const tof0 = untilTof(r, (p) => p.tof.count === 0, 5);
    expect(tof0).toBeLessThan(1.2);
    const rec25 = tof0 + untilTof(r, (p) => p.tof.t1 >= 0.25, 150);
    expect(rec25).toBeGreaterThan(40);
    expect(rec25).toBeLessThan(90);
  });
  it('the diaphragm recovers before the thumb (spontaneous effort returns at TOF 0–1)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    const diaph = untilTof(r, (p) => p.dia < 0.7, 90);
    const r2 = rig();
    give(r2, 'rocuronium', 0.6);
    untilTof(r2, (p) => p.tof.count === 0, 5);
    const thumb = untilTof(r2, (p) => p.tof.count >= 2, 90);
    expect(diaph).toBeLessThan(thumb);
  });
  it('vecuronium 0.1 mg/kg: max block 2.5–5 min, T1 25 % at 24–32 min (label 3–5 / 25–30)', () => {
    const r = rig();
    give(r, 'vecuronium', 0.1);
    const t1 = t1Course(r, 60);
    const on = onsetMin(t1);
    expect(on).toBeGreaterThan(2.5);
    expect(on).toBeLessThan(5);
    const rec = recoveryMin(t1, 0.25);
    expect(rec).toBeGreaterThan(24);
    expect(rec).toBeLessThan(32);
  });
  it('cisatracurium 0.15 mg/kg: max block 2–3.5 min, T1 25 % at 40–50 min (label 2–3 / ≈ 45)', () => {
    const r = rig();
    give(r, 'cisatracurium', 0.15);
    const t1 = t1Course(r, 80);
    const on = onsetMin(t1);
    expect(on).toBeGreaterThan(2);
    expect(on).toBeLessThan(3.5);
    const rec = recoveryMin(t1, 0.25);
    expect(rec).toBeGreaterThan(40);
    expect(rec).toBeLessThan(50);
  });
  // FU-3 item 1 (R51 addendum 17): 7g's succinylcholine ke0 0.15/min puts T1 ≤ 5 % at 0.17 min (clinical 45–90 s) and
  // T1 10 % at 5.4 min; the re-fit is 7g's (ke0/CL), not 7f's EC50. Pre-declared `it.fails` with the numbers measured on
  // 7g's PK at EC50 200/γ 4: onset 0.17, T1 10 % 5.37, T1 90 % 12.68 min. When FU-3 lands this starts passing, `it.fails`
  // then fails, and the FU-3 executor turns it back into `it`.
  it.fails('[FU-3 item 1] succinylcholine 1 mg/kg: block by ~1 min, T1 10 % at ~7.1 min, 90 % at ~10.9 min (label), no fade', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    const on = untilTof(r, (p) => p.tof.t1 <= 0.05, 3);
    expect(on).toBeGreaterThan(0.6);
    expect(on).toBeLessThan(1.4);
    const t10 = on + untilTof(r, (p) => p.tof.t1 >= 0.1, 20);
    expect(t10).toBeGreaterThan(6);
    expect(t10).toBeLessThan(8.5);
    let fade = 1;
    const t90 = t10 + untilTof(r, (p) => { fade = Math.min(fade, p.tof.count === 4 ? p.tof.ratio : 1); return p.tof.t1 >= 0.9; }, 20);
    expect(t90).toBeGreaterThan(9.5);
    expect(t90).toBeLessThan(12.5);
    expect(fade).toBe(1);
  });
  it('succinylcholine phase I has no fade on 7g\'s PK (holds whatever FU-3 does to its timing)', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    let fade = 1;
    untilTof(r, (p) => { fade = Math.min(fade, p.tof.count === 4 ? p.tof.ratio : 1); return false; }, 20);
    expect(fade).toBe(1);
  });
  it('plasma cholinesterase (7g\'s PK, R51 addendum 10): heterozygous ≈ ×1.5–2, homozygous 4–8 h (tables §5d, Lee 2009)', () => {
    const het = rig({ pche: 'het' });
    give(het, 'succinylcholine', 1);
    untilTof(het, (p) => p.tof.t1 <= 0.05, 3);
    const h90 = untilTof(het, (p) => p.tof.t1 >= 0.9, 40);
    expect(h90).toBeGreaterThan(14);
    expect(h90).toBeLessThan(25);
    const hom = rig({ pche: 'hom' });
    give(hom, 'succinylcholine', 1);
    untilTof(hom, (p) => p.tof.t1 <= 0.05, 3);
    const m90 = untilTof(hom, (p) => p.tof.t1 >= 0.9, 600);
    expect(m90 / 60).toBeGreaterThan(4);
    expect(m90 / 60).toBeLessThan(8);
  });
});
```

- [x] **Step 2: Run both; expect FAIL** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/nmb.test.ts test/l2/neuro/nmb-course.test.ts` → "Failed to resolve import …/nmb.ts".

- [x] **Step 3: Implement** `packages/engine-core/src/l2/neuro/nmb.ts` (exact):

```ts
// Neuromuscular block PD (tables §5d; 7f owns it, R51 §2). Effect-site concentration (ng/mL, 7g's PK via bus.ts) →
// receptor-level block B = Ce^γ/(Ce^γ + EC50'^γ), first twitch T1 = 1 − B, then the TOF picture a stimulator records:
//   TOF count: T1 visible above 3 %, T2 above 10 %, T3 above 20 %, T4 above 25 % of control (tables §5d [TXT, VERIFY]);
//   TOF ratio (non-depolarising): T1^2.5 capped at 1 (tables §5d [ENG]: TOFR 0.9 at T1 0.96, 0.7 at T1 0.87);
//   succinylcholine phase I: no fade (ratio 1); phase II: fade grows linearly from 3 to 7 mg/kg cumulative [ENG; onset
//     at the brief §4.9 "> 3–5 mg/kg or infusion"];
//   post-tetanic count (TOF count 0 only): 0 while B ≥ 0.99, then 1–15 as T1 rises from 1 % to 3 % (tables §5d "PTC
//     appears when T1 = 0 and B < 0.99" [ENG]).
// EC50' = EC50 × interaction/profile multipliers (interactions.ts) × neostigmine (neostigmine.ts). Pure functions.
import type { NmbAgent } from './bus.ts';

export type { NmbAgent };
export { NMB_AGENTS } from './bus.ts';

export interface NmbPd {
  ec50Thumb: number; // ng/mL
  ec50Dia: number; // ng/mL
  gamma: number;
  depolarising: boolean;
}

/** Diaphragm/larynx EC50 = thumb × 1.73 for every agent (Plaud 1995: rocuronium 1424/823; tables §5d). */
export const DIA_EC50_RATIO = 1.73;

/**
 * EC50 (ng/mL) and Hill γ, fitted on 7g's PK (R51 §5; Task 4 Step 5). Rocuronium: tables §5d (Plaud 1995 [P]; γ 4.8
 * [VERIFY]). Vecuronium, cisatracurium, succinylcholine [ENG]; "max block" = the stimulator plateau (decision 3).
 * Succinylcholine keeps 7g's effect-site value: its onset/duration miss is 7g's ke0 (FU-3 item 1), never fitted here.
 */
export const NMB_PD: Record<NmbAgent, NmbPd> = {
  rocuronium: { ec50Thumb: 823, ec50Dia: 1424, gamma: 4.8, depolarising: false },
  vecuronium: { ec50Thumb: 158, ec50Dia: 158 * DIA_EC50_RATIO, gamma: 4, depolarising: false }, // [ENG, fitted on 7g's PK: max block 3.03 / T1 25 % 25.2 min]
  cisatracurium: { ec50Thumb: 230, ec50Dia: 230 * DIA_EC50_RATIO, gamma: 6.9, depolarising: false }, // [ENG, 7g's value, meets on 7g's PK: max block 2.48 / T1 25 % 42.4 min]
  succinylcholine: { ec50Thumb: 200, ec50Dia: 200 * DIA_EC50_RATIO, gamma: 4, depolarising: true }, // [ENG, 7g's effect-site value; band missed: onset 0.17 / T1 10 % 5.37 min — FU-3 item 1]
};

export const TOF_THRESH = [0.03, 0.1, 0.2, 0.25] as const;
export const TOFR_EXP = 2.5;
export const PTC_LO = 0.01; // T1 at B = 0.99: the first post-tetanic twitch (tables §5d [ENG])
export const PTC_HI = 0.03; // T1 at which the first TOF twitch returns: PTC 15

/** Fractional receptor-level block 0–1 of one agent at concentration ce. */
export function hillBlock(ce: number, ec50: number, gamma: number): number {
  if (ce <= 0) return 0;
  const x = (ce / ec50) ** gamma;
  return x / (1 + x);
}

/**
 * Combined block of several agents at one site: non-depolarisers add as equipotent fractions (Ce/EC50 summed —
 * roc + vec are additive; tables §5d [TXT]); succinylcholine combines as an independent action.
 */
export function siteBlock(ce: Record<NmbAgent, number>, site: 'thumb' | 'dia', ec50Mult: Record<NmbAgent, number>): { b: number; nd: number; dep: number } {
  let u = 0;
  let gSum = 0;
  let gW = 0;
  for (const id of ['rocuronium', 'vecuronium', 'cisatracurium'] as const) {
    const pd = NMB_PD[id];
    const e = (site === 'thumb' ? pd.ec50Thumb : pd.ec50Dia) * ec50Mult[id];
    const ui = ce[id] / e;
    u += ui;
    gSum += pd.gamma * ui;
    gW += ui;
  }
  const g = gW > 0 ? gSum / gW : 4.8;
  const nd = u > 0 ? u ** g / (1 + u ** g) : 0;
  const sp = NMB_PD.succinylcholine;
  const dep = hillBlock(ce.succinylcholine, (site === 'thumb' ? sp.ec50Thumb : sp.ec50Dia) * ec50Mult.succinylcholine, sp.gamma);
  return { b: 1 - (1 - nd) * (1 - dep), nd, dep };
}

export interface TofReading {
  t1: number; // first twitch, fraction of control
  count: 0 | 1 | 2 | 3 | 4;
  ratio: number; // T4/T1 (meaningful when count = 4)
  ptc: number; // post-tetanic count 0–15 (count 0 only; 15 otherwise)
  twitches: [number, number, number, number];
}

/**
 * The TOF picture from the thumb block. `phase2` 0–1 (succinylcholine phase II), `ndShare` = fraction of the block
 * that is non-depolarising (fade comes only from that part).
 */
export function tofFrom(b: number, ndShare: number, phase2: number): TofReading {
  const t1 = Math.max(0, Math.min(1, 1 - b));
  const fadeExp = TOFR_EXP * Math.max(ndShare, phase2);
  const ratio = Math.min(1, fadeExp > 0 ? t1 ** fadeExp : 1);
  let count: TofReading['count'] = 0;
  for (const th of TOF_THRESH) if (t1 > th) count = (count + 1) as TofReading['count'];
  const tw: TofReading['twitches'] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) tw[i] = i < count ? t1 * ratio ** (i / 3) : 0;
  const ptc = count === 0 && t1 > PTC_LO ? Math.max(1, Math.min(15, Math.round((15 * (t1 - PTC_LO)) / (PTC_HI - PTC_LO)))) : 0;
  return { t1, count, ratio, ptc: count === 0 ? ptc : 15, twitches: tw };
}

/** Succinylcholine phase II fraction from the cumulative dose (7g's `cumulativeMgPerKg`): 0 at 3 mg/kg → 1 at 7 [ENG]. */
export function phase2Fraction(cumMgPerKg: number): number {
  return Math.max(0, Math.min(1, (cumMgPerKg - 3) / 4));
}
```

- [x] **Step 4: Run the PD test; expect PASS** — `… exec vitest run test/l2/neuro/nmb.test.ts` → 5 passed.

- [x] **Step 5: Confirm the [ENG] EC50s against 7g's PK.** The values in Step 3 were fitted in the prototype on the merged base; this scratch run re-checks them on YOUR base (a later 7g/FU change could move them). Create `packages/engine-core/test/l2/neuro/nmb-fit.scratch.test.ts` (exact; run it, read the console, DELETE it — never commit):

```ts
// Throw-away fit of 7f's NMB EC50/γ against 7g's PK (R51 §5). Prints max block / T1 10 % / T1 25 % / T1 90 % /
// TOFR 0.9 per trial value, with the "max block" rule of decision 3 (helpers/neuro-nmb.ts onsetMin).
import { it } from 'vitest';
import type { NmbAgent } from '../../../src/l2/neuro/bus.ts';
import { DIA_EC50_RATIO, NMB_PD } from '../../../src/l2/neuro/nmb.ts';
import { give, rig, runTo } from '../../helpers/neuro.ts';
import { onsetMin, readNmb, recoveryMin } from '../../helpers/neuro-nmb.ts';

function course(agent: NmbAgent, dose: number, ec50: number, gamma: number, pche: 'normal' | 'het' | 'hom' = 'normal'): string {
  const saved = { ...NMB_PD[agent] };
  NMB_PD[agent] = { ...saved, ec50Thumb: ec50, ec50Dia: agent === 'rocuronium' ? saved.ec50Dia : ec50 * DIA_EC50_RATIO, gamma };
  const r = rig({ pche });
  give(r, agent, dose);
  const t1: number[] = [];
  let r9 = Number.NaN;
  runTo(r, pche === 'hom' ? 600 : 120, (bus, t) => {
    const p = readNmb(bus);
    t1.push(p.tof.t1);
    if (Number.isNaN(r9) && t > 5 && p.tof.count === 4 && p.tof.ratio >= 0.9) r9 = t;
  });
  NMB_PD[agent] = saved;
  const f = (v: number) => v.toFixed(2);
  const t5 = (t1.findIndex((v) => v <= 0.05) + 1) / 60;
  return `${agent} ${dose} mg/kg ${pche} EC50 ${ec50} γ ${gamma}: T1≤5 % ${f(t5)} | max block ${f(onsetMin(t1))} | T1 10 % ${f(recoveryMin(t1, 0.1))} | T1 25 % ${f(recoveryMin(t1, 0.25))} | T1 90 % ${f(recoveryMin(t1, 0.9))} | TOFR 0.9 ${f(r9)} min`;
}

it('fit NMB EC50/γ on 7g\'s PK', { timeout: 900_000 }, () => {
  for (const g of [3.9, 4.8, 5.7]) console.log(course('rocuronium', 0.6, 823, g), '\n  ', course('rocuronium', 1.2, 823, g));
  for (const e of [140, 150, 155, 158, 160, 165, 180]) for (const g of [4, 4.5, 5]) console.log(course('vecuronium', 0.1, e, g));
  for (const e of [190, 230, 270]) for (const g of [5, 6, 6.9]) console.log(course('cisatracurium', 0.15, e, g));
  for (const e of [100, 200, 400]) for (const g of [3, 4, 5]) console.log(course('succinylcholine', 1, e, g), '\n  ', course('succinylcholine', 1, e, g, 'het'));
  console.log(course('succinylcholine', 1, NMB_PD.succinylcholine.ec50Thumb, NMB_PD.succinylcholine.gamma, 'hom'));
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/nmb-fit.scratch.test.ts` and read the console. Prototype (merged base): rocuronium 0.6 γ 4.8 → max block 1.62, T1 25 % 30.02, TOFR 0.9 80.67; vecuronium 158/γ 4 → max block 3.03, T1 25 % 25.20; cisatracurium 230/γ 6.9 → 2.48 / 42.40; succinylcholine 200/γ 4 → T1 ≤ 5 % 0.17, T1 10 % 5.37, T1 90 % 12.68; homozygous T1 90 % 365.5 min. Rules (R45, R51 §5):
- **Rocuronium EC50 stays 823/1424 (tables [P]).** Its bands (Step 1, TOFR 0.9 **55–95 min** per R51 addendum 17) are met at γ 4.8; if they are not on your base, try γ within the tables' 3.9–5.7 only; if still missed, keep 4.8 and STOP and report (7g's rocuronium PK is the tables').
- **Vecuronium** EC50 100–250 ng/mL, γ 4–5; **cisatracurium** EC50 150–350, γ 5–6.9: if your numbers differ from the prototype's, pick the value that meets the LABEL targets (vecuronium max block 3–5 / T1 25 % 25–30; cisatracurium max block 2–3 / T1 25 % ≈ 45 within 40–50) and paste it into `NMB_PD` with the comment `[ENG, fitted on 7g's PK: <max block>/<T1 25 %> min]`.
- **Succinylcholine is NOT fitted here** (R51 addendum 17, FU-3 item 1): its onset/T1 10 % miss is 7g's ke0 0.15. Keep 200/γ 4; its course test is pre-declared `it.fails` with the prototype numbers (Step 1). If FU-3 has already landed on your base and the test passes, STOP and report (the orchestrator flips it).
- If no value in range meets a band, keep the closest, mark the row `[ENG, band missed: <band> measured <value>]`, list it under "needs a ruling" in the gate note. Never widen a band.
- Delete the scratch file: `rm packages/engine-core/test/l2/neuro/nmb-fit.scratch.test.ts`.

- [x] **Step 6: Run the course test** — `… exec vitest run test/l2/neuro/nmb.test.ts test/l2/neuro/nmb-course.test.ts` → nmb 5 passed; nmb-course 8: **7 pass + 1 pre-declared `it.fails` that must report as passing-as-expected** (`[FU-3 item 1] succinylcholine …`). Prototype numbers: rocuronium 0.6 → TOF 0 1.32 / T1 25 % 30.0 / TOFR 0.9 80.7 min; 1.2 → 0.58 / 62.9; vecuronium 3.03 / 25.2; cisatracurium 2.48 / 42.4; cholinesterase het T1 90 % 17.4 min, hom 6.09 h; succinylcholine (FU-3) 0.17 / 5.37 / 12.68.

- [x] **Step 7: Commit and push**

```bash
git status --short packages/engine-core/test/l2/neuro/ # the scratch fit file must be gone
git add packages/engine-core/src/l2/neuro/nmb.ts packages/engine-core/src/l2/neuro/neostigmine.ts packages/engine-core/test/helpers/neuro-nmb.ts packages/engine-core/test/l2/neuro/nmb.test.ts packages/engine-core/test/l2/neuro/nmb-course.test.ts
git commit -m "feat(neuro): NMB effect-site PD — block per site (thumb/dia), TOF count/ratio, PTC, succinylcholine phase I/II; EC50s fitted on 7g's PK, rocuronium TOFR 0.9 band 55–95 (R51 addendum 17), succinylcholine it.fails for FU-3" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: Reversal — sugammadex (7g's binding) and neostigmine (7f's ceiling)

**Files:**
- Create (`neostigmine.ts` already exists from Task 4 Step 1): `packages/engine-core/test/l2/neuro/reversal.test.ts`, `packages/engine-core/test/l2/neuro/neostigmine.test.ts`

**Interfaces:**
- Consumes: the rig (Task 3), `readNmb`/`untilTof` (Task 4); 7g's sugammadex binding in plasma (`bindSugammadex`) and at the effect sites (`bindSugammadexSites`, sugammadex effect-site ke0 0.095/0.152; R51 §5, deviation D-7f-2) and its neostigmine gamma row (`bus.nmb.achGain`).
- Produces: `NEO_SMAX` 0.7, `NEO_G50` 0.3 (fitted, decision 5), `neoEc50Mult(achGain)`.

- [x] **Step 1: Write the tests.** `packages/engine-core/test/l2/neuro/neostigmine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NEO_G50, NEO_SMAX, neoEc50Mult } from '../../../src/l2/neuro/neostigmine.ts';

describe('neostigmine EC50 shift from 7g\'s acetylcholine gain (tables §5d Neo row)', () => {
  it('neutral without neostigmine; monotone; bounded by the ceiling; 1.5 at 7g\'s peak gain for 0.05 mg/kg', () => {
    expect(neoEc50Mult(1)).toBe(1);
    expect(neoEc50Mult(0.5)).toBe(1);
    let prev = 1;
    for (const g of [1.5, 2, 2.5, 3, 4, 10, 100]) {
      const m = neoEc50Mult(g);
      expect(m).toBeGreaterThan(prev);
      expect(m).toBeLessThan(1 + NEO_SMAX);
      prev = m;
    }
    expect(neoEc50Mult(2.5)).toBeCloseTo(1 + (NEO_SMAX * 1.5) / (1.5 + NEO_G50), 12);
    expect(neoEc50Mult(2.5)).toBeCloseTo(1.583, 3); // NEO_G50 0.3 fitted on 7g's PK (Task 5)
  });
});
```

`packages/engine-core/test/l2/neuro/reversal.test.ts` (exact):

```ts
// Reversal on 7g's PK. Sugammadex binding (1:1 molar in plasma AND at both effect sites through its own effect-site
// ke0 0.095/0.152 /min, `bindSugammadexSites`) is 7g's (R51 §5; deviation D-7f-2): these are 7f's acceptance bands on
// it, and a miss is a REQUEST TO 7G (its sugammadex effect-site ke0 / binding), never a change to 7f's EC50s.
// Neostigmine's time course is 7g's gamma row; its ceiling (NEO_SMAX) and NEO_G50 (fitted here: 0.3) are 7f's.
import { describe, expect, it } from 'vitest';
import { give, rig, runTo, tMin } from '../../helpers/neuro.ts';
import { readNmb, untilTof } from '../../helpers/neuro-nmb.ts';

describe('reversal (tables §5d Sgx/Neo rows)', { timeout: 180_000 }, () => {
  it('sugammadex 2 mg/kg at TOF 2 → TOFR 0.9 in 1.5–3 min (label median 2.2)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    untilTof(r, (p) => p.tof.count >= 2, 60);
    give(r, 'sugammadex', 2);
    const t = untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 20);
    expect(t).toBeGreaterThan(1.5);
    expect(t).toBeLessThan(3);
  });
  it('sugammadex 4 mg/kg at PTC 1–2 → TOFR 0.9 in 2.1–4.3 min (label IQR, median 2.7)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 60);
    give(r, 'sugammadex', 4);
    const t = untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 20);
    expect(t).toBeGreaterThan(2.1);
    expect(t).toBeLessThan(4.3);
  });
  it('sugammadex 16 mg/kg 3 min after rocuronium 1.2 mg/kg → T1 10 % within 0.8–2 min (label 1.2)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    runTo(r, 3);
    give(r, 'sugammadex', 16);
    const t = untilTof(r, (p) => p.tof.t1 >= 0.1, 10);
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(2);
  });
  // R-7f-7 (→ 7g, FU-3 list): on 7g's binding 0.5 mg/kg at PTC after rocuronium 1.2 reaches only TOFR 0.83 at +90 min
  // and never falls (no recurarisation); 0.75 mg/kg peaks 0.997 at +13 min then falls to 0.42, 1 mg/kg to 0.70. The
  // underdose/redistribution balance is 7g's binding (plasma vs effect-site capture), not 7f's PD: pre-declared failing.
  it.fails('[R-7f-7] underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 90);
    give(r, 'sugammadex', 0.5);
    let peak = 0;
    let after = 1;
    runTo(r, tMin(r) + 90, (bus) => {
      const p = readNmb(bus);
      const ratio = p.tof.count === 4 ? p.tof.ratio : 0;
      if (ratio > peak) {
        peak = ratio;
        after = 1;
      } else after = Math.min(after, ratio);
    });
    expect(peak).toBeGreaterThan(0.95);
    expect(peak - after).toBeGreaterThan(0.04);
  });
  it('neostigmine 0.05 mg/kg at TOF 2 → TOFR 0.9 in 8–20 min, ≥ 5 min faster than spontaneous', () => {
    const a = rig();
    give(a, 'rocuronium', 0.6);
    untilTof(a, (p) => p.tof.count === 0, 5);
    untilTof(a, (p) => p.tof.count >= 2, 60);
    const b = structuredClone(a);
    give(a, 'neostigmine', 0.05);
    const tn = untilTof(a, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 60);
    const ts = untilTof(b, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 60);
    expect(tn).toBeGreaterThan(8);
    expect(tn).toBeLessThan(20);
    expect(ts - tn).toBeGreaterThan(5);
  });
  it('neostigmine ceiling: 0.07 mg/kg at PTC 1–2 leaves TOFR < 0.9 at 10 min (sugammadex 4 mg/kg: < 4.3)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 60);
    give(r, 'neostigmine', 0.07);
    runTo(r, tMin(r) + 10);
    const p = readNmb(r.pk.bus);
    expect(p.tof.count === 4 ? p.tof.ratio : 0).toBeLessThan(0.9);
  });
});
```

- [x] **Step 2: Run** `… exec vitest run test/l2/neuro/neostigmine.test.ts test/l2/neuro/reversal.test.ts` → neostigmine 1 passed; reversal 6: **5 pass + 1 pre-declared `it.fails`** (`[R-7f-7] underdosed sugammadex`). Prototype on the merged base: sugammadex 2 mg/kg at TOF 2 → TOFR 0.9 in 2.12 min; 4 mg/kg at PTC → 2.23; 16 mg/kg → T1 10 % in 1.80; neostigmine 0.05 at TOF 2 → 18.3 min (NEO_G50 0.3); 0.07 at PTC → TOFR 0.35 at 10 min; the 0.5 mg/kg underdose peaks at 0.83 and never falls (R-7f-7). These are TARGETS on 7g's binding (R45): if a sugammadex band fails on your base, do NOT touch 7f's EC50s; record the measured time in the gate note under D-7f-2, send the orchestrator a request to 7g (its sugammadex effect-site ke0 0.095/0.152 or binding), and mark that test `it.fails` with the request id in its title. If a neostigmine band fails, re-fit `NEO_G50` within 0.3–1.2 only (`NEO_SMAX` fixed: it IS the ceiling); if none meets both neostigmine bands, keep 0.3, mark the TOF-2 test `it.fails` with the number and add a request for 7g's neostigmine tail (FU-3 item 2). The module, for reference:

- [x] **Step 3: `packages/engine-core/src/l2/neuro/neostigmine.ts`** (exact):

```ts
// Neostigmine's NMB effect (tables §5d Neo row: ceiling [P], peak ~10 min [TXT]; brief §4.9). The drug, its time
// course and its muscarinic effects are Stage 7g's gamma row, which publishes an acetylcholine gain on the bus
// (`bus.nmb.achGain`, 1 = none; R51 §3). 7f turns the gain into a multiplier on the non-depolarisers' EC50:
//   m = 1 + NEO_SMAX · x/(x + NEO_G50),   x = achGain − 1
// The CEILING is structural: m < 1 + NEO_SMAX however large the dose, so a deep block (TOF count < 2) cannot be
// lifted to recovery, and when 7g's curve fades before spontaneous recovery is complete the block returns
// (recurarisation). NEO_SMAX 0.7 [ENG] IS the ceiling (never fitted). NEO_G50 0.3 [ENG, fitted on 7g's gain curve within
// 0.3–1.2: 0.05 mg/kg at TOF 2 → TOFR 0.9 in 18.3 min (band 8–20; 0.6 gave 22.0); 0.07 mg/kg at PTC → TOFR 0.35 at 10 min].
export const NEO_SMAX = 0.7;
export const NEO_G50 = 0.3;

/** EC50 multiplier for the non-depolarisers from 7g's acetylcholine gain (1 = no neostigmine). */
export function neoEc50Mult(achGain: number): number {
  const x = Math.max(0, achGain - 1);
  return 1 + (NEO_SMAX * x) / (x + NEO_G50);
}
```

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/l2/neuro/reversal.test.ts packages/engine-core/test/l2/neuro/neostigmine.test.ts packages/engine-core/src/l2/neuro/neostigmine.ts
git commit -m "test(neuro): sugammadex 2/4/16 mg/kg on 7g's binding, neostigmine NEO_G50 0.3 fitted and its ceiling; underdose recurarisation it.fails (R-7f-7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: Interactions and neuromuscular profiles (`interactions.ts`)

**Files:**
- Create (module already created in Task 1 Step 4): `packages/engine-core/test/l2/neuro/interactions.test.ts`

**Interfaces:**
- Consumes: the rig (Task 3), `untilTof` (Task 4).
- Produces: `NmProfile = 'normal'|'myasthenia'|'lambertEaton'|'burn'|'denervation'`, `InteractionCtx { profile; volatileMac; mgMmolL; tempC }`, `ec50Multipliers(x) → Record<NmbAgent, number>`. 7f owns these multipliers (R51 §2: 7g's `bus.nmb.ec50Mult` is removed).

- [x] **Step 1: Write the test** `packages/engine-core/test/l2/neuro/interactions.test.ts` — the multipliers (unit) AND their clinical consequence on the rocuronium course on 7g's PK:

```ts
import { describe, expect, it } from 'vitest';
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';
import { give, rig } from '../../helpers/neuro.ts';
import { untilTof } from '../../helpers/neuro-nmb.ts';

const N = { profile: 'normal' as const, volatileMac: 0, mgMmolL: 0.9, tempC: 37 };

/** Minutes from rocuronium 0.6 mg/kg to T1 25 % with EC50 multiplier `ec50` at `tempC` (7g's clearance follows the temperature too). */
function rec25(ec50: number, tempC = 37): number {
  const r = rig();
  r.tempC = tempC;
  const m = { rocuronium: ec50, vecuronium: ec50, cisatracurium: ec50, succinylcholine: 1 };
  give(r, 'rocuronium', 0.6);
  const on = untilTof(r, (p) => p.tof.count === 0, 5, m);
  return on + untilTof(r, (p) => p.tof.t1 >= 0.25, 200, m);
}

describe('NMB interactions (scope 7f-1)', { timeout: 120_000 }, () => {
  it('1 MAC volatile: EC50 × 0.67; rocuronium duration +20–45 %', () => {
    const m = ec50Multipliers({ ...N, volatileMac: 1 }).rocuronium;
    expect(m).toBeCloseTo(1 / 1.5, 6);
    const ratio = rec25(m) / rec25(1);
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.45);
  });
  it('magnesium 2 mmol/L potentiates; hypothermia 34 °C: EC50 × 0.64 plus 7g\'s slower clearance prolong ≥ 30 %', () => {
    expect(ec50Multipliers({ ...N, mgMmolL: 2 }).rocuronium).toBeCloseTo(1 / 1.3, 6);
    const cold = ec50Multipliers({ ...N, tempC: 34 }).rocuronium;
    expect(cold).toBeCloseTo(0.64, 6);
    expect(ec50Multipliers({ ...N, tempC: 30 }).rocuronium).toBeCloseTo(0.6, 6);
    expect(rec25(cold, 34) / rec25(1)).toBeGreaterThan(1.3);
  });
  it('myasthenia: very sensitive to rocuronium, resistant to succinylcholine; burn: resistant to rocuronium', () => {
    const mg = ec50Multipliers({ ...N, profile: 'myasthenia' });
    expect(mg.rocuronium).toBeCloseTo(0.3, 6);
    expect(mg.succinylcholine).toBeCloseTo(2.6, 6);
    expect(rec25(0.3) / rec25(1)).toBeGreaterThan(1.8);
    const burn = rig();
    give(burn, 'rocuronium', 0.6);
    expect(untilTof(burn, (p) => p.tof.count === 0, 5, { rocuronium: 2.5, vecuronium: 2.5, cisatracurium: 2.5, succinylcholine: 1 })).toBeNaN(); // 0.6 mg/kg no longer gives a complete block
    expect(ec50Multipliers({ ...N, profile: 'lambertEaton' }).succinylcholine).toBeCloseTo(0.5, 6);
  });
});
```

- [x] **Step 2: Run; expect PASS** (3 tests; module from Task 1; prototype ratios on 7g's PK: 1 MAC ×1.42, 34 °C ×1.86, myasthenia ×3.71 — the 1 MAC ratio sits near its 1.45 bound): `… exec vitest run test/l2/neuro/interactions.test.ts`. The duration ratios are TARGETS on 7g's PK (R45): if one fails, report the measured ratio — do not change the multipliers' tables-derived sizes (the volatile and hypothermia sizes are [ENG]: record a proposed value in the gate note for the calibration pass instead).

- [x] **Step 3: `packages/engine-core/src/l2/neuro/interactions.ts`** (exact, as created in Task 1):

```ts
// NMB interactions and neuromuscular profiles (scope 7f-1; tables §5d, §1.5 [TXT]; sizes [ENG] unless cited). 7f owns
// these multipliers (R51 §2: 7g's `bus.nmb.ec50Mult` is removed from the 7g plan):
//   potent volatiles potentiate non-depolarisers: EC50 ÷ (1 + 0.5·MAC) (≈ −33 % at 1 MAC; sevoflurane > isoflurane in
//     trials, one factor here) [TXT direction; ENG size];
//   magnesium potentiates both classes: EC50 ÷ (1 + 0.3·(Mg − 1.0)) above 1.0 mmol/L (therapeutic 2–3.5) [TXT; ENG];
//   hypothermia: non-depolariser EC50 × max(0.6, 1 − 0.12 per °C below 37) (M10 ch. 24 p. 698: twitch force −10–16 %
//     per °C, the figure 7g's decision 7 cites) [TXT; ENG size]; the slower clearance is 7g's PK (−5 %/°C);
//   myasthenia gravis: non-depolarisers ×0.3 EC50 (very sensitive), succinylcholine resistant (ED95 ×2.6) [TXT];
//   Lambert–Eaton: sensitive to both (×0.3 / ×0.5) [TXT];
//   burns (> 48 h, > 20 % TBSA) and denervation/immobilisation: non-depolariser resistance ×2.5 EC50 [TXT]. Their
//     succinylcholine potassium surge is Stage 7c's (R51 §3), not 7f's.
import type { NmbAgent } from './bus.ts';

export type NmProfile = 'normal' | 'myasthenia' | 'lambertEaton' | 'burn' | 'denervation';

export interface InteractionCtx {
  profile: NmProfile;
  volatileMac: number; // potent volatiles only (brain, age-adjusted, from 7g's bus)
  mgMmolL: number;
  tempC: number; // core temperature
}

export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  const vol = 1 / (1 + 0.5 * Math.max(0, x.volatileMac));
  const mg = 1 / (1 + 0.3 * Math.max(0, x.mgMmolL - 1));
  const cold = Math.max(0.6, 1 - 0.12 * Math.max(0, 37 - x.tempC));
  let nd = vol * mg * cold;
  let dep = mg;
  switch (x.profile) {
    case 'myasthenia':
      nd *= 0.3;
      dep *= 2.6;
      break;
    case 'lambertEaton':
      nd *= 0.3;
      dep *= 0.5;
      break;
    case 'burn':
    case 'denervation':
      nd *= 2.5;
      break;
    default:
      break;
  }
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}
```

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/l2/neuro/interactions.test.ts
git commit -m "test(neuro): volatile/Mg/hypothermia potentiation and myasthenia/Lambert–Eaton/burn profiles on the rocuronium course (7g's PK)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: Anaesthetic depth (`depth.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/neuro/depth.ts`, `packages/engine-core/test/l2/neuro/depth-drive.test.ts` (this task writes the whole file; its `respiratory-drive` describe fails until Task 8 — run only the depth describe here with `-t "depth index"`)

**Interfaces:**
- Consumes: `FENT_EEG_POT` (Task 2); `ec50Multipliers` (Task 6, for the third describe).
- Produces: `DI_E0` 93, `MAC_DI50` 0.876, `N2O_DI_W` 0.1, `OPIOID_W` 0.2, `REMI_EEG_EC50` 11.2, `MIDAZ_DI50` 300, `KET_DI_RISE` 15, `KET_C50` 800, `EMG_RISE` 15, `MAC_AWAKE` 0.33, `MAC_BAR` 1.6, `OPIOID_MAC_RMAX` 0.7, `OPIOID_MAC_K` 0.6, `REMI_MAC_POT` 1.25, `GLYCO_U` 1.2; `DepthInputs { ageY; ce; macPotent; macN2o; t1; stimulus; glyco? }` (`stimulus` 0–1 = 7e's intensity / STIM_FULL; `glyco` = 7e's neuroglycopenia, decision 19), `DepthOut { diRaw; sr; macFrac; macEff; hypnotic; conscious; stress; antinoc; hypEq; movement }`, `ce50Propofol(ageY)` (ng/mL), `locPropofol(ageY)`, `opioidFentEq(ce)`, `depth(x)`, `smoothDi(prev, raw, dt, tauS = 20)`. MAC(age) is NOT here: 7g publishes age-adjusted MAC fractions (Mapleson; 7g Task 8 tests it).

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/neuro/depth-drive.test.ts` (exact; Task 8 makes the second describe pass):

```ts
import { describe, expect, it } from 'vitest';
import { depth } from '../../../src/l2/neuro/depth.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';

const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
const di = (ce: Partial<typeof C0>, mac: { potent?: number; n2o?: number } = {}, ageY = 40, t1 = 0, stimulus = 0) =>
  depth({ ageY, ce: { ...C0, ...ce }, macPotent: mac.potent ?? 0, macN2o: mac.n2o ?? 0, t1, stimulus });
const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const vent = (v: Partial<typeof V0>, macVolatile = 0) =>
  neuroResp({ vent: { ...V0, ...v }, macVolatile, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('depth index (tables §5d)', () => {
  it('awake 93; propofol Ce 3–4 µg/mL (35 y) → 35–50; 1.0 MAC potent volatile → 40–45', () => {
    expect(di({}).diRaw).toBeCloseTo(93, 5);
    expect(di({ propofol: 3000 }, {}, 35).diRaw).toBeGreaterThan(44);
    expect(di({ propofol: 3000 }, {}, 35).diRaw).toBeLessThan(50);
    expect(di({ propofol: 4000 }, {}, 35).diRaw).toBeGreaterThan(35);
    expect(di({ propofol: 4000 }, {}, 35).diRaw).toBeLessThan(40);
    expect(di({}, { potent: 1 }).diRaw).toBeGreaterThan(40);
    expect(di({}, { potent: 1 }).diRaw).toBeLessThan(45);
  });
  it('burst suppression below ~30: 2 MAC gives SR > 20 %, 1 MAC none', () => {
    expect(di({}, { potent: 2 }).sr).toBeGreaterThan(20);
    expect(di({}, { potent: 1 }).sr).toBe(0);
  });
  it('opioids alone barely move the index; ketamine raises it; N2O ~0', () => {
    expect(di({ remifentanil: 4 }).diRaw).toBeGreaterThan(90);
    expect(di({ ketamine: 1500 }).diRaw).toBeGreaterThan(93);
    expect(di({ ketamine: 1500 }).conscious).toBe(false);
    expect(di({}, { n2o: 70 / 104 }).diRaw).toBeGreaterThan(90);
  });
  it('MAC-awake: conscious at 0.25 MAC, not at 0.4 MAC', () => {
    expect(di({}, { potent: 0.25 }).conscious).toBe(true);
    expect(di({}, { potent: 0.4 }).conscious).toBe(false);
  });
  it('light anaesthesia: 0.5 MAC, no opioid, laryngoscopy → stress > 0.7 and movement when unparalysed; fentanyl 2 ng/mL + 1 MAC blunts it < 0.2', () => {
    const light = di({}, { potent: 0.5 }, 40, 1, 1);
    expect(light.stress).toBeGreaterThan(0.7);
    expect(light.movement).toBe(true);
    expect(di({}, { potent: 0.5 }, 40, 0, 1).movement).toBe(false);
    expect(di({ fentanyl: 2 }, { potent: 1 }, 40, 1, 1).stress).toBeLessThan(0.2);
  });
  it('antinociception (7e reads it): 0 awake, > 0.8 with fentanyl 2 ng/mL + 1 MAC; hypnotic MAC-equivalents rise with the agents', () => {
    expect(di({}).antinoc).toBe(0);
    expect(di({ fentanyl: 2 }, { potent: 1 }).antinoc).toBeGreaterThan(0.8);
    expect(di({}, { potent: 1 }).hypEq).toBeCloseTo(1, 9);
    expect(di({ propofol: 3000 }, {}, 35).hypEq).toBeCloseTo(3000 / 3080, 9);
  });
  it('neuroglycopenia (7e seam, decision 19): 1 → unconscious with the index < 60; absent → neutral', () => {
    const g = depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, glyco: 1 });
    expect(g.conscious).toBe(false);
    expect(g.diRaw).toBeLessThan(60);
    expect(depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0 }).diRaw).toBeCloseTo(93, 5);
  });
  it('EMG artefact: stimulated and unparalysed adds 10–20 points', () => {
    const a = di({ propofol: 3000 }, {}, 35, 1, 1).diRaw - di({ propofol: 3000 }, {}, 35, 0, 1).diRaw;
    expect(a).toBeGreaterThan(10);
    expect(a).toBeLessThan(20);
  });
});

describe('respiratory-drive depression (tables §5d)', () => {
  it('remifentanil: C50 0.92 ng/mL; 1 ng/mL → VE at fixed CO2 −50–60 %, resting −25–31 % (Nieuwenhuijs −58/−28)', () => {
    expect(vent({ opioid: 0.92 }).opioidDep).toBeCloseTo(0.5, 5);
    const r = vent({ opioid: 1 });
    expect(r.totalDep).toBeGreaterThan(0.5);
    expect(r.totalDep).toBeLessThan(0.6);
    expect(1 - r.veRest).toBeGreaterThan(0.25);
    expect(1 - r.veRest).toBeLessThan(0.31);
  });
  it('remifentanil curve is monotone; slope ×0.27 needs ≈ 2 ng/mL (Babenco bolus); apnoea by 5 ng/mL', () => {
    let prev = 0;
    for (const c of [0.25, 0.5, 1, 2, 3, 4]) {
      const d = vent({ opioid: c }).totalDep;
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
    expect(1 - vent({ opioid: 1.94 }).totalDep).toBeGreaterThan(0.22);
    expect(1 - vent({ opioid: 1.94 }).totalDep).toBeLessThan(0.32);
    expect(vent({ opioid: 5 }).apnoea).toBe(true);
  });
  it('opioid pattern: RR falls, VT kept; propofol pattern: VT falls, RR rises', () => {
    const o = vent({ opioid: 2 });
    expect(o.rrMult).toBeLessThan(0.6);
    expect(o.vtMult).toBeCloseTo(1, 5);
    const p = vent({ propofol: 2000 });
    expect(p.rrMult).toBeGreaterThan(1.2);
    expect(p.vtMult).toBeLessThan(0.6);
  });
  it('propofol 1 µg/mL → resting −10–16 %, fixed-CO2 −40–48 %; 1 MAC volatile fixed-CO2 −55–70 %', () => {
    const p = vent({ propofol: 1000 });
    expect(1 - p.veRest).toBeGreaterThan(0.1);
    expect(1 - p.veRest).toBeLessThan(0.16);
    expect(p.hypnoticDep).toBeGreaterThan(0.4);
    expect(p.hypnoticDep).toBeLessThan(0.48);
    expect(vent({}, 1).hypnoticDep).toBeGreaterThan(0.55);
    expect(vent({}, 1).hypnoticDep).toBeLessThan(0.7);
  });
  it('synergy: propofol 1 + remifentanil 1 depresses more than the product of each', () => {
    const both = vent({ propofol: 1000, opioid: 1 }).totalDep;
    const indep = 1 - (1 - vent({ propofol: 1000 }).totalDep) * (1 - vent({ opioid: 1 }).totalDep);
    expect(both).toBeGreaterThan(indep);
  });
  it('NMB: diaphragm 97 % blocked → apnoea; 50 % → full VT; residual TOFR 0.6 with a natural airway → partial obstruction', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0.97 }).apnoea).toBe(true);
    expect(neuroResp({ ...base, diaBlock: 0.5 }).vtMult).toBeCloseTo(1, 5);
    const ob = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true });
    expect(ob.obstruction).toBeGreaterThan(0.4);
    expect(ob.vtMult).toBeLessThan(0.6);
  });
  it('curare cleft only while a partial block wears off: none unparalysed, none at full block, visible at 60 % diaphragm block', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 42, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0 }).cleft).toBe(0);
    expect(neuroResp({ ...base, diaBlock: 0.99 }).cleft).toBeLessThan(0.15);
    expect(neuroResp({ ...base, diaBlock: 0.6 }).cleft).toBeGreaterThan(0.3);
  });
});

describe('interactions', () => {
  it('1 MAC volatile lowers non-depolariser EC50 by ~33 %; Mg 2 mmol/L by ~23 %; myasthenia ×0.3, sux resistant', () => {
    const N = { profile: 'normal' as const, volatileMac: 0, mgMmolL: 0.9, tempC: 37 };
    const v = ec50Multipliers({ ...N, volatileMac: 1 });
    expect(v.rocuronium).toBeGreaterThan(0.62);
    expect(v.rocuronium).toBeLessThan(0.72);
    expect(v.succinylcholine).toBe(1);
    expect(ec50Multipliers({ ...N, mgMmolL: 2 }).rocuronium).toBeCloseTo(1 / 1.3, 5);
    const mg = ec50Multipliers({ ...N, profile: 'myasthenia' });
    expect(mg.rocuronium).toBeCloseTo(0.3, 5);
    expect(mg.succinylcholine).toBeCloseTo(2.6, 5);
  });
});
```

The file holds **16 tests**: depth 8, drive 7, interactions 1.

- [x] **Step 2: Run** `… exec vitest run test/l2/neuro/depth-drive.test.ts`; expect FAIL (unresolved imports).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/neuro/depth.ts` (exact):

```ts
// Anaesthetic depth (tables §5d "Anaesthetic depth"). Pure functions of brain effect-site concentrations (ng/mL, from
// 7g's bus via bus.ts) and brain MAC fractions (age-adjusted by 7g: MAC(age) = MAC40·10^(−0.00269·(age − 40)),
// Mapleson). NOT a BIS algorithm: a BIS-like 0–100 index from a hypnotic interaction term
//   U = Ce_prop/Ce50_prop(age) + (MAC_potent + N2O_DI_W·MAC_N2O)/MAC_DI50 + OPIOID_W·Ce_opioidEEG/EEG_EC50 + Ce_midaz/MIDAZ_DI50
//   DI = 93·(1 − U^γ/(U^γ + 1)),  γ 1.89 below U = 1, 1.47 above (Eleveld BIS 2024 slopes)
// plus the teaching artefacts: ketamine raises the index (dissociation), N2O barely moves it, EMG adds 10–20 when the
// patient is unparalysed and stimulated, burst suppression below ~30 (suppression ratio shown).
// Consciousness is a SEPARATE hypnotic level (the index is not consciousness: ketamine, awareness under NMB).
import { FENT_EEG_POT } from './bus.ts';

export const DI_E0 = 93;
export const MAC_DI50 = 0.876; // [ENG] → DI 42 at 1.0 MAC (tables: 40–45)
export const N2O_DI_W = 0.1; // N2O ≈ 0 on the index [TXT]
export const OPIOID_W = 0.2; // tables §5d: opioids alone barely move the index
export const REMI_EEG_EC50 = 11.2; // ng/mL (Minto 1997); fentanyl FENT_EEG_POT × remifentanil (tables §5d)
export const MIDAZ_DI50 = 300; // ng/mL [VERIFY]
export const KET_DI_RISE = 15; // index points at full ketamine effect [ENG: "ketamine ↑ DI (paradox)"]
export const KET_C50 = 800; // ng/mL (hypnotic C50, [VERIFY])
export const EMG_RISE = 15; // tables §5d: +10–20 when unparalysed and stimulated [ENG]
export const MAC_AWAKE = 0.33; // Katoh 1993
export const MAC_BAR = 1.6; // MAC blocking adrenergic response (1.5–1.7) [TXT]
export const OPIOID_MAC_RMAX = 0.7; // MAC reduction ceiling [TXT]
export const OPIOID_MAC_K = 0.6; // fentanyl-eq ng/mL: −50 % at 1.5 ng/mL (tables §5d, remi 1.2)
export const REMI_MAC_POT = 1.25; // remifentanil 1.2 ng/mL ≈ fentanyl 1.5 for MAC reduction
/** Neuroglycopenia (7e, 0–1: glucose 60 → 30 mg/dL) as a hypnotic: 1 = unconscious, index ≈ 45 [ENG: coma below ~30 mg/dL]. */
export const GLYCO_U = 1.2;

export interface DepthInputs {
  ageY: number;
  ce: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number }; // brain, ng/mL(-eq)
  macPotent: number; // brain, age-adjusted MAC fraction of the potent volatiles (7g)
  macN2o: number; // brain, N2O (7g)
  t1: number; // thumb first twitch 0–1 (EMG needs muscle)
  stimulus: number; // 0–1 noxious stimulation now (7e's intensity / STIM_FULL, pipeline.ts)
  glyco?: number; // 0–1 neuroglycopenia (7e's endo.core.out.neuroglycopenia; 0 without 7e)
}

export interface DepthOut {
  diRaw: number;
  sr: number; // suppression ratio %
  macFrac: number; // age-adjusted MAC fraction (all agents, brain)
  macEff: number; // MAC fraction after opioid reduction (movement / awareness / MAC-BAR)
  hypnotic: number; // consciousness level: ≥ 1 unconscious
  conscious: boolean;
  stress: number; // 0–1 sympathetic response to the stimulus after blunting
  antinoc: number; // 0–1 blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc))
  hypEq: number; // hypnotic MAC-equivalents (opioid-reduced MAC + propofol Ce/Ce50): movement, MAC-BAR, 7e's thermoregulatory depth
  movement: boolean;
}

export function ce50Propofol(ageY: number): number {
  return 3.08 * Math.exp(-0.00635 * (ageY - 35)) * 1000; // ng/mL (Eleveld BIS 2024 via tables §5d)
}
/** Schnider C50 for loss of consciousness: 2.35 / 1.8 / 1.25 µg/mL at 25 / 50 / 75 y (tables §6.1). */
export function locPropofol(ageY: number): number {
  return Math.max(600, 2350 - 22 * (ageY - 25));
}
export function opioidFentEq(ce: DepthInputs['ce']): number {
  return ce.fentanyl + REMI_MAC_POT * ce.remifentanil;
}

export function depth(x: DepthInputs): DepthOut {
  const macFrac = x.macPotent + x.macN2o;
  const volU = x.macPotent + N2O_DI_W * x.macN2o;
  const awakeU = macFrac / MAC_AWAKE;
  const fe = opioidFentEq(x.ce);
  const red = (OPIOID_MAC_RMAX * fe) / (fe + OPIOID_MAC_K);
  const macEff = macFrac / (1 - red);
  const opEeg = x.ce.remifentanil + FENT_EEG_POT * x.ce.fentanyl;
  const glyco = Math.max(0, Math.min(1, x.glyco ?? 0));
  const u = x.ce.propofol / ce50Propofol(x.ageY) + volU / MAC_DI50 + (OPIOID_W * opEeg) / REMI_EEG_EC50 + x.ce.midazolam / MIDAZ_DI50 + GLYCO_U * glyco;
  const g = u < 1 ? 1.89 : 1.47;
  const ug = u > 0 ? u ** g : 0;
  const eKet = x.ce.ketamine / (x.ce.ketamine + KET_C50);
  const base = DI_E0 * (1 - ug / (ug + 1));
  const sr = Math.max(0, Math.min(100, ((30 - base) / 25) * 100));
  const emg = EMG_RISE * x.stimulus * Math.max(0, Math.min(1, x.t1));
  const diRaw = Math.max(0, Math.min(98, base + KET_DI_RISE * eKet + emg));
  // consciousness: propofol LOC C50, volatile MAC-awake (opioid-reduced), midazolam, ketamine (all additive)
  const hypnotic = x.ce.propofol / locPropofol(x.ageY) + awakeU / (1 - 0.5 * red) + x.ce.midazolam / 150 + x.ce.ketamine / KET_C50 + GLYCO_U * glyco;
  // nociception: stimulus blunted by opioid (fentanyl-eq C50 2 ng/mL) and by the hypnotic depth (MAC-BAR scale)
  const bOp = fe / (fe + 2);
  const hypEq = macEff + x.ce.propofol / ce50Propofol(x.ageY) / (1 - red); // MAC-equivalents
  const bHyp = hypEq ** 3 / (hypEq ** 3 + 1); // 50 % blunting at 1 MAC-eq, 80 % at MAC-BAR 1.6 [ENG]
  const antinoc = 1 - (1 - bOp) * (1 - bHyp);
  const stress = Math.max(0, Math.min(1, x.stimulus * (1 - antinoc)));
  const movement = x.stimulus >= 0.3 && x.t1 > 0.25 && hypEq < 1; // MAC = 50 % move to incision: below 1 MAC-eq they move [ENG]
  return { diRaw, sr, macFrac, macEff, hypnotic, conscious: hypnotic < 1, stress, antinoc, hypEq, movement };
}

/** Displayed index: first-order smoothing τ 20 s (tables: 15–30 s device lag), stepped at dt. */
export function smoothDi(prev: number, raw: number, dt: number, tauS = 20): number {
  return prev + ((raw - prev) * dt) / tauS;
}
```

- [x] **Step 4: Run the depth describe; expect PASS** (8 tests): `… exec vitest run test/l2/neuro/depth-drive.test.ts -t "depth index"` (the file still fails to import `drive.ts` until Task 8: if Vitest refuses to run the file, create an empty `export {}` stub `src/l2/neuro/drive.ts` and delete it in Task 8 Step 2 — the exact file there replaces it). Also run `-t "interactions"` → 1 passed.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/neuro/depth.ts packages/engine-core/test/l2/neuro/depth-drive.test.ts
git commit -m "feat(neuro): BIS-like depth index on 7g's age-adjusted MAC, MAC-awake consciousness, stress, antinociception and movement (tables §5d)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: Respiratory-drive depression and the NMB ventilatory consequence (`drive.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/neuro/drive.ts`

**Interfaces:**
- Consumes: `NeuroInputs['vent']` (Task 2: `opioid` is already the remifentanil-equivalent at the ventilatory site, fentanyl weighted by `FENT_VENT_POT`, D-7f-3).
- Produces: `REMI_VENT_C50` 0.92, `REMI_VENT_H` 1.25, `PROP_VENT_C50` 1170, `VOL_VENT_C50` 0.8, `MIDAZ_VENT_C50` 150, `SYNERGY` 0.5, `APNOEA_IN` 0.42, `APNOEA_OUT` 0.5, `DIAPH_WEAK` 0.3, `DIAPH_APNOEA` 0.05; `DriveInputs { vent; macVolatile; diaBlock; tofr; di; naturalAirway; wasApnoeic }`, `NeuroResp { opioidDep; hypnoticDep; totalDep; veRest; rrMult; vtMult; apnoea; pMaxMult; obstruction; nmbVtMult; cleft }`, `neuroResp(x)`. **Consumers:** Stage 3's `driverCtx` (Task 12: `rrMult`, `vtMult`, `apnoea`, `obstruction`, `cleft`), Stage 7b's MODELED drive through `spont.ts` (Task 13: `opioidDep`, `hypnoticDep`, `pMaxMult`, `nmbVtMult`, `obstruction`; `DIAPH_APNOEA`).

- [x] **Step 1: The test exists** (Task 7, including the cleft test). Run `… exec vitest run test/l2/neuro/depth-drive.test.ts -t "respiratory-drive"`; expect FAIL (no `drive.ts`, or the Task 7 stub).

- [x] **Step 2: Implement** `packages/engine-core/src/l2/neuro/drive.ts` (exact; it replaces any Task 7 stub):

```ts
// Respiratory-drive depression (tables §5d "Respiratory-drive depression" feeding §4.6) and the NMB ventilatory
// consequence. Outputs are the Stage 7b drive inputs (opioidDep, hypnoticDep: depression of VE at a FIXED PaCO2) plus
// the multipliers Stage 3's MANUAL spontaneous breathing uses on the instructor's rr/vt (RESTING ventilation, where the
// rise in PaCO2 partly compensates), the NMB strength (pMax) and the airway flags. Concentrations come from 7g's bus
// (bus.ts): the opioid input is the remifentanil-equivalent at 7g's SEPARATE ventilatory site (R51 §2).
//   opioid:   dOp = x^1.25/(1 + x^1.25), x = Ce_vent,remi-eq/0.92 ng/mL (Bouillon 2003; fentanyl 0.55× in bus.ts, D-7f-3, Q54)
//   hypnotic: propofol C50 1.17 µg/mL, h 1.5 [ENG: Nieuwenhuijs 2003 −44 % at 1 µg/mL]; volatile C50 0.8 MAC, h 2 [ENG:
//             co2Slope ×0.4 at 1 MAC]; midazolam C50 150 ng/mL [VERIFY]; ketamine ≤ 0.3 [TXT: minimal]
//   synergy:  1 − (1 − dOp)(1 − dHyp)(1 − 0.5·dOp·dHyp) (Nieuwenhuijs 2003 "opioid–propofol synergy") [ENG size]
//   resting VE (MANUAL): (1 − dOp²)(1 − dHyp^2.48)(1 − 0.5·dOp·dHyp): remi 1 ng/mL −28 %, propofol 1 µg/mL −13 %
//             (Nieuwenhuijs 2003 resting values); pattern: opioid → RR falls, VT kept (slow, deep); hypnotic → VT falls,
//             RR rises (rapid, shallow) (tables §5d); apnoea when resting VE < 0.42 (resumes > 0.5) [ENG: propofol 2.5 mg/kg → brief apnoea].
export const REMI_VENT_C50 = 0.92;
export const REMI_VENT_H = 1.25;
export const PROP_VENT_C50 = 1170;
export const VOL_VENT_C50 = 0.8;
export const MIDAZ_VENT_C50 = 150;
export const SYNERGY = 0.5;
export const APNOEA_IN = 0.42;
export const APNOEA_OUT = 0.5;
export const DIAPH_WEAK = 0.3; // diaphragm strength below which VT falls (reserve) [ENG]
export const DIAPH_APNOEA = 0.05; // no effective breath below 5 % strength [ENG]

export interface DriveInputs {
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number }; // ng/mL(-eq), bus.ts
  macVolatile: number; // brain MAC fraction of the potent volatiles (N2O excluded)
  diaBlock: number; // 0–1
  tofr: number; // thumb TOF ratio (pharyngeal weakness proxy)
  di: number; // raw depth index
  naturalAirway: boolean; // no tube / supraglottic device
  wasApnoeic: boolean;
}

export interface NeuroResp {
  opioidDep: number;
  hypnoticDep: number;
  totalDep: number;
  veRest: number;
  rrMult: number;
  vtMult: number;
  apnoea: boolean;
  pMaxMult: number;
  obstruction: number; // 0–1 upper-airway obstruction (natural airway only); ≥ 0.9 = complete
  nmbVtMult: number; // VT factor from diaphragm weakness alone (Stage 7b's MODELED path multiplies its own VT by it)
  cleft: number; // 0–1 own diaphragmatic effort visible during mechanical breaths while a block wears off
}

const hill = (x: number, h: number) => (x > 0 ? x ** h / (1 + x ** h) : 0);

export function neuroResp(x: DriveInputs): NeuroResp {
  const dOp = hill(x.vent.opioid / REMI_VENT_C50, REMI_VENT_H);
  const dProp = hill(x.vent.propofol / PROP_VENT_C50, 1.5);
  const dVol = hill(x.macVolatile / VOL_VENT_C50, 2);
  const dMid = hill(x.vent.midazolam / MIDAZ_VENT_C50, 1.5);
  const dKet = (0.3 * x.vent.ketamine) / (x.vent.ketamine + 2000);
  const dHyp = 1 - (1 - dProp) * (1 - dVol) * (1 - dMid) * (1 - dKet);
  const syn = 1 - SYNERGY * dOp * dHyp;
  const totalDep = 1 - (1 - dOp) * (1 - dHyp) * syn;
  const opR = 1 - dOp * dOp;
  const hyR = 1 - dHyp ** 2.48;
  const veRest = opR * hyR * syn;
  const strength = 1 - x.diaBlock;
  const nmbVt = Math.max(0, Math.min(1, strength / DIAPH_WEAK));
  let apnoea = x.wasApnoeic ? veRest < APNOEA_OUT : veRest < APNOEA_IN;
  if (strength < DIAPH_APNOEA) apnoea = true;
  // upper airway: residual block (TOFR < 0.9) and sedation (DI < 60 or dOp > 0.3: tables §4.6 uaCollapse)
  const residual = Math.max(0, Math.min(1, (0.9 - x.tofr) / 0.4)) * 0.8;
  const sedation = x.di < 60 || dOp > 0.3 ? Math.max(0, Math.min(1, (60 - x.di) / 20 + (dOp > 0.3 ? 0.5 : 0))) : 0;
  const obstruction = x.naturalAirway ? Math.max(residual, sedation) : 0;
  return {
    opioidDep: dOp, hypnoticDep: dHyp, totalDep, veRest,
    rrMult: apnoea ? 0 : opR * hyR ** -0.6,
    vtMult: apnoea ? 0 : hyR ** 1.6 * syn * nmbVt * (1 - Math.min(0.9, obstruction)),
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt,
    // the curare cleft is the sign of a PARTIAL block wearing off under mechanical ventilation (tables §5d)
    cleft: x.diaBlock > 0.05 ? Math.max(0, Math.min(1, strength * (1 - totalDep))) : 0,
  };
}
```

- [x] **Step 3: Run; expect PASS** — `… exec vitest run test/l2/neuro/depth-drive.test.ts` → 16 passed (depth 8, drive 7, interactions 1).

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/src/l2/neuro/drive.ts
git commit -m "feat(neuro): ventilatory depression on 7g's ventilatory site (remifentanil C50 0.92), synergy, resting vs fixed-CO2 VE, NMB apnoea/weak breaths, obstruction and cleft (tables §5d, §4.6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: Outputs to the other systems (`outputs.ts`)

**Files:**
- Create (module already created in Task 1 Step 4): `packages/engine-core/test/l2/neuro/outputs.test.ts`

**Interfaces:**
- Produces: `NeuroOutputs { mapSetShiftMmHg; cmro2Mult; pupilMm; antinoc; nmb; thermoDepth }`, `neuroOutputs(x)`. Consumers: 7d (`cmro2Mult`, request R-7f-3), 7e (`antinoc`, `nmb`, `thermoDepth`, mirrored on `NeuroState`'s top level by Task 11 because 7e reads `ps.neuro.{antinoc, nmb, thermoDepth}` — R51 §6, the 7e plan's Requests). Nothing for 7a (R51 addendum 8: the anaesthetic baroreflex blunting is 7g's circulation PD).

- [x] **Step 1: Write the test** `packages/engine-core/test/l2/neuro/outputs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { neuroOutputs } from '../../../src/l2/neuro/outputs.ts';

const base = { diRaw: 93, opioidFentEq: 0, antinoc: 0, thumbBlock: 0, hypEq: 0 };
describe('neuro outputs (decision 9)', () => {
  it('awake: neutral; no baroreflex field (7g owns it, R51 addendum 8)', () => {
    const o = neuroOutputs(base);
    expect([o.mapSetShiftMmHg, o.cmro2Mult, o.pupilMm, o.antinoc, o.nmb, o.thermoDepth]).toEqual([0, 1, 4, 0, 0, 0]);
    expect('baroGainMult' in o).toBe(false);
  });
  it('anaesthetised at DI 40: CMRO2 ×0.6, MAP shift −10 (published only); burst suppression ×0.45; opioid miosis; 7e fields clamped', () => {
    const o = neuroOutputs({ ...base, diRaw: 40, hypEq: 1, antinoc: 0.9, thumbBlock: 1 });
    expect(o.cmro2Mult).toBeCloseTo(0.6, 9);
    expect(o.mapSetShiftMmHg).toBeCloseTo(-10, 9);
    expect([o.thermoDepth, o.antinoc, o.nmb]).toEqual([1, 0.9, 1]);
    expect(neuroOutputs({ ...base, hypEq: 2.4 }).thermoDepth).toBe(1.5);
    expect(neuroOutputs({ ...base, diRaw: 20 }).cmro2Mult).toBe(0.45);
    expect(neuroOutputs({ ...base, opioidFentEq: 3 }).pupilMm).toBeLessThan(2.6);
  });
});
```

- [x] **Step 2: Run both; expect PASS** — `… exec vitest run test/l2/neuro/outputs.test.ts test/l2/neuro/depth-drive.test.ts` (`outputs.test.ts` 2, `depth-drive.test.ts` all 16).

- [x] **Step 3: `packages/engine-core/src/l2/neuro/outputs.ts`** (exact, as created in Task 1):

```ts
// What the anaesthetic state hands to the other systems (scope 7f-2; each consumer reads it when present).
// NOT here, by R51: the circulation's drug effects — including the propofol/volatile baroreflex-gain depression — are
// Stage 7g's PD (addendum 8); potassium (succinylcholine) is 7c's; MH is 7e's (§3, §6).
//   7d brain: CMRO2 × (tables §5.1: −50–60 % at burst suppression; ≈ −40 % at DI 40 [ENG]);
//   7e endocrine/thermal: `antinoc`, `nmb`, `thermoDepth` — the fields the 7e plan reads as ps.neuro.{antinoc, nmb,
//     thermoDepth}; NeuroState mirrors them on its top level (pipeline.ts);
//   published only: the anaesthetic MAP operating-point shift (A11 forbids applying it: Q-7f-1) and the pupil size.
export interface NeuroOutputs {
  mapSetShiftMmHg: number; // published only (A11, Q-7f-1)
  cmro2Mult: number;
  pupilMm: number; // optional display: opioid miosis 2 mm, awake 4 mm [TXT]
  /** 0–1 antinociception: blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc)). */
  antinoc: number;
  /** 0–1 neuromuscular block of peripheral muscle (thumb block; 7e: shivering × (1 − nmb)). */
  nmb: number;
  /** 0–1.5 thermoregulatory depth = hypnotic MAC-equivalents (Sessler: thresholds fall linearly with concentration) [ENG scale]. */
  thermoDepth: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function neuroOutputs(x: { diRaw: number; opioidFentEq: number; antinoc: number; thumbBlock: number; hypEq: number }): NeuroOutputs {
  const anaes = clamp01((93 - x.diRaw) / 53); // 0 awake → 1 at DI 40
  return {
    mapSetShiftMmHg: anaes > 0 ? -10 * anaes : 0,
    cmro2Mult: x.diRaw < 30 ? 0.45 : 1 - 0.4 * anaes,
    pupilMm: Math.max(1.5, 4 - 2 * (x.opioidFentEq / (x.opioidFentEq + 1))),
    antinoc: clamp01(x.antinoc),
    nmb: clamp01(x.thumbBlock),
    thermoDepth: Math.max(0, Math.min(1.5, x.hypEq)),
  };
}
```

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/l2/neuro/outputs.test.ts
git commit -m "test(neuro): outputs for 7d/7e — CMRO2, antinociception, NMB fraction, thermoregulatory depth; MAP shift published only; nothing for 7a (R51 addendum 8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 10: TOF stimulator device (`tof-device.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/neuro/tof-device.ts`, `packages/engine-core/test/l2/neuro/tof-device.test.ts`

**Interfaces:**
- Consumes: `normal`, `Sfc32State` (`src/rng/sfc32.ts`), `TofReading` (Task 4), `EngineEvent` (Task 1 types).
- Produces: `TOF_DEFAULT_INTERVAL_S` 15, `PTC_REPORT_S` 23, `TETANUS_LOCKOUT_S` 60, `AMG_SD` 0.02, `NEVER_T`, `TofDevice`, `createTofDevice(rng)`, `validateTofAction(action, intervalS)`, `tofAction(d, action, t, intervalS?)`, `tofStep(d, t, reading, out)`.

- [x] **Step 1: Write the failing test** (exact):

```ts
import { describe, expect, it } from 'vitest';
import { seedStream } from '../../../src/rng/sfc32.ts';
import type { EngineEvent } from '../../../src/types.ts';
import { tofFrom } from '../../../src/l2/neuro/nmb.ts';
import { createTofDevice, tofAction, tofStep, validateTofAction } from '../../../src/l2/neuro/tof-device.ts';

const tofs = (out: EngineEvent[]) => out.filter((e): e is Extract<EngineEvent, { type: 'tof' }> => e.type === 'tof');

describe('TOF stimulator (decision 13)', () => {
  it('validates actions and intervals', () => {
    expect(validateTofAction('start', 15)).toBeUndefined();
    expect(validateTofAction('start', 5)).toMatch(/12–60/);
    expect(validateTofAction('tetanus', undefined)).toMatch(/start, stop/);
  });
  it('start → a train at once, then every intervalS; stop ends them; ratio only at count 4', () => {
    const d = createTofDevice(seedStream(1, 'neuro-tof'));
    const out: EngineEvent[] = [];
    tofAction(d, 'start', 10, 20);
    for (let t = 10; t < 70.05; t += 0.1) tofStep(d, Math.round(t * 10) / 10, tofFrom(0.85, 1, 0), out);
    expect(tofs(out).map((e) => e.t)).toEqual([10, 30, 50, 70]);
    expect(tofs(out)[0]?.ratio).toBeNull();
    tofAction(d, 'stop', 71);
    const out2: EngineEvent[] = [];
    for (let t = 71; t < 120; t += 0.1) tofStep(d, t, tofFrom(0.02, 1, 0), out2);
    expect(tofs(out2)).toEqual([]);
    tofAction(d, 'train', 120);
    tofStep(d, 120, tofFrom(0.02, 1, 0), out2);
    const one = tofs(out2)[0];
    expect(one?.count).toBe(4);
    expect(one?.ratio).toBeGreaterThan(0.85);
    expect(one?.ratio).toBeLessThanOrEqual(1.05);
    const m = out2.find((e) => e.type === 'measurement') as Extract<EngineEvent, { type: 'measurement' }>;
    expect(m.values.tofCount?.value).toBe(4);
  });
  it('PTC reports 23 s later (count 0 only) and locks TOF out for 60 s', () => {
    const d = createTofDevice(seedStream(2, 'neuro-tof'));
    const out: EngineEvent[] = [];
    tofAction(d, 'start', 0, 15);
    tofStep(d, 0, tofFrom(0.99, 1, 0), out);
    tofAction(d, 'ptc', 5);
    for (let t = 5; t < 80; t += 0.1) tofStep(d, Math.round(t * 10) / 10, tofFrom(0.985, 1, 0), out);
    const ptc = tofs(out).find((e) => e.mode === 'ptc');
    expect(ptc?.t).toBe(5);
    expect(ptc?.ptc).toBeGreaterThan(0);
    expect(tofs(out).filter((e) => e.mode === 'tof' && e.t > 5 && e.t < 65)).toEqual([]);
  });
});
```

- [x] **Step 2: Run; expect FAIL** (unresolved import).

- [x] **Step 3: Implement** (exact):

```ts
// TOF stimulator "device" (scope 7f-1; plan decision 13): a train of four every `intervalS` (default 15 s, 12–60 s)
// while running, a single train on demand, and a post-tetanic count (50 Hz tetanus 5 s, 3 s pause, 15 twitches at
// 1 Hz: the result is reported 23 s after the command). Readings are MEASURED: acceleromyography noise (SD 0.02 on
// the ratio [ENG]), the ratio shown only when all four twitches are present (count 4), and no TOF for 60 s after a
// tetanus (post-tetanic potentiation would falsify it; devices lock it out) [TXT]. Each train emits a `tof` event
// time-stamped at the stimulus (the train marker) and a `measurement` with tofCount/tofRatio/ptc.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { EngineEvent } from '../../types.ts';
import type { TofReading } from './nmb.ts';

export const TOF_DEFAULT_INTERVAL_S = 15;
export const PTC_REPORT_S = 23;
export const TETANUS_LOCKOUT_S = 60;
export const AMG_SD = 0.02;

export interface TofDevice {
  running: boolean;
  intervalS: number;
  nextT: number; // next scheduled train (NEVER when stopped)
  ptcAt: number; // time a PTC result is due, or −1
  lockUntil: number;
  rng: Sfc32State;
}

export const NEVER_T = 1e12;

export function createTofDevice(rng: Sfc32State): TofDevice {
  return { running: false, intervalS: TOF_DEFAULT_INTERVAL_S, nextT: NEVER_T, ptcAt: -1, lockUntil: -1, rng };
}

export function validateTofAction(action: string, intervalS: number | undefined): string | undefined {
  if (!['start', 'stop', 'train', 'ptc'].includes(action)) return 'tof action must be start, stop, train or ptc';
  if (intervalS !== undefined && !(Number.isFinite(intervalS) && intervalS >= 12 && intervalS <= 60)) return 'tof intervalS must be 12–60 s';
  return undefined;
}

export function tofAction(d: TofDevice, action: 'start' | 'stop' | 'train' | 'ptc', t: number, intervalS?: number): void {
  if (intervalS !== undefined) d.intervalS = intervalS;
  if (action === 'start') {
    d.running = true;
    d.nextT = Math.max(t, d.lockUntil);
  } else if (action === 'stop') {
    d.running = false;
    d.nextT = NEVER_T;
  } else if (action === 'train') d.nextT = Math.max(t, d.lockUntil);
  else {
    d.ptcAt = t + PTC_REPORT_S;
    d.lockUntil = t + TETANUS_LOCKOUT_S;
    if (d.nextT < d.lockUntil) d.nextT = d.running ? d.lockUntil : NEVER_T;
  }
}

/** Called every neuro step (0.1 s) with the TRUE reading; emits due trains into `out`. */
export function tofStep(d: TofDevice, t: number, r: TofReading, out: EngineEvent[]): void {
  if (d.ptcAt >= 0 && t >= d.ptcAt) {
    const ptc = r.count === 0 ? r.ptc : null; // PTC is only meaningful when the TOF count is 0
    out.push({ type: 'tof', t: d.ptcAt - PTC_REPORT_S, mode: 'ptc', count: r.count, ratio: null, ptc, twitches: [] });
    out.push({ type: 'measurement', t, values: { ptc: { value: ptc, flag: ptc === null ? 'invalid' : 'valid', at: t } } });
    d.ptcAt = -1;
  }
  if (t < d.nextT) return;
  const noise = AMG_SD * normal(d.rng);
  const ratio = r.count === 4 ? Math.max(0, Math.min(1.05, r.ratio + noise)) : null;
  const tw = r.twitches.map((x) => Math.round(Math.max(0, x * (1 + noise)) * 100) / 100);
  out.push({ type: 'tof', t, mode: 'tof', count: r.count, ratio: ratio === null ? null : Math.round(ratio * 100) / 100, ptc: null, twitches: tw });
  out.push({
    type: 'measurement', t,
    values: {
      tofCount: { value: r.count, flag: 'valid', at: t },
      tofRatio: { value: ratio === null ? null : Math.round(ratio * 100), flag: ratio === null ? 'invalid' : 'valid', at: t },
    },
  });
  d.nextT = d.running ? t + d.intervalS : NEVER_T;
}
```

- [x] **Step 4: Run; expect PASS** (3 tests).

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/neuro/tof-device.ts packages/engine-core/test/l2/neuro/tof-device.test.ts
git commit -m "feat(neuro): TOF stimulator device — trains every N s with a marker event, PTC with tetanic lockout, AMG noise (decision 13)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: The neuro pipeline (`pipeline.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/neuro/pipeline.ts`, `packages/engine-core/test/l2/neuro/pipeline.test.ts`

**Interfaces:**
- Consumes: every module above; 7g's `DrugBus` and `DRUG_BUS_NEUTRAL` (`src/types-pk.ts`); `StimulusEvent` (Task 1); `seedStream` (`src/rng/sfc32.ts`; the stream name `'neuro-tof'` is new and does not shift any existing stream); the rig (Task 3) for the naloxone test.
- Produces: `NEURO_DT_S` 0.1, `FASC_FROM_S` 25, `FASC_TO_S` 45, `MH_VOLATILE_MAC` 0.1, `STIM_FULL` 1.5, `NeuroEnv { tempC; mechanical; neuroglycopenia?; macF? }`, `NeuroState` (fields listed in the file; `resp: NeuroResp` is the hook, `outputs: NeuroOutputs`, top-level `antinoc`/`nmb`/`thermoDepth` for 7e, `doseSeenT`, `stim { intensity; level }`, `last { tof; thumb; dia; d; x }`, `fasc`/`emgBase` for the engine), `createNeuroState(profile, seed)`, `validateNeuroCommand(cmd)` (reason | undefined | null — null for every `drug` and `vaporiser` event; validates `stimulus` only inside the TEMPORARY OWNER block, decision 17), `applyNeuroCommand(ns, cmd, t)` (true = consumed; false for `stimulus` (observed) and for everything that is not 7f's), `fasciculating(ns, t)`, `stepNeuroTo(ns, tEnd, env, bus)`. There is no PK field in `NeuroState` and no PK stepping (R51 §1).

- [x] **Step 1: Write the failing test** (exact; concentrations come from a bus fixture — R51: 7f tests construct the bus — except the naloxone test, which drives 7g's real PK through the rig; if Task 1 Step 1 printed "7E ALREADY MERGED", omit the test marked `[temporary owner until 7e]`):

```ts
import { describe, expect, it } from 'vitest';
import type { Command, EngineEvent } from '../../../src/types.ts';
import { applyNeuroCommand, createNeuroState, stepNeuroTo, validateNeuroCommand, type NeuroState } from '../../../src/l2/neuro/pipeline.ts';
import { busFixture, dose, nmbAgent, opioid, vol } from '../../helpers/neuro-bus.ts';
import { give as giveDrug, rig, runTo } from '../../helpers/neuro.ts';

const ENV = { tempC: 37, mechanical: false };
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
const dev = (action: Record<string, unknown>) => ({ id: 'd', issuedBy: 't', type: 'device', action }) as Command;
const give = (ns: NeuroState, c: Command, t: number) => {
  expect(validateNeuroCommand(c)).toBeUndefined();
  return applyNeuroCommand(ns, c, t);
};
const kinds = (ns: NeuroState) => ns.out.filter((e): e is Extract<EngineEvent, { type: 'neuroMark' }> => e.type === 'neuroMark').map((e) => e.kind);
const lastAn = (ns: NeuroState) => ns.out.filter((e): e is Extract<EngineEvent, { type: 'anaesthesia' }> => e.type === 'anaesthesia').pop();
const ROC_FULL = { rocuronium: nmbAgent(3000, 3000, 0.6) };
const SEVO = (mac: number) => ({ sevoflurane: vol(mac, 1.8) }); // steady state: end-tidal = brain

describe('neuro pipeline', () => {
  it('validates its own commands; drug and vaporiser events are 7g\'s (null / false: never consumed, R51 §3)', () => {
    const roc = ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    expect(validateNeuroCommand(roc)).toBeNull();
    expect(validateNeuroCommand(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 }))).toBeNull();
    expect(applyNeuroCommand(createNeuroState({}, 1), roc, 0)).toBe(false);
    expect(validateNeuroCommand(ev({ kind: 'airwayDevice', device: 'lma' }))).toMatch(/none, ett or sga/);
    expect(validateNeuroCommand(ev({ kind: 'neuroProfile', cholinesterase: 'homozygous' }))).toMatch(/patient-profile/);
    expect(validateNeuroCommand(dev({ device: 'tof', action: 'start', intervalS: 5 }))).toMatch(/12–60/);
    expect(validateNeuroCommand(dev({ device: 'nibp', action: 'start' }))).toBeNull();
  });
  // TEMPORARY OWNER (R51 addendum 17): the Stage 7e executor deletes this test together with the marked validator block
  it('[temporary owner until 7e] stimulus is 7e\'s shape: intensity 0–2 required', () => {
    expect(validateNeuroCommand(ev({ kind: 'stimulus', intensity: 1.5 }))).toBeUndefined();
    expect(validateNeuroCommand(ev({ kind: 'stimulus', intensity: 3 }))).toMatch(/intensity/);
    expect(validateNeuroCommand(ev({ kind: 'stimulus' }))).toMatch(/required/);
  });
  it('stimulus is OBSERVED (apply false, 7e consumes it): intensity/1.5 → 7f\'s level, held until the next event', () => {
    const ns = createNeuroState({}, 1);
    expect(applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 1 }), 0)).toBe(false);
    expect(ns.stim.level).toBeCloseTo(1 / 1.5, 9);
    stepNeuroTo(ns, 600, ENV, busFixture());
    expect(ns.stim.level).toBeCloseTo(1 / 1.5, 9); // no duration: it persists
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 2 }), 600);
    expect(ns.stim.level).toBe(1);
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 0 }), 610);
    expect(ns.stim.level).toBe(0);
  });
  it('steps on the 10 Hz grid, one anaesthesia event per second, JSON-safe; propofol 3 µg/mL → loss of consciousness', () => {
    const ns = createNeuroState({ weightKg: 70 }, 1);
    stepNeuroTo(ns, 60, ENV, busFixture({ cns: { propCe: 3 } }));
    expect(ns.k).toBe(601);
    expect(ns.out.filter((e) => e.type === 'anaesthesia').length).toBe(60);
    expect(kinds(ns)).toContain('lossOfConsciousness');
    expect(lastAn(ns)?.ce.propofol).toBe(3000);
    expect(JSON.parse(JSON.stringify(ns)).k).toBe(601);
  });
  it('the resp hook: remifentanil 5 ng/mL at 7g\'s ventilatory site → apnoea mark and rrMult 0', () => {
    const ns = createNeuroState({}, 1);
    stepNeuroTo(ns, 5, ENV, busFixture({ cns: { opioidCeRemiEq: 3 }, agents: { remifentanil: opioid(3, 5) } }));
    expect(ns.resp.apnoea).toBe(true);
    expect(ns.resp.rrMult).toBe(0);
    expect(kinds(ns)).toContain('apnoea');
  });
  it('naloxone (F2) on 7g\'s real PK: remifentanil 0.3 µg/kg/min → apnoea; naloxone 0.4 mg → breathing again within 3 min', () => {
    const r = rig();
    const ns = createNeuroState({}, 1);
    giveDrug(r, 'remifentanil', 0.3, 'mcg/kg/min', true);
    runTo(r, 10, (bus, tMin) => stepNeuroTo(ns, tMin * 60, ENV, bus));
    expect(ns.resp.apnoea).toBe(true);
    giveDrug(r, 'naloxone', 0.4, 'mg');
    let back = Number.NaN;
    runTo(r, 13, (bus, tMin) => {
      stepNeuroTo(ns, tMin * 60, ENV, bus);
      if (Number.isNaN(back) && !ns.resp.apnoea) back = tMin - 10;
    });
    expect(back).toBeLessThan(3);
    expect(ns.resp.veRest).toBeGreaterThan(0.5);
    expect(kinds(ns)).toContain('breathing');
  });
  it('awareness under NMB: full rocuronium block, no hypnotic → awareness mark; the depth device reports DI', () => {
    const ns = createNeuroState({}, 1);
    applyNeuroCommand(ns, dev({ device: 'depth', action: 'on' }), 0);
    stepNeuroTo(ns, 10, ENV, busFixture({ agents: ROC_FULL }));
    expect(kinds(ns)).toContain('awareness');
    expect(lastAn(ns)?.awarenessRisk).toBe(true);
    expect(ns.out.some((e) => e.type === 'measurement' && e.values.di !== undefined)).toBe(true);
  });
  it('light anaesthesia: 0.5 MAC potent volatile, unparalysed, laryngoscopy (7e intensity 1.5) → movement mark and stress > 0.6', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    const bus = busFixture({ volatiles: SEVO(0.5) });
    stepNeuroTo(ns, 60, ENV, bus);
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 1.5 }), 60);
    stepNeuroTo(ns, 70, ENV, bus);
    expect(kinds(ns)).toContain('movement');
    expect(lastAn(ns)?.stress).toBeGreaterThan(0.6);
  });
  it('the gas monitor\'s mac numeric is END-TIDAL (Σ fet/macAge); the event carries the brain MAC separately', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    stepNeuroTo(ns, 5, ENV, busFixture({ volatiles: { sevoflurane: { fet: 1.8, brain: 0.9, macAge: 1.8, macFrac: 0.5 } } })); // wash-in: Et ahead of brain
    const m = ns.out.filter((e): e is Extract<EngineEvent, { type: 'measurement' }> => e.type === 'measurement' && e.values.mac !== undefined).pop();
    expect(m?.values.mac?.value).toBe(1);
    expect(m?.values.etAa?.value).toBe(1.8);
    expect([lastAn(ns)?.mac, lastAn(ns)?.macBrain]).toEqual([1, 0.5]);
  });
  it('7e seams (duck-typed, neutral without 7e): neuroglycopenia 1 → unconscious; hypothermic macF 0.8 deepens the same tension', () => {
    const a = createNeuroState({}, 1);
    stepNeuroTo(a, 5, { ...ENV, neuroglycopenia: 1 }, busFixture());
    expect(lastAn(a)?.conscious).toBe(false);
    const warm = createNeuroState({}, 1);
    const cold = createNeuroState({}, 1);
    stepNeuroTo(warm, 5, ENV, busFixture({ volatiles: SEVO(0.8) }));
    stepNeuroTo(cold, 5, { ...ENV, macF: 0.8 }, busFixture({ volatiles: SEVO(0.8) }));
    expect(lastAn(cold)?.macBrain).toBeCloseTo(1, 2);
    expect(lastAn(cold)?.di ?? 0).toBeLessThan((lastAn(warm)?.di ?? 0) - 5);
  });
  it('succinylcholine on bus.doses is observed once: fasciculation 25 s later; MH-susceptible → one mhTrigger mark; no potassium output', () => {
    const ns = createNeuroState({ neuro: { mhSusceptible: true } }, 1);
    const bus = busFixture({ doses: [dose('succinylcholine', 1, 0)] });
    stepNeuroTo(ns, 30, ENV, bus);
    stepNeuroTo(ns, 60, ENV, bus); // the same log read again: nothing new
    expect(kinds(ns).filter((k) => k === 'fasciculation')).toHaveLength(1);
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
    expect('kRiseMmolL' in ns.outputs).toBe(false);
  });
  it('publishes the 7e fields ps.neuro.{antinoc, nmb, thermoDepth}: neutral awake; 1 MAC + fentanyl 2 ng/mL + full block', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    expect([ns.antinoc, ns.nmb, ns.thermoDepth]).toEqual([0, 0, 0]);
    stepNeuroTo(ns, 5, { tempC: 37, mechanical: true }, busFixture({
      cns: { opioidCeRemiEq: 3.2 },
      volatiles: SEVO(1),
      agents: { fentanyl: opioid(2, 2), ...ROC_FULL },
    }));
    expect(ns.antinoc).toBeGreaterThan(0.8);
    expect(ns.nmb).toBeGreaterThan(0.99);
    expect(ns.thermoDepth).toBeGreaterThan(1);
    expect(ns.thermoDepth).toBeLessThanOrEqual(1.5);
  });
  it('residual block with a natural airway → obstruction; with a tube → none', () => {
    const a = createNeuroState({}, 1);
    give(a, ev({ kind: 'airwayDevice', device: 'none' }), 0);
    const bus = busFixture({ agents: { rocuronium: nmbAgent(605, 605, 0.6) } }); // thumb T1 ≈ 0.81 → TOFR ≈ 0.6
    stepNeuroTo(a, 5, ENV, bus);
    expect(a.resp.obstruction).toBeGreaterThan(0.3);
    give(a, ev({ kind: 'airwayDevice', device: 'ett' }), 5);
    stepNeuroTo(a, 6, ENV, bus);
    expect(a.resp.obstruction).toBe(0);
  });
});
```

- [x] **Step 2: Run; expect FAIL** (unresolved import).

- [x] **Step 3: Implement** (exact):

```ts
// Stage 7f pipeline (R32): the neuro state, its commands, and the 10 Hz step the engine runs inside advance() AFTER
// Stage 7g's advancePk (it reads ps.pk.bus) and BEFORE Stage 3's respiratory pipeline (R51 §3 chain order). 7f has NO
// PK (R51 §1) and consumes no drug or vaporiser event: it observes 7g's accepted doses on `bus.doses`. Plain JSON-safe
// data throughout (look-ahead clone, snapshots).
// `stimulus` is Stage 7e's event (R51 addenda 12, 17: `{ kind: 'stimulus', intensity: 0–2 }`, held until the next one):
// 7f OBSERVES it (apply returns false) and maps intensity → its 0–1 depth stimulus (STIM_FULL). Until 7e merges, 7f's
// validator is its TEMPORARY OWNER (one marked block the 7e executor deletes). 7e's two outputs 7f reads are duck-typed
// seams with neutral fallbacks (NeuroEnv.neuroglycopenia, NeuroEnv.macF).
//   step: doses (bus.doses) → bus (bus.ts) → NMB block + TOF (nmb.ts, neostigmine.ts, interactions.ts) → depth
//         (depth.ts) → drive (drive.ts: ns.resp is the hook Stage 3/7b read) → outputs (outputs.ts; ns.antinoc/nmb/
//         thermoDepth for 7e) → marks, TOF device, depth/agent numerics (1 Hz) and the instructor `anaesthesia` event (1 Hz).
import { seedStream } from '../../rng/sfc32.ts';
import type { Command, EngineEvent, Measured, NumericId, PatientProfile } from '../../types.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../types-pk.ts';
import type { NeuroClinicalEvent, NeuroDeviceAction, NeuroMarkKind, NeuroProfile, StimulusEvent } from '../../types-neuro.ts';
import { newDoses, NMB_AGENTS, readBus, VOLATILE_IDS, type NeuroAgentId, type NeuroInputs, type NmbAgent, type VolatileId } from './bus.ts';
import { phase2Fraction, siteBlock, tofFrom, type TofReading } from './nmb.ts';
import { neoEc50Mult } from './neostigmine.ts';
import { ec50Multipliers, type NmProfile } from './interactions.ts';
import { depth, opioidFentEq, smoothDi, type DepthOut } from './depth.ts';
import { neuroResp, type NeuroResp } from './drive.ts';
import { neuroOutputs, type NeuroOutputs } from './outputs.ts';
import { createTofDevice, tofAction, tofStep, validateTofAction, type TofDevice } from './tof-device.ts';

export const NEURO_DT_S = 0.1;
/** Fasciculations after succinylcholine: from 25 s to 45 s after the dose (block is complete at ~60 s) [TXT; ENG timing]. */
export const FASC_FROM_S = 25;
export const FASC_TO_S = 45;
/** Potent-volatile brain MAC above which an MH-susceptible patient is exposed (mhTrigger mark; MH itself is 7e's) [ENG]. */
export const MH_VOLATILE_MAC = 0.1;
/** 7e's stimulus intensity that is 7f's full (1.0) noxious stimulus: 1.5 = laryngoscopy/sternotomy (7e's scale) [ENG]. */
export const STIM_FULL = 1.5;

export interface NeuroEnv {
  tempC: number;
  mechanical: boolean;
  /** Stage 7e `endo.core.out.neuroglycopenia` 0–1 (duck-typed by the engine; 0 without 7e). */
  neuroglycopenia?: number;
  /** Stage 7e `cascade(th).macF` — MAC requirement × (−5 %/°C below 37; tables §5.3); 1 without 7e (request R-7f-8). */
  macF?: number;
}

export interface NeuroState {
  k: number; // next step index (time k·0.1 s)
  ageY: number;
  profile: { nm: NmProfile; mhSusceptible: boolean; mgMmolL: number };
  doseSeenT: number; // latest bus.doses time already observed (R51 §3)
  stim: { intensity: number; level: number }; // 7e's intensity 0–2 (held) and 7f's 0–1 level
  airway: 'auto' | 'none' | 'ett' | 'sga';
  depthOn: boolean;
  diShown: number;
  tof: TofDevice;
  last: { tof: TofReading; thumb: number; dia: number; d: DepthOut; x: NeuroInputs };
  resp: NeuroResp;
  outputs: NeuroOutputs;
  /** Read by Stage 7e as ps.neuro.{antinoc, nmb, thermoDepth} (R51 §6; the 7e plan's Requests): mirrors of `outputs`. */
  antinoc: number;
  nmb: number;
  thermoDepth: number;
  flags: { conscious: boolean; aware: boolean; moved: boolean; recovered: boolean; recurarised: boolean; mhMarked: boolean };
  fasc: { from: number; to: number };
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  out: EngineEvent[];
}

const IDLE_RESP: NeuroResp = {
  opioidDep: 0, hypnoticDep: 0, totalDep: 0, veRest: 1, rrMult: 1, vtMult: 1, apnoea: false, pMaxMult: 1, obstruction: 0, nmbVtMult: 1, cleft: 0,
};

export function createNeuroState(profile: PatientProfile | undefined, seed: number): NeuroState {
  const np: NeuroProfile = profile?.neuro ?? {};
  const ageY = profile?.ageY ?? 40;
  const x0 = readBus(DRUG_BUS_NEUTRAL);
  const d0 = depth({ ageY, ce: x0.brain, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, glyco: 0 });
  return {
    k: 0, ageY,
    profile: { nm: np.nm ?? 'normal', mhSusceptible: np.mhSusceptible ?? false, mgMmolL: np.mgMmolL ?? 0.9 },
    doseSeenT: -1, stim: { intensity: 0, level: 0 }, airway: 'auto', depthOn: false,
    diShown: d0.diRaw, tof: createTofDevice(seedStream(seed, 'neuro-tof')),
    last: { tof: tofFrom(0, 0, 0), thumb: 0, dia: 0, d: d0, x: x0 },
    resp: { ...IDLE_RESP },
    outputs: neuroOutputs({ diRaw: d0.diRaw, opioidFentEq: 0, antinoc: 0, thumbBlock: 0, hypEq: 0 }),
    antinoc: 0, nmb: 0, thermoDepth: 0,
    flags: { conscious: true, aware: false, moved: false, recovered: false, recurarised: false, mhMarked: false },
    fasc: { from: -1, to: -1 }, emgBase: null, out: [],
  };
}

// --- commands ------------------------------------------------------------------------------------------------

/**
 * Validation hook: a reason, undefined (accepted) or null (not a Stage 7f command). Every `drug` and `vaporiser` event
 * is 7g's — null here; the engine runs this hook AFTER 7g's (R51 §3), so 7f never sees one it could consume.
 */
export function validateNeuroCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'device') {
    const a = cmd.action as NeuroDeviceAction | { device: string };
    if (a.device === 'tof') {
      const t = a as Extract<NeuroDeviceAction, { device: 'tof' }>;
      return validateTofAction(t.action, t.intervalS);
    }
    if (a.device === 'depth') return ['on', 'off'].includes((a as { action: string }).action) ? undefined : 'depth action must be on or off';
    return null;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as NeuroClinicalEvent | { kind: string };
  switch (ev.kind) {
    // --- Stage 7f TEMPORARY OWNER of `stimulus` (R51 addendum 17) — the Stage 7e executor DELETES this case: 7e's
    // validateEndoCommand then validates the one shape (same messages). 7f only observes it (apply returns false). ---
    case 'stimulus': {
      const i = (ev as { intensity?: number }).intensity;
      if (i === undefined) return 'intensity is required';
      return Number.isFinite(i) && i >= 0 && i <= 2 ? undefined : 'intensity must be a finite number in 0–2';
    }
    // --- end TEMPORARY OWNER ---
    case 'airwayDevice': {
      const a = ev as Extract<NeuroClinicalEvent, { kind: 'airwayDevice' }>;
      return ['none', 'ett', 'sga'].includes(a.device) ? undefined : 'device must be none, ett or sga';
    }
    case 'neuroProfile': {
      const p = ev as Extract<NeuroClinicalEvent, { kind: 'neuroProfile' }>;
      if (p.nm !== undefined && !['normal', 'myasthenia', 'lambertEaton', 'burn', 'denervation'].includes(p.nm)) return 'unknown nm profile';
      if (p.mgMmolL !== undefined && !(Number.isFinite(p.mgMmolL) && p.mgMmolL >= 0.3 && p.mgMmolL <= 6)) return 'mgMmolL must be 0.3–6';
      return p.cholinesterase === undefined ? undefined : 'cholinesterase is a patient-profile field (set at creation; 7g\'s PK reads it)';
    }
    default:
      return null; // drug, vaporiser, …: 7g validates and consumes them; 7f observes bus.doses
  }
}

/** Apply a validated command at sim time t. Returns true when it was consumed (never for drug/vaporiser/stimulus events). */
export function applyNeuroCommand(ns: NeuroState, cmd: Command, t: number): boolean {
  if (cmd.type === 'device') {
    const a = cmd.action as NeuroDeviceAction | { device: string };
    if (a.device === 'tof') {
      const x = a as Extract<NeuroDeviceAction, { device: 'tof' }>;
      tofAction(ns.tof, x.action, t, x.intervalS);
      return true;
    }
    if (a.device === 'depth') {
      ns.depthOn = (a as { action: string }).action === 'on';
      return true;
    }
    return false;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as NeuroClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'stimulus': {
      // OBSERVED, never consumed (7e's event, R51 addenda 12/17): held until the next stimulus event
      const i = Math.max(0, (ev as StimulusEvent).intensity);
      ns.stim = { intensity: i, level: Math.min(1, i / STIM_FULL) };
      ns.flags.moved = false;
      return false;
    }
    case 'airwayDevice':
      ns.airway = (ev as Extract<NeuroClinicalEvent, { kind: 'airwayDevice' }>).device;
      return true;
    case 'neuroProfile': {
      const p = ev as Extract<NeuroClinicalEvent, { kind: 'neuroProfile' }>;
      if (p.nm !== undefined) ns.profile.nm = p.nm;
      if (p.mhSusceptible !== undefined) ns.profile.mhSusceptible = p.mhSusceptible;
      if (p.mgMmolL !== undefined) ns.profile.mgMmolL = p.mgMmolL;
      return true;
    }
    default:
      return false;
  }
}

// --- the step ------------------------------------------------------------------------------------------------
function mark(ns: NeuroState, t: number, kind: NeuroMarkKind): void {
  ns.out.push({ type: 'neuroMark', t, kind });
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Doses 7g accepted since the last pass (R51 §3): succinylcholine → fasciculation window and, if susceptible, the MH mark. */
function observeDoses(ns: NeuroState, bus: DrugBus): void {
  const { doses, seenT } = newDoses(bus, ns.doseSeenT);
  ns.doseSeenT = seenT;
  for (const d of doses) {
    if (d.agent !== 'succinylcholine') continue;
    ns.fasc = { from: d.t + FASC_FROM_S, to: d.t + FASC_TO_S };
    if (ns.profile.mhSusceptible && !ns.flags.mhMarked) {
      mark(ns, d.t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }
  }
}

function stepOnce(ns: NeuroState, t: number, env: NeuroEnv, x: NeuroInputs): void {
  // NMB
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: ns.profile.mgMmolL, tempC: env.tempC });
  const neo = neoEc50Mult(x.achGain);
  const mult: Record<NmbAgent, number> = { rocuronium: m.rocuronium * neo, vecuronium: m.vecuronium * neo, cisatracurium: m.cisatracurium * neo, succinylcholine: m.succinylcholine };
  const th = siteBlock(x.nmj, 'thumb', mult);
  const di = siteBlock(x.dia, 'dia', mult);
  const ndShare = th.b > 0 ? th.nd / Math.max(1e-9, th.nd + th.dep) : 0;
  const tof = tofFrom(th.b, ndShare, phase2Fraction(x.suxCumMgPerKg));
  // depth
  // 7e's hypothermic MAC reduction (cascade macF: the same brain tension is a larger MAC fraction) and neuroglycopenia
  const macF = Math.max(0.3, env.macF ?? 1);
  const d = depth({ ageY: ns.ageY, ce: x.brain, macPotent: x.macPotent / macF, macN2o: x.macN2o / macF, t1: tof.t1, stimulus: ns.stim.level, glyco: env.neuroglycopenia ?? 0 });
  ns.diShown = smoothDi(ns.diShown, d.diRaw, NEURO_DT_S);
  // drive
  const natural = ns.airway === 'none' || (ns.airway === 'auto' && !env.mechanical);
  const wasApnoeic = ns.resp.apnoea;
  ns.resp = neuroResp({ vent: x.vent, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic });
  // outputs (7d, 7e)
  ns.outputs = neuroOutputs({ diRaw: d.diRaw, opioidFentEq: opioidFentEq(x.brain), antinoc: d.antinoc, thumbBlock: th.b, hypEq: d.hypEq });
  ns.antinoc = ns.outputs.antinoc;
  ns.nmb = ns.outputs.nmb;
  ns.thermoDepth = ns.outputs.thermoDepth;
  // MH exposure to a potent volatile: a mark only (MH is 7e's, R51 §6)
  if (ns.profile.mhSusceptible && !ns.flags.mhMarked && x.macPotent > MH_VOLATILE_MAC) {
    mark(ns, t, 'mhTrigger');
    ns.flags.mhMarked = true;
  }
  // marks
  if (ns.flags.conscious && !d.conscious) mark(ns, t, 'lossOfConsciousness');
  if (!ns.flags.conscious && d.conscious) mark(ns, t, 'emergence');
  ns.flags.conscious = d.conscious;
  const paralysed = tof.t1 < 0.1;
  if (d.conscious && paralysed && !ns.flags.aware) mark(ns, t, 'awareness');
  ns.flags.aware = d.conscious && paralysed;
  if (d.movement && !ns.flags.moved) {
    mark(ns, t, 'movement');
    ns.flags.moved = true;
  }
  if (ns.resp.apnoea !== wasApnoeic) mark(ns, t, ns.resp.apnoea ? 'apnoea' : 'breathing');
  if (tof.count === 4 && tof.ratio >= 0.9) ns.flags.recovered = true;
  else if (ns.flags.recovered && !ns.flags.recurarised && (tof.count < 4 || tof.ratio < 0.8)) {
    mark(ns, t, 'recurarisation');
    ns.flags.recurarised = true;
  }
  if (t >= ns.fasc.from && t - NEURO_DT_S < ns.fasc.from) mark(ns, t, 'fasciculation');
  ns.last = { tof, thumb: th.b, dia: di.b, d, x };
  // devices and 1 Hz events
  tofStep(ns.tof, t, tof, ns.out);
  if (ns.k > 0 && ns.k % 10 === 0) emitSecond(ns, t);
}

function emitSecond(ns: NeuroState, t: number): void {
  const { d, x } = ns.last;
  const values: Partial<Record<NumericId, Measured>> = {};
  if (ns.depthOn) {
    const emg = ns.stim.level > 0 && ns.last.tof.t1 > 0.25;
    values.di = { value: emg ? null : Math.round(ns.diShown), flag: emg ? 'questionable' : 'valid', at: t };
    values.sr = { value: Math.round(d.sr), flag: 'valid', at: t };
  }
  // gas monitor: END-TIDAL MAC (Σ fet/macAge, all agents: R51 addendum 17) and the dominant potent agent's Fet,
  // from 7g's bus (decision 13); the brain MAC (7g's macFrac) is the anaesthesia event's `macBrain`
  let dom: VolatileId | null = null;
  for (const a of VOLATILE_IDS) {
    const e = x.et[a];
    if (!e || a === 'n2o') continue;
    if (e.fet > 0.02 && (dom === null || e.fet > (x.et[dom]?.fet ?? 0))) dom = a;
  }
  if (x.macEt > 0.02) {
    values.mac = { value: Math.round(x.macEt * 10) / 10, flag: 'valid', at: t };
    if (dom) values.etAa = { value: Math.round((x.et[dom]?.fet ?? 0) * 10) / 10, flag: 'valid', at: t };
  }
  if (Object.keys(values).length > 0) ns.out.push({ type: 'measurement', t, values });
  const ce: Partial<Record<NeuroAgentId, number>> = {};
  const add = (a: NeuroAgentId, c: number) => {
    if (c > 0.001) ce[a] = r2(c);
  };
  add('propofol', x.brain.propofol);
  add('remifentanil', x.brain.remifentanil);
  add('fentanyl', x.brain.fentanyl);
  add('midazolam', x.brain.midazolam);
  add('ketamine', x.brain.ketamine);
  for (const a of NMB_AGENTS) add(a, x.nmj[a]);
  const etPct: Partial<Record<VolatileId, number>> = {};
  for (const a of VOLATILE_IDS) {
    const e = x.et[a];
    if (e && e.fet > 0.005) etPct[a] = r2(e.fet);
  }
  const tof = ns.last.tof;
  ns.out.push({
    type: 'anaesthesia', t,
    di: Math.round(d.diRaw), sr: Math.round(d.sr), mac: r2(x.macEt), macBrain: r2(d.macFrac), macEff: r2(d.macEff), etPct, ce,
    tof: { count: tof.count, ratio: r2(tof.ratio), ptc: tof.ptc, t1: r2(tof.t1) },
    block: { thumb: r2(ns.last.thumb), dia: r2(ns.last.dia) },
    drive: { opioidDep: r2(ns.resp.opioidDep), hypnoticDep: r2(ns.resp.hypnoticDep), veRest: r2(ns.resp.veRest), apnoea: ns.resp.apnoea, obstruction: r2(ns.resp.obstruction) },
    conscious: d.conscious, awarenessRisk: d.diRaw > 60 && tof.count <= 2, stress: r2(d.stress), movement: d.movement,
    outputs: ns.outputs,
  });
}

/** True while succinylcholine fasciculations show (engine: ECG EMG artefact). */
export function fasciculating(ns: NeuroState, t: number): boolean {
  return t >= ns.fasc.from && t < ns.fasc.to;
}

/**
 * Step the neuro state on its 10 Hz grid up to and including time tEnd (s). `bus` is 7g's DrugBus as `advancePk` left
 * it in the same pass (the engine calls this right after `advancePk`); every sub-step of the pass reads that one bus.
 */
export function stepNeuroTo(ns: NeuroState, tEnd: number, env: NeuroEnv, bus: DrugBus): void {
  observeDoses(ns, bus);
  const x = readBus(bus);
  while (ns.k * NEURO_DT_S <= tEnd + 1e-9) {
    stepOnce(ns, ns.k * NEURO_DT_S, env, x);
    ns.k++;
  }
}
```

- [x] **Step 4: Run; expect PASS** (13 tests; 12 if 7e merged first) and `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck` clean. If 7e merged first: delete the `case 'stimulus'` block between the `TEMPORARY OWNER` markers in `validateNeuroCommand` (7e's validator owns it), keep the observing `case 'stimulus'` in `applyNeuroCommand`. The naloxone test is the F2 regression guard: without the division in `readBus` it fails (`back` NaN).

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/neuro/pipeline.ts packages/engine-core/test/l2/neuro/pipeline.test.ts
git commit -m "feat(neuro): neuro pipeline on 7g's bus — commands, observed doses and 7e's stimulus (temporary owner until 7e), naloxone, 7e seams, 10 Hz step, resp hook, end-tidal mac numeric, 1 Hz anaesthetic-state event" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Engine and respiratory wiring (neuro runs after 7g's pk inside `advance()`, its hook shapes the breaths)

**Files:**
- Modify: `packages/engine-core/src/engine.ts`, `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/src/l2/resp/driver.ts` (all additive, marked `// Stage 7f`), `packages/engine-core/vite.config.ts` (one SLOW line)
- Modify (declared exception E-7f-1, compile fix): `packages/controller/src/session/controller-session.ts` (one line: the log formatter's `device` case)
- Create: `packages/engine-core/test/engine/neuro-engine.test.ts`

**Interfaces:**
- Consumes: `createNeuroState`, `validateNeuroCommand`, `applyNeuroCommand`, `stepNeuroTo`, `fasciculating`, `NeuroState` (Task 11), `NeuroResp` (Task 8), `pcheOf` (Task 2); 7g's `ps.pk` (`advancePk`, `ps.pk.bus`, `pkPatientOf`, its validate/apply hooks) and `ECG_RATE`; `mergeModifiers` (already imported by the engine).
- Produces: `PipelineState.neuro: NeuroState`; `RespCtx.neuro?: NeuroResp`; `DriverCtx.obstructed?: boolean`, `DriverCtx.cleft?: number`; engine `syncNeuro(simT)` (private). Task 13 extends `driverCtx` and `RespCtx` (`hco3`).

**Before editing `engine.ts` (R51 §7):** `git fetch origin && git merge origin/main`, run `npx -y pnpm@9.15.9 --filter @pme/engine-core test`, then place every insert below by the chain order (validate/apply: device → 7g pk → **7f neuro** → 7d → 7c → 7e → Stage 3 → hemo; advance: 7g pk → **7f neuro** → resp → blood → endo → organs → hemo — R51 addendum 14), re-anchoring on the merged lines rather than on any literal that no longer matches. The anchors quoted below are the prototype base's (5670fe5 + 7c + FU-2); each occurs once there. Record the anchors you used in the gate note.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/engine/neuro-engine.test.ts` (exact; ≈ 25 s on a laptop, it yields every sim-minute; prototype: 8 passed):

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `t${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: 'mg' | 'mg/kg' | 'mcg/kg' | 'mcg' | 'mcg/kg/min', infusion = false) =>
  ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) });
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };

async function run(e: ReturnType<typeof createEngine>, toS: number): Promise<void> {
  for (let t = Math.ceil(e.now().simT / 60) * 60; t < toS; t += 60) {
    e.advanceTo(Math.min(t + 60, toS));
    await yieldNow();
  }
  e.advanceTo(toS);
}

describe('Stage 7f through the engine (drug events through 7g, R51)', { timeout: 180_000 }, () => {
  it('rocuronium 0.6 mg/kg: the stimulator reads TOF 0 by 2 min and spontaneous TOFR ≥ 90 % at 55–95 min (R51 addendum 17)', async () => {
    const e = createEngine({ seed: 3, patient: ADULT });
    const tofs: Extract<EngineEvent, { type: 'tof' }>[] = [];
    e.on((x) => { if (x.type === 'tof') tofs.push(x); }, ['tof']);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } } as Body)).accepted).toBe(true);
    expect(e.dispatch(drug('rocuronium', 0.6, 'mg/kg')).accepted).toBe(true);
    await run(e, 100 * 60);
    const zero = tofs.find((x) => x.count === 0);
    expect(zero && zero.t).toBeLessThan(135);
    const back = tofs.find((x) => x.t > 600 && x.count === 4 && (x.ratio ?? 0) >= 0.9);
    expect(back && back.t / 60).toBeGreaterThan(55);
    expect(back && back.t / 60).toBeLessThan(95);
    expect(tofs.length).toBeGreaterThan(390);
  });
  it('sugammadex 2 mg/kg at TOF 2 → a train reads TOFR ≥ 90 % within 3.5 min (train every 15 s)', async () => {
    const e = createEngine({ seed: 4, patient: ADULT });
    const tofs: Extract<EngineEvent, { type: 'tof' }>[] = [];
    e.on((x) => { if (x.type === 'tof') tofs.push(x); }, ['tof']);
    e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } } as Body));
    e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
    let given = -1;
    for (let t = 60; t < 45 * 60 && given < 0; t += 15) {
      e.advanceTo(t);
      if (t % 60 === 0) await yieldNow();
      const last = tofs[tofs.length - 1];
      if (last && last.t > 600 && last.count >= 2) {
        e.dispatch(drug('sugammadex', 2, 'mg/kg'));
        given = t;
      }
    }
    expect(given).toBeGreaterThan(0);
    await run(e, given + 300);
    const ok = tofs.find((x) => x.t > given && x.count === 4 && (x.ratio ?? 0) >= 0.9);
    expect(ok && (ok.t - given) / 60).toBeLessThan(3.5);
  });
  it('remifentanil infusion stops spontaneous breaths (apnoea mark, no breath events); stopping it restores breathing', async () => {
    const e = createEngine({ seed: 5, patient: ADULT });
    const marks: string[] = [];
    let breaths = 0;
    let lastBreath = 0;
    e.on((x) => {
      if (x.type === 'neuroMark') marks.push(x.kind);
      if (x.type === 'breath') { breaths++; lastBreath = x.t; }
    });
    e.dispatch(drug('remifentanil', 1, 'mcg/kg'));
    e.dispatch(drug('remifentanil', 0.4, 'mcg/kg/min', true));
    await run(e, 600);
    expect(marks).toContain('apnoea');
    expect(600 - lastBreath).toBeGreaterThan(30);
    e.dispatch(drug('remifentanil', 0, 'mcg/kg/min', true));
    await run(e, 1200); // remifentanil context-sensitive half-time ≈ 2–4 min (7g decision 3): Ce falls below the apnoea level within minutes
    expect(marks).toContain('breathing');
    const before = breaths;
    await run(e, 1500);
    expect(breaths - before).toBeGreaterThan(40); // RR ≈ 12 × 5 min, opioid tail allowed
  });
  it('naloxone (F2): remifentanil 0.3 µg/kg/min makes the patient apnoeic; naloxone 0.4 mg restores spontaneous breaths within 3 min', async () => {
    const e = createEngine({ seed: 10, patient: ADULT });
    const marks: { t: number; k: string }[] = [];
    const breaths: number[] = [];
    e.on((x) => {
      if (x.type === 'neuroMark') marks.push({ t: x.t, k: x.kind });
      if (x.type === 'breath') breaths.push(x.t);
    });
    e.dispatch(drug('remifentanil', 0.3, 'mcg/kg/min', true));
    await run(e, 600);
    expect(marks.some((m) => m.k === 'apnoea')).toBe(true);
    expect(breaths.filter((t) => t > 540).length).toBe(0);
    expect(e.dispatch(drug('naloxone', 0.4, 'mg')).accepted).toBe(true);
    await run(e, 900);
    const back = marks.find((m) => m.k === 'breathing' && m.t > 600);
    expect(back && (back.t - 600) / 60).toBeLessThan(3);
    expect(breaths.filter((t) => t > 780).length).toBeGreaterThan(10); // RR ≥ 5/min over the last 2 min, the infusion still running
  });
  it('stimulus is 7e\'s event, observed by 7f: accepted by the engine (7f validates it until 7e lands), laryngoscopy under 0.5 MAC → movement', async () => {
    const e = createEngine({ seed: 11, patient: ADULT });
    const marks: string[] = [];
    e.on((x) => { if (x.type === 'neuroMark') marks.push(x.kind); });
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1.2, fgfLpm: 6 }));
    await run(e, 900);
    expect(e.dispatch(ev({ kind: 'stimulus', intensity: 3 })).accepted).toBe(false);
    expect(e.dispatch(ev({ kind: 'stimulus', intensity: 1.5 })).accepted).toBe(true);
    await run(e, 960);
    expect(marks).toContain('movement');
  });
  it('anaesthesia event every second with depth, MAC and TOF; propofol (7g\'s Eleveld Ce) deepens the index', async () => {
    const e = createEngine({ seed: 6, patient: ADULT });
    const an: Extract<EngineEvent, { type: 'anaesthesia' }>[] = [];
    e.on((x) => { if (x.type === 'anaesthesia') an.push(x); }, ['anaesthesia']);
    expect(e.dispatch(drug('propofol', 2, 'mg/kg')).accepted).toBe(true);
    await run(e, 180);
    expect(an.length).toBeGreaterThanOrEqual(179);
    const nadir = Math.min(...an.map((a) => a.di));
    expect(nadir).toBeGreaterThan(38);
    expect(nadir).toBeLessThan(52);
    expect(an[an.length - 1]?.conscious).toBe(false);
  });
  it('succinylcholine: 7g consumes the dose, 7f observes it (fasciculation mark); 7f leaves ECG potassium alone (7c owns it, R51 §3)', async () => {
    const e = createEngine({ seed: 7, patient: { ...ADULT, neuro: { nm: 'burn' } } });
    const marks: string[] = [];
    e.on((x) => { if (x.type === 'neuroMark') marks.push(x.kind); });
    const st = () => (e.snapshot().state as { st: { mods: { k: number }; blood?: unknown } }).st;
    const k0 = st().mods.k;
    expect(e.dispatch(drug('succinylcholine', 1.5, 'mg/kg')).accepted).toBe(true);
    await run(e, 300);
    expect(marks).toContain('fasciculation');
    if (st().blood === undefined) expect(st().mods.k).toBe(k0); // without 7c nothing moves K; with 7c its deltas do
  });
  it('determinism: same seed and commands → identical tof and anaesthesia streams', async () => {
    const go = async () => {
      const e = createEngine({ seed: 9, patient: { weightKg: 70 } });
      const out: string[] = [];
      e.on((x) => { if (x.type === 'tof' || x.type === 'anaesthesia') out.push(JSON.stringify(x)); });
      e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body));
      e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
      e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.2, fgfLpm: 6 }));
      await run(e, 300);
      return out;
    };
    expect(await go()).toEqual(await go());
  });
});
```

- [x] **Step 2: Run; expect FAIL** (`device tof is not implemented until later stages` / no `tof` events): `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/neuro-engine.test.ts`.

- [x] **Step 3: Respiratory seams.** In `packages/engine-core/src/l2/resp/driver.ts`, in `interface DriverCtx`, after `  complianceMl: number;` add:

```ts
  /** Stage 7f: complete upper-airway obstruction of spontaneous breaths (sedation / residual block, natural airway). */
  obstructed?: boolean;
  /** Stage 7f: own diaphragmatic effort during mechanical breaths while a block wears off (curare cleft). */
  cleft?: number;
```

In `makeCycle`, replace `    severity: sev, cleft: mech ? d.cleft : 0, fio2: fio2For(d, ctx, t, mech), fico2: d.fico2, cutAt: NEVER, emitted: false,` + the closing `  };` of the `const c: Cycle = {` literal with:

```ts
    severity: sev, cleft: mech ? Math.max(d.cleft, ctx.cleft ?? 0) : 0, fio2: fio2For(d, ctx, t, mech), fico2: d.fico2, cutAt: NEVER, emitted: false,
  };
  if (!mech && ctx.obstructed && d.airway === 'patent') { // Stage 7f: sedation/residual-block obstruction (plan decision 12)
    c.exch = false;
    c.sampled = 'none';
    c.vt = 0;
    c.effort = 1;
  }
```

In `packages/engine-core/src/l2/resp/pipeline.ts`:
- after `import { l1Target, setL1Target, type L1State } from '../../l1/state.ts';` add `import type { NeuroResp } from '../neuro/drive.ts'; // Stage 7f`;
- in `interface RespCtx`, after its last field (prototype base: `  blood?: BloodView;`) add `  neuro?: NeuroResp; // Stage 7f: drug and NMB effects on spontaneous breathing`;
- replace the whole `function driverCtx(rs: RespState, l1: L1State, t: number): DriverCtx { … }` (prototype base: a one-line body returning `{ rr, vt, fio2, etco2, complianceMl }`) with

```ts
function driverCtx(rs: RespState, l1: L1State, t: number, neuro?: NeuroResp): DriverCtx {
  const n = neuro; // Stage 7f: the instructor's rr/vt × the drug/NMB multipliers (plan decision 7); apnoea → rr 0
  return {
    rr: n ? (n.apnoea ? 0 : l1Target(l1, 'rr', t) * n.rrMult) : l1Target(l1, 'rr', t),
    vt: n ? l1Target(l1, 'vt', t) * n.vtMult : l1Target(l1, 'vt', t),
    fio2: l1Target(l1, 'fio2', t), etco2: rs.etco2, complianceMl: compliance(rs),
    obstructed: n ? n.obstruction >= 0.9 : false,
    cleft: n && n.cleft > 0.15 ? n.cleft : 0,
  };
}
```

  (if another stage changed `driverCtx`'s other fields, keep theirs and add the Stage 7f parts: the multipliers on `rr`/`vt` and the two new fields; the other `driverCtx(rs, l1, t)` call sites keep three arguments — the neuro multipliers shape only the planned cycles);
- in `advanceResp` replace `  planCycles(rs.driver, driverCtx(rs, ctx.l1, tEnd), tEnd + PLAN_AHEAD_S);` with `  planCycles(rs.driver, driverCtx(rs, ctx.l1, tEnd, ctx.neuro), tEnd + PLAN_AHEAD_S); // Stage 7f: neuro`.

- [x] **Step 4: Engine** (`packages/engine-core/src/engine.ts`; merge `origin/main` first — see the note above the steps):
  1. after `import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts'; // Stage 7g` add
     `import { applyNeuroCommand, createNeuroState, fasciculating, stepNeuroTo, validateNeuroCommand, type NeuroState } from './l2/neuro/pipeline.ts'; // Stage 7f` and `import { pcheOf } from './l2/neuro/bus.ts'; // Stage 7f`;
  2. `interface PipelineState`: after `  pkHooks: RhythmHookState; // Stage 7g` add `  neuro: NeuroState; // Stage 7f: NMB, depth, drive depression (R32)`;
  3. constructor, in the `this.st = { … }` literal: replace `      pk: createPkState(pkPatientOf(opts.patient)), // Stage 7g` with `      pk: createPkState({ ...pkPatientOf(opts.patient), pche: pcheOf(opts.patient) }), // Stage 7g (+7f: cholinesterase phenotype for 7g's PK, R51 addendum 10)` — SKIP this replacement if `grep -n "cholinesterase" packages/engine-core/src/l2/pk/pipeline.ts` shows that 7g's `pkPatientOf` already maps `profile.neuro.cholinesterase` — and after `      pkHooks: createHookState(), // Stage 7g` add `      neuro: createNeuroState(opts.patient, this.seed), // Stage 7f`;
  4. `tickOnce`: immediately after `    this.advance(this.st, this.tick * SAMPLES_PER_TICK);` add `    this.syncNeuro(simT); // Stage 7f: fasciculation artefact on the committed state`;
  5. `advance` (the private `advance(ps, end)` method that runs every sub-pipeline): AFTER 7g's `advancePk(ps.pk, this.pkCtx(ps), end / ECG_RATE); …` line, its `if (circ7g) { … }` block and its rhythm-hook `if (req7g) { … }` block, and immediately BEFORE the `advanceResp(` statement, add

```ts
    const src7f = ps.resp.driver.source; // Stage 7f: after 7g's pk (reads ps.pk.bus), before the breath driver (its hook shapes the next breaths)
    const endo7f = (ps as unknown as { endo?: { core?: { out?: { neuroglycopenia?: number } }; cascade?: { macF?: number } } }).endo; // Stage 7f: 7e seams, duck-typed (neutral without 7e)
    stepNeuroTo(ps.neuro, end / ECG_RATE, {
      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm',
      neuroglycopenia: endo7f?.core?.out?.neuroglycopenia ?? 0, macF: endo7f?.cascade?.macF ?? 1,
    }, ps.pk.bus);
```

     and add `neuro: ps.neuro.resp` to the `RespCtx` literal passed to `advanceResp(` — on the prototype base the call becomes `advanceResp(ps.resp, { l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro)` (keep every field other stages added);
  6. `flush`: after `    this.st.pk.out = keep(this.st.pk.out); // Stage 7g` add `    this.st.neuro.out = keep(this.st.neuro.out); // Stage 7f`;
  7. `validate`: immediately after 7g's `    if (pkV !== null) return pkV;` add
     `    const neuro = validateNeuroCommand(cmd); // Stage 7f (after 7g: R51 §3 chain; null for every drug/vaporiser event)` and `    if (neuro !== null) return neuro;`;
  8. `apply`: immediately after 7g's `    if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: consumes every drug/infusion/tci/vaporiser event (R51 §3)` add `    if (applyNeuroCommand(ps.neuro, cmd, simT)) return; // Stage 7f (never a drug/vaporiser/stimulus event: 7g consumed those, 7e consumes stimulus)` — `stimulus` falls through to the later hooks (7e's apply when it exists; with no consumer the engine ignores an unconsumed `applyEvent`);
  9. `restore()`: after `    data.st.pkHooks ??= createHookState(); // Stage 7g` add `    data.st.neuro ??= createNeuroState(undefined, this.seed); // Stage 7f: pre-7f snapshots`;
  10. add the method (above `  /** R39-5: the capnograph's sidestream delay/rise come from the active skin (research 09 §5). */`):

```ts
  /**
   * Stage 7f: the succinylcholine fasciculation EMG artefact on the ECG modifiers, saved and restored on the committed
   * state only (the look-ahead is marked dirty). 7f touches no potassium (7c's, R51 §3/§6) and no circulation (7g's).
   */
  private syncNeuro(simT: number): void {
    const ps = this.st;
    const ns = ps.neuro;
    const fasc = fasciculating(ns, simT);
    if (fasc && ns.emgBase === null) {
      ns.emgBase = ps.mods.artefact.emg;
      ps.mods = mergeModifiers(ps.mods, { artefact: { emg: Math.max(ns.emgBase, 0.8) } });
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    } else if (!fasc && ns.emgBase !== null) {
      ps.mods = mergeModifiers(ps.mods, { artefact: { emg: ns.emgBase } });
      ns.emgBase = null;
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    }
  }
```

  In `packages/controller/src/session/controller-session.ts`, in the log formatter's `case 'device':`, after the `iabp`/`lvad` line (`      if (c.action.device === 'iabp' || c.action.device === 'lvad') return \`${c.action.device} ${c.action.action}\`; // Stage 7a`) add:
  `      if (c.action.device === 'tof' || c.action.device === 'depth') return \`${c.action.device} ${c.action.action}${'intervalS' in c.action && c.action.intervalS !== undefined ? \` every ${c.action.intervalS} s\` : ''}\`; // Stage 7f` (without it the grown `DeviceAction` union fails the controller typecheck).

  In `packages/engine-core/vite.config.ts`, append to the `SLOW` list after its last entry (prototype base: FU-2's `'test/engine/af-rate-control.test.ts', …`): `  'test/engine/neuro-*.test.ts', // Stage 7f: 100 sim-min rocuronium, 24 h maintenance, MODELED drive scenarios`.

- [x] **Step 5: Run** the new test file and the Stage 3 and 7g suites: `… exec vitest run test/engine/neuro-engine.test.ts test/l2/resp test/l2/pk test/engine/pk-*.test.ts`; expect PASS (neuro-engine 8; the Stage 3 and 7g suites unchanged). Then `npx -y pnpm@9.15.9 -r typecheck`. (The MODELED spontaneous drive is Task 13; this task leaves MODELED spontaneous breathing at Stage 3's targets × 7f's multipliers.)

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/src/l2/resp/driver.ts packages/engine-core/vite.config.ts packages/controller/src/session/controller-session.ts packages/engine-core/test/engine/neuro-engine.test.ts
git commit -m "feat(neuro): wire Stage 7f into the engine after 7g's pk — 10 Hz step before the breath driver, MANUAL drive hook, TOF/depth devices, 7e seams duck-typed, fasciculation on the committed state; naloxone and stimulus through the engine" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 13: MODELED spontaneous breathing — 7b's chemoreflex drive with Winter's compensation (`spont.ts`, G7b ruling 8)

**Files:**
- Create: `packages/engine-core/src/l2/neuro/spont.ts`, `packages/engine-core/test/l2/neuro/spont.test.ts`, `packages/engine-core/test/engine/neuro-spont.test.ts`
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (one import, `RespCtx.hco3?`, `RespState.spont?`, `modeledSpont`, two `driverCtx` lines, one line in the MANUAL etco2 calibration, the 1 Hz drive call in `gasStep` — all marked `// Stage 7f`), `packages/engine-core/src/engine.ts` (`hco3` in the `advanceResp` context)

**Interfaces:**
- Consumes: 7b's `drive(x, fatigue)`, `pti(vt, c, r, ti, ttot, pMaxMult)`, `stepFatigue(f, pti, dt)`, `DriveInputs`/`DriveOut` (`src/l2/lung/drive.ts`, imported, never edited); 7b's `rs.lung.lp.{co2Slope, pMax, rTube, side[].rLung}`; 7c's `ps.blood.core.ab.hco3`; `NeuroResp`, `DIAPH_APNOEA` (Task 8); `driverCtx`, `RespCtx` (Task 12).
- Produces: `SPONT_DT_S` 1, `WINTER_SLOPE` 1.5, `WINTER_OFFSET` 8, `SpontDrive { rr; vt; ve; fatigue; paco2Rest; paco2Set; nextT }`, `createSpontDrive()`, `winterPaco2(hco3)`, `paco2SetPoint(paco2Rest, hco3)`, `SpontInputs`, `stepSpontDrive(s, x)`; `RespCtx.hco3?: number`, `RespState.spont?: SpontDrive`.

**Before editing `engine.ts` (R51 §7):** `git fetch origin && git merge origin/main` and re-run the suite, as in Task 12.

- [x] **Step 1: Write the failing tests.** `packages/engine-core/test/l2/neuro/spont.test.ts` (exact):

```ts
import { describe, expect, it } from 'vitest';
import { createSpontDrive, paco2SetPoint, stepSpontDrive, winterPaco2, type SpontInputs } from '../../../src/l2/neuro/spont.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';

const X: SpontInputs = { t: 0, paco2: 40, pao2: 100, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3 };
const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const nr = (v: Partial<typeof V0>, diaBlock = 0) => neuroResp({ vent: { ...V0, ...v }, macVolatile: 0, diaBlock, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('MODELED spontaneous drive (7b drive/pti/fatigue + Winter\'s, G7b ruling 8)', () => {
  it('Winter\'s: 1.5·HCO3 + 8; the set point falls only in metabolic acidosis', () => {
    expect(winterPaco2(15)).toBeCloseTo(30.5, 9);
    expect(paco2SetPoint(40, 24)).toBe(40); // Winter's 44 > resting: no shift
    expect(paco2SetPoint(40, 15)).toBeCloseTo(30.5, 9);
  });
  it('at the resting PaCO2 the drive returns the resting pattern; the set point is captured on the first evaluation', () => {
    const s = createSpontDrive();
    stepSpontDrive(s, X);
    expect(s.paco2Rest).toBe(40);
    expect(s.rr).toBeCloseTo(12, 6);
    expect(s.vt).toBeCloseTo(500, 6);
  });
  it('re-evaluates at 1 Hz only; hypercapnia raises VE (CO2 slope 1.5 L/min/mmHg)', () => {
    const s = createSpontDrive();
    stepSpontDrive(s, X);
    stepSpontDrive(s, { ...X, t: 0.5, paco2: 50 });
    expect(s.ve).toBeCloseTo(6, 6);
    stepSpontDrive(s, { ...X, t: 1, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4, 6);
  });
  it('metabolic acidosis (HCO3 15): at PaCO2 40 the drive is ≈ 2.4× resting VE (set point 30.5)', () => {
    const s = createSpontDrive();
    s.paco2Rest = 40;
    stepSpontDrive(s, { ...X, hco3: 15 });
    expect(s.paco2Set).toBeCloseTo(30.5, 9);
    expect(s.ve / 6).toBeCloseTo((6 + 1.5 * 9.5) / 6, 6);
  });
  it('7f on top: opioid slows the rate; a blocked diaphragm (< 5 % strength) stops breathing; weakness shrinks VT', () => {
    const a = createSpontDrive();
    stepSpontDrive(a, { ...X, neuro: nr({ opioid: 2 }) });
    expect(a.rr).toBeLessThan(0.6 * 12);
    const b = createSpontDrive();
    stepSpontDrive(b, { ...X, neuro: nr({}, 0.97) });
    expect([b.rr, b.vt]).toEqual([0, 0]);
    const c = createSpontDrive();
    stepSpontDrive(c, { ...X, neuro: nr({}, 0.85) });
    expect(c.vt).toBeCloseTo(500 * 0.5, 6); // strength 0.15 / DIAPH_WEAK 0.3
  });
  it('fatigue: a high pressure–time index (stiff lungs, weak diaphragm) lowers F over minutes', () => {
    const s = createSpontDrive();
    for (let t = 0; t <= 1800; t++) stepSpontDrive(s, { ...X, t, complianceMl: 15, resistance: 20, pMaxMult: 0.5 });
    expect(s.fatigue).toBeLessThan(0.9);
  });
});
```

`packages/engine-core/test/engine/neuro-spont.test.ts` (exact; ≈ 12 s, yields every sim-minute):

```ts
// MODELED spontaneous breathing through the engine (G7b ruling 8, R51 addendum 17): 7b's chemoreflex drive with
// Winter's compensation from 7c's HCO3, and 7f's depression on top. Yields once per sim-minute (CI rule).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineOptions } from '../../src/index.ts';

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `s${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as Command;
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
type St = { resp: { co2: { pf: number } }; blood: { core: { ab: { hco3: number } } } };

async function breathe(opts: EngineOptions, untilS: number, cmds: Command[] = []) {
  const e = createEngine({ seed: 8, mode: 'modeled', ...opts }); // opts.mode may override (the MANUAL reference run)
  const breaths: { t: number; vt: number }[] = [];
  e.on((x) => { if (x.type === 'breath') breaths.push({ t: x.t, vt: x.vtMl }); }, ['breath']);
  for (const c of cmds) e.dispatch(c);
  for (let t = 60; t <= untilS; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const st = (e.snapshot().state as { st: St }).st;
  const win = (a: number, b: number) => breaths.filter((x) => x.t >= a && x.t < b);
  const ve = (a: number, b: number) => (win(a, b).reduce((s, x) => s + x.vt, 0) / 1000) / ((b - a) / 60);
  return { paco2: st.resp.co2.pf, hco3: st.blood.core.ab.hco3, rr: (a: number, b: number) => win(a, b).length / ((b - a) / 60), ve };
}

describe('MODELED spontaneous drive through the engine', { timeout: 300_000 }, () => {
  it('no drugs, normal chemistry: the drive holds the MANUAL resting pattern (RR within 10 %, PaCO2 within 2 mmHg over 10 min)', async () => {
    const man = await breathe({ patient: ADULT, mode: 'manual' }, 600);
    const r = await breathe({ patient: ADULT }, 600);
    console.log(`resting: MODELED RR ${r.rr(300, 600).toFixed(1)} PaCO2 ${r.paco2.toFixed(1)} vs MANUAL ${man.rr(300, 600).toFixed(1)} / ${man.paco2.toFixed(1)}`);
    expect(Math.abs(r.rr(300, 600) / man.rr(300, 600) - 1)).toBeLessThan(0.1);
    expect(Math.abs(r.paco2 - man.paco2)).toBeLessThan(2);
  });
  it('metabolic acidosis (7c profile HCO3 15): VE rises and PaCO2 settles at Winter\'s 1.5·HCO3 + 8 ± 2 (≈ 30.5 ± 2)', async () => {
    const ctl = await breathe({ patient: ADULT }, 1200);
    const r = await breathe({ patient: { ...ADULT, blood: { hco3: 15 } } }, 1200);
    console.log(`acidosis: HCO3 ${r.hco3.toFixed(1)} → PaCO2 ${r.paco2.toFixed(1)} (Winter's ${(1.5 * r.hco3 + 8).toFixed(1)}); VE ${r.ve(900, 1200).toFixed(1)} vs ${ctl.ve(900, 1200).toFixed(1)} L/min; RR ${r.rr(900, 1200).toFixed(1)} vs ${ctl.rr(900, 1200).toFixed(1)}`);
    expect(Math.abs(r.paco2 - (1.5 * r.hco3 + 8))).toBeLessThan(2);
    expect(r.paco2).toBeGreaterThan(28.5);
    expect(r.paco2).toBeLessThan(32.5);
    expect(r.ve(900, 1200)).toBeGreaterThan(1.2 * ctl.ve(900, 1200)); // VA must rise ≈ 39/29.5 = 1.34× at the same VCO2; VE a little less (dead space)
    expect(r.rr(900, 1200)).toBeGreaterThan(ctl.rr(900, 1200));
  });
  it('opioid on top: remifentanil 1 µg/kg + 0.3 µg/kg/min → spontaneous RR over minutes 3–5 < 0.6 × the drug-free control', async () => {
    const ctl = await breathe({ patient: ADULT }, 300);
    const remi = await breathe({ patient: ADULT }, 300, [
      ev({ kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }),
      ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.3, unit: 'mcg/kg/min', route: 'iv', infusion: true }),
    ]);
    console.log(`opioid (MODELED): RR ${remi.rr(180, 300).toFixed(1)} vs ${ctl.rr(180, 300).toFixed(1)}; PaCO2 ${remi.paco2.toFixed(1)}`);
    expect(ctl.rr(180, 300)).toBeGreaterThan(8);
    expect(remi.rr(180, 300)).toBeLessThan(0.6 * ctl.rr(180, 300)); // apnoea (0) also passes
  });
  it('acidosis and opioid together: the opioid still depresses the Winter\'s-driven breathing (PaCO2 rises above the acidosis-alone value)', async () => {
    const acid = { patient: { ...ADULT, blood: { hco3: 15 } } };
    const a = await breathe(acid, 900);
    const b = await breathe(acid, 900, [ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.1, unit: 'mcg/kg/min', route: 'iv', infusion: true })]);
    console.log(`acidosis + remifentanil 0.1: PaCO2 ${b.paco2.toFixed(1)} vs ${a.paco2.toFixed(1)}`);
    expect(b.paco2).toBeGreaterThan(a.paco2 + 3);
  });
});
```

- [x] **Step 2: Run; expect FAIL** — `… exec vitest run test/l2/neuro/spont.test.ts test/engine/neuro-spont.test.ts` → "Failed to resolve import …/spont.ts" (the engine file: MODELED RR does not rise in acidosis — no drive yet).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/neuro/spont.ts` (exact):

```ts
// MODELED spontaneous breathing (G7b ruling 8, R51 addendum 17): Stage 7b's chemoreflex drive, work of breathing and
// fatigue (l2/lung/drive.ts: drive(), pti(), stepFatigue() — 7b left them unwired) set the rate and tidal volume of
// spontaneous cycles in MODELED mode, with 7f's depression on top. MANUAL keeps the instructor's rr/vt × 7f's
// multipliers (driverCtx). Re-evaluated at 1 Hz on the gas grid; plain data (snapshots, look-ahead clone).
//   set point: the resting PaCO2 the MANUAL etco2 calibration placed (paco2Rest), lowered in metabolic acidosis to
//     Winter's expected PaCO2 = 1.5·HCO3 + 8 (Albert, Dell & Winters 1967; ±2) — HCO3 from 7c's blood.core.ab.hco3
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8). Metabolic alkalosis is not compensated (v1).
//   drive: 7b's VE = [S·(PaCO2 − B)]₊·H(PaO2)·(1 − opioidDep)·(1 − hypnoticDep)·F with 7f's opioidDep/hypnoticDep
//     (fixed-CO2 depression, decision 7); the resting pattern rr0/vt0 is the instructor's rr/vt target.
//   NMB: VT × nmbVtMult (diaphragm strength), apnoea below DIAPH_APNOEA strength; upper-airway obstruction × (1 − obs);
//     pti's pMax × diaphragm strength × 7b's condition pMax (fatigue comes sooner in a weak patient).
import { drive, pti, stepFatigue } from '../lung/drive.ts';
import { DIAPH_APNOEA, type NeuroResp } from './drive.ts';

export const SPONT_DT_S = 1;
export const WINTER_SLOPE = 1.5;
export const WINTER_OFFSET = 8;
/** Spontaneous Ti/Ttot (Stage 3 driver's SPONT_TI_FRACTION 0.38). */
const TI_FRAC = 0.38;

export interface SpontDrive {
  rr: number; // < 0: not yet evaluated (driverCtx falls back to the rr/vt targets)
  vt: number;
  ve: number;
  fatigue: number; // 1 fresh → 0.3 exhausted (7b)
  paco2Rest: number; // resting PaCO2 of the MANUAL etco2 calibration (NaN until it runs)
  paco2Set: number;
  nextT: number;
}

export function createSpontDrive(): SpontDrive {
  return { rr: -1, vt: 0, ve: 0, fatigue: 1, paco2Rest: Number.NaN, paco2Set: Number.NaN, nextT: 0 };
}

/** Winter's expected PaCO2 in metabolic acidosis (mmHg). */
export function winterPaco2(hco3: number): number {
  return WINTER_SLOPE * hco3 + WINTER_OFFSET;
}

/** The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis only. */
export function paco2SetPoint(paco2Rest: number, hco3: number): number {
  return Math.min(paco2Rest, winterPaco2(hco3));
}

export interface SpontInputs {
  t: number;
  paco2: number; // arterial (Stage 3's fast CO2 compartment)
  pao2: number;
  hco3: number; // 7c's blood.core.ab.hco3 (24 without 7c)
  rr0: number; // instructor's rr/vt targets = the resting pattern
  vt0: number;
  co2SlopeMult: number; // 7b's condition co2Slope (COPD)
  pMaxMult: number; // 7b's condition pMax
  evlwi: number; // mL/kg (J-receptor term)
  complianceMl: number; // mL/cmH2O
  resistance: number; // cmH2O·s/L
  neuro?: NeuroResp;
}

export function stepSpontDrive(s: SpontDrive, x: SpontInputs): void {
  if (x.t + 1e-9 < s.nextT) return;
  s.nextT = x.t + SPONT_DT_S;
  if (Number.isNaN(s.paco2Rest)) s.paco2Rest = x.paco2;
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
  const n = x.neuro;
  const out = drive({
    paco2: x.paco2, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
  }, s.fatigue);
  const strength = n?.pMaxMult ?? 1;
  let { rr, vt } = out;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  s.rr = rr;
  s.vt = vt;
  s.ve = (rr * vt) / 1000;
  if (rr > 0) {
    const ttot = 60 / rr;
    s.fatigue = stepFatigue(s.fatigue, pti(vt, x.complianceMl, x.resistance, TI_FRAC * ttot, ttot, strength * x.pMaxMult), SPONT_DT_S);
  }
}
```

- [x] **Step 4: Wire it.** In `packages/engine-core/src/l2/resp/pipeline.ts`:
- after Task 12's `import type { NeuroResp } from '../neuro/drive.ts'; // Stage 7f` add `import { createSpontDrive, stepSpontDrive, type SpontDrive } from '../neuro/spont.ts'; // Stage 7f: MODELED spontaneous drive`;
- in `interface RespCtx`, after `  neuro?: NeuroResp; // Stage 7f: …` add `  hco3?: number; // Stage 7f: 7c's blood.core.ab.hco3 for Winter's compensation (MODELED spontaneous drive)`;
- in `interface RespState`, after `  evlwiExtra?: number; // Stage 7c: …` add `  spont?: SpontDrive; // Stage 7f: MODELED spontaneous drive (7b's drive/pti/fatigue + Winter's), absent in pre-7f snapshots`;
- in Task 12's `driverCtx`, replace its first three body lines (`const n = neuro; …`, `return {`, `rr: n ? …`, `vt: n ? …`) with

```ts
  const n = neuro; // Stage 7f: the instructor's rr/vt × the drug/NMB multipliers (plan decision 7); apnoea → rr 0
  const sp = modeledSpont(rs, l1) ? rs.spont : undefined; // Stage 7f: MODELED — the chemoreflex drive's own rr/vt (spont.ts)
  return {
    rr: sp ? sp.rr : n ? (n.apnoea ? 0 : l1Target(l1, 'rr', t) * n.rrMult) : l1Target(l1, 'rr', t),
    vt: sp ? sp.vt : n ? l1Target(l1, 'vt', t) * n.vtMult : l1Target(l1, 'vt', t),
```

  and immediately before `function compliance(rs: RespState): number {` add

```ts
/** Stage 7f: MODELED spontaneous breathing follows the chemoreflex drive once it has been evaluated. */
function modeledSpont(rs: RespState, l1: L1State): boolean {
  return l1.mode === 'modeled' && rs.driver.source === 'spontaneous' && (rs.spont?.rr ?? -1) >= 0;
}
```

- in `gasStep`, the MANUAL etco2 calibration block ends with `    rs.co2.pf = pf;` + `    rs.co2.ps = pf;` + `  }`: add one line before its closing `  }` and the drive call right after it, so the block reads

```ts
    rs.co2.pf = pf;
    rs.co2.ps = pf;
    (rs.spont ??= createSpontDrive()).paco2Rest = pf; // Stage 7f: the resting PaCO2 is the MODELED drive's set point
  }
  if (l1.mode === 'modeled' && d.source === 'spontaneous') { // Stage 7f: 7b's chemoreflex drive, 1 Hz (spont.ts)
    const lp = rs.lung.lp;
    stepSpontDrive((rs.spont ??= createSpontDrive()), {
      t, paco2: rs.co2.pf, pao2: rs.o2.pao2, hco3: ctx.hco3 ?? 24, rr0: l1Target(l1, 'rr', t), vt0: l1Target(l1, 'vt', t),
      co2SlopeMult: lp.co2Slope, pMaxMult: lp.pMax, evlwi: 7 + (rs.evlwiExtra ?? 0), complianceMl: compliance(rs),
      resistance: lp.rTube + 1 / lp.side.reduce((g, sd) => g + 1 / Math.max(0.1, sd.rLung), 0), neuro: ctx.neuro,
    });
  }
```

  (`evlwi` = 7 + 7c's lung water: 7b's `resolveLung` does not publish the conditions' EVLWI, so the J-receptor term sees only 7c's excess — recorded in the gate note; `d`, `l1`, `ctx` and `t` are `gasStep`'s own names on the prototype base.)

In `packages/engine-core/src/engine.ts`, add `hco3: ps.blood.core.ab.hco3` to Task 12's `advanceResp(` context — on the prototype base: `{ l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3 }`, comment `// Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's)`. (7c advances AFTER resp, so the drive reads the previous pass's HCO3 — 100 ms old.)

- [x] **Step 5: Run** `… exec vitest run test/l2/neuro/spont.test.ts test/engine/neuro-spont.test.ts` → spont 6, neuro-spont 4 passed (prototype: MODELED resting RR 15.2 / PaCO2 38.6 vs MANUAL 15.2 / 38.5; HCO3 13.6 → PaCO2 29.4, Winter's 28.5, VE 9.5 vs 7.6 L/min, RR 17.0 vs 15.2; remifentanil RR 4.0 vs 15.0, PaCO2 50.6; acidosis + remifentanil 0.1: PaCO2 38.4 vs 29.5). Then the MODELED suites of the other stages, which now breathe through the drive when spontaneous: `PME_TEST_SET=slow npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-*.test.ts test/engine/lung-*.test.ts test/engine/blood-sanity-*.test.ts test/engine/circ-rate-rule.test.ts` and the fast set `PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core test`. Prototype: fast set 926 passed + 1 skipped; slow set — see Task 18 Step 2 for the one sibling test 7f changes (E-7f-2: 7a's R23 runs, through 7f's natural-airway obstruction under propofol, not through the drive). Any OTHER Stage 3/7a/7b/7c/7g number that moves: STOP and report it (R45) with the drive's rr/vt/PaCO2 at that moment.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/neuro/spont.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/test/l2/neuro/spont.test.ts packages/engine-core/test/engine/neuro-spont.test.ts
git commit -m "feat(neuro): MODELED spontaneous breathing through 7b's chemoreflex drive, work of breathing and fatigue, with Winter's compensation from 7c's HCO3 and 7f's depression on top (G7b ruling 8, R51 addendum 17)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 14: Cross-stage checks — propofol through 7g and 7f, reflex blunting only through 7g (no 7a edit)

**Files:**
- Create: `packages/engine-core/test/engine/neuro-circ.test.ts`
- Modify: nothing. 7f does NOT edit `src/l2/circ/model.ts`: the `stepBaro(` call lives in 7a's `control()` (the reflex step, not the beat integrator); 7g edits that line first for β-blockade (R51 §6), and since R51 addendum 8 the propofol/volatile baroreflex-gain depression is 7g's circulation PD only, so 7f has nothing to add there (its former `neuroBaroGain`/`baroGainMult` is deleted). `src/l2/hemo/pipeline.ts` is not edited either.

**Interfaces:**
- Consumes: 7g's circulation PD (its `DrugEffect` into 7a's `control()` via `circ.ext.drug`, incl. the volatile `gv` −0.3/MAC), FU-2's MODELED rate rule (the `sinus` rhythm is in `SINUS_FAMILY`, so the reflex drives HR), 7f's `anaesthesia` event (Tasks 11–12).
- Produces: nothing (integration evidence for the gate note).

- [x] **Step 1: Write the test** `packages/engine-core/test/engine/neuro-circ.test.ts` (exact):

```ts
// One `drug` command, two consumers (R51 §2): 7g's circulation PD moves the MAP (through 7a), 7f's PD moves the depth
// index. The anaesthetic reflex blunting comes from 7g alone (addendum 8): 7f adds no second baroreflex factor.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `c${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
const VENT = { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

async function reflexDrop(sevo: boolean): Promise<number> {
  const e = createEngine({ seed: 31, mode: 'modeled', patient: ADULT });
  const hr: { t: number; v: number }[] = [];
  e.on((x: EngineEvent) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr.push({ t: x.t, v: x.values.hr.value }); }, ['measurement']);
  e.dispatch(ev(VENT));
  if (sevo) e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 })); // ≈ 1 MAC at 20 min (Task 17's dial)
  for (let t = 60; t <= 1200; t += 60) { e.advanceTo(t); await yieldNow(); }
  const before = mean(hr.filter((h) => h.t > 1140).map((h) => h.v));
  e.dispatch(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }));
  for (let t = 1260; t <= 1380; t += 60) { e.advanceTo(t); await yieldNow(); }
  return before - Math.min(...hr.filter((h) => h.t > 1200).map((h) => h.v));
}

describe('7f and the circulation (R51 §2, addendum 8)', { timeout: 300_000 }, () => {
  // R-7f-9 (→ 7g, circulation PD; R51 addendum 8): measured on the merged base at 0.98 MAC (dial 2.5 %) the HR falls
  // 93.4 → 68 (−25.4 bpm; MAP 86.3 → 99.6) against 72.9 → 61 awake (−11.9; MAP 95.5 → 114.3): ΔHR/ΔMAP 1.9 vs 0.63
  // bpm/mmHg. 7g's volatile gv −0.3 is outweighed by the reflex tachycardia the sevoflurane hypotension causes, so the
  // blunting does not show. 7f adds no baroreflex factor by design (addendum 8): pre-declared failing, reported.
  it.fails('[R-7f-9] ≈ 1 MAC sevoflurane blunts the reflex bradycardia to phenylephrine 100 µg by ≥ 20 % — through 7g alone', async () => {
    const awake = await reflexDrop(false);
    const anaes = await reflexDrop(true);
    console.log(`reflex HR drop: awake ${awake.toFixed(1)}, sevoflurane ${anaes.toFixed(1)} bpm`);
    expect(awake).toBeGreaterThan(3);
    expect(anaes).toBeLessThan(0.8 * awake);
  });
  it('propofol 2 mg/kg: one command moves both the circulation (7g → 7a: MAP falls; 7g measures 0.91, NR-7g-1) and the depth index (7f, DI < 60 within 2 min)', async () => {
    const e = createEngine({ seed: 32, mode: 'modeled', patient: { ...ADULT, sensors: { abp: 'connected' } } });
    const map: { t: number; v: number }[] = [];
    const di: { t: number; v: number }[] = [];
    e.on((x: EngineEvent) => {
      if (x.type === 'state') {
        const s = x.values.sbp ?? 0;
        const d = x.values.dbp ?? 0;
        map.push({ t: x.t, v: d + (s - d) / 3 });
      }
      if (x.type === 'anaesthesia') di.push({ t: x.t, v: x.di });
    });
    e.dispatch(ev(VENT));
    for (let t = 60; t <= 120; t += 60) { e.advanceTo(t); await yieldNow(); }
    const before = mean(map.filter((m) => m.t > 60 && m.t <= 120).map((m) => m.v));
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' })).accepted).toBe(true);
    for (let t = 180; t <= 360; t += 60) { e.advanceTo(t); await yieldNow(); }
    expect(Math.min(...di.filter((d) => d.t > 120 && d.t <= 240).map((d) => d.v))).toBeLessThan(60);
    const nadir = Math.min(...map.filter((m) => m.t > 150).map((m) => m.v));
    console.log(`propofol: MAP ${before.toFixed(1)} → nadir ${nadir.toFixed(1)} (${(nadir / before).toFixed(3)}); DI nadir ${Math.min(...di.map((d) => d.v))}`);
    // 7f checks that BOTH paths ran from one command; the 60–80 % band is 7g's (its Task 20) and is open there as NR-7g-1
    expect(nadir).toBeLessThan(0.95 * before);
  });
});
```

- [x] **Step 2: Run** — `… exec vitest run test/engine/neuro-circ.test.ts` → 2 passed, one of them the pre-declared `it.fails` **R-7f-9** (prototype on the merged base: at 0.98 MAC sevoflurane, dial 2.5 %, the phenylephrine 100 µg reflex drop is 25.4 bpm vs 11.9 awake — the sevoflurane hypotension (MAP 86 vs 96) has already driven HR to 93, so the reflex operates on its steep limb and 7g's `gv` −0.3 does not show; propofol 2 mg/kg: MAP 94.6 → 85.4 (0.903, 7g's open NR-7g-1), DI nadir 46). This task adds no production code: both paths already exist (7g's circulation PD; Tasks 11–12). If the propofol MAP does not fall at all, check that 7g consumed the event (`dispatch(…).accepted` and `ps.pk.drugs.propofol`) and STOP and report. 7f adds no baroreflex factor (addendum 8): never fix R-7f-9 in 7f. The MAP band itself (60–80 % at 2 min) is 7g's own acceptance (NR-7g-1); 7f checks only that both paths ran from one command. Record the drop ratio and the MAP nadir in the gate note.

- [x] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/neuro-circ.test.ts
git commit -m "test(neuro): propofol drives both 7g's circulation PD and 7f's depth from one command; reflex blunting through 7g only, pre-declared it.fails R-7f-9 (R51 addendum 8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 15: Skin fields for the TOF and depth tiles

**Files:**
- Modify: `packages/skins/src/types.ts`, `packages/skins/src/resolve.ts`, `packages/renderer/src/alarm-view.ts`, `apps/demo/src/stage4a/screen.ts` (exhaustive `Record<TileParam, …>` literals: each gains two entries)
- Create: `packages/skins/test/neuro-tiles.test.ts`

**Interfaces:**
- Produces: `TileParam` gains `'NMT' | 'BFA'`; `ColorKey` gains `'NMT'` (`'BFA'` exists); `TILE_NUMERICS.NMT = { numerics: ['tofRatio','tofCount','ptc'], limits: [] }`, `TILE_NUMERICS.BFA = { numerics: ['di','sr'], limits: [] }`.

- [x] **Step 1: Write the failing test** `packages/skins/test/neuro-tiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { COLOR_KEYS, TILE_PARAMS } from '../src/types.ts';

describe('Stage 7f tile fields (decision 14)', () => {
  it('NMT and BFA are tile params; NMT is a colour key (BFA already was)', () => {
    expect(TILE_PARAMS).toContain('NMT');
    expect(TILE_PARAMS).toContain('BFA');
    expect(COLOR_KEYS).toContain('NMT');
    expect(COLOR_KEYS).toContain('BFA');
  });
});
```

- [x] **Step 2: Run; expect FAIL** (`npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/neuro-tiles.test.ts`).

- [x] **Step 3: Implement.** `packages/skins/src/types.ts`: in `COLOR_KEYS` after `'BFA', 'AGENTS',` add a line `  'NMT', // Stage 7f: neuromuscular transmission (TOF) tile`; replace the `TILE_PARAMS` line's `'CO2', 'ST'] as const;` with `'CO2', 'ST', 'NMT', 'BFA'] as const; // Stage 7f: NMT, BFA`. `packages/skins/src/resolve.ts`: in `TILE_COLOR_KEY` after `SpO2: 'SpO2', TEMP: 'TEMP', RR: 'RESP', CO2: 'CO2', ST: 'ST',` add `  NMT: 'NMT', BFA: 'BFA', // Stage 7f`. `packages/renderer/src/alarm-view.ts`: in `TILE_NUMERICS` after the `ST:` entry add `  NMT: { numerics: ['tofRatio', 'tofCount', 'ptc'], limits: [] }, // Stage 7f` and `  BFA: { numerics: ['di', 'sr'], limits: [] }, // Stage 7f`. `apps/demo/src/stage4a/screen.ts`: in `SAMPLE` after `ST: { v: '0.1' },` add `  NMT: { v: '92%', x: 'TOF 4/4' }, BFA: { v: '45', x: 'SR 0' }, // Stage 7f`. No skin JSON needs a value (the colour keys are optional; the demo falls back).

- [x] **Step 4: Run** `npx -y pnpm@9.15.9 -r typecheck` and `npx -y pnpm@9.15.9 --filter @pme/skins --filter @pme/renderer test`; expect PASS (prototype on the merged base: skins 169 incl. this test, renderer 67; the demo's `SAMPLE` record typechecks).

- [x] **Step 5: Commit and push**

```bash
git add packages/skins/src/types.ts packages/skins/src/resolve.ts packages/renderer/src/alarm-view.ts apps/demo/src/stage4a/screen.ts packages/skins/test/neuro-tiles.test.ts
git commit -m "feat(skins): NMT and BFA tile params and the NMT colour key for the TOF and depth tiles (decision 14)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 16: Scenarios (residual block, sux in a burn, light anaesthesia, awareness, opioid apnoea at emergence, MH trigger)

**Files:**
- Modify: `packages/controller/scenarios/pme-scenario-1.schema.json` (event kinds, device enum, `patient.neuro`, `patient.blood`)
- Create: the six `packages/controller/scenarios/*.json` below, `packages/controller/test/scenario/neuro-scenarios.test.ts`

**Interfaces:**
- Consumes: 7f's event kinds (`airwayDevice`, `neuroProfile`) and 7e's `stimulus` (`{ kind: 'stimulus', intensity }`, decision 17; accepted through 7f's temporary-owner validator or 7e's) and devices (`tof`, `depth`); 7g's `drug` and `vaporiser` events (`{ kind: 'vaporiser', agent, dialPct, fgfLpm }`, R51 §4 — 7f's former `volatile` event no longer exists); 7c's `patient.blood` profile (`burns`, the succinylcholine potassium sensitivity); Stage 3's `condition mh` (MH is 7e's model, R51 §6).
- Produces: six `[draft]` scenario files for Ali's review; the schema accepts them.

- [x] **Step 1: Write the failing test** `packages/controller/test/scenario/neuro-scenarios.test.ts` (exact):

```ts
// Stage 7f scenarios: valid against the schema (event kinds stimulus/airwayDevice/neuroProfile, 7g's vaporiser, devices
// tof/depth) and every command they send is accepted by the engine (drug and vaporiser events by 7g, R51 §3–4).
import { readFileSync } from 'node:fs';
import { createEngine, type Command } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import type { DocCommand, ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const IDS = ['nmb-residual-block', 'nmb-sux-burn', 'depth-light-anaesthesia', 'depth-awareness', 'depth-opioid-apnoea', 'nmb-mh-trigger'];
const load = (id: string) => JSON.parse(readFileSync(new URL(`../../scenarios/${id}.json`, import.meta.url), 'utf8')) as ScenarioDoc;

describe('Stage 7f scenarios', () => {
  it.each(IDS)('%s is a valid [draft] scenario whose commands the engine accepts', (id) => {
    const d = load(id);
    const r = validateScenario(d, {});
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(d.title.startsWith('[draft]')).toBe(true);
    const e = createEngine({ seed: 1, patient: d.patient as never });
    const cmds: DocCommand[] = d.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);
    for (const [i, c] of cmds.entries()) {
      const res = e.dispatch({ id: `${id}-${i}`, issuedBy: 'test', ...(c as object) } as Command);
      expect(res.accepted, `${JSON.stringify(c)}: ${res.reason}`).toBe(true);
    }
  });
});
```

- [x] **Step 2: Run; expect FAIL** (files missing).

- [x] **Step 3: Schema.** In `pme-scenario-1.schema.json`: `eventKind.enum` gains `"stimulus", "airwayDevice", "neuroProfile"` after `"condition"`, and `"vaporiser"` if `grep -n '"vaporiser"' packages/controller/scenarios/pme-scenario-1.schema.json` finds nothing (the prototype base has none; never add `"volatile"`: that event was deleted by R51 §4; if 7e merged first and already added `"stimulus"`, do not add it twice); the `device` command's `device.enum` (prototype base: `["nibp", "alarm", "ecg", "display"]`) gains `"tof", "depth"`; in `patient.properties` after `"ageBand"` add (skip `"blood"` if 7c or another stage already declared it):

```json
        "neuro": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "nm": { "enum": ["normal", "myasthenia", "lambertEaton", "burn", "denervation"] },
            "cholinesterase": { "enum": ["normal", "heterozygous", "homozygous"] },
            "mhSusceptible": { "type": "boolean" },
            "mgMmolL": { "type": "number", "minimum": 0.3, "maximum": 6 }
          }
        },
        "blood": {
          "type": "object", "additionalProperties": { "type": "number" },
          "properties": { "burns": { "type": "number", "minimum": 0, "maximum": 1 } }
        },
```

(`blood` is 7c's `BloodProfile` — every field a number; only `burns`, which the succinylcholine scenario sets, is range-checked here.)

- [x] **Step 4: The six scenarios** (exact files; all `[draft]` for Ali's review):

`packages/controller/scenarios/nmb-residual-block.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "nmb-residual-block",
  "title": "[draft] Residual block at extubation",
  "notes": "Rocuronium 0.6 mg/kg at induction, no reversal; extubated 35 min later at TOF 3 (TOFR < 0.9): weak, obstructed breathing and falling SpO2. Treat: sugammadex, jaw thrust, reintubate if needed.",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    }
  },
  "initialState": "maintenance",
  "states": [
    {
      "id": "maintenance",
      "label": "Under GA, paralysed",
      "onEnter": [
        {
          "type": "device",
          "action": {
            "device": "tof",
            "action": "start",
            "intervalS": 15
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "fio2": 0.5,
            "peep": 5
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "rocuronium",
            "dose": 0.6,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 2.5,
            "fgfLpm": 6
          }
        }
      ],
      "transitions": [
        {
          "id": "wake",
          "label": "End of surgery",
          "to": "extubated",
          "when": {
            "afterS": 2100
          }
        }
      ]
    },
    {
      "id": "extubated",
      "label": "Extubated without reversal",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 0,
            "fgfLpm": 6
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "none"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "spontaneous"
          }
        }
      ],
      "transitions": [
        {
          "id": "reverse",
          "label": "Sugammadex given",
          "to": "reversed",
          "when": {
            "event": {
              "kind": "drug",
              "drugId": "sugammadex"
            }
          }
        }
      ]
    },
    {
      "id": "reversed",
      "label": "Reversed",
      "onEnter": [],
      "transitions": []
    }
  ]
}
```
`packages/controller/scenarios/nmb-sux-burn.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "nmb-sux-burn",
  "title": "[draft] Succinylcholine in a burn patient",
  "notes": "Day-10 burn (40 % TBSA) for dressing change under GA; rapid-sequence induction with succinylcholine 1.5 mg/kg: fasciculations, then (Stage 7c) potassium rises over 3–5 min — peaked T waves, widening QRS, then VF; rocuronium resistance (7f burn profile). Teaching: avoid succinylcholine 24–48 h after a burn; use rocuronium 1.2 mg/kg. The potassium rise is Stage 7c's (R51 §3), driven by patient.blood.burns (7c's succinylcholine sensitivity, 0–1).",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    },
    "neuro": {
      "nm": "burn"
    },
    "blood": {
      "burns": 0.4
    }
  },
  "initialState": "rsi",
  "states": [
    {
      "id": "rsi",
      "label": "Rapid-sequence induction",
      "onEnter": [
        {
          "type": "device",
          "action": {
            "device": "tof",
            "action": "start",
            "intervalS": 15
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "succinylcholine",
            "dose": 1.5,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "calcium",
          "label": "Calcium given",
          "to": "treated",
          "when": {
            "manual": {
              "label": "Calcium chloride 10 mL 10 %"
            }
          }
        }
      ]
    },
    {
      "id": "treated",
      "label": "Treated",
      "onEnter": [],
      "transitions": []
    }
  ]
}
```
`packages/controller/scenarios/depth-light-anaesthesia.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "depth-light-anaesthesia",
  "title": "[draft] Light anaesthesia at incision",
  "notes": "Sevoflurane 0.6 MAC, no opioid, no relaxant: skin incision causes movement, tachycardia and hypertension (stress response). Deepen: sevoflurane to 1.2 MAC and fentanyl 1–2 µg/kg.",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    }
  },
  "initialState": "light",
  "states": [
    {
      "id": "light",
      "label": "Light plane",
      "onEnter": [
        {
          "type": "device",
          "action": {
            "device": "depth",
            "action": "on"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "sga"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 1.25,
            "fgfLpm": 6
          }
        }
      ],
      "transitions": [
        {
          "id": "incise",
          "label": "Incision",
          "to": "incision",
          "when": {
            "afterS": 900
          }
        }
      ]
    },
    {
      "id": "incision",
      "label": "Incision",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "stimulus",
            "intensity": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "deepen",
          "label": "Deepened",
          "to": "deep",
          "when": {
            "event": {
              "kind": "drug",
              "drugId": "fentanyl"
            }
          }
        }
      ]
    },
    {
      "id": "deep",
      "label": "Deeper",
      "onEnter": [],
      "transitions": []
    }
  ]
}
```
`packages/controller/scenarios/depth-awareness.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "depth-awareness",
  "title": "[draft] Awareness under neuromuscular block",
  "notes": "TIVA pump disconnected unnoticed after induction and rocuronium: propofol Ce falls, depth index rises above 60 while the patient is paralysed (TOF 0) — awareness. Clues: tachycardia, hypertension, rising index. Treat: propofol bolus, restart the infusion, consider benzodiazepine.",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    }
  },
  "initialState": "tiva",
  "states": [
    {
      "id": "tiva",
      "label": "TIVA running",
      "onEnter": [
        {
          "type": "device",
          "action": {
            "device": "tof",
            "action": "start",
            "intervalS": 15
          }
        },
        {
          "type": "device",
          "action": {
            "device": "depth",
            "action": "on"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "fio2": 0.5,
            "peep": 5
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 150,
            "unit": "mcg/kg/min",
            "route": "iv",
            "infusion": true
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "remifentanil",
            "dose": 0.1,
            "unit": "mcg/kg/min",
            "route": "iv",
            "infusion": true
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "rocuronium",
            "dose": 0.6,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "disconnect",
          "label": "Line disconnects",
          "to": "disconnected",
          "when": {
            "afterS": 600
          }
        }
      ]
    },
    {
      "id": "disconnected",
      "label": "Propofol line disconnected",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 0,
            "unit": "mcg/kg/min",
            "route": "iv",
            "infusion": true
          }
        }
      ],
      "transitions": [
        {
          "id": "fixed",
          "label": "Propofol restarted",
          "to": "fixed",
          "when": {
            "event": {
              "kind": "drug",
              "drugId": "propofol"
            }
          }
        }
      ]
    },
    {
      "id": "fixed",
      "label": "Restarted",
      "onEnter": [],
      "transitions": []
    }
  ]
}
```
`packages/controller/scenarios/depth-opioid-apnoea.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "depth-opioid-apnoea",
  "title": "[draft] Opioid apnoea at emergence",
  "notes": "End of a remifentanil-based anaesthetic; a fentanyl 3 µg/kg bolus for analgesia just before emergence: spontaneous breathing slows to RR 4–6, then apnoea once the volatile's stimulus is gone. Treat: ventilate, naloxone titration (7g), wait.",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    }
  },
  "initialState": "emergence",
  "states": [
    {
      "id": "emergence",
      "label": "Emergence",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "spontaneous"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 0.9,
            "fgfLpm": 6
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "fentanyl",
            "dose": 3,
            "unit": "mcg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "extubate",
          "label": "Extubate",
          "to": "extubated",
          "when": {
            "manual": {
              "label": "Extubate"
            }
          }
        }
      ]
    },
    {
      "id": "extubated",
      "label": "Extubated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 0,
            "fgfLpm": 6
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "none"
          }
        }
      ],
      "transitions": []
    }
  ]
}
```
`packages/controller/scenarios/nmb-mh-trigger.json`
```json
{
  "$comment": "[draft] Stage 7f scenario; clinical content awaits Ali's review (R44).",
  "schema": "pme-scenario/1",
  "id": "nmb-mh-trigger",
  "title": "[draft] Malignant hyperthermia after succinylcholine and sevoflurane",
  "notes": "MH-susceptible patient (undisclosed family history): succinylcholine for intubation and sevoflurane maintenance. EtCO2 climbs despite ventilation, tachycardia, masseter rigidity, then temperature. Treat: stop volatile, hyperventilate with 100 % O2, dantrolene 2.5 mg/kg (7e). 7f only marks the trigger (mhTrigger); the crisis is Stage 3's condition mh, modelled by 7e (R51 §6), scripted here at induction.",
  "seed": 11,
  "patient": {
    "ageY": 45,
    "sex": "M",
    "weightKg": 70,
    "heightCm": 172,
    "ageBand": "adult",
    "baseline": {
      "hr": 72,
      "sbp": 128,
      "dbp": 76
    },
    "rhythm": {
      "id": "sinus"
    },
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "co2": "on"
    },
    "neuro": {
      "mhSusceptible": true
    }
  },
  "initialState": "induction",
  "states": [
    {
      "id": "induction",
      "label": "Induction",
      "onEnter": [
        {
          "type": "device",
          "action": {
            "device": "tof",
            "action": "start",
            "intervalS": 15
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "succinylcholine",
            "dose": 1.5,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "fio2": 0.5,
            "peep": 5
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 2.5,
            "fgfLpm": 6
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "mh",
            "severity": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "stop",
          "label": "Volatile stopped",
          "to": "treated",
          "when": {
            "manual": {
              "label": "Stop volatile, dantrolene"
            }
          }
        }
      ]
    },
    {
      "id": "treated",
      "label": "Treated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 0,
            "fgfLpm": 6
          }
        }
      ],
      "transitions": []
    }
  ]
}
```

They are NOT added to `BUILTIN_SCENARIOS` (its test pins Stage 6b's five); adding them to the catalogue is the orchestrator's call after Ali's review.

- [x] **Step 5: Run; expect PASS** (6): `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/neuro-scenarios.test.ts`, then `npx -y pnpm@9.15.9 --filter @pme/controller test` (all green). The vaporiser dials are [ENG] inputs measured on 7g's circle model at FGF 6 L/min (2.5 % → end-tidal 1.00 MAC at 30 min, 40 y; 1.25 % ≈ 0.5 MAC, 0.9 % ≈ 0.35 MAC at 40–45 y); adjust a dial, not the scenario text, if the demo shows otherwise. `stimulus` is 7e's shape (intensity 1 = incision, held until the next stimulus event). The succinylcholine-in-a-burn scenario sets `patient.blood.burns` 0.4 so 7c's potassium rise runs (R-7f-5). Prototype: 6 passed; `--filter @pme/controller test` 203 passed.

- [x] **Step 6: Commit and push**

```bash
git add packages/controller/scenarios/pme-scenario-1.schema.json packages/controller/scenarios/nmb-*.json packages/controller/scenarios/depth-*.json packages/controller/test/scenario/neuro-scenarios.test.ts
git commit -m "feat(controller): six Stage 7f scenarios (7e's stimulus shape, 7g's vaporiser, 7c's burns) and the schema's neuro event kinds, devices and patient profile" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 17: Acceptance through the engine (residual block, depth bands, emergence, CPU, 24 h)

**Files:**
- Create: `packages/engine-core/test/engine/neuro-acceptance.test.ts`, `packages/engine-core/test/engine/neuro-longrun.test.ts`

**Interfaces:**
- Consumes: the engine wiring (Tasks 12–13), 7g's `vaporiser` event and PK, `createNeuroState`/`applyNeuroCommand`/`stepNeuroTo` (Task 11) and `busFixture`/`opioid`/`nmbAgent`/`vol` (Task 2) for the CPU measurement; `LONGRUN_HOURS`/`LONGRUN_S` (`test/helpers/longrun.ts`: 24 sim-h locally, 6 on CI — the CI rule amendment).

- [x] **Step 1: Write the tests.** `packages/engine-core/test/engine/neuro-acceptance.test.ts` (exact; ≈ 30 s, yields every sim-minute; it logs each measured number for the gate note):

```ts
// Stage 7f acceptance through the engine (scope 7f-5): residual block at extubation, depth bands, emergence,
// the neuro step's own CPU cost, Stage 3 untouched without drugs (the 24 h no-drift run is neuro-longrun.test.ts;
// yields once per sim-minute: CI rule). Drugs and the vaporiser go through 7g (R51 §3–4). Every band here is a TARGET (R45).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';
import { applyNeuroCommand, createNeuroState, stepNeuroTo } from '../../src/l2/neuro/pipeline.ts';
import { busFixture, nmbAgent, opioid, vol } from '../helpers/neuro-bus.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `a${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: string, infusion = false) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) });
const yieldNow = () => new Promise((r) => setImmediate(r));
async function run(e: ReturnType<typeof createEngine>, toS: number): Promise<void> {
  for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t < toS; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  e.advanceTo(toS);
}
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
const VENT = { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 };
/** ≈ 1 MAC maintenance at 40 y on 7g's circle model [ENG input, not a model constant; 2.5 % measured on the merged
 * base]: if the measured end-tidal MAC is outside 0.9–1.1 in the depth test, change THIS dial (record it), never the DI band. */
const SEVO_1MAC = { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

describe('Stage 7f acceptance (engine)', { timeout: 600_000 }, () => {
  it('residual block at extubation (TOFR < 0.9, natural airway): smaller breaths than the unblocked control', async () => {
    const vt = async (roc: boolean) => {
      const e = createEngine({ seed: 21, patient: ADULT });
      const b: number[] = [];
      e.on((x) => { if (x.type === 'breath' && x.t > 1920) b.push(x.vtMl); }, ['breath']);
      e.dispatch(ev({ kind: 'airwayDevice', device: 'none' }));
      if (roc) e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
      await run(e, 2100);
      return b;
    };
    const blocked = await vt(true);
    const control = await vt(false);
    console.log(`residual block: VT ${mean(blocked).toFixed(0)} vs control ${mean(control).toFixed(0)} mL (ratio ${(mean(blocked) / mean(control)).toFixed(2)})`);
    expect(mean(control)).toBeGreaterThan(400);
    expect(mean(blocked)).toBeLessThan(0.75 * mean(control)); // 32–35 min on 7g's PK: TOF 3–4 with fade → weak + obstructed
  });
  it('depth bands through the engine: sevoflurane ≈ 1 MAC → displayed DI 38–48; off → conscious within 5–12 min [ENG band]', async () => {
    const e = createEngine({ seed: 22, patient: ADULT });
    const di: number[] = [];
    const mac: number[] = [];
    const marks: { t: number; k: string }[] = [];
    e.on((x: EngineEvent) => {
      if (x.type === 'measurement' && x.values.di?.value != null) di.push(x.values.di.value);
      if (x.type === 'measurement' && x.values.mac?.value != null) mac.push(x.values.mac.value);
      if (x.type === 'neuroMark') marks.push({ t: x.t, k: x.kind });
    });
    e.dispatch(cmd({ type: 'device', action: { device: 'depth', action: 'on' } } as Body));
    e.dispatch(ev(VENT));
    e.dispatch(ev(SEVO_1MAC));
    await run(e, 1800);
    const macNow = mean(mac.slice(-60));
    expect(macNow).toBeGreaterThan(0.9); // input check (the dial), not a model band
    expect(macNow).toBeLessThan(1.1);
    const last = mean(di.slice(-60));
    console.log(`depth: end-tidal MAC ${macNow.toFixed(2)} → displayed DI ${last.toFixed(1)}`);
    expect(last).toBeGreaterThan(38);
    expect(last).toBeLessThan(48);
    e.dispatch(ev({ ...SEVO_1MAC, dialPct: 0 }));
    await run(e, 1800 + 900);
    const wake = marks.find((m) => m.k === 'emergence' && m.t > 1800);
    console.log(`emergence ${wake ? ((wake.t - 1800) / 60).toFixed(1) : 'none'} min after the vaporiser is closed`);
    expect(wake && (wake.t - 1800) / 60).toBeGreaterThan(5);
    expect(wake && (wake.t - 1800) / 60).toBeLessThan(12);
  });
  it('no drugs: the neuro hook is neutral — spontaneous breaths keep Stage 3\'s size', async () => {
    const e = createEngine({ seed: 23, patient: ADULT });
    const b: EngineEvent[] = [];
    e.on((x) => b.push(x), ['breath']);
    await run(e, 120);
    const vts = b.map((x) => (x as { vtMl: number }).vtMl);
    expect(vts.length).toBeGreaterThan(20);
    expect(Math.min(...vts)).toBeGreaterThan(300);
  });
  it('CPU: the neuro step itself (PD + events; the PK is 7g\'s) costs ≤ 0.05 ms per 20 ms tick with every agent on the bus', () => {
    const ns = createNeuroState(ADULT, 24);
    applyNeuroCommand(ns, cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body), 0);
    applyNeuroCommand(ns, cmd({ type: 'device', action: { device: 'depth', action: 'on' } } as Body), 0);
    const bus = busFixture({
      cns: { propCe: 2, opioidCeRemiEq: 3, macBrain: 0.8, benzoCeMidazEq: 0.5, ketamineCe: 0.3 },
      nmb: { achGain: 1.5 },
      agents: {
        remifentanil: opioid(1, 1.2), fentanyl: opioid(1, 1),
        rocuronium: nmbAgent(700, 600, 0.6), succinylcholine: nmbAgent(20, 30, 1),
      },
      volatiles: { sevoflurane: vol(0.65, 1.8), n2o: vol(0.48, 104) },
    });
    const t0 = performance.now();
    for (let s = 1; s <= 3600; s++) {
      stepNeuroTo(ns, s, { tempC: 37, mechanical: true }, bus);
      ns.out.length = 0; // the engine flushes every tick
    }
    const perTick = (performance.now() - t0) / (3600 * 50);
    console.log(`neuro step CPU ${perTick.toFixed(4)} ms per 20 ms tick`);
    expect(perTick).toBeLessThan(0.05);
  });
});
```

`packages/engine-core/test/engine/neuro-longrun.test.ts` (exact; the SLOW glob `*longrun*` already covers it; prototype: 24 h in 175 s on a laptop):

```ts
// Stage 7f no-drift run (scope 7f-5) on the long-run helper: 24 sim-h locally, 6 on CI (test/helpers/longrun.ts).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';
import { LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `l${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };

describe('Stage 7f long run', () => {
  it(`${LONGRUN_HOURS} h with a maintenance anaesthetic: no NaN, TOF trains keep their cadence, DI stays in band`, { timeout: 1_800_000 }, async () => {
    const e = createEngine({ seed: 25, patient: ADULT });
    let bad = 0;
    let tofN = 0;
    let lastDi = 0;
    e.on((x) => {
      if (x.type === 'anaesthesia') {
        if (!Number.isFinite(x.di) || !Number.isFinite(x.mac) || !Number.isFinite(x.macBrain)) bad++;
        lastDi = x.di;
      }
      if (x.type === 'tof') tofN++;
    }, ['anaesthesia', 'tof']);
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }));
    e.dispatch(ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.1, unit: 'mcg/kg/min', route: 'iv', infusion: true }));
    e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 60 } }));
    for (let t = 60; t <= LONGRUN_S; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    expect(bad).toBe(0);
    expect(tofN).toBeGreaterThanOrEqual(LONGRUN_S / 60 - 1);
    expect(tofN).toBeLessThanOrEqual(LONGRUN_S / 60 + 1);
    expect(lastDi).toBeGreaterThan(30);
    expect(lastDi).toBeLessThan(50);
  });
});
```

- [x] **Step 2: Run; expect PASS** — `… exec vitest run test/engine/neuro-acceptance.test.ts test/engine/neuro-longrun.test.ts` (4 + 1). Prototype on the merged base: residual block VT 100 vs 500 mL (×0.20 — on 7g's PK the patient is still at TOF 1–2 at 32–35 min); sevoflurane dial 2.5 % → end-tidal MAC 1.00, displayed DI 44.0, emergence 7.0 min after the vaporiser is closed; neuro step 0.0003 ms per tick. The bands are targets (R45): if the residual-block VT is not < 0.75 × control, log `ps.neuro.last.tof` and `ps.neuro.resp.obstruction` at 32–35 min before touching any constant; if the measured end-tidal MAC is outside 0.9–1.1, change the `SEVO_1MAC` dial (record it), never the DI band; if the emergence time falls outside 5–12 min, report the measured value (the band is [ENG]: no tables row; the wash-out is 7g's volatile model, not 7f's to tune).

- [x] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/neuro-acceptance.test.ts packages/engine-core/test/engine/neuro-longrun.test.ts
git commit -m "test(neuro): engine acceptance on 7g's PK — residual block at extubation, depth bands (sevoflurane dial 2.5) and emergence, neuro CPU per tick, 24 h no drift on the long-run helper" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 18: Regression sweep — Stage 3 drive tests, snapshots, determinism, sibling tests, CI time

**Files:**
- Modify: `packages/engine-core/test/engine/neuro-engine.test.ts` (one snapshot test)
- Modify (declared exception **E-7f-2**, a sibling test re-specified for a stated reason): `packages/engine-core/test/engine/circ-sanity-2.test.ts` (7a's; one constant + the first event of its two R23 runs)

- [x] **Step 1: Add the snapshot test** to `neuro-engine.test.ts` (inside its `describe`, after the determinism test):

```ts
  it('snapshot/restore mid-block continues the TOF stream identically', async () => {
    const mk = () => createEngine({ seed: 12, patient: { weightKg: 70 } });
    const a = mk();
    a.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body));
    a.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
    await run(a, 600);
    const snap = a.snapshot();
    const b = mk();
    b.restore(snap);
    const ta: string[] = [];
    const tb: string[] = [];
    a.on((x) => { if (x.type === 'tof') ta.push(JSON.stringify(x)); }, ['tof']);
    b.on((x) => { if (x.type === 'tof') tb.push(JSON.stringify(x)); }, ['tof']);
    await run(a, 900);
    await run(b, 900);
    expect(tb).toEqual(ta);
    expect(ta.length).toBeGreaterThan(15);
  });
```

Run `… exec vitest run test/engine/neuro-engine.test.ts -t snapshot` → 1 passed (prototype).

- [x] **Step 2: E-7f-2 — keep 7a's R23 scenario's airway open.** Run `PME_TEST_SET=slow npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-2.test.ts`. Prototype: the pre-declared `it.fails('R23: the same run rescued with ephedrine 10 mg …')` now PASSES its assertion (so `it.fails` reports a failure): the AS + CAD patient breathes spontaneously through a natural airway, and since Tasks 11–13 propofol 1.5 mg/kg obstructs it (decision 12) — HR falls to 38–45, PAWP to 18–22, kIsch 0.86 at +3 min — a hypoxic bradycardia the circulation scenario never intended (the base without 7f: HR 74, kIsch 1.00). The scenario presumes induction with the airway managed, so both R23 runs get a supraglottic airway at t = 0 (7f's `airwayDevice` event; no ventilation change): after `const propofol = { kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg', route: 'iv' };` add

```ts
// Stage 7f (E-7f-2): the R23 runs keep the airway open with a supraglottic device — since 7f, propofol obstructs an
// unprotected natural airway (7f decision 12) and the hypoxic bradycardia would confound the ischaemia scenario.
const SGA: [number, Record<string, unknown>] = [0, { kind: 'airwayDevice', device: 'sga' }];
```

and in the two `it.fails('R23: …')` runs replace `[[60, propofol], [210,` with `[SGA, [60, propofol], [210,`. Re-run: 6 passed, the two R23 tests back to their base behaviour (prototype: ephedrine run HR 73–74, kIsch 0.99–1.00; both remain `it.fails` as 7a declared them, NR-2). Record E-7f-2 with these numbers in the gate note. If ANY other sibling test changes on your base, STOP and report it with the neuro state at that moment (R45) — do not re-specify it.

- [x] **Step 3: Run the whole engine-core suite** `npx -y pnpm@9.15.9 --filter @pme/engine-core test` (both sets; the slow set runs the three long-run files). Every Stage 3 respiratory test (driver, pipeline, apnoea, capnogram, RR), every Stage 7b/7c test and every Stage 7g test (`test/l2/pk/**`, `test/engine/pk-*.test.ts`) must pass unchanged: without drugs `ns.resp` is idle (`rrMult = vtMult = 1`, no obstruction, no cleft), so `driverCtx` returns exactly the Stage 3 values in MANUAL, and in MODELED the drive holds the resting pattern (Task 13: RR 15.2 vs 15.2). Prototype: fast set 211 files, 926 passed + 1 skipped; slow set (`PME_TEST_SET=slow`, 24 h locally) 27 files, 115 passed + the one E-7f-2 flip before Step 2 (after it: `circ-sanity-2` 6/6); `neuro-longrun` 24 h in 175 s If any Stage 3/7a/7b/7c/7g number moves (other than E-7f-2), STOP and report it (R45).

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/engine/neuro-engine.test.ts packages/engine-core/test/engine/circ-sanity-2.test.ts
git commit -m "test(neuro): snapshot/restore mid-block; 7a's R23 runs keep an SGA airway (E-7f-2); full engine-core suite green" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 19: Demo `stage7f.html`, screenshots and the physiology-console map

**Files:**
- Create: `apps/demo/stage7f.html`, `apps/demo/src/stage7f.ts`, `apps/demo/scripts/stage7f-shots.mjs`, `apps/demo/src/physiology-console/organs-neuro.test.ts`
- Modify: `apps/demo/vite.config.ts` (one input), `apps/demo/index.html` (one link), `apps/demo/src/physiology-console/organs.ts` (7x's `INTERNAL_PREFIXES`: one additive block, its own commit — Step 7)

- [x] **Step 1: The page** `apps/demo/stage7f.html` (exact):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 7f: neuromuscular block and anaesthetic depth</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      .row { display: flex; gap: 12px; max-width: 1240px; }
      #monitor { height: 620px; flex: 1; border: 1px solid #333; }
      .tiles { width: 220px; display: flex; flex-direction: column; gap: 8px; }
      .tile { border: 1px solid #333; padding: 6px 10px; font-variant-numeric: tabular-nums; }
      .tile .lab { font-size: 12px; opacity: 0.8; }
      .tile .big { font-size: 40px; line-height: 1.1; }
      .tile .sub { font-size: 13px; }
      .twitch { display: inline-block; width: 18px; margin-right: 4px; background: currentColor; vertical-align: bottom; }
      .controls { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; margin: 10px 0; max-width: 1240px; }
      fieldset { border: 1px solid #333; padding: 6px 10px; }
      legend { color: #888; }
      button, select, input { font: inherit; }
      #panel { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; max-width: 1240px; }
      #log { font: 12px ui-monospace, monospace; white-space: pre; color: #fc8; max-height: 120px; overflow: auto; }
    </style>
  </head>
  <body>
    <div class="row">
      <div id="monitor"></div>
      <div class="tiles">
        <div class="tile" id="tofTile"><div class="lab">NMT (TOF)</div><div class="big" id="tofBig">--</div><div class="sub" id="tofSub">stimulator off</div><div id="tw" style="height:44px"></div></div>
        <div class="tile" id="diTile"><div class="lab">DEPTH (BIS-like)</div><div class="big" id="diBig">--</div><div class="sub" id="diSub">SR --</div></div>
        <div class="tile" id="aaTile"><div class="lab">AGENT</div><div class="big" id="macBig">--</div><div class="sub" id="aaSub">Et --</div></div>
      </div>
    </div>
    <div class="controls">
      <fieldset><legend>Scripted</legend>
        <button id="induction">Induction: fentanyl → propofol → rocuronium → intubate → sevo</button>
        <button id="reverse">Sugammadex 2 mg/kg</button>
        <button id="neo">Neostigmine 0.05 mg/kg</button>
        <button id="remi">Remifentanil apnoea</button>
        <button id="residual">Residual block at extubation</button>
      </fieldset>
      <fieldset><legend>Devices</legend>
        <button id="tofStart">TOF every 15 s</button> <button id="ptc">PTC</button> <button id="depthOn">Depth monitor</button>
      </fieldset>
      <fieldset><legend>Speed</legend>
        <select id="speed"><option value="1">×1</option><option value="2">×2</option><option value="4" selected>×4</option></select>
      </fieldset>
    </div>
    <div id="panel"></div>
    <div id="log"></div>
    <script type="module" src="./src/stage7f.ts"></script>
  </body>
</html>
```

- [x] **Step 2: The script** `apps/demo/src/stage7f.ts` (exact):

```ts
// Stage 7f demo (R32 7f): TOF and depth tiles beside the monitor, the instructor "anaesthetic state" panel, and the
// scripted sequences of the plan: induction (fentanyl → propofol → rocuronium → laryngoscopy/intubation → sevoflurane
// on the ventilator), sugammadex / neostigmine reversal, remifentanil apnoea, residual block at extubation. Every drug
// and the vaporiser go through Stage 7g (R51 §3–4); 7f supplies the TOF/depth devices, the tiles' data and the panel.
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 17, patient: { ageY: 45, weightKg: 70, heightCm: 172, sex: 'M', sensors: { spo2: 'on', co2: 'on', abp: 'connected' } } },
  lanes: ['ecgII'],
  waves: ['abp', 'pleth', 'co2', 'resp'],
});
pm.setTimeScale(4);
let n = 0;
let simT = 0;
const send = (c: Body) =>
  pm.dispatch({ id: `7f-${++n}`, issuedBy: 'stage7f', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: string, infusion = false) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', infusion });
const dev = (action: Record<string, unknown>) => send({ type: 'device', action } as Body);
const log = (s: string) => {
  const el = $('log');
  el.textContent = `${fmt(simT)} ${s}\n${el.textContent ?? ''}`;
};
const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// Skin colours for the two tiles (decision 14: NMT and BFA colour keys; fall back when a skin has none)
const colors = (pm.skin?.skin.colors ?? {}) as Record<string, string>;
$('tofTile').style.color = colors.NMT ?? '#e0e0e0';
$('diTile').style.color = colors.BFA ?? '#9ad0ff';
$('aaTile').style.color = colors.AGENTS ?? '#f0c040';

// A tiny scheduler in SIM time (scripts survive speed changes)
const queue: { at: number; run: () => void }[] = [];
const at = (dt: number, run: () => void) => queue.push({ at: simT + dt, run });

pm.on((e: EngineEvent) => {
  if ('t' in e && typeof e.t === 'number') simT = Math.max(simT, e.t);
  (window as unknown as { __simT: number }).__simT = simT; // the screenshot script waits on sim time (Step 4)
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if (q && q.at <= simT) {
      queue.splice(i, 1);
      q.run();
    }
  }
  if (e.type === 'tof') {
    if (e.mode === 'ptc') {
      $('tofSub').textContent = `PTC ${e.ptc ?? '—'}`;
      return;
    }
    $('tofBig').textContent = e.count === 4 && e.ratio !== null ? `${Math.round(e.ratio * 100)}%` : `${e.count}/4`;
    $('tofSub').textContent = `TOF count ${e.count}${e.ratio !== null ? ` · ratio ${e.ratio.toFixed(2)}` : ''}`;
    $('tw').innerHTML = [0, 1, 2, 3].map((i) => `<span class="twitch" style="height:${Math.round(40 * (e.twitches[i] ?? 0))}px"></span>`).join('');
  } else if (e.type === 'measurement') {
    const v = e.values;
    if (v.di) $('diBig').textContent = v.di.value === null ? '--' : String(v.di.value);
    if (v.sr) $('diSub').textContent = `SR ${v.sr.value ?? '--'} %`;
    if (v.mac) $('macBig').textContent = `${v.mac.value?.toFixed(1)} MAC`;
    if (v.etAa) $('aaSub').textContent = `Et ${v.etAa.value?.toFixed(1)} %`;
  } else if (e.type === 'anaesthesia') {
    const ce = Object.entries(e.ce).map(([k, c]) => `${k} ${k === 'propofol' ? `${(c / 1000).toFixed(2)} µg/mL` : `${c.toFixed(2)} ng/mL`}`).join(' · ');
    $('panel').textContent =
      `t ${fmt(e.t)}  DI ${e.di}  SR ${e.sr}%  MAC end-tidal ${e.mac} · brain ${e.macBrain} (effective ${e.macEff})  ${e.conscious ? 'CONSCIOUS' : 'unconscious'}${e.awarenessRisk ? '  ⚠ AWARENESS RISK' : ''}\n` +
      `TOF ${e.tof.count}/4 ratio ${e.tof.ratio} PTC ${e.tof.ptc} · block thumb ${e.block.thumb} diaphragm ${e.block.dia}\n` +
      `drive: opioid ${e.drive.opioidDep} hypnotic ${e.drive.hypnoticDep} resting VE ×${e.drive.veRest}${e.drive.apnoea ? ' APNOEA' : ''} obstruction ${e.drive.obstruction}\n` +
      `stress ${e.stress}${e.movement ? ' MOVING' : ''} · antinociception ${e.outputs.antinoc.toFixed(2)} · thermoregulatory depth ${e.outputs.thermoDepth.toFixed(2)} · CMRO2 ×${e.outputs.cmro2Mult.toFixed(2)}\n` +
      `Ce: ${ce}`;
  } else if (e.type === 'neuroMark') log(e.kind);
});

$('speed').addEventListener('change', () => pm.setTimeScale(Number(($('speed') as HTMLSelectElement).value)));
$('tofStart').addEventListener('click', () => void dev({ device: 'tof', action: 'start', intervalS: 15 }));
$('ptc').addEventListener('click', () => void dev({ device: 'tof', action: 'ptc' }));
$('depthOn').addEventListener('click', () => void dev({ device: 'depth', action: 'on' }));
$('induction').addEventListener('click', () => {
  void dev({ device: 'tof', action: 'start', intervalS: 15 });
  void dev({ device: 'depth', action: 'on' });
  void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 });
  void drug('fentanyl', 1.5, 'mcg/kg');
  log('fentanyl 1.5 µg/kg');
  at(120, () => { void drug('propofol', 2, 'mg/kg'); log('propofol 2 mg/kg'); });
  at(180, () => { void drug('rocuronium', 0.6, 'mg/kg'); log('rocuronium 0.6 mg/kg'); void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 }); });
  // `stimulus` is Stage 7e's event (intensity 0–2, held until the next one; 7f observes it: R51 addenda 12, 17)
  at(300, () => { void ev({ kind: 'stimulus', intensity: 1.5 }); log('laryngoscopy + intubation (stimulus 1.5)'); });
  at(330, () => {
    void ev({ kind: 'stimulus', intensity: 0 });
    void ev({ kind: 'airwayDevice', device: 'ett' });
    void ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
    void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 3, fgfLpm: 6 }); // 7g's vaporiser (R51 §4); over-pressure for the wash-in
    log('ventilator, sevoflurane dial 3 % (FGF 6 L/min)');
  });
  at(1200, () => { void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }); void ev({ kind: 'stimulus', intensity: 1 }); log('incision (stimulus 1, held)'); });
});
$('reverse').addEventListener('click', () => { void drug('sugammadex', 2, 'mg/kg'); log('sugammadex 2 mg/kg'); });
$('neo').addEventListener('click', () => { void drug('neostigmine', 0.05, 'mg/kg'); log('neostigmine 0.05 mg/kg'); });
$('remi').addEventListener('click', () => {
  void ev({ kind: 'airwayDevice', device: 'none' });
  void drug('remifentanil', 1, 'mcg/kg');
  void drug('remifentanil', 0.3, 'mcg/kg/min', true);
  log('remifentanil 1 µg/kg + 0.3 µg/kg/min (spontaneous)');
  at(240, () => { void drug('remifentanil', 0, 'mcg/kg/min', true); log('remifentanil off'); });
});
$('residual').addEventListener('click', () => {
  // extubate at TOF 2–3 without reversal: TOFR < 0.9 → weak, obstructed breathing
  void dev({ device: 'tof', action: 'start', intervalS: 15 });
  void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0, fgfLpm: 6 });
  void ev({ kind: 'airwayDevice', device: 'none' });
  void ev({ kind: 'ventilation', source: 'spontaneous' });
  log('extubated without reversal (residual block)');
});
```

- [x] **Step 3: Register the page.** `apps/demo/vite.config.ts`: after `        stage7g: page('stage7g'), // Stage 7g` add `        stage7f: page('stage7f'), // Stage 7f`. `apps/demo/index.html`: after the Stage 7g list item (`      <li><a href="./stage7g.html">Stage 7g: …</a></li>`) add `      <li><a href="./stage7f.html">Stage 7f: neuromuscular block, TOF, anaesthetic depth, drive depression</a></li>`. Then `npx -y pnpm@9.15.9 -r typecheck` (prototype: clean).

- [x] **Step 4: Screenshot script** `apps/demo/scripts/stage7f-shots.mjs`:

```js
// Gate 7f screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7f-shots.mjs http://localhost:4817 docs/gates/stage-7f
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7f'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (s) => p.waitForTimeout(s * 1000);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1000, height: 880 } });
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#induction'); // ×4: 1 sim-min = 15 s
await wait(40);
await shot('7f-induction-propofol'); // DI falling, apnoea mark, TOF 4/4
await wait(35);
await shot('7f-rocuronium-tof0'); // TOF 0/4 after rocuronium, laryngoscopy stress blunted
await wait(120);
await shot('7f-sevo-maintenance'); // ~1 MAC, DI 40–45, TOF 0, cleft-free capnogram on the ventilator
await p.click('#ptc');
await wait(8);
await shot('7f-ptc');
await p.click('#reverse');
await wait(45);
await shot('7f-sugammadex'); // TOFR ≥ 90 % within ~3 sim-min
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#remi');
await wait(60);
await shot('7f-remifentanil-apnoea'); // RR falls then apnoea; EtCO2 trace flat; RESP flat
// Residual block: the induction script gives rocuronium at sim 180 s; extubate at least 30 sim-min after it (a faded
// TOF on 7g's PK), waiting on the page's sim clock rather than on wall time.
const untilSim = (s) => p.waitForFunction((x) => (window.__simT ?? 0) >= x, s, { timeout: 900_000, polling: 1000 });
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#induction'); // TOF every 15 s, depth on, rocuronium at sim 180 s
await untilSim(180 + 30 * 60); // ≥ 30 sim-min after rocuronium (×4: ≈ 7.5 real minutes)
await p.click('#residual');
await untilSim(180 + 30 * 60 + 90);
await shot('7f-residual-block'); // faded TOF (count 1–3 on 7g's PK), weak shallow breaths, obstruction in the panel
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
```

- [x] **Step 5: Build and look.** `npx -y pnpm@9.15.9 --filter demo build`, serve (`cd apps/demo && npx vite preview --port 4817 --strictPort &`), run the script, open every PNG (≤ 60 KB each; reduce the viewport if larger) and check: the TOF tile goes 4/4 → 0/4 within ~2 sim-min of rocuronium; the depth tile reads 40–50 in maintenance; the panel shows Ce values and "unconscious"; sugammadex brings the TOF tile to ≥ 90 %; remifentanil gives a flat CO2 trace with the apnoea mark in the log; the residual-block shot is taken ≥ 30 sim-min after rocuronium (the script waits on `window.__simT`) and shows a faded TOF (count 1–3 on 7g's PK, whose spontaneous TOFR 0.9 comes at ≈ 81 min) with weak, shallow breaths; the panel's MAC line shows the end-tidal and brain values separately. The script runs ≈ 12 minutes. Record what you saw in the gate note.

- [x] **Step 6: Commit and push**

```bash
git add apps/demo/stage7f.html apps/demo/src/stage7f.ts apps/demo/scripts/stage7f-shots.mjs apps/demo/vite.config.ts apps/demo/index.html
git commit -m "feat(demo): stage7f — induction with TOF and depth tiles, sugammadex/neostigmine reversal, remifentanil apnoea, residual block" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [ ] **Step 7: The physiology console (G7x) — one additive commit.** Write `apps/demo/src/physiology-console/organs-neuro.test.ts` (exact):

```ts
import { describe, expect, it } from 'vitest';
import { groupOf, isInternal } from './organs.ts';

describe('Stage 7f paths in the physiology console (7x organ map)', () => {
  it('neuro machinery is internal; the published 7e fields, the resp hook and the outputs stay visible under Neuro', () => {
    for (const p of ['neuro.tof.nextT', 'neuro.last.x.brain.propofol', 'neuro.flags.aware', 'neuro.fasc.from', 'neuro.doseSeenT']) expect(isInternal(p)).toBe(true);
    for (const p of ['neuro.antinoc', 'neuro.nmb', 'neuro.thermoDepth', 'neuro.resp.veRest', 'neuro.outputs.cmro2Mult']) {
      expect(isInternal(p)).toBe(false);
      expect(groupOf(p)).toBe('neuro');
    }
    expect(isInternal('resp.spont.nextT')).toBe(true);
    expect(isInternal('resp.spont.paco2Set')).toBe(false);
  });
});
```

Run `npx -y pnpm@9.15.9 --filter demo exec vitest run src/physiology-console/organs-neuro.test.ts` → FAIL (`neuro.tof.nextT`… not internal). In `apps/demo/src/physiology-console/organs.ts`, append to `INTERNAL_PREFIXES` after its last entry (prototype base: the 7c line ending `'blood.lung.pCap', 'blood.pinHbfRel',`):

```ts
  // Stage 7f neuro machinery: the TOF stimulator's schedule/PRNG, the last step's inputs and PD scratch, flags, dose
  // bookkeeping and the fasciculation save (the published antinoc/nmb/thermoDepth, resp hook and outputs stay visible)
  'neuro.tof', 'neuro.last', 'neuro.flags', 'neuro.fasc', 'neuro.emgBase', 'neuro.doseSeenT', 'neuro.diShown', 'resp.spont.nextT',
```

Run the test again and the console's suite: `… --filter demo exec vitest run src/physiology-console` → PASS (prototype: 8 files, 116 tests). The `neuro` group mapping already exists in `GROUP_BY_PREFIX` (7x); no other console file changes. Commit:

```bash
git add apps/demo/src/physiology-console/organs.ts apps/demo/src/physiology-console/organs-neuro.test.ts
git commit -m "feat(console): mark Stage 7f neuro machinery internal in the physiology console's organ map (G7x)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 20: Gate note and pull request

**Files:**
- Create: `docs/gates/stage-7f.md`, `docs/gates/stage-7f/*.png`

- [ ] **Step 1: Full gate run.** `git fetch origin && git merge origin/main` (R51 §7), then `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e` — all green (the pre-declared `it.fails` tests report as expected failures: `[FU-3 item 1]`, `[R-7f-7]`, `[R-7f-9]`).

- [ ] **Step 2: Write `docs/gates/stage-7f.md`** with these sections (fill every number from this branch's test runs; the prototype's are in the plan's "Prototype" table for comparison):

```markdown
# Gate 7f — neuromuscular block, anaesthetic depth, drive depression, anaesthetic state

## Base and chain
- Base: origin/main <sha> (7a, 7b, 7c, 7g, 7x, FU-2 merged; 7e <merged / not merged>). Merges of origin/main before engine.ts edits: <list of shas>.
- validate/apply/advance anchors used (R51 addendum 14 chain): <the lines 7f's inserts follow>.
- 7g bus fields found in types-pk.ts (Task 1 guard): agents[].{unit, plasma, brain, vent, nmj, dia, cumulativeMgPerKg}, volatiles{fet, brain, macAge, macFrac} incl. n2o, doses{agent, mgPerKg|null, amount, amountUnit, t}, antagonist.opioid — Task 3 contract test: <pass/fail per test>.
- `stimulus`: 7f temporary owner <yes/no> (decision 17).

## Acceptance numbers on 7g's PK (measured → band)
- Rocuronium 0.6: TOF 0 <x> min, T1 25 % <x>, spontaneous TOFR 0.9 <x> → 1–2.2 / 26–38 / 55–95 (R51 addendum 17); 1.2: <x> / <x> → ≤ 1.2 / 40–90.
- Vecuronium 0.1: max block <x> / T1 25 % <x> → 3–5 / 25–30; cisatracurium 0.15: <x> / <x> → 2–3 / ≈ 45; succinylcholine 1 (FU-3 item 1, it.fails): T1 ≤ 5 % <x> / T1 10 % <x> / 90 % <x>; het <x> min; hom <x> h.
- Sugammadex 2 at TOF 2 <x>; 4 at PTC <x>; 16 after roc 1.2 <x>; 0.5 underdose peak/fall <x>/<x> (R-7f-7, it.fails).
- Neostigmine 0.05 at TOF 2 <x> (NEO_G50 <x>; spontaneous <x>); 0.07 at PTC: TOFR at 10 min <x>.
- Interactions: 1 MAC ratio <x>; 34 °C ratio <x>; myasthenia ratio <x>; burn: no complete block.
- Depth: propofol Ce 3/4 µg/mL <x>/<x>; 1 MAC <x>; engine DI at 1 MAC <x> (dial <x> %, measured end-tidal MAC <x>); emergence <x> min [ENG band].
- Drive: remifentanil curve; engine apnoea/recovery; naloxone recovery <x> min (F2).
- MODELED drive (Task 13): resting RR/PaCO2 <x>/<x> vs MANUAL <x>/<x>; HCO3 <x> → PaCO2 <x> (Winter's <x>), VE <x> vs <x>; remifentanil RR <x> vs <x>; acidosis + remifentanil PaCO2 <x> vs <x>.
- Residual block VT ratio <x> (TOF count/ratio at 32–35 min <x>/<x>); reflex drop under sevoflurane <x> vs awake <x> (R-7f-9, 7g only); propofol MAP nadir <x> % and DI nadir <x>.
- CPU per tick <x> ms (neuro step alone); long run (<24|6> h): NaN 0, TOF trains <n>, final DI <x>.

## Fitted and [ENG] constants (R51 §5)
- NMB_PD as committed: vecuronium <EC50/γ>, cisatracurium <EC50/γ>, succinylcholine 200/4 (not fitted: FU-3) — each with the fit it met; rocuronium 823/1424 γ <x> [P]. "Max block" rule (decision 3).
- NEO_G50 <x> (NEO_SMAX 0.7); STIM_FULL 1.5; GLYCO_U 1.2; SEVO_1MAC dial <x> %; any [ENG, band missed] rows — NEEDS A RULING.

## Deviations, exceptions and questions for Ali
- D-7f-2: sugammadex binding (plasma + effect site, ke0 0.095/0.152) is 7g's; 7f's reversal bands measured on it: <pass/fail>; R-7f-7 (underdose) open.
- D-7f-3: fentanyl ventilatory potency 0.55× remifentanil (tables 1.6×), Q54.
- D-7f-1 (interim rocuronium Vss 0.45) RETIRED with the interim PK (R51).
- E-7f-1 (controller log line); E-7f-2 (7a's R23 runs keep an SGA airway: numbers before/after).
- Q-7f-1: mapSetShiftMmHg published only (A11). Q-7f-2: §5e system conditions (7e implements them). Q-7f-3 CLOSED by R51 addenda 12/17 (7e's `stimulus`, 7f observes).
- MODELED drive limits (v1): metabolic alkalosis uncompensated; the J-receptor term sees only 7c's lung water (7b does not publish the conditions' EVLWI).
- Midazolam/ketamine ng/mL-equivalents from 7g's gamma rows: MIDAZ_NG_PER_REF 100, KET_NG_PER_REF 1500 [ENG].

## Requests (R-7f-1…9) — status

## Screenshots
- one line per PNG in docs/gates/stage-7f/ (what it shows, what to look at).
```

- [ ] **Step 3: Open the PR**

```bash
git add docs/gates/stage-7f.md docs/gates/stage-7f
git commit -m "docs(gates): Stage 7f gate note — NMB/TOF on 7g's PK, reversal, depth, drive depression, MODELED drive with Winter's, anaesthetic state" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh pr create --base main --head stage-7f-neuro-depth --title "Stage 7f: neuromuscular block, anaesthetic depth, drive depression, anaesthetic state" --body "$(cat <<'BODY'
Stage 7f (R32) per docs/plans/stage-7f-neuro-depth.md, on the R51 drug-layer contract (addenda 8–17). Gate note: docs/gates/stage-7f.md.

- l2/neuro/**: reader of 7g's DrugBus (no PK of its own, R51 §1; naloxone applied to the per-agent opioid sites); NMB effect sites → TOF count/ratio/PTC with EC50s fitted on 7g's PK; neostigmine ceiling on 7g's acetylcholine gain; interactions/profiles; BIS-like depth index on 7g's age-adjusted brain MAC, consciousness, antinociception; ventilatory depression on 7g's separate opioid ventilatory site; MODELED spontaneous breathing through 7b's chemoreflex drive with Winter's compensation from 7c's HCO3 (G7b ruling 8); outputs for 7d/7e (ps.neuro.{antinoc, nmb, thermoDepth}); TOF stimulator device; 1 Hz anaesthetic-state event; 7e's `stimulus` observed.
- Engine: neuro steps at 10 Hz after 7g's advancePk and before the breath driver; validate/apply after 7g's hooks (drug and vaporiser events are 7g's; 7f observes bus.doses); drive hook on spontaneous breaths; fasciculation on the committed state. No 7a edit (R51 addendum 8), no potassium (7c), no MH (7e).
- Scenarios (6, [draft]), the stage7f demo, the physiology console's neuro machinery map.
- Pre-declared it.fails: FU-3 item 1 (succinylcholine onset), R-7f-7 (sugammadex underdose), R-7f-9 (sevoflurane reflex blunting). Exceptions E-7f-1, E-7f-2.

Deviations and questions for Ali: D-7f-2, D-7f-3, Q-7f-1, Q-7f-2 (see the gate note).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Do NOT merge (R21: the orchestrator inspects the gate).

---

## Requests to other stages (recorded; nothing here edits their plans)

- **R-7f-1 (7g) — MET on the merged base:** `DrugBus` carries every field 7f reads (decision 1: `agents[id].{unit, plasma, brain, vent, nmj, dia, cumulativeMgPerKg}`, `volatiles[agent].{fet, brain, macAge, macFrac}` incl. `n2o`, `doses`, `antagonist`), the `vaporiser` event carries `agent`, the cholinesterase clearance is the single `PCHE_CL_MULT` (addendum 10). Task 1's guard and Task 3's contract test keep it so. (7g's `pkPatientOf` does not map `neuro.cholinesterase`: the engine passes `pche` — Task 12.)
- **R-7f-2 (7g):** neostigmine's time course, muscarinic bradycardia and glycopyrrolate/atropine cover stay with 7g's gamma rows; 7f reads only `bus.nmb.achGain`. Sugammadex binding (plasma + effect site) stays 7g's; 7f's reversal bands are its acceptance (D-7f-2).
- **R-7f-3 (7d):** read `ps.neuro.outputs.cmro2Mult` (CMRO2) — and `di`/`sr` of the `anaesthesia` event if the brain module wants burst suppression.
- **R-7f-4 (7e):** read `ps.neuro.{antinoc, nmb, thermoDepth}` (published as the 7e plan asks) and, if 7e wants to start MH by itself, the `mhTrigger` neuroMark (7f issues no condition; the scenario scripts `condition mh`). **If 7f merged first:** delete 7f's `TEMPORARY OWNER` `stimulus` block in `validateNeuroCommand` and its marked test in `test/l2/neuro/pipeline.test.ts` (R51 addendum 17), and import `StimulusEvent` from `types-neuro.ts`.
- **R-7f-5 (7c):** the succinylcholine potassium rise is entirely yours (R51 §3); 7f publishes none and writes no `mods.k`. The `nmb-sux-burn` scenario sets `patient.blood.burns` 0.4 (your profile field).
- **R-7f-6 (renderer):** draw NMT/BFA tiles inside `@pme/renderer` from `TILE_NUMERICS` (the demo draws them in DOM for now).
- **R-7f-7 (7g, FU-3 list):** sugammadex underdose — 0.5 mg/kg at PTC after rocuronium 1.2 reaches TOFR 0.83 at +90 min and never falls; 0.75 mg/kg peaks 0.997 at +13 then falls to 0.42 (severe), 1 mg/kg to 0.70. The recurarisation teaching needs a mild dip after a near-complete recovery (label: recurarisation after underdosing); the balance is 7g's plasma vs effect-site capture. 7f's test is `it.fails` until then.
- **R-7f-8 (7e):** store the per-pass `cascade(th)` result on `EndoState` as `cascade` (one line in `advanceEndo`), so 7f's duck-typed `ps.endo.cascade.macF` finds the hypothermic MAC factor; `endo.core.out.neuroglycopenia` is read as your plan publishes it.
- **R-7f-9 (7g, circulation PD):** at 0.98 MAC sevoflurane the phenylephrine reflex HR drop is 25.4 vs 11.9 bpm awake (ΔHR/ΔMAP 1.9 vs 0.63; baseline HR 93 vs 73 after the sevoflurane hypotension) — the volatile `gv` −0.3 does not blunt a reflex already driven onto its steep limb. Clinical target: ≈ 30–50 % less baroreflex sensitivity at 1 MAC. 7f's cross-check is `it.fails` until 7g's PD changes (7f adds no baroreflex factor, addendum 8).
- **FU-3 item 1 (7g, R51 addendum 17):** succinylcholine ke0/CL re-fit so onset 0.6–1.4 min and T1 10 % 6–8.5 min hold (now 0.17 / 5.37); 7f's course test flips to `it` when it lands.
- **Q-7f-3 — CLOSED** (R51 addenda 12 and 17): one `stimulus` shape, 7e's; 7f observes (decision 17).

## Self-review (R51 fixer pass; re-done in the 2026-09-27 re-review fix pass on the merged base)

- Spec coverage: scope 1 (NMB effect sites via 7g's PK, TOF/PTC/single twitch via the twitch heights, dose tables via tests, priming — see note below, succinylcholine phase I/II/fasciculations, sugammadex 2/4/16 on 7g's binding, neostigmine ceiling, recurarisation (R-7f-7), interactions, profiles, apnoea/weak breaths, `tof` numerics + stimulator) → Tasks 2–6, 8, 10–12; scope 2 (depth, MAC-awake/BAR on 7g's age-adjusted MAC, benzodiazepine, ketamine, opioid synergy with naloxone, burst suppression, awareness, emergence; drive depression; MODELED chemoreflex drive with Winter's; CMRO2, antinociception, NMB fraction, thermoregulatory depth, pupil) → Tasks 7–9, 11, 13, 14; scope 3 (panel data + six scenarios) → Tasks 11, 16; scope 4 (demo, console map) → Task 19; scope 5 (tests, determinism, CPU, Stage 3 green, 24 h) → Tasks 3–5, 7–8, 12–13, 17–18. Succinylcholine potassium (7c), MH (7e) and the circulation (7g) are out of 7f by R51. **Priming** (a 10 % priming dose 3 min before the intubating dose) needs no code: it is two `drug` commands that 7g's PK sums.
- R51 check: no PK module, no PK field in `NeuroState`, no volatile event of 7f's own, no drug consumption (validate null / apply false for drug and vaporiser; hooks after 7g's), `stimulus` observed (apply false), no `circ/model.ts` edit, no potassium, no MH condition; the 7e fields are on `NeuroState`; every bus field is the merged `types-pk.ts` name, verified by Task 1 and Task 3.
- Placeholder scan: none; the engine anchors are the merged base's (R51 §7 still says to re-anchor by chain order on the executor's merged content). Every commit block is concrete and carries `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Type consistency: `NeuroInputs` (Task 2: `brain`, `vent`, `nmj`, `dia`, `macPotent`, `macN2o`, `macEt`, `et {fet, macAge}`, `achGain`, `opioidAntag`) feeds `depth` (`ce`, `macPotent`, `macN2o`), `neuroResp` (`vent`) and `siteBlock` (`nmj`, `dia`); `NeuroResp` fields used by `driverCtx` (`rrMult`, `vtMult`, `apnoea`, `obstruction`, `cleft`) and by `spont.ts` (`opioidDep`, `hypnoticDep`, `pMaxMult`, `nmbVtMult`, `obstruction`) are defined in Task 8; `DepthOut.antinoc/hypEq` (Task 7) feed `neuroOutputs` (Task 9); `NeuroState.fasc/emgBase` (Task 11) are what `engine.syncNeuro` uses (Task 12); `RespState.spont`/`RespCtx.hco3` (Task 13) are set by the calibration line and the engine.
