# ZOLL M2 Operator's Guide: Rev. C (English) against Rev. D (French), the differences (brief 178)

**Purpose.** The defibrillator plan is built to the English Operator's Guide Rev. C; its DQ2 asks the owner which
revision his unit runs. The owner allowed a second file: the French Rev. D. This note lists what differs, so that the
owner's answer to DQ2 has a known cost. The plan is NOT rebuilt on Rev. D. A French screen figure decides layout only,
never the words: the device's words stay English on the face (plan §4.5).

**The two documents (on disk, never copied into the repository).**

- **[C n-m]** (cited **[G n-m]** in the plan): REF 9650-000873-01 Rev. C, December 2021, English, 294 PDF pages,
  `assets/defibrillators/zoll-m2/9650-000873-01-SF_C.pdf`.
- **[D n-m]**: REF 9650-000873-02 Rev. D, December 2024 [D p. ii], French, 312 PDF pages,
  `assets/defibrillators/zoll-m2/rev-d-fr/9650-000873-02-SF_D.pdf`.

A third revision, the English **Rev. E** (REF 9650-000873-01, August 2023), was later allowed by the owner and read
in full: `defib-zoll-m2-rev-e-differences.md`. It is older than this French Rev. D; rows 10–14 below were found through it.

## 1. How the comparison was made

1. **Record of changes.** Rev. D has none: its page ii gives only the issue date, and no revision history appears
   anywhere in the file (searched for "révision", "modification", "historique").
2. **Table of contents.** Both tables of contents were extracted and aligned entry by entry (322 entries in Rev. C, 323
   in Rev. D).
3. **Page counts, chapter by chapter**, from the printed footers (§2).
4. **Numbers.** Every number with a unit (J, ms, mA, ppm, s, min, mmHg, Hz, cm, %, Ω, kg, h) was extracted from both
   texts chapter by chapter, decimal commas normalised, and the two multisets compared; each mismatch was looked up in
   context. Almost all were formatting (units written differently, table text extracted in a different order).
5. **Figures.** Pages carrying images were listed with `pdfimages -list` in both files and compared chapter by chapter;
   every Rev. D figure on a page whose Rev. C counterpart has no figure was looked at.
6. **Sections read side by side in full:** chapter 2 battery, date and quick-key pages, chapter 15, the CPR and timing
   passages of chapter 12, chapter 16's threshold passages, chapter 17's data-transfer section, chapter 18's
   self-test and cleaning sections, appendix A's alarm tones, Table A-2 and CPR specification, and appendix C's message
   count.

What this does not catch: a reworded sentence with no number, no heading and no figure in a chapter not read side by
side (chapters 3–11 and 13 were compared by headings, numbers and figures only).

## 2. Page counts by chapter

| Chapter | Rev. C pages | Rev. D pages | Note |
|---|---|---|---|
| Front matter | 12 | 12 | |
| 1 General information | 26 | 28 | French text longer; same 48 headings |
| 2 Product overview | 18 | 20 | one new section, Date and time (§3, row 1) |
| 3, 4 | 4, 4 | 4, 4 | |
| 5 Alarms | 8 | 8 | |
| 6, 7 | 14, 8 | 14, 8 | |
| 8 NIBP | 14 | 16 | same headings and numbers; longer French text |
| 9 CO2 | 18 | 20 | same |
| 10, 11 | 10, 6 | 10, 6 | |
| 12 AED | 12 | 14 | new subsection on CPR depth and rate display (§3, row 2); headings regrouped |
| 13 12-lead | 18 | 20 | same headings and numbers |
| 14 Manual defibrillation | 20 | 20 | |
| 15 Real CPR Help | 4 | 6 | new subsection and two new figures (§3, row 2) |
| 16 Pacing | 10 | 12 | one sentence changed in meaning (§3, row 4); one heading split by the layout |
| 17 Data and reports | 22 | 22 | full-disclosure terminology (§3, row 6) |
| 18 Maintenance | 16 | 18 | longer temperature-probe cleaning and disinfection (§3, row 7) |
| A, B, C | 36, 4, 10 | 36, 4, 10 | |
| **Total** | **294** | **312** | |

## 3. The differences

