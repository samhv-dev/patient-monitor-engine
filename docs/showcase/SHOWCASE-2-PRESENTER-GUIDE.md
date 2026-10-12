# Showcase 2: presenter guide (one page, DRAFT)

*22 October 2026. Rehearse from [`SHOWCASE-2-RUN-SHEET.md`](SHOWCASE-2-RUN-SHEET.md); this page is what to remember.
Source keys are those of the run sheet; numbers without a measurement are marked [to be measured at the kit round].*

## Ten things to remember

1. **Limit alarms ON before the first case**, and again after every reload: Instructor → Devices & alarms → **All alarms
   on**. The factory state sounds only apnoea, low perfusion, static pressure and no-pulse [G11 §4 finding 1; SC1].
2. **QR first.** Phones are synced before case 1; they start silent; up to 60 per session [CR12].
3. **Bookmark right after every Load.** **Return here** on that bookmark is the rescue for any case that goes wrong
   [FU-11 E4].
4. **Load first, then the Ventilator view; reload the page after the bronchospasm case** [RUN4; R00 2026-10-04].
5. **Nothing during the amber panel.** A fast-forward takes about 10 s and refuses commands while it runs; read the
   banner after it [G10 §5–§6].
6. **Five tight windows** (slow down for them):
   premed: intubate at `CO2 APNEA` (60 s of sim = 15 s at ×4) · anaphylaxis: epinephrine about 1:30 into the reaction,
   not 2:00 (the rule is 120 s) · haemorrhage: CPR at `SPO2 NO PULSE` (≈ 10:36), never before, at ×1 · tamponade: CPR at
   `SPO2 NO PULSE` (7:54) at ×1, then the 2-minute fast-forward at once · MH: call the crisis within 60 s of **Early
   signs** [CARD; RS11; DB-T].
7. **"Not available now" → press again.** Without that toast in the build, a press at a state change can vanish: check
   the state strip, press again [G10 §8; PR #51].
8. **The one deliberate miss** is the tamponade's drainage within 120 s of CPR (E17 default, owner may change). The
   "Better: drainage before the pulse loss" line also shows ✗: say it is the other course, not a timing [CARD; DB-T].
9. **Debrief before loading the next case**: it reports the current run. Print from Chrome if you can (footer on every
   page); Safari puts the footer only at section ends [PRINT].
10. **Say the known misses yourself**: resistance falls instead of rising in haemorrhage; no decompensation reflexes; no
    pulsus paradoxus; MH death too fast and post-MH hypertension; sepsis not built [R00 2026-10-06; RM; SYN; G11 §5 Q8].

## Keys and buttons

| Move | How |
|---|---|
| Speed | session bar **×1 ×2 ×4 ×8** (no key) [`sessionbar.ts`, stage-10] |
| Fast-forward | session bar **2 min** / **5 min** (≈ 10 s each; one at a time; no Cancel) [G10; Stage 10 plan D-6] |
| Pause / Resume the clock | session bar **Pause** |
| Bookmark | session bar **Bookmark**, or **Shift+B** on the Instructor panel |
| Silence alarms | **Shift+S** (Instructor panel; not while typing) or Devices & alarms → **Silence** |
| Pause alarms | **Shift+P** or **Pause alarms**: refused on the default Saadat-style monitor (see below) |
| NIBP now / all shortcuts | **Shift+N** / **?** [`panel/panel.ts`] |
| Back from full-screen Monitor | **i** key, or top-right **Instructor view** [SC1] |
| Debrief | session bar **Debrief** → **Run by** → **Print or save as PDF** [G13] |

## The alarm-pause rule

As built for rc.1, an alarm **pause** silences alarms for its whole duration and a new alarm raised during it shows on
screen only, as on Philips monitors; a higher-priority alarm breaking the pause is a v1.0 polish item [G10 §7 ruling 3].
A **silence** is ended by a new higher-priority alarm (FU-11 B4) [F11B Q7]. On the **default Saadat-style** monitor
there is no pause: its skin data has no pause (`"pause": null`) and the engine refuses it ("alarm pause has no function
on …"); its Silence mutes for 120 s with a countdown [SKIN saadat-like; `l3/alarms/manager.ts`]. The Philips-style
monitor pauses for 120 s [SKIN philips-like]. What the Saadat silence shows on screen during the 120 s: [to be measured
at the kit round]. During a fast-forward the sound is muted by design and the alarms that came and went are latched,
silent, until acknowledged [G10; Stage 10 plan D-13].

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
the model's five measured values fit the registry evidence [SYN (a) item 1].
