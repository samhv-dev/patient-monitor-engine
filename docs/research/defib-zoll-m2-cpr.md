# The ZOLL M2: compression depth and rate against flow and pressure, and rescuer fatigue — research note (M0c)

**STATUS: RESEARCH NOTE (2026-11-12), brief 177, piece M0c of `docs/plans/defibrillator-zoll-m2.md`.** No code, no
constant and no change to the plan's structure. The engine piece E3 (compressions as events with a depth, plan §3.1 C5)
builds from this note. It answers the plan's gaps G-CPR (§3.3) and G-FAT (§3.3), and gives the comparison DQ23 asks for
(G-ANCHOR). Every number below carries the source that measured it, the species and the model, and where it was read.
Where nothing was found, the note says so, and the item stays a named gap for the owner. No value here is an estimate of
this note's own; where the note does arithmetic on a source's numbers (a ratio, a difference), it says so and shows it.

**How sources were read.** Each row says which:

- **Guide**: the ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C (Dec 2021), local copy (never in the repository),
  cited [G printed page].
- **Abstract**: the record and abstract from Europe PMC's REST search. The page cited is the article's first page; an
  abstract gives no finer page.
- **Full text**: open-access full text from Europe PMC's `fullTextXML` service, or the PMC web page. Cited by table or
  figure, because those services give no printed page.
- **Library**: the AHA 2025 and ERC 2025 guideline PDFs and two textbook chapters in `library/sources/`, read as text.
  Pages are PDF pages of the library file.

Every DOI below was resolved through the doi.org handle service (response code 1) and its record checked in Crossref on
2026-11-12. "Animal" means the numbers are from that species and preparation only; none is carried to humans here.

---

## 0. What the device measures, and what the engine does today

### 0.1 The guide

- The sensor sits between the rescuer's hands and the lower sternum and reports **rate and depth only** [G 15-1].
- Range 1.9–7.6 cm, accuracy ± 0.6 cm; rate 50–150 /min; metronome 105 /min (configurable) [G A-10].
- "Push Harder" when depth is "consistently less than the target depth of 5 centimeters (2 inches)"; "Good
  Compressions" when it is then consistently above it; adults only [G 15-3].
- Rate shows "- - -" when no compression was detected "during the past few seconds" [G 15-3].
- Bar graph 0–7.6 cm, markers 0, 5 and 6 cm adult; 0, 2.5 and 5 cm paediatric; 12.5 mm/s [G 15-4].
- No release, leaning, duty-cycle or force measure appears in chapter 15 or in the CPR rows of [G A-10]. So of the
  quantities below, the device can show **depth and rate**; duty cycle and recoil are not measured by it.

### 0.2 The engine (at `3a373c24`, the plan branch)

The haemodynamic effect of CPR today is in the circulation, not in `l2/hemo/params.ts`:

| Quantity | Where | Value | How `quality` enters |
|---|---|---|---|
| Compression waveform | `l2/hemo/pipeline.ts:265` `cprPressure` | half-sine over the compression phase of each `60/rate` cycle | amplitude × `quality` |
| Duty cycle | `l2/hemo/params.ts:78` `CPR_DUTY` | 0.5 | none (marked `[ENG: scenario]`) |
| Direct cardiac compression | `l2/circ/params.ts:114` `CPR_CARDIAC_MMHG` | 24 mmHg per unit quality | × `cprPressure` (`pipeline.ts:286`) |
| Thoracic pump | `l2/circ/params.ts:116` `CPR_THORACIC_MMHG` | 24 mmHg per unit quality | × `cprPressure` (`pipeline.ts:287`) |
| Incomplete recoil | `l2/circ/params.ts:130` `CPR_RELEASE_RESIDUAL` | 0.65 of the thoracic amplitude, on the venous side through release | × `quality` (`pipeline.ts:289`) |
| Volume available to displace | `l2/circ/params.ts:123` `V_CPR_REF_FRAC`, `l2/circ/circuit.ts:131–143` | 8 % of blood volume | the three pressures × min(1, stressed intrathoracic volume / reference) |
| ECG artefact | `pipeline.ts:902` | `depth: min(1, quality)` | — |
| Learner default | `l2/hemo/params.ts:75` | 0.8 | — |
| Instructor choices | `apps/demo/src/app/panel/defib.ts:25` | Poor 0.4, Good 0.8, Excellent 1 | — |
| Accepted range | `pipeline.ts:768–769` | rate 60–150 /min, quality 0–1.5 | — |

The three pressure constants are marked `[FIT: … fitted to the prototype/Paradis bands]` in their own comments.

**A correction for E3.** The plan's C5 names `CPR_SV_FRAC` and `CPR_THORACIC_MMHG` in `l2/hemo/params.ts:74–77` as the
constants scaled by quality. Those two (0.2 and 40 mmHg) are no longer read anywhere in `packages/` (`git grep`, only
their definitions remain). The live constants are the four in `l2/circ/params.ts` above. A depth model replaces the
`quality` factor in `cprPressure` and in `cprRelease`; it does not touch the hemo constants.

**What today's quality values produce.** Only what the tests record, with their rigs (no new run was made for this
note; the numbers are the measured values written into the tests at this commit):

| quality | rate | Measured | Test |
|---|---|---|---|
| 0.4 | 110 | mean CoPP < 15 mmHg over 5 min after a drained tamponade (asserted, value printed at run time only) | `test/engine/circ-tamponade-drainage.test.ts:58` |
| 0.4 / 0.5 / 0.8 / 1.0 / 1.2 | 110 | the circulation's CPR flow 0.87 / 1.08 / 1.64 / 1.80 / 1.75 L/min | comment, `test/engine/cpr-etco2.test.ts:25–26` |
| 0.5 / 0.8 / 1.0 / 1.2 | 110, BVM 10 /min | mean EtCO2 minutes 1–10: 20.5 / 25.2 / 26.6 / 26.6 mmHg | `cpr-etco2.test.ts:28` (an `it.fails`: misses its own map) |
| 0.8 | 110 | VF, CoPP 26.3–28.1 mmHg over 1–5 min (band 0–21.9 from Paradis 1990; missed) | `test/engine/clinical-suite.test.ts:230` (`it.fails`) |
| 0.8 | 110 | asystole: SBP 60–110, DBP 10–30, CO 1–2.5 L/min (asserted, passes) | `test/engine/circ-arrest.test.ts:15` |
| 1.0 | 110 | asystole: arterial 70–110 / ≥ 10 (passes); trough 25.2 mmHg | `test/engine/hemo-acceptance.test.ts:204`, `:227` |

