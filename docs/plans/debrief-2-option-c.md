# Debrief 2 (Option C): the record grows, the recognised mark, the swimlane, authored hints, in-app Persian — Implementation Plan

**STATUS: DRAFT FOR REVIEW 2026-11-05; amended 2026-11-05 with the owner's rulings on DQ1–DQ8 and one new
requirement (the expected window of every timed action drawn on the swimlane, D7a/D7b).** Written by a planning
executor from brief 15 of the post-demo set. DQ9–DQ12 are still open (section 10). No product code, test or card was
changed while writing it.

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
> Each piece is ONE pull request with its own gate; never two pieces in one PR.

---

## 1. Intent

The Debrief today ("B via A") reads well, but it can state only what the record keeps, and the record does not keep
several things the facilitator needs: the pressures the tamponade card is built around (systolic, diastolic, CVP),
when an alarm stopped, when compressions stopped, and a time to recognition on a card that has no "Name the …"
objective. Option C makes the record keep them, then shows them: in the key-moments table, on a swimlane of the run,
and as tiles. It adds the owner's own words per card (debrief hints and analysis openers), and it lets the Debrief
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
- The learner handout stays what it is (`views/debrief.ts:428–446`) except that a Recognised row, being a key moment,
  appears in its key-moments table. The mock-up's handout questions anchored to times ("At 06:13 the systolic fell
  below 80 …", mock-up page 3) are NOT built: they are generated prompts (E46, E51).
- No in-app Persian outside the Debrief page and its handout (the rest of the app is DOC-1,
  `research/roadmap-whole-app-inventory-2026-10-27.md:290`).
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
| C6 | The swimlane (placement ruled 5 November: heads page 2) | lanes: patient, team, monitor alarms (raise ▸ end), drugs and fluids, and the pressures | Partly: the course strip draws the moments, the four trends and the marks (`views/debrief-course.ts:186`); lanes need C1, C3, C4 | No (built from C1–C5) | D7a, D7b |
| C11 | Expected windows on the lanes (new, owner 5 November) | per timed action: its window (anchor → deadline), the act's time, its verdict | `/2`: `report3` already carries each graded action's `dueT`, `windowS`, `givenT`, `firstGrade` and repeats (`debrief.ts:316–323`, from `grade()`, which reads the rule edges the record copies, `record.ts:84–86`, `grade.ts:196`). `/1`: an `eventWithin` verdict carries `measure` only when both events happened (`debrief.ts:138`); a window whose act never came (`:139`) or whose run ended early (`:140`) keeps no times | `/1`: an additive `window` on the verdict (`{ fromT, askedS }`) whenever the anchor was found; no record change | D7a |
| C7 | Authored per-scenario hints | the card's own "what this case is built to show" | Not in either format. `/1` has `story` and `takeHome` (`types.ts:150–159`; schema `pme-scenario-1.schema.json:17–19`); `/2` has `takeHome` (`pme-scenario-2.schema.json:18`) | Yes: an optional document-level `debriefHints` in both schemas | D8, D9, D10 |
| C8 | Advocacy-inquiry openers (E46) | the owner's sentence per card, and the event it is about | Not anywhere. The page prints the four fixed PEARLS prompts (`views/debrief.ts:40–45`) | Yes: `debriefHints.openers[]` with an anchor event; printed only when the anchor happened on the kept course | D8, D9, D10 |
| C9 | In-app Persian | the Debrief page and its handout in Persian, from the one table | Persian is a handout script only (`scripts/showcase/debrief-fa.mjs:1–14`; `docs/showcase/i18n/README.md:3–8`); the table has 46 entries still `"fa": null` (the `/3` words of F7.6, `research/40-post-demo-inventory.md:115`) | No record change; the matcher moves to a shared module, the font is bundled | D11, D12, D13 |
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
     from `report3`/`grade()`. No button and no note row of its own.
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

---

## 5. Global constraints (every piece)

- `00-common-rules.md` applies to every executor: own worktree under `scratch/` on a branch from `origin/main`; never
  merge, tag, force-push or push gh-pages; one PR per piece, draft until its checks pass; `npx -y pnpm@9.15.9`; the
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
- **New e2e tests** pass 3 of 3 local runs on chromium and webkit before the push, go after the existing Debrief
  tests (`apps/demo/e2e/debrief.e2e.ts`), and are never tagged `@known-flaky`.
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

