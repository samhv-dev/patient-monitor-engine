# The defibrillator as a real device: the ZOLL M2 — Plan

**STATUS: DRAFT FOR REVIEW (2026-11-12).** A planning executor wrote this plan for brief 168 of the post-demo set.
Nothing in it is ruled until the owner answers §8 and the orchestrator reviews the pieces. No product code, test,
constant, card or kit file was changed while writing it.

**Why this plan exists.** When a resident opens "Defibrillator" in the room today, the screen is the patient monitor
with an energy readout and two buttons, Charge and Shock (`#/defib`, Room plan R5–R5d, merged). That was a stop-gap from
the ruling of 5 November ("generic now, the department's model later"). On 12 November the owner said: "we need to
finish this, Zoll M2 as the primary model". Two of his standing rules apply:

- a device's face must look and operate like the real device;
- a thing is built whole, as it really works, never as a slice or a workaround.

This plan sets out:

1. everything the M2 does, from its Operator's Guide chapter by chapter (§2);
2. for each function, the mechanism in the engine that produces it, or an honest gap (§3);
3. the face (§4);
4. who operates it in the room (§5);
5. the pieces (§6);
6. the sources (§7);
7. the questions for the owner (§8);
8. a self-review (§9).

**Base.** `origin/main` **a74fbf3d** (Merge PR #416), read in the worktree `scratch/wt-plan-defib`, on branch
`plan-defibrillator-zoll-m2`. Every `file:line` below is on a74fbf3d and is a starting point only. An executor finds the
code by the function name given, because lines move.

**Checked first.** `gh pr list --state all --search "defibrillator plan ZOLL M2"` returns nothing, and
`git ls-tree origin/main docs/plans/ | grep -i defib` returns nothing. Nobody had written this plan.

**Sources, and how each was read.**

- **The guide.** *ZOLL M2 Operator's Guide*, REF 9650-000873-01 Rev. C, issue date December 2021, 294 PDF pages, in
  English. The owner allowed it to be downloaded, and the orchestrator downloaded it to
  `assets/defibrillators/zoll-m2/` (git-ignored). It was read with `pdftotext`, and its figures and tables as page
  images. How much of each chapter was read:
  - read page by page: chapters 2, 5, 12, 14, 15, 16 and 17, and appendices A (A-1 to A-16, A-27 to A-29, A-34 to A-35),
    B and C;
  - read in part (the pages cited, plus a search of every page for defaults, ranges and settings): chapters 1 (1-8 to
    1-12), 3, 4, 6–11, 13 (13-1, 13-2) and 18 (18-1 to 18-15, the start of each page). The monitoring rows of §2.3 rest on
    those pages. Their full wording is checked in the piece that builds them (E8a–E8c, F6), which reads its chapter page
    by page first;
  - Tables A-2 and A-4 were checked against the page images, because their extracted text is scrambled. It is cited as **[G n-m]**, the page number printed in its footer (chapter-page, or A-n,
  B-n, C-n for the appendices). The brief named REF 9650-000860-01 Rev. C (September 2019, the copy on ManualsLib), which
  could not be opened from this machine (§7.3). The two documents carry different REF numbers. ZOLL's own site lists
  newer revisions in other languages: French 9650-000873-02 Rev. D, dated December 2024, and Indonesian -56 Rev. C. The
  owner's unit may run newer software than Rev. C describes (DQ2).
- **The pictures.** A distributor's three-page product brochure (source ph.getzhealthcare.com; printed "MCN IP 1807
  0232-05", copyright 2018), in `assets/defibrillators/zoll-m2/pictures/`. It is cited as **[B p]**, by its PDF page.
- **The guidelines.** The library's AHA 2025 and ERC 2025 documents, read as text with their page numbers (§7.1).

**Nothing from the guide or the brochure enters the repository.** No picture, no figure, no page and no text beyond
what the device itself shows on its screen and panel (key labels, messages, numbers). Facts are cited by page.

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR. In every code piece the tests come first: the failing test is committed before the code.

---

## 1. Intent and the fidelity standard

**What a resident must meet.** The M2 as his residents meet it. The same mode selector, keys, words, screens, tones and
timings. Every result the device shows must come from the simulated patient's physiology or from the device's own
logic, never from a script:

- the shock's outcome;
- the AED's verdict;
- capture;
- the CPR feedback;
- the monitored values.

**The fidelity standard.** This is the ventilator plan's standard (`vent-skin-edp-ts.md` §1, A3, §5) as amended for this
device by the owner's ruling of 12 November ("use online pictures for the face"):

1. Published photographs (the brochure, and any further picture listed in §4.6 once fetched) and the guide's figures
   decide what they show:
   - layout and proportions;
   - colours, where a photograph shows them;
   - words;
   - the order of entries;
   - the controls.
2. The guide's text decides everything else.
3. Anything else is a **marked choice** (provenance tag `eng`) and is listed.
4. The owner's own photographs remain welcome. When they arrive they decide over published ones.

**Name and mark.** These follow the ventilator's ruling (VQ1, `vent-skin-edp-ts.md` §5). The face is named after the
device, "ZOLL M2", in the docs, in Room setup and in the provenance. **No logo, maker's mark or trade dress is drawn.**
Where the real bezel carries the maker's mark (above the screen, and bottom right [G 2-3], [B 1]), the face leaves a
plain area. The README's affiliation sentence gains the defibrillator beside the ventilator, in the piece that ships the
face (F1). DQ1 asks the owner to confirm.

## 2. The device as documented: the complete inventory

The inventory follows the guide's table of contents. Each chapter becomes rows, or is named as "instructions to the
user" with no device behaviour (for example cleaning, [G 18-9 to 18-11]).

The columns are:

- **What the device shows and does**, with the page.
- **Engine today**, on a74fbf3d.
- **Missing.**
- **Piece**, from §6.

The class tags are:

- **H**: honoured today.
- **P**: partly honoured.
- **W**: work, with a mechanism named.
- **G**: a gap that needs a source before it can be built honestly (§3.3).
- **Q**: a question for the owner.

### 2.1 Power, modes and the front panel (guide chapter 2)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| D1 | Mode selector | OFF, MONITOR, DEFIB (Manual or AED), PACER [G 2-4] | no device power or mode: the window is always "on" | the selector as device state; OFF ends the incident after 30 s [G 17-1] | W | E1 |
| D2 | Start-up | Red and yellow lights flash, then "All Tests Passed" [G 14-3]. Alarm indicator self-test: tone and lights for 3 s [G 5-2] | none | the power-on self-test sequence | W | E9b |
| D3 | Power-off memory | Off for less than 30 s keeps every setting. Off for 30 s or more resets the patient settings (limits, energy) to defaults [G 3-1], [G 5-7] | none | a power-off timer | W | E1 |
| D4 | ENERGY SELECT ▲▼ | Front panel and STERNUM paddle [G 2-4]. Selections 1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200 J [G A-2] | `selectEnergy` takes any value 1–360 J (`defib.ts:13`, `:52–53`) | per-model energy list (max 200 J) and stepping through it | W | E0 |
| D5 | CHARGE | Charges to the selected energy [G 2-4]. Charge tone 1510 Hz, 150 ms, every 390 ms [G A-7]. Energy bar fills [G 14-6] | charge with its time and tone (`defib.ts:74–87`) | the M2 tone spec; the bar | P | E1, F2 |
| D6 | Charge time | Under 7 s to 200 J on a new battery; under 10 s at the 16th maximum discharge; under 15 s on mains alone at 90 % voltage; under 25 s from power-on to ready [G A-2] | the 7 s / 200 J rule (`defib.ts:12`), skin table interpolated | the M2's numbers as the model's table, with battery state | P | E1, E9b |
| D7 | Ready | Continuous ready tone at 1510 Hz [G A-7]. READY shown; SHOCK button lights [G 14-12] | ready marker and tone (`defib.ts:136–143`) | the lit Shock button | P | F1 |
| D8 | Ready time-out | "15 to 60 seconds (depending on configuration)", then the device disarms itself [G 14-7], [G 14-13]. In AED mode: a continuous tone for 10–50 s, then a higher tone for 5–10 s [G 12-7] | `readyTimeoutS` 60 (`zoll-like.json`) | the configured value (the factory default is not in the guide); the two-tone sequence | P, Q | E1, DQ17 |
| D9 | Disarm | Disarm quick key; changing the energy while charging or charged disarms [G 14-6], [G 2-15] | `disarm`, and energy change disarms (`defib.ts:72–73`) | the M2 rule that a manual change ends the auto escalation [G 14-3] | P | E1 |
| D10 | SHOCK (pads) | Front-panel SHOCK, press and hold until delivered; active only with pads or with paddles that have no shock button [G 2-4], [G 14-12] | `shock` is one event | press-and-hold (down/up) | W | E0, E1 |
| D11 | SHOCK (paddles) | Both paddle SHOCK buttons pressed together; one alone does not discharge [G 14-7], [G 18-7]. The front-panel key gives the invalid-operation tone (160 Hz, 250 ms) [G 14-7], [G A-7]. "Release Shock Button" if a shock key is held while charging [G 14-5] | none | the paddle accessory and its two buttons | W | E2a, F5 |
| D12 | Delivered energy and shock count | Shown at the bottom of the screen after the shock [G 14-7] | `lastShock.energyJ` is the SELECTED energy (`defib.ts:149`) | delivered energy from impedance (Table A-2 [G A-16]) | W | E2b |
| D13 | Auto energy escalation | Shocks 1/2/3 at the configured levels: 120/150/200 J adult, 50/70/85 J paediatric. After the third shock, every shock is at the third level. A manual change outside the sequence plus a shock disables escalation until power is off for more than 30 s [G 14-3], [G 14-4], [G 14-10] | none (`energyAdultJ` only) | the escalation state | W | E1 |
| D14 | Patient type | Adult or Pediatric, chosen with the Trim Knob at the top of the screen. Paediatric means 1–8 years or < 25 kg. It changes energies, the AED algorithm, NIBP and alarm defaults, and CPR prompts [G 14-2], [G 14-3], [G 12-3], [G 8-10] | `ageBand` on the monitor; the defibrillator ignores it (`createDefib` starts at `energyAdultJ`) | the device's patient type driving all of these | W | E1 |
| D15 | Quick-access keys | Five physical buttons at the left of the screen, with their labels shown on the screen beside each [G 2-3], [G 2-13]; three label levels via More/Back [G 2-13]. The key list is in [G 2-13 to 2-16] (§2.2) | none | the key levels per mode | W | F0 |
| D16 | Trim Knob | Turn moves the cursor around the screen or through a list; press selects or opens a field [G 2-4], [G 2-16] | none | cursor and pending-value model | W | F0 |
| D17 | Menu button | Opens Settings; acts as Home inside a menu [G 2-4] | none | menus (§2.7) | W | F6 |
| D18 | Alarm Control button | Press < 1 s pauses audio for 90 s (default); 1–3 s turns audio off; > 3 s turns alarms off. Also clears latched alarms and answers equipment alarms [G 2-4], [G 5-5], [G 5-6] | the bedside monitor's alarm state (`device-layer.ts`), one instance | the M2's OWN alarm instance (§3.1 C3) | W | E7 |
| D19 | NIBP button | Starts or stops a measurement [G 2-4] | NIBP model (`l3/nibp/nibp.ts`) on the bedside monitor | the M2's own NIBP channel | W | E8b |
| D20 | Print button | Starts or stops the strip printer [G 2-4] | none | printer (§2.8) | W | E9a |
| D21 | Visual alarm lights | Red and yellow lights on top [G 2-3]. High: flashing red. Medium: flashing yellow. Low: steady yellow [G 5-4] | none on the device | the lights | W | F1 |
| D22 | AC and battery LEDs | AC LED lit on mains. Battery LED: steady amber = charging; green = charged; alternating = no battery or fault; off = not on mains [G 2-3] | none | power state | W | E9b, F1 |
| D23 | Battery icon | No battery, communication fault, error, low, levels 1–5 (> 30 min to full), calibration required [G 2-6]. Capacity: ≥ 4 h monitoring and twenty 200 J shocks; ≥ 10 shocks after Low Battery [G A-9] | none | battery as device state, instructor-settable | W, Q | E9b, DQ14 |
| D24 | Brightness | Levels, and a toggle between white-background high contrast and black-background colour [G 2-15], [G 2-16] | renderer theme only | the device's two display modes | W | F1 |
| D25 | Code markers | Code Marker key opens a preconfigured list of up to 28 clinical actions; the chosen one is recorded with a time stamp [G 2-16], [G 2-17] | Debrief record rows exist for instructor events | the M2 list and its record | W | E9a, F6 |
| D26 | Paddles | APEX/STERNUM with Energy, Charge, Shock, Recorder buttons and a charge-ready light; built-in paediatric plates under PEDI [G 2-12]. No pacing through paddles [G 2-10]. "Use Pads to Pace" [G 16-10] | none | accessory state (§3.1 C2) | W, Q | E2a, F5, DQ11 |
| D27 | Internal paddles | Automatically set 10 J; 50 J maximum [G 14-18]. Shown as "Int. Paddles" on the Lead key [G 14-19] | none | accessory state | W, Q | E2a, DQ11 |
| D28 | Rear connectors | ECG, SpO2, NIBP, CO2, Temp1/Temp2, MFC; USB at the side; AC [G 2-2], [G 2-7] | none | connection state for each sensor | W | E2a, F5 |
| D29 | MFC and test plug | MFC, MFC with CPRD connector, CPRD adapter. The test plug (30 J) gives "Check Pads – Pads Shorted" [G 2-8], [G 2-9], [G 12-11] | none | accessory state | W | E2a |
| D30 | Rear and side views | Handle, speaker, paper compartment, paddle wells, battery compartment [G 2-2] | — | drawn only where the face needs them (paddle wells, printer door) | W | F5 |

### 2.2 Quick-access keys (guide table 3 [G 2-13 to 2-16])

| Key | Meaning [page] | Piece |
|---|---|---|
| Lead (I, II, III…) | ECG source for the top trace; HR, sync and demand pacing use it [G 2-13] | E8a, F0 |
| 12-Lead (optional) | 12-lead screen [G 2-13] | E8a |
| CO2 / CO2 with green light / CO2 Zero | Enable CO2; module active; zero for 10 s when needed [G 2-13], [G 2-14] | E8b |
| Diag | All leads at 0.525–40 Hz for 12 s [G 2-14] | E8a |
| Code Marker | §2.1 D25 [G 2-14] | E9a |
| Sync | Synchronised cardioversion [G 2-14] | E1 |
| More/Back | Next or previous key level [G 2-14] | F0 |
| Alarm Limits | View and set all limits [G 2-14] | E7, F6 |
| Treatment Summary, Trend, Data, Export, Clear Selection, Patient Information, 12-Lead Review, Exit 12-Lead, Acquire | Data keys [G 2-14], [G 2-15] | E9a, E8a |
| Manual Mode / AED Mode | Switch between AED and Manual (optional password) [G 2-14], [G 12-12] | E5 |
| Analyze | AED analysis (AED mode only) [G 2-14] | E4, E5 |
| Brightness | Display mode [G 2-15] | F1 |
| Disarm | Internal discharge [G 2-15] | E1 |
| 30 Joule Test | Self-test shock [G 2-15], [G 14-19] | E9b |
| 4:1 | Pacer: stimuli at ¼ rate while held [G 2-15], [G 16-6] | E6 |
| Clear | Flashes yellow in Pacer mode on pads off or shorted [G 2-16] | E6 |
| System Self-test Report | Up to 2,000 stored reports [G 2-16], [G 18-1] | E9b |

The guide shows the Monitor-mode first level only (Lead, 12, Code Marker, CO2, More) [G 2-13], and the AED-mode level
(Manual Defib, Analyze, Code Marker, More) in the screen figure [G 15-2], [B 2]. The Pacer level (Lead, 4:1, Code
Marker, More) is in the pacer figure [G 16-4], [B 2]. **The Manual Defib and Sync first levels are not shown by any
picture or table I have** (§4.6, DQ21, DQ22).

### 2.3 Monitoring (guide chapters 3, 4, 6–11, 13)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| M1 | Traces | Up to four; the top one is always ECG and cannot be removed; insert, replace or remove from the trace label [G 3-2], [G 3-3] | the renderer's lanes from a skin | an M2 layout and the trace menu | W | F1, F6 |
| M2 | Lead set | Pads/Paddles, I, II, III, aVR, aVL, aVF, V1–V6 [G A-2], [G 3-2] | limb and V leads from the VCG (`l2/ecg/vcg.ts` `DOWER`) | **no Pads lead** (no vector) | G, W | E2b |
| M3 | Default top lead | Lead II in Monitor and Pacer; Pads/Paddles in Manual Defib and AED [G 6-7] | none | per mode | W | E1 |
| M4 | ECG filters | Monitor 0.67–20 Hz (default) or 0.67–40 Hz; Diag 0.525–40 Hz [G A-2] | the bedside monitor's filtering | the M2 bands | W | E8a |
| M5 | Size and sweep | Size 0.125, 0.25, 0.5, 1, 1.5, 2, 3 cm/mV and auto (Auto in Monitor mode only); default 1 cm/mV [G A-3], [G 6-9]. Sweep 12.5/25/50 mm/s [G 6-10] | renderer gain and sweep | the M2 options | W | F1 |
| M6 | Heart rate | 20–300 bpm; mean of the last 5 beat-to-beat intervals; ±3 % or ±3 bpm [G A-3]. From the top trace [G 3-2] | HR detector on the bedside monitor | an HR channel on the M2's top lead | W | E8a |
| M7 | QRS tone | Volume Off, 1–5 [G 6-10]; heart beep 650 Hz, 40 ms [G A-7] | bedside beep | M2 tone | W | F4 |
| M8 | Pace marker | On or off (3/5 lead and 12-lead) [G 6-10]. On: detects implanted-pacemaker pulses, blanks them from the waveform for QRS detection, and draws dashed lines; off: a Pacer Off Marker icon [G 6-9] | pacer spikes drawn | marker display, blanking | W | E8a |
| M9 | Check Patient (VF/VT) | With the HR alarm on, in Monitor or Defib: continuous analysis of the top trace; VF or wide-complex VT gives "Check Patient" [G 6-12]. Disabled in Pacer ("VF/VT Alarms Disabled") [G 6-12] | the bedside VF alarm reads the RHYTHM ID (`vfSince`, `device-layer.ts:336–338`), not the signal | the same classifier as the AED (E4), reading the signal | W | E4, E7 |
| M10 | Diagnostic ECG | 12 s at 0.525–40 Hz [G 6-9], [G 17-11] | none | — | W | E8a |
| M11 | 12-lead | Acquire 10 s; 4×3 or 2×6, standard or Cabrera; 0.525–40 or 0.05–150 Hz; print, store, e-mail [G 13-1], [G 2-15]. Wait 15 s after a shock [G 13-2] | 12 leads exist in the generator | acquisition, report, review | W | E8a, Q (e-mail: DQ12) |
| M12 | Respiration | From CO2 by default; impedance pneumography (lead I) off by default; 2–150 br/min [G 7-2], [G A-4]. Limits 5/50; No Breath off or 10–60 s [G 7-3] | RR on the bedside monitor | the M2's resp source logic | W | E8b |
| M13 | NIBP | Manual, Auto (2.5–120 min; default 30 min), STAT [G A-5], [G 8-4]. Cuff 160 mmHg adult, 120 paediatric. Smart inflation [G 8-10], [G A-5]. Determination 30–45 s, maximum 175 s [G A-5], [G A-6] | oscillometric model (`l3/nibp/nibp.ts`) | an M2 instance with its modes and defaults | P | E8b |
| M14 | SpO2 | 0–100 %; PR 25–240; averaging Low 16 s, Medium 8 s, High 4 s [G A-4], [G A-5]. Limits 85/100 [G 10-8] | SpO2 model (`l3/spo2/spo2.ts`) | the M2 instance and averaging | P | E8b |
| M15 | CO2 | Mainstream or sidestream; 0–150 mmHg; zero; FiCO2 display off by default; scale 0–80 mmHg default [G 9-13]; sweep 6.25/12.5/25 mm/s, default 6.25 [G 9-16]; O2 compensation (default 21 %) and N2O compensation (default 0 %), with a blue or orange dot under BR when set [G 9-16] [G 9-5], [G A-6]. Rise time < 250 ms mainstream, < 490 ms sidestream [G A-6] | capnography model | the M2 instance and its zero step | P | E8b |
| M16 | Temperature | T1, T2, ΔT; 0–50 °C; 0.1 °C resolution [G A-6], [G 11-3] | core temperature | two channels | P | E8b |
| M17 | Trends | Logged every 30 s to 30 min (default 30 s); view and print [G 4-1] | none on the device | trend store | W | E9a |
| M19 | Patient groups | Neonate: ≤ 28 days (term) or up to 44 gestational weeks; paediatric: 29 days to 8 years or < 25 kg; adult: > 8 years or > 25 kg [G 1-8]. NIBP from 3 years [G 1-10]. Paediatric pads under 8 years or 25 kg [G 1-12] | `ageBand` | the M2's patient type has two values (Adult, Pediatric) [G 14-2]; a neonate is Pediatric on the device | W | E1 |
| M18 | Monitoring messages | ECG [G 6-13], Resp [G 7-6], NIBP [G 8-13], CO2 [G 9-17], SpO2 [G 10-9], Temp [G 11-4] | partly on the bedside monitor | the M2 wording | W | E7, E8b |

### 2.4 Defibrillation, sync and AED (guide chapters 12, 14)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| S1 | Pads check | Pads not in contact with Pads selected: "Attach Pads", and **no energy delivered** [G 14-9]. Shorted: "Check Pads – Pads Shorted" [G 14-16]. No cable: "Connect Therapy Cable" [G 12-10] | none | accessory state that gates the shock | W | E2a |
| S2 | Impedance window | 15–300 Ω with pads or external paddles; 7–300 Ω with internal paddles [G A-2] | none | transthoracic impedance as patient state | W, G | E2b |
| S3 | Waveform and delivered energy | Rectilinear biphasic: 6 ms first phase, 200 µs interphase, 4 ms second phase [G A-15]. Delivered energy by setting and load, 25–175 Ω (Table A-2) [G A-16] | none (energy is the selection) | Table A-2 as data; delivered energy, current and impedance in the record | W | E2b |
| S4 | Sync | Sync key; the key turns green; "S" markers over each detected R on the top trace; "Sync Defib" replaces "Manual Defib" [G 14-16]. Shock on the next R; delay < 60 ms [G 14-14], [G A-2] | sync detector on **lead II only** (`sync.ts:44`) | sync must follow the top trace, whatever lead it shows | P | E1, E2b |
| S5 | Sync persistence | Sync stays on when the ready state times out, when the energy changes, and on Disarm. After a shock, Sync must be pressed again for the next one [G 14-17], [G 14-18] | `afterShock` clears sync (`defib.ts:157`), as LIFEPAK-like "Sync After Shock off" for every skin | the M2 rule as model data | P | E1 |
| S6 | Sync lead-off | An ECG Lead Off on the selected leads blocks the synchronised discharge (the defibrillator itself still works) [G 14-16] | demand pacing knows `leadsOff`; sync does not | the gate | W | E1 |
| S7 | Shock outcome | The patient's response. The guide's trials: VF/VT first shock 99 % at 120 J [G A-27]; AF first shock 68 % at 70 J, Kaplan–Meier failure 0.318, 0.147, 0.091, 0.057 over 70/120/150/170 J [G A-29] | `outcome.ts` tables, with state factors | see §3.2 (energy and impedance) | P, G | E2b, DQ7 |
| S8 | Paediatric energy in the outcome | — | `defaultJ` = the ADULT energy (`device-layer.ts:237`), so a paediatric 50 J shock counts as "low energy" (< 50 % of 120 J) and loses half its termination | the patient type's first-shock energy | W | E1 |
| A1 | AED or Manual at power-up | Configured. Remembered until power is off for more than 30 s [G 12-2], [G 14-2] | none | the configuration | W, Q | E5, DQ4 |
| A2 | AED analysis | Only on the Pads lead [G 12-4]. "Analyzing ECG" for 5 s plus "Stand Clear" [G 12-6]. Three-second segments, 6–12 s in all; shockable = VF and wide-complex VT [G A-34], [G 12-5]. Does not warn of asystole [G 12-5]. Inhibited without pads [G 12-6]. Annotated in the snapshot with * or − per segment; results Shock Advised, No Shock Advised, Noisy ECG, Analysis Halted [G 17-7] | none | a classifier on the signal (§3.1 C4) | W | E4 |
| A3 | Algorithm performance | Adult: coarse VF sensitivity > 99 % (n = 536); rapid VT > 98 % (n = 80); NSR specificity > 99 % (n = 2210); other non-shockable > 99 % (n = 819); asystole > 99 % (n = 115). Fine VF > 90 %, other VT > 98 % [G A-34]. Paediatric table [G A-35] | — | the classifier's acceptance thresholds | W | E4 |
| A4 | Shock Advised cycle | Charges automatically to the configured energy, "Press Shock", Shock lights. Tone 10–50 s, then a higher tone 5–10 s; if no shock in 15 or 60 s, disarm and a CPR period [G 12-7] | none | the AED state machine | W | E5 |
| A5 | No Shock Advised | Shown for 5 s, then CPR [G 12-7], [G 12-10] | none | — | W | E5 |
| A6 | CPR period | Default 2.0 min with countdown; target depth 5 cm (configurable) [G 12-9]. Analyze during CPR cuts it short [G 12-9]. "Stop CPR" before re-analysis [G 12-11]. Optional CPR at start-up [G 12-5], [G 12-6] | none | — | W | E5 |
| A7 | AED energies | Preconfigured 120/150/200 J adult and 50/70/85 J paediatric; changeable only in the Supervisor menu; a patient-type change resets to shock 1 [G 12-3], [G 12-6] | `aedSequenceJ: null` for Zoll-like | the model's sequence | W | E0, E5 |
| A8 | AED messages | Attach Pads; Connect Therapy Cable; Analyzing ECG/Stand Clear; Shock Advised; Press Shock; No Shock Advised; Check Pulse…; If No Pulse, Perform CPR; Perform CPR; Stop CPR; Push Harder; Good Compressions; Check Pads – Pads Shorted; Check Patient (when configured to pause after CPR) [G 12-10], [G 12-11] | none | text and voice | W | E5, F4 |
| A9 | Switch to Manual | Manual Defib key; confirm "Exit AED and Enter Manual Defib Mode?", or a password [G 12-12] | none | — | W, Q | E5, DQ20 |
| A10 | Neonates | AED mode is not for patients under 1 year [G 12-1] | — | the AED refuses on a neonatal patient? The guide only warns. Marked choice: allowed; the Debrief notes it | Q | DQ25 |

### 2.5 Real CPR Help (guide chapter 15)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| C1 | Sensor | Only with CPR electrodes (sensor over the lower sternum) [G 15-1], [G 14-8] | none | accessory state | W | E2a |
| C2 | Dashboard | Depth and rate, messages, countdown (AED only). Replaces the lowest trace in Manual when compressions are detected [G 15-2] | none | — | W | F2 |
| C3 | Rate and depth | Depth 1.9–7.6 cm, ±0.6 cm; rate 50–150 /min [G A-10]. "- - -" when none in the last few seconds [G 15-3] | CPR is a COMMAND `{rate, quality 0–1.5}` (`l2/hemo/pipeline.ts:769`, `:894`) with no depth in cm and no single compressions | compressions as events with depth (§3.1 C5) | W, G | E3 |
| C4 | Bar graph | 12.5 mm/s; 0–7.6 cm scale; markers at 0, 5 and 6 cm adult, and 0, 2.5 and 5 cm paediatric [G 15-4] | none | — | W | F2 |
| C5 | Metronome | 105 /min (configurable) [G 12-9], [G A-10]. Manual: beeps only while compressions are detected [G 15-3] | none | — | W | E5, F4 |
| C6 | Voice prompts | Push Harder / Good Compressions, adults only, when depth is consistently below or above 5 cm [G 15-3] | none | the rule on measured depth | W | E3, F4 |
| C7 | Release | The guide's sensor reports depth and rate only (no release or leaning measure in chapter 15 or [G A-10]) | `cprRelease` term exists in the haemodynamics (`pipeline.ts:289`) | nothing to show; the face shows no release metric | H | — |

### 2.6 External pacing (guide chapter 16)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| P1 | Modes | Demand (VVI) and Fixed; Demand at activation [G 16-2]. Leads off: always Fixed [G 16-6] | `tcpSpec` (`pacer.ts:48–58`) | — | H | — |
| P2 | Rate | 30–180 ppm ±2 [G A-10]; steps of 2; default 70 (configurable) [G 16-4] | range 30–180, default 70 (`FALLBACK_PACER`) | step of 2 | P | E0 |
| P3 | Output | 8–140 mA (±5 % or 5 mA), steps of 2 [G 16-5], [G A-10]; 0 mA pauses pacing [G 1-11]. Starts at 0 mA, except within 10 min of the last pacing (and not off for more than 30 s): resumes at the last current after about 3 s [G 16-1], [G 16-5] | 0–140, steps +10/−5 (`zoll-like.json` pacer) | the M2 steps and the resume rule | P | E0, E6 |
| P4 | Pulse | Rectilinear constant current, 40 ms ±2 [G A-10] | spikes drawn by `l2/ecg/tcp.ts` | the 40 ms width on the trace | P | E6 |
| P5 | Capture | Electrical capture is a widened QRS with a large T; mechanical capture is a femoral or right brachial/radial pulse [G 16-5]. Typical threshold 40–80 mA; the ideal current is about 10 % above it; electrode position changes it; anterior–posterior usually needs less [G 16-6], [G 16-3] | capture iff mA ≥ `paceThresholdMa` (default 70, range 10–200; `l1/state.ts:42`) | threshold depending on pad placement | P, G | E6 |
| P6 | 4:1 | Held: stimuli at ¼ rate, "4:1 Selected" [G 16-6], [G 16-10] | `pausePct` exists (LIFEPAK-like 25) | `pausePct: 25` while held for the M2 | W | E6 |
| P7 | Pacer dashboard | Rate / Output / Mode fields; the Trim Knob moves, selects and turns; Output is highlighted at entry [G 16-4] | none | — | W | F3 |
| P8 | Pacing alarms | Pads off: "Attach Pads". Pads off or shorted while pacing: an equipment alarm with the flashing yellow Clear key, even with alarms off [G 16-2]. Messages: Demand Pacing Disabled, ECG Lead Off (then Fixed), Pacer Disabled, Release 4:1 Button, Set Pacer Output MA, Use Pads to Pace [G 16-10] | none | — | W | E6, E7 |
| P9 | ECG during pacing | Through monitoring leads only; no Pads ECG in Pacer [G 16-3]. Lead II at Pacer entry [G 16-3]. Check Patient disabled [G 6-12] | — | — | W | E6 |
| P10 | Paediatric pacing | Same method; small pads below 15 kg [G 16-10] | — | pad size as accessory | W | E2a |

### 2.7 Alarms (guide chapter 5, appendix C)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| L1 | Classes | Patient alarms are always high priority. Equipment alarms are high, medium or low, plus information messages [G 5-1] | the bedside alarm model with its profiles | an M2 profile | W | E7 |
| L2 | Colours | Message bar: high = red with white text; medium = yellow with black; low = dark blue with black; information = light blue with black. The alarming value turns red on white [G 5-2], [G 5-3] | — | face tokens | W | F1 |
| L3 | Sounds | High: two sets of five short beeps every 10 s. Medium: three longer beeps every 15 s. Low: one beep every 25 s [G 5-4]. The physiological tone is 660 Hz [G A-7]. **The guide gives a 6 s repetition at [G A-7] against 10 s at [G 5-4]**: the plan follows chapter 5 (operator text) and names the conflict | — | F4 tones | W, Q | F4 |
| L4 | Pause, off, alarms off, reminders, latching | §2.1 D18; reminder every 5/10/15 min, 190 ms [G 5-6]; all patient alarms latch [G 5-6] | — | — | W | E7 |
| L5 | Multiple alarms | A "+" beside the message field; the messages rotate [G 5-2] | — | — | W | F1 |
| L6 | Limits | Alarm Limits window; defaults by patient type, e.g. HR 50/120 adult, 50/150 paediatric [G 6-11]; SpO2 85/100 [G 10-8]; RR 5/50 [G 7-3]; NIBP systolic lower 75 adult [G 8-12] | bedside limit model | the M2 defaults | W | E7 |
| L7 | Maximum alarm delays | ECG 10 s, SpO2 10 s, EtCO2 7 s, Temp 4 s [G A-7] | bedside delays | M2 profile | W | E7 |
| L8 | Equipment messages | About 100 in appendix C, with type and priority, many depending on mode [G C-1 to C-9]. Device-fault messages ("… Button Stuck", "Defib Disabled", "Replace Battery", printer) are faults the instructor can inject (DQ14) | none | message table as data | W | E7, R3 |

### 2.8 Records, printer, readiness (guide chapters 17, 18)

| # | Function | What the device shows and does | Engine today | Missing | Class | Piece |
|---|---|---|---|---|---|---|
| R1 | Incident | Starts at power-on after ≥ 30 s off; ends on ≥ 30 s off [G 17-1] | the room's own record (`apps/demo/src/app/record.ts`) | the device's incident | W | E9a |
| R2 | Event log | Presenting ECG, analysis, shock, Check Patient, Pacer entry, patient alarm, recorder on, code marker, Diag ECG, 12-lead [G 17-4] | instructor/learner record rows | the device's list | W | E9a |
| R3 | Snapshots | 6 s before and 12 s after; 9 types; the shock snapshot carries shock count, selected and delivered energy, impedance, first-phase current, sync [G 17-6 to 17-11] | none | — | W | E9a |
| R4 | Summary report | Start time, duration, snapshots, shocks, pacing time [G 17-3] | Debrief shows a summary of its own | the device's report as a printed strip | W | E9a |
| R5 | Printer | 80 mm thermal, 25 or 50 mm/s, 6 s delay, annotations [G A-8]; up to 4 traces; numerics every 10 s [G 3-2] | none | a printed-strip view | W | E9a |
| R6 | Full disclosure and transfer | ≥ 6 h; USB or WiFi/SFTP [G 17-13 to 17-21] | the room's archive | whether to export a file (DQ12) | Q | DQ12 |
| R7 | Self-tests | Power-on; daily (on AC) [G 18-2]; 30 J test with the test plug or paddles [G 2-9], [G 14-19], [G 18-5]; up to 2,000 reports [G 18-1] | none | — | W | E9b |
| R8 | Shift check | Daily checklist [G 18-3 to 18-7] (instructions to the user; the simulator offers the 30 J test and the readiness states it checks) | — | — | W | E9b |
| R9 | Troubleshooting | Instructions to the user [G 18-12 to 18-15]; the faults it lists are in L8 | — | — | — | — |

## 3. What the engine models, and the mechanisms the M2 needs

### 3.1 The structure: what is engine state and what is the face's

**The seam, as a rule.** What the patient, the record or another window can observe is ENGINE state; it replays on every
follower. What only the operator sees while moving (the cursor, the quick-key level, an open menu, a value being turned
before it is confirmed) is the app's core. This is the same cut as the ventilator's cockpit core
(`apps/demo/src/vent/core/`), and it decides where each part lives:

- **C1. The M2 device state in the engine** (`packages/engine-core/src/l3/defib-pacer/m2.ts`, new; the device layer
  holds it beside `defib` and `pacer`). It covers:
  - the mode selector position and power-off time;
  - Manual/AED/Sync;
  - patient type;
  - the escalation index and whether it is still on;
  - the ready time-out and its two tones;
  - the AED cycle (analysing, advised, charging, press-shock, CPR period with its timer, stop-CPR) and the CPR-period
    clock;
  - the pacer resume rule;
  - 4:1 held;
  - the device's configuration (§5.4).

  Shock Advised → automatic charge is a device transition every follower must reproduce, so it cannot come from the app.
  The generic model keeps today's behaviour exactly. The M2's behaviour is model data plus this state machine.
- **C2. Patient connections** (`l3/defib-pacer/connections.ts`, new): MFC present; pads (adult/paediatric, CPR sensor or
  not, placement anterior–posterior or apex–sternum, contact good/poor/off); paddles (external, with or without shock
  buttons, internal); the test plug; the ECG cable (3/5/12-lead) and leads off; and the SpO2, NIBP, CO2 and temperature
  sensors. These are not controls on the device. They are what is ATTACHED, and they get a home outside the bezel (§4.4,
  F5): the "connections drawer", like the ventilator's `sim-tools`. Who may set them is DQ5. They gate the device:
  - Attach Pads, Connect Therapy Cable and Check Pads block the shock [G 14-9], [G 14-16];
  - paddles cannot pace [G 2-10];
  - the CPR sensor exists only on CPR pads [G 15-1].
- **C3. The M2 is a second monitor.** `DeviceState` holds ONE alarm state and ONE profile (`device-layer.ts`), shared
  with the room's bedside monitor. If the M2's Alarm Control acted on it, a resident silencing the defibrillator would
  silence the bedside monitor. The M2 therefore needs its OWN alarm instance and profile:
  - its own limits;
  - its own latching and its own pause/off;
  - its own channels, each present only when its sensor is connected in C2.

  Its numbers come from the same patient (the same SpO2, NIBP, capnography and temperature models). Its sensors and
  settings are its own. This is the largest single structural change, so it is E7 and is asked as DQ3.
- **C4. AED analysis and Check Patient** (`l3/defib-pacer/analysis.ts`, new; device signal processing, like `sync.ts`).
  A classifier that reads only the samples the engine emits on the analysed lead:
  - the Pads lead for the AED [G 12-4];
  - the top trace for Check Patient [G 6-12].

  It never reads the rhythm id. It works in three-second segments [G A-34]. It measures noise, baseline content, QRS
  rate/width/variability and regularity, as the guide describes the steps [G A-34]. It halts on motion: compression
  artefact (from E3) and the existing `motion` artefact. One classifier serves the AED, the M2's Check Patient, and (by
  DQ8) possibly the bedside monitor's VF alarm, which today reads the rhythm id (`device-layer.ts:336–338`).
