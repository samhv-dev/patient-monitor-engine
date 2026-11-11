# The ZOLL M2: the Pads lead, transthoracic impedance and the cardioversion trial — research note (M0a)

**STATUS: RESEARCH NOTE (2026-11-12), brief 176, piece M0a of `docs/plans/defibrillator-zoll-m2.md`.** No code, no
constant and no change to the plan's structure. The later engine piece E2b builds from this note. Every number below
carries the source that measured it and where it was read. Where nothing was found, the note says so, and the item stays
a named gap for the owner. No value here is an estimate of this note's own.

**How sources were read.** Three ways, and each row says which:

- **Guide**: the ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C (Dec 2021), read from the local copy (never in the
  repository). It is cited as [G printed page].
- **Abstract**: the record and abstract from Europe PMC's REST search.
- **Full text**: open-access full text, from Europe PMC's `fullTextXML` service or the PMC web page.

A value taken from a review's table and not from the primary paper is marked **(via Heyer 2022, Table A1 row n)**. Every
DOI below was resolved (HTTP 302 from doi.org) on 2026-11-12.

**Library.** The AHA 2025 and ERC 2025 guideline PDFs and four textbooks in `library/sources/` were searched as text:
Miller 9th and 10th, Dellinger 5th and Co-Existing Disease 8th. Pages are PDF pages of the library copy.

---

## 1. The Pads lead

### 1.1 What the guide says

- **The AED analyses only the Pads lead.** "In AED Mode, analysis is only performed when Pads is the selected ECG lead
  (top trace)" [G 12-4]. In Manual Defib and AED the default top waveform is Pads/Paddles. In Pacing and Monitor it is
  Lead II [G 6-7].
- **The lead's settings.**
  - Bandwidth 0.67–20 Hz by default, or 0.67–40 Hz by configuration [G A-2].
  - Leads-off and impedance sensing on the pads: under 300 µA RMS at 32 kHz ± 1 kHz [G A-3].
  - A lead that is not available draws a dashed line, with "Attach Pads" or "Check Pads – Pads Shorted" [G 6-8].
- **Signal quality.** For cardioversion the guide says the pads signal "will be equal to that of limb/chest leads except
  immediately following a discharge when there may be more noise due to muscle tremors" [G 14-15].
- **Placements.**
  - Apex–sternum, with paddles: the STERNUM paddle to the right of the sternum just below the clavicle; the APEX paddle
    below and left of the left nipple, on the anterior axillary line [G 14-5]. The AED chapter's figure shows the same
    positions for pads [G 12-4].
  - Anterior–posterior, the guide's recommendation for AF: "Place the front (apex) pad on the third intercostal space,
    mid clavicular line on the right anterior chest. The back/posterior pad should be placed in the standard posterior
    position on the patient's left" [G 14-15].
  - Both placements are allowed for analysis and defibrillation [G 12-3], [G 14-8].
  - Anterior–posterior is preferred for pacing [G 16-3].
- **What the guide does NOT state.**
  - The electrical axis of the Pads lead.
  - Which pad is the positive input, so the polarity of the displayed trace for either placement is unknown.
  - Any comparison of the Pads trace with Lead II.

### 1.2 Published work on the Pads lead's axis or lead field

**No published lead vector or electrical axis for the defibrillation-pad lead was found, for either placement.** The
searches are in §5. What was found:

| Source | What it gives | Read as |
|---|---|---|
| Nas J et al. Resuscitation 2021, DOI 10.1016/j.resuscitation.2021.08.049 | Calls the defibrillator pad-ECG a "proxy for lead II, inferior vantage point" for their VF-waveform analysis. The abstract shows no measurement behind this. | Abstract |
| Brooks L et al. J Cardiovasc Electrophysiol 2009, DOI 10.1111/j.1540-8167.2009.01483.x | Swine. VF peak amplitude differed between three orthogonal pad pairs (anterior–posterior, lateral–lateral, superior–inferior), and the shock succeeded more often through the pair with the largest amplitude. Shows that the pad pair's axis changes what the device sees. Gives no human lead vector. | Abstract |
| Frank E. The image surface of a homogeneous torso. Am Heart J 1954;47:757–768, DOI 10.1016/0002-8703(54)90196-9 | The lead vector of any point on a torso-shaped tank. Frank used 12 levels 5 cm apart with 16 points around each level, labelled A–P (as described in Malmivuo & Plonsey, §11.5.5). In that secondary source the image surface is DRAWN (frontal, sagittal, transverse; their Figs. 11.15–11.17), not tabulated. | Not read (paywalled). Described from Malmivuo & Plonsey, *Bioelectromagnetism* (1995), ch. 11, open at bem.fi/book/11/11.htm |
| Malmivuo J, Plonsey R. *Bioelectromagnetism*, 1995, ch. 11 (open web edition) | The physics E2b would use. A bipolar lead's vector is the difference of the two sites' lead vectors, c_ij = c_i − c_j (§11.4.2, Eq. 11.14), and its voltage is c_ij · p (Eq. 11.16). By reciprocity, a lead's lead field is the current field that a unit current through the same pair of electrodes would produce (§11.6.2). So the Pads lead's field in the heart is, up to scale, the field of the defibrillating shock through the same pads. | Full text (web) |
| Brody DA et al. The electrocardiographic image surface revisited. J Electrocardiol 1977, DOI 10.1016/s0022-0736(77)80037-x | Image surfaces of several torso shapes are rounded or spherical. Dipole eccentricity changes them little; inhomogeneity changes them more. A warning on how far one torso's image surface carries to another. | Abstract |
| Dower GE. A lead synthesizer for the Frank system to simulate the standard 12-lead electrocardiogram. J Electrocardiol 1968;1:101–116, DOI 10.1016/s0022-0736(68)80013-5 | The origin of the kind of rows the engine uses. Whether its coefficients were derived from Frank's image surface is NOT confirmed here. | Not read. Record from Crossref |