## 7. Pieces

Effort is focused executor hours including tests, as the A/B plan counted them (`debrief-redesign.md:352–384`). It
does not include the owner's reading or wording time, nor review.

### D0: Baseline, fixtures, the pre-D readers pinned (2 h)

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
CI green. **CI load:** 1 run.

### D1: The record keeps systolic, diastolic and CVP; `RunData.keeps` (5 h)

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
the engine. **Gate:** typecheck, unit, model-docs guard, CI green. **CI load:** 1 run.

### D2: Alarm end and acknowledgement times (5 h)

**Depends on:** D1 (same file, merge after it). **Files:** `record.ts`, `record.test.ts`.

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
`alarmLine`. **Gate:** typecheck, unit, model-docs guard, CI green. **CI load:** 1 run.

### D3: CPR stop in the record; hands-off time (5 h)

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
**CI load:** 1 run.

### D4: "Who" from the record (team rows for manual transitions) (3 h)

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
on both projects (the `/2` MH test at `debrief.e2e.ts:491`), CI green. **CI load:** 1 run.

### D5: Recognition: one reading; the `/1` fallback press (5 h)

**Ruled 5 November (DQ4):** on `/2` cards "recognise and announce the diagnosis" is a timed action and the judged
rows are retired; the generic "Recognised" press exists only for `/1` cards (Decision 3).

**Depends on:** D3 (record.ts) and D4 (debrief-moments.ts); for the `/2` part, the card/format change that retires the
judged rows and makes recognition an action (not this plan's piece; not on `origin/main` 9a4636c2, where
`showcase-mh-v2.json:1003` still has `"judged"`). If that change has not merged when D5 starts, D5 ships the `/1`
part and the `/2` reading is added by a follow-up of ≈ 1 h inside the same piece's branch once it lands (the
orchestrator decides which). **Files:** `record.ts` (`note()` takes an optional `ev`), `link.ts` (the note path carries
it, `link.ts:96`, `:148`), `sessionbar.ts`, `teach2/dock.ts`, a new `apps/demo/src/app/recognised.ts` (the `/1` press:
which note it sends on this card), `debrief-moments.ts` (`recognitionAt`), their tests, one e2e after the existing
Debrief tests.

- [ ] **Red (`/1` press):** on the tamponade card the button sends exactly `Objective met: <its recognition
  objective's words>` (the text `panel/scenario.ts:114` sends); on the haemorrhage card and a free run, a note row
  `{ kind: 'note', ev: 'recognised', text: 'Recognised (instructor)' }`; `keeps` gains `'recognised'`; on a `/2` card
  the button is not rendered.
- [ ] **Red (`/2` reading):** on a `/2` run, `recognitionAt(d)` returns the recognition action's administration time
  and its window from `report3` (`dueT`, `windowS`, `givenT`, `firstGrade`, `debrief.ts:316–323`); the action is the
  one the format change marks as the recognition (the executor uses that change's own field; if it has none, STOP and
  ask the orchestrator rather than matching by label). No note text is read for a `/2` run.
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
e2e on both projects, CI green. **CI load:** 1 run.

### D6: Key moments and the export read the new facts (4 h)

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
script on the D0 fixtures (unchanged output), CI green. **CI load:** 1 run.

### D7a: The swimlane builder, with the expected windows (13 h: 8 for the lanes, 5 for the windows)

**Depends on:** D2 and D4 (its inputs' shapes); can start on synthetic data after D2 merges, beside D3/D5.
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
  - **Pressures:** SBP–DBP as a band with MAP inside it, and CVP; cuff values as points, the gaps between cycles blank
    (DQ1); only when `keeps` has `'pressures'` and the run measured them; EtCO₂ is on the course strip already.
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
  "– Not assessable"), synthetic `endT`/`ackT` and pressures; the lanes, the bar and band counts, an `aria-label`
  listing every window with its verdict, no lane for a fact not recorded.

**Acceptance:** as above; every band's ends equal the times `report3` or the verdict carries, to the second.
**Must not touch:** `debrief-course.ts`, `grade()`, every reason line. **Gate:** unit, model-docs guard, CI green.
**CI load:** 1 run.

### D7b: The swimlane in the report (3 h)

**Depends on:** D6, D7a. **Files:** `views/debrief.ts`, `views/debrief.css`, the Debrief e2e.