| # | What differs | Rev. C | Rev. D | Kind | Effect on the plan if the owner's unit is Rev. D |
|---|---|---|---|---|---|
| 1 | **Setting the date and time.** A Date and Time window opened with the Trim Knob on the date and time in the header: year, month, day, hour, minute, second; "Modifier config." then a confirmation that the system must restart ("Redém. syst. après changem. heure. Continuer ?", Oui / Non); left by the X or the Menu button | not described | [D 2-6], two figures | function documented (Rev. C's units may have it without saying so) | a header field that opens a window; an instructor-only or a marked inert function. New row under §2.1 (Q) |
| 2 | **CPR depth and rate shown in colour.** With adult CPR pads the depth and rate are green by default and turn yellow when consistently outside the AHA/ERC range of 5–6 cm and 100–120 cpm; red in the high-contrast display mode; always green with paediatric CPR pads | not described (depth and rate only [C 15-3]) | [D 12-10], [D 12-11], [D 15-3], [D 15-4], with screen figures | function added (or newly documented) | changes F2's dashboard and E3's sensor output needs a "consistently out of range" rule; the 5–6 cm and 100–120 cpm thresholds are Rev. D's words, matching ERC/AHA 2025 (plan §7.1) |
| 3 | **Figures Rev. C lacks.** The AED-with-CPR screen in colour-coded form and in the **high-contrast (white background) display mode**; an **AED-mode second key level** (a "Limit." key and four icon keys) | none | [D 12-11], [D 15-3], [D 15-4] | figures | settle the look of the high-contrast mode (D24) and a second key level, for layout only; no other view the plan lists as unpictured (full Sync screen, internal paddles, System window, Supervisor menus, rear photograph, Manual Defib second level) is pictured in Rev. D either |
| 4 | **The ideal pacing current.** "usually about 10% above threshold" | [C 16-6], [C 16-9] | "généralement 10 % en dessous du seuil" (10 % **below** threshold) [D 16-6], [D 16-10] | wording; read as a translation error (a current below threshold cannot keep capture) | none: the plan keeps Rev. C; noted in `defib-zoll-m2-pacing.md` §1 |
| 5 | **CPR voice prompts** | "issues voice prompts" [C 15-3] | "peut être configuré pour émettre des messages vocaux" (can be configured to) [D 15-5] | configuration documented | one more configuration input (§5.4): voice prompts on/off |
| 6 | **Full disclosure** | "Full Disclosure Recording", with USB and WiFi transfer as subsections [C 17-13] to [C 17-17]; the Patient Information key "to accompany Summary and full disclosure reports" [C 2-15] | "Enreg. registre serv." (service log recording), same ≥ 6 h, same USB/WiFi steps, the transfer subsections no longer listed in the contents [D 17-13] to [D 17-17], [D 2-16] | terminology (the French term for the same file) | none |
| 7 | **Temperature probe cleaning** | a short paragraph [C 18-10] | a full cleaning and disinfection procedure (15 s wipe, 10 % bleach 3 min, rinses; 300 cycles) [D 18-10], [D 18-11] | instructions to the user | none |
| 8 | **Appendix C messages** | 141 table entries by type column | 142 [D C-1] to [D C-10] | message added to the table: identified through Rev. E as "Check RESP Electrodes" ("Vérifier électrodes RESP", Equipment, Medium [D C-10]; [E C-2]) | L8 and M18 gain its priority |
| 10 | **Post-shock alarm suspension** (found through Rev. E, missed by the first comparison because it has no heading and its number was read as formatting) | no statement | patient alarms suspended 10 s after each shock, equipment alarms not [D 5-5] | function added (also in Rev. E [E 5-5]) | L4, E7b |
| 11 | **Alarm system log** (as row 10) | no statement | Supervisor-mode alarm system log, 1 000 entries, retained [D 17-2] | function added (also [E 17-2]) | R2 or a new R10, E9a |
| 12 | **SFTP server port** (as row 10) | "cannot be changed" [C 17-20] | entered on the numeric keypad [D 17-21] | configuration (also [E 17-20]) | R6 |
| 13 | **"Pads/Paddles ECG Disabled" priority** (as row 10) | Medium or Low in Pacer/Manual/Monitor by configured Defib mode [C C-7] | Medium [D C-6] | message priority (also [E C-7]) | L8, E7c |
| 14 | Paddle test step 12 (as row 10) | Energy Select "on the Apex paddle" [C 18-7] | "sur la palette du sternum" [D 18-6] | wording, a correction (also [E 18-7]) | none |
| 9 | Chapter 12 contents | "AED Mode" and "Therapy Electrode Application" listed as headings | the same text, not listed in the contents; "3 Appuyez sur CHOC" numbered 3 | layout | none |

**Checked and unchanged** (number for number): energy list and charge times [A-2]; Table A-2 (Rev. D's table extracts cleanly; the 70 J and 120 J rows the plan
cites were compared: 120 J → 85 / 131 / 143 / 147 / 150 / 147 / 143 J over 25–175 Ω; the other rows were not checked
cell by cell against Rev. C's page image) [A-16]; the alarm tones, including the 6-second
repetition at [A-7]/[D A-8] that conflicts with the 10 s of chapter 5 [C 5-4]/[D 5-4] (DQ15 is not resolved by Rev. D);
the AED timings (analysis 5 s message, 10–50 s then 5–10 s tones, 15 or 60 s, CPR period 2 min, metronome 105 /min)
[C 12-6] to [C 12-10]; the pacing ranges, 40 ms pulse, 40–80 mA typical threshold, the 10-minute resume rule [C 16-4] to
[C 16-6], [A-10]; CPR sensor range 1.9–7.6 cm, ± 0.6 cm, 50–150 /min [A-10]/[D A-11]; the quick-access key table [C 2-13]
to [C 2-16]/[D 2-14] to [D 2-17]; the battery icons [C 2-6]/[D 2-7]; the 30 J test and shift checks (chapter 18).

## 4. What the owner's choice of revision would change

**Amended after the English Rev. E was read** (`defib-zoll-m2-rev-e-differences.md`): rows 10–14 were found by
looking for each Rev. E change in Rev. D; the first comparison (numbers, headings, figures) had missed them, so the
"What this does not catch" caveat of §1 was real. Rev. E (August 2023) is *older* than this French Rev. D (December
2024); Rev. D holds every Rev. E change.

Choosing Rev. D's content adds, over Rev. C: Rev. E's five changes (post-shock alarm suspension, the alarm system log,
the SFTP port, one message priority, one message added to the table), and three of its own: a date-and-time window,
colour-coded CPR depth and rate (5–6 cm, 100–120 cpm) with their figures, and one configurable switch for CPR voice
prompts. No English text of those three was found (Rev. E lacks them), so their English words are not known.
