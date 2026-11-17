# Mindray BeneFusion SP5 TCI: what its own documents give

Purpose: the TCI pump of the simulator is styled on the Mindray BeneFusion SP5 TCI, and every device number in
`packages/controller/pump-devices/sp5-tci.json` is a named gap (research/50 TC-06 to TC-15). This note records which of
the pump's documents could be read, what each gives for every gap and for the face's open points, and what stays a gap.

## 1. The documents

**The operator's manual for the SP5 TCI could not be obtained.** Searches (English, Russian; the maker's site, the
maker's safety-and-performance library, distributors, public procurement stores) found no openly offered copy of a
"BeneFusion SP5 TCI" (or "SP5 DTCI") operator's manual. What exists and why none of it is used:

| Document | Where | Why not used |
|---|---|---|
| BeneFusion SP5 Syringe Pump Operator's Manual V13.0, 2017-10, "also applicable to BeneFusion SP5 Ex, BeneFusion SP5 TIVA" | a third-party upload (pdfcoffee.com) | the plain SP5 edition, not the TCI one; and the site refuses automated reading (HTTP 403) |
| BeneFusion SP5 TCI Datasheet 20150807 EN | third-party uploads (scribd.com, pdfcoffee.com) | a data sheet, not the manual; the one site refuses automated reading (403), the other offers the file only after sign-in |
| BeneFusion SP5 Syringe Pump Data Sheet | a public procurement store (storage.mtender.gov.md) | the plain SP5, a neighbouring model: its numbers are not the SP5 TCI's |
| BeneFusion SP5 Service Manual V1.0, Service Training V1.0 | third-party uploads (pdfcoffee.com) | the plain SP5, for technicians; site refuses automated reading |
| BeneFusion iSP, uSP, eSP operator's manuals and safety summaries | mindray.com, storage.mtender.gov.md | other models |

**The one document of the SP5 TCI itself that could be read (B1):** the maker's brochure "BeneFusion SP5 TCI, Advanced
Anesthesia Syringe Pump", part number `ENG-BeneFusion SP5 TCI-210x285x8P-20150911` (Mindray Medical Netherlands B.V.),
4 PDF pages (each a two-page spread), 910 607 bytes, created 2015-09-15, SHA-256
`5186190946081037871a05700ce21151f450ecbfe087baf60da68e4bc648458d`, openly offered by a Swedish distributor at
`https://infiniti.se/wp-content/uploads/Broschyr-BEneFusion-SP5-TCI.pdf` (no sign-in, no form). Kept at
`assets/pumps/sp5-tci-brochure-infiniti/Broschyr-BEneFusion-SP5-TCI.pdf`. It is a brochure, not a manual: it names the
drugs, models, concentrations, ages and target ranges and gives no number of the pump's mechanics. Pages below are PDF
pages of that file.

## 2. The readings

"Silent" means B1 does not say it; the SP5 TCI operator's manual would be needed.

