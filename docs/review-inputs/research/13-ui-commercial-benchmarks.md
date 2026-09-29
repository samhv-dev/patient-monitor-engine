# 13 — Commercial patient-monitor UI profiles

*Filed verbatim by the orchestrator, 2026-09-28 (research subagent hand-back received ~17:40, filed after the 12th cap). Input to the Stage 9 clinical UI plan (R55/R56). Model-derived research: verify any number before it becomes an acceptance test.*

## Commercial patient monitor UI profiles (research report, 2026-09-28)

**Coverage.** The full manuals for Philips, GE, Mindray, Nihon Kohden and Masimo were downloaded and read directly (PDF to text), so claims for those vendors come from the IFU text, with page or section cited. Dräger was the exception. draeger.com, manualslib, manuals.plus, pdfcoffee and manualzz all returned 403 or a bot check, so the Dräger section rests on search-result snippets and one distributor brochure; treat it as low confidence. AAMI HE75 (paywalled, and the preview link has an expired TLS certificate) and the full IEC 60601-1-8 text could not be read. IEC alarm-light values below are as the Mindray and GE manuals restate them.

**Side effect to report.** One attempt to open a Dräger PDF in the Browser pane made draeger.com serve a file download. The user was shown a save dialog. I did not retry it.

**Search budget.** WebSearch and WebFetch hit their session limit near the end. The last literature lookups used the Europe PMC REST API through curl instead.

---

### 1. Philips IntelliVue MX (MX450/550/750/850)

**Layout**
- The **monitor info line** runs across the top. It holds network status, bed label, patient category, patient name, date and time, the Profile, the current **Screen name**, alarm volume and the **alarm status area**.
- Waveform channels sit on the left and numerics on the right.
- A row of **SmartKeys** runs along the bottom, with scroll arrows.
- Permanent keys: Silence, Pause Alarms, Main Screen and Main Setup.
- MX450–550 have no reserved status line.
- Screen sizes: MX750 has a 19″ Full HD panel and MX850 a 22″ Full HD panel. Brightness can adapt automatically to ambient light.

**Screens**
- A "Screen" is a preset layout, for example "OR adult".
- Changing a wave or numeric on the fly marks the Screen name with `*`. Up to 3 modified Screens are kept, and the 10 most recent Screens can be recalled.
- Switching Screens never changes alarm settings.
- Almost every element is touchable: tapping the HR numeric opens Setup ECG, tapping the wave opens the lead menu.
- Pop-up windows can be dragged, but never over the info line or the alarm area.
- The touchscreen can be locked with a long-press on Main Screen.

**Alarms**
- Message text appears in the top alarm area on a background of the priority colour. Messages rotate every 2 s, with an arrow when more than one is active.
- Priority markers: `***` red, `**` yellow, `*` short yellow.
- Standard INOPs are **light blue (cyan) with no marker**. Selected INOPs can be configured to `!!!` red or `!!` yellow.
- An INOP that interrupts measurement replaces the numeric with `?`.
- The alarming numeric flashes, and the violated limit is drawn brighter.
- The front lamp has two sections, left for INOPs and right for patient alarms. Yellow INOP blinks 1 s on / 1 s off; red INOP blinks 0.25 s on / 0.25 s off.
- Pause state shows "Al. Paused x:yy" with a countdown and a symbol. INOP text stays visible during a pause.

**Trends**
- Screen trends are colour-matched to their parameter and can be shown as graphic, tabular, histogram or **Horizon** view.
- Horizon view draws a white baseline or target band, a 2/5/10-min trend arrow, and a deviation bar showing distance from the baseline.
- ProtocolWatch runs a configurable SSC Sepsis protocol.

**Visual Patient Avatar** (integrated into the MX series since March 2023)
- It maps vital signs to colour, shape and motion on an avatar.
- Tscholl 2018 (BJA): 9 vs 5 vital signs recalled correctly, task-load index 60 vs 76.
- ICU version (Bergauer 2023): rate ratio 1.25 for correct assessments, diagnostic confidence OR 3.32.
- Viewing distance (Milovanovic 2025): +74% correct at 8 m and +51% at 16 m.
- Caveats:
  - Nearly all studies are computer simulations by the Zurich group.
  - The group declares patents and licensing with Philips (stated in PMC10650006).
  - A 2025 review asks for thresholds that users can customise or align with the alarm limits.

