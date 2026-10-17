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
| (B) hold span 1 until the 2 min, press, then the spans | 09:39 → 14:39 (after the press) | **09:35 / 09:36** | 37 | 37 · 49 · 51 · 53–54 · 55 · 57 · 59 · 59 · 60 · 45–46 · 45 · 44 … 41 | **60** at 16:45 / 17:19 (+7.1 / 7.7 min) | 10:51 / 10:55 (1.3 min after the press, before span 1) | **yes**: 57–58 after span 1 → dantrolene 14:53; "Recovering" again 20:04 / 20:05; 41 at the end (25:23) | ✓ ✓ – – ✓ |
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

(B) costs about 30 s more of wall time at ×4 before span 1. It also gives a larger rebound: 60, and an ETCO2 TOO HIGH
alarm the audience sees live at 10:51. And it needs the repeat dantrolene at 14:53. (A) keeps the card's spans and
puts the rebound inside span 2. The margin to the "above 55" cue is nil: the peak is exactly 55, and it falls inside the
span, so the presenter never sees it.

**Not measured:** a human presenter's actual delay after span 1 (modelled as 2 s of wall time, plus the script's 3 s
check, so 12:41 → 13:03). Real Safari and real phones. A press between 09:27 and 12:41, which the spans of (A) make
impossible.
