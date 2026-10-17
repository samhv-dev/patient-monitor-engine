### A3 bronchospasm, instructor-view fast-forward, cockpit hidden (kit round) (webkit, kit ca0d2dbb, load avg 6.49–10.61)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 3 phones · setup: {"sessionCode":"VAU33K","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:07","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:07","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:07 | 4 | spasm | 70 | 121/82 (97) | – | – | 25 | 9.9 | Load "Severe bronchospasm on the ventilator" at ×4, Bookmark |
| 23 | 01:33 | 4 | spasm | 78 | 116/85 (97) | 95 | 32 | 14 | 8.58 | Ventilator view, 1:30 {"vte":300,"phones":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}]} |
| 42.7 | 04:47 | 8 | spasm | 78 | 116/85 (96) | 96 | 35 | 14 | 7.21 | after the 2-min fast-forward |
| 57.8 | 06:48 | 8 | spasm | 78 | 116/85 (96) | 96 | 38 | 14 | 6.49 | back on the Ventilator view |

States: 00:01 spasm

Alarms raised: 00:27 %SPO2 LOW

Spans: {"min":2,"via":"button","clockBefore":"02:19","fromT":140.2,"endT":260.2,"wallS":10.4,"speedBefore":8,"speedAfter":8,"rateAfter3s":8,"banner":"Fast-forwarded 2 min, 02:20 → 04:20. During it: no alarms.","alarms":[],"load1":7.21}

Measures: {"a3bronch":{"tapped":true,"cockpitHiddenOnInstructorView":true,"simSpanOnInstructorViewS":227.8,"expectedTicks":11390,"cockpitWhileHidden":{"frames":11681,"firstTick":4280,"lastTick":15960,"contiguous":true},"cockpitAfterReturn5sWall":{"frames":2020,"firstTick":17974,"lastTick":19993,"contiguous":true},"etco2Before30s":{"min":32,"max":32},"etco2WhileHidden":{"min":32,"max":36,"samples":912},"vteBefore":300,"vteAfterReturn":299,"phonesAtX8":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"phonesAfterSpan":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"phonesAfterReturn":[{"hold":true,"status":"synced"},{"hold":true,"status":"synced"},{"hold":true,"status":"synced"}],"span":{"min":2,"via":"button","clockBefore":"02:19","fromT":140.2,"endT":260.2,"wallS":10.4,"speedBefore":8,"speedAfter":8,"rateAfter3s":8,"banner":"Fast-forwarded 2 min, 02:20 → 04:20. During it: no alarms.","alarms":[],"load1":7.21}}}

Debrief: not opened

Phones: {"rule":"a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as \"?\" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen","s12f2Seen":false,"marks":[],"perPhone":[{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":96,"status":{"synced":113},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":96,"status":{"synced":113},"resyncs":4,"lagS":0.1},{"maxMismatchS":0,"worst":null,"samples":113,"compared":1,"commonTiles":10,"sameNumberOtherMarkSamples":0,"holdSamples":96,"status":{"synced":113},"resyncs":5,"lagS":0}]}

Notes: phone 0 (iPhone 13 emulation) synced before Load · phone 1 (iPhone 13 emulation) synced before Load · phone 2 (iPhone 13 emulation) synced before Load

Errors: none
