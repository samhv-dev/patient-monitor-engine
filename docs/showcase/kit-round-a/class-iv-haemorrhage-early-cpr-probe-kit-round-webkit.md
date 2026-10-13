### Class IV haemorrhage, early CPR probe (kit round) (webkit, kit 56f3761f, load avg 2.33–3.04)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"PM3272","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"!!! ART D high +1"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | bleeding | 71 | 118/81 (93) | 96 | 35 | 19 | 3.04 | Load "Class IV haemorrhage, PEA and resuscitation" at ×8, Bookmark |
| 126.9 | 10:05 | 1 | bleeding | 97 | –/– (13) | 99 | 18 | 15 | 2.33 | IBP1 STATIC PRESSURE (before SPO2 NO PULSE) |
| 129.8 | 10:07 | 1 | resuscitation | 87 | –/– (13) | 99 | 17 | 15 | 2.33 | press **Start CPR, 2 L and epinephrine** |
| 135.8 | 10:55 | 8 | resuscitation | 124 | 94/71 (79) | 99 | 17 | 16 | 2.62 | systolic above 90 |
| 136.6 | 11:02 | 8 | rosc | 137 | 103/88 (93) | 99 | 17 | 16 | 2.62 | press **Pulse back: stop CPR** |

States: 00:01 bleeding · 10:07 resuscitation · 10:56 rosc

Alarms raised: 07:46 ART SYS TOO LOW · 08:21 SPO2 LOW PERFUSION · 08:35 ART MEAN TOO LOW · 08:49 HR TOO HIGH · 09:01 ART DIA TOO LOW · 09:51 ETCO2 TOO LOW · 10:05 IBP1 STATIC PRESSURE · 10:12 ART SYS TOO LOW · 10:12 ART DIA TOO LOW · 11:18 ART DIA TOO HIGH

Spans: 

Measures: {"earlyCpr":{"staticAt":"10:05","cprAt":"10:07","noPulseAlarmBeforeCpr":false,"noPulseAlarmAt":null,"vfAlarm":"none","systolicAbove90AfterCprS":48,"bestSystolicAfterCpr":94.4}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise PEA from hypovolaemiaThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm)The pulse loss did not happen."},{"status":"not assessable","text":"– Not assessable Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm)The pulse loss did not happen."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"13 mmHg at 10:07","Highest EtCO₂":"35 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"1 mg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.3 mmol/L (1.0–2.3) · pH 7.37 (7.37–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.6 °C (36.6–36.8)"},"timelineRows":26,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":2.5,"worst":{"param":"IBP1","forS":2.5,"instructorFirst":"44/34","phoneFirst":"42/33","instructorNow":"101/76","phoneNow":"94/71","atWallS":134.4},"samples":276,"compared":273,"commonTiles":10,"sameNumberOtherMarkSamples":167,"holdSamples":0,"status":{"synced":276},"resyncs":2,"lagS":0.1},{"maxMismatchS":2.5,"worst":{"param":"IBP1","forS":2.5,"instructorFirst":"44/34","phoneFirst":"42/33","instructorNow":"101/76","phoneNow":"94/71","atWallS":134.4},"samples":276,"compared":273,"commonTiles":10,"sameNumberOtherMarkSamples":176,"holdSamples":0,"status":{"synced":276},"resyncs":2,"lagS":0.1},{"maxMismatchS":2.5,"worst":{"param":"IBP1","forS":2.5,"instructorFirst":"44/34","phoneFirst":"42/33","instructorNow":"101/76","phoneNow":"94/71","atWallS":134.4},"samples":276,"compared":273,"commonTiles":10,"sameNumberOtherMarkSamples":166,"holdSamples":0,"status":{"synced":276},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
