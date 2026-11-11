# 57. The EDP-TS ventilator as its sources show it: every fact with its page, photograph or video time

Brief 142, 11 Nov 2026; piece VR of [`docs/plans/vent-skin-edp-ts.md`](../docs/plans/vent-skin-edp-ts.md) (PR #402).
Research only: no code, test, face or data file changes. This note restates the plan's §2 ("The device as documented")
as a reference a later executor cites row by row (`research/57 T-07`). Every row was re-read in its source while this
note was written; where what I read differs from the plan's §2, the source wins here and the difference is listed at the
end ("Differences from the plan's §2").

The device is named as the owner's VQ1 ruling allows: the face is "EDP-TS", the maker Ehya Darman Pishrafteh is named
here and in the face's provenance, and no logo or mark is drawn. The device's on-screen words are English; this note
gives the screen's English words and writes no Persian (§6 of the plan, VQ10).

## How to read this note

**The sources** (all on the owner's machine in `assets/ventilators/edp-ts/`, git-ignored; none of them, and no copy,
crop, frame or page image of them, is in this repository):

| Short name | What it is | How I read it |
|---|---|---|
| **M** | The EDP-TS user manual, Persian, 130 pages, document code WPM2-5, edition of summer 1397 (2018); the PDF's own page numbers, which equal the printed "Page N of 130" | The text layer of every page (`pdftotext -layout`, page by page); 26 pages also rendered at 80 dpi to read their figures and tables: pp. 14–16, 34, 37, 39, 46–47, 50, 56–57, 70, 72, 75–77, 79, 81–82, 84–85, 87, 92–93, 129–130 |
| **IMG_1542, IMG_1544, IMG_1545, IMG_1546, IMG_1547** | Five photographs (HEIC) of the department's device in use, 6 November 2026; the device's clock reads 12:07 (IMG_1542) and 12:08 (the others) | Converted with `sips` to 1600 px JPEG copies in a scratch folder outside the repository, read whole, then deleted |
| **IMG_1543** | One video (MOV), 1920 × 1080, 30 frames/s, 118.7 s, with an audio track; device clock 12:07 | Single frames at 1280 px (0:03, 1:02, 1:52) and a contact sheet of the top-left region at 0:20, 0:45, 0:51, 0:58, 1:10, 1:17, 1:25, 1:40; frames deleted after reading. The audio track was not analysed |

**The tags** (the "how firm" column; the brief's five kinds plus the plan's §5 `measured` and `inferred`):

| Tag | Meaning | Face provenance tag it supports (plan §5) |
|---|---|---|
| `M` | read in the manual's text layer, on the page cited | `documented` |
| `F` | read from a figure or a table image of the manual (a screen picture, a default bar), on the page cited | `documented` |
| `P` | read from a photograph of the department's device | `documented` (the device's own word or number), with the photograph as source |
| `V` | read from the video, at the time cited (m:ss) | `documented`, with the video time as source |
| `meas` | a colour sampled from a photograph, method stated | `measured` |
| `I` | my inference from the cited rows; never a source value | `inferred` |
| `GAP` | not in any source I could read; written as a gap, never filled | `eng` if the face must show something, until the owner's recordings (§7.3 list below) |

A row with two sources names both; its tag is the firmer kind. "ADL" is the adult group, "PED" the paediatric group,
"NEO" the neonatal group (an optional add-on of the device). Values are written exactly as the source prints them,
units included; a range printed high-to-low in the manual's right-to-left tables (for example "2.5-0.05") is written
low-to-high here with the source's own figures.

---

## 1. The video (IMG_1543)

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| V-01 | Format and length | 1920 × 1080, 30 frames/s, 118.7 s; an audio track is present | IMG_1543 (container) | V |
| V-02 | Category and mode throughout | "ADL", "SIMV(VCV)+PSV", "Backup: OFF" | V 0:03, 1:02, 1:52 | V |
| V-03 | Set values throughout | VT 0.500 L, Ti 1.40 s, I:E 1:2.5, f 12 bpm, PSV 8 cmH2O, Exp. Sensitiv. 25 %, PEEP 5 cmH2O, Sens 3.0 L/min, Oxygen 40 % | V 0:03, 1:02, 1:52 | V |
| V-04 | No window open, no key selected, the knob not turned, in the frames read | none of the frames read shows a window or a blue (selected) key | V 0:03, 1:02, 1:52 and the contact sheet | V |
| V-05 | The lung icon in the left column comes and goes | present at 1:25, absent at 0:03 and 1:52 (present in IMG_1542) | V 0:03, 1:25, 1:52; IMG_1542 | V |
| V-06 | Its meaning | the icon is active when the patient makes an effort to breathe | M p. 16 | M |
| V-07 | Both alarm lamps lit, no alarm message on the screen | High lamp lit (red-orange), Med/Low lamp lit (amber); no message box | V 0:03, 1:02, 1:52 | V |
| V-08 | Reading of V-07 | the manual's remaining ("latched") signal: a front lamp stays lit, steady, after its cause has ended, until Esc (rows A-15, A-16) | M p. 91 Table 9-4 | I |
| V-09 | Paw below zero with the patient's efforts | the Paw trace dips under the 0 line; Paw axis printed from 7 below zero to 35 | V 0:03, 1:02 | V |
| V-10 | Measured PEEP 0.0 and VT 0.000 L | at 0:58, 1:02, 1:10 and 1:17; not at 0:51 (PEEP 4.6, VT 0.795) nor at 1:25 (PEEP 3.1, VT 0.388) | V 0:51–1:25 | V |
| V-11 | Peak during V-10 | 19 at 0:58 and 1:02; 31 at 1:10, 1:17 and 1:25 | V 0:58–1:25 | V |
| V-12 | VT 0.000 L also outside V-10 | at 0:03, with PEEP 5.6, Peak 14, Peak Flow 0.0, Ti 0.20, Te 0.30, I:E 4.6:1 | V 0:03 | V |
| V-13 | Reading of V-10 and V-11 | the circuit opened at the patient (suction or a disconnection); no message box is legible | V 0:58–1:17 | I |
| V-14 | The loops draw the current breath, phase-coloured | one loop, green inspiration, red expiration | V 1:52 | V |
| V-15 | A top-row value dimmed at times | Te dimmed at 0:03 | V 0:03 | V |
| V-16 | Why values dim | not in the manual | M (searched) | GAP |

## 2. The screen, region by region

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| R-01 | Screen type | colour TFT-LCD, resistive touch | M p. 117 Table 13-3 | M |
| R-02 | Screen size | 12.1 inch (p. 13 says "12 inch") | M p. 117 Table 13-3; M p. 13 | M |
| R-03 | Resolution | 800×600 | M p. 117 Table 13-3 | M |
| R-04 | Settings region | the bottom of the screen holds the set parameters of the chosen mode; they differ by mode | M p. 13; F p. 14 Figure 3-2 | M |
| R-05 | Top-left block | mode, patient category, backup mode if any, date and time | M p. 14 | M |
| R-06 | Top-left block on the device | "ADL" (blue), "SIMV(VCV)+PSV", "Backup: OFF", "06/11/26" "12:07" | IMG_1542 | P |
| R-07 | Top row, eight cells, left to right | Peak Flow (L/min), Ti (s), Te (s), I:E with the word "Current", fTotal (bpm), VT (L), V̇E (L/min), Oxygen (%) | IMG_1542; M p. 15 | P |
| R-08 | Ti as monitored | shown in every mode and breath; a pause, when active, is added to it | M p. 15 | M |
| R-09 | fTotal | total breaths a minute, spontaneous and mandatory | M p. 15 | M |
| R-10 | VT unit | litres for ADL/PED, millilitres for NEO | M p. 15 | M |
| R-11 | Alarm-limit tags | touch keys under some top-row values; they open the matching alarm setting and show its min and max | M p. 14 | M |
| R-12 | The four tags on the device | fTotal: max only, "30"; VT: "0.750" / "0.250"; V̇E: "8.50" / "2.41"; Oxygen: "50" / "30"; yellow | IMG_1542 | P |
| R-13 | Message bar | light blue; four status icons, the first lit; the text "Volume compensation" | IMG_1542 | P |
| R-14 | The volume-compensation icon | an icon shows that volume compensation is on | M p. 53 | M |
| R-15 | Messages that do not fit | rotate every 5 s, with an arrow icon in the top corner | M p. 17 | M |
| R-16 | Alarm message box | on the right of the screen, the active alarm's name in a red or yellow box; the colour is its priority | M p. 17, Figure 3-5 | M |
| R-17 | Its background colour | the same as the matching lamp's colour | M p. 91 | M |
| R-18 | Left column, top to bottom (device) | battery icon (green), lung icon, "Peak" with "Trach." under it, "Plateau", "Mean", "PEEP", a yellow tag "20.0", "Pressure Limits" with two yellow keys "40" (max) and "5" (min) | IMG_1542 | P |
| R-19 | Battery icon states | full, low, empty or very low; on the empty icon the running time cannot be predicted | M p. 16 | M |
| R-20 | Peak | the maximum pressure of each breath | M p. 16 | M |
| R-21 | Plateau | the pressure held in the lung in inspiration, when a pause is active or Insp/Exp Pause is pressed | M p. 16 | M |
| R-22 | Mean | the mean pressure of each breath | M p. 16 | M |
| R-23 | PEEP (monitored) | the mean airway pressure of the last 50 ms of expiration | M p. 17 | M |
| R-24 | The left column's three touch keys | maximum inspiratory pressure, minimum inspiratory pressure, maximum PEEP | M p. 15 | M |
| R-25 | Tracheal pressure under Peak | shown there when tube compensation is on | M p. 53 | M |
| R-26 | Centre: three scalars, left to right, 12 s sweep | Paw (cmH2O), VT (L), V̇ (L/min) | IMG_1542; V 1:02 | P |
| R-27 | Paw axis | 7 below zero to 35, labels 35, 28, 21, 14, 7, 0, 7 | IMG_1542 | P |
| R-28 | VT axis | 0.2 below zero to 1.0 | IMG_1542 | P |
| R-29 | V̇ axis | 60 below zero to 60 | IMG_1542 | P |
| R-30 | Trace colours | inspiration green, expiration red; light-blue axis strips | IMG_1542 | P |
| R-31 | Right of centre: two loops | VT against Paw (above), V̇ against VT (below) | IMG_1542 | P |
| R-32 | The default screen | "5 curves": pressure, volume, flow, pressure/volume, flow/volume | M p. 64 Figure 7-2 | M |
| R-33 | Right column, seven touch keys, top to bottom | Graphics, Freeze (snowflake), Respiratory mechanics, Save loop, Nebulizer, Help ("?"), Standby | IMG_1542; M p. 15 | P |
| R-34 | Keys dimmed while a window is open | Respiratory mechanics and Standby keys dimmed with Operative Modes or Menu open | IMG_1544, IMG_1547 | P |
| R-35 | Bottom row on the device, left to right | VT 0.500 L, Ti 1.40 s, I:E 1:2.5, f 12 bpm, PSV 8 cmH2O, Exp. Sensitiv. 25 %, PEEP 5 cmH2O, Sens 3.0 L/min, Oxygen 40 %, Rise Time (icon), Flow Waveform (icon) | IMG_1542 | P |
| R-36 | Top-row values dimmed at times | I:E "1:1.3" dimmed at 12:07; fTotal "17" dimmed at 12:08; Ti and Te dimmed at 12:08 | IMG_1542; IMG_1544; IMG_1546 | P |

