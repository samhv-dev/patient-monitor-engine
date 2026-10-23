### A4 haemorrhage E120 course (kit round) (webkit, kit 33a6c92b, load avg 1.73–4.5)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"M2WVG3","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","choseAnotherScenarioFirst":"shown, then gone before the click","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | bleeding | 71 | –/– (–) | – | – | – | 3.16 | Load "Class IV haemorrhage, PEA and resuscitation" at ×8, Bookmark |
| 5 | 00:41 | 8 | bleedingO2 | 72 | 120/81 (94) | 96 | 37 | 14 | 3.79 | press **Oxygen by face mask, FiO₂ 1.0** |
| 8.9 | 01:12 | 8 | ventilated | 75 | 119/83 (95) | 99 | 38 | 15 | 3.73 | press **Intubate and ventilate, FiO₂ 1.0** |
| 30.4 | 04:04 | 8 | ventilated | 95 | 108/83 (91) | 99 | 33 | 12 | 4.23 | 4:00 |
| 60.4 | 08:04 | 8 | ventilated | 139 | 75/62 (66) | 99 | 25 | 13 | 4.5 | 8:00 |
| 69.5 | 09:17 | 8 | junctional | 158 | 57/46 (50) | 99 | 22 | 14 | 4.04 | the card sets the junctional rhythm |
| 86.7 | 10:26 | 4 | pea | 50 | 19/14 (15) | 99 | 16 | 15 | 3.7 | state PEA |
| 95.2 | 11:00 | 4 | pea | 50 | –/– (10) | 99 | 13 | 15 | 4.45 | the model's pulse loss |
| 130 | 15:36 | 1 | asystole | 18 | –/– (5) | – | 0 | 12 | 4.34 | state Asystole |
| 132.9 | 15:39 | 1 | cpr | 0 | –/– (5) | – | 1 | 12 | 3.99 | press **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** |
| 133.7 | 15:40 | 1 | cprVolume | – | –/– (9) | – | 0 | 12 | 3.99 | press **2 L warmed crystalloid and 2 units of red cells** |
| 153.2 | 16:00 | 1 | cprEpi | 111 | 33/11 (19) | 99 | 6 | 12 | 3.93 | press **Epinephrine 1 mg** |
| 163 | 16:39 | 4 | cprRunning | 108 | 53/22 (34) | 99 | 13 | 10 | 3.78 | 1 min into CPR |
| 178.7 | 17:38 | 1 | vf | 107 | 70/33 (46) | 99 | 19 | 10 | 3.24 | press **Pulse check** |
| 186.3 | 17:46 | 1 | vf | 84 | 70/33 (46) | 99 | 20 | 10 | 2.74 | Defib tab: Shock 200 J → asystole |
| 201.7 | 18:46 | 4 | postShock1 | 105 | 74/38 (51) | 99 | 23 | 10 | 2.53 | 1 min after the first shock |
| 217.4 | 19:46 | 1 | vf2 | 111 | 74/38 (51) | 99 | 25 | 10 | 2.25 | press **Pulse check** |
| 225.1 | 19:53 | 1 | vf2 | 101 | 74/38 (51) | 99 | 25 | 10 | 2.06 | Defib tab: Shock 200 J → pea |
| 288.3 | 20:57 | 1 | postShock2 | 115 | 76/40 (53) | 99 | 27 | 10 | 1.94 | return of circulation (the model) |
| 291.1 | 20:59 | 1 | rosc | 112 | 99/42 (65) | 99 | 27 | 10 | 1.94 | press **Pulse back: stop CPR** |
| 306 | 21:59 | 4 | rosc | 72 | 136/83 (100) | 99 | 46 | 12 | 1.73 | 1 min after stopping CPR |

States: 00:02 bleeding · 00:35 bleedingO2 · 01:06 ventilated · 09:15 junctional · 10:26 pea · 15:34 asystole · 15:38 cpr · 15:39 cprVolume · 15:41 cprRunning · 15:59 cprEpi · 16:01 cprRunning · 17:37 vf · 17:46 postShock1 · 19:45 vf2 · 19:53 postShock2 · 20:59 rosc

