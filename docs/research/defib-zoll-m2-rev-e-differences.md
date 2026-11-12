# ZOLL M2 Operator's Guide: Rev. C against Rev. E (both English), the differences (brief 178, follow-up)

**Purpose.** The defibrillator plan is built to the English Operator's Guide Rev. C; DQ2 asks the owner which revision
to build to. The owner allowed the English Rev. E found in M0d. This note lists every difference between the two, says
which rows of the plan's §2 each touches and what those rows would say if the plan were rebased on Rev. E, and checks
the figures the plan depends on. The plan is NOT rebased here.

**The two documents (on disk, never copied into the repository).**

- **[C n-m]** (the plan's **[G n-m]**): REF 9650-000873-01 Rev. C, issue date December 2021, 294 PDF pages,
  `assets/defibrillators/zoll-m2/9650-000873-01-SF_C.pdf`.
- **[E n-m]**: REF 9650-000873-01 Rev. E, issue date August 2023 [E p. ii], 294 PDF pages, 12 475 735 bytes,
  `assets/defibrillators/zoll-m2/rev-e-en/9650-000873-01-SF_E.pdf`.

**Order of the revisions.** The English Rev. E (August 2023) is older than the French Rev. D (December 2024; the
letters run per language). Every Rev. E change below is also in the French Rev. D (checked one by one, §4), and Rev. D
adds three more (`defib-zoll-m2-rev-d-differences.md`). Rev. E has no record of changes.

## 1. How the comparison was made

1. **Pagination.** The printed page number of every PDF page was read from its footer in both files: all 294 match,
   so page *n* of one is page *n* of the other.
2. **Text, page by page.** Each page was extracted with `pdftotext -layout`, whitespace runs collapsed, blank lines and
   the footer line dropped, and the two versions of each page compared with `diff`. Without collapsing whitespace the
   comparison reports about 700 lines, almost all from re-justified table-of-contents leaders; with it, 21 pages
   differ, and every differing line is listed in §2.
3. **Figures and tables.** Both files hold 339 images. Each embedded image of PDF pages 20–294 was extracted from both
   files and compared byte for byte: one differs (PDF page 69, [5-5], the Alarm Control icon), and the two versions
   were looked at side by side and show the same icon (re-encoded). On PDF pages 16–19 the images are the same symbols
   moved by one page because three symbols were added (§2, row 10). The tables are text and are covered by step 2;
   Table A-2 and Table A-4 (whose extracted text is scrambled) are byte-identical in their extracted text in both.
4. **The figures the plan depends on were checked by name** (§3).

## 2. The differences

| # | Class | Rev. C | Rev. E | Plan row touched, and what it would say on Rev. E |
|---|---|---|---|---|
| 1 | **Function added** | no statement | "Patient alarms are suspended for 10 seconds following each shock. After 10 seconds, the unit resumes the alarm as configured prior to the shock delivery. Equipment alarms are not suspended during this post-shock period." [E 5-5] | **L4** (pause, off, latching): add "patient alarms suspended for 10 s after each shock; equipment alarms not [E 5-5]". Piece E7b gains the rule and a test (an HR Low after a shock sounds only after 10 s). Also touches **D12**/**S7** only in that the shock starts the window |
| 2 | **Function added** | no statement | the alarm system log, accessible in Supervisor mode, kept through power-off, battery removal and loss of mains; up to 1 000 logs, oldest replaced when full [E 17-2] | **R2** (event log) or a new **R10** "alarm system log (Supervisor), 1 000 entries, retained [E 17-2]". Supervisor-only, so for the simulator a record the instructor's Debrief could show; E9a |
| 3 | **Default, range or limit changed** (configuration) | SFTP "Server Port: The server port cannot be changed." [C 17-20] | "Server Port: Use the numeric keypad to enter the server port." [E 17-20] | **R6** (full disclosure and transfer): the SFTP port becomes configurable. DQ12 decides whether transfer is simulated at all; no other effect |
| 4 | **Message priority changed** | "Pads/Paddles ECG Disabled": High in AED mode; in Pacer, Manual Defib and Monitor modes Medium if the Defib mode is configured to AED, Low if configured to Manual Defib [C C-7] | High in AED mode; Medium in Pacer, Manual Defib and Monitor modes [E C-7] | **L8** (equipment messages, appendix C as data): one priority row changes; E7c's table follows the chosen revision |
| 5 | **Message added to the table** | "Check RESP Electrodes" appears in chapter 7 [C 7-6] but not in appendix C | listed in appendix C: Equipment, Medium, "The patient's respiratory impedance is out of range" [E C-2] | **L8** and **M18**: the message gains its type and priority (Equipment, Medium); on Rev. C its priority is not stated anywhere |
| 6 | **Wording (a correction)** | paddle test step 12: press ENERGY SELECT (+/−) "on the Apex paddle" and the defibrillator disarms [C 18-7] | "on the Sternum paddle" [E 18-7] | **D11** (paddles): the plan's row says only "ENERGY SELECT on a paddle while charged disarms", true on both. The Energy Select buttons are on the Sternum paddle in step 9 of both revisions [C 18-6], [E 18-6] and on the Sternum paddle in [C 2-12] (the plan's D26): Rev. E corrects a slip in Rev. C. No change |
| 7 | Wording only | the trade mark "ZOLL M2™" [C cover], [C 1-1] | "ZOLL M2®" [E cover], [E 1-1] | none (the face draws no mark, §1) |
| 8 | Wording only | copyright 2021; EU representative's address [C p. ii] | copyright 2023; a new address [E p. ii] | none |
| 9 | Wording only | contents page numbers of chapter 18 one too low (18-2 for a section on 18-3) [C p. ix, x]; "Clinical Trial Results…" entry on p. x | corrected numbers; entry moved to p. xi [E p. ix to xi] | none |
| 10 | Wording only (labelling) | symbol table without three symbols [C 1-4] | adds "Country of Manufacture", "Humidity limitation", "Atmospheric Pressure limitation"; the rest of the table moves down, across [E 1-4] to [E 1-7] | none (labelling, not device behaviour) |
| 11 | Wording only | "CO2 Ambient Pressure Out of Range" at the foot of [C C-2]; "Pads/Paddles Sync Disabled" on [C C-8]; "T1 High" on [C C-9] | each moved up one page by rows 4 and 5 ([E C-3], [E C-7], [E C-8]) | none (same text) |

**No function was removed. No screen or figure Rev. C lacks is in Rev. E**: none of the views the picture register
lists as shown by no picture (the whole Sync screen, the Manual Defib second and third key levels, the System and
Supervisor windows, the code-marker list, the internal paddles, a rear photograph, the high-contrast mode) is pictured
in Rev. E. No default, range, limit or timing in chapters 2–16 or appendix A changed; no key label changed.

## 3. The figures the plan depends on, checked in Rev. E

| Item | Rev. C | Rev. E | Result |
|---|---|---|---|
| High-priority alarm repeat (DQ15) | 10 s in chapter 5 [C 5-4]; 6 s in the specification [C A-7] | the same two statements, unchanged [E 5-4], [E A-7] | **still in conflict**; Rev. E does not settle DQ15 (nor does the French Rev. D) |
| O2 compensation, figure against text | figure shows "160 mmHg" [C 9-16]; text "default … 21.0 %" [C 9-16] | figure byte-identical, text unchanged [E 9-16] | unchanged difference |
| Ready time-out default | 60 s "or other user configurable interval" [C 1-13]; "15 to 60 seconds (depending on configuration)" [C 14-7] | unchanged [E 1-13], [E 14-7] | same |
| Energy list | 1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200 J [C A-2] | unchanged [E A-2] | same |
| Table A-2 (delivered energy by load) | [C A-16] | extracted text identical [E A-16] | same |
| Pacer ranges | 30–180 ppm in 2 ppm steps, 8–140 mA in 2 mA steps, 40 ms ± 2 ms [C 1-11], [C 16-5], [C A-10] | unchanged | same |
| Alarm defaults and ranges (L6) | chapters 6–11 [C 6-11] to [C 11-4] | pages identical in text | same |
| CPR display | depth and rate, no colour coding [C 15-3] | unchanged [E 15-3] | same: the colour coding (green, yellow outside 5–6 cm and 100–120 cpm) appears only in the French Rev. D [D 12-10], [D 15-3] |
| Paediatric energies, escalation, AED timings, sync rules | [C 12-x], [C 14-x] | chapters 12 and 14 identical in text | same |

## 4. Rev. E against the French Rev. D

Each Rev. E change was looked for in the French Rev. D, and each is there: the post-shock suspension [D 5-5]; the
alarm system log, "1 000 entrées" [D 17-2]; the server port entered on the keypad [D 17-21]; "ECG élect./pal.
désactivé" Medium in Pacer/Manual Defib/Monitor [D C-6]; "Vérifier électrodes RESP", Equipment, Medium [D C-10]; Energy
Select "sur la palette du sternum" [D 18-6]. This also identifies the one appendix C entry Rev. D has more than Rev. C
(`defib-zoll-m2-rev-d-differences.md` row 8): it is "Check RESP Electrodes". The French Rev. D is therefore Rev. E's
content plus the date-and-time window, the CPR colour coding and the CPR voice-prompt switch.

## 5. What rebasing the plan on Rev. E would change

Five rows of §2 (L4, L8, M18, R2 or a new R10, R6), each by one statement, all listed in §2 with pages; pieces E7b, E7c
and E9a gain one rule or table row each. Nothing in the face, the pictures, the energies, the pacer, the AED or the
alarm defaults changes. DQ15 remains open under every revision.
