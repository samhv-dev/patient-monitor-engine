# Showcase 2: run sheet (30 minutes, the owner's slot)

*Tuesday 3 November 2026 (12 Aban 1405), university deans and clinical staff. Presenter: the owner. **One case
(owner, 29 October): malignant hyperthermia on the E119 card, with three pauses ("look-inside stops") in which the
owner explains the physiology the engine is computing, on the Explore view, with the matching model page open behind it
in a second browser tab.** The class IV haemorrhage case (E120) leaves the programme and stays in the build as a reserve
(Appendix B, Reserve R5). Bronchospasm and tamponade are not in the programme; their sections, the round-C notes and the
other reserve cases are kept, unchanged, in the appendices. Frozen and tagged early by the owner's ruling of
29 October: **v1.0.0-rc.4 (pre-release) was tagged on 29 October** (0c4b396f); **its kit is
`_sandbox/pme-kit-release-0c4b396f/`**, rehearsed on both engines that day [Q2-rc4], and the **rc.3 kit
`_sandbox/pme-kit-release-fcf99b70/` is its fallback**. An rc.5 candidate from main is rehearsed separately; which kit
is in the room is decided at the room dry run [R00 2026-10-29]. The owner's smoke and live rehearsal Sunday evening;
the room dry run Monday 2 November [RC4]. Every stop says only what the speaker's reference [SPK] says the build
computes.*

> **History.** 22 October slot (17 October answers): bronchospasm → tamponade → Debrief → MH. 24 October: the two
> live-demo cards changed (E119 MH with the induction, E120 the owner's haemorrhage course, E121 no implicit oxygen;
> kit round A4); the demo, then planned for Wednesday 28 October, was postponed a week (first assumed Wednesday
> 4 November, 13 Aban; then the owner's "nov 3rd"), and the programme became two demos (R4-Q3). 24 October evening: the demo UI review [UIR]. 25 October:
> the app opens on a full Start page (E123, #131). 26 October: Home, Room and Scenarios replace it (E125; the QR is on
> the Room), and the owner accepted the clinical review of the two demo
> cards in full (`scratch/plans-backup/demo-cards-clinical-review.md`, 13 findings) and the cards, this sheet, the cue
> cards and the presenter guide follow it (E132). 28 October: the owner's rulings on the MH second dose (OWR4).
> **29 October: the programme becomes one case, MH, with three look-inside stops (P29); the haemorrhage goes to the
> reserve.** The talk run behind this sheet is [Q1-MH].

Companions: [`SHOWCASE-2-PRESENTER-GUIDE.md`](SHOWCASE-2-PRESENTER-GUIDE.md) (one page: what to remember, the stop
method, the stage rule, keys, the validation answer) and [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) (one
printed page per segment; each stop has its own card).

## The owner's answers built into this sheet

| # | Question | The owner's answer | Where |
|---|---|---|---|
| P29 | The programme (2026-10-29) | **One case, malignant hyperthermia, with three pauses in which he explains the physiology the engine is computing**, on the Explore view with the matching model page behind it. Haemorrhage out of the talk, kept in the build as a reserve. Supersedes R4-Q3 | Programme, §3 |
| R4-Q3 | The programme (2026-10-24) | *Superseded by P29.* Two live demos only, MH and haemorrhage; bronchospasm and tamponade out [R00 2026-10-24 15:35] | Appendix B (R5) |
| — | The date | **Tuesday 3 November 2026 (12 Aban 1405)** [RC4] | everywhere |
| E119 | MH card | Starts awake on room air; every induction step is a button | §3 |
| E120 | Haemorrhage card | The owner's course: PEA left untreated → asystole → CPR → VF → two shocks → ROSC (in the reserve since P29) | Reserve R5 |
| E121 | Oxygen | Never implicit: the MH card preoxygenates by button, the haemorrhage card gives mask oxygen by button | both |
| E123 / E125 | Start page (2026-10-25), then Home, Room and Scenarios (2026-10-26) | The simulator launches into a starting page; since E125 that is Home, with the QR on the Room and the two demo cards first in the Scenarios library | §2 |
| E19a | MH: when to call | **At Early signs** (8:32 on the E119 card [Q1-2D]; 8:14 on the E132 card after E131 [E132 rc.4]; 8:09 on the talk run of the new programme, the call at 8:12 after stop 1 [Q1-MH]) | §3 |
| E20 | Monitor skin | **Saadat-style**, no style change during the talk (after a change to Philips-style the AGENTS tile reads "---") [MEAS §8; Q1-2D] | §1 |
| E21 | Limit alarms after a Load | **"All alarms on" after every Load stays a presenter step**; the **Bookmark is taken AFTER it** [A3.2] | every case |
| E22 | MH "ventilation back" | "Hyperventilation kept until EtCO₂ < 40 for 2 min, then normalised"; early is "not met". On the E132 card after E131 EtCO₂ is below 40 from 08:42, so the press is met from 10:42; pressed after the first Pause, **13:56** [E132 rc.4]; on the new programme's talk run below 40 from 08:34, met from 10:34, pressed after stop 2, **13:52** [Q1-MH] (on the E119 talk run: 09:05, 11:05, 14:41 [Q1-2D]) | §3 |
| E13 | Which Mac presents | **The kit on a Mac**; GitHub Pages is the fallback (§6). `node -v` and one Start Classroom run on the presenting Mac by the room dry run, Monday 2 November | §1, §6 |
| E14 | The network for the phones | **A travel router** | §1 |
| E132 | The clinical review of the two cards (2026-10-26) | **Accepted in full.** MH: the crisis step adds charcoal filters and a propofol infusion; a second dantrolene when the EtCO₂ climbs back at normal ventilation; cooling only above 38.5 °C; four take-home lines. Haemorrhage: source control, massive transfusion and TXA; "Rhythm check"; a second epinephrine; CPR to the 2-min rhythm check; objectives rewritten (no "draft"); three take-home lines | §3 (MH); Reserve R5 (haemorrhage) |
| OWR4 | The owner's rulings of 28 October | **MH:** the second dantrolene at normal ventilation also puts the crisis ventilation back (20 × 600, O₂ 100 %); ventilation returns to 12 × 500 only once EtCO₂ has stayed below 40 for 2 min, never on a timer. **Haemorrhage:** stop CPR within **120 s** of the return of circulation (was 150 s; measured 57 s). **The pause for the shock under 10 s** (was under 5 s; measured 8 s on the rc.4 round). **Pseudo-PEA:** the objective names the measured "ART about 20/14" (was 19/13; 20/14 on kit 2c341aa3, 21/14 on kit 503caeab, both at the PEA-state row) | §3 (MH); Reserve R5 (haemorrhage) |

## What changed for 3 November

1. **One case, three look-inside stops (P29, 29 October).** MH on the E119 card, run to the early signs, then three
   Paused stops: at the early signs (why the EtCO₂ rises), as fast-forward 1 ends (what dantrolene does, why we
   hyperventilate, where the potassium comes from) and as fast-forward 2 ends (why the EtCO₂ climbs back, the second
   dose, what comes next). At each stop the engine is **Paused**, the **Explore view** is opened from the Instructor
   side and the **model page** is shown from a second browser tab prepared in the pre-flight. The talk points come from
   the speaker's reference [SPK] and name the number on screen. Every clock is from the new programme's talk run
   [Q1-MH]; the course matches kit round A4 with the owner's rulings [E132 rc.4; OWR4] within a few seconds.
2. **The haemorrhage leaves the talk** and stays in the build (Appendix B, Reserve R5, with its Debrief). The
   **Debrief of the day is the MH Debrief, read on screen**, not printed. **Only the MH Persian handout is printed for
   the day**; the haemorrhage one stays in the kit (§1 "Handouts").
3. **The opening is Home and the Room** (E125): Home carries the release label, **Start here** opens the Room with the
   session code and the QR, and the case is **Scenarios** → **Open the library** → **Load** on Demonstration 1.
4. **Operator safety lines** from the UI review [UIR] (§1 "Safety lines"): never click Ventilator; a reload and
   Sound; one instructor tab for the Room and its QR; the instructor tab stays in front **except while the model-page
   tab is shown during a stop, with the session Paused**; print after the fast-forward banner.
5. **The clinical review of the two cards (E132, 26 October)** [REV] and the owner's rulings of 28 October [OWR4]
   stand: the MH buttons, presenter lines, objectives and take-home lines are those of the card as it is.

## How to read this sheet

- **Sim** is the session-bar clock (scenario clock, Load = 0:00). **W** is the wall-clock time from pressing **Load**,
  as **measured** in the new programme's talk run [Q1-MH] (Chromium, 3 emulated phones, a scripted reaction of 2 s and
  a 3-s look at each Explore screen; the script does not talk, so W has no talk in it). **T+** is the time into the
  30-minute slot: the programme's slots (P29) with the measured machine wall inside them; the talk itself is planned,
  not measured. A time estimated here is marked "(est.)".
