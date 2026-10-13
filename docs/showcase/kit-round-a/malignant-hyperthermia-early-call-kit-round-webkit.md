### Malignant hyperthermia, early call (kit round) (webkit, kit 56f3761f, load avg 1.72–2.4)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"6MYP7U","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** ART M high +1"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 2.11 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.4 | 04:12 | 8 | surgery | 80 | 99/65 (75) | 99 | 40 | 12 | 1.72 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.5 | 06:35 | 4 | surgery | 82 | 103/69 (79) | 99 | 45 | 12 | 2.4 | 6:30 ×4: watch the CO2 tile |
| 53.8 | 06:53 | 4 | earlySigns | 86 | 105/70 (80) | 99 | 46 | 12 | 2.29 | state Early signs |
| 56.7 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 2.19 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.8 | 07:25 | 4 | treating | 85 | 105/71 (81) | 99 | 40 | 20 | 2.33 | press **Dantrolene 2.5 mg/kg** |
| 64.4 | 07:35 | 4 | treating | 85 | 105/71 (81) | 99 | 38 | 20 | 2.33 | press **Cool: 2 L saline at room temperature** |
| 79.5 | 12:55 | 4 | recovering | 83 | 136/90 (104) | 99 | 38 | 20 | 2.38 | after the 5-min fast-forward |
| 80 | 12:56 | 4 | recovering | 84 | 135/90 (104) | 99 | 38 | 20 | 2.38 | after span 1, paused |
| 94 | 18:11 | 4 | recovering | 84 | 149/97 (114) | 99 | 36 | 20 | 2.22 | after the 5-min fast-forward |
| 94.4 | 18:12 | 4 | recovering | 83 | 149/97 (114) | 99 | 36 | 20 | 2.22 | paused before span 3 |
| 95.7 | 18:17 | 4 | normoventilated | 82 | 149/96 (114) | 99 | 37 | 22 | 2.22 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 109.3 | 23:31 | 4 | normoventilated | 83 | 151/96 (114) | 99 | 42 | 18 | 2.02 | after the 5-min fast-forward |
| 109.3 | 23:31 | 4 | normoventilated | 83 | 151/96 (114) | 99 | 42 | 18 | 2.02 | end of the path |
| 113.3 | 23:47 | 4 | normoventilated | 82 | 150/95 (113) | 99 | 42 | 18 | 1.94 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 induction · 04:06 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:21 dantrolene · 07:24 treating · 07:32 cooling · 07:34 treating · 08:35 recovering · 18:13 normoventilated

Alarms raised: 22:40 ART SYS TOO HIGH · 23:50 **ABPm 114>110 · 23:50 **ABPd 96>90

Spans: {"min":5,"via":"button","clockBefore":"07:41","fromT":461.8,"endT":761.8,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 07:41 → 12:41. During it: no alarms.","alarms":[],"load1":2.38}

{"min":5,"via":"button","clockBefore":"12:57","fromT":777.8,"endT":1077.8,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 12:57 → 17:57. During it: no alarms.","alarms":[],"load1":2.22}

{"min":5,"via":"button","clockBefore":"18:17","fromT":1097.3,"endT":1397.3,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 18:17 → 23:17. During it: ART SYS TOO HIGH 22:40.","alarms":["22:40 ART SYS TOO HIGH"],"load1":2.02}

Measures: {"callAfterEarlySignsS":8.2,"mh":{"path":"early","callAt":"07:01","etco2FirstBelow40":"07:27","etco2Below40AfterCallMin":0.4,"recoveringAt":"08:35","recoveringAfterCallMin":1.6,"normoventilated":true,"fastForwards":3,"hrMaxAfterCall":87,"etco2MaxAfterCall":46,"minSystolicAfterCall":102.8}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 9 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:21; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"not met","text":"✗ Not met Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgThe state \"Ventilation back to 12 × 500, O₂ 100 %\" 10 min 47 s after EtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:27 → 18:13; within 5 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"46 mmHg at 06:46","Highest T1 / T2":"37.6 °C at 23:25","Labs (the model): last (lowest–highest)":"K⁺ 4.5 mmol/L (4.2–4.7) · Lactate 2.3 mmol/L (1.0–2.5) · pH 7.34 (7.32–7.41) · Glucose 6.3 mmol/L (5.6–6.3) · Tcore 37.6 °C (36.7–37.6)"},"timelineRows":36,"minuteRows":24}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[{"label":"before the style change","atWallS":110.9,"maxMismatchSoFar":[1,1,1]},{"label":"after Saadat-style → Philips-style","atWallS":111.7,"maxMismatchSoFar":[1,1,1]},{"label":"30 s after the style change","atWallS":141.7,"maxMismatchSoFar":[29.6,29.6,29.6]}],"perPhone":[{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":86,"holdSamples":0,"status":{"synced":283},"resyncs":5,"lagS":0.1},{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":83,"holdSamples":0,"status":{"synced":283},"resyncs":5,"lagS":0.1},{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":83,"holdSamples":0,"status":{"synced":283},"resyncs":5,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
