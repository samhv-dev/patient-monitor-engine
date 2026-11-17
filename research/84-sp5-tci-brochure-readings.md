# 84. Mindray BeneFusion SP5 TCI: brochure readings

The TCI pump of the simulator is styled on the Mindray BeneFusion SP5 TCI, and the device numbers of
`packages/controller/pump-devices/sp5-tci.json` were named gaps (research/50 TC-06 to TC-15). The pump's operator's
manual could not be obtained; this note records the one document of the SP5 TCI itself that could be read, its maker's
brochure, what it gives, and what stays a gap. Nothing here is read from the operator's manual. The rows TB-nn below
are what the profile cites as its `src`; the CI check (`packages/controller/test/formulary/sources.test.ts`) reads them
beside research/50's.

## 1. The documents

**The operator's manual for the SP5 TCI was not found openly offered.** Searches (English, Russian; the maker's site,
the maker's safety-and-performance library, distributors, public procurement stores) found no copy of a "BeneFusion SP5
TCI" or "SP5 DTCI" operator's manual. What exists and why none of it is used:

| Document | Where | Why not used |
|---|---|---|
| BeneFusion SP5 Syringe Pump Operator's Manual V13.0, 2017-10, "also applicable to BeneFusion SP5 Ex, BeneFusion SP5 TIVA" | a third-party upload site | the plain SP5 edition, not the TCI one; the site refuses automated reading |
| BeneFusion SP5 TCI Datasheet 20150807 EN | third-party upload sites | a data sheet, not the manual; offered only behind a sign-in or on a site that refuses automated reading |
| BeneFusion SP5 Syringe Pump Data Sheet | a public procurement store | the plain SP5, a neighbouring model: its numbers are not the SP5 TCI's |
| BeneFusion SP5 Service Manual V1.0, Service Training V1.0 | a third-party upload site | the plain SP5, for technicians; the site refuses automated reading |
| BeneFusion iSP, uSP, eSP operator's manuals and safety summaries | the maker's site, a public procurement store | other models |

| Key | What it is | How I read it |
|---|---|---|
| **B1** | Mindray, "BeneFusion SP5 TCI, Advanced Anesthesia Syringe Pump", brochure, part number `ENG-BeneFusion SP5 TCI-210x285x8P-20150911` (Mindray Medical Netherlands B.V.); 4 PDF pages, each a two-page spread; 910 607 bytes, created 2015-09-15, SHA-256 `5186190946081037871a05700ce21151f450ecbfe087baf60da68e4bc648458d`; openly offered by a distributor at `https://infiniti.se/wp-content/uploads/Broschyr-BEneFusion-SP5-TCI.pdf` | downloaded 17 Nov 2026 into `assets/pumps/sp5-tci-brochure-infiniti/` (git-ignored, Tier B); `pdftotext`, page by page. Pages below are the PDF's pages |

B1 is a brochure: it names the drugs, models, concentrations, ages and target ranges, and gives no number of the pump's
mechanics. The tags are research/50's: `C` read in the document's text on the page cited.

## 2. The rows

| Id | Fact | As printed (value) | Source | Tag |
|---|---|---|---|---|
| TB-01 | The four drugs of the TCI library | "Propofol", "Remifentanil", "Sulfentanil" (sufentanil, misprinted), "Alfentanil" | B1 p. 2 | C |
| TB-02 | The seven models, as written, and the target each takes | Propofol: "Marsh" Plasma; "Schnider" Plasma/Effect Site; "Kataria (Pedia)" Plasma; "Paedfusor (Pedia)" Plasma. "Minto", "Gepts", "Maitre": Plasma/Effect Site | B1 p. 2 | C |
| TB-03 | Drug concentrations | propofol "10.0 mg/ml (1%)", "20.0 mg/ml (2%)"; remifentanil "20.0 - 50.0 ug/ml"; sufentanil "0.20 - 5.00 ug/ml"; alfentanil "100 - 500 ug/ml" | B1 p. 2 | C |
| TB-04 | Target ranges (Cpt/Cet) | propofol "0.0 - 15.0ug/ml" (all four models); remifentanil "0.0 - 20.0 ng/ml"; sufentanil "0.0 - 20.0 ng/ml"; alfentanil "0.0 - 500 ng/ml" | B1 p. 2 | C |
| TB-05 | Age column per model | "Age (years)": Marsh 16 - 150; Schnider 16 - 94; Kataria 3 - 16; Paedfusor 1 - 18; Minto 12 - 100; Gepts 12 - 150; Maitre 18 - 95 | B1 p. 2 | C |
| TB-06 | Syringe sizes | "Syringes: 5/10/20/30/50/60ml" | B1 p. 2 | C |
| TB-07 | Accuracy | "within ± 2% when flow rate is ≥ 1ml/h; and 5% when flow rate is < 1ml/h" | B1 p. 4 | C |

