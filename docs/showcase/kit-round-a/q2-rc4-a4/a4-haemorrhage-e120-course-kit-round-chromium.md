### A4 haemorrhage E120 course (kit round) (chromium, kit 0c4b396f, load avg 2.43–3.45)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"Q5AB7P","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"!! EtCO₂ high +1"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | bleeding | 71 | –/– (–) | – | – | – | 2.79 | Load "Class IV haemorrhage, PEA and resuscitation" at ×8, Bookmark |
| 5 | 00:41 | 8 | bleedingO2 | 72 | 120/81 (94) | 96 | 37 | 14 | 2.65 | press **Oxygen by face mask, FiO₂ 1.0** |
| 8.9 | 01:12 | 8 | ventilated | 75 | 118/83 (95) | 99 | 38 | 15 | 3.15 | press **Intubate and ventilate, FiO₂ 1.0** |
| 30.3 | 04:03 | 8 | ventilated | 96 | 108/83 (91) | 99 | 32 | 12 | 3.17 | 4:00 |
| 60.4 | 08:04 | 8 | ventilated | 140 | 75/61 (66) | 99 | 25 | 13 | 3.02 | 8:00 |
| 69.3 | 09:15 | 8 | junctional | 160 | 56/46 (50) | 99 | 22 | 14 | 3.16 | the card sets the junctional rhythm |
| 87.1 | 10:26 | 4 | pea | 62 | 19/12 (14) | 99 | 16 | 15 | 2.68 | state PEA |
| 95.2 | 10:59 | 4 | pea | 55 | –/– (10) | 99 | 13 | 15 | 2.72 | the model's pulse loss |
| 130.1 | 15:36 | 1 | asystole | 16 | –/– (5) | – | 0 | 12 | 2.78 | state Asystole |
| 133 | 15:38 | 1 | cpr | 16 | –/– (4) | – | 0 | 12 | 2.78 | press **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** |
| 133.8 | 15:39 | 1 | cprVolume | – | –/– (8) | – | 1 | 12 | 2.78 | press **Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g** |
| 153.2 | 15:59 | 1 | cprEpi | 111 | 35/12 (20) | 99 | 6 | 12 | 2.85 | press **Epinephrine 1 mg** |
| 163.2 | 16:39 | 4 | cprRunning | 108 | 63/27 (40) | 99 | 14 | 10 | 3.45 | 1 min into CPR |
| 178.9 | 17:38 | 1 | vf | 105 | 74/37 (50) | 99 | 20 | 10 | 3.42 | press **Rhythm check** |
| 186.7 | 17:46 | 1 | postShock1 | 114 | –/– (28) | – | 19 | 10 | 3.13 | Defib tab: Shock 200 J → asystole |
| 202.1 | 18:46 | 4 | postShock1 | 109 | 74/37 (50) | 99 | 22 | 10 | 3.02 | 1 min after the first shock |
| 205.5 | 19:00 | 4 | postShock1Running | 110 | 74/38 (51) | 99 | 22 | 10 | 3.1 | press **Epinephrine 1 mg** |
| 217.6 | 19:45 | 1 | vf2 | 109 | 73/35 (50) | 99 | 24 | 10 | 3.23 | press **Rhythm check** |
| 225.4 | 19:53 | 1 | postShock2 | 111 | –/– (30) | – | 23 | 10 | 3.28 | Defib tab: Shock 200 J → pea |
| 241.6 | 20:56 | 4 | postShock2 | 118 | 75/38 (51) | 99 | 24 | 10 | 2.85 | return of circulation (the model) |
| 255.5 | 21:51 | 1 | postShock2 | 109 | 140/74 (97) | 99 | 46 | 10 | 2.73 | 2 min after the second shock: rhythm check |
| 258.3 | 21:54 | 1 | rosc | 106 | 137/74 (98) | 99 | 47 | 10 | 2.73 | press **Rhythm check: pulse back, stop CPR** |
| 273.4 | 22:54 | 4 | rosc | 74 | 141/94 (110) | 99 | 54 | 12 | 2.43 | 1 min after stopping CPR |

States: 00:02 bleeding · 00:34 bleedingO2 · 01:06 ventilated · 09:15 junctional · 10:26 pea · 15:35 asystole · 15:38 cpr · 15:39 cprVolume · 15:41 cprRunning · 15:58 cprEpi · 16:01 cprRunning · 17:37 vf · 17:45 postShock1 · 18:57 postShock1Epi · 18:59 postShock1Running · 19:44 vf2 · 19:52 postShock2 · 21:53 rosc

Alarms raised: 06:19 ETCO2 TOO LOW · 08:26 SPO2 LOW PERFUSION · 08:28 ART SYS TOO LOW · 08:36 ART MEAN TOO LOW · 08:50 HR TOO HIGH · 10:04 ART DIA TOO LOW · 10:46 IBP1 STATIC PRESSURE · 10:55 SPO2 LOW PERFUSION · 11:06 SPO2 NO PULSE · 11:09 HR TOO LOW · 11:09 NIBP MEASUREMENT FAILED · 11:53 CO2 APNEA · 15:38 ECG ASYSTOLE · 15:44 ART SYS TOO LOW · 15:44 ART DIA TOO LOW · 15:47 NIBP MEASUREMENT FAILED · 15:52 AWRR TOO LOW · 15:52 ETCO2 TOO LOW · 15:55 SPO2 LOW PERFUSION · 17:40 ECG VFIB · 17:43 IBP1 STATIC PRESSURE · 17:44 SPO2 NO PULSE · 17:51 ART DIA TOO LOW · 18:02 SPO2 LOW PERFUSION · 19:47 ECG VFIB · 19:50 ART DIA TOO LOW · 19:51 SPO2 NO PULSE · 19:51 IBP1 STATIC PRESSURE · 20:09 SPO2 LOW PERFUSION · 20:47 NIBP MEASUREMENT FAILED · 21:01 ART SYS TOO HIGH · 21:01 ART DIA TOO HIGH · 21:01 ART MEAN TOO HIGH · 21:05 SPO2 LOW SIGNAL IQ · 22:23 ETCO2 TOO HIGH

