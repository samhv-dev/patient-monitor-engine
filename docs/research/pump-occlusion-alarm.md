# A syringe pump's occlusion alarm: time to alarm, compliance and the release bolus (research note, brief 193)

Written 12 November 2026 for the pump plan (`docs/plans/pump-rack-tci.md`, §10, pieces O1 and AL1, PQ4 = C). It
collects what is published and documented about the time from an occlusion to the pump's alarm, the compliance that
sets it, and the bolus when the occlusion is released, so that O1 can build what the sources measured and leave the
rest as named gaps. No code and no constant comes from this note by itself: every figure below is given with the pump,
syringe, line, rate and alarm setting it was measured at, and is never carried to another pump or syringe without a
sourced relation.

How to read the tags: **M** = measured in the source, as stated; **S** = stated by the source (a maker's statement,
a review, a recommendation), not a measurement of its own; **A** = read in the abstract only (the full text was not
open); **C** = the source calculated the figure from other measurements; **I** = my inference from two sourced
statements, marked so the owner can rule on it. Unit conversions I made are marked "(conversion)".

## 1. The mechanism, in plain words

1. **A syringe pump does not sense flow; it senses force or pressure.** The JMS SP-500 monitors "occlusion pressure ...
   by means of a load cell sensor built into the slider" (JMS SP-500 catalogue, p. 1; `research/50` SP-18). The alarm
   sounds when that pressure passes the set threshold (SP-500: three levels, L 20–60 kPa, M 50–90 kPa, H 80–140 kPa;
   catalogue p. 2; `research/50` SP-13 to SP-15).
2. **After an occlusion the plunger keeps moving, and the volume it drives is stored, not delivered.** The pressure
   rises only as that volume is stored in the compliance of the system: the syringe (above all its rubber plunger
   seal), the line, any air, and any valves. Joe et al. 2014 (Korean J Anesthesiol 66:300–305, doi
   10.4097/kjae.2014.66.4.300, Discussion) state it: "the occlusion alarm is always delayed, because the pressure
   setting for occlusion alarm threshold must be set relatively higher than the infusing driving pressure, and a
   disposable syringe has a compliant structure of the rubber bulb". The Smiths patent US 2003/0205587 A1 (Tribe and
   Pickles, priority GB 16 Aug 2000, read on Google Patents) says the excess force "is accommodated by deformation of the
   elastic components, such as the fluid tubing and the syringe plunger head" (S).
3. **What sets the delay.** Compliance C (volume stored per unit pressure), the pressure the system must climb (from
   the running pressure P0 to the alarm threshold Pset), and the rate Q. Joe et al. 2014 give the relation as their
   Equation 1, "calculated ... with 1000 mmHg of Pset, the compliance (C) and infusion rate (IR, ml/h). Digits in the
   equation (e.g. 3600, 1000) were used for the conversions of time unit (hour into second) and volume unit (ml to µl)",
   and found the predicted delay "not different" from the measured one in each of their four set-ups (P = 0.18–0.78).
   The equation itself is printed as an image I could not read as text; from that description it is
   T (s) = C (µL/mmHg) × Pset (mmHg) × 3600 / (Q (mL/h) × 1000), i.e. **T = C·Pset/Q** (I, the reading of the
   description; whether their Pset term is Pset or Pset − P0 is not legible in the text). The same proportionalities are
   measured elsewhere: occlusion time "correlated strongly" with the estimated compliance of the syringe and line
   (Pearson r = 0.998; Weiss et al. 2000, Paediatr Anaesth 10:595–599, doi 10.1111/j.1460-9592.2000.566ab.x, A), and
   the related zero-delivery time fell with rate "following a 1/x ratio" (Weiss et al. 2000, Can J Anaesth
   47:1031–1035, doi 10.1007/bf03024878, A). Larger syringes, lower rates, longer or softer lines, air in the syringe and
   a higher threshold all lengthen it (sources in §2).
4. **Why a bolus follows release.** The stored volume is under pressure. When the occlusion is opened it is pushed into
   the patient at once. Kawakami et al. 2013 (Technol Health Care 21:581–586, doi 10.3233/thc-130754, A): "An unintended
   bolus is delivered by the syringe pump if intravenous line occlusion is released in an inappropriate manner". The
   compliance studies of Weiss and colleagues measure compliance *as* that release bolus divided by the pressure ("Syringe
   compliance was calculated from the occlusion release bolus at an occlusion pressure of 300 mmHg", Can J Anaesth 2000,
   A; the same method at 100 mmHg in Weiss et al. 2000, Anaesthesia 55:1094–1098, doi 10.1046/j.1365-2044.2000.01550.x,
   A; at 38 mmHg in Neff et al. 2001, Intensive Care Med 27:287–291, doi 10.1007/s001340000784, A): so
   **V_release = C × P** at the pressure reached. Taken with point 3, the release bolus at the moment of the alarm is the
   volume the pump drove during the occlusion, **V = Q × T** (I: it follows from the two sourced relations; no source I
   read states it in those words).
