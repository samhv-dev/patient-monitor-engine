### A3 bronchospasm, instructor-view fast-forward, cockpit hidden (kit round) (chromium, kit ca0d2dbb, load avg 10.78–17.34)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"3SUNCR","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:07","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.7 | 00:08 | 4 | spasm | 72 | 121/83 (98) | – | – | 25 | 16.29 | Load "Severe bronchospasm on the ventilator" at ×4, Bookmark |
| 23.1 | 01:33 | 4 | spasm | 78 | 116/85 (96) | 95 | 32 | 14 | 13.46 | Ventilator view, 1:30 {"vte":300,"phones":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}]} |
| 42.9 | 04:48 | 8 | spasm | 78 | 116/85 (96) | 96 | 35 | 14 | 11.78 | after the 2-min fast-forward |
| 58.1 | 06:50 | 8 | spasm | 79 | 116/85 (97) | 96 | 37 | 14 | 10.78 | back on the Ventilator view |

States: 00:01 spasm

Alarms raised: 00:27 %SPO2 LOW

Spans: {"min":2,"via":"button","clockBefore":"02:20","fromT":140.7,"endT":260.7,"wallS":10.5,"speedBefore":8,"speedAfter":8,"rateAfter3s":8,"banner":"Fast-forwarded 2 min, 02:20 → 04:20. During it: no alarms.","alarms":[],"load1":11.78}

Measures: {"a3bronch":{"tapped":true,"cockpitHiddenOnInstructorView":true,"simSpanOnInstructorViewS":228.8,"expectedTicks":11438,"cockpitWhileHidden":{"frames":11690,"firstTick":4267,"lastTick":15956,"contiguous":true},"cockpitAfterReturn5sWall":{"frames":2047,"firstTick":18004,"lastTick":20050,"contiguous":true},"etco2Before30s":{"min":32,"max":33},"etco2WhileHidden":{"min":32,"max":36,"samples":916},"vteBefore":300,"vteAfterReturn":300,"phonesAtX8":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"phonesAfterSpan":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"phonesAfterReturn":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"span":{"min":2,"via":"button","clockBefore":"02:20","fromT":140.7,"endT":260.7,"wallS":10.5,"speedBefore":8,"speedAfter":8,"rateAfter3s":8,"banner":"Fast-forwarded 2 min, 02:20 → 04:20. During it: no alarms.","alarms":[],"load1":11.78}}}

Debrief: not opened

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":96,"status":{"synced":113},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":96,"status":{"synced":113},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":95,"status":{"synced":113},"resyncs":4,"lagS":0.1}]}

Notes: phone 0 (Pixel 7 emulation) synced before Load · phone 1 (Pixel 7 emulation) synced before Load · phone 2 (Pixel 7 emulation) synced before Load

Errors: none