Alarms raised: 06:20 ETCO2 TOO LOW · 08:18 SPO2 LOW PERFUSION · 08:28 ART SYS TOO LOW · 08:36 ART MEAN TOO LOW · 08:49 HR TOO HIGH · 10:05 ART DIA TOO LOW · 10:12 IBP1 STATIC PRESSURE · 10:20 ART SYS TOO LOW · 10:20 ART DIA TOO LOW · 10:46 IBP1 STATIC PRESSURE · 10:55 SPO2 LOW PERFUSION · 11:10 HR TOO LOW · 11:11 SPO2 NO PULSE · 11:53 CO2 APNEA · 15:36 ECG ASYSTOLE · 15:44 ART SYS TOO LOW · 15:44 ART DIA TOO LOW · 15:53 AWRR TOO LOW · 15:53 ETCO2 TOO LOW · 15:55 SPO2 LOW PERFUSION · 17:40 ECG VFIB · 19:48 ECG VFIB · 21:02 ART SYS TOO HIGH · 21:02 ART DIA TOO HIGH · 21:02 ART MEAN TOO HIGH

Spans: 

Measures: {"a4haemorrhage":{"states":[{"t":2,"id":"bleeding"},{"t":35,"id":"bleedingO2"},{"t":66.3,"id":"ventilated"},{"t":555.9,"id":"junctional"},{"t":626.4,"id":"pea"},{"t":934.5,"id":"asystole"},{"t":938.9,"id":"cpr"},{"t":939.8,"id":"cprVolume"},{"t":941.8,"id":"cprRunning"},{"t":959.2,"id":"cprEpi"},{"t":961.5,"id":"cprRunning"},{"t":1057.6,"id":"vf"},{"t":1066.1,"id":"postShock1"},{"t":1185.4,"id":"vf2"},{"t":1193.9,"id":"postShock2"},{"t":1259,"id":"rosc"}],"junctionalAt":"09:17","peaStateAt":"10:26","pulseLossAt":"11:00","idioventricularAt":"12:54","asystoleAt":"15:36","asystoleAfterLossS":276,"cprAt":"15:38","pulseCheck1At":"17:37","shock1At":"17:46","shock1":"asystole","pulseCheck2At":"19:45","shock2At":"19:53","shock2":"pea","roscAt":"20:57","roscAfterShock2S":63.2,"roscAfterLossS":596.8,"rhythms":["00:05 sinus","09:17 junctionalEscape","12:54 agonal","15:27 asystole","17:38 vfCoarse","17:47 asystole","19:46 vfCoarse","19:54 asystole","19:58 sinus"],"stopAt":"20:59","artMeanMaxInCpr":46.4,"etco2MaxInCpr":19},"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only"}

Debrief: {"objectives":[{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Recognise PEA from hypovolaemiaThis objective has no rule: the instructor judges it."},{"status":"not met","mark":"not-observed","text":"✗ Not observed Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm) 4 min 39 s of 30 sCPR 4 min 39 s after the pulse loss (11:00 → 15:38; within 30 s asked)."},{"status":"not met","mark":"not-observed","text":"✗ Not observed Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm) 9 min 57 s of 6 min 00 sThe return of circulation 9 min 57 s after the pulse loss (11:00 → 20:57; within 6 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"3 mmHg at 11:13","Highest EtCO₂":"46 mmHg at 21:57","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"none after the alarm at 11:53","Pulseless":"9 min 57 s in all; first lost at 11:00","Return of circulation":"9 min 57 s after the pulse loss (20:57)","Epinephrine, boluses in all":"1 mg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.4 mmol/L (4.2–4.5) · Lactate 4.7 mmol/L (1.0–4.7) · pH 7.16 (7.13–7.41) · Glucose 7.5 mmol/L (5.6–7.5) · Tcore 36.2 °C (36.1–36.8)"},"timelineRows":74,"minuteRows":22}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"143/65","phoneFirst":"99/42","instructorNow":"142/87","phoneNow":"147/90","atWallS":293.8},"samples":619,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":211,"holdSamples":0,"status":{"synced":619},"resyncs":2,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"143/65","phoneFirst":"99/42","instructorNow":"142/87","phoneNow":"147/90","atWallS":293.8},"samples":619,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":215,"holdSamples":0,"status":{"synced":619},"resyncs":2,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"143/65","phoneFirst":"99/42","instructorNow":"142/87","phoneNow":"147/90","atWallS":293.8},"samples":619,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":217,"holdSamples":0,"status":{"synced":619},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
