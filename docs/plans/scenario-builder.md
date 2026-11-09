# The scenario builder and the scenario store: Implementation Plan

**STATUS: PLAN WITH MOCK-UPS, NOTHING BUILT. Draft until the owner rules BQ1–BQ14 (section 13).** Written 9 November
2026 by a planning executor from brief 108 of the post-demo set. No product code, test, card or engine file was changed.

**Base and inputs.**
- Base: `origin/main` **8344539d** (Merge PR #359, `plan-learner-action-remote`), read in the worktree
  `scratch/wt-plan-builder` (branch `plan-scenario-builder`). Every `file:line` below is on 8344539d and is a starting
  point only: an executor finds the code by the function name given.
- The owner's rulings this plan builds on, as the orchestrator's log records them: 8 November 22:28 ("Scenario builder:
  edits the current cards (answers row 51 too); runs the card in place against the engine; saves DURABLY, online,
  central database") and 9 November 03:55 (GitHub accounts are not acceptable for authors; the kit laptop is durable
  but not central; verification is a signing step; signed scenarios enter the GitHub repository and ship bundled with
  the simulator; unverified ones stay reachable through a cloud database).
- Read: `docs/plans/scenario-format-v2.md` (the `/2` design), `docs/plans/scenario-format-v2-plan.md` (its build, in
  particular F8's oracle O1–O4), `docs/guides/scenario-authoring.md` (the `/2` section), the stub in
  `apps/demo/src/app/views/scenarios.ts`, the schema `packages/controller/scenarios/pme-scenario-2.schema.json`, the
  validator `packages/controller/src/scenario/validate.ts`, the library `apps/demo/src/app/scenarios.ts`, Instructor v2
  (`apps/demo/src/app/teach2/`), the kit's servers (`scripts/showcase/server/launch.mjs`,
  `packages/controller/relay/server.ts`), and the Room plan's non-goal "Accounts, profiles, a scenario builder (owner,
  11:40: none until they exist)" (`docs/plans/room-and-instruments.md:114`). This plan is the "until they exist": it
  brings the first accounts the project has, for AUTHORS only, on a server the owner controls; learners still have none.
- The shape follows `docs/plans/debrief-2-option-c.md` (a plan whose mock-ups are in a folder beside it). The mock-ups
  are in `docs/plans/scenario-builder/mockup/`; its `README.txt` lists, for every page, what is the product's own and
  what is illustrative.

---

## 1. Intent

Today a scenario is a JSON file written by hand. `#/scenarios/builder` explains the `/1` format, offers "Import a
scenario file" and links the guide (`views/scenarios.ts:103–155`, "a visual builder comes later"). The owner wants
authors (residents, colleagues, himself) to write cases in the app:

1. **A builder** that is a form over `pme-scenario/2`: the phases and their entry rules, the actions with their
   acceptance criteria, the outcomes, the violations, the debrief hints and the handout questions, with the validator's
   refusals shown at the field that causes them.
2. **Run it in place**: the draft runs on this computer's engine, in Instructor v2 beside the builder, so the author sees
   a phase rule fire and an action's grade change, and can jump the clock.
3. **The current cards open in it**: every library card opens as a copy, which is how the remaining `/1` cards become
   `/2` (row 51 of the post-demo priorities), each proving that its course is unchanged.
4. **Nothing is lost, and cards are central**: an autosave in the browser at every change, the kit's own store on the
   department laptop, and a central store on a server the owner controls, where unverified cards are reachable by
   everyone who uses the app, and from which a verifier's signature sends a card into the repository so it ships with
   the simulator.

## 2. Goals, non-goals, anti-goals

Goals
- One builder for both new cards and copies of existing ones; it writes only what the `/2` schema accepts.
- The validator that runs a card is the validator the builder shows: `validateScenario` (`validate.ts:78`), its errors
  keyed by JSON path, never a second rule set. Builder-only checks (missing sources, unreachable phases) are warnings
  and say so.
- A draft runs on the real engine through the real runner (`PhaseRunner`) and the real `grade()`; no preview engine.
- Three saving layers, each usable without the next: browser, kit, central.
- A signed card in the repository is byte-identical to the version signed (hash checked in CI).

Non-goals
- No change to the `/2` format in this plan's first pieces. Where the builder exposes a gap in the format (section 4.3),
  the gap is listed with the piece that would close it; nothing is added to the schema to suit the builder.
- No physiology. A port that would need a mechanism the engine lacks says so and stops (the owner's rule: a fix is the
  mechanism, never a patch).
- No accounts for learners, no learner data, no debriefs or runs in the central store (section 9.7).
- The executor chooses no hosting provider and deploys nothing. The owner's administrator deploys the store from the
  repository's `services/store/` with its guide (BQ2).
- The relay on the store's server (row 42) is named as a later use of the same machine, not built here.

Anti-goals (a piece that does one of these is rejected)
- A builder control that produces a card the validator refuses, or a field the schema lacks.
- A phase entered by a press, a timer or a button in the builder (the `/2` rule: phases read the engine's truth).
- A secret in the deployed app: a token, an API key, a store administrator's password. The app holds only the
  signed-in author's own session token, in that browser.
- The store's bot pushing to `main`. It opens a pull request; CI validates; the owner merges (no push to main, and a red
  gate is never merged past).
- A port declared "identical" without the twin run of section 7.3.

## 3. Fixed points (the owner's rulings)

