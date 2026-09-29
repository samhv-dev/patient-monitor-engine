# Stage 9: Clinical UI and naming — one app page, one engine session, instructor panel, glossary labels, responsive layouts (R55, R56) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-28, plan writer, resumed after the 12th cap cut-off): COMPLETE, NOT YET REVIEWED (R50 review
> pending). Every block was prototyped on `origin/main` `891d4d2` (code of `bab4b72`) and re-applied mechanically to a
> clean tree (Self-review). Executes after FU-4, FU-5, V.1, FU-6, FU-7 and 7k merge; exceptions E-S9-1/2/3 need the
> orchestrator's approval.

**Goal:** Turn the 25-page demo into ONE professional product page for Ali's course (R55): a Start screen, the learner
Monitor, the Instructor view (monitor + tabbed panel with a session bar, staged changes, pin/return-to-model), a paired
Remote, Explore physiology (the 7x console in a light theme with glossary labels, the 7k mechanics slot, the v1.1 labs
placeholder), the Ventilator and Validate pages wrapped, a Developer hub (stage pages and audit pages reachable only
there) and Settings (site profile). One engine session lives for the whole document and is never restarted by a view
switch. Every visible parameter label comes from the R56 glossary (research/11 §5); no engine id, ruling number or
unit-less control reaches a clinical view. The monitor itself (sweep, skins, tiles, lanes, alarm bar — FU-5's) is
wrapped, never redesigned.

**Architecture:** One document (`apps/demo/index.html`, which becomes the app) with hash routes and no router
dependency. The monitor host element (`.stage`) is created once and only re-placed by CSS grid areas when the route
changes; views are sections toggled with `hidden`. `AppSession` owns the one engine (`mountMonitor`, worker path),
the Stage 6a `HostSession` (in-process hub for this page's panel, BroadcastChannel for a paired Remote, relay/WebRTC
with `?relay=`) and the Stage 6b `ScenarioDriver`; nothing but "Restart patient" / "Load scenario" remounts the
engine, and both sit behind a stable `HostTarget`, so the host session, the driver, the log and every listener
survive. The Instructor panel is built ONLY on a `ControllerSession` plus a raw-event tap of the same transport, so the
same panel code runs same-screen (in-process hub) and as the Remote (BroadcastChannel/relay). Every label for a
physiological quantity comes from `glossary.ts` (generated once from research/11 §5 into `glossary-data.ts`, reviewed
by Ali, R56). Styling is one stylesheet of tokens (`app.css`); the monitor's interior is FU-5's and untouched.

**Tech Stack:** TypeScript 5.9 strict, Vite 6 (multi-page demo; the app is the `index` input), Vitest 3.2 (+ the
existing happy-dom where a DOM test needs it), Playwright 1.63 (`PW_SYSTEM_CHROME=1`), pnpm 9.15.9 via `npx`. No new
runtime or dev dependency (the accessibility audit is a custom Playwright check; axe is Ali's question Q8).

**Spec:** `research/13-ui-design-brief-draft.md` (the brief: §4 IA, §5 state model, §6 tokens, §7 components, §8
layouts, §9 accessibility, §10 performance, §11 verification, §13 questions), `research/13-ui-benchmarks.md` (critique
and benchmark), and the three BINDING sweeps: `research/13-ui-design-references.md` (IEC 60601-1-8 colours/flash
rates/4 m–1 m legibility, IEC 60417 inactivation symbols, WCAG 2.2, licence table, the 12 derived rules),
`research/13-ui-simulator-benchmarks.md` (top-8 instructor patterns, 5 anti-patterns),
`research/13-ui-commercial-benchmarks.md` (top-10 conventions; its numbers are model-derived and are NOT turned into
acceptance tests here); `research/11-capability-inventory-and-glossary.md` §5 (the glossary: the ONLY label source)
and §5.16 (rules; collisions CPP/CoPP, PI/LVAD PI, SR/Sinus, RR/RRI, FO₂Hb/SaO₂; "ABP" philips-like, "Art"
mindray-like stay INSIDE the monitor frame); rulings R45, R50, R51, R53, R54–R60 and the orchestrator entries "UI
benchmark study delivered", "UI research sweeps filed", "12th cap cut-off", "Inventory, glossary and coverage matrix
delivered", "FU-5 plan FIXED", "CI amendment 4".

## Global Constraints

- **R45 (existing tests):** no existing test, band or e2e assertion is widened, removed or re-worded to pass. Stage 9
  deletes no stage page and no e2e; the stage pages stay working and reachable (Developer). A new assertion that the
  shipped UI cannot meet is recorded in the gate note with the measured number, never loosened silently.
- **R51 / no physiology:** Stage 9 changes NO physiology, engine, renderer drawing, skin data, alarm semantics or
  scenario content. It WRAPS FU-5's monitor (`mountMonitor`, tiles, lanes, alarm bar, `data-latched`, `.pme-inop`,
  `AlarmEntry.sounding`) and consumes the controller's existing wire protocol. Anything the UI would need from a lower
  layer is a Request (section "Requests to other stages"), never an edit.
- **Partition (binding):** NEW files only, under `apps/demo/src/app/**`, `apps/demo/e2e/stage9-*.e2e.ts`,
  `apps/demo/scripts/stage9-*.mjs`, `docs/gates/stage-9.md`, `docs/gates/stage-9/**`. The ONLY edits to existing files
  are (each re-verified at Task 0 against the merged base):
  1. `apps/demo/index.html` — the whole file becomes the app page (the old stage list moves into the Developer view as
     data, `app/views/dev.ts`). Exception E-S9-1.
  2. `packages/controller/src/panel/styles.ts` — the 6a drawer's `backdrop-filter: blur(6px)` becomes an opaque
     background (brief §10: no blur over a canvas that changes every frame; the drawer still serves the stage6a/6b
     pages under Developer). Exception E-S9-3.
  2a. `packages/controller/src/session/host-session.ts` and `packages/controller/test/session/host-session.test.ts` —
     the pre-7a guard that refused every pin/release/setFactor/setMode is removed, the one stub assertion follows, and a
     NEW test covers all four commands through the host (a defect found while prototyping). Exception E-S9-2.
  2b. Per-skin alarm wording (FU-5 R-FU5-6, orchestrator ruling 1 on the R50 review): the `alarms.wording` tables in
     `packages/skins/src/data/skins/{mindray,ge,zoll,lifepak}-like.json` (data), the optional field that lets the closed
     skin schema accept them (`packages/skins/src/{types,schema}.ts`, one field each) and the two lines that read them
     (`packages/engine-core/src/l3/alarms/{profile,text}.ts`), plus two NEW tests. Wording only: no level, timing,
     latching or renderer change. Exception E-S9-4 (Task 7b).
  3. `apps/demo/vite.config.ts` — NONE expected (the app is the existing `index` input); listed so Task 0 confirms it.
  4. `NOTICES.md` — NONE unless Ali approves the OFL fonts (Q7); the default ships the system-font stack.
  **Never touch:** `packages/engine-core/**` and `packages/skins/**` except item 2b's lines, `packages/renderer/**`,
  `packages/audio/**`, `packages/ventilator/**`, `packages/validation/**`, `packages/controller/**` except items 2 and 2a, any existing
  `apps/demo/src/**` file, any existing e2e, `package.json`, `pnpm-lock.yaml`, `.github/**`, `docs/physiology/**`.
- **Base and process:** worktree `projects/patient-monitor-engine/scratch/wt-stage-9`, branch `stage-9-clinical-ui`
  from `origin/main` AFTER FU-4, FU-5, V.1, FU-6, FU-7 and 7k have merged (R60 order FU-4 → V.1 → FU-6 → FU-7 → 7k →
  Stage 9 → 8b, FU-5 in parallel). Never the shared checkout (R25). Push after every task's commit
  (`git push -u origin stage-9-clinical-ui` the first time). Never push to `main`, never merge: Task 25 opens the PR
  "Stage 9: clinical UI — one app, instructor panel, glossary labels, responsive layouts" and STOPS (Ali or the
  orchestrator merges). Before Task 25's gate run: `git fetch origin && git merge origin/main`.
- **Find blocks:** the few edits to existing files are find/replace blocks that matched EXACTLY ONCE on
  `origin/main` `776ebb5` (FU-5 merged; checked mechanically, section "Self-review"). If a block no longer matches after FU-4, V.1, FU-6, FU-7 or 7k,
  locate the same statement by its quoted text and make the same change; never re-type a line you are not changing.
  New files are "Create" blocks: copy them verbatim.
- **CI rules (CI amendments 1–4, restated):** `CI=1` for engine tests; any test that can exceed ≈ 30 s wall yields
  once per sim-MINUTE (Stage 9 adds no engine test); heavy evidence e2e and screenshot scripts run **Chromium only**
  (`test.skip(browserName === 'webkit', …)` with the reason, as `physiology-console.e2e.ts` does); the light app e2e
  (routing, glossary DOM check, accessibility check) runs on both CI projects. Local runs use system Chrome
  (`PW_SYSTEM_CHROME=1`). Never `git stash` (shared across worktrees). Scratch and logs under
  `<scratchpad>/stage-9-clinical-ui/`, never bare file names in the repo. Bounded waits: every wait on a background
  process is an `until` loop of ≤ 10 min that re-checks the process (not a marker line); re-arm rather than lengthen.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Demo unit tests: `npx -y pnpm@9.15.9 --filter
  @pme/demo exec vitest run src/app`; typecheck `npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json`;
  e2e `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-<name>.e2e.ts`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no parameter properties, no enums), `.ts` import
  extensions, conventional commits. Every commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1
  <noreply@anthropic.com>` (swap it if your harness gives another) and is followed by `git push`. The PR body ends with
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
- **Dependencies:** none added (runtime or dev). Platform features only: CSS custom properties, container queries,
  `<dialog>`, `inert`, `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`; the Popover API is NOT used
  (iPadOS 16.4 floor, research/13-ui-design-references §5). The QR code is a small self-written encoder
  (`app/qr.ts`, byte mode, error-correction level M) — no vendored code, no NOTICES row.
- **Copy rules (UX-copy pass, binding for every string the executor adds):** sentence case; no engine ids, no ruling or
  stage numbers, no camelCase in any clinical view; every number shown with its unit (thin space, unit in
  `--text-muted`); buttons say the verb the toast repeats ("Give", "Start infusion", "Commit 3 changes"); every
  physiological label through `glossary.ts` (`glossLabel(n)` / `labelOf(path)`); a label that is not in the glossary
  is added to `GLOSSARY_S9` (entries 295–299 exist; new ones are numbered from 300; reviewed by Ali) rather than typed inline.
- **Gate screenshots ≤ 60 KB each** (indexed PNGs from `e2e/stage9-png8.ts`: scale 1 up to 1440 px wide, 0.75 above;
  the test retries once at 0.8 / 0.6 and fails above 60 KB; record any retry in the gate note).

## Decisions (made while prototyping; the executor does not revisit them)

Design skills used while prototyping: `frontend-design` (direction and restraint: the monitor is the one bold element,
the bezel is quiet; the plan's token set, type and layout), `design:design-critique` (a critique pass over every
prototype screenshot at 1280×800, 1440×900, 1920×1080, 1180×820 and 820×1180 — its findings are the fixes in D21 and
the "Prototype results" notes), `design:accessibility-review` (WCAG 2.2 AA pass: D22, the custom audit test),
`design:ux-copy` (every visible string; the copy rules in Global Constraints; D14).

- **D1 — One page, hash routes, no router dependency.** `apps/demo/index.html` becomes the app; `app/router.ts`
  (30 lines) parses `#/<view>/<sub>?<query>`. Views are `<section>`s toggled with `hidden`. (brief §5; research/13 §4.)
- **D2 — One engine session per document.** `app/session.ts` `AppSession` owns `mountMonitor` (worker path), the 6a
  `HostSession` (in-process hub + BroadcastChannel; relay/WebRTC with `?relay=`) and the 6b `ScenarioDriver`. The
  monitor host (`.stage`) is created once; routes only re-place it with CSS grid areas. Only "Restart patient" and
  "Load scenario" remount the engine, behind a stable `HostTarget`, so the host session, the scenario driver, the
  remote pairing, the log and every listener survive. (brief §5 "never unmounted".)
- **D3 — The panel is built on a `Link`, never on the session.** `app/link.ts` = `ControllerSession` + a tap of the
  same transport (for `alarmStatus`/`deviceStatus`, which the controller session does not keep) + the clinical log.
  Same-screen: the in-process hub; Remote: BroadcastChannel/relay. One panel implementation serves both (brief §4.4;
  simulator sweep top-8 #8).
- **D4 — The glossary is the only label source (R56).** `app/glossary-data.ts` is generated ONCE from research/11 §5
  (294 entries; the scratch generator is recorded in Task 2) plus `GLOSSARY_S9` (entries 295–299: BP target, Rhythm,
  Onset, Contractility ×, Volume status ×), and is edited by hand afterwards (Ali reviews it). `glossary.ts` resolves
  truth paths (`#` side index, `*`/`<id>` segments), strips author notes from names and units (`(engine fraction)`),
  and gives the short label, the tooltip text (name, unit, adult normal, child/pregnancy). Engine keys appear only in
  Explore → "Model internals" (collapsed) and in Developer (brief Q9). **Labels never collide (R50 review F1):** a
  label loses its parenthesis only when what is left names one quantity ("T1 (Tcore)" → "T1"), a qualifier that tells
  two quantities apart stays ("SVR (model)", "EtCO₂ (true)"), `SHORT` fixes the two labels research/11 itself shares
  ("TOF T1" for the first twitch, "UO/kg"), `SAME_AS` files a truth copy under its monitor entry (ICP, CPP, glucose),
  a per-drug path names its drug ("Cp (Propofol)"), and a `*` key gives a clinical label only to the paths
  `KEY_LABELS` names (the temperature sites); every other `*` path is a model internal. A unit test fills every key's
  wildcards and fails when one label covers two quantities.
- **D5 — Tokens as the brief's §6.2 table,** in `app/app.css` `:root` (dark "theatre") and `.bench` (light). One
  accent (periwinkle `#8C9BFF` dark / `#3A4FD9` light) marks instructor-controlled state only. Alarm colours are NOT
  shell tokens: `applySkinAlarmColours` copies the active skin's `alarms.messageBar` L1–L3 into `--alarm-*` and swaps
  the text to black or white when the skin's pair is under 4.5:1 (research/13-ui-design-references rule 9: black text
  on bright red). Red outside the alarm mirror is used only for the destructive button INSIDE a confirm dialog
  (brief §6.2): the Patient tab's "Restart patient" is a secondary button (its dialog carries the danger styling), and
  errors are strong text with ⚠ and the word "Error", never alarm red (R50 review F11; references rule 1).
  `AppSession.setSkin` applies them on EVERY skin or theme change, wherever it comes from (Start,
  Settings, an imported profile), so the mirror never keeps an old skin's colours (R50 review F5; an e2e changes the
  monitor on Start and compares `--alarm-high-bg` with the new skin's `messageBar.L1.bg`). The `.bench` class sets
  `color`/`background` itself (a computed colour inherited from `body` would otherwise keep the dark theme's text —
  found in the prototype).
- **D6 — System fonts by default.** `--font-ui: system-ui, …`, `--font-num` = the UI face with `tabular-nums`,
  `--font-mono: ui-monospace, …`. IBM Plex Sans/Mono and B612 (SIL OFL 1.1) are NOT shipped until Ali answers Q7; if
  he approves, Task 20 adds the WOFF2 files, the `@font-face` block, the NOTICES row and `LICENSES/OFL-1.1.txt`
  (research/13-ui-design-references §4: OFL is not in DESIGN-BRIEF §8's "may borrow" list).
- **D7 — Stage, then commit, with one onset for the batch** (simulator sweep top-8 #1: Gaumard UNI's Apply list,
  SimPad's "Set transition time"; anti-pattern #1: no mandatory send per edit). Footer: count, the staged lines in
  words, Onset (Now, 30 s, 1 min, 2 min, 5 min), "Apply at once" (the opt-out), Discard, Commit (⌘/Ctrl+Enter).
  Urgent actions never stage: Give now (bolus), Start infusion, fluids Give, Charge, Shock, CPR, Silence, Pause,
  Acknowledge, NIBP start, sensor attach/detach (research/13 P6).
- **D8 — Pin / return-to-model per parameter (CAE Maestro, sweep top-8 #2 and #3).** In MODELED, "Set" stages a `pin`
  and "Return to model" a `release`; in MANUAL, "Set" stages a `setTarget`. The engine's `state.control` flag drives
  a chip with a glyph AND a word: wave "Model", pin "Held", "Changing", dashed "Model override". The session-bar badge
  reads MODELED / "MODELED, n held" / MANUAL (pin glyph, accent fill) and opens a dialog with "Return to model" per
  held value and "Return all to the model".
- **D9 — Trend markers (REALITi's progress arc):** a 3 px accent progress bar under a parameter while its onset runs,
  from the commanded duration and sim time (`Link.ramps`); it disappears at 100 %.
- **D10 — Alarm mirror, steady:** skin colours, the skin's priority marks (`***`/`**`/`*` where the monitor prints
  asterisks, else `!!!`/`!!`/`!` — R50 review F12) plus the word (High/Medium/Low), latched and
  acknowledged states in words, silence/pause countdowns in words; new high alarms announced once through an
  `aria-live="assertive"` region in the instructor view only; nothing in the shell flashes (brief §6.4; references
  rules 3, 4, 7). The top-bar alarm count uses the same colours and shows the top message. **Glossary words outside
  the monitor frame (R50 review F4; research/11 §5.16 rules 1–2):** the mirror line is built by `app/alarms.ts` from the
  alarm's id and numeric — the glossary label of the numeric plus "high"/"low" ("ART S low"), or a fixed alarm in plain
  words ("ART: no pulsatile pressure", "Asystole") — never the vendor's text ("**ABPs 21<90"); the monitor's own text
  is the row's tooltip ("On the monitor: …", marked `data-vendor-title`, which the glossary scan skips because it quotes
  the device). An alarm id the table does not know keeps the monitor's text without its stars and is listed in the gate
  note (`alarmLine(…).known === false`) — today every device-layer id is known.
- **D11 — Sensors attach before traces appear (Laerdal; sweep top-8 #7):** Start's "Start with the sensors off" (a
  site default) builds the patient with every monitoring sensor off; Devices & alarms has one toggle per sensor
  (`attachSensor`), and the log records each attach.
- **D12 — Scenario library = every `pme-scenario/1` JSON** under `packages/controller/scenarios` (`import.meta.glob`),
  not only the five the 6b runner bundles (the 7f depth/NMB cases appear too). Cards show the story, patient,
  category, duration and objectives from `app/scenario-meta.ts` (drafts for Ali; the author notes name build stages,
  so cards never print `notes`). The run view shows the state strip (current highlighted, tap to jump with a
  confirm), time in state, the next triggers in clinical words with countdowns, manual triggers as buttons,
  Hold/Resume, bookmarks with "Return here", and an objectives checklist that writes "Objective met" to the log.
- **D13 — Trigger and log text in clinical words** (`app/triggers.ts`, `app/describe.ts`): the controller's
  `describeTransition` and `describe` print engine ids (`etco2 ≥ 20 → rosc`), so the app keeps its own copies with
  glossary labels, drug names from the 7g library and state labels. An engine refusal reason is kept in the exported
  log only; the screen says "not applied" (D14 of the copy rules).
- **D14 — Copy:** UX-copy pass applied to every string (sentence case, verbs that match the toast, units always,
  errors that say how to fix, empty states that offer the action). "Adult normal" ranges come from the glossary.
- **D15 — Remote in the same document at `#/remote?code=XXXXXX`; version 1.0 pairs in the SAME browser only**
  (orchestrator ruling 6 on the R50 review, finding F2). The default transport is a BroadcastChannel, which never
  leaves the browser profile, so the host's Remote view shows the code and "Open the remote in a new window", says in
  one sentence that pairing works in this browser only and that a tablet over the network needs the relay (version
  1.1), and shows NO QR code. With `?relay=` (the Stage 6a relay, `pnpm relay`) the view shows the pairing address and
  a QR code only when the page's own address is not a loopback one (`localhost`, `127.x`, `::1`), because a tablet
  cannot reach those; relay pairing is labelled a version 1.1 preview. The decision is a pure function
  (`app/pairing.ts`, unit-tested). The QR code comes from a self-written encoder (`app/qr.ts`, byte mode, level M,
  versions 1–10), verified in the prototype by decoding versions 1, 4, 6, 8 and 10 with macOS CoreImage
  (`CIDetectorTypeQRCode`); the unit test pins structure and one checksum.
- **D16 — Explore physiology re-presents the 7x console's pure model** (`ConsoleModel`, `format.ts`, `organs.ts` —
  imported, not edited): glossary-labelled rows by body system, value, unit, adult normal, change from the baseline
  (arrow + tint, set automatically at 1 min or by hand), "Changed only", vitals strip, and "Model internals"
  collapsed. The 7k slot is the "Respiratory mechanics and volumes" section (glossary §5.6 rows + a placeholder until
  7k's loops panel lands); Labs shows the blood-gas rows and a v1.1 placeholder (Q10). The original console page stays
  in Developer, unchanged. One row per QUANTITY (review F1): rows are deduplicated by `rowKey` (canonical entry, per-key
  label, wildcard segments), so the monitor and truth copies of one value share a row and two quantities never do;
  each row's tooltip button is named after the row ("About Cp (Propofol)").
- **D17 — Ventilator = the Stage V cockpit (`vent-hamilton.html`) in an iframe, linked to THIS session's monitor** with
  the Stage V BroadcastChannel port (`attachMonitorToLink`), re-attached on every remount (`AppSession.onMount`).
- **D18 — Validate = the Stage 8a tools in bench tabs:** the bedside checklist and the blind review as lazily loaded
  iframes (they keep their own engines); the performance check opens in a NEW TAB from its tab, because it measures one
  monitor alone by design and a frame next to this session's running monitor would change what it measures (R50
  review F13).
- **D19 — Developer lists every stage page (new tab, so the session keeps running), the tools, and the evidence pages
  FU-4/6/7 add (`fu4.html`, `fu6.html`, `fu7.html`), each shown only if the server has it (HEAD check).** There are no
  "audit pages": the FU-4/6/7 audits are CLI scripts (`pnpm run audit:physiology`), named as such.
- **D20 — Settings = the site profile** (`pme-site/1`: monitor skin or preset incl. `iran-icu-as-found`, screen theme,
  frame rate, panel beside/over the monitor, gas unit, sensors-off start, drug-name set — D28), stored per browser and exportable/
  importable as JSON (research/13 P11). Language: English only; strings live in the view modules (no i18n framework,
  Q11).
- **D21 — Responsive rules (prototype-verified):** split when the viewport is ≥ 1200 px wide (panel 560 px ≥ 1800,
  440 px ≥ 1440, 420 px below); drawer over the monitor below 1200 px or when the site chooses it, with an
  "Instructor panel" toggle at the monitor's bottom-left (bottom-right is under the drawer); iPad portrait (≤ 900 px,
  portrait) = monitor on top (42 %), panel as a sheet; ≤ 1000 px the view list moves into a "Menu" dialog (at 820 px
  the nav clipped "Developer" in the prototype); ≤ 1379 px the product name hides (at 1280 px "Settings" clipped).
  The monitor sizes itself (its own ResizeObserver) — never a CSS transform.
- **D22 — Accessibility audit without a new dependency** (axe is MPL-2.0: Q8): `e2e/stage9-a11y.e2e.ts` walks every
  view and fails on a visible control under 24×24 px (44×44 in the instructor panel and remote), an input/select/
  textarea without an accessible name, text below 4.5:1 (3:1 for ≥ 24 px or bold ≥ 18.66 px) computed from the
  rendered colours, a focusable element without a visible focus indicator, a missing `main`/`h1`, or horizontal page
  scroll. The glossary test (`e2e/stage9-glossary.e2e.ts`) fails on any raw engine id in the text, `aria-label`,
  `title` or `placeholder` of a clinical view, including a Remote document (its join form and every tab of a remote
  joined by code — R50 review F10). Placeholders are written out ("For example AGD5YJ", never "e.g.").
- **D23 — Frame gate with the whole shell, on the brief's load (R50 review F6):** the app records `requestAnimationFrame`
  intervals (`__pmeApp.frames`, the method of `validation-perf.html`), measured with the instructor panel open on the
  8-lane `validation-perf` load: `?load=perf8` mounts the performance page's own layout and patient (ECG II, V5, aVR,
  ABP, pleth, CVP, CO2, resp; ventilated; NIBP every 3 min; `AppSession` `PERF8`) inside the shell instead of the site's
  skin. Four rows (1920×1080 and 1280×800 at 60 and 30 fps) plus a 20-minute soak at 1920×1080 60 fps (`--soak 1200`,
  gated on the worst 60 s window as well). The metric is the MAIN thread's frame intervals, as in 8a: the renderer draws
  in its worker and exposes no worker frame statistics, so the site's 30 fps cap does not show in it — the gate note
  says so rather than reading the 30 fps rows as proof that the worker drew at 30.
- **D24 — The 6a drawer's `backdrop-filter: blur(6px)` is removed** (the one controller edit), for the stage6a/6b pages
  still served under Developer; the app's own drawer is opaque from the start (brief §10).
- **D25 — Shortcuts** (brief §9, ignored while typing): `i` monitor ↔ instructor (the 6a reveal, also 5 taps top-left
  and a three-finger hold), `Shift+S` silence, `Shift+P` pause alarms, `Shift+N` NIBP, `Shift+B` bookmark,
  `⌘/Ctrl+Enter` commit, `?` the shortcut sheet. Capitals, because an instructor talking with a hand on the keyboard
  must not silence the room with one stray key.
- **D26 — Main-thread budget:** the panel repaints only its visible tab, ≤ 2 Hz, in one rAF (`throttle`); Explore
  renders only while visible; the top-bar count ≤ 2 Hz.
- **D27 — Learner controls strip (orchestrator ruling 4 on the R50 review; brief Q12):** the Stage 6b learner action
  bar (`stage6b/actions.ts` `LEARNER_ACTIONS`, imported, not edited) as a strip under the learner Monitor
  (`app/learner.ts`). OFF by default; the instructor switches it on for the running scenario in the Scenario tab
  ("Learner controls on the monitor", host only), or a case's card meta does (`learnerControls`, none today); loading a
  scenario or restarting the patient switches it off. Each button goes through the panel's link and is logged as a
  learner action (`kind: 'learner'`); labels follow the drug-name set.
- **D28 — Drug names from the glossary, one set per site (orchestrator ruling 5; Q13 stays open for Ali):**
  `glossary-data.ts` `DRUG_NAMES` holds every 7g drug's display name (generated once from the library, edited by
  hand), with the British name where it differs (epinephrine/adrenaline, norepinephrine/noradrenaline). The site
  profile's `drugNames` picks the set: `us` "epinephrine / norepinephrine" (default) or `uk` "adrenaline /
  noradrenaline" (Settings → Drug names). `drugName(id)` names drugs in the dose picker, log lines, toasts, triggers and
  Explore's per-drug rows; `drugWords(text)` puts free text (scenario stories and objectives, learner buttons, the
  glossary's plasma-catecholamine labels) in the same set, so one screen never says both. Search finds either name.
- **D29 — Version 1.0 limits accepted by the orchestrator (rulings 3 and 6):** the sweep restarts after a Monitor ↔
  Instructor switch (R-S9-1a); the Remote is same-browser only (D15). The gate note and the user guide state both.

## Prototype results (base `origin/main` `f8b802d` = code of `bab4b72`, before FU-4…7k; scratch worktree)

Every file in this plan was written and run in a scratch worktree on that base; the create blocks below are copied
mechanically from it and a script re-applied them (section "Self-review"). Patch:
`projects/patient-monitor-engine/scratch/plans-backup/stage-9-prototype.patch`; screenshots:
`scratch/plans-backup/stage-9-prototype-shots/` (56 PNGs).

| What | Result |
|---|---|
| App shell: Start → Monitor → Instructor → every view | renders at 1280×800, 1440×900, 1920×1080, 1180×820 and 820×1180; no page error; one engine session: the monitor node is the same object after visiting 6 views and sim time kept rising (`stage9-app.e2e.ts`, 3/3 pass) |
| Scenario deep link `?scenario=acls-vf-witnessed` | loads the case, opens the instructor view, session bar reads "Witnessed VF in PACU: Stable in PACU 00:18" |
| Remote (second page, same browser, by code) | "Connected to <code>", HR held at 112 from the remote → host HR > 105 within 20 s, host badge "MODELED, 1 held" — only after E-S9-2 (below) |
| Glossary test (`stage9-glossary.e2e.ts`) | 0 engine ids in 8 tabs, 12 Explore sections and 6 other views, after the copy fixes it found ("e.g." placeholder; `a.u.` and `sO₂` added as allowed unit tokens) |
| Accessibility audit (`stage9-a11y.e2e.ts`) | 0 findings at 1280×800 and at 820×1180 touch (44 px panel targets), after fixes it found: checkboxes 20 → 24 px, touch sizes for small buttons/segments/state strip, missing h1 in Instructor/Monitor, `summary` names |
| Unit tests (`src/app/*.test.ts`) | 9 files, 32 tests pass (router 8, glossary 4, tokens 3, components 4, QR 3, staging 2, site 2, patients 3, copy 3); demo package 18 files, 173 tests |
| Existing tests | demo 141/141 unchanged (173 with Stage 9's), controller 37 files 215/215 after E-S9-2; `stage6a.e2e.ts` and `stage6b.e2e.ts` pass with the opaque drawer |
| Five timed tasks (`stage9-tasks.e2e.ts`, automated through the visible UI) | hold SpO₂ 85 % then return: 2.6–3.6 s; load ACLS VF: 0.9–1.7 s; noradrenaline 0.1 µg/kg/min: 0.8–0.9 s; silence + bookmark: 0.7–0.8 s; compliance: found (Cstat 54 mL/cmH₂O); driving pressure: NOT found — no ΔP truth path before 7k (Request R-S9-3; the test stays red until 7k is on the base, which the stage order guarantees) |
| Frame gate, shell mounted, instructor panel open (`scripts/stage9-frames.mjs`, system Chrome headless, worker-raf path) | 1920×1080 60 fps: n 3,586, p50 16.7, **p95 16.7**, p99 16.8, max 100.0 ms; 1920×1080 30 fps: n 3,600, p95 16.7, max 33.3; 1280×800 60 fps: n 3,600, p95 16.7, max 33.3; 1280×800 30 fps: n 3,599, p95 16.7, max 33.4 — all inside 8a's p95 < 25 / < 50 ms |
| Screenshot matrix (`stage9-shots.e2e.ts`) | 14 views × 4 sizes = 56 indexed PNGs, 21–59 KB (largest `instructor-drugs-1920x1080` 59.1 KB at scale 0.75) |
| QR pairing code | decoded by macOS CoreImage at versions 1, 4, 6, 8, 10 (the pairing URL is version 4) |
| Ventilator view | the Stage V cockpit drives this session's patient: 393 external-drive frames, 37 clocks and 8 lungState messages in 8 s on the link channel |

**Defect found while prototyping (E-S9-2).** `packages/controller/src/session/host-session.ts` refuses every `pin`,
`release`, `setFactor` and `setMode` from a panel or a remote with "needs MODELED mode (Stage 7)", a guard written
before 7a implemented MODELED. The engine validates and applies `pin`, `release` and `setMode` (measured: `pin hr 112`,
`pin spo2 85`, `pin sbp 90`, `release all`, `setMode modeled` accepted); it does not model `setFactor` yet, so after
the fix `setFactor` is still refused — by the engine, with its own reason ("command type setFactor is not implemented
until later stages"), which is correct until the engine models factors (R50 review F8). Without the fix the instructor cannot hold or return any value — the heart of the
CAE pattern. FU-4/FU-5 do not touch the file (checked on their branches). Task 7 removes the guard and changes the one
existing assertion that pinned the stub (declared exception, below).

**Findings kept as requests, not fixed here:** a route change that resizes the monitor clears the sweep (the renderer
redraws from the resize point), visible when going Instructor → Monitor (R-S9-1); the saadat-like idle alarm bar is the
brightest object on screen when nothing is wrong (skin data, R-S9-1); `ScenarioDriver` bundles 5 of the 11 scenario
documents (the app loads all 11 itself, R-S9-2).

## Exceptions (edits outside the partition; E-S9-1, E-S9-2 and E-S9-3 APPROVED by the orchestrator on the R50 review; E-S9-4 as below)

- **E-S9-1** (Task 19): `apps/demo/index.html` — the whole file becomes the app page; the old stage list lives on as
  data in `app/views/dev.ts`. No e2e opens `index.html` (checked: `grep -rn "index.html" apps/demo/e2e apps/demo/scripts`
  is empty on `776ebb5`).
- **E-S9-2** (Task 7): `packages/controller/src/session/host-session.ts` — delete the three-line guard; and
  `packages/controller/test/session/host-session.test.ts` — the test "acks rejections with the engine reason, and
  rejects MODELED-only and 6b-only commands" pinned the stub: its `pin` now expects `accepted: true` (the engine's own
  validation) and its title says so. Not a band (R45 concerns acceptance bands); it is a stale stub assertion. The
  other three rejections in that test are unchanged. A NEW test in the same file (R50 review F8) sends all four
  commands through the host: `pin` and `release all` accepted, `setMode modeled` accepted and visible in the engine's
  next `state` event, `setFactor` refused with the engine's own reason. APPROVED by the orchestrator (ruling 2).
- **E-S9-3** (Task 19): `packages/controller/src/panel/styles.ts` — the 6a drawer's `background:#111c` +
  `backdrop-filter:blur(6px)` become an opaque `#111` (brief §10). No test reads the style.
- **E-S9-4** (Task 7b; orchestrator ruling 1 on the R50 review, finding F3): Stage 9 takes FU-5's R-FU5-6 per-skin
  alarm-text alias tables and the TEMP-probe INOP label. mindray-, ge-, zoll- and lifepak-like print "ART NON-PULSATILE",
  "ART DISCONNECT", "ART ZEROING", "T1 NO TRANSDUCER" and the limit labels "ART S/D/M", "EtCO2", "T1"; philips-like keeps
  the IEC table's Philips aliases and saadat-like its own texts (the texts FU-5's tests pin). The tables are skin JSON
  data (`alarms.wording`, sourced in each file's provenance). **Needs the orchestrator's re-confirmation:** the ruling
  said "skin JSON data only", but no skin field for alarm wording exists on main — the texts are code tables in
  `engine-core/src/l3/alarms/{text,profile}.ts` and the skin schema is closed (`additionalProperties: false`). The
  smallest working form adds ONE optional schema/type field (`packages/skins/src/{schema,types}.ts`) and THREE lines
  that read it (`profile.ts`: `texts` and the limit label; `text.ts`: `p.texts?.[id] ?? IEC_TEXT[id]`). Nothing else in
  the engine changes: levels, delays, latching, suppression and the renderer are untouched, and no existing test changes
  (FU-5's tests pin philips-like and saadat-like texts, which keep theirs; the skins snapshot does not cover `alarms`).
  If the orchestrator keeps "JSON only", Task 7b is skipped whole (inert data would be dead) and R-FU5-6 moves to the
  FU-5 follow-up with R-S9-8.

## Requests to other stages

- **R-S9-1 → FU-5 / renderer (v1.1 if FU-5 has merged):** (a) redraw the last lane-width of samples after a resize so
  a view change does not blank the sweep — **accepted for v1.0 (orchestrator ruling 3 on the R50 review):** a
  Monitor ↔ Instructor switch resizes the monitor and the sweep restarts from the resize point; the gate note and the
  user guide (R-S9-5) say so; (b) an `aria-label` hook on the monitor canvas (the app sets one on its host
  element meanwhile) and a "read vitals" summary string the app can announce on demand (brief §9); (c) the saadat-like
  idle message bar (#E0E0E0 slab) under a teaching theme, and projector-light NIBP grey (3.45:1) darkened to ≥ #6B7482
  (brief §6.2) — skin data, Ali's call.
- **R-S9-2 → controller (6a/6b owner):** `describe`/`describeTransition` print engine ids (`etco2 ≥ 20 → rosc`); the
  app keeps clinical copies (`describe.ts`, `triggers.ts`) — a label hook in the controller would remove the
  duplication; and `BUILTIN_SCENARIOS` should register all 11 documents (today 5). After E-S9-2 the host forwards `pin`
  in either mode and the engine accepts it in MANUAL too, but the 6a drawer (`panel/render-controls.ts:100`, still
  served under Developer) disables Pin/Release outside MODELED with the stale tooltip "Pin and release need MODELED
  mode (Stage 7)", and `vocabulary.ts:18` says the same: update the tooltip, or keep the MANUAL gating as a deliberate
  6a choice with a current tooltip. Stage 9 does not edit either file (R50 review F9).
- **R-S9-3 → 7k (respiratory mechanics):** publish ΔP, Ppeak, PL, Cdyn, auto-PEEP, VD/VT, ERV/RV/TLC/VC/IC and the
  P–V / F–V loop data on truth paths, and add each path to the glossary's §5.6 entries (`keys`), so Explore →
  "Respiratory mechanics and volumes" fills and timed task 5 passes. Stage 9 Task 0 wires whatever 7k published.
- **R-S9-4 → 6b / 8b (`pme-scenario/1`):** optional `category`, `story` (learner-facing), `objectives[]`,
  `durationMin`, so `app/scenario-meta.ts` can go; state `label` required for every state.
- **R-S9-5 → 8b (release):** the user guide's chapters follow the app's views and use `docs/gates/stage-9/*.png`; the
  README's first link is the app (`index.html`), the stage pages move to a "Developer" section. The guide states the
  v1.0 limits Stage 9 accepts: switching between the learner Monitor and the Instructor view restarts the sweep from
  the point where the monitor was resized (orchestrator ruling 3); a Remote pairs in the same browser only, tablet
  pairing over the relay is version 1.1 (ruling 6).
- **R-S9-6 → engine/controller:** a sensor-state map in the 1 Hz `state` event, so a Remote shows which sensors are
  attached. Until then the host's Devices tab shows its own last command and a Remote's sensor toggles start with no
  pressed state, with one line saying the monitor does not report them yet (R50 review F14).
- **R-S9-7 → FU-4/V.1/FU-6/FU-7 labels:** new truth leaves (`lp.waterShunt`, `pleuralCmH2O`, `resp.gaLvl`, `resp.bd`,
  `neuro.resp.loc`, `neuro.resp.pain`, `neuro.resp.hvrDep`, `resp.driver.vent.pmax`, `resp.palvObs`, the FU-7
  `pk.bus.cns.*` equivalents) get glossary entries in `GLOSSARY_S9` at Task 0 with the labels those plans proposed, so
  they appear in Explore with a clinical name instead of under "Model internals".
- **R-S9-8 → FU-5 follow-up (orchestrator ruling 1 on the R50 review):** the parts of FU-5's R-FU5-6 that are not
  wording: the computed-but-untiled numerics (`imco2` → FiCO₂/imCO₂, `mac`, `etAa`, `qtc`; research/11 §4 item 8), the
  agent tile (audit cell A10-E5), and "PR" as the label of the HR alarm when the HR source is the pulse (a run-time
  choice of the HR source, not a static alias). Stage 9 does not take them.
- **Declined on the record — R-FU5-9** (FU-5 → "FU-5 or Stage 9, whichever lands after it": replace the pleth line's SVR
  factor with `1 / circOut.skinTone`): renderer physiology, outside Stage 9's partition and R51. It stays with FU-5 /
  FU-4 (the owner of `skinTone`).

## Architecture in one page

```
index.html ── src/app/main.ts ── Shell (shell.ts): top bar · session bar · .stage (monitor host, created once) · <section> per view
   │                                  routes: router.ts  #/  #/monitor  #/teach  #/remote  #/explore/<system>  #/vent  #/validate/<tool>  #/dev  #/settings
   │
   ├── AppSession (session.ts) ─ mountMonitor(.stage)  ← only restart()/loadScenario() remount, behind a stable HostTarget
   │        ├── HostSession (6a) ── in-process hub ─┬─ panel ControllerSession ── Link (link.ts) ── Instructor panel + session bar
   │        │                                      └─ BroadcastChannel/relay ── (another device) #/remote: ControllerSession ── Link ── the same panel
   │        └── ScenarioDriver (6b) ── scenario JSON (scenarios.ts: every pme-scenario/1 file) + scenario-meta.ts (cards)
   │
   ├── Views: start · monitor (reveal gestures) · teach (panel/panel.ts + 8 tabs) · remote (QR, qr.ts) · explore (7x ConsoleModel,
   │          glossary rows) · vent (Stage V iframe + link port) · validate (8a iframes) · dev (stage pages) · settings (site.ts)
   │
   └── Labels: glossary-data.ts (research/11 §5 + S9 additions + KEY_LABELS) → glossary.ts (lookup, labelOf, unitOf, tooltips)
              vitals.ts / drugs.ts / rhythms.ts / describe.ts / triggers.ts: clinical words for targets, doses, rhythms, logs, triggers
```

- **State.** Engine state lives in the engine. The panel reads it from the controller session (`state` 1 Hz: values,
  control flags, mode, rhythm; `measurement`; scenario view; bookmarks) and from the transport tap (`alarmStatus`,
  `deviceStatus`). Local UI state: the staging buffer (per panel), onset ramps in progress (`Link.ramps`), the clinical
  log (`Link.log`), the site profile (`localStorage` `pme.site`), the last tab (`pme.tab`).
- **Routing.** `hashchange` → `Shell.show(route)` → the previous view's `leave()`, `hidden` toggles, the next view's
  `enter(sub)`, `main[data-route]` for the CSS grid. A document opened at `#/remote` is a Remote (no engine).
- **Performance.** The monitor draws in its worker; the shell's DOM work is ≤ 2 Hz per surface in one rAF; hidden views
  do no work; no blur over the canvas; measured frame intervals unchanged (above).

## File map

| File | Task | Change |
|---|---|---|
| `apps/demo/src/app/app.css`, `color.ts`, `tokens.test.ts` | 1 | tokens, layout, components; contrast arithmetic; token test |
| `apps/demo/src/app/glossary-data.ts`, `glossary.ts`, `glossary.test.ts` | 2 | the R56 glossary (research/11 §5 + S9 + KEY_LABELS), lookup |
| `apps/demo/src/app/store.ts`, `ui.ts`, `router.ts`, `router.test.ts`, `ui.dom.test.ts` | 3 | localStorage wrapper, components, routes |
| `apps/demo/src/app/site.ts`, `site.test.ts`, `patients.ts`, `patients.test.ts`, `scenario-meta.ts`, `scenarios.ts` | 4 | site profile, patients, scenario library |
| `apps/demo/src/app/vitals.ts`, `drugs.ts`, `rhythms.ts`, `describe.ts`, `triggers.ts`, `copy.test.ts` | 5 | clinical words |
| `apps/demo/src/app/session.ts`, `link.ts`, `staging.ts`, `staging.test.ts` | 6 | one engine session, the panel's link, staging |
| `packages/controller/src/session/host-session.ts`, `packages/controller/test/session/host-session.test.ts` | 7 | E-S9-2 |
| `packages/skins/src/{types,schema}.ts`, `packages/skins/src/data/skins/{mindray,ge,zoll,lifepak}-like.json`, `packages/engine-core/src/l3/alarms/{profile,text}.ts`, `packages/skins/test/stage9-wording.test.ts`, `packages/engine-core/test/l3/alarms/stage9-wording.test.ts` | 7b | E-S9-4: per-skin alarm wording (FU-5 R-FU5-6) |
| `apps/demo/src/app/shell.ts`, `shell.dom.test.ts` | 8 | frame, routing, skin alarm colours and priority marks |
| `apps/demo/src/app/panel/ctx.ts`, `commands.ts`, `cards.ts`, `panel/vitals.ts` | 9 | Vitals & rhythm |
| `apps/demo/src/app/panel/scenario.ts` | 10 | Scenario |
| `apps/demo/src/app/panel/drugs.ts` | 11 | Drugs & fluids |
| `apps/demo/src/app/panel/airway.ts`, `panel/defib.ts` | 12 | Airway & ventilation; Defib, pacing & CPR |
| `apps/demo/src/app/alarms.ts`, `alarms.test.ts`, `panel/devices.ts`, `panel/patient.ts`, `panel/log.ts` | 13 | alarm mirror in glossary words; Devices & alarms; Patient; Log |
| `apps/demo/src/app/panel/panel.ts`, `sessionbar.ts` | 14 | panel frame, staged footer, shortcuts, session bar |
| `apps/demo/src/app/learner.ts`, `views/start.ts`, `views/monitor.ts`, `views/teach.ts` | 15 | learner controls strip; Start, Monitor, Instructor |
| `apps/demo/src/app/qr.ts`, `qr.test.ts`, `pairing.ts`, `pairing.test.ts`, `views/remote.ts` | 16 | QR, pairing rule (same browser in v1.0), Remote |
| `apps/demo/src/app/views/explore.ts` | 17 | Explore physiology |
| `apps/demo/src/app/views/vent.ts`, `views/validate.ts`, `views/dev.ts`, `views/settings.ts` | 18 | Ventilator, Validate, Developer, Settings |
| `apps/demo/src/app/main.ts`, `apps/demo/index.html` (E-S9-1), `packages/controller/src/panel/styles.ts` (E-S9-3) | 19 | wire-up |
| `apps/demo/public/fonts/**`, `NOTICES.md`, `LICENSES/OFL-1.1.txt`, `app.css` `@font-face` | 20 | ONLY if Ali approves Q7 |
| `apps/demo/e2e/stage9-support.ts`, `stage9-app.e2e.ts`, `stage9-glossary.e2e.ts` | 21 | session, remote, glossary e2e |
| `apps/demo/e2e/stage9-a11y.e2e.ts` | 22 | accessibility audit |
| `apps/demo/e2e/stage9-tasks.e2e.ts` | 23 | five timed tasks |
| `apps/demo/e2e/stage9-png8.ts`, `stage9-shots.e2e.ts`, `apps/demo/scripts/stage9-frames.mjs` | 24 | screenshots, frame gate |
| `docs/gates/stage-9.md`, `docs/gates/stage-9/*.png` | 25 | gate |


---

### Task 0: Base check — worktree, merged stages, the four existing-file edits, and glossary keys for new truth leaves

**Files:**
- Modify (only per Step 5): `apps/demo/src/app/glossary-data.ts` does not exist yet — Step 5 writes a NOTE into
  `<scratchpad>/stage-9-clinical-ui/glossary-additions.md` that Task 2 applies.

**Why:** Stage 9 is prototyped on `origin/main` `776ebb5` (FU-5 merged); it executes after FU-4, FU-5, V.1,
FU-6, FU-7 and 7k have merged. The app is new files, so only four blocks can drift, and the glossary must learn the
truth paths those stages added (7k's mechanics above all, Request R-S9-3).

- [ ] **Step 1: Worktree and branch**

```bash
cd projects/patient-monitor-engine/repo
git fetch origin
git log --oneline origin/main | grep -E "FU-4|FU-5|V\.1|FU-6|FU-7|7k" | head -20   # all six merged? if one is missing, STOP and report
git worktree add ../scratch/wt-stage-9 -b stage-9-clinical-ui origin/main
cd ../scratch/wt-stage-9
npx -y pnpm@9.15.9 install --frozen-lockfile
mkdir -p <scratchpad>/stage-9-clinical-ui
```

- [ ] **Step 2: Baseline** — record the counts the gate compares against:

```bash
npx -y pnpm@9.15.9 typecheck
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run > <scratchpad>/stage-9-clinical-ui/base-demo.log 2>&1
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run > <scratchpad>/stage-9-clinical-ui/base-controller.log 2>&1
tail -4 <scratchpad>/stage-9-clinical-ui/base-*.log
```

Expected: typecheck clean; demo and controller green (prototype base: demo 16 files / 141 tests before Stage 9's
tests, controller 37 files / 215 tests).

- [ ] **Step 3: The four find blocks still match exactly once** (E-S9-1, E-S9-2 ×2, E-S9-3):

```bash
grep -c "Patient-monitor engine demos" apps/demo/index.html                                  # 2 (title + h1): the old list page
grep -c "needs MODELED mode (Stage 7)" packages/controller/src/session/host-session.ts         # 1
grep -c "rejects MODELED-only and 6b-only commands" packages/controller/test/session/host-session.test.ts  # 1
grep -c "backdrop-filter:blur(6px)" packages/controller/src/panel/styles.ts                   # 1
```

If a count differs, a merged stage changed the file: open it, locate the same statement by its quoted text and make the
same change in Tasks 7/19 (never re-type a line you are not changing). If `index.html` gained links (e.g. FU-4's
`fu4.html`), add them to `EVIDENCE` or `TOOLS` in `app/views/dev.ts` (Task 18) instead of keeping them in the page.

- [ ] **Step 4: Imports the app relies on still exist** (all are exported on `776ebb5`; a rename by a later stage is
  followed, never worked around):

```bash
grep -n "export { mountMonitor" packages/renderer/src/index.ts
grep -n "export class ConsoleModel\|export function fmtValue\|export type GroupId" apps/demo/src/physiology-console/{model,format,organs}.ts
grep -n "export const bolus\|export const infusion\|export const vaporiser\|export const fluid\|export const lungCondition\|export const ventilation" apps/demo/src/physiology-console/actions.ts
grep -n "export function attachMonitorToLink\|export function createBroadcastPort" packages/ventilator/src/link/port.ts
grep -n "DRUGS, DRUG_IDS\|LUNG_CONDITIONS\|RHYTHM_IDS" packages/engine-core/src/index.ts
grep -n "stage1Vocabulary\|manualLabel" packages/controller/src/index.ts packages/controller/src/vocabulary.ts packages/controller/src/scenario/describe.ts | head
```

- [ ] **Step 5: New truth leaves → glossary keys (R56; Requests R-S9-3, R-S9-7).** On the merged base, list every
  truth path the console shows that the glossary will not name:

Both steps are scripted (R50 review F15: an agent executor has no manual browser). Save the two scratch scripts
below under `<scratchpad>/stage-9-clinical-ui/` (they are NOT repository files; run them from the worktree root, they
resolve Playwright and Vite from `apps/demo`). The dump:

```js
// Task 0 Step 5 (R50 review F15): open the 7x physiology console, let it run for 70 s, save its JSON export.
// Run from the worktree root: node <scratchpad>/stage-9-clinical-ui/console-dump.mjs http://127.0.0.1:4899 <out.json> [seconds]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const req = createRequire(resolve('apps/demo/package.json')); // @playwright/test as the repo installs it
const { chromium } = req('@playwright/test');
const [base, out, secs = '70'] = process.argv.slice(2);
if (!base || !out) throw new Error('usage: console-dump.mjs <base url> <out.json> [seconds]');
const b = await chromium.launch(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {});
const p = await b.newPage();
await p.goto(`${base}/physiology-console.html`);
await p.waitForFunction(() => window.__pmeConsole?.ready === true);
await p.waitForTimeout(Number(secs) * 1000);
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=json]')]);
await dl.saveAs(out);
await b.close();
console.log(`saved ${out}`);
```

The check (needs `glossary.ts`, so it runs at Task 2 Step 4, after Step 2 has created the file):

```js
// Task 0 Step 5 (R50 review F15): every truth path in a console dump that the glossary does not label, grouped by the
// console's organ group, so the executor can add the 7k mechanics keys and the R-S9-7 labels. Vite loads the app's
// glossary module the way the app does (TypeScript, workspace packages).
// Run from the worktree root: node <scratchpad>/stage-9-clinical-ui/labels-check.mjs <console.json> > <scratchpad>/stage-9-clinical-ui/unlabelled.txt
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const req = createRequire(resolve('apps/demo/package.json'));
const { createServer } = req('vite');
const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vite = await createServer({ root: resolve('apps/demo'), configFile: resolve('apps/demo/vite.config.ts'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const g = await vite.ssrLoadModule('/src/app/glossary.ts');
const byGroup = new Map();
for (const [path, v] of Object.entries(dump.values)) {
  if (g.labelOf(path) !== null) continue;
  byGroup.set(v.group, [...(byGroup.get(v.group) ?? []), path]);
}
for (const [group, paths] of byGroup) console.log(`## ${group} (${paths.length})\n${paths.join('\n')}\n`);
console.log(`labelled ${Object.keys(dump.values).length - [...byGroup.values()].flat().length} of ${Object.keys(dump.values).length}`);
await vite.close();
```

```bash
(cd apps/demo && npx vite --port 4899 --strictPort > <scratchpad>/stage-9-clinical-ui/vite-t0.log 2>&1 &)
until curl -s -o /dev/null http://127.0.0.1:4899/; do sleep 1; done
node <scratchpad>/stage-9-clinical-ui/console-dump.mjs http://127.0.0.1:4899 <scratchpad>/stage-9-clinical-ui/console.json 70
pkill -f "vite --port 4899"
# at Task 2 Step 4, once glossary.ts exists:
node <scratchpad>/stage-9-clinical-ui/labels-check.mjs <scratchpad>/stage-9-clinical-ui/console.json > <scratchpad>/stage-9-clinical-ui/unlabelled.txt
```

The check prints the unlabelled paths by console group and a "labelled N of M" line (prototype on `origin/main`
`776ebb5`, 12 s run: 246 of 1,586; most of the rest are model internals and stay so, research/11 §5.16 rule 5). For
each 7k mechanics/volume path (ΔP, Ppeak, PL, Pes, Cdyn, auto-PEEP, VD/VT, ERV, RV, TLC, VC,
IC, FEV₁/FVC, τE) ADD the path to the `keys` of the matching research/11 §5.6 entry in `glossary-data.ts` (entries
146–170 by label); for the FU-4/V.1/FU-6/FU-7 leaves listed in R-S9-7 add `GLOSSARY_S9` entries numbered from 300 with
the label the owning plan proposed, a full name, unit and "—" normal. Record every addition in
`<scratchpad>/stage-9-clinical-ui/glossary-additions.md`; Task 2 applies it and Task 25's gate note lists it for
Ali's review. Nothing to commit in Task 0.

---

### Task 1: Design tokens, layout and component styles (`app.css`), contrast arithmetic and the token test

**Files:**
- Create: `apps/demo/src/app/app.css`
- Create: `apps/demo/src/app/color.ts`
- Create: `apps/demo/src/app/tokens.test.ts`

**Interfaces:** Produces the CSS custom properties every later task uses (`--bezel-*`, `--text*`, `--accent*`, `--target`, `--panel-w`, `--alarm-*`) and `contrast(a, b)` (`color.ts`).

**Why:** The brief's §6 token table, the "bezel and screen" direction (frontend-design: boldness spent on the monitor only), the layout grid of §8 (split / drawer / portrait sheet, D21) and every component style of §7 in ONE stylesheet with no UI library. Alarm colours are defaults only; the shell replaces them from the skin at run time (D5). The test re-computes the brief's contrast table from the file (brief §11.4).

- [ ] **Step 1: Create `apps/demo/src/app/app.css`**

```css
/* Stage 9 app shell: "bezel and screen" (research/13 brief §6). The monitor is the screen — true black, the skin's own
   colours, untouched. Everything else is the bezel: graphite, quiet, colour only for state. One instructor accent
   (periwinkle) marks what the instructor controls; alarm colours are never shell tokens (they come from the skin).
   System fonts by default (the OFL fonts wait for Ali's ruling, Open question Q7). No UI library. */

:root {
  color-scheme: dark;
  --screen: #000;
  --bezel-0: #0e1116;
  --bezel-1: #151a21;
  --bezel-2: #1c222b;
  --bezel-3: #262e39;
  --line: #35404e;
  --line-strong: #6b7788;
  --text: #d6dde6;
  --text-strong: #f3f6f9;
  --text-muted: #9aa6b5;
  --text-faint: #7d8898;
  --accent: #8c9bff;
  --accent-strong: #a3aeff;
  --on-accent: #0e1116;
  --danger: #ff6369;
  --scrim: rgb(0 0 0 / 0.4);
  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-num: var(--font-ui);
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --t-12: 12px; --t-13: 13px; --t-15: 15px; --t-18: 18px; --t-22: 22px; --t-26: 26px; --t-32: 32px; --t-44: 44px;
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px;
  --r-chip: 3px; --r-control: 6px; --r-card: 10px;
  --target: 44px;
  --bar-h: 52px;
  --panel-w: 440px;
  --motion: 180ms;
  /* alarm mirror colours: replaced at run time from the active skin (shell.ts `applySkinAlarmColours`) */
  --alarm-high-bg: #d1001c; --alarm-high-fg: #fff;
  --alarm-medium-bg: #ffff00; --alarm-medium-fg: #000;
  --alarm-low-bg: #00ffff; --alarm-low-fg: #000;
}
/* Light "bench" palette: Explore physiology, Validate, Developer, Settings (and the whole shell under projector-light). */
.bench, :root[data-theme='bench'] {
  color-scheme: light;
  --bezel-0: #ffffff;
  --bezel-1: #f6f7f9;
  --bezel-2: #edeff3;
  --bezel-3: #e3e6eb;
  --line: #d9dde3;
  --line-strong: #6b7482;
  --text: #1b2330;
  --text-strong: #0b1220;
  --text-muted: #5b6675;
  --text-faint: #5b6675;
  --accent: #3a4fd9;
  --accent-strong: #2a3cb8;
  --on-accent: #ffffff;
  --danger: #c2362f;
}
.bench { color: var(--text); background: var(--bezel-0); }
@media (prefers-contrast: more) {
  :root { --line: var(--line-strong); --text-muted: var(--text); --text-faint: var(--text); }
}
@media (pointer: fine) and (min-width: 1100px) {
  :root { --target: 36px; }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bezel-0);
  color: var(--text);
  font: 400 var(--t-15) / 1.35 var(--font-ui);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--accent-strong); outline-offset: 2px; }
.num { font-family: var(--font-num); font-variant-numeric: tabular-nums; }
.muted { color: var(--text-muted); }
.unit { color: var(--text-muted); font-size: 0.87em; margin-left: 0.2em; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.skip { position: absolute; left: var(--s-2); top: -60px; z-index: 50; background: var(--accent); color: var(--on-accent); padding: var(--s-2) var(--s-3); border-radius: var(--r-control); }
.skip:focus { top: var(--s-2); }

/* ---------- app frame ---------- */
.app { display: grid; grid-template-rows: var(--bar-h) minmax(0, 1fr); height: 100dvh; }
.app[data-route='monitor'] { grid-template-rows: minmax(0, 1fr); }
.app[data-route='monitor'] > .topbar { display: none; }
.topbar {
  display: flex; align-items: center; gap: var(--s-3); padding: 0 var(--s-3);
  background: var(--bezel-1); border-bottom: 1px solid var(--line); min-width: 0;
}
.brand { font-weight: 600; color: var(--text-strong); white-space: nowrap; font-size: var(--t-15); text-decoration: none; }
.nav { display: flex; gap: 2px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.nav a {
  display: inline-flex; align-items: center; min-height: var(--target); padding: 0 var(--s-3); border-radius: var(--r-control);
  color: var(--text-muted); text-decoration: none; white-space: nowrap;
}
.nav a:hover { color: var(--text-strong); background: var(--bezel-2); }
.nav a[aria-current='page'] { color: var(--text-strong); background: var(--bezel-3); box-shadow: inset 0 -2px 0 var(--accent); }
.topbar .spacer { flex: 1; }
.topright { display: flex; align-items: center; gap: var(--s-2); flex: none; }
@media (max-width: 1379px) { .brand { display: none; } }
@media (max-width: 900px) { .topright .sound, .code-pill .muted { display: none; } }

/* The monitor region ("stage") never leaves the DOM while a session lives; each route places it by grid area. */
.main { position: relative; display: grid; min-height: 0; min-width: 0; overflow: hidden; grid-template: 'view' minmax(0, 1fr) / minmax(0, 1fr); }
.stage { grid-area: stage; position: relative; background: var(--screen); contain: strict; min-width: 0; min-height: 0; }
.stage > .monitor-host { position: absolute; inset: 0; }
.stage[hidden] { display: none; }
.sessionbar { grid-area: bar; display: none; }
.view { grid-area: view; min-width: 0; min-height: 0; overflow: auto; background: var(--bezel-0); }
.view[hidden] { display: none; }
.main:not([data-route='start']):not([data-route='monitor']):not([data-route='teach']):not([data-route='vent']) > .stage { display: none; }
.main[data-route='monitor'] > .view:not([data-view='monitor']) { display: none; }

.main[data-route='start'] { grid-template: 'view stage' minmax(0, 1fr) / minmax(440px, 1fr) minmax(0, 1.25fr); }
.main[data-route='monitor'] { grid-template: 'stage' minmax(0, 1fr) 'view' auto / minmax(0, 1fr); }
.main[data-route='monitor'] > .view[data-view='monitor'] { overflow: visible; }
.main[data-route='teach'] { grid-template: 'bar bar' auto 'stage view' minmax(0, 1fr) / minmax(0, 1fr) var(--panel-w); }
.main[data-route='teach'] > .sessionbar, .main.hostless[data-route='remote'] > .sessionbar:not([hidden]) { display: flex; }
.main.hostless[data-route='remote'] { grid-template: 'bar' auto 'view' minmax(0, 1fr) / minmax(0, 1fr); }
.main[data-route='vent'] { grid-template: 'view stage' minmax(0, 1fr) / minmax(0, 1fr) minmax(0, 1fr); }
@media (min-width: 1800px) { :root { --panel-w: 560px; } }
@media (max-width: 1439px) { :root { --panel-w: 420px; } }

/* Drawer: the site chose it, or the screen is narrower than monitor 760 px + panel. The panel overlays the monitor's
   cell from the right (the 6a pattern), opaque (no blur over a canvas that redraws every frame, brief §10). */
.main[data-route='teach'][data-panel='drawer'] { grid-template: 'bar' auto 'stage' minmax(0, 1fr) / minmax(0, 1fr); }
.main[data-route='teach'][data-panel='drawer'] > .view[data-view='teach'] {
  grid-area: stage; justify-self: end; width: min(var(--panel-w), 92vw); z-index: 5; border-left: 1px solid var(--line-strong);
  transform: translateX(100%); transition: transform var(--motion) ease-out; visibility: hidden;
}
.main[data-route='teach'][data-panel='drawer'][data-drawer='open'] > .view[data-view='teach'] { transform: none; visibility: visible; }
.stage > .drawer-toggle { display: none; position: absolute; right: var(--s-2); bottom: var(--s-2); z-index: 6; }
.main[data-route='teach'][data-panel='drawer'] .stage > .drawer-toggle { display: inline-flex; }
@media (max-width: 1199px) {
  .main[data-route='teach'] { grid-template: 'bar' auto 'stage' minmax(0, 1fr) / minmax(0, 1fr); }
  .main[data-route='teach'] > .view[data-view='teach'] {
    grid-area: stage; justify-self: end; width: min(var(--panel-w), 92vw); z-index: 5; border-left: 1px solid var(--line-strong);
    transform: translateX(100%); transition: transform var(--motion) ease-out; visibility: hidden;
  }
  .main[data-route='teach'][data-drawer='open'] > .view[data-view='teach'] { transform: none; visibility: visible; }
  .main[data-route='teach'] .stage > .drawer-toggle { display: inline-flex; }
  .main[data-route='vent'] { grid-template: 'view' minmax(0, 1fr) 'stage' 42% / minmax(0, 1fr); }
}
/* iPad portrait: monitor on top, the panel as a sheet under it */
@media (max-width: 900px) and (orientation: portrait) {
  .main[data-route='teach'] { grid-template: 'bar' auto 'stage' 42% 'view' minmax(0, 1fr) / minmax(0, 1fr); }
  .main[data-route='teach'] > .view[data-view='teach'] { grid-area: view; width: auto; justify-self: stretch; transform: none; visibility: visible; border-left: 0; border-top: 1px solid var(--line-strong); }
  .main[data-route='teach'] .stage > .drawer-toggle { display: none; }
  .main[data-route='start'] { grid-template: 'stage' 36% 'view' minmax(0, 1fr) / minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .view, .toast, dialog { transition: none !important; } }

/* ---------- controls ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2);
  min-height: var(--target); min-width: var(--target); padding: 0 var(--s-4);
  border-radius: var(--r-control); border: 1px solid var(--line-strong); background: var(--bezel-3); color: var(--text-strong);
  cursor: pointer; white-space: nowrap; text-decoration: none; font-weight: 500;
}
.btn:hover { border-color: var(--text-muted); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.btn.primary:hover { background: var(--accent-strong); }
.btn.ghost { background: transparent; border-color: transparent; color: var(--text); }
.btn.ghost:hover { background: var(--bezel-2); }
.btn.danger { background: transparent; border-color: var(--danger); color: var(--danger); }
.btn.small { min-height: 32px; min-width: 32px; padding: 0 var(--s-3); font-size: var(--t-13); }
.btn[aria-pressed='true'] { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.btn[aria-pressed='true']::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.field { display: grid; gap: var(--s-1); min-width: 0; }
.field > span, .field > label { font-size: var(--t-13); color: var(--text-muted); }
.input, select.input {
  min-height: var(--target); padding: 0 var(--s-3); border-radius: var(--r-control); border: 1px solid var(--line-strong);
  background: var(--bezel-2); color: var(--text-strong); min-width: 0; width: 100%;
}
select.input { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%); background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
input[type='checkbox'], input[type='radio'] { flex: none; width: 24px; height: 24px; accent-color: var(--accent); margin: 0; }
.check { display: inline-flex; align-items: center; gap: var(--s-2); min-height: var(--target); cursor: pointer; }
.seg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: var(--r-control); overflow: hidden; }
.seg button { min-height: var(--target); min-width: var(--target); padding: 0 var(--s-3); background: var(--bezel-2); border: 0; border-right: 1px solid var(--line); color: var(--text); cursor: pointer; }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed='true'] { background: var(--accent); color: var(--on-accent); font-weight: 600; }

/* numeric stepper with unit: − value + */
.stepper { display: inline-grid; grid-template-columns: var(--target) minmax(64px, 1fr) var(--target); align-items: stretch; border: 1px solid var(--line-strong); border-radius: var(--r-control); background: var(--bezel-2); }
.stepper button { border: 0; background: transparent; color: var(--text-strong); font-size: var(--t-18); cursor: pointer; min-height: var(--target); }
.stepper button:hover { background: var(--bezel-3); }
.stepper input { border: 0; background: transparent; text-align: center; min-width: 0; color: var(--text-strong); font-family: var(--font-num); font-variant-numeric: tabular-nums; font-size: var(--t-18); -moz-appearance: textfield; }
.stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

/* chips: pin (instructor-controlled), wave (modeled), transition progress, model override */
.chip { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 0 var(--s-2); border-radius: var(--r-chip); font-size: var(--t-12); border: 1px solid var(--line-strong); color: var(--text-muted); white-space: nowrap; }
.chip.pinned { border-color: var(--accent); color: var(--accent); }
.chip.override { border-style: dashed; color: var(--text-strong); }
.chip svg { width: 12px; height: 12px; }

/* ---------- session bar (inside the top bar) ---------- */
.session { display: flex; align-items: center; gap: var(--s-2); min-width: 0; }
.session .who { color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 26ch; }
.session .clock { font-family: var(--font-num); font-variant-numeric: tabular-nums; color: var(--text-strong); min-width: 5ch; text-align: right; }
.mode-badge { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 var(--s-3); border-radius: var(--r-control); border: 1px solid var(--line-strong); background: transparent; color: var(--text-strong); cursor: pointer; font-weight: 600; font-size: var(--t-13); white-space: nowrap; }
.mode-badge[data-mode='manual'] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.mode-badge .pins { color: var(--accent); font-weight: 600; }
.alarm-count { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; max-width: 30ch; overflow: hidden; text-overflow: ellipsis; padding: 0 var(--s-3); border-radius: var(--r-control); border: 1px solid var(--line); color: var(--text-muted); font-size: var(--t-13); white-space: nowrap; background: transparent; cursor: pointer; }
.alarm-count[data-level='high'] { background: var(--alarm-high-bg); color: var(--alarm-high-fg); border-color: transparent; }
.alarm-count[data-level='medium'] { background: var(--alarm-medium-bg); color: var(--alarm-medium-fg); border-color: transparent; }
.alarm-count[data-level='low'] { background: var(--alarm-low-bg); color: var(--alarm-low-fg); border-color: transparent; }
.code-pill { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); letter-spacing: 0.08em; font-size: var(--t-13); color: var(--text-strong); border: 1px solid var(--line-strong); border-radius: var(--r-control); padding: 0 var(--s-3); white-space: nowrap; text-decoration: none; min-height: 36px; }
.code-pill .muted { font-family: var(--font-ui); letter-spacing: 0; }
.code-pill:hover { border-color: var(--text-muted); }

/* ---------- instructor panel ---------- */
.view[data-view='teach'] { overflow: hidden; }
.panel { display: grid; grid-template-rows: minmax(0, 1fr) auto; height: 100%; background: var(--bezel-1); border-left: 1px solid var(--line); min-width: 0; }
.tabs-wrap { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; }
.tabpanels { min-height: 0; overflow: auto; overscroll-behavior: contain; }
.tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--line); }
.tabs [role='tab'] { min-height: var(--target); padding: 2px var(--s-2); border: 0; background: transparent; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; font-size: var(--t-13); line-height: 1.15; }
.tabs [role='tab'][aria-selected='true'] { color: var(--text-strong); border-bottom-color: var(--accent); }
.tabs [role='tab']:hover { color: var(--text-strong); }
.tabpanel { overflow: auto; padding: var(--s-3) var(--s-4) var(--s-5); min-height: 0; }
.tabpanel[hidden] { display: none; }
.tabpanel h3 { font-size: var(--t-15); font-weight: 600; color: var(--text-strong); margin: var(--s-4) 0 var(--s-2); }
.tabpanel h3:first-child { margin-top: var(--s-1); }
.tabpanel .hint { color: var(--text-muted); font-size: var(--t-13); margin: var(--s-1) 0 var(--s-3); }
.row { display: flex; flex-wrap: wrap; gap: var(--s-2); align-items: center; margin: var(--s-2) 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-2) var(--s-3); }

/* parameter row: label + tooltip, live value, stepper target, onset, pin/return */
.param { display: grid; grid-template-columns: minmax(92px, 1fr) auto; gap: var(--s-1) var(--s-2); padding: var(--s-2) 0; border-bottom: 1px solid var(--line); }
.param .lbl { display: flex; align-items: center; gap: var(--s-2); min-width: 0; }
.param .lbl b { color: var(--text-strong); font-weight: 600; }
.param .now { justify-self: end; font-family: var(--font-num); font-variant-numeric: tabular-nums; color: var(--text-strong); font-size: var(--t-18); }
.param .edit { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: var(--s-2); align-items: center; }
.param[data-staged='true'] { outline: 1px dashed var(--accent); outline-offset: 2px; border-radius: var(--r-control); }
.progress { grid-column: 1 / -1; height: 3px; background: var(--bezel-3); border-radius: 2px; overflow: hidden; }
.progress > i { display: block; height: 100%; background: var(--accent); width: 0; }
.tip { border: 0; background: transparent; color: var(--text-muted); cursor: help; min-width: 24px; min-height: 24px; border-radius: 50%; font-size: var(--t-13); padding: 0; }
.tip:hover, .tip:focus-visible { color: var(--text-strong); }

/* staged-changes footer (the 6a stage bar grown up) */
.stagebar { display: grid; gap: var(--s-1); padding: var(--s-2) var(--s-3); border-top: 1px solid var(--line); background: var(--bezel-2); }
.stagebar-row { display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; }
.stagebar .count { flex: 1; min-width: 12ch; color: var(--text-muted); }
.stagebar .spacer { flex: 1; }
.staged-list { list-style: none; margin: 0; padding: 0; font-size: var(--t-13); color: var(--text); max-height: 5.5em; overflow: auto; }
.staged-list li::before { content: '+ '; color: var(--accent); }
.stagebar[data-count='0'] .staged-list { display: none; }
.field.inline { display: flex; align-items: center; gap: var(--s-2); }
.field.inline .input { width: auto; }
.stagebar[data-count]:not([data-count='0']) .count { color: var(--accent); font-weight: 600; }

/* cards: scenarios, start tiles, patient */
.card { background: var(--bezel-2); border: 1px solid var(--line); border-radius: var(--r-card); padding: var(--s-3) var(--s-4); display: grid; gap: var(--s-2); }
.card h4 { margin: 0; font-size: var(--t-15); color: var(--text-strong); }
.card p { margin: 0; }
.card[aria-current='true'] { border-color: var(--accent); }
.tags { display: flex; flex-wrap: wrap; gap: var(--s-1); }
.tag { font-size: var(--t-12); color: var(--text-muted); border: 1px solid var(--line); border-radius: var(--r-chip); padding: 1px 6px; }
.states { display: flex; flex-wrap: wrap; gap: var(--s-1); list-style: none; margin: 0; padding: 0; }
.states li { font-size: var(--t-13); padding: 4px var(--s-2); border-radius: var(--r-chip); border: 1px solid var(--line); color: var(--text-muted); }
.states li[aria-current='step'] { border-color: var(--accent); color: var(--text-strong); box-shadow: inset 3px 0 0 var(--accent); }

/* alarm mirror: skin colours, steady (no flash in the panel), priority as marker + word too */
.alarms { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-1); }
.alarms li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--s-2); padding: var(--s-1) var(--s-2); border-radius: var(--r-control); border: 1px solid var(--line); }
.alarms .pri { font-weight: 700; border-radius: var(--r-chip); padding: 2px 6px; font-size: var(--t-12); white-space: nowrap; }
.alarms .pri[data-level='high'] { background: var(--alarm-high-bg); color: var(--alarm-high-fg); }
.alarms .pri[data-level='medium'] { background: var(--alarm-medium-bg); color: var(--alarm-medium-fg); }
.alarms .pri[data-level='low'] { background: var(--alarm-low-bg); color: var(--alarm-low-fg); }

.log { list-style: none; margin: 0; padding: 0; font-size: var(--t-13); }
.log li { display: grid; grid-template-columns: 5ch auto 1fr; gap: var(--s-2); padding: 4px 0; border-bottom: 1px solid var(--line); }
.log time { font-family: var(--font-num); font-variant-numeric: tabular-nums; color: var(--text-muted); }
.log .k { font-size: var(--t-12); color: var(--text-muted); border: 1px solid var(--line); border-radius: var(--r-chip); padding: 0 4px; align-self: start; }
.log li[data-kind='marker'] .k, .log li[data-kind='note'] .k { border-color: var(--accent); color: var(--accent); }

/* ---------- views ---------- */
.page { max-width: 1180px; margin: 0 auto; padding: var(--s-5) var(--s-5) var(--s-7); }
.page h1 { font-size: var(--t-26); font-weight: 600; color: var(--text-strong); margin: 0 0 var(--s-1); letter-spacing: -0.01em; }
.page h2 { font-size: var(--t-18); font-weight: 600; color: var(--text-strong); margin: var(--s-6) 0 var(--s-3); }
.page .lede { color: var(--text-muted); margin: 0 0 var(--s-5); max-width: 70ch; }
.start-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: var(--s-5); align-items: start; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--s-3); }
.tile { display: grid; gap: var(--s-1); padding: var(--s-4); border-radius: var(--r-card); border: 1px solid var(--line); background: var(--bezel-1); color: var(--text); text-decoration: none; min-height: 96px; }
.tile:hover { border-color: var(--line-strong); background: var(--bezel-2); }
.tile b { color: var(--text-strong); font-size: var(--t-15); }
.tile span { color: var(--text-muted); font-size: var(--t-13); }
.setup { display: grid; gap: var(--s-3); padding: var(--s-4); border-radius: var(--r-card); border: 1px solid var(--line); background: var(--bezel-1); }
.setup .actions { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: var(--s-2); }
@media (max-width: 900px) { .start-grid { grid-template-columns: 1fr; } .page { padding: var(--s-4) var(--s-4) var(--s-6); } }

/* Explore / console table (bench theme) */
.xgrid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--s-4); }
.xnav { position: sticky; top: 0; align-self: start; display: grid; gap: 2px; }
.xnav a { display: flex; justify-content: space-between; min-height: 36px; align-items: center; padding: 0 var(--s-3); border-radius: var(--r-control); text-decoration: none; color: var(--text); }
.xnav a:hover { background: var(--bezel-2); }
.xnav a[aria-current='true'] { background: var(--bezel-3); color: var(--text-strong); box-shadow: inset 3px 0 0 var(--accent); }
.vitals { display: flex; flex-wrap: wrap; gap: var(--s-2); margin: 0 0 var(--s-4); }
.vital { display: grid; gap: 0; min-width: 96px; padding: var(--s-2) var(--s-3); border: 1px solid var(--line); border-radius: var(--r-control); background: var(--bezel-1); }
.vital b { font-size: var(--t-12); color: var(--text-muted); font-weight: 500; }
.vital .num { font-size: var(--t-22); color: var(--text-strong); }
table.values { width: 100%; border-collapse: collapse; font-size: var(--t-13); table-layout: fixed; }
table.values caption { text-align: left; font-weight: 600; color: var(--text-strong); font-size: var(--t-15); padding: var(--s-3) 0 var(--s-2); }
table.values thead th { text-align: left; font-weight: 500; color: var(--text-muted); border-bottom: 1px solid var(--line-strong); padding: 6px var(--s-2); position: sticky; top: 0; background: var(--bezel-0); z-index: 1; }
table.values tbody th { padding: 6px var(--s-2); border-bottom: 1px solid var(--line); vertical-align: top; }
table.values td { padding: 6px var(--s-2); border-bottom: 1px solid var(--line); vertical-align: top; }
table.values td.l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
table.values td.v, table.values th.v, table.values td.d, table.values th.d { text-align: right; font-family: var(--font-num); font-variant-numeric: tabular-nums; }
table.values td.v { color: var(--text-strong); font-weight: 600; }
table.values tr[data-dir='up'] td.d::before { content: '▲ '; }
table.values tr[data-dir='down'] td.d::before { content: '▼ '; }
table.values tr[data-dir] { background: color-mix(in srgb, var(--accent) 8%, transparent); }
table.values tr[data-out='true'] td.v { text-decoration: underline dotted var(--text-muted); text-underline-offset: 3px; }
.placeholder { border: 1px dashed var(--line-strong); border-radius: var(--r-card); padding: var(--s-4); color: var(--text-muted); }
@media (max-width: 900px) { .xgrid { grid-template-columns: 1fr; } .xnav { position: static; grid-auto-flow: column; overflow-x: auto; } }

/* dialogs, toasts */
dialog { border: 1px solid var(--line-strong); border-radius: var(--r-card); background: var(--bezel-1); color: var(--text); padding: var(--s-4) var(--s-5); max-width: min(560px, 92vw); }
dialog::backdrop { background: var(--scrim); }
dialog h2 { margin: 0 0 var(--s-2); font-size: var(--t-18); color: var(--text-strong); }
dialog .actions { display: flex; justify-content: flex-end; gap: var(--s-2); margin-top: var(--s-4); }
.toasts { position: fixed; bottom: var(--s-4); left: 50%; transform: translateX(-50%); display: grid; gap: var(--s-2); z-index: 40; pointer-events: none; }
.toast { background: var(--bezel-3); color: var(--text-strong); border: 1px solid var(--line-strong); border-left: 3px solid var(--accent); border-radius: var(--r-control); padding: var(--s-2) var(--s-4); box-shadow: 0 6px 24px rgb(0 0 0 / 0.35); }

/* monitor-view reveal strip (auto-hiding; the learner sees only the device) */
.reveal { position: absolute; top: 0; right: 0; z-index: 6; display: flex; gap: var(--s-2); padding: var(--s-2); opacity: 0; transition: opacity var(--motion); }
.stage:hover .reveal, .reveal:focus-within { opacity: 1; }
.iframe { width: 100%; height: 100%; border: 0; background: #071634; display: block; }
.empty { display: grid; place-items: center; min-height: 60vh; text-align: center; gap: var(--s-3); }
.empty p { max-width: 48ch; color: var(--text-muted); margin: 0 auto; }
.qr { background: #fff; padding: 12px; border-radius: var(--r-control); width: max-content; }
.qr canvas { display: block; image-rendering: pixelated; }

/* ---------- Stage 9 additions: session bar, chips, cards, remote, explore ---------- */
.sessionbar { align-items: center; justify-content: space-between; gap: var(--s-3); flex-wrap: wrap; padding: var(--s-1) var(--s-3); background: var(--bezel-1); border-bottom: 1px solid var(--line); min-height: 48px; }
.sb-left, .sb-right { display: flex; align-items: center; gap: var(--s-2); min-width: 0; flex-wrap: wrap; }
.sessionbar .who { color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 36ch; }
.sessionbar .scen { color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 44ch; }
.sessionbar .clock { font-variant-numeric: tabular-nums; color: var(--text-strong); font-size: var(--t-18); min-width: 5ch; text-align: right; }
.mode-badge svg, .chip svg { width: 12px; height: 12px; flex: none; }
.seg.compact button { min-width: 40px; padding: 0 var(--s-2); }
.chips { display: flex; flex-wrap: wrap; gap: var(--s-2); margin: var(--s-2) 0; }
.chip-btn { min-height: var(--target); padding: 0 var(--s-3); border-radius: var(--r-control); border: 1px solid var(--line-strong); background: var(--bezel-2); color: var(--text); cursor: pointer; }
.chip-btn:hover { border-color: var(--text-muted); }
.chip-btn[aria-checked='true'], .chip-btn[aria-pressed='true'] { border-color: var(--accent); color: var(--text-strong); box-shadow: inset 0 0 0 1px var(--accent); }
.chip.flag-pinned, .chip.flag-ramping { border-color: var(--accent); color: var(--accent); }
.chip.flag-override { border-style: dashed; color: var(--text-strong); }
.hint { color: var(--text-muted); font-size: var(--t-13); margin: var(--s-1) 0 var(--s-2); }
.summary { color: var(--text-strong); font-size: var(--t-18); margin: var(--s-1) 0 var(--s-2); }
.param .nowwrap { justify-self: end; white-space: nowrap; }
.param .now { font-variant-numeric: tabular-nums; color: var(--text-strong); font-size: var(--t-22); }
.param[hidden] { display: none; }
.vgroup { margin-bottom: var(--s-3); }
.row.between { justify-content: space-between; }
.cards { display: grid; gap: var(--s-3); }
.scard .scard-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); }
.scard h3, .scard-head h3 { margin: 0; font-size: var(--t-15); color: var(--text-strong); }
.scard .meta { color: var(--text-muted); font-size: var(--t-13); }
.objectives { margin: 0; padding-left: 1.2em; }
.objectives.checks { list-style: none; padding: 0; }
.states { list-style: none; display: flex; flex-wrap: wrap; gap: var(--s-1); margin: var(--s-2) 0; padding: 0; counter-reset: st; }
.states li { font-size: var(--t-13); border-radius: var(--r-chip); border: 1px solid var(--line); color: var(--text-muted); display: flex; }
.states li[aria-current='step'] { border-color: var(--accent); color: var(--text-strong); box-shadow: inset 3px 0 0 var(--accent); padding: 0 var(--s-2) 0 var(--s-3); align-items: center; min-height: 32px; }
.linkish { border: 0; background: transparent; color: inherit; cursor: pointer; min-height: 32px; padding: 0 var(--s-2); font-size: inherit; }
.linkish:hover { color: var(--text-strong); text-decoration: underline; }
.next, .marks, .infusions, .plain { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-1); }
.next li, .marks li, .infusions li { display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; padding: var(--s-1) 0; border-bottom: 1px solid var(--line); }
.checks { border: 0; padding: 0; margin: var(--s-2) 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0 var(--s-3); }
.checks legend { font-size: var(--t-13); color: var(--text-muted); padding: 0; margin-bottom: var(--s-1); }
.toggles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: var(--s-2); }
.toggles .btn { justify-content: flex-start; }
.more > summary { cursor: pointer; min-height: var(--target); display: list-item; line-height: var(--target); color: var(--text); }
.card.dose { margin: var(--s-2) 0; }
.unitsel { width: auto; min-width: 9ch; }
.refused { color: var(--text-muted); font-style: italic; }
.alarms li.none { color: var(--text-muted); }
/* errors are not alarms: strong text with an icon and the word "Error", never alarm red (R50 review F11; rule 1) */
.error { color: var(--text-strong); min-height: 1.2em; margin: 0; }
.error:not(:empty)::before { content: '⚠ '; }
.mono, code { font-family: var(--font-mono); font-size: 0.92em; }
.url { word-break: break-all; color: var(--text-strong); }
.pair { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--s-5); align-items: center; }
.bigcode { font-family: var(--font-mono); font-size: var(--t-44); letter-spacing: 0.18em; color: var(--text-strong); margin: var(--s-2) 0; }
.status-pill { display: inline-block; margin: var(--s-2) var(--s-3); padding: 2px var(--s-3); border: 1px solid var(--line-strong); border-radius: 999px; font-size: var(--t-13); color: var(--text); }
.remote-panel { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); }
.remote-panel .panel { border-left: 0; }
.page.narrow { max-width: 760px; }
.page.wide { max-width: none; }
.start { max-width: 760px; }
.start .setup h2 { margin: var(--s-4) 0 var(--s-1); font-size: var(--t-15); }
.start .setup .actions { margin-top: var(--s-4); }
.framed iframe { height: calc(100dvh - 220px); min-height: 480px; border: 1px solid var(--line); border-radius: var(--r-card); }
.iframe.vent { height: 100%; }
.devlist { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; }
.devlist a { display: inline-flex; align-items: center; min-height: 32px; color: var(--accent-strong); }
.bench .devlist a { color: var(--accent); }
.xmain { min-width: 0; }
.xnav a { min-height: 40px; }
table.values th.l { font-weight: 500; text-align: left; }
table.values td.u, table.values td.n { color: var(--text-muted); }
table.values.dense td { padding: 2px var(--s-2); }
.internals { margin-top: var(--s-4); }
.internals > summary { cursor: pointer; min-height: var(--target); display: flex; align-items: center; color: var(--text-muted); }
.key { color: var(--text-muted); overflow-wrap: anywhere; }
.vital .unit { margin: 0; }
@media (max-width: 700px) { .pair { grid-template-columns: 1fr; } }
.xmain table.values { table-layout: auto; }

.reveal { display: none; }
.main[data-route='monitor'] .reveal { display: flex; }
table.values tbody th .lbl b { color: var(--text-strong); font-weight: 600; }

.menu-btn { display: none !important; }
@media (max-width: 1000px) { .topbar .nav { display: none; } .menu-btn { display: inline-flex !important; } }
.menu-sheet { min-width: min(360px, 92vw); }
.menu-list { display: grid; gap: 2px; margin-bottom: var(--s-3); }
.menu-list a { display: flex; align-items: center; min-height: var(--target); padding: 0 var(--s-3); border-radius: var(--r-control); color: var(--text-strong); text-decoration: none; }
.menu-list a:hover { background: var(--bezel-2); }
.stage > .drawer-toggle { right: auto; left: var(--s-2); }
/* touch screens (iPad, phone remote): every control in the instructor's reach is 44 px (brief §6.4) */
@media (pointer: coarse) {
  .btn.small, .seg.compact button, .linkish, .mode-badge, .code-pill, .alarm-count, .chip-btn { min-height: 44px; min-width: 44px; }
  .states li[aria-current='step'] { min-height: 44px; }
}
.start .setup .actions { position: sticky; bottom: 0; background: var(--bezel-1); padding: var(--s-3) 0; margin-bottom: calc(-1 * var(--s-4)); border-top: 1px solid var(--line); z-index: 2; }
/* learner controls under the learner monitor (orchestrator ruling 4): hidden unless switched on for the scenario */
.learner-strip { display: flex; flex-wrap: wrap; gap: var(--s-2); padding: var(--s-2) var(--s-3); background: var(--bezel-1); border-top: 1px solid var(--line); }
.learner-strip[hidden] { display: none; }
```

- [ ] **Step 2: Create `apps/demo/src/app/color.ts`**

```ts
// Colour arithmetic for the shell (no DOM): WCAG 2.x contrast, used for the skin's alarm mirror and the token test.
/** WCAG 2.x contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (ch[0] as number) + 0.7152 * (ch[1] as number) + 0.0722 * (ch[2] as number);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
```

- [ ] **Step 3: Create `apps/demo/src/app/tokens.test.ts`**

```ts
// The token table of research/13 brief §6.2, re-computed from app.css (brief §11.4: "contrast table re-computed from
// the token file"). Text pairs need 4.5:1, control boundaries and the focus ring 3:1 (WCAG 2.2 1.4.3, 1.4.11).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from './color.ts';

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
function block(selector: string): Record<string, string> {
  const i = css.indexOf(`${selector} {`);
  const body = css.slice(i, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1] as string, m[2] as string]));
}
const dark = block(':root');
const light = { ...dark, ...block(".bench, :root[data-theme='bench']") };

describe('design tokens (brief §6.2)', () => {
  for (const [name, t] of [['dark theatre', dark], ['light bench', light]] as const) {
    it(`${name}: text 4.5:1 on every surface it is used on; boundaries and focus 3:1`, () => {
      const c = (a: string, b: string) => contrast(t[a] as string, t[b] as string);
      for (const s of ['bezel-0', 'bezel-1', 'bezel-2', 'bezel-3']) {
        expect(c('text', s), `text on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('text-strong', s), `text-strong on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('text-muted', s), `text-muted on ${s}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const s of ['bezel-0', 'bezel-1', 'bezel-2']) {
        expect(c('accent', s), `accent text on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('line-strong', s), `control boundary on ${s}`).toBeGreaterThanOrEqual(3);
        expect(c('accent-strong', s), `focus ring on ${s}`).toBeGreaterThanOrEqual(3);
      }
      expect(c('on-accent', 'accent'), 'text on the accent fill').toBeGreaterThanOrEqual(4.5);
      expect(c('danger', 'bezel-1'), 'destructive button text').toBeGreaterThanOrEqual(4.5);
    });
  }
  it('the monitor screen is true black and no alarm colour is a shell token', () => {
    expect(dark.screen).toBe('#000');
    expect(Object.keys(dark).filter((k) => k.startsWith('alarm-'))).toEqual(['alarm-high-bg', 'alarm-high-fg', 'alarm-medium-bg', 'alarm-medium-fg', 'alarm-low-bg', 'alarm-low-fg']); // defaults only; replaced from the skin
  });
});
```

- [ ] **Step 4: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/tokens.test.ts
```

Expected: 3 passed (dark and light: text 4.5:1 on every surface, accent text 4.5:1, boundaries and focus ring 3:1, text on the accent fill 4.5:1, danger 4.5:1; `--screen` #000).

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/src/app/app.css apps/demo/src/app/color.ts apps/demo/src/app/tokens.test.ts
git commit -m "feat(app): design tokens, layout grid and component styles for the Stage 9 app shell (R55)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 2: The R56 glossary: data, lookup and tests

**Files:**
- Create: `apps/demo/src/app/glossary-data.ts`
- Create: `apps/demo/src/app/glossary.ts`
- Create: `apps/demo/src/app/glossary.test.ts`

**Interfaces:** `entry(n)`, `lookup(path)` (entry, side, matched key, wildcard captures, drug), `labelOf(path)`, `rowKey(path)`, `canon(n)`, `shortLabel(e)`, `drugName(id)`, `unitOf(e)`, `nameOf(e)`, `describeEntry(e)`, `STATE_VAR_ENTRY`, `DISPLAY_SCALE`, `ALL_ENTRIES`, `KEY_LABELS`, `SHORT`, `SAME_AS`.

**Why:** The glossary is the ONLY label source (R56; research/11 §5.16 rule 1). `glossary-data.ts` holds research/11 §5's 294 entries as generated once by the plan writer (scratch generator, kept as `scratch/plans-backup/stage-9-glossary-gen.mjs`: it slices §5.1–§5.15's tables, expands brace/slash key shorthands and maps §5.7 lab names onto `ev.labs.values.*`, `ev.labResult.values.*` and `blood.out.*`; the output is the committed file and is edited by hand from now on), the Stage 9 additions `GLOSSARY_S9` (295–299; entries added at Task 0/2 start at 300) and `KEY_LABELS` (one label per key where an entry names several quantities, e.g. `NIBP S/D/M`, including pattern keys and the temperature sites), `SHORT` (screen labels where research/11's own label is shared: "TOF T1", "UO/kg") and `SAME_AS` (truth copies of monitor values). `glossary.ts` resolves a truth path (exact key, `#` side index → L/R, `*`/`<id>` segment wildcards), strips notes written for the model's authors from names and units, builds the tooltip text, and never lets one label cover two quantities (R50 review F1: see D4).

- [ ] **Step 1: Create `apps/demo/src/app/glossary-data.ts`**

```ts
// R56 clinical glossary: engine key → clinical label, full name, unit, adult normal range (research/11-capability-inventory-
// and-glossary.md §5, 294 entries, generated 2026-09-28 by the Stage 9 plan writer from the workspace research file; edits
// go HERE and are reviewed by Ali). `keys` are console truth paths; `#` = side index (0 L, 1 R), `*`/`<id>` = any segment.
// Entries without keys are planned labels (R57/R58/R59) that the UI already uses for placeholders.
export interface GlossaryEntry {
  n: number;
  /** research/11 section (5.1 monitor … 5.15 obstetric). */
  s: string;
  keys: string[];
  label: string;
  name: string;
  unit: string;
  normal: string;
  /** Child / pregnancy values where they differ. */
  other?: string;
  convention?: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  { n: 1, s: '5.1', keys: ["mon.hr"], label: "HR", name: "Heart rate (ECG)", unit: "bpm", normal: "60–100", other: "child 80–120; neonate 100–160 / Preg +10–20", convention: "all vendors" },
  { n: 2, s: '5.1', keys: ["mon.pr"], label: "PR", name: "Pulse rate (from SpO2 or ART; name the source)", unit: "bpm", normal: "= HR (pulse deficit in AF)", other: "as HR", convention: "GE/Mr/Sa \"PR\"; Phil \"Pulse\"" },
  { n: 3, s: '5.1', keys: ["mon.spo2"], label: "SpO₂", name: "Peripheral O2 saturation (pulse oximetry)", unit: "%", normal: "95–100", other: "neonate pre-ductal ≥ 90 after 10 min", convention: "all" },
  { n: 4, s: '5.1', keys: ["mon.pi"], label: "PI", name: "Perfusion index (pulsatile/non-pulsatile IR absorbance)", unit: "%", normal: "typical 1–10 (device range 0.02–20)", convention: "Masimo/Mr/Sa \"PI\"; Phil \"Perf\"" },
  { n: 5, s: '5.1', keys: ["mon.abpSys"], label: "ART S", name: "Invasive arterial pressure, systolic", unit: "mmHg", normal: "90–140", other: "child 90–110 / Preg −5–10 mid-gestation", convention: "GE/Mr/Dr/NK/Sa \"ART\"; Phil \"ABP\"" },
  { n: 6, s: '5.1', keys: ["mon.abpDia"], label: "ART D", name: "Invasive arterial pressure, diastolic", unit: "mmHg", normal: "60–90", other: "child 55–70", convention: "as 5" },
  { n: 7, s: '5.1', keys: ["mon.abpMean"], label: "ART M (MAP)", name: "Mean arterial pressure (invasive)", unit: "mmHg", normal: "70–105", other: "child 60–75 / Preg 75–90", convention: "as 5; \"MAP\" in textbooks" },
  { n: 8, s: '5.1', keys: ["mon.cvpMean"], label: "CVP", name: "Central venous pressure (mean)", unit: "mmHg", normal: "2–8 (spontaneous)", convention: "all" },
  { n: 9, s: '5.1', keys: ["mon.papSys"], label: "PAP S", name: "Pulmonary artery pressure, systolic", unit: "mmHg", normal: "15–30", convention: "Phil \"PAP\"; GE/Mr \"PA\" (usage)" },
  { n: 10, s: '5.1', keys: ["mon.papDia"], label: "PAP D", name: "Pulmonary artery pressure, diastolic", unit: "mmHg", normal: "4–12", convention: "as 9" },
  { n: 11, s: '5.1', keys: ["mon.papMean"], label: "mPAP", name: "Mean pulmonary artery pressure", unit: "mmHg", normal: "10–20 (PH > 20, ESC/ERS 2022)", convention: "textbooks \"mPAP\"" },
  { n: 12, s: '5.1', keys: ["ev.state.values.pawp"], label: "PAWP", name: "Pulmonary artery wedge (occlusion) pressure", unit: "mmHg", normal: "6–12", convention: "\"PCWP\" common alias; Phil \"PAWP\"" },
  { n: 13, s: '5.1', keys: ["mon.nibpSys", "mon.nibpDia", "mon.nibpMean"], label: "NIBP S/D/M", name: "Non-invasive (oscillometric) blood pressure", unit: "mmHg", normal: "as ART", other: "as ART", convention: "GE/Mr/NK/Sa \"NIBP\"; Phil/Dr \"NBP\"" },
  { n: 14, s: '5.1', keys: ["ev.nibp.cuffMmHg"], label: "Cuff", name: "NIBP cuff pressure during inflation", unit: "mmHg", normal: "—", convention: "Phil shows cuff pressure in the tile" },
  { n: 15, s: '5.1', keys: ["mon.etco2"], label: "EtCO₂", name: "End-tidal CO2 partial pressure", unit: "mmHg", normal: "35–45 (PaCO2 − 2 to 5)", other: "Preg 28–32", convention: "GE/Mr/Sa \"EtCO₂\"; Phil \"etCO₂\"" },
  { n: 16, s: '5.1', keys: ["mon.imco2"], label: "FiCO₂", name: "Inspired (minimum) CO2", unit: "mmHg", normal: "0 (< 2)", convention: "GE/Mr/Sa \"FiCO₂\"; Phil \"imCO₂\"" },
  { n: 17, s: '5.1', keys: ["mon.awrr"], label: "awRR", name: "Airway respiratory rate (from the CO2/flow signal)", unit: "/min", normal: "12–20", other: "child 20–30; neonate 30–60", convention: "Phil/Mr \"awRR\"; Sa \"AWRR\"" },
  { n: 18, s: '5.1', keys: ["mon.rr"], label: "RR", name: "Respiratory rate (impedance)", unit: "/min (skins may show rpm)", normal: "12–20", other: "as 17", convention: "all \"RR\"; unit rpm (GE/Mr) or /min" },
  { n: 19, s: '5.1', keys: ["mon.tempCore"], label: "T1 (Tcore)", name: "Temperature 1 — core (oesophageal probe)", unit: "°C", normal: "36.5–37.5", convention: "GE/Mr/Sa \"T1\"; Phil \"Tcore\"/\"Tesoph\"" },
  { n: 20, s: '5.1', keys: ["mon.tempSite"], label: "T2 (site)", name: "Temperature 2 at the chosen site: Tnaso, Ttymp, Tblad, Trect, Taxil", unit: "°C", normal: "site-dependent (axilla −0.5 to −1)", convention: "GE/Mr/Sa \"T2\"; Phil by site" },
  { n: 21, s: '5.1', keys: [], label: "ΔT (TD)", name: "Core–site temperature difference", unit: "°C", normal: "< 2", convention: "Sa \"DT\"; Mr \"TD\"" },
  { n: 22, s: '5.1', keys: ["mon.stII"], label: "ST-II", name: "ST-segment deviation, lead II (J + 60/80 ms)", unit: "mm or mV (1 mm = 0.1 mV)", normal: "±0.1 mV (≥ 0.1 mV depression = ischaemia)", convention: "Phil \"ST-II\"; GE/Mr \"ST II\"" },
  { n: 23, s: '5.1', keys: ["mon.qtc"], label: "QTc", name: "Corrected QT interval (state the formula: Bazett/Fridericia)", unit: "ms", normal: "< 450 M, < 460 F (> 500 high risk)", other: "child < 450", convention: "Phil \"QTc\"" },
  { n: 24, s: '5.1', keys: ["mon.tofCount"], label: "TOF count", name: "Train-of-four count", unit: "0–4", normal: "4 (no block)", convention: "Phil \"TOF-Cnt\"; GE NMT \"Count\"" },
  { n: 25, s: '5.1', keys: ["mon.tofRatio"], label: "TOFR", name: "Train-of-four ratio T4/T1", unit: "%", normal: "≥ 90 % = adequate recovery", convention: "Phil \"TOF-Ratio\"; GE \"TOF%\"" },
  { n: 26, s: '5.1', keys: ["mon.ptc"], label: "PTC", name: "Post-tetanic count", unit: "0–20", normal: "n/a (used at TOF 0)", convention: "Phil/GE \"PTC\"" },
  { n: 27, s: '5.1', keys: ["mon.di"], label: "DoA index (BIS/qCON/PSI/BFI per skin)", name: "Processed-EEG depth-of-anaesthesia index", unit: "0–100", normal: "awake > 90; GA 40–60", convention: "Medtronic \"BIS\"; GE \"SE/RE\" (Entropy); Masimo \"PSi\"; Sa \"BFI\"" },
  { n: 28, s: '5.1', keys: ["mon.sr"], label: "SR", name: "Burst-suppression ratio", unit: "%", normal: "0", convention: "BIS \"SR\"; Sa \"BS%\"" },
  { n: 29, s: '5.1', keys: ["mon.mac"], label: "MAC", name: "Minimum alveolar concentration multiple (end-tidal, age-adjusted, Σ agents incl. N2O)", unit: "MAC", normal: "GA 0.7–1.3; MAC-awake 0.3–0.4", other: "Preg 1 MAC is 25–40 % lower", convention: "Phil/GE/Dr \"MAC\" (agent module)" },
  { n: 30, s: '5.1', keys: ["mon.etAa"], label: "EtAA (EtSEV/EtISO/EtDES)", name: "End-tidal anaesthetic agent concentration", unit: "%", normal: "agent-specific (1 MAC at 40 y: sevo 2.0, iso 1.15, des 6.0)", other: "child MAC higher", convention: "Phil \"etSEV\"; GE \"EtSev\" (usage)" },
  { n: 31, s: '5.1', keys: ["mon.icpMean"], label: "ICP", name: "Intracranial pressure (mean)", unit: "mmHg", normal: "5–15 (treat > 22, BTF)", other: "infant 1.5–6; child 3–7", convention: "all" },
  { n: 32, s: '5.1', keys: ["mon.cpp"], label: "CPP", name: "Cerebral perfusion pressure = MAP − ICP", unit: "mmHg", normal: "60–80 (TBI target 60–70)", other: "child 40–50 (age-dependent)", convention: "Phil/Sa \"CPP\" with ICP" },
  { n: 33, s: '5.1', keys: ["mon.pbto2"], label: "PbtO₂", name: "Brain tissue O2 tension", unit: "mmHg", normal: "20–35 (treat < 20)", convention: "Licox \"PbtO₂\"" },
  { n: 34, s: '5.1', keys: ["mon.uop"], label: "UO", name: "Urine output (rolling 60 min)", unit: "mL/h (and mL/kg/h)", normal: "≥ 0.5 mL/kg/h", other: "child ≥ 1; infant ≥ 1–2 mL/kg/h", convention: "ICU charts \"UO\"" },
  { n: 35, s: '5.1', keys: [], label: "PPV", name: "Pulse-pressure variation", unit: "%", normal: "< 13 % (fluid-responsive > 13 on VT ≥ 8 mL/kg)", convention: "Phil/GE/Mr \"PPV\"" },
  { n: 36, s: '5.1', keys: [], label: "SVV", name: "Stroke-volume variation", unit: "%", normal: "< 10–13 %", convention: "pulse-contour devices" },
  { n: 37, s: '5.1', keys: ["mon.hr"], label: "HR source", name: "Where HR comes from (ECG / ART / SpO2)", unit: "—", normal: "—", convention: "Sa AUTO relabels to \"PR\"" },
  { n: 38, s: '5.2', keys: [], label: "I, II, III, aVR, aVL, aVF, V1–V6", name: "ECG leads", unit: "mV", normal: "", convention: "all" },
  { n: 39, s: '5.2', keys: [], label: "ART", name: "Arterial pressure waveform", unit: "mmHg", normal: "", convention: "GE/Mr/Dr/Sa \"ART\"; Phil \"ABP\"" },
  { n: 40, s: '5.2', keys: [], label: "CVP", name: "Central venous pressure waveform", unit: "mmHg", normal: "", convention: "all" },
  { n: 41, s: '5.2', keys: [], label: "PAP", name: "Pulmonary artery pressure waveform (wedge trace when inflated)", unit: "mmHg", normal: "", convention: "Phil \"PAP\"; GE/Mr \"PA\"" },
  { n: 42, s: '5.2', keys: [], label: "Pleth", name: "Plethysmogram (SpO2)", unit: "a.u.", normal: "", convention: "all" },
  { n: 43, s: '5.2', keys: [], label: "CO₂", name: "Capnogram", unit: "mmHg", normal: "", convention: "all" },
  { n: 44, s: '5.2', keys: [], label: "Resp", name: "Impedance respiration", unit: "a.u.", normal: "", convention: "all \"RESP\"" },
  { n: 45, s: '5.2', keys: [], label: "ICP", name: "ICP waveform (P1/P2/P3)", unit: "mmHg", normal: "", convention: "all" },
  { n: 46, s: '5.2', keys: [], label: "LVP", name: "Left-ventricular pressure (teaching)", unit: "mmHg", normal: "", convention: "Sa \"LVP\"" },
  { n: 47, s: '5.2', keys: [], label: "LV volume", name: "Left-ventricular volume (PV-loop teaching)", unit: "mL", normal: "", convention: "textbooks" },
  { n: 48, s: '5.2', keys: [], label: "LAP, RAP, RVP", name: "Left atrial, right atrial, right ventricular pressure", unit: "mmHg", normal: "", convention: "Sa \"LAP/RAP/RVP\"" },
  { n: 49, s: '5.2', keys: [], label: "PAP (true)", name: "Pulmonary artery pressure without the catheter transfer function (teaching)", unit: "mmHg", normal: "", convention: "—" },
  { n: 50, s: '5.2', keys: [], label: "Paw, Flow, Vol", name: "Airway pressure, flow, volume (anaesthesia-workstation lanes)", unit: "cmH₂O, L/min, mL", normal: "", convention: "Ham/Dräger \"Paw/Flow/Vol\"" },
  { n: 51, s: '5.3', keys: ["ev.circ.co"], label: "CO", name: "Cardiac output", unit: "L/min", normal: "4–8", other: "child ≈ 2.5–3.5 / Preg +30–50 %", convention: "all (\"C.O.\" Phil)" },
  { n: 52, s: '5.3', keys: [], label: "CI", name: "Cardiac index = CO/BSA", unit: "L/min/m²", normal: "2.5–4.0", convention: "all" },
  { n: 53, s: '5.3', keys: ["ev.circ.sv"], label: "SV", name: "Stroke volume (LV)", unit: "mL", normal: "60–100", convention: "all" },
  { n: 54, s: '5.3', keys: [], label: "SVI", name: "Stroke volume index", unit: "mL/m²", normal: "33–47", convention: "all" },
  { n: 55, s: '5.3', keys: ["ev.circ.svRv"], label: "RVSV", name: "Right-ventricular stroke volume", unit: "mL", normal: "= SV", convention: "textbooks" },
  { n: 56, s: '5.3', keys: ["ev.circ.ef"], label: "LVEF", name: "Left-ventricular ejection fraction", unit: "%", normal: "55–70 (≥ 50)", convention: "echo" },
  { n: 57, s: '5.3', keys: ["ev.circ.lvedv"], label: "LVEDV", name: "LV end-diastolic volume", unit: "mL", normal: "65–150", convention: "echo" },
  { n: 58, s: '5.3', keys: ["ev.circ.lvesv"], label: "LVESV", name: "LV end-systolic volume", unit: "mL", normal: "20–60", convention: "echo" },
  { n: 59, s: '5.3', keys: ["ev.circ.lvedp"], label: "LVEDP", name: "LV end-diastolic pressure", unit: "mmHg", normal: "4–12", convention: "cath lab" },
  { n: 60, s: '5.3', keys: ["ev.circ.lvsp"], label: "LVSP", name: "LV peak systolic pressure", unit: "mmHg", normal: "90–140 (= SBP without AS)", convention: "cath lab" },
  { n: 61, s: '5.3', keys: ["ev.circ.svr"], label: "SVR", name: "Systemic vascular resistance", unit: "dyn·s·cm⁻⁵ (WU alternative)", normal: "800–1,200 (10–15 WU)", other: "Preg −25–30 %", convention: "all" },
  { n: 62, s: '5.3', keys: [], label: "SVRI", name: "SVR index", unit: "dyn·s·cm⁻⁵·m²", normal: "1,970–2,390", convention: "PAC" },
  { n: 63, s: '5.3', keys: ["ev.circ.pvr"], label: "PVR", name: "Pulmonary vascular resistance", unit: "dyn·s·cm⁻⁵ (WU)", normal: "40–160 (< 2 WU)", other: "Preg ×0.8", convention: "all" },
  { n: 64, s: '5.3', keys: ["ev.circ.pmsf"], label: "Pmsf", name: "Mean systemic filling pressure", unit: "mmHg", normal: "≈ 7–20 (method-dependent)", convention: "Guyton; physiology texts" },
  { n: 65, s: '5.3', keys: ["ev.circ.cpp"], label: "CoPP", name: "Coronary perfusion pressure = aortic diastolic − LVEDP", unit: "mmHg", normal: "50–80; CPR ≥ 15–20 for ROSC (Paradis)", convention: "textbooks write \"CPP\", which collides with 32: use CoPP" },
  { n: 66, s: '5.3', keys: ["ev.circ.supplyDemand"], label: "Myocardial O2 supply/demand", name: "Coronary supply/demand ratio (EVR-like, DPTI/TTI analogue)", unit: "ratio", normal: "> 1 (EVR ≥ 0.7 in Buckberg's terms)", convention: "Buckberg EVR" },
  { n: 67, s: '5.3', keys: ["ev.circ.kIsch"], label: "Ischaemia factor", name: "Fraction of normal contractility left by ischaemia (model)", unit: "0–1", normal: "1", convention: "engine-only; keep as an instructor label" },
  { n: 68, s: '5.3', keys: ["hemo.circ.p.rSys"], label: "SVR (model)", name: "Model systemic resistance (the parameter behind 61)", unit: "mmHg·s/mL", normal: "≈ 0.85–1.05", convention: "engine" },
  { n: 69, s: '5.3', keys: ["hemo.circ.p.eesLv", "hemo.circ.p.eesRv"], label: "Ees LV / Ees RV", name: "End-systolic elastance (contractility)", unit: "mmHg/mL", normal: "LV 2–3; RV 0.5–0.8", convention: "Suga/Sagawa" },
  { n: 70, s: '5.3', keys: ["hemo.circ.p.cArt"], label: "Ca (arterial compliance)", name: "Total arterial compliance", unit: "mL/mmHg", normal: "1.2–2.0", other: "elderly ≈ 0.6–0.9", convention: "physiology texts" },
  { n: 71, s: '5.3', keys: ["hemo.circ.p.v0Sv", "hemo.circ.p.cSv"], label: "Vu, Cv", name: "Unstressed venous volume; venous compliance", unit: "mL; mL/mmHg", normal: "Vu ≈ 70 % of blood volume; Cv 100–130", convention: "Guyton/Magder" },
  { n: 72, s: '5.3', keys: ["hemo.circ.p.av.eroa", "hemo.circ.p.mv.eroa", "hemo.circ.p.tv.eroa", "hemo.circ.p.pv.eroa"], label: "EROA", name: "Effective regurgitant orifice area (per valve)", unit: "cm²", normal: "0", convention: "echo (ASE)" },
  { n: 73, s: '5.3', keys: ["hemo.circ.p.av.r"], label: "Valve resistance", name: "Model valve resistance (AS/MS: use AVA/MVA and mean gradient)", unit: "mmHg·s/mL", normal: "—", convention: "echo reports AVA (cm²) and mean gradient (mmHg)" },
  { n: 74, s: '5.3', keys: ["hemo.circOut.pAo"], label: "Aortic pressure", name: "Central aortic pressure", unit: "mmHg", normal: "≈ radial − 0–10 systolic", convention: "textbooks" },
  { n: 75, s: '5.3', keys: ["hemo.circOut.pRad"], label: "Radial pressure", name: "Radial artery pressure (the ART site)", unit: "mmHg", normal: "as ART", convention: "—" },
  { n: 76, s: '5.3', keys: ["hemo.circOut.pLa"], label: "LAP", name: "Left atrial pressure", unit: "mmHg", normal: "4–12", convention: "Sa \"LAP\"" },
  { n: 77, s: '5.3', keys: ["hemo.circOut.pRa"], label: "RAP", name: "Right atrial pressure", unit: "mmHg", normal: "2–8 (≈ CVP)", convention: "Sa \"RAP\"" },
  { n: 78, s: '5.3', keys: ["hemo.circOut.pRv"], label: "RVP", name: "Right-ventricular pressure", unit: "mmHg", normal: "15–30 / 0–8", convention: "Sa \"RVP\"" },
  { n: 79, s: '5.3', keys: ["hemo.circOut.pLv"], label: "LVP", name: "Left-ventricular pressure", unit: "mmHg", normal: "90–140 / 4–12", convention: "Sa \"LVP\"" },
  { n: 80, s: '5.3', keys: ["hemo.circOut.pPa", "hemo.circOut.pPaRoot"], label: "PAP (model)", name: "Pulmonary artery pressure (distal / root)", unit: "mmHg", normal: "as 9–11", convention: "—" },
  { n: 81, s: '5.3', keys: ["hemo.circOut.pPv"], label: "Ppv (≈ PAWP)", name: "Pulmonary venous pressure", unit: "mmHg", normal: "6–12", convention: "West zones" },
  { n: 82, s: '5.3', keys: ["hemo.circOut.pSv"], label: "Psv", name: "Systemic venous (reservoir) pressure (≈ Pmsf at no flow)", unit: "mmHg", normal: "≈ 10–15", convention: "Guyton" },
  { n: 83, s: '5.3', keys: ["hemo.circOut.pIt"], label: "Ppl (pleural)", name: "Intrathoracic (pleural) pressure", unit: "mmHg (show cmH₂O too)", normal: "−3 to −8 cmH₂O (end-exp, spont); + under PPV", convention: "West" },
  { n: 84, s: '5.3', keys: ["hemo.circOut.pPeri"], label: "Ppericardial", name: "Pericardial pressure", unit: "mmHg", normal: "≈ 0 to −3 (tamponade ≥ RAP)", convention: "Barash" },
  { n: 85, s: '5.3', keys: ["hemo.circOut.qSys", "hemo.circOut.qVr"], label: "Q̇ (flows)", name: "Systemic flow, venous return, valve flows", unit: "mL/s", normal: "—", convention: "engine (teaching)" },
  { n: 86, s: '5.3', keys: ["hemo.circOut.qLungL", "hemo.circOut.qLungR"], label: "Q̇ L/R lung", name: "Pulmonary blood flow per lung", unit: "mL/s (show % of CO)", normal: "L 45 %, R 55 % supine", convention: "West" },
  { n: 87, s: '5.3', keys: ["hemo.circ.baro.set"], label: "Baroreflex set point", name: "MAP the baroreflex defends", unit: "mmHg", normal: "85–95 awake; GA −10–20 %", convention: "physiology" },
  { n: 88, s: '5.3', keys: ["hemo.circ.baro.es", "hemo.circ.baro.ev"], label: "Sympathetic / vagal tone", name: "Baroreflex efferent activity (model units)", unit: "a.u.", normal: "—", convention: "engine (instructor)" },
  { n: 89, s: '5.3', keys: ["hemo.circ.ext.drug.*"], label: "Drug effect on SVR / Ees / venous tone / reflex gain / HR", name: "Pharmacodynamic multipliers", unit: "×", normal: "1", convention: "engine (instructor)" },
  { n: 90, s: '5.3', keys: ["ev.state.values.contractility", "ev.state.values.volumeStatus"], label: "Contractility (×), Volume status (×)", name: "MANUAL instructor inputs", unit: "× baseline", normal: "1", convention: "instructor only" },
  { n: 91, s: '5.3', keys: ["ev.beat.mech.lvetMs"], label: "LVET", name: "Left-ventricular ejection time", unit: "ms", normal: "250–320 (HR-dependent)", convention: "Weissler" },
  { n: 92, s: '5.3', keys: ["ev.circ.iabp.augmentation"], label: "Diastolic augmentation", name: "IABP augmented diastolic pressure", unit: "mmHg", normal: "> unassisted SBP", convention: "IABP consoles \"Aug\"" },
  { n: 93, s: '5.3', keys: [], label: "SPV / dSBP", name: "Systolic pressure variation", unit: "mmHg", normal: "< 10", convention: "anaesthesia texts" },
  { n: 94, s: '5.3', keys: [], label: "CPO", name: "Cardiac power output = MAP·CO/451", unit: "W", normal: "≈ 1.0 (shock < 0.6)", convention: "cardiogenic-shock texts" },
  { n: 95, s: '5.4', keys: ["blood.core.o2.cao2"], label: "CaO₂", name: "Arterial O2 content", unit: "mL/dL (engine mL/L ÷ 10)", normal: "18–21 mL/dL", other: "Preg lower (Hb 11.5)", convention: "textbooks" },
  { n: 96, s: '5.4', keys: ["resp.lung.o2.cv"], label: "CvO₂", name: "Mixed-venous O2 content", unit: "mL/dL (engine mL/L)", normal: "14–16", convention: "textbooks" },
  { n: 97, s: '5.4', keys: ["blood.core.o2.do2"], label: "DO₂", name: "O2 delivery = CO·CaO2", unit: "mL/min (DO2I mL/min/m²)", normal: "950–1,150 (DO2I 500–600)", convention: "textbooks" },
  { n: 98, s: '5.4', keys: ["blood.core.o2.vo2", "resp.pat.vo2"], label: "VO₂", name: "O2 consumption", unit: "mL/min", normal: "200–250 (3.5 mL/kg/min)", other: "child 5–7 mL/kg/min / Preg +20–30 %", convention: "textbooks" },
  { n: 99, s: '5.4', keys: ["blood.core.o2.er"], label: "O₂ER", name: "O2 extraction ratio = VO2/DO2", unit: "%", normal: "22–30", convention: "textbooks" },
  { n: 100, s: '5.4', keys: ["blood.core.o2.svo2"], label: "SvO₂", name: "Mixed-venous O2 saturation", unit: "% (engine fraction)", normal: "65–75", convention: "PAC oximetry (\"SvO₂\" all vendors)" },
  { n: 101, s: '5.4', keys: [], label: "ScvO₂", name: "Central-venous O2 saturation", unit: "%", normal: "70–80 (SvO2 + 2–5)", convention: "sepsis bundles" },
  { n: 102, s: '5.4', keys: ["blood.core.o2.deficit"], label: "O₂ debt", name: "Accumulated O2 deficit (model)", unit: "mL", normal: "0", convention: "shock physiology" },
  { n: 103, s: '5.4', keys: ["blood.core.odc.dpgMmolL"], label: "2,3-DPG", name: "Red-cell 2,3-diphosphoglycerate", unit: "mmol/L", normal: "4–5", convention: "textbooks" },
  { n: 104, s: '5.4', keys: [], label: "P50", name: "PO2 at 50 % saturation", unit: "mmHg", normal: "26–27", other: "Preg ≈ 30; neonate ≈ 19", convention: "textbooks" },
  { n: 105, s: '5.5', keys: ["resp.o2.pao2"], label: "PaO₂", name: "Arterial O2 tension", unit: "mmHg", normal: "80–100 on air (≈ 100 − age/3)", other: "Preg 100–105", convention: "textbooks" },
  { n: 106, s: '5.5', keys: ["resp.o2.sa"], label: "SaO₂", name: "Arterial O2 saturation (functional)", unit: "%", normal: "95–99", convention: "textbooks" },
  { n: 107, s: '5.5', keys: ["resp.o2.fa"], label: "FAO₂", name: "Alveolar O2 fraction", unit: "%", normal: "≈ 14 on air", convention: "West" },
  { n: 108, s: '5.5', keys: [], label: "PAO₂", name: "Alveolar O2 tension (alveolar gas equation)", unit: "mmHg", normal: "≈ 100 on air", convention: "West" },
  { n: 109, s: '5.5', keys: [], label: "A–a DO₂", name: "Alveolar–arterial O2 gradient", unit: "mmHg", normal: "5–15 on air (≈ age/4 + 4)", convention: "West" },
  { n: 110, s: '5.5', keys: [], label: "P/F", name: "PaO2/FiO2 ratio", unit: "mmHg", normal: "> 400 (ARDS ≤ 300, Berlin)", convention: "ARDSnet/Berlin" },
  { n: 111, s: '5.5', keys: ["resp.co2.pf"], label: "PaCO₂", name: "Arterial CO2 tension", unit: "mmHg", normal: "35–45", other: "Preg 28–32", convention: "textbooks" },
  { n: 112, s: '5.5', keys: ["resp.etco2", "ev.breath.etco2True"], label: "EtCO₂ (true)", name: "End-tidal CO2 before the sampler (truth)", unit: "mmHg", normal: "35–45", other: "Preg 28–32", convention: "—" },
  { n: 113, s: '5.5', keys: ["resp.lung.co2.pv"], label: "PvCO₂", name: "Mixed-venous CO2 tension", unit: "mmHg", normal: "41–51 (PaCO2 + 4–6)", convention: "textbooks" },
  { n: 114, s: '5.5', keys: ["resp.lung.co2.g"], label: "EtCO₂/PaCO₂", name: "End-tidal to arterial CO2 ratio", unit: "—", normal: "0.9–1.0", convention: "—" },
  { n: 115, s: '5.5', keys: [], label: "Pa–EtCO₂", name: "Arterial–end-tidal CO2 gradient", unit: "mmHg", normal: "2–5", convention: "Miller (capnography)" },
  { n: 116, s: '5.5', keys: ["resp.lung.co2.faCo2"], label: "FACO₂", name: "Alveolar CO2 fraction", unit: "%", normal: "≈ 5.6", convention: "West" },
  { n: 117, s: '5.5', keys: ["resp.lung.co2.riseIII"], label: "Phase III slope", name: "Capnogram alveolar-plateau rise", unit: "mmHg (per breath) or mmHg/s", normal: "< 2–3 mmHg", convention: "capnography texts" },
  { n: 118, s: '5.5', keys: ["resp.lung.co2.e"], label: "CO₂ elimination efficiency", name: "Model CO2-elimination factor", unit: "—", normal: "1", convention: "engine" },
  { n: 119, s: '5.5', keys: ["resp.shunt", "ev.lungState.shunt"], label: "Qs/Qt (shunt)", name: "Shunt fraction", unit: "%", normal: "2–5 awake; 8–10 under GA", other: "neonate 5–10", convention: "textbooks" },
  { n: 120, s: '5.5', keys: ["ev.lungState.vqAdmixture", "resp.lung.lp.side.#.vqLow"], label: "Venous admixture (low V/Q)", name: "FiO2-responsive admixture from low-V/Q units", unit: "%", normal: "≈ 2", convention: "West" },
  { n: 121, s: '5.5', keys: ["resp.pat.vco2"], label: "VCO₂", name: "CO2 production", unit: "mL/min", normal: "≈ 200 (RQ 0.8)", other: "child 4–5 mL/kg/min / Preg ↑", convention: "textbooks" },
  { n: 122, s: '5.5', keys: ["resp.vaLpm"], label: "V̇A", name: "Alveolar ventilation", unit: "L/min", normal: "4–5", other: "Preg ↑ 50–70 %", convention: "West" },
  { n: 123, s: '5.5', keys: ["resp.spont.ve"], label: "V̇E (MV)", name: "Minute ventilation (spontaneous)", unit: "L/min", normal: "5–8", other: "Preg +40–50 %", convention: "all \"MV\"" },
  { n: 124, s: '5.5', keys: ["resp.spont.rr"], label: "RR (spont)", name: "Spontaneous respiratory rate (truth)", unit: "/min", normal: "12–20", other: "child 20–30", convention: "—" },
  { n: 125, s: '5.5', keys: ["resp.spont.vt", "ev.breath.vtMl"], label: "VT", name: "Tidal volume", unit: "mL (and mL/kg PBW)", normal: "6–8 mL/kg PBW", other: "Preg ↑ 30–40 %", convention: "all" },
  { n: 126, s: '5.5', keys: ["resp.spont.paco2Set"], label: "PaCO₂ set point", name: "Chemoreflex PaCO2 target", unit: "mmHg", normal: "≈ 40", other: "Preg 30–32", convention: "physiology" },
  { n: 127, s: '5.5', keys: ["resp.spont.fatigue"], label: "Respiratory muscle fatigue", name: "Fatigue factor (model)", unit: "0–1", normal: "1 (none)", convention: "engine" },
  { n: 128, s: '5.5', keys: ["ev.breath.tiS", "ev.breath.teS"], label: "Ti, Te", name: "Inspiratory and expiratory time", unit: "s", normal: "Ti 1–1.5; I:E 1:2", convention: "Ham \"Ti\"; \"I:E\"" },
  { n: 129, s: '5.5', keys: ["resp.driver.vent.rr", "resp.driver.vent.vt", "resp.driver.vent.peep", "resp.driver.vent.ie"], label: "f set, VT set, PEEP, I:E", name: "Ventilator settings (engine VCV)", unit: "/min, mL, cmH₂O, ratio", normal: "—", convention: "Ham/Dräger" },
  { n: 130, s: '5.5', keys: ["l1.coupled.fio2", "ev.state.values.fio2"], label: "FiO₂", name: "Inspired O2 fraction", unit: "% (engine fraction)", normal: "21 % air", convention: "all" },
  { n: 131, s: '5.5', keys: ["resp.driver.fico2"], label: "FiCO₂ (source)", name: "Inspired CO2 from rebreathing (input)", unit: "mmHg", normal: "0", convention: "—" },
  { n: 132, s: '5.5', keys: ["resp.driver.source"], label: "Ventilation mode", name: "Spontaneous / BVM / ventilator / none", unit: "—", normal: "—", convention: "clinical words" },
  { n: 133, s: '5.5', keys: ["resp.driver.airway"], label: "Airway state", name: "Patent / obstructed / apnoea / disconnected / oesophageal / endobronchial / bronchospasm", unit: "—", normal: "—", convention: "clinical words" },
  { n: 134, s: '5.5', keys: ["ev.anaesthesia.drive.opioidDep", "ev.anaesthesia.drive.hypnoticDep", "ev.anaesthesia.drive.veRest", "ev.anaesthesia.drive.apnoea", "ev.anaesthesia.drive.obstruction"], label: "Respiratory drive (opioid / hypnotic depression, resting V̇E fraction, apnoea, upper-airway obstruction)", name: "Drug effect on ventilatory drive", unit: "fraction", normal: "0 / 1", convention: "engine (instructor)" },
  { n: 135, s: '5.5', keys: ["blood.lung.evlwi"], label: "EVLWI", name: "Extravascular lung water index", unit: "mL/kg", normal: "3–7 (oedema > 10)", convention: "PiCCO" },
  { n: 136, s: '5.5', keys: ["resp.lung.lp.ibwKg"], label: "PBW", name: "Predicted (ideal) body weight", unit: "kg", normal: "Devine", convention: "ARDSnet \"PBW\"" },
  { n: 137, s: '5.5', keys: [], label: "VTe", name: "Expired tidal volume (ventilator)", unit: "mL", normal: "6–8 mL/kg PBW", convention: "Ham \"VTE\"" },
  { n: 138, s: '5.5', keys: [], label: "MVe", name: "Expired minute volume", unit: "L/min", normal: "5–8", convention: "Ham \"ExpMinVol\"" },
  { n: 139, s: '5.5', keys: [], label: "fTotal", name: "Total breath rate (ventilator)", unit: "/min", normal: "12–20", convention: "Ham \"fTotal\"" },
  { n: 140, s: '5.5', keys: [], label: "P0.1", name: "Airway occlusion pressure at 100 ms", unit: "cmH₂O", normal: "1–4 (> 3.5 high drive)", convention: "Ham \"P0.1\"" },
  { n: 141, s: '5.5', keys: [], label: "RSBI", name: "Rapid shallow breathing index f/VT", unit: "breaths/min/L", normal: "< 105", convention: "Yang–Tobin" },
  { n: 142, s: '5.5', keys: [], label: "FiO₂ (set)", name: "Set O2 concentration", unit: "%", normal: "—", convention: "Ham \"Oxygen\"" },
  { n: 143, s: '5.6', keys: [], label: "Ppeak", name: "Peak inspiratory pressure", unit: "cmH₂O", normal: "< 30–35", convention: "Ham \"Ppeak\"; Dräger \"Ppeak\"/\"PIP\"" },
  { n: 144, s: '5.6', keys: ["resp.lung.pInsp"], label: "Pplat", name: "Plateau pressure (end-inspiratory hold)", unit: "cmH₂O", normal: "< 30 (lung-protective ≤ 28–30)", convention: "ARDSnet; Ham \"Pplateau\"" },
  { n: 145, s: '5.6', keys: ["resp.driver.vent.peep"], label: "PEEP", name: "Set positive end-expiratory pressure", unit: "cmH₂O", normal: "5–15", convention: "all" },
  { n: 146, s: '5.6', keys: ["resp.lung.peepTot"], label: "PEEPtot", name: "Total PEEP (end-expiratory hold)", unit: "cmH₂O", normal: "= PEEP", convention: "Ham \"PEEPtot\"/\"Total PEEP\"" },
  { n: 147, s: '5.6', keys: ["ev.lungState.autoPeepCmH2O"], label: "PEEPi (auto-PEEP)", name: "Intrinsic PEEP = PEEPtot − PEEP", unit: "cmH₂O", normal: "0", convention: "Ham \"AutoPEEP\"; textbooks \"PEEPi\"" },
  { n: 148, s: '5.6', keys: [], label: "ΔP", name: "Driving pressure = Pplat − PEEPtot", unit: "cmH₂O", normal: "< 15 (≤ 13 target)", convention: "Amato 2015 \"ΔP\"/\"DP\"" },
  { n: 149, s: '5.6', keys: [], label: "PL", name: "Transpulmonary pressure = Paw − Ppl (Pes-based; end-insp and end-exp)", unit: "cmH₂O", normal: "end-insp < 20–25; end-exp 0 to +2", other: "Preg/obese: Ppl higher", convention: "Talmor/Chiumello" },
  { n: 150, s: '5.6', keys: [], label: "Pes", name: "Oesophageal pressure (estimate of Ppl)", unit: "cmH₂O", normal: "≈ −5 to +5 supine", convention: "oesophageal manometry" },
  { n: 151, s: '5.6', keys: ["ev.lungState.complianceMlPerCmH2O"], label: "Cstat (Crs)", name: "Static respiratory-system compliance = VT/(Pplat − PEEPtot)", unit: "mL/cmH₂O", normal: "50–80 intubated (≈ 100 awake)", other: "child 1–1.5 mL/cmH₂O/kg / Preg ×0.85", convention: "Ham \"Cstat\"" },
  { n: 152, s: '5.6', keys: [], label: "Cdyn", name: "Dynamic compliance = VT/(Ppeak − PEEPtot)", unit: "mL/cmH₂O", normal: "40–70", convention: "textbooks" },
  { n: 153, s: '5.6', keys: ["resp.lung.lp.side.#.cL"], label: "CL", name: "Lung compliance (per side)", unit: "mL/cmH₂O", normal: "≈ 100–200 (both lungs, awake)", convention: "West" },
  { n: 154, s: '5.6', keys: ["ev.lungState.chestWallComplianceMlPerCmH2O", "resp.lung.lp.ccw"], label: "Ccw", name: "Chest-wall compliance", unit: "mL/cmH₂O", normal: "≈ 200", other: "Preg ×0.7", convention: "West" },
  { n: 155, s: '5.6', keys: ["ev.lungState.resistanceCmH2OPerLps", "ev.lungState.resistanceExpCmH2OPerLps"], label: "Raw (Rinsp / Rexp)", name: "Airway resistance incl. tube", unit: "cmH₂O·s/L", normal: "2–3 unintubated; 8–12 with ETT", other: "child higher", convention: "Ham \"Rinsp\"/\"Rexp\"; textbooks \"Raw\"" },
  { n: 156, s: '5.6', keys: ["resp.lung.lp.rTube"], label: "RETT", name: "Endotracheal-tube resistance", unit: "cmH₂O·s/L", normal: "4–8 (7.0–8.0 mm tube)", convention: "textbooks" },
  { n: 157, s: '5.6', keys: ["resp.lung.tauBar"], label: "RCexp (τE)", name: "Expiratory time constant", unit: "s", normal: "0.4–0.7 intubated", convention: "Ham \"RCexp\"" },
  { n: 158, s: '5.6', keys: ["resp.lung.mech.paw"], label: "Paw", name: "Airway pressure (instantaneous)", unit: "cmH₂O", normal: "—", convention: "all" },
  { n: 159, s: '5.6', keys: ["resp.lung.mech.pcar"], label: "Ptrach", name: "Tracheal (carinal) pressure", unit: "cmH₂O", normal: "—", convention: "textbooks" },
  { n: 160, s: '5.6', keys: [], label: "Pmean", name: "Mean airway pressure", unit: "cmH₂O", normal: "5–15", convention: "Ham \"Pmean\"" },
  { n: 161, s: '5.6', keys: ["resp.pat.deadSpaceMl"], label: "VD anat", name: "Anatomical dead space", unit: "mL (mL/kg PBW)", normal: "≈ 150 (2.2 mL/kg)", other: "child relatively larger with apparatus", convention: "Fowler" },
  { n: 162, s: '5.6', keys: [], label: "VD app", name: "Apparatus dead space (HME, Y-piece, catheter mount)", unit: "mL", normal: "30–100", other: "child: large fraction of VT", convention: "textbooks" },
  { n: 163, s: '5.6', keys: ["resp.lung.lp.side.#.vdAlv"], label: "VD alv", name: "Alveolar dead space", unit: "mL (engine fraction of VA)", normal: "≈ 0 healthy", convention: "West" },
  { n: 164, s: '5.6', keys: ["ev.lungState.deadSpaceMl"], label: "VD phys", name: "Physiological dead space (Bohr–Enghoff)", unit: "mL", normal: "≈ 150–200", convention: "West" },
  { n: 165, s: '5.6', keys: [], label: "VD/VT", name: "Dead-space fraction", unit: "ratio", normal: "0.2–0.35 spont; 0.3–0.45 ventilated", convention: "Enghoff" },
  { n: 166, s: '5.6', keys: ["ev.lungState.frcMl", "resp.pat.frcMl", "resp.pat.frcGaMl"], label: "FRC", name: "Functional residual capacity", unit: "mL (mL/kg)", normal: "2.0–2.5 L supine (30 mL/kg); −20 % under GA", other: "child 30 mL/kg / Preg −20 %", convention: "ATS/ERS" },
  { n: 167, s: '5.6', keys: [], label: "RV", name: "Residual volume", unit: "mL", normal: "≈ 1.2 L (16–20 mL/kg)", convention: "ATS/ERS" },
  { n: 168, s: '5.6', keys: [], label: "TLC", name: "Total lung capacity", unit: "mL", normal: "≈ 6 L (80 mL/kg)", convention: "ATS/ERS" },
  { n: 169, s: '5.6', keys: [], label: "ERV", name: "Expiratory reserve volume = FRC − RV", unit: "mL", normal: "≈ 1.0–1.2 L", other: "Preg −20 %", convention: "ATS/ERS" },
  { n: 170, s: '5.6', keys: [], label: "IC", name: "Inspiratory capacity = TLC − FRC", unit: "mL", normal: "≈ 3.5 L", other: "Preg ↑", convention: "ATS/ERS" },
  { n: 171, s: '5.6', keys: [], label: "VC (SVC)", name: "Vital capacity = TLC − RV", unit: "mL", normal: "≈ 4.5–5 L (60–70 mL/kg)", convention: "ATS/ERS" },
  { n: 172, s: '5.6', keys: [], label: "FVC", name: "Forced vital capacity", unit: "L (% predicted)", normal: "≥ 80 % predicted (≥ LLN)", convention: "ATS/ERS 2022" },
  { n: 173, s: '5.6', keys: [], label: "FEV₁", name: "Forced expiratory volume in 1 s", unit: "L (% predicted)", normal: "≥ 80 % predicted", convention: "ATS/ERS" },
  { n: 174, s: '5.6', keys: [], label: "FEV₁/FVC", name: "Tiffeneau ratio", unit: "ratio", normal: "≥ 0.70 (≥ LLN)", convention: "GOLD/ATS" },
  { n: 175, s: '5.6', keys: [], label: "PEF", name: "Peak expiratory flow", unit: "L/min", normal: "400–600", convention: "ATS/ERS" },
  { n: 176, s: '5.6', keys: [], label: "CC", name: "Closing capacity", unit: "mL", normal: "≈ FRC supine at 44 y, upright at 66 y", other: "Preg: CC > FRC supine", convention: "Nunn" },
  { n: 177, s: '5.6', keys: ["ev.lungState.atelectasisFrac", "resp.lung.rec.*.#"], label: "Atelectasis (%)", name: "Non-aerated lung fraction", unit: "%", normal: "0 awake; 5–10 after induction", other: "obese/Preg ↑", convention: "Hedenstierna" },
  { n: 178, s: '5.7', keys: ["ev.labs.values.ph", "ev.labResult.values.ph"], label: "pH", name: "Arterial (or venous) pH", unit: "—", normal: "7.35–7.45 (venous ≈ 0.03 lower)", other: "Preg 7.40–7.46", convention: "blood-gas analysers" },
  { n: 179, s: '5.7', keys: ["ev.labs.values.pco2", "ev.labResult.values.pco2"], label: "PaCO₂ / PvCO₂", name: "CO2 tension (a = arterial, v = venous)", unit: "mmHg (kPa option)", normal: "35–45", other: "Preg 28–32", convention: "analysers print \"pCO₂\" with the sample type" },
  { n: 180, s: '5.7', keys: ["ev.labs.values.po2", "ev.labResult.values.po2"], label: "PaO₂ / PvO₂", name: "O2 tension", unit: "mmHg", normal: "80–100 on air; venous 35–45", convention: "as 179" },
  { n: 181, s: '5.7', keys: ["ev.labs.values.hco3", "ev.labResult.values.hco3"], label: "HCO₃⁻", name: "Bicarbonate (actual; standard HCO₃ optional)", unit: "mmol/L", normal: "22–26", other: "Preg 18–22", convention: "analysers \"cHCO₃⁻(P)\"" },
  { n: 182, s: '5.7', keys: ["ev.labs.values.be", "ev.labResult.values.be"], label: "BE (SBE)", name: "Base excess (standard, extracellular)", unit: "mmol/L", normal: "−2 to +2", other: "Preg −2 to −4", convention: "analysers \"cBase(Ecf)\"" },
  { n: 183, s: '5.7', keys: ["ev.labs.values.so2", "ev.labResult.values.so2"], label: "FO₂Hb (or sO₂)", name: "Fractional oxyhaemoglobin (the engine value); show functional sO₂ separately", unit: "%", normal: "FO₂Hb 94–98; sO₂ 95–99", convention: "co-oximeters print both" },
  { n: 184, s: '5.7', keys: ["ev.labs.values.cohb", "ev.labResult.values.cohb"], label: "COHb", name: "Carboxyhaemoglobin", unit: "%", normal: "< 1.5 (smokers up to 10)", convention: "co-oximetry" },
  { n: 185, s: '5.7', keys: ["ev.labs.values.methb", "ev.labResult.values.methb"], label: "MetHb", name: "Methaemoglobin", unit: "%", normal: "< 1.5", convention: "co-oximetry" },
  { n: 186, s: '5.7', keys: ["ev.labs.values.lactate", "ev.labResult.values.lactate", "blood.out.lactate"], label: "Lactate", name: "Blood lactate", unit: "mmol/L", normal: "0.5–2.0", convention: "all" },
  { n: 187, s: '5.7', keys: ["ev.labs.values.na", "ev.labResult.values.na", "blood.out.na"], label: "Na⁺", name: "Sodium", unit: "mmol/L", normal: "135–145", other: "Preg 130–140", convention: "all" },
  { n: 188, s: '5.7', keys: ["ev.labs.values.k", "ev.labResult.values.k", "blood.out.k"], label: "K⁺", name: "Potassium", unit: "mmol/L", normal: "3.5–5.0", convention: "all" },
  { n: 189, s: '5.7', keys: ["ev.labs.values.cl", "ev.labResult.values.cl", "blood.out.cl"], label: "Cl⁻", name: "Chloride", unit: "mmol/L", normal: "98–107", convention: "all" },
  { n: 190, s: '5.7', keys: ["ev.labs.values.iCa", "ev.labResult.values.iCa", "blood.out.iCa"], label: "iCa²⁺", name: "Ionised calcium", unit: "mmol/L", normal: "1.15–1.30", convention: "analysers \"cCa²⁺\"" },
  { n: 191, s: '5.7', keys: ["ev.labs.values.mg", "ev.labResult.values.mg", "blood.out.mg"], label: "Mg²⁺", name: "Magnesium (total; ionised 0.45–0.6)", unit: "mmol/L", normal: "0.7–1.0 (MgSO4 therapeutic 2–3.5)", convention: "—" },
  { n: 192, s: '5.7', keys: ["ev.labs.values.hb", "ev.labResult.values.hb", "blood.out.hb"], label: "Hb", name: "Haemoglobin", unit: "g/dL (g/L option)", normal: "M 13.5–17.5; F 12–15.5", other: "child 11–13.5 / Preg ≥ 11 (T2 ≥ 10.5)", convention: "all" },
  { n: 193, s: '5.7', keys: ["ev.labs.values.glucose", "ev.labResult.values.glucose"], label: "Glucose", name: "Blood glucose", unit: "mmol/L and mg/dL", normal: "3.9–7.8 (70–140 mg/dL)", other: "neonate > 2.6", convention: "all" },
  { n: 194, s: '5.7', keys: ["ev.labs.values.ag", "ev.labResult.values.ag", "blood.out.ag"], label: "AG", name: "Anion gap (Na − Cl − HCO3)", unit: "mmol/L", normal: "8–12 (without K); correct for albumin", convention: "all" },
  { n: 195, s: '5.7', keys: ["ev.labs.values.osm", "ev.labResult.values.osm", "blood.out.osm"], label: "Osm", name: "Measured/calculated osmolality", unit: "mOsm/kg", normal: "275–295", other: "Preg ≈ 280", convention: "all" },
  { n: 196, s: '5.7', keys: [], label: "Hct", name: "Haematocrit", unit: "%", normal: "M 40–52; F 36–48", other: "Preg 32–36", convention: "all" },
  { n: 197, s: '5.7', keys: [], label: "WBC", name: "White-cell count", unit: "×10⁹/L", normal: "4–11", other: "Preg up to 15", convention: "CBC" },
  { n: 198, s: '5.7', keys: [], label: "Plt", name: "Platelet count", unit: "×10⁹/L", normal: "150–400", other: "Preg ≥ 100 (gestational thrombocytopenia)", convention: "CBC" },
  { n: 199, s: '5.7', keys: [], label: "Urea (BUN)", name: "Urea", unit: "mmol/L (mg/dL BUN)", normal: "2.5–7.8 (BUN 7–20)", other: "Preg ↓", convention: "chemistry" },
  { n: 200, s: '5.7', keys: [], label: "Creat", name: "Creatinine", unit: "µmol/L (mg/dL)", normal: "60–110 (0.6–1.2)", other: "Preg 35–70 (0.4–0.8)", convention: "chemistry; KDIGO" },
  { n: 201, s: '5.7', keys: ["blood.out.albuminGL"], label: "Alb", name: "Albumin", unit: "g/L", normal: "35–50", other: "Preg 28–37", convention: "chemistry" },
  { n: 202, s: '5.7', keys: ["blood.out.cop"], label: "COP", name: "Colloid osmotic (oncotic) pressure", unit: "mmHg", normal: "22–28", other: "Preg 21–22", convention: "textbooks" },
  { n: 203, s: '5.7', keys: ["blood.keto"], label: "BHB", name: "β-hydroxybutyrate (ketones)", unit: "mmol/L", normal: "< 0.6 (DKA > 3)", convention: "chemistry" },
  { n: 204, s: '5.7', keys: [], label: "cTn", name: "Cardiac troponin (hs)", unit: "ng/L", normal: "< 99th centile of the assay", convention: "chemistry" },
  { n: 205, s: '5.7', keys: [], label: "BNP / NT-proBNP", name: "Natriuretic peptide", unit: "pg/mL", normal: "BNP < 100; NT-proBNP < 125 (age-dependent)", convention: "chemistry" },
  { n: 206, s: '5.7', keys: [], label: "Bili", name: "Total bilirubin", unit: "µmol/L", normal: "5–21", convention: "LFT" },
  { n: 207, s: '5.7', keys: [], label: "ALT / AST", name: "Transaminases", unit: "U/L", normal: "ALT 7–56; AST 10–40", convention: "LFT" },
  { n: 208, s: '5.7', keys: [], label: "ALP / GGT", name: "Cholestatic enzymes", unit: "U/L", normal: "ALP 44–147; GGT 9–48", other: "Preg ALP ↑ (placental)", convention: "LFT" },
  { n: 209, s: '5.7', keys: [], label: "NH₃", name: "Ammonia", unit: "µmol/L", normal: "15–45", convention: "chemistry" },
  { n: 210, s: '5.7', keys: ["ev.organs.liver.inr"], label: "INR", name: "International normalised ratio (PT)", unit: "— (PT s)", normal: "0.8–1.2 (PT 11–13.5 s)", other: "Preg slightly ↓", convention: "coagulation" },
  { n: 211, s: '5.7', keys: [], label: "aPTT", name: "Activated partial thromboplastin time", unit: "s", normal: "25–35", other: "Preg ↓", convention: "coagulation" },
  { n: 212, s: '5.7', keys: [], label: "Fib", name: "Fibrinogen (Clauss)", unit: "g/L", normal: "2–4", other: "Preg 4–6 (< 2 in PPH predicts severity)", convention: "coagulation" },
  { n: 213, s: '5.7', keys: [], label: "ACT", name: "Activated clotting time", unit: "s", normal: "80–130 (CPB > 400–480)", convention: "point of care" },
  { n: 214, s: '5.7', keys: [], label: "D-dimer", name: "Fibrin degradation (D-dimer)", unit: "mg/L FEU", normal: "< 0.5", other: "Preg ↑ by trimester", convention: "coagulation" },
  { n: 215, s: '5.7', keys: [], label: "Anti-Xa", name: "Heparin anti-Xa activity", unit: "IU/mL", normal: "therapeutic UFH 0.3–0.7", convention: "coagulation" },
  { n: 216, s: '5.7', keys: [], label: "R", name: "TEG reaction time (to 2 mm)", unit: "min", normal: "5–10 (kaolin)", other: "Preg shorter", convention: "Haemonetics TEG" },
  { n: 217, s: '5.7', keys: [], label: "K", name: "TEG kinetics time (2 → 20 mm)", unit: "min", normal: "1–3", convention: "TEG" },
  { n: 218, s: '5.7', keys: [], label: "α", name: "TEG/ROTEM α-angle", unit: "°", normal: "53–72 (TEG kaolin)", other: "Preg ↑", convention: "TEG/ROTEM" },
  { n: 219, s: '5.7', keys: [], label: "MA", name: "TEG maximum amplitude", unit: "mm", normal: "50–70", other: "Preg ↑", convention: "TEG" },
  { n: 220, s: '5.7', keys: [], label: "LY30", name: "TEG lysis 30 min after MA", unit: "%", normal: "0–8", convention: "TEG" },
  { n: 221, s: '5.7', keys: [], label: "CT", name: "ROTEM clotting time (EXTEM / INTEM / FIBTEM / HEPTEM / APTEM)", unit: "s", normal: "EXTEM 38–79; INTEM 100–240", convention: "Werfen ROTEM" },
  { n: 222, s: '5.7', keys: [], label: "CFT", name: "ROTEM clot formation time", unit: "s", normal: "EXTEM 34–159", convention: "ROTEM" },
  { n: 223, s: '5.7', keys: [], label: "A10 (A5)", name: "ROTEM amplitude at 10 (5) min", unit: "mm", normal: "EXTEM 43–65; FIBTEM 7–23", other: "Preg FIBTEM ↑", convention: "ROTEM" },
  { n: 224, s: '5.7', keys: [], label: "MCF", name: "ROTEM maximum clot firmness", unit: "mm", normal: "EXTEM 50–72; FIBTEM 9–25", convention: "ROTEM" },
  { n: 225, s: '5.7', keys: [], label: "ML (LI30)", name: "ROTEM maximum lysis (lysis index at 30 min)", unit: "%", normal: "ML < 15", convention: "ROTEM" },
  { n: 226, s: '5.7', keys: ["ev.labResult.drawnAt", "ev.labs.drawnAt"], label: "Drawn / Reported", name: "Sample time and result time", unit: "clock", normal: "POC 1–2 min; lab 30–60 min", convention: "lab systems" },
  { n: 227, s: '5.8', keys: ["resp.temp.tc"], label: "Tcore", name: "Core temperature (truth)", unit: "°C", normal: "36.5–37.5", convention: "textbooks" },
  { n: 228, s: '5.8', keys: ["resp.temp.tp", "ev.endo.tempPeriphC"], label: "Tperiph", name: "Peripheral (skin/compartment) temperature", unit: "°C", normal: "30–35 (core–periph 2–4)", convention: "Phil \"Tperi\"" },
  { n: 229, s: '5.8', keys: ["resp.temp.ta"], label: "Troom", name: "Ambient temperature", unit: "°C", normal: "20–24 (theatre)", other: "neonate: thermoneutral 32–34", convention: "—" },
  { n: 230, s: '5.8', keys: ["resp.temp.sites.*"], label: "Toes, Tnaso, Ttymp, Tblad, Trect, Taxil", name: "Site temperatures", unit: "°C", normal: "axilla ≈ core − 0.5–1; rectal ≈ core + 0.2", convention: "Phil site labels" },
  { n: 231, s: '5.8', keys: ["ev.endo.shivering", "ev.endo.sweating", "ev.endo.vasoconstricted"], label: "Shivering / Sweating / Vasoconstricted", name: "Thermoregulatory responses", unit: "yes/no", normal: "thresholds shift under GA (Sessler)", convention: "clinical words" },
  { n: 232, s: '5.8', keys: ["endo.cascade.stage"], label: "Hypothermia stage", name: "Mild (32–35) / moderate (28–32) / severe (< 28)", unit: "—", normal: "—", convention: "ERC/Swiss staging" },
  { n: 233, s: '5.9', keys: ["ev.organs.brain.icp"], label: "ICP", name: "Intracranial pressure (truth)", unit: "mmHg", normal: "5–15", other: "infant 1.5–6", convention: "BTF" },
  { n: 234, s: '5.9', keys: ["ev.organs.brain.cpp"], label: "CPP", name: "Cerebral perfusion pressure (truth)", unit: "mmHg", normal: "60–80", convention: "BTF" },
  { n: 235, s: '5.9', keys: ["ev.organs.brain.mapHead"], label: "MAP (tragus)", name: "MAP referenced at the external auditory meatus", unit: "mmHg", normal: "MAP − 0.77·head-height (cm)", convention: "neuro-anaesthesia practice" },
  { n: 236, s: '5.9', keys: ["ev.organs.brain.cbf"], label: "CBF", name: "Cerebral blood flow", unit: "mL/100 g/min (engine × 50)", normal: "50 (40–60)", other: "child 70–100", convention: "textbooks" },
  { n: 237, s: '5.9', keys: ["ev.organs.brain.cbvMl"], label: "CBV", name: "Cerebral blood volume", unit: "mL", normal: "≈ 50 (3–4 mL/100 g)", convention: "textbooks" },
  { n: 238, s: '5.9', keys: ["ev.organs.brain.cmro2"], label: "CMRO₂", name: "Cerebral metabolic rate for O2", unit: "mL/100 g/min (engine relative)", normal: "3.0–3.5", other: "child ≈ 5", convention: "textbooks" },
  { n: 239, s: '5.9', keys: ["ev.organs.brain.sjvo2"], label: "SjvO₂", name: "Jugular bulb venous O2 saturation", unit: "% (engine fraction)", normal: "55–75", convention: "neurocritical care" },
  { n: 240, s: '5.9', keys: ["ev.organs.brain.elastance"], label: "Intracranial elastance", name: "ΔP/ΔV (inverse compliance)", unit: "mmHg/mL", normal: "low at normal ICP (PVI ≈ 25 mL)", convention: "Marmarou" },
  { n: 241, s: '5.9', keys: ["ev.organs.brain.state"], label: "ICP state", name: "Normal / raised ICP / Cushing response / herniation", unit: "—", normal: "—", convention: "clinical words" },
  { n: 242, s: '5.9', keys: ["organs.brain.headUpDeg"], label: "Head-up (HOB)", name: "Head-of-bed elevation", unit: "°", normal: "30 in TBI", convention: "nursing/ICU" },
  { n: 243, s: '5.9', keys: ["organs.brain.mass", "organs.brain.oedema"], label: "Haematoma / oedema volume", name: "Intracranial mass volume", unit: "mL", normal: "0", convention: "radiology" },
  { n: 244, s: '5.9', keys: ["ev.anaesthesia.outputs.pupilMm"], label: "Pupils", name: "Pupil diameter (add reactivity, symmetry)", unit: "mm", normal: "2–4 (light)", convention: "GCS/neuro obs" },
  { n: 245, s: '5.10', keys: ["ev.organs.kidney.uopMlKgH", "ev.organs.kidney.uop1hMlKgH"], label: "UO", name: "Urine output (instant, last hour)", unit: "mL/kg/h", normal: "≥ 0.5", other: "child ≥ 1", convention: "KDIGO" },
  { n: 246, s: '5.10', keys: ["ev.organs.kidney.cumMl", "ev.organs.kidney.bagMl"], label: "UO total / Urometer", name: "Cumulative urine; bag volume", unit: "mL", normal: "—", convention: "fluid chart" },
  { n: 247, s: '5.10', keys: ["ev.organs.kidney.rbf"], label: "RBF", name: "Renal blood flow (engine 552 mL/min at rest under GA: check the definition against the normal)", unit: "mL/min", normal: "1,000–1,200 (≈ 20 % of CO)", other: "Preg +50 %", convention: "textbooks" },
  { n: 248, s: '5.10', keys: ["ev.organs.kidney.gfr"], label: "GFR", name: "Glomerular filtration rate", unit: "mL/min (mL/min/1.73 m²)", normal: "90–120", other: "Preg +50 %", convention: "KDIGO" },
  { n: 249, s: '5.10', keys: ["ev.organs.kidney.akiStage"], label: "AKI stage (KDIGO)", name: "KDIGO stage 0–3 (UO criterion only until creatinine exists)", unit: "0–3", normal: "0", convention: "KDIGO" },
  { n: 250, s: '5.10', keys: ["ev.organs.kidney.oliguria"], label: "Oliguria", name: "UO < 0.5 mL/kg/h (≥ 6 h for KDIGO)", unit: "yes/no", normal: "no", other: "child < 1", convention: "KDIGO" },
  { n: 251, s: '5.10', keys: ["ev.organs.kidney.bladderMl"], label: "Bladder volume", name: "Bladder urine volume (no catheter)", unit: "mL", normal: "< 400–500", convention: "bladder scan" },
  { n: 252, s: '5.10', keys: ["organs.iap"], label: "IAP", name: "Intra-abdominal pressure", unit: "mmHg", normal: "0–5 (IAH ≥ 12; ACS > 20 + organ failure)", other: "Preg ↑", convention: "WSACS" },
  { n: 253, s: '5.11', keys: ["ev.organs.liver.hbfRel"], label: "HBF", name: "Hepatic blood flow (engine relative)", unit: "L/min (× baseline)", normal: "≈ 1.5 (25 % of CO)", convention: "textbooks" },
  { n: 254, s: '5.11', keys: ["ev.organs.liver.kLacPerH"], label: "Lactate clearance", name: "Hepatic lactate clearance constant", unit: "/h (show t½)", normal: "t½ ≈ 20–30 min", convention: "textbooks (clearance %)" },
  { n: 255, s: '5.11', keys: ["ev.organs.liver.liverFn"], label: "Liver function", name: "Liver synthetic/metabolic function index (model)", unit: "0–1", normal: "1", convention: "engine; label as MELD/Child–Pugh-like only when the labs exist" },
  { n: 256, s: '5.11', keys: ["ev.endo.glucoseMmolL", "ev.endo.glucoseMgDl"], label: "Glucose", name: "Blood glucose (truth)", unit: "mmol/L (mg/dL)", normal: "3.9–7.8", convention: "all" },
  { n: 257, s: '5.11', keys: ["ev.endo.insulinUuMl"], label: "Insulin", name: "Plasma insulin", unit: "µU/mL (mU/L)", normal: "fasting 2–20", other: "Preg ↑ (insulin resistance)", convention: "chemistry" },
  { n: 258, s: '5.11', keys: ["ev.endo.epinephrinePgMl"], label: "Adrenaline", name: "Plasma adrenaline", unit: "pg/mL", normal: "< 50–100 at rest", convention: "chemistry" },
  { n: 259, s: '5.11', keys: ["ev.endo.norepinephrinePgMl"], label: "Noradrenaline", name: "Plasma noradrenaline", unit: "pg/mL", normal: "100–400 at rest", convention: "chemistry" },
  { n: 260, s: '5.11', keys: ["ev.endo.cortisolNmolL"], label: "Cortisol", name: "Plasma cortisol", unit: "nmol/L", normal: "140–690 (morning)", other: "Preg ↑", convention: "chemistry" },
  { n: 261, s: '5.11', keys: ["ev.endo.stressIndex"], label: "Stress response", name: "Surgical stress index (model; instructor)", unit: "0–1", normal: "0", convention: "engine" },
  { n: 262, s: '5.11', keys: ["ev.endo.mhActivity"], label: "MH activity", name: "Malignant hyperthermia crisis activity (instructor)", unit: "0–1", normal: "0", convention: "engine" },
  { n: 263, s: '5.12', keys: ["ev.anaesthesia.tof.t1"], label: "T1", name: "First-twitch height (% control)", unit: "%", normal: "100", convention: "NMT monitors" },
  { n: 264, s: '5.12', keys: ["ev.anaesthesia.block.thumb", "ev.anaesthesia.block.dia"], label: "Block (AP / diaphragm)", name: "Fractional receptor block at adductor pollicis and diaphragm", unit: "%", normal: "0", convention: "teaching" },
  { n: 265, s: '5.12', keys: ["ev.anaesthesia.macBrain", "ev.anaesthesia.macEff"], label: "MAC (brain), MAC (opioid-adjusted)", name: "Brain partial-pressure MAC; effective MAC after opioid reduction", unit: "MAC", normal: "—", convention: "teaching" },
  { n: 266, s: '5.12', keys: ["ev.anaesthesia.etPct.<agent>"], label: "EtSEV / EtISO / EtDES / EtN₂O", name: "End-tidal agent per agent", unit: "%", normal: "—", convention: "Phil/GE agent labels" },
  { n: 267, s: '5.12', keys: ["ev.anaesthesia.conscious", "ev.anaesthesia.awarenessRisk", "ev.anaesthesia.movement"], label: "Consciousness / Awareness risk / Movement", name: "Clinical state flags", unit: "yes/no", normal: "—", convention: "clinical words" },
  { n: 268, s: '5.12', keys: ["ev.anaesthesia.outputs.antinoc"], label: "Antinociception", name: "Opioid/hypnotic antinociception level (model; the analgesia monitors NOL/ANI/SPI are its clinical cousins)", unit: "0–1", normal: "—", convention: "engine" },
  { n: 269, s: '5.12', keys: ["ev.neuroMark.kind"], label: "Event", name: "Fasciculation, movement, awareness, emergence, loss of consciousness, apnoea, breathing, recurarisation, MH trigger", unit: "—", normal: "—", convention: "clinical words" },
  { n: 270, s: '5.13', keys: ["ev.drugs.drugs.<id>.cp"], label: "Cp", name: "Plasma concentration", unit: "drug unit (µg/mL propofol; ng/mL opioids, NMBs)", normal: "", convention: "TCI pumps \"Cp\"" },
  { n: 271, s: '5.13', keys: ["ev.drugs.drugs.<id>.ce"], label: "Ce", name: "Effect-site concentration", unit: "drug unit", normal: "", convention: "TCI pumps \"Ce\"" },
  { n: 272, s: '5.13', keys: ["ev.drugs.drugs.<id>.rate", "ev.drugs.drugs.<id>.tci"], label: "Rate / Target", name: "Infusion rate; TCI target (plasma or effect, model name)", unit: "per row", normal: "", convention: "TCI pumps" },
  { n: 273, s: '5.13', keys: ["ev.drugs.drugs.<id>.totalAmount"], label: "Total", name: "Cumulative dose", unit: "mg, µg", normal: "", convention: "anaesthesia record" },
  { n: 274, s: '5.13', keys: ["ev.drugs.drugs.<id>.decrement50Min"], label: "CSHT (50 %)", name: "Context-sensitive half-time (time for Cp to fall 50 % if stopped now)", unit: "min", normal: "", convention: "Hughes 1992 \"CSHT\"" },
  { n: 275, s: '5.13', keys: ["ev.drugs.volatile.fi", "ev.drugs.volatile.fa"], label: "Fi / Fet (agent)", name: "Inspired and end-tidal (alveolar) agent fraction", unit: "%", normal: "", convention: "agent monitor \"Fi/Et\"" },
  { n: 276, s: '5.13', keys: ["ev.drugs.volatile.dialPct", "ev.drugs.volatile.fgfLpm"], label: "Dial / FGF", name: "Vaporiser setting; fresh gas flow", unit: "%, L/min", normal: "", convention: "anaesthesia machine" },
  { n: 277, s: '5.13', keys: ["ev.drugs.volatile.macAge"], label: "MAC (age)", name: "Age-adjusted 1 MAC of the agent", unit: "%", normal: "", convention: "Mapleson 1996" },
  { n: 278, s: '5.13', keys: ["pk.bus.agents.<id>.nmj", "pk.bus.agents.<id>.dia", "pk.bus.agents.<id>.vent"], label: "Ce (NMJ / diaphragm / ventilatory)", name: "Site-specific effect-site concentrations", unit: "drug unit", normal: "", convention: "teaching" },
  { n: 279, s: '5.13', keys: ["pk.bus.cns.*", "pk.bus.airway.*", "pk.bus.airway.hpvInhibit", "hemo.circ.ext.avNodeBlock"], label: "Drug effects (CNS, bronchodilation, histamine, HPV inhibition, AV-node block)", name: "Class-level effects (instructor)", unit: "fraction", normal: "", convention: "engine" },
  { n: 280, s: '5.14', keys: ["dev.defib.energyJ", "dev.defib.state", "dev.defib.sync", "dev.defib.shocks"], label: "Energy / Charging–Ready / SYNC / Shocks", name: "Defibrillator", unit: "J", normal: "biphasic adult 120–200; child 2–4 J/kg", convention: "defibrillators" },
  { n: 281, s: '5.14', keys: ["dev.pacer.mode", "dev.pacer.ratePpm", "dev.pacer.mA"], label: "Pacer mode / Rate / Output", name: "Transcutaneous pacer", unit: "ppm, mA", normal: "rate 60–80; capture typically 40–80 mA", convention: "defibrillators (\"PACER … ppm … mA\")" },
  { n: 282, s: '5.14', keys: ["ev.state.values.paceThresholdMa"], label: "Capture threshold", name: "Current needed for electrical capture", unit: "mA", normal: "40–80", convention: "—" },
  { n: 283, s: '5.14', keys: ["hemo.cpr.rate", "hemo.cpr.quality"], label: "CPR rate / quality", name: "Compression rate; depth/recoil quality (model 0–1.2)", unit: "/min, —", normal: "100–120/min, depth 5–6 cm, CCF > 60 %", convention: "ERC/AHA" },
  { n: 284, s: '5.14', keys: ["hemo.iabp.ratio", "hemo.iabp.volumeMl", "hemo.iabp.inflateOffsetMs", "hemo.iabp.deflateOffsetMs"], label: "IABP ratio / Balloon volume / Timing", name: "Intra-aortic balloon pump", unit: "1:1–1:3, mL, ms", normal: "40 mL balloon", convention: "IABP consoles" },
  { n: 285, s: '5.14', keys: ["ev.circ.lvad.flowLpm", "ev.circ.lvad.pi", "ev.circ.lvad.powerW", "ev.circ.lvad.suction"], label: "Speed / Flow / PI (LVAD) / Power / Suction", name: "Continuous-flow LVAD", unit: "rpm, L/min, —, W", normal: "HM3 speed 5,000–6,000; flow 4–6; power 4–5 W", convention: "LVAD controllers" },
  { n: 286, s: '5.14', keys: ["resp.driver.preox"], label: "Preoxygenation", name: "Face-mask preoxygenation (FiO2, duration)", unit: "—, s", normal: "3 min tidal or 8 deep breaths", convention: "Miller" },
  { n: 287, s: '5.15', keys: ["profile.pregnancyWeeks"], label: "GA (weeks)", name: "Gestational age", unit: "weeks", normal: "37–42 term", convention: "obstetrics" },
  { n: 288, s: '5.15', keys: [], label: "FHR", name: "Fetal heart rate baseline", unit: "bpm", normal: "110–160", convention: "NICE/FIGO CTG" },
  { n: 289, s: '5.15', keys: [], label: "Variability", name: "Baseline variability", unit: "bpm", normal: "5–25", convention: "FIGO" },
  { n: 290, s: '5.15', keys: [], label: "Decels (early / late / variable / prolonged)", name: "FHR decelerations", unit: "—", normal: "none or early", convention: "FIGO" },
  { n: 291, s: '5.15', keys: [], label: "Toco (UA)", name: "Uterine activity / contractions", unit: "mmHg or a.u.; /10 min", normal: "≤ 5 per 10 min", convention: "CTG" },
  { n: 292, s: '5.15', keys: [], label: "UBF", name: "Uterine blood flow", unit: "mL/min", normal: "≈ 700–800 at term (≈ 10 % of CO)", convention: "obstetric physiology" },
  { n: 293, s: '5.15', keys: [], label: "Tilt / position", name: "Left lateral tilt; supine hypotension", unit: "°", normal: "≥ 15° left tilt", convention: "obstetric anaesthesia" },
  { n: 294, s: '5.15', keys: [], label: "Block height", name: "Sensory block level (dermatome)", unit: "T-level", normal: "T4 for caesarean", convention: "obstetric anaesthesia" },
];

/**
 * Stage 9 additions (Ali reviews them with the glossary, R56): labels the instructor controls need that research/11 does
 * not list as a monitored quantity. Numbers 295–299 are these five; entries added at Task 0/2 (the labels of the truth
 * leaves FU-4, V.1, FU-6, FU-7 and 7k add) start at 300. research/11's numbers 1–294 never change.
 */
export const GLOSSARY_S9: readonly GlossaryEntry[] = [
  { n: 295, s: 'S9', keys: [], label: 'BP', name: 'Arterial blood pressure target (systolic / diastolic): what ART and NIBP read', unit: 'mmHg', normal: '90–140 / 60–90' },
  { n: 296, s: 'S9', keys: [], label: 'Rhythm', name: 'ECG rhythm', unit: '', normal: 'Sinus' },
  { n: 297, s: 'S9', keys: [], label: 'Onset', name: 'Time over which a change reaches its target', unit: 's', normal: '' },
  { n: 298, s: 'S9', keys: ['ev.state.values.contractility'], label: 'Contractility (×)', name: 'Instructor input in MANUAL mode: contractility as a multiple of the patient\'s baseline', unit: '× baseline', normal: '1' },
  { n: 299, s: 'S9', keys: ['ev.state.values.volumeStatus'], label: 'Volume status (×)', name: 'Instructor input in MANUAL mode: 1 = normal circulating volume, 0 = severe hypovolaemia', unit: '× baseline', normal: '1' },
];

/**
 * Stage 9: the per-key label where one research/11 entry names several quantities ("NIBP S/D/M", "Dial / FGF"): each
 * truth path gets its own part (research/11 §5.16 rule 3: collisions resolved by the label). Reviewed with the glossary.
 */
export const KEY_LABELS: Readonly<Record<string, string>> = {
  'mon.nibpSys': 'NIBP S', 'mon.nibpDia': 'NIBP D', 'mon.nibpMean': 'NIBP M',
  'ev.breath.tiS': 'Ti', 'ev.breath.teS': 'Te',
  'resp.driver.vent.rr': 'f set', 'resp.driver.vent.vt': 'VT set', 'resp.driver.vent.peep': 'PEEP', 'resp.driver.vent.ie': 'I:E',
  'ev.labs.values.pco2': 'PCO₂', 'ev.labResult.values.pco2': 'PCO₂', 'ev.labs.values.po2': 'PO₂', 'ev.labResult.values.po2': 'PO₂',
  'ev.labResult.drawnAt': 'Reported', 'ev.labs.drawnAt': 'Drawn',
  'ev.endo.shivering': 'Shivering', 'ev.endo.sweating': 'Sweating', 'ev.endo.vasoconstricted': 'Vasoconstricted',
  'organs.brain.mass': 'Haematoma volume', 'organs.brain.oedema': 'Oedema volume',
  'ev.organs.kidney.cumMl': 'UO total', 'ev.organs.kidney.bagMl': 'Urometer',
  'ev.anaesthesia.macBrain': 'MAC (brain)', 'ev.anaesthesia.macEff': 'MAC (opioid-adjusted)',
  'ev.anaesthesia.conscious': 'Consciousness', 'ev.anaesthesia.awarenessRisk': 'Awareness risk', 'ev.anaesthesia.movement': 'Movement',
  'ev.drugs.volatile.fi': 'Fi (agent)', 'ev.drugs.volatile.fa': 'Fet (agent)', 'ev.drugs.volatile.dialPct': 'Dial', 'ev.drugs.volatile.fgfLpm': 'FGF',
  'dev.defib.energyJ': 'Energy', 'dev.defib.state': 'Charging–ready', 'dev.defib.sync': 'SYNC', 'dev.defib.shocks': 'Shocks',
  'dev.pacer.mode': 'Pacer mode', 'dev.pacer.ratePpm': 'Pacer rate', 'dev.pacer.mA': 'Pacer output',
  'hemo.cpr.rate': 'CPR rate', 'hemo.cpr.quality': 'CPR quality',
  'hemo.iabp.ratio': 'IABP ratio', 'hemo.iabp.volumeMl': 'Balloon volume', 'hemo.iabp.inflateOffsetMs': 'Inflation timing', 'hemo.iabp.deflateOffsetMs': 'Deflation timing',
  'ev.circ.lvad.flowLpm': 'LVAD flow', 'ev.circ.lvad.pi': 'PI (LVAD)', 'ev.circ.lvad.powerW': 'LVAD power', 'ev.circ.lvad.suction': 'Suction',
  'hemo.circ.p.eesLv': 'Ees LV', 'hemo.circ.p.eesRv': 'Ees RV', 'hemo.circ.p.v0Sv': 'Vu', 'hemo.circ.p.cSv': 'Cv',
  'hemo.circOut.qLungL': 'Q̇ L lung', 'hemo.circOut.qLungR': 'Q̇ R lung', 'hemo.circ.baro.es': 'Sympathetic tone', 'hemo.circ.baro.ev': 'Vagal tone',
  'ev.state.values.contractility': 'Contractility (×)', 'ev.state.values.volumeStatus': 'Volume status (×)',
  // pattern keys (the key string as written in `keys`): one entry, several quantities per drug or site
  'ev.drugs.drugs.<id>.rate': 'Infusion rate', 'ev.drugs.drugs.<id>.tci': 'TCI target',
  'pk.bus.agents.<id>.nmj': 'Ce NMJ', 'pk.bus.agents.<id>.dia': 'Ce diaphragm', 'pk.bus.agents.<id>.vent': 'Ce ventilatory',
  // a '*' key names several quantities under one label: only the paths named here get a clinical label (review F1)
  'resp.temp.sites.oesophageal': 'Toes', 'resp.temp.sites.nasopharyngeal': 'Tnaso', 'resp.temp.sites.tympanic': 'Ttymp',
  'resp.temp.sites.bladder': 'Tblad', 'resp.temp.sites.rectal': 'Trect', 'resp.temp.sites.axilla': 'Taxil',
};

/**
 * Stage 9 (review F1): the screen label where research/11's label, shortened, would name two different quantities.
 * "T1" is both the core temperature (19) and the first twitch of the train-of-four (263); "UO" is mL/h (34) and
 * mL/kg/h (245). Reviewed by Ali with the glossary.
 */
export const SHORT: Readonly<Record<number, string>> = { 245: 'UO/kg', 263: 'TOF T1' };

/**
 * Stage 9 (review F1): entries that are the same quantity as another entry (the truth copy of a monitor value), so a
 * screen may show them under one label and Explore shows one row. Every other pair of entries must differ in label.
 */
export const SAME_AS: Readonly<Record<number, number>> = { 233: 31, 234: 32, 256: 193 };

/**
 * Drug display names (orchestrator ruling 5 on the R50 review: drug names join the glossary, R56). One row per drug of
 * the 7g library (placeholders without PD excluded), generated once from its `DRUGS` names and edited by hand from now
 * on. `uk` is the name the site's "adrenaline / noradrenaline" set shows; the set is a site-profile option, default
 * "epinephrine / norepinephrine" (Ali's open question Q13). A drug a later stage adds shows its library name until it
 * gets a row here.
 */
export const DRUG_NAMES: Readonly<Record<string, { name: string; uk?: string }>> = {
  adenosine: { name: "Adenosine" }, amiodarone: { name: "Amiodarone" }, atropine: { name: "Atropine" },
  bupivacaine: { name: "Bupivacaine" }, calciumChloride: { name: "Calcium chloride 10 %" }, calciumGluconate: { name: "Calcium gluconate 10 %" },
  cisatracurium: { name: "Cisatracurium" }, dantrolene: { name: "Dantrolene" }, desflurane: { name: "Desflurane" },
  dexmedetomidine: { name: "Dexmedetomidine" }, dextrose: { name: "Dextrose 50 %" }, dobutamine: { name: "Dobutamine" },
  dopamine: { name: "Dopamine" }, ephedrine: { name: "Ephedrine" }, epinephrine: { name: "Epinephrine", uk: "Adrenaline" },
  esmolol: { name: "Esmolol" }, etomidate: { name: "Etomidate" }, fentanyl: { name: "Fentanyl" },
  flumazenil: { name: "Flumazenil" }, furosemide: { name: "Furosemide" }, glycopyrrolate: { name: "Glycopyrrolate" },
  hydralazine: { name: "Hydralazine" }, hypertonicSaline: { name: "Hypertonic saline 3 %/7.5 %/23.4 %" }, insulin: { name: "Insulin (regular)" },
  insulinDextrose: { name: "Insulin + dextrose" }, isoflurane: { name: "Isoflurane" }, ketamine: { name: "Ketamine" },
  labetalol: { name: "Labetalol" }, lidocaine: { name: "Lidocaine" }, lipidEmulsion: { name: "Lipid emulsion 20 %" },
  magnesium: { name: "Magnesium sulfate" }, mannitol: { name: "Mannitol 20 %" }, metoprolol: { name: "Metoprolol" },
  midazolam: { name: "Midazolam" }, milrinone: { name: "Milrinone" }, morphine: { name: "Morphine" },
  naloxone: { name: "Naloxone" }, neostigmine: { name: "Neostigmine" }, nitroglycerin: { name: "Nitroglycerin" },
  n2o: { name: "Nitrous oxide" }, norepinephrine: { name: "Norepinephrine", uk: "Noradrenaline" }, phenylephrine: { name: "Phenylephrine" },
  propofol: { name: "Propofol" }, remifentanil: { name: "Remifentanil" }, rocuronium: { name: "Rocuronium" },
  ropivacaine: { name: "Ropivacaine" }, salbutamol: { name: "Salbutamol (IV/neb)" }, sevoflurane: { name: "Sevoflurane" },
  sodiumBicarbonate: { name: "Sodium bicarbonate 8.4 %" }, succinylcholine: { name: "Succinylcholine" }, sufentanil: { name: "Sufentanil" },
  sugammadex: { name: "Sugammadex" }, thiopental: { name: "Thiopental" }, vasopressin: { name: "Vasopressin" },
  vecuronium: { name: "Vecuronium" },
};
```

- [ ] **Step 2: Create `apps/demo/src/app/glossary.ts`**

```ts
// The R56 glossary at run time: engine key → clinical label, long name, unit and adult normal range. Every label the app
// shows for a physiological quantity comes from here (research/11 §5.16 rule 1); engine keys never reach the DOM of a
// clinical view. `#` in a key is a side index (0 = L, 1 = R), `*` and `<id>` stand for any one path segment.
import { DRUGS, type StateVar } from '@pme/engine-core';
import { DRUG_NAMES, GLOSSARY, GLOSSARY_S9, KEY_LABELS, SAME_AS, SHORT, type GlossaryEntry } from './glossary-data.ts';

export type { GlossaryEntry } from './glossary-data.ts';
export const ALL_ENTRIES: readonly GlossaryEntry[] = [...GLOSSARY_S9, ...GLOSSARY]; // S9 first: its split rows win the exact keys

const byN = new Map(ALL_ENTRIES.map((e) => [e.n, e]));
const exact = new Map<string, GlossaryEntry>();
const patterns: Array<{ re: RegExp; e: GlossaryEntry; key: string; kinds: string[] }> = [];
for (const e of ALL_ENTRIES) {
  for (const k of e.keys) {
    if (/[#*<]/.test(k)) {
      // one capture per wildcard, in order: '#' a side index, '*' any segment, '<id>'/'<agent>' a drug or agent id
      const kinds = [...k.matchAll(/#|\*|<[a-z]+>/g)].map((m) => m[0]);
      patterns.push({ re: new RegExp(`^${k.replace(/\./g, '\\.').replace(/#/g, '(\\d+)').replace(/\*|<[a-z]+>/g, '([^.]+)')}$`), e, key: k, kinds });
    } else if (!exact.has(k)) exact.set(k, e);
  }
}

/** The entry number a quantity is filed under: a truth copy of a monitor value counts as the monitor entry (F1). */
export const canon = (n: number): number => SAME_AS[n] ?? n;

/** The glossary entry by its research/11 number. Throws on an unknown number (a typo is a bug). */
export function entry(n: number): GlossaryEntry {
  const e = byN.get(n);
  if (!e) throw new Error(`no glossary entry ${n}`);
  return e;
}

const strip = (label: string): string => label.replace(/\s*\(.*$/, '').trim() || label;
/** Shortened label → the distinct quantities (canonical entry numbers) that would show it. */
const byShort = new Map<string, Set<number>>();
for (const e of ALL_ENTRIES) {
  const s = SHORT[e.n] ?? strip(e.label);
  byShort.set(s, (byShort.get(s) ?? new Set()).add(canon(e.n)));
}

/**
 * The label a screen shows. The glossary label loses its parenthesis only when what is left names one quantity
 * ("T1 (Tcore)" → "T1", "ART M (MAP)" → "ART M"); a qualifier that tells two quantities apart stays ("SVR (model)",
 * "EtCO₂ (true)", "RR (spont)"); SHORT overrides where research/11's own label is shared ("TOF T1"). Review F1.
 */
export function shortLabel(e: GlossaryEntry): string {
  const fixed = SHORT[e.n];
  if (fixed) return drugWords(fixed);
  const s = strip(e.label);
  return drugWords((byShort.get(s)?.size ?? 1) > 1 ? e.label : s);
}

export interface Lookup {
  e: GlossaryEntry;
  /** "L " / "R " for per-side keys, else "". */
  side: string;
  /** The key as written in the glossary (a pattern key keeps its wildcards). */
  key: string;
  /** The segments the wildcards matched, in order ('' for an exact key). */
  caps: string[];
  /** The drug or agent a '<id>'/'<agent>' wildcard matched, when the 7g library knows it. */
  drug: string | null;
}

/** Glossary entry for a truth path, or null (then the path is a model internal and stays out of clinical views). */
export function lookup(path: string): Lookup | null {
  const e = exact.get(path);
  if (e) return { e, side: '', key: path, caps: [], drug: null };
  for (const p of patterns) {
    const m = p.re.exec(path);
    if (!m) continue;
    const caps = m.slice(1).map((x) => x ?? '');
    const sideAt = p.kinds.indexOf('#');
    const idAt = p.kinds.findIndex((k) => k.startsWith('<'));
    const side = sideAt >= 0 ? `${caps[sideAt] === '0' ? 'L' : 'R'} ` : '';
    const id = idAt >= 0 ? (caps[idAt] ?? '') : '';
    return { e: p.e, side, key: p.key, caps, drug: id && DRUGS[id] ? id : null };
  }
  return null;
}

/**
 * The label for a truth path ("R CL", "SvO₂", "NIBP D", "Cp (Propofol)"), or null. A multi-quantity entry uses its
 * per-key label; a per-drug path names the drug, so two drugs' concentrations never share a label (review F1).
 */
export function labelOf(path: string): string | null {
  const l = lookup(path);
  if (!l) return null;
  // a '*' wildcard cannot tell its quantities apart: without a per-path label the path stays a model internal
  if (l.key.includes('*') && KEY_LABELS[path] === undefined) return null;
  const base = KEY_LABELS[path] ?? KEY_LABELS[l.key] ?? shortLabel(l.e);
  return `${l.side}${base}${l.drug ? ` (${drugName(l.drug)})` : ''}`;
}

/**
 * One key per distinct quantity for a list that must not repeat a value (Explore): the canonical entry, the per-key
 * label and the wildcard segments. Two copies of one quantity (monitor and truth) share a key; two quantities never do.
 */
export function rowKey(path: string): string | null {
  const l = lookup(path);
  return l && labelOf(path) !== null ? `${canon(l.e.n)}|${l.side}${KEY_LABELS[path] ?? KEY_LABELS[l.key] ?? ''}|${l.caps.join('.')}` : null;
}

// ---- drug names (orchestrator ruling 5): one display set for the whole app, chosen in the site profile ----
export type DrugNameSet = 'us' | 'uk';
let nameSet: DrugNameSet = 'us';
/** Choose the display set: 'us' = "epinephrine / norepinephrine" (default), 'uk' = "adrenaline / noradrenaline". */
export const setDrugNames = (set: DrugNameSet): void => void (nameSet = set);
export const drugNameSet = (): DrugNameSet => nameSet;

/** A drug's display name in the site's set (glossary `DRUG_NAMES`; the 7g library's name for a drug without a row). */
export function drugName(id: string): string {
  const row = DRUG_NAMES[id];
  if (row) return nameSet === 'uk' && row.uk ? row.uk : row.name;
  return DRUGS[id]?.name ?? 'Drug';
}

/** The two names of each drug that has a second one, in both directions, case kept ("adrenaline" ↔ "epinephrine"). */
const PAIRS: Array<[string, string]> = Object.values(DRUG_NAMES).filter((r) => r.uk).map((r) => [r.name, r.uk as string]);
/** Free text (a scenario objective, a learner button, a glossary label) in the site's set of drug names. */
export function drugWords(text: string): string {
  let out = text;
  for (const [us, uk] of PAIRS) {
    const [from, to] = nameSet === 'uk' ? [us, uk] : [uk, us];
    out = out.replace(new RegExp(`\\b${from}\\b`, 'g'), to).replace(new RegExp(`\\b${from.toLowerCase()}\\b`, 'g'), to.toLowerCase());
  }
  return out;
}

/** research/11 annotates some cells for the model's authors ("(engine fraction)", "engine 552 mL/min…: check the
 *  definition"); a screen shows the clinical part only. */
const authorNote = /\s*\([^)]*\bengine\b[^)]*\)/g;
/** The unit a screen prints after a value: the glossary unit without its notes ("/min (skins may show rpm)" → "/min"). */
export const unitOf = (e: GlossaryEntry): string => (e.unit === '—' ? '' : e.unit.replace(/\s*\([^)]*\)/g, '').trim());
/** The unit with its clinical notes, for the tooltip (author notes about the model removed). */
export const unitNoteOf = (e: GlossaryEntry): string => (e.unit === '—' ? '' : e.unit.replace(authorNote, '').trim());
export const nameOf = (e: GlossaryEntry): string => drugWords(e.name.replace(authorNote, '').trim());

/** Tooltip text: long name, unit and normal range. */
export function describeEntry(e: GlossaryEntry): string {
  const unit = unitNoteOf(e);
  return [nameOf(e), unit ? `Unit: ${unit}` : '', e.normal && e.normal !== '—' ? `Adult normal: ${e.normal}` : '', e.other ? `Child / pregnancy: ${e.other}` : '']
    .filter(Boolean)
    .join('\n');
}

/** Instructor targets (StateVar) → glossary entry numbers. `sbp`/`dbp` share the S9 "BP" entry. */
export const STATE_VAR_ENTRY: Readonly<Record<StateVar, number>> = {
  hr: 1, sbp: 295, dbp: 295, cvp: 8, papSys: 9, papDia: 10, pawp: 12, spo2: 3, pi: 4, rr: 18, vt: 125, etco2: 15, fio2: 130,
  shunt: 119, tempCore: 19, contractility: 298, svr: 61, k: 188, qtc: 23, volumeStatus: 299, paceThresholdMa: 282,
};

/** Display scale from the engine's unit into the glossary unit (research/11 §5.16 rule 4), where the console's own
 *  metadata does not already convert. Fractions → %, CaO2/CvO2 mL/L → mL/dL, relative brain/liver values → absolute. */
export const DISPLAY_SCALE: Readonly<Record<string, number>> = {
  'blood.core.o2.svo2': 100, 'blood.core.o2.er': 100, 'blood.core.o2.cao2': 0.1, 'resp.lung.o2.cv': 0.1, 'ev.organs.brain.sjvo2': 100,
  'ev.organs.brain.cbf': 50, 'ev.organs.brain.cmro2': 3.3, 'ev.organs.liver.hbfRel': 1.5, 'ev.state.values.fio2': 100, 'l1.coupled.fio2': 100,
  'ev.lungState.atelectasisFrac': 100, 'ev.lungState.vqAdmixture': 100, 'mon.tofRatio': 1,
};
```

- [ ] **Step 3: Create `apps/demo/src/app/glossary.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { KEY_LABELS } from './glossary-data.ts';
import { ALL_ENTRIES, canon, describeEntry, drugName, drugWords, entry, labelOf, lookup, nameOf, rowKey, setDrugNames, shortLabel, STATE_VAR_ENTRY, unitOf } from './glossary.ts';
import { DRUGS } from '@pme/engine-core';
import { DRUG_NAMES } from './glossary-data.ts';
import { VITALS } from './vitals.ts';

describe('R56 glossary', () => {
  it('has unique entry numbers, and every entry the app refers to exists', () => {
    const ns = ALL_ENTRIES.map((e) => e.n);
    expect(new Set(ns).size).toBe(ns.length);
    expect(ns.length).toBeGreaterThanOrEqual(299);
    for (const n of Object.values(STATE_VAR_ENTRY)) expect(() => entry(n)).not.toThrow();
    for (const v of VITALS) expect(() => entry(v.n)).not.toThrow();
    for (const n of [7, 296, 297]) expect(() => entry(n)).not.toThrow();
  });
  it('resolves truth paths, per-side paths and per-key labels', () => {
    expect(labelOf('mon.hr')).toBe('HR');
    expect(labelOf('mon.nibpDia')).toBe('NIBP D');
    expect(labelOf('resp.lung.lp.side.1.vdAlv')).toBe('R VD alv');
    expect(labelOf('hemo.circ.someInternalGain')).toBeNull();
    for (const k of Object.keys(KEY_LABELS)) expect(lookup(k), k).not.toBeNull();
  });
  it('keeps the collision rulings (research/11 §5.16 rule 3)', () => {
    expect(labelOf('mon.cpp')).toBe('CPP'); // cerebral
    expect(labelOf('ev.circ.cpp')).toBe('CoPP'); // coronary
    expect(labelOf('mon.pi')).toBe('PI');
    expect(labelOf('ev.circ.lvad.pi')).toBe('PI (LVAD)');
    expect(labelOf('mon.sr')).toBe('SR'); // suppression ratio, depth tile only
    expect(ALL_ENTRIES.filter((e) => e.label === 'SR').map((e) => e.n)).toEqual([28]);
    expect(labelOf('ev.labs.values.so2')).toBe('FO₂Hb');
    expect(labelOf('resp.o2.sa')).toBe('SaO₂');
  });
  it('never gives two different quantities the same label (review F1; research/11 §5.16 rule 3)', () => {
    // every key of every entry, with its wildcards filled in: both sides, two drugs, any segment
    const fill = (k: string): string[] =>
      k.includes('#') ? [...fill(k.replace('#', '0')), ...fill(k.replace('#', '1'))]
        : /<[a-z]+>/.test(k) ? [...fill(k.replace(/<[a-z]+>/, 'propofol')), ...fill(k.replace(/<[a-z]+>/, 'rocuronium'))]
          : k.includes('*') ? [...fill(k.replace('*', 'x')), ...fill(k.replace('*', 'y'))] : [k];
    const byLabel = new Map<string, Set<string>>();
    for (const e of ALL_ENTRIES) for (const k of e.keys) for (const p of fill(k)) {
      const l = labelOf(p);
      if (l === null) continue; // a '*' path without its own label is a model internal

      byLabel.set(l, (byLabel.get(l) ?? new Set()).add(rowKey(p) as string));
    }
    const shared = [...byLabel].filter(([, keys]) => keys.size > 1); // one label, two quantities
    expect(shared.map(([l, keys]) => `${l}: ${[...keys].join(' / ')}`)).toEqual([]);
    expect(shortLabel(entry(19))).toBe('T1'); // core temperature
    expect(shortLabel(entry(263))).toBe('TOF T1'); // first twitch
    expect(labelOf('hemo.circ.p.rSys')).toBe('SVR (model)');
    expect(labelOf('ev.circ.svr')).toBe('SVR');
    expect(labelOf('resp.etco2')).toBe('EtCO₂ (true)');
    expect(labelOf('ev.drugs.drugs.propofol.cp')).toBe('Cp (Propofol)');
    expect(labelOf('pk.bus.agents.rocuronium.nmj')).toBe('Ce NMJ (Rocuronium)');
    expect(canon(233)).toBe(31); // ICP truth = ICP monitor: one row in Explore
    expect(rowKey('mon.icpMean')).toBe(rowKey('ev.organs.brain.icp'));
    expect(rowKey('mon.etco2')).not.toBe(rowKey('resp.etco2'));
    expect(labelOf('resp.temp.sites.nasopharyngeal')).toBe('Tnaso');
    expect(labelOf('pk.bus.cns.loc')).toBeNull(); // '*' key: Model internals
  });
  it('drug names come from the glossary, in the site\'s set (orchestrator ruling 5)', () => {
    for (const d of Object.values(DRUGS)) if (d.cls !== 'placeholder') expect(DRUG_NAMES[d.id], d.id).toBeDefined();
    expect(drugName('norepinephrine')).toBe('Norepinephrine'); // default set: epinephrine / norepinephrine
    expect(labelOf('ev.endo.norepinephrinePgMl')).toBe('Norepinephrine'); // the plasma level follows the drug's name
    setDrugNames('uk');
    try {
      expect(drugName('epinephrine')).toBe('Adrenaline');
      expect(drugName('propofol')).toBe('Propofol');
      expect(labelOf('ev.endo.epinephrinePgMl')).toBe('Adrenaline');
      expect(drugWords('Give epinephrine after the second shock')).toBe('Give adrenaline after the second shock');
    } finally {
      setDrugNames('us');
    }
    expect(drugWords('Give adrenaline after the second shock')).toBe('Give epinephrine after the second shock');
    expect(nameOf(entry(259))).toBe('Plasma norepinephrine');
  });
  it('shows clinical units and names only (no notes written for the model authors)', () => {
    for (const e of ALL_ENTRIES) {
      expect(unitOf(e), `unit of ${e.n}`).not.toMatch(/engine|\(/);
      expect(nameOf(e), `name of ${e.n}`).not.toMatch(/\bengine\b|research\/|Stage \d|R\d{2}\b/);
      expect(describeEntry(e)).not.toMatch(/\bengine\b/);
    }
    expect(unitOf(entry(18))).toBe('/min');
    expect(unitOf(entry(130))).toBe('%');
  });
});
```

- [ ] **Step 4: Apply Task 0 Step 5's additions** — add the 7k keys and the `GLOSSARY_S9` entries (numbered from 300)
  recorded in `<scratchpad>/stage-9-clinical-ui/glossary-additions.md` to `glossary-data.ts`. Keep each research/11
  entry's number; never renumber. If 7k published ΔP, its path goes into entry 148's `keys` (Task 23's task 5 finds it).
- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/glossary.test.ts
```

Expected: 5 passed: unique numbers (≥ 299 entries), every entry the app names exists, `labelOf` gives HR / NIBP D / R VD alv / null for an internal path, every `KEY_LABELS` key resolves, the collision rulings hold (CPP cerebral, CoPP coronary, PI vs PI (LVAD), SR only #28, FO₂Hb, SaO₂), no label covers two quantities after every key's wildcards are filled (T1 vs TOF T1, SVR vs SVR (model), EtCO₂ vs EtCO₂ (true), Cp (Propofol) vs Cp (Rocuronium); ICP monitor and truth share one row key), no unit or name carries an author note.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/glossary-data.ts apps/demo/src/app/glossary.ts apps/demo/src/app/glossary.test.ts
git commit -m "feat(app): R56 clinical glossary — research/11 §5 entries, Stage 9 additions, per-key labels" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: Components, routes and the per-viewer store

**Files:**
- Create: `apps/demo/src/app/store.ts`
- Create: `apps/demo/src/app/ui.ts`
- Create: `apps/demo/src/app/router.ts`
- Create: `apps/demo/src/app/router.test.ts`
- Create: `apps/demo/src/app/ui.dom.test.ts`

**Interfaces:** `h`, `setText`, `button`, `seg`, `stepper`, `select`, `input`, `tip`, `glossLabel`, `confirmDialog`, `infoDialog`, `toast`, `tabs`, `throttle`, `download`, `toggle`, `clock`, `PIN_SVG`, `WAVE_SVG`, `store`; `parseRoute`, `hrefOf`, `onRoute`, `ROUTES`.

**Why:** The component set of brief §7 in plain DOM (element builder, buttons, segmented control, numeric stepper with unit and press-and-hold repeat, labelled select and input, glossary tooltip that opens on hover, focus AND tap, `<dialog>` confirm and info dialogs whose buttons name their outcome (UX-copy pass), toasts, ARIA tabs with arrow keys, a ≤ 2 Hz rAF throttle that never piles up callbacks in a hidden tab, download, toggle with `aria-pressed`). Hash routing in 30 lines (D1). `store.ts` wraps localStorage (private windows throw).

- [ ] **Step 1: Create `apps/demo/src/app/store.ts`**

```ts
// Per-viewer conveniences in localStorage (research/13 brief §5), wrapped: private windows and previews can throw.
export const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(`pme.${k}`);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(`pme.${k}`, v);
    } catch {
      /* per-viewer convenience only */
    }
  },
};

```

- [ ] **Step 2: Create `apps/demo/src/app/ui.ts`**

```ts
// The app's small component set (research/13 brief §7), plain DOM, no library: element builder, buttons, segmented
// control, numeric stepper with unit, glossary tooltip, confirm dialog (native <dialog>), toasts. Every input gets a
// label; every control is ≥ the --target size from app.css.
import { describeEntry, entry, shortLabel, type GlossaryEntry } from './glossary.ts';

type Attrs = Record<string, string | number | boolean | undefined | ((ev: Event) => void)>;
type Child = Node | string | null | undefined | false;

/** Element builder: `h('button', { class: 'btn', onclick: fn }, 'Give')`. `on*` keys are listeners. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const setText = (el: Element, s: string): void => {
  if (el.textContent !== s) el.textContent = s;
};

// ---- glossary tooltip: one shared bubble; hover, focus and tap all open it (no hover-only affordance) ----
let bubble: HTMLDivElement | null = null;
function showTip(anchor: HTMLElement, text: string): void {
  bubble ??= document.body.appendChild(h('div', { class: 'tipbubble', role: 'tooltip', id: 'tipbubble' }));
  bubble.textContent = text;
  bubble.style.cssText = 'position:fixed;z-index:60;max-width:320px;white-space:pre-line;background:var(--bezel-3);color:var(--text-strong);border:1px solid var(--line-strong);border-radius:6px;padding:8px 10px;font-size:13px;box-shadow:0 6px 24px rgb(0 0 0/.35)';
  const r = anchor.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 16);
  bubble.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
  bubble.style.top = `${r.bottom + 6 + 120 > window.innerHeight ? Math.max(8, r.top - 6 - bubble.offsetHeight) : r.bottom + 6}px`;
  bubble.hidden = false;
  anchor.setAttribute('aria-describedby', 'tipbubble');
}
function hideTip(): void {
  if (bubble) bubble.hidden = true;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideTip());
document.addEventListener('pointerdown', (e) => !(e.target as Element).closest?.('.tip') && hideTip());

/** "ⓘ" button that shows a glossary entry's long name, unit and normal range. `label` names the button after the row
 *  it sits in ("About Cp (Propofol)"), so two rows of one entry never share a button name (review F1). */
export function tip(e: GlossaryEntry, label = shortLabel(e)): HTMLButtonElement {
  const text = `${e.label}\n${describeEntry(e)}`;
  const b = h('button', { type: 'button', class: 'tip', 'aria-label': `About ${label}` }, 'ⓘ');
  b.addEventListener('mouseenter', () => showTip(b, text));
  b.addEventListener('mouseleave', hideTip);
  b.addEventListener('focus', () => showTip(b, text));
  b.addEventListener('blur', hideTip);
  b.addEventListener('click', () => showTip(b, text));
  return b;
}

/** A glossary label with its tooltip, by glossary number. */
export function glossLabel(n: number, prefix = ''): HTMLElement {
  const e = entry(n);
  return h('span', { class: 'lbl' }, h('b', {}, `${prefix}${shortLabel(e)}`), tip(e));
}

export function button(label: string, onclick: () => void, cls = '', attrs: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: `btn ${cls}`.trim(), onclick, ...attrs }, label);
}

/** Segmented control: one tap, aria-pressed on the chosen option. */
export function seg<T extends string>(label: string, options: Array<[T, string]>, value: T, onchange: (v: T) => void): HTMLElement & { value: T; set(v: T): void } {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label }) as unknown as HTMLElement & { value: T; set(v: T): void };
  const set = (v: T) => {
    wrap.value = v;
    for (const b of wrap.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
  };
  for (const [v, text] of options) wrap.append(h('button', { type: 'button', 'data-v': v, onclick: () => (set(v), onchange(v)) }, text));
  wrap.set = set;
  set(value);
  return wrap;
}

export interface Stepper {
  el: HTMLElement;
  input: HTMLInputElement;
  get value(): number;
  set(v: number): void;
}

/** − value + with a unit in the accessible name; press-and-hold repeats; typing is allowed. */
export function stepper(o: { label: string; unit: string; min: number; max: number; step: number; value: number; digits?: number; onchange?: (v: number) => void }): Stepper {
  const digits = o.digits ?? (o.step < 1 ? Math.min(2, String(o.step).split('.')[1]?.length ?? 1) : 0);
  const input = h('input', { type: 'number', inputmode: 'decimal', min: o.min, max: o.max, step: o.step, 'aria-label': `${o.label}${o.unit ? ` (${o.unit})` : ''}` });
  const clamp = (v: number) => Math.min(o.max, Math.max(o.min, v));
  const set = (v: number) => {
    input.value = clamp(v).toFixed(digits);
  };
  const bump = (d: number) => {
    set(Number(input.value) + d * o.step);
    o.onchange?.(Number(input.value));
  };
  const hold = (d: number) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const b = h('button', { type: 'button', 'aria-label': `${d < 0 ? 'Decrease' : 'Increase'} ${o.label}`, tabindex: -1 }, d < 0 ? '−' : '+');
    b.addEventListener('pointerdown', () => {
      bump(d);
      const rep = (ms: number) => (timer = setTimeout(() => (bump(d), rep(Math.max(40, ms * 0.8))), ms));
      rep(400);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    b.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && bump(d));
    return b;
  };
  input.addEventListener('change', () => {
    set(Number(input.value));
    o.onchange?.(Number(input.value));
  });
  set(o.value);
  const el = h('div', { class: 'stepper' }, hold(-1), input, hold(1));
  return { el, input, get value() { return Number(input.value); }, set };
}

/** Labelled select. */
export function select(label: string, options: Array<[string, string]>, value: string, onchange?: (v: string) => void, groups?: Record<string, Array<[string, string]>>): { el: HTMLElement; sel: HTMLSelectElement } {
  const id = `f${Math.random().toString(36).slice(2, 8)}`;
  const sel = h('select', { class: 'input', id });
  for (const [v, t] of options) sel.append(h('option', { value: v }, t));
  for (const [g, opts] of Object.entries(groups ?? {})) sel.append(h('optgroup', { label: g }, ...opts.map(([v, t]) => h('option', { value: v }, t))));
  sel.value = value;
  if (onchange) sel.addEventListener('change', () => onchange(sel.value));
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label), sel), sel };
}

/** Labelled number/text input. */
export function input(label: string, attrs: Attrs = {}): { el: HTMLElement; inp: HTMLInputElement } {
  const id = `f${Math.random().toString(36).slice(2, 8)}`;
  const inp = h('input', { class: 'input', id, ...attrs });
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label), inp), inp };
}

/** Confirm dialog (destructive or patient-resetting actions only). Both buttons name their outcome ("Restart patient" /
 *  "Keep this patient"). Resolves true on the primary action. */
export function confirmDialog(title: string, body: string, action: string, danger = true, keep = 'Cancel'): Promise<boolean> {
  return new Promise((resolve) => {
    const d = h('dialog', { 'aria-labelledby': 'dlg-t' },
      h('h2', { id: 'dlg-t' }, title), h('p', { style: 'white-space:pre-line' }, body),
      h('div', { class: 'actions' },
        button(keep, () => d.close('cancel'), 'ghost'),
        button(action, () => d.close('ok'), danger ? 'danger' : 'primary')));
    d.addEventListener('close', () => {
      resolve(d.returnValue === 'ok');
      d.remove();
    });
    document.body.append(d);
    d.showModal();
  });
}

const toastHost = (): HTMLElement => document.querySelector('.toasts') ?? document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
/** "Noradrenaline 0.1 µg/kg/min started" — the same verb as the button; 4 s. */
export function toast(text: string): void {
  const t = h('div', { class: 'toast' }, text);
  toastHost().append(t);
  setTimeout(() => t.remove(), 4000);
}

export const clock = (t: number | null | undefined): string =>
  t === null || t === undefined || !Number.isFinite(t) ? '--:--' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export { store } from './store.ts';

export const PIN_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4l-.6 3.2L9.5 6v1H6.5v4L6 12l-.5-1V7h-3V6l2.1-1.8z" fill="currentColor"/></svg>';
export const WAVE_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M0 7h2l1.5-4 2 8 2-6 1 2H12" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

/** Run `fn` at most every `ms` (trailing call kept), inside one animation frame: the panel's ≤ 2 Hz refresh (brief §10). */
export function throttle(fn: () => void, ms: number): () => void {
  let last = 0;
  let busy = false; // a timer or a frame is pending: a hidden tab (no frames) never piles up callbacks
  const frame = () => {
    busy = false;
    last = performance.now();
    fn();
  };
  return () => {
    if (busy) return;
    busy = true;
    setTimeout(() => requestAnimationFrame(frame), Math.max(0, last + ms - performance.now()));
  };
}

export interface TabDef {
  id: string;
  label: string;
  render(): HTMLElement;
}

/** ARIA tabs (arrow keys move, Home/End jump); panels are built on first open. Returns the root and a selector. */
export function tabs(label: string, defs: readonly TabDef[], initial: string, onSelect?: (id: string) => void, cls = 'tabs'): { el: HTMLElement; panels: HTMLElement; select(id: string): void; current(): string } {
  const list = h('div', { class: cls, role: 'tablist', 'aria-label': label });
  const panels = h('div', { class: 'tabpanels' });
  const built = new Map<string, HTMLElement>();
  let cur = '';
  const btns = defs.map((d) =>
    h('button', { type: 'button', role: 'tab', id: `tab-${d.id}`, 'aria-controls': `tp-${d.id}`, 'aria-selected': 'false', tabindex: -1, 'data-tab': d.id, onclick: () => select(d.id) }, d.label),
  );
  list.append(...btns);
  list.addEventListener('keydown', (e) => {
    const i = btns.findIndex((b) => b.dataset.tab === cur);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const b = btns[(n + btns.length) % btns.length] as HTMLButtonElement;
    select(b.dataset.tab as string);
    b.focus();
  });
  function select(id: string): void {
    if (!defs.some((d) => d.id === id)) return;
    cur = id;
    for (const b of btns) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    for (const d of defs) {
      let p = built.get(d.id);
      if (d.id === id && !p) {
        p = h('div', { class: 'tabpanel', role: 'tabpanel', id: `tp-${d.id}`, 'aria-labelledby': `tab-${d.id}`, tabindex: 0 }, d.render());
        built.set(d.id, p);
        panels.append(p);
      }
      if (p) p.hidden = d.id !== id;
    }
    onSelect?.(id);
  }
  select(initial);
  return { el: h('div', { class: 'tabs-wrap' }, list, panels), panels, select, current: () => cur };
}

/** Download a text file (log export, site profile). */
export function download(name: string, text: string, type = 'text/plain'): void {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 0);
}

/** Toggle button with aria-pressed and a filled dot when on (brief §7 "toggle"). */
export function toggle(label: string, on: boolean, onchange: (on: boolean) => void, cls = ''): HTMLButtonElement & { set(v: boolean): void } {
  const b = button(label, () => {
    const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(v));
    onchange(v);
  }, cls) as HTMLButtonElement & { set(v: boolean): void };
  b.setAttribute('aria-pressed', String(on));
  b.set = (v) => b.setAttribute('aria-pressed', String(v));
  return b;
}

/** Information dialog with one Close button (shortcut sheet, help). */
export function infoDialog(title: string, body: string | HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const d = h('dialog', { 'aria-labelledby': 'info-t' },
      h('h2', { id: 'info-t' }, title), typeof body === 'string' ? h('p', { style: 'white-space:pre-line' }, body) : body,
      h('div', { class: 'actions' }, button('Close', () => d.close(), 'primary')));
    d.addEventListener('close', () => {
      d.remove();
      resolve();
    });
    document.body.append(d);
    d.showModal();
  });
}
```

- [ ] **Step 3: Create `apps/demo/src/app/router.ts`**

```ts
// Hash routing without a router dependency (research/13 brief §5): `#/teach`, `#/explore/respiratory`, `#/validate/review`.
// Views are sections toggled with `hidden`; the monitor region is never unmounted while the session lives.
export const ROUTES = ['start', 'monitor', 'teach', 'remote', 'explore', 'vent', 'validate', 'dev', 'settings'] as const;
export type RouteId = (typeof ROUTES)[number];
export interface Route {
  id: RouteId;
  /** The rest of the path ("respiratory" in #/explore/respiratory), or ''. */
  sub: string;
}

/** Views that need the engine session (every other view works without one, e.g. a paired Remote). */
export const HOST_ROUTES: ReadonlySet<RouteId> = new Set(['monitor', 'teach', 'explore', 'vent', 'start']);

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [head = '', ...rest] = path.split('/').filter(Boolean);
  const id = (ROUTES as readonly string[]).includes(head) ? (head as RouteId) : 'start';
  return { id, sub: id === head ? rest.join('/') : '' };
}

export const hrefOf = (id: RouteId, sub = ''): string => `#/${id === 'start' ? '' : id}${sub ? `/${sub}` : ''}`;

/** Calls `fn` now and on every hash change; returns the unsubscribe. */
export function onRoute(fn: (r: Route) => void, win: Window = window): () => void {
  const run = () => fn(parseRoute(win.location.hash));
  win.addEventListener('hashchange', run);
  run();
  return () => win.removeEventListener('hashchange', run);
}
```

- [ ] **Step 4: Create `apps/demo/src/app/router.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { hrefOf, parseRoute } from './router.ts';

describe('hash routes', () => {
  it.each([
    ['', 'start', ''], ['#/', 'start', ''], ['#/teach', 'teach', ''], ['#/explore/respiratory', 'explore', 'respiratory'],
    ['#/validate/review?x=1', 'validate', 'review'], ['#/nonsense/x', 'start', ''], ['#teach', 'teach', ''],
  ])('%s → %s/%s', (hash, id, sub) => expect(parseRoute(hash)).toEqual({ id, sub }));
  it('round-trips', () => {
    expect(parseRoute(hrefOf('explore', 'brain'))).toEqual({ id: 'explore', sub: 'brain' });
    expect(hrefOf('start')).toBe('#/');
  });
});
```

- [ ] **Step 5: Create `apps/demo/src/app/ui.dom.test.ts`**

```ts
// @vitest-environment happy-dom
// The component set's behaviour contracts (research/13 brief §7): labels in the accessible name, units, clamping,
// ARIA tabs with arrow keys, pressed state on toggles and segmented controls.
import { describe, expect, it } from 'vitest';
import { glossLabel, seg, stepper, tabs, toggle } from './ui.ts';

describe('components', () => {
  it('stepper: unit in the accessible name, clamps to its range, repeats the step', () => {
    let got = 0;
    const s = stepper({ label: 'SpO₂ target', unit: '%', min: 0, max: 100, step: 1, value: 97, onchange: (v) => (got = v) });
    expect(s.input.getAttribute('aria-label')).toBe('SpO₂ target (%)');
    s.input.value = '140';
    s.input.dispatchEvent(new Event('change'));
    expect(s.value).toBe(100);
    expect(got).toBe(100);
    const [minus] = s.el.querySelectorAll('button');
    expect(minus?.getAttribute('aria-label')).toBe('Decrease SpO₂ target');
  });
  it('segmented control and toggle expose aria-pressed', () => {
    let v = '';
    const g = seg('Mode', [['modeled', 'MODELED'], ['manual', 'MANUAL']], 'modeled', (x) => (v = x));
    const b = g.querySelectorAll('button');
    (b[1] as HTMLButtonElement).click();
    expect(v).toBe('manual');
    expect([...b].map((x) => x.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    const t = toggle('Synchronised', false, () => undefined);
    t.click();
    expect(t.getAttribute('aria-pressed')).toBe('true');
  });
  it('tabs: one selected, arrow keys move, panels are built on first open', () => {
    let built = 0;
    const t = tabs('Instructor controls', ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase(), render: () => (built++, document.createElement('div')) })), 'a');
    document.body.append(t.el);
    expect(built).toBe(1);
    const list = t.el.querySelector('[role=tablist]') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(t.current()).toBe('c');
    expect(built).toBe(2);
    expect([...list.querySelectorAll('[role=tab]')].map((x) => x.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
  });
  it('glossary label: short label plus a tooltip button named after it', () => {
    const l = glossLabel(15);
    expect(l.querySelector('b')?.textContent).toBe('EtCO₂');
    expect(l.querySelector('button')?.getAttribute('aria-label')).toBe('About EtCO₂');
  });
});
```

- [ ] **Step 6: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/router.test.ts src/app/ui.dom.test.ts
```

Expected: 12 passed (routes: 8; components: stepper name/unit/clamp, aria-pressed on segments and toggles, tabs with arrow keys and lazy panels, glossary label + tooltip name).

- [ ] **Step 7: Commit and push**

```bash
git add apps/demo/src/app/store.ts apps/demo/src/app/ui.ts apps/demo/src/app/router.ts apps/demo/src/app/router.test.ts apps/demo/src/app/ui.dom.test.ts
git commit -m "feat(app): component set, hash routes and per-viewer store" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: Site profile, patients and the scenario library

**Files:**
- Create: `apps/demo/src/app/site.ts`
- Create: `apps/demo/src/app/site.test.ts`
- Create: `apps/demo/src/app/patients.ts`
- Create: `apps/demo/src/app/patients.test.ts`
- Create: `apps/demo/src/app/scenario-meta.ts`
- Create: `apps/demo/src/app/scenarios.ts`

**Interfaces:** `SiteProfile`, `loadSite`, `saveSite`, `parseSite`, `MONITORS`, `THEMES`; `PatientSpec`, `PATIENT_PRESETS`, `COMORBIDITIES`, `profileOf`, `oneLiner`, `ageBandOf`; `LIBRARY`, `cardOf`, `scenarioById`, `SCENARIO_META`, `CATEGORIES`, `storyOf`.

**Why:** The site profile belongs to the room, not the case (research/13 P11; D20), including the drug-name set (D28, orchestrator ruling 5). Patients: presets and comorbidities mapped 1:1 onto the engine's R22/7b profile, pregnancy shown as v1.1 (R60), sensors off when the site starts patients unattached (D11). The library loads every `pme-scenario/1` document (D12) and gives each a card with learner-facing copy from `scenario-meta.ts` (drafts for Ali).

- [ ] **Step 1: Create `apps/demo/src/app/site.ts`**

```ts
// The site profile (research/13 P11, Laerdal's profile vs scenario split): which monitor the room shows, its theme and
// alarm defaults, and the shell's units and speed. It belongs to the room, not to a case, so loading a scenario never
// changes it. Stored per browser (a convenience, research/13 brief §5) and exportable as one JSON file.
import { store } from './store.ts';

export interface SiteProfile {
  schema: 'pme-site/1';
  /** A skin or preset id (resolveSkin): 'saadat-like', 'iran-icu-as-found' (alarms off, as found in the ICU), … */
  skin: string;
  /** '' = the skin's own dark look; 'projector-light' | 'ecg-grid'. */
  theme: '' | 'projector-light' | 'ecg-grid';
  /** Frame rate cap: 30 for projectors and tablets on battery. */
  fps: 60 | 30;
  /** Where the instructor works by default on a wide screen: beside the monitor or in a drawer over it. */
  panel: 'split' | 'drawer';
  /** Gas partial pressures in the shell's tables (the monitor keeps its skin's unit). */
  gasUnit: 'mmHg' | 'kPa';
  /** New patients start with the sensors off: the learner attaches them and traces appear only then (Laerdal). */
  sensorsOff: boolean;
  /** Drug names on every screen (orchestrator ruling 5; Ali's open question Q13): 'us' "epinephrine / norepinephrine"
   *  (default), 'uk' "adrenaline / noradrenaline". */
  drugNames: 'us' | 'uk';
}

/** Monitor choices, in the words the Settings and Start screens use. */
export const MONITORS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'saadat-like', label: 'Saadat-style (factory settings)', hint: 'The monitor residents meet in Iranian theatres' },
  { id: 'iran-icu-as-found', label: 'Saadat-style, as found in the ICU', hint: 'Alarms off at power-on: turning them on is step one' },
  { id: 'philips-like', label: 'Philips-style', hint: 'IntelliVue layout and alarm grammar' },
  { id: 'mindray-like', label: 'Mindray-style', hint: 'BeneVision layout, separate technical alarm field' },
  { id: 'ge-like', label: 'GE-style', hint: 'CARESCAPE layout' },
  { id: 'zoll-like', label: 'Zoll-style defibrillator', hint: 'Monitor-defibrillator' },
  { id: 'lifepak-like', label: 'LIFEPAK-style defibrillator', hint: 'Monitor-defibrillator' },
];
/** The drug-name sets, in the words the Settings screen uses (orchestrator ruling 5). */
export const DRUG_NAME_SETS: ReadonlyArray<[SiteProfile['drugNames'], string]> = [['us', 'Epinephrine, norepinephrine'], ['uk', 'Adrenaline, noradrenaline']];
export const THEMES: ReadonlyArray<[SiteProfile['theme'], string]> = [['', 'Dark'], ['projector-light', 'Projector (light)'], ['ecg-grid', 'ECG paper grid']];

export const DEFAULT_SITE: SiteProfile = { schema: 'pme-site/1', skin: 'saadat-like', theme: '', fps: 60, panel: 'split', gasUnit: 'mmHg', sensorsOff: false, drugNames: 'us' };

export function parseSite(raw: unknown): SiteProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteProfile>;
  const d = DEFAULT_SITE;
  return {
    schema: 'pme-site/1',
    skin: MONITORS.some((m) => m.id === o.skin) ? (o.skin as string) : d.skin,
    theme: THEMES.some(([t]) => t === o.theme) ? (o.theme as SiteProfile['theme']) : d.theme,
    fps: o.fps === 30 ? 30 : 60,
    panel: o.panel === 'drawer' ? 'drawer' : 'split',
    gasUnit: o.gasUnit === 'kPa' ? 'kPa' : 'mmHg',
    sensorsOff: o.sensorsOff === true,
    drugNames: o.drugNames === 'uk' ? 'uk' : 'us',
  };
}

export function loadSite(): SiteProfile {
  try {
    return parseSite(JSON.parse(store.get('site') ?? '{}'));
  } catch {
    return { ...DEFAULT_SITE };
  }
}

export function saveSite(s: SiteProfile): void {
  store.set('site', JSON.stringify(s));
}

/** mmHg → the site's gas unit (1 kPa = 7.50062 mmHg). */
export const gas = (mmHg: number, unit: SiteProfile['gasUnit']): number => (unit === 'kPa' ? mmHg / 7.50062 : mmHg);
```

- [ ] **Step 2: Create `apps/demo/src/app/site.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE, gas, parseSite } from './site.ts';

describe('site profile', () => {
  it('keeps known values and replaces anything else with the default', () => {
    expect(parseSite({ skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk' })).toEqual({
      schema: 'pme-site/1', skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk',
    });
    expect(DEFAULT_SITE.drugNames).toBe('us'); // "epinephrine / norepinephrine" unless the site chooses (ruling 5)
    expect(parseSite({ skin: 'nonsense', fps: 144, theme: 'neon' })).toEqual(DEFAULT_SITE);
    expect(parseSite(null)).toEqual(DEFAULT_SITE);
  });
  it('converts gas pressures for the tables', () => {
    expect(gas(40, 'kPa')).toBeCloseTo(5.33, 2);
    expect(gas(40, 'mmHg')).toBe(40);
  });
});
```

- [ ] **Step 3: Create `apps/demo/src/app/patients.ts`**

```ts
// Patient profiles for the Start screen and the Patient tab (brief §4.9 "one Patient card"). A profile is fixed when the
// engine is created, so changing it restarts the patient (a confirm dialog says what resets). Comorbidities map 1:1
// onto the engine's R22 profile (`conditions`) and 7b's lung catalogue (`lungConditions`).
import type { PatientProfile, SensorId } from '@pme/engine-core';

export interface PatientSpec {
  ageY: number;
  sex: 'M' | 'F';
  weightKg: number;
  heightCm: number;
  /** Comorbidity ids from COMORBIDITIES. */
  comorbid: string[];
  /** Start with the monitoring sensors attached (else learners attach them: traces appear only after, Laerdal). */
  attached: boolean;
}

export interface Comorbidity {
  id: string;
  label: string;
  profile: Pick<PatientProfile, 'conditions' | 'lungConditions'>;
  /** Shown but not selectable yet (v1.1: 7j obstetric, R60). */
  later?: string;
}

export const COMORBIDITIES: readonly Comorbidity[] = [
  { id: 'htn', label: 'Hypertension', profile: { conditions: [{ id: 'htn' }] } },
  { id: 'cad', label: 'Coronary artery disease (stable)', profile: { conditions: [{ id: 'cad', grade: 'stable' }] } },
  { id: 'as', label: 'Aortic stenosis (severe)', profile: { conditions: [{ id: 'as', grade: 'severe' }] } },
  { id: 'hfref', label: 'Heart failure (reduced EF)', profile: { conditions: [{ id: 'hfref' }] } },
  { id: 'betaBlocked', label: 'β-blocked', profile: { conditions: [{ id: 'betaBlocked' }] } },
  { id: 'copd', label: 'COPD', profile: { lungConditions: [{ id: 'copd', severity: 0.5 }] } },
  { id: 'asthma', label: 'Asthma', profile: { lungConditions: [{ id: 'asthma', severity: 0.4 }] } },
  { id: 'obesity', label: 'Obesity', profile: { lungConditions: [{ id: 'obesity', severity: 0.6 }] } },
  { id: 'aki', label: 'Acute kidney injury', profile: { conditions: [{ id: 'aki' }] } },
  { id: 'pregnancy', label: 'Pregnancy (term)', profile: {}, later: 'v1.1' },
];

export interface PatientPreset {
  id: string;
  label: string;
  spec: PatientSpec;
}

const base = { heightCm: 175, comorbid: [] as string[], attached: true };
export const PATIENT_PRESETS: readonly PatientPreset[] = [
  { id: 'adult', label: 'Healthy adult', spec: { ...base, ageY: 40, sex: 'M', weightKg: 70 } },
  { id: 'elderly', label: 'Older, hypertensive', spec: { ...base, ageY: 75, sex: 'M', weightKg: 75, comorbid: ['htn', 'cad'] } },
  { id: 'cardiac', label: 'Aortic stenosis and CAD', spec: { ...base, ageY: 72, sex: 'F', weightKg: 64, heightCm: 160, comorbid: ['htn', 'as', 'cad'] } },
  { id: 'hfref', label: 'Heart failure', spec: { ...base, ageY: 60, sex: 'M', weightKg: 80, comorbid: ['hfref', 'betaBlocked'] } },
  { id: 'copd', label: 'COPD smoker', spec: { ...base, ageY: 66, sex: 'M', weightKg: 68, comorbid: ['copd'] } },
  { id: 'child', label: 'Child, 6 years', spec: { ...base, ageY: 6, sex: 'F', weightKg: 20, heightCm: 115 } },
];

const MONITORING: Partial<Record<SensorId, string>> = { ecg: 'on', spo2: 'on', nibp: 'on', co2: 'on', temp: 'on' };
const DETACHED: Partial<Record<SensorId, string>> = { ecg: 'off', spo2: 'off', nibp: 'off', co2: 'off', temp: 'off' };

export function profileOf(s: PatientSpec): PatientProfile {
  const picked = COMORBIDITIES.filter((c) => s.comorbid.includes(c.id) && !c.later);
  const conditions = picked.flatMap((c) => c.profile.conditions ?? []);
  const lungConditions = picked.flatMap((c) => c.profile.lungConditions ?? []);
  return {
    ageY: s.ageY, sex: s.sex, weightKg: s.weightKg, heightCm: s.heightCm,
    sensors: s.attached ? MONITORING : DETACHED,
    ...(conditions.length ? { conditions } : {}),
    ...(lungConditions.length ? { lungConditions } : {}),
  };
}

/** The session bar's one-liner: "M 60 y 80 kg, heart failure (reduced EF), β-blocked". */
export function oneLiner(s: PatientSpec): string {
  const lc = (t: string) => (/^[A-Z]{2}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`);
  const c = COMORBIDITIES.filter((x) => s.comorbid.includes(x.id)).map((x) => lc(x.label));
  return [`${s.sex} ${s.ageY} y ${s.weightKg} kg`, ...c].join(', ');
}

/** Age band of the monitor (alarm defaults): the skin's paediatric table under 12 years. */
export const ageBandOf = (s: PatientSpec): 'adult' | 'paediatric' => (s.ageY < 12 ? 'paediatric' : 'adult');
```

- [ ] **Step 4: Create `apps/demo/src/app/patients.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, profileOf } from './patients.ts';

describe('patient profiles', () => {
  it('map comorbidities 1:1 onto the engine profile and never include a later (v1.1) condition', () => {
    const p = profileOf({ ageY: 72, sex: 'F', weightKg: 64, heightCm: 160, comorbid: ['htn', 'as', 'copd', 'pregnancy'], attached: true });
    expect(p.conditions).toEqual([{ id: 'htn' }, { id: 'as', grade: 'severe' }]);
    expect(p.lungConditions).toEqual([{ id: 'copd', severity: 0.5 }]);
    expect(COMORBIDITIES.find((c) => c.id === 'pregnancy')?.later).toBe('v1.1');
  });
  it('sensors start off when the learner attaches them (traces appear only then)', () => {
    const base = PATIENT_PRESETS[0]?.spec;
    expect(base).toBeDefined();
    if (!base) return;
    expect(Object.values(profileOf({ ...base, attached: false }).sensors ?? {})).toEqual(['off', 'off', 'off', 'off', 'off']);
    expect(Object.values(profileOf(base).sensors ?? {}).every((s) => s === 'on')).toBe(true);
  });
  it('writes the session-bar one-liner in clinical words', () => {
    expect(oneLiner({ ageY: 60, sex: 'M', weightKg: 80, heightCm: 175, comorbid: ['hfref', 'betaBlocked'], attached: true })).toBe('M 60 y 80 kg, heart failure (reduced EF), β-blocked');
  });
});
```

- [ ] **Step 5: Create `apps/demo/src/app/scenario-meta.ts`**

```ts
// What a scenario card shows before a case is loaded (research/13 §4.3; TrainingMonitor's categorised catalogue; CAE and
// REALITi objectives checklists). `pme-scenario/1` carries the title, the notes and the patient; the category, the
// learner-facing story, the expected duration and the objectives live here until the schema gains them (request to
// 8b/v1.1). The document notes are written for authors (they name build stages); cards show `story` instead.
// Every built-in is a draft until Ali's clinical review.
export type Category = 'Resuscitation' | 'Haemodynamic crisis' | 'Anaesthesia depth and drugs' | 'Airway and breathing' | 'Metabolic and thermal';
export const CATEGORIES: readonly Category[] = ['Resuscitation', 'Haemodynamic crisis', 'Anaesthesia depth and drugs', 'Airway and breathing', 'Metabolic and thermal'];

export interface ScenarioMeta {
  category: Category;
  minutes: number;
  story: string;
  objectives: string[];
  /** Show the learner controls under the monitor when this scenario loads (orchestrator ruling 4). Default off; no
   *  built-in case turns them on yet — the instructor switches them on per run in the Scenario tab. */
  learnerControls?: boolean;
}

export const SCENARIO_META: Readonly<Record<string, ScenarioMeta>> = {
  'acls-vf-witnessed': {
    category: 'Resuscitation', minutes: 10,
    story: 'A 58-year-old man in recovery after a laparoscopic cholecystectomy stops responding. The monitor shows VF.',
    objectives: ['Recognise VF within 10 s of the rhythm change', 'Shock within 2 min of the arrest', 'Keep chest-compression pauses under 10 s', 'Give adrenaline after the second shock'],
  },
  'acls-pea-hypovolaemia': {
    category: 'Resuscitation', minutes: 12,
    story: 'A 34-year-old woman with a splenic injury becomes more tachycardic on the ward, then loses her pulse.',
    objectives: ['Recognise PEA: organised rhythm, no pulse', 'Start CPR without delay', 'Name hypovolaemia as the cause', 'Give volume and adrenaline'],
  },
  'acls-bradycardia-unstable': {
    category: 'Resuscitation', minutes: 10,
    story: 'A 72-year-old woman is dizzy and grey in the emergency department. Complete heart block, escape rate 32/min.',
    objectives: ['Recognise complete heart block with adverse features', 'Give atropine, then pace or start an adrenaline infusion', 'Confirm electrical and mechanical capture'],
  },
  'svt-adenosine': {
    category: 'Haemodynamic crisis', minutes: 8,
    story: 'A 26-year-old woman has palpitations. She is stable, with a regular narrow-complex tachycardia at 180/min.',
    objectives: ['Recognise a regular narrow-complex tachycardia', 'Try vagal manoeuvres first', 'Give adenosine 6 mg, then 12 mg, as a rapid push with a flush'],
  },
  'or-induction-hypotension': {
    category: 'Haemodynamic crisis', minutes: 10,
    story: 'A 67-year-old man on an ACE inhibitor becomes hypotensive after a propofol induction for a hernia repair.',
    objectives: ['Anticipate hypotension after induction in a treated hypertensive', 'Choose phenylephrine or ephedrine by heart rate', 'Recheck the blood pressure within 2 min'],
  },
  'depth-awareness': {
    category: 'Anaesthesia depth and drugs', minutes: 10,
    story: 'The propofol line comes apart unnoticed after induction and rocuronium. The patient is paralysed and lightening.',
    objectives: ['Notice the rising depth index, tachycardia and hypertension', 'Find the disconnected line', 'Give a propofol bolus and restart the infusion'],
  },
  'depth-light-anaesthesia': {
    category: 'Anaesthesia depth and drugs', minutes: 8,
    story: 'Sevoflurane at 0.6 MAC with no opioid or relaxant. The surgeon makes the skin incision.',
    objectives: ['Recognise the stress response to incision', 'Deepen to about 1.2 MAC', 'Give fentanyl 1–2 µg/kg'],
  },
  'depth-opioid-apnoea': {
    category: 'Airway and breathing', minutes: 8,
    story: 'Fentanyl 3 µg/kg is given for analgesia just before emergence from a remifentanil anaesthetic.',
    objectives: ['Recognise opioid-induced slow breathing, then apnoea', 'Support ventilation', 'Titrate naloxone'],
  },
  'nmb-mh-trigger': {
    category: 'Metabolic and thermal', minutes: 12,
    story: 'Succinylcholine for intubation and sevoflurane maintenance in a patient with an undisclosed family history.',
    objectives: ['Recognise a rising EtCO₂ despite ventilation, tachycardia and rigidity', 'Stop the volatile and hyperventilate with 100 % oxygen', 'Give dantrolene 2.5 mg/kg'],
  },
  'nmb-residual-block': {
    category: 'Airway and breathing', minutes: 10,
    story: 'Extubated 35 min after rocuronium 0.6 mg/kg with no reversal. Breathing is weak and obstructed.',
    objectives: ['Check the train-of-four before extubation', 'Recognise residual block', 'Give sugammadex and support the airway'],
  },
  'nmb-sux-burn': {
    category: 'Metabolic and thermal', minutes: 10,
    story: 'Rapid-sequence induction with succinylcholine 1.5 mg/kg for a dressing change, 10 days after a 40 % burn.',
    objectives: ['Recognise hyperkalaemia on the ECG', 'Treat it: calcium, insulin and dextrose', 'Name the error: no succinylcholine after the first 24–48 h of a burn'],
  },
};

/** Card fallback for a document without meta: its notes without author references (stage and ruling numbers). */
export function storyOf(id: string, notes: string | undefined): string {
  const m = SCENARIO_META[id];
  if (m) return m.story;
  const s = (notes ?? '').replace(/\s*\((?:Stage\s*)?\d[a-z]?[^)]*\)|\s*\bR\d+(?:\s*§\s*\d+)?/g, '');
  const first = /^[^.]*\./.exec(s)?.[0] ?? s;
  return first.trim();
}

export const draft = (title: string): { title: string; draft: boolean } => {
  const m = /^\[draft\]\s*/i.exec(title);
  return m ? { title: title.slice(m[0].length), draft: true } : { title, draft: false };
};
```

- [ ] **Step 6: Create `apps/demo/src/app/scenarios.ts`**

```ts
// The scenario library: every `pme-scenario/1` document in packages/controller/scenarios (the five the 6b runner bundles
// and the depth and neuromuscular cases 7f added), so a case a later stage adds appears without a code change.
import type { ScenarioDoc } from '@pme/controller';
import { draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';

const FILES = import.meta.glob<{ default: ScenarioDoc }>('../../../../packages/controller/scenarios/*.json', { eager: true });

export interface ScenarioCard {
  id: string;
  title: string;
  draft: boolean;
  story: string;
  category: Category | 'Other';
  minutes: number | null;
  objectives: string[];
  /** "F 72 y 70 kg" from the document's patient. */
  patient: string;
  doc: ScenarioDoc;
}

export function cardOf(doc: ScenarioDoc): ScenarioCard {
  const m = SCENARIO_META[doc.id];
  const p = doc.patient ?? {};
  const d = draft(doc.title);
  return {
    id: doc.id, title: d.title, draft: d.draft, story: storyOf(doc.id, doc.notes), category: m?.category ?? 'Other',
    minutes: m?.minutes ?? null, objectives: m?.objectives ?? [], doc,
    patient: [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' '),
  };
}

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('.schema.json'))
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

export const scenarioById = (id: string): ScenarioCard | undefined => LIBRARY.find((c) => c.id === id);
```

- [ ] **Step 7: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/site.test.ts src/app/patients.test.ts
```

Expected: 5 passed.

- [ ] **Step 8: Commit and push**

```bash
git add apps/demo/src/app/site.ts apps/demo/src/app/site.test.ts apps/demo/src/app/patients.ts apps/demo/src/app/patients.test.ts apps/demo/src/app/scenario-meta.ts apps/demo/src/app/scenarios.ts
git commit -m "feat(app): site profile, patient profiles and the scenario library with learner-facing cards" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: Clinical words: targets, doses, rhythms, log lines and scenario triggers

**Files:**
- Create: `apps/demo/src/app/vitals.ts`
- Create: `apps/demo/src/app/drugs.ts`
- Create: `apps/demo/src/app/rhythms.ts`
- Create: `apps/demo/src/app/describe.ts`
- Create: `apps/demo/src/app/triggers.ts`
- Create: `apps/demo/src/app/copy.test.ts`

**Interfaces:** `VITALS`, `vitalOf`, `vitalLabel`, `showVital`; `DRUG_LIST`, `findDrugs`, `doseUnits`, `rateUnits`, `perKg`, `unitText`, `PRESETS`; `rhythmGroups`, `rhythmLabel`; `describeCommand`, `SENSORS`, `CONDITIONS`; `whenText`, `transitionText`, `countdown`.

**Why:** Every command and trigger the instructor sees is written in clinical words (D13, D14; the controller's own describers print engine ids, R-S9-2), with drug names from the glossary in the site's set (D28). Targets carry the glossary label, the display scale and the engine's range (STATE_SCHEMA); drugs come from the engine's 7g library with draft presets (Q6) and per-kg arithmetic; rhythms are grouped the way a clinician looks for them.

- [ ] **Step 1: Create `apps/demo/src/app/vitals.ts`**

```ts
// The instructor's targets (engine StateVars) in clinical units: glossary label, display scale, step and range. Ranges
// are the engine's own (l1/state.ts STATE_SCHEMA), shown in the display unit. Order = the order a clinician reads a
// monitor: rate and rhythm, pressures, oxygenation, ventilation, temperature, then the model inputs.
import type { StateVar } from '@pme/engine-core';
import { entry, shortLabel, unitOf } from './glossary.ts';

export interface VitalSpec {
  v: StateVar;
  /** Glossary entry number (research/11 §5 or the Stage 9 additions). */
  n: number;
  /** Display = engine value × scale. */
  scale: number;
  unit: string;
  step: number;
  digits: number;
  min: number;
  max: number;
  group: 'Rate and pressures' | 'Oxygenation and ventilation' | 'Temperature and chemistry' | 'Model inputs';
  /** Shown only in MANUAL mode (inputs the model computes itself in MODELED). */
  manualOnly?: boolean;
}

const v = (s: Omit<VitalSpec, 'unit'> & { unit?: string }): VitalSpec => ({ ...s, unit: s.unit ?? unitOf(entry(s.n)) });
export const VITALS: readonly VitalSpec[] = [
  v({ v: 'hr', n: 1, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures' }),
  v({ v: 'sbp', n: 5, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures' }),
  v({ v: 'dbp', n: 6, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures' }),
  v({ v: 'cvp', n: 8, scale: 1, step: 1, digits: 0, min: -5, max: 40, group: 'Rate and pressures' }),
  v({ v: 'papSys', n: 9, scale: 1, step: 1, digits: 0, min: 0, max: 120, group: 'Rate and pressures' }),
  v({ v: 'papDia', n: 10, scale: 1, step: 1, digits: 0, min: 0, max: 60, group: 'Rate and pressures' }),
  v({ v: 'pawp', n: 12, scale: 1, step: 1, digits: 0, min: 0, max: 40, group: 'Rate and pressures' }),
  v({ v: 'spo2', n: 3, scale: 1, step: 1, digits: 0, min: 0, max: 100, group: 'Oxygenation and ventilation' }),
  v({ v: 'pi', n: 4, scale: 1, step: 0.1, digits: 1, min: 0.02, max: 20, group: 'Oxygenation and ventilation' }),
  v({ v: 'etco2', n: 15, scale: 1, step: 1, digits: 0, min: 0, max: 150, group: 'Oxygenation and ventilation' }),
  v({ v: 'rr', n: 18, scale: 1, step: 1, digits: 0, min: 0, max: 80, unit: '/min', group: 'Oxygenation and ventilation' }),
  v({ v: 'vt', n: 125, scale: 1, step: 10, digits: 0, min: 0, max: 1500, unit: 'mL', group: 'Oxygenation and ventilation' }),
  v({ v: 'fio2', n: 130, scale: 100, step: 1, digits: 0, min: 21, max: 100, unit: '%', group: 'Oxygenation and ventilation' }),
  v({ v: 'shunt', n: 119, scale: 100, step: 1, digits: 0, min: 0, max: 50, group: 'Oxygenation and ventilation' }),
  v({ v: 'tempCore', n: 19, scale: 1, step: 0.1, digits: 1, min: 25, max: 43, group: 'Temperature and chemistry' }),
  v({ v: 'k', n: 188, scale: 1, step: 0.1, digits: 1, min: 2, max: 9, group: 'Temperature and chemistry' }),
  v({ v: 'qtc', n: 23, scale: 1, step: 5, digits: 0, min: 300, max: 650, group: 'Temperature and chemistry' }),
  v({ v: 'contractility', n: 298, scale: 1, step: 0.05, digits: 2, min: 0.1, max: 2, unit: '× baseline', group: 'Model inputs', manualOnly: true }),
  v({ v: 'volumeStatus', n: 299, scale: 1, step: 0.05, digits: 2, min: 0, max: 1, unit: '× baseline', group: 'Model inputs', manualOnly: true }),
  v({ v: 'svr', n: 61, scale: 1333.22, step: 50, digits: 0, min: 400, max: 4000, unit: 'dyn·s·cm⁻⁵', group: 'Model inputs' }),
  v({ v: 'paceThresholdMa', n: 282, scale: 1, step: 5, digits: 0, min: 10, max: 200, group: 'Model inputs' }),
];

export const vitalOf = (x: StateVar): VitalSpec | undefined => VITALS.find((s) => s.v === x);
/** "HR", "ART S" — the glossary label of a target. */
export const vitalLabel = (x: StateVar): string => {
  const s = vitalOf(x);
  return s ? shortLabel(entry(s.n)) : 'Target';
};
/** Engine value → the display string without unit ("0.10" → "10"). */
export const showVital = (s: VitalSpec, engineValue: number | undefined): string =>
  engineValue === undefined || !Number.isFinite(engineValue) ? '--' : (engineValue * s.scale).toFixed(s.digits);
```

- [ ] **Step 2: Create `apps/demo/src/app/drugs.ts`**

```ts
// The dose picker's data (research/13 brief §7 "Dose picker"). Drug names and classes come from the engine's own library
// (7g `DRUGS`), so a drug a later stage adds is listed without a code change. The presets below are DRAFTS for Ali's
// review (brief Q6: "start from the 7g library's ranges; Ali reviews one table before Stage 9 code").
import { DRUGS, type DoseUnit, type RateUnit } from '@pme/engine-core';
import { drugName } from './glossary.ts';

export interface DrugPreset {
  bolus?: Array<[number, DoseUnit]>;
  infusion?: Array<[number, RateUnit]>;
  /** Other names people search for ("noradrenaline"). */
  aka?: string[];
}

/** Clinical display of an engine unit ("mcg" → "µg"). */
export const unitText = (u: string): string => u.replace(/mcg/g, 'µg');

export const PRESETS: Readonly<Record<string, DrugPreset>> = {
  propofol: { bolus: [[1, 'mg/kg'], [2, 'mg/kg'], [50, 'mg']], infusion: [[100, 'mcg/kg/min'], [150, 'mcg/kg/min']] },
  ketamine: { bolus: [[0.5, 'mg/kg'], [1, 'mg/kg'], [2, 'mg/kg']] },
  etomidate: { bolus: [[0.3, 'mg/kg']] },
  midazolam: { bolus: [[1, 'mg'], [2, 'mg']] },
  fentanyl: { bolus: [[1, 'mcg/kg'], [2, 'mcg/kg'], [50, 'mcg']] },
  remifentanil: { infusion: [[0.1, 'mcg/kg/min'], [0.2, 'mcg/kg/min']] },
  morphine: { bolus: [[2, 'mg'], [5, 'mg']] },
  rocuronium: { bolus: [[0.6, 'mg/kg'], [1.2, 'mg/kg']] },
  succinylcholine: { bolus: [[1, 'mg/kg'], [1.5, 'mg/kg']], aka: ['suxamethonium'] },
  sugammadex: { bolus: [[2, 'mg/kg'], [4, 'mg/kg'], [16, 'mg/kg']] },
  neostigmine: { bolus: [[50, 'mcg/kg']] },
  atropine: { bolus: [[0.5, 'mg'], [1, 'mg']] },
  glycopyrrolate: { bolus: [[0.2, 'mg']] },
  phenylephrine: { bolus: [[50, 'mcg'], [100, 'mcg'], [200, 'mcg']], infusion: [[0.5, 'mcg/kg/min']] },
  ephedrine: { bolus: [[6, 'mg'], [12, 'mg']] },
  norepinephrine: { infusion: [[0.05, 'mcg/kg/min'], [0.1, 'mcg/kg/min'], [0.2, 'mcg/kg/min']], aka: ['noradrenaline'] },
  epinephrine: { bolus: [[10, 'mcg'], [100, 'mcg'], [1, 'mg']], infusion: [[0.05, 'mcg/kg/min'], [0.1, 'mcg/kg/min']], aka: ['adrenaline'] },
  vasopressin: { bolus: [[1, 'units']], infusion: [[0.03, 'units/min']] },
  dobutamine: { infusion: [[5, 'mcg/kg/min'], [10, 'mcg/kg/min']] },
  esmolol: { bolus: [[0.5, 'mg/kg']] },
  labetalol: { bolus: [[5, 'mg'], [10, 'mg']] },
  amiodarone: { bolus: [[150, 'mg'], [300, 'mg']] },
  adenosine: { bolus: [[6, 'mg'], [12, 'mg']] },
  calciumChloride: { bolus: [[10, 'mg/kg'], [1, 'g']] },
  magnesium: { bolus: [[2, 'g']] },
  dantrolene: { bolus: [[2.5, 'mg/kg']] },
  naloxone: { bolus: [[40, 'mcg'], [100, 'mcg'], [400, 'mcg']] },
  lipidEmulsion: { bolus: [[1.5, 'mL/kg']], aka: ['intralipid'] },
};

export interface DrugItem {
  id: string;
  /** The display name in the site's set (glossary `DRUG_NAMES`, orchestrator ruling 5): read at use, not stored. */
  readonly name: string;
  cls: string;
  /** The unit the engine's library doses this drug in (mg, mcg, units, mmol, mL). */
  amountUnit: string;
  preset: DrugPreset;
}

/** Dose units offered for a drug: its own unit and per kg, plus g for drugs dosed in mg. */
export function doseUnits(d: DrugItem): DoseUnit[] {
  const a = d.amountUnit as DoseUnit;
  const u: DoseUnit[] = [a];
  if (a === 'mg' || a === 'mcg' || a === 'mL' || a === 'units' || a === 'mmol') u.push(`${a}/kg` as DoseUnit);
  if (a === 'mg') u.push('g', 'mcg');
  if (a === 'mcg') u.push('mg');
  return u;
}
export function rateUnits(d: DrugItem): RateUnit[] {
  const a = d.amountUnit;
  if (a === 'mcg') return ['mcg/kg/min', 'mcg/min'];
  if (a === 'mg') return ['mcg/kg/min', 'mg/kg/h', 'mg/h', 'mg/min'];
  if (a === 'units') return ['units/min', 'units/h'];
  return ['mL/h'];
}

export const DRUG_LIST: readonly DrugItem[] = Object.values(DRUGS)
  .filter((r) => r.cls !== 'placeholder')
  .map((r) => ({ id: r.id, get name() { return drugName(r.id); }, cls: r.cls, amountUnit: r.amountUnit, preset: PRESETS[r.id] ?? {} }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Search by name, id or another name ("noradr" finds norepinephrine). */
export function findDrugs(q: string): DrugItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [...DRUG_LIST];
  return DRUG_LIST.filter((d) => d.name.toLowerCase().includes(s) || d.id.toLowerCase().includes(s) || (d.preset.aka ?? []).some((a) => a.includes(s)));
}

/** "0.1 µg/kg/min = 7 µg/min" for this patient's weight; '' when the unit is not per kg. */
export function perKg(value: number, unit: string, weightKg: number): string {
  if (!unit.includes('/kg')) return '';
  const abs = value * weightKg;
  const digits = abs < 10 ? 1 : 0;
  return `${value} ${unitText(unit)} = ${abs.toFixed(digits)} ${unitText(unit.replace('/kg', ''))} for ${weightKg} kg`;
}
```

- [ ] **Step 3: Create `apps/demo/src/app/rhythms.ts`**

```ts
// The rhythm picker's groups (research/13 brief §7 "Rhythm picker"): the 36 library rhythms in the order a clinician
// looks for them. Labels come from the controller's rhythm vocabulary; an id this map does not know (a rhythm a later
// stage adds) lands in "Other" with its vocabulary label.
import { RHYTHM_IDS } from '@pme/engine-core';
import { stage1Vocabulary } from '@pme/controller';

const LABELS = new Map(stage1Vocabulary().rhythms.map((r) => [r.id as string, r.label]));
export const rhythmLabel = (id: string): string => LABELS.get(id) ?? 'Other rhythm';

export const RHYTHM_GROUPS: ReadonlyArray<[string, readonly string[]]> = [
  ['Sinus', ['sinus', 'sinusBrady', 'sinusTachy', 'sinusArrhythmia', 'sinusPause']],
  ['Atrial', ['afib', 'aflutter', 'atrialTach', 'mat', 'svtAvnrt', 'svtAvrt', 'wpwSinus', 'preexcitedAf']],
  ['Junctional', ['junctionalEscape', 'junctionalAccel', 'junctionalTachy']],
  ['AV block', ['avb1', 'avb2Mobitz1', 'avb2Mobitz2', 'avb2to1', 'avbHighGrade', 'avb3Narrow', 'avb3Wide']],
  ['Ventricular', ['idioventricular', 'aivr', 'vtMono', 'vtPoly', 'torsades']],
  ['Arrest', ['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal']],
  ['Paced', ['pacedAAI', 'pacedVVI', 'pacedDDD']],
];

/** Groups with every library id placed once ("Other" collects ids the map does not name). */
export function rhythmGroups(): Array<[string, string[]]> {
  const known = new Set<string>(RHYTHM_IDS);
  const placed = new Set<string>();
  const out: Array<[string, string[]]> = RHYTHM_GROUPS.map(([g, ids]) => [g, ids.filter((id) => known.has(id) && !placed.has(id) && placed.add(id))]);
  const rest = [...known].filter((id) => !placed.has(id));
  if (rest.length) out.push(['Other', rest]);
  return out.filter(([, ids]) => ids.length > 0);
}
```

- [ ] **Step 4: Create `apps/demo/src/app/describe.ts`**

```ts
// One clinical line per command, for the instructor log, toasts and the Remote (research/13 brief §7 "Toast": the same
// verb as the button). Engine ids never reach these lines: targets through the glossary, drugs by the library's name,
// conditions and rhythms by their catalogue labels.
import { DRUGS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { unitText } from './drugs.ts';
import { drugName } from './glossary.ts';
import { showVital, vitalLabel, vitalOf } from './vitals.ts';
import { rhythmLabel } from './rhythms.ts';

type Any = Record<string, unknown>;
const num = (x: unknown): number => (typeof x === 'number' ? x : Number.NaN);
const drug = (id: unknown): string => (DRUGS[String(id)] ? drugName(String(id)) : 'Drug'); // the site's name set (ruling 5)
const over = (s: unknown): string => {
  const n = num(s);
  if (!(n > 0)) return '';
  return n >= 60 ? ` over ${+(n / 60).toFixed(1)} min` : ` over ${n} s`;
};
const grade = (sev: unknown): string => {
  const s = num(sev);
  return s <= 0 ? 'removed' : s < 0.45 ? 'mild' : s < 0.8 ? 'moderate' : 'severe';
};
export const CONDITIONS: Readonly<Record<string, string>> = {
  tamponade: 'Cardiac tamponade', pe: 'Pulmonary embolism', tensionPtx: 'Tension pneumothorax', rvInfarct: 'Right-ventricular infarction',
  anaphylaxis: 'Anaphylaxis', mh: 'Malignant hyperthermia', last: 'Local anaesthetic toxicity', burns: 'Burns', dka: 'Diabetic ketoacidosis', sepsis: 'Sepsis',
};
export const SENSORS: Readonly<Record<string, string>> = {
  ecg: 'ECG leads', spo2: 'SpO₂ probe', nibp: 'NIBP cuff', abp: 'Arterial line', cvp: 'CVP line', pap: 'PA catheter', co2: 'CO₂ sampling line', temp: 'Temperature probe',
};
const AIRWAY: Readonly<Record<string, string>> = {
  patent: 'patent', obstructed: 'obstructed', apnoea: 'apnoeic', disconnected: 'disconnected', oesophageal: 'tube in the oesophagus',
  endobronchial: 'tube endobronchial', bronchospasm: 'bronchospasm',
};

function event(e: Any): string {
  switch (e.kind) {
    case 'drug':
      return `${drug(e.drugId)} ${e.dose} ${unitText(String(e.unit))} ${e.route === 'iv' || e.route === undefined ? 'IV' : String(e.route).toUpperCase()}`;
    case 'infusion':
      return num(e.rate) > 0 ? `${drug(e.drugId)} ${e.rate} ${unitText(String(e.unit))} infusion started` : `${drug(e.drugId)} infusion stopped`;
    case 'tci':
      return num(e.target) > 0 ? `${drug(e.drugId)} target-controlled infusion, ${e.mode === 'effect' ? 'effect-site' : 'plasma'} target ${e.target}` : `${drug(e.drugId)} target-controlled infusion stopped`;
    case 'vaporiser':
      return num(e.dialPct) > 0 ? `${drug(e.agent)} ${e.dialPct} % at ${e.fgfLpm} L/min fresh gas` : `${drug(e.agent)} vaporiser off`;
    case 'fluid':
      return `${String(e.fluid) === 'blood' ? 'Blood' : String(e.fluid) === 'colloid' ? 'Colloid' : 'Crystalloid'} ${e.volumeMl} mL${over(e.overS)}`;
    case 'bleed':
      return e.rateMlPerMin !== undefined ? `Bleeding ${e.rateMlPerMin} mL/min` : `Blood loss ${e.volumeMl} mL${over(e.overS)}`;
    case 'airway':
      return `Airway ${AIRWAY[String(e.state)] ?? 'changed'}`;
    case 'ventilation':
      return e.source === 'ventilator' || e.source === 'bvm'
        ? `${e.source === 'bvm' ? 'Bag-mask' : 'Ventilator'}: RR ${e.rr} /min, VT ${e.vtMl} mL, PEEP ${e.peep} cmH₂O, FiO₂ ${Math.round(num(e.fio2) * 100)} %`
        : e.source === 'spontaneous' ? 'Breathing spontaneously' : 'No ventilation';
    case 'preoxygenate':
      return `Preoxygenation, FiO₂ ${Math.round(num(e.fio2) * 100)} %`;
    case 'cpr':
      return e.active ? `CPR started${e.rate ? `, ${e.rate} /min` : ''}` : 'CPR stopped';
    case 'defib':
      return e.action === 'charge' ? `Defibrillator charging to ${e.energyJ ?? ''} J` : e.action === 'shock' ? 'Shock delivered' : e.action === 'disarm' ? 'Defibrillator disarmed'
        : e.action === 'syncOn' ? 'Synchronised mode on' : e.action === 'syncOff' ? 'Synchronised mode off' : e.action === 'selectEnergy' ? `Energy ${e.energyJ} J` : 'Post-shock rhythm chosen';
    case 'pacer':
      return e.mode === 'off' ? 'Pacer off' : `Pacer ${e.mode}, ${e.ratePpm} /min, ${e.mA} mA${e.pause ? ' (paused)' : ''}`;
    case 'lungCondition': {
      const c = LUNG_CONDITIONS.find((x) => x.id === e.id);
      return `${c?.label ?? 'Lung condition'}: ${grade(e.severity)}${e.side ? ` (${e.side === 'L' ? 'left' : 'right'})` : ''}`;
    }
    case 'condition':
      return `${CONDITIONS[String(e.id)] ?? 'Condition'}: ${grade(e.severity)}`;
    case 'recruit':
      return `Recruitment manoeuvre ${e.pressureCmH2O} cmH₂O for ${e.durationS} s`;
    case 'lab':
      return `${String(e.panel) === 'vbg' ? 'Venous' : 'Arterial'} blood gas sent`;
    case 'mainstem':
      return e.ventilated === 'both' ? 'Both lungs ventilated' : `Only the ${e.ventilated} lung ventilated`;
    default:
      return 'Clinical event';
  }
}

export function describeCommand(c: Any): string {
  switch (c.type) {
    case 'setTarget':
    case 'pin': {
      const s = vitalOf(c.variable as never);
      const val = s ? `${showVital(s, num(c.value))} ${s.unit}` : String(c.value);
      const ramp = (c.ramp as { durationS?: number } | undefined)?.durationS;
      return `${vitalLabel(c.variable as never)} ${c.type === 'pin' ? 'held at' : 'target'} ${val}${over(ramp)}`;
    }
    case 'release':
      return c.variable === 'all' ? 'All values returned to the model' : `${vitalLabel(c.variable as never)} returned to the model`;
    case 'setMode':
      return `Mode: ${String(c.mode).toUpperCase()}`;
    case 'setRhythm':
      return `Rhythm: ${(RHYTHM_IDS as readonly string[]).includes(String(c.rhythm)) ? rhythmLabel(String(c.rhythm)) : 'changed'}`;
    case 'setModifiers':
      return 'ECG modifiers changed';
    case 'setFactor':
      return `Model factor ×${c.factor}`;
    case 'time':
      return c.action === 'pause' ? 'Simulation paused' : c.action === 'resume' ? 'Simulation resumed' : c.action === 'scale' ? `Speed ×${c.value}` : 'Time changed';
    case 'scenario': {
      const doc = c.doc as { title?: string } | undefined;
      const a = String(c.action);
      if (a === 'load') return `Scenario loaded: ${(doc?.title ?? '').replace(/^\[draft\]\s*/i, '') || 'case'}`;
      if (a === 'bookmark') return `Bookmark: ${c.target ?? ''}`.trim();
      if (a === 'restoreBookmark') return `Returned to bookmark ${c.target ?? ''}`.trim();
      if (a === 'goto') return 'Scenario: jumped to a state';
      return a === 'pause' ? 'Scenario timer held' : a === 'resume' ? 'Scenario timer running' : 'Scenario event';
    }
    case 'applyEvent':
      return event((c.event ?? {}) as Any);
    case 'attachSensor':
      return `${SENSORS[String(c.sensor)] ?? 'Sensor'} ${c.state === 'off' || c.state === 'none' ? 'removed' : 'attached'}`;
    case 'device': {
      const a = (c.action ?? {}) as Any;
      if (a.device === 'nibp') return a.action === 'start' ? 'NIBP measurement started' : 'NIBP setting changed';
      if (a.device === 'alarm') return a.action === 'silence' ? 'Alarm sound silenced' : a.action === 'pause' ? 'Alarms paused' : a.action === 'ack' ? 'Alarms acknowledged' : a.action === 'enableAll' ? 'All alarms on' : 'Alarm setting changed';
      if (a.device === 'monitor') return 'Monitor setting changed';
      return 'Device setting changed';
    }
    default:
      return 'Instructor action';
  }
}
```

- [ ] **Step 5: Create `apps/demo/src/app/triggers.ts`**

```ts
// A scenario transition's trigger in clinical words ("EtCO₂ ≥ 20 mmHg for 30 s", "Shock of at least 150 J", "Adrenaline
// given"), for the run strip's "next" list. The controller's own describeTransition prints engine ids; this is the
// panel's copy of the same grammar with glossary labels and state names.
import { DRUGS, type StateVar } from '@pme/engine-core';
import type { ScenarioDoc, Transition, When } from '@pme/controller';
import { drugName, labelOf } from './glossary.ts';
import { SENSORS } from './describe.ts';
import { vitalLabel, vitalOf } from './vitals.ts';

const OP: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' };
const KIND: Record<string, string> = {
  defib: 'Defibrillator', drug: 'Drug', cpr: 'CPR', fluid: 'Fluid', airway: 'Airway', ventilation: 'Ventilation', pacer: 'Pacing', bleed: 'Bleeding',
  preoxygenate: 'Preoxygenation', line: 'Invasive line', surgical: 'Surgical event', condition: 'Condition',
};

function varText(v: string): string {
  const s = vitalOf(v as StateVar);
  return s ? vitalLabel(v as StateVar) : labelOf(`mon.${v}`) ?? 'A vital sign';
}

export function whenText(w: When): string {
  if ('afterS' in w) return `after ${dur(w.afterS)} in this state`;
  if ('atScenarioS' in w) return `at ${dur(w.atScenarioS)} into the scenario`;
  if ('vital' in w) {
    const s = vitalOf(w.vital.var as StateVar);
    return `${varText(w.vital.var)} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${s ? ` ${s.unit}` : ''}${w.vital.forS ? ` for ${dur(w.vital.forS)}` : ''}`;
  }
  if ('event' in w) {
    const e = w.event;
    if (e.kind === 'defib') return e.action === 'shock' ? `a shock${e.minJ ? ` of at least ${e.minJ} J` : ''}` : e.action === 'charge' ? 'the defibrillator charged' : 'a defibrillator action';
    if (e.kind === 'drug') return `${e.drugId && DRUGS[String(e.drugId)] ? drugName(String(e.drugId)) : 'a drug'} given${e.minDose ? ` (at least ${e.minDose})` : ''}`;
    if (e.kind === 'cpr') return e.active === false ? 'CPR stopped' : 'CPR started';
    if (e.kind === 'fluid') return `fluid given${e.minVolumeMl ? ` (at least ${e.minVolumeMl} mL)` : ''}`;
    if (e.kind === 'pacer') return `pacing${e.minMa ? ` at ${e.minMa} mA or more` : ''}`;
    return `${(KIND[e.kind] ?? 'An intervention').toLowerCase()}`;
  }
  if ('sensor' in w) return `${SENSORS[w.sensor.sensor] ?? 'a sensor'} ${w.sensor.state === 'off' || w.sensor.state === 'none' ? 'removed' : 'attached'}`;
  if ('manual' in w) return `you press "${w.manual.label}"`;
  if ('all' in w) return w.all.map(whenText).join(' and ');
  return w.any.map(whenText).join(' or ');
}

/** "a shock of at least 150 J → ROSC (30 % chance, else stays)". */
export function transitionText(t: Transition, doc: ScenarioDoc | null): string {
  const name = (id: string) => doc?.states.find((s) => s.id === id)?.label ?? 'next state';
  const p = t.probability !== undefined ? ` (${Math.round(t.probability * 100)} % chance${t.else ? `, else ${name(t.else)}` : ''})` : '';
  const w = whenText(t.when);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}: ${name(t.to)}${p}`;
}

/** Seconds left for a time trigger, or null. */
export function countdown(t: Transition, inState: number, scenarioT: number): number | null {
  if ('afterS' in t.when) return Math.max(0, t.when.afterS - inState);
  if ('atScenarioS' in t.when) return Math.max(0, t.when.atScenarioS - scenarioT);
  return null;
}

const dur = (s: number): string => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
```

- [ ] **Step 6: Create `apps/demo/src/app/copy.test.ts`**

```ts
// The UX-copy rules as tests: scenario cards, trigger text and log lines never show an engine id, a build-stage or a
// ruling number (research/13 brief; R56).
import { describe, expect, it } from 'vitest';
import type { ScenarioDoc } from '@pme/controller';
import { describeCommand } from './describe.ts';
import { LIBRARY } from './scenarios.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { transitionText } from './triggers.ts';
import { LEARNER_ACTIONS } from '../stage6b/actions.ts';
import { drugWords } from './glossary.ts';

/** camelCase or dotted engine ids ("etco2", "vfCoarse", "mon.hr"), build stages and rulings. */
const LEAK = /\b(?!(?:mmHg|cmH|pH|mEq|kPa|iCa|mOsm|mL|dL|mA|awRR)\b)[a-z]+[A-Z][A-Za-z]*\b|\b[a-z]+\.[a-z]+\b|\bStage \d|\b7[a-k]\b|\bR\d{2}\b|\b(etco2|spo2|fio2|sbp|dbp|hr|rosc|vf)\b/;

describe('clinical copy', () => {
  it('the library holds every scenario document and every card has meta written for learners', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(11);
    for (const c of LIBRARY) {
      expect(SCENARIO_META[c.id], `${c.id} has card meta`).toBeDefined();
      expect(`${c.title} ${c.story} ${c.objectives.join(' ')}`).not.toMatch(LEAK);
      expect(c.title).not.toMatch(/^\[draft\]/i);
    }
  });
  it('every transition of every scenario reads in clinical words', () => {
    for (const c of LIBRARY) {
      const doc = c.doc as ScenarioDoc;
      for (const s of doc.states) for (const t of s.transitions ?? []) expect(transitionText(t, doc), `${c.id}/${t.id}`).not.toMatch(LEAK);
    }
  });
  it('log lines name drugs, targets, rhythms and devices clinically', () => {
    const cmds: Array<Record<string, unknown>> = [
      { type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 30 } },
      { type: 'pin', variable: 'spo2', value: 85 },
      { type: 'release', variable: 'spo2' },
      { type: 'setRhythm', rhythm: 'vfCoarse' },
      { type: 'setMode', mode: 'modeled' },
      { type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } },
      { type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' } },
      { type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 } },
      { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } },
      { type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' } },
      { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
      { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110 } },
      { type: 'attachSensor', sensor: 'spo2', state: 'off' },
      { type: 'device', action: { device: 'alarm', action: 'silence' } },
      { type: 'scenario', action: 'load', doc: { title: '[draft] Witnessed VF in PACU' } },
    ];
    const lines = cmds.map((c) => describeCommand(c));
    for (const l of lines) expect(l).not.toMatch(LEAK);
    expect(lines).toContain('HR target 110 bpm over 30 s');
    expect(lines).toContain('Norepinephrine 0.1 µg/kg/min infusion started');
    expect(lines).toContain('Rhythm: Coarse VF');
  });
  it('learner controls read clinically in either drug-name set (rulings 4 and 5)', () => {
    for (const a of LEARNER_ACTIONS) expect(drugWords(a.label), a.id).not.toMatch(LEAK);
    expect(LEARNER_ACTIONS.map((a) => a.label)).toContain('Epinephrine 1 mg');
  });
});
```

- [ ] **Step 7: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/copy.test.ts
```

Expected: 3 passed: the library holds ≥ 11 documents, each with meta and no engine id/stage/ruling in title, story or objectives; every transition of every scenario reads without an engine id; 15 sample commands read clinically ("HR target 110 bpm over 30 s", "Norepinephrine 0.1 µg/kg/min infusion started", "Rhythm: Coarse VF").

- [ ] **Step 8: Commit and push**

```bash
git add apps/demo/src/app/vitals.ts apps/demo/src/app/drugs.ts apps/demo/src/app/rhythms.ts apps/demo/src/app/describe.ts apps/demo/src/app/triggers.ts apps/demo/src/app/copy.test.ts
git commit -m "feat(app): clinical wording for targets, doses, rhythms, log lines and scenario triggers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: One engine session, the panel link and stage-then-commit

**Files:**
- Create: `apps/demo/src/app/session.ts`
- Create: `apps/demo/src/app/link.ts`
- Create: `apps/demo/src/app/staging.ts`
- Create: `apps/demo/src/app/staging.test.ts`

**Interfaces:** `AppSession` (`code`, `host`, `driver`, `panel`, `panelTransport`, `monitor`, `spec`, `mode`, `live`, `onEvent`, `onMount`, `simNow`, `send`, `setTimeScale`, `setPaused`, `setSkin` (also applies the skin's alarm colours, R50 review F5), `enableSound`, `restart`, `loadScenario`, `destroy`; option `load: 'perf8'` mounts `PERF8`, the Stage 8a 8-lane performance load, for the frame gate, R50 review F6); `Link` (`ctl`, `host`, `alarms`, `device`, `log`, `ramps`, `send`, `note`, `onChange`, `alarmSummary`), `logCsv`; `Staging` (`submit`, `commit`, `discard`, `autoApply`, `transitionS`, `lines`).

**Why:** `AppSession` (D2) owns the monitor, the 6a host session and the 6b driver; `restart`/`loadScenario` remount behind a stable `HostTarget`; `onMount` lets the ventilator link re-attach. `Link` (D3) is what every panel talks to: the controller session plus a tap of the same transport (alarmStatus/deviceStatus), onset ramps for the trend markers (D9) and the clinical log with CSV export. `Staging` (D7) keeps one entry per control and commits them as one stage group with one onset.

- [ ] **Step 1: Create `apps/demo/src/app/session.ts`**

```ts
// ONE engine session per app document (research/13 brief §5). It owns the monitor (mountMonitor, the renderer's worker
// path, the skin's device UI — FU-5's, untouched), the Stage 6a HostSession (the in-process hub for this page's panel,
// BroadcastChannel for a paired Remote, relay/WebRTC with ?relay=) and the Stage 6b ScenarioDriver. Switching views
// never touches it; only "Restart patient" (a new body = a new engine) remounts the monitor, behind a stable
// HostTarget so the HostSession, the driver and every listener survive the restart.
import type { Command, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import {
  ControllerSession, createBroadcastChannelTransport, createInProcessHub, HostSession, newSessionCode, normalizeSessionCode,
  type HostTarget, type ScenarioEvent,
} from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import type { ManagedTransport } from '@pme/controller';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { ageBandOf, profileOf, type PatientSpec } from './patients.ts';
import { applySkinAlarmColours } from './shell.ts';

export type Mode = 'modeled' | 'manual';
export interface SessionStart {
  spec: PatientSpec;
  mode: Mode;
  seed?: number;
}

const TICK_S = 0.02;

/**
 * The Stage 8a performance load (`validation-perf.html`, review F6): 8 lanes — ECG II, V5, aVR, ABP, pleth, CVP, CO2,
 * resp — on the renderer's own layout, a ventilated patient with NIBP every 3 min. Selected with `?load=perf8`, so the
 * frame gate measures the brief's load with the whole shell mounted and the panel open. The engine options and the two
 * commands are the performance page's own, plus the app's 1 Hz truth for Explore.
 */
export const PERF8 = {
  engine: { seed: 11, truthHz: 1, patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } } },
  view: { lanes: ['ecgII', 'V5', 'aVR'], waves: ['abp', 'pleth', 'cvp', 'co2', 'resp'], nibp: true, temp: true },
  commands: [
    { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } },
    { type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 3 } },
  ],
} as const;
/** How far the sim clock estimate may run past the last engine event before it waits for the next one [ENG]. */
const EST_CAP_S = 1.5;

export class AppSession {
  readonly code: string;
  readonly host: HostSession;
  readonly driver: ScenarioDriver;
  /** The same-screen instructor panel's controller (in-process hub, R7). */
  readonly panel: ControllerSession;
  /** The panel's end of the in-process hub (the panel taps it for raw events: alarmStatus, deviceStatus). */
  readonly panelTransport: ManagedTransport;
  /** True once the session has been used beyond the Start screen (a patient restart then asks first). */
  live = false;
  monitor: MonitorHandle | null = null;
  spec: PatientSpec;
  mode: Mode;
  skin: string;
  theme: string;
  timeScale = 1;
  paused = false;
  /** Learner controls under the learner monitor (orchestrator ruling 4): off by default, on per scenario. */
  learner = false;
  private readonly learnerFns = new Set<(on: boolean) => void>();
  /** Latest engine events the shell reads (alarm mirror, defib, drugs). */
  last: Partial<Record<EngineEvent['type'], EngineEvent>> = {};
  soundOn = false;
  private readonly el: HTMLElement;
  private readonly listeners = new Set<(e: EngineEvent) => void>();
  private readonly appFns = new Set<(e: EngineEvent) => void>();
  private readonly mountFns = new Set<(m: MonitorHandle) => void>();
  private offMon: (() => void) | null = null;
  private lastT = 0;
  private lastWall = performance.now();
  private readonly pollTimer: ReturnType<typeof setInterval>;
  private readonly bc: ReturnType<typeof createBroadcastChannelTransport>;

  /** `?load=perf8`: mount the Stage 8a performance layout instead of the site's skin (the frame gate, review F6). */
  private readonly perf8: boolean;

  constructor(el: HTMLElement, start: SessionStart, o: { skin: string; theme: string; code?: string | null; load?: 'perf8' | null }) {
    this.el = el;
    this.perf8 = o.load === 'perf8';
    this.spec = start.spec;
    this.mode = start.mode;
    this.skin = o.skin;
    this.theme = o.theme;
    this.code = normalizeSessionCode(o.code ?? '') ?? newSessionCode();
    const target: HostTarget = {
      dispatch: (c) => this.need().dispatch(c),
      snapshot: () => this.need().snapshot(),
      restore: async (s: PatientSnapshot) => {
        await this.need().restore(s);
        this.lastT = s.tick * TICK_S;
        this.lastWall = performance.now();
      },
      on: (fn) => {
        this.listeners.add(fn);
        return () => void this.listeners.delete(fn);
      },
      now: () => {
        const simT = this.simNow();
        return { tick: Math.floor(simT / TICK_S + 1e-6), simT };
      },
      time: (action, value) => {
        if (action === 'pause') this.setPaused(true);
        if (action === 'resume') this.setPaused(false);
        if (action === 'scale' && value !== undefined) this.setTimeScale(value);
      },
    };
    let hs: HostSession | null = null;
    this.driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
    hs = new HostSession({ session: this.code, target: this.driver.host, scenario: this.driver.hook, welcomeEvents: () => this.driver.welcomeEvents() });
    this.host = hs;
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    this.bc = createBroadcastChannelTransport(this.code);
    hs.addTransport(this.bc);
    this.panelTransport = hub.connect();
    this.panel = new ControllerSession({ session: this.code, transport: this.panelTransport, issuedBy: 'instructor' });
    this.mount(start.seed ?? 7);
    // the runner advances at the engine's sim time; 10 Hz is enough for triggers stated in seconds [ENG]
    this.pollTimer = setInterval(() => this.driver.poll(), 100);
  }

  /** Every engine event (the worker's batches), for the shell: alarm mirror, session bar, Explore. */
  onEvent(fn: (e: EngineEvent) => void): () => void {
    this.appFns.add(fn);
    return () => void this.appFns.delete(fn);
  }

  /** Show or hide the learner controls; every Monitor view and Scenario tab follows. */
  setLearner(on: boolean): void {
    this.learner = on;
    for (const fn of this.learnerFns) fn(on);
  }

  onLearner(fn: (on: boolean) => void): () => void {
    this.learnerFns.add(fn);
    fn(this.learner);
    return () => void this.learnerFns.delete(fn);
  }

  /** Called after every (re)mount with the new monitor (the ventilator link re-attaches to it). */
  onMount(fn: (m: MonitorHandle) => void): () => void {
    this.mountFns.add(fn);
    if (this.monitor) fn(this.monitor);
    return () => void this.mountFns.delete(fn);
  }

  /** Sim time: the last engine event's time run forward on the wall clock at the current speed, capped [ENG]. */
  simNow(): number {
    if (this.paused) return this.lastT;
    const dt = ((performance.now() - this.lastWall) / 1000) * this.timeScale;
    return this.lastT + Math.min(Math.max(0, dt), EST_CAP_S * this.timeScale);
  }

  send(c: Omit<Command, 'id' | 'issuedBy'> & Record<string, unknown>): Promise<{ accepted: boolean; reason?: string }> {
    return this.panel.send(c as never);
  }

  setTimeScale(k: number): void {
    this.lastT = this.simNow();
    this.lastWall = performance.now();
    this.timeScale = k;
    this.monitor?.setTimeScale(k);
  }

  setPaused(p: boolean): void {
    this.lastT = this.simNow();
    this.lastWall = performance.now();
    this.paused = p;
    if (p) this.monitor?.pause();
    else this.monitor?.resume();
  }

  /** Change the monitor's skin or theme. The shell's alarm mirror follows at once, wherever the change came from
   *  (Start, Settings, an imported site profile): the mirror always shows the monitor's colours (review F5, D5). */
  async setSkin(skin: string, theme: string): Promise<void> {
    this.skin = skin;
    this.theme = theme;
    applySkinAlarmColours(skin, theme);
    await this.monitor?.setSkin(skin, theme ? { theme } : {});
  }

  enableSound(): Promise<void> {
    return (this.monitor?.enableSound() ?? Promise.resolve()).then(() => void (this.soundOn = true));
  }

  /** A new body (profile, mode) = a new engine; the session code, remote pairing, log and listeners carry on. */
  restart(start: SessionStart): void {
    this.spec = start.spec;
    this.mode = start.mode;
    this.driver.runner = null;
    this.setLearner(false); // a new patient starts without learner controls (ruling 4)
    this.mount(start.seed ?? 7);
    this.panel.note(`Patient restarted: ${start.mode.toUpperCase()}`);
  }

  /** Load a scenario: its patient body restarts the engine, then the runner starts (never silently over a live run —
   *  the caller confirms first). */
  loadScenario(raw: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    const v = validateScenario(raw);
    if (!v.ok) return { ok: false, reason: v.errors.join('; ') };
    const eo = engineOptionsOf(v.doc, 7);
    const p = v.doc.patient ?? {};
    this.spec = { ageY: p.ageY ?? 40, sex: p.sex ?? 'M', weightKg: p.weightKg ?? 70, heightCm: p.heightCm ?? 175, comorbid: [], attached: true };
    this.mode = v.doc.mode ?? 'modeled';
    this.driver.runner = null;
    this.mountWith({ ...eo, mode: this.mode, truthHz: 1, patient: { ...eo.patient, ...(p.sensors ? { sensors: p.sensors } : {}) } });
    void this.panel.send({ type: 'scenario', action: 'load', doc: v.doc });
    this.live = true;
    return { ok: true, doc: v.doc };
  }

  destroy(): void {
    clearInterval(this.pollTimer);
    this.offMon?.();
    this.monitor?.destroy();
    this.panel.close();
    this.bc.close();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private need(): MonitorHandle {
    if (!this.monitor) throw new Error('no monitor');
    return this.monitor;
  }

  private mount(seed: number): void {
    if (this.perf8) {
      this.mountWith({ ...PERF8.engine, patient: { ...PERF8.engine.patient, baseline: { ...PERF8.engine.patient.baseline }, sensors: { ...PERF8.engine.patient.sensors } } } as never);
      PERF8.commands.forEach((c, i) => void this.monitor?.dispatch({ id: `perf8-${i}`, issuedBy: 'perf', ...c } as never));
      return;
    }
    const patient = profileOf(this.spec);
    this.mountWith({ seed, mode: this.mode, patient, truthHz: 1, device: { ageBand: ageBandOf(this.spec) } });
  }

  private mountWith(engine: NonNullable<Parameters<typeof mountMonitor>[1]>['engine']): void {
    this.offMon?.();
    this.monitor?.destroy();
    this.el.replaceChildren();
    this.lastT = 0;
    this.lastWall = performance.now();
    this.last = {};
    const look = this.perf8 ? { ...PERF8.view, lanes: [...PERF8.view.lanes], waves: [...PERF8.view.waves] } : { skin: this.skin, ...(this.theme ? { theme: this.theme } : {}) };
    const m = mountMonitor(this.el, { ...look, engine } as Parameters<typeof mountMonitor>[1]);
    this.monitor = m;
    this.offMon = m.on((e) => {
      const t = (e as { t?: unknown }).t;
      if (typeof t === 'number' && e.type !== 'tone' && t >= this.lastT) {
        this.lastT = t;
        this.lastWall = performance.now();
      }
      this.last[e.type] = e;
      if (e.type !== 'truth') for (const fn of this.listeners) fn(e); // truth (≈ 25 KB at 1 Hz) stays on this page
      for (const fn of this.appFns) fn(e);
    });
    m.setTimeScale(this.timeScale);
    if (this.paused) m.pause();
    if (this.soundOn) void m.enableSound();
    for (const fn of this.mountFns) fn(m);
  }
}
```

- [ ] **Step 2: Create `apps/demo/src/app/link.ts`**

```ts
// What the instructor panel talks to (research/13 brief §4.4: the same panel same-screen and as a Remote). A Link is a
// ControllerSession (commands, acks, state, measurements, scenario view, bookmarks) plus a tap on the same transport
// for the engine events the session does not keep (alarmStatus, deviceStatus), plus the clinical log. On the host
// document `host` is the AppSession (patient restart, skin, sound); a Remote has none of those.
import type { AlarmEntry, EngineEvent } from '@pme/engine-core';
import type { AckResult, CommandInput, ControllerSession, ManagedTransport, WireEvent, WireMessage } from '@pme/controller';
import { describeCommand } from './describe.ts';
import type { AppSession } from './session.ts';

export type AlarmStatusEvent = Extract<EngineEvent, { type: 'alarmStatus' }>;
export type DeviceStatusEvent = Extract<EngineEvent, { type: 'deviceStatus' }>;

export interface ClinicalLogEntry {
  simT: number | null;
  kind: 'instructor' | 'learner' | 'scenario' | 'alarm' | 'marker' | 'note' | 'system';
  text: string;
  /** Rejected by the engine: the reason, in the log only. */
  refused?: string;
}

export class Link {
  readonly ctl: ControllerSession;
  readonly host: AppSession | null;
  alarms: AlarmStatusEvent | null = null;
  device: DeviceStatusEvent | null = null;
  readonly log: ClinicalLogEntry[] = [];
  /** Per-target onset in progress (REALITi's trend arc): the panel draws progress from sim time. */
  readonly ramps = new Map<string, { t0: number; dur: number; to: number }>();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private lastRaised = new Set<string>();

  constructor(ctl: ControllerSession, transport: ManagedTransport, host: AppSession | null = null) {
    this.ctl = ctl;
    this.host = host;
    this.offs = [
      transport.onMessage((m: WireMessage) => {
        if (m.kind !== 'event') return;
        for (const e of m.body) this.onEvent(e);
      }),
      ctl.onChange(() => this.changed()),
    ];
  }

  get simT(): number {
    return this.ctl.simT ?? 0;
  }

  /** Send with a log line; resolves with the ack (rejections are logged with the engine's reason). */
  async send(c: CommandInput, kind: ClinicalLogEntry['kind'] = 'instructor'): Promise<AckResult> {
    const text = describeCommand(c as Record<string, unknown>);
    const r = await this.ctl.send(c);
    const ramp = (c as { ramp?: { durationS?: number } }).ramp?.durationS;
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin') && ramp) this.ramps.set(c.variable, { t0: this.simT, dur: ramp, to: c.value ?? 0 });
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin' || c.type === 'release') && !ramp) this.ramps.delete(c.variable);
    this.add({ simT: this.simT, kind, text, ...(r.accepted ? {} : { refused: r.reason ?? 'refused' }) });
    return r;
  }

  note(text: string, kind: ClinicalLogEntry['kind'] = 'note'): void {
    this.add({ simT: this.simT, kind, text });
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  close(): void {
    for (const off of this.offs) off();
  }

  /** The highest active alarm level (1 = high) and how many alarms are active. */
  get alarmSummary(): { level: 1 | 2 | 3 | null; n: number; top: AlarmEntry | null } {
    const act = (this.alarms?.active ?? []).filter((a) => !a.acked || a.latched);
    const top = [...act].sort((a, b) => a.level - b.level)[0] ?? null;
    return { level: top ? top.level : null, n: act.length, top };
  }

  private onEvent(e: WireEvent): void {
    if (e.type === 'alarmStatus') {
      const a = e as unknown as AlarmStatusEvent;
      this.alarms = a;
      const now = new Set(a.active.map((x) => x.id));
      for (const x of a.active) if (!this.lastRaised.has(x.id)) this.add({ simT: a.t, kind: 'alarm', text: x.text });
      this.lastRaised = now;
      this.changed();
    } else if (e.type === 'deviceStatus') {
      this.device = e as unknown as DeviceStatusEvent;
    } else if (e.type === 'scenario') {
      const st = this.ctl.scenario.doc?.states.find((s) => s.id === e.stateId);
      this.add({ simT: e.t, kind: 'scenario', text: `Scenario state: ${st?.label ?? 'next state'}` });
    }
  }

  private add(x: ClinicalLogEntry): void {
    this.log.push(x);
    if (this.log.length > 1000) this.log.splice(0, this.log.length - 1000);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** CSV of the clinical log (the debrief export). */
export function logCsv(log: readonly ClinicalLogEntry[]): string {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = log.map((e) => [e.simT === null ? '' : e.simT.toFixed(1), e.kind, e.text, e.refused ?? ''].map(q).join(','));
  return `${['time_s,kind,event,refused', ...rows].join('\n')}\n`;
}
```

- [ ] **Step 3: Create `apps/demo/src/app/staging.ts`**

```ts
// Stage, then commit with one chosen transition (research/13-ui-simulator-benchmarks "Top 8" #1: Gaumard UNI's Apply
// panel, SimPad PLUS "Set transition time", Infirmary Integrated's Apply/Reset + auto-apply opt-out). Staged commands
// keep their control key (a later edit of the same control replaces the earlier one); Commit sends them as ONE stage
// group (Stage 6a StageBuffer: the host applies them on one tick) with the batch transition as the ramp of every
// target command. Urgent actions (shock, silence, bolus) never stage.
import { StageBuffer, type AckResult, type CommandInput } from '@pme/controller';

export class Staging {
  private readonly buf: StageBuffer;
  private readonly entries = new Map<string, { c: CommandInput; text: string }>();
  private readonly fns = new Set<() => void>();
  /** "Apply at once" (the opt-out): every submit goes straight to the host. */
  autoApply = false;
  /** Batch transition in seconds (0 = now). */
  transitionS = 0;

  private readonly sendNow: (c: CommandInput) => Promise<AckResult>;

  constructor(prefix: string, sendNow: (c: CommandInput) => Promise<AckResult>) {
    this.buf = new StageBuffer(prefix);
    this.sendNow = sendNow;
  }

  get size(): number {
    return this.entries.size;
  }
  has(key: string): boolean {
    return this.entries.has(key);
  }
  /** Human lines for the footer's list, in staging order. */
  get lines(): string[] {
    return [...this.entries.values()].map((e) => e.text);
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  /** Stage (or, with auto-apply, send with the current transition). `text` is the glossary-worded line. */
  submit(c: CommandInput, key: string, text: string): void {
    if (this.autoApply) {
      void this.sendNow(this.withRamp(c)).catch(() => undefined);
      return;
    }
    this.entries.set(key, { c, text });
    this.buf.stage(c, key);
    this.changed();
  }

  commit(): Promise<AckResult[]> {
    const staged = [...this.buf.staged];
    this.buf.discard();
    for (const c of staged) this.buf.stage(this.withRamp(c), `${Math.random()}`);
    this.entries.clear();
    this.changed();
    return this.buf.commit((c) => this.sendNow(c));
  }

  discard(): void {
    this.buf.discard();
    this.entries.clear();
    this.changed();
  }

  withRamp(c: CommandInput): CommandInput {
    const rampable = c.type === 'setTarget' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor';
    return rampable && this.transitionS > 0 ? ({ ...c, ramp: { durationS: this.transitionS, curve: 'linear' } } as CommandInput) : c;
  }

  private changed(): void {
    for (const fn of this.fns) fn();
  }
}
```

- [ ] **Step 4: Create `apps/demo/src/app/staging.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import { Staging } from './staging.ts';

const ack = (c: CommandInput): Promise<AckResult> => Promise.resolve({ accepted: true, tick: 1, commandId: c.id ?? 'x', rttMs: 0 });

describe('staged changes', () => {
  it('a later edit of the same control replaces the earlier one; commit sends one stage group with the onset', async () => {
    const sent: CommandInput[] = [];
    const s = new Staging('t', (c) => (sent.push(c), ack(c)));
    s.submit({ type: 'setTarget', variable: 'hr', value: 90 }, 'v-hr', 'HR target 90 bpm');
    s.submit({ type: 'setTarget', variable: 'hr', value: 110 }, 'v-hr', 'HR target 110 bpm');
    s.submit({ type: 'setRhythm', rhythm: 'afib' } as CommandInput, 'rhythm', 'Rhythm: Atrial fibrillation');
    expect(s.size).toBe(2);
    expect(s.lines).toEqual(['HR target 110 bpm', 'Rhythm: Atrial fibrillation']);
    s.transitionS = 30;
    await s.commit();
    expect(sent).toHaveLength(2);
    expect(new Set(sent.map((c) => (c as { stageGroup?: string }).stageGroup)).size).toBe(1);
    expect(sent[0]).toMatchObject({ type: 'setTarget', value: 110, ramp: { durationS: 30, curve: 'linear' } });
    expect(sent[1]).not.toHaveProperty('ramp'); // a rhythm change has no onset
    expect(s.size).toBe(0);
  });
  it('"Apply at once" sends at once and stages nothing', () => {
    const sent: CommandInput[] = [];
    const s = new Staging('t', (c) => (sent.push(c), ack(c)));
    s.autoApply = true;
    s.submit({ type: 'release', variable: 'spo2' }, 'v-spo2', 'SpO₂ returned to the model');
    expect(sent).toHaveLength(1);
    expect(s.size).toBe(0);
  });
});
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/staging.test.ts && npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: 2 passed; typecheck clean. (`session.ts` needs a browser: Task 21's e2e covers it.)

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/session.ts apps/demo/src/app/link.ts apps/demo/src/app/staging.ts apps/demo/src/app/staging.test.ts
git commit -m "feat(app): one engine session per document, the panel link and stage-then-commit with one onset" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: E-S9-2 — the controller forwards pin, release and setMode to the engine (setFactor is refused there)

**Files:**
- Modify: `packages/controller/src/session/host-session.ts` (delete the stale guard in `apply()`)
- Modify: `packages/controller/test/session/host-session.test.ts` (the stub assertion becomes the engine's acceptance; a new test of all four commands)

**Why:** Found while prototyping: the 6a `HostSession` refuses these four commands with "needs MODELED mode (Stage 7)", a guard older than 7a; the engine validates and applies `pin`, `release` and `setMode` (measured), and refuses `setFactor` with its own reason because it does not model factors yet. Without this the instructor cannot hold a value or return it to the model from the panel or a remote. Exception E-S9-2 (APPROVED by the orchestrator, ruling 2 on the R50 review): it edits a 6a file and one existing assertion that pinned the stub, and adds a test of all four commands (R50 review F8).

- [ ] **Step 1: Edit `packages/controller/src/session/host-session.ts`** — delete the stale guard in `apply()`. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
    if (cmd.type === 'pin' || cmd.type === 'release' || cmd.type === 'setFactor' || cmd.type === 'setMode') {
      return reject(`${cmd.type} needs MODELED mode (Stage 7)`);
    }
```

replace with:

```ts
    // Stage 9 (E-S9-2): pin, release and setMode go to the engine, which validates them (7a implemented MODELED; this
    // guard predated it and refused every pin from a panel or a remote). setFactor reaches the engine too and is refused
    // there with its own reason until the engine models factors.
```

- [ ] **Step 2: Edit `packages/controller/test/session/host-session.test.ts`** — the stub assertion becomes the engine's acceptance, and a NEW test of all four commands follows it (R50 review F8). Find (matches exactly once on `origin/main` `776ebb5`):

```ts
  it('acks rejections with the engine reason, and rejects MODELED-only and 6b-only commands', async () => {
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'k', value: 5 }); // Stage 3 accepts spo2; k is Stage 5
    command({ type: 'pin', variable: 'hr', value: 60 });
    command({ type: 'scenario', action: 'goto', target: 'vf' });
    command({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => of('ack').length === 4);
    expect(of('ack').map((a) => a.accepted)).toEqual([false, false, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 5/);
    expect(of('ack')[1]!.reason).toMatch(/MODELED/);
    expect(of('ack')[2]!.reason).toMatch(/Stage 6b/);
  });
```

replace with:

```ts
  it('acks rejections with the engine reason, forwards pin to the engine, and rejects 6b-only commands', async () => {
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'k', value: 5 }); // Stage 3 accepts spo2; k is Stage 5
    command({ type: 'pin', variable: 'hr', value: 60 }); // Stage 9 (E-S9-2): the engine validates pin since 7a
    command({ type: 'scenario', action: 'goto', target: 'vf' });
    command({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => of('ack').length === 4);
    expect(of('ack').map((a) => a.accepted)).toEqual([false, true, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 5/);
    expect(of('ack')[2]!.reason).toMatch(/Stage 6b/);
  });

  it('forwards pin, release and setMode to the engine; setFactor is refused by the engine itself (Stage 9 E-S9-2)', async () => {
    const { command, of, events, host } = setup();
    command({ type: 'pin', variable: 'hr', value: 90 });
    command({ type: 'release', variable: 'all' });
    command({ type: 'setMode', mode: 'modeled' });
    command({ type: 'setFactor', input: 'contractility', factor: 1.5 });
    await waitFor(() => of('ack').length === 4);
    expect(of('ack').map((a) => [a.commandId, a.accepted])).toEqual([['k1', true], ['k2', true], ['k3', true], ['k4', false]]);
    expect(of('ack')[3]!.reason).toMatch(/setFactor is not implemented/); // the engine's reason, not the removed guard's
    expect(of('ack').map((a) => a.reason ?? '').join(' ')).not.toMatch(/needs MODELED/);
    host.advance(2500); // the engine's own 1 Hz state event carries the mode it now runs
    await waitFor(() => events().some((e) => e.type === 'state' && (e as { mode?: string }).mode === 'modeled'), 3000, 'a MODELED state event');
  });
```

- [ ] **Step 3: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run
```

Expected: controller 37 files, 216 tests pass (prototype on `origin/main` `776ebb5`, before FU-4, V.1, FU-6, FU-7, 7k); the changed test expects `[false, true, false, false]`; the new test: `pin`, `release all`, `setMode` accepted, a MODELED `state` event follows, `setFactor` refused with "setFactor is not implemented".

- [ ] **Step 4: Commit and push**

```bash
git add packages/controller/src/session/host-session.ts packages/controller/test/session/host-session.test.ts
git commit -m "fix(controller): forward pin, release and setMode to the engine; setFactor is refused by the engine until it models factors — the pre-7a MODELED guard refused every pin (Stage 9 E-S9-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7b: E-S9-4 — per-skin alarm wording (FU-5 R-FU5-6): ART, T1 and EtCO2 on the non-Philips skins

**Runs only if the orchestrator re-confirms E-S9-4 in the form below** (ruling 1 said "skin JSON data only"; no skin
field for alarm wording exists, so the data needs one optional schema field and three reading lines). Without the
re-confirmation, tick this task as *skipped (E-S9-4 not re-confirmed)*; R-FU5-6 then moves to the FU-5 follow-up
(R-S9-8).

**Files:**
- Modify: `packages/skins/src/types.ts`, `packages/skins/src/schema.ts` (one optional field each)
- Modify: `packages/skins/src/data/skins/{mindray,ge,zoll,lifepak}-like.json` (the `alarms.wording` table and its provenance)
- Modify: `packages/engine-core/src/l3/alarms/profile.ts` (two lines and one field), `packages/engine-core/src/l3/alarms/text.ts` (one line)
- Create: `packages/skins/test/stage9-wording.test.ts`, `packages/engine-core/test/l3/alarms/stage9-wording.test.ts`

**Why:** research/11 §5.16 rule 2 (vendor aliases are skin data) and FU-5's R-FU5-6: the IEC alarm-text table prints
Philips words ("ABP NON-PULSATILE", "**ABPs 21<90", "TEMP NO TRANSDUCER") on every IEC-style skin, so a mindray-like
room reads Philips aliases. The four non-Philips skins get their own words; philips-like and saadat-like keep theirs,
which are the texts FU-5's tests pin (`fu5-technical.test.ts`, `fidelity-arrest.test.ts`), so no existing assertion
changes (R45). The skins snapshot (`resolve.test.ts.snap`) covers render, audio and limits, not `alarms`: unchanged.
Not taken (R-S9-8): "PR" for the pulse-sourced HR alarm (a run-time HR-source choice), the untiled numerics and the
agent tile.

- [ ] **Step 1: Edit `packages/skins/src/types.ts`** — the optional wording field. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
    numericFlash: boolean;
    /** How an alarmed numeric flashes: the text ('flash-text', default) or a level-coloured box ('flash-box', Mindray-like). */
```

replace with:

```ts
    /**
     * Stage 9 (E-S9-4, FU-5 R-FU5-6): the vendor's own words for alarm texts, where they differ from the IEC table's
     * Philips aliases — `texts` by fixed alarm id ('abpNonPulsatile', 'tempProbeOff', …), `limitLabels` by limit key
     * ('ART_S', 'TEMP', …). Wording only: levels, timing and latching are unchanged. Absent = the IEC table.
     */
    wording?: { texts?: Partial<Record<string, string>>; limitLabels?: Partial<Record<string, string>> };
    numericFlash: boolean;
    /** How an alarmed numeric flashes: the text ('flash-text', default) or a level-coloured box ('flash-box', Mindray-like). */
```

- [ ] **Step 2: Edit `packages/skins/src/schema.ts`** — the closed schema accepts the optional field. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
    numericStyle: en(['flash-text', 'flash-box']),
  },
);
```

replace with:

```ts
    numericStyle: en(['flash-text', 'flash-box']),
    wording: obj({}, { texts: record(str, '^[A-Za-z0-9_-]+$'), limitLabels: record(str) }), // Stage 9 (E-S9-4)
  },
);
```

- [ ] **Step 3: Edit `packages/skins/src/data/skins/mindray-like.json`** — the wording table. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "alarms": {
    "pause": { "durationS": 120 }, "numericStyle": "flash-box", "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } },
```

replace with:

```json
  "alarms": {
    "wording": { "texts": { "abpNonPulsatile": "ART NON-PULSATILE", "abpDisconnect": "ART DISCONNECT", "abpZero": "ART ZEROING", "tempProbeOff": "T1 NO TRANSDUCER" }, "limitLabels": { "ART_S": "ART S", "ART_D": "ART D", "ART_M": "ART M", "EtCO2": "EtCO2", "EtCO2_pctV": "EtCO2", "TEMP": "T1" } },
    "pause": { "durationS": 120 }, "numericStyle": "flash-box", "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } },
```

- [ ] **Step 4: Edit `packages/skins/src/data/skins/mindray-like.json`** — its source. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "provenance": {
    "co2.sidestreamDelayS": { "tag": "documented", "source": "research/09 §5 (Mindray DRYLINE; R39-5)" },
```

replace with:

```json
  "provenance": {
    "alarms.wording": { "tag": "inferred", "source": "research/11 §5.16 rule 2 and §5.1 conventions (GE/Mr/Dr/NK/Sa \"ART\", GE/Mr/Sa \"EtCO₂\" and \"T1\"; Philips keeps ABP/etCO2/Temp); FU-5 R-FU5-6, Stage 9 E-S9-4" },
    "co2.sidestreamDelayS": { "tag": "documented", "source": "research/09 §5 (Mindray DRYLINE; R39-5)" },
```

- [ ] **Step 5: Edit `packages/skins/src/data/skins/ge-like.json`** — the wording table. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "alarms": { "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
```

replace with:

```json
  "alarms": { "wording": { "texts": { "abpNonPulsatile": "ART NON-PULSATILE", "abpDisconnect": "ART DISCONNECT", "abpZero": "ART ZEROING", "tempProbeOff": "T1 NO TRANSDUCER" }, "limitLabels": { "ART_S": "ART S", "ART_D": "ART D", "ART_M": "ART M", "EtCO2": "EtCO2", "EtCO2_pctV": "EtCO2", "TEMP": "T1" } }, "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
```

- [ ] **Step 6: Edit `packages/skins/src/data/skins/ge-like.json`** — its source. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "provenance": {
    "co2.sidestreamDelayS": { "tag": "documented", "source": "research/09 §5 (GE sidestream 120 mL/min; R39-5)" },
```

replace with:

```json
  "provenance": {
    "alarms.wording": { "tag": "inferred", "source": "research/11 §5.16 rule 2 and §5.1 conventions (GE/Mr/Dr/NK/Sa \"ART\", GE/Mr/Sa \"EtCO₂\" and \"T1\"; Philips keeps ABP/etCO2/Temp); FU-5 R-FU5-6, Stage 9 E-S9-4" },
    "co2.sidestreamDelayS": { "tag": "documented", "source": "research/09 §5 (GE sidestream 120 mL/min; R39-5)" },
```

- [ ] **Step 7: Edit `packages/skins/src/data/skins/zoll-like.json`** — the wording table. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "alarms": { "repeatS": { "L1": 15, "L2": 30, "L3": null } },
```

replace with:

```json
  "alarms": { "wording": { "texts": { "abpNonPulsatile": "ART NON-PULSATILE", "abpDisconnect": "ART DISCONNECT", "abpZero": "ART ZEROING", "tempProbeOff": "T1 NO TRANSDUCER" }, "limitLabels": { "ART_S": "ART S", "ART_D": "ART D", "ART_M": "ART M", "EtCO2": "EtCO2", "EtCO2_pctV": "EtCO2", "TEMP": "T1" } }, "repeatS": { "L1": 15, "L2": 30, "L3": null } },
```

- [ ] **Step 8: Edit `packages/skins/src/data/skins/zoll-like.json`** — its source. Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "provenance": {
    "co2.sidestreamDelayS": { "tag": "assumed", "source": "research/09 §5; R39-5 fallback", "note": "the skin research does not record this vendor's CO2 sampling technology; mainstream would be 0 s / 55 ms" },
```

replace with:

```json
  "provenance": {
    "alarms.wording": { "tag": "inferred", "source": "research/11 §5.16 rule 2 and §5.1 conventions (GE/Mr/Dr/NK/Sa \"ART\", GE/Mr/Sa \"EtCO₂\" and \"T1\"; Philips keeps ABP/etCO2/Temp); FU-5 R-FU5-6, Stage 9 E-S9-4" },
    "co2.sidestreamDelayS": { "tag": "assumed", "source": "research/09 §5; R39-5 fallback", "note": "the skin research does not record this vendor's CO2 sampling technology; mainstream would be 0 s / 55 ms" },
```

- [ ] **Step 9: Edit `packages/skins/src/data/skins/lifepak-like.json`** — the wording table and its source (the skin had no `alarms` block). Find (matches exactly once on `origin/main` `776ebb5`):

```json
  "co2": { "sidestreamDelayS": 2.6, "riseTimeMs": 200 },
  "provenance": {
    "co2.sidestreamDelayS": { "tag": "assumed", "source": "research/09 §5; R39-5 fallback", "note": "the skin research does not record this vendor's CO2 sampling technology; mainstream would be 0 s / 55 ms" },
```

replace with:

```json
  "co2": { "sidestreamDelayS": 2.6, "riseTimeMs": 200 },
  "alarms": { "wording": { "texts": { "abpNonPulsatile": "ART NON-PULSATILE", "abpDisconnect": "ART DISCONNECT", "abpZero": "ART ZEROING", "tempProbeOff": "T1 NO TRANSDUCER" }, "limitLabels": { "ART_S": "ART S", "ART_D": "ART D", "ART_M": "ART M", "EtCO2": "EtCO2", "EtCO2_pctV": "EtCO2", "TEMP": "T1" } } },
  "provenance": {
    "alarms.wording": { "tag": "inferred", "source": "research/11 §5.16 rule 2 and §5.1 conventions (GE/Mr/Dr/NK/Sa \"ART\", GE/Mr/Sa \"EtCO₂\" and \"T1\"; Philips keeps ABP/etCO2/Temp); FU-5 R-FU5-6, Stage 9 E-S9-4" },
    "co2.sidestreamDelayS": { "tag": "assumed", "source": "research/09 §5; R39-5 fallback", "note": "the skin research does not record this vendor's CO2 sampling technology; mainstream would be 0 s / 55 ms" },
```

- [ ] **Step 10: Edit `packages/engine-core/src/l3/alarms/profile.ts`** — the profile carries the skin's texts. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
  prefix: 'asterisks' | 'none';
  factoryEnabled: boolean;
```

replace with:

```ts
  prefix: 'asterisks' | 'none';
  /** Stage 9 (E-S9-4, R-FU5-6): the skin's own words for fixed alarm texts (skin `alarms.wording.texts`); absent = IEC. */
  texts?: Readonly<Partial<Record<string, string>>>;
  factoryEnabled: boolean;
```

- [ ] **Step 11: Edit `packages/engine-core/src/l3/alarms/profile.ts`** — the limit label is the skin's where it has one. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
      label: k.label,
      upper: k.upper,
```

replace with:

```ts
      label: r.skin.alarms.wording?.limitLabels?.[key] ?? k.label, // Stage 9 (E-S9-4): the skin's own label
      upper: k.upper,
```

- [ ] **Step 12: Edit `packages/engine-core/src/l3/alarms/profile.ts`** — the profile copies the texts. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
    prefix: a.messageBar.prefix,
    factoryEnabled: a.factoryEnabled,
```

replace with:

```ts
    prefix: a.messageBar.prefix,
    texts: { ...(a.wording?.texts ?? {}) },
    factoryEnabled: a.factoryEnabled,
```

- [ ] **Step 13: Edit `packages/engine-core/src/l3/alarms/text.ts`** — the fixed text reads the skin's word first. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
  return `${technical ? '' : stars(level)}${IEC_TEXT[id]}`;
```

replace with:

```ts
  return `${technical ? '' : stars(level)}${p.texts?.[id] ?? IEC_TEXT[id]}`; // Stage 9 (E-S9-4): the skin's wording first
```

- [ ] **Step 14: Create `packages/skins/test/stage9-wording.test.ts`**

```ts
// Stage 9 (E-S9-4, FU-5 R-FU5-6): the per-skin alarm wording is skin data, validated by the closed schema and sourced
// like every other skin field; philips-like and saadat-like carry none (their texts are the ones FU-5 tested).
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('alarm wording (Stage 9 E-S9-4)', () => {
  it.each(['mindray-like', 'ge-like', 'zoll-like', 'lifepak-like'])('%s: ART / T1 / EtCO2 words, sourced', (id) => {
    const r = resolveSkin(id);
    expect(r.skin.alarms.wording?.texts).toMatchObject({ abpNonPulsatile: 'ART NON-PULSATILE', tempProbeOff: 'T1 NO TRANSDUCER' });
    expect(r.skin.alarms.wording?.limitLabels).toMatchObject({ ART_S: 'ART S', TEMP: 'T1', EtCO2: 'EtCO2' });
    expect(r.provenance['alarms.wording']?.source).toMatch(/research\/11 §5\.16/);
  });
  it('philips-like and saadat-like keep their own texts (no wording table)', () => {
    expect(resolveSkin('philips-like').skin.alarms.wording).toBeUndefined();
    expect(resolveSkin('saadat-like').skin.alarms.wording).toBeUndefined();
  });
});
```

- [ ] **Step 15: Create `packages/engine-core/test/l3/alarms/stage9-wording.test.ts`**

```ts
// Stage 9 (E-S9-4, FU-5 R-FU5-6): mindray-, ge-, zoll- and lifepak-like print their own words for the arterial line
// and the temperature probe ("ART", "T1", "EtCO2"); philips-like keeps the IEC table's Philips aliases and saadat-like
// its own texts. Wording only: the level and the prefix stay the skin's.
import { describe, expect, it } from 'vitest';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import { fixedText, limitText } from '../../../src/l3/alarms/text.ts';

describe('per-skin alarm wording (Stage 9 E-S9-4)', () => {
  it.each(['mindray-like', 'ge-like', 'zoll-like', 'lifepak-like'])('%s: ART and T1 in fixed and limit texts', (skin) => {
    const p = deviceProfile(skin);
    expect(fixedText(p, 'abpNonPulsatile', 3, true)).toBe('ART NON-PULSATILE');
    expect(fixedText(p, 'abpDisconnect', 1, false)).toBe('***ART DISCONNECT');
    expect(fixedText(p, 'abpZero', 3, true)).toBe('ART ZEROING');
    expect(fixedText(p, 'tempProbeOff', 3, true)).toBe('T1 NO TRANSDUCER');
    expect(fixedText(p, 'VFIB', 1, false)).toBe('***VFIB/VTACH'); // ids without a skin word keep the IEC table
    const art = p.limits.ART_S;
    if (art) expect(limitText(p, art, 'LOW', 21)).toBe(`**ART S 21<${(art.low as number).toFixed(0)}`);
  });
  it('philips-like keeps the Philips aliases; saadat-like keeps its own texts', () => {
    const ph = deviceProfile('philips-like');
    expect(fixedText(ph, 'abpNonPulsatile', 3, true)).toBe('ABP NON-PULSATILE');
    expect(fixedText(ph, 'tempProbeOff', 3, true)).toBe('TEMP NO TRANSDUCER');
    expect(ph.limits.ART_S?.label).toBe('ABPs');
    expect(fixedText(deviceProfile('saadat-like'), 'abpNonPulsatile', 3, true)).toBe('IBP1 STATIC PRESSURE');
  });
});
```

- [ ] **Step 16: Run**

```bash
(cd packages/skins && npx vitest run) && (cd packages/engine-core && CI=1 npx vitest run test/l3) && npx -y pnpm@9.15.9 typecheck
```

Expected: skins 20 files / 184 tests (the new file adds 5), engine-core `test/l3` 29 files / 153 tests (the new file
adds 5), typecheck clean. The `provenance` test passes with the one `alarms.wording` entry per skin.

- [ ] **Step 17: Commit and push**

```bash
git add packages/skins/src/types.ts packages/skins/src/schema.ts packages/skins/src/data/skins/mindray-like.json packages/skins/src/data/skins/ge-like.json packages/skins/src/data/skins/zoll-like.json packages/skins/src/data/skins/lifepak-like.json packages/engine-core/src/l3/alarms/profile.ts packages/engine-core/src/l3/alarms/text.ts packages/skins/test/stage9-wording.test.ts packages/engine-core/test/l3/alarms/stage9-wording.test.ts
git commit -m "feat(skins): per-skin alarm wording — ART, T1 and EtCO2 on mindray-, ge-, zoll- and lifepak-like (Stage 9 E-S9-4, FU-5 R-FU5-6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: The app frame: top bar, session bar region, monitor stage, views and skin alarm colours

**Files:**
- Create: `apps/demo/src/app/shell.ts`
- Create: `apps/demo/src/app/shell.dom.test.ts`

**Interfaces:** `Shell` (`root`, `main`, `stage`, `monitorHost`, `bar`, `right`, `route`, `add(view)`, `onRoute`, `start`, `show`), `View`, `NAV`, `applySkinAlarmColours`, `LEVEL_MARK`, `LEVEL_NAME`.

**Why:** One frame for every view (brief §4, §7 "App shell"); the stage never leaves the DOM; a narrow screen gets a Menu dialog instead of a clipped nav (D21). `applySkinAlarmColours` mirrors the active skin's message-bar colours with the black-text rule on bright red (D5) and its priority marks (`LEVEL_MARK`: asterisks where the monitor prints them, R50 review F12). Priority is always marker + word too (`LEVEL_MARK`, `LEVEL_NAME`). `skinAlarmBar` exposes a skin's bar for the e2e of F5.

- [ ] **Step 1: Create `apps/demo/src/app/shell.ts`**

```ts
// The app frame (research/13 brief §4, §7 "App shell / top bar"): top bar with the view switcher and the always-visible
// state (alarm count in the skin's colours, sound, remote code), the session bar, the monitor region ("stage") that
// never leaves the DOM, and one section per view. A route change only re-places regions by CSS grid areas and toggles
// `hidden`; the engine is never touched by navigation.
import { resolveSkin } from '@pme/skins';
import { hrefOf, onRoute, type Route, type RouteId } from './router.ts';
import { contrast } from './color.ts';
import { h } from './ui.ts';

export interface View {
  id: RouteId;
  el: HTMLElement;
  /** The light "bench" palette (Explore, Validate, Developer, Settings). */
  bench?: boolean;
  enter?(sub: string): void;
  leave?(): void;
}

export const NAV: ReadonlyArray<[RouteId, string]> = [
  ['start', 'Start'], ['monitor', 'Monitor'], ['teach', 'Instructor'], ['explore', 'Explore physiology'], ['vent', 'Ventilator'],
  ['validate', 'Validate'], ['dev', 'Developer'], ['settings', 'Settings'],
];

export class Shell {
  readonly root: HTMLElement;
  readonly main: HTMLElement;
  readonly stage: HTMLElement;
  readonly monitorHost: HTMLElement;
  readonly bar: HTMLElement;
  readonly right: HTMLElement;
  route: Route = { id: 'start', sub: '' };
  private readonly views = new Map<RouteId, View>();
  private readonly nav: HTMLElement;
  private readonly routeFns = new Set<(r: Route) => void>();

  constructor(parent: HTMLElement, o: { hostless: boolean }) {
    this.nav = h('nav', { class: 'nav', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), 'data-route': id }, label)));
    this.right = h('div', { class: 'topright' });
    // narrow screens (iPad portrait, phones): the view list moves into a menu dialog so no label is clipped
    const menuDlg = h('dialog', { class: 'menu-sheet', 'aria-label': 'Views' },
      h('nav', { class: 'menu-list', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), onclick: () => menuDlg.close() }, label))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => menuDlg.close() }, 'Close'));
    const menuBtn = h('button', { type: 'button', class: 'btn small menu-btn', 'aria-haspopup': 'dialog', onclick: () => menuDlg.showModal() }, 'Menu');
    const top = h('header', { class: 'topbar' }, h('a', { class: 'brand', href: hrefOf(o.hostless ? 'remote' : 'start') }, 'Patient monitor simulator'), menuBtn, this.nav, h('div', { class: 'spacer' }), this.right, menuDlg);
    this.monitorHost = h('div', { class: 'monitor-host', role: 'img', 'aria-label': 'Patient monitor' });
    this.stage = h('div', { class: 'stage', id: 'monitor' }, this.monitorHost);
    this.bar = h('div', { class: 'sessionbar', role: 'region', 'aria-label': 'Session' });
    this.main = h('main', { class: 'main', id: 'main', tabindex: -1 }, this.bar, this.stage);
    this.root = h('div', { class: 'app' }, h('a', { class: 'skip', href: '#main', onclick: (e: Event) => (e.preventDefault(), this.main.focus()) }, 'Skip to the main content'), top, this.main);
    parent.append(this.root);
    if (o.hostless) {
      this.stage.hidden = true;
      this.bar.hidden = true;
      this.main.classList.add('hostless');
    }
  }

  add(v: View): void {
    v.el.classList.add('view');
    v.el.dataset.view = v.id;
    v.el.hidden = true;
    if (v.bench) v.el.classList.add('bench');
    this.views.set(v.id, v);
    this.main.append(v.el);
  }

  onRoute(fn: (r: Route) => void): () => void {
    this.routeFns.add(fn);
    return () => void this.routeFns.delete(fn);
  }

  start(): void {
    onRoute((r) => this.show(r));
  }

  show(r: Route): void {
    const prev = this.views.get(this.route.id);
    if (prev && prev.id !== r.id) {
      prev.leave?.();
      prev.el.hidden = true;
    }
    const v = this.views.get(r.id) ?? this.views.get('start');
    if (!v) return;
    this.route = { id: v.id, sub: r.id === v.id ? r.sub : '' };
    this.main.dataset.route = v.id;
    this.root.dataset.route = v.id;
    v.el.hidden = false;
    v.enter?.(this.route.sub);
    for (const a of this.nav.querySelectorAll('a')) {
      if (a.dataset.route === v.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const title = NAV.find(([id]) => id === v.id)?.[1] ?? (v.id === 'remote' ? 'Remote' : '');
    document.title = title ? `${title}: patient monitor simulator` : 'Patient monitor simulator';
    for (const fn of this.routeFns) fn(this.route);
  }
}

/**
 * Mirror the active skin's alarm colours AND priority marks into the shell (brief §6.2: alarm colours are never shell
 * tokens; the panel's alarm list and the top-bar count read what the monitor shows). White text on a bright red below
 * 4.5:1 switches to black (research/13-ui-design-references rule 9: black text on bright red). A skin whose messages
 * carry asterisks gets `***`/`**`/`*`; a skin without marks (saadat-like) keeps `!!!`/`!!`/`!`, because the mirror must
 * still code priority by a mark as well as colour and word (rule 4; R50 review F12).
 */
export function applySkinAlarmColours(skin: string, theme: string): void {
  const bar = skinAlarmBar(skin, theme);
  if (!bar) return;
  Object.assign(LEVEL_MARK, bar.prefix === 'asterisks' ? { 1: '***', 2: '**', 3: '*' } : { 1: '!!!', 2: '!!', 3: '!' });
  const s = document.documentElement.style;
  const levels: Array<['high' | 'medium' | 'low', { bg: string; fg: string }]> = [['high', bar.L1], ['medium', bar.L2], ['low', bar.L3]];
  for (const [k, c] of levels) {
    s.setProperty(`--alarm-${k}-bg`, c.bg);
    s.setProperty(`--alarm-${k}-fg`, contrast(c.fg, c.bg) >= 4.5 ? c.fg : contrast('#000000', c.bg) >= contrast('#ffffff', c.bg) ? '#000000' : '#ffffff');
  }
}

/** The active skin's message-bar colours (L1–L3), or null for an unknown skin. */
export function skinAlarmBar(skin: string, theme = ''): { L1: { bg: string; fg: string }; L2: { bg: string; fg: string }; L3: { bg: string; fg: string }; prefix: 'asterisks' | 'none' } | null {
  try {
    return resolveSkin(skin, theme ? { theme } : {}).skin.alarms.messageBar;
  } catch {
    return null;
  }
}

export const LEVEL_NAME: Readonly<Record<1 | 2 | 3, 'high' | 'medium' | 'low'>> = { 1: 'high', 2: 'medium', 3: 'low' };
/** Priority as text and marker as well as colour (IEC 60601-1-8; research/13-ui-design-references rule 4). The marks
 *  follow the active skin (`applySkinAlarmColours`): the mirror shows the monitor's own marks (R50 review F12). */
export const LEVEL_MARK: Record<1 | 2 | 3, string> = { 1: '!!!', 2: '!!', 3: '!' };

```

- [ ] **Step 2: Create `apps/demo/src/app/shell.dom.test.ts`**

```ts
// @vitest-environment happy-dom
// The alarm mirror follows the active skin: its colours (D5, R50 review F5) and its priority marks (R50 review F12).
import { describe, expect, it } from 'vitest';
import { applySkinAlarmColours, LEVEL_MARK, skinAlarmBar } from './shell.ts';

const v = (k: string) => document.documentElement.style.getPropertyValue(k).toUpperCase();

describe('skin alarm mirror', () => {
  it('copies the skin L1–L3 colours and its priority marks', () => {
    applySkinAlarmColours('mindray-like', '');
    expect(v('--alarm-high-bg')).toBe(skinAlarmBar('mindray-like')?.L1.bg.toUpperCase());
    expect(v('--alarm-medium-bg')).toBe(skinAlarmBar('mindray-like')?.L2.bg.toUpperCase());
    expect(LEVEL_MARK).toEqual({ 1: '***', 2: '**', 3: '*' }); // IEC-style skins print asterisks
    applySkinAlarmColours('saadat-like', '');
    expect(v('--alarm-high-bg')).toBe(skinAlarmBar('saadat-like')?.L1.bg.toUpperCase());
    expect(LEVEL_MARK).toEqual({ 1: '!!!', 2: '!!', 3: '!' }); // no marks on the monitor: the mirror still marks
  });
  it('white on a bright red below 4.5:1 turns black (rule 9)', () => {
    applySkinAlarmColours('philips-like', '');
    const bar = skinAlarmBar('philips-like');
    expect(bar).not.toBeNull();
    expect(['#FFFFFF', '#000000']).toContain(v('--alarm-high-fg'));
  });
});
```

- [ ] **Step 3: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/shell.dom.test.ts && npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: 2 passed (mindray-like: its L1/L2 colours and `***`/`**`/`*`; saadat-like: its colours and `!!!`/`!!`/`!`;
the white-on-red rule); typecheck clean (the frame itself is exercised by Task 21's e2e).

- [ ] **Step 4: Commit and push**

```bash
git add apps/demo/src/app/shell.ts apps/demo/src/app/shell.dom.test.ts
git commit -m "feat(app): app frame with view switcher, session bar region, the persistent monitor stage and skin alarm colours" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: Instructor panel, part 1: context, shared commands, scenario cards and the Vitals & rhythm tab

**Files:**
- Create: `apps/demo/src/app/panel/ctx.ts`
- Create: `apps/demo/src/app/commands.ts`
- Create: `apps/demo/src/app/cards.ts`
- Create: `apps/demo/src/app/panel/vitals.ts`

**Why:** The CAE pattern (D8) and REALITi's trend marker (D9): each target row shows the glossary label with its tooltip, the live value and unit, a stepper, Set (a pin in MODELED, a target in MANUAL), Return to model, a chip only when something is not "the model running normally" (dark cockpit), and a progress bar while an onset runs. The rhythm picker is grouped (D5 of the brief §7).

- [ ] **Step 1: Create `apps/demo/src/app/panel/ctx.ts`**

```ts
// What every instructor tab gets: the link (commands, state, log), the staging buffer, the site profile and a
// refresh registration (the panel repaints at most twice a second, research/13 brief §10).
import type { Link } from '../link.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import type { Staging } from '../staging.ts';

export interface PanelCtx {
  link: Link;
  staging: Staging;
  site: SiteProfile;
  /** The patient's weight for per-kg doses (the host's patient; a Remote reads the scenario's or 70 kg). */
  weightKg(): number;
  /** Register a repaint for live values; called ≤ 2 Hz while the tab is visible. */
  onRefresh(fn: () => void): void;
  /** Host only: load a scenario (restarts the patient). */
  loadScenario?(card: ScenarioCard): boolean;
  /** Move to another tab (the alarm count opens Devices & alarms). */
  goTab(id: string): void;
}
```

- [ ] **Step 2: Create `apps/demo/src/app/commands.ts`**

```ts
// Two actions reachable from several places (session bar, Scenario and Log tabs, keyboard, Settings): a bookmark that
// the 6b driver can restore (CAE Maestro's marker-revert), and the keyboard shortcut sheet (brief §9).
import type { Link } from './link.ts';
import { infoDialog, toast } from './ui.ts';

let nBookmark = 0;
export async function bookmark(link: Link): Promise<void> {
  const label = `Bookmark ${++nBookmark} at ${clockOf(link.simT)}`;
  const r = await link.send({ type: 'scenario', action: 'bookmark', target: label });
  toast(r.accepted ? `${label} saved` : 'Bookmark not saved');
}

const clockOf = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function shortcutsDialog(): Promise<void> {
  return infoDialog('Keyboard shortcuts', [
    'i  show or hide the instructor view', 'Shift+S  silence the alarm sound', 'Shift+P  pause alarms', 'Shift+N  start an NIBP measurement',
    'Shift+B  bookmark this moment', '⌘/Ctrl+Enter  commit the staged changes', 'Esc  close a dialog',
    'Shortcuts are ignored while you type in a field.',
  ].join('\n'));
}
```

- [ ] **Step 3: Create `apps/demo/src/app/cards.ts`**

```ts
// The scenario card (research/13 brief §7 "Scenario card"; TrainingMonitor's catalogue, CAE/REALITi objectives): title,
// draft flag, the learner-facing story, category, patient, duration and objectives. Used by Start and the Scenario tab.
import type { ScenarioCard } from './scenarios.ts';
import { drugWords } from './glossary.ts';
import { h } from './ui.ts';

/** Scenario card: title, story, patient, duration, objectives (research/13 §4.3; CAE/REALITi checklists). */
export function scenarioCard(c: ScenarioCard, extra?: HTMLElement): HTMLElement {
  // scenario text names drugs in the site's set (orchestrator ruling 5): "adrenaline" or "epinephrine"
  return h('article', { class: 'card scard', 'aria-label': drugWords(c.title) },
    h('div', { class: 'scard-head' }, h('h3', {}, drugWords(c.title)), c.draft ? h('span', { class: 'tag', title: 'Not yet reviewed clinically' }, 'Draft') : null),
    h('p', {}, drugWords(c.story)),
    h('p', { class: 'meta' }, [c.category, c.patient, c.minutes ? `about ${c.minutes} min` : ''].filter(Boolean).join(', ')),
    c.objectives.length ? h('ul', { class: 'objectives', 'aria-label': 'Learning objectives' }, ...c.objectives.map((o) => h('li', {}, drugWords(o)))) : null,
    extra ?? null,
  );
}
```

- [ ] **Step 4: Create `apps/demo/src/app/panel/vitals.ts`**

```ts
// Vitals & rhythm (research/13 §4.3 item 2): one row per target — glossary label with its tooltip, the live value, a
// stepper in clinical units, and the model state as a chip (CAE Maestro's flags): MODELED (wave), held by the
// instructor (pin, accent), changing (progress bar under the row: REALITi's trend arc), forced by the model (override).
// In MODELED mode "Set" holds the value (a pin) and "Return to model" releases it; in MANUAL "Set" moves the target.
import type { ControlFlag } from '@pme/controller';
import { rhythmGroups, rhythmLabel } from '../rhythms.ts';
import { button, glossLabel, h, PIN_SVG, setText, stepper, WAVE_SVG, type Stepper } from '../ui.ts';
import { showVital, vitalLabel, VITALS, type VitalSpec } from '../vitals.ts';
import { describeCommand } from '../describe.ts';
import type { PanelCtx } from './ctx.ts';

const FLAG_TEXT: Readonly<Record<ControlFlag, string>> = { modeled: 'Model', pinned: 'Held', ramping: 'Changing', override: 'Model override' };

export function vitalsTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  const mode = () => link.ctl.state?.mode ?? 'manual';

  // ---- rhythm picker ----
  const rsel = h('select', { class: 'input', id: 'vt-rhythm' });
  for (const [g, ids] of rhythmGroups()) rsel.append(h('optgroup', { label: g }, ...ids.map((id) => h('option', { value: id }, rhythmLabel(id)))));
  const rnow = h('span', { class: 'now' });
  const rhythm = h('div', { class: 'param' },
    h('div', { class: 'lbl' }, glossLabel(296)), rnow,
    h('div', { class: 'edit' }, h('label', { class: 'sr-only', for: 'vt-rhythm' }, 'New rhythm'), rsel,
      button('Stage', () => {
        const cmd = { type: 'setRhythm', rhythm: rsel.value } as const;
        staging.submit(cmd as never, 'rhythm', describeCommand(cmd));
      })),
  );

  // ---- target rows ----
  const rows: Array<{ s: VitalSpec; row: HTMLElement; now: HTMLElement; chip: HTMLElement; st: Stepper; release: HTMLButtonElement; bar: HTMLElement; seeded: boolean }> = [];
  const groups = new Map<string, HTMLElement>();
  for (const s of VITALS) {
    let g = groups.get(s.group);
    if (!g) groups.set(s.group, (g = h('div', { class: 'vgroup' }, h('h3', {}, s.group))));
    const now = h('span', { class: 'now num' });
    const chip = h('span', { class: 'chip' });
    const st = stepper({ label: `${shortOf(s)} target`, unit: s.unit, min: s.min, max: s.max, step: s.step, value: s.min, digits: s.digits });
    const set = button('Set', () => {
      const value = st.value / s.scale;
      const cmd = (mode() === 'modeled' ? { type: 'pin', variable: s.v, value } : { type: 'setTarget', variable: s.v, value }) as never;
      staging.submit(cmd, `v-${s.v}`, describeCommand(cmd));
    });
    const release = button('Return to model', () => {
      const cmd = { type: 'release', variable: s.v } as never;
      staging.submit(cmd, `v-${s.v}`, describeCommand(cmd));
    }, 'ghost small');
    const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-label': `${shortOf(s)} change in progress`, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i'));
    const row = h('div', { class: 'param', 'data-var': s.v },
      h('div', { class: 'lbl' }, glossLabel(s.n), chip), h('span', { class: 'nowwrap' }, now, h('span', { class: 'unit' }, s.unit)),
      h('div', { class: 'edit' }, st.el, set, release), bar);
    g.append(row);
    rows.push({ s, row, now, chip, st, release, bar, seeded: false });
  }

  const releaseAll = button('Return all to the model', () => {
    const cmd = { type: 'release', variable: 'all' } as never;
    staging.submit(cmd, 'release-all', describeCommand(cmd));
  }, 'small');
  const modeNote = h('p', { class: 'hint' });

  c.onRefresh(() => {
    const st = link.ctl.state;
    const m = mode();
    setText(modeNote, m === 'modeled' ? 'MODELED: the body sets these values. Setting one holds it until you return it to the model.' : 'MANUAL: every value is what you set, with the onset chosen below.');
    releaseAll.hidden = m !== 'modeled';
    setText(rnow, link.ctl.rhythm ? rhythmLabel(link.ctl.rhythm) : '--');
    for (const r of rows) {
      const v = st?.values[r.s.v];
      setText(r.now, showVital(r.s, v));
      r.row.hidden = !!r.s.manualOnly && m === 'modeled';
      if (!r.seeded && v !== undefined) {
        r.st.set(v * r.s.scale);
        r.seeded = true;
      }
      const flag: ControlFlag = st?.control[r.s.v] ?? (m === 'modeled' ? 'modeled' : 'pinned');
      const shown: ControlFlag = m === 'manual' && flag === 'pinned' ? 'pinned' : flag;
      // dark cockpit (ISA-101): a value the model is simply running shows no chip; the session badge already says MODELED
      r.chip.hidden = shown === 'modeled' || (m === 'manual' && shown === 'pinned');
      r.chip.className = `chip flag-${shown}`;
      r.chip.innerHTML = shown === 'pinned' ? PIN_SVG : shown === 'modeled' ? WAVE_SVG : '';
      r.chip.append(FLAG_TEXT[shown]);
      r.release.hidden = !(m === 'modeled' && (flag === 'pinned' || flag === 'ramping'));
      r.row.dataset.staged = String(staging.has(`v-${r.s.v}`));
      const ramp = link.ramps.get(r.s.v);
      const p = ramp ? Math.min(1, (link.simT - ramp.t0) / ramp.dur) : 1;
      r.bar.hidden = !ramp || p >= 1;
      if (ramp && p >= 1) link.ramps.delete(r.s.v);
      (r.bar.firstElementChild as HTMLElement).style.width = `${Math.round(p * 100)}%`;
      r.bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    }
  });

  return h('div', {}, rhythm, h('div', { class: 'row' }, modeNote, releaseAll), ...groups.values());
}

const shortOf = (s: VitalSpec): string => vitalLabel(s.v);
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/panel/ctx.ts apps/demo/src/app/commands.ts apps/demo/src/app/cards.ts apps/demo/src/app/panel/vitals.ts
git commit -m "feat(app): instructor panel context, bookmarks and shortcut sheet, scenario cards, Vitals & rhythm tab with pin/return and onset markers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 10: Instructor panel, part 2: the Scenario tab

**Files:**
- Create: `apps/demo/src/app/panel/scenario.ts`

**Why:** D12: library cards by category before a run; during a run the state strip, time in state, next triggers in clinical words with countdowns, manual triggers, hold/resume, jump (confirmed), bookmarks with "Return here", objectives that log "Objective met". On a Remote, Load sends the document (no patient restart).

- [ ] **Step 1: Create `apps/demo/src/app/panel/scenario.ts`**

```ts
// Scenario (research/13 §4.3 item 1; the simulator sweep's top patterns 4 and 5): before a run, the library as cards
// (story, patient, duration, objectives) filtered by category; during a run, the state strip with the current state
// highlighted, time in state, the next triggers in clinical words with countdowns, manual triggers as buttons,
// hold/resume, jump (confirmed), bookmarks that restore the physiology, and an objectives checklist for the debrief.
import { LIBRARY, cardOf, type ScenarioCard } from '../scenarios.ts';
import { CATEGORIES } from '../scenario-meta.ts';
import { drugWords } from '../glossary.ts';
import { countdown, transitionText } from '../triggers.ts';
import { button, clock, confirmDialog, h, setText, toast, toggle } from '../ui.ts';
import { scenarioCard } from '../cards.ts';
import { bookmark } from '../commands.ts';
import type { PanelCtx } from './ctx.ts';
import { manualLabel as manualOf } from '@pme/controller';

export function scenarioTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const sv = link.ctl.scenario;
  let filter = 'All';
  let docV = -1;

  // ---- library ----
  const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Category' });
  const cards = h('div', { class: 'cards' });
  const drawLib = () => {
    chips.replaceChildren(...['All', ...CATEGORIES].map((cat) => h('button', { type: 'button', role: 'radio', class: 'chip-btn', 'aria-checked': String(cat === filter), onclick: () => ((filter = cat), drawLib()) }, cat)));
    cards.replaceChildren(...LIBRARY.filter((x) => filter === 'All' || x.category === filter).map((x) => scenarioCard(x, h('div', { class: 'actions' }, button('Load', () => void load(x), 'primary')))));
  };
  const load = async (x: ScenarioCard) => {
    if (sv.doc && !(await confirmDialog('Load this scenario?', `"${cardOf(sv.doc).title}" is running. Loading "${x.title}" replaces the patient and restarts the scenario. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
    if (c.loadScenario) {
      if (c.loadScenario(x)) toast(`Scenario loaded: ${x.title}`);
    } else {
      const r = await link.send({ type: 'scenario', action: 'load', doc: x.doc });
      toast(r.accepted ? `Scenario loaded: ${x.title}` : 'The monitor refused the scenario (see the log)');
    }
  };
  const library = h('section', { 'aria-label': 'Scenario library' }, h('h3', {}, 'Scenario library'), chips, cards);

  // ---- run view ----
  // learner controls under the learner monitor: off by default, on for this run (host only; orchestrator ruling 4)
  const host = link.host;
  const learnerToggle = host
    ? toggle('Learner controls on the monitor', host.learner, (on) => {
        host.setLearner(on);
        link.note(on ? 'Learner controls shown on the monitor' : 'Learner controls hidden', 'system');
      }, 'small')
    : null;
  host?.onLearner((on) => learnerToggle?.set(on));
  const learnerRow = learnerToggle ? h('div', { class: 'row' }, learnerToggle, h('span', { class: 'hint' }, 'Charge, shock, CPR and drugs as buttons under the learner monitor, logged as learner actions.')) : null;
  const title = h('h3', {});
  const story = h('p', { class: 'hint' });
  const strip = h('ol', { class: 'states', 'aria-label': 'Scenario states' });
  const inState = h('span', { class: 'num' });
  const hold = button('Hold the timer', () => void link.send({ type: 'scenario', action: sv.paused ? 'resume' : 'pause' }), 'small');
  const next = h('ul', { class: 'next' });
  const objectives = h('ul', { class: 'objectives checks', 'aria-label': 'Objectives' });
  const marks = h('ul', { class: 'marks' });
  const run = h('section', { 'aria-label': 'Running scenario' },
    h('div', { class: 'scard-head' }, title, button('Choose another scenario', () => ((run.hidden = true), (library.hidden = false)), 'ghost small')), story,
    strip,
    h('div', { class: 'row' }, h('span', {}, 'Time in state '), inState, hold, button('Bookmark', () => void bookmark(link), 'small')),
    learnerRow,
    h('h3', {}, 'What happens next'), next,
    h('h3', {}, 'Objectives'), objectives,
    h('h3', {}, 'Bookmarks'), marks,
  );

  const jump = async (id: string, label: string) => {
    if (!(await confirmDialog('Jump to this state?', `The scenario moves to "${label}" now and runs its changes.`, 'Jump', false, 'Stay in this state'))) return;
    const r = await link.send({ type: 'scenario', action: 'goto', target: id });
    if (r.accepted) toast(`Scenario: ${label}`);
  };

  c.onRefresh(() => {
    const doc = sv.doc;
    run.hidden = !doc;
    library.hidden = !!doc;
    if (!doc) return;
    if (docV !== sv.docVersion) {
      docV = sv.docVersion;
      const card = cardOf(doc);
      setText(title, drugWords(card.title));
      setText(story, drugWords(card.story));
      objectives.replaceChildren(...card.objectives.map((o, i) => {
        const id = `obj-${i}`;
        const words = drugWords(o);
        const box = h('input', { type: 'checkbox', id, onchange: () => box.checked && link.note(`Objective met: ${words}`, 'marker') });
        return h('li', {}, h('label', { class: 'check', for: id }, box, words));
      }));
    }
    strip.replaceChildren(...doc.states.map((s) => {
      const label = s.label ?? 'State';
      const cur = s.id === sv.stateId;
      return h('li', cur ? { 'aria-current': 'step' } : {}, cur ? label : h('button', { type: 'button', class: 'linkish', onclick: () => void jump(s.id, label), 'aria-label': `Jump to ${label}` }, label));
    }));
    const t = sv.timeInState(link.simT);
    setText(inState, clock(t));
    hold.textContent = sv.paused ? 'Resume the timer' : 'Hold the timer';
    const cur = sv.current();
    next.replaceChildren(...(cur?.transitions ?? []).map((tr) => {
      const left = countdown(tr, t, link.simT);
      const manual = manualOf(tr.when);
      return h('li', {},
        h('span', {}, transitionText(tr, doc)), left !== null ? h('span', { class: 'num muted' }, ` in ${clock(left)}`) : null,
        manual ? button(manual, () => void link.send({ type: 'scenario', action: 'trigger', target: tr.id }), 'small') : null);
    }));
    marks.replaceChildren(...(link.ctl.bookmarks.length ? link.ctl.bookmarks : []).map((b) => h('li', {}, b, ' ', button('Return here', async () => {
      if (await confirmDialog('Return to this bookmark?', `The patient goes back to "${b}". The clock keeps running.`, 'Return', false, 'Stay here')) void link.send({ type: 'scenario', action: 'restoreBookmark', target: b });
    }, 'ghost small'))));
    if (!link.ctl.bookmarks.length) marks.replaceChildren(h('li', { class: 'muted' }, 'No bookmarks yet (Shift+B)'));
  });

  drawLib();
  return h('div', {}, run, library);
}
```

- [ ] **Step 2: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 3: Commit and push**

```bash
git add apps/demo/src/app/panel/scenario.ts
git commit -m "feat(app): Scenario tab — library cards, run strip, next triggers, bookmarks and objectives" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: Instructor panel, part 3: the Drugs & fluids tab

**Files:**
- Create: `apps/demo/src/app/panel/drugs.ts`

**Why:** Brief §7 "Dose picker": search by name or another name, presets, dose and unit, the absolute dose for this weight, Give now (urgent) or Stage, running infusions with Stop, the vaporiser, fluids and bleeding. Commands reuse the 7x console's builders (`physiology-console/actions.ts`, imported, not edited).

- [ ] **Step 1: Create `apps/demo/src/app/panel/drugs.ts`**

```ts
// Drugs & fluids (research/13 brief §7 "Dose picker"): find a drug by name (or another name: "noradrenaline"), pick a
// preset or type a dose, see the absolute dose for this patient's weight, then Give (applies now: a bolus is urgent)
// or Stage it with the other changes. Infusions keep a running list with rate change and stop. The vaporiser and
// fluids sit below. Doses go to the engine in the units shown; the engine converts (7g `toAmount`).
import type { ClinicalEvent } from '@pme/controller';
import { bleed, fluid, infusion, vaporiser } from '../../physiology-console/actions.ts';
import { describeCommand } from '../describe.ts';
import { doseUnits, findDrugs, perKg, rateUnits, unitText, type DrugItem } from '../drugs.ts';
import { button, h, input, seg, setText, stepper, toast } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const CLASS: Readonly<Record<string, string>> = {
  hypnotic: 'Hypnotic', opioid: 'Opioid', benzodiazepine: 'Benzodiazepine', ketamine: 'Dissociative', alpha2: 'α₂ agonist', volatile: 'Volatile anaesthetic',
  nmb: 'Neuromuscular blocker', depolariser: 'Depolarising blocker', nmbReversal: 'Reversal (encapsulation)', anticholinesterase: 'Anticholinesterase',
  anticholinergic: 'Anticholinergic', alpha1: 'α₁ agonist', mixedAdrenergic: 'Adrenergic agonist', betaAgonist: 'β agonist', vasopressin: 'Vasopressin',
  pde3: 'PDE3 inhibitor', betaBlocker: 'β blocker', antiarrhythmic: 'Antiarrhythmic', adenosine: 'Adenosine', vasodilator: 'Vasodilator',
  electrolyte: 'Electrolyte', metabolic: 'Metabolic', opioidAntagonist: 'Opioid antagonist', benzoAntagonist: 'Benzodiazepine antagonist',
  localAnaesthetic: 'Local anaesthetic', lipid: 'Lipid emulsion', dantrolene: 'Dantrolene', diuretic: 'Diuretic', osmotic: 'Osmotic agent',
};

export function drugsTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  let drug: DrugItem | null = null;
  let route: 'bolus' | 'infusion' = 'bolus';
  const running = new Map<string, { name: string; rate: number; unit: string }>();

  // ---- search ----
  const q = input('Find a drug', { type: 'search', placeholder: 'Drug name, for example noradrenaline', autocomplete: 'off' });
  const results = h('div', { class: 'chips results', role: 'list', 'aria-label': 'Matching drugs' });
  const drawResults = () => {
    const list = findDrugs(q.inp.value).slice(0, q.inp.value ? 12 : 10);
    results.replaceChildren(...list.map((d) => h('button', { type: 'button', role: 'listitem', class: 'chip-btn', 'aria-pressed': String(drug?.id === d.id), onclick: () => pick(d) }, d.name)));
  };
  q.inp.addEventListener('input', drawResults);
  q.inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = findDrugs(q.inp.value)[0];
      if (first) pick(first);
    }
  });

  // ---- dose card ----
  const card = h('div', { class: 'card dose', hidden: true });
  const name = h('h4', {});
  const cls = h('p', { class: 'hint' });
  const routeSeg = seg<'bolus' | 'infusion'>('Route', [['bolus', 'IV bolus'], ['infusion', 'Infusion']], 'bolus', (v) => ((route = v), drawDose()));
  const presets = h('div', { class: 'chips' });
  const dose = stepper({ label: 'Dose', unit: '', min: 0, max: 100000, step: 1, value: 0, digits: 2, onchange: () => drawKg() });
  const unitSel = h('select', { class: 'input unitsel', 'aria-label': 'Dose unit', onchange: () => drawKg() });
  const kg = h('p', { class: 'hint num' });
  const give = button('Give now', () => void giveNow(), 'primary');
  const stage = button('Stage', () => {
    const cmd = build();
    if (cmd) staging.submit(cmd as never, `drug-${drug?.id}-${route}`, describeCommand(cmd));
  });
  card.append(name, cls, routeSeg, presets, h('div', { class: 'row' }, dose.el, unitSel), kg, h('div', { class: 'row' }, give, stage));

  const build = (): Record<string, unknown> | null => {
    if (!drug || !(dose.value > 0)) return null;
    return route === 'bolus'
      ? { type: 'applyEvent', event: { kind: 'drug', drugId: drug.id, dose: dose.value, unit: unitSel.value, route: 'iv' } as unknown as ClinicalEvent }
      : infusion(drug.id, dose.value, unitSel.value);
  };
  const giveNow = async () => {
    const cmd = build();
    if (!cmd || !drug) return;
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `${drug.name}: not given (${r.reason ?? 'refused'})`);
    if (r.accepted && route === 'infusion') {
      running.set(drug.id, { name: drug.name, rate: dose.value, unit: unitSel.value });
      drawRunning();
    }
  };
  const pick = (d: DrugItem) => {
    drug = d;
    route = d.preset.bolus || !d.preset.infusion ? 'bolus' : 'infusion';
    routeSeg.set(route);
    setText(name, d.name);
    setText(cls, CLASS[d.cls] ?? '');
    card.hidden = false;
    drawResults();
    drawDose();
  };
  const drawDose = () => {
    if (!drug) return;
    const units: string[] = route === 'bolus' ? doseUnits(drug) : rateUnits(drug);
    unitSel.replaceChildren(...units.map((u) => h('option', { value: u }, unitText(u))));
    const list = (route === 'bolus' ? drug.preset.bolus : drug.preset.infusion) ?? [];
    presets.replaceChildren(...list.map(([v, u]) => h('button', { type: 'button', class: 'chip-btn', onclick: () => {
      if (![...unitSel.options].some((o) => o.value === u)) unitSel.append(h('option', { value: u }, unitText(u)));
      unitSel.value = u;
      dose.set(v);
      drawKg();
    } }, `${v} ${unitText(u)}`)));
    const first = list[0];
    if (first) {
      if (![...unitSel.options].some((o) => o.value === first[1])) unitSel.append(h('option', { value: first[1] }, unitText(first[1])));
      unitSel.value = first[1];
      dose.set(first[0]);
    } else dose.set(0);
    give.textContent = route === 'bolus' ? 'Give now' : 'Start infusion';
    drawKg();
  };
  const drawKg = () => setText(kg, perKg(dose.value, unitSel.value, c.weightKg()) || `Patient ${c.weightKg()} kg`);

  // ---- running infusions ----
  const runList = h('ul', { class: 'infusions' });
  const drawRunning = () => {
    runList.replaceChildren(...[...running.entries()].map(([id, r]) => h('li', {},
      h('span', {}, `${r.name} ${r.rate} ${unitText(r.unit)}`),
      button('Stop', async () => {
        const cmd = infusion(id, 0, r.unit);
        const a = await link.send(cmd as never);
        if (a.accepted) {
          running.delete(id);
          drawRunning();
          toast(`${r.name} infusion stopped`);
        }
      }, 'ghost small'))));
    if (!running.size) runList.replaceChildren(h('li', { class: 'muted' }, 'No infusions running. Choose a drug above and pick Infusion.'));
  };
  drawRunning();

  // ---- vaporiser ----
  let agent = 'sevoflurane';
  const agentSeg = seg<string>('Agent', [['sevoflurane', 'Sevoflurane'], ['isoflurane', 'Isoflurane'], ['desflurane', 'Desflurane']], agent, (v) => (agent = v));
  const dial = stepper({ label: 'Dial', unit: '%', min: 0, max: 18, step: 0.5, value: 2, digits: 1 });
  const fgf = stepper({ label: 'Fresh gas flow', unit: 'L/min', min: 0.2, max: 15, step: 0.5, value: 2, digits: 1 });
  const vap = h('div', {},
    agentSeg, h('div', { class: 'grid2' }, lab('Dial (%)', dial.el), lab('Fresh gas (L/min)', fgf.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = vaporiser(agent, dial.value, fgf.value);
      staging.submit(cmd as never, 'vaporiser', describeCommand(cmd));
    }), button('Vaporiser off', () => {
      const cmd = vaporiser(agent, 0, fgf.value);
      staging.submit(cmd as never, 'vaporiser', describeCommand(cmd));
    }, 'ghost')));

  // ---- fluids and bleeding ----
  let kind = 'crystalloid';
  const kindSeg = seg<string>('Fluid', [['crystalloid', 'Crystalloid'], ['colloid', 'Colloid'], ['blood', 'Blood']], kind, (v) => (kind = v));
  const vol = stepper({ label: 'Volume', unit: 'mL', min: 50, max: 3000, step: 50, value: 500 });
  const overMin = stepper({ label: 'Over', unit: 'min', min: 1, max: 120, step: 1, value: 10 });
  const loss = stepper({ label: 'Blood loss', unit: 'mL', min: 50, max: 5000, step: 50, value: 500 });
  const lossMin = stepper({ label: 'Blood loss over', unit: 'min', min: 1, max: 120, step: 1, value: 5 });
  const fl = h('div', {},
    kindSeg, h('div', { class: 'grid2' }, lab('Volume (mL)', vol.el), lab('Over (min)', overMin.el)),
    h('div', { class: 'row' }, button('Give', async () => {
      const cmd = fluid(kind, vol.value, overMin.value * 60);
      const r = await link.send(cmd as never);
      toast(r.accepted ? describeCommand(cmd) : 'Fluid not given (see the log)');
    }, 'primary')),
    h('h4', {}, 'Bleeding'), h('div', { class: 'grid2' }, lab('Blood loss (mL)', loss.el), lab('Over (min)', lossMin.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = bleed(loss.value, lossMin.value * 60);
      staging.submit(cmd as never, 'bleed', describeCommand(cmd));
    })));

  drawResults();
  return h('div', {}, h('h3', {}, 'Give a drug'), q.el, results, card, h('h3', {}, 'Running infusions'), runList, h('h3', {}, 'Vaporiser'), vap, h('h3', {}, 'Fluids and blood'), fl);
}

const lab = (text: string, control: HTMLElement): HTMLElement => h('div', { class: 'field' }, h('span', {}, text), control);
```

- [ ] **Step 2: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 3: Commit and push**

```bash
git add apps/demo/src/app/panel/drugs.ts
git commit -m "feat(app): Drugs & fluids tab — dose picker with presets and per-kg doses, infusions, vaporiser, fluids" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Instructor panel, part 4: Airway & ventilation, and Defib, pacing & CPR

**Files:**
- Create: `apps/demo/src/app/panel/airway.ts`
- Create: `apps/demo/src/app/panel/defib.ts`

**Why:** Airway state, who breathes and the ventilator settings in clinical units, lung conditions from the 7b catalogue with mild/moderate/severe and side, the ventilator one tap away; defibrillator (charge, shock, disarm, sync) and CPR apply at once, the pacer stages; the defibrillator's state mirrors `deviceStatus`.

- [ ] **Step 1: Create `apps/demo/src/app/panel/airway.ts`**

```ts
// Airway & ventilation (research/13 §4.3 item 4): airway state, who breathes (spontaneous, bag-mask, ventilator) with
// the ventilator's settings in clinical units, lung conditions from the 7b catalogue with their graded severities and
// side, and the full ventilator one tap away (the Stage V cockpit beside this monitor).
import { LUNG_CONDITIONS } from '@pme/engine-core';
import { lungCondition, ventilation } from '../../physiology-console/actions.ts';
import { describeCommand } from '../describe.ts';
import { hrefOf } from '../router.ts';
import { button, h, seg, select, stepper } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const AIRWAY: Array<[string, string]> = [
  ['patent', 'Patent'], ['obstructed', 'Obstructed'], ['bronchospasm', 'Bronchospasm'], ['apnoea', 'Apnoea'], ['disconnected', 'Circuit disconnected'],
  ['oesophageal', 'Tube in the oesophagus'], ['endobronchial', 'Tube endobronchial'],
];

export function airwayTab(c: PanelCtx): HTMLElement {
  const { staging } = c;
  const stage = (cmd: Record<string, unknown>, key: string) => staging.submit(cmd as never, key, describeCommand(cmd));

  const airway = select('Airway', AIRWAY, 'patent');
  const airwayRow = h('div', { class: 'row' }, airway.el, button('Stage', () => stage({ type: 'applyEvent', event: { kind: 'airway', state: airway.sel.value } }, 'airway')));

  let source = 'spontaneous';
  const rr = stepper({ label: 'Rate', unit: '/min', min: 4, max: 40, step: 1, value: 12 });
  const vt = stepper({ label: 'Tidal volume', unit: 'mL', min: 50, max: 1000, step: 10, value: 500 });
  const peep = stepper({ label: 'PEEP', unit: 'cmH₂O', min: 0, max: 25, step: 1, value: 5 });
  const fio2 = stepper({ label: 'FiO₂', unit: '%', min: 21, max: 100, step: 1, value: 50 });
  const settings = h('div', { class: 'grid2' }, f('Rate (/min)', rr.el), f('Tidal volume (mL)', vt.el), f('PEEP (cmH₂O)', peep.el), f('FiO₂ (%)', fio2.el));
  const src = seg<string>('Breathing', [['spontaneous', 'Spontaneous'], ['bvm', 'Bag-mask'], ['ventilator', 'Ventilator']], source, (v) => {
    source = v;
    settings.hidden = v === 'spontaneous';
  });
  settings.hidden = true;

  const conds = LUNG_CONDITIONS.filter((x) => x.id !== 'pregnancy');
  const cond = select('Condition', conds.map((x) => [x.id, x.label]), conds[0]?.id ?? '');
  let severity = 0.67;
  const sev = seg<string>('Severity', [['0.33', 'Mild'], ['0.67', 'Moderate'], ['1', 'Severe']], '0.67', (v) => (severity = Number(v)));
  let side: '' | 'L' | 'R' = '';
  const sideSeg = seg<'' | 'L' | 'R'>('Side', [['L', 'Left'], ['R', 'Right']], 'R', (v) => (side = v));
  const syncSide = () => {
    const d = conds.find((x) => x.id === cond.sel.value);
    sideSeg.hidden = !d?.sided;
    side = d?.sided ? (d.defaultSide ?? 'R') : '';
    if (side) sideSeg.set(side);
  };
  cond.sel.addEventListener('change', syncSide);
  syncSide();

  return h('div', {},
    h('h3', {}, 'Airway'), airwayRow,
    h('h3', {}, 'Breathing'), src, settings,
    h('div', { class: 'row' },
      button('Stage', () => stage(ventilation(source, rr.value, vt.value, peep.value, fio2.value / 100), 'ventilation')),
      h('a', { class: 'btn ghost', href: hrefOf('vent') }, 'Open the ventilator')),
    h('h3', {}, 'Lung condition'), cond.el, sev, sideSeg,
    h('div', { class: 'row' },
      button('Stage', () => stage(lungCondition(cond.sel.value, severity, side), `lung-${cond.sel.value}`)),
      button('Remove', () => stage(lungCondition(cond.sel.value, 0, side), `lung-${cond.sel.value}`), 'ghost')),
  );
}

const f = (text: string, control: HTMLElement): HTMLElement => h('div', { class: 'field' }, h('span', {}, text), control);
```

- [ ] **Step 2: Create `apps/demo/src/app/panel/defib.ts`**

```ts
// Defib, pacing & CPR (research/13 §4.3 item 5). Shock, charge and CPR are urgent: they apply at once, never staged
// (research/13 P6). The defibrillator state (charging, ready, shocks delivered, last outcome) mirrors the engine's
// `deviceStatus`, so the instructor sees what the learner's defibrillator is doing.
import { describeCommand } from '../describe.ts';
import { button, h, seg, setText, stepper, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const OUTCOME: Readonly<Record<string, string>> = { unchanged: 'no change', vf: 'VF', asystole: 'asystole', pea: 'PEA', rosc: 'return of circulation', sinus: 'sinus rhythm' };

export function defibTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  const now = async (event: Record<string, unknown>) => {
    const cmd = { type: 'applyEvent', event };
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `Not done: ${r.reason ?? 'refused'}`);
  };

  const energy = stepper({ label: 'Energy', unit: 'J', min: 1, max: 360, step: 10, value: 200 });
  const state = h('p', { class: 'hint', role: 'status' });
  const sync = toggle('Synchronised', false, (on) => void now({ kind: 'defib', action: on ? 'syncOn' : 'syncOff' }), 'small');
  const defib = h('div', {},
    h('div', { class: 'row' }, h('div', { class: 'field' }, h('span', {}, 'Energy (J)'), energy.el), sync),
    h('div', { class: 'row' },
      button('Charge', () => void now({ kind: 'defib', action: 'charge', energyJ: energy.value })),
      button('Shock', () => void now({ kind: 'defib', action: 'shock', energyJ: energy.value }), 'primary'),
      button('Disarm', () => void now({ kind: 'defib', action: 'disarm' }), 'ghost')),
    state);

  let mode: 'off' | 'demand' | 'fixed' = 'off';
  const pmode = seg<'off' | 'demand' | 'fixed'>('Pacer mode', [['off', 'Off'], ['demand', 'Demand'], ['fixed', 'Fixed']], mode, (v) => (mode = v));
  const rate = stepper({ label: 'Pacing rate', unit: '/min', min: 30, max: 180, step: 5, value: 70 });
  const ma = stepper({ label: 'Pacing current', unit: 'mA', min: 0, max: 200, step: 5, value: 70 });
  const pacer = h('div', {}, pmode, h('div', { class: 'grid2' }, h('div', { class: 'field' }, h('span', {}, 'Rate (/min)'), rate.el), h('div', { class: 'field' }, h('span', {}, 'Current (mA)'), ma.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = { type: 'applyEvent', event: { kind: 'pacer', mode, ratePpm: rate.value, mA: ma.value } };
      staging.submit(cmd as never, 'pacer', describeCommand(cmd));
    })));

  const cprRate = stepper({ label: 'Compression rate', unit: '/min', min: 60, max: 150, step: 5, value: 110 });
  let quality = 0.8;
  const q = seg<string>('Compression quality', [['0.4', 'Poor'], ['0.8', 'Good'], ['1', 'Excellent']], '0.8', (v) => (quality = Number(v)));
  const cpr = h('div', {}, h('div', { class: 'row' }, h('div', { class: 'field' }, h('span', {}, 'Rate (/min)'), cprRate.el), q),
    h('div', { class: 'row' },
      button('Start CPR', () => void now({ kind: 'cpr', active: true, rate: cprRate.value, quality }), 'primary'),
      button('Stop CPR', () => void now({ kind: 'cpr', active: false }))));

  c.onRefresh(() => {
    const d = link.device?.defib;
    if (!d) return setText(state, 'Defibrillator idle');
    const last = d.lastShock ? `; last shock ${d.lastShock.energyJ} J, ${OUTCOME[d.lastShock.outcome] ?? 'rhythm changed'}` : '';
    setText(state, `${d.state === 'charging' ? 'Charging' : d.state === 'ready' ? `Charged to ${d.energyJ} J: ready to shock` : 'Idle'}; ${d.shocks} shock${d.shocks === 1 ? '' : 's'} delivered${last}`);
    sync.set(d.sync);
  });

  return h('div', {}, h('h3', {}, 'Defibrillator'), defib, h('h3', {}, 'Pacing'), pacer, h('h3', {}, 'CPR'), cpr);
}
```

- [ ] **Step 3: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 4: Commit and push**

```bash
git add apps/demo/src/app/panel/airway.ts apps/demo/src/app/panel/defib.ts
git commit -m "feat(app): Airway & ventilation and Defib, pacing & CPR tabs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 13: Instructor panel, part 5: Devices & alarms, Patient and Log

**Files:**
- Create: `apps/demo/src/app/alarms.ts`
- Create: `apps/demo/src/app/alarms.test.ts`
- Create: `apps/demo/src/app/panel/devices.ts`
- Create: `apps/demo/src/app/panel/patient.ts`
- Create: `apps/demo/src/app/panel/log.ts`

**Why:** D10 (steady alarm mirror in skin colours with marker and word and in GLOSSARY words, the monitor's text as the tooltip — R50 review F4; silence/pause countdowns, one assertive announcement per new high alarm), D11 (sensors attach per channel; on a Remote, which cannot know the sensors' state until R-S9-6, the toggles start with no pressed state and one line says so — R50 review F14), NIBP; the patient card with MODELED/MANUAL and a confirmed restart that says what resets; the debrief log with filters, notes, bookmarks and CSV/JSON export.

- [ ] **Step 1: Create `apps/demo/src/app/alarms.ts`**

```ts
// The instructor's alarm mirror in glossary words (R50 review F4; research/11 §5.16 rules 1 and 2). The monitor prints
// its vendor's own text ("**ABPs 21<90", "ABP NON-PULSATILE", "%SPO2 LOW") inside its frame; outside the frame — the
// panel's alarm list and the top-bar count — the same alarm is worded from the glossary: the parameter's clinical
// label and the condition in plain words. The monitor's text stays available as the row's tooltip. No DOM here.
import type { AlarmEntry } from '@pme/engine-core';
import { labelOf } from './glossary.ts';

/** Fixed (non-limit) alarms of the device layer (engine-core l3/alarms `FixedAlarmId`), in clinical words. */
export const FIXED_ALARM_WORDS: Readonly<Record<string, string>> = {
  ASYSTOLE: 'Asystole',
  VFIB: 'Ventricular fibrillation or tachycardia',
  VTAC: 'Ventricular tachycardia',
  EXTREME_BRADY: 'Extreme bradycardia',
  EXTREME_TACHY: 'Extreme tachycardia',
  BRADY: 'Bradycardia',
  TACHY: 'Tachycardia',
  PAUSE: 'Pause in the ECG',
  PVCS: 'Frequent PVCs',
  DESAT: 'Desaturation',
  ecgLeadsOff: 'ECG leads off',
  spo2SensorOff: 'SpO₂ probe off',
  'nibp-failed': 'NIBP measurement failed',
  'apnoea-co2': 'Apnoea (no CO₂ breaths)',
  'apnoea-resp': 'Apnoea (no impedance breaths)',
  co2Line: 'CO₂ sampling line blocked',
  spo2NonPulsatile: 'SpO₂: no pulse detected',
  spo2LowPerf: 'SpO₂: low perfusion',
  abpNonPulsatile: 'ART: no pulsatile pressure',
  abpDisconnect: 'ART: line disconnected',
  abpZero: 'ART: zeroing',
  tempProbeOff: 'T1: probe off',
};

/** Numerics whose glossary label is not `mon.<numeric>` (the pulse rate from the arterial line). */
const NUMERIC_LABEL: Readonly<Record<string, string>> = { prAbp: 'PR (ART)' };

/**
 * The mirror line for one alarm: "ART S low", "SpO₂ low", "Asystole". An alarm the table does not know keeps the
 * monitor's text (`known: false`), so nothing is hidden; the gate note lists any such id (review F4).
 */
export function alarmLine(a: Pick<AlarmEntry, 'id' | 'text' | 'numeric'>): { text: string; known: boolean } {
  const fixed = FIXED_ALARM_WORDS[a.id];
  if (fixed) return { text: fixed, known: true };
  const side = /_(HIGH|LOW)$/.exec(a.id)?.[1];
  if (a.numeric && side) {
    const label = NUMERIC_LABEL[a.numeric] ?? labelOf(`mon.${a.numeric}`);
    if (label) return { text: `${label} ${side === 'HIGH' ? 'high' : 'low'}`, known: true };
  }
  return { text: a.text.replace(/^\*+/, ''), known: false };
}
```

- [ ] **Step 2: Create `apps/demo/src/app/alarms.test.ts`**

```ts
// R50 review F4: the alarm mirror speaks glossary words, never the vendor's aliases.
import { describe, expect, it } from 'vitest';
import type { NumericId } from '@pme/engine-core';
import { alarmLine, FIXED_ALARM_WORDS } from './alarms.ts';

describe('alarm mirror wording', () => {
  it('limit alarms: the glossary label of the numeric and the side', () => {
    expect(alarmLine({ id: 'ART_S_LOW', text: '**ABPs 21<90', numeric: 'abpSys' })).toEqual({ text: 'ART S low', known: true });
    expect(alarmLine({ id: 'SpO2_LOW', text: '%SPO2 LOW', numeric: 'spo2' })).toEqual({ text: 'SpO₂ low', known: true });
    expect(alarmLine({ id: 'NIBP_S_HIGH', text: '**NBPs 190>160', numeric: 'nibpSys' }).text).toBe('NIBP S high');
    expect(alarmLine({ id: 'EtCO2_HIGH', text: '**etCO2 50>45', numeric: 'etco2' }).text).toBe('EtCO₂ high');
    expect(alarmLine({ id: 'TEMP_LOW', text: '**Temp 35.9<36.0', numeric: 'tempCore' }).text).toBe('T1 low');
  });
  it('every limit numeric the device layer watches has a glossary label', () => {
    const numerics: NumericId[] = ['hr', 'spo2', 'nibpSys', 'nibpDia', 'nibpMean', 'abpSys', 'abpDia', 'abpMean', 'cvpMean', 'icpMean', 'cpp', 'papSys', 'papDia', 'papMean', 'rr', 'awrr', 'etco2', 'tempCore', 'tempSite', 'stII', 'prAbp'];
    for (const n of numerics) expect(alarmLine({ id: `X_HIGH`, text: 'vendor', numeric: n }).known, n).toBe(true);
  });
  it('fixed alarms in clinical words; the vendor alias never reaches the mirror', () => {
    expect(alarmLine({ id: 'abpNonPulsatile', text: 'ABP NON-PULSATILE' }).text).toBe('ART: no pulsatile pressure');
    expect(alarmLine({ id: 'DESAT', text: '***DESAT' }).text).toBe('Desaturation');
    for (const w of Object.values(FIXED_ALARM_WORDS)) expect(w).not.toMatch(/\bABP\b|NBP|etCO2|\*/);
  });
  it('an unknown alarm keeps the monitor text without its stars, flagged', () => {
    expect(alarmLine({ id: 'somethingNew', text: '**NEW THING' })).toEqual({ text: 'NEW THING', known: false });
  });
});
```

- [ ] **Step 3: Create `apps/demo/src/app/panel/devices.ts`**

```ts
// Devices & alarms (research/13 §4.3 item 6). The alarm list mirrors the monitor in the SKIN's colours, steady (the
// monitor flashes; its mirror must not pull the instructor's eye), with the priority as a marker and a word as well
// (IEC 60601-1-8; research/13-ui-design-references rules 3, 4). Silence and pause show the IEC 60417 bell-cancel /
// alarm-inhibit meaning in words with a countdown. Sensors attach and detach per channel (Laerdal: traces appear only
// once attached).
import type { SensorId } from '@pme/engine-core';
import { alarmLine } from '../alarms.ts';
import { describeCommand, SENSORS } from '../describe.ts';
import { LEVEL_MARK, LEVEL_NAME } from '../shell.ts';
import { button, clock, h, select, setText, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const CHANNELS: ReadonlyArray<[SensorId, 'on' | 'connected']> = [['ecg', 'on'], ['spo2', 'on'], ['nibp', 'on'], ['co2', 'on'], ['temp', 'on'], ['abp', 'connected'], ['cvp', 'connected'], ['pap', 'connected']];

export function devicesTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const now = async (cmd: Record<string, unknown>) => {
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `Not done: ${r.reason ?? 'refused'}`);
    return r.accepted;
  };
  const dev = (action: Record<string, unknown>) => now({ type: 'device', action });

  // ---- alarms ----
  const list = h('ul', { class: 'alarms', 'aria-label': 'Active alarms' });
  const live = h('div', { class: 'sr-only', 'aria-live': 'assertive' });
  const status = h('p', { class: 'hint', role: 'status' });
  let announced = new Set<string>();
  const actions = h('div', { class: 'row' },
    button('Silence', () => void dev({ device: 'alarm', action: 'silence' }), 'primary'),
    button('Pause alarms', () => void dev({ device: 'alarm', action: 'pause' })),
    button('Acknowledge', () => void dev({ device: 'alarm', action: 'ack' })),
    button('All alarms on', () => void dev({ device: 'alarm', action: 'enableAll', value: true }), 'ghost'));

  // ---- sensors ----
  const host = link.host;
  const attached = new Map<SensorId, boolean>(CHANNELS.map(([s]) => [s, host ? host.spec.attached && ['ecg', 'spo2', 'nibp', 'co2', 'temp'].includes(s) : false]));
  const toggles = CHANNELS.map(([s, onState]) => toggle(SENSORS[s] ?? 'Sensor', attached.get(s) ?? false, (on) => {
    attached.set(s, on);
    void now({ type: 'attachSensor', sensor: s, state: on ? onState : s === 'abp' || s === 'cvp' || s === 'pap' ? 'none' : 'off' });
  }));
  // A Remote does not know which sensors are attached (the engine does not report it yet, R-S9-6): its toggles start
  // with no pressed state, and the first tap attaches the sensor (R50 review F14).
  if (!host) for (const b of toggles) b.removeAttribute('aria-pressed');
  const sensors = h('div', { class: 'toggles' }, ...toggles);

  // ---- NIBP ----
  const interval = select('Automatic interval', [['0', 'Off (manual)'], ['1', 'Every 1 min'], ['3', 'Every 3 min'], ['5', 'Every 5 min'], ['10', 'Every 10 min'], ['15', 'Every 15 min']], '0', (v) =>
    void dev(Number(v) > 0 ? { device: 'nibp', action: 'auto', intervalMin: Number(v) } : { device: 'nibp', action: 'manual' }));
  const nibp = h('div', { class: 'row' }, button('Start NIBP now', () => void dev({ device: 'nibp', action: 'start' })), interval.el);

  c.onRefresh(() => {
    const a = link.alarms;
    const act = a?.active ?? [];
    list.replaceChildren(...[...act].sort((x, y) => x.level - y.level).map((x) => {
      const lv = LEVEL_NAME[x.level];
      // glossary words outside the monitor frame (review F4); the monitor's own text is the tooltip
      return h('li', { 'data-level': lv, title: `On the monitor: ${x.text}`, 'data-vendor-title': '' },
        h('span', { class: 'pri', 'data-level': lv }, `${LEVEL_MARK[x.level]} ${lv[0]?.toUpperCase()}${lv.slice(1)}`),
        h('span', {}, alarmLine(x).text, x.latched ? h('span', { class: 'muted' }, ' (latched)') : null),
        h('span', { class: 'num muted' }, x.acked ? 'acknowledged' : clock(x.since)));
    }));
    if (!act.length) list.replaceChildren(h('li', { class: 'none' }, a?.allOff ? 'All alarms are off on this monitor' : 'No active alarms'));
    const simT = a?.t ?? link.simT;
    const parts: string[] = [];
    if (a?.silencedUntil && a.silencedUntil > simT) parts.push(`Sound silenced, ${clock(a.silencedUntil - simT)} left`);
    if (a?.pausedUntil && a.pausedUntil > simT) parts.push(`Alarms paused, ${clock(a.pausedUntil - simT)} left`);
    if (a?.allOff) parts.push('Alarms off (the monitor was found this way)');
    setText(status, parts.join('. ') || 'Alarm sound on');
    const highs = act.filter((x) => x.level === 1 && !announced.has(x.id));
    if (highs.length) setText(live, `High priority alarm: ${highs.map((x) => alarmLine(x).text).join(', ')}`);
    announced = new Set(act.map((x) => x.id));
  });

  return h('div', {}, h('h3', {}, 'Alarms'), status, list, live, actions, h('h3', {}, 'Sensors'), h('p', { class: 'hint' }, 'A trace appears on the monitor only while its sensor is attached.'),
    host ? null : h('p', { class: 'hint' }, 'On a remote the sensors show no state until you set them: the monitor does not report which are attached yet.'), sensors, h('h3', {}, 'NIBP'), nibp);
}
```

- [ ] **Step 4: Create `apps/demo/src/app/panel/patient.ts`**

```ts
// Patient (research/13 §4.9): the one patient card — who the patient is, MODELED or MANUAL, and "Restart patient",
// which asks first and says what resets (drugs, fluids, ventilation, the scenario) and what carries on (the session
// code, the paired remote, the log). The body is fixed when the engine is created, so profile edits need a restart;
// the mode switches live.
import { COMORBIDITIES, oneLiner } from '../patients.ts';
import { button, confirmDialog, h, seg, setText, toast } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

export function patientTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const who = h('p', { class: 'summary num' });
  const conds = h('ul', { class: 'plain' });
  const modeSeg = seg<'modeled' | 'manual'>('Physiology', [['modeled', 'MODELED'], ['manual', 'MANUAL']], link.ctl.state?.mode ?? 'manual', async (v) => {
    const r = await link.send({ type: 'setMode', mode: v });
    toast(r.accepted ? `Mode: ${v.toUpperCase()}` : 'Mode not changed');
  });
  const host = link.host;
  const restart = host
    ? button('Restart patient', async () => {
        if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset. The session code, the paired remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
        host.restart({ spec: host.spec, mode: host.mode });
        link.note('Patient restarted', 'system');
        toast('Patient restarted');
      }) // a secondary button: red is for alarms; the confirm dialog carries the danger styling (R50 review F11)
    : null;
  const edit = host ? h('a', { class: 'btn ghost', href: '#/' }, 'Change the patient on the Start screen') : h('p', { class: 'hint' }, 'The patient is chosen on the monitor screen.');
  c.onRefresh(() => {
    if (host) {
      setText(who, oneLiner(host.spec));
      conds.replaceChildren(...COMORBIDITIES.filter((x) => host.spec.comorbid.includes(x.id)).map((x) => h('li', {}, x.label)));
      if (!host.spec.comorbid.length) conds.replaceChildren(h('li', { class: 'muted' }, 'No conditions'));
    } else setText(who, `${Math.round(c.weightKg())} kg`);
    const m = link.ctl.state?.mode;
    if (m) modeSeg.set(m);
  });
  return h('div', {}, h('h3', {}, 'Patient'), who, conds, h('h3', {}, 'Physiology'), modeSeg,
    h('p', { class: 'hint' }, 'MODELED: the body responds by itself and you can hold any value. MANUAL: you set every value.'),
    h('div', { class: 'row' }, edit, restart));
}
```

- [ ] **Step 5: Create `apps/demo/src/app/panel/log.ts`**

```ts
// Log (research/13 §4.3 item 8): the debrief view — every instructor, learner, scenario and alarm event with the sim
// time, filters, notes and bookmarks, and CSV/JSON export. Refused commands show the engine's reason in words.
import { logCsv, type ClinicalLogEntry } from '../link.ts';
import { button, clock, download, h, input, seg } from '../ui.ts';
import { bookmark } from '../commands.ts';
import type { PanelCtx } from './ctx.ts';

const KIND_TEXT: Readonly<Record<ClinicalLogEntry['kind'], string>> = { instructor: 'Instructor', learner: 'Learner', scenario: 'Scenario', alarm: 'Alarm', marker: 'Marker', note: 'Note', system: 'System' };

export function logTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  let filter: 'all' | 'actions' | 'alarms' | 'markers' = 'all';
  const list = h('ol', { class: 'log', 'aria-label': 'Session log' });
  const note = input('Note', { placeholder: 'Add a note for the debrief', autocomplete: 'off' });
  note.inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && note.inp.value.trim()) {
      link.note(note.inp.value.trim());
      note.inp.value = '';
    }
  });
  const show = (e: ClinicalLogEntry) => filter === 'all' || (filter === 'actions' && (e.kind === 'instructor' || e.kind === 'learner')) || (filter === 'alarms' && e.kind === 'alarm') || (filter === 'markers' && (e.kind === 'marker' || e.kind === 'note' || e.kind === 'scenario'));
  let n = -1;
  const draw = () => {
    if (n === link.log.length) return;
    n = link.log.length;
    list.replaceChildren(...link.log.filter(show).slice(-300).reverse().map((e) => h('li', { 'data-kind': e.kind },
      h('time', {}, e.simT === null ? '--:--' : clock(e.simT)), h('span', { class: 'k' }, KIND_TEXT[e.kind]),
      h('span', {}, e.text, e.refused ? h('span', { class: 'refused' }, ' (not applied; the reason is in the exported log)') : null))));
  };
  c.onRefresh(draw);
  return h('div', {},
    seg('Show', [['all', 'All'], ['actions', 'Actions'], ['alarms', 'Alarms'], ['markers', 'Marks and notes']], filter, (v) => ((filter = v), (n = -1), draw())),
    h('div', { class: 'row' }, note.el, button('Bookmark now', () => void bookmark(link), 'small')),
    list,
    h('div', { class: 'row' },
      button('Export CSV', () => download('session-log.csv', logCsv(link.log), 'text/csv'), 'ghost small'),
      button('Export JSON', () => download('session-log.json', JSON.stringify({ schema: 'pme-session-log/1', entries: link.log }, null, 1), 'application/json'), 'ghost small')));
}
```

- [ ] **Step 6: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/alarms.test.ts && npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: 4 passed (limit alarms read "ART S low", "SpO₂ low", "NIBP S high", "EtCO₂ high", "T1 low"; every limit
numeric of the device layer has a glossary label; fixed alarms in plain words with no vendor alias; an unknown id keeps
the monitor text, flagged); typecheck clean.

- [ ] **Step 7: Commit and push**

```bash
git add apps/demo/src/app/alarms.ts apps/demo/src/app/alarms.test.ts apps/demo/src/app/panel/devices.ts apps/demo/src/app/panel/patient.ts apps/demo/src/app/panel/log.ts
git commit -m "feat(app): Devices & alarms (alarm mirror in glossary words), Patient and Log tabs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 14: Instructor panel frame, staged-changes footer, shortcuts and the session bar

**Files:**
- Create: `apps/demo/src/app/panel/panel.ts`
- Create: `apps/demo/src/app/sessionbar.ts`

**Why:** Eight tabs in two rows of four (no hidden tabs at 420 px), the footer of D7 with Commit (⌘/Ctrl+Enter), the shortcuts of D25, one ≤ 2 Hz repaint of the visible tab (D26); the session bar: patient, mode badge with held count and its release dialog, scenario state and time, speed, pause, bookmark.

- [ ] **Step 1: Create `apps/demo/src/app/panel/panel.ts`**

```ts
// The instructor panel (research/13 §4.3, brief §7): eight tabs in the order they are used, the staged-changes footer
// (the Stage 6a stage bar grown up: Gaumard UNI's Apply list, SimPad's "Set transition time"), keyboard shortcuts
// (brief §9) and one ≤ 2 Hz repaint. Built only on a Link, so the same panel runs same-screen and as the Remote.
import type { Link } from '../link.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import { Staging } from '../staging.ts';
import { bookmark, shortcutsDialog } from '../commands.ts';
import { button, h, select, tabs, throttle, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';
import { airwayTab } from './airway.ts';
import { defibTab } from './defib.ts';
import { devicesTab } from './devices.ts';
import { drugsTab } from './drugs.ts';
import { logTab } from './log.ts';
import { patientTab } from './patient.ts';
import { scenarioTab } from './scenario.ts';
import { vitalsTab } from './vitals.ts';

export const TABS: ReadonlyArray<[string, string]> = [
  ['scenario', 'Scenario'], ['vitals', 'Vitals & rhythm'], ['drugs', 'Drugs & fluids'], ['airway', 'Airway & ventilation'],
  ['defib', 'Defib, pacing & CPR'], ['devices', 'Devices & alarms'], ['patient', 'Patient'], ['log', 'Log'],
];

export interface PanelHandle {
  el: HTMLElement;
  ctx: PanelCtx;
  staging: Staging;
  select(tab: string): void;
  destroy(): void;
}

const ONSETS: Array<[string, string]> = [['0', 'Now'], ['30', 'Over 30 s'], ['60', 'Over 1 min'], ['120', 'Over 2 min'], ['300', 'Over 5 min']];

export function mountPanel(link: Link, o: { site: SiteProfile; weightKg(): number; loadScenario?(c: ScenarioCard): boolean; tab?: string; onTab?(id: string): void }): PanelHandle {
  const staging = new Staging('panel', (c) => link.send(c));
  const refreshers = new Map<string, Array<() => void>>();
  let building = '';
  const ctx: PanelCtx = {
    link, staging, site: o.site, weightKg: o.weightKg, goTab: (id) => t.select(id),
    onRefresh: (fn) => {
      const list = refreshers.get(building) ?? [];
      list.push(fn);
      refreshers.set(building, list);
    },
    ...(o.loadScenario ? { loadScenario: o.loadScenario } : {}),
  };
  const make = (id: string, fn: (c: PanelCtx) => HTMLElement) => () => {
    building = id;
    const el = fn(ctx);
    building = '';
    return el;
  };
  // ---- repaint: only the visible tab, ≤ 2 Hz ----
  const repaint = throttle(() => {
    for (const fn of refreshers.get(t.current()) ?? []) fn();
  }, 500);
  const t = tabs('Instructor controls', [
    { id: 'scenario', label: 'Scenario', render: make('scenario', scenarioTab) },
    { id: 'vitals', label: 'Vitals & rhythm', render: make('vitals', vitalsTab) },
    { id: 'drugs', label: 'Drugs & fluids', render: make('drugs', drugsTab) },
    { id: 'airway', label: 'Airway & ventilation', render: make('airway', airwayTab) },
    { id: 'defib', label: 'Defib, pacing & CPR', render: make('defib', defibTab) },
    { id: 'devices', label: 'Devices & alarms', render: make('devices', devicesTab) },
    { id: 'patient', label: 'Patient', render: make('patient', patientTab) },
    { id: 'log', label: 'Log', render: make('log', logTab) },
  ], o.tab ?? 'vitals', (id) => {
    o.onTab?.(id);
    repaint();
  });

  // ---- staged-changes footer ----
  const count = h('span', { class: 'count', role: 'status' });
  const list = h('ul', { class: 'staged-list' });
  const onset = select('Onset', ONSETS, '0', (v) => (staging.transitionS = Number(v)));
  onset.el.classList.add('inline');
  const auto = toggle('Apply at once', false, (on) => {
    staging.autoApply = on;
    drawFooter();
  }, 'small');
  const discard = button('Discard', () => staging.discard(), 'ghost');
  const commit = button('Commit', () => void doCommit(), 'primary');
  commit.setAttribute('aria-keyshortcuts', 'Meta+Enter Control+Enter');
  const footer = h('footer', { class: 'stagebar', 'aria-label': 'Staged changes' },
    h('div', { class: 'stagebar-row' }, count, onset.el), list, h('div', { class: 'stagebar-row' }, auto, h('span', { class: 'spacer' }), discard, commit));
  const doCommit = async () => {
    const n = staging.size;
    if (!n) return;
    const r = await staging.commit();
    const refused = r.filter((x) => !x.accepted).length;
    toast(refused ? `${n - refused} of ${n} changes applied; ${refused} refused (see the log)` : n === 1 ? '1 change applied' : `${n} changes applied`);
  };
  const drawFooter = () => {
    const n = staging.size;
    footer.dataset.count = String(n);
    count.textContent = staging.autoApply ? 'Changes apply at once' : n === 0 ? 'No changes staged' : n === 1 ? '1 change staged' : `${n} changes staged`;
    list.replaceChildren(...staging.lines.map((l) => h('li', {}, l)));
    commit.disabled = n === 0;
    discard.disabled = n === 0;
    commit.textContent = n > 1 ? `Commit ${n} changes` : 'Commit';
  };
  staging.onChange(() => {
    drawFooter();
    repaint();
  });
  drawFooter();

  const offLink = link.onChange(repaint);
  const tick = setInterval(repaint, 1000); // onset progress bars and clocks move with sim time even without events

  // ---- keyboard shortcuts (brief §9); never while typing ----
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void doCommit();
      return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey || el.closest('[hidden]')) return;
    const k = e.key;
    const dev = (action: Record<string, unknown>) => void link.send({ type: 'device', action } as never).then((r) => r.accepted && toast(action.action === 'silence' ? 'Alarm sound silenced' : action.action === 'pause' ? 'Alarms paused' : 'NIBP measurement started'));
    if (k === 'S') dev({ device: 'alarm', action: 'silence' });
    else if (k === 'P') dev({ device: 'alarm', action: 'pause' });
    else if (k === 'N') dev({ device: 'nibp', action: 'start' });
    else if (k === 'B') void bookmark(link);
    else if (k === '?') void shortcutsDialog();
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  const el = h('div', { class: 'panel', role: 'region', 'aria-label': 'Instructor panel' }, t.el, footer);
  return {
    el, ctx, staging, select: t.select,
    destroy: () => {
      offLink();
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
    },
  };
}
```

- [ ] **Step 2: Create `apps/demo/src/app/sessionbar.ts`**

```ts
// The session bar (research/13 brief §5, §7): patient one-liner, the MODELED / MANUAL / "n held" badge (a popover
// dialog lists held values with "Return to model"), the scenario's state and time, sim speed and pause, and a bookmark.
// It reads the same Link as the panel, so it is identical same-screen and on a Remote.
import type { Link } from './link.ts';
import { cardOf } from './scenarios.ts';
import { oneLiner } from './patients.ts';
import { vitalLabel } from './vitals.ts';
import type { StateVar } from '@pme/engine-core';
import { bookmark } from './commands.ts';
import { button, clock, h, infoDialog, PIN_SVG, seg, setText, throttle, toast, WAVE_SVG } from './ui.ts';

export function mountSessionBar(bar: HTMLElement, link: Link): () => void {
  const who = h('span', { class: 'who num' });
  const badge = h('button', { type: 'button', class: 'mode-badge', 'aria-haspopup': 'dialog' });
  const scen = h('span', { class: 'scen' });
  const t = h('span', { class: 'clock num', 'aria-label': 'Simulation time' });
  const speed = seg<string>('Simulation speed', [['1', '×1'], ['2', '×2'], ['4', '×4'], ['8', '×8']], '1', (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)));
  speed.classList.add('compact');
  let paused = false;
  const pause = button('Pause', () => {
    paused = !paused;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' });
    pause.textContent = paused ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
  }, 'small');
  pause.setAttribute('aria-pressed', 'false');
  const mark = button('Bookmark', () => void bookmark(link), 'small ghost');
  mark.setAttribute('aria-keyshortcuts', 'Shift+B');

  const held = (): StateVar[] => Object.entries(link.ctl.state?.control ?? {}).filter(([, f]) => f === 'pinned' || f === 'ramping').map(([v]) => v as StateVar);
  badge.addEventListener('click', () => {
    const m = link.ctl.state?.mode ?? 'manual';
    const vars = m === 'modeled' ? held() : [];
    const body = h('div', {},
      h('p', {}, m === 'modeled' ? 'The body sets every value you have not held.' : 'MANUAL: every value is what you set.'),
      vars.length ? h('ul', { class: 'plain' }, ...vars.map((v) => h('li', {}, vitalLabel(v), ' ', button('Return to model', () => void link.send({ type: 'release', variable: v }), 'ghost small')))) : null,
      vars.length > 1 ? button('Return all to the model', () => void link.send({ type: 'release', variable: 'all' }), 'small') : null);
    void infoDialog(m === 'modeled' ? 'MODELED' : 'MANUAL', body);
  });

  bar.replaceChildren(h('div', { class: 'sb-left' }, who, badge, scen), h('div', { class: 'sb-right' }, t, speed, pause, mark));
  const draw = throttle(() => {
    const host = link.host;
    const p = link.ctl.scenario.doc?.patient;
    // a Remote knows the patient only from the loaded scenario; the status pill says whether it is connected
    setText(who, host ? oneLiner(host.spec) : p ? [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' ') : '');
    const m = link.ctl.state?.mode ?? host?.mode ?? 'manual';
    const n = m === 'modeled' ? held().length : 0;
    badge.dataset.mode = m;
    badge.innerHTML = m === 'modeled' ? WAVE_SVG : PIN_SVG;
    badge.append(m === 'modeled' ? (n ? `MODELED, ${n} held` : 'MODELED') : 'MANUAL');
    badge.setAttribute('aria-label', `Physiology mode ${m === 'modeled' ? 'MODELED' : 'MANUAL'}${n ? `, ${n} values held by you` : ''}: show details`);
    const sv = link.ctl.scenario;
    setText(scen, sv.doc ? `${cardOf(sv.doc).title}: ${sv.stateLabel()} ${clock(sv.timeInState(link.simT))}` : 'No scenario');
    setText(t, clock(link.simT));
  }, 500);
  const off = link.onChange(draw);
  const iv = setInterval(draw, 1000);
  draw();
  return () => {
    off();
    clearInterval(iv);
  };
}
```

- [ ] **Step 3: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 4: Commit and push**

```bash
git add apps/demo/src/app/panel/panel.ts apps/demo/src/app/sessionbar.ts
git commit -m "feat(app): instructor panel frame with staged-changes footer and shortcuts; session bar" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 15: Views: Start, Monitor and Instructor

**Files:**
- Create: `apps/demo/src/app/learner.ts`
- Create: `apps/demo/src/app/views/start.ts`
- Create: `apps/demo/src/app/views/monitor.ts`
- Create: `apps/demo/src/app/views/teach.ts`

**Why:** Start sets the session up beside the running patient (brief Q1: Start on first visit), previews without confirm until the session is live, confirms before replacing a live patient. Monitor is the learner's full screen with the 6a reveal gestures and, when the instructor switches it on for the scenario, the learner controls strip under it (D27, orchestrator ruling 4). Instructor places the panel beside or over the monitor (D21).

- [ ] **Step 1: Create `apps/demo/src/app/learner.ts`**

```ts
// Learner controls (orchestrator ruling 4 on the R50 review; brief Q12): the Stage 6b "Learner:" bar as a strip under
// the learner's monitor. OFF by default; the instructor switches it on for the running scenario (Scenario tab), or a
// scenario's card meta does (`learnerControls`); loading another scenario or restarting the patient switches it off.
// Each button is what the team at the bedside does (charge, shock, CPR, a drug); it goes through the same link as the
// instructor's commands and is logged as a learner action. The actions are the 6b runner's own list (imported).
import { LEARNER_ACTIONS, type LearnerAction } from '../stage6b/actions.ts';
import { describeCommand } from './describe.ts';
import { drugWords } from './glossary.ts';
import type { Link } from './link.ts';
import { button, h, toast } from './ui.ts';

/** A learner button's label in the site's drug names ("Epinephrine 1 mg" or "Adrenaline 1 mg"). */
export const learnerLabel = (a: LearnerAction): string => drugWords(a.label);

export function learnerStrip(link: Link): HTMLElement {
  const el = h('div', { class: 'learner-strip', role: 'toolbar', 'aria-label': 'Learner controls' });
  for (const a of LEARNER_ACTIONS) {
    let on = false; // CPR is a toggle
    const b = button(learnerLabel(a), async () => {
      const cmd = { type: 'applyEvent', event: a.off && on ? a.off : a.event };
      const r = await link.send(cmd as never, 'learner');
      if (r.accepted && a.off) {
        on = !on;
        b.textContent = on ? 'Stop CPR' : learnerLabel(a);
      }
      toast(r.accepted ? describeCommand(cmd) : 'Not done (see the log)');
    }, 'small');
    el.append(b);
  }
  return el;
}
```

- [ ] **Step 2: Create `apps/demo/src/app/views/start.ts`**

```ts
// Start (research/13 §4.1, brief Q1): set up the session beside the patient it describes. The monitor on the right is
// the session's own engine, already running, so what you choose is what you see; nothing reloads when you leave.
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, type PatientSpec } from '../patients.ts';
import { scenarioCard } from '../cards.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import type { AppSession, Mode } from '../session.ts';
import { MONITORS, THEMES, saveSite, type SiteProfile } from '../site.ts';
import { button, confirmDialog, h, seg, select, stepper, toast } from '../ui.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';

export interface StartDeps {
  session: AppSession;
  site: SiteProfile;
  /** Called with the chosen scenario when the instructor view opens with one. */
  loadScenario(card: ScenarioCard): boolean;
}

export function startView(d: StartDeps): View {
  const s = d.session;
  let spec: PatientSpec = { ...s.spec, comorbid: [...s.spec.comorbid], attached: !d.site.sensorsOff };
  let mode: Mode = s.mode;
  let chosen: ScenarioCard | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const preview = () => {
    if (timer) clearTimeout(timer);
    summary.textContent = oneLiner(spec);
    // The preview restarts the engine only while nobody is using the session yet.
    if (!s.live) timer = setTimeout(() => s.restart({ spec, mode }), 350);
  };

  const presetSeg = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Patient' });
  const drawPresets = () => {
    presetSeg.replaceChildren(
      ...PATIENT_PRESETS.map((p) =>
        h('button', {
          type: 'button', role: 'radio', class: 'chip-btn', 'aria-checked': String(JSON.stringify(p.spec.comorbid) === JSON.stringify(spec.comorbid) && p.spec.ageY === spec.ageY && p.spec.weightKg === spec.weightKg),
          onclick: () => {
            spec = { ...p.spec, comorbid: [...p.spec.comorbid], attached: spec.attached };
            drawPresets();
            drawDetails();
            preview();
          },
        }, p.label),
      ),
    );
  };

  const details = h('div', { class: 'grid2' });
  const comorb = h('fieldset', { class: 'checks' }, h('legend', {}, 'Conditions'));
  const drawDetails = () => {
    const age = stepper({ label: 'Age', unit: 'years', min: 1, max: 95, step: 1, value: spec.ageY, onchange: (v) => ((spec = { ...spec, ageY: v }), preview()) });
    const wt = stepper({ label: 'Weight', unit: 'kg', min: 3, max: 200, step: 1, value: spec.weightKg, onchange: (v) => ((spec = { ...spec, weightKg: v }), preview()) });
    const ht = stepper({ label: 'Height', unit: 'cm', min: 50, max: 210, step: 1, value: spec.heightCm, onchange: (v) => ((spec = { ...spec, heightCm: v }), preview()) });
    const sex = seg<'M' | 'F'>('Sex', [['F', 'Female'], ['M', 'Male']], spec.sex, (v) => ((spec = { ...spec, sex: v }), preview()));
    details.replaceChildren(
      field('Age', age.el, 'years'), field('Sex', sex), field('Weight', wt.el, 'kg'), field('Height', ht.el, 'cm'),
    );
    comorb.replaceChildren(
      h('legend', {}, 'Conditions'),
      ...COMORBIDITIES.map((c) => {
        const id = `cm-${c.id}`;
        const box = h('input', { type: 'checkbox', id, disabled: !!c.later, onchange: () => {
          spec = { ...spec, comorbid: box.checked ? [...spec.comorbid, c.id] : spec.comorbid.filter((x) => x !== c.id) };
          drawPresets();
          preview();
        } });
        box.checked = spec.comorbid.includes(c.id);
        return h('label', { class: 'check', for: id }, box, c.label, c.later ? h('span', { class: 'tag' }, 'coming in v1.1') : null);
      }),
    );
  };

  const summary = h('p', { class: 'summary num' });
  const modeSeg = seg<Mode>('Physiology', [['modeled', 'MODELED'], ['manual', 'MANUAL']], mode, (v) => {
    mode = v;
    modeHint.textContent = hintOf(v);
    preview();
  });
  const hintOf = (m: Mode) => (m === 'modeled'
    ? 'The body responds by itself: drugs, bleeding and ventilation change the numbers. You can still hold any value.'
    : 'You set every number. The monitor shows exactly what you choose, with the onset you choose.');
  const modeHint = h('p', { class: 'hint' }, hintOf(mode));

  const sensors = h('input', { type: 'checkbox', id: 'st-sensors', onchange: () => {
    spec = { ...spec, attached: !sensors.checked };
    d.site.sensorsOff = sensors.checked;
    saveSite(d.site);
    preview();
  } });
  sensors.checked = !spec.attached;

  const mon = select('Monitor', MONITORS.map((m) => [m.id, m.label]), d.site.skin, (v) => {
    d.site.skin = v;
    saveSite(d.site);
    void s.setSkin(v, d.site.theme);
    monHint.textContent = MONITORS.find((m) => m.id === v)?.hint ?? '';
  });
  const monHint = h('p', { class: 'hint' }, MONITORS.find((m) => m.id === d.site.skin)?.hint ?? '');
  const theme = select('Screen', THEMES.map(([id, label]) => [id, label]), d.site.theme, (v) => {
    d.site.theme = v as SiteProfile['theme'];
    saveSite(d.site);
    void s.setSkin(d.site.skin, d.site.theme);
  });

  const scen = select('Scenario', [['', 'None: run the patient freely'], ...LIBRARY.map((c): [string, string] => [c.id, `${c.title}${c.draft ? ' (draft)' : ''}`])], '', (v) => {
    chosen = LIBRARY.find((c) => c.id === v) ?? null;
    scenCard.replaceChildren(...(chosen ? [scenarioCard(chosen)] : []));
  });
  const scenCard = h('div', {});

  const go = async (route: 'teach' | 'monitor') => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (!s.live) s.restart({ spec, mode });
    }
    if (chosen) {
      if (s.live && !(await confirmDialog('Load this scenario?', `The current patient is replaced by the scenario's patient. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
      if (!d.loadScenario(chosen)) return;
    } else if (s.live && patientChanged()) {
      if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset to the new patient. The session code, the remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
      s.restart({ spec, mode });
      toast('Patient restarted');
    }
    s.live = true;
    location.hash = hrefOf(route);
  };
  const patientChanged = () => JSON.stringify(spec) !== JSON.stringify(s.spec) || mode !== s.mode;

  const setup = h('form', { class: 'setup', onsubmit: (e: Event) => e.preventDefault(), 'aria-labelledby': 'start-h' },
    h('h2', {}, 'Patient'), presetSeg, summary,
    h('details', { class: 'more' }, h('summary', {}, 'Edit age, weight and conditions'), details, comorb),
    h('h2', {}, 'Physiology'), modeSeg, modeHint,
    h('label', { class: 'check', for: 'st-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)'),
    h('h2', {}, 'Scenario'), scen.el, scenCard,
    h('h2', {}, 'Monitor'), h('div', { class: 'grid2' }, mon.el, theme.el), monHint,
    h('div', { class: 'actions' },
      button('Open the instructor view', () => void go('teach'), 'primary'),
      button('Open the learner monitor', () => void go('monitor')),
      h('a', { class: 'btn ghost', href: hrefOf('remote') }, 'Open a remote'),
    ),
  );

  const tools = h('div', { class: 'tiles' },
    tile('explore', 'Explore physiology', 'Pressure–volume loops, lung mechanics, oxygen delivery, organs and drugs, with normal ranges.'),
    tile('vent', 'Ventilator', 'The ventilator beside this patient: modes, loops and the lung it ventilates.'),
    tile('validate', 'Validate', 'Bedside checklist, blind realism review and the performance check.'),
    tile('dev', 'Developer', 'Every model value, raw commands and the build-stage pages.'),
    tile('settings', 'Settings', 'This room: monitor, screen, units, frame rate and shortcuts.'),
  );

  const el = h('section', { 'aria-labelledby': 'start-h' },
    h('div', { class: 'page start' },
      h('h1', { id: 'start-h' }, 'Set up the session'),
      h('p', { class: 'lede' }, 'Choose the patient, the monitor and who is watching. The monitor already shows this patient, and the patient keeps running in every view.'),
      setup,
      h('h2', {}, 'Other tools'), tools,
    ),
  );
  drawPresets();
  drawDetails();
  summary.textContent = oneLiner(spec);
  return { id: 'start', el };
}

function field(label: string, control: HTMLElement, unit = ''): HTMLElement {
  return h('div', { class: 'field' }, h('span', {}, unit ? `${label} (${unit})` : label), control);
}

function tile(route: 'explore' | 'vent' | 'validate' | 'dev' | 'settings', title: string, text: string): HTMLElement {
  return h('a', { class: 'tile', href: hrefOf(route) }, h('b', {}, title), h('span', {}, text));
}
```

- [ ] **Step 3: Create `apps/demo/src/app/views/monitor.ts`**

```ts
// Monitor (research/13 §4.2): the learner's full-screen monitor, with the learner controls strip under it only when the
// instructor has switched it on for this scenario (orchestrator ruling 4). Nothing of the instructor shows; `i`, five taps in the
// top-left corner or a three-finger hold open the instructor view (the Stage 6a reveal gestures), and a quiet strip
// appears at the top edge only on pointer hover or keyboard focus.
import { learnerStrip } from '../learner.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import { button, h } from '../ui.ts';
import type { View } from '../shell.ts';

export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
  stage.append(strip);
  // the learner controls strip under the monitor: hidden unless the instructor switched it on (ruling 4)
  const learner = learnerStrip(o.link);
  o.session.onLearner((on) => (learner.hidden = !on));
  return { id: 'monitor', el: h('section', { 'aria-labelledby': 'mon-h' }, h('h1', { id: 'mon-h', class: 'sr-only' }, 'Learner monitor'), learner) };
}
```

- [ ] **Step 4: Create `apps/demo/src/app/views/teach.ts`**

```ts
// Instructor (research/13 §4.3, brief §8): the same monitor (not a copy) beside the panel on wide screens; on an iPad in
// landscape the panel is a drawer over the monitor (the 6a pattern), in portrait a sheet under it. The session bar
// sits above both.
import type { Link } from '../link.ts';
import { mountPanel, type PanelHandle } from '../panel/panel.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, store } from '../ui.ts';
import type { View } from '../shell.ts';

export function teachView(link: Link, o: { site: SiteProfile; main: HTMLElement; stage: HTMLElement; weightKg(): number; loadScenario(c: ScenarioCard): boolean }): View & { panel: PanelHandle } {
  const panel = mountPanel(link, { site: o.site, weightKg: o.weightKg, loadScenario: o.loadScenario, tab: store.get('tab') ?? 'vitals', onTab: (id) => store.set('tab', id) });
  const drawer = () => (o.main.dataset.drawer === 'open' ? 'closed' : 'open');
  const toggleBtn = button('Instructor panel', () => {
    o.main.dataset.drawer = drawer();
    toggleBtn.setAttribute('aria-expanded', String(o.main.dataset.drawer === 'open'));
  }, 'drawer-toggle');
  toggleBtn.setAttribute('aria-controls', 'teach-panel');
  toggleBtn.setAttribute('aria-expanded', 'true');
  o.main.dataset.drawer = 'open';
  o.stage.append(toggleBtn);
  const el = h('section', { id: 'teach-panel', 'aria-labelledby': 'teach-h' }, h('h1', { id: 'teach-h', class: 'sr-only' }, 'Instructor'), panel.el);
  return { id: 'teach', el, panel, enter: () => (o.main.dataset.panel = o.site.panel) };
}
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/learner.ts apps/demo/src/app/views/start.ts apps/demo/src/app/views/monitor.ts apps/demo/src/app/views/teach.ts
git commit -m "feat(app): Start, learner Monitor (with the learner controls strip) and Instructor views" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 16: Remote: pairing QR code and the panel on a second device

**Files:**
- Create: `apps/demo/src/app/qr.ts`
- Create: `apps/demo/src/app/qr.test.ts`
- Create: `apps/demo/src/app/pairing.ts`
- Create: `apps/demo/src/app/pairing.test.ts`
- Create: `apps/demo/src/app/views/remote.ts`

**Why:** D15 (R50 review F2, orchestrator ruling 6). Version 1.0 pairs in the same browser: the host shows the code and "Open the remote in a new window", says so in one sentence, and shows no QR code without a relay; with `?relay=` on a network address it shows the address and a QR code (self-written encoder, verified with CoreImage in the prototype) as a version 1.1 preview. A document opened at `#/remote?code=` joins by BroadcastChannel (or the relay with `?relay=`) and runs the same panel and session bar.

- [ ] **Step 1: Create `apps/demo/src/app/qr.ts`**

```ts
// A small QR Code encoder for the Remote pairing link (research/13 §4.4: "pairing by code and QR"; no dependency).
// Byte mode, error-correction level M, versions 1–10 (up to 213 bytes: a pairing URL is ≈ 60). Structure follows
// ISO/IEC 18004 as laid out in Project Nayuki's public description of the algorithm; the code is written here, not
// copied. Mask choice uses penalty rules 1, 2 and 4 (rule 3 is optional for a valid symbol).

// Error-correction level M, index = version (0 unused).
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const M_FORMAT = 0; // format bits for level M

const rawModules = (ver: number): number => {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
};
const dataCodewords = (ver: number): number => Math.floor(rawModules(ver) / 8) - (ECC_PER_BLOCK[ver] as number) * (NUM_BLOCKS[ver] as number);

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j] as number, root);
      if (j + 1 < r.length) r[j] = (r[j] as number) ^ (r[j + 1] as number);
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data: readonly number[], div: readonly number[]): number[] {
  const r = new Array<number>(div.length).fill(0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    for (let i = 0; i < div.length; i++) r[i] = (r[i] as number) ^ gfMul(div[i] as number, f);
  }
  return r;
}

const alignPositions = (ver: number, size: number): number[] => {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
};

const MASKS: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The symbol as rows of booleans (true = dark), without the quiet zone. Throws when the text is too long. */
export function encodeQr(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  let ver = 1;
  const need = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (ver <= 10 && need(ver) > dataCodewords(ver) * 8) ver++;
  if (ver > 10) throw new Error('text too long for the pairing QR code');
  const cap = dataCodewords(ver) * 8;
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // error correction and interleaving
  const nb = NUM_BLOCKS[ver] as number;
  const eccLen = ECC_PER_BLOCK[ver] as number;
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nb - (raw % nb);
  const shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push([...dat, ...ecc]);
  }
  const words: number[] = [];
  for (let i = 0; i < (blocks[0] as number[]).length; i++) {
    for (let j = 0; j < blocks.length; j++) if (i !== shortLen - eccLen || j >= nShort) words.push((blocks[j] as number[])[i] as number);
  }

  // function patterns
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    (mod[y] as boolean[])[x] = dark;
    (fn[y] as boolean[])[x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    }
  }
  const al = alignPositions(ver, size);
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set((al[i] as number) + dx, (al[j] as number) + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const drawFormat = (mask: number) => {
    const d = (M_FORMAT << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const c = Math.floor(i / 3);
      set(a, c, dark);
      set(c, a, dark);
    }
  }

  // data, zigzag from the bottom right
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
        if (!(fn[y] as boolean[])[x] && i < words.length * 8) {
          (mod[y] as boolean[])[x] = (((words[i >>> 3] as number) >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  // mask: the lowest penalty wins
  const apply = (m: number) => {
    const f = MASKS[m] as (x: number, y: number) => boolean;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!(fn[y] as boolean[])[x] && f(x, y)) (mod[y] as boolean[])[x] = !(mod[y] as boolean[])[x];
  };
  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    apply(m);
    drawFormat(m);
    const s = penalty(mod);
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
    apply(m);
  }
  apply(best);
  drawFormat(best);
  return mod;
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  let dark = 0;
  for (let a = 0; a < n; a++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let b = 1; b < n; b++) {
        const cur = horizontal ? (m[a] as boolean[])[b] : (m[b] as boolean[])[a];
        const prev = horizontal ? (m[a] as boolean[])[b - 1] : (m[b - 1] as boolean[])[a];
        if (cur === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else run = 1;
      }
    }
  }
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = (m[y] as boolean[])[x];
      if (c === (m[y] as boolean[])[x + 1] && c === (m[y + 1] as boolean[])[x] && c === (m[y + 1] as boolean[])[x + 1]) score += 3;
    }
  }
  for (const row of m) for (const c of row) if (c) dark++;
  const k = Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1;
  return score + Math.max(0, k) * 10;
}

/** The symbol as an SVG element with a 4-module quiet zone, black on white. */
export function qrSvg(text: string, px = 180, doc: Document = document): SVGSVGElement {
  const m = encodeQr(text);
  const n = m.length + 8;
  let d = '';
  m.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  }));
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.innerHTML = `<rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/>`;
  return svg;
}
```

- [ ] **Step 2: Create `apps/demo/src/app/qr.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { encodeQr } from './qr.ts';

// The encoder was checked in the Stage 9 prototype by decoding versions 1, 4, 6, 8 and 10 with macOS CoreImage
// (CIDetectorTypeQRCode). CI has no decoder, so this pins the structure and one symbol's checksum.
const finder = (m: boolean[][], x0: number, y0: number) => {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      expect(m[y0 + dy]?.[x0 + dx], `finder at ${x0},${y0} (${dx},${dy})`).toBe(d !== 2);
    }
  }
};
/** Format bits (15) read from around the top-left finder, then BCH-checked and unmasked. */
function formatOf(m: boolean[][]): { ecl: number; mask: number } {
  const bit = (x: number, y: number) => (m[y]?.[x] ? 1 : 0);
  let v = 0;
  const seq: Array<[number, number]> = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  seq.forEach(([x, y], i) => (v |= bit(x, y) << i));
  v ^= 0x5412;
  let rem = v >>> 10;
  const data = rem;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  expect((v & 0x3ff) >>> 0).toBe(rem & 0x3ff);
  return { ecl: data >>> 3, mask: data & 7 };
}

describe('pairing QR code', () => {
  it('picks the smallest version (level M, byte mode) and draws the three finder patterns', () => {
    for (const [text, size] of [['HELLO', 21], ['http://192.168.1.20:5173/#/remote?code=AGD5YJ', 33], ['A'.repeat(200), 57]] as const) {
      const m = encodeQr(text);
      expect(m.length).toBe(size);
      finder(m, 0, 0);
      finder(m, size - 7, 0);
      finder(m, 0, size - 7);
      expect(formatOf(m).ecl).toBe(0); // level M
    }
  });
  it('is deterministic (checksum of one symbol)', () => {
    const m = encodeQr('http://192.168.1.20:5173/#/remote?code=AGD5YJ');
    const s = m.flat().reduce((a, d, i) => (d ? (a * 31 + i) % 1_000_000_007 : a), 7);
    expect(s).toMatchInlineSnapshot(`2785361`);
  });
  it('refuses text longer than version 10 holds', () => {
    expect(() => encodeQr('x'.repeat(300))).toThrow(/too long/);
  });
});
```

- [ ] **Step 3: Create `apps/demo/src/app/pairing.ts`**

```ts
// How the host offers a Remote (review F2; orchestrator ruling 6). Version 1.0 pairs a Remote in the SAME browser only:
// the default transport is a BroadcastChannel, which never leaves the browser profile. A tablet on the network needs
// the Stage 6a relay (?relay=ws://…) and a network address the tablet can reach; that path is a version 1.1 feature,
// so without a relay the host shows no QR code and says so. No DOM here: the host view and its test read the result.

export interface PairingLocation {
  origin: string;
  hostname: string;
  pathname: string;
  search: string;
}

export interface Pairing {
  /** The address a Remote opens: this page at #/remote with the code (and the relay, when one is configured). */
  url: string;
  relay: string | null;
  /** Show the QR code: only with a relay and an address another device can reach. */
  qr: boolean;
  /** One sentence for the host, in plain words. */
  note: string;
}

/** Loopback hosts: an address on them works on this computer only. */
const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

export function pairingUrl(code: string, loc: PairingLocation): string {
  const relay = new URLSearchParams(loc.search).get('relay');
  return `${loc.origin}${loc.pathname}${relay ? `?relay=${encodeURIComponent(relay)}` : ''}#/remote?code=${code}`;
}

export function pairingOf(code: string, loc: PairingLocation): Pairing {
  const relay = new URLSearchParams(loc.search).get('relay');
  const url = pairingUrl(code, loc);
  if (!relay) {
    return {
      url, relay: null, qr: false,
      note: 'In this version the remote works in this browser only: open it in a new window or tab on this computer. Pairing a tablet over the network needs the relay server and comes in version 1.1.',
    };
  }
  if (LOOPBACK.test(loc.hostname)) {
    return {
      url, relay, qr: false,
      note: 'This address works on this computer only. Open the app by its network address (for example http://192.168.1.20:5173/?relay=…) so a tablet can reach it.',
    };
  }
  return { url, relay, qr: true, note: 'Network pairing through the relay is a preview of version 1.1. Scan the code with a tablet on the same network.' };
}
```

- [ ] **Step 4: Create `apps/demo/src/app/pairing.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { pairingOf, pairingUrl } from './pairing.ts';

const at = (href: string) => {
  const u = new URL(href);
  return { origin: u.origin, hostname: u.hostname, pathname: u.pathname, search: u.search };
};

describe('remote pairing (review F2, ruling 6)', () => {
  it('without a relay: same browser only, no QR code', () => {
    const p = pairingOf('AGD5YJ', at('http://127.0.0.1:5173/'));
    expect(p).toMatchObject({ url: 'http://127.0.0.1:5173/#/remote?code=AGD5YJ', relay: null, qr: false });
    expect(p.note).toMatch(/this browser only/);
    expect(pairingOf('AGD5YJ', at('http://192.168.1.20:5173/')).qr).toBe(false); // a LAN address alone is not enough
  });
  it('with a relay: the QR code only on an address another device can reach', () => {
    const lan = pairingOf('AGD5YJ', at('http://192.168.1.20:5173/?relay=ws://192.168.1.20:8787'));
    expect(lan.qr).toBe(true);
    expect(lan.url).toBe('http://192.168.1.20:5173/?relay=ws%3A%2F%2F192.168.1.20%3A8787#/remote?code=AGD5YJ');
    for (const host of ['localhost', '127.0.0.1']) {
      const p = pairingOf('AGD5YJ', at(`http://${host}:5173/?relay=ws://localhost:8787`));
      expect(p.qr, host).toBe(false);
      expect(p.note).toMatch(/this computer only/);
    }
    expect(pairingUrl('X8N9HH', at('http://10.0.0.5/app/'))).toBe('http://10.0.0.5/app/#/remote?code=X8N9HH');
  });
});
```

- [ ] **Step 5: Create `apps/demo/src/app/views/remote.ts`**

```ts
// Remote (research/13 §4.4): on the host screen, how to pair (the code, "open here", and a QR code only where another
// device can use it); in a window opened at #/remote, the instructor panel alone, joined by the 6-letter code over the
// Stage 6a transports (BroadcastChannel in the same browser; the relay when the link carries ?relay=). Version 1.0 is
// same-browser only (review F2, orchestrator ruling 6): tablet pairing over the relay is version 1.1. The Remote never
// runs an engine: it sends commands and reads state, as the 6a remote does.
import { ControllerSession, createBroadcastChannelTransport, createWebSocketTransport, normalizeSessionCode, type ManagedTransport } from '@pme/controller';
import { Link } from '../link.ts';
import { mountPanel } from '../panel/panel.ts';
import { pairingOf } from '../pairing.ts';
import { qrSvg } from '../qr.ts';
import { mountSessionBar } from '../sessionbar.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, input, setText, throttle } from '../ui.ts';
import type { View } from '../shell.ts';

const hashParam = (k: string): string | null => new URLSearchParams(location.hash.split('?')[1] ?? '').get(k);

export function remoteView(o: { site: SiteProfile; hostless: boolean; bar: HTMLElement; code?: string }): View {
  if (!o.hostless) {
    const code = o.code ?? '';
    const p = pairingOf(code, location);
    const el = h('section', { 'aria-labelledby': 'rm-h' }, h('div', { class: 'page narrow' },
      h('h1', { id: 'rm-h' }, 'Pair a remote'),
      h('p', { class: 'lede' }, 'Run the case from a second window while the room watches this monitor. The remote shows the instructor panel alone.'),
      h('p', { class: 'hint pair-note', role: 'note' }, p.note),
      h('div', { class: 'pair' },
        p.qr ? h('div', { class: 'qr', role: 'img', 'aria-label': 'QR code of the pairing link' }, qrSvg(p.url, 200)) : null,
        h('div', {},
          h('p', {}, p.qr ? 'Scan the code with the tablet, or open this address and enter the code:' : 'Open the remote here, or enter this code in a remote window:'),
          p.relay ? h('p', { class: 'mono url' }, p.url) : null,
          h('p', { class: 'bigcode', 'aria-label': `Code ${code.split('').join(' ')}` }, code),
          h('div', { class: 'actions' }, button('Open the remote in a new window', () => window.open(p.url, 'pme-remote', 'width=520,height=900'))))),
    ));
    return { id: 'remote', el };
  }

  // ---- a Remote device ----
  const status = h('p', { class: 'status-pill', role: 'status' }, 'Not connected');
  const codeIn = input('Session code', { maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', inputmode: 'text', placeholder: 'For example AGD5YJ' });
  codeIn.inp.value = hashParam('code') ?? '';
  const err = h('p', { class: 'error', role: 'alert' });
  const holder = h('div', { class: 'remote-panel' });
  const join = h('form', { class: 'setup narrow', onsubmit: (e: Event) => {
    e.preventDefault();
    connect(codeIn.inp.value);
  } }, h('h1', {}, 'Instructor remote'), h('p', { class: 'lede' }, 'Enter the 6-letter code the host screen shows under Remote.'), codeIn.el, err, h('div', { class: 'actions' }, button('Connect', () => connect(codeIn.inp.value), 'primary')));
  const el = h('section', { 'aria-label': 'Remote' }, join, holder);

  function connect(raw: string): void {
    const code = normalizeSessionCode(raw);
    if (!code) {
      setText(err, 'Error: the code has 6 letters and digits, as shown on the host screen under Remote.');
      return;
    }
    const relay = new URLSearchParams(location.search).get('relay');
    const transport: ManagedTransport = relay ? createWebSocketTransport({ url: relay }) : createBroadcastChannelTransport(code);
    const ctl = new ControllerSession({ session: code, transport, issuedBy: 'remote' });
    const link = new Link(ctl, transport, null);
    join.hidden = true;
    holder.append(status);
    mountSessionBar(o.bar, link);
    o.bar.hidden = false;
    const panel = mountPanel(link, { site: o.site, weightKg: () => link.ctl.scenario.doc?.patient?.weightKg ?? 70 });
    holder.append(panel.el);
    const draw = throttle(() => setText(status, ctl.hostOnline ? `Connected to ${code}` : `Waiting for the monitor ${code}…`), 500);
    link.onChange(draw);
    draw();
    history.replaceState(null, '', `${location.pathname}${location.search}#/remote?code=${code}`);
    Object.assign(window, { __pmeRemote: { link, panel } }); // e2e hook
  }
  if (normalizeSessionCode(codeIn.inp.value)) queueMicrotask(() => connect(codeIn.inp.value));
  return { id: 'remote', el };
}
```

- [ ] **Step 6: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/qr.test.ts src/app/pairing.test.ts
```

Expected: 5 passed. QR (3): the checksum is pinned inline; 'HELLO' 21 modules, the pairing URL 33, 200 × 'A' 57; format bits decode to level M with a valid BCH remainder. Pairing (2): without a relay no QR and "this browser only"; with a relay a QR only on a non-loopback address.

- [ ] **Step 7: Commit and push**

```bash
git add apps/demo/src/app/qr.ts apps/demo/src/app/qr.test.ts apps/demo/src/app/pairing.ts apps/demo/src/app/pairing.test.ts apps/demo/src/app/views/remote.ts
git commit -m "feat(app): Remote pairing by code in the same browser (v1.0), QR only with a relay on a network address" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 17: Explore physiology

**Files:**
- Create: `apps/demo/src/app/views/explore.ts`

**Why:** D16: the 7x console's pure model re-presented in the bench theme with glossary rows by body system, normal ranges, change from baseline (arrow + tint), Changed only, the vitals strip in the site's gas unit, Model internals collapsed; the 7k slot and the v1.1 labs placeholder.

- [ ] **Step 1: Create `apps/demo/src/app/views/explore.ts`**

```ts
// Explore physiology (research/13 §4.5; R56): the Stage 7x console's data, re-presented for residents in the light
// bench theme. Every row is labelled from the glossary (label, tooltip with the full name, unit and adult normal) and
// grouped by organ; a change from the baseline is marked with an arrow and a tint, not colour alone. Values the
// glossary does not name are model internals: collapsed, with their engine keys, for the curious. The respiratory
// mechanics section is the slot the mechanics stage fills; labs beyond the blood gas are placeholders until v1.1.
import type { EngineEvent } from '@pme/engine-core';
import { ConsoleModel, type Row } from '../../physiology-console/model.ts';
import { fmtDelta, fmtValue } from '../../physiology-console/format.ts';
import type { GroupId } from '../../physiology-console/organs.ts';
import { DISPLAY_SCALE, entry, labelOf, lookup, rowKey, shortLabel, unitOf } from '../glossary.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { button, clock, h, setText, throttle, tip, toggle } from '../ui.ts';
import type { View } from '../shell.ts';

interface Section {
  id: string;
  title: string;
  groups: GroupId[];
  intro: string;
  /** Glossary sections whose rows belong here even if the console files them elsewhere. */
  gloss?: string[];
  placeholder?: string;
}

export const SECTIONS: readonly Section[] = [
  { id: 'overview', title: 'At the bedside', groups: ['monitor'], intro: 'What the monitor shows, with the adult normal range beside each value.' },
  { id: 'haemodynamics', title: 'Heart and circulation', groups: ['circulation'], intro: 'Pressures, flows and resistances behind the monitor numbers: cardiac output, stroke volume, SVR, filling pressures.' },
  { id: 'respiratory', title: 'Respiratory mechanics and volumes', groups: ['lungs'], gloss: ['5.6'], intro: 'Airway pressures, compliance and resistance, dead space and lung volumes.',
    placeholder: 'Pressure–volume and flow–volume loops, driving and transpulmonary pressure and the full set of lung volumes arrive in a coming update. The values the model computes today are listed below.' },
  { id: 'gas', title: 'Gas exchange and oxygen delivery', groups: ['lungs'], gloss: ['5.4', '5.5'], intro: 'Shunt, oxygen content, delivery and consumption.' },
  { id: 'blood', title: 'Blood, acid–base and temperature', groups: ['blood'], intro: 'Blood gas, electrolytes, haemoglobin and temperature.' },
  { id: 'brain', title: 'Brain', groups: ['brain'], intro: 'Intracranial pressure, cerebral perfusion and oxygenation.' },
  { id: 'kidney', title: 'Kidney', groups: ['kidney'], intro: 'Renal blood flow, filtration and urine output.' },
  { id: 'liver', title: 'Liver and metabolism', groups: ['liver'], intro: 'Hepatic blood flow, clearance and lactate.' },
  { id: 'endocrine', title: 'Endocrine', groups: ['endocrine'], intro: 'Glucose, stress hormones and thermoregulation.' },
  { id: 'neuro', title: 'Anaesthetic depth and neuromuscular block', groups: ['neuro'], intro: 'Depth index, MAC, train-of-four and drive depression.' },
  { id: 'drugs', title: 'Drugs', groups: ['drugs'], intro: 'Plasma and effect-site concentrations of the drugs given.' },
  { id: 'labs', title: 'Labs', groups: ['blood'], gloss: ['5.7'], intro: 'The arterial blood gas the model computes today.',
    placeholder: 'Full blood count, chemistry, coagulation and TEG/ROTEM panels are coming in version 1.1.' },
];

const displayOf = (r: Row): { value: string; unit: string; delta: string } => {
  const l = lookup(r.path);
  const scale = DISPLAY_SCALE[r.path] ?? r.meta.scale;
  const m = { digits: r.meta.digits, scale } as { digits?: number; scale: number };
  const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
  return { value: fmtValue(r.value, m), unit: l ? unitOf(l.e) : r.meta.unit, delta: r.delta === null ? '' : fmtDelta(r.delta, m, ref) };
};

export function exploreView(session: AppSession, site: SiteProfile): View {
  const model = new ConsoleModel();
  let cur = 'overview';
  let visible = false;
  let changedOnly = false;
  session.onEvent((e: EngineEvent) => {
    if (model.ingest(e) && visible) draw();
  });
  session.onMount(() => model.clear());

  const nav = h('nav', { class: 'xnav', 'aria-label': 'Body systems' }, ...SECTIONS.map((s) => h('a', { href: hrefOf('explore', s.id), 'data-id': s.id }, s.title)));
  const title = h('h1', { id: 'x-h' });
  const intro = h('p', { class: 'lede' });
  const place = h('div', { class: 'placeholder', hidden: true });
  const vitals = h('div', { class: 'vitals', 'aria-label': 'Vital signs' });
  const stamp = h('p', { class: 'hint num' });
  const body = h('tbody', {});
  const table = h('table', { class: 'values' },
    h('caption', { class: 'sr-only' }, 'Values'),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Value'), h('th', { scope: 'col', class: 'v' }, 'Now'), h('th', { scope: 'col' }, 'Unit'), h('th', { scope: 'col' }, 'Adult normal'), h('th', { scope: 'col', class: 'd' }, 'Change'))),
    body);
  const internals = h('details', { class: 'internals' }, h('summary', {}, 'Model internals'), h('div', { class: 'internals-body' }));
  const tools = h('div', { class: 'row' },
    button('Set the baseline now', () => ((model.setBaseline()), draw()), 'small'),
    toggle('Changed only', false, (on) => ((changedOnly = on), draw()), 'small'));

  const draw = throttle(() => {
    const s = SECTIONS.find((x) => x.id === cur) ?? (SECTIONS[0] as Section);
    setText(title, s.title);
    setText(intro, s.intro);
    place.hidden = !s.placeholder;
    setText(place, s.placeholder ?? '');
    for (const a of nav.querySelectorAll('a')) a.setAttribute('aria-current', String(a.dataset.id === s.id));
    setText(stamp, model.baseT === null ? `Sim time ${clock(model.t)}. The baseline is set at 1 minute.` : `Sim time ${clock(model.t)}. Changes are from the baseline at ${clock(model.baseT)}.`);
    if (model.baseT === null && model.t >= 60) model.setBaseline();
    const rows = model.rows().filter((r) => {
      const l = lookup(r.path);
      if (s.gloss) return !!l && s.gloss.includes(l.e.s);
      return s.groups.includes(r.group);
    });
    const clinical = rows.filter((r) => labelOf(r.path) !== null && !r.internal && typeof r.value !== 'object');
    // one row per quantity (review F1): the monitor and the truth copy of one value share a row key; two different
    // quantities never do, even when research/11 gives them similar labels
    const seen = new Set<string>();
    const once = (r: Row) => {
      const k = rowKey(r.path) ?? r.path;
      return !seen.has(k) && !!seen.add(k);
    };
    body.replaceChildren(...clinical.filter((r) => (!changedOnly || r.dir) && once(r)).map((r) => {
      const l = lookup(r.path);
      const d = displayOf(r);
      const e = l?.e;
      const label = labelOf(r.path) ?? '';
      return h('tr', r.dir ? { 'data-dir': r.dir } : {},
        h('th', { scope: 'row', class: 'l' }, h('span', { class: 'lbl' }, h('b', {}, label), e ? tip(e, label) : null)),
        h('td', { class: 'v num' }, d.value), h('td', { class: 'u' }, d.unit), h('td', { class: 'n' }, e?.normal && e.normal !== '—' ? e.normal : ''),
        h('td', { class: 'd num' }, r.dir ? d.delta : ''));
    }));
    if (!body.children.length) body.append(h('tr', {}, h('td', { colspan: 5, class: 'muted' }, model.t ? 'No values in this section yet.' : 'Waiting for the first values…')));
    const rest = rows.filter((r) => !clinical.includes(r));
    const ib = internals.querySelector('.internals-body') as HTMLElement;
    (internals.querySelector('summary') as HTMLElement).textContent = `Model internals (${rest.length} values without a clinical name)`;
    if (internals.open) ib.replaceChildren(h('table', { class: 'values dense' }, h('tbody', {}, ...rest.slice(0, 400).map((r) => h('tr', {}, h('td', { class: 'mono key' }, r.path), h('td', { class: 'v num' }, fmtValue(r.value, r.meta)), h('td', {}, r.meta.unit))))));
    // vitals strip (glossary labels; the site's gas unit)
    const v = (n: number, path: string, digits = 0, gasKpa = false) => {
      const raw = model.cur.get(path);
      const x = typeof raw === 'number' ? (gasKpa && site.gasUnit === 'kPa' ? raw / 7.50062 : raw) : null;
      const e = entry(n);
      return h('div', { class: 'vital' }, h('b', {}, shortLabel(e)), h('span', { class: 'num' }, x === null ? '--' : x.toFixed(gasKpa && site.gasUnit === 'kPa' ? 1 : digits)), h('span', { class: 'unit' }, gasKpa ? site.gasUnit : unitOf(e)));
    };
    vitals.replaceChildren(v(1, 'mon.hr'), v(7, 'mon.abpMean'), v(3, 'mon.spo2'), v(15, 'mon.etco2', 0, true), v(18, 'mon.rr'), v(19, 'mon.tempCore', 1));
  }, 500);
  internals.addEventListener('toggle', draw);

  const el = h('section', { 'aria-labelledby': 'x-h' }, h('div', { class: 'page wide' }, h('div', { class: 'xgrid' }, nav,
    h('div', { class: 'xmain' }, title, intro, vitals, place, h('div', { class: 'row between' }, stamp, tools), table, internals))));
  return {
    id: 'explore', el, bench: true,
    enter: (sub) => {
      visible = true;
      cur = SECTIONS.some((s) => s.id === sub) ? sub : 'overview';
      draw();
    },
    leave: () => (visible = false),
  };
}
```

- [ ] **Step 2: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 3: Commit and push**

```bash
git add apps/demo/src/app/views/explore.ts
git commit -m "feat(app): Explore physiology — glossary-labelled organ tables, baseline changes, mechanics slot, labs placeholder" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 18: Views: Ventilator, Validate, Developer, Settings

**Files:**
- Create: `apps/demo/src/app/views/vent.ts`
- Create: `apps/demo/src/app/views/validate.ts`
- Create: `apps/demo/src/app/views/dev.ts`
- Create: `apps/demo/src/app/views/settings.ts`

**Why:** D17 (the Stage V cockpit linked to this session's monitor, re-attached on remount), D18 (8a tools as lazy iframes; the performance check in a new tab, R50 review F13), D19 (every stage page, the tools and the evidence pages the server has), D20 (the site profile form with export and import). If Task 0 Step 3 found new pages in the old `index.html`, add them to `TOOLS` or `EVIDENCE` here.

- [ ] **Step 1: Create `apps/demo/src/app/views/vent.ts`**

```ts
// Ventilator (research/13 §4.6): the Stage V cockpit beside THIS session's monitor, linked both ways over the Stage V
// BroadcastChannel port. The cockpit keeps its own device look inside its frame (research/13 P13). It loads on first
// visit; the link re-attaches when the patient restarts (a new engine).
import { attachMonitorToLink, createBroadcastPort } from '@pme/ventilator';
import type { AppSession } from '../session.ts';
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

export function ventView(session: AppSession): View {
  const frame = h('iframe', { class: 'iframe vent', title: 'Ventilator' });
  const el = h('section', { 'aria-label': 'Ventilator' }, frame);
  let started = false;
  return {
    id: 'vent', el,
    enter: () => {
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      const port = createBroadcastPort(link);
      let detach: () => void = () => {};
      session.onMount((m) => {
        detach();
        detach = attachMonitorToLink(m, port, (c, r) => console.warn('vent link rejected', c.type, r));
      });
      // as the Stage V link page does: once the cockpit has loaded, send it an empty patch (its first control message)
      // and this session's speed
      frame.onload = () => {
        port.post({ v: 1, kind: 'control', patch: {} });
        port.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
      };
      frame.src = `./vent-hamilton.html?link=${link}&profile=normal`;
    },
  };
}
```

- [ ] **Step 2: Create `apps/demo/src/app/views/validate.ts`**

```ts
// Validate (research/13 §4.7): the three Stage 8a tools as tabs in the bench theme. They are internal pages with their
// own engines, so they load only when their tab opens. The performance check measures ONE monitor alone by design, so
// it opens in a new tab rather than in a frame next to this session's running monitor (R50 review F13).
import { h, tabs } from '../ui.ts';
import type { View } from '../shell.ts';

const PAGES: ReadonlyArray<[string, string, string, string]> = [
  ['bedside', 'Bedside checklist', 'validation-bedside.html', 'Compare the simulator with a real Saadat monitor, item by item.'],
  ['review', 'Blind review', 'validation-review.html', 'Rate recorded strips without knowing which is real.'],
  ['perf', 'Performance', 'validation-perf.html', 'An eight-lane monitor with frame-time statistics (this page runs its own patient).'],
];

export function validateView(): View {
  let t: ReturnType<typeof tabs> | null = null;
  const el = h('section', { 'aria-labelledby': 'val-h' });
  return {
    id: 'validate', el, bench: true,
    enter: (sub) => {
      if (!t) {
        t = tabs('Validation tools', PAGES.map(([id, label, src, hint]) => ({
          id, label, render: () => id === 'perf'
            ? h('div', { class: 'framed' }, h('p', { class: 'hint' }, hint),
              h('p', {}, 'It measures one monitor on its own, so it runs in a separate tab while this session keeps its patient.'),
              h('a', { class: 'btn primary', href: `./${src}`, target: '_blank', rel: 'noopener' }, 'Open the performance check in a new tab'))
            : h('div', { class: 'framed' }, h('p', { class: 'hint' }, hint), h('iframe', { class: 'iframe', title: label, src: `./${src}` })),
        })), 'bedside', (id) => history.replaceState(null, '', `#/validate/${id}`));
        el.append(h('div', { class: 'page wide' }, h('h1', { id: 'val-h' }, 'Validate'), t.el));
      }
      if (sub) t.select(sub);
    },
  };
}
```

- [ ] **Step 3: Create `apps/demo/src/app/views/dev.ts`**

```ts
// Developer (research/13 §4.5, brief Q3): the only place the build-stage pages, the physiology console with its engine
// keys and the evidence pages are listed. Each opens in a new tab so this session keeps running. Pages that a later
// merge adds (evidence pages) are listed when the server has them.
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

type Page = [file: string, title: string, note: string];
const TOOLS: Page[] = [
  ['physiology-console.html', 'Physiology console', 'Every model value by organ, with engine keys, baseline diff and raw commands'],
  ['stage4b-device.html', 'Device layer', 'Alarms, defibrillator, pacer, 12-lead, trends'],
  ['stage4a-skins.html', 'Skin preview', 'Every monitor skin and theme, alarm sound profiles'],
  ['stage5.html', 'Rhythm library', 'All rhythms on ECG paper, with modifiers'],
  ['stage6a.html', 'Host monitor with the drawer', 'The first instructor drawer and its remote and viewer'],
  ['stage6a-remote.html', 'Remote controller (first version)', ''],
  ['stage6a-viewer.html', 'Second-screen viewer', ''],
  ['stage6b-acls.html?scenario=acls-vf-witnessed', 'Scenario runner', 'The ACLS VF case with learner buttons'],
  ['vent-link.html', 'Ventilator and monitor link', 'With the ventilator demonstrations'],
];
const STAGES: Page[] = [
  ['stage0.html', 'Sweep cursor', 'stage 0'], ['stage1.html', 'ECG rhythm engine', 'stage 1'], ['stage2.html', 'Haemodynamics', 'stage 2'],
  ['stage3.html', 'Respiration, gas and temperature', 'stage 3'], ['stage7a.html', 'Circulation', 'stage 7a'], ['stage7b.html', 'Lungs', 'stage 7b'],
  ['stage7c.html', 'Blood and acid–base', 'stage 7c'], ['stage7d.html', 'Brain, kidney, liver', 'stage 7d'], ['stage7e.html', 'Endocrine and temperature', 'stage 7e'],
  ['stage7f.html', 'Depth and neuromuscular block', 'stage 7f'], ['stage7g.html', 'Drug PK/PD', 'stage 7g'],
];
const EVIDENCE: Page[] = [['fu4.html', 'Integration evidence', 'FU-4'], ['fu6.html', 'Respiratory integration evidence', 'FU-6'], ['fu7.html', 'Drug layer evidence', 'FU-7']];

const list = (pages: Page[]) => h('ul', { class: 'devlist' }, ...pages.map(([f, t, n]) => h('li', { 'data-file': f }, h('a', { href: `./${f}`, target: '_blank', rel: 'noopener' }, t), n ? h('span', { class: 'muted' }, ` ${n}`) : null)));

export function devView(): View {
  const ev = list(EVIDENCE);
  let checked = false;
  const el = h('section', { 'aria-labelledby': 'dev-h' }, h('div', { class: 'page' },
    h('h1', { id: 'dev-h' }, 'Developer'),
    h('p', { class: 'lede' }, 'Tools for building and checking the model. Pages open in a new tab, so the session here keeps running.'),
    h('h2', {}, 'Tools'), list(TOOLS),
    h('h2', {}, 'Build-stage pages'), list(STAGES),
    h('h2', {}, 'Evidence pages'), ev,
    h('h2', {}, 'Audits'), h('p', {}, 'The physiology audits run from the command line and write their reports to docs/gates: ', h('code', {}, 'pnpm run audit:physiology'), '.'),
  ));
  return {
    id: 'dev', el, bench: true,
    enter: () => {
      if (checked) return;
      checked = true;
      for (const li of ev.querySelectorAll<HTMLElement>('li')) {
        void fetch(`./${li.dataset.file}`, { method: 'HEAD' }).then((r) => (li.hidden = !r.ok || !(r.headers.get('content-type') ?? '').includes('html')), () => (li.hidden = true));
      }
    },
  };
}
```

- [ ] **Step 4: Create `apps/demo/src/app/views/settings.ts`**

```ts
// Settings (research/13 §4.8, P11): the room's site profile — monitor, screen, frame rate, where the instructor works,
// gas units, sensors-off start — exportable as one file for the next room, plus the shortcut sheet.
import { shortcutsDialog } from '../commands.ts';
import type { AppSession } from '../session.ts';
import { applySkinAlarmColours } from '../shell.ts';
import { setDrugNames } from '../glossary.ts';
import { DRUG_NAME_SETS, MONITORS, parseSite, saveSite, THEMES, type SiteProfile } from '../site.ts';
import { button, download, h, seg, select, toast } from '../ui.ts';
import type { View } from '../shell.ts';

export function settingsView(site: SiteProfile, session: AppSession | null): View {
  const save = (msg = 'Saved for this browser') => {
    saveSite(site);
    toast(msg);
  };
  const skin = () => {
    if (session) void session.setSkin(site.skin, site.theme); // the session applies the alarm colours (review F5)
    else applySkinAlarmColours(site.skin, site.theme);
    document.documentElement.dataset.theme = site.theme === 'projector-light' ? 'bench' : '';
  };
  const mon = select('Monitor', MONITORS.map((m) => [m.id, m.label]), site.skin, (v) => ((site.skin = v), skin(), save()));
  const theme = select('Screen', THEMES.map(([id, l]) => [id, l]), site.theme, (v) => ((site.theme = v as SiteProfile['theme']), skin(), save()));
  const fps = seg<string>('Frame rate', [['60', '60 per second'], ['30', '30 per second (projectors, tablets on battery)']], String(site.fps), (v) => {
    site.fps = v === '30' ? 30 : 60;
    session?.monitor?.setFps(site.fps);
    save();
  });
  const panel = seg<SiteProfile['panel']>('Instructor panel on wide screens', [['split', 'Beside the monitor'], ['drawer', 'Over the monitor (drawer)']], site.panel, (v) => ((site.panel = v), save()));
  const gas = seg<SiteProfile['gasUnit']>('Gas pressures in tables', [['mmHg', 'mmHg'], ['kPa', 'kPa']], site.gasUnit, (v) => ((site.gasUnit = v), save()));
  const names = seg<SiteProfile['drugNames']>('Drug names', [...DRUG_NAME_SETS], site.drugNames, (v) => {
    site.drugNames = v;
    setDrugNames(v);
    save('Saved: drug names change as each screen redraws');
  });
  const sensors = h('input', { type: 'checkbox', id: 'set-sensors', onchange: () => ((site.sensorsOff = sensors.checked), save()) });
  sensors.checked = site.sensorsOff;
  const file = h('input', { type: 'file', accept: 'application/json', class: 'sr-only', id: 'set-import', onchange: async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      Object.assign(site, parseSite(JSON.parse(await f.text())));
      setDrugNames(site.drugNames);
      save('Site profile imported');
      skin();
    } catch {
      toast('That file is not a site profile');
    }
  } });
  const el = h('section', { 'aria-labelledby': 'set-h' }, h('div', { class: 'page narrow' },
    h('h1', { id: 'set-h' }, 'Settings'),
    h('p', { class: 'lede' }, 'These settings belong to this room and this browser. A scenario never changes them.'),
    h('h2', {}, 'Monitor'), h('div', { class: 'grid2' }, mon.el, theme.el),
    h('h2', {}, 'Display'), field('Frame rate', fps), field('Instructor panel on wide screens', panel), field('Gas pressures in tables', gas), field('Drug names', names),
    h('h2', {}, 'New patients'), h('label', { class: 'check', for: 'set-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)'),
    h('h2', {}, 'Language'), h('p', {}, 'English. The monitor labels follow the clinical glossary; other languages can be added later.'),
    h('h2', {}, 'Site profile'),
    h('div', { class: 'actions' },
      button('Export site profile', () => download('site-profile.json', JSON.stringify(site, null, 2), 'application/json')),
      h('label', { class: 'btn', for: 'set-import' }, 'Import site profile'), file,
      button('Keyboard shortcuts', () => void shortcutsDialog(), 'ghost')),
  ));
  return { id: 'settings', el, bench: true };
}

const field = (label: string, control: HTMLElement) => h('div', { class: 'field' }, h('span', {}, label), control);
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
```

Expected: typecheck clean.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/views/vent.ts apps/demo/src/app/views/validate.ts apps/demo/src/app/views/dev.ts apps/demo/src/app/views/settings.ts
git commit -m "feat(app): Ventilator, Validate, Developer and Settings views" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 19: Wire-up: the app entry, `index.html` becomes the app (E-S9-1), the 6a drawer loses its blur (E-S9-3)

**Files:**
- Create: `apps/demo/src/app/main.ts`
- Modify: `apps/demo/index.html` (the whole file)
- Modify: `packages/controller/src/panel/styles.ts` (opaque drawer, no backdrop blur)

**Why:** Everything meets in `main.ts`: the site profile, the session (or a Remote when the document opens at `#/remote`), the views, the top-right alarm count / sound / remote code, the reveal gestures, the `?scenario=` deep link, and the `__pmeApp` e2e hook (frames for the gate, the engine ids for the glossary test). **E-S9-1 and E-S9-3 need the orchestrator's approval.**

- [ ] **Step 1: Create `apps/demo/src/app/main.ts`**

```ts
// The app (research/13 brief §4–§5): one document, one engine session for every view. A document opened at
// #/remote is a Remote instead: it pairs to a monitor on another device and never starts an engine.
import './app.css';
import { attachReveal, RevealGesture } from '@pme/controller';
import { DRUG_IDS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { alarmLine } from './alarms.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { hrefOf, parseRoute } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar } from './shell.ts';
import { loadSite } from './site.ts';
import { button, h, setText, throttle, toast } from './ui.ts';
import { devView } from './views/dev.ts';
import { exploreView } from './views/explore.ts';
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { startView } from './views/start.ts';
import { teachView } from './views/teach.ts';
import { validateView } from './views/validate.ts';
import { ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // one set of drug names on every screen (orchestrator ruling 5)
const q = new URLSearchParams(location.search);
const hostless = parseRoute(location.hash).id === 'remote';
const shell = new Shell(document.getElementById('app') as HTMLElement, { hostless });
if (site.theme === 'projector-light') document.documentElement.dataset.theme = 'bench';

// Frame intervals for the Stage 8a gate with the whole shell mounted (docs/gates/stage-8a.md measures the same thing).
const frames: number[] = [];
let lastFrame = performance.now();
const onFrame = (t: number) => {
  frames.push(t - lastFrame);
  lastFrame = t;
  if (frames.length > 100_000) frames.splice(0, 50_000);
  requestAnimationFrame(onFrame);
};
requestAnimationFrame(onFrame);

if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else {
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null });
  if (site.fps === 30) session.monitor?.setFps(30);
  applySkinAlarmColours(site.skin, site.theme);
  const link = new Link(session.panel, session.panelTransport, session);

  const loadScenario = (c: ScenarioCard): boolean => {
    const r = session.loadScenario(c.doc);
    if (!r.ok) {
      toast(`The scenario could not load: ${c.title}`);
      return false;
    }
    link.note(`Scenario loaded: ${c.title}`, 'scenario');
    session.setLearner(SCENARIO_META[c.id]?.learnerControls ?? false); // off unless the case asks (ruling 4)
    return true;
  };
  const weightKg = () => session.spec.weightKg;

  shell.add(startView({ session, site, loadScenario }));
  shell.add(monitorView(shell.stage, { session, link }));
  const teach = teachView(link, { site, main: shell.main, stage: shell.stage, weightKg, loadScenario });
  shell.add(teach);
  shell.add(remoteView({ site, hostless: false, bar: shell.bar, code: session.code }));
  shell.add(exploreView(session, site));
  shell.add(ventView(session));
  shell.add(validateView());
  shell.add(devView());
  shell.add(settingsView(site, session));
  mountSessionBar(shell.bar, link);

  // top-right: alarm count in the skin's colours (steady), sound, remote code
  const alarm = h('button', { type: 'button', class: 'alarm-count', 'data-vendor-title': '', onclick: () => ((location.hash = hrefOf('teach')), teach.panel.select('devices')) });
  const sound = button('Sound off', () => void session.enableSound().then(() => ((sound.textContent = 'Sound on'), sound.setAttribute('aria-pressed', 'true'))), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  const code = h('a', { class: 'code-pill', href: hrefOf('remote'), 'aria-label': `Remote pairing code ${session.code.split('').join(' ')}` }, h('span', { class: 'muted' }, 'Remote '), session.code);
  shell.right.append(alarm, sound, code);
  const drawAlarm = throttle(() => {
    const s = link.alarmSummary;
    alarm.dataset.level = s.level ? LEVEL_NAME[s.level] : 'none';
    setText(alarm, s.level && s.top ? `${LEVEL_MARK[s.level]} ${alarmLine(s.top).text}${s.n > 1 ? ` +${s.n - 1}` : ''}` : link.alarms?.allOff ? 'Alarms off' : 'No alarms');
    if (s.top) alarm.title = `On the monitor: ${s.top.text}`; // the vendor's words, outside the glossary scan (review F4)
    else alarm.removeAttribute('title');
    alarm.setAttribute('aria-label', s.level ? `${s.n} active alarm${s.n > 1 ? 's' : ''}, highest ${LEVEL_NAME[s.level]} priority: show alarms` : 'No active alarms: show alarms');
  }, 500);
  link.onChange(drawAlarm);
  drawAlarm();

  // learner monitor ↔ instructor view: the Stage 6a reveal gestures
  attachReveal(window, new RevealGesture(() => {
    const r = shell.route.id;
    if (r === 'monitor') location.hash = hrefOf('teach');
    else if (r === 'teach') location.hash = hrefOf('monitor');
  }));
  shell.onRoute((r) => {
    if (r.id === 'teach' || r.id === 'monitor') session.live = true;
  });

  const deep = q.get('scenario');
  const card = deep ? scenarioById(deep) : undefined;
  if (card && loadScenario(card)) {
    session.live = true;
    if (!location.hash) location.hash = hrefOf('teach');
  }
  shell.start();
  // e2e hook: the engine ids the glossary test must never find in a clinical view
  const engineIds = [...RHYTHM_IDS, ...DRUG_IDS, ...LUNG_CONDITIONS.map((c) => c.id)];
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach, engineIds, skinAlarmBar } });
}
```

- [ ] **Step 2: Edit `apps/demo/index.html`** — the whole file. Find (matches exactly once on `origin/main` `776ebb5`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Patient-monitor engine demos</title>
    <style>
      body { background: #000; color: #ddd; font: 16px system-ui, sans-serif; margin: 2rem; }
      a { color: #4f4; }
    </style>
  </head>
  <body>
    <h1>Patient-monitor engine demos</h1>
    <ul>
      <li><a href="./stage0.html">Stage 0: sim-time sweep cursor</a></li>
      <li><a href="./stage1.html">Stage 1: ECG rhythm engine, sweep and beep</a></li>
      <li><a href="./stage2.html">Stage 2: haemodynamics (ABP, pleth, CVP, NIBP)</a></li>
      <li><a href="./stage3.html">Stage 3: respiratory, gas and temperature (CO2, SpO2 lag, RR, temp)</a></li>
      <li><a href="./stage7c.html">Stage 7c: blood, acid–base, electrolytes, O2 delivery (labs, ABG)</a></li>
      <li><a href="./stage7b.html">Stage 7b: the lungs (two lungs, mixing point, 32-condition catalogue)</a></li>
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
      <li><a href="./stage7a.html">Stage 7a: circulation — elastance heart, PV loop, drugs, IABP/LVAD</a></li>
      <li><a href="./stage7g.html">Stage 7g: drug PK/PD — TCI, vasoactives, volatiles, adenosine, LAST, reversal</a></li>
      <li><a href="./stage7f.html">Stage 7f: neuromuscular block, TOF, anaesthetic depth, drive depression</a></li>
      <li><a href="./stage7e.html">Stage 7e: endocrine, glucose, thermoregulation — MH, hypothermia, sepsis, hypoglycaemia</a></li>
      <li><a href="./physiology-console.html">Stage 7x: physiology console — every truth value by organ, with the monitor and an actions rail</a></li>
      <li><a href="./stage4b-device.html">Stage 4b: device layer (alarms, defibrillator, pacer, 12-lead, trends)</a></li>
      <li><a href="./stage6a.html">Stage 6a: host monitor + hidden instructor panel</a> ·
        <a href="./stage6a-remote.html">remote controller</a> · <a href="./stage6a-viewer.html">viewer</a></li>
      <li><a href="./stage6b-acls.html?scenario=acls-vf-witnessed">Stage 6b: scenario runner — ACLS (VF)</a></li>
      <li><a href="./vent-link.html">Stage V: ventilator ↔ monitor link</a> · <a href="./vent-hamilton.html">ventilator alone</a></li>
    </ul>
  </body>
</html>
```

replace with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark light" />
    <title>Patient monitor simulator</title>
  </head>
  <body>
    <div id="app"></div>
    <noscript>The patient monitor simulator needs JavaScript.</noscript>
    <script type="module" src="./src/app/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Edit `packages/controller/src/panel/styles.ts`** — opaque drawer, no backdrop blur. Find (matches exactly once on `origin/main` `776ebb5`):

```ts
.pme-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#111c;color:#ddd;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-left:1px solid #333;z-index:2147483000;
```

replace with:

```ts
.pme-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#111;color:#ddd;
  border-left:1px solid #333;z-index:2147483000;
```

- [ ] **Step 4: Look at it** — `(cd apps/demo && npx vite --port 4861 --strictPort > <scratchpad>/stage-9-clinical-ui/vite.log 2>&1 &)`,
  open `http://localhost:4861/` in system Chrome, walk Start → Open the instructor view → each tab → Monitor (`i` back)
  → Explore → Ventilator → Settings; no console error. `pkill -f "vite --port 4861"`.
- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json && npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run && npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run && npx -y pnpm@9.15.9 --filter @pme/demo exec vite build > <scratchpad>/stage-9-clinical-ui/build.log 2>&1; tail -3 <scratchpad>/stage-9-clinical-ui/build.log
```

Expected: typecheck clean; demo unit tests all green (prototype: 18 files, 173 tests); controller green; the build writes `dist/index.html` with the app.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/src/app/main.ts apps/demo/index.html packages/controller/src/panel/styles.ts
git commit -m "feat(app): the app entry — index.html is now the clinical UI; the 6a drawer is opaque (Stage 9 E-S9-1, E-S9-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 20: Fonts — ONLY if Ali approves Q7 (IBM Plex Sans/Mono and B612, SIL OFL 1.1)

**Files (only on approval):** Create `apps/demo/public/fonts/{IBMPlexSans-Regular,IBMPlexSans-Medium,IBMPlexSans-SemiBold,IBMPlexMono-Regular,B612-Regular,B612-Bold}.woff2`
(Latin subset, ≈ 180 KB total), `LICENSES/OFL-1.1.txt`; Modify `NOTICES.md` (one row per family: name, version,
licence OFL-1.1, source URL, "font asset, unmodified"), `apps/demo/src/app/app.css` (`@font-face` block with
`font-display: swap`, then `--font-ui: 'IBM Plex Sans', system-ui, …`, `--font-num: 'B612', var(--font-ui)`,
`--font-mono: 'IBM Plex Mono', ui-monospace, …`).

**Why:** research/13-ui-design-references §4: OFL is not in DESIGN-BRIEF §8's MIT/Apache list; bundling needs Ali's
ruling, a NOTICES row and the licence text. Without the ruling this task is skipped and the system stack ships (D6).

- [ ] **Step 1: Check the ruling** in `research/00-orchestrator-rulings.md` (search "Q7" / "OFL"). No approval → tick
  this task as *skipped (no Q7 approval)* and go to Task 21.
- [ ] **Step 2 (approved only): Fetch** the WOFF2 files from the projects' GitHub releases (IBM/plex, polarsys/b612),
  subset to Latin with the release's own `-latin` files where provided, record sizes and SHA-256 in NOTICES.
- [ ] **Step 3 (approved only): Run** `npx -y pnpm@9.15.9 check-notices` (expected `check-notices: OK`) and
  `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/tokens.test.ts` (unchanged).
- [ ] **Step 4 (approved only): Commit and push** (`feat(app): IBM Plex and B612 fonts (SIL OFL 1.1, Ali's ruling Q7)`
  with the trailer).

---

### Task 21: e2e: one session across views, the deep link, a paired remote; the glossary check

**Files:**
- Create: `apps/demo/e2e/stage9-support.ts`
- Create: `apps/demo/e2e/stage9-app.e2e.ts`
- Create: `apps/demo/e2e/stage9-glossary.e2e.ts`

**Why:** Brief §11.3 (glossary lint on the rendered DOM) and the one-session guarantee of D2. The remote test reads the engine's own state (`control.hr === 'pinned'`) before it reads the session-bar badge, and gives the badge 10 s: the badge redraws at ≤ 2 Hz on a page that was in the background, and reading it first raced under two workers (R50 review F7). No retries are added; Task 25 runs this file three times under two workers. `stage9-support.ts` holds the shared server start, helpers and the in-page audits used by Tasks 21–24.

- [ ] **Step 1: Create `apps/demo/e2e/stage9-support.ts`**

```ts
// Stage 9 e2e support (not a test file: testMatch is *.e2e.ts): the Vite server, the app hook, route helpers and the
// in-page audits (engine-id scan, accessibility checks) shared by the stage9-*.e2e.ts files.
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

export async function startVite(): Promise<{ vite: ViteDevServer; base: string }> {
  const vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  return { vite, base: `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}` };
}

/** Open the app, optionally with a site profile, and wait for the session and real warm-up time (brief §11.1). */
export async function openApp(page: Page, base: string, hash = '#/', o: { site?: Record<string, unknown>; warmMs?: number } = {}): Promise<void> {
  if (o.site) await page.addInitScript((s) => localStorage.setItem('pme.site', JSON.stringify(s)), o.site);
  await page.goto(`${base}/${hash}`);
  await page.waitForFunction(() => '__pmeApp' in window);
  if (o.warmMs) await page.waitForTimeout(o.warmMs);
}

export async function go(page: Page, hash: string, settleMs = 700): Promise<void> {
  await page.evaluate((h) => (location.hash = h), hash);
  await page.waitForTimeout(settleMs);
}

export async function tab(page: Page, id: string): Promise<void> {
  await page.click(`[role=tab][data-tab=${id}]`);
  await page.waitForTimeout(600);
}

export const TABS = ['scenario', 'vitals', 'drugs', 'airway', 'defib', 'devices', 'patient', 'log'] as const;
export const EXPLORE = ['overview', 'haemodynamics', 'respiratory', 'gas', 'blood', 'brain', 'kidney', 'liver', 'endocrine', 'neuro', 'drugs', 'labs'] as const;

/**
 * Engine ids in the visible text, aria-labels and titles of the clinical views (research/11 §5.16 rule 1). Exempt by
 * design: the monitor's interior (`.stage`: skin data, FU-5), iframes (the Stage V and 8a pages keep their own
 * device labels), Explore's collapsed "Model internals", `code` and the Developer view.
 */
export function scanEngineIds(page: Page, extraIds: readonly string[]): Promise<string[]> {
  return page.evaluate((ids) => {
    const idSet = new Set(ids);
    const leak = /\b(?!(?:mmHg|cmH|pH|mEq|kPa|iCa|mOsm|eGFR|mL|dL|mA|sO|awRR)\b)[a-z]+[A-Z][A-Za-z0-9]*\b|\b(?!a\.u\b)[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9.]*\b|\bStage \d|\bR\d{2}\b/;
    const skip = (el: Element | null): boolean => !!el?.closest('.stage, iframe, .internals, code, [data-view="dev"], [hidden], dialog:not([open])');
    const hits: string[] = [];
    const check = (s: string, where: string) => {
      const m = leak.exec(s);
      if (m) hits.push(`${where}: "${m[0]}" in "${s.slice(0, 80)}"`);
      for (const w of s.split(/[^A-Za-z0-9.]+/)) if (idSet.has(w)) hits.push(`${where}: id "${w}" in "${s.slice(0, 80)}"`);
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const t = n.textContent?.trim() ?? '';
      if (!t || skip(el) || !el || el.closest('script, style')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && !el.closest('.sr-only')) continue;
      check(t, el.tagName.toLowerCase());
    }
    for (const el of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
      if (skip(el)) continue;
      for (const a of ['aria-label', 'title', 'placeholder']) {
        if (a === 'title' && el.hasAttribute('data-vendor-title')) continue; // quotes the monitor's own text (review F4)
        const v = el.getAttribute(a);
        if (v) check(v, `${el.tagName.toLowerCase()}[${a}]`);
      }
    }
    return [...new Set(hits)];
  }, extraIds);
}

export interface A11yFinding {
  rule: string;
  what: string;
}

/**
 * WCAG 2.2 AA checks that need no dependency (axe is Ali's question Q8): target size (2.5.8, 24 px; 44 px in the
 * instructor panel on a touch screen), accessible names (1.3.1/4.1.2), text contrast (1.4.3) from the rendered
 * colours, horizontal scroll (1.4.10) and clipped labels (brief §11.2), one h1 per view and a main landmark.
 */
export function audit(page: Page, o: { touchPanel: boolean }): Promise<A11yFinding[]> {
  return page.evaluate(({ touchPanel }) => {
    const out: Array<{ rule: string; what: string }> = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden], .stage canvas, iframe, dialog:not([open])') && r.bottom > 0 && r.right > 0 && r.top < innerHeight * 3;
    };
    const name = (el: Element) => {
      const t = el.getAttribute('aria-label') ?? '';
      if (t.trim()) return t;
      const by = el.getAttribute('aria-labelledby');
      if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l?.textContent?.trim()) return l.textContent;
      }
      const wrap = el.closest('label');
      if (wrap?.textContent?.trim()) return wrap.textContent;
      if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit')) return el.value;
      return ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName) || el.getAttribute('role') === 'tab' ? el.textContent ?? '' : '';
    };
    const ctl = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=tab], [role=radio]';
    for (const el of document.querySelectorAll(ctl)) {
      if (!visible(el) || el.closest('.stage') || el.classList.contains('sr-only')) continue;
      // a checkbox or radio is hit through its whole label (WCAG 2.5.8 counts the label as the target)
      const box = el.matches('input[type=checkbox], input[type=radio]') ? el.closest('label') ?? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) ?? el : el;
      const r = box.getBoundingClientRect();
      const inline = el.tagName === 'A' && !!el.closest('p, li') && !el.classList.contains('btn');
      const min = touchPanel && el.closest('.panel, .sessionbar') && !el.classList.contains('tip') ? 44 : 24;
      if (!inline && (r.width < min - 0.5 || r.height < min - 0.5)) out.push({ rule: 'target', what: `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)} < ${min}` });
      if (!name(el).trim() && el.getAttribute('type') !== 'file') out.push({ rule: 'name', what: `${el.tagName.toLowerCase()}#${el.id} has no accessible name` });
      if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab') && el.scrollWidth > el.clientWidth + 1) out.push({ rule: 'clipped', what: `"${el.textContent?.trim().slice(0, 30)}" clipped` });
    }
    // contrast: every visible text node against the first opaque background behind it
    const rgb = (s: string): [number, number, number, number] => {
      const m = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
      return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r ?? 0) + 0.7152 * f(g ?? 0) + 0.0722 * f(b ?? 0);
    };
    const bgOf = (el: Element | null): number[] => {
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c[3] > 0.95) return c;
      }
      return [255, 255, 255, 1];
    };
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim() || !visible(el) || el.closest('.stage, .sr-only, [disabled], option, .qr')) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      const fg = rgb(cs.color);
      const bg = bgOf(el);
      const a = fg[3];
      const mix = [0, 1, 2].map((i) => (fg[i] ?? 0) * a + (bg[i] ?? 0) * (1 - a));
      const [x, y] = [lum(mix), lum(bg)].sort((p, q) => q - p) as [number, number];
      const ratio = (x + 0.05) / (y + 0.05);
      const size = Number.parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      const disabledBtn = el.closest('button:disabled');
      if (ratio < need - 0.01 && !disabledBtn) out.push({ rule: 'contrast', what: `"${n.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}:1 < ${need}` });
    }
    const vis = [...document.querySelectorAll('.view:not([hidden])')];
    const h1s = [...document.querySelectorAll('h1')].filter((h) => !h.closest('[hidden]'));
    if (h1s.length !== 1) out.push({ rule: 'h1', what: `${h1s.length} h1 visible` });
    if (!document.querySelector('main')) out.push({ rule: 'landmark', what: 'no main' });
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push({ rule: 'reflow', what: `page scrolls sideways (${document.documentElement.scrollWidth} > ${innerWidth})` });
    for (const v of vis) if (v.scrollWidth > v.clientWidth + 1) out.push({ rule: 'reflow', what: `view ${(v as HTMLElement).dataset.view} scrolls sideways` });
    return out;
  }, o);
}

/** Tab through the first `n` focusable elements; every one must show a focus indicator (2.4.7). */
export async function focusWalk(page: Page, n = 25): Promise<string[]> {
  const bad: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el.closest('iframe, .stage')) return null;
      const cs = getComputedStyle(el);
      const shown = (cs.outlineStyle !== 'none' && Number.parseFloat(cs.outlineWidth) >= 1) || cs.boxShadow !== 'none';
      return shown ? null : `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    });
    if (r) bad.push(r);
  }
  return bad;
}
```

- [ ] **Step 2: Create `apps/demo/e2e/stage9-app.e2e.ts`**

```ts
// Stage 9: one document, one engine session. Switching views never restarts the engine (sim time keeps rising, the
// monitor host element is the same node), the scenario deep link still works, and a Remote in another page of the same
// browser pairs by code and moves the host's patient.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { go, openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type App = { __pmeApp: { session: { code: string; simNow(): number; monitor: unknown }; link: { ctl: { state: { values: Record<string, number>; control: Record<string, string> } | null } }; shell: { monitorHost: HTMLElement } } };

test('every view shares the one engine session', async ({ page }) => {
  await openApp(page, base, '#/teach', { warmMs: 3000 });
  await page.evaluate(() => ((window as unknown as { __host: unknown }).__host = (window as unknown as App).__pmeApp.shell.monitorHost.firstElementChild));
  const t0 = await page.evaluate(() => (window as unknown as App).__pmeApp.session.simNow());
  for (const r of ['#/explore/haemodynamics', '#/settings', '#/dev', '#/monitor', '#/', '#/teach']) await go(page, r, 500);
  const same = await page.evaluate(() => (window as unknown as { __host: unknown }).__host === (window as unknown as App).__pmeApp.shell.monitorHost.firstElementChild);
  const t1 = await page.evaluate(() => (window as unknown as App).__pmeApp.session.simNow());
  expect(same, 'the monitor was not remounted').toBe(true);
  expect(t1 - t0).toBeGreaterThan(2.5);
});

test('the scenario deep link loads the case into the instructor view', async ({ page }) => {
  await openApp(page, base, '?scenario=acls-vf-witnessed');
  await expect(page).toHaveURL(/#\/teach$/);
  await expect(page.locator('.sessionbar .scen')).toContainText('Witnessed VF in PACU', { timeout: 10_000 });
});

test('changing the monitor on Start updates the mirrored alarm colours (review F5)', async ({ page }) => {
  await openApp(page, base, '#/');
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--alarm-high-bg').trim().toUpperCase());
  const skinBg = (id: string) => page.evaluate((s) => (window as unknown as { __pmeApp: { skinAlarmBar(id: string): { L1: { bg: string } } } }).__pmeApp.skinAlarmBar(s).L1.bg.toUpperCase(), id);
  const [saadat, mindray] = [await skinBg('saadat-like'), await skinBg('mindray-like')];
  expect(saadat).not.toBe(mindray); // the two skins' high-priority reds differ, so the check can fail
  expect(await bg()).toBe(saadat);
  await page.locator('[data-view="start"]').getByRole('combobox', { name: 'Monitor', exact: true }).selectOption('mindray-like');
  await expect.poll(bg).toBe(mindray);
});

test('learner controls: off by default, switched on per scenario, logged as learner actions (ruling 4)', async ({ page }) => {
  await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 1500 });
  await go(page, '#/monitor');
  await expect(page.locator('.learner-strip')).toBeHidden();
  await go(page, '#/teach');
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Learner controls on the monitor' }).click();
  await go(page, '#/monitor');
  await expect(page.locator('.learner-strip')).toBeVisible();
  await page.locator('.learner-strip').getByRole('button', { name: 'Charge 200 J' }).click();
  await go(page, '#/teach');
  await page.click('[role=tab][data-tab=log]');
  await expect(page.locator('.log li[data-kind=learner]')).toContainText('Defibrillator charging to 200 J');
});

test('a remote pairs by code and changes the host patient', async ({ page, context }) => {
  await openApp(page, base, '#/', { warmMs: 2000 });
  await go(page, '#/remote');
  const code = await page.evaluate(() => (window as unknown as App).__pmeApp.session.code);
  await expect(page.locator('.bigcode')).toHaveText(code);
  // version 1.0: same browser only; no relay → no QR code, and the page says so (review F2, ruling 6)
  await expect(page.locator('.qr')).toHaveCount(0);
  await expect(page.locator('.pair-note')).toContainText('this browser only');
  const remote = await context.newPage();
  await remote.goto(`${base}/#/remote?code=${code}`);
  await expect(remote.locator('.status-pill')).toHaveText(`Connected to ${code}`, { timeout: 10_000 });
  await remote.click('[role=tab][data-tab=vitals]');
  await remote.locator('[data-var=hr] input').fill('112');
  await remote.locator('[data-var=hr] input').dispatchEvent('change');
  await remote.locator('[data-var=hr] button', { hasText: 'Set' }).click();
  await remote.click('.stagebar button.primary');
  await expect.poll(() => page.evaluate(() => (window as unknown as App).__pmeApp.link.ctl.state?.values.hr ?? 0), { timeout: 20_000 }).toBeGreaterThan(105);
  // the engine's own state says HR is held before the badge is read (R50 review F7: the badge redraws at ≤ 2 Hz on a
  // page that was in the background, so reading it first raced under two workers)
  await expect.poll(() => page.evaluate(() => (window as unknown as App).__pmeApp.link.ctl.state?.control.hr ?? ''), { timeout: 10_000 }).toBe('pinned');
  await page.bringToFront(); // a background tab draws no frames, so its session bar waits until it is visible
  await go(page, '#/teach');
  await expect(page.locator('.sessionbar .mode-badge')).toContainText('1 held', { timeout: 10_000 });
});
```

- [ ] **Step 3: Create `apps/demo/e2e/stage9-glossary.e2e.ts`**

```ts
// R56: every visible string in a clinical view comes from the glossary or the copy pass. This walks every view, every
// instructor tab, every Explore section and a Remote document (its join form and every tab) and fails on any raw
// engine id in the text, aria-labels, titles or placeholders (the monitor interior, iframes, Explore's collapsed
// "Model internals", Developer and titles that quote the monitor's own alarm text are exempt).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { EXPLORE, go, openApp, scanEngineIds, startVite, TABS, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const STATE_VARS = ['hr', 'sbp', 'dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'spo2', 'etco2', 'fio2', 'tempCore', 'volumeStatus', 'paceThresholdMa', 'svr', 'qtc'];

test('no engine id reaches a clinical view', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 4000 });
  // camelCase or digit-bearing ids only: a lowercase drug id is also the drug's English name ("propofol")
  const engineIds = await page.evaluate(() => (window as unknown as { __pmeApp: { engineIds: string[] } }).__pmeApp.engineIds);
  const IDS = [...STATE_VARS, ...engineIds].filter((id) => /[A-Z0-9]/.test(id) || STATE_VARS.includes(id));
  const hits: string[] = [];
  const scan = async (where: string) => hits.push(...(await scanEngineIds(page, IDS)).map((h) => `${where} → ${h}`));
  for (const t of TABS) {
    await tab(page, t);
    await scan(`#/teach ${t}`);
  }
  for (const s of EXPLORE) {
    await go(page, `#/explore/${s}`, 900);
    await scan(`#/explore/${s}`);
  }
  for (const r of ['#/', '#/monitor', '#/remote', '#/settings', '#/validate', '#/vent']) {
    await go(page, r);
    await scan(r);
  }
  // a Remote document (R50 review F10): the join form, then every tab of a remote joined by code
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const join = await page.context().newPage();
  await join.goto(`${base}/#/remote`);
  await join.waitForFunction(() => '__pmeApp' in window);
  hits.push(...(await scanEngineIds(join, IDS)).map((h) => `remote join form → ${h}`));
  await join.close();
  const remote = await page.context().newPage();
  await remote.goto(`${base}/#/remote?code=${code}`);
  await expect(remote.locator('.status-pill')).toContainText('Connected', { timeout: 10_000 });
  for (const t of TABS) {
    await tab(remote, t);
    hits.push(...(await scanEngineIds(remote, IDS)).map((h) => `remote ${t} → ${h}`));
  }
  expect(hits).toEqual([]);
});
```

- [ ] **Step 4: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-app.e2e.ts apps/demo/e2e/stage9-glossary.e2e.ts
npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-app.e2e.ts apps/demo/e2e/stage9-glossary.e2e.ts --project=webkit   # once, R50 review F16
```

Expected: 6 passed on Chromium (app 5 — one session across views, the deep link, the Start monitor change that moves the mirrored alarm colours (R50 review F5), the learner controls strip (ruling 4), the paired remote; glossary 1), and the same on WebKit (the CI project that runs these light files). Record the WebKit result in the gate note; skip a test on WebKit only with a stated reason when a difference is real and understood (R50 review F16), never to get green. A glossary hit names the view, the element and the offending token: fix the string (glossary or copy), never widen the pattern except for a real unit abbreviation.

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/e2e/stage9-support.ts apps/demo/e2e/stage9-app.e2e.ts apps/demo/e2e/stage9-glossary.e2e.ts
git commit -m "test(e2e): Stage 9 — one engine session across views, scenario deep link, paired remote, no engine id in clinical views" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 22: e2e: accessibility audit (WCAG 2.2 AA, no dependency)

**Files:**
- Create: `apps/demo/e2e/stage9-a11y.e2e.ts`

**Why:** D22; brief §9 and §11.4. Two contexts: 1280×800 mouse and 820×1180 touch (44 px targets in the panel).

- [ ] **Step 1: Create `apps/demo/e2e/stage9-a11y.e2e.ts`**

```ts
// WCAG 2.2 AA audit of every view at a laptop and an iPad size, with no dependency (research/13 brief §9, §11.4;
// axe-core is Ali's question Q8). Targets ≥ 24 px (44 px in the instructor panel on a touch screen), names on every
// control, text contrast from the rendered colours, no sideways scroll, no clipped button labels, one h1, a main
// landmark, and a visible focus indicator on the first 25 tab stops.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { audit, EXPLORE, focusWalk, go, openApp, startVite, TABS, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

for (const [name, vp, touch] of [['laptop 1280×800', { width: 1280, height: 800 }, false], ['iPad portrait 820×1180', { width: 820, height: 1180 }, true]] as const) {
  test(`accessibility: ${name}`, async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 3000 });
    const found: string[] = [];
    const run = async (where: string) => found.push(...(await audit(page, { touchPanel: touch })).map((f) => `${where} ${f.rule}: ${f.what}`));
    for (const t of TABS) {
      await tab(page, t);
      await run(`teach/${t}`);
    }
    for (const r of ['#/', '#/monitor', '#/remote', '#/settings', '#/dev', '#/validate', ...EXPLORE.slice(0, 3).map((s) => `#/explore/${s}`)]) {
      await go(page, r);
      await run(r);
    }
    await go(page, '#/teach');
    found.push(...(await focusWalk(page)).map((f) => `focus: ${f}`));
    await ctx.close();
    expect(found).toEqual([]);
  });
}
```

- [ ] **Step 2: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-a11y.e2e.ts
npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-a11y.e2e.ts --project=webkit   # once, R50 review F16
```

Expected: 2 passed, 0 findings on Chromium and on WebKit (computed colours and focus styles differ between engines; record the WebKit result in the gate note — R50 review F16). Findings print as `<view> <rule>: <what>`; fix the UI, not the audit.

- [ ] **Step 3: Commit and push**

```bash
git add apps/demo/e2e/stage9-a11y.e2e.ts
git commit -m "test(e2e): Stage 9 accessibility audit — targets, names, contrast, reflow, clipping, headings, focus" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 23: e2e: the five timed instructor tasks

**Files:**
- Create: `apps/demo/e2e/stage9-tasks.e2e.ts`

**Why:** Brief §11.6 as an automated script through the visible UI only; the same five tasks are Ali's timed usability run (gate note). Task 3 runs first because holding and returning a value needs MODELED physiology and the ACLS case runs MANUAL.

- [ ] **Step 1: Create `apps/demo/e2e/stage9-tasks.e2e.ts`**

```ts
// The brief's five timed instructor tasks (research/13 brief §11.6), driven through the visible UI only — clicks, typing
// and keys, never the app hook — so a broken path shows as a failure. Each must finish in < 30 s; the times are
// written to the test annotations for the gate note. The same five tasks are the script for Ali's timed usability run.
// Chromium only (a heavy evidence run, CI amendment rules).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

async function timed(name: string, fn: () => Promise<void>): Promise<void> {
  const t0 = Date.now();
  await fn();
  const s = (Date.now() - t0) / 1000;
  test.info().annotations.push({ type: 'task', description: `${name}: ${s.toFixed(1)} s` });
  console.log(`[task] ${name}: ${s.toFixed(1)} s`);
  expect(s, name).toBeLessThan(30);
}
const logText = (p: Page) => p.locator('.log').innerText();

test('five instructor tasks, each under 30 s', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence run: Chromium only');
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/', { warmMs: 3000 });

  // Task 3 runs first: holding and returning a value needs MODELED physiology, and the ACLS case runs MANUAL.
  await timed('3. Hold SpO₂ at 85 %, then return it to the model', async () => {
    await page.click('text=Open the instructor view');
    await tab(page, 'vitals');
    const row = page.locator('[data-var=spo2]');
    await row.locator('input').fill('85');
    await row.locator('input').dispatchEvent('change');
    await row.locator('button', { hasText: 'Set' }).click();
    await page.keyboard.press('Control+Enter');
    await expect(row.locator('.chip')).toContainText(/Held|Model override/, { timeout: 10_000 });
    await row.locator('button', { hasText: 'Return to model' }).click();
    await page.locator('.stagebar button.primary').click();
    await expect(row.locator('.chip')).toBeHidden({ timeout: 10_000 });
  });

  await timed('1. Load the ACLS VF case', async () => {
    await tab(page, 'scenario');
    await page.click('.chips >> text=Resuscitation');
    await page.locator('.scard', { hasText: 'Witnessed VF in PACU' }).locator('button', { hasText: 'Load' }).click();
    await expect(page.locator('.sessionbar .scen')).toContainText('Witnessed VF in PACU');
  });

  await timed('2. Give noradrenaline 0.1 µg/kg/min', async () => {
    await tab(page, 'drugs');
    await page.fill('input[type=search]', 'noradr');
    await page.keyboard.press('Enter');
    await page.locator('.card.dose .chips button', { hasText: '0.1 µg/kg/min' }).click();
    await page.click('.card.dose >> text=Start infusion');
    await expect(page.locator('.toasts')).toContainText('Norepinephrine 0.1 µg/kg/min infusion started');
  });

  await timed('4. Silence the alarm and bookmark', async () => {
    await page.locator('.panel').click({ position: { x: 5, y: 5 } }); // focus out of any field
    await page.keyboard.press('Shift+S');
    await page.keyboard.press('Shift+B');
    await tab(page, 'log');
    await expect.poll(() => logText(page)).toContain('Alarm sound silenced');
    await expect.poll(() => logText(page)).toMatch(/Bookmark 1 at \d\d:\d\d/);
  });

  await timed("5. Find the patient's compliance and driving pressure", async () => {
    await page.click('nav.nav >> text=Explore physiology');
    await page.click('nav.xnav >> text=Respiratory mechanics and volumes');
    const labels = page.locator('table.values tbody th');
    await expect(labels.filter({ hasText: /^Cstat/ })).toHaveCount(1);
    await expect(labels.filter({ hasText: /^ΔP/ })).toHaveCount(1); // published by 7k (Request R-S9-3)
  });
});
```

- [ ] **Step 2: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-tasks.e2e.ts --reporter=line
```

Expected: 1 passed; `[task]` lines each < 30 s (prototype: 2.6, 0.9, 0.9, 0.7 s for tasks 3, 1, 2, 4). Task 5 needs 7k's ΔP row (Request R-S9-3, wired at Task 0/2): on a base without it the test fails at the ΔP line — then STOP and report, do not remove the line.

- [ ] **Step 3: Commit and push**

```bash
git add apps/demo/e2e/stage9-tasks.e2e.ts
git commit -m "test(e2e): Stage 9 five timed instructor tasks through the visible UI" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 24: e2e: screenshot matrix and the frame gate script

**Files:**
- Create: `apps/demo/e2e/stage9-png8.ts`
- Create: `apps/demo/e2e/stage9-shots.e2e.ts`
- Create: `apps/demo/scripts/stage9-frames.mjs`

**Why:** Brief §11.1 and §11.5: 14 views × 4 sizes as indexed PNGs ≤ 60 KB (no dependency: `stage9-png8.ts`), and the Stage 8a frame intervals with the shell mounted and the panel open, on the 8-lane `validation-perf` load (`?load=perf8`) with a soak mode (D23, R50 review F6).

- [ ] **Step 1: Create `apps/demo/e2e/stage9-png8.ts`**

```ts
// Indexed-colour PNG for gate screenshots (≤ 60 KB each, no dependency): the page's canvas decodes and scales the
// Playwright screenshot, Node builds a ≤ 256-colour palette by popularity (5 bits per channel) and deflates it.
// Measured in the Stage 9 prototype: 1280×800 views 44–48 KB at scale 1; 1920×1080 views 42–52 KB at scale 0.75.
import { deflateSync } from 'node:zlib';
import type { Page } from '@playwright/test';

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** RGBA pixels → an 8-bit indexed PNG. */
export function png8(rgba: Uint8Array, w: number, h: number): Buffer {
  const key = (i: number) => (((rgba[i] as number) >> 3) << 10) | (((rgba[i + 1] as number) >> 3) << 5) | ((rgba[i + 2] as number) >> 3);
  const count = new Map<number, number>();
  for (let i = 0; i < rgba.length; i += 4) count.set(key(i), (count.get(key(i)) ?? 0) + 1);
  const pal = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4] as const);
  const idx = new Map<number, number>();
  const near = (k: number): number => {
    const hit = idx.get(k);
    if (hit !== undefined) return hit;
    const r = ((k >> 10) & 31) * 8 + 4;
    const g = ((k >> 5) & 31) * 8 + 4;
    const b = (k & 31) * 8 + 4;
    let best = 0;
    let bd = Infinity;
    pal.forEach(([pr, pg, pb], j) => {
      const d = (pr - r) ** 2 * 2 + (pg - g) ** 2 * 4 + (pb - b) ** 2 * 3;
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    idx.set(k, best);
    return best;
  };
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = near(key((y * w + x) * 4));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(pal.flat())), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Screenshot the page and return it as an indexed PNG, scaled by `scale` in the page's own canvas. */
export async function shot8(page: Page, scale = 1): Promise<Buffer> {
  const b64 = (await page.screenshot()).toString('base64');
  const r = await page.evaluate(async ({ b64, scale }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let s = '';
    for (let i = 0; i < d.length; i += 8192) s += String.fromCharCode(...d.subarray(i, i + 8192));
    return { w: c.width, h: c.height, data: btoa(s) };
  }, { b64, scale });
  return png8(new Uint8Array(Buffer.from(r.data, 'base64')), r.w, r.h);
}
```

- [ ] **Step 2: Create `apps/demo/e2e/stage9-shots.e2e.ts`**

```ts
// Stage 9 gate evidence: every view at the four target sizes (research/13 brief §8, §11.1), each an indexed PNG
// ≤ 60 KB in docs/gates/stage-9/, after a real warm-up so the waveforms are drawn. Chromium only (evidence run).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-shots.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './stage9-png8.ts';
import { go, openApp, startVite, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-9');
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

const SIZES = [[1280, 800, false], [1920, 1080, false], [1180, 820, true], [820, 1180, true]] as const;

async function save(page: Page, name: string, w: number): Promise<void> {
  let buf = await shot8(page, w > 1440 ? 0.75 : 1);
  if (buf.length > 60 * 1024) buf = await shot8(page, w > 1440 ? 0.6 : 0.8);
  writeFileSync(`${out}/${name}.png`, buf);
  expect(buf.length, `${name}.png ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
}

for (const [w, h, touch] of SIZES) {
  test(`views at ${w}×${h}`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', 'evidence run: Chromium only');
    test.setTimeout(180_000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '#/', { warmMs: 9000 });
    const s = `${w}x${h}`;
    await save(page, `start-${s}`, w);
    await go(page, '#/monitor', 6000);
    await save(page, `monitor-${s}`, w);
    await go(page, '#/teach', 1500);
    await tab(page, 'vitals');
    await save(page, `instructor-vitals-${s}`, w);
    await tab(page, 'scenario');
    await page.locator('.scard', { hasText: 'Witnessed VF in PACU' }).locator('button', { hasText: 'Load' }).click();
    await page.waitForTimeout(8000);
    await save(page, `instructor-scenario-${s}`, w);
    await tab(page, 'drugs');
    await save(page, `instructor-drugs-${s}`, w);
    await tab(page, 'devices');
    await save(page, `instructor-devices-${s}`, w);
    for (const [r, name, wait] of [['#/remote', 'remote-pairing', 800], ['#/explore/haemodynamics', 'explore-haemodynamics', 1500], ['#/explore/respiratory', 'explore-respiratory', 1500], ['#/vent', 'ventilator', 9000], ['#/validate', 'validate', 4000], ['#/dev', 'developer', 800], ['#/settings', 'settings', 800]] as const) {
      await go(page, r, wait);
      await save(page, `${name}-${s}`, w);
    }
    // the Remote as a phone/tablet sees it: a second page joined by the code
    const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const remote = await ctx.newPage();
    await remote.goto(`${base}/#/remote?code=${code}`);
    await expect(remote.locator('.status-pill')).toContainText('Connected', { timeout: 10_000 });
    await remote.waitForTimeout(1500);
    await save(remote, `remote-panel-${s}`, w);
    await ctx.close();
  });
}
```

- [ ] **Step 3: Create `apps/demo/scripts/stage9-frames.mjs`**

```js
// Stage 9 gate: the Stage 8a frame-interval gate with the whole app shell mounted and the instructor panel open, on the
// brief's load — the 8-lane `validation-perf` layout (`?load=perf8`, review F6) — at p95 < 25 ms (60 fps) and < 50 ms
// (30 fps). Same method as validation-perf.html: main-thread requestAnimationFrame intervals, 10 s warm-up, then a
// window. The metric is the MAIN thread's frame intervals, as in 8a: the renderer draws the sweep in its worker and
// exposes no worker frame statistics, so the site's 30 fps cap (which acts on the worker's drawing) does not show here —
// the 30 fps rows prove the shell stays inside the 30 fps budget, not that the worker drew at 30 (gate note, review F6).
// Run: node apps/demo/scripts/stage9-frames.mjs http://127.0.0.1:<port> [seconds]        four rows (1920×1080, 1280×800 × 60, 30 fps)
//      node apps/demo/scripts/stage9-frames.mjs http://127.0.0.1:<port> --soak 1200      the 20-min soak, 1920×1080 at 60 fps
// A Vite dev server on apps/demo; system Chrome with PW_SYSTEM_CHROME=1, else Playwright's bundled Chromium.
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const base = args[0];
if (!base) throw new Error('usage: stage9-frames.mjs <base url> [seconds] | --soak <seconds>');
const soakAt = args.indexOf('--soak');
const soak = soakAt > 0 ? Number(args[soakAt + 1] ?? 1200) : 0;
const secs = soak || Number(args[1] ?? 60);
const b = await chromium.launch(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {});
const rows = [];
const runs = soak ? [[1920, 1080, 60]] : [[1920, 1080, 60], [1920, 1080, 30], [1280, 800, 60], [1280, 800, 30]];
for (const [w, h, fps] of runs) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.addInitScript((fps) => localStorage.setItem('pme.site', JSON.stringify({ fps })), fps);
  await p.goto(`${base}/?load=perf8#/teach`);
  await p.waitForFunction(() => '__pmeApp' in window);
  await p.evaluate(() => window.__pmeApp.teach.panel.select('vitals'));
  await p.waitForTimeout(10_000);
  await p.evaluate(() => window.__pmeApp.frames.splice(0));
  await p.waitForTimeout(secs * 1000);
  const r = await p.evaluate(() => {
    const all = [...window.__pmeApp.frames];
    const q = (arr, x) => {
      const f = [...arr].sort((a, b) => a - b);
      return +(f[Math.floor(x * (f.length - 1))] ?? 0).toFixed(1);
    };
    // the worst 60 s window (a soak must not degrade): split the intervals by their running sum
    let acc = 0;
    let win = [];
    let worst = 0;
    for (const d of all) {
      win.push(d);
      acc += d;
      if (acc >= 60_000) {
        worst = Math.max(worst, q(win, 0.95));
        win = [];
        acc = 0;
      }
    }
    return { n: all.length, p50: q(all, 0.5), p95: q(all, 0.95), p99: q(all, 0.99), max: +Math.max(...all).toFixed(1), worstMinuteP95: worst || q(all, 0.95) };
  });
  const path = await p.evaluate(() => window.__pmeApp.session.monitor.renderPath);
  const row = { load: 'perf8', viewport: `${w}×${h}`, fps, secs, path, ...r, gate: fps === 60 ? r.p95 < 25 && r.worstMinuteP95 < 25 : r.p95 < 50 && r.worstMinuteP95 < 50 };
  rows.push(row);
  console.log(JSON.stringify(row));
  await ctx.close();
}
await b.close();
if (rows.some((r) => !r.gate)) process.exitCode = 1;
```

- [ ] **Step 4: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-shots.e2e.ts --reporter=line && ls -la docs/gates/stage-9 | wc -l
```

Expected: 4 passed (≈ 4 min); 56 PNGs in `docs/gates/stage-9/`, each ≤ 60 KB (prototype 21–59 KB). Look at every image. The frame script runs in the gate (Task 25).

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/e2e/stage9-png8.ts apps/demo/e2e/stage9-shots.e2e.ts apps/demo/scripts/stage9-frames.mjs
git commit -m "test(e2e): Stage 9 screenshot matrix (indexed PNG ≤ 60 KB) and the frame-gate script" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 25: Gate — full verification, evidence, gate note, pull request

**Files:**
- Create: `docs/gates/stage-9.md`; `docs/gates/stage-9/*.png` (from Task 24, re-taken here on the merged tree)
- Modify: this plan (tick the boxes)

- [ ] **Step 1: Merge main and run everything** (long commands in the background, logs under
  `<scratchpad>/stage-9-clinical-ui/`, every wait an `until` loop ≤ 10 min that re-checks the process):

```bash
git fetch origin && git merge origin/main
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
CI=1 npx -y pnpm@9.15.9 test
(cd packages/engine-core && PME_TEST_SET=fast CI=1 npx vitest run && PME_TEST_SET=slow CI=1 npx vitest run)
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
for i in 1 2 3; do PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-app.e2e.ts --workers=2 || break; done   # R50 review F7: stable under load, no retries
git status --short docs/gates   # the e2e rewrites earlier stages' committed evidence images: restore them
git checkout -- $(git diff --name-only -- docs/gates | grep -v '^docs/gates/stage-9/')
```

Expected: all green; the Stage 9 e2e files pass (app 3, glossary 1, a11y 2, tasks 1, shots 4); earlier stages' e2e
unchanged (the prototype ran 6a/6b green with the opaque drawer). A timing test that fails under load is re-run alone
before it is treated as a regression.

- [ ] **Step 2: The frame gate with the shell mounted and the panel open**

```bash
(cd apps/demo && npx vite --port 4862 --strictPort > <scratchpad>/stage-9-clinical-ui/vite-frames.log 2>&1 &)
PW_SYSTEM_CHROME=1 node apps/demo/scripts/stage9-frames.mjs http://localhost:4862 60 | tee <scratchpad>/stage-9-clinical-ui/frames.jsonl
PW_SYSTEM_CHROME=1 node apps/demo/scripts/stage9-frames.mjs http://localhost:4862 --soak 1200 | tee -a <scratchpad>/stage-9-clinical-ui/frames.jsonl   # 20 min: run in the background, wait with an until loop
pkill -f "vite --port 4862"
```

Expected: four rows and one soak row, every `gate: true` (p95 < 25 ms at 60 fps, < 50 ms at 30 fps, and the worst
60 s window inside the same limit), each with `load: "perf8"` (the brief's 8-lane load, R50 review F6). Record in the
gate note that the metric is the main thread's frame intervals, as in 8a: the worker's own frame rate is not exposed,
so the 30 fps rows show that the shell stays inside the 30 fps budget, not that the worker drew at 30.
Add the iPad Safari manual run (brief §10): open the app on an iPad on the LAN, Instructor view, panel open, Low Power
Mode on for 2 min, read `__pmeApp.frames` p95 from Safari's Web Inspector console, record it (or "not run: no iPad on
the bench").

- [ ] **Step 3: Screenshots** — re-run Task 24's `stage9-shots.e2e.ts` on the merged tree; look at all 56 images.

- [ ] **Step 4: Write `docs/gates/stage-9.md`** with YOUR measured numbers:
  1. *What shipped* — one row per task (0–24, 7b), files, tests; the exceptions E-S9-1/2/3/4 with the lines each touched (E-S9-4 applied or skipped);
     Task 20 applied or skipped (Q7).
  2. *Views* — one embedded screenshot per view at 1280×800 and one at 820×1180, with one sentence each; the full
     matrix listed as links.
  3. *Accessibility* — the audit result per context (0 findings expected), the focus walk, the CVD check (Chrome
     DevTools "Emulate vision deficiencies": deuteranopia and protanopia on Instructor and Explore — look, and say
     whether any meaning is carried by colour alone), the token contrast table from `tokens.test.ts`.
  4. *Glossary* — the glossary e2e result; the additions made at Task 0/2 (for Ali's review, R56); the count of
     Explore rows with a clinical label vs "Model internals" per section; `SHORT` and `SAME_AS` (for Ali's review);
     any alarm id the mirror did not know (`alarmLine(…).known === false`, D10) — none expected.
  5. *Five timed tasks* — the automated times, and Ali's own times if he ran them (target < 30 s each without help).
  6. *Frame gate* — the four rows and the 20-minute soak on the 8-lane load (+ iPad), with the sentence on what the
     metric measures (D23).
  7. *Decisions* D1–D29 one line each; *Deviations* from this plan and from the brief, and why — at least: no
     shareable `?skin=&patient=&theme=` URL state (brief §5; only `?scenario=`, `?session=`, `?relay=`, `?load=`), no
     rhythm thumbnails in the picker (brief §7), no "Positioning & surgery stimuli" group although 7e's `stimulus` event
     exists and `depth-light-anaesthesia` is about an incision (brief §4), no Popover API (iPadOS 16.4 floor), no
     "remember the last view" (Q1), Shift shortcuts (Q14); *v1.0 limits* the orchestrator accepted: the sweep restarts
     after a Monitor ↔ Instructor switch (ruling 3), same-browser Remote (ruling 6); *WebKit* results of the three light
     e2e files (F16); *Requests* R-S9-1…8 with their status and R-FU5-9 declined.
  8. *Open questions* Q1–Q15 (below) with Ali's answers where given, and the orchestrator's rulings 1–6 on the R50
     review as applied.
  9. *Test counts* — per package, e2e list.

- [ ] **Step 5: Commit, push, open the PR (do NOT merge)**

```bash
git add docs/gates/stage-9.md docs/gates/stage-9 docs/plans/stage-9-clinical-ui.md
git commit -m "docs: Stage 9 gate note and evidence screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh pr create --base main --head stage-9-clinical-ui --title "Stage 9: clinical UI — one app, instructor panel, glossary labels, responsive layouts" --body "$(cat <<'BODY'
Implements docs/plans/stage-9-clinical-ui.md (R55, R56). Gate note: docs/gates/stage-9.md.

- One app page (index.html) with hash routes and ONE engine session shared by every view: Start, learner Monitor, Instructor (monitor + panel), Remote (paired by code/QR), Explore physiology, Ventilator, Validate, Developer, Settings. The stage pages stay, reachable from Developer.
- Instructor panel: Scenario, Vitals & rhythm, Drugs & fluids, Airway & ventilation, Defib/pacing/CPR, Devices & alarms, Patient, Log; staged changes with one onset and Commit; pin / return-to-model per value with change flags; onset progress markers; MODELED/MANUAL always visible; the same panel runs on a paired tablet.
- R56: every clinical label from the research/11 glossary (+ Stage 9 additions and per-key labels, for Ali's review); engine keys only under Model internals and in Developer; an e2e fails on any engine id in a clinical view.
- Tokens per the brief ("bezel and screen", one accent, the monitor true black, alarm colours from the skin); system fonts (IBM Plex/B612 await Ali's Q7); no new dependency (self-written QR encoder and indexed-PNG writer for the evidence).
- Accessibility audit (no dependency): targets ≥ 24 px (44 px on touch), names, contrast, reflow, headings, focus — 0 findings at 1280×800 and 820×1180.
- Frame gate with the shell mounted and the panel open: <p95 numbers>.
- Exceptions: E-S9-1 index.html becomes the app; E-S9-2 the 6a host session forwards pin/release/setFactor/setMode to the engine (a pre-7a guard refused every pin) + the one stub assertion; E-S9-3 the 6a drawer is opaque.
- No physiology, renderer, skin or alarm-semantics change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Report: commits, test counts, the gate numbers, deviations, anything undone. Stop.

---

## Open questions for Ali (the brief's 12, with the plan's recommendation and what the plan does meanwhile)

| # | Question | Recommendation (what this plan implements until Ali answers) |
|---|---|---|
| Q1 | Default landing: Instructor view or a Start screen? | **Start** on every fresh load (it is also the patient preview); a `?scenario=` link opens the Instructor view directly. "Remember the last view" is not implemented (a reload during a course should not land a projector on the instructor's panel). |
| Q2 | Learner monitor default for the course: saadat-like `iran-icu-as-found` (alarms off)? | **Yes for the course room** — one click in Settings (site profile, exportable); the shipped default stays factory `saadat-like`, philips-like is the "international" choice. |
| Q3 | Keep the stage pages in the release build? | **Yes, only under Developer**, opening in a new tab; none on Start. |
| Q4 | Instructor on the same screen or a second device by default? | **Same screen in v1.0**: split beside the monitor ≥ 1200 px, drawer below (or by site choice), and a Remote in a second window of the same browser by code. A tablet over the network is version 1.1 (orchestrator ruling 6; D15). |
| Q5 | Periwinkle accent and graphite bezel? | **Yes** (tokens in `app.css`; one variable to change if Ali prefers another hue — the token test re-checks contrast). |
| Q6 | Dose presets: whose defaults? | **The 7g library's ranges as drafts** (`app/drugs.ts` `PRESETS`, 28 drugs) — Ali reviews that one table; nothing else encodes a dose. Note for the review: epinephrine's bolus chips put 10 µg, 100 µg and 1 mg side by side (push-dose and arrest doses, a 100-fold spread in one row). |
| Q7 | Accept SIL OFL fonts (IBM Plex, B612) as bundled assets? **(font approval)** | **Yes** (OFL is font-specific and compatible with MIT distribution; NOTICES row + `LICENSES/OFL-1.1.txt`). Until Ali says so the system stack ships and Task 20 is skipped. |
| Q8 | `@axe-core/playwright` (MPL-2.0) as a dev-only test dependency? | **Not needed now**: the custom audit (D22) covers targets, names, contrast, reflow, headings and focus; axe would add ARIA-pattern rules — worth it as dev-only if Ali approves, never shipped. |
| Q9 | Show engine keys in the release console? | **Decided (D4, D16):** muted mono, only in Developer and under Explore's collapsed "Model internals". Listed for Ali's confirmation only. |
| Q10 | Labs tab while 7i is deferred? | **Decided (D16):** show it with today's blood-gas rows (glossary labels, FO₂Hb/SaO₂, Mg, osmolality) and a "coming in version 1.1" note for CBC, chemistry, coagulation, TEG/ROTEM. |
| Q11 | Persian UI text? | **No for v1** (English clinical vocabulary as on the monitor; the Jalali date stays a skin option). Strings live in the view modules; a translation layer is v1.1+. |
| Q12 | Learner action buttons (6b "Learner:" row)? | **Decided by the orchestrator (ruling 4; D27):** a "Learner controls" strip under the learner Monitor, off by default, switched on per scenario; learner actions are logged as such. |
| Q13 | Drug names: "Norepinephrine"/"Epinephrine" (the 7g library) or "Noradrenaline"/"Adrenaline" (UK/Iran usage)? | **Open for Ali; the orchestrator's ruling 5 sets the mechanism (D28):** drug names are glossary data (`DRUG_NAMES`) and the set is a site-profile option, default "epinephrine / norepinephrine", alternative "adrenaline / noradrenaline"; both names are searchable. Ali picks the course default; other US/UK pairs (suxamethonium, lignocaine, GTN) can join the table if he wants them. |
| Q14 | Shortcuts with Shift (S/P/N/B) rather than single letters? | **Decided (D25):** Shift, so a stray key while talking never silences the room. Listed for Ali's confirmation only. |
| Q15 | The 11 scenario cards' stories, categories, durations and objectives (`scenario-meta.ts`) | Drafts written for learners; Ali reviews them with the scenario documents (all are `[draft]`). |
| — | Orchestrator: exceptions | E-S9-1, E-S9-2 and E-S9-3 APPROVED (ruling 2). **E-S9-4 needs re-confirmation:** ruling 1 said "skin JSON data only", but a working per-skin wording needs one optional schema field and three reading lines in `engine-core/src/l3/alarms` (see E-S9-4); without the re-confirmation Task 7b is skipped and R-FU5-6 goes to the FU-5 follow-up. |

## Self-review

- **Spec coverage.** One app page, one session never restarted by a view switch (D1–D2, Task 21 proves it); Start with
  patient profile, scenario, skin/site, MODELED/MANUAL, learner vs instructor (Task 15); learner Monitor (Task 15);
  Instructor view with session bar and the eight tabs, staged-changes footer, pin/return with change flags, trend
  markers, MODELED/MANUAL always visible (Tasks 9–14); Remote by code/QR on the 6a transports (Task 16); Explore with
  glossary labels, organ grouping, baseline highlighting, the 7k slot and the v1.1 labs placeholder (Task 17);
  Ventilator, Validate, Developer, Settings (Task 18); tokens, IEC alarm colours from the skin, type scale with the
  font question and a system fallback (Tasks 1, 20); component library with ≥ 24/44 px targets, labels, 4.5:1,
  keyboard, colour-blind-safe status (Tasks 1, 3, 22); responsive 1280×800, 1920×1080, iPad landscape/portrait
  (D21, Task 24); frame gate with the panel open and no blur over the canvas (Tasks 19, 24, 25); every string through
  the glossary or the copy pass (Tasks 2, 5, 21); scenario cards with description, objectives and current state
  (Tasks 4, 10); sensors attach before traces appear (D11); no new dependency; stage pages kept.
- **Design skills used:** `frontend-design`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`
  (see Decisions; each changed the prototype: the quiet chips, the sticky Start actions, the Menu dialog, 24/44 px
  targets, the h1s, dialogs whose buttons name their outcome, the empty states).
- **Find-block check (mechanical).** The four existing-file blocks (E-S9-1 `apps/demo/index.html`, E-S9-2
  `host-session.ts` + its test, E-S9-3 `styles.ts`) each match EXACTLY ONCE on `origin/main` `891d4d2` (code of
  `bab4b72`), and replacing them reproduces the prototype files byte for byte (`scratch/plans-backup/stage-9-verify.py`,
  result: "created 61, edited 4, problems 0" on `891d4d2`). None of the four files is touched by `origin/fu-4-integration-polish` or
  `origin/fu-5-monitor-fidelity`, nor by the FU-4, FU-6, FU-7 or V.1 plans (their file maps checked).
- **Create blocks.** Every create block was extracted from the plan by the same script and compared with the prototype
  file: identical. On the plan-applied tree (a clean `891d4d2` + every block, installed offline): demo typecheck clean,
  demo 18 files / 173 tests, controller 37 / 215, e2e `stage9-app` 3, `stage9-glossary` 1, `stage9-a11y` 2 and
  `stage6a` pass; `stage9-tasks` passes tasks 1–4 and stops at the ΔP line (no 7k on that base, as designed).
- **Placeholders.** None in code. Two data tables are drafts by design and flagged for Ali (drug presets Q6, scenario
  card copy Q15); the glossary additions of Task 0/2 are listed in the gate note.
- **Known limits.** Timed task 5 depends on 7k's ΔP path (R-S9-3; red on a base without 7k — the stage order puts 7k
  first). The sweep clears on a monitor resize (R-S9-1). A Remote shows the sensor toggles' last command, not the
  engine's sensor state (R-S9-6). The iPad Safari frame run is manual.
