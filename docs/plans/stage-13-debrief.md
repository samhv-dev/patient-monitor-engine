# Stage 13: the debrief report — a Debrief view the browser prints to PDF — Implementation Plan

STATUS: READY — R50 REVIEWED AND FIXED (2026-10-11; review `scratch/plans-backup/stage-13-review.md`: 0 critical,
5 important, 12 minor, all applied; the orchestrator's rulings Q1–Q7, the footer and build id on every printed page and
the Appendix B re-cut applied; re-prototyped on both engines). Base `origin/main` 26e78308 (FU-11 b, FU-7.1 b merged) +
FU-11 d's blocks = local f3eb6f84; 4 tasks + Appendix B (the expected Task 3 path: Stage 11 keeps string objectives) +
gate; executes after FU-11 d has merged and, per the build order, after Stage 10, 11 and 12 — every block checked with
each of them applied (0 problems)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Prototype: every task below was run in the detached worktree `scratch/wt-stage-13-proto` (base 52981648, one local
> commit per task) and its find/replace and create blocks were CUT MECHANICALLY from those commits
> (`stage-13-plan-tools/blocks.py`): applying every block of this file, in order, to the base reproduces each task's
> tree and the final tree byte for byte (`check.py`: see "Mechanical self-check"). Nothing was committed to any branch
> of the tracked repository, nothing was pushed; the worktrees were removed.
>
> **R50 re-prototype (2026-10-11, review `scratch/plans-backup/stage-13-review.md`).** The reviewer rebuilt the base
> from the REAL state — `origin/main` 26e78308 (FU-11 b and FU-7.1 b merged) + FU-11 d's blocks
> (`fu-11-check-blocks.py --branch d --b-merged --apply`, 0 problems; `fu-11-d` has no commits on origin yet), committed
> locally as f3eb6f84 in `scratch/wt-stage-13-review` — reproduced the plan as written (0 problems, 25 tests and the
> Chromium e2e green), then applied the review's fixes and the orchestrator's rulings Q1–Q7 task by task and re-cut every
> block from that chain (`chain.txt`). Appendix B was re-cut from f3eb6f84 + Stage 11's READY card files
> (`scratch/plans-backup/stage-11-proto-files/`) + Tasks 1–2 (`chain-b.txt`). Patches: `stage-13-prototype.patch` (base
> → final) and `stage-13-prototype-appendix-b.patch`; evidence (both engines' print screenshots, the Chromium PDF and its
> five pages as PNG): `stage-13-prototype-shots/`. The worktree was removed; the chain commits are local objects only.

**Goal:** the owner's request — "a PDF report after a scenario is run, using the logs, objectives met, etc." — as a
Debrief view in the app that the browser prints to PDF: the case, who ran it, the objectives judged by rules, the
measured facts (the model's labs included), trend charts, drugs and fluids, the timeline (returns to a bookmark
included, the undone course struck through), bookmarks, notes, a one-row-per-minute appendix, and "education only, not a
medical device" with the build on every printed page; the same data as a JSON download; no PDF library, no new
dependency, no physiology change.

**Architecture:** a `RunRecord` (new, `apps/demo/src/app/record.ts`, plain JSON data) owned by the host's
`AppSession` records the run from the two streams the host already has: the wire events on its own panel's end of the
in-process hub (every `commandApplied` — panel, Remote or scenario — the scenario's states, `timeline`) and the engine
events (alarm status, breaths, the 1 Hz truth's circulation, measurements → a 1 Hz trend of six numerics, and the
model's labs: K⁺, lactate, pH, glucose, core temperature). It lives
beside the engine, not in its snapshot: a return to a bookmark undoes the rows after it (they stay, marked undone) and
rewinds its trend. Objectives may carry a rule (`pme-scenario/1` gains `{ text, rule }`), judged by a pure evaluator
(`apps/demo/src/app/debrief.ts`) on the kept course, which also states the facts. The view
(`views/debrief.ts` + `views/debrief.css`, one route) draws it with inline SVG charts and print CSS (A4 portrait,
chrome hidden, no colour needed, the footer and the build — a Vite `define` — on every page); the session bar links to
it and marks it when the scenario reaches a state with no way out.

**Tech Stack:** TypeScript 5.9 strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no parameter properties),
Vitest 3.2.7, Playwright 1.63 (Chromium + WebKit), ajv (already the scenario validator), pnpm 9.15.9 via `npx`, Node
≥ 22.12. No new dependencies (the e2e reads the PDF with `node:zlib`).

**Spec:** the brief `../scratch/briefs/plan-stage-13-debrief.md` (workspace, outside this repo), FU-11's plan
(`docs/plans/fu-11-hardening.md`: Part E — one timeline, trends rewindable, a restore is a `timeline` event; Part B4
alarm status), Stage 11's brief and prototype (`../scratch/briefs/plan-stage-11-scenarios.md`,
`../scratch/plans-backup/stage-11-prototype.patch`: objectives written as measurable statements), Stage 10's plan
(`docs/plans/stage-10-time-control.md`: files shared, checked), `docs/RESUME.md` (process, R45, R50, R56).

---

## Global Constraints

- **No physiology change.** No engine, model, constant or band changes; `packages/engine-core/**` is not touched. The
  record reads what the engine already emits (alarm status, `breath`, the 1 Hz truth's `hemo.circ.arrest` and
  `resp.temp.tc`, `measurement`, the 1 Hz `labs` and `endo` events).
- **R45: no test band changes.** No existing test is edited except where this plan's own blocks say so (none in the
  main path; Appendix B adapts Stage 11's `showcase-cards.test.ts` to `{ text, rule }` objectives, without changing any
  band). No tolerance is widened.
- **R56: clinical labels from the glossary only.** Trend and fact labels come from `labelOf('mon.<numeric>')` and
  `unitOf` (the labs from `ev.labs.values.*`, `ev.endo.glucoseMmolL`, `resp.temp.tc`); alarm words from `alarmLine` / `FIXED_ALARM_WORDS`; drug names from `drugName` (the site's US/UK set);
  commands from `describeCommand`. The e2e runs the Stage 9 engine-id scan on the Debrief view (0 hits).
- **Starts after FU-11 d has merged** (FU-11 b and FU-7.1 b are on `origin/main` since 26e78308). 13 of the 15
  existing files this plan edits are FU-11's (12 under apps/demo/src/app/**, plus the scenario schema FU-11 b edits; see
  "File partition") and every block in them was cut against FU-11's patched text. If FU-11 d is not on `origin/main`,
  STOP and report. The build order (orchestrator, 2026-10-10) puts Stage 10, 11 and 12 before this stage: every block
  was checked with each of them applied (see "Mechanical self-check"); with Stage 11 in, Task 3 is Appendix B.
