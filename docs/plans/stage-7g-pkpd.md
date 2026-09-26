# Stage 7g: Drug PK/PD engine (compartment PK + effect site, TCI, volatile uptake, PD combination rules, drug library) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-26): COMPLETE — header, decisions, prototype results, interfaces, Tasks 1–26 and Requests written.
> VERIFIED: the code blocks of Tasks 2–16 were extracted mechanically from this file into a scratch copy of the 7a
> branch head and run: `tsc --noEmit` clean, **66/66 unit tests pass** (three type fixes and the NMB fits were folded
> back into this file). Tasks 17–26 (engine wiring, acceptance, demo) were NOT run — their numbers are TARGETS with
> evidence bands (R45 rule: add the mechanism, never loosen a band; stop and report if a wiring task moves a
> Stage 2/3/7a acceptance number out of its band). The phenylephrine engine numbers come from the throw-away wiring
> described under "Prototype results".
> FIXED (2026-09-26, R50 review → R51 + addenda, fixer pass F1–F14): the drug-layer contract with 7f/7c is R51's
> (7g consumes every library drug event and logs accepted doses on the bus; per-agent brain/vent/NMB Ce; 7f owns
> NMB/depth/drive PD, so the bus carries no drive values and no NMB EC50 multiplier; no 7f shim); sugammadex binds in plasma AND
> at the effect sites (the fitted capture constant is gone). Tasks 1, 5, 10–13, 15 changed AFTER the mechanical
> check above: their numbers marked "fixer prototype" come from a separate Python RK4 re-run of the same equations
> (0.1 s steps), not from the TypeScript; re-run each task's test as written and stop to report on a miss (R45).

