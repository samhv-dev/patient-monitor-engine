# 46. The sources behind validation cells C, E and F (s9 EtCO2 after VF, t16 septic MAP, t17b β-blocked haemorrhage)

Brief 78, 7 Nov 2026. Research only: no code, test or band changes. The engine values quoted here come from PR #327
(branch fix-validation-gating-rows; probes run on main `3f44820a`; CI validation 2 Nov on `079d485`). I did not run new
probes. "[ENG]" marks a derivation or an engine construct, not a measurement. "UNVERIFIED" marks a claim whose full text I
could not open; for those I quote only what the abstract or the page says.

## Verdicts for the owner (one paragraph per cell)

**C. s9, displayed EtCO2 after VF without CPR (row: < 5 mmHg within 30 s; engine: displayed 83 s, true 72 s).** No
source gives a 30-s time. The three primary measurements, all with ventilation continued and no compressions, give only
the end point: humans, 1.4 → 0.4 % (about 10 → 3 mmHg; Falk 1988); pigs, 4.0 → < 0.7 % (about 28 → 5 mmHg; Gudipati
1988); pigs, "immediately" to about 24 % of control (Trevino 1985). None of the abstracts gives the seconds, and I could
not open the full texts. Falk's "≈ 3 mmHg within one minute" comes from a secondary summary (UNVERIFIED). Without a
measured time course, the time is set by mass balance. Once pulmonary blood flow stops, alveolar CO2 washes out
exponentially with τ = V_lung / V̇A. For this rig (12 × 500 mL, dead space ≈ 150 mL, FRC 2.2–2.8 L with PEEP 5), τ is
31–40 s. From the measured baseline of 37.6 mmHg, the true end-tidal value goes below 5 mmHg at ln(37.6/5) · τ =
63–81 s [ENG, from Miller 10e FRC data]. **The cell the sources support:** true breath-by-breath EtCO2 < 5 mmHg at
2.0 τ ± one breath, which is 60–80 s on this rig, with ventilation continued and no CPR (human end point ≈ 3 mmHg, Falk).
The displayed value should trail the true value by no more than the analyser's transport delay plus one breath
(Miller 10e p. 1164: rise time 10–400 ms; mainstream analysers have no delay). **Engine:** the true value passes (72 s).
The displayed value (83 s, 11 s, more than two breaths behind true) fails that tolerance. The missing mechanism is not
physiological. The displayed number carries a lag that no source gives (the ≈ 70-s smoothing from PR #25, which brief 76
examines). The washout itself is right.

**E. t16, septic MAP 55–60 in the 300–600 s window (engine 87.7).** The 55–60 value has support, but not at that time.
Septic shock is defined as a state: MAP < 65 mmHg needing a vasopressor after volume repletion (Sepsis-3, Singer 2016),
or shock as MAP < 60–65 (Dellinger 5e Table 22.1, p. 293). Measured onsets take hours, not minutes. In anaesthetised,
ventilated sheep with faecal peritonitis on maintenance fluid only (2 mL/kg/h), the control MAP was 55 [49–60] mmHg at
4 h (Garcia 2023). With fluid resuscitation and no vasopressor, MAP < 65 arrived at 14 [11–20] h (Hosokawa 2018). In
humans, endotoxin gives a hyperdynamic state at 3 h (Suffredini 1989). **The cell the sources support:** a state row.
Established warm septic shock, unresuscitated, anaesthetised and ventilated: MAP 49–60 (Garcia control IQR, n = 8). It
is read once the condition is fully established, not 5–10 min after a ramp starts. The engine's onset (τ = 600 s, so
55–60 is reached at 50–65 min) is itself an [ENG] compression, already about 4× faster than the fastest source. No
source supports any onset in minutes. **Engine:** at the 300–600 s point it fails, but no source asks for that point. On
the state row the engine's unresuscitated MAP of 55–60 at 50–65 min would pass. That is a corrected time axis taken from
the sources, not a widened band. Still open: the "resuscitated" premise of the tables' column. After 30 mL/kg and no
vasopressor, Sepsis-3 requires MAP to stay < 65. That has never been probed, and it is the test of whether the
vasoplegia is strong enough to count as septic shock. The owner rules whether scenario time must be real time. If it
must, the onset has to slow to hours, and the window moves with it.

