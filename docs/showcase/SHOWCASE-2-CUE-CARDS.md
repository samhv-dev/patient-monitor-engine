# Showcase 2: cue cards (Tuesday 3 November 2026, 12 Aban 1405, the 30-minute slot)

*One card per page, for the lectern. Print from a Markdown preview at 150 % or more, one card per page (a page break
follows each card). **The programme (owner, 2026-10-24, R4-Q3 FINAL): two live demos, malignant hyperthermia (E119
card), then class IV haemorrhage (E120 card) with its Debrief.** Bronchospasm and tamponade are not in it; their old
cards are at the end, under "Not in the 3 November programme", with the reserve cases. Freeze: Saturday 31 October
12:00. **Both demo cards follow the owner-accepted clinical review (E132, 26 October): new buttons, presenter lines,
objectives and take-home lines; their clocks after the call are from kit round A4 on the new cards.***

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

**Running over? Cut:** questions first · then MH span 3 (end at the 19:58 Pause, after the second dantrolene) · then the
MH Debrief glance.

Measured machine wall (no talk): MH Load → end **2:17** (136.9 s); haemorrhage Load → end **5:08** (307.7 s); the
whole two-demos run, presses only, **8:25** from the opening to the close (two-demos talk run, before E132). On the
cards after the clinical review (E132, kit round A4, Chromium): MH 2:02 (no talk Pauses), haemorrhage **4:34**
(273.6 s; the stretch after the second shock runs at ×4).

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
- **The MH report prints 8 A4 pages** (kit 2ebd743d and the E132 card; A4 on kit 52b0390b printed 7). The
  haemorrhage report prints 8; its learner handout now 2 pages (E132).

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

# MH · Malignant hyperthermia, early call, with the induction (E119; after the clinical review, E132)

**Slot 10:00 (T+3:00 → 13:00) · ×8 then ×4 · three 5-min fast-forwards at ×4 · machine running 2:17**

Talk allowance in the slot: 1:30 framing before Load · 2:00 at each of the two Pauses · 1:00 take-home at the end ·
1:00 Debrief glance.

**To Load:** first case of the page → Start page, **Load** on *Demonstration 1 · Malignant hyperthermia*. After another
case → Instructor → Scenario → **Choose another scenario** → **Showcase** → *Malignant hyperthermia* → **Load** →
**Load scenario**. No reload.

States: **Awake (room air)** → Premedicated → **Preoxygenated** → **Induced** (MH starts) → Intubated → Surgery →
**Early signs** → Trigger off (20 × 600, propofol infusion) → treatment → **Recovering** → Ventilation back to
12 × 500 → second dantrolene

