# Showcase 2: presenter guide (one page, the 30-minute slot)

*Tuesday 3 November 2026 (12 Aban 1405), 30 minutes. Rehearse from [`SHOWCASE-2-RUN-SHEET.md`](SHOWCASE-2-RUN-SHEET.md);
print [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) for the lectern. This page is what to remember. Source keys
are those of the run sheet; Q1-2D = the two-demos talk run (kit 2ebd743d, 24 October), A4 = kit round A4 (24 October,
both engines), UIR = the demo UI review (24 October), E132 = kit round A4 on the cards after the clinical review
(26 October, Chromium, kit e0c73a47), E132 rc.4 = the same after the rebase onto main 25771808 with E131 and E133
(27 October, Chromium, kit 503caeab), REV = that review, E125 = the app's Home, Room and Scenarios pages on main.
**Two live demos (owner, 2026-10-24): MH, then haemorrhage with its Debrief.** Bronchospasm and tamponade are not in the programme.*

## The order (30:00)

Opening on Home and the Room + QR (3:00) · **MH**, early call, E119 card (10:00) · **haemorrhage**, E120 card: PEA →
asystole → CPR → VF → two shocks → ROSC (5:40) · **its Debrief** (3:30) · close and the ask (3:00) · questions (4:20) ·
buffer (0:30). T+: 0:00 · 3:00 · 13:00 · 18:40 · 22:10 · 25:10 · 29:30. Running over: cut questions first, then MH span
3 (and its Pause line), then the MH Debrief glance [DRAFT]. The order of the two demos may still change: each has its
own cue card.

## Ten things to remember

1. **Load → All alarms on → Bookmark → speed, every case.** Press All alarms on after every Load (on kit 2ebd743d the
   alarms stayed on after Load [Q1-2D]; older kits turned them off [MEAS §7]); take the Bookmark AFTER it [A3.2].
2. **Home opens the talk.** **Start here** opens the Room and its QR; the first case is **Scenarios** → **Open the
   library** → **Load** on Demonstration 1 (MH). Phones joined 2.5 s after the QR in the run; up to 60 per session
   [Q1-2D; CR12; E125].
3. **The speed after a fast-forward is the speed before it** (×4 stays ×4). A 5-min span takes 10.5–10.6 s of wall;
   nothing can be pressed while the amber panel shows [Q1-2D].
4. **No reload between the cases**: after MH, Instructor → Scenario → **Choose another scenario** → **Showcase** →
   the haemorrhage → **Load** → **Load scenario** [Q1-2D].
