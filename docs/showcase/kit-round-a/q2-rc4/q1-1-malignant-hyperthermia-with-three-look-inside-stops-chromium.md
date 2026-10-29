### Q1 1 malignant hyperthermia with three look-inside stops (chromium, kit 0c4b396f, load avg 2.55–4.68)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"4GYE2H","alarmButtonAtOpen":"No alarms","phonesAtStart":[{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0}],"alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 00:06 | 8 | awake | 69 | 122/80 (93) | – | – | – | 4.2 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 6.7 | 00:39 | 8 | premedicated | 70 | 123/80 (94) | 96 | 37 | 14 | 3.87 | press **Premedicate: midazolam 2 mg, fentanyl 100 µg** |
| 10.4 | 01:08 | 8 | preoxygenated | 65 | 120/76 (90) | 96 | 38 | 13 | 3.87 | press **Preoxygenate: 100 % O₂ by face mask** |
| 33 | 04:10 | 8 | induced | 63 | 117/73 (86) | 99 | 46 | 6 | 4.05 | press **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** |
| 40.5 | 05:09 | 8 | intubated | 69 | 96/59 (69) | 99 | 49 | 4 | 4.04 | press **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** |
| 47.9 | 06:08 | 8 | surgery | 70 | 96/58 (68) | 99 | 42 | 12 | 3.86 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 58.6 | 07:33 | 4 | surgery | 76 | 105/65 (75) | 99 | 45 | 12 | 3.43 | 7:30 ×4: watch the CO₂ tile |
| 68.8 | 08:12 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 3.3 | state Early signs: Pause (stop 1) |
| 115.7 | 08:12 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 2.74 | stop 1: back on the Instructor, still paused |
| 116 | 08:12 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 2.74 | objective ticked: ^Name malignant hyperthermia |
| 117.3 | 08:17 | 4 | triggerOff | 77 | 107/66 (77) | 99 | 46 | 14 | 2.84 | press **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** |
| 122.5 | 08:38 | 4 | treating | 78 | 108/68 (79) | 99 | 39 | 20 | 3.49 | press **Dantrolene 2.5 mg/kg** |
| 122.5 | 08:38 | 4 | treating | 78 | 108/68 (79) | 99 | 39 | 20 | 3.49 | EtCO₂ below 40 |
| 136 | 13:52 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 3.34 | after the 5-min fast-forward |
| 136.4 | 13:52 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 3.34 | span 1 ended: Pause (stop 2) |
| 198.1 | 13:52 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 3.51 | stop 2: back on the Instructor, still paused |
| 199.4 | 13:57 | 4 | normoventilated | 80 | 104/65 (76) | 99 | 42 | 22 | 3.51 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 213.1 | 19:11 | 4 | normoventilated | 89 | 98/66 (75) | 99 | 65 | 12 | 3.3 | after the 5-min fast-forward |
| 213.6 | 19:12 | 4 | normoventilated | 89 | 99/66 (75) | 99 | 65 | 12 | 3.3 | span 2 ended: Pause (stop 3), before the second dose |
| 264.1 | 19:12 | 4 | normoventilated | 89 | 99/66 (75) | 99 | 65 | 12 | 2.55 | stop 3: back on the Instructor, still paused |
| 265.4 | 19:17 | 4 | treating | 88 | 99/66 (75) | 99 | 64 | 12 | 2.55 | press **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** |
| 278.9 | 24:30 | 4 | recovering | 70 | 94/57 (67) | 99 | 41 | 20 | 3.44 | after the 5-min fast-forward |
| 279.6 | 24:31 | 4 | recovering | 70 | 94/57 (67) | 99 | 41 | 20 | 3.44 | end of the case: Pause (do not press ventilation back) |

States: 00:01 awake · 00:33 premedicated · 01:02 preoxygenated · 04:04 induced · 05:03 intubated · 06:02 surgery · 08:12 earlySigns · 08:14 triggerOff · 08:35 dantrolene · 08:37 treating · 09:37 recovering · 13:54 normoventilated · 19:14 dantroleneAgain · 19:16 treating · 23:39 recovering

Alarms raised: 02:40 RR TOO LOW · 03:00 RR TOO LOW · 03:11 ETCO2 TOO LOW · 04:26 RR TOO LOW · 04:37 RR TOO LOW · 04:39 ETCO2 TOO LOW · 04:50 ETCO2 TOO LOW · 04:50 CO2 APNEA · 05:08 RR TOO LOW · 05:08 AWRR TOO LOW · 05:34 NIBP SYS TOO LOW · 05:34 NIBP DIA TOO LOW · 14:28 ETCO2 TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"08:38","fromT":518.3,"endT":818.3,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4.1,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":3.34}