- **Process (RESUME executor brief):** one branch `stage-13-debrief` in the worktree `../scratch/wt-stage-13` from
  `origin/main`; failing test → run red → implement → run green → typecheck → commit with the task's message and the
  trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` → `git push` after EVERY task. Never push to main;
  never merge; the gate opens the PR and stops. Never `git stash`. Never run a command that reads standard input.
  Bounded waits (≤ 10 min per `until` loop). Stop only processes you started, by PID (never an unfiltered `pkill`).
  Scratch files under `<scratchpad>/stage-13/` only (the plan file is untracked in `repo/`: copy it there, Task 0). The machine is shared: targeted tests in tasks, full suites once,
  in the gate.
- **Find/replace discipline:** every edit is a block that occurs exactly once at its place (`check.py --base-dir`
  proves it in Task 0, and in the gate on a fresh checkout of the new `origin/main` if main moved). If main moved and a block no longer matches, locate the
  statement by the surrounding unchanged lines and make the same change; never re-type a line you are not changing.
- **Commands:** `npx -y pnpm@9.15.9 …` (pnpm is not on PATH); no `timeout` on macOS; unit tests from `apps/demo` (or
  `packages/controller`) with `CI=1 npx -y pnpm@9.15.9 exec vitest run <files>`; typecheck `npx -y pnpm@9.15.9 exec tsc
  -p tsconfig.json` in each package touched; e2e `npx playwright test <stem> --retries=0` from the worktree root (both
  projects unless `--project=…`).
- **Copy (R56 and the app's copy rules):** UI copy only, no clinical label invented: "Debrief" (session bar link, view
  heading), "Print or save as PDF", "Download the record (JSON)", the hint "Choose "Save as PDF" as the printer. The
  report reads the run so far; it refreshes while open. The JSON holds the record, not the "Run by" line or the notes.",
  "Run by" (placeholder "Instructor and learners"), section titles "Objectives", "Measured facts", "Trends", "Drugs and
  fluids", "Timeline", "Bookmarks", "Notes", "Appendix: one row per minute", the fact "Labs (the model): last
  (lowest–highest)", the timeline kind "Remote", the marks "✓ Met", "✗ Not met", "– Not assessable", the toast "The
  scenario has ended: the debrief is ready (Debrief, in the session bar)", the footer "For education only. Not a medical
  device: never use it for patient care. Build <id>." and "Page n of N". Every status is a word and a shape, never only
  a colour.
- **Never touch:** `packages/engine-core/**`, `packages/renderer/**`, `docs/physiology/**`, `package.json`,
  `pnpm-lock.yaml`, `.github/**`, `apps/demo/src/app/app.css` (the view's styles are their own file), `shell.ts` (the
  route is not in the top navigation), and Stage 11's content files except by Task 3 / Appendix B's blocks.
  `apps/demo/vite.config.ts` only by Task 4's two blocks (an import line and the `define` at the end; Stage 11 edits
  other lines of it).

## Review Focus

1. **A return to a bookmark in the middle of the run.** The instructor lets the learner fail, returns to a bookmark and
   lets them retry. The report must show what happened (the first try's rows, marked "undone by return 1"), judge the
   retry (rules and charts read the kept course), and not count one breath, alarm or pulse change twice. Pinned in
   Task 1 (`a return to a bookmark marks the discarded course undone…`, the real-host restore test), Task 2 (`reads the
   kept course…`) and Task 4's e2e (bookmark → return → retry).
2. **The Debrief opened before the run is over** (from the session bar at any time). A rule whose window has not closed
   is "not assessable" with the reason ("The run ended 34 s after …"), never "not met"; the view refreshes every 5 s
   while open. Pinned in Task 2 (`eventWithin: … not assessable (… the run ended first)`, `stayed: … window`).
3. **Actions that do not come from this panel** — a Remote's commands, the scenario's own commands, the Ventilator
   view's cockpit (which drives the monitor outside the session). Remote and scenario commands come from the host's
   `commandApplied` stream; ventilation is read from the engine's `breath` events, so the cockpit counts too; late-join
   replays and cockpit mirror frames are not rows. Pinned in Task 1 (`turns commands, states, …` with `mirror`,
   `replay` and scenario-issued commands, and the real-host test that runs the scenario's own commands).
4. **Documents whose objectives are plain strings** (every library case today, Stage 11's cards if they have not
   adopted the rule syntax) and objectives without a rule. They are listed as "not assessable" with "the instructor
   judges it"; an objective the instructor ticked in the Scenario tab says when. Pinned in Task 2 (`objectives: strings
   and rule-less objects are not assessable; a tick … is reported`, and the schema test that accepts both forms).
5. **Printing from WebKit (Safari).** WebKit has no `page.pdf()`, its print preview differs and it has no `@page`
   margin boxes (WebKit 26.6 drops them from the CSSOM: R50 I-4); the report must still print as the report alone, with
   the page breaks, black ink and the footer. Pinned in Task 4's e2e: print-media layout assertions (chrome hidden,
   `break-before: page` on Trends, Timeline and the appendix, `break-inside: avoid` on charts, black strokes, the undone
   course struck through, margin boxes on Chromium / the footer lines before each break on WebKit) on BOTH engines, and
   the PDF on Chromium (page count, A4, title everywhere; its text, every page's footer and build included, on macOS).
6. **A rule whose value was never measured, an event before its anchor, a second anchor, a value event that is
   already past its limit at the start** (R50 I-3, M-3, M-4, Appendix B's MH rule). Not assessable with the reason; the
   event before the anchor does not count; the FIRST anchor is judged; `from` restricts a value event to "after the
   crisis was called". Pinned in Task 2 (`a value never measured…`, `an event before the anchor…`, `from (R50)…`).

---

## Decisions (made while prototyping; the executor does not revisit them)

- **D-1 — the record lives beside the engine, not in its snapshot.** The brief asks for a session record "kept in the
  snapshot so a restore does not lose it". A bookmark restores the engine snapshot and the runner state
  (`ScenarioDriver` marks); anything inside them is rewound by a restore — exactly what must not happen to a debrief.
  So the record is owned by `AppSession` (the host session), outside `PatientSnapshot`: a restore cannot rewind it. It
  is plain JSON (`RunData`), and Task 1 proves the JSON round trip and that a real host's bookmark restore keeps the
  course before the bookmark and marks the course after it undone.
- **D-2 — the run as it happened, judged on the kept course.** The timeline lists every row in the order it happened;
  rows a return to a bookmark discarded are marked "undone by return n" (the words, and struck through on screen and in
  print — the orchestrator's Q6 ruling).
  Objectives, facts and charts read the kept course (rows not undone, the trend rewound): the retry is what is judged,
  the first try is what is shown. Undo is by ORDER and TIME together: a kept row recorded after the bookmark row AND at
  or after the snapshot's exact time (the `restoreBookmark` ack's tick) — an action in the snapshot's own tick came
  after it; a `breath` reaches the record when it ends, seconds after the time it carries (found in the browser run).
  The breath, pulse and alarm trackers return to where they stood at the bookmark (R50 M-2: an alarm active at the
  bookmark and after the return is one row, not two), and after a return a breath that began before the snapshot (the
  restored engine finishing one under way) is no new "began".
- **D-3 — the record's own 1 Hz trend, not the renderer's `TrendStore`.** FU-11 E1 made the trend store rewind on a
  restore, and it lives in the renderer (worker side for the monitor). The record keeps one sample per simulated second
  of six numerics (HR; ART M, else NIBP M; SpO₂; EtCO₂; awRR, else RR; T1, else T2) from the `measurement` events the
  host already receives, rewound with the kept course; 4 h cap (`SAMPLES_MAX`, a `ponytail:` note). Each sample also
  holds the model's five labs (Q7): K⁺, lactate and pH from the engine's 1 Hz `labs` event (the arterial panel the Labs
  view shows, rounded as the panel rounds), glucose in mmol/L from its `endo` event, the core temperature from the
  truth's `resp.temp.tc` — the model's values, not samples anyone drew, and labelled so ("Labs (the model)"). 11 values
  × 3 600 s × 4 h is small; no renderer change.
- **D-4 — where each fact comes from.** Alarms: `alarmStatus` (new active ids → a row, worded by `alarmLine`), as the
  instructor's Link does. Ventilation: the engine's `breath` events of kind `mech` or `bvm` — "began" after 15 s
  without one (so the Ventilator view's cockpit, which bypasses the session, counts). Pulse lost / back: the 1 Hz
  truth's `hemo.circ.arrest` (null = perfusing; Stage 11's harness reads the same leaf). Drugs and fluids: the
  `commandApplied` stream (a bolus keeps its dose and unit for the totals; per-kg doses × the record's patient weight).
  Notes and the Scenario tab's "Objective met" ticks: the Link's log (one line in `Link.add`). A Remote's commands
  (`issuedBy: 'remote'`) are rows of kind "Remote" (R50 M-1). Stage 10's fast-forward needs nothing: the host's monitor
  delivers the span's events in order, so an alarm that came and went inside it is a row at its own time and the trend
  holds the span (R50 M-7; Task 1's real-host test with a 300 s jump, skipped with the reason where Stage 10 is absent).
- **D-5 — rows that are not part of the case.** The scenario's own set-up commands (`setMode`, `attachSensor`,
  `device` issued by `scenario`) and the manual `trigger` command (the state it leads to is the row) are dropped; late-
  join replays and cockpit `mirror` frames too. Scenario-issued clinical commands (drugs, fluid, CPR, ventilation) are
  rows of kind "Scenario". `describeCommand` gains `airwayDevice` ("Tracheal tube in place"): the timeline printed
  "Clinical event" for it.
- **D-6 — the rule schema (the contract for Stage 11, below).** Four kinds: `eventWithin`, `occurred`, `never`,
  `stayed`. "ROSC within N s of pulse loss" is `eventWithin { after: 'pulseLoss', event: 'rosc' }` — no fifth kind.
  Events are strings (`RunEventId`); `value:<trend><op><n>` events cover thresholds ("SpO₂ below 90 %") and a list
  means any one (`['drug:phenylephrine', 'drug:ephedrine']`) — both added when Stage 11's objectives needed them; the
  labs are values too (`value:k>5.5`, Q7). A value event is the first second past the limit FROM THE START, so a
  baseline already past it fires at once ("EtCO₂ below 40" at 00:09 of the MH card): the optional `from` (R50) makes the
  rule's events count only at or after the first `from` (`{ from: 'state:triggerOff', after: 'value:etco2<40', … }`).
  An event id matches its own longer ids up to a hyphen (`alarm:apnoea` ⊃ `alarm:apnoea-co2`). `eventWithin` judges the
  FIRST anchor (a re-arrest after ROSC is not judged again; R50 M-3). Verdicts: an `eventWithin` whose trigger never
  happened, or whose window had not closed when the run ended, and any rule whose value event's trend was never
  measured (R50 I-3), is "not assessable" (with the reason), not "not met".
- **D-7 — the end of a run: a toast and a marked link, no modal.** "Opened at the end of a run" is a non-modal toast
  plus the session bar's Debrief link marked (`data-ready`), when the scenario enters a state with no transitions. A
  modal at that moment would block the instructor's panel during a projected demonstration and every existing e2e that
  walks a case to its last state (Q4: accepted by the orchestrator).
- **D-8 — print, not a PDF library.** `window.print()`; print CSS in the view's own file (`views/debrief.css`, imported
  by the view; `@page { size: A4 portrait }`, which applies to printing any route — R50 M-9): only the report is printed
  (top bar, session bar, monitor, toasts and the tool row hidden), black ink, page breaks before Trends, Timeline and the
  minute appendix, objectives, facts, bookmarks, notes and each chart never split, the tables' headers repeated. The
  footer "For education only. Not a medical device: never use it for patient care. Build <id>." and "Page n of N" on
  every page as `@page` margin boxes, written by the view into a `<style>` on enter (the build is run-time data):
  Chromium prints them on every page (the e2e reads each page's text); WebKit has none (it drops the rules), so the view
  marks itself `.db-nomargin` (no `window.CSSMarginRule`) and prints the footer line before each forced page break and
  at the end — every page that ends a section; a long timeline's inner pages in Safari have none (R50 I-4; checked by
  hand in Task 4 Step 5). A `position: fixed` footer was tried: Chromium places it by the screen viewport, over the
  text of page 2. Charts are inline SVG (a black line, gaps where nothing was
  measured, the axis range, mm:ss ticks, a dashed line at each return). The page title is set to "Debrief <case>
  <date>" while the view is open, so "Save as PDF" proposes a useful file name. Notes are a `contenteditable` box (a
  textarea prints only its visible part); "Run by" is a text input. Neither is stored beyond the page, nor put in the
  JSON (Q2). The appendix (Q1) is one row per simulated minute: each trend's and lab's first value in that minute.
  "Download the record (JSON)" (Q3) saves `pme-debrief/1`: the build, the record, the verdicts, the facts and the minute
  table (`debriefJson`).
- **D-9 — the e2e reads the PDF without a library, and only where it is proven.** `apps/demo/e2e/pdf-text.ts`
  inflates the streams with `node:zlib`, reads each font's ToUnicode map and decodes the hex strings of each page (Skia
  writes Type3 fonts for macOS system fonts and CID TrueType fonts for a TTF; the reviewer's probe decoded a CID font
  correctly, Arial loaded as a web font). The test compares text with whitespace removed. On the Linux CI runner a glyph
  the font set lacks (✓, ✗, →, ₂) would have no ToUnicode entry and fail the gate for a test reason (R50 I-2), so the
  text is read on macOS only (`PME_PDF_TEXT=1` anywhere); every platform checks what needs no font: the page count,
  every page A4 (MediaBox 595 × 842) and the Info title (`pdfInfo`).
- **D-10 — the e2e case is anaphylaxis.** Stage 11 rewrites the induction and tamponade cards but keeps anaphylaxis and
  haemorrhage unchanged, so the e2e runs either way; anaphylaxis takes ≈ 2 sim-min (≈ 40 s at ×4 with the return) and
  yields all three verdicts (no rule / epinephrine in time / no fluid).
- **D-11 — the route is not in the top navigation.** `#/debrief` is a host route (`HOST_ROUTES`) reached from the
  session bar; `shell.ts` is untouched. Its view uses the bench (light) palette.
- **D-12 — the build id (orchestrator ruling).** `apps/demo/vite.config.ts` defines `__PME_BUILD__` = the git short
  commit, "+" when tracked files have uncommitted changes, and the date (`buildId()`: "unknown <date>" outside a git
  checkout); the kit's `vite build` and the e2e's dev server both read the config. The view falls back to
  "development" if a build has no define.

## Prototype results (R50 re-prototype: base f3eb6f84 = `origin/main` 26e78308 + FU-11 d → final; both engines where a browser is involved)

| What | Result |
|---|---|
| Unit tests (new) | `record.test.ts` 7 (6 + the Stage 10 fast-forward case, skipped with its reason where `time jump` is refused), `debrief.test.ts` 24, `debrief-showcase.test.ts` 4: all green; controller `test/scenario` 106 green (schema extended); neighbours (`copy`, `showcase`, `router`, `shell.dom`, `fu11-link-timeline`, `events`) green; both tsc exit 0 |
| e2e `stage13-debrief` | Chromium 42.6 s, WebKit 42.9 s: green (anaphylaxis at ×4, bookmark → return → retry, epinephrine button, toast, Debrief, the undone rows struck through, labs fact, minute appendix, JSON download without the names, the footer: margin boxes on Chromium / four footer lines on WebKit) |
| PDF (Chromium `page.pdf`, `preferCSSPageSize`) | 5 A4 pages: 1 header + objectives + facts (labs row), 2 trends (5 charts), 3 temperature chart + drugs, 4 timeline + bookmarks + notes, 5 the minute appendix; every page's text ends with the footer, "Build <id>." and "Page n of 5" (`stage-13-prototype-shots/debrief.pdf`, `page-1..5.png`) |
| Anaphylaxis, epinephrine 1 min into the reaction (engine test) | objectives: not assessable / met ("Epinephrine 1 min 00 s after the state "Anaphylaxis" (01:00 → 02:00; within 2 min 00 s asked).") / not met ("Fluid: did not happen"); epinephrine 100 µg (1 dose) |
| Induction, intubated 40 s after the apnoea alarm | "Ventilated breaths … after the alarm Apnoea (no CO₂ breaths)" met; never intubated: not met |
| Stage 10 fast-forward (probe and record test, main + d + Stage 10) | acls-pea-hypovolaemia, 300 s span: every alarm of the end event (HR high that came and went, extreme tachycardia, SpO₂ no pulse) is a row inside the span at its own time; 300 samples in the span |
| MH card (Appendix B tree, probe; crisis 60 s after the early signs, dantrolene 60 s later, ventilation back 90 s after EtCO₂ < 40) | crisis met (1 min 00 s), dantrolene met, potassium "K⁺ above 5.5 mmol/L did not happen" (treated: K⁺ peaked 5.1), ventilation back met — "2 min 52 s after EtCO₂ below 40 mmHg after the state "Trigger off …" (08:34 → 11:26)". Without `from` the same rule anchored at 00:09 (the baseline EtCO₂ 34) and said "not met" |
| PDF text reader on a CID TrueType font (probe, Arial as a web font: `CIDFontType2`/`Type0`, as Linux embeds) | decoded exactly (`stage-13-plan-tools/probes/cid-output.txt`) |
| `@page` margin boxes (probe) | Chromium 153: parsed (`CSSMarginRule`) and printed on every page; WebKit 26.6: dropped from the CSSOM (`probes/margin-box-cssom.txt`); a `position: fixed` footer in Chromium print lands by the screen viewport (`probes/fixed-footer-chromium-page2.png`) |
| With Stage 10 applied first | every block: 0 problems; the 38 unit tests (record 7 with the fast-forward case RUN, debrief 24, debrief-showcase 4, s10-fast-forward 3), tsc, e2e `stage13-debrief` + `s10-time-control` (Chromium) green |
| With Stage 10, 11 and 12 applied first (Task 3 = Appendix B) | Tasks 1, 2, 4 and Appendix B: 0 problems; 53 unit tests (+ Stage 11's `showcase-cards`, `showcase`, `copy`), both tsc, e2e `stage13-debrief` and `stage9-a11y` (Chromium) green |
| Neighbours on the final tree | `stage9-a11y` (laptop, iPad portrait), `stage9-app` (5), `showcase-clock`: green (Chromium) |
| `showcase-clock.e2e.ts` | passes on the real base (f3eb6f84) and on the final tree; the planner's timeout was on the patched base 52981648 and does not reproduce (R50 M-8) |

## The rule schema, and the contract for Stage 11

An objective is a string (as today) or `{ "text": "…", "rule": { … } }`. Without a rule it is listed as not assessable.

| `kind` | fields | met when | not assessable when |
|---|---|---|---|
| `eventWithin` | `after`, `event` (each an event or a list), `withinS` > 0, optional `from` | the first `event` at or after the FIRST `after` (at or after the first `from`) comes within `withinS` | `from` or `after` never happened; no `event` yet and the run ended before `withinS` had passed; a value event never measured |
| `occurred` | `event`, optional `from` | it happened (at or after the first `from`) | `from` never happened; a value event never measured |
| `never` | `event`, optional `from` | it did not happen | as `occurred` |
| `stayed` | `value` (`hr`, `map`, `spo2`, `etco2`, `rr`, `temp`, `k`, `lactate`, `ph`, `glucose`, `tcore`), `above` and/or `below`, optional `after` + `forS` | every sample in the window was past the limit | nothing measured in the window; `after` never happened; the window had not closed (and nothing broke the limit) |
| `heldThen` (E22, owner ruling 2026-10-17) | `value`, `above` and/or `below` (as `stayed`), `forS` > 0, `event`, optional `from` | the FIRST `event` (at or after the first `from`) came once the value had stayed past the limit for `forS` s on end (counted from `from`; a sample outside the limit or unmeasured restarts it). An earlier `event` is **not met** (a second one does not mend it); no `event` after the hold is not met | `from` never happened; the value never measured; the run ended before the hold with no `event` yet |

Events (`RunEventId`): `start` · `state:<stateId>` · `alarm:<alarmId>` (matches its own longer ids: `alarm:apnoea` =
the CO₂ or impedance apnoea alarm) · `drug:<drugId>` (bolus, infusion or TCI) · `fluid` · `cpr` (started) · `shock` ·
`condition:<id>` · `airway:<state>` · `ventilation` (mechanical or bag-mask breaths began) · `pulseLoss` · `rosc` ·
`value:<value><op><n>` (the first second past the limit, from the start or from `from`; e.g. `value:spo2<90`,
`value:map>65`, `value:k>5.5`). The labs (`k`, `lactate`, `ph`, `glucose` in mmol/L, `tcore` in °C) are the model's
values (D-3). The schema's pattern refuses anything else; Task 3's lint test refuses a state, drug, alarm or condition
that does not exist.

**Contract.** Stage 11 owns the showcase cards' content; Stage 13 owns the schema, the evaluator and the view.
(1) Stage 11 may write any objective as `{ text, rule }` with the syntax above; the text stays the presenter's words.
(2) The apnoea objective of `showcase-induction` uses `after: 'alarm:apnoea'` (Task 3's engine test finds it by that).
(3) `showcase-anaphylaxis` and `showcase-haemorrhage` (Stage 11 S5: kept unchanged) get their rules from Task 3 —
Stage 11 leaves those two files' objectives alone; their draft numbers carry "(debrief: … — draft, owner to confirm)" in
the text (Q5). (4) If Stage 11 adopts rules, its `showcase-cards.test.ts` maps objectives with `objectiveText`
(exported by `scenarios.ts` from Task 2) before its "has a number" check — Appendix B's block shows the one-line change.
(5) Stage 11 is READY (R50, 2026-10-11) and keeps its objectives as strings; Appendix B carries the rules of its
"Objectives and Stage 13" table on its final texts, with two changes the evaluator showed were needed: MH's "Bring the
ventilation back … within 300 s of EtCO₂ falling below 40" gets `from: 'state:triggerOff'` (without it the baseline
EtCO₂ fires the anchor at 00:09), and MH's "Treat the potassium … once K⁺ is above 5.5" is no longer rule-less (Q7).
Objectives no event can measure ("Name the tamponade…", "Induce after at least 180 s…", "Acknowledge the
respiratory-rate alarm…", "Repeat dantrolene…") stay rule-less.

## File partition

| File | Task | Owner / other plans that edit it (blocks written against the patched text; every overlap checked) |
|---|---|---|
| `apps/demo/src/app/record.ts`, `record.test.ts` (new) | 1 | Stage 13 |
| `apps/demo/src/app/session.ts` | 1 | FU-11 (b·d), Stage 10 (9 blocks), Stage 12 (7 blocks) — mine: 5 one-line blocks, disjoint (checked with both applied) |
| `apps/demo/src/app/link.ts` | 1 | FU-11, Stage 10 (2 blocks) — 1 line in `add()`, disjoint (checked) |
| `apps/demo/src/app/describe.ts` | 1 | FU-11-owned folder, Stage 10 (2 blocks) — 2 lines after `case 'airway'`, disjoint (checked) |
| `packages/controller/scenarios/pme-scenario-1.schema.json` | 2 | FU-11 b (merged) — objectives line + definitions |
| `packages/controller/src/scenario/types.ts` | 2 | Stage 13 (no pending plan edits it) |
| `apps/demo/src/app/scenarios.ts` | 2 | FU-11-owned folder; Stage 11 (`SHOWCASE_ORDER` before `LIBRARY`) — mine: an import, `objectiveText` above `ScenarioCard`, the `objectives:` line; disjoint (checked both orders) |
| `apps/demo/src/app/debrief.ts`, `debrief.test.ts` (new) | 2 | Stage 13 |
| `apps/demo/src/app/showcase/showcase-{anaphylaxis,haemorrhage}.json` | 3 / App. B | objectives: Stage 13's (contract 3); Stage 11 edits the haemorrhage story and notes only (disjoint) |
| `apps/demo/src/app/showcase/showcase-bronchospasm.json` | 3 / App. B | Stage 11 edits its `category` (disjoint) |
| `apps/demo/src/app/showcase/showcase-{induction,tamponade}.json` | 3 or App. B | Stage 11's content (rewritten by it): Task 3 if Stage 11 has not merged, Appendix B if it has |
| `apps/demo/src/app/showcase/showcase-{induction-premed,mh}.json`, `showcase-cards.test.ts` | App. B | Stage 11 (its new files) |
| `apps/demo/src/app/debrief-showcase.test.ts` (new) | 3 / App. B | Stage 13 |
| `apps/demo/src/app/views/debrief.ts`, `views/debrief.css` (new) | 4 | Stage 13 (the view file + its styles) |
| `apps/demo/src/app/router.ts` | 4 | FU-11-owned folder — `'debrief'` in `ROUTES` and `HOST_ROUTES` |
| `apps/demo/src/app/main.ts` | 4 | FU-11 (a·b·d), Stage 10 (3 blocks), Stage 12 (7 blocks) — mine: the import and the ONE registration line before `mountSessionBar`; disjoint (checked with both applied) |
| `apps/demo/src/app/sessionbar.ts` | 4 | FU-11, Stage 10 (7 blocks, including the `replaceChildren` line) — mine: an import, a link created and placed with `mark.after` before `draw`, one line after `setText(scen…)`; disjoint (checked) |
| `apps/demo/vite.config.ts` | 4 | Stage 11 (3 blocks: the vitest reference line above the imports, its constants after `page`, the `test` block) — mine: one import line after `defineConfig`'s and the `define` + `buildId()` at the end; disjoint (checked both orders) |
| `apps/demo/e2e/stage13-debrief.e2e.ts`, `apps/demo/e2e/pdf-text.ts` (new) | 4 | Stage 13 |

Stage 12 (QR mobile learner, REVIEWED-FIXED 2026-10-11) edits `main.ts` and `session.ts` beside this plan; with Stage 10,
11 and 12 applied first every block of this plan applies once (0 problems) and the combined tree typechecks and passes
the debrief tests and e2e (see "Prototype results").

## Owner questions — closed by the orchestrator's rulings (2026-10-11)

1. **The full 1 Hz trend table?** No. A one-row-per-minute table as an appendix: yes (built: D-8, Task 2 `perMinute`,
   Task 4 `#db-minutes`).
2. **Learner names?** Printed only, never stored: accepted (the "Run by" line and the notes box are not in the JSON).
3. **The report as JSON?** Yes: "Download the record (JSON)", the same data as the report (`pme-debrief/1`).
4. **Open the Debrief automatically?** No: the toast and the marked link, no dialog (D-7) — accepted.
5. **The draft rule numbers** (epinephrine within 2 min of the reaction; CPR within 30 s of the pulse loss; the pulse
   back within 6 min; ventilated within 90 s of the apnoea alarm; drained within 5 min): accepted as drafts and marked
   "(debrief: … — draft, owner to confirm)" in the card text so the owner sees them in the kit round.
6. **Judge the retry or the first try?** The retry, with the undone course struck through in the timeline — accepted.
7. **Laboratory values?** Yes: K⁺, lactate, pH, glucose and the core temperature in the 1 Hz record (D-3), a labs row in
   the facts (last, lowest–highest), usable in rules (`value:k>5.5`, `stayed { value: 'k' }`); Stage 11's "Treat the
   potassium" objective is assessable (Appendix B).

## What could not be achieved in the prototype

- **The PDF text on Linux.** The reader decodes CID TrueType fonts (probe), but whether the Linux runner's fonts carry
  every glyph's ToUnicode entry (✓, ✗, →, ₂) is unknown, so the text is read on macOS only; CI checks the page count,
  A4 and the title (D-9). `PME_PDF_TEXT=1` reads it on any platform.
- **The print dialog itself** (`window.print()`) cannot be driven headless, and WebKit has no `page.pdf()`: WebKit's
  print path is checked through print-media emulation (layout, breaks, ink, the footer lines) and a full-page
  screenshot; the footer on each Safari page is checked by hand (Task 4 Step 5).
- **A per-page footer in Safari.** WebKit prints no `@page` margin boxes; its footer line stands before each forced page
  break and at the end, so the inner pages of a timeline longer than one page carry none (D-8).
- **A Remote's notes** stay on the Remote (the record is the host's); its commands are recorded, as "Remote".
- **Objectives no engine event measures** (recognition, naming, acknowledging an alarm, a second dose under a
  condition) remain "not assessable" by design.

## Tasks

Run them in order; each ends with a commit and a push. Task 3 has three cases (Step 0 says which applies).

### Task 0: Branch, install, block check

**Files:** none changed.

- [ ] **Step 1: Branch and install**

```bash
git -C repo fetch origin
git -C repo log --oneline -1 origin/main   # FU-11 b and d and FU-7.1 b must be in (git log --oneline origin/main | grep -E "fu-11-b|fu-11-d|fu-7.1-b")
git -C repo worktree add ../scratch/wt-stage-13 -b stage-13-debrief origin/main
cd scratch/wt-stage-13 && npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [ ] **Step 2: Copy the plan tools to your scratchpad** (`scratch/plans-backup/stage-13-plan-tools/`: `check.py`,
  `apply.py`, `chain.txt`) and the plan file (`repo/docs/plans/stage-13-debrief.md`: untracked, so it is not in your
  worktree).

- [ ] **Step 3: Block check (every find occurs exactly once at its place)**

```bash
python3 <scratchpad>/stage-13/check.py <scratchpad>/stage-13/stage-13-debrief.md . <scratchpad>/stage-13/chain.txt --base-dir .
python3 <scratchpad>/stage-13/check.py <scratchpad>/stage-13/stage-13-debrief.md . <scratchpad>/stage-13/chain.txt --base-dir . --variant b
```

Expected: Stage 11 not merged — the first `… 0 problems` (the second fails Appendix B's finds: by design); Stage 11
merged — the second `… 0 problems` (the first fails Task 3's induction and tamponade finds: by design; Task 3 Step 0).
Any other problem: locate the statement by its unchanged neighbours (Global Constraints).

- [ ] **Step 4: Before-numbers**: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/showcase.test.ts
  src/app/copy.test.ts` (green), and `npx playwright test showcase-clock --retries=0 --project=chromium` (it passed on
  the R50 base; note the result for the gate).

### Task 1: The run record — every source, in order, beside the engine

**Files:**
- Create: `apps/demo/src/app/record.ts`, `apps/demo/src/app/record.test.ts`
- Modify: `apps/demo/src/app/session.ts` (own it, feed it), `apps/demo/src/app/link.ts` (notes into it),
  `apps/demo/src/app/describe.ts` (`airwayDevice` in words)

**Interfaces:**
- Produces: `class RunRecord { data: RunData; constructor(who: () => { patient: string; weightKg: number }, now?: () =>
  number); wire(e: WireEvent): void; engine(e: EngineEvent): void; note(t: number, text: string): void }`;
  `interface RunData { startedAt; lastWall; patient; weightKg; doc: ScenarioDoc | null; rows: Row[]; samples: Sample[];
  returns }`; `interface Row { t; kind: 'action' | 'remote' | 'scenario' | 'alarm' | 'bookmark' | 'restore' | 'patient' |
  'note'; text; ev?: string; dose?: { drugId; dose; unit }; mark?: string; undone?: number }`; `TREND` (six trends →
  monitor numerics), `TrendKey`, `TREND_KEYS`, `LABS` (five labs → glossary keys), `LabKey`, `LAB_KEYS`, `ValueKey`,
  `Sample` (`t` + the eleven values), `emptyRun()`; `AppSession.record: RunRecord`.

- [ ] **Step 1: Write the failing test**

Create `apps/demo/src/app/record.test.ts`:

```ts
// Stage 13 Task 1: the run record — every source becomes a row at its simulated time; a return to a bookmark keeps the
// discarded course as undone rows and rewinds the trend; a restart starts a new record; the data survives JSON. The
// last cases run a real engine, scenario driver and host session the way AppSession wires them (a bookmark restore; a
// Stage 10 fast-forward, when Stage 10 is in).
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget, type WireEvent } from '@pme/controller';
import { BUILTIN_SCENARIOS, engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import induction from './showcase/showcase-induction.json';
import { RunRecord } from './record.ts';

const applied = (tick: number, command: Record<string, unknown>, extra: Record<string, unknown> = {}): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command }, ...extra } }) as WireEvent;
const alarms = (t: number, ids: string[]): EngineEvent => ({ type: 'alarmStatus', t, active: ids.map((id) => ({ id, level: 1, text: id, acked: false, latched: false })) }) as unknown as EngineEvent;
const truth = (t: number, arrest: unknown): EngineEvent => ({ type: 'truth', t, tree: { hemo: { circ: { arrest } } }, leaves: 1, dropped: 0, truncated: false }) as unknown as EngineEvent;
const meas = (t: number, spo2: number): EngineEvent => ({ type: 'measurement', t, values: { spo2: { value: spo2, flag: 'ok' }, hr: { value: 80, flag: 'ok' }, abpMean: { value: null, flag: 'invalid' }, nibpMean: { value: 75, flag: 'ok' } } }) as unknown as EngineEvent;
const breath = (t: number, kind: string): EngineEvent => ({ type: 'breath', t, seq: 1, kind, tiS: 1, teS: 2, vtMl: 500, etco2True: 38 }) as unknown as EngineEvent;
const labs = (t: number, k: number): EngineEvent => ({ type: 'labs', t, values: { k, lactate: 1.4, ph: 7.31 } }) as unknown as EngineEvent;
const NO_LABS = { k: null, lactate: null, ph: null, glucose: null, tcore: null };
const fresh = () => new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);

describe('Stage 13: the run record', () => {
  it('turns commands, states, alarms, breaths, the pulse and notes into rows with run events', () => {
    const r = fresh();
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    r.wire({ type: 'scenario', t: 10, stateId: 'induced', transitionId: 'induce' } as WireEvent);
    r.wire({ type: 'scenario', t: 10.5, stateId: 'induced' } as WireEvent); // a resync's repeat: no second row
    r.engine(alarms(66, ['apnoea-co2']));
    r.engine(alarms(67, ['apnoea-co2'])); // still active: not raised again
    r.wire(applied(4000, { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } }));
    r.engine(breath(81, 'mech'));
    r.engine(breath(86, 'mech')); // within 15 s: the same run of breaths
    r.engine(truth(90, null));
    r.engine(truth(91, { cause: 'pea' }));
    r.engine(truth(150, null));
    r.wire(applied(5000, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 1, peep: 5 } }, { mirror: true })); // a cockpit frame
    r.wire(applied(5000, { type: 'time', action: 'scale', value: 4 }, { replay: true })); // a late-join replay
    r.wire(applied(5000, { type: 'scenario', action: 'trigger', target: 'intubate' })); // shown by the state it leads to
    r.wire(applied(5000, { type: 'attachSensor', sensor: 'co2', state: 'on', issuedBy: 'scenario' })); // the case's set-up
    r.wire(applied(5000, { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 }, issuedBy: 'scenario' }));
    r.wire(applied(8000, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }));
    r.wire(applied(8000, { type: 'applyEvent', event: { kind: 'cpr', active: true }, issuedBy: 'remote' })); // a Remote's command
    r.note(160, 'Objective met: Confirm ventilation with the capnogram');
    const rows = r.data.rows.map((x) => [x.t, x.kind, x.text, x.ev ?? '']);
    expect(rows).toEqual([
      [0, 'scenario', `Scenario loaded: ${induction.title}`, ''],
      [10, 'scenario', `Scenario state: ${induction.states.find((s) => s.id === 'induced')?.label}`, 'state:induced'],
      [66, 'alarm', 'Apnoea (no CO₂ breaths)', 'alarm:apnoea-co2'],
      [80, 'action', 'Epinephrine 1 mg IV', 'drug:epinephrine'],
      [81, 'patient', 'Ventilated breaths began', 'ventilation'],
      [91, 'patient', 'Pulse lost (the model)', 'pulseLoss'],
      [150, 'patient', 'Circulation returned (the model)', 'rosc'],
      [100, 'scenario', 'Crystalloid 500 mL over 5 min', 'fluid'],
      [160, 'action', 'Tracheal tube in place', ''],
      [160, 'remote', 'CPR started', 'cpr'],
      [160, 'note', 'Objective met: Confirm ventilation with the capnogram', ''],
    ]);
    expect(r.data.rows[3]?.dose).toEqual({ drugId: 'epinephrine', dose: 1, unit: 'mg' });
    expect(r.data.doc?.id).toBe('showcase-induction');
  });

  it('keeps one sample per simulated second, from the first valid numeric of each trend', () => {
    const r = fresh();
    r.engine(meas(0.2, 99));
    r.engine(meas(0.7, 98)); // same second: the latest value
    r.engine(meas(1.1, 97));
    expect(r.data.samples).toEqual([
      { t: 0, hr: 80, map: 75, spo2: 98, etco2: null, rr: null, temp: null, ...NO_LABS },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, ...NO_LABS },
    ]);
  });

  it('Q7: the model’s K⁺, lactate, pH, glucose and core temperature join the 1 Hz sample', () => {
    const r = fresh();
    r.engine(meas(0.2, 99));
    r.engine(labs(1, 5.6));
    r.engine({ type: 'endo', t: 1, glucoseMmolL: 6.1 } as unknown as EngineEvent);
    r.engine({ type: 'truth', t: 1, tree: { hemo: { circ: { arrest: null } }, resp: { temp: { tc: 38.04 } } }, leaves: 2, dropped: 0, truncated: false } as unknown as EngineEvent);
    r.engine(meas(1.5, 97));
    expect(r.data.samples).toEqual([
      { t: 0, hr: 80, map: 75, spo2: 99, etco2: null, rr: null, temp: null, ...NO_LABS },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, k: 5.6, lactate: 1.4, ph: 7.31, glucose: 6.1, tcore: 38 },
    ]);
  });

  it('a return to a bookmark marks the discarded course undone, rewinds the trend, and the run goes on', () => {
    const r = fresh();
    for (let t = 0; t <= 100; t++) r.engine(meas(t, 99 - t / 10));
    r.engine(alarms(10, ['HR_HIGH'])); // active when the bookmark is taken, and after the return: one row, not two (R50 M-2)
    r.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:20' }));
    r.engine(breath(19, 'mech')); // began before the bookmark, reported when it ended (after it)
    r.engine(alarms(66, ['apnoea-co2']));
    r.engine(truth(70, null));
    r.engine(truth(90, { cause: 'asystole' }));
    r.wire({ type: 'timeline', t: 20, tick: 1000, cause: 'restore' } as WireEvent);
    r.wire(applied(1000, { type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:20' }));
    r.engine(alarms(66, ['HR_HIGH', 'apnoea-co2'])); // apnoea raised again on the kept course; HR high never stopped
    r.engine(breath(19, 'mech')); // the restored engine reports the breath under way again: not a new "began"
    r.engine(meas(21, 95));
    expect(r.data.returns).toBe(1);
    expect(r.data.rows.map((x) => [x.t, x.kind, x.undone ?? 0])).toEqual([ // the bookmark row's 20 s is the host's estimate
      [10, 'alarm', 0], [20, 'bookmark', 0], [19, 'patient', 0], [66, 'alarm', 1], [90, 'patient', 1], [20, 'restore', 0], [66, 'alarm', 0],
    ]);
    expect(r.data.rows.filter((x) => x.ev === 'alarm:HR_HIGH')).toHaveLength(1);
    expect(r.data.samples.at(-1)).toMatchObject({ t: 21, spo2: 95 });
    expect(r.data.samples).toHaveLength(22);
    r.engine(truth(95, { cause: 'asystole' })); // the kept course had a pulse: this loss is new
    expect(r.data.rows.at(-1)).toMatchObject({ t: 95, ev: 'pulseLoss' });
  });

  it('a restart starts a new record; the data is JSON and survives a round trip', () => {
    const r = fresh();
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    r.engine(meas(3, 97));
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restore' } as WireEvent);
    r.wire(applied(0, { type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 9' })); // one it never saw: rows after t
    expect(r.data.rows.map((x) => x.undone ?? 0)).toEqual([0, 0]);
    const copy = JSON.parse(JSON.stringify(r.data));
    expect(copy).toEqual(r.data);
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restart' } as WireEvent);
    expect(r.data).toEqual({ startedAt: 1_000, lastWall: 1_000, patient: 'M 40 y 70 kg', weightKg: 70, doc: null, rows: [], samples: [], returns: 0 });
  });

  it('on a real host: a bookmark restore keeps the course before it and marks the course after it undone', async () => {
    const v = validateScenario(induction);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, mode: 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const tap = hub.connect();
    const r = fresh();
    tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => r.wire(e)));
    engine.on((e) => r.engine(e));
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const run = async (to: number) => {
      for (let t = engine.now().simT; t < to; t += 0.1) {
        engine.advanceTo(t + 0.1);
        driver.poll();
        await settle(); // the host applies what the driver submitted, as between the app's polls
      }
    };
    const cmd = (c: Record<string, unknown>) => hs.submit({ id: `t${Math.random()}`, issuedBy: 'instructor', ...c } as never);
    expect((await cmd({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
    await run(20);
    expect((await cmd({ type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:20' })).accepted).toBe(true);
    expect((await cmd({ type: 'scenario', action: 'trigger', target: 'induce' })).accepted).toBe(true);
    await run(90); // the apnoea alarm sounds about 55 s after induction
    expect(r.data.rows.some((x) => x.ev?.startsWith('alarm:apnoea'))).toBe(true);
    expect((await cmd({ type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:20' })).accepted).toBe(true);
    await run(25);
    const undone = r.data.rows.filter((x) => x.undone === 1);
    expect(undone.map((x) => x.ev).filter(Boolean)).toEqual(expect.arrayContaining(['state:induced', 'drug:propofol', 'alarm:apnoea-co2']));
    expect(r.data.rows.filter((x) => x.kind === 'scenario' && x.undone === undefined && x.text.startsWith('Scenario')).map((x) => x.text)).toEqual([`Scenario loaded: ${induction.title}`, `Scenario state: ${induction.states[0]?.label}`]); // the return's re-publish of Awake is no new row
    expect(r.data.rows.filter((x) => x.undone === undefined).map((x) => x.kind)).toEqual(expect.arrayContaining(['bookmark', 'restore']));
    expect(r.data.samples.at(-1)?.t).toBeLessThanOrEqual(25);
    expect(r.data.samples.every((s, i, a) => i === 0 || s.t > (a[i - 1] as { t: number }).t)).toBe(true);
    hs.close();
  }, 60_000);

  it('on a real host, Stage 10: every alarm raised inside a fast-forward is a row at its own time, the trend has the span', async (ctx) => {
    const v = validateScenario(BUILTIN_SCENARIOS['acls-pea-hypovolaemia']);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    const step = (n: number) => engine.advanceTo((engine.now().tick + n) * 0.02 + 1e-9);
    const base: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    const target = Object.assign(base, { fastForwardStep: async (n: number) => (step(n), engine.now()) }); // Stage 10's HostTarget hook
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC345', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const r = fresh();
    const ends: Array<{ fromT: number; toT: number; alarms: Array<{ id: string }> }> = [];
    hub.connect().onMessage((m) => m.kind === 'event' && m.body.forEach((e) => {
      r.wire(e);
      const f = e as unknown as { type: string; phase?: string; fromT: number; toT: number; alarms?: Array<{ id: string }> };
      if (f.type === 'fastForward' && f.phase === 'end') ends.push({ fromT: f.fromT, toT: f.toT, alarms: f.alarms ?? [] });
    }));
    engine.on((e) => r.engine(e));
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const cmd = (c: Record<string, unknown>) => hs.submit({ id: `f${Math.random()}`, issuedBy: 'instructor', ...c } as never);
    expect((await cmd({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
    for (let i = 0; i < 200; i++) (step(5), driver.poll(), await settle()); // 20 s
    const jump = await cmd({ type: 'time', action: 'jump', value: 300 });
    if (!jump.accepted) {
      hs.close();
      return ctx.skip(`no fast-forward on this tree (${jump.reason ?? 'refused'}): Stage 10 has not merged`);
    }
    for (let i = 0; i < 4000 && !ends.length; i++) await new Promise((res) => setTimeout(res, 5));
    const end = ends[0];
    if (!end) throw new Error('no fast-forward end event');
    expect(end.alarms.length).toBeGreaterThan(0);
    for (const a of end.alarms) expect(r.data.rows.some((x) => x.ev === `alarm:${a.id}` && x.t >= end.fromT && x.t <= end.toT), a.id).toBe(true);
    expect(r.data.samples.filter((s) => s.t >= end.fromT && s.t <= end.toT).length).toBeGreaterThanOrEqual(290);
    hs.close();
  }, 60_000);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/record.test.ts`
Expected: FAIL — `Failed to resolve import "./record.ts"`.

- [ ] **Step 3: Implement**

In `apps/demo/src/app/describe.ts`, find:

```ts
    case 'ventilation':
```

Replace with:

```ts
    case 'airwayDevice': // Stage 13: the debrief's timeline printed "Clinical event" for it
      return e.device === 'ett' ? 'Tracheal tube in place' : e.device === 'sga' ? 'Supraglottic airway in place' : 'Airway device removed';
    case 'ventilation':
```

In `apps/demo/src/app/link.ts`, find:

```ts
    this.log.push(x);
```

Replace with:

```ts
    if (x.kind === 'note' || x.kind === 'marker') this.host?.record.note(x.simT ?? this.simT, x.text); // Stage 13: into the debrief
    this.log.push(x);
```

Create `apps/demo/src/app/record.ts`:

```ts
// Stage 13: the debrief's record of one run — what happened, in order, at the simulated time the monitor showed: every
// command applied (from the panel, a Remote or the scenario), the scenario's states, the alarms raised, bookmarks and
// returns to them, the pulse lost and back (from the model), ventilated breaths beginning, the instructor's notes, and a
// 1 Hz trend of six numerics and five laboratory values of the model (Q7: K⁺, lactate, pH, glucose, core temperature). It lives beside the engine, NOT in its snapshot: a return to a bookmark rewinds the
// engine, the trends and the clocks (FU-11 Part E) but not this record — the discarded course stays, marked undone, so
// the debrief shows the run as it happened, and its rules and charts read the course that was kept. A new patient or
// scenario (a 'restart' timeline) starts a new record. Plain JSON data; no DOM.
import type { EngineEvent } from '@pme/engine-core';
import type { AppliedResolution, WireEvent } from '@pme/controller';
import type { ScenarioDoc } from '@pme/controller/scenario';
import { alarmLine } from './alarms.ts';
import { describeCommand } from './describe.ts';

export type RowKind = 'action' | 'remote' | 'scenario' | 'alarm' | 'bookmark' | 'restore' | 'patient' | 'note';
export interface Row {
  /** Simulated seconds, as the monitor's clock showed them. */
  t: number;
  kind: RowKind;
  text: string;
  /** The run event a debrief rule can name (types.ts `RunEventId`). */
  ev?: string;
  /** A bolus, for the drug totals. */
  dose?: { drugId: string; dose: number; unit: string };
  /** A bookmark's label (bookmark rows). */
  mark?: string;
  /** Set when the n-th return to a bookmark discarded this row (it happened, on a course that was then undone). */
  undone?: number;
}

