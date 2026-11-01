# Showcase 2: presenter guide (one page, the 30-minute slot)

*Tuesday 3 November 2026 (12 Aban 1405), 30 minutes. Rehearse from [`SHOWCASE-2-RUN-SHEET.md`](SHOWCASE-2-RUN-SHEET.md);
print [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) for the lectern. This page is what to remember. Source keys
are those of the run sheet; Q1-MH = the new programme's talk run (kit a88f95a7, 29 October, Chromium, 3 phones), SPK =
the speaker's reference (`scratch/owner-review/mh-mechanisms-on-the-demo-build.md`), E132 rc.4 / OWR4 = kit round A4 on
the MH card with the owner's rulings, REV = the clinical review, E125 = the app's Home, Room and Scenarios pages.*

## The programme changed (owner, 29 October)

**One case, malignant hyperthermia (E119 card), with three look-inside stops** in which you explain the physiology the
engine is computing, on the Explore view, with the matching model page open behind it. The haemorrhage case left the
programme; it stays in the build as a reserve (run sheet Appendix B, R5), and its Persian handout is not printed. The
Debrief of the day is the MH Debrief, read on screen.

## The order (30:00)

Opening on Home and the Room + QR (3:00) · MH to the early signs (2:00) · **stop 1** (3:00) · the call, hyperventilation,
dantrolene (2:00) · **stop 2** (3:00) · ventilation back, the climb (2:00) · **stop 3** (3:00) · the end and the MH Debrief
read on screen (4:00) · close and the ask (3:00) · questions (5:00). T+: 0:00 · 3:00 · 5:00 · 8:00 · 10:00 · 13:00 ·
15:00 · 18:00 · 22:00 · 25:00. The machine needs 5:03 of it [Q1-MH]; the rest is yours. **Running over: cut questions
first, then stop 3's paragraph (the two sentences on E134), then the Debrief read.**

## The stop method

1. **Pause on the Instructor view.** Explore has no session bar: you cannot pause or resume from it. The phones read
   "(paused)" within a second and hold the paused monitor; the clock held to the second through every stop [Q1-MH].
2. **Explore physiology** from the rail (the chart icon on the Instructor's strip), then the stop's sections in **Body
   systems**. **"Changed only" off** (it hides dantrolene). Read **Now**; the **Change** column is against the awake
   patient at 01:00, so the anaesthetic shows there too.
3. **The model page behind**: its tab, prepared before the talk (GitHub, loaded while online: the kit does not carry the
   model pages). A short look, then back to the instructor tab. A session you paused stays paused while its tab is
   hidden (`hidden-tab.ts`; not exercised headless).
4. **Instructor → Resume → the next press at once.**

| Stop | Clock | Explore: sections and the numbers on screen [Q1-MH] | Model page |
|---|---|---|---|
| 1 | 8:10 (early signs) | Endocrine: MH activity **0.270**, epinephrine 155, norepinephrine 689 · Blood: VO₂ **332** (+66), Tcore **36.52**, PCO₂ **50.0**, pH 7.32, K⁺ 4.77 | `endocrine-thermal.md`, Equations in words |
| 2 | 13:50 (after fast-forward 1, Recovering) | Drugs: Ce (Dantrolene) **0.892** · Endocrine: MH activity **0.510** · Gas exchange: VA **9.11** L/min (3.7 at 1:00), PaCO₂ 44.2 · Blood: VO₂ 427, K⁺ **4.62**, lactate 1.80, pH 7.36 | `pharmacology.md` (dantrolene row), `blood.md` |
| 3 | 19:11 (after fast-forward 2) | Endocrine: MH activity **0.550** · Drugs: Ce (Dantrolene) **0.999** (at its peak) · Gas exchange: VA **4.41**, PaCO₂ **70.1**; EtCO₂ 64 | `endocrine-thermal.md`, Parameters (DANT_GAIN) |

**Explore cautions:** under Gas exchange, **VCO₂ 216 and VO₂ 270 never move** (not the MH figures): do not point at
them; the MH VO₂ is under Blood. Dantrolene's "drug unit" is reference doses (1 = 2.5 mg/kg); its Total reads "200 mg,
µg" (mg). Blood's Glucose reads "102 mmol/L and mg/dL" (mg/dL). On the endocrine-thermal page, the DANT_GAIN row says
"90 % of its peak within 1 min": stale; the build's dantrolene peaks at 10 min.

## The stage rule: what is and is not in the build

**Never say the simulator does something the kit in the room does not do. Say what is coming and how it is gated**
[SPK]. Every stop's points are in the speaker's reference; a size marked [ENG] is engineered, not sourced: say so if
asked.

- **In the build:** MH starts with the instructor's "condition mh" event at Induce (not the drugs); one MH rate (VO₂ ×
  2.5 at full activity) from which oxygen, CO₂, heat and lactate derive; a 15-min onset ramp [ENG]; dantrolene's only
  action, suppressing the activity toward 1 − 1.6 E [ENG]; hyperventilation clearing CO₂ but doing nothing to MH; the
  MH potassium as one fitted term (2.35 × activity) [ENG]; lactate only from an oxygen deficit.
