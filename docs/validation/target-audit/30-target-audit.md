# 30 — Target audit: are the acceptance bands right? (roadmap job 11, 2026-10-11)

Read-only audit of the BANDS, not the engine. Scope: every `it.fails` / `test.fail` under `packages/*/test` and
`apps/demo/e2e` on origin/main `26e78308` (233 occurrences in 92 files), plus the 43 rows of
`docs/validation/calibration-queue.md`. Evidence already verified in research/26, 27, 28 is cross-referenced, not redone.
Under R45 nothing here changes a band: each proposed band is evidence for an owner ruling.

Verdicts: RIGHT · TOO NARROW · TOO WIDE · MIS-SPECIFIED · UNSUPPORTED. Evidence grades: A human experimental / large
observational · B small human or consistent animal · C textbook consensus · D disputed.
CSV twin: `research/30-target-audit.csv`. The per-section working files are in `research/30-parts/`.

Sections are added as each one finishes; the synthesis (ranked list, probable non-misses, unsourced queue items) comes last.

## Neuro, depth and NMB

Sixteen rows: 14 known-miss assertions in the neuro/NMB/depth, brain/TBI and stimulus-surge tests, one passing depth test
that KNOWN_MISSES picked up through a comment (neuro-engine DI nadir), and calibration-queue row t25. Verdicts:
7 MIS-SPECIFIED, 4 TOO NARROW, 3 UNSUPPORTED, 1 TOO WIDE, 1 RIGHT. The pattern: several bands either measure a
different event from the one their source measured, or contradict that source outright. Examples: labetalol 10 mg,
where Inada 1989 found NO pressor blunting; incision cited to a laryngoscopy paper; t25's "effort within 2.2 min of
sugammadex", which takes a TOFR-0.9 endpoint and uses it for breathing; a sedated-patient VT band applied to an awake
rig; and volatile potentiation taken from 1.25–1.5 MAC data and applied at 1 MAC. In 12 of the 16 rows the measured
engine value already sits inside the evidence band, and two more are uncertain (the HTN ratio) or partly inside
(esmolol). Two rows go the other way. The propofol depth-index nadir passes
today (50 against < 52), but human BIS nadirs after 2 mg/kg are about 29 ± 10, so this is a hidden miss. Propofol–
remifentanil ventilatory synergy is a real miss against a correct band. NMB onset and recovery targets were already
checked in research/26 T1 and research/27, and only cross-referenced here. Abstracts were read through PubMed
E-utilities, and Miller 10e pages from the local PDFs. Prys-Roberts 1971 (full text 403) and the "Miller +20–40"
awake-laryngoscopy figure could not be opened and are marked UNVERIFIED.

### Rows

<a id="row-1"></a>

#### 1. `packages/engine-core/test/l2/neuro/interactions.test.ts:23` — 1 MAC volatile: EC50 x 0.67 (tables §5d)
- **Band / stated source:** rocuronium EC50 multiplier = 1/1.5 (0.667) at 1 MAC — tables §5d; research/14 DI-51 cites "Miller ch. 24; 7f interactions.ts EC50 / (1 + 0.5·MAC)" [no page]
- **Measured:** x 0.847 (VOL_NMB_K 0.18)
- **Source verification:** Bock M et al. Br J Anaesth 2000;84:43-47, PMID 10740546 (abstract): at 1.25 MAC, "The mean ED50 of rocuronium was 169 (SD 41), 126 (32), 121 (28) and 136 (25) micrograms kg-1 during propofol, isoflurane, sevoflurane and desflurane anaesthesia, respectively (ns)"; ED90 358/288/289/250; "Recovery index was 22 (13), 27 (10), 28 (13) and 26 (14) min ... (ns)"; Lowry DW et al. Anesth Analg 1998;87:936-940, PMID 9768798 (abstract): 1.5 MAC + 66 % N2O; ED50 142 (sevo) / 165 (iso) / 183 (propofol) microg/kg, ED95 265/324/398; T1 25 % after 0.6 mg/kg "45 +/- 13.1 ... 35 +/- 6.1 ... and 35 +/- 9.2" min; "There were no differences among groups in the times for onset of action or to recovery of T1 to 25%"; T1 90 % 83 vs 55 min, TOFR 0.8 103 vs 62 min (sevo vs propofol). Miller chapter/page for "x 0.67 at 1 MAC" not located: UNVERIFIED.
- **Band vs source:** No. The best human data are dose (ED50/ED90) ratios at 1.25-1.5 MAC, not EC50 at 1 MAC: sevo/propofol ED50 0.72 (Bock, 1.25 MAC, ns) and 0.78 (Lowry, 1.5 MAC + N2O); ED90/95 0.67-0.81. x 0.67 is the strongest end of the 1.25-1.5 MAC data, applied at 1 MAC. Isoflurane is weaker (Lowry ED50 ratio 0.90).
- **Better evidence:** Potentiation is agent-, concentration- and time-dependent (Bock: infusion requirement at 120 min -32 % with all three volatiles). At 1 MAC a multiplier of about 0.75-0.90 fits the 1.25-1.5 MAC data scaled down. (grade A (two RCTs, n 84 and ~60, abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: EC50 multiplier 0.72-0.90 at 1 MAC sevoflurane (iso/des similar to sevo in Bock); keep 0.62-0.72 only if re-specified at 1.5 MAC (Bock 2000 PMID 10740546; Lowry 1998 PMID 9768798)
- **Likely not a miss:** yes (0.847 inside 0.72-0.90)

<a id="row-2"></a>

#### 2. `packages/engine-core/test/l2/neuro/depth-drive.test.ts:142` — 1 MAC volatile lowers non-depolariser EC50 by ~33 % (0.62-0.72, tables §5d)
- **Band / stated source:** 0.62-0.72 — tables §5d
- **Measured:** x 0.847 (-15 %)
- **Source verification:** Same as interactions.test.ts:23 (Bock 2000; Lowry 1998).
- **Band vs source:** No: as above (1.25-1.5 MAC dose data applied at 1 MAC).
- **Better evidence:** As above. (grade A)
- **Verdict: MIS-SPECIFIED** · proposed: 0.72-0.90 at 1 MAC (Bock 2000; Lowry 1998)
- **Likely not a miss:** yes

<a id="row-3"></a>

#### 3. `packages/engine-core/test/l2/neuro/interactions.test.ts:33` — 1 MAC volatile: rocuronium duration +20-45 % (neuro-only rig)
- **Band / stated source:** T1 25 % time ratio 1.20-1.45 (DI-51 engine cell: +25-80 %) — tables §5d via VOL_NMB_K; DI-51 "potent volatiles at ~1 MAC prolong ... ~30-50 % (Miller ch. 24)"
- **Measured:** +13.4 % (rig); DI-51 engine +48.4 %
- **Source verification:** Lowry DW et al. Anesth Analg 1998;87:936-940, PMID 9768798 (abstract): 1.5 MAC + 66 % N2O; ED50 142 (sevo) / 165 (iso) / 183 (propofol) microg/kg, ED95 265/324/398; T1 25 % after 0.6 mg/kg "45 +/- 13.1 ... 35 +/- 6.1 ... and 35 +/- 9.2" min; "There were no differences among groups in the times for onset of action or to recovery of T1 to 25%"; T1 90 % 83 vs 55 min, TOFR 0.8 103 vs 62 min (sevo vs propofol); Maidatsi PG et al. Eur J Anaesthesiol 2004;21:781-786, PMID 15678732 (abstract): rocuronium 0.9 mg/kg, recovery to 5 % single twitch: sevoflurane 58.86 min vs propofol 51.11 min (+15 %), desflurane 90.18 min; Bock M et al. Br J Anaesth 2000;84:43-47, PMID 10740546 (abstract): at 1.25 MAC, "The mean ED50 of rocuronium was 169 (SD 41), 126 (32), 121 (28) and 136 (25) micrograms kg-1 during propofol, isoflurane, sevoflurane and desflurane anaesthesia, respectively (ns)"; ED90 358/288/289/250; "Recovery index was 22 (13), 27 (10), 28 (13) and 26 (14) min ... (ns)". Miller "30-50 %" locator not found: UNVERIFIED.
- **Band vs source:** Partly. Clinical duration (T1 25 %) at 1.5 MAC sevo +29 % and NOT significant (Lowry); iso 0 %; Maidatsi sevo +15 % (T5). The big volatile effect is on late recovery (T1 90 % +51 %, TOFR 0.8 +66 %, recovery index ~x1.9 in Lowry), not on T1 25 %. A 20 % floor at 1 MAC for T1 25 % sits at the top of the evidence; DI-51 25-80 % is higher still.
- **Better evidence:** Measure the volatile effect on TOFR 0.8/0.9 or the recovery index, where it is large and significant; on T1 25 % at 1 MAC expect about +0-30 %. (grade A)
- **Verdict: TOO NARROW** · proposed: T1 25 % ratio 1.05-1.35 at 1 MAC sevoflurane (iso ~1.0-1.2); add a TOFR 0.8 ratio 1.3-1.8 at ~1.5 MAC if a late-recovery band is wanted. DI-51 (25-80 %) should come down to the same 5-35 % (Lowry 1998; Maidatsi 2004; Bock 2000)
- **Likely not a miss:** yes for the rig (+13.4 %); the engine cell DI-51 (+48 %) is then ABOVE the evidence

<a id="row-4"></a>

#### 4. `packages/engine-core/test/l2/neuro/reversal.test.ts:53` — [R-7f-7] underdosed sugammadex 0.5 mg/kg at PTC after rocuronium 1.2 -> recovery then recurarisation (peak > 0.95, fall >= 0.04)
- **Band / stated source:** peak TOFR > 0.95 then fall >= 0.04 — tables §5d sugammadex mechanism row [TXT]/[ENG] "recurarisation if underdosed"; Eleveld 2007
- **Measured:** peak 0.833 at +90 min, no fall (ideal-binder ceiling 0.834)
- **Source verification:** Eleveld DJ et al. Anesth Analg 2007;104:582-584, PMID 17312212 (abstract): "a temporary decrease in train-of-four (TOF) response was observed after reversal ... with a small dose (0.5 mg/kg) of sugammadex administered 42 min after 0.9 mg/kg of rocuronium"; "muscle relaxation rebound can occur for doses of sugammadex in a limited critical range". Note: the test comment says the source pair is 0.6 mg/kg rocuronium; the abstract says 0.9 mg/kg at 42 min.
- **Band vs source:** No. The source is one case at rocuronium 0.9 mg/kg, dose given at 42 min (shallow block), and the rebound exists only in a "limited critical range". The test uses rocuronium 1.2 mg/kg at PTC 1 (deep block), where 0.5 mg/kg is about 25 % of the body rocuronium: a capacity shortfall gives incomplete reversal, not full recovery then rebound. Peak > 0.95 is not expected at all.
- **Better evidence:** None better found for this dose pair; the rebound itself is a case report plus model (Eleveld). (grade B (case + PK/PD fit))
- **Verdict: MIS-SPECIFIED** · proposed: Either (a) Eleveld pair: rocuronium 0.9 mg/kg, sugammadex 0.5 mg/kg at 42 min -> TOFR peak > 0.9 then a transient fall >= 0.04, recovered at end; or (b) keep 1.2 + 0.5 at PTC and assert INCOMPLETE reversal (peak TOFR < 0.9) (Eleveld 2007 PMID 17312212)
- **Likely not a miss:** yes (0.833 plateau is the expected capacity-limited behaviour; the test comment reports 7g reproduces the rebound at 0.6 + 0.5)

<a id="row-5"></a>

#### 5. `packages/engine-core/test/l2/neuro/depth-drive.test.ts:109` — synergy: propofol 1 + remifentanil 1 depresses more than the product of each
- **Band / stated source:** totalDep(both) > Bliss-independent prediction — tables §5d (Nieuwenhuijs 2003)
- **Measured:** equal at alpha 0 (0.735 both vs 0.735 independent)
- **Source verification:** Nieuwenhuijs DJ et al. Anesthesiology 2003;98:312-322, PMID 12552187 (abstract): "When given in combination, their effect on respiration was synergistic (greatest synergy observed for resting V(i))"; "When combined, their effect on respiration is strikingly synergistic, resulting in severe respiratory depression."
- **Band vs source:** Yes in direction (n = 22 volunteers, propofol 0-2.6 ug/mL, remifentanil 0-2.0 ng/mL). Caveat: the paper defines synergy against a response-surface (Loewe-type) additive model, the test against Bliss independence; "strikingly synergistic" exceeds either.
- **Better evidence:** None needed. The conflict is internal: the D15b ruling set alpha 0 because FU-6 resp-induction bands (fentanyl 2 ug/kg apnoea 60-240 s) failed at alpha > 0. Those bands, not this one, need re-checking. (grade A)
- **Verdict: RIGHT** · proposed: keep (both > Bliss prediction); optionally quantify: resting VE depression at propofol 1 + remi 1 clearly beyond Bliss (Nieuwenhuijs 2003 PMID 12552187)
- **Likely not a miss:** no (real miss; fix lies in reconciling with resp-induction bands)

<a id="row-6"></a>

#### 6. `packages/engine-core/test/engine/neuro-acceptance.test.ts:35` — residual block at extubation (TOFR < 0.9, natural airway): smaller breaths than the unblocked control
- **Band / stated source:** VT blocked < 0.75 x control at 32-35 min after rocuronium 0.6 mg/kg, no hypnotic (awake) — tables §4.6 uaCollapse (written for the SEDATED patient); FU-6 R3(d)
- **Measured:** ratio 0.80 (402 vs 500 mL)
- **Source verification:** research/27 rows 21, 23, 26 (verified there): Pavlin 1989 PMID 2923288 "At maximum neuromuscular blockade (MIP of -20 cm H2O), VC was 2.0 liters ... and PETCO2 was normal"; Ali 1975 PMID 1138775 "Respiratory frequency, tidal volume and peak expiratory flow rate were not altered". Cantineau JP et al. Anesthesiology 1994;81:585-590, PMID 8092503 (abstract): after 0.6 mg/kg, diaphragm 25/75/90 % twitch recovery at 23/33/35 min vs adductor 40/56/64 min.
- **Band vs source:** No. The rig is the AWAKE patient (the file comment says so). Awake partly blocked volunteers keep resting VT; at 32-35 min after 0.6 mg/kg the diaphragm is already at ~75-90 % twitch (Cantineau) while the hand shows TOF 3-4 with fade. A < 0.75 VT ratio is the sedated row applied to the wrong arm.
- **Better evidence:** Eikermann 2003 (research/27 row 26): upper-airway obstruction and inspiratory flow loss at TOF 0.5-0.8 are the impairments, not resting VT. (grade A)
- **Verdict: MIS-SPECIFIED** · proposed: awake arm: VT ratio >= 0.8 (near-normal) with an obstruction/inspiratory-flow load present; keep < 0.75 only on a sedated (hypnotic) arm (research/27 rows 21, 23, 26; Cantineau 1994 PMID 8092503)
- **Likely not a miss:** yes (0.80)

<a id="row-7"></a>

#### 7. `packages/engine-core/test/engine/neuro-engine.test.ts:~142 (it, not it.fails; listed via KNOWN_MISSES comment)` — propofol 2 mg/kg: depth-index nadir < 52 (sibling test asserts nadir > 38)
- **Band / stated source:** DI nadir < 52 (and > 38 in the sibling test) — [ENG]; tables §5d DI = BIS-like, Ce50 Eleveld BIS 2024
- **Measured:** nadir 50 (passes)
- **Source verification:** Blum J et al. PLoS Clin Trials 2006;1:e17, PMID 16878179 (abstract): propofol 2 mg/kg, 99 patients 18-60 y, "The lowest mean BIS(min) was measured in group 1 (28.7 +/- 10.3)" (5-s injection), 33.0 +/- 13.9 (120 s), 36.4 +/- 11.0 (240 s); BISmin reached at 103 s after a 5-s bolus.
- **Band vs source:** No. Population nadir after a 2 mg/kg bolus is BIS ~29 +/- 10; the band admits 38-52, i.e. it excludes the population mean (the > 38 floor) and accepts a nadir ~2 SD shallower than observed. DI is "not a BIS algorithm" but is calibrated to BIS (Eleveld Ce50).
- **Better evidence:** - (grade A (RCT n 99, abstract))
- **Verdict: TOO WIDE** · proposed: nadir 20-45 (mean ~30) at ~1.5-2 min after a fast 2 mg/kg bolus; drop the > 38 floor (Blum 2006 PMID 16878179)
- **Likely not a miss:** no (passes today at 50, but 50 is outside the evidence band: a hidden miss)

<a id="row-8"></a>

#### 8. `packages/engine-core/test/l2/brain/model.test.ts:136` — check 18: PaCO2 25 -> CBF 35-40 % of the anaesthetised baseline (75 y HTN, MAP 65, CVP 6)
- **Band / stated source:** 0.35-0.40 — tables §7 check 18 (= 0.70 pressure term x C(25) with kCO2 0.03, i.e. derived arithmetic)
- **Measured:** 0.417 (0.376 through the engine at CVP 12)
- **Source verification:** Miller 10e ch. 10 p. 189: "CBF changes 1 to 2 mL/100 g/min for every mm Hg change in PaCO2 around normal PaCO2 values. This response is attenuated at a PaCO2 less than 25 mm Hg." Fig. 10.8A: normotension hypocapnia 1.67 % CBF/mmHg; "Hypotension (<33% reduction) ... Hypocapnia = 1.3% CBF mm Hg". p. 190: during propofol "The magnitude of the reduction in CBF during hypocapnia is decreased".
- **Band vs source:** No. The band is the tables' own product (0.70 x 0.55) with no direct source and a 5-point width. Miller gives 1.3-1.67 %/mmHg in this setting (moderate hypotension, propofol), i.e. C(25) ~0.75-0.80 -> 0.52-0.56; the 1-2 mL/100 g/min/mmHg range (2-4 %/mmHg at CBF 50) gives C(25) 0.40-0.70 -> 0.28-0.49.
- **Better evidence:** - (grade C)
- **Verdict: TOO NARROW** · proposed: 0.35-0.55 of the anaesthetised baseline (Miller 10e ch. 10 pp. 189-190, Fig. 10.8)
- **Likely not a miss:** yes (0.417)

<a id="row-9"></a>

#### 9. `packages/engine-core/test/engine/organs-tbi.test.ts:97` — Cushing through circ.ext.rSysF: HR -20-40 % from the baroreflex (MODELED)
- **Band / stated source:** hrEnd/hr0 0.6-0.8 — tables §5.1 Cushing "[TXT shape, ENG numbers]"
- **Measured:** 0.803
- **Source verification:** Kalmar AF et al. Br J Anaesth 2005;94:791-799, PMID 15805143 (abstract, 17 neuroendoscopies, 100 Hz recordings): "the occurrence of hypertension and tachycardia was clearly the result of an increase in intracranial pressure"; "a Cushing reflex developed in almost every case where the cerebral perfusion pressure dropped below 15 mm Hg"; "The occurrence of bradycardia was not systematically associated with a low cerebral perfusion pressure". Miller 10e ch. 53: "An increase in blood pressure and decrease in heart rate (a Cushing-type response) is classic, but the heart rate component is less reliable."
- **Band vs source:** No source for the number. The tables tag the numbers [ENG]; the human data say the HR limb is inconsistent and often tachycardic first.
- **Better evidence:** Kalmar 2005 also puts the Cushing trigger at CPP < 15, vs the tables' CPP < 40 (separate band, not in this test). (grade B (n 17) + C)
- **Verdict: UNSUPPORTED** · proposed: direction only: HR at end <= baseline (ratio <= 0.9), with an initial tachycardia allowed; or keep 0.6-0.85 as an explicit [ENG] teaching choice (Kalmar 2005 PMID 15805143; Miller 10e ch. 53)
- **Likely not a miss:** yes (0.803)

<a id="row-10"></a>

#### 10. `packages/engine-core/test/engine/organs-tbi-treatment.test.ts:33` — hyperventilation: ICP falls no more than 30 % by the time PaCO2 reaches 30
- **Band / stated source:** ICP drop 25-30 % (this it.fails is the <= 30 % edge) — tables §5.1 / check 19 "ICP -25-30 % (via CBV)" OA-CBF [TXT]
- **Measured:** 30.5 %
- **Source verification:** Oertel M et al. J Neurosurg 2002;97:1045-1053, PMID 12450025 (abstract, 33 TBI patients, 57 tests): "a mean decrease in PaCO2 from 35 +/- 5 to 27 +/- 5 mm Hg and in ICP from 20 +/- 11 to 13 +/- 8 mm Hg"; "A decrease in ICP of more than 20% below the baseline value was observed in 77.2 ... % of hyperventilation ... tests". OA-CBF secondary source not opened: UNVERIFIED.
- **Band vs source:** Partly. The direction and order are right, but the human mean for an ~8 mmHg PaCO2 fall from ICP 20 is -35 %, with wide spread; a 5-point band (25-30 %) for a 10 mmHg fall is narrower than the evidence and sits below its mean.
- **Better evidence:** - (grade A)
- **Verdict: TOO NARROW** · proposed: ICP -20-45 % at PaCO2 30 from ~40 with ICP ~20 (Oertel 2002 PMID 12450025)
- **Likely not a miss:** yes (30.5 %)

<a id="row-11"></a>

#### 11. `packages/engine-core/test/engine/stimulus-surge.test.ts:85` — awake laryngoscopy raises MAP 20-40 mmHg and HR 12-30
- **Band / stated source:** dMAP 20-40, dHR 12-30 (no hypnotic, stimulus 1.5 for 60 s) — "M10"; orchestrator ruling 2026-09-28 "the SOURCED +20-40 (Miller)"
- **Measured:** dMAP 40.3, dHR 13.1
- **Source verification:** Miller page for +20-40 not found: Miller 10e ch. 40 and a full-text grep of Miller 9e give no mmHg figure for the laryngoscopy pressor response: UNVERIFIED. Shribman 1987 PMID 3828177 (abstract) is an ANAESTHETISED study (fentanyl + thiopentone + atracurium) and gives no numbers in the abstract.
- **Band vs source:** Unverified. No located source quantifies laryngoscopy in a fully awake, un-topicalised adult; the band's 40 mmHg ceiling is not anchored, and the measured value is 0.3 mmHg over it (includes a hypercapnic contribution per the test comment).
- **Better evidence:** Helfman 1991 PMID 1672488 (placebo arm after thiopental): SBP +36 % and HR +44 % with intubation; an awake response should be at least as large. (grade C/D)
- **Verdict: UNSUPPORTED** · proposed: dMAP >= 20 with ceiling ~50 (or >= the propofol arm), dHR 12-35; owner to choose a ceiling (Helfman 1991 PMID 1672488 (lower bound, anaesthetised))
- **Likely not a miss:** yes (40.3)

<a id="row-12"></a>

#### 12. `packages/engine-core/test/engine/stimulus-surge.test.ts:99` — 1b: untreated hypertensive pressor response exaggerated: dMAP ratio HTN/healthy >= 1.3 (Prys-Roberts 1971)
- **Band / stated source:** >= 1.3 — Prys-Roberts 1971 BJA 43:531 via research/19 CM-03c ("~2x normotensives")
- **Measured:** 1.19 (+29.8 vs +25.0)
- **Source verification:** Prys-Roberts C, Meloche R, Foëx P. BJA 1971;43:122-137 PMID 5550843 (paper I, treated vs untreated vs normotensive): no abstract on PubMed; full text 403. Paper II (43:531) per search digest compared 16 untreated vs 20 treated hypertensives across five induction agents. Magnitude "~2x" UNVERIFIED.
- **Band vs source:** Unverified. Direction is plausible but the only Miller 10e sentence found (ch. 29, CKD autonomic dysfunction) is about CKD, not essential hypertension: "exaggerated hypertensive response to stress (e.g., with direct laryngoscopy and intubation)". Absolute vs percentage ratio not specified: an untreated HTN baseline MAP ~20 % higher gives ~1.2 in absolute mmHg from proportional scaling alone.
- **Better evidence:** None obtained. (grade C (direction) / UNVERIFIED (magnitude))
- **Verdict: UNSUPPORTED** · proposed: ratio >= 1.15 in absolute dMAP (direction plus more than proportional) until the Prys-Roberts table is read (Prys-Roberts 1971 (needs full text))
- **Likely not a miss:** uncertain (1.19 passes the weaker band)

<a id="row-13"></a>

#### 13. `packages/engine-core/test/engine/stimulus-surge.test.ts:121` — 1c: surgical incision under sevoflurane, no opioid: dMAP 20-30 mmHg (ET-16a; Shribman 1987)
- **Band / stated source:** 20-30 mmHg — ET-16a; Shribman 1987 via R51 addendum 25
- **Measured:** +19.1
- **Source verification:** Shribman AJ et al. BJA 1987;59:295-299, PMID 3828177 (abstract): a LARYNGOSCOPY study ("The catecholamine and cardiovascular responses to laryngoscopy alone have been compared with those following laryngoscopy and intubation"); not about incision. Katoh T et al. BJA 2000;84:63-66 PMID 10740549: MAC-BAR defined as HR or MAP +15 %; sevoflurane MAC-BAR 1.45 MAC (children, 60 % N2O). Katoh 1999 Anesthesiology 90:398 PMID 9952144: fentanyl 3 ng/mL cuts sevoflurane MAC-BAR by 83 % (adult MAC-BAR value not in abstract).
- **Band vs source:** No: the cited source measures laryngoscopy, not skin incision. For incision at ~1 MAC (below MAC-BAR ~1.45 MAC) a positive adrenergic response (>= 15 % MAP or HR) is expected in most patients; no source gives 20-30 mmHg.
- **Better evidence:** MAC-BAR literature defines the response as >= 15 % (~12-15 mmHg at MAP 80-95). (grade B)
- **Verdict: MIS-SPECIFIED** · proposed: dMAP >= 15 % of pre-incision MAP (~12-15 mmHg), upper ~35 mmHg, at <= 1 MAC sevoflurane without opioid (Katoh 2000 PMID 10740549; Katoh 1999 PMID 9952144)
- **Likely not a miss:** yes (+19.1)

<a id="row-14"></a>

#### 14. `packages/engine-core/test/engine/stimulus-surge.test.ts:143` — 3: labetalol 10 mg blunts it: dMAP ratio 0.2-0.8 (Inada 1989; DI-08)
- **Band / stated source:** dMAP ratio 0.2-0.8 — Inada 1989
- **Measured:** MAP ratio 0.96, HR ratio 0.64
- **Source verification:** Inada E, Cullen DJ, Nemeskal AR, Teplick R. J Clin Anesth 1989;1:207-213, PMID 2697239 (abstract): groups placebo / lidocaine 100 mg / labetalol 5 mg / labetalol 10 mg, n = 10 each, given 2 min before laryngoscopy: "Labetalol 10 mg prevented a rise in heart rate after intubation"; "The hypertensive response to intubation was similar in all four groups"; conclusion "preventing tachycardia but not hypertension".
- **Band vs source:** No: the band contradicts its own source. Inada found NO blunting of the pressor response at 10 mg, only of HR.
- **Better evidence:** Larger doses (e.g. 0.25-0.75 mg/kg) do blunt BP in other trials (not verified here). (grade B (n 10/group RCT))
- **Verdict: MIS-SPECIFIED** · proposed: labetalol 10 mg: dMAP ratio 0.8-1.1 (no meaningful pressor blunting) AND dHR ratio <= 0.7 (Inada 1989 PMID 2697239)
- **Likely not a miss:** yes (MAP 0.96, HR 0.64 match Inada)

<a id="row-15"></a>

#### 15. `packages/engine-core/test/engine/stimulus-surge.test.ts:162` — 4: esmolol 1 mg/kg bounds: dHR ratio <= 0.5 and dMAP ratio <= 0.9
- **Band / stated source:** HR <= 0.5, MAP <= 0.9 — T6.2 "the classic teaching"
- **Measured:** HR 0.56, MAP 1.00
- **Source verification:** Helfman SM et al. Anesth Analg 1991;72:482-486, PMID 1672488: esmolol 150 mg (~2 mg/kg): max HR rise 18 % vs placebo 44 % (ratio 0.41); SBP rise 19 % vs 36 % (ratio 0.53). Miller DR et al. Can J Anaesth 1991;38:849-858, PMID 1683818 (n 548): esmolol 100 mg controls HR; "Esmolol was less effective in controlling blood pressure, but, in combination with low-dose narcotic, esmolol suppressed the SBP response". Figueredo 2001 meta-analysis PMID 11576054: effect "dose-dependent".
- **Band vs source:** Partly. HR <= 0.5 matches ~2 mg/kg (Helfman) better than 1 mg/kg; at 1 mg/kg without opioid HR ratio ~0.4-0.65 is plausible. MAP <= 0.9 is directionally supported (Helfman SBP 0.53 at 2 mg/kg) but Miller 1991 says BP blunting without opioid is weak.
- **Better evidence:** - (grade A (multicentre RCT, meta-analysis))
- **Verdict: TOO NARROW** · proposed: esmolol 1 mg/kg, no opioid: dHR ratio <= 0.65; dMAP ratio 0.5-1.0 (HR blunted more than MAP, already asserted) (Helfman 1991; Miller 1991 PMID 1683818; Figueredo 2001)
- **Likely not a miss:** partly: HR 0.56 yes; MAP 1.00 at the edge (MAP blunting absent in the engine is at the weak end of the evidence)

<a id="row-16"></a>

#### 16. `docs/validation/calibration-queue.md (validation scenario t25)` — t25-rocuronium-sugammadex/recovery/rr-back
- **Band / stated source:** spontaneous RR > 4 first reached 60-240 s after sugammadex 2 mg/kg (given at 1800 s, 29 min after rocuronium 0.6 mg/kg) — tables §7 25 "spontaneous effort returns within ~2.2 min of sugammadex" [ENG]
- **Measured:** 0.0 s (RR already > 4 when sugammadex is given)
- **Source verification:** Cross-ref research/26 T1 §1.3 and research/27 §1.8 (verified there): first diaphragm activity ~16 min (12-24) after 0.6 mg/kg (Moerer 2005 PMID 15832241: "Onset of recovery was earlier at the diaphragm ( young 15.9 min, old 22.0 min)"). Cantineau 1994 PMID 8092503: diaphragm 25 % twitch at 23 +/- 9 min. Tables §7 25 itself says "capnogram cleft and spontaneous effort return before TOF >= 2". The 2.2 min is the sugammadex label median to TOFR 0.9, not to breathing.
- **Band vs source:** No. The band ties effort return to sugammadex; the tables' own scenario line and the evidence put effort return ~16 min after rocuronium, i.e. before the 29-min sugammadex dose. "2.2 min" is the TOFR 0.9 endpoint borrowed for a different event.
- **Better evidence:** - (grade A)
- **Verdict: MIS-SPECIFIED** · proposed: first spontaneous effort 12-24 min after rocuronium (before sugammadex); after sugammadex assert TOFR 0.9 in 1.5-3 min (already in reversal.test.ts) and an adequate VT (research/26 T1; research/27 §1.8; Moerer 2005; Cantineau 1994)
- **Likely not a miss:** yes (0 s = effort already present, as the evidence predicts)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **stimulus-surge:143, labetalol 10 mg ΔMAP ratio 0.2–0.8.** The band contradicts its own source. Inada 1989
   (PMID 2697239): "Labetalol 10 mg … preventing tachycardia but not hypertension." The engine's MAP 0.96 / HR 0.64
   matches the source. Dependents: DI-08 (research/14), and the R51 addendum 25 note that labetalol's α share is "small".
2. **t25 rr-back (calibration queue).** This band puts effort return after sugammadex, but the tables' own §7 25 line
   and the evidence (diaphragm ~16 min; research/26 T1, research/27 §1.8) put it before the 29-min dose, so the
   measured 0 s is correct. Dependents: none beyond the queue row. The 2.2-min sugammadex → TOFR 0.9 test in
   reversal.test.ts is right and already passes.
3. **neuro-acceptance:35, residual-block VT < 0.75 on an awake rig.** The awake-volunteer data (Pavlin, Ali; research/27)
   and Cantineau's diaphragm timing say VT should be near-normal. Dependents: Q-FU6-4 / D21 / E-FU6-10, and the
   tables §4.6 uaCollapse row (sedated arm only).
4. **interactions:23 + depth-drive:142, EC50 × 0.67 at 1 MAC, and interactions:33 / DI-51 duration.** Bock 2000 and
   Lowry 1998 give dose ratios of 0.72–0.81 at 1.25–1.5 MAC, and a T1-25 % prolongation of ≤ +29 % (NS) even at
   1.5 MAC. The size of the effect is mis-scaled, so VOL_NMB_K 0.18 (× 0.847) is closer to the evidence than the
   tables. **DI-51's 25–80 % fit target is above the evidence**: the engine's +48 % is then the real error, and it
   is the target VOL_NMB_K was fitted to (FU-7 Task 14).
5. **neuro-engine propofol DI nadir (< 52, sibling floor > 38).** BIS nadir is 28.7 ± 10.3 after 2 mg/kg (Blum 2006).
   The > 38 floor in the sibling `it` excludes the population mean. Dependents: Ce50PropBis / DI calibration (tables
   §5d Q53), and possibly the 1 MAC DI 38–48 band, which was not audited here.
6. **stimulus-surge:121, incision ΔMAP 20–30.** Shribman 1987 is a laryngoscopy paper. Incision response is defined by
   MAC-BAR as ≥ 15 % (Katoh). Dependents: ET-16a (research/14-coverage), and the SURGE_NE_GAIN fit (Q17).
7. **reversal:53, underdosed sugammadex.** Eleveld's case is rocuronium 0.9 mg/kg with sugammadex at 42 min (the test
   comment says 0.6). At rocuronium 1.2 + PTC, 0.5 mg/kg should give incomplete reversal, not full reversal followed
   by a rebound.
8. **organs-tbi:97, Cushing HR −20–40 %.** The numbers are tagged [ENG], and Kalmar 2005 finds bradycardia
   inconsistent, with tachycardia first. The same issue applies to the passing MANUAL row "HR 80 → 45–55" and to the
   tables' CPP < 40 trigger (Kalmar: CPP < 15).
9. **brain/model:136 check 18 (0.35–0.40) and organs-tbi-treatment:33 hyperventilation (25–30 %).** Both are 5-point
   bands derived from the tables' own kCO2 arithmetic. The evidence (Miller 10e Fig. 10.8; Oertel 2002, −35 % mean)
   supports wider bands.
10. **stimulus-surge:85 awake ceiling 40, and :99 HTN ratio ≥ 1.3.** Neither magnitude was found in a source. These
    are owner choices.

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
EC50 × 0.847 (both tests); rig duration +13.4 %; underdosed-sugammadex plateau 0.833; residual-block VT ratio 0.80;
check 18 at 0.417; Cushing HR ratio 0.803; hyperventilation 30.5 %; awake laryngoscopy +40.3; incision +19.1;
labetalol 0.96 / 0.64; esmolol HR 0.56; t25 at 0 s. Still real misses: the propofol–remifentanil synergy (Nieuwenhuijs
2003, RIGHT band), and esmolol MAP 1.00, which is at the weak edge. Hidden miss: the DI nadir of 50 (passes, but is
outside the evidence).

**(c) Items with no source.** t25 (tagged [ENG] by the queue itself and contradicted by the tables' own scenario line).
The awake-laryngoscopy +20–40 "Miller" figure (no page located in Miller 10e ch. 40 or the full Miller 9e text). The
Prys-Roberts "≈ 2×" (full text not obtained). The Cushing HR numbers ([ENG]). Check 18's 35–40 % (derived arithmetic).
The "Miller ch. 24 30–50 %" volatile-prolongation figure behind DI-51 (no page located).

## Circulation (A): arrest, CPR, ischaemia and rhythm

Twenty-two rows: 21 known-miss assertions in the arrest, CPR, ischaemia and escape-rhythm tests, plus calibration-queue
row g3-cpr-etco2. Verdicts: 10 MIS-SPECIFIED, 7 RIGHT, 3 UNSUPPORTED, 2 TOO NARROW, 0 TOO WIDE. The pattern is a source
used to measure something it did not measure. Paradis 1990 gives a ROSC threshold (maximal CoPP ≥ 15) and a ROSC-group
MEAN maximum (25.6 ± 7.7), and the suite turned the two into a 15–25 range that is enforced "throughout", including
the exsanguinated thorax before the volume arrives. R39-2's 10-minute CPR EtCO2 mean is applied at the 2-minute point
and on a 1.3–3.3 min queue window with no ventilation set. A "< 5 mmHg at 30 s" no-flow EtCO2 has no source: Falk's
abstract gives no time, starts from a pre-arrest EtCO2 of about 10 mmHg, and alveolar washout at 12 × 600 cannot get
there in 30 s. Kern 2007's best-case cerebral flow of "at best 30–40 %" became a 0.30–0.40 range, cited to Meaney 2013,
which has no such figure. Two rows are the reverse case, where the band is right and the engine is wrong. Asphyxial
PEA keeps organised activity for 10–20 min (DeBehnke, 169 dogs; DCD cohorts), so the engine's PEA decay
(hazard mean 420 s [ENG]) is too fast. Decompressing a tension pneumothorax restores perfusion within 30–60 s even
from PEA (Hatch 2014). In 7 of 22 rows the measured value already sits inside the evidence band, 2 more partly, and 3
are uncertain (two of them rest on stale pre-washout unit-model numbers). Ten are real misses: asphyxial PEA decay,
monitor HR, the exsanguination ROSC with no pulse in 10 min (evidence 6.1 ± 1.7 min), CPR kIsch 1.00, CPR CBF 0.45,
adult CPR coRatio 0.363, tension decompression, both escape rows, and the MANUAL 90/52 spiral. Sources were read as
abstracts through PubMed E-utilities, from Miller 10e ch. 82 and Coexist 8e ch. 6 (local PDFs), and from the Kern
2007 chapter abstract. Weisfeldt & Becker 2002 (no abstract), Forrester 1976 (no abstract) and Leigh-Smith & Harris
2005 were not opened and are marked UNVERIFIED. A side finding for research/26 T3: its "Garnett 1987, n = 35,
15 ± 4" is actually Sanders 1989 (PMID 2761035). Garnett's own abstract has 23 patients at about 13 mmHg.

### Rows

<a id="row-17"></a>

#### 17. `packages/engine-core/test/engine/arrest-etco2.test.ts:55` — VF without CPR, ventilation continuing: EtCO2 < 5 mmHg at +30 s
- **Band / stated source:** EtCO2 < 5 mmHg at +30 s after VF onset (12 x 600 continuing) — research 03 §4.4 / BUILD-PLAN Stage 3 acceptance 4; owner ruling 2026-10-07 on research/26 T3 (Falk 1988)
- **Measured:** 9.3 mmHg at +30 s (2.6 at +60 s; 0.2 at +120 s)
- **Source verification:** Falk JL, Rackow EC, Weil MH. N Engl J Med 1988;318:607-611, PMID 3125432 (abstract): 13 arrests in 10 ventilated ICU patients; "The end-tidal carbon dioxide concentration decreased from a mean (+/- SD) of 1.4 +/- 0.9 to 0.4 +/- 0.4 percent after the onset of cardiac arrest. During precordial compression, it increased to 1.0 +/- 0.5 percent." The abstract gives NO time for the fall; the "over one minute" in research/26 T3 comes from a secondary summary (UNVERIFIED). Note the pre-arrest baseline: 1.4 % = about 10.6 mmHg, not 35. research/03 §4.4 ("decays over a few breaths to <5 mmHg") is tagged [ENG, anchored] and cites no source for 30 s.
- **Band vs source:** No. No source gives a 30-s value. Falk measured the end point, not the time course, and from a pre-arrest EtCO2 of about 10 mmHg (critically ill), not 35. Washout arithmetic ([ENG] derivation, not a measurement): with flow stopped and ventilation continuing, each breath dilutes alveolar CO2 by about VA_breath/(FRC + VT) = 450/(2400 + 450), about 16 %; 6 breaths at 12/min give 0.84^6 = 0.35, so 35 mmHg falls to about 12 mmHg at 30 s and to about 4 mmHg at 60 s (the engine comment gives the same tau, V_alv/VA about 24-36 s). "< 5 at 30 s" needs tau <= 15 s.
- **Better evidence:** Falk (end point about 3 mmHg, from a low baseline) plus washout physics: 8-15 mmHg at 30 s and <= 6 at 60 s from a 35-mmHg start at 12 x 600. (grade C (physics derivation; Falk A for the end point only))
- **Verdict: MIS-SPECIFIED** · proposed: drop the 30-s point or set it to 7-15 mmHg; keep <= 6 at +60 s and <= 5 at +120 s (the passing arrest-etco2:44) (Falk 1988 PMID 3125432; washout derivation)
- **Likely not a miss:** yes (9.3 inside 7-15; 2.6 at 60 s)

<a id="row-18"></a>

#### 18. `packages/engine-core/test/engine/arrest-etco2.test.ts:82` — VF + CPR q 0.8 from +30 s: EtCO2 >= 17 already at +2 min of CPR
- **Band / stated source:** EtCO2 >= 17 mmHg at +2 min of CPR (10/min x 500, FiO2 1) — R39-2 steady band 17-23 (research/09 §2), applied at a single early time point
- **Measured:** 15.9 mmHg (18.0 before FU-7.1 B3; 16.5 before FU-8)
- **Source verification:** Sanders AB, Kern KB, Otto CW, Milander MM, Ewy GA. JAMA 1989;262:1347-1351, PMID 2761035 (abstract): 35 arrests in 34 patients; resuscitated "had higher average end-tidal carbon dioxide partial pressures during cardiopulmonary resuscitation than 26 patients who could not be resuscitated (15 +/- 4 vs 7 +/- 5 mm Hg)". Garnett AR et al. JAMA 1987;257:512-515, PMID 3098993 (abstract): 23 patients, mechanical (Thumper) CPR at constant ventilation, EtCO2 1.8 % +/- 0.9 % (no ROSC) and 1.7 % +/- 0.6 % (before ROSC), about 13 mmHg. The "15 +/- 4, n = 35" figure that research/26 T3 #4 and the arrest-etco2 test comment give to Garnett 1987 is Sanders 1989. Falk JL, Rackow EC, Weil MH. N Engl J Med 1988;318:607-611, PMID 3125432 (abstract): 13 arrests in 10 ventilated ICU patients; "The end-tidal carbon dioxide concentration decreased from a mean (+/- SD) of 1.4 +/- 0.9 to 0.4 +/- 0.4 percent after the onset of cardiac arrest. During precordial compression, it increased to 1.0 +/- 0.5 percent." The abstract gives NO time for the fall; the "over one minute" in research/26 T3 comes from a secondary summary (UNVERIFIED). Note the pre-arrest baseline: 1.4 % = about 10.6 mmHg, not 35.
- **Band vs source:** No. R39-2 is a MEAN over minutes 1-10 of CPR; the test applies its floor to the 2-min point, where the rig is still in the post-arrest dip. Early human values during compressions sit at 7.6 (Falk), about 13 (Garnett) and 15 +/- 4 in those resuscitated (Sanders).
- **Better evidence:** research/26 T3: adequate CPR 10-20 mmHg; research/09 §2 recommended band for the 10-min mean 16-24. (grade A (three human series, abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: >= 10 mmHg (10-20) at +2 min; keep 17-23 (or research/09 16-24) only for the 1-10 min mean (Sanders 1989 PMID 2761035; Falk 1988 PMID 3125432; Garnett 1987 PMID 3098993; research/26 T3)
- **Likely not a miss:** yes (15.9 inside 10-20)

<a id="row-19"></a>

#### 19. `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts:192` — Asphyxial PEA still shows organised electrical activity 6-10 min after the arrest
- **Band / stated source:** > 0 ECG beats in the 6-10 min post-arrest window of an asphyxial PEA — R50 review finding 1, orchestrator ruling 2026-09-27 (DeBehnke 1995, Varvarousi 2011 cited for the onset bands)
- **Measured:** 0 beats (the FU-4 F5 decay reached asystole first; decay hazard mean 420 s [ENG])
- **Source verification:** DeBehnke DJ et al. Resuscitation 1995;30:169-175, PMID 8560107 (abstract; 169 dogs, asphyxial PEA): "Following loss of aortic fluctuations by thoracic aortic catheter, animals remained in pulseless electrical activity for up to 20 min." "Loss of aortic fluctuations occurred 11.4 +/- 2.4 min following clamping. Following loss of aortic fluctuations, the heart rate steadily decreased." Same preparation: DeBehnke 1995 Acad Emerg Med, PMID 8597913: "75 dogs remained in untreated PEA for 10 minutes"; DeBehnke 1994 Crit Care Med, PMID 7988137: "All animals remained in untreated pulseless electrical activity for 10 mins". Dhanani S et al. Crit Care Med 2014;42:2358-2369, PMID 24810533 (abstract, withdrawal of life support): "In nearly all patients (27 of 30), electrocardiogram activity continued after the disappearance of arterial blood pressure." Dhanani S et al. N Engl J Med 2021;384:345-352, PMID 33503343 (abstract, n = 631): "The last QRS complex coincided with the last arterial pulse in 19% of the patients."
- **Band vs source:** Yes. Same mechanism (asphyxia -> bradycardic PEA), and the canine preparation keeps PEA for 10-20 min with a falling rate; humans dying after withdrawal of ventilation keep ECG activity after the pulse in 81-90 %.
- **Better evidence:** DeBehnke canine data (PEA up to 20 min) and DCD waveform cohorts. The engine decay constant (mean 420 s from the idioventricular phase) is the outlier, not the band. (grade B (canine n = 169; human DCD cohorts for direction))
- **Verdict: RIGHT** · proposed: keep (DeBehnke 1995 PMID 8560107; Dhanani 2014 PMID 24810533; Dhanani 2021 PMID 33503343)
- **Likely not a miss:** no (0 beats; the PEA decay constant is too fast for asphyxial PEA)

<a id="row-20"></a>

#### 20. `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts:216` — Monitor shows the hypoxic bradycardia before the arrest: monitor HR < 45 in the minute before
- **Band / stated source:** min monitor HR < 45/min in the minute before the asphyxial arrest (sinus state 30) — G-FU3 ruling 1 / FU-4 Task 13 (display must show the rhythm state)
- **Measured:** min 58 (sinus 30 + junctional escapes add; Task 13b not landed)
- **Source verification:** DeBehnke DJ et al. Resuscitation 1995;30:169-175, PMID 8560107 (abstract; 169 dogs, asphyxial PEA): "Following loss of aortic fluctuations by thoracic aortic catheter, animals remained in pulseless electrical activity for up to 20 min." "Loss of aortic fluctuations occurred 11.4 +/- 2.4 min following clamping. Following loss of aortic fluctuations, the heart rate steadily decreased." Same preparation: DeBehnke 1995 Acad Emerg Med, PMID 8597913: "75 dogs remained in untreated PEA for 10 minutes"; DeBehnke 1994 Crit Care Med, PMID 7988137: "All animals remained in untreated pulseless electrical activity for 10 mins". (heart rate "steadily decreased until loss of aortic fluctuations").
- **Band vs source:** Yes. It is a display-equals-state check: the rhythm state is 30/min, so a monitor reading 58 is wrong whatever the physiology. Direction (bradycardia before PEA) matches DeBehnke and research/26 T5 (#7).
- **Better evidence:** - (grade B (canine; internal consistency))
- **Verdict: RIGHT** · proposed: keep (but see escape-reset rows: with a 40/min junctional escape the expected monitor HR is 40-48, so < 45 can fail on a correct escape rhythm; consider < 50) (DeBehnke 1995 PMID 8560107; research/26 T5)
- **Likely not a miss:** no (58)

<a id="row-21"></a>

#### 21. `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts:134` — ROSC rig: continuous CPR CoPP inside Paradis 15-25 throughout (CPR + 2 L + adrenaline)
- **Band / stated source:** CoPP 15-25 mmHg at every circ event from CPR +5 s to ROSC — Paradis 1990 (>= 15); <= 25 added by FU-4 F1
- **Measured:** -0.4 to 36.6 mmHg (near 0 while the 2 L arrive over 180 s; 29-36 with adrenaline)
- **Source verification:** Paradis NA et al. JAMA 1990;263:1106-1113, PMID 2386557 (abstract): 100 human arrests, CPP = aortic minus RA relaxation-phase gradient. "Initial CPP (mean +/- SD) was 1.6 +/- 8.5 mm Hg in patients without ROSC and 13.4 +/- 8.5 mm Hg in those with ROSC. The maximal CPP measured was 8.4 +/- 10.0 mm Hg in those without ROSC and 25.6 +/- 7.7 mm Hg in those with ROSC." "Only patients with maximal CPPs of 15 mm Hg or more had ROSC" and "A CPP above 15 mm Hg did not guarantee ROSC".
- **Band vs source:** No. Paradis gives a ROSC threshold (max CPP >= 15) and group means, not a range: 25.6 +/- 7.7 is the MEAN maximal CPP of the ROSC group, so 25 is not a ceiling (mean + 2 SD = 41). The abstract does not say whether the maximal CPP followed adrenaline (standard ACLS then included it; UNVERIFIED), so an adrenaline-raised CoPP is not outside his data. "Throughout" also forbids the near-zero CoPP of an exsanguinated thorax before the volume arrives, which is expected (Chalkias 2020: Pmsf about 4 mmHg after a 61 % bleed, PMID 32506874).
- **Better evidence:** Paradis 1990 as read correctly; DeBehnke 1996 (dogs, asphyxial PEA, CPR + adrenaline): best mean CPP 16 +/- 14, PMID 8808374. (grade A (human, n = 100, abstract))
- **Verdict: MIS-SPECIFIED** · proposed: max CoPP before ROSC >= 15; CoPP <= 41 (Paradis ROSC-group max mean + 2 SD) once the volume is in; no floor during the fill phase (Paradis 1990 PMID 2386557; Chalkias 2020 PMID 32506874)
- **Likely not a miss:** yes (max 36.6: >= 15 and <= 41; the -0.4 minimum falls in the fill phase)

<a id="row-22"></a>

#### 22. `packages/engine-core/test/engine/circ-manual-ischaemia.test.ts:16` — MANUAL 90/52 in the 75 y HTN profile: no ischaemic spiral (kIsch > 0.9), LVEDP < 18
- **Band / stated source:** kIsch > 0.9 throughout and mean LVEDP < 18 in the last 2 min — FU-3 item 4; Forrester et al. NEJM 1976 (PCWP 18 = congestion)
- **Measured:** kIsch 0.200 (floor), LVEDP 46.1
- **Source verification:** Forrester JS et al. N Engl J Med 1976;295:1404-1413, PMID 790194: no abstract in PubMed; the 18-mmHg subset boundary is textbook (UNVERIFIED here). Coexist 8e ch. 6 (aortic stenosis, chapter PDF p. 6) lists "Avoid hypotension" for AS, not for HTN alone. No source was found for a CPP-to-ischaemia threshold in a hypertensive heart with normal coronaries.
- **Band vs source:** Partly. No ischaemia at 90/52 in a hypertensive heart with normal coronaries is the expected picture (the profile has no CAD, CFR 3.5 in tables §3). LVEDP < 18 is the right congestion line, but the comment gives this profile a RESTING LVEDP of 20, so the band asks for a value below the patient's own baseline; that only holds if the pressure fall comes through vasodilation (as under GA), not through the tracker's Emax cut.
- **Better evidence:** - (grade C (textbook direction))
- **Verdict: RIGHT** · proposed: keep kIsch > 0.9; state the LVEDP side as "<= baseline LVEDP (20) and < 25" or re-base the profile's resting LVEDP (Forrester 1976 PMID 790194 (unverified); tables §3 CFR)
- **Likely not a miss:** no (0.200 / 46.1)

<a id="row-23"></a>

#### 23. `packages/engine-core/test/engine/circ-sanity-2.test.ts:52` — R23: AS + CAD propofol -> hypotension -> ischaemia (kIsch < 0.85) -> phenylephrine reverses (> 0.95)
- **Band / stated source:** mean kIsch < 0.85 at 110-145 s after propofol 1.5 mg/kg; S/D < 1 at some point; kIsch > 0.95 within 3 min of phenylephrine 100 microg — R23 (owner scenario); tables §3 worked example (DBP 45, LVEDP 25, CPP 25, r 0.78) [ENG]
- **Measured:** 96/56, LVEDP 12, CPP 45, S/D 1.00, kIsch 0.93-0.94; phenylephrine -> 146/86, kIsch 0.98 (rescue half passes)
- **Source verification:** Coexist 8e ch. 6 (valvular heart disease, chapter PDF p. 6): "Hypotension should ideally be prevented or at least treated promptly with an α-adrenergic vasoconstrictor such as phenylephrine." The tables' trajectory (LVEDP rising to 25 after propofol) is tagged [ENG]; no source was found for it.
- **Band vs source:** Partly. The direction (hypotension in severe AS + CAD causes ischaemia; phenylephrine is the treatment) is textbook. The numbers are not: the band asserts ischaemia as an outcome while the tables premise (LVEDP 18 -> 25) runs against propofol's venodilation, which lowers preload, so the engine reaches DBP 56 and CPP 45 instead of 45/25. A band on the outcome cannot tell a wrong ischaemia model from a shallower insult.
- **Better evidence:** - (grade C (textbook direction only))
- **Verdict: MIS-SPECIFIED** · proposed: condition the assertion on the insult: kIsch < 0.85 within 2 min WHEN CPP <= 30 (or DBP <= 45) in the CFR 1.4 profile, with the rig deepened to get there (propofol 2 mg/kg or a MAP target); keep the phenylephrine half (Coexist 8e ch. 6; tables §3 worked example [ENG])
- **Likely not a miss:** uncertain (kIsch 0.93 at CPP 45 may be right; the rig never reaches the tables' insult)

<a id="row-24"></a>

#### 24. `packages/engine-core/test/engine/circ-sanity-2.test.ts:61` — R23: the same run rescued with ephedrine 10 mg keeps the deficit (kIsch < 0.95 at +3 min)
- **Band / stated source:** mean kIsch < 0.95 at 170-210 s after ephedrine 10 mg — R23 "reversed by phenylephrine and not by ephedrine"; tables §3 rescue B (~0.85) [ENG]
- **Measured:** kIsch 0.96-0.97, S/D 1.08 at +90 s (phenylephrine 1.61)
- **Source verification:** Coexist 8e ch. 6 (chapter PDF p. 6): "With tachycardia, the decrease in diastolic filling time will result in inadequate oxygen delivery to the hypertrophied left ventricle." No source quantifies ephedrine's effect on ischaemia in AS.
- **Band vs source:** Partly. Preferring an α-agonist and avoiding tachycardia in AS is textbook; "ephedrine leaves kIsch < 0.95 at 3 min" is the tables' own arithmetic and depends on the spiral of the row above existing first.
- **Better evidence:** - (grade C (textbook direction))
- **Verdict: UNSUPPORTED** · proposed: an ordering, not a level: after the same insult, phenylephrine restores S/D and kIsch faster than ephedrine, and ephedrine raises HR >= 10/min (Coexist 8e ch. 6)
- **Likely not a miss:** partly (the ordering already holds: S/D 1.08 vs 1.61 at +90 s, HR +13)

<a id="row-25"></a>

#### 25. `packages/engine-core/test/engine/clinical-suite.test.ts:222` — S13 VF + standard-quality CPR (q 0.8, no adrenaline): continuous CoPP 15-25 mmHg
- **Band / stated source:** CoPP 15-25 mmHg over CPR minutes 1-5 (q 0.8, 110/min, no drug) — Paradis 1990
- **Measured:** 24.9-28.0 mmHg after FU-8 A19 (25.1-28.8 before)
- **Source verification:** Paradis NA et al. JAMA 1990;263:1106-1113, PMID 2386557 (abstract): 100 human arrests, CPP = aortic minus RA relaxation-phase gradient. "Initial CPP (mean +/- SD) was 1.6 +/- 8.5 mm Hg in patients without ROSC and 13.4 +/- 8.5 mm Hg in those with ROSC. The maximal CPP measured was 8.4 +/- 10.0 mm Hg in those without ROSC and 25.6 +/- 7.7 mm Hg in those with ROSC." "Only patients with maximal CPPs of 15 mm Hg or more had ROSC" and "A CPP above 15 mm Hg did not guarantee ROSC".
- **Band vs source:** No. As in the circ-lowflow-arrest row: 15 is Paradis's ROSC threshold for the MAXIMAL CPP and 25.6 is the ROSC group's mean maximum, not an upper limit. For CPR without adrenaline the nearest Paradis figure is the INITIAL CPP, 13.4 +/- 8.5 in patients who got ROSC (mean + 2 SD = 30) and 1.6 +/- 8.5 in those who did not.
- **Better evidence:** Paradis 1990 read correctly; Kern 2007 chapter (CoPP correlates with myocardial flow and defibrillation success). (grade A (human, n = 100, abstract))
- **Verdict: MIS-SPECIFIED** · proposed: 10-30 mmHg for a salvageable patient on CPR without a vasopressor (>= 15 kept as the ROSC threshold, not as a range edge) (Paradis 1990 PMID 2386557)
- **Likely not a miss:** yes (24.9-28.0 inside 10-30)

<a id="row-26"></a>

#### 26. `packages/engine-core/test/engine/clinical-suite.test.ts:286` — CPR + 2 L + adrenaline 1 mg after full exsanguination (3 L): a pulse within 4 min of the first compression
- **Band / stated source:** pulse <= 240 s after CPR start (2 L balanced over 300 s, adrenaline 1 mg) — none: "the executor's own measured expectation from ruling 3, not a sourced band" (E-FU4-19, test comment)
- **Measured:** no pulse in 10 min after G-FU4-1 (was +105 s)
- **Source verification:** Chalkias A et al. Acute Crit Care 2020;35:93-101, PMID 32506874 (abstract, 10 piglets): "The mean volume of blood removed was 860+/-20 ml (blood loss, ~61%) ... all animals developed pulseless electrical activity"; "All animals achieved return of spontaneous circulation (ROSC), with mean time to ROSC being 6.1+/-1.7 minutes and mean administered volume being 394+/-20 ml", "with goal-directed fluid resuscitation and no vasopressors". Whether chest compressions ran during the resuscitation phase is not stated in the abstract. Miller 10e ch. 82 (p. 2622, chapter PDF p. 7): "In the trauma patient, hypovolemia, cardiac tamponade, and tension pneumothorax are possible causes of cardiac arrest and must be considered and acutely treated."
- **Band vs source:** No source (the test says so). The one controlled analogue found (61 % bleed-out to PEA, about 46 % of the shed volume returned as crystalloid) restores a pulse in all animals, but at 6.1 +/- 1.7 min, so 4 min is too tight while "no pulse in 10 min" is outside the evidence too.
- **Better evidence:** Chalkias 2020 piglets: ROSC 100 %, 6.1 +/- 1.7 min (mean + 2 SD = 9.5 min). (grade B (piglets, n = 10, abstract))
- **Verdict: TOO NARROW** · proposed: a pulse within 10 min of starting volume (3-10 min); no pulse without volume (the passing CPR-alone row) (Chalkias 2020 PMID 32506874)
- **Likely not a miss:** no (no pulse in 10 min)

<a id="row-27"></a>

#### 27. `packages/engine-core/test/engine/clinical-suite.test.ts:311` — 10 min of VF with standard CPR alone: the myocardium stays ischaemic, kIsch < 0.9 throughout
- **Band / stated source:** max kIsch < 0.9 over 10 min of VF + CPR q 0.8 (unventilated rig) — Weisfeldt & Becker 2002
- **Measured:** max 1.00 after G-FU6-2 (0.89 after FU-8 A19; 0.91 before)
- **Source verification:** Weisfeldt ML, Becker LB. JAMA 2002;288:3035-3038, PMID 12479769: no abstract in PubMed, so the three-phase model is cited from research/03 §VF and research/20 DV-01c only (UNVERIFIED here). Kern KB, Niemann JT, Steen S. Coronary perfusion pressure during cardiopulmonary resuscitation. In: Cardiac Arrest: The Science and Practice of Resuscitation Medicine, Cambridge UP 2007, pp. 369-388, doi:10.1017/CBO9780511544828.020 (chapter abstract): "standard anteroposterior chest compressions can, at best, provide 30% to 40% of normal cerebral blood flow levels"; "Myocardial blood flow achieved with external chest compressions is often even lower, typically between 10% and 30% of normal." Miller 10e ch. 82 p. 2617: cardiac output during CPR "at best 25% to 30%".
- **Band vs source:** Yes in direction. kIsch = 1 - gIsch x deficit (tables §3); with myocardial flow at 10-30 % of normal against a fibrillating demand the deficit is 0.7-0.9, so a contractility factor near 1.0 under CPR alone contradicts the flow data. The 0.9 line itself is [ENG].
- **Better evidence:** Kern 2007 (myocardial flow 10-30 % of normal under external compressions). (grade B (animal-derived chapter consensus))
- **Verdict: RIGHT** · proposed: keep (< 0.9); a mean < 0.7 would also be supported (Kern 2007 doi:10.1017/CBO9780511544828.020; Miller 10e p. 2617)
- **Likely not a miss:** no (1.00)

<a id="row-28"></a>

#### 28. `packages/engine-core/test/engine/cpr-etco2.test.ts:28` — Quality map at 10/min: q 0.5 -> 12 (8-15), 0.8 -> 20 (17-23), 1.0 -> 25 (22-28), 1.2 -> 29 (26-32)
- **Band / stated source:** four EtCO2 points +/- 3 mmHg (mean of minutes 1-10, BVM 10 x 500, FiO2 1) — R39-2 (research/09 §2)
- **Measured:** 20.5 / 25.2 / 26.6 / 26.6 mmHg after FU-8
- **Source verification:** Sheak KR et al. Resuscitation 2015;89:149-154, PMID 25643651 (abstract): "For every 10mm increase in depth, ETCO2 was elevated by 1.4mmHg"; "For every 10 breaths/min increase in ventilation rate, ETCO2 was lowered by 3.0mmHg"; case-averaged "34.5+/-4.5 vs 23.1+/-12.9mmHg" (ROSC vs none). Murphy RA et al. Prehosp Emerg Care 2016;20:369-377, PMID 26830353 (abstract): depth +10 mm "associated with a 4.0% increase in EtCO2"; the authors call the depth/rate effects "statistically significant but clinically modest". Sanders AB, Kern KB, Otto CW, Milander MM, Ewy GA. JAMA 1989;262:1347-1351, PMID 2761035 (abstract): 35 arrests in 34 patients; resuscitated "had higher average end-tidal carbon dioxide partial pressures during cardiopulmonary resuscitation than 26 patients who could not be resuscitated (15 +/- 4 vs 7 +/- 5 mm Hg)". Garnett AR et al. JAMA 1987;257:512-515, PMID 3098993 (abstract): 23 patients, mechanical (Thumper) CPR at constant ventilation, EtCO2 1.8 % +/- 0.9 % (no ROSC) and 1.7 % +/- 0.6 % (before ROSC), about 13 mmHg. The "15 +/- 4, n = 35" figure that research/26 T3 #4 and the arrest-etco2 test comment give to Garnett 1987 is Sanders 1989.
- **Band vs source:** Partly. The 0.8 and 1.0 points sit inside the cohort range (about 15-25 in all-comers, 23-35 in modern cohorts). The 0.5 and 1.2 points are interpolations made for teaching (research/09: "must cross the < 10 improve-CPR threshold"); the observed depth effect (+1.4 mmHg or +4 % per cm) predicts a much flatter map. research/09 itself recommended 16-24 for the 0.8 point; the test narrowed it to 17-23.
- **Better evidence:** Sheak 2015 and Murphy 2016: quality has a modest effect within the real range; the slope is unsourced. (grade A (human observational, n = 583 and 230, abstracts))
- **Verdict: UNSUPPORTED** · proposed: 0.8 -> 15-26; 1.0 -> 20-30; monotone, with q 1.0 at least 3 mmHg above q 0.5; q 0.5 -> 10-20; q 1.2 -> 22-35 (Berve 29 +/- 17, research/09) (Sheak 2015 PMID 25643651; Murphy 2016 PMID 26830353; Sanders 1989 PMID 2761035; research/09 §2)
- **Likely not a miss:** partly (0.8, 1.0 and 1.2 inside; the q 0.5 to 1.0 rise of 6.1 passes; q 0.5 at 20.5 just above 20)

<a id="row-29"></a>

#### 29. `packages/engine-core/test/engine/cpr-etco2.test.ts:44` — Ventilation: +10 breaths/min lowers CPR EtCO2 by about 3 mmHg (-2 to -4.5)
- **Band / stated source:** EtCO2(20/min) - EtCO2(10/min) in -4.5 to -2 mmHg at q 0.8 — R39-2 (Sheak 2015, Murphy 2016 via research/09)
- **Measured:** -4.8 mmHg (from about 25.2 at 10/min: -19 %)
- **Source verification:** Sheak 2015 PMID 25643651: "For every 10 breaths/min increase in ventilation rate, ETCO2 was lowered by 3.0mmHg". Murphy 2016 PMID 26830353: "a 10 breath/minute increase in ventilation rate with a 17.4% decrease in EtCO2".
- **Band vs source:** Partly. Both sources are between-epoch regressions in observational cohorts; one is absolute (-3.0 at the cohort level, about 23-34 mmHg), the other relative (-17.4 %). The absolute band was set for a 20-mmHg baseline; the engine baseline is 25.2, where -17.4 % is -4.4. Physiologically, doubling VA at a fixed low pulmonary flow should lower alveolar PCO2 more in the short term, so the regressions are a floor rather than a ceiling.
- **Better evidence:** Murphy 2016 relative effect. (grade A (human observational, abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: relative: -10 % to -25 % per +10 breaths/min (Murphy 2016 PMID 26830353; Sheak 2015 PMID 25643651)
- **Likely not a miss:** yes (-19 % inside -10 to -25 %)

<a id="row-30"></a>

#### 30. `packages/engine-core/test/engine/fu8-coronary.test.ts:37` — Healthy 40 y, AF 150/min for 20 min: kIsch >= 0.9 throughout
- **Band / stated source:** min kIsch >= 0.9 over 20 min (10-s samples) — research/19 CM-15c quiet band (ESC AF 2020: tachycardia cardiomyopathy takes weeks)
- **Measured:** min 0.89 (sinus 150 holds 1.00; beat-to-beat variance, R50 F9)
- **Source verification:** research/19 CM-15c gives no numeric source for 0.9 ("quiet: AF at 150/min in a heart with normal coronaries causes no global ischaemic contractility loss"). Rivera S et al. PACE 2014;37:1100-1105, PMID 24697871 (abstract): ST depression in SVT tracks retrograde P waves, "not necessarily rate dependent", so rate-related ST change in a normal heart is not proof of ischaemia.
- **Band vs source:** Partly. "No meaningful ischaemia in a normal heart at 150/min" is right; a 0.9 floor on the MINIMUM of a variable driven by AF's beat-to-beat filling variance is an [ENG] choice, and 0.89 vs 0.90 is inside that variance.
- **Better evidence:** - (grade C (direction; consensus))
- **Verdict: UNSUPPORTED** · proposed: mean kIsch >= 0.95 over the 20 min and min >= 0.85, no arrest [ENG] (research/19 CM-15c; Rivera 2014 PMID 24697871 (direction))
- **Likely not a miss:** yes (min 0.89; mean not reported but sinus 150 holds 1.00)

<a id="row-31"></a>

#### 31. `packages/engine-core/test/engine/fu8-cpr-brain.test.ts:55` — VF + CPR q 1: cerebral blood flow 0.30-0.40 of normal
- **Band / stated source:** mean cbfRel 0.30-0.40 over CPR minutes 1-8 — "Meaney 2013 consensus [VERIFY]"; research/20 DV-02a band 0.2-0.45
- **Measured:** 0.45
- **Source verification:** Meaney PA et al. Circulation 2013;128:417-435, PMID 23801105 (abstract): no flow figure ("5 critical components of high-quality CPR"), so the [VERIFY] citation fails. The 30-40 % figure is Kern 2007: Kern KB, Niemann JT, Steen S. Coronary perfusion pressure during cardiopulmonary resuscitation. In: Cardiac Arrest: The Science and Practice of Resuscitation Medicine, Cambridge UP 2007, pp. 369-388, doi:10.1017/CBO9780511544828.020 (chapter abstract): "standard anteroposterior chest compressions can, at best, provide 30% to 40% of normal cerebral blood flow levels"; "Myocardial blood flow achieved with external chest compressions is often even lower, typically between 10% and 30% of normal."
- **Band vs source:** Partly. Wrong source; the right source gives 30-40 % as the BEST case ("at best") of standard compressions, not a typical range. A q 1 (guideline-perfect) rig at the ceiling is defensible; a floor of 0.30 is not sourced.
- **Better evidence:** Kern 2007 chapter. research/20 DV-02a's 0.2-0.45 had added 0.05 above the ceiling. (grade B (animal-derived chapter consensus))
- **Verdict: MIS-SPECIFIED** · proposed: 0.20-0.40 at q 1 (ceiling 0.40); cite Kern 2007, not Meaney 2013 (Kern 2007 doi:10.1017/CBO9780511544828.020)
- **Likely not a miss:** no (0.45 above the 0.40 ceiling)

<a id="row-32"></a>

#### 32. `packages/engine-core/test/engine/resp-child-rest.test.ts:57` — CPR (q 1, 110/min): the adult's coRatio in 0.25-0.33
- **Band / stated source:** CPR compression flow / own resting flow 0.25-0.33 (adult, q 1) — FU-6 / FU-8 A22 restatement ("CPR delivers about 25-33 % of this patient's own resting flow"); research/20 DV-02a (AHA 2020 ALS physiology; Meaney 2013)
- **Measured:** 0.363 (FU-8 A22 CPR flow; was 0.293)
- **Source verification:** Miller 10e ch. 82 p. 2617: "Cardiac output during CPR with effective, uninterrupted chest compression is at best 25% to 30% of the normal spontaneous circulation."; p. 2626: "manual compressions provide only approximately 30% of normal cardiac output, at best."
- **Band vs source:** Yes. Quality 1 is guideline-perfect CPR, and the textbook gives 25-30 % "at best", so 0.33 is already a generous ceiling. The child sharing the same fraction is an extrapolation (no paediatric figure found).
- **Better evidence:** - (grade C (textbook consensus, two statements in Miller 10e))
- **Verdict: RIGHT** · proposed: keep 0.25-0.33 at q 1 (a lower quality should scale below 0.25) (Miller 10e ch. 82 pp. 2617, 2626)
- **Likely not a miss:** no (0.363 above the "at best" 30 %)

<a id="row-33"></a>

#### 33. `packages/engine-core/test/engine/tension-ptx.test.ts:75` — Decompression at +4 min on PPV: MAP >= 65 within 1 min; pleural pressure drains with PTX_DRAIN_TAU_S
- **Band / stated source:** MAP >= 65 within 60 s of decompression; pPtx at +tau within 0.8-1.2 x e^-1 of its value at decompression — audit S8 ("decompression is immediate"); Leigh-Smith & Harris 2005; ATLS 10th
- **Measured:** no MAP: the rig is in PEA from +3.87 min, before the decompression (FU-6 R9 triggering); origin/main reached MAP >= 65 at +5 s
- **Source verification:** Hatch Q et al. J Trauma Acute Care Surg 2014;77:170-175, PMID 24977774 (abstract, 5 swine, 30 tension episodes and 27 tension-induced PEA): "Mean arterial pressure, cardiac output, central venous pressure, and pulmonary capillary wedge pressure all returned to baseline within 1 minute of trocar placement. Adequate perfusion was restored in 100% of tension-induced PEA cases within 30 seconds of trocar placement." Leigh-Smith & Harris not re-opened here (UNVERIFIED).
- **Band vs source:** Yes for the haemodynamic half, and it extends to the case the rig now produces: in swine even tension-induced PEA regains perfusion within 30 s of an effective decompression. The PTX_DRAIN_TAU_S half is an [ENG] self-consistency check.
- **Better evidence:** Hatch 2014 (swine; trocar, not needle; needle decompression failed more often in the same model). (grade B (swine, n = 5 animals, 57 episodes))
- **Verdict: RIGHT** · proposed: keep; add the PEA case explicitly: decompression of a tension-PEA restores a pulse within 30-60 s (no CPR needed in the swine model). The rig conflict (PEA band 3-10 min vs decompression at +4 min) is a test-design problem, not a band problem (Hatch 2014 PMID 24977774)
- **Likely not a miss:** no (no MAP within 60 s, although Hatch says even a tension-PEA should recover)

<a id="row-34"></a>

#### 34. `packages/engine-core/test/l2/ecg/s5/escape-reset.test.ts:29` — Sinus 30 + a 40/min junctional focus -> 40 QRS/min (escape rhythm, AV dissociation)
- **Band / stated source:** QRS rate 40 +/- 2 per min — orchestrator ruling 5 / review F7 (E-FU4-11)
- **Measured:** 60 QRS/min (30 sinus + 30 junctional: the P after each escape captures)
- **Source verification:** No source was cited by the ruling. Escape-capture bigeminy (junctional escape followed by a conducted sinus capture, every cycle) is a published ECG entity: Nair K et al. Heart Rhythm 2012;9:1681-1688, PMID 22710484 (abstract: "junctional escape ventricular capture bigeminy"); Manne JRR. Oxf Med Case Reports 2018, PMID 29868180 ("an interesting and rare arrhythmia known as Escape-capture bigeminy"); Reddy Manne & Garg, HeartRhythm Case Rep 2021, PMID 34712571 (hyperkalaemia).
- **Band vs source:** Partly. Timing (PR 0.16 s): escape at 1.66 s, next sinus P at 2.0 s, i.e. 0.34 s after the junctional discharge. Whether that P conducts depends on the concealed AV-nodal refractoriness left by the escape (ERP of the order of 0.3-0.45 s; [TXT] general, not sourced here). If it is blocked every other cycle, captures alternate and the rate is about 45/min; if it is always blocked and retrograde conduction resets the sinus node, 40; if it always conducts, escape-capture bigeminy at 60. "40 +/- 2" is only the complete-dissociation case.
- **Better evidence:** Escape-capture bigeminy case literature (rare); the common teaching picture is an escape rhythm with AV dissociation and occasional captures. (grade C (ECG case literature + conduction arithmetic))
- **Verdict: TOO NARROW** · proposed: 40-48 QRS/min, junctional beats >= 50 % of QRS, captures allowed (they must come early, after a P falling outside the refractory period) (Nair 2012 PMID 22710484; Manne 2018 PMID 29868180; arithmetic above)
- **Likely not a miss:** no (60; the engine never blocks the post-escape P, so it always shows the rare bigeminy)

<a id="row-35"></a>

#### 35. `packages/engine-core/test/l2/ecg/s5/escape-reset.test.ts:33` — Never the sum: sinus 30 + a 40/min focus stays below 45 QRS/min
- **Band / stated source:** QRS rate < 45 per min — orchestrator ruling 5 / review F7
- **Measured:** 60
- **Source verification:** As the row above: escape-capture bigeminy (Nair 2012 PMID 22710484; Manne 2018 PMID 29868180) produces exactly the "sum" pattern (one escape plus one capture per sinus cycle = 2 x sinus rate).
- **Band vs source:** No. "Never the sum" is stated as a law, but the sum (escape-capture bigeminy) is a recognised, if rare, rhythm. The threshold 45 also cuts through the expected alternating-capture case (about 45/min).
- **Better evidence:** - (grade C (ECG case literature))
- **Verdict: MIS-SPECIFIED** · proposed: < 49 for the default (teaching) conduction setting, i.e. most post-escape sinus P waves blocked; model escape-capture bigeminy as an explicit variant, not as the default (Nair 2012 PMID 22710484; Manne 2018 PMID 29868180)
- **Likely not a miss:** no (60)

<a id="row-36"></a>

#### 36. `packages/engine-core/test/l2/gas/co2.test.ts:53` — Low flow (CO 29 %, normal VA): EtCO2 held at 10-20 mmHg over 1-3 min
- **Band / stated source:** EtCO2 10-20 at 1, 2 and 3 min with coRatio 0.29 and the resting VA (unit model) — research 03 §4.4 ("With CPR (CO about 20-30% of normal), EtCO2 settles at 10-20 mmHg")
- **Measured:** 26.0 / 21.8 / 20.4 at 1 / 2 / 3 min with tau 70 s (title value; this unit model predates the FU-7.1 washout, so it may be stale: measured not re-run)
- **Source verification:** Sanders AB, Kern KB, Otto CW, Milander MM, Ewy GA. JAMA 1989;262:1347-1351, PMID 2761035 (abstract): 35 arrests in 34 patients; resuscitated "had higher average end-tidal carbon dioxide partial pressures during cardiopulmonary resuscitation than 26 patients who could not be resuscitated (15 +/- 4 vs 7 +/- 5 mm Hg)". Garnett AR et al. JAMA 1987;257:512-515, PMID 3098993 (abstract): 23 patients, mechanical (Thumper) CPR at constant ventilation, EtCO2 1.8 % +/- 0.9 % (no ROSC) and 1.7 % +/- 0.6 % (before ROSC), about 13 mmHg. The "15 +/- 4, n = 35" figure that research/26 T3 #4 and the arrest-etco2 test comment give to Garnett 1987 is Sanders 1989. Falk JL, Rackow EC, Weil MH. N Engl J Med 1988;318:607-611, PMID 3125432 (abstract): 13 arrests in 10 ventilated ICU patients; "The end-tidal carbon dioxide concentration decreased from a mean (+/- SD) of 1.4 +/- 0.9 to 0.4 +/- 0.4 percent after the onset of cardiac arrest. During precordial compression, it increased to 1.0 +/- 0.5 percent." The abstract gives NO time for the fall; the "over one minute" in research/26 T3 comes from a secondary summary (UNVERIFIED). Note the pre-arrest baseline: 1.4 % = about 10.6 mmHg, not 35. (1.0 +/- 0.5 % = 7.6 mmHg during compressions).
- **Band vs source:** Yes. CO about 30 % at an unchanged (normal) VA is the setting of Falk and Garnett (ventilation held constant); human values during CPR in the first minutes sit at 7.6-15 mmHg. The early value should FALL then recover as venous CO2 builds (research 03 §4.4), not start high and decline as measured.
- **Better evidence:** Sheak 2015 modern cohorts run higher (23-35 case-averaged), but at lower VA and over longer CPR. (grade A (human series, abstracts))
- **Verdict: RIGHT** · proposed: keep 10-20 for minutes 1-3 (Sanders 1989 PMID 2761035; Falk 1988 PMID 3125432; Garnett 1987 PMID 3098993)
- **Likely not a miss:** uncertain (title values from the pre-washout model)

<a id="row-37"></a>

#### 37. `packages/engine-core/test/l2/gas/co2.test.ts:64` — Low flow: arrest (CO 0) < 5 mmHg within 30 s (unit model)
- **Band / stated source:** EtCO2 < 5 mmHg at 30 s with CO 0 and the resting VA — research 03 §4.4 / Stage 3 acceptance 4; "superseded by the orchestrator's 2026-09-28 update" (title), re-instated by the owner ruling 2026-10-07
- **Measured:** 24.2 at 30 s, 4.8 at 150 s with tau 70 s (title value; pre-washout model, may be stale)
- **Source verification:** Falk JL, Rackow EC, Weil MH. N Engl J Med 1988;318:607-611, PMID 3125432 (abstract): 13 arrests in 10 ventilated ICU patients; "The end-tidal carbon dioxide concentration decreased from a mean (+/- SD) of 1.4 +/- 0.9 to 0.4 +/- 0.4 percent after the onset of cardiac arrest. During precordial compression, it increased to 1.0 +/- 0.5 percent." The abstract gives NO time for the fall; the "over one minute" in research/26 T3 comes from a secondary summary (UNVERIFIED). Note the pre-arrest baseline: 1.4 % = about 10.6 mmHg, not 35. Washout arithmetic ([ENG] derivation, not a measurement): with flow stopped and ventilation continuing, each breath dilutes alveolar CO2 by about VA_breath/(FRC + VT) = 450/(2400 + 450), about 16 %; 6 breaths at 12/min give 0.84^6 = 0.35, so 35 mmHg falls to about 12 mmHg at 30 s and to about 4 mmHg at 60 s (the engine comment gives the same tau, V_alv/VA about 24-36 s). "< 5 at 30 s" needs tau <= 15 s.
- **Band vs source:** No, as for arrest-etco2:55: the 30-s point has no source, and the alveolar washout at resting VA cannot reach < 5 mmHg in 30 s.
- **Better evidence:** - (grade C (physics derivation; Falk A for the end point))
- **Verdict: MIS-SPECIFIED** · proposed: <= 6 mmHg at 60 s; 7-15 at 30 s if a 30-s point is kept (Falk 1988 PMID 3125432; washout derivation)
- **Likely not a miss:** uncertain (24.2 is outside 7-15, but it was measured on the tau-70 s model; the engine rig now reads 9.3 at 30 s)

<a id="row-38"></a>

#### 38. `docs/validation/calibration-queue.md (validation scenario g3-cpr-etco2)` — g3-cpr-etco2/cpr/etco2
- **Band / stated source:** mean displayed EtCO2 17.0-23.0 over scenario 120-240 s (CPR from 40 s, default quality; the scenario issues NO ventilation command, packages/validation/suites/gates/gate-docs.ts:56-58) — R39-2: default quality 0.8 -> about 20 mmHg
- **Measured:** 16.3
- **Source verification:** research/09 §2 recommended defaults: "EtCO2 at learner default, 10 breaths/min, first 10 min" = 20 mmHg with test band 16-24 (read in the repo copy). Sanders AB, Kern KB, Otto CW, Milander MM, Ewy GA. JAMA 1989;262:1347-1351, PMID 2761035 (abstract): 35 arrests in 34 patients; resuscitated "had higher average end-tidal carbon dioxide partial pressures during cardiopulmonary resuscitation than 26 patients who could not be resuscitated (15 +/- 4 vs 7 +/- 5 mm Hg)". Garnett AR et al. JAMA 1987;257:512-515, PMID 3098993 (abstract): 23 patients, mechanical (Thumper) CPR at constant ventilation, EtCO2 1.8 % +/- 0.9 % (no ROSC) and 1.7 % +/- 0.6 % (before ROSC), about 13 mmHg. The "15 +/- 4, n = 35" figure that research/26 T3 #4 and the arrest-etco2 test comment give to Garnett 1987 is Sanders 1989.
- **Band vs source:** No. R39-2's figure is a mean over minutes 1-10 of CPR at 10 x 500; the scenario reads minutes 1.3-3.3 (the early dip) with no ventilation command at all (so EtCO2 depends on the spontaneous-drive gating of FU-6, not on a set 10 x 500), and narrows research/09's own 16-24 to 17-23.
- **Better evidence:** research/26 T3 adequate CPR 10-20; Sanders 15 +/- 4 (ROSC). (grade A (human series) / C (window choice))
- **Verdict: MIS-SPECIFIED** · proposed: for the 120-240 s window: 12-24 mmHg; or keep 16-24 and move the window to minutes 1-10 of CPR at 10 x 500 (research/09 §2; Sanders 1989 PMID 2761035; research/26 T3)
- **Likely not a miss:** yes (16.3 inside 12-24, and inside research/09's 16-24)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **Paradis CoPP "15–25" (circ-lowflow-arrest:134, clinical-suite:222 S13).** Paradis's 15 is the floor on the
   MAXIMAL CPP needed for ROSC, and 25.6 ± 7.7 is the ROSC group's mean maximum, not a ceiling. Without a drug the
   matching figure is the initial CPP of 13.4 ± 8.5. Proposed: 10–30 without a vasopressor; ≥ 15 maximum and ≤ 41 with
   adrenaline once the volume is in; no floor during the fill phase. Dependents: research/20 DV-02a (TS on cppQ1 27.2),
   the engine's CPP_ROSC = 15 (arrest.ts roscStep, correct as a threshold), the "≤ 25 added by F1" note, and plan D19.
   Both measured values (24.9–28.0; max 36.6) sit inside the corrected bands.
2. **No-flow EtCO2 "< 5 mmHg at 30 s" (arrest-etco2:55, co2:64; research 03 §4.4; BUILD-PLAN Stage 3 acceptance 4;
   research/26 T3; the owner ruling of 2026-10-07).** No source gives a 30-s value. The Falk abstract has no timing,
   and its baseline was about 10 mmHg. Washout physics puts 35 mmHg at about 8–15 mmHg at 30 s and ≤ 6 at 60 s.
   The passing ≤ 6 at 60 s (arrest-etco2:44) is the defensible target. Dependents: the alveolar-washout mechanism
   (engine 9.3 / 2.6 at 30 / 60 s, which is physically right), LOW_FLOW_TAU_S history, and research/26 T3's "grade A"
   label, which rests on a secondary reading of Falk.
3. **R39-2's CPR EtCO2 band used outside its definition (arrest-etco2:82, queue g3-cpr-etco2, and the quality map
   cpr-etco2:28).** 17–23 is a minutes 1–10 mean at 10 × 500. It is applied at +2 min and on a 1.3–3.3 min window with no
   ventilation command, and it narrows research/09's own 16–24. The q 0.5 and q 1.2 points are interpolations that are
   steeper than the observed depth effect (Sheak +1.4 mmHg/cm; Murphy +4 %/cm). Dependents: W22 ("CPR flow vs
   compression quality") and the FU-8 OQ2 ruling ("EtCO2 20–27 at any quality ≥ 0.5"). 15.9 and 16.3 sit inside the
   corrected bands.
4. **Exsanguination ROSC "within 4 min" (clinical-suite:286, E-FU4-19).** The test itself says it is unsourced. The
   one analogue found (Chalkias 2020, 61 % bleed-out → PEA, about 46 % of the shed volume back as crystalloid) gives
   ROSC in 10 of 10 at 6.1 ± 1.7 min. Proposed: within 10 min. The engine (no pulse in 10 min after G-FU4-1) is outside
   even the wider band, so this is a real miss. Dependents: the measurement row for Ali's question A-new (volume
   threshold), the viscosity term (FU-6 R11), and the circ-lowflow-arrest ROSC rows.
5. **CPR cerebral flow 0.30–0.40 (fu8-cpr-brain:55; research/20 DV-02a).** The source is wrong: Meaney 2013's abstract has no
   flow figure (its text only repeats 30–40 % from canine work; fix-citations 2026-10-11), and the right one is Kern, Niemann and Steen 2007, "at best 30 % to 40 %". Proposed: 0.20–0.40, with 0.40
   as a ceiling. 0.45 is still a miss.
6. **Escape rhythm "40 ± 2" and "never the sum < 45" (escape-reset:29, :33).** Escape-capture bigeminy (the sum) is a
   published ECG entity, and alternating captures give about 45/min. Proposed: 40–48 for the default conduction
   setting, with bigeminy as an explicit variant. Dependents: circ-hypoxic-arrest:216 (monitor HR < 45 in the minute
   before arrest: a correct escape rhythm with captures can read 45–48), Task 13b (not landed, since it stopped the
   hypoxic rig arresting), and E-FU4-11.
7. **CPR ventilation effect in absolute mmHg (cpr-etco2:44).** The band was built for a 20-mmHg baseline. As a relative
   effect (Murphy −17.4 % per +10/min) the engine's −19 % is inside it.
8. **AS + CAD ischaemia (circ-sanity-2:52, :61; R23; tables §3 worked example; NR-2; Q33).** The band asserts an
   outcome whose premise, LVEDP rising after propofol, is [ENG] and runs against propofol's preload reduction. Condition
   the assertion on the insult (CPP ≤ 30), and state the ephedrine side as an ordering. Dependents: tables §7 check 10
   and gate NR-2 options (a)–(c).
9. **AF 150 kIsch ≥ 0.9 minimum (fu8-coronary:37; CM-15c).** The direction is right. A floor on the minimum of a
   variance-driven signal is [ENG]: use a mean ≥ 0.95 and a minimum ≥ 0.85.

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
EtCO2 9.3 at +30 s with no flow (arrest-etco2:55); 15.9 at +2 min of CPR (arrest-etco2:82); queue g3 at 16.3; S13 CoPP
24.9–28.0; ROSC-rig CoPP max 36.6 (the −0.4 minimum falls in the fill phase); the ventilation effect −4.8 (−19 %); AF 150
kIsch minimum 0.89. Partly: the quality map (0.8, 1.0 and 1.2 inside the proposed bands; q 0.5 at 20.5 just above 20)
and the ephedrine ordering, which already holds (S/D 1.08 vs 1.61). Still real misses against bands that are RIGHT or
corrected: the asphyxial PEA decay (0 beats at 6–10 min), monitor HR 58, CPR kIsch 1.00, adult CPR coRatio 0.363, CPR
CBF 0.45, exsanguination with no pulse in 10 min, the tension pneumothorax with no recovery after decompression, the
escape rhythm at 60, and the MANUAL 90/52 spiral (kIsch 0.200, LVEDP 46).

**(c) Items with no source.** The exsanguination "pulse within 4 min" (self-declared executor expectation). The
30-s point of the no-flow EtCO2 (research 03 §4.4 is [ENG, anchored] with no reference for 30 s). The "≤ 25" ceiling
added to Paradis by FU-4 F1. The q 0.5 → 12 and q 1.2 → 29 points of the R39-2 map (interpolations). The AS + CAD
trajectory numbers (tables §3 worked example, [ENG]). The ephedrine "kIsch < 0.95 at 3 min". The AF 150 0.9 floor
(CM-15c). The escape-rhythm 40 ± 2 and < 45 (ruling 5, no reference). The PEA decay hazard mean of 420 s [ENG], which
is not a band but is the constant the asphyxial-PEA row contradicts. Citation errors to fix: Meaney 2013 → Kern 2007
(CBF), and Garnett 1987 → Sanders 1989 (15 ± 4 mmHg, n = 35) in research/26 T3 #4 and in the arrest-etco2.test.ts
header comment.

## Circulation (B): haemodynamics, obstruction, shock and the validation scenarios

32 rows: 16 known-miss assertions in the circulation tests (tamponade, PE, haemorrhage + propofol, PEEP → CVP, post-PVC beat, pneumoperitoneum, check 18, septic shock, neonatal CO, MANUAL floor) and 16 calibration-queue rows (brief §4.9 / tables §7 scenarios and the Pulse oracle). Verdicts: 10 MIS-SPECIFIED, 10 UNSUPPORTED, 6 TOO NARROW, 6 RIGHT. The main pattern is ATLS. Every haemorrhage HR band (class II 100–120, III 120–140, IV 140–180, t17a 120–140) copies the 2008 ATLS table. Registry data from 16,000–36,000 patients (Mutschler 2013 ×2, Guly 2010/2011) show HR barely rises across shock classes: base-deficit class IV mean HR 97, with "no relevant tachycardia" in any group. Physiology adds a relative-bradycardia phase beyond ~30 % loss. These bands are MIS-SPECIFIED, and the engine's 82/107/134/98 bpm sit inside the evidence. The second pattern is setting mismatches: the warm-sepsis CO/SVR are post-resuscitation values asserted on an unresuscitated patient; the t12 "mPAP" band is checked on the systolic channel; and Joris's −20 % CI is a head-up value asserted on a supine rig. The third is that the post-PVC band reverses its source: potentiation is small in normal hearts and large in failing ones (Sinnecker 2014, Voss 2002), and it is measured as amplitude, not SBP. All seven Pulse-oracle rows are UNSUPPORTED as physiological targets: Pulse is a model, the O2 arms are not volume-matched, and in O1 our MANUAL values are the set targets. 17 of 32 measured values already sit inside the evidence band. Real misses that remain: propofol MAP fall (s3/O4, ~−9 % vs −15 to −30 %), pulsus 3.1 mmHg, neonatal CO 89 mL/kg/min, t12 PA systolic 24, PEEP → CVP 4.8 mmHg (just above the evidence), haemorrhage + propofol arrest, and the post-PVC beat. Abstracts were read through PubMed E-utilities, Mutschler 2013 Table 2 through PMC BioC, and textbook pages from local Dellinger 5e, Miller 10e and Coexist 8e PDFs. Not opened: Spodick 2003 full text, McIntyre-Sasahara 1971 (no abstract), the ATLS 10th-edition Table 3.1, Barash's tamponade page, and PMC10651705; these are marked UNVERIFIED where cited.

### Rows

<a id="row-39"></a>

#### 39. `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts:50` — MANUAL CVP 6 ventilated: PEEP 5 -> 15 raises the displayed CVP by 30-50 % of the 10 cmH2O step (2.2-3.7 mmHg)
- **Band / stated source:** dCVP 2.2-3.7 mmHg (0.30-0.50 x 7.36 mmHg) — brief §4.9 "effective RAP up by 30-50 % of the mean-airway-pressure change" [ENG]; tables H10 "CVP +2-3" [ENG]; tables §2.2 tIt 0.4 (Q28)
- **Measured:** 4.82 mmHg (T_IT 0.65)
- **Source verification:** Zhonghua Nei Ke Za Zhi 2021;60:960-964, PMID 34689516 (abstract, 70 ventilated patients): PEEP 5 -> 15 raised CVP by 3.75 (IQR 3.00-4.63) mmHg with a high chest-wall/respiratory-system elastance ratio and 3.00 (1.63-4.00) mmHg with a low one; Physiol Meas 2022;43(8), PMID 35882221 (62 cardiac-surgery patients): PEEP 0 -> 10, closed chest, CVP +2.33 +/- 1.13 (lower baseline CVP: 2.64 +/- 0.9); Shojaee M et al. Emerg (Tehran) 2017;5:e1, PMID 28286808: PEEP 5 -> 10 raised CVP 1.57 +/- 1.07 (0 -> 5: 2.47 +/- 1.53) cmH2O
- **Band vs source:** Partly. The centre is right (median transmission ~0.40-0.51 of a 10 cmH2O step), but the band stops at 3.7 mmHg. That is below the high-elastance median (3.75), so about half of normal-to-stiff-chest-wall patients fall outside it. Mean-airway-pressure change ~ PEEP change: same quantity.
- **Better evidence:** Transmission rises with chest-wall/respiratory-system elastance (Ecw/Ers, r ~0.3), falls with high baseline CVP and with TR, and is lower per cmH2O at higher baseline PEEP (Shojaee). One band for a CVP-6 normal-lung patient: 2.0-4.6 mmHg. (grade A (three human cohorts, n 60-70, abstracts))
- **Verdict: TOO NARROW** · proposed: dCVP 2.0-4.6 mmHg for PEEP 5 -> 15 (0.27-0.63 of the step); keep tIt 0.4 as the centre (PMID 34689516; PMID 35882221; PMID 28286808)
- **Likely not a miss:** no (4.82 sits just above the high-elastance upper quartile 4.63; T_IT 0.65 is the obese/IAH value of tables §2.2)

<a id="row-40"></a>

#### 40. `packages/engine-core/test/engine/circ-pulsus.test.ts:34` — severe tamponade, spontaneous breathing: pulsus paradoxus >= 10 mmHg (Spodick 2003)
- **Band / stated source:** beat-to-beat SBP swing (max - min over 6 s windows, last 2 min) >= 10 mmHg — Spodick DH, NEJM 2003;349:684-690 [P]
- **Measured:** 3.1 mmHg (healthy 2.4)
- **Source verification:** Spodick 2003 PMID 12917306: review, no abstract, full text not opened (UNVERIFIED for its wording). Dellinger 5e ch. 25 p. 347: pulsus paradoxus is "defined by convention as a greater than 10 mm Hg decrease in systolic pressure"; p. 354: "Severe tamponade is associated with tachycardia, shock, profound pulsus paradoxus". Reddy 1978 PMID 668074: in 14 tamponade patients the inspiratory arterial pulse pressure rose from 45 +/- 29 to 81 +/- 23 mmHg after drainage.
- **Band vs source:** Yes. Conventional threshold, severe tamponade, spontaneous breathing. Measuring max-min SBP over a 6 s window (about one breath at RR 12) is an acceptable proxy for the inspiratory fall.
- **Better evidence:** Pulsus may be absent with LV hypertrophy/raised LVEDP, ASD, AR, low-pressure tamponade or PPV (Dellinger 5e ch. 25 p. 350, Box). None of these applies to this rig. (grade C (textbook consensus + human catheter data))
- **Verdict: RIGHT** · proposed: keep (>= 10 mmHg) (Dellinger 5e ch. 25 pp. 347, 354; Reddy 1978 PMID 668074)
- **Likely not a miss:** no (3.1 mmHg is a real miss: ventricular interdependence is too weak)

<a id="row-41"></a>

#### 41. `packages/engine-core/test/engine/clinical-suite.test.ts:124` — S4b severe tamponade + propofol 1 mg/kg: MAP < 55 within 3 min and CO -25 %
- **Band / stated source:** MAP nadir < 55 and CO nadir <= 0.75 x pre-dose within 180 s — audit S4 proposal; Q2 (no paper or page)
- **Measured:** MAP 50.5, CO -21 %
- **Source verification:** No quantitative source found. Qualitative: Coexist 8e ch. 11 p. 239: "general anesthesia and positive pressure ventilation in the presence of a hemodynamically significant cardiac tamponade can result in lifethreatening hypotension". Miller 10e ch. 62 p. 2009 (hypovolaemia, same mechanism): hypotension "will develop ... with the administration of any anesthetic because of interruption of compensatory sympathetic outflow".
- **Band vs source:** Direction yes; the 55 mmHg / 25 % magnitudes have no source. Human induction-in-tamponade series with numbers were not found; the CO fall in a fixed-SV tamponade depends mainly on the HR and venous-tone fall, which the band does not specify.
- **Better evidence:** Reference point only: in normal hearts propofol 2 mg/kg leaves CO unchanged (Claeys 1988, PMID 3257393), so any CO fall here is tamponade-specific; no human number exists for it. (grade D (expert opinion; no human data))
- **Verdict: UNSUPPORTED** · proposed: keep MAP < 55 as a teaching floor (owner ruling); CO fall: direction-only (CO falls more than in the same dose without tamponade) unless a source is found (Coexist 8e ch. 11 p. 239; Miller 10e ch. 62 p. 2009)
- **Likely not a miss:** partly (MAP 50.5 meets the MAP half; CO -21 % misses an unsourced -25 %)

<a id="row-42"></a>

#### 42. `packages/engine-core/test/engine/clinical-suite.test.ts:132` — S5 severe tamponade, PEEP 5 -> 10: CO -20 % and MAP fall >= 10 mmHg more than in a healthy patient
- **Band / stated source:** CO nadir <= 0.80 x pre and (dMAP tamponade - dMAP healthy) >= 10 mmHg — Barash (no chapter/page); Q2
- **Measured:** CO x0.88; dMAP 4.1 vs 1.5 (difference 2.6)
- **Source verification:** Mattila I et al. Acta Anaesthesiol Scand 1984;28:236-240, PMID 6730888 (7 dogs, tamponade 20 mmHg): PEEP at RR 12 "produced additional, significant falls in cardiac output and systemic arterial pressure" (magnitudes not in abstract); Moller CT et al. Br J Anaesth 1979;51:409-415, PMID 109108 (baboons): CO "significantly greater during spontaneous ventilation than during intermittent positive pressure ventilation with or without positive end-expiratory pressure". Barash page not located: UNVERIFIED.
- **Band vs source:** Direction yes (animal); the -20 % and the >= 10 mmHg excess have no located source. PEEP 5 -> 10 is a small step; in a healthy patient it moves MAP ~1-2 mmHg, so a 10 mmHg excess needs a large tamponade-specific effect.
- **Better evidence:** Coexist 8e ch. 11 p. 242: avoid PPV and minimise PEEP in tamponade (qualitative). (grade B (consistent animal data, direction only))
- **Verdict: UNSUPPORTED** · proposed: direction-only: tamponade CO fall >= 2 x the healthy CO fall and MAP fall > healthy MAP fall for the same PEEP step; magnitude to the owner (Mattila 1984 PMID 6730888; Moller 1979 PMID 109108; Coexist 8e ch. 11 pp. 239, 242)
- **Likely not a miss:** uncertain (direction already met: CO -12 %, dMAP 4.1 vs 1.5; magnitude unsourced)

<a id="row-43"></a>

#### 43. `packages/engine-core/test/engine/clinical-suite.test.ts:161` — S6a class III haemorrhage (1.5 L / 10 min) + propofol 2 mg/kg: MAP falls 40-60 % to a nadir of 30-50 over 1-3 min
- **Band / stated source:** nadir 30-50 mmHg and fall 40-60 % within 180 s — the expected picture (Ali's Q1, item 19); test title cites Johnson 2003, ATLS for the sibling
- **Measured:** nadir 2.7 (-97 %) with an arrest at +90 s
- **Source verification:** Johnson KB et al. Anesthesiology 2003;99:409-420, PMID 12883414 (abstract): swine bled 30 mL/kg, propofol INFUSION 200 microg/kg/min; reports PK (slower intercompartmental clearance) and a 2.7-fold lower BIS Ce50; no MAP-after-bolus data. Miller 10e ch. 62 p. 2009: young patients "can lose up to 40% of their blood volume before experiencing a decrease in blood pressure, thereby leading to potentially catastrophic circulatory collapse with induction of anesthesia".
- **Band vs source:** No source gives the magnitude. Johnson 2003 is a PK/PD swine infusion study, not a bolus haemodynamic one. Miller supports collapse as the expected direction but gives no numbers.
- **Better evidence:** INTUBE (Russotto 2021, cited in the test comment) gives peri-intubation arrest 3.1 % in critically ill patients: arrest is possible but not typical (not re-opened here). (grade D (owner's clinical picture; no human data))
- **Verdict: UNSUPPORTED** · proposed: keep as the owner's teaching picture (R45), tagged [ENG/owner]; no evidence to narrow or widen it (Miller 10e ch. 62 p. 2009; Johnson 2003 PMID 12883414 (PK/PD only))
- **Likely not a miss:** no (nadir 2.7 with an arrest is outside any plausible reading)

<a id="row-44"></a>

#### 44. `packages/engine-core/test/engine/clinical-suite.test.ts:198` — S9 massive PE (one command, ventilated FiO2 0.5): CVP >= 15 and MAP < 65 at 5 min
- **Band / stated source:** CVP >= 15 mmHg and MAP < 65 mmHg (mean of 360-420 s) — Q15; tables H5 "RA 12-20; SBP < 90" (McIntyre-Sasahara 1971; R03 §4.3); tables §7 12 "CVP +8-12"
- **Measured:** CVP 9.3, MAP 82.1
- **Source verification:** Miller GA, Sutton GC. Br Heart J 1970;32:518-523, PMID 5433313 (abstract, 23 massive PE without prior disease): "PA systolic pressure 38.4+/-6.8 mm. Hg", "RVED 11.5+/-4.9 mm. Hg", SaO2 86.4 +/- 11.2 %; Dellinger 5e ch. 42 p. 673: obstruction must be 75 % or more "to cause a mean PA pressure of 40 mm Hg or higher"; "Right atrial pressure (RAP) elevation occurs when the mean PA pressure is 30 mm Hg or higher and obstruction exceeds 35% to 40%" (citing McIntyre-Sasahara 1971, PMID 5155756, no abstract); Dellinger 5e ch. 42 (PE treatment section): massive PE is "acute PE associated with hypotension (e.g., systolic blood pressure <90 mm Hg)"
- **Band vs source:** Partly. CVP >= 15 sits about one SD above the only per-patient massive-PE mean found (RVEDP 11.5 +/- 4.9), so it excludes about 3 in 4 such patients. The tables' own H5 floor is 12, and §7 12 says +8-12 above baseline. MAP < 65 is a proxy for the guideline's SBP < 90; in a low-SV state with a narrow pulse pressure, SBP < 90 does not imply MAP < 65.
- **Better evidence:** CVP >= 10 (or >= +5 above baseline) catches the massive-PE population; hypotension should be asserted as SBP < 90. (grade B (one human catheter series, n 23; textbook consensus))
- **Verdict: TOO NARROW** · proposed: CVP >= 10 mmHg (or >= baseline + 5) and SBP < 90 (MAP < 65 optional) (Miller & Sutton 1970 PMID 5433313; Dellinger 5e ch. 42 p. 673; tables H5)
- **Likely not a miss:** no (CVP 9.3 just under 10; MAP 82.1 at 5 min is a real miss of the hypotension criterion)

<a id="row-45"></a>

#### 45. `packages/engine-core/test/engine/clinical-suite.test.ts:340` — MANUAL target 18/10 mmHg: displayed arterial pressure reaches <= 25/15
- **Band / stated source:** displayed SBP <= 25 and DBP <= 15 at 180-240 s — brief §4.9 M2 (pressure targets are met physically); monitor audit T4; Q9
- **Measured:** floored by the tracker (monitor audit T4: 65/30); exact value not in title
- **Source verification:** Design requirement, not a physiological claim. Brief §4.9 M2: a per-beat tracker makes "site SBP/DBP converge on the targets". Arterial lines do display such pressures (pseudo-PEA, low-flow states).
- **Band vs source:** Yes: the band is the brief's own MANUAL contract with a +7/+5 mmHg tolerance; no physiology source needed.
- **Better evidence:** - (grade C (design contract))
- **Verdict: RIGHT** · proposed: keep (brief §4.9 M2)
- **Likely not a miss:** no (the tracker floor is a real defect)

<a id="row-46"></a>

#### 46. `packages/engine-core/test/engine/endo-circ-acceptance.test.ts:64` — septic shock warm phase (anaesthetised, ventilated, paralysed; no fluid): CO 7-9 L/min
- **Band / stated source:** CO 7-9 L/min at 58-60 min of the warm phase — tables §7 check 16; tables §5e column "Septic shock, warm (resuscitated)" [TXT]
- **Measured:** 5.0 L/min (4.9 at FU-4 and at the gate)
- **Source verification:** Dellinger 5e ch. 22 p. 293 (Table 22.1 footnote): "The hyperdynamic circulatory state (increased CO, decreased SVR) associated with distributive forms of shock usually depends on resuscitation with fluids; before such resuscitation, a hypodynamic circulation is typical"; ch. 24 p. 332: "after adequate volume resuscitation, most patients with severe sepsis have a high cardiac output and low systemic vascular resistance state"; ch. 22 p. 297: hypodynamic septic shock "can usually be converted to hyperdynamic shock (high CO) with adequate fluid resuscitation".
- **Band vs source:** No (setting). The tables' own column is 'warm (resuscitated)', and §7 16 lists '30 mL/kg fluid' as a later step. The test measures an unresuscitated patient with no fluid given, which is the hypodynamic/normodynamic state. A 7-9 L/min CO (CI ~4-5) is the post-resuscitation figure.
- **Better evidence:** Either give 30 mL/kg (Dellinger ch. 24 pp. 336-337, SSC) before reading the warm-phase CO, or set the unresuscitated band to CO 4-6.5 L/min. The 7-9 band itself was not traced to a paper (Parker/Parrillo not opened): numbers UNVERIFIED. (grade C (textbook consensus))
- **Verdict: MIS-SPECIFIED** · proposed: unresuscitated warm phase: CO 4-6.5 L/min; after 30 mL/kg crystalloid: CO 7-9 L/min (Dellinger 5e ch. 22 pp. 293, 297; ch. 24 pp. 332, 336-337; tables §5e)
- **Likely not a miss:** yes (5.0 L/min fits the unresuscitated state)

<a id="row-47"></a>

#### 47. `packages/engine-core/test/engine/endo-circ-acceptance.test.ts:68` — septic shock warm phase (no fluid): SVR 500-700 dyn·s/cm5
- **Band / stated source:** SVR 500-700 dyn·s·cm-5 — tables §7 check 16; tables §5e WK_R0 x0.4-0.55 "(SVR 500-700 dyn)" [TXT] (SepticCM; Hyperdyn-Pmsf)
- **Measured:** 861 (792 with FU-4, 767 at the gate)
- **Source verification:** Same as endo-circ-acceptance.test.ts:64 (Dellinger 5e ch. 22 p. 293; ch. 24 p. 332).
- **Band vs source:** No (setting): SVR 500-700 is the resuscitated hyperdynamic value. Before fluid, a low CO with baroreflex vasoconstriction gives a higher computed SVR, even with vasoplegia.
- **Better evidence:** The SVR the formula reports is downstream of CO. In a no-fluid arm, a calculated SVR of 700-1000 is consistent with vasoplegia (the MAP 55-60 band passes). (grade C (textbook consensus))
- **Verdict: MIS-SPECIFIED** · proposed: unresuscitated: SVR 700-1000; after 30 mL/kg: SVR 500-700 (pair with the CO row) (Dellinger 5e ch. 22 p. 293; ch. 24 p. 332)
- **Likely not a miss:** yes (861 fits the unresuscitated state)

<a id="row-48"></a>

#### 48. `packages/engine-core/test/engine/fu8-body-size.test.ts:46` — term neonate 3.5 kg: cardiac output >= 150 mL/kg/min (PALS ~ 200)
- **Band / stated source:** CO >= 150 mL/kg/min at 600 s — PALS (no page); plan 'Waiting on Ali' (isometric §2.2 scaling)
- **Measured:** 0.31 L/min = 89 mL/kg/min
- **Source verification:** Popat H, Kluckow M. Neonatology 2012;101:166-171, PMID 22024714 (abstract, 21 healthy term infants, first 4 h): "LVO 193 ml/kg/min, RVO 216 ml/kg/min" (medians); Kluckow M, Evans N. Arch Dis Child 2000;82:F182, PMID 10794783: term SVC flow 76 -> 93 mL/kg/min day 1 -> 2 (upper-body return only). A PALS number was not located: UNVERIFIED attribution.
- **Band vs source:** Yes (number) / No (attribution). >= 150 is below the term median LVO of 193 and is a reasonable floor. Early LVO includes ductal shunt, so systemic output may be somewhat lower. The 'PALS' citation should be replaced.
- **Better evidence:** - (grade B (small human echo cohort, consistent with textbook 150-250))
- **Verdict: RIGHT** · proposed: keep >= 150 mL/kg/min (cite Popat & Kluckow 2012 instead of PALS) (Popat & Kluckow 2012 PMID 22024714)
- **Likely not a miss:** no (89 mL/kg/min is a real miss)

<a id="row-49"></a>

#### 49. `packages/engine-core/test/engine/fu9-iap.test.ts:29` — IAP 14 under GA (supine, ventilated): CO -10-30 % at +15 min (SP-08a, Joris 1993)
- **Band / stated source:** CO change <= -10 % at +15 min (title band -10-30 %) — Joris 1993; research/21 SP-08a; research/13 H5; R-FU9-8
- **Measured:** 0.0 %
- **Source verification:** Joris JL et al. Anesth Analg 1993;76:1067-1071, PMID 8484509 (abstract, 15 ASA I, isoflurane, 10° HEAD-UP, IAP 14): "Peritoneal insufflation resulted in a significant increase (+/- 35%) of mean arterial pressure, a significant reduction (+/- 20%) of CI"; measured at 5, 15 and 30 min, and "particularly at the induction of pneumoperitoneum". Odeberg S et al. Acta Anaesthesiol Scand 1994;38:276-283, PMID 8023669 (abstract, 11 patients, propofol-fentanyl, IAP 11-13): horizontal insufflation raised PCWP 32 %, CVP 58 %, MAP 39 %; "PP causes signs of elevated preload and afterload"; CI change truncated in the abstract.
- **Band vs source:** Partly. Joris's -20 % is head-up tilt plus insufflation, measured earliest at 5 min and partly offset later by isoflurane. The rig (helpers/fu9.ts GA_VENT) is supine. Odeberg's supine data show preload RISING, which argues against a fixed -10 % floor at +15 min. The robust signals in both studies are MAP +35-39 % and SVR +65 %.
- **Better evidence:** Assert the afterload signature (MAP +20-40 %, SVR +40-70 %) as the primary band. Set supine CO at 0 to -25 % (allowing no change); with head-up tilt, about -20 %. (grade B (two small human catheter studies))
- **Verdict: MIS-SPECIFIED** · proposed: supine IAP 12-14: CO 0 to -25 % at 5-15 min, plus MAP +20-40 % and SVR +40-70 % (research/23 R-18) (Joris 1993 PMID 8484509; Odeberg 1994 PMID 8023669; research/23 R-18)
- **Likely not a miss:** partly (0.0 % sits at the edge of the corrected CO band; the missing MAP/SVR rise is the real miss)

<a id="row-50"></a>

#### 50. `packages/engine-core/test/engine/hemo-acceptance.test.ts:122` — post-PVC potentiation: next-beat SBP +8-15 mmHg on average over isolated PVCs
- **Band / stated source:** mean post-PVC SBP minus mean of the 3 preceding sinus SBPs: +8 to +15 mmHg (healthy 40 y heart, HR 75, coupling 65 %) — brief §4.8 "beat after a PVC 1.1-1.3 (SBP about +12)"; research/03 §1/§8.3 "SBP +~12 mmHg in controls vs +5 in poor-LV patients" citing JAHA 2015
- **Measured:** -10.9 mmHg (seed 5)
- **Source verification:** The cited JAHA paper is Sinnecker D et al. J Am Heart Assoc 2014;3:e000857, PMID 24895163 (abstract, 941 post-MI patients): PESP "is typically enhanced in heart failure (HF) patients"; PESP (pulse-amplitude ratio > 1) present in only 62/220 patients with measurable VPCs. Voss A et al. J Physiol 2002;538:271-278, PMID 11773334: post-extrasystolic amplitude potentiation "48.7 +/- 32.6 vs. 9.8 +/- 5.4 %" (dilated cardiomyopathy vs controls). Billet S et al. Heart Rhythm 2019;16:853-860, PMID 30550835: post-PVC SBP >= 5 mmHg above the preceding sinus beat in 14 +/- 10 % of PVCs in controls vs 41 +/- 28 % in PVC-cardiomyopathy.
- **Band vs source:** No. The source says the opposite of research/03's paraphrase: potentiation is SMALL in normal hearts and LARGE in failing ones. It measures pulse-wave AMPLITUDE (~ +10 % in controls, i.e. about +4-5 mmHg of a 45 mmHg PP), not SBP. In controls the post-PVC SBP is >= +5 above the prior beat for only ~1 PVC in 7.
- **Better evidence:** For a normal heart: pulse-amplitude ratio 1.0-1.2 and mean SBP change about -5 to +5 mmHg. Use >= +30 % amplitude for the HFrEF/DCM profile (Voss). Measure PP or amplitude, not SBP alone: the compensatory-pause run-off lowers DBP. (grade B (small human cohorts, consistent))
- **Verdict: MIS-SPECIFIED** · proposed: normal heart: post-PVC pulse-pressure ratio 1.0-1.2 (SBP change -5 to +5 mmHg); HFrEF profile: ratio >= 1.3 (Voss 2002 PMID 11773334; Billet 2019 PMID 30550835; Sinnecker 2014 PMID 24895163)
- **Likely not a miss:** no (-10.9 SBP is below even the corrected range; PP not measured, so uncertain whether the amplitude is right)

<a id="row-51"></a>

#### 51. `packages/engine-core/test/engine/obstructive-aliases.test.ts:77` — one-command massive PE at 3 min: CVP >= 15 mmHg
- **Band / stated source:** CVP >= 15 mmHg at 3 min — tables H5 "RA 12-20" (McIntyre-Sasahara 1971); §7 12 "CVP +8-12"; Q15
- **Measured:** 11.5 mmHg
- **Source verification:** Same as clinical-suite.test.ts:198 (Miller GA, Sutton GC. Br Heart J 1970;32:518-523, PMID 5433313 (abstract, 23 massive PE without prior disease): "PA systolic pressure 38.4+/-6.8 mm. Hg", "RVED 11.5+/-4.9 mm. Hg", SaO2 86.4 +/- 11.2 %; Dellinger 5e ch. 42 p. 673).
- **Band vs source:** Partly: >= 15 is above the massive-PE mean (11.5 +/- 4.9) and above the tables' own H5 floor of 12.
- **Better evidence:** As clinical-suite.test.ts:198. (grade B)
- **Verdict: TOO NARROW** · proposed: CVP >= 10 mmHg (or >= baseline + 5) (Miller & Sutton 1970 PMID 5433313; tables H5)
- **Likely not a miss:** yes (11.5)

<a id="row-52"></a>

#### 52. `packages/engine-core/test/engine/obstructive-aliases.test.ts:80` — one-command massive PE at 3 min: MAP < 65 mmHg
- **Band / stated source:** MAP < 65 at 3 min — tables H5 "SBP < 90"; Q15 (MAP < 65 not in the tables)
- **Measured:** 78.4 mmHg (SBP 84.6, which passes the sibling SBP < 90 test)
- **Source verification:** Dellinger 5e ch. 42: massive PE "associated with hypotension (e.g., systolic blood pressure <90 mm Hg)"; tables H5 "SBP < 90".
- **Band vs source:** No. The source criterion is SBP < 90, already asserted (and passing) in the sibling it. MAP < 65 adds a stricter threshold that assumes a normal pulse pressure. SBP 84.6 with MAP 78.4 implies a very narrow pulse pressure (~9 mmHg if MAP = DBP + PP/3; worth a separate engine check), but the hypotension criterion is met.
- **Better evidence:** Keep SBP < 90 as the massive-PE marker; check PP (should narrow, but probably not to single digits). (grade C (definition))
- **Verdict: MIS-SPECIFIED** · proposed: drop MAP < 65, or replace it with SBP < 90 (already present); add a PP plausibility check (Dellinger 5e ch. 42; tables H5)
- **Likely not a miss:** yes (SBP 84.6 meets the sourced criterion)

<a id="row-53"></a>

#### 53. `packages/engine-core/test/engine/organs-htn.test.ts:65` — tables §7 check 18 through the engine (75 y HTN, MAP 65): hypocapnia PaCO2 25 -> CBF <= 40 % of the anaesthetised baseline
- **Band / stated source:** CBF ratio <= 0.40 (ceiling; the passing sibling asserts >= 0.35) — tables §7 check 18 (derived: 0.70 pressure term x C(25), kCO2 0.03)
- **Measured:** 0.4019 (0.394 before FU-7.1 B3)
- **Source verification:** Cross-reference: research/30 neuro section row 8 (brain/model.test.ts:136, same check 18): Miller 10e ch. 10 p. 189 (1-2 mL/100 g/min per mmHg, attenuated below PaCO2 25; Fig. 10.8A: hypocapnia 1.67 %/mmHg normotensive, 1.3 %/mmHg with < 33 % hypotension); p. 190 attenuation under propofol. Not re-opened here.
- **Band vs source:** No: a 5-point band from the tables' own arithmetic. The neuro section derived 0.28-0.56 from Miller and proposed 0.35-0.55.
- **Better evidence:** As neuro row 8. (grade C (textbook))
- **Verdict: TOO NARROW** · proposed: 0.35-0.55 of the anaesthetised baseline (aligned with the neuro section's proposal for check 18) (Miller 10e ch. 10 pp. 189-190, Fig. 10.8 (via research/30 neuro row 8))
- **Likely not a miss:** yes (0.4019)

<a id="row-54"></a>

#### 54. `packages/engine-core/test/engine/organs-htn.test.ts:77` — restoring PaCO2 35 and MAP ~80 (premise 77-84): CBF > 80 % of the anaesthetised baseline
- **Band / stated source:** premise MAP 77-84; CBF ratio > 0.80 — tables §7 check 18 (derived; prototype 0.81)
- **Measured:** MAP 86.6 (premise missed), CBF 0.891
- **Source verification:** Derived. With Miller 10e ch. 10 p. 189 slopes (1.3-1.67 %/mmHg), PaCO2 35 vs the 38 baseline gives a CO2 term of ~0.95-0.96. With the tables' right-shifted lower limit (cbfLL 75, CVP ~12, so CPP ~68 at MAP 80), the pressure term is ~0.85-1.0, giving a product of ~0.81-0.96. Not separately sourced.
- **Band vs source:** Yes, as a one-sided floor consistent with the textbook slopes. The it.fails trips on the MAP premise (86.6 > 84), not on the CBF band.
- **Better evidence:** Assert CBF against the MAP actually reached (or widen the premise) rather than gate the band on a rig window. (grade C (derived from textbook slopes))
- **Verdict: RIGHT** · proposed: keep CBF > 0.80; replace the 77-84 premise window with a check that CBF follows the reached MAP (Miller 10e ch. 10 p. 189 (via research/30 neuro row 8))
- **Likely not a miss:** yes (CBF 0.891 passes; only the rig premise fails)

<a id="row-55"></a>

#### 55. `docs/validation/calibration-queue.md (validation scenario s3-propofol-induction)` — s3-propofol-induction/2min/map-70pct
- **Band / stated source:** MAP = 0.70 x baseline (64.4) +/- 15 % = 54.7-74.1 (59-81 % of baseline) at 175-185 s — brief §4.9 check 3 "MAP about 70 % of baseline at 2 min"; research/03 §8.6 cites PMC10651705 and PMID 18063203
- **Measured:** 84.8 (92 % of baseline 92.0)
- **Source verification:** Claeys MA, Gepts E, Camu F. Br J Anaesth 1988;60:3-9, PMID 3257393 (abstract, 10 elderly, propofol 2 mg/kg, spontaneous breathing): SBP and DBP fell "28% and 19%" at 2 min (MAP ~ -22 %); "Cardiac output was not affected at any time nor were stroke volume and heart rate"; Grounds RM et al. Anaesthesia 1985;40:735-740, PMID 3876040: propofol induction gave a significant fall in arterial pressure and TPR, "There were no changes in heart rate". PMID 18063203 (Mizuno 2007) is a 7-patient curve-fitting study (fentanyl + propofol + sevoflurane); it gives no 70 % figure. PMC10651705 not opened: UNVERIFIED.
- **Band vs source:** Yes, roughly. Claeys's elderly 2 mg/kg data give MAP ~78 % of baseline at 2 min, inside 59-81 %. The 70 % centre sits at the deep end. Younger, unpremedicated adults usually fall less.
- **Better evidence:** MAP falls ~15-30 % at 2 min after 2-2.5 mg/kg in adults; more in the elderly and hypovolaemic. (grade B (small human haemodynamic studies))
- **Verdict: RIGHT** · proposed: keep (optionally re-centre to 65-85 % of baseline) (Claeys 1988 PMID 3257393; Grounds 1985 PMID 3876040)
- **Likely not a miss:** no (92 % of baseline is a real miss; it matches O4's small MAP fall)

<a id="row-56"></a>

#### 56. `docs/validation/calibration-queue.md (validation scenario s3-propofol-induction)` — s3-propofol-induction/2min/hr-little
- **Band / stated source:** HR < 1.1 x baseline (< 75.0) at 175-185 s — brief §4.9 check 3 "little HR rise"
- **Measured:** 79.9 (about +17 % over baseline)
- **Source verification:** Claeys MA, Gepts E, Camu F. Br J Anaesth 1988;60:3-9, PMID 3257393 (abstract, 10 elderly, propofol 2 mg/kg, spontaneous breathing): SBP and DBP fell "28% and 19%" at 2 min (MAP ~ -22 %); "Cardiac output was not affected at any time nor were stroke volume and heart rate"; Grounds RM et al. Anaesthesia 1985;40:735-740, PMID 3876040: propofol induction gave a significant fall in arterial pressure and TPR, "There were no changes in heart rate".
- **Band vs source:** Yes: both studies report no HR change after propofol induction; +10 % is a fair ceiling.
- **Better evidence:** - (grade B)
- **Verdict: RIGHT** · proposed: keep (Claeys 1988 PMID 3257393; Grounds 1985 PMID 3876040)
- **Likely not a miss:** no (+17 % is a real miss; possibly secondary to apnoea/hypercapnia in an unventilated rig, worth checking)

<a id="row-57"></a>

#### 57. `docs/validation/calibration-queue.md (validation scenario s2-class2-haemorrhage)` — s2-class2-haemorrhage/class2/hr
- **Band / stated source:** HR 100-120 at 660-900 s after 1000 mL / 10 min (20 % of 4.9 L) — brief §4.9 check 2 "ATLS class II (15-30 % loss): HR 100-120"; research/03 §8.5 (ATLS, Injury 2014)
- **Measured:** 81.6
- **Source verification:** ATLS 2008 (8th ed.) table as reproduced in PMC10241213 Table 1: HR <100 / 100-120 / 120-140 / >140, blood loss <15 / 15-30 / 30-40 / >40 %. The 10th-edition Table 3.1 (2018) was not opened: UNVERIFIED (secondary sources say it added base deficit and softened the HR column). Mutschler M et al. Crit Care 2013;17:R42, PMID 23497602 (PMC3672480 Table 2, 16,305 trauma patients by base-deficit class I-IV): HR at ED 86.3 (17.8) / 89.8 (20.3) / 95.9 (22.5) / 97.2 (32.4); SBP at ED 132.6 / 124.6 / 112.7 / 94.8; SI 0.68 / 0.76 / 0.93 / 1.17; text: "HR seemed unaltered within the four groups, and interestingly no group displayed a relevant tachycardia at all". Guly HR et al. Resuscitation 2011;82:556-559, PMID 21349628 (abstract, TARN): "The median HR rose from 82 beats per minute (BPM) in estimated class 1 shock to 95 BPM in estimated class 4 shock"; median SBP 135 -> 120. Mutschler M et al. Resuscitation 2013;84:309-313, PMID 22835498 (abstract, 36,504 patients): only 9.3 % matched the ATLS HR/SBP/GCS combination; grouped by SBP "there was no relevant tachycardia observed in any group". Miller 10e ch. 62 p. 2001: "classically taught shock classifications are commonly confounded by extremes of age and variations in physiologic reserve".
- **Band vs source:** No. The band faithfully copies the 2008 ATLS table, but large registries show the HR column does not describe patients: BD class II (mild shock) mean HR 89.8, and estimated class II-III HR in the 80s-90s. research/03 line 1102 already flags this. Registry caveats: analgesia, TBI, prehospital fluid. A clean awake bleed may raise HR somewhat more, but no human evidence supports a 100-120 floor at 20 % loss.
- **Better evidence:** Use the shock index and a relative HR rise: class II SI 0.6-1.0, HR baseline +0-25 (absolute ~75-110), SBP held (the sibling sbp-held and pp-narrow rows already pass). (grade A (registry n 16-36 k; consistent across two countries))
- **Verdict: MIS-SPECIFIED** · proposed: class II: HR baseline +0-25 bpm (~75-110), shock index 0.6-1.0, SBP >= 0.9 x baseline, PP narrowed (Mutschler 2013 Crit Care PMID 23497602 (Table 2); Guly 2011 PMID 21349628; Mutschler 2013 Resuscitation PMID 22835498)
- **Likely not a miss:** yes (81.6; SI ~0.75)

<a id="row-58"></a>

#### 58. `docs/validation/calibration-queue.md (validation scenario s4-class-iii)` — s4-class-iii/late/hr
- **Band / stated source:** HR 120-140 at 660-900 s after 1750 mL / 10 min (36 %) — brief §4.9 check 4 / ATLS class III
- **Measured:** 107 (SBP 98.4; SI ~1.09)
- **Source verification:** As s2-class2-haemorrhage/class2/hr (ATLS 2008 table; Mutschler 2013 Crit Care Table 2: BD class III HR 95.9 (22.5), SBP 112.7 (30.7), SI 0.93; Guly 2011; Schadt JC, Ludbrook J. Am J Physiol 1991;260:H305-318, PMID 1671735 (review, abstract): at ~30 % volume loss a second phase with "relative or absolute bradycardia" and a profound pressure fall; Demetriades D et al. J Trauma 1998;45:534-539, PMID 9751546: 28.9 % of hypotensive (SBP <= 90) trauma patients had HR <= 90).
- **Band vs source:** No: same reasons. In the registry, moderate shock had a mean HR of 96. Around 30 % loss the human response becomes biphasic (Schadt & Ludbrook), so a fixed tachycardia floor is not physiological.
- **Better evidence:** Class III: HR ~90-140 (about +15-60 over baseline) with SBP < 100 and SI 0.9-1.4; the sbp row (< 100) already passes. (grade A (registry) + B (physiology review))
- **Verdict: MIS-SPECIFIED** · proposed: class III: HR 90-140 (or baseline +15-60), SI 0.9-1.4, SBP < 100 (Mutschler 2013 PMID 23497602; Guly 2011 PMID 21349628; Schadt & Ludbrook 1991 PMID 1671735)
- **Likely not a miss:** yes (107; SI 1.09)

<a id="row-59"></a>

#### 59. `docs/validation/calibration-queue.md (validation scenario s4-class-iv)` — s4-class-iv/late/hr
- **Band / stated source:** HR 140-180 at 660-900 s after 2250 mL / 10 min (46 %) — brief §4.9 check 4 / ATLS class IV (HR > 140)
- **Measured:** 134 (SBP 73.2, PP 13.4; SI ~1.83)
- **Source verification:** As s4-class-iii (Mutschler 2013 Crit Care Table 2: BD class IV HR 97.2 (32.4), SBP 94.8 (40.4), SI 1.17; Schadt JC, Ludbrook J. Am J Physiol 1991;260:H305-318, PMID 1671735 (review, abstract): at ~30 % volume loss a second phase with "relative or absolute bradycardia" and a profound pressure fall; Demetriades D et al. J Trauma 1998;45:534-539, PMID 9751546: 28.9 % of hypotensive (SBP <= 90) trauma patients had HR <= 90; Mutschler 2013 Resuscitation: no relevant tachycardia in any SBP group).
- **Band vs source:** No. A 140-bpm floor at > 40 % loss contradicts the decompensation phase (relative or absolute bradycardia beyond ~30 %) and the registry. Both may be confounded (83 % intubated in BD class IV), but neither supports the 140 floor.
- **Better evidence:** Class IV should be asserted by SBP < 90, PP < 25 and SI >= 1.2 (the sbp and pp rows already pass). HR: either sustained tachycardia (>= 100) or a pre-terminal relative bradycardia; both are physiological. (grade A (registry) + B)
- **Verdict: MIS-SPECIFIED** · proposed: class IV: SBP < 90, PP < 25, SI >= 1.2; HR >= 100 OR relative bradycardia (no 140 floor) (Mutschler 2013 PMID 23497602; Schadt & Ludbrook 1991 PMID 1671735; Demetriades 1998 PMID 9751546)
- **Likely not a miss:** yes (134; SI 1.83)

<a id="row-60"></a>

#### 60. `docs/validation/calibration-queue.md (validation scenario t17a-class3-no-bb)` — t17a-class3-no-bb/late/hr
- **Band / stated source:** HR 120-140 at 900-1800 s after 1750 mL / 10 min (35 %), no beta-blocker — tables §7 17a "HR 120-140" (brief §8.5)
- **Measured:** 98.0
- **Source verification:** As s4-class-iii/late/hr (ATLS 2008; Mutschler 2013 Table 2; Guly 2011; Schadt & Ludbrook 1991).
- **Band vs source:** No: same bleed as s4-class-iii with the same ATLS-derived band, read later (15-30 min), when resetting and the humoral arm lower HR further.
- **Better evidence:** As s4-class-iii. Note that 17b's HR 80-95 under beta-blockade is then barely different from the evidence for the non-blocked patient. The 17a/17b contrast should be framed on SI and the pressure fall, not on an absolute HR. (grade A + B)
- **Verdict: MIS-SPECIFIED** · proposed: HR 90-140 (baseline +15-60), SI 0.9-1.4; frame 17a vs 17b as an HR difference >= 15 bpm (Mutschler 2013 PMID 23497602; Guly 2011 PMID 21349628; Schadt & Ludbrook 1991 PMID 1671735)
- **Likely not a miss:** yes (98)

<a id="row-61"></a>

#### 61. `docs/validation/calibration-queue.md (validation scenario t17a-class3-no-bb)` — t17a-class3-no-bb/late/sbp
- **Band / stated source:** SBP 80-90 at 900-1800 s after 1750 mL / 10 min — tables §7 17a "SBP 80-90" (brief §8.5)
- **Measured:** 95.1 (PP 20.9 passes 20-25)
- **Source verification:** Mutschler 2013 Crit Care Table 2: BD class III SBP 112.7 (30.7) at ED; Miller 10e ch. 62 p. 2001 (shock classes "commonly confounded"); p. 2009: previously healthy young patients "can lose up to 40% of their blood volume before experiencing a decrease in blood pressure". The same bleed in s4-class-iii is asserted as SBP < 100.
- **Band vs source:** No. The 10-mmHg window is narrower than the inter-patient spread (SD ~30), sits below the registry mean for moderate shock, and conflicts with the suite's own s4-class-iii row (< 100 for the identical bleed).
- **Better evidence:** Class III: SBP decreased, about 80-100, or <= 0.85 x baseline. (grade A (registry) + C (Miller))
- **Verdict: TOO NARROW** · proposed: SBP 80-100 (or <= 0.85 x baseline), consistent with s4-class-iii's < 100 (Mutschler 2013 PMID 23497602; Miller 10e ch. 62 pp. 2001, 2009)
- **Likely not a miss:** yes (95.1)

<a id="row-62"></a>

#### 62. `docs/validation/calibration-queue.md (validation scenario t14-tamponade)` — t14-tamponade/equalised/pawp
- **Band / stated source:** PAWP 15-20 at 540-720 s (20 mL/min into the pericardium) — tables §7 14 "CVP ~ PAD ~ PCWP 15-20 (within 5)"; tables H7 "equalisation in 71-81 %"
- **Measured:** 22.4 (CVP 17.9 passes)
- **Source verification:** Reddy PS et al. Circulation 1978;58:265-272, PMID 668074 (abstract, 14 tamponade): RA pressure "16 +/- 4 mm Hg" falling to 7 +/- 5 after pericardiocentesis; CO 3.87 -> 7.0 L/min; PAW "equal to pericardial pressure" in the 10 with pulsus; Dellinger 5e ch. 25 p. 347: in severe tamponade "equalization of right atrial, right ventricular (RV) diastolic, pulmonary diastolic, pulmonary artery wedge, and intrapericardial pressures occurs".
- **Band vs source:** Partly. The tables' own wording is '15-20 (within 5)'. Equalisation is the criterion (PAWP ~ RAP ~ pericardial pressure), and Reddy's RAP is 16 +/- 4 (about 12-20 at 1 SD, 8-24 at 2 SD). PAWP 22.4 with CVP 17.9 differs by 4.5, so it IS equalised by the tables' own 'within 5'.
- **Better evidence:** Assert |PAWP - CVP| <= 5 and an absolute 12-25 range. (grade B (human catheter series, n 14) + C)
- **Verdict: TOO NARROW** · proposed: PAWP 12-25 and |PAWP - CVP| <= 5 mmHg (Reddy 1978 PMID 668074; Dellinger 5e ch. 25 p. 347; tables H7)
- **Likely not a miss:** yes (22.4; difference 4.5)

<a id="row-63"></a>

#### 63. `docs/validation/calibration-queue.md (validation scenario t12-massive-pe)` — t12-massive-pe/pe-late/papm
- **Band / stated source:** papSys max 30-45 at 180-300 s (labelled 'mPAP 30-40, never > 45 (systolic proxy) [ENG]') — tables §7 12 "mPAP 30-40 (never > 45)"; H5 "mPAP 30-40 (not > 40)" (McIntyre-Sasahara 1971)
- **Measured:** 24.0 (PA systolic)
- **Source verification:** Miller GA, Sutton GC. Br Heart J 1970;32:518-523, PMID 5433313 (abstract, 23 massive PE without prior disease): "PA systolic pressure 38.4+/-6.8 mm. Hg", "RVED 11.5+/-4.9 mm. Hg", SaO2 86.4 +/- 11.2 %; Dellinger 5e ch. 42 p. 673: obstruction must be 75 % or more "to cause a mean PA pressure of 40 mm Hg or higher"; "Right atrial pressure (RAP) elevation occurs when the mean PA pressure is 30 mm Hg or higher and obstruction exceeds 35% to 40%" (citing McIntyre-Sasahara 1971, PMID 5155756, no abstract).
- **Band vs source:** No (measurement). The source band is for MEAN PAP; the row asserts the SYSTOLIC channel against it. As it happens, Miller & Sutton's PA SYSTOLIC in massive PE (38.4 +/- 6.8) fits 30-45, so the numbers survive under a systolic label. A systolic of 24 corresponds to a near-normal mPAP (~15).
- **Better evidence:** In a previously normal RV, mPAP rarely exceeds 40 (needs >= 75 % obstruction); PA systolic ~31-45 (1 SD). (grade B (human catheter series) + C)
- **Verdict: MIS-SPECIFIED** · proposed: relabel as PA systolic 30-50 (Miller & Sutton 38.4 +/- 6.8), or assert mPAP 25-40 on a mean channel (Miller & Sutton 1970 PMID 5433313; Dellinger 5e ch. 42 p. 673)
- **Likely not a miss:** no (24 is below either reading)

<a id="row-64"></a>

#### 64. `docs/validation/calibration-queue.md (validation scenario O1)` — O1/map
- **Band / stated source:** ours within +/-5 % of Pulse MAP at 590 s (MANUAL baseline) — oracle.ts O1 (R34; pulse-parameter-annex §D) - no physiological source
- **Measured:** ours 87.33 vs Pulse 95.38 (8.4 %)
- **Source verification:** packages/validation/src/oracle/oracle.ts (O1: MANUAL baseline, StandardMale 44 y 77.1 kg, BP 114/74; compare at 590 s); compare.ts grading: green within tolPct, yellow < 30 %, red otherwise. Arithmetic: Pulse's own SBP/DBP 114/73.5 with MAP 95.4 puts MAP at 0.54 of the pulse pressure above DBP. Ours is the brief's MANUAL target 114/74 read as DBP + PP/3 = 87.3.
- **Band vs source:** No physiological source. Pulse is another lumped model, not a measurement. Agreement with its default set point tests whether two engines start from the same numbers, not whether either is physiological. In MANUAL mode our MAP is the instructor's target by construction.
- **Better evidence:** Replace with a physiological check: MANUAL MAP equals the tracker's target, and the MODELED baseline MAP falls in the adult normal range (tables H1 normals) with a radial MAP/PP fraction near the conventional one-third. Pulse's 0.54 looks high (not sourced here). (grade D (model-to-model))
- **Verdict: UNSUPPORTED** · proposed: drop as an acceptance band (keep as a report-only Pulse comparison) (tables H1; brief §4.9 M2)
- **Likely not a miss:** yes (87.3 is the set target)

<a id="row-65"></a>

#### 65. `docs/validation/calibration-queue.md (validation scenario O1)` — O1/rr
- **Band / stated source:** ours within +/-10 % of Pulse RR at 590 s — oracle.ts O1 - no physiological source
- **Measured:** ours 15.00 vs Pulse 12.24 (22.5 %)
- **Source verification:** packages/validation/src/oracle/oracle.ts (O1: MANUAL baseline, StandardMale 44 y 77.1 kg, BP 114/74; compare at 590 s); compare.ts grading: green within tolPct, yellow < 30 %, red otherwise. Both values are normal adult resting rates (textbook 12-20/min).
- **Band vs source:** No physiological source; Pulse is another lumped model, not a measurement. Agreement with its default set point tests whether two engines start from the same numbers, not whether either is physiological.
- **Better evidence:** - (grade D)
- **Verdict: UNSUPPORTED** · proposed: drop as a band (both 12 and 15 are normal); if kept, assert RR 10-20 (textbook normal range [TXT])
- **Likely not a miss:** yes

<a id="row-66"></a>

#### 66. `docs/validation/calibration-queue.md (validation scenario O1)` — O1/cvp
- **Band / stated source:** ours within +/-10 % of Pulse CVP at 590 s (scenarios.ts had +/-50 % with the note 'small number') — oracle.ts O1 - no physiological source
- **Measured:** ours 6.00 vs Pulse 4.73 (26.8 %)
- **Source verification:** packages/validation/src/oracle/oracle.ts (O1: MANUAL baseline, StandardMale 44 y 77.1 kg, BP 114/74; compare at 590 s); compare.ts grading: green within tolPct, yellow < 30 %, red otherwise. Tables H1 (normal): RA 2-6, mean ~4. The older packages/validation/src/oracle/scenarios.ts O1 used tol 0.5 for CVP: 'CVP 4.7 vs 5; +/-0.5 relative on a small number'.
- **Band vs source:** No: +/-10 % of a 4.7 mmHg value is +/-0.5 mmHg, below CVP measurement resolution. The older harness had already set +/-50 % for this reason.
- **Better evidence:** Normal CVP 2-8 (tables H1 RA 2-6; brief CVP default 6 'normal mean 2-8'). (grade D)
- **Verdict: UNSUPPORTED** · proposed: drop, or assert CVP 2-8 mmHg (tables H1; circ-manual-cvp-peep.test.ts header (L1 default 6, normal 2-8))
- **Likely not a miss:** yes

<a id="row-67"></a>

#### 67. `docs/validation/calibration-queue.md (validation scenario O2)` — O2/hr-delta
- **Band / stated source:** ours HR change at 600 s within +/-20 % of Pulse's change — oracle.ts O2 - no physiological source
- **Measured:** ours +14.03 vs Pulse +47.70 (70.6 %)
- **Source verification:** oracle.ts O2: Pulse gets Hemorrhage RightLeg Severity 0.8; ours gets a bleed of 1100 mL over 10 min (22 % of 4.9 L). The older scenarios.ts used a matched 110 mL/min x 10 min. Pulse's blood loss at severity 0.8 is not stated in the harness, so the two arms may not lose the same volume. Human class II data: Mutschler M et al. Crit Care 2013;17:R42, PMID 23497602 (PMC3672480 Table 2, 16,305 trauma patients by base-deficit class I-IV): HR at ED 86.3 (17.8) / 89.8 (20.3) / 95.9 (22.5) / 97.2 (32.4); SBP at ED 132.6 / 124.6 / 112.7 / 94.8; SI 0.68 / 0.76 / 0.93 / 1.17; text: "HR seemed unaltered within the four groups, and interestingly no group displayed a relevant tachycardia at all"; Guly HR et al. Resuscitation 2011;82:556-559, PMID 21349628 (abstract, TARN): "The median HR rose from 82 beats per minute (BPM) in estimated class 1 shock to 95 BPM in estimated class 4 shock"; median SBP 135 -> 120.
- **Band vs source:** No. Two problems: (1) the arms are not volume-matched; (2) Pulse's +48 bpm at ~20 % loss is far above any human evidence for class II (registry: a few bpm between BD classes I and II; the classic ATLS table at most 100-120 from ~75).
- **Better evidence:** Class II: HR baseline +0-25 (as for s2). (grade D (model-to-model); human evidence A)
- **Verdict: UNSUPPORTED** · proposed: drop the Pulse tolerance; assert HR +0-25 bpm and MAP -0 to -10 % at 10 min after 1100 mL (class II) (Mutschler 2013 PMID 23497602; Guly 2011 PMID 21349628)
- **Likely not a miss:** yes (+14 bpm, -3.75 mmHg fit class II)

<a id="row-68"></a>

#### 68. `docs/validation/calibration-queue.md (validation scenario O2)` — O2/map-delta
- **Band / stated source:** ours MAP change at 600 s within +/-20 % of Pulse's change — oracle.ts O2 - no physiological source
- **Measured:** ours -3.75 vs Pulse -16.34 (77.0 %)
- **Source verification:** As O2/hr-delta. Class II: SBP maintained (ATLS 2008 'Normal'; brief §4.9 check 2 'SBP near normal'); registry BD class II SBP 124.6 vs class I 132.6 (Mutschler 2013 Table 2).
- **Band vs source:** No: unmatched arms; Pulse's -16 mmHg at class II contradicts 'SBP near normal'.
- **Better evidence:** - (grade D)
- **Verdict: UNSUPPORTED** · proposed: MAP fall 0-10 % at 10 min after 1100 mL (ATLS 2008 via PMC10241213; Mutschler 2013 PMID 23497602; brief §4.9 check 2)
- **Likely not a miss:** yes

<a id="row-69"></a>

#### 69. `docs/validation/calibration-queue.md (validation scenario O2)` — O2/lactate
- **Band / stated source:** n/a (Pulse aborted at 1570 s); row expects Pulse lactate < 27 mg/dL (expect-differ D2) and compares ours within +/-20 % — oracle.ts O2 'lactate' (D2)
- **Measured:** ours: no value; Pulse: none
- **Source verification:** Registry for moderate haemorrhage: Mutschler 2013 Crit Care Table 3 (by BD class), lactate 2.5 (4.3) / 3.4 (5.4) / 5.1 (8.4) / 9.7 (14) mmol/L.
- **Band vs source:** No physiological target: the row is a Pulse-defect detector (expect-differ), and no value exists on either side.
- **Better evidence:** If a lactate target is wanted: about 2-4 mmol/L at 30 min after a class II bleed (registry BD class II mean 3.4; trauma-confounded). Grade B/C. (grade D)
- **Verdict: UNSUPPORTED** · proposed: drop from the queue (no measurement); if wanted, lactate 2-4 mmol/L at 30 min (Mutschler 2013 PMID 23497602 Table 3)
- **Likely not a miss:** uncertain (no engine value reported)

<a id="row-70"></a>

#### 70. `docs/validation/calibration-queue.md (validation scenario O4)` — O4/map-delta
- **Band / stated source:** ours MAP change at 180 s (2 min after the bolus) within +/-15 % of Pulse's change — oracle.ts O4 (Pulse 150 mg, ours 2 mg/kg = 154 mg) - no physiological source
- **Measured:** ours -7.85 vs Pulse -27.91 mmHg (71.9 %)
- **Source verification:** Claeys MA, Gepts E, Camu F. Br J Anaesth 1988;60:3-9, PMID 3257393 (abstract, 10 elderly, propofol 2 mg/kg, spontaneous breathing): SBP and DBP fell "28% and 19%" at 2 min (MAP ~ -22 %); "Cardiac output was not affected at any time nor were stroke volume and heart rate"; Grounds RM et al. Anaesthesia 1985;40:735-740, PMID 3876040: propofol induction gave a significant fall in arterial pressure and TPR, "There were no changes in heart rate".
- **Band vs source:** No source for the tolerance. Pulse's -28 mmHg (~ -29 % from its 95) happens to sit at the deep end of the human range; +/-15 % of it (-23.7 to -32.1) is narrower than human variability and centred deep.
- **Better evidence:** MAP -15 to -30 % at 2 min (Claeys, elderly: ~ -22 %). (grade B (human) / D (oracle))
- **Verdict: UNSUPPORTED** · proposed: MAP change -15 to -30 % of baseline at 2 min (same evidence as s3 map-70pct) (Claeys 1988 PMID 3257393; Grounds 1985 PMID 3876040)
- **Likely not a miss:** no (-7.85 mmHg, ~ -9 %, is a real miss, the same one as s3)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **ATLS HR bands: s2 class II 100–120, s4 class III 120–140, s4 class IV 140–180, t17a 120–140 (and t17a SBP 80–90).** Brief §4.9 checks 2 and 4 and tables §7 17a copy the 2008 ATLS table (verified via PMC10241213). Registry HR by base-deficit class is 86/90/96/97 (Mutschler 2013 Crit Care Table 2). Guly 2011: median HR 82 → 95 from class 1 to 4. Mutschler 2013 Resuscitation: only 9.3 % of patients fit the ATLS combination. Schadt & Ludbrook 1991: relative bradycardia beyond ~30 % loss. research/03 line 1102 and Miller 10e ch. 62 p. 2001 already warn that the classes are a teaching construct. Proposal: shock index plus a relative HR rise, keeping the SBP/PP rows (which pass). Dependents: brief §4.9 checks 2/4; tables §7 17a and 17b (the 17b β-blocked HR 80–95 contrast collapses if 17a is re-based); research/23 R-01/R-02 (HR 100–130); research/03 §8.5 table; S6a/MANUAL class III scenarios (BLEED15); any baroreflex/humoral gain tuned toward these HR targets (R45 forbids widening without a ruling).
2. **hemo-acceptance:122 post-PVC SBP +8–15.** Brief §4.8 "SBP about +12" and research/03 lines 177/427/1067 ("+12 in controls vs +5 in poor LV") reverse their own source. Sinnecker 2014 (the cited JAHA paper) says PESP "is typically enhanced in heart failure", and Voss 2002 measured amplitude potentiation 9.8 % (controls) vs 48.7 % (DCM). The quantity is pulse amplitude, not SBP. Dependents: PESP_MAX 0.5 (circ/model.ts), FU-2 item 3's arterial C(P) law trials (which moved five calibrated bands chasing this target), docs/gates/stage-7a.md NR-1, and the R45(a) ruling.
3. **endo-circ-acceptance:64/68 warm sepsis CO 7–9 / SVR 500–700.** The tables' §5e column is labelled "warm (resuscitated)", yet the test gives no fluid. Dellinger 5e ch. 22 p. 293: the hyperdynamic state "usually depends on resuscitation with fluids". Dependents: tables §5e WK_R0 ×0.4–0.55, §7 check 16, Q-7e-7, Q55, and the "7a baroreflex × vasoResp / septic RVR" engine requests written to chase this band.
4. **t12-massive-pe papm.** A mean-PAP band is checked on the systolic channel. The numbers happen to fit PA systolic in massive PE (Miller & Sutton 38.4 ± 6.8), so relabelling fixes the spec. The engine's 24 is still a real miss. Dependents: tables §7 12, H5.
5. **PE CVP ≥ 15 (clinical-suite:198, obstructive-aliases:77) and MAP < 65 (obstructive-aliases:80, clinical-suite:198).** Massive-PE RVEDP is 11.5 ± 4.9 (Miller & Sutton 1970), and the tables' H5 floor is 12. The source hypotension criterion is SBP < 90, which already passes at 3 min. Dependents: Q15, tables H5 vs §7 12 (+8–12), Task 11 Step 1b (RV wall-stress demand added to chase CVP ≥ 15). Engine side-flag: SBP 84.6 with MAP 78.4 implies a single-digit pulse pressure.
6. **fu9-iap:29 CO −10–30 %.** Joris's −20 % CI was measured head-up with isoflurane at 5 min. Supine pneumoperitoneum raises preload (Odeberg 1994: CVP +58 %, PCWP +32 %). The robust signature is MAP +35–39 % / SVR +65 %. Dependents: research/23 R-18, research/13 H5, research/21 SP-08a, R-FU9-8.
7. **circ-manual-cvp-peep:50, PEEP 5 → 15 CVP 2.2–3.7.** Centre right, top too low: the human median is 3.0–3.75 mmHg (IQR to 4.63). Proposed 2.0–4.6. The 4.82 measured (T_IT 0.65) stays just outside. Dependents: brief §4.9 "30–50 %", tables H10 (+2–3) and §2.2 tIt 0.4 (Q28), the deferred MANUAL_CVP_PAW_FRACTION ruling, and the five bands it moves (check 18 MAP-65 premise and hypocapnia, 7c OLV nadir, R36 PH-crisis EtCO2, 8a capture-match SBP).
8. **t14 PAWP 15–20.** The tables' own "within 5" criterion is met (22.4 vs CVP 17.9), and Reddy 1978 gives RAP 16 ± 4. Dependents: tables H7, §7 14.
9. **organs-htn:65 check 18 ≤ 0.40.** Same derived 5-point band as the neuro section's row 8. Adopt 0.35–0.55 in both places so the two tests stay consistent.
10. **Oracle rows O1/O2/O4.** No physiological source. O2's arms are not volume-matched (Pulse severity 0.8 vs our 1100 mL; the older scenarios.ts was matched at 110 mL/min). Pulse's +48 bpm at class II is itself unphysiological. Dependents: packages/validation/src/oracle/oracle.ts tolerances, pulse-parameter-annex §C–§D, the calibration-queue red rows.

**(b) Known misses that are probably NOT misses** (measured value inside the corrected or evidence band): s2 HR 81.6; s4 class III HR 107; s4 class IV HR 134; t17a HR 98 and SBP 95.1; t14 PAWP 22.4; PE CVP 11.5 at 3 min; PE MAP 78.4 at 3 min (SBP 84.6 < 90 meets the sourced criterion); warm sepsis CO 5.0 and SVR 861 (unresuscitated); check 18 CBF 0.4019; check 18 recovery CBF 0.891 (only the rig MAP premise fails); O1 MAP/RR/CVP; O2 HR +14 and MAP −3.75. Partly: fu9-iap CO 0.0 % (edge of the supine band; the MAP/SVR rise is the real gap); S4b MAP 50.5 (meets) with CO −21 % (unsourced −25 %). Still real misses: s3/O4 propofol MAP fall (~−8–9 % vs −15 to −30 %); s3 HR +17 %; pulsus 3.1 mmHg (RIGHT band); neonatal CO 89 mL/kg/min (RIGHT band); t12 PA systolic 24; PEEP → CVP 4.82 (marginal); S6a nadir 2.7 with an arrest; S9 at 5 min (CVP 9.3, MAP 82.1); post-PVC −10.9 SBP; and the MANUAL 18/10 tracker floor (design contract).

**(c) Items with no source.** S4b's MAP < 55 / CO −25 % ("audit S4 proposal"); S5's CO −20 % and ≥ 10 mmHg excess ("Barash", no page; animal data give direction only); S6a's 40–60 % / nadir 30–50 (owner picture; Johnson 2003 is a PK/PD swine infusion study); post-PVC +8–15 (source contradicts it); "PALS ≈ 200" for neonatal CO (number fine, attribution not found: cite Popat & Kluckow 2012); t12 "never > 45 [ENG]"; warm-sepsis CO 7–9 / SVR 500–700 (tagged [TXT], no paper traced); check 18's 0.40 ceiling and > 0.80 recovery (derived arithmetic); every O1/O2/O4 "±x % of Pulse" tolerance.

## Respiration and gas (A): gas exchange, apnoea, capnography and drive

This section has 24 rows: 19 known-miss assertions in the gas-exchange, apnoea, capnography and drive tests, and 5 calibration-queue rows (t12 massive PE ×2, t24 Edmark ×3). Verdicts: 8 MIS-SPECIFIED, 6 TOO NARROW, 6 UNSUPPORTED, 4 RIGHT, none TOO WIDE. Three patterns stand out. First, room-air physiology has been moved onto oxygen. All three PE hypoxaemia bands (S9 SaO2 < 90 at FiO2 0.5, the Q15 SaO2 ≤ 92 at FiO2 0.5, and t12's SpO2 85–92 on FiO2 1.0) contradict the MIGET series (Santolicandro 1995, Huet 1985, Manier 1985), where PE hypoxaemia is low-V/Q plus a low PvO2 that oxygen corrects, and early shunt is insignificant. Second, cited sources were misread. The pregnancy band of 2.5–4.5 min says McClelland's model gives 'half' the non-pregnant time, but McClelland gives a median of 4 min 52 s (3:43–6:17), and the engine's 4.82 min is that median. The rebreathing band of +6–10 at 20 min goes above the +8 steady state that the alveolar equation allows, and needs ≥ 75 % equilibration where the one human datum (Chen 2004) shows about 50 %. Third, several magnitudes have no source: capnogram < 15 whenever VT < VD, which ignores the equal-area definition of VDaw; stimulus VE +20 % under remifentanil; pulsus ≥ 10 at a −20 cmH2O swing; MAP ≥ 85 % within 30 s of disconnection; and an SaO2 fall ≥ 4 in bronchospasm at FiO2 0.5. Edmark's ±20 % is no wider than the trial's own SD (narrower at FiO2 0.6), and all three engine times sit within ±1.5 SD. In 11 of the 24 rows the measured value already sits inside the evidence band, and in 3 more it partly does. Six are real misses against a right or corrected band: induction shunt 0.015, child VT 15.4 mL/kg at RR 7.4, sevoflurane tachypnoea 1.23 ×, the COPD and ventilated-PE arrests, and t12's EtCO2 of 38 in the first 20 s. research/28 already verified Patel and Edmark, and those rows are cross-referenced only. Abstracts were read through PubMed E-utilities. Pages were taken from the local Miller 10e (ch. 12, 19, 37, 75), Dellinger 5th (ch. 10, 42) and Coexist 8th (ch. 2) PDFs. Not verified: Nunn's 'ch. 5' stimulus figure (Nunn is not in the corpus), McIntyre & Sasahara 1971 and Farhi & Rahn 1960 (no abstracts), Hedenstierna & Edmark 2010, and ESC 2019.

### Rows

<a id="row-71"></a>

#### 71. `packages/engine-core/test/engine/clinical-suite.test.ts:195` — S9 massive PE (one command, VCV, FiO2 0.5): SaO2 < 90 % at 5 min
- **Band / stated source:** SaO2 < 90 % at 5 min after `condition pe 1` (ETT, VCV 12 × 600, PEEP 5, FiO2 0.5) — audit §6 S9; the title calls it the owner's proposed band (SpO2 ≤ 92 at FiO2 0.5, item 15 / Q15); tables §2 H5 'SpO2 85–92 % on FiO2 1.0' (McIntyre-Sasahara 1971; R03 §4.3)
- **Measured:** SaO2 97.8 %
- **Source verification:** Santolicandro A et al. Am J Respir Crit Care Med 1995;152:336-347, PMID 7599843 (abstract; 10 patients, two-thirds of the circulation obstructed, breathing spontaneously): "hypoxemic (PaO2 = 63.0 +/- 11.7 mm Hg) and hypocapnic (PaCO2 = 30.0 +/- 4.1 mm Hg)"; "Hypoxemia was mainly explained by VA/Q inequality, reduced PvO2 also contributed"; "Shunt, diffusion limitation, or true alveolar dead space occurred in occasional patients but were generally insignificant". Huet Y et al. Chest 1985;88:829-836, PMID 4064770 (abstract; mean obstruction 55 %, PaO2 67 +/- 11): "the two patients studied early (ie, less than 48 hours following acute PE) had normal chest x-ray film findings and no significant shunt"; "Intrapulmonary shunting contributes significantly to hypoxemia only when atelectasis or another cause of lung volume loss develops". Manier G et al. Am Rev Respir Dis 1985;132:332-338, PMID 4026055 (abstract): true shunt + VA/Q < 0.01 "was 9.1%"; "the major determinant of hypoxemia in these patients ... is the fall in PVO2". Dellinger 5th ch. 42 p. 689.e7: "Acute increases in right-sided pressures can open a patent foramen ovale, causing intracardiac shunt also"; PaO2 and A-a gradient "have been reported to be normal in up to 30% of patients". McIntyre & Sasahara 1971 (PMID 5155756) has no abstract and is a haemodynamic paper; research/03 §4.3 is the capnography waveform library and holds no SpO2 figure: the H5 SpO2 figure is UNVERIFIED.
- **Band vs source:** No. The human figures are room-air ones (PaO2 61–67, so SaO2 about 90–93 %), and the hypoxaemia comes from low-V/Q units plus a low PvO2, which supplemental O2 largely corrects. True shunt early in PE is small. DERIVED: at FiO2 0.5, with GA atelectasis shunt (~0.05–0.10) plus the PE row's +0.10 and SvO2 ~50 %, SaO2 comes out at about 95–98 %. Getting SaO2 below 90 % at FiO2 0.5 needs a shunt of about 0.25 or more (a PFO or major atelectasis).
- **Better evidence:** Room-air hypoxaemia (PaO2 63 ± 12) and hypocapnia are well documented. On supplemental O2, expect a fall of a few points, not desaturation. Refractory hypoxaemia on O2 points to an opened PFO. (grade A (three MIGET series, n 7–10, abstracts) for the mechanism; C (DERIVED) for the FiO2 0.5 number)
- **Verdict: MIS-SPECIFIED** · proposed: Ventilated at FiO2 0.5 without a PFO: SaO2 stays ≥ 92 %, with a fall of 1–6 points by 5 min. Move "SpO2 ≤ 92" to the awake room-air arm (RS13). If on-O2 desaturation is wanted, add a PFO (right-to-left shunt) variant (Santolicandro 1995 PMID 7599843; Huet 1985 PMID 4064770; Manier 1985 PMID 4026055; Dellinger 5th ch. 42 p. 689.e7)
- **Likely not a miss:** yes (97.8 is inside a ≥ 92 band; the size of the fall is not in the title)

<a id="row-72"></a>

#### 72. `packages/engine-core/test/engine/lung-r14.test.ts:54` — induction at FiO2 1.0 (ETT, VCV, PEEP 5, propofol + rocuronium): Qs/Qt ≥ 0.07 by 20 min
- **Band / stated source:** Qs/Qt ≥ 0.07 at 20 min — file header: Hedenstierna & Edmark 2010 "8–10 %"; tables §4.1 atelInd 0.06 → shunt +0.05–0.10 (Edmark 2003; Hedenstierna review)
- **Measured:** 0.015
- **Source verification:** Miller 10e ch. 12 p. 266: "true shunt was increased to a mean of 8%. A similar increase in shunt from 1% awake to a mean of 9% during anesthesia was recorded in a study on middle-aged (37 to 64 years) surgical patients"; in older patients "shunt increased to a mean of 15%, with large variation among patients (0% to 30%)". Miller 10e ch. 12 pp. 268–269: atelectasis and shunt correlate ("R = 0.81"); "The application of PEEP (10 cmH2O) has been repeatedly demonstrated to re-expand atelectasis in part". Edmark 2003 PMID 12502975 (abstract): atelectasis after FiO2 1.0 "5.6 +/- 3.4% of the total lung area". Hedenstierna & Edmark 2010 not opened: UNVERIFIED.
- **Band vs source:** Partly. The 8–9 % figures are MIGET means from older studies, mostly at ZEEP. The test runs at PEEP 5, which partly re-expands atelectasis. A floor set at the population mean fails about half of real patients.
- **Better evidence:** Middle-aged mean 9 %, older adults 15 % (range 0–30 %). (grade A (MIGET series via textbook) / C)
- **Verdict: TOO NARROW** · proposed: Qs/Qt 0.04–0.12 at 20 min (FiO2 1.0, PEEP 5); ≥ 0.06 if the test is re-specified at ZEEP (Miller 10e ch. 12 pp. 266, 268–269; Edmark 2003 PMID 12502975)
- **Likely not a miss:** no (0.015 is below any evidence band: a real miss)

<a id="row-73"></a>

#### 73. `packages/engine-core/test/engine/obstructive-aliases.test.ts:83` — massive PE at 3 min (ETT, VCV, FiO2 0.5): PROPOSED SaO2 ≤ 92 %
- **Band / stated source:** SaO2 ≤ 92 % at 3 min after the PE event — "PROPOSED band (Q15, Ali)"; tables §18 PE shunt +0.10
- **Measured:** SaO2 97.3 %
- **Source verification:** Same as clinical-suite.test.ts:195 (Santolicandro 1995; Huet 1985; Manier 1985; Dellinger 5th ch. 42).
- **Band vs source:** No: same reason as row 1. A room-air figure has been applied at FiO2 0.5.
- **Better evidence:** As row 1. (grade A / C)
- **Verdict: MIS-SPECIFIED** · proposed: Same as row 1: SaO2 ≥ 92 % with a fall of 1–6 points at FiO2 0.5 without a PFO; SpO2 ≤ 92 on room air (Santolicandro 1995; Huet 1985; Manier 1985)
- **Likely not a miss:** yes (97.3)

<a id="row-74"></a>

#### 74. `packages/engine-core/test/engine/resp-capno-deadspace.test.ts:21` — BVM 12 × 100 mL via ETT (VT 0.79 × VDs 127 mL): displayed EtCO2 < 15
- **Band / stated source:** displayed EtCO2 max < 15 mmHg over 120–180 s — FU-6 R5 (audit C1, H; suite RS3 "flat or low capnogram (EtCO2 display < 15) while VT < dead space"); no citation
- **Measured:** 15.0 (PaCO2 not in title)
- **Source verification:** Miller 10e ch. 37 p. 1168, Fig. 37.13 caption: the volume capnogram has "anatomic dead space (phase I...), transitional (phase II...), and alveolar gas (phase III)", and VDaw is a vertical line "through phase II, positioned such that the approximately triangular areas p and q are equal" (after Fletcher 1981). Fletcher R et al. Br J Anaesth 1981;53:77-88, PMID 6779846 (abstract): "VDaw is the volume of gas between the lips and the alveolar/fresh gas interface, the location of which is determined by inspiratory flow pattern and airway geometry". No source for the 15 mmHg figure was found; the suite row carries no citation.
- **Band vs source:** Partly. The direction is right: when VT is below VDaw, the end-expired gas comes from phases I–II, so EtCO2 is low with no plateau. But VDaw is defined at the MIDPOINT of phase II, so at VT ≈ VDaw the last expired gas carries about half the alveolar PCO2, and at 0.79 VDaw some fraction of it (DERIVED). A fixed 15 mmHg ignores both PaCO2 (which rises during 3 min of near-apnoea) and the width of phase II.
- **Better evidence:** No quantitative source; the threshold follows from the definition of VDaw. (grade C (textbook definition + DERIVED))
- **Verdict: UNSUPPORTED** · proposed: Make it relative: EtCO2 ≤ 0.5 × PaCO2 with no phase-III plateau whenever VT ≤ VDaw; EtCO2 near 0 only when VT ≤ ~0.5 VDaw [ENG/DERIVED] (Miller 10e ch. 37 p. 1168 (Fig. 37.13); Fletcher 1981 PMID 6779846)
- **Likely not a miss:** yes (15.0 is under 0.5 × any PaCO2 ≥ 30)

<a id="row-75"></a>

#### 75. `packages/engine-core/test/engine/resp-child-baseline.test.ts:14` — awake 4 y 16 kg: PaCO2 35–45, VT 4.2–10.4 mL/kg, lactate rise < 0.5 over 15 min
- **Band / stated source:** VT 4.2–10.4 mL/kg (6–8 ± 30 %); PaCO2 35–45; Δlactate < 0.5 — FU-6 R15 (audit B5, B6); no citation
- **Measured:** VT 15.4 mL/kg (246 mL at RR 7.4); PaCO2 36.1; lactate +0.01
- **Source verification:** Miller 10e ch. 75 Table 75.4 p. 2436 (from O’Rourke & Crone 1989): 3 years RR "24 ± 6", VT "112" mL, VD/VT "0.3"; 5 years RR "23 ± 5", VT "270" mL, VO2 "6.0 ± 1.1" mL/kg/min; adult and 12 y PaCO2 "30–40".
- **Band vs source:** Yes for VT: the 3-y row (112 mL at about 14 kg) is about 8 mL/kg. The table's 5-y VT of 270 mL and MV 5.5 L/min do not fit its own alveolar ventilation of 1800 mL/min and should not be used. The band asserts no RR, yet the engine's RR 7.4 is far below 23–24 ± 5–6, and RR is the clearer miss.
- **Better evidence:** - (grade C (textbook table))
- **Verdict: RIGHT** · proposed: keep; add RR 17–30 /min for a 3–5-year-old (Miller 10e ch. 75 Table 75.4 p. 2436)
- **Likely not a miss:** no (VT 15.4 mL/kg and RR 7.4 are both outside the evidence)

<a id="row-76"></a>

#### 76. `packages/engine-core/test/engine/resp-drive-fu6.test.ts:31` — noxious stimulus 1.5 under remifentanil 0.1 + propofol 50 (SGA, FiO2 0.5): VE ≥ +20 %
- **Band / stated source:** VE ≥ 1.2 × pre-stimulus at 2 min — RS5 "noxious stimulus 1.5 at 0.1 raises VE ≥ 20 %"; file header "Nunn ch. 5"
- **Measured:** +3.3 % (3.29 → 3.40 L/min)
- **Source verification:** Nunn's Applied Respiratory Physiology is not in the local corpus and was not reached: UNVERIFIED. Borgbjerg MF et al. Pain 1996;64:123-128, PMID 8867254 (abstract; awake volunteers, tourniquet pain, morphine): "experimental pain-stimulated respiration and attenuated morphine-induced respiratory depression. Only changes in the intercept values of the CO2 response were observed" (no percentage given). Eger EI 2nd et al. Anesthesiology 1972;36:544-549, PMID 5033777: "Surgical stimulation antagonizes the respiratory depression produced by forane" (title only; isoflurane, no opioid). Miller 10e ch. 19 p. 446: "acute pain and central nervous system arousal do not restore impaired HVR during sevoflurane sedation".
- **Band vs source:** Partly. The direction is supported: pain stimulates breathing (Borgbjerg; Eger title). No located source gives +20 %, and none tested it under a remifentanil infusion of 0.1 µg/kg/min (Ce ≈ 2.5 ng/mL), whose antinociception blunts the arousal input. The engine models that blunting (7f antinoc 0.77).
- **Better evidence:** Size the effect from Eger 1972 (surgical stimulus under isoflurane) before setting a number; no human data under remifentanil were found. (grade D (direction B; magnitude unsourced))
- **Verdict: UNSUPPORTED** · proposed: VE rises (≥ +5 %) and rises less than the same stimulus under propofol alone [ENG; owner ruling] (Borgbjerg 1996 PMID 8867254; Eger 1972 PMID 5033777 (title))
- **Likely not a miss:** uncertain (+3.3 % fails only the unsourced +20 %)

<a id="row-77"></a>

#### 77. `packages/engine-core/test/engine/resp-ga-state.test.ts:35` — child 4 y 16 kg, preoxygenated apnoea to SaO2 90 %: 2–3.2 min (Patel 160 ± 31 s)
- **Band / stated source:** 2.0–3.2 min — Patel 1994 160 ± 31 s (RS2); research/28 child 2–5 yr 2.2–3.2
- **Measured:** 3.38 min (SaO2); displayed SpO2 < 90 at +222 s = 3.7 min (resp-child-baseline:30)
- **Source verification:** Patel R et al. Can J Anaesth 1994;41:771-774, PMID 7954992 (abstract): 50 ASA I children, induction with halothane or barbiturate, vecuronium, mask ventilation with O2 until "end-tidal N2 decreased below 3% (minimum time two minutes)", then time from SpO2 99-100 % to 90 %: "infants than in two- to five-year-old children (96.5 +/- 12.7 sec vs 160.4 +/- 30.7 sec"; adolescents "382.4 +/- 79.9 sec"; time correlated with age "(r2 = 0.88". Cross-ref research/28 §1.3 row 14 and §4: child 2-5 yr 2.7 min, band 2.2-3.2 min.
- **Band vs source:** Yes, in essence. 2–3.2 min is the 2–5 yr mean −1.3 SD to +1 SD. Two caveats pull in opposite directions. A 4-year-old sits above the group's mean age (linear age regression, r² 0.88; DERIVED ≈ 170 s at 4 y). Patel's endpoint is SpO2, which lags SaO2 by 10–20 s, so the SaO2-equivalent mean is about 150–160 s. The net centre is about 2.6 min.
- **Better evidence:** research/28 (one series, n = 50, about 10 per age group). (grade A (one human series))
- **Verdict: RIGHT** · proposed: keep (±1 SD); if the owner wants population width, ±1.5 SD gives 1.9–3.4 min (Patel 1994 PMID 7954992; research/28 §1.3, §4)
- **Likely not a miss:** partly (SaO2 3.38 min is ≈ +1.4 SD; the displayed 3.7 min is ≈ +2 SD, so the engine child desaturates slightly slowly)

<a id="row-78"></a>

#### 78. `packages/engine-core/test/engine/resp-inspired-co2.test.ts:27` — RS14 twin: FiCO2 8 mmHg for 20 min at fixed VCV: PaCO2 and EtCO2 +6–10 over control
- **Band / stated source:** ΔPaCO2 and ΔEtCO2 each 6–10 mmHg at 20 min — FU-6 R8 (audit H1; suite RS14) [ENG]; the file header itself says 20 min ≈ 70 % of the +8 steady state; owner ruling Q5 2026-10-10 kept it unwidened
- **Measured:** PaCO2 +6.7; EtCO2 +5.99994
- **Source verification:** Chen YH et al. Acta Anaesthesiol Taiwan 2004;42:199-202, PMID 15679128 (abstract; n = 55 under GA): soda lime replaced when PiCO2 reached 6 mmHg; 20 min later "The PaCO2 in group-Pre and group-Post was 43.7 +/- 4.2 mmHg and 40.9 +/- 4.6 mmHg respectively. The end-tidal CO2 in group-Pre and group-Post was 38 +/- 3.5 mmHg and 35 +/- 3.6 mmHg" (-2.8 / -3.0 at 20 min, about 50 % of the PiCO2). Steady state from the alveolar equation PACO2 = PICO2 + 0.863·VCO2/VA (Miller 10e ch. 12 p. 246 on the VCO2/VA balance): at fixed VA and VCO2 the full rise is +8 (DERIVED). Farhi & Rahn 1960 (PMID 13698175, CO2-store dynamics) has no abstract: UNVERIFIED.
- **Band vs source:** No. The ceiling of +10 is above the +8 steady state that the alveolar equation allows at fixed VA and VCO2; only a rise in VCO2 could add more. The floor of +6 at 20 min needs ≥ 75 % equilibration. The one human datum (Chen) is about 50 % at 20 min, and it runs in the reverse direction, which equilibrates faster. Caveats: a capnograph's PiCO2 is the inspired peak, so the mean inspired value is lower, and Chen's ventilator settings during the 20 min are not stated.
- **Better evidence:** Chen 2004 (abstract). The full Farhi & Rahn time constants would settle the 20-min fraction. (grade B (one human series, n = 55) + C (DERIVED))
- **Verdict: MIS-SPECIFIED** · proposed: ΔPaCO2 and ΔEtCO2 +3–8 mmHg at 20 min; +8 ± 1 only at steady state (≥ 60 min) (Chen 2004 PMID 15679128; alveolar equation (Miller 10e ch. 12 p. 246))
- **Likely not a miss:** yes (+6.7 / +6.0 inside 3–8)

<a id="row-79"></a>

#### 79. `packages/engine-core/test/engine/resp-pregnancy.test.ts:19` — term pregnancy, preoxygenated apnoea to SaO2 90 %: 2.5–4.5 min
- **Band / stated source:** 2.5–4.5 min — RS2; file header "McClelland 2009 ≈ half the non-pregnant 8 min"; tables §7 23 "SpO2 90 % at ~2.5–4 min (vs ~8 min non-pregnant)" [VERIFY]; research/09 §7 Q5
- **Measured:** 4.82 min
- **Source verification:** McClelland SH, Bogod DG, Hardman JG. Anaesthesia 2008;63:264-269, PMID 18289232 (abstract; Nottingham Physiology Simulator, 3 pregnant / 3 non-pregnant virtual subjects): "the median [range] time taken to fall to S(a)O2 < 90% after 99% complete denitrogenation being 4 min 52 s [3:43-6:17] in the pregnant subjects, vs 7 min 25 s [5:49-9:42] in the non-pregnant subjects"; "Two minutes of pre-oxygenation by tidal breathing provides approximately 3.5-6 min before desaturation to < 90%". McClelland 2009, PMID 19317700 (abstract): "292 s in a standard pregnant subject" vs 98 s for a labouring subject with BMI 50.
- **Band vs source:** No. The cited source gives a median of 4.9 min (range 3.7–6.3) and a ratio to non-pregnant of 0.66, not 'half'. The band's 4.5 ceiling excludes the source's own median. Both papers are model studies; no human apnoea-to-90 % data at term were found. research/28 does not cover pregnancy.
- **Better evidence:** Labour, morbid obesity and sepsis shorten the time (McClelland 2009: 98 s for labour at BMI 50). (grade B (validated physiological model; no human trials))
- **Verdict: MIS-SPECIFIED** · proposed: 3.5–6.3 min (median 4.9) at term, not in labour; 1.5–3 min only for labour plus BMI ≥ 40. Correct tables §7 23 and validation t23 (150–240 s) the same way (McClelland 2008 PMID 18289232; McClelland 2009 PMID 19317700)
- **Likely not a miss:** yes (4.82 ≈ McClelland median 4.87)

<a id="row-80"></a>

#### 80. `packages/engine-core/test/engine/resp-suite.test.ts:35` — RS1 healthy intubated, VCV 12 × 7 mL/kg IBW, man and woman: PaCO2 35–42 at 30 min, VD/VT 0.25–0.4
- **Band / stated source:** PaCO2 35–42 and VD/VT (1 − VA/VE) 0.25–0.40 at 30 min, both patients — audit §6 RS1; research/09 §7 Q1 (owner question; "Pulse's table: 0.2–0.4") [ENG]
- **Measured:** PaCO2 32.2 / 33.7; VD/VT 0.26 / 0.28
- **Source verification:** Tusman G et al. J Clin Monit Comput 2013;27:281-288, PMID 23389294 (abstract): healthy anaesthetised patients on "tidal volume (VT) of 6-8 mL/kg, respiratory rate 10-15 bpm, PEEP of 5-6 cmH₂O and FiO₂ of 0.5": "a lower Bohr dead space ratio of 0.23 (0.05) in volunteers versus 0.28 (0.05) in anesthetized patients". Miller 10e ch. 12 p. 246: "Such dead space (VD) constitutes approximately one-third of each VT"; p. 266: under anaesthesia "“anatomic” dead space is unchanged, indicating that increased VD/VT is alveolar". Miller 10e ch. 75 Table 75.4 p. 2436: adult VD/VT 0.3. No source was found for PaCO2 35–42 at 12 × 7 mL/kg IBW.
- **Band vs source:** VD/VT: yes (the anaesthetised Bohr ratio is 0.28 ± 0.05). The Enghoff ratio, which adds the effect of shunt, runs higher; compare resp-mechanics:70, whose band is 0.30–0.45. PaCO2: partly. 35–42 is a normocapnia teaching target [ENG]. With VD/VT 0.28 and VE 84 mL/kg IBW/min, PaCO2 is set by the anaesthetised VCO2: 2.3–2.9 mL/kg/min gives about 32–40 (DERIVED, PaCO2 = 0.863·VCO2/VA). The two sub-bands are coupled: at the engine's VCO2 (≈ 160–170 mL/min), PaCO2 ≥ 35 needs VD/VT ≥ ~0.32.
- **Better evidence:** Tusman 2013 for VD/VT; no direct human PaCO2 datum at this setting was found. (grade A (VD/VT, 33 + cohort) / C (PaCO2, DERIVED))
- **Verdict: TOO NARROW** · proposed: VD/VT keep 0.25–0.40 (Bohr); PaCO2 32–42. Alternatively keep 35–42 and require an anaesthetised VCO2 ≥ 2.6 mL/kg/min, but that is a separate, unsourced engine choice (Tusman 2013 PMID 23389294; Miller 10e ch. 12 pp. 246, 266; alveolar equation)
- **Likely not a miss:** partly (VD/VT 0.26–0.28 is at the Tusman mean; PaCO2 32.2 / 33.7 is inside the DERIVED 32–42 but at its floor)

<a id="row-81"></a>

#### 81. `packages/engine-core/test/engine/resp-suite.test.ts:68` — RS2 pregnancy 2.5–4.5 min (measured 4.82) and child 4 y 2–3.2 min (measured 3.38)
- **Band / stated source:** pregnancy ≤ 4.5 min; child ≤ 3.2 min (apnoea to SaO2 90 %) — audit §6 RS2; McClelland ("≈ half"); Patel 1994
- **Measured:** pregnancy 4.82; child 3.38 min
- **Source verification:** Pregnancy arm as resp-pregnancy.test.ts:19 (McClelland 2008 PMID 18289232: 4 min 52 s [3:43–6:17]). Child arm as resp-ga-state.test.ts:35 (Patel 1994 PMID 7954992: 160.4 ± 30.7 s).
- **Band vs source:** Pregnancy arm: no (the source median 4.9 min sits above the ceiling). Child arm: yes (see resp-ga-state:35).
- **Better evidence:** As the two twin rows. (grade B (pregnancy model) / A (child series))
- **Verdict: MIS-SPECIFIED** · proposed: pregnancy 3.5–6.3 min; child keep 2–3.2 min (McClelland 2008; Patel 1994)
- **Likely not a miss:** partly (pregnancy 4.82 is inside the corrected band; the child at 3.38 is ≈ +1.4 SD)

<a id="row-82"></a>

#### 82. `packages/engine-core/test/engine/resp-suite.test.ts:93` — RS3 propofol 2 mg/kg, natural airway, air: capnogram < 15 mmHg while VT < dead space
- **Band / stated source:** waveform CO2 max < 15 from 10 s after the first breath with VT < VDs — audit §6 RS3 "flat or low capnogram (EtCO2 display < 15) while VT < dead space"; Q-FU6-12; no citation
- **Measured:** 26.8 (VT/VD ratio and PaCO2 not in title)
- **Source verification:** As resp-capno-deadspace.test.ts:21 (Miller 10e ch. 37 p. 1168 Fig. 37.13; Fletcher 1981 PMID 6779846). Miller 10e ch. 12 p. 246: anatomic VD "100–150 mL".
- **Band vs source:** No. "VT < VD" takes in breaths just below VDaw, where the end-expired PCO2 is about half the alveolar value; with PaCO2 rising after induction that is 20–30 mmHg. A value under 15 is expected only for VT ≲ 0.5–0.7 VDaw (DERIVED from the equal-area definition of VDaw). The test notes that FU-4's smaller physical VDs moved the Fowler ramp, as the definition predicts.
- **Better evidence:** As row 4. (grade C (textbook definition + DERIVED))
- **Verdict: MIS-SPECIFIED** · proposed: EtCO2 ≤ 0.5 × PaCO2 with no phase-III plateau while VT ≤ VDaw; < 15 only while VT ≤ 0.5 VDaw [DERIVED/ENG] (Miller 10e ch. 37 p. 1168; Fletcher 1981)
- **Likely not a miss:** uncertain (26.8 against ~0.5 × a PaCO2 of 45–55 gives 22–28; PaCO2 not reported)

<a id="row-83"></a>

#### 83. `packages/engine-core/test/engine/resp-suite.test.ts:142` — RS5 remifentanil 0.1 µg/kg/min awake: RR 6–10; at 0.2: PaCO2 +5–15
- **Band / stated source:** RR 6–10 at 0.1 (10 min); ΔPaCO2 +5–15 after 10 min at 0.2 — audit §6 RS5; audit D1 [ENG]; no citation
- **Measured:** RR 5.58; ΔPaCO2 +13.3
- **Source verification:** Bouillon T et al. Anesthesiology 2003;99:779-787, PMID 14508307 (abstract; 10 volunteers, no inspired CO2): "F (gain of the carbon dioxide response), 4.30; ke0 carbon dioxide, 0.92 min-1; baseline Paco2, 42.4 mmHg; baseline minute ventilation, 7.06 l/min; kel,CO2, 0.08 min-1; C50 for ventilatory depression, 0.92 ng/ml; Hill coefficient, 1.25". DERIVED steady state from these parameters (Ce ≈ 2.5 and 5 ng/mL at 0.1 and 0.2 µg/kg/min): PaCO2 ≈ 57 (+15) at 0.1 and ≈ 66 (+23) at 0.2; CO2 equilibration τ ≈ 12.5 min (kel 0.08). Hsu YW et al. Anesthesiology 2004;101:1066-1076, PMID 15505441 (abstract): remifentanil infusions caused "a decrease in respiratory rate and minute ventilation, respiratory acidosis, and apnea episodes resulting in desaturations".
- **Band vs source:** Partly. No source gives a rate at 0.1 µg/kg/min. The Bouillon model puts steady-state depression of the CO2-driven ventilation at ≈ 79 % at Ce 2.5 (DERIVED), so RR ≤ 6 is within expectation for an unstimulated subject. For ΔPaCO2 at 0.2, the model gives ≈ +23 at steady state and about +15–20 after this protocol's 10 + 10 min, so the upper edge of 15 is low.
- **Better evidence:** Bouillon 2003 model; RR is preserved under painful stimulation (Wilhelm 1999, PMID 10551918: 0.25 µg/kg/min during oocyte retrieval, RR ≈ 15 ± 4). (grade B (PK/PD model fitted to 10 volunteers))
- **Verdict: TOO NARROW** · proposed: RR 4–10 at 0.1 (unstimulated); ΔPaCO2 +8–25 after 10 min at 0.2 (Bouillon 2003 PMID 14508307 (DERIVED); Hsu 2004 PMID 15505441)
- **Likely not a miss:** yes (5.58 and +13.3 inside)

<a id="row-84"></a>

#### 84. `packages/engine-core/test/engine/resp-suite.test.ts:158` — RS6 sevoflurane via SGA to ≈ 1 MAC: RR ≥ 1.4 × awake and VT ≤ 0.7 × awake
- **Band / stated source:** RR ≥ 1.4 ×, VT ≤ 0.7 × the awake values at 20 min — audit §6 RS6; D2 "tachypnoea too weak", Q-FU6-7; no citation
- **Measured:** RR 1.23 × (16.7 vs 13.6), VT 0.67 × at 0.88 MAC (propofol 2 mg/kg also given at the start)
- **Source verification:** Doi M, Ikeda K. Anesth Analg 1987;66:241-244, PMID 3826666 (abstract; 1.1 and 1.4 MAC): "tidal volume and the slopes of the CO2 response curves decreased and PaCO2 increased with increasing depth of anesthesia"; "A compensatory increase in respiratory frequency was not enough to prevent a decrease in minute volume"; "At 1.1 MAC, sevoflurane produced almost the same degree of respiratory depression as halothane". Miller 10e ch. 19 p. 445 Fig. 19.18 caption: "Most agents cause dose-dependent tachypnea, decreases in minute ventilation and tidal volume" (curve values not extractable); p. 446: "At 1 MAC of halothane, in adult humans, the tidal volume was reduced by 59%, respiratory rate was increased by 146%".
- **Band vs source:** Yes in direction, and conservative in size. At about 1 MAC of halothane, which sevoflurane matches at 1.1 MAC, VT is × 0.41 and RR × 2.46, so the band is looser than the evidence. Two flags on the test setting: the run reaches 0.88 MAC, not ≈ 1, and it adds propofol 2 mg/kg at the start.
- **Better evidence:** - (grade B (small human series; textbook))
- **Verdict: RIGHT** · proposed: keep, and assert the MAC reached (1.0–1.1); it could tighten to RR ≥ 1.5 ×, VT ≤ 0.6 × (Doi & Ikeda 1987 PMID 3826666; Miller 10e ch. 19 pp. 445–446)
- **Likely not a miss:** no (RR 1.23 × is below even this conservative floor; partly confounded by 0.88 MAC and propofol)

<a id="row-85"></a>

#### 85. `packages/engine-core/test/engine/resp-suite.test.ts:207` — RS7 untreated severe bronchospasm on VCV at FiO2 0.5: SaO2 falls ≥ 4 points
- **Band / stated source:** SaO2 fall ≥ 4 points over 15 min — audit §6 RS7 "SpO2 falls ≥ 4" (no FiO2 stated) [ENG]
- **Measured:** 99.9 → 99.7
- **Source verification:** Rodriguez-Roisin R et al. Am Rev Respir Dis 1989;139:732-739, PMID 2923373 (abstract; status asthmaticus on MV, MIGET): "a mean of 27.6 +/- 12.3% of the total perfusion present in the low VA/Q ratio units (between 0.1 and 0.005)"; "No patient had a substantial shunt (VA/Q = 0) (mean value, 1.5 +/- 2.3%)"; on 100 % O2 "PaO2, PvO2, and PaCO2 significantly rose". Westhorpe RN et al. Qual Saf Health Care 2005;14:e7, PMID 15933304 (abstract; 103 AIMS bronchospasm incidents): "Common presenting signs, in addition to wheeze, were decreased pulmonary compliance and falling oxygen saturation" (FiO2 not given).
- **Band vs source:** Partly. Falling saturation is a recognised sign. But the mechanism is low-V/Q with near-zero shunt, which supplemental O2 corrects. At FiO2 0.5, only units at VA/Q ≈ 0.005–0.01 still behave like shunt (DERIVED), so some fall is possible but its size has no source. The source row named no FiO2.
- **Better evidence:** Mechanism well characterised (MIGET); no magnitude at FiO2 0.5. (grade A (MIGET, n = 8) for mechanism; magnitude none)
- **Verdict: UNSUPPORTED** · proposed: At FiO2 0.5: SaO2 falls (≥ 1 point, direction only) [ENG]; put the ≥ 4-point fall at FiO2 ≤ 0.3 (Rodriguez-Roisin 1989 PMID 2923373; Westhorpe 2005 PMID 15933304)
- **Likely not a miss:** uncertain (a 0.2-point fall looks small with 28 % of perfusion in low-V/Q units, but there is no number to test it against)

<a id="row-86"></a>

#### 86. `packages/engine-core/test/engine/resp-suite.test.ts:218` — RS8 laryngospasm after propofol 1 mg/kg on air: pleural swing ≤ −20 cmH2O with pulsus ≥ 10 mmHg
- **Band / stated source:** swing ≤ −20 cmH2O and SBP swing ≥ 10 mmHg — audit §6 RS8; no citation
- **Measured:** swing −30.7 cmH2O (met); pulsus 8.2 mmHg; SaO2 12.8 % at 180 s
- **Source verification:** Parsons GH, Green JF. J Appl Physiol 1978;45:598-603, PMID 711577 (abstract; dogs): "Pulsus paradoxus, a greater than 10 Torr systolic pressure fluctuation during the respiratory cycle, is seen in upper airway obstruction"; during obstructed inspiration "Platm and Plvtm increased 0.5 and 0.4 Torr, respectively, per Torr decrease in Pes". Condos WR Jr et al. Circulation 1987;76:1020-1028, PMID 3664990 (abstract; 10 humans, sustained Mueller manoeuvre): "Aortic systolic and mean pressures were not significantly changed during the Mueller maneuver, in contrast to a lower diastolic (p = .019) and higher pulse pressure (p = .016)".
- **Band vs source:** Partly. "> 10" is the textbook definition of pulsus, and pulsus is reported in upper airway obstruction. No human laryngospasm data link a given swing to a given pulsus. The dog afterload slope (0.4 Torr per Torr) at −30.7 cmH2O (−22.6 mmHg) gives ≈ 9 mmHg (DERIVED, and not a direct pulsus measurement). A sustained, non-cyclic obstruction does not lower aortic systolic pressure (Condos). The engine reads the pulsus at SaO2 12.8 %, i.e. during hypoxic circulatory failure.
- **Better evidence:** - (grade C/D (definition, animal data, one human manoeuvre study))
- **Verdict: UNSUPPORTED** · proposed: pulsus ≥ 5 mmHg and rising with effort [ENG]; keep ≥ 10 only for swings ≤ −30 to −40 cmH2O, and read it before SaO2 < 60 % (owner ruling) (Parsons & Green 1978 PMID 711577; Condos 1987 PMID 3664990)
- **Likely not a miss:** uncertain (8.2 lies in the plausible zone)

<a id="row-87"></a>

#### 87. `packages/engine-core/test/engine/resp-suite.test.ts:304` — RS10 COPD severe at RR 30: a 30 s disconnection restores MAP to ≥ 85 % of the RR-10 value
- **Band / stated source:** MAP after 30 s disconnection ≥ 0.85 × MAP at RR 10 — audit §6 RS10; no citation
- **Measured:** 29.7 of 84.5 (35 %): the patient arrested before the disconnection (pre-existing on main)
- **Source verification:** Dellinger 5th ch. 10 p. 146, Fig. 10.3 caption: "A 40-second disconnection of the ventilator was associated with rising blood pressure and cardiac output despite a falling pulmonary artery wedge pressure". Coexist 8th ch. 2 p. 32: "Immediate intervention includes disconnecting the patient from the ventilator to allow for complete exhalation". Myles 1995 PMID 7718386, Rosengarten 1991 PMID 2012271 and Conacher 1998 PMID 9813506: no numbers in the abstracts.
- **Band vs source:** Partly. The direction and a 30–60 s window are supported, but "≥ 85 % of the RR-10 MAP within 30 s" appears in no located source. As run, the row cannot test this: the patient has already arrested.
- **Better evidence:** - (grade C (textbook figure, case reports))
- **Verdict: UNSUPPORTED** · proposed: MAP rises clearly (e.g. ≥ 20 % above its hyperinflated value) within 30–60 s of disconnection while PEEPtot falls toward the set PEEP [ENG; owner ruling], with a guard that the patient is not arrested beforehand (Dellinger 5th ch. 10 Fig. 10.3)
- **Likely not a miss:** no (an arrest before the manoeuvre is a real miss under any band)

<a id="row-88"></a>

#### 88. `packages/engine-core/test/engine/resp-suite.test.ts:349` — RS13 massive PE: awake RR ≥ 25 and PaCO2 ≤ 35; ventilated EtCO2 falls ≥ 10 with Pa–Et ≥ 15; mPAP 30–45
- **Band / stated source:** awake RR ≥ 25, PaCO2 ≤ 35; ventilated ΔEtCO2 ≥ 10, Pa–EtCO2 ≥ 15, mPAP 30–45 — audit §6 RS13; ESC 2019 (resp-drive-fu6 header); tables §2 H5 (McIntyre-Sasahara 1971)
- **Measured:** awake 28.2 / 33.1 (met); ventilated: arrest (CO 0, EtCO2 30.6 → 0, mPAP 11.2)
- **Source verification:** Santolicandro 1995 PMID 7599843: two-thirds of the circulation obstructed; "hypocapnic (PaCO2 = 30.0 +/- 4.1 mm Hg)"; "minute ventilation (VE) markedly increased (14.1 +/- 5.1 L/min)". Dellinger 5th ch. 42 p. 674 (UPET, massive PE): "Tachypnea and tachycardia were present in 88% and 63% of the patients"; p. 673: "obstruction must be 75% or greater to cause a mean PA pressure of 40 mm Hg or higher"; RAP rises "when the mean PA pressure is 30 mm Hg or higher and obstruction exceeds 35% to 40%". Miller 10e ch. 37 p. 1168: Table 37.2 lists pulmonary embolism under decreased PETCO2, and Box 37.2 under increased P(a-ET)CO2. Thys F et al. Resuscitation 2001;49:105-108, PMID 11334697 (case, ventilated massive PE): "the P(a-ET)CO2 gradient was raised to 25 mmHg". ESC 2019 not opened: the RR threshold is UNVERIFIED.
- **Band vs source:** Yes. Awake PaCO2 ≤ 35 matches 30 ± 4, and RR ≥ 25 fits a VE of 14 L/min (rate not reported). For mPAP, Dellinger puts ≥ 40 at ≥ 75 % obstruction, so at φ 0.6 the centre is 30–40 and 45 is a lenient ceiling. A gap ≥ 15 fits the one ventilated case (25 mmHg).
- **Better evidence:** - (grade B (small series, case, textbook))
- **Verdict: RIGHT** · proposed: keep (optionally mPAP 30–40 at φ 0.6) (Santolicandro 1995; Dellinger 5th ch. 42 pp. 673–674; Miller 10e ch. 37 p. 1168; Thys 2001)
- **Likely not a miss:** no (the ventilated arm arrests: a real miss)

<a id="row-89"></a>

#### 89. `packages/engine-core/test/engine/resp-suite.test.ts:378` — RS14 rebreathing FiCO2 8 for 20 min at fixed VCV: PaCO2 and EtCO2 +6–10 (suite asserts the floors)
- **Band / stated source:** ΔPaCO2 ≥ 6 and ΔEtCO2 ≥ 6 at 20 min — audit §6 RS14 [ENG]; owner ruling Q5 2026-10-10 (recorded, not widened)
- **Measured:** PaCO2 +6.7; EtCO2 +5.99994
- **Source verification:** As resp-inspired-co2.test.ts:27 (Chen 2004 PMID 15679128; alveolar equation).
- **Band vs source:** No: as the twin row. A floor of +6 at 20 min needs ≥ 75 % equilibration; the human datum is about 50 %.
- **Better evidence:** As the twin row. (grade B + C (DERIVED))
- **Verdict: MIS-SPECIFIED** · proposed: +3–8 at 20 min (Chen 2004 PMID 15679128; alveolar equation)
- **Likely not a miss:** yes (+6.7 / +6.0 inside 3–8)

<a id="row-90"></a>

#### 90. `docs/validation/calibration-queue.md (validation scenario t12-massive-pe)` — t12-massive-pe/pe/etco2
- **Band / stated source:** numeric EtCO2 min 20–25 over 120–140 s after `condition pe 0.6` (VCV 12 × 500, FiO2 1, PEEP 5) — tables §7 12 "within 3 breaths EtCO2 35 → 20–25"
- **Measured:** 38.0
- **Source verification:** Miller 10e ch. 12 p. 246: "with multiple pulmonary emboli, VD/VT can exceed 0.8". Miller 10e ch. 37 p. 1167 Fig. 37.12 (C): "sudden interruption in pulmonary perfusion"; p. 1168 Table 37.2: pulmonary embolism decreases PETCO2. research/03 §4.3 (LITFL / capnography.com, web): "sudden EtCO2 drop (5–20+ mmHg depending on size) with a rising Pa−Et gradient". No source found for "20–25 within 3 breaths".
- **Band vs source:** Partly. The direction, and the immediacy (the breaths right after perfusion stops), are physiological. The size is DERIVED-plausible: with 60 % of ventilated units suddenly unperfused, mixed alveolar PCO2 falls toward about 0.4–0.6 of the perfused value, partly offset by redistribution of flow and, over hours, by bronchoconstriction of unperfused units (Santolicandro). That gives 35 → ~15–25. The 20 s window (≈ 4 breaths at RR 12) also tests the numeric's update latency, not just the physiology.
- **Better evidence:** - (grade C (direction) / D (number; web source))
- **Verdict: UNSUPPORTED** · proposed: EtCO2 falls ≥ 10 mmHg (to 15–25) within 1 min, with a Pa–Et gap ≥ 10 [ENG/DERIVED]; a 60 s window keeps the numeric hold out of it (Miller 10e ch. 12 p. 246, ch. 37 pp. 1167–1168; research/03 §4.3)
- **Likely not a miss:** no (38 shows no fall in the window; S9 and obstructive-aliases show the fall later, so check numeric latency)

<a id="row-91"></a>

#### 91. `docs/validation/calibration-queue.md (validation scenario t12-massive-pe)` — t12-massive-pe/pe-late/spo2
- **Band / stated source:** SpO2 min 85–92 over 180–300 s on FiO2 1.0 — tables §7 12 "SpO2 falls to 85–92 over 1–2 min on FiO2 1.0"; tables §2 H5 (McIntyre-Sasahara 1971; R03 §4.3)
- **Measured:** 100
- **Source verification:** Santolicandro A et al. Am J Respir Crit Care Med 1995;152:336-347, PMID 7599843 (abstract; 10 patients, two-thirds of the circulation obstructed, breathing spontaneously): "hypoxemic (PaO2 = 63.0 +/- 11.7 mm Hg) and hypocapnic (PaCO2 = 30.0 +/- 4.1 mm Hg)"; "Hypoxemia was mainly explained by VA/Q inequality, reduced PvO2 also contributed"; "Shunt, diffusion limitation, or true alveolar dead space occurred in occasional patients but were generally insignificant". Huet Y et al. Chest 1985;88:829-836, PMID 4064770 (abstract; mean obstruction 55 %, PaO2 67 +/- 11): "the two patients studied early (ie, less than 48 hours following acute PE) had normal chest x-ray film findings and no significant shunt"; "Intrapulmonary shunting contributes significantly to hypoxemia only when atelectasis or another cause of lung volume loss develops". Manier G et al. Am Rev Respir Dis 1985;132:332-338, PMID 4026055 (abstract): true shunt + VA/Q < 0.01 "was 9.1%"; "the major determinant of hypoxemia in these patients ... is the fall in PVO2". Dellinger 5th ch. 42 p. 689.e7: "Acute increases in right-sided pressures can open a patent foramen ovale, causing intracardiac shunt also"; PaO2 and A-a gradient "have been reported to be normal in up to 30% of patients". McIntyre & Sasahara 1971 (PMID 5155756) has no abstract and is a haemodynamic paper; research/03 §4.3 is the capnography waveform library and holds no SpO2 figure: the H5 SpO2 figure is UNVERIFIED.
- **Band vs source:** No. Neither cited source contains this SpO2 figure. PE hypoxaemia is low-V/Q plus low PvO2, which O2 corrects; at FiO2 1.0 only shunt remains, and early shunt is "generally insignificant". SpO2 85–92 on FiO2 1.0 needs a shunt of ≈ 25–35 %, i.e. a PFO or major atelectasis. It looks like the room-air figure (PaO2 61–67) transferred to FiO2 1.0.
- **Better evidence:** As row 1. (grade A (MIGET series) / C)
- **Verdict: MIS-SPECIFIED** · proposed: SpO2 ≥ 95 on FiO2 1.0 without a PFO; 85–92 only with a PFO / right-to-left shunt option; on room air SpO2 88–93 (Santolicandro 1995; Huet 1985; Manier 1985; Dellinger 5th ch. 42 p. 689.e7)
- **Likely not a miss:** yes (100)

<a id="row-92"></a>

#### 92. `docs/validation/calibration-queue.md (validation scenario t24-edmark-fio2-1)` — t24-edmark-fio2-1/apnoea/t90
- **Band / stated source:** apnoea to SpO2 90 %: 329–493 s (411 ± 20 %) — tables §7 24 / §4.1 (Edmark 2003), ±20 % [ENG]
- **Measured:** 494 s (+1.0 SD)
- **Source verification:** Edmark L et al. Anesthesiology 2003;98:28-33, PMID 12502975 (abstract): "Thirty-six healthy, nonsmoking women were randomized to breathe 100, 80, or 60% oxygen for 5 min during the induction"; "Ventilation was then withheld until the oxygen saturation, assessed by pulse oximetry, decreased to 90%"; "411 +/- 84, 303 +/- 59, and 213 +/- 69 s". Cross-ref research/28 §1.1 row 4 and §4 (healthy adult 5.5–10 min; FiO2 0.8 / 0.6 "5 min / 3.5 min ±1.5 min").
- **Band vs source:** Partly. The means match, but ±20 % is about ±1 SD at FiO2 1.0 and 0.8 and NARROWER than ±1 SD at 0.6 (SD 69 s = 32 %). Population and protocol also differ. The validation document uses a 40 y 70 kg man, 3 min of preoxygenation and the GA lung from t = 0. Edmark studied women (smaller FRC) with 5 min of preoxygenation and a pulse-oximetry endpoint, which lags.
- **Better evidence:** Edmark SD at this FiO2 is 84 s. research/28 proposes ±1.5 min bands. (grade A (one RCT, n = 36))
- **Verdict: TOO NARROW** · proposed: 285–537 s (mean ± 1.5 SD); research/28 gives the equivalent 330–600 / 210–390 / 120–300 s (Edmark 2003 PMID 12502975; research/28 §4)
- **Likely not a miss:** yes (494 s inside 285–537 s)

<a id="row-93"></a>

#### 93. `docs/validation/calibration-queue.md (validation scenario t24-edmark-fio2-0.8)` — t24-edmark-fio2-0.8/apnoea/t90
- **Band / stated source:** apnoea to SpO2 90 %: 242–364 s (303 ± 20 %) — tables §7 24 / §4.1 (Edmark 2003), ±20 % [ENG]
- **Measured:** 385 s (+1.4 SD)
- **Source verification:** Edmark L et al. Anesthesiology 2003;98:28-33, PMID 12502975 (abstract): "Thirty-six healthy, nonsmoking women were randomized to breathe 100, 80, or 60% oxygen for 5 min during the induction"; "Ventilation was then withheld until the oxygen saturation, assessed by pulse oximetry, decreased to 90%"; "411 +/- 84, 303 +/- 59, and 213 +/- 69 s". Cross-ref research/28 §1.1 row 4 and §4 (healthy adult 5.5–10 min; FiO2 0.8 / 0.6 "5 min / 3.5 min ±1.5 min").
- **Band vs source:** Partly. The means match, but ±20 % is about ±1 SD at FiO2 1.0 and 0.8 and NARROWER than ±1 SD at 0.6 (SD 69 s = 32 %). Population and protocol also differ. The validation document uses a 40 y 70 kg man, 3 min of preoxygenation and the GA lung from t = 0. Edmark studied women (smaller FRC) with 5 min of preoxygenation and a pulse-oximetry endpoint, which lags.
- **Better evidence:** Edmark SD at this FiO2 is 59 s. research/28 proposes ±1.5 min bands. (grade A (one RCT, n = 36))
- **Verdict: TOO NARROW** · proposed: 215–392 s (mean ± 1.5 SD); research/28 gives the equivalent 330–600 / 210–390 / 120–300 s (Edmark 2003 PMID 12502975; research/28 §4)
- **Likely not a miss:** yes (385 s inside 215–392 s)

<a id="row-94"></a>

#### 94. `docs/validation/calibration-queue.md (validation scenario t24-edmark-fio2-0.6)` — t24-edmark-fio2-0.6/apnoea/t90
- **Band / stated source:** apnoea to SpO2 90 %: 170–256 s (213 ± 20 %) — tables §7 24 / §4.1 (Edmark 2003), ±20 % [ENG]
- **Measured:** 267 s (+0.8 SD)
- **Source verification:** Edmark L et al. Anesthesiology 2003;98:28-33, PMID 12502975 (abstract): "Thirty-six healthy, nonsmoking women were randomized to breathe 100, 80, or 60% oxygen for 5 min during the induction"; "Ventilation was then withheld until the oxygen saturation, assessed by pulse oximetry, decreased to 90%"; "411 +/- 84, 303 +/- 59, and 213 +/- 69 s". Cross-ref research/28 §1.1 row 4 and §4 (healthy adult 5.5–10 min; FiO2 0.8 / 0.6 "5 min / 3.5 min ±1.5 min").
- **Band vs source:** Partly. The means match, but ±20 % is about ±1 SD at FiO2 1.0 and 0.8 and NARROWER than ±1 SD at 0.6 (SD 69 s = 32 %). Population and protocol also differ. The validation document uses a 40 y 70 kg man, 3 min of preoxygenation and the GA lung from t = 0. Edmark studied women (smaller FRC) with 5 min of preoxygenation and a pulse-oximetry endpoint, which lags.
- **Better evidence:** Edmark SD at this FiO2 is 69 s. research/28 proposes ±1.5 min bands. (grade A (one RCT, n = 36))
- **Verdict: TOO NARROW** · proposed: 110–317 s (mean ± 1.5 SD); research/28 gives the equivalent 330–600 / 210–390 / 120–300 s (Edmark 2003 PMID 12502975; research/28 §4)
- **Likely not a miss:** yes (267 s inside 110–317 s)

### Section findings

**(a) Bands most likely wrong, ranked**

1. **PE hypoxaemia on oxygen**: clinical-suite:195 (S9 SaO2 < 90 at FiO2 0.5), obstructive-aliases:83 (Q15 SaO2 ≤ 92 at FiO2 0.5),
   and queue t12 pe-late/spo2 (85–92 on FiO2 1.0). The MIGET series find low-V/Q plus low PvO2 and insignificant early shunt, so oxygen
   corrects most of it. The room-air figures (PaO2 61–67) have been applied at FiO2 0.5–1.0. The cited H5 sources (McIntyre-Sasahara, a
   haemodynamic paper; R03 §4.3, a capnography table) contain no SpO2. Dependents: tables §2 H5 and §7 12, owner question Q15, and the
   tables §18 PE shunt +0.10. **Risk: raising the PE shunt to meet these bands would teach the wrong mechanism.** The correct hypoxaemia
   band is the awake room-air one (RS13's audit row "SpO2 ≤ 92 on air"; the engine reads 92.5 % there). Desaturation on O2 should come from
   a PFO option.
2. **Pregnancy apnoea**: resp-pregnancy:19 and RS2:68 (2.5–4.5 min), plus tables §7 23 and validation t23 (150–240 s, "[VERIFY]").
   McClelland 2008 gives 4 min 52 s [3:43–6:17], a ratio of 0.66 rather than "half". The research/09 §7 Q5 wording carries the same misreading.
   The engine's 4.82 is at the source median.
3. **Rebreathing +6–10 at 20 min**: resp-inspired-co2:27 and RS14:378. The band exceeds the +8 physics ceiling at fixed VA, and its floor
   needs ≥ 75 % CO2-store equilibration where Chen 2004 shows about 50 % at 20 min. The owner ruling Q5 (2026-10-10) recorded a miss of
   6 × 10⁻⁵ against this unsourced floor. FU-8 B4 and FU-7.1 B3 have moved the EtCO2 back and forth around a band that should read +3–8.
4. **Capnography below the dead space**: resp-capno-deadspace:21 (< 15 at 0.79 VDs) and RS3:93 (< 15 whenever VT < VD). VDaw is the
   midpoint of phase II, so just below VDaw about half the alveolar PCO2 still reaches the sampler. A fixed 15 mmHg is not a physical
   threshold. Dependents: Q-FU6-12, FU-4's physical VDs (127 mL), and the FU-5 numeric hold.
5. **Edmark ±20 %** (t24 ×3). The band is no wider than the trial's SD, the population differs (women, 5 min preoxygenation), and the
   endpoint is SpO2. Dependents: tables §4.1 "calibrates the Stage 3 O2 store + atelectasis together" (Q34). **Do not refit the O2 store
   or atelectasis** to pull 494/385/267 s inside ±20 %. A cross-band to note: RS2's adult band of 6.5–9.5 min (Benumof) and t24's FiO2
   1.0 band of 5.5–8.2 min describe the same scenario with different centres; research/28 resolves both to 5.5–10 min.
6. **t12 EtCO2 "35 → 20–25 within 3 breaths"**: the number is unsourced (R03 web: drop of 5–20+), and the 20 s segment partly tests the
   numeric latency. The engine meets the slower S9 and obstructive-aliases EtCO2 bands.
7. **RS5 remifentanil** (RS5:142). The upper ΔPaCO2 edge of +15 at 0.2 µg/kg/min is below the Bouillon-model steady state (≈ +23), and
   the RR 6–10 floor has no source. Dependent: audit D1, the "7f/7g opioid rate depression calibration row". It should not be tuned to
   RR ≥ 6.
8. **RS1 PaCO2 35–42** at 12 × 7 mL/kg IBW (RS1:35). The VD/VT band is right (Tusman: Bohr 0.28 ± 0.05), but the PaCO2 floor implicitly
   needs an anaesthetised VCO2 of ≥ 2.6 mL/kg/min. Dependents: FU-6 R4's −15 % GA VCO2, FU-4 R1, and the other section's resp-mechanics:70
   Enghoff band (0.30–0.45). Enghoff and Bohr VD/VT are different quantities; the two tests should name which one they mean.
9. **Induction shunt ≥ 0.07 at PEEP 5** (lung-r14:54). The floor sits at the ZEEP population mean (8–9 %). 0.04–0.12 is fairer, and the
   engine's 0.015 is a real miss either way. Dependents: tables §4.1 atelInd and the shunt map (Q34).
10. **Unsourced magnitudes**: drive stimulus +20 % (resp-drive-fu6:31; "Nunn ch. 5" not opened), RS8 pulsus ≥ 10 at −20 cmH2O, RS10's 85 %
    MAP within 30 s, and RS7's SaO2 fall ≥ 4 at FiO2 0.5. Each needs an owner ruling or a sourced number before any engine constant is
    fitted to it.

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
S9 SaO2 97.8 and Q15 97.3 (FiO2 0.5); t12 SpO2 100 (FiO2 1.0); pregnancy 4.82 min (both tests); rebreathing +6.7 / +6.0 (both tests);
capnogram 15.0 at 0.79 VDs; Edmark 494 / 385 / 267 s; remifentanil RR 5.58 and ΔPaCO2 +13.3; RS1 VD/VT 0.26 / 0.28. Partly: RS1 PaCO2
32.2 / 33.7 (at the floor of the DERIVED 32–42); child apnoea 3.38 min (≈ +1.4 SD; the displayed 3.7 min ≈ +2 SD). Still real misses
against right or corrected bands: induction shunt 0.015; child VT 15.4 mL/kg and RR 7.4 (RR is not asserted, and should be); sevoflurane RR
1.23 × (at 0.88 MAC with propofol: assert the MAC reached); the RS10 COPD and RS13 ventilated-PE arrests; t12 EtCO2 38 in the first 20 s.

**(c) Items with no source**: t12 pe/etco2 "20–25 within 3 breaths" (only a web range in R03); t12 pe-late/spo2 85–92 on FiO2 1.0 (the
cited sources contain no SpO2); the RS3 / FU-6 R5 "< 15 while VT < VD"; RS7's ≥ 4-point fall at FiO2 0.5; RS8's pulsus ≥ 10 at a given
swing; RS10's ≥ 85 % within 30 s; the stimulus VE +20 % ("Nunn ch. 5" not located); RS1's PaCO2 35–42 ([ENG], owner question 1); RS14's
+6–10 ([ENG]). Cross-reference (not rows here): the resp-induction bands that the neuro section flagged, fentanyl 2 µg/kg + propofol apnoea
60–240 s and remifentanil ≥ 90 s, are tagged "[ENG, D5; Q-FU6-1]" in the test header and have no source either. Reconciling them with the
sourced propofol–remifentanil synergy (Nieuwenhuijs 2003, ruled RIGHT) should therefore favour the synergy.

## Respiration and gas (B): mechanics, lung pathology and the ventilator link

Twenty rows. Eight are known-miss assertions in the engine mechanics, hypercapnia, ventilator-link and pleural tests. Eleven are
the KNOWN-list entries of the lung-pathology signature test, which are held by a list rather than by it.fails (the test also
applies its own tolerance: ± 0.03 for shunt, ± 1 for SpO2, ± 10 % of the upper bound otherwise). The last is the COPD GOLD 1
spirometry row. Verdicts: 10 MIS-SPECIFIED, 5 RIGHT, 3 TOO NARROW, 2 UNSUPPORTED, 0 TOO WIDE. The calibration queue has no
rows for this section. The pattern is that most bands are internally derived numbers that are inconsistent with something
else the same catalogue says, or with the measurement the test actually makes:
- Two SpO2 bands contradict their own shunt bands under standard O2-content arithmetic. Pneumonia's SpO2 88–93 % on FiO2 0.4
  needs a shunt of about 0.3, not 0.15–0.25. Moderate CF's 88–94 % on air describes severe disease (Welsner 2022: moderate
  adults average 95.8 ± 1.7).
- Three "SpO2 rises ≥ N" link bands sit against an SpO2 ceiling or come from a retired curve: ARDS PEEP 5 → 15 needs +5 from
  a 95 % baseline, and cardiogenic oedema at FiO2 0.4 needs +2 from SaO2 98.7 %.
- Two shunt bands come from catalogue extra-shunt arithmetic but are compared with total shunt (atelectasis 0.10–0.12; simple
  pneumothorax a point 0.07).
- Two compliance bands halve the whole-system Crs where only lung compliance halves: OLV 25–30 (iPROVE-OLV mean ≈ 34.5) and
  endobronchial 27.5–30.25 (Mahajan 2007: −45 ± 11 %, range 26–66 %).
- Two bands are read at a different reference than their source: COPD GOLD 3 PEEPi 4–8 was stated at VT 8 mL/kg and is read
  at 7 mL/kg; the neonatal RDS shunt is read on the 70-kg adult rig.
The bands that hold up: COPD GOLD 1, Enghoff VD/VT 0.30–0.45 (Fletcher & Jonson 1984), permissive-hypercapnia PAP ≥ +2
(Balanos 2003; Puybasset 1994), obesity shunt 0.10–0.15 (Reinius 2009; Pelosi 1999) and the OLV shunt 0.20–0.30 (Miller 10e
ch. 49 p. 1538). The obesity Pa–EtCO2 gap 5–8 is, if anything, too low (Liu 2014: 10.3 ± 2.3 mmHg).

In 9 of the 20 rows the measured engine value already sits inside the evidence band. Five more are partly inside
(VD/VT 0.28, the asthma gap, atelectasis shunt 0.16, link parity, oedema on room air) and one is uncertain (neonatal RDS).
Five are real misses against a RIGHT or tighter band: PAP +1.1, GOLD 1 FEV1 71 %, obesity gap 3.3, obesity shunt 0.05 and
OLV shunt 0.14. The last two are mainly rig artefacts (atelectasis starts at zero; the non-ventilated lung collapses by
absorption at FiO2 0.4).

Sources read: PubMed abstracts through E-utilities, the Welsner 2022 full-text tables via Europe PMC, and Miller 10e ch. 12
and ch. 49 from the local PDFs. Iso-shunt figures are derived arithmetic and are labelled as such. Not verified: the Nunn 8e
VD/VT page (not in the library), Norris 1968 shunt numbers (full text 403), the main §4.3 "×0.5" endobronchial source, the
primary GOLD report (only secondary copies seen), and any source for the tension-pneumothorax "Ppeak +10–20" (tables H6
cites [TXT] with no page).

### Rows

<a id="row-95"></a>

#### 95. `packages/engine-core/test/engine/lung-r14.test.ts:21` — Permissive hypercapnia (VCV 300 vs 500 × 12, FiO2 0.8): mean PAP ≥ +2 mmHg at 20 min
- **Band / stated source:** mean PAP rise ≥ +2 mmHg for PaCO2 +20–30 mmHg at 20–25 min — FU-6 R14: Balanos 2003; K_PVR_CO2 0.01–0.02 per mmHg
- **Measured:** +1.1 mmHg (18.1 → 19.2) at PaCO2 32.3 → 55.0
- **Source verification:** Balanos GM et al. J Appl Physiol 2003;94:1543-51, PMID 12482766 (abstract): 12 awake volunteers, 4 h euoxic hypercapnia (end-tidal PCO2 +10 Torr); "progressive changes in pressure gradient over 1-2 h"; "sensitivities of 0.6 to 1 Torr change in pressure gradient per Torr change in end-tidal Pco(2)" (tricuspid systolic gradient, Doppler). Puybasset L et al. Anesthesiology 1994;80:1254-67, PMID 8010472 (abstract): ARDS, PaCO2 38 ± 6 → 65 ± 15 mmHg by VT 655 → 330 mL; hypercapnic PVRI 525 ± 223 vs normocapnic 391 ± 122 dyn·s·cm-5·m-2 (+34 %); hypercapnic mPAP 40 ± 9; the normocapnic mPAP is not in the abstract.
- **Band vs source:** Partly. Balanos is awake, systolic (TR gradient) and 4 h; the test is anaesthetised, mean PAP, 20 min. Puybasset gives about +1.25 % PVR per mmHg PaCO2 (ARDS), inside the 0.01–0.02 constant. On a healthy rig (mPAP 18, transpulmonary gradient ≈ 8–10) +23 mmHg PaCO2 × 0.0125 → PVR +29 % → mPAP +2.3–2.9 mmHg at constant flow, plus a flow term from the hypercapnic CO rise. Balanos's sensitivity (systolic +0.6–1 mmHg/mmHg at steady state) is far larger, so even a partial response at 20 min clears +2.
- **Better evidence:** Both sources put ≥ +2 mmHg at +23 mmHg PaCO2 as a conservative floor; the time course (Balanos: 1–2 h to plateau) argues for reading at ≥ 20 min, as the test does. (grade B (small human studies: 12 volunteers, 11 ARDS patients; abstracts))
- **Verdict: RIGHT** · proposed: keep ≥ +2 mmHg at PaCO2 +20–30 (the engine's PaCO2 arm reaches +23) (Balanos 2003 PMID 12482766; Puybasset 1994 PMID 8010472)
- **Likely not a miss:** no (a real miss: +1.1 vs a conservative +2; engine reads EtCO2 + 5 into a 0.015 gain, R45 note)

<a id="row-96"></a>

#### 96. `packages/engine-core/test/engine/resp-mechanics.test.ts:70` — Healthy adult under GA, VCV 500 × 12, PEEP 5, ETT: Enghoff VD/VT 0.30–0.45
- **Band / stated source:** Enghoff VD/VT 0.30–0.45 — Nunn 8e (≈ 0.3 awake, higher under anaesthesia); glossary #165; Q-7k-5
- **Measured:** 0.28 (VD anat 77 / app 50 / alv 13 / phys 140 mL); engine computes (PaCO2 − PECO2)/(PaCO2 − PICO2) (breath.ts:109)
- **Source verification:** Fletcher R, Jonson B. Br J Anaesth 1984;56:109-19, PMID 6419753 (abstract): IPPV under anaesthesia, 58 patients, square flow + pause; "At tidal volumes of 0.45 litre (f = 17 b.p.m.), and 0.75 litre (f = 9 b.p.m.), median values for VDphys/VT were 0.44 and 0.31"; median Pa–PE'CO2 0.6 kPa (small VT) and 0.3 kPa (large VT). Tusman G et al. J Clin Monit Comput 2013;27:281-8, PMID 23389294 (abstract): anaesthetised, VT 6–8 mL/kg, RR 10–15, PEEP 5–6, FiO2 0.5: "Bohr dead space ratio of 0.23 (0.05) in volunteers versus 0.28 (0.05) in anesthetized patients". Miller 10e ch. 12 p. 246: dead space "constitutes approximately one-third of each VT". Nunn 8e page not opened (not in the local library): UNVERIFIED. Nunn & Hill 1960 PMID 14427915: no abstract.
- **Band vs source:** Yes. Fletcher's Enghoff-type VDphys/VT under IPPV brackets the rig's 500 × 12 (0.44 at 450 × 17, 0.31 at 750 × 9; ≈ 0.35–0.40 interpolated). Tusman's Bohr ratio (0.28 median, excludes the shunt effect that Enghoff includes) is a floor for Enghoff, so an Enghoff value of 0.28 sits at or below the Bohr median.
- **Better evidence:** - (grade B (two human cohorts, n 58 and ~30; abstracts) + C (Miller))
- **Verdict: RIGHT** · proposed: keep 0.30–0.45 (Enghoff, ETT + 50 mL apparatus); 0.33–0.42 would be the interpolated centre at 500 × 12 (Fletcher & Jonson 1984 PMID 6419753; Tusman 2013 PMID 23389294; Miller 10e ch. 12 p. 246)
- **Likely not a miss:** partly (0.28 misses by 0.02; equal to the Bohr median, which Enghoff should exceed)

<a id="row-97"></a>

#### 97. `packages/engine-core/test/engine/resp-mechanics.test.ts:124` — COPD GOLD 3, 65 y, VCV 490 × 14: PEEPi 4–8 cmH2O
- **Band / stated source:** PEEPi 4–8 cmH2O at VT 490 × 14 (ventRig I:E) — catalogue §5 'Auto-PEEP (test band)': VT 8 mL/kg, RR 14, I:E 1:2 → GOLD 3 4–8 (Ranieri 1993 read; main §4.3) [P]/[ENG]; R46
- **Measured:** 3.6 cmH2O (lungState 3.7)
- **Source verification:** Catalogue §5 row 'Auto-PEEP (test band)' (docs/physiology/stage-7-lung-pathology-catalogue.md): "VT 8 mL/kg, RR 14, I:E 1:2: GOLD 2 1–3; GOLD 3 4–8; GOLD 4 8–12 cmH2O". Ranieri VM et al. Am Rev Respir Dis 1993;147:5-13, PMID 8420430 (abstract): ICU COPD in acute ventilatory failure, PEEPi 9.8 ± 0.5. Bardoczky GI et al. Chest 1996;110:180-4, PMID 8681625 (abstract): elective lung resection, hyperinflated COPD, VT 10 mL/kg, RR 10, Ti/Ttot 0.33: PEEPi "in the range of 1 to 10 cm H2O" (supine and lateral). Arnal JM et al. Respir Care 2018;63:158-68, PMID 29042486 (abstract): passive COPD τexp 1.07 [0.68–2.14] s, Crs 59 [43–75], Rinsp 22 [16–33].
- **Band vs source:** No (reference ventilation). The catalogue band is stated at VT 8 mL/kg (560 mL); this test runs VT 490 (7 mL/kg). The signatures test reads the same band at the stated 560 mL / I:E 1:2 and passes (COPD is not on its KNOWN list). Trapped volume scales with VT, so 4–8 at 560 maps to ≈ 3.5–7 at 490. Ranieri's 9.8 is an acute-failure ICU population; Bardoczky's elective COPD range 1–10 is the closer population.
- **Better evidence:** Single-compartment check with Arnal's median τ 1.07 s at RR 14 (Te 2.86 s): PEEPi ≈ 0.5 cmH2O; at the upper IQR τ 2.1 s ≈ 2.5. 4–8 needs the slow-compartment tail, so the band is at the high end of elective-surgery COPD (derived, not quoted). (grade B (small human series, abstracts; band itself [ENG]))
- **Verdict: MIS-SPECIFIED** · proposed: either run at VT 560, I:E 1:2 (the band's own reference) or scale to ≈ 3.5–7 cmH2O at VT 490 (catalogue §5; Bardoczky 1996 PMID 8681625; Ranieri 1993 PMID 8420430; Arnal 2018 PMID 29042486)
- **Likely not a miss:** yes (3.6 inside the VT-scaled 3.5–7; the 560-mL signature read already passes)

<a id="row-98"></a>

#### 98. `packages/engine-core/test/l2/lung/signatures.test.ts:32` (KNOWN list, not it.fails) — asthma (acute severe, sev 1): Pa–EtCO2 gap 20–50 mmHg
- **Band / stated source:** gapPaEt 20–50 mmHg (tolerance ± 5) at VT 490 × 14, PEEP 5, FiO2 0.4 — catalogue §3 'Monitor signature': "EtCO2 30–40 while PaCO2 60–90 (gap 20–50)" [P]/[ENG] (R39-6; [TXT])
- **Measured:** 6.3 mmHg
- **Source verification:** Catalogue §3 row 'Monitor signature' and 'Permissive hypercapnia' (Tuxen 1992). Tuxen DV et al. Am Rev Respir Dis 1992;146:1136, PMID 1443862 (abstract): 10 ventilated acute severe asthmatics, initial VE 200 mL/kg/min; the 8 hypoventilated had "initial PaCO2, 63 +/- 17 mm Hg". No EtCO2 is reported. No study reporting a Pa–EtCO2 gap in ventilated severe asthma was found (web and PubMed searches); Fletcher & Jonson 1984 (PMID 6419753) note that with a steep phase III "negative (PaCO2-PE'CO2) values may be observed in the presence of alveolar deadspace".
- **Band vs source:** No. The gap is the arithmetic difference of two assumed ranges (PaCO2 60–90 under permissive hypercapnia minus EtCO2 30–40), not a measured gap, and it is pegged to the PaCO2 of a hypoventilated ICU patient, not to the reference VE 6.9 L/min. A gap scales with PaCO2 (≈ PaCO2 × alveolar dead-space fraction), and a long Te with a sloping phase III narrows it.
- **Better evidence:** None found for the gap. Tuxen's PaCO2 63 at VE ≈ 14 L/min implies a very high VD/VT, which does support a wide gap (grade C inference). (grade D (no measured source; [ENG] arithmetic))
- **Verdict: UNSUPPORTED** · proposed: re-specify as a ratio at the reference ventilation, e.g. gap/PaCO2 ≥ 0.2 or VD/VT ≥ 0.5 (as bronchospasm 1 asserts), or assert gap 20–50 only in a scenario that reaches PaCO2 60–90 (Tuxen 1992 PMID 1443862; Fletcher & Jonson 1984 PMID 6419753; catalogue §2 bronchospasm gap 10–20)
- **Likely not a miss:** partly (6.3 is probably low: the asthma preset carries no dead-space term while bronchospasm carries +0.2; but 20–50 has no source)

<a id="row-99"></a>

#### 99. `packages/engine-core/test/l2/lung/signatures.test.ts:33` (KNOWN list, not it.fails) — obesity BMI 40 (sev 1): Pa–EtCO2 gap 5–8 mmHg
- **Band / stated source:** gapPaEt 5–8 mmHg (tolerance ± 0.8) — catalogue §10 'Monitor signature': "Pa–Et gap 5–8 (atelectasis)" [ENG]
- **Measured:** 3.3 mmHg
- **Source verification:** Liu S et al. PLoS One 2014;9:e91563, PMID 24699267 (abstract): 21 patients BMI > 35, laparoscopic bariatric surgery under GA, 84 sample sets before and 30/60/120 min after pneumoperitoneum: "the average PaCO2-PetCO2 difference was 10.3 ± 2.3 mmHg (mean ± SD)"; LOA ± 4.6. Values before pneumoperitoneum are not separated in the abstract. Pelosi P et al. Anesthesiology 1999;91:1221-31, PMID 10551570 (abstract): BMI > 40 at ZEEP, PaO2 110 ± 30 at FiO2 0.5, PaCO2 37.8 ± 6.8 (no EtCO2).
- **Band vs source:** Partly. Direction right (wider than the healthy ≈ 3–5 under GA), but the only measured obese series sits above the band (mean 10.3). The catalogue's mechanism (atelectasis) is weak: a 10 % shunt adds well under 1 mmHg to PaCO2; the gap comes from low-V/Q and dead space.
- **Better evidence:** Liu 2014 mean 10.3 ± 2.3 includes capnoperitoneum time points, so the pre-insufflation mean is probably lower (≈ 6–10). (grade B (one small human cohort, abstract))
- **Verdict: TOO NARROW** · proposed: 5–12 mmHg (pre-insufflation, PEEP 5) (Liu 2014 PMID 24699267; Pelosi 1999 PMID 10551570)
- **Likely not a miss:** no (3.3 is below both the stated and the evidence band)

<a id="row-100"></a>

#### 100. `packages/engine-core/test/l2/lung/signatures.test.ts:33` (KNOWN list, not it.fails) — obesity BMI 40 (sev 1): shunt 0.10–0.15
- **Band / stated source:** shunt 0.10–0.15 (tolerance ± 0.03), read at 10 min, FiO2 0.4, PEEP 5, rig starts with no atelectasis — catalogue §10 'Atelectasis after induction': atel 0.11 → "shunt +0.10–0.15" (Reinius 2009) [P]
- **Measured:** 0.05
- **Source verification:** Reinius H et al. Anesthesiology 2009;111:979-87, PMID 19809292 (abstract): BMI 45 ± 4; "After induction of anesthesia, atelectasis increased from 1 +/- 0.5% to 11 +/- 6% of total lung volume" (5 min, ZEEP); RM + PEEP raised PaO2/FiO2 266 → 412; "PEEP alone did not reduce the amount of atelectasis or improve oxygenation". Pelosi 1999 PMID 10551570: obese PaO2 110 ± 30 vs normal 218 ± 47 at FiO2 0.5. Miller 10e ch. 12 p. 266: anaesthesia shunt 8–9 %, "increased to a mean of 15%, with large variation among patients (0% to 30%)" in older patients. Derived calculation, not a quoted source: shunt-equation iso-shunt arithmetic (Benatar/Nunn iso-shunt concept; O2 content 1.34·Hb·SO2 + 0.003·PO2, Severinghaus SO2 curve, Hb 14, PaCO2 40, a–v O2 difference 5 or 3.5 mL/dL): Pelosi's PaO2 110 at FiO2 0.5 ≈ venous admixture 0.16–0.21; normal 218 ≈ 0.06–0.09.
- **Band vs source:** Yes for the quantity (venous admixture in obese patients after induction ≈ 0.13–0.21). The rig's conditions differ from the source: Reinius measured 5 min after a high-FiO2 induction, the rig builds atelectasis from zero at FiO2 0.4 over 10 min.
- **Better evidence:** - (grade A/B (CT + gas-exchange cohorts, n 30 and 18; abstracts) + C (Miller))
- **Verdict: RIGHT** · proposed: keep 0.10–0.15 (0.10–0.20 would also fit Pelosi); start the rig from the induced state, as the KNOWN comment says (Reinius 2009 PMID 19809292; Pelosi 1999 PMID 10551570; Miller 10e ch. 12 p. 266)
- **Likely not a miss:** no (real miss, partly a rig artefact: atelectasis starts at 0 at FiO2 0.4)

<a id="row-101"></a>

#### 101. `packages/engine-core/test/l2/lung/signatures.test.ts:34` (KNOWN list, not it.fails) — pneumonia (lobar, sev 0.4): SpO2 88–93 % on FiO2 0.4
- **Band / stated source:** SpO2 88–93 % at FiO2 0.4 (tolerance ± 1), with the same preset's shunt band 0.15–0.25 — catalogue §11 'Monitor signature': "SpO2 88–93 % on FiO2 0.4, little FiO2 response" [ENG] (R39-6; [ENG])
- **Measured:** 96.8 % (shunt inside 0.15–0.25 ± 0.03, not on the KNOWN list)
- **Source verification:** Catalogue §11 rows 'Shunt' ≈ 0.15–0.25 (Cooligan 1982, canine 24 %) and 'Monitor signature' [ENG]. Derived calculation, not a quoted source: shunt-equation iso-shunt arithmetic (Benatar/Nunn iso-shunt concept; O2 content 1.34·Hb·SO2 + 0.003·PO2, Severinghaus SO2 curve, Hb 14, PaCO2 40, a–v O2 difference 5 or 3.5 mL/dL). Total venous admixture → SaO2 at FiO2 0.4: 0.10 → 98.7/99.3; 0.15 → 97.4/98.5; 0.20 → 95.7/97.5; 0.25 → 93.7/96.1; 0.30 → 91.2/94.5; 0.35 → 88.4/92.6 %. At FiO2 0.21: 0.10 → 95.3/96.1; 0.15 → 93.7/95.0; 0.25 → 89.7/92.2 %. At FiO2 0.6: 0.17 → ≈ 98.6; 0.24 → 96.3/98.4; 0.30 → 93.6/96.7 %.
- **Band vs source:** No. The SpO2 band contradicts the shunt band of the same preset: at FiO2 0.4 a total admixture of 0.15–0.25 gives SaO2 ≈ 93.7–98.5 %; SpO2 88–93 needs ≈ 0.27–0.36. The SpO2 number is tagged [ENG] with no source.
- **Better evidence:** Iso-shunt arithmetic (grade C, standard physiology). No clinical series of SpO2 on FiO2 0.4 in ventilated lobar pneumonia was searched for. (grade C (derived from standard O2-content physiology))
- **Verdict: MIS-SPECIFIED** · proposed: SpO2 94–98 % at FiO2 0.4 for shunt 0.15–0.25; or keep 88–93 and raise the shunt band to 0.27–0.35 (one or the other) (catalogue §11; iso-shunt arithmetic (Benatar/Nunn concept))
- **Likely not a miss:** yes (96.8 inside 94–98, consistent with its in-band shunt)

<a id="row-102"></a>

#### 102. `packages/engine-core/test/l2/lung/signatures.test.ts:35` (KNOWN list, not it.fails) — atelectasis (lobar collapse, mucus plug, sev 0.4): shunt 0.10–0.12
- **Band / stated source:** shunt 0.10–0.12 total (tolerance ± 0.03), read at 10 min, FiO2 0.4 — catalogue §12 'Lobar collapse: shunt': atel × perfusion share × (1 − hpvRegional 0.5) → lower lobe ≈ 0.10–0.12 after HPV (main §4.2) [TXT]
- **Measured:** 0.16 (ATEL_PERF 1.0, R46)
- **Source verification:** Benumof JL. J Appl Physiol 1979;46:1047, PMID 468621 (abstract, canine): "Selective atelectasis of the left lower lobe caused the electromagnetically measured lobar blood flow to decrease 59% from control levels", the mechanism being HPV. Miller 10e ch. 12 p. 266: anaesthesia shunt 8–9 %, up to 15 % (0–30 %) in older patients. Catalogue's own arithmetic: lobe 0.2 of lung × 0.5.
- **Band vs source:** Partly. The arithmetic (0.2 × 0.5) gives the EXTRA shunt; the signature reads TOTAL shunt, so the healthy baseline (≈ 0.02 in this engine; 0.05–0.10 under GA in Miller) is not counted. A 0.02-wide band on a biological quantity with large variance is too narrow.
- **Better evidence:** Benumof's −59 % flow (no volatile) with a lower-lobe perfusion share of 0.2–0.25 → extra shunt 0.08–0.10; with 1 MAC volatile (≈ 20 % HPV inhibition, Miller ch. 49 p. 1538) 0.10–0.13; plus baseline → total ≈ 0.10–0.16. (grade B (consistent animal data) + C)
- **Verdict: TOO NARROW** · proposed: total shunt 0.10–0.16 at 10 min, FiO2 0.4 (Benumof 1979 PMID 468621; Miller 10e ch. 12 p. 266, ch. 49 p. 1538)
- **Likely not a miss:** partly (0.16 at the top edge of 0.10–0.16)

<a id="row-103"></a>

#### 103. `packages/engine-core/test/l2/lung/signatures.test.ts:36` (KNOWN list, not it.fails) — simple pneumothorax (30 %, sev 0.3): shunt 0.07
- **Band / stated source:** shunt 0.07 point band (tolerance ± 0.03 → 0.04–0.10) — catalogue §15 'Shunt': collapsed fraction × perfusion × (1 − HPV 0.5) → ≈ 0.07 (main §4.2) [TXT]; collapsed fraction row [ENG]
- **Measured:** 0.12
- **Source verification:** Norris RM, Jones JG, Bishop JM. Thorax 1968;23:427-33, PMID 5664705 (abstract): 12 spontaneous pneumothoraces; PaO2 < 80 mmHg on air in 9; "positive correlation between the size of the anatomical shunt and the extent of the pneumothorax"; the fall in PaO2 "could be fully accounted for by the increased anatomical shunt". Shunt values by size are in the full text (PMC471812), which could not be opened (403): numbers UNVERIFIED.
- **Band vs source:** No. (1) The 0.07 is the arithmetic EXTRA shunt (0.15 × 1 × 0.5) compared with the TOTAL shunt; (2) the 'collapsed fraction = size × 0.5' input is [ENG]; (3) a point band. Norris's PaO2 < 80 on air in 9 of 12 implies total admixture ≥ ≈ 0.10 (iso-shunt) in most spontaneous pneumothoraces.
- **Better evidence:** Norris 1968 (direction and size-dependence; numbers not read). (grade B (small human series, abstract only) + C)
- **Verdict: MIS-SPECIFIED** · proposed: total shunt 0.07–0.15 at size 0.3 (Norris 1968 PMID 5664705; catalogue §15; iso-shunt arithmetic)
- **Likely not a miss:** yes (0.12 inside 0.07–0.15)

<a id="row-104"></a>

#### 104. `packages/engine-core/test/l2/lung/signatures.test.ts:37` (KNOWN list, not it.fails) — OLV (lateral, DLT): Crs 25–30 mL/cmH2O
- **Band / stated source:** Crs 25–30 (tolerance ± 3) — catalogue §22 'Ventilated lung mechanics': ≈ 0.5 × two-lung Crs (Miller 10e ch. 49 p. 1539) [TXT]
- **Measured:** 33.9 (shared chest wall, decision 1)
- **Source verification:** Miller 10e ch. 49 p. 1534: "The compliance curves of the two lungs are different because of their difference in sizes. The lateral position, anesthesia, paralysis, and opening the thorax all combine to magnify these differences" (no ×0.5 number located in the extracted text). Carramiñana A et al. Anaesth Crit Care Pain Med 2026, PMID 42772414 (abstract, iPROVE-OLV secondary, n 645 on individualised PEEP): during OLV PEEP ≈ 5.1, Pplat 18.6–18.9, ΔP 13.5–13.7 ± 4.7–5.2, "dynamic compliance (34.70±14.19 vs. 34.37 ± 12.29 ml/cmH2O" (VATS vs thoracotomy).
- **Band vs source:** No. Halving applies to LUNG compliance; the chest wall of the ventilated side is not halved, so whole-system Crs falls by less than half (healthy CL ≈ 76, Ccw 200: CL/2 → Crs ≈ 32). The band halves the whole-system 55.
- **Better evidence:** iPROVE-OLV: mean OLV compliance ≈ 34.5 ± 13 mL/cmH2O (after recruitment, individualised PEEP; 'dynamic' as reported). (grade A (large RCT cohort, abstract) + C)
- **Verdict: MIS-SPECIFIED** · proposed: Crs 25–40 mL/cmH2O on OLV at PEEP 5 (Carramiñana 2026 PMID 42772414; Miller 10e ch. 49 p. 1534)
- **Likely not a miss:** yes (33.9 inside 25–40)

<a id="row-105"></a>

#### 105. `packages/engine-core/test/l2/lung/signatures.test.ts:37` (KNOWN list, not it.fails) — OLV (lateral, DLT): shunt 0.20–0.30 at FiO2 0.4 after 30 min
- **Band / stated source:** shunt 0.20–0.30 (tolerance ± 0.03), FiO2 0.4, read at 30 min — catalogue §22 'Non-ventilated lung perfusion share': shunt during OLV 20–30 % (Miller 10e ch. 49 p. 1538) [TXT]
- **Measured:** 0.14 (collapse τ ≈ 30 min at FiO2 0.4)
- **Source verification:** Miller 10e ch. 49 p. 1538: "Since even with optimal anesthetic management there is usually a shunt of 20% to 30% during OLV, it is very important to maintain cardiac output"; p. 1509: "there is an obligate 20% to 30% shunt through the nonventilated lung".
- **Band vs source:** Yes for the quantity. The setting differs: clinically the non-ventilated lung collapses within minutes once the chest is opened (and suction is applied); the rig relies on absorption at FiO2 0.4 (τ ≈ 30 min), so at 30 min the lung is only partly collapsed.
- **Better evidence:** - (grade C (textbook consensus))
- **Verdict: RIGHT** · proposed: keep 0.20–0.30; read it after the non-ventilated lung has collapsed (open-chest/surgical collapse), not by absorption at FiO2 0.4 (Miller 10e ch. 49 pp. 1509, 1538)
- **Likely not a miss:** no (real miss, mainly a rig-timing artefact)

<a id="row-106"></a>

#### 106. `packages/engine-core/test/l2/lung/signatures.test.ts:38` (KNOWN list, not it.fails) — endobronchial intubation (right mainstem): Crs 27.5–30.25
- **Band / stated source:** Crs 27.5–30.25 (tolerance ± 3) — catalogue §23 'Compliance': ×0.5–0.55 of 55 (main §4.3) [TXT]
- **Measured:** 34.0 (×0.62; shared chest wall)
- **Source verification:** Mahajan A et al. Anesth Analg 2007 Jul, PMID 17578956 (abstract): 40 children 1 mo–6 y; "Endobronchial intubation decreased measured pulmonary compliance by 45 +/- 11% (mean +/- sd; P < 0.001, Range 26%-66%)"; peak pressure +26 ± 17 % (0–87). The main §4.3 '×0.5' source page was not located: UNVERIFIED.
- **Band vs source:** Partly. ×0.5–0.55 is the paediatric MEAN (×0.55), and children have a very compliant chest wall, so their Crs fall is close to the lung fall. In adults the stiffer chest wall makes the whole-system fall smaller. The band leaves out the individual range (×0.34–0.74).
- **Better evidence:** Mahajan 2007 (children); no adult series found. (grade B (one human cohort, children; abstract))
- **Verdict: TOO NARROW** · proposed: Crs ×0.45–0.75 → 25–41 mL/cmH2O (adult, PEEP 5) (Mahajan 2007 PMID 17578956)
- **Likely not a miss:** yes (34.0 inside 25–41)

<a id="row-107"></a>

#### 107. `packages/engine-core/test/l2/lung/signatures.test.ts:39` (KNOWN list, not it.fails) — cystic fibrosis moderate (sev 0.67, FEV1 40–69 %): SpO2 88–94 % on air
- **Band / stated source:** SpO2 88–94 % at FiO2 0.21 (tolerance ± 1) — catalogue §26 'Monitor signature': SpO2 88–94 % on air [ENG] (R39-6; [ENG])
- **Measured:** 95.4 %
- **Source verification:** Welsner M et al. BMC Pulm Med 2022, PMID 36437445, full text Table 2 (Europe PMC PMC9703664): 52 adults, ppFEV1 52.1 ± 14.8; "Awake SpO2, % | 95.8 ± 1.7 (91.0–98.0)"; awake pO2 78.6 ± 9.4 mmHg. Table 4: with nocturnal hypoxaemia (ppFEV1 43.5 ± 13.0) awake SpO2 95.0 ± 1.8; without (55.0 ± 14.4) 96.1 ± 1.6.
- **Band vs source:** No. 88–94 % fits severe CF (FEV1 < 40 %) or exacerbation; moderate CF adults at rest average ≈ 96 % (range 91–98). Caveat: awake spontaneous breathing vs the passive ventilated rig.
- **Better evidence:** Welsner 2022 is the moderate-severity reference. (grade B (one human cohort, n 52, full-text table))
- **Verdict: MIS-SPECIFIED** · proposed: SpO2 93–98 % on air for moderate CF (keep 88–94 for severe, sev 1) (Welsner 2022 PMID 36437445 Table 2/4)
- **Likely not a miss:** yes (95.4 inside 93–98)

<a id="row-108"></a>

#### 108. `packages/engine-core/test/l2/lung/signatures.test.ts:40` (KNOWN list, not it.fails) — neonatal RDS (1.5 kg, 30 wk, moderate): shunt 0.20–0.40, read on the ADULT rig
- **Band / stated source:** shunt 0.20–0.40 (tolerance ± 0.03) on the 70-kg reference rig (VT 490 × 14) — catalogue §30 'Shunt': intrapulmonary 0.2–0.4 (+ ductal 0–0.3) [TXT]/[ENG]; the data row says "reference is neonatal, not the adult 70 kg frame"
- **Measured:** 0.16 (adult rig; neonatal profile awaits R22)
- **Source verification:** Kaltsogianni O et al. J Perinat Med 2024, PMID 38488252 (abstract): ventilated preterm infants, GA 27 (23.7–30.7) wk, non-invasive ODC method: baseline "median shunt percentage" 8 (range 7–9) %. Dassios T et al. Respir Physiol Neurobiol 2023, PMID 37647975 (abstract): 75 ventilated preterm infants (26.4 wk) — impairment expressed as shunt plus right shift (low VA/Q); no shunt mean in the abstract. The catalogue's 0.2–0.4 has no located source: UNVERIFIED.
- **Band vs source:** No. A neonatal band is asserted on an adult rig (adult VT, FRC, chest wall), which the data file itself says is the wrong frame. Modern (surfactant-era) ODC data put intrapulmonary shunt in ventilated preterm infants near 0.08, with low V/Q carrying most of the oxygenation defect.
- **Better evidence:** Kaltsogianni 2024; Dassios 2023 (shunt + V/Q split). (grade B (small human cohorts, abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: remove from the adult signature run; on the R22 neonatal rig assert shunt ≈ 0.05–0.25 plus a low-V/Q (right-shift) term (Kaltsogianni 2024 PMID 38488252; Dassios 2023 PMID 37647975)
- **Likely not a miss:** uncertain (adult rig; the neonatal value is not measured)

<a id="row-109"></a>

#### 109. `packages/engine-core/test/l2/lung/volumes.test.ts:82` — COPD GOLD 1 (sev 0.25): FEV1 ≥ 80 % pred with FEV1/FVC < 0.70
- **Band / stated source:** FEV1 ≥ 80 % predicted and FEV1/FVC < 0.70 — GOLD grades (catalogue §5, GOLD 2023 read); Q-7k-2
- **Measured:** FEV1 71 % (ratio 0.61)
- **Source verification:** Catalogue §5 intro: "GOLD 2023 defines COPD by post-bronchodilator FEV1/FVC < 0.7 and grades it by FEV1 (the usual cut-offs are ≥ 80 / 50–79 / 30–49 / < 30 % predicted)". GOLD report itself not opened; secondary copies (GPnotebook) give GOLD 1 mild FEV1 ≥ 80 % predicted. Primary report: UNVERIFIED this session.
- **Band vs source:** Yes (the band is the definition of GOLD 1). 71 % is GOLD 2.
- **Better evidence:** - (grade C (guideline definition))
- **Verdict: RIGHT** · proposed: keep (GOLD 2023–2025 spirometric grades)
- **Likely not a miss:** no (the severity-0.25 preset produces GOLD 2 spirometry)

<a id="row-110"></a>

#### 110. `packages/ventilator/test/link-parity.test.ts:69` — link parity in bronchospasm 1 at 20 min: PaCO2/EtCO2 within 3 mmHg, SpO2 2 %, Pplat and VT within 10 %
- **Band / stated source:** |link − engine| PaCO2 ≤ 3, EtCO2 ≤ 3 mmHg, SpO2 ≤ 2 %, Pplat and VT ≤ 10 % at 10 and 30 min — RS15 / FU-6 R7 [ENG] (parity between two code paths, not a physiology band)
- **Measured:** 30 min: PaCO2 59.2 vs 39.6, EtCO2 40.7 vs 23.8, VT 238 vs 476, Pplat 13.5 vs 25.9 (both at Pmax 40)
- **Source verification:** No external source needed: an engineering parity tolerance. The file's own comment states that the link drives VC with a square 60 L/min flow + pause 0.3 s while the engine uses VT/Ti ≈ 18 L/min.
- **Band vs source:** No (test conditions). Parity presumes identical settings, but the two paths use different inspiratory flows. With R ≈ 60 cmH2O·s/L in bronchospasm, a 1 L/s square flow hits Pmax 40 at once and delivers little volume in a short Ti, while 18 L/min keeps filling at Pmax for 1.7 s. In the healthy arm the flow difference is absorbed (plateau and VT are flow-independent); under Pmax limiting it is not. The tolerances themselves are reasonable.
- **Better evidence:** - (grade [ENG] (no clinical grade applies))
- **Verdict: MIS-SPECIFIED** · proposed: match the link's vcFlow/pause to the engine's Ti (the file's own V.1 TODO), then keep 3 / 3 / 2 % / 10 % (link-parity.test.ts F5b comment; RS15)
- **Likely not a miss:** partly (the gap is mostly the flow-pattern difference; the residual after matching is unknown)

<a id="row-111"></a>

#### 111. `packages/ventilator/test/link-r27.test.ts:81` — ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 ≥ +5 over 1–4 min, falls > 3 within 60 s of PEEP 5
- **Band / stated source:** SpO2 +5 points within 4 min of PEEP 15; SpO2 −3 within 60 s of PEEP 5; CO falls — Stage V interim link recruitment curve (logistic PEEP → shunt, τ 40/10 s), retired at V.1; calibration row "ARDS link band: re-derive from 7b's recruitment"
- **Measured:** SpO2 95.0 → 97.0 (+2.0) at PEEP 15; 97.0 → 97.0 (0.0) 60 s after PEEP 5
- **Source verification:** Chiumello D et al. Intensive Care Med 2013;39:1377-85, PMID 23740279 (abstract): ARDS, PEEP 5/10/15 steps; "When PEEP was decreased, PaO2, PaO2/FiO2, venous admixture and arterial oxygen saturation reached their equilibrium after 5'. In contrast, when PEEP was increased, the equilibrium was not reached even after 60'". Gattinoni L et al. NEJM 2006;354:1775, PMID 16641394 (abstract): recruitable lung 13 ± 11 % of lung weight, "extremely variable". R46 (research/00): PEEP-alone shunt −21 % in moderate ARDS accepted (RM + PEEP −42 %). Derived calculation, not a quoted source: shunt-equation iso-shunt arithmetic (Benatar/Nunn iso-shunt concept; O2 content 1.34·Hb·SO2 + 0.003·PO2, Severinghaus SO2 curve, Hb 14, PaCO2 40, a–v O2 difference 5 or 3.5 mL/dL). At FiO2 0.6: admixture 0.30 → SaO2 93.6/96.7; 0.24 → 96.3/98.4; 0.17 → ≈ 98.6 %.
- **Band vs source:** No. (1) The band was fitted to a retired engine curve, not to a source. (2) SpO2 +5 from a 95 % baseline is impossible (ceiling), and from the profile's shunt 0.30 at FiO2 0.6 a PEEP-alone fall of 21 % (R46) gives +1.7–2.7 points; +5 needs a ≈ 43 % fall, the RM + PEEP response. (3) Time: recruitment after a PEEP rise is still incomplete at 60 min (Chiumello), and de-recruitment is complete by 5 min (first sample), so neither the 1–4 min nor the 60 s window is sourced.
- **Better evidence:** Chiumello 2013 (time course); R46 (size). (grade A/B (human ARDS studies, n 44 and 68; abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: re-specify on shunt/PaO2: venous admixture −15–30 % (or SpO2 +1.5–3 from 95 % at FiO2 0.6) by 5–15 min of PEEP 15; SpO2 falls back within 5 min of PEEP 5; keep CO falls (Chiumello 2013 PMID 23740279; Gattinoni 2006 PMID 16641394; R46; iso-shunt arithmetic)
- **Likely not a miss:** yes (+2.0 inside +1.5–3; the 60-s non-fall is untestable against a 5-min source)

<a id="row-112"></a>

#### 112. `packages/ventilator/test/link-r27.test.ts:128` — cardiogenic oedema PEEP 5 → 12, FiO2 0.4: SpO2 ≥ +2 (describe 'cardiogenic oedema PEEP 5 → 12 (Stage V.1)')
- **Band / stated source:** SpO2 rise ≥ 2 points, read 2.5–3 min after PEEP 12, FiO2 0.4 — Stage V.1 re-specification (G7b ruling 4+5+13, NR-3); catalogue §13 'PEEP / CPAP response': strong, shunt ×(1 − 0.04·PEEP) [TXT]/[ENG]
- **Measured:** SpO2 98 → 98 (SaO2 98.7 → 99.1); the sibling mechanism check (shunt fall ≥ 25 %, PCWP falls) passes
- **Source verification:** Bersten AD et al. NEJM 1991;325:1825-30, PMID 1961221 (abstract): severe cardiogenic oedema, CPAP by mask: PaO2/FiO2 "from 138 +/- 32 to 206 +/- 126" at 30 min (O2 alone 136 → 126). Derived calculation, not a quoted source: shunt-equation iso-shunt arithmetic (Benatar/Nunn iso-shunt concept; O2 content 1.34·Hb·SO2 + 0.003·PO2, Severinghaus SO2 curve, Hb 14, PaCO2 40, a–v O2 difference 5 or 3.5 mL/dL). Total venous admixture → SaO2 at FiO2 0.4: 0.10 → 98.7/99.3; 0.15 → 97.4/98.5; 0.20 → 95.7/97.5; 0.25 → 93.7/96.1; 0.30 → 91.2/94.5; 0.35 → 88.4/92.6 %. At FiO2 0.21: 0.10 → 95.3/96.1; 0.15 → 93.7/95.0; 0.25 → 89.7/92.2 %. At FiO2 0.6: 0.17 → ≈ 98.6; 0.24 → 96.3/98.4; 0.30 → 93.6/96.7 %.
- **Band vs source:** No. With the oedema shunt in the catalogue's 0.10–0.25 range, SaO2 at FiO2 0.4 is already 93.7–99.3 %, and the profile starts at 98.7 %, so a +2-point rise is impossible (ceiling). Bersten's patients were spontaneously breathing with P/F ≈ 138, a far sicker state than this profile; the 3-min reading time is also shorter than Bersten's 30 min.
- **Better evidence:** Bersten 1991: P/F +49 % at 30 min with CPAP 10 in severe oedema. (grade A (RCT, n 39, abstract) + C)
- **Verdict: MIS-SPECIFIED** · proposed: drop the SpO2 band at FiO2 0.4 (keep the passing shunt/PCWP check), or assert PaO2/FiO2 +30–50 % at ≥ 10 min in a profile with P/F < 200 (Bersten 1991 PMID 1961221; iso-shunt arithmetic)
- **Likely not a miss:** yes (no rise is physically available at SaO2 98.7)

<a id="row-113"></a>

#### 113. `packages/ventilator/test/link-r27.test.ts:132` — cardiogenic oedema PEEP 5 → 12, room air: SpO2 ≥ +2 (same describe)
- **Band / stated source:** SpO2 rise ≥ 2 points at FiO2 0.21, read 2.5–3 min after PEEP 12 — Stage V.1 orchestrator ruling (V.1 review) 3; catalogue §13 [TXT]/[ENG]
- **Measured:** SpO2 94.0 → 95.0 (SaO2 94.9 → 95.5) as shunt 0.15 → 0.10
- **Source verification:** Bersten 1991 PMID 1961221 (as previous row). Derived calculation, not a quoted source: shunt-equation iso-shunt arithmetic (Benatar/Nunn iso-shunt concept; O2 content 1.34·Hb·SO2 + 0.003·PO2, Severinghaus SO2 curve, Hb 14, PaCO2 40, a–v O2 difference 5 or 3.5 mL/dL). Total venous admixture → SaO2 at FiO2 0.4: 0.10 → 98.7/99.3; 0.15 → 97.4/98.5; 0.20 → 95.7/97.5; 0.25 → 93.7/96.1; 0.30 → 91.2/94.5; 0.35 → 88.4/92.6 %. At FiO2 0.21: 0.10 → 95.3/96.1; 0.15 → 93.7/95.0; 0.25 → 89.7/92.2 %. At FiO2 0.6: 0.17 → ≈ 98.6; 0.24 → 96.3/98.4; 0.30 → 93.6/96.7 %.
- **Band vs source:** Partly. On air a shunt fall 0.15 → 0.10 should give SaO2 +1.1–1.6 points (iso-shunt), so +2 is above what this profile's own shunt change can produce; +2 would need a baseline shunt ≥ 0.20 (P/F ≈ 200). The engine's +0.6 SaO2 is below the iso-shunt expectation, so there is also a small real gap.
- **Better evidence:** Bersten 1991 (P/F +49 %, severe oedema, 30 min). (grade A (RCT, abstract) + C)
- **Verdict: MIS-SPECIFIED** · proposed: for shunt 0.15 → 0.10 on air: SaO2 +1–2 points; or re-base on a sicker profile (shunt ≥ 0.20) and assert P/F +30–50 % at ≥ 10 min (Bersten 1991 PMID 1961221; iso-shunt arithmetic)
- **Likely not a miss:** partly (SpO2 +1 is inside +1–2; SaO2 +0.6 is just below)

<a id="row-114"></a>

#### 114. `packages/ventilator/test/pleural.test.ts:37` — tension pneumothorax reference run: Ppeak rises 10–20 cmH2O over normal
- **Band / stated source:** Ppeak rise +10–20 cmH2O (VC 490 × 14, pPtx 20 mmHg at sev 0.8) — tables §2 H6 [TXT] (no page), governs over catalogue §16 'Airway pressure' ("main §2.3 H6", [ENG]) per orchestrator ruling V.1 review 1
- **Measured:** +21.6 (45.4 vs 23.8)
- **Source verification:** Tables row H6 (docs/physiology/stage-7-parameter-tables.md:215) tags the row [TXT] without a book or page; catalogue §16 tags the same number [ENG]. No textbook statement of a Ppeak rise was found in Miller 10e ch. 37 / 62 / 79 or Dellinger 5e ch. 45 (text search), and PubMed searches for ventilated tension-pneumothorax airway-pressure data found none. Roberts 2015 (cited for the ventilated/spontaneous difference) was not re-read. UNVERIFIED.
- **Band vs source:** Unknown: no source located. A physics check (derived, not quoted): with the ipsilateral lung collapsed, VT 490 into one lung roughly doubles ΔP (+≈ 9 cmH2O) and the contralateral pleural pressure rises with mediastinal shift (+5–15), so +14–24 is plausible; +21.6 is inside that.
- **Better evidence:** - (grade D (no source; engineering arithmetic only))
- **Verdict: UNSUPPORTED** · proposed: assert a floor only (Ppeak +≥ 10 cmH2O) until a source is found, or +10–25 [ENG] (tables H6; catalogue §16; derived single-lung arithmetic)
- **Likely not a miss:** yes (likely; +21.6 is inside the derived +14–24)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **link-r27:81, ARDS PEEP 5 → 15 SpO2 ≥ +5 in 1–4 min, −3 within 60 s.** This band was fitted to the interim
   logistic-recruitment curve retired at V.1, not to a source. From the profile's baseline (SpO2 95, shunt 0.30 at FiO2 0.6),
   +5 needs a shunt fall of ≈ 43 %, which is the RM + PEEP response. R46 accepted −21 % for PEEP alone, and that gives
   +1.7–2.7, matching the measured +2.0. Chiumello 2013: oxygenation after a PEEP rise is still not at equilibrium at 60 min,
   and de-recruitment is complete by 5 min. Dependents: the calibration row "ARDS link band: re-derive from 7b's recruitment"
   (orchestrator ruling V.1 review 2), the catalogue §6 'PEEP up' signature, and the R27 demo narrative.
2. **signatures pneumonia spo2Fio2_04 88–93 %.** It contradicts the preset's own shunt band 0.15–0.25, which gives SaO2
   ≈ 94–98 % at FiO2 0.4. Dependents: catalogue §11 'Monitor signature' [ENG], and the Q79 note in the KNOWN comment (halving
   HPV would push the shunt out of its own band to chase this number).
3. **link-r27:128 and :132, cardiogenic oedema SpO2 ≥ +2.** At FiO2 0.4 the baseline SaO2 is 98.7, so the rise is impossible.
   On air the profile's own shunt fall (0.15 → 0.10) supports only +1–1.6. Bersten 1991's P/F +49 % is for a far sicker
   spontaneously breathing population, at 30 min. Dependents: E-V1-2 (tables §4.5 shunt ×(1 − 0.04·PEEP)), NR-3, and the
   orchestrator ruling (V.1 review) 3.
4. **signatures olv crs 25–30 and endobronchial crs 27.5–30.25.** Both apply "×0.5 lung" to the whole respiratory system with
   a shared chest wall. iPROVE-OLV measured ≈ 34.5 ± 13 on OLV; Mahajan 2007 measured −45 ± 11 % (26–66) in children. The
   engine's 33.9 / 34.0 fit the evidence. Dependents: catalogue §22/§23, main §4.3 endobronchial C ×0.5, and "decision 1"
   (shared chest wall) — the evidence supports keeping that decision.
5. **signatures cf spo2Fio2_021 88–94 %.** This is a severe-disease number on the moderate grade (Welsner 2022: 95.8 ± 1.7 at
   ppFEV1 52). Dependents: catalogue §26 'Monitor signature' [ENG].
6. **resp-mechanics:124, COPD GOLD 3 PEEPi 4–8 at VT 490.** The band is stated at VT 560 / I:E 1:2, and the signatures test
   already reads it there and passes. Dependents: R46 (GOLD 3 bands), the link-r27 6–12 at RR 20 row (passes), and the
   7b lung's tauSlow/fSlow constants (Q19), which were tuned so that auto-PEEP lands in this band.
7. **signatures ptxSimple shunt 0.07 and atelectasis shunt 0.10–0.12.** Both are extra-shunt arithmetic compared with total
   shunt, and both are near-point bands. Evidence: Norris 1968 (pneumothorax hypoxaemia fully explained by shunt); Benumof
   1979 (−59 % lobar flow). Dependents: main §4.2 HPV share, catalogue §12/§15, and R46 "collapsed-lung perfusion factor 1.0".
8. **signatures neonatalRds shunt 0.2–0.4 on the adult rig.** This is the wrong frame, as the data row itself says. Modern
   ODC data (Kaltsogianni 2024) put preterm intrapulmonary shunt near 0.08, with low V/Q dominant. Dependents: R22 (neonatal
   profile), Q90.
9. **signatures asthma gapPaEt 20–50 (UNSUPPORTED)** and **pleural:37 tension Ppeak +10–20 (UNSUPPORTED).** Neither number
   was found in a source. The gap is PaCO2 60–90 minus an assumed EtCO2 30–40, pegged to permissive hypercapnia rather than
   the reference VE. Ppeak +10–20 is tagged [TXT] in tables H6 but [ENG] in catalogue §16, with no page. Dependents: the
   catalogue §3 monitor signature; tables H6 and §7 13 (the tension scenario script), the calibration row "tension Ppeak vs
   crs ×0.5", and the 7b tension crs ×0.5 choice.
10. **signatures obesity gapPaEt 5–8 (TOO NARROW).** The only obese series (Liu 2014) averages 10.3 ± 2.3. The engine's 3.3
    is a real miss either way. Dependents: catalogue §10 'Monitor signature'; FU-8's body-size rule (the obese dead space).
11. **link-parity:69, bronchospasm parity.** The tolerances are fine, but the two paths are driven with different inspiratory
    flows (60 L/min square vs ≈ 18 L/min), and under Pmax limiting that alone separates VT and PaCO2. Dependents: the RS15/F5b
    TODO (match vcFlow/pause to Ti) and the packages/ventilator presets.ts VC defaults.

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
COPD GOLD 3 PEEPi 3.6 at VT 490; pneumonia SpO2 96.8; simple-pneumothorax shunt 0.12; OLV Crs 33.9; endobronchial Crs 34.0;
CF SpO2 95.4; ARDS link SpO2 +2.0; oedema SpO2 0 at FiO2 0.4 (ceiling); tension Ppeak +21.6 (against a derived +14–24, no
source). Partly: atelectasis shunt 0.16 (top edge of 0.10–0.16); oedema on air +1 SpO2 / +0.6 SaO2 (iso-shunt +1.1–1.6);
Enghoff VD/VT 0.28 (0.02 short). Still real misses against RIGHT bands: permissive-hypercapnia PAP +1.1 (≥ +2), COPD GOLD 1
FEV1 71 % (GOLD 2 spirometry from the sev-0.25 preset), obesity gap 3.3 and shunt 0.05, and OLV shunt 0.14. The last two are
mostly rig set-up (no induction atelectasis at t0; absorption collapse at FiO2 0.4 instead of surgical collapse).

**(c) Items with no source** (bands whose expected value has no traceable source):
- signatures asthma gapPaEt 20–50: arithmetic of assumed ranges.
- pleural:37 tension Ppeak +10–20: tables H6 [TXT] without book or page; catalogue §16 says [ENG].
- link-r27:81 ARDS SpO2 +5 / −3 in 60 s: fitted to the retired interim link curve.
- signatures pneumonia SpO2 88–93 and cf SpO2 88–94: both [ENG] in the catalogue.
- signatures neonatalRds shunt 0.2–0.4: [TXT]/[ENG], no page located.
- link-parity:69 tolerances: RS15 [ENG] by design (acceptable for a parity test).
- No calibration-queue rows fall in this section.

## Blood, acid-base and electrolytes

Eight rows: eight known-miss assertions in the blood core, acid-base, anaemia, KCl, kaliuresis and massive-transfusion tests. Verdicts: 4 TOO NARROW (the two saline D3 cells, the alkalosis slope and the transfusion BE), 2 MIS-SPECIFIED (KCl, citrate), 1 TOO WIDE (anaemia CO), 1 UNSUPPORTED (furosemide), 0 RIGHT. The pattern: bands taken from a clinical rule of thumb or an uncited annex value and applied to a different population, product or time point. Examples: annex D3's saline numbers have no citation and ask for more acidosis than the dose-scaled human data (Scheingraber 1999) give for 2 L; the citrate rule is a whole-blood transient (Denlinger 1976) turned into a rate law and applied to SAGM red cells; the KCl band is Kruse's hypokalaemic ICU increment applied to the end-of-infusion peak of a normokalaemic adult, with chapter locators that point to the wrong chapters. In four of the eight rows the measured value sits inside the evidence band (both saline cells, citrate, iCa half of the transfusion row), and the alkalosis slope is 0.013 below it. Two rows go the other way: the anaemia CO floor (+30 %) is far below the evidence (+66-84 %), so the real miss is larger than the test shows, and the transfusion BE (-0.2) is a real miss under any band. Weiskopf 1998's CI numbers, ATLS 10e, Arbus 1969 and the 'Citrate-ESMED' source could not be opened and are marked UNVERIFIED; abstracts came from PubMed E-utilities and the Miller 10e / Co-Existing 8e pages from the local PDFs.

### Rows

<a id="row-115"></a>

#### 115. `packages/engine-core/test/engine/blood-anaemia-co.test.ts:31` — Hb 5 vs 15 (awake, MODELED): CO >= +30 % (Weiskopf CI +66 %)
- **Band / stated source:** CO(Hb 5)/CO(Hb 15) >= 1.30, one-sided — Weiskopf 1998 JAMA (CI +66 %, HR +49 %); audit Q8; research/22 BF-18b
- **Measured:** +25 % (5.49 -> 6.87 L/min); HR +48 % (passing sibling)
- **Source verification:** Weiskopf RB et al. JAMA 1998;279:217-21, PMID 9438742 (abstract): Hb 131 -> 50 g/L isovolaemic (albumin/autologous plasma), n 32 conscious; "increased heart rate, stroke volume, and cardiac index (each P<.001)"; VO2 3.07 -> 3.42; lactate unchanged. The CI values (2.9 -> 4.8, +66 %) are NOT in the abstract and the full text could not be opened (JAMA URL served another article): UNVERIFIED as numbers. Lieberman JA et al. Anesthesiology 2000;92:407-13, PMID 10691227 (abstract): Hb 12.5 -> 4.8 g/dL raised HR, SVI and CI, "reduced DO2 (14.0+/-2.9 to 9.9...)" - the implied CO ratio is (9.9/14.0)/(4.8/12.5) = 1.84 (+84 %). Weiskopf RB et al. Transfusion 2003;43:235-40, PMID 12559019 (abstract, n 95): "heart rate = 116.0-4.0 [Hb]", linear.
- **Band vs source:** Partly. Direction and population (awake, isovolaemic, healthy) match. The floor of +30 % is less than half the source effect (+66 % Weiskopf as cited, about +84 % implied by Lieberman), and there is no ceiling, so a model that compensates by half still passes.
- **Better evidence:** Lieberman 2000 DO2 data imply CO +84 % at Hb 4.8 from 12.5; Weiskopf's linear HR model (116 - 4 Hb) gives HR 56 -> 96 (+71 %) for Hb 15 -> 5 (extrapolated above his 13.1 baseline), so the passing HR band's 60 % ceiling is also tight. (grade A (two human isovolaemic-haemodilution studies, n 8-95; numbers partly derived))
- **Verdict: TOO WIDE** · proposed: CO ratio 1.50-2.00 for Hb 15 -> 5 awake (two-sided); revisit the sibling HR ceiling (1.6) against Weiskopf 2003 (+71 % extrapolated) (Weiskopf 1998 PMID 9438742; Lieberman 2000 PMID 10691227; Weiskopf 2003 PMID 12559019)
- **Likely not a miss:** no (+25 % is below both the current and the corrected band; the model routes compensation through HR, as the sibling test says)

<a id="row-116"></a>

#### 116. `packages/engine-core/test/engine/blood-sanity-acid.test.ts:23` — 2 L 0.9 % saline in 30 min under GA: Cl +6-8 and BE -3 to -5 at 60 min (annex D3), engine rig
- **Band / stated source:** Cl +6 to +8 mmol/L and BE -3 to -5 at 60 min — annex D3 (pulse-parameter-annex.md:543, no citation)
- **Measured:** Cl +5, BE -2.0 (gates/stage-7c.md:46); measured: not in title
- **Source verification:** Scheingraber S et al. Anesthesiology 1999;90:1265-70, PMID 10319771 (abstract): saline vs RL at 30 ml/kg/h during major gynaecological surgery; "Infusion of 0.9% saline, but not lactated Ringer's solution, caused a metabolic acidosis with hyperchloremia". Numbers from the Critical Care paper report (ccf-1999-335, PDF opened): "6000 ml per case of 2 h duration" (blood loss ~900 ml); "pH changed from 7.41 to 7.28 and BE from -0.4 to -6.7 mmol/l at 120 min"; "Chloride ... increased ... from a mean of 104 to 115 mmol/l". Reid F et al. Clin Sci 2003;104:17-24, PMID 12519083 (abstract): 2 L saline over 1 h in 9 volunteers: "After saline, all subjects developed hyperchloraemia (>105 mmol/l), which was sustained for >6 h"; bicarbonate lower than after Hartmann's (no values in abstract). Chowdhury AH et al. Ann Surg 2012;256:18-24, PMID 22580944 (abstract): 2 L over 1 h, "Sustained hyperchloremia" and a greater SID fall with saline (no values in abstract). Annex D3 itself (docs/physiology/pulse-parameter-annex.md:543) gives "BE -3 to -5, Cl +6-8" with no citation. Miller 10e ch. 44 p. 1380: saline SID 0 -> "progressive hyperchloremia ... 'hyperchloremic acidosis'" (no dose-response).
- **Band vs source:** No. D3 has no source. Scaling Scheingraber (6 L/2 h under GA, Cl +11, BE -6.3, albumin dilution included) to 2 L gives about Cl +4-6 and BE -1.5 to -3.5 (the ECF dilution arithmetic 50 x 2/(14+2) = +6.3 is the no-excretion ceiling; Scheingraber reached ~73 % of his own ceiling). Research/22 BF-01a already used Cl 3-8, BE -4 to -1 (Reid; Scheingraber). The albumin-dilution offset the test comment blames is real physiology and is contained in the human data.
- **Better evidence:** No human study with exactly 2 L in 30 min under GA and a 60-min read was found; the bracket rests on Scheingraber (GA, dose-response) and Reid/Chowdhury (2 L/1 h awake, direction). (grade A for direction (RCTs), C for the 2 L magnitude (scaled))
- **Verdict: TOO NARROW** · proposed: Cl +4 to +7 and BE -1.5 to -4 at 60 min (same for core.test.ts:86) (Scheingraber 1999 PMID 10319771 (+ CCF paper report); Reid 2003 PMID 12519083; Chowdhury 2012 PMID 22580944)
- **Likely not a miss:** yes (Cl +5, BE -2.0 inside the corrected band)

<a id="row-117"></a>

#### 117. `packages/engine-core/test/engine/fu71-kcl.test.ts:50` — KCl 20 mmol over 1 h raises plasma K by 0.15-0.35 (Miller 10e ch. 46)
- **Band / stated source:** end-of-infusion rise 0.15-0.35 mmol/L (about 0.25) — Miller 10e ch. 46 electrolyte management; Stoelting Co-Existing 8e ch. 23 [TXT, grade C]
- **Measured:** +0.77 at the end of the infusion; +0.13 two hours later
- **Source verification:** Locators wrong: Miller 10e ch. 46 is 'Patient Blood Management: Coagulation' and Co-Existing 8e ch. 23 is 'Hematologic disorders'. The electrolyte chapters (Miller 10e ch. 43; Co-Existing 8e ch. 20) were searched and contain no 0.25-per-20-mmol figure (Miller 10e ch. 43 p. 1355: infuse "no faster than 0.5 mEq/kg/h"; Co-Existing 8e ch. 20: non-urgent IV repletion "at a rate of less than 20 mEq/h"). The figure comes from Kruse JA, Carlson RW. Arch Intern Med 1990;150:613-7, PMID 2310280 (abstract): ICU, mean pre-K 3.2, "The mean increment in serum potassium level per 20-mEq infusion was 0.25 mmol/L" (sampling time not stated). Hamill RJ et al. Crit Care Med 1991;19:694-9, PMID 2026032 (abstract): hypokalaemic ICU patients, 20 mmol over 1 h: "mean maximum potassium increase was 0.5 +/- 0.3 mmol/L", "maximal at the completion of the infusion". Rosa RM et al. NEJM 1980;302:431-4, PMID 6101508 (abstract): nine healthy subjects, KCl 0.5 meq/kg (about 35 mmol at 70 kg): "elevated serum potassium 0.6 +/- 0.09 meq per liter" (infusion duration not in the abstract).
- **Band vs source:** No. The band is Kruse's mean increment in HYPOkalaemic ICU patients (depleted cells, timing unspecified), applied to the END-of-infusion peak in a normokalaemic adult. The end-of-infusion peak measured by Hamill is twice that, and the normal-subject data (Rosa) scale to about +0.34 per 20 mmol.
- **Better evidence:** Hamill 1991 (peak at end of infusion, 0.5 +/- 0.3 per 20 mmol, hypokalaemic); Rosa 1980 (normokalaemic, ~0.34 per 20 mmol scaled; beta-blockade 0.9 per 35 mmol). End-of-infusion peak in a normokalaemic adult: about 0.25-0.6. (grade A (two ICU cohorts n 48 and 495 infusion sets; one volunteer study n 9))
- **Verdict: MIS-SPECIFIED** · proposed: end-of-infusion rise 0.2-0.6 mmol/L (normokalaemic adult, 20 mmol/1 h); keep Kruse's 0.25 only as a hypokalaemic, post-infusion value (Hamill 1991 PMID 2026032; Rosa 1980 PMID 6101508; Kruse 1990 PMID 2310280)
- **Likely not a miss:** no (+0.77 is still above 0.6, but the miss shrinks from 0.42 to 0.17 mmol/L)

<a id="row-118"></a>

#### 118. `packages/engine-core/test/engine/fu9-potassium.test.ts:26` — furosemide 40 mg at K 7.5: K >= 0.1 lower than control at 3 h
- **Band / stated source:** Delta K <= -0.1 mmol/L vs untreated at 3 h — research/22 BF-08d (dirOnly 'beyond 0.1'); UK Renal Association 2023; Young 1988; Good & Wright 1979; size = Ali's Open question 5
- **Measured:** -0.029 (diuresis +150 mL/h at peak under GA)
- **Source verification:** UKKA Clinical Practice Guideline, Management of Hyperkalaemia in Adults (final, Dec 2023; PDF opened) Guideline 7.1 is headed "Use of diuretics for managing Hyperkalaemia in the community": "We suggest that loop diuretics may be a useful adjunct for the treatment of chronic hyperkalaemia"; "Loop diuretics (e.g. furosemide, bumetanide) are the most effective class that promote urinary K+ excretion". No acute magnitude is given. Young 1988 and Good & Wright 1979 were not opened: UNVERIFIED. Sterns RH et al. Medicine 1981;60:339-54, PMID 6268928 (abstract) is a qualitative review of internal K balance (the 300 mmol per mmol/L figure is not in the abstract).
- **Band vs source:** Partly. The direction (kaliuresis lowers K) is supported. The 0.1 mmol/L size at 3 h has no source; the test comment itself calls it the owner's.
- **Better evidence:** None quantitative found for acute IV furosemide at K 7.5 with normal kidneys. Note the rig's premise: 40 mg IV furosemide normally produces a brisk diuresis of the order of litres over 3 h; +150 mL/h under GA suggests the miss is in the diuresis, not in the K pool (assertion, not verified). (grade C (guideline, chronic setting); D for the size)
- **Verdict: UNSUPPORTED** · proposed: keep >= 0.1 only as an owner [ENG] floor, and add a premise check that 40 mg IV gives >= 0.5-1 L of urine in 3 h before grading K (UKKA 2023 guideline 7.1; owner ruling (Open question 5))
- **Likely not a miss:** uncertain (no evidence size; the diuresis premise looks low)

<a id="row-119"></a>

#### 119. `packages/engine-core/test/engine/fu9-transfusion.test.ts:29` — class IV + MTP (10 RBC + 10 FFP / 40 min, no Ca): iCa nadir 0.6-0.95 and BE <= -10 (ATLS class IV)
- **Band / stated source:** iCa nadir 0.6-0.95 mmol/L AND BE nadir <= -10 — research/22 BF-05a (Giancarelli 2016; Ho & Leonard 2011), BF-05d (ATLS 10e table 3-1)
- **Measured:** iCa 0.958, BE -0.2 (lactate 7.1)
- **Source verification:** Ho KM, Leonard AD. Anaesth Intensive Care 2011;39:46-54, PMID 21375089 (abstract): 352 massively transfused patients, lowest iCa "mean concentrations 0.77 mmol/l, SD 0.19"; "The amount of fresh frozen plasma transfused ... and acidosis ... were associated with ... severe hypocalcaemia (< 0.8 mmol/l)". Giancarelli A et al. J Surg Res 2016;202:182-7, PMID 27083965 (abstract): 97 % iCa < 1.12, 71 % iCa < 0.90; severe group lactate 5.8, pH 7.14 vs 4.0, pH 7.23. Mutschler M et al. Crit Care 2013;17:R42, PMID 23497602 (abstract): BD-based classes "class IV (BD>10 mmol/l)", the source of the ATLS 10e BD row (ATLS itself not opened: UNVERIFIED). Miller 10e ch. 62 p. 2023: keep iCa "greater than 1.0 mmol/L"; Miller 10e ch. 45 p. 1423: "Infusion of more than 1 unit of blood every 10 minutes can decrease ionized Ca2+ levels".
- **Band vs source:** Partly. iCa 0.6-0.95 is Ho & Leonard's mean +/- 1 SD (0.58-0.96), right population, and FFP-driven as in the rig. BE <= -10 is Mutschler's ED-arrival classification (patients sorted BY their BD), applied as an expected nadir in a ventilated, transfused patient; the MT cohorts' pH 7.14-7.23 with lactate 4-6 imply BE of roughly -6 to -12.
- **Better evidence:** Giancarelli lactate/pH by iCa group; Mutschler: class III BD 6-10 already carries heavy transfusion. (grade A (two MT cohorts n 156 and 352; registry n 16,305))
- **Verdict: TOO NARROW** · proposed: iCa nadir 0.6-1.0 (keep 0.6-0.95 if the owner wants Ho & Leonard's 1-SD band) and BE nadir <= -6 (class III-IV boundary) (Ho & Leonard 2011 PMID 21375089; Giancarelli 2016 PMID 27083965; Mutschler 2013 PMID 23497602)
- **Likely not a miss:** partly (iCa 0.958 sits inside 0.6-1.0 and at the edge of the current band; BE -0.2 is a real miss under any band)

<a id="row-120"></a>

#### 120. `packages/engine-core/test/l2/blood/acid-base.test.ts:34` — acute respiratory alkalosis reaches the tables' 0.2 mmol/L per mmHg (40 -> 30)
- **Band / stated source:** Delta HCO3 / Delta PaCO2 >= 0.18 (tables 0.2) — tables §5b.1 'Acute respiratory ... 0.2·(PaCO2 - 40) if falling'
- **Measured:** 0.127 per mmHg (gates/stage-7c.md:97); passing sibling band 0.12-0.2
- **Source verification:** Miller 10e ch. 44 p. 1378: "A simple rule of thumb ... [HCO3-] = 0.2 PaCO2. For example: if the PaCO2 falls to 30 mm Hg, the DeltaHCO3- should be: 0.2 x (40 - 30) = 0.2 x 10 = 2 mEq/L"; Fig. 44.2 (Boston, after Brenner & Rector): "Expected [HCO3-] = 24 - 2 [(40 - measured PaCO2) / 10]". Same chapter Table 44.3 (Schlichtig 1998): "Acute respiratory alkalosis DeltaBE = 0". Arbus GS et al. NEJM 1969;280:117-23, PMID 5782512: no abstract, full text not opened (UNVERIFIED).
- **Band vs source:** Partly. The 0.2 slope is textbook consensus (Boston). The Copenhagen rule in the same chapter (SBE unchanged) implies about 0.14 per mmHg (Van Slyke with SBE 0, PaCO2 40 -> 30: HCO3 24.4 -> 23.0). The one-pool Figge solver under test has no time and no cellular H+ release, which the 0.2 includes.
- **Better evidence:** Two consensus rules bracket the acute slope at 0.14-0.2. (grade C (textbook consensus; the original human data not opened))
- **Verdict: TOO NARROW** · proposed: 0.14-0.22 mmol/L per mmHg (40 -> 30) (Miller 10e ch. 44 p. 1378, Fig. 44.2 and Table 44.3 (Schlichtig 1998))
- **Likely not a miss:** partly (0.127 is just below 0.14; the passing sibling already brackets it)

<a id="row-121"></a>

#### 121. `packages/engine-core/test/l2/blood/core.test.ts:67` — massive transfusion (10 RBC 35 d in 30 min): iCa -0.1 per unit-per-5-min of rate (tables citrateUnit, Q46)
- **Band / stated source:** |iCa - 1.033| <= 0.05 (rule 1.2 - 0.1 x 1.67) — tables §5b.2 citrateUnit 'iCa -0.1 per unit when > 1 unit / 5 min' (Citrate-ESMED [TXT]/[ENG]), Q46
- **Measured:** 1.137 (main 1.076)
- **Source verification:** Denlinger JK et al. Br J Anaesth 1976;48:995-1000, PMID 791314 (abstract): anaesthetised adults, citrated WHOLE blood for 5 min at 50/100/150 ml/70 kg/min -> iCa "decreases ... of 14, 31 and 41%"; "Ca2+ returned rapidly to the control values after termination"; "dependent on the total dose of citrate administered and the rate of infusion". Miller 10e ch. 45 p. 1423: "Infusion of more than 1 unit of blood every 10 minutes can decrease ionized Ca2+ levels. Even at these infusion rates, ionized calcium levels do not drop enough to cause bleeding." Ho & Leonard 2011 PMID 21375089: FFP amount, not RBC, predicts severe hypocalcaemia. 'Citrate-ESMED' not opened (UNVERIFIED). The test comment itself records that the rule was fitted to a row with 15.6 mmol citrate per RBC unit.
- **Band vs source:** No. The rule is a whole-blood (full-citrate) transient converted into a steady-state rate law [ENG]; the rig gives SAGM red cells, whose residual plasma carries little citrate. Neither the -0.1 per unit-per-5-min slope nor its application to packed cells has a source.
- **Better evidence:** Denlinger gives the whole-blood size (about -30 % at 1 unit WB per 5 min, transient); Ho & Leonard give the clinical driver (FFP). (grade B (one human dose-rate study n small, abstract) + A (cohort))
- **Verdict: MIS-SPECIFIED** · proposed: RBC-only (SAGM) 10 u in 30 min: iCa 1.05-1.20 (small fall); keep a rate rule only for whole blood or FFP, sized on Denlinger (-15 to -40 % transient at 50-150 ml/70 kg/min) (Denlinger 1976 PMID 791314; Miller 10e ch. 45 p. 1423; Ho & Leonard 2011 PMID 21375089)
- **Likely not a miss:** yes (1.137 inside 1.05-1.20)

<a id="row-122"></a>

#### 122. `packages/engine-core/test/l2/blood/core.test.ts:86` — 2 L 0.9 % saline in 30 min (GA): Cl +6-8 and BE -3 to -5 at 60 min (annex D3), core rig
- **Band / stated source:** Cl +6 to +8 and BE -3 to -5 at 60 min — annex D3 (no citation)
- **Measured:** Cl +5.4, BE -2.1 (gates/stage-7c.md:46); measured: not in title
- **Source verification:** Same as blood-sanity-acid.test.ts:23 (Scheingraber 1999; Reid 2003; Chowdhury 2012).
- **Band vs source:** No: as blood-sanity-acid.test.ts:23.
- **Better evidence:** As above. (grade A direction / C magnitude)
- **Verdict: TOO NARROW** · proposed: Cl +4 to +7 and BE -1.5 to -4 at 60 min (Scheingraber 1999 PMID 10319771; Reid 2003 PMID 12519083)
- **Likely not a miss:** yes (Cl +5.4, BE -2.1 inside)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **core:86 + blood-sanity-acid:23, saline 2 L (annex D3: Cl +6-8, BE -3 to -5).** D3 has no citation. Scheingraber 1999 (6 L/2 h under GA: Cl +11, BE -6.3) scales to Cl +4-6 and BE -1.5 to -3.5 for 2 L. The "albumin dilution offset" in the test comments is in the human data too. Dependents: research/22 BF-01a/BF-14 (already used Cl 3-8, BE -4 to -1), the stage-7c gate note, the tables' D3/O3 oracle rows, and fu9-leak's saline arm (same fluid model).
2. **fu71-kcl:50, KCl 0.15-0.35.** The locators are wrong (Miller 10e ch. 46 is coagulation; Co-Existing 8e ch. 23 is haematology). The number is Kruse 1990's hypokalaemic, post-infusion increment. The end-of-infusion peak is 0.5 +/- 0.3 (Hamill 1991), and about 0.34 per 20 mmol in normal subjects (Rosa 1980). Dependents: K_TAU_MIN 43 min and K_TBK_MMOL 300 (7c), and the passing shape test (peak, then settle) in the same file.
3. **blood-anaemia-co:31, CO >= +30 %.** Too lax: the evidence says +66 % (Weiskopf, as cited) to about +84 % (Lieberman DO2). The real miss is bigger than the test reports. Dependents: audit 09 R11, BF-18a/b and BF-19 (research/22), and the sibling HR band (two-sided 20-60 %), whose 60 % ceiling sits below Weiskopf 2003's linear model (+71 % for Hb 15 -> 5).
4. **core:67, citrate rule.** Whole-blood physiology (Denlinger) applied to SAGM red cells as a rate law [ENG]. Dependents: K_CIT / Q46, the tables' citrateUnit row, fu9-citrate.test.ts (pins the chelation term), and fu9-transfusion (iCa 0.958).
5. **fu9-transfusion:29, BE <= -10.** Mutschler's ED-arrival classification used as an expected nadir. BE <= -6 fits MT cohorts (pH 7.14-7.23, lactate 4-6). The iCa half is right (Ho & Leonard mean 0.77 +/- 0.19); 0.95 vs 1.0 is an owner choice. Dependents: BF-05a/05d, OQ2, the tables' ATLS BE row.
6. **acid-base:34, 0.2 per mmHg.** Textbook (Boston), but the Copenhagen rule in the same Miller chapter (SBE constant) gives about 0.14. Dependents: tables §5b.1, the passing 0.12-0.2 band, BF-17a/b (iCa and K per pH, both PL).
7. **fu9-potassium:26, furosemide >= 0.1 at 3 h.** No source for the size (UKKA 2023 is about chronic, community use). Check the diuresis premise first. Dependents: BF-08d, Open question 5.

**(b) Known misses that are probably NOT misses** (measured value inside the corrected band): saline Cl +5 / BE -2.0 (engine) and Cl +5.4 / BE -2.1 (core); citrate RBC-only iCa 1.137; transfusion iCa 0.958 (if the band is 0.6-1.0). Near-miss: alkalosis slope 0.127 against 0.14-0.22. Still real misses: anaemia CO +25 % (the band understates it), KCl +0.77 (above 0.2-0.6), transfusion BE -0.2.

**(c) Items with no source.** Annex D3 (saline Cl/BE). The tables' citrateUnit "-0.1 per unit" rule ([ENG]; 'Citrate-ESMED' not opened). The furosemide 0.1 mmol/L size (owner's Open question 5). The KCl band's cited chapters (no such figure in Miller 10e ch. 43 or Co-Existing 8e ch. 20; the real source is Kruse 1990). No calibration-queue rows fall in this section.

## Kidney and fluids

Nine rows: nine known-miss assertions in the kidney, IAP, volume-kinetics, mannitol, glycine and septic-leak tests (check 20 counts twice, MODELED and MANUAL). Verdicts: 4 UNSUPPORTED (both check-20 cells, the U(RPP 75) mid-curve, the glycine ICP size), 3 MIS-SPECIFIED (class III + RL urine, septic lung water, mannitol osmolality), 1 TOO NARROW (IAP 25 anuria), 1 RIGHT (IAP 14 urine -30 %). The pattern: model fits and clinical rules of thumb stand in for evidence. The check-20 UOP numbers are the 7d plan's own fit; the RL row turns the ATLS resuscitation target into a prediction for an under-replaced, anaesthetised patient; the leak row cites a prognostic EVLW paper for a fluid-loading claim that the human loading trials contradict; the mannitol row asks at 15 min for more than the measured peak. In five of the nine rows the measured value sits inside the evidence band (RL urine 0.33, mannitol +8.7, mid-curve 0.76, check-20 MANUAL, the leak EVLWI ordering partly); three are real misses whatever the band (IAP 14 -12.5 %, IAP 25 0.69, glycine ICP +0.26) and the MODELED check 20 fails on its premise (the hfref profile). Guyton & Hall, ATLS 10e and Barash could not be opened and are marked UNVERIFIED; one cited paper was mis-read (Chiu 1995: the 60 % is cortical blood flow in pigs, not urine output). Abstracts via PubMed E-utilities; Miller 10e pages from the local PDF.

### Rows

<a id="row-123"></a>

#### 123. `packages/engine-core/test/engine/fu9-iap.test.ts:26` — IAP 14 under GA: urine over +15-25 min falls 30 % or more (SP-08e)
- **Band / stated source:** Delta UOP <= -30 % vs control (open floor to -100 %) — research/21 SP-08e: research/12 SP-08; WSACS 2013 (IAH >= 12: oliguria); 'Chiu AW et al., J Endourol 1995 [VERIFY] (pneumoperitoneum 15 mmHg: UO -60 %)'
- **Measured:** -12.5 % (CO 0.0 %: the 7a half is handed)
- **Source verification:** Chiu AW et al. is J Am Coll Surg 1995;181:397-406, PMID 7582206 (not J Endourol). Abstract: 40 pigs; pneumoperitoneum and pneumoretroperitoneum "caused oliguria"; the 60 % is "Superficial renal cortical blood flow reduction ... by an average of 60 percent in the compressed kidney" - a flow figure, not urine output. Human: Nguyen NT et al. J Am Coll Surg 2002;195:476-83, PMID 12375752 (abstract, RCT n 104, laparoscopic vs open gastric bypass): "Urinary output during laparoscopic GBP was 64% lower than during open GBP at 1 hour after surgical incision (19 mL versus 55 mL ...) and continued to remain lower ... by 31-50% throughout". McDougall EM et al. J Am Coll Surg 1996;182:317-28, PMID 8605555 (pigs): UO "decreased concomitantly and significantly in the >= 15 mm Hg group". Demyttenaere S et al. Surg Endosc 2007;21:152-60, PMID 17160650: "20 of the 25 studies identified a decrease in renal function during pneumoperitoneum". Counter-example: Iwase K et al. Endoscopy 1992;24:771-3, PMID 1468394: UO fell at 30-60 min only in patients with heart disease.
- **Band vs source:** Yes in size (human -31 to -64 % at IAP ~15), with two caveats: the human effect includes the haemodynamic/hormonal share that this rig hands to 7a, and the human data are read at >= 1 h, the test at +15-25 min. The 'Chiu -60 %' citation is mis-read (cortical flow, pigs).
- **Better evidence:** Nguyen 2002 is the best human figure; Demyttenaere's review supports direction with heterogeneity (hydration, duration, pressure). (grade A (RCT n 104) + B (animal series, systematic review))
- **Verdict: RIGHT** · proposed: keep; optionally bound it -30 to -70 % and replace the Chiu citation with Nguyen 2002 (Nguyen 2002 PMID 12375752; McDougall 1996 PMID 8605555; Demyttenaere 2007 PMID 17160650)
- **Likely not a miss:** no (-12.5 % is a real miss, partly because the CO/SVR half is missing)

<a id="row-124"></a>

#### 124. `packages/engine-core/test/engine/fu9-kinetics.test.ts:76` — class III (1500 mL) then RL 2 L under GA: urine 30-60 min after the end >= 0.5 mL/kg/h
- **Band / stated source:** mean UOP over 30-60 min after the end >= 0.5 mL/kg/h — research/13 RH-03a: ATLS 10e ch. 3 (UO >= 0.5 mL/kg/h is the adult resuscitation end point; 'recovers within 30-60 min of restoring MAP/CO')
- **Measured:** 0.33 (main 0.23); passing sibling: a 10-min bin >= 0.5 within 60 min
- **Source verification:** ATLS 10e not opened (UNVERIFIED); 0.5 mL/kg/h as a resuscitation TARGET is standard teaching. Drobin D, Hahn RG. Anesthesiology 1999;90:81-91, PMID 9915316 (abstract): Ringer's elimination rate constant "133 ml/min ..., 100 ml/min ..., and 34 ml/min" when normovolaemic and after 450 and 900 ml blood withdrawal - "retention of infused Ringer's solution in the body increases in the presence of hypovolemia". Norberg A et al. Anesthesiology 2007;107:24-32, PMID 17585212 (abstract): isoflurane anaesthesia gave "lower urinary excretion" of a saline load, with "markedly increased" renin and aldosterone.
- **Band vs source:** No. A resuscitation goal (what the clinician aims for) is used as a physiological prediction. Here the deficit is 1.5 L replaced by 2 L of crystalloid (about 1.3:1, against the usual 3-5:1), under GA, where both haemorrhage (Drobin: elimination -75 % after 900 ml) and anaesthesia (Norberg) cut urinary excretion of the infused fluid.
- **Better evidence:** Volume kinetics predict a low urine output after an under-replaced class III bleed under GA; the H1 sibling makes normovolaemic GA 0.5-1, and a still-hypovolaemic patient should sit below that. (grade A (human volume-kinetic studies, n 10-11) for the mechanism; C for any exact figure)
- **Verdict: MIS-SPECIFIED** · proposed: UOP 30-60 min after the end 0.2-0.5 mL/kg/h and >= 0.1 above the unresuscitated control; keep >= 0.5 only if the arm is re-specified to full replacement (e.g. 3:1 crystalloid or blood) (Drobin & Hahn 1999 PMID 9915316; Norberg 2007 PMID 17585212)
- **Likely not a miss:** yes (0.33 inside 0.2-0.5)

<a id="row-125"></a>

#### 125. `packages/engine-core/test/engine/fu9-leak.test.ts:24` — warm septic shock + 30 mL/kg saline: extra EVLWI more than healthy AND PaO2 falls (> 5 mmHg)
- **Band / stated source:** Delta EVLWI(sepsis) > Delta EVLWI(healthy) and Delta PaO2 < -5 mmHg at 60 min after the load — research/22 §5 acceptance 'EVLWI up and PaO2 down more than healthy'; BF-20a (Sakka 2002 Chest; tables §5e); two-pore theory
- **Measured:** +0.90 vs +1.68 mL/kg; PaO2 +10
- **Source verification:** Sakka SG et al. Chest 2002;122:2080-6, PMID 12475851 (abstract): retrospective, prognostic only - "maximum EVLW was significantly higher in nonsurvivors ... (median, 14.3 mL/kg vs 10.2 mL/kg)"; no fluid-loading data. van der Heijden M et al. Crit Care Med 2009;37:1275-81, PMID 19242338 (abstract, RCT 24 septic + 24 non-septic): septic patients had greater permeability and EVLW at baseline, but "Regardless of fluid type or underlying disease, EVLW and LIS did not change during fluid loading". Aman J et al. Crit Care Med 2012;40:793-9, PMID 22080639 (abstract, n 63): an EVLW rise >= 10 % "is predicted by a plateau of cardiac function and pulmonary vascular filling at baseline, rather than by pulmonary vascular permeability and filling pressures. Increasing extravascular lung water is further reflected by a decrease of PaO2/FIO2 ratio".
- **Band vs source:** No. The cited source does not test fluid loading. The human fluid-loading data say the septic leak does not make a load produce more lung water than in non-septic patients; the PaO2 fall goes with an EVLW rise driven by a flat cardiac function curve, not with sepsis as such.
- **Better evidence:** Septic patients carry more EVLW at baseline (state), not a larger load response. A 30 mL/kg load raises EVLW mainly where CO no longer responds. (grade A (human RCT n 48; cohort n 63))
- **Verdict: MIS-SPECIFIED** · proposed: (a) state: septic EVLWI above healthy before the load; (b) load: Delta EVLWI septic within about +/-1 mL/kg of healthy (no ordering required); (c) PaO2/FiO2 falls only when Delta EVLWI >= 10 % (van der Heijden 2009 PMID 19242338; Aman 2012 PMID 22080639)
- **Likely not a miss:** partly (the EVLWI ordering is not required by the evidence; PaO2 +10 with EVLWI +0.9 (~13 %) sits against Aman's EVLW-PaO2 link, but CO/SvO2 rose)

<a id="row-126"></a>

#### 126. `packages/engine-core/test/engine/fu9-mannitol.test.ts:27` — mannitol 1 g/kg: plasma osmolality +20-30 mOsm/kg at 15 min (RH-08c)
- **Band / stated source:** Delta osmolality >= +20 (band +20-30) at 15 min after the dose — research/13 RH-08c ('measured osmolality rises with mannitol (approx +20-30 mOsm/kg after 1 g/kg; osmolal gap)', no citation)
- **Measured:** +8.7 (BV +73 mL, Na -7.6 in the passing sibling)
- **Source verification:** Rudehill A et al. J Neurosurg Anesthesiol 1993;5:4-12, PMID 8431668 (abstract): 15 patients, 1 g/kg over 30 min under GA: "Osmolality in serum increased with a maximum at the end of mannitol infusion (from 292 +/- 7 mOsmol/kg to 310 +/- 14 mOsmol/kg; p < 0.01)"; distribution half-life 0.16 h, Vd 17.0 L. Manninen PH et al. Can J Anaesth 1987;34:442-6, PMID 3117392 (abstract): 1 g/kg: "significant decrease in serum sodium and bicarbonate, and a significant increase in serum osmolality" (no values); changes "of short duration". Arithmetic: 70 g = 385 mOsm; once water has left the cells it is spread over total body water (~42 L): about +9 mOsm/kg.
- **Band vs source:** No. +20-30 is above the measured PEAK (+18 at the end of a 30-min infusion) and is asked for at 15 min after the dose, after the distribution phase (t1/2 ~10 min) and the water shift that the passing sibling already shows (Na -7.6).
- **Better evidence:** Rudehill gives the peak; the TBW arithmetic gives the post-shift floor (~+9). (grade B (one human PK study n 15, abstract) + arithmetic)
- **Verdict: MIS-SPECIFIED** · proposed: +8 to +20 mOsm/kg at 15 min after a 1 g/kg dose (or +12 to +25 as the end-of-infusion peak if read as a peak) (Rudehill 1993 PMID 8431668; Manninen 1987 PMID 3117392)
- **Likely not a miss:** yes (+8.7 inside, at the low edge)

<a id="row-127"></a>

#### 127. `packages/engine-core/test/engine/fu9-osmolality.test.ts:27` — 1.5 % glycine 3 L absorbed over 30 min (awake): ICP >= 1 mmHg above control
- **Band / stated source:** max Delta ICP >= +1 mmHg vs no absorption, over 2.5 h — research/22 BF-11b (dirOnly 'beyond 1 mmHg'): Hahn 2006; Barash TURP syndrome; Adrogue & Madias 2000
- **Measured:** +0.26 (Na about 120)
- **Source verification:** Hahn RG. Br J Anaesth 2006;96:8-20, PMID 16317031 (abstract): mechanisms include "dilutional hyponatraemia and brain oedema" (no ICP figure). Sandfeldt L et al. J Surg Res 2001;95:114-25, PMID 11162034 (abstract): pigs given glycine 1.5 % at 100 mL/kg/h for 90 min (150 mL/kg): "Glycine 1.5% increased the intracranial pressure ... more than mannitol 5%" (no value in the abstract). Barash not opened (UNVERIFIED).
- **Band vs source:** Partly. The direction is supported (animal, ~3.5x the rig's dose per kg); no source gives a magnitude, so 1 mmHg is an owner floor. The test comment's own arithmetic (an osmometer brain gains ~55 mL for -15 mOsm/kg; the engine's gain is 0.145 mL per mOsm/kg, about 2 mL) suggests the floor is conservative, not strict.
- **Better evidence:** No human ICP data after glycine absorption were found. (grade B (animal) for direction; D for size)
- **Verdict: UNSUPPORTED** · proposed: keep >= +1 mmHg as an [ENG] floor (owner ruling, Open question 8); revisit after the brain-water gain is re-derived (Sandfeldt 2001 PMID 11162034; Hahn 2006 PMID 16317031)
- **Likely not a miss:** no (+0.26 against a conservative floor; the brain-water gain looks ~25x below an osmometer)

<a id="row-128"></a>

#### 128. `packages/engine-core/test/engine/organs-curves.test.ts:88` — UOP mid-curve: U(RPP 75) = 0.58 +/- 15 % of the tables' linear U (40 -> 100); see also renal/model.test.ts:27
- **Band / stated source:** UOP / U_tables(RPP) <= 1.15 at RPP ~75, U linear 0 at 40 -> 1 at 100 — tables §5.2 'U: 0 at RPP <= 40; linear to 1 at 100; 3x at 150 (pressure natriuresis, Guyton renal output curve)'
- **Measured:** prototype 0.76 (ratio ~1.3); renal/model.test.ts:27 holds the Pulse curve with [ENG] regression bands (MAP 65: 0.15-0.4; MAP 80: 0.6-0.9)
- **Source verification:** Guyton & Hall's renal output curve was not opened (no local copy; web search did not return the text): UNVERIFIED. The tables tag `rppZero` 40 as [TXT]/[ENG] and the linear segment carries no source. The 7d plan (plans/stage-7d-organs.md decision 8) records the deviation: Pulse's quadratic gives 0.76-0.79 at RPP 75 against the line's 0.58.
- **Band vs source:** No source for the shape between the anchors. Both the linear segment (0.58) and Pulse's quadratic (0.76) are model choices that share the same anchors (zero near 40-50, normal near 100, 3x at 150).
- **Better evidence:** None found that fixes the human urine output at RPP 75 within +/- 15 %. (grade D (shape unsourced); C for the anchors)
- **Verdict: UNSUPPORTED** · proposed: test only the anchors and monotonicity (0 at RPP <= 40-50, ~1 at 100, 3x +/- 15 % at 150), or a loose mid-curve band 0.4-0.85 at RPP 75 (tables §5.2 anchors; stage-7d plan decision 8)
- **Likely not a miss:** yes (0.76 inside 0.4-0.85)

<a id="row-129"></a>

#### 129. `packages/engine-core/test/engine/organs-renal.test.ts:39` — check 20 (MODELED hfref): premise UOP 0.1-0.15; dobutamine 5 -> CO +20-40 %, UOP 0.2-0.3 in 30-60 min
- **Band / stated source:** premise MAP <= 70, CO <= 4, UOP 0.1-0.15; then CO ratio >= 1.2, UOP >= 0.2 at 30 min and <= 0.3 at 60 min — tables §7 check 20 (§5.2)
- **Measured:** premise not reached: MAP 86.6, CO 5.61, UOP 0.670; dobutamine CO +11 %, UOP 0.81 / 0.90 (gates/stage-7d.md:93)
- **Source verification:** Tables §7 check 20 (stage-7-parameter-tables.md:753): "(MAP 65, CVP 12, RPP 53) UOP 0.1-0.15 mL/kg/h; dobutamine 5 µg/kg/min -> CO +30 %, MAP 72, CVP 10 (RPP 62) -> UOP 0.2-0.3 within 30-60 min", source column '§5.2' only (no paper). Leier CV et al. Circulation 1978;58:466-75, PMID 679437 (abstract): severe cardiac failure, dobutamine 2.5-10 µg/kg/min "progressively and predictably increases cardiac output by increasing stroke volume"; on maintenance 7.3-7.7 µg/kg/min it maintained increases in "cardiac output, urine flow, urine sodium concentration, creatinine clearance" while "Renal and hepatic blood flow were not significantly altered" (the 5 µg/kg/min CO value is not in the abstract: UNVERIFIED). Leier CV et al. Circulation 1977;56:468-72, PMID 884803 (abstract): 10-15 µg/kg/min, CI 1.97 -> 3.33 L/min/m2 (+69 %), "Urine flow and urine sodium concentration increased". The UOP numbers trace to the 7d plan's own model fit (plans/stage-7d-organs.md decision 10: 0.114 -> 0.233 / 0.284), not to a source.
- **Band vs source:** Partly. CO +20-40 % at 5 µg/kg/min fits Leier's dose-response in severe failure (direction verified; the 5 µg/kg/min value not in the abstract). The UOP values (0.1-0.15 premise; 0.2-0.3 with a <= 0.3 ceiling at 60 min) are the model's own fit, with no clinical source; Leier reports urine flow up without renal blood flow change.
- **Better evidence:** Leier 1977/1978: urine flow and creatinine clearance rise on dobutamine in low-output failure; no numeric UOP band at 5 µg/kg/min found. (grade B (small human haemodynamic series) for CO; D for the UOP numbers)
- **Verdict: UNSUPPORTED** · proposed: premise UOP < 0.3 (oliguric low-output state); dobutamine 5: CO +20-50 %, UOP rises >= +0.1 mL/kg/h (or >= +50 %) by 60 min, no 0.3 ceiling (Leier 1978 PMID 679437; Leier 1977 PMID 884803; tables §7 check 20 (premise MAP/CVP/CO kept))
- **Likely not a miss:** no (the MODELED hfref profile never reaches the low-output premise: a profile miss, RH-05a/b, research/19 C5)

<a id="row-130"></a>

#### 130. `packages/engine-core/test/engine/organs-renal.test.ts:64` — check 20 (MANUAL contractility 0.3): premise UOP 0.1-0.15; dobutamine 5 -> CO +20-40 %, UOP 0.2-0.3 in 30-60 min
- **Band / stated source:** premise MAP 60-72, CO <= 4, UOP 0.1-0.15; CO ratio 1.2-1.4 at 30 min; UOP >= 0.2 at 30 min, <= 0.3 at 60 min — tables §7 check 20 (§5.2); Q-7D-c20
- **Measured:** MAP 67.9, CO 3.35; UOP 0.067 (premise miss); CO +30 %; UOP 0.244 at 30 min, 0.342 at 60 min (ceiling miss) (test comment)
- **Source verification:** Same as organs-renal.test.ts:39 (tables check 20; Leier 1977, 1978).
- **Band vs source:** Partly: as :39. The two failing assertions (premise 0.1-0.15 and the 60-min ceiling 0.3) are exactly the unsourced UOP numbers.
- **Better evidence:** As :39. (grade B for CO; D for UOP)
- **Verdict: UNSUPPORTED** · proposed: as :39 (premise UOP < 0.3; UOP rise >= +0.1 by 60 min; no ceiling) (Leier 1978 PMID 679437; Leier 1977 PMID 884803)
- **Likely not a miss:** yes (0.067 premise is oliguric; 0.067 -> 0.342 is a rise of +0.28)

<a id="row-131"></a>

#### 131. `packages/engine-core/test/l2/renal/fu9-filtration.test.ts:32` — kidney alone (awake, MAP 93, CVP 5): IAP 25 -> UOP < 0.1 mL/kg/h (WSACS)
- **Band / stated source:** UOP < 0.1 mL/kg/h at IAP 25 after 30 min, kidney-only rig — research/13 H4 acceptance; research/21 SP-08e; research/12 RH-06 'WSACS: anuria at IAP > 25 (renal filtration gradient MAP - 2·IAP approx 45)'
- **Measured:** 0.69 at IAP 25 (0.81 at IAP 15; awake control about 1.0) (test comment)
- **Source verification:** Kirkpatrick AW et al. Intensive Care Med 2013;39:1190-206, PMID 23673399 (WSACS, abstract): definitions and management; no urine-output-at-IAP value in the abstract, and "NO RECOMMENDATIONS were possible regarding monitoring of abdominal perfusion pressure". Miller 10e ch. 38 p. 1206: ACS is "a sustained increase in intra-abdominal pressures to greater than 20 mm Hg that causes organ dysfunction"; it "results in a functional prerenal state" (no UOP figure). Harman PK et al. Ann Surg 1982;196:594-7, PMID 7125746 (dogs): "Renal blood flow and glomerular filtration rate decreased to less than 25% of normal when the intra-abdominal pressure was elevated to 20 mmHg. At 40 mmHg ... three dogs became anuric"; restoring CO with dextran left RBF/GFR "less than 25% of normal" - "a local phenomenon caused by direct renal compression and ... not related to cardiac output".
- **Band vs source:** No. No source gives anuria (< 0.1) at IAP 25; the animal anuria is at 40 mmHg. The engine's own tables (U linear in RPP = MAP - IAP = 68) would give about 0.47 x UOP0 at this point. Note Harman contradicts the test comment's premise that the missing share is 7a's CO: the renal effect is local.
- **Better evidence:** Harman (GFR < 25 % at IAP 20, local); Nguyen 2002 (human, IAP ~15: UO -31 to -64 %). (grade B (animal, small n) + A (human RCT at lower IAP))
- **Verdict: TOO NARROW** · proposed: kidney-only rig at MAP 93: UOP <= 0.3 mL/kg/h (<= 30 % of control) at IAP 25; keep < 0.1 (anuria) for IAP >= 30-40 or APP < 50 (Harman 1982 PMID 7125746; Nguyen 2002 PMID 12375752; WSACS 2013 PMID 23673399 (definitions))
- **Likely not a miss:** no (0.69 is not oliguric; the local compression effect is too weak)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **fu9-kinetics:76, class III + RL 2 L -> UOP >= 0.5 at 30-60 min.** An ATLS resuscitation target is used as a physiological prediction for a 1.3:1 crystalloid replacement under GA. Volume kinetics (Drobin & Hahn 1999; Norberg 2007) predict low urine here. Dependents: RH-03a/b and RH-M2 (research/13), the passing "10-min bin >= 0.5" sibling, the vNh washout tau 45 min, which is jointly tuned with check 20 (OQ11; test comment: tau 10-20 min breaks check 20).
2. **fu9-leak:24, septic EVLWI > healthy and PaO2 falls.** Sakka 2002 is prognostic. van der Heijden 2009 and Aman 2012 show that fluid loading does not raise EVLW more in sepsis, and that the EVLW rise tracks a flat cardiac function curve. Dependents: BF-20a/b, Open question 3 (septic sigma), the tables §5e leak rows, and 7b's lung-water -> shunt coupling (F13a).
3. **fu9-mannitol:27, +20-30 mOsm/kg at 15 min.** The measured human peak is +18 at the end of a 30-min infusion (Rudehill 1993). The total-body-water arithmetic gives about +9 after the water shift. Dependents: RH-08a/b/c, OQ12, the brain osmotherapy gain (0.145 mL per mOsm/kg), which the glycine row also uses.
4. **organs-renal:39/:64, check 20 UOP numbers.** These are the 7d plan's own fit (0.114 -> 0.233/0.284), not a source. CO +20-40 % is consistent with Leier's dose-response. Dependents: renal/model.test.ts:36 (the model-level check-20 test that passes on the same fit), Q-7D-c20, the effective-volume reference CO (decision 10), RH-05a/b, DI-12/DI-32 (dobutamine CO band 20-45 %), and the vNh tau 45 min shared with row 1.
5. **fu9-filtration:32, IAP 25 -> UOP < 0.1.** No source gives anuria at 25; dogs become anuric at 40 (Harman 1982). Harman also shows that the renal effect is local compression, not CO, which contradicts the test's "the 7a half is handed" rationale: the kidney-only rig should already be oliguric (<= 0.3). Dependents: RH-06a, SP-08e, R-FU9-8, organs-curves.test.ts:63 (anuria at RPP <= 40 with IAP 25, passing).
6. **organs-curves:88, U(RPP 75) = 0.58.** The linear segment has no source (Guyton not opened). Test anchors only. Dependents: renal/model.test.ts:27 ([ENG] bands on Pulse's curve), stage-7d decision 8, RH-27b.
7. **fu9-osmolality:27, glycine ICP >= 1.** Direction only (pigs, Sandfeldt 2001); the size is an owner floor. It is likely conservative, so the miss is probably real. Dependents: BF-11b, Open question 8, the brain-water gain.

**(b) Known misses that are probably NOT misses** (measured value inside the corrected band): RL urine 0.33 (0.2-0.5); mannitol +8.7 (+8 to +20, low edge); mid-curve 0.76 (0.4-0.85); check-20 MANUAL 0.067 -> 0.342 (oliguric premise, rise >= +0.1); the septic EVLWI ordering (+0.90 vs +1.68 is allowed by the human data). Real misses under any band: IAP 14 urine -12.5 % (RIGHT band; Nguyen -31 to -64 %), IAP 25 kidney-only 0.69, glycine ICP +0.26, and the MODELED check 20 (hfref profile never reaches low output).

**(c) Items with no source.** Tables §7 check 20's UOP numbers (0.1-0.15 -> 0.2-0.3, <= 0.3 at 60 min; source column "§5.2" only). The tables' linear U between RPP 40 and 100. RH-08c's "+20-30 mOsm/kg". BF-11b's 1 mmHg ICP floor. research/12 RH-06's "anuria at IAP > 25". The "Chiu 1995 UO -60 %" citation (actually cortical flow, pigs, J Am Coll Surg). No calibration-queue rows fall in this section.

## Endocrine and thermal

Ten rows: nine known-miss assertions in the MH, fever, thermoregulation, glucose and catecholamine tests, plus calibration-queue row t21. Verdicts: 7 MIS-SPECIFIED, 1 TOO NARROW, 1 UNSUPPORTED, 1 RIGHT. The common pattern is a band that takes a presentation value or a set point and uses it as a time-course endpoint in a rig the source never described. Three examples. Fever of 38.5-41 °C under ~1 MAC GA at 60-90 min, where human pyrogen studies show volatile anaesthesia largely abolishes fever (Negishi 1998). A 'plateau >= threshold' rule, where the plateau sits at or just below the threshold. A diabetic dexamethasone '+2-4 mmol/L at 4-8 h' that is not in PADDI: the PADDI diabetic substudy (Bach 2026) reports +1.86 mmol/L (CI 1.50-2.22), with the peak at 8-12 h after surgery. The MH EtCO2 'by 10 min' target is a scenario choice, written as an absolute number. It cannot survive FU-4's dead-space change, and that change explains the queue/test split: the queue predates FU-4. The only band that is RIGHT is the insulin nadir at 20-30 min (Greenwood 1966), and the engine's 13.3 min is a real miss. In 6 of the 10 rows the measured value already sits inside the evidence band, and 3 are partly inside (queue t21, the storm core, HR after dantrolene). The insulin nadir is the only clear miss. The catecholamine-reserve band has no physiological source, and it even contradicts its own plan's constants. MH potassium is out of scope here (research/29). Abstracts were read through PubMed E-utilities, the Bach 2026 and Greenwood 1966 full texts through Europe PMC and JCI, and Miller 10e Ch31 and Coexist 8e Ch22 from local PDFs. The following were not opened and are marked UNVERIFIED: the tables' MH web sources (EMCrit, OpenAnesthesia), Klein 2007, and the '3-4 h' locator in Sessler 2000's full text. The Miller 10e/9e temperature chapter is not in the local files.

### Rows

<a id="row-132"></a>

#### 132. `packages/engine-core/test/engine/endo-acceptance.test.ts:22` — MH severity 1 at fixed ventilation: EtCO2 >= 60 by 10 min (tables §7 check 21)
- **Band / stated source:** EtCO2 >= 60 mmHg (mean 9.67-10 min after MH onset), MANUAL, ventilator 12 x 500 mL, FiO2 0.5, PEEP 5, GA flag — tables §7 check 21 "EtCO2 at constant MV rises 40 -> 60 by 10 min (and keeps rising 3-5 mmHg/min)"; tables §5.3 MH row "VCO2 x2-5 over 5-30 min" [TXT] (MH-EMCrit, MH-OA)
- **Measured:** 54 (36/42/54/71/86 at 0/5/10/15/20 min: a rise of +18 from a baseline of 36; slope 10-15 min 3.4 mmHg/min)
- **Source verification:** Miller's Anesthesia 10e Ch31, p. 965: "The usually muted onset of MH is in most cases detected quickly by the development of tachycardia, increased levels of expired CO2, and muscle rigidity"; "Desflurane and sevoflurane appear to be less potent triggers than halothane and produce a more gradual onset of MH"; "The onset may be explosive if succinylcholine is used." p. 966: "If the syndrome begins with slowly increasing end-tidal CO2 ..., specific therapy can await a complete clinical workup". Visoiu M et al. Anesth Analg 2014;118:388-396, PMID 24445637 (abstract, n = 477 registry cases): onset "shorter after succinylcholine in all anesthetics" and shorter with sevoflurane than desflurane/isoflurane; "Since 1998, MH signs have more often appeared later, in the second or third hour of anesthesia". Larach MG et al. Anesthesiology 2008;108:603-611, PMID 18362591 (cross-ref research/29 #15): induction to maximum EtCO2 216 vs 87 min (arrest/death vs not). The tables' own sources (MH-EMCrit, MH-OA web pages) were not opened, and no human source was found that gives an EtCO2 value or slope at a fixed time after onset at constant MV: the "40 -> 60 by 10 min" figure is UNVERIFIED.
- **Band vs source:** Partly. The direction and the constant-ventilation premise are right. The number is a scenario choice for a fulminant crisis triggered by succinylcholine, not a population value. Onset ranges from explosive to second/third-hour (Visoiu). The band is also an ABSOLUTE level written for a baseline of "40", while this rig starts at 36 after FU-4's dead-space change. So the test asks for +24 where the tables ask for +20.
- **Better evidence:** Arithmetic, not sourced: at fixed alveolar ventilation the EtCO2 rise scales with excess VCO2 / VA and builds with the CO2-store time constant. A VCO2 doubling reached within ~5 min gives roughly +15-25 mmHg by 10 min. So a relative band survives a change in baseline or dead space and an absolute one does not. (grade D (no human time-course data; registry onset widely variable))
- **Verdict: MIS-SPECIFIED** · proposed: Restate as a rise from the rig's own pre-MH baseline: delta EtCO2 +15 to +30 mmHg at 10 min after onset at constant MV (severity 1 = fulminant), keeping the 3-5 mmHg/min slope at 10-15 min; tag it [ENG]/scenario (owner choice, R45) (tables §7 21; Miller 10e Ch31 pp. 965-966; Visoiu 2014 PMID 24445637; Larach 2008 PMID 18362591)
- **Likely not a miss:** yes (rise +18 sits inside +15 to +30; the 3.4 mmHg/min slope already passes)

<a id="row-133"></a>

#### 133. `packages/engine-core/test/engine/endo-acceptance.test.ts:82` — MH + dantrolene 2.5 mg/kg + MV x2 at 20 min: HR < 100 by 15-20 min after the dose
- **Band / stated source:** HR < 100 at +19-20 min after dantrolene 2.5 mg/kg (MV doubled at the dose; no active cooling) — tables §7 check 21 "dantrolene 2.5 mg/kg: EtCO2 falls within 5-10 min, HR normal by 15-20 min"; tables §5.3 dantrolene row "VCO2 excess decays tau 10-20 min, temperature falls with cooling" [TXT]/[ENG] (MH-OA); Q-7e-5
- **Measured:** 129 / 121 at +15 / +20 min; core 39.78 °C (pre-dose HR: not in title)
- **Source verification:** Kolb ME et al. Anesthesiology 1982;56:254-262, PMID 7039419 (abstract): "A mean dantrolene dose of 2.5 mg/kg in these patients produced significant changes in clinical and biochemical parameters suggestive of decreased cellular metabolism" (n = 11; no time course in the abstract). Larach MG et al. Anesth Analg 2010;110:498-507, PMID 20081135 (abstract): "The median total dantrolene dose was 5.9 mg/kg (first quartile, 3.0 mg/kg; third quartile, 10.0 mg/kg)". Miller 10e Ch31 p. 967: "Administer dantrolene rapidly with the initial dose of 2.5 mg/kg intravenously to a maximum of 10 mg/kg until the initial symptoms subside" and "4. Control fever by cooling interventions ... Cooling should be halted at 38°C". Karjalainen J, Viitasalo M. Arch Intern Med 1986;146:1169-1171, PMID 2424378 (abstract): "When the temperature rose by 1 degree C, the heart rate increased on the average by 8.5 beats per minute." MH-OA page not opened: the "HR normal by 15-20 min" timing is UNVERIFIED.
- **Band vs source:** No. No source found times HR normalisation after a single 2.5 mg/kg dose. The registry median TOTAL dose is 5.9 mg/kg, so one 2.5 mg/kg dose is often not enough. The tables' own §5.3 row says temperature falls "with cooling", and this rig has no cooling (Q-7e-5). With the core still at 39.8 °C, fever alone adds about +25 bpm (8.5/°C x 3 °C) to a baseline of 75, so HR < 100 is not expected.
- **Better evidence:** Miller's treatment sequence makes cooling a separate step, alongside dantrolene; the fever HR coefficient is 8.5 bpm/°C (n = 27). (grade C (textbook treatment sequence) + B (fever HR coefficient, small human study))
- **Verdict: MIS-SPECIFIED** · proposed: Either (a) add active cooling to the rig (Miller step 4, stop at 38 °C) and keep HR < 100 by +20 min as an [ENG]/scenario band; or (b) with no cooling, require HR to fall >= 15 % from its peak by +20 min and to stay <= baseline + 8.5 bpm/°C x (core - 36.8) + 15, about <= 115 at 39.8 °C from a baseline of 75 ([ENG], derived) (Miller 10e Ch31 p. 967; Karjalainen 1986 PMID 2424378; Larach 2010 PMID 20081135; tables §5.3)
- **Likely not a miss:** partly (121 is about 6 bpm above the fever-adjusted ceiling; the < 100 cut assumes cooling the rig does not do)

<a id="row-134"></a>

#### 134. `packages/engine-core/test/engine/fu10-fever.test.ts:9` — sepsis (phase sepsis) under GA: core 38.5-41 °C at 90 min (tables §5e)
- **Band / stated source:** core >= 38.5 °C (title 38.5-41) at 90 min after sepsis onset; ventilated, GA flag, 21 °C — tables §5e sepsis `tempSet` 38.5-39.5 (warm shock 38.5-40) [TXT]; research/14 ET-12; ruling R-3 (A8 withdrawn pending Ali, Q7)
- **Measured:** 36.60 °C (36.86 before Task A3); research/14 ET-12 GA-flag control at 90 min 35.42 (pre-A3)
- **Source verification:** Negishi C et al. Anesthesiology 1998;88:1162-1169, PMID 9605674 (abstract, n = 8 volunteers, IL-2 pyrogen, desflurane started 3 h after the first dose): "Peak core temperature (elapsed time, 5-8 h) decreased in a dose-dependent fashion: 38.6 +/- 0.5 degrees C on the control day, 37.7 +/- 0.7 degrees C during 0.6 MAC and 37.2 +/- 1.0 degrees C during 1.0 MAC desflurane anesthesia"; "1.0 MAC essentially obliterating fever". Lenhardt R et al. Anesthesiology 1998;89:648-656, PMID 9743401 (abstract): fever during anaesthesia "is rare ... This low incidence results in part from dose-dependent inhibition of fever by volatile anesthetics." Sessler DI. Anesthesiology 2008;109:318-338, PMID 18648241 (abstract): "All general anesthetics produce a profound dose-dependent reduction in the core temperature".
- **Band vs source:** No. The §5e values are set points, the presentation of sepsis on the ward. They do not describe the core of a ventilated patient under GA in a 21 °C room. Awake, pyrogen fever peaks at 5-8 h (38.6 ± 0.5), not at 90 min. At 1 MAC the peak is 37.2 ± 1.0 °C, even with the pyrogen given 3 h before induction. The 41 °C ceiling also exceeds §5e's own 39.5.
- **Better evidence:** Human volunteer dose-response (0, 0.6, 1.0 MAC) with a pyrogen; isoflurane data concordant (Lenhardt 1998). (grade B (small human experimental, n = 7-8, consistent across agents))
- **Verdict: MIS-SPECIFIED** · proposed: Under ~1 MAC GA there is no febrile threshold: the sepsis arm's core at 90 min should be >= the GA control + 0.3 °C and <= 37.5 °C (fever largely abolished). Keep 38.5-39.5 °C (§5e) only for an awake or lightly sedated patient, at 4-8 h (Negishi 1998 PMID 9605674; Lenhardt 1998 PMID 9743401; tables §5e)
- **Likely not a miss:** yes (36.60 is afebrile and about +1.2 °C above the pre-A3 GA control of 35.42; control not re-measured here)

<a id="row-135"></a>

#### 135. `packages/engine-core/test/engine/fu10-fever.test.ts:14` — thyroid storm under GA: core 38.5-41 °C at 1 h (thyroid.ts header; tables §5c)
- **Band / stated source:** core >= 38.5 °C (title 38.5-41) at 1 h after storm onset; ventilated, GA flag, 21 °C — thyroid.ts header "core 38.5-41 °C (set point + heat)"; tables §5c hyperthyroid/storm row "T 38.5-41 (storm)" Klein 2007 [TXT]
- **Measured:** 36.34 °C (36.58 before Task A3); GA control at 1 h not in title
- **Source verification:** Coexist 8e Ch22 p. 449: "Thyroid storm and malignant hyperthermia can present with similar intraoperative and postoperative signs and symptoms (i.e., hyperpyrexia, tachycardia, hypermetabolism)"; "Thyroid storm most often occurs in the postoperative period in untreated or inadequately treated hyperthyroid patients after emergency surgery." Negishi 1998 PMID 9605674 as for the sepsis row (GA abolishes set-point-driven fever). Klein 2007 not opened: UNVERIFIED.
- **Band vs source:** Partly. Hyperpyrexia defines a storm, but 38.5-41 °C is the range at presentation (typically postoperative, over hours), not a 1-hour course under GA from normothermia. Under GA the set-point defence is lost, so only metabolic heat is left. Arithmetic [ENG]: VO2 x1.3-1.8 is about +25-65 W, and 70 kg x 3.5 kJ/kg/°C is 245 kJ/°C. That gives at most about +0.4-0.9 °C in the first hour before any extra loss.
- **Better evidence:** Textbook consensus on presentation; the GA blunting evidence comes from the pyrogen studies. (grade C (textbook) + B (GA blunting of fever))
- **Verdict: MIS-SPECIFIED** · proposed: Under GA at 1 h: core above the GA control by +0.3 to +1.0 °C (metabolic heat only). Keep 38.5-41 °C as the awake/postoperative presentation, over hours (Coexist 8e Ch22 p. 449; Negishi 1998 PMID 9605674; tables §5c VO2 x1.3-1.8 [ENG arithmetic])
- **Likely not a miss:** partly (afebrile, as the evidence predicts; the margin over the GA control is not measured in this test)

<a id="row-136"></a>

#### 136. `packages/engine-core/test/engine/fu10-insulin-dextrose.test.ts:32` — insulin 10 units IV, awake: nadir at 20-30 min (insulin-tolerance test)
- **Band / stated source:** glucose nadir 20-30 min after insulin 10 units IV (0.14 U/kg), awake, fasting, non-diabetic — "insulin-tolerance test" (research/14 ET-20a: ITT literature 20-30 min [VERIFY]; research/12 had 40-60 min); ruling R-1 (A5 dropped, -> FU-8 Part B)
- **Measured:** 13.3 min
- **Source verification:** Greenwood FC, Landon J, Stamp TC. J Clin Invest 1966;45:429-436, PMID 5937021 (full text, p. 431, Results): "After the injection of insulin there was a prompt fall of the plasma sugar to a minimal value at 20 to 30 minutes" (0.025-0.15 U/kg IV, fasting adult controls, samples every 10 min for 1 h); Summary: "plasma sugar and EFA levels fell to a nadir at 20 to 30 minutes". Sci Rep 2024, PMID 39622921 (full text, 0.15 IU/kg, n = 15): "Hypoglycemia (plasma glucose < 40 mg/dl) was reached after a median time of 15 min (CI 15-20)".
- **Band vs source:** Yes. Same population (fasting non-diabetic adults), the same IV route and a comparable dose (0.14 vs 0.10-0.15 U/kg). Caveat: with 10-min sampling, the true nadir could fall anywhere in about 15-35 min.
- **Better evidence:** The 2024 data put the < 40 mg/dL crossing at a median of 15 min, so the nadir follows it. research/12's 40-60 min band (ET-20a) is too late. (grade B (human controls, n = 38 subjects / 54 tests, 1966; concordant 2024 cohort))
- **Verdict: RIGHT** · proposed: keep 20-30 min (at most widen to 15-35 min for sampling resolution); retire research/12's 40-60 (Greenwood 1966 PMID 5937021; Sci Rep 2024 PMID 39622921)
- **Likely not a miss:** no (13.3 min is earlier than even the median < 40 mg/dL crossing at 15 min)

<a id="row-137"></a>

#### 137. `packages/engine-core/test/engine/fu10-thresholds.test.ts:41` — open wound: vasoconstriction begins at 3-4 h (Sessler 2000)
- **Band / stated source:** vasoconstriction onset 3-4 h after induction (surgical arm with open-wound `prep` loss, 21 °C, 40 y) — Sessler 2000 (research/14 ET-01b: "plateau at 3-4 h once vasoconstriction is triggered"); ruling R-5 (PREP_EVAP_W_70 40 W [ENG] -> calibration queue)
- **Measured:** 2.27 h (onset core 34.3-34.7 passes in the sibling `it`)
- **Source verification:** Sessler DI. Anesthesiology 2000;92:578-596, PMID 10691247 (abstract) describes the three phases with no hours: "when surgical patients become sufficiently hypothermic, they again trigger thermoregulatory vasoconstriction ... maintains a core temperature plateau". The "3-4 h" locator is not in the abstract and the full text was not opened: UNVERIFIED. Kurz A et al. Anesthesiology 1995;83:491-499, PMID 7661349 (abstract; volunteers, propofol/isoflurane, ~22 °C): "monitored for approximately 2 h before vasoconstriction"; "Core temperature decreased approximately 1.3 C during the 2-h prevasoconstriction period; however, core temperature remained virtually constant during the subsequent 3 h." Kurz A et al. Anesthesiology 1995;82:870-876, PMID 7717557 (abstract; neurosurgery, forced-air cooling): vasoconstriction "at a core temperature of 34.4 +/- 0.9 degree C, 1.7 +/- 0.58 h after induction" (isoflurane) and "34.5 +/- 0.9 degree C, 1.6 +/- 0.6 h" (propofol).
- **Band vs source:** No. The onset time is not a fixed property. It is the time the core takes to reach the threshold, so it depends on heat loss: about 2 h in uncovered volunteers with no wound, and 1.6-1.7 h with cooling. An open wound adds loss and so moves onset EARLIER, not later. The band is also set by the sibling bands: hour 1 -1 to -1.5 °C, then 0.3-0.5 °C/h down to 34.5, gives 2.6-5.3 h.
- **Better evidence:** Human volunteer and patient data put onset at ~1.6-2 h in high-loss settings; 3-4 h is the typical textbook surgical case. (grade B (two small human studies, n = 9 and 26))
- **Verdict: TOO NARROW** · proposed: onset 1.5-4 h (or assert the event itself: onset at the model's threshold 34.5 ± 0.2 °C, which already passes, and drop the clock) (Kurz 1995 PMID 7661349; Kurz 1995 PMID 7717557; Sessler 2000 PMID 10691247)
- **Likely not a miss:** yes (2.27 h inside 1.5-4 h)

<a id="row-138"></a>

#### 138. `packages/engine-core/test/l2/endo/cat-reserve.test.ts:20` — 30 min of sustained sympathetic drive (symp 2.5) lowers the catecholamine reserve below 0.45
- **Band / stated source:** catReserve < 0.45 after 30 min at symp 2.5 (0-1 store, starts at 1) — FU-7 Task 9 Step 4 (audit D9) [ENG]; plan constants tau_down 1200 s, target 1 - 0.8·symp/3 (= 0.33 at symp 2.5); "UNPROTOTYPED as a band"
- **Measured:** 0.485 (0.367 at 60 min)
- **Source verification:** No physiological source exists for a 0-1 "releasable catecholamine store" or for its time constant. Waxman K et al. Anesth Analg 1980;59:355-358, PMID 7189381 (abstract): in 12 critically ill patients, ketamine gave "decreases in ventricular contractility" in six. The authors only propose that "preoperative stress may alter the usual physiologic responses to ketamine"; stores were not measured. research/26 T2 (#8-#10): acidaemia/hypoxaemia RAISE catecholamine release ("sympathetic hyperactivity with diminished catecholamine responsiveness", Dellinger 5e ch. 54).
- **Band vs source:** No source. Against its own plan: 1 - (1 - 0.333)(1 - e^-1.5) = 0.48 at 30 min, so the < 0.45 band contradicts the plan's own constants. The engine (0.485) follows the plan.
- **Better evidence:** Only the clinical phenomenon is sourced (indirect sympathomimetics and ketamine fail or depress in prolonged critical illness; Waxman 1980, case-level). Plasma catecholamines stay HIGH in shock, so 'depletion' is a store concept with no measured time course. (grade D (mechanism hypothesised; no quantitative data))
- **Verdict: UNSUPPORTED** · proposed: Owner choice. Either a direction-only test (falls monotonically; < 0.6 by 60 min), or a band set from the plan's own arithmetic, 0.46-0.52 at 30 min, tagged [ENG]. Put the sourced behaviour at scenario level: ketamine in prolonged shock does not raise MAP/CO (Waxman 1980) (FU-7 plan (D9) [ENG]; Waxman 1980 PMID 7189381; research/26 T2)
- **Likely not a miss:** yes (0.485 is what the plan's constants give)

<a id="row-139"></a>

#### 139. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:266` — diabetic dexamethasone peak +2-4 mmol/L at 4-8 h (PADDI)
- **Band / stated source:** max delta glucose (dexamethasone 8 mg - no-drug control) +2 to +4 mmol/L over 4-8 h; type 2 diabetic, 60 y, no surgery, engine endocrine rig — PADDI, Corcoran 2021 (research/12 ET-19 "peak +2-4 mmol/L at 4-8 h" [VERIFY magnitude]); FU-7 Task 18 Step 4a
- **Measured:** +1.83 mmol/L (non-diabetic +1.02)
- **Source verification:** Corcoran TB et al. NEJM 2021;384:1731-1741, PMID 33951362 (abstract): no glucose magnitude for diabetic patients (hyperglycaemic events in non-diabetics 0.6 vs 0.2 %). The diabetic analysis is Bach LA et al. Br J Anaesth 2026;137:460-469, PMID 42303515 (abstract, n = 1130, HbA1c < 9 %): "The maximum perioperative blood glucose level was 12.5 mM (median, IQR 10.6-15.0) ... compared with 10.3 mM (8.8-12.4) ... (estimated difference 1.86 mM (95% CI 1.50-2.22)". The full text (PMC13494095, Results, "Secondary outcomes") reports "the maximum effect 8-12 h after surgery (median 11.4 [9.3-14.1] vs 9.0 [7.6-10.9] mM, estimated difference 2.25 mM [95% CI 1.88-2.61]". Hans P et al. Br J Anaesth 2006;97:164-170, PMID 16698859 (abstract, 10 mg, abdominal surgery): glucose "peaked at 120 min after 10 mg dexamethasone in both groups"; the rise was "29 (19) and 35 (19)% of baseline in Group D and Group ND".
- **Band vs source:** No. The +2-4 figure is not in PADDI. The PADDI diabetic effect is +1.86 (CI 1.50-2.22) on the 24-h maximum and +2.25 (CI 1.88-2.61) at its peak time, which is 8-12 h AFTER SURGERY. The patients were surgical, had operations of at least 2 h, and had post-operative feeding and insulin. The engine rig has no surgery, and its 4-8 h window ends before PADDI's peak. Hans 2006 puts the peak at 2 h under surgery.
- **Better evidence:** Diabetic preplanned substudy of a large RCT (n = 1130); Hans 2006 for the earlier intraoperative profile. (grade A (RCT substudy, n = 1130))
- **Verdict: MIS-SPECIFIED** · proposed: Diabetic dexamethasone 8 mg minus control: max +1.5 to +2.6 mmol/L, with the window widened to 2-16 h after the dose (the PADDI peak is 8-12 h after surgery; Hans's 2 h peak sets the early edge). Keep the sibling 'diabetic > non-diabetic' test (Bach 2026 PMID 42303515 (PMC13494095); Corcoran 2021 PMID 33951362; Hans 2006 PMID 16698859)
- **Likely not a miss:** yes (+1.83 sits inside the PADDI 95 % CI 1.50-2.22)

<a id="row-140"></a>

#### 140. `packages/engine-core/test/l2/temp/temp.test.ts:38` — GA: the hour-8 plateau stays at or above 34.5 °C
- **Band / stated source:** min core in hour 8 >= 34.5 °C (GA, 70 kg, heat model alone) — R45 (FU-10 E5, ruling R-4: VASOCONSTRICT_C 34.8 [ENG] -> 34.5, the tables' value); E-FU10-3
- **Measured:** 34.37 °C
- **Source verification:** Sessler 2000, PMID 10691247 (abstract): vasoconstriction "maintains a core temperature plateau (despite continued systemic heat loss)". Kurz 1995, PMID 7661349: "core temperature remained virtually constant during the subsequent 3 h". Kurz 1995, PMID 7717557: thresholds 34.4 +/- 0.9 (isoflurane) and 34.5 +/- 0.9 °C (propofol). Kurz A et al. Anesthesiology 1993;79:465-469, PMID 8363070 (abstract; isoflurane 0.6-0.8 % + 70 % N2O): "The vasoconstriction threshold was significantly less in the elderly patients (33.9 +/- 0.6 degree C) than in the younger ones (35.1 +/- 0.3 degrees C)".
- **Band vs source:** No. The threshold is the core temperature at which vasoconstriction STARTS. Graded vasoconstriction balances the loss once the core sits at or a little below that threshold, so '>= threshold' is the wrong inequality for the plateau. The threshold itself spans about 33.9-35.1 °C by agent, dose and age (SD 0.3-0.9).
- **Better evidence:** Plateau level = threshold minus the small error that graded vasoconstriction needs; thresholds measured in humans. (grade B (small human studies, consistent))
- **Verdict: MIS-SPECIFIED** · proposed: hour-8 plateau between threshold - 0.5 and threshold + 0.1 °C (34.0-34.6 for the 34.5 threshold) and flat (< 0.1 °C/h, the sibling test); population range 34.0-35.2 °C for a 40-y adult (Kurz 1993 PMID 8363070; Kurz 1995 PMID 7661349; Kurz 1995 PMID 7717557; Sessler 2000)
- **Likely not a miss:** yes (34.37 is 0.13 °C below the threshold, inside 34.0-34.6)

<a id="row-141"></a>

#### 141. `docs/validation/calibration-queue.md (validation scenario t21-mh)` — t21-mh/10min/etco2
- **Band / stated source:** 51.0-69.0 mmHg (mean 870-930 s, i.e. 9.5-10.5 min after MH onset at 300 s) — tables §7 21: EtCO2 40 -> 60 by 10 min (±15 %)
- **Measured:** 73.5 (queue run 2026-09-27, commit 7bcf992; baseline segment et0 42.3)
- **Source verification:** As endo-acceptance.test.ts:22 (Miller 10e Ch31 pp. 965-966; Visoiu 2014; Larach 2008). The '40 -> 60 by 10 min' figure is UNVERIFIED.
- **Band vs source:** Partly, for the same reasons as row 1. The rig differs from the test's in four ways. (1) The queue was generated at 7bcf992 on 2026-09-27, BEFORE FU-4 merged (e81e53f, 2026-09-29). FU-4 cut the ventilator dead space from 204 + fit to 127 + fit, so at 12 x 500 the queue rig had a lower VA, about 3.5 vs about 4.5 L/min. Its baseline was therefore higher (42.3 vs 36), and the same VCO2 excess raised EtCO2 faster (+31 vs +18). (2) The t21 document sends no `thermal anaesthesia general` flag, so its thermal and hormonal state is awake, while the test sets the GA flag. (3) Seed 1 vs 7. (4) Window 9.5-10.5 vs 9.67-10 min. Item 1 is the main cause. The queue row is stale. The expectation that it would now read about 54-56 is inference, not a measurement.
- **Better evidence:** As row 1: a relative band survives the dead-space change; an absolute 60 ±15 % does not. (grade D)
- **Verdict: MIS-SPECIFIED** · proposed: delta EtCO2 +15 to +30 mmHg above the 240-300 s baseline segment at 10 min (57-72 from 42.3). Regenerate the queue on the post-FU-4 tree before calibrating (tables §7 21; Miller 10e Ch31 pp. 965-966; Visoiu 2014 PMID 24445637)
- **Likely not a miss:** partly (+31.2 is just above +30 on a stale pre-FU-4 run; post-FU-4 the same rig family measures +18, which is inside)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **fu10-fever:9 / :14, a febrile core of 38.5–41 °C under GA at 60–90 min.** At 1 MAC desflurane the peak core is 37.2 ± 1.0 °C against
   38.6 ± 0.5 awake (Negishi 1998), and awake fever peaks at 5–8 h, not 90 min. The tables' §5e/§5c values are set points or presentation
   values. Dependents: ruling R-3 (A8 withdrawn) and owner question Q7; research/14 E11 (ET-12, ET-13a, ET-26a, ET-28); the thyroid.ts header
   comment; the withdrawn A8 120 W heat source, which this evidence argues against reviving.
2. **interactions-misc:266, diabetic dexamethasone +2–4 mmol/L at 4–8 h.** PADDI's diabetic substudy gives +1.86 (CI 1.50–2.22), with the
   peak 8–12 h after surgery. Dependents: research/12 ET-19 and research/14 ET-19 (the "[VERIFY magnitude]" cell); FU-7 Task 18 Step 4a; the
   glucocorticoid Emax (4000), which was deliberately not raised. Raising it to reach +2 would overshoot the evidence.
3. **temp:38, hour-8 plateau ≥ 34.5 °C.** The inequality is wrong: the plateau sits at or just below the threshold. Dependents: ruling R-4
   (VASOCONSTRICT_C 34.5); the passing sibling at temp.test.ts:22 (≤ 35.5, flat); E-FU10-3.
4. **endo-acceptance:22 and queue t21, EtCO2 ≥ 60 (51–69) by 10 min.** The band is absolute against a baseline of "40" and has no human
   time-course source. It cannot survive FU-4's dead-space change. Dependents: drug-layer-guards.test.ts:74 (DI-65, 52–70, measured 42.2,
   the same rig family); the t21 sanity document's 20-min "rising > 10 min + 15" segment; tables §7 21; Q43.
5. **endo-acceptance:82, HR < 100 by 15–20 min after dantrolene.** The band assumes cooling that the rig lacks (Q-7e-5) and a single 2.5 mg/kg
   dose (registry median total 5.9 mg/kg). Dependents: Q-7e-5; the tables §5.3 dantrolene row (τ 10–20 min [ENG]).
6. **fu10-thresholds:41, vasoconstriction at 3–4 h.** Too narrow: humans reach it at 1.6–2 h when heat loss is high. Dependents: ruling R-5,
   PREP_EVAP_W_70 (40 W [ENG], the calibration knob). This band should NOT drive that knob, and research/14 ET-01b (vasoOnsetH) should not either.
7. **cat-reserve:20, < 0.45 at 30 min.** Unsupported, and it contradicts its own plan constants (they give 0.48). Dependents: FU-7 audit D9,
   cat-reserve-engine.test.ts (ketamine in the depleted state), and the plan constants τ_down 1200 s and target 1 − 0.8·symp/3.

**(b) Known misses that are probably NOT misses** (the measured value sits inside the corrected or evidence band): MH EtCO2 rise +18 at
10 min (the test rig); the sepsis core of 36.60 under GA; the storm core of 36.34 under GA (partly: margin over the control not measured);
vasoconstriction at 2.27 h; catReserve 0.485 (it follows the plan arithmetic); diabetic dexamethasone +1.83; the hour-8 plateau at 34.37. Partly:
queue t21 (+31.2 on a stale pre-FU-4 run) and HR 121 after dantrolene without cooling (about 6 bpm above a fever-adjusted ceiling). Still a real
miss against a RIGHT band: the insulin nadir at 13.3 min. The 20–30 min band is RIGHT (Greenwood 1966). research/12's 40–60 min band was wrong.

**(c) Items with no source.** cat-reserve:20 (an [ENG] store with no physiological time course; the band does not even match its plan).
Tables §7 21: "EtCO2 40 → 60 by 10 min" and "HR normal by 15–20 min" (sourced to EMCrit/OpenAnesthesia web pages; no human time course found).
Queue t21 inherits this. The "3–4 h" onset attributed to Sessler 2000 (locator not found in the abstract; the full text was not opened). The "+2–4 mmol/L at
4–8 h" attributed to PADDI (it is not in PADDI). The thyroid.ts / tables §5c "38.5–41 °C" as a 1-hour target under GA (Klein 2007 not opened).

## Drugs (A): drug layer, apnoea and induction

Twenty-one rows: 20 `it.fails` acceptance bands in the FU-7 drug layer, drug-apnoea, volatile-surge and
induction-synergy tests, plus the one guard row whose band is an engineering tolerance rather than a target
(`drug-layer-guards.test.ts:93`). Verdicts: 10 MIS-SPECIFIED, 5 RIGHT, 2 TOO NARROW, 1 TOO WIDE, 3 UNSUPPORTED.
The dominant pattern is **a sourced number measured on the wrong quantity**: a high-dose morphine MAP fall applied to
a 10 mg bolus; a beta-agonist-response multiplier applied to a MAP endpoint whose mechanism is alpha-mediated (and which
the engine's own adrenaline row contradicts); an admission-survival proportion from ARREST used as a per-shock ROSC
multiplier; dose-additivity of local anaesthetics asserted as an effect increment near saturation; a second-gas
magnitude whose large component is arterial, not end-tidal; a shortest-RR acceleration in pre-excited AF asserted as a
mean-rate rise on a rig already at 232/min; and two induction-onset rows hung on "one arm-brain circulation", a phrase
Miller attaches to its FASTEST class (whose only number in that chapter is thiopental's 10-30 s). The second pattern is
**point-estimate bands with no dispersion**: Billard's 1.89 became 1.7-2.1, and Czarnetzki's +35 % became 20-90 %.
In 6 of the 21 rows the measured value already sits inside the corrected band, and 6 more are partly inside.
Real misses against bands that survive scrutiny: fentanyl 5 ug/kg apnoea (Dahan 2005: apnoea above 2.9 ug/kg), the
Bailey population row, nitroprusside SV in HFrEF, ketamine's 16 s LOC, adrenaline's reflex bradycardia under blockade,
magnesium's rocuronium prolongation, the desflurane surge, and the propofol-fentanyl hypotension ratio.
On the FU-6 question the neuro section raised: the fentanyl-pair induction-apnoea band that forced the ventilatory
synergy to alpha 0 is self-declared **[ENG, D5; Q-FU6-1]** in `resp-induction.test.ts`'s own header ("Bands [ENG, D5;
Q-FU6-1]: seed 7 alone 10-90 s; + fentanyl 2 ug/kg 60-240 s"), i.e. it is an engine choice, while the synergy it blocks
is grade A (Bailey 1990 PMID 2122773; Dahan 2005 PMID 15833777; Nieuwenhuijs 2003 per research/30-parts/04 row 5).
The evidence says the 240-s ceiling, not the synergy, should give way. Sources opened locally: Miller 10e ch. 21, 22, 31
(per-chapter PDFs, printed pages quoted); abstracts read through PubMed E-utilities. UNVERIFIED and why: Cohn &
Franciosa 1977 (review, no abstract, full text not obtained), Epstein 1964 (no abstract), Miller ch. 24 p. 698 (chapter
not in the local set), "M10 ch. 14" for adrenergic pharmacology (local ch. 14 is the GI/hepatic chapter), the ASRA 2020
checklist as a source for LA additivity, and any measured EtCO2-vs-time series for a triggered MH crisis.

### Rows

<a id="row-142"></a>

#### 142. `packages/engine-core/test/engine/drug-apnoea.test.ts:81` — fentanyl 5 ug/kg on room air stops breathing (DI-71): VE < 1 L/min for >= 60 s within 5 min, SpO2 nadir < 90 %
- **Band / stated source:** apnoea (VE < 1 L/min) for >= 60 s within 5 min AND SpO2 nadir < 90 % — DI-71 (research/14); FENT_VENT_REMI_EQ 0.55, APNOEA_VE_IN 0.1 x ve0
- **Measured:** 0 s of apnoea (VE nadir 2.28 of 6.44 L/min, -65 %), SpO2 86
- **Source verification:** Miller 10e ch. 22 Opioids (local PDF): fentanyl "dose-dependent respiratory depression results in apnea at doses higher than 2.9 mcg/kg" (citing its ref 565). Primary: Dahan A et al. Br J Anaesth 2005;94:825-34, PMID 15833777 (abstract): "fentanyl produced a dose-dependent depression of minute ventilation with apnoea at doses > or = 2.9 microg kg(-1)" (n=21 healthy volunteers, 90-s IV infusion, ventilation at end-tidal PCO2 clamped at 7 kPa). SpO2 limb: Bailey PL et al. Anesthesiology 1990;73:826-30, PMID 2122773: "Fentanyl alone produced hypoxemia in half of the subjects" (2 ug/kg, room air, hypoxaemia = SaO2 < 90 %). Room-air desaturation speed cross-referenced from research/28 #9 (Weingart & Levitan 2012, PMID 22050948: "the duration of safe apnea on room air is approximately 1 minute").
- **Band vs source:** Yes. 5 ug/kg is 1.7 x Dahan's apnoeic threshold dose, the rig is the matching population (unstimulated adult, no airway support), and SpO2 < 90 % on room air follows from Bailey at a quarter of this dose. Only the 60-s duration floor is an engine choice (Dahan reports apnoea, not its duration) and it is a modest one.
- **Better evidence:** Dahan 2005 is the dose-response study; Bailey 1990 the room-air oximetry. Both say an unstimulated adult given >= 3 ug/kg fentanyl stops breathing. (grade A (two human experimental studies, n=21 and n=12))
- **Verdict: RIGHT** · proposed: keep (optionally soften the duration floor to >= 30 s, which Dahan still supports) (Dahan 2005 PMID 15833777; Bailey 1990 PMID 2122773; Miller 10e ch. 22)
- **Likely not a miss:** no (real miss: VE only falls 65 %, the chemoreflex buffers the drug; see section finding (a) 1)

<a id="row-143"></a>

#### 143. `packages/engine-core/test/engine/drug-apnoea.test.ts:89` — naloxone 0.4 mg restores breathing (DI-71): VE back to >= 40 % of the pre-drug VE within 30-180 s
- **Band / stated source:** 30-180 s to VE >= 40 % of baseline — DI-71; label, M10 ch. 22
- **Measured:** +1 s (VE never fell below 40 % of baseline: nadir 2.27 of 6.45 L/min - no apnoea to reverse)
- **Source verification:** Miller 10e ch. 22 Opioids (local PDF, naloxone section): "Initial naloxone dose recommendations range from 0.4 to 0.8 mg. Onset of action of IV naloxone is rapid (1-2 minutes), and half-life and duration of effect are short, approximately 30 to 60 minutes."
- **Band vs source:** Yes. Dose and route match the cited label text and 30-180 s brackets the textbook's 1-2 min with margin on both sides. The endpoint (VE back to 40 % of pre-drug) is an engine construct, but it is the natural operationalisation of "reverses".
- **Better evidence:** - (textbook/label consensus; no better human series needed for a 1-2 min onset) (grade C (textbook/label consensus))
- **Verdict: RIGHT** · proposed: keep (Miller 10e ch. 22 (naloxone); naloxone label)
- **Likely not a miss:** partly (the band is right; the measured +1 s is an artefact of the previous row's miss - there is no depression to reverse, so this row cannot be scored until drug-apnoea:81 passes)

<a id="row-144"></a>

#### 144. `packages/engine-core/test/engine/drug-apnoea.test.ts:101` — the Bailey pair (DI-03): SpO2 nadir 70-89 % on seed 7, and the singles >= 93 %
- **Band / stated source:** pair SpO2 nadir 70-89 % on seed 7; fentanyl alone >= 93 %; midazolam alone >= 93 % — DI-03; Bailey 1990
- **Measured:** pair 46 %, fentanyl 94 %, midazolam 95 %
- **Source verification:** Bailey PL et al. Anesthesiology 1990;73:826-30, PMID 2122773 (abstract): midazolam 0.05 mg/kg and fentanyl 2.0 ug/kg in volunteers; "Midazolam alone produced no significant respiratory effects. Fentanyl alone produced hypoxemia in half of the subjects and significant depression of the ventilatory response to CO2, but did not produce apnea. Midazolam and fentanyl in combination significantly increased the incidence of hypoxemia (11 of 12 subjects) and apnea (6 of 12 subjects)" (hypoxaemia = SaO2 < 90 %, apnoea = no spontaneous effort for 15 s). No nadir distribution is given, so the 70 % floor is UNVERIFIED.
- **Band vs source:** No. Two defects. (1) The "fentanyl alone >= 93 %" clause asserts the opposite of the paper: fentanyl 2 ug/kg alone desaturated below 90 % in half the volunteers, so a per-seed floor for the single arm is the wrong shape (it should be a population statement). (2) The 70 % floor appears nowhere in Bailey; on room air an apnoeic adult passes 90 % in about a minute and then falls 26-33 %/min (research/28 #9, #21), so nadirs well below 70 % are physiologically ordinary once apnoea persists.
- **Better evidence:** Bailey 1990 remains the canonical pair. For nadir depth use the room-air desaturation data in research/28 (Weingart & Levitan 2012 PMID 22050948; Hardman & Wills 2006 PMID 16873387). (grade A (n=12 human experimental) for the incidence; B (model/review) for the nadir depth)
- **Verdict: MIS-SPECIFIED** · proposed: pair SpO2 nadir < 90 % (drop the 70 % floor, or set a sanity floor of ~40 %); test the singles as a population claim - fentanyl alone < 90 % in roughly half of the seeds, midazolam alone >= 93 % (Bailey 1990 PMID 2122773; research/28 (Weingart & Levitan 2012 PMID 22050948; Hardman & Wills 2006 PMID 16873387))
- **Likely not a miss:** partly (the pair's 46 % satisfies "< 90 %" and is reachable on room air; the arguable deviation is the FENTANYL single at 94 %, which Bailey says should desaturate in about half of patients)

<a id="row-145"></a>

#### 145. `packages/engine-core/test/engine/drug-apnoea.test.ts:112` — the Bailey pair as a POPULATION claim over seeds 1-20: apnoea in >= 4 of 20
- **Band / stated source:** >= 4 of 20 seeds with apnoea (VE < 1 L/min) — DI-03; Bailey 1990: 6/12
- **Measured:** 0 of 20
- **Source verification:** Bailey 1990, PMID 2122773 (as above): apnoea in "6 of 12 subjects", apnoea defined as "no spontaneous respiratory effort for 15 s".
- **Band vs source:** Partly. As a floor it is lenient and therefore safe: 4/20 = 20 %, below the binomial 95 % interval of 6/12 (about 21-79 %). The mismatch is in the measurement, not the number - Bailey's apnoea is a 15-s absence of effort, the engine's is minute ventilation under 1 L/min, which a 15-s pause need not produce.
- **Better evidence:** - (Bailey is the source population; no larger series of this exact pair located) (grade A (n=12 human experimental))
- **Verdict: RIGHT** · proposed: keep >= 4/20, but score apnoea as >= 15 s with no committed effort (Bailey's own definition) so the engine measures what Bailey measured (Bailey 1990 PMID 2122773)
- **Likely not a miss:** no (0/20 fails any reading of the source; this is the same underlying miss as drug-apnoea:81)

<a id="row-146"></a>

#### 146. `packages/engine-core/test/engine/drug-apnoea.test.ts:154` — ... and the flag clears once effort returns (the trigger is visible: rr > 0)
- **Band / stated source:** after the last apnoea-flag second there must be a sample with rr > 0 and the flag down, within 1200 s — none (review F11 state-machine assertion; engine rig ETT + VCV 12 x 600, FiO2 0.5, remifentanil 1 ug/kg)
- **Measured:** committed rate stays 0 for all 1200 s (flag up 1200 s)
- **Source verification:** No clinical source is claimed or needed for the flag logic. The rig, however, decides the outcome: VCV 12 x 600 is about 7.2 L/min of alveolar-plus-dead-space ventilation in a 70 kg adult, which holds PaCO2 at or below the apnoeic threshold, and after remifentanil the CO2 threshold is shifted further up - so no spontaneous effort should return inside 20 min. That is the standard apnoeic-threshold teaching (passive hyperventilation abolishes drive); the test's own R45 comment says the same.
- **Band vs source:** No - the assertion is not wrong, it is unobservable on this rig. There is no population/setting mismatch to fix, only a rig choice that makes the event impossible.
- **Better evidence:** The clearing half of the claim is testable on a hypoventilating rig (e.g. RR 6 x 400, or after naloxone) where PaCO2 rises above the threshold and effort returns. (grade C (textbook apnoeic-threshold physiology))
- **Verdict: MIS-SPECIFIED** · proposed: keep the assertion but move it to a rig where effort can return (reduced MV, or naloxone/remifentanil washout), or demote it to a unit test on the flag's state machine (engine rig arithmetic + apnoeic-threshold physiology (Miller 10e ch. 12); test's own R45 note)
- **Likely not a miss:** yes (the engine's behaviour - no effort during passive hyperventilation - is the physiologically correct one for that rig)

<a id="row-147"></a>

#### 147. `packages/engine-core/test/engine/drug-layer-guards.test.ts:74` — MH: EtCO2 52-70 by 10 min at constant MV (DI-65; tables §7 check 21)
- **Band / stated source:** EtCO2 52-70 mmHg at 10 min after the MH trigger, constant MV — DI-65; tables §7 check 21 ("EtCO2 at constant MV rises 40 -> 60 by 10 min")
- **Measured:** 42.2 (identical on the pre-FU-7 baseline b004289: 42.2)
- **Source verification:** The stated source is the project's own table, so the citation is circular. Literature check: Miller 10e ch. 31 Neuromuscular Disorders and Other Genetic Disorders (local PDF) gives the sign but no rate - MH "should be suspected whenever there is an unexpected increase in end-tidal CO2 (ETCO2)", and it contrasts fulminant MH with a syndrome that "begins with slowly increasing end-tidal CO2". Larach MG et al. Anesth Analg 2010;110:498-507, PMID 20081135 (abstract): "Frequent initial MH signs were hypercarbia, sinus tachycardia, or masseter spasm", median maximum temperature 39.1 C - no EtCO2 time course. research/29 §1.6 records that the only registry EtCO2 timing figure is induction-to-peak EtCO2 (216 min in fatal/arrest cases vs 87 min in survivors). No measured EtCO2-vs-time series for a triggered crisis was located: UNVERIFIED.
- **Band vs source:** No. The band is a project-internal number presented as a source, and the textbook explicitly describes a spectrum of onset speeds, so a fixed 18-mmHg window at exactly 10 min cannot be read off any source. Direction and rough scale are uncontroversial; the window is not.
- **Better evidence:** Express the claim as a RATE with a wide absolute window (a fulminant crisis at constant MV raises EtCO2 by several mmHg per minute, per the tables' own "keeps rising 3-5 mmHg/min" and Miller's fulminant description). (grade D (no quantitative source; textbook direction only))
- **Verdict: UNSUPPORTED** · proposed: EtCO2 rising >= 3 mmHg/min at constant MV with a 10-min window of 50-90 mmHg, tagged [ENG] until a measured series exists (Miller 10e ch. 31 (MH onset description); Larach 2010 PMID 20081135; research/29 §1.6)
- **Likely not a miss:** no (42.2 equals the control arm - the engine shows no MH CO2 rise at all, which fails every version of the claim; note the research/14 audit harness measured 59.2 on the same cell, so this is an engine-integration gap, not only a band question)

<a id="row-148"></a>

#### 148. `packages/engine-core/test/engine/drug-layer-guards.test.ts:93` — propofol effect-site TCI 3 ug/mL without overshoot: Ce peak 2.99-3.01
- **Band / stated source:** Ce peak within +-0.01 ug/mL of the 3.0 target (+-0.3 %) — DI-67; 7g gate max 3.0005 (an internal gate figure)
- **Measured:** 3.110 on the gate tree (3.132 before the FU-9 merge; baseline b004289: 3.1)
- **Source verification:** No clinical source is cited and none exists for a +-0.3 % tolerance: this is an engineering guard on the TCI controller, not a physiological acceptance band. The physiological content of "effect-site TCI" is that the PLASMA concentration overshoots deliberately while Ce approaches the target monotonically; the tolerance on Ce is a numerical-integration choice.
- **Band vs source:** Not applicable - the band has no population, setting or measurement to match. As a guard it is defensible in direction and far too tight in width: +-0.01 ug/mL is below the resolution of any clinical measurement and close to the engine's own step error.
- **Better evidence:** - (engineering tolerance; no literature applies). The clinically meaningful statement is "Ce does not exceed the target by more than a few per cent". (grade D (engineering choice, no source))
- **Verdict: UNSUPPORTED** · proposed: Ce peak <= 1.02 x target (<= 3.06 at a 3.0 target), stated as an [ENG] controller tolerance with the integration step named (none (engine specification); DI-67 row in research/14)
- **Likely not a miss:** partly (3.11 is a 3.7 % overshoot, which a real pump log would flag, so the guard is catching something; only the +-0.3 % width is arbitrary)

<a id="row-149"></a>

#### 149. `packages/engine-core/test/engine/drug-layer-guards.test.ts:165` — verapamil 5 mg in pre-excited AF produces VF or a faster ventricular rate than the same rhythm without it
- **Band / stated source:** VF after the drug, OR max HR >= 10 bpm above the no-drug arm — DI-15; ALS (the AV-nodal-blocker hazard)
- **Measured:** no change (max rate 232 in both arms; AV-node occupancy 0.35 < the hook's 0.5 threshold)
- **Source verification:** Gulamhusein S, Ko P, Carruthers SG, Klein GJ. Circulation 1982;65:348-54, PMID 7053894 (abstract): eight WPW patients; verapamil "decreased the shortest RR interval between preexcited ventricular complexes during atrial fibrillation (279 +/- 20 msec vs 236 +/- 18 msec, mean +/- SEM; p less than 0.01)"; "two patients required cardioversion for hemodynamic deterioration after acceleration of the ventricular response"; in the four patients with predominantly preexcited complexes "the ventricular rate accelerated after verapamil, whereas in patients with predominantly normal ventricular complexes, the average ventricular rate decreased or did not change".
- **Band vs source:** Partly. The hazard is real and the drug/rhythm match, but three things do not: (1) it is a subset, probabilistic effect (4 of 8 accelerated, 2 of 8 deteriorated, no VF in the series) asserted here as a deterministic outcome; (2) the source's endpoint is the SHORTEST pre-excited RR, not the mean or maximum rate; (3) the rig's control arm already runs at 232/min, so a mean-rate endpoint has almost no headroom - the 279 -> 236 ms shortening corresponds to about 215 -> 254/min on the fastest beats only.
- **Better evidence:** Gulamhusein 1982 for the magnitude; guideline consensus (AV-nodal blockers contraindicated in pre-excited AF) for the hazard. Teaching value sits in the shortest-RR shortening plus a raised VF hazard, not in a guaranteed VF. (grade B (small human EP study, n=8) for the magnitude; C (guideline consensus) for the contraindication)
- **Verdict: MIS-SPECIFIED** · proposed: shortest pre-excited RR shortens by 10-20 % (279 -> 236 ms) in the pre-excited subset, and/or the VF hazard rises (probabilistic), instead of "VF or +10 bpm mean rate" in every run (Gulamhusein 1982 PMID 7053894; ALS / SVT-guideline consensus)
- **Likely not a miss:** partly (the engine does nothing because occupancy 0.35 never reaches the hook's 0.5, so it would miss a shortest-RR endpoint too, but the current endpoint could not have shown a pass even with a correct drug effect)

<a id="row-150"></a>

#### 150. `packages/engine-core/test/engine/drug-layer.test.ts:61` — fast morphine 10 mg lowers MAP by 8-25 %
- **Band / stated source:** MAP -8 to -25 % vs the no-drug arm — tables §6.3 (T6.3) / DI-42; "Miller ch. 22: fast morphine 10 mg lowers SVR 10-20 % through histamine release"
- **Measured:** -6.7 % (SVR -10.8 %, HR +20.6; -5.6 % before the FU-9 merge)
- **Source verification:** Mechanism in Miller 10e ch. 22 Opioids (local PDF): opioids "produce modest vascular smooth muscle relaxation with the exception of a morphine-induced hypotension mediated by histamine release", and "morphine causes histamine release in an opioid receptor-independent mechanism". The quantitative human studies are all at far larger doses: Rosow CE et al. Anesthesiology 1982;56:93-6, PMID 6172999 - morphine 1 mg/kg: "an average 750 per cent peak increase in plasma histamine accompanied by a significant decrease in mean arterial pressure (-27 mmHg" and SVR (-520 dyne s cm-5); Fahmy NR et al. Clin Pharmacol Ther 1983;33:615-20, PMID 6839633 - morphine 0.3 mg/kg, n=10: "Systolic and mean arterial pressures and systemic vascular resistance decreased and cardiac output increased because of increases in heart rate and stroke volume"; Flacke JW et al. Anesth Analg 1987;66:723-30, PMID 2440351 - morphine 0.6 +/- 0.02 mg/kg: "One of the ten patients given morphine ... developed hypotension, tachycardia, and an increase in plasma histamine level to 12.4 ng/ml".
- **Band vs source:** No, on dose. 10 mg in a 70 kg adult is about 0.14 mg/kg - a seventh of Rosow's dose, half of Fahmy's, and a quarter of Flacke's, where only 1 of 10 patients showed any hypotension at all. An 8 % MAP floor is a high-dose cardiac-anaesthesia figure applied to a ward bolus, and morphine histamine release is idiosyncratic (all six releasers in Flacke's 60 patients were young women). The engine's own SVR fall (-10.8 %) with a reflex +20.6 HR is exactly the mechanism the sources describe; MAP is then buffered.
- **Better evidence:** Dose-scaled reading of the same three studies: at 0.14 mg/kg expect SVR -5 to -15 %, MAP 0 to -10 %, HR 0 to +20, in a minority of patients markedly more. (grade A (three human studies, n=10, 15 and 60) applied by dose-scaling (hence C for the scaled numbers))
- **Verdict: MIS-SPECIFIED** · proposed: MAP -0 to -10 % at morphine 10 mg (keep -8 to -25 % only for >= 0.5 mg/kg); SVR -5 to -15 %, HR 0 to +20 (Rosow 1982 PMID 6172999; Fahmy 1983 PMID 6839633; Flacke 1987 PMID 2440351; Miller 10e ch. 22)
- **Likely not a miss:** yes (-6.7 % sits inside the dose-corrected band)

<a id="row-151"></a>

#### 151. `packages/engine-core/test/engine/drug-layer.test.ts:116` — nitroprusside in HFrEF: SV rises >= 8 % while MAP falls <= 15 %
- **Band / stated source:** SV >= +8 % AND MAP fall no more than 15 % — Cohn & Franciosa 1977 (research/19 CM-06e rig; 7a afterload sensitivity, research/19 C9)
- **Measured:** SV +1.2 %, MAP -12.8 % (hydralazine on the same rig: SV +0.1 %)
- **Source verification:** The stated source is the two-part NEJM review Cohn JN, Franciosa JA. N Engl J Med 1977;297:27-31 (PMID 405585) and 297:254-8 (PMID 327319); neither has an abstract and the full text was not obtained, so its specific numbers are UNVERIFIED. The same group's primary data: Franciosa JA, Pierpont G, Cohn JN. Ann Intern Med 1977;86:388-93, PMID 848799 - 16 patients with left ventricular failure, nitroprusside infusion vs oral hydralazine: hydralazine gave "a slightly greater increase in cardiac index (0.74 versus 0.95 litres/min-m2), with a lesser fall in mean arterial pressure (7.8 versus 13.6 mm Hg, P less than 0.01)" - i.e. nitroprusside raised CI by about 0.95 L/min/m2 and dropped MAP by 13.6 mmHg.
- **Band vs source:** Partly. Direction and the SV floor are far more lenient than the source (CI +0.95 L/min/m2 on a failing-heart baseline of roughly 2 is about +30-45 %, at a near-constant heart rate, so SV rises well past +8 %). The MAP clause is the problem: the source's own mean fall at an effective dose was 13.6 mmHg, i.e. about -15 to -17 % of a failing-heart MAP, so the test's "no more than 15 %" sits at the source's central value and a correctly behaving engine can fail the conjunction for the wrong reason.
- **Better evidence:** Franciosa 1977 (within-patient, 16 patients) is the usable quantitative anchor; Guiha 1974 NEJM 291:587-92 (PMID 4855255) is the companion series (no abstract). (grade A (16 patients, within-patient crossover))
- **Verdict: MIS-SPECIFIED** · proposed: SV >= +15 % at 1 ug/kg/min with MAP allowed to fall 10-20 %, or titrate to a fixed MAP fall and then assert SV; keep SV >= +8 % only if the MAP cap is loosened (Franciosa, Pierpont & Cohn 1977 PMID 848799; Cohn & Franciosa 1977 PMID 405585/327319 (review, unverified))
- **Likely not a miss:** no (SV +1.2 % is a real miss - the failing ventricle's afterload sensitivity, research/19 C9 - and it fails even the lenient floor)

<a id="row-152"></a>

#### 152. `packages/engine-core/test/engine/drug-layer.test.ts:180` — thiopental 4 mg/kg: unconscious within 20-60 s
- **Band / stated source:** LOC 20-60 s — DI-69; "one arm-brain circulation"
- **Measured:** +10 s (Task 5 prototype +10 s)
- **Source verification:** Miller 10e ch. 21 Intravenous Anesthetics (local PDF, printed pages): Table 21.4 p. 527 thiopental 3-4 mg/kg, "Onset (s) 10-30"; p. 526 thiopental "The prompt onset (15-30 seconds) of action and smooth induction are advantages for this drug."; p. 537 ketamine "onset of action within 30 to 60 seconds", maximal effect about 1 min; p. 542-543 etomidate hypnosis "in one arm-brain circulation" after 0.3 mg/kg (no seconds given); p. 516 propofol onset "one arm-brain circulation", peak effect 90-100 s; Table 21.1 is PK only (elimination half-life, clearance, VdSS) and carries NO onset or emergence column. Thiopental's own figure is therefore 10-30 s (Table 21.4) / 15-30 s (text p. 526).
- **Band vs source:** No. The band is slower than the cited textbook at both ends: the 20-s floor excludes the lower half of Miller's 10-30 s range and the 60-s ceiling is twice its upper limit. "One arm-brain circulation" is Miller's phrase for the FASTEST class of onset (it is what propofol and etomidate get), and the only number attached to that class in the chapter is thiopental's 10-30 s.
- **Better evidence:** Miller 10e Table 21.4 p. 527 and text p. 526 are the direct figures for this drug and dose. (grade C (textbook, with a table row and a text sentence agreeing))
- **Verdict: MIS-SPECIFIED** · proposed: 10-35 s (Miller 10e ch. 21 Table 21.4 p. 527; text p. 526)
- **Likely not a miss:** yes (+10 s is the bottom of Miller's own table range)

<a id="row-153"></a>

#### 153. `packages/engine-core/test/engine/drug-layer.test.ts:195` — etomidate 0.3 mg/kg: unconscious within 20-60 s
- **Band / stated source:** LOC 20-60 s — M10 ch. 21 p. 541: one arm-brain circulation
- **Measured:** +16 s (propofol 2 mg/kg measures 54 s on the same rig)
- **Source verification:** Miller 10e ch. 21 Intravenous Anesthetics (local PDF, printed pages): Table 21.4 p. 527 thiopental 3-4 mg/kg, "Onset (s) 10-30"; p. 526 thiopental "The prompt onset (15-30 seconds) of action and smooth induction are advantages for this drug."; p. 537 ketamine "onset of action within 30 to 60 seconds", maximal effect about 1 min; p. 542-543 etomidate hypnosis "in one arm-brain circulation" after 0.3 mg/kg (no seconds given); p. 516 propofol onset "one arm-brain circulation", peak effect 90-100 s; Table 21.1 is PK only (elimination half-life, clearance, VdSS) and carries NO onset or emergence column. The cited etomidate pages give the qualitative phrase only; no seconds appear.
- **Band vs source:** No. The citation supports "fast", not a numeric window; the only quantitative anchor for that class in the same chapter is thiopental's 10-30 s, so a 20-60 s window is not a transcription of the source. 16 s is consistent with one arm-brain circulation.
- **Better evidence:** The real defect this row's comment points at is the ORDER, not etomidate's absolute number: propofol gets the same "one arm-brain circulation" descriptor (p. 516, peak effect 90-100 s) yet measures 54 s on the same rig. (grade C (textbook qualitative + one in-chapter numeric anchor))
- **Verdict: UNSUPPORTED** · proposed: 10-40 s, and add a separate ordering assertion (etomidate and thiopental not slower than propofol) (Miller 10e ch. 21 pp. 542-543, 516, Table 21.4 p. 527)
- **Likely not a miss:** yes (16 s is inside the evidence-based window; the ordering defect is the real finding)

<a id="row-154"></a>

#### 154. `packages/engine-core/test/engine/drug-layer.test.ts:211` — ketamine 1.5 mg/kg loses consciousness no faster than 30 s
- **Band / stated source:** LOC >= 30 s — M10 Table 21.1
- **Measured:** 16 s at 1 s sampling (D20: 20 s at the audit's 5 s sampling)
- **Source verification:** Miller 10e ch. 21 Intravenous Anesthetics (local PDF, printed pages): Table 21.4 p. 527 thiopental 3-4 mg/kg, "Onset (s) 10-30"; p. 526 thiopental "The prompt onset (15-30 seconds) of action and smooth induction are advantages for this drug."; p. 537 ketamine "onset of action within 30 to 60 seconds", maximal effect about 1 min; p. 542-543 etomidate hypnosis "in one arm-brain circulation" after 0.3 mg/kg (no seconds given); p. 516 propofol onset "one arm-brain circulation", peak effect 90-100 s; Table 21.1 is PK only (elimination half-life, clearance, VdSS) and carries NO onset or emergence column. The claim is supported elsewhere in the same chapter even though the stated locator (Table 21.1) is a PK table: ketamine onset 30-60 s, maximal effect about 1 min (p. 537).
- **Band vs source:** Yes on substance, with a wrong locator. Ketamine is the one induction agent Miller explicitly places OUTSIDE the one-arm-brain-circulation class, and 30-60 s is a drug-and-dose-matched textbook figure.
- **Better evidence:** - (textbook figure is specific and uncontested) (grade C (textbook, drug-specific))
- **Verdict: RIGHT** · proposed: keep >= 30 s (optionally 30-60 s); fix the locator to ch. 21 p. 537 (Miller 10e ch. 21 p. 537)
- **Likely not a miss:** no (16 s is a genuine engine miss, and it inverts the teaching order: ketamine should be the slow one)

<a id="row-155"></a>

#### 155. `packages/engine-core/test/engine/drug-layer.test.ts:272` — ephedrine's pressor rise under chronic beta-blockade is 0.3-0.7 x the healthy rise
- **Band / stated source:** MAP-rise ratio (beta-blocked / healthy) 0.3-0.7 — tables §1.5 / §7 17b; DI-04a
- **Measured:** 0.99
- **Source verification:** The stated source is the project's own table: §1.5 betaBlocked row reads "HR 55-65; g_hs x0.4; g_c x0.5; beta-agonist response x0.5" with "ephedrine weaker" in the expectations column, tagged [TXT]/[ENG] with open question Q18; §7 scenario 17b (bleeding patient on a chronic beta-blocker) reads "ephedrine response x0.5". No human study of ephedrine's pressor response under chronic beta-blockade was found on PubMed; the nearest hit, Mores N et al. Eur J Clin Pharmacol 1999;55:251-4, PMID 10424315, used oral pseudoephedrine 60 mg in hypertensives on propranolol or atenolol and found no blood-pressure change in any arm, so it cannot grade the band. UNVERIFIED against the literature.
- **Band vs source:** No. The multiplier the tables state is a BETA-agonist-response factor, and the test applies it to MAP, which under beta1 blockade is carried by the unopposed alpha1 limb (with a non-selective blocker, beta2 vasodilation is blocked too, which raises SVR further). The engine's own sibling row - adrenaline under non-selective blockade, DI-05 at drug-layer.test.ts:~295 - asserts a LARGER pressor response from exactly this mechanism, so the two rows contradict each other.
- **Better evidence:** Mackie K, Lam A. J Clin Monit 1991;7:213-6, PMID 1679842: epinephrine 15 ug IV in 6 volunteers before and after propranolol 0.04 mg/kg - HR "20 +/- 4% (mean +/- SEM) increase ... before beta-blockade but a 38 +/- 3% reduction after", and the injection "will predictably cause significant hypertension followed by marked bradycardia". The pressor limb survives blockade; the chronotropic limb is what halves. (grade B (n=6 human experimental for the analogous agent) / C (mechanism))
- **Verdict: MIS-SPECIFIED** · proposed: keep 0.3-0.7 for the HR and CO rise; MAP-rise ratio 0.8-1.3 under chronic beta1 blockade (Mackie & Lam 1991 PMID 1679842; tables §1.5 (beta-agonist response x0.5, Q18))
- **Likely not a miss:** yes (0.99 is inside the proposed 0.8-1.3 MAP band)

<a id="row-156"></a>

#### 156. `packages/engine-core/test/engine/drug-layer.test.ts:302` — ... with a reflex bradycardia (adrenaline 100 ug under non-selective blockade)
- **Band / stated source:** minimum HR difference vs control < 0 (any bradycardia below the control arm) — M10 ch. 14
- **Measured:** HR never below the control arm (min delta +1)
- **Source verification:** The locator does not resolve: in the local Miller 10e chapter set, ch. 14 is "Gastrointestinal and Hepatic Physiology, Pathophysiology, and Anesthetic Considerations" and contains no adrenergic-pharmacology section - UNVERIFIED as cited. The claim itself is supported experimentally: Mackie K, Lam A. J Clin Monit 1991;7:213-6, PMID 1679842 - epinephrine 15 ug IV in 6 volunteers, HR "20 +/- 4% ... increase ... before beta-blockade but a 38 +/- 3% reduction after beta-blockade. The lowest heart rate recorded was 28 beats/min"; the authors conclude the test dose "will predictably cause significant hypertension followed by marked bradycardia".
- **Band vs source:** Yes for direction, population and mechanism (IV adrenaline bolus under non-selective blockade in adults). Two caveats: the test's dose is 100 ug (about 7 x Mackie's) and the rig is anaesthetised and ventilated, where baroreflex gain is already reduced - both make the bradycardia smaller, not absent. The assertion is only a sign, which is the right shape.
- **Better evidence:** Mackie & Lam 1991 is the direct human experiment; the unopposed-alpha mechanism is textbook consensus. (grade B (n=6 human experimental))
- **Verdict: RIGHT** · proposed: keep min delta HR < 0; fix the locator (Mackie & Lam 1991 PMID 1679842 rather than "M10 ch. 14"); optionally -10 to -40 % at the pressor peak (Mackie & Lam 1991 PMID 1679842)
- **Likely not a miss:** no (real miss: the beta1 residual chronotropy outweighs the vagal limb, t8-vagal delta HR +5.7)

<a id="row-157"></a>

#### 157. `packages/engine-core/test/engine/drug-layer.test.ts:312` — amiodarone 300 mg during CPR raises modelled shock success: ROSC share through two shocks >= 1.2 x the no-drug share
- **Band / stated source:** ROSC-share ratio >= 1.2 over two shocks — ARREST 1999
- **Measured:** x 1.11 (0.072 vs 0.065; amiodarone site occupancy 0.38 at the first shock)
- **Source verification:** Kudenchuk PJ et al. N Engl J Med 1999;341:871-8, PMID 10486418 (abstract): shock-refractory out-of-hospital VF; "Recipients of amiodarone were more likely to survive to be admitted to the hospital (44 percent, vs. 34 percent of the placebo group; P=0.03)", adjusted odds ratio 1.6 (95 % CI 1.1-2.4); "no significant difference ... in ... the number of shocks delivered (4+/-3 and 6+/-5)"; more hypotension (59 vs 48 %) and bradycardia (41 vs 25 %) with amiodarone; the trial "did not have sufficient statistical power to detect differences in survival to hospital discharge".
- **Band vs source:** Partly. The ratio 44/34 = 1.29 is where the 1.2 threshold comes from, but the endpoint is not the same quantity: ARREST measured survival to hospital ADMISSION in patients who had already failed >= 3 shocks, not the per-shock ROSC probability 2 min after the drug - and it found NO difference in the number of shocks needed, which argues against modelling the benefit as per-shock defibrillation success. The threshold also sits at the trial's point estimate while its interval (OR 1.1-2.4) admits ratios below 1.2. The band additionally ignores that the engine has only 0.38 site occupancy at the shock it is scored on.
- **Better evidence:** Later trials (ALIVE 2002, amiodarone vs lidocaine; ROC-ALPS 2016, amiodarone vs lidocaine vs placebo) bear directly on the size of any survival effect; their effect sizes were NOT re-verified in this run, so they are named as context only, not quoted. (grade A (randomised trial, n=504) for ARREST's own endpoint)
- **Verdict: MIS-SPECIFIED** · proposed: express as a directional, occupancy-aware target - ROSC-share ratio 1.05-1.5 measured at >= 0.6 occupancy, or move the assertion to an admission-survival-like composite; do not read a per-shock multiplier off an admission-survival proportion (Kudenchuk 1999 PMID 10486418 (ARREST); ALIVE 2002 and ROC-ALPS 2016 for context (not verified here))
- **Likely not a miss:** partly (x 1.11 lies inside the trial's interval on the ratio scale, so under the corrected band the engine may already be right)

<a id="row-158"></a>

#### 158. `packages/engine-core/test/engine/drug-layer.test.ts:360` — LAST is additive: lidocaine 1.5 mg/kg on top of bupivacaine 100 mg raises the CNS effect by > 0.02
- **Band / stated source:** CNS-effect increment > 0.02 (model units) over the bupivacaine-only arm — DI-23; ASRA 2020
- **Measured:** +0.014
- **Source verification:** Additivity itself: de Jong RH, Bonin JD. Anesthesiology 1981;54:177-81, PMID 7469099 (abstract): local-anaesthetic mixtures given subcutaneously to mice - "None of the mixtures were more convulsant or more lethal than their parent components" and "local anesthetic toxicity is essentially additive" (additivity of CD50/LD50 dose fractions). The stated source, the ASRA 2020 LAST checklist (Neal JM et al., PMID 33148630), is a treatment checklist; no additivity statement was located in it - UNVERIFIED as cited.
- **Band vs source:** No. The source's additivity is in DOSE-equivalents, which is exactly what the engine implements (a Hill function of the summed fractional doses, per the test's own R45 note). Dose-additivity on a steep (n = 3) Hill produces only a small EFFECT increment once the bupivacaine arm alone already sits high on the curve - so the test asks for a number the implemented (and correct) model cannot produce, and the 0.02 threshold itself has no source.
- **Better evidence:** Test additivity where it is observable: at a sub-threshold bupivacaine dose (CNS effect ~0.2-0.5) the lidocaine increment should be large, or equivalently the bupivacaine dose needed for a fixed CNS effect should fall by the lidocaine-equivalent fraction. (grade B (animal dose-additivity, de Jong 1981) for the principle; D for the 0.02 threshold)
- **Verdict: MIS-SPECIFIED** · proposed: assert dose-equivalence additivity at a sub-saturating level (e.g. bupivacaine 60-70 mg + lidocaine 1.5 mg/kg reaches the CNS effect of the dose-equivalent bupivacaine alone, +-0.05), instead of a +0.02 effect increment near saturation (de Jong & Bonin 1981 PMID 7469099; ASRA 2020 LAST checklist PMID 33148630 (treatment only))
- **Likely not a miss:** yes (+0.014 is what dose-additivity predicts at that point on the Hill; the engine implements the sourced mechanism)

<a id="row-159"></a>

#### 159. `packages/engine-core/test/engine/drug-layer.test.ts:368` — second gas: 66 % N2O raises sevoflurane 2 %'s FA/FI at 5 min by >= +0.03
- **Band / stated source:** FA/FI difference at 5 min >= +0.03 (absolute) — DI-19; Epstein 1964, M10 ch. 19
- **Measured:** +0.014 in the engine (+0.021 in the 7g rig, Task 15)
- **Source verification:** Epstein RM et al., "Influence of the concentration effect on the uptake of anesthetic mixtures: the second gas effect", Anesthesiology 1964;25:364-71, PMID 14156577 - title confirmed on PubMed; no abstract and the full text was not obtained, so its magnitude is UNVERIFIED. Modern human quantification: Peyton PJ et al. Anesthesiology 2008;108:381-7, PMID 18292675 (abstract): 14 patients, 70 % N2O vs N2O-free; the end-tidal sevoflurane ratio was "9.8% higher in the nitrous oxide group at 2 min" while the arterial ratio was "23.6% higher in the nitrous oxide group at 2 min, declining to 12.5% at 30 min".
- **Band vs source:** Partly. On a gas-phase FA/FI of roughly 0.5-0.6, Peyton's 9.8 % relative difference is about +0.05 absolute - but that is at 2 min, and the effect decays with time, so at the 5-min sample the expected end-tidal difference is smaller than the +0.03 the test demands at its own time point. The larger second-gas effect (2-3 x) is in the ARTERIAL phase, which the engine's FA/FI does not represent. 66 % vs 70 % N2O is immaterial.
- **Better evidence:** Peyton 2008 (human, paired arterial and end-tidal) supersedes Epstein 1964 for magnitude and makes the phase distinction explicit. (grade A (human, n=14, arterial + end-tidal))
- **Verdict: MIS-SPECIFIED** · proposed: FA/FI +0.04-0.08 at 2 min end-tidal (or >= +0.02 if the 5-min sample is kept), and a separate arterial/effect-site target 2-3 x the gas-phase effect (Peyton 2008 PMID 18292675; Epstein 1964 PMID 14156577 (magnitude unverified))
- **Likely not a miss:** partly (the 7g rig's +0.021 would pass a time-corrected 5-min threshold; the engine's +0.014 is low but within a factor of two of a decayed gas-phase effect)

<a id="row-160"></a>

#### 160. `packages/engine-core/test/engine/drug-layer.test.ts:396` — a magnesium sulfate load 60 mg/kg prolongs rocuronium T1 25 % by 20-90 %
- **Band / stated source:** T1 25 % prolongation +20 to +90 % — DI-90; M10 ch. 24 p. 698
- **Measured:** +11.4 % (+12.0 % before the FU-9 merge; blood Mg peak 2.1 mmol/L and falling; the Mg 2.5 profile arm gives +39.7 %)
- **Source verification:** Czarnetzki C et al. Acta Anaesthesiol Scand 2010;54:299-306, PMID 19919585 (abstract) - the same dose, timing, drug and endpoint as the test: "Eighty patients (18-60 years) were randomly allocated to MgSO(4) 60 mg/kg or placebo (saline) ... given intravenously for 15 min before induction of anaesthesia with propofol, sufentanil and rocuronium 0.6 mg/kg"; "The clinical duration (Dur25%) was on average 44.7 [14] min with MgSO(4) and 33.2 [8.1] min with saline (P<0.0002)" (= +34.6 %); total recovery 73.2 vs 57.8 min (+27 %); onset 77 vs 120 s. Miller 10e ch. 24 is not in the local per-chapter set, so p. 698 is UNVERIFIED here; research/14 DI-90 quotes it as vecuronium ED50 -25 % after 40 mg/kg, consistent in direction.
- **Band vs source:** Partly. The floor is right and the population/dose/endpoint match exactly, but the ceiling is unsupported: the measured mean prolongation is +35 % with an SD of 14 min on 44.7, so +90 % is roughly 2.5 x the central estimate and outside the observed spread.
- **Better evidence:** Czarnetzki 2010 is a dose- and endpoint-matched RCT (n=72 analysed) and should replace the textbook citation as the primary source. (grade A (randomised, n=72 analysed, matched dose and endpoint))
- **Verdict: TOO WIDE** · proposed: +20 to +50 % for T1 25 % after MgSO4 60 mg/kg; keep a higher band for the Mg 2.5 mmol/L profile arm only if a source for a sustained 2.5 mmol/L is produced (Czarnetzki 2010 PMID 19919585; Fuchs-Buder 1995/1999 (vecuronium, direction); Miller 10e ch. 24 p. 698 (unverified))
- **Likely not a miss:** no (+11.4 % is still below the evidence's +27 to +35 %, so this remains a real - if smaller - miss)

<a id="row-161"></a>

#### 161. `packages/engine-core/test/engine/fu7-volatile.test.ts:24` — a 3 -> 12 % desflurane step raises HR 8-35 bpm, the rise lasting 2-4 min
- **Band / stated source:** peak delta HR 8-35 bpm, and delta HR >= 8 bpm sustained for 120-240 s — tables §6.3: "a sympathetic surge on a rapid increase above 1 MAC: HR +20-30 %, MAP +20 % for 2-4 min" [TXT]; DI-70
- **Measured:** delta HR +1.1 bpm (the end-tidal trigger never fires)
- **Source verification:** Weiskopf RB et al. Anesthesiology 1994;81:1350-5, PMID 7992902 (abstract): volunteers, desflurane 4 % -> 8 % step; "Without pretreatment, the increase to 8% desflurane increased heart rate (from 57 +/- 2 to 118 +/- 6 beats/min at peak, mean +/- standard error) and mean arterial blood pressure (from 66 +/- 2 to 118 +/- 5 mmHg)", with peak "within 1-2 min of the increase in desflurane concentration"; fentanyl 1.5 and 4.5 ug/kg "attenuated the heart rate increase by 61 +/- 14% and 70 +/- 7%". Muzi M, Lopatka CW, Ebert TJ. Anesthesiology 1996;84:1035-42, PMID 8623996 (abstract): 23 volunteers; "There was no consistent threshold for the neurocirculatory activation associated with desflurane, and the HR and SNA thresholds generally were less than 1 MAC"; "The HR increase associated with desflurane was not rate- or concentration-dependent".
- **Band vs source:** No. For an unpremedicated step the human data give about +60 bpm (4 -> 8 %), so a 35-bpm ceiling is below the evidence for a larger 3 -> 12 % step, and the tables' "+20-30 %" (about +12-20 bpm from a resting 60) understates it further. With an opioid on board the rise is attenuated by 61-70 %, i.e. +20-25 bpm, which would fit the band - so the band is implicitly an opioid-anaesthetised band applied to an opioid-free rig. The 2-4 min duration is compatible with "peak within 1-2 min" and a transient response. Separately, Muzi 1996 contradicts the ENGINE's design rather than the band: there is no consistent end-tidal threshold and the thresholds that exist are BELOW 1 MAC, so a ">1 MAC trigger" cannot reproduce the phenomenon.
- **Better evidence:** Weiskopf 1994 for magnitude and timing; Muzi 1996 for the absence of a threshold and the rate-independence of the HR response. (grade A (two volunteer studies, n=23-ish each, with microneurography))
- **Verdict: TOO NARROW** · proposed: opioid-free rig: peak delta HR +25-70 bpm, peaking 1-2 min after the step, >= 8 bpm for 1-5 min; with fentanyl >= 1.5 ug/kg: +8-30 bpm. Remove the "above 1 MAC" trigger gate (Muzi 1996). (Weiskopf 1994 PMID 7992902; Muzi, Lopatka & Ebert 1996 PMID 8623996)
- **Likely not a miss:** no (+1.1 bpm misses every version of the band; the trigger design is the defect)

<a id="row-162"></a>

#### 162. `packages/engine-core/test/engine/fu71-induction-synergy.test.ts:46` — the fall after fentanyl 2 ug/kg is 1.7-2.1 x the fall after propofol alone
- **Band / stated source:** delta SBP ratio 1.7-2.1 — Billard 1994: 53/28 = 1.89
- **Measured:** 1.16 at HEMO_SYN_MAX 0.2
- **Source verification:** Billard V et al. Anesthesiology 1994;81:1384-93, PMID 7992907 (abstract): "Twelve groups of 10 patients, ASA physical status 1 or 2, first received fentanyl 0, 2, or 4 micrograms.kg-1 and then 5 min later received propofol 2.0, 2.5, 3.0, or 3.5 mg.kg-1", trachea intubated 4 min after propofol; "The mean decrease in systolic blood pressure after propofol was 28 mmHg when no fentanyl was given, 53 mmHg after 2 microgram.kg-1 of fentanyl (P < 0.05 vs. no fentanyl), and 50 mmHg after 4 micrograms.kg-1".
- **Band vs source:** Partly. The rig copies the design and the ratio is the paper's own (53/28 = 1.89), but the band is a +-10 % window around a ratio of two group means pooled across four propofol doses, with no dispersion reported - and the paper's own 4 ug/kg arm gives 1.79 (50/28). The evidence supports "about 1.6-2.0 with sampling error", not a floor as high as 1.7.
- **Better evidence:** Billard 1994 is the matched study; the direction is also in Miller 10e ch. 22 (opioid sympatholysis, MAP -5 to -15 %). (grade A (n=120, ASA 1-2, matched design))
- **Verdict: TOO NARROW** · proposed: 1.4-2.2 x (and state it as a group-mean ratio, not a per-run one) (Billard 1994 PMID 7992907)
- **Likely not a miss:** no (1.16 is below even a 1.4 floor - the synergy is genuinely too weak; the sibling passing row's >= 1.15 floor sits exactly where the engine already is)

### Section findings

**(a) Bands most likely wrong, ranked**

1. **`drug-layer.test.ts:61`, morphine 10 mg MAP -8 to -25 %.** The band is a 0.3-1 mg/kg figure (Rosow 1982, Fahmy 1983)
   applied to a 0.14 mg/kg bolus, and in Flacke 1987 only 1 of 10 patients at 0.6 mg/kg had any hypotension. Depends on it:
   tables §6.3 (T6.3) morphine row, DI-42 in research/14, HIST_SVR 0.22 (Task 16's size), and the passing sibling row's
   SVR -10-20 % / HR +3-25 bands, which the engine already meets.
2. **`drug-layer.test.ts:272`, ephedrine x0.3-0.7 under beta-blockade.** Applies the tables' beta-agonist-response factor
   to MAP. Depends on it: tables §1.5 betaBlocked row (Q18), §7 scenario 17b, DI-04a, 7g `combine.ts` betaBlunt - and it
   contradicts the engine's own DI-05 row (`:302`), which expects a LARGER pressor response from the same mechanism.
3. **`drug-layer.test.ts:396`, Mg 60 mg/kg +20-90 %.** Czarnetzki 2010 matches the dose, drug, timing and endpoint exactly
   and gives +35 % (clinical duration 44.7 vs 33.2 min). The 90 % ceiling has no support. Depends on it: DI-90, DI-25's
   profile arm (Mg 2.5 mmol/L, +39.7 %), and the 7f/7c magnesium path chosen in Task 14 Step 5.
4. **`drug-layer-guards.test.ts:74`, MH EtCO2 52-70 at 10 min.** Cites the project's own tables §7 check 21; no measured
   EtCO2 time course was found, and Miller describes both fulminant and slow-onset forms. Depends on it: tables §7 check 21,
   DI-65, the MH severity-1 ramp, and the same it.fails in `endo-acceptance.test.ts` for this rig family. (The engine shows
   NO rise at all here, so the engine side needs work regardless of the band.)
5. **`drug-layer.test.ts:312`, amiodarone ROSC share >= 1.2 x.** ARREST's 44 % vs 34 % is survival to hospital admission in
   shock-refractory VF, and the trial found no difference in the number of shocks delivered. Depends on it: DI-13a, the
   shock-state factor (x1.2 at full occupancy, `test/l3/shock-state.test.ts`) and the ALS rig's 2-min drug-to-shock timing.
6. **`drug-layer.test.ts:368`, second gas >= +0.03 at 5 min.** Peyton 2008 puts the gas-phase effect at about 10 % relative
   at 2 min, decaying, with the 2-3 x larger effect in arterial blood. Depends on it: DI-19, the one-way second-gas term in
   7g (Task 15), and the 7g rig's +0.021.
7. **`drug-layer.test.ts:116`, nitroprusside SV >= +8 % with MAP <= -15 %.** The SV floor is very lenient against Franciosa
   1977 (CI +0.95 L/min/m2), but the MAP cap sits at the source's own mean fall of 13.6 mmHg, so the conjunction can fail a
   correct engine. Depends on it: research/19 CM-06e and C9 (7a afterload sensitivity), and the hydralazine twin on the same rig.
8. **`drug-layer-guards.test.ts:165`, verapamil in pre-excited AF.** Gulamhusein 1982's effect is a 10-20 % shortening of the
   shortest pre-excited RR in a subset (4/8), with 2/8 needing cardioversion - not deterministic VF, and not a mean-rate rise
   on a rig already at 232/min. Depends on it: DI-15, the hazard hook's 0.5 AV-node occupancy threshold (Task 11 tests it at
   0.8) and verapamil's avNode emax 0.7.
9. **`drug-apnoea.test.ts:101`, the Bailey pair's per-seed floors.** The "fentanyl alone >= 93 %" clause contradicts Bailey
   (hypoxaemia in half the subjects on fentanyl alone) and the 70 % nadir floor is in no source. Depends on it: DI-03,
   VENT_ALPHA_BENZO 1.5 (the D15 Bailey fit), and the population twin at `:112`.
10. **`fu7-volatile.test.ts:24` and `fu71-induction-synergy.test.ts:46`, two bands that are simply too narrow.** The
    desflurane ceiling (35 bpm) is below Weiskopf's +60 bpm for an opioid-free step, and Muzi 1996 removes the >1 MAC
    threshold the engine's trigger is built on (DI-70, 7g `pipeline.ts` desSurge). Billard's 1.7-2.1 is a +-10 % window
    around a pooled group-mean ratio whose sibling arm gives 1.79 (HEMO_SYN_MAX 0.2, FU-7.1 Q2).

**(b) Known misses that are probably NOT misses** (measured value inside the corrected or evidence band): morphine MAP
-6.7 % (dose-corrected band 0-10 %); ephedrine MAP ratio 0.99 (proposed 0.8-1.3); thiopental LOC +10 s (Miller 10-30 s);
etomidate LOC +16 s (one arm-brain circulation); LAST increment +0.014 (what dose-additivity predicts on that Hill); the
apnoea-flag-clearing row (no effort should return on VCV 12 x 600); amiodarone x1.11 (inside ARREST's interval on the ratio
scale); the second-gas +0.021 on the 7g rig; the Bailey pair's 46 % nadir (reachable on room air per research/28); and the
Ce overshoot guard, whose width is arbitrary even though 3.7 % is worth flagging. Still real misses against bands that
survive: fentanyl 5 ug/kg apnoea (0 s), the Bailey population row (0/20), nitroprusside SV (+1.2 %), ketamine LOC (16 s),
adrenaline's reflex bradycardia (+1), magnesium (+11.4 %), the desflurane surge (+1.1 bpm) and the Billard ratio (1.16).

**(c) Items with no source.** The MH 10-min EtCO2 window (tables §7 check 21, circular); the Ce peak +-0.01 tolerance
(7g gate figure); the apnoea-flag-clearing assertion (state machine, no clinical claim); the 60-s duration floor and the
0.4-x-VE recovery endpoint in the two DI-71 rows (operationalisations, not sourced numbers); the 70 % nadir floor and the
">= 93 % singles" clause in DI-03; ephedrine's x0.3-0.7 (tables [ENG], Q18 still open); the LAST +0.02 threshold; and - most
consequentially for the neuro section's question - the FU-6 induction-apnoea bands (`resp-induction.test.ts`: "Bands [ENG,
D5; Q-FU6-1] ... + fentanyl 2 ug/kg 60-240 s"), which are an engine choice yet currently outrank grade-A synergy evidence.

## Drugs (B): interactions, vasoactives, antiarrhythmics and PK

Fourteen rows: 13 known-miss assertions in the 7g PK/interaction, flow-distribution, antiarrhythmic, AF-rate-control
and PD-acceptance tests, plus one case that PASSES but whose band is plainly wrong (sugammadex 16 mg/kg, marked
"(it, not it.fails)"). Verdicts: 5 MIS-SPECIFIED, 3 RIGHT, 3 UNSUPPORTED, 2 TOO NARROW, 1 TOO WIDE.
The pattern in this section is DOSE AND PROTOCOL MISMATCH: a number measured at one dose, infusion rate, or delivery
protocol is asserted at another. Nitroprusside's 30-50 % SVR fall belongs at 3-8 microg/kg/min, not at 1; amiodarone's
20-30 % rate fall belongs to a 300-450 mg bolus read at 30 min to 4 h, not to 150 mg at 10-13 min; dobutamine's
+20-40 % CO belongs near 10 microg/kg/min, not 5; dexmedetomidine's pressor phase belongs to a 2-min load, not a
10-min one; the desflurane surge is timed from a DIAL step at FGF 4 although every source stepped the end-tidal
concentration itself; and the second-gas band's upper edge (+0.15) is the ARTERIAL magnitude applied to an end-tidal
endpoint. Two bands have no source at all for their size (ephedrine's x0.7 per repeat, the internal histamine index),
and one is a plain mis-citation: DI-07's "tables §6.2: esmolol 0.5 mg/kg HR -10-20 %" reads the table's CONTRACTILITY
column as its HR column, while the table's own HR rule (-10 % per 100 microg/kg/min) predicts about -5 % for that
bolus - which is what the engine measures. Keeping that consistent with the neuro section's TOO NARROW ruling on
stimulus-surge esmolol 1 mg/kg (research/30-target-audit.md row 15), esmolol is scored TOO NARROW here too.
In 7 of the 14 rows the measured engine value already sits inside the corrected or evidence band, and 3 more are
partly inside (ephedrine, second gas +0.021, propofol Ce ratio 1.29). Four go the other way: both sugammadex rows -
the engine's 13.4 % and 20.5 % MEAN HR falls are outside an evidence base that has only rare bradycardia and no mean
effect; nitroprusside, whose row was fitted to a band about twice too strong; and the desflurane surge, which never
fires at all (the one row where the engine is short of a real mechanism). The concentration effect is a declared v1
scope limit against a correct band. Abstracts were read through PubMed E-utilities,
drug labels from DailyMed SPL, and Miller 10e pages from the local PDFs. Epstein 1964 (Anesthesiology 25:364,
PMID 14156577) could not be opened - the "~10 % higher halothane uptake" figure and the species are UNVERIFIED - as
were the Miller ch. 24 pp. 728-731 sugammadex-bradycardia figure and any human magnitude for ephedrine tachyphylaxis.

### Rows

<a id="row-163"></a>

#### 163. `packages/engine-core/test/engine/af-rate-control.test.ts:43` — amiodarone 150 mg over 10 min: AF 130 slows by 20-30 % at its peak (10-13 min)
- **Band / stated source:** ventricular-rate fall 20-30 % at 10-13 min after a 150 mg load over 10 min — test header [ENG]: "the tables give no AF rate-control number (§6 T6.2 gives esmolol's sinus HR fall only); the acute rate-control response the ACLS/AF-guideline drugs are chosen for; calibration pass R44"; tables §6.2 antiarrhythmics paragraph gives amiodarone 150 mg over 10 min HR -10 %, SVR -10-20 %, QTc +20-40 ms [ENG]
- **Measured:** fall 14.0 % (title)
- **Source verification:** Hofmann R et al. Wien Klin Wochenschr 2004;116:744-749, PMID 15628645 (abstract): 450 mg single IV bolus in AF with HR > 135, advanced CHF/pulmonary oedema/cardiogenic shock; "Within 30 minutes after amiodarone administration, ventricular heart rate decreased significantly from 152 +/- 12 to 88 +/- 17 (p < 0.0001) beats min(-1) in patients who converted to sinus rhythm and from 157 +/- 14 to 98 +/- 16 beats min(-1) in patients who did not" (-38 % in the non-converters, at 30 min). Delle Karth G et al. Crit Care Med 2001;29:1149-1153, PMID 11395591 (abstract): 300 mg bolus +/- 45 mg/h, HR > 120; primary endpoint "a >30% rate reduction within 4 hrs" reached in "11/20 (55%), and 15/20 (75%)" of the two amiodarone arms vs 70 % for diltiazem. Clemo HF et al. Am J Cardiol 1998;81:594-598, PMID 9514456 (abstract): "The infusion of amiodarone (242 +/- 137 mg over 1 hour) was associated with a decrease in heart rate by 37 +/- 8 beats/min" from 149 +/- 13 (-25 %) in ICU patients refractory to diltiazem/esmolol/digoxin. Siu CW et al. Crit Care Med 2009;37:2174-2179, PMID 19487941 (abstract): "The median time to VR control was significantly shorter in the diltiazem group (3 hours, 1-21 hours) compared with the digoxin (6 hours, 3-15 hours ...) and amiodarone groups (7 hours, 1-18 hours)".
- **Band vs source:** No. The 20-30 % figure is tagged [ENG] and no source was found for it at this dose and time. The human data that reach 25-40 % use 300-450 mg (Hofmann, Delle Karth) and read out at 30 min to 4 h; a 150 mg load read at 10-13 min is both a third to a half of the dose and an order of magnitude earlier than any trial endpoint. Siu's median time to rate control with amiodarone was 7 h. Population also differs (ICU/CHF AF vs the healthy modelled rig).
- **Better evidence:** Dose- and time-matched expectation: 150 mg over 10 min gives a modest fall at 10-15 min (single digits to ~20 %); 300-450 mg gives 25-40 % by 30 min (Hofmann) and > 30 % within 4 h in 55-75 % (Delle Karth). The tables' own [ENG] amiodarone row says HR -10 %, which contradicts the test's 20-30 %. (grade A (two RCTs n 60 and n 150, one n 78 observational series, abstracts))
- **Verdict: MIS-SPECIFIED** · proposed: 150 mg over 10 min: rate fall 5-20 % at 10-15 min; add a 300-450 mg arm asserting 25-40 % at 30 min if a strong rate-control band is wanted (Hofmann 2004 PMID 15628645; Delle Karth 2001 PMID 11395591; Clemo 1998 PMID 9514456; Siu 2009 PMID 19487941)
- **Likely not a miss:** yes (14.0 % sits inside the dose-matched 5-20 %)

<a id="row-164"></a>

#### 164. `packages/engine-core/test/engine/pk-acceptance-pd.test.ts:61` — dobutamine 5 microg/kg/min: CO +20-40 %
- **Band / stated source:** CO +20-40 % at 20 min of 5 microg/kg/min on a healthy ventilated rig — tables §6.2 dobutamine row: "2-20 µg/kg/min | +5-15 (label) | Emax +80 %, EC50 7 | ×0.85 at 10 µg/kg/min ... Dobu-label (SBP +10-20, HR +5-15) | [P]/[ENG]" - the CO band itself is not in the tables (the label numbers are SBP and HR); FU-7 Task 17 Step 1a used CM-06d (HFrEF) band 20-45
- **Measured:** +13.6 % on the FU-7 tree (+11.8 % with the FU-2 beta venous term; +4.2 % before it)
- **Source verification:** Pellikka PA et al. Am J Cardiol 1995;76:881-886, PMID 7484825 (abstract), 47 patients without wall-motion abnormality: "Stroke volume increased 27 +/- 18% from baseline, with significant increases occurring at both the 5 and 10 micrograms/kg/min doses (p < 0.00001)" - the 27 % is the peak-dose figure, with HR rising "significantly at each stage". Ahonen J et al. Clin Drug Investig 2008;28:121-127, PMID 18211120 (abstract), 23 healthy volunteers at 2.5/5/10 microg/kg/min for 60 min each: "There was a clear linear relationship between dobutamine plasma concentrations and CO"; "SV increased significantly at the dobutamine plasma concentrations produced by the lowest infusion rate but remained mostly stable or even decreased thereafter"; "In most subjects, HR remained stable at dobutamine plasma concentrations produced by the lowest infusion rate". Klein LJ et al. Neth Heart J 2010;18:183-189, PMID 20428416 (abstract), 10 healthy volunteers at 10 microg/kg/min: "cardiac output increased from 5.7+/-1.3 l/min to 9.0+/-2.1 l/min (p<0.001)" (+58 %). Blomstrand P et al. Clin Cardiol 1995;18:659-663, PMID 8590536 (abstract), 11 healthy women, mean peak 22 +/- 7.5 microg/kg/min: "Cardiac output increased by 93%, heart rate by 68%, and stroke volume by 15%".
- **Band vs source:** Partly. The human data are awake, unventilated, and mostly at 10-40 microg/kg/min; at 5 microg/kg/min the measured quantity that rises is stroke volume (Pellikka, Ahonen), with HR largely flat, so the CO rise at that rate is the SV rise - of the order of 10-25 %, not 20-40 %. +58 % at 10 (Klein) and +93 % at ~22 (Blomstrand) show the slope, which puts 20-40 % nearer 8-10 microg/kg/min. No source states a CO band at 5 microg/kg/min, and none of them is a ventilated anaesthetised patient, where venous return limits the response.
- **Better evidence:** Rate-matched expectation at 5 microg/kg/min: CO +10-30 % awake, less under anaesthesia; +40-60 % belongs at 10 microg/kg/min (Klein). The existing engine gap is also partly mechanical (FU-2's venous term; research/19 C9 afterload sensitivity), not only a band error. (grade A (n 47 and n 23 human studies plus two small volunteer series, abstracts))
- **Verdict: TOO NARROW** · proposed: 5 microg/kg/min: CO +10-30 % (healthy awake), +8-25 % ventilated; keep +20-40 % only if re-specified at 10 microg/kg/min (Pellikka 1995 PMID 7484825; Ahonen 2008 PMID 18211120; Klein 2010 PMID 20428416; Blomstrand 1995 PMID 8590536)
- **Likely not a miss:** yes (+13.6 % is inside the rate-matched band; the beta-blocked half-response case beside it still holds)

<a id="row-165"></a>

#### 165. `packages/engine-core/test/engine/pk-acceptance-pd.test.ts:123` — ephedrine 10 mg x3 at 10 min: third dose adds <= 0.6 x the SVR increment of the first (tachyphylaxis 0.7^2), first increment > 0.05
- **Band / stated source:** third/first direct SVR increment <= 0.6, with a precondition that the first increment > 0.05 — tables §6.2 ephedrine row: "tachyphylaxis: each repeat ×0.7 [ENG]" (0.7^2 = 0.49); Eph-label "(direct + indirect)", "[P] mechanism; [ENG] numbers", Q59
- **Measured:** direct SVR increments 0.040 / 0.010 / 0.005 (third/first 0.13); the indirect twin on bus.cns.sympDrive passes
- **Source verification:** Ephedrine Sulfate Injection, US label (DailyMed SPL setid 9851cc1c-f267-4e18-b1ad-923fe9cded84, RemedyRepack), Warnings 5.2: "Data indicate that repeated administration of ephedrine can result in tachyphylaxis"; "Clinicians treating anesthesia-induced hypotension with ephedrine sulfate injection should be aware of the possibility of tachyphylaxis and should be prepared with an alternative pressor"; Mechanism of Action: "directly acts as an agonist at alpha- and beta-adrenergic receptors and indirectly causes the release of norepinephrine from sympathetic neurons". Liles JT et al. J Pharmacol Exp Ther 2006;316:95-105, PMID 16002460 (abstract, rat): "Tachyphylaxis developed to pressor responses to ephedrine and amphetamine with sequential injections; however, ephedrine tachyphylaxis differed in that subsequent responses to alpha-receptor agonists were attenuated" - and the pressor response itself was "not attenuated by blockade of the norepinephrine reuptake transporter ... or by catecholamine depletion". No human study quantifying the second/third-dose ratio of 10 mg boluses was found (searched PubMed; UNVERIFIED for the 0.7 factor).
- **Band vs source:** Partly. The DIRECTION (repeat doses give less) is label-supported; the SIZE (x0.7 per repeat, 0.49 by the third) has no source, and the band is ONE-SIDED (<= 0.6), so it also accepts a far steeper decay. Note Liles argues the rat pressor effect is direct, not noradrenaline-release-mediated, which weakens the usual mechanistic story behind the 0.7 and means the engine's split of ephedrine into a small direct alpha arm plus an indirect sympDrive arm (FU-7 Task 9) is itself a modelling choice, not a sourced one.
- **Better evidence:** None quantitative in humans. Make the band two-sided so it tests the stated 0.7^2 instead of merely 'less than before': the engine's 0.13 is three times steeper than the 0.49 the tables specify and passes today. (grade C (label consensus for direction) / D (no human magnitude; rat data dispute the mechanism))
- **Verdict: UNSUPPORTED** · proposed: third/first 0.35-0.65 (two-sided, from the tables' own x0.7 per repeat) and drop the > 0.05 precondition on the direct arm, which only measures the FU-7 Task 9 re-routing of the pressor to sympDrive (Ephedrine label (DailyMed, Warnings 5.2); Liles 2006 PMID 16002460; tables §6.2 [ENG])
- **Likely not a miss:** partly (the ratio claim passes on both arms; the failure is the precondition, a test-design artefact - but 0.13 vs the specified 0.49 is a hidden over-decay the one-sided band cannot see)

<a id="row-166"></a>

#### 166. `packages/engine-core/test/l2/pk/antiarrhythmic.test.ts:50` — a sub-therapeutic lidocaine level (0.3 microg/mL) never converts VT in 200 seeded runs of its 20 min window
- **Band / stated source:** conversion share EXACTLY 0 over 200 x 1200 s at lidocaine 0.3 microg/mL — hazard constants fitted so that 1 - e^(-lambda_lido x 1200) = 0.20 "Gorgels 1996: lidocaine ~ 20 % at 20 min"; the row's own comment: occupancy u = c/(c + 3 microg/mL) = 0.09 at 0.3
- **Measured:** 3/200 = 1.5 % (u 0.09 x lambda_lido)
- **Source verification:** Gorgels AP et al. Am J Cardiol 1996;78:43-46, PMID 8712116 (abstract): "lidocaine was administered at an intravenous dose of 1.5 mg/kg in 2 minutes"; "Termination occurred in 3 of 14 patients after lidocaine and in 12 of 15 patients after procainamide (p <0.01)"; over repeated trials "Lidocaine terminated 6 of 31 VTs and procainamide 38 of 48" - i.e. the ~20 % fitted figure is for a FULL 1.5 mg/kg dose. Miller's Anesthesia 10e ch. 10, p. 202 (local PDF p. 261): "lidocaine doses should be adjusted to achieve serum levels less than the seizure threshold (>5 to 10 µg/mL) in awake humans. After a 2-mg/kg bolus, peak serum concentrations of 6.6 to 8.5 µg/mL" - so 0.3 microg/mL is roughly 1/20 of a therapeutic bolus peak. No source states that conversion probability at a sub-therapeutic level is zero rather than small.
- **Band vs source:** No, as written. The band asserts an ABSOLUTE zero, which a continuous occupancy-scaled hazard cannot produce and which no source supports: spontaneous termination of sustained monomorphic VT within 20 min is itself non-zero, so 1.5 % is clinically indistinguishable from background. The underlying lambda fit (20 % at 20 min for a full dose) is correctly sourced to Gorgels.
- **Better evidence:** Either a small ceiling or an explicit sub-therapeutic threshold. Gorgels' own figure for a full dose is 6/31-3/14 (19-21 %), so 1/20 of the concentration giving ~1-2 % is internally consistent with the model the band is testing. (grade B (one small randomised human study, n 29 patients / 55 trials; textbook for the concentration scale))
- **Verdict: MIS-SPECIFIED** · proposed: conversion share <= 0.05 at 0.3 microg/mL (not exactly 0); or, if a hard floor is wanted, threshold the hazard below ~1 microg/mL and say so in the row (Gorgels 1996 PMID 8712116; Miller 10e ch. 10 p. 202)
- **Likely not a miss:** yes (1.5 % is inside any evidence-based ceiling)

<a id="row-167"></a>

#### 167. `packages/engine-core/test/l2/pk/flow-distribution.test.ts:49` — S6b: 30 % haemorrhage (CO 3.1 vs 5.25) -> propofol 2 mg/kg peak Ce >= 1.3x healthy
- **Band / stated source:** peak effect-site concentration ratio >= 1.3 at CO 3.1 vs 5.25 L/min (q 0.6), no ceiling asserted — file header: Kazama T et al. Anesthesiology 2002;97:1156-1161 [P]; Johnson KB et al. Anesthesiology 2003;99:409-420 [P]; V1 share 0.5 is [ENG] and the header states the papers' numbers were NOT extracted (no web access in the FU-4 session)
- **Measured:** 1.29 in this unit rig (q 0.6, V1 share 0.5); docs/gates/fu-4.md records 1.83 and fu-8b 2.05 on later trees; DI-66 ceRatio 1.75 in band 1.3-2.2
- **Source verification:** Kazama T et al. Anesthesiology 2002;97:1156-1161, PMID 12411801 (abstract), swine, 2 mg/kg/h steady infusion with stepwise bleeding: "At individual peak systemic vascular resistance, when cardiac output and mean arterial pressure decreased by 31% and 14%, respectively, plasma propofol concentration increased by 19% of its prehemorrhagic value. At maximum heart rate, when cardiac output and mean arterial pressure decreased by 46% and 28%, respectively, plasma propofol concentration increased by 38%. In uncompensated shock, it increased to 3.75 times its prehemorrhagic value." Johnson KB et al. Anesthesiology 2003;99:409-420, PMID 12883414 (abstract), swine, 30 mL/kg isobaric haemorrhage, propofol 200 microg/kg/min for 10 min: "The raw data demonstrated higher plasma propofol levels in the shock group. The pharmacokinetic analysis revealed slower intercompartmental clearances in the shock group. Hemorrhagic shock shifted the concentration effect relationship to the left, demonstrating a 2.7-fold decrease in the effect site concentration required to achieve 50% of the maximal effect". Upton RN et al. Anesth Analg 1999;89:545-552, PMID 10475279 (abstract), sheep, 100 mg over 2 min: "the first-pass pulmonary and systemic arterial concentrations of a drug will be inversely related to the cardiac output"; "Cardiac output was lowered by 2.2 L/min, and the area under the curve to 10 min of the arterial concentrations increased to 143% of control."
- **Band vs source:** Yes in direction and roughly in size, with two caveats. (1) Population is porcine/ovine, not human (no human bolus study was found). (2) The endpoint differs: Kazama's +19 %/+38 % are pseudo-steady-state PLASMA concentrations during an infusion, while the test measures the PEAK Ce of a bolus, which indicator-dilution theory makes more CO-sensitive (Upton: inverse to CO; +43 % AUC for a 2.2 L/min fall). The matched comparison here is CO -41 % with the bleed, between Kazama's -31 % (+19 %) and -46 % (+38 %) steps, and a first-pass peak should exceed those - 5.25/3.1 = 1.69 is the pure indicator-dilution limit. So >= 1.3 is a sound and rather conservative floor.
- **Better evidence:** A ceiling can now be sourced, which the header said it could not: 1.3-1.8 for a bolus peak at CO 3.1 vs 5.25 (Kazama's +38 % at CO -46 %, Upton's inverse-CO first pass, capped by 1.69). Note also that the PD shifts left 2.7-fold (Johnson), so the clinical teaching point is bigger than the PK ratio. (grade B (consistent animal experiments; the human claim rests on indicator-dilution theory))
- **Verdict: RIGHT** · proposed: keep >= 1.3 and add a ceiling <= 2.0 (Kazama's uncompensated 3.75x belongs to a separate collapse case) (Kazama 2002 PMID 12411801; Johnson 2003 PMID 12883414; Upton 1999 PMID 10475279)
- **Likely not a miss:** partly (1.29 is a hair under a correct floor; later trees measure 1.83, inside the proposed 1.3-2.0, so on main this is no longer a miss)

<a id="row-168"></a>

#### 168. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:27 (it, not it.fails)` — sugammadex (DI-45): 16 mg/kg gives a 15-30 % HR fall (MHRA/EMA; M10 ch. 24)
- **Band / stated source:** HR multiplier falls 15-30 % within 10 min of 16 mg/kg (row pd: hr emax -0.25, ec50 12) — FU-7 plan Task 12 Step 6: "marked bradycardia is a recognised sugammadex reaction (MHRA/EMA; M10 ch. 24 pp. 728-731). Modelled as a dose-related vagal fall at the high (16 mg/kg) end [ENG: no incidence-vs-dose source exists]"; research/14 DI-45
- **Measured:** 20.5 % (title of the sibling it.fails); test passes
- **Source verification:** BRIDION (sugammadex) US label, DailyMed SPL setid 5171d883-fe8f-482c-97ab-40b00975b64a (Merck), Warnings 5.2: "Cases of marked bradycardia, some of which have resulted in cardiac arrest, have been observed within minutes after the administration of BRIDION"; adverse-reaction table incidence "Bradycardia 9 (1) 21 (1) 5 (5) 6 (1)" - i.e. ~1 % of patients, not a mean effect. Kim HB et al. Br J Anaesth 2025;135:1007-1014, PMID 40480915 (abstract, n 359,414): "the risk of a >=20% decrease in HR was not significantly different between the sugammadex and neostigmine groups (9.8% vs 10.2%; odds ratio ... 1.00 [0.97-1.03])"; "Restricted cubic spline curves suggested a linear increase in the risk of a >=20% decrease in HR as the dose of sugammadex increased"; "The incidence of bradycardia after sugammadex administration was low". Fassoulaki A et al. J Clin Monit Comput 2017;31:297-302, PMID 26894591 (abstract, RCT 2 vs 4 vs 16 mg/kg, n 60): "the secondary endpoints, namely RE, BIS, SAP and DAP, HR and SpO2 did not differ between the three groups"; "Sugammadex alone at low, medium or high clinical doses has no effect on anesthetic depth ... or on hemodynamics." Sims T et al. J Anaesthesiol Clin Pharmacol 2020;36:465-469, PMID 33840924 (abstract, prospective n 200): bradycardia "observed in 13 cases (7%...)", "No clinically significant blood pressure changes were noted"; "not associated with significant hemodynamic changes". Miller 10e ch. 24 pp. 728-731 not located as a numeric source: UNVERIFIED for the 15-30 % figure.
- **Band vs source:** No. Every source describes bradycardia as an UNCOMMON, idiosyncratic, vagally mediated event (~1-10 % of patients, dose-related only in risk), while the band makes a 15-30 % HR fall the DETERMINISTIC mean response to 16 mg/kg. A head-to-head RCT at exactly 2/4/16 mg/kg found no HR difference at all. The engine's 20.5 % is therefore an everyday effect where the evidence has a rare one.
- **Better evidence:** Model it as a low-probability event (a hazard or an instructor-dispatched reaction) of marked bradycardia, with the mean HR response near zero at every clinical dose. If a deterministic teaching path is wanted, keep it behind a switch and label it as the rare reaction. The correct dose-related statement is a rising RISK, not a rising mean fall (Kim 2025). (grade A (n 359,414 observational, plus an RCT at the exact doses and a prospective n 200 series))
- **Verdict: UNSUPPORTED** · proposed: mean HR fall 0-5 % at 2/4/16 mg/kg; a separate low-probability marked-bradycardia event (HR fall >= 20 %, order 1-10 % of administrations, risk rising with dose) (BRIDION label 5.2 + adverse-reaction table; Kim 2025 PMID 40480915; Fassoulaki 2017 PMID 26894591; Sims 2020 PMID 33840924)
- **Likely not a miss:** no (this test PASSES, so it is a hidden miss: 20.5 % is outside the evidence, and it is also the band that forces the 4 mg/kg row below to fail)

<a id="row-169"></a>

#### 169. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:35` — sugammadex (DI-45): 4 mg/kg gives < 5 % HR fall
- **Band / stated source:** HR fall < 5 % within 10 min of 4 mg/kg — FU-7 plan Task 12 Step 6 (same [ENG] row as :27); the test's own R45 comment: "with the plan's Hill of 1 on a linear PK no EC50 gives both bands - 4 mg/kg < 5 % needs c4 < 0.25*EC50 and 16 mg/kg >= 15 % needs c4 >= 0.375*EC50"
- **Measured:** 13.4 %
- **Source verification:** Same sources as :27 (BRIDION label; Kim 2025 PMID 40480915; Fassoulaki 2017 PMID 26894591 - the RCT included a 4 mg/kg arm and found no HR difference; Sims 2020 PMID 33840924; de Kam PJ et al. Int J Clin Pharmacol Ther 2012;50:595-604, PMID 22735462, the thorough-QT study at 4 and 32 mg/kg: "Single therapeutic (4 mg/kg) and supra-therapeutic (32 mg/kg) intravenous doses of sugammadex are not associated with clinically important QTc prolongation").
- **Band vs source:** Yes - this half of the pair is the one the evidence supports: at 4 mg/kg the mean HR change is nil (Fassoulaki RCT), so < 5 % is correct and arguably generous. The band is only unreachable because its sibling at :27 demands a large mean fall at 16 mg/kg from the same linear PK + Hill-1 row, which is the real defect (the test comment says so).
- **Better evidence:** Fix the pair by lowering the 16 mg/kg band (row :27) rather than widening this one: with a near-zero mean effect at every dose both cases become satisfiable, and the rare bradycardia moves to an event path. (grade A (as :27))
- **Verdict: RIGHT** · proposed: keep < 5 % (and re-specify :27 so one row can satisfy both) (Fassoulaki 2017 PMID 26894591; Kim 2025 PMID 40480915; BRIDION label 5.2)
- **Likely not a miss:** no (13.4 % is outside the evidence; this is a genuine miss against a correct band, caused by the :27 band above)

<a id="row-170"></a>

#### 170. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:90` — second gas: 66 % N2O raises sevoflurane 2 %'s FA/FI at 5 min by +0.03 to +0.15, and N2O's own FA/FI is unchanged
- **Band / stated source:** delta FA/FI (absolute) +0.03 to +0.15 at 5 min, FGF 6; N2O's own FA/FI unchanged within 1e-9 — "Epstein 1964; M10 ch. 19" in the title; FU-7 plan Task 15 Step 3: "Epstein 1964 measured ~ 10 % higher halothane uptake; M10 ch. 19 calls the effect 'small but real'"
- **Measured:** +0.021 (0.713 -> 0.733), N2O unchanged; the engine twin drug-layer.test.ts:368 measures +0.014 (Drugs A row)
- **Source verification:** Miller's Anesthesia 10e, ch. 18 (NOT ch. 19), pp. 404-405 (local PDF pp. 499-500): "The second gas effect is also evident in this example: the rapid uptake of N2O and reduced gas volume increases alveolar Piso and PO2, thereby augmenting uptake of these 'second' gases."; "These effects have been demonstrated in humans and lab animals."; "Clinical studies and mathematical modeling indicate that, because of ventilation-perfusion heterogeneity, the second gas effect is greater in arterial blood than in expired gas, influenced by the blood solubility of VAs, and significantly affects anesthetic onset at relatively low rates of N2O uptake." Fig. 18.8 is the 66 % N2O / 33 % O2 / 1 % isoflurane worked example (iso 1.0 -> 1.5 % alveolar after 50 % N2O uptake). Peyton PJ et al. Anesthesiology 2008;108:381-387, PMID 18292675 (abstract, 14 patients, 70 % N2O vs none): the difference "was significantly greater (P < 0.05) for [arterial] (23.6% higher in the nitrous oxide group at 2 min, declining to 12.5% at 30 min) than for [end-tidal] (9.8% higher in the nitrous oxide group at 2 min)". Taheri S, Eger EI. Anesth Analg 1999;89:774-780, PMID 10475324 (abstract, 6 patients per group): "The F(A)/F(I) for desflurane also increased more rapidly when desflurane was given with 65% rather than 5% N2O, confirming the existence of the second gas effect." Goldman LJ. Anesth Analg 2003;96:400-406, PMID 12538185 (abstract, 18 children, sevoflurane 6 %): "The FA/FI for the small N(2)O was 0.87 +/- 0.09 ... and increased to 0.92 +/- 0.08 for the large N(2)O (P < 0.01)" for N2O itself, while for sevoflurane "The mean only differed significantly at 3 min" - "a brief second gas effect". Epstein RM, Rackow H, Salanitre E, Wolf GL. Anesthesiology 1964;25:364 (cited by Miller as ref 26, the "lab animals" citation; the paper itself, PMID 14156577, was not opened): UNVERIFIED for the "~10 % higher uptake" figure and for the species.
- **Band vs source:** Partly, and the attribution is wrong twice over. (1) The chapter is Miller 10e ch. 18, not ch. 19. (2) Miller cites Epstein as the ANIMAL demonstration; the human end-tidal magnitudes come from Peyton, Taheri and Goldman. (3) Units/endpoint: the human end-expired effect is ~10 % RELATIVE at 2 min and falls with time, which at the engine's base FA/FI 0.71 is about +0.05 absolute at 2 min and less at 5 min; the band's upper edge +0.15 (+21 % relative) is the ARTERIAL magnitude (Peyton 23.6 % at 2 min), which an end-tidal FA/FI assertion cannot reach. The lower edge +0.03 (+4 % relative at 5 min) is a fair end-tidal target.
- **Better evidence:** End-tidal, 5 min, 66 % N2O with sevoflurane: +0.02 to +0.07 absolute (Peyton's 9.8 % at 2 min declining; Goldman's sevoflurane difference significant only at 3 min). If the arterial effect is what is wanted, assert it on an arterial endpoint at 2 min and allow 2-3x (Peyton). (grade A (three human studies, including a 14-patient arterial/end-tidal comparison))
- **Verdict: TOO WIDE** · proposed: end-tidal delta FA/FI +0.02 to +0.07 at 5 min (keep the one-way N2O invariance assertion); cite Peyton 2008 / Taheri 1999 / Goldman 2003 and move Epstein 1964 to the mechanism note; fix 'ch. 19' to ch. 18 (Miller 10e ch. 18 pp. 404-405 + Fig. 18.8; Peyton 2008 PMID 18292675; Taheri 1999 PMID 10475324; Goldman 2003 PMID 12538185)
- **Likely not a miss:** partly (+0.021 just reaches the corrected floor; the engine twin at +0.014 does not, so the engine-level case stays a small real miss)

<a id="row-171"></a>

#### 171. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:100` — concentration effect: 66 % N2O reaches a higher FA/FI at 5 min than 30 % N2O
- **Band / stated source:** FA/FI(66 %) > FA/FI(30 %) at 5 min (sign only, 1e-6 margin) — FU-7 plan Task 15 Step 1 comment: "No concentration or second-gas effect (v1 simplification, decision 9)" -> "N2O's own concentration effect is not modelled (its FA/FI is unchanged)"; declared v1 scope limit
- **Measured:** 0.810 for both (not modelled in v1)
- **Source verification:** Taheri S, Eger EI. Anesth Analg 1999;89:774-780, PMID 10475324 (abstract): "Confirming the existence of the concentration effect, the end-tidal (F(A)) concentration of N2O increased toward the inspired (F(I)) concentration more rapidly (i.e., F(A)/F(I) increased more rapidly) when the inspired concentration was 65% than when it was 5%"; also "administration of Xe with 65% N2O produced an F(A)/F(I) for Xe that exceeded 1.0". Goldman LJ. Anesth Analg 2003;96:400-406, PMID 12538185 (abstract, large vs small inspired N2O in children): "The FA/FI for the small N(2)O was 0.87 +/- 0.09 (mean +/- SD) and increased to 0.92 +/- 0.08 for the large N(2)O (P < 0.01). Both groups differed significantly at 3, 4, and 5 min"; "A concentration effect was confirmed with N(2)O". Miller 10e pp. 404-405: "With 50% uptake of N2O, the reduction in alveolar gas volume results in a concentration of remaining alveolar N2O that is only 24% less than its initial value" - "the alveolar partial pressure of N2O falls much less than the fractional uptake (the concentration effect)".
- **Band vs source:** Yes. A direction-only band, and the direction is exactly what two human studies measured at the same 3-5 min window (Goldman's 0.87 vs 0.92 at a comparable sevoflurane induction). The magnitude the sources support, ~+0.05 of FA/FI, could be asserted rather than only the sign.
- **Better evidence:** Add the size: 66 % vs 30 % should differ by roughly +0.03 to +0.08 in FA/FI at 3-5 min (Goldman 0.05 for large vs small; Taheri's 65 % vs 5 % is a larger contrast). (grade A (two human studies, one with per-minute significance))
- **Verdict: RIGHT** · proposed: keep the sign and add FA/FI(66 %) - FA/FI(30 %) = +0.02 to +0.08 at 5 min when the term is implemented (Taheri 1999 PMID 10475324; Goldman 2003 PMID 12538185; Miller 10e pp. 404-405)
- **Likely not a miss:** no (a declared v1 scope limit measured as an exact tie; the band itself is right)

<a id="row-172"></a>

#### 172. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:118` — a desflurane dial step 3 -> 12 % at FGF 4 fires the surge within 60 s (the END-TIDAL trigger; DI-70)
- **Band / stated source:** surge fires <= 60 s after the DIAL step at FGF 4 L/min; trigger = end-tidal MAC > 1 with a 60 s rise > 0.3; tables §6.3 surge size HR +20-30 %, MAP +20 % for 2-4 min; FU-7 plan Step 3 case 3 wanted HR +8-35 bpm — tables §6.3 desflurane row [TXT]/[TXT]: "plus a sympathetic surge on a rapid increase above 1 MAC: HR +20-30 %, MAP +20 % for 2-4 min"; FU-7 plan Task 15 Step 2 cites "Weiskopf 1994: a rapid increase in desflurane concentration, not a brain level, releases catecholamines"; research/14 DI-70
- **Measured:** never within 5 min (end-tidal MAC 1.03 at +3 min; the 60 s rise is ~0.16, below the trigger's 0.3)
- **Source verification:** Weiskopf RB et al. Anesthesiology 1994;80:1035-1045, PMID 8017643 (abstract, 12 volunteers, 0.55 -> 1.66 MAC): "The rapid increase to 1.66 MAC increased mean arterial blood pressure, heart rate, and plasma epinephrine and norepinephrine concentrations, and plasma renin activity with both desflurane and isoflurane, the former usually producing a response of greater magnitude"; "Increased mean arterial blood pressure returned to control in 4 min." Weiskopf RB et al. Anesthesiology 1994;81:843-849, PMID 7943835 (abstract, 9 volunteers, 4 -> 8 % over 1 min): "The initial increase in concentration increased heart rate (HR) from 57 +/- 2 to a peak of 119 +/- 7 beats/min (P < 0.05); mean arterial blood pressure (MAP) from 66 +/- 3 to 119 +/- 5 mmHg (P < 0.05); and plasma epinephrine by > 10-fold"; "The second and third increases in desflurane concentration increased HR and MAP by less than 20% of the initial increases"; "Addition of nitrous oxide did not change results except for a smaller increase in MAP". Ebert TJ, Muzi M. Anesthesiology 1993;79:444-453, PMID 8363068 (abstract, 14 volunteers): "The transition from 1.0 to 1.5 MAC desflurane resulted in significant heart rate increases (> 30 beats/min), hypertension (> 30 mmHg), and a doubling of SNA that persisted for several minutes." Weiskopf RB et al. Anesthesiology 1995;83:1173-1178, PMID 8533909 (abstract, 4 volunteers, one-lung step 4 -> 8 %): airway-only exposure raised HR "17 +/- 5 beats/min" and MAP "15 +/- 5 mmHg", both lungs plus blood "heart rate 40 +/- 7 beats/min ... mean arterial blood pressure 40 +/- 3"; "at least two sites respond ... one site in the airways and/or lungs, and at least one other in a highly perfused tissue(s). The systemic site contributes more importantly."
- **Band vs source:** Partly, and three things are mis-specified. (1) LATENCY vs DELIVERY: in every study the INSPIRED/end-tidal concentration was itself raised within about a minute (non-rebreathing or high flows); at FGF 4 L/min the circuit washes in over minutes, so a dial step is not an end-tidal step and a fixed 60 s deadline after the DIAL change does not follow from Weiskopf. (2) The trigger's 0.3-MAC-per-60-s slope is [ENG] and unsourced; the sourced stimulus is a rise of end-tidal concentration above ~6 % / 1 MAC. (3) SIZE: the tables' HR +20-30 % / MAP +20 % is far below the first-exposure human response (HR 57 -> 119, MAP 66 -> 119; Ebert > 30 bpm and > 30 mmHg), while the repeat response is < 20 % of the first (Weiskopf 1994b) - the engine has no such adaptation, and the test's companion band of 8-35 bpm straddles the airway-only magnitude (17 bpm) rather than the whole response (40-43 bpm).
- **Better evidence:** Assert on the END-TIDAL trajectory, not the dial, and use a delivery that can produce it (high FGF or a step in inspired fraction): surge within 60 s of end-tidal desflurane crossing ~1 MAC while rising; first-exposure magnitude HR +25-60 bpm and MAP +20-50 mmHg for 2-4 min; subsequent steps within ~90 min <= 20 % of that. (grade A (four human volunteer studies, including a within-subject lung-isolation design))
- **Verdict: MIS-SPECIFIED** · proposed: fire within 60 s of END-TIDAL MAC crossing 1 on a rising trajectory (keep a sevoflurane negative control); magnitude HR +25-60 bpm / MAP +20-50 mmHg over 2-4 min on first exposure, <= 20 % on repeats; at FGF 4 state the expected delay instead of a 60 s deadline (Weiskopf 1994 PMID 8017643; Weiskopf 1994 PMID 7943835; Ebert & Muzi 1993 PMID 8363068; Weiskopf 1995 PMID 8533909)
- **Likely not a miss:** no (the surge never fires at all - a real mechanism gap; but the 60 s deadline at FGF 4 and the 8-35 bpm size are themselves wrong, so fixing the engine to this band would teach the wrong magnitude)

<a id="row-173"></a>

#### 173. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:149` — morphine 10 mg publishes bus.airway.histamine >= 0.4 at its peak
- **Band / stated source:** >= 0.4 on the engine's internal 0-1 histamine scale (the same floor as atracurium 0.5 mg/kg; mivacurium 0.2 mg/kg >= 0.5, cisatracurium 0) — row as shipped: morphine { target: 'histamine', emax: 0.6, ec50: 1 reference dose }; FU-7 plan Task 16 Step 1 ("Morphine already has ... emax 0.6, ec50 1"); research/14 DI-42 cites "tables §6.3 / Miller ch. 22: fast morphine 10 mg lowers SVR 10-20 % through histamine release". The 0-1 scale itself has no stated source.
- **Measured:** 0.32
- **Source verification:** Rosow CE et al. Anesthesiology 1982;56:93-96, PMID 6172999 (abstract, 15 cardiac-surgery patients): morphine "1 mg . kg-1, iv at 100 micrograms . kg-1 . min-1" gave "an average 750 per cent peak increase in plasma histamine accompanied by a significant decrease in mean arterial pressure (-27 mmHg) and systemic vascular resistance (-520 dyne . s . cm-5)"; "The greatest decrease in systemic vascular resistance occurred in those patients with the highest levels of plasma histamine (r = -0.81)"; fentanyl 50 microg/kg gave "no change in plasma histamine". Doenicke A et al. Clin Pharmacol Ther 1995;58:81-89, PMID 7543038 (abstract, volunteers): at "0.15 mg/kg morphine" - the dose closest to 10 mg in a 70 kg adult - "Thirteen of 15 subjects receiving morphine ... had elevations in plasma histamine levels and symptoms of histamine release within 5 minutes", "Six subjects in the morphine group ... exhibited levels of plasma histamine > 2.0 ng/ml, but these levels were not associated with hemodynamic changes". Scott RP et al. Br J Anaesth 1985;57:550-553, PMID 2408644 (abstract): atracurium 0.6 mg/kg as a 5 s bolus "resulted in a significant increase in plasma histamine concentration (P less than 0.05) and was associated with a decrease in mean arterial pressure and an increase in heart rate", abolished when the same dose was given over 75 s.
- **Band vs source:** No - and it cannot, because the quantity is an engine-internal index with no units and no calibration point. Judged on the RANK ORDER it encodes, the band is also wrong: it requires 10 mg of morphine (0.14 mg/kg) to reach the same floor as a rapid atracurium 0.5 mg/kg bolus, whereas the human data put 0.15 mg/kg morphine at a histamine rise WITHOUT haemodynamic change (Doenicke) and a rapid atracurium bolus at a rise WITH hypotension and tachycardia (Scott). The 10-20 % SVR fall that DI-42 asks of 10 mg morphine comes from Rosow's 1 mg/kg - a seven-fold larger dose.
- **Better evidence:** Anchor the scale once (e.g. index 1.0 = the plasma histamine that produces a clear SVR fall, as in Rosow's 1 mg/kg morphine or a rapid atracurium bolus), then let each drug's dose-response follow: 10 mg morphine lands low on it, not at the atracurium floor. Add the speed-of-injection dependence (Scott: the same atracurium dose over 75 s releases none) if the simulator is to teach the mitigation. (grade B (two small human studies for morphine, one for atracurium) / UNSUPPORTED for the index itself)
- **Verdict: UNSUPPORTED** · proposed: drop the >= 0.4 floor for 10 mg morphine; assert the rank order instead (rapid atracurium 0.5-0.6 mg/kg > morphine 0.14 mg/kg > 0, cisatracurium = 0) plus one calibrated anchor at morphine 1 mg/kg giving the SVR fall Rosow measured (Rosow 1982 PMID 6172999; Doenicke 1995 PMID 7543038; Scott 1985 PMID 2408644)
- **Likely not a miss:** yes (0.32 is in the right place relative to the atracurium anchor; the band, not the engine, sets the floor too high)

<a id="row-174"></a>

#### 174. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:168` — dexmedetomidine, the alpha2B arm: a fast load raises SVR early (5-10 min) and the rise then decays (DI-60; T6.3)
- **Band / stated source:** max SVR multiplier over 300-600 s > 1 after 1 microg/kg over 10 min, then falling; tables §6.3 size "SVR +15 % during a fast load" — tables §6.3 dexmedetomidine row [TXT]/[TXT]: "biphasic: SVR +15 % during a fast load, then -10-20 %"; research/14 DI-60 ("not modelled in v1"); plan Task 17 Step 4 case 1
- **Measured:** SVR x 0.994 at most in the 5-10 min window (x 0.963 at 15 min, the sibling it)
- **Source verification:** Bloor BC et al. Anesthesiology 1992;77:1134-1142, PMID 1361311 (abstract, 37 healthy male volunteers, 2-MINUTE infusions of 0.25/0.5/1.0/2.0 microg/kg): "The two largest doses produced a transient (peak at 3 min lasting < 11 min) increased in MABP (16 +/- 2.5 and 24 +/- 10 mmHg, respectively; P < .05) with a concomitantly reduced CO (41%, 2 micrograms/kg; P < .05) and HR (22%, 2 micrograms/kg; P < .05), whereas systemic vascular resistance doubled"; the later phase was "a maximum decrease in MABP at 60 min of 14%, 16%, 23%, and 27%". Ebert TJ et al. Anesthesiology 2000;93:382-394, PMID 10910487 (abstract, 10 volunteers, 40-min target infusions): "The first two doses ... lowered mean arterial pressure by 13%"; "Subsequent higher doses increased sedation, all pressures, and calculated vascular resistance"; "A biphasic (low, then high) dose-response relation for mean arterial pressure, pulmonary arterial pressure, and vascular resistances ... were observed." PRECEDEX (dexmedetomidine) US label, DailyMed SPL setid 4419162d-81d4-49bd-96de-1729440bdb74, Warnings 5.3: "Transient hypertension has been observed primarily during the loading dose in association with the initial peripheral vasoconstrictive effects of PRECEDEX"; "Treatment of the transient hypertension has generally not been necessary, although reduction of the loading infusion rate may be desirable." Talke P, Anderson BJ. Br J Clin Pharmacol 2018;84:1364-1372, PMID 29495085 (abstract): "dexmedetomidine-induced vasoconstriction is concentration dependent over time" (15-min TCI to 0.3 ng/mL, sympathetic fibres blocked).
- **Band vs source:** Partly. The pressor phase is real and label-recognised, but it is CONCENTRATION-RATE dependent: Bloor's transient rise needed 1-2 microg/kg over TWO minutes (peak at 3 min, gone by 11 min), and the label ties it to the loading-dose rate and says reducing that rate abates it. Spread over 10 min the same 1 microg/kg gives a much lower peak concentration, so a measurable net SVR rise is not what the sources predict for this protocol - the sympatholytic arm is already working by then. The tables' "+15 % during a fast load" is itself unsourced as a number (Bloor's 1 microg/kg over 2 min roughly doubled SVR at 2 microg/kg and raised MAP 16 mmHg at 1 microg/kg).
- **Better evidence:** Test the alpha2B arm on a protocol that produces it: 1 microg/kg over 2 min (Bloor) -> SVR rise peaking at ~3 min and resolved by ~11 min, MAP +10-25 mmHg at 1-2 microg/kg with HR and CO falling at the same time. For a 10-min load, expect little or no net rise and say so. (grade A (randomised placebo-controlled volunteer study n 37, plus a 10-subject dose-escalation study and the label))
- **Verdict: MIS-SPECIFIED** · proposed: assert the early pressor on a 2-min 1-2 microg/kg load (SVR rise peaking at ~3 min, gone by ~11 min; MAP +10-25 mmHg with HR/CO falling); for the 10-min load assert only the late fall (which the sibling it already passes) (Bloor 1992 PMID 1361311; Ebert 2000 PMID 10910487; PRECEDEX label 5.3; Talke 2018 PMID 29495085)
- **Likely not a miss:** yes (x 0.994 on a 10-min load is what the rate-dependence predicts; the gap is the protocol in the band, and DI-60's own early item is the same mis-specification)

<a id="row-175"></a>

#### 175. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:197` — nitroprusside 1 microg/kg/min lowers SVR 30-50 %
- **Band / stated source:** steady SVR reduction 30-50 % at 1 microg/kg/min (offset <= 25 % of it within 2 min, asserted separately and passing) — FU-7 plan Task 17 Step 4 case 2; the new D13 row is tagged [ENG] ("the new row's steady state at 1 microg/kg/min is EXACTLY the band's lower edge (svr emax -0.6 x 1/2 at ec50 1)"); tables have no nitroprusside dose-response row (only H2's "Nitroprusside/NTG (SVR -25 %)" scenario line)
- **Measured:** -29.9999 % at 10 min (the steady state is the band edge)
- **Source verification:** NIPRIDE RTU (sodium nitroprusside) US label, DailyMed SPL setid 5acf0836-93ff-4064-b888-3f560e8a558d (Exela), Dosage 2.2: start "0.3 mcg/kg/min, and titrate every few minutes until the desired effect is achieved OR the maximum recommended infusion rate of 10 mcg/kg/min has been reached"; "A patient's ability to buffer cyanide will be exceeded in less than one hour at the maximum dose rate (10 mcg/kg/min)". Abdulatif M. Anaesth Intensive Care 1994;22:155-160, PMID 8210018 (abstract, 24 ASA I patients, MAP titrated to 60-65 mmHg): "The mean SNP dose requirements were 7.25 +/- 1.6 and 2.1 +/- 1.4 micrograms. kg-1.min-1 in the halothane and propofol groups, respectively (P < 0.0001)" - i.e. the rate needed for a roughly 25-30 % MAP fall is 2-7 microg/kg/min, not 1. Miller's Anesthesia 10e ch. 75 (Pediatric and Neonatal Critical Care), p. 2419 (local PDF p. 2895): "Sodium nitroprusside relaxes arteriolar and venous smooth muscle, which decreases afterload and preload. The half-life of sodium nitroprusside is only minutes"; Table 75.1 on p. 2418 (local PDF p. 2894) lists nitroprusside as "Arterial > venous" at 0.5-10 mcg/kg/min (a paediatric table). No source states a 30-50 % SVR fall at 1 microg/kg/min.
- **Band vs source:** No. 1 microg/kg/min is a low-to-starting rate (label start 0.3, usual effective 0.5-3, max 10), and the titration data say 2-7 microg/kg/min is needed for a 25-30 % pressure fall under anaesthesia. Making 1 microg/kg/min a 30-50 % SVR fall compresses the whole clinical titration range into its bottom tenth and leaves nothing for 3-10 microg/kg/min; it also means the teaching simulator will show profound hypotension at a rate a trainee would regard as a test dose.
- **Better evidence:** Dose-matched: SVR -10-20 % at 1 microg/kg/min, -25-40 % at 3 microg/kg/min, -40-60 % at 8-10 microg/kg/min, with volatile/propofol background changing the requirement 3-fold (Abdulatif). The fast offset (<= 2 min) is correct and label-supported. (grade B (one small human titration study plus label and textbook consensus; no dose-response curve in humans was located))
- **Verdict: MIS-SPECIFIED** · proposed: 1 microg/kg/min: SVR -10-20 %; re-specify the 30-50 % band at 3-8 microg/kg/min and keep the offset assertion unchanged (NIPRIDE RTU label 2.2; Abdulatif 1994 PMID 8210018; Miller 10e ch. 75 pp. 2418-2419 (Table 75.1))
- **Likely not a miss:** no - the opposite: -30.0 % at 1 microg/kg/min means the engine ROW is about 2x too strong once the band is corrected, and it was fitted to this band

<a id="row-176"></a>

#### 176. `packages/engine-core/test/l2/pk/interactions-misc.test.ts:203` — esmolol 0.5 mg/kg: its direct HR multiplier falls 10-20 % at the peak (DI-07's band; T6.2)
- **Band / stated source:** peak fall of fx.hr 10-20 % within 5 min of a 0.5 mg/kg bolus, no stimulus — research/14 DI-07 quotes "[tables §6.2: esmolol 0.5 mg/kg HR -10-20 %]"; FU-7 plan Task 17 Step 4 case 3
- **Measured:** 6.5 % (4.2 % at ec50 250)
- **Source verification:** MIS-CITATION, checked in the file: tables §6.2's esmolol row reads "| Esmolol | load 0.5 mg/kg over 1 min (peri-op 1 mg/kg over 30 s); 50-300 µg/kg/min | -10 % per 100 µg/kg/min, Emax -35 % | -10-20 % | ~ | ~ | ~ | t½ 9 min ... | Esmolol-label | [P] |" (docs/physiology/stage-7-parameter-tables.md:711). The columns are Drug | dose | HR | CONTRACTILITY | SVR | venous | PVR: the "-10-20 %" that DI-07 quotes as the HR band is the CONTRACTILITY entry; the table's HR rule is "-10 % per 100 µg/kg/min, Emax -35 %". BREVIBLOC (esmolol) US label, DailyMed SPL setid 220a07b8-5c68-41a3-8705-fd91f14c50b4 (Baxter), Dosage 2.1: "Optional loading dose: 500 mcg per kg infused over one minute - Then 50 mcg per kg per minute for the next 4 minutes"; Pharmacodynamics 12.2: "Clinical pharmacology studies in normal volunteers have confirmed the beta blocking activity ... showing reduction in heart rate at rest and during exercise"; "Dosages greater than 200 mcg per kg per minute provide little added heart rate lowering effect"; "About 60-70% of the patients treated with BREVIBLOC injection developed either a 20% reduction in heart rate, a decrease in heart rate to less than 100 bpm, or, rarely, conversion to normal sinus rhythm" (that cohort is SVT/AF, not resting sinus). Schaffer J et al. Anaesthesist 1994;43:723-729, PMID 7840400 (abstract, 63 hypertensive patients at emergence): esmolol 100 mg (~1.4 mg/kg) vs placebo gave HR "(I: 88.2 +/- 3.8; II: 75.6 +/- 2.6; III: 72 +/- 3.1 min-1)" - about -14 to -18 % against placebo DURING a sympathetic stimulus.
- **Band vs source:** No, on two counts. (1) The stated source does not say what DI-07 says it says (contractility column read as the HR column). (2) By the table's OWN HR rule, a 0.5 mg/kg bolus is the label's load for a 50 microg/kg/min infusion, i.e. about -5 % - which is what the engine measures (6.5 %). The 10-20 % figures in the literature are falls during laryngoscopy/emergence tachycardia (Schaffer) or rate control in SVT/AF (label), not the resting HR fall of a single small bolus.
- **Better evidence:** Unstimulated resting HR fall after 0.5 mg/kg: about -4 to -12 %; after 1 mg/kg about -8 to -18 %; the larger 20 %+ falls belong to stimulus-blunting and AF rate-control cases. This is the same direction as the neuro section's ruling on the stimulus-surge esmolol 1 mg/kg bounds (research/30-target-audit.md row 15, TOO NARROW), so the two stay consistent. (grade B (label pharmacodynamics plus one n 63 clinical study; the table's own rule is [P]-tagged label arithmetic))
- **Verdict: TOO NARROW** · proposed: 0.5 mg/kg, no stimulus: direct HR fall 4-12 % (and fix DI-07's citation: tables §6.2's -10-20 % is the contractility entry, the HR rule is -10 % per 100 microg/kg/min, Emax -35 %) (tables §6.2 esmolol row (stage-7-parameter-tables.md:711); BREVIBLOC label 2.1 and 12.2; Schaffer 1994 PMID 7840400; research/30-target-audit.md row 15)
- **Likely not a miss:** yes (6.5 % sits inside 4-12 %; DI-07's TW grade rests on the mis-read band)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **interactions-misc:197, nitroprusside 1 microg/kg/min SVR -30-50 % [ENG].** The label starts the drug at
   0.3 microg/kg/min and titrates to 10; Abdulatif 1994 needed 2.1-7.25 microg/kg/min for a 25-30 % pressure fall. The
   band compresses the whole titration range into its bottom tenth, and the new D13 row's `svr emax -0.6` was fitted to
   exactly this band (its steady state IS the -30 % edge), so the engine is now about twice too strong at a starting
   rate. Dependents: the nitroprusside HFrEF acceptance arm (FU-7 Task 17 Step 4a, Cohn 1977 SV >= 8 %), CM-06e, the
   H2 mitral-regurgitation scenario line (tables §7 H2 "Nitroprusside/NTG (SVR -25 %)"), and the offset case beside it.
2. **interactions-misc:27 + :35, the sugammadex pair (15-30 % at 16 mg/kg; < 5 % at 4 mg/kg).** The 16 mg/kg band makes
   a rare vagal event the mean response: Fassoulaki's RCT at exactly 2/4/16 mg/kg found no HR difference, the BJA 2025
   cohort (n 359,414) found a >= 20 % fall in 9.8 % of administrations (same as neostigmine), and the label calls marked
   bradycardia an uncommon reaction. Because both bands sit on one linear PK row, the 16 mg/kg band is what forces the
   4 mg/kg row (correct) to fail at 13.4 %. Dependents: research/14 DI-45 (graded MI on the missing mechanism),
   tables §5d sugammadex rows, FU-7 Task 12 Step 6's `pd: [{ target: 'hr', emax: -0.25, ec50: 12 }]`.
3. **interactions-misc:203 + research/14 DI-07, esmolol 0.5 mg/kg HR -10-20 %.** A mis-citation: tables §6.2's
   "-10-20 %" is the contractility entry, not the HR entry, and the table's HR rule gives about -5 % for a 0.5 mg/kg
   load (the label's load for 50 microg/kg/min). DI-07's TOO WEAK grade therefore rests on a band that does not exist.
   Dependents: DI-07, DI-M4, CM-04d (esmolol 1 mg/kg in severe CAD), CM-14c, CM-15b, the esmolol EC50 (150 vs 250)
   calibration item, and the neuro section's stimulus-surge esmolol row 15 (already ruled TOO NARROW).
4. **af-rate-control:43, amiodarone 150 mg -> AF 130 slows 20-30 % at 10-13 min [ENG].** Dose- and time-mismatched
   against Hofmann (450 mg, -38 % at 30 min), Delle Karth (300 mg, > 30 % within 4 h in 55-75 %) and Siu (median 7 h to
   control); the tables' own amiodarone line says HR -10 %. Dependents: Q-FU2-9 (amiodarone AV-node strength, FU-3
   item 5), the amiodarone row's AV-nodal Emax 0.3 which a calibration pass would otherwise be told to raise, DI-13a.
5. **interactions-misc:118, desflurane surge within 60 s of a DIAL step at FGF 4 (+ the 8-35 bpm size).** The trigger
   is sourced to Weiskopf, but all four human studies stepped the delivered/end-tidal concentration within ~1 min at
   high flow, and the first-exposure magnitude is HR 57 -> 119 and MAP 66 -> 119 (Weiskopf 1994b) with < 20 % on
   repeats. The engine never fires at all, so this is both a mechanism gap and a mis-specified band; fixing the engine
   to the current numbers would teach a surge 2-4x too small and with no adaptation. Dependents: DI-70, tables §6.3
   desflurane row (HR +20-30 %, MAP +20 %, 2-4 min), the 0.3-MAC-per-60-s trigger constant [ENG].
6. **pk-acceptance-pd:61, dobutamine 5 microg/kg/min CO +20-40 %.** At 5 microg/kg/min the human data show an SV rise
   with a flat HR (Pellikka, Ahonen); +58 % appears at 10 (Klein) and +93 % at ~22 (Blomstrand). The floor of 20 % is
   the top of what the rate gives awake, let alone ventilated. Dependents: CM-06d (HFrEF, band 20-45, used as the
   guard that blocked the EC50 re-fit), the dobutamine EC50 7 / Emax +80 % entries, FU-2's beta venous term (fitted
   while chasing this band), research/19 C9.
7. **interactions-misc:90, second gas +0.03 to +0.15 absolute FA/FI at 5 min.** Upper edge is the arterial magnitude
   (Peyton: 23.6 % arterial vs 9.8 % end-expired at 2 min) applied to an end-tidal endpoint, and the citation is to
   Epstein 1964 (Miller's ANIMAL reference) and to "ch. 19" instead of ch. 18. Dependents: DI-19, the engine twin
   drug-layer.test.ts:368 (Drugs A), the `uptakeLpm` scale, and the emergence-time guard in FU-7 Task 15 Step 4.
8. **interactions-misc:168, dexmedetomidine early SVR rise on a 10-min load.** The pressor phase is rate-dependent
   (Bloor: 2-min infusion, peak at 3 min, gone by 11; the label ties it to the loading rate and says slowing the load
   abates it). Asserting it for a 10-min load asks for an effect the sources do not predict. Dependents: DI-60's early
   item (open to Ali), tables §6.3's unsourced "+15 % during a fast load", the alpha2B entry (+0.18 at 0.35).
9. **antiarrhythmic:50, sub-therapeutic lidocaine "never converts" (exactly 0 of 200).** An absolute-zero band on a
   continuous occupancy-scaled hazard; 1.5 % over 20 min is inside the noise of spontaneous VT termination, and the
   lambda fit itself (Gorgels, ~20 % for a full 1.5 mg/kg dose) is correctly sourced. Dependents: L_LIDO_VT, the
   occupancy EC50 of 3 microg/mL, the seeded-share tolerance of +/- 0.07 used in the sibling cases.
10. **interactions-misc:149 (histamine index) and pk-acceptance-pd:123 (ephedrine x0.7).** Both are size claims with
    no source: the 0-1 histamine scale has no anchor, and the ephedrine band is one-sided so a 0.13 third/first ratio
    passes a test written for 0.49. Dependents: DI-42 (which asks 10 mg morphine for Rosow's 1 mg/kg SVR fall), the
    atracurium/mivacurium floors in the passing sibling, tables §6.2 ephedrine row, FU-7 Task 9's sympDrive routing.

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
amiodarone AF fall 14.0 %; dobutamine CO +13.6 %; ephedrine third/first 0.13 (the failing precondition is a
test-design artefact of FU-7 Task 9); lidocaine conversion 1.5 %; morphine histamine 0.32; dexmedetomidine SVR
x 0.994 on a 10-min load; esmolol 6.5 %; the concentration-effect tie (a declared v1 scope limit against a correct
band); and, partly, propofol peak-Ce ratio 1.29 (later trees measure 1.83, inside the proposed 1.3-2.0) and second gas
+0.021 (just at the corrected floor; the engine twin's +0.014 is still short). Still real misses: sugammadex 4 mg/kg
13.4 % against a correct < 5 % band, and the desflurane surge, which never fires. Hidden miss: sugammadex 16 mg/kg,
which PASSES at 20.5 % while the evidence has no mean HR fall at all.

**(c) Items with no source**
- `interactions-misc:149` morphine histamine >= 0.4 — the engine's `bus.airway.histamine` is a unitless 0-1 index with
  no calibration point; the row's `emax 0.6, ec50 1 reference dose` is [ENG] and the plan explicitly declined to resize it.
- `pk-acceptance-pd:123` ephedrine tachyphylaxis — tables §6.2 says "each repeat x0.7 [ENG]"; the label states only
  that tachyphylaxis occurs. No human magnitude found (PubMed searched; rat data only, and they dispute the mechanism).
- `af-rate-control:43` amiodarone AF 20-30 % — the test header itself says the tables give no AF rate-control number.
- `interactions-misc:197` nitroprusside 30-50 % at 1 microg/kg/min — [ENG] (D13 row); no dose-response source exists in
  the repo and none was found in the literature at that rate.
- `interactions-misc:118` the surge trigger's "0.3 MAC rise in 60 s" threshold and the 8-35 bpm size — both [ENG].
- `interactions-misc:27` sugammadex 15-30 % at 16 mg/kg — the plan says in writing "[ENG: no incidence-vs-dose source
  exists]"; the Miller ch. 24 pp. 728-731 locator could not be confirmed as a numeric source.
- No calibration-queue row in `docs/validation/calibration-queue.md` belongs to this section (its only open row, t25,
  is the neuro section's).

## Devices, monitoring and waveform morphology

Thirty-three rows: 14 test assertions (13 known misses in the monitor-fidelity, CVP/PEEP, LVAD, VCV and child
tests, plus one e2e expected-failure marker) and 19 calibration-queue morphology rows (V1, V1-lit, V2, V2-kind,
V3-shape, V3-delay, V5-PR). Verdicts: 13 RIGHT, 9 MIS-SPECIFIED, 8 TOO NARROW, 3 UNSUPPORTED, 0 TOO WIDE. The pattern
splits in two. The device/monitor test bands are mostly zero-tolerance or one-reference [ENG] numbers that real
monitors and patients do not meet. Examples: "never a valid SpO2 at MAP < 30", where Severinghaus 1990 has oximeters
still reading down to radial systolic ~25 ± 12; an EtCO2 floor of 10 in the first breaths of CPR, where Falk's mean
is ≈ 7.6; a 20 s oximeter lag that is shorter than the brief's own device chain; HeartMate 3 PI 3–5, where Abbott's
range is 1–10; ± 5 mL on delivered VT; and NIBP references taken from the instructor's target or from a truth
beat-mean that counts non-ejecting AF beats. In 9 of the 14 test rows the measured value is inside the corrected
band (3 more partly). The morphology queue goes the other way. The VitalDB R→radial-foot and R→notch medians are
physiologically coherent: the R→notch HR slope is −2.25 ms/bpm against Weissler's QS2 slope of −2.0 to −2.1, and
the values sit at or just above the awake textbook figures, as anaesthesia predicts. So the ± 20 ms per-bin bands
are fair fit targets, and the engine (R→foot ~100 ms, R→notch ~270 ms, both without an HR trend) is genuinely
wrong. Only V1-lit's 150 ms floor is too high: it rejects the MGH recording itself (145). V3-shape applies the
brief's AMPLITUDE-correlation criterion to a SHAPE metric. V5-PR · vitaldb is an artefact of labelling the engine
capture as source 'vitaldb'. The VitalDB PPG delay (442 ms) is physiologically impossible, which confirms the
queue's latency note; the 20–100 ms band is supported by radial–digital PWV. Abstracts were read through PubMed
E-utilities; Miller 10e ch. 32 pages from the local PDF; Abbott's HM3 parameter sheet via pdftotext. Not verified:
the B9 manual's HR-response end point (PDF download failed), the IEC 60601-2-27 clause text, GE/Dräger primary VT
specifications (a reseller sheet was used), the Philips NON-PULSATILE amplitude rule, and the VitalDB ECG–ART
acquisition alignment.

### Rows

<a id="row-177"></a>

#### 177. `apps/demo/e2e/stage9-tasks.e2e.ts:74` — test.fail while glossary entry 148 (ΔP, driving pressure) has no engine key (R-S9-3)
- **Band / stated source:** Expected-failure marker: task 5 must find a ΔP row in Explore physiology once entry 148 has keys — Request R-S9-3 (Stage 7k publishes ΔP) — not a physiological band
- **Measured:** measured: not in title. On the snapshot glossary-data.ts:167 entry 148 has keys ["resp.mechanics.dp"], so the test.fail condition is false and task 5 runs as an ordinary assertion
- **Source verification:** Not a literature target; checked apps/demo/src/app/glossary-data.ts:167 ("n: 148 ... keys: [\"resp.mechanics.dp\"] ... normal: \"< 15 (≤ 13 target)\"").
- **Band vs source:** Yes: a feature-presence gate, no physiology. The marker has already switched itself off on main.
- **Better evidence:** - (grade C (n/a: feature gate))
- **Verdict: RIGHT** · proposed: keep; remove the test.fail line now that entry 148 carries its key (glossary-data.ts:167)
- **Likely not a miss:** uncertain (not a physiological miss; the marker is inactive on main, so the row should be dropped from KNOWN_MISSES)

<a id="row-178"></a>

#### 178. `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts:62` — 8a soak patient (MANUAL CVP 6, PEEP 5) stays under the philips-like 10 mmHg limit: max < 9.5, no CVP_M_HIGH in 120 s
- **Band / stated source:** max displayed CVP mean < 9.5 mmHg (limit 10 minus ≈ 0.6 ripple [ENG]) and 0 CVP_M_HIGH — Philips IntelliVue factory CVP limits 0-10 (Configuration Guide rel. H.0 p. 59); brief §4.9 / tables Q28 "30-50 % of the mean-airway-pressure change"
- **Measured:** max 10.17 (T_IT 0.65 transmits 65 % of alveolar pressure)
- **Source verification:** Yang ZL et al. Zhongguo Wei Zhong Bing Ji Jiu Yi Xue 2012;24:283-285, PMID 22587923 (abstract, n 30 ventilated TBI, PEEP 0-15): "CVP [cm H2O]=7.774+0.368xPEEP [cm H2O]; CVP was elevated about 0.368 cm H2O when PEEP increased 1 cm H2O"; Miller 10e ch. 32 p. 1028: "measurement of these pressures at end-expiration eliminates this confounding factor. Bedside monitors are designed with algorithms that aim to identify and report the numeric values for end-expiratory pressures but are often inaccurate". Philips p. 59 limit taken from the test comment (not re-opened).
- **Band vs source:** Yes. A PEEP-to-CVP transmission of ~0.37 (Yang) sits inside the brief's 30-50 %. PEEP 5 cmH2O then adds ≈ 1.4 mmHg, so CVP 6 should display ≈ 7.4 mean with a sub-mmHg ripple, well under 9.5. The engine's 0.65 is above every source.
- **Better evidence:** Transmission falls further with stiff lungs and rises with a stiff chest wall/abdomen; 0.3-0.5 is the usual teaching range. (grade B (one prospective n 30 study + textbook))
- **Verdict: RIGHT** · proposed: keep (< 9.5 and no raise); equivalently assert the PEEP 5 -> 15 step at 2.2-3.7 mmHg (the it.fails at :50) (Yang 2012 PMID 22587923; brief §4.9; Miller 10e ch. 32 p. 1028)
- **Likely not a miss:** no (real miss: MANUAL_CVP T_IT 0.65 vs evidence ~0.37; fix is the deferred MANUAL_CVP_PAW_FRACTION 0.4)

<a id="row-179"></a>

#### 179. `packages/engine-core/test/engine/fidelity-alarms.test.ts:33` — CVP limit chatter: CVP_M_HIGH raised ≤ 2 times in the 11-min MANUAL rhythm tour
- **Band / stated source:** ≤ 2 CVP_M_HIGH raises over a tour of sinus 30, brady 35, junctional 40, AF 140, VT 180, sinus 75, CHB 32, VVI 70, sinus tachy 187 — audit chatter criterion (research/10 M14) [ENG]; D9 one-unit hysteresis; Orchestrator ruling 5
- **Measured:** 4 (philips-like) and 4 (mindray-like)
- **Source verification:** Miller 10e ch. 32 p. 1022: AV dissociation "alters the normal sequence of atrial contraction ... atrial contraction now occurs during ventricular systole when the tricuspid valve is closed, thereby inscribing a tall cannon a wave in the CVP waveform"; ventricular pacing likewise ("Systolic cannon waves are evident in the CVP trace during ventricular pacing"). No source for "≤ 2 raises" found.
- **Band vs source:** No. A count of raises cannot tell chatter from real alarms. The tour contains three rhythms with AV dissociation (junctional escape, VT 180, complete heart block 32) plus VVI pacing, all of which raise the mean CVP through cannon a waves (Miller). A raise during those segments is correct monitor behaviour. Chatter is a short raise/clear cycle, and the passing guard at :10 already tests that (≥ 5 s cycles). The real root is the baseline CVP of 9-11 under PPV (row 2), not the alarm layer.
- **Better evidence:** - (grade C (textbook mechanism))
- **Verdict: MIS-SPECIFIED** · proposed: Split: (a) no CVP_M_HIGH raise/clear cycle < 5 s (chatter, already tested); (b) no CVP_M_HIGH in the sinus/AF/sinus-tachy segments once baseline CVP is corrected; (c) a raise is ALLOWED (or expected) during VT, CHB, junctional and VVI segments (Miller 10e ch. 32 p. 1022; Yang 2012 PMID 22587923 (baseline))
- **Likely not a miss:** partly (some of the 4 raises are likely physiological cannon-wave alarms; the rest follow from the T_IT 0.65 baseline)

<a id="row-180"></a>

#### 180. `packages/engine-core/test/engine/fidelity-arrest.test.ts:44` — PEA (sinus 90 pulseless), philips-like: flat-line S/D spread ≤ 5 after the fresh beats
- **Band / stated source:** ABP S − D ≤ 5 mmHg on every valid row from 70 s — review ruling 3 (FU-5) [ENG]; research/05 [S2] p. 57 (non-pulsatile INOP)
- **Measured:** 6 mmHg (27/21) at 6 samples (83-128 s)
- **Source verification:** Paradis NA et al. Chest 1992;101:123-128, PMID 1729058 (abstract): of 94 EMD patients "39 were found to have pseudo-EMD"; "The mean pulse pressure in patients with pseudo-EMD was 6.3 +/- 3.5 mm Hg"; mean aortic pressure 18 +/- 11 (true EMD) vs 28 +/- 11 (pseudo-EMD). Philips NON-PULSATILE amplitude criterion: not found in research/05 or research/10 (UNVERIFIED).
- **Band vs source:** Partly. For TRUE PEA (no mechanical activity) ≤ 5 is a fair flat-line ceiling. But the engine's PEA keeps atrial/ventricular contraction ripple at the risen rate, which is pseudo-PEA physiology. In Paradis's 94 clinical EMD patients, 41 % had a pulse pressure of 6.3 ± 3.5 mmHg. So 6 mmHg is the textbook pseudo-PEA value, and the band does not say which PEA it models.
- **Better evidence:** Pseudo-PEA is common (39/94) and responds better to adrenaline (Paradis). (grade A (n 94 human aortic pressure))
- **Verdict: MIS-SPECIFIED** · proposed: State the PEA kind. True PEA: spread ≤ 5 with no HR-synchronous component. Pseudo-PEA: PP 3-10 mmHg at the electrical rate, MAP 15-40, and NON-PULSATILE need not show (Paradis 1992 PMID 1729058)
- **Likely not a miss:** yes for pseudo-PEA (6 = Paradis mean); no if the scenario means true PEA

<a id="row-181"></a>

#### 181. `packages/engine-core/test/engine/fidelity-arrest.test.ts:81` — VF -> CPR (it.fails.each philips/mindray/saadat-like): CPR-window EtCO2 floor 10 mmHg (170-295 s)
- **Band / stated source:** min EtCO2 ≥ 10 mmHg over every sample 170-295 s (compressions from 150 s) — research/10 §13 [ENG] (fitted when the arrest fall was a 70 s lag)
- **Measured:** 7 mmHg in the first 15 s of compressions (170-185 s); mean 15.3-15.6, max 20-21 (all three skins)
- **Source verification:** research/26 T3 (verified there): Falk 1988 NEJM, with chest compressions EtCO2 rose "within 30 s to 1.0 +/- 0.5 % (~7.6 mmHg)"; Sanders 1989 JAMA, PMID 2761035 (n 35 arrests; research/26 had named it Garnett 1987, corrected 2026-10-11) "15 +/- 4 mmHg in the 9 resuscitated vs 7 +/- 5 mmHg in the 26 not resuscitated"; T3 band "CPR: 5-10 poor / 10-20 adequate / > 20 good".
- **Band vs source:** No. The floor sits above Falk's mean with compressions in place (≈ 7.6 mmHg) and inside Sanders' non-resuscitated range (7 ± 5). It also applies to the first breaths after compressions start, when the washed-out lung is still refilling (T3: EtCO2 ≈ 3 mmHg after 60 s of no flow). A floor on every sample is the wrong statistic.
- **Better evidence:** AHA 2020 (via Miller 10e ch. 82, research/26 #6): keep PETCO2 > 10, ideally > 20; that is a CPR-quality target for the patient, not a physiological floor. (grade A (Falk n 13, Sanders n 35))
- **Verdict: TOO NARROW** · proposed: window mean 10-20 mmHg at quality 0.8 (R39-2: ≈ 20), min ≥ 5 from 30 s after compressions start; no floor on the first 30 s (Falk 1988; Sanders 1989; research/26 T3)
- **Likely not a miss:** yes (min 7 in the first 15 s, mean 15.3-15.6)

<a id="row-182"></a>

#### 182. `packages/engine-core/test/engine/fidelity-ecg.test.ts:42` — saadat-like: HR display 80 -> 120 within 8 s (B9 manual 6 s at the 8 s window, ± 2 s)
- **Band / stated source:** time to first displayed HR within 5 % of 120 (≥ 114) ≤ 8 s — B9 manual M p. 65-66 via research/06 §4.1; ± 2 s borrowed from philips-like [ENG]; Orchestrator ruling 5
- **Measured:** 9 s (the review measured 10 s)
- **Source verification:** research/06 §4.1 (verified there from the B9 manual [M p.65-66]): HR averager "window 4 / 8 / 16 s, default 8 s. Response 80->120 bpm: 5 / 6 / 11 s"; "The manual's worked example: HR 120 with limits 60-100 alarms after 6 s". B9 manual PDF itself not re-opened (download failed): endpoint definition UNVERIFIED.
- **Band vs source:** Partly. The 6 s is the vendor's figure, but the test's end point (within 5 % of 120) is not shown to be the vendor's. Arithmetic: a true 8 s boxcar of 1 s HR entries reaches 80 + 40·k/8 = 114 only at k = 6.8 s. Add beat detection (≥ 1 RR, 0.5 s at 120) and the 1 s display update, and 8-9 s is expected. A 6 s response fits a looser end point, 75 % = HR 110. The manual's own example (an HR 100 limit crossed after 6 s) suggests a crossing-type end point.
- **Better evidence:** IEC 60601-2-27 / AAMI EC13 cap the response at 11 s (brief §6.1); the clause text was not obtained (UNVERIFIED). (grade C (vendor manual via research/06 + arithmetic))
- **Verdict: MIS-SPECIFIED** · proposed: Either keep ≤ 8 s but use the manual's end point (first displayed HR ≥ 110, expected ~6 s) or keep the 5 % end point with ≤ 10 s (8 s window + detection + update); the IEC ≤ 11 s row already passes (research/06 §4.1 [M p.65-66]; brief §6.1)
- **Likely not a miss:** yes (9 s is what a faithful 8 s window gives at a 5 % end point)

<a id="row-183"></a>

#### 183. `packages/engine-core/test/engine/fidelity-lowflow.test.ts:78` — Ali's case: at MAP < 30 the SpO2 is never shown valid and PI stays < 0.3
- **Band / stated source:** from 20 s after MAP < 30 holds for 20 s: zero valid SpO2 rows and max PI < 0.3 — brief §4.3 (LOW PERF below PI 0.3; no pulse -> invalid after 10-30 s); research/05 §6 [S2] p. 58-59
- **Measured:** SpO2 99 valid at 760-765 s at MAP 19-20, PI 0.31-0.33 (6 s, just before pulse loss)
- **Source verification:** Severinghaus JW, Spellman MJ. Anesthesiology 1990;73:532-537, PMID 2393137 (abstract): with hand elevation (normal pulse pressure) "right radial arterial systolic pressure (SP) was 25.3 +/- 12.4 mmHg at failure and 34.1 +/- 13.3 at recovery (mean of three oximeters, n = 189)"; with brachial clamp failure at 37.3 +/- 9.8 mmHg.
- **Band vs source:** No. The brief's device rule is PI-based (LOW PERF < 0.3, then invalid 10-30 s after no pulse); the MAP < 30 premise is not in any source. Human data put oximeter failure at radial systolic ~25 ± 12 mmHg when the pulse pressure is preserved. At MAP 19-20, about half of oximeters would still read. Modern Masimo SET claims function at lower PI still (research/03 §3.2: range 0.02-20 %).
- **Better evidence:** The 1990 data are from older oximeters; newer devices fail lower, which widens the gap. (grade A (n 9 volunteers, 189 events, three devices))
- **Verdict: TOO NARROW** · proposed: Assert the device rule: SpO2 shown "?"/LOW PERF whenever PI < 0.3, and invalid ≤ 30 s after pulse loss. Allow a valid reading at MAP 20-30 while PI ≥ 0.3. Keep the MAP-based criterion only below systolic ~20 mmHg (Severinghaus 1990 PMID 2393137; brief §4.3)
- **Likely not a miss:** yes (6 s at PI 0.31-0.33, MAP 19-20 is inside the human failure-threshold scatter)

<a id="row-184"></a>

#### 184. `packages/engine-core/test/engine/fidelity-lowflow.test.ts:110` — ventilated normal patient (MODELED, PPV from 1 s): rest PI within ± 5 % of origin/main 1.80
- **Band / stated source:** PI 1.71-1.89 (± 5 % of the pre-FU-5 engine value 1.80) — regression pin (origin/main seed 7) [ENG]; R-FU5-9
- **Measured:** 1.49 (−17 %)
- **Source verification:** research/03 §3.2 (cross-reference, not re-verified): healthy adults PI "roughly 0.3-10, median ~1.4-1.7 (IQR ~1.2-2.5)"; ICU poor perfusion discriminated at PI ≈ 1.4 (Lima 2002, PMID 12072670). No source for 1.80 ± 5 %.
- **Band vs source:** No. The band is the engine's own old output, not physiology. PPV lowers SV (the test comment: 68 vs 80 mL), so a lower PI under PPV is the expected direction. 1.49 sits at the healthy median.
- **Better evidence:** - (grade C (normal-range survey via research/03))
- **Verdict: UNSUPPORTED** · proposed: PI 1.0-3.0 for a normal ventilated adult; PI(PPV) ≤ PI(spontaneous) and ≥ 0.75 × it (the SV ratio) (research/03 §3.2; Lima 2002 PMID 12072670)
- **Likely not a miss:** yes (1.49 inside 1.0-3.0)

<a id="row-185"></a>

#### 185. `packages/engine-core/test/engine/fidelity-nibp.test.ts:22` — MANUAL PP 10 (77/67): cuff S/D within ± 8 of the instructor's 77/67
- **Band / stated source:** |cuff SBP − 77| ≤ 8 and |cuff DBP − 67| ≤ 8 (single reading) — audit M4 / Orchestrator ruling 5 [ENG]; brief §4.5
- **Measured:** cuff 80/56 (PP 24); arterial truth only 81/62 (PP 19)
- **Source verification:** Miller 10e (2025) ch. 32, p. 1006: "new devices must demonstrate average differences <= +/- 5 mm Hg and standard deviations <=8 mm Hg, which means that deviations of up to 20 mm Hg are still considered acceptable performance"; "As a rule, the systolic is underestimated while the diastolic is overestimated with the discrepancy increasing with worsening hypotension"; p. 1005: "irregular rhythms may require averaging several consecutive results to achieve adequate accuracy"; Lehman LW et al. Crit Care Med 2013;41:34-40, PMID 23269127 (abstract): 27,022 paired readings, "noninvasive blood pressure overestimated systolic invasive arterial blood pressure during hypotension"; MAPs "showed better agreement".
- **Band vs source:** No. The reference is the instructor's target, not the simultaneous arterial line, so the test also fails on the MANUAL tracker (truth 81/62, FU-4's side). Against the line the cuff passes (the sibling at :29). A single-reading ± 8 is ≈ 1 SD of the AAMI/ISO allowance; Miller notes errors up to 20 mmHg are still "acceptable".
- **Better evidence:** Direction at low pressures: the cuff underestimates SBP and overestimates DBP (narrows PP) per Miller; Lehman finds SBP overestimated in hypotension. The cuff should not widen a narrow PP. (grade A (Lehman n 27,022 pairs) / C (Miller))
- **Verdict: MIS-SPECIFIED** · proposed: Reference = the arterial line at the reading (already passing, ± 8); add cuff PP ≤ line PP + 3 (no widening); the tracker's reach of 77/67 is a separate MANUAL-tracker test (Miller 10e ch. 32 p. 1006; Lehman 2013 PMID 23269127)
- **Likely not a miss:** partly (cuff vs line is inside ± 8; the cuff widens PP by 5 where the evidence says it should narrow)

<a id="row-186"></a>

#### 186. `packages/engine-core/test/engine/fidelity-nibp.test.ts:44` — MANUAL AF 150, 11 cycles: |SBP bias| ≤ 6 mmHg against the TRUE radial pressure
- **Band / stated source:** |mean(cuff SBP − truth beat-mean SBP)| ≤ 6 over ≥ 10 readings — audit AF criterion; Stage 2 acceptance 9 (there at AF 75, vs the displayed line); Orchestrator ruling 5
- **Measured:** +10.8 (first two readings +24, +13); DBP +2.7; vs the displayed arterial line SBP +0.1, DBP +3.6 (passing sibling :36)
- **Source verification:** Pagonas N et al. Hypertension 2013;62:579-584, PMID 23897073 (abstract): 50 AF vs 52 sinus vs invasive arterial pressure; "The biases of systolic and diastolic blood pressure, however, did not significantly differ in presence or absence of atrial fibrillation"; "atrial fibrillation did not significantly affect the accuracy of oscillometric measurements, if 3 repeated measurements were performed"; Miller 10e (2025) ch. 32, p. 1006: "new devices must demonstrate average differences <= +/- 5 mm Hg and standard deviations <=8 mm Hg, which means that deviations of up to 20 mm Hg are still considered acceptable performance"; "As a rule, the systolic is underestimated while the diastolic is overestimated with the discrepancy increasing with worsening hypotension"; Miller p. 1005 on irregular rhythms (as quoted).
- **Band vs source:** No. Validation studies in AF (Pagonas) use invasive arterial pressure as the monitor reports it. The test's "truth" beat-mean counts AF's non-ejecting beats, which no catheter-derived SBP does. The band's 6 also differs from the AAMI/ISO 5.
- **Better evidence:** In AF, oscillometric bias is not different from sinus rhythm when 3 readings are averaged; within-subject variability is higher. (grade A (n 102, invasive reference))
- **Verdict: MIS-SPECIFIED** · proposed: |mean bias| ≤ 5 mmHg vs the displayed arterial line (beat-detected), SD ≤ 8, with the first reading after AF onset excluded or 3-reading averages (Pagonas 2013 PMID 23897073; Miller 10e ch. 32 p. 1005-1006)
- **Likely not a miss:** yes (+0.1 / +3.6 vs the line)

<a id="row-187"></a>

#### 187. `packages/engine-core/test/engine/fu8-lvad.test.ts:61` — HFrEF + LVAD 5400 rpm, 1.5 L bleed over 5 min: pump flow ≤ 3.0 L/min and a suction event
- **Band / stated source:** min pump flow ≤ 3.0 L/min AND suction flagged — research/20 DV-17; tables §8.2 (flow falls in hypovolaemia, low-flow alarm < 2.5; suction when LV volume < ~40 mL)
- **Measured:** min 3.68 L/min (from 3.99), no suction; PI 6.84 -> max 7.1 -> 5.76
- **Source verification:** Abbott, "HeartMate 3 LVAD Pump Parameter Overview" (cardiovascular.abbott hf-heartmate3-lvad-pump-parameters.pdf, read via pdftotext): "The HeartMate 3 LVAD observed clinical Pulsatility Index (PI) range: 1-10"; "Under otherwise stable conditions, a significant drop in value may indicate a decrease in circulating blood volume"; low-flow alarm "below a pre-set limit of either 2.5 LPM or 2.0 LPM"; PI events "to recognize and avert the LV collapse". No source found that ties a 1.5 L loss to a flow of ≤ 3.0 or to suction.
- **Band vs source:** Partly. The direction is sourced: flow falls and PI drops with blood volume (Abbott). The two numbers are not. The 3.0 L/min cut is [ENG] (Abbott's low-flow alarm is 2.5/2.0). Suction depends on speed vs LV size and is not a necessary result of a given volume (the dilated HFrEF LV, EDV 197 mL). The engine's real deviation is that PI ROSE (7.1) before falling.
- **Better evidence:** Animal/model data: hypovolaemia, high PVR and RV dysfunction each make suction-induced collapse more likely and longer (Reesink 2007, PMID 17584479, abstract), but give no volume threshold. (grade B (manufacturer + animal/model))
- **Verdict: UNSUPPORTED** · proposed: direction band: pump flow falls ≥ 10-25 % and PI falls (no transient rise) after 1.5 L; suction required only at 2 L (passing row) or when LV EDV < the collapse volume (Abbott HM3 pump-parameter overview; Reesink 2007 PMID 17584479)
- **Likely not a miss:** partly (flow −8 % is weak; the PI rise is a real miss)

<a id="row-188"></a>

#### 188. `packages/engine-core/test/engine/fu8-lvad.test.ts:68` — HeartMate 3 pulsatility index 3-5 at rest (HFrEF, LVAD 5400 rpm)
- **Band / stated source:** pump PI 3-5 — research/20 DV-16d; tables §8.2 "pulsatility index 3-4 (clinical 1-10)"
- **Measured:** 6.8 (native LV still ejects ~25 mL, aortic valve opening)
- **Source verification:** Abbott, "HeartMate 3 LVAD Pump Parameter Overview" (cardiovascular.abbott hf-heartmate3-lvad-pump-parameters.pdf, read via pdftotext): "The HeartMate 3 LVAD observed clinical Pulsatility Index (PI) range: 1-10"; "Under otherwise stable conditions, a significant drop in value may indicate a decrease in circulating blood volume"; low-flow alarm "below a pre-set limit of either 2.5 LPM or 2.0 LPM"; PI events "to recognize and avert the LV collapse"; Rangasamy S et al. ASAIO J 2019;65:241-246, PMID 29734257 (abstract, HMII/HVAD): "PP was significantly associated with PI"; "The PI shows a modest correlation to PP".
- **Band vs source:** No. The manufacturer gives only the observed clinical range 1-10 and says values are patient-specific; 3-5 is a typical-value guess. PI rises with native LV contractility and preload; this patient's LV still opens the aortic valve (PP ≈ 20), which predicts the upper half of the range.
- **Better evidence:** - (grade C (manufacturer document; small observational study))
- **Verdict: TOO NARROW** · proposed: PI 1-10 at rest; to pin the patient: PI 5-8 when the aortic valve opens with PP ≥ 15, PI 2-4 when it stays closed (Abbott HM3 pump-parameter overview; Rangasamy 2019 PMID 29734257)
- **Likely not a miss:** yes (6.8 inside 1-10)

<a id="row-189"></a>

#### 189. `packages/engine-core/test/engine/resp-child-baseline.test.ts:30` — 4 y 16 kg child, preoxygenated apnoea: displayed SpO2 < 90 no more than 20 s after SaO2 < 90
- **Band / stated source:** t(displayed SpO2 < 90) − t(model SaO2 < 90) ≤ 20 s — FU-6 R15 (suite RS2); brief §6.1 "response ≤ 20 s from the SaO2 change at the site"
- **Measured:** 22 s (+200 / +222 s)
- **Source verification:** Kagle DM et al. Anesthesiology 1987;66:376-380, PMID 3826695 (abstract): "during acute resaturation, we found that the ear- to finger-probe delay was 24.0 +/- 2.3 s"; Pertzov B et al. Lung 2019;197:67-72, PMID 30474708 (abstract): ear vs finger "for the detection of desaturation (SpO2 = 90%) was + 36 s (CI 27.0-45.0)"; Maestri R et al. Sleep Med 2019;55:6-13, PMID 30739004 (abstract): finger SpO2 "significantly delayed [bias: 12.7 s (95% limits of agreement: 2.2, 23.0 s)]" vs ear; Broome IJ et al. Anaesthesia 1992;47:17-19, PMID 1536395 (abstract): "The mean delay for finger compared to ear pulse oximetry was 4.4 s"; no significant difference at saturations of 90 % or less. No paediatric finger-lag study found (PubMed searches returned none).
- **Band vs source:** No. The brief's "≤ 20 s" is measured from the SaO2 change AT THE SITE, but the test starts the clock at the model's arterial SaO2. The brief's own chain adds a 15 s finger dead time, τ 3 s, an 8-10 s moving average (centroid ~4-5 s) and a 1-2 s update, which totals ≈ 22-25 s. In adults the finger lags the ear by 4-36 s, and the ear itself lags the arterial blood.
- **Better evidence:** A child's shorter circulation time shortens the dead time, but no paediatric number was found. (grade A for adult lag (Pertzov n 90; Kagle); paediatric extrapolation C)
- **Verdict: TOO NARROW** · proposed: ≤ 30 s from arterial SaO2 < 90 to displayed SpO2 < 90 (child, finger, normal CO); or keep ≤ 20 s but start the clock at the site (after the dead time) (brief §4.3/§6.1 chain; Kagle 1987 PMID 3826695; Pertzov 2019 PMID 30474708; Maestri 2019 PMID 30739004; Broome 1992 PMID 1536395)
- **Likely not a miss:** yes (22 s)

<a id="row-190"></a>

#### 190. `packages/engine-core/test/engine/resp-vcv-pmax.test.ts:25` — healthy VCV breaths untouched by Pmax: delivered VT within 5 mL of the set 500
- **Band / stated source:** |delivered VT − 500| ≤ 5 mL — FU-6 R7 [ENG] (prototype read 500 at 94040f7)
- **Measured:** 494.3 mL
- **Source verification:** GE Aisys CS2 reseller specification sheet (somatechnology.com ge-aisys-cs2-anesthesia-machine.pdf, not a GE document): "Volume Delivery: > 210 mL = better than 7%; <= 210 mL = better than 15 mL". Manufacturer (GE/Dräger) technical manuals not opened: UNVERIFIED beyond the reseller sheet.
- **Band vs source:** No. The test's intent is that the Pmax limit does not clip healthy breaths (peak 16.7 vs Pmax 40), and that is met. ± 5 mL (1 %) is far tighter than a clinical anaesthesia ventilator's delivery accuracy (≈ ± 7 % above 210 mL, ± 35 mL at 500). The 5.7 mL shortfall is the engine's own "delivered < set − 5" replacement rule, not a Pmax effect.
- **Better evidence:** - (grade C (device specification, secondary copy))
- **Verdict: TOO NARROW** · proposed: delivered VT 465-535 mL (± 7 %), or relative: healthy VT with default Pmax ≥ 0.99 × VT with Pmax 80 (GE Aisys CS2 specification (reseller copy))
- **Likely not a miss:** yes (494.3 inside ± 7 %)

<a id="row-191"></a>

#### 191. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1 · HR 50–70
- **Band / stated source:** 170-210 ms (recorded median ± 20) — brief §9 V1: median within ± 20 ms of the VitalDB median per HR bin [ENG] (bands.ts V1)
- **Measured:** engine 104 vs recorded 190 [179-209] (n 18,604 beats)
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". VitalDB ECG-to-ART acquisition alignment not verified (UNVERIFIED).
- **Band vs source:** Yes as an [ENG] fit target. metric rToFootMs = ECG R peak -> radial ABP foot by intersecting tangent (packages/validation/src/metrics/abp.ts); paired engine run per recorded window, graded per recorded-HR bin. The VitalDB medians fall with HR (190 / 171 / 154 ms for HR 50-70 / 70-90 / 90-110, and 150 for the other bins). That matches PEP shortening plus faster PWV at higher sympathetic tone. They sit at or above the top of Miller's awake 120-180 ms, which is timed from R onset (from the R peak the awake value is ~30-40 ms shorter). Anaesthesia predicts this: longer PEP, slower PWV. No sign of the gross latency that contaminates the pleth (V3-delay).
- **Better evidence:** Physiological spread: Weissler PEP SD ~10 ms, QS2 SD 14 ms; ± 20 ms about a recording median is ≈ 1.5 SD, a sensible fit tolerance. The recordings are anaesthetised OR patients (longer PEP, lower PWV), so medians above the awake textbook values are expected. (grade C (textbook + derived))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median (brief §9 V1; Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1)
- **Likely not a miss:** no (engine ~95-106 ms in every bin, no HR trend: PEP + PTT are too short by ~50-90 ms)

<a id="row-192"></a>

#### 192. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1-lit · all
- **Band / stated source:** 150-220 ms (R peak -> radial tangent foot, absolute) — research 03 §2.1: R -> radial upstroke 150-220 ms
- **Measured:** engine 102 vs recorded 167 [148-194]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". research/03 §2.1's 150-220 ms is itself an [ENG] derivation ("Derived estimates [ENG], using path length / PWV").
- **Band vs source:** Partly. The source is an [ENG] estimate (PEP 80-110 + PTT 60-110), not a measurement. Miller gives 120-180 ms from the BEGINNING of the R wave; measured from the R PEAK (30-40 ms later), the awake value is ~100-150 ms. Weissler PEP (~105 ms at HR 65, from Q onset) plus aorta-radial PTT (~0.75 m at 8-10 m/s, 75-95 ms), minus Q-to-R-peak, gives ~135-165 ms. The 150 floor therefore excludes healthy awake and ICU values. The MGH ICU/cath recordings (median 145) fall below it. Pooled VitalDB + MGH.
- **Better evidence:** Anaesthesia lengthens PEP and slows PWV (VitalDB 150-190 by HR bin). Older stiff arteries shorten PTT. (grade C (textbook + derived; VitalDB/MGH recordings))
- **Verdict: TOO NARROW** · proposed: 120-220 ms (R peak -> radial tangent foot), with the per-bin V1 rows doing the fine fit (Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1; VitalDB/MGH recorded medians)
- **Likely not a miss:** no (engine 95-103 ms is below even the widened band)

<a id="row-193"></a>

#### 193. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1-lit · vitaldb
- **Band / stated source:** 150-220 ms (R peak -> radial tangent foot, absolute) — research 03 §2.1: R -> radial upstroke 150-220 ms
- **Measured:** engine 103 vs recorded 172 [155-198]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". research/03 §2.1's 150-220 ms is itself an [ENG] derivation ("Derived estimates [ENG], using path length / PWV").
- **Band vs source:** Partly. The source is an [ENG] estimate (PEP 80-110 + PTT 60-110), not a measurement. Miller gives 120-180 ms from the BEGINNING of the R wave; measured from the R PEAK (30-40 ms later), the awake value is ~100-150 ms. Weissler PEP (~105 ms at HR 65, from Q onset) plus aorta-radial PTT (~0.75 m at 8-10 m/s, 75-95 ms), minus Q-to-R-peak, gives ~135-165 ms. The 150 floor therefore excludes healthy awake and ICU values. The MGH ICU/cath recordings (median 145) fall below it. VitalDB (anaesthetised) sits inside either band.
- **Better evidence:** Anaesthesia lengthens PEP and slows PWV (VitalDB 150-190 by HR bin). Older stiff arteries shorten PTT. (grade C (textbook + derived; VitalDB/MGH recordings))
- **Verdict: TOO NARROW** · proposed: 120-220 ms (R peak -> radial tangent foot), with the per-bin V1 rows doing the fine fit (Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1; VitalDB/MGH recorded medians)
- **Likely not a miss:** no (engine 95-103 ms is below even the widened band)

<a id="row-194"></a>

#### 194. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1-lit · mghdb
- **Band / stated source:** 150-220 ms (R peak -> radial tangent foot, absolute) — research 03 §2.1: R -> radial upstroke 150-220 ms
- **Measured:** engine 95.2 vs recorded 145 [130-170]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". research/03 §2.1's 150-220 ms is itself an [ENG] derivation ("Derived estimates [ENG], using path length / PWV").
- **Band vs source:** Partly. The source is an [ENG] estimate (PEP 80-110 + PTT 60-110), not a measurement. Miller gives 120-180 ms from the BEGINNING of the R wave; measured from the R PEAK (30-40 ms later), the awake value is ~100-150 ms. Weissler PEP (~105 ms at HR 65, from Q onset) plus aorta-radial PTT (~0.75 m at 8-10 m/s, 75-95 ms), minus Q-to-R-peak, gives ~135-165 ms. The 150 floor therefore excludes healthy awake and ICU values. The MGH ICU/cath recordings (median 145) fall below it. Here the band rejects the recording itself (145 < 150). MGH/MF ABP site not confirmed as radial in every record (UNVERIFIED).
- **Better evidence:** Anaesthesia lengthens PEP and slows PWV (VitalDB 150-190 by HR bin). Older stiff arteries shorten PTT. (grade C (textbook + derived; VitalDB/MGH recordings))
- **Verdict: TOO NARROW** · proposed: 120-220 ms (R peak -> radial tangent foot), with the per-bin V1 rows doing the fine fit (Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1; VitalDB/MGH recorded medians)
- **Likely not a miss:** no (engine 95-103 ms is below even the widened band)

<a id="row-195"></a>

#### 195. `docs/validation/calibration-queue.md (validation scenario morphology)` — V2 · HR 90–110
- **Band / stated source:** 408-448 ms (recorded median ± 20) — brief §9 V2: ± 20 ms (R -> notch vs PEP + LVET + PTT)
- **Measured:** engine 270 vs recorded 428 [386-478]
- **Source verification:** research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch".
- **Band vs source:** Yes. At HR 100: QS2 336 (men) / 349 (women); minus Q-onset-to-R-peak (~30-40) plus aorta-radial notch transit (~70-110, more peripheral notch "slightly delayed") gives R-peak -> radial notch ≈ 366-429 ms awake. The VitalDB medians (518 / 484 / 428 ms for HR 60 / 80 / 100) fall at −2.25 ms/bpm, matching Weissler's QS2 slope (−2.0 to −2.1), and sit at, or up to ~15 ms above, the top of that awake estimate, as anaesthesia predicts. The recording is physiologically coherent, so ± 20 ms (≈ 1.4 SD of QS2) is a fair fit tolerance. Notch detection (first minimum after peak + 60 ms, else max d²P) is the same code for both.
- **Better evidence:** Weissler 1968 (n 211; via research/03). The engine's R -> notch 258-284 ms barely moves with HR (−0.4 ms/bpm). That is shorter than PEP + LVET alone (~400 ms at HR 60), so the engine notch is probably a late-systolic shoulder or an LVET that is far too short. (grade C (equations verified via patents; recordings))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median; optionally add a slope check: −1.5 to −2.5 ms/bpm across bins (Weissler QS2) (brief §9 V2; Weissler via research/03 §2.1; Miller 10e ch. 32 p. 1011)
- **Likely not a miss:** no (engine 258-284 ms is 100-230 ms short with no HR slope)

<a id="row-196"></a>

#### 196. `docs/validation/calibration-queue.md (validation scenario morphology)` — V2 · HR 70–90
- **Band / stated source:** 464-504 ms (recorded median ± 20) — brief §9 V2: ± 20 ms (R -> notch vs PEP + LVET + PTT)
- **Measured:** engine 282 vs recorded 484 [444-526]
- **Source verification:** research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch".
- **Band vs source:** Yes. At HR 80: QS2 378 (men) / 389 (women); minus Q-onset-to-R-peak (~30-40) plus aorta-radial notch transit (~70-110, more peripheral notch "slightly delayed") gives R-peak -> radial notch ≈ 408-469 ms awake. The VitalDB medians (518 / 484 / 428 ms for HR 60 / 80 / 100) fall at −2.25 ms/bpm, matching Weissler's QS2 slope (−2.0 to −2.1), and sit at, or up to ~15 ms above, the top of that awake estimate, as anaesthesia predicts. The recording is physiologically coherent, so ± 20 ms (≈ 1.4 SD of QS2) is a fair fit tolerance. Notch detection (first minimum after peak + 60 ms, else max d²P) is the same code for both.
- **Better evidence:** Weissler 1968 (n 211; via research/03). The engine's R -> notch 258-284 ms barely moves with HR (−0.4 ms/bpm). That is shorter than PEP + LVET alone (~400 ms at HR 60), so the engine notch is probably a late-systolic shoulder or an LVET that is far too short. (grade C (equations verified via patents; recordings))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median; optionally add a slope check: −1.5 to −2.5 ms/bpm across bins (Weissler QS2) (brief §9 V2; Weissler via research/03 §2.1; Miller 10e ch. 32 p. 1011)
- **Likely not a miss:** no (engine 258-284 ms is 100-230 ms short with no HR slope)

<a id="row-197"></a>

#### 197. `docs/validation/calibration-queue.md (validation scenario morphology)` — V2 · HR 50–70
- **Band / stated source:** 498-538 ms (recorded median ± 20) — brief §9 V2: ± 20 ms (R -> notch vs PEP + LVET + PTT)
- **Measured:** engine 284 vs recorded 518 [448-554]
- **Source verification:** research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch".
- **Band vs source:** Yes. At HR 60: QS2 420 (men) / 429 (women); minus Q-onset-to-R-peak (~30-40) plus aorta-radial notch transit (~70-110, more peripheral notch "slightly delayed") gives R-peak -> radial notch ≈ 450-509 ms awake. The VitalDB medians (518 / 484 / 428 ms for HR 60 / 80 / 100) fall at −2.25 ms/bpm, matching Weissler's QS2 slope (−2.0 to −2.1), and sit at, or up to ~15 ms above, the top of that awake estimate, as anaesthesia predicts. The recording is physiologically coherent, so ± 20 ms (≈ 1.4 SD of QS2) is a fair fit tolerance. Notch detection (first minimum after peak + 60 ms, else max d²P) is the same code for both.
- **Better evidence:** Weissler 1968 (n 211; via research/03). The engine's R -> notch 258-284 ms barely moves with HR (−0.4 ms/bpm). That is shorter than PEP + LVET alone (~400 ms at HR 60), so the engine notch is probably a late-systolic shoulder or an LVET that is far too short. (grade C (equations verified via patents; recordings))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median; optionally add a slope check: −1.5 to −2.5 ms/bpm across bins (Weissler QS2) (brief §9 V2; Weissler via research/03 §2.1; Miller 10e ch. 32 p. 1011)
- **Likely not a miss:** no (engine 258-284 ms is 100-230 ms short with no HR slope)

<a id="row-198"></a>

#### 198. `docs/validation/calibration-queue.md (validation scenario morphology)` — V3-shape · all
- **Band / stated source:** r 0.80-1.00 (absolute) — brief §9 V3: r ≥ 0.8 [ENG]
- **Measured:** engine 0.4 [0.2-0.7] vs recorded 0.9 [0.8-1.0]
- **Source verification:** brief §9 V3 (docs/DESIGN-BRIEF.md §9 table): metric = "PPG foot − ABP foot; per-beat amplitude correlation under SV perturbation; beat-count equality", criterion "r ≥0.8 [ENG]". Code (packages/validation/src/metrics/ppg.ts): "Shape: Pearson r of the two median beats, each aligned on its own foot, 0 … 0.8·median beat interval, min–max normalised". research/03 §3.1: the PPG is "a low-pass-filtered, delayed, nonlinearly compressed version of the local arterial pressure pulse".
- **Band vs source:** No (definition). The brief's r ≥ 0.8 is for per-beat AMPLITUDE correlation under SV perturbation (does the pleth track stroke volume?). The code applies it to a median-beat SHAPE correlation, a different quantity. For the shape metric the number happens to be supported by the recording (VitalDB 0.9 [0.8-1.0]). 
- **Better evidence:** - (grade C (internal definitions; recording))
- **Verdict: MIS-SPECIFIED** · proposed: rename to a shape band: r ≥ 0.8 (VitalDB p25 0.8) or ± 0.1 of the paired recording; add the brief's amplitude-correlation metric (per-beat pleth amplitude vs SV, r ≥ 0.8) as its own row (brief §9 V3; VitalDB recorded distribution)
- **Likely not a miss:** no (engine 0.4-0.5 vs recorded 0.9: the engine pleth shape is genuinely unlike the recorded one)

<a id="row-199"></a>

#### 199. `docs/validation/calibration-queue.md (validation scenario morphology)` — V3-shape · vitaldb
- **Band / stated source:** r 0.80-1.00 (absolute) — brief §9 V3: r ≥ 0.8 [ENG]
- **Measured:** engine 0.4 [0.3-0.7] vs recorded 0.9 [0.8-1.0]
- **Source verification:** brief §9 V3 (docs/DESIGN-BRIEF.md §9 table): metric = "PPG foot − ABP foot; per-beat amplitude correlation under SV perturbation; beat-count equality", criterion "r ≥0.8 [ENG]". Code (packages/validation/src/metrics/ppg.ts): "Shape: Pearson r of the two median beats, each aligned on its own foot, 0 … 0.8·median beat interval, min–max normalised". research/03 §3.1: the PPG is "a low-pass-filtered, delayed, nonlinearly compressed version of the local arterial pressure pulse".
- **Band vs source:** No (definition). The brief's r ≥ 0.8 is for per-beat AMPLITUDE correlation under SV perturbation (does the pleth track stroke volume?). The code applies it to a median-beat SHAPE correlation, a different quantity. For the shape metric the number happens to be supported by the recording (VitalDB 0.9 [0.8-1.0]). 
- **Better evidence:** - (grade C (internal definitions; recording))
- **Verdict: MIS-SPECIFIED** · proposed: rename to a shape band: r ≥ 0.8 (VitalDB p25 0.8) or ± 0.1 of the paired recording; add the brief's amplitude-correlation metric (per-beat pleth amplitude vs SV, r ≥ 0.8) as its own row (brief §9 V3; VitalDB recorded distribution)
- **Likely not a miss:** no (engine 0.4-0.5 vs recorded 0.9: the engine pleth shape is genuinely unlike the recorded one)

<a id="row-200"></a>

#### 200. `docs/validation/calibration-queue.md (validation scenario morphology)` — V3-shape · mghdb
- **Band / stated source:** r 0.80-1.00 (absolute) — brief §9 V3: r ≥ 0.8 [ENG]
- **Measured:** engine 0.5 [0.2-0.8] vs recorded — (n 0)
- **Source verification:** brief §9 V3 (docs/DESIGN-BRIEF.md §9 table): metric = "PPG foot − ABP foot; per-beat amplitude correlation under SV perturbation; beat-count equality", criterion "r ≥0.8 [ENG]". Code (packages/validation/src/metrics/ppg.ts): "Shape: Pearson r of the two median beats, each aligned on its own foot, 0 … 0.8·median beat interval, min–max normalised". research/03 §3.1: the PPG is "a low-pass-filtered, delayed, nonlinearly compressed version of the local arterial pressure pulse".
- **Band vs source:** No (definition). The brief's r ≥ 0.8 is for per-beat AMPLITUDE correlation under SV perturbation (does the pleth track stroke volume?). The code applies it to a median-beat SHAPE correlation, a different quantity. For the shape metric the number happens to be supported by the recording (VitalDB 0.9 [0.8-1.0]). No recorded pleth in the MGH windows (n 0), so this row has no comparator and repeats the absolute band on engine-only data.
- **Better evidence:** - (grade C (internal definitions; recording))
- **Verdict: MIS-SPECIFIED** · proposed: rename to a shape band: r ≥ 0.8 (VitalDB p25 0.8) or ± 0.1 of the paired recording; add the brief's amplitude-correlation metric (per-beat pleth amplitude vs SV, r ≥ 0.8) as its own row (brief §9 V3; VitalDB recorded distribution)
- **Likely not a miss:** no (engine 0.4-0.5 vs recorded 0.9: the engine pleth shape is genuinely unlike the recorded one)

<a id="row-201"></a>

#### 201. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1 · HR other
- **Band / stated source:** 130-170 ms (recorded median ± 20) — brief §9 V1: median within ± 20 ms of the VitalDB median per HR bin [ENG] (bands.ts V1)
- **Measured:** engine 94.5 vs recorded 150 [123-164]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". VitalDB ECG-to-ART acquisition alignment not verified (UNVERIFIED).
- **Band vs source:** Yes as an [ENG] fit target, with a caveat: brief §9 defines only the 50-70 / 70-90 / 90-110 bins, and 'HR other' pools HR < 50 and > 110. Because windows are paired (engine matched to each recording) the delta is still fair, but the median depends on the mix. metric rToFootMs = ECG R peak -> radial ABP foot by intersecting tangent (packages/validation/src/metrics/abp.ts); paired engine run per recorded window, graded per recorded-HR bin.
- **Better evidence:** Physiological spread: Weissler PEP SD ~10 ms, QS2 SD 14 ms; ± 20 ms about a recording median is ≈ 1.5 SD, a sensible fit tolerance. The recordings are anaesthetised OR patients (longer PEP, lower PWV), so medians above the awake textbook values are expected. (grade C (textbook + derived))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median; report HR < 50 and > 110 as separate bins (brief §9 V1; Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1)
- **Likely not a miss:** no (engine ~95-106 ms in every bin, no HR trend: PEP + PTT are too short by ~50-90 ms)

<a id="row-202"></a>

#### 202. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1 · HR 90–110
- **Band / stated source:** 134-174 ms (recorded median ± 20) — brief §9 V1: median within ± 20 ms of the VitalDB median per HR bin [ENG] (bands.ts V1)
- **Measured:** engine 97.3 vs recorded 154 [140-180]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". VitalDB ECG-to-ART acquisition alignment not verified (UNVERIFIED).
- **Band vs source:** Yes as an [ENG] fit target. metric rToFootMs = ECG R peak -> radial ABP foot by intersecting tangent (packages/validation/src/metrics/abp.ts); paired engine run per recorded window, graded per recorded-HR bin. The VitalDB medians fall with HR (190 / 171 / 154 ms for HR 50-70 / 70-90 / 90-110, and 150 for the other bins). That matches PEP shortening plus faster PWV at higher sympathetic tone. They sit at or above the top of Miller's awake 120-180 ms, which is timed from R onset (from the R peak the awake value is ~30-40 ms shorter). Anaesthesia predicts this: longer PEP, slower PWV. No sign of the gross latency that contaminates the pleth (V3-delay).
- **Better evidence:** Physiological spread: Weissler PEP SD ~10 ms, QS2 SD 14 ms; ± 20 ms about a recording median is ≈ 1.5 SD, a sensible fit tolerance. The recordings are anaesthetised OR patients (longer PEP, lower PWV), so medians above the awake textbook values are expected. (grade C (textbook + derived))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median (brief §9 V1; Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1)
- **Likely not a miss:** no (engine ~95-106 ms in every bin, no HR trend: PEP + PTT are too short by ~50-90 ms)

<a id="row-203"></a>

#### 203. `docs/validation/calibration-queue.md (validation scenario morphology)` — V1 · HR 70–90
- **Band / stated source:** 151-191 ms (recorded median ± 20) — brief §9 V1: median within ± 20 ms of the VitalDB median per HR bin [ENG] (bands.ts V1)
- **Measured:** engine 106 vs recorded 171 [159-193]
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)". VitalDB ECG-to-ART acquisition alignment not verified (UNVERIFIED).
- **Band vs source:** Yes as an [ENG] fit target. metric rToFootMs = ECG R peak -> radial ABP foot by intersecting tangent (packages/validation/src/metrics/abp.ts); paired engine run per recorded window, graded per recorded-HR bin. The VitalDB medians fall with HR (190 / 171 / 154 ms for HR 50-70 / 70-90 / 90-110, and 150 for the other bins). That matches PEP shortening plus faster PWV at higher sympathetic tone. They sit at or above the top of Miller's awake 120-180 ms, which is timed from R onset (from the R peak the awake value is ~30-40 ms shorter). Anaesthesia predicts this: longer PEP, slower PWV. No sign of the gross latency that contaminates the pleth (V3-delay).
- **Better evidence:** Physiological spread: Weissler PEP SD ~10 ms, QS2 SD 14 ms; ± 20 ms about a recording median is ≈ 1.5 SD, a sensible fit tolerance. The recordings are anaesthetised OR patients (longer PEP, lower PWV), so medians above the awake textbook values are expected. (grade C (textbook + derived))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median (brief §9 V1; Miller 10e ch. 32 p. 1011; Weissler via research/03 §2.1)
- **Likely not a miss:** no (engine ~95-106 ms in every bin, no HR trend: PEP + PTT are too short by ~50-90 ms)

<a id="row-204"></a>

#### 204. `docs/validation/calibration-queue.md (validation scenario morphology)` — V2 · HR other
- **Band / stated source:** 340-380 ms (recorded median ± 20) — brief §9 V2: ± 20 ms (R -> notch vs PEP + LVET + PTT)
- **Measured:** engine 258 vs recorded 360 [328-428]
- **Source verification:** research/03 §2.1 (Weissler 1968 equations verified there): "LVET (ms) = 413 − 1.7·HR (men); 418 − 1.6·HR (women)"; "QS2 (ms) = 546 − 2.1·HR (men); 549 − 2.0·HR (women) ... SD 14 ms"; "PEP (ms) ≈ 131 − 0.4·HR"; Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch".
- **Band vs source:** Yes as an [ENG] fit target (paired windows), but the bin is outside brief §9's three HR bins and mixes bradycardia with tachycardia; Weissler predicts > 100 ms difference across that range.
- **Better evidence:** Weissler 1968 (n 211; via research/03). The engine's R -> notch 258-284 ms barely moves with HR (−0.4 ms/bpm). That is shorter than PEP + LVET alone (~400 ms at HR 60), so the engine notch is probably a late-systolic shoulder or an LVET that is far too short. (grade C (equations verified via patents; recordings))
- **Verdict: RIGHT** · proposed: keep ± 20 ms of the paired recording median; split HR < 50 and > 110; optionally add a slope check: −1.5 to −2.5 ms/bpm across bins (Weissler QS2) (brief §9 V2; Weissler via research/03 §2.1; Miller 10e ch. 32 p. 1011)
- **Likely not a miss:** no (engine 258-284 ms is 100-230 ms short with no HR slope)

<a id="row-205"></a>

#### 205. `docs/validation/calibration-queue.md (validation scenario morphology)` — V2-kind · mghdb
- **Band / stated source:** 0.32-0.92 (share of beats with a true notch minimum, recorded 0.6 ± 0.3) — [ENG] share of beats with a true notch minimum within ± 0.3 of the recording
- **Measured:** engine 1.0 [1.0-1.0] vs recorded 0.6 [0.2-1.0] (n 32 windows)
- **Source verification:** Miller 10e (2025) ch. 32 p. 1011: "Note that the systolic upstroke starts 120-180 ms after the beginning of the R wave, reflecting the time required for left ventricular depolarization, isovolumic contraction, opening of the aortic valve, left ventricular ejection, and propagation of the pressure wave"; "more peripheral arterial waveforms generally display a slightly delayed and mildly blunted dicrotic notch"; research/03 §2.1: radial contour has "a markedly diminished or absent notch compared with the aorta"; §2.3 ageing: "notch less distinct". No source for ± 0.3.
- **Band vs source:** Partly. The direction is sourced: radial notches are often only inflections, more so with age and vasoconstriction. The ± 0.3 tolerance is unsourced. The sibling rows (all/vitaldb, 0.63-1.23) have an upper limit above 1, so they cannot fail from above.
- **Better evidence:** - (grade C (textbook direction only))
- **Verdict: UNSUPPORTED** · proposed: keep as an [ENG] row but cap at 1.0; better: require the engine minimum-notch share to fall with age/vasoconstriction (e.g. < 0.8 at age > 65 or with vasopressor) rather than match a cohort fraction (Miller 10e ch. 32 p. 1011; research/03 §2.1, §2.3)
- **Likely not a miss:** no (engine 1.0 everywhere has no notch variety)

<a id="row-206"></a>

#### 206. `docs/validation/calibration-queue.md (validation scenario morphology)` — V3-delay · all
- **Band / stated source:** 20-100 ms (PPG foot − ABP foot, absolute) — brief §9 V3 / research 03 §3.1 (recorded VitalDB delay device-latency-contaminated, report only)
- **Measured:** engine 113 [87.4-122] vs recorded 442 [384-473]
- **Source verification:** Obeid H et al. Am J Physiol Heart Circ Physiol 2021;320:H1361-H1369, PMID 33481697 (abstract): radial-to-index-fingertip PWV "Intersecting-tangent RD-PWV was 4.73 ± 1.20" m/s in 29 healthy subjects; research/03 §3.1: "the foot comes ~20–100 ms after the radial arterial foot" [ENG/TXT]; research/03 §2.1 table: finger PPG foot PAT ~200-300 ms vs radial ~150-220 ms; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)".
- **Band vs source:** Yes. Wrist-to-fingertip path ~0.18-0.20 m at radial-digital PWV 4.7 ± 1.2 m/s gives ~30-55 ms for the pressure foot; the volume (PPG) foot adds a little. Vasodilation and low pressure under GA lengthen it. 20-100 brackets this. The recorded 442 ms cannot be physiological: it would put the finger foot ~610 ms after R, beyond the next R at HR > 100, and R-to-finger PAT is 200-300 ms. That confirms the queue's note that the VitalDB pleth carries a device/export latency.
- **Better evidence:** - (grade B (n 29 healthy, piezo tonometry; PPG inferred))
- **Verdict: RIGHT** · proposed: keep 20-100 ms; never fit to the VitalDB recorded delay (subtract a measured export offset if one is ever established) (Obeid 2021 PMID 33481697; research/03 §2.1, §3.1)
- **Likely not a miss:** no (engine 113-115 ms is ~15 ms above; MGH-matched engine runs give 91.5, inside)

<a id="row-207"></a>

#### 207. `docs/validation/calibration-queue.md (validation scenario morphology)` — V3-delay · vitaldb
- **Band / stated source:** 20-100 ms (PPG foot − ABP foot, absolute) — brief §9 V3 / research 03 §3.1 (recorded VitalDB delay device-latency-contaminated, report only)
- **Measured:** engine 115 [90.1-122] vs recorded 442 [384-473]
- **Source verification:** Obeid H et al. Am J Physiol Heart Circ Physiol 2021;320:H1361-H1369, PMID 33481697 (abstract): radial-to-index-fingertip PWV "Intersecting-tangent RD-PWV was 4.73 ± 1.20" m/s in 29 healthy subjects; research/03 §3.1: "the foot comes ~20–100 ms after the radial arterial foot" [ENG/TXT]; research/03 §2.1 table: finger PPG foot PAT ~200-300 ms vs radial ~150-220 ms; Payne RA et al. J Appl Physiol 2006;100:136-141, PMID 16141378 (abstract): R-wave-to-finger transit with intra-arterial radial pressure in 12 young men; "PEP accounted for a substantial and variable proportion of rPTT (12-35%)".
- **Band vs source:** Yes. Wrist-to-fingertip path ~0.18-0.20 m at radial-digital PWV 4.7 ± 1.2 m/s gives ~30-55 ms for the pressure foot; the volume (PPG) foot adds a little. Vasodilation and low pressure under GA lengthen it. 20-100 brackets this. The recorded 442 ms cannot be physiological: it would put the finger foot ~610 ms after R, beyond the next R at HR > 100, and R-to-finger PAT is 200-300 ms. That confirms the queue's note that the VitalDB pleth carries a device/export latency.
- **Better evidence:** - (grade B (n 29 healthy, piezo tonometry; PPG inferred))
- **Verdict: RIGHT** · proposed: keep 20-100 ms; never fit to the VitalDB recorded delay (subtract a measured export offset if one is ever established) (Obeid 2021 PMID 33481697; research/03 §2.1, §3.1)
- **Likely not a miss:** no (engine 113-115 ms is ~15 ms above; MGH-matched engine runs give 91.5, inside)

<a id="row-208"></a>

#### 208. `docs/validation/calibration-queue.md (validation scenario morphology)` — V5-PR · all
- **Band / stated source:** 140-216 ms (PTB-XL NORM p10-p90, same method) — PTB-XL NORM p10-p90 by the same method (filled at run time)
- **Measured:** engine 217 [210-220] (12 captures: HR 60/75/90/100 × 3 seeds); recorded —
- **Source verification:** Mason JW et al. J Electrocardiol 2007;40:228-234, PMID 17276451 (abstract, 46,129 low-risk subjects, cardiologist-read): 2nd-98th percentiles "PR interval, 113 to 212 milliseconds; QRS interval, 69 to 109 milliseconds". Band = PTB-XL v1.0.3 first 100 "NORM: 100.0" records measured with the engine's own method (intervals-suite.ts; metrics/intervals.ts: PR = QRS onset − P onset, 15 %/25 % slope thresholds [ENG]).
- **Band vs source:** Yes. The same method on the same NORM population cancels method bias. The bias is real: the method's QRS p10-p90 is 44-76 ms against Mason's 69-109, so QRS onset is found late and PR reads long by ~15-25 ms. That is why the PTB-XL p90 (216) exceeds the cardiologist p98 (212). p10-p90 of 100 records is a reasonable population band.
- **Better evidence:** - (grade A (Mason n 46,129; PTB-XL n 100 by the same method))
- **Verdict: RIGHT** · proposed: keep 140-216 (method-matched); for a default adult, aim nearer the reference median than its p90 (Mason 2007 PMID 17276451; PTB-XL v1.0.3)
- **Likely not a miss:** no (engine 217 = PTB-XL p90, ≈ 190-200 ms clinically after the method bias: borderline first-degree AV block for a default patient)

<a id="row-209"></a>

#### 209. `docs/validation/calibration-queue.md (validation scenario morphology)` — V5-PR · vitaldb
- **Band / stated source:** 140-216 ms (same as V5-PR · all) — PTB-XL NORM p10-p90 by the same method (filled at run time)
- **Measured:** engine 217 [210-220]; recorded —
- **Source verification:** packages/validation/src/cli/validate.ts: the engine intervals join the morphology table as ONE pseudo-window built with `source: 'vitaldb' as const, record: 'capture12'`; gradePairs then emits per-source rows. No VitalDB data enter V5.
- **Band vs source:** No. The row is an artefact of labelling the engine-only capture as source 'vitaldb'. It duplicates V5-PR · all and implies a VitalDB comparison that does not exist.
- **Better evidence:** - (grade C (code reading))
- **Verdict: MIS-SPECIFIED** · proposed: drop the per-source rows for V5 (or label the pseudo-window 'engine'); judge V5 on the 'all' row only (validate.ts; intervals-suite.ts)
- **Likely not a miss:** no (same engine value as V5-PR · all)

### Section findings

**(a) Bands most likely wrong, ranked**
1. **fidelity-lowflow:78, "never valid SpO2 at MAP < 30".** Severinghaus 1990 (PMID 2393137) has oximeters failing
   at radial systolic 25 ± 12 mmHg with a normal pulse pressure. The brief's own rule is PI-based (LOW PERF < 0.3).
   Dependents: the passing 3 L-bleed row at :41 (same criterion, it passes there), FU-7.1 Q10, the audit's M1 class.
2. **resp-child-baseline:30, oximeter lag ≤ 20 s.** The clock starts at arterial SaO2, but the brief's "≤ 20 s" is
   from the site, and its own chain (15 s dead time + τ 3 s + 8–10 s average + update) sums to ≈ 22–25 s. Adult
   finger lag vs ear is 4–36 s (Kagle, Pertzov, Maestri, Broome). Dependents: suite RS2, the V.1 / FU-5 display-lag
   request, brief §6.1's SpO2 row.
3. **fidelity-arrest:81, CPR EtCO2 floor 10 on every sample.** It contradicts Falk's ≈ 7.6 mmHg and research/26 T3
   (5–10 poor / 10–20 adequate). Dependents: FU-7.1 Q9, g3-cpr-etco2 (R39-2 ≈ 20 at quality 0.8, another section's
   queue row), the alveolar-washout mechanism of FU-7.1 B3.
4. **fu8-lvad:68, HM3 PI 3–5.** Abbott: "observed clinical Pulsatility Index (PI) range: 1–10". A patient whose
   aortic valve still opens belongs in the upper half. Dependents: research/20 DV-16d, tables §8.2 "PI 3–4".
   **fu8-lvad:61 (1.5 L bleed)**: the flow ≤ 3.0 + suction numbers are unsourced. What IS sourced (PI falls with
   volume loss) is the engine's real miss: PI rose to 7.1. Dependents: DV-17, LVAD_SUCTION_ML and its size scaling.
5. **fidelity-nibp:44 (AF bias vs the "true" beat-mean) and :22 (narrow PP vs the instructor's target).** Wrong
   reference in both. Pagonas 2013 finds AF bias equal to sinus against invasive pressure. Miller p. 1006 says the
   cuff narrows (not widens) PP in hypotension, so the cuff's +5 PP widening at :29 is the real defect. Dependents:
   Stage 2 acceptance 9 / hemo-nibp, NIBP-bias (± 5) morphology row, DV-16b (NIBP at PP 20).
6. **fidelity-alarms:33, CVP_M_HIGH ≤ 2 raises over a tour with VT, CHB, junctional and VVI.** Cannon a waves
   (Miller p. 1022) make some raises correct. Dependents: D9 hysteresis, FU-5 ruling 5, and the real root:
   circ-manual-cvp-peep (T_IT 0.65 vs the ~0.37 transmission in Yang 2012). That RIGHT band is a real miss and
   moves five calibrated bands (check 18, 7c OLV, R36 PH crisis, 8a SBP) when fixed.
7. **fidelity-ecg:42, saadat-like 80→120 ≤ 8 s.** The 5 % end point is stricter than an 8 s boxcar can meet
   (k = 6.8 s + detection + update ≈ 8–9 s); the manual's 6 s fits a ~75 % or crossing end point. Dependents:
   research/06 §4.1, brief §6.1 saadat-like HR row.
8. **fidelity-arrest:44, PEA spread ≤ 5.** The engine models pseudo-PEA (Paradis: PP 6.3 ± 3.5 in 39/94 EMD
   patients) and the band does not say which PEA it tests. Dependents: review ruling 3, the abpNonPulsatile INOP.
9. **V1-lit (three rows), floor 150 ms.** It is an [ENG] derivation; Miller p. 1011 gives 120–180 ms from R onset,
   and the MGH recording (145) fails its own literature band. Proposed 120–220. Engine still misses.
10. **V3-shape (three rows).** The criterion is the brief's amplitude-correlation r ≥ 0.8 applied to a shape metric.
    The number survives for shape (VitalDB 0.9), but the brief's SV-tracking metric is not measured at all.
    Also: resp-vcv-pmax:25 (± 5 mL vs ≈ ± 7 % device accuracy) and fidelity-lowflow:110 (a regression pin, not
    physiology) are mis-sized but low-stakes. V5-PR · vitaldb is a labelling artefact (validate.ts pseudo-window).

**(b) Known misses that are probably NOT misses** (the measured value is inside the corrected or evidence band):
oximeter validity at MAP 19–20 / PI 0.31–0.33 (lowflow:78); ventilated PI 1.49 (lowflow:110); saadat-like HR
response 9 s; CPR EtCO2 min 7 with mean 15.3–15.6; pseudo-PEA spread 6 mmHg (if pseudo-PEA is intended); AF bias
vs the line +0.1 / +3.6; HM3 PI 6.8; child oximeter lag 22 s; delivered VT 494.3 mL. Partly: CVP chatter count 4
(part physiological, part the T_IT baseline); narrow-PP cuff (inside ± 8 vs line, wrong direction of PP error);
1.5 L LVAD bleed (flow −8 % weak, PI rise wrong). Still real misses against RIGHT bands: MANUAL CVP under PEEP
(max 10.17 > 9.5); all V1 and V2 per-bin rows (engine R→foot ~100 ms and R→notch ~270 ms with no HR slope);
V3-delay (113–115 vs ≤ 100, small); V5-PR (217 at the p90 edge). V3-shape (0.4) and V2-kind (1.0) are real
model deficits under mis-specified or unsourced bands.

**(c) Items with no source.** V2-kind's ± 0.3 (and its sibling rows' upper limit 1.23 > 1, so they cannot fail
from above); fidelity-lowflow:110's ± 5 % of 1.80 (engine regression pin); the "≤ 2 raises" chatter count; the
PEA ≤ 5 mmHg spread (review ruling 3, no vendor amplitude rule found); the LVAD 1.5 L → flow ≤ 3.0 + suction cell
(DV-17, [ENG]); resp-vcv-pmax's ± 5 mL; the "MAP < 30" premise in lowflow:78; V1's ± 20 ms and V3-shape's r ≥ 0.8
(both [ENG] by the brief's own tag; the recordings support them as fit targets). research/03 §2.1's 150–220 ms
R→radial figure is a derived [ENG] estimate, not a measurement.

## Synthesis

**Coverage.** 209 rows in 11 sections:

| Section | Rows | Numbers |
|---|---|---|
| Neuro | 16 | 1–16 |
| Circulation A | 22 | 17–38 |
| Circulation B | 32 | 39–70 |
| Respiration A | 24 | 71–94 |
| Respiration B | 20 | 95–114 |
| Blood | 8 | 115–122 |
| Kidney | 9 | 123–131 |
| Endocrine/thermal | 10 | 132–141 |
| Drugs A | 21 | 142–162 |
| Drugs B | 14 | 163–176 |
| Devices | 33 | 177–209 |

All 43 calibration-queue rows are covered, along with 154 known-miss assertions and the 11 entries of the
lung-signature `KNOWN` list (rows 98–108). The `KNOWN` list is a known-miss mechanism the grep for `it.fails` does not
see. Two passing tests are included because they are hidden misses (rows 7 and 168).

**Verdicts (209 rows):** 81 MIS-SPECIFIED, 46 RIGHT, 39 TOO NARROW, 39 UNSUPPORTED, 4 TOO WIDE. Only about one band in
five is right as written. The engine's measured value sits inside the evidence or corrected band in 90 rows, partly
in 31 and uncertain in 13. In 75 rows it is a real miss.

### (a) Bands most likely wrong, ranked (with what depends on each)

1. **ATLS heart-rate bands per haemorrhage class: queue s2, s4 class III, s4 class IV, t17a HR and SBP (rows 57–61).**
   These copy the 2008 ATLS table. Registry data give HR 86/90/96/97 across base-deficit classes I–IV (Mutschler 2013
   Crit Care). Only 9.3 % of patients fit the ATLS combination (Mutschler 2013 Resuscitation), and relative
   bradycardia appears beyond ~30 % loss (Schadt & Ludbrook 1991). Miller 10e ch. 62 p. 2001 itself warns that the
   classes are a teaching construct. All five measured values fit the evidence.
   *Depends on it:*
   - brief §4.9 checks 2 and 4
   - tables §7 17a, and the 17b β-blocked contrast (HR 80–95), which collapses once 17a is re-based
   - research/23 R-01/R-02 and research/03 §8.5
   - any baroreflex or humoral gain tuned toward these HR targets
2. **PE hypoxaemia on oxygen: S9 SaO2 < 90 at FiO2 0.5, Q15 SaO2 ≤ 92 at FiO2 0.5, t12 SpO2 85–92 on FiO2 1.0
   (rows 71, 73, 91).** The room-air PaO2 of massive PE has been applied at FiO2 0.5–1.0. The MIGET data show low
   V/Q plus a low mixed-venous PO2, with little early shunt, so oxygen corrects most of it. The cited H5 sources contain
   no SpO2. **Raising the PE shunt to meet these bands would teach the wrong mechanism.**
   *Depends on it:* tables §2 H5, §7 12 and §18 (PE shunt +0.10); owner question Q15; RS13. The PE haemodynamic bands
   (rows 44, 51, 52, 63) are mis-sized as well: CVP ≥ 15 is above the measured RVEDP of 11.5 ± 4.9 (Miller & Sutton
   1970); MAP < 65 should be SBP < 90; and the mPAP band is read on the systolic channel.
3. **The FU-6 fentanyl-induction apnoea bands outrank sourced synergy** (`resp-induction.test.ts`: fentanyl 2 µg/kg +
   propofol, apnoea 60–240 s; remifentanil ≥ 90 s; tagged "[ENG, D5; Q-FU6-1]"). They are not an audit row because
   they pass, but they forced D15b's α = 0. That is why the RIGHT propofol–remifentanil synergy band (row 5,
   Nieuwenhuijs 2003) fails, and it bears on rows 142, 145 and 162. See the note below.
   *Depends on it:* the synergy α, the Bailey fit VENT_ALPHA_BENZO, and HEMO_SYN_MAX.
4. **Fever under GA: sepsis and thyroid storm core 38.5–41 °C at 60–90 min (rows 134, 135).** At 1 MAC desflurane,
   peak core is 37.2 ± 1.0 °C against 38.6 awake (Negishi 1998), and awake fever peaks at 5–8 h, not 90 min. The
   tables' values are set points or presentation values. Both measured values are afebrile, as the evidence predicts.
   *Depends on it:* ruling R-3 (A8, the 120 W heat source, withdrawn; this evidence argues against reviving it), owner
   question Q7, research/14 E11 (ET-12, ET-13a, ET-26a, ET-28), and the thyroid.ts header.
5. **Post-PVC potentiation SBP +8–15 (row 50).** The band reverses its own source. Sinnecker 2014 says potentiation is
   *enhanced* in heart failure, and Voss 2002 measured 9.8 % in controls vs 48.7 % in DCM. The quantity measured is
   pulse amplitude, not SBP.
   *Depends on it:* PESP_MAX 0.5, gate NR-1 and ruling R45(a). FU-2 item 3's arterial C(P) trials moved five
   calibrated bands chasing this target.
6. **Labetalol 10 mg ΔMAP ratio 0.2–0.8 (row 14).** The band contradicts its own source. Inada 1989 found labetalol
   10 mg prevents the tachycardia but not the hypertension. The engine's MAP 0.96 / HR 0.64 matches the source.
   *Depends on it:* DI-08 and R51 addendum 25.
7. **Nitroprusside 1 µg/kg/min: SVR −30–50 % (row 175, [ENG]).** The label starts nitroprusside at 0.3 µg/kg/min
   and titrates to 10. Abdulatif 1994 needed 2.1–7.25 µg/kg/min for a 25–30 % pressure fall. The band compresses the
   whole titration range into its bottom tenth. The D13 row's `svr emax −0.6` was fitted to exactly this band (its
   steady state is the −30 % edge), so **the engine is now about twice too strong at a starting rate**. Correcting the
   band means weakening the engine, not strengthening it.
   *Depends on it:* the HFrEF nitroprusside arm (FU-7 Task 17 Step 4a; row 151), CM-06e, the tables §7 H2
   mitral-regurgitation line "SVR −25 %", and the offset case.
8. **Sugammadex HR fall: 15–30 % at 16 mg/kg and < 5 % at 4 mg/kg (rows 168, 169).** The 16 mg/kg band is
   UNSUPPORTED; the plan itself says "[ENG: no incidence-vs-dose source exists]". It turns a rare vagal event into the
   mean response. Fassoulaki's RCT at 2/4/16 mg/kg found no HR difference. A cohort of 359,414 (BJA 2025) found a
   ≥ 20 % fall in 9.8 % of administrations, the same rate as neostigmine. The 16 mg/kg test PASSES at 20.5 %, so it
   is a **hidden miss** (`interactions-misc.test.ts:27`). Both bands sit on one linear PK row, so this unsupported band
   is what forces the correct 4 mg/kg band (row 169) to fail at 13.4 %.
   *Depends on it:* DI-45, tables §5d sugammadex rows, FU-7 Task 12 Step 6's `hr` emax −0.25 / ec50 12.
9. **Arrest capnography, four bands.** All four measured values are inside the corrected bands.
   - EtCO2 < 5 mmHg at 30 s of no flow (rows 17, 37): no source gives a time. Washout gives 8–15 mmHg at 30 s; keep
     ≤ 6 at 60 s.
   - R39-2's CPR band 17–23 (rows 18, 28, 38 / queue g3): its definition is a minutes 1–10 mean at 10 × 500, but it is
     applied at +2 min and to an unventilated window.
   - The devices section's floor of 10 mmHg on every CPR sample (row 181): this contradicts Falk's ~7.6 mmHg.
   *Depends on it:* research/03 §4.4, research/26 T3 (whose "grade A" rests on a secondary reading of Falk), W22, the
   FU-8 OQ2 ruling, FU-7.1 Q9, and the alveolar-washout mechanism.
10. **Paradis CoPP 15–25 "throughout" (rows 21, 25).** Paradis's 15 is the ROSC threshold for *maximal* CPP, and 25.6 ±
   7.7 is the mean maximum in the ROSC group, not a ceiling. Proposed: 10–30 without a vasopressor, and maximum ≥ 15
   with adrenaline.
   *Depends on it:* research/20 DV-02a, CPP_ROSC 15 (correct as a threshold), the F1 "≤ 25" addition, and plan D19.
11. **MH EtCO2 "40 → 60 by 10 min" (rows 132, 141, 147).** There is no human time course: tables §7 check 21 cites web
   pages, so DI-65 cites the tables (a circular source), and the band is absolute against an assumed baseline of 40.
   Queue t21 was measured on a pre-FU-4 tree (see the stale-queue note). The drug-guard rig shows no rise at all, which
   is an engine problem whatever the band.
   *Depends on it:* tables §7 21, Q43 and the MH severity-1 ramp. The dantrolene HR band (row 133) assumes cooling the
   rig lacks.
12. **Warm sepsis CO 7–9 / SVR 500–700 with no fluid given (rows 46, 47).** The tables' column is "warm
    (resuscitated)", and the hyperdynamic state depends on fluid (Dellinger 5e ch. 22 p. 293). The measured CO 5.0 and
    SVR 861 fit the unresuscitated state.
    *Depends on it:* tables §5e WK_R0 ×0.4–0.55, §7 check 16, Q-7e-7, Q55, and the "baroreflex × vasoResp / septic
    RVR" engine requests written to chase this band.
13. **Esmolol 0.5 mg/kg: HR −10–20 % (row 176; research/14 DI-07).** This is a mis-citation: tables §6.2's
   "−10–20 %" is the contractility entry, not the HR entry. The table's own HR rule gives about −5 % for a 0.5 mg/kg
   load, and the engine's 6.5 % fits. DI-07's TOO WEAK grade therefore rests on a band that does not exist.
   *Depends on it:* DI-07, DI-M4, CM-04d, CM-14c and CM-15b, the esmolol EC50 (150 vs 250) calibration item, and the
   neuro section's esmolol 1 mg/kg row (15).
14. **Amiodarone 150 mg: AF 130 slows 20–30 % at 10–13 min (row 163, [ENG]).** The band takes data from
   300–450 mg at 30 min to hours (Hofmann 450 mg −38 % at 30 min; Delle Karth 300 mg; Siu median 7 h) and applies it
   to 150 mg at 10 min. The tables' own amiodarone line says HR −10 %. The engine's 14.0 % fits a dose-matched 5–20 %.
   *Depends on it:* Q-FU2-9 (amiodarone AV-node strength), the AV-nodal Emax 0.3, which a calibration pass would
   otherwise be told to raise, and DI-13a (row 157, the related ROSC band).
15. **Dobutamine 5 µg/kg/min: CO +20–40 % (row 164).** The band takes 10 µg/kg/min data and applies it at 5. At
   5 µg/kg/min the human data show an SV rise with a flat HR (Pellikka, Ahonen); +58 % appears only at 10 (Klein).
   The engine's +13.6 % fits the dose-matched band. Check 20's CO +20–40 % (rows 129, 130) needs the same dose check.
   *Depends on it:* CM-06d (HFrEF 20–45 %, used as the guard that blocked the EC50 re-fit), the dobutamine EC50 7 /
   Emax +80 %, FU-2's β venous term (fitted while chasing this band), and research/19 C9.
16. **Residual block and recovery after rocuronium.**
    - Queue t25 (row 16): it borrows the TOFR 0.9 endpoint for breathing.
    - The awake-rig VT < 0.75 band (row 6).
    - Underdosed sugammadex (row 4): the scenario is outside Eleveld's dose pair.
    *Depends on it:* Q-FU6-4, D21, E-FU6-10, tables §4.6 uaCollapse and §7 25.
17. **Volatile potentiation of rocuronium (rows 1–3).** EC50 × 0.67 at 1 MAC, and DI-51's +25–80 % duration target, are
    taken from 1.25–1.5 MAC dose data (Bock 2000; Lowry 1998).
    *Depends on it:* VOL_NMB_K, which was fitted to DI-51 (FU-7 Task 14). The engine's +48 % on DI-51 is then the real
    error. The Mg band (row 160, ceiling +90 % against Czarnetzki's +35 %) belongs to the same family of over-wide NMB
    prolongation bands.
18. **Rebreathing FiCO2 8: PaCO2/EtCO2 +6–10 at 20 min (rows 78, 89).** The band exceeds the +8 ceiling physics allows
    at fixed VA, and its floor needs ~75 % CO2-store equilibration where Chen 2004 shows ~50 % at 20 min. Proposed:
    +3–8.
    *Depends on it:* owner ruling Q5 (2026-10-10), which recorded a miss of 6 × 10⁻⁵ against this floor. FU-8 B4 and
    FU-7.1 B3 have moved EtCO2 back and forth around it.
19. **Ventilator-link SpO2 bands (rows 111–113).** The ARDS PEEP 5 → 15 band (SpO2 ≥ +5 in 1–4 min) was fitted to the
    interim recruitment curve retired at V.1. The oedema rows ask SpO2 to rise ≥ 2 from SaO2 98.7, which is
    impossible.
    *Depends on it:* the V.1 review rulings 2 and 3, E-V1-2, NR-3, and the catalogue §6 "PEEP up" signature.
20. **Lung-signature bands that contradict their own presets (rows 101, 104, 106, 107, 108).**
    - Pneumonia SpO2 88–93 against the preset's own shunt band.
    - OLV and endobronchial Crs: "×0.5 lung" applied to the whole system.
    - CF SpO2 88–94: a severe-disease number on the moderate grade.
    - Neonatal RDS shunt 0.2–0.4 on the adult rig.
    *Depends on it:* the catalogue §11, §22/§23, §26 and R22 entries; Q79 (halving HPV to chase the pneumonia number
    would break its shunt band).
21. **Pregnancy apnoea 2.5–4.5 min (rows 79, 81).** This is a misreading of McClelland 2008 (4 min 52 s), and the
    engine's 4.82 sits at the source median. The Edmark ±20 % bands (rows 92–94) are no wider than the trial SD.
    **Do not refit the O2 store or atelectasis** to these.
    *Depends on it:* tables §7 23 and 24, §4.1 (Q34), research/09 §7 Q5, and validation t23.
22. **Saline 2 L: Cl +6–8, BE −3 to −5 (rows 116, 122).** Annex D3 has no citation. Scheingraber 1999 scales to Cl
    +4–6 and BE −1.5 to −3.5, and both measured values fit.
    *Depends on it:* research/22 BF-01a/BF-14, the tables' D3/O3 oracle rows, and fu9-leak's saline arm.
23. **Renal and fluid kinetics targets (rows 124, 126, 129–131).**
    - The ATLS urine target ≥ 0.5 mL/kg/h is used as a physiological prediction after RL.
    - Mannitol +20–30 mOsm/kg: the measured human peak is +18 (Rudehill 1993).
    - Check 20's UOP numbers are the plan's own fit.
    - IAP 25 → UOP < 0.1 has no source; dogs become anuric at 40.
    *Depends on it:* the vNh washout τ 45 min, which is tuned jointly with check 20; RH-03, RH-05, RH-06 and RH-08; the
    brain osmotherapy gain.
24. **Drug-layer doses and endpoints.**
    - Morphine 10 mg MAP −8–25 % (row 150) uses 0.3–1 mg/kg data.
    - Ephedrine × 0.3–0.7 under β-blockade (row 155) contradicts the engine's own DI-05 row.
    - Amiodarone ROSC ≥ 1.2 × (row 157) reads ARREST's survival to admission as shock success.
    - Verapamil in pre-excited AF (row 149) assumes a deterministic outcome where Gulamhusein 1982 shows a subset effect.
    - The thiopental and etomidate onset bands (rows 152, 153) are slower than Miller's own 10–30 s.
    *Depends on it:* T6.3, DI-42, DI-04a, DI-13a and DI-15, HIST_SVR, tables §1.5 (Q18), and the shock-state factor.
25. **Further Drugs (B) bands.**
   - The lidocaine band "never converts", i.e. exactly 0 of 200 (row 166), is an absolute zero placed on a continuous,
     occupancy-scaled hazard. 1.5 % over 20 min is within the noise of spontaneous VT termination; use a small
     ceiling such as ≤ 5 %. *Depends on it:* L_LIDO_VT and the occupancy EC50 of 3 µg/mL.
   - The desflurane surge band (row 172) asks it to fire within 60 s of a DIAL step at FGF 4. Every human study stepped
     the delivered concentration at high flow, and the first-exposure size (HR 57 → 119; Weiskopf 1994b) is 2–4 times
     the 8–35 bpm band. The engine never fires, so this is also a real mechanism gap.
   - The dexmedetomidine early SVR rise (row 174) is rate-dependent; a 10-min load should not show it.
   - The second-gas upper edge of +0.15 (row 170) is the arterial magnitude applied to an end-tidal endpoint.
   - The morphine histamine index ≥ 0.4 (row 173) and ephedrine tachyphylaxis × 0.7 (row 165) have no source.
26. **Monitor bands with the wrong reference (rows 183, 185, 186, 188, 189).**
    - "Never valid SpO2 at MAP < 30": oximeters fail at a radial systolic of 25 ± 12 (Severinghaus 1990).
    - NIBP AF bias is judged against the beat-mean rather than the line.
    - HeartMate 3 PI 3–5, where Abbott gives 1–10.
    - Oximeter lag ≤ 20 s from the arterial SaO2, where the brief's own chain sums to 22–25 s.
    *Depends on it:* FU-7.1 Q10, DV-16d and DV-17, and RS2.

**Hidden or understated misses** (the band passes, or understates the gap):
- Propofol depth-index nadir 50 (row 7; human BIS 29 ± 10).
- Anaemia CO (row 115): the band of ≥ +30 % is lax. The evidence says +66–84 %, so the engine's +25 % misses by more
  than the test reports.
- DI-51's engine +48 % (row 3), which is above the evidence.
- Sugammadex 16 mg/kg passes at a 20.5 % HR fall (row 168); the evidence shows no mean HR fall.
- Nitroprusside (row 175): the engine is about twice too strong, having been fitted to an [ENG] band.

### (b) Known misses that are probably NOT misses (the band is wrong; the engine may already be right)

**Measured value inside the evidence or corrected band (90 rows):** 1–4, 6, 8–11, 13, 14, 16–18, 21, 25, 29, 30, 38,
46, 47, 51–54, 57–62, 64–68, 71, 73, 74, 78, 79, 83, 89, 91–94, 97, 101, 103, 104, 106, 107, 111, 112, 114, 116, 121,
122, 124, 126, 128, 130, 132, 134, 137–140, 146, 150, 152, 153, 155, 158, 163, 164, 166, 173, 174, 176, 180–184, 186, 188–190.

The largest groups:
- ATLS HR and SBP: 57–61.
- PE oxygenation and haemodynamics: 51, 52, 71, 73, 91.
- Arrest and CPR EtCO2: 17, 18, 29, 38, 181.
- Paradis CoPP: 21, 25.
- Fever under GA: 134.
- Warm sepsis: 46, 47.
- Labetalol, t25 and residual block: 14, 16, 6.
- Volatile NMB: 1–3.
- Rebreathing: 78, 89.
- Pregnancy and Edmark apnoea: 79, 92–94.
- Saline: 116, 122.
- Lung signatures: 101, 103, 104, 106, 107.
- Induction onset: 152, 153.
- Amiodarone, dobutamine, lidocaine and esmolol (Drugs B): 163, 164, 166, 176.

**Partly inside (31 rows):** 15, 24, 28, 41, 49, 77, 80, 81, 96, 98, 102, 110, 113, 119, 120, 125, 133, 135, 141, 143,
144, 148, 149, 157, 159, 165, 167, 170, 179, 185, 187.

**Uncertain (13 rows):** 12, 23, 36, 37, 42, 69, 76, 82, 85, 86, 108, 118, 177. Rows 36 and 37 carry title values
from a pre-washout unit model.

**Real misses against bands that are RIGHT or corrected** (the calibration pass should target these):
- Propofol–remifentanil synergy (row 5).
- Asphyxial PEA decay and the monitor showing bradycardia before arrest (19, 20).
- CPR coronary-flow share and adult CPR coRatio (27, 32).
- Tension pneumothorax recovery (33).
- Pulsus in tamponade (40).
- Neonatal CO (48).
- The propofol MAP fall (55, 70) and HR rise (56).
- PA pressure in PE (63).
- Induction shunt (72).
- Child VT (75).
- Sevoflurane RR (84).
- Permissive-hypercapnia PAP (95).
- COPD GOLD 1 FEV1 (109).
- IAP 14 urine (123).
- Insulin nadir (136).
- Fentanyl 5 µg/kg apnoea and the Bailey population (142, 145).
- Ketamine onset (154).
- Adrenaline reflex bradycardia (156).
- Magnesium (160).
- The desflurane surge (161, 172) and the Billard ratio (162).
- Sugammadex 4 mg/kg HR (169).
- The N2O concentration effect (171; a declared v1 scope limit).
- Nitroprusside (175): the miss runs the other way, with the engine too strong for the evidence band.
- The MANUAL CVP under PEEP (178).
- The V1/V2 morphology bins (191, 195–197, 201–204), V3-delay (206, 207) and V5-PR (208).

### (c) Calibration-queue items whose expected values lack a source

| Queue row(s) | Audit rows | What is unsourced |
|---|---|---|
| t25 rr-back | 16 | [ENG], contradicted by the tables' own §7 25 line |
| t12 pe/etco2 "35 → 20–25 within 3 breaths" | 90 | only a web range in research/03 |
| t12 pe-late/papm, "never > 45" | 63 | [ENG]; the mPAP band is read on the systolic channel |
| t12 pe-late/spo2 85–92 on FiO2 1.0 | 91 | the cited sources contain no SpO2 |
| t21 "EtCO2 40 → 60 by 10 min" | 141 | web pages, no human time course |
| g3 | 38 | R39-2 is a project ruling. Its q 0.5 → 12 and q 1.2 → 29 points are interpolations, and it is applied outside its definition |
| Oracle O1 map/rr/cvp, O2 hr-delta/map-delta/lactate, O4 map-delta | 64–70 | "±x % of Pulse" is not a physiological source. O2's arms are not volume-matched, and Pulse's own +48 bpm at class II is itself unphysiological |
| Morphology V1 per-bin "±20 ms of the VitalDB median" | 191, 201–203 | [ENG] fit target (supported by the recordings) |
| V1-lit 150–220 ms | 192–194 | a derived [ENG] estimate; Miller 10e p. 1011 gives 120–180 ms |
| V2 per-bin ±20 ms | 195–197, 204 | [ENG] fit target, consistent with Weissler |
| V3-shape r ≥ 0.8 | 198–200 | [ENG], and an amplitude criterion applied to a shape metric |
| V2-kind ±0.3 | 205 | [ENG]; its upper limit of 1.23 cannot fail from above |
| V5-PR · vitaldb | 209 | a labelling artefact of the validate.ts pseudo-window |

**Queue rows that are sourced but contradicted by better evidence:** the ATLS rows (57–61), t14 PAWP (62: the tables'
own "within 5" criterion is met) and the Edmark ±20 % rows (92–94, no wider than the trial SD).

**Queue rows that are sourced and right:** s3 MAP and HR (55, 56; Claeys 1988), V3-delay (206, 207) and V5-PR · all
(208).

**Unsourced test bands outside the queue:** these are listed in each section's (c). The most consequential are:
- the exsanguination pulse within 4 min (26)
- S4b, S5 and S6a (41–43)
- the asthma Pa–Et gap and the tension Ppeak (98, 114)
- check 20's UOP numbers (129, 130)
- the catecholamine reserve (138)
- RS7, RS8 and RS10 (85–87)
- the stimulus VE +20 % (76)
- the KCl band's locator (117)
- nitroprusside at 1 µg/kg/min (175)
- sugammadex at 16 mg/kg (168)
- amiodarone AF rate control (163)
- the desflurane trigger and size (172)
- the morphine histamine index (173)
- ephedrine tachyphylaxis (165)

### Stale-queue finding

`docs/validation/calibration-queue.md` was produced by `pnpm validate` on 2026-09-27 at commit `7bcf992`. It has not
been regenerated since: the file's last change is `d7163db7`, also 2026-09-27. That is **before FU-4 merged**
(`e81e53fc`, 2026-09-29), and 107 merge commits separate `7bcf992` from the audited `26e78308`. FU-4 cut the
ventilator dead space from 204 mL + fit to 127 mL + fit, which raised VA at 12 × 500 from about 3.5 to about
4.5 L/min. Every queue value that depends on alveolar ventilation is therefore stale. Examples:
- t21 MH EtCO2 reads 73.5 in the queue (+31.2 from a high baseline), while the same rig family now measures +18
  (rows 132, 141).
- t12 EtCO2 and SpO2.
- g3 CPR EtCO2, which predates the FU-7.1 washout.
- The t24 apnoea times.

The ATLS, PE haemodynamic and oracle values also predate FU-6 through FU-10. Regenerate the queue on the current tree
before the calibration pass, so that no constant is fitted to a September measurement.

### Citation errors found

- **research/26 T3 #4, "Garnett 1987, n = 35, 15 ± 4 mmHg":** the figure is Sanders 1989 (PMID 2761035). The same
  misattribution is in the `arrest-etco2.test.ts` header comment, and it recurs in rows 18, 28, 36, 38 and 181. Falk's
  "over one minute" is not in the Falk abstract (rows 17, 37).
- **`fu71-kcl.test.ts:50` (row 117):** the band cites "Miller 10e ch. 46" (a coagulation chapter) and Co-Existing
  Disease 8e ch. 23 (haematology). Neither has the figure. The number is Kruse 1990's hypokalaemic, post-infusion
  increment. The end-of-infusion peak is 0.5 ± 0.3 (Hamill 1991), or about 0.34 per 20 mmol in normal subjects
  (Rosa 1980).
- **`fu8-cpr-brain.test.ts:55` (row 31):** "Meaney 2013" has no cerebral-flow figure in its abstract (its text repeats the range; fix-citations 2026-10-11); the source is Kern, Niemann &
  Steen 2007 ("at best 30 % to 40 %").
- **`drug-layer.test.ts:211` (row 154):** "M10 Table 21.1" is a PK table; ketamine's 30–60 s onset is on Miller 10e
  p. 537. **Rows 152 and 153:** the thiopental and etomidate onsets are hung on "one arm–brain circulation", but
  Miller's numeric figure is 10–30 s (Table 21.4 p. 527).
- **Row 13, the incision band:** it is cited to Shribman 1987, a laryngoscopy study.
- **Row 50, post-PVC potentiation:** brief §4.8 and research/03 reverse their own source, Sinnecker 2014.
- **Row 139, dexamethasone "+2–4 mmol/L at 4–8 h (PADDI)":** this figure is not in PADDI, whose diabetic substudy gives
  +1.86 at 8–12 h.
- **Row 137:** the "3–4 h" vasoconstriction onset attributed to Sessler 2000 was not found in that source.
- **`interactions-misc.test.ts:203` / DI-07 (row 176):** the esmolol HR band cites the contractility column of
  tables §6.2.
- **`interactions-misc.test.ts:90` (row 170) and `drug-layer.test.ts:368` (row 159):** both cite Epstein 1964, which
  is Miller's animal reference, and Miller "ch. 19" instead of ch. 18.
- **research/12 RH-06's "Chiu 1995 UO −60 %":** Chiu 1995 measured renal cortical flow in pigs, not urine output (row 123).

### The FU-6 fentanyl-apnoea bands should give way to the sourced synergy

Two sections reached this conclusion independently of the neuro section's flag (row 5).

- **Respiration A (section (c)):** the `resp-induction.test.ts` bands are tagged "[ENG, D5; Q-FU6-1]" and have no
  source. These are fentanyl 2 µg/kg + propofol apnoea 60–240 s, and remifentanil ≥ 90 s.
- **Drugs A (rows 142–145, section (c)):** it calls these bands "an engine choice", yet they "currently outrank
  grade-A synergy evidence". It also finds that Bailey 1990's hypoxaemia with fentanyl alone and the pair's 6/12
  apnoea are real misses against RIGHT bands (rows 142, 145).

D15b set the propofol–remifentanil synergy α to 0 because the FU-6 induction bands failed at α > 0. As a result, the
RIGHT, grade-A band (Nieuwenhuijs 2003: "strikingly synergistic", row 5) is a known miss, held there to protect
unsourced engine choices. Under R45, the owner ruling these sections supply evidence for is:
1. Restore α > 0 to meet the synergy band.
2. Re-derive the FU-6 induction-apnoea bands from the sourced synergy and from Bailey, rather than the reverse.
3. Re-check the Bailey and Billard fits (VENT_ALPHA_BENZO, HEMO_SYN_MAX; rows 144, 145, 162) afterwards.
