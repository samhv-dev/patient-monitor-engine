### Healthy induction, rescued at SpO2 below 90 (kit round) (webkit, kit 56f3761f, load avg 1.86–2.44)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"TRFAVS","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | awake | 71 | 123/82 (95) | 96 | 37 | 14 | 2.26 | Load "Healthy induction" at ×8, Bookmark |
| 24.1 | 03:09 | 4 | induced | 71 | 123/81 (95) | 99 | 39 | 14 | 2.11 | press **Induce now** |
| 36.8 | 04:00 | 4 | induced | 78 | 101/67 (77) | 99 | 0 | 0 | 1.86 | CO2 apnoea alarm (nobody secures the airway) |
| 59 | 09:49 | 4 | induced | 84 | 109/75 (86) | 99 | 0 | 0 | 2.11 | after the 5-min fast-forward |
| 59 | 09:49 | 4 | induced | 84 | 109/75 (86) | 99 | 0 | 0 | 2.11 | 9.5 min |
| 62.9 | 10:04 | 4 | induced | 84 | 109/75 (86) | 99 | 0 | 0 | 2.26 | 10 min |
| 70.5 | 10:35 | 4 | induced | 83 | 109/75 (86) | 98 | 0 | 0 | 2.16 | 10.5 min |
| 77.9 | 11:04 | 4 | induced | 84 | 109/75 (86) | 96 | 0 | 0 | 2.14 | 11 min |
| 82.7 | 11:24 | 4 | desaturating | 84 | 109/75 (86) | 94 | 0 | 0 | 2.13 | state "Airway not secured: SpO₂ below 90 %" |
| 85.6 | 11:35 | 4 | rescuedBvm | 84 | 109/75 (86) | 92 | 0 | 1 | 2.13 | press **Bag-mask ventilate, FiO₂ 1.0** |
| 95.7 | 12:15 | 4 | rescuedEtt | 81 | 106/71 (82) | 99 | 55 | 12 | 2.44 | press **Intubate and ventilate, FiO₂ 1.0** |
| 137.9 | 15:04 | 4 | rescuedEtt | 79 | 104/71 (81) | 99 | 48 | 12 | 2.35 | end (15:00) |
| 141.7 | 15:19 | 4 | rescuedEtt | 79 | 104/72 (82) | 99 | 48 | 12 | 2.35 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 awake · 03:06 induced · 11:23 desaturating · 11:32 rescuedBvm · 12:12 rescuedEtt

Alarms raised: 03:54 ETCO2 TOO LOW · 03:59 RR TOO LOW · 04:00 CO2 APNEA · 11:37 RR TOO LOW · 11:37 AWRR TOO LOW · 11:38 ETCO2 TOO HIGH · 11:42 ETCO2 TOO HIGH · 11:45 %SPO2 LOW · 12:19 RR TOO LOW

Spans: {"min":5,"via":"button","clockBefore":"04:34","fromT":275.1,"endT":575.1,"wallS":10.6,"speedBefore":4,"speedAfter":4,"rateAfter3s":4,"banner":"Fast-forwarded 5 min, 04:35 → 09:35. During it: no alarms.","alarms":[],"load1":2.11}

