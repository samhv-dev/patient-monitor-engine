# Instructor panel v2 (E127): implementation plan

**Status:** executed: built in PR #177 (merged 2026-10-29); the as-built record and the owner's later rulings are in the design doc, `instructor-panel-redesign.md`. Bracketed notes below mark the statements the rulings overtook. Written 2026-10-29 by the planner from the checkout `scratch/wt-ip-design` (main 8e4e8471 + the design). No file was changed. Spec: `docs/plans/instructor-panel-redesign.md` (the design). Every `file:line` below is a starting point. Find code by the function name. The orchestrator's answers to the questions are in `instructor-panel-v2-answers.md` beside this file and in the section "Answers applied" at the end; they bind the executors.

**Goal.** A second Instructor view, chosen from the rail, built as the design describes (session bar, stage strip, STATE, ACTION, dock, sheets, staged cache, marks, paused state). The debrief gains steps, judged objectives and marks. The phone layout (§6) is out of scope.

**Hard constraints.**
- Today's Instructor view (`views/teach.ts`, `panel/*`, `sessionbar.ts`, `staging.ts`, `commands.ts`) stays byte-identical. No piece edits these files.
- No change to `packages/engine-core`, `packages/renderer`, `packages/skins`, the scenario schema, the showcase cards or the follower views.
- Every pressable row sends exactly what today's button sends. A step sends `{type:'scenario', action:'trigger', target: tr.id}` through `link.ctl.send`, then `link.note(describeCommand(cmd), 'instructor')`, as in `panel/scenario.ts` `press`. A judged objective writes `link.note('Objective met: ' + drugWords(text), 'marker')`, as the checkbox in `scenarioTab` does.
- The MH and haemorrhage courses give the same states and the same `objectives()` verdicts through either panel.

**Architecture.**
- New route `teach2` (working name, Q1). It reuses the shell's single monitor `stage`, placed in the STATE column by CSS grid, so the renderer is untouched.
- The view has its own header, so `shell.bar` is hidden on this route.
- New code lives in `apps/demo/src/app/teach2/`.
- Reading the card is one pure module, `card-read.ts`, used by both the panel and the debrief.
- Two controller additions: batch metadata on staged commands, and a kind and a note on bookmarks. [As built: also the hold accessor (A8) and the opt-in stage marks (A3 as ruled 11:00); see the design doc §7.]
- Debrief additions are additive fields on the record. `objectives()` is not touched.

**Common gate (every piece, before every push).**
```bash
npx -y pnpm@9.15.9 -r typecheck
npx -y pnpm@9.15.9 --filter <pkg> test
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs     # 0 stale, 0 orphans (covers apps/demo/src and controller/src)
git diff origin/main --stat -- apps/demo/src/app/views/teach.ts apps/demo/src/app/panel apps/demo/src/app/sessionbar.ts apps/demo/src/app/staging.ts apps/demo/src/app/commands.ts   # empty
```

**Selector rule.** Both views live in the DOM, and the e2e and kit-round tests use CSS locators. The new view never uses `.sessionbar`, `section[aria-label="Running scenario"]`, `ul[aria-label="Objectives"]`, `[data-tab=…]` or `#teach-*`. It uses `ip2-*` classes and its own aria labels.

---

## Partition and ordering

```
Wave 1 (parallel): IP1 batch · IP2 marks · IP3 card-read · IP4 frame · IP8 debrief fields
Wave 2 (after IP3 + IP4 merge; IP7 also after IP1): IP5 STATE+strip · IP6 ACTION · IP7 sheets+cache
Wave 3: IP9 integration and measurement
IP0 runs first on base, and its goldens feed IP9.
```

Merge order: IP0, IP1, IP2, IP3, IP4, IP8, IP5, IP6, IP7, IP9.

Two shared files need care:
- `protocol.ts` is touched by IP1 and IP2, in different types. IP2 rebases after IP1.
- `views/teach2.ts` is owned by IP4. It mounts slot functions from stub files (`teach2/strip.ts`, `cue.ts`, `action.ts`, `sheets.ts`) with fixed signatures, `mount(el, ctx) => { refresh(), destroy() }`. IP5, IP6 and IP7 each replace only their own stub body.

## File map

