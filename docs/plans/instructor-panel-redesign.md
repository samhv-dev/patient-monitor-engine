# Instructor panel redesign (E127): design

*Status: design agreed with the clinical owner on 29 October 2026, from a walk through the mock-ups. Target: a later
release after the 3 November demo. Nothing here changes the demo build. Mock-ups: the "Instructor Panel Mock-ups"
canvas (boards Proposal v6, v9 paused, v9 phone, v11 sheet, Header controls v2), with copies of every board under
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

## 3. Layout (board Proposal v6)

Grid at 1440 × 900: a 56 px workflow rail on the left; a 48 px session bar; a 52 px stage strip; the main area in
two columns, STATE (6 parts) and ACTION (7 parts); a 64 px dock.

### 3.1 Session bar
Left: patient line (sex, age, weight), the MODELED tag, the card's title. Right, in this order:
- **The clock pill** is the pause / play control. Running: green frame, green play triangle, the word RUNNING, the
  simulated time in monospace. Paused: amber frame and fill, amber square, the word PAUSED, the time. The press
  toggles. No paused-duration is shown. Space toggles too (Esc closes a sheet first).
- **The speed box**: one box reading the current speed ("×4 ▾"). A press opens it sideways to ×1 ×2 ×4 ×8; a choice
  or a click elsewhere folds it back. A speed chosen while paused applies on resume.
- **Fast forward**: one button, double-triangle icon and the words "Fast forward ▾", opening sideways the same way
  to +1, +2, +5, +10 min. One press skips and the fan folds back. The phones catch up at the end of the skip (the
  existing follower behaviour).
- No Debrief button here (it moved to the dock).

### 3.2 Stage strip
The card's stages in order, hop states (the 2-second treatment states) folded into their stage. Past stages show
their entry time; the current one is highlighted and says how many steps are open; future stages are dashed, with
"auto" where a rule enters them; branches read "Recovery or Arrest". Clicking a past stage places a mark there;
clicking a future stage jumps (rewinds the patient and asks once). The strip is the only place for jumping; the
old "other stages" list is gone.

