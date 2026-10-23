### A4 MH E119 induction sequence and early call (kit round) (webkit, kit 52b0390b, load avg 1.72–3.56)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"KRFPDJ","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","choseAnotherScenarioFirst":true,"alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"!! EtCO₂ high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | awake | 71 | –/– (–) | – | – | – | 1.98 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 5 | 00:41 | 8 | premedicated | 69 | 123/80 (94) | 96 | 37 | 14 | 2.14 | press **Premedicate: midazolam 2 mg, fentanyl 100 µg** |
| 8.7 | 01:10 | 8 | preoxygenated | 64 | 120/77 (90) | 96 | 38 | 12 | 2.13 | press **Preoxygenate: 100 % O₂ by face mask** |
| 31.4 | 04:12 | 8 | induced | 65 | 120/75 (89) | 99 | 46 | 6 | 3 | press **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** |
| 38.8 | 05:11 | 8 | intubated | 69 | 97/60 (70) | 99 | 49 | 4 | 2.83 | press **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** |
| 46.3 | 06:11 | 8 | surgery | 72 | 96/59 (69) | 99 | 42 | 12 | 2.77 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 57 | 07:36 | 4 | surgery | 75 | 105/64 (75) | 99 | 44 | 12 | 3.23 | 7:30 ×4: watch the CO₂ tile |
| 72.8 | 08:39 | 4 | earlySigns | 78 | 108/67 (78) | 99 | 46 | 12 | 3.18 | state Early signs |
| 73.1 | 08:40 | 4 | earlySigns | 80 | 108/68 (78) | 99 | 46 | 12 | 3.18 | objective ticked: ^Name malignant hyperthermia |
| 74 | 08:43 | 4 | triggerOff | 79 | 108/67 (78) | 99 | 46 | 14 | 3.18 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 79.1 | 09:04 | 4 | treating | 78 | 108/68 (79) | 99 | 39 | 20 | 3.17 | press **Dantrolene 2.5 mg/kg** |
| 81.8 | 09:15 | 4 | treating | 79 | 109/69 (80) | 99 | 37 | 20 | 3.23 | press **Cool: 2 L saline at room temperature** |
| 81.8 | 09:15 | 4 | treating | 79 | 109/69 (80) | 99 | 37 | 20 | 3.23 | EtCO₂ below 40 |
| 95.2 | 14:28 | 4 | recovering | 76 | 124/75 (89) | 99 | 35 | 20 | 2.74 | after the 5-min fast-forward |
| 96 | 14:32 | 4 | normoventilated | 77 | 124/75 (89) | 99 | 36 | 23 | 2.74 | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 109.6 | 19:46 | 4 | normoventilated | 72 | 125/74 (89) | 99 | 52 | 12 | 3.27 | after the 5-min fast-forward |
| 123.1 | 25:00 | 4 | normoventilated | 72 | 131/78 (94) | 99 | 51 | 15 | 3.56 | after the 5-min fast-forward |
| 123.5 | 25:00 | 4 | normoventilated | 72 | 131/78 (94) | 99 | 51 | 15 | 3.56 | end: paused |

States: 00:01 awake · 00:35 premedicated · 01:04 preoxygenated · 04:06 induced · 05:05 intubated · 06:05 surgery · 08:38 earlySigns · 08:40 triggerOff · 09:01 dantrolene · 09:03 treating · 09:12 cooling · 09:14 treating · 10:15 recovering · 14:28 normoventilated

Alarms raised: 03:07 RR TOO LOW · 04:34 RR TOO LOW · 04:45 ETCO2 TOO LOW · 04:47 CO2 APNEA · 05:10 RR TOO LOW · 05:10 AWRR TOO LOW · 18:18 ETCO2 TOO HIGH

Spans: {"min":5,"via":"button","clockBefore":"09:15","fromT":555.2,"endT":855.2,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min 09:15 → 14:15 No alarms","alarms":[],"load1":2.74}

{"min":5,"via":"button","clockBefore":"14:32","fromT":872.2,"endT":1172.2,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min 14:32 → 19:32 ETCO2 TOO HIGH 18:18","alarms":["18:18 ETCO2 TOO HIGH"],"load1":3.27}

{"min":5,"via":"button","clockBefore":"19:46","fromT":1186.5,"endT":1486.5,"wallS":10.5,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min 19:46 → 24:46 No alarms","alarms":[],"load1":3.56}

Measures: {"a4mh":{"states":[{"t":1.8,"id":"awake"},{"t":35.1,"id":"premedicated"},{"t":64.2,"id":"preoxygenated"},{"t":246,"id":"induced"},{"t":305.4,"id":"intubated"},{"t":365.1,"id":"surgery"},{"t":518.4,"id":"earlySigns"},{"t":520.7,"id":"triggerOff"},{"t":541.5,"id":"dantrolene"},{"t":543.4,"id":"treating"},{"t":552,"id":"cooling"},{"t":554,"id":"treating"},{"t":615.1,"id":"recovering"},{"t":868.8,"id":"normoventilated"}],"inducedAt":"04:05","intubatedAt":"05:05","earlySignsAt":"08:39","earlyAfterSuxS":273.4,"callAt":"08:40","callAfterEarlyS":1.7,"etco2Below40At":"09:15","normoAt":"14:28","spo2MinInductionToTube":99},"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only"}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name malignant hyperthermia from the monitor: EtCO₂ above 45 mmHg at the same ventilation, tachycardia (instructor-assessed)Observed by the instructor at 08:40."},{"status":"met","mark":"observed","text":"✓ Observed Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation) 2 s of 2 min 00 sThe state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" 2 s after the state \"Early signs: EtCO₂ rising at the same ventilation, tachycardia\" (08:38 → 08:40; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Give dantrolene 2.5 mg/kg within 300 s of calling the crisis 21 s of 5 min 00 sDantrolene 21 s after the state \"Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600\" (08:40 → 09:01; within 5 min 00 s asked)."},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHgThis objective has no rule: the instructor judges it."},{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/LK⁺ above 5.5 mmol/L did not happen."},{"status":"met","mark":"observed","text":"✓ Observed Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)The state \"Ventilation back to 12 × 500, O₂ 100 %\" at 14:28, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (09:03 → 11:03)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"62 mmHg at 05:25","Highest EtCO₂":"54 mmHg at 21:02","Highest T1 / T2":"37.1 °C at 21:53","Apnoea alarm to ventilated breaths":"18 s (04:47 → 05:05)","Labs (the model): last (lowest–highest)":"K⁺ 4.6 mmol/L (4.2–4.8) · Lactate 1.6 mmol/L (1.0–1.7) · pH 7.28 (7.26–7.42) · Glucose 6.6 mmol/L (5.6–6.6) · Tcore 37.2 °C (36.6–37.2)"},"timelineRows":48,"minuteRows":26}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":126.3},"samples":256,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":141,"holdSamples":0,"status":{"synced":256},"resyncs":4,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":126.3},"samples":256,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":141,"holdSamples":0,"status":{"synced":256},"resyncs":4,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"AGENTS","forS":1,"instructorFirst":"0.0","phoneFirst":"","instructorNow":"0.0","phoneNow":"","atWallS":126.3},"samples":256,"compared":168,"commonTiles":10,"sameNumberOtherMarkSamples":141,"holdSamples":0,"status":{"synced":256},"resyncs":4,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