**Excellent:** strict zoning with a protected alarm area; Screen/Profile separation; `*` marks on modified Screens; Horizon trends; avatar research.

**Avoid:**
- Kim 2023 found MX700 was not rated more usable than a low-cost Mediana M50, while MP70 did beat the M50.
- Philips' redesigned alarm sounds were liked better, but recognition of low- and medium-priority alarms dropped from 95.2% to 87.5% (Hunn 2025).

### 2. GE HealthCare CARESCAPE B450/B650/B850 and CARESCAPE ONE

**Layout (B650/B850 manual)**
- Top-left **alarm area** and top-right **information area** (patient, profile, bed, battery, time).
- Centre **waveform area**, with an optional **split-screen area** on the left for ST, spirometry, EEG CSA, AEP or minitrends.
- **Upper parameter windows** stacked on the right; optional **lower parameter windows** (up to 8) along the bottom; **Main menu** bar at the very bottom.
- Parameter windows come in four sizes: big, small, tall, wide. With the lower area on, up to 6 waveforms and 12 upper windows fit.
- Invasive pressures can be combined into one field, or "4invP" (4 pressures in one field).
- The 15″ B650 panel is available with or without touch.
- The dual-video B850 configures Screen 1 and Screen 2 separately.

**Navigation**
- Touchscreen, mouse or **Trim Knob** (rotate to highlight, press to select).
- The Normal Screen plus up to 5 password-configured "Pages" per profile, reached through Data & Pages; a Home key returns to Normal Screen.

**Alarms**
- High: white text on red in the alarm area; parameter window flashes black on red.
- Medium: black on yellow. Low: black on cyan. Informational: black on grey.
- The light flashes red or yellow, is solid blue for low priority, and its audio-pause segment turns solid blue while audio is off.
- Minitrends follow the graphic trend scales.

**CARESCAPE ONE** (secondary data sheet, not read directly): 7″, 800×480 panel, up to 4 waveform fields, 7 parameter windows and 4 "digit fields".
- I found no evidence for a GE portrait mode.
- I could not verify a "Quick keys" feature under that name. GE's documented equivalent is the Main menu bar plus hardkeys.

**Excellent:** four window sizes that scale automatically; split-screen area for context views.

**Avoid:** configuring pages needs a password; the knob-and-menu depth is legacy.

### 3. Mindray BeneVision N series (N12/N15/N17/N19/N22)

**Layout**
- Top band, left to right: patient information, current configuration, **technical-alarm area**, **physiological-alarm area**, system-status icons.
- High-priority physiological alarms sit on the upper line; medium and low alarms rotate on the lower line.
- Waveforms on the left, numeric tiles on the right, plus a combined wave-and-numeric area.
- **Quick-key bar** along the bottom: 14 keys (12 on N12) plus More.
- ECG is always the first row.
- Screens can rotate to portrait with a Rotate Screen key and landscape/portrait settings.
- The N22 and N19 have 22″ and 19″ displays.

**Screens and navigation**
- Screen Setup offers Normal, Big Numerics, Minitrends, OxyCRG, BoA Dashboard and others.
- A **two-finger swipe** switches between Normal and Big Numerics.
- Tile Layout is edited per area through a pop-up list.
- Waveform and numeric colours are set per parameter in Parameter Color.
- Menus share one template: heading, sub-tabs, body, Exit; switches show green for on and grey for off.
- Night and privacy modes are available.

**Alarms**
- Message boxes: high is white on red, medium black on yellow, low black on cyan.
- Markers `***`, `**`, `*` precede the message; the parameter value flashes inside a box of the priority colour.
- Lamp: red flashing at 1.4–2.8 Hz and yellow at 0.4–0.8 Hz, both at 20–60% duty; cyan steady.
- An acknowledged alarm shows `√` in front of its message.
- During a pause, a countdown appears in the alarm area. Technical alarm lamps and messages persist while tones are paused.