- **C5. Chest compressions as events** (E3). Today CPR is a state `{active, rate, quality}`. The M2 measures each
  compression's depth (cm) and the rate. The mechanism needed:
  - compressions with a depth and a time, produced by whoever compresses (the instructor's CPR control, or a scripted
    rescuer whose depth and rate drift with fatigue: a source is needed, §7.2);
  - the haemodynamic effect from depth and rate, replacing the dimensionless `quality` (with `quality` kept as a derived
    view for old scenarios);
  - the sensor reading the same compressions (±0.6 cm [G A-10]);
  - the pads-lead artefact following the same compressions.

  Today `CPR_SV_FRAC`, `CPR_THORACIC_MMHG` and the like are scaled by quality (`l2/hemo/params.ts:74–77`). Their
  relation to depth needs a source (§7.2, gap G-CPR).
- **C6. The Pads lead and impedance** (E2b).
  - **Pads lead.** A lead whose vector depends on pad placement (apex–sternum or anterior–posterior [G 14-8]). A bipolar
    lead is the difference of the potentials at its two sites. M0a first checks whether the engine's ECG model can give
    the apex–sternum lead from what it already has (the VCG with `DOWER` projects the twelve standard leads only,
    `l2/ecg/vcg.ts:10`; the pad sites are given at [G 14-5]). If it can, only anterior–posterior stays a gap. Its numbers
    need a source (gap G-PADS); they are not invented.
  - **Impedance.** Transthoracic impedance as patient state: a per-patient value with the effect of contact and gel.
    Its distribution in patients needs a source (gap G-TTI). The device:
    - refuses outside 15–300 Ω [G A-2];
    - delivers the energy of Table A-2 interpolated by impedance [G A-16]. The table covers 25–175 Ω, the gate
      15–300 Ω. Between 15 and 25 Ω and between 175 and 300 Ω the guide gives no delivered energy, so E2b holds the
      nearest column's value and marks it `eng` in the record, until a source or the owner says otherwise (DQ16);
    - records impedance, delivered energy and first-phase current in the shock snapshot [G 17-8].

    Whether impedance changes the outcome is §3.2.