Measures: {"rescue":{"inducedAt":"03:06","apnoeaAfterInductionS":53.9,"desaturatingAt":"11:24","desatAfterInductionMin":8.3,"bvmAt":"11:32","bvmAfterDesatS":8.2,"spo2LowestAfterBvm":87,"spo2NadirAfterBvmS":18.8,"spo2Back90AfterNadirFromBvmS":24.8,"spo2Back95FromBvmS":29.8,"firstSampleAtOrAbove90FromBvmS":0.8,"intubatedAt":"12:12","etco2Above25AfterTubeS":3.3,"curve":[{"afterBvmS":5,"spo2":91,"etco2":58,"hr":86},{"afterBvmS":10,"spo2":90,"etco2":65,"hr":89},{"afterBvmS":15,"spo2":88,"etco2":65,"hr":86},{"afterBvmS":20,"spo2":87,"etco2":61,"hr":85},{"afterBvmS":25,"spo2":90,"etco2":59,"hr":84},{"afterBvmS":30,"spo2":96,"etco2":57,"hr":84},{"afterBvmS":35,"spo2":98,"etco2":56,"hr":83},{"afterBvmS":40,"spo2":99,"etco2":55,"hr":84},{"afterBvmS":45,"spo2":99,"etco2":55,"hr":82},{"afterBvmS":60,"spo2":99,"etco2":53,"hr":84},{"afterBvmS":75,"spo2":99,"etco2":52,"hr":83},{"afterBvmS":90,"spo2":99,"etco2":51,"hr":84},{"afterBvmS":105,"spo2":99,"etco2":51,"hr":82},{"afterBvmS":120,"spo2":99,"etco2":50,"hr":82},{"afterBvmS":135,"spo2":99,"etco2":50,"hr":81},{"afterBvmS":150,"spo2":99,"etco2":50,"hr":82},{"afterBvmS":165,"spo2":99,"etco2":49,"hr":81},{"afterBvmS":180,"spo2":99,"etco2":49,"hr":81}]}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Induce after at least 180 s of preoxygenationThis objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Intubate and ventilate within 90 s of the CO₂ apnoea alarm (it sounds about 55 s after induction)Ventilated breaths 7 min 32 s after the alarm Apnoea (no CO₂ breaths) (04:00 → 11:32; within 1 min 30 s asked)."},{"status":"met","text":"✓ Met Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubationEtCO₂ above 25 mmHg 1 s after the state \"Intubated and ventilated\" or the state \"Rescued: intubated, FiO₂ 1.0\" (12:12 → 12:13; within 30 s asked)."},{"status":"met","text":"✓ Met Airway not secured: ventilate (bag-mask or tube) within 60 s of SpO₂ falling below 90 % (about 8 minutes after induction)Ventilated breaths 9 s after the state \"Airway not secured: SpO₂ below 90 %\" (11:23 → 11:32; within 1 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Ventilate within 300 s of SpO₂ falling below 60 % (the pulse is lost about 10½ minutes after it)The state \"SpO₂ below 60 %: hypoxic bradycardia\" did not happen."}],"facts":{"Lowest SpO₂":"87 % at 11:51","Lowest ART M / NIBP M":"73 mmHg at 04:25","Highest EtCO₂":"65 mmHg at 11:41","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"7 min 32 s (04:00 → 11:32)","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.3) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.30 (7.18–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.3 °C (36.3–36.8)"},"timelineRows":28,"minuteRows":16}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":139.3,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"after Saadat-style → Philips-style","atWallS":140.1,"maxMismatchSoFar":[0.5,0.5,0.5]},{"label":"30 s after the style change","atWallS":170.2,"maxMismatchSoFar":[0.5,0.5,0.5]}],"perPhone":[{"maxMismatchS":0.5,"worst":{"param":"CO2","forS":0.5,"instructorFirst":"64","phoneFirst":"58","instructorNow":"29","phoneNow":"64","atWallS":85.2},"samples":340,"compared":306,"commonTiles":10,"sameNumberOtherMarkSamples":111,"holdSamples":0,"status":{"synced":340},"resyncs":2,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"CO2","forS":0.5,"instructorFirst":"64","phoneFirst":"58","instructorNow":"29","phoneNow":"64","atWallS":85.2},"samples":340,"compared":306,"commonTiles":10,"sameNumberOtherMarkSamples":112,"holdSamples":0,"status":{"synced":340},"resyncs":2,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"CO2","forS":0.5,"instructorFirst":"64","phoneFirst":"58","instructorNow":"29","phoneNow":"64","atWallS":85.2},"samples":340,"compared":306,"commonTiles":10,"sameNumberOtherMarkSamples":111,"holdSamples":0,"status":{"synced":340},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