### 1.3 What the engine's vector model would need

The engine already has the mechanism a Pads lead needs:

- It generates one heart vector [X, Y, Z] in Frank coordinates.
- `l2/ecg/vcg.ts` projects every lead from it as a dot product with a lead vector. The rows are the Dower rows for I, II
  and V1–V6, and III, aVR, aVL and aVF follow from the Einthoven and Goldberger identities (`DOWER`, `projectLead`).

A Pads lead for each placement is therefore one more `Vec3` row of the same kind: the lead vector of the apex pad's site
minus that of the sternum (or anterior) pad's site, in the same Frank frame. No new state, no new structure.

What is missing is the two numbers sets:

1. **The image-space coordinates of each pad site.** These are four sites:
   - right infraclavicular parasternal;
   - left anterior-axillary, below the nipple;
   - right 3rd intercostal space, mid-clavicular;
   - left posterior, scapular level.
   They have to be read from Frank's image surface or from another published torso lead-field. Frank's tank covered
   all 16 points around each level, so the posterior site is inside his model.
2. **The averaging over the pad's area.** The pads are large (78 cm² anterior and 113 cm² posterior in the trial of
   [G A-28]), and a large electrode's lead vector is the average over the skin it covers. Frank's points are single
   points.

The sign (which pad is positive) is a third missing item. The guide does not give it (§1.1).

The engine's rows were confirmed against G. D. Clifford's `idowerT.m` (research 03 §11), not against Dower 1968. If the
Pads row comes from Frank 1954 and the Dower rows do not, the two may not share a scale. Whether Dower's coefficients
were themselves derived from Frank's image surface must be checked in Dower 1968 (papers wanted, §4).

### 1.4 Outcome

**Apex–sternum: a physical basis exists, but no ready number.**

- To compute: the lead vector of the apex site minus that of the right infraclavicular site, from Frank 1954's image
  surface (or another published torso lead-field), averaged over the pad's area.
- E2b would take one `Vec3` row and the sign convention.
- Neither is published as a number. The Nas 2021 "proxy for lead II" is an assertion, not a measurement, and is not a
  basis for using the Lead II row.

**Anterior–posterior: a physical basis exists, but no ready number.**

- To compute: the same, for the right 3rd intercostal space at the mid-clavicular line against the left posterior
  (scapular) site [G 14-15].
- The posterior site is not on any lead the engine has today, so no combination of the existing rows can stand in for
  it.

**Consequence for E2b.** Until Frank 1954 (or another published lead-field over the whole torso) is read, the Pads lead
cannot be built honestly for either placement. The plan already provides for this: E4 runs on the limb leads, and the
AED stays marked unavailable on the face (plan §6, "Blocked on sources").

---

## 2. Transthoracic impedance (TTI)

### 2.1 What the guide states

- **The device's gate.** Patient impedance range 15–300 Ω (external paddles, hands-free electrodes) and 7–300 Ω (internal
  paddles) [G A-2].
- **What the pads circuit is.** Pads/paddles leads-off and impedance sensing under 300 µA RMS at 32 kHz ± 1 kHz
  [G A-3]. With poor contact the device shows "Attach Pads" and does not allow energy delivery [G 12-3], [G 14-9].
- **Delivered energy against load.** Table A-2 gives delivered energy for every setting into 25–175 Ω [G A-16]. The M2's
  rectilinear biphasic waveform has "the same first and second phase timing, the same first and second phase
  currents/voltages, and the same mechanisms for controlling defibrillation waveshape as the ZOLL X Series® and R
  Series®" [G A-16].
- **Contact.**
  - "Do not use expired electrodes, which might result in inaccurate patient impedance readings and affect the level of
    delivered energy" [G 1-12].
  - With paddles, gel and 10–12 kg force on each paddle "to minimize this impedance" [G 1-11], [G 14-7].
