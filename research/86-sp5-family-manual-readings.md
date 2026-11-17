# 86. Mindray BeneFusion SP5 family: operator's manual readings

The simulator's TCI pump is styled on the Mindray BeneFusion SP5 TCI. Its brochure (research/84) gives the TCI library
and the syringe sizes and no number of the pump's mechanics; the SP5 TCI's own operator's manual has not been found
openly offered. This note records the operator's manual of the **plain SP5**, which "is also applicable to BeneFusion SP5
Ex, BeneFusion SP5 TIVA" and never names TCI. Every number below is therefore the SP5 family's, not the TCI edition's,
and the profile marks each one so (`whose`). The rows TM-nn are what
`packages/controller/pump-devices/sp5-tci.json` cites as its `src`; the CI check
(`packages/controller/test/formulary/sources.test.ts`) reads them beside research/50's and research/84's.

The owner ruled on 17 November 2026 that the family's rate maximum for the loaded syringe stands in for the TCI
edition's highest TCI rate (research/50 TC-09), labelled as the family's number, until the TCI edition's manual is read.

## 1. The document

| Key | What it is | How I read it |
|---|---|---|
| **M1** | Mindray, "BeneFusion SP5 Syringe Pump Operator's Manual", P/N 046-005902-00(13.0), Version 13.0, issue date 2017-10; cover: "(This manual is also applicable to BeneFusion SP5 Ex, BeneFusion SP5 TIVA Syringe Pumps)". The word TCI does not occur. 127 PDF pages, 2 895 649 bytes, SHA-256 `ab5ef25541f6250bd54941fac10abede715baafd10a55e36ce1363268006847a` | on the owner's machine in `assets/pumps/sp5-operators-manual-v13-0/` (git-ignored, Tier B; saved by hand, not downloaded by an executor); `pdftotext -layout`, page by page, 17 Nov 2026. A printed page often spans two PDF pages: "p. A-5 (PDF 87)" gives the printed page, then the PDF page |

The tags are research/50's: `C` read in the document's text on the page cited.

## 2. The rows

| Id | Fact | As printed (value) | Source | Tag |
|---|---|---|---|---|
| TM-01 | Rate range per syringe size | "5ml syringe: 0.10-100ml/h"; 10 mL "0.10-200ml/h"; 20 mL "0.10-400ml/h"; 30 mL "0.10-600ml/h"; "50ml/60ml syringe: 0.10-1500ml/h" | M1 p. A-5 (PDF 87); the same ranges for Rate Mode, p. 5-1 (PDF 41) | C |
| TM-02 | Rate step | "Minimum increment of rate 0.01 ml/h" | M1 p. A-5 (PDF 87) | C |
| TM-03 | Bolus rate range | "The same with rate range"; "Bolus accuracy is not declared" | M1 p. A-5 (PDF 87) | C |
| TM-04 | Bolus default rate | the default is "the maximum rate of each specification of syringe", and for 50/60 mL "800ml/h" | M1 p. 4-8 (PDF 39) | C |
| TM-05 | Purge rate range | "The same with rate range" | M1 p. A-5 (PDF 87) | C |
| TM-06 | Purge default rate | the same two statements as TM-04, for purge; the purge volume "is not added to the total volume" | M1 p. 4-5 (PDF 36) | C |
| TM-07 | KVO rate range and step | "0.1 - 5.0 ml/h, the increment is 0.1ml/h" | M1 p. A-5 (PDF 88); p. 6-1 (PDF 55) | C |
| TM-08 | KVO factory default | "KVO rate 1.0ml/h" | M1 p. C-1 (PDF 106) | C |
| TM-09 | KVO duration | KVO "will run for 30 min at most", then the [KVO Finish] alarm | M1 p. 4-9 (PDF 40) | C |
| TM-10 | Occlusion levels | "1-11", "(150, 225,300, 375, 450, 525, 600, 750, 825, 900 and 975) mmHg" (no 675); maximum "about 1300mmHg" | M1 p. A-5 (PDF 88); p. 6-1 (PDF 55) | C |
| TM-11 | Occlusion factory default | "Occlusion pressure 450mmHg" | M1 p. C-1 (PDF 107) | C |
| TM-12 | Alarm list and levels | High: Occlusion, Battery empty, VTBI done, KVO finish, Syringe empty, Syringe disengaged, System error. Mid-level: "System abnomal" (as printed). Low: Reminder, Battery low, Syringe nearly empty, VTBI near done, Standby time expired, Pump serial number conflict, Communication is interrupted, Relay invalid, No battery inserted, AC power disconnection, Syringe not correctly inserted | M1 pp. D-1–D-4 (PDF 110–116) | C |
| TM-13 | Alarm signals per level | high: red, "10 seconds", "2.0±0.6Hz", "20%~60%", black on red; mid: yellow, "15 seconds", "0.6±0.2Hz", "20%~60%", black on yellow; low: yellow, "20 seconds", "Steady", "100%", white on black | M1 p. 8-1 (PDF 64–65) | C |
| TM-14 | Volume ranges | "VTBI range 0.10-9999.99 ml"; "Volume range 0.01-9999.99 ml"; each "the increment is 0.01 ml" | M1 p. A-5 (PDF 87) | C |
| TM-15 | Time display range | "00:00:01-99:59:59 h:m:s" | M1 p. A-5 (PDF 87) | C |

**The bolus and purge default disagree with themselves (TM-04, TM-06).** Each sentence gives the rule "the maximum rate
of each specification of syringe", which for a 50/60 mL syringe is 1500 mL/h (TM-01), and then prints 800 mL/h for that
syringe. The profile records the printed 800 and notes the contradiction.

## 3. The gaps

| Gap | Need | M1 | In the profile |
|---|---|---|---|
| research/50 TC-08 | rate range and step per syringe | TM-01, TM-02 | `rate`, the family's |
| research/50 TC-09 | highest rate in TCI | silent (no TCI) | `tci.maxRate`: the family's `rate` maximum for the syringe, standing in by the owner's ruling |
| research/50 TC-10 | bolus and purge rates | TM-03 to TM-06 | `bolus`, `purge`, the family's |
| research/50 TC-11 | KVO rate | TM-07 to TM-09 | `kvo`, the family's |
| research/50 TC-12 | occlusion levels | TM-10, TM-11 | `occlusion`, the family's |
| research/50 TC-13 | alarm list | TM-12, TM-13 | `alarms`, the family's |
| research/50 TC-14 | patient data and limits | silent for TCI (Body Weight Mode: weight 0.1–300.0 kg, p. 5-2) | gap |
| research/50 TC-15 | target steps | silent (no TCI) | gap |

A TCI channel still uses the SP-500's numbers for everything but its TCI rate (plan D12): the family's bolus, purge,
KVO, occlusion and alarm readings are data only and change nothing a channel does.

Also read, not carried as data: the accuracy (p. A-6, PDF 89) is the brochure's (research/84 TB-07); the recommended
syringe brands (p. 6-4, PDF 58); TIVA mode (p. 5-4, PDF 47–48), a dose-over-time induction with no model, whose
induction and maintenance rates are capped by the same rate ranges (TM-01).
