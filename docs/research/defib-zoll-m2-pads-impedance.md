# The ZOLL M2: the Pads lead, transthoracic impedance and the cardioversion trial — research note (M0a)

**STATUS: RESEARCH NOTE (2026-11-12), brief 176, piece M0a of `docs/plans/defibrillator-zoll-m2.md`.** No code, no
constant and no change to the plan's structure. The later engine piece E2b builds from this note. Every number below
carries the source that measured it and where it was read. Where nothing was found, the note says so, and the item stays
a named gap for the owner. No value here is an estimate of this note's own.

**UPDATED (2026-11-12), brief 181, M0a second part.** The six papers that Part I could read only as abstracts or through
a review were supplied by the owner and read in full: Part II (§6–§12) below. Part I is kept as it was written; each
statement Part II settles or corrects carries a "SUPERSEDED" or "CORRECTED" mark pointing to the section that replaces
it. The only values in Part II that are this note's own work are read from Frank 1954's figure (§10.3), with the method
and checks written out, and labelled PROPOSED.

**How sources were read.** Three ways, and each row says which:

- **Guide**: the ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C (Dec 2021), read from the local copy (never in the
  repository). It is cited as [G printed page].
- **Abstract**: the record and abstract from Europe PMC's REST search.
- **Full text**: open-access full text, from Europe PMC's `fullTextXML` service or the PMC web page.
- **Full text (library)**, Part II only: the owner-supplied PDFs in the local library, cited by journal page.

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

**PARTLY SUPERSEDED (see §10).** Frank 1954 and Dower 1968 are now read in full; the rows below for them describe the
state before that.

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

**SETTLED (see §10.1, §10.5).** Dower 1968's coefficients were derived from Frank's image surface; the engine's rows are
not Dower 1968's rows on one scale.

The engine's rows were confirmed against G. D. Clifford's `idowerT.m` (research 03 §11), not against Dower 1968. If the
Pads row comes from Frank 1954 and the Dower rows do not, the two may not share a scale. Whether Dower's coefficients
were themselves derived from Frank's image surface must be checked in Dower 1968 (papers wanted, §4).

### 1.4 Outcome

**SUPERSEDED (see §10.7).** Frank's surface has been read: PROPOSED rows exist in Frank's units; the scale to the
engine's rows, the pad-area weighting and the polarity are what is still missing.

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

**CORRECTED rows (Part II):** A1 and A1m (Mittal 2000; the paper itself disagrees on which arm is which, §6.2); A2
(Chen 2013, full series §8.2: range 40–247 or 50–247 Ω, no SD for the whole 594, intra-shock DC method, pad size not
stated); C2 and C2b (Samson 1995: 148 ± 23 Ω is the 4-cm pad alone, 49 ± 9 Ω the 10-cm pad alone, age 3.7 ± 3.0 y,
§11.1). New: Mittal 1999, induced VF, RLB 73 ± 18 (30–112) Ω, n = 98; monophasic 66 ± 18 (25–114) Ω, n = 86 (§7.2).

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
  **CORRECTED (see §6.4):** the model pooled both arms and its outcome is cumulative success; it gives no RLB-only
  estimate. The whole question is now §9.
- This bears on plan §3.2 and DQ7: in elective AF the published series do NOT support "no impedance effect", even for an
  impedance-compensating waveform. The note reports this. It does not decide it.

### 2.4 Which series fits the M2's patient types (a proposal for the owner, not a decision)

**UPDATED (Part II).** Chen 2013 read in full gives no SD for its 594 first shocks, only a mean (134.8 Ω), a range and
four bins (§8.2); its pads are not described. Mittal 2000's figures are confirmed from the paper, with its own arm
ambiguity (§6.2). Samson 1995 read in full does not fill the paediatric gap (§11.2). The proposal below otherwise stands.

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

**SETTLED AS FAR AS THE PAPERS ALLOW (see §6.2, §7.3, §12).** Item 1 is a contradiction inside Mittal 2000 itself. Item 2:
both are subgroups of the trial (≥ 70 Ω and ≥ 90 Ω).

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

**SUPERSEDED (see §6.1): SELECTED.** The paper's 70/120/150/170 J are selected energies, nominal into 50 Ω; the delivered
energy of the first shock was measured, 77 ± 7 (54–86) J [Mittal 2000 Table 3, p. 1285]. The text below records the
state before the paper was read.

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

**UPDATED (brief 181).** W1–W6 were supplied and read in full (Part II). Still wanted:

| # | What | Why it is needed | Lead |
|---|---|---|---|
| W7 | The derivation of the Dower matrix the engine uses (`vcg.ts`, "Dower 1980" via Clifford's `idowerT.m`) | To know whether it shares Frank's image-space units, and why its precordial y components have the opposite sign to Dower 1968 (§10.5). Without it a Pads row from Frank cannot be put on the engine's scale | Dower GE, Machado HB, Osborne JA, "On deriving the electrocardiogram from vectorcardiographic leads", Clin Cardiol 1980 (lead, not verified) |
| W8 | The lead field of a large electrode on a torso model (how a pad's reading weights the skin under it) | Pad area (§10.6) | none found |
| W9 | The ZOLL electrode packaging's placement instructions, and the adult and paediatric (Pedi-padz) pad areas | The back pad's landmark [G 14-15] (§10.2); the Pediatric type's impedance (§11.2) | ZOLL product literature |
| W10 | A shock-measured biphasic pads impedance series in children under 8 | Pediatric type (§2.4, §11.2) | none found |
| W11 | A per-shock, RLB-specific effect of impedance on AF cardioversion success | Only if the owner chooses an AF impedance effect (DQ7, §9.3) | none found |

The table below is Part I's list, kept for the record (W1–W6 now read).

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
---

# Part II. The six papers read in full (brief 181, M0a second part, 2026-11-12)

**How these were read.** The owner supplied the six PDFs to the local library (`library/sources/papers/defibrillator/`,
never copied into the repository). Each was read in full: the text layer where it is clean, and the pages rendered as
images (150–600 dpi) for every table and figure, and for the two old scans (Frank 1954, Dower 1968) and Samson 1995
throughout. Pages below are the JOURNAL's printed page numbers, written [Mittal 2000 p. 1284]. Where Part II settles or
corrects Part I, Part I carries a "SUPERSEDED (see §n)" mark and keeps its text, so the history stays readable.

## 6. Mittal 2000, the AF cardioversion trial (W1, read in full)

Mittal S, Ayati S, Stein KM, et al. Circulation 2000;101:1282–1287, DOI 10.1161/01.cir.101.11.1282.

### 6.1 Selected or delivered energy: SELECTED, with delivered energy measured separately

- **The labels are the device's selections.** "For a selected energy, a constant-current first phase was produced by
  automatically adjusting the internal resistance of the defibrillator circuit on the basis of the patient's
  transthoracic impedance" [p. 1283]. "When 170 J was selected for the biphasic waveform and the measured patient
  impedance was ≥ 85 Ω, the first phase of the biphasic waveform tilted" [p. 1283]. The protocol gave "sequential shocks
  of 70, 120, 150, and 170 J, if necessary" [p. 1283].
- **The nominal energy is defined into 50 Ω.** Table 3's rows "70-J Biphasic shock\*" and "100-J Monophasic shock\*" carry
  the footnote "\*Energy delivered into a 50-Ω load" [p. 1285].
- **What patients actually received was measured.** Table 3 [p. 1285], first shock, "Delivered Energy, J", mean ± SD
  (range): 70-J biphasic 77 ± 7 (54–86) J, n = 88; 100-J monophasic 105 ± 4 (94–112) J, n = 77. The pads were wired
  through an interface unit that "transferred the voltage and current delivered to the patient to a laptop" [p. 1283].
- **The device was not the M2.** Biphasic shocks came from a ZOLL PD-2100 (100-µF capacitor; 6-ms constant-current first
  phase, 4-ms truncated exponential second phase, 100 µs between them) [p. 1283]. The M2's interphase is 200 µs
  [G A-15]. 170 J is not an M2 setting [G A-2].
- **Beside the M2's own table**, for the reader only (no conversion is proposed): the M2 delivers 76 J into 50 Ω and
  83 J into 75 Ω at the 70 J setting [G A-16]; Mittal's patients received 77 ± 7 J at 78 ± 16 Ω or 76 ± 17 Ω (§6.2).

**Answer.** 70/120/150/170 J are selected (nominal, 50-Ω-calibrated) energies; the delivered energy was measured only for
the first shock and is reported separately. This supersedes §3.3.

### 6.2 Impedance by arm: the paper contradicts itself

| Where in the paper | Biphasic (n = 88) | Monophasic (n = 77) |
|---|---|---|
| Table 1 footnote [p. 1283] | 76 ± 17 Ω | 78 ± 16 Ω |
| Text, "Cardioversion Data" [p. 1284] | 76 ± 17 Ω | 78 ± 16 Ω |
| Table 2, patient characteristics [p. 1284] | 78 ± 16 Ω | 76 ± 17 Ω |
| Table 3, first shock, mean ± SD (range) [p. 1285] | 78 ± 16 (41–124) Ω | 76 ± 17 (40–112) Ω |

Two tables say one thing and the text and a footnote the other. Heyer 2022's table-against-text disagreement (§2.5 item
1) copies this disagreement; it is not Heyer's error. **The paper does not settle it.** What does not depend on it: both
arms' means are 76–78 Ω, SD 16–17 Ω, and the two ranges are 40–112 and 41–124 Ω (Table 3; which range belongs to which arm
carries the same doubt). Impedance was measured by the device "at the onset of shock delivery" [p. 1283]. Population:
elective AF cardioversion, age 66 ± 12 (30–92) y, weight 91 ± 23 (46–168) kg, 70 % male [p. 1284].

Electrodes [p. 1283]: wet polymer gel pads (ZOLL Cardiology Specialty Pad); anterior circular, 10 cm diameter, 78 cm²
active area, "applied to the right parasternal area"; posterior rectangular, 14.5 cm diagonal, 113 cm², "to the left
scapula posteriorly".

### 6.3 Success by shock

| Shock | Biphasic (selected J) | Cumulative success, text [p. 1284] | Guide's Kaplan–Meier failure [G A-29] | Conditional success at this shock |
|---|---|---|---|---|
| 1 | 70 | 68 % (60/88) | 0.318 | 60/88 = 68 % |
| 2 | 120 | 85 % | 0.147 | 15/28 = 54 % |
| 3 | 150 | 91 % | 0.091 | 5/13 = 38 % |
| 4 | 170 | 94 % (83/88) | 0.057 | 3/8 = 38 % |

The counts after shocks 2 and 3 are not printed; they follow from the guide's failure fractions × 88 (0.147 × 88 = 12.9,
so 13 failing and 75 converted; 0.091 × 88 = 8.0, so 8 failing and 80 converted), which agree with the paper's 85 % and
91 %. The last column is arithmetic on those counts. Monophasic 100/200/300/360 J: 21, 44, 68, 79 % [p. 1284]. Success
was "conversion of atrial fibrillation to sinus rhythm for ≥ 30 s after the shock" [p. 1283].

### 6.4 Exactly what it reports on impedance and success

- **The statistic.** "Relative risk, 0.64 per 10-Ω increase in impedance; 95% confidence intervals, 0.46 to 0.90"
  (abstract, Table 5 [p. 1285]).
- **The model.** "Multivariate forward stepwise logistic regression" on patient weight, AF duration, left atrial size,
  LV ejection fraction, transthoracic impedance and waveform [p. 1284]; Table 5's footnote lists the same six [p. 1285].
  The paper calls the output a "relative risk"; it does not say whether this is the regression's odds ratio or a
  converted relative risk.
- **The outcome.** CUMULATIVE efficacy over the escalation ("The adjusted relative risks … for cumulative efficacy",
  [p. 1285]), not the first shock.
- **The population.** Both arms pooled (n = 165), with waveform as a covariate. No waveform × impedance interaction is
  reported, so no RLB-specific effect size is given.
- **Within the paper, two numbers differ by place.** P for impedance: 0.005 (abstract, Table 5) against 0.01 (text
  [p. 1285]). AF duration: 0.97 (0.96, 0.99) (abstract, Table 5) against 0.98 (0.97, 0.99) (text).
