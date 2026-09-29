# 13 — UI benchmark study for Stage 9 "clinical UI" (R55, R56)

*Written 2026-09-28 by the UI benchmark researcher. Read-only on the repo. Screenshots of our demo were taken from a
throwaway clone of `main` at `64c5cbd` (the playground is at the older `7fc1f27`), served by Vite on 127.0.0.1:5181
and captured with Playwright driving the system Google Chrome at device scale 1 after a 9–10 s real-time warm-up
(headless `--virtual-time-budget` screenshots do not advance the worker, so they show empty monitors).
All images are in `research/13-ui-benchmarks/current/` (PNG, ≤ 200 KB; three were posterised to fit).*

**Companion:** `research/13-ui-design-brief-draft.md` is the executable design brief for the Stage 9 plan writer.

**Design skills used.** The `design:design-critique` framework (first impression → usability → hierarchy →
consistency → accessibility) structures §1; `design:accessibility-review` (WCAG 2.2 AA) and `frontend-design`
principles feed §1.4 and the brief. Contrast ratios quoted below were computed with the WCAG 2.x relative-luminance
formula from the hex values in the skins and CSS.

---

## 1. An honest critique of the current UI

### 1.0 First impression (the two-second test)

The **monitor itself is good**. Across every page that mounts it (`stage1`–`stage7g`, `physiology-console`,
`stage4b-device`, `vent-link`) the sweep is smooth, the parameter colours are the right vendor colours, numerics are
large and tabular, and the saadat-like and philips-like skins read as a real bedside monitor from across a room
(`stage4a-skins.png`, `stage4a-philips-alarm.png`). That part is FU-5's and must survive Stage 9 untouched.