**F. t17b, β-blocked class III bleed, SBP 65–80 (engine 104; unblocked arm 98).** No source supports a fixed lower SBP
band for the β-blocked bleeder, and the evidence is split by setting. *No difference at the same loss:* anaesthetised
dogs at 25 % loss with propranolol or practolol (Prys-Roberts 1976: MAP, CO and LV power changes "essentially similar");
isoflurane-anaesthetised dogs with propranolol (Horan 1977a: hypovolaemia response "not modified"); anaesthetised sheep
on esmolol at 20 mL/kg (Kinsky 2008: "Hemodynamics … similar with the exception of heart rate"); and chronic β-blocker
users in a trauma cohort (Evans 2014, n = 645: no effect on SBP or DBP; blood loss unknown). *More hypotensive:*
conscious humans given IV propranolol under graded LBNP, a validated haemorrhage analogue (Bjurstedt 1977: MAP fall
"exaggerated"; Convertino 2000: LBNP tolerance −39 to −50 %, CO lower with SV unchanged at presyncope); and enflurane-
or trichloroethylene-anaesthetised dogs (Horan 1977b; Roberts 1976). The t17b patient is awake (no anaesthetic in the
scenario; 17a expects spontaneous RR 28–35), so the conscious human data apply most closely. They are acute
non-selective blockade, though, while the engine models chronic cardioselective blockade. What every source agrees on is
the HR: the reflex tachycardia is about halved (Bjurstedt: 48 % of control), arrival HR is lower (Havens 2012: 83 vs 89;
tachycardia 14 vs 30 %), and HR is the only variable that differs in the anaesthetised animal series. **The rows the
evidence supports:** (1) an HR-response row, ΔHR(17b) ≤ 0.5–0.6 × ΔHR(17a) at the same bleed, or the audit's
HR(17a) − HR(17b) ≥ 15 bpm; (2) a direction row for the awake case only, SBP(17b) ≤ SBP(17a) at the same loss, with no
magnitude, because none is measured at 35 %; (3) no absolute 65–80 band. **Engine:** row 1 passes (ΔHR 64 vs 94).
Row 2 fails (104 > 98). The missing mechanism is the one the human LBNP data show: SV is preload-fixed and does not
grow when HR falls, so CO falls with HR (CO = HR × SV). In the engine the slower β-blocked heart keeps the same output,
which means SV rises about 45 % at a CVP below 1 mmHg. The human data contradict that.

---

## C. s9: EtCO2 after witnessed VF, ventilation continued, no CPR

### The row and its history
`packages/validation/suites/sanity/sanity-docs.ts`, s9-witnessed-vf: 12 × 500 mL, FiO2 0.5, PEEP 5; `setRhythm vfCoarse`
at 60 s; `etco2-gone` = `numeric:etco2` firstTBelow 5 within 0–30 s, labelled "Stage 3: EtCO2 < 5 within 30 s".
research/03 §4.4 states "decays over a few breaths to < 5 mmHg" ([ENG, anchored], no source for 30 s), and §8.8 gives
"washout τ ≈ FRC/VA ≈ 0.5 min". Target audit 30, rows for s9 and arrest-etco2, graded the row MIS-SPECIFIED. PR #327 §C
measured τ ≈ 35 s, true EtCO2 37.6 → 6.9 at +60 s and < 5 at +72 s, and the displayed value 9 at +60 s and < 5 at +83 s.