**Trends and decision support**
- The Minitrends screen has a Baseline mark in OR mode and alarm statistics.
- OxyCRG stores 48 h of trend curves.
- The **BoA Dashboard** has Induction, Maintenance and Recovery pages. It includes an apnoea timer and a three-arm "Triple Low" / anaesthesia-status indicator: green in range, red out of range, grey invalid, black normal-range ticks.

**Contrast with ePM:** not researched. No ePM sources were read.

**Excellent:** separate technical and physiological alarm lanes; swipe to big numerics; Triple Low glyph.

**Avoid:** 14+ quick keys and deep Main Menu columns means high feature density.

### 4. Dräger (Infinity M540, Delta, Acute Care System; Vista 120/300; Perseus A500) — low confidence

The primary IFUs were blocked; everything here comes from snippets and one brochure.
- M540: a blue **header bar** across the top with an alarm message field. Its far-right field turns yellow with "all alarms off".
- Parameter boxes show the value, limits and icons; touching a box opens its dialog.
- Five preconfigured "views".
- Delta: fixed front-panel keys (Alarm Silence for 2 min, Menu). When a parameter alarms, both its box and the alarm message field turn red. Life-threatening alarms flash red; serious alarms flash yellow.
- Cockpit C500/C700 (17.3″ / 20.5″ widescreen): split screen showing live data next to hospital IT, 96 h of trends, up to 8 preconfigured plus 8 custom views.
- Perseus A500: 15.3″ touchscreen plus a rotary knob that confirms settings. SmartPilot View is a separate 21″ display that models drug interactions and predicts their course.
- Vista 120: 15″ screen, up to 13 waveforms.

**Excellent:** one interface shared across monitor, ventilator and workstation.

**Not verified:** colours, fonts, trend visuals.

### 5. Nihon Kohden Life Scope (BSM-6000, G5/G7/G9)

**BSM-6000 home screen**
- Waveforms with numerics on the right side, or "side + small bottom".
- Optional **large-numeric 2×2 layout**.
- A current-trendgraph strip that can be swapped for OCRG or PWTT.
- Function keys along the bottom.
- Alarm limits appear inside each numeric, shown as "OFF" or "—" when disabled.
- Tapping a numeric opens that parameter's window; the Home key closes all windows.

**Alarm levels**
- Crisis: red highlighted message, red blinking lamp.
- Warning: yellow or orange, blinking yellow.
- Advisory: cyan or yellow, steady.
- A DISPLAY COLOR MODE setting chooses whether alarming numerics highlight in the alarm colour or keep their parameter colour.
- Arrhythmia alarms hold for 30 s (crisis), 20 s (warning) or 10 s (advisory).
- Separate message areas exist for vital-sign/arrhythmia alarms, technical alarms and interbed alarms.
- The silence key shows remaining minutes.

**Hemodynamics Graph (G-series)**
- A trendgraph on top and two **target graphs** below (preload such as CVP or PPV on x, cardiac function such as CI on y).
- Trace brightness encodes age, and red target zones mark the treatment goal.
- A yellow bar with a purple event triangle links the target-graph time window to the intervention.
- Based on the Forrester classification.

**Hardware (snippets)**
- G5Max: up to 15 soft keys and 3 quick-recall screen configurations.
- G9: 19″ panel (18.5–24″ options), up to 17 waveforms.

**Not verified:** any "Respiratory" graphic view.

**Excellent:** goal-directed target graphs with visible time history.

### 6. Masimo Root / Radical-7 / UniView / Replica

**Root layout**
- **Status bar** on top with alarm-silence and audio-pause icons that show status, profile, time and connectivity.
- Configurable **Windows** in the middle; an **Action bar** at the bottom (Admit, EMR push, events, Main Menu).
- Each Window pairs the waveform with either:
  - **Trend View**: each numeric beside its own trend graph with limits; pinch to zoom.
  - **Analog View**: needle gauges with white normal, yellow caution and red alarm arcs. A quarter circle is used when normal is at one end of the range, a half circle when it is in the middle.