5. **What reduces the bolus.** Releasing the pressure to the atmosphere before opening the line (Schulz et al. 2000,
   Anaesthesist 49:1018–1023, doi 10.1007/s001010070016, A: "the occluded infusion line should be released to ambient
   pressure first"), a low alarm setting and a small syringe (Kawakami 2013, A), and a pump that backs its drive off after
   the alarm. Weiss et al. 2023 (Eur J Anaesthesiol 40:387–390, doi 10.1097/eja.0000000000001839, open text), clinical
   tip 9, recommends: "Activate the pump's bolus retraction mode or release pressurized occlusion bolus to atmospheric
   pressure before opening the blocked infusion line" (S). The Smiths patent describes one such function: on an
   occlusion the pump drives "the motor in reverse until the force detected by the sensor 20 reduces to some level above
   zero", "typically about 10% of Fmax", kept "slightly above zero in order to ensure that there is no reverse flow"; it
   states no volume, distance or time (S).
6. **Why this matters for teaching (the owner's scenario).** Kariya et al. 2019 (J Patient Saf 15:290–292, doi
   10.1097/pts.0000000000000232, A) ran exactly this scenario with 16 anaesthesiology residents in a simulated ICU
   (occluded catecholamine stopcock; hypotension; a simulated hypertensive surge if the occlusion was released without
   relieving the pressure): "Eleven residents released the occlusion without relieving syringe pressure", and "Only 3 of
   10 participants who had previous knowledge of how such situations should be handled could appropriately release back
   pressure" (M, A).

## 2. Measured times to the occlusion alarm (syringe pumps first)

Every series found. "As stated" means the figure is copied, with its spread and unit; n is the number of runs where the
source gives it.

| # | Source | Pump | Syringe (brand, size) | Line | Rate | Alarm setting | Time to alarm, as stated | n | Tag |
|---|---|---|---|---|---|---|---|---|---|
| T1 | Dönmez, Araz, Kayhan 2005, Paediatr Anaesth 15:293–296, doi 10.1111/j.1460-9592.2005.01436.x | **JMS SP-500** and JMS SP-100 (20 of each) | JMS and Hayat, 20 and 50 mL | not stated in the abstract | 0.5, 1, 2, 5 mL/h | not stated in the abstract | "delays up to 117.3 ± 9.4 min with 50 ml syringe at 0.5 ml·h⁻¹ and 15.0 ± 7.1 min at 5 ml·h⁻¹"; longer with lower rate and larger syringe (P < 0.05); syringe type no effect; "The alarm on the JMS SP-500 pump was activated faster than the JMS SP-100 pump" | 40 pumps | M, A |
| T2 | Weiss, Neff, Gerber, Fischer 2000, Paediatr Anaesth 10:595–599, doi 10.1111/j.1460-9592.2000.566ab.x | not stated in the abstract | 50 mL and 10 mL (brand not stated in the abstract) | three lines | 1.0 mL/h (as reported by Joe et al. 2014 of this study) | 230 mmHg (as reported by Joe et al. 2014) | 50 mL: 20.3 ± 0.28 min, rising to 26.2 ± 0.19 min with the most compliant line; 10 mL: 2.6 ± 0.08, 5.6 ± 0.28 and 6.9 ± 0.35 min with the three lines | not stated | M, A |
| T3 | Joe, Moon, Lee, Min 2014, Korean J Anesthesiol 66:300–305, doi 10.4097/kjae.2014.66.4.300 (open text) | Fresenius Orchestra TCI workstation pumps | BD Plastipak-compatible 60 mL (BD 60 mL Luer-Lok) | Injectomat Line, 200 cm, "low-compliant"; anti-reflux valve (opening 5.3 mmHg) | 10 mL/h alone distal to the valve | 1000 mmHg | 416 ± 7 s | 48 challenges over the four set-ups | M |
| T3 | (same) | (same) | (same) | (same) | 50 mL/h alone distal to the valve | 1000 mmHg | 81 ± 3 s | (in the 48) | M |
| T3 | (same) | (same) | (same) | (same) | 10 + 50 mL/h both distal to the valve | 1000 mmHg | 133 ± 6 s | (in the 48) | M |
| T3 | (same) | (same) | (same) | (same), plus anti-siphon valve (opening 113 mmHg) | 10 + 50 mL/h | 1000 mmHg | 74 ± 5 s | (in the 48) | M |
| T4 | Hong, Lee, Kim, Choi, Min 2023, J Clin Monit Comput 37:1379–1386, doi 10.1007/s10877-023-00973-y | "a syringe-type infusion pump" (model not in the abstract) | 50 mL (brand not in the abstract) | 560 cm of line | 2 mL/h | not in the abstract | "the occlusion alarm could be delayed by 69.76 ± 3.98 min" | not stated | M, A |
| T5 | Deckert et al. 2009, Anesth Analg 108:518–520, doi 10.1213/ane.0b013e31819237ae | two pumps "of the same model" (not named in the abstract) | not stated in the abstract | one line | 50 / 20 / 5 mL/h | alarm "between about 900 and 1100 Mbar" (as printed; read as mbar) | pump 1: 2.4 ± 0.1 / 6.6 ± 0.4 / 23.0 ± 2.8 min; pump 2: 2.6 ± 0.2 / 5.6 ± 0.5 / 20.9 ± 3.6 min | 5 per cell | M, A |
| T5 | (same) | (same) | (same) | two lines in series | 5 mL/h | (same) | 27.1 ± 1.8 and 29.2 ± 1.4 min | 5 | M, A |
| T5 | (same) | (same) | (same) | three lines in series | 5 mL/h | (same) | 31.6 ± 3.0 and 35.1 ± 1.1 min | 5 | M, A |
| T6 | Doesburg et al. 2021, BMC Med Inform Decis Mak 21:295, doi 10.1186/s12911-021-01668-7 (open text), Table 1 | Alaris Asena GH (firmware 2.3.6) | BD Plastipak 50 mL | Vygon VGreen, 2 m, 1 mm ID; Codan stopcocks; triple-lumen CVC | 1 / 2 / 4 / 8 / 16 / 32 mL/h | 400 mmHg | 21.9 ± 1.9 / 10.8 ± 1.1 / 6.0 ± 1.1 / 2.7 ± 0.2 / 1.5 ± 0.1 / 1.4 ± 0.5 min | 3 per rate | **C** (the pump's pressure slope was measured; the delay to 400 mmHg was calculated from it, not timed) |
| T6 | (same), Table 2 | (same) | BD Plastipak 20 mL | MPH 12040150E, 1.0 mm, 1500 mm | 1 / 5 / 25 mL/h | 400 mmHg | 5.9 ± 1.2 (6.3 ± 1.1 in the regression rows) / 1.5 ± 0.5 / 0.3 ± 0.1 min | 3 | C |
| T6 | (same), Table 2 | (same) | Fresenius Injectomat 50 mL | MPH 12040150E, 1.0 mm, 1500 mm | 1 / 5 / 25 mL/h | 400 mmHg | 37.4 ± 9.9 / 5.0 ± 0.7 / 1.1 ± 0.2 min | 3 | C |
| T6 | (same), Table 2 | (same) | Fresenius Injectomat 50 mL | Codan 71.4021, 3.0 mm, 1500 mm | 25 / 50 / 75 mL/h | 400 mmHg | 1.9 ± 0.1 / 0.8 ± 0.0 / 0.5 ± 0.0 min | 3 | C |
| T7 | Juarez et al. 2016 (AutoSyP), Am J Trop Med Hyg 95:964–969, doi 10.4269/ajtmh.16-0285 (open text) | AutoSyP (a low-cost research pump, not marketed) | 5, 20 and 60 mL (brand not stated) | IV line and catheter | 5 mL/h ("the required flow rate for IEC occlusion testing") | baseline + 50 mmHg (paediatric) or + 100 mmHg (adult); which was used in this test is not stated | 1.4, 4.15 and 8.64 min | not stated | M |
| T8 | Schulz et al. 2000, Anaesthesist 49:1018–1023, doi 10.1007/s001010070016 | not stated in the abstract | 50 mL | not stated | 1 mL/h | not stated | 2 mL of air in the syringe gave "a 2.6-fold prolongation of the occlusion alarm time" | not stated | M, A |
| T9 | Kim and Steward 1999, Paediatr Anaesth 9:335–337, doi 10.1046/j.1460-9592.1999.00402.x | not stated in the abstract | three sizes | — | 1 mL/h | — | a larger syringe "delayed the time to occlusion alarm" (no figure in the abstract) | — | M, A |
| T10 | Baeckert et al. 2020, Br J Anaesth 124:173–182, doi 10.1016/j.bja.2019.10.007 | seven marketed syringe pump assemblies (not named in the abstract) | — | — | 1 mL/h | — | "occlusion alarm delays" led to >25 % deviation of the modelled plasma epinephrine (no time in the abstract) | — | M, A |

Peristaltic (volumetric) pumps, for the drip channel's context only (none is the OT-701):

| # | Source | Pump | Set | Rate | Setting | Time to alarm, as stated | n | Tag |
|---|---|---|---|---|---|---|---|---|
| P1 | Ilan et al. 2008, Crit Care Med 36:2763–2765, doi 10.1097/ccm.0b013e31818698e3 | 5 each of Sigma 8000-plus, Graseby 3000, Baxter Colleague, Alaris 7230B (peristaltic) | "commonly used tubing sets" | 100 / 10 / 2 mL/h | default (mid-range) thresholds | 0.3 (0.1) / 2.3 (0.5) / 11.7 (3.1) min, mean (SD), pooled over the 20 devices | 20 devices | M, A |
| P2 | Park and Jung 2022, J Dent Anesth Pain Med 22:129, doi 10.17245/jdapm.2022.22.2.129 (open text) | UNIMEDICS PS-1000 PCA pump (peristaltic disc) | IV tube to an IEC 60601-2-24 set-up | 1 / 10 / 25 / 100 / 120 mL/h | alarm measured at 10.60 ± 0.31 psi (549.18 ± 16.03 mmHg) | "10 min and 4 s" at 1 mL/h; "60, 28, 26, and 29 s" at 10, 25, 100 and 120 mL/h | not stated | M |

Reviews that summarise these series (S): Snijder et al. 2015 (Biomed Tech 60:277–300, doi 10.1515/bmt-2014-0148, A):
compliance caused "delayed occlusion alarm times (up to 117 min)"; Weiss et al. 2023 (EJA, tip 9): "Delays of more than
75 min before triggering the occlusion alarm and occlusion release boluses of >1 ml have been reported"; Doesburg et al.
2021: "At low flow rates (≤ 1 ml/h) the alarm delay ... can be up to 2 h using conventional pressure threshold
algorithms". The insulin-pump series (Freckmann et al. 2018, J Diabetes Sci Technol 12:608–613, doi
10.1177/1932296817750404) is a different device class and is not used.

## 3. Measured or stated compliance of syringes and lines

| # | Source | What | Value as stated | Measured at | Tag |
|---|---|---|---|---|---|
| K1 | Joe et al. 2014 | BD 60 mL syringe + Injectomat Line 200 cm + valves, whole set-up, slope of volume against pump driving pressure | 2.31 ± 0.12 µL/mmHg (10 + 50 mL/h distal to the anti-reflux valve); 1.20 ± 0.08 µL/mmHg (with anti-siphon valve); IR10, IR50 and IR10&50+ASV "not different" from one another; linearity adjusted R² 0.9997 | Pset 1000 mmHg, 10 and 50 mL/h | M |
| K2 | Weiss et al. 2000 (Paediatr Anaesth), as cited by Joe et al. 2014 | syringe and line | "mean compliance ... 1.33 µl/mmHg" | 1.0 mL/h, 230 mmHg alarm threshold, from the release bolus | M (second-hand) |
| K3 | Snijder et al. 2015 (systematic review of 53 studies) | the syringe, "the most important source of mechanical compliance in syringe pump setups" | 9.0 × 10⁻⁹ to 2.1 × 10⁻⁸ L/Pa (= about 1.2 to 2.8 µL/mmHg, conversion: 1 mmHg = 133.3 Pa) | across the reviewed studies; brands and sizes not in the abstract | S, A |
| K4 | Weiss et al. 2000 (Can J Anaesth) | 10, 20, 30, 50 mL syringes | compliance "closely related to syringe plunger area (R² = 0.93)"; values not in the abstract | release bolus at 300 mmHg | M, A |
| K5 | Weiss et al. 2000 (Anaesthesia) | four brands of 50 mL syringe | "Syringe design affected the internal syringe compliance"; values not in the abstract | release bolus at 100 mmHg | M, A |
| K6 | Weiss et al. 2000 (Intensive Care Med 26:776–779, doi 10.1007/s001340051246) | five lines | compliance per line not in the abstract | release bolus at 300 mmHg | M, A |
| K7 | Hong et al. 2023 | syringe size and line length | compliance rose with both; "contributions to system compliance from syringes were significantly greater compared to those of extended infusion lines"; values not in the abstract | 2 mL/h, by occlusion release | M, A |
| K8 | Schulz et al. 2000 | air in a 50 mL syringe | "Enclosed air within infusion syringes considerably affects the syringe compliance" (2 mL air: 2.6× alarm time, 3× bolus) | 1 mL/h | M, A |

No source I could read gives the compliance of a **JMS** syringe of any size, or of the SP-500's own syringe-holding
mechanism. The simulator's syringe container is a generic "Syringe (polypropylene)" (`apps/demo/src/app/remote/bench.ts`,
`syringe-pp`) with no brand.