### Primary sources
| source | species, n | conditions | value | time |
|---|---|---|---|---|
| Falk JL, Rackow EC, Weil MH. NEJM 1988;318:607-11. PMID 3125432 | human, 13 arrests in 10 ICU patients | mechanically ventilated; before compressions | "decreased from a mean (± SD) of 1.4 ± 0.9 to 0.4 ± 0.4 percent after the onset of cardiac arrest" (about 10.0 → 2.9 mmHg at 713 mmHg dry barometric); 1.0 ± 0.5 % during compressions | not in the abstract; "within 1 min" is a secondary reading (UNVERIFIED) |
| Gudipati CV, Weil MH, Bisera J, et al. Circulation 1988;77:234-9. PMID 3121209 | pig | "mechanically ventilated porcine preparation of ventricular fibrillation" | "onset of fibrillation was associated with a rapid decrease in ETCO2 from 4.0 ± 0.2% to less than 0.7 ± 0.2%" (≈ 28.5 → < 5 mmHg); 1.9 ± 0.3 % with compression | "rapid", seconds not in the abstract (full text 403) |
| Trevino RP, Bisera J, Weil MH, et al. Crit Care Med 1985;13:910-1. PMID 3931980 | pig | VF, before precordial compression | "decreased to approximately 24% of control levels, immediately after cardiac arrest and before precordial compression" | "immediately" |
| Weil MH, Bisera J, Trevino RP, Rackow EC. Crit Care Med 1985;13:907-9. PMID 3931979 | 19 minipigs | before arrest and during CPR | ETCO2 linear in CO | — (mechanism: ETCO2 tracks pulmonary blood flow) |
| Isserles SA, Breen PH. Anesth Analg 1991;73:808-14. PMID 1952183 | 5 dogs | vena-cava balloons, constant ventilation | % fall in PETCO2 vs % fall in CO, slope 0.73, R² 0.89; part of the fall is alveolar dead space; venous CO2 build-up later restores delivery | — (mechanism) |
| Miller 10e ch. 37, Fig. 37.12, p. 1167 | — | trended capnogram | "(C) sudden interruption in pulmonary perfusion, as may occur during cardiac arrest" | qualitative: an exponential fall over breaths |

### The time course, from mass balance [ENG]
With pulmonary flow at zero and ventilation unchanged, the lung gas behaves as a mixing chamber washed by V̇A:
PA(t) = PA(0)·e^(−t/τ), τ = V_lung / V̇A. The lung tissue and stagnant capillary-blood CO2 stores add to V_lung, so they
can only lengthen τ.
- V̇A = 12 × (500 − 150) = 4.2 L/min (70 mL/s).
- V_lung at end-expiration: FRC "usually 3 to 4 L" (Miller 10e ch. 12, p. 254), lower supine and with obesity;
  "Anesthesia reduces FRC by about 0.5 L" / "approximately 20%" (ch. 12, pp. 255, 264). An anaesthetised supine adult
  has ≈ 2.0–2.5 L, +0.2–0.3 L at PEEP 5: V_lung ≈ 2.2–2.8 L.
- τ = 31–40 s. Time to < 5 mmHg from 37.6: ln(7.52) = 2.02 τ = 63–81 s. Value at +30 s: 37.6·e^(−30/τ) = 14–17 mmHg.
  Value at +60 s: 5.5–7.5 mmHg.
- The audit's per-breath version (each breath dilutes by 450/(2400 + 450)) gives the same result: ≈ 12 at 30 s,
  ≈ 4 at 60 s at 12 × 600.

"< 5 at 30 s" would need τ ≤ 15 s, which means V̇A ≥ 9 L/min on this lung. No source in this list supports it.

### The cell as the sources support it
- **Value / window:** true breath-by-breath EtCO2 < 5 mmHg at ln(EtCO2₀/5) · τ, with τ = V_lung/V̇A from the rig, ± one
  breath. On this rig that is 60–80 s after VF onset. End point ≈ 3 mmHg (Falk, human) if the rig runs long enough.
- **Conditions:** ventilation continued at the pre-arrest settings; no compressions; adult, anaesthetised, supine.
- **Displayed value:** within the analyser transport delay plus one breath of the true end-tidal value. Rise time is
  10–400 ms; a mainstream analyser has no delay; a sidestream analyser has a transport delay of seconds (Miller 10e
  ch. 37, p. 1164).