| Gap | What is needed | B1 page and words (as printed) | Value |
|---|---|---|---|
| TC-02 | modes | p. 2: "Anesthetists could choose either TCI (target control infusion) mode or TIVA (total intravenous anesthesia) mode" | TCI, TIVA (as research/50 W1) |
| TC-03 | four drugs, seven models | p. 2, table "Drug Name / PK Model": Propofol: Marsh, Schnider, Kataria (Pedia), Paedfusor (Pedia); Remifentanil: Minto; "Sulfentanil": Gepts; Alfentanil: Maitre | 4 drugs, 7 models: confirms W1's counts |
| TC-04 | targets | p. 2: Marsh "Plasma"; Schnider "Plasma/Effect Site"; Kataria "Plasma"; Paedfusor "Plasma"; Minto, Gepts, Maitre "Plasma/Effect Site". p. 3: "convert between plasma target and effect site target when you pause the pump" | effect-site only with Schnider, Minto, Gepts, Maitre |
| TC-06 | which drugs and models, and the names as the pump writes them | p. 2 table, as above. The brochure writes the surname: "Marsh", "Schnider", "Kataria (Pedia)", "Paedfusor (Pedia)", "Minto", "Gepts", "Maitre"; drug "Sulfentanil" (a misprint of sufentanil) | filled from B1 (names in the brochure's table; how the pump's own screen writes them is silent) |
| TC-06 | drug concentrations | p. 2, "Drug concentration": propofol "10.0 mg/ml (1%)", "20.0 mg/ml (2%)"; remifentanil "20.0 - 50.0 ug/ml"; sufentanil "0.20 - 5.00 ug/ml"; alfentanil "100 - 500 ug/ml" | filled from B1 |
| TC-06 | age range of each model | p. 2, "Age (years)": Marsh 16 - 150; Schnider 16 - 94; Kataria 3 - 16; Paedfusor 1 - 18; Minto 12 - 100; Gepts 12 - 150; Maitre 18 - 95 | filled from B1 (part of TC-14) |
| TC-07 | syringe sizes | p. 2: "Syringes: 5/10/20/30/50/60ml" | 5, 10, 20, 30, 50, 60 mL |
| TC-08 | rate range and step per syringe | silent | gap |
| TC-09 | maximum rate in TCI | silent | gap |
| TC-10 | bolus and purge rates | silent | gap |
| TC-11 | KVO rate | silent | gap |
| TC-12 | occlusion levels | silent | gap |
| TC-13 | alarm list | silent ("Big alarm light", p. 2, names no alarm) | gap |
| TC-14 | patient data and refusal limits | age ranges per model only (p. 2, above); weight, height, sex and their limits silent | ages filled; the rest a gap |
| TC-15 | target ranges and steps | p. 2, "Cpt/Cet": propofol "0.0 - 15.0ug/ml" (all four models); remifentanil "0.0 - 20.0 ng/ml"; sufentanil "0.0 - 20.0 ng/ml"; alfentanil "0.0 - 500 ng/ml". Step silent | ranges filled; step a gap |
| — | accuracy | p. 4: "within ± 2% when flow rate is ≥ 1ml/h; and 5% when flow rate is < 1ml/h" | recorded, nothing reads it |
| Face | model name as the pump writes it | the brochure's table writes the surname (above); the pump's screen is not shown legibly | brochure's form only |
| Face | display at zero rate and when stopped | silent | gap |
| Face | resolution and unit of Cp, Ce and target | units from p. 2 (µg/mL propofol; ng/mL opioids). The ranges are printed "0.0 - 15.0", "0.0 - 20.0", "0.0 - 500": a printed range, not a stated display resolution | units only; resolution a gap |
| Face | what is on the running screen | p. 3: "Cpt, Cp, Ce/Cet, Ce, Cp display on one screen"; "Drug name and concentration"; "Anesthesia duration time"; "Real-time drug trend, trend time adjustable"; "Real-time flow rate"; "Predicted revival time under current drug concentration" | names only, no format |
| Face | time to empty, remaining volume | silent | gap |
| Face | rate shown during a bolus | silent | gap |
| Face | trailing zeros | silent (the brochure's own text writes "10.0 mg/ml", "0.20 - 5.00 ug/ml" and "Set the rate: 100mL/h", p. 2: marketing text, not the screen) | gap |
| — | induction patterns | p. 3: "4 Induction pattern", "Choose the induction pattern according to patient condition"; the four are not named | silent on which |
| — | Ce lock (OTCI) | p. 3: "can lock Ce by pressing and holding the [Menu] button" | recorded |

## 3. What remains a gap

Every mechanical number: the rate range and step per syringe (TC-08), the TCI maximum (TC-09), bolus and purge (TC-10),
KVO (TC-11), occlusion (TC-12), the alarm list (TC-13), the weight, height and sex limits (TC-14), the target step
(TC-15). Every face format: zero and stopped, Cp/Ce/target resolution, time to empty and remaining volume, the rate during
a bolus, trailing zeros. In particular the 1200 mL/h TCI ceiling cannot be re-sourced from the SP5 TCI's own documents.
These need the SP5 TCI operator's manual (or the SP5 TCI data sheet of 2015-08-07, which is offered only behind a
sign-in or on a site that refuses automated reading).

## 4. Where B1 differs from the pump plan (`docs/plans/pump-rack-tci.md`)

1. **The SP5 TCI holds no Eleveld and no fentanyl model.** The plan lets a TCI channel run Eleveld propofol (the plant's
   default; the A-piece e2e runs "Eleveld Ce 3 µg/mL") and Shafer fentanyl. On a face styled as the SP5 TCI these are
   not the device's sets.
2. **Marsh is plasma-only on the SP5 TCI** (B1 p. 2); the plan does not restrict the target per set.
3. **Syringe sizes.** B1 gives 5, 10, 20, 30, 50, 60 mL; the plan (D12) gives a TCI channel the SP-500's 10, 20, 30,
   50 mL for its non-TCI numbers.
4. **Age ranges** per model (B1 p. 2) are device refusal ranges the plan expects from the SP5 (§ on refusal ranges).
