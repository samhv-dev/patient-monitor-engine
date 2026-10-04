# Showcase cases: exact on-screen labels, step by step (notes for the run sheet)

*For the orchestrator, not the final user documents. Taken from the built kit (`main` bd5880b, before the showcase
hotfix) on Chromium and WebKit at 1440×900, Saadat-style monitor (the default), by `rehearsal.showcase.ts`; every
label below is copied from the page's own text (`docs/showcase/results/rehearsal-*.json`, fields `labels`). Times
are SIMULATED time at ×4 (divide by 4 for wall-clock time). Re-check the labels after the hotfix merges: the
bronchospasm card wording and the Saadat CO2 lane are being changed on `showcase-hotfix`.*

## Getting to a case (same for all five)
1. The launcher opens the **Start** page (`127.0.0.1:8642/#/`, heading "Set up the session").
2. Top bar, left to right: **Patient monitor simulator** · **Start** · **Monitor** · **Instructor** · **Explore physiology** · **Ventilator** · **Validate** · **Developer** · **Settings**; on the right: the alarm button, **Sound off**, **Remote** + 6-letter code.
3. Click **Instructor** (or, on the Start page, **Open the instructor view**).
4. Instructor panel tabs (right side): **Scenario** · **Vitals & rhythm** · **Drugs & fluids** · **Airway & ventilation** · **Defib, pacing & CPR** · **Devices & alarms** · **Patient** · **Log**. Click **Scenario**.
5. Category chips: **All** · **Showcase** · **Resuscitation** · **Haemodynamic crisis** · **Anaesthesia depth and drugs** · **Airway and breathing** · **Metabolic and thermal**. Click **Showcase**. Five cards, in this order: *Anaphylaxis under anaesthesia* · *Class IV haemorrhage, PEA and resuscitation* · *Healthy induction* · *Severe bronchospasm on the ventilator* · *Severe tamponade, then induction*.
6. On the card, click **Load**. Toast: "Scenario loaded: <title>". The panel switches to the running case: title, **Choose another scenario**, the story, the state strip (current state outlined), "Time in state", **Hold the timer**, **Bookmark**, **Learner controls on the monitor**, then **What happens next** (one line per next step, with its button), **Objectives** (tick boxes), **Bookmarks**.
7. Session bar (under the top bar): patient chip (e.g. "M 40 y 75 kg"), **MODELED**, "<title>: <state> <time in state>", the clock, **×1** **×2** **×4**, **Pause**, **Bookmark**. Click **×4** → toast "Speed ×4".
8. **Between cases, reload the page** (Cmd-R) — loading a second case in the same page freezes the clocks (orchestrator finding S2); every rehearsal run here used a fresh page load.

## 1. Healthy induction
- State strip: "Awake, preoxygenated" → "Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg" → "Intubated and ventilated".
- What happens next (at load): `You press "Induce now": Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg` — button **Induce now**.
- After **Induce now**: `You press "Intubate and ventilate": Intubated and ventilated` — button **Intubate and ventilate**.
- After **Intubate and ventilate**: "What happens next" is empty (end of case).
- Observed (both browsers, identical to 0.1): baseline ART 123/81 (95), HR 70, SpO2 98, EtCO2 39. Breathing stops 51–57 s after **Induce now** (monitor alarm "CO2 APNEA", top-right "!!! Apnoea (no CO₂ breaths)"); ART mean 95 → 83 at 1 min → 82.5 at 2 min; SpO2 stays 99 (preoxygenated). EtCO2 46 within 5 s of **Intubate and ventilate**, 38 two minutes later; MAP nadir 71.6 at ≈ 4 min.
- On the Saadat-style monitor (default) there is no CO2 lane or EtCO2 tile on this build (finding S1; the hotfix adds it). The capnogram is visible on Philips-style.

## 2. Anaphylaxis under anaesthesia
- State strip: "Ventilated, stable" → "Anaphylaxis" → "Epinephrine given" → "Epinephrine given" (two boxes with the same label: one per route to that state).
- At load: `After 1 min in this state or you press "Start the reaction": Anaphylaxis` — button **Start the reaction** (it starts by itself after 1 min of sim time).
- In Anaphylaxis: two lines — `Epinephrine given: Epinephrine given` (no button: fires if epinephrine is given from Drugs & fluids) and `You press "Give epinephrine 100 µg": Epinephrine given` — button **Give epinephrine 100 µg**.
- After the button: "What happens next" is empty.
- Observed (both browsers): at the start HR 73, ART 119/83 (96); 2 min into Anaphylaxis HR 135, ART 96/70 (78), SpO2 99, no monitor alarm raised. **Give epinephrine 100 µg** at 2 min → systolic > 110 after 11.5 s (HR peaks ≈ 173), 2 min later HR 110–112, ART 121/88 (98).

