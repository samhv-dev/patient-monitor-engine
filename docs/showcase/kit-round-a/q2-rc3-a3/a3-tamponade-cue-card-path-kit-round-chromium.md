### A3 tamponade, cue-card path (kit round) (chromium, kit fcf99b70, load avg 3.52–68.15)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"TWKRBB","alarmButtonAtOpen":"No alarms","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"No alarms","limitsAfterLoad":"limit alarms on after Load","alarmButtonRightAfterLoad":"No alarms","bookmarkAt":"00:04","alarmButtonAtEnd":"!! EtCO₂ low"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4 | 00:04 | 8 | arrival | 72 | –/– (–) | – | – | – | 4.88 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 8 | 01:05 | 8 | arrival | 97 | 104/85 (91) | 98 | 32 | 13 | 4.49 | 1:00 (CVP on the IBP2 tile) |
| 8.4 | 01:08 | 8 | arrival | 96 | 104/84 (90) | 98 | 32 | 13 | 4.49 | objective ticked: ^Name the tamponade |
| 53.5 | 07:06 | 1 | deteriorating | 147 | 62/54 (57) | 99 | 21 | 16 | 3.52 | 7:00 ×1 |
| 96 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 6.09 | card shows PEA |
| 98.8 | 07:52 | 1 | cpr | 49 | –/– (24) | 99 | 13 | 16 | 6.09 | press **Start CPR, intubate, FiO₂ 1.0** |
| 99.2 | 07:53 | 4 | cpr | 54 | –/– (31) | 99 | 12 | 19 | 6.88 | ×4 after CPR |
| 117.3 | 09:04 | 1 | cpr | 116 | 39/19 (27) | 99 | 9 | 12 | 11.44 | 9:00 ×1 |
| 134.9 | 09:22 | 1 | cprDrained | 107 | 41/20 (28) | 99 | 9 | 12 | 24.69 | press **Pericardiocentesis during CPR** |
| 150.2 | 10:22 | 1 | cprDrained | 112 | 71/33 (46) | 99 | 17 | 12 | 33.68 | ≈ 1 min after the drainage, ×1: watch |
| 182.8 | 10:55 | 1 | cprDrained | 134 | 69/32 (45) | 99 | 19 | 12 | 66.77 | return of circulation (the model) |
| 185.7 | 10:58 | 1 | rosc | 131 | 124/59 (84) | 99 | 19 | 12 | 68.15 | press **Pulse back: stop CPR** |
| 215.1 | 11:27 | 1 | rosc | 64 | 115/77 (90) | 99 | 28 | 12 | 61.05 | 30 s after stopping CPR |
| 216 | 11:28 | 1 | roscFluid | 65 | 115/78 (91) | 99 | 28 | 12 | 61.05 | press **Crystalloid 500 mL** |

States: 00:02 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:57 rosc · 11:27 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 02:21 ETCO2 TOO LOW · 05:59 SPO2 LOW PERFUSION · 06:49 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 10:14 ART SYS TOO LOW · 10:45 ART SYS TOO LOW · 11:03 ART MEAN TOO HIGH · 11:04 ART DIA TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.1,"drainedAt":"09:21","drainAfterCprS":90.2,"roscAt":"10:55","drainToRoscS":93.7,"stopAt":"10:57","stopAfterRoscS":2.1,"maxSystolicDrainToRosc":71.4,"artAtStop":"124/59 (84)"},"pdf":{"pages":6,"a4":true,"title":"Debrief Stab wound: tamponade, PEA and pericardiocentesis 2026-10-23"},"handoutPdf":{"pages":1}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)Observed by the instructor at 01:08."},{"status":"met","mark":"observed","text":"✓ Observed Start CPR within 10 s of the pulse loss 3 s of 10 sCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Pericardiocentesis within 120 s of starting CPR 1 min 30 s of 2 min 00 sThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram 2 s of 30 sThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:55 → 10:57; within 30 s asked)."},{"status":"not met","mark":"discuss","text":"◆ Discuss Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 07 s in all; first lost at 07:48","Return of circulation":"3 min 07 s after the pulse loss (10:55)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":42,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":3.5,"worst":{"param":"HR","forS":3.5,"instructorFirst":"72","phoneFirst":"","instructorNow":"96","phoneNow":"93","atWallS":3.5},"samples":439,"compared":434,"commonTiles":10,"sameNumberOtherMarkSamples":220,"holdSamples":0,"status":{"synced":439},"resyncs":2,"lagS":0.1},{"maxMismatchS":3.5,"worst":{"param":"HR","forS":3.5,"instructorFirst":"72","phoneFirst":"","instructorNow":"96","phoneNow":"93","atWallS":3.5},"samples":439,"compared":434,"commonTiles":10,"sameNumberOtherMarkSamples":205,"holdSamples":0,"status":{"synced":439},"resyncs":2,"lagS":0.1},{"maxMismatchS":3.5,"worst":{"param":"HR","forS":3.5,"instructorFirst":"72","phoneFirst":"","instructorNow":"96","phoneNow":"93","atWallS":3.5},"samples":439,"compared":434,"commonTiles":10,"sameNumberOtherMarkSamples":196,"holdSamples":0,"status":{"synced":439},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
