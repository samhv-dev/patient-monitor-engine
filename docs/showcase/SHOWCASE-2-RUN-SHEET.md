# Showcase 2: run sheet (30 minutes, the owner's slot)

*Tuesday 3 November 2026 (12 Aban 1405), university deans and clinical staff. Presenter: the owner. **Two live demos
(owner, 2026-10-24, R4-Q3 FINAL): malignant hyperthermia on the E119 card, then class IV haemorrhage on the E120 card
with its Debrief.** Bronchospasm and tamponade are not in the programme; their sections, the round-C notes and the
four reserve cases are kept, unchanged, in the appendices. Freeze Saturday 31 October 12:00; tag Sunday 1 November;
the owner's smoke and live rehearsal Sunday evening; the room dry run Monday 2 November [RC4]. The order of the two
demos may still change: each case section is self-contained, so swapping them is a cut-and-paste of §3 Case 1 with
§3 Case 2 + §4, then recomputing T+.*

> **History.** 22 October slot (17 October answers): bronchospasm → tamponade → Debrief → MH. 24 October: the two
> live-demo cards changed (E119 MH with the induction, E120 the owner's haemorrhage course, E121 no implicit oxygen;
> kit round A4); the demo, then planned for Wednesday 28 October, was postponed a week (first assumed Wednesday
> 4 November, 13 Aban; then the owner's "nov 3rd"), and the programme became two demos (R4-Q3). 24 October evening: the demo UI review [UIR]. 25 October:
> the app opens on a full Start page (E123, #131). 26 October: the owner accepted the clinical review of the two demo
> cards in full (`scratch/plans-backup/demo-cards-clinical-review.md`, 13 findings) and the cards, this sheet, the cue
> cards and the presenter guide follow it (E132).

Companions: [`SHOWCASE-2-PRESENTER-GUIDE.md`](SHOWCASE-2-PRESENTER-GUIDE.md) (one page: what to remember, keys, the
alarm rule, the validation answer) and [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) (one printed page per
segment).

## The owner's answers built into this sheet

| # | Question | The owner's answer | Where |
|---|---|---|---|
| R4-Q3 | The programme (2026-10-24) | **Two live demos only, MH and haemorrhage**; bronchospasm and tamponade are out. Order as he listed them, MH then haemorrhage (may still change) [R00 2026-10-24 15:35] | Programme |
| — | The date | **Tuesday 3 November 2026 (12 Aban 1405)** [RC4] | everywhere |
| E119 | MH card | Starts awake on room air; every induction step is a button | Case 1 |
| E120 | Haemorrhage card | The owner's course: PEA left untreated → asystole → CPR → VF → two shocks → ROSC | Case 2 |
| E121 | Oxygen | Never implicit: the MH card preoxygenates by button, the haemorrhage card gives mask oxygen by button | both |
| E123 | Start page (2026-10-25) | The simulator launches into a full Start page; the two demo cards come first | §2 |
| E19a | MH: when to call | **At Early signs** (8:32 on the E119 card [Q1-2D]) | Case 1 |
| E20 | Monitor skin | **Saadat-style**, no style change during the talk (after a change to Philips-style the AGENTS tile reads "---") [MEAS §8; Q1-2D] | §1 |
| E21 | Limit alarms after a Load | **"All alarms on" after every Load stays a presenter step**; the **Bookmark is taken AFTER it** [A3.2] | every case |
| E22 | MH "ventilation back" | "Hyperventilation kept until EtCO₂ < 40 for 2 min, then normalised"; early is "not met". On the E119 card EtCO₂ is below 40 from 09:05, so the press is met from 11:05; the talk presses at **14:41**, after the first Pause [Q1-2D] | Case 1 |
| E13 | Which Mac presents | **The kit on a Mac**; GitHub Pages is the fallback (§6). `node -v` and one Start Classroom run on the presenting Mac by the room dry run, Monday 2 November | §1, §6 |
| E14 | The network for the phones | **A travel router** | §1 |
| E132 | The clinical review of the two cards (2026-10-26) | **Accepted in full.** MH: the crisis step adds charcoal filters and a propofol infusion; a second dantrolene when the EtCO₂ climbs back at normal ventilation; cooling only above 38.5 °C; four take-home lines. Haemorrhage: source control, massive transfusion and TXA; "Rhythm check"; a second epinephrine; CPR to the 2-min rhythm check; objectives rewritten (no "draft"); three take-home lines | Case 1, Case 2, §4 |

## What changed for 3 November

1. **Two demos.** MH (10:00 slot) then haemorrhage (5:40) and its Debrief (3:30); close 3:00, questions 4:20, buffer
   0:30 [DRAFT]. Every clock below is from the two-demos talk run on kit 2ebd743d [Q1-2D], with kit round A4 alongside
   [A4].
2. **The opening is the Start page** (E123): the release label, the session code and **Show the QR code** are on it,
   and the first case is one **Load** on its Demonstration 1 card.
3. **No reload between the cases**: MH → **Choose another scenario** → Load the haemorrhage [Q1-2D].
4. **Operator safety lines** from the UI review [UIR] (§1 "Safety lines"): never click Ventilator; a reload and
   Sound; one instructor tab for the QR; the tab stays in front; print after the fast-forward banner.
5. **The MH report prints 8 A4 pages** on kit 2ebd743d [UIR #31] (A4 on kit 52b0390b: 7; on the E132 card 8); the
   haemorrhage report 8 [Q1-2D; A4; E132].
6. **The clinical review of the two cards (E132, 26 October)** [REV]: new MH and haemorrhage buttons, presenter lines,
   objectives and take-home lines (Case 1, Case 2, §4). Measured on kit round A4 only (Chromium) [E132]; the talk run
   predates it, so each case table carries an E132 column.

## How to read this sheet

- **Sim** is the session-bar clock (scenario clock, Load = 0:00). **W** is the wall-clock time from pressing **Load**,
  as **measured** in the two-demos talk run (Chromium, 3 emulated phones, a scripted reaction of 2 s; the script does
  not talk, so W has no talk in it). **T+** is the time into the 30-minute slot: W plus the talk allowances of the
  timing draft (planning figures, not measurements) [DRAFT]. A time estimated here is marked "(est.)".
- A 5-min fast-forward takes **10.5–10.6 s** of wall and **leaves the speed as it was** [Q1-2D; UIR: 10.5–10.9 s].
- **Boxed words** are the exact on-screen labels, from the card files and the run rows. "C / W" = Chromium / WebKit.
- Monitor numbers are what the run read on the instructor's monitor. Real presses land a few seconds differently, so
  expect ± a few units [R45 tolerances HR ± 5, pressures ± 5, SpO₂ ± 2, EtCO₂ ± 3].
- Each bracket names its source. Source keys:

| Key | File |
|---|---|
| Q1-2D | `scratch/kitround-2demos-q1/q1-{0,1,2}-*-chromium.{json,md}` and `debrief-q1-*.json`: the two-demos talk run of #130 (kit 2ebd743d, 2026-10-24, Chromium, 3 phones, reaction 2 s; WebKit not run) |
| DRAFT | `scratch/plans-backup/cue-cards-two-demos-draft.md` (the timing draft written from Q1-2D) |
| A4 | `docs/showcase/kit-round-a/a4-mh-e119-induction-sequence-and-early-call-kit-round-{chromium,webkit}.*` (kit 52b0390b) and `a4-haemorrhage-e120-course-kit-round-{chromium,webkit}.*` (kit 33a6c92b), 2026-10-24, both engines; their Debrief JSON and PDFs beside them |
| E132 | `scratch/kitround-e132/a4-*-chromium.*` (kit e0c73a47, branch `exec-e132-cards`, 2026-10-26, Chromium only): kit round A4 on the cards after the clinical review; their Debrief JSON, PDFs and Persian handouts beside them. Sanity measurements: E131 (one MH metabolic rate) will move the MH course again, and the Thursday prep run re-measures both |
| REV | `scratch/plans-backup/demo-cards-clinical-review.md` (the clinical review of the two cards, 24 October; # = its finding; accepted in full 26 October) |
| UIR | `scratch/plans-backup/ui-review-2026-10-24.md` (the demo UI review, kit 2ebd743d; # = its defect number) |
| RC4 | `docs/plans/rc4-release-day.md` (the rc.4 release-day runbook on the new dates) |
| MEAS | `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` (kit round A, 2026-10-13; § numbers) |
| Q1 | the same file, section **Q1** (kit round Q1, 2026-10-18, the release build `pme-showcase-kit-3db25a3b`); raw rows in `docs/showcase/kit-round-a/q1/` |
| A3 | the same file, section **A3** (kit round A3, 2026-10-17, kit `pme-showcase-kit-ca0d2dbb`); raw rows in `docs/showcase/kit-round-a/a3-*` |
| KR | `docs/showcase/kit-round-a/<case>-kit-round-<chromium/webkit>.md` (the raw rows). "KR62" = the files ending `-kit-62e521c3`. "KR MH early-call" = `malignant-hyperthermia-early-call-kit-round-*.md` |
| G10 | `docs/gates/stage-10.md` (Stage 10 dry run, time control) |
| G11 | `docs/gates/stage-11.md` (Stage 11 gate; §3 the engine-level numbers S1–S5) |
| RS11 | `docs/gates/stage-11/run-sheet-numbers.md` (Stage 11 browser rehearsal, limit alarms OFF) |
| P11 | `docs/plans/stage-11-scenarios.md`, "Order and durations" |
| G12 / G12P | `docs/gates/stage-12.md` / `docs/gates/stage-12-real-phone.md` (phones; the owner's step) |
| CR12 | `docs/showcase/CLASSROOM.md` (also `_sandbox/pme-classroom-dryrun/CLASSROOM.md`) |
| PF / OPT | `_sandbox/pme-classroom-dryrun/PRE-FLIGHT.md` / `OWN-PHONE-TEST.md` |
| KIT | `_sandbox/pme-classroom-dryrun/kit/VERSION.txt`; `_sandbox/pme-kit-release-3db25a3b/README.txt` (the release-build kit) |
| G13 / DB-T / DB-MH | `docs/gates/stage-13.md` / `docs/gates/stage-13/rehearsal/debrief-tamponade-*.json` / `debrief-mh-*.json` (kit 58b2c13c) |
| PRINT | `_sandbox/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt` |
| CARD | `apps/demo/src/app/showcase/showcase-*.json` (objective text, Debrief rule, states, button labels, take-home lines) |
| F11A / F11B / F11D | `docs/gates/fu-11-a.md` / `fu-11-b.md` / `fu-11-d.md` |
| RUN4 / SC1 | `docs/showcase/RUN-STEPS.md` (showcase 1) / `_sandbox/pme-showcase-docs/run-sheet.pdf` (showcase 1's printed sheet) |
| R00 / R24 / R25 / R31 | `research/00-orchestrator-rulings.md` / `24-showcase2-probes.md` / `25-owner-questions-2026-10-07.md` / `31-owner-decisions-2026-10-12.md` |
| ADD2 | `research/15-review-pack/addendum-2/index.html` (owner boxes H17–H19, E13–E15) |
| SYN | `research/30-parts/99-synthesis.md` (the target audit's synthesis) |
| RM | `docs/roadmap/README.md`, `docs/roadmap/v1.0-remaining.md`, `docs/roadmap/v2.0/README.md` |
| SKIN | `packages/skins/src/data/skins/saadat-like.json`, `philips-like.json` |
| S1 / S5 | the E119 / E120 slow tests (`apps/demo/src/app/showcase/malignant-hyperthermia.slow.test.ts`, `haemorrhage-anaphylaxis.slow.test.ts`) |

## The programme at a glance (30:00)

The machine runs are measured; the talk allowances are the draft's planning figures [DRAFT]. The whole two-demos run,
presses only (no talk), took **8:25** of wall from the opening to the close [Q1-2D `q1-talk`]. The talk itself was not
measured ("Still not measured").

| # | Segment | Speeds used | Run (W, measured) | Slot | Clock (T+) |
|---|---|---|---|---|---|
| 0 | Opening on the Start page: release label, session code, QR; the phones join | — | phones joined 2.5 s after the QR [Q1-2D] | **3:00** | 0:00–3:00 |
| 1 | Malignant hyperthermia, early call (E119): induction, crisis, treatment, recovery | ×8, ×4, three 5-min FF | **2:17** Load → end (136.9 s), the three spans 10.5–10.6 s each [Q1-2D]; E132 A4 2:02 (121.7 s, no talk Pauses) | **10:00** | 3:00–13:00 |
| 2 | Class IV haemorrhage (E120): PEA → asystole → CPR → VF → two shocks → ROSC | ×8, ×4, ×1 | **5:08** Load → end (307.7 s) [Q1-2D]; E132 A4 **4:34** (273.6 s) [E132] | **5:40** | 13:00–18:40 |
| 3 | The Debrief (haemorrhage), read and printed | — | the print 4.4 s [Q1-2D] | **3:30** | 18:40–22:10 |
| 4 | Close: roadmap and the ask to the deans | — | — | **3:00** | 22:10–25:10 |
| 5 | Questions | — | — | **4:20** | 25:10–29:30 |
| | Buffer (a re-press, a "Not available now", a slow Load) | | | **0:30** | 29:30–30:00 |
| | **Total** | | | **30:00** (25:10 before questions) | |

**Minute by minute inside the case slots** (the measured W around the draft's talk allowances):

| T+ | What | Length |
|---|---|---|
| 0:00 | Start page on the projector; what the simulator is | ≈ 0:30 (est.) |
| ≈ 0:30 (est.) | **Show the QR code**; the phones join; **Close** | ≈ 2:30 (est.) |
| 3:00 | MH framing, the Start page still showing | 1:30 |
| 4:30 | **Load** on Demonstration 1 · **All alarms on** · **Bookmark** · **×8**; the induction to the early signs and the call | 1:24 |
| 5:54 | span 1; **Pause** at Recovering (14:33): the early call | 0:11 + 2:00 |
| 8:06 | **ventilation back** (14:41); span 2; **Pause** (19:58): the EtCO₂ climbing back, **second dantrolene** | 0:11 + 2:00 |
| 10:18 | span 3 (the first case item to cut); end, **Pause**: the take-home lines | 0:11 + 1:00 |
| 11:30 | MH Debrief glance | 1:00 |
| 12:30 | **Instructor** · **Resume**; slack | 0:30 |
| 13:00 | haemorrhage framing; **Choose another scenario** → **Showcase** → Load → **Load scenario** | 0:30 |
| 13:30 | **Load · All alarms on · Bookmark · ×8**; the run, narrated over the ×1 stretches | 5:05 |
| 18:35 | slack | 0:05 |
| 18:40 | **Debrief** (§4): open, Run by, key times, objectives, moments, print | 3:30 |
| 22:10 | Close and the ask | 3:00 |
| 25:10 | Questions | 4:20 |
| 29:30 | buffer | 0:30 |

> **If running over, cut in this order** [DRAFT]
>
> 1. **Questions** (4:20 → 2:00, then out).
> 2. **The MH third fast-forward** (span 3) [DRAFT]: end MH at the 19:58 Pause after span 2 (EtCO₂ 53–54 [Q1-2D;
>    E132]), **after the second dantrolene** (objective 4) and with the take-home lines, provided **ventilation back has
>    already been pressed**; saves 10.5 s of wall (est.).
> 3. **The MH Debrief glance** (1:00).

---

## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)

Owner questions this checklist depends on: **E13** which Mac presents and its Node.js, **E14** the network for the
phones [R31 §3]. Tick every line.

**The kit** (matches `PRE-FLIGHT.md` [PF])
- [ ] **For 3 November: the rc.4 kit** (tag Sunday 1 November) [RC4]; the lines below are the floor any kit must pass.
- [ ] The kit is built from **main at 62e521c3 or later**: the kit's `VERSION.txt` line `Commit:` reads `62e521c3…` or a
      later main commit [KIT: the owner's sandbox kits are now the 3db25a3b release build, `pme-classroom-dryrun/kit`
      ("Commit: 3db25a3b3f1c…") and `pme-debrief-dryrun/pme-showcase-kit-3db25a3b`; the owner's hand checks of
      2026-10-18 ran on the 62e521c3 kit, built 2026-10-13]. Older kits (51a37063 to 56f3761f) have the
      relay that dies at the first phone (KR-A1) [MEAS §9 item 1]. A3 ran on a ca0d2dbb kit, relay test 2 of 2 [A3].
      **For the MH card: a kit that carries the E22 rule (PR fix-e22-mh-rule) once it is merged**; on an older kit the
      Debrief's MH ventilation line still uses the old rule.
- [ ] **The relay test passed**: the kit's README says `check-relay.mjs` **PASS** (the 62e521c3 kits: 2 of 2 runs; the 3db25a3b release kit: 2 of 2 runs, 2026-10-18)
      [KIT README; MEAS §11]; and on this Mac, 10 s after the simulator opens, the black window still says **THE
      CLASSROOM IS RUNNING** [PF §2].
- [ ] Presenting Mac has **Node.js 22 or later**: Terminal `node -v` prints `v22…` or later; otherwise install the LTS
      from nodejs.org [PF §1; KIT: `runtime/` left empty, the Mac's own Node is used]. **E13 (2026-10-18): the
      presenting Mac was not yet in the owner's hands; this line and one Start Classroom run on it are done by the room
      dry run, Monday 2 November.**
- [ ] Double-click **Start Classroom**; its window says **THE CLASSROOM IS RUNNING** and lists "learners' phones reach it
      at: http://…"; click **Allow** if macOS asks about "node"; the browser opens `http://127.0.0.1:8650/?relay#/` on the **Start page** (E123).
      Keep the black window open all session [PF §2].
- [ ] Fallback launcher ready: **Start Simulator** (no phones) [CR12 "(c)"]. The fallback kit and this sheet on a USB
      stick [R00 2026-10-03 "three layers"].
- [ ] **One instructor tab only.** A second tab or a second browser on `?relay#/teach` gets a NEW session code; a QR
      shown from it points the room at another session [UIR "Two hosts"]. Close any spare tab now.
- [ ] One browser window, zoom 100 %, at least about 1280 px wide (narrower, the panels overlap) [SC1 "Avoid"]. The kit
      round measured at 1440 × 900 [MEAS header].
- [ ] Close other heavy apps. The kit round ran at a load average of 1.3–4.9 and A3 at 4.8–18.1 with no lost press;
      earlier gates lost presses under heavy load [MEAS header; A3 "Load"; G13 §6: one lost epinephrine press at load
      ≈ 200].

**The owner's hand checks** (all ticked before the day; [R31 §2; G12P])
- [x] **H17** your own phone through the Showcase cards over the hotspot, on the 62e521c3 (or later) kit; fill
      `OWN-PHONE-TEST.md` [OPT; G12P]. (Kits before 62e521c3 could not pass it: KR-A1 [R00 2026-10-13].) **PASS,
      2026-10-18** (Safari 27.0.1, kit 62e521c3, the Mac's hotspot, one phone): "Phone followed; numbers match" [G12P].
- [x] **H18** the fast-forward look in real Safari: dimmed AND blurred page, amber "FAST FORWARD · 5 MIN" panel, clock,
      banner, waveform seam [R31 H18; G10 §6: WebKit screenshots cannot capture the blur]. Not re-checked in the kit
      round [MEAS §10]. **PASS, 2026-10-18**: "As expected on both" (Mac and phone) [G12P].
- [x] **H19** hidden tab: the Instructor page behind another tab for at least 6.5–7 min in real Chrome and Safari, then
      Bookmark or a command: the monitor is live, no "The monitor stopped" message [R31 H19; F11A §5: never measured on
      any machine]. **FAIL, 2026-10-18** (Safari, tab hidden 7 min): the phone lost the session (FX-14) and the Mac's
      scenario clock did not advance while the tab was hidden (FX-15); both for a later release. **Day rule: the Mac's
      tab stays visible and frontmost for the whole talk** [G12P].
- [x] **H20** the second screen in real Safari follows within 5 s [R31 H20]. **PASS, 2026-10-18**: the learner's
      monitor window opened from the first page stays in sync, including after fast-forward [G12P].
- [x] **Print** a Debrief in Chrome and Safari [R31 "Print"; PRINT] (checked on the tamponade report, which is not in
      the 3 November programme; the haemorrhage report printed 8 A4 pages from Chromium [Q1-2D; A4]). A3 printed it to PDF from Chromium
      (6 A4 pages) and took only a print-media screenshot in WebKit [A3.1]: a real print dialog in either browser is
      still yours. **PASS, 2026-10-18** [G13 §0]: Chrome, footer and "Page n of N" on 5 of 5 pages; Safari, footer on
      pages 1, 3, 4, 5 and none on page 2 (Trends), the known limit, ruled acceptable by the owner.

**Monitor style** (the owner's answer E20)
- [ ] Settings → Monitor: **Saadat-style** (the default). On it, **Pause alarms** is greyed out with "This monitor has
      no alarm pause. Silence mutes for 120 s." [MEAS §7].
- [ ] Do not change the monitor style during the talk (FX-9) [MEAS §8].
- Lane order changed in rc.2; screenshots re-taken in the Wednesday rehearsal (ECG, ECG, CO2, IBP1, IBP2, pleth;
  research/34 T3).

**Limit alarms** (the factory state, and the state after every Load, is "Limit alarms off"; the owner's answer E21)
- [ ] Instructor → **Devices & alarms** → **All alarms on**: the top-right alarm button then reads **No alarms** [KR
      setup rows: "Limit alarms off" → "No alarms"].
- [ ] **After EVERY Load, press All alarms on again, and only then Bookmark.** Loading a case turns the limit alarms
      off, in every case, on both engines [MEAS §7]; a bookmark taken after the press brings the alarms back on with it
      [A3.2]. The cases below put it in their first row.
- [ ] Why: with limit alarms off only `CO2 APNEA`, `SPO2 LOW PERFUSION`, `IBP1 STATIC PRESSURE`, `SPO2 NO PULSE` sound
      [G11 §4 finding 1].
- [ ] **After a page reload**: the session code is kept and the phones follow the reloaded page [MEAS §7; UIR #1]. The
      case comes back only on a kit with the reload fix (#132; toast "Restored after reload: ‹title›, mm:ss"); without
      it the bar reads **No scenario** and the case is loaded again from 0:00 [UIR #1]. **Switch Sound on again** (the reload fix
      does not carry it, the browser's autoplay rule [R00 2026-10-25 12:10]; if the button reads **Sound off**, click
      it; the UI review saw the button survive a reload [UIR #1]), and check **All alarms on** (it was lost after a reload in round A [MEAS §7], kept in the UI
      review [UIR #1]: press it if the button does not read **No alarms**).

**Sound**
- [ ] Projector/room speakers connected; click **Sound off** (it turns to **Sound on**) and hear the beat tone at ×1.
      Sound by ear was not checked in the kit rounds (headless) [MEAS §10]: do it now.
- [ ] At ×8 there is no beat tone (by design) [G10 §6b]; a fast-forward ends with one two-tone cue [G10 §6].

**Network and the QR relay test (one phone)**
- [ ] Choose the network (E14): ☐ venue Wi-Fi ☒ travel router (recommended for 30 phones; **the owner's choice, E14, 2026-10-18**) ☐ the Mac's hotspot ☐ none
      (Start Simulator + second screen) [PF "Decide"; CR12 "(b)"]. Hotspot capacity was NOT measured [MEAS §10].
- [ ] Monitor view → pointer to the top edge → **Phones**; the code shows `http://<this Mac's address>:8650/?join=…`,
      never the hosted https site [PF §3, §5].
- [ ] Scan with your own phone: within a few seconds it shows the monitor upright and the sheet says **1 phone
      following** [PF §3]. Tap **Sound off** on the phone: alarms heard; tap again: silent.
- [ ] Lock the phone 60 s, unlock, note how long until "Following" again: ___ s (over 15 s becomes a follow-up) [OPT].
- [ ] Venue Wi-Fi: if the phone says "this phone cannot reach the instructor's laptop", the Wi-Fi isolates devices: use
      the router or hotspot [PF §4].

**Last minute (T−10 min)**
- [ ] Open the page fresh: the **Start page** shows, with **Demonstration 1** *Malignant hyperthermia* and
      **Demonstration 2** *Class IV haemorrhage, PEA and resuscitation* first [#131]. **Sound on** and the alarm button
      are on its Session panel. The Start page on the projector; nothing loaded.
- [ ] Both cards are also in the Instructor's **Showcase** chip (for the second Load, by **Choose another scenario**)
      [CARD].
- [ ] This tab is the only instructor tab; it stays in front for the whole talk (a hidden tab pauses the session
      [UIR "Hidden instructor tab"]).

**Safety lines** (the UI review, 24 October [UIR]; true with or without this week's fixes)
- **Never click "Ventilator" during a card**, neither the top-bar tab nor the Start page's **Ventilator** tile under
  Other tools: one click holds every phone on "The ventilator is on the main screen", still held 20 s after going back
  to the Instructor view; a reload or a pause freed it [UIR #2]. If it happens: **Instructor**, then **Pause** and
  **Resume** if the phones still hold.
- **Never reload mid-case** (see "After a page reload" above): Sound must be switched on again either way.
- **Show the QR only from the first instructor tab** [UIR "Two hosts"].
- **The instructor tab stays in front**: hidden, the session pauses at once ("Paused while this tab was hidden (m:ss)",
  the phones read "(paused)") [UIR "Hidden instructor tab"]; in real Safari a hidden tab once lost the phone's session
  (H19, FX-14, FX-15) [G12P].
- **Print the learner handout only after the fast-forward banner has gone** (≈ 8 s after a span): printed earlier, the
  banner prints on every page, and on screen it covers **Print the learner handout** [UIR #9].
- **The MH report prints 8 A4 pages**, not 7 [UIR #31].

---

## 2. Opening on the Start page (T+0:00 → 3:00)

Since E123 (#131) the simulator opens on a **full Start page**: no monitor and no top bar; the title **Patient monitor
simulator**, the release label line, **Demonstration 1** (*Malignant hyperthermia*) and **Demonstration 2** (*Class IV
haemorrhage, PEA and resuscitation*) as the first, large cards, then the other scenarios, the **Patient** and
**Session** panels (the large session code, **Show the QR code** with "n phones following", Sound, the alarm button),
and Site and Other tools last [#131 PR body; screenshots `scratch/owner-review/start-page/`].

**Three clicks to the first case:** **1 · Show the QR code** → **2 · Close** (the QR sheet) → **3 · Load** on the
Demonstration 1 card, which opens the Instructor view with MH loaded ("Scenario loaded: Malignant hyperthermia"). Then
Case 1's first row: All alarms on · Bookmark · ×8.

| T+ | Do | Say (draft) |
|---|---|---|
| 0:00 | The Start page on the projector, nothing loaded. The release label reads "Version 1.0.0-rc.… (pre-release). For education only. Not a medical device and not clinically validated: never use it for patient care." (kit 2ebd743d: "1.0.0-rc.3"; the rc.4 kit: its own) [Q1-2D `q1-0`] | *"This is an open-source anaesthesia teaching simulator: a patient monitor, an instructor's panel and a ventilator, driven by a physiological model. It is for education only. It is not a medical device and never for patient care."* |
| ≈ 0:30 (est.) | **Show the QR code** (Session panel). The sheet shows the address, the 6-letter code and "0 phones following" [CR12 "The QR moment"] | *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your phone: it follows what I do here. It is silent: tap Sound off if you want to hear it."* [CR12] |
| 0:30–2:15 (est.) | Watch the count rise. In the run, 3 emulated phones were following **2.5 s** after the QR, all synced before Load [Q1-2D `q1-0`]. A phone that does not open: is it on that Wi-Fi? | One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen" [CR12] |
| ≈ 2:15 (est.) | **Close** | *"Your phone follows speed, pause and fast-forward."* [CR12] |
| 3:00 | MH framing (1:30) with the Start page still showing; at T+4:30 **Load** on Demonstration 1 (Case 1) | *"Two cases. Every number you will see is produced by the model; the buttons only give what their label says."* [CARD notes] |

**Without the Start page** (a kit before #131): QR from the **Monitor** view → pointer to the top edge → **Phones**;
the case from **Open the instructor view** → **Scenario** → **Showcase** → the card → **Load** [RUN4].

Measured capacity, if asked: 30 phones cost the relay under 2 % of one core; each phone receives about 1.3 KB/s at ×1 and
10.5–11.7 KB/s at ×8; at 120 simulated phones relay CPU ≤ 2 %, lag p95 ≤ 2.8 ms [G12 §5]. In the two-demos run three
emulated phones followed both cases with no stale reading on the haemorrhage and one 2.5-s AGENTS blank on MH
[Q1-2D].

---

## 3. The cases

**Every case starts the same way: Load → All alarms on → Bookmark → speed.** Press All alarms on after every Load
(older kits turned the limit alarms off on Load [MEAS §7]; on kit 2ebd743d they stayed on after both Loads [Q1-2D
setup], so the press is harmless); the Bookmark, taken after it, is the "Return here" fallback and brings the alarms
back on with it [A3.2] (§6).

While the amber fast-forward panel shows, the page refuses commands: do not press card buttons during it
[G10, Stage 10 plan D-6]. **The speed after a fast-forward is the speed before it** (×4 stays ×4): set the next speed
yourself [Q1-2D spans; MEAS §7].

**What the audience sees during a fast-forward** (the same on the projector, the second screen and the phones): the page
dimmed and blurred, an amber panel "FAST FORWARD · 5 MIN" with a running clock over a progress bar and "sound muted",
for **10.5–10.6 s** [Q1-2D]; at the end one two-tone cue, a seam with its time on every waveform lane, and a banner
"Fast-forwarded 5 min, mm:ss → mm:ss" listing the alarms raised during it [G10 §6; Q1-2D]. The banner stays about
8 s and covers the nav and the session-bar title [UIR #9].

**Monitor style:** Saadat-style, no change during a case (E20).

### Case 1: Malignant hyperthermia, early call, with the induction (E119). Slot 10:00 (T+3:00 → 13:00)

**To Load.** First case of the page: Start page → **Load** on *Demonstration 1 · Malignant hyperthermia*. After another
case: Instructor → Scenario → **Choose another scenario** → **Showcase** → *Malignant hyperthermia* → **Load** →
**Load scenario**. No reload.

Card: *Malignant hyperthermia* (Showcase). **Since E119 the card starts awake on room air** and every step of the
induction is a button [CARD]: Awake on the table, monitoring on, breathing room air → **Premedicate: midazolam 2 mg,
fentanyl 100 µg** → **Preoxygenate: 100 % O₂ by face mask** → **Induce: propofol 2 mg/kg, then succinylcholine
1.5 mg/kg** (the MH condition starts here; say the masseter line) → **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5;
sevoflurane 2 %** → **Start surgery: rocuronium 0.6 mg/kg** → Early signs → **MH crisis: stop sevoflurane, charcoal
filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** (Trigger off: 20 × 600, propofol 100 µg/kg/min) →
**Dantrolene 2.5 mg/kg** → Recovering → Ventilation back to 12 × 500 → **Dantrolene 2.5 mg/kg** again when the EtCO₂
climbs back [CARD; REV #1, #2]. **What the trigger-off step tells the engine** (E132): the vaporiser to 0 % at
10 L/min, the ventilator 20 × 600 at FiO₂ 1.0 and a propofol infusion of 100 µg/kg/min. The **charcoal filters are not
modelled** (the label names them; the fresh gas washes the agent out). **Cool: refrigerated saline 20 mL/kg (1.6 L)**
is pressed only above 38.5 °C, so **not on this path**; the engine has no cold-fluid input and gives that saline at the
theatre's 21 °C [REV #4]. **Oxygen is never implicit (E121):** skip Preoxygenate and SpO₂ reads 90 %
at the induction and 63 % when the tube goes in 60 s later (99 % throughout with it) [S1 E121 slow test]. The **MH
crisis** button is offered in Induced, Intubated, Surgery, Early signs and Established; **ventilation back** only in
Recovering [CARD].

Talk allowance in the slot [DRAFT]: 1:30 framing before Load · 2:00 at each of the two Pauses · 1:00 take-home ·
1:00 Debrief glance. Rows: the two-demos run [Q1-2D `q1-1`, Chromium, kit 2ebd743d, on the card BEFORE E132]; the last
column is kit round A4 on the card after the clinical review (kit e0c73a47, Chromium) [E132]. Where the two differ, the
E132 column is the card as it now is; the Q1-2D clock times of the induction still hold within a few seconds.

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-2D) | E132 C |
|---|---|---|---|---|---|---|
| 4:30 | 0:00 | 0:00 | **×8** | **Load · All alarms on · Bookmark** (bookmark at 00:06) | HR 69, ART 122/80 (93); room air | same; bookmark 00:04 |
| 4:34 | 0:07 | 0:30 | ×8 | **Premedicate: midazolam 2 mg, fentanyl 100 µg** | state 0:33; HR 70, ART 123/80 (94), SpO₂ 96, EtCO₂ 37 | state 0:35 |
| 4:38 | 0:11 | 1:00 | ×8 | **Preoxygenate: 100 % O₂ by face mask** | state 1:03; then `RR TOO LOW` 3:09 (RR 6 after the premedication) | 1:05; RR TOO LOW 4:03 |
| 5:00 | 0:33 | **4:00** | ×8 | **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg**; say the masseter line (below) | state 4:01; SpO₂ 99, EtCO₂ 46, RR 6; `CO2 APNEA` 4:56 | 4:06; CO2 APNEA 4:45 |
| 5:08 | 0:41 | **5:00** | ×8 | **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** | state 5:04; ART 97/60 (70), SpO₂ 99; apnoea alarm to ventilated breaths 8 s | 5:05 |
| 5:15 | 0:48 | **6:00** | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | state 6:03; HR 72, ART 96/59 (69), EtCO₂ 42 | 6:05; EtCO₂ 42 |
| 5:26 | 0:59 | 7:30 | **×4** | watch the CO₂ tile climb at the same ventilation | EtCO₂ 44, HR 76, ART 105/65 (75) | EtCO₂ 44, HR 75 |
| 5:41 | 1:13 | **8:32** | ×4 | state **Early signs** → **tick *Name malignant hyperthermia*** as you call it, then **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** at once | EtCO₂ 46, HR 79, ART 108/67 (78); the call lands 8:42 (Trigger off, 20 × 600), 10 s after Early signs | **8:38**, EtCO₂ 46, HR 78–80; call 2 s (8:40) |
| 5:49 | 1:22 | 9:03 | ×4 | **Dantrolene 2.5 mg/kg** (21 s after the call); say: in real life it takes extra hands and minutes | EtCO₂ 39 at 9:06; **below 40 from 9:05** (so ventilation back is met from 11:05) | 9:01 (21 s); below 40 from 9:04 |
| — | — | — | ×4 | **No cooling on this path**: say "cool only above 38.5 °C" (do not press **Cool: refrigerated saline 20 mL/kg (1.6 L)**) | (Q1-2D pressed the old 2 L room-temperature saline at 9:13) | not pressed; Tcore 36.6–37.8 °C to the end |
| 5:54 | ≈ 1:26 | 9:22 | — | **5 min** fast-forward (1 of 3), 10.5 s. **Hyperventilation stays on** | banner "Fast-forwarded 5 min 09:22 → 14:22 No alarms"; Recovering 10:15 (inside the span) | 09:04 → 14:04, no alarms; Recovering 10:04 |
| 6:05 | 1:40 | ≈ 14:33 | ×4 | **Pause**, 2:00 of talk (the early call), **Resume** | state **Recovering**; **EtCO₂ 35**, HR 76, ART 124/74 (88) | EtCO₂ 35, HR 80 |
| 8:06 | 1:45 | **14:41** | ×4 | **EtCO₂ normal: ventilation back to 12 × 500** | state 14:43; Debrief ✓ "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (09:05 → 11:05)"; EtCO₂ 36 | pressed as span 1 ended, 14:18 |
| 8:06 | ≈ 1:47 | 14:47 | — | **5 min** fast-forward (2 of 3), 10.6 s | banner "14:47 → 19:47 ETCO2 TOO HIGH 18:38" | 14:21 → 19:21, `ETCO2 TOO HIGH` 17:48; **EtCO₂ above 45 from 15:17** |
| 8:17 | 1:59 | ≈ 19:58 | ×4 | **Pause**: *"The EtCO₂ is climbing back at normal ventilation: the MH is not controlled. Second dose."* **Dantrolene 2.5 mg/kg**. 2:00. **Resume** | **EtCO₂ 53**, ART 126/76 (90), HR 75 (before E132: no second dose) | 19:35: EtCO₂ 53; the second dose 19:36, 4 min 19 s after EtCO₂ passed 45 (objective 4 ✓) |
| 10:18 | ≈ 2:00 | 20:03 | — | **5 min** fast-forward (3 of 3; the first case item to cut), 10.5 s | no alarms | 19:39 → 24:39, no alarms |
| 10:29 | 2:17 | 25:12 | ×4 | end: **Pause**; the take-home lines (1:00) | EtCO₂ 51, ART 130/76 (93), HR 72; T1 37.2 °C | 24:53: **EtCO₂ 55**, ART 96/62 (71), HR 80; Tcore 37.8 °C |
| 11:30 | — | — | — | session bar **Debrief**: the glance (1:00) | ✓ ✓ ✓ – – ✓ | **✓ ✓ ✓ ✓ – ✓** |
| 12:30 | — | — | — | back to **Instructor** · **Resume** | | |

The W column is the script's wall (no talk): its Pauses were a few seconds, not 2:00, so the clock at each Pause is
the clock the talk will see. Each span took 10.5–10.6 s; ×4 stayed ×4 after each [Q1-2D spans; E132]. EtCO₂ per minute
after ventilation back, E132: 35 → 46 → 48 → 50 → 52 → 53 → 54 → 55, then 55 to the end [E132]. **On the talk's
clock** (ventilation back 14:41) the EtCO₂ passes 45 about a minute later (≈ 15:40), so the dose at the 19:58 Pause
comes ≈ 4 min 20 s after it. Objective 4 marks a dantrolene dose after ventilation back without a time limit: a timed
rule adds a fifth Key-times tile, and the MH report's page 1 then no longer holds every objective (the Debrief e2e's
B6 (f) bound, 291 mm against 267). Press it as soon as the Pause starts.

**After the second dose the EtCO₂ stops climbing but does not come down quickly at normal ventilation** (headless,
the same course: 55 at 22:00–26:00, 53 at 30:00, 50 at 35:00, 45 at 45:00; Tcore peaks 37.9 °C) [E132 probe]. The
card offers no "hyperventilate again" step after ventilation back; the take-home line says "keep hyperventilating
until the EtCO₂ stays down". If asked: *"in practice I would also go back to hyperventilation."* (Open item for the
owner, below.)

**Masseter line (at Induce)** [REV #3]: *"The jaw is hard to open after the succinylcholine: masseter rigidity. In
practice a rigid jaw after succinylcholine means a non-triggering anaesthetic from now on and close watch of the EtCO₂;
today we keep the volatile running to show the crisis. Masseter rigidity with a rising EtCO₂ makes two signs."*

**At the call** [REV #2]: *"Trigger off: sevoflurane off, charcoal filters on the circuit, a propofol infusion so he
stays asleep, 100 % oxygen at 10 L/min, double the ventilation."* The charcoal filters are words only (not modelled).

**What the audience should look at:** the **CO₂ tile** rising at unchanged ventilation when it should be falling (42 at
6:00, 44 at 7:30, 46 at the early signs; without MH the same sequence settles at 36–39) [REV #5]; the **heart rate**
rising with it (64 → 80, blunted by the fentanyl [S1]); the **temperature** not moving much on the early path (Tcore
≤ 37.8 °C over the whole case [E132 Debrief facts]), so the call does not wait for it; **EtCO₂ below 40** within a
minute of the call; after ventilation back the CO₂ climbing past 45 within a minute: the MH is not controlled.

**Take-home lines (the card's, owner-agreed 26 October, verbatim)** [CARD]: *"A rising EtCO₂ at the same ventilation
with a rising heart rate: think of MH early."* · *"Trigger off, 100 % oxygen at high flow, hyperventilation, and
dantrolene 2.5 mg/kg."* · *"Keep hyperventilating until the EtCO₂ stays down; if it climbs again, repeat dantrolene."* ·
*"After the crisis: ICU 24–48 h, dantrolene 1 mg/kg every 4–6 h for 24 h (recrudescence in up to 50 %), then referral
for testing and family counselling."*

**What changed against the 22 October path (the card's own E119 change, not tuned):** the early signs come about
4½ min after the succinylcholine (was 6:52 after it): the hypoventilation after the premedication and the apnoea at
induction raised the CO₂ stores (RR 6, EtCO₂ 46 at the induction), so the ventilated EtCO₂ starts at 42–44 and should
then fall; without MH the same sequence settles at 36–39, so the climb is the MH [S1 slow-test bands; A4]. The heart
rate rises less than on the old card (79–80 at the early signs; the fentanyl gates the E117 sympathetic term).

**Debrief (the glance; the report is not printed for MH):** ✓ Observed name MH (ticked at the call) · ✓ call 2 s · ✓
dantrolene 21 s · **✓ second dose after ventilation back (19:36)** · – potassium (K⁺ above
5.5 did not happen) · ✓ ventilation back. 50 timeline rows; facts: highest EtCO₂ 55 at 20:47, highest T1 37.8 °C at
24:42, K⁺ 5.0 (4.2–5.0), lactate 3.3, pH 7.23 [E132 Debrief]. Read the objectives, not the **Recognition** tile: on
kit 2ebd743d it counted from Load (8 min 34 s), not from the early signs [UIR #18]. If printed: the report **8 A4
pages** on kit e0c73a47 (7 on kit 52b0390b), the learner handout 1 page [E132].

**Traps:** do NOT press ventilation back before **11:05** (offered from Recovering, 10:04, but EtCO₂ has not yet
stayed below 40 for 2 min: "not met"). No repeat dantrolene just before it (a dose moves the card out of Recovering;
ventilation back comes back only after EtCO₂ has been below 45 for a minute [CARD transitions]). The second dose comes
AFTER ventilation back, at the 19:58 Pause, no later (the EtCO₂ has been above 45 for about 4 minutes by then). No
cooling and no potassium on this path (Tcore ≤ 37.8 °C; K⁺ ≤ 5.0).

**Ruled (owner, 26 October, E132):** the clinical review is accepted in full. The settling-production line is gone:
the climb after ventilation back is MH not controlled, and the answer is a second dose [REV #1]. **Open for the owner:**
after the second dose the EtCO₂ holds at 55 for several minutes at normal ventilation (above); the card has no step to
hyperventilate again once ventilation is back. E131 (one MH metabolic rate) will move this course; the Thursday prep run
re-measures it.

**Explore (if used):** the baseline at 1:00 is the awake, premedicated patient. Against it, at the call ART M, SVR
and CMRO₂ read **down** (the anaesthetic); the MH rows (EtCO₂, HR, T1, K⁺, lactate, pH, MH activity, catecholamines)
read as expected. For MH-only changes, set the baseline after Start surgery (6:03) [S1 late slow test].

### Case 2: Class IV haemorrhage, PEA, asystole, VF, two shocks and ROSC (E120; after the clinical review, E132). Slot 5:40 (T+13:00 → 18:40)

**To Load.** After another case: Instructor → Scenario → **Choose another scenario** → **Showcase** → *Class IV
haemorrhage, PEA and resuscitation* → **Load** → **Load scenario** (no reload after MH [Q1-2D: "choseAnotherScenarioFirst"]).
First case of the page: Start page → **Load** on *Demonstration 2*.

Card: *Class IV haemorrhage, PEA and resuscitation* (Showcase). States: Bleeding 2.5 L over 10 min, breathing room air
→ (**Oxygen by face mask, FiO₂ 1.0**) → **Intubate and ventilate, FiO₂ 1.0** → Pre-arrest: junctional rhythm 50/min →
PEA: junctional rhythm, no pulse → Asystole → **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** →
**Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid
infuser; TXA 1 g** · **Epinephrine 1 mg** → **Rhythm check** (VF) → Shock from the Defib tab → **Epinephrine 1 mg**
(the second dose) → **Rhythm check** (VF again) → Shock → CPR to the 2-min rhythm check → **Rhythm check: pulse back,
stop CPR** (ventilator 12 × 500, PEEP 5, FiO₂ 1.0) [CARD; REV #4, #12]. Epinephrine is offered in every CPR state.

**What the resuscitation step tells the engine** (E132): the bleeding stopped (a bleed rate of 0: the 2.5 L bleed has
already ended at 10:00, which is the source control, so it stops nothing more on this course); 1000 mL balanced
crystalloid over 90 s; 1200 mL of blood over 144 s (a rapid infuser's 500 mL/min; the engine's whole blood, i.e. red
cells and plasma together: the engine's red-cell and plasma units do not change the circulating volume); tranexamic
acid 1 g (logged; no effect on the monitor: there is no coagulation model). The crystalloid enters at the theatre's
21 °C: the scenario cannot switch the fluid warmer on (backlog). Was 2 L crystalloid in 3 min and 600 mL blood.

**What is the physiology and what the card sets (say it if asked).** The card sets the rhythm three times: the
junctional rhythm at 50/min (when the systolic stays below 60 for 10 s) and VF at the first two rhythm checks.
Everything else is the model: the pulse loss (low flow), the PEA on the running junctional rhythm, its slowing to an
idioventricular rhythm and then asystole (a seeded hazard: ≈ 4.5 min after the pulse loss), the coronary perfusion
pressure rising with CPR and volume, each shock's outcome (the defibrillator's outcome table on the engine's seed) and
the pulse returning once the perfusion pressure and the myocardium have held for 60 s. **Why two shocks:** the app
always runs the engine on seed 7, and on this course the first shock always reads the same draw: it ends VF in
**asystole**. In this engine asystole never regains a pulse (a model limitation: real asystole sometimes does), so the
card brings VF back at the second rhythm check, and the second shock leaves an organised rhythm without a pulse; CPR
goes on and the pulse returns ≈ 1 min later. **Without the ventilator step he does not arrest** (he compensates on his
own breathing: systolic ≈ 76 at 10 min) [S5 E120 slow tests].

**Presenter lines** [REV #6, #7, #12, #13]:
- **Minute 1 (Intubate):** *"Say we are in the OR or the ED and we induce with a reduced-dose ketamine RSI (the button
  does not give the drug). Positive pressure cuts the venous return of an empty patient: that, not the bleed alone, tips
  him into arrest."*
- **Opening:** *"The bleed is 2.5 litres over 10 minutes and stops there: that is the surgeon's source control."*
- **PEA (10:28, ART 19/13):** *"This is pseudo-PEA: a pressure too low to feel. A palpated pulse would call it PEA."*
- **Before the pulse loss (≈ 10:59):** *"Now we do what nobody should: wait, so you can see a pulseless heart decay."*
- **At the resuscitation:** *"In haemorrhagic arrest the surgeon stops the bleeding and we give blood; compressions
  cannot fill an empty heart."* Charge during compressions; the pause for the shock should be under 5 s.
- **First rhythm check (VF):** *"The card inserts VF to show the defibrillator. The first shock does stop the VF: no
  organised rhythm follows it."* For recurrent VF, consider escalating the energy.
- **The return of circulation:** *"The pulse comes back because the volume brought the perfusion pressure up, not
  because of the shock. We see it at the 2-min rhythm check, on the arterial line and the capnogram."*
- **After the stop:** *"The model recovers faster than a patient would; expect a fragile, tachycardic,
  vasopressor-dependent patient."*

Talk allowance [DRAFT]: 0:30 framing before Load; the rest is said over the running case (the ×1 stretches: asystole →
CPR, the rhythm checks, the return of circulation). Rows: the two-demos run [Q1-2D `q1-2`, Chromium, kit 2ebd743d,
on the card BEFORE E132]; the last column is kit round A4 on the card after the clinical review (kit e0c73a47,
Chromium) [E132]. After the second shock the E132 column is the course as it now is.

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-2D) | E132 C |
|---|---|---|---|---|---|---|
| 13:30 | 0:00 | 0:00 | **×8** | **Load · All alarms on · Bookmark** (bookmark at 00:11) | HR 71, ART 123/81 (95), SpO₂ 96 on room air, EtCO₂ 36 | same; bookmark 00:04 |
| 13:33 | 0:06 | 0:30 | ×8 | **Oxygen by face mask, FiO₂ 1.0** | state 0:32 | 0:34 |
| 13:37 | 0:10 | 1:00 | ×8 | **Intubate and ventilate, FiO₂ 1.0**; the minute-1 line | state 1:01; SpO₂ 99 | 1:06 |
| 14:29 | 1:01 | 8:00 | ×8 | — | **HR 141, ART 76/62 (66), EtCO₂ 25**; `ART SYS TOO LOW` 8:28 | HR 139, ART 75/61 (66); 8:28 |
| 14:38 | 1:11 | **9:17** | ×8 → **×4** | (the card sets the **junctional rhythm 50/min**) | HR 158 → 50, ART 56/45 (49) | 9:17, ART 57/46 |
| 14:56 | 1:29 | 10:28 | ×4 | state **PEA** (systolic below 25 for 10 s); the pseudo-PEA line | ART 19/13 (15), HR 50 | 10:27, ART 19/13 |
| 15:04 | 1:37 | **11:00** | ×4 → **×8** | the model's **pulse loss** (`SPO2 NO PULSE` 11:11). **Do not start CPR** (the course: untreated; say why) | junctional, no pulse; ART mean only (10); `CO2 APNEA` 11:54 | 11:00; 11:10 |
| — | — | 12:56 | ×8 | (idioventricular) | — | 12:56 |
| 15:39 | 2:12 | **15:37** | ×8 → **×1** | state **Asystole** (`ECG ASYSTOLE` 15:38); the ECG flat from 15:29 | HR 18, ART mean 5; 4 min 37 s after the pulse loss | ECG flat 15:29; state 15:36; alarm 15:38 |
| 15:42 | 2:14 | 15:39 | ×1 | **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0**, then **Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g** | — (before E132: 2 L crystalloid and 2 units) | 15:39 / 15:40 |
| 16:02 | 2:34 | 15:59 | ×1 → **×4** | **Epinephrine 1 mg** | ART 33/11 (19), EtCO₂ 5 | 15:59; ART 35/12, EtCO₂ 5 |
| — | 2:44 | 16:39 | ×4 | — (1 min into CPR) | ART 53/22 (34), EtCO₂ 13 | ART 63/27 (41), EtCO₂ 14 |
| 16:28 | 3:00 | **17:38** | **×1** | **Rhythm check** → the card sets **VF** (`ECG VFIB` 17:41) | ART 70/33 (46), EtCO₂ 19 | 17:38; ART 74/37 (50), EtCO₂ 20; VFIB 17:41 |
| 16:35 | 3:08 | 17:47 | ×1 → **×4** | **Defib, pacing & CPR tab: Charge (200 J) → Shock** (charge during compressions) | outcome **asystole** | 17:47, asystole |
| — | 3:23 | 18:47 | ×4 | — (CPR on) | ART 74/38 (51), EtCO₂ 23 | ART 74/37 (50), EtCO₂ 23 |
| ≈ 16:50 | ≈ 3:26 | **≈ 18:57** | ×4 | **Epinephrine 1 mg** (the second dose, 3 min after the first) | (before E132: one dose only) | 18:57 |
| 17:06 | 3:39 | **19:46** | **×1** | **Rhythm check** → **VF again** (card; `ECG VFIB` 19:49) | ART 74/38 (51), EtCO₂ 25 | 19:46; ART 73/37, EtCO₂ 24; VFIB 19:49 |
| 17:14 | 3:47 | 19:54 | ×1 → **×4** | **Charge → Shock** → organised rhythm, no pulse (sinus ≈ 19:58); **keep CPR** to the 2-min rhythm check | | 19:54; sinus 19:59 |
| — | — | **20:58** | ×4 | the pulse returns (the model), 64 s after the shock: point at the arterial line between compressions | ART 76/40 (53) → 113/54 (81) at 21:01; `ART SYS TOO HIGH` 21:02 | **20:58** (64 s); `ART SYS TOO HIGH` 21:03 |
| ≈ 17:50 | ≈ 4:20 | **≈ 21:53** | ×4 → **×1** | the 2-min rhythm check: organised rhythm, **ART 128/78, EtCO₂ 46** → **Rhythm check: pulse back, stop CPR** | (before E132: stopped at 21:00, 3 s after the return) | **21:56**, 58 s after the return |
| ≈ 18:05 | ≈ 4:35 | 22:55 | ×4 | end → straight to §4 | (before E132, 22:00: ART 135/83 (100), HR 72, EtCO₂ 46, SpO₂ 99) | ART 141/93 (109), HR 73, EtCO₂ 55; `ETCO2 TOO HIGH` 22:25 |

Machine wall, Load → end: **4:34** (273.6 s) on the E132 card against 5:05 on 24 October [E132; A4]: the stretch after
the second shock now runs at ×4. The T+ times after 16:35 are estimated from the E132 wall (no talk run on this card).

**What the audience should look at:** the HR climbing while the pressure holds, then the pulse pressure narrowing
(8:00); the ECG turning **junctional** at 50/min (9:17, the card); **PEA** (10:27): a rhythm on the ECG with the
arterial line at 19/13 (pseudo-PEA), then flat; the **pulse loss** (11:00: the arterial number goes mean only, then
`SPO2 NO PULSE`); the ECG slowing to **idioventricular** (12:56) and then **asystole** (15:29–15:36); the **CPR
traces**: compressions on the ECG and the arterial line, the arterial line building 35/12 → 63/27 → 74/37 and EtCO₂
5 → 14 → 20 over two minutes; **VF** at the rhythm check (17:38); the **first shock** → asystole; VF again (19:46);
the **second shock** → an organised rhythm without a pulse; the **return of circulation** (20:58): the arterial line
rises between compressions and EtCO₂ climbs; at the 2-min rhythm check 128/78 and EtCO₂ 46; a minute after the stop
141/93, HR 73, EtCO₂ 55 (too good: the model recovers faster than a patient would).

**During CPR and VF, two tiles mislead:** SpO₂ read 99 from 16:00 to the end and the HR 100–136 through CPR and VF (the
compressions are counted) on kit e0c73a47 [E132 rows; UIR #6, #7; E126 (#138) changes both]. Point at the ECG, the
arterial line and the capnogram; if asked, say so.

**Debrief objectives and the verdict on the owner's course** [CARD; E132 Debrief]: – Not assessable: Recognise PEA from
hypovolaemia (pseudo-PEA at ART 19/13; the instructor judges it) · **✗ Not observed: CPR within 30 s of the pulse
loss (4 min 40 s: 11:00 → 15:40)**: the objective's own text says the demo withholds CPR on purpose · **✓ Observed: the
return of circulation recognised at the rhythm check and CPR stopped, 58 s after it (20:58 → 21:56; asked within
2 min 30 s)**. No "draft" anywhere. **Take-home lines (the card's, owner-agreed 26 October, verbatim):** *"Positive
pressure and induction can tip a compensated bleeding patient into arrest."* · *"In haemorrhagic arrest, stopping the
bleeding and giving blood come first; compressions cannot fill an empty heart."* · *"EtCO₂ and the arterial diastolic
pressure show how good the CPR is, and they show the return of circulation."* Phones: 3 followed, no S12-F2 (largest
mismatch 1.5 s, HR at the junctional drop) [E132].

**Traps:** no CPR before asystole (CPR on the PEA stops its slide to asystole). Shock only in VF. After the second
shock keep CPR to the 2-min rhythm check, even after the arterial line shows the return (≈ 20:58); stop at the rhythm
check (≈ 21:54). Press ×1 at the asystole **state**, not by the clock: the slide is seeded and the ECG went flat at
15:27–15:30 in every run. The second epinephrine is in the state after the first shock: press it before the second
rhythm check.

---

## 4. The Debrief (haemorrhage). Slot 3:30 (T+18:40 → 22:10)

Open it before loading anything else: it reports the current run. The objectives are final (E132): no "draft" on the
panel, the report or the print.

| T+ | Do | The audience sees |
|---|---|---|
| 18:40 | Session bar → **Debrief** | the report of the run just finished: page 1 the header, **Key times**, **The course** and the objectives; page 2 the **Key moments** and the measured facts |
| 18:55 | **Run by**: "Showcase 2, 3 November"; one line in **Notes** | — |
| 19:10 | Read the **Key times** tiles | **Start → first team action 35 s** · **CPR 4 min 40 s** after the pulse loss (asked ≤ 30 s) · **CPR stopped 58 s** after the return of circulation (asked ≤ 2 min 30 s) · **pulseless in all 9 min 58 s** [E132 Debrief keyTimes] |
| 19:40 | The objectives aloud | – Recognise PEA from hypovolaemia (the instructor judges it; name the pseudo-PEA) · ✗ CPR within 30 s: the demo withheld it on purpose, as the objective says · ✓ the return of circulation recognised at the rhythm check |
| 20:10 | **Key moments** (page 2) · **Timeline** | 21 key moments in the report; **79 timeline rows, 23 minute rows**; facts: lowest SpO₂ 96 % at 00:10 · lowest ART M / NIBP M 3 mmHg at 11:13 · highest EtCO₂ 55 at 22:54 · pulseless 9 min 58 s, first lost at 11:00 · return of circulation 9 min 58 s after the pulse loss (20:58) · epinephrine 2 mg (2 doses) · labs: K⁺ 4.5 · lactate 4.9 · pH 7.18 [E132 Debrief] |
| 20:55 | **Print or save as PDF** → save. **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers).** Then **Print the learner handout** (optional) | the report: **8 A4 pages**, title "Debrief Class IV haemorrhage, PEA and resuscitation ‹date›" [E132]; the handout: **1 A4 page** (on kit e0c73a47 it printed 2: the 21 key moments and the three take-home lines pushed the third line onto page 2; the compact handout layout for a long Key moments table was tightened for it, Debrief e2e 258.7 mm of 267) [E132]. Check the handout lists both shocks and the return of circulation before giving it out |
| 21:40 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

The handout and the report carry no fast-forward banner here (the haemorrhage has no span); after a span, print only
once the banner has gone (≈ 8 s) [UIR #9].

---

## 5. Close (T+22:10 → 25:10) and questions (T+25:10 → 29:30)

**Roadmap, one slide's worth** [RM]:
- **v1.0** (now: the release candidate). Feature work is merged; hardening, calibration and the release remain. The
  calibration pass follows the rc. Known limits in the release notes: education only, adults only, known misses listed
  with their measured value and target, shock decompensation and reflex bradycardia not modelled [RM v1.0-remaining].
- **v1.x**: maintenance only, no new physiology [RM README].
- **v2.0**: a physiological simulation engine: one declared state with units and conservation by construction; an
  autonomic hub and reflexes (the first workstream); failure that emerges from supply and demand; a patient parameter
  layer; predictive validation; the missing systems (coagulation, sepsis, laboratory values, paediatric and obstetric
  physiology); an intended-use statement [RM v2.0 README "Workstreams"].

**The ask to the deans** (wording and figures are the owner's; none are in the sources):
- Funding: ‹amount, for what: e.g. the calibration pass, the blind realism review, v2.0's first workstream›.
- A research line: ‹e.g. the Saadat bedside comparison and the blind review, both built and not yet run [SC1 handout
  "Not yet done"]›.
- Adoption: ‹residency use: instructor-led, one laptop and a projector, phones as learner monitors›.

**Questions** (4:20; the first thing to cut if running over): see the presenter guide for the validation answer.

---

## 6. Fallbacks

| What happens | What to do | Source |
|---|---|---|
| The kit cannot start on the day | Open the GitHub Pages site in Safari; everything runs except the phones — skip the QR (T+0:30–2:15) and use that time for the second-screen window; needs internet | [E13, E14: owner 2026-10-18] |
| The QR relay fails, "Start Classroom" needs Node, or phones say "cannot reach the instructor's laptop" | Carry on with **Start Simulator** and **Open on a second screen** (the same browser) for the projector; phones are not needed for either case | [CR12 "(c)" and "If something goes wrong"] |
| The sheet says "The relay does not answer", or the black window stops | Close the Classroom window, double-click **Start Classroom** again, reload the page, **Sound on**. A kit before 62e521c3 stops at the first phone (KR-A1): use the 62e521c3 kit or later | [CR12; MEAS §9 item 1] |
| Sound fails | Say so (*"the sound has failed; the alarms still show on screen"*) and continue; alarms stay visual | [G10 §7] |
| A card press shows **"Not available now: the case has moved to …"** | Press again: the button now belongs to the current state | [G10 §8 item 1] |
| A scenario goes wrong (wrong press, missed window) | Session bar **Bookmark** list → **Return here** on the bookmark taken at Load (the **last** one in the list: MH's "Bookmark 1 at 00:06" stays in it while the haemorrhage runs, whose own is "Bookmark 2 at 00:11" [Q1-2D]); the patient and the screen are restored together. **The alarms come back as they were when the bookmark was taken** | [FU-11 E4; A3.2] |
| Something went wrong: the toast "The monitor stopped — Restart the patient" | **Restart patient**, then **load the case again** (Load · All alarms on · Bookmark · speed) and run it from 0:00. After Restart patient the session bar reads **No scenario** and the Return-here list was not on screen (0 buttons in the two-demos run [Q1-2D `fx12`]; 3 of 6 tries before [Q1 FX-12]) | [Q1-2D; Q1 FX-12] |
| You clicked **Ventilator** (top bar or the Start page tile) during a card | Back to **Instructor**. If the phones still say "The ventilator is on the main screen", **Pause** then **Resume** (a pause freed them in the review; a reload too, with the reload line below) | [UIR #2] |
| The page was reloaded mid-case (Cmd-R, a crash) | With the reload fix (#132) the case comes back ("Restored after reload: ‹title›, mm:ss"); without it the bar reads **No scenario**: load the case again from 0:00. **Either way: Sound on again** (click it if it reads **Sound off**), and **All alarms on** if the alarm button does not read **No alarms**. The session code is kept and the phones follow | [UIR #1; #132; MEAS §7] |
| The phones split, or the count drops after you opened another tab | A second instructor tab made a new session: close it and show the QR from the first tab only | [UIR "Two hosts"] |
| The toast "Paused while this tab was hidden (m:ss)" | The instructor tab was hidden: the session paused and resumed on return. Keep the tab in front; in real Safari a hidden tab once lost the phone's session (H19, FX-14, FX-15) | [UIR "Hidden instructor tab"; G12P] |
| A printed page carries the "Fast-forwarded …" banner | It was printed within ≈ 8 s of a span: print again once the banner has gone | [UIR #9] |
| MH: "ventilation back" is not on the card at 14:41 | The card has left Recovering (a dantrolene dose): wait until EtCO₂ has been below 45 for a minute, and press it when it shows | [CARD transitions] |
| Haemorrhage: CPR was started on the PEA | The slide to asystole stops and the card's course does not follow: **Return here** (the last bookmark) and run it again (≈ 5 min of wall), or say it | [S5 E120 slow tests] |
| A phone says "This session is full" | 60 phones are following: ask a neighbour to share | [CR12] |
| The phones show "---" where the screen shows a number after a style change | You changed the monitor style mid-session (FX-9). Change it back, or re-load the case | [MEAS §8; Q1-2D `s12f2`] |
| Running long | Cut questions, then the MH third span and its Pause line, then the MH Debrief glance (§ "The programme at a glance") | [DRAFT] |

---

## Still not measured (on the 3 November path)

1. **The talk.** The two-demos run is presses only (8:25 of wall from the opening to the close); the T+ times add the
   draft's talk allowances, which are planning figures [Q1-2D; DRAFT].
2. **WebKit on the two-demos run.** Not run; the WebKit column is kit round A4 (kits 52b0390b and 33a6c92b), which
   agreed with Chromium within a few seconds (the A4 cards: 1 s for MH, 3 s for the haemorrhage) [A4].
3. **The rc.4 kit.** Every row here is from kit 2ebd743d (still labelled 1.0.0-rc.3) or the A4 kits; the rc.4 kit is
   rehearsed on release day [RC4].
4. **The Start page on the two-demos run.** The run opened `#/teach` directly; the Start page was checked by
   screenshots and its e2e on #131, and one A4 MH run on a kit built from #131 (every press first time) [#131].
5. **The reload fix (#132)** on the two-demos path: its A4 MH run restored within ±3.2 s of the 24 October record
   [R00 2026-10-25 12:10]; not run on the haemorrhage.
6. **Real devices**: measured by the owner on 18 October (one phone over the Mac's hotspot) [G12P; G13 §0]: H17,
   H18 and H20 pass in real Safari; H19 failed (FX-14, FX-15: keep the tab visible); the print passes in Chrome and in
   Safari. Still not measured: router capacity with a room of phones, sound by ear, real Safari tab suspension
   [MEAS §10; UIR "What I could not exercise"].
7. **E13 / E14**: the kit on a Mac with a travel router; the presenting Mac's `node -v` and one Start Classroom run on
   it by the room dry run, Monday 2 November [RC4].
8. **A human's reaction time**: the runs used a fixed 2 s of wall [MEAS §10]. The tightest window is MH's: ventilation
   back is "not met" before 11:05; the talk presses at 14:41, well after it.
9. **The figures for the ask** (funding amount, research line, adoption terms).
10. **The E132 cards on the talk path, on WebKit, and after E131.** The cards after the clinical review were measured on
    kit round A4 only (Chromium, kit e0c73a47) [E132]; not on the two-demos talk run, not on WebKit. E131 (one MH
    metabolic rate, in progress) will move the MH course after the call. The Thursday prep run re-measures both cards.
    The Persian of the E132 strings (card states, objectives, take-home lines, tranexamic acid) is the owner's to
    write: until then the Persian handouts print them in English. Open for the owner: the MH card has no
    "hyperventilate again" step after ventilation back (the EtCO₂ holds at 55 after the second dose).
11. **ID collisions**: the review pack's addendum 2 uses H20 and E17–E19 for other items; this sheet uses the rulings'
    meaning [R31 note 1].

---

# Appendix A: Not in the 3 November programme

*The 22 October slot (owner's answers of 17 October): bronchospasm with the Ventilator view → tamponade → CPR →
drainage → the tamponade Debrief → MH on the pre-E119 card. Kept unchanged for the record; none of it is part of the 3
November programme (R4-Q3 FINAL, 2026-10-24). If a case here is ever used: Load → All alarms on → speed → Bookmark as
always, and start on a freshly reloaded page after the Ventilator view.*

The 17 October answers that concern only these cases: **E17** (meet every timed objective; the tamponade's one line to
discuss, ◆ "Better: pericardiocentesis before the pulse loss", named as the lesson) and **E19c** (the 30-minute slot
with bronchospasm, tamponade with the Debrief moment, MH; premed, plain induction, anaphylaxis and haemorrhage with
Explore dropped to the reserve) [R00 2026-10-17].

### What changed in round C (17 October)

1. **The programme is 30 minutes** (§ "The programme at a glance"). Three cases run; four are in the reserve appendix.
2. **Tamponade: the sheet's path is now measured**, both engines, on kit ca0d2dbb [A3.1]: CPR 3 s after the pulse loss
   (07:48 → 07:51), drainage 1 min 30 s into CPR (09:21), the return of circulation 93.7 s after the drainage (10:55),
   CPR stopped 2 s later, and the Debrief's only line to discuss (◆) is "Better". Every ≈ in Case 2 is gone.
3. **Tamponade: the cue for stopping CPR is "systolic jumps to about 100 (compressions alone read about 70/33)"**, not
   "pressure climbs above 69/32". The compressions alone read 70–71/33 one minute after the drainage and still
   69–70/32–33 at the model's return; only 3 s later the line read 97–114 / 49–51 [A3.1; A3 "against the cue cards"].
4. **No `SPO2 NO PULSE` on the tamponade path**: CPR starts before it would sound [A3.1].
5. **The tamponade Debrief prints 6 A4 pages** on this path, 41 timeline rows, 12 minute rows (the Stage 13 path gave 5
   pages) [A3.1].
6. **Return here keeps "All alarms on" when the bookmark was taken after pressing it**; a bookmark taken before it brings
   back "Limit alarms off" [A3.2]. The order Load → All alarms on → speed → Bookmark is right.
7. **Bronchospasm: ×8 and the 2-min fast-forward are pressed from the Instructor view with the cockpit hidden**, measured
   safe: the cockpit kept driving the patient (11 690 / 11 681 contiguous frames, C / W), the phones kept their hold and
   stayed synced [A3.3].
8. **The speed stays ×8 after a fast-forward pressed at ×8** [A3.3; MEAS §7]: the cards say "back to ×1" where it is
   needed.
9. **MH: the hyperventilation is kept through the fast-forwards** (E22). The round-B instruction "ventilation back the
   moment Recovering shows" would now be "not met" [R00 2026-10-17], and it is what made the EtCO₂ rebound to 57–61
   with `ETCO2 TOO HIGH` [KR62 MH C]. Kept on through span 1, the EtCO₂ read 38 at 12:55; after the press at 13:03 it rose to a peak of 55
   inside span 2 (`ETCO2 TOO HIGH` 14:13), read 45 after span 2 and 42 at the end [MEAS E22].

The round-B corrections that still hold on the 30-minute path: "All alarms on" after every Load [MEAS §7]; tamponade
CPR from the PEA state, never from `SPO2 NO PULSE` [MEAS §0, §5]; stop CPR only on the return of circulation, never on
the compression pressure (a probe that stopped on it re-arrested the patient) [MEAS §5 probe]; the CVP is on the IBP2
tile [MEAS §5]; MH potassium is "not assessable" on the early path [MEAS §0, §1]; the speed after a fast-forward is
unchanged [MEAS §7]; a higher-priority alarm ends an alarm pause [R00 2026-10-12]; there is no on-screen version label
[MEAS §7]. The corrections about the reserve cases sit with them in the appendix.

### The 22 October programme at a glance (30:00)

The run times are measured; the talk allowances are planning figures, not measurements [showcase 1 used 5 min for
bronchospasm, SC1 "Order for a clinical audience"]. The case runs were rehearsed end to end in one page on the release
build, both engines, presses only (no talk): 9 min 39 s of wall from the opening to the close [Q1]. The talk itself
was not ("Still not measured").

| # | Segment | Speeds used | Run (W, measured) | Slot | Clock (T+) |
|---|---|---|---|---|---|
| 0 | Opening + the QR moment | — | — | **3:00** | 0:00–3:00 |
| 1 | Severe bronchospasm with the Ventilator view (+ the Explore line) | ×4, ×8, two 2-min FF | **1:27** to 8:44 [KR bronchospasm C] + the reload | **5:00** | 3:00–8:00 |
| 2 | Stab wound: tamponade → CPR → drainage | ×8, ×1, ×4 | **3:35** to the crystalloid at 11:28 (W 3:36) [A3.1 raw C / W] | **5:30** | 8:00–13:30 |
| 3 | The Debrief moment (tamponade report, print) | — | — | **3:30** | 13:30–17:00 |
| 4 | Malignant hyperthermia, early call | ×8, ×4, three 5-min FF | **1:49** to 23:34 on the E22 path, ordering A (press at 13:03) [MEAS E22]. It includes the three spans (10.4–10.6 s each, ≈ 31–32 s) [MEAS §1] | **5:30** | 17:00–22:30 |
| 5 | Close: roadmap and the ask to the deans | — | — | **3:00** | 22:30–25:30 |
| 6 | Questions | — | — | **4:00** | 25:30–29:30 |
| | Buffer (a re-press, a "Not available now", a slow Load) | | | **0:30** | 29:30–30:00 |
| | **Total** | | | **30:00** (25:30 before questions) | |

**Minute by minute inside the case slots** (planning figures around the measured runs):

| T+ | What | Length |
|---|---|---|
| 3:00 | Scenario → **Airway and breathing** → Severe bronchospasm: **Load · All alarms on · ×4 · Bookmark**, then top bar **Ventilator** | 0:20 |
| 3:20 | the bronchospasm run, narrated (salbutamol at W 0:33; the span, ×8 and the second span from the Instructor view) | 1:27 |
| 4:47 | **×1**; the salbutamol talk: what recovered on the ventilator, why the phones hold | 1:33 |
| 6:20 | the Explore line (optional, first case item to cut) | 0:30 |
| 6:50 | **Reload** (Cmd-R), **Sound on**, Scenario → **Showcase** | 0:40 |
| 7:30 | buffer inside the slot | 0:30 |
| 8:00 | Tamponade: **Load · All alarms on · ×8 · Bookmark** | 0:15 |
| 8:15 | the tamponade run, narrated, to the crystalloid | 3:35 |
| 11:50 | the talk: CPR alone cannot bring him back; the better course; the known miss | 1:40 |
| 13:30 | **Debrief** (§4): open, Run by, the objectives, the lesson, facts, timeline, print | 3:30 |
| 17:00 | Scenario → **Choose another scenario** (the tamponade is still loaded: the library is hidden until then [Q1]) → **Showcase** → Malignant hyperthermia: **Load · All alarms on · ×8 · Bookmark** | 0:15 |
| 17:15 | the MH run, narrated, with three 5-min spans and the E22 press | 1:49–2:05 |
| ≈ 19:15 | the talk: the early call against the late call; why the hyperventilation stays on; the honesty items | ≈ 3:15 |
| 22:30 | Close and the ask | 3:00 |
| 25:30 | Questions | 4:00 |
| 29:30 | buffer | 0:30 |

> **If running over, cut in this order**
>
> 1. **Questions** (4:00 → 2:00, then out).
> 2. **The MH third fast-forward**: end the case at the point after span 2 (18:20, EtCO₂ 45 [MEAS E22]),
>    provided **the E22 press has already been made**; saves its 10.4–10.6 s of wall [MEAS §1] and about 0:30 of talk.
> 3. **The bronchospasm Explore line** (0:30).

#### The pre-flight hand check that belonged to the bronchospasm case

- [x] **H21** bronchospasm with the Ventilator view, the main screen on the Monitor view for 30 s: the phone keeps its
      hold and EtCO₂ stays steady [G12P H21]. **Passed in the kit round on both engines** (phones held on every 2-s
      sample; EtCO₂ 34–35 → 33–34; 6 020 / 6 017 contiguous cockpit frames) [MEAS §6], **and in A3 for the Instructor
      view with ×8 and a 2-min span** (11 690 / 11 681 contiguous frames, phones held) [A3.3]. Playwright's WebKit is
      not Safari: the real-Safari check is still yours. **PASS in real Safari, 2026-10-18**: the phone held; EtCO₂ rose
      steadily at a low rate over the next few minutes (bronchospasm, no salbutamol, breaths kept going) [G12P].

#### The fallbacks that belonged to these cases

| What happens | What to do | Source |
|---|---|---|
| Tamponade: you missed the PEA moment and `SPO2 NO PULSE` has sounded | Press **Start CPR** at once anyway; the CPR line will be ✗ (12 s at the alarm). Or **Return here** and run the case again | [MEAS §5] |
| Tamponade: you stopped CPR on the compression pressure and he re-arrests | **Return here** and run the case again (≈ 3:35 of wall), or say it: it is the trap the sheet warns about | [MEAS §5 probe; A3.1] |
| A phone says "The ventilator is on the main screen" | Expected during the bronchospasm case | [CR12; MEAS §6; A3.3] |

#### Case 1 (22 October): Severe bronchospasm on the ventilator (Ventilator view). Slot 5:00 (T+3:00 → 8:00)

Card: *Severe bronchospasm on the ventilator*, chip **Airway and breathing** (not Showcase) [CARD]. States: Severe
bronchospasm → Salbutamol given: ventilation recovering [CARD].

Rules: **load the case first, then open the Ventilator view** (it takes over ventilation) [RUN4 header]; the phones hold
and say "The ventilator is on the main screen" until the next case [CR12; MEAS §6]. The session bar (speed, 2 min,
Bookmark) is on the **Instructor** view only: go to **Instructor** to press it, then back to **Ventilator**. **Pressing
×8 and the 2-min fast-forward from the Instructor view, with the cockpit hidden, is measured safe**: the cockpit kept
driving the patient through ×8 and the span (11 690 / 11 681 contiguous frames, C / W), the phones kept their hold and
stayed synced, and the speed was still ×8 after the span [A3.3]. The VTE and minute-volume numbers below come from the
13 October run, which sent the same commands through the ventilator link from the Ventilator view [MEAS §6].

| W | Sim | Speed | Press / do | Point at (measured, C and W identical) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on**, **Bookmark**, then top bar **Ventilator** (opened at 00:27) | `%SPO2 LOW` at 00:28; lowest SpO₂ 87 % at 00:30 [MEAS §6]. On the release build, with ×4 pressed after All alarms on (the cards' order), the Ventilator view opened at 00:25: an RR alarm at 00:09–00:12 (`RR TOO LOW` C, `RR TOO HIGH` W), then `%SPO2 LOW` at 00:35, lowest SpO₂ 86 % at 00:37–00:39 [Q1] |
| 0:22 | 1:27 | ×4 | — | **before salbutamol: VTE 300 mL, Ppeak 35, expiratory minute volume 4.2 L/min, banner "⚠ High pressure (Pmax)"**; monitor EtCO₂ 32 [MEAS §6] |
| 0:33 | 2:08 | ×4 | **Instructor** → **Give salbutamol 250 µg** → back to **Ventilator** | salbutamol at 02:08 [MEAS §6] |
| ≈ 1:01 | 4:03 | — | **Instructor** → **2 min** fast-forward (the cockpit keeps ventilating, hidden), then **×8**; back to **Ventilator** | 10.4 s of wall; "During it: no alarms" [KR bronchospasm C]; cockpit and phones as A3.3 |
| 1:14 | 6:16 | ×8 | point; then **Instructor** → **2 min** fast-forward again (×8 stays ×8 after it); back to **Ventilator** | 4 min 08 s after salbutamol: **VTE 501, Ppeak 34, MV 7.0**, no Pmax banner (the banner now reads "⚠ Intrinsic PEEP"); EtCO₂ 33–34 [MEAS §6; KR bronchospasm C] |
| 1:27 | 8:44 | ×8 → **×1** | end: **Instructor → ×1** (the speed is still ×8 after the span [A3.3]); talk; then **reload the page (Cmd-R)** before the next case | 6 min 36 s after: **VTE 501, Ppeak 32, MV 7.0**; EtCO₂ 34; the ventilator reads "No active alarms" [MEAS §6; KR bronchospasm C] |

**Say:** narrate the delivered tidal volume and minute volume recovering (300 → 501 mL, 4.2 → 7.0 L/min) and the
high-pressure banner going out [MEAS §6]. The phones wait on "The ventilator is on the main screen": the ventilator is
a real cockpit driving the patient, and it lives on the main screen [CR12; MEAS §6]. The H5 numbers of FU-11 B
(311 → 498 → 501) still hold within 11 mL [MEAS §6].

**The Explore line** (optional, 0:30; the third thing to cut if running over). Spoken only, no press: *"What you see on
the monitor and the ventilator is the surface. A real monitor shows a handful of numbers; here the model carries the
whole body behind them, and an instructor can open it while a case runs: that is the Explore physiology view."* The
Explore view itself is not opened on the 30-minute path: its only measured use is the haemorrhage case, now in reserve
(R4) [MEAS §4]. Opening it during bronchospasm was not measured.

**Reload before tamponade.** A Ventilator view opened earlier in the page once kept ventilating a later patient, which
then did not arrest [R00 2026-10-04 "CRITICAL DEMO RULE"; SC1 rule 5]. FU-11 H6 now unloads the cockpit on a new
patient [F11B H6], but the reload is the measured-safe path. After the reload: **Sound on** again (a reload loses it),
then Load the next case and **All alarms on** as always; the session code is kept and the phones are still synced 15 s
later [MEAS §7].

**Debrief objectives and the expected verdict** [CARD; MEAS §6] (not opened on the day): – recognise bronchospasm (the
instructor judges it) · ✓ treat with a bronchodilator (salbutamol at 02:08) · – watch VTE and minute volume recover
(the instructor judges it). 16 timeline rows [MEAS §6].

#### Case 2 (22 October): Stab wound: tamponade, PEA and pericardiocentesis. Slot 5:30 (T+8:00 → 13:30)

Card: *Stab wound: tamponade, PEA and pericardiocentesis* (Showcase). States: Arrival → Deteriorating: systolic below
80 → PEA → CPR, ventilated with FiO₂ 1.0 → CPR: pericardium drained, catheter left in → Return of circulation →
Post-ROSC: 500 mL crystalloid running [CARD]. **Start CPR, intubate, FiO₂ 1.0** is offered only once the card is in
**PEA**; **Pericardiocentesis during CPR** only during CPR [CARD transitions]. Start on the freshly reloaded page.

The owner's answer E17: meet every timed objective. **This path was run as written, both engines, on 17 October**
[A3.1]: every row below is measured.

| W | Sim | Speed | Press / do | Point at (measured; C, W within 1 unit unless given) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | `CVP MEAN TOO HIGH` at 00:22 [A3.1] |
| 0:08 | 1:00 | ×8 | **When the cues appear (CVP rising on the IBP2 tile, narrow pulse pressure, tachycardia): read out the bedside finding, "Bedside FAST: pericardial fluid, right-ventricular collapse", then name it aloud and tick *Name the tamponade* on the Scenario tab** (E54). The FAST line is the card's note in Arrival (and again in Deteriorating), shown under the state on the Scenario tab: a tamponade cannot be diagnosed from the monitor alone, so the scan is narrated, as are the muffled heart sounds (the engine has no auscultation and no ultrasound). The Debrief's recognition tile shows the time you ticked | HR 97, ART 105/85 (91), SpO₂ 98, EtCO₂ 32 [A3.1 raw 01:04]; **the CVP is the IBP2 tile: 17** (limits −5–15) [MEAS §5; A3 "matched as written"] |
| 0:45 | 6:00 | ×8 | — | `SPO2 LOW PERFUSION` 05:59, `ART SYS TOO LOW` 06:06; state Deteriorating 06:14 / 06:13 (C / W) [A3.1] |
| 0:53 | 7:00 | **×1** | slow down for the arrest | HR 147, ART 62/54 (57), EtCO₂ 21 [A3.1 raw 07:06]; then `ART MEAN TOO LOW` 07:03, `HR TOO HIGH` 07:10, `ART DIA TOO LOW` 07:17, `ETCO2 TOO LOW` 07:21 [A3.1] |
| 1:18 | 7:31 | ×1 | `IBP1 STATIC PRESSURE`: **the arterial trace is going flat.** Hand on the Scenario tab | [A3.1]; then `HR TOO LOW` 07:45 [A3.1] |
| 1:36 | **7:49** | ×1 | state **PEA** (07:48 is the pulse loss) → **Start CPR, intubate, FiO₂ 1.0 AT ONCE**. Do NOT wait for `SPO2 NO PULSE` | at the state: HR 45, arterial mean only ≈ 21, EtCO₂ 14 [A3.1 raw 07:49]. CPR at **07:51**, 2 s after "PEA" [A3.1]. The rule is 10 s from **07:48**: press by **07:57**. On this path `SPO2 NO PULSE` never sounds [A3.1]; on a late path it comes at 07:58, already too late [MEAS §5] |
| 1:39 | 7:53 | **×4** | set ×4 | — |
| 1:58 | 9:00 | **×1** | set ×1 | CPR alone, before drainage: **40/19 (27), EtCO₂ 9**, HR 114 [A3.1 raw 09:05] |
| 2:15 | **9:21** | ×1 | **Pericardiocentesis during CPR** (1 min 30 s into CPR; the rule is 120 s: press by **09:51**). If "Not available now": press again | drained at 09:21, 1 min 30 s into CPR [A3.1]; the line still 41/20 (28) [A3.1 raw 09:22] |
| 2:15 | 9:22 | **×4** | set ×4 | — |
| 2:30 | 10:22 | **×1** | set ×1; watch the arterial line | one minute after drainage, compressions only: **71/33 (46) C / 70/33 (46) W**, EtCO₂ 17. **This is the compressions, not a pulse: do NOT stop** [A3.1] |
| 3:02 | **10:55** | ×1 | **the return of circulation**: the **systolic jumps to about 100 (compressions alone read about 70/33)** → **Pulse back: stop CPR** (the rule allows 30 s) | the model's return at **10:55, 93.7 s (C) / 93.8 s (W) after the drainage**; at that moment the line still read 69/32 (45) C / 70/33 (46) W, and 3 s later **114/51 (76) C / 97/49 (68) W**. Stop pressed at 10:57, 2 s after the return [A3.1; A3 "against the cue cards"] |
| 3:34 | 11:27 | ×1 | — | 30 s after stopping CPR: **ART 115/77 (90), HR 64, EtCO₂ 28** [A3.1] |
| 3:35 | 11:28 | ×1 | **Crystalloid 500 mL** → go straight to §4 (the Debrief) | then `ART MEAN TOO HIGH` 11:03 and `ART DIA TOO HIGH` 11:04 had already come with the overshoot [A3.1] |

WebKit's W matched within half a second (CPR 1:39, crystalloid 3:36) [A3.1 raw W]. During CPR at ×4 the phones' HR
differed from the instructor's for up to 3 s while HR swung between about 50 and 110: a fast-moving value, not a stale
one [A3.1 "Phones"].

**The trap, measured:** a probe stopped CPR on the compression reading (69/32). The patient re-arrested (`SPO2 NO PULSE`
11:34, `ECG ASYSTOLE` 13:44) and the Debrief said "The return of circulation did not happen" [MEAS §5 probe]. Wait for
the systolic to jump to about 100 [A3.1].

**Say:** PEA about 8 minutes after arrival without drainage [CARD story; A3.1: pulse loss 07:48]; CPR alone cannot
bring him back (40/19 before drainage); drainage during good CPR brings the pulse back about a minute and a half later
[CARD story; A3.1: 93.7 s]. The better course was to drain BEFORE the pulse was lost, while the systolic was still above
60: in the engine, a drainage 60 s into the deterioration gives no PEA at all [G11 §3 S2 early drain]. Known miss: no
pulsus paradoxus in this model [SYN (b); R24 P3: SBP swing 3.4 mmHg against > 10 expected].

**Debrief objectives and the verdict, measured** [CARD; A3.1, identical in both engines]:
- Name the tamponade within 180 s (no rule): **✓ Observed**, "Observed by the instructor at mm:ss.", with the time you
  ticked it in the Scenario tab when the cues appeared (≈ 01:00 on this path, E54); **– Not assessable**, "This
  objective has no rule: the instructor judges it.", when nobody ticked it (E44) [`apps/demo/src/app/views/debrief.ts`].
- ✓ Observed: CPR within 10 s of the pulse loss: "CPR 3 s after the pulse loss (07:48 → 07:51)".
- ✓ Observed: pericardiocentesis within 120 s of starting CPR: "1 min 30 s after CPR (07:51 → 09:21)".
- ✓ Observed: stop CPR within 30 s of the pulse returning: "2 s after the return of circulation (10:55 → 10:57)".
- **◆ Discuss: "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then
  no PEA follows"**, with "The pulse loss at 07:48". This is the one line to discuss of the day (E17, E43): the better
  course of action, named as the lesson, not a timing.

#### The Debrief moment after the tamponade (22 October). Slot 3:30 (T+13:30 → 17:00)

The owner's answer E17: every timed objective is met, and the tamponade report shows exactly one line to discuss
(◆ Discuss, E43), the structural "Better: pericardiocentesis before the pulse loss" line: the card's way of saying that the better course was to drain
before the arrest [CARD: objective 5, whose rule is that the pulse loss never happens; A3.1]. Name it as the lesson.

| T+ (within the slot) | Do | The audience sees |
|---|---|---|
| 0:00 | Session bar → **Debrief** | the report of the run just finished: page 1 the header, **Key times**, **The course** and the objectives; page 2 the **Key moments** and the measured facts [Debrief redesign B] |
| 0:15 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** | — |
| 0:30 | Read the **Key times** tiles, then the objectives aloud | tiles: recognition = the time you ticked (≈ 1 min) · start → first team action **7 min 51 s** · CPR **3 s** (asked ≤ 10 s) · drainage **1 min 30 s** (asked ≤ 2 min) · stop CPR **2 s** (asked ≤ 30 s) · pulseless in all **3 min 07 s** [A3.1 record, B e2e]. Objectives: ✓ Observed: name the tamponade ("Observed by the instructor at mm:ss." when ticked; – Not assessable if not) · ✓ Observed: CPR 3 s · ✓ Observed: pericardiocentesis 1 min 30 s · ✓ Observed: stop CPR 2 s · **◆ Discuss: "Better: pericardiocentesis before the pulse loss…" — "The pulse loss at 07:48"** [A3.1] |
| 1:00 | Say: *"Everything was done in time, and the report still marks one line to discuss: the better course was to drain before he lost his pulse. That is the lesson."* | — |
| 1:20 | Point at **Key moments** (page 2; the numbers match the course strip) | 7 rows: 06:13 deteriorating · 07:48 pulse lost · PEA · 07:51 CPR · 09:21 drained · 10:55 circulation returned · 10:57 CPR stopped · 11:27 crystalloid, each with HR, MAP, SpO₂ and EtCO₂ at that second; SpO₂ prints "–" from the pulse loss to the return of circulation, with the sentence that says why (E60) [A3.1 record, B e2e]. **Measured facts** follow: lowest SpO₂ 95 % at 00:28 · lowest ART M / NIBP M **20 mmHg at 07:51** · highest EtCO₂ 36 at 00:09 · **pulseless 3 min 07 s in all, first lost at 07:48** · return of circulation 3 min 07 s after the pulse loss (10:55) · labs: K⁺ 4.2 · lactate 2.2 · pH 7.28 [A3.1] |
| 1:50 | Scroll to **Timeline** | undone rows struck through [G13 §5]; **41 timeline rows, 12 minute rows** [A3.1] |
| 2:15 | **Print or save as PDF** → save. **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers).** Then **Print the learner handout** (optional on the day; same dialog setting) | the handout: **1 A4 page**, no marks (the course, the key moments, three questions, take-home lines) [B e2e]. The report: **6 A4 pages** on this path (Chromium; B e2e on the A3.1 record), title "Debrief Stab wound: tamponade, PEA and pericardiocentesis ‹date›" [A3.1]; footer and build on every page in Chrome; in Safari the footer only ends each section [PRINT] |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

Do the Debrief BEFORE loading the next case: it reports the current run.

<details><summary>The 22 October path of this card (before E119), for the record</summary>

#### Case 3 as run on 22 October (the card started induced). Slot 5:30 (T+17:00 → 22:30)

Card: *Malignant hyperthermia* (Showcase). States: Induced (succinylcholine, sevoflurane 2 %) → Surgery under way →
Early signs: EtCO₂ rising at the same ventilation, tachycardia → Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min,
ventilation 20 × 600 → MH treatment under way → Recovering: EtCO₂ below 45 → Ventilation back to 12 × 500, O₂ 100 %
[CARD]. The **MH crisis** button is offered in Induced, Surgery, Early signs and Established [CARD]. **EtCO₂ normal:
ventilation back to 12 × 500** is offered **only in the Recovering state** [CARD transitions].

The owner's answers: call at **Early signs** (E19a); **keep the hyperventilation (20 × 600) through the fast-forwards**
and press **ventilation back** only at **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** (E22). The rule being written
tonight: "hyperventilation kept until EtCO₂ < 40 for 2 min, then normalised"; normalising early is "not met" [R00
2026-10-17]. The rows below to 12:55 are the measured run that kept the hyperventilation (13 October, kit 56f3761f, both
engines) [KR MH early-call C; MEAS §1 "Early call"]; from the press on they are the E22 run, ordering A (kit b08a972b,
both engines) [MEAS E22].

| W | Sim | Speed | Press / do | Point at (measured, C; W within a second) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Choose another scenario** first (the tamponade is still loaded, so the Scenario tab hides the library until it is pressed [Q1]), then **Load**, **All alarms on**, **Bookmark** | — |
| 0:31 | 4:00 | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | state Surgery 04:05; HR 79, ART 99/66 (75), EtCO₂ 40 [KR MH early-call C 04:11] |
| 0:50 | 6:30 | **×4** | watch the CO₂ tile climb at the same ventilation | EtCO₂ 45 at 06:37 [KR MH early-call C] |
| 0:54 | **6:52** | ×4 | state **Early signs** → **tick *Name malignant hyperthermia* on the Scenario tab as you call it** (E52), then **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** at once (the rule allows 120 s) | EtCO₂ 46, HR 86, ART 105/70 (80) [KR MH early-call C 06:53]. No limit alarm before the call: EtCO₂ peaks at 46, under the 49.4 limit [MEAS §1] |
| 0:57 | 7:01 | ×4 | (the call lands: state Trigger off, ventilation 20 × 600) | 9 s after Early signs [MEAS §0]. If "Not available now": press again [G10 §8 item 1] |
| 1:02 | 7:22 | ×4 | **Dantrolene 2.5 mg/kg** (≈ 20 s after the call) | 21 s after the call [MEAS §1] |
| 1:04 | 7:32 | ×4 | **Cool: 2 L saline at room temperature** | — |
| — | 7:27 | ×4 | — | **EtCO₂ falls below 40**, 26 s after the call [MEAS §0]; 38 at 07:35 [KR MH early-call C] |
| ≈ 1:05 | 7:42 | — | **5 min** fast-forward (1 of 3). **Hyperventilation stays on** | 10.4 s of wall; banner "Fast-forwarded 5 min, 07:42 → 12:42. During it: no alarms." [KR MH early-call C]. "Recovering" shows during it (08:36 / 08:35, C / W) [MEAS §1]: **do NOT press ventilation back at Recovering** (E22: early is "not met") |
| 1:19 | 12:55 | ×4 | **Pause**, point; **Resume** | state Recovering; **EtCO₂ 38**, ART 136/90 (104), HR 83 [KR MH early-call C] |
| 1:22 | **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** | ×4 | **EtCO₂ normal: ventilation back to 12 × 500**, at this time and not before. The hyperventilation stayed on through span 1 | Debrief ✓ (pressed 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)"); EtCO₂ 38 at the press [MEAS E22 (A)] |
| ≈ 1:23 | ≈ 13:07 | — | **5 min** fast-forward (2 of 3) | banner "During it: ETCO2 TOO HIGH 14:13, ART MEAN TOO HIGH 17:00, RR TOO HIGH 18:06."; EtCO₂ peaks at **55** inside it (17:22) [MEAS E22 (A)] |
| 1:36 | 18:20 | ×4 | **Pause**, say: "EtCO₂ rose to the alarm limit while CO₂ production settled; the alarm caught it; we keep watching"; **Resume** | **EtCO₂ 45**, ART 147/95 (112), HR 85 [MEAS E22 (A)] |
| ≈ 1:37 | ≈ 18:21 | — | **5 min** fast-forward (3 of 3; the second thing to cut if running over) | `ART SYS TOO HIGH` 22:39 during it [MEAS E22 (A)] |
| 1:49 | 23:34 | ×4 | end: **Pause** | **EtCO₂ 42**, ART 150/95 (113), HR 82 [MEAS E22 (A)] |

Each 5-min fast-forward took 10.4–10.6 s of wall, and ×4 stayed ×4 after it [MEAS §1].

**Repeat dantrolene: – (not needed; do NOT give it on the alarm).** While the hyperventilation was kept, EtCO₂ read
38 at 12:55. After the press at 13:03 it went 38 → 49 at +1 min → a peak of 55 inside span 2 (not visible on the
monitor), with `ETCO2 TOO HIGH` at 14:13 shown latched after span 2; it read 45 after span 2 and 42 at the end
[MEAS E22]. That is the CO₂ production settling, not a relapse: say the presenter line at the 18:20 pause, not a dose. *(Superseded 26 October by the clinical review, E132: the climb is MH not controlled, and the answer is a second dose; §3 Case 1.)*
The card's repeat objective has no rule (the instructor judges it) [CARD]. **Do not give a dose just
before the E22 time**: a dose moves the card out of Recovering ("Dantrolene given" → the crisis checklist), and the
ventilation-back button comes back only after EtCO₂ has been below 45 for a minute [CARD transitions].

**Say (the contrast, measured):** had we waited for the established crisis (Stages 10, 11 and 13 did), the call comes
at 18:57, 12 min 05 s after the early signs: EtCO₂ 81, HR 146, core temperature 39.3 °C, lactate 6.8, pH 7.09, K⁺ 5.8,
and EtCO₂ never back below 40 by 35:00 [MEAS §1, late call]. Untreated, K 6.4 and VF with core temperature 42.3 °C at
44.7 min [G11 §3 S1 untreated]. Honesty: the literature review found 44 min to death too fast for a volatile trigger,
and no human EtCO₂ time course behind the "40 → 60 by 10 min" band [R00 2026-10-11 "LITERATURE 29"; SYN (a) item 11].
After the treated crisis the model stays hypertensive (systolic 136–151 here; known miss C-1) [KR MH early-call C;
G11 §5 Q8]. Do not give the potassium treatment on this path: K⁺ stays 4.2–4.7 [MEAS §1].

**Why the hyperventilation stays on (E22), measured:** when the ventilation went back at "Recovering" (08:43), the
muscle was still producing CO₂: EtCO₂ rebounded to 57 after span 1 and 61 at its highest, with `ETCO2 TOO HIGH` at
10:07 [KR62 MH C; MEAS §0, §1]. Kept on through span 1, it stayed 36–38 with no alarm, and after the press at 13:03 it peaked at 55 inside span 2
and was 42 at the end [MEAS E22].

**Debrief objectives and the expected verdict** [CARD; MEAS §0, §1] (the Debrief is not opened for MH on the day):
✓ Observed (instructor, ≈ 06:52): name malignant hyperthermia (E52: the tick time as recorded; – Not assessable if not ticked) · ✓ call within 120 s of the early signs (9 s) · ✓ dantrolene within 300 s of the call (21 s) · – repeat dantrolene (no
rule: the instructor judges it) · – potassium (**not assessable**: K⁺ never above 5.5) · ventilation back:
**✓ (pressed 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)")** [MEAS E22].

---

</details>

---

# Appendix B: Cases held in reserve

*Dropped from the 30-minute slot by the owner's answer E19c (2026-10-17) and kept here unchanged from kit round B
(PR #65), so they can come back if the slot grows or a question asks for them. Their slots are the round-B 60-minute
planning figures. All four are measured [MEAS §2, §3, §4]. If one is used: Load → All alarms on → speed → Bookmark as
always; haemorrhage starts on a freshly reloaded page if the Ventilator view was opened before.*

The round-B corrections that concern these cases: the premedicated patient's apnoea timing depends on the browser
(38.8 s C / 56.8 s W after Induce, against 52.3 / 53.9 s in the healthy induction), so do not promise that he "stops
breathing sooner" [MEAS §3]; the haemorrhage SVR **rises** in Explore at 8:00 (1951, +659) [MEAS §4]; early CPR in
haemorrhage no longer causes VF, it makes both CPR objectives "not assessable" [MEAS §4 probe]; anaphylaxis epinephrine
at 1:30 into the reaction, not 2:00 (the owner's answer E19b, 2026-10-17) [MEAS §2; R00 2026-10-17].

### Reserve R1: Induction after fentanyl and midazolam (the premed contrast). Round-B slot 4:00, ×4 throughout

Card: *Induction after fentanyl and midazolam* (Showcase). States: Awake, preoxygenating → Fentanyl 2 µg/kg and
midazolam 0.03 mg/kg given → Induced → Intubated and ventilated → (Phenylephrine / Ephedrine given) → Ventilated:
vasopressor given [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on** at once (the RR alarm comes 25 s of wall later), **Bookmark** | HR 70, ART 122/80 (94) [KR premed C 00:07] |
| 0:02 | 0:10 | ×4 | (premedication gives itself) | HR 71, ART 123/81 (96), SpO₂ 96, EtCO₂ 36 [KR premed C 00:10] |
| 0:25 | 1:40 | ×4 | **`RR TOO LOW`** → top-right alarm button → **Devices & alarms** → **Acknowledge**, then tick objective 1 on the Scenario tab | `RR TOO LOW` at **01:40**, 89 s after the premedication, C / W [MEAS §3]. It is raised again (01:53, 02:05) while RR stays low: acknowledge once and move on [MEAS §3] |
| 0:30 | 2:00 | ×4 | — | HR 62, ART 117/73 (87), EtCO₂ 45, RR 6 [KR premed C 02:02] |
| 0:46 | 3:00 | ×4 | **Induce now** | state "Induced" at 03:04 / 03:03 (C / W); HR 60, ART 115/71 (85), EtCO₂ 49 [MEAS §3; KR premed C] |
| 0:56 | 3:42 (C) / 4:00 (W) | ×4 | **`CO2 APNEA`** → **Intubate and ventilate** at once (the rule allows 60 s of sim = 15 s of wall) | apnoea **38.8 s (C) / 56.8 s (W)** after Induce; intubated **9 s** after the alarm, both [MEAS §3] |
| 1:00 | 4:00 (C) / 4:16 (W) | ×4 | **MAP below 60** → **Ephedrine 10 mg** at once (the rule allows 60 s of sim) | ART 84/49 (59) at 04:00 (C) [KR premed C]; ephedrine **8 s** after MAP < 60, both [MEAS §3] |
| 1:03 | 4:11 | ×4 | — | the nadir: ART 78/44 (53), HR 57; MAP nadir **52** [KR premed C; MEAS §3] |
| 1:30 | 6:00 | ×4 | — | MAP back to 65 **112 s (C) / 108 s (W)** after ephedrine: ART 94/53 (65) [MEAS §3; KR premed C] |
| 2:00 | 8:00 | ×4 | end | ART 102/60 (72), HR 61, EtCO₂ 38 (C) / 39 (W) [MEAS §3] |

Limit alarms you will hear (with limits ON): `AWRR TOO LOW` 03:10, `ETCO2 TOO HIGH` 03:29 / 03:34, `RR TOO LOW` +
`AWRR TOO LOW` 03:57, `ART DIA / MEAN TOO LOW` 04:01, `ART SYS TOO LOW` 04:06 (C); WebKit the same pattern 15–20 s later
[MEAS §3].

**Say:** after the premedication the breathing slows until the RR alarm sounds, and after induction the pressure falls
lower and needs a vasopressor: MAP nadir **52** here [MEAS §3] against **64.6–64.7** in the healthy induction
[RS11, Stage 11 build]. **Do not promise that this patient stops breathing sooner**: on this build the apnoea came at
38.8 s on Chromium and 56.8 s on WebKit, against 52.3 / 53.9 s in the healthy induction [MEAS §3] (Stage 11 gave 36 /
47 s [RS11]); the verdicts did not change. Do **not** call it synergy: the probe found the extra fall is about the sum
of the parts [R24 P4; R25 A2]. Phenylephrine 100 µg is the faster alternative (MAP 73.4 at +60 s, HR 53) [G11 §3 S4].

**Debrief objectives and the expected verdict** [CARD; MEAS §3]: – acknowledge the RR alarm within 30 s (no rule: the
instructor judges it) · ✓ intubate within 60 s of the apnoea alarm (9 s) · ✓ vasopressor within 60 s of MAP < 60 (8–9 s)
· ✓ MAP above 65 within 120 s of it (**1 min 52 s C / 1 min 47 s W**: met, but with only 8–13 s to spare; the model sets
it, not the presenter).

### Reserve R2: Healthy induction, airway not secured (plain induction). Round-B slot 4:30

Card: *Healthy induction* (Showcase). States: Awake, preoxygenating → Induced (airway not yet secured) → Airway not
secured: SpO₂ below 90 % → (SpO₂ below 60 %: hypoxic bradycardia, not reached here); rescue buttons **Bag-mask
ventilate, FiO₂ 1.0** and **Intubate and ventilate, FiO₂ 1.0** [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** (preoxygenation, FiO₂ 1.0 held) | — |
| 0:24 | 3:00 | **×4** | **Induce now** (≥ 180 s of preoxygenation: tick objective 1) | state "Induced" 03:07; HR 71, ART 123/81 (95), SpO₂ 99, EtCO₂ 39 [KR induction C 03:10] |
| 0:37 | 4:00 | ×4 | `CO2 APNEA`. Say: *"Today nobody secures the airway."* | **52.3 s (C) / 53.9 s (W)** after Induce [MEAS §3]; `RR TOO LOW` 03:52 and `ETCO2 TOO LOW` 03:54 come first [MEAS §3] |
| ≈ 0:45 | 4:34 | ×4 | **5 min** fast-forward | **10.4 / 10.6 s** of wall; banner "During it: no alarms"; ×4 after it [MEAS §3; KR induction C] |
| 0:58 | 9:47 | ×4 | — | SpO₂ during the gap: **99** at 9:47, 99 at 10:04, 98 at 10:34, 97 / 96 at 11:04 [MEAS §3] |
| 1:23 | 11:26 (C) / 11:24 (W) | ×4 | state **Airway not secured: SpO₂ below 90 %** → **Bag-mask ventilate, FiO₂ 1.0** at once (the rule allows 60 s of sim = 15 s of wall) | at the state change the monitor still reads **SpO₂ 94** (the device lags), 8.3 min after induction [MEAS §3]. Pressed 8 s after the state [MEAS §3] |
| 1:26–1:36 | 11:34–12:15 | ×4 | watch SpO₂ fall a little more, then recover | from the bag-mask press: 91 at 5 s · 89 at 15 s · **nadir 87 at 19 s** · 90 at 25 s · **95 at 30 s** · 99 at 40 s; EtCO₂ 64–65 [MEAS §3] |
| 1:36 | ≈ 12:15 | ×4 | **Intubate and ventilate, FiO₂ 1.0** (≈ 40 s after the bag-mask) | EtCO₂ above 25 **3.2 s (C) / 3.3 s (W)** after the tube; EtCO₂ 55 [MEAS §3] |
| ≈ 1:50 | ≈ 13:15 | — | end | EtCO₂ 53 one minute after the tube; 49 at 15:00 (C) [MEAS §3] |

Limit alarms after the bag-mask: `RR TOO LOW` + `AWRR TOO LOW` 11:40, `ETCO2 TOO HIGH` 11:41, `%SPO2 LOW` 11:48 (C;
WebKit `%SPO2 LOW` 11:45) [MEAS §3].

**Say:** desaturation comes about 8 minutes after induction with nothing done [MEAS §3: 8.3 min]; the oximeter lags, so
SpO₂ keeps falling for about 20 s after ventilation starts (nadir 87 %) and is back to 95 % at 30 s [MEAS §3]. If
nothing were done, hypoxic bradycardia follows [RS11 rescued branch, Stage 11 build].

**Debrief objectives and the expected verdict** [CARD; MEAS §3]: – ≥ 180 s preoxygenation (the instructor judges it) ·
**✗ intubate within 90 s of the apnoea alarm (7 min 32 s): not met by design of this branch — do not open the Debrief
for this case** · ✓ EtCO₂ > 25 within 30 s of intubation · ✓ ventilate within 60 s of SpO₂ < 90 % (9 s) · – ventilate
within 300 s of SpO₂ < 60 % (not reached).

### Reserve R3: Anaphylaxis under anaesthesia. Round-B slot 3:30, ×4

Card: *Anaphylaxis under anaesthesia* (Showcase). States: Ventilated, stable → Anaphylaxis (starts by itself after 1 min)
→ Epinephrine given [CARD].

*The owner's answer E19b (2026-10-17):* epinephrine at **about 1:30 into the reaction** [R00 2026-10-17].

| W | Sim | Speed | Press / do | Point at (measured, Chromium on kit 62e521c3; WebKit within 1 unit) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on**, **Bookmark** | — |
| 0:15 | 1:00 | ×4 | (the reaction starts by itself at 01:00) | HR 74, ART 119/83 (96), SpO₂ 99, EtCO₂ 33 [MEAS §2] |
| 0:23 | 1:30 | ×4 | — | HR 83, ART 114/80 (91) [MEAS §2] |
| 0:31 | 2:00 | ×4 | — | HR 99, ART 109/79 (89) [MEAS §2] |
| 0:38 | **2:30** | ×4 | **Give epinephrine 100 µg** (1 min 30 s into the reaction) | HR 116, ART 105/77 (86): the lowest systolic before epinephrine is 104 [MEAS §2] |
| 0:40 | ≈ 2:35 | ×4 | — | systolic above 110 **5.3 s** after epinephrine [MEAS §2] |
| 0:42 | ≈ 2:47 | ×4 | **Drugs & fluids** → **Crystalloid 500 mL over 10 min** → **Give** (15–17 s after the epinephrine; objective 3, "Give fluid") | toast "Crystalloid 500 mL over 10 min" [MEAS §2] |
| 0:45 | 3:00 | ×4 | — | HR 105, ART 124/91 (101); HR peak after epinephrine **144–145** [MEAS §2] |
| 1:01 | 4:00 | ×4 | — | HR 99, ART 133/96 (108) [MEAS §2] |
| 1:16 | 5:00 | — | end | HR 98, ART 133/95 (108); SpO₂ 99 and EtCO₂ 32–34 throughout [MEAS §2] |

The only limit alarm on this path is `**ABPd 94>90` at 05:21, after the end [MEAS §2]. No HR alarm.

**Why 1:30, not 2:00:** the Debrief's rule is epinephrine within 120 s of the Anaphylaxis state [CARD rule]. At **2:03**
(showcase 1's timing) the kit round measured: **✗** "2 min 03 s, within 2 min 00 s asked", HR peak **171**, and
**`HR TOO HIGH` at 03:10**; the systolic fell to 95 first [MEAS §2]. Untreated, at 03:38: HR 152, ART 79/56 (63) [KR
session-mechanics C].

**Debrief objectives and the expected verdict** [CARD; MEAS §2]: – recognise anaphylaxis (the instructor judges it) ·
✓ epinephrine within 2 min of the reaction (1 min 30–31 s) · ✓ give fluid. Timeline 13 rows, 6 minute rows [MEAS §2].

### Reserve R4 (round B; SUPERSEDED by the E120 card, §3 Case 2): Class IV haemorrhage, PEA and resuscitation (+ the Explore moment). Round-B slot 7:30

Card: *Class IV haemorrhage, PEA and resuscitation* (Showcase). States: Bleeding 2.5 L over 10 min → CPR, 2 L warmed
fluid, epinephrine 1 mg → Return of circulation [CARD]. Start on a freshly reloaded page if bronchospasm ran before.

| W | Sim | Speed | Press / do | Point at (measured; W within 1 unit) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | bleeding 250 mL a minute (card: 2.5 L over 10 min) [CARD]; HR 71, ART 118/81 (93) [KR haemorrhage C 00:13] |
| 0:12 | 1:00 | **Pause** | **Explore physiology** → **Set the baseline now** → back → **Resume** | baseline taken at 01:04 [MEAS §4] |
| 0:19 | 2:00 | ×8 | — | HR 81, ART 114/83 (93), EtCO₂ 34 [MEAS §4] |
| 0:34 | 4:00 | ×8 | point (optional Pause) | HR 95, ART 108/82 (90), EtCO₂ 33 [MEAS §4] |
| ≈ 0:38 | 4:30 | ×8 | — | **HR crosses 100** [MEAS §4] |
| 0:50 | 6:00 | ×8 | — | HR 121 at 6:00 (**crosses 120 at 6:05**), ART 98/80 (86), EtCO₂ 30 [MEAS §4] |
| ≈ 0:57 | 6:56 | ×8 | — | **systolic below 90** [MEAS §4] |
| ≈ 1:02 | 7:46 | ×8 | — | `ART SYS TOO LOW`, the first limit alarm [MEAS §4] |
| 1:05 | 8:00 | **Pause** | **Explore physiology** → **Changed only**: what the monitor hides. Back, **Resume** at **×4** | **HR 139 (crosses 140 at 8:00), ART 74/60 (65), EtCO₂ 25** [MEAS §4]. Explore, changed only: **CO 2.51 L/min (−2.66), SV 18 mL (−53), SVR 1951 (+659, it RISES)**, DO₂ 528 (−554), SvO₂ 54 % (−25), O₂ debt 153 mL, sympathetic tone +32.6 [MEAS §4] |
| — | 8:21–9:51 | ×4 | — | `SPO2 LOW PERFUSION` 08:21 · `ART MEAN TOO LOW` 08:35 · `HR TOO HIGH` 08:49 · `ART DIA TOO LOW` 09:01 · `ETCO2 TOO LOW` 09:51 [MEAS §4] |
| 1:42 | 10:00 | **×1** | slow down for the arrest | — |
| 1:42 | 10:05 | ×1 | `IBP1 STATIC PRESSURE`: the arterial number becomes mean only (≈ 13). **Do not press CPR yet** | [MEAS §4; KR haemorrhage C 10:05] |
| — | 10:29 | ×1 | (the pulse loss, as the Debrief will time it) | **10:29**, C / W [MEAS §4] |
| 2:17 | 10:40 | ×1 | **`SPO2 NO PULSE`** → **Start CPR, 2 L and epinephrine** at once (the rule is 30 s from 10:29: press by 10:58) | alarm 10:40; CPR 10:42–10:43 = **13 s** after the loss [MEAS §4] |
| 2:20 | 10:43 | — | **2 min** fast-forward (CPR running) | 10.0 / 10.1 s of wall; **×1 after it** [MEAS §4] |
| 2:33 | 12:43 | **×4** | set ×4 yourself; watch the arterial trace and the capnogram | CPR at 12:46: ART 65/30 (43), HR 136, EtCO₂ 15 [KR haemorrhage C] |
| 2:46 | 13:38–13:40 | ×4 | the return of circulation (13:38), then **systolic above 90** (13:40) → **Pulse back: stop CPR** | ROSC **13:38** (C) / 13:39 (W), 3 min 09 s after the loss, 55 s after the span ended; systolic > 90 at 13:40, 178 s into CPR [MEAS §4] |
| 2:49 | 13:51 | ×4 | — | at the press: **ART 203/106 (144)**, HR 100: the overshoot (C); on W the arterial line blanked for a moment [MEAS §4] |
| 3:04 | 14:48 | ×4 | end | 1 min after: ART 135/90 (105), HR 74–75, EtCO₂ 34–35 [MEAS §4] |

The W column includes the kit round's short scripted pauses at 1:00 and 8:00 (5–10 s); your Explore talk adds to it.

**Say:** the pressure holds and only the heart rate tells you; then the pulse pressure narrows [SC1 haemorrhage "Say"].
On the monitor: HR above 100 at 4:30, above 120 at 6:05, above 140 at 8:00, systolic below 90 at 6:56 [MEAS §4]. ATLS
classes are a teaching construct, and the model's heart rates fit registry data better than the ATLS table [SYN (a)
item 1]. In Explore at 8:00: the output has fallen by half and the **resistance has risen** (SVR +659), as it should
when a patient bleeds; the oxygen delivery has halved [MEAS §4]. Known miss to say out loud: shock decompensation and
reflex bradycardia are not modelled [RM v1.0-remaining "Not in v1.0"].

**Early-CPR trap:** CPR pressed at `IBP1 STATIC PRESSURE` (10:07), before `SPO2 NO PULSE`, no longer causes VF on this
build (it did on showcase 1's): the systolic is back above 90 within 48 s, the pulse loss never happens, and the Debrief
marks both CPR objectives "not assessable" [MEAS §4 probe]. Press at the alarm.

**Debrief objectives and the expected verdict** [CARD; MEAS §4]: – recognise PEA from hypovolaemia (the instructor
judges it) · ✓ CPR within 30 s of the pulse loss (13 s) · ✓ the pulse back within 6 min of its loss (3 min 09 s).
42 / 43 timeline rows, 15 minute rows; lowest ART M 3 at 10:42; lactate max 2.8 [MEAS §4].
