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