**Everything around the monitor looks like an engineering test bench, because it is one.** The app is 25 separate
HTML pages, each a stage's acceptance harness, with its own inline `<style>`, un-styled native form controls
(white macOS buttons and selects on black), fieldset/legend boxes, and a green monospace debug readout
(`t 00:39 DI 93 SR 0% MAC end-tidal 0 …`). There is no shared stylesheet (0 of 25 pages link one), no navigation
between pages, no page chrome, and no notion of "a session". A resident landing on `index.html` sees a bulleted list
of 16 green underlined links titled by build stage ("Stage 7f: neuromuscular block, TOF, anaesthetic depth, drive
depression") — the IA is the build plan, not a clinical task.

The emotional read is "impressive physics, unfinished product". Ali's complaint is justified, and the fix is not the
monitor: it is the frame, the controls, the language and the navigation.

### 1.1 Page by page

| Page (screenshot) | What it is today | Critique |
|---|---|---|
| `index.html` (`index.png`, `index-ipad-portrait-820x1180.png`) | A bulleted list of links by stage number, in build order (0, 1, 2, 3, 7c, 7b, 4a, 7a, 7g …), bright green underlined on black, system font | No product name, no purpose statement, no grouping by task (teach / run a scenario / explore physiology / validate), no thumbnails. **Four pages are unreachable from it**: `stage5` (rhythm library), `stage7d` (brain/kidney/liver), and all three `validation-*` pages. The ACLS link carries `?scenario=acls-vf-witnessed`; opening `stage6b-acls.html` without it shows "No scenario loaded", so the deep link is load-bearing but invisible. Link colour #00F000-ish green reads as "ECG", which is a clinical colour being spent on navigation. |
| `physiology-console.html` (`physiology-console.png`, `-full`, `-1280x800`, `-ipad-portrait-820x1180`) | Developer console: a scaled-down monitor at top-left, an "actions rail" of seven fieldsets below it, and collapsible tables of every truth leaf by organ in columns to the right | The richest page and the most unprofessional-looking. (1) The monitor is squeezed to ~600 px so the ECG lanes are 170 px wide and show one beat; lane labels overlap the calibration pulse ("II M" drawn over the 1 mV box). (2) The right-hand tables show **engine keys, not clinical names**: `cpLp`, `cpSet`, `es`, `ev`, `mapLp`, `offT`, `dtf0`, `eesF`, `hyp`, `ischT`, `kIsch`, `stMv` — research/11 counted 903 of 1,087 visible leaves labelled by raw key. Even the curated rows truncate ("Coronary pe…", "Ischaemia f…", "R systemic (…") because the label column is fixed. (3) The monitor-output table lists `awrr mon`, `imco2 mon`, `tempSite mon`, `uop mon` — the glossary says awRR, FiCO₂, T2, UO. (4) The actions rail is a wall of 30 raw inputs with no units beside some values ("severity 0.8", "RM 40 cmH₂O × 30 s"), free-text drug and condition names ("phenylephrin" truncated in a text box), and "Raw command (JSON body)" at the bottom. (5) At 820 px portrait the label column of "Monitor output" collapses to zero width and the table shows numbers with no names (`physiology-console-ipad-portrait-820x1180.png`). (6) "baseline: pending (auto at 1:00)", "1638 values · truth 1428 leaves 24.9 KB · render 5.5 ms" are developer telemetry in the primary header. As a *developer* console most of this is fine; as the only place an instructor can see CO, SVR, SvO₂ or compliance it is not. |
| `stage4a-skins.html` (`stage4a-skins.png`, `-philips-alarm`, `-ge-like`, `-iran-icu-as-found`, `-projector-light`) | Skin preview with a two-row toolbar of test buttons ("Raise saadat level 1", "chargeReady", "nibpDone", "Beep SpO2 90") and a lane-contract debug line | The best-looking monitor frames in the app: header row (P1, BED 01, ADULT, skin name, clock), alarm bar with three coloured priority chips, correct per-skin lane labels ("II X1 NORMAL 25 mm/s AUTO"). But the toolbar uses camelCase event ids as button text (`chargeReady`, `nibpDone`) and the alarm bar renders all three priority chips at once as a legend, so it is not clear what is *active*. The projector-light theme drops NIBP to mid-grey (≈#8A8A8A on white, **3.45:1**: the big "121/82" passes the 3:1 large-text rule, but the small "(98)" mean and the "NIBP" label fail 4.5:1) and resp to olive (4.55:1). Timestamp is frozen at "25/06/2023 12:14:05" (fixture clock). |
| `stage4b-device.html` (`stage4b-device.png`, `-alarms-on-brady`, `-1280x800`, `-1920x1080`) | Saadat-like device layer with defibrillator, pacer, alarms, 12-lead, trends and event log controls | Functionally the most complete "real monitor" page. Problems: the idle alarm bar is a **light-grey slab** (#E0E0E0) spanning the header — the brightest object on screen when nothing is wrong, which inverts the "dark when normal" rule (on the real B9 it is the idle message field; in a teaching frame it should be quiet). When an alarm fires (`-alarms-on-brady.png`) the bar turns red "HR TOO LOW", the HR numeric flashes (captured in its dark phase: dark-green "49" nearly invisible) and there is no count of active alarms or a list. The controls below are six fieldsets of mixed native widgets; the defibrillator shows "J 200" as a text box with "outcome: table" (engine jargon); the pacer row has "threshold 70" with no unit. The monitor **does not scale**: at 1920×1080 it stays 1280 px wide with 640 px of black to the right; at 1280×800 the controls fall below the fold. The trends pane shows spikes on a 0–200 axis labelled `hr 0–200`, `abpSys 0–200` — engine keys again. |
| `stage6a.html` (`stage6a.png`, `stage6a-instructor-panel.png`) | Host monitor (ECG only + HR) with the hidden instructor drawer (press `i`, 5 taps top-left, or three-finger hold) | The **drawer is the right pattern** and the closest thing we have to a product UI: tabs (Controls, Log, Bookmarks, Scenario, Device), uppercase section heads, 44 px tabs (36 px controls), a staging bar ("Stage changes · 0 staged · Commit · Discard"). Weaknesses: it covers 30 % of the monitor instead of the monitor reflowing; the Controls tab is still raw ("RSA depth 0.67 Set", "Noise 1 Set", one "Set" per field); there are no MANUAL/MODELED badges visible on this page; the hint text "Press i (or tap the top-left corner 5×, or hold three fingers)" runs under the drawer; the session code is set in a heavy serif ("AGD5YJ") that matches nothing else. |
| `stage6a-remote.html`, `stage6a-viewer.html` | Remote controller (join by code) and second-screen viewer | The remote starts as a single row "Session code · This browser · Join · not joined" on an empty black page — no explanation of what to do, no QR code, no pairing guidance. The viewer without a session is a blank black page (and throws "no session" in the console). |
| `stage6b-acls.html` (`stage6b-acls.png`, `-instructor-panel`, `stage6b-ipad-landscape-1180x820.png`) | ACLS scenario runner: monitor, a "Learner:" row of red-outlined action buttons, a scenario status line | Good idea (learner actions as big buttons), wrong execution: every action is the same red-outlined button (Charge, Shock, CPR, drugs, fluids) so nothing is grouped or prioritised; "Adenosine 6 mg" and "Adenosine 12 mg" are separate buttons but the defib energy is fixed at 200 J; the yellow "No scenario loaded (press i → Scenario)" is the most prominent text on screen. The Scenario tab lists "[draft] Witnessed VF in PACU" in a native select plus "Choose File" and a URL box: no description, duration, learning objectives or state diagram before loading. Only ECG + HR are shown — no SpO₂, BP or EtCO₂ tile, which in an ACLS case removes the EtCO₂-during-CPR teaching point. |
| `stage7a.html` … `stage7g.html` (`stage7a.png` … `stage7g.png`, `stage7g-1920x1080.png`) | Per-stage physiology demos: monitor left/centre, a right column or bottom row of "scenario" buttons, a green monospace truth readout | These are where the teaching value lives (PV loops, chamber pressures, lung units, ICP/CPP, MH, TCI), but each page invents its own layout: 7a right sidebar with PV loop + chamber plot; 7b two green ellipses for lungs + an empty 700×250 "Ventilator (built-in)" box; 7c a monospace "Live chemistry (truth)" table with engine casing (`PCO2`, `SO2`, `iCa`); 7d numbers "ICP mmHg 12 CPP 76 / PbtO2 25 / UO 74 Σ 0 mL" as a header strip plus an empty black trend box; 7e buttons like "Diabetic hypoglycaemia under GA"; 7f tiles "NMT (TOF) -- stimulator off", "DEPTH (BIS-like) --", "AGENT --" in a separate column outside the monitor; 7g "depth index: 7f pending". Buttons encode dose and timing in their label ("TCI propofol Ce 4 + remifentanil Ce 3 (roc 0.6 at +180 s)"), which is precise but unreadable at a glance. The monitor lanes overflow the viewport on 7a/7d/7e/7g (CO₂ lane cut at the bottom). The 7b lung-condition dropdown's first entry is "1. Pulmonary hypertension (group 1 default) / RV failure under PPV" — catalogue numbering leaking into UI. |
| `stage5.html` (`stage5.png`) | Rhythm library: monitor + 17 modifier controls + a gallery of rhythm strips on ECG paper | The gallery (II and V1 strips on a green grid with the rhythm name top-right) is the most "textbook" and attractive teaching view we have. The modifier row mixes sliders, selects and buttons with unit-less values ("Axis ° 60", "Low voltage 1", "Mains 0", "Morph. variation 0"), and "K⁺ 4.2" sits next to "Temp °C 37" as if they were rhythm modifiers. Not linked from `index.html`. |
| `stage0`–`stage3` | Early engine harnesses | Fine as regression harnesses; should leave the user-facing navigation. `stage3` has good content ("Apnoea after preoxygenation (×4)", "SaO₂ truth (white) · displayed SpO₂ (cyan) · last 6 min") that belongs in a scenario library. |
| `vent-link.html` (`vent-link.png`), `vent-hamilton.html` (`vent-hamilton.png`) | The Hamilton-style ventilator (navy "cockpit") beside the monitor; the ventilator alone | **The most professional screen in the app** and the proof that the team can do it: a coherent navy palette, rounded control cards with value + unit + label ("500 ml VT"), a mode badge "(S)CMV+ Adult", an alarm strip "No active alarms", a bottom tab bar (Monitoring / Utilities / Events / System), axis-labelled Paw/Flow/Volume loops. Weaknesses: it lives in a different visual language from the monitor (navy vs black) with no shared chrome; in `vent-link` the "R27 demonstrations" (ruling number!) buttons and "Circuit: Disconnect" sit above it in plain native controls; the footer disclaimer "Independent educational reimplementation — not affiliated with any manufacturer" is ≈2.3:1 and partly clipped; the numeric labels use vendor jargon (fTotal, VTE, ExpMinVol) that is correct for a Hamilton but should get glossary tooltips. |
| `validation-bedside.html` (`validation-bedside.png`) | Saadat bedside checklist for Ali's capture | Serviceable form; the form rows are unstyled native inputs, "not-checked" select per item, long page (2,036 px) with no progress indicator or section index. Internal tool — keep, restyle lightly. |
| `validation-review.html`, `validation-perf.html` | Blind realism review; performance gate | Internal tools. The review page is a blank page with "Choose File" until a bundle is loaded — no empty-state guidance beyond one paragraph. The perf page is a monitor with a telemetry line and is fine as is. |

### 1.2 Cross-cutting findings (by the critique framework)

**Usability**

| Finding | Severity | Recommendation |
|---|---|---|
| No navigation: 25 pages, no header, no back link, no way to get from a monitor to the console or ventilator without editing the URL | Critical | One app shell with a persistent top bar and a small set of task-based destinations (§4) |
| The information architecture follows the build plan (stage numbers), not the user's task | Critical | Group by task: *Teach* (monitor + instructor), *Scenarios*, *Explore physiology*, *Ventilator*, *Validate*, *Developer* |
| Controls are raw engine parameters (severity 0.8, RM 40, outcome: table, threshold 70, Noise 1) with one "Set"/"Apply" per field | Critical | Clinical controls with units, ranges, presets and a single staged Commit (the drawer's staging bar already does this) |
| Labels are engine keys in ~40 % of places a resident looks (research/11 §0) | Critical | Apply the R56 glossary everywhere through one generated `glossary.ts` |
| MANUAL vs MODELED is a dropdown on two pages and a small flag in the drawer; which values are pinned is invisible on the monitor view | Moderate | A persistent mode badge in the instructor bar + per-parameter pin chips (CAE Maestro's "system override" flag pattern, research/01 §2.3) |
| Scenarios are buttons with the whole recipe in the label; no description, objectives, duration, current state or next transitions shown before or during a run | Moderate | Scenario cards (title, one-line story, patient, duration, objectives) and a run view with state, elapsed, next triggers, event log |
| Patient profile is scattered: "Adult 40 y 70 kg" select in the console, "Preset" + AS/MR/AR/HFrEF in 7a, "TBI profile (restart)" in 7d, `adult` in 4b | Moderate | One Patient card (age, sex, weight, height, comorbidities, pregnancy later) reachable from every screen, with "restarts the patient" made explicit in a confirm dialog |
| Sound needs a per-page "Enable sound" click and there is no global audio state indicator | Moderate | One audio unlock at session start; a speaker icon with volume and "alarms silenced 1:47" countdown in the top bar |
| No empty states (viewer, remote, review, ACLS without a scenario) | Minor | Each empty page says what to do and offers the primary action |

**Visual hierarchy**
- *What draws the eye first:* on monitor pages, the numerics — correct. On `stage4b`/`validation-bedside`, the light-grey idle alarm bar — wrong. On `stage6b`, the yellow "No scenario loaded" — wrong. On the console, the dense truth tables — wrong for an instructor, right for a developer.
- *Reading flow:* monitor → controls works where controls sit below (4b, 2, 3, 5); it breaks where controls are a right sidebar that scrolls separately (7a, 7d) or a column of loose tiles (7f).
- *Emphasis:* developer telemetry (render ms, leaf counts, `t 9.0 s · applied 0 · rejected 0`) is shown at the same weight as clinical state.

**Consistency**

| Element | Issue | Recommendation |
|---|---|---|
| Colour | At least 14 hard-coded page backgrounds (#000, #111, #050505, #0d2350, #10264d …); link green = ECG green; "on" buttons are #2A2 green fills | Tokens: surface scale + one accent that is **not** a parameter colour |
| Typography | system-ui (monitor, drawer), ui-monospace (readouts), a heavy serif (session code), SF default in native controls; tile headers 16 px, readouts 11–12 px | One UI face, one mono face, one numeric face, a 6-step type scale |
| Controls | Native macOS controls (white) on black pages; the drawer's own dark controls; the ventilator's navy cards — three button styles | One button/select/input/slider set in the shell; the ventilator keeps its device look inside its frame |
| Labels | "ABP" (console, perf page) vs "ART" (skins, glossary), "NBP" vs "NIBP", "SPO2" vs "SpO2", "BFA" vs "DEPTH (BIS-like)" vs "depth index" | Glossary labels, skin aliases only inside the monitor frame (R56 rule 2) |
| Layout | Monitor width fixed at 1280 px on some pages, fluid on others; controls below on some, right on others | One grid: monitor region + instructor region with defined breakpoints |

**Accessibility (WCAG 2.2 AA; our computations)**
- *Contrast:* parameter colours on black pass comfortably (ECG #00F000 13.5:1; ART #FF4040 6.1:1; saadat magenta #F000F0 6.0:1). Failures: projector-light NIBP grey **3.45:1**, the ventilator footer ≈**2.3:1**, and pure blue (#0000FF, 2.4:1) must never be used for text on black (Philips' option-#H30 "Blue" CVP needs a lightened tint, e.g. #6A9BD9 at 7.3:1). The IEC white-on-red message bar is 4.46:1 with #F00000 — borderline; saadat's black-on-red is 4.71:1.
- *Colour-only meaning:* alarm priority is conveyed by colour and flash only in the tiles; the message text has `***`/`**`/`*` prefixes in the IEC skins but not in saadat (`prefix: none`). The instructor UI must add a text/shape cue.
- *Touch targets (measured with Playwright, 1440×900, every visible button/select/input/link):* median control
  height is **18–23 px on every page except the 6a/6b drawer (36 px)**; on `index`, `physiology-console`, `stage4a`,
  `stage4b`, `stage5`, `stage7b/d/f`, `vent-link` and `validation-bedside` **100 % of controls are under 24 px** in at
  least one dimension, which fails WCAG 2.2 SC 2.5.8 (24×24 minimum) as well as the 44 px iPad target the brief's
  "iPad, laptop or projector" users need. Even the drawer, whose CSS says "≥ 44 px targets", has 44 px tabs but 36 px
  inputs and buttons.
- *Labels (SC 1.3.1 / 3.3.2 / 4.1.2):* inputs with no programmatic label — console 33, drawer (6a/6b) 18,
  `validation-bedside` 10, `stage4b` 9. No page has a `main`/`nav` landmark except the console and the drawer; 24 of 25
  pages have no `h1`.
- *Keyboard:* only `i` (drawer) is bound; there is no visible focus style on native controls against black, no skip link, no documented shortcuts for Silence / Freeze / NIBP start.
- *Motion:* the 2 Hz red flash is required by IEC for the *monitor*; the instructor UI must not add further flashing, and a `prefers-reduced-motion` user should still see the flash on the monitor (it is the simulated device) but not animated panels.

**What a resident would not understand** (sampled from the screenshots): `cpLp`, `es`, `ev`, `gv`, `dtf0`, `kIsch`, `Pmsf`, `Ees LV`, `hyp`, `ischT`, `awrr mon`, `imco2`, `tempSite`, `uop`, `outcome: table`, `threshold 70`, `Morph. variation`, `U surface 0.00`, `opioid 0.00 ng/mL remi-eq`, `DI 93`, `SR 0%` (sinus rhythm or suppression ratio?), `drive: opioid 0 hypnotic 0 resting VE ×1 obstruction 0`, `aer 100 %` in the lung panel, `kLac 1.64/h`, `HBF 120 %`, `R27 demonstrations`, `7f pending`, `(S)CMV+` without a tooltip, `Σ 0 mL`.

**What looks unprofessional:** native white buttons on black; camelCase ids as button text; ruling and stage numbers in UI copy; monospace debug lines under every monitor; clipped text in boxes ("phenylephrin", "tamponad", "Coronary pe…"); the monitor not filling the screen; a frozen 2023 fixture clock; the grey idle alarm slab; overlapping lane label and calibration pulse on the console's shrunken monitor; the lungs drawn as two flat green ellipses.

### 1.3 What works well (keep it)

- The **sweep renderer and skins** (FU-5): vendor-correct colours, erase-bar sweep, per-lane speed/gain/filter labels, big tabular numerics, alarm limits in tiles, crossed-bell icons, the saadat P1 frame. Stage 9 wraps them; it does not restyle their interiors.
- The **instructor drawer** (Stage 6a): hidden reveal gestures, tabs, staging bar, the largest targets in the app (44 px tabs, 36 px controls), log and bookmarks. It is the seed of the instructor panel.
- The **ventilator cockpit** (Stage V): it shows the visual quality the rest should reach — a consistent palette, cards with value/unit/label, a bottom tab bar, a mode badge.
- The **ECG-paper gallery** in Stage 5 and the **PV loop / chamber pressure** plots in 7a: excellent teaching visuals to promote into a "Explore physiology" view.
- The **console's search, "changed only", baseline diff and sparklines**: the right developer affordances; they need clinical labels and grouping, not removal.

### 1.4 Priority recommendations from the critique

1. **One app shell and task-based navigation** (§4): kills the 25-page maze, gives every screen a home and a way back.
2. **Glossary everywhere** (R56): clinical label + tooltip long name + unit, generated from research/11 §5; engine keys only under "Model internals".
3. **A real instructor panel** grown from the 6a drawer: patient card, scenario runner, vitals/rhythm, interventions (drugs, fluids, airway, ventilation, defib/pacer), events, log — with MANUAL/MODELED made visible.
4. **Design tokens and one control set** so the shell, the drawer, the console and the ventilator frame look like one product while the monitor keeps its skin.
5. **Responsive monitor frame**: the monitor scales to its region (fit-width with the brief's calibrated mm/s preserved per lane), at 1280×800, 1920×1080 and iPad, with the instructor region collapsing to a drawer.

---

## 2. The benchmark

**Sources and confidence.** Vendor facts reuse the primary sources already verified in research/01, /05 and /06
(cited as `[01 §x]`, `[05 Sn]`, `[06 Sn]`, whose URLs are listed there and repeated in §5). Three parallel web
sweeps (commercial monitors, simulators/open source, standards/design systems) were launched for this report; where a
statement below comes from general product knowledge that this pass could not re-open, it is tagged **[verify]** and
must be checked before it drives a design decision. No vendor screenshots are reproduced (licensing); screens are
described.

### 2.1 Philips IntelliVue MX series (MX450–MX850; the MP-series manuals apply) [05 S1, S2]

- **Layout grid.** Waves in horizontal lanes on the left, numerics in coloured blocks on the right, each in the
  parameter colour; header with patient/bed and alarm-message fields; SmartKeys along the bottom
  [05 §2.7; S2 "Understanding the ECG Display"]. "Auto Fill Waves" and the channel count are configurable [S1].
- **Lanes.** Lead label, a 1 mV calibration bar, a filter letter under the lead label, pace and sync marks, optional ST
  numerics beneath the wave [S2]. Global 25 mm/s, respiratory 6.25 mm/s, per-channel override [S1].
- **Numerics.** The NBP block shows sys/dia, mean, the alarm source, the mode and repeat time ("Auto 60min") and the time
  of the last measurement; during a measurement it shows cuff pressure instead of the units [05 §2.4; S2].
- **Alarms.** Red / yellow / light-blue INOP; `***` / `**` / `*` prefixes; the message shows deviation and limit
  ("**SpO2 94<96"); the numeric in alarm flashes and the violated limit is shown brighter; "Traditional" vs "ISO" sound
  profiles [05 §2.5; S1, S2].
- **Navigation.** Touch on any wave or numeric opens its setup menu; SmartKeys give one-touch access to common
  functions; **Screens** (pre-configured layouts) are chosen per care area and switched from a Screens key; **Profiles**
  bundle screen + measurement settings + alarm limits per patient category [S1 "Screens", "Profiles"].
- **Excellent:** Screens/Profiles as named, swappable layouts; the "deviation < limit" alarm text; consistent colour
  per parameter everywhere (numeric, wave, trend, alarm limit).
- **Avoid:** deep setup menus (the configuration guide is 700+ pages); layouts that are configuration-mode only.
- **Philips Visual Patient Avatar** (Tscholl et al., University of Zurich; commercialised by Philips) shows vital signs
  as an animated avatar (colour, pulsation, breathing) beside the numerics; the studies report faster and more accurate
  perception of several vital-sign states by anaesthesia professionals than conventional monitor displays
  [verify: Tscholl DW et al., *Br J Anaesth* 2018 and follow-ups; Philips product page]. For us: a **teaching overlay
  idea for Explore**, never a replacement of the learner monitor.

### 2.2 GE HealthCare CARESCAPE B450 / B650 / B850 [05 S3]

- **Layout.** Waveform field left, parameter windows right, a colour-coded **alarm light area** at the top, and a
  menu/quick-key row at the bottom; 15″ (B650) and 19″ (B850) with the ECG aspect ratio tuned per size — GE warns that
  larger external displays change waveform size and sweep [05 §2.2; S3].
- **Parameter windows** open their menus on touch; colours configurable per IP label and parameter
  ("Monitor Setup > Colors") [05 §2.1, §2.7; S3].
- **Alarms.** Red high / yellow medium / cyan low [05 §2.1]; the ECG "Maximum" filter shows an on-screen warning
  ("alters morphology") — a model for **teaching warnings shown in the device's own voice** [05 §2.2].
- **Excellent:** alarm light area separate from the message text; per-label colour; size-aware waveform scaling
  statement (supports our "fit N seconds" mode).
- **Avoid:** menu depth; many similar-looking grey quick keys [verify].

### 2.3 Mindray BeneVision N series (N12–N22) [05 S4]

- **Layout.** Waves left, numerics right, with a top status/alarm area and a bottom quick-key bar; big-numerics and
  multi-lead layouts selectable ("Screen Setup"); up to 120 s waveform freeze with a scroll-back time [05 §2.7; S4
  §3.12].
- **Alarmed numerics** are a coloured **box behind the number**: white text on flashing red (high), black on flashing
  yellow (medium), black on flashing cyan (low) [05 §2.4; S4 §10.3.3] — the clearest priority encoding in the set.
- **Lamp** red 1.4–2.8 Hz, yellow 0.4–0.8 Hz, cyan steady [05 §2.5; S4].
- **Excellent:** box-behind-numeric alarm encoding; freeze with a time ruler; OxyCRG and other neonatal "clinical
  assistive" pages [verify]; a touch UI with large tiles.
- **Avoid:** ISO vs "Mode 1/2" sound profiles that change meaning between units [05 §2.5].

### 2.4 Dräger Infinity (M540, Delta, Acute Care System) and Vista 120/300 [verify]

- **Layout.** The M540 is a transport "pod" that docks into a bigger display; the Infinity Acute Care System splits
  a medical-cockpit display from the monitoring unit so that monitoring and therapy (ventilator, anaesthesia
  workstation) share one screen family. Waves left, numerics right, alarm bar top, a fixed menu bar bottom.
- **Excellent:** one visual family across monitor, ventilator and anaesthesia workstation — directly relevant to our
  monitor + ventilator + drug panels.
- **Avoid:** proprietary pictograms without text.

### 2.5 Nihon Kohden Life Scope (BSM-6000, G5/G7/G9) [verify]

- Waves left, numerics right; configurable "graphic" displays of haemodynamic and respiratory trends; a dedicated
  alarm area at the top. Worth noting as the vendor most associated with **trend-graphic screens** (histograms and
  combined trend windows) in ICU use.

### 2.6 Masimo Root with Radical-7 [verify]

- A bedside hub whose touchscreen rotates between landscape and portrait and whose layout reflows to it; SpO₂, PR, PI
  and other rainbow parameters as numerics with small in-tile trends; "UniView"-style single-screen views; an Adaptive
  Threshold Alarm for SpO₂ that adjusts the effective limit to the patient's baseline.
- **Lessons:** a monitor can **reflow between orientations** (our iPad portrait case); **in-tile micro-trends** give
  "which way is it going" without a trend page.

### 2.7 Saadat Alborz B9 / Alvand (the monitor our residents meet) [06 S1–S3]

- Black background, 1-px grey dividers, bright-green window frame, pink focus fill, yellow soft-key cells, yellow
  "ADULT" label; **three numbered alarm levels** with black text on red / yellow / cyan and a grey idle bar; the menu
  opens in the wave area bottom (covering 1–6 lanes) with EXIT bottom-right; ten pages including a PUMP page for
  bypass; alarms OFF at power-on; English UI with an optional Jalali date [06 §3–§4; brief §3.8, §6.8–6.9].
- **Lesson:** fidelity to *this* monitor is the teaching goal ("the alarms are off; turning them on is step one"), so
  the saadat-like skin is the default learner monitor for the course and its quirks stay inside the monitor frame.

### 2.8 Cross-vendor conventions (all six vendors agree)

1. Waves left, numerics right, one colour per parameter used for wave, numeric, limits and trend.
2. ECG green, SpO₂ cyan (magenta on Saadat), arterial red, PAP yellow, CO₂ yellow or white.
3. True black background; a white or light "outdoor/projector" alternative exists.
4. Big tabular numerics with the unit and alarm limits small in the tile corner.
5. A dedicated alarm area at the top; red / yellow / cyan (or light blue) priorities; priority repeated in text.
6. Erase-bar sweep left to right; respiratory channels at a slower speed.
7. Touch the thing to configure it (numeric or wave opens its own menu).
8. Named layouts (Screens / Pages / Profiles) chosen per care area.
9. Technical alarms (INOP) look different from physiological alarms.
10. Freeze, trends and event recall are one tap away.

**Differentiators of the best:** box-behind-numeric alarm encoding (Mindray); deviation-and-limit alarm text
(Philips); in-tile micro-trends and orientation reflow (Masimo); one visual family across monitor + ventilator +
workstation (Dräger); avatar/configural displays backed by human-factors studies (Visual Patient; Drews & Doig's
configural vitals display for ICU nurses, *Human Factors* 2014 [verify]).

### 2.9 Simulators and educational monitors

| Product | Learner monitor | Instructor UI | Excellent | Avoid |
|---|---|---|---|---|
| **Laerdal LLEAP Patient Monitor / SimPad PLUS** [01 §2.2] | Max 5 waves, 14 numerics; profiles set layout, colours, units, alarm defaults; traces stay blank until the sensor is "attached" (5 ways); ±5 % natural variation; alarm pause 3 min with countdown | LLEAP instructor app on a PC; SimPad handheld with Manual ("on the fly"/"Themes") and Automatic (pre-programmed) modes; time-stamped log | **Profile vs scenario-initial-state split**; sensor-attachment gating; per-scenario "what learners may reconfigure" | A Windows-era dense instructor UI [verify]; licensing tied to hardware |
| **iSimulate REALITi 360** [01 §2.1] | 29+ device skins (monitor, defib, ventilator) on an iPad/monitor | iPad: each vital a **rotary dial + "send"** (stage then commit); show/hide per channel; trend any change over **10 s–15 min with a blue progress marker**; a **virtual time cursor** to fast-forward; countdown and elapsed timers; flag markers; scenarios as action steps + text steps, checklists graded yes/no or 0–10 | Stage-then-commit; visible trend progress; fast-forward; device skins | Manual-only physiology (the capnogram I:E hand-patched, [01 §1]); dial controls are slow for exact values |
| **CAE (Elevate) Maestro + TouchPro** [01 §2.3] | TouchPro monitor in a browser; layout presets "ICU–Arterial Line", "ICU-OR" …; per-signal colour/limits/scale | **Modeled vs Manual** with per-parameter override and a "Modeled" return button; **factor inputs** (HR ×2.0); **onset** on most parameters; flags: blue rotating = in transition, yellow = system override; SCE editor with states + transitions on treatment/assessment/vitals/meds/fluids/time; live "jump to state"; **bookmarks that restore physiology**; colour-coded event log | The only MODELED/MANUAL product; transition flags; bookmarks | Complexity: the full SCE editor is an expert tool |
| **Gaumard UNI 3 / Gaumard Vitals** [01 §2.4] | Virtual bedside monitor with on-demand 12-lead | "Over 30 vital signs" in fly-out menus; an **MI-territory → 12-lead** generator (click an occlusion on a 3D heart); a PQRST point editor | Direct-manipulation physiology authoring | Fly-out menu depth [verify] |
| **SimMon** (Castle+Andersen) [01 §2.9] | Phone/tablet monitor | Second device; **drag a value up/down** to change it; presets and "scripts" | The fastest single-value change of any product | Few parameters; no physiology |
| **TrainingMonitor.app** (free web) [01 §2.10] | 16 channels, 200+ rhythm variants, 15 capnograms | Controller for up to 20 sessions; trending with interpolation over 3–300 s; 43 alarm conditions in 3 tiers; 68 scenarios in 12 categories; CSV event log | A **scenario catalogue by category**; multi-session control | No defibrillator yet; generic look |
| **SimCore / ResusMonitor / Simpl** [01 §2.9–2.10] | Web/phone monitors | Separate monitor and controller links; session IDs; ResusMonitor documents the autoplay rule (click before sound) | Link-based pairing | Thin physiology; no device fidelity |
| **Infirmary Integrated** (open source, Apache-2.0) [02; 05 §2.7] | Desktop monitor with **Dark / Light (projector) / Grid (ECG paper)** schemes | Instructor controls in the same app; steps and progressions | Three colour schemes we already copied | 100 Hz waveforms look drawn [05 §2.3] |
| **Open Sim Lab** (MIT, TypeScript) [02 A2] | Worker generators, canvas sweep with a 14 px erase bar | Minimal | The right architecture | One commit; unproven constants |

**Top instructor-UI patterns worth copying:** (1) stage-then-commit (REALITi, our 6a drawer); (2) MODELED/MANUAL with
per-parameter pin and "return to model" (CAE); (3) onset/trend with a visible progress marker on the control (REALITi,
CAE blue flag); (4) bookmarks that restore physiology (CAE); (5) a virtual time cursor / fast-forward (REALITi);
(6) sensor attach/detach per channel from the instructor copy of the monitor (Laerdal); (7) scenario = states +
triggers + text steps + checklist (CAE + REALITi); (8) a categorised scenario catalogue (TrainingMonitor);
(9) drag-to-change for one value on a phone remote (SimMon).

**Anti-patterns:** manual-only physiology that makes the instructor keep every number consistent (REALITi, SimMon);
expert-only editors on the critical path (CAE SCE); hidden state (which values are overridden, what the scenario will
do next); per-product licence gates on views; generic "web app" monitors that look like none of the devices learners
will meet (TrainingMonitor, SimCore).

### 2.10 Standards and design references

- **IEC 60601-1-8** (alarm systems; standard paywalled; values via [05 S7–S13]): high red, flashing 1.4–2.8 Hz,
  20–60 % duty; medium yellow, 0.4–0.8 Hz; low cyan or yellow, steady; priority must be distinguishable by more than
  colour (sound pattern, text markers); Amendment 2 (2020) replaced the melodies of Annex F with the reference sounds of
  Annex G [05 §2.5; S12, S13]. We label ours "IEC-style" (brief §1 non-goals).
- **Alarm-state symbols**: IEC 60417 has symbols for alarm, alarm paused/"audio paused" and alarm off (crossed bell)
  [verify the exact numbers — commonly cited as 5307 alarm, 5319 alarm paused, 5576 alarm inactivated]. The skins'
  `alarmOffIcon: crossed-bell-red` already follows the convention.
- **ANSI/AAMI HE75** (human-factors design of medical devices) and **IEC 62366-1** (usability engineering): displays
  sized for the intended viewing distance, colour coding used consistently and redundantly, alarms prioritised and
  distinguishable, touch targets sized for gloved/hurried use; the FDA's 2016 human-factors guidance asks for
  task-based formative and summative evaluation [verify section numbers; HE75 is paywalled]. For us: the five timed
  tasks in the brief's verification plan are a lightweight formative evaluation.
- **WCAG 2.2 AA**: 4.5:1 text, 3:1 large text and UI component boundaries (1.4.3, 1.4.11), 24×24 minimum target
  (2.5.8), visible focus (2.4.7), no colour-only meaning (1.4.1).
- **ISA-101 "high-performance HMI"** (process control) and the **aviation "dark cockpit"**: grey/neutral surroundings,
  colour reserved for abnormal states, so that abnormality pops. This is the principle the shell adopts: the bezel is
  neutral, the monitor carries the colour.
- **Design systems with MIT-compatible licences** (tokens/ideas only; no dependency): IBM Carbon (Apache-2.0) g100 dark
  theme's layered surfaces; Radix Colors (MIT) 12-step dark scales; Open Props (MIT); GitHub Primer (MIT) dark
  high-contrast theme; NASA Open MCT (Apache-2.0) for a mission-control telemetry UI; Astro UXDS (US Space Force) for
  status colour semantics in monitoring UIs [verify licence before borrowing assets]. **Fonts**: IBM Plex (SIL OFL
  1.1), B612 (SIL OFL 1.1; designed with Airbus for cockpit-display legibility) — OFL is a font licence, compatible with
  distribution alongside MIT code, but it is not MIT, so it needs Ali's acceptance.

---

## 3. Synthesis: design principles for a polished clinical simulator UI

| # | Principle | Traced to |
|---|---|---|
| P1 | **The monitor is the hero and is left alone.** Vendor colours, lanes, fonts and alarm behaviour are skin data; the app frames the monitor, never restyles it. | §2.8 conventions 1–6; FU-5; R13 |
| P2 | **Neutral bezel, colour only for state.** The shell is graphite and quiet; parameter colours live in the monitor; alarm colours appear only where an alarm is. | ISA-101, dark cockpit (§2.10); Mindray/Philips alarm areas |
| P3 | **Name things as the ward does.** One glossary label per quantity, long name and unit on demand, vendor aliases only inside the monitor. | R56; research/11 §5.16; Philips/GE/Mindray label sets |
| P4 | **Navigate by task, not by build.** A handful of destinations (Teach, Scenarios, Explore, Ventilator, Validate, Developer) with a persistent session. | §1 critique; Philips Screens/Profiles; TrainingMonitor categories |
| P5 | **Show what the model is doing.** MODELED vs MANUAL is always visible; pinned values carry a pin; trending values carry a progress marker; forced values carry an override flag. | CAE Maestro flags; REALITi trend marker |
| P6 | **Stage, then commit — except in emergencies.** Batch changes with one Commit; urgent actions (Shock, Silence, Bolus) apply at once. | REALITi dials + send; our 6a staging bar |
| P7 | **Clinical controls, clinical units.** Doses in mg/µg with per-kg conversion shown, energies in J, currents in mA, pressures in cmH₂O/mmHg; presets first, free entry second. | CAE factor/onset inputs; SimMon drag; 7g drug library |
| P8 | **Touch the thing to change it.** Tapping a numeric or lane on the *instructor's copy* opens its controls (target, pin, sensor, limits). | Philips/GE touch-to-configure; Laerdal instructor monitor copy |
| P9 | **Priority is never colour alone.** Alarm priority = colour + flash rate + text marker + sound; pin/model = glyph + colour. | IEC 60601-1-8; WCAG 1.4.1; Mindray box encoding |
| P10 | **Time is a first-class control.** Speed, pause, fast-forward, bookmarks that restore state, and an event log that doubles as the debrief. | REALITi time cursor; CAE bookmarks and log |
| P11 | **Profiles separate from scenarios.** Site profile = skin, layout, units, alarm defaults; scenario = patient, initial state, what learners may change. | Laerdal profile vs scenario split |
| P12 | **Scale the monitor honestly.** Keep calibrated mm/s when it fits; otherwise switch to "N seconds per lane" and say so; reflow for portrait instead of shrinking. | GE size note; Masimo reflow; brief §3.5 |
| P13 | **One visual family, several devices.** Monitor, ventilator and future labs/TEG devices each keep their device look inside a frame, and share the shell's chrome, controls and language. | Dräger Infinity family; our Stage V cockpit |
| P14 | **Performance is a design constraint.** Nothing in the shell may cost the sweep a frame; the shell updates ≤ 2 Hz and never blurs over the canvas. | Stage 8a gate; brief §3.4–3.5 |
| P15 | **Empty and error states teach.** Every empty screen says what to do next and offers the action (pair a remote, load a case, load a bundle). | §1 critique (remote, viewer, review, ACLS) |

---

## 4. Proposed information architecture

### 4.1 One entry screen

`#/` **Start** — product name and one sentence ("A simulated anaesthesia patient monitor driven by linked
physiology"), then five task tiles, each with a one-line description and a live thumbnail where cheap:
**Teach a case** (Instructor view), **Explore physiology**, **Ventilator**, **Validate**, **Developer**. Below, "Recent
scenarios" (localStorage) and "Pair a remote". Remembers the last view (Q1).

### 4.2 Monitor view (`#/monitor`)

Full-screen learner monitor in the chosen skin and page (P1…P10 pages on saadat-like). Instructor controls hidden
(i / 5-tap top-left / 3-finger hold, as 6a). A thin, auto-hiding top edge (only on pointer hover or reveal) holds
Exit, skin, theme, fullscreen. On a projector: 30 fps low-power toggle in Settings. Learner action strip optional per
scenario (6b's buttons, grouped: Defib & CPR · Drugs · Airway · Fluids).

### 4.3 Instructor view (`#/teach`) and the scenario control panel

Split: monitor left (the same monitor, not a copy), panel right (resizable 360–560 px), or monitor + drawer on narrow
screens. **Session bar** across the top (patient one-liner, MODELED/MANUAL/MIXED badge with pinned count, scenario
state + elapsed, speed/pause, alarm count, audio, remote code). Panel tabs, in order of use:

1. **Scenario** — before a run: library cards (filter by category: ACLS, airway, haemodynamic crisis, respiratory,
   metabolic/thermal, neuro, drugs; each card: story, patient, duration, objectives, tags) → Preview (state diagram,
   triggers, checklist) → Load (confirm if a run is live). During a run: state strip, next triggers with countdowns,
   Hold / Jump / Bookmark / Restore bookmark, objectives checklist the instructor ticks, quick actions 1–9.
2. **Vitals & rhythm** — parameter rows (HR, BP, SpO₂, EtCO₂, RR, Temp, CVP, PAP, ICP as available): glossary label,
   current value, target stepper, onset (0 s / 30 s / 2 min / 5 min / custom with curve), pin/release; rhythm picker
   with Stage 5 thumbnails and a Modifiers section (ectopy, ST, conduction, artefacts, with units). In MODELED mode,
   setting a target pins it; "Factor" mode (×) available for HR/SVR/contractility as CAE does.
3. **Drugs & fluids** — dose picker (search, presets, route bolus/infusion/TCI, per-kg conversion), running infusions
   with rate change/stop, vaporiser (agent, dial %, FGF, N₂O) and the effect-site readout (Cp/Ce, MAC), fluids and blood
   (type, volume, over time), bleeding. Drug names from the 7g library in glossary spelling.
4. **Airway & ventilation** — airway state (patent / obstructed / laryngospasm / oesophageal / endobronchial /
   disconnected), mode (spontaneous / bag / ventilator), ventilator settings (RR, VT, PEEP, FiO₂, I:E) or "Open the
   ventilator" (Stage V cockpit beside the monitor), recruitment, lung conditions with severity (mild/moderate/severe
   ticks) and side.
5. **Defib, pacing & CPR** — energy stepper with skin defaults, Charge / Shock / Sync / Disarm, post-shock outcome
   ("per rhythm table" in words), pacer mode/rate/mA with capture threshold, CPR start/stop with quality.
6. **Devices & alarms** — sensors attach/detach per channel (Laerdal pattern), NIBP mode/interval/start, alarm list
   (mirrored in skin colours with text priority), limits per parameter, silence / pause / all-on, arrhythmia analysis,
   12-lead capture, freeze.
7. **Patient** — profile card (age, sex, weight, height, ASA, comorbidities from the organ/pathology inventory,
   endocrine profile; pregnancy greyed "v1.1"); MANUAL/MODELED mode; "Restart patient" (confirm dialog listing what
   resets).
8. **Log** — time-stamped events (instructor, learner, engine, alarms) with filters, bookmarks, notes, export
   CSV/JSON; this is the debrief view and can open full-screen after the case.

The panel footer is the staging bar (n staged · Commit · Discard). Every row's label has the glossary tooltip.

### 4.4 Remote (`#/remote`)

The Instructor panel alone, full width, for an iPad or phone paired to a Monitor view on another device: pairing by
6-letter code **and QR** shown on the monitor's reveal menu; a status pill (connected · latency · last sync); a
compact read-only vitals strip at the top (as `.pme-remote .pme-vitals` today). Empty state explains pairing.

### 4.5 Explore physiology (`#/explore/...`) and the physiology console

For residents and instructors, not developers. A left list of systems; each page = a small live monitor thumbnail +
two or three plots + a clinical-label table of the key values with normal ranges, and a short "What to try" list of
one-tap experiments (the current stage-page buttons, rewritten as sentences, e.g. "Bleed 1 L over 10 min", "Give
phenylephrine 100 µg"):
- **Haemodynamics**: PV loop, chamber pressures, CO/SV/SVR/EF/SvO₂/DO₂/VO₂, valve lesions and HFrEF (from 7a).
- **Respiratory mechanics & volumes (7k)**: Paw/Flow/Volume, P–V and F–V loops, Ppeak, Pplat, PEEP/auto-PEEP, ΔP,
  PL (with Pes estimate), Cstat/Cdyn, R, VD/VT, FRC, ERV, RV, TLC, VC, IC, FEV₁/FVC; two-lung view with per-unit
  compliance, shunt and ventilation (replacing the green ellipses with a labelled schematic).
- **Blood, acid–base & O₂ transport** (7c), **Brain / Kidney / Liver** (7d), **Endocrine & temperature** (7e), **NMB &
  depth** (7f: TOF, PTC, DoA index, MAC), **Drugs** (7g: Cp/Ce curves, TCI, interactions).
- **Labs** — v1.1 placeholder: today's ABG panel with glossary labels (FO₂Hb, SaO₂, Mg, osmolality per R56), and
  greyed CBC / chemistry / coagulation / TEG–ROTEM cards marked "v1.1" (R58, R60).

The **physiology console** moves to Developer (`#/dev/console`), light "bench" theme by default, same data: clinical
label column (min 16 ch, full name on hover), value, unit, normal range, engine key (muted mono), sparkline; "Model
internals" collapsed; search, changed-only, baseline diff, JSON/CSV/Copy kept; the actions rail replaced by the same
Instructor panel components (so a developer and an instructor use one control set), plus the raw-command box.

### 4.6 Ventilator (`#/vent`)

The Stage V cockpit, standalone or beside the monitor ("Linked" toggle). Its navy device look stays inside its frame
(P13); the demonstration buttons ("PEEP 5 → 15", "ARDS", "Tension pneumothorax") move into Explore → Respiratory and the
scenario library; glossary tooltips on fTotal, VTE, ExpMinVol, Pmean.

### 4.7 Validation pages (`#/validate`)

Bedside checklist, blind review and performance gate as three tabs, bench theme, with progress (n of N items
checked), empty states, and the monitor thumbnail where the page uses the engine. Internal but presentable.

### 4.8 Settings (`#/settings`)

Skin and page; theme (dark / projector-light / ECG grid); **calibration** (match an on-screen bar to a card, 85.6 mm,
per brief §3.5) and lane-duration mode; sound (unlock, master volume, beep tone on/off, alarm sound profile per skin);
patient-category defaults; keyboard shortcut sheet; reset local settings. Site profile export/import (Laerdal profile
idea: skin + layout + units + alarm defaults as one JSON).

### 4.9 How MANUAL/MODELED, patient profile and scenario selection are presented

- **Mode badge** in the session bar: `MODELED` (neutral outline, wave glyph) · `MANUAL` (accent fill, pin glyph) ·
  `MODELED · 3 pinned` (neutral with an accent pin count). Clicking it opens a popover listing pinned parameters with
  "Release" each and "Release all".
- **Per-parameter**: pin chip on the control row; a thin progress bar under the value while an onset is running (CAE
  blue flag, REALITi marker); an "override" chip when physiology forces a value (e.g. SpO₂ unobtainable in VF).
- **Patient**: one-liner in the session bar ("F 62 y 58 kg · COPD · β-blocker"); Patient tab holds the editor; a
  restart confirm lists what resets (drugs, fluids, lungs, log keeps running with a "Patient restarted" entry).
- **Scenario**: chosen from cards (Scenario tab or Start → Teach a case); a URL `?scenario=` still deep-links;
  loading never happens silently over a live run.

### 4.10 Keyboard and touch

Instructor shortcuts as in the brief §9 (`i S P N F B Space 1–9 / ⌘↵ Esc ?`), ignored while typing; the learner
monitor binds only the reveal gesture. Touch: 44 px targets, long-press repeat on steppers, swipe-down to close the
bottom sheet, no hover-only affordances; reveal gestures unchanged.

### 4.11 Responsive targets

- **1280×800 laptop**: split monitor 860 px + panel 420 px, or monitor + drawer (toggle, remembered); lane-duration mode
  if a lane would show < 5 s.
- **1920×1080 screen/projector**: split 1360 + 560, or full-screen monitor for the room with the instructor on a remote.
- **iPad**: landscape = monitor + overlay drawer (420 px) — the 6a pattern with 44 px controls; portrait = monitor on
  top (16:10), panel as a bottom sheet with tabs; Remote as a full-width panel.
- Container queries on the monitor region and panel so one component set serves split, drawer and remote.

---

## 5. Sources

Internal (verified primary sources are listed in each): `research/01-commercial-simulators.md` §2.1–2.10 and §7;
`research/02-open-source-and-academic.md`; `research/05-rendering-ux-integration.md` §2 and §6 [S1–S22];
`research/06-saadat-alborz-b9.md` §3–§4 and §8; `research/11-capability-inventory-and-glossary.md` §0, §5;
`docs/DESIGN-BRIEF.md` §1, §3.5, §3.8, §6.4, §6.8–6.9; `docs/gates/stage-8a.md` (frame-time gate).

External (from those reports' source lists):
- Philips IntelliVue Configuration Guide Rel. J.0 — https://www.documents.philips.com/doclib/enc/fetch/2000/4504/577242/577243/577247/582636/582882/MP2-90,_X2,_MX800,_Cableless_Patient_Monitors_Configuration_Guide_Rel._J.0_4535_643_22741_(ENG).pdf
- Philips IntelliVue MP40–90 IFU — http://www.frankshospitalworkshop.com/equipment/documents/ecg/user_manuals/Philips%20IntelliVue%20MP40,50,60,70,90%20Patient%20Monitor%20-%20User%20manual.pdf
- GE CARESCAPE B850/B650 User's Manual — https://hit.healthsystem.virginia.edu/index.cfm/_api/render/file/?fileID=0B2D9590-17A4-77A0-3E7456AFB970EF54&fileEXT=.pdf
- Mindray BeneVision N Series Operator's Manual — https://www.mindray.com/content/dam/xpace/en_gb/resources/downloads/education/education-nseries/operators-manual/BeneVision-N-Series-Operators-Manual.pdf
- ZOLL X Series Operator's Guide — https://documents.cdn.ifixit.com/ZOY5FA4FoCEfvPe4.pdf
- Saadat B9 page and manual — https://saadatco.com/?page_id=2839 ; https://saadatco.com/wp-content/uploads/2021/12/D00125-V17.pdf
- Laerdal Patient Monitor help — https://cdn.laerdal.com/downloads/f2139/SimPad_Patient_Monitor_help_file.pdf ; SimPad PLUS — https://laerdal.com/us/information/patient-monitor-options-lleap-and-simpad-plus/
- CAE Maestro User Guide — https://www.aedsuperstore.com/pdf/cae-maestro-ares-user-guide.pdf
- SimMon — https://simmon-app.com/ ; TrainingMonitor — https://trainingmonitor.app/ ; SimCore — https://simcore.app/
- IEC 60601-1-8 secondary sources — https://www.sameskydevices.com/blog/a-guide-to-iec-60601-1-8-and-medical-alarm-systems ; https://insights.globalspec.com/article/20598/iec-60601-1-8-amd2-2020-medical-alarms-and-faqs ; https://array.aami.org/content/news/updated-iec-60601-1-8-breaks-new-ground-development-alarm-sounds
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- IBM Plex (OFL) — https://github.com/IBM/plex ; B612 (OFL) — https://github.com/polarsys/b612
- Items tagged **[verify]** (Dräger, Nihon Kohden, Masimo, Visual Patient, Drews & Doig, IEC 60417 numbers, HE75
  sections, Astro UXDS licence) were to be confirmed by this study's parallel web sweeps, which had not returned when
  the report was handed back; confirm them before they drive a decision.
