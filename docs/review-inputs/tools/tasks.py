# Prose (head) and verification/commit (tail) of each FU-10 task; render.py puts the edits.py blocks between them.
TASKS = {}
TAILS = {}

TASKS['A1'] = r"""### Task A1: E1 — an MH-susceptible patient given its triggers develops MH (7f publishes the exposure, 7e owns the MH state; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU10-1**: `NeuroState.mhExposure`, the two trigger sites)
- Modify: `packages/engine-core/src/l2/thermal/{params,mh}.ts` (the latencies; `MhExposure`, `mhOnsetT`, `mhFromExposure`)
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (`mhAuto`; the per-pass step)
- Modify: `packages/engine-core/test/l2/neuro/pipeline.test.ts` (the 7f mark test also asserts the exposure)
- Create: `packages/engine-core/test/helpers/fu10.ts`, `packages/engine-core/test/l2/thermal/fu10-mh-exposure.test.ts`,
  `packages/engine-core/test/engine/fu10-mh-trigger.test.ts` (SLOW → `SLOW` + `SLOW_A`)
- Modify: `packages/engine-core/vite.config.ts` (one `SLOW`/`SLOW_A` entry)
- **Overlap:** FU-6 Task 4/10 and FU-7 Tasks 5–7, 14 edit `l2/neuro/pipeline.ts` — their blocks are `IDLE_RESP`, the
  `neuroResp({…})` call, the `depth({…})` call, `NeuroEnv` and `ec50Multipliers`; this task touches `NeuroState`'s field
  list and the two `mhSusceptible` blocks, which no other plan quotes (checked in both plans).

**Why (research/14 E1, ET-10a WR):** 7f marks `mhTrigger` at the succinylcholine dose (`neuro/pipeline.ts:170–180`) and
at MAC > 0.1 (`:206–210`) and **nothing reads the mark**; Stage 3's `rs.temp.mh` is created only by the instructor's
`condition mh` (`resp/pipeline.ts:691–695`). Measured on main: the susceptible patient given suxamethonium 1.5 mg/kg and
sevoflurane 2 % keeps EtCO₂ 29–30 and MH activity 0 for 90 minutes — the whole "trigger-agent" teaching case cannot run.

**Mechanism (D1–D3):** 7f publishes WHEN each trigger first reached a susceptible patient
(`ps.neuro.mhExposure = { sux?, volatile? }`); 7e's per-pass step turns the earliest exposure plus its latency into the
same `rs.temp.mh = { severity, t0 }` the instructor creates, records that the triggers made it (`mhAuto`), and never
overrides or restarts an instructor's MH.

**Measured (prototype):** EtCO₂ doubles **+14.3 min** after the triggers (band 10–30 min), MH activity 1 at +40 min,
core 41.8 °C; a volatile alone starts at **+23.5 min**; a patient who is not susceptible stays at activity 0. Stage 3's
instructor MH, its dantrolene course and FU-4's hyperthermic arrest are untouched (they share the same state and ramp).
**FU-4 check:** ET-10b–g, ET-11a–c and ET-M2 bit-identical (the state is the same object; nothing in the ramp moved)."""

TAILS['A1'] = r"""- [ ] **Step — the tests.** Create `packages/engine-core/test/helpers/fu10.ts` (the ET rigs through the real engine;
  MODELED, seed 7, yields once per sim-minute — the file is in the prototype patch, `scratch/plans-backup/fu-10-prototype.patch`),
  `test/l2/thermal/fu10-mh-exposure.test.ts` (`mhOnsetT` and `mhFromExposure`: the earliest trigger plus its latency; a
  later suxamethonium brings a pending volatile onset forward; an instructor MH is kept and a cleared one is not
  restarted) and `test/engine/fu10-mh-trigger.test.ts` (the two engine arms above, with the measured numbers in the
  titles). Add the engine file to `SLOW` and `SLOW_A` in `packages/engine-core/vite.config.ts`.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/neuro test/l2/endo test/engine/fu10-mh-trigger.test.ts`
  → green (prototype: 155 unit tests, the engine file 27 s).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2` → ET-10a `mhDevelops` **true** (WR → PL), every other
  MH cell unchanged. Record the rows in `<scratchpad>/fu-10/et/out/`.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7f): an MH-susceptible patient develops MH from its triggers (FU-10 E1, E-FU10-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-10-endocrine-thermal
```"""