| # | Ruling | Where this plan honours it |
|---|---|---|
| F-1 | The builder edits the current cards; that answers row 51 | §7 |
| F-2 | The card runs in place against the engine | §6 |
| F-3 | Saving is durable and central | §8, §9 |
| F-4 | GitHub accounts are not acceptable for authors | §9.2: e-mail and password on the owner's store; nobody but the store's bot touches GitHub |
| F-5 | The kit laptop is durable but not central | §8: the kit store is layer 2, never the only copy that matters |
| F-6 | Verification is a signing step; signed cards enter the repository and ship bundled | §9.4, §9.5 |
| F-7 | Unverified cards stay reachable through a cloud database | §9.3: "community, unverified" in the library |
| F-8 | Cards are `/2` only; Instructor v2 is the only instructor UI (5 November) | the builder writes `/2` only; run in place is Instructor v2 |
| F-9 | Judged rows are retired (5 November): a team act the instructor observes is a `record` action | §5.3: the builder has no judged-row editor; a `judged` block is refused with the validator's own line |
| F-10 | Every number carries its source; a number without one is a placeholder marked for the owner | §5.5: the sources check; signing waits for it (§9.4) |

## 4. What exists today, and what the builder finds

### 4.1 The pieces the builder reuses (main 8344539d)

| Need | Already there |
|---|---|
| Validate a card | `validateScenario(input)` (`packages/controller/src/scenario/validate.ts:78`): the schema first (ajv), then `validateV2`'s cross-checks. Every error is one line `<json path>: <what is wrong>` (`validate.ts:36`), for example `/phases/2/next/0: no phase "x"`; a route the engine does not model is a WARNING with its path (`validate.ts:241`) |
| Run a `/2` card | `ScenarioDriver.load` picks `PhaseRunner` for a `/2` document; Instructor v2 (`#/teach2`) draws phases, rows and grades; `grade()` is pure (`grade.ts`) |
| Load a card that is not in the library | Instructor v2's "open a card file" (`teach2/begin.ts:70–81`) validates and keeps it in this browser through `keepImported` (`scenarios.ts:87`): per browser, under "Imported", a built-in id refused |
| Per-browser storage | `store.ts` (localStorage, wrapped: private windows throw) |
| Return to a phase | the runner places one stage mark per phase entry; Instructor v2's past chips restore it |
| Jump the clock | Fast forward +2 and +5 min (`fast-forward.ts:19`, `FF_SPANS`), disabled while paused |
| A durable folder on the kit laptop | the classroom relay keeps `room.json` in this computer's application-data folder (`launch.mjs:34`, `stateDir()`: `~/Library/Application Support/PME Classroom`, `%LOCALAPPDATA%\PME Classroom`), outside the kit folder, so it survives a kit update |
| An HTTP server in the kit | the relay serves the app and its own paths (`relay/server.ts:589`, `:627`); `serve.mjs` for the simulator alone |
| Persian through a table | one matcher (`i18n/fa-match.mjs`) over `docs/showcase/i18n/fa-debrief.json`, each entry `reviewed: false` until the owner reads it; `DRAFT_LINE` while any printed entry is unread (`i18n/fa-dom.ts`) |

### 4.2 The library today: 20 cards, 16 to port

`LIBRARY` (`scenarios.ts:57`) globs `apps/demo/src/app/showcase/*.json` and `packages/controller/scenarios/*.json`:
**20 cards**, 18 in `/1` and 2 in `/2` (`showcase-mh-v2`, `showcase-haemorrhage-v2`). Two of the `/1` cards are the demo
copies whose `/2` versions exist (`showcase-mh`, `showcase-haemorrhage`; F7.5 moves them out of the library). That leaves
**16 `/1` cards to port**: the eleven in `packages/controller/scenarios/` and five showcase cards (anaphylaxis,
bronchospasm, induction, induction after premedication, tamponade). Row 51 and the brief say "fourteen"; the tree holds
sixteen, listed in the census of §7.2. The plan covers all sixteen.

### 4.3 Findings while reading (each goes to the roadmap or a piece, none is fixed here)

1. **The stub's Import refuses `/2`, Instructor v2's accepts it.** `views/scenarios.ts:131` still says "importing a
   pme-scenario/2 card is not built yet", while `teach2/begin.ts` imports `/2` cards since brief 22. B2 replaces the stub;
   until then the message is stale.
2. **A phase rule cannot read a drug's concentration.** The schema's `truthVar` is the StateVars, `map`, `ph`,
   `lactate`, `mhActivity`, `mhExcess`, `dantroleneE` and `setMinuteVentilationLMin`. A local-anaesthetic toxicity card
   cannot enter "toxic" on a plasma level; it must use the effect (rhythm, QRS, MAP). An author will ask for it. Exposing
   a concentration is an F4-like signal piece (engine exposure plus a schema enum entry), out of this plan; the builder
   offers the list as it is.
3. **The two `/2` demo cards carry no `src` on their actions.** Their numbers' provenance is in `$comment` prose. The
   sources check (§5.5) will mark them; whether the bundled cards need `src` before they count as verified is BQ12.
4. **Twelve of the sixteen `/1` cards use `afterS` and four use `probability`.** Neither exists in `/2` (a phase has no
   timer leaf; a phase change has no dice). Those beats cannot be translated mechanically (§7.2).
5. **Instructor v2 is crowded below about 1000 px.** Placed beside a 440-px builder at 1440 px, the dock's tools and
   marks overlap (mock-up 4). The split view needs Instructor v2's narrow layout or a collapsible builder (B6 decides,
   measured at 1280, 1440 and 1920 px).

## 5. The builder: a form over `/2`