## 3. Hardware: keys, knob, lamps

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| H-01 | The lamps' group label | "Alarm Signals" | IMG_1542 | P |
| H-02 | Lamps, top to bottom | "Vent Inop" (triangle), "High" (triangle), "Med Low" (circle) | IMG_1542 | P |
| H-03 | Vent Inop lamp | red; the device has a technical fault and cannot run; lit briefly in the start-up test without meaning a fault; highest priority | M p. 18; M p. 90 Table 9-2 | M |
| H-04 | High lamp | red; high-priority alarms | M p. 18; M p. 90 Table 9-2 | M |
| H-05 | Med/Low lamp | yellow; p. 18 says low-priority alarms, Table 9-2 says medium/low | M p. 18; M p. 90 Table 9-2 | M |
| H-06 | Flash rates | high: red, fast; medium: yellow, slow; low: yellow, steady (no flashing) | M p. 90 Table 9-1 | M |
| H-07 | The light on the top of the cabinet | lit with the alarm signals, yellow or red to match; not a remaining signal: it goes off when the cause ends | M p. 23; M p. 90 Table 9-2; M p. 91 | M |
| H-08 | Alarm Limits key | opens the alarm settings window; on the right of the device | M p. 18; M p. 92 | M |
| H-09 | Silence key | one press pauses audio 30 s, two presses 60 s; printed "30-60 s" under it | M p. 18; M p. 92; IMG_1542 | M |
| H-10 | Menu key | opens the main menu; twice: Ventilatory adjuncts; three times: Tools; four times: back to the main menu | M p. 18; M p. 50; M p. 56 | M |
| H-11 | Mode key | opens the window of modes | M p. 18; M p. 33 | M |
| H-12 | Screen Lock key (padlock, under the screen) | held 2 s: locks the touch screen and the right-hand fixed keys; the bottom keys and the knob stay live; pressed again: unlocks | M p. 41; IMG_1542 | M |
| H-13 | Lock and alarms | an alarm unlocks the screen; it must be locked again by hand | M p. 41 | M |
| H-14 | Suction %O2 key | suction with set oxygen and time (rows K-01 to K-04); started, then confirmed with the knob | M p. 19; M p. 39 | M |
| H-15 | Manual Insp. key | one breath with the mode's set parameters | M p. 19; M p. 40 | M |
| H-16 | Ctrl + Manual Insp. | one deep breath | M p. 19 | M |
| H-17 | Size of the deep breath | not in the manual | M (searched) | GAP |
| H-18 | Insp/Exp Pause key | holds inspiration at most 7 s, expiration at most 20 s | M p. 19; M p. 120 | M |
| H-19 | Insp/Exp Pause, duration | no fixed time: the pause lasts while the key is held; pressed before expiration starts for the inspiratory pause | M p. 40 | M |
| H-20 | Insp/Exp Pause, modes | p. 19: active in VCV and PCV; pp. 78, 79 list "manual insp/exp pause" among the functions of SIMV(VCV)+PSV and SIMV(PCV)+PSV | M p. 19; M p. 78; M p. 79 | M |
| H-21 | Ctrl + Alarm Limits | (1) alarm test; (2) the help text of an active alarm (causes and remedies) | M p. 19; M p. 88 | M |
| H-22 | Ctrl + Oxygen | Oxygen in steps of 10 | M p. 19 | M |
| H-23 | Ctrl + Ctrl | resets all sensors | M p. 19 | M |
| H-24 | Ctrl + Graphics | (1) refreshes the screen; (2) clears the saved curve from the screen (it stays in memory) | M p. 19; M p. 68 | M |
| H-25 | Esc | resets the alarm LEDs of alarms that have ended; cancels the running operation; closes the current window; closes the active menu | M p. 19 | M |
| H-26 | Knob | bottom right; moves through menus and values; changes curve scales; moves on-screen cursors; pressed: confirms | M p. 19 | M |
| H-27 | Knob ring | lit blue | IMG_1544, IMG_1546, IMG_1547 | P |
| H-28 | Power lamps | green on, other off: mains (110 or 220 VAC); first off, blue on: internal battery; both green: mains, battery charging | M p. 20 Table 3-1 | M |
| H-29 | Power lamps' labels | "VAC", "Battery/Charge" | IMG_1542 | P |
| H-30 | Bottom key labels on the device | padlock, "Suction %O2", "Manual Insp.", "Insp/Exp Pause", "Ctrl", "Esc" | IMG_1542 | P |
| H-31 | Right-hand key labels on the device | "Alarm Limits", "30-60 s", "Menu", "Mode" | IMG_1542 | P |

## 4. How a setting is changed, how a mode is chosen, standby

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| O-01 | Changing a setting | touch its key (its colour changes), turn the knob to the value, press the knob to apply | M p. 35 | M |
| O-02 | The selected colour | blue | IMG_1546 (Exp. Sensitiv. selected) | P |
| O-03 | Selection timeout | a key touched with no change for 15 s leaves selection | M p. 35 | M |
| O-04 | Confirmation timeout | a changed value not confirmed within 15 s returns to the previous value | M p. 35 | M |
| O-05 | Ctrl before a change | some settings (marked "*" in Table 13-8) then step in larger or smaller increments | M p. 121 note 1 | M |
| O-06 | Sens, flow or pressure | touching Sens twice switches from flow (L/Min) to pressure (CmH2O) triggering | M p. 42 | M |
| O-07 | Default trigger type | flow, in every mode | M p. 42; M p. 43 | M |
| O-08 | Mode window opens | after the start-up calibration, or with the Mode key | M p. 33 | M |
| O-09 | Manual's mode window (2018) | titled "Ventilation Modes": VCV, PCV, PSV/CPAP, SIMV(PCV)+PSV, Noninvasive (NIV), "Other ventilation Modes ▸" | F p. 34 Figure 5-1 | F |
| O-10 | Manual's second window | titled "Other ventilation Modes": SIMV(VCV)+PSV, MMV+PSV, PSV+VT Assured, APRV, PRVC, and again a row "Other ventilation Modes ▸" | F p. 34 Figure 5-1 | F |
| O-11 | Device's mode window | titled "Operative Modes": VCV, PCV, PSV/CPAP, SIMV(PCV)+PSV, SIMV(VCV)+PSV, Noninvasive (NIV), "Other Operative modes ▸" | IMG_1544 | P |
| O-12 | Device's second window | also titled "Operative Modes": MMV+PSV, PSV+VT Assured, APRV, PRVC, "Other Operative modes ▸" | IMG_1545 | P |
| O-13 | Footer of every window | "Press [Knob] Select - [Esc] Exit" | F p. 34; IMG_1544 | F |
| O-14 | Confirmation window | "Mode VCV", "Press control knob to start", "Press Esc to exit" | F p. 34 Figure 5-2 | F |
| O-15 | Settings before the start | may be changed before the knob press, or the mode starts with its defaults | M p. 33 | M |
| O-16 | Mode change while ventilating | allowed | M p. 33 | M |
| O-17 | Backup first | a mode that needs a backup, chosen for the first time after power-on, needs its backup set first: Menu → Backup ventilation, set, Accept, then the knob starts ventilation | M p. 35; M p. 36 | M |
| O-18 | Modes that need a backup (ADL/PED) | mandatory: PSV/CPAP, MMV+PSV, PSV+assured VT; optional: SIMV(VCV)+PSV, SIMV(PCV)+PSV, APRV | M p. 49 Table 6-1 | M |
| O-19 | Standby | the Standby key, confirmed with the knob; Esc leaves standby and ventilation resumes with the previous settings | M p. 37 | M |
| O-20 | Standby with a window open | the Standby key does not act | M p. 37 | M |
| O-21 | Standby state | the ventilator stays on, does not ventilate, keeps the previous settings; the battery charges; a low-priority alarm | M p. 97 Table 9-9 | M |

