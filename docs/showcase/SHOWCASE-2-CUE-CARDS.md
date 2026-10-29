# Showcase 2: cue cards (Tuesday 3 November 2026, 12 Aban 1405, the 30-minute slot)

*One card per page, for the lectern. Print from a Markdown preview at 150 % or more, one card per page (a page break
follows each card). **The programme (owner, 29 October, P29): one case, malignant hyperthermia on the E119 card, with
three look-inside stops: the engine Paused, the Explore view opened from the Instructor side, the model page behind it
in a second browser tab.** The class IV haemorrhage case (E120) and its Debrief left the programme and stay in the
build: their cards are under "Reserve" at the end, with the cards not in the programme. Freeze: Saturday 31 October
12:00.*

*Where the numbers come from. **Clock** = the session-bar clock (Load = 0:00). Every clock time, monitor number and
Explore number is measured on the new programme's talk run (`kit-round-a.kitround.ts`, "Q1 30-minute talk"; kit
a88f95a7, 29 October, Chromium, 3 emulated phones, 2 s reaction, 3 s per Explore screen; `scratch/kitround-mh-only/`,
screenshots in `scratch/owner-review/mh-only-programme/`). **Slot** = time from the start of the segment's slot; **T+** =
time from the opening. The machine wall is measured; the talk is not: a time I had to estimate is marked "(est.)". The
talk points come from the speaker's reference (`scratch/owner-review/mh-mechanisms-on-the-demo-build.md`); [ENG] = an
engineering size, not a sourced one.*

<div style="page-break-after: always;"></div>

# Every stop, every press, and the safety lines

## The order (30 min)

| T+ | Segment | Slot | Machine wall (measured) | Card |
|---|---|---|---|---|
| 0:00 | Opening on Home and the Room; the phones join | 3:00 | 3 phones in 3.1 s | OPEN |
| 3:00 | MH to the early signs (×8 then ×4) | 2:00 | 1:14 | MH-1 |
| 5:00 | **Stop 1**: why the EtCO₂ rises when it should fall | 3:00 | 0:49 | STOP 1 |
| 8:00 | The call, hyperventilation, dantrolene; EtCO₂ falls | 2:00 | 0:20 | MH-2 |
| 10:00 | **Stop 2**: dantrolene in the model, why we hyperventilate, the potassium | 3:00 | 1:06 | STOP 2 |
| 13:00 | Ventilation back, the climb | 2:00 | 0:15 | MH-3 |
| 15:00 | **Stop 3**: the climb back, the second dose, what comes next | 3:00 | 0:52 | STOP 3 |
| 18:00 | The end of the case and the MH Debrief, read on screen | 4:00 | 0:20 | MH-4 |
| 22:00 | Close and the ask | 3:00 | — | run sheet §5 |
| 25:00 | Questions | 5:00 | — | |

**Running over? Cut:** questions first · then stop 3's paragraph (the two sentences on E134) · then the Debrief read.

## Every stop: the same five moves

1. **Pause** (Instructor view, session bar). The phones read "(paused)" within a second.
2. Rail → **Explore physiology** (the chart icon on the strip). Pick the sections in **Body systems**. **"Changed only"
   stays off.** Read the **Now** column (Change is against 01:00, the awake patient).
3. Point at the numbers on the card.
4. The **model-page tab** (right of the instructor tab): point, then back to the instructor tab.
5. Rail → **Instructor** → **Resume** → the next press **at once**.

**Explore has no Pause button** (no session bar): always pause first, resume only after coming back.
**Never point at VCO₂ 216 or VO₂ 270 under Gas exchange**: they do not move with MH. The MH VO₂ is under Blood.

## Every press

- **Load → All alarms on → Bookmark → ×8.** Instructor → Devices & alarms → **All alarms on**; the top-right button then
  reads **No alarms**. Bookmark AFTER it.
- **Fast-forward: about 10 s** of wall (10.1–10.6 s per 5-min span). Press nothing while the amber panel shows. **The
  speed after it is the speed before it** (×4 stays ×4).
- **"Not available now"** → press again.
- **Saadat-style monitor. Never change the monitor style during the talk** (AGENTS reads "---" after a change).
- **Silence lasts only until the next alarm.** There is no alarm pause on this monitor.
- Something went wrong → **Return here** on the bookmark (00:06); or **Restart patient**, then load the case again.

## Safety lines (UI review, 24 October; P29)

- **Never click "Ventilator" during the case**: not the rail's **Ventilator**, not a Ventilator tab. If it happens: back
  to **Instructor**; leaving the view releases the phones at once.
- **Never reload mid-case.** If it happens: the case comes back ("Restored after reload: ‹title›, mm:ss"); **switch
  Sound on again** and check **All alarms on**.
- **Open the Room (the QR) only from the instructor tab.** The model-page tabs are GitHub pages, not instructor tabs.
- **The instructor tab stays in front**, except for a short look at a model page during a stop, with the session
  **Paused** (a paused session stays paused while the tab is hidden; keep each look under a minute).
- The Debrief is **read on screen**, not printed. Only the **MH Persian handout** is printed, before the day.

<div style="page-break-after: always;"></div>

# OPEN · The opening on Home and the Room (T+0:00 → 3:00)

**Slot 3:00 · the simulator opens on Home (E125): Home → Start here → the Room's QR; the case from Scenarios.
Before the talk: the three model-page tabs loaded, to the right of the instructor tab (run sheet §1).**

