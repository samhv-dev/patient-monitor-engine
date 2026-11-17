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
| `mmolPerG` | mmol of the ion per g of the product AS LABELLED, from the label's own figure (for example "8 to 24 mEq (1 gram to 3 grams)"), with `src`. **This is the figure doses use** |
| `saltMolarMass` | g/mol of that salt, with `src`: the cross-check of `mmolPerG` |
| `ionPerSalt` | moles of the counted ion per mole of salt (1 for every salt in the table) |
| `excipientIon` | where the product carries the ion in a second salt, that salt and its share, with `src` (calcium gluconate: calcium saccharate, below) |
| `prescribed` | the unit a clinician prescribes it in, with `src` |
| `labelUnits` | the units the product labels use, per issuer, with `src` |

**A check at load time, and a CI test.** `1000 × ionPerSalt / saltMolarMass`, plus any `excipientIon`, must agree
with `mmolPerG` to within the label's own rounding. The rounding is the printed figure's last digit: "8 to 24 mEq
(1 gram to 3 grams)" gives 8.0 ± 0.5 mEq/g. An entry whose two figures disagree fails the build. This is how a hydrate
mistake is caught (MgSO₄ anhydrous would give 16.6 mEq/g).

Why the label's figure, and not the molar mass, is what doses use: calcium gluconate. Its US label (DailyMed
16307c00, WG Critical Care) gives the salt as "calcium D-gluconate (1:2) monohydrate ... Molecular weight: 448.39",
which alone would be 2.23 mmol/g. But "Each mL ... contains 100 mg of calcium gluconate (equivalent to 94 mg of
calcium gluconate anhydrous and 4.5 mg of calcium saccharate tetrahydrate)" and "9.3 mg (0.465 mEq) of elemental
calcium". So the product carries 2.33 mmol of Ca²⁺ per g of labelled salt:
- 94 mg / 430.37 = 0.218 mmol [mine];
- 4.5 mg / 320.3 (calcium saccharate tetrahydrate) = 0.014 mmol [mine];
- 0.232 mmol in all = 9.3 mg of Ca, as printed.

The cross-check passes only with the excipient declared. That is what the field is for.