- **On the rc.4 kit** the same talk ran on both engines [Q2-rc4]. The rows that moved more than 2 s (the early signs on
  Chromium, Recovering on WebKit, the first `RR TOO LOW`, the E22 window on Chromium, the Debrief's highest EtCO₂) and
  the measured values beside them are in §3 "On the rc.4 kit".
- A 5-min fast-forward takes **10.1–10.6 s** of wall and **leaves the speed as it was** [Q1-MH; Q1-2D; UIR: 10.5–10.9 s; Q2-rc4: 10.4–10.5 s].
- **Boxed words** are the exact on-screen labels, from the card files and the run rows. "C / W" = Chromium / WebKit.
- Monitor and Explore numbers are what the run read on the instructor's page. Real presses land a few seconds
  differently, so expect ± a few units [R45 tolerances HR ± 5, pressures ± 5, SpO₂ ± 2, EtCO₂ ± 3].
- Each bracket names its source. Source keys:

| Key | File |
|---|---|
| Q1-MH | `scratch/kitround-mh-only/q1-{0,1}-*-chromium.{json,md}`, `q1-talk-chromium.json` (segment walls and every Explore row read at each stop) and `debrief-q1-1-*.json`: the talk test of the new programme (`kit-round-a.kitround.ts`, "Q1 30-minute talk"), kit a88f95a7 (main, Home reads 1.0.0-rc.3), 2026-10-29, Chromium, 3 phones, reaction 2 s, 3 s per Explore screen; WebKit not run. Screenshots of each stop, the model pages and the Debrief: `scratch/owner-review/mh-only-programme/` (its README) |
| Q2-rc4 | `docs/showcase/kit-round-a/q2-rc4/q1-{0,1}-*-{chromium,webkit}.{json,md}`, `q1-talk-{chromium,webkit}.json` and `debrief-q1-1-*.json`: the same talk test on the **rc.4 kit** `pme-showcase-kit-0c4b396f` (tag `v1.0.0-rc.4`, pre-release), 2026-10-29, **both engines**, 3 phones, reaction 2 s, 3 s per Explore screen; the stop screenshots in `q2-rc4/shots/stop{1,2,3}-*-{chromium,webkit}.png` (Explore sections and the model pages), `debrief-mh-on-screen-*.png`, `end-instructor-*.png`, the monitor at the early signs `q2-rc4/q2-mh-monitor-early-signs-{chromium,webkit}.png`; kit round A4 on the same kit in `q2-rc4-a4/`. Write-up: MEASUREMENTS §"Q2 on rc.4"; gate note `docs/gates/rc4-release.md` |
| SPK | `scratch/owner-review/mh-mechanisms-on-the-demo-build.md` (the speaker's reference: the nine mechanisms as this build computes them, "Not in this build", the two sentences for the stage) |
| Q1-2D | `scratch/kitround-2demos-q1/q1-{0,1,2}-*-chromium.{json,md}` and `debrief-q1-*.json`: the two-demos talk run of #130 (the 24 October programme) (kit 2ebd743d, 2026-10-24, Chromium, 3 phones, reaction 2 s; WebKit not run) |
| DRAFT | `scratch/plans-backup/cue-cards-two-demos-draft.md` (the timing draft written from Q1-2D) |
| A4 | `docs/showcase/kit-round-a/a4-mh-e119-induction-sequence-and-early-call-kit-round-{chromium,webkit}.*` (kit 52b0390b) and `a4-haemorrhage-e120-course-kit-round-{chromium,webkit}.*` (kit 33a6c92b), 2026-10-24, both engines; their Debrief JSON and PDFs beside them |
| E132 | `scratch/kitround-e132/a4-*-chromium.*` (kit e0c73a47, branch `exec-e132-cards`, 2026-10-26, Chromium only): kit round A4 on the cards after the clinical review; their Debrief JSON, PDFs and Persian handouts beside them. Sanity measurements: E131 (one MH metabolic rate) will move the MH course again, and the Thursday prep run re-measures both. The haemorrhage re-measured after the rebase onto E126 (the pulse check pauses compressions until the shock): `scratch/kitround-e132-rebase/a4-haemorrhage-*-chromium.*` (kit 4d0fca9b, Chromium) [E132 on E126] |
| E132 rc.4 | `scratch/kitround-e132-rc4/a4-*-chromium.*` (kit 503caeab, 2026-10-27, Chromium, 3 phones): both cards after the rebase of `exec-e132-cards` onto main 25771808, i.e. with E131 (one MH metabolic rate), E133 (ventricular ectopy) and #153 (the oximeter's PI per pulse); their Debrief JSON and PDFs beside them. The numbers of the 3 November cards |
| OWR4 | `scratch/kitround-owr4/a4-*-chromium.*` (kit 2c341aa3, branch `owner-words-rc4`, 2026-10-28, Chromium, 3 phones): both cards with the owner's rulings of 28 October; the MH second-dose screenshots in `scratch/owner-review/owner-words-rc4/`. The course after the talk's end is from one headless run of the same path (`scratch/owr4-mh-probe.log`) and the S1 slow test's row 'S1 demo path (owner rc.4)' |
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
| KIT | `_sandbox/pme-kit-release-0c4b396f/README.txt` (the rc.4 release kit, with its Windows zip; the same kit in `_sandbox/pme-classroom-dryrun/kit/` and `_sandbox/pme-debrief-dryrun/`); the fallback `_sandbox/pme-kit-release-fcf99b70/README.txt` (the rc.3 kit). Before rc.3: `pme-kit-release-3db25a3b` (rc.1, retired) |
| G13 / DB-T / DB-MH | `docs/gates/stage-13.md` / `docs/gates/stage-13/rehearsal/debrief-tamponade-*.json` / `debrief-mh-*.json` (kit 58b2c13c) |
| PRINT | `_sandbox/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt` |
| CARD | `apps/demo/src/app/showcase/showcase-*.json` (objective text, Debrief rule, states, button labels, take-home lines) |
| F11A / F11B / F11D | `docs/gates/fu-11-a.md` / `fu-11-b.md` / `fu-11-d.md` |
| E125 | `apps/demo/src/app/views/{home,room,scenarios}.ts` and `apps/demo/src/app/about.ts` on main (the pages, their words and the footer line); the Q1 talk run on the E125 kit (Home's version line, the footer line, the Room's QR with 3 phones following) |
| RUN4 / SC1 | `docs/showcase/RUN-STEPS.md` (showcase 1) / `_sandbox/pme-showcase-docs/run-sheet.pdf` (showcase 1's printed sheet) |
| R00 / R24 / R25 / R31 | `research/00-orchestrator-rulings.md` / `24-showcase2-probes.md` / `25-owner-questions-2026-10-07.md` / `31-owner-decisions-2026-10-12.md` |
| ADD2 | `research/15-review-pack/addendum-2/index.html` (owner boxes H17–H19, E13–E15) |
| SYN | `research/30-parts/99-synthesis.md` (the target audit's synthesis) |
| RM | `docs/roadmap/README.md`, `docs/roadmap/v1.0-remaining.md`, `docs/roadmap/v2.0/README.md` |
| SKIN | `packages/skins/src/data/skins/saadat-like.json`, `philips-like.json` |
| S1 / S5 | the E119 / E120 slow tests (`apps/demo/src/app/showcase/malignant-hyperthermia.slow.test.ts`, `haemorrhage-anaphylaxis.slow.test.ts`) |

## The programme at a glance (30:00)

The owner's programme of 29 October (P29). The machine runs are **measured** [Q1-MH]: the presses, the fast-forwards,
the Explore openings and the model-page tab, with a 2-s reaction and a 3-s look at each Explore screen. The talk is not
measured: the slot is the owner's, and the talk fills what the machine leaves. The whole run, presses only, took
**5:03** of wall from the opening to the Debrief [Q1-MH `q1-talk`].

| # | Segment | Machine wall (measured) [Q1-MH] | Slot | Clock (T+) |
|---|---|---|---|---|
| 0 | Opening on Home and the Room, the phones join | **Start here** → "3 phones following" in 3.1 s (the phones 2.6 s after the QR) | **3:00** | 0:00–3:00 |
| 1 | MH to the early signs (×8 then ×4) | **1:14** (73.6 s): Load, the five induction presses, ×4 at 7:30, Early signs **8:09**, **Pause** (8:10) | **2:00** | 3:00–5:00 |
| S1 | **Stop 1**: why the EtCO₂ rises when it should fall: the MH trigger, hypermetabolism, CO₂ production and stores. Explore; behind it the thermal/metabolic page | **0:49** (48.5 s): Explore (Endocrine, Blood + one scroll), the model tab and back, the tick, Resume. Clock held at 8:10 | **3:00** | 5:00–8:00 |
| 2 | The call, hyperventilation, dantrolene; EtCO₂ falls | **0:20** (20.2 s): call **8:12**, dantrolene **8:32**, EtCO₂ below 40 from **8:34**, fast-forward 1 (10.3 s), **Pause** at **13:50** (Recovering) | **2:00** | 8:00–10:00 |
| S2 | **Stop 2**: what dantrolene does in the model and why we hyperventilate; the potassium's source in this build. Explore; behind it the drug page and the blood/electrolyte page | **1:06** (66.0 s): Explore (Drugs, Endocrine, Gas exchange + scroll, Blood + scroll), two model pages and back, Resume. Clock held at 13:50 | **3:00** | 10:00–13:00 |
| 3 | Ventilation back, the climb | **0:15** (15.2 s): ventilation back **13:52**, EtCO₂ past 45 from **14:06**, fast-forward 2 (10.6 s), **Pause** at **19:11** (EtCO₂ 64) | **2:00** | 13:00–15:00 |
| S3 | **Stop 3**: recrudescence and the second dose with hyperventilation again; the two sentences on what comes next (E134) and why it waited. Explore; behind it the thermal/metabolic page | **0:52** (51.5 s): Explore (Endocrine, Drugs, Gas exchange + scroll), the model tab and back, Resume. Clock held at 19:11 | **3:00** | 15:00–18:00 |
| 4 | The end of the case and the MH Debrief, read on screen | **0:20** (20.3 s): second dose with hyperventilation again **19:13**, fast-forward 3 (10.1 s), end **Pause** at **24:31**, the Debrief opened (5.2 s for the script to read it) | **4:00** | 18:00–22:00 |
| 5 | Close and the ask to the deans | — | **3:00** | 22:00–25:00 |
| 6 | Questions | — | **5:00** | 25:00–30:00 |
| | **Total** | **5:03** of machine wall | **30:00** (25:00 before questions) | |

There is no separate buffer: each case segment leaves 1:40 or more beyond its machine wall, and stop 1's tick and the
model tab are inside its 3:00.

**Minute by minute** (the measured machine wall inside the slots; the talk lengths are planning figures):

| T+ | What | Length |
|---|---|---|
| 0:00 | Home on the projector; what the simulator is | ≈ 0:30 (est.) |
| ≈ 0:30 (est.) | **Start here**: the Room and its QR; the phones join | ≈ 2:30 (est.) |
| 3:00 | MH framing, the Room still showing | ≈ 0:30 (est.) |
| ≈ 3:30 (est.) | **Scenarios** → **Open the library** → **Load** · **All alarms on** · **Bookmark** · **×8**; the five induction presses; **×4** at 7:30; Early signs (8:09) → **Pause** | 1:14 |
| ≈ 4:44 (est.) | the paused monitor: EtCO₂ 46, HR 78 | ≈ 0:16 |
| 5:00 | **Stop 1** (§3, "Stop 1") | 3:00 |
| 8:00 | Instructor, still paused: tick *Name malignant hyperthermia*; say the call | ≈ 1:35 (est.) |
| ≈ 9:35 (est.) | **Resume** · **MH crisis** at once · **Dantrolene 2.5 mg/kg** (≈ 5 s later) · **5 min** · **Pause** as the banner shows (13:50) | 0:20 |
| 10:00 | **Stop 2** | 3:00 |
| 13:00 | **Resume** · **ventilation back** at once · **5 min** (the EtCO₂ passes 45 inside it, 14:06) · **Pause** (19:11) | 0:15 |
| ≈ 13:15 (est.) | the climb, on the paused monitor (EtCO₂ 64) | ≈ 1:45 |
| 15:00 | **Stop 3**, ending with the two sentences on E134 | 3:00 |
| 18:00 | **Resume** · **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** at once · **5 min** · **Pause** (24:31) | ≈ 0:15 |
| ≈ 18:15 (est.) | the take-home lines | 1:00 |
| ≈ 19:15 (est.) | session bar **Debrief**: the MH Debrief read on screen (§4) | ≈ 2:00 |
| ≈ 21:15 (est.) | back to **Instructor**; slack | ≈ 0:45 |
| 22:00 | Close and the ask | 3:00 |
| 25:00 | Questions | 5:00 |

> **If running over, cut in this order** (P29)
>
> 1. **Questions** (5:00 → 2:00, then out).
> 2. **Stop 3's paragraph** on what comes next (the two sentences on E134, ≈ 0:40): end stop 3 at the second dose.
> 3. **The Debrief read** (≈ 2:00): end the case at the take-home lines; the Debrief stays unopened.
>
> Do not cut a stop's Pause or fast-forward 3: the second dose is objective 4, and ventilation back is "not met"
> before 10:34.

---

## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)

Owner questions this checklist depends on: **E13** which Mac presents and its Node.js, **E14** the network for the
phones [R31 §3]. Tick every line.

**The kit** (matches `PRE-FLIGHT.md` [PF])
- [ ] **For 3 November: the rc.4 kit** `_sandbox/pme-kit-release-0c4b396f/pme-showcase-kit-0c4b396f` (pre-release
      1.0.0-rc.4, tagged 29 October; Home reads "Version 1.0.0-rc.4 · pre-release · build 0c4b396f"; relay 4 of 4 on
      29 October) [KIT; Q2-rc4]. **The fallback is the rc.3 kit** `_sandbox/pme-kit-release-fcf99b70/` (older MH and
      haemorrhage cards, no Home: see "On a kit without Home", §2) [RC4 Task 8]. Both kits and both Windows zips on the
      stick. The lines below are the floor any kit must pass.
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
      at: http://…"; click **Allow** if macOS asks about "node"; the browser opens `http://127.0.0.1:8650/?relay#/` on **Home** (E125).
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

**The model pages and the Explore view** (P29: each stop shows Explore, with a model page behind it)
- [ ] **The model-page tabs, prepared while the Mac is online** (the kit does not carry the model pages: Home's
      **Documentation** link opens `https://github.com/samhv-dev/patient-monitor-engine/tree/main/docs`, which needs the
      internet; the travel router may have none). In the **same browser window** as the instructor tab, to its right,
      open three tabs and leave them loaded (do not reload them later) [Q1-MH: each page answered 200 and rendered in
      2.4–6.8 s on this Mac's line]:
      1. `…/blob/main/docs/model/endocrine-thermal.md#equations-in-words` (stops 1 and 3: the MH bullets of
         "Equations in words"; for stop 3, Cmd-F `DANT_GAIN` in the Parameters table);
      2. `…/blob/main/docs/model/pharmacology.md`, Cmd-F `dantrolene` (the drug row: gamma, tables §7 21; M10, TXT);
      3. `…/blob/main/docs/model/blood.md#equations-in-words` (the potassium and treatments bullets).
      Screenshots of the three as they render: `scratch/owner-review/mh-only-programme/stop{1,2,3}-model-*.png`; on the
      rc.4 kit, both engines: `docs/showcase/kit-round-a/q2-rc4/shots/stop{1,2,3}-model-*-{chromium,webkit}.png`
      [Q2-rc4: each page answered 200].
- [ ] **These tabs are not instructor tabs**: they are GitHub pages, they make no session and show no QR. The rule
      "one instructor tab only" still holds.
- [ ] **The Explore view check** (on the loaded case or any case, then load MH fresh): the rail's **Explore physiology**
      (on the Instructor view the rail is the 56-px icon strip: the chart icon) opens the view; its **Body systems**
      list on the left reaches **Endocrine**, **Blood, acid–base and temperature**, **Gas exchange and oxygen
      delivery** and **Drugs**; the stamp reads "Changes are from the baseline at 01:00". **Leave "Changed only" off**
      (it would hide the dantrolene rows, which have no 1:00 baseline). The session bar (Pause, speeds, 5 min) is
      **not** shown on Explore: pause on the Instructor view first, and come back to it to resume [Q1-MH: the bar was not
      visible on Explore at any stop].
- [ ] Rehearse once: Pause → Explore → a section → the model tab → back to the instructor tab → **Instructor** in the
      rail → Resume. The clock must not move while you are away (it held to the second at all three stops [Q1-MH]).

**Handouts**
- [ ] **Only the MH Persian handout is printed for the day**: `_sandbox/pme-debrief-fa/debrief-fa-malignant-hyperthermia-2026-10-29.pdf`,
      rendered on 29 October from kit round A4's MH Debrief on the rc.4 kit (8 A4 pages, 0 strings left in English,
      with PR #161's Persian drafts, which the owner has still to read) [Q2-rc4]. A re-render (after his read of #161,
      or from the MH Debrief JSON of his Sunday rehearsal) is
      `node scripts/showcase/debrief-fa.mjs <debrief-….json> --fonts <Vazirmatn folder>`
      (`docs/showcase/i18n/README.md`). The haemorrhage handout (`debrief-fa-haemorrhage-2026-10-29.pdf`) stays in the
      kit (Reserve R5), not printed. The English report is not printed on the day either (the Debrief is read on screen,
      §4). **The handout's footer does not word the disclaimer as the screen does**: §2, "Two disclaimer wordings".

**Last minute (T−10 min)**
- [ ] Open the page fresh: **Home** shows, with the footer line "For educational use only; Not to be used in patient
      care."; **Scenarios** → **Open the library** lists *Malignant hyperthermia* and *Class IV haemorrhage, PEA and
      resuscitation* first, under *Today's demonstrations* [E125]; the talk loads only the first. Home on the projector;
      nothing loaded.
- [ ] The three model-page tabs are loaded, to the right of the instructor tab, each at its place (above).
- [ ] This tab is the only instructor tab; it stays in front for the whole talk, except while a model-page tab is
      shown during a stop with the session Paused (a hidden tab pauses a running session [UIR "Hidden instructor tab"]).

**Safety lines** (the UI review, 24 October [UIR]; true with or without this week's fixes)
- **Never click "Ventilator" during a card**, neither the rail's **Ventilator** nor a Ventilator tab: while the
  Ventilator view is on screen its cockpit drives the patient and every phone waits on "The ventilator is on the main
  screen" [UIR #2]. If it happens: back to **Instructor**. Leaving the view releases the phones at once and hands the
  patient to the engine's ventilator at the cockpit's settings; no Pause or reload is needed [#135; E128]. (In the
  review, on kit 2ebd743d, before those fixes, the phones were still held 20 s after leaving.)
- **Never reload mid-case** (see "After a page reload" above): Sound must be switched on again either way.
- **Open the Room (the QR) only from the first instructor tab** [UIR "Two hosts"].
- **The instructor tab stays in front**: hidden, a running session pauses at once ("Paused while this tab was hidden
  (m:ss)", the phones read "(paused)") [UIR "Hidden instructor tab"]; in real Safari a hidden tab once lost the phone's
  session (H19, FX-14, FX-15) [G12P]. **The one exception is a stop**: the session is already Paused, and a session the
  instructor paused stays paused while the tab is hidden and is not resumed on return (`apps/demo/src/app/hidden-tab.ts`;
  not measured: the headless run could not hide the tab [Q1-MH]). Keep each look at a model page short (under a minute)
  and come back: Safari suspends a hidden tab after about 4 min (FX-14).
- **Print the learner handout only after the fast-forward banner has gone** (≈ 8 s after a span): printed earlier, the
  banner prints on every page, and on screen it covers **Print the learner handout** [UIR #9].
- **The MH report prints 8 A4 pages**, not 7 [UIR #31; Q2-rc4: 8 on the rc.4 kit], if it is ever printed: on the day it
  is read on screen (§4).

---

## 2. Opening on Home and the Room (T+0:00 → 3:00)

Since E125 the simulator opens on **Home**: no monitor and no top bar; the title **Patient monitor simulator**, the line
"Version ‹version› · pre-release · build ‹commit›", one paragraph and one **Start here** button, and the footer line
"For educational use only; Not to be used in patient care." on every page but the monitor screens. **Start here** opens
the **Room**: the app's only QR code, the large session code, the join address, "n phones following", the connection
status and the devices connected now. The rail at the left leads on to **Scenarios** (the library: *Today's
demonstrations*, MH and the haemorrhage, first), **Patient**, the **Instructor** and the other views [E125].

**The path to the first case:** **1 · Start here** (the Room, its QR) → **2 · Scenarios** → **3 · Open the library** →
**4 · Load** on *Malignant hyperthermia* (Demonstration 1), which opens the Instructor view on the case's Scenario tab
("Scenario loaded: Malignant hyperthermia"). Then §3, segment 1's first row: All alarms on · Bookmark · ×8.

| T+ | Do | Say (draft) |
|---|---|---|
| 0:00 | Home on the projector, nothing loaded. It reads "Version 1.0.0-rc.… · pre-release · build …" and, at the foot, "For educational use only; Not to be used in patient care." (the rc.4 kit: its own version and build) [E125] | *"This is an open-source anaesthesia teaching simulator: a patient monitor, an instructor's panel and a ventilator, driven by a physiological model. It is for education only. It is not a medical device and never for patient care."* |
| ≈ 0:30 (est.) | **Start here**: the Room shows the QR code, the 6-letter code, the address and "0 phones following" [E125] | *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your phone: it follows what I do here. It is silent: tap Sound off if you want to hear it."* [CR12] |
| 0:30–2:15 (est.) | Watch the count rise. In the two-demos run, 3 emulated phones were following **2.5 s** after the QR, all synced before Load [Q1-2D `q1-0`]; on the E125 kit the talk run had 3 phones following on the Room [E125]. A phone that does not open: is it on that Wi-Fi? | One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen" [CR12] |
| ≈ 2:15 (est.) | Stay on the Room | *"Your phone follows speed, pause and fast-forward."* [CR12] |
| 3:00 | MH framing (≈ 0:30) with the Room still showing; at ≈ T+3:30 **Scenarios** → **Open the library** → **Load** on *Malignant hyperthermia* (§3) | *"One case, and three times I will stop the clock and open the model behind the monitor. Every number you will see is produced by the model; the buttons only give what their label says."* [CARD notes; P29] |

**On a kit without Home** (the rc.3 fallback kit): QR from the **Monitor** view → pointer to the top edge → **Phones**;
the case from **Open the instructor view** → **Scenario** → **Showcase** → the card → **Load** [RUN4].

> **Two disclaimer wordings (read before the talk).** The screen, on the rc.4 kit, says E125's line: "For educational
> use only; Not to be used in patient care." (Home's foot, every page but the monitor screens, the Debrief's footer)
> [Q2-rc4 `q1-0`].
> The printed Persian MH handout of 29 October carries the older sentence in Persian at its foot (for education only;
> not a medical device; not clinically validated; never for patient care) [Q2-rc4 `.fa.txt`]. PR #161 drafts the E125
> wording in Persian for the handout's footer; it reaches the print only when the owner has read #161 and the
> handouts are rendered again, and the Persian words will still not be the screen's English ones. Both say the same
> thing: if a dean reads the screen and the handout side by side, that is why they differ. Your opening line (above)
> says it in your own words.

Measured capacity, if asked: 30 phones cost the relay under 2 % of one core; each phone receives about 1.3 KB/s at ×1 and
10.5–11.7 KB/s at ×8; at 120 simulated phones relay CPU ≤ 2 %, lag p95 ≤ 2.8 ms [G12 §5]. In the two-demos run three
emulated phones followed both cases with no stale reading on the haemorrhage and one 2.5-s AGENTS blank on MH
[Q1-2D]; on the new programme's run they followed the whole MH case, read "(paused)" within a second of each stop's
Pause and kept it until Resume; the largest mismatch was a 2-s AGENTS blank (S12-F2 by the 2-s rule; no stale number)
[Q1-MH].

---

## 3. The case: malignant hyperthermia, early call, with three look-inside stops (E119; P29). T+3:00 → 22:00

**Load → All alarms on → Bookmark → speed.** Press All alarms on after the Load (older kits turned the limit alarms
off on Load [MEAS §7]; on kits 2ebd743d and a88f95a7 they stayed on [Q1-2D setup; Q1-MH setup], so the press is
harmless); the Bookmark, taken after it, is the "Return here" fallback and brings the alarms back on with it [A3.2] (§6).

While the amber fast-forward panel shows, the page refuses commands: do not press card buttons during it
[G10, Stage 10 plan D-6]. **The speed after a fast-forward is the speed before it** (×4 stays ×4) [Q1-MH spans; MEAS §7].

**What the audience sees during a fast-forward** (the same on the projector, the second screen and the phones): the page
dimmed and blurred, an amber panel "FAST FORWARD · 5 MIN" with a running clock over a progress bar and "sound muted",
for **10.1–10.6 s** [Q1-MH]; at the end one two-tone cue, a seam with its time on every waveform lane, and a banner
"Fast-forwarded 5 min" listing the alarms raised during it [G10 §6; Q1-MH]. The banner stays about 8 s and covers the
nav and the session-bar title [UIR #9].

**Monitor style:** Saadat-style, no change during the case (E20).

### On the rc.4 kit: rows that moved more than 2 s [Q2-rc4]

The tables of §3 and §4 are from the talk run on kit a88f95a7 [Q1-MH]. The same test on the **rc.4 kit** (29 October,
both engines) moved the rows below by more than 2 s. Each table keeps one clock: the run's record (its measures and
state list, floored to the second; the Q1-MH column from the same kind of record), or the Debrief's own clock (its key
times, objectives and facts). Bold: more than 2 s from Q1-MH on the same clock.

**On the record's clock**

| Row | Q1-MH (a88f95a7, C) | rc.4 Chromium | rc.4 WebKit |
|---|---|---|---|
| Early signs (segment 1's last row; Pause at once) | 8:09 (Pause 8:10) | **8:12** (Pause 8:12) | 8:11, 2 s (Pause 8:11) |
| Recovering (inside fast-forward 1) | 9:35 | 9:37 | **9:38** |
| The first `RR TOO LOW` (segment 1, after Preoxygenate) | 3:09 | **2:40** | **2:40** |

**On the Debrief's clock** (what §4 reads aloud)

| Row | Q1-MH (a88f95a7, C) | rc.4 Chromium | rc.4 WebKit |
|---|---|---|---|
| Ventilation back is "met" from (E22: below 40 for 2 min) | 10:34 (08:34 → 10:34) | **10:37** (08:37 → 10:37) | 10:36, 2 s (08:36 → 10:36) |
| Highest EtCO₂ (the facts) | 64 at 18:46 | **65 at 19:07** | **65 at 19:11** |

**Measured beside them** [Q2-rc4]. The Key times tiles: Recognition **0 s** on Chromium (08:12 early signs → 08:12
ticked; 1 s on WebKit, 08:10 → 08:11; 1 s on Q1-MH), the call 2 s / 3 s, dantrolene 21 s on both. On the record's
clock: the call 8:14 / 8:13, dantrolene 8:34 / 8:33, EtCO₂ below 40 from 8:38 / 8:37 (Q1-MH 8:36), the stops held at
**8:12 / 8:11, 13:52 / 13:51, 19:12 / 19:11**, ventilation back 13:53, EtCO₂ past 45 at 14:07 / 14:06, the second dose
19:13, Recovering again 23:39 / 23:37 (Q1-MH 23:37), the end 24:31 / 24:30 (EtCO₂ 41). EtCO₂ at stop 3 reads **65**
(64 on Q1-MH). Explore at the stops: MH activity **0.280** / 0.510–0.520 / 0.550, VO₂ (Blood) 333 at stop 1, PaCO₂
44.3 and 70.2. The machine wall: 5:03 (Chromium), 4:57 (WebKit). The Debrief: ✓ ✓ ✓ ✓ – ✓, 63 / 60 timeline rows.
The tightest window is unchanged in practice: ventilation back is pressed after stop 2 (13:53), long after 10:37.

### The stop method (every stop, the same five moves)

1. **Pause** on the Instructor view (session bar). The clock pill stops; every phone reads "Following session ‹code›
   (paused)" within a second and holds the paused monitor [Q1-MH: all three phones at every stop].
2. **Explore physiology** in the rail (on the Instructor view the rail is the icon strip: the chart icon, the tooltip
   reads "Explore physiology"). Explore opens on *At the bedside*; pick the stop's sections in the **Body systems** list.
   "Changed only" stays **off**. The **Change** column is against the patient at 01:00 (awake, premedicated), so the
   anaesthetic's own effects show there too (ART M down); read the **Now** column. There is no session bar on Explore.
3. Point at the stop's numbers (below; each talk point names the number on screen).
4. The **model page**: click its tab (right of the instructor tab), point, click the instructor tab again. The session
   stays Paused [`hidden-tab.ts`; the clock held to the second at every stop, Q1-MH].
5. **Instructor** in the rail, then **Resume**, then the next press **at once** (you have had the whole stop to react).

**The stage rule** [SPK]: never say the simulator does something the kit in the room does not do. Every talk point
below is from the speaker's reference; a size marked [ENG] is an engineering size, not a sourced one: say so if asked.
**Explore cautions** (the build as it is; no app change before the talk):
- Under **Gas exchange and oxygen delivery**, the rows **VCO₂ 216** and **VO₂ 270** do not move all case (the same at
  all three stops): they are not the MH figures. **Do not point at them.** The MH oxygen consumption is **VO₂** under
  **Blood, acid–base and temperature** (332 → 427 mL/min) [Q1-MH].
- Under **Drugs**, dantrolene is **Ce (Dantrolene)** in "drug unit" (reference doses, 1 = 2.5 mg/kg), and the Total
  column reads "200 mg, µg"; under **Blood**, Glucose reads "102 mmol/L and mg/dL" (it is mg/dL). Read the number and
  say the unit yourself [Q1-MH screenshots].
- Under **Endocrine** (the first screen of stop 1), **Glucose reads "102 mmol/L"** (it is mg/dL; the Debrief's facts
  give 6.6 mmol/L) and **Stress response reads 88.0** on a "0–1" scale (it is 0–100). Do not point at either
  [Q2-rc4 `shots/stop1-endocrine-*.png`; fixed on main after the tag, #178].
- The **VA** row (alveolar ventilation, L/min) sits two rows below VCO₂ and VO₂: point at VA alone.

### The card and how to Load

**To Load.** **Scenarios** → **Open the library** → **Load** on *Malignant hyperthermia* (Demonstration 1). (From a
running case: Instructor → Scenario → **Choose another scenario** → **Showcase** → *Malignant hyperthermia* → **Load** →
**Load scenario**. The talk run loaded it from the Instructor's Scenario tab, Showcase chip [Q1-MH].)

Card: *Malignant hyperthermia* (Showcase). **The card starts awake on room air** and every step of the induction is a
button [CARD]: Awake on the table, monitoring on, breathing room air → **Premedicate: midazolam 2 mg, fentanyl 100 µg** →
**Preoxygenate: 100 % O₂ by face mask** → **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** (the MH condition
starts here; say the masseter line) → **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** → **Start
surgery: rocuronium 0.6 mg/kg** → Early signs → **MH crisis: stop sevoflurane, charcoal filters, propofol infusion,
O₂ 100 % at 10 L/min, hyperventilate** (Trigger off: 20 × 600, propofol 100 µg/kg/min) → **Dantrolene 2.5 mg/kg** →
Recovering → **EtCO₂ normal: ventilation back to 12 × 500** → **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600,
O₂ 100 %)** when the EtCO₂ climbs back → Recovering → ventilation back again only once EtCO₂ has stayed below 40 for
2 min, never on a timer [CARD; REV #1, #2; OWR4]. **What the trigger-off step tells the engine** (E132): the vaporiser
to 0 % at 10 L/min, the ventilator 20 × 600 at FiO₂ 1.0 and a propofol infusion of 100 µg/kg/min. The **charcoal
filters are not modelled** (the label names them; the fresh gas washes the agent out). **Cool: refrigerated saline
20 mL/kg (1.6 L)** is pressed only above 38.5 °C, so **not on this path**; the engine has no cold-fluid input and gives
that saline at the theatre's 21 °C [REV #4]. **Oxygen is never implicit (E121):** skip Preoxygenate and SpO₂ reads 90 %
at the induction and 63 % when the tube goes in 60 s later [S1 E121 slow test]. The **MH crisis** button is offered in
Induced, Intubated, Surgery, Early signs and Established; **ventilation back** only in Recovering [CARD].

### Segment 1: MH to the early signs (×8 then ×4). Slot 2:00 (T+3:00 → 5:00)

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-MH) |
|---|---|---|---|---|---|
| ≈ 3:30 (est.) | 0:00 | 0:00 | **×8** | **Load · All alarms on · Bookmark** (bookmark at 00:06) | HR 69, ART 122/80 (93); room air |
| | 0:07 | 0:30 | ×8 | **Premedicate: midazolam 2 mg, fentanyl 100 µg** | state 0:32; HR 70, SpO₂ 96, EtCO₂ 37 |
| | 0:11 | 1:00 | ×8 | **Preoxygenate: 100 % O₂ by face mask** | state 1:02; then `RR TOO LOW` 3:09 (RR 6 after the premedication) |
| | 0:33 | **4:00** | ×8 | **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg**; the masseter line (below) | state 4:03; SpO₂ 99, EtCO₂ 46, RR 6; `CO2 APNEA` 4:49 |
| | 0:41 | **5:00** | ×8 | **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** | state 5:02; ART 95/59 (69); apnoea alarm to ventilated breaths 13 s |
| | 0:48 | **6:00** | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | state 6:04; HR 71, ART 96/59 (69), EtCO₂ 42 |
| | 0:59 | 7:30 | **×4** | watch the CO₂ tile climb at the same ventilation | 7:34: EtCO₂ 45, HR 75, ART 105/64 (75) |
| ≈ 4:44 (est.) | 1:08 | **8:09** | ×4 | state **Early signs** → **Pause** at once (8:10). Do not call yet: the call is said and pressed after stop 1 | **EtCO₂ 46, HR 78, ART 107/67 (77)**, RR 12; T1 36.5 |

**What the audience should look at:** the **CO₂ tile** rising at unchanged ventilation when it should be falling (42 at
6:00, 45 at 7:34, 46 at the early signs; without MH the same sequence settles at 36–39) [REV #5; SPK §1]; the **heart
rate** rising with it (64 → 78, blunted by the fentanyl [S1]); the **temperature** not moving (T1 36.5).

**Masseter line (at Induce)** [REV #3]: *"The jaw is hard to open after the succinylcholine: masseter rigidity. In
practice a rigid jaw after succinylcholine means a non-triggering anaesthetic from now on and close watch of the EtCO₂;
today we keep the volatile running to show the crisis. Masseter rigidity with a rising EtCO₂ makes two signs."*

### Stop 1: why the EtCO₂ rises when it should fall. Slot 3:00 (T+5:00 → 8:00); clock held at 8:10

> **The NIBP alarm at this pause: point at the arterial line.** At the early signs the alarm bar can show a red
> **NIBP SYS TOO LOW**, and the alarm button can read that alarm rather than **No alarms**. The reading is stale, not
> spurious: the alarm was raised during the dip after induction (05:34 on Chromium, 05:36 on WebKit; the lowest mean,
> 62 mmHg, at 05:24–05:25), and at the pause the NIBP tile still shows that last cuff reading (87/48 (63) on one rc.4
> run, 85/60 (63) on the other, AUTO 5 min) while the arterial line reads **107/67 (77)** [Q2-rc4
> `q2-mh-monitor-early-signs-*.png`; the records' alarm lists]. It is the cuff's old number, not the patient now; the
> next cuff cycle replaces it. Whether it still shows at the pause depends on when the cycle fell in that run (Q1-MH
> raised no NIBP alarm). Do not acknowledge it on stage; point at the arterial line.

**Press, open:** (Paused at 8:10) → rail **Explore physiology** → **Endocrine** → **Blood, acid–base and
temperature** (first screen, then scroll to **BE**: K⁺ to pH on screen) → the **endocrine-thermal** tab ("Equations in
words", the MH bullets) → the instructor tab → **Instructor** → tick *Name malignant hyperthermia* (Scenario tab) → stay
Paused for segment 2's words.

**What Explore shows at 8:10** [Q1-MH; screenshots `stop1-endocrine`, `stop1-blood`, `stop1-blood-scrolled`]:
Endocrine: **MH activity 0.270** (0–1), Epinephrine 155 pg/mL (+121), Norepinephrine 689 pg/mL (+414). Blood: **Tcore
36.52 °C** (−0.28), **VO₂ 332 mL/min** (+66), K⁺ 4.77 mmol/L, Lactate 1.04, **PCO₂ 50.0 mmHg** (+10.0), pH 7.32. The
vitals strip: HR 78, ART M 77, SpO₂ 99, EtCO₂ 46, RR 12, T1 36.5.

**Talk points** [SPK §1–§3, §6]:
- **The trigger.** **Induce** gave propofol, succinylcholine and the instructor event "condition mh, severity 1". That
  event started MH at 4:03; the drugs did not (the card has no MH-susceptible profile). → *MH activity 0.270 on screen.*
- **The onset ramp.** Activity = severity × a ramp rising linearly to 1 over 15 min [ENG; the tables give 5–30 min] ×
  the share dantrolene has not suppressed (all of it, so far). Four minutes in: about 0.27. → *0.270.* After t0 nothing
  but dantrolene changes it: stopping the sevoflurane will not.
- **One MH rate (E131).** The muscle adds an oxygen demand of activity × 1.5 × the resting VO₂ (whole-body VO₂ × 2.5 at
  full activity, the centre of the tables' "× 2–3" [TXT], swine data of Gronert & Theye). Oxygen, CO₂, heat and lactate
  all come from that one number. → *VO₂ 332 mL/min, +66 on the 1:00 patient, under an anaesthetic that itself lowers it.*
- **CO₂ production and why EtCO₂ rises.** The MH CO₂ is the achieved MH oxygen × RQ 0.97, plus 22 mL CO₂ per mmol of the
  MH muscle's lactate as bicarbonate buffers it. The ventilator holds alveolar ventilation fixed, and PaCO₂ = 0.863 ×
  VCO₂ / V̇A: more CO₂ at the same V̇A means a higher PaCO₂. → *PCO₂ 50.0, EtCO₂ 46.*
- **The stores.** The premedication's RR 6 and the induction apnoea left the CO₂ stores full, so the ventilated EtCO₂
  started at 42 and should then fall (36–39 without MH). It rises over minutes because a two-compartment CO₂ store
  fills first (sizes fitted to apnoea data [ENG]).
- **Heat, and why the thermometer does not help.** About 140 W at full activity on 80 kg (21.1 kJ per litre of O₂); on
  this path the anaesthetic's redistribution and the 20 % fall in basal heat outweigh a half-active MH. → *Tcore 36.52,
  0.28 below 1:00.* The call must not wait for the temperature.
- **The heart rate.** MH's own sympathetic drive rises with τ 2 min [ENG], ahead of the EtCO₂. → *Epinephrine 155,
  norepinephrine 689; HR 78.*

**Say** (the stop's last line, before you return): *"The EtCO₂ is rising at unchanged ventilation when it should be
falling, with a rising heart rate: think of MH early."*

### Segment 2: the call, hyperventilation, dantrolene; EtCO₂ falls. Slot 2:00 (T+8:00 → 10:00)

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-MH) |
|---|---|---|---|---|---|
| 8:00 | — | 8:10 | (Paused) | On the Instructor view, still Paused: say the call line (below) | the paused monitor, EtCO₂ 46 |
| ≈ 9:35 (est.) | 1:57 | 8:10 | ×4 | **Resume**, then at once **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** | state Trigger off **8:12**, 3 s after Early signs (Debrief ✓ "3 s of 2 min 00 s") |
| | 2:03 | **8:32** | ×4 | **Dantrolene 2.5 mg/kg** when the button shows (≈ 5 s of wall); say: in real life it takes extra hands and minutes | Debrief ✓ 21 s after the call; **EtCO₂ below 40 from 08:34** (Debrief) |
| — | — | — | ×4 | **No cooling on this path**: say "cool only above 38.5 °C" (do not press **Cool**) | Tcore 36.4–36.8 °C over the case |
| | 2:03 | 8:37 | — | **5 min** at once, 10.3 s. **Hyperventilation stays on** | banner "Fast-forwarded 5 min, No alarms"; Recovering 9:34 (inside the span) |
| ≈ 9:55 (est.) | 2:17 | 13:50 | ×4 | **Pause** as the banner shows | state **Recovering**; **EtCO₂ 40**, HR 81, ART 104/66 (76), RR 20 |

**At the call** [REV #2]: *"Trigger off: sevoflurane off, charcoal filters on the circuit, a propofol infusion so he
stays asleep, 100 % oxygen at 10 L/min, double the ventilation."* The charcoal filters are words only (not modelled).

### Stop 2: what dantrolene does in the model, and why we hyperventilate; the potassium's source. Slot 3:00 (T+10:00 → 13:00); clock held at 13:50

**Press, open:** (Paused at 13:50) → **Explore physiology** → **Drugs** → **Endocrine** → **Gas exchange and oxygen
delivery** (scroll to **VA**) → **Blood, acid–base and temperature** (scroll to **BE**) → the **pharmacology** tab
(Cmd-F "dantrolene") → the **blood** tab ("Equations in words") → the instructor tab → **Instructor** → **Resume** → at
once **EtCO₂ normal: ventilation back to 12 × 500**.

**What Explore shows at 13:50** [Q1-MH; `stop2-drugs`, `stop2-endocrine`, `stop2-gas-scrolled`, `stop2-blood-scrolled`]:
Drugs: **Ce (Dantrolene) 0.892** (reference doses), Total 200 (mg). Endocrine: **MH activity 0.510**, Epinephrine 226,
Norepinephrine 1019. Gas exchange: **VA 9.11 L/min** (+5.44), f set 20, VT set 600, FiO₂ 100 %, PaCO₂ 44.2. Blood: VO₂ 427
(+161), **K⁺ 4.62 mmol/L** (+0.42), Lactate 1.80, PCO₂ 44.0, pH 7.36. Vitals: HR 81, ART M 76, EtCO₂ 40, RR 20, T1 36.4.

**Talk points** [SPK §4, §7, §8]:
- **Dantrolene's curve.** A gamma-curve drug, 2.5 mg/kg the reference dose, peak at 10 min, 10 % of the peak at 6 h
  (`docs/model/pharmacology.md`, the dantrolene row, TXT). → *Ce 0.892: one reference dose, 5 min after it.*
- **Its effect.** E = C/(C + 1): 0.892/1.892 ≈ 0.47 (worked from the number on screen). The unsuppressed share of the
  MH relaxes toward max(0, 1 − 1.6 × E) with τ 10 min (1.6 and τ [ENG]); so one 2.5 mg/kg dose can suppress at most
  80 % (a floor of 0.2) and 5 mg/kg all of it. **Dantrolene has no other effect in the engine.**
- **Why the activity is higher than at the call.** The onset ramp is still rising (full 15 min after the
  succinylcholine, about 19:00), while dantrolene pulls the share down slowly (τ 10 min). → *MH activity 0.510 now,
  0.270 at stop 1.*
- **Why we hyperventilate.** The EtCO₂ was below 40 from 08:34, two seconds after the dose and before it could act: that
  fall is the hyperventilation. Doubling the minute ventilation (6 → 12 L/min) clears the CO₂ the muscle is still
  making. → *VA 9.11 L/min against 3.7 at 1:00; PaCO₂ 44; VO₂ 427 and still rising.* It also removes the hypercapnic
  sympathetic and pressor terms and the respiratory share of the potassium shift. **It does nothing to MH itself;
  neither did the trigger-off step.**
- **The potassium's source in this build: one fitted term.** The endocrine model adds 2.35 mmol/L × MH activity to the
  plasma K set point [ENG: fitted to the tables' "K 5.5–6.5 by 20 min" untreated] (that term and its parameter are on
  `endocrine-thermal.md`, `MH_K_EFFLUX`); the blood model lets plasma K follow the set point. On top, three general
  terms: the non-lactate acidaemia (−4.0 × (pH − 7.4), so the hypercapnia raises K and the lactic acid does not),
  adrenaline's β2 uptake (−0.8 at full effect [TXT]), and the ordinary succinylcholine pulse (+0.5, gone in about
  15 min). **There is no muscle injury, no rhabdomyolysis, no K from necrotic fibres.** → *K⁺ 4.62; on this path it
  never passes 5.5, so the potassium objective stays "–".*

### Segment 3: ventilation back, the climb. Slot 2:00 (T+13:00 → 15:00)

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-MH) |
|---|---|---|---|---|---|
| 13:00 | 3:24 | **13:52** | ×4 | **Resume**, then at once **EtCO₂ normal: ventilation back to 12 × 500** (met from 10:34) | Debrief ✓ "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (08:34 → 10:34)"; EtCO₂ 41 |
| | ≈ 3:25 | 13:56 | — | **5 min** about a second after the press, 10.6 s | EtCO₂ passes **45 at 14:06**, inside the span (14 s after the press); banner "Fast-forwarded 5 min, ETCO2 TOO HIGH 14:27" |
| ≈ 13:15 (est.) | 3:38 | **19:11** | ×4 | **Pause** as the banner shows; the climb on the paused monitor (below) | **EtCO₂ 64**, HR 89, ART 99/66 (75), RR 12 |

**The climb, per minute after ventilation back:** 40 → 53 → 56 → 59 → 61 → 64 [Q1-MH] (A4 rc.4: the same) [E132 rc.4].
*"The EtCO₂ is climbing back at normal ventilation: the MH is not controlled."*

### Stop 3: recrudescence and the second dose with hyperventilation again; what comes next. Slot 3:00 (T+15:00 → 18:00); clock held at 19:11

**Press, open:** (Paused at 19:11) → **Explore physiology** → **Endocrine** → **Drugs** → **Gas exchange and oxygen
delivery** (scroll to **VA**) → the **endocrine-thermal** tab (Cmd-F `DANT_GAIN`: the rows MH_RELAX_TAU_S and DANT_GAIN;
`MH_ONSET_S` a few rows above) → the instructor tab → **Instructor** → **Resume** → at once **Dantrolene 2.5 mg/kg;
hyperventilate again (20 × 600, O₂ 100 %)**.

**What Explore shows at 19:11** [Q1-MH; `stop3-endocrine`, `stop3-drugs`, `stop3-gas-scrolled`]: Endocrine: **MH
activity 0.550**, Epinephrine 221, Norepinephrine 797. Drugs: **Ce (Dantrolene) 0.999**. Gas exchange: **PaCO₂ 70.1
mmHg**, **VA 4.41 L/min**, f set 12, VT set 500. Vitals: HR 89, ART M 75, EtCO₂ 64, RR 12, T1 36.4.

**Talk points** [SPK §7, §9; "Not in this build"]:
- **It looks like recrudescence; in this build it is not the drug wearing off.** → *Ce (Dantrolene) 0.999: the first
  dose is at its peak now* (10 min after it). **The MH was still building:** the onset ramp reached full activity 15 min
  after the succinylcholine (about 19:00), while one dose pulls the unsuppressed share down only slowly (τ 10 min) and
  only to 0.2. → *MH activity 0.550 (0.270 at the call, 0.510 at stop 2).*
- **Why the EtCO₂ climbed.** At that activity the CO₂ production exceeds what 12 × 500 clears. → *VA 4.41 L/min, PaCO₂
  70.1, EtCO₂ 64.*
- **What the second dose answers.** It brings the total to 5 mg/kg: E about 0.66, above 1/1.6, so the target becomes 0
  and the activity falls toward zero over the next 20–30 min (worked from the formulas, not measured). The button also
  puts the crisis ventilation back, 20 × 600 at 100 % O₂ (owner, 28 October). Measured after it: EtCO₂ 50 a minute
  later, then 48, 46, 44, 42; Recovering from 23:35; at the end (24:31) EtCO₂ 41, still at 20 × 600 [Q1-MH]. Ventilation
  back again only once the EtCO₂ has stayed below 40 for 2 min (headless, the same path: at 27:12, after the talk's end
  [S1 demo path (owner rc.4)]).
- **True recrudescence** (the card's take-home line: up to 50 %) is why the patient goes to ICU on dantrolene 1 mg/kg
  every 4–6 h. In the engine, as the drug wanes the floor rises again; this talk does not run that long.
- **What comes next, and why it waited** (the stage paragraph, verbatim [SPK]): *"The next layer of the muscle model is
  already built on a branch, with its sources named and its numbers measured: muscle lactate with its own limits (the
  glycolytic brake at low intracellular pH, a finite glycogen store, the heat of lactate production), potassium
  released by working and injured muscle sized from Medbø and Sejersted 1990, and MH severity as a scenario input. We
  held it out of this release because with it in, about fourteen clinical numbers left their acceptance bands and the
  haemorrhage case no longer arrested as rehearsed. It ships when it passes those bands, not before."* (The second
  thing to cut if running over.)

**Not in this build** (do not describe as present; open branches only) [SPK]: muscle lactate with a pH brake and a
glycogen store, lactate heat, muscle-injury potassium (PR #154, E134); MH severity as an input (#154); CO₂
vasodilation and hypercapnic myocardial depression (PR #162, post-demo).

### Segment 4: the end of the case and the MH Debrief. Slot 4:00 (T+18:00 → 22:00)

| T+ | W | Sim | Speed | Press / do | Point at (measured, Q1-MH) |
|---|---|---|---|---|---|
| 18:00 | 4:30 | **19:13** | ×4 | **Resume**, then at once **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** | state 19:13, 5 min 07 s after EtCO₂ passed 45 (objective 4 ✓, untimed); EtCO₂ 64; RR 20 again |
| | ≈ 4:31 | 19:16 | — | **5 min**, 10.1 s | banner "Fast-forwarded 5 min, No alarms"; EtCO₂ 50 a minute after the dose, then 48, 46, 44, 42 |
| ≈ 18:15 (est.) | 4:44 | **24:31** | ×4 | end: **Pause**; the take-home lines (1:00). **Do not press ventilation back** (Recovering offers it from 23:35; its rule is not met) | **EtCO₂ 41**, HR 69, ART 94/57 (67), RR 20 (still hyperventilated); T1 36.4 |
| ≈ 19:15 (est.) | — | — | — | session bar **Debrief**: read it on screen (§4) | ✓ ✓ ✓ ✓ – ✓ |
| ≈ 21:15 (est.) | — | — | — | back to **Instructor** (the case stays Paused) | |

**Take-home lines (the card's, owner-agreed 26 October, verbatim)** [CARD]: *"A rising EtCO₂ at the same ventilation
with a rising heart rate: think of MH early."* · *"Trigger off, 100 % oxygen at high flow, hyperventilation, and
dantrolene 2.5 mg/kg."* · *"Keep hyperventilating until the EtCO₂ stays down; if it climbs again, repeat dantrolene."* ·
*"After the crisis: ICU 24–48 h, dantrolene 1 mg/kg every 4–6 h for 24 h (recrudescence in up to 50 %), then referral
for testing and family counselling."*

If asked about the end: *"He stays hyperventilated until the EtCO₂ has stayed below 40 for 2 minutes, then back to
12 × 500, as the first time."* Measured past the talk (headless): ventilation back again at 27:12, then up to 44 (never
past 45), below 40 for good from 43:10 [SPK §9; S1 demo path (owner rc.4)].

**Traps:** do **not** call at the early signs before stop 1: pause first, call after it (the call lands 3 s after Early
signs either way). Do NOT press ventilation back before **10:34** (it is offered from Recovering, 9:34). No repeat
dantrolene before ventilation back (a dose moves the card out of Recovering; the button comes back only after EtCO₂
has been below 45 for a minute [CARD transitions]). The second dose right after stop 3, no later; its button is offered
only in "Ventilation back to 12 × 500". **At the end do not press ventilation back** (EtCO₂ 41, the rule not met). No
cooling and no potassium on this path (Tcore ≤ 36.8 °C; K⁺ ≤ 5.0 [Q1-MH Debrief]). On Explore there is no Pause button:
pause on the Instructor view before opening it, and resume only after coming back.

**Ruled (owner, 26 October, E132):** the clinical review is accepted in full; the climb after ventilation back is MH not
controlled, and the answer is a second dose [REV #1]. **Ruled (owner, 28 October):** the second dose also puts the
crisis ventilation back (20 × 600, O₂ 100 %), and ventilation returns to 12 × 500 only by the first return's rule,
never on a timer [OWR4]. **Ruled (owner, 29 October):** one case, three look-inside stops (P29).

**Against kit round A4** (the same presses without the stops, kit 503caeab / 2c341aa3) [E132 rc.4; OWR4]: early signs
8:14 (talk run 8:09), call 8:16 (8:12), dantrolene 8:37 (8:32), below 40 from 8:42 (8:34), ventilation back 13:56
(13:52), the second dose 19:14 (19:13), Recovering 23:36 (23:35), at 24:31 EtCO₂ 41, HR 70 (69), MAP 67 (67). The stops
hold the clock, so the course in sim time is A4's within 5 s. **On the rc.4 kit** (A4, 29 October, C / W) [Q2-rc4]:
early signs 8:13 / 8:12, call 8:14 / 8:13, below 40 from 8:38 / 8:37, ventilation back 13:52 / 13:50, EtCO₂ past 45
at 14:06 / 14:04, the second dose 19:08 / 19:07 (EtCO₂ 65); marks ✓ ✓ ✓ ✓ – ✓; the report 8 A4 pages, the handout 1.

---

## 4. The MH Debrief, read on screen (inside segment 4, ≈ T+19:15 → 21:15)

Open it with the case Paused at its end (it reports the current run). **Not printed on the day**; **Run by** and
**Notes** may stay empty. The objectives are final (E132): no "draft".

| Do | The audience sees (measured, Q1-MH; screenshot `debrief-mh-on-screen`) |
|---|---|
| Session bar → **Debrief** | page 1: the header, **Key times**, **The course** and the objectives |
| Read the **Key times** tiles | Recognition (instructor's tick) **1 s** (08:09 early signs → 08:10 ticked) · Start → first team action 33 s · the call **3 s** (asked ≤ 2 min 00 s) · dantrolene **21 s** (asked ≤ 5 min 00 s) |
| The objectives aloud | ✓ name MH (observed by the instructor at 08:10) · ✓ the call 3 s · ✓ dantrolene 21 s · ✓ second dose with hyperventilation again (19:13) · – potassium (K⁺ above 5.5 did not happen) · ✓ ventilation back (13:52, after EtCO₂ < 40 for 2 min, 08:34 → 10:34) |
| **Key moments** and the facts | 14 key moments; facts: lowest SpO₂ 96 % at 00:10 · lowest ART M / NIBP M 62 mmHg at 05:24 · highest EtCO₂ 64 at 18:46 · highest T1 36.8 °C at 00:01 · apnoea alarm to ventilated breaths 13 s · labs: K⁺ 5.0 (4.2–5.0), lactate 3.6 (1.0–3.6), pH 7.33 (7.18–7.41), Tcore 36.4 °C (36.4–36.8); 59 timeline rows, 25 minute rows |
| Say | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

The Recognition tile now counts from the early signs to the tick (kit a88f95a7); on kit 2ebd743d it counted from Load
[UIR #18]. If the report were printed: 8 A4 pages on kits e0c73a47 and 503caeab, the learner handout 1 page [E132;
E132 rc.4]. **The Persian handout printed for the day is the MH one only** (§1 "Handouts").

---

## 5. Close (T+22:00 → 25:00) and questions (T+25:00 → 30:00)

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

**Questions** (5:00; the first thing to cut if running over): see the presenter guide for the validation answer and
for "what is not in this build".

---

## 6. Fallbacks

| What happens | What to do | Source |
|---|---|---|
| The kit cannot start on the day | Open the GitHub Pages site in Safari; everything runs except the phones — skip the QR (T+0:30–2:15) and use that time for the second-screen window; needs internet | [E13, E14: owner 2026-10-18] |
| A model-page tab is blank or asks to reload (no internet on the router) | Skip the page: say what it says from the talk points (they name the page's lines) and stay on Explore. Never reload the instructor tab for it | [P29; §1 "The model pages"] |
| You opened Explore without pausing (the clock still runs; Explore has no Pause button) | Back to **Instructor** at once, **Pause**, then Explore again. If the case moved on, read the numbers it shows now: the stop's points hold within a few units | [Q1-MH: no session bar on Explore] |
| The QR relay fails, "Start Classroom" needs Node, or phones say "cannot reach the instructor's laptop" | Carry on with **Start Simulator** and **Open on a second screen** (the same browser) for the projector; phones are not needed for either case | [CR12 "(c)" and "If something goes wrong"] |
| The sheet says "The relay does not answer", or the black window stops | Close the Classroom window, double-click **Start Classroom** again, reload the page, **Sound on**. A kit before 62e521c3 stops at the first phone (KR-A1): use the 62e521c3 kit or later | [CR12; MEAS §9 item 1] |
| The laptop's presses are refused while the case keeps running (a card button, Pause or a speed gets no answer, or is refused as "a viewer cannot command") | **Reload the instructor page** (Cmd-R): the case comes back ("Restored after reload: ‹title›, mm:ss"); then **Sound on** and **All alarms on**, as in the reload row below. **The phones reconnect on their own** (the session code is kept and the phones follow the reloaded page): do not ask the room to scan again. After the reload the phones' status pills can lag the real state by up to half a second (the pill is redrawn on a 500 ms poll), and with the cuff on they can read "The ventilator is on the main screen" for 2–3 s before "Following": cosmetic, the phones are following throughout (measured on the rc.5 candidate kit C, 30 October; both causes found the same night: a display poll on the phone and the cuff start announcing the ventilator to the phones; fixes drafted post-demo, #191 and a follow-up). Main has the relay fix (#183: a second socket can no longer take the laptop's place); the rc.4 kit does not. The defect was verified on main 5808d0b6, whose relay and host files are the tag's; it needs a hand-written frame, so it is not reachable by accident | [MEAS §7; UIR #1; R00 2026-10-29 and 2026-10-30; #183; `scratch/reviews/verify-relay-peer-identity.md`; `scratch/rc5-candidate-2/browser-reconnect-*.log`] |
| Sound fails | Say so (*"the sound has failed; the alarms still show on screen"*) and continue; alarms stay visual | [G10 §7] |
| A card press shows **"Not available now: the case has moved to …"** | Press again: the button now belongs to the current state | [G10 §8 item 1] |
| A scenario goes wrong (wrong press, missed window) | Session bar **Bookmark** list → **Return here** on the bookmark taken at Load (the **last** one in the list: MH's "Bookmark 1 at 00:06" [Q1-MH]); the patient and the screen are restored together. **The alarms come back as they were when the bookmark was taken** | [FU-11 E4; A3.2] |
| Something went wrong: the toast "The monitor stopped — Restart the patient" | **Restart patient**, then **load the case again** (Load · All alarms on · Bookmark · speed) and run it from 0:00. After Restart patient the session bar reads **No scenario** and the Return-here list was not on screen (0 buttons in the two-demos run [Q1-2D `fx12`]; 3 of 6 tries before [Q1 FX-12]) | [Q1-2D; Q1 FX-12] |
| You clicked **Ventilator** (the rail or a Ventilator tab) during a card | Back to **Instructor**: the phones follow again at once, and the patient stays on the engine's ventilator at the cockpit's settings | [UIR #2; #135; E128] |
| The page was reloaded mid-case (Cmd-R, a crash) | With the reload fix (#132) the case comes back ("Restored after reload: ‹title›, mm:ss"); without it the bar reads **No scenario**: load the case again from 0:00. **Either way: Sound on again** (click it if it reads **Sound off**), and **All alarms on** if the alarm button does not read **No alarms**. The session code is kept and the phones follow | [UIR #1; #132; MEAS §7] |
| The phones split, or the count drops after you opened another tab | A second instructor tab made a new session: close it and open the Room (the QR) from the first tab only | [UIR "Two hosts"] |
| The toast "Paused while this tab was hidden (m:ss)" | The instructor tab was hidden: the session paused and resumed on return. Keep the tab in front; in real Safari a hidden tab once lost the phone's session (H19, FX-14, FX-15) | [UIR "Hidden instructor tab"; G12P] |
| A printed page carries the "Fast-forwarded …" banner | It was printed within ≈ 8 s of a span: print again once the banner has gone | [UIR #9] |
| MH: "ventilation back" is not on the card after stop 2 (13:50) | The card has left Recovering (a dantrolene dose): wait until EtCO₂ has been below 45 for a minute, and press it when it shows | [CARD transitions] |
| A phone says "This session is full" | 60 phones are following: ask a neighbour to share | [CR12] |
| The phones show "---" where the screen shows a number after a style change | You changed the monitor style mid-session (FX-9). Change it back, or re-load the case | [MEAS §8; Q1-2D `s12f2`] |
| Running long | Cut questions, then stop 3's paragraph on what comes next, then the Debrief read (§ "The programme at a glance") | [P29] |

---

## Still not measured (on the 3 November path)

1. **The talk.** The talk run [Q1-MH] is presses, Explore openings and a 3-s look per screen (5:03 of wall from the
   opening to the Debrief); the stops' 3:00 and the segments' talk are the owner's planning, not measurements.
2. **WebKit (Safari) on the new programme.** Run on the rc.4 kit, 29 October [Q2-rc4]: the same stops, marks and
   Explore numbers within 0.01; every state and press time within 2 s of Chromium on the record's clock (the Debrief's
   highest EtCO₂ at 19:11 against 19:07). Headless WebKit, not the owner's Safari.
3. **The model-page tab in a real browser.** The headless run brought the tab to the front and back, but the
   instructor page stayed "visible" to the page (headless Chromium does not hide a background tab), so the hidden-tab
   rule was not exercised. By the code a Paused session stays paused and is not resumed on return
   (`apps/demo/src/app/hidden-tab.ts`). Rehearse it on the presenting Mac in its browser on Sunday; in real Safari a
   hidden tab is suspended after about 4 min (FX-14).
4. **The model pages offline.** The kit does not carry `docs/model/`; the pages are GitHub's and need the internet when
   opened. Whether the travel router has internet is not known.
5. **The rc.4 kit.** Rehearsed on 29 October on both engines [Q2-rc4]: the rows that moved are in §3 "On the rc.4
   kit". The owner's smoke and live rehearsal on it follow (Sunday evening or Monday morning) [RC4].
6. **The Scenarios library path on the talk run.** The script loaded MH from the Instructor's Scenario tab (Showcase
   chip); Home → **Start here** → Room was run, Scenarios → **Open the library** → **Load** was not [Q1-MH].
7. **Real devices**: measured by the owner on 18 October (one phone over the Mac's hotspot) [G12P; G13 §0]: H17,
   H18 and H20 pass in real Safari; H19 failed (FX-14, FX-15: keep the tab visible); the print passes in Chrome and in
   Safari. Still not measured: router capacity with a room of phones, sound by ear, real Safari tab suspension
   [MEAS §10; UIR "What I could not exercise"].
8. **E13 / E14**: the kit on a Mac with a travel router; the presenting Mac's `node -v` and one Start Classroom run on
   it by the room dry run, Monday 2 November [RC4].
9. **A human's reaction time**: the run used a fixed 2 s of wall, and pressed at once after each Resume. The tightest
   window is ventilation back: "not met" before 10:34; the talk presses it after stop 2, at 13:52 [Q1-MH].
10. **The figures for the ask** (funding amount, research line, adoption terms).
11. **The Persian strings.** The Persian of the E132 strings (card states, objectives, take-home lines) is the owner's
    to write: until then the MH Persian handout prints them in English. The MH course past the talk's end
    (ventilation back again at 27:12) only headless [SPK §9].
12. **ID collisions**: the review pack's addendum 2 uses H20 and E17–E19 for other items; this sheet uses the rulings'
    meaning [R31 note 1].

---

# Appendix A: Not in the 3 November programme

*The 22 October slot (owner's answers of 17 October): bronchospasm with the Ventilator view → tamponade → CPR →
drainage → the tamponade Debrief → MH on the pre-E119 card. Kept unchanged for the record; none of it is part of the 3
November programme (R4-Q3, 2026-10-24; P29, 2026-10-29). If a case here is ever used: Load → All alarms on → speed → Bookmark as
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
and say "The ventilator is on the main screen" until you leave the Ventilator view, then follow again within a second
[CR12; MEAS §6; CLASSROOM]. The session bar (speed, 2 min,
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
and EtCO₂ never back below 40 by 35:00 [MEAS §1, late call]. Untreated, this build (E131) does not arrest within
51 min of the succinylcholine: no VF, core 37.3 °C, K⁺ at most 6.8 [S1 untreated E131; `docs/validation/known-misses.md`,
S1 untreated]. Honesty: that is too slow (before E131 it was VF at 42.3 °C at 44.7 min, which the literature review
found too fast for a volatile trigger), and no human EtCO₂ time course stands behind the "40 → 60 by 10 min" band
[R00 2026-10-11 "LITERATURE 29"; SYN (a) item 11].
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

*R5 (the E120 haemorrhage card) left the programme on 29 October (P29) and is kept as it was that day. R1–R4 were
dropped from the 30-minute slot by the owner's answer E19c (2026-10-17) and are kept here unchanged from kit round B
(PR #65), so they can come back if the slot grows or a question asks for them. Their slots are the round-B 60-minute
planning figures. All four are measured [MEAS §2, §3, §4]. If one is used: Load → All alarms on → speed → Bookmark as
always; haemorrhage starts on a freshly reloaded page if the Ventilator view was opened before.*

The round-B corrections that concern these cases: the premedicated patient's apnoea timing depends on the browser
(38.8 s C / 56.8 s W after Induce, against 52.3 / 53.9 s in the healthy induction), so do not promise that he "stops
breathing sooner" [MEAS §3]; the haemorrhage SVR **rises** in Explore at 8:00 (1951, +659) [MEAS §4]; early CPR in
haemorrhage no longer causes VF, it makes both CPR objectives "not assessable" [MEAS §4 probe]; anaphylaxis epinephrine
at 1:30 into the reaction, not 2:00 (the owner's answer E19b, 2026-10-17) [MEAS §2; R00 2026-10-17].

### Reserve R5: Class IV haemorrhage, PEA, asystole, VF, two shocks and ROSC (the E120 card after the clinical review, E132). In the build; out of the 3 November programme (owner, 29 October)

*The second live demo of the 24 October programme (R4-Q3). The owner's programme of 29 October is one case (MH) with three look-inside stops, so this case left the talk; **the card stays in the build, first in the Showcase chip with MH, and its kit-round test (A4 haemorrhage) still measures it**. Kept as it was on the day it left, for a longer slot or a question. Its old slot was 5:40 plus its Debrief 3:30. If it is used: Load → All alarms on → Bookmark → speed, as always; no reload is needed after MH (Instructor → Scenario → **Choose another scenario**). Its Persian handout stays in the kit; it is not printed for the day.*

**To Load.** After another case: Instructor → Scenario → **Choose another scenario** → **Showcase** → *Class IV
haemorrhage, PEA and resuscitation* → **Load** → **Load scenario** (no reload after MH [Q1-2D: "choseAnotherScenarioFirst"]).
First case of the page: **Scenarios** → **Open the library** → **Load** on *Class IV haemorrhage, PEA and resuscitation*.

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
- **PEA (10:24, ART 21/14):** *"This is pseudo-PEA: a pressure too low to feel. A palpated pulse would call it PEA."*
- **Before the pulse loss (≈ 10:59):** *"Now we do what nobody should: wait, so you can see a pulseless heart decay."*
- **At the resuscitation:** *"In haemorrhagic arrest the surgeon stops the bleeding and we give blood; compressions
  cannot fill an empty heart."* Charge during compressions; the pause for the shock should be under 10 s (measured 8 s on the rc.4 round)
  [owner, 28 October].
- **First rhythm check (VF):** *"The card inserts VF to show the defibrillator. The first shock does stop the VF: no
  organised rhythm follows it."* For recurrent VF, consider escalating the energy.
- **The return of circulation:** *"The pulse comes back because the volume brought the perfusion pressure up, not
  because of the shock. We see it at the 2-min rhythm check, on the arterial line and the capnogram."*
- **After the stop:** *"The model recovers faster than a patient would; expect a fragile, tachycardic,
  vasopressor-dependent patient."*

Talk allowance [DRAFT]: 0:30 framing before Load; the rest is said over the running case (the ×1 stretches: asystole →
CPR, the rhythm checks, the return of circulation). Rows: the two-demos run [Q1-2D `q1-2`, Chromium, kit 2ebd743d,
on the card BEFORE E132]; the last column is kit round A4 on the card after the clinical review with the E126
pulse-check pause, rebased onto main 25771808 with E131, E133 and #153 (kit 503caeab, Chromium, 27 October)
[E132 rc.4]. After the second shock the E132 column is the course as it now is.

| T+ (24 Oct programme) | W | Sim | Speed | Press / do | Point at (measured, Q1-2D) | E132 C |
|---|---|---|---|---|---|---|
| 13:30 | 0:00 | 0:00 | **×8** | **Load · All alarms on · Bookmark** (bookmark at 00:11) | HR 71, ART 123/81 (95), SpO₂ 96 on room air, EtCO₂ 36 | same; bookmark 00:04 |
| 13:33 | 0:06 | 0:30 | ×8 | **Oxygen by face mask, FiO₂ 1.0** | state 0:32 | 0:35 |
| 13:37 | 0:10 | 1:00 | ×8 | **Intubate and ventilate, FiO₂ 1.0**; the minute-1 line | state 1:01; SpO₂ 99 | 1:06 |
| 14:29 | 1:01 | 8:00 | ×8 | — | **HR 141, ART 76/62 (66), EtCO₂ 25**; `ART SYS TOO LOW` 8:28 | 8:05: HR 140, ART 74/60 (65), EtCO₂ 25; 8:28 |
| 14:38 | 1:11 | **9:17** | ×8 → **×4** | (the card sets the **junctional rhythm 50/min**) | HR 158 → 50, ART 56/45 (49) | 9:16, ART 56/45 (49) |
| 14:56 | 1:29 | 10:28 | ×4 | state **PEA** (systolic below 25 for 10 s); the pseudo-PEA line | ART 19/13 (15), HR 50 | 10:24, ART 21/14 (15) |
| 15:04 | 1:37 | **11:00** | ×4 → **×8** | the model's **pulse loss** (`SPO2 NO PULSE` 11:11). **Do not start CPR** (the course: untreated; say why) | junctional, no pulse; ART mean only (10); `CO2 APNEA` 11:54 | 11:00; 11:06; `CO2 APNEA` 11:53 |
| — | — | 12:56 | ×8 | (idioventricular) | — | 12:54 |
| 15:39 | 2:12 | **15:37** | ×8 → **×1** | state **Asystole** (`ECG ASYSTOLE` 15:38); the ECG flat from 15:29 | HR 18, ART mean 5; 4 min 37 s after the pulse loss | ECG flat 15:27; state 15:34; alarm 15:36 |
| 15:42 | 2:14 | 15:39 | ×1 | **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0**, then **Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g** | — (before E132: 2 L crystalloid and 2 units) | 15:38 / 15:39 |
| 16:02 | 2:34 | 15:59 | ×1 → **×4** | **Epinephrine 1 mg** | ART 33/11 (19), EtCO₂ 5 | 15:59; ART 35/12 (20), EtCO₂ 5 |
| — | 2:44 | 16:39 | ×4 | — (1 min into CPR) | ART 53/22 (34), EtCO₂ 13 | 16:39; ART 63/27 (40), EtCO₂ 14 |
| 16:28 | 3:00 | **17:38** | **×1** | **Rhythm check** → compressions pause (E126) and the card sets **VF** (`ECG VFIB` 17:41) | ART 70/33 (46), EtCO₂ 19 | 17:38; ART 74/37 (50), EtCO₂ 20; VFIB 17:41; `SPO2 NO PULSE` 17:45 |
| 16:35 | 3:08 | 17:47 | ×1 → **×4** | **Defib, pacing & CPR tab: Charge (200 J) → Shock** (charge during compressions; the pause for the shock under 10 s, measured 8 s on the rc.4 round [owner, 28 October]) | outcome **asystole** | 17:46 (8 s after the check; ART mean 29 in the pause), asystole; compressions resume with the shock |
| — | 3:23 | 18:47 | ×4 | — (CPR on) | ART 74/38 (51), EtCO₂ 23 | 18:47; ART 74/37 (50), EtCO₂ 22 |
| ≈ 16:50 | ≈ 3:26 | **≈ 18:57** | ×4 | **Epinephrine 1 mg** (the second dose, 3 min after the first) | (before E132: one dose only) | 18:57 |
| 17:06 | 3:39 | **19:46** | **×1** | **Rhythm check** → **VF again** (card; `ECG VFIB` 19:49) | ART 74/38 (51), EtCO₂ 25 | 19:45 (compressions pause); ART 73/34 (50), EtCO₂ 24; VFIB 19:48 |
| 17:14 | 3:47 | 19:54 | ×1 → **×4** | **Charge → Shock** → organised rhythm, no pulse (sinus ≈ 19:58); **keep CPR** to the 2-min rhythm check | | 19:53 (ART mean 29 in the pause); sinus 19:58; compressions resume |
| — | — | **20:58** | ×4 | the pulse returns (the model), 64 s after the shock: point at the arterial line between compressions | ART 76/40 (53) → 113/54 (81) at 21:01; `ART SYS TOO HIGH` 21:02 | **20:57** (64 s); `ART SYS TOO HIGH` 21:02; `SPO2 LOW SIGNAL IQ` / `SPO2 NO PULSE` 21:05–21:43 under compressions |
| ≈ 17:50 | ≈ 4:20 | **≈ 21:50** | ×4 → **×1** | the 2-min rhythm check: organised rhythm, **ART 148/76, EtCO₂ 45** → **Rhythm check: pulse back, stop CPR** | (before E132: stopped at 21:00, 3 s after the return) | 21:52: ART 136/73 (95), EtCO₂ 45; **21:54**, 57 s after the return |
| ≈ 18:05 | ≈ 4:35 | 22:55 | ×4 | end → straight to its Debrief (below) | (before E132, 22:00: ART 135/83 (100), HR 72, EtCO₂ 46, SpO₂ 99) | 22:54: ART 141/93 (109), HR 74, EtCO₂ 54; `ETCO2 TOO HIGH` 22:24 |

Machine wall, Load → end: **4:34** (273.5 s) on the rc.4 rebase [E132 rc.4] (4:33 on E126 only, 4:34 before it) against 5:05 on 24 October [E132; A4]: the stretch after
the second shock now runs at ×4. The T+ times after 16:35 are estimated from the E132 wall (no talk run on this card).

**On the rc.4 kit** (kit round A4, 29 October, C / W) [Q2-rc4], the rows that moved more than 2 s from the E132 column:
**PEA 10:26 / 10:28** (10:24), with ART 19/12 (14) at the PEA state (the objective says "about 20/14"). Within 2 s:
junctional 9:15 / 9:17, pulse loss 10:59 / 11:00, the second epinephrine 18:56 / 18:57, idioventricular 12:55 / 12:56,
asystole 15:35, CPR 15:38, rhythm checks 17:37 / 17:38 and 19:44 / 19:45, shocks 17:45 / 17:46 (→ asystole) and 19:52 /
19:54 (→ organised, no pulse), the return of circulation **20:56 / 20:57**, CPR stopped 57 s / 58 s after it. Marks – ✗
✓. **The report prints 8 A4 pages on the rc.4 kit** (9 on kit 503caeab), 95 / 101 timeline rows, 21 key moments; the
handout 1 page with the three take-home lines.

**What the audience should look at:** the HR climbing while the pressure holds, then the pulse pressure narrowing
(8:00); the ECG turning **junctional** at 50/min (9:16, the card); **PEA** (10:24): a rhythm on the ECG with the
arterial line at 21/14 (pseudo-PEA), then flat; the **pulse loss** (11:00: the arterial number goes mean only, then
`SPO2 NO PULSE`); the ECG slowing to **idioventricular** (12:54) and then **asystole** (15:27–15:34); the **CPR
traces**: compressions on the ECG and the arterial line, the arterial line building 35/12 → 63/27 → 74/37 and EtCO₂
5 → 14 → 20 over two minutes; **VF** at the rhythm check (17:38), compressions paused until the shock; the **first shock** → asystole; VF again (19:45);
the **second shock** → an organised rhythm without a pulse; the **return of circulation** (20:57): the arterial line
rises between compressions and EtCO₂ climbs; at the 2-min rhythm check 136/73 and EtCO₂ 45; a minute after the stop
141/93, HR 74, EtCO₂ 54 (too good: the model recovers faster than a patient would) [E132 rc.4].

**During CPR, two tiles mislead:** SpO₂ reads 99 and the HR 107–111 (the compressions are counted) on kits 4d0fca9b
and 503caeab; at each rhythm check, compressions paused until the shock (E126, #138), both go blank and `SPO2 NO PULSE`
sounds [E132 on E126 rows; UIR #6, #7]. After the return of circulation, with compressions still on to the rhythm
check, `SPO2 LOW SIGNAL IQ` and `SPO2 NO PULSE` come and go (21:05, 21:07, 21:25, 21:27, 21:43) [E132 rc.4; #153's
pulse amplitude per beat]. Point at the ECG, the
arterial line and the capnogram; if asked, say so.

**Debrief objectives and the verdict on the owner's course** [CARD; E132 Debrief]: – Not assessable: Recognise PEA from
hypovolaemia (pseudo-PEA at ART about 20/14 [OWR4; E132 rc.4]; the instructor judges it) · **✗ Not observed: CPR within 30 s of the pulse
loss (4 min 39 s: 11:00 → 15:38)**: the objective's own text says the demo withholds CPR on purpose · **✓ Observed: the
return of circulation recognised at the rhythm check and CPR stopped, 57 s after it (20:57 → 21:54; asked within
2 min 00 s)** [E132 rc.4; the window 150 → 120 s: owner, 28 October]. No "draft" anywhere. **Take-home lines (the card's, owner-agreed 26 October, verbatim):** *"Positive
pressure and induction can tip a compensated bleeding patient into arrest."* · *"In haemorrhagic arrest, stopping the
bleeding and giving blood come first; compressions cannot fill an empty heart."* · *"EtCO₂ and the arterial diastolic
pressure show how good the CPR is, and they show the return of circulation."* Phones: 3 followed, no S12-F2 (largest
mismatch 1.5 s, HR at the junctional drop) [E132]; after the rebase onto E126 one of the three phones showed the
HR blank for 33.1 s against the instructor's 155 → 110 at the second rhythm check (S12-F2 seen; the other two 2.5 s)
[E132 on E126]; on the rc.4 rebase the three phones' largest mismatch was 4 s (HR 139–143 against 141 at the return
of circulation: S12-F2 seen by the 2-s rule, a lag, no blank) [E132 rc.4].

**Traps:** no CPR before asystole (CPR on the PEA stops its slide to asystole). Shock only in VF. After the second
shock keep CPR to the 2-min rhythm check, even after the arterial line shows the return (≈ 20:57); stop at the rhythm
check (≈ 21:54). Press ×1 at the asystole **state**, not by the clock: the slide is seeded and the ECG went flat at
15:27–15:30 in every run. The second epinephrine is in the state after the first shock: press it before the second
rhythm check.

#### The haemorrhage Debrief (R5). Old slot 3:30

Open it before loading anything else: it reports the current run. The objectives are final (E132): no "draft" on the
panel, the report or the print.

| T+ (24 Oct programme) | Do | The audience sees |
|---|---|---|
| 18:40 | Session bar → **Debrief** | the report of the run just finished: page 1 the header, **Key times**, **The course** and the objectives; page 2 the **Key moments** and the measured facts |
| 18:55 | **Run by**: "Showcase 2, 3 November"; one line in **Notes** | — |
| 19:10 | Read the **Key times** tiles | **Start → first team action 35 s** · **CPR 4 min 39 s** after the pulse loss (asked ≤ 30 s) · **CPR stopped 57 s** after the return of circulation (asked ≤ 2 min 00 s; 2 min 30 s before the owner's ruling of 28 October) · **pulseless in all 9 min 57 s** [E132 rc.4 Debrief keyTimes] |
| 19:40 | The objectives aloud | – Recognise PEA from hypovolaemia (the instructor judges it; name the pseudo-PEA) · ✗ CPR within 30 s: the demo withheld it on purpose, as the objective says · ✓ the return of circulation recognised at the rhythm check |
| 20:10 | **Key moments** (page 2) · **Timeline** | 21 key moments in the report; **100 timeline rows, 23 minute rows** (98 on E126 only, 79 before the E126 pause added its alarms); facts: lowest SpO₂ 96 % at 00:10 · lowest ART M / NIBP M 3 mmHg at 11:13 · highest EtCO₂ 54 at 22:48 · pulseless 9 min 57 s, first lost at 11:00 · return of circulation 9 min 57 s after the pulse loss (20:57) · epinephrine 2 mg (2 doses) · labs: K⁺ 4.5 · lactate 4.9 · pH 7.18 [E132 rc.4 Debrief] |
| 20:55 | **Print or save as PDF** → save. **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers).** Then **Print the learner handout** (optional) | the report: **9 A4 pages** (8 before E126), title "Debrief Class IV haemorrhage, PEA and resuscitation ‹date›" [E132 on E126; E132 rc.4]; the handout 1 page on kit 503caeab [E132 rc.4]; the handout: **1 A4 page** (on kit e0c73a47 it printed 2: the 21 key moments and the three take-home lines pushed the third line onto page 2; the compact handout layout for a long Key moments table was tightened for it, Debrief e2e 258.7 mm of 267) [E132]. Check the handout lists both shocks and the return of circulation before giving it out |
| 21:40 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

The handout and the report carry no fast-forward banner here (the haemorrhage has no span); after a span, print only
once the banner has gone (≈ 8 s) [UIR #9].

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

### Reserve R4 (round B; SUPERSEDED by the E120 card, Reserve R5): Class IV haemorrhage, PEA and resuscitation (+ the Explore moment). Round-B slot 7:30

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
