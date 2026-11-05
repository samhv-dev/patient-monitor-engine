# Debrief 2 (Option C): the record grows, the recognised mark, the swimlane, authored hints, in-app Persian — Implementation Plan

**STATUS: DRAFT FOR REVIEW 2026-11-05.** Written by a planning executor from brief 15 of the post-demo set. Nothing in
it is ruled until the owner answers "Questions for the owner" and the orchestrator reviews the pieces. No product code,
test or card was changed while writing it.

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
| C2 | The recognised mark on every case | one time per run: when the instructor marked that the team named the problem | Only where the card has one: a `/1` objective with `debrief: 'recognition'` ticked in the Scenario tab (`panel/scenario.ts:114` writes the note `Objective met: …`; read at `debrief.ts:194`, tile at `debrief-moments.ts:131–136`), or a `/2` judged row of kind `recognition` pressed in Instructor v2 (`teach2/press.ts:41` writes the same note; `report3` matches it at `debrief.ts:367`; tile at `debrief-moments.ts:138–141`). `grade()` returns the judged row's clock start `fromT` but no press time (`grade.ts:370–373`). A card with neither (haemorrhage, induction, every library card) has no recognition at all | Yes: one new row kind of event, `ev: 'recognised'`, written only on a card that has no recognition objective or judged row | D5 |
| C3 | Systolic, diastolic, CVP at 1 Hz | the monitor's ART S/D (or NIBP S/D) and CVP numerics per sample | Not recorded. `TREND` keeps six numerics (`record.ts:54`); the monitor's ids exist (`glossary-data.ts:24` `mon.abpSys`, `:25` `mon.abpDia`, `:27` `mon.cvpMean`, `:32` `mon.nibpSys`/`nibpDia`) and every measurement event already passes through `RunRecord.engine` (`record.ts:250–252`), which keeps only the TREND ids in a sample (`record.ts:266`) | Yes: three sample keys | D1 |
| C4 | Alarm end times | per alarm raise: when its condition cleared | Not recorded. A raise is a row (`record.ts:221–222`); the tracker forgets the alarm when it leaves the active list (`record.ts:223`). The engine's status carries what is needed: `AlarmEntry.latched` ("the condition is gone but the alarm is latched") and `acked` (`packages/engine-core/src/types-device.ts:51–61`) | Yes: `endT` on the raise row | D2 |
| C5 | CPR hands-off time | when compressions started and stopped, inside the pulseless spans | Half recorded. A CPR command row gets `ev: 'cpr'` only when it starts compressions (`record.ts:212`); a stop is a row ("CPR stopped", `describe.ts:68–69`) with no `ev`. Pulseless spans exist (`debrief-moments.ts:35–44`) | Yes: `ev: 'cprStop'` on the stop row | D3 |
| C6 | The swimlane | lanes: patient, team, monitor alarms (raise ▸ end), drugs and fluids, and the pressures | Partly: the course strip draws the moments, the four trends and the marks (`views/debrief-course.ts:186`); lanes need C1, C3, C4 | No (built from C1–C5) | D7a, D7b |
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
3. **The Recognised press is one control with one reading.** A "Recognised" button in the session bar (beside
   Bookmark, `sessionbar.ts:47`) and in the Instructor v2 dock (beside the three marks, `teach2/dock.ts:18–22`):
   - on a card with a recognition objective (`/1` `debrief: 'recognition'`) or a judged recognition row (`/2`), the
     press IS that tick: it sends the same note the Scenario tab and `judge()` send (`panel/scenario.ts:114`,
     `teach2/press.ts:41`), so no new row exists for it and the existing tile reads it;
   - on any other card or a free run, it writes one note row with `ev: 'recognised'` through the existing note path
     (`link.ts:148` → `RunRecord.note`, `record.ts:304–306`, which gains an optional `ev`).
   - The Debrief reads it through ONE new function, `recognitionAt(d)` in `debrief-moments.ts`, which the tile, the
     key moments and the swimlane all call. A second press is ignored by the reading (the first kept one counts), as
     the tick is today (`debrief.ts:194` takes the first).
4. **Alarm end is `endT` on the raise row**, the time the alarm left the active list or first reported
   `latched: true`, whichever is first (the condition cleared; acknowledgement is not the end). A return to a bookmark
   clears every `endT` later than the restore time on kept rows, as `undo()` already resets the tracker
   (`record.ts:343–355`). An alarm still active at the record's end has no `endT` and is drawn open to the end.