| Slot (T+) | Look at | Click | Say |
|---|---|---|---|
| 0:00 (0:00) | Home: title **Patient monitor simulator**, the line "Version 1.0.0-rc.… · pre-release · build …", and at the foot the line "For educational use only; Not to be used in patient care." | — | what the simulator is; education only, not to be used in patient care |
| ≈ 0:30 (est.) | the **Room**: the QR code, the large **session code**, the join address and "0 phones following" | **1 · Start here** | "Join the Wi-Fi called ‹network› and scan this code. Your phone follows what I do here; it is silent." |
| | "0 phones following" → "3 phones following" (2.6 s after the QR, 3 emulated phones) | — | |
| 3:00 (3:00) | the Room | — | MH framing, ≈ 0:30: "One case, and three times I will stop the clock and open the model behind the monitor." |
| ≈ 3:30 (est.) | **Scenarios** (the rail) → **Open the library** → *Malignant hyperthermia* (Demonstration 1) | **2 · Scenarios** → **3 · Open the library** → **4 · Load** (toast "Scenario loaded: Malignant hyperthermia") | then MH-1's first row |

**On a kit without Home** (the rc.3 fallback kit): QR from the **Monitor** view → pointer to the top edge → **Phones**
→ **Close**; the case: **Open the instructor view** → **Scenario** → **Showcase** → *Malignant hyperthermia* →
**Load**.

**Traps:** do not click **Ventilator** in the rail. Open the Room from this tab only.

<div style="page-break-after: always;"></div>

# MH-1 · MH to the early signs (×8 then ×4) (T+3:00 → 5:00)

**Slot 2:00 · machine 1:14 · ends Paused at the early signs (8:09–8:10)**

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| ≈ 0:30 (≈ 3:30) | 0:00 | HR 69, ART 122/80; room air | **Load · All alarms on · Bookmark · ×8** | "Awake on the table, monitoring on, breathing room air." |
| | 0:30 | | **Premedicate: midazolam 2 mg, fentanyl 100 µg** | |
| | 1:00 | RR 13, SpO₂ 96 | **Preoxygenate: 100 % O₂ by face mask** | "Oxygen is never implicit: we give it." |
| | **4:00** | RR 6 after the premedication (`RR TOO LOW` 3:09) | **Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg** | the masseter line (below) |
| | **5:00** | `CO2 APNEA` 4:49; **SpO₂ 99** | **Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %** | "SpO₂ 99 through the apnoea: he was preoxygenated." |
| | **6:00** | EtCO₂ 42, HR 71 | **Start surgery: rocuronium 0.6 mg/kg** | "The premedication and the apnoea raised his CO₂ stores; on the ventilator the EtCO₂ should now fall." |
| | 7:30 | EtCO₂ 45, HR 75 | **×4** | "Same ventilation. Watch the CO₂ tile." |
| ≈ 1:44 (≈ 4:44) | **8:09** | state **Early signs**: **EtCO₂ 46, HR 78**, ART 107/67; T1 36.5 | **Pause** at once (8:10). **Do not call yet** | "The EtCO₂ is rising when it should be falling. Let us look inside." → STOP 1 |

**Masseter line (at Induce):** "The jaw is hard to open: masseter rigidity. In practice that means a non-triggering
anaesthetic from now on and close watch of the EtCO₂; today the volatile stays to show the crisis. Rigidity plus a
rising EtCO₂ makes two signs."

**Traps:** skip Preoxygenate and SpO₂ falls to ≈ 62 % before the tube. Pause at the early signs, not later: the call
after stop 1 still lands 3 s after Early signs on the clock.

<div style="page-break-after: always;"></div>

# STOP 1 · Why the EtCO₂ rises when it should fall (T+5:00 → 8:00)

**Slot 3:00 · clock held at 8:10 · machine 0:49 · model page: endocrine-thermal, "Equations in words" (MH bullets)**

**Open:** Explore physiology → **Endocrine** → **Blood, acid–base and temperature** (then scroll to **BE**) → the
**endocrine-thermal** tab → back → **Instructor** → tick *Name malignant hyperthermia* (Scenario tab). Stay Paused.

| Explore shows (8:10) | Say (the number on screen) |
|---|---|
| Endocrine: **MH activity 0.270** | "Induce gave propofol, succinylcholine and an instructor event, 'condition MH': the event started MH at 4:03, not the drugs. Activity is severity × a ramp to full over 15 minutes [ENG] × the share dantrolene has not suppressed. Four minutes in: 0.27. Only dantrolene changes it now." |
| Blood: **VO₂ 332 mL/min** (+66) | "One MH rate: the muscle adds an oxygen demand, activity × 1.5 × the resting VO₂; at full activity whole-body VO₂ is × 2.5, the tables' range, from swine data. Oxygen, CO₂, heat and lactate all come from that one number." |
| Blood (scrolled): **PCO₂ 50.0**, pH 7.32; strip **EtCO₂ 46** | "The MH CO₂ is that oxygen × RQ 0.97, plus the CO₂ from buffering its lactate. The ventilator holds alveolar ventilation fixed, and PaCO₂ is 0.863 × VCO₂ over VA: more CO₂, same ventilation, higher PaCO₂. It rises over minutes because the CO₂ stores fill first." |
| Blood: **Tcore 36.52** (−0.28) | "About 140 watts at full activity. Under anaesthesia the redistribution and the lower basal heat outweigh a half-active MH: the temperature has not moved. Do not wait for the thermometer." |
| Endocrine: **Epinephrine 155, Norepinephrine 689**; HR 78 | "MH has its own sympathetic drive, rising within two minutes [ENG]: the heart rate moves before the EtCO₂ does." |

