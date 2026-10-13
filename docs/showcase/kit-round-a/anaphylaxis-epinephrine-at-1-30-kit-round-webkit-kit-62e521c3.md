### Anaphylaxis, epinephrine at 1-30 (kit round) (webkit, kit 62e521c3, load avg 2.04–2.66)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"FJZGK4","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | stable | 70 | 120/81 (96) | – | – | 24 | 2.49 | Load "Anaphylaxis under anaesthesia" at ×4, Bookmark |
| 7.9 | 00:33 | 4 | stable | 74 | 119/83 (96) | 97 | 34 | 13 | 2.66 | 00:30 (30-s row) |
| 15.6 | 01:03 | 4 | anaphylaxis | 74 | 119/83 (96) | 99 | 33 | 12 | 2.52 | 01:00 (30-s row) |
| 22.9 | 01:32 | 4 | anaphylaxis | 82 | 114/80 (92) | 99 | 33 | 12 | 2.29 | 01:30 (30-s row) |
| 30.5 | 02:03 | 4 | anaphylaxis | 99 | 109/79 (89) | 99 | 32 | 12 | 2.19 | 02:00 (30-s row) |
| 38.2 | 02:34 | 4 | treatedByButton | 117 | 105/78 (86) | 99 | 32 | 12 | 2.48 | press **Give epinephrine 100 µg** |
| 38.2 | 02:34 | 4 | treatedByButton | 117 | 105/78 (86) | 99 | 32 | 12 | 2.48 | 02:30 (30-s row) |
| 42.5 | 02:51 | 4 | treatedByButton | 106 | 117/85 (95) | 99 | 33 | 12 | 2.36 | Drugs & fluids → Crystalloid 500 mL over 10 min → Give |
| 45.5 | 03:03 | 4 | treatedByButton | 108 | 125/92 (103) | 99 | 33 | 12 | 2.36 | 03:00 (30-s row) |
| 53.1 | 03:33 | 4 | treatedByButton | 100 | 131/95 (107) | 99 | 33 | 12 | 2.16 | 03:30 (30-s row) |
| 60.5 | 04:03 | 4 | treatedByButton | 99 | 133/96 (108) | 99 | 33 | 12 | 2.06 | 04:00 (30-s row) |
| 68.1 | 04:33 | 4 | treatedByButton | 98 | 133/96 (108) | 99 | 33 | 12 | 2.04 | 04:30 (30-s row) |
| 75.4 | 05:02 | 4 | treatedByButton | 98 | 133/95 (107) | 99 | 33 | 12 | 2.52 | 05:00 (30-s row) |
| 79.2 | 05:18 | 4 | treatedByButton | 98 | 132/95 (107) | 99 | 33 | 12 | 2.32 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 stable · 01:00 anaphylaxis · 02:30 treatedByButton

Alarms raised: 05:21 **ABPd 94>90

Spans: 

Measures: {"anaphylaxis":{"reactionAt":"01:00","epinephrineAt":"02:30","epinephrineAfterReactionS":90.6,"systolicAbove110AfterEpiS":5.1,"hrPeakAfterEpi":145,"systolicPeakAfterEpi":133.4,"lowestSystolicBeforeEpi":103.9,"fluidGivenAt":"02:47"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise anaphylaxis: hypotension, tachycardia, bronchospasmThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)Epinephrine 1 min 31 s after the state \"Anaphylaxis\" (01:00 → 02:30; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give fluid for the capillary leakFluid at 02:47"}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"85 mmHg at 02:30","Highest EtCO₂":"34 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"100 µg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.1 mmol/L (4.1–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.44 (7.41–7.44) · Glucose 6.0 mmol/L (5.6–6.0) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":13,"minuteRows":6}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":76.8,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"after Saadat-style → Philips-style","atWallS":77.6,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"30 s after the style change","atWallS":107.6,"maxMismatchSoFar":[1.5,1.5,1.5]}],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"137","phoneFirst":"143","instructorNow":"109","phoneNow":"113","atWallS":40.6},"samples":215,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":90,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"137","phoneFirst":"143","instructorNow":"109","phoneNow":"113","atWallS":40.6},"samples":215,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":91,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"137","phoneFirst":"143","instructorNow":"109","phoneNow":"113","atWallS":40.6},"samples":215,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":90,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load · fluid toast: Crystalloid 500 mL over 10 min

Errors: none
