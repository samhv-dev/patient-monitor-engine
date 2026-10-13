### Tamponade (kit round) (webkit, kit 56f3761f, load avg 1.8–2.73)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"MVJ94S","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** CVP high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 2.73 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 2.51 | 1:00 {"tiles":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"lanes":[]} |
| 22.9 | 03:04 | 8 | arrival | 111 | 99/83 (88) | 99 | 29 | 14 | 2.52 | 3:00 |
| 45.5 | 06:05 | 8 | arrival | 134 | 79/68 (72) | 99 | 24 | 15 | 2.05 | 6:00 |
| 53.4 | 07:06 | 1 | deteriorating | 147 | 62/54 (57) | 99 | 21 | 16 | 2.2 | 7:00 ×1 |
| 96.1 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 2.31 | state PEA |
| 104.8 | 07:58 | 1 | pea | 42 | –/– (19) | – | 11 | 16 | 2.2 | SPO2 NO PULSE |
| 107.7 | 08:00 | 1 | cpr | 42 | –/– (20) | – | 11 | 16 | 2.03 | press **Start CPR, intubate, FiO₂ 1.0** |
| 120.8 | 10:04 | 1 | cpr | 106 | 41/20 (28) | 99 | 9 | 12 | 1.8 | after the 2-min fast-forward |
| 121.6 | 10:04 | 1 | cprDrained | 106 | 41/20 (28) | 99 | 9 | 12 | 1.8 | press **Pericardiocentesis during CPR** |
| 140.6 | 11:20 | 1 | cprDrained | 107 | 69/32 (45) | 99 | 18 | 12 | 1.92 | ≈ 75 s after drainage, ×1 |
| 159.8 | 11:39 | 1 | cprDrained | 110 | 70/32 (45) | 99 | 20 | 12 | 2.1 | pulse back (the model's return of circulation) |
| 162.7 | 11:42 | 1 | rosc | 110 | 104/58 (81) | 99 | 20 | 12 | 2.01 | press **Pulse back: stop CPR** |
| 192 | 12:11 | 1 | rosc | 64 | 118/79 (92) | 99 | 28 | 12 | 2.23 | 30 s after stopping CPR |
| 192.9 | 12:12 | 1 | roscFluid | 64 | 118/79 (92) | 99 | 28 | 12 | 2.23 | press **Crystalloid 500 mL** |
| 214.6 | 15:06 | 8 | roscFluid | 60 | 118/75 (89) | 99 | 40 | 20 | 2.09 | 15:00 |
| 218.4 | 15:36 | 8 | roscFluid | 61 | 118/74 (88) | 99 | 40 | 19 | 2.25 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 arrival · 06:13 deteriorating · 07:49 pea · 08:00 cpr · 10:04 cprDrained · 11:41 rosc · 12:11 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:58 SPO2 NO PULSE · 08:06 ART SYS TOO LOW · 08:06 ART DIA TOO LOW · 08:16 SPO2 LOW PERFUSION · 11:45 ART DIA TOO HIGH · 11:45 ART MEAN TOO HIGH · 11:46 ART SYS TOO HIGH · 15:39 **CVP 11>10

Spans: {"min":2,"via":"button","clockBefore":"08:00","fromT":481,"endT":601,"wallS":10.1,"speedBefore":1,"speedAfter":1,"rateAfter3s":1,"banner":"Fast-forwarded 2 min, 08:01 → 10:01. During it: ART SYS TOO LOW 08:06, ART DIA TOO LOW 08:06, SPO2 LOW PERFUSION 08:16.","alarms":["08:06 ART SYS TOO LOW","08:06 ART DIA TOO LOW","08:16 SPO2 LOW PERFUSION"],"load1":1.8}

Measures: {"cvp":{"tilesAt1min":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"cvpTiles":[],"lanes":[],"cvpOnLanes":[]},"tamponade":{"peaStateAt":"07:49","noPulseAlarmAt":"07:58","cprAt":"08:00","cprAfterAlarmS":2.2,"drainedAt":"10:04","drainAfterCprS":124,"pulseBackSeenAt":"11:39","stopCprAt":"11:41","stopAfterSeenS":2,"noPulseAlarmTakenFrom":"alarm event"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Start CPR within 10 s of the pulse lossCPR 12 s after the pulse loss (07:48 → 08:00; within 10 s asked)."},{"status":"not met","text":"✗ Not met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 2 min 04 s after CPR (08:00 → 10:04; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (11:39 → 11:41; within 30 s asked)."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"19 mmHg at 07:58","Highest EtCO₂":"40 mmHg at 13:08","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 51 s in all; first lost at 07:48","Return of circulation":"3 min 51 s after the pulse loss (11:39)","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.3) · Lactate 2.2 mmol/L (1.0–2.4) · pH 7.35 (7.26–7.41) · Glucose 6.0 mmol/L (5.6–6.0) · Tcore 36.7 °C (36.7–36.8)"},"timelineRows":44,"minuteRows":16}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":216,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"after Saadat-style → Philips-style","atWallS":216.8,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"30 s after the style change","atWallS":246.9,"maxMismatchSoFar":[1.5,1.5,1.5]}],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":493,"compared":459,"commonTiles":10,"sameNumberOtherMarkSamples":318,"holdSamples":0,"status":{"synced":493},"resyncs":3,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":493,"compared":459,"commonTiles":10,"sameNumberOtherMarkSamples":319,"holdSamples":0,"status":{"synced":493},"resyncs":3,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":493,"compared":459,"commonTiles":10,"sameNumberOtherMarkSamples":321,"holdSamples":0,"status":{"synced":493},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