No test records CoPP at quality 0.4 or 1.0 in VF, nor any value at a rate other than 110 (one tamponade arm at 120).
These are the numbers DQ23's anchor must keep (§3).

---

## 1. Depth and rate against flow and pressure

### 1.1 Every measured relation found

| # | Source | Species, n, model | Varied | Measured | The relation as the paper gives it | Read as |
|---|---|---|---|---|---|---|
| R1 | Babbs CF et al. Ann Emerg Med 1983;12:527–532, DOI 10.1016/s0196-0644(83)80290-x | dogs 6–12 kg, n 8, VF, mechanical compressor (Thumper) | compression depth | cardiac output (indicator dilution), mean arterial pressure | "CO = a(x − x0) for x greater than x0"; threshold x0 1.5–3.0 cm per dog, **mean 2.3 cm**; a threshold for measurable pressure in 7 of 8 dogs, **mean 1.8 cm**. Values of `a` not in the abstract | Abstract, p. 527 |
| R2 | Bellamy RF et al. Circulation 1984;69:174–180, DOI 10.1161/01.cir.69.1.174 | swine, n 9, VF, Thumper, **transverse** compression, 66 /min, 50 % duty | piston stroke 1.5 / 2 / 2.5 in | MAP; systemic flow (microspheres); coronary flow (% of pre-arrest, EMF / microspheres) | MAP 23 ± 4 / 33 ± 5 / 40 ± 6 mmHg; flow 525 ± 195 / 692 ± 202 / 817 ± 321 mL/min; coronary EMF 12 ± 5 / 30 ± 6 / 50 ± 12 %, RMS 16 ± 5 / 26 ± 11 / 40 ± 20 %. All coronary flow in the relaxation phase. Piston stroke, not measured sternal displacement | Abstract, p. 174 |
| R3 | Ryu SJ et al. Acta Anaesthesiol Scand 2016;60:1012–1023, DOI 10.1111/aas.12728 | pigs, n 16, VF | depth 20 % of AP diameter vs 70 % of that | SBP, DBP, CPP, EtCO2, ScvO2 | SBP tracked depth "most accurately and immediately" (AUC 0.895–0.939); EtCO2 comparable, 0.5 min slower; ScvO2 did not. Adrenaline raised SBP, DBP, CPP but not EtCO2. Values per depth not in the abstract | Abstract, p. 1012 |
| R4 | Ristagno G et al. Chest 2007;132:70–75, DOI 10.1378/chest.06-3065 | pigs 40 ± 2 kg, n 24, ischaemic VF 5 min, mechanical | 25 % AP (≈ 6 cm) vs 70 % of it (≈ 4.2 cm) | CPP, PetCO2, ROSC | CPP and PetCO2 "significantly lower" at ≈ 4.2 cm; no ROSC when ≈ 4.2 cm compressions came first; all resuscitated at ≈ 6 cm. Values not in the abstract | Abstract, p. 70 |
| R5 | Liang L et al. J Thorac Dis 2021;13:5788–5798, DOI 10.21037/jtd-21-812 | pigs 38 ± 2 kg, n 16, VF 7 min, miniaturised mechanical compressor, adrenaline from min 2 | 30 mm vs 50 mm | CPP, carotid flow, EtCO2, intrathoracic pressure | **no significant difference** in CPP, carotid flow or EtCO2 over 5 min; intrathoracic positive pressure and SBP lower at 30 mm in the first minute only | Abstract, p. 5788 |
| R6 | Bruckner M et al. Arch Dis Child Fetal Neonatal Ed 2021;106:553–556, DOI 10.1136/archdischild-2020-319473 | newborn piglets 1.7–2.3 kg, n 8, asphyxia, automated | 25 / 33 / 40 % AP | carotid flow, SBP | highest at 40 % AP: carotid flow 19.3 ± 7.5 mL/min/kg, SBP 58 ± 32 mmHg | Abstract, p. 553 |
| R7 | Bruckner M et al. Arch Dis Child Fetal Neonatal Ed 2022;107:262–268, DOI 10.1136/archdischild-2021-321860 | newborn piglets, n 8 per group, asphyxia, 90 /min | 12.5 / 25 / 33 / 40 % AP | arterial pressure, CVP, carotid flow, force, ROSC | all increased with depth; ROSC 0/8, 6/8, 7/8, 7/8 | Abstract, p. 262 |
| R8 | Maher KO et al. Resuscitation 2009;80:662–664, DOI 10.1016/j.resuscitation.2009.03.016 | **human** infants after cardiac surgery, n 6 | attempted 1/3 vs 1/2 AP | intra-arterial pressure | SBP 83.4 vs 51.6 mmHg; DBP 30.5 vs 30.6 (no change) | Abstract, p. 662 |
| R9 | Halperin HR et al. Circulation 1986;73:539–550, DOI 10.1161/01.cir.73.3.539 | dogs 21–32 kg, n 8 + 8, VF, manual, peak sternal force 378–426 N | rate 60 → 150; compression duration 14 → 46 % | myocardial and cerebral flow (microspheres), perfusion pressures | manual external CPR: flow **rose with duration**, **unchanged with rate** 60 → 150 at constant duration (as vest CPR, thoracic pump); open-chest direct compression: the reverse (rate-dependent, duration-independent) | Abstract, p. 539 |
| R10 | Feneley MP et al. Circulation 1988;77:240–250, DOI 10.1161/01.cir.77.1.240 | dogs 17–30 kg, n 26, VF, manual, 30 min, duty 51.7 vs 51.6 % | rate 60 vs 120 | aortic and CPP, defibrillation, 24-h survival | 120 /min: higher mean aortic and CPP (p < .002), defibrillated 12/13 vs 2/13, 24-h survival 8/13 vs 2/13. Pressure values not in the abstract | Abstract, p. 240 |
| R11 | Wolfe JA et al. J Thorac Cardiovasc Surg 1988;95:523–532, DOI 10.1016/s0022-5223(19)35774-5 | dogs, n 8, VF, manual "high-impulse" | rate 60 → 150 | circumflex coronary flow (EMF), aortic flow | CO and diastolic aortic pressure rose with rate; diastolic perfusion time fell linearly with rate; net coronary flow optimal at **120 /min** | Abstract, p. 523 |
| R12 | Maier GW et al. Circulation 1986 (supplement summary), PMID 3779933 (no DOI in the record) | dogs, five years of the group's work | rate, force, duration | flows | high velocity, moderate force, brief duration at 120 /min optimised systemic and coronary flow | Abstract only; no DOI to verify |
| R13 | Taylor TG et al. Resuscitation 2021;163:64–70, DOI 10.1016/j.resuscitation.2021.03.035 | pigs 28–46 kg, n 20, VF 10 min, mechanical | alternating 100 / 200 /min every 6 s vs guideline | CPP, cerebral PP, EtCO2, SvO2 | switching to 100 /min raised CPP; switching to 200 /min raised cerebral PP; EtCO2 higher with alternation | Abstract, p. 64 |
| R14 | Ornato JP et al. Crit Care Med 1988;16:241–245, DOI 10.1097/00003246-198803000-00007 | **human** OHCA, n 18, Thumper at constant force, 50:50 | rate 60 → 140 in steps of 20 | PetCO2, arterial pressure | PetCO2 1.7 ± 0.2 % at 60 /min, no significant change at higher rates; SBP **59 ± 5 → 46 ± 4** mmHg (60 → 140); DBP ≈ 23 at all rates. On a manikin, more force was needed at higher rate for the same displacement | Abstract, p. 241 |
| R15 | Kern KB et al. Arch Intern Med 1992;152:145, DOI 10.1001/archinte.1992.00400130153020 | **human**, n 23, manual, crossover | 80 vs 120 /min (audio-paced) | EtCO2 | 15.0 ± 1.8 at 120 vs 13.0 ± 1.8 mmHg at 80; 8.7 ± 1.2 before pacing → 14.0 ± 1.3 after 60 s of tones | Abstract, p. 145 |
| R16 | Sheak KR et al. Resuscitation 2015;89:149–154, DOI 10.1016/j.resuscitation.2015.01.026 | **human** IHCA + OHCA, n 583, 29 028 epochs of 15 s, mixed-effects | depth, rate, ventilation rate | EtCO2 | **+1.4 mmHg per 10 mm depth**; −3.0 mmHg per 10 breaths/min; rate **not** a predictor "over the dynamic range of actual CC delivery" | Abstract, p. 149 |
| R17 | Murphy RA et al. Prehosp Emerg Care 2016;20:369–377, DOI 10.3109/10903127.2015.1115929 | **human** OHCA, n 230, 1 581 minutes, mixed-effects on log EtCO2 | depth, rate, release velocity, ventilation | EtCO2 | **+4.0 % per 10 mm depth**; +1.7 % per 10 /min rate; +2.8 % per 10 mm/s release velocity; −17.4 % per 10 breaths/min | Abstract, p. 369 |
| R18 | Chandran K et al. Prehosp Emerg Care 2025;29:154–161, DOI 10.1080/10903127.2024.2364058 | **human** OHCA, n 335, ZOLL X-series records | patient-mean rate, depth, recoil velocity | EtCO2 | depth–recoil velocity r 0.87; EtCO2–depth r 0.23; EtCO2–recoil velocity r 0.61; rate–depth and EtCO2–rate parabolic (r 0.39, 0.20) | Abstract, p. 154 |
| R19 | Zuercher M et al. Crit Care Med 2010;38:1141–1146, DOI 10.1097/ccm.0b013e3181ce1fe2 | piglets 10.7 ± 1.2 kg, n 10, VF, CPR to aortic SBP 80–90 | lean 0 / 10 / 20 % of compression force (0 / 1.8 / 3.6 kg) | RA diastolic, CPP, cardiac index, LV myocardial flow (microspheres) | RA diastolic 9 ± 0.6 / 10 ± 0.3 / 13 ± 0.3 mmHg; CI 1.9 ± 0.2 / 1.6 ± 0.1 / 1.4 ± 0.2 L/min/m²; myocardial flow 39 ± 7 / 30 ± 6 / 26 ± 6 mL/min/100 g; CPP "decreased" (values not in the abstract) | Abstract, p. 1141 |
| R20 | Niles DE et al. Resuscitation 2011;82 Suppl 2:S23–S26, DOI 10.1016/s0300-9572(11)70147-2 | the R19 piglets, plus 108 adult and 12 paediatric in-hospital events | leaning | as R19; prevalence | lean ≥ 2.5 kg in 91 % of adult events, 12 % of compressions | Abstract, p. S23 |
| R21 | Yannopoulos D et al. Resuscitation 2005;64:363–372, DOI 10.1016/j.resuscitation.2004.10.009 | pigs, n 9, VF 6 min, automated, 100 /min, depth 25 % AP, 15:2 | decompression 100 → 75 → 100 % | CPP, aortic diastolic, MAP, RA diastolic | CPP **23.3 ± 1.9 → 15.1 ± 1.6 → 16.6 ± 1.9** mmHg; aortic diastolic 28.1 → 20.7 → 20.9; MAP 52 → 43.3 → 48.3; RA diastolic 4.8 → 5.6 → 4.3 (n.s.) | Abstract, p. 363 |
| R22 | Glatz AC et al. Resuscitation 2013;84:1674–1679, DOI 10.1016/j.resuscitation.2013.07.010 | **human** children with a beating heart, n 20, anaesthetised | sternal force 0 / 10 / 20 % body weight | RA, ITP, aortic SBP, CPP | RA 6.5 → 7.7 → 8.6 mmHg; CPP 42 → 39 → 38 mmHg | Abstract, p. 1674 |
| R23 | Kim T et al. PLoS One 2020;15:e0228111, DOI 10.1371/journal.pone.0228111 | pigs, n 6 (crossover), VF | duty cycle 33 vs 50 % | EtCO2, SAP, DAP, RAP, CPP | 33 % raised EtCO2 by 1.0 mmHg, SAP +6.0, DAP +8.9, RAP +2.6, CPP +4.7 mmHg; EtCO2 rose 0.6 mmHg/min at 33 %, fell 0.6 at 50 % | Abstract, p. e0228111 (open access, not read beyond the abstract) |
| R24 | Dean JM et al. Circulation 1991;84:896–904, DOI 10.1161/01.cir.84.2.896 | 2-week-old swine, VF, pneumatic, adrenaline infusion | 100 /min 60 %; 100 /min 30 %; 150 /min 30 % | myocardial and cerebral flow over 50 min | equal at 5 min; by 35 min < 5 mL/min/100 g myocardial at 60 %, > 25 at 30 % for 50 min | Abstract, p. 896 |
| R25 | Dean JM et al. J Appl Physiol 1990;68:554–560, DOI 10.1152/jappl.1990.68.2.554 | 2- and 8-week-old swine, VF | rate 40–150, duty 10–80 % | cerebral PP, chest geometry | cerebral PP rose with duty until relaxation time was too short (150–200 ms at 2 wk, 250–300 ms at 8 wk) | Abstract, p. 554 |
| R26 | Tomlinson AE et al. Resuscitation 2007;72:364–370, DOI 10.1016/j.resuscitation.2006.07.017 | **human** OHCA, n 91 | — | force and depth (sternal pad) | strongly non-linear force–depth; mean force 30.3 ± 8.2 kg, mean depth 42 ± 8 mm; 38 mm with < 50 kg in 87/91; residual decompression force 1.7 ± 1.0 kg = 3 ± 2 mm | Abstract, p. 364 |
| R27 | Paradis NA et al. JAMA 1990;263:1106, DOI 10.1001/jama.1990.03440080084029 | **human**, n 100 | — | CPP | initial CPP 1.6 ± 8.5 (no ROSC) vs 13.4 ± 8.5 mmHg (ROSC); maximal 8.4 ± 10.0 vs 25.6 ± 7.7; ROSC only with maximal CPP ≥ 15. **No compression depth reported** in the abstract | Abstract, p. 1106 |

