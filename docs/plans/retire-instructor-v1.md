# Retire today's Instructor view: Instructor v2 becomes the only instructor UI — Implementation Plan

**STATUS: DRAFT FOR REVIEW (2026-11-06).** Nothing here is ruled until the owner answers section 10 (each question
carries the default the plan uses) and the orchestrator reviews the pieces. Written by a planning executor from brief 39
of the post-demo set, against `main` at `21162565` (PR #272 merged); every `file:line` below was read at that commit.
No product code, test, card or kit file was changed while writing it; the numbers in section 3.6 were measured on that
tree (a production build with source maps, `playwright test --list`, `vitest list`, the command census run once, and the
Playwright JSON reports of main's CI run 42114485878 on `42da0eef`, the last green main run before `21162565`).

Source of the work: the owner's ruling of 5 November 07:26 (`research/00-orchestrator-rulings.md:3730`): Instructor v2
is the default and only instructor UI; cards are written in `/2` only and open on v2; the fourteen built-in `/1` cards
keep running on v2 until they are ported (`research/41-post-demo-priorities.md` rows 49 and 51; row 51 is a separate
item). The ruling of 5 November 13:13 (`:3784`) takes the two `/1` demonstration copies out of the instructor's library.

## 1. Intent

Two instructor UIs live side by side in `apps/demo`: today's view (`#/teach`: `views/teach.ts` over the eight-tab panel
`panel/panel.ts`, with the session bar `sessionbar.ts` and the staged-changes footer) and Instructor v2 (`#/teach2`:
`views/teach2.ts`, `teach2/*`). Settings chooses which one the rail, the `i` key, a Load and a deep link open, and the
default is still today's view (`site.ts:47`, "today's view: the 3 November demo's"). Every change to what an instructor
can do is wired twice (since v2 merged on 29 October: PRs #211 and #239 on main, #271 open, the same-drug lock
prepared, Debrief 2's D5 planned into both, `debrief-2-option-c.md:431–432`), and 76 end-to-end tests per browser
still drive the old view, most of them only because a deep link opens it by default.

This plan removes today's laptop view without losing any behaviour the owner uses: it lists what the old view still does
that v2 does not, closes the gaps that must close first, moves every test that drives the old view onto v2 (or retires
it where a v2 test already holds its intent), then flips the default and deletes the route. The instructor's second
window and tablet, the Remote (`#/remote`, `views/remote.ts`), mounts the same old panel; it is retired in a second
phase, when the phone layout (row 17) gives it a v2 form (Decision 1, Q1).

## 2. Goals, non-goals, anti-goals

**Goals**
- One instructor UI on the laptop: `#/teach2` is what the rail's "Instructor", the `i` key, the reveal gestures, a Load,
  the Patient page and a deep link open; `#/teach` still resolves (to v2), so an old bookmark or QR does not break.
- Nothing the owner uses is lost: every command shape the old view sends is sent by v2 (the command census, section
  3.3), and the three non-command behaviours v2 lacks (learner controls, the stage-timer hold, the onset of a staged
  change) are ported before the old view goes.
- Every e2e test that drives the old view either runs on v2 with its assertion unchanged in intent, or is retired with
  the v2 test that already holds that intent named.
- The removal is measured, not claimed (section 3.6).

**Non-goals**
- The phone layout (Phone 9 board), the Gas sheet, the in-place swap (E139), the arrest-phase sheet (E140), scenario
  history from the first stage (E141): v2's own unbuilt parts (row 17). Only those that the old view fills block the
  removal (section 3.4).
- Porting the fourteen `/1` built-ins to `/2` (row 51) and moving the two `/1` demo copies out of the library (F7.5,
  `scenario-format-v2-plan.md:494–520`). This plan says how F7.5 changes (section 3.5), not how to build it.
- Renaming the route to `#/instructor` or `#/teach` (Q6).
- Any change to the engine, the controller, a card, a skin or the follower views.

**Anti-goals**
- A test made green by changing what it asserts. A ported geometry test that fails on v2's smaller monitor pane is a v2
  finding reported to the orchestrator, never a looser threshold.
- A "v1 compatibility" path kept in the product: no hidden route, no Settings toggle, no `?panel=v1`.
- A second copy of the panel for tests: in phase 1 the Remote's panel is the oracle the parity tests read; in phase 2
  the oracle becomes frozen literals (Decision 6).

## 3. Every item mapped to what exists

### 3.1 Files that exist only for the old view (laptop route)

"Only for the old laptop view" means: deleted, or reduced to the lines named, when `#/teach` goes. The Remote keeps
the panel in phase 1, so the panel files are listed in 3.2.

| # | File (lines at `21162565`) | What goes | Notes |
|---|---|---|---|
| L1 | `apps/demo/src/app/views/teach.ts` (25 lines) | the whole file | mounts `mountPanel`, the drawer toggle and `briefingEnd` |
| L2 | `apps/demo/src/app/briefing.ts:184–` `briefingEnd` | the function | its only user is `views/teach.ts:4`; v2 has its own End briefing in the strip (`teach2/strip.ts`) |
| L3 | `apps/demo/src/app/router.ts:1–5, :14, :30–31` | `'teach'` leaves `ROUTES` and `HOST_ROUTES`; `parseRoute` maps `teach` → `teach2` as it maps `start` → `home` (`:23`); `revealTarget` loses its two-view branch | Q6 |
| L4 | `apps/demo/src/app/site.ts:7–8, :26–28, :44, :47, :57, :61` | `InstructorRoute`, `instructor`, `INSTRUCTOR_VIEWS`, `panel: 'split' \| 'drawer'`; a stored `instructor` or `panel` key is ignored by `parseSite` | Decision 5 |
| L5 | `apps/demo/src/app/views/settings.ts:31–32, :47, :59` | the "Instructor view" and "Instructor panel on wide screens" choices | |
| L6 | `apps/demo/src/app/main.ts:40, :141–147, :159–160, :185, :255, :279, :287` | the `teachView` import and mount, `openAlarms`'s old branch, the host's `mountSessionBar(shell.bar, link)` (the host bar shows only on `#/teach`, `app.css:112, :123`), `'teach'` in the live-route test, `teach` in `__pmeApp` | `instructor()` becomes the constant `'teach2'` or goes |
| L7 | `apps/demo/src/app/rail.ts:2, :45, :58, :125, :132–133` | the instructor indirection: the rail's entry is `teach2` | |
| L8 | `apps/demo/src/app/views/monitor.ts:14, :19`; `views/patient.ts:96, :100, :128`; `views/scenarios.ts:14, :28–29, :51` | `chosen()` / `d.site.instructor` / `d.instructor()` become `'teach2'` | |
| L9 | `apps/demo/src/app/shell.ts:23, :28` | NAV loses `['teach', 'Instructor']`; `['teach2', 'Instructor v2']` becomes `['teach2', 'Instructor']` (the document title) | |
| L10 | `apps/demo/src/app/ui.ts:183–190` | `trackChromeBottom`'s `.view[data-view="teach"]` tab strip and `.stagebar` (the `--panel-tabs-bottom`, `--panel-foot` variables) | the Remote does not mount under `data-view="teach"` |
| L11 | `apps/demo/src/app/app.css` lines 115, 122–153, 217, 336, 341, 479, 481, 564, 596–606 | the `data-route='teach'` and `data-view='teach'` layouts, the drawer and its toggle, the iPad landscape/portrait media rules, the toast and banner placement for `teach`, and the rail's strip rules at 596–606 (their `teach2` copies at 788–798 stay) | 34 lines carry a `teach`-only selector, 3,675 bytes (section 3.6); lines 115 and 123 are edited, not deleted (123 also shows the hostless Remote's session bar) |
| L12 | `apps/demo/src/app/briefing.css:68` | `.view[data-view='teach'] > .cb-end` | |
| L13 | `apps/demo/src/app/teach2/begin.ts:99–103` | the `link.send({ type: 'scenario', action: 'load' })` fallback when no `loadScenario` is given: never reached on the host (`main.ts` always passes it) and refused for instructors by the peer-role rules (`teach2/census.dom.test.ts:46`, `scenario load` in §2's refusals) | Decision 7. The other `begin.ts` fallback, "Room setup" opening Settings (`:121, :144`), belongs to the Room plan (R7, `room-and-instruments.md:568`), not this one |

Unit tests that exist only because two laptop views exist: `apps/demo/src/app/instructor-choice.dom.test.ts` (121
lines, 7 tests: the Settings choice, the rail's one entry, every route to "the chosen view") is rewritten to 4 tests
(every route opens `#/teach2`; `#/teach` resolves to it; the rail marks it; no Settings choice);
`site.test.ts:10` (`DEFAULT_SITE.instructor` is `'teach'`) is replaced by "a stored `instructor: 'teach'` is ignored";
`case-briefing.dom.test.ts` "the instructor's End briefing (today's view and v2's status line)" loses today's half (the
`vi.mock('./panel/panel.ts')` at `:74` and `teachView` at `:80, :265` go).

### 3.2 Files shared with the Remote (phase 2), and files that stay

| File | Today's users | Phase 1 | Phase 2 (after the phone layout) |
|---|---|---|---|
| `panel/panel.ts` (164 lines: tabs, staged-changes footer with Onset and "Apply at once", Shift-keys) | `views/teach.ts:6`, `views/remote.ts:8`, tests | stays (the Remote) | deleted |
| `panel/scenario.ts` (144: the Scenario tab: library, states strip, next steps, objectives checkboxes, bookmarks, learner toggle, Hold the timer) | `panel.ts`, five parity tests | stays (the Remote) | deleted |
| `panel/drugs.ts` (163: Drugs & fluids tab) | `panel.ts`, `teach2/drug-sheet.dom.test.ts:11` | stays | deleted |
| `sessionbar.ts` (98) | `main.ts:185` (host, goes in phase 1), `views/remote.ts:62`, `teach2/header.ts:14` (`SPEEDS` only), three tests | stays (the Remote) | deleted; `SPEEDS` moves to `teach2/header.ts` |
| `panel/airway.ts`, `defib.ts`, `devices.ts`, `ibp-scales.ts`, `log.ts`, `patient.ts`, `vitals.ts`, `ctx.ts` | both views: v2's sheets mount them unmodified (`teach2/sheets.ts:14–20, :27–35`) | stay | stay (they are v2's sheet bodies; `PanelCtx` stays their context) |
| `staging.ts` | `panel.ts`, and v2's `Cache extends Staging` (`teach2/cache.ts:12, :22`) | stays | stays (its `autoApply` and the footer-only parts may shrink) |
| `commands.ts` `shortcutsDialog` | `panel.ts:148` (`?`), `views/settings.ts:67` | stays | stays (Settings) |

Unit tests that read the old panel as their ORACLE (they assert "v2 sends what today's view sends"): `teach2/action-parity.dom.test.ts`
(8), `teach2/press.dom.test.ts` (4), `teach2/drug-sheet.dom.test.ts` (4 of 8), `teach2/header.dom.test.ts` (13),
`teach2/keys.dom.test.ts` (4 of 9: Shift+S/P/N), `teach2/strip.dom.test.ts` (1 of 16, `:173`), `readers-v2.dom.test.ts`
(3 of 16), `teach2/census.dom.test.ts` (1). In phase 1 they keep reading the Remote's panel, which still exists; in phase
2 they read frozen literals (Decision 6). Tests of the panel itself: `panel/scenario.dom.test.ts` (4) and
`panel/panel-load-tab.dom.test.ts` (5) go in phase 2; `panel/devices.dom.test.ts` mounts `mountPanel` in 3 of its 16
tests (`:114, :125, :167`) and moves to mounting `devicesTab` directly in phase 2.

### 3.3 What the old view does that v2 does not (measured)

**Commands (the census).** `teach2/census.dom.test.ts` crawls both laptop views on a recording Link (every button, select,
confirm and key, both demo cards at every state, MODELED with held values and MANUAL, running and paused). Run once with
`PME_CENSUS_OUT` at `21162565` (62.8 s): 29 command shapes in the union; v2 sends 27 of them. The two it does not send are
`scenario pause` and `scenario resume`, sent only by the Scenario tab's "Hold the timer" / "Resume the timer"
(`panel/scenario.ts:63, :125`). Every other shape (time, applyEvent of 12 kinds, device, setTarget, pin, release,
setRhythm, setMode, attachSensor, scenario trigger/goto/bookmark/restoreBookmark) has a v2 control; `release` included
(the Vitals sheet's body, `panel/vitals.ts:47, :68`).

**Behaviour the census cannot see** (host-local state, or a field on a command rather than a shape), read in the code:

| # | Behaviour | Old view | v2 today | Must close before the old view goes? |
|---|---|---|---|---|
| G1 | **Learner controls on the monitor** for this run (charge, shock, CPR, drugs as buttons under the learner monitor) | the Scenario tab's toggle, host only (`panel/scenario.ts:50–58`; `session.ts:245–250`) | none: no card sets `learnerControls` (`scenario-meta.ts`; grep finds no `learnerControls: true`), so the toggle is the only way on | **Yes** (default; Q3): otherwise the learner strip cannot be shown at all. `app-one-session.e2e.ts:82` tests it |
| G2 | **Hold the stage timer** (the scenario's own pause: rules and timers stop, the physiology runs) | Scenario tab (`panel/scenario.ts:63`), both runners honour it (`packages/controller/src/scenario/driver.ts:225, :246`, `phase-runner.ts:277`) | none (the census, and its own header comment, `census.dom.test.ts:31`) | **Yes** (default; Q2) |
| G3 | **Onset of a staged change** ("Now, over 30 s, 1, 2, 5 min"): a staged `setTarget` or `pin` is sent with `ramp: { durationS, curve: 'linear' }` (`staging.ts:74–80`, `panel/panel.ts:36, :83`) | the footer's Onset select | the Cache delivers with `sendBatch` and no ramp (`teach2/cache.ts:69–76`); the Vitals body has no ramp field of its own, so on v2 every held value jumps at once | **Yes** (default; Q4): a desaturation or a heart rate "over 2 minutes" is how an instructor drives a case by hand |
| G3b | "Apply at once" (staging opt-out) | the footer toggle (`panel/panel.ts:85`) | none, by design: "the cache has no opt-out" (`teach2/cache.ts:51`, answer 11) | No: ruled away for v2 already |
| G4 | **iPad layouts**: landscape drawer over the monitor, portrait sheet under it (`app.css:131–153`; Settings "Instructor panel on wide screens") | yes | v2 has no media rules for size (its CSS files carry only `prefers-reduced-motion`); its fit is tested from 1280 × 720 up (`resolution-fit.e2e.ts:64`, `teach2-fit.e2e.ts`) | No (default; Q5): a tablet instructor uses the Remote (phase 1 keeps it); the laptop view is for ≥ 1280 × 720 |
| G5 | **The Remote** (`#/remote`, second window or tablet over the relay): the panel and the session bar | `views/remote.ts:8, :11, :62–66` | none (the phone layout, Phone 9, is unbuilt; the Room plan's P7 keeps "today's panel as the placeholder the phone layout replaces", `instructor-peer-role.md:479`) | No: phase 2 (Decision 1, Q1) |
| G6 | Shift+B bookmark and `?` shortcuts in the panel | `panel/panel.ts:146–148` | marks in the dock replace bookmarks (`teach2/dock.ts:4–5, :32`); the shortcut list is in Settings (`views/settings.ts:67`) | No |
| G7 | The full-size monitor beside the controls (split view) | `app.css:122` | the learners' monitor at a reduced size, Swap goes to `#/monitor` (ruled 29 October, option A; the in-place swap is E139) | No (Q8): the demo ran on v2 this way |
| G8 | "Choose another scenario" inside the panel, with a category filter | Scenario tab library (`panel/scenario.ts:28–46`) | the case list on the empty view (`teach2/begin.ts:150–`) and "The whole library" link to the Scenarios page, which has the filter and asks before replacing a running case | No |
| G9 | "This card is pme-scenario/2: run it from Instructor v2" | `panel/scenario.ts:110` | — | Goes with the old view (stays on the Remote in phase 1) |

**Row 17's unbuilt parts, sorted.** Must close before: none of them as such; the onset ramp for delivered items (row 17)
is G3 and closes first. Can follow: the Gas sheet (neither view has one: grep finds no sample or blood-gas control in
`panel/`), the phone layout (G5, phase 2), the in-place swap (G7), the arrest-phase sheet, scenario history from the
first stage.

### 3.4 What a `/1` card needs on v2 to be complete

The fourteen `/1` built-ins (and the two `/1` demo copies until F7.5 moves them) keep running on v2 (Q33: `/1` stays
readable). Read against `teach2/*`, v2 already gives a `/1` card: its states as stages with jump and return
(`teach2/strip.ts`), manual transitions as rows with keys (`teach2/action.ts`, `press.ts`), judged objectives as rows
writing the same `Objective met:` note as the checkbox (`teach2/press.ts:48–50`, `rows.ts:274–279`), bookmarks and
"Return here" (the Log sheet), the Debrief's "ready" flag for `/1` (`teach2/dock.ts:99`), and a reload's restore
(`position.ts`; row 55 concerns `/2` only). What it does not give, and this plan adds before the flip: G1 and G2 (both
are `/1` runner features; G2 works on `/2` too). And one piece in flight elsewhere: **Debrief 2 D5's "Recognised" press**
for `/1` cards (`debrief-2-option-c.md:154–157, :407–445`), planned beside the session bar's Bookmark (`sessionbar.ts:47`) and into the dock beside the marks (`teach2/dock.ts:18–22`).
On the laptop after the flip only the dock's button is reached; the session bar's copy then serves the Remote alone
until phase 2. If D5 merges before this plan's PR 3, PR 3 leaves `sessionbar.ts` alone (the Remote still mounts it); if
after, D5's executor still adds both (the file exists until phase 2). No ordering constraint, one shared file
(`teach2/dock.ts`), resolved by whichever merges second.

### 3.5 The fixture freeze F7.5 (the `/1` demo cards as test fixtures)

F7.5 (`scenario-format-v2-plan.md:494–520`) was written to wait on Q23, "whether today's-view suites retarget to
Instructor v2 or to the fixture". The 07:26 ruling answered it: no old-view fallback, so no product path keeps the `/1`
demo copies, and the 13:13 ruling takes them out of the library. This plan changes F7.5 in three ways:

1. **Fewer suites to repoint.** F7.5's e2e list (`:508–509`) names `debrief`, `reload-keeps-case`,
   `scenario-panel-stale-press`, `ui-polish-a`, `ui-polish-b`, `teach2-fit`, `teach2-keys`. Measured at `21162565`, 9 e2e
   files load `showcase-mh` or `showcase-haemorrhage` as `/1` (the list above plus `case-briefing` and
   `teach2-rail-lines`). After this plan, `scenario-panel-stale-press` is deleted and `ui-polish-a` keeps one test
   (`:162`, the fast-forward banner) and `teach2-rail-lines` loses its `:69` test; F7.5 repoints 8 files, none of them
   on the old view.
2. **A test-only load path is needed.** Out of `LIBRARY`, a fixture cannot be opened by `?scenario=<id>` (`main.ts:265–279`
   looks it up in the library). F7.5 needs one test-only entry, e.g. the existing e2e hook `__pmeApp.session.loadScenario(doc)`
   fed the fixture's JSON from the test (as `debrief.e2e.ts:288–300` already feeds a recorded run). No route, flag or
   library entry in the product (the anti-goal in section 2).
3. **Order.** F7.5 runs after this plan's PR 3 (the flip), so that no suite it repoints is still on the old view and
   none has to be repointed twice. `DEMO_CARDS` (`views/scenarios.ts:21`, read by `teach2/begin.ts:16, :60–61`) then
   names `showcase-mh-v2` and `showcase-haemorrhage-v2`; that change is F7.5's (or row 51's), not this plan's.

### 3.6 What the removal buys (measured at `21162565`; main run 42114485878 for CI times)

**Code.** Phase 1 removes `views/teach.ts` (25 lines), `briefingEnd`, 34 CSS lines (3,675 bytes; two of them edited) of the `teach` route
and the drawer, the Settings choices and the instructor indirection in 9 files. Phase 2 removes `panel/panel.ts`,
`panel/scenario.ts`, `panel/drugs.ts`, `sessionbar.ts` (569 lines, 33,068 bytes of source) and 14 further CSS lines
(1,497 bytes: `.sessionbar`, `.stagebar`, `.sb-`), plus `panel/scenario.dom.test.ts` and `panel/panel-load-tab.dom.test.ts`
(205 lines).

**Bundle.** `vite build --sourcemap` of `apps/demo`: the app chunk `index-*.js` is 505,617 bytes minified (165.97 kB
gzip in the plain build), CSS 105,637 bytes. Bytes of that chunk mapped back to each source file by its source map:
`views/teach.ts` 689; `panel/panel.ts` 3,339; `panel/scenario.ts` 4,459; `panel/drugs.ts` 5,186; `sessionbar.ts` 3,357.
Phase 1 frees ≈ 0.7 kB of minified JS (0.14 % of the chunk) because the Remote keeps the panel; phase 2 frees ≈ 16.3 kB
(3.2 %). The gzip saving was not measured per module and is not claimed.

**Tests.** End-to-end, per browser project: 193 tests in 87 files (Chromium `--list`); **76 tests in 41 files drive the
old view** (the table in section 7, PR 2). 9 retire (their intent is held by a named v2 test), 66 are ported or edited,
1 is the Remote's (phase 2). Unit: `apps/demo` has 815 tests in 104 files (`vitest list`); phase 1 rewrites
`instructor-choice.dom.test.ts` (7 → 4) and edits 2 others; phase 2 deletes 9 and converts to literals (or drops, for the two session-bar readers) the 38 tests that use the panel
as their oracle. In flight: PR #271 adds `press-across-repaint.e2e.ts` (1 of its 2 tests on the old panel), PR #264 adds
`restart-keeps-case.e2e.ts` and `stage-group-one-tick.e2e.ts` (1 test each, both on the old view), read on their branches.

**CI minutes.** Main run 42114485878: 25 jobs, 435 job-minutes, 93 min wall including the queue (the two before it: 402
and 469 job-minutes). E2E test time in that run: Chromium 97.9 min over 193 tests, WebKit 66.0 min over 193 (48
skipped). The 76 old-view tests take 25.4 min (Chromium) and 21.3 min (WebKit) of it. **Retiring the 9 saves 0.64 min
(Chromium) + 1.95 min (WebKit) of test time per run, ≈ 1.6 % of the e2e test time**; the ports run as long as before (or
longer, not measured until they exist). The census unit test crawls both views in 62.8 s here; crawling one should
shorten it, not measured. The removal does not buy CI time worth naming. It buys one UI: the double wiring stops (2 of
72 PRs merged since 29 October touched both views, plus #271, the lock and D5 in flight), the default stops pointing
at the view the owner retired, and new tests stop being written against it.

## 4. Decisions this plan makes where the rulings are silent

1. **Two phases.** Phase 1 retires the laptop route `#/teach`; the Remote keeps its panel until the phone layout gives
   it a v2 form (row 17; the Room plan's P7 already treats today's panel there as a placeholder). Removing the Remote's
   panel now would leave the tablet and second-window instructor with nothing. Reversible: Q1.
2. **Tests leave the default before the default changes.** PR 2 makes every affected test open `#/teach2` explicitly
   (or set `site: { instructor: 'teach2' }` where it only deep-links), while the default is still today's view; PR 3
   then flips and deletes with a small diff whose only red tests are the deliberate removals.
3. **Port unless a v2 test holds the same intent.** The table in section 7 PR 2 is binding: R (retire, the replacing
   v2 test named), P (port: the same steps through v2's controls, the same expectations), PM (port and re-measure: a
   geometry assertion measured on v2's monitor pane), PG (port after a gap closes), E (edit: drop only the old-view step),
   K (the Remote's; phase 2).
4. **Where the gaps go.** G1: the "Learner controls on the monitor" toggle moves into the Devices body (`panel/devices.ts`,
   which both views mount), host only, same words, same log note: the strip is a thing on the monitor, and a shared body
   gives the Remote and v2 the same control. G2: "Hold the stage timer" / "Resume the stage timer" in v2's cue box beside
   the in-stage clock (`teach2/cue.ts:85–87`, which already reads `sv.paused` as "frozen"). G3: an Onset choice in v2's
   shared tray beside Deliver (`teach2/sheets.ts:56–60, :84–86`) with the old five values; `Cache.commit` applies
   `withRamp` to each item (only `setTarget` and `pin` ramp, as `staging.ts:74–80` already decides).
5. **Stored site profiles.** `pme-site/1` keeps its schema id; `parseSite` drops `instructor` and `panel` (an exported
   site file with them still imports). No migration step: there is nothing to choose any more.
6. **Parity oracles.** Phase 1: unchanged (the Remote's panel is still in the tree). Phase 2: before the panel files
   are deleted, one commit records what today's bodies send (commands, log lines, toasts) as literals inside each parity
   test, generated by running the test once against the panel; the next commit deletes the panel. The census switches
   its literal to `INSTRUCTOR_COMMANDS` as the peer-role plan already says (`census.dom.test.ts:10`).
7. **`begin.ts`'s load fallback goes in phase 1** (L13): `Teach2Ctx.loadScenario` becomes required. A future hostless v2
   (the phone) is refused `scenario load` by the peer-role rules anyway.
8. **From this plan's merge on, no new test is written against `#/teach`.** The two in-flight PRs that add old-view
   tests (#271, #264) join PR 2's port list when they land; if they land after PR 2, the executor of PR 3 ports them.
9. **The kit's showcase suites flip with the app** (PR 4): `PME_PANEL` defaults to `teach2`; the `/1` kit rounds whose
   `/2` twin exists retire (Q9).

## 5. Global constraints (every piece)

- Common rules (`scratch/briefs/post-demo/00-common-rules.md`): own worktree from `origin/main`; never merge, tag, push
  `gh-pages`, force-push or rebase; one PR per piece group, draft until its own checks pass; identity through the
  environment on every commit; no closing keyword before a `#number`; the PR body ends with the Claude Code line.
- What every v2 control sends is unchanged (the census stays green at every commit, with `scenario pause`/`resume`
  moving into v2's column in PR 1).
- No change to `packages/engine-core`, `packages/controller` source, `packages/renderer`, `packages/skins`, a card JSON
  or the follower views. G2 uses the controller's existing `scenario pause`.
- A port keeps the test's name, its tags (`@known-flaky` stays where it is) and its expectations; it changes only how
  the test reaches the control. Any change to an expected number is a finding, reported, not committed.
- `docs/validation/known-misses.md` and `docs/model/*` regenerate when a test or a documented module changes.
- Local runs: only the touched unit files and the touched e2e files, one pass each on Chromium and WebKit; never a full
  suite locally; at most three browser executors on this Mac at once (5 November 07:26).
- Ports from the assigned range only; never 8650, 8711, 5199, 5180, 5190.

## 6. Review focus

1. Each ported test's `expect` lines diffed against the original: the same facts, reached through v2.
2. After PR 3: `grep -rnE "#/teach([^2]|$)|\.sessionbar|data-tab=|\.stagebar|Instructor panel" apps/demo/e2e` finds only
   the Remote's tests (and `scripts/showcase` after PR 4 finds none).
3. The census after PR 1: v2 sends every shape of the union; after PR 3 the crawl of today's view is the Remote's.
4. G3: a held value delivered "over 2 min" ramps (the Vitals body's progress bar, `panel/vitals.ts:107–110`, moves) and
   the log line says the onset, as the old footer's commit did.
5. A stored profile with `instructor: 'teach'` opens v2; `#/teach` opens v2; the rail marks "Instructor" on it.
6. The Remote still works end to end after PR 3 (`app-one-session.e2e.ts:100`).

## 7. Pieces, grouped into four pull requests (phase 1) and one (phase 2)

Plan hours are human-equivalent focused hours, as the other plans count them; executor-hours are plan h ÷ 8 to ÷ 6
(`research/42-ci-and-process-review.md` §2.1: six pieces measured on 4–5 November took 5–9 times less executor wall
time than their plan hours), rounded to 0.1 h.

### PR 1: the three gaps, G1 + G2 + G3 (in that order)

#### G1: Learner controls on the monitor, in the Devices body (2 h)

**Depends on:** nothing. **Files:** `apps/demo/src/app/panel/devices.ts`, `panel/scenario.ts:50–58` (the toggle moves
out), `panel/devices.dom.test.ts`, `e2e/app-one-session.e2e.ts:82`.
- [ ] **Red:** on a host link, the Devices body shows "Learner controls on the monitor", off; switching it on calls
  `host.setLearner(true)` and writes the note "Learner controls shown on the monitor" (`system`); a load turns it off
  (`main.ts:130`, `session.ts:445`) and the switch follows (`host.onLearner`); on a Remote (no host) it is absent.
- [ ] **Implement:** the toggle and its hint move from the Scenario tab into the Devices body, unchanged in words.
- [ ] **e2e:** `app-one-session.e2e.ts:82` opens `#/teach2`, the Devices sheet, the switch; the learner strip, the
  `Charge 200 J` press and the learner log line as today.

**Acceptance:** red then green; the census unchanged (no command). **Must not touch:** `session.ts`, the learner strip.
**Gate:** typecheck, unit, the e2e file on both projects, CI. **PR:** 1.

#### G2: Hold the stage timer, in v2's cue box (2 h)

**Depends on:** G1 (same PR). **Files:** `teach2/cue.ts`, `teach2/cue.dom.test.ts`, `teach2/census.dom.test.ts:31`
(comment).
- [ ] **Red:** with a case loaded, the cue box shows "Hold the stage timer"; a press sends `{ type: 'scenario', action:
  'pause' }` and the in-stage clock reads "frozen" (`cue.ts:85–87`); the button then reads "Resume the stage timer" and
  sends `resume`; no case, no button; the census lists `scenario pause` and `scenario resume` under v2 too.
- [ ] **Implement:** one button in the cue box, the commands of `panel/scenario.ts:63`.

**Acceptance:** red then green; census green with v2 ⊇ union. **Must not touch:** the strip, ACTION.
**Gate:** as G1. **PR:** 1.

#### G3: The onset of a staged delivery (3 h)

**Depends on:** G2 (same PR). **Files:** `teach2/sheets.ts`, `teach2/cache.ts`, `teach2/cache.dom.test.ts`,
`teach2/sheets.dom.test.ts`.
- [ ] **Red:** staging HR 140 and SpO₂ 88 in the Vitals sheet, Onset "Over 2 min", Deliver: one `sendBatch` whose
  `setTarget`/`pin` items carry `ramp: { durationS: 120, curve: 'linear' }` and whose other items carry none
  (`staging.ts:74–80`); Onset "Now": no ramp (today's v2 behaviour); the choice persists across sheets (one cache).
- [ ] **Implement:** the Onset select beside Deliver in the tray, five values as `panel/panel.ts:36`; `Cache.commit`
  maps items through `withRamp`. No "Apply at once" (G3b).
- [ ] **e2e:** one test added to an existing v2 file (`teach2-keys.e2e.ts` holds the sheet tests): a delivered target
  "over 1 min" moves the Vitals body's progress bar and reaches its value within 60 ± 2 s of simulated time.

**Acceptance:** red then green. **Must not touch:** `staging.ts` semantics, the engine's ramp.
**Gate:** as G1. **PR:** 1.

**PR 1 size:** 7 plan h → **0.9–1.2 executor-h**; 1 PR run + 1 main run.

### PR 2: every test off the old view (75 tests per project; with G1's test in PR 1, 76 in 41 files)

**Depends on:** PR 1 merged (it moves the learner toggle and ports `app-one-session:82`; PR 2's ports of the same file
build on it). The four other PG tests depend on Q5 (they move to `#/remote`), not on PR 1.
**Files:** the e2e files below; `apps/demo/e2e/app-support.ts` gains v2 helpers (`speedV2`, `pauseV2`, `ffV2`, `sheet`,
`deliver`, `debriefLinkV2`), lifted from the kit round's dual paths (`scripts/showcase/kit-round-a.kitround.ts:134–236`,
which already does each action on both views). No product file.

Classification, measured per test from main run 42114485878 (seconds of test time, Chromium / WebKit; a WebKit test
skipped in CI shows 0):

| File:line (tests) | Class | What it checks | v2 path, or the v2 test that holds the intent | s (C / W) |
|---|---|---|---|---|
| `scenario-choose-another:14` (1) | R | the in-panel library stays open across repaints | no in-panel library on v2; the case list: `teach2-fit.e2e.ts:258` | 7 / 7 |
| `scenario-panel-stale-press:19` (1) | R | a button drawn for the previous state acts on the current one | `teach2/action-parity.dom.test.ts` "a row drawn for a state the case has left", `press.dom.test.ts` | 4 / 31 |
| `ui-polish-a:22` (2) | R | the Scenario tab's long next-step buttons wrap | `teach2-fit.e2e.ts:104, :175, :216, :505` (every open step a row; long titles wrap in the box) | 8 / 44 |
| `ui-polish-a:52` (2) | R | toasts stay off the monitor stage on a Load | `teach2-fit.e2e.ts:549` (a toast rests on the dock, 2 sizes) | 10 / 22 |
| `ui-polish-a:119` (2) | R | a Load opens the Scenario tab | v2 has no tabs; a Load hands the pane to ACTION: `teach2-fit.e2e.ts:258` | 6 / 8 |
| `teach2-rail-lines:69` (1) | R | today's view keeps its rail after visiting v2 | no second view | 4 / 4 |
| `alarm-off-label:15` (1) | P | the alarm count names which alarms are off; Sound reachable narrow | v2's alarm line (`teach2/alarm-line.ts:26`) and header Sound | 4 / 3 |
| `app-accessibility:15` (2) | PG | axe-style audit of each tab, laptop and iPad portrait | each v2 sheet at 1280 × 800; the iPad portrait run audits `#/remote` (Q5) | 41 / 47 |
| `app-glossary:16` (1) | P | no engine id in a clinical view | the v2 sheets instead of the tabs; the Remote part unchanged | 40 / 45 |
| `app-instructor-tasks:24` (1) | P | five instructor tasks under 30 s each | the same five through v2 (Vitals sheet + Deliver, ACTION row, Drug sheet, Log sheet) | 11 / – |
| `app-one-session:30` (1) | E | every view shares one session | drop `#/teach` from its route list (`:15`) | 8 / 8 |
| `app-one-session:52, :65` (2) | P | stalled worker; deep link opens the instructor view | open `#/teach2`; the header's case title instead of `.sessionbar .scen` | 10 / 12 |
| `app-one-session:82` (1) | PG | learner controls | ported in PR 1 with G1 (the toggle moves out of the Scenario tab there) | 5 / 8 |
| `app-one-session:100` (1) | K | a remote pairs and changes the host patient | unchanged: the Remote is phase 2 | 6 / 6 |
| `app-tamponade-propofol:17` (1) | P | tamponade from the Patient tab, propofol, pulseless within 5 min | Patient sheet + Deliver, Drug sheet Give | 33 / – |
| `app-view-shots:33` (4) | P | review screenshots of the views | v2 sheets instead of tabs; the Remote shot unchanged | 215 / – |
| `case-briefing:52` (1) | E | briefing over host and phones; End briefing everywhere | drop the `#/teach` step (`:148`) | 23 / – |
| `debrief:51, :198, :225, :323, :435, :466` (6) | P | the Debrief prints, notes kept, free run pages, Debrief B on A3.1, MH and haemorrhage | `pauseHost`/`openDebrief`/`showRecorded` (`:36–70, :288–300`) through v2's header pill and the dock's Debrief link; the page heights unchanged | 128 / 385 |
| `explore-baseline:22, :31` (2) | P | Explore's 1-minute baseline | speed through v2's header | 63 / 64 |
| `fx14-pause-while-hidden:37` (1) | P | a hidden instructor tab pauses | v2 header pill | 16 / 17 |
| `fx16-follower-beep-gate:62` (1) | P | a phone beeps for every host beat at ×4 | v2 header speed | 28 / – |
| `fx18-shortcuts-typing:16` (1) | P | typing is text; `i` toggles the instructor view | `#/teach2`; the region is v2's | 4 / 4 |
| `fx24-follower-after-fast-forward:139` (1) | P | a phone after a fast-forward | v2's Fast forward box | 36 / 39 |
| `fx25-co2-attach:74` (1) | P | the CO₂ lane starts blank at the attach | Devices sheet | 20 / 20 |
| `fx4-alarm-pause:17` (1) | P | alarm pause follows the skin | Devices sheet | 4 / 5 |
| `ibp-scales:35, :165, :191` (3) | P | Devices sets IBP scales; a follower and a phone draw them | Devices sheet | 8 / – |
| `ibp-scales:90` (1) | PM | scale text and dotted lines follow #258's k at 1280 × 800 and 1920 × 1080 | measured on v2's monitor pane | 13 / – |
| `learner-monitor-follows:93, :126, :135` (3) | P | the second-screen monitor follows | v2 header speed (`:60`) | 86 / – |
| `mobile-learner:93, :174, :207` (3) | P | phones follow through speeds, a style change, a pause, a fast-forward | v2 header (`:115, :135, :191`) | 62 / 17 |
| `oxygen-by-mask:27` (1) | P | O₂ by mask through Stage + Commit, logged, printed | Airway sheet + Deliver | 26 / – |
| `reload-keeps-case:29` (1) | P | a reload mid-card comes back | v2 header, the strip instead of the Scenario tab (`:56–79`) | 20 / – |
| `return-here-restore:15` (1) | P | Return here restores the clock, trends and waves | the Log sheet's Return here | 13 / 14 |
| `saadat-bfi-etaa-row:106` (3) | PM | the BFI/EtAA row has clear space at 1280 × 800, 1920 × 1080, 1990 × 920 | measured on v2's pane | 56 / 61 |
| `saadat-instructor-tiles:140` (3) | PM | no Saadat tile text overlaps at 1990 × 920, 1990 × 1080, 1496 × 900 | measured on v2's pane | 92 / 164 |
| `session-pause-label:14` (1) | P | Pause stays "Resume" while the host is slow | v2 header pill (its `asking` guard, `teach2/header.ts:94`) | 6 / 7 |
| `showcase-capnogram:28` (1) | P | attaching the line brings the capnogram | Devices sheet | 28 / 57 |
| `showcase-clock:19` (1) | P | another Load restarts the clock and the time in state | v2 header clock, the cue box's in-stage clock | 22 / 24 |
| `showcase-events-layout:37` (2) | PG | acute events lay out at 1280 × 800 and 1024 × 768 | the Patient sheet at 1280 × 800; 1024 × 768 runs on `#/remote` (Q5) | 9 / 15 |
| `sim-line:63` (1) | E | the line never on the instructor pages | drop `#/teach` (`:70, :78`) | 7 / 61 |
| `sound-toggle:16` (1) | P | Sound on/off agrees with the audio | v2 header Sound switch | 3 / 3 |
| `teach2-keys:76` (1) | E | the alarm count and `i` go to the chosen view | v2 only: the Devices sheet | 6 / 6 |
| `time-control:31, :178` (2) | P | ×8 and a 5-min fast-forward from the instructor view | v2 header and Fast forward box | 40 / – |
| `ui-polish-a:162` (1) | P | the fast-forward banner sits under the bars, not on the Debrief, never in print | v2's header instead of the session bar | 14 / 17 |
| `ui-polish-b:18, :39` (2) | P | PAUSED over the monitor; the cuff on AUTO after a Load | v2 header pill; the pane's NIBP tile | 34 / 36 |
| `vent-handover-phones:62` (1) | P | leaving the Ventilator view hands the patient back | back to `#/teach2` (`:103`) | 179 / – |
| `vent-view-new-patient:16, :45` (2) | P | the cockpit unloads on a new patient | back to `#/teach2` | 10 / 8 |
| `vent-view-restore:42` (1) | P | Return here on the Ventilator view | v2 header speed | 48 / – |
| `vent-view-speed:14` (1) | P | the Ventilator view takes a later speed change | v2 header speed | 4 / 3 |

Totals (Chromium): R 9 tests, 39 s; P 50; PM 7; PG 5; E 4; K 1: **76**. Not affected: `scenario-runner-page.e2e.ts` and
`pacer-overlay-device-tab.e2e.ts` use `data-tab` on the controller's developer pages (`packages/controller/src/panel/`),
not the app's panel.

- [ ] **Red first, per file:** each ported file run once on main as it is (green), then its steps changed to v2 and run
  again; a port is committed only green on both projects, with its expectations unchanged.
- [ ] **PM files:** the same assertion measured on v2's monitor pane at the same window sizes; the measured boxes go in
  the PR body. If v2's pane fails an assertion the old view passed, the executor stops that file and reports it as a v2
  finding (section 2's anti-goal).
- [ ] **R files:** deleted, each with the replacing v2 test named in the commit message.
- [ ] **In flight:** the old-view tests of #271 and #264 (3) if they have merged; otherwise noted for PR 3.

**Acceptance:** the grep of section 6 item 2 finds only `app-one-session:100` and the Remote parts of `app-glossary`,
`app-view-shots`, `app-accessibility` (iPad), `showcase-events-layout` (1024 × 768); every ported test green on both
projects; the `e2e-count` job's total is the count at PR 2's base minus exactly the 9 retired tests. **Must not touch:** any product file. **Gate:** e2e both
projects, the known-misses regeneration, CI. **PR:** 2.

**PR 2 size:** mechanical P/E 54 tests ≈ 8 plan h, PM 7 ≈ 4 h, PG 4 ≈ 1 h, R 9 ≈ 0.5 h: 13.5 plan h → **1.7–2.3
executor-h**; 1 PR run + 1 main run, plus the expected review re-run (≈ 1 in 3). It may be split in two (P/E/R; PM/PG)
if the reviewer prefers smaller diffs; the CI load then doubles.

### PR 3: the flip and the deletion (L1–L13) and the living docs

#### F1: The default, the route, the deletion (5 h)

**Depends on:** PR 2 merged. **Files:** L1–L13 (section 3.1); `instructor-choice.dom.test.ts`, `site.test.ts`,
`case-briefing.dom.test.ts`, `router.test.ts`.
- [ ] **Red:** `parseRoute('#/teach')` is `teach2`; `ROUTES` has no `teach`; `parseSite({ instructor: 'teach', panel:
  'drawer' })` has neither key; the rail's Instructor entry links `#/teach2` and is current on it; Settings has no
  "Instructor view" and no "Instructor panel on wide screens"; a deep link `?scenario=<id>` with no hash lands on
  `#/teach2`; the `i` key toggles Monitor ↔ v2; `teach2/begin.ts` without `loadScenario` does not type-check.
- [ ] **Implement:** delete L1, L2, L10–L12; edit L3–L9, L13 as listed; regenerate `docs/model/*`.
- [ ] **Measure:** rebuild with source maps and record the new `index-*.js` and CSS sizes in the PR body (the expected
  phase-1 drop is ≈ 0.7 kB JS and ≈ 3.7 kB CSS source, less the two edited lines; the build is the measurement).

**Acceptance:** typecheck, unit (815 → 812: −3 in `instructor-choice`), e2e both projects green with nothing on `#/teach`
but the alias test. **Must not touch:** `panel/*`, `sessionbar.ts`, `views/remote.ts` (phase 2). **Gate:** typecheck,
unit, e2e both projects, model-docs guard, CI. **PR:** 3.

#### F2: Living docs (2 h)

**Depends on:** F1 (same PR). Measured at `21162565`: outside `docs/plans`, `docs/gates`, the kit-round records and the
generated model pages (`docs/model/presentation.md` regenerates with F1; `docs/model/control.md:232` names the
controller's own developer panel, not this view), 13 files name the old view or its parts, and `docs/DESIGN-BRIEF.md`
names "Instructor v2".
- [ ] **Rewrite** (they describe how to run the app today): `docs/showcase/RUN-STEPS.md` (`:21, :28, :45, :59`: the tab
  names → the sheets), `docs/guides/scenario-authoring.md` (2 lines), `docs/guides/known-deviations.md` (`:276`, the session bar's Pause label → v2's clock pill),
  `docs/showcase/KIT-GATE.md` (`:236`, the sub-path check's URL → `#/teach2`), `docs/roadmap/v1.0-remaining.md` (the E127
  row `:45`: "the only instructor UI since <PR 3>"), `docs/DESIGN-BRIEF.md` ("Instructor v2" → "Instructor"), `CHANGELOG.md` (one Changed entry, one Removed
  entry), `apps/demo/scripts/app-frame-intervals.mjs` (opens `#/teach`).
- [ ] **Leave as records, with one dated header line** ("Recorded on the 3 November build; the old Instructor view was
  retired by PR <n>; see docs/plans/retire-instructor-v1.md"): `docs/showcase/SHOWCASE-2-RUN-SHEET.md` (21 lines),
  `SHOWCASE-2-PRESENTER-GUIDE.md` (8), `SHOWCASE-2-CUE-CARDS.md` (7), `SHOWCASE-2-MEASUREMENTS.md` (8),
  `docs/showcase/resolution-audit-2026-11-04.md` (1), `docs/roadmap/v2.0/evidence/hosted-relay-design.md` (1). Q7.
- [ ] `docs/plans/*` are history and are not edited, except this plan's STATUS line.
- [ ] The kit's `scripts/showcase/kit/read-me-first.txt:21` ("Scenarios" or "Instructor") stays true: no change.

**Acceptance:** the docs-only reviewers' read; `docs/model/*` regenerated by F1. **Gate:** with F1. **PR:** 3.

**PR 3 size:** 7 plan h → **0.9–1.2 executor-h**; 1 PR run + 1 main run.

### PR 4: the kit's showcase suites on v2 (4 h)

**Depends on:** PR 3 merged. **Files:** `scripts/showcase/kit-round-a.kitround.ts` (21 tests; 28 old-view lines, the
`PANEL` switch at `:25–30`), `showcase-support.ts` (`openTeach`, `:29–30, :85–107, :158`), `multiwindow.showcase.ts`,
`rehearsal.showcase.ts`, `time-control.showcase.ts` (5, 1, 8 and 5 tests). These suites are not in CI; they run as kit
rounds.
- [ ] `PANEL` defaults to `teach2`; `openTeach` opens `#/teach2`; every session-bar and tab step goes through the kit
  round's existing v2 branch.
- [ ] The `/1` kit rounds with a `/2` twin (`A4 MH (E119)` `:1773` ↔ `:1863`; `Q1 30-minute talk` `:1518` ↔ `:1942`;
  `A4 haemorrhage (E120)` `:2153` ↔ `:2244`) retire (Q9); the `/1` rounds without one (A3 tamponade, bronchospasm,
  anaphylaxis, inductions, session mechanics) run on v2.
- [ ] One kit round on both browsers on the PR's head; its JSON summaries committed under `docs/showcase/` as before.

**Acceptance:** the round's pass lines in the PR body. **Must not touch:** the product. **Gate:** the kit round, CI.
**PR:** 4. **Size:** 4 plan h → **0.5–0.7 executor-h**, plus the kit round's own wall time (the MH rounds set
40-minute timeouts, `:941, :1057`); 1 PR run + 1 main run.

### PR 5 (phase 2, after the phone layout): the Remote's panel goes (5 h)

**Depends on:** the phone layout on `#/remote` (row 17; the Room plan's P7 form in front of it). **Files:**
`panel/panel.ts`, `panel/scenario.ts`, `panel/drugs.ts`, `sessionbar.ts` (deleted; `SPEEDS` into `teach2/header.ts`),
`views/remote.ts`, `app.css` (14 lines), the parity tests (section 3.2), `panel/scenario.dom.test.ts`,
`panel/panel-load-tab.dom.test.ts`, `panel/devices.dom.test.ts` (3 tests), the K and Remote-part e2e tests.
- [ ] **Freeze the oracles** (Decision 6): one commit turns each parity assertion into literals recorded from the panel;
  green with the panel still present. Then the deletion commit.
- [ ] Census: v2 only, against `INSTRUCTOR_COMMANDS`.
- [ ] **Measure** the bundle again (expected ≈ 16.3 kB of the app chunk, less `SPEEDS`).

**Size:** 5 plan h → **0.6–0.8 executor-h**; 1 PR run + 1 main run. Not scheduled by this plan.

## 8. Partition, merge order, CI load

```
PR 1 (G1 → G2 → G3) ── PR 2 (tests off the old view) ── PR 3 (F1 → F2) ── PR 4 (kit suites)
                                                                    ·
                       phone layout (row 17, Room P7) ─────────────── PR 5 (phase 2)
F7.5 (scenario-format plan) after PR 3; D5 (Debrief 2 PR 3) at any time, one shared file
```

- **Why a chain:** PR 2 edits `app-one-session.e2e.ts` after PR 1's port of its `:82`; PR 3 deletes what PR 2's ports stopped using; PR 4's kit rounds
  need the flipped default. PR 1 and the first half of PR 2 share no file and may be written in parallel; PR 2 merges
  after PR 1.
- **File overlaps with work in flight:** PR 1 touches `teach2/cue.ts` and `teach2/sheets.ts` (P6, PR #278, touches
  `cue.ts`); `panel/devices.ts` (none open). PR 3 touches `main.ts` (#264, #266, #278 all do) and `teach2/begin.ts`
  (merged #272 already in this plan's base). Whichever merges second merges main into its branch first.
- **Effort:** phase 1 = PR 1 0.9–1.2 + PR 2 1.7–2.3 + PR 3 0.9–1.2 + PR 4 0.5–0.7 = **4.0–5.4 executor-hours**
  (31.5 plan h); phase 2 = 0.6–0.8 executor-h.
- **CI load:** 4 PR runs + 4 main runs, plus about one review re-run in three and one re-merge run in two (the 5
  November ratios, review §1): ≈ 10–12 full runs. At the measured 402–469 job-minutes per full run (main runs
  42110103732, 42111730347, 42114485878), ≈ 4,000–5,600 runner-minutes; at ≈ 47 min per PR run after #279, the
  calendar is CI-bound: about one PR a half-day with the queue as it is.
- **The owner's own time:** answering section 10 (nine questions, defaults given); optionally a look at v2's three new
  controls (G1–G3) on his laptop after PR 1; no Persian and no clinical source to read.

## 9. Dependencies and out of scope

- **Depends on:** nothing unmerged for PRs 1–4. PR 5 depends on the phone layout and the instructor peer role P7.
- **Interacts with:** F7.5 (section 3.5), Debrief 2 D5 (section 3.4), the Room plan's R7 ("Room setup" opens `#/room`,
  `begin.ts:121, :144`), the long-file split of `teach2-fit.e2e.ts` (brief 34: PR 2 does not touch that file), the
  WebKit retry rule (#285: a ported `@known-flaky` test keeps its tag).
- **Out of scope:** the phone layout, the Gas sheet, E139, E140, E141, the `/1` → `/2` card port (row 51), the
  `DEMO_CARDS` change (F7.5), renaming `#/teach2` (Q6).

## 10. Questions for the owner (each with the default the plan uses)

| # | Question | Default used |
|---|---|---|
| Q1 | The Remote (a second window, or a tablet over the relay) keeps today's panel until the phone layout replaces it. Retire it now instead, leaving no tablet instructor until then? | Keep it until the phone layout (phase 2) |
| Q2 | "Hold the timer" stops the case's rules and timers while the body runs on. v2 has no such button. Keep it (one button in the cue box)? | Keep it |
| Q3 | "Learner controls on the monitor" (charge, shock, CPR, drugs as buttons under the learners' monitor) is switched on only from today's Scenario tab; no card turns it on. Keep it, in the Devices sheet? | Keep it, in the Devices sheet |
| Q4 | Today a staged change can arrive "over 30 s / 1 / 2 / 5 min"; on v2 it arrives at once. Add the same Onset choice beside Deliver before the old view goes? | Yes, before |
| Q5 | Below 1280 × 720 (an iPad as the main instructor screen) v2 is not designed; today's view had an iPad drawer and portrait layout. Use the Remote on a tablet until the phone layout? | Yes: tablets use the Remote |
| Q6 | The address stays `#/teach2` (old `#/teach` links open it) and the rail and title say "Instructor". Rename the address later? | Keep `#/teach2`; rename only if you ask |
| Q7 | The 3 November run sheet, cue cards, presenter guide and measurements describe today's view. Keep them as records with one header line, not rewritten? | Keep as records |
| Q8 | Today's view showed the full-size monitor beside the controls; v2 shows it smaller with Swap to the Monitor view, and the in-place swap (E139) later. Acceptable until E139? | Yes |
| Q9 | Three kit rounds run the `/1` MH, talk and haemorrhage cards on today's view, and each has a `/2` twin on v2. Retire the `/1` three? | Retire them |

## 11. Self-review against the codebase at `21162565`

- Every `file:line` in sections 3 and 7 was read at `21162565` (main after PR #272). Lines that #272 moved in
  `teach2/begin.ts` (the case list at `:60`, the load at `:99–103`, "Room setup" at `:121, :144`) were re-read after the
  fast-forward from `42da0eef`.
- The 76 tests per project were found by markers (`#/teach` not followed by `2`, `data-tab=`, `.sessionbar`, `.stagebar`,
  "Instructor panel", the `tab()` helper) and by deep links that land on the default view and then use the session bar;
  each test block was read for which of them it uses. `scenario-runner-page` and `pacer-overlay-device-tab` match
  `data-tab` on the controller's own developer pages and are not counted. A test that deep-links and only reads
  `#/monitor` (e.g. `room-qr-tab-guard`) is not affected by the flip and is not counted.
- The census is a real run, not a reading: 29 shapes, v2 missing exactly `scenario pause` and `scenario resume`.
- The bundle bytes are source-map attribution of one production build; they are minified bytes per source file, not a
  build with the files removed. PR 3 and PR 5 measure the real drop.
- The CI times are one main run's JSON reports (42114485878, 25 jobs green), not a median; the 9 retired tests' share
  (≈ 1.6 %) is small enough that the run-to-run spread does not change the conclusion.
- Not verified: how v2's monitor pane measures in the 7 PM tests (that is PR 2's measurement); whether the census crawl
  halves in time with one view; the gzip share of the removed modules.
