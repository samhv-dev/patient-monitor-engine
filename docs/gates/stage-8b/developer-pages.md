# Stage 8b — Developer-page review (Task 13b Step 2; FU-11 F24, F25)

Every page the Developer view lists (`apps/demo/src/app/views/dev.ts` on the Stage 8b branch) gets one verdict:
**keep** (it works and says what it is), **fix** (the defect named, fixed here), or **retire** (link and page removed).
Rebase-check ruling: Stage 14 (clean-up, after the rc) owns the further developer-page decisions (keep stage5 and stage7c,
fu4 conditional); this review prefers "fix" or "keep, record the defect" over "retire". **Nothing is retired here**, so
nothing collides with Stage 14.

Method: each page was opened in Chromium from the built demo (`pnpm build`, served over HTTP) and left to run; a page
passes "loads" when it renders with no page error or console error in that time. Results are in the table; the load
check's numbers are in the gate note (`docs/gates/stage-8b.md`, "Developer pages").

| Page | Verdict | Note |
|---|---|---|
| `physiology-console.html` | **fix** (F24) | A restart while paused left the button on "Resume" with the new engine running; the restart now keeps the pause, as the clinical app's does (`physiology-console/view.ts`). The baseline is cleared on restart and re-taken at 1:00, as before. One 404 on the first load (not reproduced on a second load; no page error). |
| `stage4b-device.html` | keep | loads, no errors |
| `stage4a-skins.html` | keep | loads, no errors |
| `stage5.html` | keep | loads, no errors (Stage 14 ruling: keep) |
| `stage6a.html` | keep | loads, no errors |
| `stage6a-remote.html` | keep | loads, no errors |
| `stage6a-viewer.html` | keep, defect recorded | opened from the Developer view without `?session=` it shows "Add ?session=ABC234 to the URL" AND throws an uncaught `no session` page error; harmless, listed for Stage 14 |
| `stage6b-acls.html?scenario=acls-vf-witnessed` | keep | loads, no errors |
| `vent-link.html` | keep | loads, no errors. Since FX-1, a separately opened `vent-hamilton.html?link=v<code>` window no longer joins a session (unused) |
| `stage0.html` … `stage3.html`, `stage7a.html` … `stage7f.html` | keep | each loads with no errors (Stage 14 ruling: keep stage7c) |
| `stage7g.html` | **fix** (F25) | the depth tile read `neuro.out.depthIndex`, which never existed, so it always said "depth index: 7f pending"; it now reads 7f's `neuro.diShown` ("depth index 93 (7f)" after load) (`apps/demo/src/stage7g.ts`) |
| `fu4.html`, `fu6.html`, `fu7.html` | keep | evidence pages; load with no errors (Stage 14 ruling: fu4 conditional) |