- **The record.** The shock snapshot records the patient impedance value and the first-phase average current
  [G 17-8].
- **The trials.**
  - VF/VT: the guide reports a high-impedance subgroup "(greater than 90 ohms)" with first-shock efficacy of 100 %
    biphasic against 63 % monophasic [G A-28].
  - AF: electrodes of 78 cm² (anterior) and 113 cm² (posterior) [G A-28].
  - The guide gives no impedance distribution for either trial.

### 2.2 Measured series

Biphasic shocks with self-adhesive pads, where known. Studies of other conditions are marked.

- **Spread:** SD unless stated. SE = standard error. [ ] = median [IQR or range as the paper gives it].
- **"Shock":** impedance computed during the shock.
- **"HF":** high-frequency test current, no shock.

**Adults**

| # | Study (DOI) | Population | Device / waveform | Electrodes, placement | Method | n | Mean ± spread (Ω) | Range (Ω) | Read as |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Mittal 2000, Circulation 101:1282 (10.1161/01.cir.101.11.1282) | Elective AF cardioversion | ZOLL rectilinear biphasic (RLB) | Gel pads 78/113 cm², AP | Shock | 88 | 78 ± 16 | 41–124 | via Heyer 2022, Table A1 row 64. Heyer's TEXT gives 76 ± 17 for this arm, the opposite of its table (§2.5). Primary not read |
| A1m | same, monophasic arm (comparator) | same | Damped sine | same | Shock | 77 | 76 ± 17 | 40–112 | via Heyer 2022, Table A1 row 65 |
| A2 | Chen 2013, Resuscitation 84:580–585 (10.1016/j.resuscitation.2012.09.017) | OHCA, US EMS | RLB AEDs (current-based impedance compensation) | Not in abstract | Not in abstract | 594 patients, 1166 shocks | 134.8 (mean, 1st shock) | not in abstract | Abstract only |
| A3 | White 2005, Resuscitation 64:63 (10.1016/j.resuscitation.2004.06.021) | Witnessed OHCA, shockable, BLS-treated | Impedance-compensating BTE, 150 J fixed | Pads (AED) | Shock | 102 | 90 ± 23 | 27–152 | Mean ± SD: abstract. Range: via Heyer 2022, Table A1 row 4 |
| A4 | Walker 2009, Resuscitation 80:773 (10.1016/j.resuscitation.2009.04.002) | OHCA, multi-shock cases | BTE AEDs, 200 J first shocks | Pads | Shock | 467 | 86 | 73–103 | via Heyer 2022, Table A1 row 38. Heyer lists 73 and 103 as lowest and highest, but the abstract says every result is a median (25th, 75th percentile), so these are probably the quartiles. Unsettled without the paper |
| A5 | Yin 2023, Resuscitation 185:109754 (10.1016/j.resuscitation.2023.109754) | OHCA, initial shockable, Amsterdam | BTE AEDs, 200 J | 113 cm² pads | Shock | 157 | median 88 | — | Abstract |
| A5s | same | same | same | 65 cm² pads | Shock | 178 | median 100 | — | Abstract |
| A6 | Anantharaman 2017, Singapore Med J 58:432 (via Heyer ref. 73) | OHCA VF, no ROSC / ROSC | BTE (LIFEPAK 12) | Pads | Calculated | 92 / 105 | 78.0 ± 21.4 / 73.8 ± 20.4 | 32–154 | via Heyer 2022, Table A1 rows 110–111 |
| A7 | Sadek 2018, Clin Cardiol 41:666 (10.1002/clc.22947) | Elective AF / flutter | BTE (Philips HeartStart XL, MRx) | Not reported | Device-recorded, 1st shock | 593 AF / 110 AFL | 73.6 ± 20.7 / 76.6 ± 22.6 | 26–146 (AF) | Full text (PMC6489922), Table 1 and §3.1 |
| A8 | Redel-Traub 2024, Am J Cardiol 213:146 (10.1016/j.amjcard.2023.11.040) | Elective AF / flutter | Not in abstract | Not in abstract | Device-recorded, 1st shock | 220 | 73 ± 18 | — | Abstract |
| A9 | Ramirez 2018, Ottawa AF cardioversion protocol (via Heyer ref. 71) | Elective AF | BTE (LIFEPAK 20e, HeartStart XL) | Pads/paddles; AP under the protocol | 1st shock | 500 (389 on protocol) | 74 ± 18 (70 ± 16 on protocol) | — | via Heyer 2022, Table A1 rows 102, 104 |
| A10 | Roh 2021, Medicina 57:618 (via Heyer ref. 51) | Elective atrial arrhythmias | BTE (HeartStart MRx) | Pads, AP | After delivery | 466 (376 M, 90 F) | 64 ± 11 (M 63 ± 11, F 77 ± 15) | — | via Heyer 2022, Table A1 rows 107–109 |
| A11 | Walsh 2005 (via Heyer ref. 21) | Elective AF | Impedance-compensated biphasic | Pads, AA / AP | Shock | 150 / 157 | 90 ± 21 / 85 ± 18 | — | via Heyer 2022, Table A1 rows 66–67 |
| A12 | Deakin 2008, Resuscitation 78:141 (10.1016/j.resuscitation.2008.02.024) | Elective AF / flutter | BTE, 70→300 J | Pads, AA | Shock (1st) | 58 | 92.2 | [52.0–126.0] | Abstract |
| A13 | Fumagalli 2006 / 2009 (via Heyer refs. 2, 24) | Elective AF | Biphasic | Pads 78 cm², AP | Shock | 80 / 222 | 57.7 ± 12.3 / 57.7 ± 11.4 (1st), 54.1 ± 10.8 (last) | 37–89 (2006) | via Heyer 2022, Table A1 rows 61, 46–47 |
| A14 | Krasteva 2006, Physiol Meas 27:1009 (10.1088/0967-3334/27/10/007) | 86 volunteers, NO shock | — | Pads ~92 cm², sub-clavicular / sub-axillar ("position 1") and AP | HF 32 kHz | 86 | 107.2 ± 22.3 / 96.6 ± 19.2 | 58–152 / 55–149 | Abstract |
| A15 | Garcia & Kerber 1998, Resuscitation 37:139 (10.1016/S0300-9572(98)00050-1) | 20 volunteers, NO shock | — | Pads 78 cm², AA / AP | HF 31.25 kHz | 20 | 82.1 ± 24.6 / 71.3 ± 23.5 | — | via Heyer 2022, Table 3 and Table A1 rows 30–31 |