Textbook background (library):

- Miller 10th, ch. 82, PDF p. 2: CPR output "is at best 25% to 30% of the normal spontaneous circulation"; both thoracic
  and cardiac pump theories described, with TEE evidence of chamber compression in humans (refs 7–9 of the chapter).
- Dellinger 5th, ch. 1, PDF p. 2: compressions generate output "through an increase in intrathoracic pressure plus direct
  compression of the heart"; incomplete recoil "impairs the cardiac output".

### 1.2 The human data on depth, rate and outcome behind the guideline targets

The targets the M2 enforces (5 cm, 6 cm, 100–120 /min) are set on outcome, not on haemodynamics:

- **AHA 2025** (Kleinman, Circulation 2025;152(suppl 2):S448–S478, DOI 10.1161/CIR.0000000000001369), library PDF
  p. 16 (journal S463): depth "at least 2 inches, or 5 cm … while avoiding excessive chest compression depths (>2.4
  inches, or 6 cm)" (COR 1, LOE B-NR); rate 100–120 /min (2a, B-NR); complete recoil (2a, C-LD); equal compression and
  relaxation times (2b, C-EO). PDF p. 17 (S464): the depth evidence is a 2020 ILCOR scoping review of 12 studies,
  > 10 700 patients (refs 55, 58, 59); rate from 3 studies of > 13 700 patients (refs 57, 63, 64); leaning from
  porcine data only (ref 68 = Niles 2011, R20); duty cycle 39 % observed in humans (ref 69, Johnson 2015) and "the
  optimal duty cycle is not known". PDF p. 16 (S463), item 4: "Chest compression depth begins to decrease after 90 to
  120 seconds of CPR, although compression rates do not decrease significantly" (ref 50 = Sugerman 2009, F1 below).