- **C7. The app's core** (`apps/demo/src/defib/core/`, new; F0) holds:
  - the cursor and the Trim Knob's pending value;
  - the quick-key level and menu stack;
  - key → command mapping;
  - deviceStatus → view model.

  Faces (`apps/demo/src/defib/faces/{generic,zoll-m2}/`) build DOM from it. The generic window moves onto the core
  with no behaviour change (F0's gate), as V0 did for the Hamilton face.

**Rejected structures.**

- AED verdicts from the rhythm id: the AED must read the ECG and nothing else.
- The classifier in the app: followers would need the verdict sent as a command, and the learner's allow-list would
  have to carry it.
- One shared alarm instance for monitor and M2: a silenced defibrillator would silence the bedside monitor.
- A second defibrillator page with its own logic: the vent plan's option C, rejected for drift.
- Keeping energy 1–360 J for the M2: the guide's list stops at 200 J [G A-2].

### 3.2 The shock's outcome, and what the M2 adds

`outcome.ts` today decides the post-shock rhythm from:

- the class of rhythm shocked;
- the selected energy against the model's first-shock energy;
- VF duration;
- temperature, potassium, pH, coronary perfusion pressure, antiarrhythmic occupancy and arrest time, as state factors
  whose directions are sourced and whose sizes are [FIT];
- for cardioversion, curves by rhythm and energy.

Its AF curve is calibrated on Mittal 2000 (`outcome.ts:104–120`). The guide reports a trial with the same design and the same first-shock figure, without naming it (randomised
multicentre cardioversion of AF, rectilinear biphasic 70/120/150/170 J): first-shock 68 % at 70 J, and Kaplan–Meier
failure 0.318 / 0.147 / 0.091 / 0.057 after shocks 1–4 [G A-28], [G A-29]. The guide does not say whether
70/120/150/170 J are settings or delivered energies, and 170 J is not an M2 setting [G A-2]: the trial used an earlier
device. Table A-2 shows how far the two can differ: a 70 J selection delivers 49 J into 25 Ω, 76 J into 50 Ω and 87 J
into 125 Ω [G A-16]. M0a checks in Mittal 2000 itself which energy it reports (WANTED, §7.2).

**Decision for this plan.** The outcome keeps reading the SELECTED energy, as it does today, until M0a has settled what
its sources report. Impedance enters as:

- the device's gate (15–300 Ω);
- the delivered energy, current and impedance in the record and on screen;
- nothing else, until a source gives an effect of impedance on success for this waveform.

The guide says efficacy was held in high-impedance patients (> 90 Ω): first shock 100 % biphasic against 63 %
monophasic [G A-28]. That is a reason NOT to add an impedance penalty for this waveform. DQ7 asks the owner.

Three corrections the M2 work brings, each with its source:

1. **Paediatric energy** (S8). `defaultJ` must be the patient type's first-shock energy (50 J paediatric [G 14-4]), not
   the adult 120 J. Today a correct paediatric shock is penalised as "low energy". This is a defect, fixed in E1, and it
   moves values: the validation workflow runs.
2. **The VF/VT first shock.** The guide's VF/VT trial reports 99 % first-shock efficacy at 120 J during induced VF in an
   electrophysiology laboratory [G A-27]. That is not out-of-hospital arrest, so `VF_TABLE` (built on van Alem 2003,
   Stiell 2007) stays. The plan names the trial so nobody substitutes it.
3. **The first-shock energy against the 2025 guideline.** ERC 2025 recommends at least 150 J for the first shock with
   rectilinear or truncated exponential biphasic waveforms (Soar et al. 2025, p. 7). The M2's factory default is 120 J
   [G 14-4]. The device's default is the device's: it stays 120 J, and the Debrief may note the guideline. DQ13.

### 3.3 Gaps that need a source before they are built (named, not invented)

| Gap | What is missing | Why it matters | Source needed | Blocks |
|---|---|---|---|---|
| G-PADS | The electrical axis of the pads lead for apex–sternum and anterior–posterior placement | The AED reads only the Pads lead [G 12-4]; Manual Defib shows it at the top by default [G 6-7] | A study or textbook giving the pads lead's vector, or a lead-field projection of the two placements | E2b (E4 runs without it on the limb leads) |
| G-TTI | The distribution of adult and paediatric transthoracic impedance with pads, and the effect of poor contact | The delivered energy and the gate | Measured impedance series (WANTED, §7.2) | E2b |
| G-THR | How pacing threshold depends on placement and patient | The guide says only that anterior–posterior usually needs less and gives typical 40–80 mA [G 16-3], [G 16-6] | Published thresholds by placement (WANTED) | E6 (until then: the existing `paceThresholdMa` as the instructor's setting, unchanged) |
| G-CPR | How compression depth and rate set flow and pressure | Replacing `quality` by depth | Experimental or clinical depth–pressure relations (WANTED) | E3 |
| G-FAT | How a rescuer's depth and rate drift over 2 minutes | A scripted rescuer | Fatigue studies (WANTED) | E3 (until then: depth and rate are the instructor's settings) |
| G-CFG | The M2's factory configuration defaults (start mode, ready time-out, CPR at start, metronome mode, password, Check Patient pause) | The guide says "depending on configuration" | *ZOLL M2 Configuration Guide* (§4.6) | nothing: configuration is an INPUT (§5.4); its defaults are the owner's answers to DQ4, DQ17–DQ20, DQ24 and DQ26 |
| G-ANCHOR | Which compression depth today's `quality` values stand for | E3's equivalence test needs an anchor so old scenarios keep their values | none in the code: `quality` is dimensionless (`l2/hemo/params.ts:74`) | E3 (DQ23) |

## 4. The face

### 4.1 What the pictures show, and what decides each part

| View | Shown by | Decides |
|---|---|---|
| Front, straight | [G 2-3] (Figure 2-1, labelled photo) | bezel layout: screen left with the five quick-access buttons on its left edge; to its right, top to bottom, **3 SHOCK** (round, red, lightning symbol), **2 CHARGE** (amber), **1 ENERGY SELECT** (yellow, up and down arrows), then the rotary mode selector (MONITOR and DEFIB above, OFF at the left, PACER below); under the screen the Alarm Control, Menu, Trim Knob (centre), Print and NIBP buttons; AC and battery LEDs at the lower left; the paper door at the bottom |
| Front, three-quarter | [B 1], [B 2] (photographs) | proportions, the handle, the paddle wells, the mode knob. Colours were seen on small renderings only; F1 measures them from the photographs at full resolution (provenance `measured`) |
| Screen, Monitor | [G 2-5] (Figure 2-2) | header (date, time, mode box, patient type, WiFi, USB, battery, elapsed time), status bar, quick keys, four traces, numerics column (HR, NIBP with Auto interval, SpO2, EtCO2/BR, T1) and their colours |
| Quick keys, Monitor levels | [G 2-13] | the three key levels and their icons |
| Screen, AED with CPR | [G 15-2], [B 2] | dashboard (CPR depth / rate / time; selected energy; shock count), bar graph, message bar "AED: Perform CPR", keys Manual Defib/Analyze |
| Screen, AED analysing | [B 2] | "AED: Analyzing ECG" with the energy box |
| Screen, Pacer | [G 16-4], [B 2] | Pacer dashboard (Rate / Output / Mode), pace markers, keys Lead/4:1/code marker |
| Paddles | [G 2-12] | APEX/STERNUM controls |
| Alarm display | [G 5-2], [G 5-3] | the message bar colours and "+" |

**Views that no picture I have shows** (each is a marked choice until a picture arrives):

- the Manual Defib screen (the energy bar, CHARGING/READY, delivered energy and shock number at the bottom [G 14-6],
  [G 14-7]);
- the Sync screen (green Sync key, "S" markers, "Sync Defib" [G 14-16]);
- the Manual Defib first-level keys;
- every menu window (Settings, ECG, NIBP, CO2, SpO2, Temp, Resp, Alarm Limits, Trend, Treatment Summary, System,
  Waveform Sources) beyond the descriptions at [G 3-3], [G 5-7], [G 6-10], [G 8-8], [G 9-16];
- the 12-lead screen;
- the rear and side connector panels in use (only the line drawing at [G 2-7]);
- the internal paddles;
- the printer strip.

### 4.2 The architecture: a defibrillator core with faces

This follows the ventilator plan's seam B (`vent-skin-edp-ts.md` §4.2–§4.3):

- `apps/demo/src/defib/core/core.ts`: `createDefibCore(driver, face)`. It holds the view model from `deviceStatus` (the
  defibrillator, the pacer, the M2 state, the M2 alarm instance), the cursor and the Trim Knob's pending value
  (`apps/demo/src/vent/core/pending.ts` is the model to copy or share), the quick-key levels per mode from the face's
  table, the menu stack, and `press(key, phase)` → command. Each piece of state lives in the core or the engine as §3.1
  rules.
- `apps/demo/src/defib/faces/index.ts`: the registry `{ generic, 'zoll-m2' }` and the room model → face mapping
  (`instrument.ts defibSkin` becomes `defibFace`).
- `apps/demo/src/defib/faces/generic/`: today's window (energy readout, Charge, Shock), moved onto the core with no
  behaviour change.
- `apps/demo/src/defib/faces/zoll-m2/{face.ts, face.css, face.json}`: the bezel, keys, lights, the screen regions of
  §4.1, and the dashboards. `face.json` carries every word, colour and layout number with a provenance entry (`[G n-m]`,
  `[B p]`, `measured` from a photograph, or `eng`), checked by a provenance test like
  `src/vent/faces/edp-ts/provenance.test.ts`, listed in `scripts/ci/docs-tests.mjs` because it reads this plan's tables.
- **The waveforms and numerics.** The face reuses the renderer's sweep lanes and numerics (`packages/renderer`
  `wave-lanes.ts`, `numerics-*.ts`) inside its screen region, fed from the M2's own channels (§3.1 C3). It does not draw
  its own waveforms.