- **Not in the build** (open branches): muscle lactate with a pH brake and a glycogen store, lactate heat, potassium
  from working and injured muscle, MH severity as an input (PR #154, E134); CO₂ vasodilation and hypercapnic myocardial
  depression (PR #162). No rhabdomyolysis, no hyperthermic VF, no cold-fluid input; the charcoal filters are words.
- **What comes next** is the two sentences at the end of stop 3, verbatim (run sheet §3, stop 3).

## Ten things to remember

1. **Load → All alarms on → Bookmark → ×8.** Take the Bookmark AFTER All alarms on [A3.2].
2. **Home opens the talk.** **Start here** opens the Room and its QR; the case is **Scenarios** → **Open the library** →
   **Load** on Demonstration 1 (MH). Phones joined 2.6 s after the QR [Q1-MH]; up to 60 per session [CR12].
3. **The speed after a fast-forward is the speed before it** (×4 stays ×4). A 5-min span takes 10.1–10.6 s of wall;
   nothing can be pressed while the amber panel shows [Q1-MH].
4. **Pause at the early signs (8:09), not the call.** Stop 1 comes first; the call goes in after Resume (8:12, 3 s after
   Early signs on the clock), with *Name malignant hyperthermia* ticked during the stop [Q1-MH].
5. **The tight moments:**
   - **keep the hyperventilation through fast-forward 1**; ventilation back is "not met" before **10:34**; press it right
     after stop 2 (13:52) (E22) [Q1-MH];
   - **the second dose right after stop 3** (19:13): **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)**
     [REV #1; OWR4];
   - **at the end (24:31) do NOT press ventilation back**: Recovering offers it, but EtCO₂ (41) has not stayed below 40
     for 2 min (headless: met at 27:12) [Q1-MH; SPK §9];
   - **no cooling on the early path** (only above 38.5 °C) [REV #4].
6. **Safety lines** [UIR]: never click **Ventilator** during the case; never reload mid-case (**Sound on again** if it
   happens); open the Room only from the **instructor tab**; the instructor tab **stays in front**, except for a short
   look at a model-page tab with the session **Paused**.
7. **"Not available now" → press again**: the button now belongs to the current state [G10 §8].
8. **The MH Debrief, on screen**: Key times 1 s · 3 s · 21 s; objectives **✓ ✓ ✓ ✓ – ✓**; highest EtCO₂ 64; K⁺ 4.2–5.0;
   no print [Q1-MH].
9. **Saadat-style monitor, and no style change during the talk** (E20): after a change the AGENTS tile reads "---"
   [MEAS §8].
10. **Say the known misses yourself**: untreated, the core rises at the registries' median rate (0.76 °C per 15 min;
    38.5 °C at +46 min, 38.7 °C at 51 min of the succinylcholine; the textbook "1–2 °C every 5 min" comes from swine and
    fulminant cases: research/e131-2-mh-heat-evidence.md), but it does not arrest within 51 min
    [SPK §2; `docs/validation/known-misses.md`]; the MH temperature barely moves on the demo path (Tcore 36.4–36.8);
    dantrolene's 10-min EtCO₂ effect misses its guard (−4.6 against ≤ −5) [SPK §7]; the premedication over-sedates
    (RR 6); the charcoal filters and the refrigerated fluid are words only; sepsis is not built [RM; SYN].

## Numbers to have in your head

| What | The number [Q1-MH] |
|---|---|
| Induction | Load 0:00 awake on room air; premedicate 0:30, preoxygenate 1:00, induce 4:00 (MH starts 4:03), intubate 5:00, surgery 6:00 |
| Early signs | **8:09**: EtCO₂ 42 → 45 → **46** at the same ventilation, HR 64 → **78**, Tcore 36.5; MH activity 0.27 |
| Treatment | call 8:12 (3 s), dantrolene 8:32 (21 s), EtCO₂ < 40 from 8:34; Recovering 9:34; ventilation back 13:52 (met from 10:34) |
| The climb | EtCO₂ past 45 at 14:06; per minute 40, 53, 56, 59, 61, **64** at 19:11; MH activity 0.55, dantrolene at its peak |
| Second dose | 19:13 (5 min 07 s after EtCO₂ passed 45), with 20 × 600 again; EtCO₂ 50, 48, 46, 44, 42; Recovering 23:35 |
| The end | 24:31: EtCO₂ 41, HR 69, ART 94/57 (67), RR 20, still hyperventilated |
| Debrief | ✓ ✓ ✓ ✓ – ✓; K⁺ 5.0 (4.2–5.0), lactate 3.6, pH 7.33 (7.18–7.41), Tcore 36.4–36.8; 14 key moments; 59 timeline rows |

## Keys and buttons

| Move | How |
|---|---|
| The case | **Scenarios** (the rail) → **Open the library** → **Load** on the Demonstration card (opens the Instructor view with the case loaded, on its Scenario tab) [E125; E128] |
| The QR | Home → **Start here** → the **Room** (or **Room** in the rail); on a kit without Home (rc.3): Monitor view → pointer to the top edge → **Phones** |
| Explore | the rail's **Explore physiology** (the chart icon on the Instructor's strip) → **Body systems** list; back with **Instructor** in the rail |
| The model page | its browser tab, right of the instructor tab; back with the instructor tab |
| Speed | session bar **×1 ×2 ×4 ×8** (Instructor view; no key) [`sessionbar.ts`] |
| Fast-forward | session bar **2 min** / **5 min** (10.1–10.6 s each; one at a time; no Cancel; speed unchanged after it) [Q1-MH; G10] |
| Pause / Resume the clock | session bar **Pause** (Instructor view; not on Explore) |
| Bookmark | session bar **Bookmark**, or **Shift+B** on the Instructor panel |
| Limit alarms on | Instructor → **Devices & alarms** → **All alarms on** (after every Load and every reload) |
| Silence alarms | **Shift+S** (Instructor panel; not while typing) or Devices & alarms → **Silence** |
| Pause alarms | greyed out on the Saadat-style monitor: "This monitor has no alarm pause. Silence mutes for 120 s." [MEAS §7] |
| NIBP now / all shortcuts | **Shift+N** / **?** [`panel/panel.ts`] |
| Back from full-screen Monitor | **i** key, or top-right **Instructor view** [SC1] |
| Debrief | session bar **Debrief** (read on screen on the day) |
| Never during the case | the **Ventilator** tab or tile; Cmd-R; a second instructor tab [UIR] |

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

If asked about haemorrhage and ATLS (the haemorrhage card is in the reserve, not the programme): the audit ranks the
ATLS heart-rate bands first among the targets most likely wrong; the model's five measured values fit the registry
evidence [SYN (a) item 1]; on the E120 card HR read 141 at 8:00 [Q1-2D].

If asked "which version is this?": the pre-release of 1.0. The release label is on Home ("Version
1.0.0-rc.… · pre-release · build …") and the build is printed at the foot of the Debrief report [E125; Q1-MH `q1-0`].
