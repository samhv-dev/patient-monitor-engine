### Malignant hyperthermia E22 at-hold (kit round) (webkit, kit b08a972b, load avg 2.21–3.84)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"DUHFJU","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 2.28 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.4 | 04:12 | 8 | surgery | 80 | 99/65 (75) | 99 | 40 | 12 | 2.82 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.6 | 06:36 | 4 | surgery | 82 | 104/69 (79) | 99 | 45 | 12 | 3.11 | 6:30 ×4: watch the CO2 tile |
| 53.7 | 06:53 | 4 | earlySigns | 86 | 105/70 (80) | 99 | 46 | 12 | 3.26 | state Early signs |
| 56.5 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 3.26 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.7 | 07:25 | 4 | treating | 85 | 105/71 (81) | 99 | 40 | 20 | 3.16 | press **Dantrolene 2.5 mg/kg** |
| 64.4 | 07:35 | 4 | treating | 85 | 105/71 (81) | 99 | 38 | 20 | 2.91 | press **Cool: 2 L saline at room temperature** |
| 92.3 | 09:27 | 4 | recovering | 85 | 119/81 (92) | 99 | 37 | 20 | 2.45 | EtCO2 below 40 for 2 min since the call {"holdFrom":"07:27","heldAt":"09:27","seenAt":"09:27"} |
| 95.2 | 09:39 | 4 | normoventilated | 86 | 120/82 (94) | 99 | 38 | 21 | 2.66 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 108.6 | 14:52 | 4 | normoventilated | 93 | 144/97 (112) | 99 | 57 | 12 | 3.18 | after the 5-min fast-forward |
| 108.6 | 14:52 | 4 | normoventilated | 93 | 144/97 (112) | 99 | 57 | 12 | 3.18 | after span 1 |
| 109.5 | 14:56 | 4 | treating | 93 | 144/97 (112) | 99 | 58 | 12 | 3.18 | press **Dantrolene 2.5 mg/kg** |
| 122.9 | 20:09 | 4 | recovering | 83 | 148/94 (112) | 99 | 44 | 23 | 3.84 | after the 5-min fast-forward |
| 122.9 | 20:10 | 4 | recovering | 83 | 148/94 (112) | 99 | 44 | 23 | 3.84 | after span 2 |
| 136.3 | 25:23 | 4 | recovering | 81 | 146/93 (110) | 99 | 41 | 19 | 3.71 | after the 5-min fast-forward |
| 136.3 | 25:23 | 4 | recovering | 81 | 146/93 (110) | 99 | 41 | 19 | 3.71 | after span 3 |
| 136.3 | 25:23 | 4 | recovering | 81 | 146/93 (110) | 99 | 41 | 19 | 3.71 | end of the path |

States: 00:02 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:22 dantrolene · 07:23 treating · 07:32 cooling · 07:34 treating · 08:35 recovering · 09:36 normoventilated · 14:53 dantrolene · 14:55 treating · 20:05 recovering

Alarms raised: 10:55 ETCO2 TOO HIGH · 15:40 ART MEAN TOO HIGH · 15:41 ART DIA TOO HIGH · 15:48 ART DIA TOO HIGH · 16:50 ART SYS TOO HIGH · 18:06 RR TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"09:39","fromT":579.3,"endT":879.3,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 09:39 → 14:39. During it: ETCO2 TOO HIGH 10:55.","alarms":["10:55 ETCO2 TOO HIGH"],"load1":3.18}

{"min":5,"via":"button","clockBefore":"14:56","fromT":896.5,"endT":1196.5,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 14:56 → 19:56. During it: ART MEAN TOO HIGH 15:40, ART DIA TOO HIGH 15:41, ART SYS TOO HIGH 16:50, RR TOO HIGH 18:06.","alarms":["15:40 ART MEAN TOO HIGH (came and went)","15:41 ART DIA TOO HIGH (came and went)","16:50 ART SYS TOO HIGH (came and went)","18:06 RR TOO HIGH (came and went)"],"load1":3.84}

{"min":5,"via":"button","clockBefore":"20:10","fromT":1210.1,"endT":1510.1,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 20:10 → 25:10. During it: no alarms.","alarms":[],"load1":3.71}

Measures: {"buttonsBeforePress":{"state":"recovering","normoOffered":true},"e22":{"variant":"at-hold","earlySignsAt":"06:53","callAt":"07:01","etco2FirstBelow40":"07:27","holdFrom":"07:27","heldAt":"09:27","heldAfterCallMin":2.4,"pressAt":"09:35","pressAfterCallMin":2.6,"etco2AtPress":37,"etco2MaxAfterPress":"60 at 17:19 (+7.7 min)","etco2First45AfterPress":"09:54 (+0.3 min)","etco2PerMinuteAfterPress":"+0 min 37 · +1 min 49 · +2 min 51 · +3 min 53 · +4 min 55 · +5 min 57 · +6 min 59 · +7 min 59 · +8 min 60 · +9 min 46 · +10 min 45 · +11 min 44 · +12 min 43 · +13 min 43 · +14 min 42 · +15 min 41","historySamplesAfterPress":948,"repeatDantrolene":"14:53","fastForwards":3}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 9 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:21; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","text":"✓ Met Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 09:35, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:27 → 09:27)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"60 mmHg at 17:19","Highest T1 / T2":"37.6 °C at 25:21","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.8) · Lactate 2.1 mmol/L (1.0–2.4) · pH 7.35 (7.22–7.41) · Glucose 6.5 mmol/L (5.6–6.5) · Tcore 37.6 °C (36.7–37.6)"},"timelineRows":41,"minuteRows":26}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":137.7},"samples":276,"compared":191,"commonTiles":10,"sameNumberOtherMarkSamples":168,"holdSamples":0,"status":{"synced":276},"resyncs":5,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":137.7},"samples":276,"compared":191,"commonTiles":10,"sameNumberOtherMarkSamples":168,"holdSamples":0,"status":{"synced":276},"resyncs":5,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"---","instructorNow":"0.0","phoneNow":"---","atWallS":137.7},"samples":276,"compared":191,"commonTiles":10,"sameNumberOtherMarkSamples":168,"holdSamples":0,"status":{"synced":276},"resyncs":5,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