Mock-ups 1–3 (`01-builder-main`, `02-phase-editor`, `03-action-editor`). Route `#/scenarios/builder` (the stub's),
with `#/scenarios/builder/<draftId>` for a draft. The page is a console page (the app's `console-page` styles), three
columns: the card's outline, the editor of one part, the checks.

### 5.1 The model under the form (B1)

- `formOf(doc)` and `docOf(form)` are pure and **lossless**: `docOf(formOf(doc))` deep-equals `doc` for every card in
  the library (20 today), key order included, `$comment` on every entry kept. The form never re-orders arrays the
  author did not touch, because `next` order and action order are meaningful.
- Each form field carries its JSON path. The validator's error paths map to fields by prefix (`/phases/2/next/0` →
  phase 3, its "may be followed by" list, row 1). An error whose path matches no field (a schema error on a whole
  block) shows at the block's heading.
- Validation runs on every change, debounced (300 ms), on the document the form would write: the author sees exactly
  what a load would see.

### 5.2 The sections (B2–B5), one per schema block

| Section | Schema | The editor |
|---|---|---|
| Header and story | `id`, `title`, `category`, `durationMin`, `seed`, `mode`, `story`, `takeHome` (≤ 4), `notes` | text fields; a copy's id must differ from every built-in id (`keepImported`'s rule) |
| Patient and sensors | `patient` (the `/1` block, by reference) | age, sex, weight, height, age band, sensors; the Patient page's own controls where they exist |
| Case briefing | `briefing` (`text` ≤ 4000, `estimatedMinutes`, `durationS` ≤ 600, `lang`, `textFa`) | text, with "never names the diagnosis" as the field's hint (the schema's own description) |
| Phases | `phases[]`: `id`, `label`, `cue`, `notes`, `initial`, `enter`, `holdS`, `next[]` | §5.3 |
| Script | `script[]`: `on` (`phase:<id>`, `action:<id>#n`, `atScenarioS`), `commands[]` | an anchor picker and the commands from the Drug, Airway, Defib · CPR and Devices sheets' own builders; labelled "card-set, never graded" |
| Actions | `actions[]` | §5.4 |
| Outcomes | `outcomes[]`: `id`, `text`, `rule`, `anchor`, `withinS` | a truth rule (the phase rule editor), an anchor, a window |
| Violations | `contraindications` on each action | edited in the action; listed together here |
| Debrief hints | `debriefHints`: `show` (≤ 4), `openers` (≤ 4, `at` + `text`) | an anchor picker limited to `start`, `pulseLoss`, `rosc`, `phase:<id>`, `action:<id>` of this card |
| Handout questions | `debriefHints.handoutQuestions` (≤ 3, `text` ≤ 92 characters) | the same anchors; a live count against the 92 (the measured A4 line, the schema's own note) |

### 5.3 The phase editor (B3)

- The rule is a tree: ALL / ANY / NOT, and the five leaves `value` (var, op, value, `forS`), `slope` (var, op,
  `perMin`, `overS`), `unchanged` (var, `withinPct`, `overS` or `since: phaseStart`), `visited` (a phase of this card)
  and `signal` (`pulseLoss`, `rosc`, `rhythm:<id>` from the engine's rhythm table). The variable list is the schema's
  `truthVar` enum, with its units. There is no press, event or timer leaf to choose: the validator would refuse
  `manual`, `event` and `afterS`, so the builder does not offer them.
- `holdS`, `next` (a reorderable list of this card's phases: "the first rule that holds wins, in this order"), exactly
  one `initial` phase (no rule).
- A small flow line shows where the phase sits (predecessors → this → `next`), and an unreachable phase is a
  builder warning ("no phase leads to Recovering").
- The preview line is Instructor v2's own text for the rule ("when EtCO₂ > 45 and EtCO₂ rising and set minute
  ventilation unchanged and HR rising, held 20 s"), produced by the same function, `phaseRuleWords`
  (`card-read.ts:326`, used by `teach2/cue.ts:102` and the A rows), so the author reads what the instructor will.
- No judged rows: a recognition is a `communication` action (F-9). A pasted card with `judged` gets the validator's
  own refusal line naming the replacement.

### 5.4 The action editor (B4)

- `kind` decides the criteria block, as in the guide: `drug` → `drug`, `device` → `device`, `fluid` → `fluid`,
  `physical` → `physical`, `decision` → `effect`; `procedure`, `sample`, `communication` have none (matched by their own
  press or the `record` command).
- Drug criteria: identity by `id`, `cls` or `alternatives` (each with its dose), from the engine's `DRUGS` (65 rows) and
  its classes; dose (value, range, per kg), `cumulative.max`, route set and preferred route with each route's modelled
  state for that drug (`routeHonoured`, the validator's warning source), rate (`bolus`, `overS`, `infusion`).
- When: the window's anchor (every anchor of the guide's table: `start`, `phase:`, `action:`, `pulseLoss`, `rosc`, a
  truth `rule`, `each:action:`, a `display` rule, `first`), `withinS`, `notBeforeS`, `failAfterS`; `repeat` or
  `repeatWhile` (never both: the editor offers one); `precondition`.
- Violations: `contraindications` with `match` (kind, drug, class, route, dose), `inPhases`, `afterAction`, `when`,
  `harm: notModelled`.
- `give`: the commands a press sends, built with the Drug sheet's own form (so a press gives what a sheet would);
  a builder warning when the press would give something outside the action's own criteria ("the press gives 1 mg/kg;
  2–3 asked").
- `graded: false` (setup) and `preparation: true` (recorded, no verdict, no window) as two switches with the guide's
  words.
- A preview of the row as Instructor v2 draws it (title, subtitle, "due m:ss"), and the card's own grade examples
  computed by `grade()` on synthetic records (mock-up 3, "How it grades"): IV 2.5 mg/kg in the window met, IV 1 mg/kg a
  deviation, IM a violation with the row left open. In the product these lines are `grade()`'s own output; in the
  mock-up they were written for the page (its README says so).

### 5.5 The checks column

Three kinds, never mixed:
- **Refusals** (red): the validator's errors. While any stands, Run in place, Export and Submit wait. Each links to its
  field.
- **Warnings** (amber): the validator's warnings (route not modelled) and the builder's own: a number without `src`
  (F-10: "a placeholder, marked for the owner"), an unreachable phase, an action open in no reachable phase, a press that
  gives outside its criteria. Warnings never block a draft; the missing sources block a signature (§9.4).
- **Facts** (grey): the engine build the card was checked against, the last run in place (phases entered, times),
  the port check's result (§7.3).

## 6. Run it in place (B6)

Mock-up 4 (`04-run-in-place`). "Run in place" (enabled at 0 refusals) loads the draft into this computer's session as
a draft card (not in the library, not in "Recent", never on the wire as a library id) and shows Instructor v2 with the
builder's run panel beside it.

- **What fired, and why.** A log fed by the runner's own phase timeline and rule edges (`PhaseEntry`, `RuleEdge`, both
  already in the runner state): each phase entry with the rule that fired and, for each leaf, the value it read and
  its threshold; each action that opened, came due, was met or graded; each script entry. Values come from the samples
  the runner already keeps (the slope rings) and the engine's state at the edge, so nothing is recomputed in the page.
- **Jump the clock.** +2 and +5 min (today's), "To the next phase" (new: a fast-forward that stops at the first phase
  change or at 30 min, a stop condition in the host's fast-forward loop next to today's "stopped" reasons,
  `host-session.ts:836–869`), and "Back to a phase's start" (today's stage marks).
- **Apply edits.** The run does not change under the author's hands. "Apply my edits and restart" reloads the edited
  draft from 0; "Apply from this phase's mark" restores the mark of the current phase with the edited card (allowed only
  when the edit leaves the phase ids and the runner state's shape compatible; otherwise the button explains why and
  offers the restart).
- **Learners' devices.** A draft runs on the laptop. The room's phones follow only if the author opens the room, and
  then they see what they would see in class. The phone's Remote cannot load a draft (no draft id on the wire).
- **Layout.** Instructor v2 needs its narrow layout below about 1000 px (finding 5): B6 either collapses the builder to
  a strip while running or lays Instructor v2 out narrow, decided on screenshots at 1280, 1440 and 1920 px.

## 7. Editing the current cards, and the `/1` → `/2` port (B7)

### 7.1 Every card opens as a copy

"Open in builder" on any library card (mock-up 5) makes a copy: a new id (`<id>-copy`, editable), the original's id and
format kept in the draft's metadata (not in the card), and for a `/1` card, the converter's draft. A built-in card is
never edited in place in the app: the repository's copy changes only through a signed version (§9.5).

### 7.2 The converter: mechanical where the meaning is mechanical, flagged where it is not

The `/1` transition leaves and their `/2` form, following F8's step a (a faithful translation first, the owner's model
second):

| `/1` leaf | `/2` form | Mechanical? |
|---|---|---|
| `manual` (an instructor button) into state S | an action whose `give` is S's `onEnter`; S's other effects as `script` anchored on `action:<id>#1` (same stage group, O4) | yes |
| `event` (a learner act: drug, shock, ...) | an action matched by that event; the target state's `onEnter` as `script` on its taking | yes |
| `vital` (the measured value) | a phase rule on the TRUTH variable of the same name | the rule's rank changes (measured → truth): flagged, and the twin run measures the difference |
| `afterS` (time in a state) | none: a phase has no timer leaf | **no**: flagged; the author writes the truth rule the time stood for (the owner's principle: the time course comes from the mechanism), or a card-set `script` at a scenario time when the timer was the card imposing an event |
| `probability` / `else` | none | **no**: flagged; the author chooses the branch the card teaches or a seeded engine mechanism |
| `objectives` | actions (timed by their window) and outcomes | the objective's rule leaf decides; flagged when it reads a press |

Census of the sixteen cards (states, transitions, and the leaves by kind):

| Card | States | Transitions | manual | event | vital | afterS | probability | objectives |
|---|---|---|---|---|---|---|---|---|
| `acls-bradycardia-unstable` | 5 | 10 | 2 | 7 | 0 | 2 | 2 | 0 |
| `acls-pea-hypovolaemia` | 6 | 7 | 3 | 3 | 0 | 3 | 1 | 0 |
| `acls-vf-witnessed` | 5 | 10 | 5 | 4 | 1 | 3 | 2 | 0 |
| `depth-awareness` | 3 | 2 | 0 | 1 | 0 | 1 | 0 | 0 |
| `depth-light-anaesthesia` | 3 | 2 | 0 | 1 | 0 | 1 | 0 | 0 |
| `depth-opioid-apnoea` | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `nmb-mh-trigger` | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `nmb-residual-block` | 3 | 2 | 0 | 1 | 0 | 1 | 0 | 0 |
| `nmb-sux-burn` | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `or-induction-hypotension` | 6 | 7 | 1 | 5 | 1 | 1 | 0 | 0 |
| `svt-adenosine` | 5 | 5 | 1 | 2 | 0 | 2 | 1 | 0 |
| `showcase-anaphylaxis` | 4 | 3 | 2 | 1 | 0 | 1 | 0 | 3 |
| `showcase-bronchospasm` | 3 | 2 | 1 | 1 | 0 | 0 | 0 | 3 |
| `showcase-induction` | 13 | 22 | 17 | 0 | 6 | 1 | 0 | 5 |
| `showcase-induction-premed` | 7 | 9 | 7 | 0 | 0 | 3 | 0 | 4 |
| `showcase-tamponade` | 15 | 25 | 22 | 0 | 3 | 0 | 0 | 5 |

(Counted by leaf occurrence in each card's `when`; an `any`/`all` may hold several. The eleven built-ins' objectives
live in `scenario-meta.ts`, not in the card.) Four cards are mechanical as they stand (`depth-opioid-apnoea`,
`nmb-mh-trigger`, `nmb-sux-burn`, `showcase-bronchospasm`); `showcase-tamponade` needs only the rank of its three
`vital` rules checked; the other eleven need the author for their `afterS` or `probability` beats.

### 7.3 How a port proves its beats identical: the twin run

The F8 oracle (`scenario-format-v2-plan.md`, O1–O4), made general and run in CI for every port:

1. **Same presses.** The `/1` card is run unattended and with its run-sheet presses (or, for a card with no run sheet,
   one scripted path through every manual transition, recorded once on the port's parent commit), in the harness
   (`showcase/harness.ts` `runCard`), and the press times are recorded. The `/2` port is driven at the **same absolute
   times** through its action ids, through the driver as the panel does.
2. **O1 (i), the command stream.** The engine's received commands (type, payload, applied tick) of the two runs are
   diffed. Empty for every mechanical beat.
3. **O1 (i), the trace.** The 1 Hz engine trace of the two runs (state values, labs, signals) is diffed. The engine is
   deterministic with the card's seed, so a faithful port gives an empty diff, not a small one.
4. **O1 (ii), the phase-timing table.** Each `/2` phase entry against the `/1` state entry it replaces, every difference
   explained (a `vital` read on truth instead of the display, a `/1` hold counter reset at a hop). A difference is
   explained, never tuned away (no rule bent to match).
5. **O4.** A script entry anchored on a press fires in that press's stage group, tick for tick.
6. **The flagged beats** (`afterS`, `probability`, a rank change) are the only places the streams may differ. Each is
   listed in the port's PR with its measured shift, as "changed by design", and the signature (§9.4) covers that list:
   the verifier signs the differences, not a claim of identity.

The proof is a CI test (`ports.slow.test.ts`, one row per port in a manifest `apps/demo/src/app/showcase/ports.json`:
`/1` fixture, `/2` card, press path, the accepted beats), so it re-runs on every later engine change. The builder shows
the last result in its checks column ("Port check: command stream identical; trace identical; 2 beats changed by
design"), read from the manifest's last CI output, not computed in the page. The `/1` originals stay as test fixtures
(F7.5's frozen copies), never in the library.

Per card: about half a day (the owner's figure for row 51), more for the eleven with flagged beats. One card per pull
request (one piece of work per PR).

## 8. Saving in three layers (B2, B8, B10)

| Layer | Where | When | Survives | Shared with |
|---|---|---|---|---|
| 1. Autosave | this browser (IndexedDB through a wrapped store; localStorage's 5 MB and its throw in a private window are why not `store.ts` alone) | every change, debounced 300 ms; a version every 2 min of editing and at every Run, Export, Submit | a reload, a crash; NOT a cleared browser or another browser | nobody |
| 2. Kit store | the department laptop: the relay's state folder (`stateDir()/scenarios/`), one JSON file per card version | Ctrl+S, Run in place, and every 2 min while the kit runs on Node | a kit update (the folder is outside the kit), a browser reset; NOT the laptop's loss | everyone using that laptop's kit |
| 3. Central store | the owner's server (§9) | "Upload" (and automatically when online, if BQ5 says so) | the laptop's loss | every app that reaches the store |

- **Export and import as files** at every layer: a draft exports as its card JSON (`<id>.json`, the format a library
  card has, loadable by Instructor v2's open-a-file), and the kit store's whole folder exports as one archive. A file is
  always the way out when no store is reachable.
- **The kit store's rules.** The relay accepts writes only from this computer (the loopback address), never from a phone
  on the room network; reads are open to the room so another laptop window lists the drafts. It stores cards and
  version metadata only. When the kit runs without Node (the simulator launched through ruby, perl or python, the
  kit launchers' fallbacks when no Node.js is found), layer 2 is absent and the builder says so ("Kit store: not on this laptop's server;
  export a file").
- **Versions, not overwrites.** Each layer keeps versions; a save never replaces the last version silently. Conflicts
  (the same draft changed in two places) keep both and show both.

## 9. The store: the project's first hosted service (B9–B12)

### 9.1 The constraint that decides where it runs

The department is in Iran. Several American cloud and software services refuse Iranian traffic under sanctions: in this
very session two design services' servers answered from here with HTTP 451 "Unavailable For Legal Reasons". A store on
such a service could be unreachable from the department, or closed without notice. So the store is **self-hosted on a
virtual private server the owner chooses and controls**, chosen by one test: a browser on the department's network
reaches it, and the server itself reaches the GitHub API (for publication, §9.5). This plan names no provider. Before
choosing, the owner's administrator checks both directions from the department's network and from the server; the
choice and its date go into the store's guide. The kit works with no store at all (§9.8), so a period when the store is
unreachable costs central sharing, never teaching.

### 9.2 The software: a PocketBase-class single binary

Proposed: **PocketBase** (MIT licence): one binary, SQLite, e-mail and password accounts, file storage, rules on each
collection, server-side hooks in JavaScript that can call an HTTP API, an administrator's web console, and backups as
files. One process, one data folder, no separate database server, which a department can run and back up. What the
repository holds (`services/store/`): the collection definitions as migrations, the rules, the hooks, a test of the
hooks' logic, the deployment guide, the backup and restore steps, and the version of PocketBase it was tested with. The
owner's administrator runs it behind TLS on the chosen server. Alternatives of the same class are acceptable if the
administrator prefers one; the data model below does not depend on PocketBase.

Accounts (F-4): **e-mail and password on the store**, nothing from GitHub. Who may create an account is BQ4 (open
sign-up with the owner's approval, or invitation only). E-mail is used only to sign in; password reset by the
administrator unless an e-mail sender is configured (an outbound mail service is one more sanctioned dependency, BQ4).

### 9.3 The data model

| Collection | Fields | Rules |
|---|---|---|
| `authors` (accounts) | e-mail, password hash (the store's), `displayName` (optional, the author's choice, BQ7), `role`: `author` / `verifier` / `admin` | an author reads and edits only their own record; only an admin sets `role` |
| `cards` | `slug` (the card id), `title`, `owner` → authors, `status`: `draft` / `community` / `submitted` / `signed` / `merged` / `withdrawn`, `latest` → versions | anyone signed in lists `community`, `submitted`, `signed`, `merged`; the owner edits their own |
| `versions` | `card` → cards, `n` (1, 2, ...), `doc` (the card JSON as a file), `sha256` of its canonical JSON, `validatedWith` (app version and commit the author's validator ran on), `createdBy`, `created` | append-only: a version is never edited or deleted; a hook computes `sha256` on the server from the stored file |
| `signatures` | `version` → versions, `sha256` (copied, must match), `signer` → authors (role verifier), `assertion` (the text's version id), `created` | create only by a verifier, never on their own card unless BQ1 allows; never updated, never deleted |
| `publications` | `signature` → signatures, `branch`, `pr` (URL), `state`: `queued` / `pr-open` / `merged` / `failed`, `log` | written by the server's hook only |

"Community, unverified" in the library (mock-up 5) = cards whose latest version is shared (`community` or `submitted`)
and not signed. The app lists them with the tag, the version and the date, and two buttons: "Open in builder" (a copy)
and "Load" (to try it in the Instructor view; whether learners' phones may open one is BQ3).

### 9.4 The trust model and the signature

- **Who signs.** Verifiers: the owner and the people he names (BQ1). The administrator sets the role; the role is not
  self-service. An administrator is not a verifier by being an administrator.
- **What a signature asserts** (mock-up 6, a DRAFT text for the owner): "I read version N of this card whole, ran it in
  the builder, and I find its clinical content (the phases and their rules, the actions and their criteria, the
  violations, the sources) fit to teach from in our department on this engine, within the engine's stated known
  deviations. I sign this exact version (hash H)." It does NOT assert that the engine's physiology is right (that is the
  validation gate's job), and it does not make the card a clinical guideline.
- **What the server checks before it accepts a signature**: the signer's role is verifier; the version is the card's
  latest; the `sha256` given equals the stored version's; the version's `src` lines cover every number (the sources
  check run on the server from the same rule module the builder uses, B9); for a port, the twin run's accepted-beats
  list is attached. The server cannot run the TypeScript validator itself (PocketBase's hooks run an embedded
  JavaScript engine without the app's modules); **the validator of record is the repository's CI** on the publication's
  pull request (§9.5).
- **A card edited after signing** becomes version N+1, unverified, listed as "community" again with "signed version N
  ships in the kit" beside it. The signed version stays the one in the repository until N+1 is signed; nothing in the
  repository changes when an author edits.
- **Signing your own card** is refused unless BQ1 rules otherwise (two people per verified card).
- **Withdrawal.** A verifier may withdraw a signature's effect only by signing a later version or by the owner removing
  the card from the repository through a normal pull request; the signature record stays (history is kept).

### 9.5 From a signature to the kit

1. The `signatures` hook creates a `publications` row and, with **a bot token the owner owns, kept in the server's
   environment and never in the app or the repository**, writes the card to a branch `store/<slug>-v<n>` and opens a
   pull request: the card at `packages/controller/scenarios/signed/<slug>.json` and its signature file
   `<slug>.signature.json` (`slug`, `version`, `sha256`, `signedAt`, the signer's display line as BQ7 rules, the
   assertion text's id, the store's version id; never an e-mail address). The token is the narrowest GitHub offers: one
   repository, contents and pull requests (a fine-grained token or a GitHub App installation; the administrator's
   choice, in the guide).
2. CI runs as for any pull request; a new test (B12) checks that every card in `signed/` validates, that its canonical
   `sha256` equals its signature file's, and (for a port) that its twin run is in the manifest and green.
3. The owner merges, or the merge rule he sets later (BQ6). A red check is never merged past.
4. The library's glob gains `signed/*.json`; a signed card shows "Verified" with the signature line (mock-up 5). The next
   kit ships it. The store's `publications` row turns `merged` when the hook sees the pull request merged (polled; no
   webhook needs to reach the server).

Why a pull request and not a commit to `main`: the project's rules (no push to main; one piece of work per PR; a red
gate is never merged past) apply to the bot as to every executor. The owner's ruling ("signed scenarios enter the
GitHub repository") is met at the merge, which normally follows the green run.

### 9.6 Security in short

- The deployed app (GitHub Pages and the kit) contains the store's address only (a Settings field, the owner's address by
  default, BQ2) and no credential. A signed-in author's session token lives in that browser's storage, as any web
  sign-in does, and "Sign out" removes it.
- The store allows cross-origin requests from the app's own origins only (the Pages address and the kit's loopback
  addresses); TLS only; the administrator's console on a separate path with its own password and, where the software
  offers it, a second factor.
- Rate limits on sign-in and on uploads; a card file size limit (the largest library card today, `showcase-mh-v2.json`, is
  34 KB; a limit of 512 KB leaves room).
- Backups: the data folder copied daily off the server (the guide's script); a restore is tested once before the store
  is announced.

### 9.7 Privacy: no learner data, ever

- The store holds authors (e-mail, optional display line, role), cards and their versions, signatures and
  publications. It holds **no learner's name, no run, no debrief, no record, no mark, no room code, no device**. A card
  is a teaching case, not a patient: the builder's hint on the story and briefing fields says "no real patient's
  identifying details".
- An author's e-mail is never shown to other users, never written into a card, a signature file or the repository.
  What other users see of an author is BQ7.
- The kit store holds cards only, on the department's laptop.

### 9.8 The offline path

The kit works with no store: the bundled library (verified cards) and the builder's layers 1 and 2. When the store is
unreachable, the library's Community section says "Central store not reached; showing what this laptop has" with the
time of the last successful read, Upload queues the version locally (BQ5), and nothing else changes. A department with
no internet at all writes, runs and exports cards; a card reaches the central store when someone uploads its file from
any connected browser.

### 9.9 The relay later (row 42)

The same server can later run the classroom relay as a hosted service (row 42, "who hosts and pays"), behind the same
TLS. That needs the relay's own security items (an instructor key, rate limits, Origin checks: row 42's list) and is not
part of this plan.

## 10. Persian (B13)

The builder's chrome (labels, section titles, hints, the checks' wording, the save chips, the sign step) goes through
a table, as the Debrief's does: a new `docs/showcase/i18n/fa-app.json` in the shape of `fa-debrief.json` (groups,
strings, templates with placeholders), read by THE matcher (`i18n/fa-match.mjs`), every entry `reviewed: false` until
the owner reads it, the draft line under the switch while any printed entry is unread. The Persian is written with the
project's Persian rules (formal register; displayed tokens such as `EtCO₂`, `mg/kg`, phase ids and JSON paths stay as
written). What the table does NOT translate: the card's own text (the author writes it in one language; the briefing's
`textFa` stays the one Persian field the format has), the validator's paths, the engine's variable names. The validator's
English message after the path is matched by the table's templates where one exists, else printed in English and counted,
as the Debrief does.

## 11. The mock-ups

Six static pages in `docs/plans/scenario-builder/mockup/`, built by `make-mockups.py`, captured by `capture.sh` at
1440 × 900. They link the app's own stylesheets (`apps/demo/src/app/app.css`, and for page 4 `teach2/teach2.css`,
`state.css`, `action.css`); the builder's new classes (`sb-*`, `mock.css`) use the app's tokens only. Page 4's right
half is Instructor v2's DOM as the app drew it for the MH card. `README.txt` lists what is real and what is
illustrative; every page carries the "MOCK-UP · proposed, not built" tag.

**1. The builder's main screen**: the outline, the Header and story editor with an in-place refusal
(`/takeHome: must NOT have more than 4 items`), the checks with the refusals, the sources warning and the history.

![The builder's main screen](scenario-builder/mockup/01-builder-main.png)

**2. The phase editor**: Early signs of the MH card, its four leaves on truth, its hold, its `next` list with a planted
wrong id refused in place (`/phases/2/next/0: no phase "establshed"`), and the line Instructor v2 will draw.

![The phase editor](scenario-builder/mockup/02-phase-editor.png)

**3. The action editor**: dantrolene with its acceptance criteria (identity, dose and range, cumulative, the route set
with each route's modelled state, rate), its window and conditional repeat, the IM violation, the press's `give`, the
sources field, the row's preview and `grade()`'s examples.

![The action editor with acceptance criteria](scenario-builder/mockup/03-action-editor.png)

**4. Run in place**: the run panel (jump the clock, apply edits, "What fired, and why") beside Instructor v2 running the
draft. The dock's overlap at this width is finding 5, left visible on purpose.

![Run in place](scenario-builder/mockup/04-run-in-place.png)

**5. The library**: the demonstrations, Verified, a `/1` card not ported yet, Community (unverified) from the central
store, and On this laptop.

![The library with verified and community sections](scenario-builder/mockup/05-library.png)

**6. The sign step**: the version and its hash, the diff since the last version, the checks, the assertion to tick, and
what happens after.

![The sign step](scenario-builder/mockup/06-sign.png)

## 12. Pieces, hours, dependencies, merge order, CI load

Hours are estimates for one executor, gates included; none is a measurement.

| Piece | What | Depends on | Hours (est.) |
|---|---|---|---|
| B1 | `formOf`/`docOf`, lossless on all 20 library cards; path → field map; debounced validation | — | 8 |
| B2 | the builder route replacing the stub; Header, Patient, Briefing sections; layer 1 (IndexedDB, versions, restore); refusals in place; export and import of a card file | B1 | 14 |
| B3 | the phase editor (rule tree, `holdS`, `next`, flow line, preview through `phaseRuleWords`) | B2 | 12 |
| B4 | the action editor (kinds, drug criteria from `DRUGS`, routes with `routeHonoured`, windows, repeats, precondition, violations, `give` from the sheets' forms, `grade()` examples) | B2 | 16 |
| B5 | Outcomes, Script, Debrief hints, Handout questions (92-character count), Take-home | B2 | 6 |
| B6 | Run in place: draft load, run panel, "What fired, and why" from the runner's timeline and edges, "To the next phase" (host fast-forward stop condition), apply edits, the split layout at 1280/1440/1920 | B3, B4 | 16 |
| B7 | the `/1` → `/2` converter with its flags; the twin-run test and `ports.json`; the builder's port-check line | B4, B6 | 16 |
| B8 | the kit store: relay paths for cards (loopback writes), `stateDir()/scenarios/`, layer 2 in the builder, folder export | B2 | 10 |
| B9 | `services/store/`: PocketBase collections as migrations, rules, hooks (hash, append-only, signature checks, publication with the bot token from the environment, merge polling), the sources-check module shared with the builder, hook tests, the deployment, backup and restore guide | B5 (the sources rule) | 18 |
| B10 | the app's store client: Settings address, sign in and out, upload, the Community list, open as copy, conflicts, the offline queue | B2, B9 | 14 |
| B11 | the sign step (verifier only): diff against the last version, the checks, the assertion, sign, publication status | B10 | 8 |
| B12 | the signed library in the repository: `packages/controller/scenarios/signed/`, signature files, the glob, "Verified" in the library, the CI hash test | B9's file format | 6 |
| B13 | Persian: `fa-app.json` with the builder's strings, `reviewed: false`; the switch and the draft line in the builder | B6, B11 (strings settled) | 5, plus the owner's reading |
| B14 | docs (the authoring guide's "Using the builder", the store's administration guide, the privacy statement), the builder e2e (Chromium and WebKit) | all | 6 |
| **Total** | | | **155** |
| Ports | one PR per `/1` card, sixteen (§7.2), each with its twin run green and its changed beats listed | B7 | about 4 each, more for the eleven with flagged beats: 64 or more |

Pull requests (one piece of work each, in merge order):
1. **PR 1, B1 + B2**: the builder's foundation and layer 1 (22 h). Replaces the stub; finding 1 goes with it.
2. **PR 2, B3 + B4 + B5**: the editors (34 h). Could split into three PRs if review asks; they touch separate files.
3. **PR 3, B6**: run in place (16 h). After it, an author builds and runs a card in the kit with no store: **the
   critical path to a usable builder is PR 1 → PR 2 → PR 3, 72 h**.
4. **PR 4, B7**: the converter and the twin run (16 h). Then the sixteen port PRs, one card each, in any order, the four
   mechanical cards first.
5. **PR 5, B8**: the kit store (10 h). May go any time after PR 1.
6. **PR 6, B9 + B12**: the store's code and the signed library format (24 h). May start with PR 1 (it touches
   `services/store/` and one folder); B9's sources module merges after B5's rule exists.
7. **PR 7, B10 + B11**: the app's client and the sign step (22 h), after PR 6 and after the owner's administrator has
   a test instance running (BQ2), because its e2e signs in against a local PocketBase started by the test.
8. **PR 8, B13 + B14**: Persian and the docs (11 h), last.

CI load: every PR runs the whole `ci.yml` (it touches code), one run per head; PR 4 and every port PR add the
`test-slow` showcase group with the twin runs (about the length of today's MH table test per card). PR 7's e2e starts a
local store binary: the CI image needs the PocketBase binary pinned and checked by hash (a download in CI, the same
policy as Playwright's browsers). This docs PR runs only the `docs` job.

## 13. Questions for the owner

Each has a default this plan assumes until he rules.

- **BQ1. Who may sign?** The owner and the people he names, each given the verifier role by the administrator. May a
  verifier sign a card they wrote? Default: no, two people per verified card, the owner excepted until there are two
  verifiers. And the assertion text (§9.4): accept, or edit.
- **BQ2. Where does the server run, and who administers it?** A VPS the owner chooses, reachable from the department's
  network and able to reach GitHub (§9.1), administered by someone he names (deployment, TLS, backups, the bot token,
  roles). The app's default store address is that server's. Default: nothing deployed until he names both.
- **BQ3. May learners' phones open community cards?** A community card is unverified. Default: no. The instructor may
  load one on the laptop (with the "unverified" tag on the Instructor view's header), and the phones follow it as they
  follow any case, but a phone's Remote cannot pick one.
- **BQ4. Who may create an author account, and is e-mail sent?** Default: invitation only (the administrator creates the
  account; the author sets a password through a one-time link the administrator passes on), no outbound e-mail service
  (one more sanctioned dependency).
- **BQ5. Does the kit's local store sync to the central store automatically when online?** Default: no. Upload is a
  press per card; when the store is unreachable, the press queues the version and sends it when the store answers.
  Automatic sync would send every draft of every author on a shared laptop.
- **BQ6. Who merges a publication's pull request?** Default: the owner, as today. Later he may name a rule (for example:
  merge when CI is green and the signature file matches).
- **BQ7. Is an author's name shown on a card, and what is the privacy rule?** Default: the author chooses a display line
  ("a resident, Anaesthesia", or a name, or nothing); it shows on the community card and in the signature file; the
  e-mail never shows and never enters the repository. The signer's line likewise (a name, since a signature without a
  named signer means little: his call).
- **BQ8. The verified section's order and naming.** "Verified" with the category groups as today, or one list?
  Default: the category groups, each card tagged.
- **BQ9. A port's changed beats.** For the eleven cards with `afterS` or `probability` beats, who writes the truth rule
  that replaces the timer: the porting executor with sources, then the owner signs; or the owner writes it? Default:
  the executor proposes with sources, the owner signs (the mechanisms-first rule).
- **BQ10. Persian for the builder now or later?** Default: with PR 8, after the strings settle; the authors in the
  department may read English chrome until the owner has read the table.
- **BQ11. A drug concentration as a phase-rule variable** (finding 2): add it as an engine signal piece before the
  builder ships, or leave cards to use effects? Default: later, its own piece.
- **BQ12. The cards already in the repository.** Do the two `/2` demo cards and future ports count as verified when
  merged, or does each need a store signature too? Default: a card merged by the owner counts as verified, with a
  signature file written by the owner's own sign step once the store exists; the two demo cards first get `src` lines
  for their numbers (finding 3).
- **BQ13. Limits.** A card's size limit (default 512 KB), the number of versions kept per card (default all), the number
  of community cards per author (default no limit; the administrator can withdraw).
- **BQ14. The name in the app.** "Community, unverified" (the brief's words) or another phrase for the unverified
  section? Default: as written.

## 14. Risks

- **The store is the project's first service.** It has an uptime, backups, a bot token that can open pull requests,
  and accounts. If nobody administers it, it is worse than none. Mitigation: nothing is deployed before BQ2 names the
  administrator; the kit never depends on it.
- **Reachability can change.** A server reachable today may be blocked later from either side. Mitigation: the
  offline path (§9.8) and file export at every layer.
- **Ports that are not mechanical take the owner's time.** Eleven of sixteen need a truth rule in place of a timer or a
  die; each is a small clinical decision with a source. Mitigation: the four mechanical cards first; the rest one per
  PR with the owner's answer to BQ9.
- **A signature can be read as more than it says.** Mitigation: the assertion's words (§9.4), the known-deviations link
  on every verified card's details, and "Verified" meaning "read and run by a named verifier on this engine", nothing
  more.
