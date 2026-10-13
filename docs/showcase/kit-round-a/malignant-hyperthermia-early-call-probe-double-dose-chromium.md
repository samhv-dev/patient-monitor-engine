### Malignant hyperthermia, early call (kit round) (chromium, kit 56f3761f, load avg 3.94–4.98)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"B9FY29","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 4.98 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.4 | 04:12 | 8 | surgery | 80 | 99/65 (75) | 99 | 40 | 12 | 4.28 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.5 | 06:36 | 4 | surgery | 82 | 104/69 (79) | 99 | 45 | 12 | 3.94 | 6:30 ×4: watch the CO2 tile |
| 53.9 | 06:53 | 4 | earlySigns | 86 | 105/70 (80) | 99 | 46 | 12 | 4.03 | state Early signs |
| 56.7 | 07:04 | 4 | triggerOff | 85 | 105/71 (81) | 99 | 46 | 13 | 4.02 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 62.8 | 07:29 | 4 | treating | 86 | 105/72 (81) | 99 | 39 | 20 | 4.74 | press **Dantrolene 2.5 mg/kg** |
| 64.4 | 07:35 | 4 | treating | 85 | 105/72 (81) | 99 | 38 | 20 | 4.74 | press **Cool: 2 L saline at room temperature** |
| 79.5 | 12:55 | 4 | recovering | 82 | 134/88 (102) | 99 | 37 | 20 | 4.36 | after the 5-min fast-forward |
| 79.9 | 12:56 | 4 | recovering | 83 | 133/88 (103) | 99 | 37 | 20 | 4.36 | after span 1, paused |
| 93.8 | 18:11 | 4 | recovering | 81 | 145/93 (110) | 99 | 33 | 20 | 4.49 | after the 5-min fast-forward |
| 94.3 | 18:11 | 4 | recovering | 81 | 145/93 (110) | 99 | 33 | 20 | 4.49 | paused before span 3 |
| 95.6 | 18:16 | 4 | normoventilated | 80 | 144/92 (109) | 99 | 33 | 20 | 4.49 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 109 | 23:30 | 4 | normoventilated | 77 | 144/91 (108) | 99 | 39 | 16 | 4.44 | after the 5-min fast-forward |
| 109 | 23:30 | 4 | normoventilated | 77 | 144/91 (108) | 99 | 39 | 16 | 4.44 | end of the path |
| 113.1 | 23:46 | 4 | normoventilated | 77 | 143/89 (107) | 99 | 39 | 16 | 4.09 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 induction · 04:06 surgery · 06:53 earlySigns · 07:02 triggerOff · 07:22 dantrolene · 07:24 treating · 07:26 dantrolene · 07:28 treating · 07:32 cooling · 07:34 treating · 08:36 recovering · 18:13 normoventilated

Alarms raised: none

Spans: {"min":5,"via":"button","clockBefore":"07:41","fromT":461.9,"endT":761.9,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 07:41 → 12:41. During it: no alarms.","alarms":[],"load1":4.36}

{"min":5,"via":"button","clockBefore":"12:57","fromT":777.8,"endT":1077.8,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 12:57 → 17:57. During it: no alarms.","alarms":[],"load1":4.49}

{"min":5,"via":"button","clockBefore":"18:16","fromT":1096.9,"endT":1396.9,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 18:16 → 23:16. During it: no alarms.","alarms":[],"load1":4.44}

Measures: {"callAfterEarlySignsS":8.3,"mh":{"path":"early","callAt":"07:01","etco2FirstBelow40":"07:27","etco2Below40AfterCallMin":0.4,"recoveringAt":"08:36","recoveringAfterCallMin":1.6,"normoventilated":true,"fastForwards":3,"hrMaxAfterCall":87,"etco2MaxAfterCall":46,"minSystolicAfterCall":103.2}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 9 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:53 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:22; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"not met","text":"✗ Not met Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgThe state \"Ventilation back to 12 × 500, O₂ 100 %\" 10 min 46 s after EtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:27 → 18:13; within 5 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"46 mmHg at 06:46","Highest T1 / T2":"37.3 °C at 18:35","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.7) · Lactate 2.0 mmol/L (1.0–2.2) · pH 7.37 (7.32–7.43) · Glucose 6.3 mmol/L (5.6–6.3) · Tcore 37.2 °C (36.7–37.3)"},"timelineRows":38,"minuteRows":24}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[{"label":"before the style change","atWallS":110.7,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"after Saadat-style → Philips-style","atWallS":111.5,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"30 s after the style change","atWallS":141.5,"maxMismatchSoFar":[29.6,29.6,29.6]}],"perPhone":[{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":192,"commonTiles":10,"holdSamples":0,"status":{"synced":283},"resyncs":6,"lagS":0.1},{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":192,"commonTiles":10,"holdSamples":0,"status":{"synced":283},"resyncs":6,"lagS":0.1},{"maxMismatchS":29.6,"worst":{"param":"AGENTS","forS":29.6,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":141.4},"samples":283,"compared":192,"commonTiles":10,"holdSamples":0,"status":{"synced":283},"resyncs":6,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
