# ZOLL M2 Operator's Guide: reading log for the chapters read in part (brief 178)

**What this is.** The defibrillator plan (`docs/plans/defibrillator-zoll-m2.md`, PR 431) recorded that chapters 1, 3, 4,
6–11, 13 and 18 of the Operator's Guide had been read only in part (its "Sources" and §9). This log closes that: each of
those chapters was read page by page, and every section gets one line naming what the device shows or does there, or
"instructions to the user, no device behaviour". The findings were then compared with the plan's §2 (see "What this
reading changed in the plan" at the end).

**The document.** *ZOLL M2 Operator's Guide*, REF 9650-000873-01 Rev. C, December 2021, 294 PDF pages, the local copy
`assets/defibrillators/zoll-m2/9650-000873-01-SF_C.pdf` (git-ignored; nothing from it is copied here beyond what the
device itself shows: key labels, messages, numbers). Cited **[G n-m]** by the page number printed in the footer, as the
plan does.

**How it was read.** Text with `pdftotext -layout`, one file per PDF page, read in full; the printed page of each PDF
page was taken from its footer. The tables in these chapters came out of the extraction in order (unlike Tables A-2 and
A-4); the one whose meaning depends on typography (the NIBP inflation presets, defaults in bold [G 8-11]) was checked
on the page image. Every page in these chapters that carries a screen figure was then looked at as a page image for
the picture register (`docs/research/defib-zoll-m2-pictures.md`).

**Pages read page by page in this brief:** 1-1 to 1-26, 3-1 to 3-4, 4-1 to 4-4, 6-1 to 6-14, 7-1 to 7-8, 8-1 to 8-14,
9-1 to 9-18, 10-1 to 10-10, 11-1 to 11-6, 13-1 to 13-18 and 18-1 to 18-16: 138 printed pages (PDF pages 13–38, 57–64,
73–144, 155–172 and 229–244). Blank pages are named as blank.

**Statement of coverage (the sentence the plan now carries).** Every page of chapters 1–18 and appendices B and C of
the Rev. C guide has now been read page by page (chapters 2, 5, 12, 14–17 and appendices B and C in brief 168;
chapters 1, 3, 4, 6–11, 13 and 18 in brief 178, logged here); appendix A was read page by page only at A-1 to A-16,
A-27 to A-29 and A-34 to A-35, and its waveform figures (A-17 to A-26) and EMC tables (A-30 to A-33, A-36) remain read
in part.