{"min":5,"via":"button","clockBefore":"13:58","fromT":838.3,"endT":1138.3,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min ETCO2 TOO HIGH 14:28","alarms":["14:28 ETCO2 TOO HIGH"],"load1":3.3}

{"min":5,"via":"button","clockBefore":"19:17","fromT":1157.2,"endT":1457.2,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":3.44}

Measures: {"wallLoadToEndS":279.6,"debriefReadWallS":5.3,"mhStops":{"states":[{"t":1.4,"id":"awake"},{"t":33.5,"id":"premedicated"},{"t":62.4,"id":"preoxygenated"},{"t":244.1,"id":"induced"},{"t":303.2,"id":"intubated"},{"t":362.2,"id":"surgery"},{"t":492.1,"id":"earlySigns"},{"t":494.2,"id":"triggerOff"},{"t":515.1,"id":"dantrolene"},{"t":517.1,"id":"treating"},{"t":577.7,"id":"recovering"},{"t":834,"id":"normoventilated"},{"t":1154.2,"id":"dantroleneAgain"},{"t":1156.2,"id":"treating"},{"t":1419.4,"id":"recovering"}],"inducedAt":"04:03","surgeryAt":"06:02","earlySignsAt":"08:12","earlyAfterSuxS":248.8,"callAt":"08:14","callAfterEarlyS":1.8,"dantroleneAt":"08:34","etco2Below40At":"08:38","normoAt":"13:53","etco2Above45AfterNormoAt":"14:07","dose2At":"19:13","dose2AfterAbove45S":306.8,"etco2AtDose2":65,"etco2PerMinuteAfterNormo":"+0 40 · +1 53 · +2 56 · +3 59 · +4 62 · +5 64","etco2PerMinuteAfterDose2":"+0 65 · +1 50 · +2 48 · +3 46 · +4 44 · +5 42","stopClocks":["08:12","13:52","19:12"]}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name malignant hyperthermia from the monitor: EtCO₂ rising at unchanged ventilation when it should be falling (42 → 45; without MH it settles 36–39) with a rising heart rate (64 → 80, blunted by fentanyl) (instructor-assessed)Observed by the instructor at 08:12."},{"status":"met","mark":"observed","text":"✓ Observed Call the MH crisis (stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ past 45 mmHg at unchanged ventilation) 2 s of 2 min 00 sThe state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 2 s after the state \"Early signs: EtCO₂ rising at unchanged ventilation, heart rate rising\" (08:12 → 08:14; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Give dantrolene 2.5 mg/kg within 300 s of calling the crisis 21 s of 5 min 00 sDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (08:14 → 08:34; within 5 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed The EtCO₂ is climbing back at normal ventilation: the MH is not controlled — second dose of dantrolene 2.5 mg/kg and hyperventilate again (20 × 600, O₂ 100 %)Dantrolene after the state \"Ventilation back to 12 × 500, O₂ 100 %\" at 19:13"},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","mark":"observed","text":"✓ Observed Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 13:53, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (08:37 → 10:37)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"62 mmHg at 05:25","Highest EtCO₂":"65 mmHg at 19:07","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"13 s (04:50 → 05:03)","Labs (the model): last (lowest–highest)":"K⁺ 5.0 mmol/L (4.2–5.0) · Lactate 3.6 mmol/L (1.0–3.6) · pH 7.33 (7.18–7.41) · Glucose 6.6 mmol/L (5.6–6.6) · Tcore 36.4 °C (36.4–36.8)"},"timelineRows":63,"minuteRows":25}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":3,"worst":{"param":"NIBP","forS":3,"instructorFirst":"56","phoneFirst":"24","instructorNow":"62","phoneNow":"70","atWallS":40.1},"samples":564,"compared":164,"commonTiles":10,"sameNumberOtherMarkSamples":97,"holdSamples":0,"status":{"synced":564},"resyncs":5,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"NIBP","forS":3,"instructorFirst":"56","phoneFirst":"28","instructorNow":"62","phoneNow":"70","atWallS":40.1},"samples":564,"compared":164,"commonTiles":10,"sameNumberOtherMarkSamples":101,"holdSamples":0,"status":{"synced":564},"resyncs":5,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"NIBP","forS":3,"instructorFirst":"56","phoneFirst":"24","instructorNow":"62","phoneNow":"70","atWallS":40.1},"samples":564,"compared":164,"commonTiles":10,"sameNumberOtherMarkSamples":99,"holdSamples":0,"status":{"synced":564},"resyncs":5,"lagS":0.1}]}

Notes: 

Errors: none