**Children**

| # | Study (DOI) | Population | Device / waveform | Electrodes | Method | n | Mean ± spread (Ω) | Range (Ω) | Read as |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Niles 2010, Resuscitation 81:1540 (10.1016/j.resuscitation.2010.07.011) | In-hospital arrest, children ≥ 8 y (14.3 ± 5 y, 47.4 ± 7.3 kg) | Biphasic | Pads, anterior–apical | 0.1 s pre-shock | 13 shocks in 5 arrests | 56.8 ± 23.4 | 27.7–94.5 | Mean ± SD: abstract. Range: via Heyer 2022, Table A1 row 93 |
| C2 | Samson 1995, Am J Cardiol 75:544 (10.1016/s0002-9149(99)80606-7) | Children (age 4 ± 3 y per Heyer), NO shock | — | Pre-gelled pads, 4–5.8 cm diameter | HF 31 kHz | 24 | 148 ± 23 | — | via Heyer 2022, Table A1 row 98 and §3.4.4 (the record has no abstract) |
| C2b | same | same | — | Pads, 8–10 cm diameter | HF 31 kHz | 9 | 49 ± 9 | — | via Heyer 2022, Table A1 row 99 |
| C3 | Atkins 1988, Pediatrics 82:914 (10.1542/peds.82.6.914): PADDLES, not pads, for context only | Children 1.5–15 y; infants 6 wk–9 mo | — | Paddles 21 cm² / 83 cm²; infants 21 cm² | HF | 37 / 37; 10 | 108 ± 24 / 57 ± 11; 94 ± 17 | 61–212 / 29–101; 74–124 | via Heyer 2022, Table A1 rows 90–92 |

**The review itself.** Heyer Y, Baumgartner D, Baumgartner C. A systematic review of the transthoracic impedance during
cardiac defibrillation. Sensors 2022;22:2808, DOI 10.3390/s22072808 (open access, read in full).

- Across 71 articles, TTI ranged from 12 to 212 Ω.
- Without outliers and paediatric data, the mean TTI values ranged from 51 to 112 Ω, with an average of 76.7 Ω (median
  75.0 Ω).
- Table 2 gives the means of all collected series: mean 77.8 Ω, SD 16.4, minimum 41.0, maximum 127.8.

### 2.3 What changes TTI (published effects)

**Pad size.**

- Smaller pads raise TTI: in Yin 2023, a median 100 Ω with 65 cm² pads against 88 Ω with 113 cm² pads (abstract).
- In children (Samson 1995, via Heyer): 148 ± 23 Ω with 4–5.8 cm pads against 49 ± 9 Ω with 8–10 cm pads.
- AHA 2025 adult BLS: "The size of the pad or paddle affects impedance; thus, larger paddles or pads are appropriate
  for adults" (Kleinman 2025, library PDF p. 23).
- AHA 2025 paediatric BLS: "Paddles or self-adhering pads of the largest size that can still be separated by at least
  1 to 2 cm" (Joyner 2025, library PDF p. 21).

**Placement.** Anterior–posterior is lower than anterior–lateral:

- Krasteva 2006: 96.6 against 107.2 Ω (volunteers, abstract).
- Ramirez 2016: AP 13 % lower than AL (PACE, DOI 10.1111/pace.12937, abstract).
- Garcia & Kerber 1998: 71.3 against 82.1 Ω.
- Walsh 2005: 85 against 90 Ω.
- Heyer 2022 Table 3 lists ten comparisons, all with AP lower or equal. It classes position as a "medium" influence
  (Table 6).

**Contact.**

- **No coupling agent.** TTI 160 ± 18 Ω against 54 ± 4 Ω with a salt-containing gel, both mean ± SEM, in 10 normal
  subjects (Sirna 1988, Am J Cardiol 62:1048, DOI 10.1016/0002-9149(88)90546-2, abstract). Heyer 2022 states this
  study used paddles; its Table A1 lists it as pads.
- **Chest hair.** Hirsute subjects 162 ± 11 Ω against non-hirsute 103 ± 6 Ω; 105 ± 3 Ω after shaving, mean ± SE, with
  self-adhesive pads (Bissing & Kerber 2000, DOI 10.1016/s0002-9149(00)01026-2, abstract).
- **Force on pads.** Pressing on self-adhesive pads lowers TTI, and 80 % of the reduction is reached at 8 kg-force
  (Ramirez 2016, abstract).
- **Time on the skin.** TTI fell 6.9 % (position 1) and 5.3 % (AP) over 5 min after the pads were applied (Krasteva
  2006). It fell 6 % in 1 h in non-shocked subjects (Sirna 1988).
- **Respiration.** End-expiration was 9 % lower than end-inspiration, 50 ± 3 against 55 ± 3 Ω, mean ± SEM (Sirna 1988).
  "High levels of positive end expiratory pressure (PEEP) increase transthoracic impedance" (ERC 2025 ALS, Soar et al.,
  library PDF p. 21, citing Deakin 1998). Dellinger 5th lists placement, phase of ventilation, inter-electrode distance,
  pressure and pad size (library PDF p. 708).
- **Partial contact.** No published measurement was found of TTI against the fraction of a pad that is lifted. This is
  a gap.

**Repeated shocks.**

- Same-energy consecutive shocks changed TTI by a median −1 % [0 %, 4 %]. Between a 200 J and a 300 J shock it was −4 %
  [2 %, 6 %] (Walker 2009, OHCA, abstract).
- With RLB AEDs in OHCA, TTI decreased significantly at the 2nd and 3rd escalating shocks and not after the 3rd (Chen
  2013, abstract). The sizes are not in the abstract.
- In elective cardioversion with BTE, TTI fell with each sequential shock: 92.2 Ω at the first shock, 85.0 Ω mean in
  the five patients who received five shocks (Deakin 2008, abstract).
- In children ≥ 8 y, TTI was 1.6 Ω lower 0.1 s after the shock and 0.95 Ω lower at 2 s (Niles 2010, abstract).
- In AF, 57.7 Ω at the first shock and 54.1 Ω at the last (Fumagalli 2009, via Heyer).
- At 24 h after shocks, TTI was still at 93 % of baseline (Sirna 1988).

**Does TTI change success with an impedance-compensating biphasic waveform?**