### Chapter 1, General Information [G 1-1 to 1-25; 1-26 blank]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Product Description | 1-1, 1-2 | Monitoring list: ECG, HR, CPR rate and depth, SpO2, NIBP, respiration rate, CO2/EtCO2, temperature. Defib mode can be configured to start in AED or Manual. AED mode can be configured to analyse, charge and prompt "Press Shock" automatically; a front-panel key switches AED to Manual. Pacing demand and fixed, for adult, paediatric and neonatal patients. Printer and USB; optional wireless full-disclosure upload and 12-lead PDF by e-mail |
| Contraindications | 1-2 | AED mode not indicated under 1 year; NIBP not for patients allergic to nylon/TPU/PVC cuffs (instructions, no device behaviour) |
| How to Use This Manual; Guide Updates | 1-2, 1-3 | instructions to the user, no device behaviour |
| Unpacking | 1-3 | instructions to the user, no device behaviour |
| Starting up the ZOLL M2 | 1-3 | Turning the Mode Selector to a working mode: the screen lights, the self-test runs and prints a report (if configured), the system beeps, the two alarm lights light yellow and red then go out, the "All Tests Passed" window shows; pressing the Trim Knob selects OK |
| Symbols Used on the Equipment | 1-3 to 1-7 | Symbol table. Device-shown icons: alarm off, alarm audio off, alarm audio paused, Alarm Control key functions, implanted pacer markers disabled, battery charging status, WiFi, "no physiological signal / inadequate signal" icon. The rest are labelling symbols (no device behaviour) |
| Conventions | 1-8 | instructions to the user, no device behaviour |
| Indications for Use (patient groups) | 1-8 | Neonate: ≤ 28 days if born at term (≥ 37 weeks), otherwise up to 44 gestational weeks; Pediatric: 29 days to 8 years or < 25 kg; Adult: > 8 years or > 25 kg |
| Manual Defibrillation; AED indications | 1-8, 1-9 | Manual mode for all patient types; synchronised cardioversion; paediatric electrodes under 8 years or 25 kg; AED not under 1 year (instructions, no device behaviour beyond these) |
| ECG Monitoring indication | 1-9 | 2-lead (pads/paddles), 3-, 5- or 12-lead ECG; HR alarm above or below the operator's limits; neonate to adult |
| CPR Monitoring indication | 1-9 | Voice and visual prompts toward a depth of at least 5.0 cm (adult) and a rate above 100 cpm; in paediatric patient mode depth and rate are monitored with NO audio prompting |
| Pacing, NIBP, Temp, SpO2, Resp, CO2, 12-lead indications | 1-10, 1-11 | NIBP for patients over 3 years; impedance respiration measures effort, not airflow, not an apnoea monitor; SpO2 adult and paediatric; 12-lead neonate to adult |
| Defibrillator Function and Output Energy | 1-11 | Biphasic, settings 1 to 200 J; delivered energy determined by transthoracic impedance; paddles need gel and 10–12 kg force each |
| External Pacemaker | 1-11 | Output 8–140 mA continuously variable; 0 mA pauses pacing; rate 30–180 ppm in steps of 2 ppm; delivered through hands-free electrodes on back and precordium |
| ECG Monitoring (functions) | 1-11, 1-12 | Average HR from R-R intervals shown at the top; leads I, II, III, aVR, aVL, aVF, V1–V6 (with cable), PADDLES or PADS; gain 0.125, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0 cm/mV and AUTO; status messages; bandwidth user-selectable |
| Electrodes | 1-12 | Defibrillate, cardiovert and monitor through pads, external or internal paddles; pace only through pads. Energy Select, Charge and Shock on the paddles and the front panel; with pads, the front panel. Switching to pads: the MFC is unplugged from the apex paddle and connected to the pads |
| Batteries | 1-12, 1-13 | > 4 h ECG monitoring on a new battery; "Low Battery" warning shown continuously. Front-panel battery LED: steady amber charging, steady green charged, alternating amber/green no battery or charging fault, off = not on AC mains. About 7 s after power-up before the battery's own LEDs show run time. Battery calibration required: an equipment alert, and the Recalibration LED on the battery lights about 10 s |
| Safety Considerations | 1-13 | Mode Selector to OFF deactivates. A charged or charging defibrillator is disarmed by: the Disarm key; a change of selected energy; the Mode Selector to OFF or MONITOR; a change of patient type. It disarms itself if left charged "more than 60 seconds (or other user configurable interval)" without SHOCK |
| Warnings, General | 1-14, 1-15 | Supervisor menus for authorised personnel only. Up to 20 min to be fully functional after storage at −30 °C, up to 160 min after 70 °C. Otherwise instructions to the user |
| Warnings, ECG Monitoring | 1-15, 1-16 | Implanted pacemaker spikes may be counted by the HR meter (pacemaker pulse rejection [G A-4]); sync markers must show above each QRS before cardioversion. Instructions otherwise |
| Warnings, Defibrillation | 1-16 | At least 1 min wait after every third discharge when testing. SYNC "may be cleared after each shock"; in the Supervisor menus the M2 can be configured to remain in SYNC after each shock. Leads I, II or III recommended for sync with paddles; pads usable as the sync source. Selecting a new energy while charging or charged disarms |
| Warnings, Pacing | 1-17 | Electrical capture: a large ectopic beat after the pulse; mechanical capture: increased flow (skin reddening, palpable pulse, rising BP). Asynchronous (fixed) mode advised when the ECG is unreliable. External pacing only. Instructions otherwise |
| Warnings, CPR | 1-18 | Wrong patient type gives "Push Harder" prompts inappropriate for children; CPR electrodes must be placed per the package for accurate depth |
| Warnings, SpO2, NIBP, CO2, Resp, Temp, Ferromagnetic, Battery, Operator and Patient Safety | 1-18 to 1-22 | Instructions to the user. Device-related: "Low Battery" then "Replace Battery" alarm, shut-down imminent after Replace Battery [G 1-20]; O2/N2O compensation must be set when present [G 1-19]; prolonged pacing over 30 min may burn [G 1-21] |
| Cautions | 1-22 | instructions to the user, no device behaviour |
| Restarting the Monitor/Defibrillator | 1-23 | Restart: Mode Selector OFF, replace battery or connect AC, select the mode; the sequence also clears some fault messages. Off < 30 s keeps all patient settings; off > 30 s resets patient-specific settings (alarm limits, energy, etc.) to defaults |
| Software License; Service; Serial Number | 1-23 to 1-25 | instructions to the user, no device behaviour |

### Chapter 3, Monitoring Overview [G 3-1 to 3-4]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Monitoring Functions | 3-1 | Alarm limits per monitored function; out-of-limit values give an audible tone and visual indication when alarms are enabled. Off < 30 s keeps all settings; off ≥ 30 s resets patient-specific settings (alarm limits, energy, …) to defaults |
| ECG | 3-2 | ECG at the top of the display; any available source (PADS, I, II, III, aVR, aVL, aVF, V1–V6); up to four ECG traces configurable, each with its own source and scale |
| Printing ECG Waveforms | 3-2 | Print button prints the displayed waveforms; "Print Number of Traces" 1, 2, 3 or 4; numerics printed above the traces; real-time strips annotated every 10 s with the current values; grid 5 mm major, 1 mm minor; ECG always printed when monitored; default 25 mm/s, 50 mm/s available. A dashed line instead of an ECG trace means no ECG data is being acquired |
| Heart Rate | 3-2 | HR in bpm from the top ECG trace |
| Selecting the Waveform Display | 3-2 | Up to four traces in Monitor mode; the first is always an ECG lead. Power-up lead configurable in Monitor and Manual Defib; defaults Lead II (Monitor), PADS (Defib); Pacer mode is Lead II and cannot be changed |
| Inserting, Removing, Replacing a Trace | 3-3, 3-4 | Trim Knob highlights the trace label, press opens the Waveform Sources menu: Insert (below the selected trace), Replace, Remove; the top trace cannot be removed; a second window chooses the source; leave by the X at top right or the Menu button. Figure on 3-3 (menu) and 3-4 (example) |

### Chapter 4, Trends [G 4-1 to 4-3; 4-4 blank]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Trends (intro) | 4-1 | Vital-sign trends logged at a configurable interval 30 s to 30 min (default 30 s); all monitored values also logged at each patient alarm and at each completed NIBP measurement |
| Displaying the Patient Trend Data Window | 4-1, 4-2 | Off > 30 s ends the incident; a new incident starts at the next power-on even for the same patient. Opened by More → Data → Trend. With a patient connected only the current incident shows; with none, earlier incidents can be viewed. Window fields: Incident button; Interval button (30 s, 1, 2, 5, 10, 30 min); Print Option button; Column button toggling the last three columns between RESP (BR, EtCO2, FiCO2) and TEMP (T1, T2, ΔT); up/down carets page through newer/older data; X closes. Figure 4-1 is a screen picture of the window |
| Printing Trend Information | 4-3 | Print Option: Current Incident, or Selected Incident (the "Select Rescue Incident to Print" window: incidents named by start date and time, a green check mark on each chosen, Print, Back, next/prior page). Figure 4-2 is a printed Trend Data Report |

