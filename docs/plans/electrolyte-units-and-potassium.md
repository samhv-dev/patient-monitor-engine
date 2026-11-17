# Electrolytes in their own units, and potassium chloride on the pump (plan)

Status: plan, not built. Written on `068c7130` (main, 17 November 2026). Every number below carries its source, or is
marked **placeholder** with what would replace it, or **[mine]** where it is the planner's own clinical or physical
reasoning.

## 0. The ruling, and what this plan settles

Electrolytes are prescribed in millimoles or milliequivalents. The learner remote's host accepts no syringe or bag in
those units, so potassium chloride cannot be prepared at all, and the other electrolytes are entered in whatever unit
was built for each. The owner ruled that the host accepts mmol and mEq syringes and bags, on three conditions:

1. **Valence, per drug, for every electrolyte.** mmol and mEq are never confused. For K⁺, Na⁺ and HCO₃⁻ they are
   equal; for Mg²⁺ and Ca²⁺, 1 mmol is 2 mEq.
2. **The concentrate and its diluent come from a source.**
3. **The engine's potassium response to an intravenous load is checked against sources BEFORE the syringe is
   offered.** A too-fast infusion must harm the simulated patient as it would a real one.

This plan settles the five points of brief 303:
- the units (§2);
- the product (§3);
- the engine's response, measured against the sources (§4);
- the devices' safeguards (§5);
- the pieces and their order (§6).

The questions for the owner are in §7, and the lines this plan makes stale in other plans are in §8.

Two pieces of other work this plan fits around and does not repeat:
- **Brief 321** (remote Start runs on a pump channel). The remote's Start loads and starts a free channel of the rack,
  through the host's own channel checks; the learner picks the syringe or the set, and the channel's range applies.
  A KCl preparation reaches the patient by that path like any other drug. This plan supplies only what that path
  needs for KCl: a preparation the host accepts in mmol, and a channel programme in mmol/mL. Nothing here builds a
  second way to start an infusion.
- **PR 522** (`tci-maximum-per-syringe`) puts the SP5 family's per-syringe rates (research/86 TC-08) into the device
  data. This plan reads those numbers and does not set them.

## 1. Inventory on 068c7130: where an electrolyte's unit lives today

| Where | What it does with units | File and line |
|---|---|---|
| Engine drug rows | ONE amount unit per row: calcium chloride `mg`, calcium gluconate `mg`, magnesium sulfate `mg`, sodium bicarbonate `mmol`, potassium chloride `mmol`, hypertonic saline `mL` (with `concentrationPct`) | `packages/engine-core/src/l2/pk/data/rows-other.ts:21–48` |
| Engine unit conversion | `mEq → mmol` is taken as equal for EVERY drug: "Monovalent (HCO3⁻); the blood model converts divalent ions". A divalent row is in `mg`, so a mEq dose of Mg or Ca is refused ("unit mEq does not fit a drug dosed in mg"), not mis-converted. The trap is latent: it bites the day a divalent row is moved to mmol | `packages/engine-core/src/l2/pk/units.ts:15` |
| Engine event types | `DoseUnit` has `mEq`, `mmol`, `mmol/kg`; `RateUnit` has `mmol/h`; a pump channel's `PumpConcentration.unit` has `mmol`; the channel-less `infusion` event's `concentration.unit` does NOT (`mg mcg units g`) | `packages/engine-core/src/types-pk.ts:5–6, 16, 24` |
| Blood model, salt → ion | Mass of salt → mmol of ion by two constants: `CA_MMOL_PER_G = { calciumChloride: 6.8, calciumGluconate: 2.3 }`, `MG_MMOL_PER_G = 4.06`. They live in two files, with no valence and no source field | `packages/engine-core/src/l2/blood/treatments.ts:62`, `l2/blood/params.ts:170`; read at `l2/blood/pipeline.ts:140, 162, 385, 391` |
| Blood model, the drug sheet's units | A second table of the units each electrolyte accepts: `calciumGluconate: ['g','mg'], sodiumBicarbonate: ['mmol','mmol/kg'], magnesium: ['g','mg']` | `l2/blood/pipeline.ts:278` |
| KCl in the engine | A K⁺ and Cl⁻ load on the ECF pool, in mmol (bolus or infusion); a warning above `maxRatePerH` 20 mmol/h and for any bolus; the dose is given as ordered | `l2/blood/pipeline.ts:149–154`; `l2/pk/pipeline.ts:401–420`; row `rows-other.ts:36–39` |
| Formulary schema | A concentration's unit may be `mmol` or `mEq` per mL or L; a strength's unit is free text | `packages/controller/formulary/schema.json:38, 63` |
| Host, learner preparations | `DOSE_UNITS` (a bolus) includes `mEq` and `mmol`; `SYRINGE_UNITS` (an infusion) is `mg mcg units g`. So a mmol or mEq preparation can be pushed but never infused: "the pump takes no potassiumChloride syringe in mmol" | `packages/controller/src/session/preparations.ts:29–31, 171` |
| Host, pump rack | A channel's concentration may be in `mmol`; `inUnit` takes `mEq` as equal to `mmol` for every drug ("monovalent, as the engine's units.ts reads it"): the same latent trap as the engine's | `packages/controller/src/session/pump-host.ts:21, 61, 66–71` |
| Instructor's drug picker | KCl opens on Infusion, 10 and 20 mmol/h; a `mmol` row offers only `mmol/h` | `apps/demo/src/app/drugs.ts:50–53, 89` |
| Formulary coverage | KCl is in `pending.json` and in the coverage test's shrink-only `WANTED` table: "the labels read name no diluent, and the host takes no mmol or mEq syringe" | `packages/controller/formulary/pending.json:15`; `apps/demo/src/app/formulary-coverage.dom.test.ts`; `scratch/handoff/270.md` |
| The reference pumps | SP5 family: the drug library is a list of names ("2,000 kinds of drugs"; No. 33 "potassium chloride"); Body Weight Mode's drug-amount units are "g/mg/μg/ng/IU", dose-rate units ng, μg, mg, IU per kg per h or min. No mmol, no mEq. SP-500: whether it takes a dose rate is a gap (SP-27). OT-701: rate in mL/h or drops/min | research/86 M1 p. 5-2 (PDF 43), §6.2, C.5; `packages/controller/pump-devices/sp-500.json` `doseRate`; research/50 |

