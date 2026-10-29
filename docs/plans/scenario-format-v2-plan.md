# Scenario format `pme-scenario/2`: implementation plan

**Status:** draft for review. Written 2026-10-29 by the planner from `origin/main` 5808d0b6 (Instructor v2 merged in
#177, the format design merged in #176). No code, card or engine file was changed. Spec:
`docs/plans/scenario-format-v2.md` (the design, "§n" below). Rulings read: the orchestrator's log, 2026-10-29 17:00,
17:20, 18:00 and 18:30. Shape: `docs/plans/instructor-panel-v2-plan.md` and `stage-11-scenarios.md`. Every `file` named
below is a starting point; find code by the function name. Every hour figure is an estimate (est.), not a measurement.

**Goal.** Cards in `pme-scenario/2` run on the engine, the panel and the debrief: phases read from the engine's truth,
actions that carry their acceptance criteria, one pure grading function for the panel and the debrief, outcomes,
judged rows and violations. The two demo cards (`showcase-mh`, `showcase-haemorrhage`) are rewritten in `/2`, and their
course and debrief are shown to match today's, with every difference measured and reported.

**Hard constraints.**
- `pme-scenario/1` stays readable, unchanged, for good. Sixteen cards stay `/1` (the five other showcase cards, §2
  non-goals, and the eleven built-in controller scenarios, which the design does not mention). No piece edits
  `packages/controller/src/scenario/runner.ts`, `pme-scenario-1.schema.json` or a `/1` card's meaning.
- The two demo cards are rewritten last (F8, F9), after the orchestrator's answers to the questions at the end.
- No physiology changes, except the route models of F5, each with its source. A number that leaves its band goes to the
  owner with both values. Bands are never widened (`harness.ts` `bands`).
- Card steps stay out of the staged cache until the format lands (18:30 ruling 3); see Q24 for after.
- The arrest-phase sheet (18:30 ruling 4) and the preparation bench (18:00 ruling) are NOT in this plan. Nothing here
  builds them; the administration record leaves room for them (F3).
- Executors never merge, tag or push gh-pages. One piece per PR, branch `feat-fv2-<piece>` from `origin/main`.

**Architecture in one paragraph.** A `/2` document gets its own schema file, its own types and its own runner class
(`PhaseRunner`), chosen by the driver from `doc.schema`. The `/1` runner is not touched. The driver already sees every
command any source sends (the host's target is `driver.host`), accepted or refused, so it builds the administration
record there. The runner keeps the phase timeline, the administration record and the edges of every named rule in its
plain-JSON state, so a bookmark restores all three and a replay reproduces them. `grade()` is a pure function in
`packages/controller/src/scenario/` over those three and the card. The host's Instructor v2 calls it at its repaint; the
run record copies its inputs once a second, so the debrief and the export never need the driver.

**Common gate (every piece, before every push).**
```bash
npx -y pnpm@9.15.9 -r typecheck
npx -y pnpm@9.15.9 --filter <pkg> test
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs        # 0 stale, 0 orphans
# /1 untouched (until F8/F9 change the two demo cards):
git diff origin/main --stat -- packages/controller/src/scenario/runner.ts packages/controller/scenarios ':!packages/controller/scenarios/pme-scenario-2.schema.json' apps/demo/src/app/showcase/*.json   # empty
# the /1 goldens (F0) still equal:
PME_TEST_SET=showcase PME_SHOWCASE_PRINT=1 npx -y pnpm@9.15.9 --filter @pme/demo test -- malignant-hyperthermia haemorrhage-anaphylaxis
# its printed numbers diffed against scratch/fv2-gate/base/: empty; the it.fails count unchanged
```
Engine pieces (F4, F5) add: `npx -y pnpm@9.15.9 --filter @pme/engine-core test` and `--filter @pme/validation test`
with every validation number unchanged, except F5's new rows.

---

## Partition and ordering

```
F0 baseline (first, on base)
F1 schema, types, validation; every /1 reader narrowed            (after F0)
Wave A (parallel, after F1): F2 phase runner · F3 record + grade() · F4 engine signals · F5.1 "route not modelled"
F5.2 route models (engine only; parallel from F1 on; not on the critical path of the two cards)
Wave B (after F2, F3, F4, F5.1): F6 Instructor v2 · F7 debrief and export
F8 MH card (after F6, F7 and the answers), F9 haemorrhage card (after F8's harness change)
F10 authoring guide, CHANGELOG, roadmap rows (with F9)
F11 integration and measurement (last)
```
Merge order: F0 (no PR), F1, F4, F2, F3, F5.1, F6, F7, F5.2, F8, F9, F10, F11.

Shared files that need care:
- `packages/controller/src/protocol.ts`: F1 (`ClinicalEvent` widened) and F3 (`CommandBase.actionId?`, metadata like
  `batch`; the scenario command's `record` action). F2 adds nothing (the phase uses the existing `scenario` event,
  Q20). F3 rebases after F1.
- `packages/controller/src/scenario/driver.ts`: F1 (refuses `/2` until F2), F2 (runner choice, stage marks per phase),
  F3 (administration record), F4 (signals input). F2, F3 and F4 each own one method; F3 and F4 rebase on F2.
- `apps/demo/src/app/record.ts`: F6 (phase rows, so the strip and cue read them) and F7 (the copied grade inputs). F7
  rebases on F6.

## File map

| File | Piece |
|---|---|
| `packages/controller/scenarios/pme-scenario-2.schema.json` (new), `src/scenario/types-v2.ts` (new) | F1 |
| `src/scenario/validate.ts`, `types.ts` (`AnyScenarioDoc`, `isV2`), `view.ts`, `panel/scenario-tab.ts` (narrowing only) | F1 |
| `src/protocol.ts` (`ClinicalEvent` = the engine's event shapes) | F1 |
| apps/demo readers narrowed: `card-read.ts`, `record.ts`, `debrief.ts`, `debrief-moments.ts`, `scenarios.ts`, `cards.ts`, `sessionbar.ts`, `link.ts`, `panel/scenario.ts`, `views/scenarios.ts`, `views/debrief.ts`, `teach2/*` | F1 (narrowing only, no behaviour change for `/1`) |
| `src/scenario/phase-runner.ts` (new), `rules.ts` (new: leaves, slope ring, edges), `replay.ts` (a `/2` branch), `driver.ts`, `index.ts` | F2 |
| `src/scenario/admin.ts` (new), `grade.ts` (new), `driver.ts` (`observe`, the `record` action), `protocol.ts` (`actionId?`, `record`) | F3 |
| `packages/engine-core/src/engine.ts` (state event), `types.ts` or `protocol.ts` (`signals`), `driver.ts` `onEngine` | F4 |
| `packages/engine-core/src/l2/pk/{row,pipeline,combine}.ts`, `data/rows-other.ts` (dantrolene), `data/rows-cardiovascular.ts` (epinephrine), `index.ts` (`routeHonoured`), `docs/model/*` | F5 |
| `apps/demo/src/app/card-read.ts` (`phasesOf`, `actionRowsOf`), `teach2/{strip,cue,rows,action,press,drug-sheet,cache,sheets}.ts`, `teach2/*.css`, `record.ts` (phase rows), `panel/scenario.ts` (the `/2` message, Q23) | F6 |
| `record.ts` (grade inputs), `debrief.ts`, `debrief-export.ts`, `views/debrief.ts`, `views/debrief.css`, `scripts/showcase/debrief-fa.mjs`, `docs/showcase/i18n/*` (English fallbacks only) | F7 |
| `showcase/showcase-mh.json`, `showcase/harness.ts`, `showcase/malignant-hyperthermia.slow.test.ts`, `debrief-showcase.test.ts`, `card-read.test.ts`, `teach2/*parity*.test.ts`, `scripts/showcase/kit-round-a.kitround.ts`, `docs/showcase/SHOWCASE-2-*.md` | F8 |
| `showcase/showcase-haemorrhage.json`, `showcase/haemorrhage-anaphylaxis.slow.test.ts`, the same tests and docs | F9 |
| `docs/guides/scenario-authoring.md`, `packages/validation/test/docs-examples.test.ts`, `CHANGELOG.md`, `docs/roadmap/*` | F10 |
| `apps/demo/e2e/teach2-*.e2e.ts`, `debrief.e2e.ts` | F11 |

---

## Pieces

### F0: Baseline and goldens (1.5 h est.)
- Worktree from `origin/main`; copy this plan in.
- Record to `scratch/fv2-gate/base/`:
  - `PME_SHOWCASE_PRINT=1 PME_TEST_SET=showcase` output of `malignant-hyperthermia.slow.test.ts` and
    `haemorrhage-anaphylaxis.slow.test.ts` (every printed number);
  - the A4 MH and A4 haemorrhage kit rounds, Chromium and WebKit, through `#/teach2` (`PME_PANEL=teach2`) and through
    today's view: the Debrief JSON (`record.rows` with times, `objectives[].verdict.status` and `why`, `steps`,
    `judged`), the state log, the press times;
  - the Q1 talk test (MH only): the three stops' times and their Explore values;
  - a 1 Hz engine trace of the A4 MH and A4 haemorrhage paths from the harness (state values, `labs`, `endo`
    `mhActivity`, `truth` `hemo.circ.arrest` and the dantrolene effect), as JSON. F2 replays it; F8 and F9 measure the
    proposed phase limits on it (§12 Q1).
  - `scratch/ip2-gate/base/` holds IP9's goldens; reuse its tools, re-record on this base.
- **Gate:** the goldens exist, the slow tests are green on base, the trace files load.
- Instructor v2: nothing.

### F1: Schema, types and validation for `/2`; every `/1` reader narrowed (11 h est.)
`/2` becomes a valid document that nothing runs yet. Every reader of a card learns that a card may have no states.

- `pme-scenario-2.schema.json` (new): the `/1` header kept whole (`$schema`, `schema: 'pme-scenario/2'`, `id`,
  `title`, `notes`, `category`, `story`, `durationMin`, `takeHome`, `seed`, `mode`, `patient`, `device`, `$comment`;
  the design's list in §3 omits `category`, `durationMin` and `device`, which the library and the Showcase test read)
  and the five blocks of §3:
  - `phases[]`: `id`, `label`, `notes`, `enter` (a phase rule), `next[]`, optional `initial: true` on one.
  - a phase rule has its own definition with the leaves of §4 only (`value` with `forS`, `slope`, `unchanged`,
    `visited`, `signal`) and `all`/`any`/`not`. `manual`, `event`, `afterS` cannot appear: the schema refuses them, so
    "no action leaf in a phase rule" (§8.4) is shape, not a cross-check.
  - `actions[]`: `id`, `label`, `kind` (`drug`, `device`, `procedure`, `fluid`, `physical`, `sample`, `communication`,
    `decision`), `phases[]`, `give[]` (the commands an A press sends, Q19), and the criteria of §5.1 by kind.
  - `outcomes[]`: `id`, `text`, a value rule (rank, Q22), an anchor and `withinS`.
  - `judged[]`: `id`, `text`, `kind` (`recognition` | `communication`), an optional display rule (rank 2) that starts
    its clock (§7).
  - `script[]`: `on` (`phase:<id>` entry, `action:<id>#n`, or `atScenarioS`), `commands[]` (the `/1` command
    definitions, reused), always card-set.
- `types-v2.ts` (new) mirrors the schema. `types.ts` gains `AnyScenarioDoc = ScenarioDoc | ScenarioDocV2` and
  `isV2(doc)`. `ScenarioDoc` keeps its name and meaning (`/1`).
- Shared types F2 and F3 both need, fixed here so they can run in parallel: `PhaseEntry` (`id`, `t`, `exitT?`, `rule`),
  `RuleEdge` (`rule`, `t`, `value: boolean`), `Administration` (F3 below), `RunnerInput` `{ kind: 'signals' }`.
- `validate.ts`: dispatch on `schema`; `/2` cross-checks (§8.4): unique phase ids, exactly one initial phase, `next`
  targets exist, action `phases` exist, drug ids and classes exist in the engine's `DRUGS`, `give` commands are `/1`
  commands, script anchors exist. A judged route the engine does not honour is a WARNING ("dantrolene: route im is
  judged; the engine does not model it") from `routeHonoured` (F5.1; until then from `DRUGS[id].routes ?? ['iv','io','central']`).
- `protocol.ts` `ClinicalEvent`: the engine's shapes (§9.1 side finding, wider than the design says): `route: PkRoute`,
  `overS`, `concentrationPct`, and the kinds `infusion`, `tci`, `vaporiser`, `airwayDevice`, and the fluids the cards
  already send (`saline`, `balanced`). Types only: the schema already accepts them (`kind` only).
- `driver.ts` `load`: a valid `/2` document is refused with "pme-scenario/2 cards run from F2 on" until F2.
- Narrowing: change `ScenarioView.doc`, `RunData.doc` and the card-read inputs to `AnyScenarioDoc`, and let the type
  checker find every reader. Each `/1` path stays as it is; each reader gives a `/2` doc the empty answer (no states,
  no objectives). Readers today: `view.ts`, `panel/scenario-tab.ts`, `card-read.ts`, `record.ts` (`doc.states.find`
  would throw on a `/2` doc), `debrief.ts`, `debrief-moments.ts`, `scenarios.ts`, `cards.ts`, `sessionbar.ts`,
  `link.ts`, `panel/scenario.ts`, `views/scenarios.ts`, `views/debrief.ts`, `teach2/{course,cue,dock,drug-sheet,rows,strip}.ts`.
- **Tests first:**
  - `test/scenario/schema-v2.test.ts`: a minimal valid `/2`; one failing document per rule above (each error's JSON
    path); a `manual` leaf in a phase rule is refused; a `/1` document still validates exactly as before (the existing
    `schema.test.ts` and fixtures untouched and green).
  - `driver.test.ts`: `load` of a `/2` doc is refused with the message; of a `/1` doc unchanged.
  - one test per narrowed reader: given a `/2` doc it returns the empty answer and does not throw.
- **Acceptance:** typecheck clean; every `/1` test unchanged and green; the `/1` goldens unchanged.
- **Must not touch:** `runner.ts`, `pme-scenario-1.schema.json`, any card, the engine.
- **Instructor v2:** no visible change (no `/2` card exists yet).
- **Gate:** common, with `@pme/controller` and `@pme/demo`.

### F2: The phase runner (10 h est.)
- `phase-runner.ts` (new) `PhaseRunner`: the surface the driver uses (`start`, `advance`, `pause`, `resume`,
  `getState`, `setState`, `log`, `doc`, `seed`, `stateId` = current phase id, `enteredT`, `entries`, `history`).
  `RunnerState` for `/2` is `pme-scenario-runner/2`: the `/1` fields it still needs, plus `phases: PhaseEntry[]`
  (bounded at 500 entries; the `/1` history keeps its 200), `admin: Administration[]` (filled by F3), `edges:
  RuleEdge[]` (bounded per rule), the slope rings, and the script entries fired.
- `rules.ts` (new): the leaves of §4 on RANK 3 only. The runner keeps two value stores, truth (rank 3) and display
  (rank 2); today's runner keeps one value per name and rank 3 shadows rank 2, so the `/1` store cannot serve §7's
  judged clocks (Q22). `slope`: one ring buffer per variable named in the card, 1 Hz, the window's least-squares slope.
  `unchanged`: the set minute ventilation (F4 signal) within ±tolerance over the window. `visited`: a phase in the
  timeline. `signal`: `pulseLoss`, `rosc`, rhythm group (`RHYTHMS[id].group` from engine-core; no engine change).
  `all`, `any`, `not`.
- Each tick: the entry rules of the current phase's `next`, in document order; the first that holds wins; at most one
  phase change per tick (§4, §12 Q6). Every rule named anywhere in the card (phase rules, action anchors and
  preconditions, conditional repeats, outcomes, judged display rules) is evaluated each tick and its true/false edges
  appended to `edges` (Q17). That is what keeps `grade()` pure.
- Script: an entry fires once per anchor (phase entry, the nth taking of an action as F3 records it, or scenario
  time); its commands go out as one stage group, labelled card-set in the run log; never graded (§3, §12 Q4).
- Driver: `load` builds a `PhaseRunner` for a `/2` doc; `step` places one stage mark per phase entry (no hops in `/2`);
  `restoreBookmark` and `hold` take a `pme-scenario-runner/2` state; `welcomeEvents` publishes the current phase.
  Phase changes go out as today's `scenario` event, `stateId` = phase id, `transitionId` = `enter:<phaseId>` (Q20), so
  `ScenarioView`, the strip and the late-join welcome need no new event.
- `replay.ts`: a `/2` branch: decisions = phase entries and script firings.
- **Tests first** (synthetic inputs, no engine):
  - each leaf true and false at its edge, `forS` held and broken, the slope over a window, `unchanged` at ±tolerance;
  - `next` order wins; one change per tick; `not`; `visited`;
  - the timeline, admin and edges survive `getState`/`setState`; a restore rewinds them; `replayRunLog` reproduces
    the decisions;
  - a script entry fires once on its anchor and is labelled card-set;
  - the F0 MH trace replayed through a `/2` fixture card gives the phase sequence baseline → latent → early signs →
    treated → recovering, with entry times printed for F8 (no band yet: §12 Q1 is open);
  - `driver.test.ts`: a `/2` card loads, publishes its phases, places one stage mark per phase entry, restores.
- **Acceptance:** the `/1` runner, its tests and the `/1` goldens unchanged.
- **Must not touch:** `runner.ts`, `view.ts` behaviour, apps/demo.
- **Instructor v2:** nothing yet; the strip already lists whatever `ScenarioView` publishes, F6 makes it read phases.
- **Gate:** common, with `@pme/controller`.

### F3: The administration record and `grade()` (14 h est.)
- `admin.ts` (new): the driver's `wrap().observe` appends one `Administration` per applyEvent (and per CPR, defib,
  ventilation, vaporiser, fluid, airway command) to the runner's state, ACCEPTED OR REFUSED. Today `observe` returns
  before the runner sees a refused command (`if (!res.accepted) return res`), `record.ts` sees only `commandApplied`,
  and a Remote's refusal reaches only that Remote's ack, so the driver is the one place that sees them all (§8.2).
  ```ts
  interface Administration {
    seq: number; t: number;                      // the applied tick × 0.02 s (a staged batch: its own tick)
    source: 'action' | 'sheet' | 'cache' | 'remote' | 'panel' | 'script'; // from issuedBy, batch and actionId
    actionId?: string;                           // an A press (F6 stamps it on the command)
    kind: 'drug' | 'infusion' | 'tci' | 'vaporiser' | 'fluid' | 'ventilation' | 'cpr' | 'defib' | 'airway' | 'procedure' | 'sample' | 'communication' | 'physical';
    drugId?: string; cls?: string; dose?: number; unit?: string; perKg?: number; route?: PkRoute; overS?: number; rate?: number; rateUnit?: string;
    settings?: Record<string, number | string>;  // ventilator rr, vtMl, fio2, peep; defib energyJ; cpr rate; vaporiser dialPct, fgfLpm
    fluid?: { type: string; volumeMl: number; rateMlMin: number };
    result: { accepted: true } | { accepted: false; reason: string; routeNotModelled: boolean };
    cardSet?: true;                              // a script entry's command: never graded
  }
  ```
  `CommandBase` gains `actionId?` (metadata, as IP1's `batch`: the host and the engine ignore it; it travels in
  `commandApplied`). Procedures, samples and communications that have no engine command (a rhythm check, a gas sent,
  "call for help") are recorded from a new scenario command action `record` with the action id, which the driver
  answers itself and never sends to the engine (Q19). Preparation fields (concentration, diluent) are NOT added; the bench is roadmap only.
- `grade.ts` (new), pure: `grade(doc, phases, admin, edges, t)` returns per action `{ grade, lines[], dueT, givenT,
  windowS, repeats[], live }`, per outcome `reached | not reached` with its time, the violations, and the judged rows'
  clocks. (§8.3 gives `grade(card, phases, record, t)`; the edges are the addition that keeps it pure, Q17.)
  - Grades (17:20 ruling): `met`, `deviation`, `overdue`, `failed`, `not applicable`; precedence failed > overdue >
    deviation > met; a late, wrongly sized dose is overdue with the deviation line under it; repeats graded each, the
    action takes the worst.
  - Matching by identity: drug id, class (`cls`), an alternative with its own dose, or the kind for non-drug actions.
    A route outside the allowed set does not satisfy the action; it stays open (§6, §12 Q2). A refused administration
    stays in the record and is graded; "route not modelled" is printed as its line.
  - Violations (17:20 ruling: a separate line): an administration a contraindication matches; never a grade, never
    blocked; "harm not modelled" where the physiology does not carry it.
  - An action whose anchor or precondition never held: `not applicable` with the reason line (Q14).
  - Live strings: "due m:ss", "overdue m:ss", "met mm:ss", "deviation: <criterion>", "failed".
- **Tests first:** `grade.test.ts`, table-driven, one case per catalogue item of §5.1: identity (id, class,
  alternatives with their own dose); dose exact ± tolerance, range, per kg, cumulative over a window, ceiling; route
  set and preferred; bolus, `overS` range, infusion rate range; timing from each anchor kind (phase entry, `pulseLoss`,
  another action, a value crossing) with `withinS` and `notBeforeS`; order; repeat interval and maximum count;
  conditional repeat (Q13); precondition; contraindication; each non-drug kind (device ranges, procedure, fluid with
  rate, physical, sample, communication, a decision graded on its effect: vaporiser 0 % and FGF ≥ 10 however set).
  Then the owner's two examples: IM dantrolene (the action stays open → overdue → failed; one violation line; "route
  not modelled" until F5.2), and epinephrine 1 mg IV in ROSC (a violation). Then the precedence table and "not
  applicable". `driver.test.ts`: a refused dose (IM dantrolene today) appears in the record with its reason.
- **Acceptance:** every case above; `grade()` imports nothing from the DOM, the session or the engine.
- **Must not touch:** the engine, apps/demo, `runner.ts`.
- **Instructor v2:** nothing yet (F6 consumes it).
- **Gate:** common, with `@pme/controller`.

### F4: Engine signals (3 h est.)
The phase rules need, as truth, values the runner does not get today (§9.3). What the code already has: the `state`
event carries the StateVars AND `rhythm` `{id, rateBpm}` AND `breathing` (§9.3 says StateVars only); pH, lactate and
K⁺ come in the `labs` event; MH activity in the `endo` event; the pulse and the dantrolene effect only in the `truth`
tree, which is an opt-in developer event (`truthHz` 0 by default, pruned, at most 2 Hz).
- The driver's `onEngine` also takes `labs` (`ph`, `lactate`, `k`) and `endo` (`mhActivity`) as rank 3, and derives
  `map` from the state's `sbp`/`dbp` (no MAP StateVar exists).
- The engine adds one typed, additive field to the `state` event: `signals: { pulse: boolean; dantroleneE: number;
  setMinuteVentilationLMin: number | null }` (Q21). No physiology changes.
- **Tests first:** engine-core: the field is present each state event; `pulse` flips with `hemo.circ.arrest`;
  `dantroleneE` equals `bus.metabolic.dantroleneE`; set minute ventilation equals the ventilator's rr × VT. Controller:
  `onEngine` feeds rank-3 `signals` inputs; with `truthHz: 0` the phases still move.
- **Acceptance:** every engine and validation number unchanged; the F0 traces equal.
- **Must not touch:** any physiology module, the renderer, the skins.
- **Instructor v2:** nothing.
- **Gate:** common plus the engine additions.

### F5: Route models, "route not modelled" first (14 h est.: F5.1 2 h, F5.2 12 h)
The rulings ask for route models wherever a route is judged, with "route not modelled" shown until then (17:00).

**F5.1 "route not modelled" end to end (2 h est.; Wave A).**
- engine-core exports `routeHonoured(drugId, route): boolean` (from `row.routes ?? IV_ROUTES`; `IV_ROUTES` is not
  exported today), so the validator, the record and the Drug sheet ask the engine instead of parsing the refusal's
  sentence.
- The record's `routeNotModelled` flag (F3) comes from it; `validateScenario` warns (F1).
- **Tests first:** `routeHonoured` for every row and route equals what `validatePk` accepts; the IM dantrolene
  administration carries the flag; the validator warns for a card that judges IM.
- Instructor v2 (in F6): the ACTION row and the Drug sheet print "IM: route not modelled"; the debrief line (F7) the same.

**F5.2 the route models (12 h est.; engine only, parallel).**
- One mechanism, per drug row and route: `{ F, ka, lagS, src }`, plus an optional local effect (an output event).
- The design's "depot feeding the existing central compartment" fits compartment rows only. Dantrolene is a curve row
  (`gammaPk`) with no compartment; epinephrine is a compartment row (`vaso`). So:
  - F = 0 needs no depot: the dose is accepted, gives no systemic effect, and raises the local effect. Dantrolene IM:
    no systemic effect and a local tissue-injury event (the reconstituted solution's pH about 9.5); the monitor shows
    nothing (§9.2). Its sources: the product label (IV only; pH of the solution).
  - A compartment row with F > 0 gets a first-order depot feeding its central compartment. Epinephrine IM (thigh):
    peak about 8 min (Simons 2001), F and ka from that source or a better one.
  - A curve row with 0 < F < 1 stays "route not modelled" (it would need its own curve; roadmap row).
  - Epinephrine by the tracheal tube stays "route not modelled" (§9.2).
- `docs/model/*` regenerated: the new rows with their sources; evidence first, no fitted constant (a parameter without
  a source is not added; the route then stays "not modelled").
- **Tests first:** dantrolene IM accepted, `dantroleneE` stays 0, MH activity unchanged against the untreated trace,
  one local-effect event; epinephrine IM Cp peaks within the source's range; every IV/IO/central number unchanged
  (validation suite).
- **Acceptance:** the validation suites unchanged except the new rows; the F0 traces equal.
- **Must not touch:** any IV kinetics; the cards; apps/demo.
- **Instructor v2:** nothing new: the "route not modelled" label disappears for the routes now modelled.
- **Gate:** common plus the engine additions; the model-docs guard.

### F6: Instructor v2 reads `/2` (13 h est.)
The concept stays (§10): STATE and ACTION, one list, A rows, judged rows, sheets, marks. Every change below applies to
a `/2` card only; a `/1` card reads exactly as today (IP9's parity tests stay green).
- `card-read.ts`: `phasesOf(doc)` → the strip's stages (every future one "auto"), `actionRowsOf(doc, phaseId)`, the
  prescription words ("Dantrolene 2.5 mg/kg IV · within 5 min of the trigger action · again every 5–10 min to 10 mg/kg").
- `record.ts`: a `/2` phase event becomes a row `phase:<id>` with `by: 'rule'`.
- Strip (`strip.ts`): phases; entry times from the timeline; a past phase restores its mark (as today); a future
  phase does not jump (§10, §12 Q5). The `/1` future-click `goto` (the owner's 11:00 ruling) stays for `/1` cards.
- Cue box (`cue.ts`): "entered by its own rule: <rule in words>"; the Say line is the phase's `notes`.
- ACTION (`rows.ts`, `action.ts`): the open actions (the current phase's, and earlier ones still due), each row with
  both halves (prescription as title and subtitle; the grade at the right); A rows are the rules out of the current
  phase with today's bar; outcome rows (new) look the same, not pressable, "reached hh:mm" / "not reached"; the new
  looks `deviation` (the met look, amber label naming the criterion) and `not applicable` (grey, in Finished);
  violations as a red line in the Log sheet and in Finished; no toast, no block. `rows.ts` calls `grade()` (host only,
  Q16); a follower shows the prescriptions and "graded on the host".
- A press (`press.ts`): sends the action's `give` commands as clinical events, stamped with `actionId`; no transition.
  A procedure without an engine command sends the scenario `record` action (F3).
- Drug sheet (`drug-sheet.ts`): a route choice (every route of the engine; "not modelled" beside the routes
  `routeHonoured` refuses) and a "given over" (`overS`) field. Today the sheet sends `route: 'iv'` for every bolus and
  has no `overS`, so IM cannot be given from any panel. The pinned rows of a `/2` card are its open drug actions, and
  a typed dose is simply given and graded: `pinnedGiveRule` is not used for `/2`. It stays for the sixteen `/1` cards
  (§10 says it "goes"; it can only go for `/2`).
- Cache (`cache.ts`): A presses give at once and never enter the cache; the same drug from the Drug sheet may be staged
  and is graded at its applied tick (Q24).
- Today's view (`panel/scenario.ts`): a `/2` card shows "This card is pme-scenario/2: run it from Instructor v2" and
  no state buttons (Q23). One guarded branch; the `/1` path byte-identical.
- **Tests first:** `card-read.test.ts` on a `/2` fixture card (phases, rows, words); `rows.test.ts` (each look, the
  live clock strings, a follower without a record); `strip.dom.test.ts` (a `/2` future chip does not send `goto`; a
  `/1` one still does); `drug-sheet.dom.test.ts` (route choice; IM dantrolene sends `route: 'im'` and the row reads
  "route not modelled"); `press.dom.test.ts` (an A press sends `give` with `actionId`, no `trigger`); the IP9 parity
  tests unchanged for `/1`.
- **Acceptance:** `teach2-fit.e2e.ts` at 1440 × 900 with a `/2` fixture card: no scroll, every open action a row, no
  row disabled; the `/1` goldens of IP9 identical.
- **Must not touch:** the engine, the controller (except consuming its exports), the `/1` paths.
- **Gate:** common, with `@pme/demo`; `teach2-*.e2e.ts` on both projects.

### F7: Debrief and export (8 h est.)
- `record.ts`: once a second (with the sample) and on every phase event, `RunData` copies the runner's `phases`,
  `admin` and `edges` (host only), so the debrief, its export and a page reload (`keep()`) never need the driver.
  `RunData` for a `/2` run: `format: 2`, `phases: PhaseEntry[]`, `admin: Administration[]`, `edges: RuleEdge[]`.
- `debrief.ts`: for a `/2` run, the steps table becomes the action table (grade, criteria lines, due and given times,
  repeats), plus outcomes, violations and the judged rows (§10); `objectives()` and `steps()` stay for `/1` runs and
  return `[]` for `/2`. `keyTimes` "recognition" reads the judged row of kind `recognition`.
- Export (§12 Q10): a `/1` run exports `pme-debrief/2` exactly as today; a `/2` run exports `pme-debrief/3`:
  ```
  { schema: 'pme-debrief/3', version, build, record, phases, actions, outcomes, violations, judged,
    facts, keyTimes, keyMoments, minutes, marks }
  actions[]:    { id, label, kind, grade, lines[], dueT, givenT, windowS, repeats[{ n, grade, t, lines[] }], admin[] (seq) }
  outcomes[]:   { id, text, status: 'reached' | 'not reached', t, why }
  violations[]: { t, seq, text, harm: 'modelled' | 'not modelled' }
  judged[]:     { id, text, kind, fromT, pressedT }
  ```
- `scripts/showcase/debrief-fa.mjs` learns `/3`. The new English strings get table entries with English fallbacks;
  Persian drafts only through the persian-writing skill and the owner's review, in a later rc line (as #161).
- `views/debrief.ts`, `views/debrief.css`: the sections; print bounds as IP8 (page 1 ≤ 267 mm, handout 1 page).
- **Tests first:** `debrief.test.ts` (the `/3` keys; the `/2` keys unchanged); `record.test.ts` (copied inputs survive
  `keep()`/`resume()` and a restore); `debrief-showcase.test.ts` on a `/2` fixture card on the engine: the debrief's
  grades equal the panel's at the end of the run (same function, same inputs).
- **Acceptance:** `debrief.e2e.ts` on both projects, 3 of 3 runs; a `/1` run's export byte-identical to F0's.
- **Must not touch:** the engine, the controller, `/1` verdicts.
- **Gate:** common, with `@pme/demo`; `debrief.e2e.ts`.

### F8: The MH card in `/2` (9 h est.)
Two steps in one PR, so the format change and the physiology change are measured apart.
- **Step a, faithful translation.** `showcase-mh.json` rewritten in place (same id, same file, so the library, the run
  sheets and the kit's locators keep working): 9 phases (§4.1, §11); the actions of §11; the `/1` objectives as their
  rows (correspondence table below). The engine must receive the same commands at the same ticks as the `/1` A4
  path: the `/1` card's `condition: mh` at Induce becomes a script entry on the first taking of the induce action
  (card-set); every A press's `give` equals the `/1` state's `onEnter` it replaces; the early-signs and arrest entry
  rules are the `/1` ones (`etco2 > 45` for 20 s; `sbp < 25` for 10 s) until §12 Q1 and Q29 are answered.
  - `harness.ts`: an `Act` may name an action id (`act: 'dantrolene'`): the harness sends the action's `give` through
    the driver as the panel does, at the same poll. `run.states` records phases.
  - `malignant-hyperthermia.slow.test.ts`: the same arms with action ids. **Oracle:** every printed number equal to
    F0's (the engine got the same command stream). Any difference is a bug in the translation, not a re-centring.
- **Step b, the owner's model.** `patient.neuro.mhSusceptible: true` and the script entry removed (the engine starts MH
  at the succinylcholine: `MH_SUX_LATENCY_S = 0`, `MH_PROFILE_SEVERITY = 1`, the same t0 and severity as the card's
  condition; the `/1` schema could already carry this). The early-signs rule of §4.1 (slope, unchanged ventilation,
  HR rising) and `pulseLoss` for arrest, with the limits the owner rules (§12 Q1). Re-measure; a number that leaves
  its band goes to the owner with both values; never widened.
- Kit round (`kit-round-a.kitround.ts`): A4 MH and the Q1 talk press action rows under `PME_PANEL=teach2`; the stops
  keep their times (8:10 / 13:50 / 19:11 on the rc.4 path).
- Run sheet and cue cards (`docs/showcase/SHOWCASE-2-*.md`): the rows name actions and phases.
- **Correspondence (the verdict oracle).** On the A4 MH path (IP9's run through `#/teach2`: early signs 08:08, call
  08:10, dantrolene 08:30, ventilation back 13:48, second dose 19:06; verdicts –, met, met, met, –, met), each `/1`
  objective and its `/2` row:

  | `/1` objective (A4 verdict) | `/2` row | expected `/2` grade on the A4 path |
  |---|---|---|
  | 1 name MH from the monitor (judged, ticked) | judged recognition, clock from displayed EtCO₂ > 45 | pressed, its time |
  | 2 call the crisis within 120 s of early signs (met, 2 s) | decision "stop the trigger" (vaporiser 0 %, FGF ≥ 10), 120 s from early signs | met |
  | 3 dantrolene within 300 s of the call (met, 21 s) | drug dantrolene 2.5 mg/kg IV, 300 s from the trigger action (Q27) | met |
  | 4 the second dose when EtCO₂ climbs back at normal ventilation (met) | dantrolene's conditional repeat | met only under Q13's recommended anchor; "overdue 0:36" if the 5–10 min runs from the first dose (636 s) |
  | 5 calcium and insulin within 300 s of K⁺ > 5.5 (not assessable: never above) | drug, anchor `k > 5.5` | not applicable (Q14) |
  | 6 ventilation back after 2 min of EtCO₂ < 40 (met) | device "back to 12 × 500" after outcome "EtCO₂ below 40 for 2 min" | met; outcome reached |
  | (none) | hyperventilate 20 × 600, FiO₂ 1.0; propofol 100–150 µg/kg/min | met (the card's own values) |
  | (none) | cooling, bicarbonate (not given on the early path) | not applicable only with a precondition (core > 38.5 °C; a pH limit for the owner); else failed |
  | (none) | setup actions (premedicate, preoxygenate before induce, intubate, start surgery) | met, if graded (§12 Q12) |

  Every row's grade on the A4 path is printed in the PR; any row that does not read as the table says goes to the
  orchestrator before merge.
- **Tests first:** `debrief-showcase.test.ts` (the table above on the engine); `card-read.test.ts` (9 phases, the
  actions, the words); the slow test (step a oracle) then step b's measurement.
- **Must not touch:** the engine; the other cards.
- **Instructor v2:** the MH card shows phases, actions and grades; nothing else changes.
- **Gate:** common (the `/1` goldens now exclude the MH card), the slow test, A4 MH + Q1 talk on both browsers through
  `#/teach2`, the debrief e2e on the MH run.

### F9: The haemorrhage card in `/2` (7 h est.)
The same two-step method (the haemorrhage has no physiology change in step b except the entry rules, so step b may be
empty).
- 7 phases (§4.2): bleeding (script: the 2.5 L bleed over 10 min at 0 s), decompensating (`sbp < 60` for 10 s;
  script: junctional 50/min on entry; the `/1` card also lets a press force it, which a phase cannot), arrest PEA /
  VF / asystole (`pulseLoss` with the rhythm group), ROSC (`rosc`), post-resuscitation (ROSC held 120 s).
- Actions (§11): oxygen; intubate and ventilate; CPR 100–120/min within 30 s of `pulseLoss`; bag 10/min; epinephrine
  1 mg IV/IO every 180–300 s; source control; massive transfusion (blood at ≥ 300 mL/min); TXA 1 g IV (precondition
  within 3 h of the injury); rhythm check every 2 min (it stops CPR; its 1st and 2nd takings fire the VF script);
  shock 150–200 J; resume CPR after a shock (Q34); stop CPR. Violation: epinephrine 1 mg IV in ROSC.
- **Correspondence** on the A4 (E132) path (`docs/showcase/kit-round-a/e132/`): pulse loss 11:00, CPR 15:39, epi
  15:59 and 18:57, checks 17:38 and 19:46, shocks 200 J, ROSC 20:58, stop 21:56.

  | `/1` objective (A4 verdict) | `/2` row | expected `/2` grade |
  |---|---|---|
  | 1 recognise PEA (judged) | judged recognition, clock from the displayed ART | pressed or not, as ticked |
  | 2 CPR within 30 s of the pulse loss (not met: withheld on purpose) | CPR action | overdue (given at +279 s); §12 Q9 |
  | 3 recognise ROSC and stop CPR within 120 s (met, 58 s) | judged ROSC + action "stop CPR" | met |
  | (none) | epinephrine every 180–300 s | deviation: interval (178 s between the two doses) |
  | (none) | rhythm check every 2 min | met or deviation, by the tolerance the owner sets (the 2nd check at +128 s) |
  | (none) | shock 150–200 J; massive transfusion; TXA | met |

- `haemorrhage-anaphylaxis.slow.test.ts` (haemorrhage arms only), `debrief-showcase.test.ts`, kit round A4
  haemorrhage, the run sheet: as in F8.
- **Gate:** as F8, for the haemorrhage card.

### F10: Authoring guide, CHANGELOG, roadmap (4 h est.)
- `docs/guides/scenario-authoring.md`: a `/2` section with one validated example (`<!-- example: pme-scenario/2 -->`);
  `docs-examples.test.ts` learns the tag.
- `CHANGELOG.md` Unreleased: the format, the routes modelled, the debrief `/3`.
- Roadmap rows: the arrest-phase sheet (18:30 ruling 4), the preparation bench (18:00), the charcoal filter and the MH
  activity reading the agent level (18:00), curve rows by a non-IV route, grades on a follower (Q16), the in-place swap.
- **Gate:** common; `docs-examples.test.ts`.

### F11: Integration and measurement (4 h est., last)
- On the merged head: every unit, DOM and slow test; the A4 MH, A4 haemorrhage and Q1 talk rounds on Chromium and
  WebKit through `#/teach2`; `teach2-fit`, `teach2-keys`, `debrief.e2e.ts`; the five other showcase cards and the
  eleven built-ins load and run as on F0 (their goldens).
- An independent read-only review naming the head.
- **Gate:** all of the above, CI green.

---

## What stays `pme-scenario/1`

- The `/1` schema, runner, replay, run-log and runner-state schemas, and every `/1` test: unchanged, for good.
- Sixteen cards: the five other showcase cards (induction, induction after premedication, anaphylaxis, bronchospasm,
  tamponade) and the eleven built-ins in `packages/controller/scenarios/`. The design's non-goal covers the five; the
  eleven are not mentioned; both stay `/1` (Q33).
- Today's Instructor view runs every `/1` card as today. Instructor v2 runs both formats.
- `pinnedGiveRule`, the `/1` strip's future-click `goto`, `objectives()`, `steps()`, `pme-debrief/2`: kept for `/1`.
- Until F8 and F9 merge, the two demo cards stay `/1` and the rc line's kit is unaffected.

## Effort

| Piece | h (est.) | Wave |
|---|---|---|
| F0 baseline | 1.5 | 0 |
| F1 schema, types, validation, readers | 11 | 1 |
| F2 phase runner | 10 | A |
| F3 record and grade() | 14 | A |
| F4 engine signals | 3 | A |
| F5 route models (F5.1 2, F5.2 12) | 14 | A / parallel |
| F6 Instructor v2 | 13 | B |
| F7 debrief and export | 8 | B |
| F8 MH card | 9 | C |
| F9 haemorrhage card | 7 | C |
| F10 guide, CHANGELOG, roadmap | 4 | C |
| F11 integration | 4 | last |
| **Total** | **≈ 98.5 executor-h (est.)**, plus ≈ 4 h of review | at most 4 executors at a time |

Against the design's 84 h (§13): F0 and F11 are added (5.5 h); F1 gains the reader narrowing (3 h); F6 gains the Drug
sheet's route and duration and today's view's message (3 h); F8 and F9 gain the two-step method (3 h).

## Risks in the code

- **R1. A `/2` doc crashes today's readers.** `record.ts` calls `doc.states.find`, `ScenarioView.current()` and the
  Scenario tab read `states`; a `/2` card loaded before F1's narrowing throws. F1 lets the type checker find them.
- **R2. Grading needs the refused doses.** Only the driver sees them (F3). A remote's refusal never reaches the host's
  record otherwise.
- **R3. Rank 3 shadows rank 2.** The `/1` runner's single value store cannot give the judged rows their display clock.
- **R4. The truth tree is a developer event.** Off by default; phases built on it would not move for an embedder.
- **R5. The courses move with the entry rules, not only with susceptibility.** The richer early-signs rule (§4.1) and
  `pulseLoss` for arrest move phase times, and with them every window anchored on a phase. Step a / step b in F8 and
  F9 keeps the format and the model apart.
- **R6. The kit round presses within one poll lag.** The harness can press on the shock's tick; the browser cannot. The
  slow tests are the exact oracle; the kit round's is "each press within one poll lag", as IP9's.
- **R7. New rows grade what `/1` never judged.** The correspondence tables show where (epinephrine interval, rhythm
  check tolerance, cooling, bicarbonate). Each needs a card number or a precondition the owner rules.
- **R8. The export split.** A reader of `pme-debrief/2` must never get a `/2` export without objectives; `/3` for `/2`
  runs keeps the two apart (§12 Q10).
- **R9. The model-docs guard covers the app, the controller and the engine.** Every piece regenerates the docs.
- **R10. A press's commands change owner.** In `/1` a step's commands are the scenario's (`issuedBy: 'scenario'`, record
  rows of kind `scenario`, key moments `who: 'scenario'`); in `/2` an A press sends them as the team's. The physiology
  is the same; the debrief's timeline and key moments read "team" where `/1` read "scenario". F8 and F9 list this
  difference in the kit-round comparison instead of counting it as a failure.

## Where the design and the code disagree

1. **Where grading lives.** §8.3 puts `grade()` in `packages/controller/src/scenario/`. Today's shared reading (IP9's
   "one helper": `card-read.ts` `standingOf`, `untakenStatus`) and the run record (`RunData`) are in `apps/demo`. The
   plan follows the design and builds the administration record in the driver.
2. **Refused doses.** §8.2 keeps them in the record. The driver drops them before the runner, `record.ts` sees only
   `commandApplied`, and a Remote's refusal goes to that Remote's ack only. IM dantrolene today is refused by the engine
   and exists only as text in the sending panel's log.
3. **What the `state` event carries.** §9.3: "the StateVars only". It also carries `rhythm` and `breathing`; pH,
   lactate and K⁺ are in `labs`, MH activity in `endo`; pulse and the dantrolene effect are only in the opt-in `truth`.
4. **Rank 3 and rank 2.** §4 reads rank 3 only and §7 starts judged clocks on rank 2; the runner keeps one value per
   name, rank 3 wins, and `map` exists only as a rank-2 alias (no MAP StateVar).
5. **The event union.** §9.1 names only the route union. The controller's `ClinicalEvent` also lacks `overS`, the kinds
   `infusion`, `tci`, `vaporiser`, `airwayDevice`, the fluids `saline` and `balanced`, and the unit `mmol/kg`, all of
   which the two demo cards already send (the schema checks `kind` only).
6. **The depot.** §9.2 feeds "the existing central compartment". Dantrolene is a curve row (`gammaPk`) without one;
   epinephrine is a compartment row. `IV_ROUTES` is not exported.
7. **Dantrolene's anchor.** §5: "within 300 s of early signs". §11 and the card's objective 3: 300 s from the call.
8. **Arrest entry.** §4.1 uses `pulseLoss`; the MH card uses `sbp < 25` for 10 s. The haemorrhage card enters PEA at
   626 s (`sbp < 25`), the model's pulse loss is at 660 s on the E132 A4 run.
9. **Early signs.** §4.1 adds a slope, unchanged ventilation and HR rising; the card has `etco2 > 45` for 20 s.
10. **The strip's future click.** §10: it cannot jump. The owner's 11:00 ruling and the built strip: it sends `goto`.
11. **`pinnedGiveRule` "goes".** Sixteen `/1` cards keep using it; it can only go for `/2` cards.
12. **The header.** §3's list omits `category`, `durationMin` and `device`, which the library, the Showcase group test
    and the `/1` schema use.
13. **What stays `/1`.** §2 names the five other showcase cards; the eleven built-ins are also `/1`. The brief's "both
    formats readable until the two demo cards are rewritten" reads as a transition; in the code `/1` is permanent.
14. **"A press gives the prescription; anything else from a sheet".** The Drug sheet sends `route: 'iv'` for every bolus
    and has no `overS`; no panel can give IM today.
15. **The timeline in the runner state.** §8.1 assumes it fits; the `/1` state is `pme-scenario-runner/1` with a
    200-entry history and the replay keys on state entries. `/2` needs its own state and log schemas (F2).
16. **Susceptibility needs no `/2`.** §1 and §4.1 tie "the MH starts from the physiology" to the new format; the `/1`
    schema already carries `patient.neuro`, and the engine already starts MH at the succinylcholine with latency 0 and
    severity 1.
17. **The grade signature.** §8.3 `grade(card, phases, record, t)` cannot judge value anchors, conditional repeats or
    outcomes without the values' history; the plan adds the rule edges.
18. **The trigger-off decision.** §5.1 grades vaporiser 0 % and FGF ≥ 10 L/min. The 18:00 ruling adds the charcoal
    filter (not modelled) and an outcome "EtAA below a threshold".
19. **Small.** The brief's "files with ip2 in their name": the code is `apps/demo/src/app/teach2/*` (CSS `ip2-*`). The
    design's base is 9faec4cf; Instructor v2 merged after it (#177), so §10 was written against the branch.

## Questions for the orchestrator

Each with the recommendation and the reason. Q1–Q12 are the design's §12; Q13 on are new from the code.

1. **The qualitative limits** (†, §4.1). Recommend: measure MH activity, the dantrolene effect and the slopes at the
   `/1` state entries on F0's traces, propose the values from those, and let the owner rule before F8 step b. Reason:
   no invented number; the traces show what the current card's states correspond to.
2. **A route outside the allowed set.** Recommend as the design: the action stays open; a violation if contraindicated;
   a line "route IM not allowed" under the row. Reason: "deviation" would grade as given a dose the physiology ignores.
3. **"Declare the diagnosis".** Recommend as proposed: timed acts are actions (communication), qualitative judgements
   judged rows; "name MH from the monitor" stays judged. Reason: one rule, and it keeps objective 1's meaning.
4. **Script rhythms.** Recommend yes, card-set, never graded. Reason: the haemorrhage card's VF at the two rhythm
   checks is its lesson and the physiology does not produce it.
5. **The strip's future click.** Recommend: removed for `/2` (the chip shows its entry rule); the header's +2/+5 min
   fast forward stays; `/1` keeps `goto`. Reason: a phase may never come; "fast forward until" could run without end.
6. **Phase overlap.** Recommend one at a time, `next` in document order (§4 already). Reason: one strip, one Say line.
7. **IM dantrolene's local harm.** Recommend a log and debrief line ("tissue injury; not modelled") now; CK and K⁺
   effects to the engine roadmap with sources. Reason: no sourced coupling yet.
8. **The epinephrine example.** The owner to confirm §1's IV-in-arrest against IM-in-anaphylaxis. No recommendation.
9. **The haemorrhage demo withholds CPR.** Recommend no "demonstration" flag: CPR reads overdue, as `/1` reads "not
   met"; the run sheet says it is deliberate. Reason: the debrief should say what happened.
10. **The export.** Recommend `/3` for a `/2` run, `/2` unchanged for a `/1` run. Reason: R8.
11. **"Failed" when a phase never ends.** Recommend failed only at the phase's end or the run's end, "overdue m:ss" live
    meanwhile, no grace. Reason: no invented constant; a late dose still grades overdue, not failed.
12. **Setup actions.** Recommend graded, in their own group, with the order criterion the owner ruled (preoxygenate
    before induce). Reason: E121 made oxygen-before-induction a lesson.
13. **The conditional repeat's anchor** (dantrolene again "every 5–10 min while EtCO₂ rises at unchanged ventilation").
    Recommend: due from the later of (previous dose + 5 min) and (the condition first true), within 5 min. Reason: on
    IP9's A4 MH run through `#/teach2` (`scratch/ip2-gate/head-teach2/`) the doses came at 08:30 and 19:06, 636 s
    apart, and about 3 min after the condition could first hold (ventilation back at 13:48, + 120 s); anchored on the
    first dose it reads "overdue 0:36" where `/1` said met.
14. **An action whose anchor never happens** (K⁺ never above 5.5 on the early path). Recommend `not applicable` with
    the reason line. Reason: the design's table has no grade for it; `/1` says "not assessable".
15. **New rows on the oracle paths.** Recommend the correspondence tables of F8 and F9 as the acceptance, and each new
    row's grade on the A4 path shown to the owner before the card merges. Reason: "verdicts unchanged" can hold only for
    the `/1` objectives; the rest are new judgements.
16. **Where grading runs.** Recommend the host only; a follower shows the prescriptions and "graded on the host".
    Reason: the administration record exists on the host; publishing it is a protocol change for the phone view.
17. **The grade inputs.** Recommend the runner logs rule edges into its state and `grade()` reads them. Reason: pure,
    the same for panel and debrief, restored by a bookmark.
18. **Where the administration record lives.** Recommend the runner's state (rewound by a restore). Reason: the debrief
    already judges the kept course ("the retry is what is judged").
19. **What an A press sends.** Recommend an explicit `give` list per action, tested to grade `met` against its own
    criteria; procedures without an engine command use a scenario `record` action. Reason: composite acts (intubate and
    end the mask oxygen) need a list, and the faithful translation needs the `/1` `onEnter` exactly.
20. **The wire for phases.** Recommend today's `scenario` event with `stateId` = phase id. Reason: ScenarioView, the
    strip, the record and the late-join welcome keep working; no new event.
21. **Signals.** Recommend the engine's additive `state.signals` (pulse, dantrolene effect, set minute ventilation) plus
    the `labs` and `endo` events and the rhythm table. Reason: R4.
22. **Outcome rules' rank.** Recommend truth (rank 3); `map` derived from `sbp`/`dbp`. Reason: an outcome is the
    physiology's answer (§7); a display rank would let a stale cuff decide it.
23. **Today's Instructor view and a `/2` card.** Recommend a message ("run it from Instructor v2"), no buttons; the A4
    rounds of the two demo cards run through `#/teach2` only. Reason: today's view is a state machine's buttons; making
    it read `/2` is a second implementation of F6.
24. **The staged cache after the format lands** (18:30: "until the card format change"). Recommend: A presses give at
    once; a drug from the Drug sheet may be staged and is graded at its applied tick. Reason: an A press is the
    prescription; staging is the sheet's tool.
25. **`pinnedGiveRule`.** Recommend kept for `/1`, unused for `/2`. Reason: disagreement 11.
26. **Stop the trigger** (18:00). Recommend the design's criteria plus a filter criterion printed "not modelled", and an
    outcome "EtAA below X" with X from the owner (the monitor's `etAa`). Reason: the ruling; no invented threshold.
27. **Dantrolene's anchor.** Recommend 300 s from the stop-the-trigger action (§11, the card). Reason: keeps objective
    3's verdict.
28. **The early-signs rule.** Recommend the `/1` rule in F8 step a, §4.1's in step b with the owner's limits. Reason: R5.
29. **Arrest entry.** Recommend `pulseLoss` (§4.1) in step b. Reason: it is the engine's truth; no command rides on the
    entry, so only phase times move (34 s in the haemorrhage A4 run).
30. **Curve rows by a non-IV route.** Recommend F = 0 handled without a depot (dantrolene IM), compartment rows with a
    depot (epinephrine IM), other curve rows stay "not modelled". Reason: disagreement 6.
31. **Card numbers the rulings do not give**: the rhythm-check interval tolerance, whether 178 s meets "every 3–5 min",
    the preconditions for cooling and bicarbonate, the "unchanged ventilation" tolerance, CPR's resumption window
    after a shock. Recommend the owner rules them before F8/F9; until then the cards carry none and the rows read
    deviation or failed where the tables show. Reason: no invented numbers.
32. **The header.** Recommend the whole `/1` header kept. Reason: disagreement 12.
33. **`/1` permanence.** Recommend `/1` readable for good; no removal piece. Reason: sixteen cards stay `/1`.
34. **CPR after a shock.** In `/1` the shock's transition restarts CPR (`postShock1` `onEnter`); in `/2` it is the
    team's act. Recommend an action "resume CPR" (a repeat of CPR) after each shock, its window for the owner (Q31); the
    harness presses it on the shock's tick in step a. Reason: the anti-goals forbid the card doing what the team does.

### Critical files for implementation
- `packages/controller/src/scenario/driver.ts` (`load`, `wrap`/`observe`, `onEngine`, `step`)
- `packages/controller/src/scenario/runner.ts` (the `/1` model F2 mirrors, never edited)
- `apps/demo/src/app/record.ts` and `debrief.ts`
- `apps/demo/src/app/teach2/rows.ts` and `drug-sheet.ts`
- `apps/demo/src/app/showcase/harness.ts`
- `packages/engine-core/src/l2/pk/pipeline.ts` (`validatePk` routes, `IV_ROUTES`)
