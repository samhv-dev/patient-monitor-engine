### A3 tamponade, cue-card path (kit round) (webkit, kit ca0d2dbb, load avg 7.81–11.58)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"GX3XYD","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:14","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:14","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.7 | 00:14 | 8 | arrival | 108 | 120/94 (103) | 96 | 36 | 20 | 10.39 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 10.04 | 1:00 (CVP on the IBP2 tile) |
| 53.4 | 07:06 | 1 | deteriorating | 147 | 62/54 (57) | 99 | 21 | 16 | 10.72 | 7:00 ×1 |
| 96.4 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 11.58 | card shows PEA |
| 99.4 | 07:52 | 1 | cpr | 48 | –/– (23) | 99 | 13 | 16 | 11.58 | press **Start CPR, intubate, FiO₂ 1.0** |
| 99.7 | 07:53 | 4 | cpr | 54 | –/– (30) | 99 | 12 | 19 | 11.58 | ×4 after CPR |
| 118 | 09:05 | 1 | cpr | 114 | 40/19 (27) | 99 | 9 | 12 | 11 | 9:00 ×1 |
| 134.8 | 09:22 | 1 | cprDrained | 107 | 41/20 (28) | 99 | 9 | 12 | 10.18 | press **Pericardiocentesis during CPR** |
| 150.2 | 10:22 | 1 | cprDrained | 116 | 70/33 (46) | 99 | 17 | 12 | 9.87 | ≈ 1 min after the drainage, ×1: watch |
| 182.6 | 10:55 | 1 | cprDrained | 151 | 70/33 (46) | 99 | 19 | 12 | 7.81 | return of circulation (the model) |
| 185.4 | 10:58 | 1 | rosc | 129 | 97/49 (68) | 99 | 19 | 12 | 7.81 | press **Pulse back: stop CPR** |
| 214.7 | 11:27 | 1 | rosc | 64 | 115/77 (90) | 99 | 28 | 12 | 11.39 | 30 s after stopping CPR |
| 215.6 | 11:28 | 1 | roscFluid | 65 | 115/78 (91) | 99 | 28 | 12 | 11.39 | press **Crystalloid 500 mL** |

States: 00:01 arrival · 06:13 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:57 rosc · 11:27 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 11:03 ART MEAN TOO HIGH · 11:04 ART DIA TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.2,"drainedAt":"09:21","drainAfterCprS":90.2,"roscAt":"10:55","drainToRoscS":93.8,"stopAt":"10:57","stopAfterRoscS":2,"maxSystolicDrainToRosc":71,"artAtStop":"97/49 (68)"},"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only"}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Start CPR within 10 s of the pulse lossCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","text":"✓ Met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:55 → 10:57; within 30 s asked)."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 07 s in all; first lost at 07:48","Return of circulation":"3 min 07 s after the pulse loss (10:55)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":41,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":2.5,"worst":{"param":"HR","forS":2.5,"instructorFirst":"107","phoneFirst":"104","instructorNow":"114","phoneNow":"120","atWallS":135.4},"samples":437,"compared":432,"commonTiles":10,"sameNumberOtherMarkSamples":209,"holdSamples":0,"status":{"synced":437},"resyncs":2,"lagS":0.2},{"maxMismatchS":2.5,"worst":{"param":"HR","forS":2.5,"instructorFirst":"107","phoneFirst":"104","instructorNow":"114","phoneNow":"120","atWallS":135.4},"samples":437,"compared":432,"commonTiles":10,"sameNumberOtherMarkSamples":208,"holdSamples":0,"status":{"synced":437},"resyncs":2,"lagS":0.2},{"maxMismatchS":2.5,"worst":{"param":"HR","forS":2.5,"instructorFirst":"107","phoneFirst":"104","instructorNow":"114","phoneNow":"120","atWallS":135.4},"samples":437,"compared":432,"commonTiles":10,"sameNumberOtherMarkSamples":211,"holdSamples":0,"status":{"synced":437},"resyncs":2,"lagS":0.2}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
