### A3 tamponade, cue-card path (kit round) (webkit, kit b39b3d87, load avg 1.21–2.86)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"GHKWKE","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","choseAnotherScenarioFirst":true,"alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","alarmButtonRightAfterLoad":"Limit alarms off","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:13","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 1.81 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 1.98 | 1:00 (CVP on the IBP2 tile) |
| 8.3 | 01:07 | 8 | arrival | 96 | 103/84 (90) | 98 | 32 | 13 | 1.98 | objective ticked: ^Name the tamponade |
| 53.3 | 07:05 | 1 | deteriorating | 147 | 63/55 (58) | 99 | 21 | 16 | 2.42 | 7:00 ×1 |
| 97 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 2.45 | card shows PEA |
| 99.8 | 07:52 | 1 | cpr | 44 | –/– (23) | 99 | 13 | 16 | 2.33 | press **Start CPR, intubate, FiO₂ 1.0** |
| 100.2 | 07:53 | 4 | cpr | 53 | –/– (30) | 99 | 12 | 19 | 2.33 | ×4 after CPR |
| 118.4 | 09:05 | 1 | cpr | 120 | 40/19 (27) | 99 | 9 | 12 | 2.66 | 9:00 ×1 |
| 135.5 | 09:22 | 1 | cprDrained | 114 | 41/20 (28) | 99 | 9 | 12 | 2.71 | press **Pericardiocentesis during CPR** |
| 150.7 | 10:22 | 1 | cprDrained | 139 | 70/33 (46) | 99 | 17 | 12 | 2.86 | ≈ 1 min after the drainage, ×1: watch |
| 184.5 | 10:56 | 1 | cprDrained | 121 | 71/33 (46) | 99 | 19 | 12 | 1.9 | return of circulation (the model) |
| 187.4 | 10:58 | 1 | rosc | 133 | 76/40 (56) | 99 | 19 | 12 | 1.9 | press **Pulse back: stop CPR** |
| 216.8 | 11:28 | 1 | rosc | 65 | 115/78 (91) | 99 | 28 | 12 | 1.88 | 30 s after stopping CPR |
| 217.6 | 11:29 | 1 | roscFluid | 65 | 116/78 (91) | 99 | 28 | 12 | 1.88 | press **Crystalloid 500 mL** |

States: 00:01 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:58 rosc · 11:28 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 11:03 ART DIA TOO HIGH · 11:03 ART MEAN TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.1,"drainedAt":"09:21","drainAfterCprS":90.3,"roscAt":"10:56","drainToRoscS":94.4,"stopAt":"10:58","stopAfterRoscS":2,"maxSystolicDrainToRosc":71.4,"artAtStop":"76/40 (56)"},"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only"}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)Observed by the instructor at 01:07."},{"status":"met","mark":"observed","text":"✓ Observed Start CPR within 10 s of the pulse loss 3 s of 10 sCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Pericardiocentesis within 120 s of starting CPR 1 min 30 s of 2 min 00 sThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram 2 s of 30 sThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:56 → 10:58; within 30 s asked)."},{"status":"not met","mark":"discuss","text":"◆ Discuss Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 08 s in all; first lost at 07:48","Return of circulation":"3 min 08 s after the pulse loss (10:56)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":42,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[],"perPhone":[{"maxMismatchS":2,"worst":{"param":"HR","forS":2,"instructorFirst":"116","phoneFirst":"108","instructorNow":"120","phoneNow":"122","atWallS":116.8},"samples":440,"compared":435,"commonTiles":10,"sameNumberOtherMarkSamples":261,"holdSamples":0,"status":{"synced":440},"resyncs":2,"lagS":0.1},{"maxMismatchS":2,"worst":{"param":"HR","forS":2,"instructorFirst":"116","phoneFirst":"108","instructorNow":"120","phoneNow":"122","atWallS":116.8},"samples":440,"compared":435,"commonTiles":10,"sameNumberOtherMarkSamples":260,"holdSamples":0,"status":{"synced":440},"resyncs":2,"lagS":0.1},{"maxMismatchS":2,"worst":{"param":"HR","forS":2,"instructorFirst":"116","phoneFirst":"108","instructorNow":"120","phoneNow":"122","atWallS":116.8},"samples":440,"compared":435,"commonTiles":10,"sameNumberOtherMarkSamples":260,"holdSamples":0,"status":{"synced":440},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