| File | Piece |
|---|---|
| `packages/controller/src/protocol.ts` | IP1 (`CommandBase.batch?`), IP2 (`kind?`, `note?` on scenario bookmark) |
| `packages/controller/src/panel/staging.ts` | IP1 |
| `packages/controller/src/session/controller-session.ts` | IP1 |
| `packages/controller/test/panel/*`, `test/session/*`, `test/scenario/driver.test.ts` | IP1, IP2 |
| `apps/demo/src/app/card-read.ts` (new), `card-read.test.ts` (new), `teach2/press.ts` (new) | IP3 |
| `router.ts`, `rail.ts`, `shell.ts`, `main.ts`, `app.css` (appended rules only) | IP4 |
| `views/teach2.ts`, `teach2/{header,dock,keys}.ts`, `teach2/teach2.css` (all new) | IP4 |
| `teach2/{strip,cue}.ts`, `teach2/state.css` | IP5 |
| `teach2/{action,rows}.ts`, `teach2/action.css` | IP6 |
| `teach2/{sheets,sheet,drug-sheet,cache}.ts`, `teach2/sheets.css`, `link.ts` (adds `sendBatch` only) | IP7 |
| `record.ts`, `debrief.ts`, `debrief-export.ts`, `views/debrief.ts`, `views/debrief.css`, `scripts/showcase/debrief-fa.mjs` (only if Q17 says /3) | IP8 |
| `scripts/showcase/kit-round-a.kitround.ts`, new `apps/demo/e2e/teach2-*.e2e.ts`, `app-glossary.e2e.ts`, `app-accessibility.e2e.ts`, `CHANGELOG.md`, `docs/guides/*` | IP9 |

---

## Pieces

### IP0: Launch and baseline (1.5 h)
- Branch from `origin/main` and copy this plan in.
- Record the goldens to `scratch/ip2-gate/base/`:
  - `PME_SHOWCASE_PRINT=1 PME_TEST_SET=showcase` output of `malignant-hyperthermia.slow.test.ts` and `haemorrhage-anaphylaxis.slow.test.ts`;
  - the A4 MH and A4 haemorrhage kit-round runs (Chromium) through today's panel: the Debrief JSON (states, `objectives[].verdict.status`, `pressed`);
  - `outerHTML` of `#teach-panel` and `.sessionbar` at a fixed paused state (MH `treating`, ×1);
  - `sha256sum` of the today-view files.
- **Gate:** the goldens exist and the slow tests are green on base.

### IP1: Controller: staged-delivery batch (4 h)
- `protocol.ts`: `CommandBase.batch?: { id: string; n: number }`.
- `StageBuffer.commit(send, { batch?: true })` stamps every item with the stageGroup it already uses, plus `batch: {id, n}`. HostSession already lands one stageGroup on one tick (`host-session.ts` `applyOnce`, `STAGE_LEAD_TICKS`), so `host-session.ts` is expected to stay unchanged.
- `ControllerSession`: the items of one batch make ONE `command` LogEntry, written when the last ack arrives, naming each item (`describe` of each) and the refusals.
- **Tests:**
  - `staging.test.ts`: batch stamping, and a single commit without batch is unchanged.
  - `host-session.test.ts`: three items (a bolus, a fluid, a ventilation event) get one `atTick`.
  - `controller-session.test.ts`: one log entry, n names, a refused item is named.
  - Record, in a test, what a `scenario trigger` inside a batch does today (the result goes to Q11).
- **Gate:** common, with `@pme/controller`.

