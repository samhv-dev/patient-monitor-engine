# ZOLL M2 picture register (M0d, brief 178)

**Purpose.** The fidelity standard of the defibrillator plan (§1) lets published pictures decide what they show (layout,
proportions, colours, words, order, controls) and the guide's text decide the rest; everything else is a marked choice
(`eng`). This register lists, for every view the face needs (the plan's §4.1, both tables), which picture shows it,
what that picture decides and what it does not show; then where a picture of each view no picture shows could be seen;
then the search for the *ZOLL M2 Configuration Guide*.

**Pictures on disk (none is copied into the repository).**

- **[G n-m]**: *ZOLL M2 Operator's Guide*, REF 9650-000873-01 Rev. C, December 2021, by printed page. Every page of
  chapters 1–18 that carries an image was listed with `pdfimages -list`; each page with a screen, window or device
  figure was looked at as a page image.
- **[D n-m]**: the French Operator's Guide, REF 9650-000873-02 Rev. D, December 2024. **A French screen decides layout,
  colours and order only, never words**: the device's words stay English on the face (plan §4.5).
- **[B p]**: the three-page distributor brochure (2018), by PDF page.

## 1. The views the plan lists as shown (plan §4.1, first table)

| View | Shown by | What it decides | What it does not show |
|---|---|---|---|
| Front, straight | [G 2-3] Figure 2-1 (labelled drawing); [B 3] photograph, front straight with the handle | bezel layout: screen with five keys at its left; SHOCK, CHARGE, ENERGY SELECT and the mode selector at the right; Alarm Control, Menu, Trim Knob, Print, NIBP below; LEDs lower left; paper door | colours at full resolution ([B 3] is small); the key legends close up; the side and rear |
| Front, three-quarter | [B 2] photograph (device on the ground, CPR dashboard on screen) | proportions, depth, the handle, the paddle-well side, the knob | the rear; the screen too small for words |
| Screen, Monitor | [G 2-5] Figure 2-2; also [G 3-3] (two Monitor screens with the key column: lead, 12, code marker, CO2, More) | header, status bar, quick keys, four traces, numerics and their colours | the high-contrast (white) display mode: Rev. C has no figure of it; Rev. D does [D 12-11], [D 15-4] |
| Quick keys, Monitor levels | [G 2-13] (the three key levels and their icons) | key icons and levels in Monitor | levels in Manual Defib beyond the first (see §2) |
| Screen, AED with CPR | [G 15-2]; [B 2]; Rev. D adds colour-coded depth and rate, in both display modes [D 12-11], [D 15-3], [D 15-4] | dashboard (depth, rate, time; energy; shock count), bar graph, "AED: Perform CPR", keys Manual Defib / Analyze | — |
| Screen, AED analysing | [B 2] | "AED: Analyzing ECG" with the energy box | the Shock Advised / Press Shock states (text only [G 12-7]) |
| Screen, Pacer | [G 16-4]; [B 2] | Pacer dashboard (Rate, Output, Mode), markers, keys Lead / 4:1 / code marker / More | the "Pacer: Attach Pads" status bar and the flashing Clear key (text only [G 18-5]) |
| Paddles | [G 2-10] to [G 2-12] (Figures 2-7 paddle release, 2-8 MFC on the APEX paddle, 2-9 paediatric plate); [G 14-7] (paddles applied, drawing) | APEX/STERNUM controls, the release, the paediatric plate | colours; a photograph |
| Alarm display | [G 5-2], [G 5-3], [G 5-4] (Figures 5-1 patient alarm, 5-2 multiple alarms, 5-3 equipment alarm) | message bar colours, the "+" | — |

## 2. The views the plan listed as shown by no picture (plan §4.1, second list), re-checked

**Six of the eight are in fact pictured in Rev. C.** The plan's list was written before chapters 3, 4, 6–11, 13 and 18
had been looked at page by page, and before chapter 14's figures were read for keys.

| View | Shown by | What it decides | What it does not show |
|---|---|---|---|
| **Manual Defib screen** | **[G 14-6]** (CHARGING with the energy bar; READY), **[G 14-7]** (Delivered Energy 134 J, shock count 2, Selected Energy 120 J), **[G 14-11] to [G 14-13]** (the same states with pads) | message bar "Manual Defib: Check Patient", the bottom energy region (CHARGING / READY / Delivered Energy box, lightning symbol with shock count, Selected Energy box), header "Manual Defib", numerics | the paddles-in-use variant; an alarm-free screen |
| **Manual Defib first-level keys** | **[G 14-6]**, [G 14-7], [G 14-11] to [G 14-13] | from the top: lead ("I, II, III…"), SYNC, AED, CO2, and at the bottom Disarm while charging or charged, the More arrow otherwise | the second and third levels in Manual Defib (no picture; Rev. D shows an AED-mode second level [D 12-11], [D 15-4]: a key labelled "Limit." and four icon keys, read from the small figure as Patient Information, Data, Brightness and the back arrow, an identification to confirm at full resolution) |
| **Sync screen** | partly: [G 14-14] (an ECG trace with "S" markers over each R wave), [G 14-16] (the green SYNC key alone) | marker shape and place; the key's green state | the whole screen with "Sync Defib" in the message bar [G 14-16]: **not pictured** |
| **Menu windows** | Waveform Sources [G 3-3]; Patient Trend Data [G 4-2] (Figure 4-1); Alarm Limits Setting [G 5-7]; ECG Setting [G 6-10] (Figure 6-4); Resp [G 7-4] (Figure 7-1); NIBP Setting [G 8-9] (Figure 8-3); CO2 Setting [G 9-16] (Figure 9-2); SpO2 Setting [G 10-6]; Patient Setting [G 13-9]; Patient Name keyboard [G 13-11]; 12-Lead ECG Snapshot List [G 13-14]; Select Rescue Incident to Print [G 17-3], [G 17-5] | the window frame (blue title bar, X at top right), the category column at the left (ECG, RESP, SpO2, NIBP, CO2, Alarm Limits, System, with the open one in orange), field layout and order, the back arrow | the **System** window (volume, brightness [G 2-16], [G 18-12]); the Temp settings (only a T2 numeric is pictured [G 11-3]); the code-marker list [G 2-16]; the **Supervisor** menus |
| **12-lead screen** | [G 13-8] (real-time 2 × 6 with the 12-lead key column); acquisition bars [G 13-11], [G 13-12] | layout of the 12-lead view, its keys, the "Acquiring 12 Lead" and "Acquisition Complete" dialogs | the review screen of a stored snapshot (text only [G 13-14]) |
| **Rear and side connector panels in use** | drawings only: [G 2-7] Figure 2-3 (rear connectors), [G 2-9] Figure 2-4 (MFC), [G 6-6] Figure 6-3 (ECG cable), [G 8-5] Figure 8-1 (NIBP hose), [G 11-2] Figure 11-1 (temperature), [G 17-13] Figure 17-12 (USB) | connector positions and order | **no photograph** of the rear or side; colours of the connectors |
| **Internal paddles** | none ([G 14-18] has no figure) | — | **not pictured** |
| **Printer strip** | Trend Data Report [G 4-3] Figure 4-2; 12-lead prints [G 13-3], [G 13-16] to [G 13-18]; Summary Report, Event Log and the nine snapshot types [G 17-4] to [G 17-11] (Figures 17-1 to 17-11); the open printer door and paper [G 18-11] (Figures 18-1, 18-2) | strip layout, annotation lines, grid | the live recorder strip of real-time traces with its 10-second numerics (text only [G 3-2]) |

**Views still shown by no picture:** the full Sync screen; the Manual Defib second and third key levels; the System
window and the Supervisor menus; the code-marker list; the internal paddles; a photograph of the rear and side panels;
the high-contrast display mode in Rev. C (Rev. D shows it).

## 3. Where those views could be seen on the web (not downloaded, not copied)

Searched on 12 November 2026 with web search (queries: ZOLL M2 rear panel connectors photo; ZOLL M2 internal paddles;
ZOLL M2 synchronized cardioversion training video; "ZOLL M2" youtube; ZOLL M2 product overview video or demonstration;
Spanish-language distributor queries) and by opening ZOLL's pages.

| Page | URL | What it shows | Status |
|---|---|---|---|
| ZOLL M2 product page | https://www.zoll.com/en-en/products/emergency-care/monitors-and-defibrillators/m2 (also skippy.zoll.com/en/…/m2) | unknown | HTTP 403 to automated reading |
| ZOLL M2 home (info.zoll.com) | https://info.zoll.com/en/zoll-m2-home | one header image ("M2 Monitor/Defibrillator", file `Page_1_M2_HeaderImage.png`); which view is not stated in the page text | read; the image itself not opened |
| "ZOLL M2 Defibrillation" (YouTube) | https://www.youtube.com/watch?v=03z_7zVcm1k | by its title, the device in defibrillation use: likely the Manual Defib screen and keys, possibly Sync | found by search; YouTube refused the connection from this machine, so not seen |
| "Monitor Desfibrilador Zoll M2" (YouTube, Spanish) | https://www.youtube.com/watch?v=vOkQ2w5m3mc | by its title, a product overview (possibly rear panel and menus) | as above, not seen |
| "Desfibrilador Zoll M2" (YouTube, Portuguese) | https://www.youtube.com/watch?v=NXy_kz5urSQ | by its title, a product overview | as above, not seen |
| ManualsLib copy of REF 9650-000860-01 | https://www.manualslib.com/manual/2907997/Zoll-M2.html | the same guide figures as Rev. C | bot check (plan §7.3) |
| distributor document (Mexico) | https://www.beracahmedica.mx/web/content/239639 | unknown | HTTP 403 |

**No page was found that shows, and was seen to show, any of the still-unshown views.** The three videos are the best
leads for the Manual Defib and Sync screens in motion; someone with a browser should watch them and note the times at
which each view appears. For the rear panel, internal paddles and the Supervisor menus, the owner's own photographs
(DQ22) remain the dependable source.

## 4. The ZOLL M2 Configuration Guide: the search

The guide refers to it as both the "ZOLL M2 Configuration Manual" [G 7-2], [G 8-8], [G 9-13], [G 13-7] and the "ZOLL
M2 Configuration Guide" [G 18-2], [G 18-3].

- **Web search** (12 November 2026): "ZOLL M2 Configuration Guide supervisor menu"; "M2" "Configuration Manual" ZOLL
  9650. Results: Operator's Guides only, and the *X Series* Configuration Manual (REF 9650-001358-05 Rev. E,
  legacy.zoll.com), which is another device and does not decide the M2's defaults.