- No relation in OHCA with BTE 150 J (White 2005), nor with RLB (Chen 2013, "success rate remained unchanged over the
  whole spectrum of TTI").
- In elective AF it does matter: odds ratio 1.36 per 10 Ω for first-shock failure, adjusted for first-shock energy
  (Sadek 2018, BTE).
- In Mittal 2000 itself, "relative risk, 0.64 per 10-Ω increase in impedance", including the RLB arm (abstract).
- This bears on plan §3.2 and DQ7: in elective AF the published series do NOT support "no impedance effect", even for an
  impedance-compensating waveform. The note reports this. It does not decide it.

### 2.4 Which series fits the M2's patient types (a proposal for the owner, not a decision)

The M2 has two patient types: Adult, and Pediatric for "1 - 8 years of age or < 25 Kg" [G 12-3].

**Adult, arrest (AED and Manual Defib).**

- The waveform the M2 shares is RLB [G A-16]. The only RLB arrest series is Chen 2013 (594 OHCA, first-shock mean
  134.8 Ω). Its abstract gives no spread, and its mean sits far above every BTE arrest series:
  - White 2005: 90 ± 23 Ω;
  - Walker 2009: median 86 Ω;
  - Yin 2023: median 88 or 100 Ω.
- The abstract offers no explanation. Pad type, ZOLL's measurement method, and population are all possible, and none
  is settled.
- **Proposal:** obtain Chen 2013 (§4). If it gives a spread, it is the arrest series that matches the device's waveform
  and measurement. Until it is read, White 2005 (90 ± 23, 27–152 Ω, n = 102, pads, impedance-compensating biphasic) is
  the most complete arrest series with mean, SD and range. Choosing a BTE series for an RLB device is the owner's call.

**Adult, synchronised cardioversion of AF.**

- Mittal 2000 matches the device's waveform family, its pads (78/113 cm²) and the guide's own AP placement [G 14-15]:
  78 ± 16 Ω, 41–124 Ω, n = 88.
- These numbers come via Heyer's table, and Heyer's text contradicts its table (§2.5), so the primary paper must settle
  them (§4).
- Sadek 2018 (73.6 ± 20.7, 26–146 Ω, n = 593, read in full) is the largest fully read AF series, from BTE devices.

**Pediatric (1–8 y, < 25 kg).**

- **Gap.** No biphasic, self-adhesive-pad series measured during shocks in children under 8 was found.
- Niles 2010 covers children ≥ 8 y (14 ± 5 y, 47 kg), mostly outside the M2's paediatric type, with n = 5 arrests.
- Samson 1995 is the only pads series by size in young children, measured with a test current, not shocks.
- The value that matters for the M2 depends on the ZOLL paediatric pad's area, which this note did not find.

**Placement and contact as state.**

- The published effects in §2.3 support impedance depending on placement (AP lower) and on contact (no gel or hair:
  more than 150 Ω), with a small drift down over minutes and after shocks.
- None of the sources gives a distribution of the effect of a partly lifted pad.

### 2.5 Discrepancies found while reading

1. **Mittal 2000 impedance by arm.** Heyer 2022 Table A1 gives the biphasic arm (n = 88) 78 ± 16 Ω (41–124) and the
   monophasic arm (n = 77) 76 ± 17 Ω (40–112). Heyer's §3.4.1 text gives "76 ± 17 Ω" for biphasic and "78 ± 16 Ω" for
   monophasic. One of the two is transposed. Only the primary paper settles it.
2. **The VF trial's high-impedance subgroup.**
   - The guide: "greater than 90 ohms", 100 % biphasic against 63 % monophasic [G A-28].
   - The Mittal 1999 JACC abstract (§3.2): "an impedance ≥ 70 ohms (99 % [biphasic] vs. 86 % [monophasic], p = 0.02)".
   - The two may be different subgroups of the same trial. The plan's §3.2 quotes the guide's version. The primary
     paper is wanted (§4).

---

## 3. The cardioversion trial: is it Mittal 2000, and which energy does it report?

### 3.1 The guide's AF trial and Mittal 2000

Mittal 2000 was read from its **abstract only**: Mittal S, Ayati S, Stein KM, Schwartzman D, Cavlovich D, Tchou PJ,
Markowitz SM, Slotwiner DJ, Scheiner MA, Lerman BB. Transthoracic cardioversion of atrial fibrillation: comparison of
rectilinear biphasic versus damped sine wave monophasic shocks. Circulation 2000;101(11):1282–1287, DOI
10.1161/01.cir.101.11.1282, PMID 10725288. The full text at ahajournals.org answered HTTP 403 from here.

| Item | Guide [G A-28], [G A-29] | Mittal 2000 (abstract) | Agree? |
|---|---|---|---|
| Design | Prospective, randomised, multi-centre; RLB against damped sine monophasic | "prospective, randomized, multicenter trial"; same comparison | Yes |
| Centres | Not named | Not in the abstract. The record's affiliation is the first author's (New York Hospital–Cornell) | Cannot be checked |
| Enrolled / analysed | 173 entered, 7 excluded; "study population of 165" | 88 biphasic + 77 monophasic = 165 | The analysed n agrees. The guide's 173 − 7 = 166, not 165 (an inconsistency inside the guide) |
| Electrodes | ZOLL disposable gel electrodes, 78 cm² anterior and 113 cm² posterior | Not in the abstract. Heyer 2022 lists 78/113 cm² gel pads, AP, for this study | Consistent (via Heyer) |
| Biphasic energies | 70, 120, 150, 170 J | "sequential shocks of 70, 120, 150, and 170 J" | Yes |
| Monophasic energies | 100, 200, 300, 360 J | 100, 200, 300, 360 J | Yes |
| First shock | 68 % at 70 J against 21 % at 100 J | 60/88 = 68 % against 16/77 = 21 % | Yes |
| Cumulative | Kaplan–Meier failure after shock 4: 0.057 biphasic, 0.208 monophasic, so 94.3 % and 79.2 % success | 83/88 = 94.3 %, 61/77 = 79.2 % | Yes, exactly |
| Per-step | Failure 0.318 / 0.147 / 0.091 / 0.057 | Not in the abstract | Cannot be checked |
| Current at success | 11 ± 1 against 21 ± 4 A, "48 % less" | 11 ± 1 against 22 ± 4 A, "50 % less" | Small difference |
| Impedance effect | Not reported for AF | RR 0.64 per 10 Ω increase (95 % CI 0.46–0.90) | — |

**Conclusion.** The guide's AF trial is Mittal 2000. The identity rests on matching:

- design;
- both energy sequences;
- both arms' sizes (88 + 77 = 165);
- first-shock counts;
- cumulative counts to the decimal.

Two small numerical differences remain: the current (21 against 22 A) and the guide's own 173 − 7 ≠ 165. Neither
changes the identity.

### 3.2 The guide's VF trial

The guide's VF/VT trial [G A-27], [G A-28] matches Mittal S et al. "Comparison of a novel rectilinear biphasic waveform
with a damped sine wave monophasic waveform for transthoracic ventricular defibrillation. ZOLL Investigators." J Am Coll
Cardiol 1999;34:1595, DOI 10.1016/s0735-1097(99)00363-0 (abstract read). They agree on:

- 184 patients;
- 120 J RLB against 200 J monophasic;
- first shock 99 % against 93 %;
- current 14 ± 1 against 33 ± 7 A.

They do not agree on the high-impedance subgroup (§2.5, item 2).

### 3.3 Selected or delivered energy?

**This cannot be settled from what could be read.**

- The abstract says patients "received sequential shocks of 70, 120, 150, and 170 J". The words do not say whether
  these are the device's selections or measured delivered energies.
- The guide does not say either.
- The trial's device was not the M2: 170 J is not an M2 energy [G A-2].

Why it matters:

- On the M2, Table A-2 shows the two differ with load [G A-16]. At a 70 J setting: 76 J into 50 Ω, 83 J into 75 Ω, 85 J
  into 100 Ω.
- Mittal's reported mean impedance (via Heyer, §2.2 A1) lies in that span.
- So whether `outcome.ts` should read the selected or the delivered energy against Mittal's 70 J depends on the paper's
  methods.

**The full paper is WANTED (§4).**

Until it is read:

- The plan's §3.2 decision stands: the outcome reads the selected energy.
- The comment in `outcome.ts` ("read as Mittal's delivered rectilinear-biphasic joules") is an assumption, not a
  verified reading.

---

## 4. Papers wanted (only papers that would change what is built)

| # | Reference | DOI | Why it is needed | Open access? |
|---|---|---|---|---|
| W1 | Mittal S et al. Transthoracic cardioversion of atrial fibrillation: comparison of rectilinear biphasic versus damped sine wave monophasic shocks. Circulation 2000;101:1282–1287 | 10.1161/01.cir.101.11.1282 | Selected or delivered energies (decides what `outcome.ts`'s AF curve reads); the TTI distribution by arm (Heyer's table and text disagree); the centres; the per-shock success | Not open here (ahajournals.org answered 403); no PMC copy |
| W2 | Chen B, Yin C, Ristagno G, Quan W, Tan Q, Freeman G, Li Y. Retrospective evaluation of current-based impedance compensation defibrillation in out-of-hospital cardiac arrest. Resuscitation 2013;84:580–585 | 10.1016/j.resuscitation.2012.09.017 | The only RLB arrest series: spread, range and electrode type behind its 134.8 Ω mean, and the size of the shock-to-shock decrease. Decides the adult arrest distribution in E2b | No (Elsevier); not attempted |
| W3 | Frank E. The image surface of a homogeneous torso. Am Heart J 1954;47:757–768 | 10.1016/0002-8703(54)90196-9 | The lead vectors of the four pad sites, the only published basis found for the Pads lead row (§1.4) | No (Elsevier); not attempted |
| W4 | Dower GE. A lead synthesizer for the Frank system to simulate the standard 12-lead electrocardiogram. J Electrocardiol 1968;1:101–116 | 10.1016/s0022-0736(68)80013-5 | Whether the engine's Dower rows come from Frank's image surface, so that a Pads row read from W3 shares their scale | No (Elsevier); not attempted |
| W5 | Mittal S et al. Comparison of a novel rectilinear biphasic waveform with a damped sine wave monophasic waveform for transthoracic ventricular defibrillation. J Am Coll Cardiol 1999;34:1595 | 10.1016/s0735-1097(99)00363-0 | The >90 Ω against ≥70 Ω subgroup (plan §3.2, DQ7), and the TTI distribution in induced VF with RLB pads | No; not attempted |
| W6 | Samson RA, Atkins DL, Kerber RE. Optimal size of self-adhesive preapplied electrode pads in pediatric defibrillation. Am J Cardiol 1995;75:544–545 | 10.1016/s0002-9149(99)80606-7 | The only pads-by-size series in young children. Read only through Heyer; ages and sizes per group are needed for the Pediatric type | No; not attempted |

Two leads from the plan's §7.2 were not wanted for M0a but are verified here:

- Kerber 1997, DOI 10.1161/01.cir.95.6.1677, Europe PMC record; full text not read.
- Stiell 2007, DOI 10.1161/circulationaha.106.648204, Europe PMC record.

---

## 5. What was searched, and what could not be read

**Europe PMC REST (`/search`, core results):**

- `AUTH:"Mittal S" AND TITLE:"rectilinear biphasic" AND PUB_YEAR:2000`
- `AUTH:"Mittal S" AND TITLE:"rectilinear biphasic" AND TITLE:ventricular`
- `TITLE:"systematic review of the transthoracic impedance"`
- titles of White 2005, Walker 2009, Sadek 2018, Niles 2010, Samson 1995, Deakin 2008
- `(TITLE:"impedance" AND (TITLE:children OR TITLE:pediatric OR TITLE:paediatric OR TITLE:infant) AND (TITLE:defibrillation OR TITLE:shock OR TITLE:cardioversion))`
- `("transthoracic impedance" AND (children OR pediatric) AND (weight OR age) AND (pads OR electrodes) AND biphasic)`
- `ABSTRACT:"impedance" AND (ABSTRACT:infants OR ABSTRACT:children) AND (ABSTRACT:"self-adhesive" OR ABSTRACT:pads OR ABSTRACT:"electrode pads") AND (ABSTRACT:defibrillat* OR ABSTRACT:cardioversion)`
- `(TITLE:"rectilinear biphasic") AND (impedance)`
- `(TITLE:impedance AND (TITLE:"out-of-hospital" OR TITLE:"cardiac arrest") AND (TITLE:defibrillat*))`
- DOI queries for Yin 2023, Redel-Traub 2024, Krasteva 2006, Bissing 2000, Sirna 1988, Nas 2021, Stiell 2007
- `TITLE:"Effect of Applying Force to Self-Adhesive Electrodes on Transthoracic Impedance"`
- `TITLE:"Retrospective evaluation of current-based impedance compensation"`
- `(ABSTRACT:"defibrillation pads" OR ABSTRACT:"defibrillator pads" OR ABSTRACT:"pad-derived" OR ABSTRACT:"pads ECG" OR ABSTRACT:"paddle ECG" OR ABSTRACT:"pad ECG") AND (ABSTRACT:"lead II" OR ABSTRACT:"amplitude" OR ABSTRACT:"axis")`
- `(ABSTRACT:"pads" OR ABSTRACT:"defibrillation electrodes") AND ABSTRACT:"lead II" AND (ABSTRACT:"shock advisory" OR ABSTRACT:"rhythm analysis" OR ABSTRACT:"AED")`: 0 hits
- `(ABSTRACT:"ventricular fibrillation" AND ABSTRACT:amplitude) AND (ABSTRACT:"pad position" OR …) AND (…)`
- `ABSTRACT:"image surface" AND (ABSTRACT:torso OR ABSTRACT:"lead vector")`: 0 hits
- `TITLE:"image surface"`
- `(TITLE:"lead vectors" OR TITLE:"lead vector" OR TITLE:"lead fields") AND (torso OR "body surface")`
- `ABSTRACT:"Mason-Likar" AND ABSTRACT:"axis"`
- `(ABSTRACT:"Dalhousie" AND ABSTRACT:"lead vectors")`: 0 hits
- `TITLE:"Automatic external defibrillators for public access defibrillation" AND PUB_YEAR:1997`
- `"rectilinear biphasic" AND "170 J" AND OPEN_ACCESS:y`

**Full text read through Europe PMC `fullTextXML`:**

- PMC9003563 (Heyer 2022);
- PMC12309583 (Ristagno 2025 systematic review of pad size, orientation and placement, DOI
  10.1016/j.resplu.2025.101030: no new TTI numbers, pointed to Yin 2023);
- PMC11803253 (Menant 2025, paediatric AED OHCA: no TTI values given).

**Other sources:**

- Crossref: Frank 1954 and Dower 1968 (bibliographic query).
- Web search: one query on pads ECG against Lead II, which returned patents and no study.
- Web pages: PMC6489922 (Sadek 2018); bem.fi/book/11/11.htm (Malmivuo & Plonsey ch. 11, the first 100 000 characters).

**Library:** text search of the AHA 2025 (13 parts) and ERC 2025 (13 documents) PDFs, and of Miller 9th and 10th,
Dellinger 5th and Co-Existing Disease 8th, for "transthoracic impedance", "thoracic impedance", "pad placement / position
/ size", "impedance … Ω/ohm".

- **Found:** the statements cited in §2.3.
- **Not found:** no measured TTI value appears in any library document.

**Not readable from here:**

- `https://www.ahajournals.org/doi/10.1161/01.CIR.101.11.1282` and `https://www.ahajournals.org/doi/full/10.1161/01.CIR.101.11.1282` (Mittal 2000): HTTP 403.
- Europe PMC `fullTextXML` for PMC6489922 returned no body. The PMC web page was read instead.

**Not attempted** (behind a publisher paywall, by the record's open-access flag): W2–W6, Kerber 1997, Walker 2009,
White 2005, and the other primary papers cited only through Heyer 2022.
