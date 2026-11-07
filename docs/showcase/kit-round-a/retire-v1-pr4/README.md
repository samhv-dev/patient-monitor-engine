# Kit round on the Instructor view only (retire-instructor-v1 PR 4, 7 November 2026)

The kit was built from the PR's tree at commit 0919cc66 (`node scripts/showcase/make-bundle.mjs`; its VERSION.txt
names that commit) and served by its own `Start Classroom.command` (`scripts/showcase/kit-round-setup.ts`,
`KITROUND_PORT` 9390 for Chromium, 9391 for WebKit). One round, one browser at a time: `A4 /2 MH` (the phases card,
pme-scenario/2), 3 emulated phones, reaction 2 s, 1440 × 900. **The round ran on `#/teach2`**, the only Instructor view
since 6 November: the page opens `?relay#/teach2`, the case is loaded from the Scenarios library, and every step is the
view's own (no `PME_PANEL` switch any more). Both browsers exit 0, errors 0, every phone synced before Load and through
the run, Debrief PDF 8 pages A4 (Chromium; WebKit has no `page.pdf()`).

| Folder | Round (`-g`) | Browsers | Comparison |
|---|---|---|---|
| `a4-v2/` | `A4 /2 MH` | Chromium, WebKit | kit G4's `../g4/a4-v2/` (Chromium, main da364762) |

## Stops, kit G4 → this round (clock · HR · ART · EtCO₂)

| Stop | kit G4 Chromium | Chromium | WebKit |
|---|---|---|---|
| Early signs (state) | 08:15 · 77 · 106/66 · 46 | 08:18 · 78 · 107/66 · 46 | 08:19 · 78 · 107/67 · 46 |
| after span 1 | 13:57 · 80 · 104/65 · 41 (Recovering) | 14:01 · 81 · 103/65 · 41 (Recovering) | 14:00 · 81 · 103/66 · 41 (Recovering) |
| after span 2 | 19:14 · 89 · 98/65 · 65 (Recrudescence) | 19:17 · 89 · 98/66 · 66 (Recrudescence) | 19:17 · 88 · 98/66 · 66 (Recrudescence) |
| end | 24:37 · 69 · 93/57 · 42 (Recovering) | 24:35 · 69 · 94/57 · 42 (Recovering) | 24:35 · 69 · 93/56 · 42 (Recovering) |

Unchanged: every press taken at the first press (look "taken"); the phase sequence baseline → latent → earlySigns →
treated → recovering → recrudescence → treated → recovering; EtCO₂ per minute after ventilation back within 1 mmHg of
G4's (+0 41 … +5 65, +6 52 … +10 43) and after the second dose identical (66 51 49 47 45 42); every Debrief action row
met, potassium and CPR rows not applicable, "Name malignant hyperthermia" met 2 s after Early signs; each phone resyncs
4 times; ventilation back after span 3 not pressed (its rule not met), as in G4.

## Every difference and what explains it

| Difference | Explained by |
|---|---|
| The clocks move by −2 … +4 s and the values with them by ≤ 1 unit; the runner's phase entries move by seconds (latent 381 s against G4's 387 s, Early signs 498 s against 496 s) | Press jitter: the presses are made by the wall clock at ×8/×4, 0–2 s apart from G4's (Induce 04:03/04:04 against 04:05). The engine path is unchanged: `malignant-hyperthermia-v2.slow.test.ts` on this head, scripted presses, gives G4's headless timeline exactly (latent 06:16, earlySigns 08:10, treated 09:57, recovering 10:57, recrudescence 14:59, treated 20:58, recovering 23:55). This PR changes no product file |
| Induction/apnoea alarms differ in count and second (an RR TOO LOW at 03:33 on Chromium; no ETCO2 TOO HIGH at 04:41; NIBP SYS TOO LOW on Chromium where G4 had NIBP DIA TOO LOW, none on WebKit) | The same near-limit flips at press-dependent moments that G4's README records against kit G3 (no NIBP or capnometry file changed) |
| `alarmButton*` read "No alarms IBP1 NO SENSOR opens the list" before Load, "No alarms opens the list" after | This PR: the record reads the Instructor view's alarm line (what the view shows) instead of the hidden top bar's count ("No alarms") |
| `setup.loadConfirm`: the library asked "Load this scenario?" on the fresh page | Recorded now, not before: the library's Load asks whenever the default patient is running; the old round confirmed the same dialog without recording it |
| Chromium phones: the S12-F2 rule is met (a number differing > 2 s): NIBP 3–4 s at wall 40 s (instructor's tile counting the cuff, phone showing 120 / 80); WebKit 1.5 s | G4 met the same rule on Chromium (AGENTS 4.5 s at wall 107 s). Not this PR (no product file); the parameter differs between runs. Recorded as a finding of the probe, not explained by a change |
| Load average 4.98–12.37 (G4 2.33–3.93) | Other executors on this Mac during the round |
| No `shot …` notes | G4 ran with `KITROUND_SHOTS` (each shot pauses the session; sim time does not move); this round did not |
