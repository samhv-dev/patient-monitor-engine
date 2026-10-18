### Malignant hyperthermia E22 span-1-at-8-45 (kit round) (chromium, kit b08a972b, load avg 2.82–3.64)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"WUZVRD","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 3.1 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.3 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 3.03 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.6 | 06:36 | 4 | surgery | 82 | 104/69 (79) | 99 | 45 | 12 | 2.82 | 6:30 ×4: watch the CO2 tile |
| 53.6 | 06:52 | 4 | earlySigns | 85 | 105/70 (80) | 99 | 46 | 12 | 2.82 | state Early signs |
| 56.5 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 2.99 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.6 | 07:24 | 4 | treating | 85 | 105/71 (80) | 99 | 40 | 20 | 2.99 | press **Dantrolene 2.5 mg/kg** |
| 64.3 | 07:35 | 4 | treating | 85 | 105/71 (81) | 99 | 38 | 20 | 2.99 | press **Cool: 2 L saline at room temperature** |
| 81.8 | 08:45 | 4 | recovering | 84 | 115/77 (88) | 99 | 37 | 20 | 3.07 | 8:45: span 1 as the old cue card |
| 95.3 | 13:59 | 4 | recovering | 85 | 139/93 (108) | 99 | 38 | 20 | 3.41 | after the 5-min fast-forward |
| 95.4 | 14:00 | 4 | recovering | 85 | 140/93 (108) | 99 | 38 | 20 | 3.41 | EtCO2 below 40 for 2 min since the call {"holdFrom":"07:26","heldAt":"09:26","seenAt":"13:59"} |
| 98.3 | 14:11 | 4 | normoventilated | 84 | 140/93 (108) | 99 | 39 | 22 | 3.41 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 111.8 | 19:25 | 4 | normoventilated | 82 | 147/93 (111) | 99 | 43 | 22 | 3.56 | after the 5-min fast-forward |
| 111.8 | 19:25 | 4 | normoventilated | 82 | 147/93 (111) | 99 | 43 | 22 | 3.56 | after span 2 |
| 125.2 | 24:39 | 4 | normoventilated | 83 | 149/95 (113) | 99 | 42 | 19 | 3.64 | after the 5-min fast-forward |
| 125.2 | 24:39 | 4 | normoventilated | 83 | 149/95 (113) | 99 | 42 | 19 | 3.64 | after span 3 |
| 125.3 | 24:39 | 4 | normoventilated | 83 | 149/95 (113) | 99 | 42 | 19 | 3.64 | end of the path |

States: 00:02 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:21 dantrolene · 07:23 treating · 07:32 cooling · 07:34 treating · 08:34 recovering · 14:08 normoventilated

Alarms raised: 15:23 ETCO2 TOO HIGH · 22:40 ART SYS TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"08:45","fromT":525.6,"endT":825.6,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4.1,"banner":"Fast-forwarded 5 min, 08:45 → 13:45. During it: no alarms.","alarms":[],"load1":3.41}

{"min":5,"via":"button","clockBefore":"14:11","fromT":851.6,"endT":1151.6,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 14:11 → 19:11. During it: ETCO2 TOO HIGH 15:23.","alarms":["15:23 ETCO2 TOO HIGH (came and went)"],"load1":3.56}

{"min":5,"via":"button","clockBefore":"19:25","fromT":1165.7,"endT":1465.7,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 19:25 → 24:25. During it: ART SYS TOO HIGH 22:40.","alarms":["22:40 ART SYS TOO HIGH (came and went)"],"load1":3.64}

Measures: {"buttonsBeforePress":{"state":"recovering","normoOffered":true},"e22":{"variant":"span-1-at-8-45","earlySignsAt":"06:52","callAt":"07:01","etco2FirstBelow40":"07:26","holdFrom":"07:26","heldAt":"09:26","heldAfterCallMin":2.4,"pressAt":"14:08","pressAfterCallMin":7.1,"etco2AtPress":38,"etco2MaxAfterPress":"53 at 17:27 (+3.3 min)","etco2First45AfterPress":"14:27 (+0.3 min)","etco2PerMinuteAfterPress":"+0 min 38 · +1 min 49 · +2 min 51 · +3 min 52 · +4 min 46 · +5 min 43 · +6 min 43 · +7 min 43 · +8 min 43 · +9 min 42 · +10 min 42","historySamplesAfterPress":631,"repeatDantrolene":null,"fastForwards":3}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 8 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:21; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","text":"✓ Met Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 14:08, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"53 mmHg at 17:27","Highest T1 / T2":"37.6 °C at 23:17","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.7) · Lactate 2.2 mmol/L (1.0–2.5) · pH 7.34 (7.26–7.41) · Glucose 6.4 mmol/L (5.6–6.4) · Tcore 37.7 °C (36.7–37.7)"},"timelineRows":33,"minuteRows":25}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":126.7},"samples":254,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":143,"holdSamples":0,"status":{"synced":254},"resyncs":6,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":126.7},"samples":254,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":143,"holdSamples":0,"status":{"synced":254},"resyncs":6,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":126.7},"samples":254,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":143,"holdSamples":0,"status":{"synced":254},"resyncs":6,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