## 5. Patient category and start-up

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| U-01 | Groups | ADL and PED; NEO only if the maker adds it to the device | M p. 3; M p. 118 footnote | M |
| U-02 | Category choice | only at start-up; to change it, switch off and start again | M p. 24; M p. 25 | M |
| U-03 | Start-up step 1 | an automatic check, no user action | M p. 24 | M |
| U-04 | VT from IBW | the IBW window sets IBW and mL/kg; the VT that follows is shown in the same window | M p. 25 Figure 4-1 | M |
| U-05 | mL/kg default | 6 mL/kg for every group; kept through power-off (the last set value returns) | M p. 25 | M |
| U-06 | What IBW changes | only the initial VT; other parameters keep their values | M p. 26 | M |
| U-07 | IBW tables | women from 54 in (137.2 cm, IBW 31.6) to 72 in (182.9 cm, IBW 73.2); men from 60 in (152.4 cm, IBW 50) to 78 in (198.1 cm, IBW 91.6); VT ranges at 4–6, 6–8, 8–10 mL/kg | M p. 26 Table 4-1; M p. 27 Table 4-2 | M |
| U-08 | The IBW values follow | the Devine formula: 45.5 kg (women) and 50 kg (men) at 60 in, +2.3 kg an inch; the same as the model's `pbw` | M pp. 26–27 | I |
| U-09 | Humidifier choice at start-up | Active, Passive (HME filter), None (for the technical service; not while ventilating a patient) | M p. 27; M p. 54 | M |
| U-10 | Calibration set-up | the Y-piece occluded; air and O2 both connected; no nebulizer connected | M p. 28; M p. 29 | M |
| U-11 | Calibration steps | circuit leak test, PEEP valve, expiratory flow sensor, oxygen sensor, circuit compliance | M p. 29 | M |
| U-12 | Leak test | under 10 L/min: the knob continues, Esc repeats (ventilating is not advised); over 10 L/min: calibration stops and cannot continue | M p. 30 | M |
| U-13 | Ambient pressure | entered once per site: Menu → Tools → Setting → Mean ambient pressure | M p. 29; M p. 59 | M |
| U-14 | After calibration | the mode window opens | M p. 33 | M |
| U-15 | No action at the calibration screen | Emergency ventilation (high priority) after 30 s with no action on the initial calibration screen, or on a software fault | M p. 95 Table 9-7 | M |

## 6. Set parameters (ADL; PED in brackets where the manual gives it)

Table 13-8 ("*" in the step column means Ctrl gives larger or smaller steps, row O-05).