## 3. Severe bronchospasm on the ventilator
- State strip: "Severe bronchospasm" → "Salbutamol given: pressures falling" → "Salbutamol given: pressures falling" (two boxes, same label).
- At load: `Salbutamol (IV/neb) given: Salbutamol given: pressures falling` (no button) and `You press "Give salbutamol 250 µg": Salbutamol given: pressures falling` — button **Give salbutamol 250 µg**.
- The numbers are on the **Ventilator** view (top bar), Hamilton-style cockpit. Left column, value then label: fTotal /min, VTE ml, Ppeak cmH₂O, ExpMinVol l/min, Pmean cmH₂O. Red banner "⚠ High pressure (Pmax)". Right-side buttons: VT 500 ml, Rate 14 b/min, PEEP 5 cmH₂O, Oxygen 40 %, **Controls**, **Alarms**, **Freeze**, **Insp hold**, **Exp hold**, **Patient**, **Man. breath**, **Reset**; bottom tabs **Monitoring** · **Utilities** · **Events** · **System**.
- Observed (both browsers): before salbutamol (1.4 min) VTE 161–162 ml, Ppeak 35, ExpMinVol 2.3, Pmean 13, fTotal 14; 3 min after salbutamol VTE 367 ml, **Ppeak still 35** (pressure-limited), ExpMinVol 5.1, Pmean 14; "High pressure (Pmax)" banner stays. The card text says "watch the pressures fall": narrate "the tidal volume and minute volume recover" (orchestrator finding, confirmed). Monitor side: SpO2 97 → 98–99, EtCO2 32 → 36, HR 75 → 85.
- Screenshots: `rehearsal/severe-bronchospasm-on-the-ventilator-vent-before-*.jpg`, `…-vent-after-*.jpg`.

## 4. Severe tamponade, then induction
- State strip: "Tamponade, compensating" → "After induction: compensation lost" → "After induction: compensation lost" → "Pericardium drained".
- At load: `Propofol given: After induction: compensation lost` (no button: fires on propofol from Drugs & fluids) and `You press "Give propofol 2 mg/kg": After induction: compensation lost` — button **Give propofol 2 mg/kg**.
- After the button: `You press "Drain the pericardium": Pericardium drained` — button **Drain the pericardium** (not pressed in the rehearsal).
- Observed (both browsers): compensating HR 96, ART 107/86 (93), SpO2 95, EtCO2 35. After **Give propofol 2 mg/kg**: "CO2 APNEA" 44–52 s after the button; ART mean < 40 after 113 s; at 2 min HR 40, ART 39–41/29 (32), SpO2 82–83, EtCO2 0, RR 4.

## 5. Class IV haemorrhage, PEA and resuscitation
- State strip: "Bleeding 2.5 L over 10 min" → "CPR, 2 L warmed fluid, epinephrine 1 mg" → "Return of circulation".
- At load: `You press "Start CPR, 2 L and epinephrine": CPR, 2 L warmed fluid, epinephrine 1 mg` — button **Start CPR, 2 L and epinephrine**.
- After it: `You press "Pulse back: stop CPR": Return of circulation` — button **Pulse back: stop CPR**.
- Observed course (both browsers): 2 min HR 82, ART 114/83; 4 min HR 96, 107/83; 6 min HR 120, 98/80; 8 min HR 141, 75/61; "SPO2 LOW PERFUSION" at 8.3 min; at **10:03 "IBP1 STATIC PRESSURE"** — the arterial number becomes "mean only" (systolic/diastolic blank, mean ≈ 15): this is the pulse loss on the arterial line; at **10:40 "SPO2 NO PULSE"** (pleth number gone), HR ≈ 46.
- **Press "Start CPR, 2 L and epinephrine" AFTER the "SPO2 NO PULSE" alarm** (≈ 10:40 sim, ≈ 2 min 40 s of wall time at ×4). Measured: pressed at 10:52, 10:56 and 11:47 → systolic > 90 after 4.3 min of CPR every time (e.g. 127/74 then 132–157/83–105, EtCO2 16–17 during CPR, 34–35 a minute after). **Pressed at 10:28 (25 s after the static-pressure alarm, before "SPO2 NO PULSE") the monitor showed "ECG VFIB" within 5 s and no pulse returned in 8 min of CPR (best systolic 63) — on both browsers.** See KIT-GATE "unexpected behaviour" U1.
- When the arterial trace and EtCO2 jump, press **Pulse back: stop CPR** → state "Return of circulation"; a minute later ART ≈ 131/88 (102), HR 77–78, EtCO2 34–35.
- If CPR is never pressed: "SPO2 NO PULSE" 10:40, "CO2 APNEA" 12:38, "ECG ASYSTOLE" 15:00.
