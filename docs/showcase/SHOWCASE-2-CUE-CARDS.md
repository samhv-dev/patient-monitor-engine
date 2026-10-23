# Showcase 2: cue cards (28 October 2026, the 30-minute slot)

*One card per page, for the lectern. Print from a Markdown preview at 150 % or more, one card per page (a page break
follows each card). Clock = the session-bar clock (Load = 0:00). Every number is measured: kit round A (13 October)
and kit round A3 (17 October) (`SHOWCASE-2-MEASUREMENTS.md`, section given at the foot of each card). The owner's final
answers of 17 October are marked ◆. The MH press time, **13:03 (as fast-forward 1 ends; any press from 12:41 is met)**,
is the E22 measurement (owner ruling E23: ordering A). **Re-checked on the demo kit** (rc.3 release build fcf99b70,
kit round Q2 on rc.3, 23 October, both engines): every verdict as these cards say; tamponade pulse loss 07:48, CPR
07:51, pericardiocentesis 09:21, ROSC 10:57; MH Early signs 06:51–06:52, call 07:02, press 13:03 (Q2R3). The run sheet
has the full rows and sources. The four dropped cases are at
the end, under "Cases held in reserve".*

<div style="page-break-after: always;"></div>

# Every case

## Load → All alarms on → speed → Bookmark

- **Loading a case turns the limit alarms OFF.** Every time. ◆ Pressing it again is your step.
  Instructor → Devices & alarms → **All alarms on**.
  The top-right button then reads **No alarms**.
- **Bookmark AFTER All alarms on.** Return here then brings the alarms back on.
- **A reload loses All alarms on AND Sound on.** Press both again.
  The session code stays; the phones follow again by themselves.
- **Fast-forward: about 10 seconds.** Press nothing while the amber panel shows.
- **After a fast-forward the speed is what it was** (×8 stays ×8). Press **×1** yourself when you want real time.
- **"Not available now"** → press again.
- ◆ **Saadat-style monitor. Never change the monitor style during the talk.**
- **Silence lasts only until the next alarm.** There is no alarm pause on this monitor.
- Something went wrong → **Restart patient, then Return here** (a page reload loses the bookmarks).
  *Measured on the release build (kit round Q1, FX-12): after this sequence the session bar reads **No scenario**.
  The patient goes back to the bookmark, the case does not: no card buttons, and the Debrief reads "No scenario
  (free run)". After Restart patient the bookmark list was often not on screen at all (3 of 6 tries). So, after
  Restart patient: **load the case again** (Scenario → Load · All alarms on · speed · Bookmark) and run it from 0:00.*