5. **CPR stop is `ev: 'cprStop'` on the command row**, the same source as the existing `cpr` event
   (`record.ts:212`), scenario-issued commands included (they are rows of kind `scenario`, `record.ts:206`). D3's
   acceptance cross-checks the rows against the engine's `hemo.cpr.active` on a scripted run, so a stop the engine
   makes without a command (if any exists) is found, not assumed away.
6. **Pressures are three sample keys outside `TREND`**: `sys`, `dia` (each the first valid of ART then NIBP, the same
   order `TREND.map` uses, `record.ts:54`) and `cvp` (`cvpMean`). Outside `TREND` so that the six trend charts
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
11. **The mock-up's verdict words are not adopted.** It prints "○ Instructor" and "◆ Gap to explore"; the ruled words
    are ✓ Observed · ✗ Not observed · – Not assessable · ◆ Discuss (E42, `views/debrief.ts:49–55`). Asked anyway (DQ8)
    because the mock-up is what the owner saw.
12. **Piece numbering D0…D15** is local to this plan; owner questions are DQ1…DQ12, and the orchestrator gives them
    E numbers (the last in use is E141) when it sends the list.

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

### D1: The record keeps systolic, diastolic and CVP; `RunData.keeps` (4 h)

**Depends on:** D0. **Files:** `apps/demo/src/app/record.ts`, `record.test.ts`, `debrief-compat.test.ts`.

- [ ] **Red:** in `record.test.ts`, a measurement event with `abpSys` 92, `abpDia` 58, `cvpMean` 17 gives a sample
  with `sys: 92, dia: 58, cvp: 17`; with ART invalid and `nibpSys` 100 valid, `sys: 100` (ART first, then NIBP, as
  MAP, `record.ts:54`); an invalid value is `null` (`record.ts:251`); a new record has `keeps` containing
  `'pressures'`; `emptyRun()` (`record.ts:119`) too.
- [ ] **Implement:** a `PRESSURES` table beside `TREND` (Decision 6), read in `sample()` (`record.ts:263–276`) as
  TREND is; `Sample` gains `sys`, `dia`, `cvp` as optional `number | null` (so an old record type-checks);
  `RunData.keeps?: string[]`.
- [ ] **NIBP check (DQ1):** the executor reads how the hemo pipeline emits NIBP numerics
  (`packages/engine-core/src/l2/hemo/pipeline.ts:385–405`) and states in the PR body whether a sample between cuff
  cycles holds the last cycle's value or null, and whether MAP already behaves the same today. No change to the
  engine either way; the answer goes to the owner with DQ1.
- [ ] **Size:** measure the JSON bytes per simulated minute of the A3.1 path before and after (one number each, in
  the PR body), because the archive lives in `localStorage` (`archive.ts:1–7`).

**Acceptance:** red then green; D0's compat test still green; the pre-D fixtures read `sys` as `undefined`, which
`debrief-compat.test.ts` maps to "not recorded". **Must not touch:** `TREND`, `VALUE` (`debrief.ts:39`), the charts.
**Gate:** typecheck, unit, model-docs guard, CI green. **CI load:** 1 run.

### D2: Alarm end times (4 h)

**Depends on:** D1 (same file, merge after it). **Files:** `record.ts`, `record.test.ts`.

- [ ] **Red:** an alarm raised at 10, still active at 11, absent from the status at 25 has `endT: 25`; one reported
  `latched: true` at 20 and acknowledged at 30 has `endT: 20` (Decision 4); one active at the end has no `endT`; a
  return to a bookmark at 15 after the end at 25 clears it (the alarm active at the bookmark,
  `record.ts:196`, `:353`); a re-raise after the end is its own row (as today, `record.ts:222`); `keeps` gains
  `'alarmEnd'`.
- [ ] **Implement:** in `engine()`'s `alarmStatus` branch (`record.ts:221–223`) keep the raise row per active id and
  set `endT` on the first status where the id is absent or `latched`; `undo()` deletes `endT > t` on kept rows.
  `Row.endT?: number` with its doc line.

**Acceptance:** as Red; D0 green. **Must not touch:** the alarm manager (`packages/engine-core/src/l3/alarms/`),
`alarmLine`. **Gate:** typecheck, unit, model-docs guard, CI green. **CI load:** 1 run.

### D3: CPR stop in the record; hands-off time (4 h)

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
- [ ] The definition and any target are the owner's (DQ3): the tile prints the seconds and the fraction, no target,
  no verdict, until he rules.

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

### D5: The Recognised mark (6 h)

**Depends on:** D3 (record.ts) and D4 (debrief-moments.ts). **Files:** `record.ts` (`note()` takes an optional `ev`),
`link.ts` (the note path carries it, `link.ts:96`, `:148`), `sessionbar.ts`, `teach2/dock.ts`, a new
`apps/demo/src/app/recognised.ts` (the press: which tick it is on this card), `debrief-moments.ts`
(`recognitionAt`), their tests, one e2e after the existing Debrief tests.

