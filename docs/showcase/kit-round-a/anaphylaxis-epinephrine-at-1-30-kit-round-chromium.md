### Anaphylaxis, epinephrine at 1-30 (kit round) (chromium, kit 56f3761f, load avg 2.36–2.88)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, WS_NO_BUFFER_UTIL=1 (finding KR-A1)) · reaction 2 s · 3 phones · setup: {"sessionCode":"HEEQGK","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | stable | 70 | 120/81 (96) | – | – | 24 | 2.36 | Load "Anaphylaxis under anaesthesia" at ×4, Bookmark |
| 7.9 | 00:33 | 4 | stable | 74 | 119/83 (96) | 97 | 34 | 13 | 2.41 | 00:30 (30-s row) |
| 15.5 | 01:03 | 4 | anaphylaxis | 74 | 119/83 (96) | 99 | 33 | 12 | 2.56 | 01:00 (30-s row) |
| 23.1 | 01:33 | 4 | anaphylaxis | 83 | 114/80 (91) | 99 | 33 | 12 | 2.68 | 01:30 (30-s row) |
| 30.5 | 02:03 | 4 | anaphylaxis | 99 | 109/79 (89) | 99 | 32 | 12 | 2.81 | 02:00 (30-s row) |
| 38.1 | 02:33 | 4 | treatedByButton | 116 | 105/77 (86) | 99 | 32 | 12 | 2.74 | press **Give epinephrine 100 µg** |
| 38.1 | 02:33 | 4 | treatedByButton | 116 | 105/77 (86) | 99 | 32 | 12 | 2.74 | 02:30 (30-s row) |
| 42.4 | 02:50 | 4 | treatedByButton | 108 | 121/87 (97) | 99 | 33 | 12 | 2.68 | Drugs & fluids → Crystalloid 500 mL over 10 min → Give |
| 45.4 | 03:03 | 4 | treatedByButton | 105 | 124/91 (101) | 99 | 34 | 12 | 2.79 | 03:00 (30-s row) |
| 53 | 03:33 | 4 | treatedByButton | 100 | 130/95 (107) | 99 | 33 | 12 | 2.64 | 03:30 (30-s row) |
| 60.4 | 04:02 | 4 | treatedByButton | 99 | 133/96 (108) | 99 | 33 | 12 | 2.61 | 04:00 (30-s row) |
| 68 | 04:33 | 4 | treatedByButton | 98 | 133/96 (108) | 99 | 33 | 12 | 2.88 | 04:30 (30-s row) |
| 75.5 | 05:03 | 4 | treatedByButton | 98 | 133/95 (108) | 99 | 33 | 12 | 2.75 | 05:00 (30-s row) |
| 79.3 | 05:18 | 4 | treatedByButton | 98 | 131/95 (107) | 99 | 33 | 12 | 2.75 | monitor style changed: Saadat-style → Philips-style (Settings) |

States: 00:01 stable · 01:00 anaphylaxis · 02:30 treatedByButton

Alarms raised: 05:21 **ABPd 94>90

Spans: 

Measures: {"anaphylaxis":{"reactionAt":"01:00","epinephrineAt":"02:30","epinephrineAfterReactionS":90.6,"systolicAbove110AfterEpiS":5.3,"hrPeakAfterEpi":145,"systolicPeakAfterEpi":133.7,"lowestSystolicBeforeEpi":103.9,"fluidGivenAt":"02:47"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Recognise anaphylaxis: hypotension, tachycardia, bronchospasmThis objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)Epinephrine 1 min 31 s after the state \"Anaphylaxis\" (01:00 → 02:30; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Give fluid for the capillary leakFluid at 02:47"}],"facts":{"Lowest SpO₂":"96 % at 00:10","Lowest ART M / NIBP M":"85 mmHg at 02:30","Highest EtCO₂":"34 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Epinephrine, boluses in all":"100 µg (1 dose)","Labs (the model): last (lowest–highest)":"K⁺ 4.1 mmol/L (4.1–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · pH 7.44 (7.41–7.44) · Glucose 6.0 mmol/L (5.6–6.0) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":13,"minuteRows":6}

Phones: {"rule":"a parameter differing (> 1 unit, or number vs blank) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[{"label":"before the style change","atWallS":77,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"after Saadat-style → Philips-style","atWallS":77.8,"maxMismatchSoFar":[1.5,1.5,1.5]},{"label":"30 s after the style change","atWallS":107.8,"maxMismatchSoFar":[1.5,1.5,1.5]}],"perPhone":[{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"141","instructorNow":"108","phoneNow":"112","atWallS":40.6},"samples":216,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"141","instructorNow":"108","phoneNow":"112","atWallS":40.6},"samples":216,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1},{"maxMismatchS":1.5,"worst":{"param":"HR","forS":1.5,"instructorFirst":"138","phoneFirst":"141","instructorNow":"108","phoneNow":"112","atWallS":40.6},"samples":216,"compared":211,"commonTiles":10,"holdSamples":0,"status":{"synced":216},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load · fluid toast: Crystalloid 500 mL over 10 min

Errors: none