- **Return here: take the LAST bookmark in the list.** The list keeps the bookmarks of the earlier cases of this page,
  named only by their clock ("Bookmark 1 at 00:06" was the tamponade's while MH ran) (Q1).

### ◆ Order (30 min)

| Clock (T+) | Segment | Slot |
|---|---|---|
| 0:00 | Opening + QR | 3:00 |
| 3:00 | **1** Bronchospasm, Ventilator view (+ Explore line) | 5:00 |
| 8:00 | **2** Tamponade → CPR → drainage | 5:30 |
| 13:30 | **3** The Debrief | 3:30 |
| 17:00 | **4** MH, early call | 5:30 |
| 22:30 | Close and the ask | 3:00 |
| 25:30 | Questions | 4:00 |
| 29:30 | buffer | 0:30 |

**Running over? Cut:** questions first · then MH span 3 · then the bronchospasm Explore line.

*Measurements §7, §8, A3.2.*

<div style="page-break-after: always;"></div>

# 1 · Severe bronchospasm on the ventilator

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

# 2 · Stab wound: tamponade, PEA and pericardiocentesis

**×8, ×1, ×4 · no fast-forward · about 3 min 35 s of running · slot 5:30 · fresh (reloaded) page**

States: Arrival → Deteriorating → **PEA** → CPR → CPR: pericardium drained → Return of circulation → Post-ROSC fluid

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · ×8 · Bookmark** |
| 1:00 | **When the cues appear: CVP rising on the IBP2 tile (17), narrow pulse pressure, tachycardia** | name it aloud; **tick *Name the tamponade*** (Scenario tab) |
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

# 3 · The Debrief moment (after the tamponade)

**Slot 3:30 · before loading anything else**

| Within the slot | Do |
|---|---|
| 0:00 | Session bar **Debrief** |
| 0:15 | **Run by**: "Showcase 2, 28 October"; one line in **Notes** |
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

# 4 · Malignant hyperthermia, early call

**×8 then ×4 · three 5-min fast-forwards · about 2 min of running · slot 5:30**

States: Induced → Surgery → **Early signs** → Trigger off (20 × 600) → treatment → **Recovering: EtCO₂ below 45** →
Ventilation back to 12 × 500

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Choose another scenario** (the tamponade is still loaded, so the library is hidden) · **Load · All alarms on · ×8 · Bookmark** |
| 4:00 | | **Start surgery: rocuronium 0.6 mg/kg** |
| 6:30 | | **×4** · watch the CO₂ tile climb |
| ◆ **6:52** | state **Early signs** (EtCO₂ 46) | **tick *Name malignant hyperthermia*** (Scenario tab) as you call it, then **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| ≈ 7:20 | | **Dantrolene 2.5 mg/kg**, then **Cool: 2 L saline** |
| 7:42 | EtCO₂ 38 | **5 min** fast-forward (1). **Hyperventilation stays on** |
| 12:55 | state **Recovering** · EtCO₂ 38 | **Pause** · point · **Resume**. Do NOT press ventilation back yet |
| ◆ **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** | | **EtCO₂ normal: ventilation back to 12 × 500**, not before this time |
| ≈ 13:07 | | **5 min** fast-forward (2) |
| 18:20 | EtCO₂ 45 (peak 55 inside span 2, not visible; ETCO2 TOO HIGH 14:13 shown latched) | **Pause** · say: "EtCO₂ rose to the alarm limit while CO₂ production settled; the alarm caught it; we keep watching" · **Resume** |
| ≈ 18:21 | | **5 min** (3) (cut first in MH if running over) |
| 23:34 | EtCO₂ 42 | end · **Pause** |

**Point at:** EtCO₂ below 40 at 7:27, 26 s after the call · it stays 36–38 while the hyperventilation is kept · after
the press: 38 → 49 at +1 min, peak 55 inside span 2, 45 after it, 42 at the end · the
pressure stays high after the crisis (systolic 136–151: a known miss).

**Debrief would say:** ✓ Observed name MH (ticked at Early signs, ≈ 6:52: the tick time as recorded; – name MH only if not ticked) · ✓ call (9 s) · ✓ dantrolene (21 s) · – repeat (instructor) · – potassium (never above 5.5) ·
ventilation back ✓ (pressed 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)").

**Traps:** ◆ **do NOT press ventilation back at "Recovering"**: early is "not met" under the new rule, and it made the
EtCO₂ rebound to 57–61 with ETCO2 TOO HIGH. **No repeat dantrolene just before the E22 time**: a dose takes the
ventilation-back button off the card for at least a minute. **Repeat dantrolene: – (not needed; do NOT give it on the
ETCO2 TOO HIGH alarm after span 2)**: the presenter line explains the settling production. No potassium
treatment on this path.

*Measurements §0, §1 (early call); E22 (ordering A); Q1 (the release build: the same path and verdicts).*

<div style="page-break-after: always;"></div>

# Cases held in reserve

*Dropped from the 30-minute slot by the owner's answer of 17 October; kept unchanged from kit round B (13 October) in
case the slot grows or a question asks for one. Their slots are the round-B 60-minute figures. Load → All alarms on →
speed → Bookmark as always.*

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

# R4 · Class IV haemorrhage, PEA and resuscitation

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