## 4. Release bolus volumes, and what bolus-reduction functions are stated to do

| # | Source | Pump | Syringe | Rate | Setting | Bolus as stated | n | Tag |
|---|---|---|---|---|---|---|---|---|
| B1 | Kawakami et al. 2013 | Terumo Terufusion TE312 vs TE332S | 50 mL | not in the abstract | High | TE312: 1.99 ± 0.16 mL; TE332S: 0.674 ± 0.116 mL (P < 0.001) | not stated | M, A |
| B1 | (same) | both | 10 vs 50 mL | — | low vs high | bolus "significantly lower" at the low-pressure setting and with the 10 mL syringe; a pump difference "only when a 50-ml syringe was used" | — | M, A |
| B2 | Juarez et al. 2016 (AutoSyP) | AutoSyP | 5 / 20 / 60 mL | 5 mL/h | baseline + 50 or + 100 mmHg | 0.25 / 0.30 / 0.66 mL | not stated | M |
| B3 | Schulz et al. 2000 | not stated | 50 mL with 2 mL air | 1 mL/h | — | "a 3-fold increase of the resulting infusion bolus" | — | M, A |
| B4 | Kim and Steward 1999 | not stated | larger vs smaller | 1 mL/h | — | larger syringe "increased the size of the postocclusion bolus dose" (no figure) | — | M, A |
| B5 | Weiss et al. 2023 (EJA) | review | — | — | — | "occlusion release boluses of >1 ml have been reported" | — | S |
| B6 | Kluger and Owen 1990, Anaesthesia 45:1057–1061, doi 10.1111/j.1365-2044.1990.tb14889.x | three PCA pumps with seven anti-reflux sets | — | — | — | sets "can achieve a potential 'stored volume' if occluded"; a "potentially dangerous bolus" after release with large stored volumes (no figure in the abstract) | — | M, A |