### IP2: Controller: marks with kinds (2 h)
- `protocol.ts`: the scenario command gains `kind?: 'good' | 'bad' | 'discuss'` and `note?: string`, meaningful with `action: 'bookmark'`. [As built: `MarkKind` also has `stage`, the driver's own hidden stage marks (ruled 11:00).]
- Both bookmark paths (`ScenarioDriver.hook`, and `HostSession.scenario` without a hook) already return `{...cmd, target}`. Tests prove that kind and note survive in `applied`, in `commandApplied` and in the sticky late-join replay, and that `restoreBookmark` is unchanged.
- **Gate:** common, with `@pme/controller`.

### IP3: Card reading, pure (5 h)
`card-read.ts` (no DOM):
- `stagesOf(doc)`: stages with hop states folded in (Q2).
- `rowsOf(doc, stateId)`, in the card's order:
  - steps: `manual`, plus `any`/`all` containing a manual (Q4);
  - autos: `vital`, `afterS`;
  - `event` transitions as their own kind (Q5);
  - judged objectives: rule-less.
- `stepCommand(state, label)`: the same resolution as `press` (label against the CURRENT state).
- `objectiveOf(step)`: per Q6, null until answered.

`teach2/press.ts`:
- `pressStep(link, label)` is a copy of `press` (same toast, same note).
- `judge(link, text)` writes the checkbox's note.

**Tests** on `showcase-mh.json` and `showcase-haemorrhage.json`:
- MH `treating`: 4 steps and 2 autos.
- Haemorrhage `pea`: 1 step and 1 auto.
- `junctional` gives a step.
- Every manual label of both cards resolves to its transition id.
- Every Act label in the two slow tests maps to a step at its state.

**Gate:** common, with `@pme/demo`.

### IP4: View frame, route, header, keys (8 h)
- Route and rail:
  - `ROUTES` and `HOST_ROUTES` gain `teach2`.
  - `RAIL` gets an entry after Instructor, plus an icon.
  - `NAV` gets its title.
  - `shell.ts` adds `OWN_BAR_ROUTES = {teach2}`, which hides `shell.bar`.
- `main.ts`:
  - `shell.add(teach2View(...))`;
  - `session.live = true` on `teach2`;
  - `__pmeApp.teach2`.
- `app.css` gets new selectors only. The grid is rail 56, header 48, strip 52, STATE 6fr / ACTION 7fr, dock 64. The rail collapses as on `teach`.
- Header, sending exactly the session bar's commands (`sessionbar.ts`):
  - clock pill: `time pause` / `time resume` (Q9);
  - speed box: `time scale` 1/2/4/8;
  - fast-forward fan: `time jump` 60/120/300/600 (`FF_MAX_S` = 600). [Overtaken by option G (ruled 21:30): Fast forward is a box in STATE with +2 min and +5 min (`time jump` 120 and 300), not in the header.]
- `keys.ts` handles Space, Esc, 1–9 and the letters. It is ignored while typing (`isTyping`) and while the view is hidden (the `el.closest('[hidden]')` pattern from `panel.ts`). Digit and letter registries are filled by IP6 and IP7.
- Dock skeleton.
- **Tests:**
  - `router.test.ts`.
  - `shell.dom.test.ts`: the bar is hidden on `teach2` and shown on `teach`.
  - `teach2/header.dom.test.ts`: each control sends a CommandInput deep-equal to the session bar's.
  - `keys.dom.test.ts`: no action while typing or hidden; Space does not also click a focused button.
- **Gate:** common, plus `app-one-session.e2e.ts` with `#/teach2` added (IP9 edits that file; here run locally).

### IP5: STATE column and stage strip (6 h)
- `strip.ts`:
  - stages from `stagesOf`;
  - past entry times from `ScenarioView.history`;
  - the current stage shows its open-step count;
  - "auto" on future stages a rule enters;
  - a future-stage click = `goto` behind the same confirm as `scenario.ts` `jump` (Q3);
  - a past-stage click per Q3/Q13.
- `cue.ts`:
  - stage name and time in stage (`timeInState`);
  - how the stage was entered: from IP8's `by` field when on the host, else `history[].transitionId` (Q4);
  - the stage line (Q21);
  - the Say line = `state.notes`, italic.
- Monitor: the shared `stage` in the STATE grid area. Swap per Q18.
- Paused: a banner, and "frozen" on the in-stage clock. [Overtaken by option G (ruled 21:30): no banner; the rule is the clock pill's tooltip.]
- **Tests:** `strip.dom.test.ts`, `cue.dom.test.ts` (Say line shown, goto confirm sends the same command as today's jump).
- **Gate:** common.

### IP6: ACTION list (9 h)
- `rows.ts` classifies each row live: current, condition not met (Q6), overdue (Q7), taken, failed (Q7), auto pending or fired.
  - It reads `link.host.record.data` (host only) through IP3's `objectiveOf`.
  - It never sets `disabled` on a step or judged row.
- `action.ts`: one pill per row with key box, title, subtitle and right label. Digits 1–9 go to the keys registry.
  - Folds: Finished (closed by default) and Off the card (Q20).
  - The foot line.
  - The auto-row bar per Q8.
- **Tests:** `action-parity.dom.test.ts`, which rigs today's `scenarioTab` and the new list on the same fake Link (the `scenario.dom.test.ts` rig):
  - for every manual transition of both cards, the same sent CommandInput and the same `link.log` entries;
  - a stale press gets the same toast;
  - a judged row writes the same note as checking the box;
  - row count = manual + mixed transitions of the state;
  - no step or judged row is disabled.
- **Gate:** common.

### IP7: Sheets and staged cache (12 h)
- `sheet.ts` frame: title row, group tabs, body read on the left and set on the right, primary footer button. It slides over ACTION only. Letters open a sheet; Esc closes it (Q16); a sheet reopens on its last item.
- `drug-sheet.ts`:
  - search via `drugs.ts` (`findDrugs`, `perKg`);
  - Give now sends the same command as `drugsTab` Give;
  - the card's open steps are pinned at the top and use `pressStep` (Q10);
  - "Add to the cache".
- `cache.ts`: one cache for the view, shared across sheets, with `Staged · n` on the dock. Deliver = IP1 batch commit plus `Link.sendBatch(cmds)`, a new public method: one clinical-log line naming each item. Deliver is disabled at n = 0, and closing a sheet keeps the cache. Card steps in the cache: Q11.
- Other sheets (Airway, Vitals, Defib · CPR, Devices, Patient, Log) mount today's tab builders (`airwayTab`, …) unmodified, inside the sheet frame, with their own PanelCtx (Q14). Gas is not built (Q14). The CPR takeover is not built (Q15).
- **Tests:**
  - `drug-sheet.dom.test.ts`: Give deep-equals `drugsTab`'s.
  - `cache.dom.test.ts`: n items give one stageGroup, one batch id and one clinical log line; n = 0 disables Deliver; close keeps the cache.
- **Gate:** common.

### IP8: Debrief fields (8 h)
`record.ts`, all additive:
- scenario rows gain `tr?` (the transitionId) and `by?: 'press' | 'rule' | 'goto'`. `by` is set from the trigger or goto `commandApplied` that `wire()` now drops (it keeps not printing it).
- bookmark rows gain `markKind?` and `note?`.
- action rows gain `batch?`.

`debrief.ts`:
- new pure `steps(d)`: each step's due order, taken time, order taken and status (Q7);
- `judged(d)`: the instructor's ticks;
- `marks(d)`: with kinds.
- `objectives()`, `verdict()` and `first()` are not touched.

`views/debrief.ts`:
- one new section, `#db-steps`;
- the Bookmarks section shows kinds;
- the timeline prints one line per batch, while the record keeps one row per item so rules still see `drug:<id>` (Q12).

`debrief-export.ts`: the new keys (schema per Q17).

**Tests:**
- `record.test.ts` (by, tr, markKind, batch);
- `debrief.test.ts` (the keys list at `:222` updated);
- `debrief-showcase.test.ts`: on the MH and haemorrhage presses, `objectives()` deep-equals its output with the new fields stripped;
- debrief e2e page bounds unchanged: A3.1 ≤ 7 pages, free run ≤ 4, page 1 ≤ 267 mm, handout 1 page.

**Gate:** common, plus `debrief.e2e.ts` on both projects, 3 of 3 runs.

### IP9: Integration and measurement (8 h, last)
1. Merge in the order above. On the merged head, run every unit, DOM and slow test.
2. Kit round: `kit-round-a.kitround.ts` gets a `PME_PANEL=teach2` switch in `Run.press`, `tick` and the bookmark helper (new view locators). Run A4 MH and A4 haemorrhage on Chromium and WebKit through both panels. Compare with the IP0 goldens:
   - the state sequence is identical;
   - each press lies within one poll lag of its golden time;
   - every `objectives[].verdict.status` is identical;
   - the new fields are present.
   Any difference is reported, not tuned.
3. New `apps/demo/e2e/teach2-fit.e2e.ts` at 1440 × 900, at MH `normoventilated` (second dose), MH `treating` (fan-out) and haemorrhage `pea`:
   - the view's `scrollHeight ≤ clientHeight`;
   - every open step is a row;
   - no row is disabled;
   - the monitor pane size is recorded, with screenshots for the saadat tile check (R9).
4. Keyboard e2e: 1–9, the letters, Space, Esc.
5. Byte-identity: the common diff check, plus the IP0 `outerHTML` snapshots equal on head.
6. `app-glossary.e2e.ts` and `app-accessibility.e2e.ts` gain `#/teach2`.
7. CHANGELOG and the guide.

**Gate:** all of the above, CI green, and an independent read-only review naming the head.

---

## Effort

| Piece | h | Wave |
|---|---|---|
| IP0 | 1.5 | 0 |
| IP1 | 4 (5.5 with the hold accessor) | 1 |
| IP2 | 2 | 1 |
| IP3 | 5 | 1 |
| IP4 | 8 | 1 |
| IP8 | 8 | 1 |
| IP5 | 6 | 2 |
| IP6 | 9 | 2 |
| IP7 | 12 (about 11 without Gas and the CPR takeover) | 2 |
| IP9 | 8 | 3 |
| **Total** | **≈ 64 executor-h**, plus ≈ 4 h of review | ≈ 3 waves; at most 4 executors at a time |

---

## Risks in the code

- **R1. The showcase slow tests never touch a panel.** `harness.ts` presses by label via `runner.trigger`. They cannot accept the new panel by themselves; the acceptance is the IP6 parity test plus the IP9 kit-round comparison.
- **R2. Step timing has no direct record.** `record.ts` `wire()` drops `scenario trigger` commands, so press timing must come from the state row. An `any[manual, vital]` transition (haemorrhage `junctional`) cannot be attributed from `transitionId` alone.
- **R3. Folding a batch in the record would change verdicts.** Rules need one `ev` per item (`drug:dantrolene`), so one record row per batch would break them. The plan folds in the view only.
- **R4. Card steps cannot join a batch's tick.** Stage groups apply to engine commands only: a scenario `trigger` goes to `driver.hook`, and its `onEnter` gets its own group three ticks later.
- **R5. Auto-row hold progress is not visible to the panel.** The runner's `trueFor` hold counters are private and host-side, and the runner reads state values (`sbp`, `tempCore`), not monitor numerics. A panel estimate would disagree with the rule.
- **R6. Locators can collide.** Both views live in the DOM, and the kit round and e2e tests use CSS locators (`.sessionbar`, `section[aria-label="Running scenario"]`). See the selector rule.
- **R7. Keyboard handlers can clash.** Today's panel listens on `document` for Shift+S/P/N/B. The new view's handler must be gated the same way. Space on a focused button can act twice.
- **R8. Both entry points go to today's view.** The alarm-count button (`main.ts` `openAlarms`) and the reveal gesture both route to `#/teach`.
- **R9. The monitor may not fit its new pane.** The STATE pane is ≈ 620 px wide. The saadat skin's tiles have collided at smaller panes before (`saadat-instructor-tiles.e2e.ts`), and no renderer change is allowed.
- **R10. Mark labels can collide.** `commands.ts` has a module-level `Bookmark n at mm:ss` counter. Marks need their own label prefix and counter.
- **R11. Export changes break two readers.** `debrief.test.ts:222` asserts the exact export keys, and `debrief-fa.mjs` accepts only /1 and /2.
- **R12. The model-docs guard covers the app and the controller.** It covers `apps/demo/src` and `packages/controller/src`, so every piece regenerates the docs.
- **R13. Design counts differ from the card.** `showcase-mh.json` has 19 states and 29 manual transitions; the design says 18 states. Transition order is priority order, not a clinical sequence.

## Questions (answered in `instructor-panel-v2-answers.md`; summary below)

1. Route and label. 2. Stages and hops. 3. Strip clicks. 4. Mixed transitions. 5. Event transitions. 6. Conditions and objective links. 7. Status definitions. 8. Auto-row progress. 9. Pause. 10. Drug that is a card step. 11. Card step in the cache. 12. Batch in the record. 13. Marks. 14. Other sheets. 15. CPR. 16. Keys. 17. Export schema. 18. Swap. 19. Entry points. 20. Off the card. 21. The stage's own line.

### Critical files for implementation
- `apps/demo/src/app/panel/scenario.ts`
- `apps/demo/src/app/record.ts`
- `packages/controller/src/session/controller-session.ts`
- `packages/controller/src/panel/staging.ts`
- `apps/demo/src/app/shell.ts`

---

## Answers applied (orchestrator, 2026-10-29)

These answers come from `instructor-panel-v2-answers.md` and bind every piece. "A" followed by a number is an answer's number.

**IP1 (batch):**
- A8 adds a third controller addition: a read-only hold accessor on the host-side driver. It reads the runner's `trueFor` per vital leaf of the current state. Files: `packages/controller/src/scenario/driver.ts`, plus `runner.ts` for the getter. It needs its own test in `test/scenario/driver.test.ts`. About 1.5 h.
- A11 keeps card steps out of the cache. The "trigger inside a batch" test now only documents today's behaviour; nothing depends on it.

**IP2 (marks):**
- No change in scope. A13 confirms the `note?` field: a mark takes the note field's text.

**IP3 (card-read):**
- A2 fixes `stagesOf`: a hop is a state whose only exit is `afterS` ≤ 2 s; a hop folds into the state its exit leads to; stages are the non-hop states, in document order; `triggerOff` and `treating` are two stages.
- A4: a mixed `any`/`all` with a manual inside is a step; subtitle "or by itself when <rule>".
- A5: `event` transitions are auto rows.
- A6: `objectiveOf` links an objective to a step when the objective's `event` is `state:<to>`, or `drug:<id>` for a drug in `<to>`'s `onEnter`. "Condition not met" = a linked objective whose `after` is a `value:` rule that is not yet true. With no linked objective the step is "ready".
- A7: the card's order is the array order. Add a reachability helper on the card graph, used for "failed".

**IP4 (frame):**
- A1: route `teach2`; rail label and title "Instructor v2".
- A9: the clock pill sends exactly what the session bar's Pause and Resume send. Fast forward is disabled while paused, nothing is queued.
- A16 keys: D opens and closes the Drug sheet; Enter = give now and S = add to the cache, only while a sheet is open; Deliver has no key; Shift+S/P/N stay as today, sending the same commands as `panel.ts`.
- A19: the alarm count and the reveal gesture go to the view used last (a small `main.ts` change).

**IP5 (STATE and strip):**
- A3: a future-stage click = `goto` behind today's jump confirm, hint "jumps to it (asks once)". A past-stage click only shows its entry time and places no mark. [Superseded by the owner's ruling of 11:00: a past-stage click restores the hidden stage mark placed at that stage's entry, behind one confirm.]
- A2: the strip is built from the stages defined in A2.
- A4: the cue box says "by your button", "by its rule", "by a jump", or "entered" plus the time when IP8's field is absent.
- A21: the stage line is the state label. A18: Swap navigates to `#/monitor`; no swapped layout. A14: HELD values are shown in STATE only.

**IP6 (ACTION):**
- A4 and A5: row subtitles as in IP3. A6 and A7: the row statuses exactly as defined [A7 refined 13:00: an untaken step that no objective asks for is never "failed" and is dropped once its stage passed]; "out of order" = taken after a step with a higher array index in the same stage.
- A8: the auto-row bar. Host: value against threshold, times the hold fraction (from the IP1 accessor). Follower: value against threshold only.
- A20: Off the card lists the off-card actions taken in this stage, read from the log; no launchers.

**IP7 (sheets and cache):**
- A10, give rule: when the sheet's dose equals the card's, Give sends the trigger only; when it differs, Give sends the bolus and not the trigger, with "this dose is off the card". [Contested; as built, INTERIM until `pme-scenario/2` (ruled 17:00): at a different dose two buttons, "Give the card's step" and "Give <dose> off the card" (`pinnedGiveRule`); see `instructor-panel-v2-answers.md` item 10.]
- A11: "Add to the cache" is disabled for a pinned card step, with the note "card steps are given from ACTION".
- A13: the Log sheet gets a marks list with "Return here", using today's bookmark restore. The dock marks and the note field also belong to IP7: Enter writes a note, and a mark takes and clears the field.
- A14: today's tab bodies inside the sheet frame are acceptable. Gas is not built. A15: the CPR takeover is not built. A16: keys as in IP4.

**IP8 (debrief):**
- A17: additive fields in `pme-debrief/2`; the keys test is updated; `debrief-fa.mjs` is untouched.
- A12: one record row per item, one Debrief line per batch. A7: `steps(d)` statuses exactly as defined [refined 13:00, as for IP6]. A4: `by` takes `press`, `rule` or `goto`. A13: a mark's note is kept on its bookmark row; free notes stay note rows.

**IP9 (integration and measurement):**
- A1: final names are confirmed here. A9: the e2e checks that Fast forward is disabled while paused. A16: the keyboard e2e follows A16. A19: the e2e checks that the alarm count goes to the view used last. A18: there is no Swap layout to measure.
- Merging: executors never merge, and nothing merges before the rc.4 tag. "Merge in order" is the orchestrator's job after that tag.

**Changes across pieces:** branches are `feat-ip2-<piece>` from `origin/main` (a88f95a7 or later), PRs target `main`. Hours: IP1 5.5 h; IP7 about 1 h less; total about 64 h.