**Goal:** Replace the 7a bolus curves with a real pharmacology layer: generic 1/2/3-compartment PK with one or two
effect sites, exact per-step integration, bolus/infusion/syringe-pump/TCI (plasma and effect-site targeting), the
published covariate models (Eleveld, Schnider and Marsh propofol; Minto remifentanil; Shafer fentanyl; NMBA models;
sugammadex binding), volatile/N2O uptake with FA/FI curves by agent and fresh-gas flow and age-adjusted MAC, hepatic/
renal clearance factors from 7c/7d, context-sensitive half-time for display; a PD layer that turns effect-site
concentrations into the engine's named inputs with Emax/Hill, combination rules (additive within class,
opioid–hypnotic response surface, reversal antagonism, receptor competition), interactions (β-blockade competition,
acidosis on catecholamines, ephedrine tachyphylaxis; NMB potentiation is 7f's PD, R51 §2); every v1 drug as
DATA in one library; the `applyEvent drug` API extended (units, rates, TCI, vaporiser, pump); a 1 Hz `drugs` panel
event; infusions in the snapshot; and a `stage7g.html` demo.

**Architecture:** A new module `packages/engine-core/src/l2/pk/**` keeps one plain-data `PkState` in the engine's
`PipelineState` (`ps.pk`) and steps it at **10 Hz on the absolute grid t = k·0.1 s** (`advancePk`, called by the
engine at the top of each advance pass, BEFORE Stage 3's `advanceResp` and the haemodynamics, so every consumer reads
effects computed for the same instant). Per drug instance: a PK state vector `x = [A1, A2, A3, Ce_1 … Ce_m]` advanced
by an exact zero-order-hold step `x ← Ad·x + Bd·R` (the augmented matrix exponential is computed once per parameter
set and cached — a step is one ≤ 6×6 mat-vec), bolus = instantaneous A1 increment, infusion/pump/TCI = the rate `R`
held over the step. Volatiles have their own 5-state uptake model (circuit, alveoli, VRG = brain, muscle, fat). The
PD layer (`pd.ts`, `combine.ts`) reads concentrations and writes two outputs every step: `ps.pk.fx` — multipliers on
the 7a circulation (`hr, ees, svr, v0Frac, pvr, gv, gvHr`, the SAME `DrugEffect` shape 7a's `drugEffect()` returns,
so 7a's control step multiplies it in with one line) plus `betaBlockAdd`; and `ps.pk.bus` — the `DrugBus` (R51 §2):
per-agent concentrations (plasma, brain, a separate `vent` site for opioids, both NMB sites, cumulative mg/kg),
per-volatile end-tidal fraction and age-adjusted MAC fraction (incl. N2O), the per-pass log of accepted doses, and
summaries. 7f reads it for ALL of its PD (TOF/PTC, depth index, MAC-awake, ventilatory drive — R51 §2: 7g computes
none of those); 7b (bronchial tone, HPV), 7c (dose log: succinylcholine K rise, calcium, bicarbonate, insulin), 7d
(CMRO2, CBF) and 7g's own rhythm hooks (adenosine, LAST, Mg) read it too. Drugs with no PK model in v1
(tables §6.1 "kept as gamma effect curves") use `gamma.ts` — the brief §4.9 form `E(t) = (t/tp)^n·e^{n(1 − t/tp)}`
scaled by dose — as the FALLBACK path through the same PD combination, so every drug moves every channel
consistently. The library is data (`src/l2/pk/data/drugs.ts`): one row per drug with units, PK model choice and
parameters, elimination route, PD targets (EC50/Emax/Hill per engine input), typical doses, source and tag.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D; Playwright (system Chrome) for the gate
screenshots. No runtime dependencies.

**Spec:** `docs/physiology/stage-7-parameter-tables.md` §5d (NMB PD, depth, respiratory-drive depression — the
consumer side, 7f), §6.1–6.3 (PK models, vasoactive dose–response, per-MAC/per-Ce effects), §7 scenarios 10, 16,
17b, 20, 21, 22, 25 (drug parts), §9 Q50–Q62; `../research/03-waveform-physiology-reference.md` §8.6 (the base drug
table: direction, onset/peak/duration); `../research/00-orchestrator-rulings.md` R32 (7g scope), R34 (acute layer
stays ours: NO Pulse port here), R37/R39 (evidence policy), R40 (Pulse audit: Rodgers–Rowland PBPK NOT now; Pulse PD
is additive with no effect site — not copied; Pulse substance tables may seed physicochemical data only, and its
propofol blood:plasma ratio and midazolam pKa are wrong), R44/R45 (non-blocking review; mechanism-not-looser-test),
R46 ("7f supplies drug inputs"); `../research/09-evidence-rulings.md`; `../research/pulse-audit/02-drugs-energy-
architecture.md` §1–3 (comparison only). House style: `docs/plans/stage-3-respiratory-gas.md`; runbook
`docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run every command from
  the worktree root. **Base: `origin/main` after Stage 7a (branch `stage-7a-circulation`) has merged** — 7g replaces
  7a's `l2/circ/drugs.ts` event path and cannot build without `CircModelState`. Stages 7b, 7c, 7d, 7e, 7f are
  OPTIONAL at build time: every read of their state is duck-typed (`(ps as { blood?: … }).blood?.out?.hbfRel ?? 1`)
  exactly as 7c reads 7a, and every write goes to a field that exists or is skipped. This plan was prototyped on the
  7a branch head `99dae0a` (which contains `main` `c7cc0c9`); if a find block does not match after 7b/7c/7f merge,
  locate the same lines by the quoted neighbouring comment and apply the same change; never re-type a line you are
  not changing.
- **Merging main while other Stage 7 plans land (R51 §6–7, binding).** Before EVERY edit to `engine.ts` (Tasks 1 if
  needed, 17, 18) run `git fetch origin && git merge origin/main` and re-run the task's tests. Insert the `validate()`
  / `apply()` blocks by CHAIN ORDER, not by the literal find block: **device → pk (7g) → neuro (7f) → organs (7d) →
  Stage 3 resp / 7c blood → hemo**. So the pk block goes directly after the device block, before whatever 7f/7d/7c
  blocks exist on main at that moment. Task 17's `stepBaro(` edit in `l2/circ/model.ts` is the FIRST edit on that
  line after 7a (R51 §6); 7f re-anchors on the merged line, so do not reformat the call.
- **Branch and PR (R20/R21):** branch `stage-7g-pkpd` in the worktree `../scratch/wt-stage-7g` (Task 1 creates both
  from `origin/main`). **Push after every task** (`git push -u origin stage-7g-pkpd` the first time, `git push`
  after). The last task opens the PR with `gh pr create`. Never push to `main`, never merge.
- **CI rule:** a task is done when `npx -y pnpm@9.15.9 typecheck` and the task's own tests pass; Tasks 20, 25 and 26
  run the FULL suite (`typecheck && test && build && check-notices`). Any test that simulates more than a few
  minutes sets `{ timeout: … }` and yields once per simulated minute (`await new Promise((r) => setImmediate(r))`).
  The 24 h test advances minute by minute and yields each minute (the 2-vCPU CI runner starves the Vitest RPC
  otherwise — Stage 3's rule, tightened to per-minute here because the drug layer adds work to every tick).
- **Partition (binding).** This stage OWNS `packages/engine-core/src/l2/pk/**`, `src/types-pk.ts`,
  `test/l2/pk/**`, `test/engine/pk-*.test.ts`, `test/helpers/pk.ts`, `packages/renderer/src/drug-panel.ts`,
  `apps/demo/{stage7g.html,src/stage7g.ts,scripts/stage7g-shots.mjs,e2e/stage7g.e2e.ts}`, `docs/gates/stage-7g*`. ADDITIVE edits
  marked `// Stage 7g` to: `engine.ts` (state, order, validate/apply chain, flush, restore default), `types.ts` (one
  union line per new type, `PatientProfile.sex/heightCm` if absent), `index.ts` (exports), `l2/circ/model.ts`
  (`ext.drug` multiplied into the control step, β-blockade into `stepBaro(` and onto 7e's `endoHrF`/`endoEesF` —
  Task 17), `l2/circ/drugs.ts` (Task 20 removes 7a's dead `propofolAgeFactor`, R51 addendum 11),
  `l2/hemo/pipeline.ts` (its `drug` validator/handler
  becomes unreachable and is deleted — Task 17, declared exception), `l2/resp/pipeline.ts` (one line storing the
  alveolar ventilation it already computes — Task 18), `NOTICES.md`, `docs/physiology/stage-7-parameter-tables.md`
  (a "7g implementation" column note in §6 only — Task 25). **Never edit** `l2/ecg/**` (the rhythm hook goes
  through the public `applyRhythm`), `l3/**`, `packages/skins/**`, `packages/audio/**`, `packages/controller/**`
  (requests at the end; declared exceptions: Task 1's log-formatter cases and Task 20's assertion in
  `packages/controller/test/session/clinical-commands.test.ts`), any 7b/7c/7d/7f module file (7g writes nothing into
  them; they READ `ps.pk.bus`).
- Stage 0–7a constraints still apply: strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` (no enums,
  no parameter properties); `.ts` import extensions; conventional commits; clean-room — no code from Pulse (R40: its
  PK/PD is not ported), STANPUMP, OpenTCI, the Python Anesthesia Simulator, `tci`/`PKPDsim` R packages or any
  GPL/unlicensed repo. **Published model parameters are facts** (equations and numbers from the papers) and are cited
  per row; NOTICES gets one row per borrowed parameter SET (Task 25), no code borrowed.
- Commit messages end with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (if
  your harness gives a different attribution line, use that one).
- pnpm is not on PATH: use `npx -y pnpm@9.15.9`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec
  vitest run <path>`.
- **Units inside the PK layer (binding):** time in the ODEs is MINUTES (published rate constants), steps are
  seconds; volumes L, clearances L/min; every drug has ONE amount unit (`mg` or `mcg`) and its concentrations are
  amount/L (mg/L = µg/mL; µg/L = ng/mL). Vasoactive potencies are stated in the tables' unit, the steady-state
  infusion-rate equivalent `µg/kg/min` = Ce·CL/W (decision 4). Doses at the API keep the brief's units.
- **Evidence (R37):** every number in the library carries `src` and a tag `P` (primary paper/label), `TXT`
  (textbook — "Miller 10e ch. N p. M"), `ENG` (fitted here, with the prototype number) or `VERIFY`. The Iranian
  availability column is a QUESTION for Ali (`ir: '?'`) on every row — nothing is asserted.

## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **Exact discrete PK, not RK4.** The compartment ODEs are linear; the zero-order-hold solution `x(t+Δ) =
   e^{AΔ}x + ∫e^{As}ds·b·R` is exact for a rate held over the step, so there is no step-size error, no stiffness
   (remifentanil k10 ≈ 0.5/min next to fentanyl k31 = 0.006/min) and a step costs one mat-vec. The exponential of the
   augmented (n+1)² matrix is computed by scaling-and-squaring (18-term Taylor, ‖A‖ ≤ 0.5) and CACHED by parameter
   values; parameters change only when a covariate/clearance factor moves by ≥ 1 % (quantised, Task 15), so the
   cache is hit > 99.9 % of steps. Prototype: max relative error vs an independent RK4 (h = 0.6 ms) 3·10⁻⁶ after
   5 min (the RK4's own error).
2. **Fentanyl ke0 is DERIVED, not copied.** The tables list 0.147/min (Shafer–Varvel) vs 0.108 (Scott–Stanski), but
   a ke0 belongs to the PK it was fitted with (tables §6 rule), and with the Shafer 1990 PK 0.147 gives a
   time-to-peak-effect (TTPE) of 3.17 min, not the published 3.6. The TTPE method (Minto 2003; Shafer & Varvel's
   own) with Shafer PK gives **ke0 0.117/min → TTPE 3.60 min** (0.114 → 3.66); the library uses 0.117 and cites both. Sufentanil (Gepts PK [VERIFY]) is treated the same way: its published TTPE 5.6 min gives ke0 0.176 (0.112 would give 7.05 min). Q58 stays
   open for Ali.
3. **Propofol CSHT is model-specific; the "20–25 min at 3 h" band is Hughes 1992's (older PK).** Computed CSHT at
   1 / 3 / 8 h: Eleveld 2.7 / 4.5 / 12.1 min, Schnider 2.2 / 3.5 / 9.3, Marsh 6.7 / 8.6 / 12.1. Miller 10e does not
   tabulate a number (ch. 21 p. 514 gives only t½ 4–7 h, CL 20–30 mL/kg/min, Vdss 2–10 L/kg). The acceptance test
   asserts each model against its OWN value within ±10 % (regression) and the literature statement "propofol CSHT
   < 40 min up to 8 h" for all three; the orchestrator's 20–25 min band is NOT used (flagged, Q-7g-1). Remifentanil
   (Minto) computes 2.1 min at 1–8 h, flat — "independent of infusion duration" (Miller 10e ch. 22 p. 588) holds;
   Kapila 1995 MEASURED 3.2 min, so the band is 2–4 min and the flatness (8 h / 1 h within 5 %) is the real
   assertion. Fentanyl (Shafer): 17.8 / 70 / 256 min — the test asserts the steep rise (3 h > 3× the 1 h value;
   Miller 10e ch. 22 p. 588 "nearly 6 times that of alfentanil or sufentanil" after 1 h).
4. **Vasoactive potency in rate-equivalents.** The tables give infusion EC50s in µg/kg/min and bolus effects as a
   separate [ENG] number — two inconsistent parameterisations of one receptor. 7g gives each vasoactive a small
   PK (1–2 compartments per kg + ke0) and expresses Ce as the steady-state infusion rate that would produce it
   (`rateEq = Ce·CL/W`), so the tables' EC50 is used directly for infusions and the bolus effect EMERGES from the
   same model. For phenylephrine one parameter set meets BOTH anchors only with EC50 0.25 µg/kg/min (tables 0.5 is
   [ENG]; deviation D1): V1 0.04 L/kg (≈ plasma volume), CL 0.035 L/kg/min (≈ 2.45 L/min, Hengstmann 1982 2.1),
   ke0 1.2/min, Emax SVR +100 %. Prototype on the 7a engine: 100 µg bolus MAP +21.6 at 30 s, +21 at 60 s, HR −14.3
   (brief sanity check 1 band +15–25 / −5 to −16 ✓); infusion 0.1 / 0.25 / 0.5 / 1.0 µg/kg/min → MAP +16 / +25 /
   +32 / +37 % at 20 min.
5. **Three drug paths, one PD.** (a) `pk` rows: compartment model + effect site(s) (propofol, remifentanil,
   fentanyl, sufentanil, rocuronium, vecuronium, cisatracurium, succinylcholine, sugammadex, the vasoactives,
   esmolol, milrinone, lidocaine/bupivacaine/ropivacaine for LAST, adenosine, magnesium); (b) `volatile` rows (sevo,
   iso, des, N2O) through the uptake model; (c) `gamma` rows (tables §6.1 "kept as gamma": ketamine, etomidate,
   thiopental, midazolam, morphine, dexmedetomidine, atropine, glycopyrrolate, neostigmine, amiodarone, labetalol,
   metoprolol, NTG bolus, hydralazine, naloxone, flumazenil, ondansetron/dexamethasone/TXA placeholders): the brief's
   gamma curve gives a normalised effect-site "concentration" `c = (dose/refDose)·γ(t)` in units of the reference
   dose, and the PD layer treats it exactly like a Ce with EC50 in reference-dose units. Repeated boluses sum.
   Infusions of gamma rows use the tables' first-order approach `dc/dt = (rate/refRate − c)/τ` (τ on/off per row).
6. **Combination rules (Task 11).** Per engine input, effects combine as follows: WITHIN a pharmacological class
   (e.g. two α1 agonists, two opioids) concentrations are summed in potency-normalised units BEFORE the Emax
   (Loewe additivity — two half-doses equal one dose); ACROSS classes the fractional changes MULTIPLY (7a's A11
   rule: independent mechanisms); opioid–hypnotic synergy for the CNS/drive outputs uses the Greco/Minto response
   surface in its simplest published form `U = Uh + Uo + α·Uh·Uo`, α = 1.5 [ENG within Bouillon 2004's range],
   applied only to the depth/drive/MAC-sparing outputs (never to haemodynamics); reversal agents are COMPETITIVE
   antagonists (`EC50_eff = EC50·(1 + Cant/Ki)`: naloxone on opioids, flumazenil on benzodiazepines, esmolol/
   metoprolol/labetalol on β-agonist effects); sugammadex is a CHEMICAL antagonist: instant 1:1 molar binding of
   free rocuronium/vecuronium in plasma AND at both effect sites (R51 §5; sugammadex reaches the junction through
   its own effect-site ke0, Task 5), so the effect-site Ce falls at once rather than by the NMB's slow ke0 washout;
   neostigmine is a PHYSIOLOGICAL antagonist with a ceiling (7f table: no reversal from TOF < 2) — it publishes an
   acetylcholine "gain" on the bus and 7f applies the ceiling. For the opioid/benzodiazepine antagonists 7g publishes
   the EC50 multiplier `bus.antagonist.{opioid, benzodiazepine}` (1 = none) so 7f's drive/depth PD applies the same
   competition to the raw per-agent Ce.
7. **Interactions and context.** NMB potentiation (volatile, magnesium, hypothermia on the NMB EC50) is 7f's PD
   (R51 §2): 7f computes it from `bus.volatiles`, `bus.agents.magnesium` and the temperature it already reads; 7g
   publishes no NMB EC50 multiplier. 7g keeps the PK side of hypothermia: clearance −5 %/°C below 37 [ENG, Task 15; Miller
   10e ch. 24 p. 698 direction: atracurium 44 → 68 min at 34 °C]. Acidosis on catecholamines: Emax × clamp(1 − 2.5·(7.4 − pH), 0.4, 1) for α/β agonists, NOT vasopressin (tables
   §6.2 "not blunted by acidosis"); β-blockade competition: chronic `betaBlockC` (7a profile) and any β-antagonist
   Ce raise β-agonist EC50, and a β-blocker drug's occupancy (`betaBlockAdd`) also blunts the RISE of 7e's
   catecholamine-surge multipliers `ext.endoHrF`/`endoEesF` in 7a's control step (R51 addendum 11; Task 10
   `betaBlunt`, Task 17); sepsis `vasoResp` (tables §5e, 7f) multiplies α/β Emax when present on the bus.
   Ephedrine tachyphylaxis: each repeat within 60 min × 0.7 on its INDIRECT part (tables).
8. **TCI.** Plasma targeting: the rate that puts Cp on target at the end of the 10 s interval. Effect-site targeting
   (Shafer & Gregg 1992): by linearity `Ce(k) = Ce_free(k) + r·Ce_unit(k)`, so the largest rate that keeps the
   predicted Ce ≤ target over a 15 min horizon is `min_k (target − Ce_free(k))/Ce_unit(k)` — exact, no search; the
   pump limit 1200 mL/h (tables; ×concentration) clamps it. Prototype (35 y, 70 kg, 170 cm, M): Eleveld Ce 3 µg/mL →
   140 mg in the first minute, Ce 95 % of target at 2.35 min, no overshoot (max 3.000), 640 mg in 60 min;
   Schnider Ce 3 → 53 mg first minute, 95 % at 1.21 min; Marsh Cp 4 → 78 mg in the first minute (V1·Cp = 63.8 mg
   bolus + maintenance), plasma exact; Minto Ce 4 ng/mL → 68 µg first minute, 95 % at 1.09 min.
9. **Volatiles.** The uptake model (decision in Task 8's header) with blood/gas coefficients from Miller 10e ch. 19
   p. 427 and tissue coefficients [VERIFY] reproduces Yasuda 1991's FA/FI at 30 min (FI held): **N2O 0.92, des
   0.91, sevo 0.85, iso 0.72** (published ≈ 0.95 / 0.90 / 0.85 / 0.73). Time to FA/FI 0.5: des 0.57, sevo 0.73,
   iso 3.4 min; at FGF 1 L/min in a 7 L circle, FA/FD after 30 min: sevo 0.50, iso 0.32 (the low-flow lag the demo
   shows). No concentration/second-gas effect in v1. Brain tension = VRG (τ ≈ 2–3 min for sevo, tables "brain τ
   2–4 min"). MAC(age) = MAC40·10^(−0.00269·(age − 40)): sevo 2.04 / 1.80 / 1.59 / 1.40 % at 20/40/60/80 y.
   MAC-awake = 0.34 MAC (Miller 10e ch. 18 p. 406). The alveolar ventilation comes from Stage 3's gas step (one
   stored field) and CO from 7a; FA is published as `etAgent` for the gas monitor.
10. **7g consumes every library drug event; 7c and 7f observe the dose log (R51 §1–3).** Engine chain order:
    **device → pk (7g) → neuro (7f) → organs (7d) → Stage 3 resp / 7c blood → hemo**. `validatePkCommand` validates
    EVERY `drug`/`infusion`/`tci`/`vaporiser` event whose id is in the library — including the ids whose chemistry
    7c owns (calciumChloride, calciumGluconate, sodiumBicarbonate, insulinDextrose, mannitol, hypertonicSaline: rows
    with `pk: { kind: 'blood' }`) and the shared ids (succinylcholine, magnesium, salbutamol: `shared: 'blood'`) —
    and `applyPkCommand` CONSUMES it (returns true), so no later validator/handler sees a drug event. Every accepted
    BOLUS (incl. `overS` boluses; not infusion-rate or TCI changes) is appended to a per-pass dose log
    `bus.doses: { agent, mgPerKg, amount, amountUnit, t }[]` (`mgPerKg` null for units/mmol/mL rows): the entries
    accepted since the previous engine advance pass become `bus.doses` at the start of the next `advancePk` call and
    are replaced by the next pass's list, so every consumer that steps after pk in that pass (7f, 7d, 7c) sees each
    dose exactly once. 7c takes the succinylcholine K rise, calcium, bicarbonate, insulin/dextrose, salbutamol and
    magnesium mass balance from it; 7f takes fasciculation and the MH trigger from it. 7g keeps PK/PD only where a
    receptor effect exists (succinylcholine NMB PK, magnesium SVR/TdP, salbutamol β2); `blood` rows carry no PK in 7g
    (7c's mass balance IS their kinetics). Blood-row infusions are rejected in v1 (`… is given as a bolus in v1; 7c
    owns its kinetics`). 7c's request "replace the shapes with PK" is answered: not needed for v1 (Requests).
11. **Adenosine acts through the rhythm engine's public API.** When adenosine's AV-node effect E ≥ 0.6 (Ce model:
    1-compartment with the 6–10 s plasma t½ and an arm-to-heart transport delay of 12 s peripheral / 6 s central
    [TXT research 03 §8.6: effect 10–30 s after the push]), and the current rhythm is AV-node dependent
    (`svtAvnrt`, `svtAvrt`), the pipeline applies `avb3Narrow` (escape 20/min) while E ≥ 0.5, then `sinus` if the
    peak E ≥ 0.8 (6 mg peripheral in 70 kg: E_peak 0.85; converts), else the original rhythm (deterministic — no
    RNG). In AF/flutter it applies the same transient block and restores the rhythm (flutter waves revealed). The
    6b scenario `svt-adenosine.json` scripts its own block: request to 6b to drop the scripted step once 7g merges.
12. **LAST (local anaesthetic systemic toxicity).** Lidocaine/bupivacaine/ropivacaine have 2-compartment PK with the
    total plasma concentration published; CNS and CV toxicity are Hill functions of the FREE plasma concentration
    against thresholds (lidocaine CNS 5 → seizure ≈ 10 µg/mL, CV > 20; bupivacaine CNS 1.5–2 → seizure ≈ 3, CV ≈ 4;
    ropivacaine CNS ≈ 2.2 → seizure 4, CV ≈ 6 [TXT, Q-7g-2]); acidosis/hypercapnia raise the free fraction (Miller
    10e ch. 25 p. 761). CV effects: Ees × (1 − 0.7·E_cv), SVR × (1 − 0.3·E_cv), conduction → bradycardia then
    VT/VF via the rhythm API above E_cv 0.9; CNS: `seizure` flag on the bus (7f draws it on the depth index; the
    panel shows it). Lipid emulsion 20 % (1.5 mL/kg bolus, 0.25 mL/kg/min — ASRA 2020 [P]) adds a lipid sink that
    lowers the free fraction by up to 50 % [ENG; Miller p. 762: cardiac bupivacaine −11 % within 3 min].
13. **Display CSHT = decrement time from NOW.** The panel shows, for each running infusion, the time for Cp (and Ce)
    to fall 50 % if the pump stopped now (a forward simulation with 10 s exact steps, recomputed every 10 s off the
    tick path's critical cost: ≤ 0.2 ms each), which is the clinically useful "context" — the classic Hughes curve
    (`csht.ts`) is what the tests use.
14. **The 7a Bateman curves retire from the event path; their file stays.** `l2/circ/drugs.ts` is 7a's; its unit
    tests stay green. After Task 17 no event reaches `circGiveDrug` (7g consumes every `drug`), and the 7a sanity
    tests (phenylephrine 100 µg, propofol 2 mg/kg, AS+CAD propofol + rescue) must stay green through the NEW engine
    — they are the migration's acceptance (Task 20). Propofol haemodynamics use tables §6.3 on the Eleveld Ce with
    E = Ce/(Ce + 3.5); the 7a fit (E 0.9 at the peak of 2 mg/kg) is re-fitted on the Ce model in Task 20 (target:
    MAP 60–80 % at 2 min, HR rise < 15).

## Deviations from the tables (for Ali's calibration pass, R44)

- D1 phenylephrine infusion EC50 0.25 µg/kg/min (tables 0.5 [ENG]) — the only value that makes the 100 µg bolus
  and the infusion one receptor model (decision 4).
- D2 fentanyl ke0 0.117/min (tables 0.147); sufentanil ke0 0.176 — derived from TTPE 3.6 with the Shafer PK (decision 2).
- D3 propofol CSHT band — see decision 3.
- D4 Eleveld Q2 at the reference patient is 1.83 L/min (the paper's θ5 1.75 × the Q3-maturation term 1.047) — the
  tables print 1.75; the equation is the paper's.
- D5 remifentanil TTPE (Minto, 40 y, LBM 55): 1.43 min computed; the commonly quoted 1.6 min is not in Miller 10e
  (ch. 22 gives no number); the test asserts the model against itself ±5 % and the age trend (80 y: 2.26 min).
- D7 sugammadex effect-site ke0 0.095 (thumb) / 0.152 (diaphragm) /min [ENG, fitted] instead of the tables' "Ce
  washout via rocuronium ke0" (0.16/0.26): with rocuronium's own ke0 the effect-site binding reverses too fast (fixer
  prototype: 2 mg/kg at T2 → TOFR 0.9 in 1.43 min, 4 mg/kg at 1–2 PTC 1.46 min, label 2.2 / 2.7 with IQR 2.1–4.3).
  0.095 gives 2.11 / 2.22 min and, for 16 mg/kg 3 min after rocuronium 1.2, T1 10 % at 1.80 min (label 1.2; tables
  §5d) — the residual 16 mg/kg lag is flagged for Ali (Q51). (0.10 gave 2.04 / 2.13 / 1.73: too close to the IQR edge.)
- Vent effect-site ke0 for fentanyl and sufentanil = their brain ke0 [ENG]: tables §6.1/§5d give a ventilatory ke0
  only for remifentanil (0.92/min, Bouillon 2003); the separate `vent` site exists for every opioid (R51 §2).

## Prototype results

Prototyped in `/private/tmp/…/scratchpad/pme-stage7g` (an export of `origin/stage-7a-circulation` `99dae0a`, no
commits) with the code of Tasks 3–8 exactly as written below, plus a throw-away wiring of phenylephrine into 7a's
control step (the Task 17 mechanism, restricted to one drug).

| Check | Result |
|---|---|
| Exact step vs RK4 (h 0.6 ms), Schnider 2 mg/kg, 5 min | relative error ≤ 3.3·10⁻⁶ on all four states |
| Bolus TTPE / Ce peak | Schnider (53 y, 77 kg, 177 cm, M) 1.55 min / 9.07 µg/mL (published TTPE 1.6); Eleveld (35 y, 70 kg) 2.91 min / 3.00 µg/mL (with opioids 3.16 / 3.28); Marsh (ke0 0.26) 3.92 min; Minto 1 µg/kg 40 y 1.43 min, 80 y 2.26 min; fentanyl 100 µg (ke0 0.147) 3.17 min, ke0 0.114 → 3.66, ke0 0.117 → 3.60 min; sufentanil (Gepts) ke0 0.112 → 7.05 min, 0.176 → 5.6 min; sufentanil CSHT 1/3/8 h 10.8/25.6/35.1 min |
| Miller 10e anchors | propofol "T½ke0 2.5 min, time to peak effect 90–100 s" (ch. 21 p. 515): Schnider 1.55 min ✓, Eleveld 2.9 min (arterial-sampling ke0 0.146 → slower; flagged Q57) |
| CSHT 1 / 3 / 8 h | Eleveld 2.7 / 4.5 / 12.1; Schnider 2.2 / 3.5 / 9.3; Marsh 6.7 / 8.6 / 12.1; Minto 2.1 / 2.1 / 2.1; fentanyl 17.8 / 70.0 / 256 min |
| TCI | see decision 8 (no Ce overshoot > 0.1 %; final Ce = target to 3 decimals) |
| Volatile FA/FI at 1 / 5 / 10 / 30 min, FI held | N2O .61/.83/.88/.92; des .62/.83/.88/.91; sevo .55/.73/.81/.85; iso .39/.55/.64/.72 |
| Volatile at FGF 1 L/min, FA/FD 30 min | N2O 0.65, des 0.63, sevo 0.50, iso 0.32 |
| MAC age | sevo 2.04 / 1.80 / 1.59 / 1.40 % at 20 / 40 / 60 / 80 y |
| Phenylephrine on the 7a engine (MODELED, ventilated) | 100 µg: ΔMAP +21.6 (30 s), +21.0 (50 s), +21.2 (70 s), +15.6 (3 min), +5.5 (5 min), +0.5 (8 min); ΔHR −14.3 at 60 s. Infusion 20 min: 0.1 → +16 %, 0.25 → +25 %, 0.5 → +32 %, 1.0 → +37 %; HR 73 → 68/65/64/62 |
| Phenylephrine offset (0.5 µg/kg/min for 20 min, then stop) | MAP rise remaining 95 % at 1 min, 89 % at 2, 58 % at 5, **55 % at 10 and 18 min** — the drug's Ce is < 1 % by 5 min, so the residual is the 7a circulation's (baroreflex resetting / volume shift). Flagged to 7a (Requests); Task 22's offset band waits for that ruling |
| NMB fits (Task 5; label targets) | rocuronium 0.6 mg/kg 1.77 / 30.0 min, 1.2 mg/kg 0.77 / 62.9; vecuronium 0.1 mg/kg 3.6 / 26.8 (ke0 0.10, EC50 150 ng/mL); cisatracurium 0.15 mg/kg 2.82 / 42.4 (ke0 0.08, EC50 230); succinylcholine 1 mg/kg 0.43 / 7.2 min (1-cmt CL 0.2 L/kg/min, ke0 0.15 — duration is junctional diffusion), heterozygous PChE 12 min, homozygous 5.2 h |
| Plan code check | Tasks 2–16 code extracted from this file and run: typecheck clean, 66/66 tests pass (bus smoke: sevo 2 % FGF 6 → 0.69 MAC at 10 min) — BEFORE the R51 fixer pass (see the status note) |
| Sugammadex, plasma + effect-site binding (fixer prototype, Python RK4 0.1 s, rocuronium PK of Task 5, 70 kg) | plasma-only binding: 2 mg/kg at T2 → TOFR 0.9 in 6.96 min (why the old plan needed a capture constant). Effect-site ke0 0.16/0.26: 1.43 / 1.46 min (2 at T2 / 4 at T1 ≥ 1 %); 0.10/0.16: 2.04 / 2.13; **0.095/0.152: 2.11 / 2.22 min**, 16 mg/kg 3 min after roc 1.2 → T1 10 % **1.80 min**, TOFR 0.9 2.20 min; 0.5 mg/kg 5 min after roc 1.2 → TOFR 0.9 only at 129.5 min (recurarisation); roc 0.6 then sgx 2 mg/kg at 20 min: thumb Ce 1858 → 510 ng/mL 3 min later (plasma-only 1150) (D7) |
| Esmolol PK refit (fixer, closed form) | label CL 285 mL/kg/min, Vss 3.4 L/kg, distribution t½ 2 min, elimination t½ 9 min → unique 2-compartment set V1 2.71, V2 0.69 L/kg, Q 0.175 L/kg/min (λ1 0.347, λ2 0.077 /min); the 0.5 mg/kg load gives an initial rate-equivalent of ≈ 53 µg/kg/min — the label's load-then-50 µg/kg/min regimen |
| Phenylephrine first parameter set (V1 0.04, V2 1.0 L/kg, EC50 0.5) | bolus +14.2 peak at 30 s (below band), infusion still rising at 20 min and 69 % residual 18 min after stop → rejected; grid search (864 sets, pure PK/PD) chose the 1-compartment set of decision 4 |

## Interfaces agreed with other sub-stages

`src/types-pk.ts` (Task 1) is the contract. Consumers read `ps.pk.fx` / `ps.pk.bus`; nobody writes them.

- **7a circulation:** `ps.pk.fx: DrugEffect` (7a's own type, `l2/circ/drugs.ts`) + `betaBlockAdd` (0–1, added to the
  profile's `betaBlockC` for β-agonist blunting inside 7a's reflex). Task 17 adds `drug?: DrugEffect` to
  `CircModelState.ext` and multiplies it into 7a's `de` in `control()` (one block, marked). 7g reads CO from
  `circCardiacOutput(hs.circ)` and MAP from `hs.circ.baro.mapLp` (PD context), hepatic flow from 7c.
- **7f neuromuscular / depth / drive — R51 is the contract (7g owns ALL drug PK; 7f has none).** 7f executes after
  7g merges and reads ONLY `ps.pk.bus` (no shim layer, no `NeuroState.pk`, no interim PK). 7f owns the
  PD for NMB (TOF/PTC/twitch Hill, with its own volatile/Mg/temperature potentiation), the depth index, MAC-awake /
  emergence, neostigmine's ceiling and the ventilatory-drive depression (R51 §2). What 7g publishes for it
  (`src/types-pk.ts`, Task 1; updated every 0.1 s):
  - `bus.agents[drugId]: BusAgent` for every drug given so far — `{ unit, plasma, brain, vent?, nmj?, dia?,
    cumulativeMgPerKg, sgxBoundFrac? }`. `unit` is the row's concentration unit (propofol µg/mL; opioids, NMB and
    succinylcholine ng/mL; vasoactives µg/kg/min rate-equivalent; gamma rows "× ref dose"). `brain` = the CNS effect
    site; `vent` = the SEPARATE ventilatory effect site of every opioid (remifentanil ke0 0.92/min, Bouillon 2003;
    fentanyl/sufentanil vent ke0 = brain ke0 [ENG], deviations); `nmj`/`dia` = the adductor-pollicis and
    diaphragm sites of EACH NMB agent and of succinylcholine separately (not max-only); `cumulativeMgPerKg` = total
    given (succinylcholine phase II); concentrations are total drug, already net of sugammadex binding (Task 15).
  - `bus.volatiles[agent]: BusVolatile` for sevoflurane/isoflurane/desflurane AND `n2o` (R51 addendum 9) —
    `{ fet (end-tidal = FA, % atm), brain (VRG, % atm), macAge (% atm), macFrac (brain / MAC(age)) }`.
  - `bus.doses` — the per-pass log of accepted boluses (decision 10): fasciculation and MH triggers for 7f.
  - `bus.antagonist = { opioid, benzodiazepine }` — naloxone/flumazenil EC50 multipliers (1 = none, decision 6);
    `bus.nmb = { achGain }` — neostigmine's acetylcholine gain (1 = none); `bus.cns.seizure` — the LAST flag.
  - NMB EC50/γ and every PK parameter set have ONE source, tables §6.1/§5d (R51 §5); 7f re-fits its EC50s against
    these PKs. Removed from 7g by R51: the drive-value block, the NMB EC50 multiplier, the max-only NMB fields.
- **Other bus summaries** (7d, the demo, the gate note): `bus.cns = { propCe (µg/mL), opioidCeRemiEq (ng/mL,
  potency-normalised: fentanyl ×1.6, sufentanil ×12, morphine ×1.5 per reference dose [ENG]; after antagonism),
  macBrain (Σ age-adjusted MAC fractions incl. N2O), ketamineCe, benzoCeMidazEq, dexmedCe, uHyp (propofol Ce over
  the Eleveld age-adjusted Ce50, R51 addendum 11), uOpioid, uSurface (decision 6), seizure, cmro2Mult, cbfVaso }`.
- **7b lungs:** `bus.airway = { bronchodilation (0–1: volatile, ketamine, salbutamol, epinephrine), histamine (morphine,
  atracurium) }`, `bus.hpvInhibit` (NTG, volatiles > 1 MAC, milrinone). 7b reads them if it wants; nothing in 7g
  depends on 7b. 7b's drive inputs come from 7f (R51 §2), not from 7g. 7g READS Stage 3's alveolar ventilation (one
  stored field) and FRC.
- **7c blood:** READS `ps.blood.out.hbfRel` (hepatic flow ratio) and `ps.blood.core.liver` (hepatic function) for
  clearance, `ps.blood.core.ab.ph` for catecholamine efficacy and LA free fraction. 7c's drug ids are VALIDATED AND
  CONSUMED by 7g (decision 10); 7c reads them from `bus.doses`. `bus.metabolic = { kShift (mmol/L, β2
  agonists/insulin → 7c's kSet when 7c wants it), glucoseDelta (7e), dantroleneE (7e) }`.
- **7d organs:** READS a renal clearance factor `ps.organs?.kidney?.gfrRel ?? 1`; publishes `bus.cns.cmro2Mult`
  (propofol/barbiturate/volatile CMRO2 suppression, tables §5.1) and `bus.cns.cbfVaso` (volatile vasodilation).
- **Rhythm engine:** only through `applyRhythm` (public) from the pipeline hook (decision 11/12).

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-pk.ts` | Public types: `PkClinicalEvent` (drug/vaporiser/pump), `DrugBus`, `DrugsEvent` (1 Hz panel), `PkPatient` |
| `…/src/l2/pk/linalg.ts` | matMul, matVec, expm (scaling and squaring) |
| `…/src/l2/pk/compartment.ts` | `PkParams`, exact ZOH system (cached), `pkStep`, `fromClearances` |
| `…/src/l2/pk/covariates.ts` | LBM (James), FFM (Al-Sallami), BMI |
| `…/src/l2/pk/models.ts` | Eleveld/Schnider/Marsh propofol, Minto remifentanil, Shafer fentanyl, Gepts sufentanil, NMBA and sugammadex models, per-kg generic models |
| `…/src/l2/pk/tci.ts` | plasma and effect-site TCI |
| `…/src/l2/pk/csht.ts` | context-sensitive half-time / decrement times |
| `…/src/l2/pk/volatile.ts` | circuit–alveoli–VRG–muscle–fat uptake, MAC(age) |
| `…/src/l2/pk/units.ts` | dose/rate normalisation to the drug's amount unit |
| `…/src/l2/pk/gamma.ts` | the brief's gamma effect curve (fallback path) |
| `…/src/l2/pk/pd.ts` | Emax/Hill, competitive antagonism, tolerance, acidosis factor, response surface |
| `…/src/l2/pk/combine.ts` | per-input combination → `DrugEffect` + `DrugBus` |
| `…/src/l2/pk/data/drugs.ts` | THE library (every v1 drug as data) |
| `…/src/l2/pk/pipeline.ts` | `PkState`, `createPkState`, `validatePkCommand`, `applyPkCommand` (consumes every drug event), `advancePk` (dose log, per-agent bus), panel event |
| `…/src/l2/pk/hooks.ts` | rhythm hooks (adenosine, LAST, Mg/TdP) through `applyRhythm` |
| `packages/renderer/src/drug-panel.ts` | the drug panel (Cp/Ce sparkline, MAC, CSHT) for the demo |
| `apps/demo/stage7g.html`, `apps/demo/src/stage7g.ts`, `apps/demo/e2e/stage7g.e2e.ts`, `apps/demo/scripts/stage7g-shots.mjs` | demo + gate screenshots (the e2e spec writes them) |
| `packages/engine-core/test/l2/pk/*.test.ts`, `test/engine/pk-*.test.ts` (incl. `pk-longrun.test.ts`), `test/helpers/pk.ts` | tests |

---
## Tasks

### Task 1: Branch, worktree, Stage 7g public types

**Files:**
- Create: `packages/engine-core/src/types-pk.ts`, `packages/engine-core/test/types-pk.test.ts`
- Modify: `packages/engine-core/src/types.ts` (two union lines), `packages/engine-core/src/index.ts` (one export line)

**Interfaces (Produces):** `DoseUnit`, `RateUnit`, `PkRoute`, `PkClinicalEvent`, `BusAgent`, `BusVolatile`,
`DoseLogEntry`, `DrugBus`, `DrugPanelRow`, `DrugsEvent`, `DRUG_BUS_NEUTRAL` (R51 §2–3: the bus 7f/7c read).

- [x] **Step 1: Create the branch and worktree**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-7g -b stage-7g-pkpd origin/main
cd ../scratch/wt-stage-7g
npx -y pnpm@9.15.9 install --frozen-lockfile
test -f packages/engine-core/src/l2/circ/drugs.ts && echo "7a present" || { echo "STOP: 7a has not merged; 7g cannot start"; exit 1; }
```

- [x] **Step 2: Write the failing type test** — `packages/engine-core/test/types-pk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DRUG_BUS_NEUTRAL, type Command, type PkClinicalEvent } from '../src/index.ts';

describe('Stage 7g public types', () => {
  it('drug events accept the brief shape and the 7g extensions', () => {
    const evs: PkClinicalEvent[] = [
      { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' },
      { kind: 'drug', drugId: 'phenylephrine', dose: 0.5, unit: 'mcg/kg/min', route: 'iv', infusion: true },
      { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' },
      { kind: 'infusion', drugId: 'propofol', rate: 20, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
      { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 },
      { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 },
    ];
    const cmds: Command[] = evs.map((event) => ({ type: 'applyEvent', event }));
    expect(cmds).toHaveLength(6);
  });
  it('the neutral bus changes nothing (R51: no drive values, no NMB EC50 multiplier on the bus)', () => {
    expect(DRUG_BUS_NEUTRAL.cns.macBrain).toBe(0);
    expect(DRUG_BUS_NEUTRAL.agents).toEqual({});
    expect(DRUG_BUS_NEUTRAL.volatiles).toEqual({});
    expect(DRUG_BUS_NEUTRAL.doses).toEqual([]);
    expect(DRUG_BUS_NEUTRAL.antagonist).toEqual({ opioid: 1, benzodiazepine: 1 });
    expect(DRUG_BUS_NEUTRAL.nmb).toEqual({ achGain: 1 });
    expect('resp' in DRUG_BUS_NEUTRAL).toBe(false);
  });
});
```

- [x] **Step 3: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-pk.test.ts`
Expected: FAIL — `DRUG_BUS_NEUTRAL` is not exported.

- [x] **Step 4: Create `packages/engine-core/src/types-pk.ts`**

```ts
// Stage 7g public types (drug PK/PD), kept in their own file so parallel stages do not collide in types.ts.
import type { SimSeconds } from './types.ts';

export type DoseUnit = 'mcg' | 'mg' | 'g' | 'mcg/kg' | 'mg/kg' | 'g/kg' | 'mEq' | 'mmol' | 'mmol/kg' | 'units' | 'units/kg' | 'mL' | 'mL/kg';
export type RateUnit = 'mcg/min' | 'mg/min' | 'mcg/kg/min' | 'mcg/kg/h' | 'mg/kg/h' | 'mg/h' | 'units/min' | 'units/h' | 'mL/h' | 'mL/kg/min';
export type PkRoute = 'iv' | 'io' | 'im' | 'inh' | 'neb' | 'sc' | 'perineural' | 'central'; // 'neb': 7c's salbutamol

/**
 * Brief §7.2 `drug` (bolus; `infusion: true` with a rate unit starts/changes an infusion, dose 0 stops it) plus the
 * 7g kinds: `infusion` (a syringe pump: rate in a rate unit, or mL/h with the syringe concentration), `tci`
 * (target 0 stops), `vaporiser` (dial 0 closes it; N2O as a fraction of the fresh gas).
 */
export type PkClinicalEvent =
  | { kind: 'drug'; drugId: string; dose: number; unit: DoseUnit | RateUnit; route: PkRoute; infusion?: boolean; overS?: number }
  | { kind: 'infusion'; drugId: string; rate: number; unit: RateUnit; concentration?: { amount: number; unit: 'mg' | 'mcg' | 'units' | 'g'; perMl: number } }
  | { kind: 'tci'; drugId: string; model?: string; mode: 'plasma' | 'effect'; target: number; maxRateMlH?: number }
  | { kind: 'vaporiser'; agent: 'sevoflurane' | 'isoflurane' | 'desflurane'; dialPct: number; fgfLpm?: number; n2oFrac?: number };

/**
 * One drug's concentrations (R51 §2). All in `unit`, the library row's concentration unit: propofol µg/mL; opioids,
 * NMB agents and succinylcholine ng/mL; rate-equivalent vasoactives µg/kg/min; gamma rows "× ref dose". Totals, net
 * of sugammadex binding. 7f computes every NMB/depth/drive effect from these; 7g computes none of them.
 */
export interface BusAgent {
  unit: string;
  plasma: number; // Cp (gamma rows: the normalised curve, no plasma model)
  brain: number; // CNS effect site (the model's own ke0)
  vent?: number; // opioids only: ventilatory effect site (remifentanil ke0 0.92, Bouillon 2003)
  nmj?: number; // NMB agents and succinylcholine: adductor pollicis
  dia?: number; // NMB agents and succinylcholine: diaphragm/larynx
  cumulativeMgPerKg: number; // total given so far (0 for units/mmol/mL rows)
  sgxBoundFrac?: number; // rocuronium/vecuronium: fraction of the given amount bound by sugammadex in plasma
}

/** One inhaled agent incl. N2O (R51 §2, addendum 9). Fractions of 1 atm in %. */
export interface BusVolatile { fet: number; brain: number; macAge: number; macFrac: number }

/** One accepted bolus (decision 10): listed in `bus.doses` for exactly one engine advance pass. */
export interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds }

/** What 7g publishes every 100 ms for the other modules (plan "Interfaces"). Plain data. */
export interface DrugBus {
  agents: Record<string, BusAgent>;
  volatiles: Partial<Record<'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o', BusVolatile>>;
  doses: DoseLogEntry[];
  antagonist: { opioid: number; benzodiazepine: number }; // EC50 multipliers of the class (1 = no antagonist)
  cns: {
    propCe: number; opioidCeRemiEq: number; macBrain: number; ketamineCe: number; benzoCeMidazEq: number; dexmedCe: number;
    uHyp: number; uOpioid: number; uSurface: number; seizure: boolean; cmro2Mult: number; cbfVaso: number;
  };
  nmb: { achGain: number }; // neostigmine's acetylcholine gain (1 = none); 7f applies the ceiling
  airway: { bronchodilation: number; histamine: number };
  hpvInhibit: number;
  metabolic: { kShift: number; glucoseDelta: number; dantroleneE: number };
  last: { cnsE: number; cvE: number };
  avNodeBlock: number; // adenosine/β/Ca-channel AV-nodal effect 0–1
}

export const DRUG_BUS_NEUTRAL: DrugBus = {
  agents: {},
  volatiles: {},
  doses: [],
  antagonist: { opioid: 1, benzodiazepine: 1 },
  cns: { propCe: 0, opioidCeRemiEq: 0, macBrain: 0, ketamineCe: 0, benzoCeMidazEq: 0, dexmedCe: 0, uHyp: 0, uOpioid: 0, uSurface: 0, seizure: false, cmro2Mult: 1, cbfVaso: 1 },
  nmb: { achGain: 1 },
  airway: { bronchodilation: 0, histamine: 0 },
  hpvInhibit: 0,
  metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0 },
  last: { cnsE: 0, cvE: 0 },
  avNodeBlock: 0,
};

export interface DrugPanelRow {
  id: string; name: string; unit: string; // concentration unit (µg/mL, ng/mL, rate-eq µg/kg/min, ×ref dose)
  cp: number; ce: number;
  rate: number | null; rateUnit: string | null; // current pump rate (null: none)
  tci: { mode: 'plasma' | 'effect'; target: number; model: string } | null;
  totalAmount: number; amountUnit: string;
  decrement50Min: number | null; // time for Cp to fall 50 % if the pump stopped now (decision 13)
}

export type DrugsEvent = {
  type: 'drugs'; t: SimSeconds;
  drugs: DrugPanelRow[];
  volatile: { agent: string; dialPct: number; fgfLpm: number; fi: number; fa: number; brain: number; macAge: number; macFrac: number; n2oFrac: number } | null;
  macTotal: number;
};
```

- [x] **Step 5: Wire the unions** — in `packages/engine-core/src/types.ts`:

Find: `import type { CircClinicalEvent, CircDeviceAction, CircEvent, ProfileCondition, TeachingChannel } from './types-circ.ts'; // Stage 7a`
Replace with the same line followed by:
```ts
import type { DrugsEvent, PkClinicalEvent } from './types-pk.ts'; // Stage 7g
```
Find: `    | { type: 'applyEvent'; event: CircClinicalEvent } // Stage 7a`
Replace with the same line followed by:
```ts
    | { type: 'applyEvent'; event: PkClinicalEvent } // Stage 7g
```
Find: `  | CircEvent; // Stage 7a (types-circ.ts)`
Replace with:
```ts
  | CircEvent // Stage 7a (types-circ.ts)
  | DrugsEvent; // Stage 7g (types-pk.ts)
```
In `packages/engine-core/src/index.ts`, after `export type * from './types-circ.ts'; // Stage 7a` add:
```ts
export type * from './types-pk.ts'; // Stage 7g
export { DRUG_BUS_NEUTRAL } from './types-pk.ts'; // Stage 7g
```
(If a later-merged stage already added a line after 7a's, add these after the last `export type * from './types-…'` line.)

- [x] **Step 6: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-pk.test.ts && npx -y pnpm@9.15.9 typecheck`
Expected: PASS; typecheck clean. If an exhaustive `switch (ev.kind)` elsewhere now fails to typecheck (e.g. the
controller's log formatter), add a `case 'infusion': case 'tci': case 'vaporiser':` falling through to the `drug`
case's formatting — that is the only permitted controller edit (declared exception, same as Stage 3's).

- [x] **Step 7: Commit and push**

```bash
git add -A && git commit -m "feat(pk): Stage 7g public types — drug/infusion/tci/vaporiser events, DrugBus, drugs panel event" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin stage-7g-pkpd
```

### Task 2: Linear algebra and the exact compartment step (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/linalg.ts`, `packages/engine-core/src/l2/pk/compartment.ts`, `packages/engine-core/test/l2/pk/compartment.test.ts`

**Interfaces (Produces):** `expm(a, n)`, `matMul`, `matVec`; `PkParams`, `PkSystem`, `fromClearances(v1, v2, v3, cl1, cl2, cl3, ke0[])`,
`pkSystem(p, dtS)`, `pkStep(sys, x, rate)`, `cp(p, x)`, `zeroState(p)`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/compartment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { expm } from '../../../src/l2/pk/linalg.ts';
import { cp, fromClearances, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';

/** Independent reference: classical RK4 on the ODEs, h = 1e-5 min (0.6 ms). */
function rk4(p: PkParams, x0: number[], rate: number, tMin: number): number[] {
  let x = x0.slice();
  const f = (s: number[]) => [
    -(p.k10 + p.k12 + p.k13) * s[0]! + p.k21 * s[1]! + p.k31 * s[2]! + rate,
    p.k12 * s[0]! - p.k21 * s[1]!,
    p.k13 * s[0]! - p.k31 * s[2]!,
    p.ke0[0]! * (s[0]! / p.v1 - s[3]!),
  ];
  const h = 1e-5;
  for (let t = 0; t < tMin - 1e-12; t += h) {
    const k1 = f(x);
    const k2 = f(x.map((v, i) => v + (h / 2) * k1[i]!));
    const k3 = f(x.map((v, i) => v + (h / 2) * k2[i]!));
    const k4 = f(x.map((v, i) => v + h * k3[i]!));
    x = x.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
  }
  return x;
}

const SCHNIDER_53_77: PkParams = fromClearances(4.27, 18.9, 238, 1.89, 1.29, 0.836, [0.456]);

describe('exact compartment step', () => {
  it('expm of a diagonal matrix is the elementwise exponential', () => {
    const e = expm([-1, 0, 0, -3], 2);
    expect(e[0]).toBeCloseTo(Math.exp(-1), 12);
    expect(e[3]).toBeCloseTo(Math.exp(-3), 12);
    expect(e[1]).toBe(0);
  });
  it('bolus: 0.1 s exact steps match RK4 to 1e-5 relative after 5 min', () => {
    const sys = pkSystem(SCHNIDER_53_77, 0.1);
    let x = zeroState(SCHNIDER_53_77);
    x[0] = 154;
    for (let s = 0; s < 3000; s++) x = pkStep(sys, x, 0);
    const ref = rk4(SCHNIDER_53_77, [154, 0, 0, 0], 0, 5);
    for (let i = 0; i < 4; i++) expect(Math.abs(x[i]! - ref[i]!) / Math.abs(ref[i]!)).toBeLessThan(1e-5);
  });
  it('infusion: one 60 s step equals 600 steps of 0.1 s (exact ZOH, no step-size error)', () => {
    const a = pkStep(pkSystem(SCHNIDER_53_77, 60), zeroState(SCHNIDER_53_77), 10);
    let b = zeroState(SCHNIDER_53_77);
    const s = pkSystem(SCHNIDER_53_77, 0.1);
    for (let k = 0; k < 600; k++) b = pkStep(s, b, 10);
    for (let i = 0; i < 4; i++) expect(a[i]!).toBeCloseTo(b[i]!, 9);
  });
  it('steady state of a constant infusion is R/CL in plasma and the effect site', () => {
    const p = fromClearances(10, 20, 0, 1, 2, 0, [0.5]);
    let x = zeroState(p);
    const s = pkSystem(p, 60);
    for (let k = 0; k < 2000; k++) x = pkStep(s, x, 5);
    expect(cp(p, x)).toBeCloseTo(5, 6);
    expect(x[3]).toBeCloseTo(5, 6);
  });
  it('two effect sites carry their own ke0', () => {
    const p = fromClearances(5, 0, 0, 1, 0, 0, [0.16, 0.26]);
    let x = zeroState(p);
    x[0] = 50;
    const s = pkSystem(p, 1);
    for (let k = 0; k < 60; k++) x = pkStep(s, x, 0);
    expect(x.length).toBe(5);
    expect(x[4]!).toBeGreaterThan(x[3]!); // faster site ahead in the first minute
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/compartment.test.ts`
Expected: FAIL — cannot resolve `../../../src/l2/pk/linalg.ts`.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/linalg.ts`**

```ts
// Small dense linear algebra for the compartment models (Stage 7g). Matrices are row-major number[] of size n×n.
// The PK systems are at most 3 + 2 effect sites + 1 input = 6 states, so an O(n³) scaling-and-squaring exponential
// is exact to machine precision and costs microseconds; it runs only when a drug's parameters change.

/** C = A·B (n×n). */
export function matMul(a: readonly number[], b: readonly number[], n: number): number[] {
  const c = new Array<number>(n * n).fill(0);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const aik = a[i * n + k] as number;
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) c[i * n + j] = (c[i * n + j] as number) + aik * (b[k * n + j] as number);
    }
  return c;
}

/** y = A·x. */
export function matVec(a: readonly number[], x: readonly number[], n: number): number[] {
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += (a[i * n + j] as number) * (x[j] as number);
    y[i] = s;
  }
  return y;
}

/**
 * e^A by scaling and squaring with an 18-term Taylor series (Moler & Van Loan 2003, method 3). The 1-norm is scaled
 * below 0.5, where 18 terms reach ≈ 1e-20 relative truncation — far below the float64 rounding of the squarings.
 */
export function expm(a: readonly number[], n: number): number[] {
  let norm = 0;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(a[i * n + j] as number);
    norm = Math.max(norm, s);
  }
  const sq = norm > 0.5 ? Math.ceil(Math.log2(norm / 0.5)) : 0;
  const f = 2 ** -sq;
  const as = a.map((v) => v * f);
  const id = (i: number): number => (Math.floor(i / n) === i % n ? 1 : 0);
  let term = as.map((_, i) => id(i));
  let sum = term.slice();
  for (let k = 1; k <= 18; k++) {
    term = matMul(term, as, n).map((v) => v / k);
    for (let i = 0; i < n * n; i++) sum[i] = (sum[i] as number) + (term[i] as number);
  }
  for (let s = 0; s < sq; s++) sum = matMul(sum, sum, n);
  return sum;
}
```

- [x] **Step 4: Create `packages/engine-core/src/l2/pk/compartment.ts`**

```ts
// Linear mammillary compartment PK with one or more effect sites (Stage 7g; tables §6.1). States (amounts in the
// drug's amount unit, concentrations in amount/L):
//   x = [A1, A2, A3, Ce_1 … Ce_m]
//   dA1/dt = −(k10 + k12 + k13)·A1 + k21·A2 + k31·A3 + R(t)      R: infusion, amount/min
//   dA2/dt = k12·A1 − k21·A2
//   dA3/dt = k13·A1 − k31·A3
//   dCe_i/dt = ke0_i·(A1/V1 − Ce_i)
// A 1- or 2-compartment model sets k13 = k31 = 0 (and k12 = k21 = 0): the unused states stay at zero. Rate constants
// are per MINUTE (the published unit); the step is exact for a piecewise-constant R (zero-order hold): the augmented
// matrix [[A, b], [0, 0]]·dt is exponentiated once per (parameters, dt) and cached, so a step is one 5×5–6×6
// matrix-vector product. A bolus adds to A1 instantaneously (the published models' convention).
import { expm, matVec } from './linalg.ts';

export interface PkParams {
  v1: number; // central volume, L
  k10: number; k12: number; k21: number; k13: number; k31: number; // /min
  ke0: number[]; // /min, one per effect site (≥ 1)
}

export interface PkSystem {
  n: number; // states = 3 + ke0.length
  ad: number[]; // n×n
  bd: number[]; // n: response to R = 1 amount/min over dt
}

/** Microconstants from volumes (L) and clearances (L/min): k10 = CL1/V1, k12 = CL2/V1, k21 = CL2/V2, … */
export function fromClearances(v1: number, v2: number, v3: number, cl1: number, cl2: number, cl3: number, ke0: number[]): PkParams {
  return { v1, k10: cl1 / v1, k12: v2 > 0 ? cl2 / v1 : 0, k21: v2 > 0 ? cl2 / v2 : 0, k13: v3 > 0 ? cl3 / v1 : 0, k31: v3 > 0 ? cl3 / v3 : 0, ke0 };
}

const CACHE = new Map<string, PkSystem>();
const CACHE_MAX = 512;

/** The exact discrete system for step dtS seconds (cached by value: parameters are plain numbers). */
export function pkSystem(p: PkParams, dtS: number): PkSystem {
  const key = `${p.v1}|${p.k10}|${p.k12}|${p.k21}|${p.k13}|${p.k31}|${p.ke0.join(',')}|${dtS}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const m = p.ke0.length;
  const n = 3 + m;
  const N = n + 1; // + the input state
  const a = new Array<number>(N * N).fill(0);
  const set = (i: number, j: number, v: number) => {
    a[i * N + j] = v;
  };
  set(0, 0, -(p.k10 + p.k12 + p.k13));
  set(0, 1, p.k21);
  set(0, 2, p.k31);
  set(1, 0, p.k12);
  set(1, 1, -p.k21);
  set(2, 0, p.k13);
  set(2, 2, -p.k31);
  for (let i = 0; i < m; i++) {
    const k = p.ke0[i] as number;
    set(3 + i, 0, k / p.v1);
    set(3 + i, 3 + i, -k);
  }
  set(0, n, 1); // R enters A1
  const dtMin = dtS / 60;
  const e = expm(a.map((v) => v * dtMin), N);
  const ad: number[] = [];
  const bd: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) ad.push(e[i * N + j] as number);
    bd.push(e[i * N + n] as number);
  }
  const sys = { n, ad, bd };
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(key, sys);
  return sys;
}

/** One exact step: x ← Ad·x + Bd·R (R in amount/min, constant over the step). Returns the new state. */
export function pkStep(sys: PkSystem, x: readonly number[], rate: number): number[] {
  const y = matVec(sys.ad, x, sys.n);
  if (rate !== 0) for (let i = 0; i < sys.n; i++) y[i] = (y[i] as number) + (sys.bd[i] as number) * rate;
  return y;
}

export const cp = (p: PkParams, x: readonly number[]): number => (x[0] as number) / p.v1;
export const zeroState = (p: PkParams): number[] => new Array<number>(3 + p.ke0.length).fill(0);
```

- [x] **Step 5: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/compartment.test.ts`
Expected: PASS (5 tests; prototype relative error ≤ 3.3e-6).

- [x] **Step 6: Commit and push**

```bash
git add -A && git commit -m "feat(pk): exact zero-order-hold compartment step with effect sites (expm, cached)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push
```

### Task 3: Covariates and the propofol models (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/covariates.ts`, `packages/engine-core/src/l2/pk/models.ts`, `packages/engine-core/test/l2/pk/propofol.test.ts`

**Interfaces (Produces):** `PkPatient`, `DEFAULT_PK_PATIENT`, `bmi`, `lbmJames`, `ffmAlSallami`; `ModelOpts`,
`eleveldPropofol(p, o)`, `schniderPropofol(p)`, `marshPropofol(p, modified?)`; `ttpeMin(p, site?)`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/propofol.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';
import { ffmAlSallami, lbmJames } from '../../../src/l2/pk/covariates.ts';
import { eleveldPropofol, marshPropofol, schniderPropofol, ttpeMin } from '../../../src/l2/pk/models.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const SCH = { ageY: 53, weightKg: 77, heightCm: 177, sex: 'm' as const };

function bolus(p: PkParams, dose: number, minutes: number) {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  x[0] = dose;
  let peak = 0;
  for (let k = 0; k < minutes * 600; k++) {
    x = pkStep(s, x, 0);
    peak = Math.max(peak, x[3]!);
  }
  return { x, peak };
}

describe('propofol models', () => {
  it('body-size scalars (James LBM, Al-Sallami FFM) at the Eleveld reference patient', () => {
    expect(lbmJames(REF)).toBeCloseTo(55.3, 1);
    expect(ffmAlSallami(REF)).toBeGreaterThan(50);
    expect(ffmAlSallami(REF)).toBeLessThan(60);
  });
  it('Eleveld 2018 reference individual: V1 6.28, V2 25.5, V3 273 L; CL 1.79; ke0 0.146 (D4: Q2 1.83)', () => {
    const p = eleveldPropofol(REF);
    expect(p.v1).toBeCloseTo(6.28, 2);
    expect(p.k10 * p.v1).toBeCloseTo(1.79, 2);
    expect(p.k12 * p.v1).toBeCloseTo(1.83, 1);
    expect(p.v1 * p.k12 / p.k21).toBeCloseTo(25.5, 1);
    expect(p.v1 * p.k13 / p.k31).toBeCloseTo(273, 0);
    expect(p.ke0[0]).toBeCloseTo(0.146, 3);
  });
  it('Eleveld: female clearance 2.10, opioids lower CL and V3, the elderly have a smaller V2', () => {
    const f = eleveldPropofol({ ...REF, sex: 'f' });
    expect(f.k10 * f.v1).toBeGreaterThan(eleveldPropofol(REF).k10 * eleveldPropofol(REF).v1);
    const o = eleveldPropofol(REF, { opioids: true });
    expect(o.k10 * o.v1).toBeLessThan(1.79);
    const old = eleveldPropofol({ ...REF, ageY: 80 });
    expect((old.v1 * old.k12) / old.k21).toBeLessThan(25.5);
  });
  it('Schnider TTPE 1.6 min (published) within 10 %; Miller 10e "time to peak effect 90–100 s" band 1.4–1.8', () => {
    const t = ttpeMin(schniderPropofol(SCH));
    expect(t).toBeGreaterThan(1.44);
    expect(t).toBeLessThan(1.76); // prototype 1.55
  });
  it('Eleveld TTPE (arterial ke0) 2.6–3.2 min (prototype 2.91); Marsh (ke0 0.26) 3.5–4.3 (prototype 3.92)', () => {
    expect(ttpeMin(eleveldPropofol(REF))).toBeGreaterThan(2.6);
    expect(ttpeMin(eleveldPropofol(REF))).toBeLessThan(3.2);
    expect(ttpeMin(marshPropofol(REF))).toBeGreaterThan(3.5);
    expect(ttpeMin(marshPropofol(REF))).toBeLessThan(4.3);
  });
  it('2 mg/kg bolus: Eleveld Ce peak ≈ 3.0 µg/mL (above the 25–50 y LOC C50 1.8–2.35), Cp at 1 min 10.6', () => {
    const b = bolus(eleveldPropofol(REF), 140, 10);
    expect(b.peak).toBeGreaterThan(2.7);
    expect(b.peak).toBeLessThan(3.3);
    const one = bolus(eleveldPropofol(REF), 140, 1);
    expect(cp(eleveldPropofol(REF), one.x)).toBeCloseTo(10.64, 0);
  });
  it('Marsh V1 is 0.228 L/kg', () => {
    expect(marshPropofol({ ...REF, weightKg: 100 }).v1).toBeCloseTo(22.8, 6);
  });
});
```

- [x] **Step 2: Run it and see it fail** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/propofol.test.ts` → FAIL (missing modules).

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/covariates.ts`**

```ts
// Patient covariates for the published PK models (Stage 7g). Every formula is the model author's own — a ke0 or a
// body-size scalar belongs to the model it was fitted with (tables §6 "Rule for a ke0").

export interface PkPatient {
  ageY: number;
  weightKg: number;
  heightCm: number;
  sex: 'm' | 'f';
  /** postmenstrual age in weeks (Eleveld maturation); default ageY·52.143 + 40 (term birth) */
  pmaWeeks?: number;
  /** plasma cholinesterase phenotype (succinylcholine, mivacurium); default 'normal' (tables §5d Lee 2009) */
  pche?: 'normal' | 'het' | 'hom';
}

export const DEFAULT_PK_PATIENT: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };

export const bmi = (p: PkPatient): number => p.weightKg / (p.heightCm / 100) ** 2;

/** James (1976) lean body mass, as Schnider 1998 and Minto 1997 used it (kg; height in cm). */
export function lbmJames(p: PkPatient): number {
  const r = p.weightKg / p.heightCm;
  return p.sex === 'm' ? 1.1 * p.weightKg - 128 * r * r : 1.07 * p.weightKg - 148 * r * r;
}

/** Al-Sallami (2015) fat-free mass, as Eleveld 2018 used it (kg). */
export function ffmAlSallami(p: PkPatient): number {
  const b = bmi(p);
  if (p.sex === 'm') return (0.88 + (1 - 0.88) / (1 + (p.ageY / 13.4) ** -12.7)) * ((9270 * p.weightKg) / (6680 + 216 * b));
  return (1.11 + (1 - 1.11) / (1 + (p.ageY / 7.1) ** -1.1)) * ((9270 * p.weightKg) / (8780 + 244 * b));
}
```

- [x] **Step 4: Create `packages/engine-core/src/l2/pk/models.ts`** (Task 4 appends the opioid models to this file)

```ts
// Published PK(+ke0) models, as functions of the patient (Stage 7g; tables §6.1). Units: volumes L, clearances
// L/min, ke0 /min; amounts in the drug's amount unit (propofol mg → µg/mL; remifentanil/fentanyl µg → ng/mL).
import { ffmAlSallami, lbmJames, type PkPatient } from './covariates.ts';
import { fromClearances, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';

export interface ModelOpts {
  /** Eleveld: opioids co-administered (changes CL and V3) */
  opioids?: boolean;
}

const sig = (x: number, e50: number, g: number) => x ** g / (x ** g + e50 ** g);

/**
 * Eleveld 2018 propofol (Br J Anaesth 120:942–959), ARTERIAL PK, Table 2 θ1–θ18, reference 35 y, 70 kg, 170 cm,
 * male, no opioids. ke0 (arterial) 0.146·(W/70)^−0.25 (the same paper's PD part).
 */
export function eleveldPropofol(p: PkPatient, o: ModelOpts = {}): PkParams {
  const ref: PkPatient = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' };
  const pma = p.pmaWeeks ?? p.ageY * 52.143 + 40;
  const pmaRef = 35 * 52.143 + 40;
  const fCentral = (w: number) => sig(w, 33.6, 1);
  const fAging = (x: number) => Math.exp(x * (p.ageY - 35));
  const fOpi = (x: number) => (o.opioids ? Math.exp(x * p.ageY) : 1);
  const fClMat = sig(pma, 42.3, 9.06) / sig(pmaRef, 42.3, 9.06);
  const fQ3Mat = (a: number) => sig(a * 52.143 + 40, 68.3, 1);
  const v1 = 6.28 * (fCentral(p.weightKg) / fCentral(70));
  const v2 = 25.5 * (p.weightKg / 70) * fAging(-0.0156);
  const v3 = 273 * (ffmAlSallami(p) / ffmAlSallami(ref)) * fOpi(-0.0138);
  const cl = (p.sex === 'm' ? 1.79 : 2.1) * (p.weightKg / 70) ** 0.75 * fClMat * fOpi(-0.00286);
  const q2 = 1.75 * (v2 / 25.5) ** 0.75 * (1 + 1.3 * (1 - fQ3Mat(p.ageY)));
  const q3 = 1.11 * (v3 / 273) ** 0.75 * (fQ3Mat(p.ageY) / fQ3Mat(35));
  return fromClearances(v1, v2, v3, cl, q2, q3, [0.146 * (p.weightKg / 70) ** -0.25]);
}

/** Schnider 1998/1999 propofol (Anesthesiology 88:1170; 90:1502); ke0 0.456 (TTPE 1.6 min). */
export function schniderPropofol(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const v2 = 18.9 - 0.391 * (p.ageY - 53);
  const cl1 = 1.89 + 0.0456 * (p.weightKg - 77) - 0.0681 * (lbm - 59) + 0.0264 * (p.heightCm - 177);
  const cl2 = 1.29 - 0.024 * (p.ageY - 53);
  return fromClearances(4.27, v2, 238, cl1, cl2, 0.836, [0.456]);
}

/** Marsh 1991 propofol (Br J Anaesth 67:41), weight-proportional V1; ke0 0.26 (Diprifusor) or 1.21 (modified) [TXT]. */
export function marshPropofol(p: PkPatient, modified = false): PkParams {
  return { v1: 0.228 * p.weightKg, k10: 0.119, k12: 0.112, k21: 0.055, k13: 0.0419, k31: 0.0033, ke0: [modified ? 1.21 : 0.26] };
}

/** Time to peak effect-site concentration after a bolus (min), 0.1 s resolution, 20 min horizon. */
export function ttpeMin(p: PkParams, site = 0): number {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  x[0] = 1;
  let best = 0;
  let t = 0;
  for (let k = 1; k <= 12000; k++) {
    x = pkStep(s, x, 0);
    const c = x[3 + site] as number;
    if (c > best) {
      best = c;
      t = k / 600;
    }
  }
  return t;
}
```

- [x] **Step 5: Run the test** → PASS (7 tests). Prototype: Eleveld V1 6.28, k10·V1 1.790, Q2 1.83, ke0 0.146, TTPE
  2.91; Schnider (53/77/177) TTPE 1.55; Marsh 3.92; 2 mg/kg Eleveld peak 3.00, Cp(1 min) 10.64.

- [x] **Step 6: Commit and push** — `git add -A && git commit -m "feat(pk): covariates and the Eleveld/Schnider/Marsh propofol models" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 4: Opioid models and ke0 from time-to-peak-effect (PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/models.ts` (append)
- Create: `packages/engine-core/test/l2/pk/opioids.test.ts`

**Interfaces (Produces):** `mintoRemifentanil(p)`, `shaferFentanyl()`, `geptsSufentanil()`, `ke0ForTtpe(p, ttpeMin)`,
`FENTANYL_KE0 = 0.117`, `SUFENTANIL_KE0 = 0.176`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/opioids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { geptsSufentanil, ke0ForTtpe, mintoRemifentanil, shaferFentanyl, ttpeMin } from '../../../src/l2/pk/models.ts';

const A40 = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' as const };

describe('opioid models', () => {
  it('Minto remifentanil at 40 y, LBM ≈ 55: V1 5.1, CL1 2.6, ke0 0.595', () => {
    const p = mintoRemifentanil(A40);
    expect(p.v1).toBeCloseTo(5.12, 1);
    expect(p.k10 * p.v1).toBeCloseTo(2.61, 1);
    expect(p.ke0[0]).toBeCloseTo(0.595, 3);
  });
  it('remifentanil TTPE rises with age (D5): 40 y 1.36–1.50 (prototype 1.43), 80 y 2.1–2.4 (2.26)', () => {
    const t40 = ttpeMin(mintoRemifentanil(A40));
    const t80 = ttpeMin(mintoRemifentanil({ ...A40, ageY: 80 }));
    expect(t40).toBeGreaterThan(1.36);
    expect(t40).toBeLessThan(1.5);
    expect(t80).toBeGreaterThan(2.1);
    expect(t80).toBeLessThan(2.4);
  });
  it('fentanyl (Shafer PK, derived ke0 0.117) peaks at 3.6 min ±3 %; with the tables 0.147 it would be 3.17 (D2)', () => {
    expect(ttpeMin(shaferFentanyl())).toBeGreaterThan(3.49);
    expect(ttpeMin(shaferFentanyl())).toBeLessThan(3.71);
    expect(ttpeMin({ ...shaferFentanyl(), ke0: [0.147] })).toBeCloseTo(3.17, 1);
  });
  it('sufentanil (Gepts PK [VERIFY], derived ke0 0.176) peaks at 5.6 min ±3 %', () => {
    expect(ttpeMin(geptsSufentanil())).toBeGreaterThan(5.43);
    expect(ttpeMin(geptsSufentanil())).toBeLessThan(5.77);
  });
  it('ke0ForTtpe inverts ttpeMin', () => {
    const k = ke0ForTtpe(shaferFentanyl(), 3.6);
    expect(k).toBeCloseTo(0.117, 3);
  });
});
```

- [x] **Step 2: Run it** → FAIL (exports missing).

- [x] **Step 3: Append to `packages/engine-core/src/l2/pk/models.ts`**

```ts
/** Minto 1997 remifentanil (Anesthesiology 86:10), LBM (James) and age covariates; ke0 0.595 − 0.007(age − 40). */
export function mintoRemifentanil(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const a = p.ageY - 40;
  const l = lbm - 55;
  return fromClearances(
    5.1 - 0.0201 * a + 0.072 * l,
    9.82 - 0.0811 * a + 0.108 * l,
    5.42,
    2.6 - 0.0162 * a + 0.0191 * l,
    2.05 - 0.0301 * a,
    0.076 - 0.00113 * a,
    [0.595 - 0.007 * a],
  );
}

/**
 * ke0 fitted by the time-to-peak-effect method (Minto 2003; Shafer & Varvel 1991): the ke0 for which ttpeMin(p)
 * equals the published TTPE with THIS PK (a ke0 belongs to its PK model). Geometric bisection, 40 iterations.
 */
export function ke0ForTtpe(p: PkParams, ttpe: number): number {
  let lo = 0.01;
  let hi = 5;
  for (let i = 0; i < 40; i++) {
    const m = Math.sqrt(lo * hi);
    if (ttpeMin({ ...p, ke0: [m] }) > ttpe) lo = m;
    else hi = m;
  }
  return Math.sqrt(lo * hi);
}

/** Fentanyl ke0 = ke0ForTtpe(Shafer PK, 3.6 min) — decision 2 / D2 (tables 0.147 was fitted with another PK). */
export const FENTANYL_KE0 = 0.117;
/** Sufentanil ke0 = ke0ForTtpe(Gepts PK, 5.6 min, Shafer & Varvel 1991). */
export const SUFENTANIL_KE0 = 0.176;

/** Shafer 1990 fentanyl (Anesthesiology 73:1091) microconstants [VERIFY against the paper's Table 3]. */
export function shaferFentanyl(): PkParams {
  return { v1: 6.09, k10: 0.0827, k12: 0.471, k21: 0.102, k13: 0.225, k31: 0.006, ke0: [FENTANYL_KE0] };
}

/** Gepts 1995 sufentanil (Anesthesiology 83:1194) microconstants [VERIFY]; CSHT 3 h ≈ 26 min (Hughes 1992: 20–30). */
export function geptsSufentanil(): PkParams {
  return { v1: 14.3, k10: 0.0645, k12: 0.1086, k21: 0.0245, k13: 0.0229, k31: 0.0013, ke0: [SUFENTANIL_KE0] };
}
```

- [x] **Step 4: Run the test** → PASS (prototype: Minto 40 y TTPE 1.43, 80 y 2.26; fentanyl 3.60; sufentanil 5.6;
  ke0ForTtpe(fentanyl, 3.6) = 0.1172).

- [x] **Step 5: Commit and push** — `git commit -am "feat(pk): Minto remifentanil, Shafer fentanyl, Gepts sufentanil; ke0 by the TTPE method" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 5: Neuromuscular blockers and sugammadex binding (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/nmb.ts`, `packages/engine-core/test/l2/pk/nmb.test.ts`

**Interfaces (Produces):** `PerKgPk`, `perKg(m, weightKg, clMult?)`, `ROCURONIUM`, `VECURONIUM`, `CISATRACURIUM`,
`SUCCINYLCHOLINE`, `SUGAMMADEX`, `PCHE_CL_MULT` (`{ normal, het, hom }` — the ONE cholinesterase value both 7g and 7f
use, R51 addendum 10), `NMB_PD` (EC50 thumb/diaphragm ng/mL, γ), `MW` (g/mol), `bindSugammadex(nmb, sgx, mw)` (plasma
amounts), `bindSugammadexSites(nmb, sgx, mw)` (both effect sites, R51 §5), `testT1(ce, ec50, gamma)` (the 7f block
formula, used by 7g's own tests only — 7f owns TOF).

Rocuronium prototype (grid over 324 sets against the label, with the tables' ke0 0.16 and EC50 823 ng/mL, γ 4.8):
**V1 0.06, V2 0.20 L/kg (Vss 0.26; label 0.25), CL 0.0042 L/kg/min (label 0.25 L/kg/h), Q 0.005 L/kg/min** →
0.6 mg/kg: T1 ≤ 1 % at **1.77 min** (label max block 1.8; Miller 10e ch. 24 Table 24.5: 1.5 with isoflurane), T1
back to 25 % at **30.0 min** (label 31; Miller 37 with isoflurane); 1.2 mg/kg: **0.77 / 62.9 min** (label 1.0 / 67).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/nmb.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pkStep, pkSystem, zeroState } from '../../../src/l2/pk/compartment.ts';
import { bindSugammadex, bindSugammadexSites, CISATRACURIUM, MW, NMB_PD, PCHE_CL_MULT, perKg, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, testT1, VECURONIUM, type PerKgPk } from '../../../src/l2/pk/nmb.ts';

/** Onset (T1 ≤ 1 %) and clinical duration (T1 back to 25 %) after a bolus, minutes, 1 s steps. */
function onsetDuration(m: PerKgPk, pd: { ec50: number; gamma: number }, doseMgKg: number, w = 70, clMult = 1) {
  const p = perKg(m, w, clMult);
  const s = pkSystem(p, 1);
  let x = zeroState(p);
  x[0] = doseMgKg * w * 1000; // µg; concentrations ng/mL
  let onset = -1;
  let dur = -1;
  let min = 1;
  for (let k = 1; k < 600 * 60; k++) {
    x = pkStep(s, x, 0);
    const t1 = testT1(x[3]!, pd.ec50, pd.gamma);
    min = Math.min(min, t1);
    if (onset < 0 && (t1 <= 0.01 || (k > 600 && t1 > min + 1e-6))) onset = k / 60;
    if (onset > 0 && dur < 0 && t1 >= 0.25 && k / 60 > onset) dur = k / 60;
  }
  return { onset, dur };
}

describe('neuromuscular blockers', () => {
  it('rocuronium 0.6 mg/kg: onset 1.5–2.1 min, duration 26–36 (label 1.8/31); 1.2 mg/kg: 0.6–1.2, 55–75 (label 1.0/67)', () => {
    const a = onsetDuration(ROCURONIUM, NMB_PD.rocuronium.thumb, 0.6);
    const b = onsetDuration(ROCURONIUM, NMB_PD.rocuronium.thumb, 1.2);
    expect(a.onset).toBeGreaterThan(1.5);
    expect(a.onset).toBeLessThan(2.1);
    expect(a.dur).toBeGreaterThan(26);
    expect(a.dur).toBeLessThan(36);
    expect(b.onset).toBeGreaterThan(0.6);
    expect(b.onset).toBeLessThan(1.2);
    expect(b.dur).toBeGreaterThan(55);
    expect(b.dur).toBeLessThan(75);
  });
  it('vecuronium 0.1 mg/kg: onset 2.5–5 min, duration 25–45 (label 3–5 / 25–30; Miller Table 24.5 41–44)', () => {
    const v = onsetDuration(VECURONIUM, NMB_PD.vecuronium.thumb, 0.1);
    expect(v.onset).toBeGreaterThan(2.5);
    expect(v.onset).toBeLessThan(5);
    expect(v.dur).toBeGreaterThan(25);
    expect(v.dur).toBeLessThan(45);
  });
  it('cisatracurium 0.15 mg/kg: onset 2–4 min, duration 35–55 (label ≈ 45)', () => {
    const c = onsetDuration(CISATRACURIUM, NMB_PD.cisatracurium.thumb, 0.15);
    expect(c.onset).toBeGreaterThan(2);
    expect(c.onset).toBeLessThan(4);
    expect(c.dur).toBeGreaterThan(35);
    expect(c.dur).toBeLessThan(55);
  });
  it('succinylcholine 1 mg/kg: onset ≤ 1.5 min; T1 25 % at 6–9 min (label T1 10 % 7.1, 90 % 10.9); PChE het ×2, hom 4–8 h (tables §5d)', () => {
    const s = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1);
    expect(s.onset).toBeLessThan(1.5);
    expect(s.dur).toBeGreaterThan(6);
    expect(s.dur).toBeLessThan(9);
    const het = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1, 70, PCHE_CL_MULT.het);
    expect(het.dur / s.dur).toBeGreaterThan(1.5); // prototype 12 / 7.2 = 1.7 (tables "heterozygous ×2")
    expect(het.dur / s.dur).toBeLessThan(2.5);
    const hom = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1, 70, PCHE_CL_MULT.hom);
    expect(hom.dur).toBeGreaterThan(240); // prototype 5.2 h (tables "homozygous 4–8 h")
    expect(hom.dur).toBeLessThan(480);
  });
  it('sugammadex binds free rocuronium 1:1 molar at both effect sites (R51 §5); the excess stays free', () => {
    const roc = [0, 0, 0, 1300, 900]; // ng/mL = µg/L at the thumb and diaphragm sites
    const sgx = [0, 0, 0, 1, 10]; // mg/L at the same sites
    bindSugammadexSites(roc, sgx);
    const thumbSgxUmol = (1 * 1000) / MW.sugammadex; // 0.459 µmol/L < roc 2.13 µmol/L
    expect(roc[3]).toBeCloseTo(1300 - thumbSgxUmol * MW.rocuronium, 6);
    expect(sgx[3]).toBeCloseTo(0, 12);
    expect(roc[4]).toBeCloseTo(0, 12); // diaphragm: sugammadex in molar excess
    expect(sgx[4]).toBeCloseTo(10 - ((900 / MW.rocuronium) * MW.sugammadex) / 1000, 9);
    expect(SUGAMMADEX.ke0).toEqual([0.095, 0.152]);
  });
  it('sugammadex binds free rocuronium 1:1 molar in the central compartment', () => {
    const roc = [0.6 * 70 * 1000, 0, 0, 0, 0]; // µg
    const sgx = [2 * 70, 0, 0, 0]; // mg
    const r = bindSugammadex(roc, sgx);
    const rocUmol = (0.6 * 70 * 1000) / MW.rocuronium;
    const sgxUmol = (2 * 70 * 1000) / MW.sugammadex;
    expect(r.boundUmol).toBeCloseTo(Math.min(rocUmol, sgxUmol), 6);
    expect(roc[0]).toBeCloseTo(Math.max(0, rocUmol - sgxUmol) * MW.rocuronium, 3);
    expect(SUGAMMADEX.cl1).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Run it** → FAIL (module missing).

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/nmb.ts`**

```ts
// Neuromuscular blockers, succinylcholine and sugammadex (Stage 7g; tables §5d/§6.1). Per-kg 2-compartment PK with
// TWO effect sites [adductor pollicis, diaphragm/larynx] (Plaud 1995: the diaphragm needs ≈ 1.7× the concentration
// and equilibrates faster). Amount unit µg → concentrations ng/mL. 7f owns the block/TOF PD; `testT1` is its
// formula, used here only to fit and test onset/duration against the labels.
import { fromClearances, type PkParams } from './compartment.ts';

export interface PerKgPk {
  v1: number; v2: number; v3: number; // L/kg
  cl1: number; cl2: number; cl3: number; // L/kg/min
  ke0: number[]; // /min per effect site
}

export function perKg(m: PerKgPk, weightKg: number, clMult = 1): PkParams {
  const w = weightKg;
  return fromClearances(m.v1 * w, m.v2 * w, m.v3 * w, m.cl1 * w * clMult, m.cl2 * w, m.cl3 * w, m.ke0);
}

/** Rocuronium: label CL 0.25 L/kg/h, Vss 0.25 L/kg [P]; V1/Q fitted (task header) [ENG]; ke0 thumb 0.16, diaphragm 0.26 (Plaud 1995) [P]. */
export const ROCURONIUM: PerKgPk = { v1: 0.06, v2: 0.2, v3: 0, cl1: 0.0042, cl2: 0.005, cl3: 0, ke0: [0.16, 0.26] };
/** Vecuronium: label CL 3–5.3 mL/kg/min, Vss 0.3–0.4 L/kg [P]; ke0 0.10 [ENG, fitted 0.1 mg/kg → onset 3.6 / duration 26.8 min]. */
export const VECURONIUM: PerKgPk = { v1: 0.05, v2: 0.3, v3: 0, cl1: 0.0045, cl2: 0.006, cl3: 0, ke0: [0.1, 0.16] };
/** Cisatracurium: Hofmann elimination, CL ≈ 5 mL/kg/min organ-independent, Vss ≈ 0.15 L/kg [P label]; ke0 0.08 [ENG, fitted 0.15 mg/kg → 2.82 / 42.4 min]. */
export const CISATRACURIUM: PerKgPk = { v1: 0.045, v2: 0.11, v3: 0, cl1: 0.0052, cl2: 0.009, cl3: 0, ke0: [0.08, 0.128] };
/**
 * Succinylcholine: plasma-cholinesterase hydrolysis (plasma t½ ≈ 8 s) [TXT]; the block's duration is the slow diffusion
 * away from the junction (no cholinesterase there) → ke0 0.15 [ENG, fitted 1 mg/kg → onset 0.43 / T1 25 % at 7.2 min].
 * CL 0.2 L/kg/min with V1 0.04 L/kg is k10 5/min, plasma t½ ≈ 8 s [TXT]. Phenotypes: PCHE_CL_MULT below.
 */
export const SUCCINYLCHOLINE: PerKgPk = { v1: 0.04, v2: 0, v3: 0, cl1: 0.2, cl2: 0, cl3: 0, ke0: [0.15, 0.24] };
/**
 * Plasma-cholinesterase clearance multipliers — the ONE value 7g and 7f use (R51 addendum 10). Tables §5d give
 * the phenotypes' DURATIONS (Sux-label; Lee 2009: heterozygous ×2, homozygous 4–8 h) but no enzyme-activity value,
 * so both multipliers are [ENG, fitted to those durations]: het 0.5 → 12 min (×1.7), hom 0.003 → 5.2 h.
 */
export const PCHE_CL_MULT = { normal: 1, het: 0.5, hom: 0.003 } as const;
/**
 * Sugammadex: Vss 11–14 L, CL 88 mL/min, t½ 2 h (label) [P]; one compartment per kg. Two effect sites [thumb,
 * diaphragm] through which it reaches the junction and binds there (R51 §5): ke0 0.095 / 0.152 [ENG, fitted, D7:
 * 2 mg/kg at T2 → TOFR 0.9 in 2.11 min (label 2.2); 4 mg/kg at T1 ≥ 1 % → 2.22 (label 2.7, IQR 2.1–4.3);
 * 16 mg/kg 3 min after roc 1.2 → T1 10 % at 1.80 (label 1.2)]. Rocuronium's own 0.16/0.26 reverses in 1.4 min.
 */
export const SUGAMMADEX: PerKgPk = { v1: 0.17, v2: 0, v3: 0, cl1: 0.00126, cl2: 0, cl3: 0, ke0: [0.095, 0.152] };

/** EC50 (ng/mL) and Hill γ per site. Rocuronium Plaud 1995 [P] (γ 4.8 [VERIFY]); others ED95-scaled [ENG] (Miller 10e ch. 24 Table 24.3: ED95 roc 0.305, vec 0.043, cis 0.04 mg/kg). */
export const NMB_PD = {
  rocuronium: { thumb: { ec50: 823, gamma: 4.8 }, dia: { ec50: 1424, gamma: 4.8 } },
  vecuronium: { thumb: { ec50: 150, gamma: 4.5 }, dia: { ec50: 255, gamma: 4.5 } },
  cisatracurium: { thumb: { ec50: 230, gamma: 6.9 }, dia: { ec50: 390, gamma: 6.9 } },
  succinylcholine: { thumb: { ec50: 200, gamma: 4 }, dia: { ec50: 340, gamma: 4 } }, // effect-site fit, not a plasma EC50 [ENG]
} as const;

/** Molar masses (g/mol) of the salts as dosed: rocuronium bromide, vecuronium bromide, sugammadex sodium. */
export const MW = { rocuronium: 609.7, vecuronium: 637.7, sugammadex: 2178 } as const;

/** 7f's block formula (tables §5d): T1 = 1 − Ce^γ/(Ce^γ + EC50^γ). */
export const testT1 = (ce: number, ec50: number, gamma: number): number => 1 - ce ** gamma / (ce ** gamma + ec50 ** gamma);

/**
 * Instant 1:1 molar binding in the central compartment (tables §5d "Sugammadex mechanism"; Ka ≈ 1.8·10⁷ M⁻¹ makes
 * it complete at clinical doses). Mutates the two state vectors (roc/vec in µg, sugammadex in mg).
 */
export function bindSugammadex(nmb: number[], sgx: number[], mwNmb: number = MW.rocuronium): { boundUmol: number } {
  const nmbUmol = (nmb[0] as number) / mwNmb;
  const sgxUmol = ((sgx[0] as number) * 1000) / MW.sugammadex;
  const b = Math.min(nmbUmol, sgxUmol);
  nmb[0] = (nmb[0] as number) - b * mwNmb;
  sgx[0] = (sgx[0] as number) - (b * MW.sugammadex) / 1000;
  return { boundUmol: b };
}

/**
 * The same 1:1 molar binding at both effect sites (x[3] thumb, x[4] diaphragm; R51 §5), in concentration terms:
 * the NMB's Ce in ng/mL = µg/L → µmol/L = Ce/MW; sugammadex's Ce in mg/L → µmol/L = Ce·1000/MW. The effect sites are
 * the model's hypothetical compartments, so binding there is [ENG] (tables §5d "Ce washout via rocuronium ke0" is
 * the plasma-only form; D7). Mutates both vectors.
 */
export function bindSugammadexSites(nmb: number[], sgx: number[], mwNmb: number = MW.rocuronium): void {
  for (const i of [3, 4]) {
    const n = (nmb[i] ?? 0) / mwNmb;
    const s = ((sgx[i] ?? 0) * 1000) / MW.sugammadex;
    const b = Math.min(n, s);
    if (!(b > 0)) continue;
    nmb[i] = (nmb[i] as number) - b * mwNmb;
    sgx[i] = (sgx[i] as number) - (b * MW.sugammadex) / 1000;
  }
}
```

- [x] **Step 4: Run the test.** The four NMB tests and the central-compartment binding test pass as prototyped:
  rocuronium 1.77/30.0 and 0.77/62.9; vecuronium 3.6/26.8; cisatracurium 2.82/42.4; succinylcholine 0.43/7.2 (het 12
  min, hom 5.2 h). The effect-site binding test is arithmetic (values in its comments). Should a later edit break
  one, fit ONLY `ke0[0]` (and set `ke0[1] = 1.6 × ke0[0]`) and, for succinylcholine, `cl1` within the ranges below
  (each range CONTAINS the value in `nmb.ts`), with this throw-away script (do not commit it), then paste the chosen
  numbers into `nmb.ts` with a comment `[ENG, fitted <onset>/<dur>]`:

```ts
// packages/engine-core/test/l2/pk/nmb-fit.scratch.test.ts — run once, read the console, delete
import { it } from 'vitest';
import { pkStep, pkSystem, zeroState } from '../../../src/l2/pk/compartment.ts';
import { NMB_PD, perKg, testT1, VECURONIUM, CISATRACURIUM, SUCCINYLCHOLINE, type PerKgPk } from '../../../src/l2/pk/nmb.ts';
function od(m: PerKgPk, ec50: number, g: number, dose: number) {
  const p = perKg(m, 70); const s = pkSystem(p, 1); let x = zeroState(p); x[0] = dose * 70000; let on = -1, du = -1, mi = 1;
  for (let k = 1; k < 36000; k++) { x = pkStep(s, x, 0); const t = testT1(x[3]!, ec50, g); mi = Math.min(mi, t);
    if (on < 0 && (t <= 0.01 || (k > 600 && t > mi + 1e-6))) on = k / 60; if (on > 0 && du < 0 && t >= 0.25 && k / 60 > on) du = k / 60; }
  return `${on.toFixed(2)}/${du.toFixed(1)}`;
}
it('fit', () => {
  for (const k of [0.1, 0.13, 0.17, 0.22, 0.3]) console.log('vec ke0', k, od({ ...VECURONIUM, ke0: [k, 1.6 * k] }, NMB_PD.vecuronium.thumb.ec50, 4.5, 0.1));
  for (const k of [0.04, 0.06, 0.08, 0.1, 0.13]) console.log('cis ke0', k, od({ ...CISATRACURIUM, ke0: [k, 1.6 * k] }, NMB_PD.cisatracurium.thumb.ec50, 6.9, 0.15));
  for (const c of [0.1, 0.15, 0.2, 0.25, 0.3]) for (const k of [0.1, 0.15, 0.2, 0.3]) console.log('sux cl', c, 'ke0', k, od({ ...SUCCINYLCHOLINE, cl1: c, ke0: [k, 1.6 * k] }, NMB_PD.succinylcholine.thumb.ec50, 4, 1));
});
```
  Ranges (each contains the value in `nmb.ts`): vecuronium ke0 0.1–0.3 (chosen 0.10); cisatracurium ke0 0.04–0.13
  (0.08); succinylcholine cl1 0.1–0.3 L/kg/min (0.2: plasma t½ 5–17 s with V1 0.04 L/kg, around the textbook ≈ 8 s)
  and ke0 0.1–0.3 (0.15). The cholinesterase multipliers `PCHE_CL_MULT` are refitted only against the tables' phenotype
  durations (het ×1.5–2.5, hom 4–8 h), never widened.
  If no value in range meets a band, keep the closest, mark the row `[ENG, band missed: …]`, and list it under
  "needs a ruling" in the gate note (R45: do not widen the band).

- [x] **Step 5: Commit and push** — `git add packages/engine-core/src/l2/pk/nmb.ts packages/engine-core/test/l2/pk/nmb.test.ts && git commit -m "feat(pk): NMBA and succinylcholine PK with thumb/diaphragm effect sites; cholinesterase phenotypes; sugammadex 1:1 binding in plasma and at the effect sites" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 6: Target-controlled infusion (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/tci.ts`, `packages/engine-core/test/l2/pk/tci.test.ts`

**Interfaces (Produces):** `TCI_DT_S = 10`, `TCI_HORIZON_STEPS = 90`, `TciMode`, `tciRate(p, x, mode, target, maxRate, site?)`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/tci.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';
import { eleveldPropofol, marshPropofol, mintoRemifentanil, schniderPropofol } from '../../../src/l2/pk/models.ts';
import { tciRate, TCI_DT_S, type TciMode } from '../../../src/l2/pk/tci.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const PUMP_PROPOFOL = (1200 * 10) / 60; // 1200 mL/h of 10 mg/mL = 200 mg/min
const PUMP_REMI = (1200 * 50) / 60; // 50 µg/mL

function run(p: PkParams, mode: TciMode, target: number, maxRate: number, minutes: number) {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  let rate = 0;
  let first = 0;
  let reach = -1;
  let maxCe = 0;
  let maxCp = 0;
  for (let k = 0; k < minutes * 600; k++) {
    if (k % (TCI_DT_S * 10) === 0) rate = tciRate(p, x, mode, target, maxRate);
    x = pkStep(s, x, rate);
    if (k < 600) first += rate / 600;
    maxCe = Math.max(maxCe, x[3]!);
    maxCp = Math.max(maxCp, cp(p, x));
    if (reach < 0 && x[3]! >= 0.95 * target) reach = k / 600;
  }
  return { first, reach, maxCe, maxCp, ce: x[3]!, cp: cp(p, x) };
}

describe('TCI', () => {
  it('Eleveld effect-site 3 µg/mL: ~140 mg in minute 1, 95 % at 2.1–2.6 min, no overshoot, holds target', () => {
    const r = run(eleveldPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 60);
    expect(r.first).toBeGreaterThan(126);
    expect(r.first).toBeLessThan(154); // prototype 140.4
    expect(r.reach).toBeGreaterThan(2.1);
    expect(r.reach).toBeLessThan(2.6); // prototype 2.35
    expect(r.maxCe).toBeLessThan(3.003);
    expect(r.ce).toBeCloseTo(3, 2);
    expect(r.cp).toBeCloseTo(3, 2);
  });
  it('Schnider effect-site 3: 95 % within 1.0–1.4 min (prototype 1.21), plasma overshoot drives it', () => {
    const r = run(schniderPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 20);
    expect(r.reach).toBeGreaterThan(1.0);
    expect(r.reach).toBeLessThan(1.4);
    expect(r.maxCp).toBeGreaterThan(6);
  });
  it('Marsh plasma 4: the first interval delivers V1·Cp (63.8 mg) + maintenance; Cp never exceeds target', () => {
    const r = run(marshPropofol(REF), 'plasma', 4, 1e9, 30);
    expect(r.first).toBeGreaterThan(70);
    expect(r.first).toBeLessThan(86); // prototype 78.3
    expect(r.maxCp).toBeLessThan(4.001);
  });
  it('Minto effect-site 4 ng/mL: 95 % at 0.9–1.3 min (prototype 1.09)', () => {
    const r = run(mintoRemifentanil({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' }), 'effect', 4, PUMP_REMI, 30);
    expect(r.reach).toBeGreaterThan(0.9);
    expect(r.reach).toBeLessThan(1.3);
    expect(r.maxCe).toBeLessThan(4.004);
  });
  it('a lower target stops the pump until Ce has fallen to it', () => {
    const p = eleveldPropofol(REF);
    const s = pkSystem(p, TCI_DT_S);
    let x = zeroState(p);
    for (let k = 0; k < 120; k++) x = pkStep(s, x, tciRate(p, x, 'effect', 4, PUMP_PROPOFOL));
    expect(tciRate(p, x, 'effect', 2, PUMP_PROPOFOL)).toBe(0);
  });
});
```

- [x] **Step 2: Run it** → FAIL (module missing).

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/tci.ts`**

```ts
// Target-controlled infusion (Stage 7g). Every TCI_DT_S the controller chooses ONE rate for the next interval:
//   plasma targeting (Jacobs 1990): the rate that puts Cp exactly on target at the end of the interval;
//   effect-site targeting (Shafer & Gregg 1992): the largest rate for which the predicted Ce never exceeds the
//   target over the horizon, given that the pump stops after this interval. By linearity
//   Ce(k) = Ce_free(k) + r·Ce_unit(k), so r = min_k (target − Ce_free(k)) / Ce_unit(k) over k with Ce_unit(k) > 0 —
//   exact, no search. Both clamp to [0, maxRate] (the pump's limit: 1200 mL/h in the published pumps).
import { pkStep, pkSystem, type PkParams } from './compartment.ts';

export const TCI_DT_S = 10;
export const TCI_HORIZON_STEPS = 90; // 15 min: > 4× the slowest TTPE among TCI drugs (fentanyl 3.6 min)

export type TciMode = 'plasma' | 'effect';

/** Ce response to rate 1 during the first interval, then 0 (cached per parameter set). */
const UNIT = new Map<string, number[]>();
function unitResponse(p: PkParams, site: number): number[] {
  const key = `${p.v1}|${p.k10}|${p.k12}|${p.k21}|${p.k13}|${p.k31}|${p.ke0.join(',')}|${site}`;
  const hit = UNIT.get(key);
  if (hit) return hit;
  const sys = pkSystem(p, TCI_DT_S);
  let x = new Array<number>(sys.n).fill(0);
  const out: number[] = [];
  for (let k = 0; k < TCI_HORIZON_STEPS; k++) {
    x = pkStep(sys, x, k === 0 ? 1 : 0);
    out.push(x[3 + site] as number);
  }
  if (UNIT.size > 256) UNIT.clear();
  UNIT.set(key, out);
  return out;
}

/** The infusion rate (amount/min) for the next TCI_DT_S seconds. `x` is the current state. */
export function tciRate(p: PkParams, x: readonly number[], mode: TciMode, target: number, maxRate: number, site = 0): number {
  const sys = pkSystem(p, TCI_DT_S);
  if (mode === 'plasma') {
    const free = pkStep(sys, x, 0)[0] as number;
    const r = (target * p.v1 - free) / (sys.bd[0] as number);
    return Math.min(maxRate, Math.max(0, r));
  }
  const unit = unitResponse(p, site);
  let xf = x.slice();
  let r = Number.POSITIVE_INFINITY;
  for (let k = 0; k < TCI_HORIZON_STEPS; k++) {
    xf = pkStep(sys, xf, 0);
    const u = unit[k] as number;
    if (u > 1e-12) r = Math.min(r, (target - (xf[3 + site] as number)) / u);
  }
  return Math.min(maxRate, Math.max(0, r));
}
```

- [x] **Step 4: Run the test** → PASS (prototype numbers in the comments).
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): plasma and effect-site TCI (Jacobs; Shafer–Gregg by linearity)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 7: Context-sensitive half-time and decrement times (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/csht.ts`, `packages/engine-core/test/l2/pk/csht.test.ts`

**Interfaces (Produces):** `decrementTimeMin(p, durationMin, fraction?, site?, maxMin?)` (classic Hughes CSHT),
`decrementFromNowMin(p, x, fraction?, site?, maxMin?)` (panel, decision 13).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/csht.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decrementFromNowMin, decrementTimeMin } from '../../../src/l2/pk/csht.ts';
import { eleveldPropofol, marshPropofol, mintoRemifentanil, schniderPropofol, shaferFentanyl, geptsSufentanil } from '../../../src/l2/pk/models.ts';
import { zeroState } from '../../../src/l2/pk/compartment.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const within = (v: number, ref: number, tol = 0.1) => expect(Math.abs(v - ref) / ref).toBeLessThan(tol);

describe('context-sensitive half-time (decision 3)', () => {
  it('propofol: each model within ±10 % of its own computed value; all < 40 min up to 8 h (Hughes 1992 / Miller)', () => {
    within(decrementTimeMin(eleveldPropofol(REF), 180), 4.5);
    within(decrementTimeMin(schniderPropofol(REF), 180), 3.5);
    within(decrementTimeMin(marshPropofol(REF), 180), 8.6);
    for (const p of [eleveldPropofol(REF), schniderPropofol(REF), marshPropofol(REF)]) expect(decrementTimeMin(p, 480)).toBeLessThan(40);
  });
  it('remifentanil 2–4 min and context-INsensitive (8 h within 5 % of 1 h) (Kapila 1995 3.2; Miller ch. 22 p. 588)', () => {
    const p = mintoRemifentanil({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' });
    const h1 = decrementTimeMin(p, 60);
    const h8 = decrementTimeMin(p, 480);
    expect(h1).toBeGreaterThan(2);
    expect(h1).toBeLessThan(4);
    expect(Math.abs(h8 - h1) / h1).toBeLessThan(0.05);
  });
  it('fentanyl rises steeply: 3 h > 3× the 1 h value; sufentanil 3 h 20–30 min (Hughes 1992)', () => {
    const f1 = decrementTimeMin(shaferFentanyl(), 60);
    const f3 = decrementTimeMin(shaferFentanyl(), 180);
    expect(f3).toBeGreaterThan(3 * f1); // prototype 17.8 → 70.0
    const s3 = decrementTimeMin(geptsSufentanil(), 180);
    expect(s3).toBeGreaterThan(20);
    expect(s3).toBeLessThan(30); // prototype 25.6
  });
  it('decrement from now: zero state → 0; after a bolus Cp halves in finite time', () => {
    const p = eleveldPropofol(REF);
    expect(decrementFromNowMin(p, zeroState(p))).toBe(0);
    const x = zeroState(p);
    x[0] = 140;
    const t = decrementFromNowMin(p, x);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(5);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/csht.ts`**

```ts
// Context-sensitive half-time (Hughes, Glass & Jacobs 1992): after an infusion that held the PLASMA concentration
// constant for `durationMin`, the time for Cp to fall by 50 %. The decrement time generalises it (any fraction, plasma
// or effect site). `decrementFromNowMin` is the panel's version (decision 13): from the CURRENT state.
import { cp, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';
import { tciRate } from './tci.ts';

export function decrementFromNowMin(p: PkParams, x0: readonly number[], fraction = 0.5, site: 'plasma' | 'effect' = 'plasma', maxMin = 600): number {
  const read = (x: readonly number[]) => (site === 'plasma' ? cp(p, x) : (x[3] as number));
  const c0 = read(x0);
  if (!(c0 > 0)) return 0;
  const coarse = pkSystem(p, 10);
  const fine = pkSystem(p, 1);
  let x = x0.slice();
  for (let s = 10; s <= maxMin * 60; s += 10) {
    const next = pkStep(coarse, x, 0);
    if (read(next) <= c0 * (1 - fraction)) {
      // refine the last 10 s at 1 s
      for (let k = 1; k <= 10; k++) {
        x = pkStep(fine, x, 0);
        if (read(x) <= c0 * (1 - fraction)) return (s - 10 + k) / 60;
      }
      return s / 60;
    }
    x = next;
  }
  return Number.POSITIVE_INFINITY;
}

export function decrementTimeMin(p: PkParams, durationMin: number, fraction = 0.5, site: 'plasma' | 'effect' = 'plasma', maxMin = 600): number {
  const sys = pkSystem(p, 10);
  let x = zeroState(p);
  for (let t = 0; t < durationMin * 60; t += 10) x = pkStep(sys, x, tciRate(p, x, 'plasma', 1, Number.POSITIVE_INFINITY));
  return decrementFromNowMin(p, x, fraction, site, maxMin);
}
```

- [x] **Step 4: Run the test** → PASS. (Prototype values: see decision 3; the prototype used 1 s steps throughout —
  the 10 s coarse step with 1 s refinement gives the same result to ±1 s.)
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): context-sensitive half-time and decrement-from-now" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 8: Volatile uptake, FA/FI and MAC(age) (PROTOTYPED)

**Files:**
- Create: `packages/engine-core/src/l2/pk/volatile.ts`, `packages/engine-core/test/l2/pk/volatile.test.ts`

**Interfaces (Produces):** `VolatileAgent`, `AGENTS`, `GROUPS`, `CIRCUIT_L`, `VolatileState`, `createVolatile(agent)`,
`VolatileEnv`, `stepVolatile(s, env, dtS)`, `macForAge(agent, ageY)`, `macFraction(s, ageY)`, `MAC_AWAKE = 0.34`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/volatile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createVolatile, macForAge, macFraction, stepVolatile, type VolatileAgent } from '../../../src/l2/pk/volatile.ts';

const ENV = { vaLpm: 4, coLpm: 5, frcL: 2.5, weightKg: 70 };

function wash(agent: VolatileAgent, fgf: number, minutes: number, holdFi: boolean) {
  const s = createVolatile(agent);
  s.fd = 0.01;
  s.fgf = fgf;
  if (holdFi) s.fi = 0.01;
  let t50 = -1;
  const at: Record<number, number> = {};
  for (let k = 1; k <= minutes * 600; k++) {
    if (holdFi) s.fi = 0.01;
    stepVolatile(s, ENV, 0.1);
    if (t50 < 0 && s.fa / s.fi >= 0.5) t50 = k / 600;
    if (k % 600 === 0) at[k / 600] = s.fa / (holdFi ? s.fi : s.fd);
  }
  return { s, t50, at };
}

describe('volatile uptake (decision 9)', () => {
  it('FA/FI at 30 min with FI held matches Yasuda 1991 within 0.04: des 0.90, sevo 0.85, iso 0.73; N2O ≥ 0.9', () => {
    expect(Math.abs(wash('desflurane', 10, 30, true).at[30]! - 0.9)).toBeLessThan(0.04); // prototype 0.91
    expect(Math.abs(wash('sevoflurane', 10, 30, true).at[30]! - 0.85)).toBeLessThan(0.04); // 0.85
    expect(Math.abs(wash('isoflurane', 10, 30, true).at[30]! - 0.73)).toBeLessThan(0.04); // 0.72
    expect(wash('n2o', 10, 30, true).at[30]!).toBeGreaterThan(0.9); // 0.92
  });
  it('time to FA/FI 0.5: des < sevo < iso (prototype 0.57 / 0.73 / 3.4 min)', () => {
    const d = wash('desflurane', 10, 10, true).t50;
    const s = wash('sevoflurane', 10, 10, true).t50;
    const i = wash('isoflurane', 10, 10, true).t50;
    expect(d).toBeLessThan(s);
    expect(s).toBeLessThan(i);
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1.0);
  });
  it('low flow lags: sevo FA/FD at 30 min is 0.45–0.55 at 1 L/min vs ≥ 0.8 at 10 L/min in a 7 L circle', () => {
    expect(wash('sevoflurane', 1, 30, false).at[30]!).toBeGreaterThan(0.45);
    expect(wash('sevoflurane', 1, 30, false).at[30]!).toBeLessThan(0.55); // prototype 0.50
  });
  it('brain follows alveoli with τ 2–4 min: brain/FA ≥ 0.9 by 10 min', () => {
    const w = wash('sevoflurane', 10, 10, true);
    expect(w.s.vrg / w.s.fa).toBeGreaterThan(0.9); // prototype 0.93
  });
  it('MAC(age) Mapleson: sevo 1.80 at 40 y, −6 %/decade (2.04 / 1.59 / 1.40 at 20/60/80)', () => {
    expect(macForAge('sevoflurane', 40)).toBeCloseTo(1.8, 6);
    expect(macForAge('sevoflurane', 80)).toBeCloseTo(1.40, 2);
    expect(macForAge('sevoflurane', 20)).toBeCloseTo(2.04, 2);
    const s = createVolatile('sevoflurane');
    s.vrg = 0.018;
    expect(macFraction(s, 40)).toBeCloseTo(1, 6);
  });
  it('apnoea (VA 0) freezes alveolar exchange; closing the vaporiser washes out', () => {
    const s = createVolatile('sevoflurane');
    s.fa = 0.02;
    s.vrg = 0.02;
    s.fi = 0;
    for (let k = 0; k < 600; k++) stepVolatile(s, { ...ENV, vaLpm: 4 }, 0.1);
    expect(s.fa).toBeLessThan(0.01);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/volatile.ts`**

```ts
// Volatile/N2O uptake and distribution (Stage 7g; tables §5d/§6.1): a breathing-circuit volume, the alveolar gas
// (FRC), and three tissue groups in parallel on the cardiac output — vessel-rich group (VRG, whose tension is the
// brain's), muscle, fat — after Eger's and Mapleson's classic models. Tensions are fractions of 1 atm.
//   circuit : Vc·dFI/dt = FGF·(FD − FI) − U                           (rebreathing at low flow: FI < FD)
//   alveoli : VL·dFA/dt = VA·(FI − FA) − U,  U = Q·λb/g·(FA − Fv),  Fv = Σ q_i·F_i
//   tissue i: V_i·λ_i/b·dF_i/dt = Q·q_i·(FA − F_i)                      (arterial tension = alveolar)
// Stepped with forward Euler at 0.1 s: the fastest time constant (alveolar, ≈ 10–15 s) is ≥ 100 steps.
// No concentration or second-gas effect (v1 simplification, decision 9).

export type VolatileAgent = 'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o';

export interface AgentRow {
  bg: number; // blood/gas partition coefficient
  vrg: number; muscle: number; fat: number; // tissue/blood partition coefficients
  mac40: number; // % atm at 40 y (Mapleson 1996)
}

/**
 * Blood/gas: Miller 10e ch. 19 p. 427 (N2O 0.46, iso 1.46, sevo 0.65, des 0.42). Tissue/blood: Yasuda 1989/Eger via
 * Miller 10e ch. 18 Table 18.2 [VERIFY per row; Miller gives CNS/blood 2.2 for isoflurane, this row keeps 1.6 which
 * reproduces Yasuda's FA/FI]. MAC40: Mapleson 1996 (tables §5d; sevo 1.80, Q52).
 */
export const AGENTS: Record<VolatileAgent, AgentRow> = {
  n2o: { bg: 0.46, vrg: 1.1, muscle: 1.2, fat: 2.3, mac40: 104 },
  desflurane: { bg: 0.42, vrg: 1.3, muscle: 2.0, fat: 27, mac40: 6.6 },
  sevoflurane: { bg: 0.65, vrg: 1.7, muscle: 3.1, fat: 48, mac40: 1.8 },
  isoflurane: { bg: 1.46, vrg: 1.6, muscle: 2.9, fat: 45, mac40: 1.17 },
};

/** Tissue groups for 70 kg (volumes L, fraction of CO): Eger 1974 / Mapleson 1973 [TXT]; scaled by W/70. */
export const GROUPS = { vrg: { v: 6, q: 0.75 }, muscle: { v: 33, q: 0.19 }, fat: { v: 14.5, q: 0.06 } } as const;
export const CIRCUIT_L = 7; // circle system + bag + absorber gas volume [ENG]
export const MAC_AWAKE = 0.34; // × MAC for the potent agents (Miller 10e ch. 18 p. 406)

export interface VolatileState {
  agent: VolatileAgent;
  fd: number; // fraction delivered by the vaporiser / flowmeter (dial % / 100)
  fgf: number; // fresh gas flow, L/min
  fi: number; fa: number; vrg: number; muscle: number; fat: number;
}

export const createVolatile = (agent: VolatileAgent): VolatileState => ({ agent, fd: 0, fgf: 2, fi: 0, fa: 0, vrg: 0, muscle: 0, fat: 0 });

export interface VolatileEnv {
  vaLpm: number; // alveolar ventilation (0 in apnoea)
  coLpm: number;
  frcL: number;
  weightKg: number;
}

export function stepVolatile(s: VolatileState, env: VolatileEnv, dtS: number): void {
  const a = AGENTS[s.agent];
  const w = env.weightKg / 70;
  const dt = dtS / 60;
  const q = env.coLpm;
  const fv = GROUPS.vrg.q * s.vrg + GROUPS.muscle.q * s.muscle + GROUPS.fat.q * s.fat;
  const u = q * a.bg * (s.fa - fv);
  const fi = s.fi + (dt * (s.fgf * (s.fd - s.fi) - u)) / CIRCUIT_L;
  const fa = s.fa + (dt * (env.vaLpm * (s.fi - s.fa) - u)) / Math.max(0.5, env.frcL);
  s.vrg += (dt * q * GROUPS.vrg.q * (s.fa - s.vrg)) / (GROUPS.vrg.v * w * a.vrg);
  s.muscle += (dt * q * GROUPS.muscle.q * (s.fa - s.muscle)) / (GROUPS.muscle.v * w * a.muscle);
  s.fat += (dt * q * GROUPS.fat.q * (s.fa - s.fat)) / (GROUPS.fat.v * w * a.fat);
  s.fi = Math.max(0, fi);
  s.fa = Math.max(0, fa);
}

/** Age-adjusted MAC (% atm): MAC40·10^(−0.00269·(age − 40)) (Mapleson 1996; ≈ −6 % per decade). */
export const macForAge = (agent: VolatileAgent, ageY: number): number => AGENTS[agent].mac40 * 10 ** (-0.00269 * (ageY - 40));

/** Brain (VRG) MAC fraction of one agent. */
export const macFraction = (s: VolatileState, ageY: number): number => (100 * s.vrg) / macForAge(s.agent, ageY);
```

- [x] **Step 4: Run the test** → PASS (prototype numbers in the comments; decision 9 table).
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): volatile/N2O uptake (circuit, alveoli, VRG, muscle, fat), FA/FI by FGF, MAC(age)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 9: Dose units and the gamma fallback path

**Files:**
- Create: `packages/engine-core/src/l2/pk/units.ts`, `packages/engine-core/src/l2/pk/gamma.ts`, `packages/engine-core/test/l2/pk/units-gamma.test.ts`

**Interfaces (Produces):** `toAmount(dose, unit, amountUnit, weightKg, perMl?)` → amount in the drug's unit or an error
string; `toRate(rate, unit, amountUnit, weightKg, conc?)` → amount/min; `gammaShape(tSinceS, tpS, n)` (brief §4.9
`(t/tp)^n·e^{n(1 − t/tp)}`, peak 1 at t = tp); `GammaDose { t; scale }`, `gammaConc(doses, t, tpS, n)`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/units-gamma.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toAmount, toRate } from '../../../src/l2/pk/units.ts';
import { gammaConc, gammaShape } from '../../../src/l2/pk/gamma.ts';

describe('units', () => {
  it('bolus units convert to the drug amount unit', () => {
    expect(toAmount(2, 'mg/kg', 'mg', 70)).toBe(140);
    expect(toAmount(100, 'mcg', 'mg', 70)).toBeCloseTo(0.1, 12);
    expect(toAmount(1, 'mcg/kg', 'mcg', 80)).toBe(80);
    expect(toAmount(1, 'g', 'mg', 70)).toBe(1000);
    expect(toAmount(10, 'mL', 'mg', 70, 10)).toBe(100); // 10 mL of 10 mg/mL
    expect(typeof toAmount(1, 'units', 'mg', 70)).toBe('string'); // incompatible → error text
  });
  it('rate units convert to amount/min', () => {
    expect(toRate(0.1, 'mcg/kg/min', 'mcg', 70)).toBeCloseTo(7, 12);
    expect(toRate(6, 'mg/kg/h', 'mg', 70)).toBeCloseTo(7, 12);
    expect(toRate(20, 'mL/h', 'mg', 70, 10)).toBeCloseTo(20 * 10 / 60, 12);
    expect(toRate(0.04, 'units/min', 'units', 70)).toBeCloseTo(0.04, 12);
  });
});

describe('gamma fallback (brief §4.9)', () => {
  it('peaks at 1 at tp and repeats add', () => {
    expect(gammaShape(60, 60, 2)).toBeCloseTo(1, 12);
    expect(gammaShape(0, 60, 2)).toBe(0);
    expect(gammaShape(30, 60, 2)).toBeLessThan(1);
    expect(gammaConc([{ t: 0, scale: 1 }, { t: 0, scale: 0.5 }], 60, 60, 2)).toBeCloseTo(1.5, 12);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/units.ts`**

```ts
// Dose and rate normalisation (Stage 7g). The API keeps the brief's units; each library row has ONE amount unit.
import type { DoseUnit, RateUnit } from '../../types-pk.ts';

export type AmountUnit = 'mg' | 'mcg' | 'units' | 'mmol' | 'mL';
const MASS: Record<string, number> = { g: 1e6, mg: 1000, mcg: 1 }; // in µg

/** Bolus dose → amount in `amountUnit`, or an error string. `perMl` = syringe concentration (amountUnit per mL). */
export function toAmount(dose: number, unit: DoseUnit | RateUnit, amountUnit: AmountUnit, weightKg: number, perMl?: number): number | string {
  const perKg = unit.endsWith('/kg');
  const base = perKg ? unit.slice(0, -3) : unit;
  const d = perKg ? dose * weightKg : dose;
  if (base === 'mL') return perMl !== undefined ? d * perMl : 'a volume dose needs the drug concentration';
  if (base in MASS && amountUnit in MASS) return (d * (MASS[base] as number)) / (MASS[amountUnit] as number);
  if (base === amountUnit) return d;
  if (base === 'mEq' && amountUnit === 'mmol') return d; // monovalent (bicarbonate); 7c converts divalent ions itself
  return `unit ${unit} does not fit a drug dosed in ${amountUnit}`;
}

/** Rate → amount/min in `amountUnit`, or an error string. mL/h needs the syringe concentration. */
export function toRate(rate: number, unit: RateUnit, amountUnit: AmountUnit, weightKg: number, perMl?: number): number | string {
  const [num, ...rest] = unit.split('/');
  const per = rest.join('/'); // 'kg/min', 'min', 'h', 'kg/h'
  const perKg = per.startsWith('kg/');
  const time = perKg ? per.slice(3) : per;
  const minutes = time === 'h' ? 60 : time === 'min' ? 1 : NaN;
  if (!Number.isFinite(minutes)) return `unit ${unit} is not a rate`;
  const a = toAmount(rate, num as DoseUnit, amountUnit, 1, perMl);
  if (typeof a === 'string') return a;
  return ((perKg ? a * weightKg : a) as number) / minutes;
}
```

- [x] **Step 4: Create `packages/engine-core/src/l2/pk/gamma.ts`**

```ts
// The brief §4.9 drug effect curve, kept as the FALLBACK path for drugs without a PK model in v1 (tables §6.1 "kept
// as gamma effect curves"): E(t) = (t/tp)^n·e^{n(1 − t/tp)}, 1 at t = tp. A dose contributes scale·E(t − tGiven),
// where scale = dose/refDose (× tachyphylaxis); the sum is a normalised effect-site "concentration" in reference-dose
// units, fed to the same PD as a Ce (decision 5). n from the row's duration: E falls to 0.1 at t ≈ tp·(1 + 2.3/√n).
export interface GammaDose {
  t: number; // s, given at
  scale: number;
}

export function gammaShape(dtS: number, tpS: number, n: number): number {
  if (dtS <= 0) return 0;
  const r = dtS / tpS;
  return r ** n * Math.exp(n * (1 - r));
}

export function gammaConc(doses: readonly GammaDose[], t: number, tpS: number, n: number): number {
  let c = 0;
  for (const d of doses) c += d.scale * gammaShape(t - d.t, tpS, n);
  return c;
}

/** Shape exponent n from time to peak and the time at which the effect has fallen to 10 % (both s). */
export function gammaN(tpS: number, t10S: number): number {
  const x = Math.max(1.05, t10S / tpS);
  // solve x^n·e^{n(1−x)} = 0.1 → n = ln(0.1)/(ln x + 1 − x)
  return Math.log(0.1) / (Math.log(x) + 1 - x);
}
```

- [x] **Step 5: Run the test** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): dose/rate units and the brief's gamma effect curve as the fallback path" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 10: PD primitives and the library row type

**Files:**
- Create: `packages/engine-core/src/l2/pk/pd.ts`, `packages/engine-core/src/l2/pk/row.ts`, `packages/engine-core/test/l2/pk/pd.test.ts`

**Interfaces (Produces):** `hill(c, ec50, emax, n?)`, `competitiveEc50(ec50, occupancy)`, `acidosisFactor(ph)`,
`responseSurface(uh, uo, alpha?)`, `SURFACE_ALPHA = 1.5`, `tachy(nRecent, f)`, `betaBlunt(f, occupancy)` (Task 17
imports it into 7a's control step, R51 addendum 11), `ELEVELD_CE50_AGE_K = 0.00635`; types `DrugClass`, `PdTarget`,
`PdEffect`, `PkSpec` (the `model` variant carries `ventKe0?`, R51 §2), `DrugRow`, `CnsSpec` (`hypC50AgeK?`).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/pd.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { acidosisFactor, betaBlunt, competitiveEc50, hill, responseSurface, tachy } from '../../../src/l2/pk/pd.ts';

describe('PD primitives', () => {
  it('Emax/Hill: half effect at EC50, zero at zero, signed Emax', () => {
    expect(hill(2, 2, 1)).toBeCloseTo(0.5, 12);
    expect(hill(0, 2, 1)).toBe(0);
    expect(hill(2, 2, -0.4, 3)).toBeCloseTo(-0.2, 12);
  });
  it('competitive antagonism shifts EC50 by 1 + occupancy/(1 − occupancy)', () => {
    expect(competitiveEc50(1, 0.5)).toBeCloseTo(2, 12);
    expect(competitiveEc50(1, 0)).toBe(1);
    expect(competitiveEc50(1, 0.99)).toBeLessThan(21); // capped at occupancy 0.95
  });
  it('acidosis blunts catecholamines: pH 7.4 → 1, 7.2 → 0.5, never below 0.4', () => {
    expect(acidosisFactor(7.4)).toBe(1);
    expect(acidosisFactor(7.5)).toBe(1);
    expect(acidosisFactor(7.2)).toBeCloseTo(0.5, 12);
    expect(acidosisFactor(6.9)).toBe(0.4);
  });
  it('response surface: additive plus synergy; tachyphylaxis 0.7 per repeat', () => {
    expect(responseSurface(1, 0)).toBe(1);
    expect(responseSurface(0.5, 0.5)).toBeCloseTo(1.375, 12);
    expect(tachy(2, 0.7)).toBeCloseTo(0.49, 12);
  });
  it('β-blockade blunts the RISE of a catecholamine-surge multiplier only (7e endoHrF/endoEesF)', () => {
    expect(betaBlunt(1.4, 0)).toBeCloseTo(1.4, 12);
    expect(betaBlunt(1.4, 0.75)).toBeCloseTo(1.1, 12);
    expect(betaBlunt(0.8, 0.9)).toBe(0.8); // a fall is not a β effect
    expect(betaBlunt(1.4, 2)).toBe(1); // occupancy clamped to 1
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/pd.ts`**

```ts
// PD primitives (Stage 7g decision 6/7). Pure functions; every constant is cited where it is used.

/** Sigmoid Emax: emax·c^n/(c^n + ec50^n); emax may be negative (depressant). */
export function hill(c: number, ec50: number, emax: number, n = 1): number {
  if (!(c > 0)) return 0;
  const cn = c ** n;
  return (emax * cn) / (cn + ec50 ** n);
}

/** Competitive antagonism: EC50·(1 + Cant/Ki), written with receptor occupancy o = Cant/(Cant + Ki) (capped 0.95). */
export function competitiveEc50(ec50: number, occupancy: number): number {
  const o = Math.min(0.95, Math.max(0, occupancy));
  return ec50 * (1 + o / (1 - o));
}

/** Catecholamine efficacy under acidaemia (tables §5b.1/§6.2): ×(1 − 2.5·(7.4 − pH)), 0.4–1 [ENG, Q44]. */
export function acidosisFactor(ph: number): number {
  if (!(ph < 7.4)) return 1;
  return Math.max(0.4, 1 - 2.5 * (7.4 - ph));
}

/** Greco/Minto response surface, simplest form: U = Uh + Uo + α·Uh·Uo (α 1.5 [ENG within Bouillon 2004]). */
export const SURFACE_ALPHA = 1.5;
export const responseSurface = (uh: number, uo: number, alpha = SURFACE_ALPHA): number => uh + uo + alpha * uh * uo;

/** Tachyphylaxis multiplier after n recent repeats (ephedrine 0.7 per repeat within 60 min, tables §6.2 [ENG]). */
export const tachy = (nRecent: number, f: number): number => f ** Math.max(0, nRecent);

/**
 * β-receptor occupancy by a β-blocker drug blunts the RISE of a catecholamine-driven multiplier (7e's surge
 * `endoHrF`/`endoEesF`, R51 addendum 11): 1 + (f − 1)·(1 − occupancy) for f > 1; a fall passes unchanged [ENG:
 * the same competitive picture as the β-agonist EC50 shift, collapsed to the fraction of receptors left].
 */
export function betaBlunt(f: number, occupancy: number): number {
  if (!(f > 1)) return f;
  return 1 + (f - 1) * (1 - Math.min(1, Math.max(0, occupancy)));
}

/** Eleveld BIS Ce50 age slope: Ce50(age) = Ce50(35)·e^(−0.00635·(age − 35)) (tables §5d, R51 addendum 11). */
export const ELEVELD_CE50_AGE_K = 0.00635;
```

- [x] **Step 4: Create `packages/engine-core/src/l2/pk/row.ts`** (types only — the library in Tasks 12–14 is data of this shape)

```ts
// The drug-library row (Stage 7g). One row per drug; every number carries `src` and a tag (R37).
import type { PerKgPk } from './nmb.ts';
import type { AmountUnit } from './units.ts';
import type { VolatileAgent } from './volatile.ts';

export type DrugClass =
  | 'hypnotic' | 'opioid' | 'benzodiazepine' | 'ketamine' | 'alpha2' | 'volatile' | 'nmb' | 'depolariser' | 'nmbReversal'
  | 'anticholinesterase' | 'anticholinergic' | 'alpha1' | 'mixedAdrenergic' | 'betaAgonist' | 'vasopressin' | 'pde3'
  | 'betaBlocker' | 'antiarrhythmic' | 'adenosine' | 'vasodilator' | 'electrolyte' | 'metabolic' | 'opioidAntagonist'
  | 'benzoAntagonist' | 'localAnaesthetic' | 'lipid' | 'dantrolene' | 'diuretic' | 'osmotic' | 'placeholder';

/** Named engine inputs a drug can move (multipliers are "fraction change": the effect E adds to 1). */
export type PdTarget =
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' // → 7a DrugEffect
  | 'betaBlock' | 'avNode' | 'bronchodilation' | 'histamine' | 'hpvInhibit' | 'kShift' | 'glucose' | 'cmro2' | 'cbfVaso' | 'achGain';

export interface PdEffect {
  target: PdTarget;
  emax: number; // fraction change at full effect (negative = depression); for betaBlock/avNode: occupancy 0–1
  ec50: number; // in the row's concentration unit (see PkSpec)
  hill?: number;
  beta?: boolean; // β-mediated: EC50 shifted by β-blocker occupancy (decision 7)
  catecholamine?: boolean; // efficacy × acidosisFactor(pH) × sepsis vasoResp
  linear?: boolean; // E = emax·c/ec50 (per-MAC effects of the volatiles, tables §6.3), clamped to ±|emax|·3
}

/** How the drug's concentration is produced (decision 5). */
export type PkSpec =
  // µg/mL or ng/mL; ventKe0 (opioids): a SEPARATE ventilatory effect site appended after the model's own (R51 §2)
  | { kind: 'model'; model: 'eleveld' | 'schnider' | 'marsh' | 'minto' | 'shafer' | 'gepts'; ventKe0?: number }
  | { kind: 'perKg'; pk: PerKgPk; conc: 'rateEq' | 'plain' } // rateEq: Ce·CL/W in µg/kg/min (decision 4)
  | { kind: 'nmb'; agent: 'rocuronium' | 'vecuronium' | 'cisatracurium' | 'succinylcholine' | 'sugammadex' }
  | { kind: 'gamma'; refDose: number; perKg: boolean; tpS: number; t10S: number; refRate?: number; tauOnS?: number; tauOffS?: number } // c in reference-dose units
  | { kind: 'volatile'; agent: VolatileAgent }
  | { kind: 'blood' }; // chemistry only: 7g validates, consumes and logs the dose; 7c's mass balance acts (decision 10)

/** CNS roles for the DrugBus (7f/7b consumers). */
export interface CnsSpec {
  hypC50?: number; // concentration for uHyp = 1 (hypnotic potency) at 35 y
  hypC50AgeK?: number; // hypC50 × e^(−k·(age − 35)) (propofol: Eleveld, ELEVELD_CE50_AGE_K)
  remiEq?: number; // × Ce → remifentanil-equivalent ng/mL (opioids)
  midazEq?: number; // × c → midazolam-equivalent (benzodiazepines)
  cmro2?: number; // fractional CMRO2 fall at uHyp = 1 (tables §5.1)
}

export interface DrugRow {
  id: string;
  name: string;
  cls: DrugClass;
  amountUnit: AmountUnit;
  pk: PkSpec;
  /** elimination route fractions of CL (the rest organ-independent); hepatic high-extraction drugs follow liver FLOW */
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };
  pd: PdEffect[];
  cns?: CnsSpec;
  /** default syringe concentration (amountUnit per mL) and pump limit — for mL/h and TCI */
  syringePerMl?: number;
  tachyphylaxis?: number;
  /** competitive antagonist of a whole class (naloxone → opioid, flumazenil → benzodiazepine): occupancy = hill(c, ec50, emax) */
  antagonises?: { cls: DrugClass; ec50: number; emax: number };
  shared?: 'blood'; // 7c also acts on this id, reading it from bus.doses (decision 10; 7g still consumes the event)
  doses: string; // typical adult doses, text
  onset: string; // onset / peak / duration, text (research 03 §8.6)
  ir: '?'; // Iranian availability — a question for Ali on every row
  src: string;
  tag: 'P' | 'TXT' | 'ENG' | 'VERIFY';
}
```

- [x] **Step 5: Run the test and typecheck** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): PD primitives (Hill, competitive antagonism, acidosis, response surface, β blunting) and the library row type" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 11: Combination rules → `DrugEffect` + `DrugBus`

**Files:**
- Create: `packages/engine-core/src/l2/pk/combine.ts`, `packages/engine-core/test/l2/pk/combine.test.ts`

**Interfaces (Consumes):** `DrugEffect` from `../circ/drugs.ts` (7a), `DrugBus`/`DRUG_BUS_NEUTRAL` (Task 1), Task 10.
**Interfaces (Produces):** `Active { row; c: number }` (c = the PD concentration in the row's unit),
`PdContext { ph; betaBlockC; vasoResp; ageY; macBrain }`, `combine(actives, ctx): { fx: DrugEffect; betaBlockAdd:
number; bus: DrugBus }` (the bus's `agents`, `volatiles` and `doses` are left EMPTY here — Task 15 fills them),
`NEUTRAL_FX`.

Rules (decision 6/7): per target, drugs of the SAME class add in potency units u = c/EC50 (Loewe) before one Hill
with that class's largest |Emax|; classes MULTIPLY (1 + E₁)(1 + E₂)… for the multiplier targets and ADD for `v0Frac`;
β-flagged effects use EC50 shifted by the total β-blocker occupancy (antagonist Ce + chronic `betaBlockC`);
catecholamine effects × `acidosisFactor(pH)` × `vasoResp`; occupancy targets (`betaBlock`, `avNode`) combine as
1 − Π(1 − o). R51 §2: NO NMB, depth or drive PD here — 7f computes those from the per-agent Ce (no drive values, no
NMB EC50 multiplier); the class antagonists' EC50 multipliers go on `bus.antagonist` for 7f. The propofol hypnotic C50 carries
the Eleveld age term (R51 addendum 11).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/combine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { combine, NEUTRAL_FX, type PdContext } from '../../../src/l2/pk/combine.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const base = { amountUnit: 'mcg', doses: '', onset: '', ir: '?', src: 'test', tag: 'ENG' } as const;
const PHE: DrugRow = { ...base, id: 'phe', name: 'phe', cls: 'alpha1', pk: { kind: 'gamma', refDose: 1, perKg: false, tpS: 60, t10S: 600 }, pd: [{ target: 'svr', emax: 1, ec50: 0.25, catecholamine: true }] };
const NE: DrugRow = { ...base, id: 'ne', name: 'ne', cls: 'alpha1', pk: PHE.pk, pd: [{ target: 'svr', emax: 1.5, ec50: 0.15, catecholamine: true }] };
const DOBU: DrugRow = { ...base, id: 'dobu', name: 'dobu', cls: 'betaAgonist', pk: PHE.pk, pd: [{ target: 'ees', emax: 0.8, ec50: 7, beta: true, catecholamine: true }] };
const ESMO: DrugRow = { ...base, id: 'esmo', name: 'esmo', cls: 'betaBlocker', pk: PHE.pk, pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 100 }] };
const PROP: DrugRow = { ...base, id: 'propofol', name: 'prop', cls: 'hypnotic', pk: PHE.pk, pd: [{ target: 'svr', emax: -0.45, ec50: 3.5 }], cns: { hypC50: 3.08, hypC50AgeK: 0.00635 } };
const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 35, macBrain: 0 };

describe('combination rules', () => {
  it('nothing active → neutral', () => {
    const r = combine([], CTX);
    expect(r.fx).toEqual(NEUTRAL_FX);
    expect(r.bus.antagonist).toEqual({ opioid: 1, benzodiazepine: 1 });
  });
  it('same class adds in potency units (Loewe): phe at EC50 + NE at EC50 = one drug at 2·EC50 with the larger Emax', () => {
    const r = combine([{ row: PHE, c: 0.25 }, { row: NE, c: 0.15 }], CTX);
    expect(r.fx.svr).toBeCloseTo(1 + (1.5 * 2) / 3, 9);
  });
  it('different classes multiply', () => {
    const a = combine([{ row: PHE, c: 0.25 }], CTX).fx.svr;
    const b = combine([{ row: PROP, c: 3.5 }], CTX).fx.svr;
    expect(combine([{ row: PHE, c: 0.25 }, { row: PROP, c: 3.5 }], CTX).fx.svr).toBeCloseTo(a * b, 9);
  });
  it('β-blocker occupancy competes with a β-agonist; acidosis blunts catecholamines', () => {
    const free = combine([{ row: DOBU, c: 7 }], CTX).fx.ees;
    const blocked = combine([{ row: DOBU, c: 7 }, { row: ESMO, c: 1e6 }], CTX).fx.ees;
    expect(blocked - 1).toBeLessThan((free - 1) * 0.2);
    const acid = combine([{ row: PHE, c: 0.25 }], { ...CTX, ph: 7.2 }).fx.svr;
    expect(acid - 1).toBeCloseTo(0.5 * 0.5, 9);
  });
  it('naloxone competitively antagonises opioids: remifentanil-equivalent falls; the EC50 multiplier is on the bus for 7f', () => {
    const REMI: DrugRow = { ...base, id: 'remi', name: 'remi', cls: 'opioid', pk: PHE.pk, pd: [], cns: { remiEq: 1 } };
    const NAL: DrugRow = { ...base, id: 'nal', name: 'nal', cls: 'opioidAntagonist', pk: PHE.pk, pd: [], antagonises: { cls: 'opioid', ec50: 1, emax: 0.98 } };
    const on = combine([{ row: REMI, c: 3 }], CTX).bus;
    const rev = combine([{ row: REMI, c: 3 }, { row: NAL, c: 2 }], CTX).bus;
    expect(rev.cns.opioidCeRemiEq).toBeLessThan(on.cns.opioidCeRemiEq / 2);
    expect(rev.antagonist.opioid).toBeCloseTo(on.cns.opioidCeRemiEq / rev.cns.opioidCeRemiEq, 9);
    expect(rev.antagonist.benzodiazepine).toBe(1);
  });
  it('the bus carries CNS potency units; the propofol C50 falls with age (Eleveld, R51 addendum 11)', () => {
    const r = combine([{ row: PROP, c: 3.08 }], CTX);
    expect(r.bus.cns.propCe).toBeCloseTo(3.08, 9);
    expect(r.bus.cns.uHyp).toBeCloseTo(1, 9);
    const old = combine([{ row: PROP, c: 3.08 }], { ...CTX, ageY: 75 });
    expect(old.bus.cns.uHyp).toBeCloseTo(Math.exp(0.00635 * 40), 9); // Ce50 2.39 at 75 y → uHyp 1.29
  });
  it('R51 §2: no drive or NMB PD on the bus; agents/volatiles/doses are left for the pipeline', () => {
    const r = combine([{ row: PROP, c: 3 }], CTX).bus;
    expect('resp' in r).toBe(false);
    expect(r.nmb).toEqual({ achGain: 1 });
    expect(r.agents).toEqual({});
    expect(r.doses).toEqual([]);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/combine.ts`**

```ts
// Combination of every active drug's concentration into the engine inputs (Stage 7g decisions 6–7). R51 §2: the
// circulation PD is 7g's; NMB, depth-index, MAC-awake and ventilatory-drive PD are 7f's (it reads bus.agents).
import type { DrugEffect } from '../circ/drugs.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../types-pk.ts';
import { acidosisFactor, competitiveEc50, hill, responseSurface } from './pd.ts';
import type { DrugRow, PdTarget } from './row.ts';

export interface Active {
  row: DrugRow;
  c: number; // PD concentration (row units): brain/effect-site Ce, rate-equivalent, or the gamma curve
}

export interface PdContext {
  ph: number;
  betaBlockC: number; // chronic β-blockade from the 7a profile (0–1)
  vasoResp: number; // sepsis catecholamine responsiveness (7f/§5e), 1 = normal
  ageY: number;
  macBrain: number; // total age-adjusted MAC fraction (volatile model)
}

export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1 };
const FX_TARGETS = ['hr', 'ees', 'svr', 'pvr', 'gv', 'gvHr'] as const;
const OCCUPANCY: readonly PdTarget[] = ['betaBlock', 'avNode'];

/** Remifentanil-equivalent Ce that halves MAC ≈ 1.2 ng/mL (tables §5d [VERIFY]) → uOpioid unit. */
const OPIOID_U1 = 1.2;

export function combine(actives: readonly Active[], ctx: PdContext): { fx: DrugEffect; betaBlockAdd: number; bus: DrugBus } {
  const bus: DrugBus = structuredClone(DRUG_BUS_NEUTRAL);
  // 1. occupancy targets first (β-blockade feeds the β-agonist EC50 shift)
  const occ: Record<string, number> = { betaBlock: 0, avNode: 0 };
  for (const a of actives)
    for (const e of a.row.pd)
      if (OCCUPANCY.includes(e.target)) occ[e.target] = 1 - (1 - (occ[e.target] as number)) * (1 - Math.max(0, hill(a.c, e.ec50, e.emax, e.hill ?? 1)));
  const betaOcc = 1 - (1 - (occ.betaBlock as number)) * (1 - ctx.betaBlockC);
  // competitive class antagonists (naloxone, flumazenil): every member's concentration is divided by 1 + o/(1 − o)
  const antag = new Map<string, number>();
  for (const a of actives) {
    const an = a.row.antagonises;
    if (an) antag.set(an.cls, 1 - (1 - (antag.get(an.cls) ?? 0)) * (1 - hill(a.c, an.ec50, an.emax)));
  }
  const conc = (a: Active) => a.c / (competitiveEc50(1, antag.get(a.row.cls) ?? 0));
  bus.antagonist = { opioid: competitiveEc50(1, antag.get('opioid') ?? 0), benzodiazepine: competitiveEc50(1, antag.get('benzodiazepine') ?? 0) };
  // 2. per target, per class: Loewe sum of potency units
  const byKey = new Map<string, { u: number; emax: number; hill: number; cat: boolean; lin: boolean }>();
  for (const a of actives)
    for (const e of a.row.pd) {
      if (OCCUPANCY.includes(e.target)) continue;
      const ec50 = e.beta ? competitiveEc50(e.ec50, betaOcc) : e.ec50;
      // one group per target, class and SIGN: epinephrine's β2 dilation and α constriction are separate mechanisms
      const key = `${e.target}|${a.row.cls}|${Math.sign(e.emax)}`;
      const g = byKey.get(key) ?? { u: 0, emax: 0, hill: e.hill ?? 1, cat: false, lin: e.linear === true };
      g.u += Math.max(0, conc(a)) / ec50;
      if (Math.abs(e.emax) > Math.abs(g.emax)) g.emax = e.emax;
      g.cat ||= e.catecholamine === true;
      byKey.set(key, g);
    }
  const fx: DrugEffect = { ...NEUTRAL_FX };
  const other: Record<string, number> = {};
  for (const [key, g] of byKey) {
    const target = key.split('|')[0] as PdTarget;
    let E = g.lin ? Math.max(-3 * Math.abs(g.emax), Math.min(3 * Math.abs(g.emax), g.emax * g.u)) : hill(g.u, 1, g.emax, g.hill);
    if (g.cat) E *= acidosisFactor(ctx.ph) * ctx.vasoResp;
    if ((FX_TARGETS as readonly string[]).includes(target)) {
      const k = target as (typeof FX_TARGETS)[number];
      fx[k] *= Math.max(0.05, 1 + E);
    } else if (target === 'v0Frac') fx.v0Frac += E;
    else other[target] = (other[target] ?? 0) + E;
  }
  // 3. the CNS summaries (7d, demo); 7f computes its own PD from the per-agent Ce the pipeline adds (Task 15)
  let remiEq = 0;
  let midazEq = 0;
  for (const a of actives) {
    const r = a.row;
    const c = conc(a);
    // Eleveld Ce50 age term (tables §5d; R51 addendum 11): C50(age) = C50(35)·e^(−k(age − 35))
    const hypC50 = r.cns?.hypC50 !== undefined ? r.cns.hypC50 * Math.exp(-(r.cns.hypC50AgeK ?? 0) * (ctx.ageY - 35)) : undefined;
    if (r.cls === 'hypnotic' && r.id === 'propofol') bus.cns.propCe = a.c;
    if (hypC50 !== undefined) bus.cns.uHyp += a.c / hypC50;
    if (r.cns?.remiEq) remiEq += c * r.cns.remiEq;
    if (r.cns?.midazEq) midazEq += c * r.cns.midazEq;
    if (r.id === 'dantrolene') bus.metabolic.dantroleneE = hill(a.c, 1, 1);
    if (r.cls === 'ketamine') bus.cns.ketamineCe = a.c;
    if (r.cls === 'alpha2') bus.cns.dexmedCe = a.c;
    if (r.cns?.cmro2) bus.cns.cmro2Mult *= 1 - hill(a.c / (hypC50 ?? 1), 1, r.cns.cmro2);
  }
  bus.cns.opioidCeRemiEq = remiEq;
  bus.cns.benzoCeMidazEq = midazEq;
  bus.cns.macBrain = ctx.macBrain;
  bus.cns.uOpioid = remiEq / OPIOID_U1;
  bus.cns.uSurface = responseSurface(bus.cns.uHyp + ctx.macBrain, bus.cns.uOpioid);
  bus.nmb.achGain = 1 + Math.max(0, other.achGain ?? 0);
  bus.airway.bronchodilation = Math.min(1, Math.max(0, other.bronchodilation ?? 0));
  bus.airway.histamine = Math.min(1, Math.max(0, other.histamine ?? 0));
  bus.hpvInhibit = Math.min(1, Math.max(0, other.hpvInhibit ?? 0));
  bus.metabolic.kShift = other.kShift ?? 0;
  bus.metabolic.glucoseDelta = other.glucose ?? 0;
  bus.cns.cbfVaso *= 1 + (other.cbfVaso ?? 0);
  bus.avNodeBlock = occ.avNode as number;
  return { fx, betaBlockAdd: occ.betaBlock as number, bus };
}
```

- [x] **Step 4: Run the test and typecheck** → PASS (7 tests).
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): combination rules — Loewe within class, multiplicative across, β competition, acidosis, antagonist multipliers, CNS summaries (R51: no NMB/drive PD)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 12: Drug library I — hypnotics, opioids, benzodiazepines, volatiles (DATA)

**Files:**
- Create: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, `packages/engine-core/src/l2/pk/data/drugs.ts`, `packages/engine-core/test/l2/pk/library.test.ts`

**Interfaces (Produces):** `ANAESTHETIC_ROWS: DrugRow[]`; `DRUGS: Record<string, DrugRow>`, `drugRow(id)`, `DRUG_IDS`
(Task 13/14 add their arrays to `drugs.ts`).

Conventions (binding for all three library tasks): for `gamma` rows the PD concentration is in REFERENCE-DOSE units, so
an effect "X at the reference dose" is written `emax: 2·X, ec50: 1` (a Hill of 1 gives X at c = 1). For `volatile`
rows the concentration is the agent's own brain MAC fraction and effects are `linear` per MAC (tables §6.3). For
`perKg … rateEq` rows EC50s are in µg/kg/min (decision 4). Every row: `ir: '?'` (Q for Ali), `src`, `tag`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/library.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DRUGS, DRUG_IDS } from '../../../src/l2/pk/data/drugs.ts';

describe('drug library', () => {
  it('every row is complete: source, tag, Iranian-availability question, doses, onset, a PK spec', () => {
    for (const id of DRUG_IDS) {
      const r = DRUGS[id]!;
      expect(r.id).toBe(id);
      expect(r.src.length).toBeGreaterThan(3);
      expect(['P', 'TXT', 'ENG', 'VERIFY']).toContain(r.tag);
      expect(r.ir).toBe('?');
      expect(r.doses.length).toBeGreaterThan(0);
      expect(r.onset.length).toBeGreaterThan(0);
      for (const e of r.pd) {
        expect(Number.isFinite(e.emax)).toBe(true);
        expect(e.ec50).toBeGreaterThan(0);
      }
    }
  });
  it('Task 12 rows exist', () => {
    for (const id of ['propofol', 'ketamine', 'etomidate', 'thiopental', 'midazolam', 'dexmedetomidine', 'fentanyl', 'remifentanil', 'sufentanil', 'morphine', 'sevoflurane', 'isoflurane', 'desflurane', 'n2o'])
      expect(DRUGS[id], id).toBeDefined();
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`**

```ts
// Drug library I (Stage 7g Task 12): hypnotics, opioids, benzodiazepines, α2 agonist, volatiles. DATA only.
// Sources: tables §6.1/§6.3 (T6.x), research 03 §8.6 (R03), Miller 10e (M10 ch. N p. M), labels, papers as named.
import { FENTANYL_KE0, SUFENTANIL_KE0 } from '../models.ts';
import { ELEVELD_CE50_AGE_K } from '../pd.ts';
import type { DrugRow } from '../row.ts';

/**
 * Opioid haemodynamic EC50s [ENG]: tables §6.3 give only the size (HR −10–20 %, SVR −5–15 %) with no concentration.
 * Each EC50 is the typical clinical Ce (remifentanil 3 ng/mL), scaled by the tables' §5d potency (fentanyl 1.6×
 * → 2 ng/mL; sufentanil 12× [ENG, Q59] → 0.25), so a usual dose gives half of Emax −0.25/−0.15: HR −12.5 %,
 * SVR −7.5 % — mid-band of T6.3. Calibration items for Ali (R44); no primary source.
 */
const OPIOID_HEMO_SRC = 'haemodynamic EC50 [ENG]: typical clinical Ce ÷ T5d potency, sized to T6.3';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number, tauOnS?: number, tauOffS?: number): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: tauOnS ?? 300, tauOffS: tauOffS ?? 600 } : {}),
});

export const ANAESTHETIC_ROWS: DrugRow[] = [
  {
    id: 'propofol', name: 'Propofol', cls: 'hypnotic', amountUnit: 'mg', pk: { kind: 'model', model: 'eleveld' },
    elim: { hepatic: 0.6, highExtraction: true },
    // T6.3: E = Ce/(Ce + 3.5): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); gvHr −0.7 (7a fit, Cullen 1987) — refitted in Task 20
    pd: [
      { target: 'svr', emax: -0.45, ec50: 3.5 }, { target: 'ees', emax: -0.2, ec50: 3.5 }, { target: 'v0Frac', emax: 0.08, ec50: 3.5 },
      { target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
    ],
    cns: { hypC50: 3.08, hypC50AgeK: ELEVELD_CE50_AGE_K, cmro2: 0.5 }, syringePerMl: 10, // T5d Ce50 3.08·e^(−0.00635(age − 35))
    doses: 'induction 1.5–2.5 mg/kg (ED50 LOC 1–1.5, M10 ch. 21 p. 516); TCI Ce 2–5 µg/mL; infusion 4–12 mg/kg/h',
    onset: 'TTPE 90–100 s (M10 ch. 21 p. 515); MAP −25–40 % after 2–2.5 mg/kg (p. 519)',
    ir: '?', src: 'Eleveld 2018 (PK; BIS Ce50 3.08 with the age term, T5d/Q53); T6.3; M10 ch. 21', tag: 'P',
  },
  {
    id: 'ketamine', name: 'Ketamine', cls: 'ketamine', amountUnit: 'mg', pk: gammaPk(1.5, true, 60, 900, 0.01, 300, 900),
    elim: { hepatic: 0.9 },
    pd: [{ target: 'hr', emax: 0.35, ec50: 1 }, { target: 'svr', emax: 0.4, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
    doses: 'induction 1–2 mg/kg IV (M10 ch. 21 p. 536); analgesia 0.1–0.3 mg/kg; infusion 0.1–0.5 mg/kg/h',
    onset: 'onset 30–60 s, duration 10–15 min (R03 §8.6); plasma 0.7–2.2 µg/mL for hypnosis (M10 p. 536)',
    ir: '?', src: 'T6.3 (HR +15–20 %, SVR +15–25 % sympathetic; direct Ees ×0.9); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'etomidate', name: 'Etomidate', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(0.3, true, 60, 480),
    elim: { hepatic: 0.8 },
    pd: [{ target: 'svr', emax: -0.1, ec50: 1 }],
    cns: { hypC50: 1, cmro2: 0.4 },
    doses: 'induction 0.2–0.3 mg/kg (M10 ch. 21 p. 541)', onset: 'onset 30–60 s, duration 3–5 min; cortisol response ×0.5 for 24 h (T6.3)',
    ir: '?', src: 'T6.3 (MAP −0–10 %); M10 ch. 21 Table 21.1', tag: 'TXT',
  },
  {
    id: 'thiopental', name: 'Thiopental', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(4, true, 45, 900),
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }, { target: 'ees', emax: -0.3, ec50: 1 }, { target: 'hr', emax: 0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.16, ec50: 1 }, { target: 'gv', emax: -0.8, ec50: 1 }],
    cns: { hypC50: 1, cmro2: 0.55 },
    doses: 'induction 3–5 mg/kg', onset: 'onset 30 s, awakening 5–10 min (redistribution); t½ 7–17 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (SVR −20 %, Ees −15 %, HR +10–15 %, V0 +8 %, reflex ×0.6)', tag: 'TXT',
  },
  {
    id: 'midazolam', name: 'Midazolam', cls: 'benzodiazepine', amountUnit: 'mg', pk: gammaPk(0.05, true, 180, 3600, 0.001, 600, 1800),
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.06, ec50: 1 }, { target: 'gv', emax: -0.4, ec50: 1 }],
    cns: { midazEq: 1, hypC50: 4 },
    doses: 'sedation 0.02–0.05 mg/kg; induction 0.05–0.15 mg/kg (M10 ch. 21 Table 21.7)', onset: 'T½ke0 2–3 min (M10 ch. 21 p. 532); peak 3–5 min; duration 30–60 min',
    ir: '?', src: 'T6.3 (SVR −10–15 %, V0 +3 %, reflex ×0.8); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'dexmedetomidine', name: 'Dexmedetomidine', cls: 'alpha2', amountUnit: 'mcg', pk: gammaPk(1, true, 900, 7200, 0.5 / 60, 900, 1800),
    elim: { hepatic: 1 },
    pd: [{ target: 'hr', emax: -0.3, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: 'load 1 µg/kg over 10 min, then 0.2–0.7 µg/kg/h', onset: 'peak 15 min after the load; t½ 2–3 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (HR −10–20 %, SVR −10–20 % after the biphasic load; the transient rise of a fast load is not modelled in v1)', tag: 'TXT',
  },
  {
    // vent site: tables give no fentanyl ventilatory ke0 → the brain ke0 [ENG] (deviations list)
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 2 }, { target: 'svr', emax: -0.15, ec50: 2 }, { target: 'v0Frac', emax: 0.03, ec50: 2 }],
    cns: { remiEq: 1.6 }, syringePerMl: 50,
    doses: '1–3 µg/kg analgesia; 5–10 µg/kg blunting; plasma 15–30 ng/mL as sole agent (M10 ch. 22 Table 22.7)',
    onset: 'TTPE 3.6 min; CSHT rises steeply (M10 ch. 22 p. 588)',
    ir: '?', src: `Shafer 1990 PK; ke0 by TTPE (decision 2); T5d potency 1.6× remifentanil; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    // vent site ke0 0.92/min: Bouillon 2003 ventilatory ke0 (T5d "ke0 for CO2 0.92/min") [P]; R51 §2
    id: 'remifentanil', name: 'Remifentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'minto', ventKe0: 0.92 },
    pd: [{ target: 'hr', emax: -0.25, ec50: 3 }, { target: 'svr', emax: -0.15, ec50: 3 }, { target: 'v0Frac', emax: 0.03, ec50: 3 }],
    cns: { remiEq: 1 }, syringePerMl: 50,
    doses: '0.05–0.5 µg/kg/min; TCI Ce 2–8 ng/mL; bolus 0.5–1 µg/kg', onset: 'TTPE ≈ 1.4–1.6 min; CSHT ≈ 3 min, context-independent',
    ir: '?', src: `Minto 1997; Bouillon 2003 (ventilation C50 0.92, ke0 0.92); Kapila 1995; ${OPIOID_HEMO_SRC}`, tag: 'P',
  },
  {
    id: 'sufentanil', name: 'Sufentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'gepts', ventKe0: SUFENTANIL_KE0 }, // vent = brain ke0 [ENG]
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 0.25 }, { target: 'svr', emax: -0.15, ec50: 0.25 }],
    cns: { remiEq: 12 }, syringePerMl: 5,
    doses: '0.1–0.5 µg/kg; plasma 5–10 ng/mL as sole agent (M10 Table 22.7)', onset: 'TTPE 5.6 min (Shafer & Varvel 1991)',
    ir: '?', src: `Gepts 1995 PK [VERIFY]; potency ×12 remifentanil [ENG, Q59]; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    id: 'morphine', name: 'Morphine', cls: 'opioid', amountUnit: 'mg', pk: gammaPk(0.1, true, 1200, 14400),
    elim: { hepatic: 0.9, renal: 0.1 },
    pd: [{ target: 'svr', emax: -0.2, ec50: 1 }, { target: 'histamine', emax: 0.6, ec50: 1 }],
    cns: { remiEq: 1.5 },
    doses: '0.05–0.15 mg/kg IV', onset: 'peak 15–30 min, duration 3–4 h (R03 §8.6); CL 15–30 mL/kg/min (M10 Table 22.6)',
    ir: '?', src: 'R03 §8.6; M10 ch. 22; remi-equivalent [ENG]', tag: 'TXT',
  },
  {
    id: 'sevoflurane', name: 'Sevoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'sevoflurane' },
    pd: [
      { target: 'svr', emax: -0.2, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true },
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.2, ec50: 1, linear: true }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 1.80 % at 40 y (Mapleson; label 2.1, Q52); maintenance 0.8–1.3 MAC', onset: 'FA/FI 0.85 at 30 min (Yasuda 1991); b/g 0.65 (M10 ch. 19 p. 427)',
    ir: '?', src: 'T6.3 (Malan 1995); T5d', tag: 'P',
  },
  {
    id: 'isoflurane', name: 'Isoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'isoflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.4, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 1.17 % at 40 y', onset: 'FA/FI 0.73 at 30 min; b/g 1.46', ir: '?', src: 'T6.3; Mapleson 1996; M10 ch. 19 p. 427', tag: 'TXT',
  },
  {
    id: 'desflurane', name: 'Desflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'desflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 6.6 % at 40 y', onset: 'FA/FI 0.90 at 30 min; sympathetic surge on a rapid rise above 1 MAC (Task 15)', ir: '?', src: 'T6.3; Mapleson 1996', tag: 'TXT',
  },
  {
    id: 'n2o', name: 'Nitrous oxide', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'n2o' },
    pd: [{ target: 'svr', emax: 0.1, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'pvr', emax: 0.4, ec50: 1, linear: true }],
    doses: '50–70 % of the fresh gas; MAC 104 %', onset: 'FA/FI > 0.9 within 10–30 min; expands closed gas spaces', ir: '?', src: 'T6.3 (per 0.5 MAC: SVR ×1.05, Ees ×0.95, PVR ×1.1–1.3)', tag: 'VERIFY',
  },
];
```

- [x] **Step 4: Create `packages/engine-core/src/l2/pk/data/drugs.ts`** (Tasks 13–14 add two imports and two spreads)

```ts
// THE drug library (Stage 7g): every v1 drug as data. Rows live in three files by family; this is the index.
import type { DrugRow } from '../row.ts';
import { ANAESTHETIC_ROWS } from './rows-anaesthetic.ts';

const ALL: DrugRow[] = [...ANAESTHETIC_ROWS];

export const DRUGS: Record<string, DrugRow> = Object.fromEntries(ALL.map((r) => [r.id, r]));
export const DRUG_IDS: readonly string[] = ALL.map((r) => r.id);
export const drugRow = (id: string): DrugRow | undefined => DRUGS[id];
```

- [x] **Step 5: Run the test and typecheck** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): drug library I — hypnotics, opioids, benzodiazepines, α2, volatiles (data, sourced)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 13: Drug library II — NMB and reversal, anticholinergics, vasoactives, β-blockers, antiarrhythmics (DATA)

**Files:**
- Create: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`
- Modify: `packages/engine-core/src/l2/pk/data/drugs.ts`, `packages/engine-core/test/l2/pk/library.test.ts`

The vasoactive `perKg` sets: phenylephrine is the PROTOTYPED set (decision 4). The others were NOT prototyped: their
PK is chosen from the label half-lives (k10 = ln2/t½ with V1 from the label or ≈ plasma volume) and ke0 from the
tables' τ on; Task 22's dose–response tests are the calibration — if a band fails, tune ONLY `ke0` and the EC50 within
×0.5–×2 of the value below, record it as `[ENG, fitted …]`, and stop to report if that is not enough (R45).

- [x] **Step 1: Extend the test** — append to `library.test.ts`:

```ts
describe('library II', () => {
  it('Task 13 rows exist', () => {
    for (const id of ['rocuronium', 'vecuronium', 'cisatracurium', 'succinylcholine', 'sugammadex', 'neostigmine', 'glycopyrrolate', 'atropine', 'phenylephrine', 'ephedrine', 'norepinephrine', 'epinephrine', 'vasopressin', 'dobutamine', 'milrinone', 'dopamine', 'nitroglycerin', 'hydralazine', 'esmolol', 'labetalol', 'metoprolol', 'amiodarone', 'adenosine'])
      expect(DRUGS[id], id).toBeDefined();
  });
  it('catecholamines are flagged for acidosis; vasopressin and milrinone are not (T6.2)', () => {
    expect(DRUGS.norepinephrine!.pd.every((e) => e.catecholamine)).toBe(true);
    expect(DRUGS.vasopressin!.pd.some((e) => e.catecholamine)).toBe(false);
    expect(DRUGS.milrinone!.pd.some((e) => e.catecholamine || e.beta)).toBe(false);
  });
});
```

- [x] **Step 2: Run it** → FAIL (rows missing).

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`**

```ts
// Drug library II (Stage 7g Task 13). DATA only. T6.x = tables §6.x; R03 = research 03 §8.6; M10 = Miller 10e.
import type { DrugRow } from '../row.ts';
import { CISATRACURIUM, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, VECURONIUM } from '../nmb.ts';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number): DrugRow['pk'] => ({ kind: 'gamma', refDose, perKg, tpS, t10S });
const vaso = (v1: number, cl1: number, ke0: number, v2 = 0, cl2 = 0): DrugRow['pk'] => ({ kind: 'perKg', conc: 'rateEq', pk: { v1, v2, v3: 0, cl1, cl2, cl3: 0, ke0: [ke0] } });

export const CARDIOVASCULAR_ROWS: DrugRow[] = [
  // --- neuromuscular (7f owns the block PD; these rows publish Ce on the bus) ---
  { id: 'rocuronium', name: 'Rocuronium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'rocuronium' }, elim: { hepatic: 0.7, renal: 0.3 }, pd: [],
    doses: '0.6 mg/kg (2×ED95 0.305, M10 ch. 24 Table 24.3); RSI 1.2 mg/kg', onset: '0.6: max block 1.8 min, duration 31 min; 1.2: 1.0 / 67 (label)', ir: '?', src: `Roc label; Plaud 1995; ${ROCURONIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'vecuronium', name: 'Vecuronium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'vecuronium' }, elim: { hepatic: 0.6, renal: 0.4 }, pd: [],
    doses: '0.1 mg/kg (ED95 0.043)', onset: 'max block 3–5 min, duration 25–30 min (label; M10 Table 24.5 41–44)', ir: '?', src: `Vec label; ${VECURONIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'cisatracurium', name: 'Cisatracurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'cisatracurium' }, pd: [],
    doses: '0.15–0.2 mg/kg (ED95 0.04)', onset: 'max block 2–3 min, duration ≈ 45 min; Hofmann elimination (T5d, Q50)', ir: '?', src: `Cis label; ${CISATRACURIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'succinylcholine', name: 'Succinylcholine', cls: 'depolariser', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'succinylcholine' }, pd: [], shared: 'blood',
    doses: '1–1.5 mg/kg (ED95 0.51–0.63, M10 ch. 24 p. 677)', onset: 'block ≈ 1 min; T1 10 % 7.1 min, 90 % 10.9 (label); K +0.5 (7c)', ir: '?', src: `Sux label; Lee 2009; ${SUCCINYLCHOLINE.cl1} L/kg/min`, tag: 'P' },
  { id: 'sugammadex', name: 'Sugammadex', cls: 'nmbReversal', amountUnit: 'mg', pk: { kind: 'nmb', agent: 'sugammadex' }, elim: { renal: 1 }, pd: [],
    doses: '2 mg/kg at T2; 4 mg/kg at 1–2 PTC; 16 mg/kg immediate (M10 ch. 24 pp. 728–731)', onset: 'TOFR 0.9 in 2.2 / 2.7 min; 16 mg/kg T1 10 % in 1.2 min (label)', ir: '?', src: `Sgx label; V ${SUGAMMADEX.v1} L/kg`, tag: 'P' },
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5 },
    pd: [{ target: 'achGain', emax: 3, ec50: 1 }, { target: 'hr', emax: -0.5, ec50: 1 }],
    doses: '0.03–0.07 mg/kg, max 5 mg (with glycopyrrolate 0.2 mg per 1 mg)', onset: 'onset 1–3 min, peak ≈ 10 min; ceiling from TOF < 2 (7f; M10 ch. 24 p. 716)', ir: '?', src: 'Neo label; BJAEd 2020; T5d', tag: 'P' },
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800),
    pd: [{ target: 'hr', emax: 0.3, ec50: 1 }], doses: '0.2–0.4 mg', onset: 'onset 2–3 min, duration 2–4 h; HR +10–20', ir: '?', src: 'T6.2; brief §4.9', tag: 'TXT' },
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 60, 5400),
    pd: [{ target: 'hr', emax: 0.6, ec50: 1 }], doses: '0.5–1 mg (child 0.02 mg/kg); arrest per ALS', onset: 'onset < 1 min, duration 30–60 min; HR +20–40 scaled by vagal tone (T6.2)', ir: '?', src: 'T6.2; R03 §8.6', tag: 'TXT' },
  // --- vasoactives (decision 4: rate-equivalent Ce, EC50 µg/kg/min) ---
  { id: 'phenylephrine', name: 'Phenylephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.04, 0.035, 1.2),
    pd: [{ target: 'svr', emax: 1, ec50: 0.25, catecholamine: true }, { target: 'pvr', emax: 0.15, ec50: 0.25, catecholamine: true }, { target: 'v0Frac', emax: -0.045, ec50: 0.25, catecholamine: true }],
    syringePerMl: 100, doses: 'bolus 50–100 µg (label 40–100); infusion 10–35 µg/min (≈ 0.15–0.5 µg/kg/min); obstetric ED90 0.54 µg/kg/min',
    onset: 'bolus onset 30–60 s, peak 1–2 min, 5–10 min; infusion steady in ≈ 5 min', ir: '?', src: 'Phe label; Hengstmann 1982 (CL ≈ 2.1 L/min); T6.2 (Emax +100 %); EC50 0.25 [ENG, D1]', tag: 'ENG' },
  { id: 'ephedrine', name: 'Ephedrine', cls: 'mixedAdrenergic', amountUnit: 'mg', pk: gammaPk(10, false, 270, 3600), tachyphylaxis: 0.7,
    pd: [{ target: 'hr', emax: 0.24, ec50: 1, beta: true, catecholamine: true }, { target: 'ees', emax: 0.36, ec50: 1, beta: true, catecholamine: true }, { target: 'svr', emax: 0.24, ec50: 1, catecholamine: true }, { target: 'v0Frac', emax: -0.06, ec50: 1 }],
    doses: '5–10 mg (label 5–25)', onset: 'onset ≈ 1 min, peak 4–5 min, ≈ 60 min; each repeat ×0.7 (tachyphylaxis)', ir: '?', src: 'Eph label; T6.2', tag: 'ENG' },
  { id: 'norepinephrine', name: 'Norepinephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.1, 0.03, 1.0),
    pd: [{ target: 'svr', emax: 1.5, ec50: 0.15, catecholamine: true }, { target: 'ees', emax: 0.25, ec50: 0.1, beta: true, catecholamine: true }, { target: 'v0Frac', emax: -0.1, ec50: 0.15, catecholamine: true }, { target: 'pvr', emax: 0.2, ec50: 0.15, catecholamine: true }],
    syringePerMl: 64, doses: 'ICU 0.05–0.5 µg/kg/min; label start 8–12 µg/min, maintain 2–4', onset: 'onset 1–2 min, offset 2–3 min (t½ 2–2.5 min)', ir: '?', src: 'NE label; T6.2', tag: 'ENG' },
  { id: 'epinephrine', name: 'Epinephrine', cls: 'mixedAdrenergic', amountUnit: 'mcg', pk: vaso(0.1, 0.05, 1.0),
    pd: [
      { target: 'hr', emax: 0.5, ec50: 0.05, beta: true, catecholamine: true }, { target: 'ees', emax: 0.6, ec50: 0.04, beta: true, catecholamine: true },
      { target: 'svr', emax: -0.1, ec50: 0.02, beta: true, catecholamine: true }, { target: 'svr', emax: 1.2, ec50: 0.2, catecholamine: true },
      { target: 'v0Frac', emax: -0.05, ec50: 0.1, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.05 }, { target: 'kShift', emax: -0.5, ec50: 0.1 }, { target: 'glucose', emax: 40, ec50: 0.1 },
    ],
    syringePerMl: 16, doses: 'infusion 0.01–0.05 (β) / > 0.1 µg/kg/min (α); push-dose 10–20 µg; anaphylaxis 50–100 µg; arrest 1 mg', onset: 'onset 1 min, offset 2–3 min', ir: '?', src: 'Epi label; T6.2; T5e', tag: 'ENG' },
  { id: 'vasopressin', name: 'Vasopressin', cls: 'vasopressin', amountUnit: 'units', pk: vaso(0.14, 0.01, 0.2),
    pd: [{ target: 'svr', emax: 0.8, ec50: 0.00057 }], syringePerMl: 1,
    doses: '0.01–0.07 U/min (typical 0.03–0.04); rate-eq EC50 = 0.04 U/min in 70 kg', onset: 'onset ≈ 5 min, offset 10–20 min; not blunted by acidosis; spares PVR', ir: '?', src: 'Vaso label; T6.2 (+40 % at 0.04 U/min, Emax +80 %)', tag: 'ENG' },
  { id: 'dobutamine', name: 'Dobutamine', cls: 'betaAgonist', amountUnit: 'mcg', pk: vaso(0.2, 0.07, 0.35),
    pd: [{ target: 'ees', emax: 0.8, ec50: 7, beta: true, catecholamine: true }, { target: 'hr', emax: 0.25, ec50: 10, beta: true, catecholamine: true }, { target: 'svr', emax: -0.3, ec50: 10, beta: true, catecholamine: true }, { target: 'pvr', emax: -0.2, ec50: 10, beta: true, catecholamine: true }],
    syringePerMl: 2000, doses: '2–20 µg/kg/min', onset: 'onset 2 min, offset 2–5 min (t½ 2 min)', ir: '?', src: 'Dobu label (SBP +10–20, HR +5–15); T6.2', tag: 'ENG' },
  { id: 'milrinone', name: 'Milrinone', cls: 'pde3', amountUnit: 'mcg', pk: vaso(0.38, 0.0022, 0.3), elim: { renal: 0.8 },
    pd: [{ target: 'ees', emax: 0.6, ec50: 0.5 }, { target: 'svr', emax: -0.6, ec50: 0.7, hill: 1.5 }, { target: 'hr', emax: 0.1, ec50: 0.5 }, { target: 'v0Frac', emax: 0.1, ec50: 0.5 }, { target: 'pvr', emax: -0.5, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.3, ec50: 0.5 }],
    syringePerMl: 200, doses: 'load 50 µg/kg over 10 min, then 0.375–0.75 µg/kg/min', onset: 't½ 2.3–2.4 h (CKD ×2–3); SVR −17/−21/−37 % at 0.375/0.5/0.75 (label)', ir: '?', src: 'Mil label; T6.2', tag: 'P' },
  { id: 'dopamine', name: 'Dopamine', cls: 'mixedAdrenergic', amountUnit: 'mcg', pk: vaso(0.2, 0.06, 0.35),
    pd: [{ target: 'hr', emax: 0.35, ec50: 8, beta: true, catecholamine: true }, { target: 'ees', emax: 0.4, ec50: 5, beta: true, catecholamine: true }, { target: 'svr', emax: 0.6, ec50: 15, hill: 2, catecholamine: true }],
    syringePerMl: 1600, doses: '2–20 µg/kg/min', onset: 'onset 2 min, offset 5 min', ir: '?', src: 'T6.2 [TXT], Q59', tag: 'TXT' },
  { id: 'nitroglycerin', name: 'Nitroglycerin', cls: 'vasodilator', amountUnit: 'mcg', pk: vaso(0.05, 0.2, 0.5),
    pd: [{ target: 'v0Frac', emax: 0.25, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'pvr', emax: -0.4, ec50: 1 }, { target: 'hpvInhibit', emax: 1, ec50: 1 }],
    syringePerMl: 200, doses: 'infusion 10–200 µg/min (≈ 0.15–3 µg/kg/min); bolus 50–100 µg; SL 400 µg', onset: 'onset 1–2 min, offset 5–10 min; venous > arterial', ir: '?', src: 'NTG label; T6.2 (V +10–15 % at 1 µg/kg/min, SVR ×0.85, PVR ×0.8)', tag: 'ENG' },
  { id: 'hydralazine', name: 'Hydralazine', cls: 'vasodilator', amountUnit: 'mg', pk: gammaPk(10, false, 900, 14400),
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }], doses: '5–20 mg IV', onset: 'onset 5–20 min, peak 10–20 min, 2–4 h; reflex tachycardia emerges', ir: '?', src: 'label [TXT]', tag: 'TXT' },
  // --- β-blockers and antiarrhythmics ---
  // β-receptor OCCUPANCY (`betaBlock` Emax/EC50) is [ENG] for all three: no source gives occupancy vs dose. Sized so a
  // usual dose blocks about half the receptors (esmolol 100 µg/kg/min → 0.45; labetalol 10 mg and metoprolol 2.5 mg
  // at their peak → 0.3 / 0.35); the occupancy enters decision 7's β-agonist EC50 shift and Task 17's betaBlockAdd.
  // Esmolol 2-cmt set: label CL 285 mL/kg/min, Vss 3.4 L/kg, distribution t½ 2 min, elimination t½ 9 min → the
  // unique V1 2.71, V2 0.69 L/kg, Q 0.175 L/kg/min (closed form: λ1 = ln2/2, λ2 = ln2/9 per min) [P-derived];
  // ke0 0.7 [ENG]. HR −10 % per 100 µg/kg/min, Emax −35 % (T6.2) → hr EC50 250 rate-eq.
  { id: 'esmolol', name: 'Esmolol', cls: 'betaBlocker', amountUnit: 'mcg', pk: { kind: 'perKg', conc: 'rateEq', pk: { v1: 2.71, v2: 0.69, v3: 0, cl1: 0.285, cl2: 0.175, cl3: 0, ke0: [0.7] } },
    pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 250 }, { target: 'ees', emax: -0.2, ec50: 250 }],
    syringePerMl: 10000, doses: 'load 0.5 mg/kg over 1 min (peri-op 1 mg/kg over 30 s); 50–300 µg/kg/min', onset: 'distribution t½ 2 min, elimination t½ 9 min (label; the PK set reproduces both)', ir: '?', src: 'Esmolol label (CL 285 mL/kg/min, Vss 3.4 L/kg, t½ 2/9 min); T6.2; β occupancy [ENG]', tag: 'ENG' },
  { id: 'labetalol', name: 'Labetalol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(10, false, 300, 14400),
    pd: [{ target: 'betaBlock', emax: 0.6, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }],
    doses: '5–20 mg IV, repeat', onset: 'onset 2–5 min, peak ≈ 5 min, 2–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  { id: 'metoprolol', name: 'Metoprolol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(2.5, false, 1200, 21600),
    pd: [{ target: 'betaBlock', emax: 0.7, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }],
    doses: '1–5 mg IV', onset: 'onset 2–5 min, peak 20 min (tpS 1200), 3–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  { id: 'amiodarone', name: 'Amiodarone', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(150, false, 600, 7200),
    pd: [{ target: 'hr', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'avNode', emax: 0.3, ec50: 1 }],
    doses: '150 mg over 10 min; arrest 300 mg then 150 mg', onset: 'acute effects over 10–60 min; QTc +20–40 ms [ENG]; raises AF→sinus conversion (Stage 5 hook, Task 16)', ir: '?', src: 'T6.2 antiarrhythmic paragraph', tag: 'TXT' },
  { id: 'adenosine', name: 'Adenosine', cls: 'adenosine', amountUnit: 'mg', pk: gammaPk(6 / 70, true, 15, 30),
    pd: [{ target: 'avNode', emax: 1, ec50: 0.42, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: '6 mg rapid push + flush, then 12 mg (central line: half)', onset: 'AV block 3–10 s, 10–30 s after the push (R03 §8.6; brief §4.9); plasma t½ < 10 s', ir: '?', src: 'R03 §8.6; decision 11 (E 0.85 at 6 mg / 70 kg, 0.59 at 3 mg, 0.96 at 12 mg)', tag: 'ENG' },
];
```

- [x] **Step 4: Register the rows** — in `data/drugs.ts` add `import { CARDIOVASCULAR_ROWS } from './rows-cardiovascular.ts';` and
  change `const ALL: DrugRow[] = [...ANAESTHETIC_ROWS];` to `const ALL: DrugRow[] = [...ANAESTHETIC_ROWS, ...CARDIOVASCULAR_ROWS];`.
- [x] **Step 5: Run the test and typecheck** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): drug library II — NMB/reversal, anticholinergics, vasoactives, β-blockers, antiarrhythmics" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 14: Drug library III — electrolytes/metabolic (7c-shared), local anaesthetics and lipid, antagonists, placeholders (DATA)

**Files:**
- Create: `packages/engine-core/src/l2/pk/data/rows-other.ts`
- Modify: `packages/engine-core/src/l2/pk/data/drugs.ts`, `packages/engine-core/test/l2/pk/library.test.ts`

- [x] **Step 1: Extend the test** — add `import { LAST_THRESHOLDS } from '../../../src/l2/pk/data/rows-other.ts';` to the
  imports at the top of `library.test.ts`, then append:

```ts
describe('library III', () => {
  it('Task 14 rows exist; the library has ≥ 55 rows', () => {
    for (const id of ['calciumChloride', 'calciumGluconate', 'sodiumBicarbonate', 'magnesium', 'insulinDextrose', 'salbutamol', 'insulin', 'dextrose', 'dantrolene', 'furosemide', 'mannitol', 'hypertonicSaline', 'tranexamicAcid', 'naloxone', 'flumazenil', 'ondansetron', 'dexamethasone', 'lidocaine', 'bupivacaine', 'ropivacaine', 'lipidEmulsion'])
      expect(DRUGS[id], id).toBeDefined();
    expect(DRUG_IDS.length).toBeGreaterThanOrEqual(55);
  });
  it('7c-owned chemistry rows are shared or blood-only (decision 10)', () => {
    for (const id of ['calciumChloride', 'calciumGluconate', 'sodiumBicarbonate', 'insulinDextrose'])
      expect(DRUGS[id]!.pk.kind).toBe('blood');
    expect(DRUGS.magnesium!.shared).toBe('blood');
    expect(DRUGS.succinylcholine!.shared).toBe('blood');
  });
  it('LAST thresholds: bupivacaine is the most cardiotoxic (lowest CV threshold)', () => {
    expect(LAST_THRESHOLDS.bupivacaine!.cv).toBeLessThan(LAST_THRESHOLDS.ropivacaine!.cv);
    expect(LAST_THRESHOLDS.ropivacaine!.cv).toBeLessThan(LAST_THRESHOLDS.lidocaine!.cv);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/data/rows-other.ts`**

```ts
// Drug library III (Stage 7g Task 14). DATA only.
import type { DrugRow } from '../row.ts';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: 120, tauOffS: 900 } : {}),
});
const blood: DrugRow['pk'] = { kind: 'blood' };
const LA = (v1: number, v2: number, cl1: number, cl2: number): DrugRow['pk'] => ({ kind: 'perKg', conc: 'plain', pk: { v1, v2, v3: 0, cl1, cl2, cl3: 0, ke0: [1] } });

/**
 * Total plasma concentration (µg/mL) at which CNS symptoms start (`cns`, E = 0.5 of the CNS Hill), seizures
 * (`seizure`) and cardiovascular collapse (`cv`, E_cv = 0.5) [TXT: ASRA 2020 practice advisory; Stoelting 8e;
 * Q-7g-2 for Ali]. Acidosis/hypercapnia raise the free fraction (M10 ch. 25 p. 761) — applied in Task 16.
 */
export const LAST_THRESHOLDS: Record<string, { cns: number; seizure: number; cv: number }> = {
  lidocaine: { cns: 5, seizure: 10, cv: 20 },
  bupivacaine: { cns: 1.6, seizure: 3, cv: 4 },
  ropivacaine: { cns: 2.2, seizure: 4, cv: 6 },
};

export const OTHER_ROWS: DrugRow[] = [
  // --- chemistry owned by 7c (decision 10): 7g lists them; the blood module acts ---
  { id: 'calciumChloride', name: 'Calcium chloride 10 %', cls: 'electrolyte', amountUnit: 'mg', pk: blood, pd: [], doses: '10 mg/kg (0.5–1 g) — 13.6 mEq Ca per g', onset: 'iCa ↑ in 1–3 min (7c)', ir: '?', src: '7c plan decision 8', tag: 'TXT' },
  { id: 'calciumGluconate', name: 'Calcium gluconate 10 %', cls: 'electrolyte', amountUnit: 'mg', pk: blood, pd: [], doses: '30 mg/kg (1–3 g) — 4.65 mEq Ca per g', onset: 'as chloride, one third of the calcium per gram (7c)', ir: '?', src: '7c plan decision 8', tag: 'TXT' },
  { id: 'sodiumBicarbonate', name: 'Sodium bicarbonate 8.4 %', cls: 'electrolyte', amountUnit: 'mmol', pk: blood, pd: [], doses: '1 mmol/kg (1 mL/kg of 8.4 %)', onset: 'pH ↑ at once; EtCO2 +5 mmHg at 90 s (7c decision 14)', ir: '?', src: '7c plan decision 14', tag: 'TXT' },
  { id: 'insulinDextrose', name: 'Insulin + dextrose', cls: 'metabolic', amountUnit: 'units', pk: blood, pd: [], doses: '10 U insulin + 25 g dextrose', onset: 'K −0.6 to −1.0 mmol/L at 60 min (7c)', ir: '?', src: '7c plan decision 7', tag: 'TXT' },
  { id: 'magnesium', name: 'Magnesium sulfate', cls: 'electrolyte', amountUnit: 'mg', shared: 'blood', elim: { renal: 1 },
    pk: { kind: 'perKg', conc: 'plain', pk: { v1: 0.3, v2: 0, v3: 0, cl1: 0.0015, cl2: 0, cl3: 0, ke0: [0.5] } },
    pd: [{ target: 'svr', emax: -0.3, ec50: 60 }],
    doses: '2 g over 1–2 min (TdP); 40–50 mg/kg (analgesia, bronchospasm); concentration = rise over baseline, mg/L', onset: 'TdP termination within minutes; vecuronium ED50 −25 % after 40 mg/kg (M10 ch. 24 p. 698)', ir: '?', src: 'T6.2; M10 ch. 24', tag: 'TXT' },
  { id: 'salbutamol', name: 'Salbutamol (IV/neb)', cls: 'betaAgonist', amountUnit: 'mcg', shared: 'blood', pk: gammaPk(250, false, 600, 7200),
    pd: [{ target: 'hr', emax: 0.3, ec50: 1, beta: true, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'kShift', emax: -0.8, ec50: 1 }],
    doses: '250 µg IV slowly; 10–20 mg nebulised for K', onset: 'K −1.4 at full effect (7c); HR +10–20 %', ir: '?', src: '7c decision 7; [TXT]', tag: 'TXT' },
  { id: 'insulin', name: 'Insulin (regular)', cls: 'metabolic', amountUnit: 'units', pk: gammaPk(10, false, 1800, 14400, 0.1 / 60),
    pd: [{ target: 'glucose', emax: -120, ec50: 1 }, { target: 'kShift', emax: -1.2, ec50: 1 }], doses: '10 U bolus; 0.05–0.1 U/kg/h', onset: 'IV onset 5–15 min, peak 30–60, 2–4 h (7e owns glucose)', ir: '?', src: '[TXT] placeholder for 7e', tag: 'TXT' },
  { id: 'dextrose', name: 'Dextrose 50 %', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(25000, false, 120, 3600),
    pd: [{ target: 'glucose', emax: 300, ec50: 1 }], doses: '25 g (50 mL of 50 %)', onset: 'glucose ↑ at once, back over 30–60 min (7e owns glucose)', ir: '?', src: '[TXT] placeholder for 7e', tag: 'TXT' },
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    pd: [], doses: '2.5 mg/kg, repeat to 10 mg/kg', onset: 'EtCO2 falls within 5–10 min, HR normal by 15–20 (tables §7 21); bus.metabolic.dantroleneE → 7e/Stage 3 MH', ir: '?', src: 'tables §7 21; M10 ch. on neuromuscular disorders (2.4 mg/kg max twitch depression)', tag: 'TXT' },
  { id: 'furosemide', name: 'Furosemide', cls: 'diuretic', amountUnit: 'mg', pk: gammaPk(20, false, 900, 7200), pd: [{ target: 'v0Frac', emax: 0.06, ec50: 1 }],
    doses: '10–40 mg IV', onset: 'venodilation within 5–15 min (modelled); diuresis 5–30 min (7d owns urine)', ir: '?', src: '[TXT]; 7d plan Task 11', tag: 'TXT' },
  { id: 'mannitol', name: 'Mannitol 20 %', cls: 'osmotic', amountUnit: 'mg', pk: blood, pd: [], doses: '0.25–1 g/kg over 15–20 min', onset: 'ICP −25 % over 15–30 min (7d scenario 19)', ir: '?', src: 'tables §7 19; 7c/7d', tag: 'TXT' },
  { id: 'hypertonicSaline', name: 'Hypertonic saline 3 %/7.5 %', cls: 'osmotic', amountUnit: 'mL', pk: blood, pd: [], doses: '3 %: 2–5 mL/kg; 7.5 %: 250 mL', onset: 'Na ↑ and ICP ↓ over 5–15 min (7c/7d)', ir: '?', src: '[TXT]', tag: 'TXT' },
  // --- antagonists ---
  { id: 'naloxone', name: 'Naloxone', cls: 'opioidAntagonist', amountUnit: 'mg', pk: gammaPk(0.1, false, 120, 3600), pd: [],
    antagonises: { cls: 'opioid', ec50: 0.5, emax: 0.98 },
    doses: '40–100 µg titrated; 0.4 mg for overdose', onset: 'onset 1–2 min; duration 30–90 min — shorter than morphine/fentanyl infusions (renarcotisation)', ir: '?', src: '[TXT]; decision 6', tag: 'TXT' },
  { id: 'flumazenil', name: 'Flumazenil', cls: 'benzoAntagonist', amountUnit: 'mg', pk: gammaPk(0.2, false, 60, 3600), pd: [],
    antagonises: { cls: 'benzodiazepine', ec50: 0.5, emax: 0.98 },
    doses: '0.2 mg, repeat to 1 mg', onset: 'onset 1–2 min, duration 45–60 min (resedation)', ir: '?', src: '[TXT]; decision 6', tag: 'TXT' },
  // --- local anaesthetics (LAST, decision 12) and lipid ---
  { id: 'lidocaine', name: 'Lidocaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.5, 1.0, 0.01, 0.05), elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }],
    doses: 'antiarrhythmic 1–1.5 mg/kg; max 4.5 mg/kg plain / 7 with epinephrine (M10 ch. 25 Table 25.6: 350/500 mg)', onset: 'IV peak 1–2 min; seizures reported from 1.4 mg/kg in IVRA (M10 p. 755)', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'bupivacaine', name: 'Bupivacaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.25, 0.75, 0.008, 0.03), elim: { hepatic: 1 },
    pd: [{ target: 'ees', emax: -0.7, ec50: 4, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 4, hill: 2 }],
    doses: 'max 2.5 mg/kg (175 mg plain / 225 with epinephrine, M10 Table 25.6)', onset: 'intravascular injection: CNS then CV collapse within minutes; resistant VF', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'ropivacaine', name: 'Ropivacaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.25, 0.6, 0.0071, 0.03), elim: { hepatic: 1 },
    pd: [{ target: 'ees', emax: -0.7, ec50: 6, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 6, hill: 2 }],
    doses: 'max 3 mg/kg (200 mg plain / 250 with epinephrine, M10 Table 25.6)', onset: 'as bupivacaine with a higher CV threshold', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'lipidEmulsion', name: 'Lipid emulsion 20 %', cls: 'lipid', amountUnit: 'mL', pk: gammaPk(1.5, true, 60, 1800, 0.25), pd: [],
    doses: '1.5 mL/kg over 1 min, then 0.25 mL/kg/min (ASRA 2020)', onset: 'lipid sink: free LA ↓ up to 50 % [ENG]; M10 p. 762: cardiac bupivacaine −11 % in 3 min', ir: '?', src: 'ASRA 2020; M10 ch. 25 p. 762', tag: 'ENG' },
  // --- placeholders (panel only; no engine effect in v1) ---
  { id: 'tranexamicAcid', name: 'Tranexamic acid', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 10800), pd: [], doses: '1 g over 10 min, then 1 g over 8 h', onset: 'no monitor effect in v1', ir: '?', src: 'placeholder', tag: 'TXT' },
  { id: 'ondansetron', name: 'Ondansetron', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(4, false, 600, 14400), pd: [], doses: '4 mg', onset: 'no monitor effect in v1 (QTc prolongation not modelled)', ir: '?', src: 'placeholder', tag: 'TXT' },
  { id: 'dexamethasone', name: 'Dexamethasone', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(8, false, 3600, 86400), pd: [], doses: '4–8 mg', onset: 'no monitor effect in v1 (glucose ↑ is 7e)', ir: '?', src: 'placeholder', tag: 'TXT' },
];
```

- [x] **Step 4: Register** — in `data/drugs.ts` add `import { OTHER_ROWS } from './rows-other.ts';` and make
  `const ALL: DrugRow[] = [...ANAESTHETIC_ROWS, ...CARDIOVASCULAR_ROWS, ...OTHER_ROWS];`. Also add, once, a duplicate-id
  guard after `ALL`: `if (new Set(ALL.map((r) => r.id)).size !== ALL.length) throw new Error('duplicate drug id in the library');`.
- [x] **Step 5: Run the test and typecheck** → PASS (14 + 23 + 21 = **58 rows**). Commit and push — `git add -A && git commit -m "feat(pk): drug library III — 7c-shared chemistry, LAST thresholds, lipid, antagonists, placeholders (58 rows)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 15: The PK/PD pipeline (state, commands, 10 Hz step, clearance factors, the bus)

**Files:**
- Create: `packages/engine-core/src/l2/pk/pipeline.ts`, `packages/engine-core/test/l2/pk/pipeline.test.ts`

**Interfaces (Consumes):** everything above. **(Produces):** `PK_DT_S = 0.1`, `NEVER`, `DrugInst`, `PkState`, `PkCtx`,
`NEUTRAL_PK_CTX`, `createPkState(patient?)`, `pkPatientOf(profile?)`, `concUnit(row)`, `validatePkCommand(cmd, pk)`
(null = not a drug command / undefined = ok / string = error), `applyPkCommand(pk, cmd, t)` (true for EVERY drug,
infusion, tci and vaporiser command — decision 10, R51 §3; false only for non-drug commands), `advancePk(pk, ctx,
tEnd)` (moves the doses accepted since the last call into `bus.doses`, then steps), `concOf(pk, id)`.

Not prototyped as a whole (its parts are). The unit test drives it WITHOUT the engine so failures localise.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/pipeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, concOf, createPkState, NEUTRAL_PK_CTX, validatePkCommand } from '../../../src/l2/pk/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('PK pipeline', () => {
  it('validates every library drug, 7c-owned ids included (R51 §3); non-drug commands are not its business', () => {
    const pk = createPkState();
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'unobtainium', dose: 1, unit: 'mg', route: 'iv' }), pk)).toMatch(/unknown drug/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'propofol', dose: 1, unit: 'units', route: 'iv' }), pk)).toMatch(/unit/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 1, unit: 'mmol/kg', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand(ev({ kind: 'infusion', drugId: 'calciumChloride', rate: 10, unit: 'mg/min' }), pk)).toMatch(/bolus/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand({ type: 'setMode', mode: 'manual' } as Command, pk)).toBeNull();
  });
  it('a propofol bolus gives Eleveld Ce ≈ 3 µg/mL at ~2.9 min, moves SVR down and is on the bus per agent', () => {
    const pk = createPkState({ ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' });
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }), 0)).toBe(true);
    advancePk(pk, NEUTRAL_PK_CTX, 175);
    expect(concOf(pk, 'propofol')).toBeGreaterThan(2.8);
    expect(pk.fx.svr).toBeLessThan(0.85);
    expect(pk.bus.cns.propCe).toBeGreaterThan(2.8);
    const a = pk.bus.agents.propofol!;
    expect(a.unit).toBe('µg/mL');
    expect(a.brain).toBeCloseTo(concOf(pk, 'propofol'), 12);
    expect(a.plasma).toBeGreaterThan(a.brain * 0.5);
    expect(a.cumulativeMgPerKg).toBeCloseTo(2, 12);
    expect(a.vent).toBeUndefined(); // not an opioid
  });
  it('every drug event is consumed; each bolus is in bus.doses for exactly one pass (7c/7f observe, R51 §3)', () => {
    const pk = createPkState();
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }), 0)).toBe(true);
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }), 0)).toBe(true);
    advancePk(pk, NEUTRAL_PK_CTX, 60);
    expect(pk.bus.doses).toEqual([
      { agent: 'succinylcholine', mgPerKg: 1, amount: 70000, amountUnit: 'mcg', t: 0 },
      { agent: 'calciumChloride', mgPerKg: 1000 / 70, amount: 1000, amountUnit: 'mg', t: 0 },
    ]);
    const sux = pk.bus.agents.succinylcholine!;
    expect(sux.nmj).toBeGreaterThan(0); // thumb and diaphragm published per agent (not max-only)
    expect(sux.dia).toBeGreaterThan(0);
    expect(sux.cumulativeMgPerKg).toBeCloseTo(1, 12);
    advancePk(pk, NEUTRAL_PK_CTX, 61);
    expect(pk.bus.doses).toEqual([]);
  });
  it('opioids carry a SEPARATE ventilatory effect site (remifentanil ke0 0.92 vs brain 0.595, R51 §2)', () => {
    const pk = createPkState({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' });
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 30);
    const a = pk.bus.agents.remifentanil!;
    expect(a.unit).toBe('ng/mL');
    expect(a.vent!).toBeGreaterThan(a.brain * 1.2); // the faster site leads during the rise (fixer prototype 3.98 vs 2.80 ng/mL, ×1.42)
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }), 30);
    advancePk(pk, NEUTRAL_PK_CTX, 90);
    const f = pk.bus.agents.fentanyl!;
    expect(f.vent).toBeCloseTo(f.brain, 12); // tables give no fentanyl ventilatory ke0: vent ke0 = brain ke0 [ENG]
  });
  it('an infusion reaches steady state and dose 0 stops it; TCI holds a target; the vaporiser publishes Fet and MAC per agent', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 900);
    expect(concOf(pk, 'norepinephrine')).toBeCloseTo(0.1, 2); // rate-equivalent → the infusion rate at steady state
    expect(pk.bus.doses).toEqual([]); // rate changes are not bolus doses
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'norepinephrine', dose: 0, unit: 'mcg/kg/min', route: 'iv', infusion: true }), 900);
    advancePk(pk, NEUTRAL_PK_CTX, 1800);
    expect(concOf(pk, 'norepinephrine')).toBeLessThan(0.005);
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 }), 1800);
    advancePk(pk, NEUTRAL_PK_CTX, 2100);
    expect(concOf(pk, 'remifentanil')).toBeCloseTo(3, 1);
    applyPkCommand(pk, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6, n2oFrac: 0.5 }), 2100);
    advancePk(pk, NEUTRAL_PK_CTX, 2700);
    const sevo = pk.bus.volatiles.sevoflurane!;
    const n2o = pk.bus.volatiles.n2o!;
    expect(sevo.macFrac).toBeGreaterThan(0.6); // prototype 0.69 at 10 min (dial 2 %, FGF 6, 7 L circle)
    expect(sevo.fet).toBeGreaterThan(sevo.brain); // brain lags end-tidal during wash-in
    expect(sevo.macAge).toBeCloseTo(1.8, 6); // 40 y
    expect(n2o.macFrac).toBeGreaterThan(0.3); // addendum 9: N2O is a bus volatile too (fixer prototype 0.37)
    expect(pk.bus.cns.macBrain).toBeCloseTo(sevo.macFrac + n2o.macFrac, 12);
  });
  it('sugammadex binds rocuronium in plasma AND at the effect sites: thumb Ce < 0.4× within 3 min (plasma-only 0.62×)', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    const before = pk.bus.agents.rocuronium!.nmj!; // fixer prototype 1858 ng/mL
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg', route: 'iv' }), 1200);
    advancePk(pk, NEUTRAL_PK_CTX, 1380);
    expect(pk.bus.agents.rocuronium!.nmj!).toBeLessThan(before * 0.4); // fixer prototype 510 ng/mL = 0.27×
    expect(pk.bus.agents.rocuronium!.sgxBoundFrac!).toBeGreaterThan(0);
  });
  it('the state is JSON-safe (snapshot) and stepping is on the absolute 0.1 s grid', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 10.05);
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' }), 10.05);
    const copy = JSON.parse(JSON.stringify(pk)); // snapshots travel as JSON: no Infinity/NaN may live in the state
    advancePk(pk, NEUTRAL_PK_CTX, 100);
    advancePk(copy, NEUTRAL_PK_CTX, 100);
    expect(copy.drugs.fentanyl.x).toEqual(pk.drugs.fentanyl!.x);
    expect(copy.drugs.remifentanil.x).toEqual(pk.drugs.remifentanil!.x);
    expect(pk.t).toBeCloseTo(100, 9);
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/pipeline.ts`**

```ts
// Stage 7g pipeline: plain-data drug state stepped at 10 Hz on the absolute grid, commands, clearance factors and
// the PD combination. Outputs: pk.fx (7a DrugEffect), pk.betaBlockAdd, pk.bus (DrugBus — per-agent Ce, volatiles,
// the dose log; R51 §2–3), pk.out (1 Hz `drugs`). 7g consumes EVERY library drug event (decision 10).
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { DRUG_BUS_NEUTRAL, type BusAgent, type BusVolatile, type DoseLogEntry, type DrugBus, type PkClinicalEvent } from '../../types-pk.ts';
import type { DrugEffect } from '../circ/drugs.ts';
import { combine, NEUTRAL_FX, type Active } from './combine.ts';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';
import { DEFAULT_PK_PATIENT, type PkPatient } from './covariates.ts';
import { DRUGS } from './data/drugs.ts';
import { LAST_THRESHOLDS } from './data/rows-other.ts';
import { gammaConc, gammaN, type GammaDose } from './gamma.ts';
import { eleveldPropofol, geptsSufentanil, marshPropofol, mintoRemifentanil, schniderPropofol, shaferFentanyl } from './models.ts';
import { bindSugammadex, bindSugammadexSites, CISATRACURIUM, MW, PCHE_CL_MULT, perKg, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, VECURONIUM } from './nmb.ts';
import { hill, tachy } from './pd.ts';
import type { DrugRow } from './row.ts';
import { tciRate, TCI_DT_S } from './tci.ts';
import { toAmount, toRate } from './units.ts';
import { createVolatile, macForAge, macFraction, stepVolatile, type VolatileAgent, type VolatileState } from './volatile.ts';