- Gestures: swipe, drag a numeric onto a trend display, swipe to split or merge pleth and acoustic waves.

**Radical-7:** the **Signal IQ** indicator draws a vertical bar at each pulse; its height shows signal confidence.

**Adaptive Threshold Alarm**
- It learns the patient's SpO₂ baseline in 1.5–2 min and derives a personal limit.
- It still alarms immediately on rapid or prolonged desaturation.
- Masimo reports 86% fewer audible alarms at a 90% setting. This is vendor data from a search snippet; I did not re-check the figure.

**UniView (supplemental display)**
- Layouts: Overview, Hemodynamics, Oxygenation, Sedation.
- An alarm shows as a red pill with a pulsing glow at top centre and a glow behind the parameter.
- Trend durations range from 10 min to 96 h.

**Replica:** a phone app that mirrors monitors and pushes alarms.

**Excellent:** gauges that show limits in context; built-in signal-quality display.

### 7. Saadat Alborz B9 / Alvand (brief)

- saadatco.com (page_id=2839, in Persian) lists for the Alborz B9: 18.5″ at 1366×768 with 170° viewing angle, 6–8 waveforms and 10 parameters, a trend screen with 6 parameters, OxyCRG (HR, SpO₂ and Resp in one column), and "Multi Page" layouts plus a dedicated **Pump Page** for open-heart surgery.
- Also: 96 h of trends, alarm recall with waveforms, user-selectable parameter colours, an 18-key shortcut keyboard with rotary knob, and optional touchscreen.
- The Alvand H18 page (page_id=2955) holds only manual links, no specifications.

---

### Human-factors evidence

- **Integrated or configural displays:**
  - Drews & Doig 2014: interpretation up to 2× faster and up to 1.9× more accurate.
  - Koch 2013: situation-awareness accuracy 85% vs 62%, task time 26 s vs 42 s.
  - Reese 2020: diagnostic accuracy 87% vs 82%.
  - Anders 2012: more abnormal variables detected.
  - Drews & Westenskow 2006: review of anaesthesia displays.
- **Trend formats** (Kennedy 2009): graphic trends detect change faster than numeric ones. More variables or shorter y-axes slow detection.
- **Far-view displays** (Görges 2011/2012): readable at 3–5 m; triage 11–12 s vs 17 s; decision accuracy +26–41%.
- **Alarms** (Görges 2009): 41% of alarms ignored; a 19 s delay would remove 67% of ignored or ineffective alarms.
- **Eye tracking** (Choi & Jang 2024): nurses overlooked alarm messages on the monitor.
- **IEC 60601-1-8 as restated by Mindray and GE:** red 1.4–2.8 Hz, yellow 0.4–0.8 Hz, cyan steady; IEC tone patterns. The 4 m perception requirement comes only from a secondary snippet.
- **HE75:** it contains a table of character height by viewing distance, but I could not read the values.

---

### Top 10 cross-vendor conventions
1. Black background.
2. Waveforms on the left, numerics on the right.
3. Alarm and status band at the top.
4. Soft or quick keys along the bottom.
5. Alarm colours: red high, yellow medium, cyan low or technical.
6. Priority markers `***`, `**`, `*` (Philips and Mindray).
7. The alarming numeric flashes or is boxed in the priority colour.
8. A separate physical alarm light following IEC flash rates.
9. Touching a numeric or wave opens its setup; a Home key closes everything.
10. Colour-coded parameters, with ECG usually green, and trends matching parameter colours. Colour assignments beyond ECG green are not fully verified.

(Also common: named layouts/profiles, a big-numerics screen, minitrends, and a pause countdown in the alarm area.)

### Top 5 differentiators
1. Research-backed integrated visualisations: Philips Visual Patient, NK target graphs, Mindray Triple Low/BoA.
2. Baseline-relative trends: Philips Horizon, Mindray OR baseline.
3. Separate technical and physiological alarm lanes, plus `√` acknowledgement (Mindray).
4. Limits shown in context: Masimo analog gauges, Philips bright limits.
5. Adaptive, patient-specific alarm logic and signal-quality display (Masimo ATA, Signal IQ).

---