### Chapter 6, Monitoring ECG [G 6-1 to 6-13; 6-14 blank]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction; warnings | 6-1, 6-2 | ECG through 3-, 5- or 12-lead cable (12-lead optional), pads or paddles. After a discharge, polarised monitoring electrodes can take the trace off screen; the circuitry returns it "within a few seconds". Otherwise instructions to the user |
| ECG Monitoring Setup; skin preparation | 6-3 | Instructions to the user; the lead with the largest noise-free R waves is advised for HR, demand pacing and cardioversion |
| Applying Electrodes (3-lead, 5-lead) | 6-4, 6-5 | Electrode sites and AHA/IEC colour codes (RA/LA/LL white/black/red or R/L/F red/yellow/green; RL green or N black; V brown or C white); V1–V6 sites. Instructions to the user (figures 6-1, 6-2 are body diagrams) |
| Connecting the ECG Cable | 6-6 | Cable into the rear ECG connector (figure 6-3). Instructions to the user |
| Selecting Patient Type | 6-6 | Adult or Pediatric; Pediatric is used for paediatric and neonatal patients |
| Selecting ECG Waveforms for Display | 6-7, 6-8 | Up to four waveforms in Monitor mode, the top always ECG. Default top lead: Lead II in Pacer and Monitor; Pads/Paddles in Manual Defib and AED; the Monitor and Manual Defib defaults are changed in the Supervisor menu. Two ways to choose the top lead: the lead quick-access key steps through the leads the connected cable provides; or the Trim Knob on the trace's source label opens the list. A source not being acquired shows a dashed line and "ECG Lead Off" (lead), or "Attach Pads" / "Check Pads - Pads Shorted" (PADS). PADDLES always shows a solid trace, even with the paddles shorted or off the patient |
| Selecting the Waveform Trace Size | 6-8, 6-9 | Trim Knob on the size beside the lead label opens a drop-down; default 1 cm/mV; 0.125, 0.25, 0.5, 1.5, 2.0, 3.0 cm/mV or Auto; Auto in Monitor mode only, not in Defib or Pacer |
| Diagnostic ECG | 6-9 | On units WITHOUT the 12-lead option: the Diagnostic quick-access key switches the displayed leads to 0.525–40 Hz and scrolls a slightly delayed copy of the signal for 12 s, then returns to the previous monitoring response; a short delay at each switch |
| ECG Monitoring and Implanted Pacemakers | 6-9 | Pace Marker on: detects implanted-pacemaker pulses, blanks them from the waveform for QRS detection, draws and prints vertical dashed lines. Off: the Pacer Off Marker icon at the top of the screen; pulses neither detected nor removed |
| Accessing the ECG Settings window | 6-10 | Opened by the Trim Knob on the HR numeric, or Menu → ECG. Fields: Pace Marker (3/5 lead), 12 Lead Mode Pace Marker, Sweep Speed 12.5/25/50 mm/s, QRS/PR Volume Off, 1–5. Left by the X or the Menu button. Figure 6-4 is a picture of the window |
| Heart Rate Meter | 6-11 | Labelled HR; always from the top waveform |
| HR Alarm Limits | 6-11 | Defaults (enable and limits) are Supervisor-configurable. Adult 50/120 bpm, Pediatric 50/150 bpm; lower limit settable 20–299, upper 21–300 bpm |
| Enabling/Disabling HR Alarms | 6-12 | Through the Alarm Limits quick-access key (after More): Status, Lower Limit, Upper Limit. Pressing the knob turns the field green; turn to change; press to confirm. Leave by X or Menu |
| Check Patient Alarm | 6-12 | HR alarm on, in Monitor mode, or in Defib mode "with some AED configurations": continuous analysis of the top trace; VF or wide-complex VT sounds an alarm and shows "Check Patient". HR alarm on in Pacer mode: "VF/VT Alarms Disabled" |
| ECG System Messages | 6-13 | Apply Paddles to Patient (paddles open); Attach Pads; Check Paddles - Paddles Shorted; Check Pads - Pads Shorted; Connect Therapy Cable (MFC not connected); ECG Lead Off (a lead or cable off, or an unavailable source chosen); HR High; HR Low. An intentionally disconnected ECG lead's "ECG Lead Off" alarm is answered with the Alarm Control button |