export const PK_DT_S = 0.1;
const TACHY_WINDOW_S = 3600;
/** "Never" / "long ago" as finite numbers: snapshots travel as JSON, which turns ±Infinity into null. */
export const NEVER = 1e12;

export interface DrugInst {
  id: string;
  model: string | null; // propofol TCI model choice
  x: number[]; // compartment state (pk/nmb rows); [] for gamma/volatile/blood rows
  factor: number; // clearance factor the params were built with (quantised)
  rate: number; // amount/min
  rateUntil: number; // s (NEVER = until changed)
  tci: { mode: 'plasma' | 'effect'; target: number; maxRate: number; next: number } | null;
  doses: GammaDose[];
  infC: number; // gamma infusion state, reference units
  infTarget: number;
  total: number; // amount given
  bound: number; // amount bound by sugammadex in plasma (rocuronium/vecuronium)
  bolusTimes: number[];
}

export interface PkState {
  t: number;
  patient: PkPatient;
  drugs: Record<string, DrugInst>;
  vap: { agent: VolatileAgent; s: VolatileState; n2o: VolatileState; dialPct: number; n2oFrac: number } | null;
  fx: DrugEffect;
  betaBlockAdd: number;
  bus: DrugBus;
  pending: DoseLogEntry[]; // boluses accepted since the last advancePk call (→ bus.doses, decision 10)
  lastC: Record<string, number>; // last PD concentration per drug (panel, tests, hooks)
  desSurgeT: number; // desflurane sympathetic surge start (−NEVER: none)
  macPrev: number[]; // desflurane MAC over the last 60 s at 1 Hz
  panelNext: number;
  out: EngineEvent[];
}

