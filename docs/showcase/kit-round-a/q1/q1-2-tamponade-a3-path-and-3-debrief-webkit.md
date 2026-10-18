### Q1 2 tamponade A3 path and 3 Debrief (webkit, kit 3db25a3b, load avg 3.04–4.56)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"EC7SHR","alarmButtonAtOpen":"Limit alarms off","phonesAtStart":[{"hold":false,"status":"synced","resyncs":8},{"hold":false,"status":"synced","resyncs":8},{"hold":false,"status":"synced","resyncs":8}],"alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","alarmButtonRightAfterLoad":"Limit alarms off","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 00:06 | 8 | arrival | 72 | –/– (–) | – | – | – | 4.56 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 9.5 | 01:02 | 8 | arrival | 99 | 105/86 (92) | 98 | 32 | 14 | 4.35 | 1:00 CVP on the IBP2 tile; objective 1 ticked |
| 55 | 07:03 | 1 | deteriorating | 148 | 63/55 (58) | 99 | 21 | 16 | 4.52 | 7:00 ×1 |
| 101.1 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 3.23 | card shows PEA |
| 103.9 | 07:52 | 1 | cpr | 44 | –/– (23) | 99 | 13 | 16 | 3.23 | press **Start CPR, intubate, FiO₂ 1.0** |
| 104.3 | 07:53 | 4 | cpr | 53 | –/– (30) | 99 | 12 | 19 | 3.23 | ×4 after CPR |
| 121.8 | 09:02 | 1 | cpr | 114 | 41/20 (28) | 99 | 9 | 12 | 3.23 | 9:00 ×1 |
| 141.3 | 09:22 | 1 | cprDrained | 114 | 41/20 (28) | 99 | 9 | 12 | 3.67 | press **Pericardiocentesis during CPR** |
| 156.6 | 10:22 | 1 | cprDrained | 146 | 70/33 (46) | 99 | 17 | 12 | 3.69 | ≈ 1 min after the drainage, ×1: watch |
| 190.3 | 10:56 | 1 | cprDrained | 106 | 70/33 (46) | 99 | 19 | 12 | 3.8 | return of circulation (the model) |
| 193.2 | 10:58 | 1 | rosc | 107 | 95/49 (69) | 99 | 19 | 12 | 3.5 | press **Pulse back: stop CPR** |
| 222.4 | 11:28 | 1 | rosc | 65 | 115/78 (91) | 99 | 28 | 12 | 3.04 | 30 s after stopping CPR |
| 223.2 | 11:29 | 1 | roscFluid | 65 | 116/78 (91) | 99 | 28 | 12 | 3.04 | press **Crystalloid 500 mL** |

States: 00:01 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:58 rosc · 11:28 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 10:21 HR TOO HIGH · 11:03 ART DIA TOO HIGH · 11:03 ART MEAN TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2.1,"drainedAt":"09:21","drainAfterCprS":90.1,"roscAt":"10:56","drainToRoscS":94.6,"stopAt":"10:58","stopAfterRoscS":2,"maxSystolicDrainToRosc":71.4,"maxSystolic6sAfterRosc":135.9,"artAtStop":"95/49 (69)"},"wallLoadToCrystalloidS":223.3,"pdf":"WebKit: Playwright has no page.pdf(); print-media screenshot only","debriefFooter":["Kit round Q1 rehearsal on the release build.","For education only. Not a medical device and not clinically validated: never use it for patient care. Version 1.0.0-rc.1 (pre-release), build 3db25a3b 2026-10-18."],"debriefMomentWallS":4.2}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it. The instructor ticked it at 01:01."},{"status":"met","text":"✓ Met Start CPR within 10 s of the pulse lossCPR 4 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","text":"✓ Met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:56 → 10:58; within 30 s asked)."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 08 s in all; first lost at 07:48","Return of circulation":"3 min 08 s after the pulse loss (10:56)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":43,"minuteRows":12}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"83","instructorNow":"98","phoneNow":"103","atWallS":2},"samples":449,"compared":446,"commonTiles":10,"sameNumberOtherMarkSamples":198,"holdSamples":0,"status":{"synced":449},"resyncs":11,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"83","instructorNow":"98","phoneNow":"103","atWallS":2},"samples":449,"compared":446,"commonTiles":10,"sameNumberOtherMarkSamples":197,"holdSamples":0,"status":{"synced":449},"resyncs":11,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"87","phoneFirst":"83","instructorNow":"98","phoneNow":"103","atWallS":2},"samples":449,"compared":446,"commonTiles":10,"sameNumberOtherMarkSamples":197,"holdSamples":0,"status":{"synced":449},"resyncs":11,"lagS":0.1}]}

Notes: 

Errors: none