Clocks: the two-demos talk run (before E132) for the induction; after the call, kit round A4 on the E132 card (kit
e0c73a47, Chromium), in brackets where it differs.

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (3:00) | — | the Start page | — | framing, 1:30 |
| 1:30 (4:30) | 0:00 | HR 69, ART 122/80; room air | **Load · All alarms on · Bookmark · ×8** | "Awake on the table, monitoring on, breathing room air." |
| 1:34 (4:34) | 0:30 | | **Premedicate: midazolam 2 mg, fentanyl 100 µg** | |
| 1:38 (4:38) | 1:00 | RR 13, SpO₂ 96 | **Preoxygenate: 100 % O₂ by face mask** | "Oxygen is never implicit: we give it." |
| 2:00 (5:00) | **4:00** | RR down to 6 after the premedication (`RR TOO LOW` 3:09) | **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** | "The jaw is hard to open: masseter rigidity. In practice that means a non-triggering anaesthetic from now on and close watch of the EtCO₂; today the volatile stays to show the crisis. Rigidity plus a rising EtCO₂ makes two signs." |
| 2:08 (5:08) | **5:00** | `CO2 APNEA` 4:56; **SpO₂ 99** | **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** | "SpO₂ 99 through the apnoea: he was preoxygenated." |
| 2:15 (5:15) | **6:00** | EtCO₂ 42, HR 72 | **Start surgery: rocuronium 0.6 mg/kg** (state 6:03) | "The premedication and the apnoea raised his CO₂ stores; on the ventilator the EtCO₂ should now fall." |
| 2:26 (5:26) | 7:30 | **EtCO₂ 44**, HR 76 | **×4** | "Same ventilation. Watch the CO₂ tile." |
| 2:41 (5:41) | **8:32** (E132 8:38) | state **Early signs**: **EtCO₂ 46**, **HR 79–80**; temperature not moved | tick *Name malignant hyperthermia* (Scenario tab) · **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** | *"The EtCO₂ is rising at unchanged ventilation when it should be falling, with a rising heart rate: think of MH early."* Then: "Sevoflurane off, charcoal filters on, a propofol infusion so he stays asleep, 100 % oxygen at high flow, double the ventilation." |
| 2:49 (5:49) | ≈ 9:03 | EtCO₂ below 40 from **9:05** | **Dantrolene 2.5 mg/kg** | "In real life dantrolene takes extra hands and minutes: 200 mg is ten vials to mix." **No cooling: only above 38.5 °C** (do not press Cool) |
| 2:54 (5:54) | 9:22 (E132 9:04) | | **5 min** fast-forward (1), 10.5 s. **Hyperventilation stays on** | |
| 3:05 (6:05) | ≈ 14:33 | state **Recovering** (from 10:04–10:15, inside the span) · **EtCO₂ 35**, HR 76–80 | **Pause** · 2:00 talk · **Resume** | the early call |
| 5:06 (8:06) | 14:41 | EtCO₂ 35–36 | **EtCO₂ normal: ventilation back to 12 × 500** · **5 min** (2) | "EtCO₂ has stayed below 40 for 2 minutes: ventilation back." |
| 5:17 (8:17) | ≈ 19:58 | **EtCO₂ 53–54**; banner: `ETCO2 TOO HIGH` (E132 17:48) inside span 2; EtCO₂ past 45 about a minute after ventilation back | **Pause** · **Dantrolene 2.5 mg/kg** at once · 2:00 · **Resume** | *"The EtCO₂ is climbing back at normal ventilation: the MH is not controlled. Second dose."* |
| 7:18 (10:18) | ≈ 20:03 | | **5 min** (3) (the first case item to cut) | |
| 7:29 (10:29) | 25:12 | E132 (24:53): EtCO₂ 55, HR 80, ART 96/62; Tcore 37.8 °C | end · **Pause** · take-home 1:00 | the four take-home lines (below) |
| 8:30 (11:30) | | | session bar **Debrief**: glance ✓ ✓ ✓ ✓ – ✓ · 1:00 | read the marks, not the tiles |
| 9:30 (12:30) | | | back to **Instructor** · **Resume** | |
| 10:00 (13:00) | | | → the next card's "To Load" | |

**Take-home lines (owner-agreed 26 October, verbatim):** *"A rising EtCO₂ at the same ventilation with a rising heart
rate: think of MH early."* · *"Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg."* ·
*"Keep hyperventilating until the EtCO₂ stays down; if it climbs again, repeat dantrolene."* · *"After the crisis: ICU
24–48 h, dantrolene 1 mg/kg every 4–6 h for 24 h (recrudescence in up to 50 %), then referral for testing and family
counselling."*

**What the monitor shows, in order:** the CO₂ tile rises at unchanged ventilation (42 at 6:00 → 44 at 7:30 → 46 at the
early signs; without MH it settles at 36–39) while the HR rises only a little (64 → 80: the fentanyl blunts it); the
temperature hardly moves on this early path (≤ 37.8 °C over the whole case), so do not wait for it · EtCO₂ below 40
within a minute of the call · after ventilation back the CO₂ climbs past 45 within a minute: the MH is not controlled
→ second dose. After it the EtCO₂ stops climbing but stays ≈ 55 at normal ventilation to the end of the case (E132).