### Sources
- Philips IntelliVue MX400–800 IFU (copy hosted by a third party): https://medaval.ie/docs/manuals/intellivue-manual.pdf
- Philips MX750/850 data sheet: https://santair.gr/wp-content/uploads/2021/01/MX750-MX850-Technical-Data-Sheet.pdf
- Philips MX750/850 IFU on FDA site (403, not read): https://www.fda.gov/media/137229/download
- GE CARESCAPE B850/B650 User's Manual: https://hit.healthsystem.virginia.edu/index.cfm/_api/render/file/?fileID=0B2D9590-17A4-77A0-3E7456AFB970EF54&fileEXT=.pdf
- GE CARESCAPE ONE data sheet (snippet only): https://medhold.co.za/wp-content/uploads/2021/05/CARESCAPE-ONE-Data-Sheet.pdf
- Mindray BeneVision N Series Operator's Manual: https://www.mindray.com/content/dam/xpace/en_gb/resources/downloads/education/education-nseries/operators-manual/BeneVision-N-Series-Operators-Manual.pdf
- Dräger C500/C700 brochure: https://portalimages.blob.core.windows.net/products/pdfs/04t1jo0n_C500andC700.pdf
- Dräger M540 IFU (blocked): https://www.draeger.com/Content/Documents/Products/infinity-ifu-3736514-en.pdf
- Dräger Delta IFU (blocked): https://www.manualslib.com/manual/1294304/Dr-Ger-Infinity-Delta.html
- Nihon Kohden BSM-6000 Operator's Manual: https://archive.org/details/manual_Nihon_Kohden_LifeScope_BSM-6000_Series_Operator_Manual
- Nihon Kohden Hemodynamics Graph: https://eu.nihonkohden.com/media/yhjwHVGy/Improvingthestandardofnon-invasivehemodynamicmonitoring.pdf
- Masimo Root manual: https://techdocs.masimo.com/contentassets/45feabbf491c456da328a6b199bcb70c/lab-8425c_master.pdf
- Masimo Radical-7 manual: https://techdocs.masimo.com/globalassets/techdocs/pdf/lab-5476.pdf
- Masimo UniView manual: https://techdocs.masimo.com/globalassets/techdocs/pdf/lab-9770b_master.pdf
- Masimo ATA whitepaper: https://www.masimo.com/siteassets/uk/documents/pdf/lab6255c_advanced_threshold_alarm_whitepaper.pdf
- Masimo Replica: https://www.medicalexpo.com/prod/masimo/product-71074-882257.html
- Saadat: https://saadatco.com/?page_id=2839 and https://saadatco.com/?page_id=2955
- Visual Patient papers:
  - Tscholl 2018: doi 10.1016/j.bja.2018.04.024
  - Milovanovic 2025: doi 10.1007/s10877-024-01239-x
  - Bergauer 2023: doi 10.1038/s41598-023-33027-z
  - Wetli 2022: doi 10.3390/diagnostics12020555
  - Review: https://pmc.ncbi.nlm.nih.gov/articles/PMC11948197/
  - COI statement: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10650006/
- Philips alarm redesign papers:
  - Hunn 2025: PMID 41373249
  - Gasciauskaite 2026: PMID 41920525
- Display research:
  - Drews & Doig 2014: doi 10.1177/0018720813499367
  - Drews & Westenskow 2006: PMID 16696257
  - Doig 2011: PMID 21412150
  - Kennedy 2009: doi 10.1111/j.1365-2044.2009.06082.x
  - Koch 2013: doi 10.1016/j.ijmedinf.2012.10.002
  - Koch 2012: PMID 22437074
  - Görges 2011: PMID 21654229
  - Görges 2012: PMID 22588528
  - Görges 2009: PMID 19372334
  - Anders 2012: PMID 22534099
  - Reese 2020: PMID 32548627
- Usability studies:
  - Kim 2023: doi 10.12659/msm.938570
  - Choi & Jang 2024: doi 10.3390/healthcare12242573
- IEC 60601-1-8 (secondary snippet only): https://elsmar.com/elsmarqualityforum/threads/patient-monitor-viewing-distance-usability-requirements.55670/
