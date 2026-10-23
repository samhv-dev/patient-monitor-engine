### A4 haemorrhage E120 course (kit round) (chromium, kit 33a6c92b, load avg 2.66–7.81)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"39FWGK","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | bleeding | 71 | –/– (–) | – | – | – | 6.79 | Load "Class IV haemorrhage, PEA and resuscitation" at ×8, Bookmark |
| 5 | 00:41 | 8 | bleedingO2 | 72 | 120/81 (94) | 96 | 37 | 14 | 6.57 | press **Oxygen by face mask, FiO₂ 1.0** |
| 8.7 | 01:10 | 8 | ventilated | 76 | 119/83 (95) | 99 | 38 | 14 | 7.81 | press **Intubate and ventilate, FiO₂ 1.0** |
| 30.5 | 04:05 | 8 | ventilated | 95 | 107/82 (90) | 99 | 32 | 12 | 6.95 | 4:00 |
| 60.4 | 08:04 | 8 | ventilated | 140 | 74/61 (65) | 99 | 25 | 13 | 5.81 | 8:00 |
| 69.8 | 09:19 | 8 | junctional | 161 | 55/44 (48) | 99 | 22 | 14 | 5.45 | the card sets the junctional rhythm |
| 86.7 | 10:27 | 4 | pea | 50 | 19/13 (15) | 99 | 16 | 15 | 6.18 | state PEA |
| 94.6 | 10:59 | 4 | pea | 50 | –/– (9) | 99 | 13 | 16 | 5.98 | the model's pulse loss |
| 129.9 | 15:39 | 1 | asystole | 16 | –/– (5) | – | 0 | 12 | 5.86 | state Asystole |
| 132.7 | 15:41 | 1 | cpr | 0 | –/– (4) | – | 0 | 12 | 5.86 | press **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** |
| 133.6 | 15:42 | 1 | cprVolume | – | –/– (8) | – | 0 | 12 | 5.86 | press **2 L warmed crystalloid and 2 units of red cells** |
| 153 | 16:02 | 1 | cprEpi | 111 | 33/11 (19) | 99 | 6 | 12 | 5.33 | press **Epinephrine 1 mg** |
| 162.8 | 16:41 | 4 | cprRunning | 108 | 53/22 (34) | 99 | 13 | 10 | 4.97 | 1 min into CPR |
| 178.5 | 17:40 | 1 | vf | 108 | 70/33 (46) | 99 | 19 | 10 | 4.38 | press **Pulse check** |
| 186.3 | 17:48 | 1 | postShock1 | 112 | 70/33 (46) | 99 | 20 | 10 | 4.17 | Defib tab: Shock 200 J → asystole |
| 201.7 | 18:48 | 4 | postShock1 | 105 | 74/38 (51) | 99 | 23 | 10 | 3.9 | 1 min after the first shock |
| 217.3 | 19:47 | 1 | vf2 | 107 | 75/38 (51) | 99 | 25 | 10 | 3.55 | press **Pulse check** |
| 225.1 | 19:55 | 1 | postShock2 | 110 | 74/38 (51) | 99 | 25 | 10 | 3.4 | Defib tab: Shock 200 J → pea |
| 287.6 | 20:58 | 1 | postShock2 | 124 | 77/40 (53) | 99 | 27 | 10 | 2.75 | return of circulation (the model) |
| 290.4 | 21:00 | 1 | rosc | 112 | 115/55 (81) | 99 | 27 | 10 | 2.77 | press **Pulse back: stop CPR** |
| 305.3 | 22:00 | 4 | rosc | 72 | 135/83 (100) | 99 | 46 | 12 | 2.66 | 1 min after stopping CPR |

States: 00:02 bleeding · 00:35 bleedingO2 · 01:04 ventilated · 09:18 junctional · 10:26 pea · 15:37 asystole · 15:41 cpr · 15:41 cprVolume · 15:43 cprRunning · 16:01 cprEpi · 16:03 cprRunning · 17:39 vf · 17:48 postShock1 · 19:46 vf2 · 19:55 postShock2 · 21:00 rosc