### Chapter 7, Monitoring Respiration (Resp) and Heart Rate (HR) [G 7-1 to 7-7; 7-8 blank]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction | 7-1 | HR and RESP meters. Without ECG leads on the patient, HR can come from the pulse oximeter (PR) and the rate from CO2 (BR). Impedance respiration is DISABLED in Manual Defib, AED and Pacer modes, and whenever CO2 monitoring is active |
| Respiration/Breath Rate Meter | 7-2 | Default source: CO2. Without CO2 (off, absent or no sensor), impedance pneumography between the Lead I electrodes (RA–LA). With neither, no rate is shown |
| Impedance Pneumography | 7-2 | High-frequency low-current signal through RA–LA; impedance rises on inspiration. Impedance respiration is disabled by default; "RESP Automatic Activation" (Resp Setting window) enables it when CO2 is not in use. Warnings: effort, not airflow |
| Cardiovascular artefact | 7-3 | When the breath rate is within 5 % of the heart rate the device may not separate them: "- -" in the RR field and "RESP CV Artifact Detected". Not for high-frequency ventilation |
| RR/BR alarms and settings | 7-3 | The label is RR when measured by impedance, BR when CO2 is the source. Defaults Adult and Pediatric: lower 5, upper 50 br/min; lower settable 2–149, upper 3–150 br/min |
| No Breath alarm | 7-3 | No Breath Alarm Time Off (default) or 10–60 s; when set, a "No Breath" alarm after that time since the last breath |
| Setting RR/BR alarms | 7-3, 7-4 | More until Alarm Limits shows; Status, Lower Limit, Upper Limit; the field turns green while being changed; close with X |
| Resp Setting window | 7-4 | Opened by the Trim Knob on the RESP numeric or Menu → RESP. Fields: Sweep Speed; RESP Automatic Activation. With Activation Disabled (default) the Resp meter shows a dashed line when CO2 is not in use; Enabled shows the impedance rate when CO2 is inactive and ECG leads are connected. Figure 7-1 is a picture of the window |
| CVA warning | 7-5 | Impedance respiration always uses Lead I electrodes, whatever lead the HR uses; CVA rejection needs good R-wave detection |
| Heart Rate Meter | 7-5 | HR from the top ECG trace; labelled HR when from ECG, PR when SpO2 is measured and the ECG (leads or pads/paddles) is disconnected. In 12-lead mode HR comes from the selected primary lead in Monitor mode |
| HR/PR alarm limits | 7-5, 7-6 | As chapter 6: Adult 50/120, Pediatric 50/150; lower 20–299, upper 21–300 bpm; set through Alarm Limits → HR/PR |
| RESP System Messages | 7-6, 7-7 | No Breath; RESP Communications Fault; ECG Lead Off (RA/R, LA/L, RL/N, LL/F); RESP CV Artifact Detected (RR shown as --); Check RESP Electrodes (basal impedance out of range); RR High; RR Low |

### Chapter 8, Monitoring Non-Invasive Blood Pressure (NIBP) [G 8-1 to 8-14]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction; warnings | 8-1, 8-2 | NIBP for adult and paediatric patients only, not neonates or pregnant women. A wrong patient type gives the wrong first inflation; an over-range alarm on a large child is answered by switching Pediatric → Adult. Otherwise instructions to the user |
| How does NIBP Work? | 8-3 | NIBP button starts and stops; Auto and STAT also started and stopped from the NIBP menu. Oscillometric. Cycle typically 30–45 s: inflate to a preset above systolic (adult default 160 mmHg), step deflation, pulsations measured. Systolic not found: inflation pressure raised automatically and the measurement completed. Systolic, diastolic or mean not found after 3 min: aborted and the cuff deflated. A fault: message, abort, deflate |
| The NIBP Numeric Display | 8-4 | Systolic, diastolic, mean, and the measurement type (Manual, Auto, STAT). Auto: the interval (default 30 min). STAT: time remaining in the STAT cycle as MM:SS. Manual: the time of the last measurement as HH:MM at the lower left. mmHg or kPa by Supervisor setting. A "?" right of the reading when motion artefact was detected |
| NIBP Setup and Use; cuff selection | 8-4, 8-5 | Instructions to the user: bladder ≥ 80 % and width ≈ 40 % of limb circumference; Adult mode cuffs Adult, Large Adult, Small Adult, Thigh (limb ≥ 18 cm), Pediatric mode Child, Small Child (10–26 cm); ISO 81060-2 child 3–12 years, adult > 12 years |
| Connecting the Hose; Applying the Cuff | 8-5 to 8-7 | Instructions to the user (figures 8-1, 8-2 are hardware/body drawings). Cuff level and size bias the reading (loose or small → high; large → low; above/below heart → low/high) |
| Accessing NIBP Features | 8-7, 8-8 | Settings at defaults at power-on; changes kept until changed or 30 s after power-off. Direct access: press NIBP = single measurement; press and hold NIBP ≥ 2 s = STAT ("STAT" and MM:SS remaining shown); press NIBP during a measurement = abort; Auto from the NIBP Setting window ("AUTO" and the interval shown). Configuration options in the Supervisor menus and the Configuration Manual |
| NIBP Setting window | 8-8 to 8-10 | Opened by the Trim Knob on the NIBP numeric or Menu → NIBP (figure 8-3 is a picture of the window). NIBP Mode: Manual or Automatic. Automatic: first measurement when the Auto Interval timer expires, then repeated; an Auto measurement due within 30 s after a Manual one is skipped. Auto Interval 2.5, 5, 10, 15, 20, 30, 45, 60, 90, 120 min (default 30). Initial Cuff Inflation by patient type and preset. Start/Stop STAT: as many measurements as possible over 5 min; Stop STAT stops at once |
| Selecting the Correct Patient Type | 8-10 | Adult or Pediatric chosen at the top of the window (drop-down with the Trim Knob); it sets the default inflation and the default SYS/DIA/MAP limits |
| Cuff Inflation Settings | 8-10, 8-11 | Presets Adult 120, 140, 160 (default), 180, 200, 220, 240, 260 mmHg; Pediatric 80, 90, 100, 110, 120 (default), 130, 140, 150 mmHg (defaults in bold, checked on the page image). Smart Inflation (Supervisor-enabled): after each measurement the next initial inflation is adjusted from the previous systolic. Changes revert 30 s after power-off |
| NIBP Alarms | 8-11 to 8-13 | High-priority alarms on SYS, DIA, MAP high and low; enabled by factory default. Set through More → Limits or Menu → Alarm Limits; selections SYS, DIA, MAP; fields Status, Lower Limit, Upper Limit; leave by the back arrow or Exit. Defaults and ranges: SYS adult 75/220 (lower 20–264, upper 21–265), paediatric 75/145 (20–239, 21–240); DIA adult 35/110 (10–219, 11–220), paediatric 35/100 (10–179, 11–180); MAP adult 50/120 (13–234, 14–235), paediatric 50/110 (13–199, 14–200) mmHg, each also in kPa |
| NIBP System Messages | 8-13, 8-14 | NIBP Communications Fault; NIBP Measurement Aborted - Check Hose/Cuff; - Artifact; - Cuff/Hose Leak; - Signal Weak; - Over Range; - Cuff Over Pressure; - Measurement Timeout; - Hose Blocked; Measurement Stopped; Measurement Failed; NIBP Inflation Timeout; NIBP Disabled - Critical Fault; NIBP Pressure Measurement Error; NIBP Diastolic/Map/Systolic High and Low; NIBP Preventative Maintenance Recommended; Waiting (after a measurement the unit waits before allowing another); Zero Failed |