**The LIFEPAK-style profile.** It stays a monitor skin's defibrillator block (`lifepak-like.json`), with no face and not
offered in Room setup (R5a ruling). DQ10 asks whether it should ever be a face.

### 4.3 How it operates

- **Keys:** pointer down and up (press-and-hold Shock [G 14-12]); the keyboard for the Trim Knob (arrows turn, Enter
  presses). Touch targets are at least 44 px, as in R5d.
- **The Trim Knob** turns step by step. Each step that changes a live setting (pacer output in 2 mA steps [G 16-5])
  goes to the engine as the device does. The relay allows 4 commands a second per socket (`relay/server.ts`, R5c). The
  face sends the knob's value at most every 250 ms while turning, plus the final one on press: that fits the cap, so the
  cap stays. R1's test turns the knob while pressing Shock and checks that nothing is refused.
- **Sounds:** the tones of [G A-7] and [G 5-4], and voice prompts (DQ9).

### 4.4 Outside the bezel: the connections drawer

As for the ventilator's `sim-tools`, a handle outside the device opens a drawer where pads are applied (type, placement,
contact), paddles are taken from their wells, the ECG cable and the sensors are connected, and the test plug is fitted.
It writes C2 state. Who may use it is DQ5.

### 4.5 Words and language

The device's own words are kept in English, as on the device (the owner's Persian convention: device faces stay
English). The drawer and the Debrief follow the app's language.