- **ZOLL's pages:** `info.zoll.com/m2-operators-manual`, `info.zoll.com/zoll-m2-features` and
  `info.zoll.com/zoll-m2-resources` answer 404; the zoll.com product pages answer 403.
- **ZOLL's file host** (`info.zoll.com/hubfs/Products/M2/Manuals/`) lists, through search results, Operator's Guides
  under REF 9650-000873-xx in many languages and revisions (for example -02 Rev. C and D, -04 Rev. C, -15 Rev. E, -17
  Rev. B, -23 Rev. D (Spanish, September 2023), -24 Rev. D (Portuguese, August 2023), -55 Rev. D and E, -56 Rev. B and
  C, -70 Rev. C, -75 Rev. E and F). A header-only request (no download) found that the **English
  `9650-000873-01-SF_E.pdf` exists (HTTP 200, 12 475 735 bytes, last modified 9 January 2026)**, a revision newer than
  both Rev. C and the French Rev. D. No Configuration Guide or Manual was found on the host or anywhere else.
- **Conclusion:** G-CFG stays open. The factory defaults stay the owner's answers (plan §5.4); two of them are now in
  the Operator's Guide itself: the ready time-out of 60 s [G 1-13], and Sync cleared after each shock unless configured
  otherwise [G 1-16], [G 14-16].