TASKS['A2'] = r"""### Task A2: E3 — a neuraxial block has its own thermoregulation (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,heat}.ts`
- Modify: `packages/engine-core/test/l2/temp/temp.test.ts` (**E-FU10-3**: the Stage 3 neuraxial expectation re-pinned)
- Create: `packages/engine-core/test/l2/thermal/fu10-neuraxial.test.ts`
- **Overlap:** no other in-flight plan edits `l2/thermal/**` (checked in FU-6, FU-7, FU-8, FU-9, 7k).

**Why (research/14 E3, ET-04 WR):** `heat.ts:161` gave any non-`none` anaesthesia thermoregulatory depth 1, so an awake
spinal patient got the GA thresholds (vasoconstriction 34.8, shivering 33.5 °C) plus the `NEURAXIAL_KCP` shortcut: hour-1
fall −1.07 °C (0.9 of GA, expected ≈ half), core 34.4 °C at 3 h and **no shivering at all**.

**Mechanism (D4):** the block acts on its EFFECTORS — the blocked fraction of the body (0.5 for a T10 block [ENG]) is
fully vasodilated and cannot shiver — and lowers the shivering threshold 0.5 °C (Kurz 1993); centrally the patient is
awake (depth 0), and sedation still arrives through 7f's `thermoDepth`. `NEURAXIAL_H` (the extra skin loss below the
block) stays: without it the hour-1 fall is only −0.53 °C and the patient never shivers.

**Measured (prototype):** hour 1 **−0.76 °C** (ET rig; heat model −0.78 vs GA −1.25), ratio **0.64**, core 35.31 °C at
3 h, shivering from **35.48 °C**, `depthNeur` **0**. The ratio band 0.4–0.6 is not reached → `it.fails` with 0.64 (Ali
Q3). **FU-4 check:** no GA, MH or hypothermia row moves (the neuraxial branch is the only path that changed);
`audit:physiology` unchanged."""

