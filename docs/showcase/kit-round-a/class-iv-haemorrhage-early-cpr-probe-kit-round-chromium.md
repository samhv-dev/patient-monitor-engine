### Class IV haemorrhage, early CPR probe (kit round) (chromium, kit 56f3761f, load avg 2.82–3.41)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"Y6DRKC","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"!! EtCO₂ low"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | bleeding | 71 | 118/81 (93) | 96 | 35 | 19 | 2.82 | Load "Class IV haemorrhage, PEA and resuscitation" at ×8, Bookmark |
| 128.2 | 10:05 | 1 | bleeding | 97 | –/– (13) | 99 | 18 | 15 | 3.24 | IBP1 STATIC PRESSURE (before SPO2 NO PULSE) |
| 131.1 | 10:08 | 1 | resuscitation | 82 | –/– (13) | 99 | 17 | 15 | 3.24 | press **Start CPR, 2 L and epinephrine** |
| 137.1 | 10:55 | 8 | resuscitation | 138 | 96/71 (79) | 99 | 17 | 16 | 3.41 | systolic above 90 |
| 137.9 | 11:02 | 8 | rosc | 138 | 104/88 (93) | 99 | 17 | 16 | 3.41 | press **Pulse back: stop CPR** |

States: 00:01 bleeding · 10:07 resuscitation · 10:55 rosc

Alarms raised: 07:46 ART SYS TOO LOW · 08:21 SPO2 LOW PERFUSION · 08:35 ART MEAN TOO LOW · 08:49 HR TOO HIGH · 09:01 ART DIA TOO LOW · 09:51 ETCO2 TOO LOW · 10:05 IBP1 STATIC PRESSURE · 10:13 ART SYS TOO LOW · 10:13 ART DIA TOO LOW · 11:17 ART DIA TOO HIGH

Spans: 

Measures: {"earlyCpr":{"staticAt":"10:05","cprAt":"10:07","noPulseAlarmBeforeCpr":false,"noPulseAlarmAt":null,"vfAlarm":"none","systolicAbove90AfterCprS":47.9,"bestSystolicAfterCpr":95.8}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise PEA from hypovolaemiaThis objective has no rule: the instructor judges it."},{"status":"not assessable","text":"– Not assessable Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm)The pulse loss did not happen."},{"status":"not assessable","text":"– Not assessable Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm)The pulse loss did not happen."}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"13 mmHg at 10:07","Highest EtCO₂":"35 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"1 mg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.3 mmol/L (1.0–2.3) · pH 7.37 (7.37–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.6 °C (36.6–36.8)"},"timelineRows":26,"minuteRows":12}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"78","instructorNow":"109","phoneNow":"116","atWallS":131.4},"samples":278,"compared":274,"commonTiles":10,"holdSamples":0,"status":{"synced":278},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"78","instructorNow":"109","phoneNow":"116","atWallS":131.4},"samples":278,"compared":274,"commonTiles":10,"holdSamples":0,"status":{"synced":278},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"78","instructorNow":"109","phoneNow":"116","atWallS":131.4},"samples":278,"compared":274,"commonTiles":10,"holdSamples":0,"status":{"synced":278},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
