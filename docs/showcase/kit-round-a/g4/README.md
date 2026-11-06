# Kit G4 rounds (main da364762, 6 November 2026)

Kit G4 is the classroom kit built from `main` at da364762 (`node scripts/showcase/make-bundle.mjs`, and a second build
with `--win-node node-v22.23.4-win-x64.zip --win-node-sums SHASUMS256.txt`, the zip's SHA-256 checked against the
SHASUMS256.txt from nodejs.org). The four rounds below are the ones kit G3 (main 079d4851) ran on 2 November, with the
same greps and panels, one at a time, Chromium, 3 emulated phones, reaction 2 s, on the BUILT kit served by its own
`Start Classroom.command` (`scripts/showcase/kit-round-setup.ts`):

| Folder | Round (`-g`) | Panel | Card |
|---|---|---|---|
| `a4-v2/` | `A4 /2 MH` | `PME_PANEL=teach2` | Malignant hyperthermia (phases), pme-scenario/2 |
| `q1-v2/` | `Q1 /2 30-minute talk` | `PME_PANEL=teach2` | the same |
| `a4-v1/` | `A4 MH` | `PME_PANEL=teach2` | Malignant hyperthermia (E119), the /1 card |
| `q1-v1/` | `Q1 30-minute talk` | unset (Instructor view) | the same |

All four exit 0, errors 0, every phone synced before Load and through the run, Debrief PDF 8 pages (A4 rounds).

Kit G3's records of the same four rounds were not committed; the G3 numbers below are read from that run's JSON/Markdown
(the orchestrator's scratch folder) and its ledger line of 2 November 06:58.

## Stops, kit G3 → kit G4 (clock · HR · ART · EtCO₂)

| Round | Stop | kit G3 | kit G4 |
|---|---|---|---|
| A4 /2 | Early signs (state) | 08:18 · 78 · 107/66 · 46 | 08:15 · 77 · 106/66 · 46 |
| A4 /2 | after span 1 | 14:00 · 81 · 103/66 · 41 (Recovering) | 13:57 · 80 · 104/65 · 41 (Recovering) |
| A4 /2 | after span 2 | 19:17 · 88 · 98/66 · 65 (Recrudescence) | 19:14 · 89 · 98/65 · 65 (Recrudescence) |
| A4 /2 | end | 24:40 · 69 · 94/57 · 42 (Recovering) | 24:37 · 69 · 93/57 · 42 (Recovering) |
| Q1 /2 | stop 1, Early signs | 08:18 · 78 · EtCO₂ 46 | 08:13 · 78 · EtCO₂ 46 |
| Q1 /2 | stop 2, after span 1 | 13:59 · 81 · 41 · RR 20 | 13:54 · 80 · 41 · RR 20 |
| Q1 /2 | stop 3, after span 2 | 19:20 · 89 · 66 (Recrudescence 15:08) | 19:15 · 88 · 66 (Recrudescence 15:04) |
| Q1 /2 | end | 24:39 · 69 · 42 · RR 20 | 24:34 · 70 · 42 · RR 20 |
| A4 /1 | Early signs (state) | 08:22 · 79 · 107/67 · 46 | 08:17 · 78 · 107/66 · 46 |
| A4 /1 | after span 1 | 14:03 · 81 · 103/65 · 41 (recovering) | 13:59 · 81 · 103/65 · 41 (recovering) |
| A4 /1 | after span 2 | 19:20 · 89 · 98/66 · 66 | 19:16 · 88 · 98/66 · 65 |
| A4 /1 | end | 24:44 · 69 · 94/57 · 42 (recovering) | 24:39 · 69 · 94/57 · 42 (recovering) |
| Q1 /1 | stop 1, Early signs | 08:15 · 77 · 46 | 08:19 · 78 · 46 |
| Q1 /1 | stop 2 / stop 3 / end | 13:56 · 80 · 41 / 19:16 · 88 · 66 / 24:36 · 69 · 42 | 14:02 · 81 · 41 / 19:22 · 89 · 66 / 24:41 · 69 · 42 |

Unchanged in every round: Tcore highest 36.8 (1 Hz record), Debrief labs (K⁺ 5.0, pH 7.32, glucose 6.6, Tcore 36.6;
lactate 3.7–3.8), no rhythm alarm or row, state/phase Recovering at the end, every treatment row met, potassium and CPR
rows not applicable, the /1 card's objectives ✓ ✓ ✓ ✓ – ✓. Look-inside stops (Q1): MH activity, K⁺, pH, PaCO₂,
Ce(dantrolene), V̇A, VO₂ and catecholamines within the last digit or ±9 pg/mL.

## Every difference and what explains it

| Difference | Explained by |
|---|---|
| Clocks of Early signs and every later stop move by −5 … +4 s, in both directions (A4 /2 −3 s, Q1 /2 −5 s, A4 /1 −5 s, Q1 /1 +4 s), and the values at a stop move by ≤ 1 unit with them | No PR: the presses are made by the wall clock at ×8/×4 (KITROUND_REACT_S), so the press and stop times jitter by seconds between runs (G3's own record: 1–6 s). Checked headless: `malignant-hyperthermia-v2.slow.test.ts` and `malignant-hyperthermia.slow.test.ts` on 079d4851 and da364762, the same scripted presses: the phase timeline is identical on both (latent 06:16, earlySigns 08:10, treated 09:57, recovering 10:57, recrudescence 14:59, treated 20:58, recovering 23:55) |
| /2 cards: the Debrief objective "✓ Name malignant hyperthermia" is gone; the action table gains a row "Name malignant hyperthermia from the monitor … met" | PR #276 (feat-retire-judged-rows): a judged row becomes a record action, window from Early signs + 120 s |
| /2 phase history now starts "00:00 baseline" | PR #262 (feat-history-first-stage): ScenarioView.history begins at the first stage |
| Each phone resyncs 4 times, not 5; Q1 /2's one "waiting" sample is gone | PR #194 (fix-cuff-start-cockpit-notice): the cuff's AUTO start at a card load no longer sends a cockpit notice, so the phones no longer hold ≈ 2.5 s and resync after Load |
| Induction/apnoea alarms (RR TOO LOW, ETCO2 TOO LOW/HIGH between 03:26 and 05:15) differ in count and second; NIBP SYS vs DIA TOO LOW at ≈ 05:35; A4 /1 G4 has an extra NIBP SYS TOO LOW at 20:30, Q1 /1 G4 has no NIBP alarm | No PR (no NIBP or capnometry file changed between the two commits): values near their limits at press-dependent moments; kit F → G3 showed the same flips. Recorded, not explained by a change |
| Q1 opening: `modelTabPrepared` 200 → "not loaded: page.goto: Timeout 20000ms exceeded"; Q1 rounds took 10.6 min (G3 5.5 min) | No PR: the model pages are on github.com, which did not answer from this machine on 6 November (curl to github.com timed out at 20 s). The engine path is not affected |

## The owner's smoke

`Start Classroom.command` (PME_PORT=9165, PME_NO_OPEN=1) printed "THE CLASSROOM IS RUNNING"; Home → "Start here" opened
`#/room` with the QR code, the session code, the join address and "0 phones following"; an emulated Pixel 7 opened
`?join=<code>`, reached "synced", and the Room listed "1 phone following · Phone 1 · Learner monitor · synced"; no
console errors. `scripts/showcase/check-relay.mjs` (the classroom relay smoke test of CI) on the kit: PASS 4 of 4.
The instructor phone's PIN form (P7) is not on `main` at da364762 (PR #309 open), so the kit has no instructor-phone way in.
