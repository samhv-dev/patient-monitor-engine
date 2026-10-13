### Malignant hyperthermia, early-normo call (kit round) (chromium, kit 62e521c3, load avg 1.66–3.31)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"6WMCP5","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** ART D high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 1.93 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.3 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 2.16 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.7 | 06:37 | 4 | surgery | 83 | 104/69 (79) | 99 | 45 | 12 | 2.17 | 6:30 ×4: watch the CO2 tile |
| 53.7 | 06:53 | 4 | earlySigns | 86 | 105/70 (80) | 99 | 46 | 12 | 2.07 | state Early signs |
| 56.6 | 07:04 | 4 | triggerOff | 85 | 105/71 (81) | 99 | 46 | 13 | 2.07 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.7 | 07:25 | 4 | treating | 84 | 105/71 (81) | 99 | 40 | 20 | 2.07 | press **Dantrolene 2.5 mg/kg** |
| 64.3 | 07:35 | 4 | treating | 85 | 105/72 (81) | 99 | 38 | 20 | 2.3 | press **Cool: 2 L saline at room temperature** |
| 81.9 | 08:46 | 4 | normoventilated | 84 | 115/77 (89) | 99 | 39 | 20 | 2.27 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 81.9 | 08:46 | 4 | normoventilated | 84 | 115/77 (89) | 99 | 39 | 20 | 2.27 | Recovering shown: ventilation back before span 1 |
| 95.4 | 14:00 | 4 | normoventilated | 94 | 141/97 (111) | 99 | 57 | 12 | 2.77 | after the 5-min fast-forward |
| 95.8 | 14:00 | 4 | normoventilated | 94 | 141/97 (111) | 99 | 57 | 12 | 2.77 | after span 1, paused |
| 97.1 | 14:05 | 4 | treating | 93 | 141/96 (110) | 99 | 58 | 12 | 3.02 | press **Dantrolene 2.5 mg/kg** |
| 110.6 | 19:19 | 4 | treating | 85 | 148/95 (112) | 99 | 45 | 25 | 3.18 | after the 5-min fast-forward |
| 111 | 19:19 | 4 | treating | 85 | 148/95 (112) | 99 | 45 | 25 | 3.18 | paused before span 3 |
| 124.8 | 24:34 | 4 | recovering | 80 | 146/92 (110) | 99 | 41 | 19 | 3.16 | after the 5-min fast-forward |
| 124.8 | 24:34 | 4 | recovering | 80 | 146/92 (110) | 99 | 41 | 19 | 3.16 | end of the path |
| 128.9 | 24:50 | 4 | recovering | 81 | 147/93 (111) | 99 | 41 | 19 | 3.31 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:22 dantrolene · 07:24 treating · 07:33 cooling · 07:35 treating · 08:35 recovering · 08:43 normoventilated · 14:02 dantrolene · 14:04 treating · 20:27 recovering

Alarms raised: 10:07 ETCO2 TOO HIGH · 15:38 ART MEAN TOO HIGH · 15:39 ART DIA TOO HIGH · 16:42 ART SYS TOO HIGH · 18:08 RR TOO HIGH · 24:53 **ABPd 92>90

Spans: {"min":5,"via":"button","clockBefore":"08:46","fromT":526.5,"endT":826.5,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 08:46 → 13:46. During it: ETCO2 TOO HIGH 10:07.","alarms":["10:07 ETCO2 TOO HIGH"],"load1":2.77}

{"min":5,"via":"button","clockBefore":"14:05","fromT":845.4,"endT":1145.4,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 14:05 → 19:05. During it: ART MEAN TOO HIGH 15:38, ART DIA TOO HIGH 15:39, ART SYS TOO HIGH 16:42, RR TOO HIGH 18:08.","alarms":["15:38 ART MEAN TOO HIGH (came and went)","15:39 ART DIA TOO HIGH (came and went)","16:42 ART SYS TOO HIGH (came and went)","18:08 RR TOO HIGH"],"load1":3.18}

{"min":5,"via":"button","clockBefore":"19:20","fromT":1160.9,"endT":1460.9,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 19:20 → 24:20. During it: no alarms.","alarms":[],"load1":3.16}

Measures: {"callAfterEarlySignsS":8.2,"mh":{"path":"early-normo","callAt":"07:01","etco2FirstBelow40":"07:27","etco2Below40AfterCallMin":0.4,"recoveringAt":"08:35","recoveringAfterCallMin":1.6,"normoventilated":true,"fastForwards":3,"hrMaxAfterCall":98,"etco2MaxAfterCall":61,"minSystolicAfterCall":103.3}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 9 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:22; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","text":"✓ Met Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgThe state \"Ventilation back to 12 × 500, O₂ 100 %\" 1 min 16 s after EtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:27 → 08:43; within 5 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"61 mmHg at 16:36","Highest T1 / T2":"37.5 °C at 19:54","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.8) · Lactate 2.1 mmol/L (1.0–2.4) · pH 7.35 (7.21–7.41) · Glucose 6.5 mmol/L (5.6–6.5) · Tcore 37.5 °C (36.7–37.5)"},"timelineRows":44,"minuteRows":25}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[{"label":"before the style change","atWallS":126.5,"maxMismatchSoFar":[1,1,1]},{"label":"after Saadat-style → Philips-style","atWallS":127.3,"maxMismatchSoFar":[1,1,1]},{"label":"30 s after the style change","atWallS":157.3,"maxMismatchSoFar":[29.1,29.1,29.1]}],"perPhone":[{"maxMismatchS":29.1,"worst":{"param":"AGENTS","forS":29.1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":156.9},"samples":314,"compared":224,"commonTiles":10,"sameNumberOtherMarkSamples":154,"holdSamples":0,"status":{"synced":314},"resyncs":6,"lagS":0.1},{"maxMismatchS":29.1,"worst":{"param":"AGENTS","forS":29.1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":156.9},"samples":314,"compared":224,"commonTiles":10,"sameNumberOtherMarkSamples":153,"holdSamples":0,"status":{"synced":314},"resyncs":6,"lagS":0.1},{"maxMismatchS":29.1,"worst":{"param":"AGENTS","forS":29.1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":156.9},"samples":314,"compared":224,"commonTiles":10,"sameNumberOtherMarkSamples":147,"holdSamples":0,"status":{"synced":314},"resyncs":6,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