### Chapter 9, Monitoring CO2 [G 9-1 to 9-18]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction; Overview | 9-1, 9-2 | EtCO2, breath rate and FiCO2 by mainstream or sidestream sensor on the same connector. The sidestream module draws 50 ml/min. EtCO2 in mmHg, % or kPa; capnogram; BR from the interval between detected CO2 peaks; automatic barometric compensation |
| Warnings and cautions | 9-2, 9-3 | "Check CO2 Sampling Line" when moisture enters the line. Sampling-line kits replaced every 15 h (120 h with dryer). Otherwise instructions to the user |
| Mainstream CO2 Setup | 9-3 to 9-6 | Mainstream adapters Adult/Pediatric or Infant. After connecting: Mode Selector to MONITOR; the CO2 quick-access key shows a grey dot when off, a green dot when on. "CO2 Warm Up" for about 2 min (mainstream). "Check CO2 Airway Adapter" if the adapter is wrong or dirty. Zero: Menu (or the Trim Knob on the CO2 field) → CO2 → Zero; "CO2 Zeroing in Progress" about 10 s, then "CO2 Zeroing Completed"; wait 20 s after removal from the airway; "CO2 Zeroing Failed" if CO2 remains. When zeroing is needed, "CO2 Zeroing Required" and the CO2 key becomes the Zero control for 10 s, then reverts to CO2 On/Off. Adapter placement instructions (no device behaviour) |
| Sidestream CO2 Setup | 9-6 to 9-11 | Sampling kits (L or T tube, nasal cannula adult or paediatric, with or without dryer). CO2 key until the green dot. "CO2 Warm Up" about 30 s (sidestream). Zeroing as for mainstream ("CO2 Zero Completed" on 9-10). Figure 9-1 is the T/L connector kits. Otherwise instructions to the user |
| Measuring CO2 | 9-12, 9-13 | Green dot on the CO2 key and the CO2 numeric: EtCO2 and BR; FiCO2 display off by default, can be enabled; the capnogram is inserted automatically in the waveform area. Units kPa, mmHg or %. Waveform scale chosen with the Trim Knob: mmHg 0–20, 0–40, 0–80 (default), 0–100, 0–150; kPa 0–3, 0–5, 0–10 (default), 0–15, 0–20; % the same as kPa. O2 compensation > 0: a blue dot under BR; N2O compensation > 0: an orange dot; both: both dots. "Filled" capnogram style set in the Configuration Manual |
| CO2 and RR alarms | 9-13 to 9-15 | Alarms on EtCO2 high/low, BR high/low, FiCO2 high/low, No Breath. Set through More → Limits or Menu → Alarm Limits: EtCO2 Alarm, FiCO2 Alarm, RR/BR Alarm; fields Status, Lower, Upper, No Breath Time. EtCO2 defaults adult and paediatric 8/60 mmHg (1.0/8.0 % or kPa), lower 0–149, upper 1–150 mmHg. FiCO2 defaults 0/8 mmHg (0/1.0 %), lower 0–98, upper 1–99 mmHg. No Breath Time off by default; 10, 15, 20, 25, 30, 40, 50 or 60 s. RR/BR defaults 5/50, lower 2–149, upper 3–150 br/min. Altitude lowers EtCO2 (caution) |
| CO2 Setting Menu | 9-15, 9-16 | Opened by the Trim Knob on the CO2 numeric or Menu → CO2 (figure 9-2 is a picture of the window). Fields: FiCO2 display on/off, Zero, O2 compensation, N2O compensation, sweep speed. Sweep 6.25, 12.5, 25 mm/s (default 6.25). O2 compensation advised above 30 % O2; default 21.0 %; N2O default 0.0 % |
| Start Zero | 9-16, 9-17 | Manual zero: CO2 key on, adapter away from CO2, Menu → CO2 → Zero |
| CO2 System Messages | 9-17, 9-18 | CO2 Warm Up (replace the sensor if > 5 min); Check CO2 Airway Adapter; Check CO2 Sampling Line; CO2 Out of Range; CO2 Ambient Pressure Out of Range; CO2 Temperature Out of Range (< 0 °C or > 50 °C); CO2 Zeroing Required; EtCO2 High/Low; FiCO2 High/Low; BR High/Low; No Breath |

