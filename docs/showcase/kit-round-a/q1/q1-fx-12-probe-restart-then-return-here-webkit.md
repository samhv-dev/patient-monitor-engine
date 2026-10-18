### Q1 FX-12 probe restart then return here (webkit, kit 3db25a3b, load avg 2.23–2.59)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"HB44HE","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","alarmButtonRightAfterLoad":"Limit alarms off","allOnAgainAfterLoadAt":"00:03","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:06","alarmButtonAtEnd":"Limit alarms off"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 00:06 | 8 | induction | 70 | –/– (–) | – | – | – | 2.59 | Load "Malignant hyperthermia" at ×8, Bookmark |

States: 00:01 induction · 00:00 null

Alarms raised: none

Spans: 

Measures: {"fx12probe":{"before":{"bar":"Malignant hyperthermia: Induced: propofol, succinylcholine 1.5 mg/kg (masseter rigidity), intubated; sevoflurane 2 % 00:59","state":"induction","clock":"01:01"},"afterRestart":{"bar":"No scenario","state":null,"clock":"00:23","allOff":true},"bookmarkList":[],"panelAfterRestart":{"runningSectionVisible":false,"libraryVisible":true,"returnHereVisible":0},"returnHereReachable":false,"panelAfter15s":{"runningSectionVisible":false,"libraryVisible":true,"returnHereVisible":0}}}

Debrief: {"objectives":[],"facts":{"Lowest SpO₂":"96 % at 00:10","Highest EtCO₂":"37 mmHg at 00:20","Highest T1 / T2":"36.8 °C at 00:01","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.40 (7.40–7.41) · Glucose 5.6 mmol/L (5.6–5.6) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":0,"minuteRows":3}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":58,"compared":55,"commonTiles":10,"sameNumberOtherMarkSamples":32,"holdSamples":0,"status":{"synced":58},"resyncs":3,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":58,"compared":55,"commonTiles":10,"sameNumberOtherMarkSamples":32,"holdSamples":0,"status":{"synced":58},"resyncs":3,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":58,"compared":55,"commonTiles":10,"sameNumberOtherMarkSamples":32,"holdSamples":0,"status":{"synced":58},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