Bolus-reduction functions: Kawakami et al. end, "Using a syringe pump capable of reducing the inadvertently administered
bolus may be helpful" (A; whether the TE332S's lower bolus comes from such a function is not stated in the abstract, so
it is not claimed here). Weiss et al. 2023 name a "bolus retraction mode" (S). The Smiths patent's reverse drive to
about 10 % of the maximum force is the one mechanism I could read in a maker's own words (S, §1 point 5). None of the
three reference pumps' readable documents names such a function (§5).

## 5. What the three reference pumps' own documents state

- **JMS SP-500** (catalogue BRO/500-E/001, `assets/pumps/SP-500 English.pdf`, 2 pages, read again on 12 November with
  `pdftotext`): three occlusion levels with their pressures (SP-13 to SP-16), the load-cell sensor (SP-18), "Occlusion"
  in the alarm list (SP-17). No time to alarm, no release bolus, no bolus-reduction function, no syringe brand list
  beyond "with JMS syringes" for the accuracy. The one measured series on this pump is Dönmez et al. 2005 (T1), whose
  per-pump table is not open (WANTED W1). A search on 12 November found the Japanese package insert (添付文書) of the
  SP-500 family on PMDA's site, `https://www.pmda.go.jp/PmdaSearch/kikiDetail/OldPdfData/20800BZZ00861000_A_01/3` (and
  `/4`), a PDF of 278.4 KB; it is not read (see §8 for how its bytes reached a local cache without being opened) and is
  WANTED (W2). A search engine's summary of that insert says it warns that removing an occlusion while the internal
  pressure is high may cause a transient over-infusion (bolus); that is a third party's summary of an unread document,
  not a source, and nothing here rests on it.
