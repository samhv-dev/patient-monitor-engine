# A second ventilator face: the EDP-TS face — Implementation Plan

**STATUS: READY TO BUILD (version 1) — the owner's ten rulings folded in (10 November 2026).** Written 10 November
2026 by a planning executor from brief 141 of the post-demo set; the owner ruled VQ1–VQ10 the same day (now §8
"Decisions", each with the question and options kept for the record), and his rulings are applied in the sections
they touch. The face is named after the device, **EDP-TS** (VQ1). The work is split into **version 1** (the working
ventilator with all its modes, then EDP-TS becomes the default face) and **version 2** (the start-up sequence, tube
compensation, capnography) (§7.2). What still waits: the owner's detailed video of the device being operated and his
recordings of its alarm sounds (§7.3); until the video, the manual decides every point it covers (VQ7). Nothing is
built: this pull request adds this page, four static mock-ups in `docs/plans/vent-skin-edp-ts/mockup/`, two roadmap
rows and the README's affiliation sentence (§5), and changes no product code, test, card, kit or data file.

**Base and inputs.**
- Base: `origin/main` **c13cb826** (Merge PR #391), read in the worktree `scratch/wt-plan-vent-skin` (branch
  `plan-vent-skin-edp-ts`). Every `file:line` below is on c13cb826 and is a starting point only: an executor finds the
  code by the function name given, because lines move.