### 4.6 Pictures and documents still wanted (for the orchestrator to fetch under the owner's yes for this device)

| Name | URL | Size | Why |
|---|---|---|---|
| ZOLL M2 Operator's Guide, French, 9650-000873-02 Rev. D (Dec 2024) | https://info.zoll.com/hubfs/Products/M2/Manuals/9650-000873-02-SF_D.pdf | 15 341 332 bytes (HTTP header) | the newest revision found; its figures may show screens Rev. C lacks, and its changes list says what changed since Rev. C |
| ZOLL M2 Configuration Guide | not found on the web from here (ZOLL's site refuses automated reading) | — | G-CFG: factory defaults |
| A photograph of the Manual Defib and Sync screens, the menus, and the rear panel | none found | — | §4.1's unshown views |

## 5. Who operates it in the room

### 5.1 The learner's defibrillator screen

Today the `defib` role may send exactly `applyEvent defib charge` and `applyEvent defib shock`
(`packages/controller/src/protocol.ts:492`, `LEARNER_DEFIB_COMMANDS`). As the M2, the role must be allowed what a
resident does at the device, and nothing an instructor does:

- **Allowed (proposed):**
  - mode selector;
  - energy select (from the model's list);
  - charge;
  - shock down/up;
  - disarm;
  - sync on/off;
  - Analyze;
  - Manual/AED switch;
  - patient type;
  - pacer mode/rate/output/start and 4:1 down/up;
  - Alarm Control (on the M2's own instance only);
  - the M2's alarm limits and settings;
  - NIBP start/stop;
  - CO2 on/zero;
  - code marker;
  - print;
  - the connections drawer's pads and paddles (DQ5).
- **Never allowed:** `preselect`, pacer `fault`, `setTarget`, any time control, scenario, the bedside monitor's alarms,
  drugs, `device defib model`.

`learnerDefibMay` becomes a table of command shapes (R1). The host checks again (R5d's rule).

**Admission.** D6 admitted the role with no PIN *because* its power was exactly two presses. With the wider list that
reason no longer holds. DQ6 proposes the learner PIN, as the learner action remote has.

### 5.2 The instructor

The Defib · CPR sheet (`apps/demo/src/app/panel/defib.ts`) keeps preselect, pacer faults and CPR. It gains:

- the M2's device faults (low battery, a stuck button, printer out of paper, Defib Disabled) [G C-1 to C-9];
- the patient connections when the instructor owns them (DQ5);
- the compressions' depth and rate (E3);
- impedance (E2b).

Its energy stepper validates against the room's model (360 J is refused for the M2).

### 5.3 The record and the Debrief

Every learner press is a record row (R5d's `learner` kind). The device's own event log (E9a) is a second, device-shaped
record. The Debrief shows both, with:

- the shocks (selected and delivered energy, impedance, sync);
- AED analyses with their verdicts;
- CPR periods with mean depth and rate, and the fraction at target;
- pacing (time, rate, output, capture).

### 5.4 Configuration and the scenario format

The M2's Supervisor configuration (start mode, ready time-out, escalation levels, CPR at start, CPR period, metronome
mode and rate, password, Check Patient pause, NIBP interval, trend interval) is set in Room setup (R4) and sent as one
`device defib config` command, so followers replay it. A scenario may name the device configuration and the patient's
connections at start (S1).

## 6. The pieces

Hours are estimates, said to be. Each piece is one PR. **VW** marks pieces that carry the `run-validation` label: every
piece that can move a value, and (the R5a precedent) every piece that touches `l3/device-layer.ts`.

**Tests every engine piece (E…) carries, besides its own:**
- the snapshot round trip keeps the new state;
- a follower that replays the commands holds the same state and the same outcome;
- any new randomness (impedance per patient, sensor error) draws from a NAMED random stream, so replay is exact;
- the `generic` model's behaviour and the showcase goldens are unchanged unless the piece names the change.

**Answer first.** DQ3 (the second monitor), DQ5 (who connects the patient), DQ6 (admission) and DQ11 (paddles and
internal handles) decide the command vocabulary that E0 freezes. E0 waits for them.

| Piece | Purpose | Depends on | Files (main) | Tests first (numbers and sources) | Must not touch | Gate | Hours | VW |
|---|---|---|---|---|---|---|---|---|
| **M0a** | Sources: G-PADS (and whether apex–sternum is derivable from the ECG model), G-TTI, and what energy Mittal 2000 reports | — | `docs/research/defib-zoll-m2-pads-impedance.md` | none (docs) | code | docs job | 10 | — |
| **M0b** | Sources: G-THR, pacing threshold by placement | — | `docs/research/defib-zoll-m2-pacing.md` | none | code | docs job | 6 | — |
| **M0c** | Sources: G-CPR and G-FAT, depth and flow, rescuer fatigue | — | `docs/research/defib-zoll-m2-cpr.md` | none | code | docs job | 10 | — |
| **M0d** | The picture register (each view of §4.1 with its source), and the Configuration Guide search | — | `docs/research/defib-zoll-m2-pictures.md` | none | code | docs job | 3 | — |
| **E0** | Vocabulary freeze. Covers the M2 model in `DEFIB_MODELS` (energy list [G A-2], escalation [G 14-4], AED sequence [G 12-6], pacer 30–180 / 2 ppm and 8–140 / 2 mA [G A-10], [G 16-5]) and per-model energy validation. Declares EVERY command of §5.1 and §5.4: mode selector, patient type, energy, charge, Shock down/up, disarm, sync, Analyze, Manual/AED, pacer settings and 4:1 down/up, the M2's Alarm Control and limits, NIBP, CO2 on/zero, code marker, print, connections (C2), configuration. Adds the `deviceStatus` fields. Amends the Room plan's D6 text (the role's commands) | DQ3, DQ5, DQ6, DQ11 answered | `types-device.ts`, `l3/alarms/profile.ts`, `l3/defib-pacer/defib.ts` (validation), `device-layer.ts` (dispatch only), `docs/plans/room-and-instruments.md` (D6 note) | 360 J refused on `zoll-m2`, accepted on `generic`; 140 J refused on `zoll-m2` (not in its list [G A-2]); every declared command validates and is a no-op until its piece lands; generic unchanged in every existing test | outcome tables | common + engine-core + validation | 8 | VW |
| **E1a** | The paediatric first-shock energy in the outcome (S8): `defaultJ` from the patient type, not the adult energy | E0 | `device-layer.ts` | a paediatric 50 J VF shock has the same termination share as an adult 120 J shock; the adult tables unchanged | everything else | common + engine-core + validation | 3 | VW |
| **E2a** | Patient connections and their messages (C2): Attach Pads, Connect Therapy Cable, Check Pads, Use Pads to Pace, Release Shock Button; the paddles' two-button shock | E0 | `l3/defib-pacer/connections.ts` (new), `device-layer.ts` | a shock with pads off is refused with "Attach Pads" [G 14-9]; the test plug gives "Check Pads – Pads Shorted" [G 12-11]; one paddle button does not discharge [G 18-7]; paddles cannot pace [G 2-10] | outcome | common + engine-core + validation | 8 | VW |
| **E1** | Manual, Sync and patient type: covers the selector, power-off memory [G 3-1], escalation [G 14-3], the disarm rules [G 14-6], the ready time-out and its tones [G A-7], [G 12-7], Sync persistence [G 14-17], sync blocked on lead-off [G 14-16], internal paddles at 10 J with a 50 J maximum [G 14-18], and the top lead by mode [G 6-7]. The configuration enters as an input (§5.4) | E0, E2a | `l3/defib-pacer/m2.ts` (new), `device-layer.ts`, `sync.ts` (top trace) | escalation 120 → 150 → 200 → 200; a manual selection outside the sequence plus a shock ends escalation until 30 s off [G 14-6]; sync stays on after a ready time-out and after an energy change, off after a shock [G 14-17], [G 14-18]; the sync detector follows the top trace's lead | generic behaviour | common + engine-core + validation | 10 | VW |
| **E2b** | The Pads lead and impedance: the pads lead (from M0a), impedance as patient state from a named stream, the 15–300 Ω gate, Table A-2 delivered energy (nearest column outside 25–175 Ω, marked), the shock record's impedance and current | E2a, M0a | `l2/ecg/vcg.ts` (a pads projection), `l3/defib-pacer/impedance.ts` (new) | delivered energy at a 120 J setting: 85 J at 25 Ω, 131 J at 50 Ω, 143 J at 75 Ω, 147 J at 100 Ω [G A-16]; 10 Ω refused; the outcome unchanged (§3.2) | outcome tables | common + engine-core + validation | 12 | VW |
| **E3** | Compressions as events with depth (C5): the sensor reading, and the artefact following the same compressions; `quality` kept as a derived view for old scenarios | M0c, DQ23 | `l2/hemo/pipeline.ts`, `params.ts`, `l2/ecg/artefacts/body.ts`, `types-hemo.ts` | old CPR commands give exactly today's CoPP and EtCO2 (`quality` mapped to depth by DQ23's anchor); the sensor's error ≤ 0.6 cm [G A-10]; rate "- - -" after a few seconds without compressions [G 15-3] | — | common + engine-core + validation | 14 | VW |
| **E4** | AED analysis and Check Patient (C4). The classifier is lead-agnostic: it is built and tested on the engine's existing leads and on recorded ECGs, with its halting tested against today's `artefact.cpr`; it reads the Pads lead once E2b lands | E0 | `l3/defib-pacer/analysis.ts` (new) | the goals of [G A-34]: coarse VF sensitivity > 90 %, rapid VT > 75 %, NSR specificity > 99 %, other non-shockable > 95 %, asystole > 95 %. Measured on CUDB VF and VT (DOI 10.13026/C2X59M), HOLDING OUT the records the engine's VF templates were taken from (`packages/validation/src/templates/extract-vf.ts`); non-shockable rhythms from PTB-XL (in the shared cache); each set's size stated in the test. Analysis halts during compressions; the input has no `rhythmId` (a test removes it). Cost: one analysis on a phone follower measured in the e2e perf set | the bedside VF alarm (until DQ8) | common + engine-core + validation | 16 | VW |
| **E5** | The AED cycle (A1–A10): the CPR period and metronome, the Manual/AED switch | E1, E2a, E4 | `m2.ts`, `device-layer.ts` | analysis 6–12 s [G A-34]; CPR period 120 s [G 12-9]; No Shock Advised shown 5 s [G 12-10]; Shock Advised → charge → Press Shock → time-out → CPR [G 12-7]; a patient-type change resets to shock 1 [G 12-3] | — | common + engine-core + validation | 10 | VW |
| **E6** | M2 pacing: 2 mA and 2 ppm steps, start at 0 and the 10-min resume [G 16-5], 0 mA pauses [G 1-11], 4:1 [G 16-6], the pads-off alarm with Clear [G 16-2], no Check Patient while pacing [G 6-12], the 40 ms pulse on the trace [G A-10]; the threshold by placement once M0b has a source | E0, E2a | `pacer.ts`, `l2/ecg/tcp.ts` | 4:1 held gives 18 ppm at 72 [G 16-6]; re-entry within 10 min resumes at the last mA after about 3 s [G 16-5] | — | common + engine-core + validation | 8 | VW |
| **E7a** | The second alarm instance: a seam so a device can own its alarm state and profile, with the bedside monitor unchanged | E0 | `device-layer.ts`, `l3/alarms/*` | every bedside alarm test passes unchanged; a second instance raised and silenced alone | the bedside monitor's behaviour | common + engine-core + validation | 10 | VW |
| **E7b** | The M2's profile, Alarm Control and limits: priorities and tones [G 5-4], [G A-7], pause 90 s and the off states [G 5-5], [G 5-6], latching [G 5-6], limits by patient type [G 6-11], [G 7-3], [G 10-8], delays [G A-7]; channels present only when connected | E7a, E2a | `profile.ts`, `device-layer.ts` | silencing the M2 does not silence the bedside monitor; HR limits 50/120 adult, 50/150 paediatric [G 6-11]; Alarm Control held > 3 s turns alarms off [G 5-6] | — | common + engine-core + validation | 8 | VW |
| **E7c** | The equipment-message table of appendix C as data (type, priority by mode) | E7b | `l3/defib-pacer/messages.ts` (new) | "Attach Pads" medium [G C-2]; "Check Pads – Pads Shorted" medium in Defib, low in Monitor [G C-2] | — | common + engine-core + validation | 6 | VW |
| **E8a** | ECG functions: leads, filters [G A-2], size, Diag 12 s [G 6-9], HR [G A-3], pace marker and blanking [G 6-9] (chapter 6 read page by page first) | E7b | renderer and engine ECG channels | HR = mean of the last 5 intervals [G A-3]; Diag at 0.525–40 Hz for 12 s [G 6-9]; Auto size in Monitor only [G 6-9] | — | common + engine-core + renderer | 10 | — |
| **E8b** | The other channels (chapters 7–11 read page by page first): NIBP modes and defaults [G A-5], [G 8-4], SpO2 averaging [G A-5], CO2 zero, FiCO2 and O2/N2O compensation [G 9-5], [G 9-16], T1/T2/ΔT [G 11-3], the respiration source [G 7-2] | E7b | the M2's channel wrappers over existing models | NIBP Auto default 30 min [G 8-4]; cuff 160 / 120 mmHg [G A-5]; SpO2 Medium = 8 s [G A-5]; O2 compensation default 21 % [G 9-16] | the physiology models | common + engine-core | 12 | — |
| **E8c** | 12-lead (chapter 13 read page by page first): acquire 10 s, formats, review, print [G 13-1] | E8a | ECG channels, app view | wait 15 s after a shock [G 13-2]; 4×3 standard by default [G 13-15] | — | common + engine-core + demo | 12 | — |
| **E9a** | The incident record: event log, snapshots, summary report, trends, code markers (28), the printer as a strip view | E1, E5, E7b | `l3/defib-pacer/record.ts` (new), app print view | snapshot windows 6 s + 12 s [G 17-6]; the shock snapshot's fields [G 17-8]; a new incident after 30 s off [G 17-1] | the room's record | common + engine-core + demo | 12 | — |
| **E9b** | Readiness: power-on and daily self-test, the 30 J test, battery and AC states, charge times by battery state [G A-2], instructor-injected faults (DQ14) | E1, E2a | `m2.ts`, panel | the 30 J test with the test plug passes [G 2-9]; low battery allows 10 more 200 J shocks [G A-9] | — | common + engine-core + demo | 8 | — |
| **F0** | The defibrillator core, and the generic window moved onto it with no behaviour change | E0 | `apps/demo/src/defib/core/*`, `faces/generic/*`, `views/follower.ts`, `instrument.ts` | every `defib-window*.dom.test.ts`, `room-defib.dom.test.ts` and `learner-defib.e2e.ts` passes unchanged | engine | common + demo + e2e | 10 | — |
| **F1** | The M2 face: bezel, controls, lights, screen regions, header, traces and numerics, brightness modes, alarm bar; `face.json` with provenance; colours measured from the photographs | F0, E7b | `faces/zoll-m2/*` | provenance test: every word and colour cites a page or is `eng`; layout proportions within the figure's measured ratios | engine | common + demo + e2e | 24 | — |
| **F2** | AED and CPR screens: messages, dashboard, bar graph, energy bar | F1, E3, E5 | `faces/zoll-m2/*` | bar-graph markers at 5 and 6 cm adult [G 15-4]; rate "- - -" without compressions [G 15-3] | — | common + demo | 8 | — |
| **F3** | Pacer, Manual and Sync screens | F1, E1, E6 | `faces/zoll-m2/*` | Output highlighted at entry [G 16-4]; Sync key green and "Sync Defib" [G 14-16] | — | common + demo | 6 | — |
| **F4** | Audio: tones [G A-7], [G 5-4], metronome, voice prompts (DQ9) | F1 | `packages/audio` use, face | tone frequencies and intervals as the guide gives them | — | common + demo | 6 | — |
| **F5** | The connections drawer, the paddles in use, the printer door | F1, E2a | `faces/zoll-m2/drawer.ts` | pads off in the drawer → "Attach Pads" on the screen | — | common + demo | 6 | — |
| **F6** | Menus and windows: Settings, ECG, NIBP, CO2, SpO2, Temp, Resp, Alarm Limits, Trend, Treatment Summary, Waveform Sources, System, code markers | F1, E7b, E8a, E8b, E9a | `faces/zoll-m2/menus/*` | each window's fields as the guide lists them, e.g. ECG: Pace Marker, 12 Lead Mode Pace Marker, Sweep Speed, QRS/PR Volume [G 6-10] | — | common + demo | 20 | — |
| **R1** | The learner role's allow-list, guard and relay; admission by DQ6 | E0 | `protocol.ts`, `guard.ts`, `relay/server.ts` | every allowed shape passes; preselect, fault, setTarget, time, scenario and drug refused at the relay AND the host; turning the knob while pressing Shock stays under the cap | host-session | common + controller + check-relay | 6 | — |
| **R2** | Host apply, record rows and Debrief lines | R1, E9a | `host-session.ts`, `record.ts`, Debrief | a learner's AED shock reads with the device's numbers (selected and delivered energy, impedance) | — | common + demo + e2e | 6 | — |
| **R3** | The instructor's sheet: model-aware energy, faults, compressions, connections (DQ5) | E2a, E3, E9b | `panel/defib.ts` | 360 J refused in an M2 room | — | common + demo | 6 | — |
| **R4** | Room setup: the M2 in the model choice, and its configuration; amends the Room plan's D5 and the roadmap row (`docs/roadmap/v1.0-remaining.md`) | E0, E1, E5 | `site.ts`, `views/room.ts`, `session.ts` | the configuration is re-sent at each patient mount; followers equal | — | common + demo | 6 | — |
| **S1** | Scenario format: device configuration and connections at start; existing scenarios and builder scripts with energies outside the M2's list | R4 | scenario schema, loader | a scenario starts with pads on, anterior–posterior; a scenario or script that charges 360 J in an M2 room is refused at load with its reason, never rounded silently; in a generic room it runs as today | — | common + demo + scenario tests | 6 | — |

**Total, estimated:** 306 h of plan time (the sum of the column).

**Order:**

1. M0a–M0d at once (documents). The four answer-first DQs, then E0.
2. After E0, in parallel: E1a, E2a, E4 (lead-agnostic), E7a, F0, R1.
3. E1 after E2a. E2b after E2a and M0a. E3 after M0c and DQ23. E5 after E1 and E4. E6 after E2a.
4. E7b after E7a; E7c, E8a, E8b after E7b; E8c after E8a.
5. F1 after F0 and E7b; then F2, F3, F4, F5, F6.
6. E9a after E5 and E7b. R2 after R1 and E9a. R3, R4 and S1 last.

**Before and after pictures.** Built before any further picture arrives: every E piece, F0, R1–R4, S1, and F1's
structure (its regions and controls come from [G 2-3], [G 2-5], [B 1–2]). Waiting for a picture: the look of the
unshown views (§4.1). F3's Manual and Sync screens and F6's menus are built from the guide's text, with every visual
choice marked `eng`, and re-checked when pictures come.

**Blocked on sources.**

- E2b waits for M0a (G-PADS, G-TTI). Until it lands, E4 runs on the engine's limb leads and the AED stays unavailable
  on the face (a marked state).
- E3 waits for M0c (G-CPR) and DQ23 (the anchor).
- E6's placement effect waits for M0b (G-THR). Until then the threshold is the instructor's `paceThresholdMa`, unchanged.

## 7. Sources

### 7.1 Read for this plan

| Source | Identifier | How verified | Used for |
|---|---|---|---|
| ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C, December 2021 | — | read from the local file, page by page | §2, §3, §4 |
| ZOLL M2 brochure, MCN IP 1807 0232-05 (2018), 3 pages | — | read from the local file | §4.1 |
| Kleinman et al. Part 7: Adult Basic Life Support. 2025 AHA Guidelines. Circulation 2025;152(suppl 2):S448–S478 | DOI 10.1161/CIR.0000000000001369 | read in the library copy: rate 100–120/min and depth at least 5 cm, avoiding more than 6 cm (p. 16–17 of the PDF); audiovisual feedback 2a (p. 16) | CPR targets, E3, F2 |
| Wigginton et al. Part 9: Adult Advanced Life Support. 2025 AHA Guidelines. Circulation 2025;152(suppl 2):S538–S577 | DOI 10.1161/CIR.0000000000001376 | read in the library copy: escalating vs fixed energy "based on the specific manufacturer's instructions" (p. 3 of the PDF); transcutaneous pacing for atropine-refractory bradycardia (p. 36) | DQ13, E6 |
| Soar et al. ERC Guidelines 2025: Adult Advanced Life Support. Resuscitation 2025;215:110769 | DOI 10.1016/j.resuscitation.2025.110769 | read in the library copy: first shock at least 150 J for rectilinear or truncated exponential biphasic (p. 7 of the PDF); AF cardioversion and VT with a pulse 120–150 J (p. 9); pre-shock pause under 5 s by compressing during charging (p. 19) | §3.2, DQ13 |
| ERC Guidelines 2025: Adult Basic Life Support. Resuscitation 2025;215:110771 | DOI 10.1016/j.resuscitation.2025.110771 | read in the library copy: depth at least 5 cm but not more than 6 cm; rate 100–120/min (p. 4 of the PDF) | E3, F2 |
| Creighton University Ventricular Tachyarrhythmia Database (CUDB) | DOI 10.13026/C2X59M | already a validation source (`packages/validation/src/datasets/sources.ts`) | E4 tests |

### 7.2 WANTED (not read; for M0a–M0d)

| For | What | Lead (unverified, to be checked in M0a–M0d) |
|---|---|---|
| Algorithm reporting | Kerber RE et al. AHA statement on AED arrhythmia analysis performance, Circulation 1997;95:1677–1682 | cited by the guide itself [G A-27], [G A-34] |
| AF cardioversion | Mittal S et al. Circulation 2000;101:1282 | already cited in `outcome.ts`; the guide reports a trial with the same design and the same 68 % at 70 J [G A-28], [G A-29] without naming it: whether it is Mittal 2000 is checked in M0a |
| Biphasic energies | Stiell IG et al. BIPHASIC trial, Circulation 2007;115:1511–1517 | DOI 10.1161/CIRCULATIONAHA.106.648204, listed in Wigginton 2025's references |
| G-TTI | measured transthoracic impedance with self-adhesive pads in adults and children | WANTED |
| G-PADS | the pads lead's vector for the two placements | WANTED |
| G-THR | transcutaneous pacing thresholds by placement | WANTED; Cummins 1993 (NEJM 328:1377, DOI 10.1056/NEJM199305133281902, from Wigginton 2025's references) for outcome, not threshold |
| G-CPR | depth–pressure and depth–flow relations | WANTED; Edelson 2006 (Resuscitation 71:137, listed in ERC BLS 2025's references) for depth and shock success |
| G-FAT | rescuer fatigue over 2 minutes | WANTED |
| G-CFG | ZOLL M2 Configuration Guide | not found (§4.6) |

### 7.3 Pages that could not be read

The brief named ManualsLib's copy of REF 9650-000860-01 Rev. C. It is behind a bot verification that this machine
cannot pass. ZOLL's product page answers 403. `info.zoll.com/zoll-m2-features` answers 404. The guide that was read is
the ZOLL-hosted REF 9650-000873-01 Rev. C (December 2021).

## 8. Questions for the owner

**DQ1. The name on the face.**
- *Explanation:* The ventilator was named after the device (EDP-TS), with no logo drawn.
- *Options:* A, "ZOLL M2", no logo; B, "Zoll-style", no name.
- *Proposal:* A, as for the ventilator.

**DQ2. Which revision.**
- *Explanation:* The plan is built on the English guide Rev. C (December 2021). A French Rev. D (December 2024)
  exists, and your unit may run newer software.
- *Options:* A, build to Rev. C now and check Rev. D's changes list (fetch it, §4.6); B, wait for your unit's
  software version.
- *Proposal:* A.

**DQ3. The M2 as a second monitor (answer first).**
- *Explanation:* Today the defibrillator shares the bedside monitor's alarms. On the real M2, its own Alarm Control,
  limits and sensors are separate.
- *Options:* A, its own alarm instance and its own channels, live only when their sensor is connected; B, mirror the
  bedside monitor's numbers and alarms.
- *Proposal:* A.

**DQ4. Start mode (answer early: it is the first thing a resident sees).**
- *Explanation:* At DEFIB the M2 starts in Manual or in AED mode, by configuration [G 12-2], [G 14-2].
- *Options:* A, Manual; B, AED; C, Room setup offers both, with your unit's setting as the default.
- *Proposal:* C, defaulting to Manual until you tell me your unit's setting.

**DQ5. Who connects the patient (answer first).**
- *Explanation:* Pads, their placement, paddles, the ECG cable and sensors are what a resident puts on.
- *Options:* A, the learner does it in a drawer beside the device, and the instructor can override; B, the
  instructor only.
- *Proposal:* A.

**DQ6. Admission of the defibrillator screen (answer first).**
- *Explanation:* It was admitted without a PIN because it could only Charge and Shock. As the M2 it can do everything
  in §5.1.
- *Options:* A, the learner PIN, as the learner remote has; B, no PIN, as now.
- *Proposal:* A.

**DQ7. Impedance and the shock's success.**
- *Explanation:* The guide reports that this waveform kept its efficacy in high-impedance patients [G A-28].
- *Options:* A, impedance gates the shock and is shown and recorded, but does not change success; B, a penalty above
  some impedance (needs a source).
- *Proposal:* A.

**DQ8. The bedside monitor's VF alarm.**
- *Explanation:* Today it reads the simulated rhythm's name, not the signal.
- *Options:* A, the M2's classifier serves the M2 only; B, it also replaces the bedside monitor's VF detection.
- *Proposal:* A now; B as its own plan.

**DQ9. Voice prompts.**
- *Explanation:* The M2 speaks its prompts.
- *Options:* A, the browser's speech in English; B, recordings you provide; C, text only.
- *Proposal:* A, replaced by B if you send recordings.

**DQ10. The LIFEPAK-style profile.**
- *Options:* A, keep it as a monitor skin's defibrillator values, with no face; B, plan a LIFEPAK face later.
- *Proposal:* A.

**DQ11. Paddles and internal handles (answer first).**
- *Explanation:* The guide covers external paddles and internal handles.
- *Options:* A, all three accessories (pads, paddles, internal); B, pads only.
- *Proposal:* A; tell me whether your unit has paddles.

**DQ12. Data transfer.**
- *Explanation:* The M2 exports by USB and WiFi and e-mails 12-leads.
- *Options:* A, Export saves the incident as a file from the browser, and WiFi/e-mail show "not configured" as an
  unconfigured unit does; B, leave the keys inert.
- *Proposal:* A.

**DQ13. First-shock energy.**
- *Explanation:* The M2's factory default is 120 J; ERC 2025 recommends at least 150 J for this waveform type.
- *Options:* A, keep the device default (120 J) and let the Debrief note the guideline; B, default 150 J.
- *Proposal:* A, or your department's configured value.

**DQ14. Device faults.**
- *Explanation:* Appendix C lists device faults (low battery, stuck buttons, printer out of paper, Defib Disabled).
- *Options:* A, the instructor can inject them; B, not simulated.
- *Proposal:* A.

**DQ15. Two figures that disagree.**
- *Explanation:* The guide gives the high-priority alarm repeat as 10 s in chapter 5 [G 5-4] and as 6 s in the
  specifications [G A-7].
- *Options:* A, chapter 5; B, the specification.
- *Proposal:* A, until your unit settles it.

**DQ16. Impedance outside the guide's table.**
- *Explanation:* The device accepts 15–300 Ω [G A-2], but Table A-2 gives delivered energy only for 25–175 Ω [G A-16].
- *Options:* A, hold the nearest column's value and mark it; B, refuse to show a delivered energy outside the table.
- *Proposal:* A.

**DQ17. Ready time-out.**
- *Explanation:* A charged M2 disarms itself after 15 to 60 s, by configuration [G 14-7].
- *Options:* A, 60 s; B, 30 s; C, your unit's value.
- *Proposal:* C; A until you send it.

**DQ18. Automatic energy escalation.**
- *Explanation:* Shocks 1/2/3 can step up automatically (120/150/200 J adult) [G 14-3], or stay at the selected energy.
- *Options:* A, escalation on; B, off.
- *Proposal:* your unit's setting; A until then (the guide's default levels are given for it [G 14-4]).

**DQ19. CPR at AED start-up.**
- *Explanation:* The AED can begin with a CPR period instead of analysis; the default starts with analysis [G 12-5].
- *Options:* A, start with analysis; B, start with CPR.
- *Proposal:* A.

**DQ20. A password to leave AED mode.**
- *Explanation:* Leaving AED mode can require a password [G 12-12].
- *Options:* A, no password (a confirmation only); B, a password set by the instructor.
- *Proposal:* A.

**DQ21. The Manual Defib key level.**
- *Explanation:* No table or picture shows which five quick-access keys appear first in Manual Defib mode. Sync and
  Disarm must be reachable [G 14-16], [G 14-7].
- *Options:* A, you photograph or tell me your unit's keys; B, a marked choice (Lead, Sync, Disarm, Code Marker,
  More) until then.
- *Proposal:* B now, A when you can.

**DQ22. Photographs of the views no picture shows.**
- *Explanation:* §4.1 lists them: the Manual Defib and Sync screens, the menus, the 12-lead screen, the rear panel,
  the paddles and the printer strip.
- *Options:* A, you photograph your unit (they then decide over published pictures); B, the face stays on marked
  choices for those views.
- *Proposal:* A, whenever convenient; B until then.

**DQ23. What today's CPR "quality" means in centimetres.**
- *Explanation:* Today the instructor chooses Poor, Good or Excellent (quality 0.4, 0.8, 1). The M2 measures depth in
  centimetres. To keep old scenarios' numbers unchanged, each quality needs a depth.
- *Options:* A, Good = 5 cm (the guideline's minimum, Kleinman 2025 p. 16), Excellent = 5.5 cm, Poor = 3.5 cm, as a
  marked anchor until M0c's sources set the relation; B, retire quality and re-record the affected scenarios.
- *Proposal:* A.

**DQ24. Pause after each CPR period.**
- *Explanation:* The AED can be configured to pause after each CPR period and wait for Analyze ("Check Patient")
  [G 12-11].
- *Options:* A, no pause (re-analyse automatically); B, pause.
- *Proposal:* A.

**DQ25. AED mode under 1 year.**
- *Explanation:* The guide says AED mode is not for patients under 1 year [G 12-1] but does not say the device
  refuses.
- *Options:* A, allowed, and the Debrief notes it; B, refused by the simulator.
- *Proposal:* A (the device's own behaviour as documented).

**DQ26. The metronome in AED mode.**
- *Explanation:* It beeps for the whole CPR period, or only once compressions are detected [G 12-9].
- *Options:* A, the whole period (the default [G 12-9]); B, after compressions start.
- *Proposal:* A.

## 9. Self-review against the codebase

- **Every engine claim was read on a74fbf3d:**
  - `defib.ts` (energy 1–360, the 7 s / 200 J rule, sync cleared after a shock);
  - `outcome.ts` (tables and state factors, the Mittal curve, `defaultJ`);
  - `pacer.ts` (modes, `pausePct`, leads-off to fixed);
  - `sync.ts` (lead II only);
  - `device-layer.ts` (one alarm state; `defaultJ` = `energyAdultJ`; `vfSince` from the rhythm);
  - `l1/state.ts` (`paceThresholdMa` 70, 10–200);
  - `l2/hemo/pipeline.ts` (CPR as a command with quality);
  - `protocol.ts` (`LEARNER_DEFIB_COMMANDS`);
  - `instrument.ts` and `follower.ts` (the window);
  - `apps/demo/src/vent/core/` (the cockpit core to follow).
- **R5a–R5d are merged.** This plan extends their model registry, role and window. It reverses none of their tests
  except where a piece names it (R1 widens the allow-list; F0 keeps the generic window's tests unchanged).
- **No number in the plan comes from memory.** Each device number cites the guide's page; each guideline number cites
  the library PDF's page. The marked choices are: the knob's send rate (§4.3), the nearest-column hold outside Table A-2 (DQ16), the depth anchor (DQ23), the Manual Defib key level (DQ21), and the defaults the DQs propose.
- **Possible double counting.** VF termination already falls with temperature, pH and the rest. The plan adds no
  impedance factor (§3.2), so nothing is counted twice.
- **What I could not settle:** the Manual Defib keys and screens are not illustrated; the configuration defaults; the
  source gaps of §3.3. Each is a DQ or a named gap, not a guess.
- **Reading coverage.** Chapters 1, 3, 4, 6–11, 13 and 18 were read in part (see "Sources"). The pieces that build
  their functions read their chapters page by page first (E8a–E8c, E9b, F6).
- **The hours** are the column's sum (306 h), estimates.
