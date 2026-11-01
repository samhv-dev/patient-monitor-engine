# Authoring scenarios (`pme-scenario/1`)

A scenario is a JSON document: a patient, a device skin, and a state machine whose states run commands when entered
and whose transitions fire on time, vitals, learner actions, sensors or instructor buttons (brief §7.4). The JSON
Schema is `packages/controller/scenarios/pme-scenario-1.schema.json`; `validateScenario(doc)` from
`@pme/controller/scenario` checks a document (schema, then references between states) and returns
`{ ok, errors, warnings }`. The built-in scenarios in `packages/controller/scenarios/` are worked examples.

## The document

| Field | Meaning |
|---|---|
| `schema` | always `"pme-scenario/1"` |
| `id`, `title`, `notes` | identifier (`[A-Za-z][A-Za-z0-9_.-]*`), title, instructor notes |
| `category`, `story`, `durationMin` | the library group (e.g. `ACLS`, `Induction`), the learner-facing case text shown before the start, the expected run time in minutes |
| `briefing` | optional, the learner-facing **Case briefing**: `{ "text", "estimatedMinutes", "durationS", "lang" }`. When the card loads, every learner screen (the Monitor view, a second-screen learner monitor, every phone following) shows it over the running monitor for `durationS` seconds (default 60, at most 600), then fades into the monitor; a tap or click ends it on the host's screen and a press-and-hold on a phone's (a tap does nothing there), and the instructor's "End briefing" (today's Instructor view, v2's stage strip) ends it everywhere. A phone that joins while it runs shows the remainder. `text` is required: paragraphs separated by blank lines (the last of several is set in italics, for what to do); `estimatedMinutes` adds "Estimated scenario time about N minutes"; `lang` is `"en"` (default) or `"fa"` (right to left, Persian chrome and digits; the monitor's own labels never change). Write it for the learner: who they are, the patient, what has happened, what is connected, what to do (watch and say). It is not `notes` or `story`, and it never names the diagnosis. Not shown again by the load that restores a case after the instructor's page reloads |
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

In the clinical app, the Instructor view's scenario library loads the built-in scenarios (the developer page `dev/scenario-runner.html` loads one into the older instructor panel). In code, `ScenarioDriver` /
`ScenarioRunner` from `@pme/controller/scenario` run a validated document against a monitor handle or a headless
engine; the run log (`runLog`, `replayRunLog`) replays a session exactly.

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
  rule (the MH card's Early signs); a card with no such state offers it from the start. In a `pme-scenario/2` card a
  judged row is offered from the first second its `display` rule holds (no rule: from the start). An untaken step shows as failed only when such an objective still asks for it and the card
  can no longer reach it; an alternative branch not chosen is never a failure.
- **`notes`** of a state are the cue box's Say line, so write them as what the instructor says or watches for.

## Checklist

- `validateScenario(doc).ok` is true and `warnings` is empty.
- Every state the learner can reach has a way out (or is a deliberate end state).
- MANUAL numbers come from a source you can cite in `notes` or `$comment`; MODELED scenarios name the events, not the
  numbers.
- Mark clinical content that has not been reviewed by a clinician `[draft]` in the title, as the built-ins do.