- **JMS OT-701** (catalogue BRO/701-E/001, 2 pages): occlusion pressure printed "100±400 kPa (1±0.4kgf/cm2)" (OT-16) and
  an occlusion sensor among the characteristics; no time to alarm (OT-26). Operator's manual WANTED (W3).
- **Mindray BeneFusion SP5 TCI**: the maker's page read for `research/50` (W1 there) states no mechanics (TC-12 is a gap).
  A search on 12 November found no SP5 manual from the maker; Mindray's public PDFs for other models (the iSP
  instructions for use, the "isp series safety and performance information", whose contents list "A.5 Occlusion Alarm
  Delay and Bolus Volume") exist only as downloads and are another model's figures, so they are listed (W5) and not used.
- **The standard's disclosure.** IEC 60601-2-24:2012 (Ed. 2.0, 123 pages, IEC webstore publication 2635) is the
  infusion-pump standard; open papers describe its occlusion test only in passing: AutoSyP: "In accordance with IEC
  60601 standards, the maximum time for activation of the occlusion alarm and the unintended bolus volume were
  determined ... at 5 mL/hour, the required flow rate for IEC occlusion testing" (S); Freckmann et al. 2018 (insulin
  pumps): the standard "describes test settings and procedures to determine occlusion detection time" and sets no time
  limit ("there are no requirements for a time limit until an alarm has to be triggered", A). So the standard asks the
  maker to measure and disclose the time and the bolus; the figures are the maker's, in the operator's manual. None of
  the three reference pumps' manuals is readable here.

