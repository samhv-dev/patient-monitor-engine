### Malignant hyperthermia, late call (kit round) (chromium, kit 56f3761f, load avg 1.81–2.61)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"3V4YG2","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** ART M high +2"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 2.6 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.3 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 2.61 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 51.7 | 06:54 | 8 | earlySigns | 84 | 104/70 (80) | 99 | 46 | 12 | 2.42 | state Early signs (not called: the late path) |
| 65.1 | 12:21 | 8 | earlySigns | 109 | 116/84 (93) | 99 | 61 | 12 | 2.28 | after the 5-min fast-forward |
| 78.5 | 17:48 | 8 | earlySigns | 141 | 119/87 (97) | 98 | 79 | 12 | 2.14 | after the 5-min fast-forward |
| 85.8 | 18:47 | 8 | established | 143 | 119/88 (98) | 98 | 81 | 12 | 2.04 | state Established MH |
| 89 | 19:00 | 4 | triggerOff | 145 | 120/89 (99) | 98 | 81 | 19 | 1.88 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 94.2 | 19:21 | 4 | treating | 139 | 116/86 (94) | 98 | 57 | 30 | 1.81 | press **Dantrolene 2.5 mg/kg** |
| 96.5 | 19:30 | 4 | treating | 138 | 116/86 (94) | 99 | 55 | 29 | 1.81 | press **Cool: 2 L saline at room temperature** |
| 99.2 | 19:41 | 4 | treating | 137 | 118/87 (96) | 99 | 54 | 28 | 1.91 | press **Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose** |
| 101.8 | 19:51 | 4 | treating | 137 | 120/89 (98) | 99 | 54 | 28 | 1.83 | press **Sodium bicarbonate 1 mmol/kg** |
| 102.2 | 19:51 | 4 | treating | 137 | 120/89 (98) | 99 | 54 | 28 | 1.83 | paused before span 3 |
| 116.1 | 25:07 | 4 | treating | 112 | 143/102 (115) | 99 | 48 | 26 | 1.94 | after the 5-min fast-forward |
| 266.3 | 35:08 | 4 | recovering | 97 | 158/103 (121) | 99 | 41 | 20 | 2.12 | end of the path |
| 270.4 | 35:24 | 4 | recovering | 97 | 157/102 (121) | 99 | 41 | 20 | 2.11 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 induction · 04:05 surgery · 06:53 earlySigns · 18:47 established · 18:57 triggerOff · 19:18 dantrolene · 19:20 treating · 19:27 cooling · 19:30 treating · 19:38 potassium · 19:40 treating · 19:48 bicarbonate · 19:50 treating · 28:19 recovering

Alarms raised: 08:22 ETCO2 TOO HIGH · 19:04 RR TOO HIGH · 19:08 AWRR TOO HIGH · 22:20 ART DIA TOO HIGH · 24:20 T1 TOO HIGH · 25:41 ART MEAN TOO HIGH · 27:33 ART SYS TOO HIGH · 35:27 **ABPm 121>110 · 35:27 **ABPd 102>90 · 35:27 **Temp 39.2>39.0

Spans: {"min":5,"via":"button","clockBefore":"06:54","fromT":414.8,"endT":714.8,"wallS":10.4,"speedBefore":8,"speedAfter":8,"rateAfter3s":8.1,"banner":"Fast-forwarded 5 min, 06:54 → 11:54. During it: ETCO2 TOO HIGH 08:22.","alarms":["08:22 ETCO2 TOO HIGH"],"load1":2.28}

{"min":5,"via":"button","clockBefore":"12:21","fromT":741.9,"endT":1041.9,"wallS":10.4,"speedBefore":8,"speedAfter":8,"rateAfter3s":8.1,"banner":"Fast-forwarded 5 min, 12:21 → 17:21. During it: no alarms.","alarms":[],"load1":2.14}

{"min":5,"via":"button","clockBefore":"19:53","fromT":1193.5,"endT":1493.5,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 19:53 → 24:53. During it: ART DIA TOO HIGH 22:20, T1 TOO HIGH 24:20.","alarms":["22:20 ART DIA TOO HIGH","24:20 T1 TOO HIGH"],"load1":1.94}

Measures: {"earlySignsAt":"06:54","callAfterEstablishedS":9.7,"mh":{"path":"late","callAt":"18:57","etco2FirstBelow40":null,"etco2Below40AfterCallMin":null,"recoveringAt":"28:19","recoveringAfterCallMin":9.4,"normoventilated":false,"fastForwards":3,"hrMaxAfterCall":146,"etco2MaxAfterCall":81,"minSystolicAfterCall":113.4}}

Debrief: {"objectives":[{"status":"not met","text":"✗ Not met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 12 min 05 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 18:57; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (18:57 → 19:18; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LCalcium chloride 10 % or Insulin + dextrose 2 min 26 s after K⁺ above 5.5 mmol/L (17:12 → 19:37; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgEtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" did not happen."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"81 mmHg at 18:36","Highest T1 / T2":"39.3 °C at 28:37","Labs (the model): last (lowest–highest)":"K⁺ 4.7 mmol/L (4.2–5.8) · Lactate 6.5 mmol/L (1.0–6.8) · pH 7.34 (7.09–7.41) · Glucose 7.0 mmol/L (5.6–17.0) · Tcore 39.2 °C (36.7–39.3)"},"timelineRows":47,"minuteRows":36}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":268,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"after Saadat-style → Philips-style","atWallS":268.8,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"30 s after the style change","atWallS":298.9,"maxMismatchSoFar":[0.5,0.5,0.5]}],"perPhone":[{"maxMismatchS":0.5,"worst":{"param":"HR","forS":0.5,"instructorFirst":"78","phoneFirst":"80","instructorNow":"79","phoneNow":"77","atWallS":20.5},"samples":597,"compared":507,"commonTiles":10,"sameNumberOtherMarkSamples":272,"holdSamples":0,"status":{"synced":597},"resyncs":6,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"HR","forS":0.5,"instructorFirst":"78","phoneFirst":"80","instructorNow":"79","phoneNow":"77","atWallS":20.5},"samples":597,"compared":507,"commonTiles":10,"sameNumberOtherMarkSamples":280,"holdSamples":0,"status":{"synced":597},"resyncs":6,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"IBP1","forS":0.5,"instructorFirst":"120/88","phoneFirst":"118/88","instructorNow":"119/89","phoneNow":"121/90","atWallS":83.7},"samples":597,"compared":507,"commonTiles":10,"sameNumberOtherMarkSamples":266,"holdSamples":0,"status":{"synced":597},"resyncs":6,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
