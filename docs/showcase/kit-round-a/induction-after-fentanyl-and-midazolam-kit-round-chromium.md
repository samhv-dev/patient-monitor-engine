### Induction after fentanyl and midazolam (kit round) (chromium, kit 56f3761f, load avg 2.48–4.68)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"RSSZ6V","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | awake | 70 | 122/80 (94) | – | – | – | 4.68 | Load "Induction after fentanyl and midazolam" at ×4, Bookmark |
| 2.4 | 00:10 | 4 | premedicated | 71 | 123/81 (96) | 96 | 36 | – | 4.55 | premedication given by itself |
| 24.7 | 01:40 | 4 | premedicated | 63 | 120/75 (89) | 99 | 43 | 0 | 4.37 | RR limit alarm raised {"alarm":"RR TOO LOW","alarmButton":"No alarms"} |
| 27.8 | 01:52 | 4 | premedicated | 64 | 120/75 (90) | 99 | 44 | 0 | 4.26 | Acknowledge (alarm button → Devices & alarms) |
| 30.4 | 02:02 | 4 | premedicated | 62 | 117/73 (87) | 99 | 45 | 6 | 4.26 | 2:00 |
| 46.4 | 03:07 | 4 | induced | 60 | 115/71 (85) | 99 | 49 | 5 | 3.67 | press **Induce now** |
| 55.6 | 03:43 | 4 | induced | 60 | 92/54 (65) | 99 | 0 | 0 | 3.48 | CO2 apnoea alarm |
| 58.4 | 03:54 | 4 | ventilated | 59 | 90/52 (63) | 99 | 0 | 3 | 3.52 | press **Intubate and ventilate** |
| 59.7 | 04:00 | 4 | ventilated | 59 | 84/49 (59) | 99 | 48 | 4 | 3.52 | MAP below 60 |
| 62.5 | 04:11 | 4 | maintained | 57 | 78/44 (53) | 99 | 45 | 5 | 3.32 | press **Ephedrine 10 mg** |
| 89.7 | 06:00 | 4 | maintained | 59 | 94/53 (65) | 99 | 38 | 12 | 2.79 | MAP back to 65 |
| 120.4 | 08:03 | 4 | maintained | 61 | 102/60 (72) | 99 | 38 | 12 | 2.96 | end (8:00) |
| 124.2 | 08:18 | 4 | maintained | 61 | 102/60 (72) | 99 | 39 | 12 | 2.73 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 awake · 00:10 premedicated · 03:04 induced · 03:52 ventilated · 04:08 ephedrine · 04:10 maintained

Alarms raised: 01:40 RR TOO LOW · 01:53 RR TOO LOW · 02:06 RR TOO LOW · 03:10 AWRR TOO LOW · 03:29 ETCO2 TOO HIGH · 03:34 ETCO2 TOO HIGH · 03:42 CO2 APNEA · 03:57 RR TOO LOW · 03:57 AWRR TOO LOW · 04:01 ART DIA TOO LOW · 04:01 ART MEAN TOO LOW · 04:06 ART SYS TOO LOW

Spans: 

Measures: {"rrAlarm":{"text":"RR TOO LOW","at":"01:40","afterPremedS":89.3,"ackAfterS":10.4,"allAlarms":["01:40 RR TOO LOW","01:53 RR TOO LOW"]},"timings":{"apnoeaAfterInductionS":38.8,"apnoeaAlarmAt":"03:42","intubatedAfterAlarmS":9.1,"intubateAt":"03:51","mapBelow60At":"04:00","mapBelow60AfterInductionS":56.2,"ephedrineAfterMapBelow60S":8.1,"map65AfterEphedrineS":111.9,"mapNadir":52.4,"apnoeaTimeTakenFrom":"alarm event"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Acknowledge the respiratory-rate alarm (RR below 8/min, about 75 s after the premedication) within 30 sThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Intubate and ventilate within 60 s of the CO₂ apnoea alarm (it sounds about 43 s after induction, 13 s earlier than in the healthy induction)Ventilated breaths 9 s after the alarm Apnoea (no CO₂ breaths) (03:42 → 03:51; within 1 min 00 s asked)."},{"status":"met","text":"✓ Met Give a vasopressor (phenylephrine or ephedrine) within 60 s of the mean arterial pressure falling below 60 mmHgPhenylephrine or Ephedrine 8 s after ART M / NIBP M below 60 mmHg (04:00 → 04:08; within 1 min 00 s asked)."},{"status":"met","text":"✓ Met Mean arterial pressure back above 65 mmHg within 120 s of the vasopressorART M / NIBP M above 65 mmHg 1 min 52 s after Phenylephrine or Ephedrine (04:08 → 06:00; within 2 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"52 mmHg at 04:18","Highest EtCO₂":"51 mmHg at 03:30","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"9 s (03:42 → 03:51)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.38 (7.28–7.41) · Glucose 5.6 mmol/L (5.6–5.6) · Tcore 36.5 °C (36.5–36.8)"},"timelineRows":33,"minuteRows":9}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":121.8,"maxMismatchSoFar":[0,0,0]},{"label":"after Saadat-style → Philips-style","atWallS":122.6,"maxMismatchSoFar":[0,0,0]},{"label":"30 s after the style change","atWallS":152.7,"maxMismatchSoFar":[0,0,0]}],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":305,"compared":300,"commonTiles":10,"holdSamples":0,"status":{"synced":304,"waiting":1},"resyncs":3,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":305,"compared":301,"commonTiles":10,"holdSamples":0,"status":{"synced":305},"resyncs":3,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":305,"compared":301,"commonTiles":10,"holdSamples":0,"status":{"synced":305},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
