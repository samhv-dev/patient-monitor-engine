# Gate: Debrief 2 (Option C)

The closing note of `docs/plans/debrief-2-option-c.md` (PR 7, piece D15), written against what merged on `main`
d3dcb34d (8 November 2026). Each Option C piece is listed with the pull request that built it, or the reason it is out.
The plan's own map from the research items to the pieces is its section 3 (C1–C11).

## Every piece, and the pull request that built it

| Piece | What it is | Built by | State on main |
|---|---|---|---|
| D0 | Baseline: the pre-D fixtures (`/1`-card and `/3` exports) and the readers pinned on them | PR #277 (merge 3c59bc07) | built |
| D1 | The record keeps systolic, diastolic and CVP each second; `RunData.keeps` | PR #282 (0df295da) | built |
| D2 | Alarm end (`endT`) and acknowledgement (`ackT`) on each raise row | PR #282 (0df295da) | built |
| D3 | The CPR stop as a run event (`cprStop`); the "Hands-off time" tile with the compression fraction and the 60 % and 80 % lines | PR #282 (0df295da) | built; see finding 1 below |
| D4 | "Who" of each state from the record's `by` | PR #293 (2be45b77) | built |
| D5 | Recognition, one reading: the `/2` action marked `recognition: true`; the `/1` tick, else the `/1` Recognised press | PR #293 (2be45b77), on PR #276 (f114b676, judged rows retired, which D5's `/2` part needed) | built |
| D6 | Key moments and the minute table read SBP/DBP, CVP and the alarm ends; the export | PR #293 (2be45b77) | built |
| D7a | The swimlane builder, with every timed action's expected window | PR #291 (1a944538) | built |
| D7b | The swimlane heads page 2 | PR #291 (1a944538) | built |
| D8 | `debriefHints` in both scenario formats | PR #286 (84f32050) | built |
| D9 | The hints and openers on page 2 | PR #286 (84f32050) | built |
| D10 | Hints on the showcase cards, drafted by an executor, edited or rejected by the owner | PR #286 (84f32050) shipped the route; the drafts are outside the repository | **no card carries hints**: every drafted line waits for the owner's answer, and only lines he accepts or rewrites enter a card |
| D11 | One Persian matcher for the script and the app (`apps/demo/src/app/i18n/fa-match.mjs`) | PR #290 (b5ce8306) | built |
| D12 | The Persian words for Option C | PR #325 (a6bf8fcf); the 26 lines earlier rulings had reserved for the owner, drafted on his ruling of 7 November: PR #326 (ff6962f1) | drafted; every entry it added is `reviewed: false` (pending, below) |
| D13 | The Debrief page and the learner handout in Persian (the switch, the bundled Vazirmatn, the DQ10 line) | PR #325 (a6bf8fcf) | built |
| D13b | The Case briefing in Persian for a card written in English (`briefing.textFa`) | PR #325 (a6bf8fcf) | built; **no showcase card carries `textFa`** until the owner has read the drafts |
| D14 | The PEARLS mode table | — | **withdrawn**: the owner ruled the two hint blocks only (DQ6, 5 November) |
| D15 | The docs, the rehearsal reader, this note | this pull request | — |
| D16 | Time-anchored questions on the learner handout (`debriefHints.handoutQuestions`) | PR #312 (115bd6ac) | built; **no card carries questions**: only questions the owner has reviewed enter a card |

Beside the plan, and read by its pieces:
- PR #314 (ccc381ba): a "Pressures" panel among the trend charts (the owner's ruling of 6 November, question 2 = B).
  It draws the systolic, diastolic and CVP that D1 keeps; the plan's DQ11 (no pressures on the course strip or the
  swimlane) is unchanged.
- PR #298 (0e2b8d50): every alarm row that leaves the alarm list emits its end event, which D2's `endT` reads.
- PR #303 (356fe20c): the wire `note` command carries the event tag, so a phone's Recognised press counts as the
  laptop's (the plan had left the phone's press out of scope until the peer-role pieces P6/P7).

## Gate run (8 November 2026)

**Kit round, both projects.** The kit was built from `main` d3dcb34d (`node scripts/showcase/make-bundle.mjs`) and
served by its own `Start Classroom.command`; 3 emulated phones, reaction 2 s, 1440 × 900; the reader of this pull
request. Every run passed, with 0 errors, and every phone synced.

