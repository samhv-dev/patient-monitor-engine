### Q1 2 tamponade A3 path and 3 Debrief (webkit, kit b39b3d87, load avg 4.33–7.2)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"36Q2MR","alarmButtonAtOpen":"Limit alarms off","phonesAtStart":[{"hold":false,"status":"synced","resyncs":8},{"hold":false,"status":"synced","resyncs":8},{"hold":false,"status":"synced","resyncs":8}],"alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","alarmButtonRightAfterLoad":"Limit alarms off","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 00:06 | 8 | arrival | 72 | –/– (–) | – | – | – | 7.02 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 9.7 | 01:03 | 8 | arrival | 99 | 105/86 (92) | 98 | 32 | 14 | 6.78 | 1:00 CVP on the IBP2 tile |
| 10.1 | 01:06 | 8 | arrival | 97 | 103/84 (90) | 98 | 32 | 13 | 6.78 | objective ticked: ^Name the tamponade |
| 54.9 | 07:03 | 1 | deteriorating | 147 | 63/55 (58) | 99 | 21 | 16 | 7.2 | 7:00 ×1 |
| 101.1 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 6.75 | card shows PEA |
| 104.1 | 07:52 | 1 | cpr | 49 | –/– (23) | 99 | 13 | 17 | 6.53 | press **Start CPR, intubate, FiO₂ 1.0** |
| 104.4 | 07:53 | 4 | cpr | 54 | –/– (30) | 99 | 13 | 19 | 6.53 | ×4 after CPR |
| 121.8 | 09:02 | 1 | cpr | 108 | 41/20 (28) | 99 | 9 | 12 | 6.93 | 9:00 ×1 |
| 142.2 | 09:22 | 1 | cprDrained | 107 | 41/20 (28) | 99 | 9 | 12 | 6.11 | press **Pericardiocentesis during CPR** |
| 157.5 | 10:22 | 1 | cprDrained | 123 | 70/33 (46) | 99 | 17 | 12 | 6.09 | ≈ 1 min after the drainage, ×1: watch |
| 190 | 10:55 | 1 | cprDrained | 124 | 70/32 (45) | 99 | 19 | 12 | 5.63 | return of circulation (the model) |
| 192.8 | 10:57 | 1 | rosc | 129 | 95/49 (71) | 99 | 19 | 12 | 5.5 | press **Pulse back: stop CPR** |
| 222.1 | 11:27 | 1 | rosc | 64 | 115/77 (90) | 99 | 28 | 12 | 4.71 | 30 s after stopping CPR |
| 222.9 | 11:28 | 1 | roscFluid | 65 | 115/78 (91) | 99 | 28 | 12 | 4.33 | press **Crystalloid 500 mL** |

States: 00:01 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:57 rosc · 11:27 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:11 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 10:08 HR TOO HIGH · 10:20 HR TOO HIGH · 11:02 ART DIA TOO HIGH · 11:02 ART MEAN TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.1,"drainedAt":"09:21","drainAfterCprS":90.3,"roscAt":"10:55","drainToRoscS":93.4,"stopAt":"10:57","stopAfterRoscS":2.1,"maxSystolicDrainToRosc":71.3,"maxSystolic6sAfterRosc":140.5,"artAtStop":"95/49 (71)"},"wallLoadToCrystalloidS":222.9,"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only","debriefFooter":["Kit round Q2 rehearsal on the rc.2 release build.","For education only. Not a medical device and not clinically validated: never use it for patient care. Version 1.0.0-rc.2 (pre-release), build b39b3d87 2026-10-19."],"debriefMomentWallS":4.3}

Debrief: {"objectives":[{"status":"not assessable","mark":"observed","text":"✓ Observed Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)Observed by the instructor at 01:06."},{"status":"met","mark":"observed","text":"✓ Observed Start CPR within 10 s of the pulse loss 3 s of 10 sCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Pericardiocentesis within 120 s of starting CPR 1 min 30 s of 2 min 00 sThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","mark":"observed","text":"✓ Observed Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram 2 s of 30 sThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:55 → 10:57; within 30 s asked)."},{"status":"not met","mark":"discuss","text":"◆ Discuss Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:30","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 07 s in all; first lost at 07:48","Return of circulation":"3 min 07 s after the pulse loss (10:55)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":44,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"54","phoneFirst":"49","instructorNow":"104","phoneNow":"---","atWallS":103.3},"samples":448,"compared":444,"commonTiles":10,"sameNumberOtherMarkSamples":185,"holdSamples":0,"status":{"synced":448},"resyncs":10,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"54","phoneFirst":"49","instructorNow":"104","phoneNow":"---","atWallS":103.3},"samples":448,"compared":444,"commonTiles":10,"sameNumberOtherMarkSamples":184,"holdSamples":0,"status":{"synced":448},"resyncs":10,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"54","phoneFirst":"49","instructorNow":"104","phoneNow":"---","atWallS":103.3},"samples":448,"compared":444,"commonTiles":10,"sameNumberOtherMarkSamples":179,"holdSamples":0,"status":{"synced":448},"resyncs":10,"lagS":0.1}]}

Notes: 

Errors: none