Also read, not carried as data: p. 2 "Anesthetists could choose either TCI (target control infusion) mode or TIVA
(total intravenous anesthesia) mode" (as research/50 TC-02); p. 3 the running screen shows "Cpt, Cp, Ce/Cet, Ce, Cp",
"Drug name and concentration", "Anesthesia duration time", "Real-time flow rate", "Predicted revival time"; p. 3 the
target can be converted between plasma and effect site "when you pause the pump"; p. 3 "4 Induction pattern", the four
not named; p. 3 Ce can be locked by pressing and holding a button (OTCI).

## 3. The gaps and the face's open points

| Gap | What is needed | B1 | Value |
|---|---|---|---|
| research/50 TC-03, TC-06 | which drugs and models | TB-01, TB-02 | filled |
| research/50 TC-04 | targets per model | TB-02 | filled |
| research/50 TC-07 | syringe sizes | TB-06 | filled |
| research/50 TC-08 | rate range and step per syringe | silent | gap |
| research/50 TC-09 | maximum rate in TCI | silent | gap |
| research/50 TC-10 | bolus and purge rates | silent | gap |
| research/50 TC-11 | KVO rate | silent | gap |
| research/50 TC-12 | occlusion levels | silent | gap |
| research/50 TC-13 | alarm list | silent (p. 2 names a "Big alarm light", no alarm) | gap |
| research/50 TC-14 | patient data and refusal limits | an age column per model (TB-05); whether the pump refuses outside it, and weight, height and sex, silent | ages recorded; the limits a gap |
| research/50 TC-15 | target ranges and steps | ranges TB-04; step silent | ranges filled; step a gap |
| Face | model name as the pump writes it | the brochure's table writes the author's surname (TB-02); the pump's own screen is not shown legibly | the brochure's form |
| Face | display at zero rate and when stopped | silent | gap |
| Face | resolution and unit of Cp, Ce and target | units TB-04 (µg/mL propofol; ng/mL opioids); "0.0 - 15.0" is a printed range, not a stated display resolution | units; resolution a gap |
| Face | time to empty, remaining volume | silent | gap |
| Face | rate shown during a bolus | silent | gap |
| Face | trailing zeros | silent (the brochure's own text is not the screen) | gap |

The brochure's gaps TC-08 to TC-13 are now filled from the SP5 family's operator's manual, as the family's numbers
(research/86).

Every mechanical number, and so the TCI rate ceiling, needs the SP5 TCI operator's manual (or its 2015-08-07 data
sheet).

## 4. Where B1 differs from the pump plan (`docs/plans/pump-rack-tci.md`)

1. The SP5 TCI holds no Eleveld and no fentanyl model; the plan lets a TCI channel run Eleveld propofol and Shafer
   fentanyl.
2. Marsh, Kataria and Paedfusor take a plasma target only on the SP5 TCI; the plan restricts the target only where a
   set has no ke0.
3. B1 gives syringes of 5 to 60 mL; the plan (D12) gives a TCI channel the SP-500's 10, 20, 30 and 50 mL.
4. B1 prints an age column per model; whether the pump refuses outside it is silent, and the plan allows a value
   outside a set's study population with a notice.
