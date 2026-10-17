### A3 Return here and All alarms on (kit round) (chromium, kit ca0d2dbb, load avg 14.16–17.34)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"VEH8PD","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","alarmButtonAtEnd":"Limit alarms off"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | stable | 70 | 120/81 (96) | – | – | 24 | 14.16 | Load "Anaphylaxis under anaesthesia" at ×4, Bookmark |
| 54.1 | 00:12 | 4 | stable | 70 | 118/80 (94) | 96 | 34 | 19 | 17.34 | after the two returns |

States: 00:01 stable · 01:00 anaphylaxis · 00:08 stable · 01:00 anaphylaxis · 00:03 stable

Alarms raised: none

Spans: 

Measures: {"a3return":{"before":{"allOff":false,"alarmButton":"No alarms","bookmarks":["Bookmark 1 at 00:02","Bookmark 2 at 00:08"]},"running":{"clock":"02:33","allOff":false,"alarmButton":"No alarms"},"returnToBookmarkTakenWithAlarmsOn":{"bookmark":"Bookmark 2 at 00:08","clock":"00:18","allOff":false,"alarmButton":"No alarms"},"after40s":{"clock":"00:58","allOff":false,"alarmButton":"No alarms"},"returnToBookmarkTakenRightAfterLoad":{"bookmark":"Bookmark 1 at 00:02","clock":"00:12","allOff":true,"alarmButton":"Limit alarms off"}}}

Debrief: not opened

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":105,"compared":105,"commonTiles":10,"sameNumberOtherMarkSamples":67,"holdSamples":0,"status":{"synced":105},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":105,"compared":105,"commonTiles":10,"sameNumberOtherMarkSamples":63,"holdSamples":0,"status":{"synced":105},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":105,"compared":105,"commonTiles":10,"sameNumberOtherMarkSamples":63,"holdSamples":0,"status":{"synced":105},"resyncs":4,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
