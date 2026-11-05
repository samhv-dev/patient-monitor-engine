# Debrief 2 (Option C): the record grows, the recognised mark, the swimlane, authored hints, in-app Persian — Implementation Plan

**STATUS: READY TO BUILD 2026-11-05, BUILT WHOLE IN SEVEN PULL REQUESTS.** Every owner question (DQ1–DQ12) is ruled
(5 November, section 10), with one added requirement (the expected window of every timed action on the swimlane,
D7a/D7b) and two added scopes (the Briefing in Persian, D13b; the learner handout's time-anchored questions per card,
D16). On the evening of 5 November the owner ruled that Debrief 2 is built whole, not staged, on the seven-PR cut of
`research/42-ci-and-process-review.md` §2.3, and that the swimlane carries no pressures lane (section 10, R1 and R2).
PR 1 (D0) is open as PR #277 (head `595b4714`); PRs 2–7 follow in dependency order (section 8). Written by a planning
executor from brief 15 of the post-demo set; amended twice on 5 November with the rulings, and a third time (brief 31)
to regroup the pieces into seven PRs and restate effort in executor-hours and CI runs. No product code, test or card
was changed while writing it.

**Base and preconditions.**
- Base: `origin/main` **8718fe1d** (Merge PR #257, `release-rc5`), read in the worktree
  `scratch/wt-debrief2-plan` (branch `plan-debrief-2-option-c`). Every `file:line` below is on 8718fe1d and is a
  starting point only: an executor finds the code by the function name given, because comments move.
- The plan this one continues: `docs/plans/debrief-redesign.md` ("B via A", its section "Deferred (option C and
  later)", `debrief-redesign.md:1226–1252`). The research behind it: `research/33-debrief-redesign-research.md`
  (Option C at `:371–412`, recommendation F2 at `:424–427`), and the inventory rows R71
  (`research/40-post-demo-inventory.md:149`) and TCH-4 (`research/roadmap-whole-app-inventory-2026-10-27.md:224`).
- The mock-up is copied into this branch so it survives the disposable folder it came from:
  `docs/plans/debrief-2/mockup/` (`option-c-debrief2.html`, `.pdf`, `generate-option-c.py`, `mock.css`, and the folder's
  `README.txt`, which lists for each mock-up what is measured and what is illustrative). It was built on 18 October
  from a rc.1 `pme-debrief/1` export; its † values (SBP, DBP, CVP, alarm end times, the 02:10 Recognised mark) and its
  orange-tagged wording (hints, openers, the PEARLS mode table, take-home lines) are invented for the layout and are
  not data and not clinical text.
- Branches that touch the same files and are not on main at 8718fe1d (checked with `git merge-base --is-ancestor`
  on 2026-11-05; the GitHub API timed out from this machine, so their PR state was not read):
  - `docs-fa-handout-strings` (3 commits, last 2026-10-29): `fa-debrief.json`, `debrief-fa.mjs`,
    `packages/validation/test/debrief-fa.test.ts`. The Persian pieces (D11–D13) rebase over it or wait for its fate.
  - `feat-peer-p3` (instructor peer role P3): `packages/controller/src/session/host-session.ts` only. The phone's
    Recognised press (out of scope here) waits on the peer-role pieces P6/P7 (`research/40-post-demo-inventory.md:53`).
- Path correction to the brief: the run record is `apps/demo/src/app/record.ts`, not `packages/controller/src/record.ts`
  (no such file on 8718fe1d).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Steps use checkbox (`- [ ]`) syntax for tracking.
> The pieces are grouped into SEVEN pull requests (section 8, the review's §2.3 cut). Inside a PR each piece keeps its
> own tests, acceptance and gate, in the PR's strict internal order: tests first, one red→green commit per fact.

---

## 1. Intent

The Debrief today ("B via A") reads well, but it can state only what the record keeps, and the record does not keep
several things the facilitator needs: the pressures the tamponade card is built around (systolic, diastolic, CVP),
when an alarm stopped, when compressions stopped, and a time to recognition on a card that has no "Name the …"
objective. Option C makes the record keep them, then shows them: the pressures in the key-moments table and the minute
appendix, the alarm ends, compressions and recognition on a swimlane of the run and as tiles. It adds the owner's own words per card (debrief hints and analysis openers), and it lets the Debrief
page itself read in Persian.

The order is the research's (`research/33:424–427`): first what makes "who" and "recognition" exact rather than
inferred, then the pressures, then the swimlane, then the authored hints, then Persian.

## 2. Goals, non-goals, anti-goals

Goals
- Every Option C item listed in R71 is either built from the record and the grade, or stated as out of scope with
  the reason: the recognised mark on every case; systolic, diastolic and CVP; alarm end times; team rows for manual
  transitions; CPR hands-off time; the swimlane; authored per-scenario hints; advocacy-inquiry openers (E46);
  in-app Persian.
- A record made by an older build (a `pme-debrief/2` or `/3` file, an archived debrief, a position kept across a
  reload) still opens and prints, and every new column reads "not recorded in this file" there, never "–" (which
  means "not measured") and never a guess.
- Every timed action's expected window is drawn on the swimlane (anchor to deadline, as a band) with the actual act as
  a tick inside or outside it, marked with the verdict words (owner, 5 November): from `grade()` for a `/2` run, from
  the card's `eventWithin` objectives for a `/1` run.
- One reading per fact: the recognised mark, the team rows and the grades each come from one function over the
  record (and, for a `/2` card, `grade()`), shared by the Debrief view, the export, the archive and the Persian
  renderers.

Non-goals
- No change to the engine or the physiology. The E60 calibration items stay in the calibration queue (section 9).
- No score, no pass mark, no percentage of objectives (the run sheet's "it reads the run, it does not grade the
  person", `views/debrief.ts:389`).
- The learner handout stays what it is (`views/debrief.ts:428–446`, no values, no verdicts) except for two things:
  a recognition row, being a key moment, appears in its key-moments table; and (DQ12, ruled 5 November) a card's own
  time-anchored questions, drafted by an executor and printed only once the owner has reviewed them (D16). A question
  is never generated at run time and never has a time or value written into its sentence (Decision 8).
- No in-app Persian outside the Briefing, the Debrief page and the learner handout (DQ9, ruled 5 November; the rest of
  the app is DOC-1, `research/roadmap-whole-app-inventory-2026-10-27.md:290`).
- No pressure band on the course strip (DQ11, ruled 5 November): the new pressures go in the key-moments table and the
  minute appendix only; a band on the strip is a later item, mock-up first.
- No phone press of the Recognised mark (it waits on the peer-role pieces P6/P7).

Anti-goals
- A value on paper that the record does not hold (an inferred systolic, an alarm end guessed from a re-raise, as the
  mock-up's † values were).
- A second bookkeeping: a list of "recognised" times or "team" moments kept beside the record, which could disagree
  with the record's rows or with `grade()`.
- A generated clinical sentence (E46): every printed sentence is computed fact (times, values, the glossary's and the
  alarm table's words) or fixed text the owner confirmed. Authored hints print verbatim; a record time may stand
  BESIDE an authored sentence as a label, never inside it.
- A clinical threshold chosen by an executor (a hands-off target, a compression-fraction goal): those are the
  owner's, with a named source.

## 3. Every Option C item mapped to the data it needs

"Today" names the line read on 8718fe1d. "Grows" says what the record or the scenario format must add. All growth is
additive (section 4, Decision 1).

| # | Option C item | What the Debrief needs | Today on 8718fe1d | Grows? | Piece |
|---|---|---|---|---|---|
| C1 | Team rows for manual transitions | per state/phase row: entered by the instructor's press, by its own rule, or by a jump | **In the record already.** A state row carries `by: 'press' \| 'rule' \| 'goto'` (`record.ts:38–41`, written at `record.ts:167–171` from the runner's own event); the trigger command itself is not a row (`record.ts:184`). But the Debrief does not read `by`: `whoOf` infers "team" from the card's transitions (`debrief-moments.ts:27–31`), and returns `'scenario'` for every phase of a `/2` card because `asV1(d.doc)` is null there (`debrief-moments.ts:28`), although a `/2` phase is always entered by its own rule (`record.ts:163–167`) | No (read `by`; fall back to `whoOf` only for a record with no `by` on any state row, as `steps()` already tests at `debrief.ts:241`) | D4 |
| C2 | The recognised mark on every case (ruled 5 November: on `/2` cards "recognise and announce the diagnosis" is a timed action, judged rows retired; the generic press is the `/1` fallback only) | one time per run: when the team named the problem, as the instructor recorded it | Only where the card has one: a `/1` objective with `debrief: 'recognition'` ticked in the Scenario tab (`panel/scenario.ts:114` writes the note `Objective met: …`; read at `debrief.ts:194`, tile at `debrief-moments.ts:131–136`), or a `/2` judged row of kind `recognition` pressed in Instructor v2 (`teach2/press.ts:41` writes the same note; `report3` matches it at `debrief.ts:367`; tile at `debrief-moments.ts:138–141`). `grade()` returns the judged row's clock start `fromT` but no press time (`grade.ts:370–373`). A card with neither (haemorrhage, induction, every library card) has no recognition at all | `/1`: one new note event `ev: 'recognised'`, written only on a `/1` card (or a free run) with no recognition objective. `/2`: no record change: the action's administration and `grade()` (it depends on the card change that retires the judged rows; on `origin/main` 9a4636c2 the MH `/2` card still has `"judged"`, `showcase-mh-v2.json:1003`) | D5 |
| C3 | Systolic, diastolic, CVP at 1 Hz | the monitor's ART S/D (or NIBP S/D) and CVP numerics per sample | Not recorded. `TREND` keeps six numerics (`record.ts:54`); the monitor's ids exist (`glossary-data.ts:24` `mon.abpSys`, `:25` `mon.abpDia`, `:27` `mon.cvpMean`, `:32` `mon.nibpSys`/`nibpDia`) and every measurement event already passes through `RunRecord.engine` (`record.ts:250–252`), which keeps only the TREND ids in a sample (`record.ts:266`) | Yes: three sample keys | D1 |
| C4 | Alarm end and acknowledgement times (both stored, ruled 5 November) | per alarm raise: when its condition cleared, and when it was acknowledged | Not recorded. A raise is a row (`record.ts:221–222`); the tracker forgets the alarm when it leaves the active list (`record.ts:223`). The engine's status carries what is needed: `AlarmEntry.latched` ("the condition is gone but the alarm is latched") and `acked` (`packages/engine-core/src/types-device.ts:51–61`) | Yes: `endT` and `ackT` on the raise row | D2 |
| C5 | CPR hands-off time | when compressions started and stopped, inside the pulseless spans | Half recorded. A CPR command row gets `ev: 'cpr'` only when it starts compressions (`record.ts:212`); a stop is a row ("CPR stopped", `describe.ts:68–69`) with no `ev`. Pulseless spans exist (`debrief-moments.ts:35–44`) | Yes: `ev: 'cprStop'` on the stop row | D3 |
| C6 | The swimlane (placement ruled 5 November: heads page 2) | lanes: patient, team, the expected windows, monitor alarms (raise ▸ end, acknowledged), drugs and fluids; no pressures lane (DQ11) | Partly: the course strip draws the moments, the four trends and the marks (`views/debrief-course.ts:186`); lanes need C1, C4, C11 | No (built from C1, C2, C4, C5, C11) | D7a, D7b |
| C11 | Expected windows on the lanes (new, owner 5 November) | per timed action: its window (anchor → deadline), the act's time, its verdict | `/2`: `report3` already carries each graded action's `dueT`, `windowS`, `givenT`, `firstGrade` and repeats (`debrief.ts:316–323`, from `grade()`, which reads the rule edges the record copies, `record.ts:84–86`, `grade.ts:196`). `/1`: an `eventWithin` verdict carries `measure` only when both events happened (`debrief.ts:138`); a window whose act never came (`:139`) or whose run ended early (`:140`) keeps no times | `/1`: an additive `window` on the verdict (`{ fromT, askedS }`) whenever the anchor was found; no record change | D7a |
| C7 | Authored per-scenario hints | the card's own "what this case is built to show" | Not in either format. `/1` has `story` and `takeHome` (`types.ts:150–159`; schema `pme-scenario-1.schema.json:17–19`); `/2` has `takeHome` (`pme-scenario-2.schema.json:18`) | Yes: an optional document-level `debriefHints` in both schemas | D8, D9, D10 |
| C8 | Advocacy-inquiry openers (E46) | the owner's sentence per card, and the event it is about | Not anywhere. The page prints the four fixed PEARLS prompts (`views/debrief.ts:40–45`) | Yes: `debriefHints.openers[]` with an anchor event; printed only when the anchor happened on the kept course | D8, D9, D10 |
| C9 | In-app Persian (ruled 5 November: the Briefing, the Debrief page and the learner handout) | the Debrief page and its handout in Persian, from the one table; the Briefing in Persian for a card written in English | Persian is a handout script only (`scripts/showcase/debrief-fa.mjs:1–14`; `docs/showcase/i18n/README.md:3–8`); the table has 46 entries still `"fa": null` (the `/3` words of F7.6, `research/40-post-demo-inventory.md:115`) | No record change; the matcher moves to a shared module, the font is bundled. The Briefing already renders a card written in Persian (`lang: 'fa'`, `briefing.ts:14–16`, `:62–69`; schema `pme-scenario-1.schema.json:21–31`, `types-v2.ts:137–138`) but has no Persian text for a card written in English, and no font file (`briefing.ts:14–15`) | D11, D12, D13, D13b |
| C10 | Key moments with SBP/DBP/CVP and alarms cleared | the table's new columns and lines | `momentsTable` prints HR, MAP, SpO₂, EtCO₂ and "Alarms since the last row" (`views/debrief.ts:303–316`) | No (reads C3, C4) | D6 |

### Does the export change schema? No bump; a capability list instead

The house rule so far: an additive change keeps the schema (answer 17, quoted at `debrief.ts:475–478`; E47,
`research/33:451`). Every growth above is additive: new sample keys, a new optional field on alarm rows, a new `ev`
value on CPR stop rows, a new `ev` value on a note row, and a new optional scenario block that travels inside
`record.doc`. So `pme-debrief/2` (a `/1` card's run) and `pme-debrief/3` (a `/2` card's run, `debrief.ts:506`) both
STAY, and no `/4` is made.

What an additive change cannot say by itself is whether an absent value was not measured or not recorded by that
build. So D1 adds one field to `RunData`: `keeps?: string[]`, the facts this build's recorder keeps (`'pressures'`,
`'alarmEnd'`, `'cprStop'`, `'recognised'`; each piece D1, D2, D3, D5 adds its own word). A reader treats a word
missing from `keeps` (or `keeps` absent) as "not recorded in this file". The rule for every reader:

- a `/2` or `/3` file, an archived debrief (`archive.ts:4` stores `debriefJson`; the view reads `.record`,
  `views/debrief.ts:530`) or a kept position (`record.ts:286–288`) made before D1 opens and prints exactly as it does
  on 8718fe1d, plus "not recorded in this file" where a new column would be;
- `scripts/showcase/debrief-fa.mjs` keeps accepting `/1`, `/2`, `/3` (`debrief-fa.mjs:509`) and ignores what it does
  not print;
- a test per reader pins it on a committed pre-D export (D0 freezes them).

---

## 4. Decisions this plan makes where the brief and the rulings were silent

None of these is clinical. Each can be reversed by the orchestrator before the piece starts.

1. **No schema bump; `RunData.keeps`** (section 3). Rejected: `/4` and `/5` (two new names for one additive change,
   and every reader would need two more switches).
2. **"Who" comes from the record's `by`.** `press` → team, `rule` → patient, `goto` → scenario (the instructor's
   jump). A record with no `by` on any state row (made before Instructor v2 IP8) falls back to today's `whoOf`
   inference, so old exports print as they do now. A `/2` phase row is `rule` (`record.ts:166–167`), so the MH `/2`
   card's phases become patient events, not grey scenario states.
3. **Recognition has one reading; the press exists only as the `/1` fallback** (ruled 5 November, DQ4).
   - On a `/2` card, "recognise and announce the diagnosis" is a timed action of the card (the owner retired the
     judged rows on 5 November): it is pressed and graded like every action, and the Debrief reads its time and grade
     from `report3`/`grade()`. No button and no note row of its own. Which action it is: the one marked with the
     additive `recognition: true` (at most one per card), defined in D5 because PR #276 left the format without a
     marker (amended 5 November evening).
   - On a `/1` card with a recognition objective (`debrief: 'recognition'`), the tick stays as it is
     (`panel/scenario.ts:114`); the "Recognised" button in the session bar (beside Bookmark, `sessionbar.ts:47`) and the
     Instructor v2 dock (`teach2/dock.ts:18–22`) sends that same note.
   - On a `/1` card without one, or a free run, the button writes one note row with `ev: 'recognised'` through the
     existing note path (`link.ts:148` → `RunRecord.note`, `record.ts:304–306`, which gains an optional `ev`). The
     button is not shown on a `/2` card.
   - The Debrief reads all three through ONE function, `recognitionAt(d)` in `debrief-moments.ts`, which the tile,
     the key moments and the swimlane call. The first kept one counts, as the tick is today (`debrief.ts:194`).
4. **Alarm end is `endT` and acknowledgement is `ackT`, both on the raise row** (ruled 5 November, DQ2). `endT`: the
   time the alarm left the active list or first reported `latched: true`, whichever is first (the condition cleared).
   `ackT`: the first status reporting `acked: true` (`types-device.ts:61`). A return to a bookmark
   clears every `endT` and `ackT` later than the restore time on kept rows, as `undo()` already resets the tracker
   (`record.ts:343–355`). An alarm still active at the record's end has no `endT` and is drawn open to the end.
5. **CPR stop is `ev: 'cprStop'` on the command row**, the same source as the existing `cpr` event
   (`record.ts:212`), scenario-issued commands included (they are rows of kind `scenario`, `record.ts:206`). D3's
   acceptance cross-checks the rows against the engine's `hemo.cpr.active` on a scripted run, so a stop the engine
   makes without a command (if any exists) is found, not assumed away.
6. **Pressures are three sample keys outside `TREND`**: `sys`, `dia` (each the first valid of ART then NIBP, the same
   order `TREND.map` uses, `record.ts:54`) and `cvp` (`cvpMean`). A cuff value sits only in the sample of the second
   its cycle reported, so a trend draws the gap between cycles blank, and a key moment prints the last reading with its
   age (ruled 5 November, DQ1). Outside `TREND` so that the six trend charts
   (`views/debrief.ts:405`), the value rules (`debrief.ts:39`) and the minute table's existing columns do not change
   by side effect; D6 adds them to the minute table and the key-moments table on purpose. Rejected: adding them to
   `TREND` (three new trend charts and new rule keys nobody asked for).
7. **Hints are a document-level `debriefHints` block** in both scenario schemas, additive in `/1` and `/2`:
   `{ show?: string[] (≤ 4), openers?: Array<{ at: RunEventId | Anchor; text: string }> (≤ 4) }`. The name avoids the
   objective-level `debrief` enum (`pme-scenario-1.schema.json:60`). `takeHome` stays where it is.
8. **Openers are never interpolated.** An opener prints verbatim with its anchor's recorded time and moment number
   beside it as a label ("06:13 · moment 2"), and is left out when its anchor did not happen on the kept course. The
   mock-up's "I saw the systolic go below 80 at 06:13 [moment 2]" is the shape rejected.
9. **In-app Persian shares the script's matcher.** The table lookup and template matcher move from
   `debrief-fa.mjs:27–60` (and the functions after it) into one module both the script and the app import, so the
   app and the handout script print the same Persian from the same `fa-debrief.json`. Rejected for now: rebuilding
   every sentence as a message id with parameters (`research/33:61–62` proposes it): it rewrites every reason line in
   `verdict()` (`debrief.ts:113–183`) for no change on paper; it stays a later refactor.
10. **The Persian font is bundled** (Vazirmatn, SIL OFL 1.1) into `apps/demo/src/app/fonts/`, beside the fonts
    already there, and declared in `NOTICES.md` and `LICENSES/`, so `pnpm check-licences` (`ci.yml:42`) passes. Today
    the script needs the font from outside the repository (`docs/showcase/i18n/README.md:28–31`).
11. **The ruled verdict words everywhere** (ruled 5 November, DQ8): ✓ Observed · ✗ Not observed · – Not assessable ·
    ◆ Discuss for `/1` (E42, `views/debrief.ts:49–55`) and the grade words for `/2` (`views/debrief.ts:81`), on the page,
    the swimlane's windows, the handout and the Persian table; the mock-up's "○ Instructor" and "◆ Gap to explore" are
    not used.
12. **Piece numbering D0…D15** is local to this plan; owner questions are DQ1…DQ12, and the orchestrator gives them
    E numbers (the last in use is E141) when it sends the list.
13. **"Coloured by the verdict words" within E45.** The two print accents are taken (blue team, vermillion patient,
    each with a shape, E45). A window band and its tick therefore carry the verdict the way the chips do: the glyph and
    the word beside the tick, and the band's outline weight and fill as the chip's (solid, bold, dashed grey, grey
    fill; `views/debrief.css:43–46`). A hue per verdict would reopen E45: the orchestrator asks the owner only if he
    meant hues.
14. **The handout's card questions** (D16) live in `debriefHints.handoutQuestions` (≤ 3, each `{ at, text }`, the
    openers' shape, Decision 7). When a card has reviewed questions, they print under "Questions to think about" in
    place of the first two fixed prompts (`views/debrief.ts:249–250`), each with its anchor's `mm:ss` as a label before
    it and three ruled lines; the third fixed prompt ("One thing you will keep doing …", `:251`) stays. A question
    whose anchor did not happen on the kept course is left out and a fixed prompt takes its place, so the handout keeps
    its one-page shape (`debrief.e2e.ts:433`, `:464`).
15. **One Persian setting for the host.** The Debrief page's switch (D13) is also the language the host's Briefing is
    sent in (D13b): the setting lives with the host's other per-browser settings, and the Briefing notice already
    carries a `lang` (`briefing.ts:62`), so followers and phones need no setting of their own.

---

## 5. Global constraints (every piece)

- `00-common-rules.md` applies to every executor: own worktree under `scratch/` on a branch from `origin/main`; never
  merge, tag, force-push or push gh-pages; one PR per group of section 8 (seven in all), draft until its checks pass; `npx -y pnpm@9.15.9`; the
  executor's port range only; no owner identifier anywhere; no closing keyword before a `#number`.
- **Tests first** in every piece: the failing test is committed before the code that makes it pass, and the PR body
  pastes both runs.
- **Stable selectors stay** (`debrief-redesign.md:125–132`): `#db-objectives li[data-status]`, `#db-facts dt/dd`,
  `#db-timeline tbody tr`, `#db-minutes tbody tr`, `.db-foot`, `.db-notes`, `#db-who`, `#db-keytimes`, `#db-course`,
  `#db-moments`, `#db-pearls`, `#db-handout`, `li[data-mark]`, the three buttons by their names, `h1` "Debrief". New
  ones are added, never renamed: `#db-swimlane`, `#db-hints`, `[data-recognised]`, `[lang=fa]`.
- **Decision 11 of the A/B plan stays:** `render()` rebuilds only `#db-live-1` and `#db-live-2`; `#db-who`,
  `#db-pearls` and `.db-notes` are never re-created (`views/debrief.ts:321–327`). The language switch (D13) re-renders
  the two containers and the handout only.
- **Print:** A4 portrait; the Chrome footer on every page through `@page` (`views/debrief.ts:200–201`), the Safari
  footer line at each block end (`views/debrief.ts:197`); the footer text is `FOOT` (`views/debrief.ts:37`) and is
  never edited by these pieces. Page 1 stays within one A4 page on the tamponade, MH and haemorrhage cards (the e2e
  at `apps/demo/e2e/debrief.e2e.ts:321`, `:433`, `:464`, `:491` pins it today; every view piece keeps those green).
- **Colour (E45):** the two accents, each with a shape and a word (`views/debrief-course.ts:33–35`); any new lane
  uses the same pair and the grey.
- **Model-docs guard:** `docs/model/presentation.md` is rendered from the comments of `debrief-moments.ts`,
  `debrief.ts` and `views/debrief-course.ts` (`presentation.md:124`, `:308–314`). Before every push that changes a
  source file:

```bash
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
```

  A regenerated page is committed as `docs(model): regenerate after D<n>`.
- **Local testing before a push (review §2.4 item 5, ruled 5 November):** run only the unit test files the commit
  touches and the one e2e file it touches (one pass, chromium then webkit); never a full suite locally: CI runs the
  full suites on both projects, with its retries. New e2e tests go after the existing Debrief tests
  (`apps/demo/e2e/debrief.e2e.ts`) and are never tagged `@known-flaky`; a new test that fails once in CI is a finding,
  not a re-run.
- **Persian:** every Persian string is written with the `persian-writing` skill, enters the table with
  `"reviewed": false` and a `source`, and is read by the owner line by line before it is marked reviewed. No executor
  marks an entry reviewed. Register and digits as the table states (`fa-debrief.json:1–4`).
- **Shared machine:** one local e2e or kit-round run at a time; never an unfiltered `pkill`.

## 6. Review focus (for each piece's reviewer)

1. **A value not in the record.** Every number traces to a sample or a row; an old file prints "not recorded in this
   file"; an unmeasured value prints `–`. Pinned per piece by a unit test on a committed export.
2. **A second bookkeeping.** `git grep` the diff for a new array of times or moments kept outside `RunData` and
   outside `grade()`; recognition has one reader (`recognitionAt`), "who" has one (`whoAt`).
3. **A generated sentence.** Template literals in `views/debrief.ts` interpolate only labels, times, values and the
   glossary's words; authored hints are printed as data (`textContent`), never parsed.
4. **Old readers.** `debrief-fa.mjs` renders the committed `/1`, `/2`, `/3` fixtures with the same page counts and
   `0 strings without translation` where it was 0; an archived pre-D debrief opens.
5. **Undo.** Every new field survives a return to a bookmark correctly (`record.ts:343–355`): an `endT`, a `cprStop`
   or a `recognised` row on the undone course is undone with it.

---

## 7. Pieces, grouped into seven pull requests

The pieces are grouped exactly as the review's §2.3 table (`research/42-ci-and-process-review.md`): PR 1 = D0;
PR 2 = D1 + D2 + D3; PR 3 = D4 + D5 + D6; PR 4 = D7a + D7b; PR 5 = D8 + D9 + D10; PR 6 = D11 + D12 + D13 + D13b;
PR 7 = D16 + D15. Nothing is dropped: every piece keeps its tests, acceptance, "must not touch" and gate below; only
the PR boundaries moved. Rules for a grouped PR:

- **Strict internal order:** the pieces go in the order each PR heading gives; one piece is finished (its acceptance
  green locally on the touched files) before the next starts.
- **Tests first, one red→green commit per fact:** each fact a piece names (one Red bullet) is a failing-test commit
  followed by the commit that makes it pass; a piece's model-docs regeneration is its own commit
  (`docs(model): regenerate after D<n>`).
- **The gate of a PR** is the union of its pieces' gates, run once by CI on the PR's head; D0's compat test stays green
  at every commit. Local runs follow section 5 (touched unit files and the touched e2e file only).
- **The PR body** has one section per piece: what it built, its red and green runs, and what it measured.

Each piece's hours are the plan's original unit ("focused executor hours … as the A/B plan counted them",
`debrief-redesign.md:352–384`), kept so the rulings' history in section 8 still adds up. Section 8 converts them to
executor-hours as measured this week (plan h ÷ 6–8, review §2.1) and names the owner's reading separately.

### PR 1: D0, the baseline (DONE: PR #277, head `595b4714`)

PR #277 ("test(debrief): Debrief 2 D0: pre-D fixtures (/1-card and /3 exports) and pinned readers") is open at head
`595b4714`, CI running when this was written; its fixtures and snapshot are the guard every later PR keeps green.

#### D0: Baseline, fixtures, the pre-D readers pinned (2 h)

**Depends on:** nothing. **Files:** `apps/demo/src/app/debrief-compat.test.ts` (new), fixtures under
`apps/demo/src/app/__fixtures__/debrief-2/` (new; copies of committed exports, no new recording).

- [ ] Copy three committed exports as the pre-D fixtures: a `/2` tamponade A3.1 run, a `/2` MH early-call run and a
  `/3` MH `/2` run (the latest committed under `docs/showcase/kit-round-a/`; `git ls-files docs/showcase/kit-round-a |
  grep json` names them; the executor records which in the PR body).
- [ ] Test (green on 8718fe1d, the guard every later piece keeps green): `objectives`, `facts`, `keyMoments`,
  `keyTimes`, `report3`, `perMinute` on each fixture equal a snapshot taken on 8718fe1d; `debriefJson` round-trips.
- [ ] Record the baseline counts: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/debrief`, the
  Debrief e2e on both projects, and `node scripts/showcase/debrief-fa.mjs` on the three fixtures (`0 strings without
  translation` or the count it prints today).

**Acceptance:** the new test passes on 8718fe1d unchanged. **Must not touch:** any source file. **Gate:** unit +
CI green. **PR:** 1.

### PR 2: the record, D1 + D2 + D3 (in that order)

One file chain (`record.ts`), one size measurement (D1's), three facts. **Depends on:** PR 1 merged.

#### D1: The record keeps systolic, diastolic and CVP; `RunData.keeps` (5 h)

**Depends on:** D0. **Files:** `apps/demo/src/app/record.ts`, `record.test.ts`, `debrief-compat.test.ts`.

- [ ] **Read first (DQ1, ruled 5 November):** how the hemo pipeline emits NIBP numerics
  (`packages/engine-core/src/l2/hemo/pipeline.ts:385–405`): once per cuff cycle, or the last value every second. The
  PR body states it with the line read. No engine change either way.
- [ ] **Red:** a measurement event with `abpSys` 92, `abpDia` 58, `cvpMean` 17 gives a sample with
  `sys: 92, dia: 58, cvp: 17`; with ART invalid and a cuff cycle `nibpSys` 100 at second 40, the sample of second 40
  has `sys: 100` and the samples of 41… until the next cycle have `sys: null` (the gap stays blank on a trend, DQ1),
  however the pipeline repeats the value; an invalid value is `null` (`record.ts:251`); a new record has `keeps`
  containing `'pressures'`; `emptyRun()` (`record.ts:119`) too.
- [ ] **Implement:** a `PRESSURES` table beside `TREND` (Decision 6), read in `sample()` (`record.ts:263–276`); a cuff
  value is taken only on its cycle (by the event that carries a new cycle, as the read-first step found);
  `Sample` gains `sys`, `dia`, `cvp` as optional `number | null` (an old record type-checks); `RunData.keeps?: string[]`.
- [ ] **MAP from the cuff today:** the executor states whether `map` already holds a stale cuff value between cycles
  (`TREND.map`, `record.ts:54`). If it does, that is reported to the orchestrator as a separate finding; D1 does not
  change `map`.
- [ ] **Size:** measure the JSON bytes per simulated minute of the A3.1 path before and after (one number each, in
  the PR body), because the archive lives in `localStorage` (`archive.ts:1–7`).

**Acceptance:** red then green; D0's compat test still green; the pre-D fixtures read `sys` as `undefined`, which
`debrief-compat.test.ts` maps to "not recorded". **Must not touch:** `TREND`, `VALUE` (`debrief.ts:39`), the charts,
the engine. **Gate:** typecheck, unit, model-docs guard, CI green. **PR:** 2.

#### D2: Alarm end and acknowledgement times (5 h)

**Depends on:** D1 (same file, committed after it in PR 2). **Files:** `record.ts`, `record.test.ts`.

- [ ] **Red (DQ2, ruled 5 November: both stored):** an alarm raised at 10, still active at 11, absent from the
  status at 25 has `endT: 25`; one reported `latched: true` at 20 and `acked: true` at 30 has `endT: 20, ackT: 30`;
  one acknowledged at 12 while its condition lasts to 40 has `ackT: 12, endT: 40`; one active at the end has neither
  unless acknowledged; a return to a bookmark at 15 clears every `endT`/`ackT` after 15 (the alarm active at the
  bookmark, `record.ts:196`, `:353`); a re-raise after the end is its own row (as today, `record.ts:222`); `keeps`
  gains `'alarmEnd'`.
- [ ] **Implement:** in `engine()`'s `alarmStatus` branch (`record.ts:221–223`) keep the raise row per active id; set
  `endT` on the first status where the id is absent or `latched`, `ackT` on the first with `acked`; `undo()` deletes
  both when later than `t` on kept rows. `Row.endT?: number`, `Row.ackT?: number`, each with its doc line.

**Acceptance:** as Red; D0 green. **Must not touch:** the alarm manager (`packages/engine-core/src/l3/alarms/`),
`alarmLine`. **Gate:** typecheck, unit, model-docs guard, CI green. **PR:** 2.

#### D3: CPR stop in the record; hands-off time (5 h)

**Depends on:** D2 (same file). **Files:** `record.ts`, `record.test.ts`, `debrief-moments.ts`,
`debrief-moments.test.ts`, `debrief.ts` (the `DebriefExport` key-time id union, `debrief.ts:487`).

- [ ] **Red (record):** a `cpr` command with `active: false` gets `ev: 'cprStop'`; `keeps` gains `'cprStop'`.
- [ ] **Red (cross-check):** a scripted engine run (the controller's own harness, as `record.test.ts` builds runs)
  with CPR on, off, on, off inside one pulseless span: the rows' on/off times equal the edges of the engine's
  `hemo.cpr.active` (`pipeline.ts:289`, `:440`) within one tick. If they do not, STOP and report: a stop without a
  command is a finding for the orchestrator, not something to infer.
- [ ] **Red (key time):** `handsOff(d)` = the time inside the pulseless spans (`pulselessSpans`,
  `debrief-moments.ts:35–44`) when compressions were not active, with the compression fraction
  `1 − handsOff / pulseless`; a record without `'cprStop'` in `keeps` gives no `handsOff` tile (not a guess from the
  start rows only). A tile `id: 'handsOff'` joins `keyTimes` after `pulseless` (`debrief-moments.ts:150–158`), within
  the six-tile cap (`:23`, `:160–161`).
- [ ] **DQ3, ruled 5 November:** the tile prints the hands-off seconds and the compression fraction, with a small
  fraction bar carrying two reference lines at 60 % and 80 % (labelled "60 %" and "80 %"), and no grade, no verdict
  word, no colour change at either line. The definition stays the one above. The reference values are the owner's;
  the PR body cites the source the plan named (Meaney et al., *Circulation* 2013;128:417–435) for the reviewer to
  check, and prints no citation on the page unless the owner asks.
- [ ] A DOM test: the tile's text contains the seconds, the fraction and "60 %" and "80 %", and none of the verdict
  words.

**Acceptance:** as Red. **Must not touch:** the `cpr` rule event (`record.ts:212` keeps `ev: 'cpr'` on starts).
**Gate:** typecheck, unit, model-docs guard, the Debrief e2e on both projects (the tiles row), CI green.
**PR:** 2.

### PR 3: moments, recognition and export, D4 + D5 + D6 (in that order)

One file chain (`debrief-moments.ts`); D0's compat snapshot is the gate for all three. **Depends on:** PR 2 merged; for
D5's `/2` part, PR #276 (feat-retire-judged-rows), merged on 5 November (`f114b676`).

#### D4: "Who" from the record (team rows for manual transitions) (3 h)

**Depends on:** D0 (can run beside D1–D3: different file). **Files:** `debrief-moments.ts`,
`debrief-moments.test.ts`.

- [ ] **Red:** on the A3.1 fixture (which has `by` on its state rows, or not: the executor checks and says), the who of
  each moment equals today's (`debrief-moments.ts:27–31`) wherever `by` agrees, and a synthetic row `by: 'goto'` is
  `scenario`; on the `/3` MH fixture every phase moment is `patient` (today `scenario`); a record with no `by` on any
  state row prints as today.
- [ ] **Implement:** `whoAt(d, row, prev)`: `by` first (Decision 2), `whoOf` as the fallback; `keyMoments` calls it
  (`debrief-moments.ts:66–69`).

**Acceptance:** as Red; D0's compat snapshot changes ONLY in `who` of the `/3` fixture's phase moments, and the PR body
lists each changed row. **Must not touch:** `record.ts`, `steps()`. **Gate:** unit, model-docs guard, the Debrief e2e
on both projects (the `/2` MH test at `debrief.e2e.ts:491`), CI green. **PR:** 3.

#### D5: Recognition: one reading; the `/1` fallback press (5 h)

**Ruled 5 November (DQ4):** on `/2` cards "recognise and announce the diagnosis" is a timed action and the judged
rows are retired; the generic "Recognised" press exists only for `/1` cards (Decision 3).

**Depends on:** D3 (record.ts) and D4 (debrief-moments.ts); for the `/2` part, PR #276 (feat-retire-judged-rows), the
card/format change that retires the judged rows and makes recognition a timed record action (not this plan's piece;
merged on 5 November as `f114b676`). The `/2` reading below uses the ≈ 1 h this piece always allowed for it.

**The `/2` recognition reading, defined (open design point from PR #276's executor, 5 November).** PR #276 turns the
two judged recognition rows into timed record actions (`nameMh` on `showcase-mh-v2`, window `phase:earlySigns` +
120 s; `recogniseRosc` on `showcase-haemorrhage-v2`, window `phase:rosc` + 120 s), and it cuts the `/2`
"Recognition (instructor's tick)" key-time tile, because nothing in the format marks which action is the
recognition. So after PR #276 a `/2` Debrief has no recognition tile, and D5 defines one:

- **What the reading is:** the grade of the card's timed "recognise and announce the diagnosis" action, as `grade()`
  gives it and `report3` carries it: its anchor (`dueT`), its window (`windowS`), its press (`givenT`) and its grade
  (`firstGrade`, the ruled grade word, Decision 11). The tile prints the grade word with its glyph and the interval
  from the anchor to the press (or "not given" / "not applicable" as the grade says); the key moment is the press.
  Nothing is computed beside `grade()`: the tile, the key moment and the swimlane's ◇ read this one row.
- **Which action it is:** an additive optional boolean `recognition` on a `/2` action (`pme-scenario-2.schema.json`,
  `types-v2.ts`), at most one per card (the validator refuses two), set on `nameMh` and `recogniseRosc` in this
  piece. Matching by label or by kind (`communication`) stays refused. A `/2` card without the marker prints no
  recognition tile (as after PR #276), never "not ticked". This is a plan decision (section 4: reversible by the
  orchestrator before D5 starts); the alternative, no `/2` tile at all, leaves the reading in the action table only. **Files:** `record.ts` (`note()` takes an optional `ev`), `link.ts` (the note path carries
it, `link.ts:96`, `:148`), `sessionbar.ts`, `teach2/dock.ts`, a new `apps/demo/src/app/recognised.ts` (the `/1` press:
which note it sends on this card), `debrief-moments.ts` (`recognitionAt`), for the `/2` marker
`packages/controller/scenarios/pme-scenario-2.schema.json`, `packages/controller/src/scenario/types-v2.ts`, the `/2`
validator, `showcase-mh-v2.json` and `showcase-haemorrhage-v2.json` (the one field each), their tests, one e2e after
the existing Debrief tests.

- [ ] **Red (`/1` press):** on the tamponade card the button sends exactly `Objective met: <its recognition
  objective's words>` (the text `panel/scenario.ts:114` sends); on the haemorrhage card and a free run, a note row
  `{ kind: 'note', ev: 'recognised', text: 'Recognised (instructor)' }`; `keeps` gains `'recognised'`; on a `/2` card
  the button is not rendered.
- [ ] **Red (`/2` marker):** a `/2` card with `"recognition": true` on one action validates; on two actions it is
  refused with its reason; a card without it validates as today; `nameMh` and `recogniseRosc` carry it.
- [ ] **Red (`/2` reading):** on a `/2` run, `recognitionAt(d)` returns the marked action's row from `report3`
  (`dueT`, `windowS`, `givenT`, `firstGrade`, `debrief.ts:316–323`); the `/2` tile prints that grade word and the
  anchor-to-press interval (on the MH graded path of PR #276's test 1, `nameMh met, due 08:10 + 120 s, given 08:12`,
  the tile prints the grade word for `met` with its glyph and the interval 08:10 → 08:12); a marked action whose
  anchor never came prints
  its "not applicable" grade (the haemorrhage A4 path of PR #276's test 3); a `/2` card with no marked action prints no
  tile. No note text is read for a `/2` run.
- [ ] **Red (reading, `/1`):** `recognitionAt(d)` returns the first kept tick or `recognised` row, with its clock start:
  the card's sign state (`recognitionFrom`, `debrief-moments.ts:113–121`), else the start. `keyTimes`
  (`debrief-moments.ts:131–141`) and `keyMoments` (a team moment) call it; nothing else reads recognition. An undone
  press is not counted.
- [ ] **Red (old files):** a `/1` record without `'recognised'` in `keeps` and no recognition objective prints no
  recognition tile (as today), never "not ticked"; a `/3` export made before the change keeps today's judged-row
  reading (`debrief-moments.ts:138–141`), so archived `/2` runs still print.
- [ ] **e2e (both projects):** press Recognised on a free run at sim ≈ 30 s; the Debrief shows the tile and the key
  moment with the recorded time.
- [ ] Word "Recognised", no keyboard key (the FX-18 typing guard, `apps/demo/e2e/fx18-shortcuts-typing.e2e.ts`, stays
  green).

**Acceptance:** as Red. **Must not touch:** `grade()`. **Gate:** typecheck, unit, model-docs guard, Debrief e2e + fx18
e2e on both projects, CI green. **PR:** 3.

#### D6: Key moments and the export read the new facts (4 h)

**Depends on:** D1, D2, D3, D5. **Files:** `debrief-moments.ts`, `debrief.ts` (`DebriefExport` value types,
`debrief.ts:494–498`), `views/debrief.ts` (`momentsTable`, `minutes`), `views/debrief.css`, their tests.

- [ ] **Red:** a key moment's `values` gains `sys`, `dia`, `cvp`: the arterial or CVP value at ⌊t⌋ (then +3 s, as
  `valueAt`, `debrief-moments.ts:49–56`); a cuff value is the LAST reading at or before the moment with its age
  (`{ v, ageS }`), printed "98/60 (cuff, 2 min 10 s before)" (DQ1, ruled 5 November); each alarm under a moment carries
  its `endT` and `ackT` when it has them, printed "CVP high 06:02 ▸ cleared 07:40 · acknowledged 06:20"; the table's columns are
  `n · Time · Who · What happened · HR · SBP/DBP · MAP · CVP · SpO₂ · EtCO₂`; an alarm still on reads "CVP high 06:02 ▸ (still
  on)"; a pre-D file prints "not recorded in this file" once under the table and
  `·` in the new cells (not `–`); the minute table gains the three columns.
- [ ] Page 2 still fits: the e2e height checks (`debrief.e2e.ts:321`, `:433`, `:464`, `:491`) stay green; if the
  new columns wrap on A4 the table drops the "Who" word to its shape only (■/●), which the legend explains.

**Acceptance:** as Red; the D0 snapshot changes only by the added keys. **Must not touch:** the SpO₂ rule and
sentence (`views/debrief.ts:244`, E126). **Gate:** unit, model-docs guard, Debrief e2e both projects, the Persian
script on the D0 fixtures (unchanged output), CI green. **PR:** 3.

### PR 4: the swimlane, D7a + D7b (in that order)

The builder's unit tests, then the report section; the Debrief e2e runs once (in CI, both projects), not once per piece.
No pressures lane (section 10, R2). **Depends on:** PR 3 merged (D7a needs D4, D7b needs D6); D7a's builder
(a new file) may be written beside PR 3 on synthetic data.

#### D7a: The swimlane builder, with the expected windows (12 h: 7 for the lanes, 5 for the windows)

**Depends on:** D2 and D4 (its inputs' shapes); can start on synthetic data once PR 2 has merged, beside PR 3.
**Files:** `apps/demo/src/app/views/debrief-swimlane.ts` (new, pure: a string from data, like
`views/debrief-course.ts:1–14`), `debrief-swimlane.test.ts` (new), `debrief.ts` (the `/1` verdict's additive
`window`, below), `debrief.test.ts`.

- [ ] `swimlaneSvg(d, moments, windows, opts): string`, one shared time axis, the lanes top to bottom:
  - **Patient:** patient moments (● vermillion), the pulseless band (grey, as the course strip draws it);
  - **Team:** team moments (■ blue), the recognition moment with its own outline shape (◇);
  - **Expected windows** (new, owner 5 November), one thin row per timed action under the Team lane, labelled at
    its left with the objective's number (`/1`) or the action's label (`/2`):
    - a band from the anchor to the deadline (like a confidence interval), open-ended to the run's end when the
      deadline is beyond it;
    - the act as a tick at its time, inside or outside the band; a repeat (`/2`) its own tick;
    - the verdict beside the tick in the ruled words with their glyph (Decision 11), and the band and tick in the
      chip's style (Decision 13); a window whose act never came has no tick and its verdict word at the deadline;
  - **Monitor:** one bar per alarm raise, solid from raise to `endT` (open to the end when it has none), a small
    mark at `ackT`; an alarm without `endT` in a pre-D file is a tick only, with "end not recorded" in the lane label;
  - **Drugs and fluids:** one ▲ per kept drug or fluid row;
  - No pressures lane: the new pressures are in the key-moments table and the appendix only (DQ11, ruled 5 November).
  - Every lane: words at its left; no colour without a shape (E45); height ≤ 90 mm at 182 mm for up to six windows
    (more windows: the band rows tighten to 3 mm; the executor measures the MH `/2` card's count and states it).
- [ ] **Where the windows come from (one reading each, never a second bookkeeping):**
  - **`/2` run:** `report3(d).actions` (`debrief.ts:332–351`): `dueT` → band start, `dueT + windowS` → deadline,
    `givenT` and `repeats[].t` → ticks, `firstGrade` and `repeats[].grade` → the words. These are `grade()`'s own
    results on the rule edges the record copies (`grade.ts:196`; `record.ts:84–86`); the swimlane computes no window
    of its own. An action with no `dueT` (`not applicable`) draws no band.
  - **`/1` run:** the card's `eventWithin` objectives through `objectives(d)` (`debrief.ts:189–198`). Today a verdict
    keeps times only when both events happened (`measure`, `debrief.ts:138`). Add an additive
    `window?: { fromT: number; askedS: number }` to `Verdict`, set in the `eventWithin` branch whenever the anchor `a`
    was found (`debrief.ts:132–140`), so the "not met: none within" (`:139`) and "run ended before" (`:140`) cases
    still draw their band. No reason line changes (D0's snapshot changes only by the new key).
- [ ] **Red first:** unit tests on the D0 fixtures (A3.1 `/2` export: three `eventWithin` windows, each with its
  tick; the `/3` MH fixture: every graded action with a `dueT`), a synthetic `/1` run whose act never came (band, no
  tick, "✗ Not observed" at the deadline), a synthetic run that ended inside a window (band open to the end,
  "– Not assessable"), synthetic `endT`/`ackT`; the lanes, the bar and band counts, an `aria-label`
  listing every window with its verdict, no lane for a fact not recorded.

**Acceptance:** as above; every band's ends equal the times `report3` or the verdict carries, to the second.
**Must not touch:** `debrief-course.ts`, `grade()`, every reason line. **Gate:** unit, model-docs guard, CI green.
**PR:** 4.

#### D7b: The swimlane in the report (3 h)

**Depends on:** D6, D7a. **Files:** `views/debrief.ts`, `views/debrief.css`, the Debrief e2e.

- [ ] **Placement ruled 5 November (DQ5): option A.** `#db-swimlane` "The run, lane by lane" heads page 2 in
  `#db-live-1`, before the key-moments table (`views/debrief.ts:396`), with its legend line (the shapes, the window
  band and tick, the verdict glyphs); page 1 (key times, the 2 November course strip, objectives) is unchanged. The
  mock-up the owner chose: `scratch/debrief2-mockups/option-A-swimlane-page2.pdf` (outside the repository; the
  executor copies it into the PR body as a reference image, not into the repo).
- [ ] e2e (both projects): the section exists on the A3.1 path and the `/2` MH card, with one window row per timed
  action and each tick's verdict word present; in print media it does not split (`break-inside: avoid`); page counts
  as measured, written in the PR body; page 1 heights unchanged (`debrief.e2e.ts:321`, `:433`, `:464`, `:491`).

**Gate:** Debrief e2e both projects (CI; locally one pass of the touched e2e file, section 5), model-docs guard, CI green. **PR:** 4.

### PR 5: the hints, D8 + D9 + D10 (in that order)

Schema, view, then the drafted card text; the owner's edit gates the card lines, not the code. **Depends on:** PR 4
merged (D9 needs D7b); D8 and D10's drafts may be written beside PR 4 once PR 3 has merged (controller package and a
scratch file: no file PR 4 touches; D8 shares the `/2` schema and `types-v2.ts` with D5).

#### D8: `debriefHints` in both scenario formats (3 h)

**Depends on:** D0 (controller package only; runs beside D1–D7). **Files:**
`packages/controller/scenarios/pme-scenario-1.schema.json`, `pme-scenario-2.schema.json`,
`packages/controller/src/scenario/types.ts`, `types-v2.ts`, `validate.ts` (cross-check: an opener's `at` is a known
run event or anchor), controller tests.

- [ ] **Red:** a card with `debriefHints: { show: ["…"], openers: [{ at: "state:deteriorating", text: "…" }] }`
  validates in `/1`; an `at` naming a state the card does not have is refused; five `show` lines are refused; in
  `/2` an `at` names an anchor (`'phase:<id>'`, `'action:<id>'`, `'pulseLoss'`, `'rosc'`, `'start'`, the forms
  `report3` reads at `debrief.ts:338–344`).
- [ ] No card gets the field in this piece.

**Gate:** controller unit, typecheck, model-docs guard, CI green. **PR:** 5.

#### D9: Hints and openers in the report (4 h)

**Depends on:** D6, D8 (and D7b, to keep page 2's layout settled). **Files:** `views/debrief.ts`, `views/debrief.css`,
`debrief-moments.ts` (`openersAt(d)`: each opener's anchor time on the kept course, by the same `first()` reading the
rules use, `debrief.ts:42–53`, or `report3`'s anchor reading for `/2`), tests.

- [ ] `#db-hints` "From the card's author", on page 2 after the key moments (`views/debrief.ts:396`):
  - "What this case is built to show": the `show` lines verbatim;
  - "Openers for the analysis": each opener verbatim, with its anchor's `mm:ss` and the moment number beside it as a
    label (Decision 8); an opener whose anchor did not happen is left out, and the section says how many were left
    out ("1 opener not shown: its event did not happen in this run");
  - absent entirely when the card has no `debriefHints`.
- [ ] The two blocks only (ruled 5 November, DQ6); no PEARLS mode table. The PEARLS box (`views/debrief.ts:325–326`) is
  unchanged.
- [ ] Tests: a DOM test that the printed text equals the card's strings character for character (no interpolation);
  the handout (`#db-handout`) contains none of them (the learner handout is unchanged).

**Gate:** unit, DOM tests, Debrief e2e both projects, model-docs guard, CI green. **PR:** 5.

#### D10: Hints on the showcase cards: drafts by an executor, the owner edits or rejects (4 h executor, plus the owner's edit)

**Ruled 5 November (DQ7):** an executor drafts the hints from each card's own objectives, marked as drafts; the owner
edits or rejects each line before anything prints.

**Depends on:** D8 (committed first in PR 5; the drafts may be written before). **Files:** a draft file outside the cards first (`scratch/debrief2-hint-drafts.md`), then
`apps/demo/src/app/showcase/showcase-*.json` (only the lines he accepted), `showcase-cards.test.ts`.

- [ ] **Drafts:** for every showcase card (`apps/demo/src/app/showcase/showcase-*.json`, `/1` and `/2`), the
  executor drafts up to four "What this case is built to show" lines and up to four openers, each built only from that
  card's own objectives (or `/2` actions and outcomes), story and states, with the source objective named beside each
  line and its anchor event for an opener. Every line is headed **DRAFT, not reviewed**. No new clinical claim: a
  line that needs a fact the card does not state is left out, not written. The mock-up's placeholder wording is not
  reused.
- [ ] The file goes to the owner through the orchestrator. Only the lines he accepted or rewrote enter a card, in his
  final words; the PR body quotes his answer and its date. A rejected or unanswered line: no field (as `takeHome` was
  handled, `debrief-redesign.md:262–264`). Nothing marked draft ever reaches a card or the page.

**Gate:** controller + demo unit (`showcase-cards.test.ts`), CI green. **PR:** 5.

### PR 6: Persian, D11 + D13 + D12 + D13b (in that order)

The commit order is the plan's merge order (D11, D13, D12, D13b), so the page that prints the words exists before the
words are filled; the section order below is the plan's numbering. The owner's reading is the gate: one reading
session over one PR instead of four. **Depends on:** PR 5 merged (D12 and D13 need D9); D11 may be written beside PRs
2–5 (script and a new module: no shared file).

#### D11: One Persian matcher for the script and the app (5 h)

**Depends on:** D0; the fate of `docs-fa-handout-strings` (rebase over it if it is merged first). **Files:**
`scripts/showcase/debrief-fa.mjs`, a new shared module (e.g. `apps/demo/src/app/i18n/fa-match.ts`, plain TS the
script imports through `--experimental-strip-types`, or a `.mjs` both import; the executor picks the one the build and
`vite` accept and says why), `packages/validation/test/debrief-fa.test.ts`.

- [ ] **Red:** the script's output on the D0 fixtures and on the committed fixtures `debrief-fa.test.ts` already uses
  (`debrief-fa.test.ts:17–21`) is byte-identical before and after (the HTML with `--html`, and the `--text` strings).
- [ ] Move the table loading, `parse`, `match`, the `TYPED` patterns and the digit rules (`debrief-fa.mjs:27–60` and
  the functions they serve) into the module; the script imports it. No string changes.

**Acceptance:** byte-identical output; `0 strings without translation` unchanged. **Must not touch:**
`fa-debrief.json`. **Gate:** validation tests, CI green. **PR:** 6.

#### D12: Persian words for Option C (5 h executor, plus the owner's reading)

**Depends on:** D6, D7b, D9 (the English words frozen); D11. **Files:** `docs/showcase/i18n/fa-debrief.json`,
`docs/showcase/i18n/README.md`.

- [ ] **Written only through the owner's reading.** With the `persian-writing` skill, the executor drafts entries for
  every new English string of D3, D5, D6, D7, D9 (tile captions, column heads, lane labels, "not recorded in this
  file", "end not recorded", "Recognised (instructor)", "From the card's author", the hints' section heads) and, if
  F7.6 has not landed by then, the 46 `"fa": null` entries of the `/3` words. Each is `"reviewed": false` with its
  `source`.
- [ ] The executor sends the owner one file listing each English string beside its Persian draft (the house rule for
  long right-to-left text is a file, not chat) and waits. Only the entries he confirmed are set `"reviewed": true`, by
  the orchestrator, with his date.
- [ ] Authored hints and openers (D10) in Persian: only if the owner writes or confirms the Persian text himself; the
  table gets a `hints` group keyed by card id. Without it, the Persian page prints the hints in English, marked so.
- [ ] **Briefing texts (DQ9, +1 h):** a Persian draft of each showcase card's English `briefing.text` (today
  `showcase-mh.json` and `showcase-mh-v2.json` carry a briefing), with the `persian-writing` skill, in the same file for
  the owner. Only a text he has read enters the card as `briefing.textFa` (D13b); none is marked unread on a card.
- [ ] **DQ10, ruled 5 November (option A):** an entry the owner has not read stays `"reviewed": false`, and wherever
  it prints (screen or paper, Debrief, handout, script) the page carries the visible line "Persian draft: not yet read
  by the clinical owner" until he clears it.

**Gate:** `debrief-fa.mjs` on the D0 fixtures and a D-era export: `0 strings without translation`; validation tests;
CI green. **PR:** 6 (plus a re-run if the owner's corrections arrive after the PR opens).

#### D13: The Debrief page and the learner handout in Persian (10 h)

**Depends on:** D11 (the matcher), D9 (the page's sections settled); D12 for the words (PR 6 can merge with the
entries still unreviewed, labelled as such). **Files:** `views/debrief.ts`, `views/debrief.css` (a `[lang=fa]`
right-to-left block), `apps/demo/src/app/fonts/` (Vazirmatn, Decision 10), `NOTICES.md`, `LICENSES/`, the Debrief e2e,
a DOM test.

- [ ] **Red:** with the switch on "فارسی", `#db-live-1`, `#db-live-2` and `#db-handout` carry `lang="fa"
  dir="rtl"`; every string the English page prints is either in the table or listed by the matcher as missing, and
  the page prints the missing ones in English (as the script does, `debrief-fa.mjs:11–12`); clinical values and
  times stay Western digits, left to right; the SVGs (course strip, swimlane) keep their English labels unless the
  table has them; the footer is the table's footer entry.
- [ ] **DQ10, ruled 5 November (option A):** while any printed entry is `"reviewed": false`, the visible line
  "Persian draft: not yet read by the clinical owner" stands under the switch and on every printed page of the report
  and of the handout, until the owner clears the entries; a DOM test pins it on and off.
- [ ] The switch is per browser (localStorage, wrapped in try/catch), English by default; `#db-who` and `.db-notes`
  are not touched (Decision 11 of the A/B plan).
- [ ] Print: Chrome and Safari, A4; page 1 within one page in Persian on the A3.1 path, both projects.
- [ ] The script and the page print the same Persian for the same export: a test renders both through the shared
  matcher and compares the section texts.

**Gate:** typecheck, unit, DOM, Debrief e2e both projects (CI; locally one pass of the touched e2e file, section 5), `pnpm check-licences`, `pnpm check-size` (the IIFE
bundle limit concerns the engine bundle; the executor confirms the font is not in it), model-docs guard, CI green.
**PR:** 6.

#### D13b: The Briefing in Persian (5 h; DQ9, ruled 5 November)

**Depends on:** D13 (the bundled font and the host's Persian setting, Decision 15); D12 for the reviewed card texts.
**Files:** `packages/controller/scenarios/pme-scenario-1.schema.json` and `pme-scenario-2.schema.json` (`briefing.textFa`,
optional, ≤ 4000, additive), `packages/controller/src/scenario/types.ts`, `types-v2.ts:138`, the host's briefing notice
(where the session builds it from `briefingOf`), `apps/demo/src/app/briefing.ts`, `briefing.css` (the bundled Vazirmatn
in the stack), the showcase cards whose Persian text the owner read, tests and one e2e.

- [ ] **Red:** a card with `briefing: { text, textFa }` and the host set to Persian sends a notice with `lang: 'fa'`
  and the Persian text; set to English, the English text; a card written in Persian (`lang: 'fa'`, no `textFa`) shows
  as today in both settings; a card without `textFa` shows its English text in the Persian setting (no machine
  translation at run time); the phone (follower) renders what the notice carries (`followBriefing`, `briefing.ts:12`).
- [ ] The chrome strings stay the reviewed ones of `CHROME` (`briefing.ts:35–40`, checked in
  `owner-review/instructor-ux/empty-finish/briefing-fa.md`); Persian digits in the chrome as today.
- [ ] e2e (both projects): host in Persian, one phone: both show the Persian briefing right-to-left in Vazirmatn.

**Must not touch:** the briefing's timing and dismissal rules (`briefing.ts:1–13`). **Gate:** typecheck, controller +
demo unit, the case-briefing e2e both projects (CI; locally one pass of the touched e2e file, section 5), `pnpm check-licences`, model-docs guard, CI green. **PR:** 6.

### PR 7: questions, docs and the gate note, D16 + D15 (in that order)

The gate note is written against what merged. **Depends on:** PR 6 merged.

#### D16: Time-anchored questions on the learner handout, drafted per card (8 h; DQ12, ruled 5 November)

**Depends on:** D10 (the drafting and review route for card hints, and its schema from D8), D12 and D13 (the handout's
Persian path). **Files:** the two scenario schemas and types (`debriefHints.handoutQuestions`, Decision 14),
`validate.ts`, `views/debrief.ts` (the handout's questions, `:443`), `debrief-moments.ts` (each question's anchor time,
by the openers' reading of D9), `scripts/showcase/debrief-fa.mjs` and the shared matcher (the questions in the Persian
handout), `fa-debrief.json` (a `hints` group entry per question), a draft file `scratch/debrief2-handout-q-drafts.md`,
the cards the owner reviewed, tests.

- [ ] **Drafts (2 h):** for each showcase card, up to three questions built only from that card's objectives and from
  its key moments on its recorded kit-round run, each with its anchor event and the objective it comes from, headed
  **DRAFT, not reviewed**. No new clinical claim; no verdict, no value, no "you should".
- [ ] **Review:** the file goes to the owner through the orchestrator; only the questions he accepted or rewrote enter a
  card, in his words, with their Persian (persian-writing skill, read by him). Nothing marked draft reaches a card.
- [ ] **Red (schema, 1 h):** `handoutQuestions` validates in `/1` and `/2` with the openers' anchor rules (D8); four
  are refused.
- [ ] **Red (handout, 3 h):** a card with two reviewed questions prints them in place of fixed prompts 1–2, each
  with its anchor's `mm:ss` as a label and three ruled lines, then fixed prompt 3; a question whose anchor did not
  happen is left out and the fixed prompt prints instead; the handout's text still contains no verdict word, no value
  and no objective text (the A/B plan's DOM check, `debrief-redesign.md:986–988`); the handout fits one A4 page on
  the tamponade, MH and haemorrhage cards (`debrief.e2e.ts:433`, `:464`).
- [ ] **Red (Persian, 2 h):** the in-app handout in Persian and `debrief-fa.mjs` print the same Persian question
  text for the same export; a question with no reviewed Persian prints in English with the DQ10 line.

**Gate:** typecheck, unit, DOM, Debrief e2e both projects (CI; locally one pass of the touched e2e file, section 5), the Persian script on a D-era export, model-docs guard, CI
green. **PR:** 7.

#### D15: Docs, the rehearsal reader, the gate (6 h)

**Depends on:** every piece merged that the release carries. **Files:** `scripts/showcase/kit-round-a.kitround.ts`
(the reader returns the new tiles, the swimlane's lanes and the hints count), `docs/guides/scenario-authoring.md`
(`debriefHints`), `docs/showcase/SHOWCASE-2-RUN-SHEET.md` §4 and the cue cards (the Recognised press; the new columns),
`CHANGELOG.md` (one `### Added` list under Unreleased), `docs/showcase/i18n/README.md`, a gate note
`docs/gates/debrief-2.md`.

- [ ] Kit round on the A3.1 path and the `/2` MH card, both projects: the PDFs (English and Persian) and the JSON go
  to `scratch/debrief2-gate/` and, after the owner's look, to the docs PR.
- [ ] The gate note lists every Option C item with the PR that built it, or the reason it is out.

**Gate:** kit-round both projects, the Persian script, CI green; the owner's hand print in Safari (the one check no
automated test makes, as in `debrief-redesign.md:1290–1293`). **PR:** 7.

### Withdrawn: D14, the PEARLS mode table

Not built: the owner ruled the two hint blocks only (DQ6, 5 November).

---

## 8. Partition, critical path, merge order, CI load

**Built whole, PRs 2–7 in dependency order; PRs 3 and 5 may run in parallel with 4 where their files do not overlap**
(the owner, 5 November evening, section 10 R1). There is no staged "2a" and "2b": every piece below ships, in seven
pull requests, as the review's §2.3 cut (`research/42-ci-and-process-review.md` §2.2–2.3) grouped them.

```
PR 1 ── PR 2 ────────── PR 3 ─────────────── PR 4 ──────────── PR 5 ─────────────── PR 6 ───────────────────────── PR 7
D0      D1 → D2 → D3    D4 → D5 → D6         D7a → D7b         D8 → D9 → D10*       D11 → D13 → D12* → D13b*       D16* → D15*
#277                     (D5 /2: PR #276, merged)
beside the chain, no shared file: D7a's builder beside PR 3 · D8 and the D10 drafts beside PR 4 · D11 beside PRs 2–5
* waits on the owner's reading or review
```

- **Why the chain is a chain:** PR 3 needs D3 (D5, D6 read the record's new facts); PR 4 needs D4 and D6 (D7a's
  inputs, D7b's page 2); PR 5's D9 needs D7b (page 2 settled); PR 6's D12 and D13 need D9 (the English words frozen,
  the page's sections settled); PR 7's D16 needs D10, D12 and D13, and D15 needs everything. Each PR merges after the
  one before it.
- **What runs in parallel, and only where the files do not overlap:**
  - *PR 4 beside PR 3:* D7a's builder is a new file (`views/debrief-swimlane.ts` and its test) and can be written on
    synthetic data while PR 3 is open. Its `/1` `window` on `Verdict` (`debrief.ts`) and all of D7b (`views/debrief.ts`,
    `views/debrief.css`, `debrief.e2e.ts`) share files with D6, so PR 4 rebases on main after PR 3 merges and only
    then adds those commits.
  - *PR 5 beside PR 4:* D8 (the two scenario schemas, `types.ts`, `types-v2.ts`, `validate.ts`, controller tests) and
    the D10 drafts (`scratch/debrief2-hint-drafts.md`) share no file with PR 4; D8 starts after PR 3 has merged,
    because D5's `/2` marker touches `pme-scenario-2.schema.json` and `types-v2.ts` too. D9 (`views/debrief.ts`,
    `views/debrief.css`, `debrief-moments.ts`) waits until PR 4 has merged.
  - *D11* (the script and a new shared module) shares no file with PRs 2–5 and may be written at any time; it enters
    PR 6 first.
  - At most two Debrief executors at once (one on the chain, one beside it), and at most three browser executors on
    this Mac in all (the 07:26 ruling of 5 November, review §2.4 item 5).
- **Merge order:** PR 1 (#277) · PR 2 · PR 3 (PR #276, feat-retire-judged-rows, which D5's `/2` part
  needs, merged on 5 November as `f114b676`) · PR 4 · PR 5 · PR 6 · PR 7. A PR that shares files with what merged before it merges main into its
  branch before its last push (the repository's rule for shared files, review §2.4 item 3); the plan's former
  piece-by-piece order (D0 · D8 · D11 · D1 · D4 · D2 · D3 · D7a · D5 · D6 · D7b · D9 · D10 · D13 · D12 · D13b · D16 ·
  D15) survives as the commit order inside and across the PRs.
- **Local testing before a push:** only the touched unit files and the touched e2e file, one pass; never a full suite
  locally (section 5; review §2.4 item 5). CI runs every suite on both projects.

**Effort in executor-hours and CI runs, measured this week.** The pieces' plan hours are human-equivalent focused
hours; this week's six measured pieces (P3, P4, P5, F5.2 + F5.3, F9, D0) took 5–9 times less executor wall time than
their plan hours (review §2.1), so an executor-hour here is **plan h ÷ 8 to plan h ÷ 6**, rounded to 0.1 h. D0 is the
check: 2 plan hours, ≈ 0.2 h from launch to PR #277 opening. CI numbers are the review's medians of 4–5 November
(§1.2): a PR run is ≈ 409 runner-minutes and takes a median 61 min wall (p75 84 min; 49 min when it met no queue);
33 of 68 PR runs that day were re-merge runs (≈ 1 in 2); the plan's own allowance for review-fix re-runs is ≈ 1 in 3.

| PR | Pieces, in order | Plan h | Executor-h (÷8 – ÷6) | CI runs (PR + main) | Depends on | The owner's own time |
|---|---|---|---|---|---|---|
| 1 | D0 baseline, fixtures | 2 | 0.25–0.33 (measured: ≈ 0.2 to PR open) | 1 + 1 | — | — |
| 2 | D1 SBP/DBP/CVP and `keeps` → D2 alarm end and acknowledgement → D3 CPR stop, hands-off, 60/80 % lines | 15 (5 + 5 + 5) | 1.9–2.5 | 1 + 1 | PR 1 | — (DQ1–DQ3 ruled) |
| 3 | D4 who from `by` → D5 recognition (the `/1` press; the `/2` reading of the marked action) → D6 key moments, export, minute table | 12 (3 + 5 + 4) | 1.5–2.0 | 1 + 1 | PR 2 (PR #276, which D5's `/2` part needs, merged) | — (DQ4, DQ11 ruled; the D5 `/2` marker is a plan decision the orchestrator may reverse) |
| 4 | D7a swimlane builder + expected windows (no pressures lane) → D7b the swimlane heads page 2 | 15 (12 + 3) | 1.9–2.5 | 1 + 1 | PR 3 (D7a's builder may start beside it) | — (DQ5 ruled; R2) |
| 5 | D8 `debriefHints` schema → D9 hints in the report → D10 drafted hints on the cards | 11 (3 + 4 + 4) | 1.4–1.8 | 1 + 1 | PR 4 (D8 and the D10 drafts may start beside it) | **D10:** edit or reject every drafted line: up to 4 "built to show" lines and 4 openers on each of the 9 showcase cards (≤ 72 lines) |
| 6 | D11 shared Persian matcher → D13 Debrief and handout in Persian → D12 Persian words and Briefing texts → D13b Briefing in Persian | 25 (5 + 10 + 5 + 5) | 3.1–4.2 | 1–2 + 1, plus 1 if his corrections arrive after the PR opens | PR 5 (D11 may start beside PRs 2–5) | **D12/D13:** read every Persian line before it is marked reviewed: each new English string of D3, D5, D6, D7, D9, the 46 `"fa": null` `/3` entries if F7.6 has not landed, the two cards' Briefing texts (`showcase-mh`, `showcase-mh-v2`), and the Persian page on paper |
| 7 | D16 handout questions per card → D15 docs, reader, gate note | 14 (8 + 6) | 1.8–2.3 | 1 + 1 | PR 6 | **D16:** review every drafted question (≤ 3 on each of the 9 cards, ≤ 27) and its Persian; **D15:** the Safari hand print |
| **All** | 18 pieces (D14 withdrawn) | **94** | **≈ 11.8–15.7 (≈ 12–16)**; PRs 2–7: ≈ 11.5–15.3 | **≈ 17–19 runs** for PRs 2–7 (6 PR + 6 main, ≈ 3 re-merge, ≈ 2 review-fix, + 0–2 for PR 6) | | not estimated in hours: no measurement of it exists, and it is calendar time no executor speed shortens (review §2.2) |

- **CI calendar on the critical path:** six merges after PR 1, each waiting for one PR run and, about every second
  time, one re-merge run: 6–12 runs at the 61 min median ≈ **6–12 h of waiting on CI**, with today's workflow. If the
  review's §1.6 changes land first, an app PR's run is estimated at ≈ 25–30 min (an estimate, not measured): ≈ 2.5–6 h.
  Runner cost: ≈ 17–19 runs × ≈ 409 runner-min ≈ 7,000–7,800 runner-min (the former 18-PR cut: 36 runs ≈ 14,700
  runner-min plus its re-merges, review §2.2). The plan's former "13–15 jobs against 20 concurrent" is out of date:
  a run is 15 jobs and the measured ceiling is 40 at once (review §1.2).
- **The owner's time is the other long pole:** PR 5 cannot merge with draft card lines (D10 prints only what he
  accepted), PR 6 can merge with Persian entries still unreviewed but labelled (DQ10), and PR 7's D16 prints only
  questions he reviewed. Sending him the D10 and D16 draft files as soon as D8 merges (inside PR 5's branch) keeps his
  reading off the critical path as far as it can be.
- **History of the plan hours (the original unit):** D0 2 + D1 5 + D2 5 + D3 5 + D4 3 + D5 5 + D6 4 + D7a 12 + D7b 3 +
  D8 3 + D9 4 + D10 4 + D11 5 + D12 5 + D13 10 + D13b 5 + D15 6 + D16 8 = **94 h**. The first draft was 70 h. The
  rulings of 5 November:
  - DQ1–DQ8 and the expected windows: +11 h (the windows +6, DQ1 +2, DQ2 +1, DQ3 +1, DQ7 +2, DQ4 −1), to 81 h;
  - DQ9 the Briefing in Persian: +6 h (D13b 5, its card texts in D12 +1);
  - DQ11 no pressures lane on the swimlane: −1 h (D7a);
  - DQ12 the handout's card questions: +8 h (D16);
  - R1 (seven PRs) and the D5 `/2` reading defined here: 0 h (the boundaries move; the `/2` reading uses the ≈ 1 h D5
    always allowed for it).

  94 h is above the research's 60–80 h (`research/33:405–407`) because the rulings added the windows, the Briefing and
  the handout questions; it does not count PR #276 (merged), which D5's `/2` part needed, nor the owner's reading and reviews.

---

## 9. Dependencies and out of scope

- **E60 calibration items** (`debrief-redesign.md:1239–1250`; physiology, for the calibration queue, R1 in
  `research/40-post-demo-inventory.md`). This plan does not patch them:
  1. *The recorder drops the oximeter's questionable flag*: still so on 8718fe1d, `record.ts:251` keeps a value
     whenever `flag !== 'invalid'`. Storing the flag per sample is a record change the calibration pass may ask for;
     if it does, it uses D1's `keeps` word scheme (`'flags'`).
  2. *The oximeter during CPR*: changed since by E126 (`CHANGELOG.md:603–613`: the value during compressions is
     flagged questionable with a low-signal message; pulseless without compressions the tile is blank). Whether that
     closes the item is the calibration pass's call, not this plan's.
  3. *A minimum perfusion index for a valid pulse*: a physiology item; not touched.
- **F7.6** (Persian for `pme-debrief/3`, R67): D12 includes it only if it has not landed.
- **The phone's Recognised press:** after the peer-role pieces P6/P7 (R25).
- **Structured Persian messages** (Decision 9): a later refactor.
- **Rules on the new pressures** (`value:sys<80` in `/1` objectives): not planned (Decision 6).
- **A pressure band on the course strip** (DQ11): a later item, mock-up first.

---

## 10. Questions for the owner (all ruled 5 November)

Nothing clinical is decided by the plan. Where a question carries a threshold or wording, the source named is the one
the executor would use; the owner may name another.

| ID | Question | Default if no answer, or the ruling |
|---|---|---|
| **DQ1** | Systolic and diastolic: the arterial line's, else the cuff's? The cuff is intermittent: what at a key moment, and on a trend? | **Ruled 5 November:** arterial line first, then the cuff; at a key moment the record's last reading is printed with its age; on a trend graph the gap between cuff readings stays blank (D1, D6) |
| **DQ2** | An alarm's end: when its condition cleared, or when it was acknowledged? | **Ruled 5 November:** both are stored: the end (condition cleared) and the acknowledgement time (D2, Decision 4) |
| **DQ3** | CPR hands-off: what to print, and any target? | **Ruled 5 November:** the seconds, the compression fraction, and reference lines at both 60 % and 80 %; no grade (D3) |
| **DQ4** | The Recognised press | **Ruled 5 November:** "recognise and announce the diagnosis" is a timed action in `/2` cards (judged rows retired on 5 November); the generic "Recognised" button exists only as the `/1` fallback (D5, Decision 3) |
| **DQ5** | The swimlane: on page 1, or heading page 2? | **Ruled 5 November: option A**, the swimlane heads page 2 above the key moments; page 1 unchanged (D7b). Plus a new requirement: every timed action's expected window drawn on its lane, the act as a tick, marked with the verdict words (D7a) |
| **DQ6** | The card's hints: the two blocks, or also the PEARLS mode table? | **Ruled 5 November:** the two hint blocks only (D9; D14 withdrawn) |
| **DQ7** | Who writes the hints and openers? | **Ruled 5 November:** an executor drafts them from each card's objectives, marked drafts; the owner edits or rejects before anything prints (D10) |
| **DQ8** | The mock-up's "○ Instructor" and "◆ Gap to explore", or the ruled words? | **Ruled 5 November:** the ruled verdict words everywhere (Decision 11) |
| **DQ9** | In-app Persian: the Debrief page and its handout only, or the whole app? | **Ruled 5 November:** the Briefing, the Debrief page and the learner handout; not the rest of the app (D13, D13b) |
| **DQ10** | Until you have read every Persian line, the Persian page prints "Persian draft: not yet read by the clinical owner". Keep that line on paper too? | **Ruled 5 November (option A):** a Persian string the owner has not yet read carries the visible line "Persian draft: not yet read by the clinical owner" on screen and on paper until he clears it (D12, D13) |
| **DQ11** | The new pressures: in the key-moments table and the minute appendix, and also elsewhere? | **Ruled 5 November (option A):** the key-moments table and the appendix only; the course strip is unchanged (a pressure band on the strip is a later item, mock-up first); no pressures lane on the swimlane (D6, D7a) |
| **DQ12** | The learner handout: as it is, or with time-anchored questions? | **Ruled 5 November (option B, with a twist):** the handout gains time-anchored questions per card, drafted by an executor from the card's objectives and key moments, marked drafts, and printed only once the owner has reviewed them (D16, Decision 14) |

The owner's two rulings of the evening of 5 November (after the CI and process review, `research/42`):

| ID | Ruling (5 November 2026, evening) | Where |
|---|---|---|
| **R1** | Debrief 2 is built **whole**, not staged: no "2a" first and "2b" later. It is built on the review's seven-PR cut (§2.2–2.3), PRs 2–7 in dependency order; PRs 3 and 5 may run in parallel with 4 where their files do not overlap. | sections 7 and 8 |
| **R2** | The swimlane carries **no pressures lane** (DQ11 confirmed). The owner's reason as given: the course graph on the same page already draws the pressures. Checked on `origin/main` for this amendment: the course strip draws HR, MAP, SpO₂ and EtCO₂ (`TRENDS4`, `views/debrief.ts:233`; `views/debrief-course.ts:4`), and the six trend charts are HR, MAP, SpO₂, EtCO₂, RR and temperature (`TREND`, `record.ts:54`); none draws systolic, diastolic or CVP, and this plan does not change them (DQ11; D1 must not touch `TREND`). On the built page the three pressures are in the key-moments table and the minute appendix only (D6). The ruling does not depend on the reason; the orchestrator puts the discrepancy to the owner. | D7a, D6 |

---

## 11. Self-review against the codebase (8718fe1d)

Every claim about what exists today, with the line read:

- The record's row shape and `by`: `apps/demo/src/app/record.ts:21–48`; `by` written from the scenario event at
  `:163–171`; a manual trigger is not its own row at `:184`; a `/2` phase is entered by its rule at `:163–167`.
- Six trended numerics: `record.ts:54`; the sample takes only those (and five labs): `:263–276`.
- A measurement value is dropped only when invalid (the questionable flag is not kept): `record.ts:251`.
- Alarm raises only: `record.ts:221–223`. Alarm entries carry `latched` and `acked`:
  `packages/engine-core/src/types-device.ts:51–61`.
- CPR start gets `ev: 'cpr'`, a stop none: `record.ts:212`; the stop's words: `describe.ts:68–69`; the engine's
  compressions state `hs.cpr.active`: `packages/engine-core/src/l2/hemo/pipeline.ts:289`, `:440`.
- Notes reach the record through `link.ts:148` and `RunRecord.note` (`record.ts:304–306`); the Scenario tab's tick
  `panel/scenario.ts:114`; Instructor v2's judged press `teach2/press.ts:41`.
- The Debrief's readers: `objectives` and the tick `debrief.ts:189–198`; `judged` `:280–286`; `report3` and the
  judged press matched by note text `:332–370` (`:367`); `DebriefExport` `/2` `:479–503`; `DebriefExport3` `/3`
  `:506–507`; the export `debrief-export.ts:12–18`.
- `whoOf` infers from the card and returns `scenario` on a `/2` card: `debrief-moments.ts:27–31` (`asV1`, `:28`);
  `pulselessSpans` `:35–44`; `valueAt` `:49–56`; `keyMoments` `:62–93`; `recognitionFrom` `:113–121`; `keyTimes`
  `:127–162`, the six-tile cap `:23`.
- `grade()` returns judged rows with `fromT` and no press time: `packages/controller/src/scenario/grade.ts:57`,
  `:370–373`; `Administration`, `PhaseEntry`, `Judged`: `types-v2.ts:119`, `:145`, `:152–173`.
- The view: footer `views/debrief.ts:37`; PEARLS `:40–45`; verdict words `:49–55`; SpO₂ sentence `:244`; handout text
  `:246–254`; take-home `:262–265`; key-moments table `:303–316`; the static nodes `:321–327`; page 1 and page 2
  `:380–400`; trends `:403–405`; timeline `:419–421`; handout `:428–446`; archive read `:530`; page CSS `:200–201`.
- The course strip builder: `views/debrief-course.ts:1–14`, `courseSvg` `:186`, accents `:33–35`.
- The archive stores `debriefJson`: `archive.ts:1–7`.
- Scenario fields: `/1` `takeHome` `pme-scenario-1.schema.json:19`, objective `debrief` enum `:60`; `/2` `takeHome`
  `pme-scenario-2.schema.json:18`; types `types.ts:125`, `:150–159`.
- Persian: the script's table and matcher `scripts/showcase/debrief-fa.mjs:1–60`, schema switch `:509`; 46 entries
  `"fa": null` in `docs/showcase/i18n/fa-debrief.json` (counted with `grep -c '"fa": null'`); the font from outside the
  repository `docs/showcase/i18n/README.md:28–31`; the fixtures test `packages/validation/test/debrief-fa.test.ts:17–21`.
- Session bar Bookmark `sessionbar.ts:47`; dock marks `teach2/dock.ts:18–22`.
- The Debrief e2e tests: `apps/demo/e2e/debrief.e2e.ts:51`, `:198`, `:225`, `:321`, `:433`, `:464`, `:491`.
- CI: `pnpm typecheck`, `pnpm test`, `check-licences`, `check-size` at `.github/workflows/ci.yml:19`, `:30`, `:42`,
  `:43`; the e2e matrix by browser `:100–140`.
- E126 changed the oximeter in arrest and CPR: `CHANGELOG.md:603–613`.
- Added with the 5 November amendment: `report3`'s action fields `debrief.ts:316–323`, built at `:332–351`; the
  `eventWithin` branch keeps times only when both events happened `debrief.ts:132–140` (`measure` at `:138`); the grade
  words `views/debrief.ts:81`; the chip styles `views/debrief.css:43–46`; `AlarmEntry.acked`
  `packages/engine-core/src/types-device.ts:61`; the MH `/2` card still has `"judged"` on `origin/main` 9a4636c2
  (`apps/demo/src/app/showcase/showcase-mh-v2.json:1003`).
- Added with the second 5 November amendment: the Briefing's Persian rendering and font fallback
  `apps/demo/src/app/briefing.ts:14–16`, its one render function `:62–69`, the follower path `:12`, the chrome strings
  `:35–40`; the briefing block with `additionalProperties: false` and `lang` `pme-scenario-1.schema.json:21–31`, on
  `/2` `types-v2.ts:137–138`; the handout's fixed prompts `views/debrief.ts:249–251`, printed at `:443`.

What this plan did not verify:
- How the hemo pipeline emits NIBP between cuff cycles (D1 reads it; DQ1 depends on it).
- Whether the engine ever stops compressions without a command (D3's cross-check finds out).
- The PR state of `docs-fa-handout-strings` and the current CI run length (the GitHub API timed out on 2026-11-05).
- Whether page 2 fits A4 with the new columns (D6 measures).
