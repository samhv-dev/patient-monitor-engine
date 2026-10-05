# Showcase cases: exact on-screen labels, step by step (notes for the run sheet)

*For the orchestrator, not the final user documents. Round 4 (FINAL): numbers from the kit built from `main` 41678d0b
(FU-7, FU-8 B, FU-9 B, FU-10 A + the showcase hotfix; labels unchanged since round 2, f29951b) on Chromium and WebKit at 1440×900, Saadat-style monitor (the default, now with its CO2 lane
and tile), by `rehearsal.showcase.ts`; every label below is copied from the page's own text
(`docs/showcase/results/rehearsal-*.json`, fields `labels`). Times are SIMULATED time at ×4 (divide by 4 for
wall-clock time); the session-bar clock shows the same time. Round 4 changed cases 1 and 4 (see KIT-GATE "Round 4"). **Do not open the
Ventilator view before loading a case** (it takes over ventilation; reload the page if it was opened).*

## Getting to a case (same for all five)
1. The launcher opens the **Start** page (`127.0.0.1:8642/#/`, heading "Set up the session").
2. Top bar, left to right: **Patient monitor simulator** · **Start** · **Monitor** · **Instructor** · **Explore physiology** · **Ventilator** · **Validate** · **Developer** · **Settings**; on the right: the alarm button, **Sound off**, **Remote** + 6-letter code.
3. Click **Instructor** (or, on the Start page, **Open the instructor view**).
4. Instructor panel tabs (right side): **Scenario** · **Vitals & rhythm** · **Drugs & fluids** · **Airway & ventilation** · **Defib, pacing & CPR** · **Devices & alarms** · **Patient** · **Log**. Click **Scenario**.
5. Category chips: **All** · **Showcase** · **Resuscitation** · **Haemodynamic crisis** · **Anaesthesia depth and drugs** · **Airway and breathing** · **Metabolic and thermal**. Click **Showcase**. Five cards, in this order: *Anaphylaxis under anaesthesia* · *Class IV haemorrhage, PEA and resuscitation* · *Healthy induction* · *Severe bronchospasm on the ventilator* · *Severe tamponade, then induction*.
6. On the card, click **Load**. Toast: "Scenario loaded: <title>". The panel switches to the running case: title, **Choose another scenario**, the story, the state strip (current state outlined), "Time in state", **Hold the timer**, **Bookmark**, **Learner controls on the monitor**, then **What happens next** (one line per next step, with its button), **Objectives** (tick boxes), **Bookmarks**.
7. Session bar (under the top bar): patient chip (e.g. "M 40 y 75 kg"), **MODELED**, "<title>: <state> <time in state>", the clock, **×1** **×2** **×4**, **Pause**, **Bookmark**. Click **×4** → toast "Speed ×4".
8. Next case: either reload the page (Cmd-R; every rehearsal case here used a fresh load) or press **Choose another scenario** — the library opens with **Back to the running case** above the chips; choose **Showcase**, **Load** on the card, confirm the dialog "Load this scenario?" with **Load scenario** (the other button is **Keep the current case**). Measured: the clock restarts (02:02 → 00:04–00:05) and runs on. Press **×4** again for the new case (not measured whether the speed carries over). Round 1's clock freeze (S2) is fixed.

## 1. Healthy induction
- State strip: "Awake, preoxygenated" → "Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg" → "Intubated and ventilated".
- What happens next (at load): `You press "Induce now": Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg` — button **Induce now**.
- After **Induce now**: `You press "Intubate and ventilate": Intubated and ventilated` — button **Intubate and ventilate**.
- After **Intubate and ventilate**: "What happens next" is empty (end of case).
- Observed (both browsers): baseline ART 123/81 (95), HR 70, SpO2 98, CO2 tile 39. Apnoea alarm "CO2 APNEA" 62 s after **Induce now** (60.5–62.5 s across runs) (top-right "!!! Apnoea (no CO₂ breaths)"; the CO2 tile reads "CO2 mmHg 0 FiCO2 0 awRR 0"); ART mean 95 → 74 at 1 min → 74.7 at 2 min; SpO2 stays 99 (preoxygenated). After **Intubate and ventilate** the CO2 tile reads 46 within 5–7 s ("CO2 mmHg 46 FiCO2 46 awRR 3"), 38 two minutes later; MAP nadir 65.6–65.7 after intubation (71 at 4 min).
- Saadat-style monitor (default), lanes top to bottom: II, PLETH, IBP1, IBP2, **CO2** (the capnogram, in yellow, where RESP was); tiles HR, NIBP, IBP1, IBP2 | SpO2, TEMP, **CO2** ("CO2 mmHg", value, "FiCO2 … awRR …").

## 2. Anaphylaxis under anaesthesia
- State strip: "Ventilated, stable" → "Anaphylaxis" → "Epinephrine given" → "Epinephrine given" (two boxes with the same label: one per route to that state).
- At load: `After 1 min in this state or you press "Start the reaction": Anaphylaxis` — button **Start the reaction** (it starts by itself after 1 min of sim time).
- In Anaphylaxis: two lines — `Epinephrine given: Epinephrine given` (no button: fires if epinephrine is given from Drugs & fluids) and `You press "Give epinephrine 100 µg": Epinephrine given` — button **Give epinephrine 100 µg**.
- After the button: "What happens next" is empty.
- Observed (both browsers): at the start HR 73, ART 119/83 (96); 2 min into Anaphylaxis HR 135, ART 96/70 (78), SpO2 99, no monitor alarm raised. **Give epinephrine 100 µg** at 2 min → systolic > 110 after 11.3–11.4 s (HR peaks ≈ 173–174), 2 min later HR 110–114, ART 120–121/88–89 (98).