- [ ] **Placement ruled 5 November (DQ5): option A.** `#db-swimlane` "The run, lane by lane" heads page 2 in
  `#db-live-1`, before the key-moments table (`views/debrief.ts:396`), with its legend line (the shapes, the window
  band and tick, the verdict glyphs); page 1 (key times, the 2 November course strip, objectives) is unchanged. The
  mock-up the owner chose: `scratch/debrief2-mockups/option-A-swimlane-page2.pdf` (outside the repository; the
  executor copies it into the PR body as a reference image, not into the repo).
- [ ] e2e (both projects): the section exists on the A3.1 path and the `/2` MH card, with one window row per timed
  action and each tick's verdict word present; in print media it does not split (`break-inside: avoid`); page counts
  as measured, written in the PR body; page 1 heights unchanged (`debrief.e2e.ts:321`, `:433`, `:464`, `:491`).

**Gate:** Debrief e2e both projects ×3, model-docs guard, CI green. **CI load:** 1 run.

### D8: `debriefHints` in both scenario formats (3 h)

**Depends on:** D0 (controller package only; runs beside D1–D7). **Files:**
`packages/controller/scenarios/pme-scenario-1.schema.json`, `pme-scenario-2.schema.json`,
`packages/controller/src/scenario/types.ts`, `types-v2.ts`, `validate.ts` (cross-check: an opener's `at` is a known
run event or anchor), controller tests.

- [ ] **Red:** a card with `debriefHints: { show: ["…"], openers: [{ at: "state:deteriorating", text: "…" }] }`
  validates in `/1`; an `at` naming a state the card does not have is refused; five `show` lines are refused; in
  `/2` an `at` names an anchor (`'phase:<id>'`, `'action:<id>'`, `'pulseLoss'`, `'rosc'`, `'start'`, the forms
  `report3` reads at `debrief.ts:338–344`).
- [ ] No card gets the field in this piece.

**Gate:** controller unit, typecheck, model-docs guard, CI green. **CI load:** 1 run.

### D9: Hints and openers in the report (4 h)

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

**Gate:** unit, DOM tests, Debrief e2e both projects, model-docs guard, CI green. **CI load:** 1 run.

### D10: Hints on the showcase cards: drafts by an executor, the owner edits or rejects (4 h executor, plus the owner's edit)

**Ruled 5 November (DQ7):** an executor drafts the hints from each card's own objectives, marked as drafts; the owner
edits or rejects each line before anything prints.

**Depends on:** D8 merged. **Files:** a draft file outside the cards first (`scratch/debrief2-hint-drafts.md`), then
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

**Gate:** controller + demo unit (`showcase-cards.test.ts`), CI green. **CI load:** 1 run.

### D11: One Persian matcher for the script and the app (5 h)

**Depends on:** D0; the fate of `docs-fa-handout-strings` (rebase over it if it is merged first). **Files:**
`scripts/showcase/debrief-fa.mjs`, a new shared module (e.g. `apps/demo/src/app/i18n/fa-match.ts`, plain TS the
script imports through `--experimental-strip-types`, or a `.mjs` both import; the executor picks the one the build and
`vite` accept and says why), `packages/validation/test/debrief-fa.test.ts`.

- [ ] **Red:** the script's output on the D0 fixtures and on the committed fixtures `debrief-fa.test.ts` already uses
  (`debrief-fa.test.ts:17–21`) is byte-identical before and after (the HTML with `--html`, and the `--text` strings).
- [ ] Move the table loading, `parse`, `match`, the `TYPED` patterns and the digit rules (`debrief-fa.mjs:27–60` and
  the functions they serve) into the module; the script imports it. No string changes.

**Acceptance:** byte-identical output; `0 strings without translation` unchanged. **Must not touch:**
`fa-debrief.json`. **Gate:** validation tests, CI green. **CI load:** 1 run.

### D12: Persian words for Option C (4 h executor, plus the owner's reading)

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