- **ERC 2025 BLS** (Resuscitation 2025;215:110771, DOI 10.1016/j.resuscitation.2025.110771), library PDF p. 4: 5–6 cm,
  100–120 /min, full recoil; PDF p. 14–15: the evidence base (ILCOR scoping review, ref 120 = Considine 2020, DOI
  10.1016/j.resuscitation.2019.08.042; depth refs 133–139; recoil refs 140–141; "No studies were identified that
  examined different measures of leaning").

The human studies those rest on, as their abstracts give them:

| Source | n | Finding (depth or rate) | Read as |
|---|---|---|---|
| Stiell IG et al. Crit Care Med 2012;40:1192–1198, DOI 10.1097/ccm.0b013e31823bc8bb | 1 029 OHCA | median depth 37.3 mm, rate 106; **inverse association between depth and rate** (p < .001); outcomes better with depth | Abstract, p. 1192 |
| Stiell IG et al. Circulation 2014;130:1962–1970, DOI 10.1161/circulationaha.114.008671 | 9 136 OHCA | survival aOR 1.04 per 5 mm; maximum survival at **45.6 mm** (best 15-mm interval 40.3–55.3 mm) | Abstract, p. 1962 |
| Vadeboncoeur T et al. Resuscitation 2014;85:182–188, DOI 10.1016/j.resuscitation.2013.10.002 | 593 OHCA | mean 49.8 ± 11.0 mm; survivors 53.6 vs 48.8 mm; aOR 1.29 per 5 mm | Abstract, p. 182 |
| Edelson DP et al. Resuscitation 2006;71:137–145, DOI 10.1016/j.resuscitation.2006.04.008 | 60 first shocks for VF | first-shock success aOR **1.99 per 5 mm** of mean depth in the 30 s before the pause | Abstract, p. 137 |
| Babbs CF et al. Resuscitation 2008;77:306–315, DOI 10.1016/j.resuscitation.2007.12.018 | 695 AED records | transient ROSC 17.7 % vs 8.3 % with pre-shock depth > 5 vs < 5 cm (shocks > 3 min); 23.4 vs 8.2 % (> 5 min) | Abstract, p. 306 |
| Hellevuo H et al. Resuscitation 2013;84:760–765, DOI 10.1016/j.resuscitation.2013.02.015 | 170 IHCA | injuries 28 / 27 / 49 % at mean depth < 5, 5–6, > 6 cm (p = 0.06); in men associated with depth | Abstract, p. 760 |
| Idris AH et al. Circulation 2012;125:3004–3012, DOI 10.1161/circulationaha.111.059535 | 3 098 OHCA | ROSC peaked at ≈ 125 /min; rate not associated with survival | Abstract, p. 3004 |
| Idris AH et al. Crit Care Med 2015;43:840–848, DOI 10.1097/ccm.0000000000000824 | 10 371 (6 399 with depth) | rate 111 ± 19, depth 42 ± 12 mm; 100–119 /min best survival after adjusting for depth and fraction | Abstract, p. 840 |
| Duval S et al. JAMA Cardiol 2019;4:900, DOI 10.1001/jamacardio.2019.2717 | 3 643 OHCA | best rate–depth combination **107 /min and 4.7 cm**; within 20 % of it survival 6.0 vs 4.3 % | Abstract, p. 900 |
| Johnson BV et al. Resuscitation 2015;87:86–90, DOI 10.1016/j.resuscitation.2014.11.008 | 164 OHCA VF | duty cycle median 38.8 % (time) / 32.2 % (area); shorter duty with deeper depth and slower rate | Abstract, p. 86 |

### 1.3 Which mechanism each supports

- **Thoracic pump** (pressure on everything in the chest; flow set by force and compression duration, not by rate):
  R9 (manual external CPR in dogs, flow independent of rate 60–150 at constant duration; same as vest CPR); R14 (human,
  constant force: SBP fell with rate, DBP unchanged, PetCO2 unchanged); R16 (human: rate not a predictor of EtCO2);
  R23–R25 (duty cycle changes flow); R19–R22 (residual intrathoracic pressure from leaning raises RA and lowers CPP).
- **Cardiac pump** (the heart squeezed between sternum and spine; flow rises with rate up to a limit): R9's open-chest
  arm; R10, R11, R12 (Duke dogs, rate 60 → 120 raised pressures and coronary flow, optimum near 120 because diastolic
  time shortens); R13; R15 (human, 120 > 80 /min for EtCO2).
- **Both, depth-dependent**: every depth study (R1–R8, R16, R17) shows flow or pressure rising with depth; it does not
  distinguish the mechanisms. The engine already carries both terms, of equal size (§0.2). No source found gives their
  relative share as a function of depth.

### 1.4 What form of relation the sources support for E3 (a proposal for the owner)

1. **Depth → per-compression pressure: a threshold, then rising.** The only source that states a functional form is R1
   (dogs): output linear in depth above a threshold (mean 2.3 cm for output, 1.8 cm for pressure). R2 (swine) and R6–R8
   (piglets, human infants) are monotonic over their ranges; R3 and R4 (pigs) show lower pressures and EtCO2 at 70 % of
   a reference depth. So the supported form is `amplitude = f(depth)`, zero below a threshold `d0` and increasing above
   it, replacing the `quality` factor in `cprPressure` and `cprRelease`. **For humans, neither `d0` nor the slope has a
   source**: R1 is in 6–12 kg dogs; the human depth data are EtCO2 regressions (R16, R17), which give slopes of EtCO2,
   not of pressure. Proposal: E3 takes the threshold-linear FORM from R1 and states `d0` and the reference depth as
   marked [ENG] choices fixed by DQ23 (§3), until a human source is found (§4, W1–W3).
2. **Rate: per-compression amplitude independent of rate.** R9 and R14 (constant force) support it for manual external
   CPR; the cardiac-pump arm's rate gain (R10, R11) appears when duration is held. The engine already makes flow per
   minute rise with rate (more compressions) and shortens the relaxation time with it. Nothing here asks for a rate term
   in the amplitude. The strongest human rate effect is **on the rescuer**: depth falls as rate rises (Stiell 2012
   inverse association; R18 parabolic; Ornato's manikin note in R14). That belongs to the scripted rescuer (§2), not to
   the haemodynamics.
3. **Duty cycle and recoil stay scenario values.** The M2 does not measure them [G 15-1], [G A-10]. The sources show
   both matter (R19–R25), and the human duty cycle is about 39 %, not the engine's 0.5 (Johnson 2015). Changing
   `CPR_DUTY` or tying `CPR_RELEASE_RESIDUAL` to a leaning force is outside E3 and is the owner's call (§4, W6).
4. **Where the sources do not reach.**
   - No adult human relation of depth to CPP, aortic or RA pressure, or cardiac output was found. Human depth data are
     outcome (§1.2) and EtCO2 (R16–R18).
   - Above 6 cm: the human limit is from injuries and survival (Hellevuo 2013; Stiell 2014's peak at 45.6 mm), not from
     haemodynamics. No source shows pressure or flow falling at depths beyond 6 cm. R5 (pigs, mechanical, with
     adrenaline) found no haemodynamic difference between 30 and 50 mm, which contradicts R1–R4 and is not explained by
     its abstract. Proposal: E3 does not invent a plateau or a fall; depths above the device's 7.6 cm cannot be measured
     anyway [G A-10].
   - Below the threshold: R1 gives no output below `d0`; no human figure.
   - Chest stiffness varies (R26: non-linear force–depth, stiffness falls with the number of compressions). The M2
     measures depth, so stiffness changes force, not depth; the engine needs no force.

---

## 2. Rescuer fatigue

### 2.1 Clinical, with feedback

| # | Source | Setting, n | Feedback | Depth over time | Rate over time | Read as |
|---|---|---|---|---|---|---|
| F1 | Sugerman NT et al. Resuscitation 2009;80:981–984, DOI 10.1016/j.resuscitation.2009.06.002 | IHCA, 2 hospitals, 42 arrests, 135 continuous blocks (≥ 90 s, ≤ 1 s gaps), Philips MRx Q-CPR | audiovisual, real time | **Table 3**, mean ± SD per 30 s: 0–30 s 48.3 ± 9.6 mm (n 135); 31–60 48.5 ± 9.1 (135); 61–90 47.9 ± 8.9 (135); 91–120 46.0 ± 9.0 (116); 121–150 44.0 ± 8.4 (32); 151–180 43.7 ± 7.4 (10). Text: no change over the first 90 s, then a linear fall of 6.6 ± 4.9 mm (12.1 %) over the next 90 s (paired). Figure 2 plots the change against baseline | **Table 3**: 105.2 ± 11.5, 105.8 ± 10.0, 105.8 ± 8.6, 106.3 ± 9.3, 102.9 ± 7.6, 106.6 ± 8.8 /min; no significant change (Figure 1) | Full text (PMC2746377 web page); no printed page per result |

Notes on F1. Median block 112 s (IQR 101–122). Rescuer sex and weight not recorded. The text's 6.6 mm (paired) and the
difference of the Table 3 means (48.3 − 43.7 = 4.6 mm, this note's arithmetic) differ; the paper does not reconcile them.
The depth decay was attributed to the rescuer, not the chest, because first-30-s depth did not change across blocks
within an arrest ("data not shown"). This is the closest match to an M2 room: the M2's Real CPR Help is real-time
feedback on depth [G 15-3].

No clinical time course **without** feedback was found (§5).

### 2.2 Manikin, without feedback

| # | Source | n, who | Duration | Depth measure over time | Rate | Read as |
|---|---|---|---|---|---|---|
| F2 | Hightower D et al. Ann Emerg Med 1995;26:300–303, DOI 10.1016/s0196-0644(95)70076-5 | 11 nursing assistants | 5 min | correct compressions (depth and placement) 92.9 / 67.1 / 39.2 / 31.2 / 18.0 % in minutes 1–5; −18.6 % per minute after the first; self-reported fatigue at 253 ± 40 s | compressions per minute did not decrease (p = .98) | Abstract, p. 300 |
| F3 | Ochoa FJ et al. Resuscitation 1998;37:149–152, DOI 10.1016/s0300-9572(98)00057-4 | 38 doctors and nurses | 5 min | correct compressions 79.7 / 24.9 / 18.0 / 17.7 / 18.5 % per minute; rescuers noticed fatigue at 186 s (SD 84) | — | Abstract, p. 149 |
| F4 | Ashton A et al. Resuscitation 2002;55:151–155, DOI 10.1016/s0300-9572(02)00168-5 | 40 BLS-competent | 2 × 3 min, 30 s apart | satisfactory compressions per minute 82 / 68 / 52, then 70 / 44 / 27; 7 of 40 could not finish | ≈ 100 /min attempted throughout | Abstract, p. 151 |
| F5 | McDonald CH et al. Emerg Med J 2013;30:623–627, DOI 10.1136/emermed-2012-201610 | 62 students, 30:2 (ERC 2010) | 5 min | compressions at recommended depth 53 % (min 1) → 38 % (min 5), p = 0.012; 6 % of the fall in min 1 → 2; fatigue reported at 167 s | not affected | Abstract, p. 623 |
| F6 | Heidenreich JW et al. Acad Emerg Med 2006;13:1020–1026, DOI 10.1197/j.aem.2006.06.049 | 53 students | 9 min | adequate (≥ 38 mm) compressions per minute, continuous vs 30:2: 47 vs 32 (min 1), 39 vs 29 (min 2) | — | Abstract, p. 1020 |
| F7 | Bjørshol CA et al. Scand J Trauma Resusc Emerg Med 2011;19:46, DOI 10.1186/1757-7241-19-46 | 19 paramedics, ALS, one compressor for 12 min | 12 min | by mean depth ≥ 40 mm: 5 good, 9 bad from the start, 5 decayed (only **1 within 2 min**; others at 4, 8, 11, 12 min). Figure 1: per-minute boxplot; Figure 2: per-rescuer curves | 6 good, 6 bad, 7 decayed; only 1 within 5 min (Figure 3) | Full text (PMC3169466, Results; Figures 1–3) |
| F8 | Gianotto-Oliveira R et al. Clinics 2015;70:190–195, DOI 10.6061/clinics/2015(03)07 | 148 lay rescuers, continuous compressions | 1 vs 2 min sessions | session mean depth **53.59 ± 7.48 mm (1 min) vs 47.70 ± 7.68 mm (2 min)**, p < 0.001 | 121 vs 124 /min | Full text (PMC4449479, Table 2) |
| F9 | Pechaksorn N, Vattanavanit V. Emerg Med Int 2020:5479209, DOI 10.1155/2020/5479209 | 104 students and residents, two-rescuer | 8 min, rotating every 1 vs 2 min | mean 45.8 ± 7.2 vs 44.5 ± 7.1 mm (p = 0.01) | 116.1 vs 117.8 /min | Full text (PMC7482023, Table 2) |
| F10 | Foo NP et al. Resuscitation 2010;81:579–584, DOI 10.1016/j.resuscitation.2010.02.006 | 24 providers | 10 min | adequate effective compressions held 2 min kneeling or on a step, 1 min standing on the floor | — | Abstract, p. 579 |
| F11 | Manders S, Geijsel FE. Resuscitation 2009;80:1015–1018, DOI 10.1016/j.resuscitation.2009.05.014 | 40 pairs | 8 min | effective compressions not different between 1- and 2-min rotation (p = 0.707) | — | Abstract, p. 1015 |

### 2.3 Manikin, with and without feedback

| # | Source | n | Finding | Read as |
|---|---|---|---|---|
| F12 | Buléon C et al. Am J Emerg Med 2016;34:1754–1760, DOI 10.1016/j.ajem.2016.05.077 | 60 professionals, 2 × 10 min continuous | efficient compressions (rate, depth and leaning together): with feedback 43 % (min 1) → 36 % (min 10), p = .068; without 35 % → 27 % from minute 2, p < .001; feedback raised depth from minute 1 | Abstract, p. 1754 |
| F13 | Musikatavorn K et al. Resusc Plus 2026;31:101423, DOI 10.1016/j.resplu.2026.101423 | 31 participants, 30 compressors per group, full ALS scenario 18–20 min | **Table 1** mean depth 4.7 ± 0.7 / 5.2 ± 0.3 / 4.6 ± 1.0 / 5.0 ± 0.6 cm; in-target depth (5–6 cm) median 20.8 / 70.5 / 8.8 / 53.8 %. The column order (1-min no feedback, 1-min feedback, 2-min no feedback, 2-min feedback) is taken from the Results text, which names each group's in-target depth (20.8, 70.5, 8.8, 53.8 %); the header row did not come through the XML. Session means, not a time course | Full text (PMC13471315, Table 1 and Results) |
| F14 | Chung TN et al. J Emerg Med 2012;43:1049–1054, DOI 10.1016/j.jemermed.2012.01.021 | students, metronome vs none | metronome: lower average depth in the first five cycles; no effect on fatigue | Abstract, p. 1049 |

### 2.4 What the fatigue sources give a scripted rescuer, and what they do not

- **Rate does not fatigue** over 2–5 min in every source that reports it (F1, F2, F4, F5, F9; AHA 2025 PDF p. 16).
- **Depth, with feedback, clinical (F1):** flat for 90 s, then falling; a few mm by 2 min, about 4–5 mm by 2.5–3 min
  (Table 3 means). Between-rescuer SD ≈ 9 mm from the start.
- **Depth, without feedback (manikin):** the fall shows from minute 2 (F2, F3, F5, F12); F8 gives the only mean-depth
  difference without feedback (≈ 6 mm lower over a 2-min session than a 1-min one, lay rescuers, continuous).
- **Individual differences are larger than fatigue** (F7: 9 of 19 below 40 mm from the first minute; decay within 2 min
  in 1 of 19; F1's SD ≈ 9 mm).
- **Not in any source read:** a per-rescuer curve of depth against time as numbers (F7's Figure 2 and F1's Figure 2 are
  plots only), and a clinical time course without feedback. A scripted rescuer can therefore be built from F1's Table 3
  (feedback on, which is the M2's case) with its between-rescuer spread, and the instructor sets anything else. A
  no-feedback clinical rescuer stays a named gap.

---

## 3. The anchor (DQ23): which depth would produce today's `quality` pressures

A comparison for the owner's decision, not a fit. DQ23's option A is Poor 0.4 = 3.5 cm, Good 0.8 = 5 cm, Excellent
1.0 = 5.5 cm.

### 3.1 Against the shapes the animal sources give

The engine's pressure amplitude is proportional to `quality`. The ratio of a depth's effect to the effect at 5.5 cm,
under each source's own numbers (this note's arithmetic, shown):

| Source | 3.5 cm | 5.0 cm | 5.5 cm | Arithmetic |
|---|---|---|---|---|
| Engine `quality` (pressure amplitude) under option A | 0.40 | 0.80 | 1.00 | — |
| Engine CPR flow at those qualities (§0.2) | 0.48 | 0.91 | 1.00 | 0.87, 1.64, 1.80 L/min ÷ 1.80 |
| R1 output threshold, dogs (x0 = 2.3 cm) | 0.375 | 0.84 | 1.00 | (x − 2.3)/(5.5 − 2.3) |
| R1 pressure threshold, dogs (x0 = 1.8 cm) | 0.46 | 0.86 | 1.00 | (x − 1.8)/(5.5 − 1.8) |

R2 (swine, transverse piston stroke 3.81 / 5.08 / 6.35 cm, not sternal depth) gives, relative to its largest stroke: MAP
0.58 / 0.83 / 1; systemic flow 0.64 / 0.85 / 1; coronary flow (EMF) 0.24 / 0.60 / 1 (this note's ratios of its
abstract's means). Its strokes do not map onto option A's depths and are listed for shape only.

So option A's three depths sit on R1's threshold-linear line with a canine threshold. That the canine threshold carries
to an adult human chest has no source.

### 3.2 Against human EtCO2 slopes

- Engine, option A: Good → Excellent is 5.0 → 5.5 cm, EtCO2 25.2 → 26.6 mmHg (§0.2): +1.4 mmHg per 5 mm, that is
  **+2.8 mmHg per 10 mm** (this note's arithmetic).
- R16 (human, n 583): **+1.4 mmHg per 10 mm**.
- R17 (human, n 230): +4.0 % per 10 mm, which at 25.2 mmHg is about +1.0 mmHg per 10 mm (this note's arithmetic).

Under option A the engine's EtCO2 is two to three times as sensitive to depth as the human regressions between 5 and 5.5
cm. Two cautions: the regressions mix within- and between-patient variation and adjust for ventilation (R16, R17
abstracts), and the engine's flow is "filling-limited above quality 0.8" (`cpr-etco2.test.ts:25`), so above 0.8 its
EtCO2 is flattening already. The engine records no EtCO2 at 0.4, so the Poor anchor cannot be compared.

### 3.3 Against human CoPP

The engine at quality 0.8 (option A: 5 cm) reads CoPP 26.3–28.1 mmHg in VF (§0.2). The only human CPP series found
(R27, Paradis 1990) reports no compression depth in its abstract, so no human depth can be put beside it. In pigs at
25 % AP (≈ 6 cm in 40 kg pigs, R4's equivalence), R21 measured CPP 23.3 ± 1.9 mmHg with full recoil.

### 3.4 For the owner

- **A** (as proposed): matches R1's canine threshold-linear shape closely (§3.1), keeps today's numbers by
  construction, and is twice as depth-sensitive in EtCO2 as human data (§3.2). Marked [ENG] until W1–W3.
- **Alternative**: set the anchor so the EtCO2 slope matches R16 between 5 and 5.5 cm. That moves Poor and Excellent
  (Good stays 5 cm), and old scenarios' numbers change; it needs DQ23's option B (re-record).
- Either way, rate stays out of the amplitude (§1.4.2), and duty cycle and recoil stay as they are (§1.4.3).

---

## 4. Papers wanted (only papers that would change what is built)

| # | Reference | DOI | Why | Open access |
|---|---|---|---|---|
| W1 | Babbs CF, Voorhees WD, Fitzgerald KR, Holmes HR, Geddes LA. Relationship of blood pressure and flow during CPR to chest compression amplitude: evidence for an effective compression threshold. Ann Emerg Med 1983;12:527–532 | 10.1016/s0196-0644(83)80290-x | the only stated depth → output form; the per-dog slopes `a` and thresholds, and the pressure data, set E3's curve | no (Elsevier) |
| W2 | Ryu SJ et al. Arterial pressure, end-tidal carbon dioxide, and central venous oxygen saturation in reflecting compression depth. Acta Anaesthesiol Scand 2016;60:1012–1023 | 10.1111/aas.12728 | SBP, CPP and EtCO2 values at two measured depths in pigs: a second point on the curve, with CPP | no (Wiley) |
| W3 | Ristagno G et al. The quality of chest compressions during CPR overrides importance of timing of defibrillation. Chest 2007;132:70–75 | 10.1378/chest.06-3065 | CPP and PetCO2 values at ≈ 6 and ≈ 4.2 cm in 40 kg pigs | no |
| W4 | Sheak KR et al. Quantitative relationship between end-tidal carbon dioxide and CPR quality … Resuscitation 2015;89:149–154 | 10.1016/j.resuscitation.2015.01.026 | whether the 1.4 mmHg/10 mm is within-patient (what the anchor comparison needs) or between-patient; the depth range | no |
| W5 | Bellamy RF, DeGuzman LR, Pedersen DC. Coronary blood flow during CPR in swine. Circulation 1984;69:174–180 | 10.1161/01.cir.69.1.174 | measured sternal displacement against piston stroke, and CPP by stroke | free on the publisher's site but answered 403 here |
| W6 | Johnson BV et al. CPR duty cycle in out-of-hospital cardiac arrest. Resuscitation 2015;87:86–90 | 10.1016/j.resuscitation.2014.11.008 | only if the owner wants `CPR_DUTY` set from humans (≈ 39 %) rather than 0.5 | no |
| W7 | Idris AH et al. Chest compression rates and survival following OHCA. Crit Care Med 2015;43:840–848 | 10.1097/ccm.0000000000000824 | depth by rate category in humans, for a scripted rescuer whose depth falls when rate is high | no |
| W8 | Halperin HR et al. Determinants of blood flow to vital organs during CPR in dogs. Circulation 1986;73:539–550 | 10.1161/01.cir.73.3.539 | the displacement and flow values behind "rate-independent at constant duration", which decides that E3 has no rate term | free on the publisher's site but answered 403 here |

## 5. What was searched, and what could not be read

**Europe PMC REST** (`/search`, lite and core), queries as sent:

- `TITLE:"compression" AND (TITLE:"depth" OR TITLE:"amplitude") AND (TITLE:"pressure" OR TITLE:"flow") AND (TITLE:"cardiopulmonary" OR TITLE:"CPR" OR TITLE:"resuscitation")`
- `(TITLE:"compression depth") AND (ABSTRACT:"coronary perfusion pressure" OR ABSTRACT:"end-tidal" OR ABSTRACT:"blood flow") AND (ABSTRACT:swine OR … dogs OR canine)`
- `(TITLE:"compression depth" OR TITLE:"compression rate") AND (TITLE:"end-tidal" OR TITLE:"carbon dioxide" OR TITLE:"hemodynamic" OR TITLE:"haemodynamic")`
- `TITLE:"leaning" AND (ABSTRACT:"cardiac output" OR ABSTRACT:"perfusion")`
- `(TITLE:"incomplete chest wall" OR TITLE:"incomplete chest recoil" OR TITLE:"decompression") AND ABSTRACT:"perfusion pressure"`
- `(TITLE:"compression rate" OR TITLE:"compression rates") AND (ABSTRACT:swine … dogs) AND ABSTRACT:"perfusion pressure"`
- `(TITLE:"compression depth" OR TITLE:"depth of compression" OR TITLE:"compression depths") AND (ABSTRACT:swine … piglets)`
- `(ABSTRACT:"sternal displacement" OR TITLE:"sternal displacement") AND (ABSTRACT:"cardiac output" OR ABSTRACT:"blood flow" OR ABSTRACT:"perfusion pressure")`
- `(TITLE:"compression force" OR TITLE:"compression depth") AND (ABSTRACT:"cardiac output" OR ABSTRACT:"carotid blood flow")`
- `(TITLE:"duty cycle" OR TITLE:"compression duration") AND (TITLE:"CPR" OR TITLE:"cardiopulmonary" OR TITLE:"resuscitation")`
- `(TITLE:"blood pressure" OR TITLE:"arterial pressure" OR TITLE:"diastolic") AND (TITLE:"compression depth" OR TITLE:"chest compression quality" OR TITLE:"CPR quality") AND (ABSTRACT:"in-hospital cardiac arrest" OR ABSTRACT:"patients")` (0 hits)
- `(TITLE:"chest compression" OR TITLE:"CPR") AND TITLE:"invasive" AND TITLE:"pressure"`
- `(TITLE:"fatigue") AND (TITLE:"compression" OR TITLE:"cardiopulmonary" OR TITLE:"CPR")` (168 hits, screened by title)
- `(TITLE:"decay" OR TITLE:"deterioration") AND TITLE:"compression" AND (TITLE:"quality" OR TITLE:"cardiopulmonary")`
- `TITLE:"rescuer fatigue" AND (TITLE:"feedback" OR ABSTRACT:"feedback")`
- `(TITLE:"fatigue" OR TITLE:"two minutes" OR TITLE:"2 minutes" OR TITLE:"over time") AND TITLE:"chest compression" AND (ABSTRACT:"cardiac arrest patients" OR ABSTRACT:"out-of-hospital cardiac arrest" OR ABSTRACT:"in-hospital cardiac arrest")`
- `(TITLE:"feedback") AND (TITLE:"chest compression" OR TITLE:"CPR") AND (ABSTRACT:"fatigue") AND (ABSTRACT:"minutes" OR ABSTRACT:"min")`
- `(TITLE:"fatigue" OR ABSTRACT:"fatigue") AND (TITLE:"chest compression" OR TITLE:"CPR") AND (ABSTRACT:"first minute" OR …) AND ABSTRACT:"mm"`
- author–title look-ups for: Sheak, Halperin, Feneley, Wolfe, Bellamy, Kern, Ristagno, Ochoa, Ashton, Hightower,
  Sugerman, McDonald, Manders, Foo, Stiell, Vadeboncoeur, Edelson, Babbs 2008, Hellevuo, Idris, Johnson, Murphy,
  Duval, Sutton (hemodynamic-directed CPR), Kramer-Johansen, Paradis.

**Crossref** `/works/{DOI}` for every DOI; **doi.org** handle API for resolution. No request carried a personal
identifier.

**Library**: Kleinman 2025 (AHA Part 7) PDF pp. 14–19; ERC 2025 BLS (110771) whole text; ERC 2025 ALS and Education
searched; Miller 10th ch. 82; Dellinger 5th ch. 1.

**Not readable from here:**

- `https://www.ahajournals.org/doi/10.1161/01.CIR.69.1.174` (Bellamy 1984): HTTP 403. The other Circulation papers
  (R9–R11, R24, Idris 2012, Stiell 2014) were therefore read as abstracts only.
- Europe PMC `fullTextXML` answered HTTP 500 for author manuscripts PMC2746377 (Sugerman 2009; read instead on the PMC
  web page), PMC3321356 (Zuercher 2010), PMC3715874 (Niles 2011), PMC3307954 (Stiell 2012), PMC3388797 (Idris 2012). The
  last four were not tried on the PMC web page; their abstracts carry the numbers used here.
- Everything else marked "Abstract" is behind a publisher's paywall; no attempt was made beyond the abstract.

Found and not used: Sutton RM et al. 2014 and Morgan RW et al. 2017 (haemodynamic-directed CPR; porcine and paediatric,
target pressures rather than depth); Lyman 2026, Li 2025, Kao 2026 and other 2024–2026 manikin fatigue studies about
position, surface or masks; Heidenreich 2012 (elderly rescuers).
