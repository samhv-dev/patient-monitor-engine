### Q1 1 malignant hyperthermia with three look-inside stops (webkit, kit 0c4b396f, load avg 2.19–3.91)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"JJBBFH","alarmButtonAtOpen":"No alarms","phonesAtStart":[{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0},{"hold":false,"status":"synced","resyncs":0}],"alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 00:06 | 8 | awake | 69 | 122/80 (93) | – | – | – | 3.17 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 6.8 | 00:39 | 8 | premedicated | 70 | 123/80 (94) | 96 | 37 | 14 | 3.56 | press **Premedicate: midazolam 2 mg, fentanyl 100 µg** |
| 10.4 | 01:08 | 8 | preoxygenated | 65 | 120/76 (90) | 96 | 38 | 13 | 3.91 | press **Preoxygenate: 100 % O₂ by face mask** |
| 32.9 | 04:08 | 8 | induced | 62 | 119/74 (87) | 99 | 46 | 6 | 3.2 | press **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** |
| 40.4 | 05:08 | 8 | intubated | 69 | 96/59 (69) | 99 | 49 | 4 | 2.94 | press **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** |
| 47.8 | 06:08 | 8 | surgery | 71 | 96/58 (68) | 99 | 42 | 12 | 2.86 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 58.6 | 07:33 | 4 | surgery | 76 | 105/65 (75) | 99 | 45 | 12 | 2.66 | 7:30 ×4: watch the CO₂ tile |
| 68.6 | 08:11 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 2.81 | state Early signs: Pause (stop 1) |
| 115.5 | 08:11 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 2.96 | stop 1: back on the Instructor, still paused |
| 115.9 | 08:11 | 4 | earlySigns | 79 | 107/67 (77) | 99 | 46 | 12 | 2.96 | objective ticked: ^Name malignant hyperthermia |
| 117.2 | 08:16 | 4 | triggerOff | 78 | 107/66 (77) | 99 | 46 | 14 | 2.96 | press **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** |
| 122.3 | 08:37 | 4 | treating | 78 | 108/67 (78) | 99 | 39 | 20 | 2.96 | press **Dantrolene 2.5 mg/kg** |
| 122.3 | 08:37 | 4 | treating | 78 | 108/67 (78) | 99 | 39 | 20 | 2.96 | EtCO₂ below 40 |
| 135.8 | 13:51 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 2.73 | after the 5-min fast-forward |
| 136.2 | 13:51 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 2.73 | span 1 ended: Pause (stop 2) |
| 197.8 | 13:51 | 4 | recovering | 81 | 104/66 (76) | 99 | 40 | 20 | 2.44 | stop 2: back on the Instructor, still paused |
| 199.1 | 13:56 | 4 | normoventilated | 79 | 104/65 (75) | 99 | 42 | 22 | 2.44 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 212.9 | 19:11 | 4 | normoventilated | 89 | 99/66 (75) | 99 | 65 | 12 | 2.46 | after the 5-min fast-forward |
| 213.3 | 19:11 | 4 | normoventilated | 89 | 99/66 (75) | 99 | 65 | 12 | 2.46 | span 2 ended: Pause (stop 3), before the second dose |
| 264 | 19:11 | 4 | normoventilated | 89 | 99/66 (75) | 99 | 65 | 12 | 2.19 | stop 3: back on the Instructor, still paused |
| 265.3 | 19:16 | 4 | treating | 88 | 99/65 (75) | 99 | 65 | 15 | 2.34 | press **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** |
| 278.7 | 24:30 | 4 | recovering | 69 | 93/57 (67) | 99 | 41 | 20 | 2.28 | after the 5-min fast-forward |
| 279.2 | 24:30 | 4 | recovering | 69 | 93/57 (67) | 99 | 41 | 20 | 2.28 | end of the case: Pause (do not press ventilation back) |

States: 00:01 awake · 00:33 premedicated · 01:02 preoxygenated · 04:02 induced · 05:02 intubated · 06:02 surgery · 08:10 earlySigns · 08:13 triggerOff · 08:34 dantrolene · 08:36 treating · 09:38 recovering · 13:53 normoventilated · 19:13 dantroleneAgain · 19:15 treating · 23:37 recovering

Alarms raised: 02:40 RR TOO LOW · 03:57 RR TOO LOW · 04:26 RR TOO LOW · 04:38 RR TOO LOW · 04:38 ETCO2 TOO LOW · 04:51 CO2 APNEA · 05:07 RR TOO LOW · 05:07 AWRR TOO LOW · 05:36 NIBP SYS TOO LOW · 14:27 ETCO2 TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"08:37","fromT":517.4,"endT":817.4,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":2.73}