- [ ] **Red (press):** on the tamponade card the press sends exactly `Objective met: <its recognition objective's
  words>` (the text `panel/scenario.ts:114` sends); on the `/2` MH card exactly the judged recognition row's note
  (`teach2/press.ts:41`); on the haemorrhage card and a free run, a note row `{ kind: 'note', ev: 'recognised',
  text: 'Recognised (instructor)' }`; `keeps` gains `'recognised'`.
- [ ] **Red (reading):** `recognitionAt(d)` returns the first kept tick or `recognised` row, with its clock start: the
  card's sign state for `/1` (`recognitionFrom`, `debrief-moments.ts:113–121`), the judged row's `fromT` for `/2`
  (`grade.ts:370–373`), else the start. `keyTimes` (`debrief-moments.ts:131–141`) and `keyMoments` (a team moment
  "Recognised (instructor)") call it; nothing else reads the note text for recognition. An undone press is not
  counted.
- [ ] **Red (old files):** a record without `'recognised'` in `keeps` and with no recognition objective prints no
  recognition tile (as today), never "not ticked".
- [ ] **e2e (both projects):** press Recognised on a free run at sim ≈ 30 s; the Debrief shows the tile and the key
  moment with the recorded time.
- [ ] The button's word and key (DQ4) are the owner's; the default is the word "Recognised" and no keyboard shortcut
  (the FX-18 typing guard, `apps/demo/e2e/fx18-shortcuts-typing.e2e.ts`, stays green either way).

**Acceptance:** as Red. **Must not touch:** `grade()`, the judged rows' offering rule (`teach2/rows.ts:274`, `:481`).
**Gate:** typecheck, unit, model-docs guard, Debrief e2e + fx18 e2e on both projects, CI green. **CI load:** 1 run.

### D6: Key moments and the export read the new facts (3 h)

**Depends on:** D1, D2, D3, D5. **Files:** `debrief-moments.ts`, `debrief.ts` (`DebriefExport` value types,
`debrief.ts:494–498`), `views/debrief.ts` (`momentsTable`, `minutes`), `views/debrief.css`, their tests.

- [ ] **Red:** a key moment's `values` gains `sys`, `dia`, `cvp` (the sample at ⌊t⌋, then +3 s, as `valueAt`,
  `debrief-moments.ts:49–56`); each alarm under a moment carries its `endT` when it has one; the table's columns are
  `n · Time · Who · What happened · HR · SBP/DBP · MAP · CVP · SpO₂ · EtCO₂`; an alarm line reads "CVP high 06:02 ▸
  07:40" or "CVP high 06:02 ▸ (still on)"; a pre-D file prints "not recorded in this file" once under the table and
  `·` in the new cells (not `–`); the minute table gains the three columns.
- [ ] Page 2 still fits: the e2e height checks (`debrief.e2e.ts:321`, `:433`, `:464`, `:491`) stay green; if the
  new columns wrap on A4 the table drops the "Who" word to its shape only (■/●), which the legend explains.

**Acceptance:** as Red; the D0 snapshot changes only by the added keys. **Must not touch:** the SpO₂ rule and
sentence (`views/debrief.ts:244`, E126). **Gate:** unit, model-docs guard, Debrief e2e both projects, the Persian
script on the D0 fixtures (unchanged output), CI green. **CI load:** 1 run.

### D7a: The swimlane builder (8 h)

