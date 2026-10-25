# Showcase 2: cue cards (Tuesday 3 November 2026, 12 Aban 1405, the 30-minute slot)

*One card per page, for the lectern. Print from a Markdown preview at 150 % or more, one card per page (a page break
follows each card). **The programme (owner, 2026-10-24, R4-Q3 FINAL): two live demos, malignant hyperthermia (E119
card), then class IV haemorrhage (E120 card) with its Debrief.** Bronchospasm and tamponade are not in it; their old
cards are at the end, under "Not in the 3 November programme", with the reserve cases. Freeze: Saturday 31 October
12:00.*

*Where the numbers come from. **Clock** = the session-bar clock (Load = 0:00). Every clock time and monitor number is
measured: the two-demos talk run (kit 2ebd743d, 24 October, Chromium, 3 emulated phones, 2 s reaction;
`scratch/kitround-2demos-q1/`, the Q1 talk of #130) and kit round A4 (24 October, both engines;
`docs/showcase/kit-round-a/a4-*`). Where A4 differs by more than 3 s it is given in brackets. **Slot** = time from the
start of the segment's slot; **T+** = time from the opening, as ruled; both are the measured machine wall from each
Load plus the talk allowances of the timing draft (planning figures, not measurements; the talk itself is not
measured). A time I had to estimate is marked "(est.)".*

*The order of the two demos may still change. Each demo card is self-contained (how to reach its Load from the Start
page or from a running case, its presses, its end): to swap them, swap the MH card with the HAEM + HAEM-D pair and
recompute T+ from the Slot column.*

<div style="page-break-after: always;"></div>

# Every case, and the safety lines

## The order (30 min)

| T+ | Segment | Slot | Card |
|---|---|---|---|
| 0:00 | Opening on the Start page: release label, session code, QR; the phones join | 3:00 | OPEN |
| 3:00 | **MH**, early call (E119): induction, crisis, treatment, recovery | 10:00 | MH |
| 13:00 | **Class IV haemorrhage** (E120): PEA → asystole → CPR → VF → 2 shocks → ROSC | 5:40 | HAEM |
| 18:40 | **The Debrief** (haemorrhage), read and printed | 3:30 | HAEM-D |
| 22:10 | Close and the ask | 3:00 | run sheet §5 |
| 25:10 | Questions | 4:20 | |
| 29:30 | buffer | 0:30 | |

**Running over? Cut:** questions first · then MH span 3 (and its Pause line) · then the MH Debrief glance.

Measured machine wall (no talk): MH Load → end **2:17** (136.9 s); haemorrhage Load → end **5:08** (307.7 s); the
whole two-demos run, presses only, **8:25** from the opening to the close (two-demos talk run).

## Every case: Load → All alarms on → Bookmark → speed

- **Press All alarms on after every Load**, then Bookmark. Instructor → Devices & alarms → **All alarms on**; the
  top-right button then reads **No alarms**. (On kit 2ebd743d the alarms stayed on after both Loads; press it anyway:
  older kits turned them off.)
- **Bookmark AFTER All alarms on.** Return here then brings the alarms back on.
- **Fast-forward: about 10.5 s** of wall (10.5–10.6 s per 5-min span). Press nothing while the amber panel shows.
  **The speed after it is the speed before it** (×4 stays ×4).
