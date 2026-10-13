### Anaphylaxis, epinephrine at 2-03 (kit round) (webkit, kit 56f3761f, load avg 1.71–2.37)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"BCPRSG","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | stable | 70 | 120/81 (96) | – | – | 24 | 2.16 | Load "Anaphylaxis under anaesthesia" at ×4, Bookmark |
| 7.9 | 00:32 | 4 | stable | 73 | 119/83 (96) | 97 | 34 | 13 | 2.05 | 00:30 (30-s row) |
| 15.5 | 01:03 | 4 | anaphylaxis | 74 | 119/83 (96) | 99 | 33 | 12 | 2.37 | 01:00 (30-s row) |
| 22.9 | 01:32 | 4 | anaphylaxis | 82 | 114/80 (92) | 99 | 33 | 12 | 2 | 01:30 (30-s row) |
| 30.5 | 02:03 | 4 | anaphylaxis | 99 | 109/79 (89) | 99 | 32 | 12 | 2.24 | 02:00 (30-s row) |
| 38.1 | 02:33 | 4 | anaphylaxis | 115 | 104/77 (85) | 99 | 32 | 12 | 2.13 | 02:30 (30-s row) |
| 45.4 | 03:02 | 4 | anaphylaxis | 137 | 96/71 (78) | 99 | 31 | 12 | 2.04 | 03:00 (30-s row) |
| 46.5 | 03:07 | 4 | treatedByButton | 143 | 95/70 (77) | 99 | 31 | 12 | 2.04 | press **Give epinephrine 100 µg** |
| 50.7 | 03:24 | 4 | treatedByButton | 162 | 121/88 (98) | 99 | 33 | 12 | 2.2 | Drugs & fluids → Crystalloid 500 mL over 10 min → Give |
| 53 | 03:33 | 4 | treatedByButton | 140 | 111/82 (91) | 99 | 33 | 12 | 2.1 | 03:30 (30-s row) |
| 60.4 | 04:02 | 4 | treatedByButton | 133 | 119/88 (97) | 99 | 33 | 12 | 1.93 | 04:00 (30-s row) |
| 68 | 04:33 | 4 | treatedByButton | 123 | 119/89 (98) | 99 | 33 | 12 | 1.71 | 04:30 (30-s row) |
| 75.6 | 05:03 | 4 | treatedByButton | 115 | 120/89 (98) | 99 | 33 | 12 | 1.89 | 05:00 (30-s row) |
| 79.4 | 05:18 | 4 | treatedByButton | 113 | 120/89 (98) | 99 | 33 | 12 | 2.14 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 stable · 01:00 anaphylaxis · 03:04 treatedByButton

Alarms raised: 03:10 HR TOO HIGH

Spans: 

Measures: {"anaphylaxis":{"reactionAt":"01:00","epinephrineAt":"03:04","epinephrineAfterReactionS":123.9,"systolicAbove110AfterEpiS":9.9,"hrPeakAfterEpi":171,"systolicPeakAfterEpi":121.4,"lowestSystolicBeforeEpi":94.7,"fluidGivenAt":"03:20"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise anaphylaxis: hypotension, tachycardia, bronchospasmThis objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)Epinephrine 2 min 04 s after the state \"Anaphylaxis\" (01:00 → 03:04; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give fluid for the capillary leakFluid at 03:20"}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"76 mmHg at 03:05","Highest EtCO₂":"34 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"100 µg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.1 mmol/L (4.1–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.44 (7.41–7.44) · Glucose 5.9 mmol/L (5.6–5.9) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":14,"minuteRows":6}

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":true,"marks":[{"label":"before the style change","atWallS":77,"maxMismatchSoFar":[3,3,3]},{"label":"after Saadat-style → Philips-style","atWallS":77.8,"maxMismatchSoFar":[3,3,3]},{"label":"30 s after the style change","atWallS":107.8,"maxMismatchSoFar":[3,3,3]}],"perPhone":[{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"93/71","phoneFirst":"95/70","instructorNow":"119/88","phoneNow":"116/88","atWallS":48.1},"samples":216,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":84,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"93/71","phoneFirst":"95/70","instructorNow":"119/88","phoneNow":"116/88","atWallS":48.1},"samples":216,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":84,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1},{"maxMismatchS":3,"worst":{"param":"IBP1","forS":3,"instructorFirst":"93/71","phoneFirst":"95/70","instructorNow":"119/88","phoneNow":"116/88","atWallS":48.1},"samples":216,"compared":211,"commonTiles":10,"sameNumberOtherMarkSamples":84,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load · fluid toast: Crystalloid 500 mL over 10 min

Errors: none
