# Authoring scenarios (`pme-scenario/1` and `pme-scenario/2`)

A scenario is a JSON document: a patient, a device skin, and a state machine whose states run commands when entered
and whose transitions fire on time, vitals, learner actions, sensors or instructor buttons (brief §7.4). The JSON
Schema is `packages/controller/scenarios/pme-scenario-1.schema.json`; `validateScenario(doc)` from
`@pme/controller/scenario` checks a document (schema, then references between states) and returns
`{ ok, errors, warnings }`. The built-in scenarios in `packages/controller/scenarios/` are worked examples. A card
in phases and graded actions is a `pme-scenario/2` document: see
[Authoring a `pme-scenario/2` card](#authoring-a-pme-scenario2-card) at the end.

## The document

| Field | Meaning |
|---|---|
| `schema` | always `"pme-scenario/1"` |
| `id`, `title`, `notes` | identifier (`[A-Za-z][A-Za-z0-9_.-]*`), title, instructor notes |
| `category`, `story`, `durationMin` | the library group (e.g. `ACLS`, `Induction`), the learner-facing case text shown before the start, the expected run time in minutes |
| `briefing` | optional, the learner-facing **Case briefing**: `{ "text", "estimatedMinutes", "durationS", "lang" }`. When the card loads, every learner screen (the Monitor view, a second-screen learner monitor, every phone following) shows it over the running monitor for `durationS` seconds (default 60, at most 600), then fades into the monitor; a tap or click ends it on the host's screen and a press-and-hold on a phone's (a tap does nothing there), and the instructor's "End briefing" (today's Instructor view, v2's stage strip) ends it everywhere. A phone that joins while it runs shows the remainder. `text` is required: paragraphs separated by blank lines (the last of several is set in italics, for what to do); `estimatedMinutes` adds "Estimated scenario time about N minutes"; `lang` is `"en"` (default) or `"fa"` (right to left, Persian chrome and digits, in the bundled Vazirmatn; the monitor's own labels never change). `textFa` (optional, at most 4000 characters) is the Persian of an English `text` as the clinical owner has read it: when the host is set to Persian (the Debrief page's language switch, per browser), the card's briefing is sent in Persian with it; a card without `textFa` shows its English in either setting, and nothing is translated at run time. Write it for the learner: who they are, the patient, what has happened, what is connected, what to do (watch and say). It is not `notes` or `story`, and it never names the diagnosis. Not shown again by the load that restores a case after the instructor's page reloads |
| `objectives` | learning objectives, one per entry: a string, or `{ "text", "rule", "debrief" }` where the rule (`eventWithin`, `occurred`, `never`, …) lets the Debrief report mark it ✓ Observed or ✗ Not observed, and the optional `debrief` says how the report uses it: `"recognition"` (a rule-less objective the instructor ticks in the Scenario tab when the cues are named; its tick is the time to recognition) or `"discuss"` (a structural lesson: not met, it prints ◆ Discuss instead of ✗ Not observed). An objective with neither a rule nor a tick prints – Not assessable |
| `takeHome` | optional, up to three non-empty strings: the take-home lines the Debrief's learner handout prints, as written. Write only reviewed words (they are clinical teaching points); without them the handout prints blank lines to write on |
| `seed` | uint32; the same seed and the same learner actions replay the same run |
| `mode` | `"manual"` (targets and ramps you script) or `"modeled"` (the physiology responds by itself) |
| `patient` | `ageY`, `sex`, `weightKg`, `heightCm`, `ageBand`, `baseline` (starting values of state variables: `hr`, `sbp`, `dbp`, `spo2`, `rr`, `etco2`, `tempCore`, …), `rhythm` (`{ "id": "sinus" }`), `sensors` (`ecg`, `spo2`, `nibp`, `abp`, `cvp`, `pap`, `co2`, `temp`: `"on"`, `"off"`, …), `neuro`, `blood`, `endo`, and `profile` (below) |
| `device` | `skin` (a skin or preset id) and `layout` |
| `initialState`, `states` | the state machine |
| `bookmarks` | named snapshots the instructor can jump to |

### Patient profile (`patient.profile`)

Chronic conditions and lung pathology are fixed when the engine is created and act in MODELED mode:

```jsonc
"profile": {
  "conditions": [ { "id": "as", "grade": "severe" }, { "id": "cad", "grade": "stable" } ],
  "lungConditions": [ { "id": "copd", "severity": 0.6 } ]
}
```

`conditions` ids: `hfref`, `hfpef`, `htn`, `as`, `ar`, `mr`, `ms`, `tr`, `cad`, `betaBlocked`, `rvFailure`, `ph`,
`tbi`, `hepaticFailure`, `aki` (valves and CAD take a `grade`, the others a `severity` 0–1). `lungConditions` ids are
the lung-pathology catalogue (`ards`, `copd`, `asthma`, `pneumonia`, `ptxTension`, `pregnancy`, …; full list in the
schema) with a `severity` 0–1 and, for one-sided conditions, `side`. Acute events — tamponade, massive PE, tension
pneumothorax, sepsis, anaphylaxis, a haemorrhage — are not profile: send them as `applyEvent` commands in a state.

## States and commands

Each state has an `id`, a `label`, optional `notes`, `onEnter`/`onExit` command lists and `transitions`. Commands are
the engine's (`setRhythm`, `setTarget` with a `ramp`, `pin`/`release`, `setFactor`, `setMode`, `setModifiers`,
`applyEvent` with an event `kind` — `drug`, `fluid`, `bleed`, `airway`, `airwayDevice`, `ventilation`, `preoxygenate`,
`vaporiser`, `cpr`, `defib`, `pacer`, `line`, `surgical`, `stimulus`, `condition`, `neuroProfile` —, `attachSensor`,
`device`). `$comment` is allowed on the document, states, transitions and commands and is
never interpreted.

