### A4 MH E119 induction sequence and early call (kit round) (chromium, kit 52b0390b, load avg 2.35–3.55)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"KKQB2N","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"!! EtCO₂ high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | awake | 71 | –/– (–) | – | – | – | 2.37 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 5 | 00:41 | 8 | premedicated | 69 | 123/80 (94) | 96 | 37 | 14 | 2.58 | press **Premedicate: midazolam 2 mg, fentanyl 100 µg** |
| 8.9 | 01:12 | 8 | preoxygenated | 65 | 120/77 (90) | 96 | 38 | 12 | 2.58 | press **Preoxygenate: 100 % O₂ by face mask** |
| 31.3 | 04:11 | 8 | induced | 64 | 119/75 (88) | 99 | 46 | 6 | 2.44 | press **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** |
| 38.7 | 05:10 | 8 | intubated | 69 | 97/60 (70) | 99 | 49 | 4 | 2.48 | press **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** |
| 46.4 | 06:12 | 8 | surgery | 71 | 96/59 (69) | 99 | 42 | 12 | 3.36 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 57.1 | 07:36 | 4 | surgery | 75 | 105/65 (75) | 99 | 44 | 12 | 3.55 | 7:30 ×4: watch the CO₂ tile |
| 72.6 | 08:38 | 4 | earlySigns | 78 | 108/67 (78) | 99 | 45 | 12 | 3.28 | state Early signs |
| 73 | 08:40 | 4 | earlySigns | 80 | 108/68 (78) | 99 | 45 | 12 | 3.28 | objective ticked: ^Name malignant hyperthermia |
| 73.8 | 08:43 | 4 | triggerOff | 79 | 108/67 (78) | 99 | 45 | 14 | 3.28 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 78.9 | 09:04 | 4 | treating | 79 | 109/69 (79) | 99 | 39 | 20 | 3.42 | press **Dantrolene 2.5 mg/kg** |
| 81.5 | 09:14 | 4 | treating | 80 | 109/69 (80) | 99 | 38 | 20 | 3.55 | press **Cool: 2 L saline at room temperature** |
| 81.5 | 09:14 | 4 | treating | 80 | 109/69 (80) | 99 | 38 | 20 | 3.55 | EtCO₂ below 40 |
| 95 | 14:28 | 4 | recovering | 76 | 124/75 (89) | 99 | 35 | 20 | 3.46 | after the 5-min fast-forward |
| 95.8 | 14:31 | 4 | normoventilated | 77 | 124/75 (89) | 99 | 35 | 19 | 3.35 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 109.3 | 19:45 | 4 | normoventilated | 73 | 125/74 (89) | 99 | 52 | 12 | 3.45 | after the 5-min fast-forward |
| 122.7 | 24:58 | 4 | normoventilated | 71 | 130/77 (93) | 99 | 51 | 15 | 3.35 | after the 5-min fast-forward |
| 123.1 | 24:59 | 4 | normoventilated | 72 | 130/77 (93) | 99 | 51 | 15 | 3.35 | end: paused |

States: 00:01 awake · 00:35 premedicated · 01:06 preoxygenated · 04:05 induced · 05:05 intubated · 06:05 surgery · 08:38 earlySigns · 08:40 triggerOff · 09:01 dantrolene · 09:03 treating · 09:11 cooling · 09:13 treating · 10:15 recovering · 14:28 normoventilated

Alarms raised: 03:07 RR TOO LOW · 04:34 RR TOO LOW · 04:45 ETCO2 TOO LOW · 04:47 CO2 APNEA · 05:10 RR TOO LOW · 05:10 AWRR TOO LOW · 18:33 ETCO2 TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"09:14","fromT":554.7,"endT":854.7,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min 09:14 → 14:14 No alarms","alarms":[],"load1":3.46}

{"min":5,"via":"button","clockBefore":"14:31","fromT":871.7,"endT":1171.7,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min 14:31 → 19:31 ETCO2 TOO HIGH 18:33","alarms":["18:33 ETCO2 TOO HIGH"],"load1":3.45}

{"min":5,"via":"button","clockBefore":"19:45","fromT":1185.5,"endT":1485.5,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4.1,"banner":"Fast-forwarded 5 min 19:45 → 24:45 No alarms","alarms":[],"load1":3.35}

Measures: {"a4mh":{"states":[{"t":1.8,"id":"awake"},{"t":35.5,"id":"premedicated"},{"t":66.2,"id":"preoxygenated"},{"t":245.8,"id":"induced"},{"t":305,"id":"intubated"},{"t":365.8,"id":"surgery"},{"t":518.3,"id":"earlySigns"},{"t":520.3,"id":"triggerOff"},{"t":541,"id":"dantrolene"},{"t":543.1,"id":"treating"},{"t":551.5,"id":"cooling"},{"t":553.6,"id":"treating"},{"t":615.2,"id":"recovering"},{"t":868.4,"id":"normoventilated"}],"inducedAt":"04:05","intubatedAt":"05:04","earlySignsAt":"08:38","earlyAfterSuxS":273.5,"callAt":"08:40","callAfterEarlyS":1.6,"etco2Below40At":"09:14","normoAt":"14:28","spo2MinInductionToTube":99},"pdf":{"pages":7,"a4":true,"title":"Debrief Malignant hyperthermia 2026-10-23"},"handoutPdf":{"pages":1}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name malignant hyperthermia from the monitor: EtCO₂ above 45 mmHg at the same ventilation, tachycardia (instructor-assessed)Observed by the instructor at 08:40."},{"status":"met","mark":"observed","text":"✓ Observed Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation) 2 s of 2 min 00 sThe state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 2 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (08:38 → 08:40; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Give dantrolene 2.5 mg/kg within 300 s of calling the crisis 21 s of 5 min 00 sDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (08:40 → 09:00; within 5 min 00 s asked)."},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","mark":"observed","text":"✓ Observed Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 14:28, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (09:03 → 11:03)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"62 mmHg at 05:25","Highest EtCO₂":"54 mmHg at 20:57","Highest T1 / T2":"37.1 °C at 21:52","Apnoea alarm to ventilated breaths":"17 s (04:47 → 05:04)","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.8) · Lactate 1.6 mmol/L (1.0–1.6) · pH 7.28 (7.26–7.42) · Glucose 6.6 mmol/L (5.6–6.6) · Tcore 37.2 °C (36.6–37.2)"},"timelineRows":48,"minuteRows":26}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":125.8},"samples":255,"compared":166,"commonTiles":10,"sameNumberOtherMarkSamples":80,"holdSamples":0,"status":{"synced":255},"resyncs":7,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":125.8},"samples":255,"compared":166,"commonTiles":10,"sameNumberOtherMarkSamples":87,"holdSamples":0,"status":{"synced":255},"resyncs":7,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"AGENTS","forS":0.5,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":125.8},"samples":255,"compared":166,"commonTiles":10,"sameNumberOtherMarkSamples":89,"holdSamples":0,"status":{"synced":255},"resyncs":7,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