**Close the stop:** *"The EtCO₂ is rising at unchanged ventilation when it should be falling, with a rising heart
rate: think of MH early."* → MH-2.

**Do not point at:** Gas exchange's VCO₂ 216 / VO₂ 270 (they do not move with MH). **Not in this build:** muscle lactate
with its own limits, injury potassium, MH severity as an input (open branches).

<div style="page-break-after: always;"></div>

# MH-2 · The call, hyperventilation, dantrolene; EtCO₂ falls (T+8:00 → 10:00)

**Slot 2:00 · machine 0:20 · ends Paused as fast-forward 1 ends (13:50)**

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (8:00) | 8:10 (Paused) | the paused monitor: EtCO₂ 46 | — | *"Trigger off: sevoflurane off, charcoal filters on the circuit, a propofol infusion so he stays asleep, 100 % oxygen at 10 L/min, double the ventilation."* (≈ 1:30) |
| ≈ 1:35 (≈ 9:35) | 8:10 → **8:12** | | **Resume** · at once **MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate** | |
| | **8:32** | RR 20 | **Dantrolene 2.5 mg/kg** when it shows (≈ 5 s) | "In real life dantrolene takes extra hands and minutes: 200 mg is ten vials to mix." **No cooling** (only above 38.5 °C) |
| | 8:37 | EtCO₂ below 40 from **8:34** | **5 min** at once (10.3 s). **Hyperventilation stays on** | |
| ≈ 1:55 (≈ 9:55) | **13:50** | state **Recovering** (from 9:34) · **EtCO₂ 40**, HR 81, RR 20 | **Pause** as the banner shows | → STOP 2 |

**Traps:** do not press ventilation back yet (offered from 9:34; "not met" before 10:34). No Cool. The charcoal filters
are words only.

<div style="page-break-after: always;"></div>

# STOP 2 · What dantrolene does in the model; why we hyperventilate; the potassium (T+10:00 → 13:00)

**Slot 3:00 · clock held at 13:50 · machine 1:06 · model pages: pharmacology (Cmd-F "dantrolene"), then blood
("Equations in words")**

**Open:** Explore physiology → **Drugs** → **Endocrine** → **Gas exchange and oxygen delivery** (scroll to **VA**) →
**Blood, acid–base and temperature** (scroll to **BE**) → the **pharmacology** tab → the **blood** tab → back →
**Instructor** → **Resume** → at once **EtCO₂ normal: ventilation back to 12 × 500** (MH-3).

| Explore shows (13:50) | Say (the number on screen) |
|---|---|
| Drugs: **Ce (Dantrolene) 0.892** (drug unit = 2.5 mg/kg doses) | "Dantrolene here is a gamma curve: peak at 10 minutes, a tenth of the peak at 6 hours. Its effect is C over C + 1: about 0.47 now." |
| Endocrine: **MH activity 0.510** (0.270 at stop 1) | "Its only action: the unsuppressed share of the MH relaxes toward 1 − 1.6 × that effect, with a 10-minute time constant [ENG]. One dose can suppress 80 % at most; 5 mg/kg all of it. And the activity is still rising: the 15-minute onset ramp is not finished." |
| Gas exchange: **VA 9.11 L/min** (3.7 at 1:00), f 20, VT 600; PaCO₂ 44.2 | "The EtCO₂ was below 40 two seconds after the dose, before it could act. That fall is the doubled ventilation, 6 to 12 litres a minute, clearing the CO₂ the muscle is still making. It also takes away the hypercapnic sympathetic and pressor drive. It does nothing to MH itself; nor did turning off the sevoflurane." |
| Blood: **VO₂ 427** (still rising) | "The muscle is still working harder." |
| Blood (scrolled): **K⁺ 4.62**, pH 7.36, lactate 1.80 | "The MH potassium in this build is one fitted term: 2.35 mmol/L × the activity on the potassium set point [ENG]. On top, three general terms: the acidaemia without the lactate, adrenaline's β2 uptake, the succinylcholine pulse. There is no muscle injury and no rhabdomyolysis in this build. On this path K never passes 5.5." |

**Do not point at:** VCO₂ 216 / VO₂ 270 in the Gas exchange list (two rows above VA). The Drugs "Total" unit reads
"mg, µg": dantrolene's 200 is mg. **Note:** the MH potassium term and dantrolene's gain are on the
**endocrine-thermal** page's Parameters (MH_K_EFFLUX, DANT_GAIN), not on the blood page.

<div style="page-break-after: always;"></div>

# MH-3 · Ventilation back, the climb (T+13:00 → 15:00)

**Slot 2:00 · machine 0:15 · ends Paused as fast-forward 2 ends (19:11)**

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (13:00) | 13:50 → **13:52** | EtCO₂ 40–41 (below 40 for 2 min from 8:34 to 10:34: met) | **Resume** · at once **EtCO₂ normal: ventilation back to 12 × 500** | "EtCO₂ has stayed below 40 for 2 minutes: ventilation back." |
| | 13:56 | | **5 min** at once (10.6 s). EtCO₂ passes 45 at 14:06, inside it | |
| ≈ 0:15 (≈ 13:15) | **19:11** | **EtCO₂ 64**, HR 89, ART 99/66; banner `ETCO2 TOO HIGH` 14:27 | **Pause** as the banner shows | *"The EtCO₂ is climbing back at normal ventilation: the MH is not controlled."* Per minute after ventilation back: 40, 53, 56, 59, 61, 64. (≈ 1:45) → STOP 3 |

**Traps:** no dantrolene before ventilation back (a dose takes the button away for at least a minute). Do not press
the second dose yet: it comes after stop 3.

