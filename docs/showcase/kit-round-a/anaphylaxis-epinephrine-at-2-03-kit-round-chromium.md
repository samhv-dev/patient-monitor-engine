### Anaphylaxis, epinephrine at 2-03 (kit round) (chromium, kit 56f3761f, load avg 2.17–3.03)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"43VH5J","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | stable | 70 | 120/81 (96) | – | – | 24 | 3.02 | Load "Anaphylaxis under anaesthesia" at ×4, Bookmark |
| 7.9 | 00:32 | 4 | stable | 73 | 119/83 (96) | 97 | 34 | 13 | 3.02 | 00:30 (30-s row) |
| 15.5 | 01:03 | 4 | anaphylaxis | 74 | 119/83 (96) | 99 | 33 | 12 | 2.87 | 01:00 (30-s row) |
| 23.1 | 01:33 | 4 | anaphylaxis | 83 | 114/80 (91) | 99 | 33 | 12 | 2.88 | 01:30 (30-s row) |
| 30.4 | 02:03 | 4 | anaphylaxis | 99 | 109/79 (89) | 99 | 32 | 12 | 2.74 | 02:00 (30-s row) |
| 38 | 02:33 | 4 | anaphylaxis | 115 | 104/77 (85) | 99 | 32 | 12 | 3 | 02:30 (30-s row) |
| 46.4 | 03:07 | 4 | treatedByButton | 143 | 95/70 (77) | 99 | 31 | 12 | 2.77 | press **Give epinephrine 100 µg** |
| 46.4 | 03:07 | 4 | treatedByButton | 143 | 95/70 (77) | 99 | 31 | 12 | 2.77 | 03:00 (30-s row) |
| 50.7 | 03:24 | 4 | treatedByButton | 161 | 121/88 (98) | 99 | 33 | 12 | 2.55 | Drugs & fluids → Crystalloid 500 mL over 10 min → Give |
| 53 | 03:33 | 4 | treatedByButton | 139 | 112/83 (91) | 99 | 33 | 12 | 2.55 | 03:30 (30-s row) |
| 60.6 | 04:03 | 4 | treatedByButton | 133 | 118/88 (97) | 99 | 33 | 12 | 2.31 | 04:00 (30-s row) |
| 67.9 | 04:32 | 4 | treatedByButton | 123 | 120/89 (98) | 99 | 33 | 12 | 2.21 | 04:30 (30-s row) |
| 75.5 | 05:03 | 4 | treatedByButton | 115 | 120/89 (98) | 99 | 33 | 12 | 2.18 | 05:00 (30-s row) |
| 79.3 | 05:18 | 4 | treatedByButton | 113 | 120/89 (98) | 99 | 33 | 12 | 2.17 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 stable · 01:00 anaphylaxis · 03:04 treatedByButton

Alarms raised: 03:10 HR TOO HIGH

Spans: 

Measures: {"anaphylaxis":{"reactionAt":"01:00","epinephrineAt":"03:03","epinephrineAfterReactionS":123.8,"systolicAbove110AfterEpiS":10.1,"hrPeakAfterEpi":171,"systolicPeakAfterEpi":121.3,"lowestSystolicBeforeEpi":95.4,"fluidGivenAt":"03:20"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise anaphylaxis: hypotension, tachycardia, bronchospasmThis objective has no rule: the instructor judges it."},{"status":"not met","text":"✗ Not met Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)Epinephrine 2 min 04 s after the state \"Anaphylaxis\" (01:00 → 03:03; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give fluid for the capillary leakFluid at 03:20"}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"76 mmHg at 03:05","Highest EtCO₂":"34 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"100 µg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.1 mmol/L (4.1–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.44 (7.41–7.44) · Glucose 5.9 mmol/L (5.6–5.9) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":14,"minuteRows":6}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":76.9,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"after Saadat-style → Philips-style","atWallS":77.7,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"30 s after the style change","atWallS":107.7,"maxMismatchSoFar":[1.5,1.5,1.5]}],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"136","instructorNow":"166","phoneNow":"161","atWallS":46.1},"samples":215,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"136","instructorNow":"166","phoneNow":"161","atWallS":46.1},"samples":215,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"136","instructorNow":"166","phoneNow":"161","atWallS":46.1},"samples":215,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":215},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load · fluid toast: Crystalloid 500 mL over 10 min

Errors: none