**Depends on:** D2 and D4 (its inputs' shapes); can start on synthetic data after D2 merges, beside D3/D5.
**Files:** `apps/demo/src/app/views/debrief-swimlane.ts` (new, pure: a string from data, like
`views/debrief-course.ts:1–14`), `debrief-swimlane.test.ts` (new).

- [ ] `swimlaneSvg(d, moments, opts): string`, one shared time axis, the lanes top to bottom:
  - **Patient:** patient moments (● vermillion), the pulseless band (grey, as the course strip draws it);
  - **Team:** team moments (■ blue), the Recognised moment with its own outline shape (◇, as the mock-up);
  - **Monitor:** one bar per alarm raise, solid from raise to `endT` (open to the end when it has none); an alarm
    without `endT` in a pre-D file is a tick only, with "end not recorded" in the lane label;
  - **Drugs and fluids:** one ▲ per kept drug or fluid row;
  - **Pressures:** SBP–DBP as a band with MAP inside it, and CVP; only when `keeps` has `'pressures'` and the run
    measured them; EtCO₂ is on the course strip already and is not repeated.
  - Every lane: words at its left; no colour without a shape (E45); height ≤ 90 mm at 182 mm.
- [ ] Unit tests on the D0 fixtures with synthetic `endT` and pressures added: the lanes, the bar count, an
  `aria-label` listing the lanes' contents, no lane for a fact not recorded.

**Acceptance:** as above. **Must not touch:** `debrief-course.ts`. **Gate:** unit, model-docs guard, CI green.
**CI load:** 1 run.

### D7b: The swimlane in the report (2 h)

**Depends on:** D6, D7a. **Files:** `views/debrief.ts`, `views/debrief.css`, the Debrief e2e.

- [ ] Placement by DQ5. Default: `#db-swimlane` "The run, lane by lane" heads the timeline page in `#db-live-2`
  (before `#db-timeline`, `views/debrief.ts:419`), with its legend line; the table below it is unchanged; page 1
  (key times, the course strip, objectives) is unchanged.
- [ ] e2e (both projects): the section exists on the A3.1 path; in print media it does not split (`break-inside:
  avoid`); page counts as measured, written in the PR body.

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
- [ ] The PEARLS box (`views/debrief.ts:325–326`) is unchanged.
- [ ] Tests: a DOM test that the printed text equals the card's strings character for character (no interpolation);
  the handout (`#db-handout`) contains none of them (the learner handout is unchanged).

**Gate:** unit, DOM tests, Debrief e2e both projects, model-docs guard, CI green. **CI load:** 1 run.

### D10: Hints on the showcase cards, in the owner's words only (2 h executor, plus the owner's wording)

**Depends on:** D8 merged; the owner's words (DQ6, DQ7). **Files:** `apps/demo/src/app/showcase/showcase-*.json`
(only the cards he wrote for), `showcase-cards.test.ts`.

- [ ] The executor prepares a list per card: the card's story and objectives and the mock-up's placeholder openers
  (`docs/plans/debrief-2/mockup/option-c-debrief2.html`, page 2), marked "placeholder, not clinical text", for the
  owner to rewrite or strike. Nothing from that list enters a card without his words.
- [ ] Each card the owner answered gets `debriefHints` with his text exactly; the PR body quotes his answer and its
  date. No answer: no field (as `takeHome` was handled, `debrief-redesign.md:262–264`).

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

### D14: (reserved) the PEARLS mode table

Not planned unless the owner says yes to DQ6 (b). If he does, it is a `debriefHints.modes[]` block (gap or strength,
domain, suggested mode) authored per card, ≈ 3 h, after D9, with the same no-interpolation rule.

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

- **Critical path (executor hours):** D0 2 → D1 4 → D2 4 → D3 4 → D5 6 → D6 3 → D7b 2 → D9 4 → D13 10 → D12 4 →
  D15 6 = **49 h**, plus the owner's reading of D12 and his words for D10. D7a (8 h) runs beside D3/D5 once D2 is
  merged; D4, D8 and D11 run beside D1–D3 from D0.
- **What runs in parallel:** at most two executors at once without touching the same file: one on the
  `record.ts` → `debrief-moments.ts` → `views/debrief.ts` chain, one on D4, D8, D11, D7a in turn (D4 touches
  `debrief-moments.ts`, so it merges before D3's key-time change starts).
- **Merge order:** D0 · D8 · D11 · D1 · D4 · D2 · D3 · D7a · D5 · D6 · D7b · D9 · D10 (when the owner has written) ·
  D13 · D12 · D15. The pieces on one file merge strictly in that order and each rebases on main before its last push.
- **CI load:** 16 PRs (D0–D13, D15; D14 only on a yes) at ≈ 1 run each on the PR plus 1 on main after each merge ≈
  **32 runs**, plus re-runs for review fixes (count ≈ 1 in 3). The last measured run length is ≈ 45 min
  (`debrief-redesign.md:62–64`, 18 October; not re-measured here because the GitHub API was unreachable), and a run is
  13–15 jobs against 20 concurrent, so two runs at once queue. At two executors this is ≈ 2–3 runs a day.
- **Total executor effort:** D0 2 + D1 4 + D2 4 + D3 4 + D4 3 + D5 6 + D6 3 + D7a 8 + D7b 2 + D8 3 + D9 4 + D10 2 +
  D11 5 + D12 4 + D13 10 + D15 6 = **70 h** (the research's 60–80 h, `research/33:405–407`); D14 adds ≈ 3 h on a yes.

| Piece | h | Depends on | Owner needed | CI runs |
|---|---|---|---|---|
| D0 baseline, fixtures | 2 | — | — | 1 |
| D1 SBP/DBP/CVP, `keeps` | 4 | D0 | DQ1 (answer after) | 1 |
| D2 alarm end times | 4 | D1 | DQ2 | 1 |
| D3 CPR stop, hands-off | 4 | D2 | DQ3 | 1 |
| D4 who from `by` | 3 | D0 | — | 1 |
| D5 Recognised mark | 6 | D3, D4 | DQ4 | 1 |
| D6 key moments, export, minute table | 3 | D1, D2, D3, D5 | — | 1 |
| D7a swimlane builder | 8 | D2, D4 | — | 1 |
| D7b swimlane in the report | 2 | D6, D7a | DQ5 | 1 |
| D8 `debriefHints` schema | 3 | D0 | — | 1 |
| D9 hints in the report | 4 | D6, D8, D7b | DQ6 | 1 |
| D10 hints on the cards | 2 | D8 | DQ7 (his words) | 1 |
| D11 shared Persian matcher | 5 | D0 | — | 1 |
| D12 Persian words | 4 | D6, D7b, D9, D11 | his reading of every line | 1 |
| D13 in-app Persian Debrief | 10 | D11, D9 | DQ9, DQ10 | 1–2 |
| D14 PEARLS mode table | (3) | D9 | DQ6 (b) | (1) |
| D15 docs, reader, gate | 6 | all | the Safari hand print | 1 |
| **Total** | **70** (+3) | | | **≈ 16 PR + 16 main** |

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

| ID | Question | Default if no answer |
|---|---|---|
| **DQ1** | Systolic and diastolic: record the arterial line's, else the cuff's (NIBP), as MAP is chosen today? The cuff is intermittent: on a key-moment row, print the last cuff reading with its age ("98/60, cuff 2 min before"), or "–" between cycles? (D1 reports how the model emits it.) | Arterial line first, then the cuff, as MAP; the last cuff reading printed with its age |
| **DQ2** | An alarm's end: when its condition cleared (it left the list or became latched), or when it was acknowledged? | When the condition cleared; acknowledgement not drawn |
| **DQ3** | CPR hands-off: define it as the pulseless time without compressions, from the first pulse loss to the last return of circulation (or the run's end), and print the seconds and the compression fraction? Print a target? A source the executor would use: the AHA consensus on CPR quality (Meaney et al., *Circulation* 2013;128:417–435), which names a fraction goal; the owner chooses whether any target prints | The seconds and the fraction, no target, no verdict |
| **DQ4** | The Recognised press: the word on the button, and whether it has a keyboard key. On a card with a "Name/Recognise …" objective or judged row, it ticks that row (one press, not two). | "Recognised"; no key; ticks the card's row when it has one |
| **DQ5** | The swimlane: on page 1 in place of the course strip (as the mock-up), or at the head of the timeline page with page 1 unchanged? | Head of the timeline page; page 1 unchanged (it is your 2 November design) |
| **DQ6** | The card's hints: (a) "What this case is built to show" and "Openers for the analysis" only, or (b) also the PEARLS mode table (gap, domain, suggested mode) of the mock-up? | (a) only |
| **DQ7** | The hints and openers for each card, in your words (the mock-up's are placeholders written by a researcher). Which cards first? | None printed until you write them; tamponade and MH first when you do |
| **DQ8** | The mock-up shows "○ Instructor" and "◆ Gap to explore"; the ruled words are ✓ Observed · ✗ Not observed · – Not assessable · ◆ Discuss (E42). Keep the ruled words? | Keep the ruled words |
| **DQ9** | In-app Persian: the Debrief page and its handout only, or the whole app? | The Debrief page and its handout only |
| **DQ10** | Until you have read every Persian line, the Persian page prints "Persian draft: not yet read by the clinical owner". Keep that line on paper too? | Yes, on screen and on paper |
| **DQ11** | The new pressures: in the key-moments table and the minute appendix (default), and also as trend charts on the trends page? | Table and appendix only |
| **DQ12** | The learner handout stays as it is (no values, no verdicts, the three fixed questions). The mock-up's time-anchored questions are not built. Agreed? | Agreed: the handout is unchanged except that a Recognised moment appears in its key-moments list |

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

What this plan did not verify:
- How the hemo pipeline emits NIBP between cuff cycles (D1 reads it; DQ1 depends on it).
- Whether the engine ever stops compressions without a command (D3's cross-check finds out).
- The PR state of `docs-fa-handout-strings` and the current CI run length (the GitHub API timed out on 2026-11-05).
- Whether page 2 fits A4 with the new columns (D6 measures).