In **MANUAL** mode you script the numbers: a bleed is `setTarget` on `sbp`/`dbp`/`hr` with ramps. In **MODELED** mode
you apply the cause (`applyEvent` `bleed`, a `drug`, a `condition`) and the physiology produces the numbers — check the
[known deviations](known-deviations.md) before relying on a specific value.

## Transitions

`when` is one trigger or a combination: `{ "afterS": 60 }` (time in the state), `{ "atScenarioS": 300 }`,
`{ "vital": { "var": "spo2", "op": "<", "value": 90, "forS": 10 } }` (on the *measured* value),
`{ "event": { "kind": "drug", "drugId": "atropine" } }` (a learner action; filters such as `minJ`, `minDose`),
`{ "sensor": { "sensor": "spo2", "state": "off" } }`, `{ "manual": { "label": "Induce" } }` (an instructor button),
and `{ "all": [ … ] }` / `{ "any": [ … ] }`. `probability` with an `else` target rolls on the scenario's own random
stream, so a seeded run replays exactly.

## A complete example

<!-- example: pme-scenario/1 -->
```json
{
  "schema": "pme-scenario/1",
  "id": "guide-bradycardia",
  "title": "Guide example: bradycardia with hypotension in PACU, treated with atropine",
  "notes": "62-year-old woman in PACU after a knee arthroscopy. Sinus bradycardia with hypotension at 1 min; atropine restores the rate.",
  "seed": 11,
  "mode": "manual",
  "patient": {
    "ageY": 62, "sex": "F", "weightKg": 70, "heightCm": 165, "ageBand": "adult",
    "baseline": { "hr": 72, "sbp": 124, "dbp": 76, "spo2": 97, "rr": 14 },
    "rhythm": { "id": "sinus" },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on" }
  },
  "device": { "skin": "saadat-like" },
  "initialState": "stable",
  "states": [
    {
      "id": "stable", "label": "Stable",
      "onEnter": [ { "type": "device", "action": { "device": "nibp", "action": "auto", "intervalMin": 3 } } ],
      "transitions": [ { "id": "t-brady", "to": "brady", "when": { "afterS": 60 } } ]
    },
    {
      "id": "brady", "label": "Sinus bradycardia, hypotension",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinusBrady", "opts": { "rateBpm": 38 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "sbp", "value": 82, "ramp": { "durationS": 45, "curve": "sigmoid" } },
        { "type": "setTarget", "variable": "dbp", "value": 48, "ramp": { "durationS": 45, "curve": "sigmoid" } }
      ],
      "transitions": [
        { "id": "t-atropine", "label": "Atropine given", "to": "recovering", "when": { "event": { "kind": "drug", "drugId": "atropine" } } },
        { "id": "t-worse", "label": "HR < 35 for 30 s", "to": "worse", "when": { "vital": { "var": "hr", "op": "<", "value": 35, "forS": 30 } } }
      ]
    },
    {
      "id": "worse", "label": "Worsening", "notes": "Instructor: prompt for atropine or pacing.",
      "onEnter": [ { "type": "setRhythm", "rhythm": "sinusBrady", "opts": { "rateBpm": 32 }, "when": "nextBeat" } ],
      "transitions": [ { "id": "t-atropine2", "to": "recovering", "when": { "event": { "kind": "drug", "drugId": "atropine" } } } ]
    },
    {
      "id": "recovering", "label": "Recovering after atropine",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinus", "opts": { "rateBpm": 88 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "sbp", "value": 118, "ramp": { "durationS": 60, "curve": "exp" } },
        { "type": "setTarget", "variable": "dbp", "value": 70, "ramp": { "durationS": 60, "curve": "exp" } }
      ]
    }
  ]
}
```

## Running a scenario