**Gate:** `debrief-fa.mjs` on the D0 fixtures and a D-era export: `0 strings without translation`; validation tests;
CI green. **CI load:** 1 run (plus a re-run if the owner's corrections arrive after the PR opens).

### D13: The Debrief page in Persian (10 h)

**Depends on:** D11 (the matcher), D9 (the page's sections settled); D12 for the words (D13 can merge with the
entries still unreviewed, labelled as such). **Files:** `views/debrief.ts`, `views/debrief.css` (a `[lang=fa]`
right-to-left block), `apps/demo/src/app/fonts/` (Vazirmatn, Decision 10), `NOTICES.md`, `LICENSES/`, the Debrief e2e,
a DOM test.

- [ ] **Red:** with the switch on "فارسی", `#db-live-1`, `#db-live-2` and `#db-handout` carry `lang="fa"
  dir="rtl"`; every string the English page prints is either in the table or listed by the matcher as missing, and
  the page prints the missing ones in English (as the script does, `debrief-fa.mjs:11–12`); clinical values and
  times stay Western digits, left to right; the SVGs (course strip, swimlane) keep their English labels unless the
  table has them; the footer is the table's footer entry.
- [ ] A screen line under the switch while any printed entry is `"reviewed": false`: "Persian draft: not yet read by
  the clinical owner" (DQ10). It prints too.
- [ ] The switch is per browser (localStorage, wrapped in try/catch), English by default; `#db-who` and `.db-notes`
  are not touched (Decision 11 of the A/B plan).
- [ ] Print: Chrome and Safari, A4; page 1 within one page in Persian on the A3.1 path, both projects.
- [ ] The script and the page print the same Persian for the same export: a test renders both through the shared
  matcher and compares the section texts.

**Gate:** typecheck, unit, DOM, Debrief e2e both projects ×3, `pnpm check-licences`, `pnpm check-size` (the IIFE
bundle limit concerns the engine bundle; the executor confirms the font is not in it), model-docs guard, CI green.
**CI load:** 1–2 runs.

### D14: (withdrawn) the PEARLS mode table

Not built: the owner ruled the two hint blocks only (DQ6, 5 November).

### D15: Docs, the rehearsal reader, the gate (6 h)

**Depends on:** every piece merged that the release carries. **Files:** `scripts/showcase/kit-round-a.kitround.ts`
(the reader returns the new tiles, the swimlane's lanes and the hints count), `docs/guides/scenario-authoring.md`
(`debriefHints`), `docs/showcase/SHOWCASE-2-RUN-SHEET.md` §4 and the cue cards (the Recognised press; the new columns),
`CHANGELOG.md` (one `### Added` list under Unreleased), `docs/showcase/i18n/README.md`, a gate note
`docs/gates/debrief-2.md`.

- [ ] Kit round on the A3.1 path and the `/2` MH card, both projects: the PDFs (English and Persian) and the JSON go
  to `scratch/debrief2-gate/` and, after the owner's look, to the docs PR.
- [ ] The gate note lists every Option C item with the PR that built it, or the reason it is out.

**Gate:** kit-round both projects, the Persian script, CI green; the owner's hand print in Safari (the one check no
automated test makes, as in `debrief-redesign.md:1290–1293`). **CI load:** 1 run.

---

## 8. Partition, critical path, merge order, CI load

```
D0 ──┬── D1 ── D2 ──┬── D3 ── D5 ── D6 ──┬── D7b ── D9 ──┬── D13 ── D12* ── D15
     │              │                    │               │
     ├── D4 ────────┴─(D5 needs D4)      │               ├── D10* (owner's words; any time after D8)
     │              └── D7a ─────────────┘               │
     ├── D8 ──────────────────────────────────── (D9 needs D8)
     └── D11 ───────────────────────────────────────────────┘ (D13 needs D11)
* waits on the owner
```

- **Critical path (executor hours):** D0 2 → D1 5 → D2 5 → D3 5 → D5 5 → D6 4 → D7b 3 → D9 4 → D13 10 → D12 4 →
  D15 6 = **53 h**, plus the owner's reading of D12, his edit of the D10 drafts, and (for D5's `/2` part) the card
  change that retires the judged rows. D7a (13 h) runs beside D3/D5 once D2 is merged and must merge before D7b: it
  starts at hour 12 of the path and ends at hour 25, one hour before D6 does (hour 26), so it is NOT on the critical
  path but has one hour of slack; a slip in D7a's windows moves D7b day for day. D4, D8 and D11 run beside D1–D3 from D0.
- **What runs in parallel:** at most two executors at once without touching the same file: one on the
  `record.ts` → `debrief-moments.ts` → `views/debrief.ts` chain, one on D4, D8, D11, D7a in turn (D4 touches
  `debrief-moments.ts`, so it merges before D3's key-time change starts; D7a touches `debrief.ts` for the `/1`
  `window`, so it rebases over D3).
