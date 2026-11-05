# Scenario format `pme-scenario/2`: implementation plan

**Status:** draft, amended after review (below). Written 2026-10-29 by the planner from `origin/main` 5808d0b6
(Instructor v2 merged in #177, the format design merged in #176). No code, card or engine file was changed. Spec:
`docs/plans/scenario-format-v2.md` (the design, "§n" below). Rulings read: the orchestrator's log, 2026-10-29 17:00,
17:20, 18:00 and 18:30. Shape: `docs/plans/instructor-panel-v2-plan.md` and `stage-11-scenarios.md`. Every `file` named
below is a starting point; find code by the function name. Every hour figure is an estimate (est.), not a measurement.

**Amended 2026-10-29 after review.** An independent read-only review of PR #180 (the orchestrator's
`scratch/reviews/review-plan-180.md`, outside the repository) read the plan against the code at 5808d0b6: build from it
after amendments, no part replanned. The amendments are applied below in the review's priority order (the oracle of
F8/F9 step a; a `/1` fixture freeze before F8; goldens for all sixteen `/1` cards, re-baselined on each piece's parent;
F4's inputs; the dependencies and the shared files; the gaps; two new pieces; rule guards; small corrections to the
claims). Each amended passage is marked "(amended 2026-10-29 after review)". The orchestrator's answers to the questions
it can settle are in "Answers" at the end; the owner's questions stay open there.

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
- Rule guards (amended 2026-10-29 after review): expected failures read "0, none added" in every piece. No phase rule,
  harness predicate or card number is bent to make a number match: a difference is explained in the phase-timing table
  (F8), never tuned away. The Q13 and Q31 numbers come from the owner with a clinical source before the A4 grades are
  measured, never from the A4 path; the grades are printed, never tuned to.
- Card steps stay out of the staged cache until the format lands (18:30 ruling 3); see Q24 for after.
- The arrest-phase sheet (18:30 ruling 4) and the preparation bench (18:00 ruling) are NOT in this plan. Nothing here
  builds them; the administration record leaves room for them (F3).
- Executors never merge, tag or push gh-pages. One piece per PR, branch `feat-fv2-<piece>` from `origin/main`.

