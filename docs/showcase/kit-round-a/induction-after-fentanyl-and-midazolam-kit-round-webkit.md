### Induction after fentanyl and midazolam (kit round) (webkit, kit 56f3761f, load avg 1.81–3.27)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"S4UHAC","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | awake | 70 | 122/80 (94) | – | – | – | 1.81 | Load "Induction after fentanyl and midazolam" at ×4, Bookmark |
| 2.3 | 00:10 | 4 | premedicated | 71 | 123/81 (96) | 96 | 36 | – | 1.81 | premedication given by itself |
| 24.8 | 01:40 | 4 | premedicated | 63 | 120/75 (89) | 99 | 43 | 0 | 2.85 | RR limit alarm raised {"alarm":"RR TOO LOW","alarmButton":"No alarms"} |
| 27.9 | 01:52 | 4 | premedicated | 64 | 120/75 (90) | 99 | 44 | 0 | 2.94 | Acknowledge (alarm button → Devices & alarms) |
| 30.5 | 02:03 | 4 | premedicated | 63 | 119/74 (88) | 99 | 45 | 6 | 2.94 | 2:00 |
| 46.4 | 03:06 | 4 | induced | 60 | 115/71 (85) | 99 | 48 | 5 | 2.52 | press **Induce now** |
| 59.9 | 04:00 | 4 | induced | 59 | 89/52 (62) | 99 | 0 | 0 | 2.75 | CO2 apnoea alarm |
| 62.7 | 04:12 | 4 | ventilated | 59 | 88/51 (62) | 99 | 0 | 3 | 2.85 | press **Intubate and ventilate** |
| 63.8 | 04:16 | 4 | ventilated | 59 | 85/49 (59) | 99 | 48 | 3 | 2.85 | MAP below 60 |
| 66.6 | 04:27 | 4 | maintained | 56 | 77/43 (52) | 99 | 45 | 4 | 2.85 | press **Ephedrine 10 mg** |
| 92.8 | 06:12 | 4 | maintained | 59 | 94/54 (65) | 99 | 39 | 12 | 3.27 | MAP back to 65 |
| 120.5 | 08:03 | 4 | maintained | 61 | 102/60 (72) | 99 | 39 | 12 | 3.23 | end (8:00) |
| 124.3 | 08:18 | 4 | maintained | 61 | 102/60 (72) | 99 | 39 | 12 | 3.14 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 awake · 00:10 premedicated · 03:03 induced · 04:09 ventilated · 04:24 ephedrine · 04:26 maintained

Alarms raised: 01:40 RR TOO LOW · 01:53 RR TOO LOW · 02:05 RR TOO LOW · 03:09 AWRR TOO LOW · 03:29 ETCO2 TOO HIGH · 03:33 ETCO2 TOO HIGH · 03:43 ETCO2 TOO LOW · 04:00 CO2 APNEA · 04:14 RR TOO LOW · 04:14 AWRR TOO LOW · 04:17 ART DIA TOO LOW · 04:17 ART MEAN TOO LOW · 04:22 ART SYS TOO LOW

Spans: 

Measures: {"rrAlarm":{"text":"RR TOO LOW","at":"01:40","afterPremedS":89.3,"ackAfterS":10.9,"allAlarms":["01:40 RR TOO LOW","01:53 RR TOO LOW"]},"timings":{"apnoeaAfterInductionS":56.8,"apnoeaAlarmAt":"04:00","intubatedAfterAlarmS":8.7,"intubateAt":"04:09","mapBelow60At":"04:16","mapBelow60AfterInductionS":72.8,"ephedrineAfterMapBelow60S":8.1,"map65AfterEphedrineS":107.9,"mapNadir":52,"apnoeaTimeTakenFrom":"alarm event"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Acknowledge the respiratory-rate alarm (RR below 8/min, about 75 s after the premedication) within 30 sThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Intubate and ventilate within 60 s of the CO₂ apnoea alarm (it sounds about 43 s after induction, 13 s earlier than in the healthy induction)Ventilated breaths 9 s after the alarm Apnoea (no CO₂ breaths) (04:00 → 04:09; within 1 min 00 s asked)."},{"status":"met","text":"✓ Met Give a vasopressor (phenylephrine or ephedrine) within 60 s of the mean arterial pressure falling below 60 mmHgPhenylephrine or Ephedrine 9 s after ART M / NIBP M below 60 mmHg (04:16 → 04:24; within 1 min 00 s asked)."},{"status":"met","text":"✓ Met Mean arterial pressure back above 65 mmHg within 120 s of the vasopressorART M / NIBP M above 65 mmHg 1 min 47 s after Phenylephrine or Ephedrine (04:24 → 06:12; within 2 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"52 mmHg at 04:36","Highest EtCO₂":"51 mmHg at 03:30","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"9 s (04:00 → 04:09)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.38 (7.27–7.41) · Glucose 5.6 mmol/L (5.6–5.6) · Tcore 36.5 °C (36.5–36.8)"},"timelineRows":34,"minuteRows":9}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":121.9,"maxMismatchSoFar":[1,1,1]},{"label":"after Saadat-style → Philips-style","atWallS":122.7,"maxMismatchSoFar":[1,1,1]},{"label":"30 s after the style change","atWallS":152.8,"maxMismatchSoFar":[1,1,1]}],"perPhone":[{"maxMismatchS":1,"worst":{"param":"IBP1","forS":1,"instructorFirst":"113/69","phoneFirst":"115/71","instructorNow":"106/64","phoneNow":"108/65","atWallS":48.1},"samples":305,"compared":301,"commonTiles":10,"sameNumberOtherMarkSamples":125,"holdSamples":0,"status":{"synced":305},"resyncs":1,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"IBP1","forS":1,"instructorFirst":"113/69","phoneFirst":"115/71","instructorNow":"106/64","phoneNow":"108/65","atWallS":48.1},"samples":305,"compared":301,"commonTiles":10,"sameNumberOtherMarkSamples":125,"holdSamples":0,"status":{"synced":305},"resyncs":1,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"IBP1","forS":1,"instructorFirst":"113/69","phoneFirst":"115/71","instructorNow":"106/64","phoneNow":"108/65","atWallS":48.1},"samples":305,"compared":301,"commonTiles":10,"sameNumberOtherMarkSamples":125,"holdSamples":0,"status":{"synced":305},"resyncs":1,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