/** Context gathered by the engine each pass from the other modules (duck-typed; neutral when absent). */
export interface PkCtx {
  coLpm: number; vaLpm: number; frcL: number; tempC: number; ph: number;
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
}
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1 };

export function pkPatientOf(p: PatientProfile | undefined): PkPatient {
  return {
    ageY: p?.ageY ?? DEFAULT_PK_PATIENT.ageY,
    weightKg: p?.weightKg ?? DEFAULT_PK_PATIENT.weightKg,
    heightCm: p?.heightCm ?? DEFAULT_PK_PATIENT.heightCm,
    sex: p?.sex === 'F' ? 'f' : 'm',
  };
}

export function createPkState(patient: PkPatient = DEFAULT_PK_PATIENT): PkState {
  return {
    t: 0, patient, drugs: {}, vap: null, fx: { ...NEUTRAL_FX }, betaBlockAdd: 0, bus: structuredClone(DRUG_BUS_NEUTRAL),
    pending: [], lastC: {}, desSurgeT: -NEVER, macPrev: [], panelNext: 1, out: [],
  };
}

/** The row's concentration unit — the unit of every BusAgent field and of the panel's Ce (R51 §2). */
export function concUnit(row: DrugRow): string {
  if (row.pk.kind === 'gamma') return '× ref dose';
  if (row.pk.kind === 'perKg' && row.pk.conc === 'rateEq') return 'µg/kg/min eq';
  return row.amountUnit === 'mg' ? 'µg/mL' : row.amountUnit === 'mcg' ? 'ng/mL' : `${row.amountUnit}/L`;
}