| Id | Parameter | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| T-01 | VT (L), range | ADL 0.05–2.5 (PED 0.02–0.3) | M p. 119 | M |
| T-02 | VT, step | ADL 0.01* (PED 0.001*) | M p. 119 | M |
| T-03 | VT, initial value | ADL 0.402 (PED 0.051), changed by the mL/kg setting | M p. 119 note 2; M p. 121 note 2 | M |
| T-04 | Minute volume (L/min), MMV+PSV only | range 1–50; step 0.1; initial ADL 6 (PED 4) | M p. 119; M p. 121 note 4 | M |
| T-05 | Controlled pressure (PCV) (cmH2O) | range "100-2=PCV+PEEP"; step 1; initial ADL 15 (PED 8) | M p. 119 | M |
| T-06 | Peak in PCV | Peak Pressure = PCV + PEEP | M p. 71 | M |
| T-07 | Support pressure (cmH2O) | range "100-0=PSV+PEEP"; step 1; initial 5 (ADL, PED) | M p. 119 | M |
| T-08 | PEEP/CPAP (cmH2O) | range 0–50; step 1; initial 5 (ADL, PED) | M p. 120 | M |
| T-09 | Inspiratory Time (s) | "0.10 – 3.00 s (in assist/controlled modes)"; step 0.01*; initial ADL 1 (PED 0.6) | M p. 120 | M |
| T-10 | Ti in APRV | "0.2 – 30.0 s (Low time in APRV)", "1.0 – 30.0 s (High time in APRV)"; the same cell also prints "(APRV) 30-0.1" | M p. 120 | M |
| T-11 | PEEP High / PEEP Low, ranges | not in the manual (only PEEP/CPAP's 0–50 is printed) | M p. 120 (searched) | GAP |
| T-12 | I:E Ratio, range | printed "1:599-5:1" | M p. 120 | M |
| T-13 | Reading of T-12 | probably 1:59.9 to 5:1; the manual does not say | M p. 120 | GAP |
| T-14 | I:E, step | printed "0.1:0.1" | M p. 120 | M |
| T-15 | I:E, initial | follows from the initial Ti and rate | M p. 120 | M |
| T-16 | I:E, where it is set | shown in some modes, set only in PCV and NIV (ADL, PED); setting it adjusts Ti to the rate | M p. 42 | M |
| T-17 | Respiratory rate (rpm) | range ADL 1–100 (PED and NEO 1–150); step 1*; initial ADL 12 (PED 25) | M p. 120 | M |
| T-18 | Oxygen (concentration) (%) | range 21–100; step 1*; initial 50 | M p. 120 | M |
| T-19 | Inspiratory Sensitivity, flow (L/min) | range 0.2–15; step 0.1, 0.5 or 1 | M p. 120 | M |
| T-20 | Inspiratory Sensitivity, pressure (cmH2O) | range −0.5 to −20; step 0.5 | M p. 120 | M |
| T-21 | Inspiratory Sensitivity, initial | ADL and PED: flow 3, pressure −1.5 | M p. 120 | M |
| T-22 | Expiratory Sensitivity (modes with PSV) | 5 % to 80 % of the maximum flow; step 5 %; initial 25 % | M p. 120 | M |
| T-23 | Rise Time | a key with an icon and no number; it sets how fast the controlled pressure reaches its level | M p. 44; M p. 72; IMG_1542 | M |
| T-24 | Rise Time, range and step | not in the manual | M (searched) | GAP |
| T-25 | Rise Time, which breaths | in modes that combine pressure support and pressure control, it acts on both (p. 44); SIMV(VCV)+PSV: PSV breaths only (p. 77); SIMV(PCV)+PSV: both (p. 79); APRV: supported spontaneous breaths only (p. 84) | M p. 44; M p. 77; M p. 79; M p. 84 | M |
| T-26 | Inspiratory flow waveform | "Descending and constant ramp (rectangular)"; initial "Descending ramp" | M p. 120; M p. 43; M p. 44 | M |
| T-27 | Flow Waveform, which breaths | volume-controlled breaths only (in SIMV(VCV)+PSV, the mandatory breaths) | M p. 70; M p. 77 | M |
| T-28 | Programmable inspiratory pause (in VCV) | range 0–2 s; step 0.25; initial 0 | M p. 120; M p. 51 | M |
| T-29 | Manual inspiratory / expiratory pause | at most 7 s / at most 20 s | M p. 120 | M |
| T-30 | Sigh (in VCV): number | 1/2/3; initial 1 | M p. 120; M p. 51 | M |
| T-31 | Sigh: events an hour | p. 120: 5/10/15; p. 51: 5, 10, 15 and 20; initial 5 | M p. 120; M p. 51 | M |
| T-32 | Sigh: added volume | 0.1–1 VT (p. 120); 10 % to 100 % in steps of 10 % (p. 51); initial 30 % (0.3 VT); inactive by default | M p. 120; M p. 51 | M |
| T-33 | Sigh: own high pressure | 10 cmH2O to 120 cmH2O in steps of 5 cmH2O; the maximum pressure and its alarm take this value for sigh breaths | M p. 51 | M |
| T-34 | Sigh: availability | volume-controlled ventilation only; not for NEO | M p. 51 | M |
| T-35 | Leak compensation (L/min) | not adjustable; compensates up to: NIV ADL 50, PED 30; other modes ADL 15, PED 15 | M p. 120; M p. 54 Table 6-2 | M |
| T-36 | Leak compensation in NIV | on by default and cannot be switched off (p. 54 says so for NIV and continuous-flow CPAP) | M p. 54 | M |
| T-37 | Backup ventilation: mode | VCV or PCV (ADL/PED) | M p. 49 | M |
| T-38 | Backup: apnoea time | 5 to 60 s in steps of 5 s | M p. 49 | M |
| T-39 | Backup in SIMV/APRV | off by default; switched on in the Backup ventilation window | M p. 49; M p. 94 | M |
| T-40 | Backup window as drawn (ADL/PED) | "Ventilation Modes VCV", "Apnea time 15 s", "Backup in SIMV/APRV No", "Accept" | F p. 50 Figure 6-3 | F |
| T-41 | Accept and Esc in the backup window | Accept applies; Esc returns to the previous values | M p. 50 | M |
| T-42 | Tube compensation | Tube: tracheostomy or endotracheal tube; Diameter 4 to 12 mm; Compensate 10 % to 100 %, default 50 %; Activated Yes/No | M p. 52 | M |
| T-43 | Tube compensation, modes | ADL and PED, pressure modes PCV, PSV, APRV, PRVC, MMV+PSV; not in PSV+Assured VT; in SIMV(VCV)+PSV the volume-controlled breaths are shown with the tracheal pressure, not compensated; not for NEO | M p. 52; M p. 53 | M |
| T-44 | Tube compensation's trace | a white curve added to the pressure/time (or pressure/volume) graph: the calculated tracheal pressure | M p. 53 | M |
| T-45 | Volume compensation | on by default; an icon shows it; corrects VT for the circuit compliance measured at calibration | M p. 53 | M |
| T-46 | Suction configuration: window | "Suction period", "%O2 enrichment" | F p. 57 Figure 6-10 | F |
| T-47 | Suction configuration: values drawn | "Suction period 20 s", "%O2 enrichment Max" (an example; the text does not say they are defaults) | F p. 57 Figure 6-10 | F |
| T-48 | Suction period's range and step | not in the manual | M (searched) | GAP |
| T-49 | %O2 enrichment's range and step | not in the manual (only the example "50% + 20 = 70%" and "the maximum gives 100%") | M p. 57 | GAP |

### 6a. Defaults by mode, as the manual's figures draw them (ADL)

| Id | Mode | Values in the default bar, left to right | Source | Tag |
|---|---|---|---|---|
| D-01 | VCV | VT 0.402 L, Ti 1.00 s, I:E 1:4.0, f 12 bpm, PEEP 5 cmH2O, Sens 3.0 L/min, Oxygen 50 %, Flow Waveform (descending) | F p. 70 Figure 8-2 | F |
| D-02 | PCV | PCV 15 cmH2O, Ti 1.00, I:E 1:4.0, f 12, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 72 Figure 8-5 | F |
| D-03 | PSV/CPAP (ADL and PED) | PSV 5, Exp. Sensitiv. 25 %, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 75 Figure 8-8 | F |
| D-04 | CPAP | PSV/CPAP with PSV 0 | M p. 76 | M |
| D-05 | SIMV(VCV)+PSV | VT 0.402, Ti 1.00, I:E 1:9.0, f 6, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time, Flow Waveform | F p. 77 Figure 8-11 | F |
| D-06 | SIMV(PCV)+PSV | PCV 15, Ti 1.00, I:E 1:9.0, f 6, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 79 Figure 8-14 | F |
| D-07 | MMV+PSV | V̇E 6.0 L/min, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 81 Figure 8-17 | F |
| D-08 | PSV+VT Assured | VT 0.402, PSV 5, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 82 Figure 8-20 | F |
| D-09 | APRV (ADL and PED) | PSV 5, Exp. Sensitiv. 25, High Ti 5.0, Low Ti 1.5, f 9, High PEEP 10, Low PEEP 5, Sens 3.0, Oxygen 50, Rise Time, I:E 3.3:1 | F p. 84 Figure 8-23 | F |
| D-10 | NIV | PSV 5, Ti 1.00, I:E 3.3:1, f 9, Exp. Sensitiv. 25, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 85 Figure 8-25 | F |
| D-11 | NIV default I:E | "3.3:1" does not follow from Ti 1.00 s at f 9 (that gives 1:5.7); the APRV bar beside it prints the same "3.3:1" (consistent there: 5.0 : 1.5) | F p. 84; F p. 85 | GAP |
| D-12 | PRVC | VT 0.402, Ti 1.00, I:E 1:4.0, f 12, PEEP 5, Sens 3.0, Oxygen 50, Rise Time | F p. 87 Figure 8-28 | F |
| D-13 | The main-screen figure (Figure 3-2) | SIMV(VCV)+PSV with Sens shown as "-1.5" cmH2O (pressure triggering), the rest as D-05 | F p. 14 | F |

## 7. The modes, as the manual describes them

| Id | Mode | Behaviour as the source gives it | Source | Tag |
|---|---|---|---|---|
| M-01 | VCV | delivers the set VT each breath as a flow controller; inspiratory pressure is not set; time-triggered at the set rate, or patient-triggered (assist) | M p. 69 | M |
| M-02 | VCV functions | nebulizer, O2 suction, manual breath, manual insp/exp pause, automatic inspiratory pause, Sigh, volume and leak compensation | M p. 71 | M |
| M-03 | PCV | holds PCV above PEEP for Ti, independent of compliance and resistance; time- or patient-triggered; Rise Time | M p. 71; M p. 72 | M |
| M-04 | PCV functions | nebulizer, O2 suction, manual breath, manual insp/exp pause, volume, leak and tube compensation | M p. 73 | M |
| M-05 | PSV/CPAP: trigger | patient-triggered by Sens | M p. 73 | M |
| M-06 | PSV: end of inspiration | the first of: flow falls to the set Exp. Sensitiv. % of the peak flow; inspiration lasts over 3 s (ADL), 2 s (PED), 1 s (NEO); inspiratory pressure exceeds "14 % of the total set pressure plus 5 cmH2O" (all groups) | M p. 73 | M |
| M-07 | Reading of the pressure criterion in M-06 | unclear whether the threshold is (set pressure × 1.14) + 5, or set + 14 % + 5; not in the manual | M p. 73 | GAP |
| M-08 | PSV/CPAP functions | nebulizer, O2 suction, manual breath, volume, leak and tube compensation | M p. 75 | M |
| M-09 | CPAP | PSV 0; on no detected effort the backup starts | M p. 75; M p. 76 | M |
| M-10 | SIMV(VCV)+PSV | mandatory volume-controlled breaths at f; in each mandatory cycle the first 3/4 of expiration is a window for spontaneous PSV breaths; in the last 1/4 a patient effort triggers the next mandatory breath | M p. 76 | M |
| M-11 | SIMV(VCV)+PSV functions | nebulizer, O2 suction, manual breath, manual insp/exp pause, volume, leak and tube compensation | M p. 78 | M |
| M-12 | SIMV(PCV)+PSV | as M-10, the mandatory breaths with PCV's parameters | M p. 78 | M |
| M-13 | SIMV(PCV)+PSV functions | nebulizer, O2 suction, manual breath, manual insp/exp pause, volume and leak compensation | M p. 79 | M |
| M-14 | MMV+PSV | spontaneous; PSV adjusted breath by breath toward the set minute volume, at most 2 cmH2O a step | M p. 80 | M |
| M-15 | MMV+PSV near the limits | when inspiratory pressure nears an alarm limit and the minute volume is not reached: the pressure stops changing and holds, and a medium-priority alarm says the minute volume is not reached | M p. 81 | M |
| M-16 | MMV+PSV functions | nebulizer, O2 suction, manual breath, volume, leak and tube compensation | M p. 81 | M |
| M-17 | PSV+VT Assured | PSV breaths; if the minimum VT is not reached at the end of inspiration, flow turns constant until it is, or until 3 s (ADL) or 1.5 s (PED) of inspiration | M p. 82 | M |
| M-18 | PSV+VT Assured functions | nebulizer, O2 suction, manual breath, volume and leak compensation | M p. 83 | M |
| M-19 | APRV | two CPAP levels (PEEP High, PEEP Low) for Ti High and Ti Low; spontaneous breaths at any time, supported or not; I:E may invert; backup optional | M p. 83 | M |
| M-20 | APRV functions | nebulizer, O2 suction, manual breath, volume and leak compensation | M p. 84 | M |
| M-21 | NIV | PSV for spontaneous breaths, plus breaths at the set rate that are not patient-triggered (time-based); leak compensation on, its size by group (Table 6-2) | M p. 84 | M |
| M-22 | NIV warning | exhaled volume can differ from the measured volume because of mask leak | M p. 85 | M |
| M-23 | NIV functions | nebulizer, O2 suction, manual breath, volume and leak compensation | M p. 86 | M |
| M-24 | PRVC: first breath | a volume-controlled breath of the set VT with constant flow and a 0.5 s pause; the compliance it measures sets the pressure | M p. 86 | M |
| M-25 | PRVC: adjustment | pressure-controlled breaths, changed at most 3 cmH2O a breath toward VT, between PEEP + 5 cmH2O and the maximum-pressure alarm − 5 cmH2O | M p. 86 | M |
| M-26 | PRVC: the test repeats when | PRVC is chosen; VT is changed; the ventilator leaves Standby; the patient's VT exceeds 100 % of the target at the same pressure | M p. 86 | M |
| M-27 | PRVC: out of range | an alarm that the target volume is not reached | M p. 86 | M |
| M-28 | PRVC functions | nebulizer, O2 suction, manual breath, volume, leak and tube compensation | M p. 87 | M |

## 8. Monitored values

| Id | Value | Definition as the source gives it | Source | Tag |
|---|---|---|---|---|
| N-01 | Peak flow (top row) | the maximum flow given in each inspiration (L/min) | M p. 15 | M |
| N-02 | Patient's Data | two pages, turned with the knob; page number top right | M p. 47 | M |
| N-03 | A value not active in the mode | shows "---" | M p. 47 | M |
| N-04 | Respiratory-mechanics results on page 1 | shown only after their test has been run | M p. 47 | M |
| N-05 | Page 1 rows | VE Mandat, VE Spont, F Spont, TCexp, F/VT, Cdyn, WOBi, ETCO2, VCO2 (STPD), Cst, Ri, Re, auto-PEEP | F p. 47 Figure 6-2 | F |
| N-06 | Page 2 rows | VE Mandat, VE Spont, F Spont, TCexp, F/VT, Cdyn, WOBi, ETCO2, VCO2 (STPD), Leak, "% de fuga", Ti/Ttot, Ptracheal | F p. 47 Figure 6-2 | F |
| N-07 | VE Mandat | exhaled volume of the last 3 mandatory breaths over their time | M p. 47 | M |
| N-08 | VE Spont | exhaled volume of the last 3 spontaneous breaths over their time | M p. 47 | M |
| N-09 | F Spont | spontaneous breaths a minute, averaged over the last 3 | M p. 47 | M |
| N-10 | TCexp | from the slope of the flow–volume curve over 30–70 % of expiration | M p. 48 | M |
| N-11 | F/VT (Yang & Tobin) | total rate over the last exhaled volume; over 105 means a low chance of weaning; active in PSV/CPAP only | M p. 48 | M |
| N-12 | Cdyn | each breath's dynamic compliance | M p. 48 | M |
| N-13 | WOBi | imposed work of breathing, measured each minute over the last minute, first value after 1 min of spontaneous breathing; PSV/CPAP only; the text gives the unit "ml/min" | M p. 48 | M |
| N-14 | Leak | (inspired − expired volume) / time of the last breath, L/min | M p. 48 | M |
| N-15 | Leak % | (inspired − expired volume) / inspired volume, % | M p. 48 | M |
| N-16 | Ti/Ttot | inspiratory time over total breath time | M p. 48 | M |
| N-17 | Tracheal pressure | the pressure at the tube's end, shown when tube compensation is on | M p. 48 | M |
| N-18 | Monitoring accuracy | Peak, Plateau, Mean, Base pressure: ±10 % or ±2 cmH2O; expired VT: ±2 mL if under 20 mL, ±10 % above; minute volume ±10 %; inspiratory flow ±10 %; rate ±1 rpm; Ti and Te ±0.06 s; I:E NA; O2 ±3 % | M p. 121 Table 13-9 | M |

## 9. Menus

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| E-01 | Main menu | title "Menu": Patient's Data; Backup ventilation ▸; Ventilatory adjuncts ▸; Records ▸; Tools ▸; Intrahospital transport "No" | F p. 46 Figure 6-1; IMG_1547 | P |
| E-02 | Ventilatory adjuncts, ADL/PED | Inspiratory pause "Off"; Sighs "No ▸"; Tube compensation "No ▸" (greyed in the figure; the figure does not name the mode); Volume compensation "No"; Humidifier "None (Service)"; Leak compensation "No" | F p. 50 Figure 6-4 | F |
| E-03 | Ventilatory adjuncts, NEO | Inspiratory pause "Off"; Volume compensation "Yes"; Humidifier "Active"; Leak compensation "No"; Flow sensor "Distal" | F p. 50 Figure 6-4 | F |
| E-04 | Volume compensation's default | the text says on by default (p. 53) while the ADL/PED figure shows "No"; the device's message bar shows it on | M p. 53; F p. 50; IMG_1542 | M |
| E-05 | Records | Trends, Saved Loops, Activated Alarms | M p. 55 | M |
| E-06 | Tools | title "Tools": Autoscale "No"; Suction configuration ▸; Calibration ▸; Settings ▸; Time of use and soft version | F p. 56 Figure 6-9 | F |
| E-07 | Calibration | Oxygen sensor calibration; Breathing circuit calibration; Capnography ▸; Touch Screen Calibration | F p. 57 Figure 6-11 | F |
| E-08 | Oxygen sensor off | the second option switches the sensor off; the value then shows "--" | M p. 58 | M |
| E-09 | Pressure units | cmH2O, mbar or hPa | M p. 58 | M |
| E-10 | Sound volume | 25 % to 100 % in steps of 25 %; cannot be switched off | M p. 60 | M |
| E-11 | Date and time | saved with the Menu key | M p. 60 | M |
| E-12 | Languages | Spanish, English, Portuguese, Russian, Chinese, French, Turkish (no Persian) | M p. 61 | M |
| E-13 | Time of use | software, total hours of use, hours since the last service; a service every 5000 hours | M p. 61 | M |
| E-14 | Respiratory Mechanics (the right-column key) | auto-PEEP; Compliance and resistance; Trapped volume; Slow vital capacity; P0.1; PV flex; Pimax (greyed in the figure); VD/VT Physiologic | F p. 39 Figure 5-6 | F |
| E-15 | Graphics key | opens a window to choose one of 6 screens | M p. 63 | M |

## 10. Alarms

### 10a. The scheme

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| A-01 | Kinds of signal | visual (LEDs on the device), audible, a message on the screen | M p. 88; M p. 90 | M |
| A-02 | Priorities | high, medium, low; Vent Inop above them | M p. 88; M p. 18 | M |
| A-03 | Two alarms at once | only the higher priority is shown | M p. 88 | M |
| A-04 | Messages that do not fit | rotate every 5 s with an arrow icon (row R-15) | M p. 17 | M |
| A-05 | Adjustable and fixed alarms | some set by the user (e.g. maximum pressure), some fixed by the maker (e.g. low battery, gas supply loss) | M p. 88 | M |
| A-06 | Ctrl + Alarm Limits with an alarm active | a window of possible causes and, sometimes, remedies | M p. 88 | M |
| A-07 | The alarm log | every activated alarm stored with date and time; kept through power-off; power-on, start of ventilation and Standby are stored too | M p. 88 | M |
| A-08 | Reading the log | Menu → Records → Activated alarms; several pages | M p. 89 | M |
| A-09 | Audible signal | a train of pulses; tones do not mix: only the highest priority sounds | M p. 90 | M |
| A-10 | Pulses per priority | high 10 (2×5); medium 3; low 1 | M p. 91 Table 9-3 | M |
| A-11 | Tone pitch | not in the manual | M (searched) | GAP |
| A-12 | Alarm sound level | 81.4–85.6 dBA | M p. 119 Table 13-7 | M |
| A-13 | Vent Inop | a continuous lamp, a continuous tone unlike the others, no message | M p. 95 Table 9-6 | M |
| A-14 | The only alarm without a message | Vent Inop (the screen is off) | M p. 91 | M |
| A-15 | Remaining signals | when the cause ends but a signal remains; Esc removes them | M p. 91 | M |
| A-16 | Remaining LED | high: red, lit, not flashing; medium and low: yellow, lit, not flashing | M p. 91 Table 9-4 | M |
| A-17 | The top-of-cabinet LEDs | not remaining signals: they go off with the cause | M p. 91 | M |
| A-18 | Audio when the cause ends | high: 5 pulses (half); medium: 3 pulses; low: none | M p. 92 Table 9-5 | M |
| A-19 | Message when the cause ends | goes at once | M p. 92 | M |
| A-20 | Silence | 30 s (one press) or 60 s (two); every audible alarm except emergency ventilation and Vent Inop | M p. 92 | M |
| A-21 | Alarm settings window | title "Alarm settings": Inspiratory pressure; Tidal volume; Minute volume; Oxygen concentration; Respiratory rate; Low PEEP; ETCO2; footer "Press [Knob] Select - [Esc] Exit" | F p. 37 Figure 5-5; F p. 92 Figure 9-2 | F |
| A-22 | Some alarms not available in some modes | they cannot be changed there | M p. 37; M p. 93 | M |
| A-23 | Alarm settings from the main screen | touching the marked tags and keys opens the matching setting | M p. 93 Figure 9-3 | M |
| A-24 | TV and MV alarms off | in NIV, ADL: TV and MV can be switched off; switching one off switches the other off; logging continues | M p. 93 | M |
| A-25 | Apnoea alarm off | ADL/PED: in SIMV and APRV; switching it off switches the backup off; in SIMV and APRV both are off by default | M p. 94 | M |
| A-26 | Apnea | medium priority; lasts while apnoea lasts; ends when the patient breathes, ventilation returning to the chosen mode | M p. 50 | M |
| A-27 | Lamps on the device at 12:07–12:08 | High and Med/Low lit, no message (IMG_1542, IMG_1544, IMG_1545, IMG_1546); both unlit in IMG_1547 (12:08, Menu open) | IMG_1542–IMG_1547 | P |
| A-28 | Reading of A-27 | the remaining signals were cleared between IMG_1546 and IMG_1547, as Esc does (row A-15) | IMG_1546; IMG_1547 | I |

### 10b. Limits (Table 13-10; the device's values where the photographs show them)

| Id | Alarm | Value as the source gives it: range; step; initial ADL (PED) | On the device | Source | Tag |
|---|---|---|---|---|---|
| L-01 | Maximum Inspiratory Pressure (cmH2O) | 10 (or from the minimum) to 120; 1; 40 (30) | 40 | M p. 122; IMG_1542 | M |
| L-02 | Minimum Inspiratory Pressure (cmH2O) | 1–99 (or below the maximum); 1; 5 (5) | 5 | M p. 122; IMG_1542 | M |
| L-03 | Maximum Tidal Volume (L) | ADL above the minimum VT to 3; ADL 0.01; 0.6 (0.075) | 0.750 | M p. 122; IMG_1542 | M |
| L-04 | Maximum VT and IBW | in every mode the maximum VT is 1.5 × the IBW-based VT | — | M p. 123 note 2 | M |
| L-05 | Minimum Tidal Volume (L) | ADL 0 to the maximum VT; ADL 0.01; 0.15 (0.025) | 0.250 | M p. 122; IMG_1542 | M |
| L-06 | Maximum minute Volume (expired) (L/min) | ADL above the minimum to 55; by range one of 1/0.5/0.1/0.05/0.01; 7.23 (1.91); in MMV+PSV 9 (6) | 8.50 | M p. 122; IMG_1542 | M |
| L-07 | minimum minute Volume (expired) (L/min) | 0 to the maximum; by range one of 1/0.5/0.1/0.05/0.01; 2.41 (0.63); in MMV+PSV 4.5 (3) | 2.41 | M p. 122; IMG_1542 | M |
| L-08 | Oxygen (concentration) (%) | high 25–110, low 19–95; 1; high 60, low 40 | 50 / 30 | M p. 122; IMG_1542 | M |
| L-09 | Inadequate oxygen (%) | 18 or less, not adjustable | — | M p. 122 | M |
| L-10 | Disconnection | not adjustable | — | M p. 122 | M |
| L-11 | Leakage out of range (L/min) | not adjustable; ADL 50, PED 30 (for non-invasive breathing); otherwise from over 15 L/min | — | M p. 123 and note 3 | M |
| L-12 | Apnea (s) | 5–60; 5; 15 | — | M p. 123 | M |
| L-13 | High PEEP (cmH2O) | 1–50; 1; 20 (ADL/PED) | 20.0 | M p. 123; IMG_1542 | M |
| L-14 | Maximum Respiratory Rate (rpm) | 3–160; 1; 30 (ADL/PED) | 30 | M p. 123; IMG_1542 | M |
| L-15 | Continuous High Pressure | pressure over set PEEP + 5 cmH2O for 15 s; not adjustable | — | M p. 123 | M |
| L-16 | External Power Failure, Dead Battery, Inop.Vent, Blower Failure | not adjustable | — | M p. 123 | M |
| L-17 | The tag rule (owner's VQ7 ruling) | a yellow tag shows the high limit, the low limit or both, as its symbol says; the PEEP row holds the High PEEP limit | "20.0" under the high-limit symbol | plan §2.10 (VQ7); IMG_1542 | P |

### 10c. The alarms by priority

| Id | Alarm (screen name) | Condition and behaviour as the source gives it | Source | Tag |
|---|---|---|---|---|
| A-30 | Emergency Ventilation (high) | 30 s without action at the initial calibration screen, or a software fault | M p. 95 Table 9-7 | M |
| A-31 | Continuous high Pressure (high) | pressure over PEEP + 5 cmH2O for 15 s; all modes | M p. 95 Table 9-7 | M |
| A-32 | High Pressure (high) | pressure over the maximum airway pressure; the expiratory valve opens to bring pressure down to PEEP; all modes | M p. 95 Table 9-7 | M |
| A-33 | Low Air and Oxygen Pressure (high) | both supplies under 2 bar; immediate | M p. 95 Table 9-7 | M |
| A-34 | Disconnection (high) | 5 s after the disconnection is detected | M p. 95 Table 9-7 | M |
| A-35 | Low pressure (high) | airway pressure under the minimum | M p. 95 Table 9-7 | M |
| A-36 | Low Oxygen (or Air) pressure (high) | one supply under 2 bar; immediate | M p. 95 Table 9-7 | M |
| A-37 | Oxygen concentration below 18% (high) | measured O2 under 18 % | M p. 95 Table 9-7 | M |
| A-38 | Low battery (high) | immediate; switched on with a low battery, the device cannot be used | M p. 95 Table 9-7 | M |
| A-39 | Maximum and minimum ETCO2 (high) | with a capnograph connected | M p. 95 Table 9-7 | M |
| A-40 | High minute volume / Low minute volume (medium) | after 10 s | M p. 96 Table 9-8 | M |
| A-41 | High tidal volume (medium) | after 10 s; all modes except CPAP | M p. 96 Table 9-8 | M |
| A-42 | Low tidal volume (medium) | after 20 s; all modes except CPAP | M p. 96 Table 9-8 | M |
| A-43 | Power Loss (medium) | no mains, cable out or a fuse blown; the device runs on its battery | M p. 96 Table 9-8 | M |
| A-44 | High/Low O2 concentration (medium) | outside the limits for over 30 s | M p. 96 Table 9-8 | M |
| A-45 | Apnea condition (medium) | the set apnoea time with no effort detected; the backup starts; spontaneous modes | M p. 96 Table 9-8 | M |
| A-46 | Non-compensable leak (medium) | leak over the most the device can compensate for the mode and group | M p. 96 Table 9-8 | M |
| A-47 | Fan failure (medium) | the fan stops | M p. 96 Table 9-8 | M |
| A-48 | Target volume not reached (medium) | PRVC and MMV+PSV: the pressure at its limit and VT or minute volume not reached | M p. 96 Table 9-8 | M |
| A-49 | High PEEP (medium) | PEEP over its alarm limit; at most 5 s | M p. 96 Table 9-8 | M |
| A-50 | High rate (low) | rate over the limit for 30 s | M p. 97 Table 9-9 | M |
| A-51 | Nebulization interrupted (low) | gas flow too low; the nebulizer is not started | M p. 97 Table 9-9 | M |
| A-52 | Transporting (low) | intrahospital transport on, oxygen only connected | M p. 97 Table 9-9 | M |
| A-53 | Standby (low) | row O-21 | M p. 97 Table 9-9 | M |

## 11. Manoeuvres and tests

| Id | Function | What it does, as the source gives it | Source | Tag |
|---|---|---|---|---|
| K-01 | Suction %O2: phase 1 | 60 s of inspiration at the user-set oxygen | M p. 39 | M |
| K-02 | Suction %O2: phase 2 | for the user-set time, p. 39: no breath is given, so suction can be done; p. 57: no mandatory breath is given | M p. 39; M p. 57 | M |
| K-03 | Suction %O2: phase 3 | as phase 1 | M p. 39 | M |
| K-04 | %O2 enrichment | added to the current oxygen: at 50 % with enrichment 20, the breaths before and after suction are at 70 %; at the maximum setting, 100 % | M p. 57 | M |
| K-05 | Nebulizer | 8 L/min of oxygen to the nebulizer in inspiration; ADL and PED, all modes | M p. 38 | M |
| K-06 | Nebulizer stops | after 30 min; on the Nebulizer key; by itself if peak flow is below the nebulizer's flow (low-priority alarm) | M p. 38 | M |
| K-07 | Freeze | freezes the curves; patient data stay live; all modes and groups | M p. 40; M p. 67 | M |
| K-08 | Leaving Freeze | Esc (p. 40); Freeze again (p. 67) | M p. 40; M p. 67 | M |
| K-09 | Save loop | a reference loop in another colour with its date and time; 4 kept until power-off; Menu → Records → Saved loops; Ctrl + Graphics clears it from the screen | M p. 68 | M |
| K-10 | Graphics screens | 5 curves (default); Paw and flow; Paw, VT and flow; loops P/V, F/V, F/P; curves with Patient data; curves with CO2 | M pp. 63–66 | M |
| K-11 | Curve scales | touch the axis numbers (their colour changes), turn, press; Esc cancels | M p. 67 | M |
| K-12 | Autoscale | Menu → Tools → Autoscale → YES; it undoes a scale changed by hand | M p. 67 | M |
| K-13 | Horizontal axis position | select the axis, Ctrl, turn the knob, press; Esc cancels | M p. 67 | M |
| K-14 | Help | Help, then the key to be explained | M p. 40 | M |
| K-15 | auto-PEEP | expiratory valve closed 0.75 s at end-expiration; result: expiratory PEEP minus set PEEP; VCV, PCV, PRVC | M p. 98; M p. 99 | M |
| K-16 | Compliance and resistance | Dynamic Compliance = VT / (Pmax − PEEP); Static Compliance = VT / (Pplateau − PEEP total); Inspiratory resistance = (Pmax − Pplateau) / (VT/Ti); Expiratory resistance = TCexp / Static compliance | M p. 99; M p. 100 | M |
| K-17 | Trapped Volume | a static test in a controlled mode; VCV, PCV, PRVC; not in spontaneous breaths | M p. 101 | M |
| K-18 | Slow Vital Capacity | ADL and PED; the device switches to PSV/CPAP with PSV 0 cmH2O for 30 s; needs the patient's cooperation | M p. 102 | M |
| K-19 | P0.1 | the pressure drop in the first 100 ms of an effort; no cooperation needed; ADL and PED | M p. 103 | M |
| K-20 | PV flex | ADL and PED; 3 s of expiration at PEEP 0 cmH2O, then a slow inflation with low flow of 100 % oxygen until the set Pmax or Vmax; Lip, Uip, Cmax; a cursor moved by the knob; VCV, PCV, PRVC | M p. 104 | M |
| K-21 | Pimax | ADL and PED; continues the mode without PEEP; after two breaths the inspiratory valve closes 20 s; the most negative pressure; PSV/CPAP, SIMV(VCV)+PSV, SIMV(PCV)+PSV, MMV+PSV, PSV+assured VT, APRV, NIV | M p. 105; M p. 106 | M |
| K-22 | VD/VT | needs the capnograph; PECO2 measured, PaCO2 entered from a blood gas; result stored with date and time | M p. 106; M p. 107 | M |
| K-23 | Trends | 72 h; ADL, PED, NEO; three groups (Trend 1–3) of three parameters each | M p. 108; M p. 110 | M |
| K-24 | Trend parameters | p. 109 lists 12: Peak pressure, PEEP, Respiratory rate, Peak flow, Tidal Volume, Minute Volume, CTexp, ETCO2, VTCO2, Dynamic compliance, O2 concentration, Mean pressure; p. 110 says each row is one of 9 | M p. 109; M p. 110 | M |
| K-25 | Intrahospital transport | ventilation with oxygen only, from a cylinder; Menu → Intra hospital → Yes; off when air is reconnected or with No; a low-priority alarm | M p. 62 | M |
| K-26 | Transport: alarms switched off | p. 62: the low oxygen pressure alarm and the no-power alarm; p. 97: Low air pressure and Loss of power | M p. 62; M p. 97 | M |

## 12. Specifications the face or the model may need

| Id | Fact | Value as the source gives it | Source | Tag |
|---|---|---|---|---|
| Z-01 | Battery running time | about 75 min, adult, VCV, default settings | M p. 119 Table 13-6 | M |
| Z-02 | Maximum limited pressure at the outlet (PLIM max) | 120 ± 5 cmH2O | M p. 118 Table 13-5 | M |
| Z-03 | Maximum working pressure (PWmax) | 100 ± 5 cmH2O | M p. 118 Table 13-5 | M |
| Z-04 | Peak flow delivered by the ventilator | 0.2–180 L/min | M p. 118 Table 13-5 | M |
| Z-05 | Maximum resulting minute volume | ADL 130 L/min, PED 40 L/min | M p. 118 Table 13-5 | M |
| Z-06 | Oxygen change time | at most 20 s from 21 % to 90 % of the set concentration | M p. 118 Table 13-5 | M |
| Z-07 | Internal compliance of the ventilator | 0.16 L/cmH2O | M p. 118 Table 13-5 | M |
| Z-08 | Gas supply | medical air and oxygen, 3.5 to 7 kg/cm2 | M p. 118 Table 13-5 | M |

## 13. Colours and layout (measured from the photographs)

**The plan's samples** (plan §2.12, method as it states it: uncorrected white balance; the mean of a 7 × 7 px patch, or,
for the traces, the median of the 30 most saturated pixels; photographs IMG_1542, IMG_1544, IMG_1546; the regions were
not recorded). **My re-sample** (this note): the `sips` 1600 × 1200 JPEG copy of the photograph named, one 7 × 7 px patch
at the top-left coordinate given (x, y in that copy), averaged by ffmpeg's area scaling to one pixel, values as decoded
with no colour management or white-balance correction. A dash means I did not re-sample (the region was text, glare or
a trace).

| Id | Element | Plan's value | Re-sample (photograph, patch at) | Source | Tag |
|---|---|---|---|---|---|
| C-01 | Header block and left column, light grey | ≈ `#c9ced2` | `#d0d5da` (IMG_1542, 500,245); `#d0d1d4` (IMG_1546, 470,70) | IMG_1542; IMG_1546 | meas |
| C-02 | Category word "ADL" | blue (no value) | — | IMG_1542 | P |
| C-03 | Message bar, light blue | ≈ `#8db4e0` | `#8db8e4` (IMG_1542, 900,300) | IMG_1542 | meas |
| C-04 | Axis strips, paler blue | ≈ `#aed6ef` | `#b3dfee` (IMG_1542, 530,522) | IMG_1542 | meas |
| C-05 | Waveform panels, dark navy | ≈ `#0d1240` | `#101646` (IMG_1542, 700,470) | IMG_1542 | meas |
| C-06 | Inspiration trace, green | ≈ `#96ef3f` | — | IMG_1542 | meas |
| C-07 | Expiration trace, red | ≈ `#df5e4e` | — | IMG_1542 | meas |
| C-08 | Alarm-limit tags, yellow | ≈ `#d8c874` | `#dbcf7b` (IMG_1542, 1000,262) | IMG_1542 | meas |
| C-09 | Keys and menu rows, pale grey | ≈ `#d4d6cd` | `#d4d5cd` (IMG_1542, 440,925); `#d4d3cb` (IMG_1544, 950,360) | IMG_1542; IMG_1544 | meas |
| C-10 | Selected key or menu row, blue | ≈ `#3e77c8` | `#5695d6` (IMG_1546, 748,833) | IMG_1546 | meas |
| C-11 | Window title bar, slate | ≈ `#5d6f90` | `#6e87b0` (IMG_1544, 1000,290) | IMG_1544 | meas |
| C-12 | High lamp, red | ≈ `#fa223f` | `#f9203f` (IMG_1542, 1468,275) | IMG_1542 | meas |
| C-13 | Med/Low lamp, amber | ≈ `#f7a663` | `#faa763` (IMG_1542, 1466,340) | IMG_1542 | meas |
| C-14 | Lamp colours by the manual | high red; medium and low yellow; Vent Inop red | — | M p. 90 Tables 9-1, 9-2 | M |
| C-15 | Alarm message box colour by the manual | red or yellow by priority, the same as the LEDs | — | M p. 17; M p. 91 | M |
| C-16 | Tube compensation's tracheal-pressure curve | white; the airway-pressure curve green | — | M p. 53 | M |
| C-17 | Layout proportions | from IMG_1542 (regions of §2 above); not measured in pixels in this note | — | IMG_1542 | P |

The re-samples agree with the plan's within about 10 per channel for C-01 to C-05, C-08, C-09, C-12 and C-13; C-10 and
C-11 differ by 15 to 30 per channel (glare and the patch's place on a key with a gradient). Both are uncorrected
photograph values; a face token takes `measured` and names its row here.

## 14. Words on the screen

The device's language list has no Persian (row E-12); every word below is printed in English on the screen, a
photograph or a manual figure.

| Id | Where | Words as printed | Source | Tag |
|---|---|---|---|---|
| W-01 | Header and top row | "ADL", "Backup: OFF", "Peak Flow", "Ti", "Te", "Current", "I:E", "fTotal", "VT", "V̇E", "Oxygen", "L/min", "s", "bpm", "L", "%" | IMG_1542 | P |
| W-02 | Message bar | "Volume compensation" | IMG_1542 | P |
| W-03 | Left column | "Peak", "Trach.", "Plateau", "Mean", "PEEP", "Pressure Limits" | IMG_1542 | P |
| W-04 | Curves | "Paw(cmH2O)", "VT(L)", "V̇(L/min)", "(s)" | IMG_1542 | P |
| W-05 | Bottom row | "VT", "Ti", "I:E", "f", "PSV", "Exp. Sensitiv.", "PEEP", "Sens", "Oxygen", "Rise Time", "Flow Waveform", units "L", "s", "bpm", "cmH2O", "%", "L/min" | IMG_1542 | P |
| W-06 | Other bottom-row labels in the manual's figures | "PCV", "V̇E", "High Ti", "Low Ti", "High PEEP", "Low PEEP" | F p. 72; F p. 81; F p. 84 | F |
| W-07 | Mode windows (device) | "Operative Modes", "Other Operative modes", "Noninvasive (NIV)", "Press [Knob] Select - [Esc] Exit" | IMG_1544; IMG_1545 | P |
| W-08 | Mode windows (manual) | "Ventilation Modes", "Other ventilation Modes", "Mode VCV", "Press control knob to start", "Press Esc to exit" | F p. 34 | F |
| W-09 | Hardware | "Alarm Signals", "Vent Inop", "High", "Med Low", "Alarm Limits", "30-60 s", "Menu", "Mode", "Suction %O2", "Manual Insp.", "Insp/Exp Pause", "Ctrl", "Esc", "VAC", "Battery/Charge" | IMG_1542 | P |
| W-10 | Menus | the rows of E-01, E-02, E-06, E-07, E-14, T-40, T-46 and A-21, as printed there | F pp. 37, 39, 46, 50, 56, 57; IMG_1547 | F |
| W-11 | Patient's Data | the rows of N-05 and N-06; one label is Spanish, "% de fuga" (an English rendering is "% leak"; the owner's video settles the device's word) | F p. 47 | F |

## 15. Where the manual and the device differ, and where the manual differs from itself

The owner's ruling (VQ7): until his detailed video, the manual decides every point it covers; where it contradicts
itself, the plan names the page it follows.

| Id | Point | Manual | Device | Source | Tag |
|---|---|---|---|---|---|
| X-01 | Mode window title and order | "Ventilation Modes"; SIMV(VCV)+PSV in "Other ventilation Modes" (rows O-09, O-10) | "Operative Modes" in both windows; SIMV(VCV)+PSV in the first (rows O-11, O-12) | F p. 34; IMG_1544; IMG_1545 | F |
| X-02 | Oxygen limits | 60 / 40 | 50 / 30 | M p. 122; IMG_1542 | M |
| X-03 | VT limits | 0.6 / 0.15 | 0.750 / 0.250 | M p. 122; IMG_1542 | M |
| X-04 | V̇E limits | 7.23 / 2.41 | 8.50 / 2.41 | M p. 122; IMG_1542 | M |
| X-05 | Volume compensation default | on (text, p. 53); "No" in the ADL/PED figure (p. 50) | on (message bar) | M p. 53; F p. 50; IMG_1542 | M |

X-02 to X-04 are the department's settings, not a conflict. **The manual against itself** (none of these is a gap; the
face follows the page the plan names until the owner's video):

| Id | Point | One page | The other page | Tag |
|---|---|---|---|---|
| Y-01 | The PEEP row of the alarm window | "Low PEEP" (p. 37, p. 92 figures) | High PEEP in the tables (p. 96, p. 123) and the device's "20.0" tag; settled by the owner's tag rule (L-17) | F |
| Y-02 | Alarm messages | one at a time, the highest (p. 88) | rotate every 5 s (p. 17) | M |
| Y-03 | Leaving Freeze | Esc (p. 40) | Freeze again (p. 67) | M |
| Y-04 | Manual insp/exp pause | VCV and PCV only (p. 19) | listed in SIMV(VCV)+PSV and SIMV(PCV)+PSV (p. 78, p. 79) | M |
| Y-05 | Suction phase 2 | no breath (p. 39) | no mandatory breath (p. 57) | M |
| Y-06 | Transport: alarms off | low oxygen pressure and no power (p. 62) | Low air pressure and Loss of power (p. 97) | M |
| Y-07 | Sighs an hour | 5/10/15 (p. 120) | 5, 10, 15, 20 (p. 51) | M |
| Y-08 | Trend parameters | 12 listed (p. 109) | "one of 9" (p. 110) | M |
| Y-09 | Med/Low lamp | low priority (p. 18) | medium and low (p. 90) | M |
| Y-10 | Screen size | 12 inch (p. 13) | 12.1 inch (p. 117) | M |
| Y-11 | VE Spont | "delivered in PCV and CPAP" (p. 47, probably PSV) | — | M |
| Y-12 | The SIMV(PCV)+PSV rules | refer to "(SIMV(VCV)+PCV)" (p. 78, a misprint for SIMV(VCV)+PSV) | — | M |

---

## Gaps that remain (not in the manual, the photographs or the video)

Written as gaps; none is filled with a likely value. Rows: T-24 (Rise Time's range and step), T-48 (suction period's
range and step), T-49 (%O2 enrichment's range and step), H-17 (the deep manual breath's size), T-11 (PEEP High / PEEP
Low ranges), T-13 (the I:E range's misprint "1:599"), D-11 (the NIV default I:E "3.3:1"), M-07 (the PSV pressure-cycling
criterion's arithmetic), A-11 (the alarm tones' pitch), V-16 (why top-row values dim).

## What the owner's recordings will settle (plan §7.3)

1. **A detailed video of the device being operated** (VQ7): the Mode key and choosing a mode (X-01, O-09 to O-14);
   the Menu key pressed one to four times (H-10); the Alarm Limits key and one limit changed (A-21, Y-01, L-17); one
   setting changed with the knob, and what happens without the press (O-01 to O-04); the Suction %O2 key through its
   whole sequence: whether the phase-2 pause stops the mandatory breaths or all breaths, what oxygen it gives, the
   suction period and enrichment it offers (K-01 to K-04, Y-05, T-47 to T-49); how Freeze is left (Y-03); the Rise Time
   key and its values (T-24); Esc on a latched lamp (A-15, A-27, A-28); also, if shown, the deep manual breath (H-17),
   the PEEP High / PEEP Low ranges in APRV (T-11), the I:E range at its ends (T-13) and the "% de fuga" label (W-11).
2. **The alarm sound at each priority** (VQ6): high, medium and low, and Vent Inop if it can be heard (A-10, A-11,
   A-13, A-18). Until then a tone's pitch is `eng` and its pulse count the manual's. The video IMG_1543 carries an
   audio track that was not analysed for this note.

## Differences from the plan's §2

What the plan's §2 says, against what I read in the same source. Each is written in this note as the source gives it.

1. **§2.1, the PEEP 0.0 / VT 0.000 stretch** [V]: the plan gives "from about 0:51 to 1:17 ... PEEP reads 0.0 and VT
   0.000 L while Peak reads 31". At 0:51 PEEP reads 4.6 and VT 0.795; PEEP 0.0 and VT 0.000 are read at 0:58, 1:02,
   1:10 and 1:17; Peak reads 19 at 0:58 and 1:02 and 31 only from 1:10 (still 31 at 1:25, with PEEP 3.1). VT also reads
   0.000 at 0:03, with PEEP 5.6 (rows V-10 to V-12).
2. **§2.6, the suction configuration** [F p. 57]: the plan has "Suction time, %O2 enrichment: not stated". The window's
   figure (Figure 6-10) draws "Suction period 20 s" and "%O2 enrichment Max"; the text does not say these are defaults,
   and neither range is given, so the ranges stay gaps (T-46 to T-49). The window calls it "Suction period".
3. **§2.9, Tube compensation "greyed in VCV"** [F p. 50; M p. 53]: the figure shows the row greyed but names no mode;
   p. 53 limits tube compensation to PCV, PSV, APRV, PRVC and MMV+PSV and excludes PSV+Assured VT (T-43, E-02).
4. **§2.11, intrahospital transport** [M p. 62; M p. 97]: the plan gives "the low air and power alarms off" (p. 97);
   p. 62 names the low **oxygen** pressure alarm instead. A manual conflict the plan does not record (Y-06, K-26).
5. **§2.3, Insp/Exp Pause "in VCV and PCV only"** [M p. 19; M p. 78; M p. 79]: the mode pages list the manual pause
   among SIMV(VCV)+PSV's and SIMV(PCV)+PSV's functions too (Y-04, H-20).
6. **§2.11, suction phase 2** [M p. 39; M p. 57]: the plan gives "no mandatory breaths" (p. 57); p. 39 says no breath
   is given (Y-05, K-02).
7. **§2.6, Ti in APRV** [M p. 120]: besides Ti High 1.0–30.0 and Ti Low 0.2–30.0, the same cell prints "(APRV) 30-0.1",
   which the plan omits (T-10).
8. **§2.10, minute-volume limit steps** [M p. 122]: the plan's table gives no step for the V̇E limits; the manual gives
   one of 1/0.5/0.1/0.05/0.01 by range, and 0.01 for the adult VT limits (L-03, L-05 to L-07).
9. **§2.3 and §2.10, the lamps in the photographs** [P IMG_1547]: the plan reports both lamps lit; in IMG_1547 (12:08,
   Menu open) both are unlit, while IMG_1542, IMG_1544, IMG_1545 and IMG_1546 show them lit (A-27). Not in the plan.
10. **§2.4 and §2.14, the device's second mode window** [P IMG_1545]: it is also titled "Operative Modes"; and the
    manual's second window ends with a second "Other ventilation Modes ▸" row [F p. 34] (O-10, O-12). Not in the plan.
11. **§2.12, two colour samples** [P IMG_1544, IMG_1546]: a re-sample with a stated patch gives the selected blue as
    `#5695d6` (plan `#3e77c8`) and the window title as `#6e87b0` (plan `#5d6f90`); the others agree within about 10 per
    channel (section 13). A measurement spread, not a source conflict.
12. **§9, the video's audio** [V]: IMG_1543 has an audio track; the plan's §2.1 and §9 do not mention it (V-01).

Smaller additions the plan does not carry, read in the manual: the emergency-ventilation trigger (A-30); the alarm log
also keeps power-on, start of ventilation and Standby (A-07); the alarm sound level 81.4–85.6 dBA (A-12); Pimax's modes
and its "without PEEP" (K-21); the pneumatic limits PLIM max 120 ± 5 and PWmax 100 ± 5 cmH2O (Z-02, Z-03); the
monitoring accuracy table's values (N-18); the trend list's 12 against 9 (Y-08).