### 3.3 STATE (left)
Read-only.
1. **The cue box**: the stage name; time in stage; how it was entered ("by your button at 08:16" or "by its own
   rule: EtCO₂ above 45 for 20 s"); the stage's own line (what is running: ventilation, infusions); and the **Say
   line**, the stage's `notes` field in italics, which today's panel never shows.
2. **The learners' monitor** at a reduced size, rendered by the same renderer and skin the projector uses, with its
   own numerics and alarm bar. A "Swap ⤢" button exchanges it with the full-size monitor view. There are no separate
   vitals tiles.

### 3.4 ACTION (right)
One list. A row is one of three things, all the same pill: a key box at the left, title and subtitle, a right-hand
label.
- **A step**: a manual transition of the current stage, numbered in the card's order, key 1–9. The subtitle names
  the state it leads to and, when an objective rides on it, that objective's timer. Steps whose condition the card
  names (for example potassium above 5.5) stay in the list, faded, and pressable.
- **An automatic row ("A")**: a `vital` or `afterS` transition of the current stage, amber A in the key box, the
  rule in words, a progress bar under the text showing how near the rule is. Same look near or far; the bar says
  how near. Not pressable.
- **A judged objective**: an objective with no engine rule, numbered like a step, subtitle "you judge it"; pressing
  records it as met for the debrief; the patient does not change.

Then two collapsible rows: **Off the card** (anything a sheet can give that is not a card step: logged, the card
does not move) and **Finished steps · n** (folded by default; every green, red or fired-amber row moves here).
A foot line states the rule: no penalty comes from the panel.

### 3.5 Row states (boards v5, v6)
| State | Look | Pressable |
|---|---|---|
| Current, expected next | blue fill, blue key box | yes |
| Condition not met | faded (75 % opacity) | yes |
| Overdue (its timer burned) | yellow 2 px ring on the normal fill, number kept, "overdue m:ss" at right | yes |
| Taken / met | faint green fill, number kept, time at right | no (moves to Finished) |
| Failed (its stage has passed) | faint red fill, number kept, "failed hh:mm" | no (moves to Finished) |
| Automatic, pending | amber A, progress bar | no |
| Automatic, fired | faint amber fill, time at right | no (moves to Finished) |

Rules: a burned timer never locks a step; a late press does what an on-time press would, and the physiology having
moved on is the only consequence. A step is "failed" only when its stage has passed and the card no longer offers it.
The debrief records taken, met, overdue, out of order, failed and not done, each with the time and the order it was due.

### 3.6 Dock
Left: Tools (Drug, Airway, Defib · CPR, Vitals, Gas, Devices, Patient, Log), one open at a time, the open one lit.
A divider. Centre: the three **marks** (good, bad, discuss, as thumb-up, thumb-down and speech-bubble icons) and a
note field. A divider. Right: **Debrief**, with wider margins.

Marks replace bookmarks and flags: every mark saves the moment (returnable later in the session), carries its kind,
and sits on the debrief timeline. There is no plain bookmark.

## 4. Sheets (boards v8, v11, and the earlier "other sheets" board)

A sheet slides up from the dock over ACTION only; STATE stays in view. Every sheet has the same shape: a title row
(name, keyboard hint, close), a row of group tabs, a body that is read on the left and set on the right, and a
footer with one primary button that says what it does ("Set ventilator 24 × 600", "Hold SpO₂ at 88 for 2 min").
Letter keys open them (D, A, F, V, G); Esc or the same letter closes; a sheet reopens on its last item.

### 4.1 Drug sheet
- Tabs: MH kit, Vasoactive, Induction, Arrest, Fluids, All.
- Left: search; the card's open steps pinned at the top (marked "card step n" and "due" when a timer runs); the
  group's drugs; recent.
- Right: the chosen drug; dose per kg, total for the patient's weight, time given over; presets; a plain line on what
  the model will do, with the measured figure where one exists; then, centred, 80 % wide: **"Add to the cache for
  staged delivery ↓"**.
- Tray: **"Staged · n"**, the staged items with ✕ to remove, "delivered at one instant, one line in the log".
- Footer: bottom left, primary blue, **"Deliver the staged cache (n items)"**, grey and not clickable when n is 0;
  bottom right, primary blue, **"Give <drug> <dose> now"**. Keys: Enter gives now, S adds to the cache, D delivers.
- When a drug is also a card step, the sheet says so, and Give or Deliver moves the card as the step button would.

### 4.2 Staged delivery
The cache is shared across sheets (a drug, a fluid, a ventilator change can sit together). Deliver gives everything
at the same engine instant and writes one log line and one debrief entry naming each item. Nothing delivers by
itself; closing a sheet keeps the cache; the dock shows "Staged · n".

### 4.3 Other sheets
Airway (ventilator settings with the minute volume previewed before Set; bag by hand, disconnect, extubate), Vitals
(hold a value with a ramp and an end; HELD tag on the monitor and in the debrief), Defib · CPR (the strip, compressions
and rhythm check, energy, cycle timer, two-press shock; during CPR this sheet replaces ACTION until ROSC), Gas (send
a sample; the result returns after its delay), Devices, Patient, Log.

## 5. Paused (board v9 paused)
The clock pill turns amber (PAUSED); a banner under the strip says: timers frozen; a step pressed now is given at
the paused time and acts on resume; the room's monitor shows the same mark. Every countdown, the in-stage clock and
the A bars read "frozen". Speed and skips chosen while paused apply on resume.

## 6. Phone (board v9 phone)
The same page folded for 390 × 844: header with the clock pill, speed and fast-forward; the strip as segments; STATE
as the cue box and a compact three-trace monitor (tap for full size); ACTION rows at thumb size; Off the card and
Finished folded; two footer rows (tool chips; marks and Debrief). Same card data as the laptop, no second source.
This is the instructor's remote (E124 names the room setup); it is not the learners' follower.

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
- Whether "Finished steps" should be open by default on the phone.
- Row count beyond 9 steps in one stage (no card has this today; a second key row or scrolling is acceptable).

## 10. History
First proposals (boards Today, Elements, Concepts 1–3, Remote) and the owner's choice of Concept 2 on 28 October;
the owner's spec of 29 October (STATE/ACTION naming, combined list, A rows, clock pill, speed box); the rounds that
produced v2–v6 (row states, finished steps, marks), v7–v11 (the sheet, staging cache) and v9 (paused, phone).