- **Univariate** [Table 4, p. 1286]: impedance 75 ± 17 Ω in successes against 87 ± 12 Ω in failures, P = 0.005 (pooled).
- **Stratified** [p. 1284–1285, Fig. 3]: ≤ 70 Ω (60 ± 8 Ω): biphasic 29/29 (100 %), monophasic 27/28 (96 %), P = NS.
  > 70 Ω (86 ± 12 Ω): biphasic 53/58 (91 %), monophasic 30/44 (68 %), P = 0.004. So all five biphasic failures were
  in patients above 70 Ω; the paper gives no test of impedance within the biphasic arm. The strata hold 87 of 88
  biphasic and 72 of 77 monophasic patients; the paper does not say where the others went. The > 70 Ω group was heavier
  (98 ± 24 against 78 ± 12 kg).

### 6.5 What `outcome.ts` takes from this paper, and whether it reads it correctly

`outcome.ts` (lines 104–125) takes 68 % at 70 J and the cumulative 94 %, and fits p(E) = 0.94 / (1 + (E50/E)²) with
E50 = 70·√(0.94/0.68 − 1) = 43.3 J, drawn independently at every shock. Three findings, no code change in this piece:

1. **F1, the comment misreads the energy.** It says the engine's selected energy is "read as Mittal's delivered
   rectilinear-biphasic joules". Mittal's 70 J is a SELECTED (50-Ω nominal) energy (§6.1). Reading the engine's selected
   energy against it is therefore the like-for-like comparison; the comment's word "delivered" is wrong.
2. **F2, the curve is not a dose–response the paper reports.** The paper reports single-shock success only at 70 J in
   shock-naive patients. 120, 150 and 170 J were given only to patients who had failed every lower shock, so their
   success (54 %, 38 %, 38 % conditional, §6.3) is not success at that energy in an unselected patient. The curve gives
   0.832, 0.868 and 0.883 at 120, 150 and 170 J, and an independent draw per shock gives a cumulative success after the
   four-shock escalation of 1 − 0.32·0.168·0.132·0.117 = 0.9992, against the paper's 0.943. The engine therefore
   overstates the trial's own escalation by 5.6 points and its later-shock success by 30–50 points. The paper does not
   give the per-patient resistance that would model this; the finding is reported, not fixed.