**If asked about the end:** "In practice I would also go back to hyperventilation until the EtCO₂ stays down." (The
card has no step for it after ventilation back: open for the owner.)

**Debrief glance (marks, E132):** ✓ name MH (ticked at the call) · ✓ call (2 s) · ✓ dantrolene (21 s) · ✓ second dose
(a dose after ventilation back; untimed) · – potassium (never above 5.5) · ✓ ventilation back (after
EtCO₂ < 40 for 2 min, 09:05 → 11:05). Read the objectives: the Recognition tile counted from Load on kit 2ebd743d (UI
review #18). The report prints 8 A4 pages on the E132 kit.

**Traps:** do NOT press ventilation back before **11:05** (it is offered from Recovering, but EtCO₂ has not yet stayed
below 40 for 2 min: "not met"); the talk presses it after the first Pause (14:41). No repeat dantrolene just before it
(a dose takes the button off for at least a minute). The second dose at the 19:58 Pause, not later: on the talk's
clock it lands ≈ 4 min 20 s after the EtCO₂ passed 45. No cooling and no potassium on
this path. Skip Preoxygenate and SpO₂ falls to ≈ 63 % before the tube: if you skip it, say why. The charcoal filters
are words only (not modelled); the cooling saline would be given at 21 °C (no cold-fluid input).

*Two-demos talk run `q1-1-malignant-hyperthermia-early-call-14-41-chromium` (kit 2ebd743d, before E132); kit round A4
on the E132 card (kit e0c73a47, Chromium, `scratch/kitround-e132/`); the timing draft. E131 (one MH metabolic rate)
will move the course after the call: the Thursday prep run re-measures it.*

<div style="page-break-after: always;"></div>

# HAEM · Class IV haemorrhage: PEA, asystole, VF, two shocks, ROSC (E120; after the clinical review, E132)

**Slot 5:40 (T+13:00 → 18:40) · ×8, ×4, ×1 · no fast-forward · machine running 4:34 (E132) · its Debrief follows (HAEM-D)**

Talk allowance: 0:30 framing before Load; the rest is said over the running case (the ×1 stretches: asystole → CPR,
the rhythm checks, the return of circulation).

**To Load:** after another case → Instructor → Scenario → **Choose another scenario** → **Showcase** → *Class IV
haemorrhage, PEA and resuscitation* → **Load** → **Load scenario**. First case of the page → Start page, **Load** on
*Demonstration 2*. No reload after MH.

States: Bleeding on room air → (Oxygen by mask) → **Intubated and ventilated** → **Junctional 50/min** (card) → **PEA**
→ **Asystole** → CPR → source control, massive transfusion, TXA · epinephrine → **Rhythm check: VF** (card) → shock →
epinephrine → **Rhythm check: VF again** (card) → shock → CPR to the 2-min rhythm check → **pulse back, stop CPR**

Clocks: kit round A4 on the E132 card (kit e0c73a47, Chromium); the two-demos talk run (before E132) in brackets where
it differs by more than 3 s.

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (13:00) | — | | (To Load) | framing, 0:30: "Bleeding 2.5 litres over 10 minutes; the bleed stops there: that is the surgeon's source control." |
| 0:30 (13:30) | 0:00 | HR 71, ART 123/81, SpO₂ 96 on room air | **Load · All alarms on · Bookmark · ×8** | "Bleeding 2.5 litres over 10 minutes, breathing room air." |
| 0:33 (13:33) | 0:30 | room air | **Oxygen by face mask, FiO₂ 1.0** (state 0:34) | |
| 0:37 (13:37) | 1:00 | | **Intubate and ventilate, FiO₂ 1.0** (state 1:06) | "Say we are in the OR or the ED, and we induce with a reduced-dose ketamine RSI; the button does not give the drug. Positive pressure cuts the venous return of an empty patient: that, not the bleed alone, tips him into arrest." |
| 1:29 (14:29) | 8:00 | **HR 139–141**, **ART 75/61**, EtCO₂ 25 | — | "The pressure held and only the heart rate told you; now the pulse pressure narrows." |
| 1:38 (14:38) | **9:17** | ECG: **junctional 50/min** (the card sets it); ART 57/46 | **×4** | "The card sets this rhythm; what follows is the model." |
| 1:56 (14:56) | 10:28 | state **PEA**: **ART 19/13**, the ECG still running | — | "Electrical activity, a pressure too low to feel: pseudo-PEA. With a palpated pulse you would call it PEA." |
| 2:04 (15:04) | **11:00** | pulse lost: the arterial number goes mean only; `SPO2 NO PULSE` 11:10 | **×8** · **no CPR** | "Now we do what nobody should: wait, so you can see a pulseless heart decay." |
| — | 12:56 | ECG idioventricular | — | |
| 2:39 (15:39) | **15:36** | state **Asystole**: the ECG flat (from 15:29), `ECG ASYSTOLE` 15:38 | **×1** | |
| 2:42 (15:42) | 15:39 | compressions on the ECG and the arterial trace | **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** · **Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g** | "In haemorrhagic arrest the surgeon stops the bleeding and we give blood; compressions cannot fill an empty heart." |
| 3:02 (16:02) | 15:59 | ART 35/12, EtCO₂ 5 | **Epinephrine 1 mg** · **×4** | |
| — | 16:40 | ART 63/27, EtCO₂ 14 | — | "EtCO₂ and the diastolic pressure tell you how good the CPR is." |
| 3:28 (16:28) | **17:38** | 2 min of CPR: **ART 74/37, EtCO₂ 20** | **×1** · **Rhythm check** → **VF** (`ECG VFIB` 17:41) | "The card inserts VF to show the defibrillator." |
| 3:35 (16:35) | 17:47 | VF on the ECG | **Defib, pacing & CPR tab: Charge → Shock** (200 J) → **asystole** · **×4** | "Charge during compressions; the pause for the shock under 5 seconds. The shock did stop the VF; no organised rhythm followed." |
| ≈ 3:45 (≈ 16:45) | **18:57** | ART 74/37, EtCO₂ 23 | **Epinephrine 1 mg** (the second dose, 3 min after the first) | "Epinephrine every 3 to 5 minutes." |
| 4:06 (17:06) | **19:46** | ART 73/37, EtCO₂ 24 | **×1** · **Rhythm check** → **VF again** (`ECG VFIB` 19:49) | "Recurrent VF: consider a higher energy." |
| 4:14 (17:14) | 19:54 | | **Charge → Shock** → organised rhythm, no pulse (sinus 19:59); **keep CPR** · **×4** | |
| ≈ 4:30 (≈ 17:30) | **20:58** | **the pulse returns** (the model, 64 s after the shock): the arterial line rises between compressions, EtCO₂ climbs | **keep CPR** to the rhythm check | |
| ≈ 4:50 (≈ 17:50) | **21:53** | the 2-min rhythm check: organised rhythm, **ART 128/78, EtCO₂ 46** | **×1** · **Rhythm check: pulse back, stop CPR** (21:56) · **×4** | "The pulse came back because the volume brought the perfusion pressure up, not because of the shock. We see it on the arterial line and the capnogram." |
| ≈ 5:05 (≈ 18:05) | 22:56 | ART 141/93, HR 73, EtCO₂ 55 | end → straight to HAEM-D | "The model recovers faster than a patient would; expect a fragile, tachycardic, vasopressor-dependent patient." |

**Asystole is the model's** (a seeded slide after the pulse loss): the ECG went flat at 15:27–15:30 in every run and
the state and `ECG ASYSTOLE` followed at 15:34–15:38. Press ×1 at the state, not by the clock.

**Say if asked:** the card sets the junctional rhythm and VF; the arrest, the slide to asystole, the perfusion
pressure, each shock's outcome and the pulse coming back are the model. The first shock ends VF in asystole on this
engine's seed every time, and this engine cannot regain a pulse from asystole (real asystole sometimes does): that is
why VF comes back for a second shock. The resuscitation step tells the engine: bleeding stopped, 1 L crystalloid, 1.2 L
blood (red cells and plasma as the engine's whole blood), TXA 1 g (logged; no coagulation model).

**Traps:** no CPR before asystole (CPR on the PEA stops its slide to asystole). Shock only in VF. The second
epinephrine after the first shock, before the second rhythm check. After the second shock keep CPR to the 2-min
rhythm check even when the arterial line shows the return. During CPR and VF the SpO₂ tile read 99 and the HR
≈ 100–136 (the compressions; UI review #6, #7): point at the ECG, the arterial line and the capnogram.

*Kit round A4 on the E132 card (kit e0c73a47, Chromium, `scratch/kitround-e132/`); two-demos talk run
`q1-2-haemorrhage-e120-debrief-and-close-chromium` (kit 2ebd743d, before E132); the timing draft.*

<div style="page-break-after: always;"></div>

# HAEM-D · The Debrief (haemorrhage)

**Slot 3:30 (T+18:40 → 22:10) · open it before loading anything else: it reports the current run**

| Slot (T+) | Do |
|---|---|
| 0:00 (18:40) | Session bar **Debrief** |
| 0:15 (18:55) | **Run by**: "Showcase 2, 3 November"; one line in **Notes** |
| 0:30 (19:10) | **Key times**: first team action **35 s** · CPR **4 min 40 s** after the pulse loss (asked ≤ 30 s) · CPR stopped **58 s** after the return of circulation (asked ≤ 2 min 30 s) · pulseless **9 min 58 s** |
| 1:00 (19:40) | the objectives: – recognise PEA (name the pseudo-PEA at 19/13) · ✗ CPR within 30 s: withheld on purpose, as the objective says · ✓ the return of circulation recognised at the rhythm check |
| 1:30 (20:10) | **Key moments** (21 in the report) · **Timeline** (79 rows) |
| 2:15 (20:55) | **Print or save as PDF**: **8 A4 pages**. **In the print dialog, untick Headers and footers** (Chrome: More settings; Safari: Show Details → Print headers and footers). Then **Print the learner handout** (optional): **2 pages** on the E132 card |
| 3:00 (21:40) | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

**The objectives are final** (E132): no "draft" on the panel, the report or the print.

**Expect** (kit round A4, E132): – Not assessable: Recognise PEA from hypovolaemia (the instructor judges it) · ✗ Not
observed: CPR 4 min 40 s after the pulse loss (11:00 → 15:40) · ✓ Observed: CPR stopped 58 s after the return of
circulation (20:58 → 21:56). Facts: lowest ART M 3 mmHg at 11:13 · pulseless 9 min 58 s · epinephrine 2 mg (2 doses) ·
lactate 4.9, pH 7.18.

**Take-home lines (owner-agreed 26 October, printed on the handout):** *"Positive pressure and induction can tip a
compensated bleeding patient into arrest."* · *"In haemorrhagic arrest, stopping the bleeding and giving blood come
first; compressions cannot fill an empty heart."* · *"EtCO₂ and the arterial diastolic pressure show how good the CPR
is, and they show the return of circulation."*

**Traps:** the learner handout now runs to **2 pages** (the third take-home line and the closing sentence spill over).
Before giving it to the room, check it lists both shocks and the return of circulation.

*Kit round A4 on the E132 card (Debrief read and printed: report 8 pages, handout 2 pages).*

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

**Safe:** ×8 and the fast-forward pressed from the Instructor view, cockpit hidden: the cockpit keeps ventilating; the
phones stop holding while the Ventilator view is off screen (approximate, a fresh start every few seconds) and hold
again when you go back to it.

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