What the inventory says:
- The engine already models KCl, and it already runs on a pump channel in mmol/mL.
- What is missing for the learner is the host (`SYRINGE_UNITS`) and the formulary entry.
- What is missing for every electrolyte is ONE place holding the valence and the salt's molar mass, with sources.
  Today two constants do this for Ca and Mg, and two `mEq ≡ mmol` lines assume every ion is monovalent.

## 2. Units

### 2.1 One place per drug: the electrolyte table

**Where it lives.** A data file in the engine, `packages/engine-core/src/l2/pk/data/electrolytes.json`, with one entry
per electrolyte drug id, and one module beside it, `l2/pk/electrolytes.ts`, that loads it and exports the one
conversion function. The engine is the right home because the engine's rows already own a drug's amount unit, and
both the controller and the demo already import from `@pme/engine-core` (`pump-host.ts:10`). The controller's
formulary describes PRODUCTS (strengths, diluents, stability). It does not describe the ion, and it does not get a
copy of the table.

**An entry's fields:**

| Field | Meaning |
|---|---|
| `drugId` | the engine row's id |
| `ion` | the ion the dose is counted in: `K+`, `Mg2+`, `Ca2+`, `Na+`, `HCO3-` |
| `valence` | the magnitude of the ion's charge, 1 or 2 |
| `salt` | the salt AS LABELLED, with its water of hydration (for example `MgSO4·7H2O`) |
| `saltMolarMass` | g/mol of that salt, with `src` |
| `ionPerSalt` | moles of the counted ion per mole of salt (1 for every salt in the table) |
| `labelMmolPerG` | the label's own figure, where a label prints one (for example "8 to 24 mEq (1 gram to 3 grams)"), with `src`: the cross-check of `saltMolarMass` |
| `prescribed` | the unit a clinician prescribes it in, with `src` |
| `labelUnits` | the units the product labels use, per issuer, with `src` |

**A check at load time, and a CI test:** `1000 × ionPerSalt / saltMolarMass` must agree with `labelMmolPerG` to
within the label's own rounding. The rounding is the printed figure's last digit: "8 to 24 mEq (1 gram to 3 grams)"
gives 8.0 ± 0.5 mEq/g. An entry whose two figures disagree fails the build. This is how a hydrate mistake is caught
(MgSO₄ anhydrous would give 16.6 mEq/g).

**The one conversion.** It has the form

`convert(drugId, amount, from, to) → number | refusal`

for any `from`/`to` in `g mg mcg mmol mEq`, per kg or not. For example, 2 g of magnesium sulfate in mEq is
2 g × 4.06 mmol/g × 2 = 16.2 mEq. Every place in §1 calls it. The following go:
- the two `mEq ≡ mmol` lines;
- `CA_MMOL_PER_G` and `MG_MMOL_PER_G`;
- the per-drug unit list at `blood/pipeline.ts:278`. Its contents become "the units this table converts", so the
  list cannot drift.

**Refused, with words, and never guessed:**
- `mEq` for a drug with no entry: "magnesium has no valence in the electrolyte table" (the day an entry is missing).
- `mEq` of a polyvalent ion whose charge depends on pH (phosphate, ≈ 1.8 at pH 7.4 [mine, from its pKa₂ 7.2]).
  Phosphate is not in the drug library today. If it is added, it is counted in mmol only, and `mEq` is refused.
- Mass of the ion (for example "mg of elemental calcium") against mass of the salt. A dose "in mg" always means mg of
  the SALT as labelled. "9.3 mg elemental calcium per mL" on a gluconate label is read as a cross-check, never as a
  dose unit.
- `mL` without a concentration (as today).

**Rounding [mine].** The table holds the full figures. Display rounds to the label's own precision (one decimal for
mmol and mEq, two significant figures below 1). The engine never rounds.

### 2.2 How each place writes and converts

| Place | Writes | Converts |
|---|---|---|
| The bench (learner remote) | The product's strength in the label's own unit ("Potassium chloride 2 mmol/mL", "Magnesium sulfate 500 mg/mL (2.03 mmol/mL Mg²⁺)"). The ion line appears whenever the label unit is a mass | none: it shows the formulary's strength and the table's derived line |
| The tray (a staged preparation) | Total amount and concentration in the product's unit, with the ion in mmol beside it when they differ | through the host, which owns the arithmetic (as now: "nothing the device sends is trusted as a quantity") |
| The pump programme (rack) | Concentration in the programme's unit, mmol/mL for KCl. Dose rate in mmol/h | `pump-host.ts rateMlH` and `doseMl` call the table instead of `inUnit` |
| The device faces | What the device does. The SP5 family has no mmol unit (§1). On an SP5 skin, KCl runs in Rate Mode, mL/h, with the drug's name from the library and no dose rate. The generic face shows the dose rate in mmol/h beside the mL/h, as it does for mg drugs. SP-500: its dose-rate gap (SP-27) decides | none on the device |
| The host's checks | A syringe or bag in `mmol` or `mEq` is accepted for a drug in the table. `mEq` is converted to mmol of the ion by the valence before the engine sees it. The engine receives mmol only, never mEq | `preparations.ts`, `SYRINGE_UNITS` replaced by "units the table converts for this drug, or a mass/units drug as today" |
| The Log | The amount in the unit given, then the ion in mmol when they differ: "Magnesium sulfate 2 g (8.1 mmol Mg²⁺) iv over 20 min", "Potassium chloride 20 mmol/h (0.4 mmol/mL, 50 mL/h)" | the table |
| The Debrief | As the Log, and the rate against the label maximum with its issuer (§5) | the table |

### 2.3 The electrolyte table

Atomic weights are the IUPAC standard atomic weights (abridged, CIAAW 2021): K 39.098, Cl 35.45, Na 22.990,
Mg 24.305, Ca 40.078, S 32.06, O 15.999, H 1.008, C 12.011. This source is to be cited by the piece (U1) that writes
the data file. The molar masses below are the planner's arithmetic from those weights, marked [mine], and checked
against the label figure in the last column.

