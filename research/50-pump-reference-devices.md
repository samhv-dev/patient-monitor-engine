# 50. The three reference pumps as their sources show them: every number with its page

Brief 151, 11 Nov 2026; piece S1 of [`docs/plans/pump-rack-tci.md`](../docs/plans/pump-rack-tci.md) (§4 D2, D7, D8,
D12; §11 PQ2). The plan cites this note as `research/50`; until this piece it was a working note outside the
repository, so the plan's citations pointed at nothing. This version is a table of facts: one row per number or alarm
name, each with its document and page and an id that a device profile cites as its `src`
(`packages/controller/pump-devices/{sp-500,ot-701,sp5-tci}.json`). The CI check
(`packages/controller/test/formulary/sources.test.ts`) fails when a profile's `src` is not an id of this note, or when
the row it names gives no page.

The devices are the owner's ruling PQ2 = B (9 November 2026): the department's syringe pump is the **JMS SP-500**, its
drip (volumetric) pump, the "serum pump", the **JMS OT-701**; TCI is not routine in the department, and its reference
is the **Mindray BeneFusion SP5 TCI series**, model name only. The operator manuals of all three are not in the
library: everything a catalogue does not state is a named gap here and a `gap` in the profile, never a likely number.

## How to read this note

**The documents.** The two JMS catalogues are on the owner's machine in `assets/pumps/` (git-ignored, Tier B); none of
them, and no copy, page image or extracted text of them, is in this repository, and the "As printed" column quotes a
few words at most.

