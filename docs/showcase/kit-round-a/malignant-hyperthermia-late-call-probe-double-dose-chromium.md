### Malignant hyperthermia, late call (kit round) (chromium, kit 56f3761f, load avg 4.29–5.7)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"H3S86Y","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** ART M high +2"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 4.29 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.3 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 4.57 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 51.5 | 06:53 | 8 | earlySigns | 86 | 105/70 (80) | 99 | 46 | 12 | 4.32 | state Early signs (not called: the late path) |
| 65 | 12:20 | 8 | earlySigns | 109 | 115/84 (93) | 99 | 61 | 12 | 5 | after the 5-min fast-forward |
| 78.5 | 17:49 | 8 | earlySigns | 140 | 120/88 (98) | 98 | 79 | 12 | 5.7 | after the 5-min fast-forward |
| 86 | 18:48 | 8 | established | 144 | 119/87 (98) | 98 | 81 | 12 | 5.4 | state Established MH |
| 89.1 | 19:01 | 4 | triggerOff | 146 | 120/90 (99) | 98 | 79 | 24 | 5.21 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 95.2 | 19:25 | 4 | treating | 136 | 115/85 (94) | 99 | 56 | 30 | 4.95 | press **Dantrolene 2.5 mg/kg** |
| 97.6 | 19:35 | 4 | treating | 136 | 115/86 (94) | 99 | 54 | 29 | 5.04 | press **Cool: 2 L saline at room temperature** |
| 99.2 | 19:41 | 4 | treating | 137 | 117/87 (95) | 99 | 54 | 29 | 5.04 | press **Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose** |
| 101.8 | 19:52 | 4 | treating | 136 | 120/89 (98) | 99 | 54 | 28 | 5.04 | press **Sodium bicarbonate 1 mmol/kg** |
| 102.3 | 19:52 | 4 | treating | 136 | 120/89 (98) | 99 | 54 | 28 | 4.71 | paused before span 3 |
| 116.2 | 25:07 | 4 | treating | 99 | 157/104 (121) | 99 | 47 | 25 | 4.45 | after the 5-min fast-forward |
| 214.6 | 31:41 | 4 | normoventilated | 88 | 162/100 (121) | 99 | 39 | 20 | 4.71 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 214.6 | 31:41 | 4 | normoventilated | 88 | 162/100 (121) | 99 | 39 | 20 | 4.71 | end of the path |
| 218.7 | 31:58 | 4 | normoventilated | 86 | 161/99 (120) | 99 | 43 | 19 | 4.57 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 induction · 04:06 surgery · 06:52 earlySigns · 18:47 established · 18:58 triggerOff · 19:19 dantrolene · 19:21 treating · 19:22 dantrolene · 19:24 treating · 19:28 cooling · 19:30 treating · 19:32 cooling · 19:34 treating · 19:38 potassium · 19:40 treating · 19:49 bicarbonate · 19:51 treating · 26:44 recovering · 31:38 normoventilated

Alarms raised: 08:22 ETCO2 TOO HIGH · 19:03 RR TOO HIGH · 19:09 AWRR TOO HIGH · 21:11 ART DIA TOO HIGH · 22:01 ART MEAN TOO HIGH · 23:11 ART SYS TOO HIGH · 30:10 ART DIA TOO HIGH · 30:30 ART DIA TOO HIGH · 30:40 ART DIA TOO HIGH · 31:10 ART DIA TOO HIGH · 32:01 **ABPs 162>160 · 32:01 **ABPm 120>110 · 32:01 **ABPd 99>90 · 32:32 **ABPs 161>160 · 32:42 **ABPs 161>160 · 32:52 **ABPs 161>160 · 33:22 **ABPs 161>160 · 33:50 **ABPs 163>160

Spans: {"min":5,"via":"button","clockBefore":"06:53","fromT":413.5,"endT":713.5,"wallS":10.5,"speedBefore":8,"speedAfter":8,"rateAfter3s":8.1,"banner":"Fast-forwarded 5 min, 06:53 → 11:53. During it: ETCO2 TOO HIGH 08:22.","alarms":["08:22 ETCO2 TOO HIGH"],"load1":5}

{"min":5,"via":"button","clockBefore":"12:20","fromT":741.2,"endT":1041.2,"wallS":10.6,"speedBefore":8,"speedAfter":8,"rateAfter3s":8,"banner":"Fast-forwarded 5 min, 12:21 → 17:21. During it: no alarms.","alarms":[],"load1":5.7}

{"min":5,"via":"button","clockBefore":"19:53","fromT":1194.1,"endT":1494.1,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 19:54 → 24:54. During it: ART DIA TOO HIGH 21:11, ART MEAN TOO HIGH 22:01, ART SYS TOO HIGH 23:11.","alarms":["21:11 ART DIA TOO HIGH","22:01 ART MEAN TOO HIGH","23:11 ART SYS TOO HIGH"],"load1":4.45}

Measures: {"earlySignsAt":"06:53","callAfterEstablishedS":9.7,"mh":{"path":"late","callAt":"18:58","etco2FirstBelow40":"31:37","etco2Below40AfterCallMin":12.6,"recoveringAt":"26:44","recoveringAfterCallMin":7.8,"normoventilated":true,"fastForwards":3,"hrMaxAfterCall":146,"etco2MaxAfterCall":81,"minSystolicAfterCall":113.5}}

Debrief: {"objectives":[{"status":"not met","text":"✗ Not met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 12 min 06 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 18:58; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (18:58 → 19:19; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LCalcium chloride 10 % or Insulin + dextrose 2 min 27 s after K⁺ above 5.5 mmol/L (17:12 → 19:38; within 5 min 00 s asked)."},{"status":"met","text":"✓ Met Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgThe state \"Ventilation back to 12 × 500, O₂ 100 %\" 1 s after EtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (31:37 → 31:38; within 5 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"81 mmHg at 18:36","Highest T1 / T2":"38.8 °C at 22:04","Labs (the model): last (lowest–highest)":"K⁺ 4.5 mmol/L (4.2–5.8) · Lactate 5.1 mmol/L (1.0–5.9) · pH 7.36 (7.09–7.41) · Glucose 8.8 mmol/L (5.6–17.0) · Tcore 38.4 °C (36.7–38.8)"},"timelineRows":58,"minuteRows":32}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":216.3,"maxMismatchSoFar":[0,0,0]},{"label":"after Saadat-style → Philips-style","atWallS":217.2,"maxMismatchSoFar":[0,0,0]},{"label":"30 s after the style change","atWallS":247.2,"maxMismatchSoFar":[0,0,0]}],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":494,"compared":402,"commonTiles":10,"holdSamples":0,"status":{"synced":494},"resyncs":6,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":494,"compared":402,"commonTiles":10,"holdSamples":0,"status":{"synced":494},"resyncs":6,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":494,"compared":402,"commonTiles":10,"holdSamples":0,"status":{"synced":494},"resyncs":6,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
