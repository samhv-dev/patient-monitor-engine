### Healthy induction, rescued at SpO2 below 90 (kit round) (chromium, kit 56f3761f, load avg 2.45–3.1)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"M3DB8R","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | awake | 71 | 123/82 (95) | 96 | 37 | 14 | 3.1 | Load "Healthy induction" at ×8, Bookmark |
| 24.3 | 03:10 | 4 | induced | 71 | 123/81 (95) | 99 | 39 | 14 | 2.97 | press **Induce now** |
| 36.7 | 04:00 | 4 | induced | 78 | 101/66 (77) | 99 | 0 | 9 | 2.75 | CO2 apnoea alarm (nobody secures the airway) |
| 58.5 | 09:47 | 4 | induced | 83 | 108/75 (85) | 99 | 0 | 0 | 2.49 | after the 5-min fast-forward |
| 58.6 | 09:47 | 4 | induced | 83 | 108/75 (85) | 99 | 0 | 0 | 2.49 | 9.5 min |
| 62.6 | 10:04 | 4 | induced | 83 | 109/75 (86) | 99 | 0 | 0 | 2.61 | 10 min |
| 70.3 | 10:34 | 4 | induced | 83 | 109/75 (86) | 98 | 0 | 0 | 2.72 | 10.5 min |
| 77.6 | 11:04 | 4 | induced | 84 | 109/75 (86) | 97 | 0 | 0 | 2.68 | 11 min |
| 83.3 | 11:26 | 4 | desaturating | 84 | 109/75 (86) | 94 | 0 | 0 | 2.62 | state "Airway not secured: SpO₂ below 90 %" |
| 86.1 | 11:38 | 4 | rescuedBvm | 85 | 109/76 (87) | 92 | 0 | 1 | 2.62 | press **Bag-mask ventilate, FiO₂ 1.0** |
| 96.4 | 12:19 | 4 | rescuedEtt | 82 | 106/72 (83) | 99 | 55 | 14 | 2.45 | press **Intubate and ventilate, FiO₂ 1.0** |
| 137.7 | 15:04 | 4 | rescuedEtt | 79 | 104/71 (81) | 99 | 49 | 12 | 2.58 | end (15:00) |
| 141.5 | 15:19 | 4 | rescuedEtt | 79 | 104/71 (82) | 99 | 48 | 12 | 2.58 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 awake · 03:07 induced · 11:26 desaturating · 11:34 rescuedBvm · 12:16 rescuedEtt

Alarms raised: 03:52 RR TOO LOW · 03:54 ETCO2 TOO LOW · 04:00 CO2 APNEA · 11:40 RR TOO LOW · 11:40 AWRR TOO LOW · 11:41 ETCO2 TOO HIGH · 11:48 %SPO2 LOW

Spans: {"min":5,"via":"button","clockBefore":"04:34","fromT":274.3,"endT":574.3,"wallS":10.4,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 04:34 → 09:34. During it: no alarms.","alarms":[],"load1":2.49}

Measures: {"rescue":{"inducedAt":"03:07","apnoeaAfterInductionS":52.3,"desaturatingAt":"11:26","desatAfterInductionMin":8.3,"bvmAt":"11:34","bvmAfterDesatS":8.1,"spo2LowestAfterBvm":87,"spo2NadirAfterBvmS":19.2,"spo2Back90AfterNadirFromBvmS":25.2,"spo2Back95FromBvmS":30.2,"firstSampleAtOrAbove90FromBvmS":0.2,"intubatedAt":"12:15","etco2Above25AfterTubeS":3.2,"curve":[{"afterBvmS":5,"spo2":91,"etco2":64,"hr":87},{"afterBvmS":10,"spo2":90,"etco2":65,"hr":88},{"afterBvmS":15,"spo2":89,"etco2":65,"hr":87},{"afterBvmS":20,"spo2":87,"etco2":61,"hr":85},{"afterBvmS":25,"spo2":90,"etco2":59,"hr":85},{"afterBvmS":30,"spo2":95,"etco2":57,"hr":84},{"afterBvmS":35,"spo2":98,"etco2":56,"hr":84},{"afterBvmS":40,"spo2":99,"etco2":55,"hr":83},{"afterBvmS":45,"spo2":99,"etco2":55,"hr":83},{"afterBvmS":60,"spo2":99,"etco2":53,"hr":83},{"afterBvmS":75,"spo2":99,"etco2":52,"hr":84},{"afterBvmS":90,"spo2":99,"etco2":51,"hr":83},{"afterBvmS":105,"spo2":99,"etco2":51,"hr":83},{"afterBvmS":120,"spo2":99,"etco2":51,"hr":81},{"afterBvmS":135,"spo2":99,"etco2":50,"hr":82},{"afterBvmS":150,"spo2":99,"etco2":50,"hr":81},{"afterBvmS":165,"spo2":99,"etco2":50,"hr":81},{"afterBvmS":180,"spo2":99,"etco2":49,"hr":80}]}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Induce after at least 180 s of preoxygenationThis objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Intubate and ventilate within 90 s of the CO₂ apnoea alarm (it sounds about 55 s after induction)Ventilated breaths 7 min 35 s after the alarm Apnoea (no CO₂ breaths) (04:00 → 11:34; within 1 min 30 s asked)."},{"status":"met","text":"✓ Met Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubationEtCO₂ above 25 mmHg 0 s after the state \"Intubated and ventilated\" or the state \"Rescued: intubated, FiO₂ 1.0\" (12:15 → 12:16; within 30 s asked)."},{"status":"met","text":"✓ Met Airway not secured: ventilate (bag-mask or tube) within 60 s of SpO₂ falling below 90 % (about 8 minutes after induction)Ventilated breaths 9 s after the state \"Airway not secured: SpO₂ below 90 %\" (11:26 → 11:34; within 1 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Ventilate within 300 s of SpO₂ falling below 60 % (the pulse is lost about 10½ minutes after it)The state \"SpO₂ below 60 %: hypoxic bradycardia\" did not happen."}],"facts":{"Lowest SpO₂":"87 % at 11:54","Lowest ART M / NIBP M":"73 mmHg at 04:25","Highest EtCO₂":"65 mmHg at 11:43","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"7 min 35 s (04:00 → 11:34)","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.3) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.30 (7.17–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.3 °C (36.3–36.8)"},"timelineRows":26,"minuteRows":16}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":139,"maxMismatchSoFar":[0,0,0]},{"label":"after Saadat-style → Philips-style","atWallS":139.8,"maxMismatchSoFar":[0,0,0]},{"label":"30 s after the style change","atWallS":169.9,"maxMismatchSoFar":[0,0,0]}],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":339,"compared":305,"commonTiles":10,"holdSamples":0,"status":{"synced":339},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":339,"compared":305,"commonTiles":10,"holdSamples":0,"status":{"synced":339},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":339,"compared":305,"commonTiles":10,"holdSamples":0,"status":{"synced":339},"resyncs":4,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