{"min":5,"via":"button","clockBefore":"13:57","fromT":837.5,"endT":1137.5,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min ETCO2 TOO HIGH 14:27","alarms":["14:27 ETCO2 TOO HIGH"],"load1":2.46}

{"min":5,"via":"button","clockBefore":"19:16","fromT":1156.5,"endT":1456.5,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min No alarms","alarms":[],"load1":2.28}

Measures: {"wallLoadToEndS":279.2,"debriefReadWallS":5.2,"mhStops":{"states":[{"t":1.4,"id":"awake"},{"t":33.7,"id":"premedicated"},{"t":62.8,"id":"preoxygenated"},{"t":242.4,"id":"induced"},{"t":302.4,"id":"intubated"},{"t":362.3,"id":"surgery"},{"t":490.5,"id":"earlySigns"},{"t":493.4,"id":"triggerOff"},{"t":514.1,"id":"dantrolene"},{"t":516.3,"id":"treating"},{"t":578.1,"id":"recovering"},{"t":833,"id":"normoventilated"},{"t":1153.1,"id":"dantroleneAgain"},{"t":1155.5,"id":"treating"},{"t":1417.5,"id":"recovering"}],"inducedAt":"04:02","surgeryAt":"06:02","earlySignsAt":"08:11","earlyAfterSuxS":248.8,"callAt":"08:13","callAfterEarlyS":2,"dantroleneAt":"08:33","etco2Below40At":"08:37","normoAt":"13:53","etco2Above45AfterNormoAt":"14:06","dose2At":"19:13","dose2AfterAbove45S":307.1,"etco2AtDose2":65,"etco2PerMinuteAfterNormo":"+0 40 · +1 53 · +2 56 · +3 59 · +4 61 · +5 64","etco2PerMinuteAfterDose2":"+0 65 · +1 50 · +2 48 · +3 46 · +4 44 · +5 42","stopClocks":["08:11","13:51","19:11"]}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name malignant hyperthermia from the monitor: EtCO₂ rising at unchanged ventilation when it should be falling (42 → 45; without MH it settles 36–39) with a rising heart rate (64 → 80, blunted by fentanyl) (instructor-assessed)Observed by the instructor at 08:11."},{"status":"met","mark":"observed","text":"✓ Observed Call the MH crisis (stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ past 45 mmHg at unchanged ventilation) 3 s of 2 min 00 sThe state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 3 s after the state \"Early signs: EtCO₂ rising at unchanged ventilation, heart rate rising\" (08:10 → 08:13; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Give dantrolene 2.5 mg/kg within 300 s of calling the crisis 21 s of 5 min 00 sDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, charcoal filters, propofol 100 µg/kg/min, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (08:13 → 08:33; within 5 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed The EtCO₂ is climbing back at normal ventilation: the MH is not controlled — second dose of dantrolene 2.5 mg/kg and hyperventilate again (20 × 600, O₂ 100 %)Dantrolene after the state \"Ventilation back to 12 × 500, O₂ 100 %\" at 19:13"},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","mark":"observed","text":"✓ Observed Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 13:53, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (08:36 → 10:36)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"62 mmHg at 05:24","Highest EtCO₂":"65 mmHg at 19:11","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"11 s (04:51 → 05:02)","Labs (the model): last (lowest–highest)":"K⁺ 5.0 mmol/L (4.2–5.0) · Lactate 3.6 mmol/L (1.0–3.6) · pH 7.33 (7.18–7.41) · Glucose 6.6 mmol/L (5.6–6.6) · Tcore 36.4 °C (36.4–36.8)"},"timelineRows":60,"minuteRows":25}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":2.5,"worst":{"param":"AGENTS","forS":2.5,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":262.7},"samples":563,"compared":163,"commonTiles":10,"sameNumberOtherMarkSamples":118,"holdSamples":0,"status":{"synced":563},"resyncs":5,"lagS":0.1},{"maxMismatchS":2.5,"worst":{"param":"AGENTS","forS":2.5,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":262.7},"samples":563,"compared":163,"commonTiles":10,"sameNumberOtherMarkSamples":117,"holdSamples":0,"status":{"synced":563},"resyncs":5,"lagS":0.1},{"maxMismatchS":4,"worst":{"param":"NIBP","forS":4,"instructorFirst":"52","phoneFirst":"24","instructorNow":"38","phoneNow":"46","atWallS":41.1},"samples":563,"compared":163,"commonTiles":10,"sameNumberOtherMarkSamples":128,"holdSamples":0,"status":{"synced":563},"resyncs":5,"lagS":0.1}]}

Notes: 

Errors: none
