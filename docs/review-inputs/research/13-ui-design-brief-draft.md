# 13 — Stage 9 "clinical UI" design brief (DRAFT for the plan writer)

*Draft 2026-09-28, from `research/13-ui-benchmarks.md` (critique §1, benchmark §2, principles §3, IA §4). Rulings: R55
(Stage 9), R56 (glossary), R57 (7k mechanics panel), R58/R60 (labs deferred to v1.1: placeholder only). Status: needs
Ali's answers to §13 before the plan is fixed. Audience: the Stage 9 plan writer and executor, who have not read the
benchmark.*

**Design skills applied.** `design:design-critique` (the critique in 13-ui-benchmarks §1), `frontend-design`
(direction, token plan, restraint: "spend boldness in one place"), `design:accessibility-review` (WCAG 2.2 AA
targets in §9). The design-system and handoff skills (`design:design-system`, `design:design-handoff`) are the
recommended tools for the executor when turning §6–§7 into code and specs.

---

## 1. Goals

1. **One product, not 25 pages.** A single app shell with task-based navigation, a persistent engine session across
   views, and a way back from everywhere.
2. **Polished and professional** at first sight: consistent tokens, one control set, no debug text, no engine keys,
   no clipped labels, no native white widgets on black.
3. **Easy to understand for a resident**: every visible parameter uses the R56 glossary label, a tooltip gives the
   full name, unit and normal range; controls speak clinical units (mg, µg/kg/min, mL, cmH₂O, J, mA).
4. **Easy to drive for an instructor** under time pressure: the five commonest actions are one tap; everything else is
   at most two levels deep; changes can be staged and committed together; MANUAL vs MODELED is always visible.
