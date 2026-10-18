### Malignant hyperthermia E22 span-1-at-7-42 (kit round) (webkit, kit b08a972b, load avg 2.94–4.68)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"6QUKZG","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:14","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"!!! ART S high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:14 | 8 | induction | 71 | 110/74 (85) | 96 | 36 | 19 | 3.25 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.4 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 2.94 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.7 | 06:37 | 4 | surgery | 83 | 104/69 (79) | 99 | 45 | 12 | 3.07 | 6:30 ×4: watch the CO2 tile |
| 53.5 | 06:52 | 4 | earlySigns | 85 | 105/70 (80) | 99 | 46 | 12 | 3.46 | state Early signs |
| 56.4 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 3.43 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.6 | 07:25 | 4 | treating | 85 | 105/71 (81) | 99 | 40 | 20 | 4.11 | press **Dantrolene 2.5 mg/kg** |
| 64 | 07:34 | 4 | treating | 85 | 106/71 (81) | 99 | 38 | 20 | 4.11 | press **Cool: 2 L saline at room temperature** |
| 65.8 | 07:41 | 4 | treating | 86 | 106/73 (82) | 99 | 38 | 20 | 4.11 | span 1, 40 s after the call |
| 79.2 | 12:55 | 4 | recovering | 84 | 136/90 (105) | 99 | 38 | 20 | 4.68 | after the 5-min fast-forward |
| 79.3 | 12:55 | 4 | recovering | 84 | 136/90 (105) | 99 | 38 | 20 | 4.68 | EtCO2 below 40 for 2 min since the call {"holdFrom":"07:26","heldAt":"09:26","seenAt":"12:55"} |
| 82.1 | 13:07 | 4 | normoventilated | 83 | 137/90 (105) | 99 | 39 | 19 | 4.47 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 95.7 | 18:21 | 4 | normoventilated | 85 | 147/95 (112) | 99 | 45 | 25 | 4.08 | after the 5-min fast-forward |
| 95.7 | 18:21 | 4 | normoventilated | 85 | 147/95 (112) | 99 | 45 | 25 | 4.08 | after span 2 |
| 109.2 | 23:35 | 4 | normoventilated | 83 | 150/95 (113) | 99 | 42 | 20 | 3.95 | after the 5-min fast-forward |
| 109.2 | 23:35 | 4 | normoventilated | 83 | 150/95 (113) | 99 | 42 | 20 | 3.95 | after span 3 |
| 109.2 | 23:35 | 4 | normoventilated | 83 | 150/95 (113) | 99 | 42 | 20 | 3.95 | end of the path |

States: 00:02 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:22 dantrolene · 07:24 treating · 07:31 cooling · 07:33 treating · 08:35 recovering · 13:04 normoventilated

Alarms raised: 14:13 ETCO2 TOO HIGH · 17:00 ART MEAN TOO HIGH · 18:06 RR TOO HIGH · 22:40 ART SYS TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"07:41","fromT":462,"endT":762,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 07:42 → 12:42. During it: no alarms.","alarms":[],"load1":4.68}

{"min":5,"via":"button","clockBefore":"13:07","fromT":787.5,"endT":1087.5,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 13:07 → 18:07. During it: ETCO2 TOO HIGH 14:13, ART MEAN TOO HIGH 17:00, RR TOO HIGH 18:06.","alarms":["14:13 ETCO2 TOO HIGH (came and went)","17:00 ART MEAN TOO HIGH (came and went)","18:06 RR TOO HIGH"],"load1":4.08}

{"min":5,"via":"button","clockBefore":"18:21","fromT":1101.8,"endT":1401.8,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 18:21 → 23:21. During it: ART SYS TOO HIGH 22:40.","alarms":["22:40 ART SYS TOO HIGH"],"load1":3.95}

Measures: {"buttonsBeforePress":{"state":"recovering","normoOffered":true},"e22":{"variant":"span-1-at-7-42","earlySignsAt":"06:52","callAt":"07:01","etco2FirstBelow40":"07:26","holdFrom":"07:26","heldAt":"09:26","heldAfterCallMin":2.4,"pressAt":"13:04","pressAfterCallMin":6.1,"etco2AtPress":38,"etco2MaxAfterPress":"55 at 17:32 (+4.5 min)","etco2First45AfterPress":"13:22 (+0.3 min)","etco2PerMinuteAfterPress":"+0 min 38 · +1 min 49 · +2 min 52 · +3 min 53 · +4 min 54 · +5 min 49 · +6 min 44 · +7 min 44 · +8 min 43 · +9 min 43 · +10 min 43","historySamplesAfterPress":631,"repeatDantrolene":null,"fastForwards":3}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 9 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:21; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","text":"✓ Met Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 13:04, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"55 mmHg at 17:32","Highest T1 / T2":"37.6 °C at 23:14","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.7) · Lactate 2.3 mmol/L (1.0–2.5) · pH 7.33 (7.25–7.41) · Glucose 6.4 mmol/L (5.6–6.4) · Tcore 37.6 °C (36.7–37.6)"},"timelineRows":35,"minuteRows":24}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":110.2},"samples":221,"compared":134,"commonTiles":10,"sameNumberOtherMarkSamples":88,"holdSamples":0,"status":{"synced":221},"resyncs":5,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":110.2},"samples":221,"compared":134,"commonTiles":10,"sameNumberOtherMarkSamples":88,"holdSamples":0,"status":{"synced":221},"resyncs":5,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":110.2},"samples":221,"compared":134,"commonTiles":10,"sameNumberOtherMarkSamples":88,"holdSamples":0,"status":{"synced":221},"resyncs":5,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
