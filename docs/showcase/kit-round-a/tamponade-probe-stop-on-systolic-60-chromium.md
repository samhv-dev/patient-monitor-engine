### Tamponade (kit round) (chromium, kit 56f3761f, load avg 3.31–5.99)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"C26F68","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"*** Asystole +7"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 3.59 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 3.46 | 1:00 {"tiles":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"lanes":[]} |
| 22.9 | 03:04 | 8 | arrival | 111 | 99/83 (88) | 99 | 29 | 14 | 3.43 | 3:00 |
| 45.5 | 06:04 | 8 | arrival | 134 | 80/69 (72) | 99 | 24 | 15 | 4.08 | 6:00 |
| 53.4 | 07:06 | 1 | deteriorating | 147 | 62/54 (57) | 99 | 21 | 16 | 3.99 | 7:00 ×1 |
| 96.2 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 3.31 | state PEA |
| 105.2 | 07:58 | 1 | pea | 42 | –/– (19) | – | 11 | 16 | 4.64 | SPO2 NO PULSE |
| 108 | 08:00 | 1 | cpr | 42 | –/– (20) | – | 11 | 16 | 4.64 | press **Start CPR, intubate, FiO₂ 1.0** |
| 121.5 | 10:04 | 1 | cpr | 106 | 41/20 (28) | 99 | 9 | 12 | 4.9 | after the 2-min fast-forward |
| 122.4 | 10:05 | 1 | cprDrained | 106 | 40/20 (28) | 99 | 9 | 12 | 4.9 | press **Pericardiocentesis during CPR** |
| 141.5 | 11:20 | 1 | cprDrained | 107 | 69/32 (45) | 99 | 18 | 12 | 5.99 | ≈ 75 s after drainage, ×1 |
| 141.5 | 11:20 | 1 | cprDrained | 107 | 69/32 (45) | 99 | 18 | 12 | 5.99 | pulse back on the arterial line (systolic > 60) |
| 144.4 | 11:23 | 1 | rosc | 107 | 70/32 (45) | 99 | 19 | 12 | 5.99 | press **Pulse back: stop CPR** |
| 173.6 | 11:52 | 1 | rosc | 20 | –/– (19) | – | 10 | 12 | 5.92 | 30 s after stopping CPR |
| 174.5 | 11:53 | 1 | roscFluid | 20 | –/– (19) | – | 9 | 12 | 5.92 | press **Crystalloid 500 mL** |
| 198.4 | 15:05 | 8 | roscFluid | 0 | –/– (21) | – | 0 | 12 | 5.04 | 15:00 |
| 202.2 | 15:35 | 8 | roscFluid | 0 | –/– (22) | – | 0 | 12 | 4.8 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 arrival · 06:14 deteriorating · 07:49 pea · 08:00 cpr · 10:04 cprDrained · 11:22 rosc · 11:53 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:58 SPO2 NO PULSE · 08:06 ART SYS TOO LOW · 08:06 ART DIA TOO LOW · 08:16 SPO2 LOW PERFUSION · 11:29 IBP1 STATIC PRESSURE · 11:34 SPO2 NO PULSE · 11:38 HR TOO LOW · 12:31 CO2 APNEA · 13:44 ECG ASYSTOLE · 15:35 ***ASYSTOLE · 15:35 ***APNEA · 15:35 SpO2 NON-PULSAT. · 15:35 ABP NON-PULSATILE · 15:38 **ABPm 22<70 · 15:38 **CVP 20>10 · 15:39 **ABPs 22<90 · 15:39 **ABPd 22<50

Spans: {"min":2,"via":"button","clockBefore":"08:00","fromT":481,"endT":601,"wallS":10.5,"speedBefore":1,"speedAfter":1,"rateAfter3s":1,"banner":"Fast-forwarded 2 min, 08:00 → 10:00. During it: ART SYS TOO LOW 08:06, ART DIA TOO LOW 08:06, SPO2 LOW PERFUSION 08:16.","alarms":["08:06 ART SYS TOO LOW","08:06 ART DIA TOO LOW","08:16 SPO2 LOW PERFUSION"],"load1":4.9}

Measures: {"cvp":{"tilesAt1min":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"cvpTiles":[],"lanes":[],"cvpOnLanes":[]},"tamponade":{"peaStateAt":"07:49","noPulseAlarmAt":"07:58","cprAt":"08:00","cprAfterAlarmS":2.1,"drainedAt":"10:04","drainAfterCprS":124.3,"pulseBackSeenAt":"11:20","stopCprAt":"11:22","stopAfterSeenS":2.1,"noPulseAlarmTakenFrom":"alarm event"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Start CPR within 10 s of the pulse lossCPR 12 s after the pulse loss (07:48 → 08:00; within 10 s asked)."},{"status":"not met","text":"✗ Not met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 2 min 04 s after CPR (08:00 → 10:04; within 2 min 00 s asked)."},{"status":"not assessable","text":"– Not assessable Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe return of circulation did not happen."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"19 mmHg at 11:55","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Apnoea alarm to ventilated breaths":"none after the alarm at 12:31","Pulseless":"7 min 17 s in all; first lost at 07:48","Return of circulation":"not during the run","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.3) · Lactate 3.5 mmol/L (1.0–3.5) · pH 7.17 (7.17–7.41) · Glucose 6.2 mmol/L (5.6–6.2) · Tcore 36.7 °C (36.7–36.8)"},"timelineRows":45,"minuteRows":16}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":199.7,"maxMismatchSoFar":[1,1,1]},{"label":"after Saadat-style → Philips-style","atWallS":200.6,"maxMismatchSoFar":[1,1,1]},{"label":"30 s after the style change","atWallS":230.6,"maxMismatchSoFar":[1,1,1]}],"perPhone":[{"maxMismatchS":1,"worst":{"param":"SpO2","forS":1,"instructorFirst":"99?","phoneFirst":"99","instructorNow":"99?","phoneNow":"99","atWallS":42.6},"samples":460,"compared":427,"commonTiles":10,"holdSamples":0,"status":{"synced":460},"resyncs":3,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"SpO2","forS":1,"instructorFirst":"99?","phoneFirst":"99","instructorNow":"99?","phoneNow":"99","atWallS":42.6},"samples":460,"compared":427,"commonTiles":10,"holdSamples":0,"status":{"synced":460},"resyncs":3,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"SpO2","forS":1,"instructorFirst":"99?","phoneFirst":"99","instructorNow":"99?","phoneNow":"99","atWallS":42.6},"samples":460,"compared":427,"commonTiles":10,"holdSamples":0,"status":{"synced":460},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