<div style="page-break-after: always;"></div>

# STOP 3 · The climb back, the second dose, what comes next (T+15:00 → 18:00)

**Slot 3:00 · clock held at 19:11 · machine 0:52 · model page: endocrine-thermal, Parameters (Cmd-F `DANT_GAIN`;
MH_RELAX_TAU_S beside it, MH_ONSET_S above)**

**Open:** Explore physiology → **Endocrine** → **Drugs** → **Gas exchange and oxygen delivery** (scroll to **VA**) → the
**endocrine-thermal** tab → back → **Instructor** → **Resume** → at once **Dantrolene 2.5 mg/kg; hyperventilate again
(20 × 600, O₂ 100 %)** (MH-4).

| Explore shows (19:11) | Say (the number on screen) |
|---|---|
| Drugs: **Ce (Dantrolene) 0.999** | "It looks like recrudescence. In this build it is not the drug wearing off: the first dose is at its peak right now." |
| Endocrine: **MH activity 0.550** (0.270, 0.510 before) | "The MH was still building: the onset ramp reached full activity 15 minutes after the succinylcholine, and one dose pulls it down only slowly, and only to 0.2." |
| Gas exchange: **VA 4.41 L/min**, f 12, VT 500; **PaCO₂ 70.1** | "At this activity the muscle makes more CO₂ than 12 × 500 clears." |
| — (the next press) | "The second dose brings him to 5 mg/kg: enough, in the model, to take the activity toward zero over 20 to 30 minutes. And back to hyperventilation, 20 × 600, until the EtCO₂ has stayed below 40 for 2 minutes." |

**Then the two sentences** (verbatim; the second thing to cut): *"The next layer of the muscle model is already built on a
branch, with its sources named and its numbers measured: muscle lactate with its own limits (the glycolytic brake at
low intracellular pH, a finite glycogen store, the heat of lactate production), potassium released by working and
injured muscle sized from Medbø and Sejersted 1990, and MH severity as a scenario input. We held it out of this release
because with it in, about fourteen clinical numbers left their acceptance bands and the haemorrhage case no longer
arrested as rehearsed. It ships when it passes those bands, not before."*

**Stage rule:** never say the simulator does something the kit in the room does not do. **Model page caution:** the
DANT_GAIN row's text says "90 % of its peak within 1 min"; the build's curve peaks at 10 min (the dantrolene row,
600 s). Do not read that phrase aloud.

<div style="page-break-after: always;"></div>

# MH-4 · The end of the case and the MH Debrief (T+18:00 → 22:00)

**Slot 4:00 · machine 0:20 · the Debrief read on screen, not printed**

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (18:00) | 19:11 → **19:13** | EtCO₂ 64 | **Resume** · at once **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** | |
| | 19:16 | RR 20 again | **5 min** (10.1 s) | |
| ≈ 0:15 (≈ 18:15) | **24:31** | **EtCO₂ 41**, HR 69, ART 94/57 (67), RR 20; state Recovering (from 23:35); T1 36.4 | **Pause** · take-home 1:00. **Do NOT press ventilation back** (offered; rule not met) | "Still hyperventilated: back to 12 × 500 only once the EtCO₂ has stayed below 40 for 2 minutes." Then the four take-home lines |
| ≈ 1:15 (≈ 19:15) | | | session bar **Debrief** | read it (below), ≈ 2:00 |
| ≈ 3:15 (≈ 21:15) | | | back to **Instructor** | |

**Take-home lines (owner-agreed 26 October, verbatim):** *"A rising EtCO₂ at the same ventilation with a rising heart
rate: think of MH early."* · *"Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg."* ·
*"Keep hyperventilating until the EtCO₂ stays down; if it climbs again, repeat dantrolene."* · *"After the crisis: ICU
24–48 h, dantrolene 1 mg/kg every 4–6 h for 24 h (recrudescence in up to 50 %), then referral for testing and family
counselling."*

**The Debrief on screen:** Key times: recognition **1 s** (8:09 → 8:10 ticked) · call **3 s** (≤ 2 min) · dantrolene
**21 s** (≤ 5 min). Objectives: **✓ ✓ ✓ ✓ – ✓** (name MH · call · dantrolene · second dose with hyperventilation again
· – potassium, K⁺ never above 5.5 · ventilation back after < 40 for 2 min, 08:34 → 10:34). Facts: highest EtCO₂ 64 at
18:46 · K⁺ 5.0 (4.2–5.0) · lactate 3.6 · pH 7.33 (7.18–7.41) · Tcore 36.4 (36.4–36.8). *"The report is a debrief aid: it
reads the run, it does not grade the person."*

**If asked about the end:** ventilation back again at 27:12 (headless), then up to 44, below 40 for good from 43:10.

<div style="page-break-after: always;"></div>

# Reserve

*In the build, out of the 3 November programme (owner, 29 October). The haemorrhage card and its Debrief, kept as they
were on the 24 October programme; their T+ column is that programme's. If used: Load → All alarms on → Bookmark →
speed, as always; no reload after MH (Choose another scenario). Its Persian handout stays in the kit, not printed.*

<div style="page-break-after: always;"></div>

# HAEM · Class IV haemorrhage: PEA, asystole, VF, two shocks, ROSC (E120; after the clinical review, E132) (reserve)

**Slot 5:40 (T+13:00 → 18:40) · ×8, ×4, ×1 · no fast-forward · machine running 4:34 (E132 rc.4) · its Debrief follows (HAEM-D)**

Talk allowance: 0:30 framing before Load; the rest is said over the running case (the ×1 stretches: asystole → CPR,
the rhythm checks, the return of circulation).

