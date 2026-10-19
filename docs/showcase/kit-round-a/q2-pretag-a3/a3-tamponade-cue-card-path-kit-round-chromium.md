### A3 tamponade, cue-card path (kit round) (chromium, kit 8cd1fae5, load avg 4.99–13.02)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"89AY8G","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","alarmButtonRightAfterLoad":"Limit alarms off","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:13","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 5.27 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 8 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 5.73 | 1:00 (CVP on the IBP2 tile) |
| 8.3 | 01:07 | 8 | arrival | 96 | 103/84 (90) | 98 | 32 | 13 | 5.73 | objective ticked: ^Name the tamponade |
| 53.3 | 07:05 | 1 | deteriorating | 147 | 63/55 (58) | 99 | 21 | 16 | 4.99 | 7:00 ×1 |
| 97.4 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 13.02 | card shows PEA |
| 100.3 | 07:52 | 1 | cpr | 44 | –/– (23) | 99 | 13 | 16 | 12.13 | press **Start CPR, intubate, FiO₂ 1.0** |
| 100.7 | 07:53 | 4 | cpr | 54 | –/– (30) | 99 | 12 | 19 | 12.13 | ×4 after CPR |
| 118.8 | 09:04 | 1 | cpr | 123 | 39/20 (28) | 99 | 9 | 12 | 10.53 | 9:00 ×1 |
| 136.6 | 09:22 | 1 | cprDrained | 116 | 41/20 (28) | 99 | 9 | 12 | 10.99 | press **Pericardiocentesis during CPR** |
| 151.8 | 10:22 | 1 | cprDrained | 108 | 70/32 (46) | 99 | 17 | 12 | 10.02 | ≈ 1 min after the drainage, ×1: watch |
| 185.3 | 10:56 | 1 | cprDrained | 150 | 71/33 (46) | 99 | 19 | 12 | 7.06 | return of circulation (the model) |
| 188.2 | 10:58 | 1 | rosc | 138 | 82/42 (58) | 99 | 19 | 12 | 6.58 | press **Pulse back: stop CPR** |
| 217.6 | 11:28 | 1 | rosc | 65 | 115/77 (90) | 99 | 28 | 12 | 5.39 | 30 s after stopping CPR |
| 218.4 | 11:29 | 1 | roscFluid | 65 | 116/78 (91) | 99 | 28 | 12 | 5.39 | press **Crystalloid 500 mL** |

States: 00:02 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:22 cprDrained · 10:58 rosc · 11:28 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 10:29 HR TOO HIGH · 11:05 ART DIA TOO HIGH · 11:05 ART MEAN TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.1,"drainedAt":"09:22","drainAfterCprS":90.6,"roscAt":"10:56","drainToRoscS":94.1,"stopAt":"10:58","stopAfterRoscS":2.1,"maxSystolicDrainToRosc":71.1,"artAtStop":"82/42 (58)"},"pdf":{"pages":6,"a4":true,"title":"Debrief Stab wound: tamponade, PEA and pericardiocentesis 2026-10-19"},"handoutPdf":{"pages":1}}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)Observed by the instructor at 01:07."},{"status":"met","mark":"observed","text":"✓ Observed Start CPR within 10 s of the pulse loss 3 s of 10 sCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Pericardiocentesis within 120 s of starting CPR 1 min 31 s of 2 min 00 sThe state \"CPR: pericardium drained, catheter left in\" 1 min 31 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram 2 s of 30 sThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:56 → 10:58; within 30 s asked)."},{"status":"not met","mark":"discuss","text":"◆ Discuss Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 08 s in all; first lost at 07:48","Return of circulation":"3 min 08 s after the pulse loss (10:56)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":43,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1,"worst":{"param":"HR","forS":1,"instructorFirst":"116","phoneFirst":"108","instructorNow":"124","phoneNow":"116","atWallS":116.3},"samples":442,"compared":438,"commonTiles":10,"sameNumberOtherMarkSamples":235,"holdSamples":0,"status":{"synced":442},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"IBP1","forS":1.5,"instructorFirst":"114/91","phoneFirst":"118/94","instructorNow":"108/87","phoneNow":"106/85","atWallS":2.5},"samples":442,"compared":438,"commonTiles":10,"sameNumberOtherMarkSamples":257,"holdSamples":0,"status":{"synced":442},"resyncs":2,"lagS":0.1},{"maxMismatchS":1,"worst":{"param":"HR","forS":1,"instructorFirst":"116","phoneFirst":"108","instructorNow":"124","phoneNow":"116","atWallS":116.3},"samples":442,"compared":438,"commonTiles":10,"sameNumberOtherMarkSamples":247,"holdSamples":0,"status":{"synced":442},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