- **Engine:** true value < 5 at +72 s, a **pass**. Displayed value < 5 at +83 s, a **fail** of the display tolerance
  (true + one 5-s breath + a few seconds ≈ ≤ 78 s). The washout physiology is right. The excess lag sits in the
  displayed-number pipeline (the PR #25 lag), which brief 76 is checking against real monitors. If that lag goes, the
  displayed row should pass on the same physiology.
- What the sources do not give: a measured human or animal EtCO2 time course in seconds after VF with ventilation
  continued. If one is found (the Gudipati or Falk full-text figures), it replaces the derivation.

---

## E. t16: septic shock, warm phase, MAP 55–60 at 300–600 s

### The row
s9's sibling `t16-septic-shock-warm`: `condition sepsis severity 1 phase warm` at t = 0; the 300–600 s segment asserts
MAP 55–60 and HR 115–130. The source is tables §7 16 ("warm: MAP 55–60, HR 115–130, CO 7–9 L/min … fluid 30 mL/kg →
MAP +5–10"), and the warm column of tables §5e is headed "Septic shock, warm (resuscitated)". In the engine the
condition ramps with τ = 600 s, so the 300–600 s window is stage 1.2–1.9 (PR #327 §E). With a 30-s onset, MAP at
5–10 min is 74. Unresuscitated, MAP reaches 55–60 only at 50–65 min (HR 128–134).

### Primary sources
| source | species, n | conditions | value | time after the insult |
|---|---|---|---|---|
| Garcia B, Su F, Dewachter L, et al. Crit Care 2023;27:458. doi 10.1186/s13054-023-04741-x, PMID 38001494, PMC10675855 | sheep 30–40 kg, n = 8 controls | faecal peritonitis 1.5 g/kg; sevoflurane + morphine, rocuronium; VC ventilation 8 mL/kg, PEEP 5; IV fluid 2 mL/kg/h only for the first 4 h (methods, full text) | control MAP "55 [49–60] mmHg" at T4 | 4 h |
| Hosokawa K, Su F, Taccone FS, et al. BMC Anesthesiol 2018;18:70. PMID 29921225 | sheep, n = 7 controls | faecal peritonitis; anaesthetised and ventilated; "fluid resuscitation but no vasopressors or antibiotics" | arterial hypotension onset | 14 [11–20] h |
| Suffredini AF, Fromm RE, Parker MM, et al. NEJM 1989;321:280-7. PMID 2664516 | healthy humans, n = 9 | E. coli endotoxin 4 ng/kg bolus | CI +53 %, HR +36 %, SVRI −46 % (MAP not in the abstract) | 3 h |
| Singer M, Deutschman CS, Seymour CW, et al. JAMA 2016;315:801-10. PMID 26903338 (Sepsis-3) | definition | after volume repletion | septic shock = "vasopressor requirement to maintain a mean arterial pressure of 65 mm Hg or greater and serum lactate level greater than 2 mmol/L … in the absence of hypovolemia" | a state |
| Dellinger 5e (2019) ch. 22, Table 22.1 + footnote, p. 293 | textbook | shock profiles | profiles "refer to patients … in shock (mean arterial blood pressure < 60–65 mm Hg)"; hyperdynamic state "usually depends on resuscitation with fluids; before such resuscitation, a hypodynamic circulation is typical" | a state |
| Dellinger 5e ch. 24, Box 24.1 and text, p. 324 | textbook | sepsis criteria | hypotension: "SBP < 90 mm Hg, MAP < 70, or an SBP decrease > 40"; the Sepsis-3 shock definition restated | a state |

### The cell as the sources support it
- **Value:** unresuscitated, anaesthetised, ventilated, established warm septic shock: MAP 49–60 mmHg (Garcia control
  IQR). After 30 mL/kg and no vasopressor: MAP < 65 (Sepsis-3; the tables' own "resuscitated" premise).
- **Window:** after the condition is fully established. None of the sources measures minutes. The fastest source gives
  MAP 55 at 4 h (sheep, maintenance fluid only), so a 300–600 s window after onset has no source. The engine's
  condition time constant (τ = 600 s) is an [ENG] compression of an onset the sources put at hours.
- **Engine:** 87.7 at 300–600 s, a **fail** of the present row, but that row's time has no source. On the state row
  (MAP 49–60 once the ramp has completed, e.g. ≥ 5 τ = 50 min), the engine's 55–60 at 50–65 min **would pass**. The
  resuscitated sub-row (MAP < 65 after 30 mL/kg, no pressor) has **not been measured**. If the engine rises above 65
  with fluid alone, the missing mechanism is vasoplegia strong enough to define shock: fluid-refractory loss of
  arteriolar tone. By definition that is the test of a septic-shock condition, not of sepsis.
- **For the owner:** if scenario time must be real time, the sources say the onset should take hours (4 h to MAP 55 in
  the fastest model). Then the window must sit hours after onset, or the scenario must start in the established state.
  Either way, a minutes-after-onset band has no source. (The CO/SVR rows in target audit rows 46/47 already make the
  same setting point: the 7–9 L/min and 500–700 dyn values are post-resuscitation.)
- Not opened: Garcia Fig. 2 (HR and MAP over time). The HR at T4 is therefore not quoted, and the HR 115–130 row is
  outside this cell.

---

## F. t17b: class III bleed (1750 mL / 10 min) on a chronic β-blocker, SBP 65–80

### The row and the engine
`t17b-class3-bb`: profile `betaBlocked`; bleed 1750 mL over 600 s from 60 s; window 900–1800 s: HR 80–95, SBP 65–80.
Tables §7 17b says "HR 80–95 (shock index < 1 despite shock), SBP 65–80 (hypotension comes earlier), CO lower than 17a";
§1.5 cites "BB-haem" (a Medscape overview) and [TXT]. Engine `betaBlocked` (`packages/engine-core/src/l2/circ/profile.ts`
case 'betaBlocked'): chronic cardioselective (metoprolol/bisoprolol class), β-occupancy 0.85, chronotropic gain ×0.2,
contractility gain ×0.5, HR rest 60. PR #327 §F, 900–1800 s: β-blocked HR 64, SBP 104, MAP 85, PP 28; unblocked (t17a)
HR 94, SBP 98, MAP 83, PP 23. CVP 0.75–0.86 mmHg in both arms. The patient is awake: there is no anaesthetic in either
scenario, and 17a expects spontaneous RR 28–35.

### Primary sources: same loss, with versus without β-blockade
| source | species, n | β-blocker (class, dose, acute/chronic) | anaesthesia | loss | finding |
|---|---|---|---|---|---|
| Prys-Roberts C, Roberts JG, Foëx P, et al. Anesthesiology 1976;45:326-9. PMID 9020 | dogs with 10-day MI, n = 15 | propranolol 0.3 mg/kg or practolol 2.0 mg/kg IV, acute | halothane–N2O | 25 % of blood volume, graded | changes in MAP, CO, peak LV power and LV minute work "essentially similar before and after beta-receptor blockade with either propranolol or practolol" |
| Horan BF, Prys-Roberts C, Roberts JG, et al. Br J Anaesth 1977;49:1179-87. PMID 588397 (1977a) | dogs, n = 6 | propranolol 0.3 mg/kg IV | isoflurane | induced hypovolaemia | "The haemodynamic response to hypovolaemia during isoflurane anaesthesia was not modified by propranolol" |
| Horan BF, Prys-Roberts C, Hamilton WK, Roberts JG. Br J Anaesth 1977;49:1189-97. PMID 588398 (1977b) | dogs, n = 7 | propranolol 0.3 mg/kg IV | enflurane | 20 % | "withdrawal of 20% of estimated blood volume was tolerated poorly" |
| Roberts JG, Foëx P, Clarke TN, et al. Br J Anaesth 1976;48:411-8. PMID 1276013 | dogs, 6 treated vs 5 controls | oral propranolol for 3 weeks (chronic) | halothane or trichloroethylene | haemorrhage + retransfusion | "satisfactory at all stages … except during trichloroethylene anaesthesia in the beta-blocked dogs when the response to blood loss was impaired severely" |
| Kinsky MP, Vaid SU, Vane LA, et al. Shock 2008;30:55-63. PMID 18323741 | sheep (splenectomised), 6 + 6 | esmolol 50–100 µg/kg/min (β1-selective), acute | anaesthetised (series 2) | 20 mL/kg | "Hemodynamics for both series were similar with the exception of heart rate"; esmolol raised fluid needs 67 vs 54 mL/kg |
| Jung YS, Cho WS, Suh GJ, et al. J Surg Res 2020;256:468-75. PMID 32798994 | pigs, 4 + 4 | esmolol titrated to HR −30 % | anaesthetised | 15 % and 30 % in 10-min steps | HR's diagnostic AUC fell (0.733 vs 0.864 at 30 %); PPV/PoPV unaffected; MAP values not in the abstract (UNVERIFIED) |
| Bjurstedt H, Rosenhamer G, Tydén G. Acta Physiol Scand 1977;99:353-60. PMID 15403 | healthy men, n = 8 | propranolol 0.25 mg/kg IV, acute, non-selective | conscious | LBNP −80 mmHg | "heart rate response to LBNP averaged 48% of that observed without blockade"; "the decrease in mean arterial pressure during LBNP was exaggerated by such blockade" |
| Convertino VA, Sather TM. Clin Auton Res 2000;10:327-36. PMID 11324988 | healthy men, n = 11 | propranolol, acute, non-selective | conscious | graded LBNP to presyncope | LBNP tolerance −50 % (high-tolerant) and −39 % (low-tolerant); "associated with reductions in cardiac output … without significant effects on stroke volume at presyncope"; the SVR rise was unaffected |
| Hinojosa-Laborde C, Shade RE, Muniz GW, et al. J Appl Physiol 2014;116:406-15. PMID 24356525 | baboons (sedated) | — | sedated | 6.25–25 % | validates LBNP as a haemorrhage analogue: LBNP −22/−41/−54/−71 mmHg ≈ 6.25/12.5/18.75/25 % loss; SV −50 % at 25 % |
| Evans DC, Khoo KM, Radulescu A, et al. J Emerg Trauma Shock 2014;7:305-9. PMID 25400393 | trauma patients > 45 y, n = 645 | chronic, any β-blocker (± CCB, ACE-i/ARB) | conscious, on arrival | unknown | "no effect on systolic and diastolic blood pressures from beta-blocker … use"; only triple therapy lowered HR |
| Havens JM, Carter C, Gu X, Rogers SO. Int J Surg 2012;10:518-21. doi 10.1016/j.ijsu.2012.08.004 | trauma, 76 deaths + 304 survivors | chronic pre-injury β-blocker | conscious, on arrival | unknown | HR 83 vs 89 (p 0.007); tachycardia 14.3 vs 29.7 %; bradycardia 7.1 vs 2.3 % (abstract, via the publisher's index page) |
| Miller 10e ch. 62, p. 2038 | textbook | — | — | — | β-blockers "may worsen traumatic shock by … blunting of compensatory responses" (no number) |
| Schadt JC, Ludbrook J. Am J Physiol 1991;260:H305-18. PMID 1671735 (via target audit 30, row 58) | review | — | conscious | ≈ 30 % | a second phase of "relative or absolute bradycardia" with a profound pressure fall: at 35 % both arms may be in it |

### What the evidence says
- **HR: consistent.** β-blockade about halves the reflex tachycardia (48 %, Bjurstedt). In anaesthetised animals it is
  the only variable that differs (Kinsky). On arrival it gives a smaller tachycardia and more bradycardia (Havens).
- **Pressure at the same loss: depends on the setting.** In anaesthetised dogs and sheep at 20–25 % loss there is no
  difference under halothane, isoflurane or esmolol. It is worse under enflurane and trichloroethylene, which are
  agent-specific myocardial depression. In conscious humans under acute non-selective blockade the MAP falls further and
  presyncope comes earlier, because CO falls with HR while SV is unchanged. In chronic users in trauma, arrival SBP is
  not different, but the blood loss is unmeasured and confounded.
- **No source measures 35 % loss with versus without β-blockade** in any species, and none measures chronic
  cardioselective blockade under a controlled bleed.
- **The tables' 65–80 band has no primary source.** Its premise, "hypotension comes earlier", is supported in direction
  only, for the conscious case, by the LBNP data, which stop at presyncope (≈ 25 % equivalent).

### The rows the evidence supports
1. **HR response row (strong):** at the same bleed, ΔHR(17b) ≤ 0.5–0.6 × ΔHR(17a) from each arm's own baseline
   (Bjurstedt 48 %), or the audit's absolute form, HR(17a) − HR(17b) ≥ 15 bpm. Engine: ΔHR 64 − 60 = +4 vs
   94 − ~70; HR 94 − 64 = 30. **Pass.**
2. **Direction row, awake patient only (moderate; acute non-selective human data):** SBP(17b) ≤ SBP(17a) and
   CO(17b) < CO(17a) at the same loss and time, with no magnitude band. Engine: SBP 104 vs 98, CO equal. **Fail.**
3. **Shock index:** SI(17b) < SI(17a) follows from rows 1 and 2. It is not an independent source; do not add it as a
   separate threshold.
4. **No absolute SBP 65–80 row.** If the owner wants an absolute anchor, the shared one is the 17a corrected band
   (target audit row 61: SBP 80–100 or ≤ 0.85 × baseline). Row 2 then places 17b at or below it.

### Engine against the evidence: the missing mechanism
In PR #327's measurement both arms sit at CVP 0.75–0.86 mmHg and give the same output, with HR 64 vs 94. That means the
β-blocked heart ejects about 47 % more per beat (94/64) from the same near-zero filling pressure, while its contractility
gain is halved. The conscious human data (Convertino 2000: SV unchanged at presyncope, CO lower; Bjurstedt 1977: larger
MAP fall) say that in an awake person, the lost tachycardia costs output: SV is set by preload, not by the filling time
the slower rate frees. So the engine's diastolic filling at very low CVP is too rate-sensitive, or its venous return is
set without reference to HR, or the two together let SV make up the lost rate. Which of these it is needs a probe of SV,
EDV and filling time in both arms. That probe is for a mechanism brief, not this one. The anaesthetised-animal data
(no pressure difference) do not excuse the engine here, because the scenario is awake. They would apply to an
anaesthetised variant.

---

## References

Textbooks (local PDFs under library/sources/):
- Miller's Anesthesia, 10th ed. (2025). Ch. 12 Respiratory Physiology and Pathophysiology, pp. 254–255, 264 (FRC 3–4 L;
  anaesthesia −0.5 L / ≈ 20 %). Ch. 37 Respiratory Monitoring, p. 1164 (rise time 10–400 ms; mainstream no delay) and
  Fig. 37.12, p. 1167 (trend capnogram in cardiac arrest). Ch. 62 Anesthesia for Trauma, p. 2038 (β-blockers blunt
  compensation).
- Dellinger RP, Parrillo JE (eds). Critical Care Medicine, 5th ed. (2019). Ch. 22 Shock, Table 22.1 and footnote,
  p. 293. Ch. 24 Severe Sepsis and Septic Shock, Box 24.1 and Table 24.1, p. 324.

Journal articles:
1. Falk JL, Rackow EC, Weil MH. End-tidal carbon dioxide concentration during cardiopulmonary resuscitation. N Engl J
   Med 1988;318:607-611. doi 10.1056/NEJM198803103181005. PMID 3125432.
2. Gudipati CV, Weil MH, Bisera J, Deshmukh HG, Rackow EC. Expired carbon dioxide: a noninvasive monitor of
   cardiopulmonary resuscitation. Circulation 1988;77:234-239. doi 10.1161/01.cir.77.1.234. PMID 3121209.
3. Trevino RP, Bisera J, Weil MH, Rackow EC, Grundler WG. End-tidal CO2 as a guide to successful cardiopulmonary
   resuscitation: a preliminary report. Crit Care Med 1985;13:910-911. doi 10.1097/00003246-198511000-00012. PMID 3931980.
4. Weil MH, Bisera J, Trevino RP, Rackow EC. Cardiac output and end-tidal carbon dioxide. Crit Care Med 1985;13:907-909.
   doi 10.1097/00003246-198511000-00011. PMID 3931979.
5. Isserles SA, Breen PH. Can changes in end-tidal PCO2 measure changes in cardiac output? Anesth Analg
   1991;73:808-814. doi 10.1213/00000539-199112000-00023. PMID 1952183.
6. Garcia B, Su F, Dewachter L, et al. Neutralization of extracellular histones by sodium-β-O-methyl cellobioside sulfate
   in septic shock. Crit Care 2023;27:458. doi 10.1186/s13054-023-04741-x. PMID 38001494. PMC10675855.
7. Hosokawa K, Su F, Taccone FS, Post EH, Creteur J, Vincent JL. Effects of acute ethanol intoxication in an ovine
   peritonitis model. BMC Anesthesiol 2018;18:70. doi 10.1186/s12871-018-0537-1. PMID 29921225.
8. Suffredini AF, Fromm RE, Parker MM, et al. The cardiovascular response of normal humans to the administration of
   endotoxin. N Engl J Med 1989;321:280-287. doi 10.1056/NEJM198908033210503. PMID 2664516.
9. Singer M, Deutschman CS, Seymour CW, et al. The Third International Consensus Definitions for Sepsis and Septic Shock
   (Sepsis-3). JAMA 2016;315:801-810. doi 10.1001/jama.2016.0287. PMID 26903338.
10. Prys-Roberts C, Roberts JG, Foëx P, Clarke TN, Bennett MJ, Ryder WA. Interaction of anesthesia, beta-receptor
    blockade, and blood loss in dogs with induced myocardial infarction. Anesthesiology 1976;45:326-329.
    doi 10.1097/00000542-197609000-00015. PMID 9020.
11. Horan BF, Prys-Roberts C, Roberts JG, Bennett MJ, Foëx P. Haemodynamic responses to isoflurane anaesthesia and
    hypovolaemia in the dog, and their modification by propranolol. Br J Anaesth 1977;49:1179-1187.
    doi 10.1093/bja/49.12.1179. PMID 588397.
12. Horan BF, Prys-Roberts C, Hamilton WK, Roberts JG. Haemodynamic responses to enflurane anaesthesia and hypovolaemia
    in the dog, and their modification by propranolol. Br J Anaesth 1977;49:1189-1197. doi 10.1093/bja/49.12.1189.
    PMID 588398.
13. Roberts JG, Foëx P, Clarke TN, Bennett MJ, Saner CA. Haemodynamic interactions of high-dose propranolol pretreatment
    and anaesthesia in the dog. III: The effects of haemorrhage during halothane and trichloroethylene anaesthesia. Br J
    Anaesth 1976;48:411-418. doi 10.1093/bja/48.5.411. PMID 1276013.
14. Kinsky MP, Vaid SU, Vane LA, Prough DS, Kramer GC. Effect of esmolol on fluid therapy in normovolemia and
    hypovolemia. Shock 2008;30:55-63. doi 10.1097/SHK.0b013e31815d1a85. PMID 18323741.
15. Jung YS, Cho WS, Suh GJ, et al. Pulse oximeter plethysmograph variation during hemorrhage in beta-blocker-treated
    swine. J Surg Res 2020;256:468-475. doi 10.1016/j.jss.2020.07.004. PMID 32798994.
16. Bjurstedt H, Rosenhamer G, Tydén G. Lower body negative pressure and effects of autonomic heart blockade on
    cardiovascular responses. Acta Physiol Scand 1977;99:353-360. doi 10.1111/j.1748-1716.1977.tb10388.x. PMID 15403.
17. Convertino VA, Sather TM. Effects of cholinergic and beta-adrenergic blockade on orthostatic tolerance in healthy
    subjects. Clin Auton Res 2000;10:327-336. doi 10.1007/BF02322256. PMID 11324988.
18. Convertino VA. Neurohumoral mechanisms associated with orthostasis: reaffirmation of the significant contribution of
    the heart rate response. Front Physiol 2014;5:236. doi 10.3389/fphys.2014.00236. PMID 25071585. (Fig. 6 restates
    ref. 17.)
19. Hinojosa-Laborde C, Shade RE, Muniz GW, et al. Validation of lower body negative pressure as an experimental model
    of hemorrhage. J Appl Physiol 2014;116:406-415. doi 10.1152/japplphysiol.00640.2013. PMID 24356525.
20. Evans DC, Khoo KM, Radulescu A, et al. Pre-injury beta blocker use does not affect the hyperdynamic response in
    older trauma patients. J Emerg Trauma Shock 2014;7:305-309. doi 10.4103/0974-2700.142766. PMID 25400393.
21. Havens JM, Carter C, Gu X, Rogers SO. Preinjury beta blocker usage does not affect the heart rate response to
    initial trauma resuscitation. Int J Surg 2012;10:518-521. doi 10.1016/j.ijsu.2012.08.004.
22. Schadt JC, Ludbrook J. Hemodynamic and neurohumoral responses to acute hypovolemia in conscious mammals. Am J
    Physiol 1991;260:H305-H318. PMID 1671735. (As cited in target audit 30, row 58; not re-read here.)

Method: abstracts through PubMed E-utilities and Europe PMC (no account, no e-mail parameter); full text through
Europe PMC for PMC10675855 and PMC4074989; the Havens abstract from the publisher-indexed UTMB research page; textbook
pages from the local PDFs (pdftotext). Not opened (publisher 403): the full texts of Falk 1988, Gudipati 1988,
Bjurstedt 1977 and Convertino 2000. Their figures may hold the time course (C) and the pressure values (F), and would
sharpen these rows.