**Architecture in one paragraph.** A `/2` document gets its own schema file, its own types and its own runner class
(`PhaseRunner`), chosen by the driver from `doc.schema`. The `/1` runner is not touched. The driver sees every command
the host dispatches (the host's target is `driver.host`), accepted or refused, so it builds the administration record
there. (amended 2026-10-29 after review) Three paths miss the driver. The Ventilator view's cockpit frames go straight
to the monitor (`apps/demo/src/app/session.ts` `linked().dispatch`; only the hand-over at close goes through
`driver.host`), so ventilation settings changed in the cockpit cannot be recorded or graded until that path is routed
through the driver (a roadmap row, F10); an A press's ventilation `give` goes through the driver and is recorded.
Commands the HostSession refuses before dispatch (a viewer's commands, every command during a fast-forward) never reach
the driver, so they never reach the record. `time` and `scenario` commands are handled before the target, which is
harmless for grading. The runner keeps the phase timeline, the administration record and the edges of every named rule
in its plain-JSON state, so a bookmark restores all three and a replay reproduces them. `grade()` is a pure function in
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
# the /1 goldens, re-baselined on this piece's PARENT, not on F0 (amended 2026-10-29 after review):
PME_TEST_SET=showcase PME_SHOWCASE_PRINT=1 npx -y pnpm@9.15.9 --filter @pme/demo test -- malignant-hyperthermia \
  haemorrhage-anaphylaxis healthy-induction induction-after-premedication stab-wound-tamponade
npx -y pnpm@9.15.9 --filter @pme/controller test -- scenario
# + F0's golden tool (scratch/fv2-gate/tools/): the sixteen /1 cards' unattended runs
# each run once on the parent into scratch/fv2-gate/<piece>/parent/ and once on the head: the diff is empty
# expected failures: 0, none added
```
Engine pieces (F4, F5) add: `npx -y pnpm@9.15.9 --filter @pme/engine-core test` and `--filter @pme/validation test`
with every validation number unchanged, except F5's new rows.

(amended 2026-10-29 after review) Each piece records the goldens on its own parent (`origin/main` at its branch point,
again after a rebase) and diffs its head against them. F0 is recorded once, and engine fixes are in flight
(`fix-chemoreflex-efferent`, `fix-e134-anaerobic-k`, `fix-arterial-beat-detector`); a merged physiology change would
break "equal to F0" for reasons that have nothing to do with the piece. F0 stays the reference for the kit-round and
debrief goldens and for the 1 Hz traces F2, F8 and F9 measure on, and is re-recorded on F8's parent if a physiology PR
merged after it.

---

## Partition and ordering

(amended 2026-10-29 after review)
```
F0 baseline (first, on base): goldens of all sixteen /1 cards and the two demo cards
F1 schema, types, validation; every /1 reader narrowed            (after F0)
Wave A (parallel, after F1): F2 phase runner · F4 engine signals · F5.1a routeHonoured export (engine only)
F3 record + grade() (after F2: observe appends to PhaseRunner's state; grade.ts may be drafted from F1 on)
F5.1b "route not modelled": the record's flag and the validator's warning (after F3 and F5.1a)
F5.2 route models (engine only; parallel from F1 on; not on the critical path of the two cards)
F5.3 the "not modelled" register (after F3 and F5.2)
Wave B (after F2, F3, F4, F5.1b): F6 Instructor v2 · F7 debrief and export
F7.5 /1 fixture freeze (after F6, F7; waits on the owner's Q23) · F7.6 Persian strings for pme-debrief/3 (after F7)
F8 MH card (after F7.5 and the answers), F9 haemorrhage card (after F8's harness change)
F10 authoring guide, CHANGELOG, roadmap rows (with F9)
F11 integration and measurement (last)
```
Merge order: F0 (no PR), F1, F4, F5.1a, F2, F3, F5.1b, F6, F7, F7.6, F5.2, F5.3, F7.5, F8, F9, F10, F11. F7.6 must
merge before a `/2` MH card reaches a release line.

Shared files and who edits each (amended 2026-10-29 after review). Each piece owns its own method or block; the later
one in merge order rebases.
- `packages/controller/src/protocol.ts`: F1 (`ClinicalEvent` widened) and F3 (`CommandBase.actionId?`, metadata like
  `batch`; the scenario command's `record` action). F2 adds nothing (the phase uses the existing `scenario` event,
  Q20). F4 types `signals` in engine-core's `types-hemo.ts`, not here. F3 rebases after F1.
- `packages/controller/src/scenario/driver.ts`: F1 (`load` refuses `/2` until F2), F2 (runner choice, stage marks per
  phase, `position()`/`step()` on a `PhaseRunner`), F3 (`observe`, the `record` action), F4 (`onEngine`: `labs`, `endo`,
  `signals` to a `PhaseRunner` only). F3 and F4 rebase on F2.
- `packages/controller/src/scenario/index.ts`: F2 (`PhaseRunner`, `rules`) and F3 (`grade`, the `admin` types). F3
  rebases on F2.
- `packages/controller/src/scenario/types-v2.ts`: F1 creates it with the shared types; F2 adds `pme-scenario-runner/2`'s
  state type; F3 changes `Administration` only by adding a field, with F1's type test updated in the same commit.
- `packages/controller/src/scenario/view.ts`: F1 (narrowing) and F2 (phase labels, `ended()`).
- `packages/controller/test/scenario/driver.test.ts`: F1, F2, F3, F4 and F5.1b each add their own `describe` block and
  never edit another's.
- `apps/demo/src/app/record.ts`: F1 (narrowing), F6 (phase rows, so the strip and cue read them) and F7 (the copied
  grade inputs). F7 rebases on F6.
- The generated docs: `docs/model/control.md` (F1, F2, F3, F4 through the driver, F5.1b), `docs/model/pharmacology.md`
  (F5.1a, F5.2), `docs/model/engine-runtime.md` and `pressure-waveforms.md` (F4), `docs/model/README.md` and
  `docs/validation/known-misses.md` (every piece). Never merged by hand: on a conflict take either side, rebase and
  regenerate with the common gate's line.
- `docs/guides/known-deviations.md`: F5.3, and F8/F9 for their own cards' "not modelled" lines.

## File map

(amended 2026-10-29 after review): rows added for `triggers.ts`, `session.ts`, `patient.ts` (F1), `view.ts` (F2), the
split of F5, F7.5 and F7.6.

| File | Piece |
|---|---|
| `packages/controller/scenarios/pme-scenario-2.schema.json` (new), `src/scenario/types-v2.ts` (new) | F1 |
| `src/scenario/validate.ts`, `types.ts` (`AnyScenarioDoc`, `isV2`), `view.ts`, `panel/scenario-tab.ts` (narrowing only) | F1 |
| `src/protocol.ts` (`ClinicalEvent` = the engine's event shapes) | F1 |
| apps/demo readers narrowed: `card-read.ts`, `record.ts`, `debrief.ts`, `debrief-moments.ts`, `scenarios.ts`, `cards.ts`, `sessionbar.ts`, `link.ts`, `triggers.ts`, `session.ts`, `panel/scenario.ts`, `views/scenarios.ts`, `views/debrief.ts`, `teach2/*`; controller `src/scenario/patient.ts` | F1 (narrowing only, no behaviour change for `/1`) |
| `src/scenario/phase-runner.ts` (new), `rules.ts` (new: leaves, slope ring, edges), `replay.ts` (a `/2` branch), `driver.ts`, `index.ts`, `view.ts` (phase labels, `ended()`) | F2 |
| `src/scenario/admin.ts` (new), `grade.ts` (new), `driver.ts` (`observe`, the `record` action), `protocol.ts` (`actionId?`, `record`) | F3 |
| `packages/engine-core/src/engine.ts` (state event), `types-hemo.ts` (`signals`), `driver.ts` `onEngine` | F4 |
| `packages/engine-core/src/l2/pk/pipeline.ts` (`routeHonoured`), `index.ts` (its export and `IV_ROUTES`'s) | F5.1a |
| `src/scenario/admin.ts` (the `routeNotModelled` flag), `src/scenario/validate.ts` (the warning) | F5.1b |
| `packages/engine-core/src/l2/pk/{row,pipeline,combine}.ts`, `data/rows-other.ts` (dantrolene), `data/rows-cardiovascular.ts` (epinephrine), `docs/model/*` | F5.2 |
| `docs/guides/known-deviations.md`, one literal-titled `.todo` per "not modelled" harm in the owning test file | F5.3 |
| `apps/demo/src/app/card-read.ts` (`phasesOf`, `actionRowsOf`), `teach2/{strip,cue,rows,action,press,drug-sheet,cache,sheets,dock}.ts`, `teach2/*.css`, `record.ts` (phase rows), `scenarios.ts` (a `/2` card's case details), `sessionbar.ts` (Debrief ready), `panel/scenario.ts` (the `/2` message, Q23) | F6 |
| `record.ts` (grade inputs), `debrief.ts`, `debrief-export.ts`, `views/debrief.ts`, `views/debrief.css`, `scripts/showcase/debrief-fa.mjs`, `docs/showcase/i18n/*` (English fallbacks only) | F7 |
| frozen `/1` copies of `showcase-mh.json` and `showcase-haemorrhage.json` (test fixtures), and every test, e2e file and showcase suite that loads them as `/1` (list in F7.5) | F7.5 |
| `docs/showcase/i18n/fa-debrief.json`, `scripts/showcase/debrief-fa.mjs` (if a key changes), `packages/validation/test/debrief-fa.test.ts` | F7.6 |
| `showcase/showcase-mh.json`, `showcase/harness.ts`, `showcase/malignant-hyperthermia.slow.test.ts`, `debrief-showcase.test.ts`, `card-read.test.ts`, `teach2/*parity*.test.ts`, `scripts/showcase/kit-round-a.kitround.ts`, `docs/showcase/SHOWCASE-2-*.md`, `docs/showcase/RUN-STEPS.md` and `KIT-GATE.md` where they name the MH states | F8 |
| `showcase/showcase-haemorrhage.json`, `showcase/haemorrhage-anaphylaxis.slow.test.ts`, the same tests and docs | F9 |
| `docs/guides/scenario-authoring.md`, `packages/validation/test/docs-examples.test.ts`, `CHANGELOG.md`, `docs/roadmap/*` | F10 |
| `apps/demo/e2e/teach2-*.e2e.ts`, `debrief.e2e.ts` | F11 |

---

## Pieces

### F0: Baseline and goldens (3 h est.) (amended 2026-10-29 after review)
- Worktree from `origin/main`; copy this plan in.
- Record to `scratch/fv2-gate/base/`:
  - `PME_SHOWCASE_PRINT=1 PME_TEST_SET=showcase` output of the five slow tests: `malignant-hyperthermia`,
    `haemorrhage-anaphylaxis` (the haemorrhage and anaphylaxis cards), `healthy-induction`,
    `induction-after-premedication`, `stab-wound-tamponade` (every printed number), and the controller's scenario
    tests (`packages/controller/test/scenario/`, the eleven built-ins);
  - a golden for EACH of the sixteen `/1` cards, not only the two demo cards (the five other showcase cards and the
    eleven built-ins in `packages/controller/scenarios/`): a tool in `scratch/fv2-gate/tools/` (not committed) runs each
    card unattended through the harness (no press, for `durationMin` or 10 min) and writes its state log (entries and
    times), the engine's received commands (type, payload, applied tick) and a 1 Hz trace. Bronchospasm and the eleven
    built-ins have no slow test; this run is their golden. The common gate re-runs the tool on each piece's parent;
  - the A4 MH and A4 haemorrhage kit rounds, Chromium and WebKit, through `#/teach2` (`PME_PANEL=teach2`) and through
    today's view: the Debrief JSON (`record.rows` with times, `objectives[].verdict.status` and `why`, `steps`,
    `judged`), the state log, the press times;
  - the Q1 talk test (MH only): the three stops' times and their Explore values;
  - a 1 Hz engine trace of the A4 MH and A4 haemorrhage paths from the harness (state values, `labs`, `endo`
    `mhActivity`, `truth` `hemo.circ.arrest` and the dantrolene effect), as JSON. F2 replays it; F8 and F9 measure the
    proposed phase limits on it (§12 Q1).
  - `scratch/ip2-gate/base/` holds IP9's goldens; reuse its tools, re-record on this base.
- **Gate:** the goldens exist for all sixteen `/1` cards and the two demo cards, the five slow tests are green on base,
  the trace files load, and the golden tool run twice on base gives identical files (it is deterministic).
- Instructor v2: nothing.

### F1: Schema, types and validation for `/2`; every `/1` reader narrowed (11.5 h est.)
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
  judged; the engine does not model it"): added by F5.1b from `routeHonoured`, not here (amended 2026-10-29 after
  review), so one piece owns it with the record's flag.
- `protocol.ts` `ClinicalEvent`: the engine's shapes (§9.1 side finding, wider than the design says): `route: PkRoute`,
  `overS`, `concentrationPct`, and the kinds `infusion`, `tci`, `vaporiser`, `airwayDevice`, and the fluids the cards
  already send (`saline`, `balanced`). Types only: the schema already accepts them (`kind` only).
- `driver.ts` `load`: a valid `/2` document is refused with "pme-scenario/2 cards run from F2 on" until F2.
- Narrowing: change `ScenarioView.doc`, `RunData.doc` and the card-read inputs to `AnyScenarioDoc`, and
  `validateScenario`'s return type to `AnyScenarioDoc`, and let the type checker find every reader. Each `/1` path stays
  as it is; each reader gives a `/2` doc the empty answer (no states, no objectives). Readers today: `view.ts`,
  `panel/scenario-tab.ts`, `card-read.ts`, `record.ts` (`doc.states.find` would throw on a `/2` doc), `debrief.ts`,
  `debrief-moments.ts`, `scenarios.ts`, `cards.ts`, `sessionbar.ts`, `link.ts`, `panel/scenario.ts`,
  `views/scenarios.ts`, `views/debrief.ts`, `teach2/{course,cue,dock,drug-sheet,rows,strip}.ts`. (amended 2026-10-29
  after review): also `apps/demo/src/app/triggers.ts` (`doc?.states.find` at its `name` helper would throw on a `/2`
  doc), `session.ts` (`loadScenario` takes `validateScenario`'s result) and the controller's `src/scenario/patient.ts`
  (`engineOptionsOf` reads the header, which `/2` keeps whole). The type checker finds all three once `validateScenario`
  returns `AnyScenarioDoc`.
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

### F2: The phase runner (12 h est.)
- `phase-runner.ts` (new) `PhaseRunner`: the surface the driver uses (`start`, `advance`, `pause`, `resume`, `getState`,
  `setState`, `log`, `doc`, `seed`, `stateId` = current phase id, `enteredT`, `entries`, `history`). (amended 2026-10-29
  after review) It also exposes what Instructor v2 already reads through the driver: `vitalHolds()` (the A-row bar,
  `teach2/action.ts`; for a `/2` card, the progress of each value leaf with `forS` and the window fill of each `slope`
  and `unchanged` leaf in the current phase's `next` rules), `state()` (the current phase, read by `driver.step()`), and
  `batch` in its state (read by `driver.position()`). `RunnerState` for `/2` is `pme-scenario-runner/2`: the `/1` fields
  it still needs, plus `phases: PhaseEntry[]` (bounded at 500 entries; the `/1` history keeps its 200), `admin:
  Administration[]` (filled by F3), `edges: RuleEdge[]` (bounded per rule), the slope rings, and the script entries
  fired.
- `rules.ts` (new): the leaves of §4 on RANK 3 only. The runner keeps two value stores, truth (rank 3) and display (rank
  2); today's runner keeps one value per name and rank 3 shadows rank 2, so the `/1` store cannot serve §7's judged
  clocks (Q22). `slope`: one ring buffer per variable named in the card, 1 Hz, the window's least-squares slope.
  `unchanged`: the set minute ventilation (F4 signal) within ±tolerance over the window. `visited`: a phase in the
  timeline. `signal`: `pulseLoss`, `rosc`, and the rhythm (amended 2026-10-29 after review): the leaf reads the rhythm
  ID (or the rhythm table's flags, e.g. `continuous: 'vf'`), not `RHYTHMS[id].group`. VF shares the `ventricular` group
  with VT and idioventricular, asystole is in `arrest`, junctional in `svt` (`l2/ecg/rhythms.ts`), so a PEA / VF /
  asystole split cannot be made by group alone. No engine change. `all`, `any`, `not`.
- Each tick: the entry rules of the current phase's `next`, in document order; the first that holds wins; at most one
  phase change per tick (§4, §12 Q6). Every rule named anywhere in the card (phase rules, action anchors and
  preconditions, conditional repeats, outcomes, judged display rules) is evaluated each tick and its true/false edges
  appended to `edges` (Q17). That is what keeps `grade()` pure.
- Script: an entry fires once per anchor (phase entry, the nth taking of an action as F3 records it, or scenario time);
  its commands go out as one stage group, labelled card-set in the run log; never graded (§3, §12 Q4). (amended
  2026-10-29 after review) An entry anchored on an action's nth taking fires in the SAME stage group and the same poll
  as the press that anchors it (O4, F8), as `/1`'s `condition: mh` went in the same group as propofol and
  succinylcholine (`driver.ts`: one group per batch). Tested tick for tick.
- Driver: `load` builds a `PhaseRunner` for a `/2` doc; `step` places one stage mark per phase entry (no hops in `/2`);
  `restoreBookmark` and `hold` take a `pme-scenario-runner/2` state; `welcomeEvents` publishes the current phase.
  Phase changes go out as today's `scenario` event, `stateId` = phase id, `transitionId` = `enter:<phaseId>` (Q20), so
  `ScenarioView`, the strip and the late-join welcome need no new event.
- `view.ts` (amended 2026-10-29 after review): a `/2` branch so followers and the Remote show the phase's `label` (today
  `current()` reads `states`), and `ended()` for both formats: `/1` today's rule (the current state has no transitions);
  `/2` the current phase has an empty `next`. F6 points the Debrief "ready" flag at it. The `/1` behaviour is unchanged.
- `replay.ts`: a `/2` branch: decisions = phase entries and script firings.
- **Tests first** (synthetic inputs, no engine):
  - each leaf true and false at its edge, `forS` held and broken, the slope over a window, `unchanged` at ±tolerance;
  - `next` order wins; one change per tick; `not`; `visited`;
  - the timeline, admin and edges survive `getState`/`setState`; a restore rewinds them; `replayRunLog` reproduces
    the decisions;
  - a script entry fires once on its anchor and is labelled card-set; one anchored on a press is in the press's stage
    group, tick for tick;
  - `signal` tells VF from VT and asystole from PEA by the rhythm id;
  - `vitalHolds()` on a `/2` fixture; `view.ts` a `/2` label and `ended()` for both formats;
  - the F0 MH trace replayed through a `/2` fixture card: the phase sequence and entry times are PRINTED for F8, not
    asserted (amended 2026-10-29 after review). On the A4 path EtCO₂ climbs back at normal ventilation and a second dose
    follows, so the §4.1 model may well enter `recrudescence`, and the limits are † (§12 Q1 is open);
  - `driver.test.ts`: a `/2` card loads, publishes its phases, places one stage mark per phase entry, restores.
- **Acceptance:** the `/1` runner, its tests and the `/1` goldens unchanged.
- **Must not touch:** `runner.ts`, `view.ts`'s `/1` behaviour, apps/demo.
- **Instructor v2:** nothing yet; the strip already lists whatever `ScenarioView` publishes, F6 makes it read phases.
- **Gate:** common, with `@pme/controller`.

### F3: The administration record and `grade()` (14 h est.)
(amended 2026-10-29 after review) After F2: `observe` appends to `PhaseRunner`'s state, so F3's driver part needs F2;
`grade.ts` and its table tests depend only on F1's types and may be drafted from F1 on. The record's `routeNotModelled`
flag is F5.1b's.
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
event carries the StateVars AND `rhythm` `{id, rateBpm}` AND `breathing` (§9.3 says StateVars only); pH, lactate and K⁺
come in the `labs` event; MH activity in the `endo` event; the pulse and the dantrolene effect only in the `truth` tree,
which is an opt-in developer event (`truthHz` 0 by default, pruned, at most 2 Hz). (amended 2026-10-29 after review) The
demo app (`session.ts`) and the harness both mount with `truthHz: 1`, so the truth tree is there in the room; R4 holds
for an embedder only, which is why the signals still go on the `state` event.
- The driver's `onEngine` also takes `labs` (`ph`, `lactate`, `k`), `endo` (`mhActivity`) and `signals` as rank 3, and
  feeds them to a `PhaseRunner` ONLY, never to the `/1` runner (amended 2026-10-29 after review): the `/1` runner's
  `take()` treats any input that is not clinical or sensor as `values` and would throw on a `signals` input
  (`Object.entries(undefined)`), and a rank-3 `k` or `map` would shadow the `/1` cards' vital vars (`map` is a rank-2
  alias of `abpMean`/`nibpMean`). Today's cards use neither, so the goldens would not catch it; a test does.
- The engine adds one typed, additive field to the `state` event (`types-hemo.ts`): `signals: { pulse: boolean;
  dantroleneE: number; setMinuteVentilationLMin: number | null; map: number }` (Q21). `map` is the engine's existing
  beat MAP, the beat mean of the arterial pressure wave (`l2/hemo/pipeline.ts`, the site beat statistic behind
  `abpMean`), NOT one derived from `sbp`/`dbp` (amended 2026-10-29 after review): a formula constant (1/3 or 0.4) would
  give a MAP that is neither truth nor display. No physiology changes.
- **Tests first:** engine-core: the field is present each state event; `pulse` flips with `hemo.circ.arrest`;
  `dantroleneE` equals `bus.metabolic.dantroleneE`; set minute ventilation equals the ventilator's rr × VT. Controller:
  `onEngine` feeds rank-3 `signals` inputs to a `PhaseRunner`; with `truthHz: 0` the phases still move; a `/1` card's
  runner receives exactly today's input kinds and values (no `signals`, no rank-3 `k` or `map`); `signals.map` equals
  the beat MAP the engine computes.
- **Acceptance:** every engine and validation number unchanged; the traces equal on the parent (common gate).
- **Must not touch:** any physiology module, the renderer, the skins.
- **Instructor v2:** nothing.
- **Gate:** common plus the engine additions.

### F5: Route models, "route not modelled" first (15 h est.: F5.1a 1 h, F5.1b 1 h, F5.2 12 h, F5.3 1 h)
The rulings ask for route models wherever a route is judged, with "route not modelled" shown until then (17:00).
(amended 2026-10-29 after review) F5.1 is split so that its acceptance in `admin.ts` and `validate.ts` is owned by one
piece (F5.1b), after F3.

**F5.1a `routeHonoured` (1 h est.; Wave A, engine only).**
- engine-core exports `routeHonoured(drugId, route): boolean` (from `row.routes ?? IV_ROUTES`), so the validator, the
  record and the Drug sheet ask the engine instead of parsing the refusal's sentence. `IV_ROUTES` is exported from
  `l2/pk/pipeline.ts` but not re-exported from the package index; the index exports both.
- **Tests first:** `routeHonoured` for every row and route equals what `validatePk` accepts.
- **Gate:** common plus the engine additions.

**F5.1b "route not modelled" in the record and the validator (1 h est.; after F3 and F5.1a).**
- The record's `routeNotModelled` flag (`admin.ts`) comes from `routeHonoured`; `validateScenario` warns for a judged
  route the engine does not honour ("dantrolene: route im is judged; the engine does not model it").
- **Tests first:** the IM dantrolene administration carries the flag (`driver.test.ts`, its own block); the validator
  warns for a card that judges IM, and a `/1` card validates exactly as before.
- **Gate:** common, with `@pme/controller`.
- Instructor v2 (in F6): the ACTION row and the Drug sheet print "IM: route not modelled"; the debrief line (F7) the same.

**F5.2 the route models (12 h est.; engine only, parallel).**
- One mechanism, per drug row and route: `{ F, ka, lagS, src }`, plus an optional local effect (an output event).
- The design's "depot feeding the existing central compartment" fits compartment rows only. Dantrolene is a curve row
  (`gammaPk`) with no compartment; epinephrine is a compartment row (`vaso`). So:
  - F = 0 needs no depot: the dose is accepted, gives no systemic effect, and raises the local effect. Dantrolene IM: no
    systemic effect and a local tissue-injury event (the reconstituted solution's pH about 9.5); the monitor shows
    nothing (§9.2). Its source for F = 0 is the owner's 17:00 ruling ("IM dantrolene = no effect + local harm") (amended
    2026-10-29 after review); the product label's "IV only" is an instruction, not a bioavailability, and gives the
    solution's pH.
  - A compartment row with F > 0 gets a first-order depot feeding its central compartment. Epinephrine IM (thigh): peak
    about 8 min (Simons 2001). F and ka are taken as stated by a PK source, never back-solved from a peak time (Tmax)
    (amended 2026-10-29 after review): a ka fitted to Simons' Tmax is a fitted constant. With no source giving F and ka,
    the route stays "route not modelled".
  - A curve row with 0 < F < 1 stays "route not modelled" (it would need its own curve; roadmap row).
  - Epinephrine by the tracheal tube stays "route not modelled" (§9.2).
- `docs/model/*` regenerated: the new rows with their sources; evidence first, no fitted constant (a parameter without
  a source is not added; the route then stays "not modelled").
- **Tests first:** dantrolene IM accepted, `dantroleneE` stays 0, MH activity unchanged against the untreated trace, one
  local-effect event; epinephrine IM with the source's F and ka: the Cp peak time is PRINTED against the source's range,
  and a miss goes to the owner with both values, never closed by moving ka (amended 2026-10-29 after review); every
  IV/IO/central number unchanged (validation suite).
- **Acceptance:** the validation suites unchanged except the new rows; the traces equal on the parent; each new
  parameter names its source in the row; F = 0 for IM dantrolene cites the 17:00 ruling.
- **Must not touch:** any IV kinetics; the cards; apps/demo.
- **Instructor v2:** nothing new: the "route not modelled" label disappears for the routes now modelled.
- **Gate:** common plus the engine additions; the model-docs guard.

**F5.3 The "not modelled" register (1 h est.; after F3 and F5.2) (amended 2026-10-29 after review).**
Without an entry, the debrief's "harm not modelled" line names a gap no list carries.
- One registered entry for every harm or device the plan declares "not modelled": IM dantrolene's local tissue injury
  and its CK and K⁺ effects (Q7), the charcoal filter (18:00 ruling; Q26's criterion), and any other "not modelled"
  line F3's violations can print for the two cards (F8 and F9 add their own cards' lines the same way).
- The mechanism: `docs/validation/known-misses.md` is generated only from expected-failure tests with a published band,
  and an unmodelled harm has no band the model misses, so an `it.fails` would be wrong and would break "0, none
  added". Each entry is a literal-titled `.todo` in the owning test file (e.g. the F5.2 dantrolene IM file), which
  `scripts/deviations.ts` lists and `docs-honesty.test.ts` forces into `docs/guides/known-deviations.md` ("Tests not
  run"), with its tracking row (the engine roadmap row of Q7, the 18:00 roadmap row for the filter).
- **Tests first:** `docs-honesty.test.ts` green with the new rows; the known-misses count unchanged.
- **Gate:** common; the model-docs guard.

### F6: Instructor v2 reads `/2` (14 h est.)
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
- Today's view (`panel/scenario.ts`): a `/2` card shows "This card is pme-scenario/2: run it from Instructor v2" and no
  state buttons (Q23). One guarded branch; the `/1` path byte-identical. (amended 2026-10-29 after review) This waits on
  the owner's Q23: it would remove today's view as the room's fallback for the two demo cards (the 03:10 ruling made v2
  an ADDITIONAL view).
- (amended 2026-10-29 after review) The library's case details (`scenarios.ts` reads `doc.objectives`, so a `/2` card
  would list none): for a `/2` card, its actions' and judged rows' titles. The Debrief "ready" flag (`sessionbar.ts`,
  `teach2/dock.ts` read "ended" as `!sv.current()?.transitions?.length`, true from the start for a `/2` doc under F1's
  empty answer): both read F2's `ScenarioView.ended()`.
- **Tests first:** `card-read.test.ts` on a `/2` fixture card (phases, rows, words); `rows.test.ts` (each look, the
  live clock strings, a follower without a record); `strip.dom.test.ts` (a `/2` future chip does not send `goto`; a
  `/1` one still does); `drug-sheet.dom.test.ts` (route choice; IM dantrolene sends `route: 'im'` and the row reads
  "route not modelled"); `press.dom.test.ts` (an A press sends `give` with `actionId`, no `trigger`); the IP9 parity
  tests unchanged for `/1`.
- **Acceptance:** `teach2-fit.e2e.ts` at 1440 × 900 with a `/2` fixture card: no scroll, every open action a row, no row
  disabled; the `/1` goldens of IP9 identical. (amended 2026-10-29 after review) The visible-surface checks (O5, F8) on
  the `/2` fixture card, each printed in the PR: the strip lists its phases; one stage mark per phase entry; which rows
  are pressable when; the record's `who` of an A press ("team", R10); the library's case details; the Debrief "ready"
  flag false until a terminal phase; the follower/Remote phase label.
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
  the Persian strings are F7.6's (amended 2026-10-29 after review).
- `views/debrief.ts`, `views/debrief.css`: the sections; print bounds as IP8 (page 1 ≤ 267 mm, handout 1 page).
- **Tests first:** `debrief.test.ts` (the `/3` keys; the `/2` keys unchanged); `record.test.ts` (copied inputs survive
  `keep()`/`resume()` and a restore); `debrief-showcase.test.ts` on a `/2` fixture card on the engine: the debrief's
  grades equal the panel's at the end of the run (same function, same inputs).
- **Acceptance:** `debrief.e2e.ts` on both projects, 3 of 3 runs; a `/1` run's export byte-identical to the same run's
  on F7's parent (amended 2026-10-29 after review).
- **Must not touch:** the engine, the controller, `/1` verdicts.
- **Gate:** common, with `@pme/demo`; `debrief.e2e.ts`.

### F7.5: Freeze the two demo cards' `/1` copies as test fixtures (3 h est.) (amended 2026-10-29 after review)
F8 and F9 rewrite `showcase-mh.json` and `showcase-haemorrhage.json` in place. About twenty `/1` tests and tools load
them as `/1` fixtures, so "IP9's parity tests stay green" and step a's reference run (O1: the `/1` card on the same
commit) cannot hold without a frozen copy. **Waits on the owner's Q23**: it decides whether today's-view suites retarget
to Instructor v2 or to the fixture.
- Frozen copies, byte for byte from `origin/main`, e.g. `apps/demo/src/app/showcase/fixtures/showcase-mh.v1.json` and
  `showcase-haemorrhage.v1.json` (ids unchanged; not listed in the library).
- Repointed to the fixtures (the review's list; re-check with `grep -rln "showcase-mh\|showcase-haemorrhage"`):
  - `apps/demo/src/app/`: `card-read.test.ts`, `debrief-moments.test.ts`, `debrief-showcase.test.ts`,
    `position.dom.test.ts`, `console-pages.dom.test.ts`, `showcase.test.ts`,
    `teach2/{action-parity,cache,cue,drug-sheet,integration,press,strip}.dom.test.ts`, `teach2/rows.test.ts`,
    `views/debrief-handout.dom.test.ts`;
  - `packages/controller/test/scenario/stage-marks.test.ts`, `packages/validation/test/debrief-fa.test.ts`,
    `packages/engine-core/test/engine/endo-acceptance.test.ts` (a comment);
  - the e2e files `debrief`, `reload-keeps-case`, `scenario-panel-stale-press` (presses `triggerOff` in today's view),
    `ui-polish-a`, `ui-polish-b`, `teach2-fit`, `teach2-keys`;
  - `scripts/showcase/rehearsal.showcase.ts` and `time-control.showcase.ts` (they wait for `earlySigns` and press the
    crisis in today's view).
  Tests that are about the demo card itself (the slow tests, `showcase-cards.test.ts`, the kit round) stay on the live
  card and move with F8/F9.
- **Tests first:** each repointed test green on the fixture, unchanged in what it asserts; a fixture test: each frozen
  copy equals `origin/main`'s card at F7.5's branch point and validates as `/1`.
- **Acceptance:** every repointed test, e2e file and showcase suite green on both projects; the common gate.
- **Must not touch:** the live cards, the engine, the controller's source.
- **Gate:** common, with `@pme/demo`, `@pme/controller`, `@pme/validation`; the repointed e2e files.

### F7.6: Persian strings for `pme-debrief/3` (3 h est., plus the owner's read) (amended 2026-10-29 after review)
F7 ships English fallbacks only, so a `/2` MH handout would print mixed English and Persian; the MH Persian handout is a
printed demo deliverable.
- Every new `/3` key in `docs/showcase/i18n/fa-debrief.json`, drafted ONLY through the persian-writing skill; displayed
  tokens (drug names, units, values) stay untranslated; long right-to-left sentences go to the owner as a file for
  review, and he reads them before the piece merges.
- **Tests first:** `packages/validation/test/debrief-fa.test.ts`: every `/3` key has a Persian entry, no fallback left
  for the two demo cards' strings; the `/2` table unchanged.
- **Acceptance:** the owner's read recorded in the PR; the handout prints one page in Persian (IP8's bounds).
- **Gate:** common, with `@pme/validation`; merged before a `/2` MH card reaches a release line.

### F8: The MH card in `/2` (11 h est.)
Two steps in one PR, so the format change and the physiology change are measured apart.
- **Step a, faithful translation.** `showcase-mh.json` rewritten in place (same id, same file, so the library, the run
  sheets and the kit's locators keep working): 9 phases (§4.1, §11); the actions of §11; the `/1` objectives as their
  rows (correspondence table below). The engine must receive the same commands at the same ticks as the `/1` A4
  path: the `/1` card's `condition: mh` at Induce becomes a script entry on the first taking of the induce action
  (card-set); every A press's `give` equals the `/1` state's `onEnter` it replaces; the early-signs and arrest entry
  rules are the `/1` ones (`etco2 > 45` for 20 s; `sbp < 25` for 10 s) until §12 Q1 and Q29 are answered.
  - `harness.ts`: an `Act` may name an action id (`act: 'dantrolene'`): the harness sends the action's `give` through
    the driver as the panel does, at the same poll. `run.states` records phases.
  - `malignant-hyperthermia.slow.test.ts`: the same arms with action ids.
  - **Oracle (amended 2026-10-29 after review).** "Every printed number equal to F0's; any difference is a bug" is
    dropped: it can fail with a correct translation (`/1` resets hold counters at every hop, `runner.ts` `trueFor = {}`
    on every entry, so `recovering` and the arrest hold come later in `/1`; `/1` reaches `earlySigns` only from
    `surgery` and `recovering` only from `treating`; the arms' acts and keys are on `/1` state ids), and it can pass
    while the course changes (the printed numbers are samples; keys can drift; the harness has no HostSession). In its
    place:
    - **O1 (i) the command stream.** Drive the `/2` card with the `/1` run's ABSOLUTE press times (`run.pressed`;
      F0's, re-recorded on F8's parent per O2), not with `/1`-state predicates. Diff the engine's received commands
      (type, payload, applied tick) and the full 1 Hz trace against the `/1` card (F7.5's frozen copy) run on the same
      commit. Both diffs empty; a non-empty diff is a bug in the translation.
    - **O1 (ii) the phase-timing table.** Each `/2` phase entry against the `/1` state entry it corresponds to, with
      every difference explained (a hop reset, reachability), in the PR. A difference is explained, never tuned away.
    - **O2 re-baseline on the parent.** The reference is the `/1` card on F8's parent commit, not F0. F0 stays for the
      kit-round and debrief goldens (and the traces §12 Q1's limits are measured on) only.
    - **O3 an identical printed key set.** An explicit key-mapping table in the PR (`/1` key → `/2` key, with its
      definition); no key dropped. A key defined on a `/1` state that is not a `/2` phase (`recoveringMin`,
      `recovering2S`, `entered(r, …)`) is redefined in the table and the redefinition stated.
    - **O4 script entries in the press's group.** The script entry on the induce action's first taking fires in the
      same stage group as that press (F2), as `/1`'s `condition: mh` went with propofol and succinylcholine; checked
      tick for tick.
  - **Rule guard:** no phase rule or harness predicate is bent to make the numbers match (no mimicked hop reset, no
    `visited` added for the sake of the oracle).
- **Step b, the owner's model.** `patient.neuro.mhSusceptible: true` and the script entry removed (the engine starts MH
  at the succinylcholine: `MH_SUX_LATENCY_S = 0`, `MH_PROFILE_SEVERITY = 1`, the same t0 and severity as the card's
  condition; the `/1` schema could already carry this). The early-signs rule of §4.1 (slope, unchanged ventilation,
  HR rising) and `pulseLoss` for arrest, with the limits the owner rules (§12 Q1). Re-measure; a number that leaves
  its band goes to the owner with both values; never widened.
- Kit round (`kit-round-a.kitround.ts`): A4 MH and the Q1 talk press action rows under `PME_PANEL=teach2`; the stops
  keep their times (8:10 / 13:50 / 19:11 on the rc.4 path).
- Run sheet and cue cards (`docs/showcase/SHOWCASE-2-*.md`): the rows name actions and phases.
- **Correspondence (the verdict oracle).** (amended 2026-10-29 after review) The table is a prediction, not an oracle,
  until Q13 and Q31 are answered: rows 4, cooling and bicarbonate depend on them, and their numbers come from the owner
  with a clinical source BEFORE the A4 grades are measured. The grades are printed, never tuned to. On the A4 MH path
  (IP9's run through `#/teach2`: early signs 08:08, call 08:10, dantrolene 08:30, ventilation back 13:48, second dose
  19:06; verdicts –, met, met, met, –, met), each `/1` objective and its `/2` row:

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
- **Visible surface (O5) (amended 2026-10-29 after review).** What the oracle cannot see, each printed in the PR before
  and after: the strip (14 `/1` stages → 9 phases); stage marks (fewer and different points: no "start of Intubated" to
  return to); the Say lines; which rows are pressable when (dantrolene can be given before the crisis is called); the
  record's `who` (R10); the library's case details; the Debrief "ready" flag; the follower/Remote phase label; the
  Persian handout (F7.6). Each is a stated difference, not a failure.
- **Must not touch:** the engine; the other cards.
- **Instructor v2:** the MH card shows phases, actions and grades; nothing else changes.
- **Gate:** common (the `/1` goldens now take the MH card from F7.5's fixture), O1–O4, the slow test, A4 MH + Q1 talk
  on both browsers through `#/teach2`, the debrief e2e on the MH run, the O5 list (amended 2026-10-29 after review).

### F9: The haemorrhage card in `/2` (8 h est.)
The same two-step method (the haemorrhage has no physiology change in step b except the entry rules, so step b may be
empty).
- 7 phases (§4.2): bleeding (script: the 2.5 L bleed over 10 min at 0 s), decompensating (`sbp < 60` for 10 s; script:
  junctional 50/min on entry; the `/1` card also lets a press force it, which a phase cannot), arrest PEA / VF /
  asystole (`pulseLoss` with the rhythm id, not its group (amended 2026-10-29 after review)), ROSC (`rosc`),
  post-resuscitation (ROSC held 120 s).
- Actions (§11): oxygen; intubate and ventilate; CPR 100–120/min within 30 s of `pulseLoss`; bag 10/min; epinephrine
  1 mg IV/IO every 180–300 s; source control; massive transfusion (blood at ≥ 300 mL/min); TXA 1 g IV (precondition within
  3 h of the injury); rhythm check every 2 min (it stops CPR; its 1st and 2nd takings fire the VF script: the owner's Q4
  (amended 2026-10-29 after review), since the VF phase is then entered because the instructor pressed a button, one
  step removed); shock 150–200 J; resume CPR after a shock (Q34); stop CPR. Violation: epinephrine 1 mg IV in ROSC.
- **Correspondence** (amended 2026-10-29 after review) (a prediction until Q31 and Q9 are answered, as in F8) on the A4
  (E132) path (`docs/showcase/kit-round-a/e132/`): pulse loss 11:00, CPR 15:39, epi 15:59 and 18:57, checks 17:38 and
  19:46, shocks 200 J, ROSC 20:58, stop 21:56.

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
- **Gate:** as F8, for the haemorrhage card: O1–O5 (amended 2026-10-29 after review).

### F10: Authoring guide, CHANGELOG, roadmap (4 h est.)
- `docs/guides/scenario-authoring.md`: a `/2` section with one validated example (`<!-- example: pme-scenario/2 -->`);
  `docs-examples.test.ts` learns the tag.
- `CHANGELOG.md` Unreleased: the format, the routes modelled, the debrief `/3`.
- Roadmap rows: the arrest-phase sheet (18:30 ruling 4), the preparation bench (18:00), the charcoal filter and the MH
  activity reading the agent level (18:00), curve rows by a non-IV route, grades on a follower (Q16), the in-place swap,
  (amended 2026-10-29 after review) routing the Ventilator view's cockpit through the driver (so ventilation set there
  is recorded and graded), and IM dantrolene's CK and K⁺ effects with sources (Q7).
- **Gate:** common; `docs-examples.test.ts`.

### F11: Integration and measurement (5 h est., last)
- On the merged head: every unit, DOM and slow test; the A4 MH, A4 haemorrhage and Q1 talk rounds on Chromium and WebKit
  through `#/teach2`; `teach2-fit`, `teach2-keys`, `debrief.e2e.ts`; the five other showcase cards and the eleven
  built-ins load and run as on F11's parent (F0's golden tool, re-baselined) (amended 2026-10-29 after review); the O5
  visible-surface list on the merged head; expected failures 0, none added.
- An independent read-only review naming the head.
- **Gate:** all of the above, CI green.

---

## What stays `pme-scenario/1`

- The `/1` schema, runner, replay, the run-log and runner-state TypeScript types, and every `/1` test: unchanged, for
  good.
- Sixteen cards: the five other showcase cards (induction, induction after premedication, anaphylaxis, bronchospasm,
  tamponade) and the eleven built-ins in `packages/controller/scenarios/`. The design's non-goal covers the five; the
  eleven are not mentioned; both stay `/1` (Q33).
- Today's Instructor view runs every `/1` card as today. Instructor v2 runs both formats.
- `pinnedGiveRule`, the `/1` strip's future-click `goto`, `objectives()`, `steps()`, `pme-debrief/2`: kept for `/1`.
- Until F8 and F9 merge, the two demo cards stay `/1` and the rc line's kit is unaffected.

## Effort

(amended 2026-10-29 after review)

| Piece | h (est.) | Wave |
|---|---|---|
| F0 baseline (sixteen `/1` goldens) | 3 | 0 |
| F1 schema, types, validation, readers | 11.5 | 1 |
| F2 phase runner | 12 | A |
| F3 record and grade() | 14 | after F2 |
| F4 engine signals | 3 | A |
| F5.1a `routeHonoured` | 1 | A |
| F5.1b flag and warning | 1 | after F3 |
| F5.2 route models | 12 | parallel |
| F5.3 "not modelled" register | 1 | after F3, F5.2 |
| F6 Instructor v2 | 14 | B |
| F7 debrief and export | 8 | B |
| F7.5 `/1` fixture freeze | 3 | after F6, F7, Q23 |
| F7.6 Persian strings for `/3` | 3 (+ the owner's read) | after F7 |
| F8 MH card | 11 | C |
| F9 haemorrhage card | 8 | C |
| F10 guide, CHANGELOG, roadmap | 4 | C |
| F11 integration | 5 | last |
| **Total** | **≈ 114.5 executor-h (est.)**, plus ≈ 4 h of review | at most 4 executors at a time |

Against the design's 84 h (§13): F0 and F11 are added (5.5 h, now 8); F1 gains the reader narrowing (3 h, now 3.5);
F6 gains the Drug sheet's route and duration and today's view's message (3 h, now 4 with the library and Debrief-ready
reads); F8 and F9 gain the two-step method (3 h, now 6 with O1–O5). After the review: F2 +2 h (`vitalHolds()`,
`state()`, `batch`, the phase label and `ended()`, the rhythm-id leaf), F5.3 +1 h (F5.1's 2 h now split into
F5.1a and F5.1b), F7.5 +3 h, F7.6 +3 h.

## Risks in the code

- **R1. A `/2` doc crashes today's readers.** `record.ts` calls `doc.states.find`, `ScenarioView.current()` and the
  Scenario tab read `states`; a `/2` card loaded before F1's narrowing throws. F1 lets the type checker find them.
- **R2. Grading needs the refused doses.** Only the driver sees them (F3). A remote's refusal never reaches the host's
  record otherwise.
- **R3. Rank 3 shadows rank 2.** The `/1` runner's single value store cannot give the judged rows their display clock.
- **R4. The truth tree is a developer event.** Off by default; phases built on it would not move for an embedder.
  (amended 2026-10-29 after review) The demo app and the harness both mount with `truthHz: 1`, so R4 holds for an
  embedder only; F4's `signals` still go on the `state` event so the phases move there too.
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
- **R11. Hidden `/1` fixtures** (amended 2026-10-29 after review). About twenty tests, e2e files and showcase suites
  load the two demo cards as `/1`; rewriting them in place breaks those without F7.5's frozen copies.
- **R12. Paths around the driver** (amended 2026-10-29 after review). The Ventilator view's cockpit and the
  HostSession's refusals never reach the record (architecture paragraph); ventilation set in the cockpit is neither
  recorded nor graded until it is routed.

## Where the design and the code disagree

1. **Where grading lives.** §8.3 puts `grade()` in `packages/controller/src/scenario/`. Today's shared reading (IP9's
   "one helper": `card-read.ts` `standingOf`, `untakenStatus`) and the run record (`RunData`) are in `apps/demo`. The
   plan follows the design and builds the administration record in the driver.
2. **Refused doses.** §8.2 keeps them in the record. The driver drops them before the runner, `record.ts` sees only
   `commandApplied`, and a Remote's refusal goes to that Remote's ack only. IM dantrolene would be refused by the
   engine (`l2/pk/pipeline.ts`), but no panel can send IM today (14), so in practice the refused dose shows nowhere
   (amended 2026-10-29 after review).
3. **What the `state` event carries.** §9.3: "the StateVars only". It also carries `rhythm` and `breathing`; pH,
   lactate and K⁺ are in `labs`, MH activity in `endo`; pulse and the dantrolene effect are only in the opt-in `truth`.
   (amended 2026-10-29 after review) The demo app and the harness run `truthHz: 1`; R4 holds for embedders only.
4. **Rank 3 and rank 2.** §4 reads rank 3 only and §7 starts judged clocks on rank 2; the runner keeps one value per
   name, rank 3 wins, and `map` exists only as a rank-2 alias (no MAP StateVar).
5. **The event union.** §9.1 names only the route union. The controller's `ClinicalEvent` also lacks `overS`, the kinds
   `infusion`, `tci`, `vaporiser`, `airwayDevice`, the fluids `saline` and `balanced`, and the unit `mmol/kg` (the
   schema checks `kind` only). (amended 2026-10-29 after review) The demo cards send most of them, not all: MH sends
   `infusion`, `vaporiser`, `airwayDevice`, `saline`, `mmol/kg`; haemorrhage sends `airwayDevice`, `balanced`; neither
   sends a drug `overS` or a `tci` (only a fluid's `overS`, which is already typed).
6. **The depot.** §9.2 feeds "the existing central compartment". Dantrolene is a curve row (`gammaPk`) without one;
   epinephrine is a compartment row. `IV_ROUTES` is exported from `l2/pk/pipeline.ts` but not re-exported from the
   package index, so it is not on the package's public surface (amended 2026-10-29 after review).
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
    200-entry history and the replay keys on state entries. `/2` needs its own state and log types (F2). (amended
    2026-10-29 after review) These are TypeScript types; there are no runner-state or run-log JSON schema files.
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
    IP9's A4 MH run through `#/teach2` (`scratch/ip2-gate/head-teach2/`) the doses came at 08:30 and 19:06, 636 s apart,
    and about 3 min after the condition could first hold (ventilation back at 13:48, + 120 s); anchored on the first
    dose it reads "overdue 0:36" where `/1` said met. (amended 2026-10-29 after review) That reason is motivated by the
    oracle path; the anchor and its numbers are the owner's, with a clinical source, before the A4 grades are measured
    (rule guards).
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
22. **Outcome rules' rank.** Recommend truth (rank 3); `map` from the engine's beat MAP in `signals` (F4), not
    derived from `sbp`/`dbp` (amended 2026-10-29 after review). Reason: an outcome is the
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

## Answers

The orchestrator's answers, 2026-10-29, after the independent review. One line each; "accepted" means as recommended
above, with the review's amendment where it names one. The owner's questions stay open and are listed as his.

**Accepted as recommended (the orchestrator).**
- 2026-10-29 Q3 (in part): "name MH from the monitor" stays a judged row (17:00 ruling: recognition objectives are judged rows); the rest of Q3 is the owner's.
- 2026-10-29 Q7: a log and debrief line now ("tissue injury; not modelled", registered by F5.3); CK and K⁺ effects go to the engine roadmap with sources (F10).
- 2026-10-29 Q10: `pme-debrief/3` for a `/2` run; a `/1` run keeps `pme-debrief/2`, unchanged.
- 2026-10-29 Q14: an action whose anchor never happens grades "not applicable" with its reason line; the owner is told.
- 2026-10-29 Q15: the correspondence tables are the acceptance; every row `/1` never judged goes to the owner, with its grade on the A4 path, before the card merges.
- 2026-10-29 Q16: grading runs on the host only; a follower shows the prescriptions and "graded on the host".
- 2026-10-29 Q17: `grade()` takes the rule edges the runner logs in its state.
- 2026-10-29 Q18: the administration record lives in the runner state, so a restore rewinds it.
- 2026-10-29 Q19: an explicit `give` list per action, plus a scenario `record` action for procedures without an engine command.
- 2026-10-29 Q20: phases travel on today's `scenario` event (`stateId` = phase id); F2 owns the `ScenarioView` phase label.
- 2026-10-29 Q21: `state.signals` (pulse, dantrolene effect, set minute ventilation) with the engine's beat MAP exposed in it, per the review (F4), fed to a `PhaseRunner` only.
- 2026-10-29 Q22: outcome rules read truth (rank 3); `map` is the engine's beat MAP.
- 2026-10-29 Q24: after the format lands, A presses give at once and never enter the cache; Drug-sheet drugs may be staged and are graded at their applied tick.
- 2026-10-29 Q28: the `/1` early-signs rule in step a (under O1–O4), §4.1's in step b with the owner's limits.

**Already answered elsewhere (the source).**
- 2026-10-29 Q5: the owner's 17:00 ruling (1), a phase is never entered by an action and a `goto` is one, and design §10: no future-click jump for `/2`; `/1` keeps `goto` (11:00 ruling).
- 2026-10-29 Q6: design §4: one phase at a time, the first rule in `next` order wins.
- 2026-10-29 Q11: design §6's table: failed at the phase's end or the run's end; "overdue m:ss" live meanwhile.
- 2026-10-29 Q25: the 17:00 ruling: the interim rule stays "until the format lands", which for the sixteen `/1` cards is never; unused for `/2`.
- 2026-10-29 Q29: design §4.1/§4.2 (`pulseLoss`) and the 17:00 ruling (phases on engine truth); the `/1` CPR objective is already anchored on `pulseLoss`.
- 2026-10-29 Q30 (dantrolene part): the 17:00 ruling, "IM dantrolene = no effect + local harm" (F = 0, F5.2); the rest is item-level orchestrator work.
- 2026-10-29 Q32: the code: the library, the Showcase test and `engineOptionsOf` read `category`, `durationMin` and `device`; the whole `/1` header is kept.
- 2026-10-29 Q33: the code (the eleven built-ins) and design §2: `/1` stays readable for good; no removal piece.

**Open for the owner** (with the review's note where it has one).
- Q1: the † qualitative limits; measured on F0's traces, then his ruling, before F8 step b.
- Q2: a route outside the allowed set: the action stays open, or "deviation".
- Q3 (the rest): timed communication ("call for help") as an action or a judged row. Note: the 17:00 ruling says communication objectives stay judged rows, while the 17:20 catalogue lists communication actions.
- Q4: script rhythms. Note: the rhythm-check VF script enters a phase because of a press, one step removed, against the design's anti-goal ("a phase entered because a button was pressed") and the 17:00 ruling.
- Q8: his epinephrine example (IV in arrest against IM in anaphylaxis).
- Q9: the withheld CPR in the haemorrhage demo. Note: the plan's table says "overdue" (given at +279 s), design §12 Q9 says "failed"; by §6 a late administration is overdue.
- Q12: setup actions graded or not.
- Q13: the conditional repeat's anchor. Note: its numbers come from him with a source before the A4 grades are measured, never from the A4 path.
- Q23: today's view and a `/2` card. Note: the recommendation would remove today's view as the room's fallback for the two demo cards, against the 03:10 ruling (v2 is an ADDITIONAL view); F7.5 waits on it.
- Q26: the EtAA threshold X for "stop the trigger".
- Q27: dantrolene's anchor: 300 s from the call (stop-the-trigger action) or from early signs.
- Q31: every card number the rulings do not give. Note: from him with a source, never from the A4 path.
- Q34: the window for resuming CPR after a shock (the action itself follows from the 17:00 ruling).