5. **The monitor stays faithful.** The sweep renderer and skins (FU-5's) are wrapped, not redesigned: vendor colours,
   lane labels, alarm behaviour and fonts inside the monitor frame are skin data.
6. **Runs where the course runs**: a 1280×800 laptop, a 1920×1080 screen or projector, an iPad (landscape and
   portrait), and a phone as a remote (stretch).

## 2. Non-goals

- Redesigning the sweep renderer, lane drawing, numeric tile interiors or any skin's vendor look (FU-5).
- A scenario *authoring* editor (v1 loads `pme-scenario/1` JSON; an editor is v1.1+).
- The labs & coagulation panel's content (7i, v1.1 per R60): Stage 9 reserves the slot and draws a placeholder.
- The obstetric/CTG device (7j, v1.1).
- Multi-patient instructor consoles, LMS/xAPI, accounts, cloud sync.
- Localisation beyond English (the saadat skin's Jalali date stays a skin option).
- New runtime dependencies. Everything in this brief is achievable with the platform (CSS custom properties,
  container queries, `<dialog>`, the Popover API, `:focus-visible`, `prefers-*` media queries). Fonts are the only
  proposed assets (SIL OFL 1.1, see §6.3 and §12).

## 3. Personas

| Persona | Context | Needs | Pain today |
|---|---|---|---|
| **Instructor** (Ali; faculty running the orientation boot camp) | Laptop beside a projector, or an iPad as a remote while the learner watches the monitor; often mid-scenario, talking | Load a case in < 30 s; change HR/BP/SpO₂ or give a drug in 1–2 taps; see what the model will do and what is pinned; mark moments for debrief; silence the room | Controls spread over 25 pages; raw engine parameters; no single place for patient, scenario, drugs, ventilation; no debrief log view |
| **Resident** (PGY-1 anaesthesia, first month; Iranian ORs, saadat-like monitor) | Watches the monitor (projector or bedside screen), sometimes acts via learner buttons; later explores physiology alone on a laptop | Recognise the monitor they will meet; read labels they know from textbooks; explore "why" (PV loop, compliance, CO) without developer noise | Engine keys (`cpLp`, `awrr mon`), stage-numbered pages, unit-less sliders, "SR" ambiguity |
| **Developer / validator** (maintainers, Ali in validation mode) | Laptop, long sessions, bright room; reads every truth leaf, compares baselines, exports | Dense, searchable, copyable tables; diff vs baseline; raw commands; performance telemetry | Fine today functionally; needs clinical labels next to keys and a light theme for long reading |

## 4. Information architecture (summary; full rationale in 13-ui-benchmarks §4)

```
App shell (one page, hash routes; one engine session shared by all views)
├── Start                 #/            choose: Teach a case · Explore physiology · Ventilator · Validate · Developer
├── Monitor               #/monitor     full-screen learner monitor (skin, page), instructor hidden (i / 5-tap / 3-finger)
├── Instructor            #/teach       monitor + instructor panel (split on ≥1280 wide; drawer on smaller)
│    ├── Patient          profile card (age, sex, weight, height, comorbidities); MANUAL/MODELED; restart
│    ├── Scenario         library cards → run view (state, elapsed, next triggers, objectives, log, bookmarks)
│    ├── Vitals & rhythm  targets with ramps; rhythm picker with modifiers; pin/release per parameter
│    ├── Interventions    Drugs & fluids · Airway & ventilation · Defib/pacer/CPR · Positioning & surgery stimuli
│    ├── Devices          sensors on/off, NIBP mode, alarms (limits, silence, pause), 12-lead, freeze
│    └── Log              event log, bookmarks, export (CSV/JSON)
├── Remote                #/remote      the instructor panel alone, paired by code/QR to a Monitor on another device
├── Explore physiology    #/explore     Haemodynamics (PV loop, chamber pressures, CO/SV/SVR, O₂ transport)
│                                      Respiratory mechanics & volumes (7k: loops, Pplat/ΔP/PL, FRC…)
│                                      Brain · Kidney · Liver & metabolism · Endocrine & temperature · NMB & depth
│                                      Drugs (Cp/Ce curves, TCI) · Labs (v1.1 placeholder: ABG/VBG, CBC, coag, TEG/ROTEM)
├── Ventilator            #/vent        the Stage V cockpit, standalone or linked beside the monitor
├── Validate              #/validate    bedside checklist · blind review · performance gate
├── Developer             #/dev         physiology console (light theme default), raw commands, stage harness index
└── Settings              #/settings    skin, theme (dark / projector-light / ECG grid), calibration (mm/s), sound,
                                        keyboard shortcuts, reset
```

The **stage harness pages** (`stage0`–`stage7g`) stay as files for the e2e tests and are reachable only from
Developer → "Stage harnesses". Their demo *content* (scripted cases such as "MH crisis", "Apnoea after
preoxygenation ×4", "Haemorrhage → transfusion") moves into the scenario library as cards.

## 5. Navigation and state model

- **One document, hash routing** (`#/teach`, `#/explore/haemodynamics`…). No framework router needed; a 60-line
  `hashchange` switch is enough. Views are sections toggled with `hidden`; the monitor view is **never unmounted** while
  the session lives, so the engine keeps running when the instructor opens the console or Explore.
- **Session**: one engine instance per app document (worker path as today). The session bar shows: patient
  one-liner ("M 40 y 70 kg · ASA II"), mode badge (MODELED / MANUAL / MIXED n pinned), scenario name + state +
  elapsed, sim speed (×1 ×2 ×4 ×8 · pause), audio state, session code for remotes.
- **URL state** (shareable): `?skin=saadat-like&page=P1&scenario=acls-vf-witnessed&patient=adult-40-70&theme=dark`.
  Persist only per-viewer conveniences in `localStorage` (last skin, theme, panel width, calibration), wrapped in
  try/catch.
- **Staged changes**: the 6a staging bar becomes the panel footer: "3 changes staged · Commit (⌘↵) · Discard". A
  per-control "apply now" remains for single urgent actions (Shock, Silence, Bolus).
- **Confirmations** only for destructive or patient-resetting actions (Restart patient, Load scenario over a running
  one, Clear log). Everything else is undoable from the log ("Undo last" for staged batches).
- **MANUAL / MODELED** (R4; CAE Maestro pattern): the mode badge is global; any parameter the instructor sets in
  MODELED becomes *pinned* (a pin chip on the control and a small pin glyph beside the *console* value, never on the
  learner monitor); "Release" returns it to the model with the configured onset; "Release all" in the session bar.
- **Scenario run**: current state highlighted in a state strip; "next" shows the transition triggers (time, vitals,
  actions) with a countdown when time-based; instructor can "Jump to state" (confirm) and "Hold" the timer.

## 6. Design tokens

### 6.1 Direction: "bezel and screen"

The memorable idea is taken from the device itself. **The monitor is the screen** — true black, vendor colours,
untouched. **Everything else is the bezel** — a matte, cool graphite housing that recedes, uses colour only for state,
and never competes with the waveforms (ISA-101 "high-performance HMI" and the aviation "dark cockpit": normal is
quiet, abnormal is colourful). Boldness is spent in one place, the monitor; the shell is disciplined. One instructor
accent (periwinkle) marks *what the instructor controls* — it is chosen because it collides with no parameter colour
(green ECG, cyan SpO₂, red ART, yellow CO₂/PAP, magenta SpO₂-saadat/ICP, white NIBP/CVP-H30, orange agents) and no
alarm colour (red, yellow, cyan). The ventilator keeps its navy device look inside its own frame, like a second device
on the same trolley.

### 6.2 Colour

**Dark shell ("theatre", default for Monitor, Instructor, Explore, Remote).** Contrast ratios are against the listed
surface (computed, WCAG 2.x).

| Token | Hex | Use | Contrast notes |
|---|---|---|---|
| `--screen` | #000000 | inside the monitor frame only (skin owns it) | — |
| `--bezel-0` | #0E1116 | app background | — |
| `--bezel-1` | #151A21 | panels, drawers | — |
| `--bezel-2` | #1C222B | cards, raised rows | — |
| `--bezel-3` | #262E39 | control fill (buttons, inputs) | — |
| `--line` | #35404E | dividers (decorative; not the only boundary of a control) | 1.7:1 on bezel-1 |
| `--line-strong` | #6B7788 | control boundaries, focusable outlines | 3.8:1 on bezel-1 (≥ 3:1 non-text) |
| `--text` | #D6DDE6 | body text | 12.8:1 on bezel-1 |
| `--text-strong` | #F3F6F9 | headings, values | 16.1:1 |
| `--text-muted` | #9AA6B5 | secondary text, units | 7.1:1 |
| `--text-faint` | #7D8898 | tertiary (timestamps); never below 13 px | 4.9:1 on bezel-1 (fails on bezel-3: don't use there) |
| `--accent` | #8C9BFF | instructor-controlled state: selected tab, pinned chip, staged outline, primary button fill | 6.9:1 as text on bezel-1; text on accent fill uses `--bezel-0` (7.4:1) |
| `--accent-strong` | #A3AEFF | focus ring (2 px + 2 px offset) | 9.1:1 on bezel-0 |
| `--danger` | #FF6369 | destructive buttons in dialogs only (Restart patient, Clear) | 6.0:1 on bezel-1 |
| `--pin` | = `--accent` + pin glyph | MANUAL / pinned values | shape + colour |
| `--modeled` | = `--text-muted` + wave glyph | model-driven values | shape + colour |

**Alarm colours are not shell tokens.** The instructor panel's alarm list, the session-bar alarm count and any mirror of
a monitor alarm read `--alarm-high/medium/low` *from the active skin* (`alarms.messageBar` in the skin JSON), so the
mirror is exactly what the monitor shows. IEC-style defaults (13-ui-benchmarks §2.10; brief §6.4): high red with white text,
flashing 1.4–2.8 Hz (engine 2.0 Hz); medium yellow with black text, 0.4–0.8 Hz (engine 0.6 Hz); low cyan with black
text, steady. Every alarm mirror also carries the priority as text/shape (`!!!`, `!!`, `!` or `***`/`**`/`*` per
skin, plus the priority name in the accessible label). For white-on-red text use a red of ≥ #D1001C darkness (5.6:1);
the skin's #F00000 with white text is 4.46:1 (acceptable as large bold text only).

**Light developer console ("bench", default for Developer and Validate; switchable).**

| Token | Hex | Contrast |
|---|---|---|
| `--bench-0` / `-1` / `-2` | #FFFFFF / #F6F7F9 / #EDEFF3 | — |
| `--bench-line` / `-line-strong` | #D9DDE3 / #6B7482 | strong 4.4:1 on bench-1 |
| `--bench-text` / `-muted` | #1B2330 / #5B6675 | 14.7:1 / 5.4:1 on bench-1 |
| `--bench-accent` | #3A4FD9 | 5.9:1; white text on it 6.4:1 |
| `--bench-danger` | #C2362F | 5.1:1 |

Parameter colours in the light console (sparklines, value tints) use the skin's `projector-light` theme values, which
the renderer already derives; the NIBP grey (≈#8A8A8A, 3.45:1) must be darkened to ≥ #6B7482 in that theme (FU-5 owns
the change; Stage 9 files it).

**Projector-light and ECG-grid** stay monitor themes (skin data). The shell follows the monitor: projector-light
switches the shell to the bench palette so the room is not half-dark.

### 6.3 Typography

| Role | Face (licence) | Why |
|---|---|---|
| UI text, labels, buttons | **IBM Plex Sans** (SIL OFL 1.1) | engineered, unambiguous I/l/1 and 0/O, many weights, reads as instrument rather than web app |
| Instructor & console numerics | **B612** (SIL OFL 1.1; designed for Airbus cockpit displays for legibility under stress) with `font-variant-numeric: tabular-nums` | the shell's numbers (targets, doses, console values) come from a cockpit legibility study, which is the subject's closest cousin; distinct from the monitor's skin fonts so the learner never confuses an instructor readout with a monitor value |
| Engine keys, raw JSON, logs | **IBM Plex Mono** (SIL OFL 1.1) | same family as the UI face; used only where the text *is* code |
| Inside the monitor | skin `font` stack (unchanged) | FU-5 |

Self-host the WOFF2 files (Latin subset; ~25–40 KB per weight; ship Plex Sans 400/500/600, Plex Mono 400, B612 400/700
≈ 180 KB total) with `font-display: swap`; no CDN at runtime (ORs are often offline). Record them in `NOTICES.md` and
`LICENSES/` (OFL is acceptable for fonts; confirm with Ali, §13 Q7).

**Type scale** (1.2 ratio, 15 px base for arm's-length iPad and laptop): 12 · 13 · 15 · 18 · 22 · 26 · 32; numeric
display in the instructor panel 32 / 44. Line height 1.35 for UI text, 1.1 for numerics. Sentence case everywhere; no
all-caps section labels (the current `.pme-section h3` uppercase eyebrows go); units in `--text-muted` after the value
with a thin space ("0.1 µg/kg/min").

### 6.4 Space, size, shape, motion

- **Spacing** 4-px base: 4, 8, 12, 16, 24, 32, 48.
- **Touch targets**: 44×44 px minimum in Instructor/Remote (iPad); 32 px minimum height in Developer (mouse), with
  24×24 px hit area (WCAG 2.5.8).
- **Radii by hierarchy**: 3 px chips and badges; 6 px controls; 10 px cards, drawers and dialogs. The monitor frame is
  square (it is a screen).
- **Elevation**: no drop shadows on dark; separation by surface step (bezel-0 → 1 → 2) and 1 px `--line`. Dialogs use a
  40 % black scrim.
- **Motion**: only in response to the user — drawer slide 180 ms ease-out, dialog fade 120 ms, staged-change pulse
  once. Nothing animates on its own in the shell. Under `prefers-reduced-motion` drawers and dialogs appear instantly.
  The monitor's alarm flash is device behaviour and stays (it is the simulated device, IEC-required), but mirrors of it
  in the instructor panel do not flash (they show a steady colour + icon), so the instructor's eye is not pulled away.

## 7. Component inventory

| Component | Where | Spec notes |
|---|---|---|
| **App shell / top bar** | every view | 48 px; left: product name + view switcher; centre: session bar (patient, mode badge, scenario/state/elapsed, speed); right: alarm count (skin colours), audio, remote code, settings |
| **Monitor frame** | Monitor, Instructor, Vent-link, Explore (small) | wraps `mount()`; square corners; fit-to-region with a *lane-duration* mode ("show 6 s per lane") when the calibrated mm/s cannot fit; never scales the canvas by CSS transform (redraws at the new size); letterboxes in `--bezel-0` |
| **Numeric tile / waveform lane / alarm bar** | inside the monitor | existing renderer components; unchanged (FU-5) |
| **Alarm list (instructor mirror)** | Instructor → Devices, top-bar popover | rows: priority chip (skin colour + text), message in glossary words, time, acknowledged state; actions Silence (90/120 s per skin), Pause, Acknowledge |
| **Buttons** | shell | primary (accent fill), secondary (bezel-3 fill + line-strong border), ghost (text only), destructive (danger, dialogs only), toggle (aria-pressed; on = accent outline + filled dot) |
| **Segmented control** | mode, lead, speed, route | 2–5 options, one tap |
| **Numeric stepper with unit** | targets, pacer mA/ppm, energy J, FiO₂ | − / value / + with long-press repeat; tap value to type; unit suffix; min/max from the glossary normal range and engine limits; out-of-normal values tinted `--text-strong` with a small "outside normal" note (not alarm colours) |
| **Slider with ticks** | severity, ramps, sim speed | always paired with the numeric value and unit; ticks at meaningful points (e.g. severity: mild / moderate / severe) |
| **Dose picker** | Drugs & fluids | drug search (glossary name, class), then presets per drug (e.g. phenylephrine 50 / 100 / 200 µg; noradrenaline 0.05 / 0.1 / 0.2 µg/kg/min), route segmented (IV bolus / infusion / TCI), computed absolute dose for this patient's weight ("0.1 µg/kg/min = 7 µg/min"), "Give" (apply now) or "Stage"; running infusions list with rate change and stop |
| **Rhythm picker** | Vitals & rhythm | grouped list (sinus, atrial, junctional, ventricular, blocks, paced, arrest) with a thumbnail strip from the Stage 5 gallery; modifiers in a collapsible "Modifiers" section with units |
| **Parameter row** | Vitals, console | glossary label + tooltip, value (B612), unit, source badge (MODELED wave / MANUAL pin), sparkline, target field |
| **Drawer** | Instructor on narrow screens, Remote | from the right (landscape) or bottom sheet (portrait ≤ 900 px wide); resizable on desktop (360–560 px) |
| **Dialog** | confirmations, scenario details, patient editor | native `<dialog>`; focus trapped; Esc closes; primary action on the right |
| **Popover / tooltip** | glossary help on every label | Popover API with hover *and* tap; content: long name, unit, adult normal range, source |
| **Scenario card** | Scenario library | title, one-line story, patient, duration, skills/objectives, tags (ACLS, airway, haemodynamics…), "Preview" and "Load" |
| **Scenario run strip** | Instructor → Scenario | states as a horizontal stepper with the current highlighted; next triggers with countdown; Hold / Jump / Bookmark |
| **Table** | Developer console, Labs placeholder | sticky header, zebra by 2 % tone, right-aligned tabular numerics, label column min 16 ch with ellipsis *and* full name in tooltip; columns: label · value · unit · normal · key (mono, muted) · sparkline |
| **Plot panel** | Explore (PV loop, chamber pressures, P–V and F–V loops, Cp/Ce, trends) | Canvas; axis titles with units; legend chips; same line weights as the monitor; one colour per series from the parameter palette |
| **Toast** | after commits | "Noradrenaline 0.1 µg/kg/min started" — same verb as the button; 4 s; also written to the log |
| **Empty state** | Remote not paired, no scenario, review without bundle | one sentence + the primary action ("Enter the 6-letter code shown on the monitor" + QR) |

## 8. Layout and responsive rules

| Viewport | Instructor view (#/teach) | Monitor view | Explore |
|---|---|---|---|
| **1920×1080** (screen / projector) | split: monitor 1360 px + panel 560 px | monitor fills; lanes use calibrated 25 mm/s (≈ 9.5 s visible) | 2-column plots + monitor thumbnail |
| **1440×900** (laptop) | split: monitor ≈ 980 px + panel 460 px | fills | 2-column |
| **1280×800** (small laptop) | split 860 + 420, or monitor full + drawer (user toggle; remembered) | fills; lane-duration mode if a lane would show < 5 s | 1-column plots |
| **iPad landscape 1180×820 / 1024×768** | monitor full + right drawer (overlay, 420 px) — the 6a pattern | fills | 1-column |
| **iPad portrait 820×1180** | monitor on top (16:10 region), panel as a bottom sheet with tabs | monitor rotates to a portrait page (fewer lanes, tiles below) — skin `pages` permitting, else letterbox | stacked |
| **Phone (Remote only)** | panel only, one column | — | — |

Use container queries on the monitor region and the panel, not only viewport media queries, so the same components
work in the split and in the drawer. Minimum monitor region 760 px wide before switching to the drawer layout.

## 9. Accessibility

- **Contrast**: WCAG 2.2 AA in the shell — 4.5:1 body text, 3:1 large text and non-text UI boundaries/focus
  indicators; the token table above is pre-checked. Inside the monitor, parameter colours are vendor data; Stage 9
  reports any skin colour under 3:1 against its background to FU-5 rather than changing it.
- **Colour is never the only cue**: alarm priority has text/shape; MANUAL/MODELED has pin/wave glyphs; toggles have a
  filled dot and `aria-pressed`; staged changes have a dashed outline *and* a count.
- **Colour-vision deficiency**: the monitor's red-green (ART vs ECG) is vendor convention and is disambiguated by lane
  label and position; the shell never encodes meaning in red vs green. Check the shell palette with a deuteranopia and
  protanopia simulation (Chrome DevTools "Emulate vision deficiencies") in the verification run.
- **Keyboard**: every control reachable in a logical order; visible `:focus-visible` ring (`--accent-strong`, 2 px,
  2 px offset); skip link to the monitor; `?` opens the shortcut sheet. Proposed shortcuts (instructor view; ignored
  while typing in a field): `i` panel, `S` silence, `P` pause alarms, `N` NIBP start, `F` freeze, `B` bookmark,
  `Space` pause/resume sim, `1–9` quick actions of the loaded scenario, `/` search (drugs, parameters), `⌘↵` commit,
  `Esc` close/discard dialog. The learner monitor binds none except the reveal gesture.
- **Screen readers**: the monitor canvas has an `aria-label` summary updated ≤ 1 Hz only when the user asks (a
  "Read vitals" button), not a live region spamming every second; the alarm list is an `aria-live="assertive"` region
  for new high-priority alarms in the instructor view only.
- **Touch**: 44 px targets, no hover-only affordances, long-press on steppers, the 5-tap/3-finger reveal kept.
- **Reduced motion / contrast**: honour `prefers-reduced-motion` (shell) and `prefers-contrast: more` (raise
  `--line` to `--line-strong`, muted text to `--text`).

## 10. Performance constraints

- **The sweep must not drop**: the Stage 8a gate stays green — worker path frame intervals p95 < 25 ms at `?fps=60`
  and < 50 ms at `?fps=30` (`docs/gates/stage-8a.md`), with the full shell mounted and the instructor panel open, on
  the 8-lane `validation-perf` load. Add an iPad Safari run (Low Power Mode 30 fps) to the gate.
- **Budget for the main thread** (the worker draws the sweep; the main thread owns DOM numerics, audio, controls):
  shell work per frame ≤ 4 ms p95; no layout reads in rAF; DOM numerics update ≤ 1 Hz (brief §3.4) and the panel's
  live readouts ≤ 2 Hz, batched in one rAF; sparklines on a single shared canvas per table, redrawn ≤ 1 Hz and only when
  visible (IntersectionObserver).
- **Isolation**: the monitor frame gets `contain: strict` and its own compositing layer; panels use
  `content-visibility: auto` for off-screen sections; hidden views are `hidden` (not just off-screen).
- **No backdrop blur over the monitor** (the current drawer uses `backdrop-filter: blur(6px)` over a
  semi-transparent `#111c`; a blur over a canvas that changes every frame makes the compositor re-filter that region
  every frame, a known cost on mobile GPUs — unmeasured here, so the gate should measure it): use an opaque
  `--bezel-1` drawer.
- **Weight**: fonts ≤ 200 KB total; no new JS dependencies; shell JS ≤ 60 KB gzipped.
- **Console**: 1,600+ rows must stay virtualised or grouped-collapsed by default; render time is already shown
  (`render 5.5 ms`) and must stay < 8 ms at 1 Hz.

## 11. Verification plan

1. **Playwright screenshot matrix** (system Chrome locally, bundled Chromium + WebKit in CI): views {Start, Monitor
   (saadat-like, philips-like), Instructor (each tab), Remote (paired and empty), Explore (each panel), Ventilator
   linked, Developer console, Settings} × breakpoints {1280×800, 1440×900, 1920×1080, 1180×820 iPad landscape,
   820×1180 iPad portrait} × theme {dark, projector-light for Monitor/Instructor}. PNG ≤ 60 KB each (crop to the view,
   posterise if needed), saved under `docs/gates/stage-9/`. Wait for a real 8 s warm-up (not virtual time) so waveforms
   are populated.
2. **Visual assertions** in the e2e: no horizontal scroll at any breakpoint; no element with `scrollWidth >
   clientWidth` in labels (clipping); the monitor frame's canvas CSS width equals its container width ± 1 px; no
   native-styled control (`appearance: auto`) in the shell.
3. **Glossary lint**: a unit test walks every rendered label in the shell and console and fails on any string that is
   an engine key not wrapped in the "Model internals" style, and on any collision in R56 (CPP/CoPP, PI, SR, RR/R–R,
   SO₂).
4. **Accessibility audit**: axe-core run in Playwright on every view — licence MPL-2.0; it is a **dev-only** test
   dependency and never shipped, but it is not MIT, so ask Ali (§13 Q8); fallback is a manual `design:accessibility-
   review` pass plus Chrome Lighthouse (bundled in Chrome, no dependency). Plus: keyboard-only walkthrough script,
   contrast table re-computed from the token file, CVD emulation screenshots.
5. **Performance**: the Stage 8a frame histogram with the shell mounted and panel open, 60 and 30 fps; 20-min soak;
   iPad manual run recorded in the gate note.
6. **Usability check with Ali** (and ideally two residents): five timed tasks — load the ACLS VF case; give
   noradrenaline 0.1 µg/kg/min; pin SpO₂ at 85 % then release it; silence the alarm and bookmark; find the patient's
   compliance and driving pressure. Target: each < 30 s without help.

## 12. Dependencies and licences

- **None added at runtime.** Platform features only: CSS custom properties, container queries (Safari 16+),
  `<dialog>` (Safari 15.4+), Popover API (Safari 17+; fallback: `<details>` or a positioned `div` for iPadOS 16),
  `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`.
- **Fonts**: IBM Plex Sans / Plex Mono and B612 are SIL OFL 1.1 — permitted for bundling with attribution; not "MIT"
  but not code either. Requires Ali's confirmation that NOTICES rules accept OFL for font assets (§13 Q7). Fallback:
  the system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto`) plus `ui-monospace`, at no licence cost.
- **Test-only**: `@axe-core/playwright` (MPL-2.0) — optional, dev-only (§13 Q8).
- Anything else proposed during planning needs a licence check against `NOTICES.md` (MIT, BSD, ISC, Apache-2.0 only
  for code).

## 13. Questions for Ali (with a recommendation each)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Is the default landing screen the **Instructor view** (monitor + panel) or a **Start** screen with task tiles? | Start screen on first visit, then remember the last view; a `?view=` URL for course links |
| Q2 | Should the learner monitor default to **saadat-like with `iran-icu-as-found`** (alarms off) for the orientation course? | Yes for the course preset; factory saadat-like for Explore; philips-like as the "international" option |
| Q3 | Keep the stage harness pages reachable in the release build? | Only under Developer → Stage harnesses; excluded from the Start screen |
| Q4 | Instructor on the **same screen** (hidden drawer) or a **second device** by default? | Both; default same-screen split on laptops ≥ 1280 px, drawer on iPad, Remote pairing by QR offered on the session bar |
| Q5 | The accent "periwinkle" for instructor state and the graphite bezel (vs pure black everywhere)? | Graphite bezel + periwinkle; black stays for the monitor only |
| Q6 | Drug dosing presets: whose defaults (Miller/Barash adult doses, your department's)? | Start from the 7g library's ranges; Ali reviews one table before Stage 9 code |
| Q7 | Accept SIL OFL fonts (IBM Plex, B612) as bundled assets? | Yes — OFL is font-specific and compatible with MIT code distribution; attribute in NOTICES |
| Q8 | Allow `@axe-core/playwright` (MPL-2.0) as a dev-only test dependency? | Yes as dev-only; never shipped; otherwise manual audit + Lighthouse |
| Q9 | Should the console show engine keys at all in the release? | Yes, muted mono in a secondary column, and under "Model internals" collapsed by default |
| Q10 | Labs panel placeholder (7i deferred): show an empty "Labs — coming in v1.1" tab, or hide it? | Show the tab with the existing 16-row ABG panel (already computed) relabelled by the glossary, and "more in v1.1" |
| Q11 | Persian UI text anywhere (the course is in Iran)? | No for v1 (English clinical vocabulary is what the monitor shows); Jalali date stays a skin option |
| Q12 | Learner actions (the 6b "Learner:" buttons): keep for self-directed practice? | Keep, as a separate "Learner controls" strip that the instructor can enable per scenario; group by category |