## 6. What this supports for O1

**What can be computed from sources now, for the simulator's pumps:** nothing as a number. The relations are sourced
(time T = C·Pset/Q, Joe et al. 2014, Equation 1, verified against their own measurements; release volume V = C·P, the
method of Weiss and colleagues; hence V = Q·T at the alarm, my inference I), but each needs the compliance C of the
syringe-and-line in use and the alarm pressure, and no readable source gives C for a JMS syringe or any syringe in the
SP-500, or the SP5's alarm pressures at all.

**What would become buildable with the WANTED documents:**
- With **Dönmez et al. 2005's full text (W1)**: measured SP-500 times for JMS (and Hayat) 20 mL and 50 mL syringes at
  0.5, 1, 2 and 5 mL/h, at the occlusion level they used (the abstract does not say which). These are the department's
  pump and are the only SP-500 measurements found.
- With the **SP-500 operator's manual or package insert (W2, W4)**: the maker's disclosed maximum time to alarm and
  bolus at its test conditions, if it gives them (the standard asks it to), and whether the pump backs off after the
  alarm.

**Where an interpolation or extrapolation would be needed (said, not done):**
- Rates above 5 mL/h on the SP-500 (most TIVA rates: propofol 10 mg/mL from a 50 mL syringe runs well above it) would
  need T ∝ 1/Q from Joe et al. 2014 (shown there for one pump and syringe, 10 and 50 mL/h) applied to the SP-500's
  measured cells: an extrapolation across rate with a relation measured on another pump.
- The 10 mL and 30 mL syringes on the SP-500 have no measured cell; size enters through compliance (K4, related to
  plunger area), whose values for JMS syringes are not read.
- Level L or H when the measured level is M (or whichever Dönmez used) would need T ∝ Pset (Joe), with the SP-500's
  levels given only as bands (L 20–60 kPa etc.), not single values.
- The SP5 TCI and the OT-701: no measured cell at all; the peristaltic series P1, P2 are other pumps.