- The owner's request of 10 November: "I want you to build a new skin for the ventilator: it is based on the EDP-TS".
  His sources, in `assets/ventilators/edp-ts/` (git-ignored; **nothing from that folder enters the repository**: no
  photograph, no video frame, no manual page, no manual text beyond the device's own on-screen words and numbers):
  five photographs of the screen in use (IMG_1542, IMG_1544–IMG_1547, taken 6 November 2026 at 12:07–12:08 by the
  device's own clock), a 119 s video (IMG_1543.MOV) and the 130-page Persian user manual (document code WPM2-5, summer
  1397 edition, i.e. 2018; the PDF's own page numbers are used below, "p. N", and they equal the printed "Page N of 130").
- Read: the ventilator package (`packages/ventilator/src/`), today's only face (`apps/demo/src/vent/hamilton-ui.ts`,
  `hamilton-page.ts`, `embed.ts`, `device-link.ts`, `apps/demo/vent-hamilton.html`), the Ventilator view and its
  hand-over (`apps/demo/src/app/views/vent.ts`), the monitor's skin mechanism and its provenance rule
  (`packages/skins/src/provenance.ts`, `packages/skins/test/provenance.test.ts`), `docs/plans/room-and-instruments.md`
  (R5b, R8a–R8d), `docs/plans/pump-rack-tci.md` (SK1, SK2, PQ2), `docs/plans/scenario-builder.md` (house style),
  the README's affiliation line and NOTICES.md (N-060, N-061).
- The rules over every number: mechanisms first, sources set the numbers (owner, 7 November;
  `scratch/briefs/post-demo/00-common-rules.md`). A device number no source gives is a **named gap**, never invented.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR. Tests first in every code piece: the failing test is committed before the code.

---

## 1. Intent

**In the owner's terms.** His residents stand in front of an EDP-TS every day. The simulator's ventilator has one face,
a Hamilton-style cockpit, so a resident trained on it must translate every control, every word and every place on the
screen when facing the department's machine. He wants the simulator's ventilator to look and operate like the EDP-TS:
the same screen regions, the same words, the same keys and knob, the same way of choosing a mode and changing a
setting, the same alarms in the same places.

**Goals.**
1. A second face for the ONE simulated ventilator: the same `@pme/ventilator` model, the same link to the patient, the
   same hand-over rules; a different front panel.
2. Everything the face shows is either honoured by the model or visibly unavailable with its reason (§3).
3. The Hamilton-style face keeps doing everything it does today, test by test (§4.4).
4. The face is chosen per room (Room setup) and per page (an address parameter), and works in every place the cockpit
   runs today: the Ventilator view, a laptop window, the ventilator device page over the relay (R8d), the file:// embed.
5. The device's modes the model lacks are built as ventilator mechanics, one PR each, from the manual and the literature,
   so that over the pieces the face gains them (§7).

**Non-goals.**
- The paediatric and neonatal groups, for now (VQ3 = A: "A for now, pediatrics and neonates when the physiology are
  added later"). PED and NEO are shown unavailable with the reason; the manual's neonatal group (NEO, TCPL modes,
  proximal flow sensor) is also an optional add-on of the device (p. 3, p. 118 footnote). A roadmap row waits for the
  engine's paediatric and neonatal physiology.
- The device's service functions: calibration of the touch screen, software version, service hours, RS-232 export,
  the "Visual Net" PC software (p. 58, p. 61, p. 89).
- Gas supply, power and hardware faults as simulated physics (wall pressure, battery, fan). They can come later as
  instructor-raised events; this plan lists them as not offered (§3.4).
- A second ventilator, a second link, or a second page of mechanics.

**Anti-goals.**
- **A1. A control that does nothing.** A resident must never turn the knob on a setting the model ignores while the
  screen pretends it took effect. Every setting on the face writes a model key or calls a cockpit action that a test
  proves changes the delivered breath or the alarm; every other control is present-and-unavailable (greyed, dashed,
  a reason under it) or absent (§3, mock-ups m2–m4).
- **A2. A number the model does not compute.** A monitored value the model does not produce shows `---` (the device's
  own sign for "not active in this mode", p. 47), never a plausible constant.
- **A3. Artwork.** The face is named after the device at the owner's ruling (VQ1), but no logo, no maker's mark and no
  copied artwork is drawn; colours and shapes come from plain shapes and measured tokens, with a provenance entry
  each (§5).
- **A4. A manual copied.** Help texts and reasons are the project's own words; only the device's on-screen words and
  numbers are carried over, each cited.

---

## 2. The device as documented

**How each fact is marked.** **[M p. N]** read in the manual on PDF page N (the text layer; tables and screen figures
read from the page image at 80–160 dpi); **[P IMG_15xx]** seen in a photograph; **[V m:ss]** seen in the video;
**[I]** my inference. Where the manual and the photographs differ, both are given (§2.14).

### 2.1 What the video shows, and what it does not

The video (1920×1080, 118.7 s) was read as contact sheets at one frame a second, 480 px wide, in three 40 s sections,
and three single frames at 1 280 px (0:03, 1:02, 1:52). **It shows the running screen, not its operation:** in no
frame is a window open, a key selected (blue) or the knob turned. The patient is in SIMV(VCV)+PSV throughout, with the
settings of the photographs (VT 0.500 L, Ti 1.40 s, f 12 bpm, PSV 8, Exp. Sensitiv. 25 %, PEEP 5, Sens 3.0 L/min,
Oxygen 40 %). What it adds to the photographs:
- The left column's lung icon comes and goes with the patient's efforts [V 0:06–0:40] (the manual: lit while the patient
  makes an effort, p. 16).
- **Both alarm lamps lit with no alarm message on the screen** [V 0:03, 1:02, 1:52]: the High lamp red-orange, the
  Med/Low lamp amber. This is the manual's latched ("remaining") signal: a lamp stays lit, steady, after its cause has
  gone, until Esc is pressed [M p. 91, Table 9-4] [I: that this is what the video shows].
- Paw dips below zero with the patient's efforts (the Paw scale runs from −7) [V 0:03, 1:02].
- From about 0:51 to 1:17 the measured PEEP reads 0.0 and VT 0.000 L while Peak reads 31 [V 0:51–1:17]; I read this
  as the circuit opened at the patient (suction or a disconnection) [I]; no message box is legible at this resolution.
- The loops draw the current breath only, phase-coloured [V 1:52].
- Some top-row values are dimmed at times (Te at 0:03, I:E at 12:07 in IMG_1542) [V 0:03] [P IMG_1542]; the manual does
  not say why [I: a value of a breath not yet complete].

So the sequence of screens a key opens, and what the knob does in each, comes from the manual and the two photographs
with a window open (IMG_1544, IMG_1545: Operative Modes; IMG_1547: Menu). A second video of the Mode, Menu and Alarm
Limits keys and of a setting changed with the knob would close this (risk R7, §8).

### 2.2 The screen, region by region

A 12.1-inch colour TFT, 800×600, resistive touch [M p. 117, Table 13-3] (p. 13 says 12 inch). Regions, as the
photographs show them [P IMG_1542, IMG_1546] and the manual names them [M p. 13–17]:

| Region | What it holds | Source |
|---|---|---|
| Top-left block | patient category ("ADL"), mode name ("SIMV(VCV)+PSV"), backup state ("Backup: OFF"), date and time | [P IMG_1542] [M p. 14] |
| Top row, eight cells | monitored values: Peak Flow (L/min), Ti (s), Te (s), I:E ("Current"), fTotal (bpm), VT (L), V̇E (L/min), Oxygen (%) | [P IMG_1542] [M p. 15] |
| Under four cells | yellow alarm-limit tags, touch keys: fTotal (max only, "30"), VT ("0.750 / 0.250"), V̇E ("8.50 / 2.41"), Oxygen ("50 / 30") | [P IMG_1542] [M p. 14] |
| Message bar | light blue; four status icons (the first lit) and the text "Volume compensation" | [P IMG_1542] [M p. 53: an icon shows volume compensation is on] |
| Left column | battery (green), lung icon, Peak with "Trach." under it, Plateau, Mean, PEEP, a yellow tag "20.0" (High PEEP limit), "Pressure Limits" with two yellow touch keys "40" (max) and "5" (min) | [P IMG_1542] [M p. 15–17] |
| Centre | three scalars, left to right sweep over 12 s: Paw (cmH2O, −7 to 35), VT (L, −0.2 to 1.0), V̇ (L/min, −60 to 60); inspiration green, expiration red; light-blue axis strips | [P IMG_1542] [V 1:02] |
| Right of centre | two loops: VT against Paw, V̇ against VT | [P IMG_1542] [M p. 64: the default "5 curves" screen] |
| Right column | seven touch keys: Graphics, Freeze, Respiratory mechanics, Save loop, Nebulizer, Help (?), Standby | [P IMG_1542] [M p. 15, p. 130] |
| Bottom row | the set parameters of the mode, as touch keys: VT, Ti, I:E, f, PSV, Exp. Sensitiv., PEEP, Sens, Oxygen, Rise Time, Flow Waveform | [P IMG_1542] [M p. 13] |
| Alarm messages | a red or yellow box on the right of the screen naming the active alarm (the colour is its priority) | [M p. 17, Figure 3-5] |

### 2.3 Hardware: keys, knob, lamps

| Element | What it does | Source |
|---|---|---|
| Lamps "Alarm Signals": Vent Inop (top), High (red), Med/Low (yellow) | Vent Inop: the device cannot run (highest priority); High: high-priority alarms, red, fast flash; Med/Low: yellow, slow flash for medium, steady for low | [P IMG_1542] [M p. 18, p. 90 Tables 9-1, 9-2] |
| A light on the top of the cabinet | lit with the alarm signals, red or yellow; NOT latched | [M p. 23, p. 90–91] |
| Alarm Limits | opens the Alarm settings window | [M p. 18, p. 37] |
| Silence (bell, "30-60 s") | once: audio paused 30 s; twice: 60 s | [M p. 18, p. 92] |
| Menu | opens the main menu; twice: Ventilatory adjuncts; three times: Tools; four times: back to the main menu | [M p. 18, p. 50, p. 56] |
| Mode | opens the Operative Modes window | [M p. 18, p. 33] |
| Lock (padlock, under the screen) | held 2 s: locks the touch screen and the right-hand keys; the bottom keys and the knob stay live; an alarm unlocks it | [M p. 18, p. 41] |
| Suction %O2 | the suction sequence (§2.11), started after a knob press to confirm | [M p. 19, p. 39] |
| Manual Insp. | one breath with the mode's settings; with Ctrl: a deep breath | [M p. 19, p. 40] |
| Insp/Exp Pause | holds at end-inspiration (at most 7 s) or end-expiration (at most 20 s), in VCV and PCV only; the hold lasts while the key is held | [M p. 19, p. 40] |
| Ctrl | combinations: +Alarm Limits = alarm test, or the help text of the active alarm; +Oxygen = steps of 10; +Ctrl = reset all sensors; +Manual Insp. = deep breath; +Graphics = refresh, or clear the saved curve | [M p. 19] |
| Esc | resets the alarm lamps of alarms that have ended; cancels the operation; closes the window or menu | [M p. 19] |
| Knob (with a lit ring) | moves through menus and values, changes curve scales, moves cursors; pressed: confirms | [M p. 19] [P IMG_1544: blue ring lit] |
| Mains / battery lamps (bottom left) | green: mains; blue: on battery; both green: mains, charging | [M p. 20, Table 3-1] [P IMG_1542: "VAC", "Battery/Charge"] |

### 2.4 How a setting is changed, and how a mode is chosen

- **A setting** [M p. 35]: touch its key (it turns blue [P IMG_1546: Exp. Sensitiv. selected]); turn the knob; press
  the knob to apply. A selection with no change for 15 s is dropped; a change not confirmed within 15 s returns to the
  old value. With Ctrl held first, some settings step in larger or smaller increments [M p. 121 note 1]; Ctrl+Oxygen
  steps by 10 [M p. 19]. Sens touched twice switches between flow (L/min) and pressure (cmH2O) triggering [M p. 42].
- **A mode** [M p. 33–34]: Mode opens "Operative Modes" [P IMG_1544]: VCV, PCV, PSV/CPAP, SIMV(PCV)+PSV, SIMV(VCV)+PSV,
  Noninvasive (NIV), "Other Operative modes ▸"; the last opens MMV+PSV, PSV+VT Assured, APRV, PRVC [P IMG_1545]. Footer:
  "Press [Knob] Select - [Esc] Exit". Choosing opens a confirmation window ("Mode VCV", "Press control knob to start",
  "Press Esc to exit") [M p. 34, Figure 5-2]. Settings may be changed before the knob press; the mode can be changed
  while ventilating. A spontaneous mode used for the first time needs its backup set first (Menu → Backup ventilation,
  Accept) [M p. 35–36].
- **Standby** [M p. 37]: the right-column key, confirmed with the knob; Esc leaves standby and ventilation resumes with
  the previous settings; it does not act while a window is open.

### 2.5 Patient category and start-up

The category (ADL or PED; NEO only on a device fitted with it) is chosen at start-up and only then; changing it means
switching off [M p. 24–25]. After it, the VT window: IBW and mL/kg (default 6 mL/kg, remembered) give the initial VT
[M p. 25]; the manual tabulates IBW and VT by height for women and men [M p. 26–27] (the values follow the Devine
formula: 45.5 kg and 50 kg at 60 in, +2.3 kg an inch [I], the same as the model's `pbw`, `mechanics.ts`). Then the
humidifier (Active, Passive (HME), None) [M p. 27, p. 54]; then the circuit calibration with the Y-piece occluded: leak
test (under 10 L/min: continue or redo; over 10 L/min: stop), PEEP valve, expiratory flow sensor, oxygen sensor,
circuit compliance [M p. 28–32]; then the mode window [M p. 33]. Ambient pressure is entered once per site
[M p. 29, p. 59].

### 2.6 Set parameters (ADL; PED in brackets where the manual gives it)

From Table 13-8 [M p. 119–121] and the default figures of chapter 8 [M p. 70–87]. "Default" is the figure's value for
the mode named.

| Parameter | Range | Step | Default (ADL) | Where it is set | Source |
|---|---|---|---|---|---|
| VT (L) | 0.05–2.5 (PED 0.02–0.3) | 0.01 (PED 0.001), finer with Ctrl | 0.402 (from IBW × 6 mL/kg) | VCV, SIMV(VCV), PSV+VT Assured, PRVC | [M p. 119], [M p. 70] |
| Minute volume (L/min) | 1–50 | 0.1 | 6 (PED 4) | MMV+PSV only | [M p. 119], [M p. 81] |
| PCV (cmH2O above PEEP; Peak = PCV + PEEP) | PCV + PEEP 2–100 | 1 | 15 (PED 8) | PCV, SIMV(PCV) | [M p. 119], [M p. 71–72] |
| PSV (cmH2O above PEEP) | PSV + PEEP 0–100 | 1 | 5 | all modes with PSV | [M p. 119] |
| PEEP/CPAP (cmH2O) | 0–50 | 1 | 5 | all | [M p. 120] |
| Ti (s) | 0.10–3.00 | 0.01 | 1.00 (PED 0.60) | assist/controlled modes | [M p. 120] |
| Ti High / Ti Low (s) | 1.0–30.0 / 0.2–30.0 | 0.01 | 5.0 / 1.5 | APRV | [M p. 120], [M p. 84] |
| PEEP High / PEEP Low (cmH2O) | not stated apart from PEEP's | 1 | 10 / 5 | APRV | [M p. 84] (gap: range) |
| I:E | printed "1:599–5:1" (probably 1:59.9, [I]) | 0.1 | follows from Ti and f | set only in PCV and NIV; shown elsewhere | [M p. 120], [M p. 42] |
| f (bpm) | 1–100 (PED 1–150) | 1 | 12 (PED 25); 6 in SIMV; 9 in APRV and NIV | modes with mandatory breaths | [M p. 120], [M p. 77, p. 84–85] |
| Oxygen (%) | 21–100 | 1 (Ctrl: 10) | 50 | all | [M p. 120], [M p. 19] |
| Sens, flow (L/min) / pressure (cmH2O) | 0.2–15 / −0.5 to −20 | 0.1, 0.5 or 1 / 0.5 | flow 3 (pressure −1.5); flow is the default type | all | [M p. 120], [M p. 42–43] |
| Exp. Sensitiv. (% of peak flow) | 5–80 | 5 | 25 | modes with PSV | [M p. 120], [M p. 45] |
| Rise Time | **not stated** (an icon key, no number shown) | gap | gap | pressure-controlled and supported breaths | [M p. 44, p. 72] [P IMG_1542] |
| Flow Waveform | descending ramp, constant (rectangular) | — | descending | VCV, SIMV(VCV) mandatory breaths | [M p. 43–44, p. 120] |
| Inspiratory pause (VCV, Ventilatory adjuncts) | 0–2 s | 0.25 | 0 (Off) | Menu → Ventilatory adjuncts | [M p. 51, p. 120] |
| Sighs (VCV) | number 1–3; 5, 10, 15 or 20 an hour; +10–100 % of VT; own high-pressure limit 10–120 | 10 %; 5 cmH2O | off; 1; 5/h; +30 % | Ventilatory adjuncts | [M p. 51], [M p. 120] (p. 120 lists 5/10/15 an hour, p. 51 adds 20) |
| Backup: mode, apnoea time, backup in SIMV/APRV | VCV or PCV; 5–60 s; Yes/No | 5 s | VCV; 15 s; No | Menu → Backup ventilation | [M p. 49–50, p. 123] |
| Tube compensation | tube or tracheostomy; 4–12 mm; 10–100 % | — | 50 %; off | Ventilatory adjuncts | [M p. 52] |
| Volume compensation, Humidifier, Leak compensation | Yes/No; Active/Passive/None; Yes/No (always on in NIV) | — | see §2.9 | Ventilatory adjuncts | [M p. 53–54] |
| Suction time, %O2 enrichment | not stated | — | not stated | Tools → Suction configuration | [M p. 57] (gap) |

Defaults by mode (ADL) [M p. 70–87]: **VCV** VT 0.402, Ti 1.00, I:E 1:4.0 (shown), f 12, PEEP 5, Sens 3.0, Oxygen 50,
descending flow. **PCV** PCV 15, Ti 1.00, I:E 1:4.0, f 12, PEEP 5, Sens 3.0, Oxygen 50, Rise Time. **PSV/CPAP** PSV 5,
Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time (PSV 0 is CPAP, p. 76). **SIMV(VCV)+PSV** VT 0.402, Ti 1.00,
I:E 1:9.0, f 6, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time, Flow Waveform. **SIMV(PCV)+PSV** PCV 15
in place of VT, otherwise as SIMV(VCV). **MMV+PSV** V̇E 6.0, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise
Time. **PSV+VT Assured** VT 0.402, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time. **APRV** PSV 5,
Exp. Sensitiv. 25, Ti High 5.0, Ti Low 1.5, f 9, PEEP High 10, PEEP Low 5, Sens 3.0, Oxygen 50, Rise Time, I:E 3.3:1
(shown). **NIV** PSV 5, Ti 1.00, I:E printed "3.3:1" (Ti 1.00 at f 9 gives 1:5.7: a figure error or my misreading),
f 9, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time. **PRVC** VT 0.402, Ti 1.00, I:E 1:4.0, f 12, PEEP 5,
Sens 3.0, Oxygen 50, Rise Time.

### 2.7 The modes, as the manual describes them

| Mode | Behaviour | Source |
|---|---|---|
| VCV | volume-controlled, flow controller; time- or patient-triggered (assist) breaths; flow waveform chosen | [M p. 69–71] |
| PCV | pressure-controlled at PCV above PEEP for Ti; time- or patient-triggered; Rise Time | [M p. 71–73] |
| PSV/CPAP | patient-triggered; ends when flow falls to Exp. Sensitiv. % of its peak, or after 3 s (ADL; PED 2 s), or on a pressure criterion the text gives as "14 % of the set pressure plus 5 cmH2O" [I: unclear]; CPAP = PSV 0; backup on apnoea | [M p. 73–76] |
| SIMV(VCV)+PSV | mandatory VC breaths at f; in each mandatory cycle the first 3/4 of expiration is a window for spontaneous PSV breaths, the last 1/4 a window in which a patient effort triggers the next mandatory breath; Rise Time acts on PSV breaths, Flow Waveform on VC breaths | [M p. 76–78] |
| SIMV(PCV)+PSV | as SIMV(VCV), mandatory breaths pressure-controlled; Rise Time acts on both | [M p. 78–79] |
| MMV+PSV | spontaneous, PSV adjusted breath by breath (at most 2 cmH2O a breath) toward the set minute volume; stops adjusting near the pressure alarm limits and raises a medium-priority alarm | [M p. 80–81] |
| PSV+VT Assured | PSV breaths; if the set VT is not reached when the breath would end, flow turns constant until VT is reached or 3 s (ADL; PED 1.5 s) pass | [M p. 82–83] |
| APRV | two CPAP levels (PEEP High, PEEP Low) for Ti High and Ti Low; spontaneous breaths, supported or not, at both; I:E may invert; backup optional | [M p. 83–84] |
| NIV | PSV breaths plus time-cycled mandatory pressure breaths at f (not patient-triggered); leak compensation always on | [M p. 84–86] |
| PRVC | first a VC breath with constant flow and a 0.5 s pause to measure compliance, then pressure-controlled breaths adjusted at most 3 cmH2O a breath toward VT, between PEEP + 5 and the high-pressure limit − 5; the test repeats on mode entry, VT change, leaving standby, or a VT above target at the same pressure; "target volume not reached" alarm | [M p. 86–87] |

Each mode's page also lists the functions active in it (nebuliser, suction, manual breath, manual pause, sigh,
volume/leak/tube compensation) [M p. 71, 73, 75, 78, 79, 81, 83, 84, 86, 87].

### 2.8 Monitored values

Top row [M p. 15]: Peak Flow, Ti (includes the pause), Te, I:E, fTotal (spontaneous and mandatory), VT (expired; L for
ADL/PED), V̇E, Oxygen. Left column [M p. 16–17]: Peak, Plateau (with a pause or a hold), Mean, PEEP (the mean airway
pressure of the last 50 ms of expiration), and tracheal pressure under Peak when tube compensation is on [M p. 53].
Patient's Data, two pages [M p. 47–48, Figure 6-2]: VE Mandat, VE Spont, F Spont (each over the last 3 breaths of its
kind), TCexp (from the flow–volume slope at 30–70 % of expiration), F/VT (the rapid shallow breathing index, active in
PSV/CPAP only), Cdyn, WOBi (PSV/CPAP only), ETCO2, VCO2 (STPD), Cst, Ri, Re, auto-PEEP, Leak, % leak, Ti/Ttot,
Ptracheal; a value not active in the mode shows `---`. Accuracy table [M p. 121, Table 13-9].

