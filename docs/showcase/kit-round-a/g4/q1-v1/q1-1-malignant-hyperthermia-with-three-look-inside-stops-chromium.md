### Q1 1 malignant hyperthermia with three look-inside stops (chromium, kit da364762, load avg 2.68–4.97)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"CUNP2Z","alarmButtonAtOpen":"No alarms","phonesAtStart":[{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0}],"alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","panel":"teach","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.7 | 00:06 | 8 | awake | 69 | 122/80 (93) | – | – | – | 4.61 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 6.9 | 00:39 | 8 | preoxygenated | 70 | 123/81 (94) | 96 | 37 | 14 | 4.73 | press **Preoxygenate: 100 % O₂ by face mask** |
| 10.5 | 01:08 | 8 | premedicated | 68 | 122/80 (93) | 99 | 39 | 13 | 4.59 | press **Premedicate: midazolam 2 mg, fentanyl 100 µg** |
| 33.2 | 04:10 | 8 | induced | 65 | 119/75 (88) | 99 | 46 | 6 | 4.68 | press **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** |
| 40.4 | 05:08 | 8 | intubated | 68 | 95/58 (69) | 99 | 48 | 4 | 4.97 | press **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** |
| 48.1 | 06:09 | 8 | surgery | 70 | 96/59 (68) | 99 | 42 | 12 | 4.89 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 58.9 | 07:34 | 4 | surgery | 75 | 105/64 (75) | 99 | 44 | 12 | 4.6 | 7:30 ×4: watch the CO₂ tile |
| 70.6 | 08:19 | 4 | earlySigns | 78 | 107/67 (77) | 99 | 46 | 12 | 4.09 | state Early signs: Pause (stop 1) |
| 189.8 | 08:19 | 4 | earlySigns | 78 | 107/67 (77) | 99 | 46 | 12 | 3.85 | stop 1: back on the Instructor, still paused |
| 190.2 | 08:19 | 4 | earlySigns | 78 | 107/67 (77) | 99 | 46 | 12 | 3.85 | objective ticked: ^Name malignant hyperthermia |
| 191.5 | 08:24 | 4 | triggerOff | 78 | 107/66 (77) | 99 | 46 | 12 | 3.85 | press **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** |
| 196.7 | 08:45 | 4 | treating | 78 | 108/67 (78) | 99 | 40 | 20 | 4.1 | press **Dantrolene 2.5 mg/kg** |
| 197.2 | 08:47 | 4 | treating | 78 | 108/68 (79) | 99 | 39 | 20 | 4.1 | EtCO₂ below 40 |
| 210.7 | 14:01 | 4 | recovering | 81 | 103/66 (76) | 99 | 41 | 20 | 4.21 | after the 5-min fast-forward |
| 211.2 | 14:02 | 4 | recovering | 81 | 103/65 (75) | 99 | 41 | 20 | 4.21 | span 1 ended: Pause (stop 2) |
| 417.7 | 14:02 | 4 | recovering | 81 | 103/65 (75) | 99 | 41 | 20 | 3.86 | stop 2: back on the Instructor, still paused |
| 419 | 14:07 | 4 | normoventilated | 80 | 104/65 (75) | 99 | 41 | 23 | 3.86 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 432.9 | 19:22 | 4 | normoventilated | 89 | 99/66 (74) | 99 | 66 | 12 | 4.26 | after the 5-min fast-forward |
| 433.3 | 19:22 | 4 | normoventilated | 89 | 99/66 (74) | 99 | 66 | 12 | 4.26 | span 2 ended: Pause (stop 3), before the second dose |
| 556.2 | 19:22 | 4 | normoventilated | 89 | 99/66 (74) | 99 | 66 | 12 | 2.68 | stop 3: back on the Instructor, still paused |
| 557.5 | 19:27 | 4 | treating | 90 | 98/65 (74) | 99 | 66 | 14 | 2.68 | press **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** |
| 571 | 24:41 | 4 | recovering | 69 | 94/57 (67) | 99 | 42 | 20 | 2.99 | after the 5-min fast-forward |
| 571.4 | 24:41 | 4 | recovering | 69 | 94/57 (67) | 99 | 42 | 20 | 2.99 | end of the case: Pause (do not press ventilation back) |

States: 00:01 awake · 00:33 preoxygenated · 01:02 premedicated · 04:04 induced · 05:02 intubated · 06:04 surgery · 08:19 earlySigns · 08:21 triggerOff · 08:42 dantrolene · 08:44 treating · 09:47 recovering · 14:03 normoventilated · 19:24 dantroleneAgain · 19:26 treating · 24:11 recovering