3. **F3, scope.** The curve is applied to `preexcitedAf`. The paper enrolled AF only ("ineligible if … cardioversion of
   an atrial arrhythmia other than atrial fibrillation", [p. 1283]); it gives nothing on pre-excited AF.

The curve has no impedance term. That is not a misreading; whether to add one is DQ7 (§9.3).

## 7. Mittal 1999, the VF/VT trial (W5, read in full)

Mittal S, Ayati S, Stein KM, et al. J Am Coll Cardiol 1999;34:1595–1601, DOI 10.1016/s0735-1097(99)00363-0.

### 7.1 The setting

Induced ventricular tachyarrhythmia during electrophysiological study, transvenous ICD placement, generator change or
ICD testing, in nine US centres, November 1997 to August 1998 [p. 1596]. VF was induced "with either alternating current,
programmed stimulation, a T-wave shock or burst ventricular pacing" [p. 1597]; arrhythmia duration before the shock
17 ± 18 s (3–134) biphasic and 15 ± 7 s (3–51) monophasic [Table 3, p. 1599]. LVEF 30 ± 15 % [p. 1598]. Success:
"conversion … to a supraventricular or paced rhythm associated with a measurable blood pressure and pulse that persisted
for at least 30 s" [p. 1598]. **This is seconds-old induced VF in a laboratory, not out-of-hospital arrest.**

Electrodes [p. 1597]: ZOLL Radiolucent Stat-Padz "applied to the cardiac apex, to the left fifth intercostal space in the
anterior axillary line and to the left scapula posteriorly"; apical 78 cm², posterior 113 cm². **The VF trial's
placement was apex–posterior, not the apex–sternum placement the guide draws for paddles.**

Energies: 120 J biphasic against 200 J monophasic, "Energy delivered into a 50-Ω load" (Table 3 footnote, [p. 1599]);
delivered 129 ± 18 (77–151) J and 205 ± 9 (167–219) J.

### 7.2 Impedance

Table 3 [p. 1599], first shock, mean ± SD (range): biphasic 73 ± 18 (30–112) Ω, n = 98; monophasic 66 ± 18 (25–114) Ω,
n = 86; P = 0.02 between arms. Measured by the interface unit, which "measured the voltage and current delivered to the
patient as well as the patient's impedance" [p. 1597].

### 7.3 The high-impedance subgroup, as the paper states it

[p. 1599], first-shock efficacy, counted in EPISODES:

| Impedance | Biphasic 120 J | Monophasic 200 J | P |
|---|---|---|---|
| < 70 Ω | 58/58 (100 %) | 40/42 (95 %) | NS |
| ≥ 70 Ω | 67/68 (99 %) | 24/28 (86 %) | 0.02 |
| ≥ 90 Ω | 19/19 (100 %) | 5/8 (63 %) | 0.02 |

The subgroup denominators (58 + 68 = 126 biphasic, 42 + 28 = 70 monophasic) match neither the patients (98, 86) nor the
episodes (130 biphasic first shocks over all inductions, [p. 1599]); the paper does not explain the difference.

**Side by side:**

| Source | Statement |
|---|---|
| Guide [G A-28] | "high transthoracic impedance (greater than 90 ohms)": 100 % biphasic against 63 % monophasic, p = 0.02, "95% confidence interval of the difference of –0.0217% to 0.759%" (the table on the same page prints –0.021 %) |
| Paper, text [p. 1599] | "impedance ≥ 90 Ω (19 [100%] of 19 vs. 5 [63%] of 8 episodes …, p = 0.02)" |
| Paper, abstract [p. 1595] | "impedance ≥ 70 Ω (99% [biphasic] vs. 86% [monophasic], p = 0.02)" |

The guide's and the abstract's statements are both true: they are two nested subgroups of the same trial. The guide's
"greater than 90" is the paper's "≥ 90". The guide's confidence interval bounds cannot be a difference in percentage
points (the difference it reports is 37 points), and the paper prints no confidence interval for this subgroup.
**The plan should cite the paper, both subgroups, with their counts and the word "episodes".** The guide's CI should not be
cited.

### 7.4 What it measures about impedance and first-shock success in VF

- Only a between-waveform comparison inside impedance strata. No regression, and no test of impedance within an arm.
- Within the rectilinear biphasic arm: 58/58 below 70 Ω and 67/68 at or above it; the single failure was rescued by a
  150 J shock [p. 1599]. With 1 failure in 126, the paper cannot show an impedance effect for this waveform, nor exclude a
  small one.
- Within the monophasic arm: 95 % below 70 Ω, 86 % at or above, 63 % at or above 90 Ω.
- The authors attribute the difference to current: a 120 J RLB shock delivers 75 % of its 50-Ω first-phase current at
  125 Ω, against 56 % for 200 J monophasic [p. 1600]; Table 1 [p. 1597] gives the currents (120 J biphasic: 16, 15, 13,
  12 A at 50, 75, 100, 125 Ω).

## 8. Chen 2013, the RLB AED arrest series (W2, read in full)

Chen B, Yin C, Ristagno G, et al. Resuscitation 2013;84:580–585, DOI 10.1016/j.resuscitation.2012.09.017.

### 8.1 Setting and method

- Retrospective; 10 US EMS systems, February 2005 to March 2006, "through a regular field case submission program
  sponsored by ZOLL Medical Corporation" [p. 581]; three authors are ZOLL employees [p. 584].
- AEDs: ZOLL AED Plus and AED Pro, used by first responders; escalating 120, 150, 200 J, then 200 J [p. 581].
- Pads: "the two standard adhesive hard gel type of adult defibrillation/pacing pads" [p. 581]. **Size and placement are
  not stated.**
- Impedance: the "intra-shock DC measurement"; pre-shock impedance was not measured [p. 584].
- Cohort [Fig. 1, p. 582]: 2877 cases; 748 with a shockable initial rhythm; 594 cases with annotated post-shock rhythm;
  1166 shocks (1st to 5th) analysed (AED Pro 218 cases, AED Plus 376). No patient data (age, weight, sex, survival) were
  available [p. 581, p. 584].
- Success: "an organized rhythm was present within 60 s after the shock, and had a rate of 40 beats per minute or
  greater" [p. 581].

### 8.2 The impedance series in full

| Item | Value | Where |
|---|---|---|
| 1st shock, all 594 | mean 134.8 Ω | §3.1 [p. 582]; abstract [p. 580] |
| 1st shock, range | 40–247 Ω [p. 582]; 50–247 Ω [p. 583, twice] | the paper contradicts itself |
| Later shocks, range | 40–242 Ω | [p. 583] |
| SD of the 594 | **not given** | — |
| Median | **not given** | — |
| Shape | "normally distributed for all of the shocks" (Kolmogorov–Smirnov) | [p. 582]; histograms Fig. 2 [p. 582], no counts printed |
| Distribution by bins, 1st shock | < 90 Ω: 76; 90–130 Ω: 226; 130–170 Ω: 202; > 170 Ω: 90 (sum 594) | Table 4 [p. 583] |

Paired series, Table 1 [p. 581], mean ± SD (paired t test):

| Pairs | n | TTI (Ω) | Peak current (A) |
|---|---|---|---|
| 1st vs 2nd | 269 | 132.0 ± 33.4 → 125.3 ± 33.5 (p < 0.001) | 12.2 ± 2.4 → 13.7 ± 2.7 |
| 2nd vs 3rd | 164 | 127.1 ± 36.2 → 125.8 ± 34.4 (p < 0.05) | 13.7 ± 2.7 → 17.0 ± 4.2 |
| 3rd vs 4th | 89 | 128.8 ± 33.6 → 129.9 ± 35.7 | 16.7 ± 4.0 → 16.7 ± 4.1 |
| 4th vs 5th | 50 | 127.1 ± 34.0 → 127.0 ± 33.9 | "17.2 ± 33.9" (printed so; SD evidently a misprint) → 17.2 ± 4.1 |

The average decrease was 4.9 % (6.7 Ω) after the 1st shock and 0.7 % (1.3 Ω) after the 2nd, and none after the 3rd
[p. 582–583]. Table 2 [p. 581] gives TTI by success and failure at each shock (1st: 128.7 ± 37.0 against 133.2 ± 38.4 Ω),
all p > 0.05 [p. 582].

### 8.3 Why its mean is higher, as the paper says

The paper says its TTI was "approximately 30% higher than previous reports" [p. 583] and lists possible reasons without
measuring any: "different defibrillation waveforms, TTI measuring methods, patient characteristics and electrode sizes";
it calls waveform design "the major contributor" because RLB delivers a lower peak voltage than BTE at the same energy;
and it offers poor pad contact (position, chest hair) for the values above 170 Ω [p. 583]. These are the authors'
suggestions, not findings. The paper did not compare methods or pads.

### 8.4 What it reports on impedance and shock success

- **By bins** [Table 4, p. 583]: 1st shock 22.4 % (< 90 Ω), 29.2 % (90–130), 21.3 % (130–170), 24.4 % (> 170); "p values
  were great than 0.05" [p. 583]. One cell (2nd shock, > 170 Ω, 12.5 %, n = 24) was p < 0.05 against 130–170 Ω, "no
  difference when adjusted with Brunden method" (Table 4 footnote).
- **By logistic regression** [p. 583]: "The odds ratio of TTI … was 0.995 (95% CI 0.992–0.999, p = 0.008)", beside
  preceding-shock success at 25.93 (15.29–43.97). The paper states neither the unit of TTI in the model nor its
  covariates nor which shocks entered it.
- **Side by side:** the abstract says "The success rate remained unchanged over the whole spectrum of TTI"
  [p. 580], while the regression on [p. 583] reports a TTI odds ratio whose confidence interval excludes 1. The paper
  does not reconcile the two; the note reports both.
- First-shock success was 24.9 % (Table 4); this is the "organised rhythm within 60 s" end point, not VF termination.
- Preceding success predicted later success: 72.2 % (n = 54) against 15.4 % (n = 215) at the 2nd shock [Table 3,
  p. 582].

## 9. Impedance and success, by rhythm, across the clinical papers

### 9.1 The table

| Rhythm, setting | Source (how read) | Waveform | In whom, n | What is measured | Size | Certainty |
|---|---|---|---|---|---|---|
| AF, elective | Mittal 2000 (full) | RLB and monophasic pooled | 165 | Cumulative success over 4 escalating shocks vs baseline TTI, stepwise logistic regression with 5 other covariates | "RR" 0.64 per 10 Ω (0.46–0.90), P 0.005 (0.01 in the text) | One trial; pooled over waveforms; not per shock; no RLB-only estimate |
| AF, elective | Mittal 2000 (full) | RLB | 88 (29 ≤ 70 Ω, 58 > 70 Ω; 1 unaccounted) | Cumulative success by stratum | 29/29 (100 %) vs 53/58 (91 %); no within-arm test | 5 failures in total |
| AF / flutter, elective | Sadek 2018 (full, Part I §2.2) | BTE | 593 AF | First-shock FAILURE vs TTI, adjusted for first-shock energy | OR 1.36 per 10 Ω | One study; BTE, not RLB |
| Induced VF, EP lab | Mittal 1999 (full) | RLB | 126 episodes in the strata | First-shock success by stratum | 58/58 (< 70 Ω), 67/68 (≥ 70 Ω), 19/19 (≥ 90 Ω) | 1 failure; no effect shown, none excluded |
| Induced VF, EP lab | Mittal 1999 (full) | Monophasic | 70 episodes | Same | 95 %, 86 %, 63 % | Small strata (8 at ≥ 90 Ω) |
| OHCA, shockable | Chen 2013 (full) | RLB (AED Plus/Pro) | 594 patients, 1166 shocks | Organised rhythm within 60 s, by TTI bin; and logistic regression | Bins: 21–29 %, NS; regression OR 0.995 (0.992–0.999), unit and covariates not stated | Retrospective; no patient data; the two analyses disagree in kind |
| OHCA, witnessed, shockable | White 2005 (abstract, Part I §2.3) | BTE 150 J fixed | 102 | Defibrillation, ROSC, survival vs TTI | No relation (abstract) | Abstract only |
| VF, 100 J monophasic | Kerber 1984, as cited by Samson 1995 [p. 544] | Monophasic | adults | Shock success above / below 97 Ω | 20 % vs 70 % | Secondary citation; not read |

### 9.2 What it says, plainly

- **VF and pulseless VT with the M2's waveform:** two RLB sources, a laboratory trial and an arrest series, show no
  difference in success across impedance strata. Chen 2013's regression, unexplained in unit and model, is the only
  number against that.
- **AF:** every series that tested it associates higher impedance with less success, including the device's own trial.
  But the device's trial gives its effect pooled over both waveforms and over the whole escalation; no paper read gives
  an RLB-specific, per-shock size.

### 9.3 Question for the owner (replaces the plan's DQ7)

**DQ7. Does chest impedance change a shock's chance of success, and for which rhythm?**
- *Explanation:* With the M2's waveform, the VF studies (an EP-lab trial and 594 out-of-hospital arrests) found success
  the same at low and high impedance. In AF cardioversion, the M2's own trial found success fell as impedance rose, but it
  measured that over both waveforms together and over the whole four-shock escalation, not for one shock of this
  waveform; a BTE study found the same direction for the first shock.
- *Options:*
  - A. Impedance gates the shock (15–300 Ω) and is shown and recorded; it changes success for no rhythm.
  - B. As A for VF; for AF, impedance lowers success using Mittal 2000's pooled figure (0.64 per 10 Ω, cumulative),
    applied per shock by a rule E2b would have to state and you would approve.
  - C. As A for VF; for AF, impedance lowers first-shock success using Sadek 2018's 1.36 per 10 Ω (a BTE waveform).
  - D. An effect for both rhythms (no RLB source supports one for VF).
- *Proposal:* A for VF (the two RLB sources). For AF, A until a source gives a per-shock effect for this waveform; B if
  you accept the pooled, cumulative figure as the closest the device's own trial gives. Either way the Debrief can show
  the shock's impedance beside the outcome.

## 10. Frank 1954 and Dower 1968: the image surface and the Pads lead (W3, W4, read in full)

Frank E. The image surface of a homogeneous torso. Am Heart J 1954;47:757–768, DOI 10.1016/0002-8703(54)90196-9.
Dower GE. A lead synthesizer for the Frank system to simulate the standard 12-lead electrocardiogram. J Electrocardiol
1968;1:101–116, DOI 10.1016/s0022-0736(68)80013-5.

### 10.1 What the two papers give

- **Frank's model** [p. 759, p. 760 Fig. 1 legend]: a life-size tap-water torso moulded on one man (5 ft 10½ in, 175 lb,
  chest 38 in); a fixed current dipole at the centre of the ventricular mass "during very deep inspiration", about 4 cm in
  front of the plane through the armpits, 2.5 cm left of the midline, between the 4th and 5th intercostal spaces.
  Potentials at 192 points: 12 transverse levels 2 inches apart (level 6 through the dipole), and 16 radial lines 22½°
  apart lettered A–P. Axes: x right→left, y head→foot, z chest→back [p. 760].