### 2.9 Menus

Main menu [P IMG_1547] [M p. 46]: Patient's Data; Backup ventilation ▸; Ventilatory adjuncts ▸; Records ▸; Tools ▸;
Intrahospital transport (No). Ventilatory adjuncts, ADL [M p. 50, Figure 6-4]: Inspiratory pause (Off), Sighs (No ▸),
Tube compensation (No ▸, greyed in VCV), Volume compensation (No in the figure; the text says it is on by default,
p. 53; the photographs' message bar shows it on), Humidifier (None (Service)), Leak compensation (No). Records
[M p. 55]: Trends, Saved Loops, Activated Alarms. Tools [M p. 56–61]: Autoscale (No), Suction configuration ▸,
Calibration ▸ (oxygen sensor, breathing circuit, capnography, touch screen), Settings ▸ (pressure units cmH2O, mbar,
hPa; mean ambient pressure; sound 25–100 % in steps of 25, never off; date and time; language: Spanish, English,
Portuguese, Russian, Chinese, French, Turkish), Time of use and soft version. Respiratory Mechanics (the right-column
key) [M p. 39, Figure 5-6]: auto-PEEP, Compliance and resistance, Trapped volume, Slow vital capacity, P0.1, PV flex,
Pimax (greyed in the figure), VD/VT Physiologic.

### 2.10 Alarms

**Scheme.** Audible and visible; three priorities and Vent Inop above them [M p. 88, p. 18]. If two alarms are active
at once only the higher is shown [M p. 88] — but p. 17 says messages that do not fit rotate every 5 s with an arrow
icon (a conflict inside the manual; the face follows the alarm chapter, p. 88, until the owner's video, VQ7). Lamps: high red fast, medium yellow slow, low yellow steady [M p. 90, Table 9-1]. Audio: high 10
pulses (2 × 5), medium 3, low 1; tones do not mix, the highest sounds [M p. 90–91, Table 9-3]. When the cause ends: the
message goes at once; the front lamp stays lit, steady, until Esc [M p. 91, Table 9-4]; audio: high 5 pulses, medium 3,
low none [M p. 92, Table 9-5]. Silence: 30 s (one press) or 60 s (two); every audible alarm can be silenced except
emergency ventilation and Vent Inop [M p. 92]. Every activated alarm is logged with date and time and survives power-off
[M p. 88–89]. Ctrl+Alarm Limits with an alarm active shows possible causes and remedies [M p. 88].

**Limits** (Table 13-10 [M p. 122–123]; the photographs' values where they differ):

| Alarm | Range | Default ADL (PED) | On the photographs | Source |
|---|---|---|---|---|
| Max inspiratory pressure (cmH2O) | 10 (or above min) – 120, step 1 | 40 (30) | 40 | [M p. 122] [P IMG_1542] |
| Min inspiratory pressure (cmH2O) | 1–99 (below max), step 1 | 5 (5) | 5 | [M p. 122] [P IMG_1542] |
| Max VT (L) | above min – 3, step 0.01 | 0.6 (0.075); at most 1.5 × the IBW VT | 0.750 | [M p. 122–123] [P IMG_1542] |
| Min VT (L) | 0 – max | 0.15 (0.025) | 0.250 | [M p. 122] [P IMG_1542] |
| Max V̇E (L/min) | above min – 55 | 7.23 (1.91); 9 (6) in MMV+PSV | 8.50 | [M p. 122] [P IMG_1542] |
| Min V̇E (L/min) | 0 – max | 2.41 (0.63); 4.5 (3) in MMV+PSV | 2.41 | [M p. 122] [P IMG_1542] |
| Oxygen high / low (%) | 25–110 / 19–95, step 1 | 60 / 40 | 50 / 30 | [M p. 122] [P IMG_1542] |
| Apnoea (s) | 5–60, step 5 | 15 | — | [M p. 123] |
| High PEEP (cmH2O) | 1–50, step 1 | 20 | 20.0 | [M p. 123] [P IMG_1542] |
| Max respiratory rate (bpm) | 3–160, step 1 | 30 | 30 | [M p. 123] [P IMG_1542] |
| Inadequate oxygen, disconnection, leak out of range, continuous high pressure, power, battery, Vent Inop, blower | not adjustable | 18 %; —; 15 L/min invasive (50 / 30 NIV); PEEP + 5 for 15 s | — | [M p. 122–123] |

**The alarms by priority** [M p. 95–97, Tables 9-7 to 9-9]. High: Emergency ventilation; Continuous high pressure
(PEEP + 5 for 15 s); High pressure (the expiratory valve opens to PEEP); Low air and oxygen pressure (both under 2 bar);
Disconnection (after 5 s); Low pressure; Low oxygen (or air) supply pressure; Oxygen concentration below 18 %; Low
battery; ETCO2 max/min (capnograph fitted). Medium: High and Low minute volume (10 s); High tidal volume (10 s; not in
CPAP); Low tidal volume (20 s; not in CPAP); Power loss; High/Low O2 concentration (30 s); Apnea (starts the backup);
Non-compensable leak; Fan failure; Target volume not reached (PRVC, MMV+PSV); High PEEP (within 5 s). Low: High rate
(30 s); Nebulization interrupted; Transport; Standby. Vent Inop: steady lamp, a continuous distinct tone, no message
[M p. 95, Table 9-6]. The alarm-settings window [M p. 37, Figure 5-5] lists Inspiratory pressure, Tidal volume, Minute
volume, Oxygen concentration, Respiratory rate, **Low PEEP** and ETCO2 (the tables have High PEEP). The owner's rule settles it (VQ7): a yellow limit tag shows
the high limit, the low limit or both, as its symbol says; the face adopts that rule for every tag and window row, so
the PEEP row holds the High PEEP limit the tables define, under the high-limit symbol of the screen's "20.0" tag. In NIV (ADL)
the TV and MV alarms can be switched off together [M p. 93]; apnoea can be switched off in SIMV and APRV, which also
switches the backup off [M p. 94].

### 2.11 Manoeuvres and tests

| Function | What it does | Source |
|---|---|---|
| Suction %O2 | 60 s of breaths at raised oxygen; then the set suction time with no mandatory breaths; then 60 s at raised oxygen again; enrichment is added to the set %O2 (50 % + 20 = 70 %; the maximum gives 100 %) | [M p. 39, p. 57] |
| Nebulizer | 8 L/min of oxygen to the nebuliser in inspiration; stops after 30 min, on the key, or by itself (low-priority alarm) when peak flow is below the nebuliser's | [M p. 38] |
| Freeze | freezes the curves; the numbers stay live; leave with Freeze (p. 67) or Esc (p. 40) | [M p. 40, p. 67] |
| Save loop | a reference loop in another colour with its date and time; four kept until power-off; Ctrl+Graphics clears | [M p. 41, p. 68] |
| Graphics | six layouts: 5 curves (default); Paw and flow; Paw, VT, flow; loops (P/V, F/V, F/P); curves with Patient's Data; curves with CO2 | [M p. 63–66] |
| Scales | touch the axis numbers, turn, press; Autoscale in Tools; the horizontal axis moved with Ctrl and the knob | [M p. 67] |
| Help | Help, then the key to explain | [M p. 40] |
| auto-PEEP | expiratory valve closed 0.75 s at end-expiration; VCV, PCV, PRVC | [M p. 98–99] |
| Compliance and resistance | Cdyn = VT / (Pmax − PEEP); Cst = VT / (Pplat − PEEP total); Ri = (Pmax − Pplat) / flow; Re = TCexp / Cst | [M p. 99–101] |
| Trapped volume | static test in VCV, PCV, PRVC | [M p. 101] |
| Slow vital capacity | the device switches to PSV/CPAP with PSV 0 for 30 s; needs the patient's cooperation | [M p. 102] |
| P0.1 | the pressure drop in the first 100 ms of an occluded effort | [M p. 103] |
| PV flex | 3 s at PEEP 0, then a slow inflation with low flow of 100 % oxygen to a set Pmax or Vmax; lower and upper inflection points and Cmax; cursor with the knob | [M p. 104–105] |
| Pimax | inspiratory valve closed 20 s; the most negative pressure | [M p. 105–106] |
| VD/VT | PECO2 measured, PaCO2 entered from a blood gas | [M p. 106–107] |
| Trends | 72 h; three groups of three parameters chosen from a list | [M p. 108–111] |
| Intrahospital transport | oxygen-only ventilation from a cylinder; the low air and power alarms off; a low-priority alarm | [M p. 62] |

### 2.12 Colour and layout facts the face needs

Measured from the photographs (uncorrected white balance; the mean of a 7 × 7 px patch, or the median of the 30 most
saturated pixels for the traces, by a small ffmpeg-based sampler kept outside the repository), carried as the proposed tokens of the mock-up stylesheet
`mockup/face.css`: header and left column light grey (≈ `#c9ced2`), category word blue, message bar light blue
(≈ `#8db4e0`), axis strips paler blue (≈ `#aed6ef`), waveform panels dark navy (≈ `#0d1240`), inspiration green
(≈ `#96ef3f`), expiration red (≈ `#df5e4e`), alarm-limit tags yellow (≈ `#d8c874`), keys and menu rows pale grey
(≈ `#d4d6cd`) with a darker label strip, a selected key or menu row blue (≈ `#3e77c8`), window title bar slate
(≈ `#5d6f90`), lamps red (≈ `#fa223f`) and amber (≈ `#f7a663`). Layout proportions from IMG_1542 (§2.2). A face
token's provenance tag is `measured` (photograph, no white-balance correction) unless the manual states the colour
(the lamps' and the message box's colours: `documented`, [M p. 17, p. 90]).

### 2.13 Words on the screen

The device is in English (its language list has no Persian, [M p. 61]); the face carries the device's own words as the
photographs and screen figures print them: "ADL", "Backup: OFF", "Peak Flow", "Current", "fTotal", "Volume
compensation", "Peak", "Trach.", "Plateau", "Mean", "PEEP", "Pressure Limits", "Exp. Sensitiv.", "Sens", "Rise Time",
"Flow Waveform", "Operative Modes", "Other Operative modes", "Press [Knob] Select - [Esc] Exit", "Alarm Limits",
"30-60 s", "Menu", "Mode", "Suction %O2", "Manual Insp.", "Insp/Exp Pause", "Ctrl", "Esc", "Vent Inop", "High",
"Med Low", "Alarm Signals", and the menu rows of §2.9. One label in a manual figure is Spanish ("% de fuga", p. 47);
the face writes "% leak" (an English rendering; the owner's video confirms the device's word, §7.3).

### 2.14 Where the manual and the device differ

The owner's ruling (VQ7 = B, 10 November 2026): **until his detailed video of the device, everything is based on the
manual**; where the manual contradicts itself, the plan says which page it follows and the video settles it.
1. The manual's mode window (2018) is titled "Ventilation Modes" and lists SIMV(VCV)+PSV under "Other ventilation
   Modes" [M p. 34]; the department's device titles it "Operative Modes" and lists SIMV(VCV)+PSV in the first window
   [P IMG_1544]. **By VQ7 the face follows the manual until the video**; mock-up m2, drawn before the ruling, shows
   the photographed version (its caption says so).
2. Oxygen limits 60/40 in the manual, 50/30 on the device; VT limits 0.6/0.15 against 0.750/0.250 [M p. 122] [P]:
   department settings, not a conflict. The face starts from the manual's defaults.
3. "Low PEEP" in the alarm window [M p. 37] against High PEEP in the tables [M p. 96, p. 123] and on the screen's tag
   (20.0, [P IMG_1542]): **settled by the owner's tag rule** (§2.10): the row holds the High PEEP limit, as its symbol
   shows.
4. One message at a time [M p. 88] against messages rotating every 5 s [M p. 17]: the face follows the alarm chapter
   (p. 88) until the video.
5. Freeze left with Esc [M p. 40] or with Freeze again [M p. 67]: both pages are the manual; the face accepts both
   until the video.

---

## 3. What the model honours, and the gap table

### 3.1 The ventilator model on c13cb826

`@pme/ventilator` is the v1.9 simulator's engine ported line for line (NOTICES N-060): ONE flat `VentConfig`
(`types.ts:8–31`) holding settings, alarm limits and the lung; a 5 ms step of 4 Euler sub-steps
(`vent.ts:9–11`, `stepVent`); five modes `VC | PC | PRVC | PSV | PAV` (`types.ts:5`). What each does
(`vent.ts`, `controller`, `advancePhase`):
- **VC**: flow-controlled; the set keys are `vt` (mL) and `vcFlow` (L/min); Ti is derived, `vt / vcFlow`
  (`vcTi`, `vent.ts:113`); `flowPattern` `square` or `decel`, where `decel` falls linearly from 4/3 to 2/3 of the mean
  flow (`controller`, `vent.ts:156`) — **not to zero**; an end-inspiratory `pause` (s); Paw is capped at `pmax` by
  reducing flow (`stepVent`, `vent.ts:330–334`) — **the breath is not cycled off**.
- **PC**: `pc` above PEEP for `itime`, with a half-cosine rise over `riseTime`; time- or patient-triggered.
- **PRVC**: pressure-controlled breaths adjusted after each breath by `clamp(err × 0.01, −3, 3)` cmH2O toward
  `prvcTarget`, between 5 and `pmax − peep` (`startExpiration`, `vent.ts:228–231`); no test breath.
- **PSV**: patient-triggered; cycles at `cycleOff` % of peak flow or after 3 s (`advancePhase`); **a mandatory breath
  of the same kind after `max(60/rate, 6)` s without a breath** (`vent.ts:270`); `setMode` turns `spont` on.
- **PAV**: proportional assist (Hamilton's ASV stands on it).
- Trigger: `trigType` flow (`flowTrig`, L/min) or pressure (`presTrig`, cmH2O), from the patient's Pmus
  (`patientTriggers`). `rate` has a floor of 4 bpm in the phase logic (`Math.max(4, c.rate)`, `vent.ts:242`).
- Measured (`Measured`, `types.ts:33–35`): PIP, PLAT, RR, VTE, MV, P0.1 (from the Pmus waveform, not an occlusion),
  auto-PEEP (at an expiratory hold or each breath start), Pmean. Markers tag each breath mandatory or patient.
- Front-panel actions: `toggleHold` (insp/exp hold armed at the next cycle point, no time cap), `manualBreath`
  (from expiration only), `setCircuit` (disconnection at the Y-piece), `silenceAlarms` (fixed 120 s)
  (`vent.ts:356–370`).
- Alarms (`alarms.ts`): `pmax`, `mvHigh`, `mvLow`, `vtHigh`, `vtLow`, `fHigh`, `fLow`, `intrinsicPeep`,
  `disconnection`, `apnea`; priority `high` except `intrinsicPeep`; no delays; no latching.
- Carried unwired from v1.9: `sigh`, `trc`, `trcPct`, `backup`, `backupRate` (`types.ts:28–29`).
- The link sends one VentFrame a 20 ms tick (Paw, Palv, flow, volume, FiO2, PEEP, phase, mode name)
  (`frame.ts`); the engine's `lungState` sets compliance, resistances, pleural pressure and effort (`lung-input.ts`).
  On hand-over the cockpit's settings become the engine's own volume-control ventilator (`engineVentilation`,
  `views/vent.ts:31–40`), and taking the patient back puts the cockpit in VC (`cockpitPatch`, `:43–52`).

### 3.2 The three classes

- **H — honoured now** by an existing model feature (the mapping is given).
- **W — needs model work** (the piece is named; "vent" = `packages/ventilator` only; no row needs `engine-core`; the
  pieces that change the ventilator's mechanics carry `run-validation`, §7).
- **N — not offered**, with what the face shows: *absent*, or *unavailable* (present, greyed, its reason under it).

### 3.3 The gap table

**Modes**

| # | EDP-TS | Class | Model today, and the mapping or the work | Piece |
|---|---|---|---|---|
| GM1 | VCV | H | `VC`. The face sets Ti, the model sets flow: `vcFlow = 60 · VT / Ti` gives the model's Ti = VT / mean flow exactly, for both flow patterns. The page's monitor-matched flow (`matchMonitorFlow`, `hamilton-page.ts:20–34`) must not run under this face, or it overwrites `vcFlow` every frame | V1 |
| GM2 | PCV | H | `PC`; PCV = `pc` (above PEEP in both); I:E set: `itime = 60/f · I/(I+E)`; Rise Time = `riseTime` | V1 |
| GM3 | PSV/CPAP | W | `PSV` honours the PS breath (Exp. Sensitiv. = `cycleOff`; the 3 s limit is the same). Its 6 s safety breath has no counterpart on the device, whose backup is VCV or PCV after the apnoea time (§2.7). Work: apnoea backup ventilation as a model option (vent) | V2 |
| GM4 | SIMV(VCV)+PSV | W | No SIMV. Work: a mode with mandatory VC breaths at f and PS breaths between, the 3/4 + 1/4 windows of [M p. 76]; f below 4 (vent) | V6 |
| GM5 | SIMV(PCV)+PSV | W | As GM4 with PC mandatory breaths (vent) | V6 |
| GM6 | Noninvasive (NIV) | W | Work: PS breaths plus time-cycled pressure breaths at f and Ti not triggered by the patient (vent). No leak model: leak shows `---`, leak compensation unavailable (GN6) | V8 |
| GM7 | MMV+PSV | W | Work: PS adjusted ≤ 2 cmH2O a breath toward the set V̇E, held near the limits, "Target volume not reached" (vent) | V9 |
| GM8 | PSV+VT Assured | W | Work: a PS breath that turns to constant flow until VT or 3 s (vent) | V9 |
| GM9 | APRV | W | Work: two levels and two times, spontaneous breaths (PS optional) at both (vent). Hamilton's APRV row maps to PC today (`presets.ts:30`); this is the device's mode, not that one | V10 |
| GM10 | PRVC | H | `PRVC` honours the adjusting pressure-controlled breath at ±3 cmH2O. What differs (no 0.5 s test breath, limits 5…Pmax−PEEP against PEEP+5…limit−5, no "target not reached") is aligned in V11 (vent) | V1, V11 |
| GM11 | "Other Operative modes" | H | holds exactly MMV+PSV, PSV+VT Assured, APRV, PRVC [P IMG_1545] [M p. 34]: a face window | V1 |
| GM12 | Neonatal modes (TCPL, SIMV(TCPL)+PSV, CPAP continuous flow) | N | absent (VQ3 = A: adults now, neonates when the engine has their physiology) | — |

**Set parameters**

| # | EDP-TS | Class | Mapping or work | Piece |
|---|---|---|---|---|
| GP1 | VT | H | `vt` (mL = L × 1000) in VCV/SIMV(VCV)/VT Assured; `prvcTarget` in PRVC | V1 |
| GP2 | Ti | H | VC: through `vcFlow` (GM1); PC, PRVC: `itime` | V1 |
| GP3 | I:E (set in PCV, NIV; shown elsewhere) | H | to `itime` from f; shown dimmed and not selectable where the device only shows it (m1) | V1 |
| GP4 | f | H | `rate`; the face's range is 4–100 until V6 lifts the floor for SIMV (the device allows 1), the reason shown when the knob stops at 4 | V1, V6 |
| GP5 | PCV | H | `pc` | V1 |
| GP6 | PSV | H | `ps` (in PSV/CPAP after V2, in SIMV after V6) | V2 |
| GP7 | Exp. Sensitiv. 5–80 % | H | `cycleOff` | V2 |
| GP8 | PEEP 0–50 | H | `peep` | V1 |
| GP9 | Sens, flow / pressure; touched twice switches | H | `trigType`, `flowTrig`, `presTrig` | V1 |
| GP10 | Oxygen 21–100 | H | `fio2`, sent on every frame to the engine | V1 |
| GP11 | Rise Time | H | `riseTime` (s). The device shows only an icon and the manual gives no range or step: a named gap. Until the owner's video shows the key (§7.3; VQ7), the knob steps through five values 0.05–0.25 s [ENG], said in the face's provenance | V1 |
| GP12 | Flow Waveform: constant | H | `flowPattern: 'square'` | V1 |
| GP13 | Flow Waveform: descending (the device's default) | W | The model's `decel` ends at 2/3 of the mean flow, the device's ramp at zero [M p. 43]. Work: a ramp-to-zero pattern (peak = 2 × mean) as a new `flowPattern` value; `decel` unchanged for the Hamilton face and the fidelity traces (vent). Until V2 the face offers Constant only and shows Descending unavailable | V2 |
| GP14 | Inspiratory pause 0–2 s (VCV) | H | `pause` (VC only, as on the device) | V1 |
| GP15 | Minute volume (MMV) | W | new key with GM7 | V9 |
| GP16 | PEEP High/Low, Ti High/Low | W | new keys with GM9 | V10 |
| GP17 | Backup mode, apnoea time, backup in SIMV/APRV | W | `apneaTime` exists (alarm only); `backup`, `backupRate` are unwired. Work with GM3 | V2 |
| GP18 | Sighs | W | `sigh` unwired. Work: every N-th breath per hour + % VT, own pressure limit (vent) | V7 |
| GP19 | Tube compensation | N | unavailable in version 1, reason "version 2: tube compensation is not modelled yet"; built in V15 (VQ5) | V15 |
| GP20 | Volume compensation | N | unavailable, fixed "Yes": the model has no circuit compliance, so delivered and displayed volume are always the compensated ones | — |
| GP21 | Humidifier | N | unavailable, "not modelled" (no BTPS correction in the model) | — |
| GP22 | Leak compensation | N | unavailable, "no leak modelled" | — |
| GP23 | Patient category ADL | H | the engine's adult patient; PED and NEO unavailable, reason "adult patient only" (VQ3) | V1, V12 |
| GP24 | IBW × mL/kg → initial VT | H | face arithmetic; the model's `pbw` is the same Devine formula as the manual's tables; part of the start-up (version 2), until then VT starts at the manual's default 0.402 L | V12 |
| GP25 | Pressure units, ambient pressure, sound, date/time, language, time of use | N | unavailable except Sound (V3: the face's alarm volume) and the date and time (the simulator's clock) | V3 |

**Monitored values and displays**

| # | EDP-TS | Class | Mapping or work | Piece |
|---|---|---|---|---|
| GD1 | Peak Flow | H | the face core's breath record (max of `p.Q` in inspiration) | V1 |
| GD2 | Ti (with pause), Te, I:E current | H | the core's phase timer (`p.phase` changes), as a ventilator reports them | V1 |
| GD3 | fTotal, VT, V̇E | H | `measured.RR`, `VTE` (mL → L), `MV` | V1 |
| GD4 | Oxygen | H | `fio2`. The model has no oxygen sensor: the value is the set one, at once (the device's 20 s for 21→90 %, [M p. 118], is not modelled; said in the face's known differences) | V1 |
| GD5 | Peak, Plateau, Mean | H | `PIP`, `PLAT`, `Pmean` | V1 |
| GD6 | PEEP (last 50 ms of expiration) | H | the core averages Paw over the last 50 ms before inspiration | V1 |
| GD7 | Trach. | N | `---` until V15 (GP19) | V15 |
| GD8 | Lung icon (patient effort) | H | `p.lastPtT` within 0.4 s, as the Hamilton face's lung marker does | V1 |
| GD9 | Battery and mains lamps | N | fixed: mains on, battery full; no power model (§1 non-goals) | — |
| GD10 | Scalars Paw, VT, V̇, green and red by phase, 12 s sweep | H | the core's 5 ms buffers (`dispPaw`, `dispFlowLpm`, volume since breath start), coloured by `p.phase` | V1 |
| GD11 | Loops VT–Paw, V̇–VT (and V̇–Paw in the loops layout) | H | the same buffers | V1 |
| GD12 | Graphics layouts (5 of 6) | H | face layouts; the CO2 layout unavailable until V14 | V4 |
| GD13 | Freeze | H | the core's display-only freeze (the Hamilton face already freezes the display, not the physics) | V4 |
| GD14 | Save loop, reference loop (4) | H | core buffers kept per session | V4 |
| GD15 | Curve scales, autoscale, axis position | H | face | V4 |
| GD16 | Patient's Data: VE Mandat, VE Spont, F Spont | H | the core's breath record, tagged by the markers (`mand`/`pt`) | V4 |
| GD17 | TCexp, F/VT, Cdyn, Cst, Ri, Re, auto-PEEP, Ti/Ttot, WOBi | H | the core's arithmetic on the record, by the manual's formulas [M p. 48, p. 99–100]; Cst, Ri after an inspiratory hold, auto-PEEP after an expiratory hold | V4 |
| GD18 | ETCO2, VCO2 | W | the CO2 signal must reach the ventilator over the link (an additive link message; no engine change); version 2, with an on/off setting (VQ10) | V14 |
| GD19 | Leak, % leak, Ptracheal | N | `---`, reason "not modelled" | — |
| GD20 | Trends (72 h) | H | the core's record for the session (a session is shorter than 72 h) | V13 |

**Alarms**

| # | EDP-TS | Class | Mapping or work | Piece |
|---|---|---|---|---|
| GA1 | High pressure: alarm | H | `pmax` alarm; the limit is the "40" key of Pressure Limits | V1 |
| GA2 | High pressure: the breath is ended (valve to PEEP) | W | the model caps Paw instead [M p. 95]; work: a `pmaxAction: 'cap' \| 'cycle'` option, default `cap` (vent) | V2 |
| GA3 | Low pressure (min inspiratory pressure) | W | new alarm id (vent, `alarms.ts`) | V3 |
| GA4 | Continuous high pressure (PEEP + 5 for 15 s) | W | new alarm id | V3 |
| GA5 | Disconnection (after 5 s) | H | `disconnection`; the 5 s delay in V3 | V1, V3 |
| GA6 | High/Low minute volume (10 s) | H | `mvHigh`, `mvLow`; delays in V3 | V1, V3 |
| GA7 | High/Low tidal volume (10 s / 20 s; not in CPAP) | H | `vtHigh`, `vtLow` | V1, V3 |
| GA8 | High rate (30 s; low priority) | H | `fHigh`; the device has no low-rate alarm: the model's `fLow` and `intrinsicPeep` are not shown on this face (they are not the device's) | V1 |
| GA9 | Apnea (medium; starts the backup) | H | `apnea` (`apneaTime`); the backup is V2 | V1, V2 |
| GA10 | High PEEP (within 5 s) | W | new alarm id against a limit (the "20.0" tag) | V3 |
| GA11 | High/Low O2 concentration (30 s) | W | new alarm on `fio2` against two limits; with no sensor model it fires only when a limit is set across the set value (said so) | V3 |
| GA12 | Target volume not reached (PRVC, MMV+PSV) | W | with V9 and V11 | V9, V11 |
| GA13 | ETCO2 max/min | W | with V14 | V14 |
| GA14 | Oxygen below 18 %; supply pressures; power loss, low and dead battery; fan/blower; Vent Inop; emergency ventilation; non-compensable leak; nebulisation interrupted; transport | N | absent: no gas, power, hardware or leak model (non-goal; instructor-raised events are a later question) | — |
| GA15 | Standby (low) | W | with V5 | V5 |
| GA16 | The signals: lamps (fast/slow/steady), latching until Esc, message box colour, one message at a time, audio pulses 10/3/1 and 5/3/0, silence 30/60 s | W | `silenceAlarms` gains a duration (vent); priorities and delays as a per-face alarm profile the core applies; lamps, latching and tones in the face (VQ6, VQ7) | V3 |
| GA17 | Alarm-limit tags and the Alarm settings window | H | `almFhi`, `almVThi/lo`, `almMVhi/lo`, `pmax` today; O2, low pressure, high PEEP with V3 | V1, V3 |
| GA18 | Alarm test (Ctrl+Alarm Limits) | H | face: every lamp and tone in turn | V3 |
| GA19 | Activated alarms log | H | the core's record | V13 |

**Manoeuvres and keys**

| # | EDP-TS | Class | Mapping or work | Piece |
|---|---|---|---|---|
| GX1 | Manual Insp. | H | `manualBreath` | V4 |
| GX2 | Ctrl+Manual Insp. (deep breath) | N | unavailable: the manual does not say how deep (named gap) | — |
| GX3 | Insp/Exp Pause, held; 7 s / 20 s caps; VCV and PCV only | H | `toggleHold` on press and release; the caps and the mode rule in the core | V4 |
| GX4 | Suction %O2 | W | the oxygen phases are `fio2` (H); the suction phase opens the circuit at the patient (VQ9 = A, open suction); whether the key itself pauses mandatory breaths follows the manual until the owner's video (§7.3) | V5 |
| GX5 | Standby | W | a model state: no breaths, settings kept (vent) | V5 |
| GX6 | Nebulizer | N | unavailable, "nebulised gas not modelled" (m1) | — |
| GX7 | Screen lock (2 s hold) | H | face | V4 |
| GX8 | Help | H | face; the project's own words (A4) | V4 |
| GX9 | Mode window with confirmation | H | face + `setMode` + `modeLabel` | V1 |
| GX10 | Select, turn, press; 15 s revert; Ctrl steps; Esc | H | face + core (a pending value is not written to `cfg` until the press) | V1 |
| GX11 | Menu presses 1–4 | H | face | V1 |
| GX12 | Backup ventilation window | W | with GP17 | V2 |
| GX13 | auto-PEEP, Compliance and resistance, Trapped volume | H | holds and the record (`autoPEEP`, `PLAT`, `p.V` at end-expiration) | V4 |
| GX14 | P0.1 | H | `measured.P01`; the face says it is the patient's own effort at 100 ms, not an occlusion measurement | V4 |
| GX15 | PV flex | H | a core sequence over the existing VC mechanics: PEEP 0 for 3 s, a slow inflation at low constant flow to Pmax or Vmax, the curve, then the settings back; the model's recoil already has closure and an upper inflection | V4 |
| GX16 | Slow vital capacity, Pimax | N | unavailable: no model of a cooperating or maximal effort | — |
| GX17 | VD/VT | N | unavailable until V14 (version 2), then with a typed PaCO2 (VQ10) | V14 |
| GX18 | Intrahospital transport | N | unavailable (no gas model) | — |
| GX19 | Start-up: category, IBW, humidifier, calibration | H / N | version 2 (VQ4 = C with a switch): scripted calibration screens with instructor-chosen failures, turned off in settings; until then the face opens at the mode window | V12 |

### 3.4 The counts

Counting each row of §3.3 once by its class (GX19, "H / N", counted H):
**H 55 · W 25 · N 15** (95 rows). The largest items: **in H**, the three modes the model already runs under the
device's own names and windows (VCV, PCV, PRVC; PSV/CPAP joins them with V2's backup), every monitored value of the top row
and the left column, the three scalars and two loops, and the knob's select-turn-press. **In W**, by size: APRV (V10),
SIMV in two forms (V6), MMV+PSV and PSV+VT Assured (V9), NIV (V8), apnoea backup with the PSV/CPAP mode and the
device's Pmax and flow-ramp behaviour (V2), the alarm scheme with five new alarms (V3), standby and suction (V5).
**In N**, all of physics the model does not have: gas supply, power, leak, tube compensation, humidification, the
nebuliser, cooperative manoeuvres, the neonatal group.

---

## 4. Architecture: a second face without a second ventilator

### 4.1 What `hamilton-ui.ts` is today

One function, `mountHamiltonUi(d: VentDriver)` (`hamilton-ui.ts:26–544`), that mixes the cockpit's logic with the
Hamilton look:

| Logic (any face needs it) | Look (Hamilton's only) |
|---|---|
| the 5 ms sample buffers filled from `d.onStep` and trimmed to the sweep (`:530–535`) | the markup and CSS of `vent-hamilton.html` (`--paw`, `--flow`, `--vol`, the navy cockpit) |
| display-only freeze (`frozen`, `:30`, `:529`) | three lanes in Hamilton's colours and order, its sweep gap and tick logic (`drawLaneOn`, `:198–262`) |
| holds, manual breath, reset (`toggleHold`, `manualBreath`, `resetPhysics`, `:288–293`) | the round dials of the right rail, drag and wheel to change (`buildRail`, `:270–298`) |
| writing a setting with a clamp (`num[key] = clamp(...)`, `:279`), `numsDirty` | the Basic/More/Apnea sheets with sliders (`buildSheet`, `buildBasic`, `buildMore`, `buildApnea`) |
| setting a mode and its display name (`setMode` + `S.modeLabel`, `:358`) | the Hamilton mode groups (`HAMILTON_MODES`) and their names |
| the measured view (`M()`, `:39`) and its 1.4 s refresh | the numeric tiles (`buildNums`) and the Dynamic Lung picture (`drawLung`) |
| the alarm banner text and silence (`bannerText`, `silenceAlarms`) | the banner's look and its tap-to-silence |
| the lung-base sync for the patient drawer (`syncBase`, `:44`) | the patient drawer and the asynchrony buttons (simulator tools, not a device's) |
| `d.frame` in the animation loop, `d.onControl` redraw (`:537–543`) | |

### 4.2 The seams considered

- **A. A skin = stylesheet + labels over the same markup** (the pump plan's SK1). Rejected for this device: the two
  faces differ in layout AND in interaction — Hamilton changes a value by dragging a round dial or a slider in a sheet;
  the EDP-TS selects a key, turns one knob, presses it, with a 15 s revert, windows navigated by the knob, Ctrl and Esc.
  A stylesheet cannot turn one into the other.
- **B. A cockpit core with faces** (proposed). The logic column of §4.1 moves into a core that knows nothing of any
  look; each face is a module that builds its own DOM from the core. The SK1 idea still applies INSIDE a face: its
  tokens and words are a data file with a provenance entry per leaf, checked by a test (§5).
- **C. A second page with its own copy of the cockpit.** Rejected: two cockpits would drift, every link mode (view,
  window, device, embed) would be wired twice, and every ventilator e2e test would need a twin.

### 4.3 The seam proposed (B), and its files

- `apps/demo/src/vent/core/cockpit.ts` — `createCockpit(d: VentDriver, face: FaceSpec)`: the buffers, the breath
  record (peak flow, Ti, Te, I:E, end-expiratory PEEP, VE mandat/spont, Ti/Ttot, the values of §3.3 GD16–GD17), freeze,
  holds with optional caps, manual breath, `set(key, value)` with the face's range and step, a pending-value API for
  select-turn-press (`select`, `turn`, `confirm`, `cancel`, the revert timer), `chooseMode(name)` through the face's
  mode table (`name → { mode, cfg patch, modeLabel }`), the alarm view (the model's `ventAlarms` passed through the
  face's alarm profile: which ids it shows, their priority, their delay, latching), silence for a duration, and the
  `onChange` / `onStep` subscriptions a face draws from.
- `apps/demo/src/vent/core/{record.ts, alarms-view.ts, pending.ts}` — the parts above, each with its unit test.
- `apps/demo/src/vent/faces/index.ts` — the registry: `{ 'hamilton-style': …, 'edp-ts': … }` and
  `faceFromLocation(location)`; the default is `hamilton-style` until version 1 is complete, then `edp-ts` (VQ8,
  piece VD).
- `apps/demo/src/vent/faces/hamilton/face.ts` — today's `hamilton-ui.ts`, its logic replaced by core calls; its markup
  and CSS stay in `vent-hamilton.html` (V0 moves no CSS).
- `apps/demo/src/vent/faces/edp-ts/{face.ts, face.css, face.json, modes.ts}` — the EDP-TS face: the DOM of
  §2.2, the tokens and words in `face.json` with `provenance`, the mode table and ranges of §2.6.
- `apps/demo/src/vent/sim-tools.ts` — the patient drawer and the asynchrony scenarios lifted out of the Hamilton
  face, opened from a small "Simulator" handle OUTSIDE the device's bezel, the same for both faces (they are the
  instructor's tools, not the device's; under the EDP-TS face a resident never sees them inside the screen).
- `hamilton-page.ts` and `embed.ts` mount `faces[faceFromLocation(location)]` instead of `mountHamiltonUi`; the page
  file keeps its name `vent-hamilton.html` (the kit, Room setup, the join card and eleven tests open it by that name).
- `views/vent.ts` `engineVentilation`: each mode piece (V6–V10) adds its mode to the hand-over mapping, so a SIMV or
  APRV patient is handed to the engine's ventilator with the rate and volume that mode delivers.

**Two couplings to keep honest.** (1) The VentFrame's `mode` string is `modeName(cfg)` (`link/core.ts:61`), whose
default names are Hamilton's (`presets.ts:34`); the EDP-TS face always sets `modeLabel`, so the engine's record reads
"SIMV(VCV)+PSV", not "PSIMV+". (2) `matchMonitorFlow` (`hamilton-page.ts:20–34`, `embed.ts:75–83`) is a property of the
Hamilton face (it sets flow because Hamilton's VC sets flow); the core takes it as a face option, off for EDP-TS (GM1).

### 4.4 What the Hamilton-style face must keep doing (V0's gate)

V0 changes no behaviour; the proof is that every test that touches the cockpit passes unchanged:
- e2e: `vent-link.e2e.ts`, `vent-window.e2e.ts`, `vent-view-vc-flow.e2e.ts`, `vent-view-speed.e2e.ts`,
  `vent-view-new-patient.e2e.ts`, `vent-handover-phones.e2e.ts` (chromium and webkit), and `validation-perf.soak.ts`
  where it runs; they select `#screen`, `#mnMain`, `#alarmBanner`, `#modesBtn`, `.dial[data-key="peep"]`, `#vent`,
  `#speed`, `#disc` — every id stays;
- dom: `vent/device-link.dom.test.ts`, `views/room-vent.dom.test.ts`, `views/join.dom.test.ts`;
- controller: `test/guard-vent.test.ts` (with `test/vent-capture.ts`); the relay's vent tests;
- ventilator package: all of `packages/ventilator/test/` (fidelity, reference, link parity, vc-flow parity …), untouched
  because V0 does not touch the package;
- scripts: `apps/demo/scripts/vent-shots.mjs` (its screenshots byte-similar), `build-embed.mjs` (the embed builds),
  `scripts/showcase/check-servers.mjs`, `kit-round-a.kitround.ts`;
- a NEW dom test written first: mounting the Hamilton face through the registry produces the same DOM (ids, classes,
  dial keys, the sheet's slider keys) as `mountHamiltonUi` did on the base commit, captured as a fixture.

### 4.5 How a face is chosen

1. **The address**: `vent-hamilton.html?…&face=edp-ts` in all three link modes (`?link=`, `&via=parent`,
   `?join=CODE#/vent`) and in the embed's options (`face`). Unknown or missing → the default face: `hamilton-style`
   until piece VD, `edp-ts` after it (VQ8).
2. **Room setup** (V1b, the R5b pattern): "Ventilator in this room" with the faces as choices, kept per room in the
   site profile as the monitor style is (`site.ts`); the Ventilator view puts it in its iframe address
   (`views/vent.ts:475`), Room setup's laptop window in its URL, and the device page reads it from the host's `style`
   event that already reaches every follower (`views/follower.ts`, "Style"), so a tablet signed in as the ventilator
   (R8d) wears the room's face.
3. **The kit**: no change; the room's choice travels with the room.

**What a follower's phone shows.** Unchanged: while a cockpit drives, network followers HOLD ("The ventilator is on
the main screen", `views/follower.ts:32–35`) and take a fresh snapshot after the hand-over; the face does not change
that. The only phone or tablet that shows the face is one signed in AS the ventilator (R8d), and it shows the room's
face.

---

## 5. Naming and look

The owner's ruling (VQ1 = B, 10 November 2026): "B is fine, call it 'EDP-TS'". The maker and the device are named.

| Rule before the ruling | Where | After the ruling |
|---|---|---|
| "Not affiliated with any monitor or ventilator manufacturer (the ventilator's Hamilton-style look included). The `-like` skins evoke a general look; no logos or trade dress." | README.md:61 | Amended in this pull request (below): still not affiliated; the EDP-TS face named after the device at the owner's ruling; no maker's logo or mark drawn |
| A monitor skin made from the owner's photographs of a named Iranian device names its maker: `saadat-like`, "Saadat-like (Iranian bedside, B9 family)" | `packages/skins/src/data/skins/saadat-like.json:4–5` | The ventilator face goes one step further: its name is the device's own, without "-like" |
| The pump plan names the department's devices (PQ2 = B) | `docs/plans/pump-rack-tci.md` §11 | Same practice |
| Every leaf of a device skin has a provenance entry (tag + a `research/NN §` or `brief §` source), checked by a test; the pump copies the rule rather than importing `packages/skins` | `packages/skins/src/provenance.ts`; pump plan SK1 | Unchanged: the face's `face.json` carries it |

**Applied:** the face's id is `edp-ts`, the address parameter `?face=edp-ts`, its name in the app (Room setup, the
registry's label) **"EDP-TS"**; the maker, Ehya Darman Pishrafteh, is named in this plan, the research note and the
face's provenance, not drawn on the face. **No logo artwork is drawn** (none was ruled in): where the device carries
its marks the bezel is plain. The README's affiliation sentence, applied to README.md in this pull request, reads:

> - **Not affiliated with any monitor or ventilator manufacturer.** The `-like` skins and the ventilator's Hamilton-style look evoke a general look. The planned EDP-TS ventilator face ([plan](docs/plans/vent-skin-edp-ts.md)) is named after the device at the clinical owner's ruling, to match the machine his residents use; no maker's logo or mark is drawn, and no logos or trade dress elsewhere.

When V1 merges, "planned" goes and the link points at the face. **Provenance:** a research note (piece VR) transcribes
§2 into `research/` with tags (`documented` for manual facts by page, `measured` for colours and proportions from the
photographs, `inferred`, `eng` for the Rise Time steps and the tone pitches); `face.json`'s every word, colour and
layout number cites it; the face's test copies the skins' coverage rule. The photographs never enter the repository;
the note names them by file name and date.

---

## 6. Persian

The owner's ruling (VQ10, 10 November 2026): "there is no translation for the actual devices! none of the devices
(instruments) have persian settings inside". Therefore:
- **The face carries no Persian at all**, in either app language: the device's words as the device prints them
  (§2.13), and every word the simulator adds INSIDE the face — the reasons under unavailable controls, the Help texts,
  the start-up screens of V12 — in English only.
- **Outside the face**, the app's own chrome stays as it is: Room setup's "Ventilator in this room" choice and the
  "Simulator" handle beside the bezel are app strings, Persian through the project's review path when the app is in
  Persian, never written by an executor without that review. The face's name, "EDP-TS", is a device name and is not
  translated.
- **The manual is a source, not a string file**: nothing is copied from it into the app in any language (anti-goal A4);
  facts are cited by page.
- This plan writes no Persian.

---

## 7. The pieces, in build order

Each piece: ONE PR; tests first; the gate "common" = typecheck, lint, the unit tests of the packages named, the e2e
sets that select ventilator files (`scripts/ci/e2e-sets.mjs`), at most 2 Playwright workers locally. CI load: one ci
run each; `run-validation` adds the validation workflow (it is required by CI only for `engine-core`; this plan asks
for it on every piece that changes the ventilator's mechanics, because those pieces change what the engine receives).

### VR: The device's research note (3 h; docs only)
**Files:** `research/NN-edp-ts-ventilator.md` (next free number): §2 of this plan with each fact tagged and cited, the
colour samples with their method, the photographs named but not included. **Gate:** docs job. **CI:** 1 run.

### V0: The cockpit core, the Hamilton face on it, no behaviour change (6 h)
**Depends on:** nothing. **Files:** `apps/demo/src/vent/core/*`, `faces/index.ts`, `faces/hamilton/face.ts` (from
`hamilton-ui.ts`), `sim-tools.ts`, `hamilton-page.ts`, `embed.ts`. **Tests first:** the DOM-equality dom test (§4.4);
core unit tests (buffers trim to the sweep; freeze stops the buffers, not the physics; a hold toggles; `set` clamps).
**Acceptance:** every test of §4.4 unchanged and green; `vent-shots.mjs` pictures equal. **Must not touch:**
`packages/ventilator`, `vent-hamilton.html`'s markup and CSS, the link. **Gate:** common with `@pme/demo`, the vent e2e
set. **CI:** 1 run.

### V1: The EDP-TS face, first usable (18 h) — **the first piece a resident can use**
**Depends on:** V0, VR, VQ1. **Files:** `faces/edp-ts/{face.ts, face.css, face.json, modes.ts}`, `faces/index.ts`
(`?face=`), `embed.ts` (`face` option), the face's tests. **What a resident gets:** the screen of §2.2 and the keys of
§2.3 drawn from plain shapes (m1); VCV (constant flow), PCV, PRVC, chosen through the mode window (the manual's titles and rows until the owner's video, VQ7; m2 shows the photographed
version) and its confirmation window; the bottom row with select-turn-press, the 15 s revert, Ctrl steps, Esc; the top row, left column, three
scalars and two loops; the alarm-limit tags and Pressure Limits keys editing the model's limits; the model's alarms in
a red or yellow box (the device's colours, without delays or latching yet); everything not yet honoured present and
unavailable with "needs piece Vn" or its N reason (m2–m4). **Tests first:** (1) every control on the face either
writes a `cfg` key or calls a core action, and a model-level test proves each changes the delivered breath or alarm
(the A1 test: it walks the face's control table); (2) VCV at VT 0.500 L and Ti 1.40 s delivers Ti 1.40 ± 0.005 s and
VT within one step, under the link, at ×1 and ×4 (the matched-flow coupling off); (3) PCV with I:E 1:2.0 at f 12 gives
`itime` 1.67 s; (4) a pending value is not in `cfg` until the knob press, and reverts at 15 s; (5) the frame's `mode` is
the device's name; (6) the provenance coverage test of §5 over `face.json`; (7) an e2e: open `vent-hamilton.html?face=
edp-ts&link=…`, choose PCV with the knob, change PEEP, see the monitor's airway pressure follow. **Must not touch:**
`packages/ventilator`, the Hamilton face. **Gate:** common with `@pme/demo`, the vent e2e set. **CI:** 1 run.

### V1b: Room setup's ventilator face, and the view, window and device follow it (4 h)
**Depends on:** V1, R7 (Room setup) or its base. **Files:** `site.ts` (`ventFace`), `views/room.ts` (the choice),
`views/vent.ts` (iframe address), the laptop window URL, `vent/hamilton-page.ts` (the device page reads the room's
style). **Tests first:** the choice is kept per room and re-sent after a restart; the view's iframe and the device page
wear it; no face chosen → Hamilton-style, every existing room test unchanged. **Gate:** common with `@pme/demo`.
**CI:** 1 run.

### V2: The device's breath behaviours as model options: apnoea backup, Pmax cycling, the ramp to zero (10 h; run-validation)
**Depends on:** V1. **Files:** `packages/ventilator/src/{types.ts, presets.ts, vent.ts}`, its tests;
`faces/edp-ts/modes.ts` (PSV/CPAP and the Backup ventilation window on; Descending on). **The work:** (a) `backupMode:
'off' | 'VC' | 'PC'`, `apneaTime`: in a spontaneous mode with backup set, no breath for `apneaTime` starts the backup
mode's breaths at its own settings until the patient triggers again [M p. 49–50]; with `backupMode: 'off'` the existing
6 s rule is unchanged (Hamilton, fidelity traces); (b) `pmaxAction: 'cap' | 'cycle'`, default `cap`; (c) `flowPattern:
'ramp0'`. **Tests first:** each option off reproduces the reference traces bit for bit (`fidelity.test.ts`,
`reference.test.ts` unchanged); each on: apnoea of 15 s starts VCV backup breaths and the Apnea alarm; a pressure
reaching the limit ends the breath within one 5 ms step; the ramp's flow reaches 0 at Ti and delivers VT. **Gate:**
common with `@pme/ventilator`, `@pme/demo`; validation workflow. **CI:** 1 run + validation.

### V3: The alarm scheme (8 h)
**Depends on:** V1. **Files:** `packages/ventilator/src/alarms.ts` (new ids `lowPressure`, `contHighPressure`,
`highPeep`, `o2High`, `o2Low`; `silenceAlarms(vs, seconds)`; defaults unchanged for Hamilton), `types.ts` (their
limits), `core/alarms-view.ts` (delays and priorities from the face's profile; latching; one message at a time, the
alarm chapter's rule, p. 88, VQ7), the face's lamps, message box, tones (VQ6), Ctrl+Alarm Limits test, Sound volume. **Tests
first:** each delay from §2.10 on a fake clock; a High lamp stays steady after its cause ends until Esc; one press of
silence = 30 s, two = 60 s; the Hamilton banner unchanged. **Gate:** common with `@pme/ventilator`, `@pme/demo`.
**CI:** 1 run. (No mechanics change: no validation.)

### V4: Manoeuvres and displays on the existing model (12 h)
**Depends on:** V1. **Files:** core and face only. Manual Insp.; Insp/Exp Pause held, capped 7 s / 20 s, VCV and PCV
only; Freeze; Save loop (4) and the reference loop; five graphics layouts; scales and autoscale; Patient's Data (GD16,
GD17); Respiratory mechanics: auto-PEEP, Compliance and resistance, Trapped volume, P0.1, PV flex (GX15); screen
lock; Help in the project's words. **Tests first:** the hold releases at 7 s if the key is still held; Cst equals
VT/(Pplat − PEEP) of the model's lung within the display's rounding; PV flex returns every setting it changed; each
test unavailable in a mode the manual excludes. **Gate:** common with `@pme/demo`. **CI:** 1 run.

### V5: Standby and Suction %O2 (8 h; run-validation)
**Depends on:** V3 (the Standby alarm). **Intent (the owner, VQ9):** standby "pause[s] everything", the settings saved;
he uses it to have the ventilator set before the patient is intubated or arrives, and to disconnect for transport when
the patient will come back. Suction: "we do open suctioning routine here", so the suction period opens the circuit at
the patient. **Files:** `packages/ventilator/src/vent.ts` (a `standby` state: no breaths, no alarms but Standby's low
one, settings kept; the frame carries what an open circuit carries, the patient being off the ventilator), core
sequence for suction as the manual reads (§2.11, pp. 39 and 57: 60 s at `fio2 + enrichment`, the suction time with
the circuit opened at the patient, 60 s again), the Tools → Suction configuration window. **To confirm from the
owner's video (§7.3):** whether the key itself pauses the mandatory breaths ("I'm not sure if the suction key does pause
the mandatory ventilation, I know that it changes FiO2 to 100% for some time"); until then the manual's reading
stands. **Tests first:** standby delivers no breath, raises no alarm but Standby, and resumes with the old settings on
Esc; the suction sequence's three phases, the circuit open in the second, and the return to the set oxygen; the engine
sees the oxygen rise and the open circuit in the frames. **Gate:** common with `@pme/ventilator`, `@pme/demo`;
validation workflow. **CI:** 1 run + validation.

### V6: SIMV(VCV)+PSV and SIMV(PCV)+PSV (16 h; run-validation)
**Depends on:** V2 (backup), V3. **Files:** `packages/ventilator/src/{types.ts, vent.ts}` (mode `SIMV` with
`mandatory: 'VC' | 'PC'`; the rate floor lowered to 1 for SIMV only), `views/vent.ts` (`engineVentilation`), the
face's mode table. **Sources:** [M p. 76–79] for the windows; a textbook definition of SIMV for the synchronisation
(for example Chatburn's taxonomy, Respir Care 2014; the executor reads and cites it). **Tests first:** with no patient
effort, mandatory breaths at exactly f; an effort in the first 3/4 of the cycle's expiration gets a PS breath, in the
last 1/4 the next mandatory breath early; Rise Time acts on PS breaths only in SIMV(VCV) and on both in SIMV(PCV);
fTotal counts both kinds; hand-over gives the engine the set f and VT. **Gate:** common with `@pme/ventilator`,
`@pme/demo`, `@pme/controller` (the hand-over); validation workflow. **CI:** 1 run + validation.

### V7: Sighs (5 h; run-validation)
**Depends on:** V2. **Files:** `vent.ts` (`sigh` wired: count, rate an hour, % VT, own pressure limit), the Sighs
window. **Tests first:** at 5 an hour with number 2, two consecutive sigh breaths every 12 min of sim time, each VT ×
(1 + %); the Hamilton face's Sigh checkbox becomes honoured too or is removed (the executor says which; A1 applies to
it as well). **Gate:** as V2. **CI:** 1 run + validation.

### V8: NIV (8 h; run-validation)
**Depends on:** V2. **Files:** `vent.ts` (time-cycled pressure breaths at f and Ti among PS breaths), the face's mode
table, the NIV option to switch the TV and MV alarms off together [M p. 93]. **Tests first:** with no effort, breaths
at f with Ti; with efforts, PS breaths; leak shows `---`. **Gate:** as V2. **CI:** 1 run + validation.

### V9: MMV+PSV and PSV+VT Assured (12 h; run-validation)
**Depends on:** V2, V3. **Files:** `vent.ts`, `alarms.ts` (`targetNotReached`). **Tests first:** MMV raises PS at most
2 cmH2O a breath until V̇E reaches the target and stops at the limits with the medium alarm; VT Assured switches to
constant flow when the PS breath would end short of VT and stops at VT or 3 s. **Gate:** as V2. **CI:** 1 run +
validation.

### V10: APRV (14 h; run-validation)
**Depends on:** V2, V3. **Files:** `vent.ts` (two levels and times; spontaneous breaths with optional PS at both;
the release), the face's APRV keys. **Sources:** [M p. 83–84]; Habashi, Crit Care Med 2005 (the executor reads and
cites). **Tests first:** Ti High 5.0 / Ti Low 1.5 gives 9.2 cycles a minute with no effort; an effort at PEEP High gets
a PS breath on top without cycling the level; inverse I:E displayed. **Gate:** as V2. **CI:** 1 run + validation.

### V11: PRVC as the device runs it (5 h; run-validation)
**Depends on:** V3. **Files:** `vent.ts` (a `prvcTest` option: the 0.5 s constant-flow test breath, the PEEP + 5 …
limit − 5 range, re-test on the four events of [M p. 86]), `alarms.ts` (`targetNotReached`, shared with V9). The
Hamilton face keeps today's PRVC (option off). **Gate:** as V2. **CI:** 1 run + validation.

### V12: The start-up sequence, with instructor-chosen failures and an off switch (14 h; version 2)
**Depends on:** V1, V4 (the sim-tools handle), VD. **The ruling (VQ4 = C with a switch, version 2):** "C but with the
option to have the start up sequence turned off in settings" and "I prefer to have the main ventilator working now and
this as v2". **Until V12 the face opens at the mode window.** **Files:** face and core only: category (ADL; PED and NEO
unavailable, VQ3), IBW and mL/kg → VT, the humidifier choice (unavailable, the reason), scripted screens for the
circuit leak test, PEEP valve, expiratory flow sensor, oxygen sensor and compliance (§2.5) with the manual's messages
and the knob/Esc choices; two failures the instructor chooses before or during the sequence from the sim-tools handle
— a leak over 10 L/min (the sequence stops, ventilation impossible until a redo) and an oxygen sensor fault (Oxygen
shows `---`); a setting "Start-up sequence: on/off" (Room setup's ventilator card, kept per room; off = today's start
at the mode window). **Tests first:** off → the mode window at once; on → every step in the manual's order; a chosen
leak stops the sequence and refuses ventilation; an oxygen fault leaves ventilation possible with Oxygen `---`.
**Gate:** common with `@pme/demo`. **CI:** 1 run. (14 h against the draft's 6 h: the screens and their texts 6 h, the
two failures and their instructor control 5 h, the setting 1 h, tests 2 h, est.)

### V13: Records: trends, activated alarms, saved loops (6 h)
**Depends on:** V3, V4. **Files:** core record, face windows. **Gate:** common with `@pme/demo`. **CI:** 1 run.

### V14: Capnography at the ventilator, with an on/off setting (10 h; version 2)
**Depends on:** V4, VD. **The ruling (VQ10):** "in scope, needs a setting for on and off and a V2 feature". **Files:**
an additive link message carrying the engine's CO2 wave and EtCO2 to the cockpit (`packages/ventilator/src/link/`, and
the controller's `vent` guard of R8a, which lists the bodies it accepts); a setting "Capnography at the ventilator:
on/off" (Room setup's ventilator card; off = the CO2 layout, ETCO2, VCO2 and VD/VT unavailable, as in version 1); the
CO2 layout, EtCO2 alarms (high priority), VD/VT with a typed PaCO2. No engine change. **Gate:** common with
`@pme/ventilator`, `@pme/controller`, `@pme/demo`. **CI:** 1 run.

### V15: Tube compensation (20 h; version 2; run-validation)
**Depends on:** V2, VD. **Why it is big (VQ5):** the model has ONE linear airway resistance, with the tube lumped into
it (`resistance`, from the engine's `lungState`). Honest compensation needs the tube as its own flow-dependent element
(a Rohrer-type pressure drop, P = K1·V̇ + K2·V̇², by inner diameter 4–12 mm and for tracheostomy tubes), the
patient's own airway resistance separated from it, the tracheal pressure computed and drawn (a white curve and "Trach."
under Peak, [M p. 52–53]), the compensation % applied in the pressure modes the manual lists, and the fidelity and
regression traces re-recorded with the cause stated. **Sources to find and cite** (the executor reads them; none is
verified here): Guttmann et al., Anesthesiology 1993 (continuous calculation of intratracheal pressure; tube
coefficients by size); Fabry et al., Intensive Care Med 1997 (automatic tube compensation); a tracheostomy-tube
resistance series for the tracheostomy coefficients; the engine's own airway model, to learn whether its resistance
already includes a tube (if it does, the split touches `engine-core` and the piece carries the validation workflow by
CI's own rule as well). **Tests first:** at zero compensation the breath is unchanged; at 100 % the tracheal pressure
follows the set pressure within the stated tolerance at each size; the Hamilton face's TRC checkbox is honoured by the
same mechanism or removed (A1). **Gate:** common with `@pme/ventilator` (and `@pme/engine-core` if the split reaches
it); validation workflow. **CI:** 1 run + validation.

### VD: EDP-TS becomes the default face (2 h; the last piece of version 1)
**Depends on:** V1–V11, V13 merged and tried (VQ8: "Hamilton for now but as soon as EDP-TS is finished it should be the
default face"). **Files:** `faces/index.ts` (the default), `site.ts` (a room with no choice gets `edp-ts`), the e2e
tests that open the cockpit without `?face=` (they pass `face=hamilton-style` explicitly, or follow the new default,
each said in the PR). Hamilton-style stays a choice in Room setup and by address. **Gate:** common with `@pme/demo`, the
vent e2e set. **CI:** 1 run.

### 7.1 Order, totals, CI load

```
VR ─┐
V0 ─┴─► V1 ─► V1b
         ├──► V2 ─► V6 ─► (V7, V8)
         │     └──► V9, V10 (after V3)
         ├──► V3 ─► V5, V11, V13
         ├──► V4 ─► V13
         └──► ... V1–V11, V13 ─► VD ─► version 2: V12, V14, V15
```
**Merge order (VQ2 = A: each mode merged and tried before the next):** VR, V0, V1, V1b, V2, V3, V4, V6, V5, V11, V9,
V8, V7, V10, V13, **VD**; then version 2: V12, V14, V15. **Hours, version 1:** VR 3, V0 6, V1 18, V1b 4, V2 10, V3 8,
V4 12, V5 8, V6 16, V7 5, V8 8, V9 12, V10 14, V11 5, V13 6, VD 2 = **137 h**. **Version 2:** V12 14, V14 10, V15 20 =
**44 h**. **Total 181 h.** **CI load:** 16 PRs in version 1, 3 in version 2, one full run each; **`run-validation`**
on V2, V5, V6, V7, V8, V9, V10, V11 (version 1) and V15 (version 2): 9 validation runs. No version-1 piece touches
`packages/engine-core`; V15 may (§V15).

### 7.2 Version 1 and version 2

- **Version 1, the working ventilator** (the owner: "I prefer to have the main ventilator working now"): VR (the
  research note every face value cites), V0, V1, V1b, V2–V11, V13, and the default switch VD at its end. At the end of
  version 1 the EDP-TS face has every mode of the device, its alarm scheme, standby and suction, the manoeuvres and
  records, and becomes the default face (Hamilton-style remaining a choice).
- **Version 2:** the start-up sequence with its failures and off switch (V12), capnography with its on/off setting
  (V14), tube compensation (V15). Until then their controls are present and unavailable with the reason "version 2".
- **Later, outside this plan:** the paediatric and neonatal groups, when the engine has their physiology (VQ3; its
  own roadmap row).

### 7.3 What the owner brings from the device

1. **A detailed video of the device being operated** (VQ7): the Mode key and choosing a mode; the Menu key pressed one
   to four times; the Alarm Limits key and one limit changed; one setting changed with the knob (select, turn, press,
   and what happens without the press); the Suction %O2 key through its whole sequence (does it pause the mandatory
   breaths, what oxygen does it give); how Freeze is left; the Rise Time key and its values; Esc on a latched lamp.
   It settles §2.14's points, GP11 and V5's open question; until it arrives the manual decides.
2. **The alarm sound at each priority** (VQ6: "I'll record the ventilator alarm sounds so you can get the pitch"): high,
   medium and low, and Vent Inop if it can be heard. Until then the tones' pitches are an engineering choice, tagged
   `eng` in the face's provenance; the pulse counts are the manual's.

---

## 8. Risks, and the owner's decisions

**Risks.**
- **R1 Naming and affiliation.** The face carries the device's own name at the owner's ruling (VQ1) and copies its
  layout closely. Mitigation: no logo or mark drawn, plain bezel, measured tokens rather than artwork, the README
  sentence of §5 saying the project is not affiliated.
- **R2 A face that pretends (A1).** Mitigation: §3's table is the face's control table; V1's walking test; every N row
  carries its reason; a reviewer checks m1–m4 against the built face.
- **R3 Hamilton regressions in V0.** Mitigation: §4.4's list, the DOM-equality fixture, V0 touches no mechanics.
- **R4 New modes without device traces.** SIMV, MMV, VT Assured, APRV, NIV are built from the manual and the literature;
  no EDP-TS trace exists to compare. They are teaching mechanics, said so in the known deviations; their numbers come
  from the manual's pages, never fitted.
- **R5 Manual against device.** The 2018 manual differs from the department's software (§2.14). By the owner's ruling
  the manual decides until his detailed video (VQ7, §7.3); the points where the photographs already show otherwise
  are listed so the video settles them.
- **R6 Load and CI time.** 19 PRs, 9 validation runs. Mitigation: the modes are independent after V2–V3 and can be
  spaced; the pieces that do not change mechanics run no validation.
- **R7 The video shows no operation.** The key and knob sequences rest on the manual and three photographs; the owner
  will provide a detailed video (§7.3). V1 is built on the manual meanwhile; what the video changes is a later
  data-and-face PR.
- **R8 Hand-over.** A patient in SIMV or APRV handed to the engine's volume-control ventilator changes pattern; each
  mode piece maps it in `engineVentilation` and its test says what the engine receives.

**Decisions** (the owner ruled all ten on 10 November 2026; each keeps its question and options for the record, the
proposal replaced by the ruling).

**VQ1 — What is the face called, and whose name appears?**
The README promises no logos or trade dress; the monitor's Saadat skin names its maker in the chooser; the pump plan
names the department's devices.
A. `edp-ts-like`, "EDP-TS-like (the department's ICU ventilator)" in Room setup; no maker name, no mark on the face.
B. Maker and device named: "Ehya Darman EDP-TS-like".
C. No device name: "Iranian ICU ventilator".
**Ruling (10 November 2026): B — "B is fine, call it 'EDP-TS'".** The face is "EDP-TS", id `edp-ts`, `?face=edp-ts`; no
logo artwork drawn; the README sentence of §5.

**VQ2 — Which missing modes, in which order?**
Three modes run today under the device's names (VCV, PCV, PRVC). Seven need mechanics (§3).
A. All, in the order of §7 (SIMV first). B. SIMV, NIV and APRV only. C. Only SIMV(VCV)+PSV.
**Ruling (10 November 2026): A** — all, in the plan's order, each merged and tried before the next (§7.1).

**VQ3 — Adults only, or the paediatric group too?**
A. ADL only; PED shown unavailable at start-up. B. PED's ranges and defaults on the adult patient.
**Ruling (10 November 2026): A for now** — "A for now, pediatrics and neonates when the physiology are added later".
PED and NEO unavailable with the reason; a roadmap row.

**VQ4 — The start-up calibration?**
A. Skip: the face starts at the mode window. B. Scripted calibration screens that always pass. C. B, plus
instructor-chosen failures (a leak over 10 L/min, an oxygen sensor fault).
**Ruling (10 November 2026): C with an off switch, as version 2** — "C but with the option to have the start up
sequence turned off in settings"; "I prefer to have the main ventilator working now and this as v2". V12 (14 h).

**VQ5 — Tube compensation?**
A. Unavailable. B. Built later as a sourced mechanic.
**Ruling (10 November 2026): version 2** — V15 (20 h, sources in §7); unavailable with the reason until then.

**VQ6 — Alarm sound on the face?**
A. Tones with the documented pulse counts, pitches an engineering choice. B. Silent.
**Ruling (10 November 2026): A** — "I'll record the ventilator alarm sounds so you can get the pitch" (§7.3).

**VQ7 — Where the manual is silent or contradicts itself, what do we follow?**
A. The department's device, checked by the owner. B. The manual's tables, the photographs where they show it, my
choices marked `eng` elsewhere.
**Ruling (10 November 2026): B, with the manual deciding** — "B but I need to provide a video with more details. until
then everything should be based on the manual. the yellow tag can show the high or low limit or both depending on the
symbol. and we should adopt that." Applied in §2.10, §2.14 and GP11.

**VQ8 — Which face is the default?**
A. Hamilton-style everywhere until a room chooses. B. EDP-TS for new rooms of the department's kit.
**Ruling (10 November 2026):** "Hamilton for now but as soon as EDP-TS is finished it should be the default face" —
Hamilton-style until version 1 is complete, then EDP-TS the default for everyone (piece VD), Hamilton-style a choice.

**VQ9 — Suction and standby: is the patient disconnected?**
A. The suction phase opens the circuit. B. The circuit stays closed; no breaths are given.
**Ruling (10 November 2026): A for suction** — "we do open suctioning routine here"; the key's behaviour follows the
manual until the video, with the owner's doubt about the mandatory breaths to confirm. **Standby:** "it pause
everything", settings saved; its uses in V5's intent.

**VQ10 — Capnography at the ventilator, and the language of the reasons?**
A. V14 in scope; reasons in the app's language. B. V14 out; reasons in English.
**Ruling (10 November 2026):** capnography "in scope, needs a setting for on and off and a V2 feature" (V14, version
2); the reasons in English only — "there is no translation for the actual devices! none of the devices (instruments)
have persian settings inside" (§6).

---

## 9. Sources read, and what could not be read

| Source | How it was read |
|---|---|
| EDP-TS user manual (Persian, 130 pp., WPM2-5, summer 1397) | All 130 pages: the text layer of every page (pdftotext, page by page); 27 pages with tables or screen figures also as images at 80 dpi (pp. 13–16, 34, 37, 39–40, 46–47, 50, 56–57, 70, 72, 75–77, 79, 81–82, 84–85, 87, 93, 129–130) and two crops at 130–160 dpi (p. 120's table, p. 130's quick-guide panel) |
| IMG_1542, IMG_1544–IMG_1547 (HEIC) | converted with `sips` to 1600 px JPEG copies in the scratch folder and read whole; colours sampled from IMG_1542, IMG_1544, IMG_1546 |
| IMG_1543.MOV | 1 frame a second at 480 px as 4 × 3 contact sheets, three 40 s sections; three frames at 1 280 px (0:03, 1:02, 1:52); frames deleted after reading |
| The code on c13cb826 | the files named in "Base and inputs", by function |
| The plans | `room-and-instruments.md` (R5b, R8a–R8d), `pump-rack-tci.md` (header, SK1, SK2, PQ2), `scenario-builder.md` (header, mock-up convention) |
| The research note (piece VR) | [`research/57-edp-ts-ventilator.md`](../../research/57-edp-ts-ventilator.md): §2 re-read fact by fact, each row tagged and cited; its last section lists where it differs from §2 |

**Could not read or see, plainly:**
- **The device being operated**: the video shows the running screen only (§2.1, R7).
- **Pages 129–130** are scans of a printed quick guide: legible only in part at the resolution rendered; used for the
  right-column key list (p. 130), which the text pages confirm (p. 15).
- **Small numbers in the video**: at 480 px the alarm-limit tags and some top-row values are not legible; the 1 280 px
  frames were read instead.
- **The I:E range** prints "1:599–5:1" (p. 120): probably 1:59.9, not certain.
- **The NIV default I:E** prints "3.3:1" (p. 85), which does not follow from its Ti and f.
- **The PSV pressure-cycling criterion** (p. 73) reads as "14 % of the set pressure plus 5 cmH2O", unclear.
- **Rise Time's range and step, the suction time's range, the %O2 enrichment's range, the deep manual breath's size,
  PEEP High/Low's own ranges**: not in the manual (named gaps).
- **The top of the device's bezel** (where a maker's mark would be) is outside every photograph.
- **Glare** covers part of the loop panels in every photograph and most video frames; the loops' axis numbers were
  read from IMG_1546 and the 1:52 frame.

---

## Mock-ups

`docs/plans/vent-skin-edp-ts/mockup/`: `m1-main` (the main screen in SIMV(VCV)+PSV, Exp. Sensitiv. selected),
`m2-modes` (Operative Modes and Other Operative modes, unbuilt modes unavailable), `m3-alarms` (a high-priority alarm
and the Alarm settings window), `m4-menu` (Menu and Ventilatory adjuncts with the N rows unavailable), each with its
PNG at 1180 × 870. Drawn from plain shapes and `face.css`'s proposed tokens with the app's own font tokens
(`app.css`); no photograph, frame or manual page is used. Their `README.txt` says what is product and what is
illustrative.
