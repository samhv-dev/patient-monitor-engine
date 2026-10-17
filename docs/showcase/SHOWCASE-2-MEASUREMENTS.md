# Showcase 2: kit-round measurements (part A)

*Measured 2026-10-13 for part B, which folds these numbers into `SHOWCASE-2-RUN-SHEET.md` (that sheet is not edited
here). Every number below was read through a BUILT kit, served by its own **Start Classroom** launcher, on Playwright's
Chromium and macOS WebKit at 1440 × 900, one rehearsal at a time on a Mac shared with other agents.*

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
