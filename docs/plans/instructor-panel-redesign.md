# Instructor panel redesign (E127): design

*Status: design agreed with the clinical owner on 29 October 2026, from a walk through the mock-ups. Nothing here
changes the 3 November demo build (rc.4). **Built** in PR #177 (merged to `main` on 29 October 2026, 8add8d4b), on the
rc.5 line, as an additional view: Instructor v2 at `#/teach2` ("Instructor v2" on the rail, code under
`apps/demo/src/app/teach2/`). Today's Instructor view is unchanged and stays the default. The plan is
`instructor-panel-v2-plan.md` beside this file, with the orchestrator's answers in `instructor-panel-v2-answers.md`
("answer n" below). Rulings made while it was built (the clinical owner's, and the orchestrator's on build details) overtook
some of the design; each place where it no longer holds carries a bracketed note with the ruling and its time (all 29
October 2026), and §7 records what was built.
Mock-ups: the "Instructor Panel Mock-ups" canvas (boards Proposal v6, v9 paused, v9 phone, v11 sheet, Header controls
v2; later Header A–G and Phone 1–9), with copies of every board under
`scratch/owner-review/instructor-ux/canvas-project/` (not tracked). Research behind the first proposals:
`research/instructor-panel-ux-research-2026-10-27.md` (workspace, not tracked).*

## 1. Intent

The instructor runs a scripted case from a laptop at the lectern, facing the room, with the learners' monitor on the
projector behind. Today's Instructor view lists every state of the card as a button (the MH card has 18 states and
29 manual buttons), shows the monitor small, and gives no sense of what the physiology is about to do on its own.
The redesign makes the panel answer three questions at a glance, "where am I, what is the patient doing, what do I do
next", and makes everything the instructor can press one list with one visual language.

## 2. Goals, non-goals, anti-goals

Goals
- One page, no scrolling at 1440 × 900 for a card at the fan-out moment (four open steps, two automatic rows).
- The instructor reads the patient from the laptop: the learners' monitor is on the panel at a reduced size, as the
  learners see it.
- Every pressable thing is a row in one list, with one pill shape and five visual states.
- The physiology's own next moves are visible before they happen.
- The debrief gets the time and order of every step, mark and judged objective; the panel itself never penalises.

Non-goals
- No change to the scenario format `pme-scenario/1`. The panel reads what the cards already carry: states,
  transitions with their `when` kinds, objectives with their rules, `notes`.
- No change to the physiology engine.
- No new learner-facing feature. The phones keep following the host.

Anti-goals (what would make this a failure even if it works)
- A panel that moves the case by itself where the card did not say so.
- A panel that hides a step the card allows because a condition is not yet met.
- Any penalty, lock or scoring applied by the panel rather than by the physiology and the debrief.

## 3. Layout (board Proposal v6; the session bar and STATE as the owner's final option G)

Grid at 1440 × 900: a 56 px workflow rail on the left; a 48 px session bar; a 52 px stage strip; the main area in
two columns, STATE (6 parts) and ACTION (7 parts); a 64 px dock. STATE and ACTION are told apart by their background
only: each is a lifted panel with no border.

### 3.1 Session bar
[Ruled 21:30: the final layout is option G (board Header G). It replaces the order below and moves Fast forward out of
the session bar into STATE (§3.3).] The app's top bar is not shown on this route; the session bar carries, left to
right: the patient line (sex, age, weight), the MODELED tag (with the number of held values, "MODELED, 2 held"), the
card's title, a flexible gap, the clock pill and the speed box, a divider, then the top bar's Sound switch and Room
code with the phone count.
- **The clock pill** is the pause / play control. Running: green frame, green play triangle, the word RUNNING, the
  simulated time in monospace. Paused: amber frame and fill, amber square, the word PAUSED, the time. The press
  toggles. No paused-duration is shown. Space toggles too (Esc closes a sheet first). While paused, the pill's tooltip
  says that a step pressed now is given at the paused time and acts on resume.
- **The speed box**: one box reading the current speed ("×4 ▾"). A press opens it sideways to ×1 ×2 ×4 ×8; a choice
  or a click elsewhere folds it back. A speed chosen while paused is sent at once, as today's speed buttons send it
  (answer 9).