- **Merge order:** D0 · D8 · D11 · D1 · D4 · D2 · D3 · D7a · D5 · D6 · D7b · D9 · D10 (when the owner has edited) ·
  D13 · D12 · D15. The pieces on one file merge strictly in that order and each rebases on main before its last push.
- **CI load:** 16 PRs (D0–D13, D15) at ≈ 1 run each on the PR plus 1 on main after each merge ≈ **32 runs**, plus
  re-runs for review fixes (count ≈ 1 in 3). The last measured run length is ≈ 45 min (`debrief-redesign.md:62–64`,
  18 October), and a run is 13–15 jobs against 20 concurrent, so two runs at once queue. At two executors this is
  ≈ 2–3 runs a day.
- **Total executor effort:** D0 2 + D1 5 + D2 5 + D3 5 + D4 3 + D5 5 + D6 4 + D7a 13 + D7b 3 + D8 3 + D9 4 + D10 4 +
  D11 5 + D12 4 + D13 10 + D15 6 = **81 h**. The first draft was 70 h; the owner's answers of 5 November add 11 h:
  the expected windows +6 (D7a +5, D7b +1), DQ1's last-reading-with-age +2 (D1 +1, D6 +1), DQ2's acknowledgement +1
  (D2), DQ3's reference lines +1 (D3), DQ7's drafted hints +2 (D10), and DQ4 −1 (D5: no generic press on `/2`). That
  is just over the research's 60–80 h (`research/33:405–407`), and it does not count the `/2` card change D5 waits on.

| Piece | h | Depends on | Owner needed | CI runs |
|---|---|---|---|---|
| D0 baseline, fixtures | 2 | — | — | 1 |
| D1 SBP/DBP/CVP, `keeps` | 5 | D0 | DQ1 ruled | 1 |
| D2 alarm end and acknowledgement | 5 | D1 | DQ2 ruled | 1 |
| D3 CPR stop, hands-off, 60/80 % lines | 5 | D2 | DQ3 ruled | 1 |
| D4 who from `by` | 3 | D0 | — | 1 |
| D5 recognition reading, `/1` press | 5 | D3, D4; `/2`: the judged-rows retirement | DQ4 ruled | 1 |
| D6 key moments, export, minute table | 4 | D1, D2, D3, D5 | — | 1 |
| D7a swimlane builder + expected windows | 13 | D2, D4 | (E45 note, Decision 13) | 1 |
| D7b swimlane heads page 2 | 3 | D6, D7a | DQ5 ruled | 1 |
| D8 `debriefHints` schema | 3 | D0 | — | 1 |
| D9 hints in the report | 4 | D6, D8, D7b | DQ6 ruled | 1 |
| D10 drafted hints on the cards | 4 | D8 | his edit of every draft line | 1 |
| D11 shared Persian matcher | 5 | D0 | — | 1 |
| D12 Persian words | 4 | D6, D7b, D9, D11 | his reading of every line | 1 |
| D13 in-app Persian Debrief | 10 | D11, D9 | DQ9, DQ10 (open) | 1–2 |
| D15 docs, reader, gate | 6 | all | the Safari hand print | 1 |
| **Total** | **81** | | | **≈ 16 PR + 16 main** |

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

---

## 10. Questions for the owner (each with the default the plan uses if no answer comes)

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
| **DQ9** | In-app Persian: the Debrief page and its handout only, or the whole app? | Open. Default: the Debrief page and its handout only |
| **DQ10** | Until you have read every Persian line, the Persian page prints "Persian draft: not yet read by the clinical owner". Keep that line on paper too? | Open. Default: yes, on screen and on paper |
| **DQ11** | The new pressures: in the key-moments table and the minute appendix, and also as trend charts on the trends page? | Open. Default: table and appendix only |
| **DQ12** | The learner handout stays as it is (no values, no verdicts, the three fixed questions). The mock-up's time-anchored questions are not built. Agreed? | Open. Default: agreed; the handout is unchanged except that a recognition moment appears in its key-moments list |

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

What this plan did not verify:
- How the hemo pipeline emits NIBP between cuff cycles (D1 reads it; DQ1 depends on it).
- Whether the engine ever stops compressions without a command (D3's cross-check finds out).
- The PR state of `docs-fa-handout-strings` and the current CI run length (the GitHub API timed out on 2026-11-05).
- Whether page 2 fits A4 with the new columns (D6 measures).