Spans: 

Measures: {"a4haemorrhage":{"states":[{"t":2,"id":"bleeding"},{"t":34.7,"id":"bleedingO2"},{"t":66,"id":"ventilated"},{"t":555.5,"id":"junctional"},{"t":626.6,"id":"pea"},{"t":935.6,"id":"asystole"},{"t":938.2,"id":"cpr"},{"t":939,"id":"cprVolume"},{"t":941,"id":"cprRunning"},{"t":958.4,"id":"cprEpi"},{"t":961,"id":"cprRunning"},{"t":1057.5,"id":"vf"},{"t":1065.9,"id":"postShock1"},{"t":1137,"id":"postShock1Epi"},{"t":1139.2,"id":"postShock1Running"},{"t":1184.4,"id":"vf2"},{"t":1192.8,"id":"postShock2"},{"t":1313.4,"id":"rosc"}],"junctionalAt":"09:15","peaStateAt":"10:26","pulseLossAt":"10:59","idioventricularAt":"12:55","asystoleAt":"15:35","asystoleAfterLossS":276.3,"cprAt":"15:38","rhythmCheck1At":"17:37","shock1At":"17:45","shock1":"asystole","epinephrine2At":"18:56","rhythmCheck2At":"19:44","shock2At":"19:52","shock2":"pea","roscAt":"20:56","roscAfterShock2S":64.1,"roscAfterLossS":597.7,"rhythms":["00:05 sinus","09:16 junctionalEscape","12:55 agonal","15:28 asystole","17:38 vfCoarse","17:46 asystole","19:45 vfCoarse","19:53 asystole","19:57 sinus"],"stopAt":"21:53","stopAfterRoscS":56.6,"artMeanMaxInCpr":50.3,"etco2MaxInCpr":20},"pdf":{"pages":8,"a4":true,"title":"Debrief Class IV haemorrhage, PEA and resuscitation 2026-10-29"},"handoutPdf":{"pages":1}}

Debrief: {"objectives":[{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Recognise PEA from hypovolaemia: a rhythm on the ECG with no palpable pulse (pseudo-PEA at ART about 20/14: name it)This objective has no rule: the instructor judges it."},{"status":"not met","mark":"not-observed","text":"✗ Not observed Start CPR and volume as soon as the pulse is lost (debrief: CPR within 30 s of the pulse loss); the demo withholds both on purpose so that the audience sees the decay 4 min 39 s of 30 sCPR 4 min 39 s after the pulse loss (10:59 → 15:38; within 30 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Recognise the return of circulation on the arterial line and the capnogram at the rhythm check, and stop CPR (debrief: within 120 s of the return of circulation) 57 s of 2 min 00 sThe state \"Return of circulation: CPR stopped, ventilator 12 × 500, PEEP 5, FiO₂ 1.0\" 57 s after the return of circulation (20:56 → 21:53; within 2 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"3 mmHg at 11:17","Highest EtCO₂":"54 mmHg at 22:47","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"none after the alarm at 11:53","Pulseless":"9 min 57 s in all; first lost at 10:59","Return of circulation":"9 min 57 s after the pulse loss (20:56)","Epinephrine, boluses in all":"2 mg (2 doses)","Labs (the model): last (lowest–highest)":"K⁺ 4.5 mmol/L (4.2–4.7) · Lactate 4.9 mmol/L (1.0–4.9) · pH 7.18 (7.14–7.41) · Glucose 7.7 mmol/L (5.6–7.7) · Tcore 36.4 °C (36.3–36.8)"},"timelineRows":95,"minuteRows":23}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":3.5,"worst":{"param":"NIBP","forS":3.5,"instructorFirst":"62","phoneFirst":"70","instructorNow":"122","phoneNow":"114","atWallS":88.7},"samples":555,"compared":549,"commonTiles":10,"sameNumberOtherMarkSamples":292,"holdSamples":2,"status":{"synced":555},"resyncs":2,"lagS":0.1},{"maxMismatchS":3.5,"worst":{"param":"NIBP","forS":3.5,"instructorFirst":"62","phoneFirst":"70","instructorNow":"122","phoneNow":"114","atWallS":88.7},"samples":555,"compared":549,"commonTiles":10,"sameNumberOtherMarkSamples":286,"holdSamples":2,"status":{"synced":555},"resyncs":2,"lagS":0.1},{"maxMismatchS":3.5,"worst":{"param":"NIBP","forS":3.5,"instructorFirst":"62","phoneFirst":"70","instructorNow":"122","phoneNow":"114","atWallS":88.7},"samples":555,"compared":548,"commonTiles":10,"sameNumberOtherMarkSamples":271,"holdSamples":3,"status":{"synced":555},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