### Chapter 10, Monitoring SpO2 [G 10-1 to 10-10]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction | 10-1, 10-2 | SpO2 and pulse rate (PR) at a peripheral site; adult and paediatric patients only. PR is displayed when no ECG leads or defibrillation electrodes are connected |
| Warnings and Cautions | 10-2, 10-3 | When the probe signal is insufficient to determine saturation, the SpO2 numeric shows "- - -". Otherwise instructions to the user (interferences, sensor site rotation every 4 h) |
| SpO2 Setup and Use; sensor choice and site | 10-4 | Measurement starts as soon as the sensor is applied and connected; functional saturation. Not on the NIBP limb. Instructions otherwise |
| Connecting the SpO2 Sensor | 10-5 | Into the rear SpO2 receptacle |
| Displaying SpO2 Measurements | 10-5, 10-6 | On connection: the normalised plethysmogram and the messages "Pulse Searching" and "Initializing". SpO2 numeric on the right of the screen with a pulse bar tracking the plethysmogram amplitude. "- -" persisting: no pulse detected. "?" beside the value: pulsations too weak (raise sensitivity or move the sensor) |
| Sensitivity Level | 10-6 | Low, Medium (recommended for most patients), High (very low perfusion; more artefact). Set in the SpO2 Setting window (Trim Knob on the SpO2 numeric), drop-down, close with X |
| Plethysmogram display and size | 10-7 | Normalised plethysmogram in the second, third or fourth trace position in MONITOR mode; constant amplitude, variable shape. Size 0.5, 1.0 (default), 2.0, 4.0, 8.0, chosen beside the SpO2 trace label |
| SpO2 alarms and limits | 10-8, 10-9 | Alarms on SpO2 high and low, and on PR only when ECG electrodes are not connected. More → Limits or Menu → Alarm Limits → SpO2 (%): Status, Lower, Upper (field green while changing). Defaults adult and paediatric 85/100 %; lower settable 85–99 %, upper 86–100 %. HR/PR defaults Adult 50/120, Pediatric 50/150 bpm; lower 20–299, upper 21–300 |
| SpO2 System Messages | 10-9, 10-10 | Initializing; Low Perfusion ("?" beside the value); PR High; PR Low; Pulse Searching; Check SpO2 Sensor; SpO2 Communications Fault (no data for > 5 s); SpO2 Disabled - Critical Fault; SpO2 High; SpO2 Low; SpO2 Sensor Fault; Unknown Sensor |

### Chapter 11, Monitoring Temperature [G 11-1 to 11-5; 11-6 blank]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction | 11-1 | Two channels. With both in use the display shows T1, then T2, then their difference ΔT, in turn |
| Probes and connection | 11-2 | Two jacks beside the rear ECG connector (figure 11-1). Instructions to the user otherwise |
| Displaying Temperature | 11-3 | The value appears after a brief pause on connection; °C or °F by configuration |
| Temperature alarms | 11-3, 11-4 | More → Limits or Menu → Alarm Limits: T1 Alarm, T2 Alarm, ΔT Alarm; Status, Lower, Upper. Defaults adult and paediatric: T 35.0/37.8 °C, lower 0.0–49.9, upper 0.1–50.0 °C; ΔT 0.0/0.5 °C, lower 0.0–4.9, upper 0.1–5.0 °C |
| Temperature System Messages | 11-4, 11-5 | Self-test at power-on while the function is active. T1 / T2 / T1&T2 Out of Range; TEMP Communications Fault (no data for 5 s); TEMP Disabled - Critical Fault; T1 / T2 / T1&T2 Sensor Fault; T1 High/Low; T2 High/Low; ΔT High/Low |

### Chapter 13, 12-Lead ECG Monitoring [G 13-1 to 13-18]