Alarms raised: 06:23 ETCO2 TOO LOW · 08:21 SPO2 LOW PERFUSION · 08:27 ART SYS TOO LOW · 08:36 ART MEAN TOO LOW · 08:49 HR TOO HIGH · 10:05 ART DIA TOO LOW · 10:11 IBP1 STATIC PRESSURE · 10:16 ART SYS TOO LOW · 10:16 ART DIA TOO LOW · 10:50 IBP1 STATIC PRESSURE · 10:57 SPO2 LOW PERFUSION · 11:06 HR TOO LOW · 11:09 SPO2 NO PULSE · 11:51 CO2 APNEA · 15:39 ECG ASYSTOLE · 15:47 ART SYS TOO LOW · 15:47 ART DIA TOO LOW · 15:55 AWRR TOO LOW · 15:55 ETCO2 TOO LOW · 15:57 SPO2 LOW PERFUSION · 17:42 ECG VFIB · 19:49 ECG VFIB · 21:02 ART SYS TOO HIGH · 21:02 ART MEAN TOO HIGH · 21:03 ART DIA TOO HIGH

Spans: 

Measures: {"a4haemorrhage":{"states":[{"t":2,"id":"bleeding"},{"t":35.2,"id":"bleedingO2"},{"t":64.4,"id":"ventilated"},{"t":558,"id":"junctional"},{"t":626.6,"id":"pea"},{"t":937.2,"id":"asystole"},{"t":941.1,"id":"cpr"},{"t":941.9,"id":"cprVolume"},{"t":943.9,"id":"cprRunning"},{"t":961.3,"id":"cprEpi"},{"t":963.6,"id":"cprRunning"},{"t":1059.6,"id":"vf"},{"t":1068.1,"id":"postShock1"},{"t":1186.9,"id":"vf2"},{"t":1195.3,"id":"postShock2"},{"t":1260,"id":"rosc"}],"junctionalAt":"09:19","peaStateAt":"10:27","pulseLossAt":"10:59","idioventricularAt":"12:57","asystoleAt":"15:38","asystoleAfterLossS":279.4,"cprAt":"15:41","pulseCheck1At":"17:39","shock1At":"17:48","shock1":"asystole","pulseCheck2At":"19:46","shock2At":"19:55","shock2":"pea","roscAt":"20:57","roscAfterShock2S":62.7,"roscAfterLossS":598.9,"rhythms":["00:05 sinus","09:19 junctionalEscape","12:57 agonal","15:30 asystole","17:40 vfCoarse","17:49 asystole","19:47 vfCoarse","19:56 asystole","19:59 sinus"],"stopAt":"21:00","artMeanMaxInCpr":46.1,"etco2MaxInCpr":19},"pdf":{"pages":8,"a4":true,"title":"Debrief Class IV haemorrhage, PEA and resuscitation 2026-10-23"},"handoutPdf":{"pages":1}}

Debrief: {"objectives":[{"status":"not assessable","mark":"not-assessable","text":"– Not assessable Recognise PEA from hypovolaemiaThis objective has no rule: the instructor judges it."},{"status":"not met","mark":"not-observed","text":"✗ Not observed Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm) 4 min 42 s of 30 sCPR 4 min 42 s after the pulse loss (10:59 → 15:41; within 30 s asked)."},{"status":"not met","mark":"not-observed","text":"✗ Not observed Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm) 9 min 59 s of 6 min 00 sThe return of circulation 9 min 59 s after the pulse loss (10:59 → 20:58; within 6 min 00 s asked)."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"3 mmHg at 11:11","Highest EtCO₂":"46 mmHg at 21:53","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"none after the alarm at 11:51","Pulseless":"9 min 59 s in all; first lost at 10:59","Return of circulation":"9 min 59 s after the pulse loss (20:58)","Epinephrine, boluses in all":"1 mg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.4 mmol/L (4.2–4.5) · Lactate 4.7 mmol/L (1.0–4.7) · pH 7.16 (7.13–7.41) · Glucose 7.5 mmol/L (5.6–7.5) · Tcore 36.2 °C (36.1–36.8)"},"timelineRows":74,"minuteRows":23}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1,"worst":{"param":"HR","forS":1,"instructorFirst":"92","phoneFirst":"98","instructorNow":"107","phoneNow":"92","atWallS":188.9},"samples":618,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":242,"holdSamples":0,"status":{"synced":618},"resyncs":3,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"HR","forS":1,"instructorFirst":"92","phoneFirst":"98","instructorNow":"107","phoneNow":"92","atWallS":188.9},"samples":618,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":243,"holdSamples":0,"status":{"synced":618},"resyncs":3,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"HR","forS":1,"instructorFirst":"92","phoneFirst":"98","instructorNow":"107","phoneNow":"92","atWallS":188.9},"samples":618,"compared":614,"commonTiles":10,"sameNumberOtherMarkSamples":243,"holdSamples":0,"status":{"synced":618},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