## 3. Severe bronchospasm on the ventilator
- Story (card and panel): "A ventilated 45-year-old woman develops severe bronchospasm: airway pressure climbs to the ventilator's limit, the delivered tidal volume falls, the capnogram turns shark-fin and air trapping builds. Give salbutamol and watch ventilation recover: delivered tidal volume and minute volume rise as air trapping eases." Third objective: "Watch the delivered tidal volume and minute volume recover as air trapping eases".
- State strip: "Severe bronchospasm" → "Salbutamol given: ventilation recovering" → "Salbutamol given: ventilation recovering" (two boxes, same label).
- At load: `Salbutamol (IV/neb) given: Salbutamol given: ventilation recovering` (no button) and `You press "Give salbutamol 250 µg": Salbutamol given: ventilation recovering` — button **Give salbutamol 250 µg**.
- The numbers are on the **Ventilator** view (top bar), Hamilton-style cockpit. Left column, value then label: fTotal /min, VTE ml, Ppeak cmH₂O, ExpMinVol l/min, Pmean cmH₂O. Red banner "⚠ High pressure (Pmax)". Right-side buttons: VT 500 ml, Rate 14 b/min, PEEP 5 cmH₂O, Oxygen 40 %, **Controls**, **Alarms**, **Freeze**, **Insp hold**, **Exp hold**, **Patient**, **Man. breath**, **Reset**; bottom tabs **Monitoring** · **Utilities** · **Events** · **System**.
- Observed (both browsers, FU-7 build): before salbutamol (1.4 min) VTE 161–162 ml, Ppeak 35, ExpMinVol 2.3, Pmean 13, fTotal 14, CO2 tile 32; 3 min after salbutamol VTE 304–305 ml, **Ppeak still 35** (pressure-limited), ExpMinVol 4.3, Pmean 14, CO2 tile 40; 6 min after VTE 368 ml, ExpMinVol 5.2, CO2 tile 40; "High pressure (Pmax)" banner stays. The card text matches this: narrate "the delivered tidal volume and minute volume recover". Monitor side: SpO2 97 → 97–98, HR 74 → 82 → 85. (Round 2, before FU-7: 367 ml and 5.1 l/min at 3 min, CO2 36.)
- Screenshots: `rehearsal/severe-bronchospasm-on-the-ventilator-vent-before-*.jpg`, `…-vent-after-*.jpg`.

## 4. Severe tamponade, then induction
- State strip: "Tamponade, compensating" → "After induction: compensation lost" → "After induction: compensation lost" → "Pericardium drained".
- At load: `Propofol given: After induction: compensation lost` (no button: fires on propofol from Drugs & fluids) and `You press "Give propofol 2 mg/kg": After induction: compensation lost` — button **Give propofol 2 mg/kg**.
- After the button: `You press "Drain the pericardium": Pericardium drained` — button **Drain the pericardium** (not pressed in the rehearsal).
- Observed (both browsers): compensating HR 98, ART 109/88 (95), SpO2 96, CO2 35. After **Give propofol 2 mg/kg**: "CO2 APNEA" 46–55 s after the button; at 1 min ART 56–57/42 (46), HR 83–84; ART mean < 40 at 73–74 s; pulseless ("IBP1 STATIC PRESSURE", mean only) at 94–96 s; "SPO2 LOW PERFUSION" 102 s; "SPO2 NO PULSE" 120 s; at 2 min no pulse, arterial mean ≈ 16, HR 46.

## 5. Class IV haemorrhage, PEA and resuscitation
- State strip: "Bleeding 2.5 L over 10 min" → "CPR, 2 L warmed fluid, epinephrine 1 mg" → "Return of circulation".
- At load: `You press "Start CPR, 2 L and epinephrine": CPR, 2 L warmed fluid, epinephrine 1 mg` — button **Start CPR, 2 L and epinephrine**.
- After it: `You press "Pulse back: stop CPR": Return of circulation` — button **Pulse back: stop CPR**.
- Observed course (both browsers, identical in rounds 1–3): 2 min HR 81–82, ART 114/83; 4 min HR 95, 107/82; 6 min HR 120, 98/80; 8 min HR 140, 75/61; "SPO2 LOW PERFUSION" at 8.3 min; at **10:03 "IBP1 STATIC PRESSURE"** — the arterial number becomes "mean only" (systolic/diastolic blank, mean ≈ 15): this is the pulse loss on the arterial line; at **10:40 "SPO2 NO PULSE"** (pleth number gone), HR ≈ 46.
- **Press "Start CPR, 2 L and epinephrine" AFTER the "SPO2 NO PULSE" alarm** (≈ 10:40 sim, ≈ 2 min 40 s of wall time at ×4). Measured: pressed at 10:52, 10:55, 10:56 and 11:47 (both rounds) → systolic > 90 after 4.3 min of CPR every time (e.g. 102–108/49–56 then 139–155/78–93, CO2 16 during CPR, 34 a minute after). **Pressed before "SPO2 NO PULSE" the outcome flips at about 10:33.5:** pressed at 10:33.1 or earlier (9 runs over three rounds, both browsers), no pulse returned in 8 min of CPR (best systolic 63), usually with "ECG VFIB" at 10:33 and pulseless again after "Pulse back: stop CPR"; pressed at 10:33.6 (FU-7 build, Chromium) the pulse returned after 4.2 min. Do not press early; see the early-CPR tables in KIT-GATE.
- When the arterial trace and the CO2 jump, press **Pulse back: stop CPR** → state "Return of circulation"; a minute later ART ≈ 132/89 (103), HR 78, CO2 34.
- If CPR is never pressed: "SPO2 NO PULSE" 10:40, "CO2 APNEA" 12:38, "ECG ASYSTOLE" 15:00.
