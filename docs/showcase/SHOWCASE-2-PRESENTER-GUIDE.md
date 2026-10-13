# Showcase 2: presenter guide (one page, FINAL)

*22 October 2026. Rehearse from [`SHOWCASE-2-RUN-SHEET.md`](SHOWCASE-2-RUN-SHEET.md); print
[`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) for the lectern. This page is what to remember. Source keys are
those of the run sheet; MEAS = `SHOWCASE-2-MEASUREMENTS.md` (kit round A, 2026-10-13). The owner defaults D1–D6 are
listed at the top of the run sheet; each is marked "owner default — change if he says otherwise" here too.*

## Ten things to remember

1. **Load → All alarms on → speed → Bookmark, every case.** Loading a case turns the limit alarms off, every time
   [MEAS §7]. A page reload loses **All alarms on** AND **Sound on**; it keeps the session code, and the phones stay
   synced [MEAS §7].
2. **QR first.** Phones are synced before case 1; they start silent; up to 60 per session [CR12].
3. **The speed after a fast-forward is the speed before it.** A fast-forward takes 10–11 s of wall; nothing can be
   pressed while the amber panel shows; then set the next speed yourself [MEAS §7; G10].
4. **Load first, then the Ventilator view; reload the page after the bronchospasm case**, then Sound on [RUN4;
   R00 2026-10-04; MEAS §7]. Fast-forward and speed are on the Instructor view's session bar.
5. **Six tight windows** (slow down for them):
   - premed: **Intubate** at `CO2 APNEA` (39 s after Induce on Chromium, 57 s on WebKit) [MEAS §3];
   - anaphylaxis: **epinephrine at 02:30** on the clock, 1:30 into the reaction, not 2:00 (2:03 is ✗ and gives HR 171
     and `HR TOO HIGH`) [MEAS §2] (*owner default — change if he says otherwise*);
   - haemorrhage: **CPR at `SPO2 NO PULSE` (10:40), never before** (an early press makes both CPR lines "not
     assessable") [MEAS §4];
   - tamponade: **CPR the moment the card shows PEA (07:49)**, NOT at `SPO2 NO PULSE` (07:58 is already 10 s after the
     pulse loss) [MEAS §5]; **drainage about 1:30 into CPR** (the rule is 2:00);
   - tamponade: **stop CPR only when the pressure climbs above the compression level**; CPR alone reads **69/32**, and
     stopping on it re-arrests the patient [MEAS §5];
   - MH: **call at Early signs (06:52)**; **ventilation back to 12 × 500 the moment "Recovering" shows (08:35)**, before
     the first fast-forward; **repeat dantrolene** when EtCO₂ is back above 55 (57 at 14:00) [MEAS §0, §1]
     (*owner default — change if he says otherwise*).
6. **"Not available now" → press again**: the button now belongs to the current state [G10 §8].
7. **The one ✗ of the day** is the tamponade's **"Better: pericardiocentesis before the pulse loss"**. Every timed
   objective is met; name the ✗ as the better course of action (drain before the arrest), not a timing [CARD; R00
   2026-10-13] (*owner default — change if he says otherwise*). Never open the plain induction's Debrief: it marks
   "intubate within 90 s" ✗ by design [MEAS §3].
8. **Debrief before loading the next case**: it reports the current run. Print from Chrome if you can (footer on every
   page); Safari puts the footer only at section ends [PRINT].
9. **Saadat-style monitor, and no style change during the talk** (*owner default — change if he says otherwise*): the
   phones' AGENTS tile read "---" for 30 s after a change to Philips-style (FX-9) [MEAS §8].
10. **Say the known misses yourself**: no shock decompensation or reflex bradycardia; no pulsus paradoxus; MH death too
    fast and post-MH hypertension; sepsis not built [RM; SYN; G11 §5 Q8]. In haemorrhage, Explore shows the
    resistance **rising** (SVR +659 at 8:00): that is right, not a miss [MEAS §4].

## Numbers to have in your head

| Case | The number |
|---|---|
| Premed | `RR TOO LOW` at 01:40; MAP nadir 52; MAP back to 65 at 108–112 s after ephedrine [MEAS §3] |
| Plain induction | apnoea 52–54 s after Induce; SpO₂ < 90 state at 11:26 while the monitor reads 94; after the bag-mask nadir 87 at 19 s, 95 at 30 s [MEAS §3] |
| Anaphylaxis | epinephrine 02:30; systolic > 110 in 5 s; HR peak 144–145 [MEAS §2] |
| Bronchospasm | VTE 300 → 501 mL; minute volume 4.2 → 7.0 L/min; the Pmax banner goes out [MEAS §6] |
| Haemorrhage | HR > 100 at 4:30, > 120 at 6:05, > 140 at 8:00; systolic < 90 at 6:56; pulse loss 10:29; ROSC 13:38; overshoot 203/106 at the stop [MEAS §4] |
| Tamponade | CVP on **IBP2** (17); pulse loss 07:48, PEA 07:49; compressions alone 69/32; ROSC about 95–96 s after drainage [MEAS §5] |
| MH | Early signs 06:52; EtCO₂ < 40 at 07:27; Recovering 08:35; EtCO₂ 57 at 14:00, max 61 [MEAS §0, §1] |

## Keys and buttons

| Move | How |
|---|---|
| Speed | session bar **×1 ×2 ×4 ×8** (Instructor view; no key) [`sessionbar.ts`] |
| Fast-forward | session bar **2 min** / **5 min** (10–11 s each; one at a time; no Cancel; speed unchanged after it) [MEAS §7; G10] |
| Pause / Resume the clock | session bar **Pause** |
| Bookmark | session bar **Bookmark**, or **Shift+B** on the Instructor panel |
| Limit alarms on | Instructor → **Devices & alarms** → **All alarms on** (after every Load and every reload) [MEAS §7] |
| Silence alarms | **Shift+S** (Instructor panel; not while typing) or Devices & alarms → **Silence** |
| Pause alarms | greyed out on the Saadat-style monitor: "This monitor has no alarm pause. Silence mutes for 120 s." [MEAS §7] |
| NIBP now / all shortcuts | **Shift+N** / **?** [`panel/panel.ts`] |
| Back from full-screen Monitor | **i** key, or top-right **Instructor view** [SC1] |
| Debrief | session bar **Debrief** → **Run by** → **Print or save as PDF** [G13] |

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

If asked about haemorrhage and ATLS: the audit ranks the ATLS heart-rate bands first among the targets most likely wrong;
the model's five measured values fit the registry evidence [SYN (a) item 1]. On this build the monitor crosses HR 100,
120 and 140 at 4:30, 6:05 and 8:00 [MEAS §4].

If asked "which version is this?": the pre-release of 1.0; the build is printed at the foot of the Debrief report. There
is no version label on the monitor screens yet; it comes with the release stage [MEAS §7; R31 §4].