5. **The tight moments** (slow down for them):
   - MH: **call at Early signs (8:14)** (E19a) [E132 rc.4] and **tick *Name malignant hyperthermia*** as you call it;
   - MH: **keep the hyperventilation through span 1**; ventilation back is "not met" before **10:42**; the talk presses
     it at **13:56**, after the first Pause (E22) [E132 rc.4];
   - MH: **at the 19:13 Pause, at once: Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)**: *"The
     EtCO₂ is climbing back at normal ventilation: the MH is not controlled. Second dose, and back to
     hyperventilation."* The button gives the dose and the crisis ventilation together (owner, 28 October); objective 4
     marks a dantrolene dose after ventilation back, untimed, so the Debrief's page 1 keeps every objective [REV #1;
     E132; OWR4];
   - MH: **at the end (24:31) do NOT press ventilation back**: the card is in Recovering and offers it, but EtCO₂ (41)
     has not yet stayed below 40 for 2 min; he stays on 20 × 600 (headless: below 40 from 25:15, the rule met at
     27:15) [OWR4];
   - MH: **no cooling on the early path** (only above 38.5 °C) [REV #4];
   - haemorrhage: **no CPR on the PEA**: wait for the asystole state (15:32–15:37; 15:34 on the rc.4 rebase), then ×1 and **Start CPR** with the
     massive transfusion; CPR on the PEA stops the slide to asystole [Q1-2D; S5; E132];
   - haemorrhage: **shock only in VF**; the **second epinephrine** after the first shock (18:57); after the second
     shock **keep CPR to the 2-min rhythm check** (21:52) even though the pulse returns at 20:57, then **Rhythm check:
     pulse back, stop CPR** [REV #12; E132 rc.4].
6. **Safety lines** [UIR]: never click **Ventilator** during a card (while it is on screen every phone waits; leaving
   it releases them at once [#135; E128]); never reload mid-case (with #132 the case comes back, without it load again
   from 0:00; **Sound on again** either way: click it if it reads Sound off); open the Room (the QR) only from the
   **first instructor tab** (a second tab is a new session); the instructor tab **stays in front** (hidden, it pauses
   the session); print the handout only **after the fast-forward banner has gone**.
7. **"Not available now" → press again**: the button now belongs to the current state [G10 §8].
8. **The haemorrhage Debrief**: open it before loading anything else. Key times 35 s · CPR 4 min 39 s · CPR stopped
   57 s after the return of circulation (asked ≤ 2 min 00 s: owner, 28 October; was 2 min 30 s) · pulseless 9 min 57 s; – ✗ ✓: the ✗ is the course itself (the demo withholds
   CPR on purpose, and the objective now says so); **no "draft" any more** (E132). It prints **9 A4 pages** (8 before
   the E126 pulse-check pause added its alarm rows); the handout 1 page (the compact handout layout tightened for the
   E132 card's 21 moments and three take-home lines).
   **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and
   footers).** [Q1-2D; A4]
9. **Saadat-style monitor, and no style change during the talk** (E20): after a change the AGENTS tile reads "---"
   [MEAS §8; Q1-2D].
10. **Say the known misses yourself**: untreated MH is too slow to kill on this build (no arrest within 51 min of the
    succinylcholine, core 37.3 °C) [`docs/validation/known-misses.md`, S1 untreated, E131]; shock decompensation and reflex
    bradycardia not modelled; during CPR the SpO₂ tile reads 99 and the HR counts the compressions (both blank at the
    paused rhythm checks, E126) [UIR #6, #7]; asystole never regains a pulse in this engine (why the card inserts VF); the post-ROSC patient is too well
    (*"the model recovers faster than a patient would"*); the premedication over-sedates (RR 6); the charcoal filters,
    refrigerated fluid and tranexamic acid are words only (not modelled) [REV #6, #8, #13; E132]; sepsis not built
    [RM; SYN; G11 §5 Q8].

## Numbers to have in your head

| Case | The number |
|---|---|
| MH | Load 0:00 awake on room air; induce 4:00, intubate 5:00, surgery 6:00; EtCO₂ 42 → 44 → **46 at Early signs 8:14** (HR 64 → 79; the temperature does not rise, Tcore 36.4–36.8 °C all case); call 2 s later (the crisis step adds charcoal filters and a propofol infusion); dantrolene 21 s after the call; EtCO₂ < 40 from 8:42; span 1 (Recovering 9:40); ventilation back 13:56 (met from 10:42); EtCO₂ past 45 at 14:10, 14 s later; **second dantrolene with hyperventilation again at the 19:13 Pause** (EtCO₂ 65; 5 min 04 s after it passed 45) [E132 rc.4]; EtCO₂ then 50 a minute later, 44 at +4 min, Recovering 23:38; at the end (24:31) EtCO₂ 41, HR 70, ART 94/57 (67), RR 20: still hyperventilated, ventilation back not yet due (below 40 from 25:15, the rule met 27:15, headless) [OWR4]; Debrief ✓ ✓ ✓ ✓ – ✓; the report 8 A4 pages, the handout 1 [E132 rc.4; OWR4] |
| Haemorrhage | 8:00 HR 139–141, ART 74/60; junctional 9:16 (card); PEA 10:24 (ART 21/14, pseudo-PEA); pulse lost 11:00; idioventricular 12:54; asystole 15:34; CPR + massive transfusion 15:38; epinephrine 15:59; rhythm check 17:38 (compressions pause) → VF → shock 17:46 → asystole; epinephrine 18:57; rhythm check 19:45 → VF → shock 19:53 → organised, no pulse; **pulse back 20:57** (64 s after the shock); rhythm check 21:52 (ART 136/73, EtCO₂ 45) → **stop CPR 21:54**; 22:54 ART 141/93, HR 74, EtCO₂ 54 [E132 rc.4] |
| Debrief (haemorrhage) | 35 s · 4 min 39 s · 57 s · 9 min 57 s; – ✗ ✓; 21 key moments; 100 timeline rows; 9 A4 pages; handout 1 page [E132 rc.4; Debrief e2e] |

## Keys and buttons

| Move | How |
|---|---|
| The first case | **Scenarios** (the rail) → **Open the library** → **Load** on the Demonstration card (opens the Instructor view with the case loaded, on its Scenario tab) [E125; E128] |
| The QR | Home → **Start here** → the **Room** (or **Room** in the rail; the Monitor view's **Phones** opens it too); on a kit without Home (rc.3): Monitor view → pointer to the top edge → **Phones** |
| The next case | Instructor → Scenario → **Choose another scenario** → **Showcase** → **Load** → **Load scenario** |
| Speed | session bar **×1 ×2 ×4 ×8** (Instructor view; no key) [`sessionbar.ts`] |
| Fast-forward | session bar **2 min** / **5 min** (10.5–10.6 s each; one at a time; no Cancel; speed unchanged after it) [Q1-2D; G10] |
| Pause / Resume the clock | session bar **Pause** |
| Bookmark | session bar **Bookmark**, or **Shift+B** on the Instructor panel |
| Limit alarms on | Instructor → **Devices & alarms** → **All alarms on** (after every Load and every reload) |
| Shock | Instructor → **Defib, pacing & CPR** tab → **Charge** (200 J) → **Shock** |
| Silence alarms | **Shift+S** (Instructor panel; not while typing) or Devices & alarms → **Silence** |
| Pause alarms | greyed out on the Saadat-style monitor: "This monitor has no alarm pause. Silence mutes for 120 s." [MEAS §7] |
| NIBP now / all shortcuts | **Shift+N** / **?** [`panel/panel.ts`] |
| Back from full-screen Monitor | **i** key, or top-right **Instructor view** [SC1] |
| Debrief | session bar **Debrief** → **Run by** → **Print or save as PDF** [G13]; **Print the learner handout** (optional) |
| Never during a card | the **Ventilator** tab or tile; Cmd-R; a second instructor tab [UIR] |

## The alarm-pause rule

**A higher-priority alarm ENDS an alarm pause**, as it ends a silence: the owner ruled it on 7 October and it is built
for every skin that has a pause; a new alarm of the same or lower priority waits [R25 D1; F11D G3]. (The draft of this
guide said a pause holds; that was a Stage 10 ruling, since withdrawn [`docs/gates/stage-10.md` §7 item 3; R00
2026-10-12].)

On the **default Saadat-style** monitor there is no pause: the real Saadat's Audio Pause key has no function, so
**Pause alarms** is greyed out with its reason [R00 FX-4 entry; MEAS §7]. **Silence** shows the panel "Sound silenced,
01:57 left", blanks the alarm text on the monitor's alarm bar, and toasts "Alarm sound silenced". It **ends at the next
alarm**: in anaphylaxis, 5.3 s (Chromium) / 4.2 s (WebKit) after the press, when `ART SYS TOO LOW` was raised; the alarm
text came back and the sound was on again [MEAS §7]. In a deteriorating case, Silence lasts seconds, not 120 s.

The Philips-like and Mindray-like monitors have a 120-s pause [R00 FX-4 entry]. During a fast-forward the sound is
muted by design and the alarms that came and went are latched, silent, until acknowledged [G10].

## "Has it been validated?"

Short answer: *"Not yet as a whole. Every number has a cited source or is marked as an engineering estimate, and we
audit our own targets against the literature. That audit was hard on us."* Then the figures, from
`research/30-parts/99-synthesis.md` (the target audit of the 209 rows that were already known misses or in the
calibration queue, not of every test):

- *"Only about one band in five is right as written."* (99-synthesis.md: 46 RIGHT of 209 rows; 81 mis-specified,
  39 too narrow, 39 unsupported, 4 too wide.)
- *"The engine's measured value sits inside the evidence or corrected band in 90 rows, partly in 31 and uncertain in 13.
  In 75 rows it is a real miss."* (99-synthesis.md)
- So: "about one band in five is right against the literature so far" is about our TARGETS; the calibration pass follows
  the rc, on the corrected bands first [R00 2026-10-11 NEXT ACTIONS (3)].
- Showcase 1's figure, an older and different measure (recorded patients, earlier build): 96 of 139 graded rows inside
  the reference band, 27 missed by under 30 %, 16 by more [SC1 handout "How it was checked"].
- Not yet run: the blind realism review and the item-by-item Saadat comparison (both built) [SC1 handout].

If asked about haemorrhage and ATLS: the audit ranks the ATLS heart-rate bands first among the targets most likely
wrong; the model's five measured values fit the registry evidence [SYN (a) item 1]. In the round-A run of the old card
the monitor crossed HR 100, 120 and 140 at 4:30, 6:05 and 8:00 [MEAS §4]; on the E120 card HR read 141 at 8:00
[Q1-2D].

If asked "which version is this?": the pre-release of 1.0. The release label is on Home ("Version
1.0.0-rc.… · pre-release · build …") and the build is printed at the foot of the Debrief report [E125; Q1-2D `q1-0`].