/** mg/kg of an amount in the row's unit; null for units/mmol/mL rows. */
function mgPerKgOf(row: DrugRow, amount: number, w: number): number | null {
  if (row.amountUnit === 'mg') return amount / w;
  if (row.amountUnit === 'mcg') return amount / 1000 / w;
  return null;
}

// --- parameters -------------------------------------------------------------------------------------------------

const NMB_PK = { rocuronium: ROCURONIUM, vecuronium: VECURONIUM, cisatracurium: CISATRACURIUM, succinylcholine: SUCCINYLCHOLINE, sugammadex: SUGAMMADEX } as const;

function modelParams(pk: PkState, m: string): PkParams {
  const p = pk.patient;
  if (m === 'schnider') return schniderPropofol(p);
  if (m === 'marsh') return marshPropofol(p);
  if (m === 'eleveld') {
    const opioids = Object.values(pk.drugs).some((d) => DRUGS[d.id]?.cls === 'opioid' && d.total > 0);
    return eleveldPropofol(p, { opioids });
  }
  if (m === 'minto') return mintoRemifentanil(p);
  if (m === 'shafer') return shaferFentanyl();
  return geptsSufentanil();
}

function baseParams(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const p = pk.patient;
  switch (row.pk.kind) {
    case 'model': {
      const b = modelParams(pk, inst.model ?? row.pk.model);
      // opioids: a SEPARATE ventilatory effect site after the model's own (R51 §2) → x[4]
      return row.pk.ventKe0 !== undefined ? { ...b, ke0: [...b.ke0, row.pk.ventKe0] } : b;
    }
    case 'perKg':
      return perKg(row.pk.pk, p.weightKg);
    case 'nmb': {
      const pche = row.pk.agent === 'succinylcholine' ? PCHE_CL_MULT[p.pche ?? 'normal'] : 1;
      return perKg(NMB_PK[row.pk.agent], p.weightKg, pche);
    }
    default:
      return null;
  }
}