- **Fast forward**: not in the session bar (option G). It is a box in STATE, bordered like the cue box: its title
  with the double-triangle icon, a divider, then two wide buttons "+2 min" and "+5 min", each with the double-triangle
  glyph before its text. A press skips at once (today's `time jump` of 120 or 300 s); both buttons are disabled while
  paused and while a skip runs, and nothing is queued (answer 9). The phones catch up at the end of the skip (the
  existing follower behaviour).
- No Debrief button here (it moved to the dock).

### 3.2 Stage strip
The card's stages in order, hop states (the 2-second treatment states) folded into their stage. Past stages show
their entry time; the current one is highlighted and says how many steps are open; future stages are dashed, with
"auto" where a rule enters them; branches read "Recovery or Arrest". [Ruled 18:40:] Exactly five chips are in view:
the two stages before the current one, the current one and the next two, the future ones ordered from the current
stage (at either end of the card the window slides to keep five). Each chip shows the stage's name whole, never cut:
the card label up to its first ':', ';', ',' or ' (' (taken one part further where two stages would read the same);
the full label is the chip's tooltip and the cue box's stage line. The other stages fold behind an arrow at each end
("‹ 3 earlier", "4 later ›"); an arrow pages the window that way, and "back to now" appears once the window has moved
and recentres it on the current stage.

Clicks [ruled 11:00; the first design placed a mark on a past stage and rewound the patient on a future one]: a past
stage opens a small card with its entry time and "Return to the start of <stage>"; that button, behind one confirm
("Return to the start of <stage>?"), restores the hidden stage mark placed when the stage was entered, and the clock
goes back with it. A future stage sends today's `goto` behind today's jump confirm (asked once): the case moves on,
nothing is rewound. Stage marks are opt-in in the controller (the driver's `stageMarks` option or `markStages(true)`);
the view turns them on on the host when it is shown, so a stage entered before that has no mark and its Return button
is disabled. Stage marks never appear in the marks list. The strip is the only place for jumping; the old "other
stages" list is gone.

### 3.3 STATE (left)
Read-only, in this order (option G): the column label, the cue box, the Fast forward box (§3.1), the learners'
monitor, the alarm line.
1. **The cue box**: the stage name; time in stage; how it was entered ("entered by your button at 08:16", "entered by
   its rule at …" with the rule in words, "entered by a jump at …"; on a follower, "entered at …"); the stage's own
   line (the state's label as the card writes it, answer 21); the **Say line**, the stage's `notes` field in italics,
   which today's panel never shows; and, when values are held, a Held line ("Held: SpO₂ 88 (2 min)").
2. **The learners' monitor** at a reduced size, rendered by the same renderer and skin the projector uses, with its
   own numerics and alarm bar (581 × 385 px at 1440 × 900 in the #177 fit test). There are no separate vitals tiles.
   A "Swap ⤢" control, at the right of the cue box's head, opens the full-size Monitor view. [Ruled 18:30, option A:
   Swap goes to the Monitor view; the in-place swap, the monitor and ACTION trading columns with the keys still live,
   is roadmap E139.]
3. **The alarm line**: the alarm count and the words of the sounding alarms, amber while one sounds; a press opens the
   alarm list (the Devices sheet). It replaces the top bar's alarm count on this route.

### 3.4 ACTION (right)
One list, in the card's order (the transitions' array order): the steps, the judged objectives numbered on from them,
then the automatic rows. A row is one of three things, all the same pill: a key box at the left, title and subtitle, a
right-hand label.
- **A step**: a manual transition of the current stage, numbered in the card's order, key 1–9. A mixed `any` / `all`
  transition with a manual part is a step too, with the subtitle "or by itself when <rule>" (`any`) or "only when
  <rule>" (`all`) (answer 4). The subtitle names the state it leads to and, when an objective rides on it, that
  objective's timer. Steps whose condition the card names (for example potassium above 5.5) stay in the list, faded,
  and pressable. A step is linked to an objective when the objective's event is `state:<to>` of the step, or
  `drug:<id>` for a drug in `<to>`'s `onEnter`; it is "condition not met" only when a linked objective's `after` is a
  `value:` rule not yet true; a step with no linked objective is "ready" (answer 6). A follower, which cannot see
  those values, never fades a step.
- **An automatic row ("A")**: a transition of the current stage with no manual part (`vital`, `afterS`, and `event` as
  answer 5 ruled), amber A in the key box, the rule in words, a progress bar under the text showing how near the rule
  is. Same look near or far; the bar says how near: the value against the threshold fills the first 70 % of the bar,
  the rule's hold the rest (one bar that only grows; the hold read from the host's runner). Not pressable.
- **A judged objective**: an objective with no engine rule, numbered like a step, subtitle "you judge it"; pressing
  records it as met for the debrief; the patient does not change.

Then two collapsible rows: **Off the card · n** (the off-card actions taken in this stage, read from the log: anything
a sheet gave that is not a card step; the card does not move) and **Finished steps · n** (folded by default). Finished
holds the taken, failed and fired rows of the stages passed, the fired A rows and the judged objectives met. [Ruled
14:10, on the build:] a step taken that the card still offers (the treatment fan-out loops back into its stage) stays in the list,
green and pressable. [Ruled 13:00:] an untaken step that no objective asks for (an alternative not chosen) is never
"failed": once its stage has passed it is dropped, from ACTION and from the Debrief's steps table alike. A foot line
states the rule: no penalty comes from the panel.

### 3.5 Row states (boards v5, v6)
| State | Look | Pressable |
|---|---|---|
| Current, expected next | blue fill, blue key box | yes |
| Condition not met | faded (75 % opacity) | yes |
| Overdue (its timer burned) | yellow 2 px ring on the normal fill, number kept, "overdue m:ss" at right | yes |
| Taken / met | faint green fill, number kept, time at right | a step the card still offers: yes, it stays in the list; otherwise no (moves to Finished) |
| Failed (its stage has passed) | faint red fill, number kept, "failed hh:mm" | no (moves to Finished) |
| Automatic, pending | amber A, progress bar | no |
| Automatic, fired | faint amber fill, time at right | no (moves to Finished) |

Rules: a burned timer never locks a step; a late press does what an on-time press would, and the physiology having
moved on is the only consequence. No step or judged row is ever disabled. A step is "failed" only when an objective asks
for it and the card can no longer reach the state it leads to [ruled 13:00, replacing "when its stage has passed and
the card no longer offers it"]: an objective linked to it (§3.4), whose rule asks for an event (`eventWithin`,
`occurred`, `heldThen`) and is not met, whose anchor happened before the stage was left, and whose event did not
happen another way. "Taken" is this exact transition fired by a press in the current stage visit; "out of order" is
taken after a step later in the card's order was taken in the same visit. ACTION and the Debrief's steps table use the
same reading (`card-read.ts`), so they never disagree. The debrief records taken, met, overdue, out of order, failed
and not done, each with the time and the order it was due.

### 3.6 Dock
Left: Tools (Drug, Airway, Defib · CPR, Vitals, Devices, Patient, Log), one open at a time, the open one lit, then
"Staged · n". [Gas is not built (answer 14).] A divider. Centre: the three **marks** (good, bad, discuss, as thumb-up,
thumb-down and speech-bubble icons) and a note field. A divider. Right: **Debrief**, with wider margins.

Marks replace bookmarks and flags: every mark saves the moment (returnable later in the session, from the Log sheet's
marks list), carries its kind, and sits on the debrief timeline. There is no plain bookmark. A mark takes the note
field's text as its note and clears the field; Enter in the field writes a plain note.

## 4. Sheets (boards v8, v11, and the earlier "other sheets" board)

A sheet slides up from the dock over ACTION only; STATE stays in view. Every sheet has the same shape: a title row
(name, keyboard hint, close), a row of group tabs, a body that is read on the left and set on the right, and a footer
with one primary button that says what it does ("Set ventilator 24 × 600", "Hold SpO₂ at 88 for 2 min"). Letter keys
open them (D, A, F, V; G was for the Gas sheet, which is not built); Esc or the same letter closes; a sheet reopens on
its last item. As built, the sheets other than Drug mount today's tab bodies unchanged inside the sheet frame (answer
14).

### 4.1 Drug sheet
- Tabs: MH kit, Vasoactive, Induction, Arrest, Fluids, All.
- Left: search; the card's open steps pinned at the top (marked "card step n" and "due" when a timer runs); the
  group's drugs; the running infusions; recent.
- Right: the chosen drug; dose per kg, total for the patient's weight, time given over; presets; a plain line on what
  the model will do, with the measured figure where one exists; then, centred, 80 % wide: **"Add to the cache for
  staged delivery ↓"**.
- Tray: **"Staged · n"**, the staged items with ✕ to remove, "delivered at one instant, one line in the log".
- Footer: bottom left, primary blue, **"Deliver the staged cache (n items)"**, grey and not clickable when n is 0;
  bottom right, primary blue, **"Give <drug> <dose> now"**. Keys, while a sheet is open: Enter gives now, S adds to
  the cache. [Answer 16: D opens and closes the Drug sheet, so Deliver has no key; it is pressed with the button.]
- When a drug is also a card step, the sheet says so, and Give moves the card as the step button would. [INTERIM until
  the scenario format `pme-scenario/2` lands (ruled 17:00; E135): at the card's dose one Give presses the card's step;
  at a different dose two buttons replace it, "Give the card's step (<card dose>)", which presses the step, and "Give
  <dose> off the card", today's bolus, which does not move the card; Enter then gives nothing. The rule is the one
  function `pinnedGiveRule` in `teach2/drug-sheet.ts`.] [Ruled 18:30: card steps stay out of the staged cache until
  the format change; "Add to the cache" is disabled for a pinned card step, with the note "card steps are given from
  ACTION".]

### 4.2 Staged delivery
The cache is shared across sheets (a drug, a fluid, a ventilator change can sit together). Deliver gives everything at
the same engine instant and writes one log line and one debrief timeline line naming each item (the record keeps one
row per item, so the debrief's rules still see each drug). Nothing delivers by itself; closing a sheet keeps the
cache; the dock shows "Staged · n". Card steps never enter it (§4.1). An onset ramp for delivered items is not built.

### 4.3 Other sheets
Airway (ventilator settings with the minute volume previewed before Set; bag by hand, disconnect, extubate), Vitals
(hold a value with a ramp and an end), Defib · CPR (the strip, compressions and rhythm check, energy, cycle timer,
two-press shock), Devices, Patient, Log (with the marks list and "Return here"). [Ruled 18:30: the Defib · CPR sheet
does not replace ACTION during CPR; it opens like any other sheet and ACTION stays. An arrest-phase sheet, drawing the
arrest phase's actions inside the sheet, is a later increment built with the new card format (roadmap E140, with
E135).] [Answer 14: a held value shows in STATE only (the cue box's Held line, the session bar's "MODELED, n held"); a
HELD tag on the learners' monitor is out of scope.] Gas (send a sample; the result returns after its delay) is not
built.

## 5. Paused (board v9 paused)
The clock pill turns amber (PAUSED) and the learners' monitor carries its PAUSED mark. [Option G, ruled 21:30: there
is no paused banner under the strip; the rule it carried ("timers frozen; a step pressed now is given at the paused
time and acts on resume") is the pill's tooltip.] The in-stage clock reads "frozen", and so do the A rows' right-hand
labels; the step timers stop with the simulated clock. A speed chosen while paused is sent at once (§3.1); Fast
forward is disabled while paused and nothing is queued.

## 6. Phone (board v9 phone; now the Phone 9 board)
[Superseded by the phone walk-through of 29–30 October, boards Phone 1 to Phone 9; the latest is Phone 9. Not built:
the phone is out of the rc.5 scope.] The first design was the same page folded for 390 × 844. The design now is the
Phone 9 board, at 390 × 844, which opens on ACTION:
- Header in two lines: the patient band (sex, age, weight, MODELED, the card's title); under it the speed box, a
  **status chip** (the host's acknowledgement of the last press, PAUSED with its rule, a mark's feedback) and the
  Room code. Sound is not on the phone.
- The stage strip as a full-width band of three cells: past (with its entry time), now (time in stage, open steps)
  and next ("auto" or "by you"); the Stages tool opens the whole list for returns and jumps.
- A pinned STATE summary: the stage name and time in it, the three vitals the card names for the stage (on the MH
  card: EtCO₂, ART, SpO₂), one ECG strip (lead II, HR and the rhythm name) in place of a tile grid, and a lab line
  that shows only critical values ("Gas 08:12 · nothing critical" otherwise). No monitor. The rest of STATE is one
  swipe up.
- ACTION rows at thumb size, with Off the card and Finished folded.
- Above the tools, the marks on the left and the pause pill on the right; then the tools (with Stages) and Debrief.

Open points on Phone 9 for the owner: the critical thresholds as a sourced table that a card may tighten; "no gas sent
yet" as a third state of the lab line; whether a value that was critical on the previous gas shows once struck through
or vanishes. Same card data as the laptop, no second source. This is the instructor's remote (E124 names the room
setup); it is not the learners' follower. It needs an instructor peer role, bound to the instructor PIN, that the
relay and the host accept commands from: today a phone joins as a viewer and is refused every command (roadmap E124,
extension). The mock-ups are not tracked (copies in `scratch/owner-review/instructor-ux/canvas-project/`).

## 7. What the engine and the data need (for the planner)
- **Reading the card**: steps = manual transitions of the current state; A rows = `vital` / `afterS` transitions;
  the progress of an A row = the measured value against the rule's threshold and hold; judged objectives =
  objectives whose rule the engine cannot evaluate. All exist in `pme-scenario/1`.
- **Row classification**: overdue = an `eventWithin` objective whose window passed without its event; failed = a
  step whose source state is no longer current and not reachable; met/taken = the event occurred. All derivable
  from the existing debrief record.
- **Marks**: a saved engine snapshot per mark (the bookmark mechanism already exists; the kind is new metadata).
- **Staged delivery**: a batch command applied at one engine instant, logged as one entry; needs a small controller
  addition.
- **Monitor at reduced size**: the renderer already draws the monitor at the Instructor view's pane size; this is a
  layout change plus the Swap.
- **Debrief**: new fields for order and timing of steps, marks with kinds, judged objectives; one new page section at
  most, within the page bound the debrief tests enforce.

**As built (PR #177).** No change to the engine, the renderer, the skins, the cards or today's Instructor view.
- Card reading: one pure module, `apps/demo/src/app/card-read.ts`, read by ACTION and the Debrief alike; `event`
  transitions are A rows too, and "failed" is the refined reading of §3.5.
- `@pme/controller`, three additions and the stage marks:
  - **marks with kinds**: the scenario `bookmark` command takes `kind` (`MarkKind`: `good`, `bad`, `discuss`, and
    `stage` for the driver's own marks) and `note`; kind and note survive in the applied command and the late-join
    replay; `restoreBookmark` is unchanged;
  - **the batch command**: `CommandBase.batch` (`{ id, n }`) and `StageBuffer.commit(send, { batch: true })`; the host
    applies the items of one batch on one tick, and `ControllerSession` writes one log line per batch naming each item
    and any refusal. A card step's trigger inside a batch would apply at once and its `onEnter` three ticks later in
    its own group, which is why card steps stay out of the cache (§4.1);
  - **the hold accessor**: `ScenarioDriver.vitalHolds()`, host side and read-only, the runner's own hold progress for
    each `vital` rule of the current state (the A rows' bar);
  - **stage marks**: `ScenarioDriver.stageMarks()`, a hidden mark of kind `stage` at each stage entry, opt-in
    (`stageMarks` option or `markStages(true)`, default off), one per entry, a snapshot failure caught, pruned on
    restore.
- Monitor: the shell's one monitor stage placed in STATE by the CSS grid; Swap is a link to `#/monitor`.
- Debrief: a "Steps on the card" section (each step's due order, time taken, order taken, status); the marks' kinds;
  one timeline line per staged delivery; the export stays `pme-debrief/2` with additive keys (`steps`, `judged`,
  `marks`; on the rows `tr`, `by`, `markKind`, `note`, `batch`).

## 8. Acceptance (for the plan's gate)
- At the MH card's second-dose moment and at the haemorrhage card's PEA moment, the panel fits 1440 × 900 without
  scrolling, and every open step of the stage is a row.
- Pressing a numbered row does exactly what today's state button does (same engine command, same record).
- No row is hidden for an unmet condition; no row applies a penalty.
- A run of either demo card through the new panel yields the same course and the same debrief verdicts as through
  today's panel (the showcase tests), plus the new order/timing fields.
- Keyboard: 1–9 rows, letters for sheets, Space pause, Esc close.

## 9. Open questions (none block the plan)
- The Defib · CPR sheet replacing ACTION during CPR: confirm against the haemorrhage card's arrest sequence.
  **Ruled 18:30: no.** ACTION stays during CPR; the arrest-phase sheet is a later increment with the new card format
  (§4.3).
- Whether "Finished steps" should be open by default on the phone. **Ruled in the phone walk-through: folded by
  default**, as on the laptop. (The Phone 7 to 9 boards draw it open only to show a step just given.)
- Row count beyond 9 steps in one stage (no card has this today; a second key row or scrolling is acceptable).
  **Not ruled; still open.** Instructor v2 gives keys to rows 1–9 only; a tenth row would be pressable by click.

## 10. History
First proposals (boards Today, Elements, Concepts 1–3, Remote) and the owner's choice of Concept 2 on 28 October;
the owner's spec of 29 October (STATE/ACTION naming, combined list, A rows, clock pill, speed box); the rounds that
produced v2–v6 (row states, finished steps, marks), v7–v11 (the sheet, staging cache) and v9 (paused, phone). Then,
during the build on 29 October: the rulings on the strip clicks (11:00), "failed" (13:00), the dose rule and the card
format `pme-scenario/2` (17:00), the cache, CPR and Swap (18:30), the five-chip strip (18:40), and the header options
A to G with G final (21:30); and the phone boards Phone 1 to Phone 9 (29–30 October). Built in PR #177.