**To Load:** after another case → Instructor → Scenario → **Choose another scenario** → **Showcase** → *Class IV
haemorrhage, PEA and resuscitation* → **Load** → **Load scenario**. First case of the page → **Scenarios** → **Open the
library** → **Load** on *Class IV haemorrhage, PEA and resuscitation*. No reload after MH.

States: Bleeding on room air → (Oxygen by mask) → **Intubated and ventilated** → **Junctional 50/min** (card) → **PEA**
→ **Asystole** → CPR → source control, massive transfusion, TXA · epinephrine → **Rhythm check: VF** (card) → shock →
epinephrine → **Rhythm check: VF again** (card) → shock → CPR to the 2-min rhythm check → **pulse back, stop CPR**

Clocks: kit round A4 on the E132 card with the E126 pulse-check pause, rebased onto main 25771808 with E131, E133 and
#153 (kit 503caeab, Chromium, 27 October); the two-demos talk run (before E132) in brackets where it differs by more
than 3 s.

| Slot (T+) | Clock | Look at | Press | Say |
|---|---|---|---|---|
| 0:00 (13:00) | — | | (To Load) | framing, 0:30: "Bleeding 2.5 litres over 10 minutes; the bleed stops there: that is the surgeon's source control." |
| 0:30 (13:30) | 0:00 | HR 71, ART 123/81, SpO₂ 96 on room air | **Load · All alarms on · Bookmark · ×8** | "Bleeding 2.5 litres over 10 minutes, breathing room air." |
| 0:33 (13:33) | 0:30 | room air | **Oxygen by face mask, FiO₂ 1.0** (state 0:34) | |
| 0:37 (13:37) | 1:00 | | **Intubate and ventilate, FiO₂ 1.0** (state 1:06) | "Say we are in the OR or the ED, and we induce with a reduced-dose ketamine RSI; the button does not give the drug. Positive pressure cuts the venous return of an empty patient: that, not the bleed alone, tips him into arrest." |
| 1:29 (14:29) | 8:00 | **HR 139–141**, **ART 74/60**, EtCO₂ 25 | — | "The pressure held and only the heart rate told you; now the pulse pressure narrows." |
| 1:38 (14:38) | **9:16** | ECG: **junctional 50/min** (the card sets it); ART 56/45 | **×4** | "The card sets this rhythm; what follows is the model." |
| 1:56 (14:56) | 10:24 | state **PEA**: **ART 21/14**, the ECG still running | — | "Electrical activity, a pressure too low to feel: pseudo-PEA. With a palpated pulse you would call it PEA." |
| 2:04 (15:04) | **11:00** | pulse lost: the arterial number goes mean only; `SPO2 NO PULSE` 11:06 | **×8** · **no CPR** | "Now we do what nobody should: wait, so you can see a pulseless heart decay." |
| — | 12:54 | ECG idioventricular | — | |
| 2:39 (15:39) | **15:34** | state **Asystole**: the ECG flat (from 15:27), `ECG ASYSTOLE` 15:36 | **×1** | |
| 2:42 (15:42) | 15:38 | compressions on the ECG and the arterial trace | **Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0** · **Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g** | "In haemorrhagic arrest the surgeon stops the bleeding and we give blood; compressions cannot fill an empty heart." |
| 3:02 (16:02) | 15:59 | ART 35/12, EtCO₂ 5 | **Epinephrine 1 mg** · **×4** | |
| — | 16:39 | ART 63/27, EtCO₂ 14 | — | "EtCO₂ and the diastolic pressure tell you how good the CPR is." |
| 3:28 (16:28) | **17:38** | 2 min of CPR: **ART 74/37, EtCO₂ 20** | **×1** · **Rhythm check** → compressions pause → **VF** (`ECG VFIB` 17:41; HR and SpO₂ blank) | "The card inserts VF to show the defibrillator." |
| 3:35 (16:35) | 17:46 | VF on the ECG, compressions paused (E126) | **Defib, pacing & CPR tab: Charge → Shock** (200 J) → **asystole**; compressions resume with the shock · **×4** | "Charge during compressions; the pause for the shock under 10 seconds. The shock did stop the VF; no organised rhythm followed." (Pause under 10 s: measured 8 s on the rc.4 round; owner, 28 October.) |
| ≈ 3:45 (≈ 16:45) | **18:57** | ART 74/38, EtCO₂ 23 | **Epinephrine 1 mg** (the second dose, 3 min after the first) | "Epinephrine every 3 to 5 minutes." |
| 4:06 (17:06) | **19:45** | ART 73/34, EtCO₂ 24 | **×1** · **Rhythm check** → compressions pause → **VF again** (`ECG VFIB` 19:48) | "Recurrent VF: consider a higher energy." |
| 4:14 (17:14) | 19:53 | | **Charge → Shock** → organised rhythm, no pulse (sinus 19:58); compressions resume; **keep CPR** · **×4** | |
| ≈ 4:30 (≈ 17:30) | **20:57** | **the pulse returns** (the model, 64 s after the shock): the arterial line rises between compressions, EtCO₂ climbs; between compressions the oximeter loses the pulse again (`SPO2 LOW SIGNAL IQ` / `SPO2 NO PULSE` 21:05–21:43, #153) | **keep CPR** to the rhythm check | |
| ≈ 4:50 (≈ 17:50) | **21:52** | the 2-min rhythm check: organised rhythm, **ART 136/73, EtCO₂ 45** | **×1** · **Rhythm check: pulse back, stop CPR** (21:54) · **×4** | "The pulse came back because the volume brought the perfusion pressure up, not because of the shock. We see it on the arterial line and the capnogram." |
| ≈ 5:05 (≈ 18:05) | 22:54 | ART 141/93, HR 74, EtCO₂ 54 | end → straight to HAEM-D | "The model recovers faster than a patient would; expect a fragile, tachycardic, vasopressor-dependent patient." |

**Asystole is the model's** (a seeded slide after the pulse loss): the ECG went flat at 15:26–15:30 in every run and
the state and `ECG ASYSTOLE` followed at 15:32–15:38 (rc.4 rebase: 15:27, 15:34, 15:36). Press ×1 at the state, not by the clock.

**Say if asked:** the card sets the junctional rhythm and VF; the arrest, the slide to asystole, the perfusion
pressure, each shock's outcome and the pulse coming back are the model. The first shock ends VF in asystole on this
engine's seed every time, and this engine cannot regain a pulse from asystole (real asystole sometimes does): that is
why VF comes back for a second shock. The resuscitation step tells the engine: bleeding stopped, 1 L crystalloid, 1.2 L
blood (red cells and plasma as the engine's whole blood), TXA 1 g (logged; no coagulation model).

**Traps:** no CPR before asystole (CPR on the PEA stops its slide to asystole). Shock only in VF. The second
epinephrine after the first shock, before the second rhythm check. After the second shock keep CPR to the 2-min
rhythm check even when the arterial line shows the return. During CPR the SpO₂ tile reads 99 and the HR
≈ 107–111 (the compressions; UI review #6, #7); at the rhythm checks, compressions paused (E126), both go blank and
`SPO2 NO PULSE` sounds; after the return of circulation, still under compressions, `SPO2 LOW SIGNAL IQ` and `SPO2 NO
PULSE` come and go (21:05–21:43 on the rc.4 rebase, #153's pulse amplitude per beat): point at the ECG, the arterial
line and the capnogram.

*Kit round A4 on the E132 card rebased onto main 25771808 (E126, E131, E133, #153; kit 503caeab, Chromium, `scratch/kitround-e132-rc4/`; on E126 only: kit 4d0fca9b, `scratch/kitround-e132-rebase/`; before E126: kit e0c73a47, `scratch/kitround-e132/`); two-demos talk run
`q1-2-haemorrhage-e120-debrief-and-close-chromium` (kit 2ebd743d, before E132); the timing draft.*

<div style="page-break-after: always;"></div>

# HAEM-D · The Debrief (haemorrhage) (reserve)

**Slot 3:30 (T+18:40 → 22:10) · open it before loading anything else: it reports the current run**

| Slot (T+) | Do |
|---|---|
| 0:00 (18:40) | Session bar **Debrief** |
| 0:15 (18:55) | **Run by**: "Showcase 2, 3 November"; one line in **Notes** |
| 0:30 (19:10) | **Key times**: first team action **35 s** · CPR **4 min 39 s** after the pulse loss (asked ≤ 30 s) · CPR stopped **57 s** after the return of circulation (asked ≤ 2 min 00 s: owner, 28 October) · pulseless **9 min 57 s** |
| 1:00 (19:40) | the objectives: – recognise PEA (name the pseudo-PEA at about 20/14) · ✗ CPR within 30 s: withheld on purpose, as the objective says · ✓ the return of circulation recognised at the rhythm check |
| 1:30 (20:10) | **Key moments** (21 in the report) · **Timeline** (100 rows) |
| 2:15 (20:55) | **Print or save as PDF**: **9 A4 pages**. **In the print dialog, untick Headers and footers** (Chrome: More settings; Safari: Show Details → Print headers and footers). Then **Print the learner handout** (optional): 1 page |
| 3:00 (21:40) | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

**The objectives are final** (E132): no "draft" on the panel, the report or the print.

**Expect** (kit round A4, E132 rc.4, kit 503caeab): – Not assessable: Recognise PEA from hypovolaemia (the instructor judges it) · ✗ Not
observed: CPR 4 min 39 s after the pulse loss (11:00 → 15:38) · ✓ Observed: CPR stopped 57 s after the return of
circulation (20:57 → 21:54; within 2 min 00 s; owner, 28 October: was 2 min 30 s). Facts: lowest ART M 3 mmHg at 11:13 · pulseless 9 min 57 s · epinephrine 2 mg (2 doses) ·
lactate 4.9, pH 7.18, K⁺ 4.5.

**Take-home lines (owner-agreed 26 October, printed on the handout):** *"Positive pressure and induction can tip a
compensated bleeding patient into arrest."* · *"In haemorrhagic arrest, stopping the bleeding and giving blood come
first; compressions cannot fill an empty heart."* · *"EtCO₂ and the arterial diastolic pressure show how good the CPR
is, and they show the return of circulation."*

**Traps:** before giving the handout to the room, check it lists both shocks and the return of circulation.

*Kit round A4 on the E132 card (Debrief read and printed: report 8 pages, 9 with the E126 pause (kit 4d0fca9b: 98 timeline rows; kit 503caeab, the rc.4 rebase: 9 pages, 100 rows, the handout 1 page), the handout 1 page; the handout printed 2 pages on kit e0c73a47, 1 page after the compact-layout fix, Debrief e2e).*

<div style="page-break-after: always;"></div>

# Not in the 3 November programme

*Kept for the record, unchanged from the 22 October slot (bronchospasm, tamponade and the tamponade Debrief), and the
four cases held in reserve since 17 October (R1–R4; the haemorrhage reserve of 29 October is above). None is part of the 3 November programme. If one is ever used: Load →
All alarms on → speed → Bookmark as always.*

<div style="page-break-after: always;"></div>

# N1 · Severe bronchospasm on the ventilator (22 October slot; not in the 3 November programme)

**Chip "Airway and breathing" · ×4, ×8 · two 2-min fast-forwards · about 1 min 30 s of running · slot 5:00**

States: Severe bronchospasm → Salbutamol given: ventilation recovering

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · ×4 · Bookmark**, THEN top bar **Ventilator** |
| ≈ 1:25 | point | — |
| ≈ 2:00 | | **Instructor → Give salbutamol 250 µg → back to Ventilator** |
| ≈ 4:00 | | **Instructor → 2 min** fast-forward, then **×8**; back to Ventilator |
| ≈ 6:15 | point | **Instructor → 2 min** again (still ×8 after it); back to Ventilator |
| ≈ 8:45 | end | **Instructor → ×1** · talk · **Reload the page** (Cmd-R), then **Sound on** |

**Point at:** before: **VTE 300 mL, peak 35, minute volume 4.2**, "High pressure" banner · after: **VTE 501, minute
volume 7.0**, banner gone, peak 34 → 32.

**Explore line** (optional, 30 s, spoken, no press): *"A real monitor shows a handful of numbers; here the model carries
the whole body behind them, and an instructor can open it while a case runs."*

**Safe:** ×8 and the fast-forward pressed from the Instructor view, cockpit hidden: the cockpit keeps ventilating; the
phones stop holding while the Ventilator view is off screen (approximate, a fresh start every few seconds) and hold
again when you go back to it.

**Trap:** load first, Ventilator view second. Phones say "The ventilator is on the main screen": expected. Reload
before tamponade.

*Measurements §6, A3.3.*

<div style="page-break-after: always;"></div>

# N2 · Stab wound: tamponade, PEA and pericardiocentesis (22 October slot; not in the 3 November programme)

**×8, ×1, ×4 · no fast-forward · about 3 min 35 s of running · slot 5:30 · fresh (reloaded) page**

States: Arrival → Deteriorating → **PEA** → CPR → CPR: pericardium drained → Return of circulation → Post-ROSC fluid

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · ×8 · Bookmark** |
| 1:00 | **When the cues appear: CVP rising on the IBP2 tile (17), narrow pulse pressure, tachycardia** | **say: "Bedside FAST: pericardial fluid, right-ventricular collapse"** (the card's note on the Scenario tab; the monitor alone cannot diagnose it); name it aloud; **tick *Name the tamponade*** (Scenario tab) |
| 7:00 | | **×1** |
| 7:31 | IBP1 STATIC PRESSURE: trace going flat | hand on the Scenario tab |
| **7:49** | card shows **PEA** | **Start CPR, intubate, FiO₂ 1.0 AT ONCE** (by 7:57) |
| 7:52 | | **×4** |
| 9:00 | | **×1** |
| ◆ **9:21** | 1 min 30 s into CPR | **Pericardiocentesis during CPR** (by 9:51) |
| 9:22 | | **×4** |
| 10:22 | about 70/33: compressions only | **×1** · watch, do NOT stop |
| **10:55** | **systolic jumps to about 100 (compressions alone read about 70/33)** | **Pulse back: stop CPR** (within 30 s) |
| 11:27 | ART about 115/77, HR 64 | **Crystalloid 500 mL** → go to the Debrief |

**Debrief will say:** ✓ Observed name it (ticked: the tile shows your tick time; – Not assessable if not) · ✓ Observed CPR within 10 s (3 s) ·
✓ Observed drainage within 2 min (1 min 30 s) · ✓ Observed stop CPR (2 s) · **◆ Discuss "Better: pericardiocentesis
before the pulse loss"** (the one line to discuss: the lesson, not a timing).

**Traps:** **not at SPO2 NO PULSE** (on this path it never sounds; on a late path it comes at 7:58, already 10 s late).
**About 70/33 is the compressions, not a pulse: stopping there re-arrests him.** Wait for the jump to about 100
(it came 3 s after the model's return: 114/51 on Chromium, 97/49 on WebKit).

*Measurements §5, A3.1.*

<div style="page-break-after: always;"></div>

# N3 · The Debrief moment after the tamponade (22 October slot; not in the 3 November programme)

**Slot 3:30 · before loading anything else**

| Within the slot | Do |
|---|---|
| 0:00 | Session bar **Debrief** |
| 0:15 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** |
| 0:30 | read the **Key times** tiles: your tick · 7 min 51 s to the first team action · CPR 3 s · drainage 1 min 30 s · stop CPR 2 s · pulseless 3 min 07 s; then the objectives |
| 1:00 | ◆ *"Everything was done in time, and the report still marks one line to discuss: the better course was to drain before he lost his pulse. That is the lesson."* |
| 1:20 | **Key moments** (page 2): 7 rows, the numbers of the course strip; SpO₂ "–" while pulseless (07:48 → 10:55) |
| 1:50 | **Timeline**: 41 rows (undone rows struck through) |
| 2:15 | **Print or save as PDF**: **6 A4 pages** (Chrome: footer on every page). **In the print dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers).** Then **Print the learner handout** (optional): 1 page, no marks |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* |

**Expect:** ✓ Observed name the tamponade ("Observed by the instructor at …"; – Not assessable if not ticked) ·
✓ Observed CPR 3 s · ✓ Observed drainage 1 min 30 s · ✓ Observed stop CPR 2 s · **◆ Discuss Better: pericardiocentesis
before the pulse loss — "The pulse loss at 07:48"**.

**Trap:** the Debrief reports the CURRENT run: open it before loading MH.

*Measurements A3.1; run sheet §4.*

<div style="page-break-after: always;"></div>

# R1 · Induction after fentanyl and midazolam

**×4 throughout · about 2 min of running · round-B slot 4:00**

States: Awake → Fentanyl and midazolam given (by itself, 0:10) → Induced → Intubated and ventilated → Ephedrine given

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on (at once) · Bookmark** |
| **1:40** | **RR TOO LOW** | alarm button → **Acknowledge**; tick objective 1 |
| 3:00 | | **Induce now** |
| 3:42 / 4:00 | **CO2 APNEA** (39 s in Chromium, 57 s in WebKit) | **Intubate and ventilate** at once |
| 4:00 / 4:16 | **MAP below 60** | **Ephedrine 10 mg** at once |
| 8:00 | end | |

**Point at:** the RR alarm after the premedication · the pressure falling to **MAP 52** · back to 65 about 110 s after
ephedrine · at 8:00 ART 102/60, HR 61.

**Debrief would say:** – acknowledge (instructor) · ✓ intubate (9 s) · ✓ vasopressor (8 s) · ✓ MAP > 65 (1 min 47–52 s).

**Trap:** do NOT say "stops breathing sooner": the apnoea time differs by browser. The deeper pressure fall is the
contrast. The RR alarm comes back after you acknowledge it: once is enough.

*Measurements §3.*

<div style="page-break-after: always;"></div>

# R2 · Healthy induction, airway not secured

**×8 then ×4 · one 5-min fast-forward · about 1 min 50 s · round-B slot 4:30**

States: Awake → Induced (airway not secured) → **Airway not secured: SpO₂ below 90 %** → Bag-mask → Rescued: intubated

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** · ×8 |
| 3:00 | | **×4** · **Induce now** · tick objective 1 |
| 4:00 | **CO2 APNEA** (52–54 s) | say *"Today nobody secures the airway"* |
| 4:34 | | **5 min** fast-forward |
| **11:26** | state **SpO₂ below 90 %** (monitor still reads 94) | **Bag-mask ventilate, FiO₂ 1.0** at once |
| ≈ 12:15 | about 40 s later | **Intubate and ventilate, FiO₂ 1.0** |

**Point at:** SpO₂ 99 through the gap, 97 at 11:04 · after the bag-mask SpO₂ keeps falling to **87 at 19 s**, then
**95 at 30 s**, 99 at 40 s (the oximeter lags) · EtCO₂ 55 after the tube.

**Debrief would say:** ✗ intubate within 90 s (by design) · ✓ tube EtCO₂ · ✓ ventilate within 60 s of SpO₂ < 90 (9 s).

**Trap:** **do not open the Debrief for this case** (the ✗ is by design of the branch).

*Measurements §3.*

<div style="page-break-after: always;"></div>

# R3 · Anaphylaxis under anaesthesia

**×4 · about 1 min 15 s · round-B slot 3:30**

States: Ventilated, stable → **Anaphylaxis** (by itself at 1:00) → Epinephrine given

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** |
| 1:00 | the reaction starts | — |
| ◆ **2:30** | 1 min 30 s into the reaction | **Give epinephrine 100 µg** |
| ≈ 2:47 | 15 s later | **Drugs & fluids → Crystalloid 500 mL over 10 min → Give** |
| 5:00 | end | |

**Point at:** HR 74 → 116 and systolic 119 → 105 before the drug · systolic back above 110 in **5 s** · HR peak
144–145 · at 4:00 ART 133/96, HR 99.

**Debrief would say:** – recognise (instructor) · ✓ epinephrine within 2 min (1 min 30 s) · ✓ fluid.

**Trap:** **not at 2:00 or later.** At 2:03 the report marks ✗, HR peaks at 171 and **HR TOO HIGH** sounds.

*Measurements §2.*

<div style="page-break-after: always;"></div>

# R4 · Class IV haemorrhage (round B; SUPERSEDED by the HAEM card, E120)

**×8, ×4, ×1 · one 2-min fast-forward · about 3 min + Explore · round-B slot 7:30**

States: Bleeding 2.5 L over 10 min → CPR, 2 L warmed fluid, epinephrine → Return of circulation

| Clock | Cue | Press |
|---|---|---|
| 0:00 | | **Load · All alarms on · Bookmark** · ×8 |
| 1:00 | | **Pause → Explore → Set the baseline now → back → Resume** |
| 8:00 | HR 139, ART 74/60 | **Pause → Explore → Changed only** · back · **Resume at ×4** |
| 10:00 | | **×1** |
| 10:05 | IBP1 STATIC PRESSURE | **wait** |
| **10:40** | **SPO2 NO PULSE** | **Start CPR, 2 L and epinephrine**, then **2 min** at once |
| 12:43 | panel clears (still ×1) | **×4** |
| **13:40** | systolic above 90 (pulse back 13:38) | **Pulse back: stop CPR** |

**Point at:** HR > 100 at 4:30, > 120 at 6:05, > 140 at 8:00; systolic < 90 at 6:56 · in Explore: output halved, **SVR
up +659** (right physiology), O₂ delivery halved · the overshoot 203/106 at the stop · 1 min later 135/90, HR 74.

**Debrief would say:** – recognise PEA · ✓ CPR within 30 s (13 s) · ✓ pulse back within 6 min (3 min 09 s).

**Trap:** **no CPR before SPO2 NO PULSE** (both CPR lines turn "not assessable"). Press by 10:58.

*Measurements §4.*