/** The six trended numerics; each reads the first valid of its monitor numerics (glossary keys `mon.<id>`). */
export const TREND = { hr: ['hr'], map: ['abpMean', 'nibpMean'], spo2: ['spo2'], etco2: ['etco2'], rr: ['awrr', 'rr'], temp: ['tempCore', 'tempSite'] } as const;
export type TrendKey = keyof typeof TREND;
export const TREND_KEYS = Object.keys(TREND) as TrendKey[];
/**
 * Stage 13 Q7: the model's laboratory values, 1 Hz, each with the glossary key that labels it: K⁺, lactate and pH from
 * the engine's `labs` event (the arterial panel the Labs view shows), glucose from its `endo` event, the core
 * temperature from the truth. They are the model's values, not samples the instructor drew.
 */
export const LABS = { k: 'ev.labs.values.k', lactate: 'ev.labs.values.lactate', ph: 'ev.labs.values.ph', glucose: 'ev.endo.glucoseMmolL', tcore: 'resp.temp.tc' } as const;
export type LabKey = keyof typeof LABS;
export const LAB_KEYS = Object.keys(LABS) as LabKey[];
/** A value a sample holds (a trend or a lab), as a debrief rule names it (scenario/types.ts `TrendValue`). */
export type ValueKey = TrendKey | LabKey;
export type Sample = { t: number } & Record<ValueKey, number | null>;

export interface RunData {
  /** Wall clock (ms since 1970) when the run began, and of the last thing recorded. */
  startedAt: number;
  lastWall: number;
  patient: string;
  weightKg: number;
  doc: ScenarioDoc | null;
  rows: Row[];
  /** One per simulated second of the kept course. */
  samples: Sample[];
  /** Returns to a bookmark so far. */
  returns: number;
}

/** Ventilated breaths "begin" after this long without one [ENG: longer than any set rate's interval, 6/min = 10 s]. */
const VENT_GAP_S = 15;
/** A state published this long before the newest row is a return's re-publish, not a new state [ENG: > the app's
 *  poll lag of 0.8 s of sim at ×8]. */
const RESYNC_S = 2;
/** Samples kept: 4 h of a run [ENG]. ponytail: oldest dropped beyond it; a longer run needs a coarser trend. */
const SAMPLES_MAX = 4 * 3600;
const EPS = 1e-6;

export const emptyRun = (patient = '', weightKg = 70, now = Date.now()): RunData => ({ startedAt: now, lastWall: now, patient, weightKg, doc: null, rows: [], samples: [], returns: 0 });

export class RunRecord {
  data: RunData;
  private active = new Set<string>();
  private lastVent = -Infinity;
  private pulse: boolean | null = null;
  private held: WireEvent | null = null;
  /** The engine time of the last return to a bookmark (-∞: none this run). */
  private since = -Infinity;
  /** The trackers as they stood at each bookmark of this run. */
  private readonly marks = new Map<string, { lastVent: number; pulse: boolean | null; active: string[] }>();
  private readonly cur: Record<string, number | null> = {};
  private readonly lab: Partial<Record<LabKey, number | null>> = {};

  private readonly who: () => { patient: string; weightKg: number };
  private readonly now: () => number;

  constructor(who: () => { patient: string; weightKg: number }, now: () => number = Date.now) {
    this.who = who;
    this.now = now;
    const w = who();
    this.data = emptyRun(w.patient, w.weightKg, now());
  }

  /** The host's wire events (its own panel's end of the in-process hub): commands applied, states, timelines. */
  wire(e: WireEvent): void {
    if (e.type === 'timeline') return e.cause === 'restore' ? this.restored(e.t) : this.reset();
    if (e.type === 'scenario') {
      if (!this.data.doc) return void (this.held = e); // a load publishes its first state before its own commandApplied
      // a return to a bookmark re-publishes the bookmark's state, with the time it was entered, BEFORE the timeline
      // event: it is not a new state (the return's row says where the run went back to)
      if (e.t < (this.data.rows.at(-1)?.t ?? 0) - RESYNC_S) return;
      const kept = this.data.rows.filter((r) => r.kind === 'scenario' && r.undone === undefined).at(-1);
      if (kept?.ev === `state:${e.stateId}`) return; // a resync's repeat of the state we are in
      const label = this.data.doc?.states.find((s) => s.id === e.stateId)?.label ?? 'next state';
      return this.add({ t: e.t, kind: 'scenario', text: `Scenario state: ${label}`, ev: `state:${e.stateId}` });
    }
    if (e.type !== 'commandApplied') return;
    const r = e.resolved as AppliedResolution | undefined;
    if (!r?.command || r.replay || r.mirror) return; // a late-join replay or a cockpit frame is not an action
    const c = r.command as unknown as Record<string, unknown>;
    const bySc = c.issuedBy === 'scenario';
    // the scenario's own set-up (mode, sensors, device settings) is not part of the case; a manual trigger is shown
    // by the state it leads to
    if ((bySc && (c.type === 'setMode' || c.type === 'attachSensor' || c.type === 'device')) || (c.type === 'scenario' && c.action === 'trigger')) return;
    const t = e.tick * 0.02;
    const text = describeCommand(c);
    if (c.type === 'scenario') {
      if (c.action === 'load' && c.doc) {
        this.data.doc = c.doc as ScenarioDoc;
        this.add({ t, kind: 'scenario', text });
        if (this.held) this.wire(this.held);
        return void (this.held = null);
      }
      if (c.action === 'restoreBookmark') this.undo(String(c.target), t);
      if (c.action === 'bookmark') {
        this.marks.set(String(c.target), { lastVent: this.lastVent, pulse: this.pulse, active: [...this.active] });
        return this.add({ t, kind: 'bookmark', text, mark: String(c.target) });
      }
      return this.add({ t, kind: c.action === 'restoreBookmark' ? 'restore' : 'scenario', text });
    }
    const ev = c.type === 'applyEvent' ? (c.event as Record<string, unknown>) : null;
    const row: Row = { t, kind: bySc ? 'scenario' : c.issuedBy === 'remote' ? 'remote' : 'action', text };
    if (ev?.kind === 'drug' || ev?.kind === 'infusion' || ev?.kind === 'tci') row.ev = `drug:${String(ev.drugId)}`;
    if (ev?.kind === 'drug' && !ev.infusion) row.dose = { drugId: String(ev.drugId), dose: Number(ev.dose), unit: String(ev.unit) };
    if (ev?.kind === 'fluid') row.ev = 'fluid';
    if (ev?.kind === 'cpr' && ev.active) row.ev = 'cpr';
    if (ev?.kind === 'defib' && ev.action === 'shock') row.ev = 'shock';
    if (ev?.kind === 'condition' && Number(ev.severity) > 0) row.ev = `condition:${String(ev.id)}`;
    if (ev?.kind === 'airway') row.ev = `airway:${String(ev.state)}`;
    this.add(row);
  }