Alarms raised: 04:24 RR TOO LOW · 04:35 RR TOO LOW · 04:47 ETCO2 TOO LOW · 04:48 CO2 APNEA · 05:07 RR TOO LOW · 05:07 AWRR TOO LOW · 14:33 ETCO2 TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"08:47","fromT":527.7,"endT":827.7,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":4.21}

{"min":5,"via":"button","clockBefore":"14:08","fromT":848.2,"endT":1148.2,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4.1,"banner":"Fast-forwarded 5 min ETCO2 TOO HIGH 14:33","alarms":["14:33 ETCO2 TOO HIGH"],"load1":4.26}

{"min":5,"via":"button","clockBefore":"19:27","fromT":1167.7,"endT":1467.7,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":2.99}

Measures: {"wallLoadToEndS":571.5,"debriefReadWallS":5.4,"mhStops":{"states":[{"t":1.4,"id":"awake"},{"t":33.3,"id":"preoxygenated"},{"t":62.4,"id":"premedicated"},{"t":244.1,"id":"induced"},{"t":302.4,"id":"intubated"},{"t":364,"id":"surgery"},{"t":499.5,"id":"earlySigns"},{"t":501.6,"id":"triggerOff"},{"t":522.3,"id":"dantrolene"},{"t":524.4,"id":"treating"},{"t":587.7,"id":"recovering"},{"t":843.8,"id":"normoventilated"},{"t":1164.3,"id":"dantroleneAgain"},{"t":1166.6,"id":"treating"},{"t":1451.5,"id":"recovering"}],"inducedAt":"04:04","surgeryAt":"06:03","earlySignsAt":"08:19","earlyAfterSuxS":255.6,"callAt":"08:21","callAfterEarlyS":1.9,"dantroleneAt":"08:42","etco2Below40At":"08:47","normoAt":"14:03","etco2Above45AfterNormoAt":"14:17","dose2At":"19:24","dose2AfterAbove45S":307.3,"etco2AtDose2":66,"etco2PerMinuteAfterNormo":"+0 41 · +1 54 · +2 57 · +3 60 · +4 63 · +5 65","etco2PerMinuteAfterDose2":"+0 66 · +1 51 · +2 49 · +3 47 · +4 45 · +5 42","stopClocks":["08:19","14:02","19:22"]}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name malignant hyperthermia from the monitor: EtCO₂ rising at unchanged ventilation when it should be falling (42 → 45; without MH it settles 36–39) with a rising heart rate (64 → 80, blunted by fentanyl) (instructor-assessed)Observed by the instructor at 08:19."},{"status":"met","mark":"observed","text":"✓ Observed Call the MH crisis (stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ past 45 mmHg at unchanged ventilation) 2 s of 2 min 00 sThe state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 2 s after the state \"Early signs: EtCO₂ rising at unchanged ventilation, heart rate rising\" (08:19 → 08:21; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Give dantrolene 2.5 mg/kg within 300 s of calling the crisis 21 s of 5 min 00 sDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (08:21 → 08:42; within 5 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed The EtCO₂ is climbing back at normal ventilation: the MH is not controlled — second dose of dantrolene 2.5 mg/kg and hyperventilate again (20 × 600, O₂ 100 %)Dantrolene after the state \"Ventilation back to 12 × 500, O₂ 100 %\" at 19:24"},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","mark":"observed","text":"✓ Observed Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 14:03, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (08:47 → 10:47)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"62 mmHg at 05:18","Highest EtCO₂":"66 mmHg at 19:07","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"14 s (04:48 → 05:02)","Labs (the model): last (lowest–highest)":"K⁺ 5.0 mmol/L (4.2–5.0) · Lactate 3.8 mmol/L (1.0–3.8) · pH 7.32 (7.17–7.41) · Glucose 6.6 mmol/L (5.6–6.6) · Tcore 36.6 °C (36.6–36.8)"},"timelineRows":57,"minuteRows":25}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":2,"worst":{"param":"AGENTS","forS":2,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":554.4},"samples":1145,"compared":169,"commonTiles":10,"sameNumberOtherMarkSamples":106,"holdSamples":0,"status":{"synced":1145},"resyncs":4,"lagS":0.1},{"maxMismatchS":2,"worst":{"param":"AGENTS","forS":2,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":554.4},"samples":1145,"compared":169,"commonTiles":10,"sameNumberOtherMarkSamples":114,"holdSamples":0,"status":{"synced":1145},"resyncs":4,"lagS":0.1},{"maxMismatchS":2,"worst":{"param":"AGENTS","forS":2,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":554.4},"samples":1145,"compared":169,"commonTiles":10,"sameNumberOtherMarkSamples":104,"holdSamples":0,"status":{"synced":1145},"resyncs":4,"lagS":0.1}]}

Notes: 

Errors: none
