### Tamponade (kit round) (chromium, kit 56f3761f, load avg 1.77–2.67)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"C23NE2","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"** CVP high"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 1.87 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 2.04 | 1:00 {"tiles":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"lanes":[]} |
| 22.9 | 03:04 | 8 | arrival | 111 | 99/83 (88) | 99 | 29 | 14 | 2.11 | 3:00 |
| 45.5 | 06:04 | 8 | arrival | 134 | 80/69 (72) | 99 | 24 | 15 | 1.87 | 6:00 |
| 53.4 | 07:06 | 1 | deteriorating | 147 | 62/54 (57) | 99 | 21 | 16 | 2.12 | 7:00 ×1 |
| 96.5 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 2.24 | state PEA |
| 105.1 | 07:58 | 1 | pea | 42 | –/– (19) | – | 11 | 16 | 2.3 | SPO2 NO PULSE |
| 108 | 08:00 | 1 | cpr | 42 | –/– (20) | – | 11 | 16 | 2.2 | press **Start CPR, intubate, FiO₂ 1.0** |
| 121.4 | 10:04 | 1 | cpr | 106 | 41/20 (28) | 99 | 9 | 12 | 2.07 | after the 2-min fast-forward |
| 122.2 | 10:05 | 1 | cprDrained | 106 | 40/20 (28) | 99 | 9 | 12 | 2.07 | press **Pericardiocentesis during CPR** |
| 141.2 | 11:20 | 1 | cprDrained | 107 | 69/32 (45) | 99 | 18 | 12 | 2.55 | ≈ 75 s after drainage, ×1 |
| 161.1 | 11:40 | 1 | cprDrained | 110 | 69/32 (45) | 99 | 20 | 12 | 2.67 | pulse back (the model's return of circulation) |
| 164 | 11:42 | 1 | rosc | 111 | 82/39 (56) | 99 | 20 | 12 | 2.67 | press **Pulse back: stop CPR** |
| 193.3 | 12:12 | 1 | rosc | 64 | 117/79 (92) | 99 | 30 | 12 | 2.55 | 30 s after stopping CPR |
| 194.2 | 12:13 | 1 | roscFluid | 64 | 117/79 (92) | 99 | 30 | 12 | 2.55 | press **Crystalloid 500 mL** |
| 215.6 | 15:04 | 8 | roscFluid | 61 | 119/75 (89) | 99 | 40 | 20 | 2.33 | 15:00 |
| 219.4 | 15:34 | 8 | roscFluid | 62 | 119/75 (89) | 99 | 40 | 19 | 2.14 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:02 arrival · 06:14 deteriorating · 07:49 pea · 08:00 cpr · 10:04 cprDrained · 11:42 rosc · 12:12 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:58 SPO2 NO PULSE · 08:06 ART SYS TOO LOW · 08:06 ART DIA TOO LOW · 08:16 SPO2 LOW PERFUSION · 11:46 ART DIA TOO HIGH · 11:46 ART MEAN TOO HIGH · 11:47 ART SYS TOO HIGH · 15:37 **CVP 11>10

Spans: {"min":2,"via":"button","clockBefore":"08:00","fromT":480.9,"endT":600.9,"wallS":10.4,"speedBefore":1,"speedAfter":1,"rateAfter3s":1,"banner":"Fast-forwarded 2 min, 08:00 → 10:00. During it: ART SYS TOO LOW 08:06, ART DIA TOO LOW 08:06, SPO2 LOW PERFUSION 08:16.","alarms":["08:06 ART SYS TOO LOW","08:06 ART DIA TOO LOW","08:16 SPO2 LOW PERFUSION"],"load1":2.07}

Measures: {"cvp":{"tilesAt1min":["HR: HR bpm 50–150 97 ST-II ---","NIBP: NIBP mmHg 90–160 ---/--- MANUAL PR ---","IBP1: IBP1 mmHg 80–150 105/85 (91)","IBP2: IBP2 mmHg -5–15 17","SpO2: SpO2 % 90–100 98 PI 0.7 PR 96","TEMP: TEMP °C 35–39 36.8 T2 36.7 ΔT 0.1","CO2: CO2 mmHg 19.8–49.4 32 FiCO2 0 awRR 14","NMT: NMTTOF---","BFA: BFA---BS% ---","AGENTS: EtAA%---MAC ---"],"cvpTiles":[],"lanes":[],"cvpOnLanes":[]},"tamponade":{"peaStateAt":"07:49","noPulseAlarmAt":"07:58","cprAt":"08:00","cprAfterAlarmS":2.1,"drainedAt":"10:04","drainAfterCprS":124.2,"pulseBackSeenAt":"11:40","stopCprAt":"11:42","stopAfterSeenS":2.1,"noPulseAlarmTakenFrom":"alarm event"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Start CPR within 10 s of the pulse lossCPR 12 s after the pulse loss (07:48 → 08:00; within 10 s asked)."},{"status":"not met","text":"✗ Not met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 2 min 04 s after CPR (08:00 → 10:04; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (11:40 → 11:42; within 30 s asked)."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"19 mmHg at 07:58","Highest EtCO₂":"40 mmHg at 13:12","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 52 s in all; first lost at 07:48","Return of circulation":"3 min 52 s after the pulse loss (11:40)","Labs (the model): last (lowest–highest)":"K⁺ 4.3 mmol/L (4.2–4.3) · Lactate 2.2 mmol/L (1.0–2.4) · pH 7.34 (7.26–7.41) · Glucose 6.0 mmol/L (5.6–6.0) · Tcore 36.7 °C (36.7–36.8)"},"timelineRows":44,"minuteRows":16}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":217,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"after Saadat-style → Philips-style","atWallS":217.8,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"30 s after the style change","atWallS":247.9,"maxMismatchSoFar":[1.5,1.5,1.5]}],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":495,"compared":460,"commonTiles":10,"sameNumberOtherMarkSamples":270,"holdSamples":0,"status":{"synced":495},"resyncs":3,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":495,"compared":460,"commonTiles":10,"sameNumberOtherMarkSamples":252,"holdSamples":0,"status":{"synced":495},"resyncs":3,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":495,"compared":460,"commonTiles":10,"sameNumberOtherMarkSamples":277,"holdSamples":0,"status":{"synced":495},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
