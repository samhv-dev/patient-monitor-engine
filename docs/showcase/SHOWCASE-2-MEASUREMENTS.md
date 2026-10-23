# Showcase 2: kit-round measurements (part A)

*Measured 2026-10-13 for part B, which folds these numbers into `SHOWCASE-2-RUN-SHEET.md` (that sheet is not edited
here). Every number below was read through a BUILT kit, served by its own **Start Classroom** launcher, on Playwright's
Chromium and macOS WebKit at 1440 × 900, one rehearsal at a time on a Mac shared with other agents.*

*The Debrief verdicts below are recorded as those builds printed them (– · ✓ Met · ✗ Not met). From the Debrief
redesign on, the report prints – Not assessable · ✓ Observed · ✗ Not observed · ◆ Discuss (E42–E44); the tamponade's
"Better: …" line, ✗ here, is ◆ Discuss.*

| | |
|---|---|
| Build measured | kit `pme-showcase-kit-56f3761f` (main 56f3761f: five showcase stages, FX-1 #58, FX-2, FX-4, FX-7, run sheet #53) |
| Re-checked on | kit `pme-showcase-kit-62e521c3` (main 62e521c3, the KR-A1 relay fix #64): anaphylaxis 1:30 and the MH "ventilation back at Recovering" variant, both browsers, relay **as built** |
| Script | `scripts/showcase/kit-round-a.kitround.ts` (config `playwright.kit-round.config.ts`, setup `kit-round-setup.ts`) |
| Raw evidence | `docs/showcase/kit-round-a/<case>-<browser>[-kit-62e521c3].{json,md}`: every row has the wall time from Load, the session-bar clock, the speed and this Mac's 1-minute load average |
| Load average | 1.3–4.9 over every kept run (each file's header gives its own min–max); the two discarded probes ran at up to 6.4 |
| Relay | the 56f3761f runs used `WS_NO_BUFFER_UTIL=1` in the launcher's environment (finding KR-A1, `kit-round-a/KR-A1-relay-crash.txt`). That is the pure-JS ws path the fixed kit takes by construction; the relay code is otherwise unchanged, so these measurements stand. The 62e521c3 runs used no workaround |

**How every case was run, as the presenter would.** A fresh page at `/?relay#/teach`. Three emulated phones join
before any case: Pixel 7 on Chromium, iPhone 13 on WebKit. Then **All alarms on** and **Sound on**, Load, the speed,
**Bookmark**. Card buttons are pressed at the run sheet's cues, with a presenter's reaction of **2 s of wall time**
after each cue (`KITROUND_REACT_S`). That is 2 s of sim at ×1, 8 s at ×4 and 16 s at ×8. Then the Debrief is read.
Then **one monitor-style change** (Settings → Monitor → Philips-style) is made, and the phones are watched for 30 s.
Times are the session-bar clock (Load = 0:00). "C / W" = Chromium / WebKit. Where both are given as one number, they
agreed to the second.

---

## 0. The E17 / E19 verdicts first

| Question | Chromium | WebKit | Verdicts (Debrief) |
|---|---|---|---|
| **MH, crisis called at Early signs** (call 9 s after it), the run sheet's 40-mmHg check before spans 2 and 3 | call ✓, dantrolene ✓, repeat –, **potassium – (not assessable: K⁺ max 4.7)**, **ventilation back ✗** | same | ✓ ✓ – – ✗ |
| … why the ventilation objective fails | EtCO₂ < 40 at **07:27, 26 s after the call** (hyperventilation 20 × 600). The 300-s window closes at 12:27, inside span 1 (07:41 → 12:41). "Recovering" shows at **08:36 / 08:35** (1.6 min after the call); the press came at 18:13 | same | the run sheet's check comes too late |
| **MH early, ventilation back as soon as "Recovering" shows** (08:43, before span 1; kit 62e521c3) | ✓ ✓ – – **✓** (1 min 16 s after EtCO₂ < 40) | ✓ ✓ – – ✓ | every assessable objective met |
| … but | EtCO₂ rebounds after 12 × 500 (`ETCO2 TOO HIGH` 10:07, inside span 1; **57 after span 1**, max 61), so the script gave the repeat dantrolene (14:02); "Recovering" again at 20:27 / 20:29 | same | a story choice for the owner |
| **MH, called at the established crisis** (Stage 10's path: two spans, then the call) | established 18:47, call 18:57 | same | **✗** ✓ – ✓ – (call 12 min 05 s after the early signs; potassium 2 min 26 s after K⁺ > 5.5 at 17:12; EtCO₂ never < 40 by 35:00) |
| **Anaphylaxis, epinephrine at 1:30 into the reaction** (02:30) | 1 min 30 s / 1 min 31 s | | **✓** recognise – · epinephrine ✓ · fluid ✓ |
| **Anaphylaxis, epinephrine at 2:03** (03:03 / 03:04) | 2 min 03 s / 2 min 04 s | | **✗** ("within 2 min 00 s asked") |
| **Tamponade, CPR at `SPO2 NO PULSE`** | pulse loss 07:48 → alarm **07:58** → CPR 08:00 | same | **✗ 12 s** (10 s asked). The alarm itself comes 10 s after the pulse loss, so a press AT the alarm can never meet 10 s |
| Tamponade, the rest of the sheet's path | drainage 10:04 (2-min span at 08:00) **✗ 2 min 04 s** (the deliberate miss); ROSC 11:39 / 11:40; stop 2 s later **✓**; "Better: drainage before the pulse loss" **✗** | same | – ✗ ✗ ✓ ✗ (**three ✗**, not two) |

**Consequences for the sheet (E17):** the default "miss one on purpose" (tamponade drainage) produces three ✗ in the
tamponade report: CPR 12 s, drainage 2 min 04 s, and "Better". The early MH path meets every assessable objective only
if the ventilation is brought back at "Recovering" (≈ 1.6 min after the call, ≈ 25 s of wall at ×4), before span 1.

---

## 1. (a) Malignant hyperthermia

Card at ×8 from Load, rocuronium at 4:00 (pressed 04:05), ×4 from 6:30. Dantrolene 20 s after the call, "Cool" 10 s
later. Three 5-min fast-forwards: 10.4–10.6 s of wall each, and the speed afterwards was unchanged (×4 → ×4; on the late
path ×8 → ×8).

| | Early call, C / W | Early + ventilation back at Recovering (62e521c3), C / W | Late call, C / W |
|---|---|---|---|
| Early signs | 06:52 | 06:52 | 06:52–06:54 |
| Call (MH crisis) | 07:01 (8 s after; first press taken) | 07:01 | 18:57 (established 18:47) |
| EtCO₂ first < 40 | **07:27** (0.4 min after the call) | 07:27 | **never by 35:00** (41 at 35:07) |
| "Recovering: EtCO₂ below 45" | **08:36 / 08:35** (1.6 min) | 08:35 / 08:34 | **28:19 / 28:18** (9.4 min) |
| Ventilation back pressed | 18:13 (after span 2) | 08:43 | not pressed (EtCO₂ stayed ≥ 40) |
| Monitor after span 1 | 12:55: ART 136/90 (104), HR 83, EtCO₂ 38; 18:11: 150/97 (115), EtCO₂ 36 | 14:00: EtCO₂ **57** → repeat dantrolene 14:02; 19:19: 45; 24:34: 41 | 25:06: ART 145/102 (116), HR 112, EtCO₂ 48 |
| HR max / EtCO₂ max after the call | 87 / 46 | 98 / 61 | 146 / 81 |
| Lowest systolic after the call | 103 | 103 | 113 |
| Limit alarms that fired | `ART SYS TOO HIGH` 22:40 (in span 3); `**ABPm 114>110`, `**ABPd 95>90` 23:49 | `ETCO2 TOO HIGH` 10:07; `ART MEAN/DIA TOO HIGH` 15:38–39; `ART SYS TOO HIGH` 16:42; `RR TOO HIGH` 18:08; `**ABPd 92>90` 24:53 | `ETCO2 TOO HIGH` 08:22 (in span 1); `RR TOO HIGH` 19:04; `AWRR TOO HIGH` 19:08; `ART DIA TOO HIGH` 22:20 / 22:02; `T1 TOO HIGH` 24:20; `ART MEAN TOO HIGH` 25:41 / 25:23; `ART SYS TOO HIGH` 27:33 / 27:43; `**ABPm 121>110`, `**ABPd 102>90`, `**Temp 39.2>39.0` 35:27 |
| Debrief: call / dantrolene / repeat / potassium / ventilation | ✓ / ✓ (21 s) / – / **– (K⁺ never > 5.5; 4.2–4.7)** / ✗ (10 min 47 s) | ✓ / ✓ / – / – / ✓ (1 min 16 s) | ✗ (12 min 05 s) / ✓ (21 s) / – / ✓ (2 min 26 s; K⁺ max 5.8) / – (EtCO₂ < 40 did not happen) |
| Debrief rows: timeline / minutes | 36 / 24 | 44 / 25 | 47–48 / 36 |
| Debrief facts | Highest EtCO₂ 46 at 06:46; Tcore max 37.6 °C; lactate max 2.5 | | Highest EtCO₂ 81 at 18:36; Tcore max 39.3 °C; lactate max 6.8; glucose max 17.0; pH min 7.09 |

No limit alarm sounds on the early path before the call: EtCO₂ peaks at 46, below the Saadat-style limit of 49.4.
Two earlier Chromium runs pressed "Dantrolene" twice: the script took the 2-s "Dantrolene given" state for a lost press.
They are kept as `*-probe-double-dose-chromium.*` and are not used above.

## 2. (b) Anaphylaxis

×4. The reaction starts at 01:00 (C/W). **Drugs & fluids → Crystalloid 500 mL over 10 min → Give**, 15–17 s after the
epinephrine (toast "Crystalloid 500 mL over 10 min"), meets "Give fluid".

Monitor every 30 s (C; W within 1 unit, apart from the 03:02–03:07 row on the 2:03 path):

| Clock | 0:30 | 1:00 | 1:30 | 2:00 | 2:30 | 3:00 | 3:30 | 4:00 | 4:30 | 5:00 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Epi at 1:30 (02:30)**: HR | 74 | 74 | 83 | 99 | 116 | 105 | 100 | 99 | 98 | 98 |
| ART | 119/83 (96) | 119/83 (96) | 114/80 (91) | 109/79 (89) | 105/77 (86) | 124/91 (101) | 130/95 (107) | 133/96 (108) | 133/96 (108) | 133/95 (108) |
| **Epi at 2:03 (03:03)**: HR | 73 | 74 | 83 | 99 | 115 | 143 (W 137) | 139 | 133 | 123 | 115 |
| ART | 119/83 (96) | 119/83 (96) | 114/80 (91) | 109/79 (89) | 104/77 (85) | 95/70 (77) | 112/83 (91) | 118/88 (97) | 120/89 (98) | 120/89 (98) |

SpO₂ is 99 and EtCO₂ 32–34 throughout.

| | 1:30 (C / W) | 2:03 (C / W) |
|---|---|---|
| Systolic > 110 after epinephrine | 5.3 s | 10.1 / 9.9 s |
| HR peak after epinephrine | 144–145 | **171** |
| Lowest systolic before epinephrine | 104 | 95 |
| Limit alarms | `**ABPd 94>90` at 05:21 only | **`HR TOO HIGH` at 03:10** only |
| Debrief | – / ✓ (1 min 30–31 s) / ✓; timeline 13 rows, 6 minute rows | – / **✗** (2 min 03–04 s) / ✓; 14 rows |

## 3. (c) Plain induction rescued at "SpO₂ below 90 %", and the premed induction

**Plain induction** (×8 to 3:00, then ×4; Induce 03:06–03:10; one 5-min span at 04:34 → 09:34, 10.4 / 10.6 s):

| | C | W |
|---|---|---|
| `CO2 APNEA` after Induce | 52.3 s (04:00) | 53.9 s (04:00) |
| SpO₂ in the gap | 99 at 9:47, 99 at 10:04, 98 at 10:34, 97 / 96 at 11:04, 94 at the state change | same |
| State "Airway not secured: SpO₂ below 90 %" | 11:26 (8.3 min after induction); the monitor still reads SpO₂ 94 | 11:24 |
| Bag-mask pressed | 8 s after the state | 8 s after |
| SpO₂ after the bag-mask (s from the press: SpO₂ / EtCO₂) | 5: 91/64 · 10: 90/65 · 15: 89/65 · **20: 87/61 (nadir, 19 s)** · 25: 90/59 · 30: 95/57 · 35: 98/56 · 40: 99/55 | nadir 87 at 19 s; 90 at 25 s; 95–96 at 30 s; 99 at 40 s |
| Intubate (≈ 40 s after the bag-mask) | 12:15; EtCO₂ > 25 3.2 s later | 12:12; 3.3 s |
| EtCO₂ after the tube | 55 → 53 (1 min) → 49 (15:00) | 55 → 48 |
| Limit alarms | `RR TOO LOW` 03:52, `ETCO2 TOO LOW` 03:54, `CO2 APNEA` 04:00; after the bag-mask `RR TOO LOW` + `AWRR TOO LOW` 11:40, `ETCO2 TOO HIGH` 11:41, `%SPO2 LOW` 11:48 | similar (`%SPO2 LOW` 11:45, `RR TOO LOW` 12:19) |
| Debrief | – / ✗ intubate within 90 s (7 min 32 s) / ✓ tube EtCO₂ (1 s) / ✓ ventilate within 60 s of SpO₂ < 90 (9 s) / – bradycardia not reached | same |

**Premed induction** (×4, all alarms on, Induce at 3:00, intubate at `CO2 APNEA`, ephedrine at MAP < 60):

| | C | W |
|---|---|---|
| Premedication (automatic) | 00:10 | 00:10 |
| **RR limit alarm** (with limits ON) | **`RR TOO LOW` at 01:40** (89 s after the premedication); raised again at 01:53 and 02:05 after the Acknowledge at 01:52 | same |
| Induce | 03:04 | 03:03 |
| `CO2 APNEA` after Induce | **38.8 s** (03:42) | **56.8 s** (04:00) |
| Intubated after the alarm | 9 s | 9 s |
| MAP < 60 | 04:00 (56 s after induction) | 04:16 (73 s) |
| Ephedrine after MAP < 60 | 8 s (04:08) | 8 s (04:24) |
| MAP back to 65 after ephedrine | 112 s | 108 s |
| MAP nadir | 52 | 52 |
| 8:00 | ART 102/60 (72), HR 61, EtCO₂ 38 | 102/60 (72), HR 61, EtCO₂ 39 |
| Other limit alarms | `AWRR TOO LOW` 03:10, `ETCO2 TOO HIGH` 03:29/03:34, `RR TOO LOW` + `AWRR TOO LOW` 03:57, `ART DIA/MEAN TOO LOW` 04:01, `ART SYS TOO LOW` 04:06 | same pattern, 15–20 s later |
| Debrief | – (acknowledge: no rule) / ✓ 9 s / ✓ 8–9 s / ✓ 1 min 52 s / 1 min 47 s | same |

The apnoea time differed by 18 s between the engines in this run (Stage 11 gave 36 / 47 s). The verdicts did not.

## 4. (d) Class IV haemorrhage

×8 from Load. At 1:00 Pause → Explore → **Set the baseline now** → back → Resume. At 8:00 Pause → Explore → **Changed
only** → back → Resume at ×4. ×1 at 10:00. CPR 2 s after `SPO2 NO PULSE`. A 2-min span at once (10:43 → 12:43, 10.0 /
10.1 s, speed ×1 after it). Then ×4; stop CPR 2 s after systolic > 90.

| | C | W |
|---|---|---|
| Monitor at 2:00 / 4:00 / 6:00 / 8:00 | HR 81, 114/83 (93), EtCO₂ 34 · HR 95, 108/82 (90), 33 · HR 121, 98/80 (86), 30 · **HR 139, 74/60 (65), EtCO₂ 25** | same ± 1 |
| "Class transitions" as read on the monitor (ATLS HR bands) | HR > 100 **04:30** · > 120 **06:05** · > 140 **08:00** · systolic < 90 **06:56** | same |
| Limit alarms before the arrest | `ART SYS TOO LOW` 07:46 · `SPO2 LOW PERFUSION` 08:21 · `ART MEAN TOO LOW` 08:35 · `HR TOO HIGH` 08:49 · `ART DIA TOO LOW` 09:01 · `ETCO2 TOO LOW` 09:51 | same |
| `IBP1 STATIC PRESSURE` | 10:05 | 10:05 |
| **Debrief pulse loss** | **10:29** | **10:29** |
| `SPO2 NO PULSE` → CPR | 10:40 → 10:42 | same |
| **Return of circulation** (Debrief) | **13:38**, 3 min 09 s after the loss; 55 s AFTER the span ended | 13:39 (3 min 10 s) |
| Systolic > 90 | 13:40 (178 s into CPR) | 13:41 (179 s) |
| At "Pulse back: stop CPR" | 13:51: ART **203/106 (144)**, HR 100 (the overshoot) | 13:53: arterial line blank for a moment (`IBP1 STATIC PRESSURE` 13:49), mean 85 |
| 1 min after | ART 135/90 (105), HR 74, EtCO₂ 34 | 135/90 (105), HR 75, EtCO₂ 35 |
| Debrief | – / **✓ CPR 13 s after the loss** / **✓ ROSC 3 min 09 s** (6 min asked); 42 / 43 timeline rows, 15 minute rows; lowest ART M 3 at 10:42; lactate max 2.8 | same |

**Explore at 8:00, "Changed only"** (baseline 01:04; C; W within 1 unit):
- **At the bedside:** HR 139 (+63), ART 74/60/65 (−42/−22/−29), EtCO₂ 25 (−10), RR 14 (+2), PR 139, PI 0.3 (−1.0),
  awRR 14.
- **Heart and circulation:** CO 2.51 L/min (−2.66), SV 18 mL (−53), LVEF 39 % (−20), **SVR 1951 (+659)**, LVEDV 47
  (−74), LVESV 29, LVEDP 1.1 (−6.0), LVSP 73, RVSV 18, Pmsf 5.1 (−7.0), CoPP 62, myocardial O₂ supply/demand 1.43,
  SVR (model) 1.463 (+0.495), sympathetic tone 34.7 (+32.6), vagal tone 37.5 (+34.2), Cv 108, Vu 1708 (−553), skin
  vasomotor tone 1.71.
- **Blood, acid–base:** O₂ debt 153 mL, DO₂ 528 (−554), O₂ER 48 %, SvO₂ 54 % (−25), lactate 1.73, Hb 14.7, pH 7.38,
  among 13 rows.
- The run sheet's "known miss" sentence needs a check: on this build the SVR **rises** (+659) as the patient bleeds.

**Early CPR probe** (CPR pressed at `IBP1 STATIC PRESSURE`, 10:07, BEFORE `SPO2 NO PULSE`; then ×8):
- **No VF**, no `SPO2 NO PULSE`, and systolic > 90 48 s after the press (best 96 / 94).
- The Debrief marks both CPR objectives "not assessable: The pulse loss did not happen".
- On the showcase-1 build the same press led to VF and no return of circulation. **On this build it does not.**

## 5. (e) Tamponade

×8 from Load, ×1 at 7:00, CPR 2 s after `SPO2 NO PULSE`, a 2-min span at once (10.4 / 10.1 s, ×1 after it), drainage
as the panel clears, ×4 then ×1. Stop CPR 2 s after the return of circulation (the model's, the Debrief's "rosc").

| | C | W |
|---|---|---|
| **Which tile shows the CVP** | **IBP2** (limits −5–15), 17 at 1:00. No tile or lane is labelled "CVP"; the alarm text says it: **`CVP MEAN TOO HIGH` at 00:22** | same |
| Monitor at 1:00 / 3:00 / 6:00 / 7:00 | HR 97, 105/85 (91), EtCO₂ 32 · HR 111, 99/83 (88), 29 · HR 134, 79/68 (72), 24 · HR 147, 62/54 (57), 21 | same |
| Limit alarms before the arrest | `SPO2 LOW PERFUSION` 05:59 · `ART SYS TOO LOW` 06:06 · `ART MEAN TOO LOW` 07:03 · `HR TOO HIGH` 07:10 · `ART DIA TOO LOW` 07:17 · `ETCO2 TOO LOW` 07:21 · `IBP1 STATIC PRESSURE` 07:31 · `HR TOO LOW` 07:45 | same |
| State PEA / Debrief pulse loss / `SPO2 NO PULSE` | 07:49 / **07:48** / **07:58** | same |
| CPR | 08:00: **12 s after the loss** (10 asked) ✗ | same |
| Drainage | 10:04: 2 min 04 s after CPR ✗ | same |
| Return of circulation | **11:40** (96 s after drainage) | 11:39 (95 s) |
| Stop CPR | 11:42, 2 s after ✓ | 11:41 ✓ |
| 30 s after stopping | ART 118/79 (92), HR 64, EtCO₂ 28 | same |
| 15:00 | ART 118/75 (89), HR 60, EtCO₂ 40; `**CVP 11>10` at 15:37 | same |
| **Debrief facts** | lowest SpO₂ 95 % at 00:28 · lowest ART M **19 at 07:58** · highest EtCO₂ 40 at 13:12 · pulseless **3 min 52 s**, first lost 07:48 · ROSC 3 min 52 s after the loss (11:40) · lactate 2.2 (max 2.4), pH min 7.26 | 3 min 51 s (11:39); EtCO₂ 40 at 13:08 |
| **Debrief rows** | **44 timeline rows**, 16 minute rows | 44 / 16 |
| **Verdicts** | – / ✗ CPR 12 s / ✗ drainage 2 min 04 s / ✓ stop 2 s / **✗ "Better: drainage before the pulse loss"** ("The pulse loss at 07:48") | same |

**A presenter trap, measured** (Chromium probe `tamponade-probe-stop-on-systolic-60-chromium.*`):
- 75 s after the drainage, CPR alone reads **69/32** on the arterial line (EtCO₂ 18). That is before the return of
  circulation.
- The probe stopped CPR on that reading at 11:23. The patient re-arrested: `SPO2 NO PULSE` 11:34, `ECG ASYSTOLE` 13:44.
- The Debrief then says "The return of circulation did not happen" (pulseless 7 min 17 s).
- The real return gives about 104/58 within 2 s of the "rosc" event (W row 11:42). Wait for it; do not stop CPR on the
  first systolic above 60.

## 6. (f) Bronchospasm with the Ventilator view: H5 numbers and H21

The case is loaded at ×4, then the top bar's **Ventilator** opens the view. Salbutamol is given from the Instructor at
02:08 (C/W), then back to the Ventilator view. A 2-min span at 04:03 runs from the Ventilator view, through the link,
then ×8. A second 2-min span runs at 06:16, at ×8.

| | Before (01:27) | 06:16 (4 min 08 s after salbutamol; after span 1) | 08:44 (6 min 36 s; after span 2) |
|---|---|---|---|
| VTE (cockpit) | **300 mL** | **501** | **501** |
| Ppeak | 35 | 34 | 32 |
| Expiratory minute volume | 4.2 L/min | 7.0 | 7.0 |
| "High pressure" (Pmax) banner | **yes** | no | no |
| Monitor EtCO₂ | 32 | 33–34 | 34 |

These are identical on C and W. The F11B H5 row (311 → 498 → 501) still holds within 11 mL. The only limit alarm is
`%SPO2 LOW` at 00:28 (lowest SpO₂ 87 % at 00:30). The Debrief reads – / ✓ salbutamol at 02:08 / –, with 16 timeline rows.

**H21 as a script** (FX-1 frame port on this build). At 08:44, ×4: the instructor leaves the Ventilator view for the
**Monitor view for 30 s** (120 s of sim), then comes back.

| | C | W |
|---|---|---|
| The phones keep "The ventilator is on the main screen" | **yes, every 2-s sample, all 3 phones**, status `synced` | yes, all samples |
| EtCO₂ before → during the 30 s | 34–35 → **33–34** (480 samples) | 34 → 33–34 |
| **The cockpit keeps driving the patient** (its `cmds` frames through the frame port, `__pmeVentRx` tap) | **yes: 6 020 frames, ticks 26 219–32 238, contiguous** (120.3 s of sim = 6 015 ticks) | yes: 6 017, contiguous |
| Back on the Ventilator view | VTE 501, Ppeak 31, MV 7.0 | same |

H21 passes in both engines here. Real Safari on the presenting Mac is still the owner's check (Playwright's WebKit is not
Safari).

## 7. (g) Session mechanics

| | C | W |
|---|---|---|
| **Loading a case turns the limit alarms OFF** | **yes, in every case**: "All alarms on" before Load → "Limit alarms off" after Load. The script pressed it again at once (00:07–00:13) | same |
| Speed after a fast-forward ends | **unchanged** in every span (11 per engine on 56f3761f, 3 more on 62e521c3) (×1 → ×1, ×4 → ×4, ×8 → ×8; measured rate 1.0 / 4.0 / 8.0 in the 3 s after) | same |
| Fast-forward wall time | 10.0–10.6 s (2 min and 5 min alike) | 10.1–10.6 s |
| Page reload (Cmd-R equivalent) | **All alarms on: lost** ("Limit alarms off") · **Sound on: lost** ("Sound off") · **session code: kept** · the case: gone (no scenario loaded) · phones: still `synced` 15 s later, following the reloaded page | same |
| Pause on the Saadat-style skin | **Pause alarms** is disabled: "This monitor has no alarm pause. Silence mutes for 120 s." | same |
| What Silence shows (anaphylaxis, `HR TOO HIGH` active at 03:38) | panel "Sound silenced, 01:57 left"; the monitor's alarm bar text goes blank; toast "Alarm sound silenced". **It ended 5.3 s later** (C) / 4.2 s (W), when `ART SYS TOO LOW` was raised. The alarm text was back, the panel said "Alarm sound on", and the sound was on again | same; WebKit's panel still read "silenced" at the end, catching up on the next repaint |
| On-screen version label | **none** on Start, Instructor, Monitor or Settings; only the Debrief footer: "Build 56f3761f 2026-10-13." (the 62e521c3 kit's bundle carries "62e521c3 2026-10-13") | same |
| Sound on | "Sound off" → "Sound on" by a click in each case; audio itself not heard (headless) | same |

## 8. (h) Phones (S12-F2)

Three emulated phones followed every case: 25 runs plus the 4 re-checks.

**Comparison rule.** The probe compared the instructor's and each phone's tile numbers every 500 ms. A difference counts
when it is more than 1 unit, or a number against a blank, and it is timed while it lasts. Excluded: samples during
and 5 s after a fast-forward, while a phone holds, and while the instructor is not on the Instructor or Monitor view.

**Results.**
- **No gross or stale reading** of the S12-F2 kind (HR 174 against 58): none on any phone, in any case, before or
  after the style change.
- **A new difference after the style change (MH early, all three runs, both engines).** On the Philips-style monitor
  the instructor's **AGENTS tile read "0.0"** (sevoflurane stopped) while **every phone read "---"**, for the whole
  30 s watched. The late MH path did not show it. This is a real content difference after a style change: it is
  harmless here, but it is the S12-F2 family. A fixer candidate if the owner keeps a style change in the talk.
- **Small differences during fast change.** 2–4 units, lasting 1.5–3.0 s, while values changed fast: HR 167/169 at
  ROSC, IBP1 93/71 against 95/70 after epinephrine, IBP1 114/91 against 118/94. They are the follower's own sampling of
  a moving number, not stale numbers.
- **The "?" signal-quality mark** ("99?") changed up to 2 s apart on phone and instructor. It was counted apart and is
  not a numeric difference.
- **Resyncs per phone per case:** 1–7, one per Load, fast-forward, Ventilator view and style change. Status `synced` in
  every sample, apart from one `waiting` sample (Chromium bronchospasm).

## 9. Findings for the orchestrator

1. **KR-A1** (fixed by #64 after this round found it): every kit up to 56f3761f had a classroom relay that died at the
   first WebSocket frame. The fixed kits pass `check-relay.mjs` **2 of 2** (§11).
2. **Load resets the limit alarms to "off"** in every case: the run sheet must say **All alarms on after every Load**,
   not once in pre-flight. A reload also drops it, and drops Sound.
3. **MH early path:** the run sheet's 40-mmHg check (before spans 2 and 3) misses the ventilation objective. EtCO₂ is
   below 40 within 26 s of the call. Bringing the ventilation back at "Recovering" (≈ 1.6 min after the call) meets it,
   but EtCO₂ rebounds to 61 and alarms.
4. **Tamponade CPR within 10 s** cannot be met by pressing at `SPO2 NO PULSE`: the alarm comes 10 s after the pulse
   loss. The sheet's path gives three ✗.
5. **Stopping CPR in the tamponade on a systolic of 60–70 re-arrests the patient**: compressions alone read 69/32.
6. **Early CPR in haemorrhage no longer causes VF** on this build.
7. **The SVR rises** in the haemorrhage Explore view (+659 at 8:00): the run sheet's "SVR falls instead of rising"
   remark needs checking against this build.
8. **The AGENTS tile differs on phones after a style change to Philips-style** (§8).
9. **Silence on the Saadat-style skin lasts seconds**, not 120 s, in a deteriorating case: any new alarm ends it.

## 10. Not measured, and why

- **Sound by ear:** headless browsers; only the button state ("Sound on") was checked.
- **Real Safari, real phones, the hotspot's capacity:** Playwright's WebKit and emulated phones on one Mac, over
  127.0.0.1. These remain the owner's checks H17, H18, H20 and H21 on real devices.
- **The fast-forward look** (blur, H18): not re-checked.
- **A human's reaction time:** modelled as a fixed 2 s of wall time after each cue. Real presses vary; the tamponade CPR
  gap is 10 s of alarm delay plus the reaction.
- **The run sheet's "≈ 3 min after salbutamol" row:** the 2-min span from 04:03 already ends 3 min 55 s after the
  salbutamol, so the first VTE reading is at 4 min 08 s.
- **The Debrief print/PDF:** not printed in this round; the Stage 13 page counts stand.

## 11. Kits

Owner's folders, replaced on 2026-10-13 with the build from **main 62e521c3** (the older copies, b8c9c04a and
56f3761f, went to `_to_delete/kit-round-a2-2026-10-13/`; 51a37063 and cb4fb17e went to
`_to_delete/kit-round-a-2026-10-12/` on 2026-10-12):

| Folder | Kit | `check-relay.mjs` |
|---|---|---|
| `_sandbox/pme-kit-main-62e521c3/` (+ README.txt) | pme-showcase-kit-62e521c3 | **PASS, 2 of 2 runs** (relay alone; through Start Classroom), node v26.8.2 |
| `_sandbox/pme-classroom-dryrun/kit/` (PRE-FLIGHT.md updated; KR-A1 warning removed) | 62e521c3 | **PASS, 2 of 2** |
| `_sandbox/pme-debrief-dryrun/pme-showcase-kit-62e521c3/` (HOW-TO-CHECK-THE-PRINT.txt updated) | 62e521c3 | **PASS, 2 of 2** |

---

## A3 — the run sheet's tamponade path and two checks

*Measured 2026-10-17 on kit `pme-showcase-kit-ca0d2dbb`, built from main ca0d2dbb (the final run sheet and cue cards,
PR #65). Its relay smoke test `check-relay.mjs` passed 2 of 2. The kit was served as built by Start Classroom, with
three emulated phones following. Chromium, then WebKit, one test at a time. The script is
`scripts/showcase/kit-round-a.kitround.ts`, tests "A3 …" (`-g A3`).*

**Load.** The release executor was running on the same Mac. The load average was **4.8–18.1** during these runs, much
higher than in §0–§8: tamponade 4.8–15.1 (C) / 7.8–11.6 (W); Return here 14.2–17.3 / 10.6–18.1; bronchospasm
10.8–17.3 / 6.5–10.6. No press was lost and every state was taken on the first press, but the timings carry that load.

**Raw files** (`docs/showcase/kit-round-a/`):
- `a3-tamponade-cue-card-path-kit-round-{chromium,webkit}.{json,md}`
- `a3-tamponade-debrief-chromium.pdf`, `a3-tamponade-debrief-print-{chromium,webkit}.png`
- `a3-return-here-and-all-alarms-on-kit-round-*`
- `a3-bronchospasm-instructor-view-fast-forward-cockpit-hidden-kit-round-*`

### A3.1 Tamponade on the cue-card path (card 6)

The path, as card 6 sets it:
- Load · All alarms on · Bookmark · ×8, then ×1 at 7:00.
- **Start CPR from the PEA state**, 2 s of wall time after "PEA" shows.
- ×4, then ×1 at 9:00.
- **Pericardiocentesis 1 min 30 s into CPR**, then ×4, and ×1 one minute after the drainage.
- **No fast-forward.**
- **Stop CPR on the model's return of circulation**, plus 2 s.
- Crystalloid 500 mL 30 s later, then the Debrief: read, "Run by" and Notes filled, printed.

| | Chromium | WebKit |
|---|---|---|
| State PEA / pulse loss (Debrief) | 07:49 / 07:48 | 07:49 / 07:48 |
| Start CPR | **07:51**: 2 s after "PEA" | 07:51 |
| Pericardiocentesis | **09:21**: 1 min 30 s into CPR | 09:21 |
| Return of circulation (Debrief) | **10:55**: **93.7 s after the drainage** | 10:55, 93.8 s |
| Arterial line before the return | 71/33 (46) at 10:22, 1 min after the drainage, compressions only; 69/32 (45) at 10:55, the moment of return | 70/33 (46) at 10:22; 70/33 (46) at 10:55 |
| Stop CPR | 10:57, 2 s after the return; the line then read **114/51 (76)** | 10:57; **97/49 (68)** |
| 30 s after stopping | 115/77 (90), HR 64, EtCO₂ 28 | same ± 1 |

**Alarms**, the same in both engines:
- `CVP MEAN TOO HIGH` 00:22
- `SPO2 LOW PERFUSION` 05:59
- `ART SYS TOO LOW` 06:06
- `ART MEAN TOO LOW` 07:03
- `HR TOO HIGH` 07:10
- `ART DIA TOO LOW` 07:17
- `ETCO2 TOO LOW` 07:21
- `IBP1 STATIC PRESSURE` 07:31
- `HR TOO LOW` 07:45
- `ART SYS TOO LOW` + `ART DIA TOO LOW` 07:57
- `ART MEAN TOO HIGH` 11:03, `ART DIA TOO HIGH` 11:04

**No `SPO2 NO PULSE`** on this path: CPR started before it would sound.

**Debrief**, identical in both engines:
- – Name the tamponade (no rule)
- **✓ CPR within 10 s** — "CPR 3 s after the pulse loss (07:48 → 07:51)"
- **✓ Pericardiocentesis within 120 s of CPR** — "1 min 30 s after CPR (07:51 → 09:21)"
- **✓ Stop CPR within 30 s** — "2 s after the return of circulation (10:55 → 10:57)"
- **✗ Better: pericardiocentesis before the pulse loss** — "The pulse loss at 07:48"

**Facts:**
- lowest SpO₂ 95 % at 00:28
- lowest ART M / NIBP M **20 mmHg at 07:51**
- highest EtCO₂ 36 mmHg at 00:09
- highest T1 / T2 36.8 °C
- **pulseless 3 min 07 s in all; first lost at 07:48**
- return of circulation 3 min 07 s after the pulse loss (10:55)
- labs: K⁺ 4.2 · lactate 2.2 (1.0–2.2) · pH 7.28 (7.28–7.41) · glucose 5.8 · Tcore 36.8

**Rows:** **41 timeline rows**, 12 minute rows.

**Printed (Chromium `page.pdf`):** **6 A4 pages**, A4 on every page, title "Debrief Stab wound: tamponade, PEA and
pericardiocentesis 2026-10-17". The Stage 13 path gave 5 pages. Playwright cannot print to PDF in WebKit, so for WebKit
there is only the print-media screenshot.

**Phones:** all synced; 2 resyncs each. During CPR at ×4 the phones' HR differed from the instructor's for up to 3 s
(97 against 83, then 112 against 117) while HR swung from about 50 to 110. That is a fast-moving value, not a stale one.

### A3.2 Does "Return here" keep "All alarms on"?

Anaphylaxis card at ×4:
- **Bookmark 1** right after Load (limits are off after every Load).
- Then **All alarms on**.
- Then **Bookmark 2**.
- Run to 2:32, then Return to Bookmark 2, then Return to Bookmark 1.

| | Chromium | WebKit |
|---|---|---|
| Running at 2:32–2:33 | limits on ("No alarms") | same |
| **Return to Bookmark 2** (taken after All alarms on) | **limits stay ON** ("No alarms"), and still on 40 s later | same |
| **Return to Bookmark 1** (taken before All alarms on) | **"Limit alarms off"**: the setting goes back with the bookmark | same |

The alarm setting is part of the bookmark. **Return here keeps "All alarms on" only if the bookmark was taken after
pressing it.** The cards' order (Load · All alarms on · Bookmark) is right.

### A3.3 Bronchospasm: ×8 and a 2-min fast-forward from the Instructor view with the cockpit hidden

The case is loaded at ×4, the Ventilator view opened, and the cockpit's frames are tapped (`__pmeVentRx`). At 1:30 the
presenter goes to the Instructor view, which hides the cockpit's frame, and presses **×8**. At 2:20 they press
**Fast-forward 2 min** in the session bar, wait 5 s, then return to the Ventilator view. No salbutamol is given in this
check.

| | Chromium | WebKit |
|---|---|---|
| Cockpit while hidden (×8 + the span, 228.8 / 227.8 s of sim) | **11 690 frames, ticks 4 267–15 956, contiguous** | **11 681, contiguous** |
| Cockpit in the 5 s after returning | 2 047 frames, contiguous | 2 020, contiguous |
| EtCO₂ before → while hidden | 32–33 → **32–36** | 32 → 32–36 |
| VTE before → after | 300 → 300 mL | 300 → 299 |
| Fast-forward | 10.5 s of wall; banner "Fast-forwarded 2 min, 02:20 → 04:20. During it: no alarms."; speed ×8 after | 10.4 s; same |
| Phones | **hold ("The ventilator is on the main screen") and `synced`** at ×8, after the span, and after the return; 4–5 resyncs | same |

**The cockpit keeps driving the patient** through ×8 and a fast-forward pressed from the Instructor view while it is
hidden, and the phones keep their hold. EtCO₂ drifts up by up to 3 mmHg at ×8. VTE is unchanged; this is the
untreated spasm.

### A3 against the cue cards and the run sheet

| Item | What the cards or sheet say | What A3 measured |
|---|---|---|
| Card 6, ≈ 10:55 cue: "pressure climbs **above** 69/32" | The return comes at 10:55 as written | The compressions alone already read **70–71/33** one minute after the drainage, and the line still read **69–70/32–33** at the moment of return. Only 3 s later did it show **97–114 / 49–51**. Suggested cue: "systolic jumps to about 100". |
| Run sheet §4, line 552 | "5 A4 pages … the page count on this path is not measured" | **6 A4 pages** (41 rows) |
| Run sheet §6, line 590, and "Facts" item 7 | "whether Return here keeps the alarm setting was not measured" | It keeps the setting the bookmark was taken with (A3.2) |
| Card 6, "✓ times are worked out, not measured" | | Now measured: CPR 3 s, drainage 1 min 30 s, stop 2 s, and only "Better" ✗ |

Everything else on card 6 matched as written:
- the PEA state at 07:49;
- "30 s later ART about 117/79, HR 64" (measured 115/77, HR 64);
- the Debrief line "The pulse loss at 07:48";
- "CVP on the IBP2 tile: 17".

---

## E22. MH: "ventilation back" only after 2 min of EtCO₂ below 40 (owner ruling 2026-10-17)

*Measured 2026-10-17/18 on kit `pme-showcase-kit-b08a972b` (branch `fix-e22-mh-rule`: the new rule and card text),
served by its own Start Classroom launcher, Chromium and WebKit, 3 phones, a 2 s reaction, load average 2.2–6.9 (the
WebKit probe ran at up to 12.9). Script: `scripts/showcase/kit-round-a.kitround.ts`, tests "MH E22 …". Raw files:
`kit-round-a/malignant-hyperthermia-e22-<variant>-kit-round-<browser>.{json,md}`.*

**The rule.** Before: `eventWithin` from `state:triggerOff`, after `value:etco2<40`, → `state:normoventilated` within
300 s ("Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHg"). That rewarded the press
at "Recovering" (08:43). After: `heldThen` from `state:triggerOff`, `etco2` below 40 for 120 s, → `state:normoventilated`
("Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)").
The FIRST press is judged: before the 2 min it is ✗ (a second press does not mend it). No press is ✗.

**When the 2 min complete.** The early call path as the cue card runs it: Early signs 06:52, call 07:00–07:01,
dantrolene 07:21–07:22, Cool 07:31–07:32, hyperventilation 20 × 600 kept. EtCO₂ first below 40 at **07:26–07:27**, and it
stays at 36–40 under hyperventilation. So the 2 min complete at **09:26–09:27** (2.4 min after the call), on both
browsers and in every variant. With hyperventilation kept, EtCO₂ never rebounds: 37–38 at 8:45, at 12:55 and at 14:00.

| Ordering (C / W) | Span 1 | Press "ventilation back" | EtCO₂ at press | EtCO₂ after the press (per minute from the press) | Peak after the press | ETCO2 TOO HIGH | Repeat dantrolene cue (> 55 after a span) | Debrief |
|---|---|---|---|---|---|---|---|---|
| **(A) span 1 at 07:41, press as it ends** | 07:41 → 12:41 | **13:03 / 13:04** | 38 | 38 · 49 · 51 · 53 · 54 · 49 · 44 · 44 · 43 · 43 · 43 | **55** at 17:22 / 17:32 (+4.3 / 4.5 min, inside span 2) | 14:13 (inside span 2) | **no**: 45 after span 2 (18:20), 42 at the end (23:34) | ✓ ✓ – – ✓ |
| (B) hold span 1 until the 2 min, press, then the spans | 09:39 → 14:39 (after the press) | **09:35 / 09:36** | 37 | 37 · 49 · 51 · 53–54 · 55 · 57 · 59 · 59 · 60 · 45–46 · 45 · 44 … 41 | **60** at 16:45 / 17:19 (+7.1 / 7.7 min) | 10:51 / 10:55 (inside span 1) | **yes**: 57–58 after span 1 → dantrolene 14:53; "Recovering" again 20:04 / 20:05; 41 at the end (25:23) | ✓ ✓ – – ✓ |
| (old card's timing) span 1 at 8:45, press as it ends | 08:45 → 13:45 | 14:08 / 14:08 | 38 | 38 · 49 · 51 · 52 · 46 · 43 · 43 … 42 | 53 at 17:27 / 17:17 | 15:23 / 15:13 | no: 43 after span 2 | ✓ ✓ – – ✓ |

Debrief on every path: ✓ call (8–9 s after the early signs) · ✓ dantrolene (21 s) · – repeat (instructor) · – potassium
(K⁺ never above 5.5: max 4.7–4.8) · ✓ ventilation, reading *"The state "Ventilation back to 12 × 500, O₂ 100 %" at
13:03, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)."* (A, Chromium). The old press at
"Recovering" (08:43) would now read ✗ *"… when EtCO₂ had been below 40 mmHg for 1 min 16 s (2 min 00 s asked)"*
(the engine-run Debrief test in `debrief-showcase.test.ts` pins both).

**EtCO₂ after the press does NOT stay under 45 on any ordering.** It crosses 45 about 20 s after every press (+0.3
min) and peaks at 53–60. The 2-min hold satisfies the rule, but the model's CO₂ production is still raised. The later
the press, the smaller the rebound: 60 at 09:35, 55 at 13:03, 53 at 14:08. On the kit-round early path the press came at
18:13, and EtCO₂ was 41–42 five minutes later (§1). This is the model, not the rule: no physiology was changed. Whether the
owner wants a longer hold (for example "below 40 for 5 min"), or a rebound line for the presenter, is the owner's call.

**Card facts (confirmed).** "EtCO₂ normal: ventilation back to 12 × 500" is a transition of the **Recovering** state
only (`showcase-mh.json`). On the kit it was not offered in Early signs, Trigger off or MH treatment under way. It was
offered in Recovering just before every press. A dantrolene press in Recovering (probe, 08:45) takes the card through
"Dantrolene given" (2 s) to "MH treatment under way". The button came back **63 s / 64.5 s** later (Recovering
09:47 / 09:48), once EtCO₂ had been below 45 for a minute again. Under hyperventilation that is about a minute. Cool,
potassium and bicarbonate take the same route. When EtCO₂ is above 45 the gap is longer: in (B), dantrolene went in at
14:53 and Recovering came back at 20:04. One probe artefact: the check made within 250 ms of entering Recovering read
"not offered", because the panel had not repainted yet. The press-time checks, ≥ 10 s into Recovering, read "offered".

**Recommendation for the cue card: ordering (A).**

1. Call at Early signs, then dantrolene and Cool, as now.
2. Start **span 1 at 07:41** (≈ 40 s after the call), as the early path already does. The 2 min complete inside it
   (09:26–09:27), and the page takes no presses during a span.
3. Press **"EtCO₂ normal: ventilation back to 12 × 500" at once when span 1 ends**. Measured press: **13:03**
   (Chromium) / **13:04** (WebKit). Any press from 12:41, the span's end, is ✓.
4. Then span 2. EtCO₂ reads 45 after it (peak 55 inside it, with ETCO2 TOO HIGH at 14:13 in the span's banner). No
   repeat-dantrolene cue: nothing above 55 is shown at a span's end.
5. Then span 3. EtCO₂ is 42 at the end (23:34).

(B) costs about 30 s more of wall time at ×4 before span 1. It also gives a larger rebound: a peak of 60, and 57–58
showing after span 1. And it needs the repeat dantrolene at 14:53. (A) keeps the card's spans and
puts the rebound inside span 2. The margin to the "above 55" cue is nil: the peak is exactly 55, and it falls inside the
span, so the presenter never sees it.

**Not measured:** a human presenter's actual delay after span 1 (modelled as 2 s of wall time, plus the script's 3 s
check, so 12:41 → 13:03). Real Safari and real phones. A press between 09:27 and 12:41, which the spans of (A) make
impossible.

---

## Q1 — rehearsal on the release build

*Measured 2026-10-18 on kit `pme-showcase-kit-3db25a3b`, built by `make-bundle.mjs` from a clean checkout of main
3db25a3b (PR #66 merge, Stage 8b, v1.0.0-rc.1). Served as built by its own Start Classroom launcher; three emulated
phones (Pixel 7 on Chromium, iPhone 13 on WebKit) joined once at the QR moment and followed the whole talk. Chromium,
then WebKit, one run at a time; load average 2.2–6.0. Script: `scripts/showcase/kit-round-a.kitround.ts`, tests "Q1 …"
(`KITROUND_OUTDIR=docs/showcase/kit-round-a/q1 … -g Q1`). Raw files: `docs/showcase/kit-round-a/q1/`.*

**The kit.** `check-relay.mjs`: **PASS, 2 of 2 runs** (relay alone; through Start Classroom), node v26.11.1
(`q1/relay-3db25a3b.json`). The Start view and Settings → About both read **"Version 1.0.0-rc.1 (pre-release). For
education only. Not a medical device and not clinically validated: never use it for patient care."** The Debrief footer
reads "… Version 1.0.0-rc.1 (pre-release), build 3db25a3b 2026-10-18." The engine's snapshot key in the kit is
`1.0.0-rc.1+dev`: the demo's Vite build does not set `PME_BUILD`, so the build half is "dev" (the 62e521c3 kit's engine
was 0.0.0, so its bookmarks and snapshots do not restore here either way).

**How it ran.** One page for the whole talk, the cue cards' presses at their clock times, 2 s of wall as the
presenter's reaction, "Load · All alarms on · speed · Bookmark" in that order, All alarms on pressed after EVERY Load.
Opening → card 1 → H21 → reload, Sound on → card 2 → card 3 (Debrief read, Run by and Notes filled, printed) → card 4
→ the close (S12-F2, FX-12). No talk: 9 min 38–39 s of wall from the opening to the end of the close.

| Case (C / W) | Wall from Load | Debrief verdicts | Alarms | Phones | Against the cue card |
|---|---|---|---|---|---|
| 0 Opening + QR | — | — | — | the sheet: `http://192.168.1.100:8760/?join=…`, "0 phones following" → **"3 phones following"** 2.5 / 2.9 s after the joins began | as written |
| 1 Bronchospasm, Ventilator view | ×1 pressed at W 1:36 (09:32); reload at W 2:18 (after H21 and a Debrief read) | – recognise · **✓ salbutamol at 02:06 / 02:07** · – watch; 17 rows | **RR TOO LOW 00:12 (C) / RR TOO HIGH 00:09 (W)**, `%SPO2 LOW` 00:35, lowest SpO₂ 86 % at 00:37–00:39 | held ("The ventilator is on the main screen") and `synced` throughout; 6 resyncs; after the reload still `synced` (15 s later) | VTE 300 → 501 → 501, Ppeak 35 → 33 → 32, MV 4.2 → 7.0 → 7.0, Pmax banner gone after span 1: as the card. ×8 stayed ×8 after span 2. **New: the RR alarm at 00:09–00:12** (the Ventilator view opened at 00:25, ×4 now pressed after All alarms on). The ×1 press at 09:32 instead of ≈ 8:45 is the script's 3-s rate check after each span at ×8, not the app |
| 2 Tamponade, A3 path | crystalloid at W 3:42 / 3:43 (sheet 3:35) | – name it ("ticked it at 01:03 / 01:01") · **✓ CPR 3 s / 4 s** (07:48 → 07:51) · **✓ drainage 1 min 30 s** (09:21) · **✓ stop CPR 2 s** (10:55 → 10:57 / 10:56 → 10:58) · **✗ Better** ("The pulse loss at 07:48"); 42 / 43 timeline rows, 12 minute rows | as A3.1, plus `HR TOO HIGH` 10:07 / 10:21 during CPR; `ART DIA` + `ART MEAN TOO HIGH` 11:03–11:04; no `SPO2 NO PULSE` | `synced`; 11 resyncs; largest difference HR / IBP1 for 1.5 s while the value swung (no S12-F2) | PEA 07:49, ROSC 93.5 / 94.6 s after the drainage, the line 70/33 at the return then **108 / 136 systolic within 6 s** ("jumps to about 100": holds), 30 s after the stop 115/77, HR 64 (C) / 115/78, HR 65 (W). Facts as card 3 (pulseless 3 min 07 / 08 s, lowest mean 20 at 07:51). **Printed: 6 A4 pages** (Chromium PDF), title "Debrief Stab wound: tamponade, PEA and pericardiocentesis 2026-10-18". Rows 42–43 against the card's 41: the objective-1 tick and one HR alarm |
| 3 Debrief moment | 4.1–4.3 s for the script (open, read, fill, print) | as above | — | — | as written |
| 4 MH, early call | end (Pause at 23:37–23:38) at W 2:00 (sheet 1:49; two 3-s pauses at 12:55 and 18:20 and Choose another scenario add the difference) | **✓ call 8–9 s** (06:51–06:52 → 07:00) · **✓ dantrolene 21 s** · – repeat · – potassium (did not rise above 5.5) · **✓ ventilation back at 13:04 / 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)"**; 41 / 42 rows | span 1 none; span 2 **`ETCO2 TOO HIGH` 14:13 / 14:18**, `ART MEAN TOO HIGH` 17:00 / 16:59, `RR TOO HIGH` 18:06 / 18:05; span 3 `ART SYS TOO HIGH` 22:39 | `synced`; 17–19 resyncs | Early signs 06:52, EtCO₂ < 40 at 07:26, 36–38 while hyperventilated, 38 at the press, then 38 · 49 · 51–52 · 53 · 54 · 49 · 44 … 43 per minute, **peak 55** at 17:22 / 17:32, 44 after span 2, 42 at the end: E22 (A) to the unit. **New step: "Choose another scenario" before Load** (the tamponade is still loaded, so the library is hidden) |

Spans: every fast-forward took 10.1–10.6 s of wall and left the speed as it was (×4 → ×4, ×8 → ×8). No console or page
error in any run.

**H21** (card 1's end, at ×1: the main screen on the Monitor view for 30 s, then back to the Ventilator view):

| | Chromium | WebKit |
|---|---|---|
| Phones keep "The ventilator is on the main screen" | **yes, every 2-s sample, all three** | yes |
| EtCO₂ before → during; awRR | 34 → **34** (120 samples); awRR 14 | 34 → 34; 14 |
| The cockpit keeps driving (frame-port tap) | **1 507 frames, contiguous** (30.1 s of sim = 1 506 ticks) | **1 505, contiguous** |
| Back on the Ventilator view | VTE 501, Ppeak 31, MV 7.0 | same |

**S12-F2** (the close: one style change Saadat-style → Philips-style, phones following, MH running at ×1): the
instructor's **AGENTS tile read "0.0" and every phone "---"** before the change and for the whole 30 s after it, on
both engines (29.6 s, the probe's longest difference). Before the change the longest difference in the MH run was
2.5 s (a moving value; the probe keeps only the longest). Unchanged since §8: the owner's rule
E20 (no style change during the talk) stays.

**FX-12** ("Restart patient, then Return here", the new "something went wrong" line):

| | Talk, C | Talk, W | Probe 1, C | Probe 1, W | Probe 2, C | Probe 2, W |
|---|---|---|---|---|---|---|
| Session bar after Restart patient | **No scenario** | No scenario | No scenario | No scenario | No scenario | No scenario |
| "Return here" on screen after Restart patient | yes (3 s later) | yes | yes | **no** | **no** | **no** |
| Session bar after Return here (and 10 s later) | **No scenario** | **No scenario** | **No scenario** | — | — | — |
| Patient and clock | restored to the MH bookmark (00:04), clock running, limits back on | same | restored (00:06) | — | — | — |
| The case | not checked (the talk ends here) | not checked | **gone**: the Scenario tab shows the library, no card buttons ("Start surgery" not offered at 4:00), the Debrief reads "No scenario (free run)" with no objectives | — | — | — |

So the sequence brings the patient back but not the case, and after Restart patient the bookmark list is not on
screen half of the time (the Scenario tab repaints to the library). What the presenter should do after Restart
patient: **load the case again** (Load · All alarms on · speed · Bookmark) and run it from 0:00. Probes: `q1/q1-fx-12-probe-*`
(MH loaded, 1 min at ×8, Restart patient, Return here). Probe 1 W timed out waiting for the button and was stopped by
hand; probe 2 records the panel's state instead.

**Bookmarks across cases.** The bookmark list keeps the bookmarks of the earlier cases of the page. While MH ran it
read "Bookmark 1 at 00:06" (the tamponade's) and "Bookmark 2 at 00:04" (MH's): names carry only the clock. A first
try of the close returned to the first one and restored the TAMPONADE patient under the MH card (state "arrival",
session bar "No scenario"). The current case's bookmark is the last one in the list.

**Persian MH handout.** From `q1/debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.json` (the 13:04
path above): `q1/debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.fa.pdf`, **6 A4 pages, 96 table entries
(all unreviewed), 0 strings without translation**; `verify_pdf.py --expect-font Vazirmatn` OK, Vazirmatn Regular and
Bold only. The `heldThen` reason line prints as «وضعیت «بازگشت تهویه به 12 × 500، O₂ 100 %» در 13:04، پس از آنکه EtCO₂
به مدت 2 دقیقه و 00 ثانیه کمتر از 40 mmHg ماند (از 07:26 تا 09:26).». The template was already in the table (PR #70
wrote it against the E22 branch); its `source` notes now name main.

**Persian handouts, all three on the release build** (2026-10-18, after the round; PR #75, which also fixes finding 6).
Bronchospasm had no Debrief JSON from this build, so the talk was run again on the same kit up to the end of card 1
(`KITROUND_Q1_STOP=bronchospasm`, Chromium, 3 phones; the card's presses as above, then the Debrief with its JSON
export): `q1/debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.json`, run record
`q1/q1-1-bronchospasm-ventilator-view-h21-chromium-debrief-export.{json,md}`. Salbutamol at 02:06, the two 2-min spans
at 04:06 and 06:44, 10:15 simulated; verdicts: not assessable (recognise, no rule), **met** ("Salbutamol (IV/neb) at
02:06"), not assessable (watch the volumes recover, no rule). The tamponade input is the Debrief JSON of the first
Chromium run of this talk (`q1/debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium-run1.json`, CPR 07:51,
pericardiocentesis 09:21, "Pulse back" 10:57, the same five verdicts as above); the MH input is the one above. Rendered
with `debrief-fa.mjs --version 1.0.0-rc.1`: bronchospasm 5 pages, tamponade 6, MH 6, 0 strings in English each; the
footer on every page reads «… از نظر بالینی اعتبارسنجی نشده است؛ … نسخه‌ی 1.0.0-rc.1 (پیش‌انتشار)، ساخت 3db25a3b
2026-10-18.».

**Findings.**
1. **MH Load needs "Choose another scenario" first** when the tamponade is still loaded (cards and sheet updated).
2. **FX-12 confirmed**, and worse than the bar: the case is not restored and Return here is often unreachable after
   Restart patient (cards and sheet updated with what to do).
3. **The bookmark list mixes cases**, named only by clock (cards and sheet: take the last one).
4. **New RR alarm at 00:09–00:12 in bronchospasm** with the cards' press order (sheet row updated).
5. **The Debrief's duration line can read "1 min 60 s"**: `span()` in `apps/demo/src/app/debrief.ts` rounds the seconds
   after flooring the minutes (MH: "23:38 simulated · 1 min 60 s on the clock"). Reported, not fixed.
6. **The Persian footer is the pre-release wording**: `debrief-fa.mjs` builds its own English footer ("Not a medical
   device: … Build …"), so the Persian page lacks "not clinically validated" and the version. Reported, not fixed (a
   script change, outside this round). **Fixed in PR #75.**
7. The kit's engine snapshot key is `1.0.0-rc.1+dev` (above).
8. WebKit only: on the fresh page before bronchospasm, the Scenario tab still showed "Choose another scenario" with no
   case loaded (the script pressed it; the library came up and the Load went through).

**Not measured:** the talk itself (presses only), a human's delay, real Safari and real phones, sound by ear, a real
print dialog.

## Q2-pretag — the rc.2 candidate rehearsed before the tag (main 8cd1fae5, A + V + B)

*Measured 2026-10-19 (04:45–05:30 +0330) on kit `pme-showcase-kit` built by `make-bundle.mjs` from a clean worktree at
main **8cd1fae5** (#88, Debrief redesign B, on A #84 and the rc.2 version bump). `VERSION.txt`: `Commit: 8cd1fae5…`,
no "(with uncommitted changes)"; the app's build id **`8cd1fae5 2026-10-19`** (no `+`); `1.0.0-rc.2` in 3 of the app's
scripts, `1.0.0-rc.1` in none. Served as built by its own Start Classroom launcher; three emulated phones (Pixel 7 on
Chromium, iPhone 13 on WebKit) joined once at the QR moment. Chromium, then WebKit, then the A3 test, one run at a time;
load average 1.9–8.2 (one reading of 21.7 at the Chromium tamponade Load). Script: `kit-round-a.kitround.ts` with the
Q2 edits of `docs/plans/rc2-release-day.md` Task 4 Step 2 (this PR). One output folder per run:
`docs/showcase/kit-round-a/q2-pretag-chromium/`, `q2-pretag-webkit/`, `q2-pretag-a3/`. This is a rehearsal of the
candidate, not of the tag: Task 4 runs again on the tag kit (`q2/`).*

**The kit.** `check-relay.mjs`: **PASS, 2 of 2 runs**, node v26.11.1 (`q2-pretag-chromium/relay-8cd1fae5.json`). The
Start view and Settings → About both read **"Version 1.0.0-rc.2 (pre-release). For education only. Not a medical
device and not clinically validated: never use it for patient care."** (both engines). The Debrief footer reads "For
education only. Not a medical device and not clinically validated: never use it for patient care. Version 1.0.0-rc.2
(pre-release), build 8cd1fae5 2026-10-19." (both engines, and on all 6 pages of the Chromium PDF). The script's
`about.preRelease` reads `false`: its regex still names rc.1 (Task 4 Step 2 says leave it; the label text is the check).

**The script edits** (Task 4 Step 2). The MH tick at Early signs and the tamponade tick at 1:00 were already in the
script (B6 Step 2, #88: `M.tick(/^Name malignant hyperthermia/)` after `state Early signs`, `Tm.tick(/^Name the
tamponade/)` after the 1:00 row), so only the plan's screenshot lines were added: three `.stage` captures
(`q2-bronchospasm-monitor-*` at "Instructor → ×1", `q2-tamponade-monitor-1min-*` after the 1:00 tick,
`q2-mh-monitor-early-signs-*` after the Early-signs tick), and the Q1 talk's Run by → "Showcase 2, 24 October" with the
Notes line "Kit round Q2 rehearsal on the rc.2 release build." (selected by its Notes neighbour; the A3 test's line is
unchanged): **+5/−2**, the plan's "with B's tick already present". A second commit bounds one click (below, note 1).

**Verdict marks against the plan's table (Task 4 Step 4)** — every mark the same KIND on both engines:

| Segment | Expected | Chromium | WebKit |
|---|---|---|---|
| 0 Opening + QR | label rc.2 (pre-release) · `3 phones following` · errors 0 | as expected; joins 2.4 s | as expected; joins 3.4 s |
| 1 Bronchospasm + H21 | – ✓ – (salbutamol ≈ 02:06) · H21 hold and cockpit `true` | **– ✓ –** (salbutamol 02:06) · hold `true`, cockpit `true` (1 506 frames, contiguous) | **– ✓ –** (02:06) · `true`, `true` (1 506) |
| 2 Tamponade A3 path + Debrief | ✓ ✓ ✓ ✓ ◆ (the 1:00 tick · CPR 3–4 s · drainage 1 min 30 s · stop 2 s · ◆ better course) · footer · PDF A4, ≈ 6 pages | **✓ ✓ ✓ ✓ ◆** ("Observed by the instructor at 01:07" · 3 s · 1 min 30 s · 2 s · ◆ "The pulse loss at 07:48") · footer as above · **PDF A4, 6 pages** | **✓ ✓ ✓ ✓ ◆** (01:05 · 3 s · 1 min 30 s · 2 s · ◆ 07:48) · footer as above · print-media screenshot |
| 4 MH early call, 13:03 | ✓ ✓ ✓ – – ✓ · Early signs ≈ 06:51–06:52, call ≈ 07:00, press 13:03–13:04, < 40 at ≈ 07:26 | **✓ ✓ ✓ – – ✓** ("Observed by the instructor at 06:54" · call 11 s · dantrolene 21 s · – repeat · – potassium "did not happen" · ventilation back 13:03 "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:29 → 09:29)") · Early signs 06:52 (state; e22 reader 06:53), call 07:03, press 13:03, < 40 at 07:29 | **✓ ✓ ✓ – – ✓** (06:53 · 11 s · 21 s · – · – · 13:03, 07:28 → 09:28) · Early signs 06:51–06:52, call 07:02, press 13:03, < 40 at 07:28 |

Errors (page and console): **0** in every segment, both engines, and in the A3 test.

**Key times tiles** (B; "tick time as recorded"):

| | Chromium | WebKit |
|---|---|---|
| Bronchospasm | Recognition – (not ticked) · first team action 2 min 07 s (02:06) | same |
| Tamponade (talk) | Recognition **1 min 07 s** (01:07) · first team action **7 min 51 s** · CPR **3 s** · drainage **1 min 30 s** · stop CPR **2 s** · pulseless **3 min 07 s** | 1 min 05 s · 7 min 51 s · 3 s · 1 min 30 s · 2 s · 3 min 08 s |
| MH | Recognition **6 min 54 s** (06:54), not a dash · first team action 4 min 02 s (04:01, surgery) · call 11 s · dantrolene 21 s | 6 min 54 s (06:53) · 4 min 01 s · 11 s · 21 s |

Key moments: bronchospasm 1, **tamponade 7** (06:14 deteriorating · 07:48 pulse lost · 07:51 CPR · 09:21 drained ·
10:55 circulation returned · 10:57 CPR stopped · 11:27 crystalloid), MH 9 (04:01 surgery … 13:03 ventilation back).
Timeline rows: bronchospasm 17 / 17, tamponade 42 / 42 (Q1 42 / 43), MH 43 / 42 (Q1 41 / 42; the tick adds one).

**F10 — the A3 test on this kit** (`-g "A3 tamponade: the cue card path"`, both projects, `q2-pretag-a3/`): **2
passed**. Marks ✓ ✓ ✓ ✓ ◆ on both. **Learner handout PDF (Chromium): 1 A4 page, 0 verdict words** (`Observed|Not
observed|Not assessable|Discuss|✓|✗|◆`), "Questions to think about" and the rc.2 footer present. Facilitator PDF 6 A4
pages. `keyTimes` present on both engines: recognition 1 min 08 s (C 01:07, W 01:08) · first team action 7 min 51 s
(C) / 7 min 52 s (W) · CPR 3 s / 4 s · drainage 1 min 31 s / 1 min 29 s · stop CPR 2 s · pulseless 3 min 08 s;
**moments 7** on both; errors 0. F10 does not fire.

**The six monitor captures** (`q2-*-monitor-{chromium,webkit}.png`, the Saadat-style skin): six lanes, top to bottom
**ECG (II), ECG (II), CO₂, IBP1, IBP2, pleth** on all six (E70: lead II twice, by design). Tamponade at 1:00: every lane
drawn, IBP2 the CVP wave, "CVP MEAN TOO HIGH" in the alarm bar, CVP 17–18 on the tile. Bronchospasm and MH: the IBP2
lane is empty and its tile reads `---`: neither card connects a CVP line (as the older rehearsal shots of
bronchospasm show), so it is not a missing lane (note 2). MH at Early signs: EtCO₂ 46, below the 50 mmHg top, so the
E63 clip is not in this frame.

**Persian, the three `/2` exports** (Chromium JSONs, `debrief-fa.mjs --version 1.0.0-rc.2 --text`): bronchospasm **6
A4 pages** (78 table entries), tamponade **6** (106), MH **7** (109), each **0 strings without translation**, all
entries unreviewed. `verify_pdf.py --expect-font Vazirmatn`: exit 0, unexpected fonts 0, errors 0, no WARN, for each.
Each `.fa.txt` names 1.0.0-rc.2 and 8cd1fae5; the MH one carries the instructor line «مربی آن را در 06:54 مشاهده
کرد.» (Western digits) and the Talking points box (محورهای گفت‌وگو) once with its four prompts. The renders are in
`q2-pretag-chromium/*.fa.{pdf,txt}`.

**Phones and relay.** `3 phones following` at the QR moment; every phone `synced` at every segment's end and after the
reload (15 s); H21 hold kept every 2-s sample. Resyncs: 6–7 by bronchospasm's end, 11–12 by the tamponade's, 16–18 by
MH's. S12-F2 at the close as in Q1: the instructor's AGENTS tile "0.0", every phone "---", before and 30 s after the
style change (29.6 / 29.7 s, the probe's longest difference).

**Gate reading (Task 4 Step 7, for the candidate):** F1 no (commit 8cd1fae5, no `+`; Branch reads `kit-round-q2`, the
tag worktree will read `HEAD`) · F2 no (2/2) · F3 no (rc.2 label and footer; no rc.1 anywhere) · F4 no (every mark as
the table; Debriefs opened, printed, JSON downloaded) · F5 no · F6 no (PEA, ROSC, Early signs, Recovering all came) ·
F7 no (0 errors) · F8 no (A4, 6 pages) · F9 no (note 2) · F10 no. **No F-failure.**

**Notes** (recorded, not fixed):
1. **The talk hung once at the bronchospasm Load (Chromium).** On the fresh page the Scenario tab showed "Choose
   another scenario" for a moment with no case loaded (Q1 note 8, then WebKit only), the script saw it visible, and the
   click then waited on a hidden button with no time-out: 11.6 min, interrupted by hand (the partial run is kept
   outside the repo, not in these folders). The click is now bounded to 3 s and records `"shown, then gone before the
   click"` if it misses; in the runs above it was pressed in time (`choseAnotherScenarioFirst: true` for Chromium
   bronchospasm and both MH Loads). For the presenter nothing changes: the library comes up either way.
2. IBP2 lane empty on bronchospasm and MH (no CVP line in those cards), not F9.
3. **A key-time tile and its interval can disagree by 1 s**: MH WebKit "6 min 54 s (00:00 → 06:53)", A3 Chromium
   "1 min 08 s (00:00 → 01:07)" and "1 min 31 s (07:51 → 09:21)". The duration is rounded from fractional times while
   the clock times are floored (the family of Q1 note 5). Cosmetic.
4. MH call 10–11 s after Early signs (Q1 8–9 s): the tick now comes first. Within ±10 s; < 40 at 07:28–07:29 (Q1
   07:26); EtCO₂ after the press 38 · 49 · 51–52 · 53 · 54 · 49 · 44 … 43, peak 55 at 17:22 (Q1 the same).
5. Bronchospasm: `RR TOO HIGH` at 00:09 (C) / 00:10 (W) and `%SPO2 LOW` 00:35 / 00:37 (Q1: RR TOO LOW 00:12 on C).
6. Tamponade Chromium: one phone-vs-instructor HR difference of 3.5 s while the value swung (Q1 1.5 s; the probe's
   S12-F2 flag), at a load average of 21.7; WebKit 1.5 s. Alarms as the cards, plus `ART DIA` / `ART MEAN TOO HIGH`
   at 11:03–11:04 as in Q1.
7. FX-12 as Q1: "No scenario" after Restart patient on both; "Return here" not on screen on Chromium, two buttons on
   WebKit.
8. `debrief-fa.mjs` found no Vazirmatn in the default font folders of this Mac; the render used `--fonts` pointing at
   the persian-writing skill's `assets/fonts` (Vazirmatn Regular and Bold). Task 5's command needs the same flag here.
9. After the close's style change, MH alarms print in Philips style (`**ABPm 114>110`).
10. Not run in this pre-tag round: FX-16 on WebKit (Step 3b) and the re-take of the six showcase-card shots (Step 6);
    both stay on the tag-kit run.

**Page counts:** facilitator report (tamponade, Chromium) **6 A4 pages** in the talk and in the A3 test; learner handout
**1 A4 page**; Persian handouts 6 / 6 / 7.

## Q2 on rc.3 — the rehearsal on the rc.3 tag kit (fcf99b70, v1.0.0-rc.3)

*Measured 2026-10-23 (13:58–15:30 +0330) on kit `pme-showcase-kit-fcf99b70`, built by `make-bundle.mjs` from a
clean worktree of the tag `v1.0.0-rc.3` = main **fcf99b70** (#116). `VERSION.txt`: `Commit: fcf99b706e2c…`, no
"(with uncommitted changes)", `Branch: HEAD`; the app's build id **`fcf99b70 2026-10-23`** (no `+`); `1.0.0-rc.3` in 3
of the app's scripts, rc.1/rc.2 in none. Served as built by its own Start Classroom launcher; three emulated phones
(Pixel 7 on Chromium, iPhone 13 on WebKit) joined once at the QR moment. One run at a time; load average ≈ 2–3.7.
Script: `kit-round-a.kitround.ts` as on the tag (the close's bounded "Return here" click came with the bump PR,
88fe8b75) with the talk's Notes line naming rc.3. Folders: `docs/showcase/kit-round-a/q2-rc3/` (the talk, both
engines; the set this section and the Persian handouts read) and `q2-rc3-a3/` (the A3 test). The rc.2 numbers beside
these are the rc.2 tag run's (§"Q2" on the rc.2 docs PR #97, folder `q2-rerun/`; that PR is still a draft).*

**The kit.** `check-relay.mjs`: both `.cmd` files "CRLF, ASCII, runs server\launch.mjs"; **PASS, 4 of 4 runs**, node
v26.12.1 (`q2-rc3/relay-fcf99b70.json`; rc.2 2 of 2). The Start view and Settings → About read **"Version 1.0.0-rc.3
(pre-release). For education only. Not a medical device and not clinically validated: never use it for patient
care."** (both engines). The Debrief footer reads "… Version 1.0.0-rc.3 (pre-release), build fcf99b70 2026-10-23."
(both engines; all 6 pages of the Chromium PDF). `about.preRelease` reads `false`: the script's regex still names rc.1.

**How it ran.** First time through, no re-run: **Chromium 1 passed (9.7 min), WebKit 1 passed (9.7 min)**; 9 min 38 s
of wall from the opening to the end of the close on both (rc.2 9 min 24 s / 9 min 39 s). No hang in the close. 34
files with the relay JSON. A3: **2 passed (7.7 min)** (rc.2 7.6 min).

**Verdict marks** — every mark the same KIND as the table, both engines:

| Segment | rc.2 Q2 (C / W) | rc.3 Chromium | rc.3 WebKit |
|---|---|---|---|
| 0 Opening + QR | rc.2 label · 3 phones · joins 2.4 / 2.8 s | rc.3 label · `3 phones following` · join 2.5 s | same · 2.9 s |
| 1 Bronchospasm + H21 | – ✓ – (02:06) · hold/cockpit `true` · 1 506 frames | **– ✓ –** (salbutamol 02:07) · `true`/`true` · 1 507 contiguous frames, EtCO₂ 34, awRR 14 throughout | **– ✓ –** (02:06) · `true`/`true` · 1 505 |
| 2 Tamponade + Debrief | ✓✓✓✓◆ · recognition 01:05 / 01:06 · CPR 3 s · drainage 1:30 · stop 2 s · PDF A4 6 pp | **✓✓✓✓◆** · 01:06 · 3 s · 1 min 30 s · 2 s · pulseless 3 min 07 s · **PDF A4, 6 pages** · load → crystalloid 222.4 s | **✓✓✓✓◆** · 01:04 · 3 s · 1 min 30 s · 2 s · 3 min 07 s · print-media PNG · 221.6 s |
| 4 MH early call, 13:03 | ✓✓✓––✓ · Early signs 06:52 · call 07:02 / 07:03 · press 13:03 / 13:04 · < 40 07:28 / 07:29 | **✓✓✓––✓** · 06:52 · call 07:02 (10 s) · dantrolene 07:23 (21 s) · press 13:03 · < 40 07:28 | **✓✓✓––✓** · 06:51 · 07:02 (11 s) · 07:23 · 13:03 · < 40 07:27 |

**States as the cards** (both engines): tamponade deteriorating 06:14, pulse lost 07:48 / PEA 07:49, CPR 07:51,
drained 09:21, ROSC 10:57 — **the cue cards' 7:48 / 9:21 / 10:57 hold exactly**; MH surgery 04:01 / 04:02, Early signs
06:52 / 06:51, trigger off 07:02, dantrolene 07:23, recovering 08:36, normoventilated 13:04 / 13:03. MH EtCO₂ after
the press, per minute: 38 · 49 · 52 / 51 · 53 · 54 · 49 / 47 · 44 · 44 · 43 · 43 · 43, peak **55 at 17:27** (rc.2 peak 55
at 17:17 / 17:32). Key moments: bronchospasm 1, **tamponade 7**, MH 9. Timeline rows: bronchospasm 18 / 17,
tamponade 44 / 42, MH 42 / 41 (rc.2 17 / 17, 42 / 44, 42 / 43). Errors (page and console): **0** everywhere.

**A3 on the tag kit** (`q2-rc3-a3/`, F10): marks ✓✓✓✓◆ on both; **learner handout 1 A4 page, 0 verdict words**, its
"Take-home points" the card's three owner lines (the second: "Drainage is the treatment: plan it before the pressure
falls."); `pdffonts`: Inter-Regular and Inter-Regular_Bold embedded (plus `.SFNS` and one Helvetica-Bold face, the
system fallback for a few glyphs); facilitator PDF 6 A4 pages. keyTimes on both: recognition 1 min 08 s · first team
action 7 min 51 s · CPR 3 s (C) / 4 s (W) · drainage 1 min 30 s · stop CPR 2 s (C 10:55 → 10:57, W 10:56 → 10:58) ·
pulseless 3 min 07 s (C) / 3 min 08 s (W) (rc.2: 1 min 07 s, 7 min 51 s, 3 s, 1 min 30 s, 2 s, 3 min 07 / 08 s);
**moments 7**; errors 0. F10 does not fire.

**The six monitor captures** (`q2-rc3/q2-*-monitor-{chromium,webkit}.png`, 1000 × 800, the Saadat-like photo layout):
on all six, a two-row header (P1, BED 01 / ADULT, the date and time) over six lanes — ECG labelled "II X1 NORMAL", a
second ECG unlabelled, CO₂ filled yellow breath by breath (never a solid block: FX-25 holds), IBP1 (ART) with dotted
200/120/40 scale lines, IBP2 (30/10/−10), pleth "NORMAL X1" — each with its speed at the right; at the right the HR
tile, NIBP with the T1/T2/DT column, the EtCo2 | FiCo2 | AWRR row, IBP1, IBP2, the BFI row; a full-width bottom strip
(%SPO2, PI, PVI, SpOC, %SpCo, %SpMet, SpHb); red limits beside the values. Tamponade at 1:00: IBP2 the CVP wave (blue),
tile 17 (C) / 18 (W), "CVP MEAN TOO HIGH" in the alarm bar. Bronchospasm and MH: IBP2 lane empty and its tile blank
(neither card connects a CVP line: not a missing lane). MH at Early signs: EtCO₂ 46, the EtAA tile 0.8 (MAC 0.4).

**The six showcase-card shots, re-taken** (`rehearsal.showcase.ts`, one worker): **16 passed (55.7 min**; 27.7 min Chromium, 28.0 min WebKit; rc.2 55.5 min); **64 of 64 soft checks** pass and no page or console error, although another job held the Mac at a load average of up to ≈ 134 during it. 48 files: 16 modified (the four tests whose shots main already had: healthy induction, anaphylaxis, class IV haemorrhage, the second-scenario clock; JPG + JSON per engine), 32 new (the other four tests' JPG + JSON per engine, first committed here, and 16 `results/run-sheet-*.md`); 49 older files the run no longer writes are kept (e.g. `severe-tamponade-then-induction-*`, `…-vent-first-OLD-4a1cc3f7`, `multiwindow-*`). Tamponade (Chromium), MH (WebKit) and anaphylaxis (Chromium) opened: the Saadat-like grid and six lanes as in the Q2 captures.

**macOS WebKit e2e** (tag worktree, `env -u CI`): FX-16 `--repeat-each 3` **3 passed**, none skipped: phone / host
beeps 93 / 94 (**99 %**), 93 / 94 (**99 %**), 93 / 93 (**100 %**), 0 dropped on either side (rc.2 99 / 100 / 100 %);
FX-14 (hidden tab pauses, "(paused)", the toast on return), FX-24 (the follower after a fast-forward and on join),
FX-25 (the CO₂ lane after attach) **3 passed**, none skipped.

**Persian, the three exports** (`q2-rc3/` Chromium JSONs, `debrief-fa.mjs --version 1.0.0-rc.3 --fonts <Vazirmatn>
--text`): bronchospasm **6 A4 pages** (82 entries, 79 unreviewed), tamponade **7** (110, 107), MH **8** (112, 109); **0
strings without translation** each; `verify_pdf.py --expect-font Vazirmatn` exit 0, 0 unexpected fonts, 0 errors, 0
WARN. Each names 1.0.0-rc.3 and fcf99b70. The three owner-approved take-home lines (#112) print on each, the only
reviewed entries each report uses. The owner's copies: `_sandbox/pme-debrief-fa/debrief-fa-*-2026-10-23.pdf`.

**Phones and relay.** `3 phones following` at the QR moment; every phone `synced` at every segment's end; H21's hold
kept every 2-s sample. Resyncs per phone: 5 / 6–7 by bronchospasm's end, 10 / 10–11 by the tamponade's end, 18–19 by
the close. Largest phone-vs-instructor difference: bronchospasm 0 s; tamponade HR 1.5 s (C) and **4 s (W)**; at the
close the AGENTS tile, 29.6 s: instructor "0.0", every phone "---", after the style change (S12-F2 as before).

**The close (FX-12).** After Restart patient the session bar reads "No scenario" on both engines (as before); the bounded
"Return here" click returned (`returnClicked: true`) on both.

**Gate reading (Task 4 Step 7):** F1 no · F2 no (4/4) · F3 no (rc.3 label and footer; no rc.1/rc.2 anywhere) · F4 no
· F5 no · F6 no (PEA, ROSC, Early signs, Recovering all came) · F7 no (0 errors) · F8 no (A4, 6 pages) · F9 no (IBP2
empty by scenario) · F10 no. **No F-failure.**

**Findings** (recorded, not fixed):
1. **Tile text collides at 1000 × 800** on all six captures: the EtCo2 tile's "mmHg" runs under "FiCo2"; "AWRR"
   overprints its red limits (30 / 5); "SQI%EMG%" has no gap; in MH the EtAA tile covers "SQI%EMG%" ("SQI%EI"); MH's
   capnogram plateau inks over the lane's "CO2" and "50mmHg" labels. The gate reference
   (`docs/gates/saadat-pr-g/after-co2-ventilated-1280x800.png`) is 1280 × 800: for the renderer's pass 3.
2. **The NIBP tile on the three cards reads "/"** with no value and no "AUTO(5Min)" label at the capture moments (O2's
   AUTO 5 min is the free-play default; the smoke check's item 2 looks at it).
3. **WebKit, tamponade at 1:00:** the IBP2 value "18" drawn almost black (the alarm blink's dark phase at the capture
   instant).
4. **WebKit, tamponade:** one phone-vs-instructor HR difference of 4 s (instructor 54 → 112, phone 49 → 117, at 104.8 s
   of wall, while HR changed fast); rc.2 1.5 s. Over the script's 2-s S12-F2 rule; the phones were `synced`.
5. Persian pages 7 and 8 for tamponade and MH (rc.2 6 and 7): +1 each, within the plan's ±1.
6. The A3 handout embeds `.SFNS` and Helvetica-Bold faces beside Inter (system fallback for a few glyphs); the smoke
   check's item 7 compares the print in Safari and Chrome by eye.
7. Times within ±2 s sim of rc.2's Q2 on every card (recognition 01:04–01:08 is the script's tick, not the model).
8. The release workflow's `playwright install --with-deps` took ≈ 20 min (the whole rc.2 run ≈ 5 min); the release
   succeeded.

**Not measured** (the smoke check and W cover these in part): real Safari, real phones, sound by ear, a real print
dialog, the NIBP AUTO 5 min and IBP-off free-play defaults (no capture in free play), Windows.