/** Clearance factor from liver flow/function, kidney and temperature (decision 7), quantised to 1 % (cache hits). */
function clFactor(row: DrugRow, ctx: PkCtx): number {
  const h = row.elim?.hepatic ?? 0;
  const r = row.elim?.renal ?? 0;
  const organ = h * (row.elim?.highExtraction ? ctx.hepFlow : ctx.hepFn) + r * ctx.renal + Math.max(0, 1 - h - r);
  const temp = Math.max(0.5, 1 - 0.05 * Math.max(0, 37 - ctx.tempC)); // [ENG] ≈ −5 %/°C (M10 ch. 24 p. 698 direction)
  return Math.round(organ * temp * 100) / 100;
}

function params(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const b = baseParams(pk, row, inst);
  return b ? { ...b, k10: b.k10 * inst.factor } : null;
}

// --- commands ---------------------------------------------------------------------------------------------------

const PK_KINDS = ['drug', 'infusion', 'tci', 'vaporiser'];

function inst(pk: PkState, id: string): DrugInst {
  let d = pk.drugs[id];
  if (!d) {
    const row = DRUGS[id] as DrugRow;
    const probe: DrugInst = { id, model: null, x: [], factor: 1, rate: 0, rateUntil: NEVER, tci: null, doses: [], infC: 0, infTarget: 0, total: 0, bound: 0, bolusTimes: [] };
    const p = baseParams(pk, row, probe);
    probe.x = p ? zeroState(p) : [];
    d = probe;
    pk.drugs[id] = d;
  }
  return d;
}

export function validatePkCommand(cmd: Command, _pk: PkState): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as { kind: string };
  if (!PK_KINDS.includes(ev.kind)) return null;
  if (ev.kind === 'vaporiser') {
    const v = ev as Extract<PkClinicalEvent, { kind: 'vaporiser' }>;
    if (!['sevoflurane', 'isoflurane', 'desflurane'].includes(v.agent)) return 'agent must be sevoflurane, isoflurane or desflurane';
    if (!(v.dialPct >= 0 && v.dialPct <= 18)) return 'dialPct must be 0–18';
    if (v.fgfLpm !== undefined && !(v.fgfLpm >= 0.2 && v.fgfLpm <= 15)) return 'fgfLpm must be 0.2–15';
    if (v.n2oFrac !== undefined && !(v.n2oFrac >= 0 && v.n2oFrac <= 0.75)) return 'n2oFrac must be 0–0.75';
    return undefined;
  }
  const e = ev as unknown as { drugId: string };
  const row = DRUGS[e.drugId];
  if (!row) return `unknown drug ${e.drugId}`;
  const w = 70;
  if (ev.kind === 'tci') {
    const c = ev as Extract<PkClinicalEvent, { kind: 'tci' }>;
    if (row.pk.kind !== 'model') return `${row.id} has no TCI model`;
    if (c.model !== undefined && !['eleveld', 'schnider', 'marsh', 'minto', 'shafer', 'gepts'].includes(c.model)) return `unknown TCI model ${c.model}`;
    return c.target >= 0 && c.target <= 100 && (c.mode === 'plasma' || c.mode === 'effect') ? undefined : 'target must be 0–100 with mode plasma or effect';
  }
  const bloodBolusOnly = `${row.id} is given as a bolus in v1; 7c owns its kinetics`;
  if (ev.kind === 'infusion') {
    if (row.pk.kind === 'blood') return bloodBolusOnly;
    const c = ev as Extract<PkClinicalEvent, { kind: 'infusion' }>;
    if (!(c.rate >= 0 && Number.isFinite(c.rate))) return 'rate must be ≥ 0';
    const perMl = c.concentration ? toAmount(c.concentration.amount, c.concentration.unit, row.amountUnit, w) : row.syringePerMl;
    const r = toRate(c.rate, c.unit, row.amountUnit, w, typeof perMl === 'number' ? perMl / (c.concentration?.perMl ?? 1) : undefined);
    return typeof r === 'string' ? r : undefined;
  }
  const d = ev as Extract<PkClinicalEvent, { kind: 'drug' }>;
  if (!(Number.isFinite(d.dose) && d.dose >= 0)) return 'dose must be ≥ 0';
  const isRate = d.unit.includes('/min') || d.unit.includes('/h');
  if (row.pk.kind === 'blood' && (isRate || d.infusion)) return bloodBolusOnly;
  if (!isRate && d.dose === 0) return 'dose must be > 0';
  const r = isRate ? toRate(d.dose, d.unit as never, row.amountUnit, w, row.syringePerMl) : toAmount(d.dose, d.unit, row.amountUnit, w, row.syringePerMl);
  return typeof r === 'string' ? r : undefined;
}

/** Apply a validated command. True for every drug/infusion/tci/vaporiser command (7g consumes them all, R51 §3). */
export function applyPkCommand(pk: PkState, cmd: Command, t: number): boolean {
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as PkClinicalEvent;
  if (!PK_KINDS.includes(ev.kind)) return false;
  if (ev.kind === 'vaporiser') {
    pk.vap ??= { agent: ev.agent, s: createVolatile(ev.agent), n2o: createVolatile('n2o'), dialPct: 0, n2oFrac: 0 };
    if (pk.vap.agent !== ev.agent) pk.vap = { ...pk.vap, agent: ev.agent, s: createVolatile(ev.agent) }; // agent change: a new vaporiser; the old agent's residual is dropped in v1 (gate note)
    pk.vap.dialPct = ev.dialPct;
    pk.vap.n2oFrac = ev.n2oFrac ?? pk.vap.n2oFrac;
    pk.vap.s.fd = ev.dialPct / 100;
    pk.vap.n2o.fd = pk.vap.n2oFrac;
    pk.vap.s.fgf = pk.vap.n2o.fgf = ev.fgfLpm ?? pk.vap.s.fgf;
    return true;
  }
  const row = DRUGS[ev.drugId] as DrugRow;
  const d = inst(pk, row.id);
  const w = pk.patient.weightKg;
  const logDose = (amount: number) => pk.pending.push({ agent: row.id, mgPerKg: mgPerKgOf(row, amount, w), amount, amountUnit: row.amountUnit, t });
  if (row.pk.kind === 'blood') {
    // 7c's chemistry (decision 10): validated as a bolus; 7g records and logs it, 7c's mass balance acts on bus.doses
    const e = ev as Extract<PkClinicalEvent, { kind: 'drug' }>;
    const amt = toAmount(e.dose, e.unit, row.amountUnit, w, row.syringePerMl) as number;
    d.total += amt;
    logDose(amt);
    return true;
  }
  const refScale = row.pk.kind === 'gamma' ? row.pk.refDose * (row.pk.perKg ? w : 1) : 1;
  const setRate = (amountPerMin: number) => {
    if (row.pk.kind === 'gamma') d.infTarget = row.pk.refRate ? amountPerMin / (row.pk.refRate * (row.pk.perKg ? w : 1)) : 0;
    else d.rate = amountPerMin;
    d.rateUntil = NEVER;
  };
  if (ev.kind === 'tci') {
    d.tci = ev.target > 0 ? { mode: ev.mode, target: ev.target, maxRate: ((ev.maxRateMlH ?? 1200) * (row.syringePerMl ?? 10)) / 60, next: t } : null;
    if (ev.model) d.model = ev.model;
    if (!d.tci) d.rate = 0;
  } else if (ev.kind === 'infusion') {
    const perMl = ev.concentration ? (toAmount(ev.concentration.amount, ev.concentration.unit, row.amountUnit, w) as number) / ev.concentration.perMl : row.syringePerMl;
    d.tci = null;
    setRate(toRate(ev.rate, ev.unit, row.amountUnit, w, perMl) as number);
  } else {
    const isRate = ev.unit.includes('/min') || ev.unit.includes('/h');
    if (isRate || ev.infusion) {
      d.tci = null;
      setRate(toRate(ev.dose, ev.unit as never, row.amountUnit, w, row.syringePerMl) as number);
    } else {
      const amt = toAmount(ev.dose, ev.unit, row.amountUnit, w, row.syringePerMl) as number;
      logDose(amt);
      if (ev.overS && ev.overS > 0 && row.pk.kind !== 'gamma') {
        d.rate = (amt / ev.overS) * 60; // `total` accrues as the rate runs (stepOnce)
        d.rateUntil = t + ev.overS;
      } else if (row.pk.kind === 'gamma') {
        d.total += amt;
        const recent = d.bolusTimes.filter((b) => t - b < TACHY_WINDOW_S).length;
        d.doses.push({ t, scale: (amt / refScale) * (row.tachyphylaxis ? tachy(recent, row.tachyphylaxis) : 1) });
        d.bolusTimes.push(t);
      } else {
        d.total += amt;
        d.x[0] = (d.x[0] as number) + amt;
      }
    }
  }
  return true;
}

// --- step -------------------------------------------------------------------------------------------------------

export function concOf(pk: PkState, id: string): number {
  return pk.lastC[id] ?? 0;
}

/** PD concentration (brain/effect site), plasma and the extra sites, all in concUnit(row). */
function siteConc(pk: PkState, row: DrugRow, d: DrugInst, p: PkParams | null, t: number): { c: number; plasma: number; vent?: number; nmj?: number; dia?: number } {
  switch (row.pk.kind) {
    case 'model':
      return { c: d.x[3] as number, plasma: p ? cp(p, d.x) : 0, ...(row.pk.ventKe0 !== undefined ? { vent: d.x[4] as number } : {}) };
    case 'perKg': {
      // rateEq: Ce·CL/W (decision 4), plasma in the same unit
      const k = row.pk.conc === 'rateEq' && p ? (p.k10 * p.v1) / pk.patient.weightKg : 1;
      return { c: (d.x[3] as number) * k, plasma: p ? cp(p, d.x) * k : 0 };
    }
    case 'nmb':
      return { c: d.x[3] as number, plasma: p ? cp(p, d.x) : 0, nmj: d.x[3] as number, dia: d.x[4] as number };
    case 'gamma': {
      const c = gammaConc(d.doses, t, row.pk.tpS, gammaN(row.pk.tpS, row.pk.t10S)) + d.infC;
      return { c, plasma: c };
    }
    default:
      return { c: 0, plasma: 0 };
  }
}

function stepOnce(pk: PkState, ctx: PkCtx, t: number): void {
  const actives: Active[] = [];
  let lipid = 0;
  for (const d of Object.values(pk.drugs)) {
    const row = DRUGS[d.id] as DrugRow;
    if (row.pk.kind === 'gamma') {
      const tau = (d.infTarget > d.infC ? row.pk.tauOnS : row.pk.tauOffS) ?? 300;
      d.infC += (d.infTarget - d.infC) * (1 - Math.exp(-PK_DT_S / tau));
      const tpS = row.pk.tpS;
      const n = gammaN(tpS, row.pk.t10S);
      d.doses = d.doses.filter((x) => t - x.t < tpS * (4 + 12 / Math.sqrt(n))); // pruned when < 1e-4 of peak [ENG bound]
    } else if (d.x.length) {
      const f = clFactor(row, ctx);
      if (f !== d.factor) d.factor = f;
      const p = params(pk, row, d) as PkParams;
      if (d.tci && t >= d.tci.next - 1e-9) {
        d.rate = tciRate(p, d.x, d.tci.mode, d.tci.target, d.tci.maxRate);
        d.tci.next = t + TCI_DT_S;
      }
      if (t > d.rateUntil) {
        d.rate = 0;
        d.rateUntil = NEVER;
      }
      d.x = pkStep(pkSystem(p, PK_DT_S), d.x, d.rate);
      d.total += (d.rate * PK_DT_S) / 60;
    }
  }
  // sugammadex: instant 1:1 molar binding in plasma AND at both effect sites (R51 §5; decision 6; Task 5, D7)
  const sgx = pk.drugs.sugammadex;
  if (sgx && sgx.x.length) {
    for (const nmb of ['rocuronium', 'vecuronium'] as const) {
      const d = pk.drugs[nmb];
      if (!d) continue;
      d.bound += bindSugammadex(d.x, sgx.x, MW[nmb]).boundUmol * MW[nmb];
      bindSugammadexSites(d.x, sgx.x, MW[nmb]);
    }
  }
  // volatiles (R51 §2 / addendum 9: every inhaled agent incl. N2O on the bus)
  let macBrain = 0;
  const volatiles: DrugBus['volatiles'] = {};
  if (pk.vap) {
    const env = { vaLpm: ctx.vaLpm, coLpm: ctx.coLpm, frcL: ctx.frcL, weightKg: pk.patient.weightKg };
    stepVolatile(pk.vap.s, env, PK_DT_S);
    stepVolatile(pk.vap.n2o, env, PK_DT_S);
    for (const s of [pk.vap.s, pk.vap.n2o]) {
      const v: BusVolatile = { fet: 100 * s.fa, brain: 100 * s.vrg, macAge: macForAge(s.agent, pk.patient.ageY), macFrac: macFraction(s, pk.patient.ageY) };
      volatiles[s.agent] = v;
      macBrain += v.macFrac;
      actives.push({ row: DRUGS[s.agent] as DrugRow, c: v.macFrac });
      pk.lastC[s.agent] = v.macFrac;
    }
  }
  // concentrations → actives and per-agent bus entries (LAST: free-fraction factor; lipid sink)
  const lip = pk.drugs.lipidEmulsion;
  if (lip) lipid = hill(siteConc(pk, DRUGS.lipidEmulsion as DrugRow, lip, null, t).c, 1, 0.5);
  const freeF = (1 + 2 * Math.max(0, 7.4 - ctx.ph)) * (1 - lipid);
  let cnsE = 0;
  let cvE = 0;
  let seizure = false;
  const agents: Record<string, BusAgent> = {};
  for (const d of Object.values(pk.drugs)) {
    const row = DRUGS[d.id] as DrugRow;
    const p = d.x.length ? params(pk, row, d) : null;
    const sc = siteConc(pk, row, d, p, t);
    let c = sc.c;
    if (row.cls === 'localAnaesthetic') {
      c *= freeF;
      const th = LAST_THRESHOLDS[row.id];
      if (th) {
        cnsE = Math.max(cnsE, hill(c, th.cns, 1, 3));
        cvE = Math.max(cvE, hill(c, th.cv, 1, 3));
        seizure ||= c >= th.seizure;
      }
    }
    pk.lastC[d.id] = c;
    actives.push({ row, c });
    agents[d.id] = {
      unit: concUnit(row), plasma: sc.plasma, brain: c,
      ...(sc.vent !== undefined ? { vent: sc.vent } : {}),
      ...(sc.nmj !== undefined ? { nmj: sc.nmj, dia: sc.dia ?? sc.nmj } : {}),
      cumulativeMgPerKg: mgPerKgOf(row, d.total, pk.patient.weightKg) ?? 0,
      ...(row.id === 'rocuronium' || row.id === 'vecuronium' ? { sgxBoundFrac: d.total > 0 ? Math.min(1, d.bound / d.total) : 0 } : {}),
    };
  }
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain });
  // desflurane sympathetic surge on a rapid rise above 1 MAC (T6.3): HR +25 %, SVR +20 % over 2–4 min [TXT]
  if (pk.vap?.agent === 'desflurane' && Math.abs(t - Math.round(t)) < PK_DT_S / 2) {
    pk.macPrev.push(macBrain);
    if (pk.macPrev.length > 60) pk.macPrev.shift();
    if (macBrain > 1 && macBrain - (pk.macPrev[0] as number) > 0.3 && t - pk.desSurgeT > 600) pk.desSurgeT = t;
  }
  const surge = t - pk.desSurgeT < 240 ? Math.sin((Math.PI * (t - pk.desSurgeT)) / 240) : 0;
  r.fx.hr *= 1 + 0.25 * surge;
  r.fx.svr *= 1 + 0.2 * surge;
  pk.fx = r.fx;
  pk.betaBlockAdd = r.betaBlockAdd;
  r.bus.agents = agents;
  r.bus.volatiles = volatiles;
  r.bus.doses = pk.bus.doses; // this pass's dose log survives every 0.1 s step (advancePk sets it)
  r.bus.last = { cnsE, cvE };
  r.bus.cns.seizure = seizure;
  pk.bus = r.bus;
}

/**
 * Step to tEnd on the absolute grid t_k = k·PK_DT_S. First, the boluses accepted since the previous call become
 * `bus.doses` (and the previous pass's list is dropped): the engine calls this once per advance pass, before every
 * consumer, so each dose is observed exactly once (decision 10, R51 §3).
 */
export function advancePk(pk: PkState, ctx: PkCtx, tEnd: number): void {
  pk.bus.doses = pk.pending;
  pk.pending = [];
  while (pk.t + PK_DT_S <= tEnd + 1e-9) {
    const t = Math.round((pk.t + PK_DT_S) * 10) / 10;
    stepOnce(pk, ctx, t);
    pk.t = t;
  }
}
```

- [x] **Step 4: Run the test and typecheck.** Fix only what the test shows; the likely edges: the NE steady-state
  assertion needs 15 min at k10 0.3/min + ke0 1.0 (τ ≈ 3.3 min → 99 % at 15 min); the sugammadex bound is the fixer
  prototype's 0.27× (band < 0.4×; plasma-only binding gives 0.62× — a failure there means the site binding is not
  running). If the remifentanil `vent > 1.2 × brain` check fails at 30 s, print both values and stop (the ke0s are
  sourced: 0.92 vs 0.595).
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): the PK/PD pipeline — every drug event consumed, dose log, per-agent bus (vent/NMB sites), 10 Hz exact steps, TCI, sugammadex plasma+site binding, volatiles, LAST" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 16: Rhythm hooks — adenosine, LAST, magnesium on torsades (decisions 11–12)

**Files:**
- Create: `packages/engine-core/src/l2/pk/hooks.ts`, `packages/engine-core/test/l2/pk/hooks.test.ts` (the hook state lives in
  the engine's `PipelineState.pkHooks`, Task 17)

**Interfaces (Produces):** `RhythmHookState`, `createHookState()`, `rhythmRequest(pk, hs, current: { id; rateBpm? }, t)` →
`{ id: RhythmId; opts: RhythmOpts } | null` — a PURE decision; the engine applies it with the public `applyRhythm`
(Task 17). Rules:
- **Adenosine** (`bus.avNodeBlock` from the adenosine row, ≥ 0.5 = block): if the rhythm is `svtAvnrt`/`svtAvrt`
  (AV-node dependent) → `avb3Narrow` {atrialRateBpm: 110, rateBpm: 20} while block ≥ 0.5; when it falls below 0.5:
  `sinus` {rateBpm: 95} if the PEAK block of this episode was ≥ 0.8 (6 mg / 70 kg peripheral peaks at 0.85),
  else the original rhythm. `afib`/`aflutter`/`atrialTach`: the same transient `avb3Narrow` (atrial activity revealed)
  and then ALWAYS the original rhythm. Sinus rhythm: `sinusPause` for the block, then `sinus`.
- **LAST** (`bus.last.cvE`): ≥ 0.6 and the rhythm is sinus-group → `sinusBrady` {rateBpm: 40}; ≥ 0.9 → `vfCoarse`
  (bupivacaine-type collapse). The rhythm is never restored automatically (ALS/lipid is the learner's job).
- **Magnesium** on `torsades`: Mg concentration rise ≥ 30 mg/L → `sinus` (tables §6.2: "2 g over 1–2 min terminates TdP").
- A hook fires at most once per episode (`hs.episode` keys) and never while the instructor holds a rhythm pinned
  (`current.pinned`).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/hooks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { createHookState, rhythmRequest } from '../../../src/l2/pk/hooks.ts';
import type { Command } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

function adenosine(doseMg: number, rhythm: string) {
  const pk = createPkState();
  const hs = createHookState();
  applyPkCommand(pk, ev({ kind: 'drug', drugId: 'adenosine', dose: doseMg, unit: 'mg', route: 'iv' }), 0);
  const seen: { t: number; id: string }[] = [];
  let cur = rhythm;
  for (let t = 0.1; t <= 60; t = Math.round((t + 0.1) * 10) / 10) {
    advancePk(pk, NEUTRAL_PK_CTX, t);
    const r = rhythmRequest(pk, hs, { id: cur as never, pinned: false }, t);
    if (r) {
      seen.push({ t, id: r.id });
      cur = r.id;
    }
  }
  return seen;
}

describe('rhythm hooks', () => {
  it('adenosine 6 mg on AVNRT: transient complete block 10–30 s after the push, then sinus', () => {
    const s = adenosine(6, 'svtAvnrt');
    expect(s[0]!.id).toBe('avb3Narrow');
    expect(s[0]!.t).toBeGreaterThan(5);
    expect(s[0]!.t).toBeLessThan(30);
    expect(s[1]!.id).toBe('sinus');
    expect(s[1]!.t - s[0]!.t).toBeGreaterThan(3);
    expect(s[1]!.t - s[0]!.t).toBeLessThan(15);
  });
  it('adenosine 3 mg: block but no conversion (SVT resumes); flutter always resumes', () => {
    const s = adenosine(3, 'svtAvnrt');
    expect(s.at(-1)!.id).toBe('svtAvnrt');
    expect(adenosine(12, 'aflutter').at(-1)!.id).toBe('aflutter');
  });
  it('LAST: bupivacaine 225 mg intravenously → bradycardia, then VF; seizure flag', () => {
    const pk = createPkState();
    const hs = createHookState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'bupivacaine', dose: 225, unit: 'mg', route: 'iv' }), 0);
    const ids: string[] = [];
    let cur = 'sinus';
    for (let t = 1; t <= 180; t++) {
      advancePk(pk, NEUTRAL_PK_CTX, t);
      const r = rhythmRequest(pk, hs, { id: cur as never, pinned: false }, t);
      if (r) ids.push((cur = r.id));
    }
    expect(ids.indexOf('sinusBrady')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('vfCoarse')).toBeGreaterThan(ids.indexOf('sinusBrady'));
    expect(Math.max(...Object.values(pk.lastC))).toBeGreaterThan(3); // above the seizure threshold on the way
  });
});
```

- [x] **Step 2: Run it** → FAIL.

- [x] **Step 3: Create `packages/engine-core/src/l2/pk/hooks.ts`**

```ts
// Drug → rhythm hooks (Stage 7g decisions 11–12). A PURE decision on the pipeline's bus/concentrations; the engine
// applies the request through the rhythm engine's public applyRhythm (Stage 7g never edits l2/ecg/**).
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { concOf, type PkState } from './pipeline.ts';

export interface RhythmHookState {
  aden: { active: boolean; from: string; peak: number };
  lastStage: number; // 0 none, 1 brady, 2 VF
  mgDone: boolean;
}

export const createHookState = (): RhythmHookState => ({ aden: { active: false, from: 'sinus', peak: 0 }, lastStage: 0, mgDone: false });

const NODE_DEPENDENT = ['svtAvnrt', 'svtAvrt'];
const ATRIAL = ['afib', 'aflutter', 'atrialTach', 'mat'];
const SINUS_GROUP = ['sinus', 'sinusBrady', 'sinusTachy', 'sinusArrhythmia'];

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean }, t: number): { id: RhythmId; opts: RhythmOpts } | null {
  void t;
  if (current.pinned) return null;
  const block = pk.bus.avNodeBlock;
  // adenosine
  if (!hs.aden.active && block >= 0.5 && (NODE_DEPENDENT.includes(current.id) || ATRIAL.includes(current.id) || SINUS_GROUP.includes(current.id))) {
    hs.aden = { active: true, from: current.id, peak: block };
    return SINUS_GROUP.includes(current.id) ? { id: 'sinusPause', opts: {} } : { id: 'avb3Narrow', opts: { atrialRateBpm: 110, rateBpm: 20 } };
  }
  if (hs.aden.active) {
    hs.aden.peak = Math.max(hs.aden.peak, block);
    if (block < 0.5) {
      hs.aden.active = false;
      if (NODE_DEPENDENT.includes(hs.aden.from)) return hs.aden.peak >= 0.8 ? { id: 'sinus', opts: { rateBpm: 95 } } : { id: hs.aden.from as RhythmId, opts: {} };
      if (SINUS_GROUP.includes(hs.aden.from)) return { id: 'sinus', opts: {} };
      return { id: hs.aden.from as RhythmId, opts: {} };
    }
    return null;
  }
  // LAST
  const cv = pk.bus.last.cvE;
  if (cv >= 0.9 && hs.lastStage < 2) {
    hs.lastStage = 2;
    return { id: 'vfCoarse', opts: {} };
  }
  if (cv >= 0.6 && hs.lastStage < 1 && SINUS_GROUP.includes(current.id)) {
    hs.lastStage = 1;
    return { id: 'sinusBrady', opts: { rateBpm: 40 } };
  }
  // magnesium on torsades
  if (current.id === 'torsades' && !hs.mgDone && concOf(pk, 'magnesium') >= 30) {
    hs.mgDone = true;
    return { id: 'sinus', opts: {} };
  }
  return null;
}
```

- [x] **Step 4: Run the test.** The adenosine timing comes from the row's gamma (tp 15 s, t10 30 s) and EC50
  0.42 (Hill 2): prototype arithmetic — E_peak 0.85 (6 mg), 0.59 (3 mg), 0.96 (12 mg); block ≥ 0.5 from ≈ 9 s to
  ≈ 22 s for 6 mg. If `s[1] − s[0]` is outside 3–15 s, adjust ONLY `t10S` of the adenosine row within 25–40 s.
  Bupivacaine 225 mg IV in 70 kg (the maximum dose WITH epinephrine given intravascularly): V1 17.5 L → Cp0 12.9
  µg/mL → Ce ≈ 9.5 at ≈ 2 min → E_cv ≈ 0.93 (threshold 4, Hill 3); 150 mg peaks at E_cv ≈ 0.8 (bradycardia only).
- [x] **Step 5: Commit and push** — `git add -A && git commit -m "feat(pk): rhythm hooks — adenosine AV block/conversion, LAST bradycardia→VF, magnesium on torsades" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 17: Engine wiring I — chain, state, 7a circulation, snapshot (declared exception: 7a's drug branch removed)

**Files:**
- Modify: `packages/engine-core/src/engine.ts`, `packages/engine-core/src/l2/circ/model.ts`, `packages/engine-core/src/l2/hemo/pipeline.ts`
- Create: `packages/engine-core/test/engine/pk-wiring.test.ts`, `packages/engine-core/test/helpers/pk.ts`

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/helpers/pk.ts` and `test/engine/pk-wiring.test.ts`:

```ts
// test/helpers/pk.ts
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, PatientProfile } from '../../src/types.ts';
import { cmd } from './hemo.ts';

export const yieldNow = () => new Promise((r) => setImmediate(r));

/** MODELED, ventilated engine; events at times (s); advances minute by minute with a yield (CI rule). */
export async function runPk(patient: PatientProfile, events: [number, Record<string, unknown>][], tEnd: number, seed = 11) {
  const e = createEngine({ seed, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
  const rejected: string[] = [];
  for (const [t, event] of events) {
    const r = e.dispatch(cmd({ type: 'applyEvent', event, atTick: Math.round(t * 50) }));
    if (!r.accepted) rejected.push(r.reason ?? '?');
  }
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(Math.min(t, tEnd));
    await yieldNow();
  }
  const st = (a: number, b: number, k: 'sbp' | 'dbp' | 'hr') => {
    const s = ev.filter((x) => x.type === 'state' && x.t >= a && x.t < b) as Extract<EngineEvent, { type: 'state' }>[];
    return s.reduce((p, q) => p + (q.values[k] ?? 0), 0) / Math.max(1, s.length);
  };
  const map = (a: number, b: number) => st(a, b, 'dbp') + (st(a, b, 'sbp') - st(a, b, 'dbp')) / 3;
  const drugs = ev.filter((x) => x.type === 'drugs') as Extract<EngineEvent, { type: 'drugs' }>[];
  return { e, ev, st, map, drugs, rejected };
}
```