| Drug (engine id) | Prescribed in | Label units (issuer: words) | Ion, valence | Salt as labelled, molar mass | Label cross-check |
|---|---|---|---|---|---|
| Potassium chloride (`potassiumChloride`) | mmol (UK, EU), mEq (US): the same number, valence 1 | US concentrate: "Each mL ... contains 2 mEq of K⁺ and Cl⁻ equivalent to 149 mg of potassium chloride" (DailyMed bf8e8ac7). UK: "15% of Potassium Chloride in 10 ml"; "20 MMOL potassium per hour" (EMC 6272). UK glucose-KCl: "1g KCl = 525 mg of K⁺ or 13.4 mEq or 13.4 mmol of K⁺" (EMC 1858) | K⁺, 1 | KCl, 74.55 [mine] | 1000/74.55 = 13.41 mmol/g; label "13.4 mmol" (EMC 1858) and 149 mg = 2.00 mmol (DailyMed bf8e8ac7): agree |
| Magnesium sulfate (`magnesium`) | g (obstetrics, anaesthesia); mmol in UK and EU practice; mEq on US labels | US: "Magnesium Sulfate 50% (500 mg/mL)"; "8 to 24 mEq (1 gram to 3 grams) daily" (DailyMed d4b5863a, the formulary's `dailymed-magnesium`) | Mg²⁺, 2 | MgSO₄·7H₂O, 246.47 [mine] | 1000/246.47 = 4.06 mmol/g = 8.11 mEq/g; label 8 mEq per g: agrees (the engine's `MG_MMOL_PER_G` 4.06) |
| Calcium chloride (`calciumChloride`) | g or mg (10 %); mmol in UK | EMC 4126 (the formulary's monograph; its mmol line to be read by U1: **placeholder**) | Ca²⁺, 2 | CaCl₂·2H₂O, 147.01 [mine] | 1000/147.01 = 6.80 mmol/g (the engine's 6.8). The label line is read in U1 |
| Calcium gluconate (`calciumGluconate`) | g or mg (10 %); mmol in UK | The row's own string "4.65 mEq Ca per g" (rows-other.ts:22, source "7c plan decision 8"); no formulary file yet (pending) | Ca²⁺, 2 | As labelled: the label's hydrate decides. Anhydrous C₁₂H₂₂CaO₁₄ 430.37 gives 2.32 mmol/g; the monohydrate 448.39 gives 2.23 mmol/g [mine] | The engine's 2.3 sits between them. 4.65 mEq/g = 2.325 mmol/g matches the anhydrous figure, not the monohydrate. **To settle in U1 from the label U1 reads.** The value moves by up to 3 % and a validation re-run shows what that moves |
| Sodium bicarbonate (`sodiumBicarbonate`) | mmol or mEq (equal); mL of 8.4 % | "84 mg is one mEq each of Na⁺ and HCO₃⁻ (HCO₃⁻ is univalent: 1 mEq = 1 mmol)" (formulary `dailymed-sodiumbicarbonate-hospira`) | HCO₃⁻ (and Na⁺), 1 | NaHCO₃, 84.01 [mine] | 1000/84.01 = 11.90 mmol/g; label 84 mg per mEq: agrees |
| Hypertonic saline (`hypertonicSaline`) | mL of a stated %; mmol of Na⁺ in some protocols | the row takes mL and `concentrationPct` 3, 7.5, 23.4 (types-pk.ts:15) | Na⁺, 1 | NaCl, 58.44 [mine] | 3 % = 30 g/L = 513 mmol/L [mine]. A label line is read by the F3 batch (the drug is pending) |
| Phosphate | not in the library | — | HPO₄²⁻/H₂PO₄⁻, charge depends on pH | — | mmol only, mEq refused (§2.1) |
| Sodium (as a drug) | see hypertonic saline; the crystalloids are diluents, not drugs | the diluent files (`formulary/diluents/*.json`) | Na⁺, 1 | — | the diluents keep their own composition in mmol/L |

## 3. The product: potassium chloride

### 3.1 The products that exist, from labels and regulators' product summaries

All read on 17 November 2026; the files are under `assets/formulary-labels-270/` (piece 270) and
`assets/potassium-labels-303/` (this plan; declared in the hand-over).