**The sources of this table.** The engine has no `sources.json` (the formulary's lives in the controller, and the
engine does not import the controller). Each `src` is therefore an inline object in the table: the issuer (DailyMed,
EMC or IUPAC), the document id and version, and the words read. An engine-core unit test asserts the following, as
the formulary's source test does for its files (§5 rules 1–2 of the learner plan):
- every numeric field has a `src`;
- each `src` has its issuer's required fields;
- the label words are ≤ 200 characters.

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
| Calcium chloride (`calciumChloride`) | g or mg (10 %); mmol in UK | UK: "Each ml contains 100mg of Calcium Chloride dihydrate"; "a typical dose is 2.25 to 4.5 mmol (approximately 3-7ml of a 10% w/v solution)" (EMC 4126, Martindale, revised 30/01/2025: the formulary's monograph) | Ca²⁺, 2 | CaCl₂·2H₂O, 147.01 [mine] | 1000/147.01 = 6.80 mmol/g, 0.68 mmol/mL; the label's 2.25 mmol in "approximately 3" mL is 0.68–0.75: agrees (the engine's 6.8) |
| Calcium gluconate (`calciumGluconate`) | g or mg (10 %); mmol in UK | US: "100 mg of calcium gluconate per mL which contains 9.3 mg (i.e., 0.465 mEq) of elemental calcium" (DailyMed 16307c00, WG Critical Care, effective 2025-11-01); the row's own string "4.65 mEq Ca per g" agrees | Ca²⁺, 2 | the monohydrate, 448.39 (the label), plus calcium saccharate as an excipient ion (§2.1) | 0.465 mEq/mL = 2.325 mmol/g; the engine's 2.3 is that figure, rounded. Nothing moves beyond the rounding (≤ 1.1 %) |
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
  - the ready-to-use 20 mEq/50 mL and 40 mEq/100 mL (Baxter 092ddee4; ICU Medical eb56a807) as stock **bags** for
    a drip channel (`stock-syringes.json`, the S1 shape). Both labels describe flexible containers ("Viaflex Plus",
    "flexible plastic containers"), so they are not stocked as syringes.
- **The KCl syringe is not sourced.** A syringe for a syringe channel is made on the bench, from the concentrate and
  a listed diluent. No label read describes one. A syringe of 20 mmol in 50 mL made from concentrate (10 mL of
  2 mmol/mL plus 40 mL of saline) is a 5-fold dilution, against the UK concentrate's "not less than 50 times its
  volume". What the department's KCl syringe is (its concentration and volume, and how it is made) is owner question
  Q5. Until it is answered, FK offers the bench's preparation with the label finding, and stocks no syringe.
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
- the engine's own rig, `rig6()`: the modelled adult, 40 y, 70 kg, 175 cm, male, seed 7, awake and breathing on
  his own (no anaesthetic, no ventilator: `test/helpers/resp-modeled-rig.ts:12`); the same rig as
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
| Effects of acute mineralocorticoid ... blockade on the excretion of an acute potassium load, J Clin Endocrinol Metab 1993;77:902 (PMID 8408463) | 7 healthy males; KCl 1 mmol/kg ORALLY under water diuresis | K excretion "from 18.8 +/- 2.4 to 63.3 +/- 3.9 mmol/5 h"; canrenoate blunted it to 51.9 | 17 of 20 mmol are in the cells at 3 h, and the kidney excreted almost none of the load (ECF +1.8, cells +17) [read from the rig's numbers] | **A miss in the kidney, for the course over hours.** A normal kidney excretes about half an acute load within 5 h. Canrenoate removed about a quarter of the load's extra excretion ((63.3 − 51.9) / (63.3 − 18.8) = 26 % [mine]); the authors attribute the rest to distal sodium and volume delivery. So aldosterone is the minor arm. The oral route and the water diuresis make this a direction, not a band. Hamill found the same 1 h peak with and without renal insufficiency, so **the kidney does not set the 1 h peak** |
| Early and late adjustment to potassium loading in humans, Kidney Int 1990;38:942 (PMID 2266680) | 6 healthy adults; 400 mmol/day orally | each K meal is followed by "an acute transient rise in plasma K, aldosterone and kaliuresis" | no aldosterone | The mechanism the kidney lacks: aldosterone rises with plasma K and drives kaliuresis |
| The labels (§3.1): US concentrate; Ann Pharm Fr 2016;74:3 (PMID 26298848, review) | a direct injection of concentrate | "Direct patient injection of potassium chloride at this concentration may be instantaneously fatal"; "Fatal cardiac arrhythmia and cardiac arrest have occurred"; "Accidental direct intravenous injection of a concentrated solution of potassium often leads to patient death" | 20 mmol pushed: K 5.61, a trace of peaked T for a few minutes, **sinus rhythm**, no harm | **The central miss. The error the simulator must let a resident make is harmless in the engine today.** No source read here gives the quantity (the plasma K at the heart after a push): **WANTED** |
| Retrospective review of the frequency of ECG changes in hyperkalemia, Clin J Am Soc Nephrol 2008;3:324 (PMID 18235147) | 90 admitted adults, K ≥ 6 | "The electrocardiogram was insensitive for diagnosing hyperkalemia"; "no diagnostic threshold could be established"; the probability of changes rose with K | the engine's stages are deterministic thresholds of kEcg (5.5 / 6.5 / 7 / 7.8; research 03 §1.6) | The thresholds are the experimental ordering. The clinical spread is not modelled; it is not needed for this piece, and is noted only |

### 4.4 Why a push is harmless in the engine: the missing mechanism

The engine adds the whole load to ONE well-mixed ECF of about 14 L at once. Two things are missing, by mechanism:

1. **The heart sees the blood the load is in, before it mixes [mine, a mass-balance argument].** A dose given into a
   vein reaches the right heart, the lungs and then the coronary arteries in the plasma that carries it, before it has
   spread through the interstitial fluid. The excess the heart sees is set by the delivery rate divided by the plasma
   flow, on top of the systemic K. A slow infusion adds almost nothing at the heart; a fast push adds a great deal; a
   low cardiac output raises the excess for the same rate. This is the coupling a fitted constant would miss, and it
   is why the labels insist on a slow, controlled rate and why one label warns that the central catheter tip must not
   sit in the atrium or ventricle (EMC 15221). The engine has cardiac output and haematocrit as state; it lacks only
   the delivery rate at the blood model's seam.
2. **Plasma and interstitium are not one pool.** K crosses the capillary wall quickly but not instantly. The anuric
   kinetic study (PMID 459246) needed two compartments, and the plasma excess after a fast load decays as it spreads
   into the ~11 L of interstitial fluid [mine, the volumes are the engine's `plasmaMl` and `isfMl`]. Without this, the
   engine's peak after any fast load is diluted into 14 L from the first step. The engine has the volumes; it lacks
   the exchange between them.

**What each missing mechanism would take, by mechanism, never by a fitted constant:**

| Mechanism | State | Couplings | The number it needs, and its source |
|---|---|---|---|
| **K1a. First pass: the heart reads the plasma the load is in** | the delivery rate of the load (infusion rate, or a push's duration) | cardiac output (circulation) and haematocrit (blood); `kEcg`, the ECG stages, ectopy and the arrest hazard read systemic K plus the first-pass excess | No new constant: a mass balance on engine state. The seam lacks the delivery rate: the blood model receives lump amounts per advance pass (`pk/pipeline.ts logDose`, `blood/pipeline.ts observeDoses`), so rate or duration must cross it, and a hand push without `overS` needs a duration (owner question Q6) |
| **K1b. Plasma and interstitium as two pools** | a plasma K separate from the interstitial K (`plasmaMl`, `isfMl`, `blood/params.ts:137`) | transcapillary exchange; K1a then reads the plasma pool | The transcapillary exchange rate of K: **WANTED** (a human tracer study of early plasma disappearance of radio-potassium, or a physiology text's figure). **Conditional on that source**; without it the rate would be a constant in disguise |
| **K2. Faster, load-dependent cellular uptake in a normal adult** | the existing cellular pool and τ | the existing `kShift` path | The one mechanism identified that would LOWER the normal adult's 1 h peak (row 117: engine +0.77 against the audit's proposed 0.2–0.6; neither K1 nor K3 lowers it, and Hamill shows the kidney does not set it). Shape from PMID 459246; size from Rosa 1980, whose infusion time is behind a paywall (**WANTED**). Until then no sourced number exists: owner question Q3 |
| **K3. Aldosterone-driven kaliuresis** | an aldosterone level responding to plasma K with its own lag (endocrine model) | the distal K secretion in `organs/pipeline.ts renalSeam` | Direction and the blocked share (about a quarter) from PMID 8408463 and 2266680; the adrenal response to plasma K is **WANTED**. It shapes the course over hours, not the 1 h peak, so it does not gate the offer |
| Acid–base shift | exists (`core.ts:178`) | — | unchanged |
| Insulin | exists (drug model PD) | — | PMID 7018811 supports no K-induced insulin term: unchanged |

**The rack.** Which device and concentration can deliver a harmful rate is decided by K1a's own tests, run against
the device data (the SP-500 and OT-701 profiles, and the SP5 family's per-syringe maxima once PR 522 lands) and the
products of §3.1, not by a table in this plan. The plan records only the principle: the harm scales with mmol per
minute reaching the heart, so the product's concentration (Q2, Q5) matters as much as the pump's maximum rate.

**This section decides the order.** The syringe is not offered before:
- K1a is built and passes the KV first-pass row (asserted on the K the heart reads and the ECG stage, not on the
  rhythm, which comes from a hazard draw);
- the KV rows hold, the normal-adult row either passing or recorded as a known miss with the owner's ruling (Q3).

**KV's hypokalaemic rows are shape-only.** A profile K of 3.2 sets the set point with full cells (`createSolutes`),
not a depleted patient. Hamill's and Kruse's populations were depleted; until a profile can deplete the cells (by the
total-body relation the engine already has, `K_TBK_MMOL`), those rows grade the shape (peak at the end, fall after),
not the size.

**Census of what a change at the heart touches (K1a's first step).** No scenario card gives KCl
(`packages/controller/scenarios/*.json`). The instructor's picker opens KCl on Infusion only (`apps/demo/src/app/drugs.ts:50`).
Tests that give KCl: `packages/engine-core/test/engine/blood-potassium-chloride.test.ts` (its bolus case expects
K > 4.2 and stays true) and the coverage and scenario-variable tests (`formulary-coverage.dom.test.ts`,
`concentration-vars.test.ts`). K1a lists any others it finds and attributes every drift.

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
  - the route the order named, if any (the scenario format's `route` has `central`; no case declares the patient's lines);
  - the label maximum of the product's issuer, in its words (10 mEq/h US, 20 mmol/h UK concentrate, 40 mEq/h urgent
    US with monitoring);
  - the plasma K and the ECG the patient had.

  Nothing on a device stops the learner. The physiology answers.

## 6. The pieces, in order

The order rule: **nothing is offered to a learner before the physiology behind it is right.** The offer is one line of
data: KCl leaves `pending.json` and the coverage test's `WANTED` table, in piece FK, which waits for KV and K1a.

| # | Piece | Builds | Tests | Sources | Must not change | Hours |
|---|---|---|---|---|---|---|
| 1 | **KV. Potassium validation rows first** (validation workflow) | the rows of §4.3 on the engine's own rig, written into `known-misses.md` where they fail: Hamill and Kruse 1994 (shape-only, §4.4); the anuric fraction leaving the ECF (PMID 459246); the direction of a working kidney's kaliuresis (PMID 8408463); a first-pass row from the labels' warning (direction only, on the K the heart reads and the ECG stage); row 117 re-targeted as the audit proposed, with its citation corrected | the rows are the tests (slow-c) | §4.3; audit row 117 | no physiology; no band moved to meet the engine | 6 |
| 2 | **U1. The electrolyte table and the one conversion** (validation workflow) | `l2/pk/data/electrolytes.json`, `l2/pk/electrolytes.ts` (§2.1); `units.ts`'s mEq line, `CA_MMOL_PER_G`, `MG_MMOL_PER_G` and the unit list at `blood/pipeline.ts:278` read it | load-time cross-check; the inline-source test; one test per refusal; 16 mEq of Mg is 8 mmol | IUPAC atomic weights; the labels of §2.3 | every dose's effect, beyond rounding (≤ 1.1 % for calcium gluconate) | 6 |
| 3 | **K1a. First pass at the heart** (validation workflow; advisor kind design) | §4.4 K1a: the delivery rate or push duration crosses the drug-to-blood seam; the heart's K = systemic + rate ÷ plasma flow; ECG, ectopy and arrest hazard read it; the census first | KV's first-pass row; a slow infusion unchanged within the step; the CO coupling (the same rate at half the cardiac output gives a larger excess); every existing potassium row green or its drift attributed | engine state only; Q6 for a push's duration | the cellular pool and τ; the ECG thresholds; the arrest rule | 14 |
| 4 | **K1b. Plasma and interstitium** (conditional on its source; validation workflow) | §4.4 K1b | a fast load's plasma peak decays into the interstitium at the sourced rate | the WANTED exchange source | K1a's interface | 6 (conditional) |
| 5 | **K2. Load-dependent uptake** (conditional on Rosa's full text) | §4.4 K2 | the Rosa rows; row 117 | PMID 459246, 6101508 | the insulin and β₂ rows | 6 (conditional) |
| 6 | **K3. Aldosterone and kaliuresis** (validation workflow; advisor kind design; may need its own plan) | §4.4 K3 | KV's kaliuresis row | PMID 8408463, 2266680; WANTED dose–response | `vNh` keeps its meaning | 10 |
| 7 | **U2. Host and rack accept mmol and mEq — after brief 321 merges** | scoped to what 321 leaves: the preparation-to-channel load accepts a preparation in mmol or mEq of a table drug (the `SYRINGE_UNITS` check on that path); `pump-host.ts inUnit` uses `convert` (valence); the §2.1 refusals in the host's words. The channel-less infusion path is 321's and is not touched | host: a KCl preparation of 20 mmol in 50 mL loaded on a channel at 50 mL/h reaches the engine as 20 mmol/h; mEq of Mg converts by valence; a mEq preparation of a drug with no entry is refused with its words | §2 | 321's Start sequence and channel rule | 4 |
| 8 | **FK. The KCl entry and the offer** (second reading) | `formulary/potassiumChloride.json` (§3.3); the stock bags; `sources.json` entries; KCl leaves `pending.json` and `WANTED`. **Starts only when KV and K1a are merged and green, and Q5 is answered** | the source check; the coverage test (preparable, run by the host, on a channel); the second reader's table | §3.1; Stabilis; Trissel 17th ed. | other entries | 8 |
| 9 | **U3. Units on every screen, both languages** | the bench, the tray, the generic face, the instructor's rack view, the Log and the Debrief write §2.2's forms through `convert`; the Debrief's Persian catalogue (`docs/showcase/i18n/fa-debrief.json`) carries the new lines, written with the persian-writing conventions and read by the owner (displayed tokens untranslated) | DOM tests read the table; a Log line for Mg in g with mmol beside it; the fa catalogue has every new key | §2 | device skins' own fields | 8 |
| 10 | **SG. The label maximum for the instructor and the Debrief** | the engine's `drugWarning` takes the product's label maximum and issuer from the formulary entry; the Debrief's KCl paragraph (§5) | a US and a UK product's paragraph; nothing on a device face | §3.1 | the warning never clamps a dose | 4 |
| 11 | **E. One end-to-end case** | a learner prepares KCl, brief 321's Start puts it on a channel, it runs; the instructor's view and the Log agree; a second arm: a pump bolus raises the K the heart reads and changes the ECG stage (after K1a) | the test waits for events (channel running; the stage change), never for time, and asserts no rhythm draw | — | — | 4 |

**Total:** 76 h with the conditionals; 64 h without K1b and K2. (KV 6, U1 6, K1a 14, K1b 6c, K2 6c, K3 10, U2 4, FK 8,
U3 8, SG 4, E 4.)

**Partition and order:** KV and U1 in parallel; K1a after KV; K3 after K1a (both touch the blood/renal seam); U2 after
brief 321 merges, beside K1a; FK after KV, K1a and Q5; U3, SG and E after FK. The validation workflow applies to KV,
U1, K1a, K1b, K2 and K3.

## 7. Questions for the owner

**Q1. Whose maximum rate does the simulator compare against?**
The labels differ (US 10 mEq/h, 40 mEq/h urgent with monitoring; UK concentrate 20 mmol/h; UK B. Braun 10/40 mmol/h
by serum K), and no reference pump holds a potassium limit.
- A: the label of the product chosen, in the instructor's view and the Debrief only.
- B: one figure for the whole simulator (today's 20 mmol/h).
- C: the department's protocol, when supplied.

Proposal: A now, C when the protocol exists.

**Q2. May the learner make an undiluted concentrate syringe?**
Every concentrate label forbids giving it undiluted; none endorses drawing it into a syringe.
- A: the bench allows it and raises the label's finding; the physiology answers.
- B: the bench refuses it.
- C: allow it only in a case that declares the error as a teaching aim.

Proposal: A, once K1a makes the consequence honest.

**Q3. Which rows must pass before the syringe is offered?**
The human data opened are mostly from depleted ICU patients. The one normal-adult study puts the engine at about
twice its rise, and no mechanism with a sourced number lowers that peak yet (K2 waits for Rosa's full text).
- A: KV with K1a passing; the normal-adult row a known miss until the full text is read.
- B: wait for the full text and K2.

Proposal: A.

**Q4. The SP5 skin and mmol.**
The SP5 family has no mmol unit (M1 p. 5-2).
- A: keep the skin true (mL/h and the name); the generic face and the instructor show mmol/h.
- B: let the SP5 skin show mmol/h.

Proposal: A.

**Q5. What is the department's KCl syringe?**
No label read describes a KCl syringe for a syringe pump; the ready-to-use 0.4 mmol/mL products are bags, central
only, and a syringe made from concentrate is less diluted than the UK label's 50-fold.
- A: the owner names the department's syringe (concentration, volume, how it is made); FK stocks that, labelled as
  the department's.
- B: offer only the bench's own preparation, with the label findings, and no stock syringe.
- C: offer KCl on drip channels only (the ready-to-use bags).

Proposal: A, with B until it is answered.

**Q6. How long does a hand push take, when the order gives no duration?**
K1a needs a delivery duration for a push; the engine has none, and no source was found.
- A: the remote and the instructor's sheet ask for "over … s" on an electrolyte push, as for other slow pushes.
- B: a default duration named by the owner, labelled as the owner's.

Proposal: A.

## 8. Lines of other plans this plan makes stale (not edited here)

- `docs/plans/learner-action-remote.md` §9.1, the F3 row: "potassium chloride C". KCl's entry is now piece FK here,
  gated on K1; it is no longer an F3 entry.
- `docs/plans/learner-action-remote.md` §1 and the bench's units: the host's `SYRINGE_UNITS` is replaced by U2.
- `docs/plans/pump-rack-tci.md` §13 S1, stock syringes: the KCl ready-to-use bags are FK's.
- `scratch/briefs/post-demo/321-…` and its plan lines: U2 follows 321 and does not edit its Start path.
- `packages/engine-core/src/l2/pk/data/rows-other.ts:22` (code, not a plan): calcium gluconate's "4.65 mEq Ca per g"
  becomes the table's figure in U1.