```ts
// test/engine/pk-wiring.test.ts
import { describe, expect, it } from 'vitest';
import { runPk } from '../helpers/pk.ts';

describe('Stage 7g engine wiring', () => {
  it('every library drug id — 7c-owned and shared ids included — is accepted by 7g (R51 §3); unknown ids are rejected', async () => {
    const r = await runPk({}, [
      [1, { kind: 'drug', drugId: 'unobtainium', dose: 1, unit: 'mg', route: 'iv' }],
      [2, { kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }],
      [3, { kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }],
      [4, { kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }],
      [5, { kind: 'drug', drugId: 'epinephrine', dose: 10, unit: 'mcg', route: 'iv' }],
    ], 60);
    expect(r.rejected).toEqual(['unknown drug unobtainium']);
    const pk = (r.e.snapshot().state as { st: { pk: { bus: { agents: Record<string, unknown> } } } }).st.pk;
    expect(Object.keys(pk.bus.agents).sort()).toEqual(['calciumChloride', 'epinephrine', 'remifentanil', 'succinylcholine']);
  }, 120_000);
  it('a pk rhythm request also resets the rhythm clock like the engine paths: adenosine converts AVNRT at 95/min', async () => {
    const { createEngine } = await import('../../src/engine.ts');
    const { cmd } = await import('../helpers/hemo.ts');
    const e = createEngine({ seed: 5 }); // MANUAL: nothing else writes ps.hr
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } }));
    e.advanceTo(90);
    const st = (e.snapshot().state as { st: { rhythm: { id: string }; hr: { to: number } } }).st;
    expect(st.rhythm.id).toBe('sinus');
    expect(st.hr.to).toBe(95); // constantRamp(startRate('sinus', { rateBpm: 95 }))
  }, 120_000);
  it('phenylephrine 100 µg through the NEW path: MAP +15–25 (decision 4 prototype +21.6)', async () => {
    const r = await runPk({}, [[120, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 240);
    const d = Math.max(r.map(150, 160), r.map(170, 180), r.map(190, 200)) - r.map(100, 120);
    expect(d).toBeGreaterThanOrEqual(15);
    expect(d).toBeLessThanOrEqual(25);
  }, 300_000);
  it('snapshot/restore mid-infusion continues identically', async () => {
    const { createEngine } = await import('../../src/engine.ts');
    const { cmd } = await import('../helpers/hemo.ts');
    const a = createEngine({ seed: 5, mode: 'modeled' });
    a.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } }));
    a.advanceTo(120);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 5, mode: 'modeled' });
    b.restore(snap);
    a.advanceTo(300);
    b.advanceTo(300);
    const pa = (a.snapshot().state as { st: { pk: { drugs: Record<string, { x: number[] }> } } }).st.pk.drugs.propofol!.x;
    const pb = (b.snapshot().state as { st: { pk: { drugs: Record<string, { x: number[] }> } } }).st.pk.drugs.propofol!.x;
    expect(pb).toEqual(pa);
  }, 300_000);
});
```

- [x] **Step 2: Run it** → FAIL (drug events still go to 7a; `pk` missing from the snapshot).

- [x] **Step 3: `engine.ts`** — first `git fetch origin && git merge origin/main` (Global Constraints; re-run the
  suite if the merge brought 7b–7f). Additive edits, each marked `// Stage 7g`:
  1. Imports (after the Stage 3 resp import block):
     ```ts
     import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, pkPatientOf, validatePkCommand, type PkCtx, type PkState } from './l2/pk/pipeline.ts'; // Stage 7g
     import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts'; // Stage 7g
     import { circCardiacOutput, type CircModelState } from './l2/circ/model.ts'; // Stage 7g (skip if already imported)
     import { ECG_RATE } from './l2/ecg/generator.ts'; // Stage 7g (skip if already imported)
     ```
  2. `interface PipelineState`: after `resp: RespState; …` add `pk: PkState; // Stage 7g` and `pkHooks: RhythmHookState; // Stage 7g`.
  3. Constructor, in the `this.st = { … }` literal after `resp: createRespState(…), // Stage 3`: `pk: createPkState(pkPatientOf(opts.patient)), // Stage 7g` and `pkHooks: createHookState(), // Stage 7g`.
  4. A private helper in the class:
     ```ts
     /** Stage 7g: the PK/PD context read from the other modules (duck-typed; neutral when a module is absent). */
     private pkCtx(ps: PipelineState): PkCtx {
       const circ = (ps.hemo as { circ?: CircModelState }).circ;
       const resp = ps.resp as unknown as { vaLpm?: number; pat?: { frcGaMl?: number }; temp?: { tc?: number } };
       const blood = (ps as unknown as { blood?: { out?: { hbfRel?: number }; core?: { liver?: number; ab?: { ph?: number } } } }).blood;
       const organs = (ps as unknown as { organs?: { kidney?: { gfrRel?: number } } }).organs;
       const cond = (ps as unknown as { cond?: { vasoResp?: number } }).cond;
       return {
         ...NEUTRAL_PK_CTX,
         coLpm: circ ? circCardiacOutput(circ) : NEUTRAL_PK_CTX.coLpm,
         vaLpm: resp.vaLpm ?? NEUTRAL_PK_CTX.vaLpm,
         frcL: (resp.pat?.frcGaMl ?? 2100) / 1000,
         tempC: resp.temp?.tc ?? 37,
         ph: blood?.core?.ab?.ph ?? 7.4,
         hepFlow: blood?.out?.hbfRel ?? 1,
         hepFn: blood?.core?.liver ?? 1,
         renal: organs?.kidney?.gfrRel ?? 1,
         betaBlockC: circ?.prof.betaBlockC ?? 0,
         vasoResp: cond?.vasoResp ?? 1,
       };
     }
     ```
  5. In `private advance(ps: PipelineState, end: number)` (the method that calls `advanceResp`; it runs for the
     committed state AND the look-ahead clone), BEFORE the `advanceResp(` line — so pk runs before every consumer
     (7f/7d/Stage 3/7c/hemo) in the pass, and `bus.doses` is this pass's list:
     ```ts
     advancePk(ps.pk, this.pkCtx(ps), end / ECG_RATE); // Stage 7g: drugs first, every consumer reads this instant's effects
     const circ7g = (ps.hemo as { circ?: CircModelState }).circ; // Stage 7g
     if (circ7g) {
       circ7g.ext.drug = ps.pk.fx;
       circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
     }
     const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false }, end / ECG_RATE); // Stage 7g
     if (req7g) {
       // exactly as the engine's setRhythm and device paths: the rhythm clock restarts at the new rhythm's rate
       ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
       applyRhythm(ps.rhythm, req7g.id, req7g.opts, end / ECG_RATE, true, rhythmCtx(ps));
     }
     ```
     (`pinned`: if Stage 6a/6b exposes an instructor rhythm pin on `ps`, pass it; there is none on main today. In
     MODELED mode the circulation's `requestHr` overwrites `ps.hr` again on its next control step, as for any
     rhythm change.)
  6. `validate()`: directly after the device validator block (`if (dev !== null) return dev;`) and BEFORE every
     other module's validator (7f neuro, 7d organs, Stage 3 resp, 7c blood, Stage 2 hemo — chain order, R51 §3/§7;
     re-anchor on the device block if main has moved the lines):
     ```ts
     const pkV = validatePkCommand(cmd, this.st.pk); // Stage 7g: every library drug event is 7g's (R51 §3) — an error is final, ok = accepted
     if (pkV !== null) return pkV;
     ```
  7. `apply()`: directly after the device block and BEFORE every other module's handler (same chain order):
     `if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: consumes every drug/infusion/tci/vaporiser event (R51 §3)`
  8. `flush()`: `this.st.pk.out = keep(this.st.pk.out); // Stage 7g`
  9. `restore()`: after `const data = structuredClone(s.state) …`: `data.st.pk ??= createPkState(pkPatientOf(undefined)); data.st.pkHooks ??= createHookState(); // Stage 7g: pre-7g snapshots` (adjust the type of `data` with `as { st: PipelineState … }` as the surrounding code does).

- [x] **Step 4: `l2/circ/model.ts`** (7a) — marked edits:
  - In `CircModelState.ext` add `drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers`
    (import `type DrugEffect` from `./drugs.ts` — it is already imported for `drugEffect`; add the type), and
    `import { betaBlunt } from '../pk/pd.ts'; // Stage 7g` after the `./drugs.ts` import.
  - In `control()`, replace `const de = drugEffect(m.boluses, m.t, m.prof.betaBlockC);` by:
    ```ts
    const de = drugEffect(m.boluses, m.t, m.prof.betaBlockC);
    const d7 = m.ext.drug; // Stage 7g: multipliers from l2/pk (the 7a bolus list stays empty once 7g consumes drug events)
    if (d7) {
      de.hr *= d7.hr; de.ees *= d7.ees; de.svr *= d7.svr; de.v0Frac += d7.v0Frac; de.pvr *= d7.pvr; de.gv *= d7.gv; de.gvHr *= d7.gvHr;
    }
    ```
    and in the `stepBaro(` call (this is the FIRST edit on that line after 7a — R51 §6; 7f re-anchors on the merged
    line, so change only these two properties and do not reformat the call) replace
    `betaBlock: m.prof.betaBlock, betaBlockC: m.prof.betaBlockC` with
    `betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC))`
    (a β-blocker drug blunts the reflex HR arm and the reflex contractility arm).
  - β-blockade blunts 7e's catecholamine surge (R51 addendum 11): in the three lines of `control()` that read
    `(x.endoEesF ?? 1)` (the `m.kLv =` and `m.kRv =` lines) and `(x.endoHrF ?? 1)` (the `const rr =` line), replace
    `(x.endoEesF ?? 1)` with `betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0)` and `(x.endoHrF ?? 1)` with
    `betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0)`, each line marked `// Stage 7g: β-blockade blunts the surge`. With
    no β-blocker drug (`betaBlockAdd` 0) `betaBlunt` returns its input unchanged, so 7a/7e outputs are byte-identical.
    Add to `test/engine/pk-wiring.test.ts` (inside the `describe`; 7a's own bare-model helpers, as
    `test/engine/circ-longrun.test.ts` uses them):
    ```ts
    it('a β-blocker drug blunts 7e’s catecholamine-surge multiplier (R51 addendum 11)', async () => {
      const { createCircModel, RESTING_ENV } = await import('../../src/l2/circ/model.ts');
      const { driver, runTo } = await import('../helpers/circ.ts');
      const hrAfter = (endoHrF: number, betaBlockAdd: number) => {
        const m = createCircModel();
        const dr = driver(m);
        runTo(dr, 10, { ...RESTING_ENV });
        m.ext.endoHrF = endoHrF; // a 7e surge
        m.ext.betaBlockAdd = betaBlockAdd;
        runTo(dr, 70, { ...RESTING_ENV });
        return m.hrModel;
      };
      const rest = hrAfter(1, 0);
      const surge = hrAfter(1.3, 0);
      const blocked = hrAfter(1.3, 0.8);
      expect(surge - rest).toBeGreaterThan(5);
      expect(blocked - rest).toBeLessThan(0.5 * (surge - rest)); // betaBlunt: 1 + 0.3·0.2 = 1.06 plus the reflex arm's blunting
    }, 120_000);
    ```
- [x] **Step 5: `l2/hemo/pipeline.ts`** — declared exception: the pk validator/handler now runs first for every
  drug event, so 7a's `drug` branches are unreachable; delete them (one owner per command):
  - in the imports, delete the whole line `import { DRUGS, type DrugId } from '../circ/drugs.ts'; // Stage 7a`, and in
    the `../circ/model.ts` import line delete `circGiveDrug, ` (keep the other names);
  - delete the line `const DRUG_IDS = Object.keys(DRUGS) as DrugId[]; // Stage 7a`;
  - in `validateHemoCommand`, delete this block (it is the only user of `DRUG_IDS`):
    ```ts
      if (ev.kind === 'drug') {
        const d = cmd.event as { drugId: string; dose: number; unit: string };
        if (!(DRUG_IDS as readonly string[]).includes(d.drugId)) return `drug ${d.drugId} is not implemented until Stage 7g`; // 'not implemented': scenarios keep it scenario-only (6b)
        if (!(Number.isFinite(d.dose) && d.dose > 0)) return 'dose must be > 0';
        return ['mcg', 'mg', 'mcg/kg', 'mg/kg'].includes(d.unit) ? undefined : 'unit must be mcg, mg, mcg/kg or mg/kg';
      }
    ```
    and change the comment line above it from `// Stage 7a: drug, fluid, bleed and circulation conditions act on the
    circulation` to `// Stage 7a: fluid, bleed and circulation conditions act on the circulation (drugs: Stage 7g, l2/pk)`;
  - in `applyHemoCommand`, delete this block (the only user of `DrugId` and `circGiveDrug`):
    ```ts
      if (ev.kind === 'drug') {
        const d = ev as unknown as { drugId: DrugId; dose: number; unit: string };
        const w = hs.circ.weightKg;
        const mg = d.unit === 'mcg' ? d.dose / 1000 : d.unit === 'mg' ? d.dose : d.unit === 'mcg/kg' ? (d.dose * w) / 1000 : d.dose * w;
        circGiveDrug(hs.circ, d.drugId, mg);
        return true;
      }
    ```
  Then `npx -y pnpm@9.15.9 typecheck` must show no unused-import error in `l2/hemo/pipeline.ts`; `circGiveDrug` and
  `DRUGS` stay exported from 7a's files (7a's own unit tests use them).
- [x] **Step 6: Run the test, then the 7a sanity files** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-wiring.test.ts test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts`.
  Expected: pk-wiring PASS. The 7a propofol/AS+CAD tests may move (the propofol curve is now Eleveld Ce-driven):
  Task 20 re-fits them; record the numbers here in the task's commit message and continue.
- [x] **Step 7: Commit and push** — `git add -A && git commit -m "feat(engine): Stage 7g wiring — pk before resp/hemo, DrugEffect into 7a control, rhythm hooks, snapshot; 7a drug branch retired" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 18: Engine wiring II — alveolar ventilation for the volatiles, the bus for 7b/7c/7d/7f (pull model)

**Files:**
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (two marked lines), `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/test/engine/pk-bus.test.ts`

Consumers PULL (R51): 7f, 7b, 7c, 7d read `ps.pk.bus` directly (and 7a reads `ext.drug`, already wired). 7g never
writes into their modules and ships NO shim for 7f: 7f executes after 7g merges and reads `bus.agents`,
`bus.volatiles`, `bus.doses`, `bus.antagonist` and `bus.nmb.achGain` (the Interfaces section). The bus field names in
`types-pk.ts` are the contract; a rename needs an orchestrator ruling, not a local edit.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/engine/pk-bus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { cmd } from '../helpers/hemo.ts';

const stOf = (e: ReturnType<typeof createEngine>) => (e.snapshot().state as { st: { pk: { bus: DrugBus }; resp: { vaLpm?: number } } }).st;

describe('Stage 7g bus', () => {
  it('Stage 3 publishes the alveolar ventilation; the vaporiser raises the MAC fraction with it (per agent, N2O included)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { ageY: 40 } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 4, n2oFrac: 0.5 } }));
    e.advanceTo(900);
    const st = stOf(e);
    expect(st.resp.vaLpm).toBeGreaterThan(3);
    expect(st.pk.bus.volatiles.sevoflurane!.macFrac).toBeGreaterThan(0.8);
    expect(st.pk.bus.volatiles.n2o!.macFrac).toBeGreaterThan(0.3);
    expect(st.pk.bus.cns.macBrain).toBeGreaterThan(1.1);
  }, 300_000);
  it('TCI propofol + remifentanil: per-agent brain Ce on target, a separate remifentanil vent site, the surface exceeds the sum (no drive values: 7f)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled' });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 2 } }));
    e.advanceTo(600);
    const b = stOf(e).pk.bus;
    expect(b.agents.propofol!.brain).toBeCloseTo(2, 1);
    expect(b.agents.remifentanil!.brain).toBeCloseTo(2, 1);
    expect(b.agents.remifentanil!.vent).toBeCloseTo(2, 1); // at steady state both sites equal the plasma
    expect(b.cns.opioidCeRemiEq).toBeCloseTo(2, 1);
    expect(b.cns.uSurface).toBeGreaterThan(2 / 3.08 + 2 / 1.2);
    expect('resp' in b).toBe(false); // R51 §2
  }, 300_000);
});
```

- [x] **Step 2: Run it** → FAIL (`vaLpm` absent).
- [x] **Step 3: `l2/resp/pipeline.ts`** — in `interface RespState` add `vaLpm?: number; // Stage 7g: alveolar ventilation of the last gas step (volatile uptake)`,
  and after the line `const va = alveolarVentilation(d, t, deadSpace(rs));` add `rs.vaLpm = va; // Stage 7g`.
- [x] **Step 4: `index.ts`** — first `git fetch origin && git merge origin/main` if `engine.ts`/`index.ts` moved;
  then export the pipeline types consumers need: `export type { PkState, DrugInst } from './l2/pk/pipeline.ts'; // Stage 7g`
  and `export { DRUGS, DRUG_IDS } from './l2/pk/data/drugs.ts'; // Stage 7g (demo/controller drug pickers)`.
- [x] **Step 5: Run the test** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): alveolar ventilation for volatile uptake; the R51 DrugBus exported for 7b/7c/7d/7f (pull model)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 19: The 1 Hz `drugs` panel event and decrement-from-now

**Files:**
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts`
- Create: `packages/engine-core/test/l2/pk/panel.test.ts`

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/panel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('drugs panel event', () => {
  it('one event per second with Cp/Ce, rate, TCI and a decrement time for running infusions', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }), 0);
    applyPkCommand(pk, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 2 }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 30);
    const d = pk.out.filter((e): e is Extract<EngineEvent, { type: 'drugs' }> => e.type === 'drugs');
    expect(d.length).toBe(30);
    const last = d.at(-1)!;
    const p = last.drugs.find((r) => r.id === 'propofol')!;
    expect(p.unit).toBe('µg/mL');
    expect(p.tci?.target).toBe(3);
    expect(p.cp).toBeGreaterThan(p.ce);
    expect(p.decrement50Min).not.toBeNull();
    expect(last.volatile?.agent).toBe('sevoflurane');
  });
});
```

- [x] **Step 2: Run it** → FAIL.
- [x] **Step 3: Add to `pipeline.ts`** — `import { decrementFromNowMin } from './csht.ts';` and `DrugPanelRow` in the
  existing `../../types-pk.ts` type import (`cp`, `macForAge` and `concUnit` are already there from Task 15), a constant `const DECREMENT_EVERY_S = 10;`, a field `dec: Record<string, number>` in `PkState`
  (initialised `{}` in `createPkState`), and at the END of `stepOnce` (after its last line `pk.bus = r.bus;`):

```ts
  // 1 Hz panel event (decision 13: decrement-from-now every 10 s, off the per-step path)
  if (t + 1e-9 >= pk.panelNext) {
    pk.panelNext = Math.round((pk.panelNext + 1) * 10) / 10;
    const rows: DrugPanelRow[] = [];
    for (const d of Object.values(pk.drugs)) {
      const row = DRUGS[d.id] as DrugRow;
      const p = d.x.length ? params(pk, row, d) : null;
      const unit = concUnit(row); // the same unit as bus.agents (Task 15)
      const running = d.rate > 0 || d.infTarget > 0 || d.tci !== null;
      if (p && running && Math.round(t) % DECREMENT_EVERY_S === 0) pk.dec[d.id] = decrementFromNowMin(p, d.x);
      rows.push({
        id: d.id, name: row.name, unit,
        cp: p ? cp(p, d.x) : pk.lastC[d.id] ?? 0,
        ce: pk.lastC[d.id] ?? 0,
        rate: running ? d.rate : null, rateUnit: running ? `${row.amountUnit}/min` : null,
        tci: d.tci ? { mode: d.tci.mode, target: d.tci.target, model: d.model ?? (row.pk.kind === 'model' ? row.pk.model : '') } : null,
        totalAmount: d.total, amountUnit: row.amountUnit,
        decrement50Min: running && p ? (pk.dec[d.id] ?? decrementFromNowMin(p, d.x)) : null,
      });
    }
    const v = pk.vap;
    pk.out.push({
      type: 'drugs', t, drugs: rows,
      volatile: v ? { agent: v.agent, dialPct: v.dialPct, fgfLpm: v.s.fgf, fi: 100 * v.s.fi, fa: 100 * v.s.fa, brain: 100 * v.s.vrg, macAge: macForAge(v.agent, pk.patient.ageY), macFrac: macBrain, n2oFrac: v.n2oFrac } : null,
      macTotal: macBrain,
    });
  }
```

  (`macBrain` is the local computed earlier in `stepOnce`; `EngineEvent` must include `DrugsEvent` — Task 1.) For
  `perKg` rows `cp` is the plasma concentration in amount/L, while `ce` is in the PD unit — the panel shows both
  with their own labels. Keep the `out` array bounded: the engine's `flush()` drains it (Task 17 step 3.8).
- [x] **Step 4: Run the test** → PASS. Commit and push — `git add -A && git commit -m "feat(pk): 1 Hz drugs panel event with decrement-from-now" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 20: Migration — 7a drug tests through the new engine, propofol re-fit, full suite

**Files:**
- Modify (only if a band fails): `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (propofol `pd` within tables ranges)
- Modify: `packages/controller/test/session/clinical-commands.test.ts:35` (declared exception: the one assertion that
  pinned "drug X is not implemented until Stage 7g"), and any scenario test the grep in Step 1 finds with the same text
- Modify (declared exception, R51 addendum 11): `packages/engine-core/src/l2/circ/drugs.ts` and the one call in
  `packages/engine-core/src/l2/circ/model.ts` — 7a's `propofolAgeFactor` is removed (Step 4)

- [x] **Step 1: Run the 7a acceptance files and every test that dispatches a `drug` event:**
  `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts test/engine/circ-events.test.ts test/l2/circ/drugs.test.ts`
  and `grep -rln "kind: 'drug'\|\"kind\": \"drug\"" packages/*/test packages/controller/scenarios`.
- [x] **Step 2: Required outward behaviour (bands unchanged — R45):** phenylephrine 100 µg MAP +15–25, HR −5 to −16
  at 60 s (7g prototype +21.2 / −14.3); propofol 2 mg/kg MAP ratio at 2 min 0.60–0.80, HR rise < 15; the AS+CAD
  scenario (tables §7 10): MAP 60–65 at 2 min after 1.5 mg/kg in the 75 y profile, rescue with phenylephrine ≥ 85
  within 90 s, ephedrine slower (peak 4–5 min). 7a's `drugs.test.ts` stays as is (it unit-tests the retired curves;
  none of its tests uses the age factor removed in Step 4).
- [x] **Step 3: If the propofol band fails**, re-fit on the Ce model, in this order and only within the tables §6.3
  ranges: (a) the `gvHr` Emax (−0.5 to −0.8), (b) the SVR Emax (−0.35 to −0.55), (c) the EC50 3.5 → 2.5–4.5 µg/mL.
  Note: Eleveld's Ce peaks at 2.9 min (7a's Bateman peaked at ≈ 1.5 min), so the "2 min" MAP reads a rising Ce;
  the elderly deeper fall now comes from the Eleveld age covariates (PK) and the Eleveld Ce50 age term on the
  hypnotic C50 (Task 11) — 7a's `propofolAgeFactor` is dead and goes in Step 4; if scenario 10 falls short, report
  the numbers rather than adding an age factor (R45: mechanism, not a looser test).
  Record the chosen values in the row's `src` with the measured MAP ratio.
- [x] **Step 4: Remove 7a's dead `propofolAgeFactor` (R51 addendum 11).** After Task 17 no event reaches
  `circGiveDrug`, and the Eleveld PK + Ce50 age term carry the elderly sensitivity. In
  `packages/engine-core/src/l2/circ/drugs.ts` delete the doc comment and the function
  `export function propofolAgeFactor(ageY: number): number { … }`; in `bolusScale` replace the signature
  `export function bolusScale(drug: DrugId, doseMg: number, weightKg: number, previous: readonly Bolus[], ageY = 40): number {`
  with `export function bolusScale(drug: DrugId, doseMg: number, weightKg: number, previous: readonly Bolus[]): number {`,
  delete the line `  const age = drug === 'propofol' ? propofolAgeFactor(ageY) : 1;`, and change
  `  return Math.min(2, (dose / row.refDose) * age) * (row.tachyphylaxis ?? 1) ** n;` to
  `  return Math.min(2, dose / row.refDose) * (row.tachyphylaxis ?? 1) ** n; // Stage 7g: age sensitivity lives in the Eleveld models (l2/pk)`.
  In `packages/engine-core/src/l2/circ/model.ts` change
  `bolusScale(drug, doseMg, m.weightKg, m.boluses, m.prof.ageY)` to `bolusScale(drug, doseMg, m.weightKg, m.boluses)`.
  Run `git grep -n propofolAgeFactor` (expect nothing) and
  `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/drugs.test.ts` (expect PASS).
- [x] **Step 5: Scenario and controller tests.** Drugs the engine rejected before 7g (e.g. `adenosine`, `amiodarone`,
  `epinephrine`, `atropine` in `packages/controller/scenarios/*.json`) are now ACCEPTED. In
  `packages/controller/test/session/clinical-commands.test.ts` (line 35 on 7a's head), the test
  `'a plain host forwards applyEvent to the engine, which rejects it as not implemented'` changes to (title and
  assertions only — the send stays):
  ```ts
  it('a plain host forwards applyEvent to the engine, which accepts a library drug (Stage 7g)', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'CLN234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const s = new ControllerSession({ session: 'CLN234', transport: hub.connect() });
    cleanup.push(() => s.close(), () => hs.close());
    await waitFor(() => s.hostOnline);
    const r = await s.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } });
    expect(r.accepted).toBe(true); // Stage 7g: every library drug is modelled (l2/pk)
  });
  ```
  Any other test the Step 1 grep finds asserting `is not implemented until Stage 7g` changes the same way
  (assertion → accepted). The `svt-adenosine` scenario still scripts its own block; with 7g the engine ALSO blocks —
  see Requests (6b drops its scripted step).
- [x] **Step 6: Full suite** — `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`.
  Every earlier test green. Commit and push — `git add -A && git commit -m "test(pk): 7a drug scenarios pass through the PK/PD engine; propofol re-fit on Eleveld Ce; 7a propofolAgeFactor removed" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 21: Acceptance — PK through the engine (Ce curves, TCI, CSHT on the panel)

**Files:** Create `packages/engine-core/test/engine/pk-acceptance-pk.test.ts`

- [x] **Step 1: Write the test** (it must pass on first run if Tasks 1–20 are right; a failure is a wiring bug):

```ts
import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState } from '../../src/l2/pk/compartment.ts';
import { eleveldPropofol, mintoRemifentanil, schniderPropofol } from '../../src/l2/pk/models.ts';
import { runPk } from '../helpers/pk.ts';