  /** The host's engine events (truth included: it stays on this page). */
  engine(e: EngineEvent): void {
    if (e.type === 'alarmStatus') {
      for (const a of e.active) if (!this.active.has(a.id)) this.add({ t: e.t, kind: 'alarm', text: alarmLine(a).text, ev: `alarm:${a.id}` });
      this.active = new Set(e.active.map((a) => a.id));
    } else if (e.type === 'breath') {
      const b = e as unknown as { t: number; kind: string };
      if (b.kind !== 'mech' && b.kind !== 'bvm') return;
      // after a return, a breath that began before the snapshot is the restored engine finishing one under way
      if (b.t < this.since - EPS) return void (this.lastVent = Math.max(this.lastVent, b.t));
      if (b.t - this.lastVent > VENT_GAP_S) this.add({ t: b.t, kind: 'patient', text: b.kind === 'bvm' ? 'Bag-mask breaths began' : 'Ventilated breaths began', ev: 'ventilation' });
      this.lastVent = b.t;
    } else if (e.type === 'truth') {
      const circ = (e.tree.hemo as Record<string, Record<string, unknown>> | undefined)?.circ;
      if (!circ) return;
      const pulse = circ.arrest === null || circ.arrest === undefined;
      if (this.pulse !== null && pulse !== this.pulse) this.add({ t: e.t, kind: 'patient', text: pulse ? 'Circulation returned (the model)' : 'Pulse lost (the model)', ev: pulse ? 'rosc' : 'pulseLoss' });
      if (this.pulse === null && !pulse) this.add({ t: e.t, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' });
      this.pulse = pulse;
      const tc = (e.tree.resp as Record<string, Record<string, unknown>> | undefined)?.temp?.tc;
      this.lab.tcore = typeof tc === 'number' ? Math.round(tc * 10) / 10 : null;
      this.sample(e.t);
    } else if (e.type === 'measurement') {
      for (const [k, m] of Object.entries(e.values)) this.cur[k] = m && m.value !== null && m.flag !== 'invalid' ? m.value : null;
      this.sample(e.t);
    } else if (e.type === 'labs') {
      Object.assign(this.lab, { k: e.values.k, lactate: e.values.lactate, ph: e.values.ph });
      this.sample(e.t);
    } else if (e.type === 'endo') {
      this.lab.glucose = e.glucoseMmolL;
      this.sample(e.t);
    }
  }

  /** The 1 Hz sample of simulated second ⌊t⌋ from the latest values (several events of one second update one sample). */
  private sample(t: number): void {
    const s = Math.floor(t + EPS);
    const row = { t: s } as Sample;
    for (const k of TREND_KEYS) row[k] = TREND[k].map((id) => this.cur[id]).find((v) => typeof v === 'number') ?? null;
    for (const k of LAB_KEYS) row[k] = this.lab[k] ?? null;
    const last = this.data.samples.at(-1);
    if (last && last.t === s) Object.assign(last, row);
    else if (!last || s > last.t) this.data.samples.push(row);
    if (this.data.samples.length > SAMPLES_MAX) this.data.samples.splice(0, this.data.samples.length - SAMPLES_MAX);
    this.data.lastWall = this.now();
  }

  /** An instructor note or an objective ticked in the Scenario tab (the Link's log). */
  note(t: number, text: string): void {
    this.add({ t, kind: 'note', text });
  }

  private add(r: Row): void {
    this.data.rows.push(r);
    this.data.lastWall = this.now();
  }

  private reset(): void {
    const w = this.who();
    this.data = emptyRun(w.patient, w.weightKg, this.now());
    this.active = new Set();
    this.lastVent = -Infinity;
    this.pulse = null;
    this.held = null;
    this.since = -Infinity;
    this.marks.clear();
    for (const k of Object.keys(this.cur)) delete this.cur[k];
    for (const k of LAB_KEYS) delete this.lab[k];
  }

  /** The engine went back to simulated time t (a return to a bookmark): the trend rewinds as the monitor's does. */
  private restored(t: number): void {
    this.data.samples = this.data.samples.filter((s) => s.t <= t + EPS);
    this.since = t;
  }

  /**
   * The return to bookmark `label`, whose snapshot is at the engine's time `t` (exact: the restore's tick): every kept row
   * recorded after that bookmark at or after `t` is undone. Both tests matter: an action in the snapshot's own tick came
   * after it (same time, later order), and a breath reaches the record when it ends, seconds after the time it carries
   * (earlier time, later order). The breath, pulse and alarm trackers go back to where they stood at the bookmark, so the
   * restored engine's repeat of a breath already under way is no new "began" and an alarm active at the bookmark is not
   * raised again (R50 M-2). A bookmark this record never saw: the rows after `t`, the trackers from the kept rows, and
   * every alarm the restored engine reports is raised.
   */
  private undo(label: string, t: number): void {
    const n = ++this.data.returns;
    const rows = this.data.rows;
    let i = rows.length - 1;
    while (i >= 0 && !(rows[i]?.mark === label && rows[i]?.undone === undefined)) i--;
    rows.forEach((r, k) => {
      if (r.undone === undefined && k > i && r.t > t - EPS && (i >= 0 || r.t > t + EPS)) r.undone = n;
    });
    const m = this.marks.get(label);
    this.lastVent = m ? m.lastVent : -Infinity;
    this.active = new Set(m?.active ?? []);
    this.pulse = m ? m.pulse : rows.filter((r) => r.undone === undefined && (r.ev === 'pulseLoss' || r.ev === 'rosc')).at(-1)?.ev !== 'pulseLoss';
  }
}
```

In `apps/demo/src/app/session.ts`, find:

```ts
import { ageBandOf, profileOf, type PatientSpec } from './patients.ts';
```

Replace with:

```ts
import { ageBandOf, oneLiner, profileOf, type PatientSpec } from './patients.ts';
import { RunRecord } from './record.ts';
```

In `apps/demo/src/app/session.ts`, find:

```ts
  /** Latest engine events the shell reads (alarm mirror, defib, drugs). */
```

Replace with:

```ts
  /** Stage 13: the debrief's record of the run — beside the engine, not in its snapshot, so a restore keeps it. */
  readonly record: RunRecord;
  /** Latest engine events the shell reads (alarm mirror, defib, drugs). */
```

In `apps/demo/src/app/session.ts`, find:

```ts
    const target: HostTarget = {
```

Replace with:

```ts
    this.record = new RunRecord(() => ({ patient: oneLiner(this.spec), weightKg: this.spec.weightKg }));
    const target: HostTarget = {
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.panel = new ControllerSession({ session: this.code, transport: this.panelTransport, issuedBy: 'instructor' });
```

Replace with:

```ts
    this.panelTransport.onMessage((m) => void (m.kind === 'event' && m.body.forEach((e) => this.record.wire(e)))); // every source's commands, in order
    this.panel = new ControllerSession({ session: this.code, transport: this.panelTransport, issuedBy: 'instructor' });
```

In `apps/demo/src/app/session.ts`, find:

```ts
      if (e.type !== 'truth') for (const fn of this.listeners) fn(e); // truth (≈ 25 KB at 1 Hz) stays on this page
```

Replace with:

```ts
      this.record.engine(e);
      if (e.type !== 'truth') for (const fn of this.listeners) fn(e); // truth (≈ 25 KB at 1 Hz) stays on this page
```

- [ ] **Step 4: Run it to see it pass; neighbours; typecheck**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/record.test.ts src/app/fu11-link-timeline.test.ts src/app/events.test.ts && npx -y pnpm@9.15.9 exec tsc -p tsconfig.json`
Expected: 6 + 1 + the events tests pass, and the Stage 10 case passes where Stage 10 has merged (else it is skipped
with "no fast-forward on this tree … Stage 10 has not merged"; the real-host cases take ≈ 3–6 s); tsc exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/src/app/record.ts apps/demo/src/app/record.test.ts apps/demo/src/app/session.ts apps/demo/src/app/link.ts apps/demo/src/app/describe.ts
git commit -m "feat(13): the run record — every command, state, alarm, breath and pulse change, beside the engine; a return to a bookmark marks the course after it undone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin stage-13-debrief
```

### Task 2: Objectives as rules — the schema, the evaluator and the facts

**Files:**
- Modify: `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/controller/src/scenario/types.ts`,
  `apps/demo/src/app/scenarios.ts`
- Create: `apps/demo/src/app/debrief.ts`, `apps/demo/src/app/debrief.test.ts`

**Interfaces:**
- Consumes: Task 1's `RunData`, `Row`, `Sample`, `TREND`, `TREND_KEYS`, `LABS`, `LAB_KEYS`, `LabKey`, `ValueKey`, `emptyRun`.
- Produces: types `RunEventId`, `TrendValue`, `ObjectiveRule`, `Objective` (from `@pme/controller/scenario`);
  `ScenarioDoc.objectives?: Array<string | Objective>`; `objectiveText(o): string` (scenarios.ts; `cardOf` uses it, so
  every card still shows strings); in `debrief.ts`: `verdict(rule, d): Verdict`, `objectives(d): Array<{ text; verdict
  }>`, `facts(d): Fact[]`, `drugTotals(d)`, `trendMeta(k)` (a trend or a lab), `endOf(d)`, `perMinute(d)` (Q1),
  `debriefJson(d, build)` (Q3), `eventWords`, `isEvent`, `mmss`, `span`, type `Status = 'met' | 'not met' | 'not
  assessable'`; `ObjectiveRule` gains the optional `from` (eventWithin, occurred, never).

- [ ] **Step 1: Write the failing test**

Create `apps/demo/src/app/debrief.test.ts`:

```ts
// Stage 13 Task 2: the debrief's judgements — every rule kind met, not met and not assessable, read on the kept course
// (an event before the anchor, a second anchor, a value never measured); the measured facts, the labs and the drug
// totals; objectives without a rule listed as not assessable (with the instructor's tick); the minute table and the JSON.
import type { ObjectiveRule } from '@pme/controller/scenario';
import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { debriefJson, drugTotals, facts, objectives, perMinute, verdict } from './debrief.ts';
import { emptyRun, type Row, type RunData, type Sample } from './record.ts';
import { cardOf } from './scenarios.ts';

/** A two-state case (the showcase cards' words are Stage 11's to change). */
const DOC = { schema: 'pme-scenario/1', id: 'case', title: 'Case', initialState: 'awake', states: [{ id: 'awake', label: 'Awake' }, { id: 'induced', label: 'Induced' }] } as const;
const sample = (t: number, o: Partial<Sample> = {}): Sample => ({ t, hr: 80, map: 80, spo2: 98, etco2: 38, rr: 12, temp: 36.8, k: null, lactate: null, ph: null, glucose: null, tcore: null, ...o });
const run = (rows: Row[], samples: Sample[] = [], weightKg = 70): RunData => ({ ...emptyRun('M 40 y 70 kg', weightKg, 0), doc: DOC as never, rows, samples });
const apnoea = (t: number, undone?: number): Row => ({ t, kind: 'alarm', text: 'Apnoea (no CO₂ breaths)', ev: 'alarm:apnoea-co2', ...(undone ? { undone } : {}) });
const vent = (t: number, undone?: number): Row => ({ t, kind: 'patient', text: 'Ventilated breaths began', ev: 'ventilation', ...(undone ? { undone } : {}) });
const v = (rule: ObjectiveRule, d: RunData) => verdict(rule, d);

describe('Stage 13: objective rules', () => {
  const within: ObjectiveRule = { kind: 'eventWithin', after: 'alarm:apnoea', event: 'ventilation', withinS: 90 };

  it('eventWithin: met, not met (late or never), not assessable (no trigger, or the run ended first)', () => {
    expect(v(within, run([apnoea(66), vent(106)]))).toEqual({ status: 'met', why: 'Ventilated breaths 40 s after the alarm Apnoea (no CO₂ breaths) (01:06 → 01:46; within 1 min 30 s asked).' });
    expect(v(within, run([apnoea(66), vent(200)])).status).toBe('not met');
    expect(v(within, run([apnoea(66)], [sample(200)]))).toEqual({ status: 'not met', why: 'No ventilated breaths within 1 min 30 s of the alarm Apnoea (no CO₂ breaths) at 01:06.' });
    expect(v(within, run([], [sample(300)]))).toEqual({ status: 'not assessable', why: 'The alarm Apnoea (no CO₂ breaths) did not happen.' });
    expect(v(within, run([apnoea(66)], [sample(100)])).why).toBe('The run ended 34 s after the alarm Apnoea (no CO₂ breaths) at 01:06, before 1 min 30 s had passed.');
  });

  it('an event before the anchor does not count; a second anchor is not judged again (the first is)', () => {
    expect(v(within, run([vent(30), apnoea(66)], [sample(200)]))).toEqual({ status: 'not met', why: 'No ventilated breaths within 1 min 30 s of the alarm Apnoea (no CO₂ breaths) at 01:06.' });
    const cpr: ObjectiveRule = { kind: 'eventWithin', after: 'pulseLoss', event: 'cpr', withinS: 30 };
    const rows: Row[] = [
      { t: 100, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 160, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      { t: 300, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 310, kind: 'action', text: 'CPR started', ev: 'cpr' },
    ];
    expect(v(cpr, run(rows))).toEqual({ status: 'not met', why: 'CPR 3 min 30 s after the pulse loss (01:40 → 05:10; within 30 s asked).' });
  });

  it('a value never measured is not assessable, never "did not happen" (R50 I-3)', () => {
    const none = [sample(0, { spo2: null, map: null }), sample(200, { spo2: null, map: null })];
    expect(v({ kind: 'occurred', event: 'value:spo2<90' }, run([], none))).toEqual({ status: 'not assessable', why: 'SpO₂ was not measured during the run.' });
    expect(v({ kind: 'never', event: 'value:spo2<90' }, run([], none)).status).toBe('not assessable');
    const pe: Row = { t: 60, kind: 'action', text: 'Phenylephrine 100 µg IV', ev: 'drug:phenylephrine' };
    expect(v({ kind: 'eventWithin', after: 'drug:phenylephrine', event: 'value:map>65', withinS: 120 }, run([pe], [sample(0, { map: 50 }), sample(61, { map: null }), sample(300, { map: null })])))
      .toEqual({ status: 'not assessable', why: 'ART M / NIBP M was not measured after Phenylephrine at 01:00.' });
    expect(v({ kind: 'eventWithin', after: 'value:map<60', event: 'drug:phenylephrine', withinS: 60 }, run([pe], none)).why).toBe('ART M / NIBP M was not measured during the run.');
  });

  it('from (R50): a value event counted only after an event — "EtCO₂ below 40 after the crisis was called"', () => {
    const xs = [sample(0, { etco2: 34 }), sample(20, { etco2: 52 }), sample(100, { etco2: 38 })];
    const off: Row = { t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' };
    const back: Row = { t: 130, kind: 'scenario', text: 'y', ev: 'ventilation' };
    const rule: ObjectiveRule = { kind: 'eventWithin', from: 'state:induced', after: 'value:etco2<40', event: 'ventilation', withinS: 60 };
    expect(v(rule, run([off, back], xs))).toEqual({ status: 'met', why: 'Ventilated breaths 30 s after EtCO₂ below 40 mmHg after the state "Induced" (01:40 → 02:10; within 1 min 00 s asked).' });
    expect(v({ ...rule, from: undefined } as ObjectiveRule, run([off, back], xs)).status).toBe('not met'); // without it: the baseline at 00:00
    expect(v(rule, run([back], xs))).toEqual({ status: 'not assessable', why: 'The state "Induced" did not happen.' });
    expect(v({ kind: 'occurred', from: 'state:induced', event: 'value:etco2<40' }, run([off], xs))).toEqual({ status: 'met', why: 'EtCO₂ below 40 mmHg after the state "Induced" at 01:40' });
    expect(v({ kind: 'never', from: 'state:induced', event: 'value:etco2<40' }, run([off], [sample(0, { etco2: 34 }), sample(20, { etco2: null })])).why).toBe('EtCO₂ was not measured after the state "Induced" at 00:10.');
  });

  it('Q7: a lab value in a rule — K⁺ above 5.5, treated within 300 s', () => {
    const potassium: ObjectiveRule = { kind: 'eventWithin', after: 'value:k>5.5', event: ['drug:calciumChloride', 'drug:insulinDextrose'], withinS: 300 };
    const ca: Row = { t: 400, kind: 'scenario', text: 'Calcium chloride', ev: 'drug:calciumChloride' };
    const ks = [sample(0, { k: 4.2 }), sample(200, { k: 5.6 }), sample(400, { k: 6.1 })];
    expect(v(potassium, run([ca], ks))).toEqual({ status: 'met', why: 'Calcium chloride 10 % or Insulin + dextrose 3 min 20 s after K⁺ above 5.5 mmol/L (03:20 → 06:40; within 5 min 00 s asked).' });
    expect(v({ kind: 'stayed', value: 'k', below: 6, after: 'drug:calciumChloride', forS: 60 }, run([ca], ks)).status).toBe('not met');
  });

  it('reads the kept course: an undone try does not count, the retry does', () => {
    expect(v(within, run([apnoea(66), vent(250, 1), { t: 20, kind: 'restore', text: 'Returned to bookmark' }, apnoea(66), vent(100)])).status).toBe('met');
    expect(v(within, run([apnoea(66, 1), vent(100, 1)], [sample(30)])).status).toBe('not assessable');
  });

  it('ROSC within N s of the pulse loss is an eventWithin', () => {
    const rosc: ObjectiveRule = { kind: 'eventWithin', after: 'pulseLoss', event: 'rosc', withinS: 300 };
    const lost: Row = { t: 600, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' };
    expect(v(rosc, run([lost, { t: 780, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' }])).why).toBe('The return of circulation 3 min 00 s after the pulse loss (10:00 → 13:00; within 5 min 00 s asked).');
    expect(v(rosc, run([lost], [sample(1000)])).status).toBe('not met');
  });

  it('value events and lists of events', () => {
    const xs = [sample(0, { map: 80 }), sample(30, { map: 58 }), sample(50, { map: 59 }), sample(70, { map: 66 })];
    const pe: Row = { t: 60, kind: 'action', text: 'Phenylephrine 100 µg IV', ev: 'drug:phenylephrine' };
    const treat: ObjectiveRule = { kind: 'eventWithin', after: 'value:map<60', event: ['drug:phenylephrine', 'drug:ephedrine'], withinS: 60 };
    expect(v(treat, run([pe], xs))).toEqual({ status: 'met', why: 'Phenylephrine or Ephedrine 30 s after ART M / NIBP M below 60 mmHg (00:30 → 01:00; within 1 min 00 s asked).' });
    expect(v({ kind: 'eventWithin', after: ['drug:ephedrine', 'drug:phenylephrine'], event: 'value:map>65', withinS: 120 }, run([pe], xs)).why).toBe('ART M / NIBP M above 65 mmHg 10 s after Ephedrine or Phenylephrine (01:00 → 01:10; within 2 min 00 s asked).');
    expect(v({ kind: 'occurred', event: 'value:spo2<90' }, run([], xs))).toEqual({ status: 'not met', why: 'SpO₂ below 90 %: did not happen' });
  });

  it('occurred and never', () => {
    const drug: Row = { t: 150, kind: 'action', text: 'Dantrolene 175 mg IV', ev: 'drug:dantrolene', dose: { drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg' } };
    expect(v({ kind: 'occurred', event: 'drug:dantrolene' }, run([drug]))).toEqual({ status: 'met', why: 'Dantrolene at 02:30' });
    expect(v({ kind: 'occurred', event: 'drug:dantrolene' }, run([]))).toEqual({ status: 'not met', why: 'Dantrolene: did not happen' });
    expect(v({ kind: 'never', event: 'pulseLoss' }, run([]))).toEqual({ status: 'met', why: 'The pulse loss: did not happen' });
    expect(v({ kind: 'never', event: 'state:induced' }, run([{ t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' }])).why).toBe('The state "Induced" at 00:10');
  });

  it('stayed: over the whole run or a window after an event', () => {
    const spo2: ObjectiveRule = { kind: 'stayed', value: 'spo2', above: 90 };
    const xs = [sample(0, { spo2: 99 }), sample(60, { spo2: 93 }), sample(120, { spo2: 97 })];
    expect(v(spo2, run([], xs))).toEqual({ status: 'met', why: 'SpO₂ stayed above 90 % (lowest 93 % at 01:00).' });
    expect(v(spo2, run([], [...xs, sample(130, { spo2: 88 })]))).toEqual({ status: 'not met', why: 'SpO₂ 88 % at 02:10 (asked: above 90 %).' });
    expect(v(spo2, run([], [sample(0, { spo2: null })])).status).toBe('not assessable');
    const map: ObjectiveRule = { kind: 'stayed', value: 'map', above: 65, after: 'state:induced', forS: 120 };
    const induced: Row = { t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' };
    expect(v(map, run([induced], [sample(5, { map: 50 }), sample(60, { map: 70 }), sample(140, { map: 66 })])).status).toBe('met'); // 5 s is before the window
    expect(v(map, run([induced], [sample(60, { map: 70 })])).why).toBe('The run ended before the 2 min 00 s window closed; ART M / NIBP M stayed above 65 mmHg until then.');
    expect(v(map, run([], [sample(60)])).status).toBe('not assessable');
    expect(v({ kind: 'stayed', value: 'etco2', below: 45 }, run([], [sample(0, { etco2: 52 })])).why).toBe('EtCO₂ 52 mmHg at 00:00 (asked: below 45 mmHg).');
  });

  it('objectives: strings and rule-less objects are not assessable; a tick in the Scenario tab is reported', () => {
    const d = run([apnoea(66), vent(100), { t: 140, kind: 'note', text: 'Objective met: Confirm ventilation with the capnogram' }], [sample(200)]);
    d.doc = { ...(DOC as never as NonNullable<RunData['doc']>), objectives: ['Anticipate the fall in arterial pressure after propofol', { text: 'Ventilate within 90 s of the apnoea alarm', rule: within }, { text: 'Confirm ventilation with the capnogram' }] };
    expect(objectives(d)).toEqual([
      { text: 'Anticipate the fall in arterial pressure after propofol', verdict: { status: 'not assessable', why: 'This objective has no rule: the instructor judges it.' } },
      { text: 'Ventilate within 90 s of the apnoea alarm', verdict: { status: 'met', why: expect.stringContaining('34 s after') } },
      { text: 'Confirm ventilation with the capnogram', verdict: { status: 'not assessable', why: 'This objective has no rule: the instructor judges it. The instructor ticked it at 02:20.' } },
    ]);
  });
});

describe('Stage 13: facts and totals', () => {
  it('states the extremes, the apnoea-to-ventilation time, the pulseless time, ROSC and the epinephrine total', () => {
    const epi = (t: number, dose: number, unit: string): Row => ({ t, kind: 'action', text: 'Epinephrine', ev: 'drug:epinephrine', dose: { drugId: 'epinephrine', dose, unit } });
    const d = run([
      apnoea(66), vent(106),
      { t: 300, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, epi(330, 1, 'mg'), epi(510, 1000, 'mcg'),
      { t: 480, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      { t: 500, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 560, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      epi(900, 1, 'mg', ), // undone below
    ], [sample(0), sample(200, { spo2: 81, map: 48, etco2: 52, temp: 37.4 }), sample(600)]);
    (d.rows.at(-1) as Row).undone = 1;
    expect(facts(d)).toEqual([
      { label: 'Lowest SpO₂', value: '81 % at 03:20' },
      { label: 'Lowest ART M / NIBP M', value: '48 mmHg at 03:20' },
      { label: 'Highest EtCO₂', value: '52 mmHg at 03:20' },
      { label: 'Highest T1 / T2', value: '37.4 °C at 03:20' },
      { label: 'Apnoea alarm to ventilated breaths', value: '40 s (01:06 → 01:46)' },
      { label: 'Pulseless', value: '4 min 00 s in all; first lost at 05:00' },
      { label: 'Return of circulation', value: '3 min 00 s after the pulse loss (08:00)' },
      { label: 'Epinephrine, boluses in all', value: '2 mg (2 doses)' },
    ]);
    expect(facts(run([], []))).toEqual([]);
  });

  it('Q7: the labs — last value (lowest–highest), labels and units from the glossary', () => {
    const d = run([], [sample(0, { k: 4.2, lactate: 1, ph: 7.41, glucose: 5.5, tcore: 36.8 }), sample(60, { k: 6.3, lactate: 3.4, ph: 7.19, glucose: 5.7, tcore: 39.4 }), sample(120, { k: 6.1, lactate: 3.2, ph: 7.21, glucose: 5.6, tcore: 39.1 })]);
    expect(facts(d).at(-1)).toEqual({ label: 'Labs (the model): last (lowest–highest)', value: 'K⁺ 6.1 mmol/L (4.2–6.3) · Lactate 3.2 mmol/L (1.0–3.4) · pH 7.21 (7.19–7.41) · Glucose 5.6 mmol/L (5.5–5.7) · Tcore 39.1 °C (36.8–39.4)' });
  });

  it('Q1 and Q3: one row per minute (each value’s first measurement in it); the report as JSON', () => {
    const d = run([apnoea(66), vent(106)], [sample(0, { hr: null, k: 4.2 }), sample(1, { hr: 71 }), sample(61, { hr: 90, k: 4.4 }), sample(185, { hr: 100 })]);
    expect(perMinute(d).map((m) => [m.t, m.values.hr, m.values.k])).toEqual([[0, 71, 4.2], [60, 90, 4.4], [120, null, null], [180, 100, null]]);
    const j = JSON.parse(debriefJson(d, 'abc1234 2026-10-11'));
    expect(Object.keys(j)).toEqual(['schema', 'build', 'record', 'objectives', 'facts', 'minutes']);
    expect(j.schema).toBe('pme-debrief/1');
    expect(j.record).toEqual(JSON.parse(JSON.stringify(d)));
    expect(j.minutes).toHaveLength(4);
  });

  it('totals per-kg doses by weight and keeps other units as given', () => {
    const d = run([
      { t: 1, kind: 'action', text: '', dose: { drugId: 'propofol', dose: 2, unit: 'mg/kg' } },
      { t: 2, kind: 'action', text: '', dose: { drugId: 'fentanyl', dose: 1, unit: 'mcg/kg' } },
      { t: 3, kind: 'action', text: '', dose: { drugId: 'sodiumBicarbonate', dose: 50, unit: 'mEq' } },
    ], [], 80);
    expect(drugTotals(d)).toEqual([{ drugId: 'propofol', n: 1, total: '160 mg' }, { drugId: 'fentanyl', n: 1, total: '80 µg' }, { drugId: 'sodiumBicarbonate', n: 1, total: '50 mEq' }]);
  });
});

describe('Stage 13: the objective rule in pme-scenario/1', () => {
  const doc = (objectives: unknown[]) => ({ ...DOC, objectives });
  it('accepts strings and { text, rule } of every kind; the card shows the words', () => {
    const r = validateScenario(doc([
      'Plain words',
      { text: 'No rule' },
      { text: 'A', rule: { kind: 'eventWithin', after: 'alarm:apnoea', event: 'ventilation', withinS: 90 } },
      { text: 'B', rule: { kind: 'occurred', event: 'drug:dantrolene' } },
      { text: 'C', rule: { kind: 'never', event: 'pulseLoss' } },
      { text: 'D', rule: { kind: 'stayed', value: 'spo2', above: 90, after: 'state:induced', forS: 300 } },
      { text: 'E', rule: { kind: 'eventWithin', after: 'value:map<60', event: ['drug:phenylephrine', 'drug:ephedrine'], withinS: 60 } },
      { text: 'F', rule: { kind: 'eventWithin', after: 'value:k>5.5', event: ['drug:calciumChloride', 'drug:insulinDextrose'], withinS: 300 } },
      { text: 'G', rule: { kind: 'stayed', value: 'ph', above: 7.2 } },
      { text: 'H', rule: { kind: 'eventWithin', from: 'state:triggerOff', after: 'value:etco2<40', event: 'state:normoventilated', withinS: 300 } },
    ]));
    expect(r.ok, r.ok ? '' : r.errors.join('\n')).toBe(true);
    if (r.ok) expect(cardOf(r.doc).objectives).toEqual(['Plain words', 'No rule', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });
  it.each([
    [{ text: 'x', rule: { kind: 'soon', event: 'cpr' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: 'ventilated' } }],
    [{ text: 'x', rule: { kind: 'stayed', value: 'spo2' } }],
    [{ text: 'x', rule: { kind: 'eventWithin', after: 'cpr', event: 'shock' } }],
    [{ rule: { kind: 'occurred', event: 'cpr' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: 'value:na>150' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: [] } }],
    [{ text: 'x', rule: { kind: 'stayed', value: 'spo2', above: 90, from: 'start' } }],
  ])('refuses %j', (o) => {
    expect(validateScenario(doc([o])).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/debrief.test.ts`
Expected: FAIL — `Failed to resolve import "./debrief.ts"`.

- [ ] **Step 3: Implement**

Create `apps/demo/src/app/debrief.ts`:

```ts
// Stage 13: what the debrief states from a run record — each objective met / not met / not assessable from its rule
// (types.ts `ObjectiveRule`), with the reason and the simulated times in one line, and the facts the engine can measure.
// Both read the KEPT course (a return to a bookmark undoes what came after it: the retry is what is judged). Labels come
// from the glossary and the alarm table (R56). Also the one-row-per-minute table (Q1) and the JSON of the report (Q3).
// No DOM.
import type { ObjectiveRule, RunEventId } from '@pme/controller/scenario';
import { FIXED_ALARM_WORDS } from './alarms.ts';
import { CONDITIONS } from './describe.ts';
import { drugName, drugWords, labelOf, lookup, unitOf } from './glossary.ts';
import { LAB_KEYS, LABS, TREND, TREND_KEYS, type LabKey, type Row, type RunData, type Sample, type ValueKey } from './record.ts';
import { objectiveText } from './scenarios.ts';

export type Status = 'met' | 'not met' | 'not assessable';
export interface Verdict {
  status: Status;
  why: string;
}

/** mm:ss of simulated time (the session bar's clock). */
export const mmss = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** A span: "40 s", "2 min 05 s". */
export const span = (s: number): string => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`);

const kept = (d: RunData): Row[] => d.rows.filter((r) => r.undone === undefined);
/** An event id matches itself and its own longer ids up to a hyphen ('alarm:apnoea' ⊃ 'alarm:apnoea-co2'). */
export const isEvent = (id: string | undefined, want: RunEventId): boolean => !!id && (id === want || id.startsWith(`${want}-`));
const VALUE = /^value:(hr|map|spo2|etco2|rr|temp|k|lactate|ph|glucose|tcore)([<>])(\d+(?:\.\d+)?)$/;
/** The first kept row of `want` (or of any of a list) at or after `from`, or null. 'start' is the run's first second; a
 *  'value:' event is the first sample past its limit. */
function first(d: RunData, want: RunEventId | RunEventId[], from = -Infinity): Row | null {
  if (Array.isArray(want)) return want.map((w) => first(d, w, from)).filter((r): r is Row => r !== null).sort((a, b) => a.t - b.t)[0] ?? null;
  if (want === 'start') return { t: 0, kind: 'scenario', text: 'the start' };
  const v = VALUE.exec(want);
  if (v) {
    const k = v[1] as ValueKey;
    const lim = Number(v[3]);
    const s = d.samples.find((x) => x.t >= from && x[k] !== null && (v[2] === '<' ? (x[k] as number) < lim : (x[k] as number) > lim));
    return s ? { t: s.t, kind: 'patient', text: '' } : null;
  }
  return kept(d).find((r) => r.t >= from && isEvent(r.ev, want)) ?? null;
}
/** Whether `want` could be seen from `from` on: a row event always; a value event only when its trend or lab was
 *  measured then (R50 I-3: a value never measured is "not assessable", never "did not happen"). A list: any of them. */
function measured(d: RunData, want: RunEventId | RunEventId[], from = -Infinity): boolean {
  if (Array.isArray(want)) return want.some((w) => measured(d, w, from));
  const v = VALUE.exec(want);
  return !v || d.samples.some((s) => s.t >= from && s[v[1] as ValueKey] !== null);
}
/** "SpO₂ was not measured …" for the value events of `want`. */
const unmeasured = (want: RunEventId | RunEventId[], tail: string): string =>
  `${[want].flat().map((w) => VALUE.exec(w)?.[1]).filter((k): k is ValueKey => !!k).map((k) => trendMeta(k).label).join(' or ')} was not measured ${tail}.`;
/** The run's last simulated second on the kept course. */
export const endOf = (d: RunData): number => Math.max(0, ...kept(d).map((r) => r.t), ...d.samples.map((s) => s.t));

/** An event in words, for a reason line ("the alarm Apnoea (no CO₂ breaths)", "epinephrine", "SpO₂ below 90 %"). */
export function eventWords(want: RunEventId | RunEventId[], d: RunData): string {
  if (Array.isArray(want)) return want.map((w) => eventWords(w, d)).join(' or ');
  const v = VALUE.exec(want);
  if (v) return `${trendMeta(v[1] as ValueKey).label} ${v[2] === '<' ? 'below' : 'above'} ${fmt(v[1] as ValueKey, Number(v[3]))}`;
  const [k = '', id = ''] = want.split(':');
  if (k === 'state') return `the state "${d.doc?.states.find((s) => s.id === id)?.label ?? 'named in the rule'}"`;
  if (k === 'alarm') {
    const w = FIXED_ALARM_WORDS[id] ?? Object.entries(FIXED_ALARM_WORDS).find(([a]) => a.startsWith(`${id}-`))?.[1];
    return `the alarm ${w ?? 'named in the rule'}`;
  }
  if (k === 'drug') return drugName(id);
  if (k === 'condition') return CONDITIONS[id] ?? 'the condition';
  if (k === 'airway') return 'the airway change';
  const words: Record<string, string> = { start: 'the start', fluid: 'fluid', cpr: 'CPR', shock: 'a shock', ventilation: 'ventilated breaths', pulseLoss: 'the pulse loss', rosc: 'the return of circulation' };
  return words[k] ?? 'the event';
}

const DIGITS: Partial<Record<ValueKey, number>> = { temp: 1, k: 1, lactate: 1, ph: 2, glucose: 1, tcore: 1 };
const isLab = (k: ValueKey): k is LabKey => k in LABS;
/** A trend's or a lab's label and unit from the glossary ("ART M / NIBP M", "mmHg"; "K⁺", "mmol/L"). */
export function trendMeta(k: ValueKey): { label: string; unit: string; digits: number } {
  const keys = isLab(k) ? [LABS[k]] : TREND[k].map((id) => `mon.${id}`);
  const l = lookup(keys[0] as string);
  return { label: keys.map((key) => labelOf(key) ?? '').filter(Boolean).join(' / '), unit: l ? unitOf(l.e) : '', digits: DIGITS[k] ?? 0 };
}
const fmt = (k: ValueKey, v: number): string => {
  const m = trendMeta(k);
  return `${v.toFixed(m.digits)} ${m.unit}`.trim();
};

/** The verdict of one rule on a run (no rule: not assessable). */
export function verdict(rule: ObjectiveRule | undefined, d: RunData): Verdict {
  const no = (why: string): Verdict => ({ status: 'not assessable', why });
  if (!rule) return no('This objective has no rule: the instructor judges it.');
  const end = endOf(d);
  // R50: `from` — the rule's events count only at or after the first `from` ("after the crisis was called")
  const fromEv = rule.kind === 'stayed' ? undefined : rule.from;
  const start = fromEv ? first(d, fromEv) : null;
  if (fromEv && !start) return no(`${cap(eventWords(fromEv, d))} did not happen.`);
  const since = fromEv ? ` after ${eventWords(fromEv, d)}` : '';
  const t0 = start?.t ?? -Infinity;
  const tail = start ? `${since.trim()} at ${mmss(t0)}` : 'during the run';
  if (rule.kind === 'occurred' || rule.kind === 'never') {
    const r = first(d, rule.event, t0);
    if (!r && !measured(d, rule.event, t0)) return no(unmeasured(rule.event, tail));
    const w = `${eventWords(rule.event, d)}${since}`;
    const happened = r ? `${w} at ${mmss(r.t)}` : `${w}: did not happen`;
    return { status: (r !== null) === (rule.kind === 'occurred') ? 'met' : 'not met', why: happened.charAt(0).toUpperCase() + happened.slice(1) };
  }
  if (rule.kind === 'eventWithin') {
    const a = first(d, rule.after, t0);
    if (!a) return no(measured(d, rule.after, t0) ? `${cap(eventWords(rule.after, d))}${since} did not happen.` : unmeasured(rule.after, tail));
    const b = first(d, rule.event, a.t);
    const aw = `${eventWords(rule.after, d)}${since}`;
    const bw = eventWords(rule.event, d);
    if (!b && !measured(d, rule.event, a.t)) return no(unmeasured(rule.event, `after ${aw} at ${mmss(a.t)}`));
    if (b) return { status: b.t - a.t <= rule.withinS ? 'met' : 'not met', why: `${cap(bw)} ${span(b.t - a.t)} after ${aw} (${mmss(a.t)} → ${mmss(b.t)}; within ${span(rule.withinS)} asked).` };
    if (end - a.t >= rule.withinS) return { status: 'not met', why: `No ${bw} within ${span(rule.withinS)} of ${aw} at ${mmss(a.t)}.` };
    return no(`The run ended ${span(end - a.t)} after ${aw} at ${mmss(a.t)}, before ${span(rule.withinS)} had passed.`);
  }
  // stayed
  const m = trendMeta(rule.value);
  const from = rule.after ? first(d, rule.after) : { t: 0 };
  if (!from) return no(`${cap(eventWords(rule.after ?? 'start', d))} did not happen.`);
  const to = rule.forS ? from.t + rule.forS : end;
  const xs = d.samples.filter((s): s is Sample => s.t >= from.t && s.t <= to && s[rule.value] !== null);
  const limit = [rule.above !== undefined ? `above ${fmt(rule.value, rule.above)}` : '', rule.below !== undefined ? `below ${fmt(rule.value, rule.below)}` : ''].filter(Boolean).join(' and ');
  if (!xs.length) return no(`${m.label} was not measured${rule.after ? ` after ${eventWords(rule.after, d)}` : ''}.`);
  const bad = xs.find((s) => {
    const v = s[rule.value] as number;
    return (rule.above !== undefined && !(v > rule.above)) || (rule.below !== undefined && !(v < rule.below));
  });
  if (bad) return { status: 'not met', why: `${m.label} ${fmt(rule.value, bad[rule.value] as number)} at ${mmss(bad.t)} (asked: ${limit}).` };
  if (rule.forS && end < to) return no(`The run ended before the ${span(rule.forS)} window closed; ${m.label} stayed ${limit} until then.`);
  const lo = xs.reduce((b, s) => ((rule.above !== undefined ? (s[rule.value] as number) < (b[rule.value] as number) : (s[rule.value] as number) > (b[rule.value] as number)) ? s : b));
  return { status: 'met', why: `${m.label} stayed ${limit} (${rule.above !== undefined ? 'lowest' : 'highest'} ${fmt(rule.value, lo[rule.value] as number)} at ${mmss(lo.t)}).` };
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Every objective of the run's scenario with its verdict, in the document's order; a not-assessable one ticked in
 *  the Scenario tab says so (the tick is the instructor's judgement, not a rule's). */
export function objectives(d: RunData): Array<{ text: string; verdict: Verdict }> {
  return (d.doc?.objectives ?? []).map((o) => {
    const text = drugWords(objectiveText(o));
    const v = verdict(typeof o === 'string' ? undefined : o.rule, d);
    const tick = v.status === 'not assessable' ? kept(d).find((r) => r.kind === 'note' && r.text === `Objective met: ${text}`) : undefined;
    return { text, verdict: tick ? { ...v, why: `${v.why} The instructor ticked it at ${mmss(tick.t)}.` } : v };
  });
}

export interface Fact {
  label: string;
  value: string;
}

/** Bolus totals per drug (mass doses in mg; a per-kg dose × the patient's weight; other units summed as given). */
export function drugTotals(d: RunData): Array<{ drugId: string; n: number; total: string }> {
  const by = new Map<string, { n: number; mg: number; other: Map<string, number> }>();
  for (const r of kept(d)) {
    if (!r.dose) continue;
    const x = by.get(r.dose.drugId) ?? { n: 0, mg: 0, other: new Map<string, number>() };
    const mg = { mg: 1, mcg: 1e-3, 'mg/kg': d.weightKg, 'mcg/kg': d.weightKg * 1e-3 }[r.dose.unit];
    if (mg !== undefined) x.mg += r.dose.dose * mg;
    else x.other.set(r.dose.unit, (x.other.get(r.dose.unit) ?? 0) + r.dose.dose);
    x.n++;
    by.set(r.dose.drugId, x);
  }
  const round = (v: number) => String(+v.toPrecision(3));
  return [...by].map(([drugId, x]) => ({
    drugId, n: x.n,
    total: [x.mg > 0 ? (x.mg < 1 ? `${round(x.mg * 1000)} µg` : `${round(x.mg)} mg`) : '', ...[...x.other].map(([u, v]) => `${round(v)} ${u}`)].filter(Boolean).join(' + '),
  }));
}

function extreme(d: RunData, k: ValueKey, dir: 'min' | 'max'): Sample | null {
  let best: Sample | null = null;
  for (const s of d.samples) {
    const v = s[k];
    if (v !== null && (best === null || (dir === 'min' ? v < (best[k] as number) : v > (best[k] as number)))) best = s;
  }
  return best;
}

/** The measured facts of the kept course, in a fixed order; a fact that does not apply to this run is left out. */
export function facts(d: RunData): Fact[] {
  const out: Fact[] = [];
  const ext = (k: ValueKey, dir: 'min' | 'max', word: string) => {
    const s = extreme(d, k, dir);
    if (s) out.push({ label: `${word} ${trendMeta(k).label}`, value: `${fmt(k, s[k] as number)} at ${mmss(s.t)}` });
  };
  ext('spo2', 'min', 'Lowest');
  ext('map', 'min', 'Lowest');
  ext('etco2', 'max', 'Highest');
  ext('temp', 'max', 'Highest');
  const a = first(d, 'alarm:apnoea');
  if (a) {
    const v = first(d, 'ventilation', a.t);
    out.push({ label: `${FIXED_ALARM_WORDS.APNEA} alarm to ventilated breaths`, value: v ? `${span(v.t - a.t)} (${mmss(a.t)} → ${mmss(v.t)})` : `none after the alarm at ${mmss(a.t)}` });
  }
  const p = first(d, 'pulseLoss');
  if (p) {
    let off = 0;
    let lost: number | null = null;
    for (const r of kept(d)) {
      if (r.ev === 'pulseLoss' && lost === null) lost = r.t;
      if (r.ev === 'rosc' && lost !== null) (off += r.t - lost), (lost = null);
    }
    if (lost !== null) off += endOf(d) - lost;
    out.push({ label: 'Pulseless', value: `${span(off)} in all; first lost at ${mmss(p.t)}` });
    const r = first(d, 'rosc', p.t);
    out.push({ label: 'Return of circulation', value: r ? `${span(r.t - p.t)} after the pulse loss (${mmss(r.t)})` : 'not during the run' });
  }
  const epi = drugTotals(d).find((x) => x.drugId === 'epinephrine');
  if (epi) out.push({ label: `${drugName('epinephrine')}, boluses in all`, value: `${epi.total} (${epi.n} ${epi.n === 1 ? 'dose' : 'doses'})` });
  // Q7: the model's labs, last value (lowest–highest) — the model's values at 1 Hz, not samples the instructor drew
  const labs = LAB_KEYS.flatMap((k) => {
    const last = d.samples.filter((s) => s[k] !== null).at(-1);
    const lo = extreme(d, k, 'min');
    const hi = extreme(d, k, 'max');
    if (!last || !lo || !hi) return [];
    const m = trendMeta(k);
    const f = (v: number) => v.toFixed(m.digits);
    return [`${m.label} ${f(last[k] as number)}${m.unit ? ` ${m.unit}` : ''} (${f(lo[k] as number)}–${f(hi[k] as number)})`];
  });
  if (labs.length) out.push({ label: 'Labs (the model): last (lowest–highest)', value: labs.join(' · ') });
  return out;
}

/** Q1: one row per simulated minute of the kept course — each value's first measurement in that minute (none: null). */
export function perMinute(d: RunData): Array<{ t: number; values: Record<ValueKey, number | null> }> {
  const out: Array<{ t: number; values: Record<ValueKey, number | null> }> = [];
  const keys = [...TREND_KEYS, ...LAB_KEYS];
  for (let m = 0; m * 60 <= endOf(d); m++) {
    const xs = d.samples.filter((x) => x.t >= m * 60 && x.t < (m + 1) * 60);
    out.push({ t: m * 60, values: Object.fromEntries(keys.map((k) => [k, xs.find((x) => x[k] !== null)?.[k] ?? null])) as Record<ValueKey, number | null> });
  }
  return out;
}

/** Q3: the report as JSON (`pme-debrief/1`) — the record, the verdicts, the facts and the minute table, with the build
 *  that made it. Not the "Run by" line or the notes box: they are printed only, never stored (Q2). */
export const debriefJson = (d: RunData, build: string): string =>
  JSON.stringify({ schema: 'pme-debrief/1', build, record: d, objectives: objectives(d), facts: facts(d), minutes: perMinute(d) }, null, 1);
```

In `apps/demo/src/app/scenarios.ts`, find:

```ts
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';
```

Replace with:

```ts
import type { Objective } from '@pme/controller/scenario';
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';
```

In `apps/demo/src/app/scenarios.ts`, find:

```ts

export interface ScenarioCard {
```

Replace with:

```ts

/** Stage 13: an objective's words, with or without its debrief rule. */
export const objectiveText = (o: string | Objective): string => (typeof o === 'string' ? o : o.text);

export interface ScenarioCard {
```

In `apps/demo/src/app/scenarios.ts`, find:

```ts
    minutes: doc.durationMin ?? m?.minutes ?? null, objectives: doc.objectives ?? m?.objectives ?? [], doc,
```

Replace with:

```ts
    minutes: doc.durationMin ?? m?.minutes ?? null, objectives: (doc.objectives ?? m?.objectives ?? []).map(objectiveText), doc,
```

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
    "objectives": { "type": "array", "items": { "type": "string", "minLength": 1 }, "description": "FU-8 (R-S9-4): learning objectives, one per line." },
```

Replace with:

```json
    "objectives": { "type": "array", "items": { "anyOf": [{ "type": "string", "minLength": 1 }, { "$ref": "#/definitions/objective" }] }, "description": "FU-8 (R-S9-4): learning objectives, one per line. Stage 13: an objective may carry a debrief rule, { text, rule }; one without a rule is listed as not assessable." },
```

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
    "comment": { "type": "string" },
```

Replace with:

```json
    "runEvent": {
      "type": "string", "pattern": "^(start|fluid|cpr|shock|ventilation|pulseLoss|rosc|(state|alarm|drug|condition|airway):[A-Za-z0-9_.-]+|value:(hr|map|spo2|etco2|rr|temp|k|lactate|ph|glucose|tcore)[<>][0-9]+(\\.[0-9]+)?)$",
      "description": "Stage 13: a run event a debrief rule names (scenario/types.ts RunEventId)."
    },
    "runEvents": {
      "anyOf": [{ "$ref": "#/definitions/runEvent" }, { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/runEvent" } }],
      "description": "Stage 13: one run event, or a list meaning any one of them."
    },
    "objective": {
      "type": "object",
      "required": ["text"],
      "additionalProperties": false,
      "properties": { "$comment": { "type": "string" }, "text": { "type": "string", "minLength": 1 }, "rule": { "$ref": "#/definitions/objectiveRule" } }
    },
    "objectiveRule": {
      "type": "object",
      "required": ["kind"],
      "properties": { "kind": { "type": "string" } },
      "discriminator": { "propertyName": "kind" },
      "oneOf": [
        {
          "properties": {
            "kind": { "const": "eventWithin" }, "after": { "$ref": "#/definitions/runEvents" }, "event": { "$ref": "#/definitions/runEvents" },
            "withinS": { "type": "number", "exclusiveMinimum": 0 }, "from": { "$ref": "#/definitions/runEvents" }
          },
          "required": ["after", "event", "withinS"], "additionalProperties": false
        },
        { "properties": { "kind": { "const": "occurred" }, "event": { "$ref": "#/definitions/runEvents" }, "from": { "$ref": "#/definitions/runEvents" } }, "required": ["event"], "additionalProperties": false },
        { "properties": { "kind": { "const": "never" }, "event": { "$ref": "#/definitions/runEvents" }, "from": { "$ref": "#/definitions/runEvents" } }, "required": ["event"], "additionalProperties": false },
        {
          "properties": {
            "kind": { "const": "stayed" }, "value": { "enum": ["hr", "map", "spo2", "etco2", "rr", "temp", "k", "lactate", "ph", "glucose", "tcore"] }, "above": { "type": "number" },
            "below": { "type": "number" }, "after": { "$ref": "#/definitions/runEvents" }, "forS": { "type": "number", "exclusiveMinimum": 0 }
          },
          "required": ["value"], "anyOf": [{ "properties": { "above": { "type": "number" } }, "required": ["above"] }, { "properties": { "below": { "type": "number" } }, "required": ["below"] }], "additionalProperties": false
        }
      ]
    },
    "comment": { "type": "string" },
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
/** An authored jump point shown in the timeline; choosing it is a `goto` to `state`. */
```

Replace with:

```ts
/**
 * Stage 13: a run event a debrief rule names. 'start' (the run's first second); 'state:<stateId>' (the scenario entered
 * it); 'alarm:<alarmId>' (the monitor raised it; 'alarm:apnoea' also matches 'alarm:apnoea-co2' — an id matches its own
 * prefix up to a hyphen); 'drug:<drugId>' (a bolus, infusion or TCI of it); 'fluid'; 'cpr' (started); 'shock';
 * 'condition:<id>' (started); 'airway:<state>'; 'ventilation' (mechanical or bag-mask breaths began after ≥ 15 s without
 * one); 'pulseLoss' and 'rosc' (the model's circulation stopped / returned); 'value:<trend><op><n>' (the first second a
 * trended value or lab was below or above n, e.g. 'value:spo2<90', 'value:map>65', 'value:k>5.5'; as `TrendValue`).
 */
export type RunEventId = string;
/** The six trended numerics a `stayed` rule reads (ART M, else NIBP M, for `map`; awRR, else RR, for `rr`; T1, else T2,
 *  for `temp`) and the model's five labs (K⁺, lactate, pH, glucose in mmol/L, core temperature). */
export type TrendValue = 'hr' | 'map' | 'spo2' | 'etco2' | 'rr' | 'temp' | 'k' | 'lactate' | 'ph' | 'glucose' | 'tcore';
/**
 * Stage 13: how the debrief judges an objective. `eventWithin`: `event` within `withinS` s after the FIRST `after` (a later
 * one is not judged again) (ROSC within N s of pulse loss = `{ after: 'pulseLoss', event: 'rosc' }`). `occurred` /
 * `never`. `from` (R50): the `after` (or the `event` of occurred / never) counts only at or after the first `from` —
 * "EtCO₂ falling below 40 after the crisis was called" = `{ from: 'state:triggerOff', after: 'value:etco2<40', … }`, as a
 * value event alone is the first second past the limit from the start. A list of events means any one of them
 * (`['drug:phenylephrine', 'drug:ephedrine']`). `stayed`: every value above/below the limit, over the run or the `forS` s
 * after the first `after`.
 */
export type ObjectiveRule =
  | { kind: 'eventWithin'; after: RunEventId | RunEventId[]; event: RunEventId | RunEventId[]; withinS: number; from?: RunEventId | RunEventId[] }
  | { kind: 'occurred'; event: RunEventId | RunEventId[]; from?: RunEventId | RunEventId[] }
  | { kind: 'never'; event: RunEventId | RunEventId[]; from?: RunEventId | RunEventId[] }
  | { kind: 'stayed'; value: TrendValue; above?: number; below?: number; after?: RunEventId | RunEventId[]; forS?: number };
export interface Objective extends C {
  text: string;
  /** Absent: the debrief lists the objective as not assessable. */
  rule?: ObjectiveRule;
}

/** An authored jump point shown in the timeline; choosing it is a `goto` to `state`. */
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
  objectives?: string[];
```

Replace with:

```ts
  objectives?: Array<string | Objective>;
```

- [ ] **Step 4: Run it to see it pass; the schema's own tests; typecheck both packages**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/debrief.test.ts src/app/copy.test.ts src/app/showcase.test.ts && npx -y pnpm@9.15.9 exec tsc -p tsconfig.json && cd ../../packages/controller && CI=1 npx -y pnpm@9.15.9 exec vitest run test/scenario && npx -y pnpm@9.15.9 exec tsc -p tsconfig.json`
Expected: 24 + the copy and showcase tests pass; controller `test/scenario` 106 pass (ajv strict mode compiles the
extended schema: an `anyOf` branch that requires a property defines it); both tsc exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add packages/controller/scenarios/pme-scenario-1.schema.json packages/controller/src/scenario/types.ts apps/demo/src/app/scenarios.ts apps/demo/src/app/debrief.ts apps/demo/src/app/debrief.test.ts
git commit -m "feat(13): objectives as rules in pme-scenario/1 — eventWithin, occurred, never, stayed — and the debrief's verdicts and measured facts on the kept course" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 3: Rules on the showcase cards

**Files:**
- Modify: `apps/demo/src/app/showcase/showcase-{anaphylaxis,bronchospasm,haemorrhage,induction,tamponade}.json`
- Create: `apps/demo/src/app/debrief-showcase.test.ts`

**Interfaces:**
- Consumes: Task 1's `RunRecord`, Task 2's `objectives`, `facts`, the schema.
- Produces: rules on the cards, the draft numbers marked "(debrief: … — draft, owner to confirm)" (Q5); Task 4's e2e
  relies on the anaphylaxis rules (3 objectives: none / `eventWithin state:anaphylaxis → drug:epinephrine 120 s` /
  `occurred fluid`).

- [ ] **Step 0: Which case applies**
  - Stage 11 has NOT merged: this task as written.
  - Stage 11 merged WITHOUT rules (its objectives are strings — its READY plan keeps them so): skip Steps 1–5 here and
    do Appendix B instead (the same test file, the anaphylaxis, bronchospasm and haemorrhage blocks, and rules for
    Stage 11's cards; Task 0 Step 3 with `--variant b` = 0 problems).
  - Stage 11 merged WITH rules (it adopted the contract): apply only the anaphylaxis and haemorrhage blocks and the
    test file below (and the bronchospasm block if its "Treat with a bronchodilator" is still a string); run Step 4.
    If the lint case fails, a Stage 11 rule names something that does not exist: report it to the orchestrator.

- [ ] **Step 1: Write the failing test**

Create `apps/demo/src/app/debrief-showcase.test.ts`:

```ts
// Stage 13 Task 3: the showcase objectives as rules — every rule in the library names a state, drug, alarm or condition
// that exists, and on the engine (driver, host and run record wired as AppSession wires them) the anaphylaxis and
// induction cards are judged as the presenter would judge them: treated in time = met, never = not met.
import { createEngine, DRUGS } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { FIXED_ALARM_WORDS } from './alarms.ts';
import { facts, objectives } from './debrief.ts';
import { CONDITIONS } from './describe.ts';
import { RunRecord } from './record.ts';
import { LIBRARY } from './scenarios.ts';
import anaphylaxis from './showcase/showcase-anaphylaxis.json';
import induction from './showcase/showcase-induction.json';

const known = (ev: string, doc: ScenarioDoc): boolean => {
  const [k = '', id = ''] = ev.split(':');
  if (k === 'state') return doc.states.some((s) => s.id === id);
  if (k === 'drug') return !!DRUGS[id];
  if (k === 'alarm') return Object.keys(FIXED_ALARM_WORDS).some((a) => a === id || a.startsWith(`${id}-`)) || /_(HIGH|LOW)$/.test(id);
  if (k === 'condition') return !!CONDITIONS[id];
  return true; // the schema's pattern already limits the rest
};

/** Run a card on the engine with presses at sim times (or when `at` says so); the record sees what AppSession's does. */
async function hostRun(raw: unknown, untilS: number, press: (t: number, rec: RunRecord) => string | null): Promise<RunRecord> {
  const v = validateScenario(raw);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const eo = engineOptionsOf(v.doc, 7);
  const engine = createEngine({ ...eo, mode: v.doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
  const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'SHW234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const tap = hub.connect();
  const rec = new RunRecord(() => ({ patient: 'test', weightKg: v.doc.patient?.weightKg ?? 70 }));
  tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => rec.wire(e)));
  engine.on((e) => rec.engine(e));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  await hs.submit({ id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: v.doc } as never);
  for (let t = 0.1; t <= untilS; t += 0.1) {
    engine.advanceTo(t);
    driver.poll();
    const tr = press(t, rec);
    if (tr) await hs.submit({ id: `p${t}`, issuedBy: 'instructor', type: 'scenario', action: 'trigger', target: tr } as never);
    await settle();
  }
  hs.close();
  return rec;
}
const once = (fn: (t: number, rec: RunRecord) => boolean, tr: string) => {
  let done = false;
  return (t: number, rec: RunRecord) => (!done && fn(t, rec) ? ((done = true), tr) : null);
};
const alarmAt = (rec: RunRecord) => rec.data.rows.find((r) => r.ev?.startsWith('alarm:apnoea'))?.t;
/** The verdict of the objective whose rule starts at the apnoea alarm (its place in the list is the card's business). */
const apnoeaObjective = (rec: RunRecord) => {
  const i = (rec.data.doc?.objectives ?? []).findIndex((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin' && o.rule.after === 'alarm:apnoea');
  return objectives(rec.data)[i]?.verdict;
};

describe('Stage 13: the showcase objectives as rules', () => {
  it('every rule in the library names a state, drug, alarm or condition that exists', () => {
    let n = 0;
    for (const c of LIBRARY) {
      for (const o of c.doc.objectives ?? []) {
        if (typeof o === 'string' || !o.rule) continue;
        const evs = [('event' in o.rule ? o.rule.event : []), ('after' in o.rule ? o.rule.after : [])].flat().filter((x): x is string => !!x);
        for (const ev of evs) expect(known(ev, c.doc), `${c.id}: "${o.text}" names ${ev}`).toBe(true);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(7);
  });

  it('Q5: the draft numbers of the cards Stage 13 owns are marked for the owner in the card text', () => {
    for (const id of ['showcase-anaphylaxis', 'showcase-haemorrhage']) {
      const timed = (LIBRARY.find((c) => c.id === id)?.doc.objectives ?? []).filter((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin');
      expect(timed.length, id).toBeGreaterThan(0);
      for (const o of timed) expect(typeof o === 'string' ? o : o.text).toMatch(/ \(debrief: .+ — draft, owner to confirm\)$/);
    }
  });

  it('anaphylaxis: epinephrine a minute into the reaction is met, no fluid is not met, recognition is the instructor’s', async () => {
    const rec = await hostRun(anaphylaxis, 200, once((t) => t >= 120, 'giveEpi'));
    expect(objectives(rec.data).map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
    expect(objectives(rec.data)[1]?.verdict.why).toMatch(/^Epinephrine 1 min 00 s after the state "Anaphylaxis" \(01:00 → 02:00/);
    expect(facts(rec.data)).toContainEqual({ label: 'Epinephrine, boluses in all', value: '100 µg (1 dose)' });
  }, 120_000);

  it('induction: ventilated 40 s after the apnoea alarm is met; never ventilated is not met', async () => {
    const press = (t: number, rec: RunRecord) => (t >= 10 && !rec.data.rows.some((r) => r.ev === 'state:induced') ? 'induce' : null);
    const intubate = once((t, r) => alarmAt(r) !== undefined && t >= (alarmAt(r) as number) + 40, 'intubate');
    const treated = await hostRun(induction, 150, (t, rec) => press(t, rec) ?? intubate(t, rec));
    expect(apnoeaObjective(treated)?.status).toBe('met');
    expect(facts(treated.data).find((f) => f.label === 'Apnoea alarm to ventilated breaths')?.value).toMatch(/^4\d s \(/);
    const untreated = await hostRun(induction, 170, press);
    expect(apnoeaObjective(untreated)?.status).toBe('not met');
  }, 120_000);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/debrief-showcase.test.ts`
Expected: FAIL (4) — the lint finds no rules (`expected 0 to be greater than or equal to 7`), no draft is marked
(`showcase-anaphylaxis: expected 0 to be greater than 0`), and the anaphylaxis and induction statuses are "not
assessable".

- [ ] **Step 3: Add the rules**

In `apps/demo/src/app/showcase/showcase-anaphylaxis.json`, find:

```json
    "Give epinephrine 50–100 µg IV early and repeat as needed",
    "Give fluid for the capillary leak"
```

Replace with:

```json
    { "text": "Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "state:anaphylaxis", "event": "drug:epinephrine", "withinS": 120 } },
    { "text": "Give fluid for the capillary leak", "rule": { "kind": "occurred", "event": "fluid" } }
```

In `apps/demo/src/app/showcase/showcase-bronchospasm.json`, find:

```json
    "Treat with a bronchodilator",
```

Replace with:

```json
    { "text": "Treat with a bronchodilator", "rule": { "kind": "occurred", "event": "drug:salbutamol" } },
```

In `apps/demo/src/app/showcase/showcase-haemorrhage.json`, find:

```json
    "Start high-quality CPR without delay",
    "Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram"
```

Replace with:

```json
    { "text": "Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "cpr", "withinS": 30 } },
    { "text": "Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "rosc", "withinS": 360 } }
```

In `apps/demo/src/app/showcase/showcase-induction.json`, find:

```json
    "Recognise apnoea and falling SpO₂ before intubation",
```

Replace with:

```json
    { "text": "Recognise apnoea and falling SpO₂ before intubation (debrief: ventilated within 90 s of the apnoea alarm — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "alarm:apnoea", "event": "ventilation", "withinS": 90 } },
```

In `apps/demo/src/app/showcase/showcase-tamponade.json`, find:

```json
    "Treat PEA from tamponade: CPR and pericardial drainage"
```

Replace with:

```json
    { "text": "Treat PEA from tamponade: CPR and pericardial drainage (debrief: drained within 5 min of the pulse loss — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "state:drained", "withinS": 300 } }
```

- [ ] **Step 4: Run it to see it pass; the cards still validate**

Run: `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/debrief-showcase.test.ts src/app/showcase.test.ts src/app/copy.test.ts`
Expected: 4 + the showcase and copy tests pass (the two engine cases ≈ 10–15 s in all).

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/src/app/showcase/*.json apps/demo/src/app/debrief-showcase.test.ts
git commit -m "feat(13): rules on the showcase objectives (draft numbers for the owner's review), checked on the engine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 4: The Debrief view — the report, its charts and its print layout

**Files:**
- Create: `apps/demo/src/app/views/debrief.ts`, `apps/demo/src/app/views/debrief.css`,
  `apps/demo/e2e/stage13-debrief.e2e.ts`, `apps/demo/e2e/pdf-text.ts`
- Modify: `apps/demo/src/app/router.ts` (the route), `apps/demo/src/app/main.ts` (the registration line),
  `apps/demo/src/app/sessionbar.ts` (the link, marked at the end of the run), `apps/demo/vite.config.ts` (the build id,
  D-12)

**Interfaces:**
- Consumes: `AppSession.record` (Task 1), `objectives`, `facts`, `drugTotals`, `trendMeta`, `endOf`, `perMinute`,
  `debriefJson`, `mmss`, `span` (Task 2), `TREND_KEYS`, `LAB_KEYS` (Task 1), `cardOf` (scenarios.ts), `download` (ui.ts),
  `Link.onChange` and `link.ctl.scenario` (existing).
- Produces: `debriefView(session: AppSession, link: Link): View` (route `debrief`, `#/debrief`); DOM hooks the e2e
  uses: `[data-view=debrief]`, `#db-objectives li[data-status]`, `#db-facts dt/dd`, `#db-timeline tbody tr[data-kind]`
  (`.undone`), `.db-chart[data-trend] svg`, `#db-minutes`, the button "Download the record (JSON)", `.db-runfoot`,
  `.db-foot`, `style#db-page-style` (in `<head>` while the view is open), the session bar's `.sb-debrief[data-ready]`;
  `pdfText(pdf: Buffer): { text; pages }`, `pdfInfo(pdf): { title; boxes }` and `squash(s)` (e2e support).

- [ ] **Step 1: Write the failing test** (the e2e and its PDF reader)

Create `apps/demo/e2e/pdf-text.ts`:

```ts
// Stage 13 e2e support (not a test file): the text of a PDF that Chromium's `page.pdf()` wrote, with node:zlib only — no
// PDF library (the debrief adds no dependency). It inflates the streams, reads each font's ToUnicode map (bfchar and
// bfrange, the code length from its codespace) and decodes the hex strings of every page's content in order, one line
// per text object. Enough for Skia's output (Type3 or CID fonts, hex strings); not a general PDF parser.
import { inflateSync } from 'node:zlib';

type Obj = { dict: string; stream: Buffer | null };

function objects(pdf: Buffer): Map<number, Obj> {
  const out = new Map<number, Obj>();
  const s = pdf.toString('latin1');
  const re = /(\d+) 0 obj\s*([\s\S]*?)endobj/g;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const body = m[2] ?? '';
    const at = body.indexOf('stream');
    if (at < 0) {
      out.set(Number(m[1]), { dict: body, stream: null });
      continue;
    }
    const dict = body.slice(0, at);
    let start = at + 'stream'.length;
    if (body[start] === '\r') start++;
    if (body[start] === '\n') start++;
    const len = Number(/\/Length (\d+)/.exec(dict)?.[1] ?? 0);
    const raw = Buffer.from(body.slice(start, start + len), 'latin1');
    out.set(Number(m[1]), { dict, stream: dict.includes('/FlateDecode') ? inflateSync(raw) : raw });
  }
  return out;
}

const utf16 = (hex: string): string => {
  let r = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) r += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return r;
};

function cmap(text: string): { bytes: number; map: Map<number, string> } {
  const map = new Map<number, string>();
  const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(text);
  const bytes = cs ? (cs[1] as string).length / 2 : 2;
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) map.set(parseInt(p[1] as string, 16), utf16(p[2] as string));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const p of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g)) {
      const lo = parseInt(p[1] as string, 16);
      const hi = parseInt(p[2] as string, 16);
      const dst = p[3] as string;
      if (dst.startsWith('[')) [...dst.matchAll(/<([0-9A-Fa-f]+)>/g)].forEach((d, i) => map.set(lo + i, utf16(d[1] as string)));
      else {
        const base = parseInt(dst.slice(1, -1), 16);
        for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(base + c - lo));
      }
    }
  }
  return { bytes, map };
}

/** The text of every page, in order; pages separated by a form feed. */
export function pdfText(pdf: Buffer): { text: string; pages: number } {
  const objs = objects(pdf);
  const ref = (d: string, key: string): number[] => {
    const m = new RegExp(`/${key}\\s*(\\[[^\\]]*\\]|\\d+ 0 R)`).exec(d);
    return m ? [...(m[1] as string).matchAll(/(\d+) 0 R/g)].map((x) => Number(x[1])) : [];
  };
  const fonts = new Map<number, ReturnType<typeof cmap>>();
  const fontOf = (n: number) => {
    if (!fonts.has(n)) {
      const tu = ref(objs.get(n)?.dict ?? '', 'ToUnicode')[0];
      fonts.set(n, cmap(tu !== undefined ? (objs.get(tu)?.stream?.toString('latin1') ?? '') : ''));
    }
    return fonts.get(n) as ReturnType<typeof cmap>;
  };
  const pagesObj = [...objs.values()].find((o) => /\/Type\s*\/Pages\b/.test(o.dict));
  const order = pagesObj ? ref(pagesObj.dict, 'Kids') : [];
  const out: string[] = [];
  for (const p of order) {
    const page = objs.get(p);
    if (!page) continue;
    let res = page.dict;
    const resRef = /\/Resources\s+(\d+) 0 R/.exec(res);
    if (resRef) res = objs.get(Number(resRef[1]))?.dict ?? '';
    const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(res)?.[1] ?? '';
    const names = new Map([...fontDict.matchAll(/\/(\S+?)\s+(\d+) 0 R/g)].map((m) => [m[1] as string, Number(m[2])]));
    const content = ref(page.dict, 'Contents').map((n) => objs.get(n)?.stream?.toString('latin1') ?? '').join('\n');
    let font: ReturnType<typeof cmap> | null = null;
    let line = '';
    const lines: string[] = [];
    for (const tok of content.matchAll(/\/(\S+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>|\bET\b/g)) {
      if (tok[1] !== undefined) font = names.has(tok[1]) ? fontOf(names.get(tok[1]) as number) : null;
      else if (tok[2] !== undefined && font) {
        const hex = tok[2];
        const step = font.bytes * 2;
        for (let i = 0; i + step <= hex.length; i += step) line += font.map.get(parseInt(hex.slice(i, i + step), 16)) ?? '';
      } else if (tok[0] === 'ET') {
        if (line) lines.push(line);
        line = '';
      }
    }
    out.push(lines.join('\n'));
  }
  return { text: out.join('\f'), pages: order.length };
}

/**
 * What a PDF says about itself without reading any font (R50 I-2: the same on every platform, the Linux CI runner
 * included): the document title of the Info dictionary (a literal or a UTF-16 hex string) and each page's MediaBox in
 * points.
 */
export function pdfInfo(pdf: Buffer): { title: string | null; boxes: number[][] } {
  const s = pdf.toString('latin1');
  const t = /\/Title\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]*>)/.exec(s)?.[1];
  const title = !t ? null : t.startsWith('(') ? t.slice(1, -1).replace(/\\(.)/g, '$1') : utf16(t.slice(5, -1)); // <FEFF…>: skip the mark
  const boxes = [...s.matchAll(/\/MediaBox\s*\[([^\]]*)\]/g)].map((m) => (m[1] as string).trim().split(/\s+/).map(Number));
  return { title, boxes };
}

/** Text without whitespace, to compare a row however the PDF spaced it. */
export const squash = (s: string): string => s.replace(/\s+/g, '');
```

Create `apps/demo/e2e/stage13-debrief.e2e.ts`:

```ts
// Stage 13: a showcase run to its end, then the Debrief — the anaphylaxis card at ×4 with a bookmark and a return to it
// (the first reaction is undone, the retry is judged), treated with the card's own button. The report's timeline,
// facts (labs included), objectives, the minute appendix and the JSON download are checked on both engines, with the
// R56 engine-id scan and the print layout (print media: only the report, A4 page breaks, charts kept whole, the undone
// course struck through, the footer and the build on every page); Chromium also prints it with page.pdf(): its page
// count, A4 pages and title on every platform, its text — every page's footer and build included — on macOS (R50 I-2:
// the Linux runner's fonts may lack a glyph's ToUnicode entry; PME_PDF_TEXT=1 reads it anywhere).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { pdfInfo, pdfText, squash } from './pdf-text.ts';
import { openApp, scanEngineIds, startVite } from './stage9-support.ts';

const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-13' : '../../../test-results/gate-shots/stage-13'); // FU-11 K1: evidence only on request
let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number }; engineIds: string[] } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);

test('a showcase run ends in a debrief that prints (timeline, facts, objectives)', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-anaphylaxis', { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.click('[role=tab][data-tab=scenario]');
  await page.locator('.sessionbar').getByRole('button', { name: 'Bookmark' }).click();
  await expect.poll(() => simT(page), { timeout: 40_000 }).toBeGreaterThan(70); // the reaction starts at 60 s
  await page.getByRole('button', { name: 'Return here' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  await expect.poll(() => simT(page), { timeout: 5_000 }).toBeLessThan(20);
  const give = page.getByRole('button', { name: 'Give epinephrine 100 µg' });
  await expect(give).toBeHidden(); // the panel repaints at ≤ 2 Hz: the first reaction's button goes first
  await expect(give).toBeVisible({ timeout: 40_000 }); // the reaction again, 60 s after the bookmark's state began
  await give.click();

  // the end of the run: the session bar's Debrief is marked and a toast says so
  const open = page.locator('.sessionbar').getByRole('link', { name: 'Debrief' });
  await expect(open).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  await expect(page.locator('.toast', { hasText: 'the debrief is ready' })).toBeVisible();
  await page.waitForTimeout(6000); // ≈ 24 s of sim after the epinephrine: its effect reaches the trends
  await open.click();
  const view = page.locator('[data-view=debrief]');
  await expect(view.getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible();

  const timeline = await view.locator('#db-timeline tbody tr').allInnerTexts();
  const rows = timeline.map((r) => r.replace(/\s+/g, ' ').trim());
  const has = (re: RegExp) => rows.filter((r) => re.test(r));
  expect(has(/^\d\d:\d\d Scenario Scenario loaded: Anaphylaxis under anaesthesia$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Bookmark Bookmark: Bookmark \d+ at \d\d:\d\d$/)).toHaveLength(1);
  expect(has(/^01:00 Scenario Scenario state: Anaphylaxis — undone by return 1$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Return Returned to bookmark Bookmark \d+ at \d\d:\d\d$/)).toHaveLength(1);
  expect(has(/^01:00 Scenario Scenario state: Anaphylaxis$/)).toHaveLength(1); // the retry
  expect(has(/^\d\d:\d\d Scenario Epinephrine 100 µg IV$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Scenario Scenario state: Epinephrine given$/)).toHaveLength(1);
  expect(has(/ — undone by return 1$/).length).toBeGreaterThanOrEqual(2);
  expect(has(/^00:00 Patient Ventilated breaths began$/)).toHaveLength(1); // the restored engine's breath under way is no second start
  const strike = await view.locator('#db-timeline tbody tr.undone td').first().evaluate((td) => getComputedStyle(td).textDecorationLine);
  expect(strike).toBe('line-through'); // Q6: the undone course struck through, its words kept

  const facts = Object.fromEntries((await view.locator('#db-facts dt').allInnerTexts()).map((k, i) => [k, i]));
  const values = await view.locator('#db-facts dd').allInnerTexts();
  expect(values[facts['Epinephrine, boluses in all'] as number]).toBe('100 µg (1 dose)');
  expect(values[facts['Lowest ART M / NIBP M'] as number]).toMatch(/^\d+ mmHg at \d\d:\d\d$/);
  expect(values[facts['Labs (the model): last (lowest–highest)'] as number]).toMatch(/^K⁺ \d\.\d mmol\/L \(\d\.\d–\d\.\d\) · Lactate \d+\.\d mmol\/L .* · pH \d\.\d\d \(.* · Glucose .* · Tcore \d+\.\d °C/); // Q7
  const objectives = await view.locator('#db-objectives li').evaluateAll((li) => li.map((x) => [x.getAttribute('data-status'), x.querySelector('.db-mark')?.textContent]));
  expect(objectives).toEqual([['not assessable', '– Not assessable'], ['met', '✓ Met'], ['not met', '✗ Not met']]);
  await expect(view.locator('#db-objectives li').nth(1)).toContainText(/Epinephrine \d+ s after the state "Anaphylaxis" \(01:00 → 01:\d\d; within 2 min 00 s asked\)/);
  await expect(view.locator('.db-chart svg')).toHaveCount(6);
  const minuteRows = await view.locator('#db-minutes tbody tr').allInnerTexts(); // Q1: one row per minute
  expect(minuteRows.length).toBeGreaterThanOrEqual(2); // the kept course is ≈ 1½–2 sim-min
  expect(minuteRows[0]).toMatch(/^00:00\s+\d+/);
  await expect(view.locator('#db-minutes thead th')).toHaveCount(12);
  // R56: no engine id in the report (as stage9-glossary: an id that is also an English word, "epinephrine", is not a leak)
  const ids = (await page.evaluate(() => (window as unknown as W).__pmeApp.engineIds)).filter((id) => /[A-Z0-9]/.test(id));
  expect(await scanEngineIds(page, ids)).toEqual([]);

  await view.getByRole('textbox', { name: 'Run by' }).fill('Dr Instructor, two residents');
  await view.getByRole('textbox', { name: 'Notes' }).fill('Good closed-loop communication.');

  // Q3: the record as JSON — the same verdicts as the report; never the "Run by" line or the notes (Q2)
  const [dl] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^debrief-showcase-anaphylaxis-\d{4}-\d\d-\d\d\.json$/);
  const json = readFileSync(await dl.path(), 'utf8');
  const j = JSON.parse(json) as { schema: string; build: string; record: { rows: unknown[] }; objectives: Array<{ verdict: { status: string } }> };
  expect(j.schema).toBe('pme-debrief/1');
  expect(j.objectives.map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
  expect(j.record.rows.length).toBeGreaterThanOrEqual(rows.length); // the run goes on while the view is open
  expect(json).not.toContain('Dr Instructor');
  expect(json).not.toContain('closed-loop');
  const build = j.build;
  await expect(view.locator('.db-foot')).toHaveText(`For education only. Not a medical device: never use it for patient care. Build ${build}.`);

  // print layout, both engines: only the report; trends and timeline on new pages; a chart never split
  await page.emulateMedia({ media: 'print' });
  const layout = await page.evaluate(() => {
    const vis = (s: string) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; };
    const css = (s: string, p: string) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue(p);
    return {
      topbar: vis('.topbar'), stage: vis('.stage'), bar: vis('.sessionbar'), tools: vis('.db-tools'), report: vis('.debrief'),
      trends: css('#db-trends', 'break-before'), timeline: css('#db-timeline', 'break-before'), minutes: css('#db-minutes', 'break-before'),
      chart: css('.db-chart', 'break-inside'), ink: css('.db-svg path', 'stroke'), body: css('body', 'overflow'),
      undone: css('#db-timeline tbody tr.undone td', 'text-decoration-line'),
      // the footer on every page: @page margin boxes where the browser has them (Chromium), else a line before each break
      marginBoxes: [...(document.getElementById('db-page-style') as HTMLStyleElement).sheet?.cssRules ?? []].some((r) => ((r as CSSPageRule).cssRules?.length ?? 0) === 2),
      runFeet: [...document.querySelectorAll('.debrief .db-runfoot')].filter((e) => getComputedStyle(e).display !== 'none').length,
    };
  });
  const boxes = browserName === 'chromium';
  expect(layout).toEqual({ topbar: false, stage: false, bar: false, tools: false, report: true, trends: 'page', timeline: 'page', minutes: 'page', chart: 'avoid', ink: 'rgb(0, 0, 0)', body: 'visible', undone: 'line-through', marginBoxes: boxes, runFeet: boxes ? 0 : 4 });
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/debrief-print-${browserName}.png`, fullPage: true });

  if (browserName === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief.pdf`, pdf);
    const info = pdfInfo(pdf); // every platform: no font read
    expect(info.title).toMatch(/^Debrief Anaphylaxis under anaesthesia \d{4}-\d\d-\d\d$/);
    expect(info.boxes.length).toBeGreaterThanOrEqual(5); // header, trends, timeline, appendix: at least five A4 pages
    for (const b of info.boxes) expect([Math.round(b[2] ?? 0), Math.round(b[3] ?? 0)]).toEqual([595, 842]);
    if (process.platform === 'darwin' || process.env.PME_PDF_TEXT === '1') {
      const { text, pages } = pdfText(pdf);
      expect(pages).toBe(info.boxes.length);
      const t = squash(text);
      for (const want of ['Debrief', 'Anaphylaxis under anaesthesia', 'Run by', 'Dr Instructor, two residents', 'Scenario state: Anaphylaxis — undone by return 1',
        'Epinephrine 100 µg IV', '✓ Met', '✗ Not met', '– Not assessable', 'Epinephrine, boluses in all', '100 µg (1 dose)', 'Good closed-loop communication.',
        'Appendix: one row per minute']) expect(t, want).toContain(squash(want));
      expect(text.split('\f')[0], 'objectives and facts on page 1').toContain('Measured facts');
      text.split('\f').forEach((p, i) => {
        expect(squash(p), `page ${i + 1}: the footer and the build`).toContain(squash(`For education only. Not a medical device: never use it for patient care. Build ${build}.`));
        expect(squash(p), `page ${i + 1}: its number`).toContain(squash(`Page ${i + 1} of ${pages}`));
      });
    } else test.info().annotations.push({ type: 'pdf text', description: 'not read on this platform (R50 I-2): page count, A4 and title only' });
  }
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test stage13-debrief --retries=0 --project=chromium`
Expected: FAIL — no link named "Debrief" in the session bar (`toHaveAttribute` times out).

- [ ] **Step 3: Implement**

In `apps/demo/src/app/main.ts`, find:

```ts
import { devView } from './views/dev.ts';
```

Replace with:

```ts
import { debriefView } from './views/debrief.ts';
import { devView } from './views/dev.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
  mountSessionBar(shell.bar, link);
```

Replace with:

```ts
  shell.add(debriefView(session, link)); // Stage 13
  mountSessionBar(shell.bar, link);
```

In `apps/demo/src/app/router.ts`, find:

```ts
export const ROUTES = ['start', 'monitor', 'teach', 'remote', 'explore', 'vent', 'validate', 'dev', 'settings'] as const;
```

Replace with:

```ts
export const ROUTES = ['start', 'monitor', 'teach', 'remote', 'explore', 'vent', 'validate', 'dev', 'settings', 'debrief'] as const;
```

In `apps/demo/src/app/router.ts`, find:

```ts
export const HOST_ROUTES: ReadonlySet<RouteId> = new Set(['monitor', 'teach', 'explore', 'vent', 'start']);
```

Replace with:

```ts
export const HOST_ROUTES: ReadonlySet<RouteId> = new Set(['monitor', 'teach', 'explore', 'vent', 'start', 'debrief']);
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
import { cardOf } from './scenarios.ts';
```

Replace with:

```ts
import { hrefOf } from './router.ts';
import { cardOf } from './scenarios.ts';
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
  const draw = throttle(() => {
```

Replace with:

```ts
  const debrief = h('a', { class: 'btn small ghost sb-debrief', href: hrefOf('debrief') }, 'Debrief'); // Stage 13: the report, at any time
  mark.after(debrief);
  const draw = throttle(() => {
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
    setText(t, clock(link.simT));
```

Replace with:

```ts
    debrief.dataset.ready = String(!!sv.doc && !sv.current()?.transitions?.length); // the scenario has ended
    setText(t, clock(link.simT));
```

Create `apps/demo/src/app/views/debrief.css`:

```css
/* Stage 13: the Debrief view on screen (the bench palette) and in print. Print: A4 portrait, only the report (the top
   bar, session bar, monitor and toasts hidden), black on white, every status and mark in words as well as shape — no
   meaning carried by colour; the objectives, facts and each chart never split across pages; trends, the timeline and
   the minute appendix start on a new page; the tables' headers repeat on each page; the undone course struck through
   (with its words). The footer and the build on every page: @page margin boxes (the view's <style>, Chromium); where
   the browser has none (WebKit: .db-nomargin), a footer line before each forced page break. The @page size and margins
   apply to printing any route of the app (R50 M-9). */
.debrief .db-tools { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; margin: var(--s-3) 0; }
.debrief .db-who { max-width: 32rem; }
.debrief .db-meta, .debrief .db-facts { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-1) var(--s-4); margin: var(--s-3) 0; }
.debrief dt { color: var(--text-muted); }
.debrief dd { margin: 0; }
.debrief .db-sec { margin-top: var(--s-5); }
.debrief h2 { font-size: var(--t-18); border-bottom: 1px solid var(--line-strong); padding-bottom: var(--s-1); }
.debrief .db-obj { padding-left: 1.4em; }
.debrief .db-obj li { margin-bottom: var(--s-2); }
.debrief .db-mark { display: inline-block; min-width: 9.5em; }
.debrief .db-obj li[data-status='not met'] .db-mark { text-decoration: underline; }
.debrief .db-why { color: var(--text-muted); font-size: var(--t-13); }
.debrief .db-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--s-3) var(--s-4); }
.debrief .db-chart { margin: 0; }
.debrief .db-chart figcaption { font-weight: 600; }
.debrief .db-svg svg { display: block; width: 100%; height: 130px; }
.debrief .db-svg path { fill: none; stroke: var(--text-strong); stroke-width: 1.6; vector-effect: non-scaling-stroke; }
.debrief .db-svg .axis, .debrief .db-svg .ticks line { stroke: var(--text-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.debrief .db-svg .grid { stroke: var(--line); stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
.debrief .db-svg .ret { stroke: var(--text-strong); stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
.debrief .db-svg text { font-size: 11px; fill: var(--text-muted); }
.debrief .db-table { border-collapse: collapse; width: 100%; font-size: var(--t-13); }
.debrief .db-table th, .debrief .db-table td { text-align: left; padding: 3px 8px 3px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.debrief .db-table td.num { white-space: nowrap; width: 4.5em; }
.debrief .db-table tr.undone td, .debrief li.undone { color: var(--text-muted); font-style: italic; text-decoration: line-through; }
.debrief .db-scroll { overflow-x: auto; }
.debrief .db-minutes th .unit { display: block; font-weight: 400; color: var(--text-muted); }
.debrief .db-runfoot:not(.db-foot) { display: none; }
.debrief .db-notes { min-height: 6em; border: 1px solid var(--line-strong); border-radius: var(--r-control); padding: var(--s-2); white-space: pre-wrap; }
.debrief .db-foot { margin: var(--s-6) 0 var(--s-4); font-size: var(--t-13); color: var(--text-muted); border-top: 1px solid var(--line); padding-top: var(--s-2); }
.sessionbar .sb-debrief[data-ready='true'] { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }

@page { size: A4 portrait; margin: 14mm 14mm 16mm; }
@media print {
  html:has(.app[data-route='debrief']), body:has(.app[data-route='debrief']) { height: auto; overflow: visible; background: #fff; }
  .app[data-route='debrief'] { display: block; height: auto; }
  .app[data-route='debrief'] > .topbar, .app[data-route='debrief'] .sessionbar, .app[data-route='debrief'] .stage,
  .app[data-route='debrief'] .skip, body:has(.app[data-route='debrief']) .toasts, .debrief .db-tools { display: none !important; }
  .app[data-route='debrief'] .main, .app[data-route='debrief'] .view[data-view='debrief'] { display: block; overflow: visible; height: auto; }
  .debrief, .debrief * { color: #000 !important; background: #fff !important; box-shadow: none !important; }
  .debrief .page { max-width: none; padding: 0; margin: 0; }
  .debrief { font-size: 10.5pt; }
  .debrief h1 { font-size: 18pt; margin: 0 0 4mm; }
  .debrief h2 { font-size: 13pt; break-after: avoid; }
  .debrief .db-sec { margin-top: 6mm; }
  .debrief #db-trends, .debrief #db-timeline, .debrief #db-minutes { break-before: page; }
  .debrief .db-scroll { overflow: visible; }
  .debrief .db-minutes { font-size: 8.5pt; }
  .debrief #db-objectives, .debrief #db-facts, .debrief #db-bookmarks, .debrief #db-notes, .debrief .db-chart, .debrief .db-obj li { break-inside: avoid; }
  .debrief .db-charts { display: block; }
  .debrief .db-chart { margin-bottom: 4mm; }
  .debrief .db-svg svg { height: 34mm; }
  .debrief .db-svg path, .debrief .db-svg .ret { stroke: #000; }
  .debrief .db-svg .axis, .debrief .db-svg .ticks line, .debrief .db-svg .grid { stroke: #555; }
  .debrief .db-svg text { fill: #000; }
  .debrief .db-table thead { display: table-header-group; }
  .debrief .db-table tr { break-inside: avoid; }
  .debrief .db-table th, .debrief .db-table td, .debrief h2 { border-color: #000 !important; }
  .debrief .db-table tr.undone td, .debrief li.undone { color: #444 !important; text-decoration: line-through; }
  .debrief .db-runfoot { display: none !important; }
  .debrief.db-nomargin .db-runfoot { display: block !important; font-size: 7pt; border-top: 0.5pt solid #000; padding-top: 1mm; margin: 4mm 0 0; }
  .debrief .input { border: 0; border-bottom: 1px solid #000; padding: 0; }
  .debrief .db-notes { border: 1px solid #000; min-height: 30mm; }
  .debrief .db-foot { border-top: 1px solid #000; }
}
```

Create `apps/demo/src/app/views/debrief.ts`:

```ts
// Debrief (Stage 13): the report of the run, read from the session's run record — the case, the objectives judged by
// their rules, the measured facts, trend charts drawn as inline SVG, drugs and fluids, the timeline (the discarded
// course of a return to a bookmark included, struck through as undone), bookmarks, the instructor's notes and a
// one-row-per-minute appendix. The browser PRINTS it to PDF (debrief.css: A4 portrait, the app's chrome hidden, no
// colour needed to read it; the footer and the build on every page); no PDF library. "Download the record (JSON)" saves
// the same data. Opened from the session bar; when a scenario reaches a state with no way out, a toast says the debrief
// is ready.
import './debrief.css';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { debriefJson, drugTotals, endOf, facts, mmss, objectives, perMinute, span, trendMeta, type Status } from '../debrief.ts';
import { LAB_KEYS, TREND_KEYS, type Row, type RunData, type TrendKey } from '../record.ts';
import { cardOf } from '../scenarios.ts';
import type { AppSession } from '../session.ts';
import type { View } from '../shell.ts';
import { button, download, h, toast } from '../ui.ts';

/** The build this page was served from (vite.config.ts `define`: the git commit, "+" with uncommitted changes, the date). */
declare const __PME_BUILD__: string;
const BUILD = typeof __PME_BUILD__ === 'string' ? __PME_BUILD__ : 'development';
const FOOT = `For education only. Not a medical device: never use it for patient care. Build ${BUILD}.`;

const KIND: Readonly<Record<Row['kind'], string>> = { action: 'Action', remote: 'Remote', scenario: 'Scenario', alarm: 'Alarm', bookmark: 'Bookmark', restore: 'Return', patient: 'Patient', note: 'Note' };
const MARK: Readonly<Record<Status, string>> = { met: '✓ Met', 'not met': '✗ Not met', 'not assessable': '– Not assessable' };
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const undoneText = (r: Row): string => (r.undone ? ` — undone by return ${r.undone}` : '');

/** One trend as inline SVG over the kept course: a black line with gaps where nothing was measured, the first and
 *  last value of the axis, minutes on the time axis, a dashed line at each return to a bookmark. */
function chart(d: RunData, k: TrendKey, end: number): HTMLElement {
  const m = trendMeta(k);
  const fig = h('figure', { class: 'db-chart', 'data-trend': k }, h('figcaption', {}, m.label, m.unit ? h('span', { class: 'unit' }, m.unit) : null));
  const pts = d.samples.filter((s) => s[k] !== null);
  if (!pts.length) return fig.appendChild(h('p', { class: 'muted' }, 'Not measured during the run.')), fig;
  const vals = pts.map((s) => s[k] as number);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 2) (lo -= 1), (hi += 1);
  const W = 640, H = 130, L = 44, R = 10, T = 8, B = 20;
  const x = (t: number) => L + (t / Math.max(end, 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let path = '';
  let prev: number | null = null;
  for (const s of d.samples) {
    const v = s[k];
    if (v === null) {
      prev = null;
      continue;
    }
    path += `${prev === null || s.t - prev > 5 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(v).toFixed(1)}`;
    prev = s.t;
  }
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line x1="${x(t)}" x2="${x(t)}" y1="${H - B}" y2="${H - B + 4}"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${mmss(t)}</text>`;
  const returns = d.rows.filter((r) => r.kind === 'restore' && r.undone === undefined)
    .map((r) => `<line class="ret" x1="${x(r.t)}" x2="${x(r.t)}" y1="${T}" y2="${H - B}"/><text x="${x(r.t) + 3}" y="${T + 9}">↺</text>`).join('');
  const f = (v: number) => v.toFixed(m.digits);
  const min = pts.reduce((b, s) => ((s[k] as number) < (b[k] as number) ? s : b));
  const max = pts.reduce((b, s) => ((s[k] as number) > (b[k] as number) ? s : b));
  const label = `${m.label}, ${mmss(0)} to ${mmss(end)}: lowest ${f(min[k] as number)} at ${mmss(min.t)}, highest ${f(max[k] as number)} at ${mmss(max.t)} ${m.unit}`;
  const svg = h('div', { class: 'db-svg' });
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="none">
<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>
<line class="grid" x1="${L}" x2="${W - R}" y1="${T}" y2="${T}"/>
<text x="${L - 4}" y="${T + 4}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${H - B}" text-anchor="end">${f(lo)}</text>
<g class="ticks">${ticks}</g>${returns}<path d="${path}"/></svg>`;
  fig.append(svg);
  return fig;
}

const section = (id: string, title: string, ...kids: Array<Node | null>): HTMLElement =>
  h('section', { class: 'db-sec', id: `db-${id}`, 'aria-labelledby': `db-${id}-h` }, h('h2', { id: `db-${id}-h` }, title), ...kids);
/** The footer line printed before each forced page break where the browser has no @page margin boxes (WebKit). */
const runFoot = (): HTMLElement => h('p', { class: 'db-runfoot', 'aria-hidden': 'true' }, FOOT);
/** The page footer where the browser prints @page margin boxes (Chromium): the footer and the build left, page n of N
 *  right, on every page. A <style> because the build is known only at run time. */
const PAGE_CSS = `@page { @bottom-left { content: "${FOOT}"; font: 7pt sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
@bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; } }`;

/** Q1: the appendix table — the six trends and the five labs, the first sample of each minute. */
function minutes(d: RunData): HTMLElement {
  const keys = [...TREND_KEYS, ...LAB_KEYS];
  const head = keys.map((k) => {
    const m = trendMeta(k);
    return h('th', { scope: 'col' }, m.label, m.unit ? h('span', { class: 'unit' }, m.unit) : null);
  });
  return h('div', { class: 'db-scroll' }, h('table', { class: 'db-table db-minutes' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), ...head)),
    h('tbody', {}, ...perMinute(d).map((r) => h('tr', {}, h('td', { class: 'num' }, mmss(r.t)),
      ...keys.map((k) => h('td', { class: 'num' }, r.values[k] === null ? '–' : (r.values[k] as number).toFixed(trendMeta(k).digits))))))));
}

export function debriefView(session: AppSession, link: Link): View {
  const who = h('input', { class: 'input', id: 'db-who', autocomplete: 'off', placeholder: 'Instructor and learners' });
  const notes = h('div', { class: 'db-notes', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'db-notes-h' });
  const body = h('div', { class: 'db-body' });
  const tail = h('div', { class: 'db-tail' });
  let started = -1;
  const render = () => {
    const d = session.record.data;
    if (d.startedAt !== started) {
      // a new run: its notes start empty (the record of the last run is gone with it)
      started = d.startedAt;
      notes.replaceChildren();
    }
    const end = endOf(d);
    const card = d.doc ? cardOf(d.doc) : null;
    const wall = Math.max(0, (d.lastWall - d.startedAt) / 1000);
    const meta = h('dl', { class: 'db-meta' },
      h('dt', {}, 'Scenario'), h('dd', {}, card ? card.title : 'No scenario (free run)'),
      h('dt', {}, 'Patient'), h('dd', {}, d.patient),
      h('dt', {}, 'Started'), h('dd', {}, new Date(d.startedAt).toLocaleString()),
      h('dt', {}, 'Duration'), h('dd', {}, `${mmss(end)} simulated · ${span(wall)} on the clock`));
    const obj = objectives(d);
    const fs = facts(d);
    const meds = d.rows.filter((r) => r.ev?.startsWith('drug:') || r.ev === 'fluid');
    const totals = drugTotals(d);
    const marks = d.rows.filter((r) => r.kind === 'bookmark' || r.kind === 'restore');
    body.replaceChildren(
      meta,
      section('objectives', 'Objectives', obj.length
        ? h('ol', { class: 'db-obj' }, ...obj.map((o) => h('li', { 'data-status': o.verdict.status }, h('b', { class: 'db-mark' }, MARK[o.verdict.status]), ' ', o.text, h('div', { class: 'db-why' }, o.verdict.why))))
        : h('p', { class: 'muted' }, 'This run has no objectives.')),
      section('facts', 'Measured facts', fs.length
        ? h('dl', { class: 'db-facts' }, ...fs.flatMap((x) => [h('dt', {}, x.label), h('dd', {}, x.value)]))
        : h('p', { class: 'muted' }, 'Nothing was measured yet.')),
      runFoot(),
      section('trends', 'Trends', h('div', { class: 'db-charts' }, ...TREND_KEYS.map((k) => chart(d, k, end)))),
      section('drugs', 'Drugs and fluids', meds.length
        ? h('table', { class: 'db-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Given'))),
          h('tbody', {}, ...meds.map((r) => h('tr', r.undone ? { class: 'undone' } : {}, h('td', { class: 'num' }, mmss(r.t)), h('td', {}, r.text + undoneText(r))))))
        : h('p', { class: 'muted' }, 'No drugs or fluids were given.'),
        totals.length ? h('ul', { class: 'db-totals' }, ...totals.map((x) => h('li', {}, `${drugName(x.drugId)}: ${x.total} in ${x.n} ${x.n === 1 ? 'bolus' : 'boluses'}`))) : null),
      runFoot(),
      section('timeline', 'Timeline', h('table', { class: 'db-table db-timeline' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Kind'), h('th', { scope: 'col' }, 'Event'))),
        h('tbody', {}, ...d.rows.map((r) => h('tr', { 'data-kind': r.kind, ...(r.undone ? { class: 'undone' } : {}) },
          h('td', { class: 'num' }, mmss(r.t)), h('td', {}, KIND[r.kind]), h('td', {}, r.text + undoneText(r))))))),
      section('bookmarks', 'Bookmarks', marks.length
        ? h('ul', {}, ...marks.map((r) => h('li', r.undone ? { class: 'undone' } : {}, `${mmss(r.t)} ${r.text}${undoneText(r)}`)))
        : h('p', { class: 'muted' }, 'No bookmarks.')),
    );
    tail.replaceChildren(runFoot(), section('minutes', 'Appendix: one row per minute', minutes(d)));
  };

  const el = h('section', { class: 'debrief', 'aria-labelledby': 'db-h' },
    h('div', { class: 'page wide' },
      h('div', { class: 'db-tools' }, button('Print or save as PDF', () => window.print(), 'primary'),
        button('Download the record (JSON)', () => {
          const d = session.record.data;
          download(`debrief-${d.doc?.id ?? 'free-run'}-${new Date(d.startedAt).toISOString().slice(0, 10)}.json`, debriefJson(d, BUILD), 'application/json');
        }, 'ghost'),
        h('span', { class: 'hint' }, 'Choose "Save as PDF" as the printer. The report reads the run so far; it refreshes while open. The JSON holds the record, not the "Run by" line or the notes.')),
      h('h1', { id: 'db-h' }, 'Debrief'),
      h('div', { class: 'field db-who' }, h('label', { for: 'db-who' }, 'Run by'), who),
      body,
      section('notes', 'Notes', notes),
      tail,
      h('footer', { class: 'db-foot db-runfoot' }, FOOT)));
  // WebKit (Safari) prints no @page margin boxes: there the footer lines before each page break stand in (R50 I-4)
  el.classList.toggle('db-nomargin', typeof (window as { CSSMarginRule?: unknown }).CSSMarginRule !== 'function');
  const pageStyle = h('style', { id: 'db-page-style' }, PAGE_CSS);

  // the end of a run: a state with no way out (the toast once per state reached)
  let ended = '';
  link.onChange(() => {
    const sv = link.ctl.scenario;
    const key = `${sv.docVersion}:${sv.stateId}`;
    if (!sv.doc || key === ended || sv.current()?.transitions?.length) return;
    ended = key;
    toast('The scenario has ended: the debrief is ready (Debrief, in the session bar)');
  });

  let iv: ReturnType<typeof setInterval> | null = null;
  return {
    id: 'debrief', el, bench: true,
    enter: () => {
      document.head.append(pageStyle);
      render();
      iv ??= setInterval(render, 5000);
      // the print file's name (Save as PDF): the shell sets the title after enter()
      queueMicrotask(() => (document.title = `Debrief ${session.record.data.doc ? cardOf(session.record.data.doc).title : 'free run'} ${new Date(session.record.data.startedAt).toISOString().slice(0, 10)}`));
    },
    leave: () => {
      pageStyle.remove();
      if (iv) clearInterval(iv);
      iv = null;
    },
  };
}
```

In `apps/demo/vite.config.ts`, find:

```ts
import { defineConfig } from 'vite';
```

Replace with:

```ts
import { spawnSync } from 'node:child_process';
import { defineConfig } from 'vite';
```

In `apps/demo/vite.config.ts`, find:

```ts
});
```

Replace with:

```ts
  define: { __PME_BUILD__: JSON.stringify(buildId()) }, // Stage 13: printed on every page of the debrief
});

/** The build a page was served from: the git commit (+ when the tree has uncommitted changes) and the date; "unknown"
 *  outside a git checkout. */
function buildId(): string {
  const git = (...a: string[]) => spawnSync('git', a, { cwd: import.meta.dirname, encoding: 'utf8' });
  const head = git('rev-parse', '--short=8', 'HEAD');
  if (head.status !== 0) return `unknown ${new Date().toISOString().slice(0, 10)}`;
  const dirty = git('status', '--porcelain', '--untracked-files=no').stdout.trim() ? '+' : '';
  return `${head.stdout.trim()}${dirty} ${new Date().toISOString().slice(0, 10)}`;
}
```

- [ ] **Step 4: Run it to see it pass on both engines; the neighbours; typecheck**

Run: `npx playwright test stage13-debrief --retries=0` then `npx playwright test stage9-a11y stage9-app --retries=0 --project=chromium` and `cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/router.test.ts src/app/shell.dom.test.ts && npx -y pnpm@9.15.9 exec tsc -p tsconfig.json`
Expected: the debrief e2e passes on Chromium and WebKit (≈ 43 s each; on Linux it annotates "pdf text: not read on
this platform"); the Stage 9 accessibility (laptop, iPad
portrait) and app tests pass (the session bar's extra link fits); tsc exit 0. With `PME_SHOTS=1` the e2e writes
`docs/gates/stage-13/debrief-print-{chromium,webkit}.png` and `debrief.pdf` (FU-11 K1: evidence only on request).

- [ ] **Step 5: Look at the print** — open `test-results/gate-shots/stage-13/debrief.pdf`: 5 A4 pages (header,
  objectives and facts on page 1; trends from page 2; the timeline on its own page; the minute appendix last), the
  footer, the build and "Page n of 5" at the foot of every page, no colour needed to read a status or a line. Then in a
  real Safari and Chrome: open a run's Debrief, press "Print or save as PDF", check the preview shows the report alone
  (WebKit's preview differs: the same breaks, its own margins) and where the footer is (Chrome: every page; Safari:
  the end of each section — D-8); record both in the gate note.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/views/debrief.ts apps/demo/src/app/views/debrief.css apps/demo/src/app/router.ts apps/demo/src/app/main.ts apps/demo/src/app/sessionbar.ts apps/demo/vite.config.ts apps/demo/e2e/stage13-debrief.e2e.ts apps/demo/e2e/pdf-text.ts
git commit -m "feat(13): the Debrief view — objectives, facts, SVG trends, drugs, timeline, bookmarks, notes, a minute appendix — printed to A4 PDF by the browser with the footer and build on every page, and as JSON; the session bar's link, marked when the scenario ends" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

## Gate — merge main, full verification, evidence, gate note, pull request

- [ ] **Step 1:** `git fetch origin && git merge origin/main` (no rebase). If main moved since Task 0, check the blocks
  against the NEW main — not the merged tree, where they are already applied (R50): `git -C repo worktree add --detach
  <scratchpad>/stage-13/main-now origin/main`, run Task 0 Step 3's command with `--base-dir <scratchpad>/stage-13/main-now`
  (0 problems in the variant you used; Stage 10, 11 and 12 were checked: see Prototype results), then `git -C repo
  worktree remove <scratchpad>/stage-13/main-now`. A block that no longer applies there means main changed a file under
  this branch: re-run that task's tests on the merged tree and say so in the gate note.
- [ ] **Step 2: Full suites, once:** `npx -y pnpm@9.15.9 -r typecheck`, `CI=1 npx -y pnpm@9.15.9 -r test` (engine-core
  with its usual `PME_TEST_SET`), `npx playwright test --retries=0` (both engines). Expected: all green except what
  Task 0 Step 4 found failing on the base (name it in the gate note with the base's result).
- [ ] **Step 3: Evidence:** `PME_SHOTS=1 npx playwright test stage13-debrief --retries=0` → `docs/gates/stage-13/`
  (two print screenshots, the PDF).
- [ ] **Step 4: The five-case rehearsal** (the presenter's script on a kit built from the branch, both engines): every
  case still runs as before (this stage changes no physiology); after each case open the Debrief and print it once;
  note the page count and anything unreadable.
- [ ] **Step 5: Gate note** `docs/gates/stage-13.md`: what was built, the test counts, the PDF's pages, the Safari and
  Chrome print previews (Task 4 Step 5), the rehearsal, the draft rule numbers for the owner (Q5), the base failures (if
  any).
- [ ] **Step 6: Pull request** (title "Stage 13: the debrief report (print to PDF)"), body: summary, the contract for
  Stage 11, the rulings applied and the draft numbers to confirm, test evidence; ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
  Stop there: the owner merges.

## Mechanical self-check (R50; the executor re-runs Task 0 Step 3)

- `check.py <plan> scratch/wt-stage-13-review stage-13-plan-tools/chain.txt` (blocks applied to the base commit f3eb6f84,
  every task tree and the final tree compared byte for byte, and every file the prototype changed is in the plan):
  28 blocks + 9 creates, 24 files: 0 problems (every task tree and the final tree byte-identical to the
  prototype).
- Appendix B (`--variant b`) against `chain-b.txt` (base 06bd752b = f3eb6f84 + Stage 11's 20 files + Tasks 1–2):
  the plan's variant-b blocks (Tasks 1, 2, Appendix B, 4) applied to f3eb6f84 + Stage 11's files reproduce the
  prototype's Appendix B tree (+ Task 4) byte for byte: 32 blocks + 9 creates, 27 files: 0 problems.
- `--base-dir` on exported trees (each plan's blocks applied in build order on f3eb6f84): FU-11 d alone, + Stage 10: main path 0 problems (variant b fails its Stage 11 finds: by design); + Stage 10 + 11,
  + Stage 10 + 11 + 12: variant b 0 problems (the main path fails Task 3's induction and tamponade finds: by design,
  Task 3 Step 0); f3eb6f84 + Stage 11 alone: variant b 0 problems.
- The combined trees' tests: see "Prototype results" (Stage 10 first; Stage 10 + 11 + 12 first).

## Self-review

- **Spec coverage.** Debrief view opened at the end (toast + marked link, D-7) and from the session bar: Task 4.
  Scenario, patient, duration, start time, who ran it: Task 4 (meta, "Run by"). Timeline of actions, states and alarms
  with simulated times, restores and bookmarks as events: Task 1 (record) + Task 4. Trend charts HR, MAP/ART, SpO₂,
  EtCO₂, RR, temperature as inline SVG, grey-scale legible: Task 4 (D-3: from the record's own 1 Hz trend). Drugs and
  fluids with doses and times: Tasks 1, 2 (totals), 4. Facts (lowest SpO₂ and when; apnoea alarm → ventilation; time
  pulseless; time to ROSC; total adrenaline; lowest MAP; highest EtCO₂ and temperature): Task 2 `facts`. Objectives
  met / not met / not assessable from rules, the rule schema, the Stage 11 contract, the rules on the showcase
  cards: Tasks 2, 3, Appendix B. Bookmarks, notes, footer: Task 4. Print CSS A4 portrait, breaks, charts whole, no
  colour dependence, both print paths: Task 4 (D-8, e2e). Lightweight session record owned by the host session, kept
  across a restore: Task 1 (D-1). Tests: evaluator per rule kind and verdict (Task 2), record and round trip (Task 1),
  e2e on both engines with the timeline rows, facts, objectives and a `page.pdf()` whose text holds the rows (Task 4).
  No physiology change, R45, R56: Global Constraints. FU-11 / Stage 10 / 11 / 12 files: File partition. The rulings
  Q1–Q7, the per-page footer and build id, and the Appendix B re-cut (R50): "Owner questions", D-3, D-6, D-8, D-12,
  Appendix B.
- **Placeholders.** None: every code step is a block cut from the prototype.
- **Type consistency.** `RunData`, `Row`, `Sample`, `ValueKey` (`TrendKey` | `LabKey`) / `TrendValue` (the same eleven
  keys), `ObjectiveRule`,
  `RunEventId`, `objectiveText`, `verdict`/`objectives`/`facts` — the names in each task's Interfaces are the names in
  its blocks (the prototype typechecked after every task).
- **Review Focus.** Each line names the test that pins it.

## Deviations (execution, 2026-10-11)

- **DV-1 (test only).** `apps/demo/e2e/stage13-debrief.e2e.ts`: the "Ventilated breaths began" row is matched at
  `00:0[01]`, not `00:00`. Under load the first mechanical breath may begin just before the 00:01 bookmark, so its one
  kept row reads 00:01 (4 failures in ≈ 16 runs during the dry-run gate, rows dumped: one "began" row, not undone).
  Exactly one row is still asserted. Orchestrator approval, 2026-10-11.
- **DV-2 (the trend axes, orchestrator ruling 2026-10-11).** The dry run's MH print drew a 96–99 % SpO₂ wobble at full
  chart height. Each trend chart's axis now has a least span, centred on the data when their range is smaller:
  SpO₂ 20 points (never above 100), HR 40 bpm, ART M / NIBP M 40 mmHg, EtCO₂ 20 mmHg, temperature 2 °C; never below zero
  when the data are not; RR has no floor (± 1 when flat, as before). `axisRange` in `apps/demo/src/app/debrief.ts`, used
  by `views/debrief.ts` `chart`; the axis labels stay (the span's ends). One unit test in `debrief.test.ts` (DV-2).
- **DV-3 (test only, orchestrator approval 2026-10-12).** `stage13-debrief.e2e.ts`: the two "Scenario state:
  Anaphylaxis" rows and the epinephrine verdict's anchor are matched at `01:0\d`, not `01:00`; the "Ventilated breaths
  began" row at `00:0\d` (was DV-1's `00:0[01]`). PR #60's CI run 38208532262 failed all three WebKit attempts on these
  rows (lines 55, then 53). Hypothesis, not proven (CI keeps no row dump): on the 2-vCPU Linux WebKit runner the host
  advances the engine in coarser catch-up steps, so the scenario's 60 s state event lands at 01:01 or later. The
  row-existence, count and undo checks are unchanged.

## Appendix B — Task 3 when Stage 11 merged without rules

Use this instead of Task 3 when Stage 11's showcase cards are on `origin/main` and their objectives are strings
(Task 3 Step 0; Stage 11's READY plan keeps them strings, so this is the expected path). R50: re-cut against Stage 11's
FINAL card files (`scratch/plans-backup/stage-11-proto-files/`, identical to its READY plan) with the rules of its
"Objectives and Stage 13" table, plus `from: 'state:triggerOff'` on MH's ventilation objective and the potassium rule
(contract 5). If Stage 11's merged text still differs, Task 0 Step 3 (`--variant b`) names the block: make the same
change on the merged text (the rule goes into the objective with the same meaning) and report it. The test file is the
same as Task 3's; the steps are Task 3's Steps 1–5 (commit message unchanged), with this Step 4 command:
`cd apps/demo && CI=1 npx -y pnpm@9.15.9 exec vitest run src/app/debrief-showcase.test.ts src/app/showcase.test.ts src/app/showcase/showcase-cards.test.ts`
(Stage 11's card test needs its one-line `objectiveText` change, included below), and this Step 5 `git add`:
`git add apps/demo/src/app/showcase/ apps/demo/src/app/debrief-showcase.test.ts` (the card test is in that folder).

Create `apps/demo/src/app/debrief-showcase.test.ts`:

```ts
// Stage 13 Task 3: the showcase objectives as rules — every rule in the library names a state, drug, alarm or condition
// that exists, and on the engine (driver, host and run record wired as AppSession wires them) the anaphylaxis and
// induction cards are judged as the presenter would judge them: treated in time = met, never = not met.
import { createEngine, DRUGS } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { FIXED_ALARM_WORDS } from './alarms.ts';
import { facts, objectives } from './debrief.ts';
import { CONDITIONS } from './describe.ts';
import { RunRecord } from './record.ts';
import { LIBRARY } from './scenarios.ts';
import anaphylaxis from './showcase/showcase-anaphylaxis.json';
import induction from './showcase/showcase-induction.json';

const known = (ev: string, doc: ScenarioDoc): boolean => {
  const [k = '', id = ''] = ev.split(':');
  if (k === 'state') return doc.states.some((s) => s.id === id);
  if (k === 'drug') return !!DRUGS[id];
  if (k === 'alarm') return Object.keys(FIXED_ALARM_WORDS).some((a) => a === id || a.startsWith(`${id}-`)) || /_(HIGH|LOW)$/.test(id);
  if (k === 'condition') return !!CONDITIONS[id];
  return true; // the schema's pattern already limits the rest
};

/** Run a card on the engine with presses at sim times (or when `at` says so); the record sees what AppSession's does. */
async function hostRun(raw: unknown, untilS: number, press: (t: number, rec: RunRecord) => string | null): Promise<RunRecord> {
  const v = validateScenario(raw);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const eo = engineOptionsOf(v.doc, 7);
  const engine = createEngine({ ...eo, mode: v.doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
  const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'SHW234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const tap = hub.connect();
  const rec = new RunRecord(() => ({ patient: 'test', weightKg: v.doc.patient?.weightKg ?? 70 }));
  tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => rec.wire(e)));
  engine.on((e) => rec.engine(e));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  await hs.submit({ id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: v.doc } as never);
  for (let t = 0.1; t <= untilS; t += 0.1) {
    engine.advanceTo(t);
    driver.poll();
    const tr = press(t, rec);
    if (tr) await hs.submit({ id: `p${t}`, issuedBy: 'instructor', type: 'scenario', action: 'trigger', target: tr } as never);
    await settle();
  }
  hs.close();
  return rec;
}
const once = (fn: (t: number, rec: RunRecord) => boolean, tr: string) => {
  let done = false;
  return (t: number, rec: RunRecord) => (!done && fn(t, rec) ? ((done = true), tr) : null);
};
const alarmAt = (rec: RunRecord) => rec.data.rows.find((r) => r.ev?.startsWith('alarm:apnoea'))?.t;
/** The verdict of the objective whose rule starts at the apnoea alarm (its place in the list is the card's business). */
const apnoeaObjective = (rec: RunRecord) => {
  const i = (rec.data.doc?.objectives ?? []).findIndex((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin' && o.rule.after === 'alarm:apnoea');
  return objectives(rec.data)[i]?.verdict;
};

describe('Stage 13: the showcase objectives as rules', () => {
  it('every rule in the library names a state, drug, alarm or condition that exists', () => {
    let n = 0;
    for (const c of LIBRARY) {
      for (const o of c.doc.objectives ?? []) {
        if (typeof o === 'string' || !o.rule) continue;
        const evs = [('event' in o.rule ? o.rule.event : []), ('after' in o.rule ? o.rule.after : [])].flat().filter((x): x is string => !!x);
        for (const ev of evs) expect(known(ev, c.doc), `${c.id}: "${o.text}" names ${ev}`).toBe(true);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(7);
  });

  it('Q5: the draft numbers of the cards Stage 13 owns are marked for the owner in the card text', () => {
    for (const id of ['showcase-anaphylaxis', 'showcase-haemorrhage']) {
      const timed = (LIBRARY.find((c) => c.id === id)?.doc.objectives ?? []).filter((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin');
      expect(timed.length, id).toBeGreaterThan(0);
      for (const o of timed) expect(typeof o === 'string' ? o : o.text).toMatch(/ \(debrief: .+ — draft, owner to confirm\)$/);
    }
  });

  it('anaphylaxis: epinephrine a minute into the reaction is met, no fluid is not met, recognition is the instructor’s', async () => {
    const rec = await hostRun(anaphylaxis, 200, once((t) => t >= 120, 'giveEpi'));
    expect(objectives(rec.data).map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
    expect(objectives(rec.data)[1]?.verdict.why).toMatch(/^Epinephrine 1 min 00 s after the state "Anaphylaxis" \(01:00 → 02:00/);
    expect(facts(rec.data)).toContainEqual({ label: 'Epinephrine, boluses in all', value: '100 µg (1 dose)' });
  }, 120_000);

  it('induction: ventilated 40 s after the apnoea alarm is met; never ventilated is not met', async () => {
    const press = (t: number, rec: RunRecord) => (t >= 10 && !rec.data.rows.some((r) => r.ev === 'state:induced') ? 'induce' : null);
    const intubate = once((t, r) => alarmAt(r) !== undefined && t >= (alarmAt(r) as number) + 40, 'intubate');
    const treated = await hostRun(induction, 150, (t, rec) => press(t, rec) ?? intubate(t, rec));
    expect(apnoeaObjective(treated)?.status).toBe('met');
    expect(facts(treated.data).find((f) => f.label === 'Apnoea alarm to ventilated breaths')?.value).toMatch(/^4\d s \(/);
    const untreated = await hostRun(induction, 170, press);
    expect(apnoeaObjective(untreated)?.status).toBe('not met');
  }, 120_000);
});
```

In `apps/demo/src/app/showcase/showcase-cards.test.ts`, find:

```ts
import { LIBRARY, SHOWCASE_ORDER } from '../scenarios.ts';
```

Replace with:

```ts
import { LIBRARY, objectiveText, SHOWCASE_ORDER } from '../scenarios.ts';
```

In `apps/demo/src/app/showcase/showcase-cards.test.ts`, find:

```ts
    for (const o of doc.objectives ?? []) expect(o, `objective without a number: ${o}`).toMatch(/\d/);
```

Replace with:

```ts
    for (const o of (doc.objectives ?? []).map(objectiveText)) expect(o, `objective without a number: ${o}`).toMatch(/\d/); // Stage 13: { text, rule }
```

In `apps/demo/src/app/showcase/showcase-anaphylaxis.json`, find:

```json
    "Give epinephrine 50–100 µg IV early and repeat as needed",
    "Give fluid for the capillary leak"
```

Replace with:

```json
    { "text": "Give epinephrine 50–100 µg IV early and repeat as needed (debrief: within 2 min of the reaction — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "state:anaphylaxis", "event": "drug:epinephrine", "withinS": 120 } },
    { "text": "Give fluid for the capillary leak", "rule": { "kind": "occurred", "event": "fluid" } }
```

In `apps/demo/src/app/showcase/showcase-bronchospasm.json`, find:

```json
    "Treat with a bronchodilator",
```

Replace with:

```json
    { "text": "Treat with a bronchodilator", "rule": { "kind": "occurred", "event": "drug:salbutamol" } },
```

In `apps/demo/src/app/showcase/showcase-haemorrhage.json`, find:

```json
    "Start high-quality CPR without delay",
    "Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram"
```

Replace with:

```json
    { "text": "Start high-quality CPR without delay (debrief: within 30 s of the pulse loss — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "cpr", "withinS": 30 } },
    { "text": "Give volume and epinephrine; recognise the return of circulation on the arterial line and capnogram (debrief: the pulse back within 6 min of its loss — draft, owner to confirm)", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "rosc", "withinS": 360 } }
```

In `apps/demo/src/app/showcase/showcase-induction-premed.json`, find:

```json
    "Intubate and ventilate within 60 s of the CO₂ apnoea alarm (it sounds about 43 s after induction, 13 s earlier than in the healthy induction)",
    "Give a vasopressor (phenylephrine or ephedrine) within 60 s of the mean arterial pressure falling below 60 mmHg",
    "Mean arterial pressure back above 65 mmHg within 120 s of the vasopressor"
```

Replace with:

```json
    { "text": "Intubate and ventilate within 60 s of the CO₂ apnoea alarm (it sounds about 43 s after induction, 13 s earlier than in the healthy induction)", "rule": { "kind": "eventWithin", "after": "alarm:apnoea", "event": "ventilation", "withinS": 60 } },
    { "text": "Give a vasopressor (phenylephrine or ephedrine) within 60 s of the mean arterial pressure falling below 60 mmHg", "rule": { "kind": "eventWithin", "after": "value:map<60", "event": ["drug:phenylephrine", "drug:ephedrine"], "withinS": 60 } },
    { "text": "Mean arterial pressure back above 65 mmHg within 120 s of the vasopressor", "rule": { "kind": "eventWithin", "after": ["drug:phenylephrine", "drug:ephedrine"], "event": "value:map>65", "withinS": 120 } }
```

In `apps/demo/src/app/showcase/showcase-induction.json`, find:

```json
    "Intubate and ventilate within 90 s of the CO₂ apnoea alarm (it sounds about 55 s after induction)",
    "Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubation",
    "Airway not secured: ventilate (bag-mask or tube) within 60 s of SpO₂ falling below 90 % (about 8 minutes after induction)",
    "Ventilate within 300 s of SpO₂ falling below 60 % (the pulse is lost about 10½ minutes after it)"
```

Replace with:

```json
    { "text": "Intubate and ventilate within 90 s of the CO₂ apnoea alarm (it sounds about 55 s after induction)", "rule": { "kind": "eventWithin", "after": "alarm:apnoea", "event": "ventilation", "withinS": 90 } },
    { "text": "Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubation", "rule": { "kind": "eventWithin", "after": ["state:ventilated", "state:rescuedEtt"], "event": "value:etco2>25", "withinS": 30 } },
    { "text": "Airway not secured: ventilate (bag-mask or tube) within 60 s of SpO₂ falling below 90 % (about 8 minutes after induction)", "rule": { "kind": "eventWithin", "after": "state:desaturating", "event": "ventilation", "withinS": 60 } },
    { "text": "Ventilate within 300 s of SpO₂ falling below 60 % (the pulse is lost about 10½ minutes after it)", "rule": { "kind": "eventWithin", "after": "state:bradycardic", "event": "ventilation", "withinS": 300 } }
```

In `apps/demo/src/app/showcase/showcase-mh.json`, find:

```json
    "Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)",
    "Give dantrolene 2.5 mg/kg within 300 s of calling the crisis",
    "Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHg",
    "Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/L",
    "Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHg"
```

Replace with:

```json
    { "text": "Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)", "rule": { "kind": "eventWithin", "after": "state:earlySigns", "event": "state:triggerOff", "withinS": 120 } },
    { "text": "Give dantrolene 2.5 mg/kg within 300 s of calling the crisis", "rule": { "kind": "eventWithin", "after": "state:triggerOff", "event": "drug:dantrolene", "withinS": 300 } },
    "Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHg",
    { "text": "Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/L", "rule": { "kind": "eventWithin", "after": "value:k>5.5", "event": ["drug:calciumChloride", "drug:insulinDextrose"], "withinS": 300 } },
    { "text": "Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHg", "rule": { "kind": "eventWithin", "from": "state:triggerOff", "after": "value:etco2<40", "event": "state:normoventilated", "withinS": 300 } }
```

In `apps/demo/src/app/showcase/showcase-tamponade.json`, find:

```json
    "Start CPR within 10 s of the pulse loss",
    "Pericardiocentesis within 120 s of starting CPR",
    "Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram",
    "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA follows"
```

Replace with:

```json
    { "text": "Start CPR within 10 s of the pulse loss", "rule": { "kind": "eventWithin", "after": "pulseLoss", "event": "cpr", "withinS": 10 } },
    { "text": "Pericardiocentesis within 120 s of starting CPR", "rule": { "kind": "eventWithin", "after": "cpr", "event": "state:cprDrained", "withinS": 120 } },
    { "text": "Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram", "rule": { "kind": "eventWithin", "after": "rosc", "event": "state:rosc", "withinS": 30 } },
    { "text": "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA follows", "rule": { "kind": "never", "event": "pulseLoss" } }
```