- **"Not available now"** → press again.
- **Saadat-style monitor. Never change the monitor style during the talk** (AGENTS reads "---" after a change).
- **Silence lasts only until the next alarm.** There is no alarm pause on this monitor.
- **Return here: take the LAST bookmark in the list.** The list keeps the earlier case's bookmarks, named only by their
  clock ("Bookmark 1 at 00:06" was MH's while the haemorrhage ran).
- Something went wrong → **Restart patient**, then **load the case again** (Load · All alarms on · Bookmark · speed) and
  run it from 0:00. After Restart patient the session bar reads **No scenario** and the Return-here list was not on
  screen (0 buttons in the two-demos run; 3 of 6 tries before).

## Safety lines (UI review, 24 October; true with or without this week's fixes)

- **Never click "Ventilator" during a card**: not the top-bar tab, not the Start page's Other tools tile. One click
  holds every phone on "The ventilator is on the main screen", still held 20 s after going back to the Instructor
  view. If it happens: back to **Instructor**; if the phones still hold, **Pause** then **Resume** (a pause freed them
  in the review).
- **Never reload mid-case.** If it happens: with the reload fix (#132) the case comes back with the toast
  "Restored after reload: ‹title›, mm:ss"; without it the bar reads **No scenario**: load the case again from 0:00.
  **Either way, switch Sound on again**: after a reload the browser wants a click before it plays sound; if the
  button reads **Sound off**, click it. Check **All alarms on** too.
- **Show the QR only from the first instructor tab.** A second tab, or a second browser, gets a NEW session code; a QR
  shown from it splits the room.
- **The instructor tab stays in front for the whole talk.** A hidden tab pauses the session at once (toast "Paused
  while this tab was hidden (m:ss)"; the phones read "(paused)").
- **Print the handout only after the fast-forward banner has gone** (≈ 8 s after a span): printed earlier it carries
  the banner on every page, and on screen the banner covers **Print the learner handout**.
- **The MH report prints 8 A4 pages** (not 7: the UI review on kit 2ebd743d; A4 on kit 52b0390b printed 7). The
  haemorrhage report prints 8.

<div style="page-break-after: always;"></div>

# OPEN · The opening on the Start page (T+0:00 → 3:00)

**Slot 3:00 · the simulator opens on the full Start page (E123, #131): the two demo cards are the first thing on
screen**

| Slot (T+) | Look at | Click | Say |
|---|---|---|---|
| 0:00 (0:00) | Start page: title **Patient monitor simulator**, the release label line "Version 1.0.0-rc.… (pre-release). For education only. Not a medical device…", **Demonstration 1** (MH) and **Demonstration 2** (haemorrhage) | — | what the simulator is; education only, not a medical device |
| ≈ 0:30 (est.) | Session panel: the large **session code** | **1 · Show the QR code** | "Join the Wi-Fi called ‹network› and scan this code. Your phone follows what I do here; it is silent." |
| | "0 phones following" → "3 phones following" (the phones joined **2.5 s** after the QR, two-demos run, 3 emulated phones) | — | |
| ≈ 2:15 (est.) | the count | **2 · Close** (the QR sheet) | |
| at MH +1:30 (T+4:30) | Demonstration 1: *Malignant hyperthermia* | **3 · Load** on the card → the Instructor view opens with the case loaded (toast "Scenario loaded: Malignant hyperthermia") | then the MH card's first row: All alarms on · Bookmark · ×8 |

The third click is the MH card's Load: the MH framing (1:30) is said with the Start page still on the screen.

**Without the Start page** (a kit before #131): the Start view sits beside the monitor. QR: **Monitor** view → pointer
to the top edge → **Phones**; the case: **Open the instructor view** → **Scenario** → **Showcase** → *Malignant
hyperthermia* → **Load**.

**Traps:** do not click the **Ventilator** tile under Other tools. Show the QR from this tab only.

<div style="page-break-after: always;"></div>

# MH · Malignant hyperthermia, early call, with the induction (E119)

**Slot 10:00 (T+3:00 → 13:00) · ×8 then ×4 · three 5-min fast-forwards at ×4 · machine running 2:17**

Talk allowance in the slot: 1:30 framing before Load · 2:00 at each of the two Pauses · 1:00 take-home at the end ·
1:00 Debrief glance.

**To Load:** first case of the page → Start page, **Load** on *Demonstration 1 · Malignant hyperthermia*. After another
case → Instructor → Scenario → **Choose another scenario** → **Showcase** → *Malignant hyperthermia* → **Load** →
**Load scenario**. No reload.

States: **Awake (room air)** → Premedicated → **Preoxygenated** → **Induced** (MH starts) → Intubated → Surgery →
**Early signs** → Trigger off (20 × 600) → treatment → **Recovering** → Ventilation back to 12 × 500

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (3:00) | — | the Start page | — | framing, 1:30 |
| 1:30 (4:30) | 0:00 | HR 69, ART 122/80; room air | **Load · All alarms on · Bookmark · ×8** | "Awake on the table, monitoring on, breathing room air." |
| 1:34 (4:34) | 0:30 | | **Premedicate: midazolam 2 mg, fentanyl 100 µg** | |
| 1:38 (4:38) | 1:00 | RR 13, SpO₂ 96 | **Preoxygenate: 100 % O₂ by face mask** | "Oxygen is never implicit: we give it." |
| 2:00 (5:00) | **4:00** | RR down to 6 after the premedication (`RR TOO LOW` 3:09) | **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** | "The jaw is hard to open: masseter rigidity." |
| 2:08 (5:08) | **5:00** | `CO2 APNEA` 4:56; **SpO₂ 99** | **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** | "SpO₂ 99 through the apnoea: he was preoxygenated." |
| 2:15 (5:15) | **6:00** | EtCO₂ 42, HR 72 | **Start surgery: rocuronium 0.6 mg/kg** (state 6:03) | |
| 2:26 (5:26) | 7:30 | **EtCO₂ 44**, HR 76 | **×4** | "Same ventilation. Watch the CO₂ tile." |
| 2:41 (5:41) | **8:32** (A4 8:38) | state **Early signs**: **EtCO₂ 46**, **HR 79**; temperature not moved (T1 ≤ 37.2 °C all case) | tick *Name malignant hyperthermia* (Scenario tab) · **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** (lands 8:42) | *"A rising EtCO₂ at the same ventilation with a rising heart rate: think of MH early."* |
| 2:49 (5:49) | ≈ 9:03 | EtCO₂ below 40 from **9:05** | **Dantrolene 2.5 mg/kg**, then **Cool: 2 L saline at room temperature** (9:13) | *"Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg."* |
| 2:54 (5:54) | 9:22 | | **5 min** fast-forward (1), 10.5 s. **Hyperventilation stays on** | |
| 3:05 (6:05) | ≈ 14:33 | state **Recovering** (from 10:15, inside the span) · **EtCO₂ 35**, HR 76, ART 124/74 | **Pause** · 2:00 talk · **Resume** | the early call |
| 5:06 (8:06) | 14:41 | EtCO₂ 35–36 | **EtCO₂ normal: ventilation back to 12 × 500** (state 14:43) · **5 min** (2) | "EtCO₂ has stayed below 40 for 2 minutes: ventilation back." |
| 5:17 (8:17) | ≈ 19:58 | **EtCO₂ 53**; banner: `ETCO2 TOO HIGH` 18:38 (inside span 2) | **Pause** · 2:00 · **Resume** | the settling-production line: "EtCO₂ rose to the alarm limit while CO₂ production settled; the alarm caught it; we keep watching." |
| 7:18 (10:18) | ≈ 20:03 | | **5 min** (3) (the first case item to cut) | |
| 7:29 (10:29) | 25:12 | EtCO₂ 51, HR 72, ART 130/76; T1 37.2 °C | end · **Pause** · take-home 1:00 | the three take-home lines (below) |
| 8:30 (11:30) | | | session bar **Debrief**: glance ✓ ✓ ✓ – – ✓ · 1:00 | read the marks, not the tiles |
| 9:30 (12:30) | | | back to **Instructor** · **Resume** | |
| 10:00 (13:00) | | | → the next card's "To Load" | |

**Take-home lines (approved, verbatim):** *"A rising EtCO₂ at the same ventilation with a rising heart rate: think of
MH early."* · *"Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg."* · *"Keep
hyperventilating until the EtCO₂ has stayed down, and treat the potassium."*

**What the monitor shows, in order:** the CO₂ tile climbs at the same ventilation (42 at 6:00 → 44 at 7:30 → 46 at the
early signs) while the HR rises only a little (72 → 79: the fentanyl); the temperature does not move on this early
path (36.6 → 37.2 °C over the whole case), so do not wait for it · EtCO₂ below 40 within 23 s of the call · after
ventilation back the CO₂ climbs to 53 and stays ≈ 51.

**Debrief glance (marks, measured):** ✓ name MH (ticked 8:34) · ✓ call (10 s) · ✓ dantrolene (21 s) · – repeat
(instructor) · – potassium (never above 5.5) · ✓ ventilation back (after EtCO₂ < 40 for 2 min, 09:05 → 11:05). Read
the objectives: the Recognition tile counted from Load (8 min 34 s) on this kit (UI review #18).

**Traps:** do NOT press ventilation back before **11:05** (it is offered from Recovering, 10:15, but EtCO₂ has not yet
stayed below 40 for 2 min: "not met"); the talk presses it after the first Pause (14:41). No repeat dantrolene just before it
(a dose takes the button off for at least a minute). No potassium on this path. Skip Preoxygenate and SpO₂ falls to
≈ 63 % before the tube: if you skip it, say why.

**Pending (owner):** the 24 October clinical review (finding 1) reads the EtCO₂ climb after ventilation back as MH not
controlled and asks for a second dose instead of the settling-production line. Until the owner rules, the line stands
as the talk script has it.

*Two-demos talk run `q1-1-malignant-hyperthermia-early-call-14-41-chromium` (kit 2ebd743d); A4 MH (kit 52b0390b, both
engines); the timing draft.*

<div style="page-break-after: always;"></div>

# HAEM · Class IV haemorrhage: PEA, asystole, VF, two shocks, ROSC (E120)

**Slot 5:40 (T+13:00 → 18:40) · ×8, ×4, ×1 · no fast-forward · machine running 5:08 · its Debrief follows (HAEM-D)**

Talk allowance: 0:30 framing before Load; the rest is said over the running case (the ×1 stretches: asystole → CPR,
the pulse checks, the return of circulation).

**To Load:** after another case → Instructor → Scenario → **Choose another scenario** → **Showcase** → *Class IV
haemorrhage, PEA and resuscitation* → **Load** → **Load scenario**. First case of the page → Start page, **Load** on
*Demonstration 2*. No reload after MH.

States: Bleeding on room air → (Oxygen by mask) → **Intubated and ventilated** → **Junctional 50/min** (card) → **PEA**
→ **Asystole** → CPR → volume · epinephrine → **Pulse check: VF** (card) → shock → **Pulse check: VF again** (card) →
shock → **Pulse back**

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (13:00) | — | | (To Load) | framing, 0:30 |
| 0:30 (13:30) | 0:00 | HR 71, ART 123/81, SpO₂ 96 on room air | **Load · All alarms on · Bookmark · ×8** | "Bleeding 2.5 litres over 10 minutes, breathing room air." |
| 0:33 (13:33) | 0:30 | room air | **Oxygen by face mask, FiO₂ 1.0** (state 0:32) | |
| 0:37 (13:37) | 1:00 | | **Intubate and ventilate, FiO₂ 1.0** (state 1:01) | |
| 1:29 (14:29) | 8:00 | **HR 141**, **ART 76/62**, EtCO₂ 25 | — | "The pressure held and only the heart rate told you; now the pulse pressure narrows." |
| 1:38 (14:38) | **9:17** | ECG: **junctional 50/min** (the card sets it); ART 56/45 | **×4** | "The card sets this rhythm; what follows is the model." |
| 1:56 (14:56) | 10:28 | state **PEA**: ART 19/13, the ECG still running | — | "Electrical activity, no pressure." |
| 2:04 (15:04) | **11:00** | pulse lost: the arterial number goes mean only; `SPO2 NO PULSE` 11:11 | **×8** · **no CPR** | "The course leaves the PEA untreated." |
| — | 12:56 | ECG idioventricular | — | |
| 2:39 (15:39) | **15:37** | state **Asystole**: the ECG flat (from 15:29), `ECG ASYSTOLE` 15:38 | **×1** | |
| 2:42 (15:42) | 15:39 | compressions on the ECG and the arterial trace | **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** · **2 L warmed crystalloid and 2 units of red cells** | |
| 3:02 (16:02) | 15:59 | ART 33/11, EtCO₂ 5 | **Epinephrine 1 mg** · **×4** | |
| 3:28 (16:28) | **17:38** | 2 min of CPR: **ART 70/33, EtCO₂ 19** | **×1** · **Pulse check** → **VF** (`ECG VFIB` 17:41) | "CPR and volume built the perfusion pressure." |
| 3:35 (16:35) | 17:47 | VF on the ECG | **Defib, pacing & CPR tab: Charge → Shock** (200 J) → **asystole** · **×4** | |
| 4:06 (17:06) | **19:46** | ART 74/38, EtCO₂ 25 | **×1** · **Pulse check** → **VF again** (`ECG VFIB` 19:49) | |
| 4:14 (17:14) | 19:54 | | **Charge → Shock** → organised rhythm, no pulse (sinus 19:59); **keep CPR** | |
| 5:17 (18:17) | **20:58** | **the pulse returns**: ART 76/40 → 113/54, EtCO₂ 27 (63 s after the shock) | **Pulse back: stop CPR** (21:00) · **×4** | |
| 5:35 (18:35) | 22:00 | ART 135/83, HR 72, EtCO₂ 46 | end → straight to HAEM-D | |

**Asystole is the model's** (a seeded slide after the pulse loss): the ECG went flat at 15:27–15:30 in the three runs
and the state and `ECG ASYSTOLE` followed at 15:36–15:38. Press ×1 at the state, not by the clock.

**Say if asked:** the card sets the junctional rhythm and VF; the arrest, the slide to asystole, the perfusion
pressure, each shock's outcome and the pulse coming back are the model. The first shock ends VF in asystole on this
engine's seed every time; that is why VF comes back for a second shock.

**Traps:** no CPR before asystole (CPR on the PEA stops its slide to asystole). Shock only in VF. After the second
shock keep CPR until the pulse returns. During CPR and VF the SpO₂ tile read 99 and the HR ≈ 105–113 (the compressions;
UI review #6, #7, held for the owner): point at the ECG, the arterial line and the capnogram.

*Two-demos talk run `q1-2-haemorrhage-e120-debrief-and-close-chromium` (kit 2ebd743d); A4 haemorrhage (kit 33a6c92b,
both engines); the timing draft.*

<div style="page-break-after: always;"></div>

# HAEM-D · The Debrief (haemorrhage)

**Slot 3:30 (T+18:40 → 22:10) · open it before loading anything else: it reports the current run**

| Slot (T+) | Do |
|---|---|
| 0:00 (18:40) | Session bar **Debrief** |
| 0:15 (18:55) | **Run by**: "Showcase 2, 3 November"; one line in **Notes** |
| 0:30 (19:10) | **Key times**: first team action **32 s** · CPR **4 min 40 s** after the pulse loss (asked ≤ 30 s) · pulse back **9 min 58 s** (asked ≤ 6 min) · pulseless **9 min 58 s** |
| 1:00 (19:40) | the objectives: – recognise PEA · ✗ CPR within 30 s (draft) · ✗ pulse back within 6 min (draft). Both ✗ come from the course itself: the card leaves the PEA untreated |
| 1:30 (20:10) | **Key moments** (19 in the report) · **Timeline** (72 rows) |
| 2:15 (20:55) | **Print or save as PDF**: **8 A4 pages**. **In the print dialog, untick Headers and footers** (Chrome: More settings; Safari: Show Details → Print headers and footers). Then **Print the learner handout** (optional): 1 page |
| 3:00 (21:40) | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

**The objectives are drafts.** The app shows "— draft, owner to confirm" after each timed objective, on the panel, the
report and the print; say "draft" when you read them.

**Expect:** – Not assessable: Recognise PEA from hypovolaemia (the instructor judges it) · ✗ Not observed: CPR 4 min
40 s after the pulse loss (11:00 → 15:39) · ✗ Not observed: the return of circulation 9 min 58 s after the pulse loss
(11:00 → 20:58). Facts: lowest ART M 3 mmHg at 11:14 · pulseless 9 min 58 s · epinephrine 1 mg (1 dose) · lactate
4.7, pH 7.16.

**Traps:** the handout has no take-home lines for this card yet (ruled lines print). Before giving it to the room,
check it lists both shocks and the return of circulation (on kit 2ebd743d it stopped at 12 key moments, at "Pulse
check: VF": UI review #3).

*Two-demos talk run (Debrief read and printed, 8 pages); A4 haemorrhage (8 pages, handout 1 page).*

<div style="page-break-after: always;"></div>

# Not in the 3 November programme

*Kept for the record, unchanged from the 22 October slot (bronchospasm, tamponade and the tamponade Debrief), and the
four cases held in reserve since 17 October. None is part of the 3 November programme. If one is ever used: Load →
All alarms on → speed → Bookmark as always.*

<div style="page-break-after: always;"></div>

# N1 · Severe bronchospasm on the ventilator (22 October slot; not in the 3 November programme)

**Chip "Airway and breathing" · ×4, ×8 · two 2-min fast-forwards · about 1 min 30 s of running · slot 5:00**

States: Severe bronchospasm → Salbutamol given: ventilation recovering

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · ×4 · Bookmark**, THEN top bar **Ventilator** |
| ≈ 1:25 | point | — |
| ≈ 2:00 | | **Instructor → Give salbutamol 250 µg → back to Ventilator** |
| ≈ 4:00 | | **Instructor → 2 min** fast-forward, then **×8**; back to Ventilator |
| ≈ 6:15 | point | **Instructor → 2 min** again (still ×8 after it); back to Ventilator |
| ≈ 8:45 | end | **Instructor → ×1** · talk · **Reload the page** (Cmd-R), then **Sound on** |

**Point at:** before: **VTE 300 mL, peak 35, minute volume 4.2**, "High pressure" banner · after: **VTE 501, minute
volume 7.0**, banner gone, peak 34 → 32.

**Explore line** (optional, 30 s, spoken, no press): *"A real monitor shows a handful of numbers; here the model carries
the whole body behind them, and an instructor can open it while a case runs."*

**Safe:** ×8 and the fast-forward pressed from the Instructor view, cockpit hidden: the cockpit keeps ventilating, the
phones keep their hold.

**Trap:** load first, Ventilator view second. Phones say "The ventilator is on the main screen": expected. Reload
before tamponade.

*Measurements §6, A3.3.*

<div style="page-break-after: always;"></div>

# N2 · Stab wound: tamponade, PEA and pericardiocentesis (22 October slot; not in the 3 November programme)

**×8, ×1, ×4 · no fast-forward · about 3 min 35 s of running · slot 5:30 · fresh (reloaded) page**

States: Arrival → Deteriorating → **PEA** → CPR → CPR: pericardium drained → Return of circulation → Post-ROSC fluid

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · ×8 · Bookmark** |
| 1:00 | **When the cues appear: CVP rising on the IBP2 tile (17), narrow pulse pressure, tachycardia** | **say: "Bedside FAST: pericardial fluid, right-ventricular collapse"** (the card's note on the Scenario tab; the monitor alone cannot diagnose it); name it aloud; **tick *Name the tamponade*** (Scenario tab) |
| 7:00 | | **×1** |
| 7:31 | IBP1 STATIC PRESSURE: trace going flat | hand on the Scenario tab |
| **7:49** | card shows **PEA** | **Start CPR, intubate, FiO₂ 1.0 AT ONCE** (by 7:57) |
| 7:52 | | **×4** |
| 9:00 | | **×1** |
| ◆ **9:21** | 1 min 30 s into CPR | **Pericardiocentesis during CPR** (by 9:51) |
| 9:22 | | **×4** |
| 10:22 | about 70/33: compressions only | **×1** · watch, do NOT stop |
| **10:55** | **systolic jumps to about 100 (compressions alone read about 70/33)** | **Pulse back: stop CPR** (within 30 s) |
| 11:27 | ART about 115/77, HR 64 | **Crystalloid 500 mL** → go to the Debrief |

**Debrief will say:** ✓ Observed name it (ticked: the tile shows your tick time; – Not assessable if not) · ✓ Observed CPR within 10 s (3 s) ·
✓ Observed drainage within 2 min (1 min 30 s) · ✓ Observed stop CPR (2 s) · **◆ Discuss "Better: pericardiocentesis
before the pulse loss"** (the one line to discuss: the lesson, not a timing).

**Traps:** **not at SPO2 NO PULSE** (on this path it never sounds; on a late path it comes at 7:58, already 10 s late).
**About 70/33 is the compressions, not a pulse: stopping there re-arrests him.** Wait for the jump to about 100
(it came 3 s after the model's return: 114/51 on Chromium, 97/49 on WebKit).

*Measurements §5, A3.1.*

<div style="page-break-after: always;"></div>

# N3 · The Debrief moment after the tamponade (22 October slot; not in the 3 November programme)

**Slot 3:30 · before loading anything else**

| Within the slot | Do |
|---|---|
| 0:00 | Session bar **Debrief** |
| 0:15 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** |
| 0:30 | read the **Key times** tiles: your tick · 7 min 51 s to the first team action · CPR 3 s · drainage 1 min 30 s · stop CPR 2 s · pulseless 3 min 07 s; then the objectives |
| 1:00 | ◆ *"Everything was done in time, and the report still marks one line to discuss: the better course was to drain before he lost his pulse. That is the lesson."* |
| 1:20 | **Key moments** (page 2): 7 rows, the numbers of the course strip; SpO₂ "–" while pulseless (07:48 → 10:55) |
| 1:50 | **Timeline**: 41 rows (undone rows struck through) |
| 2:15 | **Print or save as PDF**: **6 A4 pages** (Chrome: footer on every page). **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers).** Then **Print the learner handout** (optional): 1 page, no marks |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

**Expect:** ✓ Observed name the tamponade ("Observed by the instructor at …"; – Not assessable if not ticked) ·
✓ Observed CPR 3 s · ✓ Observed drainage 1 min 30 s · ✓ Observed stop CPR 2 s · **◆ Discuss Better: pericardiocentesis
before the pulse loss — "The pulse loss at 07:48"**.

**Trap:** the Debrief reports the CURRENT run: open it before loading MH.

*Measurements A3.1; run sheet §4.*

<div style="page-break-after: always;"></div>

# R1 · Induction after fentanyl and midazolam

**×4 throughout · about 2 min of running · round-B slot 4:00**

States: Awake → Fentanyl and midazolam given (by itself, 0:10) → Induced → Intubated and ventilated → Ephedrine given

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on (at once) · Bookmark** |
| **1:40** | **RR TOO LOW** | alarm button → **Acknowledge**; tick objective 1 |
| 3:00 | | **Induce now** |
| 3:42 / 4:00 | **CO2 APNEA** (39 s in Chromium, 57 s in WebKit) | **Intubate and ventilate** at once |
| 4:00 / 4:16 | **MAP below 60** | **Ephedrine 10 mg** at once |
| 8:00 | end | |

**Point at:** the RR alarm after the premedication · the pressure falling to **MAP 52** · back to 65 about 110 s after
ephedrine · at 8:00 ART 102/60, HR 61.

**Debrief would say:** – acknowledge (instructor) · ✓ intubate (9 s) · ✓ vasopressor (8 s) · ✓ MAP > 65 (1 min 47–52 s).

**Trap:** do NOT say "stops breathing sooner": the apnoea time differs by browser. The deeper pressure fall is the
contrast. The RR alarm comes back after you acknowledge it: once is enough.

*Measurements §3.*

<div style="page-break-after: always;"></div>

# R2 · Healthy induction, airway not secured

**×8 then ×4 · one 5-min fast-forward · about 1 min 50 s · round-B slot 4:30**

States: Awake → Induced (airway not secured) → **Airway not secured: SpO₂ below 90 %** → Bag-mask → Rescued: intubated

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** · ×8 |
| 3:00 | | **×4** · **Induce now** · tick objective 1 |
| 4:00 | **CO2 APNEA** (52–54 s) | say *"Today nobody secures the airway"* |
| 4:34 | | **5 min** fast-forward |
| **11:26** | state **SpO₂ below 90 %** (monitor still reads 94) | **Bag-mask ventilate, FiO₂ 1.0** at once |
| ≈ 12:15 | about 40 s later | **Intubate and ventilate, FiO₂ 1.0** |

**Point at:** SpO₂ 99 through the gap, 97 at 11:04 · after the bag-mask SpO₂ keeps falling to **87 at 19 s**, then
**95 at 30 s**, 99 at 40 s (the oximeter lags) · EtCO₂ 55 after the tube.

**Debrief would say:** ✗ intubate within 90 s (by design) · ✓ tube EtCO₂ · ✓ ventilate within 60 s of SpO₂ < 90 (9 s).

**Trap:** **do not open the Debrief for this case** (the ✗ is by design of the branch).

*Measurements §3.*

<div style="page-break-after: always;"></div>

# R3 · Anaphylaxis under anaesthesia

**×4 · about 1 min 15 s · round-B slot 3:30**

States: Ventilated, stable → **Anaphylaxis** (by itself at 1:00) → Epinephrine given

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** |
| 1:00 | the reaction starts | — |
| ◆ **2:30** | 1 min 30 s into the reaction | **Give epinephrine 100 µg** |
| ≈ 2:47 | 15 s later | **Drugs & fluids → Crystalloid 500 mL over 10 min → Give** |
| 5:00 | end | |

**Point at:** HR 74 → 116 and systolic 119 → 105 before the drug · systolic back above 110 in **5 s** · HR peak
144–145 · at 4:00 ART 133/96, HR 99.

**Debrief would say:** – recognise (instructor) · ✓ epinephrine within 2 min (1 min 30 s) · ✓ fluid.

**Trap:** **not at 2:00 or later.** At 2:03 the report marks ✗, HR peaks at 171 and **HR TOO HIGH** sounds.

*Measurements §2.*

<div style="page-break-after: always;"></div>

# R4 · Class IV haemorrhage (round B; SUPERSEDED by the HAEM card, E120)

**×8, ×4, ×1 · one 2-min fast-forward · about 3 min + Explore · round-B slot 7:30**

States: Bleeding 2.5 L over 10 min → CPR, 2 L warmed fluid, epinephrine → Return of circulation

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** · ×8 |
| 1:00 | | **Pause → Explore → Set the baseline now → back → Resume** |
| 8:00 | HR 139, ART 74/60 | **Pause → Explore → Changed only** · back · **Resume at ×4** |
| 10:00 | | **×1** |
| 10:05 | IBP1 STATIC PRESSURE | **wait** |
| **10:40** | **SPO2 NO PULSE** | **Start CPR, 2 L and epinephrine**, then **2 min** at once |
| 12:43 | panel clears (still ×1) | **×4** |
| **13:40** | systolic above 90 (pulse back 13:38) | **Pulse back: stop CPR** |

**Point at:** HR > 100 at 4:30, > 120 at 6:05, > 140 at 8:00; systolic < 90 at 6:56 · in Explore: output halved, **SVR
up +659** (right physiology), O₂ delivery halved · the overshoot 203/106 at the stop · 1 min later 135/90, HR 74.

**Debrief would say:** – recognise PEA · ✓ CPR within 30 s (13 s) · ✓ pulse back within 6 min (3 min 09 s).

**Trap:** **no CPR before SPO2 NO PULSE** (both CPR lines turn "not assessable"). Press by 10:58.

*Measurements §4.*