In the clinical app, the Scenarios page's library and the Instructor view's case list load the built-in scenarios (the developer page `dev/scenario-runner.html` loads one into the controller's own developer panel). In code, `ScenarioDriver` /
`ScenarioRunner` from `@pme/controller/scenario` run a validated document against a monitor handle or a headless
engine; the run log (`runLog`, `replayRunLog`) replays a session exactly.

### Running your card

In Instructor v2 (`#/teach2`) with no case loaded, **Open a card file…** under the three cards reads one JSON file
and checks it with `validateScenario` (a `pme-scenario/2` card, or a `/1` card). If the check fails, the pane lists
the validator's errors, one per line with the JSON path of each, and keeps nothing. A card whose `id` is a built-in
card's is refused: give your card an id of its own. A card that passes is kept in this browser's library, under
**Imported** at the end of the Scenario library's case list, and the pane offers to start it. It runs as a built-in
card does (phases, actions, the Debrief). Opening a file with the same `id` again
replaces the earlier copy; **Remove** takes it out. The card lives in this browser's storage only: it is not sent to
the learners' phones (they see the running case as always) and another computer does not have it.

The debriefs **Finish the case** saves are kept in this browser too, in its archive (the Debrief page's Archive
section), until you clear it there. Each holds the whole run record, one sample a second (about 10 kB per simulated
minute), so they live in the browser's IndexedDB, which grows with the disk, not in its localStorage (5 MB for the
whole site in Safari, the cards above included). The archive's line says how much it holds ("5 saved · 1.7 MB"). Where
a browser has no IndexedDB the archive falls back to localStorage and says so; there "Export all" and **Clear the
archive** make room. A browser can still delete a site's data (Safari does after seven days of browser use without a
visit to the site), so export the archive you want to keep.

### How Instructor v2 reads a card

Instructor v2 (`#/teach2`, E127) reads the same `pme-scenario/1` document; nothing new is needed in a card, but these
parts of it show:

- **Stages.** Every state is a stage of the strip, except a *hop*: a state whose only exit is `afterS` of 2 s or less
  (the MH card's treatment states). A hop folds into the stage its exit leads to. A stage a rule can enter shows
  "auto".
- **Steps.** The current state's `manual` transitions, and `any`/`all` transitions with a `manual` inside, are its
  numbered steps, in the array order of `transitions` (keys 1–9). The button's label is the step's title, so keep it
  short and say what it gives.
- **Automatic rows.** `vital`, `afterS` and `event` transitions show as "A" rows with how near their rule is.
- **Objectives.** An objective is tied to a step when its rule's `event` is `state:<to>` of the step, or `drug:<id>`
  for a drug in `<to>`'s `onEnter`; its `eventWithin` window gives the step a timer ("due", then "overdue"), and an
  `after` that is a `value:` event fades the step until it is true (it stays pressable). An objective without a rule
  is a "you judge it" row. The `"recognition"` one is offered from the moment its Debrief clock starts, never before:
  once the run enters a state an `eventWithin` objective counts from (`after: "state:…"`) that the patient enters by a
  rule (the MH card's Early signs); a card with no such state offers it from the start. An untaken step shows as failed only when such an objective still asks for it and the card
  can no longer reach it; an alternative branch not chosen is never a failure.
- **A `pme-scenario/2` card has no judged rows** (retired by the owner's ruling of 5 November; the design is
  `docs/plans/scenario-format-v2.md`). Every row is an automatic row (a phase's rule) or an action. **A team act you
  observe is a record action**: an action of kind `communication` (or `procedure`, `sample`) with no `give`, which the
  row's press records with its time (the scenario `record` command). Give it a `window` when the card times it (the
  MH card's "name MH from the monitor": `"window": { "anchor": "phase:earlySigns", "withinS": 120 }`, from the moment the
  strip shows Early signs; a `{ "display": … }` anchor reads the monitor's numbers instead), and none when it is
  recorded, not timed (a quality verdict such as "closed-loop communication was used", pressed at the end). List it in
  the phases where the team can do it: the row is not there before. A card that still has a `judged` block fails
  validation with one line naming this replacement.
- **`notes`** of a state are the cue box's Say line, so write them as what the instructor says or watches for.

## Checklist

- `validateScenario(doc).ok` is true and `warnings` is empty.
- Every state the learner can reach has a way out (or is a deliberate end state).
- MANUAL numbers come from a source you can cite in `notes` or `$comment`; MODELED scenarios name the events, not the
  numbers.
- Mark clinical content that has not been reviewed by a clinician `[draft]` in the title, as the built-ins do.

## Authoring a `pme-scenario/2` card

A `/2` card describes the disease's course as **phases** that the engine's own state enters, and the team's work as
**actions** that carry their acceptance criteria. One pure function, `grade()`, grades the run for Instructor v2 and
for the Debrief. The design is `docs/plans/scenario-format-v2.md`. The schema is
`packages/controller/scenarios/pme-scenario-2.schema.json`. `validateScenario(doc)` checks a `/2` document when its
`schema` is `"pme-scenario/2"` and it has no `states`: first the schema, then the cross-references the schema cannot
express (`validate.ts`, `validateV2`). The two demo cards are the worked examples:
`apps/demo/src/app/showcase/showcase-mh-v2.json` (malignant hyperthermia) and `showcase-haemorrhage-v2.json`
(class IV haemorrhage). A `/2` card runs in Instructor v2 (`#/teach2`). `pme-scenario/1` stays readable, unchanged.

### The document

`schema` (`"pme-scenario/2"`), `id`, `title`, `phases` and `actions` are required. The header is `/1`'s: `notes`,
`category`, `story`, `takeHome` (up to four lines here), `durationMin`, `seed`, `mode`, `briefing`. `patient` and
`device` are `/1`'s blocks, by reference. A `/2` card has no `states`, `initialState`, `objectives` or `bookmarks`, and
no `judged` block. It has four blocks of its own: `phases`, `actions`, `outcomes` and `script`. `$comment` is allowed
on the document and on every entry, and nothing reads it.

### Phases: the course, entered by the engine's truth

- Exactly one phase has `"initial": true` and no `enter` rule. Every other phase has an `enter` rule.
- One phase holds at a time. On each tick the runner tries the `enter` rules of the phases in the current phase's
  `next`, in the order written. The first rule that holds wins. A tick changes the phase at most once, and a phase
  never re-enters itself (`phase-runner.ts`).
- **An entry rule reads the engine's truth, never a press.** A rule is one leaf or one combinator (`all`, `any`,
  `not`). The leaves are:
  - `value`: `{ var, op, value, forS }`.
  - `slope`: `{ var, op, perMin, overS }`, the least-squares slope of the 1 Hz samples, false until the window is full.
  - `unchanged`: `{ var, withinPct, overS }`, or with `since: "phaseStart"` instead of `overS`.
  - `visited`: a phase id.
  - `signal`: `"pulseLoss"`, `"rosc"` or `"rhythm:<id>"`.

  `var` is one of the schema's `truthVar` names: the state variables, `map` (the beat MAP), `ph`, `lactate`,
  `mhActivity`, `mhExcess`, `dantroleneE` and `setMinuteVentilationLMin`. A rhythm is named by the id the engine
  draws, so VF is told from VT, and asystole from PEA, by id. There is no `manual`, `event` or `afterS` leaf. The
  scenario `goto` and `trigger` commands are refused on a `/2` card ("a pme-scenario/2 phase is entered by its own
  rule, never by goto").
- `holdS`: the rule must hold without a break for this many seconds while the phase is reachable (in the current
  phase's `next`). The count starts at the later of the rule's true edge and the moment the phase became reachable.
- `label` names the phase on the strip. `cue` is what the learners see in the phase. `notes` is the cue box's Say line.
- **The script** (`script`) holds what the card imposes: the bleed, or a rhythm the card sets. An entry fires once,
  the first time its `on` happens: `"phase:<id>"` (the phase's first entry), `"action:<id>#<n>"` (the nth taking of an
  action) or `{ "atScenarioS": s }`. Its commands are card-set and never graded. The script never enters a phase:
  the phase follows when the engine's state meets its rule.

### Actions: what the team does, with its criteria

An action has an `id`, a `label` (the row's title), a `kind`, and the `phases` in which it is open: it opens when one
of them is first entered, and its row is not listed before that. Optional fields are `notes`, `give`, `window`,
`repeat` or `repeatWhile`, `precondition`, `contraindications`, `src`, `preparation` and `graded`.

**How a press is recorded.** `give` holds the engine commands an A press sends (the `/1` command definitions), each
stamped with the action's id. The `kind` names the block that holds the criteria: `drug` → `drug`, `device` →
`device`, `fluid` → `fluid`, `physical` → `physical`, `decision` → `effect`. A `procedure`, `sample` or
`communication` action has no criteria block. It is matched by its own taking: a press of its `give`, or, with no
`give`, the scenario `record` command (`{ "type": "scenario", "action": "record", "target": "<id>" }`, which
Instructor v2 sends). The driver refuses `record` for the other kinds (`driver.ts`).

A drug, device, decision, physical or fluid action is matched by what reached the engine, whoever on the team sent it (card-set script commands never count; `grade.ts`):

- a drug action by its `id`, its `cls` or one of its `alternatives`;
- a device action by its device kind (CPR only while active, a defibrillator only on its shock);
- a decision by one of its effects' kinds;
- a fluid action by its fluid types.

**A team act the instructor observes is a record action.** Calling for help, and recognising and announcing the
diagnosis, are `communication` actions with no `give`. The instructor presses the row when the team does it.

- **Timed:** give it a `window`. The haemorrhage card's "recognise the return of circulation" uses
  `"window": { "anchor": "phase:rosc", "withinS": 120 }`.
- **Recorded, not timed:** give it no window. It is met when taken at any time after it opened. Live, it reads "due"
  with no clock. At the end of the run it is failed if it was never taken.

Judged rows are retired (the owner's ruling of 5 November). A card that declares `judged` fails validation with one
line naming this replacement.

**Grades.** Each graded action is one of the following:

| Grade | When |
|---|---|
| met | taken, matching, in its window (no window: taken once it opened) |
| deviation | taken in its window, with dose, route (allowed but not preferred), rate or settings off |
| due | live: the window is open (no window: not yet taken) |
| overdue | taken after the window closed, or still not taken after it closed (live) |
| failed | not taken by the end of the run; or taken after `failAfterS`; or, live, `failAfterS` has passed |
| not applicable | none of its phases occurred, its anchor never happened, or its precondition never held |

Precedence is failed > overdue > due > deviation > met. Each criterion missed prints as its own line, for example
"dose 0.5 mg, 1 asked". Repeats are graded one by one, and the action takes the worst grade.

**Windows** (`window`) have the following fields:

- `anchor` and `withinS` (required).
- `notBeforeS`: taken sooner than this after the anchor is a deviation.
- `failAfterS`: taken later than this after the anchor is failed even though it was done. It must be greater than
  `withinS`. The haemorrhage card's CPR: within 30 s met, from 30 s to 2 min overdue, later failed.

The anchors are:

| Anchor | The window opens |
|---|---|
| `"start"` | at 0 |
| `"phase:<id>"` | at the phase's first entry, when the strip shows it |
| `"action:<id>"` | at the administration graded for that action |
| `"pulseLoss"`, `"rosc"` | at the model's pulse loss or return of circulation |
| `{ "rule": <phase rule> }` | at the first second a truth rule holds (a value crossing such as `k > 5.5`) |
| `"each:action:<id>"` | once for each taking of that action: one window per taking (resume CPR within 10 s of each rhythm check). Not with `failAfterS` |
| `{ "display": <display rule> }` | at the first second a rule on the **displayed** numerics holds: what the learners could see |
| `{ "first": [ … ] }` | at the earliest of two or more anchors (members: the anchors above except `each:action`, or `{ "display": … }`) |

A rule-like anchor (`pulseLoss`, `rosc`, a `rule`, a `display` or a `first`) opens at its first true edge at or after
the action opened, or at the opening if the rule already holds then. A rule that held only before any of the action's
phases opens nothing. A device or a decision action is credited only with a record made after its window opened. An
anchor that never happens makes the action "not applicable", with the line "anchor never happened: …".

A display rule reads the `/1` measured names (`abpSys`, `nibpSys`, `etco2`, …; the schema's `vitalVar`). It has the
leaves `value` and `phaseEntered` (true from the named phase's first entry; that phase must have an entry rule) and
the combinators `all`, `any` and `not`. A value leaf reads the last value the monitor showed, and it is false until
that value has been displayed once.

**Repeats.**

- `repeat`: `{ "intervalS": amount, "maxCount" }`. Each next dose is due `intervalS` after the previous dose **as
  given**, while one of the action's phases holds. Sooner is a deviation ("interval 178 s, 180–300 s asked"). Later
  is overdue. None by the end is failed. No repeat is due once the action's phases have ended before its deadline
  (the arrest ended in ROSC before the next epinephrine was due). `intervalS` needs `min` or `value`.
- `repeatWhile`: `{ "rule", "intervalS" }`, a conditional repeat. The next dose is due from the later of the previous
  dose + `intervalS.min` and the condition's next rise. An action has `repeat` or `repeatWhile`, not both.

**Drug criteria.** A drug action names exactly one of `id`, `cls` or `alternatives` (each alternative may carry its
own dose). The other criteria are:

- `dose` (`unit` is the engine's; a per-kg unit is converted with the card's weight);
- `cumulative` (only its `max` is graded today);
- `route`: `{ "set": [...], "preferred" }`;
- `rate`: `bolus`, `overS` or `infusion`.

**A wrong route leaves the action open.** A dose by a route outside `set` does not satisfy the action, and neither
does one the engine refused. The row stays open and runs on to overdue or failed, with the reason as a line ("route
im not allowed", "route not modelled", "refused: …"). An allowed route that is not `preferred` is a deviation. The
validator warns when `set` holds a route the engine does not model for that drug (`routeHonoured`). To make a wrong
route show as a timed line as well, add a contraindication.

**Violations** (`contraindications` on an action): `{ "text", "match", "inPhases", "afterAction", "when", "harm" }`.

- `match` filters by `kind`, `drugId`, `cls`, `route` (a list) and `dose`.
- `inPhases`, `afterAction` and `when` narrow it.
- `"harm": "notModelled"` says that the physiology does not carry the harm.

Every administration that matches is a violation: a line with its time, never a grade, never blocked. Example: the
haemorrhage card's epinephrine 1 mg IV or IO in ROSC.

**Other fields.**

- `precondition`: a truth rule that must hold at some time before the press. If it never held from the action's
  opening, the action is "not applicable". For an action without a window, a press before the rule held is a
  deviation, with the line "given before: …".
- `"preparation": true`: a preparation step, such as monitoring or lines (the owner's ruling of 5 November). It is
  offered and recorded with its time, with no verdict. It may not have a window. Its row's subtitle reads
  "preparation: recorded, no verdict", and `grade()` leaves it out, so it has no row in the Debrief's action table.
- `"graded": false`: a setup action, such as the MH card's induction. It is offered and recorded, and never graded.
- `src`: the provenance of the action's numbers. **Every number carries its quote and its page. A number without a
  source is a placeholder, marked for the owner.** People read `src`; nothing interprets it. An action whose sources
  state no window is recorded, not timed, and its `src` says so.

Not graded yet: `order`, `cumulative.min` and `cumulative.windowS`. A decision with several effects is graded on the
first effect of the record's kind.

### Outcomes

An outcome is `{ id, text, rule, anchor, withinS }`: what the physiology should reach, for example "MAP above 65 within
5 min of ROSC". It is reached if the truth rule holds within `withinS` of the anchor (holding at the anchor counts).
The anchors are those of a window, without `each:action`, `display` or `first`. An outcome reads reached, not
reached, or pending while the run goes on. It never changes an action's grade.

### The owner's authoring rules (5 November)

- **Name the bleeding source, and order haemostasis against compressions accordingly.** A card with a bleed says
  where the blood is lost and whether, and when, the bleed is controlled. Haemorrhage control and compressions are not
  sequential steps: ERC 2025's traumatic cardiac arrest section asks for all life-saving interventions "in parallel
  rather than sequentially" (ERC Guidelines 2025 Special Circumstances, Resuscitation 2025;215:110753, p.31). So
  source control and transfusion are actions open beside CPR, not after it. The operating-room CPR trigger does
  **not** apply while bleeding is uncontrolled. Harper et al., Br J Anaesth 2020;124:234–238, p.235, exclude
  haemorrhagic shock with uncontrolled bleeding, where compressions might accelerate blood loss. Hinkelbein et al.,
  Eur J Anaesthesiol 2023;40:724–736, p.733, withhold compressions in hypovolaemic pseudo-PEA in favour of
  haemorrhage control and blood. A card whose bleed is still running when the trigger can fire anchors CPR on the
  pulse loss alone. The haemorrhage card qualifies for the trigger only because its card-set bleed of 2.5 L over
  10 min ends at 10:00, before the trigger can fire.
- **The operating-room CPR trigger, as the haemorrhage card writes it.** CPR's window opens at the earlier of the
  model's pulse loss and the trigger, read on the displayed monitor. The trigger is an arterial systolic below
  40 mmHg for 30 s, or, with no arterial value displayed, a cuff systolic below 50 mmHg for 30 s, each with EtCO₂
  below 25 mmHg. The sources: ERC 2025 Special Circumstances, p.11 (systolic suddenly below 50 mmHg with a fall in
  EtCO₂); Harper 2020, pp.236–237 (the cuff's 50 mmHg; the arterial systolic about 10 mmHg lower). The 30 s and the
  EtCO₂ 25 mmHg are the owner's numbers. The card's `src` quotes each one.

  ```jsonc
  "window": { "anchor": { "first": [ "pulseLoss", { "display": { "any": [
      { "all": [ { "value": { "var": "abpSys", "op": "<", "value": 40, "forS": 30 } },
                 { "value": { "var": "etco2", "op": "<", "value": 25 } } ] },
      { "all": [ { "not": { "value": { "var": "abpSys", "op": ">", "value": -1 } } },
                 { "value": { "var": "nibpSys", "op": "<", "value": 50, "forS": 30 } },
                 { "value": { "var": "etco2", "op": "<", "value": 25 } } ] } ] } } ] },
    "withinS": 30, "failAfterS": 120 }
  ```

  `not (abpSys > -1)` stands for "no arterial value displayed". It holds until an arterial systolic is first shown.
- **VF comes from the physiology, never from a press.** The haemorrhage card has no VF phase and no shock, because
  the engine draws no VF on its course. The `/1` card's VF, set at the rhythm checks, is gone.
- **One remote.** One phone at a time holds the instructor's remote, and the newest right PIN takes over: the old
  phone is told "taken over" (`packages/controller/src/session/host-session.ts`, `docs/plans/instructor-peer-role.md`
  §3). The laptop's own panels need no grant. For a card, it means one press per team act, from any one device. The
  host does not refuse a second press of the same action. A second dose is graded as a repeat (a deviation if it
  comes sooner than `intervalS`), and of the presses of an action without a repeat, only one administration is
  graded.

### What the Debrief reads

`grade(doc, phases, admin, edges, t, { final })` (`packages/controller/src/scenario/grade.ts`) is pure. Its inputs are
the card, the phase timeline, the administration record and the rule edges the runner logs. Instructor v2 calls it
each second, on the host only; a follower shows the prescriptions and "graded on the host". The run record copies
those inputs, and the Debrief's `report3` (`apps/demo/src/app/debrief.ts`) runs the same function once. It runs
`final` once the run has ended. A Debrief opened at a pause still shows an open window as due or overdue.

From the card, the Debrief prints:

- every graded action, with its `label`, `kind`, grade, lines, window, the time it was given and its repeats;
- every outcome, with its `text` and a line of why;
- every violation, with its `text` and its harm;
- `takeHome`, on the learner handout.

The export of a `/2` run is `pme-debrief/3`. It has no `judged` key, and a recognition is its own row in the action
table.

### A `/2` example

A shortened haemorrhage card. Its bleeding source is named and controlled. Compressions and haemostasis run side by
side. CPR is anchored on the pulse loss alone. It has a preparation step, a recorded-not-timed call and a timed
recognition, a display anchor, a fail limit, repeats from the previous dose, a repeat window on each rhythm check, a
violation and an outcome. It is not a reviewed teaching case. The numbers marked PLACEHOLDER are for the owner.

<!-- example: pme-scenario/2 -->
```json
{
  "schema": "pme-scenario/2",
  "id": "guide-haemorrhage-pea",
  "title": "[draft] Guide example: controlled surgical bleed, PEA and resuscitation",
  "notes": "Guide example, shortened from showcase-haemorrhage-v2. Bleeding source: a surgical bleed of 2.5 L over 10 min, card-set, that ends at 10:00 (the surgeon's control). Compressions and haemorrhage control run in parallel; CPR is anchored on the model's pulse loss only.",
  "category": "Guide",
  "durationMin": 25,
  "seed": 7,
  "mode": "modeled",
  "patient": {
    "ageY": 35, "sex": "M", "weightKg": 75, "heightCm": 178, "ageBand": "adult",
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on", "abp": "connected", "co2": "on" }
  },
  "phases": [
    { "id": "bleeding", "label": "Bleeding", "initial": true, "cue": "tachycardia, the pressure holding", "next": ["arrestPea", "arrestAsystole"] },
    {
      "id": "arrestPea", "label": "Arrest: PEA", "cue": "a rhythm, no pulse",
      "enter": { "all": [ { "signal": "pulseLoss" }, { "not": { "signal": "rhythm:asystole" } } ] },
      "notes": "A rhythm on the ECG, no pulse on the arterial line.",
      "next": ["arrestAsystole", "rosc"]
    },
    {
      "id": "arrestAsystole", "label": "Arrest: asystole", "cue": "a flat line",
      "enter": { "all": [ { "signal": "pulseLoss" }, { "signal": "rhythm:asystole" } ] },
      "next": ["arrestPea", "rosc"]
    },
    { "id": "rosc", "label": "ROSC", "cue": "a pulse again", "enter": { "signal": "rosc" }, "next": ["postResuscitation", "arrestPea", "arrestAsystole"] },
    {
      "id": "postResuscitation", "label": "Post-resuscitation", "cue": "circulation held",
      "enter": { "signal": "rosc" }, "holdS": 120,
      "$comment": "ROSC held 120 s (design §4.2).",
      "next": ["arrestPea", "arrestAsystole"]
    }
  ],
  "actions": [
    {
      "id": "monitoring", "label": "Arterial line and capnography attached", "kind": "procedure", "phases": ["bleeding"],
      "preparation": true,
      "$comment": "A preparation step: recorded with its time, no verdict. No give: the press is the scenario record command."
    },
    {
      "id": "callForHelp", "label": "Call for help", "kind": "communication",
      "phases": ["bleeding", "arrestPea", "arrestAsystole"],
      "src": "No window: ERC Guidelines 2025 Adult Advanced Life Support (Soar et al., Resuscitation 2025;215:110769), p.6: 'All hospital staff should be able to recognise cardiac arrest rapidly, call for help, start CPR and defibrillate' (no time stated). Recorded, not timed."
    },
    {
      "id": "announcePea", "label": "Recognise and announce PEA from hypovolaemia", "kind": "communication",
      "phases": ["bleeding", "arrestPea", "arrestAsystole"],
      "window": { "anchor": { "display": { "value": { "var": "abpSys", "op": "<", "value": 25, "forS": 10 } } }, "withinS": 30 },
      "src": "Anchor: the arterial systolic the monitor shows below 25 mmHg for 10 s, the PEA sign of showcase-haemorrhage-v2 (the /1 card's own rule), read here on the displayed line. Window 30 s: a PLACEHOLDER for the owner (no source states one)."
    },
    {
      "id": "sourceControl", "label": "Surgeon controls the bleeding", "kind": "procedure",
      "phases": ["bleeding", "arrestPea", "arrestAsystole"],
      "give": [ { "type": "applyEvent", "event": { "kind": "bleed", "rateMlPerMin": 0 } } ],
      "src": "No window: ERC Guidelines 2025 Special Circumstances, Traumatic cardiac arrest (Resuscitation 2025;215:110753), p.31: 'The main principle is to achieve immediate haemostasis.' (no time stated). Recorded, not timed."
    },
    {
      "id": "cpr", "label": "Start CPR: compressions 100–120/min", "kind": "device",
      "phases": ["arrestPea", "arrestAsystole"],
      "give": [ { "type": "applyEvent", "event": { "kind": "cpr", "active": true, "rate": 110, "quality": 0.8 } } ],
      "device": { "kind": "cpr", "settings": { "rate": { "min": 100, "max": 120 } } },
      "window": { "anchor": "pulseLoss", "withinS": 30, "failAfterS": 120 },
      "src": "Within 30 s of the model's pulse loss: the /1 card's objective 2; fail limit 120 s: the owner's ruling of 5 November; rate 100–120/min: design §11."
    },
    {
      "id": "epinephrine", "label": "Epinephrine 1 mg IV", "kind": "drug",
      "phases": ["arrestPea", "arrestAsystole"],
      "give": [ { "type": "applyEvent", "event": { "kind": "drug", "drugId": "epinephrine", "dose": 1, "unit": "mg", "route": "iv" } } ],
      "drug": { "id": "epinephrine", "dose": { "value": 1, "unit": "mg" }, "route": { "set": ["iv", "io"], "preferred": "iv" } },
      "repeat": { "intervalS": { "min": 180, "max": 300 } },
      "contraindications": [
        {
          "text": "Epinephrine 1 mg IV or IO after the return of circulation: the arrest dose into a beating heart",
          "match": { "drugId": "epinephrine", "route": ["iv", "io"], "dose": { "value": 1, "unit": "mg" } },
          "inPhases": ["rosc", "postResuscitation"]
        }
      ],
      "src": "ERC Guidelines 2025 Adult Advanced Life Support (Soar et al., Resuscitation 2025;215:110769), p.8: 'Repeat adrenaline 1 mg every 3–5 min whilst ALS continues.' The first dose: no window stated (recorded, not timed); each repeat 180–300 s from the previous dose as given. Violation IV or IO: the owner's ruling of 5 November."
    },
    {
      "id": "rhythmCheck", "label": "Rhythm check (compressions pause)", "kind": "procedure",
      "phases": ["arrestPea", "arrestAsystole"],
      "give": [ { "type": "applyEvent", "event": { "kind": "cpr", "active": false } } ],
      "window": { "anchor": "action:cpr", "withinS": 130, "notBeforeS": 110 },
      "repeat": { "intervalS": { "value": 120, "tolerance": 10 } },
      "src": "Every 2 min: ERC Guidelines 2025 Adult Advanced Life Support (Soar et al., Resuscitation 2025;215:110769), p.7: '...perform a rhythm and pulse check every two minutes.' Tolerance ±10 s: AHA 2025 Part 7 (Kleinman et al., Circulation 2025;152(suppl 2):S448–S478), S462: '(no more than 10 s)'."
    },
    {
      "id": "resumeCpr", "label": "Resume CPR after the rhythm check", "kind": "device",
      "phases": ["arrestPea", "arrestAsystole"],
      "give": [ { "type": "applyEvent", "event": { "kind": "cpr", "active": true, "rate": 110, "quality": 0.8 } } ],
      "device": { "kind": "cpr", "settings": { "rate": { "min": 100, "max": 120 } } },
      "window": { "anchor": "each:action:rhythmCheck", "withinS": 10 },
      "src": "Within 10 s of each rhythm check: AHA 2025 Part 7 (Kleinman et al., Circulation 2025;152(suppl 2):S448–S478), S462: 'chest compressions should be restarted immediately'; the 10 s is AHA's pulse-check cap and the owner's number (5 November)."
    },
    {
      "id": "recogniseRosc", "label": "Recognise the return of circulation on the arterial line and the capnogram", "kind": "communication",
      "phases": ["rosc", "postResuscitation"],
      "window": { "anchor": "phase:rosc", "withinS": 120 },
      "src": "Within 120 s of ROSC's entry: the /1 card's objective 3; no source read states a time."
    }
  ],
  "outcomes": [
    {
      "id": "mapAfterRosc", "text": "MAP above 65 within 5 min of the return of circulation",
      "rule": { "value": { "var": "map", "op": ">", "value": 65 } }, "anchor": "rosc", "withinS": 300,
      "$comment": "The design's example outcome (§7); MAP 65 and 5 min are a PLACEHOLDER for the owner."
    }
  ],
  "script": [
    { "id": "bleed", "on": "phase:bleeding", "commands": [ { "type": "applyEvent", "event": { "kind": "bleed", "volumeMl": 2500, "overS": 600 } } ] }
  ]
}
```

### `/2` checklist

- `validateScenario(doc).ok` is true, and `warnings` is empty.
- Every phase except the initial one has an `enter` rule on truth, and every phase the course can reach is in some
  phase's `next`.
- Every team act is an action. A team act with nothing for the engine is a record action (no `give`).
- Every number in an action has its source in `src`, quoted with its page. Otherwise it is marked as a placeholder
  for the owner.
- A card with a bleed names its source and says when the bleed is controlled. It anchors CPR on the operating-room
  trigger only if the bleed is controlled before the trigger can fire.
