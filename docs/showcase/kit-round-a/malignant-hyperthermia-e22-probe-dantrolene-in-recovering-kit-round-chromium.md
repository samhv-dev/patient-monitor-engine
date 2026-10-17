### Malignant hyperthermia E22 probe dantrolene in Recovering (kit round) (chromium, kit b08a972b, load avg 2.21–3.64)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"Q9NT3P","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | induction | 71 | 111/75 (86) | 96 | 36 | 19 | 3.39 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.4 | 04:12 | 8 | surgery | 80 | 99/65 (75) | 99 | 40 | 12 | 3.01 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 56.4 | 07:04 | 4 | triggerOff | 86 | 105/71 (81) | 99 | 46 | 13 | 2.62 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.5 | 07:24 | 4 | treating | 85 | 105/71 (80) | 99 | 40 | 20 | 2.41 | press **Dantrolene 2.5 mg/kg** |
| 64.1 | 07:35 | 4 | treating | 85 | 105/71 (81) | 99 | 38 | 20 | 2.41 | press **Cool: 2 L saline at room temperature** |
| 82.5 | 08:48 | 4 | treating | 84 | 115/78 (89) | 99 | 37 | 20 | 2.21 | press **Dantrolene 2.5 mg/kg** |
| 97.9 | 09:50 | 4 | recovering | 86 | 121/83 (94) | 99 | 37 | 20 | 2.23 | ventilation back offered again |

States: 00:01 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:22 dantrolene · 07:24 treating · 07:32 cooling · 07:34 treating · 08:35 recovering · 08:46 dantrolene · 08:48 treating · 09:48 recovering

Alarms raised: none

Spans: 

Measures: {"e22probe":{"offeredIn":{"earlySigns":false,"triggerOff":false,"treating":false,"recovering":false,"afterDantrolene":false},"dantroleneInRecoveringAt":"08:45","offeredAgainAt":"09:50","goneForS":64.5}}

Debrief: not opened

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0.5,"worst":{"param":"HR","forS":0.5,"instructorFirst":"80","phoneFirst":"78","instructorNow":"77","phoneNow":"79","atWallS":19},"samples":193,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":141,"holdSamples":0,"status":{"synced":193},"resyncs":3,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"HR","forS":0.5,"instructorFirst":"80","phoneFirst":"78","instructorNow":"77","phoneNow":"79","atWallS":19},"samples":193,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":138,"holdSamples":0,"status":{"synced":193},"resyncs":3,"lagS":0.1},{"maxMismatchS":0.5,"worst":{"param":"HR","forS":0.5,"instructorFirst":"80","phoneFirst":"78","instructorNow":"77","phoneNow":"79","atWallS":19},"samples":193,"compared":193,"commonTiles":10,"sameNumberOtherMarkSamples":136,"holdSamples":0,"status":{"synced":193},"resyncs":3,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