| Section | Pages | What the device shows or does there |
|---|---|---|
| 12-Lead Monitoring Overview | 13-1 | Acquires and shows 12 leads at once; acquires and sends 4×3 or 2×6, standard or Cabrera; prints 4×3 standard or Cabrera after acquisition or on recall; e-mails PDF over WiFi; stores in full-disclosure files for USB. Display like 3/5-lead (newest data left of the moving bar). Snapshots stored in the Summary Report and full disclosure. Acquisition bandwidth configured: 0.525–40 Hz or 0.05–150 Hz |
| Warnings | 13-2 | Wait 15 s after a discharge before acquiring. Otherwise instructions to the user |
| 12-Lead Snapshots | 13-2 to 13-4 | Contents: 12 snippets plus 10 s of continuous Lead II; acquisition date/time; incident start time; device identifier; serial number; bandwidth; patient name, ID, age, sex (or blank fields); incident identification number. Example print on 13-3 and 13-4 (4×3 standard) |
| Setup; skin; electrodes; cable | 13-4 to 13-7 | AHA/IEC labels and colours; limb electrodes at wrists and ankles; V1–V6 sites; locating V1. Instructions to the user |
| Monitoring; Setting the Controls | 13-7 | Data to USB or e-mail (addresses set in the Configuration Manual). Mode Selector to MONITOR: the red and yellow lights flash, then "All Tests Passed"; "ECG Lead Off" if leads are not connected |
| Entering 12-Lead Monitoring Mode | 13-7, 13-8 | 12-lead key replaces the waveform field with a real-time 2-column × 6-row scrolling display (I, II, III, aVR, aVL, aVF left; V1–V6 right) with the size for all leads shown above. A dashed line for a lead whose electrode is off; all leads dashed when a limb lead is off |
| 12-Lead Monitoring Functions (keys) | 13-8, 13-9 | Quick-access keys at the left: Acquire; Patient Information; select and print stored snapshots; select and transfer stored snapshots (USB or e-mail); return to MONITOR (Exit 12-lead) |
| Entering Patient Demographic Information | 13-9 to 13-11 | Patient Setting window: ID, sex, age, name. ID and Name entered with an on-screen character keyboard (the Trim Knob chooses a key, then a character; Enter); Age turned in with the knob; Sex toggles M/F. Without entry, not on the snapshot |
| Acquiring 12 Lead Snapshots | 13-11, 13-12 | Acquire: "Acquiring 12 Lead" status bar while 10 s are collected; Cancel gives "12 Lead Acquisition Halted" and nothing is saved; then "12 Lead Acquisition Complete"; printed automatically if "Automatic Printing of 12-Lead Report" is enabled in the Supervisor menu. Then a choice: Transfer (USB: "Transfer Successful, You Can Remove the USB Disk"; E-mail to a configured address: "12 Lead ECG Transfer - Successful"), Print, Close |
| Adding E-mail recipients | 13-12, 13-13 | Supervisor menu → Modify Config → Mail: SMTP server, port, username, password, security; Add recipient; "Save Config then Exit". Configuration, not clinical operation |
| Printing and Transferring Previously Acquired Snapshots | 13-14, 13-15 | Select/Transfer key opens the 12-Lead Snapshot window: incidents chosen with green check marks, carets to page; Print Option (Current Incident, Selected); Transfer (Mail Current Rescue, Mail Selected Reports, USB Current Incident, USB Selected Reports, each confirmed in a dialog) |
| Viewing 12-Lead Snapshot Printouts | 13-15 to 13-18 | Printer: 4×3 standard (default) or 4×3 Cabrera. PDF: 4×3 standard (default), 4×3 Cabrera, 2×6 standard, 2×6 Cabrera; each with a 10 s Lead II strip. 4×3: 2.5 s snippets in staggered windows (I, II, III 0–2.5 s; aVR, aVL, aVF 2.5–5 s; V1–V3 5–7.5 s; V4–V6 7.5–10 s). Cabrera 4×3: aVL, I, −aVR; II, aVF, III; V1–V3; V4–V6. 2×6: 5 s per column, simultaneous, first 5 s of the acquisition. Exit 12-lead key restores the display |

### Chapter 18, Maintenance and Troubleshooting [G 18-1 to 18-16]

| Section | Pages | What the device shows or does there |
|---|---|---|
| Introduction; self-test reports | 18-1, 18-2 | Power-on and 30 J self-test results can be configured to print. Up to 2,000 stored reports shown through the System Self-test Report quick-access key: choose All Self-tests, Power On Self-tests or 30J Self-tests; Print Option: Selected, Last 30 Days, All Self-tests; reports chosen with the Trim Knob. The daily power-on self-test runs at a configured time of day and only on AC power |
| Daily/Shift Check, Inspection | 18-3 | Instructions to the user (cables, paddles, supplies, paper, batteries). Self-test results checked through the report key: "All Tests Passed" on screen or printout |
| Defibrillator/Pacing Test | 18-4, 18-5 | Green AC LED on mains; battery LED amber while charging, green when charged. Mode Selector to DEFIB: one beep, red and yellow alarm lights for 3 s, "All Tests Passed" (or "Self-Test Failed"). If configured to start in AED: Manual Defib key, then the password (Trim Knob, OK) if one is required. On battery: no "Low Battery" / "Replace Battery". No cables, Lead I/II/III chosen: a dashed trace. Pads chosen, MFC connected, nothing on it: "Attach Pads". Test connector on the MFC: "Check Pads - Pads Shorted", and the SYNC quick-access key changes to the 30 Joule Self-test key. 30 J test: periodic tone while charging, continuous when charged, charge < 7 s, the front SHOCK button lights; press and hold SHOCK: "30J Test Passed" or "30J Test Failed". PACER: the Pacer settings appear (password note). Fixed, 60 ppm, 100 mA: pace markers every 25 mm on the strip (the strip may start automatically on entering Pacer). Stopping the print: the Clear key flashes, an alarm tone sounds, the pacer status bar shows "Pacer: Check Pads - Pads Shorted". Test connector removed: the status bar alternates "Pacer: Attach Pads" and "Pacer: Check Pads - Pads Shorted", Clear and the tone continue. To MONITOR: the pacer settings leave the screen, the tone stops, Clear is replaced by the Diag key |
| Defibrillator Testing with External Paddles | 18-6, 18-7 | On battery the battery LED is off. Paddles on the MFC (apart, out of the wells): "Attach Pads" changes to "Apply Paddles to Patient". RECORDER ON/OFF on the Sternum paddle starts and stops the strip. Paddles face to face: "Check Paddles - Paddles Shorted" and SYNC becomes the 30 Joule Self-test key. ENERGY SELECT (+/−) steps through the levels (Sternum paddle); CHARGE on the Apex paddle: periodic then continuous tone, < 7 s, the CHARGE light on the Apex handle lights when ready; ENERGY SELECT on the Apex paddle while charged disarms. 30 J test from the paddles: SHOCK on the Apex alone or the Sternum alone does not discharge; both together discharge and "30J Test Passed" |
| SpO2 Functional Check | 18-7 | Sensor on the operator's finger: a plethysmogram without artefact and 95–100 % |
| Preventive maintenance; battery care | 18-8 | Annual NIBP and CO2 calibration checks; battery handling. Instructions to the user |
| Cleaning | 18-9, 18-10 | Instructions to the user, no device behaviour |
| Cleaning the Print Head; Loading Recorder Paper | 18-10, 18-11 | "Printer Out Of Paper" when printing starts without paper or the paper runs out; the printer door opens with a release button; paper is loaded and the Print key resumes printing (figures 18-1, 18-2 show the open printer door and paper tray) |
| Troubleshooting, General | 18-12 | Audio volume in the System Setting menu. Messages: Self-test failed; Low Battery; Replace Battery; Battery error; Battery Calibration Required; Battery communication error. Unresponsive keys, mode not switching, printer not printing (door, paper, overheating): power cycle or user action |
| Troubleshooting, Defibrillation and Pacing | 18-13 | Excessive Disarms Detected; 30 J Test Failed; Defib Disabled; Button Stuck (paddle button, front-panel Shock, Charge, …); Demand Pacing Disabled; Pacer Disabled; Pacer Current Out of Tolerance (pacing continues); Defib Charging Failed |
| Troubleshooting, ECG, NIBP, CO2, SpO2, Temp | 18-13, 18-14 | ECG Communications Fault (select PADS/PADDLES or power cycle); NIBP messages as chapter 8; a capnogram that does not appear because four waveforms are already shown ("Close one waveform"); FiCO2 shown only when turned on in the CO2 menu; CO2 Temperature Out of Range; CO2 Disabled - Critical Fault; CO2 Zeroing Required; SpO2 Communications Fault; Check SpO2 Sensor |
| Troubleshooting, Recorder/Printer, WiFi | 18-14, 18-15 | Printer Door Opened; Printer Out Of Paper; Printer Fault (print head or motor overheating, restarts when cooled; communication interrupted). WiFi connection failure (user action) |
| Operator's Shift Checklist | 18-16 | A form to copy (instructions to the user); it lists the observable checks above, including pace markers every 25 mm at 60 ppm and no error at 100 mA |