| Round | Browser | Key-time tiles (as the page shows them) | Swimlane lanes | Hints | Report (English) | Handout (English) | Persian, in the app |
|---|---|---|---|---|---|---|---|
| A3.1 tamponade, cue-card path (`/1`) | Chromium | Recognition (instructor's tick) 1 min 08 s · first team action 7 min 51 s · three objectives 4 s, 1 min 30 s, 2 s · pulseless 3 min 08 s | patient ("pulseless 3 min 08 s"), team, expected windows (3, each "✓ Observed"), monitor alarms, drugs and fluids | none on the card | 8 A4 pages | 1 page | report 8 pages, handout 1 page; DQ10 line shown; 5 strings print in English |
| A3.1 tamponade | WebKit | the same six tiles (1 min 07 s · 7 min 51 s · 4 s, 1 min 30 s, 2 s · 3 min 09 s) | the same five | none | print-media screenshot | screenshot | screenshots; DQ10 line shown; the same 5 strings |
| A4 MH, phases card (`/2`) | Chromium | Recognition (timed action) 2 s, 08:16 early signs → 08:18, asked ≤ 2 min 00 s, ✓ met · first team action 1 min 04 s | patient, team, expected windows (6, every first taking and the repeat "✓ met"), monitor alarms, drugs and fluids | none on the card | 8 A4 pages | 1 page | report 8 pages, **handout 2 pages**; DQ10 line shown; 23 strings print in English |
| A4 MH, phases card | WebKit | Recognition (timed action) 2 s, ✓ met · first team action 1 min 03 s | the same five | none | screenshot | screenshot | screenshots; DQ10 line shown; 23 strings |

The MH run's action table: every action met; potassium (two rows) and CPR not applicable; "Name malignant
hyperthermia from the monitor" met 2 s after Early signs. Phases: baseline → latent 06:22 → early signs 08:16 →
treated → recovering → recrudescence 15:06 → treated → recovering 24:01, as in the 7 November round on the
Instructor view (`docs/showcase/kit-round-a/retire-v1-pr4/`), within its press jitter.

**The Persian script** (`scripts/showcase/debrief-fa.mjs`) on the two D-era exports of this round (`pme-debrief/2`
with `keeps` = pressures, alarmEnd, cprStop, recognised; and `pme-debrief/3`): the tamponade, 7 A4 pages, 114
table entries used (111 unread), 1 string without translation; the MH phases card, 8 A4 pages, 106 entries used (104
unread), 18 strings without translation (finding 2).

The PDFs and the JSON stay in the orchestrator's scratch folder (`scratch/debrief2-gate/`): the plan puts them in a
docs pull request only after the owner has looked at them.

**CI:** the result is in the pull request.

## Findings the reader exposed (reported, not fixed here: this piece changes docs and the reader only)

1. **The hands-off tile does not print on the A3.1 tamponade run.** `keyTimes` (`apps/demo/src/app/debrief-moments.ts`)
   draws at most six tiles (`MAX_TILES`), and the hands-off tile comes last; this run fills the six with the
   recognition, the first team action, three objectives and the pulseless time, so D3's tile is the seventh and is
   dropped. The hands-off seconds are kept in the record; the page does not show them on this card.
2. **The `/2` MH card's own words are not in the Persian table.** The card's title, its phase names, its actions and
   the timeline's "Scenario state: …" lines print in English in the app (23 strings) and from the script (18). The
   table holds the `/1` MH card's words; no `/2` MH run had been committed when D12 was drafted. Adding them is new
   Persian text, for the owner's reading, not this piece's.
3. **The MH learner handout in Persian runs to two A4 pages** in Chromium (in English it is one): the last two
   take-home lines and the closing line move to page 2. D13's one-page check is on the A3.1 tamponade run, where the
   Persian handout is one page here too.
4. The tamponade run prints 5 strings in English in Persian: the "Stage" column head of the "Steps on the card" table, three of the
   card's step labels in that table, and "Run of ventricular tachycardia (4 beats)" (the script lists the
   last one only).

## Pending: what this gate does not claim

1. **The owner's hand print in Safari.** No automated test prints through Safari's own print dialog (Playwright's
   WebKit has no `page.pdf()`; the round above takes print-media screenshots in WebKit). The procedure:
   1. On the Mac, in Safari, run a case to its end and open its Debrief (the run must be finished: the Debrief of a
      `/2` card is opened by "Finish the case" → "Debrief now").
   2. File → Print. Click **Show Details**.
   3. Untick **"Print headers and footers"**. Paper size **A4**.
   4. PDF → **Save as PDF**.
   5. Print the learner handout the same way ("Print the learner handout").
   6. Do the same with the switch on **فارسی**.
   7. Check: the handout is one page, in English and in Persian; no chart, the swimlane or the hints section is split
      across two pages.
   This check has not been made; it is not claimed here.
2. **The owner's reading of the Persian entries.** 718 of the table's 728 entries are `"reviewed": false` (the 10
   owner-approved ones are of 19 and 22 October); every Debrief 2 entry is among them. Until he reads them, the page
   and the script print "Persian draft: not yet read by the clinical owner" (DQ10), as the round above shows.
3. **The cards' own words:** the D10 hints, the D16 questions and the D13b briefing texts enter a card only once the
   owner has accepted or rewritten them. No showcase card carries any of them on d3dcb34d.