TAILS['A2'] = r"""- [ ] **Step — the tests.** Create `test/l2/thermal/fu10-neuraxial.test.ts`: (1) no central depth — the awake
  vasoconstriction threshold and the shivering threshold 0.5 °C lower; (2) hour-1 redistribution −0.5 to −1.1 °C
  (Matsukawa 1995) and less than GA's, shivering from ≈ 35.5 °C; (3) `it.fails` "redistribution about half of the GA
  fall: ratio 0.4–0.6 — measured 0.62" (the heat-model ratio; the ET rig reads 0.64).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/engine/thermal-warmer.test.ts` → green (41 tests).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-04 ET-01a ET-02 ET-29 ET-30` → ET-04 shivering true, ratio 0.64
  (WR → TS on the ratio alone, with its `it.fails`); ET-01a, ET-02, ET-29, ET-30 unchanged.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): a neuraxial block blocks its effectors and lowers the shivering threshold (FU-10 E3, E-FU10-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A3'] = r"""### Task A3: E5 + E6 — the thresholds read at most the GA row, and age lowers them (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,thresholds,heat}.ts`
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (7e writes the patient's age into the heat model — Stage 3
  creates the state and `l2/resp/**` is not FU-10's to touch)
- Create: `packages/engine-core/test/l2/thermal/fu10-thresholds.test.ts`
- **Overlap:** none in `l2/thermal/**`; the `l2/endo/pipeline.ts` lines are FU-10's own (FU-7 does not edit that file).

**Why (research/14 E5/E6, ET-01b TW, ET-03a MI):** `thresholds()` extrapolated the awake → GA line to depth 1.5, so
2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction threshold at 34.55 °C and the plateau at **6.2 h** (Sessler
3–4 h); and no threshold had an age term, so the 80-year-old differed from the 40-year-old only through MAC-age
(34.73 vs 34.82 °C at 4 h).

**Mechanism (D5):** cap the depth the thresholds read at the GA row (`THR_DEPTH_MAX`), and shift the two cold-defence
thresholds by −1 °C from 60 to 80 y (Kurz 1993 [VERIFY]). The linear-phase RATE is not touched.

**Measured (prototype):** vasoconstriction onset **4.93 h at 34.80 °C** (was 6.17 h at 34.55), the plateau flat
(hours 4–5 **−0.081** °C/h, was −0.153 — now inside the "quiet ±0.1" item), hours 2–3 unchanged at −0.291; elderly minus
adult at 4 h **−0.15 °C** (was −0.09). The same rig with the ET-29 surgical exposure (uncovered 30 min, wet prep 15 min)
plateaus at **2.85 h** and loses 0.37 °C/h with an open wound — the band's own conditions. `it.fails` kept with their
numbers: the draped rig's `vasoOnsetH` 4.93 h (band 3–4), `vasoOnsetC` 34.80 °C (band 34.3–34.7), `rateH2to3` −0.291
(band −0.3 to −0.5), ET-03a `d4h` −0.15 (band beyond 0.2). ET-03a's `dVasoOnset` stays MI: the elderly patient's lower
threshold is not crossed inside the cell's 7 h window (the shift itself is asserted in the unit test).
**FU-4 check:** ET-01a (hour 1 −1.18), ET-02 (warmed 36.18/34.55 at 3 h), ET-03b (child −1.54), ET-08a/b, ET-09a/c and
the shivering cut-off unchanged; `test/l2/thermal/shiver-cutoff.test.ts` green."""

TAILS['A3'] = r"""- [ ] **Step — the test.** Create `test/l2/thermal/fu10-thresholds.test.ts`: (1) `thresholds(1.5, 0)` equals
  `thresholds(1, 0)` (the GA row is the floor) while depth 0.5 still interpolates; (2) `ageShiftC` 0 at 40 and 60 y,
  −0.5 at 70 y, −1 at 80 y and beyond; (3) the vasoconstriction and shivering thresholds carry the age shift and the
  sweating threshold does not; (4) an 80-year-old thermal state built through `createThermal(…, ageY)` reports the shifted
  thresholds, and a state restored from a pre-FU-10 snapshot (no `ageY`) behaves as a 40-year-old.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/l2/endo test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-01a ET-01b ET-02 ET-03a ET-03b ET-08a ET-09a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the thermoregulatory thresholds stop at the GA row and fall with age (FU-10 E5, E6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A4'] = r"""### Task A4: E8 — the insulin–dextrose row moves glucose (7e adapters; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-insulin-dextrose.test.ts`.
**Overlap:** FU-7 Task 9/18 edit `adapters.ts`'s `readEndoInputs` (the `epiExoPgMl` line) and FU-9 A4 its `writeBlood`
and imports; this task edits `observeDoses` and the import line (FU-7 Task 18 also edits the import: whichever lands
second re-anchors on the merged line — the change is one added name).

**Why (research/14 E8, ET-31 IN):** the hyperkalaemia treatment row `insulinDextrose` moved K⁺ −0.88 and glucose
**0.00 for 3 h**, while the same doses given as the two separate rows gave +6.9 then −2.4 mmol/L — one treatment, two
answers. 7e observed only the `insulin` and `dextrose` agent ids (`adapters.ts:102–107`).

**Mechanism (D6):** `observeDoses` expands the combined row into its insulin and its dextrose for the GLUCOSE model
only (2.5 g per unit, the row's own regimen); 7c keeps its K⁺ curve, so the sourced hyperkalaemia time course is
untouched.

**Measured (prototype):** ET-31 `comboMax` **+6.93**, `comboMin` **−2.42** — identical to the two-row arm (IN → PL on
both graded items). `dKcombo60` −1.18 against the two-row arm's −0.84 (before: −0.88): the dextrose's own insulin
SECRETION now adds 7e's endogenous K⁺ shift on top of 7c's treatment curve. That row becomes an `it.fails` with its
number and Ali's question 4; no constant is changed (R45). **FU-4 check:** `test/engine/blood-hyperk.test.ts` and
`blood-ecg.test.ts` (the burns + suxamethonium hyperkalaemia rig, where insulin–dextrose must still lower K⁺ ≥ 1 in
30 min) green — measured 1.42."""

TAILS['A4'] = r"""- [ ] **Step — the test.** Create `test/l2/endo/fu10-insulin-dextrose.test.ts`: through `observeDoses`, a
  `insulinDextrose` 10-unit dose raises glucose at once and then drives it below baseline, and the same doses as
  `insulin` + `dextrose` give the same course to within 0.1 mmol/L; a dose in another unit is ignored.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/blood-hyperk.test.ts test/engine/blood-ecg.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-31 ET-20b ET-22` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the insulin-dextrose row reaches the glucose model (FU-10 E8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A5'] = r"""### Task A5: E12(a) — the insulin nadir comes at its published time (7e glucose; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/params.ts`; create
`packages/engine-core/test/engine/fu10-insulin-nadir.test.ts` (SLOW → `SLOW` + `SLOW_A`) and modify `vite.config.ts`.
**Overlap:** none (FU-8 B1 changes the insulin ROW's infusion reference in `l2/pk`, not the minimal model).

**Why (research/14 E12, ET-20a TS):** 10 units IV reached its nadir at **13.3 min**; the insulin-tolerance-test
literature puts it at 20–30 min and research/12 at 40–60. The bolus enters the insulin space at once and the remote
compartment's p2 was 0.025/min, faster than Bergman's own estimates (0.01–0.02/min).

**Mechanism:** p2 at the sourced lower end (0.016/min [VERIFY]); the steady-state insulin action (`SI`) is unchanged, so
only the LAG moves.

**Measured (prototype):** nadir **15.3 min / 3.13 mmol/L** (was 13.3 / 2.92); the counter-regulation stays in band
(adrenaline ×11.4, HR +13.4 — ET-20c PL); the diabetic insulin infusion −2.2 mmol/L/h (ET-18c PL) and D50 (ET-22) hold.
The band is still not reached → `it.fails` "nadir 20–30 min (ITT) — measured 15.3 min", with Ali's question 5, and the
gate note records that closing the rest needs the insulin's own disposition (7g's row, FU-8 B1), not a smaller p2:
p2 0.013 reaches 16.7 min but takes the adrenaline response out of its band (9.4, band 10–20)."""

TAILS['A5'] = r"""- [ ] **Step — the test.** Create `test/engine/fu10-insulin-nadir.test.ts` (the ET-20 rig: awake, spontaneous, room
  air, 10 units IV): the nadir is below 3.9 mmol/L, comes later than 14 min and the adrenaline peak is 10–20 × basal;
  plus an `it.fails` "nadir at 20–30 min — measured 15.3".
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-insulin-nadir.test.ts test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-20a ET-20b ET-20c ET-18c ET-21a ET-22 ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the remote insulin compartment at its published rate constant (FU-10 E12a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A6'] = r"""### Task A6: E10 + E13 — etomidate suppresses cortisol synthesis; adrenal insufficiency is a basal deficit (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,hormones,effects,core,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-adrenal.test.ts` and `packages/engine-core/test/engine/fu10-adrenal.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-7 Task 9 adds `sympDrug`/`catReserve` and Task 18 a `cortExo` argument to the SAME `stressEffects(…)`
signature and the same `stepHormones({…})` call. **Coordination:** FU-10 adds `cortBasalF` as a FIELD of
`HormoneInputs` and changes `cortResponse` to a function call — FU-7's `cortExo` is a fourth POSITIONAL argument of
`stressEffects`. Whichever lands second re-anchors on the merged line and keeps both (the merged call is
`stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c), x.cortExoNmolL ?? 0)`), which is
stated here so neither executor deletes the other's argument.

**Why (research/14 E10/E13, ET-34 MI, ET-15a TW):** etomidate did not touch the adrenal (cortisol at 4 h 1582 vs
propofol's 1575; `cortResponse` was set only by the adrenal profile, `core.ts:118,173`, although `hormones.ts`'s header
names etomidate). Adrenal insufficiency changed nothing at rest or after induction (MAP 73.7 in both arms), because
`cortResponse` 0.5 halved only the stress RISE.

**Mechanism (D8, D9):** (a) 7e observes an etomidate dose and keeps an 11β-hydroxylase suppression state that recovers
with t½ 8 h and multiplies the adrenal's cortisol RESPONSE; (b) the adrenal-insufficiency profile lowers the BASAL
cortisol (×0.5) and cortisol below basal costs resting systemic resistance (cortisol's permissive effect, below basal
only).

**Measured (prototype):** ET-34 cortisol at 4 h **1031 vs 1575 = 0.655** (the report's §7 item: ≤ 0.8). ET-15a:
post-induction MAP **70.19 vs 73.73**, surgical MAP **−4.4** (band beyond 5 → `it.fails` with the number), phenylephrine
**0.68** of normal (band ≤ 0.8), cortisol **233 vs 532** nmol/L. The healthy patient is untouched: ET-16a/b/c
bit-identical (cortisol peak 1544 at 5 h, `cortF5vsF0` −0.07). This is the basal deficit FU-7's hydrocortisone (D13)
reverses; the mineralocorticoid volume deficit is Task B4.
**FU-4 check:** `audit:physiology` unchanged (no healthy-patient path moves); `test/engine/endo-circ-acceptance.test.ts`
green."""

TAILS['A6'] = r"""- [ ] **Step — the tests.** Create `test/l2/endo/fu10-adrenal.test.ts`: (1) `cortResponseOf` is 1 for a normal patient,
  0.5 for the profile, 0.4 after a full etomidate dose and 0.2 for both; (2) the suppression halves in ≈ 8 h; (3)
  `cortBasalF` lowers the resting cortisol and `svrF` falls below 1 with it, while a HIGH cortisol never raises `svrF`.
  Create `test/engine/fu10-adrenal.test.ts`: etomidate 0.3 mg/kg vs propofol 2 mg/kg under 4 h of surgical stimulus →
  cortisol ratio ≤ 0.8; the adrenal-insufficiency patient's MAP after induction is lower than normal and phenylephrine
  100 µg raises it ≤ 0.8 × the normal patient's rise, with the `it.fails` for the surgical arm (−4.4 vs beyond 5 mmHg).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-adrenal.test.ts test/engine/endo-acceptance.test.ts test/engine/endo-circ-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-34 ET-15a ET-16a ET-16b ET-16c ET-26b` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): etomidate suppresses the cortisol response; adrenal insufficiency is a basal deficit (FU-10 E10, E13)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A7'] = r"""### Task A7: E7(a–c) — insulin deficiency: the omitted basal insulin, ketogenesis and the DKA potassium (7e → 7c; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/types-endo.ts`, `src/l2/endo/{core,params,adapters}.ts`,
`src/l2/blood/core.ts` (**E-FU10-2**: one line), `test/l2/endo/core.test.ts` (**E-FU10-4**: the `T1` fixture);
create `packages/engine-core/test/l2/endo/fu10-insulin-deficit.test.ts` and
`packages/engine-core/test/engine/fu10-insulin-omission.test.ts` (SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-9 A3/A5/A6 edit `l2/blood/core.ts` (citrate clearance, the COP calibration, the K⁺ set point on
total-body K) — this task adds ONE line after the `drug` K⁺ line, which FU-9's A6 block also quotes: whichever lands
second re-anchors on the merged statement (the added line is independent of the K⁺ set point itself). FU-8 A16 carries
`basalInsulin` into the scenario schema (Requests).

**Why (research/14 E7, ET-18a NE, ET-18b MI, ET-23c WR, ET-23d PL-for-the-wrong-reason):** the type 1 profile always
carried its basal insulin (`core.ts:101–104`), so the commonest teaching case — the missed dose — was not expressible;
insulin deficiency made no ketones (DKA was only 7c's instructor condition and an INPUT to 7e); and the instructor's
DKA presented HYPOkalaemic (K⁺ 3.70 against the healthy twin's 4.18), because the two DKA causes of hyperkalaemia
(insulinopenia and hyperosmolality) had no path — 7e's K⁺ term read only SECRETED insulin above basal.

**Mechanism (D7):** (a) `endo.basalInsulin: false` omits the long-acting insulin of a type 1 patient; (b) the insulin
deficit 7e already integrates (`egpDef`) drives a ketoacid production rate into 7c's pool through one new seam
(`blood.core.endoKetoMmolMin`), so the acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive emerge from
7c's own chemistry; (c) the deficit and hyperosmolar hyperglycaemia shift K⁺ out of the cells, with the instructor's
`dka` condition counting as insulinopenia.

**Measured (prototype), type 1 with the basal insulin omitted, 6 h:** glucose **7.2 → 32.3 mmol/L**, insulin 0,
ketoacids **99 mmol (≈ 5.8 mmol/L), `dkaSeverity` 0.28**, pH **7.41 → 7.34**, K⁺ **4.18 → 5.5**. The same patient WITH
its basal insulin is unchanged (glucose 7.2, ketones 0, K⁺ 4.17). The instructor's `dka 1`: K⁺ **4.49 vs the healthy
4.18** (was 3.70) and intubation's acidaemia adds **+0.48** (was +0.04). ET-18a/18b stay NE/MI in the published runner
(its arms carry the basal insulin; the executor adds `endo.basalInsulin: false` to its scratch copy and quotes the
numbers). Recorded for Ali: full ketoacidosis takes ≈ 8 h, slower than the guidelines' "within hours" for a missed
dose — the rate constant is [ENG] and is Ali's calibration row, not tuned here.
**FU-4 check:** `test/engine/blood-k-rhythm.test.ts`, `blood-hyperk.test.ts`, `blood-sanity-acid.test.ts` green; the
healthy and type 2 patients have `egpDef` 0, so every non-diabetic row is bit-identical (ET-16c, ET-17, ET-20a–c)."""

TAILS['A7'] = r"""- [ ] **Step — the tests.** Create `test/l2/endo/fu10-insulin-deficit.test.ts`: (1) `glucoseProfile` gives a type 1
  patient its basal insulin by default and none when `basalInsulin: false`; (2) after 2 h without it, `egpDef` > 0.4,
  `out.ketoMmolMin` > 0.15 and `out.kShift` > 0.5; (3) a patient on basal insulin keeps `ketoMmolMin` 0 and `kShift` 0;
  (4) the instructor's `dkaSeverity` 1 alone raises `kShift` above 1. Create
  `test/engine/fu10-insulin-omission.test.ts`: type 1 with the basal insulin omitted over 6 h — glucose above
  20 mmol/L, 7c's ketoacids above 3 mmol/L, `blood.out.dkaSeverity` > 0.15, K⁺ above the control's, and the control arm
  (basal insulin on) unchanged.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/fu10-insulin-omission.test.ts test/engine/blood-k-rhythm.test.ts test/engine/blood-sanity-acid.test.ts test/engine/blood-hyperk.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-18 ET-23 ET-20a ET-20b ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e,7c): insulin deficiency makes ketones and shifts potassium; the type 1 basal insulin can be omitted (FU-10 E7, E-FU10-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['A8'] = r"""### Task A8: E11(a) — a fever is a heat source the anaesthetised patient cannot defend (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,core,pipeline}.ts`, `src/l2/thermal/heat.ts`; create
`packages/engine-core/test/l2/endo/fu10-fever.test.ts` and `packages/engine-core/test/engine/fu10-fever.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** none (`l2/thermal/**` is FU-10's; the `l2/endo` lines are FU-10's own).

**Why (research/14 E11, ET-12 TW, ET-13a TW):** the sepsis and thyroid-storm rows raise the SET POINT (+2.2 / +1.8 °C),
but an anaesthetised, vasodilated patient has no effector to defend a set point, so under GA in a 21 °C theatre the
septic core sat at **36.86 °C** and the storm's at **36.58 °C** while the tables ask for 38.5–41 °C.

**Mechanism (D5 of the report's §3):** the inflammatory/thyrotoxic heat becomes a direct HEAT SOURCE (W), sized by the
same set-point shift the rows already declare, added to the heat balance beside the metabolic multiplier. VO₂/VCO₂ stay
the rows' own `vo2F`, so no metabolic number is counted twice.

**Measured (prototype):** the septic patient under GA reaches **38.50 °C** at 90 min (band 38.5–41, the edge);
`dEtco2` +10.1 at fixed ventilation; VO₂ 16.7 %/°C and HR 12.0 /°C (the ET cell's confounded per-°C items stay out of
their bands and keep their `it.fails` — the ET report's own HAND note explains why the rig cannot isolate them). The
thyroid storm reaches **37.61 °C at 1 h and 38.16 °C at 80 min** → `it.fails` "38.5–41 °C at 1 h — measured 37.61"
with the trade-off recorded for Ali: a source large enough to reach 38.5 °C at 1 h (170 W) takes the storm's heart rate
to 185 bpm, above its own 140–180 band (measured), so the size stays at the sepsis fit.
**FU-4 check:** ET-30 (iatrogenic overwarming to 38.31 °C with sweating from 38.0) unchanged; every non-febrile patient
has `setShiftC` 0, so `pyrogenW` is 0 and all thermal rows are bit-identical (ET-01a/b, ET-02, ET-04)."""

TAILS['A8'] = r"""- [ ] **Step — the tests.** Create `test/l2/endo/fu10-fever.test.ts`: `out.pyrogenW` is 0 without a condition, rises
  with the sepsis/storm set-point shift, saturates at the reference shift and scales with body weight. Create
  `test/engine/fu10-fever.test.ts`: the septic patient under the GA flag at 21 °C passes 38 °C within 90 min while the
  healthy control cools, with the `it.fails` for the storm arm at 1 h.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/thermal test/engine/fu10-fever.test.ts test/engine/endo-acceptance.test.ts test/engine/thermal-warmer.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-12 ET-13a ET-13b ET-26a ET-26b ET-28 ET-30 ET-01a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): pyrogens are a heat source, so a septic or thyrotoxic patient is febrile under anaesthesia (FU-10 E11a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""

TASKS['B2'] = r"""### Task B2: E2 — aerobic muscle heat is limited by the oxygen delivered, so the core stops rising after the arrest (7e thermal; PROTOTYPED, requires FU-9 A2)

**Precondition:** FU-9 A2 (`l2/blood/oxygen.ts`: VO₂ is supply-dependent only below DO₂crit) must be on main. Check it
with `git log --oneline origin/main -- packages/engine-core/src/l2/blood/oxygen.ts` and
`git grep -n "FU-9 F3" -- packages/engine-core/src/l2/blood/oxygen.ts`. If it is absent, STOP and report: on today's
main this task is wrong (D12, numbers below).

**Files:** Modify `packages/engine-core/src/l2/thermal/heat.ts`, `src/l2/endo/adapters.ts`; create
`packages/engine-core/test/engine/fu10-mh-heat-limit.test.ts` (SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-9 A4 edits `adapters.ts`'s `writeBlood` and its `BloodLike` type — this task adds one property to the
same type (`o2`) and one line in `readEndoInputs`; whichever lands second re-anchors on the merged type.

**Why (research/14 E2, ET-10g/ET-M2):** untreated MH arrests at +45 min at ≈ 42.5 °C (FU-4 G8's hazard, right) and the
dead patient then keeps heating to **44.3 °C at 60 min and 47.8 °C at 90 min** in VF and asystole, because the MH and
shivering heat (`heat.ts:145–146`) are independent of perfusion.

**Mechanism:** both are AEROBIC muscle heat, so scale them by 7c's delivered fraction of the oxygen demand
(`o2.vo2 / o2.demand`, 1 without 7c): heat stops when the circulation does.

**Measured (prototype, with FU-9 A2's line in place):** the pre-arrest course is unchanged to the second — EtCO₂ doubles
at 860 s, core +0.174 °C/min, K⁺ 5.75 at 20 min, pH 6.98 at 30 min, VF at **+45 min (2680 s)** — and the core peaks at
**42.34 °C** instead of 47.77 (MANUAL twin 42.17 vs 47.77). The dantrolene rows are unchanged (t½ 440 s, peak +14 min,
temperature falls). Shivering VO₂ at a cold emergence 56.9 % (was 58.97; TW either way, Ali Q1).
**Without FU-9 A2 (why this is Part B):** the same change gives core +0.057 °C/min, **no arrest at all** and a peak of
40.0 °C — FU-4's hyperthermic-arrest hazard would be lost.
**FU-4 check:** `test/engine/circ-lowflow-arrest.test.ts`, `clinical-suite.test.ts` and `audit:physiology` green; the
arrest times unchanged."""

TAILS['B2'] = r"""- [ ] **Step — the test.** Create `test/engine/fu10-mh-heat-limit.test.ts` (the ET-10 rig, instructor MH severity 1,
  90 min, no treatment): the patient arrests at 40–50 min, the core peaks below 43.5 °C, and the peak comes within 5 min
  of the arrest; plus a perfusing arm (MH treated at +15 min) whose 15-minute course matches the pre-FU-10 numbers to
  0.05 °C, so the limit is inert while the circulation works.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/endo test/engine/fu10-mh-heat-limit.test.ts test/engine/circ-lowflow-arrest.test.ts test/engine/clinical-suite.test.ts` → green;
  `npx -y pnpm@9.15.9 run audit:physiology` → the arrest table unchanged.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2 ET-05a ET-05c` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): MH and shivering heat follow the oxygen delivered, so a dead patient stops heating (FU-10 E2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`"""
