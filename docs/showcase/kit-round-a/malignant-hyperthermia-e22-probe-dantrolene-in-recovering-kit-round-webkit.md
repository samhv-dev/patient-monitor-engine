### Malignant hyperthermia E22 probe dantrolene in Recovering (kit round) (webkit, kit b08a972b, load avg 5.19–12.87)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"VWDTCJ","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:14","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:14 | 8 | induction | 71 | 110/74 (85) | 96 | 36 | 19 | 6.37 | Load "Malignant hyperthermia" at ×8, Bookmark |
| 31.3 | 04:11 | 8 | surgery | 79 | 99/66 (75) | 99 | 40 | 12 | 6.03 | press **Start surgery: rocuronium 0.6 mg/kg** |
| 56.6 | 07:04 | 4 | triggerOff | 85 | 105/71 (81) | 99 | 46 | 13 | 10.25 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 61.8 | 07:25 | 4 | treating | 84 | 105/71 (81) | 99 | 40 | 20 | 12.87 | press **Dantrolene 2.5 mg/kg** |
| 64.2 | 07:35 | 4 | treating | 85 | 105/72 (81) | 99 | 38 | 20 | 12.87 | press **Cool: 2 L saline at room temperature** |
| 82.5 | 08:48 | 4 | treating | 85 | 115/78 (89) | 99 | 37 | 20 | 10.87 | press **Dantrolene 2.5 mg/kg** |
| 97.5 | 09:48 | 4 | recovering | 85 | 121/82 (94) | 99 | 37 | 20 | 10.11 | ventilation back offered again |

States: 00:01 induction · 04:05 surgery · 06:52 earlySigns · 07:01 triggerOff · 07:22 dantrolene · 07:24 treating · 07:32 cooling · 07:34 treating · 08:34 recovering · 08:45 dantrolene · 08:47 treating · 09:47 recovering

Alarms raised: none

Spans: 

Measures: {"e22probe":{"offeredIn":{"earlySigns":false,"triggerOff":false,"treating":false,"recovering":false,"afterDantrolene":false},"dantroleneInRecoveringAt":"08:45","offeredAgainAt":"09:48","goneForS":63}}

Debrief: not opened

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":192,"compared":192,"commonTiles":10,"sameNumberOtherMarkSamples":106,"holdSamples":0,"status":{"synced":192},"resyncs":2,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":192,"compared":192,"commonTiles":10,"sameNumberOtherMarkSamples":105,"holdSamples":0,"status":{"synced":192},"resyncs":2,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":192,"compared":192,"commonTiles":10,"sameNumberOtherMarkSamples":105,"holdSamples":0,"status":{"synced":192},"resyncs":2,"lagS":0.1}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