| Key | What it is | How I read it |
|---|---|---|
| **J1** | JMS SP-500 Syringe Pump catalogue, document number BRO/500-E/001, "Copyright 2008 JMS North America Corporation"; 2 pages (p. 1 features and applications, p. 2 technical specifications); file title "SP-500 English_FINAL" | `pdftotext -layout`, page by page, 11 Nov 2026 |
| **J2** | JMS OT-701 Peristaltic Infusion Pump catalogue, document number BRO/701-E/001, "Copyright 2012 JMS North America Corporation"; 2 pages (p. 1 characteristics, p. 2 technical specifications) | `pdftotext -layout`, page by page, 11 Nov 2026 |
| **W1** | Mindray, "BeneFusion 5 Series - Infusion System", web page at mindray.com/en/products/infusion-system/benefusion-5-series; no document number, no date (only the site's © 2026); the page states the product is no longer available and points to the BeneFusion e Series | read on the web, 11 Nov 2026; nothing downloaded |

**The tags.** `C`: read in the document's text, on the page cited. `W`: read on the web page W1. `I`: my reading of
the cited rows (never a source value; a profile never cites an `I` row for a number). `GAP`: no document I could read
gives it; the profile carries it as a `gap` naming what the manual must give.

Values are written as the document prints them, units included ("ml" is printed; the profiles write mL).

---

## 1. JMS SP-500 syringe pump (J1)

| Id | Fact | As printed (value) | Source | Tag |
|---|---|---|---|---|
| SP-01 | Name and model | "JMS SYRINGE PUMP", model SP-500 | J1 p. 2 | C |
| SP-02 | What it is for | continuous delivery of medication with a disposable syringe; anaesthetic agents named among the applications | J1 p. 1 | C |
| SP-03 | Syringe sizes | 10, 20, 30 and 50 ml syringes | J1 p. 2 | C |
| SP-04 | Flow rate range, 10 ml syringe | 0.1 to 200 ml/h | J1 p. 2 | C |
| SP-05 | Flow rate range, 20, 30 and 50 ml syringes | 0.1 to 300 ml/h | J1 p. 2 | C |
| SP-06 | Flow rate step | "(0.1 ml/h increments)" | J1 p. 2 | C |
| SP-07 | Rapid flow rate, 10 ml syringe | "Approx." 200 ml/h | J1 p. 2 | C |
| SP-08 | Rapid flow rate, 20 ml syringe | "Approx." 350 ml/h | J1 p. 2 | C |
| SP-09 | Rapid flow rate, 30 ml syringe | "Approx." 450 ml/h | J1 p. 2 | C |
| SP-10 | Rapid flow rate, 50 ml syringe | "Approx." 800 ml/h | J1 p. 2 | C |
| SP-11 | Accuracy | drive ±1 %; with JMS syringes ±3 %; after 1 h at a flow rate of 1 ml/h or higher | J1 p. 2 | C |
| SP-12 | Total volume display | 0.1 to 999.9 ml, resettable | J1 p. 2 | C |
| SP-13 | Occlusion level L (low) | 0.2–0.6 kgf/cm², 150–440 mmHg, 20–60 kPa | J1 p. 2 | C |
| SP-14 | Occlusion level M (medium) | 0.5–0.9 kgf/cm², 370–660 mmHg, 50–90 kPa | J1 p. 2 | C |
| SP-15 | Occlusion level H (high) | 0.8–1.4 kgf/cm², 590–1000 mmHg, 80–140 kPa | J1 p. 2 | C |
| SP-16 | Occlusion levels selectable | "Three levels can be selected" | J1 p. 2 | C |
| SP-17 | Alarms (the catalogue's list, in its order) | Occlusion, Low Battery, Almost Empty, End, Syringe Disengaged, Reminder | J1 p. 2 | C |
| SP-18 | Occlusion sensing | a load cell in the slider monitors occlusion pressure | J1 p. 1 | C |
| SP-19 | Battery | nickel-cadmium; about 4 h on a fully charged new battery; recharge 17 h from drained | J1 p. 2 | C |
| SP-20 | The rapid flow rate as bolus and purge rate | the catalogue prints a "Rapid Flow Rate" per syringe size and names no bolus or purge function; the plan (D2 item 5, D7) uses SP-07 to SP-10 for both | J1 p. 2; plan D2, D7 | I |
| SP-21 | Near-end (Almost Empty) time | not in J1: the operator manual must give when Almost Empty is raised | — | GAP |
| SP-22 | Bolus volume limits and bolus programming | not in J1 | — | GAP |
| SP-23 | Purge volume limit | not in J1 | — | GAP |
| SP-24 | Time or volume to the occlusion alarm at each level | not in J1 (SP-13 to SP-15 give pressures only) | — | GAP |
| SP-25 | Syringe brands and models the pump is calibrated for | not in J1 beyond "with JMS syringes" (SP-11) | — | GAP |
| SP-26 | KVO after End or Almost Empty | not in J1 | — | GAP |
| SP-27 | Dose-rate (mg/kg/h and similar) programming | not in J1: the catalogue gives the rate in ml/h only | — | GAP |

## 2. JMS OT-701 peristaltic infusion pump (J2)

| Id | Fact | As printed (value) | Source | Tag |
|---|---|---|---|---|
| OT-01 | Name and model | "INFUSION PUMP", model OT-701 | J2 p. 2 | C |
| OT-02 | Pump type | "Drip Rate Peristaltic Finger Pump" | J2 p. 2 | C |
| OT-03 | IV set types | standard PVC IV set of 15 or 20 drops/ml, or a micro drip set of 60 drops/ml | J2 p. 2 | C |
| OT-04 | Tubing | 3.4–4.5 mm outer diameter (printed on the set line, after the micro drip set) | J2 p. 2 | C |
| OT-05 | Flow rate, 15 drops/ml set | ml/hr: standard 1.0–450, narrow 1.0–100; drops/min: standard 1–100, narrow 1–100 | J2 p. 2 | C |
| OT-06 | Flow rate, 20 drops/ml set | ml/hr: standard 1.0–450, narrow 1.0–100; drops/min: standard 1–100, narrow 1–100 | J2 p. 2 | C |
| OT-07 | Flow rate, 60 drops/ml set | ml/hr: standard 1.0–100, narrow 1.0–100; drops/min: standard 1–100, narrow 1–100 | J2 p. 2 | C |
| OT-08 | Factory settings | flow rate unit ml/hr; flow rate range "Standard" | J2 p. 2 | C |
| OT-09 | Rate step | "1 ml step" | J2 p. 2 | C |
| OT-10 | Flow rate accuracy | ±10 % (with the adjusting function) | J2 p. 2 | C |
| OT-11 | Drip rate accuracy | ±2 % after more than 500 drops | J2 p. 2 | C |
| OT-12 | Volume infused display | 0–9999 ml | J2 p. 2 | C |
| OT-13 | Volume limit | 1–9999 ml, or no limit | J2 p. 2 | C |
| OT-14 | Purge rate | "more than 450 ml/hr" | J2 p. 2 | C |
| OT-15 | KVO (keep vein open) rate | 1 ml/hr | J2 p. 2 | C |
| OT-16 | Occlusion pressure | printed "100±400 kPa (1±0.4kgf/cm2)"; the kgf/cm² figure is carried (1 ± 0.4 kgf/cm², about 98 ± 39 kPa); the kPa figure as printed cannot be a pressure band (it would reach below zero) and is read as a misprint, not carried | J2 p. 2 | C |
| OT-17 | Alarms (the catalogue's list, in its order) | Door Open, Low Battery, Internal Malfunction, Air in Line, Infusion Complete, Empty Container, Reminder, Abnormal Drips | J2 p. 2 | C |
| OT-18 | Air detection | ultrasonic; "Air Detector" among the characteristics | J2 p. 1, p. 2 | C |
| OT-19 | Drip detection | double infrared photoelectric beam; a drip detector among the accessories | J2 p. 2 | C |
| OT-20 | Battery | nickel-cadmium; 4 h at 125 ml/hr fully charged; recharge 30 h from discharged | J2 p. 2 | C |
| OT-21 | No bolus and no TCI | neither page names a bolus or a TCI function | J2 pp. 1–2 | I |
| OT-22 | Drops/min step | not in J2 (the range is printed in whole drops, OT-05 to OT-07; the step is not stated) | — | GAP |
| OT-23 | When the narrow range applies and how it is chosen | not in J2 beyond its existence and the factory setting (OT-08) | — | GAP |
| OT-24 | Whether and when KVO starts after Infusion Complete | not in J2 (OT-15 gives the rate only) | — | GAP |
| OT-25 | Purge volume limit | not in J2 | — | GAP |
| OT-26 | Time or volume to the occlusion alarm | not in J2 | — | GAP |
| OT-27 | Air-in-line detection threshold (bubble size) | not in J2 | — | GAP |

## 3. Mindray BeneFusion SP5 TCI (W1)

The owner gave the model name only. The maker's own page W1 is the one maker's publication I could read; it gives the
pump's TCI features in a few words and no number of the pump's mechanics. Every such number is a gap.

| Id | Fact | As printed (value) | Source | Tag |
|---|---|---|---|---|
| TC-01 | Model and series | "BeneFusion SP5 TCI/ DTCI", listed in the BeneFusion 5 series | W1 | W |
| TC-02 | TCI and TIVA modes | "Smart TCI mode and TIVA mode" | W1 | W |
| TC-03 | Number of anaesthetics and protocols | 4 anaesthetics and 7 protocols, for adults and children | W1 | W |
| TC-04 | Concentrations shown | effect-site and plasma concentration trend | W1 | W |
| TC-05 | Drug compensation | "automatic drug compensation" is named, with no detail | W1 | W |
| TC-06 | Which four drugs and which seven models | not in W1 | — | GAP |
| TC-07 | Syringe sizes | not in W1 | — | GAP |
| TC-08 | Flow rate range and step, per syringe size | not in W1 | — | GAP |
| TC-09 | Maximum rate in TCI (the induction rate) | not in W1 | — | GAP |
| TC-10 | Bolus and purge rates | not in W1 | — | GAP |
| TC-11 | KVO rate | not in W1 | — | GAP |
| TC-12 | Occlusion levels or pressures | not in W1 | — | GAP |
| TC-13 | Alarm list | not in W1 | — | GAP |
| TC-14 | Patient data the pump accepts (age, weight, height, sex) and the limits it refuses outside | not in W1 (plan D6) | — | GAP |
| TC-15 | Target ranges and steps, plasma and effect-site | not in W1 | — | GAP |

**What else the web search showed, and why none of it is used.** A search on 11 November 2026 found a "BeneFusion SP5"
specification sheet only as copies uploaded to third-party document sites (not the maker's publication, no document
number legible, and for the SP5 without TCI: it lists rate, time and body-weight modes and no TCI mode), Mindray's
safety-and-performance summaries of other models (uSP, iSP, uDSP) and a data sheet of the eSP TCI. Numbers of another
model, or of a copy whose origin cannot be read, are not the SP5 TCI's: TC-07 to TC-15 stay gaps until the SP5 TCI
operator's manual is in the library (plan SK2).

## 4. Facts in the catalogues that no profile carries

Power supply, power consumption, classification, standards, dimensions, weight, operating and storage conditions,
communication, nurse call, the finger cassette and tube clamp, the display and the accessories (J1 p. 2, J2 p. 2) are
read and left out: no simulated behaviour depends on them.