- **The result is drawings, not a table.** Fig. 2 gives the 12 loops in frontal (A, [p. 762]), sagittal (B, [p. 763])
  and transverse (C, [p. 765]) projections, "in relative units" [p. 759]. Accuracy "approximately 5 per cent" [p. 768].
  For a site between grid points, "an estimate of their locations by interpolation may be made from nearby points"
  [p. 764]. Frank warns that the surface holds for one torso and one dipole position and "should be applied cautiously"
  [p. 767].
- **The lettering** (from Fig. 1's transverse view [p. 760], where z points up the page to the back): A is the left
  lateral line, E the anterior midline, I the right lateral, M the posterior midline; B–D are left anterior, F–H right
  anterior, J–L right posterior, N–P left posterior.
- **A bipolar lead's vector** is the difference of the two sites' image-space vectors [Frank p. 759; Dower p. 103,
  Fig. 2]; the origin cancels.
- **Dower read Frank's figure for the standard electrode sites** and printed the vectors: Table I [Dower p. 105], e.g.
  LA (+25, −89, +43), RA (−49, −60, +29), LL (−21, +90, +12), V5 (+142, −22, +14); Lead I (+74, −29, +14), Lead II (+28,
  +150, −17). His Fig. 3 [p. 104] puts V1 and V2 (4th intercostal space) at about level 5 and V4–V6 (5th) at about level
  6. Table 2 [p. 112] repeats the limb rows with the arms "lowered" to between levels 4 and 5 (Lead I (+105, −28, +19),
  Lead II (+37, +145, −14)) because his first simulator's Lead I was about 30 % too small [p. 109–110].
- **Dower's coefficients do come from Frank's image surface** ("Lead Vectors … (Derived from Frank's image surface)",
  Table I title [p. 105]). This answers Part I §1.2's open item. He states Frank's is the only published lead system for
  which this can be done [p. 102].

### 10.2 Where each pad sits on Frank's torso (the mapping, and its uncertainty)

The guide's figures are sketches without measurements [G 14-5], [G 14-15]. The mapping uses Dower's anchor (level 5 ≈ 4th
intercostal space, level 6 ≈ 5th, one level ≈ one space, [Dower p. 104 Fig. 3]) and the guide's words.

| Pad | Guide's words | Frank site (centre) | Grid points read | How uncertain |
|---|---|---|---|---|
| Apex–sternum: STERNUM | right of the sternum, just below the clavicle [G 14-5] | levels 2–3, between E and F | 2-E, 2-F, 3-E, 3-F | ± 1 level, ± ½ angle step |
| Apex–sternum: APEX | below and left of the left nipple, anterior axillary line [G 14-5] | Dower's V5 site (anterior axillary line, about level 6) | Dower's V5; and 6-B, 6-C, 7-B, 7-C for spread | ± 1 level, ± 1 angle step |
| AP: FRONT ("Front/Apex") | 3rd intercostal space, right mid-clavicular line [G 14-15] | level 4, between F and G (the mirror of Dower's V4 between C and D) | 4-F, 4-G | ± 1 level, ± ½ step |
| AP: BACK | "standard posterior position on the patient's left" [G 14-15]; Mittal: left scapula [Mittal 2000 p. 1283] | levels 5–7, between N and O | 5-N, 5-O, 6-N, 6-O, 7-N, 7-O | the guide gives no landmark; ± 1 level, ± 1 step |

### 10.3 How the points were read from Frank's Fig. 2 (so a reviewer can repeat it)

1. Pages 762 and 763 were rendered at 300 dpi (and crops at 600 dpi) from the library PDF.
2. The axis tick marks were located by a pixel scan for short dark runs touching each axis line. Frontal view: x ticks
   −100…+160 every 20 units at 119.2 px per 20 units; y ticks −120…+120 at 122.5 px per 20. Sagittal: z ticks −180…+100
   at 120.4 px per 20; y ticks −120…+120 at 123.1 px per 20. The printed figure is about 3 % taller than wide; values
   were interpolated piecewise between neighbouring ticks of each axis separately.
3. Each grid point's small circle was located by eye on the 600-dpi crops, and its label checked against the loop it lies
   on.
4. x and y came from the frontal view, z and y from the sagittal view. **Check:** the two independent y readings agree
   within 0.9 units for all 21 points (table below). **Check:** 6-B read here, (+143.9, −22.7, +4.0), lies within 2 units
   of Dower's V5 in x and y and 10 in z (Dower placed V5 between B and C).
5. Reading resolution is about ±1 unit; Frank's own accuracy is 5 % [p. 768].

| Point | x | y (frontal / sagittal) | z |
|---|---|---|---|
| 2-E | −20.3 | −86.3 / −86.6 | +23.3 |
| 2-F | −28.3 | −82.7 / −82.9 | +23.3 |
| 2-G | −36.3 | −75.3 / −76.3 | +23.1 |
| 3-E | −26.5 | −94.3 / −94.8 | +3.0 |
| 3-F | −41.3 | −84.2 / −84.8 | +3.9 |
| 3-G | −51.7 | −69.2 / −69.9 | +14.4 |
| 4-E | −39.3 | −102.9 / −103.3 | −35.7 |
| 4-F | −62.2 | −75.7 / −76.0 | −20.7 |
| 4-G | −68.4 | −55.4 / −55.9 | −1.1 |
| 5-F | −81.2 | −50.9 / −51.2 | −45.9 |
| 5-G | −81.7 | −39.8 / −40.0 | −13.1 |
| 6-B | +143.9 | −22.2 / −23.1 | +4.0 |
| 6-C | +138.0 | −25.5 / −26.2 | −117.0 |
| 7-B | +117.8 | +77.3 / +76.8 | +4.4 |
| 7-C | +95.1 | +91.3 / +90.9 | −83.2 |
| 5-N | −0.3 | −50.8 / −50.8 | +79.2 |
| 5-O | +25.5 | −56.7 / −56.7 | +73.4 |
| 6-N | −0.3 | −13.6 / −13.7 | +92.9 |
| 6-O | +28.8 | −20.9 / −20.6 | +89.2 |
| 7-N | −5.1 | +34.3 / +34.3 | +87.8 |
| 7-O | +24.2 | +31.1 / +31.4 | +87.8 |

### 10.4 The lead vectors (PROPOSED, in Frank's image-space units)

Site centres, by Frank's interpolation [p. 764] as the mean of the grid points of §10.2 (y as the mean of both views):

- STERNUM = mean(2-E, 2-F, 3-E, 3-F) = (−29.1, −87.1, +13.4).
- APEX = Dower's V5 = (+142, −22, +14) [Dower p. 105].
- FRONT (AP) = mean(4-F, 4-G) = (−65.3, −65.7, −10.9).
- BACK (AP) = mean(5-N, 5-O, 6-N, 6-O, 7-N, 7-O) = (+12.2, −12.7, +85.0).

Rows (the labelled pad minus the other; **the polarity the M2 uses is unknown**, Part I §1.1):

| Placement | Row (x, y, z) | Magnitude | Frontal angle atan2(y, x) | Spread over the candidate sites (each pad's grid points of §10.2) |
|---|---|---|---|---|
| Apex–sternum: APEX − STERNUM | (+171, +65, +1) | 183 | +21° | x +115…+185, y +57…+186, z −140…+11 |
| Anterior–posterior: FRONT − BACK | (−77, −53, −96) | 134 | — | x −97…−57, y −110…+1, z −114…−75 |

For comparison in the same units: Lead II (+28, +150, −17), frontal angle +79°; Lead I (+74, −29, +14), −21° [Dower
Table I]. In Frank's torso, the apex–sternum pad lead points between Lead I and Lead II, not along Lead II. (The Nas 2021
"proxy for lead II", Part I §1.2, is an assertion without a measurement; this does not settle it for real chests either.)

**How uncertain:** the spread column is the honest uncertainty, and it is large. Moving the apex site one angle step
(6-B to 6-C) changes z by 121 units; moving it one level (6 to 7) changes y by about 100. This is Frank's own warning that
"a unit area on the anterior chest of the torso is greatly magnified on the image surface" [p. 759–760].

### 10.5 Is the engine on the same scale? No

The engine's rows (`l2/ecg/vcg.ts`) are the Dower matrix as published in Clifford's `idowerT.m` ("Dower 1980" in the
code's comment), not Dower 1968's Table I. Component by component, engine ÷ Table I:

| Lead | Engine row | Dower 1968 Table I | Ratios x, y, z |
|---|---|---|---|
| I | (0.632, −0.235, 0.059) | (+74, −29, +14) | 0.0085, 0.0081, 0.0042 |
| II | (0.235, 1.066, −0.132) | (+28, +150, −17) | 0.0084, 0.0071, 0.0078 |
| V1 | (−0.515, 0.157, −0.917) | (−61, −63, −106) | 0.0084, **−0.0025**, 0.0087 |
| V2 | (0.044, 0.164, −1.387) | (+10, −82, −158) | 0.0044, **−0.0020**, 0.0088 |
| V3 | (0.882, 0.098, −1.277) | (+103, −38, −150) | 0.0086, **−0.0026**, 0.0085 |
| V4 | (1.213, 0.127, −0.601) | (+171, −9, −84) | 0.0071, **−0.0141**, 0.0072 |
| V5 | (1.125, 0.127, −0.086) | (+167, −2, −14) | 0.0067, **−0.0635**, 0.0061 |
| V6 | (0.831, 0.076, 0.230) | (+114, −2, +33) | 0.0073, **−0.038**, 0.0070 |

The axes agree in convention (x leftward, y footward, z backward: Lead II's y and V1's z have the same signs in both). But
the engine's rows are not Dower 1968's rows times one factor: most x and z ratios lie between 0.006 and 0.009, and the
precordial y components have the OPPOSITE sign. So a row derived from Frank's figure cannot be put on the engine's scale
from these two papers.

### 10.6 Pad area

Frank's and Dower's lead vectors are for points. Neither paper says how a large electrode's reading relates to the
points under it, and neither gives the current distribution under a pad that would weight them. A 78 cm² pad is 10 cm
across [Mittal 2000 p. 1283]; Frank's levels are 2 inches (5.1 cm) apart, and his 38-inch chest over 16 lines is a mean of
about 6 cm between lines (arithmetic on [p. 760]; the real spacing varies around the trunk). So one pad covers about two
levels and one or two lines, which is exactly the span over which §10.4's spread is large. **The papers do not let the
area be accounted for**; an unweighted mean of grid points would be an assumption of this note's, not theirs.

### 10.7 Outcome for E2b

What these two papers settle:
- The physical basis exists and is the right one: Dower's rows and a Pads row can come from the same image surface.
- PROPOSED rows in Frank units: apex–sternum (+171, +65, +1); anterior–posterior (−77, −53, −96), each with the spread of
  §10.4.

What is still missing before a row can enter the engine:
1. **The scale to the engine's rows** (§10.5): the derivation of the Dower matrix the engine uses (Dower GE, Machado HB,
   Osborne JA, Clin Cardiol 1980, by its title "On deriving the electrocardiogram from vectorcardiographic leads"; lead
   not verified here), to know whether it shares Frank's units and why its precordial y signs differ. Alternatively the
   engine's rows could be replaced by Dower 1968's, which is the owner's call and moves every lead.
2. **The pad-area weighting** (§10.6): a source giving the lead field of a large electrode on a torso model.
3. **The polarity** the M2 uses (Part I §1.1).
4. **The back pad's landmark**: the guide points to "the instructions on the electrode packaging" [G 14-15].

Until 1–3 are found, E2b cannot build the Pads lead honestly; the plan's fallback (E4 on the limb leads, AED unavailable)
stands. The sign of what Frank's torso shows is still worth recording: in a homogeneous torso, the apex–sternum lead is
not Lead II.

## 11. Samson 1995, the paediatric pads (W6, read in full)

Samson RA, Atkins DL, Kerber RE. Am J Cardiol 1995;75:544–545, DOI 10.1016/s0002-9149(99)80606-7 (a 2-page brief report,
a scanned copy; read as page images).

### 11.1 The series as the paper states it

- **Children** [p. 544]: 25, aged 3 weeks to 12 years (mean 3.7 ± 3.0 y); weight 3.8–35.8 kg, printed "mean 5.8 ±
  16.0" (as printed; a mean of 5.8 kg with SD 16 kg is not plausible for that range, and the paper offers no other
  figure); height 50–139 cm (98.4 ± 26.1); BSA 0.25–1.09 m² (0.61 ± 0.23).
- **Pads** [p. 544]: custom-made by R2 Corporation; foil electrodes under pre-gelled stannous chloride pads; gel diameters
  4, 4.5, 5.8, 7, 7.5, 8 and 10 cm; applied in random order in the apex–anterior position. 5.8 cm was "currently marketed
  as the 'pediatric' size". Pads tested per size: 24, 23, 25, 19, 15, 10, 9 children.
- **Method** [p. 544]: NO shocks. A modified Hewlett-Packard 43100A passes a 31 kHz square-wave test current; at least 3
  readings per pad size per child, averaged. The authors state that test-pulse impedance correlates with shock impedance
  in their earlier studies [p. 545].
- **Results** [p. 544]: mean TTI 148 ± 23 Ω for the SMALLEST pad (4 cm, n = 24) and 49 ± 9 Ω for the LARGEST (10 cm,
  n = 9). Other sizes only as bars in Fig. 1 [p. 545], with no printed values. Significant differences between the
  largest (8, 10 cm), middle (7, 7.5) and smallest (4, 4.5, 5.8) groups (p < 0.0001). Against 97 Ω: all children were
  above it with 4 and 4.5 cm pads; 21 of 25 (84 %) were below it with 5.8 cm and 17 of 19 (90 %) with 7 cm; all were below
  with larger pads. Body size correlated poorly with TTI (r = 0.59 for 5.8 cm, p < 0.05).
- **Pad areas** (arithmetic, π·(d/2)², assuming the circular gel the paper's "diameter" implies): 4 cm 12.6 cm²;
  4.5 cm 15.9; 5.8 cm 26.4; 7 cm 38.5; 7.5 cm 44.2; 8 cm 50.3; 10 cm 78.5 cm².

**Correction to Part I.** Heyer 2022's rows (Part I §2.2 C2, C2b) give "4–5.8 cm diameter, n = 24, 148 ± 23" and
"8–10 cm, n = 9, 49 ± 9", and an age of "4 ± 3 y". The paper gives 148 ± 23 for the 4-cm pad alone and 49 ± 9 for the
10-cm pad alone, and 3.7 ± 3.0 y.

### 11.2 What it does and does not support for the M2's Pediatric type (1–8 y or < 25 kg [G 12-3])

- **Supports:** impedance falls steeply with pad size in young children; with pads of 5.8 cm or more, most children
  measured below 97 Ω; the 4–4.5 cm pads gave about 150 Ω.
- **Does not support:**
  - a value for the ZOLL paediatric pad: its area is not in the guide (it lists only part names, Pedi-padz,
    [G B-2]) nor in this paper;
  - a distribution by age or weight inside 1–8 y: the paper gives no per-age values, and body size correlated poorly;
  - a shock impedance: no shock was given ("evaluation of actual shock success was not feasible", [p. 545]);
  - anterior–posterior placement: the authors "would expect" no difference [p. 545]; they did not measure it.

The paediatric gap of Part I §2.4 stays open: no shock-measured biphasic pads series in children under 8 was found.

## 12. Contradictions found (papers, guide, note, engine)

| # | Item | One statement | The other | Settled? |
|---|---|---|---|---|
| X1 | Mittal 2000 TTI by arm | Tables 2 and 3: biphasic 78 ± 16, monophasic 76 ± 17 [p. 1284–1285] | Text and Table 1 footnote: biphasic 76 ± 17, monophasic 78 ± 16 [p. 1283–1284] | No: the paper contradicts itself; Heyer copied both |
| X2 | Mittal 2000 enrolment | Paper: 174 enrolled, 9 excluded, 165 [p. 1283–1284] | Guide: 173 entered, 7 excluded, 165 [G A-28] | The paper is the primary; the guide's arithmetic does not close |
| X3 | Mittal 2000 men | Paper: 59 + 56 = 115 (70 %) [Table 2, p. 1284] | Guide: 116 male [G A-29] | Paper is primary |
| X4 | Mittal 2000 current | Paper: 11 ± 1 vs 22 ± 4 A, "50% less" [p. 1282, 1284] | Guide: 11 ± 1 vs 21 ± 4 A, "48% less" [G A-29] | Paper is primary |
| X5 | Mittal 2000 P for TTI; AF duration RR | Abstract and Table 5: P 0.005; 0.97 (0.96, 0.99) | Text: P 0.01; 0.98 (0.97, 0.99) [p. 1285] | No: internal |
| X6 | Mittal 2000 anterior pad | Paper: right parasternal [p. 1283] | Guide's AF figure: right 3rd intercostal space, mid-clavicular [G 14-15] | Different words; the guide's is the device's instruction |
| X7 | Trial waveform vs M2 | Mittal 1999/2000: 100 µs interphase, PD-2100 [p. 1596; p. 1283] | M2: 200 µs [G A-15] | Different devices; reported only |
| X8 | VF trial's subgroup | Guide: "> 90 Ω", 100 % vs 63 %, CI −0.0217 % to 0.759 % [G A-28] | Paper: "≥ 90 Ω", 19/19 vs 5/8 episodes, no CI; and ≥ 70 Ω 67/68 vs 24/28 [p. 1599] | Cite the paper |
| X9 | VF trial enrolment | Guide: 194 enrolled, 10 excluded [G A-27] | Paper: 330 enrolled, 194 defibrillated, 10 excluded [p. 1598] | Paper is primary |
| X10 | VF trial placement | Plan §3.2 reads the trial beside apex–sternum | Paper: apex (left 5th ICS, AAL) and left scapula [p. 1597] | The trial was apex–posterior |
| X11 | Chen 2013 1st-shock range | 40–247 Ω [p. 582] | 50–247 Ω [p. 583] | No: internal |
| X12 | Chen 2013 TTI and success | "unchanged over the whole spectrum of TTI" [p. 580, 583] | OR 0.995 (0.992–0.999), p = 0.008 [p. 583] | No: internal; unit and model not stated |
| X13 | Samson 1995 via Heyer | Heyer: 4–5.8 cm n = 24 148 ± 23; 8–10 cm n = 9 49 ± 9; age 4 ± 3 | Paper: 4 cm alone; 10 cm alone; 3.7 ± 3.0 y [p. 544] | Paper is primary; Part I corrected |
| X14 | `outcome.ts` energy | Comment: "Mittal's delivered … joules" | Paper: selected (50-Ω nominal) [p. 1283, 1285] | Finding F1 (§6.5) |
| X15 | `outcome.ts` escalation | Engine: cumulative 0.9992 over 70/120/150/170 J | Paper: 0.943 [p. 1284] | Finding F2 (§6.5) |
| X16 | Engine lead rows vs Dower 1968 | Engine: precordial y > 0 (e.g. V1 +0.157) | Dower 1968: precordial y < 0 (V1 −63) [p. 105] | No: needs the source of the engine's rows (§10.7) |
| X17 | Note Part I §1.3 | "Whether Dower's coefficients were themselves derived from Frank's image surface must be checked" | Dower 1968: they were [p. 102, 105] | Settled |
| X18 | Note Part I §2.3 | Mittal 2000's RR 0.64 "including the RLB arm" | The model pooled both arms; no RLB-only estimate [p. 1284–1285] | Corrected here |