| Product (issuer, document) | Strength | Dilution, in the label's words | Maximum concentration and route, in the label's words | Maximum rate, in the label's words |
|---|---|---|---|---|
| Potassium Chloride for Injection Concentrate, USP (DailyMed setid bf8e8ac7, Fresenius Kabi product repackaged by Henry Schein; Hospira's 559a0a8c has the same text) | "Each mL ... contains 2 mEq of K⁺ and Cl⁻ equivalent to 149 mg of potassium chloride"; "A more concentrated ... Each mL of this injection contains 3 mEq" (224 mg) | "must be diluted before administration"; "only after dilution in a larger volume of fluid"; "Direct patient injection of potassium chloride at this concentration may be instantaneously fatal" | "in a concentration of up to 40 mEq/L" (when serum K > 2.5) | "a rate not to exceed 10 mEq/hour"; in urgent treatment (K < 2 with ECG changes or paralysis) "a rate of up to 40 mEq/hour ... continuous cardiac monitoring is essential"; "200 mEq" or "400 mEq" in 24 h |
| Potassium Chloride Concentrate 15 % (EMC 6272, UK, hameln pharma ltd, revised 16/09/2024) | "15% of Potassium Chloride in 10 ml" (= 1.5 g = 20.1 mmol [mine]) | "must be diluted with not less than 50 times its volume by adding to a large volume intravenous fluid before use. For example, 10mls diluted with not less than 500mls 0.9% Sodium Chloride Intravenous Infusion BP, or other suitable diluent" | the dilution above, ≤ 40 mmol/L [mine, 20 mmol in ≥ 510 mL] | "The maximal rate of infusion is 20 MMOL potassium per hour"; "not to exceed 2-3 MMOL potassium per kg body weight in 24 hours" |
| Highly Concentrated Potassium Chloride Injection, Viaflex Plus, ready to use (DailyMed setid 092ddee4, Baxter) | the label's table, including 20 mEq/50 mL (400 mEq/L) | ready to use; "Administer intravenously only with a calibrated infusion device at a slow, controlled rate" | "Highest concentrations (400 mEq/L) should be exclusively administered via central intravenous route. Whenever possible, administration via a central route is recommended for all concentrations" | "should not usually exceed 10 mEq per hour or 200 mEq for a 24 hour period if the serum potassium level is greater than 2.5 mEq per liter"; urgent cases "rates up to 40 mEq per hour or 400 mEq over a 24 hour period ... very carefully" |
| Potassium Chloride Injection, flexible container, ready to use (DailyMed setid eb56a807, ICU Medical, 29 Oct 2025) | 10 mEq/100 mL, 10 mEq/50 mL, 20 mEq/100 mL, 20 mEq/50 mL, 40 mEq/100 mL | ready to use, "For Use Only With A Calibrated Infusion Device" | "Highest concentrations (300 and 400 mEq/L) should be exclusively administered via central route" | as Baxter: "should not usually exceed 10 mEq/hour"; urgent "rates up to 40 mEq/hour ... when guided by continuous monitoring of the EKG and frequent serum K⁺ determinations" |
| Potassium Chloride 2.98 % w/v and Sodium Chloride 0.9 % w/v (EMC 102019, UK, B. Braun, revised 13/03/2026) | "Potassium 400 mmol/l"; "particularly adapted for fluid restricted patients" | ready to use | "must be used only via a central venous route" | "Generally, the maximum potassium substitution rate is 20 mmol per hour"; children "0.5 mmol/kg BW per hour should not be exceeded" |
| Potassium Chloride 0.15 %, Sodium Chloride 0.18 %, Glucose 4 % (EMC 15221, UK, B. Braun) | 20 mmol/L | ready to use | the label's table: K > 2.5, "40 mmol/l"; K < 2, "80 mmol/l"; "If infused through a central vein, to avoid localised hyperkalaemia the catheter must not be in the atrium or ventricle" | the same table: "10 mmol/h" (K > 2.5), "40 mmol/h" (K < 2) |
| Potassium Chloride 0.3 %, Sodium Chloride 0.18 %, Glucose 4 % (EMC 1864, UK, Baxter, July 2024) | 40 mmol/L | ready to use | "For peripheral infusions, potassium concentration should be less than 60 mmol/l to avoid pain" | "The rate should not exceed 10 to 40 mmol/h to avoid hyperkalaemia" |

### 3.2 What the labels settle, and where practice differs

- **The concentrate and its diluent (the ruling's condition 2) now have a source.** EMC 6272 names 0.9 % sodium
  chloride and a ≥ 50-fold dilution. The US concentrate names no particular fluid but says that in critical conditions
  KCl "may be administered in saline ... rather than in dextrose containing fluids". Piece 270's "the labels read name
  no diluent" referred to the US label alone.
- **A concentrated potassium solution by syringe or infusion device is supported by labels as a READY-TO-USE
  product, central route only:** 20 mEq/50 mL (Baxter 092ddee4; ICU Medical eb56a807) and 400 mmol/L (B. Braun EMC
  102019). That is 0.4 mmol/mL. No label read here endorses drawing the 2 mmol/mL concentrate into a syringe
  undiluted. Every concentrate label forbids giving it undiluted.
- **Rates differ by issuer:**
  - US labels: 10 mEq/h when K > 2.5, up to 40 mEq/h when K < 2 with ECG monitoring.
  - UK labels: 20 mmol/h for the concentrate and for B. Braun's central 400 mmol/L, and 10/40 mmol/h by serum K for
    B. Braun's dilute bag.
  - The engine's row cites 20 mmol/h (Miller 10e ch. 43; Co-Existing 8e ch. 20).

  The device takes none of these as its own rule (§5). The Debrief shows the label maximum of the issuer of the
  product the learner chose (owner question Q1).
- **Concentration limits differ:**
  - US concentrate: 40 mEq/L peripheral.
  - UK B. Braun: 40/80 mmol/L by serum K.
  - Baxter's UK bag: < 60 mmol/L peripheral.
  - 300–400 mEq/L central only (US premixes and B. Braun).
- **WANTED** (would settle what a critical-care syringe of KCl is in the countries that use one; none was opened):
  - a national critical-care guideline on concentrated KCl by syringe pump (for example a UK Intensive Care Society
    or an Australian and New Zealand intensive-care society document);
  - the WHO "High 5s" concentrated-injectables standard, cited by Ann Pharm Fr 2016 (PMID 26298848) as recommending
    removal of concentrate from wards.

### 3.3 The formulary entry this plan asks for (piece FK, §6)

- **Products:**
  - the US concentrate 2 mEq/mL (DailyMed bf8e8ac7) and the UK 15 % 10 mL (EMC 6272), each a `solution` with its
    strength in its label's unit;
  - the ready-to-use 20 mEq/50 mL (Baxter 092ddee4 or ICU Medical eb56a807) as a stock syringe-sized container for
    the rack (`stock-syringes.json`, the S1 shape), and 40 mEq/100 mL as a stock bag.
- **Diluents:**
  - saline `listed: true` (EMC 6272, and the US label's "in saline");
  - dextrose 5 % `listed: false`, with the US label's reason ("dextrose may lower serum potassium levels") as the
    statement;
  - the rest by Stabilis and Trissel (17th edition), as every F entry.
- **Stability and compatibility:** Stabilis, cross-checked in Trissel, second reading. Nothing here is guessed.
- **What the bench allows:** the resident may draw the concentrate into a syringe undiluted. It is a simulator, and
  this is the error. The bench raises the label's own finding ("must be diluted before administration") with its
  source, as findings do for other drugs (`formulary/findings.ts`). Whether the bench also blocks it is owner
  question Q3.

## 4. The engine's response, measured first

### 4.1 What the engine has

- **The pool.** Potassium enters the ECF pool (`so.k`, plasma plus interstitium: about 14 L at 70 kg,
  `blood/params.ts:137`) instantly mixed. It moves into a finite cellular pool (`so.kIcf`, 140 mmol/L of ICF,
  3 920 mmol at 70 kg) with τ `K_TAU_MIN` 43 min (tables `vK`, "50 % of a K load into cells in 30 min"). It moves
  towards a set point that follows total-body K (`K_TBK_MMOL` 300 mmol per mmol/L, Sterns 1981 [TXT]).
  `l2/blood/solutes.ts:90–109`, `core.ts:176–181`.
- **Shifts.** The set point moves with:
  - the non-organic pH (−4.0 mmol/L per pH unit);
  - insulin (the drug model's PD, or the blood model's curve);
  - β₂ agonists and endogenous adrenaline (`kShift`, `endoKShift`).

  A shift also raises the uptake rate (`K_PUMP_GAIN`, [FIT], research/44 L2-17). `core.ts:166–181`,
  `treatments.ts:41–57`.
- **The kidney.** With the organ model, distal K secretion follows plasma K relative to the set point and √(distal
  flow) (Good & Wright 1979; Young 1988). An oliguric kidney retains K. There is no aldosterone term on K secretion.
  `organs/pipeline.ts:182–195`.
- **The heart.** The ECG reads the membrane-effective K (`kEcg`, calcium-stabilised), with these stages:
  - peaked T from 5.5;
  - P flattening and PR from 6.5;
  - QRS widening from 7;
  - sine wave from 7.8, complete at 8.5 (research 03 §1.6);
  - hypokalaemic U waves below 3.5.

  `l2/ecg/morphology/electrolytes.ts:13–19`. Beyond the ECG:
  - ectopy from K 6.5 (Durfey 2017 severe band; `l2/circ/ectopy.ts:17`);
  - sinus slowing above 7 (`circ/model.ts:65`, [FIT]);
  - an arrest hazard above `K_HAZARD` 8.5 mmol/L at 1/120 s per mmol/L (VF or asystole; `circ/arrest.ts:35–36`,
    [FIT], research/44 L2-05).

### 4.2 The measurement (headless, run once)

A one-off script was run once:
- the engine's own rig, `rig6()`: the modelled adult, 40 y, 70 kg, 175 cm, male, seed 7, the same rig as
  `test/engine/blood-potassium-chloride.test.ts`;
- 60 s of settling, then the load;
- reads at fixed times (a bounded count of steps);
- through the slot helper's light lane, 252 s wall, 17 November 16:54;
- not committed.

The output is kept at `scratch/post-demo-303-probe-output.log`. "K" is `blood.core.out.k` (the labs' value). "kEcg"
is the membrane-effective K the ECG and the arrest hazard read. The ECG columns are the stages of
`hyperK(kEcg)` (0 none, 1 full). The rhythm is the engine's rhythm id. (The heart-rate field the script read is not
the state's name for it and printed nothing; the rhythm column is what this section uses.)

| Load | K (Δ from 4.20) at 5 / 15 / 30 / 45 / 60 min | After it stops: +15 / +30 / +60 / +120 min | Peaked T (stage) | QRS, sine | Rhythm | Into cells by 3 h |
|---|---|---|---|---|---|---|
| 10 mmol/h for 1 h | +0.05 / +0.14 / +0.24 / +0.32 / **+0.37** | +0.27 / +0.19 / +0.11 / +0.05 | none | none | sinus throughout | 9 mmol of 10 |
| 20 mmol/h for 1 h | +0.11 / +0.29 / +0.50 / +0.66 / **+0.77** | +0.56 / +0.41 / +0.24 / +0.13 | none | none | sinus | 17 of 20 |
| 40 mmol/h for 1 h | +0.22 / +0.59 / +1.02 / +1.33 / **+1.57** (K 5.76) | +1.14 / +0.85 / +0.52 / +0.29 | 0.03 at 45 min, 0.26 at 60 min | none | sinus | 34 of 40 |
| 20 mmol over 1 min (1 200 mmol/h for 60 s) | +0.71 at 30 s, **+1.41** at 1 min (K 5.61), +1.28 at 5 min, +0.91 at 20 min, +0.39 at 60 min | — | 0.11 at 1 min, gone by 5 min | none | sinus | — |
| 20 mmol as one iv push | +1.41 at 30 s, +1.27 at 5 min, +0.39 at 60 min (the same as the 1-min arm) | — | 0.11 | none | sinus | — |

Every arm warned through the drug model's `drugWarning`: the bolus, and the 40 and 1 200 mmol/h rates above 20 mmol/h.
The warning goes to the Log, not to the patient.

### 4.3 Against the sources

| Source (opened: abstract unless said) | Population, load | What it measured | The engine, same load | Verdict |
|---|---|---|---|---|
| Hamill RJ et al., Crit Care Med 1991;19:694 (PMID 2026032) | 48 hypokalaemic ICU adults; 20, 30 or 40 mmol in 100 mL saline over 1 h | "mean maximum potassium increase was 0.5 +/- 0.3 mmol/L, 0.9 +/- 0.4 mmol/L, and 1.1 +/- 0.4 mmol/L in the 20-, 30-, and 40-mmol groups"; "maximal at the completion of the infusion"; peak the same with and without renal insufficiency | +0.77 (20 mmol), +1.57 (40 mmol), at the end of the infusion | Shape right: the peak is at the end. Size: within one SD at 20 mmol, above it at 40 mmol (+1.57 against 1.1 ± 0.4). But the population is depleted: their cells take up more [mine]. Not a clean comparison for a normal adult |
| Kruse JA et al., J Clin Pharmacol 1994;34:1077 (PMID 7876399) | 40 hypokalaemic ICU adults (baseline 2.9); 20 mmol in 100 mL over 1 h, central or peripheral, K every 15 min | peak 3.5 (Δ +0.6), 1 h after the infusion 3.2 (Δ +0.3); no arrhythmia, no conduction change | Δ +0.77 at the end, +0.24 1 h after | Close in shape and size, for a depleted patient |
| Kruse JA, Carlson RW, Arch Intern Med 1990;150:613 (PMID 2310280) | 495 infusion sets, ICU, pre-K 3.2; 20 mEq in 100 mL | "mean increment ... per 20-mEq infusion was 0.25 mmol/L" (sampling time not stated) | — | The source of today's `it.fails` band (0.15–0.35). The target audit (row 117) found it MIS-SPECIFIED for an end-of-infusion peak and proposed 0.2–0.6 |
| Rosa RM et al., N Engl J Med 1980;302:431 (PMID 6101508) | 9 HEALTHY adults; KCl 0.5 meq/kg iv (≈ 35 mmol at 70 kg); with and without propranolol; adrenaline arm | "elevated serum potassium 0.6 +/- 0.09"; propranolol "0.9 +/- 0.05"; adrenaline "0.1 +/- 0.06" | 35 mmol over 1 h ≈ +1.4 by interpolation between the 20 and 40 mmol/h arms [mine] | **The only normal-adult figure, and the engine is about twice it.** The infusion time is not in the abstract. **WANTED:** the full text (paywalled), which settles the time and the time course. If the time was 1 h, the engine's cellular uptake (τ 43 min) is too slow for a normal adult |
| Disposition of intravenous potassium in anuric man, Kidney Int 1979;15:651 (PMID 459246) | anuric haemodialysis patients; 0.3 mEq/kg/h | a two-compartment model fits; "From 63 to 92% of the infused potassium left the extracellular fluid"; "Cellular uptake ... was less when the plasma potassium concentration was higher" | 45 % of the 20 mmol in cells at 1 h, 85 % by 3 h, in a patient with kidneys | Two compartments: the engine has them. Uptake falling at a higher K: the engine's uptake is linear in the excess (`solutes.ts:107`) |
| The disposition of intravenous potassium in normal man: the role of insulin, Clin Sci 1981;61:23 (PMID 7018811) | 6 normal adults; 0.6 mmol/kg/h for 3 h (≈ 42 mmol/h) | insulin did not rise; glucose with it changed neither the plasma rise nor the cellular uptake | — | Supports the engine's choice that a K load needs no insulin term. The increments are not in the abstract: **WANTED** (full text) |
| Effects of acute mineralocorticoid ... blockade on the excretion of an acute potassium load, J Clin Endocrinol Metab 1993;77:902 (PMID 8408463) | 7 healthy males; KCl 1 mmol/kg ORALLY under water diuresis | K excretion "from 18.8 +/- 2.4 to 63.3 +/- 3.9 mmol/5 h"; canrenoate blunted it to 51.9 | 17 of 20 mmol are in the cells at 3 h, and the kidney excreted almost none of the load (ECF +1.8, cells +17) [read from the rig's numbers] | **A miss in the kidney.** A normal kidney excretes about half an acute load within hours. It is partly aldosterone-dependent. The engine has no aldosterone term on K secretion, and under the rig's general anaesthesia its urine is low. The oral route and the water diuresis make this a direction, not a band |
| Early and late adjustment to potassium loading in humans, Kidney Int 1990;38:942 (PMID 2266680) | 6 healthy adults; 400 mmol/day orally | each K meal is followed by "an acute transient rise in plasma K, aldosterone and kaliuresis" | no aldosterone | The mechanism the kidney lacks: aldosterone rises with plasma K and drives kaliuresis |
| The labels (§3.1): US concentrate; Ann Pharm Fr 2016;74:3 (PMID 26298848, review) | a direct injection of concentrate | "Direct patient injection of potassium chloride at this concentration may be instantaneously fatal"; "Fatal cardiac arrhythmia and cardiac arrest have occurred"; "Accidental direct intravenous injection of a concentrated solution of potassium often leads to patient death" | 20 mmol pushed: K 5.61, a trace of peaked T for a few minutes, **sinus rhythm**, no harm | **The central miss. The error the simulator must let a resident make is harmless in the engine today.** No source read here gives the quantity (the plasma K at the heart after a push): **WANTED** |
| Retrospective review of the frequency of ECG changes in hyperkalemia, Clin J Am Soc Nephrol 2008;3:324 (PMID 18235147) | 90 admitted adults, K ≥ 6 | "The electrocardiogram was insensitive for diagnosing hyperkalemia"; "no diagnostic threshold could be established"; the probability of changes rose with K | the engine's stages are deterministic thresholds of kEcg (5.5 / 6.5 / 7 / 7.8; research 03 §1.6) | The thresholds are the experimental ordering. The clinical spread is not modelled; it is not needed for this piece, and is noted only |

### 4.4 Why a push is harmless in the engine: the missing mechanism

The engine adds the whole load to ONE well-mixed ECF of about 14 L at once. Two things are missing, by mechanism:

1. **The heart sees the blood the load is in, before it mixes [mine, the Fick mixing argument].** A dose injected
   into a vein reaches the right heart, the lungs and then the coronary arteries in the plasma that carries it. It is
   not yet spread through the interstitial fluid.
   - Over one minute, 20 mmol enters about one minute's plasma flow. That is a cardiac output of 5 L/min × (1 − Hct
     0.42) ≈ 2.9 L/min [mine].
   - So the plasma reaching the coronary arteries in that minute carries about 20 / 2.9 ≈ +6.9 mmol/L above baseline,
     K ≈ 11 mmol/L, before recirculation and transcapillary loss [mine].
   - That is past the engine's own sine-wave and arrest thresholds (7.8–8.5). It is the principle of cardioplegia.

   A slower load gives a smaller excess at the heart: excess ≈ rate / plasma flow.
   - 20 mmol/h: 0.33 mmol/min ÷ 2.9 L/min ≈ +0.11 mmol/L [mine], negligible on top of the systemic rise.
   - 1 200 mmol/h (20 mmol/min): about +6.9, as above.

   A low cardiac output (shock, CPR) raises the excess for the same rate [mine]. This is the coupling a fitted
   constant would miss. A central line does not remove it; it is where the label's warning about the catheter tip in
   the atrium comes from (EMC 15221: "the catheter must not be in the atrium or ventricle").
2. **Plasma and interstitium are not one pool.** K crosses the capillary wall quickly but not instantly. The anuric
   kinetic study (PMID 459246) needed two compartments, and the plasma excess after a fast load decays as it spreads
   into the ~11 L of interstitial fluid [mine, the volumes are the engine's `plasmaMl` and `isfMl`]. Without this, the
   engine's peak after any fast load is diluted into 14 L from the first step. The engine has the volumes; it lacks
   the exchange between them.

**What each missing mechanism would take, by mechanism, never by a fitted constant:**

| Mechanism | State | Couplings | The number it needs, and its source |
|---|---|---|---|
| **K1. The load in the circulating plasma; the heart reads coronary-arterial K** | A plasma K separate from the interstitial K (plasma volume from `blood/params.ts`). The infusion enters the plasma | Cardiac output and haematocrit from the circulation and blood models. `kEcg`, the ECG stages, ectopy and the arrest hazard read the PLASMA K at the heart (arterial plasma after the lungs) instead of the pooled ECF K | The transcapillary exchange rate of K (plasma ↔ interstitium), as a permeability-surface product or a tracer half-time. **WANTED:** a human tracer study of early plasma disappearance of ⁴²K or ⁴³K, or a physiology text's whole-body capillary K exchange figure. A placeholder until then, labelled. The recirculation transit (a few tens of seconds) is a circulation-model quantity |
| **K2. Cellular uptake that falls at higher K, and that adrenaline and β-blockade move** | the existing cellular pool | the existing `kShift` path (β₂ agonists, endogenous adrenaline) | Shape from PMID 459246 ("less when the plasma potassium concentration was higher"); size from the β-blockade and adrenaline arms of Rosa 1980 (0.9 and 0.1 against 0.6). The τ 43 min is re-checked against Rosa's time course once its full text is in hand (WANTED). Built only if the validation rows of piece KV fail on it |
| **K3. Aldosterone-driven kaliuresis of an acute load** | an aldosterone level with its own response to plasma K and its own lag (the endocrine model is the natural owner) | distal K secretion in `organs/pipeline.ts renalSeam` gains the aldosterone factor; spironolactone or canrenoate, if ever in the library, act on it | Direction and the blocked fraction from PMID 8408463 (63.3 against 51.9 mmol/5 h with canrenoate) and PMID 2266680. The adrenal response to plasma K: **WANTED** (a dose–response of plasma aldosterone against plasma K in humans) |
| Acid–base shift | exists (−4.0 mmol/L per pH unit of non-organic pH, `core.ts:178`) | — | already sourced in its own plan; unchanged |
| Insulin | exists (drug model PD) | — | PMID 7018811 supports no K-induced insulin term: unchanged |

**This section decides the order.** The syringe is not offered before:
- K1 is built and passes;
- the KV rows hold, with the normal-adult rows (Rosa 1980) either passing or recorded as known misses with the
  owner's ruling (Q3).

A resident who pushes 20 mmol must see the patient arrest, or come close to it. Today the patient barely notices.

## 5. What the devices do for potassium, and what the simulator's pump shows

**The reference devices in the project:**
- **Mindray BeneFusion SP5 family** (research/86 M1). §6.2: "The product is configured with a drug library with a
  collection of 2,000 kinds of drugs available for users to select from", and "After the drug is selected, its name
  will appear on the Run screen". C.5 lists "33 potassium chloride". The manual describes no per-drug limit, no hard
  limit and no soft limit. The only limits it describes are the syringe's rate range ("[Value Reached Limit] and
  provides a range of the parameter", p. 4-6) and the system's VTBI limit. Body Weight Mode's units have no mmol (§1).
  So on this pump, KCl runs in Rate Mode in mL/h with its name shown.
- **JMS SP-500** (research/50): no drug library in the catalogue read; dose rate is a gap (SP-27).
- **JMS OT-701** (research/50): a volume limit "1-9999 ml or no limit"; no drug library in the catalogue read.
- **What the project does not have:** a manual of a pump with dose-error-reduction software (a drug library with hard
  and soft limits per drug). The pump plan names such an editor a non-goal (`pump-rack-tci.md:123`). **WANTED, if
  the owner wants one:** an openly offered operator's manual of such a pump, for its words on what a potassium hard
  limit does (refuses, or asks for a confirmation).

**What the simulator's pump shows (proposal; owner question Q1):**
- The device faces do only what their manuals say. No potassium limit appears on any face: the reference devices
  have none. The rate range is the syringe's (PR 522 puts the SP5 family's per-syringe range into the data).
- KCl on an SP5 skin: Rate Mode, mL/h, the name "potassium chloride". The generic face writes the dose rate in mmol/h
  beside the mL/h, as for mg drugs.
- The **instructor** sees, on the rack view, the channel's rate in mmol/h and a marker when it is above the label
  maximum of the product's issuer. The source is the engine's `drugWarning`, which today holds one figure,
  20 mmol/h, with its text citation; piece SG makes it the product's label figure.
- The **Debrief** says, per KCl channel:
  - the peak rate in mmol/h and the concentration in mmol/mL;
  - the route the case declared;
  - the label maximum of the product's issuer, in its words (10 mEq/h US, 20 mmol/h UK concentrate, 40 mEq/h urgent
    US with monitoring);
  - the plasma K and the ECG the patient had.

  Nothing on a device stops the learner. The physiology answers.

## 6. The pieces, in order

The order rule: **nothing is offered to a learner before the physiology behind it is right.** The offer is one line of
data: KCl leaves `pending.json` and the coverage test's `WANTED` table. That happens in piece FK, and FK waits for KV
and K1.

| # | Piece | Builds | Tests | Sources | Must not change | Hours |
|---|---|---|---|---|---|---|
| 1 | **KV. Potassium validation rows first** (validation workflow) | The rows of §4.3, each graded from the engine's own rig, run once, and written into `known-misses.md` where they fail. The rows: <br>• Hamill 20/30/40 mmol over 1 h, peak at the end, on a hypokalaemic profile (K 3.2); <br>• Kruse 1994's time course (peak, then 1 h after; profile K 2.9); <br>• the anuric fraction leaving the ECF (an anuric profile, 0.3 mmol/kg/h, 63–92 %); <br>• the direction of the kaliuresis of a load with a working kidney (PMID 8408463, direction only); <br>• the push: "20 mmol iv push in a normal adult → a life-threatening rhythm" as a direction row from the labels and PMID 26298848 (a known miss today); <br>• row 117 re-targeted as the audit proposed (end-of-infusion rise 0.2–0.6 for 20 mmol/1 h, normal adult), with its source corrected | the rows are the tests; slow-c | §4.3; the target audit row 117 | no physiology; no band moved to meet the engine | 6 |
| 2 | **U1. The electrolyte table and the one conversion** (validation workflow if the gluconate figure moves) | `l2/pk/data/electrolytes.json` and `l2/pk/electrolytes.ts` (§2.1). The engine's `units.ts` mEq line, `CA_MMOL_PER_G`, `MG_MMOL_PER_G` and the per-drug unit list at `blood/pipeline.ts:278` read it. Each entry's label cross-check is read from its label (calcium chloride EMC 4126; calcium gluconate: the label U1 opens) | load-time check; a unit test per entry (salt mass ↔ label figure); a refusal test per §2.1 refusal; mEq of Mg converts to half the mmol | IUPAC atomic weights; the labels of §2.3 | every existing dose's effect, except a calcium-gluconate shift of at most 3 % if its label says so (stated in the PR with the validation run) | 6 |
| 3 | **K1. The load in the plasma; the heart reads coronary-arterial K** (validation workflow; advisor kind design) | §4.4 K1: plasma and interstitial K as two pools with transcapillary exchange; the infusion and the push enter the plasma; `kEcg` and the arrest hazard read the arterial plasma K; the excess at the heart follows rate ÷ plasma flow and so falls with cardiac output | the KV push row; a unit test that a slow infusion's plasma K equals today's pooled K within the exchange's small lag; a CO-coupling test (the same push at half the CO gives a larger excess). Every existing potassium row (FU-9 F6, insulin–dextrose, succinylcholine, the AKI rows) stays green or its drift is attributed | the exchange-rate source (WANTED; §4.4); the engine's plasma and ISF volumes | the cellular pool, its τ and the total-body set point; the ECG thresholds; the arrest hazard's rule | 12 |
| 4 | **K3. Aldosterone and the kaliuresis of a load** (validation workflow; advisor kind design; may need its own plan) | §4.4 K3, in the endocrine and renal models | the KV kaliuresis row; a canrenoate-style arm if a mineralocorticoid antagonist is in the library | PMID 8408463, 2266680; the aldosterone dose–response (WANTED) | the volume-driven ADH/aldosterone factor `vNh` (`renal/params.ts:81`) keeps its meaning; K3 adds the K-driven arm | 10 |
| 5 | **K2. Load-dependent uptake** (conditional) | §4.4 K2, only if KV's rows fail on it after K1 and K3 | the Rosa rows (once the full text is in hand) | PMID 459246, 6101508 | the insulin and β₂ paths' own rows | 6 (conditional) |
| 6 | **U2. The host, the wire and the rack accept mmol and mEq** | `preparations.ts`: `SYRINGE_UNITS` becomes "a unit `convert` takes for this drug"; a mEq syringe or bag reaches the engine in mmol of the ion; `types-pk.ts` infusion `concentration.unit` gains `mmol`; `pump-host.ts inUnit` calls `convert`; the refusals of §2.1 in the host's words | host tests: 20 mmol in 50 mL KCl infuses at 50 mL/h → 20 mmol/h in the engine; 16 mEq of Mg = 8 mmol; a mEq preparation of a drug with no table entry is refused with its words; DOM test: the remote shows the refusal | §2 | brief 321's Start path: U2 changes what the host ACCEPTS, not how a channel is loaded or started | 6 |
| 7 | **FK. The KCl formulary entry, the stock containers, the offer** (second reading) | `formulary/potassiumChloride.json` per §3.3; the 20 mEq/50 mL and 40 mEq/100 mL ready-to-use containers in `stock-syringes.json`; `sources.json` entries (DailyMed, EMC); KCl leaves `pending.json` and `WANTED`. **Starts only when KV is merged and K1 is merged and green** | the formulary source check; the coverage test (KCl now preparable, run by the host, infused on a pump channel); the second reader's table | §3.1; Stabilis; Trissel 17th ed. | other entries | 6 + 2 (second reading) |
| 8 | **U3. Units on every screen** | the bench, the tray, the rack's generic face, the instructor's rack view, the Log and the Debrief write §2.2's forms through `convert` | DOM tests read the table (no bare numbers); a Log line for Mg in g with mmol beside it | §2 | the device skins' own fields (an SP5 skin shows no dose rate in mmol) | 6 |
| 9 | **SG. The label maximum in the instructor's view and the Debrief** | the engine's `drugWarning` takes the product's label maximum from the formulary entry (its issuer and words) instead of one figure; the Debrief's KCl paragraph (§5) | the Debrief paragraph for a US and a UK product; nothing on a device face | §3.1 | the warning still never clamps a dose | 4 |
| 10 | **E. One end-to-end case** | a browser test: a learner prepares KCl 20 mmol in 50 mL; Start (brief 321's path) puts it on a free syringe channel; 20 mmol/h runs; the instructor's view and the Log agree. A second arm: the learner pushes 20 mmol through the pump's bolus and the patient's ECG and rhythm change (after K1) | the test waits for the events (channel running; the rhythm change), never for time | — | — | 4 |

**Total:** 68 h with K2. Without K2 (conditional): 62 h. (KV 6, U1 6, K1 12, K3 10, K2 6, U2 6, FK 8, U3 6, SG 4, E 4.)

**Partition and order:**
- KV and U1 run in parallel; they touch different files.
- K1 follows KV (its rows are K1's acceptance).
- K3 follows K1 (both touch the blood/renal seam).
- U2 can run beside K1: it offers nothing, because the bench lists only drugs with a file and KCl has none until FK.
- FK waits for KV and K1, merged and green.
- U3, SG and E follow FK.

**The validation workflow** applies to KV, U1 (if it moves a value), K1, K3 and K2: anything under
`packages/engine-core/src/**` that can move a value.

## 7. Questions for the owner

**Q1. Whose maximum rate does the simulator compare against?**
The labels differ: US 10 mEq/h (K > 2.5) and 40 mEq/h urgent with ECG monitoring; UK concentrate 20 mmol/h; UK
B. Braun 10/40 mmol/h by serum K. No reference pump holds a potassium limit.
- A: the label of the product the learner chose (its issuer's words), in the instructor's view and the Debrief only.
- B: one figure for the whole simulator (today's 20 mmol/h, from the textbook chapters).
- C: the department's own protocol, when the owner supplies it.

Proposal: A now, C when the protocol exists. No device face shows a limit its manual does not have.

**Q2. May the learner make an undiluted concentrate syringe?**
Every concentrate label forbids injecting it undiluted. No label endorses drawing it into a syringe. The ready-to-use
0.4 mmol/mL products are central-only.
- A: the bench allows it and raises the label's finding; the physiology (K1) answers.
- B: the bench refuses an undiluted concentrate.
- C: allow it only in a case that declares the error as a teaching aim.

Proposal: A. The error is the lesson, and K1 makes it honest.

**Q3. Which rows must pass before the syringe is offered?**
The human data opened are mostly in DEPLETED intensive-care patients (Hamill, Kruse). The one normal-adult study
(Rosa 1980) puts the engine at about twice its rise, but its infusion time is behind a paywall.
- A: KV's rows with K1 passing; the normal-adult row a known miss until Rosa's full text is read.
- B: wait for the full text and K2 if needed.
- C: also require K3 (the kaliuresis).

Proposal: A, with K3 next. The push, the error the ruling names, is fixed by K1.

**Q4. The SP5 skin and mmol.**
The SP5 family has no mmol unit (M1 p. 5-2). On that skin, KCl can only be run in mL/h with its name.
- A: keep the skin true: mL/h and the name only; the generic face and the instructor show mmol/h.
- B: let the SP5 skin show mmol/h anyway.

Proposal: A (the device faces follow their manuals).

## 8. Lines of other plans this plan makes stale (not edited here)

- `docs/plans/learner-action-remote.md` §9.1, the F3 row: "potassium chloride C". KCl's entry is now piece FK here,
  gated on K1; it is no longer an F3 entry.
- `docs/plans/learner-action-remote.md` §1 and the bench's units: the host's `SYRINGE_UNITS` is replaced by U2.
- `docs/plans/pump-rack-tci.md` §13 S1, stock syringes: the KCl ready-to-use containers are FK's.
- `packages/engine-core/src/l2/pk/data/rows-other.ts:22` (code, not a plan): calcium gluconate's "4.65 mEq Ca per g"
  becomes the table's figure in U1.