**What stays a gap:** the SP5's and OT-701's times and boluses (manuals W3, W5); every SP-500 cell outside Dönmez's
grid; the compliance of any JMS syringe; whether the SP-500 has any bolus-reduction function; whether any pump keeps
driving after its alarm (the patent's pump stops and reverses; the reference pumps' behaviour is the manuals').

### Questions for the owner (one decision each)

**OQ1. Where should the SP-500's occlusion-alarm time come from while the paper and manual are not read?**
Explanation: the only measurements on your SP-500 are in Dönmez 2005 (20 and 50 mL syringes at 0.5–5 mL/h); the
abstract gives two pooled figures (117 min at 0.5 mL/h, 15 min at 5 mL/h, 50 mL) without saying which pump. Other papers
give the physics (time = compliance × alarm pressure / rate) but on other pumps and syringes.
Options: **A** — keep the instructor's press as the only alarm (the plan as written) until W1/W2 are read;
**B** — obtain Dönmez 2005's full text (W1) and build the SP-500's measured cells only, the press everywhere else;
**C** — compute every cell from T = C·Pset/Q with a compliance measured on another syringe (Joe's BD 60 mL), which this
note's rule forbids unless you rule it.
Proposal: **B**, with A outside the measured cells.

**OQ2. Should a release bolus be delivered when the occlusion clears?**
Explanation: the sources agree a stored volume is pushed in on release unless the pressure is relieved first or the pump
backs off. On a source-built cell the stored volume is the volume the pump drove during the occlusion (rate × time),
up to the alarm.
Options: **A** — no release bolus (the plan as written); **B** — release the volume the pump drove while occluded
(V = Q × T, capped at the alarm) on the cells where T is sourced, none elsewhere; **C** — B, but only after the SP-500
manual (W2/W4) says whether the pump backs off, since a back-off changes the volume.
Proposal: **C** (B's mechanism, gated on the manual).

**OQ3. Should the learner's way of clearing the occlusion matter?**
Explanation: the teaching point in Kariya 2019 is that residents opened the stopcock without first relieving the
syringe pressure (11 of 16); the sources say relieving it to the atmosphere first avoids the bolus.
Options: **A** — no; clearing is one instructor event; **B** — yes: the learner side gets a "relieve the pressure
first" action, and the bolus of OQ2 is delivered only if the line is opened without it.
Proposal: **B**, if OQ2 is B or C; otherwise it has nothing to act on.

**OQ4. The drip channel (OT-701) and the SP5 TCI: their alarm time?**
Explanation: no measurement on either pump was found; the peristaltic series (Ilan 2008) are four other pumps pooled.
Options: **A** — instructor's press only until their manuals (W3, W5) are read; **B** — use Ilan 2008's pooled
peristaltic means for the OT-701, which carries another pump's figure.
Proposal: **A**.

## 7. WANTED

| # | What | Where | Why |
|---|---|---|---|
| W1 | Dönmez A, Araz C, Kayhan Z. "Syringe pumps take too long to give occlusion alarm." Paediatr Anaesth 2005;15(4):293–296, doi 10.1111/j.1460-9592.2005.01436.x (PMID 15787919) | Wiley Online Library (subscription) | the only measured times on the JMS SP-500: per pump, syringe brand, size and rate, and the occlusion level used |
| W2 | JMS SP-500 family package insert (添付文書), PMDA approval 20800BZZ00861000, document A_01, parts 3 and 4 | `https://www.pmda.go.jp/PmdaSearch/kikiDetail/OldPdfData/20800BZZ00861000_A_01/3` (PDF, 278.4 KB) and `/4` | the maker's statements on occlusion pressure, alarm, and the bolus warning; the current insert may also be on PMDA's search under the same approval number |
| W3 | JMS OT-701 operator's manual | from JMS or the department's biomedical engineering | time or volume to the occlusion alarm (OT-26); the tolerance misprint (OT-16); air-in-line behaviour (AL1) |
| W4 | JMS SP-500 operator's manual (an accessory named in the catalogue, `research/50` J1 p. 2) | the department's pumps or biomedical engineering | the standard's disclosed maximum time to occlusion alarm and bolus at each level and syringe size; any back-off after the alarm; syringe brands calibrated (SP-25) |
| W5 | Mindray BeneFusion SP5 TCI operator's manual | Mindray (the maker publishes manuals for other BeneFusion models as PDFs, e.g. the iSP instructions for use at mindray.com) | occlusion levels (TC-12), the disclosed time and bolus, any anti-bolus function |
| W6 | IEC 60601-2-24:2012, Ed. 2.0, "Medical electrical equipment — Part 2-24: Particular requirements for the basic safety and essential performance of infusion pumps and controllers", 123 pages | IEC webstore, publication 2635 (for sale) | the exact occlusion test (rates, thresholds, what is disclosed), so a manual's table can be read correctly |
| W7 | Kawakami H et al. 2013, Technol Health Care 21:581–586, doi 10.3233/thc-130754 | SAGE (subscription) | the per-condition bolus table (rate, syringe sizes, both levels) and whether the TE332S has a bolus-reduction function |
| W8 | Weiss M, Neff T, Gerber A, Fischer J 2000, Paediatr Anaesth 10:595–599, doi 10.1111/j.1460-9592.2000.566ab.x; Weiss M, Hug MI, Neff T, Fischer J 2000, Can J Anaesth 47:1031–1035, doi 10.1007/bf03024878 | Wiley; Springer (subscription) | compliance by syringe size (10–50 mL) and the release bolus per size; pump and syringe brands |
| W9 | Hong KY et al. 2023, J Clin Monit Comput 37:1379–1386, doi 10.1007/s10877-023-00973-y (a preprint is at Research Square, doi 10.21203/rs.3.rs-1833191/v1, whose page served no text) | Springer (subscription) | compliance by syringe size and line length, and the alarm series |
| W10 | Kim DW, Steward DJ 1999, Paediatr Anaesth 9:335–337, doi 10.1046/j.1460-9592.1999.00402.x; Deckert D et al. 2009, Anesth Analg 108:518–520, doi 10.1213/ane.0b013e31819237ae; Baeckert M et al. 2020, Br J Anaesth 124:173–182, doi 10.1016/j.bja.2019.10.007 | Wiley; Lippincott; Elsevier (subscription) | the pump models, syringe brands and figures behind the abstracts (Baeckert's seven modern assemblies at 1 mL/h above all) |

## 8. What was searched, and what could not be read

- **Repository and assets:** the plan's §5, §8, §10, O1, AL1, PQ4; `research/50-pump-reference-devices.md`;
  `packages/controller/pump-devices/{sp-500,ot-701,sp5-tci}.json`; `packages/controller/formulary/stock-syringes.json`
  (propofol 10 mg/mL in 50 and 20 mL, phenylephrine 100 µg/mL in 20 mL); `assets/pumps/` (the two JMS catalogues, 2
  pages each, searched for occlusion, bolus, time and compliance: nothing beyond `research/50`).
- **Library** (`library/sources/full-pdfs/`): Miller's Anesthesia 10th ed. (2025) and 9th ed. (2020), Trissel's
  Handbook of Injectable Drugs (2013) and the co-existing-disease text, searched for syringe pump, syringe driver,
  occlusion alarm, post-occlusion, start-up delay and compliance. The one relevant passage: Miller 10th ed., ch. 23
  "Intravenous Drug Delivery Systems", printed p. 651 (the same text in the 9th ed., ch. 26, printed p. 771): delivery is
  disturbed by "excessive compliance within the administration system (in the syringe plunger or in the administration
  lines)" and poorly lubricated syringes, "particularly with small patients, low target concentrations, concentrated drug
  solutions, or large syringes" (its ref. 162, Sahinovic et al., Curr Opin Anaesthesiol 2010;23:734). No time or bolus
  figure in either edition. The TCI papers in `library/sources/papers/tci/` are pharmacokinetic and were not searched for
  this.
- **Europe PMC REST** (12 November): "occlusion alarm" AND syringe; "syringe pump" AND occlusion AND bolus; "syringe
  pump" AND compliance AND "start-up"; "post-occlusion bolus"; "time to occlusion alarm"; "alarm time"; "unintended
  bolus"; "occlusion release"; "occlusion pressure" AND bolus; the Weiss group; "60601-2-24"; "anti-bolus" (0 hits);
  peristaltic and volumetric alarm delay; pump brand names; title search for occlusion and pump. Open full texts read:
  Joe 2014, Weiss 2023 (EJA), Doesburg 2021, Park and Jung 2022 (PCA), Juarez 2016; scanned for occlusion passages only: Weiss 2025 (Paediatr Anaesth, start-up),
  Weiss 2024 (J Clin Monit Comput, venting), Norton and Jha 2025 and Pooke 2023 (low-cost pumps: no occlusion data),
  Yuan 2026 (an epidural case of misread occlusion alarms; no figures). Abstracts only for the rest.
- **Withdrawn and not used:** Doyle et al. 2019, "Target controlled infusion pump occlusion alarm response times and
  their clinical implications" (Research Square, doi 10.21203/rs.2.166/v2): "The authors have withdrawn the journal
  submission associated with this preprint and requested that the preprint also be withdrawn".
- **Web searches** for the SP-500 and SP5 manuals, Japanese package inserts, the standard and bolus-reduction functions;
  manual sites returned only other models or third-party uploads (Scribd and similar), which are not used.
- **Not readable:** the subscription papers in §7; the Research Square page of Hong 2023 (served only its title); two
  patent pages (uspto.report, data.epo.org: HTTP 403); the PMDA insert (a PDF). While I checked whether the PMDA link
  was a page or a document, the fetch tool saved the PDF's bytes to its own local cache. I did not open, read or use
  that copy, and it was not copied into the repository or the assets. The insert stays WANTED (W2).
- **DOIs:** every DOI in this note resolved at doi.org on 12 November 2026 (HTTP 302 to the publisher).