## What this reading changed in the plan

No function was found that none of the plan's mechanisms or pieces can carry: every finding is a row of §2, a
configuration input of §5.4, or a corrected figure. Nothing is put to the owner as a new question; DQ17 and DQ21 are
amended (below) and DQ2 gains the Rev. D sentence.

**Corrected** (the plan said otherwise):

- D8 / DQ17: the ready time-out is named in the guide as 60 s "or other user configurable interval" [G 1-13]; the plan
  said the factory default was not in the guide.
- §2.2 / DQ21 / §4.1: the Manual Defib screen and its first key level (lead, SYNC, AED, CO2, Disarm or More) ARE
  pictured [G 14-6], [G 14-7], [G 14-11] to [G 14-13]; so are the menu windows [G 3-3], [G 4-2], [G 5-7], [G 6-10],
  [G 7-4], [G 8-9], [G 9-16], [G 10-6], [G 13-9] to [G 13-14], [G 17-3], the 12-lead screen [G 13-8] and the printer
  strips [G 4-3], [G 13-3], [G 17-4] to [G 17-11]. The plan listed them as unpictured.
- M9: Check Patient runs in Defib mode only "with some AED configurations" [G 6-12]; the plan said Monitor or Defib.
- M12: impedance respiration is disabled in Manual Defib, AED and Pacer modes and whenever CO2 is active [G 7-1]; the
  plan did not gate it by mode. No Breath times are the list 10, 15, 20, 25, 30, 40, 50, 60 s [G 9-15], not any value
  in 10–60 s.
- M13: the Auto interval is the list 2.5, 5, 10, 15, 20, 30, 45, 60, 90, 120 min [G 8-9], not a continuous 2.5–120.
- M15: the CO2 Setting figure shows O2 compensation as "160 mmHg" against "21.0 %" in the text [G 9-16]; recorded as
  a figure–text difference (by §1 the figure decides the face's word).
- S5: Sync can be configured to stay on after each shock [G 1-16], [G 14-16]; the plan made clearing unconditional.

**Added to existing rows** (with pages): D2 [G 1-3], [G 18-4]; D3 [G 1-23], [G 8-7]; D9 (disarm on the selector and on
a patient-type change [G 1-13]; Excessive Disarms Detected [G 18-13]); D11 (paddle messages and buttons [G 6-13],
[G 18-6], [G 18-7]); D22 [G 1-13], [G 18-4]; D23 (battery messages [G 1-20], [G 18-12]); D24 (high contrast pictured
only in Rev. D); D26 (PADDLES always solid [G 6-8]); D29 (the 30 Joule key replaces SYNC when shorted [G 18-4],
[G 18-6]); §2.2 Lead, 12-Lead, CO2, Diag, Manual/AED, 30 Joule Test rows; M1, M2, M3, M5, M6, M10, M11, M14, M16, M17,
M18; L6 (every default and range, [G 6-11] to [G 11-4]); L8 (chapter 18 messages); C6 [G 1-9], [G 1-18]; P5 [G 1-17];
P8 [G 18-5]; R5 [G 3-2], [G 18-5], [G 18-10] to [G 18-15]; R7 [G 18-1], [G 18-2].

**New row:** D31, audio volume in the System window [G 18-12], [G 2-16] (F4, F6).

**New configuration inputs** (§5.4, G-CFG): Sync after shock; power-up top lead; RESP automatic activation; CPR
monitoring in Manual Defib; automatic 12-lead print; automatic print in Pacer; smart NIBP inflation; NIBP and
temperature units.

**Not device behaviour** and therefore not rows: unpacking, symbols, warnings and cautions, electrode placement and
skin preparation, cuff selection, CO2 accessory handling, cleaning, the shift checklist form, e-mail and SFTP setup in
the Supervisor menu, storage-temperature warm-up times [G 1-14].