describe('7g acceptance — PK through the engine', () => {
  it('Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9 (the engine adds no PK error)', async () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'M' as const };
    const r = await runPk(pat, [[60, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }]], 300);
    const row = r.drugs.find((d) => Math.abs(d.t - 240) < 1e-6)!.drugs.find((x) => x.id === 'propofol')!;
    const p = eleveldPropofol({ ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' });
    const s = pkSystem(p, 0.1);
    let x = zeroState(p);
    x[0] = 140;
    for (let k = 0; k < 1800; k++) x = pkStep(s, x, 0);
    expect(row.ce).toBeCloseTo(x[3]!, 6);
    expect(row.cp).toBeCloseTo(cp(p, x), 6);
  }, 300_000);
  it('TCI induction propofol Ce 4 (Eleveld) + remifentanil Ce 3 (Minto): targets reached in < 3 min and held', async () => {
    const r = await runPk({ ageY: 45, weightKg: 80, heightCm: 178, sex: 'M' }, [
      [10, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4 }],
      [10, { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 }],
    ], 900);
    const at = (t: number, id: string) => r.drugs.find((d) => Math.abs(d.t - t) < 1e-6)!.drugs.find((x) => x.id === id)!.ce;
    expect(at(190, 'propofol')).toBeGreaterThan(3.8);
    expect(at(190, 'remifentanil')).toBeGreaterThan(2.85);
    expect(at(900, 'propofol')).toBeCloseTo(4, 1);
    expect(at(900, 'remifentanil')).toBeCloseTo(3, 1);
  }, 300_000);
  it('Schnider vs Eleveld at the same effect target: Schnider front-loads less drug in minute 1 (53 vs 140 mg at 35 y)', () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
    expect(schniderPropofol(pat).v1).toBeLessThan(eleveldPropofol(pat).v1);
    expect(mintoRemifentanil({ ...pat, ageY: 80 }).ke0[0]).toBeLessThan(mintoRemifentanil(pat).ke0[0]!);
  });
  it('the panel shows a decrement time for a running remifentanil infusion of 2–4 min after 60 min', async () => {
    const r = await runPk({}, [[0, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' }]], 3600);
    const last = r.drugs.at(-1)!.drugs.find((x) => x.id === 'remifentanil')!;
    expect(last.decrement50Min).toBeGreaterThan(1.8);
    expect(last.decrement50Min).toBeLessThan(4);
  }, 600_000);
});
```

- [x] **Step 2: Run it** → PASS. Commit and push — `git add -A && git commit -m "test(pk): acceptance — engine PK equals the models; TCI induction; panel decrement times" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 22: Acceptance — PD: vasopressor dose–response, β/acidosis context, MAC age, reversal, combinations

**Files:** Create `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`; Modify (calibration only) the
library EC50/ke0 per Task 13's rule and, for the reversal bands, `SUGAMMADEX.ke0` in `l2/pk/nmb.ts` (D7).

Bands (ventilated MODELED 70 kg, MAP change at 20 min of infusion vs the 2 min before; the prototype in brackets):
phenylephrine 0.1 / 0.25 / 0.5 / 1.0 µg/kg/min → +8–22 % / +18–32 % / +25–40 % / +30–45 % (16 / 25 / 32 / 37);
norepinephrine 0.05 / 0.1 / 0.2 → +10–25 % / +18–35 % / +25–45 % [ENG, tables §6.2 EC50 0.15; Q60; not prototyped];
dobutamine 5 µg/kg/min → CO +20–40 % (tables §7 16/20), with the `betaBlocked` profile ≤ half of that rise;
phenylephrine 0.5 at pH 7.2 ≤ 60 % of the pH 7.4 SVR rise (PD level always; engine level when 7c is on main);
ephedrine 10 mg ×3 at 10 min intervals: the third dose's SVR increment ≤ 0.6 × the first's (tachyphylaxis 0.7²);
MAC(age): sevo 2 % FGF 6 for 20 min, the 80 y MAC fraction ≥ 1.2 × the 40 y one (MAC 1.40 vs 1.80); naloxone 0.1 mg
at remifentanil Ce 3 ng/mL: remifentanil-equivalent ≥ 30 % lower within 3 min, `bus.antagonist.opioid` ≥ 1.4;
sugammadex (tables §5d): 2 mg/kg at T2 → TOFR 0.9 in 1.5–4 min (label median 2.2; fixer prototype 2.11); 4 mg/kg
at 1–2 PTC (T1 back to ≥ 1 %) → 2.1–4.3 min (label median 2.7, IQR; prototype 2.22); 16 mg/kg 3 min after
rocuronium 1.2 → T1 10 % in 0.6–2.0 min (label 1.2; prototype 1.80) and TOFR 0.9 < 5 min; 0.5 mg/kg at deep block →
TOFR 0.9 not before 10 min (recurarisation teaching; prototype 129.5 min). The NMB/TOFR arithmetic here is 7f's
formula (tables §5d: T1 Hill on the thumb Ce, EC50 823, γ 4.8; TOFR ≈ T1^2.5) used ONLY to test 7g's PK; 7f owns it.

- [x] **Step 1: Write the test** — `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, PatientProfile } from '../../src/types.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../src/l2/pk/pipeline.ts';
import { testT1 } from '../../src/l2/pk/nmb.ts';
import { acidosisFactor } from '../../src/l2/pk/pd.ts';
import { cmd } from '../helpers/hemo.ts';
import { runPk, yieldNow } from '../helpers/pk.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
const inf = (drugId: string, rate: number) => ({ kind: 'infusion', drugId, rate, unit: 'mcg/kg/min' });
/** % MAP change at 20 min of an infusion started at 120 s (1310–1320 s vs 100–120 s). */
async function mapRise(drugId: string, rate: number): Promise<number> {
  const r = await runPk({}, [[120, inf(drugId, rate)]], 1320);
  return 100 * (r.map(1310, 1320) / r.map(100, 120) - 1);
}
function coMean(evs: EngineEvent[], a: number, b: number): number {
  const c = evs.filter((x): x is Extract<EngineEvent, { type: 'circ' }> => x.type === 'circ' && x.t >= a && x.t < b);
  return c.reduce((s, x) => s + x.co, 0) / Math.max(1, c.length);
}
type St = { pk: { bus: DrugBus; fx: { svr: number } }; blood?: { core?: { ab?: { ph?: number } } } };
const stOf = (e: ReturnType<typeof createEngine>) => (e.snapshot().state as { st: St }).st;

describe('7g acceptance — vasopressor dose–response (tables §6.2)', () => {
  const PHE: [number, number, number][] = [[0.1, 8, 22], [0.25, 18, 32], [0.5, 25, 40], [1.0, 30, 45]];
  for (const [rate, lo, hi] of PHE)
    it(`phenylephrine ${rate} µg/kg/min: MAP +${lo}–${hi} % at 20 min`, async () => {
      const d = await mapRise('phenylephrine', rate);
      console.log(`phenylephrine ${rate}: MAP ${d.toFixed(1)} %`);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }, 600_000);
  const NE: [number, number, number][] = [[0.05, 10, 25], [0.1, 18, 35], [0.2, 25, 45]];
  for (const [rate, lo, hi] of NE)
    it(`norepinephrine ${rate} µg/kg/min: MAP +${lo}–${hi} % at 20 min`, async () => {
      const d = await mapRise('norepinephrine', rate);
      console.log(`norepinephrine ${rate}: MAP ${d.toFixed(1)} %`);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }, 600_000);
  it('dobutamine 5 µg/kg/min: CO +20–40 %; the β-blocked profile gets ≤ half of that rise (decision 7)', async () => {
    const rise = async (patient: PatientProfile) => {
      const r = await runPk(patient, [[120, inf('dobutamine', 5)]], 1320);
      return 100 * (coMean(r.ev, 1300, 1320) / coMean(r.ev, 100, 120) - 1);
    };
    const free = await rise({});
    const blocked = await rise({ conditions: [{ id: 'betaBlocked' }] });
    console.log(`dobutamine 5: CO ${free.toFixed(1)} % (β-blocked ${blocked.toFixed(1)} %)`);
    expect(free).toBeGreaterThanOrEqual(20);
    expect(free).toBeLessThanOrEqual(40);
    expect(blocked).toBeLessThanOrEqual(free / 2);
  }, 900_000);
});

describe('7g acceptance — context: acidosis, tachyphylaxis, age, antagonism', () => {
  it('acidosis: phenylephrine 0.5 at pH 7.2 gives ≤ 60 % of the pH 7.4 SVR rise (PD level: 0.5×, T6.2)', () => {
    const svrRise = (ph: number) => {
      const pk = createPkState();
      applyPkCommand(pk, ev(inf('phenylephrine', 0.5)), 0);
      advancePk(pk, { ...NEUTRAL_PK_CTX, ph }, 1200);
      return pk.fx.svr - 1;
    };
    expect(svrRise(7.2)).toBeLessThanOrEqual(0.6 * svrRise(7.4));
    expect(svrRise(7.2) / svrRise(7.4)).toBeCloseTo(acidosisFactor(7.2), 9);
  });
  it.skipIf(!('blood' in (createEngine({ seed: 1 }).snapshot().state as { st: object }).st))(
    'acidosis through the engine (7c on main): the pk context reads 7c’s pH and scales the phenylephrine SVR rise by acidosisFactor(pH)',
    async () => {
      const run = async (acid: boolean) => {
        const e = createEngine({ seed: 8, mode: 'modeled' });
        e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
        if (acid) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'metabolic', ketoacidsMmolL: 20, overS: 60 } })); // 7c's event
        e.dispatch(cmd({ type: 'applyEvent', event: inf('phenylephrine', 0.5), atTick: 300 * 50 }));
        for (let t = 60; t <= 1500; t += 60) {
          e.advanceTo(t);
          await yieldNow();
        }
        const st = stOf(e);
        return { rise: st.pk.fx.svr - 1, ph: st.blood?.core?.ab?.ph ?? 7.4 };
      };
      const base = await run(false);
      const acid = await run(true);
      console.log(`engine acidosis: pH ${acid.ph.toFixed(3)}, SVR rise ${acid.rise.toFixed(3)} vs ${base.rise.toFixed(3)}`);
      expect(acid.ph).toBeLessThan(7.3); // else raise ketoacidsMmolL: the test must reach real acidaemia
      expect(acid.rise / base.rise).toBeGreaterThan(acidosisFactor(acid.ph) * 0.95);
      expect(acid.rise / base.rise).toBeLessThan(acidosisFactor(acid.ph) * 1.05);
    },
    900_000,
  );
  it('ephedrine 10 mg ×3 at 10 min: the third dose adds ≤ 0.6 × the SVR increment of the first (tachyphylaxis 0.7²)', () => {
    const pk = createPkState();
    const incr: number[] = [];
    for (const t0 of [0, 600, 1200]) {
      advancePk(pk, NEUTRAL_PK_CTX, t0);
      const before = pk.fx.svr;
      applyPkCommand(pk, ev({ kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' }), t0);
      advancePk(pk, NEUTRAL_PK_CTX, t0 + 270); // the row's tp 4.5 min
      incr.push(pk.fx.svr - before);
    }
    console.log(`ephedrine SVR increments ${incr.map((x) => x.toFixed(3)).join(' / ')}`);
    expect(incr[0]!).toBeGreaterThan(0.05);
    expect(incr[2]!).toBeLessThanOrEqual(0.6 * incr[0]!);
  });
  it('MAC(age): sevoflurane 2 % at FGF 6 for 20 min — the 80 y MAC fraction ≥ 1.2 × the 40 y one (MAC 1.40 vs 1.80)', async () => {
    const mac = async (ageY: number) => {
      const r = await runPk({ ageY }, [[0, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6 }]], 1200);
      return (r.e.snapshot().state as { st: St }).st.pk.bus.volatiles.sevoflurane!;
    };
    const y40 = await mac(40);
    const y80 = await mac(80);
    console.log(`MAC fraction 40 y ${y40.macFrac.toFixed(3)}, 80 y ${y80.macFrac.toFixed(3)}`);
    expect(y80.macAge).toBeCloseTo(1.4, 2);
    expect(y80.macFrac).toBeGreaterThanOrEqual(1.2 * y40.macFrac);
  }, 600_000);
  it('naloxone 0.1 mg at remifentanil Ce 3: remifentanil-equivalent ≥ 30 % lower within 3 min; the class multiplier ≥ 1.4 on the bus', async () => {
    const e = createEngine({ seed: 6, mode: 'modeled' });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'naloxone', dose: 0.1, unit: 'mg', route: 'iv' }, atTick: 300 * 50 }));
    for (let t = 60; t <= 240; t += 60) {
      e.advanceTo(t);
      await yieldNow();
    }
    e.advanceTo(295);
    const pre = stOf(e).pk.bus;
    e.advanceTo(480);
    const post = stOf(e).pk.bus;
    expect(pre.agents.remifentanil!.brain).toBeCloseTo(3, 1);
    expect(post.agents.remifentanil!.brain).toBeCloseTo(3, 1); // TCI holds the raw Ce; the antagonism is PD
    expect(post.cns.opioidCeRemiEq).toBeLessThanOrEqual(0.7 * pre.cns.opioidCeRemiEq);
    expect(post.antagonist.opioid).toBeGreaterThanOrEqual(1.4);
  }, 300_000);
});

/** Minutes from a sugammadex dose to TOFR ≥ 0.9, and to T1 ≥ 10 %, with 7f's formulas on the bus thumb Ce. */
function sgxReversal(rocMgKg: number, giveAtT1: number | null, giveAtMin: number | null, sgxMgKg: number): { tofr90: number; t1of10: number } {
  const pk = createPkState();
  applyPkCommand(pk, ev({ kind: 'drug', drugId: 'rocuronium', dose: rocMgKg, unit: 'mg/kg', route: 'iv' }), 0);
  let given = -1;
  let t1of10 = Number.POSITIVE_INFINITY;
  for (let t = 0.1; t < 14400; t = Math.round((t + 0.1) * 10) / 10) {
    advancePk(pk, NEUTRAL_PK_CTX, t);
    const t1 = testT1(pk.bus.agents.rocuronium!.nmj!, 823, 4.8);
    if (given < 0 && ((giveAtT1 !== null && t > 120 && t1 >= giveAtT1) || (giveAtMin !== null && t >= giveAtMin * 60))) {
      applyPkCommand(pk, ev({ kind: 'drug', drugId: 'sugammadex', dose: sgxMgKg, unit: 'mg/kg', route: 'iv' }), t);
      given = t;
    }
    if (given > 0 && t1of10 === Number.POSITIVE_INFINITY && t1 >= 0.1) t1of10 = (t - given) / 60;
    if (given > 0 && t1 ** 2.5 >= 0.9) return { tofr90: (t - given) / 60, t1of10 };
  }
  return { tofr90: Number.POSITIVE_INFINITY, t1of10 };
}

describe('7g acceptance — sugammadex reversal (tables §5d, §7 25; plasma + effect-site binding, D7)', () => {
  it('2 mg/kg at T2 (T1 ≈ 10 %, rocuronium 0.6): TOFR 0.9 in 1.5–4 min (label median 2.2; prototype 2.11)', () => {
    const m = sgxReversal(0.6, 0.1, null, 2).tofr90;
    console.log(`sugammadex 2 mg/kg at T2: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThan(1.5);
    expect(m).toBeLessThan(4);
  });
  it('4 mg/kg at 1–2 PTC (T1 back to ≥ 1 %, rocuronium 0.6): TOFR 0.9 in 2.1–4.3 min (label median 2.7, IQR; prototype 2.22)', () => {
    const m = sgxReversal(0.6, 0.01, null, 4).tofr90;
    console.log(`sugammadex 4 mg/kg at PTC: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThanOrEqual(2.1);
    expect(m).toBeLessThanOrEqual(4.3);
  });
  it('16 mg/kg 3 min after rocuronium 1.2: T1 10 % in 0.6–2.0 min (label 1.2; prototype 1.80), TOFR 0.9 < 5 min', () => {
    const r = sgxReversal(1.2, null, 3, 16);
    console.log(`sugammadex 16 mg/kg: T1 10 % ${r.t1of10.toFixed(2)} min, TOFR 0.9 ${r.tofr90.toFixed(2)} min`);
    expect(r.t1of10).toBeGreaterThan(0.6);
    expect(r.t1of10).toBeLessThan(2.0);
    expect(r.tofr90).toBeLessThan(5);
  });
  it('underdosed sugammadex (0.5 mg/kg 5 min after rocuronium 1.2) leaves residual block (recurarisation teaching)', () => {
    expect(sgxReversal(1.2, null, 5, 0.5).tofr90).toBeGreaterThan(10); // prototype 129.5 min
  });
});
```

- [x] **Step 2: Run it** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-acceptance-pd.test.ts`.
  Record every printed number in the gate note. Misses: vasopressors — Task 13's rule (ke0 and EC50 within ×0.5–×2,
  recorded `[ENG, fitted …]`); reversal — tune ONLY `SUGAMMADEX.ke0` (keep `[k, 1.6k]`) within 0.08–0.12 and record it
  in D7; the MAC(age) and naloxone checks have no free parameter — a miss is a wiring bug. If a band cannot be met
  inside those ranges, stop and report (R45: never widen a band).
- [x] **Step 3: Commit and push** — `git add -A && git commit -m "test(pk): acceptance — vasopressor dose–response, β/acidosis context, tachyphylaxis, MAC age, naloxone, sugammadex reversal" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 23: Acceptance — scenarios (adenosine on SVT, LAST + lipid), determinism, CPU, 24 h

**Files:** Create `packages/engine-core/test/engine/pk-acceptance-scen.test.ts`, `packages/engine-core/test/engine/pk-longrun.test.ts`

- [x] **Step 1: Write the test:**

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../src/l2/pk/pipeline.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import type { Command } from '../../src/types.ts';

describe('7g scenarios', () => {
  it('adenosine 6 mg on AVNRT 180/min: a pause/complete block 5–30 s after the push, then sinus ≤ 110/min', async () => {
    const e = createEngine({ seed: 9, mode: 'modeled', patient: { ageY: 26, sex: 'F', weightKg: 58 } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } }));
    e.advanceTo(120);
    const beats = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t > 30);
    const gaps = beats.slice(1).map((b, i) => ({ t: b.t, gap: b.t - beats[i]!.t }));
    const pause = gaps.find((g) => g.gap > 2);
    expect(pause).toBeDefined();
    expect(pause!.t - 30).toBeGreaterThan(5);
    expect(pause!.t - 30).toBeLessThan(40);
    const hr = ev.filter((x) => x.type === 'state' && x.t > 100) as Extract<EngineEvent, { type: 'state' }>[];
    expect(hr.at(-1)!.values.hr).toBeLessThan(110);
  }, 300_000);
  it('LAST: bupivacaine 225 mg IV → bradycardia then VF; lipid given at the first sign lowers the free level ≥ 30 %', () => {
    const ev2 = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
    const a = createPkState();
    const b = createPkState();
    for (const pk of [a, b]) applyPkCommand(pk, ev2({ kind: 'drug', drugId: 'bupivacaine', dose: 225, unit: 'mg', route: 'iv' }), 0);
    applyPkCommand(b, ev2({ kind: 'drug', drugId: 'lipidEmulsion', dose: 1.5, unit: 'mL/kg', route: 'iv' }), 30);
    applyPkCommand(b, ev2({ kind: 'infusion', drugId: 'lipidEmulsion', rate: 0.25, unit: 'mL/kg/min' }), 30);
    advancePk(a, NEUTRAL_PK_CTX, 240);
    advancePk(b, NEUTRAL_PK_CTX, 240);
    expect(b.lastC.bupivacaine!).toBeLessThan(0.7 * a.lastC.bupivacaine!);
    expect(a.bus.last.cvE).toBeGreaterThan(b.bus.last.cvE);
  });
  it('determinism: same seed + script → identical ABP hash and drugs events; another seed differs', async () => {
    const run = async (seed: number) => {
      const e = createEngine({ seed, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
      const d: string[] = [];
      e.on((x) => { if (x.type === 'drugs') d.push(JSON.stringify(x)); });
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } }));
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.05, unit: 'mcg/kg/min' }, atTick: 3000 }));
      for (let t = 60; t <= 300; t += 60) { e.advanceTo(t); await yieldNow(); }
      const w = new Float32Array(125 * 60);
      e.readSamples('abp', 125 * 240, w);
      return createHash('sha256').update(Buffer.from(w.buffer)).update(d.join('')).digest('hex');
    };
    expect(await run(21)).toBe(await run(21));
    expect(await run(21)).not.toBe(await run(22));
  }, 300_000);
  it('CPU: 10 concurrent drugs cost ≤ 0.05 ms per 20 ms tick (advancePk alone, 1 simulated hour)', () => {
    const pk = createPkState();
    const give = (event: Record<string, unknown>) => applyPkCommand(pk, { type: 'applyEvent', event } as unknown as Command, 0);
    give({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 });
    give({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 });
    give({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    give({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' });
    give({ kind: 'infusion', drugId: 'phenylephrine', rate: 0.3, unit: 'mcg/kg/min' });
    give({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' });
    give({ kind: 'drug', drugId: 'midazolam', dose: 2, unit: 'mg', route: 'iv' });
    give({ kind: 'infusion', drugId: 'dobutamine', rate: 5, unit: 'mcg/kg/min' });
    give({ kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' });
    give({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 60); // warm the caches
    const t0 = performance.now();
    for (let k = 1; k <= 180000; k++) advancePk(pk, NEUTRAL_PK_CTX, 60 + k * 0.02);
    const perTick = (performance.now() - t0) / 180000;
    console.log(`7g CPU per 20 ms tick: ${(perTick * 1000).toFixed(1)} µs`);
    expect(perTick).toBeLessThan(0.05);
  }, 300_000);
});
```

- [x] **Step 2: Write the 24 h run** in the long-run file every stage uses (`test/engine/*-longrun.test.ts`: Stage 2
  `hemo-longrun`, Stage 3 `resp-longrun`, 7a `circ-longrun`) — `packages/engine-core/test/engine/pk-longrun.test.ts`.
  The exact indices are the ones those files pin after `advanceTo(86400)` (look-ahead convention: 125 Hz
  10,800,000 + 12; ECG 500 Hz 43,200,000 + 50):

```ts
// Stage 7g 24 h run: three drugs running all day — no drift of the sample clock, the TCI targets or the panel clock.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';

describe('Stage 7g long run', () => {
  it('24 h: TCI propofol + remifentanil + sevoflurane — latestSampleIndex(abp) = 10,800,000 + 12, ecgII = 43,200,000 + 50, targets held', { timeout: 1_800_000 }, async () => {
    const e = createEngine({ seed: 4, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2.5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 2 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 2 } }));
    let last: Extract<EngineEvent, { type: 'drugs' }> | null = null;
    e.on((x) => {
      if (x.type === 'drugs') last = x;
    });
    // minute by minute with a yield (Global Constraints: the drug layer adds work to every tick on the 2-vCPU runner)
    for (let t = 60; t <= 86_400; t += 60) {
      e.advanceTo(t);
      await yieldNow();
    }
    expect(e.latestSampleIndex('abp')).toBe(10_800_000 + 12);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    expect(l.t).toBe(86_400);
    expect(l.drugs.find((x) => x.id === 'propofol')!.ce).toBeCloseTo(2.5, 2);
    expect(l.drugs.find((x) => x.id === 'remifentanil')!.ce).toBeCloseTo(2, 2);
    expect(l.volatile!.macFrac).toBeGreaterThan(0.4); // sevo 1 % FGF 2 at 40 y after a day: fixer prototype 0.51 MAC (fat still loading); the circuit did not drain
    for (const d of l.drugs) expect(Number.isFinite(d.cp) && Number.isFinite(d.ce)).toBe(true);
  });
});
```

- [x] **Step 3: Run both** — `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-acceptance-scen.test.ts test/engine/pk-longrun.test.ts`.
  CPU: if > 0.05 ms, profile — the expected hot spots are `structuredClone(DRUG_BUS_NEUTRAL)` in `combine` (replace by
  a hand-written fresh object) and `Object.values` allocations; do not reduce the 10 Hz rate. A 24 h index miss is a
  clock bug (the pk step must never change the sample grid): stop and report.
- [x] **Step 4: Commit and push** — `git add -A && git commit -m "test(pk): acceptance — adenosine on SVT, LAST + lipid, determinism, CPU budget; 24 h long run" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 24: Drug panel renderer, demo `stage7g.html` and gate screenshots

**Files:**
- Create: `packages/renderer/src/drug-panel.ts`, `packages/renderer/test/drug-panel.test.ts`, `apps/demo/stage7g.html`, `apps/demo/src/stage7g.ts`, `apps/demo/e2e/stage7g.e2e.ts`, `apps/demo/scripts/stage7g-shots.mjs`
- Modify: `packages/renderer/src/index.ts` (one export), `apps/demo/vite.config.ts` (one input), `apps/demo/index.html` (one link)

- [ ] **Step 1: Write the failing renderer test** — `packages/renderer/test/drug-panel.test.ts` (happy-dom, as the renderer's other DOM tests):

```ts
import { describe, expect, it } from 'vitest';
import { createDrugPanel } from '../src/drug-panel.ts';

describe('drug panel', () => {
  it('renders one row per drug with Cp/Ce, TCI target and decrement time; a volatile line with MAC', () => {
    const host = document.createElement('div');
    const p = createDrugPanel(host);
    p.update({
      type: 'drugs', t: 60, macTotal: 0.9,
      volatile: { agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, fi: 1.8, fa: 1.5, brain: 1.3, macAge: 1.8, macFrac: 0.72, n2oFrac: 0 },
      drugs: [{ id: 'propofol', name: 'Propofol', unit: 'µg/mL', cp: 4.1, ce: 3.2, rate: 12, rateUnit: 'mg/min', tci: { mode: 'effect', target: 4, model: 'eleveld' }, totalAmount: 160, amountUnit: 'mg', decrement50Min: 3.9 }],
    });
    expect(host.textContent).toContain('Propofol');
    expect(host.textContent).toContain('3.20');
    expect(host.textContent).toContain('Ce 4');
    expect(host.textContent).toContain('0.72 MAC');
    expect(host.querySelectorAll('canvas').length).toBe(1);
  });
});
```

  Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/drug-panel.test.ts` → FAIL (cannot resolve
  `../src/drug-panel.ts`).

- [ ] **Step 2: Create `packages/renderer/src/drug-panel.ts`**

```ts
// Stage 7g drug panel: a compact table (drug, Cp, Ce, pump/TCI, total, 50 % decrement) plus a 10-minute Ce sparkline
// per drug on one canvas, and the volatile line (FI/FA/brain, MAC). Plain DOM; theme via CSS variables.
import type { DrugsEvent } from '@pme/engine-core';

export interface DrugPanel {
  update(e: DrugsEvent): void;
  destroy(): void;
}

const HISTORY_S = 600;
const COLORS = ['#e8c547', '#4fc3f7', '#ef5350', '#66bb6a', '#ab47bc', '#ffa726'];

export function createDrugPanel(host: HTMLElement): DrugPanel {
  const root = document.createElement('div');
  root.className = 'pme-drug-panel';
  root.style.cssText = 'font: 12px/1.4 system-ui, sans-serif; color: var(--pme-fg, #ddd); background: var(--pme-bg, #111); padding: 6px;';
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse: collapse; width: 100%;';
  const vol = document.createElement('div');
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 90;
  canvas.style.cssText = 'width: 100%; height: 90px; display: block; margin-top: 4px;';
  root.append(table, vol, canvas);
  host.append(root);
  const hist = new Map<string, { t: number; ce: number }[]>();
  const f = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  return {
    update(e) {
      const rows = e.drugs.map((d) => {
        const pump = d.tci ? `TCI ${d.tci.model} ${d.tci.mode === 'effect' ? 'Ce' : 'Cp'} ${d.tci.target}` : d.rate !== null ? `${f(d.rate)} ${d.rateUnit}` : '';
        const dec = d.decrement50Min !== null ? `${f(d.decrement50Min)} min` : '';
        return `<tr><td>${d.name}</td><td>Cp ${f(d.cp)}</td><td>Ce ${f(d.ce)} ${d.unit}</td><td>${pump}</td><td>${f(d.totalAmount)} ${d.amountUnit}</td><td>${dec}</td></tr>`;
      });
      table.innerHTML = rows.join('');
      const v = e.volatile;
      vol.textContent = v ? `${v.agent} dial ${v.dialPct} % FGF ${v.fgfLpm} L/min · FI ${f(v.fi)} FA ${f(v.fa)} brain ${f(v.brain)} % · ${v.macFrac.toFixed(2)} MAC (age MAC ${v.macAge.toFixed(2)} %)` : '';
      for (const d of e.drugs) {
        const h = hist.get(d.id) ?? [];
        h.push({ t: e.t, ce: d.ce });
        while (h.length && (h[0] as { t: number }).t < e.t - HISTORY_S) h.shift();
        hist.set(d.id, h);
      }
      const g = canvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, canvas.width, canvas.height);
      let i = 0;
      for (const [, h] of hist) {
        const max = Math.max(1e-9, ...h.map((p) => p.ce));
        g.strokeStyle = COLORS[i++ % COLORS.length] as string;
        g.beginPath();
        h.forEach((p, k) => {
          const x = ((p.t - (e.t - HISTORY_S)) / HISTORY_S) * canvas.width;
          const y = canvas.height - 4 - (p.ce / max) * (canvas.height - 8);
          if (k === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.stroke();
      }
    },
    destroy() {
      root.remove();
    },
  };
}
```

  Export it from `packages/renderer/src/index.ts`: `export { createDrugPanel, type DrugPanel } from './drug-panel.ts'; // Stage 7g`.
  (If happy-dom's canvas has no 2D context the `if (!g) return;` path keeps the test green.)
- [ ] **Step 3: Demo page — `apps/demo/stage7g.html`** (layout copied from 7a's `stage7a.html`: monitor left, a side
  panel right):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stage 7g: drug PK/PD</title>
  <style>
    body { margin: 0; background: #000; color: #ddd; font: 13px system-ui, sans-serif; display: grid; grid-template-columns: minmax(0, 1fr) 380px; height: 100vh; }
    #monitor { min-height: 0; height: 100vh; }
    aside { padding: 8px 10px; overflow: auto; border-left: 1px solid #333; }
    fieldset { border: 1px solid #333; margin: 0 0 6px; padding: 4px 8px; }
    legend { color: #888; }
    button { margin: 2px; font: inherit; }
    #depth { white-space: pre; font: 11px ui-monospace, monospace; color: #9c9; margin: 4px 0; }
  </style>
</head>
<body>
  <div id="monitor"></div>
  <aside>
    <div id="drugs"></div>
    <div id="depth"></div>
    <fieldset><legend>Induction</legend>
      <button id="tci">TCI propofol Ce 4 + remifentanil Ce 3 (roc 0.6 at +180 s)</button>
    </fieldset>
    <fieldset><legend>Vasoactives</legend>
      <button id="phe">Phenylephrine 100 µg</button><button id="ne">NE 0.1 µg/kg/min</button><button id="neStop">Stop NE</button>
    </fieldset>
    <fieldset><legend>Volatile</legend>
      <button id="sevo2">Sevo 2 % / 2 L</button><button id="sevoLow">Sevo 2 % / 0.5 L</button><button id="vapOff">Vaporiser off</button>
    </fieldset>
    <fieldset><legend>Rhythm and toxicity</legend>
      <button id="svt">SVT → adenosine 6 mg at +20 s</button>
      <button id="last">Bupivacaine 225 mg IV</button><button id="lipid">Lipid 1.5 mL/kg + 0.25 mL/kg/min</button>
    </fieldset>
    <fieldset><legend>Reversal</legend>
      <button id="sgx">Sugammadex 2 mg/kg</button><button id="nal">Naloxone 0.1 mg</button>
    </fieldset>
    <fieldset><legend>Patient</legend><button id="restart">Restart patient</button></fieldset>
  </aside>
  <script type="module" src="./src/stage7g.ts"></script>
</body>
</html>
```

  `apps/demo/src/stage7g.ts` (the monitor is mounted as `stage7a.ts` does; the drug panel and the depth tile read a
  SHADOW engine in this thread — same options, same commands at the same ticks — exactly as 7a's teaching views do):

```ts
// Stage 7g demo: the monitor plus the drug panel (Cp/Ce, pump/TCI, decrement time, volatile line) and a depth tile
// that shows 7g's summaries until 7f's depth index exists. The shadow engine is deterministic, so it IS the
// monitor's patient (7a's pattern).
import { createEngine, type Command, type EngineEvent, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import { createDrugPanel, mountMonitor, type DrugPanel, type MonitorHandle } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Body = Record<string, unknown>;
type DrugsEv = Extract<EngineEvent, { type: 'drugs' }>;

let pm: MonitorHandle | null = null;
let shadow: MonitorEngine | null = null;
let panel: DrugPanel | null = null;
let tMon = 0;
let lastDrugs: DrugsEv | null = null;
let seq = 0;

/** Send to the monitor and the shadow at the same tick (0.3 s ahead of the monitor's clock, + delayS). */
async function send(body: Body, delayS = 0): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm || !shadow) return { accepted: false, reason: 'not started' };
  const atTick = Math.round((tMon + 0.3 + delayS) * 50);
  const cmd = { id: `g${++seq}`, issuedBy: 'stage7g', ...body, atTick } as Command;
  shadow.dispatch({ ...cmd, id: `${cmd.id}s` } as Command);
  const r = await pm.dispatch(cmd);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const drug = (drugId: string, dose: number, unit: string, delayS = 0) => send({ type: 'applyEvent', event: { kind: 'drug', drugId, dose, unit, route: 'iv' } }, delayS);
const event = (e: Body) => send({ type: 'applyEvent', event: e });

function start(): void {
  pm?.destroy();
  panel?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  lastDrugs = null;
  const engine: EngineOptions = {
    seed: 7,
    mode: 'modeled',
    patient: { ageY: 45, sex: 'M', weightKg: 80, heightCm: 178, sensors: { abp: 'connected', spo2: 'on', co2: 'on', nibp: 'on' } },
  };
  shadow = createEngine(engine);
  panel = createDrugPanel($('drugs'));
  shadow.on((x) => {
    if (x.type !== 'drugs') return;
    lastDrugs = x;
    panel?.update(x);
  }, ['drugs']);
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], nibp: true });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
  });
  void event({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 550, peep: 5 });
}

$('restart').onclick = start;
$('tci').onclick = () => {
  void event({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4, model: 'eleveld' });
  void event({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 });
  void drug('rocuronium', 0.6, 'mg/kg', 180);
};
$('phe').onclick = () => void drug('phenylephrine', 100, 'mcg');
$('ne').onclick = () => void event({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' });
$('neStop').onclick = () => void event({ kind: 'infusion', drugId: 'norepinephrine', rate: 0, unit: 'mcg/kg/min' });
$('sevo2').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 });
$('sevoLow').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 0.5 });
$('vapOff').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0 });
$('svt').onclick = () => {
  void send({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } });
  void drug('adenosine', 6, 'mg', 20);
};
$('last').onclick = () => void drug('bupivacaine', 225, 'mg');
$('lipid').onclick = () => {
  void drug('lipidEmulsion', 1.5, 'mL/kg');
  void event({ kind: 'infusion', drugId: 'lipidEmulsion', rate: 0.25, unit: 'mL/kg/min' });
};
$('sgx').onclick = () => void drug('sugammadex', 2, 'mg/kg');
$('nal').onclick = () => void drug('naloxone', 0.1, 'mg');

/** The depth tile: 7f's depth index when 7f publishes it on the 1 Hz state event, else 7g's own summaries. */
function depthText(): string {
  if (!shadow) return '';
  const st = (shadow.snapshot().state as { st: { pk?: { bus: { cns: { uSurface: number; macBrain: number; propCe: number; opioidCeRemiEq: number; seizure: boolean } } }; neuro?: { out?: { depthIndex?: number } } } }).st;
  const di = st.neuro?.out?.depthIndex;
  const c = st.pk?.bus.cns;
  if (!c) return '';
  return (di !== undefined ? `depth index ${di.toFixed(0)} (7f)\n` : 'depth index: 7f pending\n') +
    `U surface ${c.uSurface.toFixed(2)}  MAC ${c.macBrain.toFixed(2)}\npropofol Ce ${c.propCe.toFixed(2)} µg/mL  opioid ${c.opioidCeRemiEq.toFixed(2)} ng/mL remi-eq` +
    (c.seizure ? '\nLAST: SEIZURE' : '');
}
setInterval(() => {
  if (shadow && tMon > 0) shadow.advanceTo(tMon);
}, 100);
setInterval(() => {
  $('depth').textContent = depthText();
}, 1000);

start();
(window as unknown as { __pme7g: unknown }).__pme7g = {
  send, restart: start, simT: () => tMon, timeScale: (k: number) => pm?.setTimeScale(k), drugs: () => lastDrugs, ready: true,
};
```

  Register the page: in `apps/demo/vite.config.ts` add `stage7g: page('stage7g'), // Stage 7g` after the
  `stage7a: page('stage7a'), // Stage 7a` input (or after the last stage input on main), and in `apps/demo/index.html`
  add after the Stage 7a link:
  `<li><a href="./stage7g.html">Stage 7g: drug PK/PD — TCI, vasoactives, volatiles, adenosine, LAST, reversal</a></li>`.

- [ ] **Step 4: Gate screenshots — `apps/demo/e2e/stage7g.e2e.ts`** (modelled on 7a's `apps/demo/e2e/stage7a.e2e.ts`:
  its own Vite server, the page hook, ×4 time scale; the PNGs are the gate evidence) and the runner
  `apps/demo/scripts/stage7g-shots.mjs`:

```ts
// Gate 7g evidence on the live page: TCI induction, phenylephrine, sevoflurane at FGF 2 vs 0.5 L/min, adenosine on
// AVNRT, bupivacaine LAST → VF. Run: node apps/demo/scripts/stage7g-shots.mjs (headless system Chrome).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7g');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type DrugsEv = { t: number; drugs: { id: string; ce: number }[]; volatile: { macFrac: number; fa: number } | null } | null;
type Hook = { send(c: Record<string, unknown>, delayS?: number): Promise<{ accepted: boolean }>; simT(): number; timeScale(k: number): void; restart(): void; drugs(): DrugsEv; ready: boolean };
const simT = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7g']!.simT());
const drugs = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7g']!.drugs());
const timeScale = (page: Page, k: number) => page.evaluate((k) => (window as unknown as Record<string, Hook>)['__pme7g']!.timeScale(k), k);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as Record<string, Hook>)['__pme7g']!.simT() >= t, t, { timeout: 300_000 });

async function restart(page: Page) {
  await page.click('#restart');
  await page.waitForTimeout(500);
  await timeScale(page, 4);
  await waitSim(page, 10);
}
async function shots(page: Page, name: string) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const a = document.querySelector('aside');
    if (a) a.scrollTop = 0;
  });
  await page.screenshot({ path: `${out}/${name}-monitor.png`, clip: { x: 0, y: 0, width: 760, height: 560 } });
  await page.screenshot({ path: `${out}/${name}-panel.png`, clip: { x: 760, y: 0, width: 380, height: 560 } });
}

test('stage7g page: TCI induction, phenylephrine, sevo FGF 2 vs 0.5, adenosine on AVNRT, LAST → VF', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1140, height: 620 });
  await page.goto(`${base}/stage7g.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7g?: { ready: boolean } }).__pme7g?.ready === true);
  await timeScale(page, 4);
  await waitSim(page, 10);
  // (a) TCI induction, 3 min later: panel Ce curves at target, ABP after induction
  await page.click('#tci');
  let t0 = await simT(page);
  await waitSim(page, t0 + 180);
  const ind = await drugs(page);
  expect(ind!.drugs.find((d) => d.id === 'propofol')!.ce).toBeGreaterThan(3.5);
  expect(ind!.drugs.find((d) => d.id === 'remifentanil')!.ce).toBeGreaterThan(2.7);
  await shots(page, 'tci-induction-3min');
  // (b) phenylephrine peak (≈ 60 s after the push)
  await restart(page);
  await page.click('#phe');
  t0 = await simT(page);
  await waitSim(page, t0 + 60);
  await shots(page, 'phenylephrine-peak');
  // (c) sevoflurane 2 % at FGF 2 vs 0.5 after 10 min: the low-flow lag in the volatile line
  const sevoAt = async (button: string, name: string) => {
    await restart(page);
    await page.click(button);
    const s = await simT(page);
    await waitSim(page, s + 600);
    await shots(page, name);
    return (await drugs(page))!.volatile!;
  };
  const high = await sevoAt('#sevo2', 'sevo-fgf2-10min');
  const low = await sevoAt('#sevoLow', 'sevo-fgf05-10min');
  expect(low.fa).toBeLessThan(high.fa);
  // (d) adenosine on AVNRT: the block on the ECG ≈ 10–30 s after the push (pushed 20 s after the rhythm)
  await restart(page);
  await page.click('#svt');
  t0 = await simT(page);
  await waitSim(page, t0 + 20 + 18);
  await shots(page, 'adenosine-block');
  // (e) LAST: bupivacaine 225 mg IV → VF within ≈ 2–3 min
  await restart(page);
  await page.click('#last');
  t0 = await simT(page);
  await waitSim(page, t0 + 180);
  await shots(page, 'last-vf');
  expect(errors).toEqual([]);
});
```

```js
// apps/demo/scripts/stage7g-shots.mjs — Gate 7g screenshots: runs the stage7g e2e spec on headless system Chrome
// (a hidden desktop pane throttles rAF — Gate 1 lesson); the spec writes the PNGs to docs/gates/stage-7g/.
// Usage (repo root): node apps/demo/scripts/stage7g-shots.mjs
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['-y', 'pnpm@9.15.9', 'exec', 'playwright', 'test', 'apps/demo/e2e/stage7g.e2e.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PW_SYSTEM_CHROME: '1' },
});
process.exit(r.status ?? 1);
```

- [ ] **Step 5: Run** the renderer test (`npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/drug-panel.test.ts`),
  `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build`, and `node apps/demo/scripts/stage7g-shots.mjs`
  (expected: 1 passed; ten PNGs in `docs/gates/stage-7g/`). Open every PNG and check: (a) both Ce rows at target and
  the ABP fall; (b) the ABP step; (c) the 0.5 L/min volatile line lower than the 2 L/min one; (d) the pause or
  complete block on the ECG; (e) VF. A PNG that does not show its event is a failed gate item, not a retake.
  Commit and push — `git add -A && git commit -m "feat(demo): stage7g — drug panel, TCI induction, vasopressor, volatile, adenosine, LAST; gate screenshots" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 25: NOTICES rows, tables cross-reference, gate note

**Files:** Modify `NOTICES.md`, `docs/physiology/stage-7-parameter-tables.md` (§6 intro note only); Create `docs/gates/stage-7g.md`

- [ ] **Step 1: NOTICES** — add rows in the existing table format (published parameter sets are facts; no code is
  borrowed; "How used" says so). Use the next free IDs (check the file; the block below assumes N-070…):

```
| N-070 | Eleveld et al. 2018 propofol PK/PD parameters (Br J Anaesth 120:942) | https://doi.org/10.1016/j.bja.2018.01.018 | Facts (published model parameters) | Equations and θ values re-implemented in `l2/pk/models.ts`; no code | <date> |
| N-071 | Schnider et al. 1998/1999 propofol PK/PD (Anesthesiology 88:1170; 90:1502) | https://doi.org/10.1097/00000542-199805000-00006 | Facts | As N-070 | <date> |
| N-072 | Marsh et al. 1991 propofol PK (Br J Anaesth 67:41) | https://doi.org/10.1093/bja/67.1.41 | Facts | As N-070 | <date> |
| N-073 | Minto et al. 1997 remifentanil PK/PD (Anesthesiology 86:10) | https://doi.org/10.1097/00000542-199701000-00004 | Facts | As N-070 | <date> |
| N-074 | Shafer et al. 1990 fentanyl PK; Gepts et al. 1995 sufentanil PK; Shafer & Varvel 1991 TTPE | https://doi.org/10.1097/00000542-199012000-00005 | Facts | Microconstants in `models.ts`; ke0 derived by the TTPE method | <date> |
| N-075 | Rocuronium/vecuronium/cisatracurium/succinylcholine/sugammadex label PK and Plaud 1995 PD | FDA labels (DailyMed) · https://doi.org/10.1016/S0009-9236(95)90042-X | Facts | `l2/pk/nmb.ts` | <date> |
| N-076 | Mapleson 1996 MAC–age relation; Yasuda 1991 FA/FI; Eger/Yasuda partition coefficients | https://doi.org/10.1093/bja/76.2.179 | Facts | `l2/pk/volatile.ts` | <date> |
| N-077 | James 1976 LBM; Al-Sallami 2015 FFM | https://doi.org/10.1007/s40262-015-0263-2 | Facts | `l2/pk/covariates.ts` | <date> |
```
  Verify each DOI resolves by opening it (R37: web sources require the page to be opened); if one does not, replace
  it with the journal's article URL you opened. Run `npx -y pnpm@9.15.9 check-notices`.
- [ ] **Step 2: Tables cross-reference** — under `## 6. Drug PK/PD extensions (sub-stage 7g)` add ONE paragraph:
  "Implementation (7g): values as coded live in `packages/engine-core/src/l2/pk/data/*.ts` and `l2/pk/nmb.ts`;
  deviations D1–D5, D7 and the fentanyl/sufentanil vent-ke0 item are in `docs/plans/stage-7g-pkpd.md`." Do not move or edit any row (R40: amendments land after Ali's review in one edit).
- [ ] **Step 3: Gate note** `docs/gates/stage-7g.md` — the numbers every acceptance test printed (TTPE, TCI, CSHT,
  FA/FI, MAC, vasopressor bands, reversal times, adenosine timing, LAST, CPU µs/tick, 24 h), the calibrations made
  (SGX capture, vec/cis/sux ke0, any vasoactive EC50, propofol re-fit) with before/after, the screenshots, the
  deviations D1–D5, D7 and the fentanyl/sufentanil vent-ke0 item and "needs a ruling" items (incl. the 16 mg/kg sugammadex T1-10 % lag, D7), the [ENG]
  values the fixer pass introduced (sugammadex site ke0, cholinesterase multipliers, opioid haemodynamic EC50s,
  β-occupancy, esmolol PK set), and the Q list for Ali (Q-7g-1 CSHT band, Q-7g-2 LAST thresholds, Q51,
  Q57/Q58/Q60, the `ir` availability column for all 58 rows).
- [ ] **Step 4: Commit and push** — `git add -A && git commit -m "docs(pk): NOTICES rows for the published parameter sets; tables cross-reference; Stage 7g gate note" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" && git push`

### Task 26: Full verification and pull request

- [ ] **Step 1:** `git fetch origin && git merge origin/main` (resolve by the Global Constraints rule), then the full
  run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`
  and `npx -y pnpm@9.15.9 test:e2e` (Chromium). Everything green; record test counts in the gate note.
- [ ] **Step 2:** Re-read the plan's Decisions and Deviations against the gate note; every "needs a ruling" item is listed.
- [ ] **Step 3: PR** —
```bash
git push
gh pr create --base main --head stage-7g-pkpd --title "Stage 7g: drug PK/PD engine (compartment PK + effect site, TCI, volatiles, PD combination, 58-drug library)" --body "$(cat <<'BODY'
Implements docs/plans/stage-7g-pkpd.md. Gate note: docs/gates/stage-7g.md (numbers, calibrations, screenshots, deviations D1–D5, D7 and the fentanyl/sufentanil vent-ke0 item, questions for Ali).

- Exact ZOH compartment PK with effect sites; Eleveld/Schnider/Marsh, Minto, Shafer, Gepts; NMBA + sugammadex binding
- Plasma and effect-site TCI; context-sensitive half-time and decrement-from-now on a 1 Hz `drugs` panel event
- Volatile/N2O uptake (FA/FI by agent and FGF), age-adjusted MAC
- PD: Loewe within class, multiplicative across, opioid–hypnotic surface, competitive antagonists, β competition, acidosis, tachyphylaxis
- 58-row drug library as data, every row sourced and tagged; Iranian availability is a question on every row
- R51 drug-layer contract: 7g consumes every library drug event; per-agent bus (brain, opioid vent site, NMB thumb/diaphragm, cumulative mg/kg), volatiles incl. N2O, per-pass dose log for 7c/7f; sugammadex binds in plasma and at the effect sites
- 7a's bolus curves retired from the event path (declared exception); 7a sanity bands hold; β-blockade blunts 7e's surge multipliers; 7a's propofolAgeFactor removed
- Rhythm hooks: adenosine on SVT, LAST, magnesium on torsades
- Demo: apps/demo/stage7g.html

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```
- [ ] **Step 4:** Tick every box in this plan, commit `docs: stage 7g plan fully ticked`, push. Do not merge (R21: the orchestrator merges).

---

## Requests to other stages and to the orchestrator

- **7a (circulation):** accept Task 17's marked edits in `l2/circ/model.ts` (`ext.drug`, `ext.betaBlockAdd`, the
  `stepBaro(` β-blockade, `betaBlunt` on `endoHrF`/`endoEesF`) and Task 20's removal of `propofolAgeFactor`. And a
  FINDING from the prototype: after 20 min of phenylephrine 0.5 µg/kg/min, stopping it leaves 55 % of the MAP rise
  18 min later although the drug's Ce is < 1 % by 5 min — the residual is in the circulation (baroreflex resetting or a
  volume shift). Clinically MAP returns within ≈ 5–10 min. Please check the reflex resetting time constant; Task 22
  has no offset band until this is ruled.
- **7b (lungs):** the drive inputs of `drive.ts` come from 7f (R51 §2; 7g publishes no drive values); read
  `bus.airway.bronchodilation`/`histamine` and `bus.hpvInhibit` into resistance/HPV.
- **7c (blood):** the "replace the 7c drug shapes with PK" request is declined for v1 (decision 10: the shapes ARE
  mass-balance kinetics). Per R51 §3, 7g validates and CONSUMES every drug event, your ids included: 7c's drug
  validator/handler never sees them; take calcium, bicarbonate, insulin/dextrose, magnesium, salbutamol and the
  succinylcholine K rise from `ps.pk.bus.doses` (`{ agent, mgPerKg, amount, amountUnit, t }`, each bolus listed for
  exactly one advance pass; 7c steps after pk). Read `bus.metabolic.kShift` if you want β2/insulin shifts from 7g
  rows other than your own ids. Blood-row infusions are rejected by 7g in v1 — say so if a 7c scenario needs one.
- **7d (organs):** publish `organs.kidney.gfrRel` (renal clearance) and read `bus.cns.cmro2Mult`/`cbfVaso`.
- **7e (endocrine/thermal):** read `bus.metabolic.glucoseDelta` and `bus.metabolic.dantroleneE` (MH reversal). Note:
  7g's β-blockade now blunts the rise of your `endoHrF`/`endoEesF` in 7a's control step (R51 addendum 11,
  `betaBlunt`); at `betaBlockAdd` 0 your multipliers pass unchanged.
- **7f (NMB/depth/conditions):** R51 is the contract: 7f has no PK and no shim; it reads `ps.pk.bus` only —
  `agents[id].{brain, vent, nmj, dia, plasma, cumulativeMgPerKg, sgxBoundFrac, unit}`, `volatiles[agent].{fet,
  brain, macAge, macFrac}` (incl. `n2o`), `doses` (fasciculation, MH trigger), `antagonist`, `nmb.achGain`,
  `cns.seizure`. The cholinesterase phenotype multipliers are `PCHE_CL_MULT` in `l2/pk/nmb.ts` (one value, addendum
  10); NMB EC50/γ are re-fitted by the 7f executor against 7g's PK (R51 §5). Asks: (a) draw the LAST seizure flag on
  the depth index; (b) supply `vasoResp` on `ps.cond` (sepsis) for catecholamine efficacy; (c) midazolam/ketamine are
  gamma rows in 7g v1: their `brain` is in "× ref dose" units (`unit` says so) — map them to your potency scale
  [ENG] and record it; (d) apply `bus.antagonist.opioid`/`benzodiazepine` as your EC50 multipliers.
- **6b (scenarios):** `svt-adenosine.json` scripts its own AV block; with 7g the engine blocks natively — drop the
  scripted `block` state (keep the conversion question for Ali) once 7g merges.
- **Orchestrator:** Q-7g-1 (propofol CSHT band: 20–25 min at 3 h is Hughes 1992's older PK; Eleveld/Schnider/Marsh
  compute 4.5/3.5/8.6 min), Q-7g-2 (LAST thresholds), Q51 (16 mg/kg sugammadex T1 10 % 1.8 vs 1.2 min, D7), and the
  Iranian availability column (58 rows) go to Ali's calibration pass (R44).
