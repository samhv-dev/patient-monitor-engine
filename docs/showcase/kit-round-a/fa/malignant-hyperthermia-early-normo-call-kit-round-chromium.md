### Malignant hyperthermia, early-normo call (kit round) (chromium, kit 62e521c3, load avg 3.29–4.63)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 0 phones · setup: {"sessionCode":"GZRXZ4","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 4.4 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.2 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 3.65 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 49.8 | 06:37 | 4 | surgery | 83 | 104/69 (79) | 99 | 45 | 12 | 3.47 | 6:30 ×4: watch the CO2 tile |
| 53.6 | 06:52 | 4 | earlySigns | 85 | 105/70 (80) | 99 | 46 | 12 | 3.35 | state Early signs |
| 56.5 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 3.4 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.6 | 07:24 | 4 | treating | 85 | 105/71 (80) | 99 | 40 | 20 | 3.29 | press **Dantrolene 2.5 mg/kg** |
| 64.3 | 07:35 | 4 | treating | 85 | 105/71 (81) | 99 | 38 | 20 | 3.29 | press **Cool: 2 L saline at room temperature** |
| 82.1 | 08:46 | 4 | normoventilated | 84 | 115/77 (89) | 99 | 39 | 23 | 3.72 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 82.1 | 08:46 | 4 | normoventilated | 84 | 115/77 (89) | 99 | 39 | 23 | 3.72 | Recovering shown: ventilation back before span 1 |
| 95.7 | 14:00 | 4 | normoventilated | 94 | 141/97 (111) | 99 | 57 | 12 | 3.7 | after the 5-min fast-forward |
| 96.1 | 14:01 | 4 | normoventilated | 93 | 142/97 (111) | 99 | 57 | 12 | 3.64 | after span 1, paused |
| 97.4 | 14:06 | 4 | treating | 92 | 142/96 (111) | 99 | 58 | 12 | 3.64 | press **Dantrolene 2.5 mg/kg** |
| 110.8 | 19:19 | 4 | treating | 84 | 148/95 (112) | 99 | 45 | 25 | 4.63 | after the 5-min fast-forward |
| 111.2 | 19:19 | 4 | treating | 84 | 148/95 (112) | 99 | 45 | 25 | 4.42 | paused before span 3 |
| 125.1 | 24:35 | 4 | recovering | 80 | 146/92 (110) | 99 | 41 | 19 | 4.29 | after the 5-min fast-forward |
| 125.1 | 24:35 | 4 | recovering | 80 | 146/92 (110) | 99 | 41 | 19 | 4.29 | end of the path |

States: 00:02 induction · 04:05 surgery · 06:53 earlySigns · 07:01 triggerOff · 07:21 dantrolene · 07:24 treating · 07:32 cooling · 07:34 treating · 08:35 recovering · 08:43 normoventilated · 14:03 dantrolene · 14:05 treating · 20:24 recovering

Alarms raised: 10:03 ETCO2 TOO HIGH · 15:38 ART MEAN TOO HIGH · 15:39 ART DIA TOO HIGH · 16:42 ART SYS TOO HIGH · 18:03 RR TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"08:46","fromT":526.9,"endT":826.9,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 08:46 → 13:46. During it: ETCO2 TOO HIGH 10:03.","alarms":["10:03 ETCO2 TOO HIGH"],"load1":3.7}

{"min":5,"via":"button","clockBefore":"14:06","fromT":846.2,"endT":1146.2,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 14:06 → 19:06. During it: ART MEAN TOO HIGH 15:38, ART DIA TOO HIGH 15:39, ART SYS TOO HIGH 16:42, RR TOO HIGH 18:03.","alarms":["15:38 ART MEAN TOO HIGH (came and went)","15:39 ART DIA TOO HIGH (came and went)","16:42 ART SYS TOO HIGH (came and went)","18:03 RR TOO HIGH"],"load1":4.63}

{"min":5,"via":"button","clockBefore":"19:21","fromT":1161.7,"endT":1461.7,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 19:21 → 24:21. During it: no alarms.","alarms":[],"load1":4.29}

Measures: {"callAfterEarlySignsS":8.2,"mh":{"path":"early-normo","callAt":"07:01","etco2FirstBelow40":"07:26","etco2Below40AfterCallMin":0.4,"recoveringAt":"08:35","recoveringAfterCallMin":1.6,"normoventilated":true,"fastForwards":3,"hrMaxAfterCall":98,"etco2MaxAfterCall":61,"minSystolicAfterCall":102.8}}

Debrief: {"objectives":[{"status":"met","text":"✓ Met Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)The state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 8 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (06:52 → 07:01; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give dantrolene 2.5 mg/kg within 300 s of calling the crisisDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:01 → 07:21; within 5 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","text":"✓ Met Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHgThe state \"Ventilation back to 12 × 500, O₂ 100 %\" 1 min 17 s after EtCO₂ below 40 mmHg after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (07:26 → 08:43; within 5 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"66 mmHg at 01:15","Highest EtCO₂":"61 mmHg at 17:07","Highest T1 / T2":"37.5 °C at 19:57","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.8) · Lactate 2.1 mmol/L (1.0–2.4) · pH 7.35 (7.21–7.41) · Glucose 6.5 mmol/L (5.6–6.5) · Tcore 37.5 °C (36.7–37.5)"},"timelineRows":44,"minuteRows":25}

Phones: null

Notes: 

Errors: none
