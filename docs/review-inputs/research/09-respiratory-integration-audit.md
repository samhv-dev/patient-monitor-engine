# 09 — Respiratory, airway and gas integration audit (R53)

*Measured audit of how the lungs, airway, gas exchange, capnography, spontaneous drive and ventilators link to each
other and to the rest of the body. Engine: `origin/main` 23b791f (eab2371 = FU-3 merged, plus RESUME doc commits),
MODELED unless stated, seed 7, adult 40 y 70 kg 175 cm male unless stated. 78 scripted scenarios plus five probes
(capnogram shapes, dead-space bookkeeping, drive state-dependence, ventilator link, OLV perfusion). Written 2026-09-28
by the respiratory integration auditor. Read-only on the repo: every run used a throwaway worktree.*

Scripts: `research/09-audit-scripts/` (rerun instructions in the header of `cli.ts`; a full rerun takes about 7.5 min
for the scenarios, most of it the 0.1 s peak-pressure sampling of the `fine` scenarios, plus about 4 min of probes). `out/summary.txt` gives every scenario's step
windows (value before, extreme, end), `out/capno.txt`, `out/drive.txt`, `out/link.txt`, `out/deadspace.txt`, `out/olv.txt` are
the probe outputs, and `out/tables.txt` is every scenario at its print resolution. Raw per-scenario JSON is written to `$RESULTS` and not kept; `view.ts` prints any columns of it.

This audit follows the haemodynamic audit (`08-physiology-integration-audit.md`, gaps G1–G15). Where a respiratory
scenario ends in a non-arrest at MAP 13 or SpO2 0 %, that is 08's G1 and is not re-counted here.

---

## 0. Headline

1. **The dead-space bookkeeping is wrong for every patient except the reference man, and it breaks every
   ventilator scenario.** At t = 0 the engine runs the MANUAL EtCO2 calibration **in MODELED mode too**: it takes the
   adult L1 defaults (RR 15 × VT 500, EtCO2 36, whatever the patient) and invents a "physiological" dead space
   (`vdExtraMl`) that holds them, then adds 50 mL of apparatus on intubation without removing the upper airway the
   tube bypasses. Dead space on the ventilator: 70 kg man **265 mL** (VD/VT 0.53 at 500 mL), 60 kg woman **329 mL**,
   80 y man 314, 4 y child **459 mL**. Measured consequences:
   - man, 12 × 500: PaCO2 **60** at 60 min (no GA switch) / 47 (with it); the haemodynamic audit's G11, confirmed.
   - woman 60 kg on the textbook lung-protective 12 × 400 (7 mL/kg IBW): PaCO2 57 → **103**, pH 7.06, EtCO2 81 in
     40 min.
   - VT 300 × 12 (permissive hypercapnia): alveolar ventilation **0.42 L/min** → PaCO2 135 and SpO2 19 % at FiO2 0.5.
   - OLV 350 × 16: PaCO2 **88**. ARDS 420 × 20: PaCO2 72.
   - ventilator link in bronchospasm (pressure-limited VT 207 mL < dead space): SpO2 → 0.
2. **Bronchospasm does not respond to any treatment.** Salbutamol 250 µg IV, adrenaline 50 µg and sevoflurane 0.7 MAC
   leave peak pressure 31.8 / 44 cmH2O and auto-PEEP 5.5 / 11.9 cmH2O exactly unchanged. 7g's `bronchodilation` bus
   value reaches only 7e's anaphylaxis write-back.
3. **"Anaesthetised lungs" is a hidden instructor switch.** FRC (awake 30 → GA 20 mL/kg adult, 8 mL/kg child),
   VO2/VCO2 × 0.85 and induction atelectasis follow the `thermal` event's `anaesthesia: 'general'`, which no drug,
   airway device or ventilator command sets (the test rigs send it by hand). Without it: preoxygenated apnoea to SaO2
   90 % takes **9.8 min** (7.8 with it; Benumof ≈ 8); a 4 y child **7.8 min** (2.8 with it; Patel 160 ± 31 s).
4. **The spontaneous drive has no induction apnoea and no sense of obstruction.** Propofol 2 mg/kg on an SGA: breathing
   continues (RR 17–20, VT 300–340) at Ce 3 µg/mL. On a natural airway, obstruction is a VT multiplier the drive does
   not see, so the patient breathes **41/min at VT 200 mL** (alveolar ventilation 0) instead of obstructed efforts or
   apnoea. Obstructed efforts create **no negative intrathoracic pressure**, so there is no negative-pressure oedema
   and no paradox. The drive's VT has no ceiling: 1.57 L demanded in laryngospasm, and on release PaCO2 falls
   61.6 → 43.7 in 30 s.
5. **The capnograph is fooled.** Breaths smaller than the dead space still draw a full alveolar plateau (VT 68 mL:
   displayed EtCO2 42 → 55 and an EtCO2-HIGH alarm while alveolar ventilation is 0). At RR < 6 the 10 s EtCO2 window
   empties between breaths, so the numeric drops to 0–22 and EtCO2-LOW flaps.
6. **Rebreathing is cosmetic.** FiCO2 8 mmHg raises the capnogram baseline but not PaCO2 (46.6 vs 46.6 at 20 min),
   because CO2 elimination has no inspired term.
7. **One disease, two commands, two answers.** 7a `pe` + 7b `pe` multiply PVR ×22.75 → **mean PAP 117 mmHg**. 7a `pe`
   alone leaves SpO2 99 %; 7a `tensionPtx` alone leaves SpO2 99 % and peak pressure unchanged. Airway `bronchospasm` 1
   and lung `bronchospasm` 1 give different pressures (32 vs 44 cmH2O), and together 66 cmH2O.
8. **What works.**
   - Apnoea arithmetic: PaCO2 +11–14 mmHg in the first minute, then 3.2–3.9 mmHg/min. Room air to SaO2 90 % in 40 s,
     inside R39-1's 35–60 s band.
   - Preoxygenation.
   - Metabolic acidosis → Winter's compensation (HCO3 9.6 → PaCO2 24.9).
   - CPR EtCO2 tracks quality (q 1: 22–25; q 0.4: 8–9) with a ROSC spike (27 → 52).
   - EtCO2 follows CO in haemorrhage and tamponade.
   - PEEP 15 costs 42 % of CO when hypovolaemic vs 15 % when healthy (state-dependent, unlike 08's drugs).
   - COPD auto-PEEP rises with RR (4.6 → 18 cmH2O) with hypotension, and a 30 s disconnection releases it.
   - Endobronchial intubation, disconnection, oesophageal intubation, sevoflurane and remifentanil patterns.
   - Dyshaemoglobin oximetry (MetHb 30 % → SpO2 84; COHb 30 % → SpO2 97).

---

## 1. Method and rig

- **Runner** (`runner.ts`): the same pattern as 08.
  - `createEngine({ seed: 7, mode, patient: { ageY 40, sex M, weightKg 70, …, sensors abp/cvp/pap/spo2/co2/temp } })`.
  - A scripted timeline of `dispatch` bodies.
  - Every 5 s the committed pipeline state is read-only sampled: `resp.co2/o2/lung/spont/driver`, `neuro.resp`,
    `pk.bus`, `blood.core`, `hemo.circ`.
  - The monitor's `measurement` events (displayed SpO2, EtCO2, awRR, impedance RR), `lungState` events and alarms are
    captured.
  - `fine` scenarios step at 0.1 s between samples to catch the peak airway pressure of the engine's own lung
    (`lung.mech.paw`).
  - The runner yields once per simulated minute.
- **Ventilated rig** ("RIG", used by E–G):
  - ETT, VCV 12 × 500 mL, PEEP 5, FiO2 0.5 from 1 s;
  - `thermal { anaesthesia: 'general' }` (the switch of headline 3, sent so the rig matches the calibrated tests);
  - propofol 100 µg/kg/min and rocuronium 0.6 mg/kg at 1 s.
  - The 12 × 500 default was kept on purpose, so the dead-space finding shows up as it would for a user. PaCO2 drifts
    44.8 → 49 over the E–G windows; each scenario is compared with its own pre-step values.
- **Seams** (labelled in the tables):
  - `resp.co2.vdExtraMl = 0` (A2c what-if) and `+= 200` (drive probe CO2 challenge);
  - `resp.temp.pinCoreTemp` (G4, 7e's test seam, as in 08).
  - None of these is engine behaviour.
- **Link probe** (`probe-link.ts`): `@pme/ventilator`'s `createLinkedSim` (profile `normal`, VC 12 × 500, PEEP 5,
  FiO2 50 %), MANUAL (the link's default) and MODELED, against the engine's own ventilator with the same patient and
  settings.

---

## 2. Scenario results

"Expected" is the textbook course with its source. Sources:
- Lumb, *Nunn's Applied Respiratory Physiology* 9e ("Nunn")
- *Miller's Anesthesia* 10e ("Miller")
- West, *Respiratory Physiology*
- Benumof, *Airway Management*, and Benumof 1997 (*Anesthesiology* 87:979)
- Pulse numbers from this project's own Pulse audit (`pulse-audit/03-respiratory-gas.md`) and spike
  (`07-pulse-feasibility-spike.md`)

Verdicts: **plausible / too weak / too strong / wrong / missing**.

### A. Baselines

| cell | model | expected (source) | verdict |
|---|---|---|---|
| A1 awake, spontaneous, room air (MODELED; MANUAL identical) | RR 14.7–15.2, VT 490–508, VE 7.4, VA 4.5 L/min, PaCO2 38.9–39.2, EtCO2 36, PaO2 88–92, SpO2 96 (SaO2 96–97), pH 7.40. **Dead space 215 mL = anatomical 154 + calibrated 61; VD/VT 0.43** | resting VE 5–6 L/min at VT 6–7 mL/kg, VD/VT 0.28–0.33, PaO2 90–100, SpO2 97–99 (Nunn ch. 7–8). Pulse: RR 12, VT 536, PaCO2 40.0, EtCO2 36.6 | numbers plausible; **dead space inflated to make VE 7.5 L/min fit** |
| A2 ETT + VCV 12 × 500, PEEP 5, FiO2 0.5, no GA switch | PaCO2 **50 / 54.5 / 57.2 / 60.3** at 10/20/30/60 min; EtCO2 54; pH 7.26; VA 2.82; **VD 265 (154 + 50 apparatus + 61); VD/VT 0.53**. MAP 96 → 100 (hypercapnic pressor term) | 12 × 500 (7 mL/kg) in an anaesthetised 70 kg adult: PaCO2 35–42; VD/VT with ETT + HME ≈ 0.3 (Nunn ch. 8: the tube removes about half of the anatomical dead space; apparatus 50–100 mL). Pulse ventilated reference (N-P03): healthy VD/VT **0.2–0.4**, PaCO2 < 45 at VT 444 in a 60 kg PBW | **wrong** |
| A2b + thermal GA switch | PaCO2 47.3 at 60 min (VCO2 × 0.85) | as above | too high |
| A2c what-if: `vdExtraMl = 0` (no GA) | VD 204, PaCO2 48.3 at 60 min | — | isolates the calibration: −12 mmHg |
| A2d 12 × 600 | PaCO2 42.9 (the 08 audit's workaround) | — | — |
| A2e MANUAL 12 × 500 | PaCO2 58.6, MAP 107 | — | wrong (same bookkeeping) |
| **A2f woman 60 kg / 165 cm (IBW 57), 12 × 400 (7 mL/kg IBW) + GA** | PaCO2 57.5 → 66 → 81 → **103** at 5/10/20/40 min, pH **7.06**, EtCO2 81, VA 0.85 L/min, **VD 329, VD/VT 0.82**, MAP 99 → 107 | PaCO2 35–42 (as A2) | **wrong: noticed in minutes** |
| A2g man, 12 × 490 (7 mL/kg IBW) + GA | PaCO2 49.3 | 35–42 | too high |
| A3 FiO2 steps, awake spontaneous | 0.21: PaO2 88–92; 0.4: 193–199; 1.0: 619–623 (PaCO2 +2.5: the hypoxic drive falls) | PAO2 − A–a 5–15: 0.4 → 215–235; 1.0 → 610–650 (West ch. 5) | plausible |
| A3b FiO2 steps, VCV 12 × 600 + GA | 0.21: 93–96; 0.4: 208–212; 1.0: **592–625**, shunt 0.02 → 0.04 over 20 min | GA adds 5–10 % atelectasis within minutes and a shunt of about 8–10 %; on FiO2 1.0 PaO2 is usually 350–500 (Hedenstierna & Edmark, *BJA* 2010; Rothen 1998) | **too weak** (induction atelectasis/shunt too small) |
| A4 face-mask preoxygenation, FiO2 1, tidal breathing | FAO2 0.91 at 3 min; PaO2 511 at 1 min, 596 at 2, 614 at 3 min | FEO2 ≥ 0.9 after 3 min of tidal breathing with a tight mask (Benumof; Miller airway chapter). No leak is modelled | plausible |

**Dead-space table** (`probe-deadspace.ts`, `out/deadspace.txt`; steady PaCO2 from the engine's own
PaCO2 = 0.863·VCO2/VA):

| patient | anatomical VD | `vdExtraMl` (calibration) | VD on the ventilator | PaCO2 at 12 × 7 mL/kg IBW (GA) | same with ETT dead space (1 mL/kg + apparatus) |
|---|---|---|---|---|---|
| man 70 kg 175 cm | 154 | 61 | 265 | 53 | 32 |
| woman 60 kg 165 cm | 125 | **154** | 329 | **143** | 34 |
| term pregnancy 70 kg 165 cm | 125 | 121 | 296 | 104 | 36 |
| man 127 kg 175 cm | 155 | −35 | 170 | 49 | 43 |
| man 80 y | 145 | 118 | 314 | 67 | 29 |
| child 4 y 16 kg | 35 | **400** | 459 | 939 (VT 112) | 54 |

**Mechanism (confirmed in code).**

- `l2/resp/pipeline.ts:125` starts `seen.etco2` at `Number.NaN`. So the "MANUAL etco2 target → physiological dead
  space" block at `:311–326` runs on the first gas step in **both** modes:

  ```ts
  const need = n.vt - (vaForPaco2(vco2, pf) / Math.max(0.3, rs.lung.co2.e) * 1000) / n.rr;
  rs.co2.vdExtraMl = Math.min(0.8 * n.vt, Math.max(-0.5 * rs.pat.deadSpaceMl, need - base));
  ```

- The targets it holds are the adult L1 defaults, whatever the patient (`l1/state.ts:31–33`: `rr … def: 15`,
  `vt … def: 500`, `etco2 … def: 36`). A 16 kg child therefore "breathes" 500 mL (MODELED VT 590–706 mL in B6) and
  gets 400 mL of invented dead space.
- `pipeline.ts:163`: `return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;`
  The tube adds apparatus but never subtracts the extrathoracic airway it bypasses (`gas/params.ts:30`
  `ANAT_DEAD_SPACE_ML_PER_KG = 2.2` is the awake value).
- The known `it.fails` at `pk-bus.test.ts:22` ("VA at VT 500 × 12 exceeds 3 L/min, measured 2.82") and the
  `lung-circ.test.ts:12–16` comment (OLV rig moved to RR 40 "to fight the calibrated dead space, NR-7g-3") are
  symptoms of this.

### B. Apnoea (preoxygenated 3 min by face mask, then propofol 2 mg/kg + rocuronium 0.6 mg/kg, source `none`, airway patent)

Times are from the start of apnoea (`summarize.ts`).

| patient | GA switch | SaO2 < 90 | displayed SpO2 < 90 | SaO2 < 60 | HR < 60 | pulseless | PaCO2 1st min / then |
|---|---|---|---|---|---|---|---|
| B1 adult 70 kg | no | **9.75 min** | 10.1 | 10.9 | 11.0 | 18.9 | +12.8 / 3.73 mmHg/min |
| B1g adult | yes | **7.83** | 8.25 | 9.08 | 9.25 | 17.1 | +11.3 / 3.15 |
| B2 adult, room air, no preox | no | **0.67** (40 s) | 1.00 | 1.67 | 1.75 | 9.4 | +13.7 |
| B3 obese 127 kg | no | 3.33 | 3.75 | 4.25 | 4.33 | 11.8 | +12.9 / 3.88 |
| B3g obese | yes | **2.75** | 3.08 | 3.75 | 3.83 | 11.5 | +11.2 / 3.30 |
| B4 term pregnancy (lung `pregnancy` 1, F 70 kg) | no | 6.92 | 7.25 | 7.83 | 7.92 | 15.4 | +12.7 / 3.76 |
| B4g pregnancy | yes | **5.58** | 6.00 | 6.58 | 6.67 | 14.3 | +11.3 / 3.18 |
| B5 child 4 y 16 kg | no | **7.83** | 8.92 | 8.50 | 10.9 | none in 11 min | from **55.6**: +22.4 / 3.80 |
| B5g child | yes | **2.75** | **3.83** | 3.17 | 5.42 | 10.3 | from 55.1: +20.8 / 3.49 |
| B7 adult, MANUAL | no | 9.92 | 10.3 | 11.3 | never (HR 97) | never (MAP 78 at SaO2 0 for 10 min) | +13.5 / 3.74 |

Expected:
- Benumof 1997: healthy 70 kg adult ≈ 8 min to SaO2 90 %; obese 127 kg ≈ 2.7–3 min; 10 kg child ≈ 3.5–4 min. The
  engine's own test `resp-oxygen.test.ts:8` bands the adult at 8 ± 1.5 min.
- Patel 1994 (*Can J Anaesth* 41:771): children 2–5 y 160 ± 31 s.
- Room air: SaO2 90 % in 35–60 s (R39-1 true-arterial band; Pulse: SaO2 0.81 at 60 s of rocuronium apnoea).
- Term pregnancy roughly halves the safe apnoea time: FRC −20 %, VO2 +20–30 % (McClelland, Bogod & Hardman,
  *Anaesthesia* 2009;64:371; the exact minute values need checking, Q5).
- PaCO2: +8–16 mmHg in the first minute, then 3–6 mmHg/min (Eger & Severinghaus 1961; Stock 1988).

Verdicts:
- Adult, obese and PaCO2 kinetics are **plausible with the GA switch** and too slow without it (9.75 min; obese
  3.3 min).
- Room air is plausible.
- **Pregnancy is too slow** (5.6–6.9 min) because the `pregnancy` row changes FRC and chest wall only.
- **The child is too slow without the switch** (7.8 min). With it the timing is right (2.75 min), but the child starts
  from PaCO2 55 and lactate 1.45 rising at rest, and the displayed SpO2 lags SaO2 by about 60 s (SpO2 99 % at SaO2
  44 %; SpO2 < 90 only at 3.8 min). That is the CO-ratio defect V.1 Task 1 fixes (`gas/delay.ts:29`
  `const flow = 1 / Math.min(1, Math.max(0.25, coRatio));` with the child's CO 1.25 / adult 5.25).
- **MANUAL** has no hypoxic bradycardia or arrest: HR 97, MAP 78 at SaO2 0 % for 10 min (FU-3 gave the rhythm to the
  instructor in MANUAL; Q9).

**Mechanism: the GA switch.**
- `pipeline.ts:250`: `… * (rs.temp.anaesthesia === 'general' ? GA_METABOLIC : 1)`
- `pipeline.ts:301`: `rs.lung.frcGaMl = ga ? rs.pat.frcGaMl : rs.pat.frcMl;`
- It is set only by `pipeline.ts:635`: `if (th.anaesthesia !== undefined) rs.temp.anaesthesia = th.anaesthesia;`
- The test helper sends it by hand (`test/helpers/resp.ts:113`). The organs derive a GA state from the drugs
  (`organs/inputs.ts:161`: `anaesthesia: drugs.hypnotic && rs.temp.anaesthesia === 'none' ? 'general' : …`), but the
  lungs do not.
- I1 (40 min of propofol + rocuronium on the ventilator, no switch): FRC stays 2100 mL and VCO2 stays at the awake
  value.

### C. Induction sequence (preox → propofol 2 + roc 0.6 at 300 s → no ventilation 3 min → BVM 12 × 500 FiO2 1 at 480 s → laryngoscopy stimulus 1.5 + ETT at 600 s → VCV at 630 s)

| phase | model (C1, preoxygenated, no GA switch) | expected | verdict |
|---|---|---|---|
| propofol, first 90 s | VT 498 → 359 (15 s) → **68** (30 s, obstruction 0.80) → 24 → 11 mL, RR 14.9 → 17.6, then **apnoea at 390 s** (diaphragm strength < 0.05 from rocuronium, not from propofol). VA 0 from 330 s | apnoea after propofol 2 mg/kg in 25–50 % (30 s to minutes), otherwise shallow breathing with upper-airway obstruction; obstructed breaths move no gas (Miller, IV anaesthetics and airway chapters) | direction plausible; mechanism see C4 |
| capnogram during those breaths | displayed EtCO2 38 → **42 → 49 → 52 → 54 → 55** with VT 68 → 11 mL; **EtCO2-HIGH alarm at 349 s**; flat from 405 s; apnoea alarms at 398/400 s | breaths below the dead space show a small or absent plateau: EtCO2 falls toward 0 (Kodali, *Anesthesiology* 2013;118:192) | **wrong** |
| 3 min without ventilation | SpO2 99, PaO2 613 → 221; PaCO2 41.7 → 61.0 (+19) | SpO2 held after good preoxygenation (Benumof); PaCO2 +8–16 then 3–6/min | plausible |
| BVM 12 × 500, FiO2 1 | first EtCO2 **54**, then 48–50; PaCO2 55 → 52.2 in 2 min; awRR 3 → 12 over 45 s | first breath after 3 min of apnoea ≈ the accumulated PaCO2 (55–60), then washout (resp-airway test M4: +9–15) | plausible |
| laryngoscopy (stimulus 1.5) + ETT | MAP 88.9 → 92.8 → **95.0 (+6)**, HR 91 → 93 | without opioid: MAP +20–30 %, HR +20 (Miller, airway and pharmacology chapters) | too weak (a 08 G2-type haemodynamic item) |
| ventilator 12 × 500 | PaCO2 52.4 → 56.0 at 30 min | 35–42 | wrong (A) |
| C2 same, room air (no preox) | SpO2 96 → 89 at 75 s after propofol (obstructed small breaths), SaO2 58 at 120 s, **HR 48** at 135 s; SaO2 30 at 180 s; BVM: SaO2 95.5 within 15 s, displayed SpO2 29 → 76 → 96 over 30 s | desaturation within 1–2 min; hypoxic bradycardia; recovery 30–60 s with a 15–30 s display lag | plausible |
| C3 with the GA switch at T0 | FRC 1400 → PaO2 130 after 3 min (221 without) | — | shows the switch's size |
| C5 MANUAL | as C1; MAP 97 → 73 (MANUAL's reflex-free circuit, 08 G9) | — | — |

**C4 — propofol 2 mg/kg alone, natural airway, room air.**
- Propofol Ce reaches 3.0 µg/mL and obstruction 0.71.
- RR 14 → 32 → **41/min** at VT 194–245 mL, so VA is 0 for 3 min: SaO2 31.6 %, HR 50.
- Recovery (SaO2 > 90 at 450 s after the dose) comes only as the obstruction wanes.
- C4b (same dose via SGA, no obstruction): no apnoea, RR 17–20, VT 300–340, PaCO2 49, SpO2 87–89 on air.

Expected: apnoea or obstructed inspiratory efforts with paradoxical chest movement and no gas flow; RR does not climb to
40 under propofol at hypnotic concentrations. Verdict: **wrong**.

**Mechanism (C1, C4).**
- `neuro/spont.ts:88–89`:

  ```ts
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  ```

  Obstruction is a VT multiplier applied **after** the drive has chosen VE. The drive (`lung/drive.ts:41`) then answers
  the rising PaCO2 by raising RR up to its cap of 45 (`Math.max(4, Math.min(45, x.rr0 * rrF * Math.sqrt(ve / x.ve0) …`).
  VT is uncapped (`:42`).
- 7f's MANUAL apnoea flag (`neuro/drive.ts:64` `apnoea = … veRest < APNOEA_IN`) is never read on the MODELED path. The
  only MODELED apnoea is `ve <= 0.2` (`lung/drive.ts:38`) or a paralysed diaphragm.
- Hypnotics scale the CO2 slope (`:36` `ve = chem * (1 - opioidDep) * (1 - hypnoticDep)`). They do not remove the
  wakefulness drive or raise the apnoeic threshold, so post-induction apnoea cannot occur.
- The capnogram (`co2/capno.ts:67`: `return c.sampled === 'alveolar' ? x.etco2 : 0;`) draws the alveolar EtCO2 for any
  exchanging cycle. `driver.ts` marks every non-obstructed cycle `alveolar` whatever its VT, while
  `alveolarVentilation` (`driver.ts:368`) counts `max(0, vt − VD)`.

### D. Opioid and volatile spontaneous ventilation

| cell | model | expected (source) | verdict |
|---|---|---|---|
| D1 remifentanil 0.05 → 0.1 → 0.2 µg/kg/min, awake, natural airway, room air (10 min each) | 0.05: RR 8.3, VT 651, PaCO2 41.1. 0.1: RR 5.9, VT 802, PaCO2 44.4. 0.2: RR **4.2**, VT **892**, PaCO2 49.4, SpO2 93. Obstruction 0; depth index **92 throughout** | remifentanil slows RR first; at 0.1 RR 6–8 and PaCO2 +5–10; at 0.2 RR ≤ 6 with apnoeic pauses, PaCO2 50–60 and marked sedation (Miller, opioids; Bouillon 2003, *Anesthesiology* 99:779, C50 0.92 ng/mL at fixed CO2) | pattern plausible; VT 900 mL on the high side; **no sedation** (a 7f depth item) |
| D1 naloxone 0.1 mg × 2 (remifentanil still running) | opioid depression 0.88 → 0.67 → 0.54; RR 4.1 → 7.1 → 8.8; PaCO2 50.9 → 43.5; re-narcotisation as it wears off (0.54 → 0.63 in 13 min) | titrated naloxone partially reverses within 1–2 min; re-narcotisation with long-acting opioids | plausible |
| D2 SGA, FiO2 0.5, propofol 2 mg/kg then sevoflurane 2 → 3 → 4 % (FGF 6) | MAC 0.67–1.1: RR 19.7–20.0, VT 350–363, PaCO2 55.5–57.3. MAC 1.3–1.5: RR 19.4, VT 330, PaCO2 59.4–62.3, pH 7.24. MAP 96 → 77; no apnoea | dose-dependent PaCO2 rise (≈ 50 at 1 MAC, 60–70 at 1.5–2 MAC), **RR up to 25–35**, VT down to 200–250 mL, apnoea near 2–2.5 MAC (Doi & Ikeda, *Can J Anaesth* 1987;34:283; Miller, inhaled anaesthetics) | PaCO2 plausible; **tachypnoea too weak** |
| D3 extubation at TOFR 0.6 (propofol Ce 1.6, DI 70), FiO2 0.4 | obstruction 0.59 → VT 141 mL, RR 18 → 26, VA ≈ 0 for 2 min; PaCO2 40 → 57.7; SpO2 99; recovery over 20 min as TOFR → 0.84 | residual block impairs upper-airway patency and swallowing, and depresses the hypoxic response (Eriksson 1993, *Anesthesiology* 78:693: TOFR 0.7 → HVR −30 %); **awake** volunteers at TOFR 0.5–0.7 keep a near-normal VT (Eikermann 2003, *AJRCCM* 167:1024) | direction plausible; **too strong for an awake patient** |
| D4 SGA, remifentanil 0.1 + propofol 50 µg/kg/min, room air → FiO2 0.5 → stimulus 1.5 | room air: RR 6.2, VT 656, PaCO2 49.4, SpO2 93. FiO2 0.5: PaCO2 → **60.6** in 10 min (hypoxic drive removed). Stimulus 1.5: DI **77 → 92**, RR 5.57 → **5.54** | supplemental O2 masks opioid hypoventilation (Fu 2004, *Chest* 126:1552): plausible. A noxious stimulus raises ventilation in a lightly anaesthetised, spontaneously breathing patient (Nunn ch. 5: the "wakefulness" and nociceptive drive) | O2 part plausible; **stimulus missing** |

**Drive state-dependence probe** (`probe-drive.ts`, `out/drive.txt`; SGA, FiO2 0.5 for the CO2 arm; +200 mL dead-space
poke; room air plus shunt target 0.3 for the O2 arm):

| state | CO2 slope L/min/mmHg (% of awake) | O2 arm: PaO2 → 56 mmHg, ΔVE |
|---|---|---|
| awake | 1.12 (100 %) | **+8 %** (VE 7.5 → 8.1), PaCO2 −1.5 |
| remifentanil 0.05 | 0.38 (34 %) | +9 % |
| remifentanil 0.1 | 0.19 (17 %) | +13 % |
| propofol 50 µg/kg/min (Ce 1.07) | 0.52 (46 %) | +10 % |
| sevoflurane 0.41 MAC | 0.87 (78 %) | +11 % |
| sevoflurane 0.78 MAC | 0.57 (51 %) | +10 % |
| remifentanil 0.05 + sevoflurane 0.4 MAC | 0.28 (25 %) | +9 % |

Reading:
- The CO2 response is state-dependent in the right direction: propofol 1 µg/mL −54 % (Nieuwenhuijs 2001: 40–60 %);
  remifentanil perhaps too strong at 0.05.
- The awake slope is on the low side (1.12 vs 1.5–2.5).
- The hypoxic response is small everywhere (+8 % poikilocapnic at PaO2 56) and **not depressed by any drug**. Clinically
  the peripheral response is the more anaesthetic-sensitive one: 0.1 MAC volatile or sedative propofol blunt it by
  30–70 % (Dahan & Teppema, *BJA* 2003;91:40; Knill & Gelb 1978).
- Mechanism: `lung/drive.ts:35` `const chem = Math.max(0, s * (x.paco2 - b)) * hypoxicFactor(x.pao2);` uses one
  multiplicative hypoxic factor under the same depression factor. Pain is hard-wired off (`neuro/spont.ts:84`
  `pain: 0`). The drive runs only when the source is spontaneous (`pipeline.ts:327`), so a ventilated patient never
  triggers, bucks or breathes over the ventilator: D3 stays at the set RR 12 until extubation.

### E. Airway obstruction, bronchospasm and circuit events (ventilated rig unless stated)

| cell | model | expected (source) | verdict |
|---|---|---|---|
| E1 airway `bronchospasm` 1 at 600 s | peak **16.7 → 31.8**, plateau 14.1 → 17.8, auto-PEEP 0.1 → **5.5** cmH2O; PaO2 263 → 172; PaCO2 44.8 → 63.5 in 15 min; displayed EtCO2 40 → 34 (Pa–Et 15.5 → 18); shark fin (phase II 1.86 s, phase III 2.6 mmHg/s); MAP 91.6 → 86.3 | severe bronchospasm on VCV: peak 40–60+, auto-PEEP 10–20, falling SpO2, shark fin, hypotension from hyperinflation (Miller, anaphylaxis/bronchospasm; Dewachter 2009) | presentation plausible but **moderate at "severity 1"** |
| E1 salbutamol 250 µg IV (900 s), adrenaline 50 µg (1200 s) | **no change** in peak, plateau, auto-PEEP or PaO2 over 10 min each; adrenaline MAP +8 | β2 agonists and adrenaline reverse bronchospasm within minutes; deepening with a volatile bronchodilates (Miller) | **missing** |
| E1b lung `bronchospasm` 1; salbutamol, sevoflurane 2 % (0.72 MAC by 1800 s), adrenaline | peak **44.0**, plateau 26.8, auto-PEEP **11.9**, EtCO2 28 (PaCO2 47 → 61), CO 4.84 → 3.8; MAP 91.6 → 88.8, then **71** under sevoflurane; no drug moves the mechanics | as above | **missing** (treatment); inconsistent with E1 at the same name and severity |
| E1c lung `asthma` 1, then RR 12 → 8 | peak 36.8, plateau 26.8, auto-PEEP 6.4 → 3.5 at RR 8 | slower rate lowers auto-PEEP: correct direction | plausible |
| E2 laryngospasm proxy: propofol 1 mg/kg, natural airway, `obstructed` 60 s (no laryngospasm condition exists) | SaO2 94.3 → 67.8 in 60 s. The drive's demand grows to RR 45 × VT **1086 mL**. On release SaO2 93.5 within 15 s and PaCO2 **54.6 → 44.2 in 15 s** | on room air after propofol, desaturation in 30–60 s; release: recovery 30–60 s | desaturation plausible; **release wrong** (VT uncapped) |
| E2b the same for 180 s | SaO2 **12 %**, HR 49–50; VT demand **1.57 L**; release: PaCO2 61.6 → 43.7 in 30 s, SaO2 89 at 30 s. No negative intrathoracic pressure, no pulmonary oedema | forceful efforts against a closed glottis (−20 to −50 cmH2O) → negative-pressure pulmonary oedema in about 0.1 % of laryngospasm (Miller, airway complications); pulsus/paradox during the efforts | **missing** (NPPE, pleural swing); **wrong** (release) |
| E3 kinked ETT (`obstructed` on VCV) 120 s | VT 0, **Paw 5 (= PEEP)**, EtCO2 flat after one breath, apnoea alarms at 17/20 s; PaO2 263 → 150; PaCO2 +14; first breath after release EtCO2 51 | flat capnogram (correct) **with a high peak pressure / Pmax alarm and a low exhaled VT** on the ventilator | capnogram plausible; **pressure wrong** |
| E4 endobronchial (right mainstem) | peak 16.7 → 23.4, Crs 55 → 34; SpO2 99 → 91–92 at 5–6 min (FiO2 0.5; PaO2 67, recovering to 74 with HPV); FiO2 0.3: SpO2 87; withdrawal: PaO2 only 192 (the collapsed lung needs recruiting) | the engine's own band (`lung-unilateral.test.ts:48`) 85–93 %; sudden rise in peak pressure; persisting atelectasis | **plausible** |
| E5 disconnection 240 s | EtCO2 → 0 within one breath; apnoea alarms 17–20 s; SaO2 < 90 at 3.2 min (FiO2 0.5 before); reconnect: EtCO2 56 → 50 | as modelled (Miller, monitoring) | plausible |
| E6 oesophageal intubation after preox | two visible gastric breaths (26, 16 mmHg), then flat; SpO2 99 for 4 min; re-intubation: EtCO2 63 → 55 | < 6 breaths of falling CO2 (Linko 1983); SpO2 falls late after preoxygenation | plausible |

**Mechanism.**
- Bronchodilation (`pk/combine.ts:106` `bus.airway.bronchodilation`) is consumed only by 7e
  (`endo/core.ts:140` `anaphLung: 0.8 * c.cond.anaph.mediator * (1 - 0.6 * bd)`).
- The Stage 3 bronchospasm multiplier is fixed at the command (`pipeline.ts:600`
  `rs.rawEvent = a.state === 'bronchospasm' ? 1 + 5 * Math.min(1, d.severity) ** 1.5 : 1;`), and lung conditions are
  static specs.
- Obstructed cycles have `vt = 0` (`driver.ts:165–170`). The pleural input then returns the resting value
  (`circ/pleural.ts:12` `if (!c || !(c.vt > 0) || t >= c.cutAt) { … return P_PL0 + …peep… }`), and so does the breath
  signal (`driver.ts:348`), so an effort against a closed airway never reaches the heart or the lung.
- The kinked tube drives the lung in pressure mode at PEEP (`pipeline.ts:219`
  `if (!c || !c.exch || t >= c.cutAt || !(c.vt > 0)) return { mode: 'pressure', x: peep };`). The internal VCV is a
  pure flow source with no pressure limit (`:222`), so it never shows a high-pressure state.

### F. Ventilator settings across conditions

| cell | model | expected (source) | verdict |
|---|---|---|---|
| F1 ARDS 1 on VCV 420 × 20 (6 mL/kg), FiO2 0.8, PEEP 5 | PaO2 71 (**P/F 88**), shunt 0.43, Crs 30–31, plateau 18.7, **driving pressure 13.8**; PaCO2 45 → 57 in 13 min (VD/VT 0.63) | severe ARDS: P/F < 100, Crs 20–30, plateau 25–30 at 6 mL/kg with PEEP 10–15 (ARDSNet; Amato 2015, *NEJM* 372:747); VD/VT 0.6 is typical | plausible (slightly soft mechanics) |
| F1 PEEP 10 / 15 / recruitment 40 cmH2O × 30 s / back to PEEP 5 | P/F 112 / 122 / 154; shunt 0.34 / 0.31 / 0.27 / 0.35; atelectasis 0.43 → 0.33; **Crs unchanged (31–33), driving pressure unchanged (13.8)**; MAP 92 → 77, CO 4.97 → 4.1 | in a recruitable lung PEEP 15 plus recruitment raises P/F 1.5–2.5× and *lowers* driving pressure (Gattinoni 2006, *NEJM* 354:1775); de-recruitment within minutes at PEEP 5 | direction right, **too weak** (recruitment without a compliance gain) |
| F2 COPD 1, VCV 500 × 10 → 16 → 24 → 30 | auto-PEEP 4.6 → 8.8 → **14.5 → 18.2**; peak 25 → 56; MAP 88.9 → 79 → 71 → **58**; CO 4.2 → 2.0; CVP 12 → 18 | dynamic hyperinflation → tamponade-like hypotension as RR rises (Barash, mechanical ventilation) | **plausible** |
| F2 disconnect 30 s at RR 30 | lung volume 1686 → 350 mL, **MAP 55 → 65.5**, CO 2.0 → 2.96, HR 97 → 83; re-hyperinflated 20 s after reconnection | the disconnection test restores BP within 30–60 s, often to near baseline (the diagnostic manoeuvre) | mechanism right, magnitude weak |
| F3 OLV (lung `olv` R) at FiO2 1.0, VT 350 × 16 | HPV works (flow to the non-ventilated lung 0.55 → **0.36**, its PVR ×1.95), but the collapsed lung's gas is absorbed (aeration 0.85 → 0.22), total shunt 0.15 → 0.30, **PaO2 593 → 80**, SpO2 92; **PaCO2 44 → 88** (VD 265 at VT 350); sevoflurane 2 % (0.5 MAC): **no change** | OLV at FiO2 1.0: PaO2 150–250, SpO2 < 90 in 5–10 % of cases; lateral position plus HPV bring the non-dependent lung to ≈ 20–25 % of CO; PaCO2 near baseline at VE 5.6 L/min; volatiles < 1 MAC inhibit HPV by about 20 % (Slinger & Campos, Miller thoracic chapter) | **too severe** (confounded by headline 1; no posture); **missing** volatile HPV inhibition |
| F4 7b `ptxTension` R | MAP **30**, CO 0.23, CVP 25, HR 183; SpO2 99 → 52; EtCO2 8; **peak +8.5 (16.7 → 25.2)**; PaCO2 45 → 80 in 15 min; no PEA (08 G1) | obstructive shock, peak and plateau rise 10–20+, PEA within minutes (V.1 plan fixes the plateau: 18.8 → 35.6) | 08 G1 / V.1 |
| F4b 7a `tensionPtx` | MAP 54, CO 1.4, **SpO2 99, peak unchanged**, EtCO2 19–24 | as above | **wrong** (no lung) |
| F4c both | identical to F4 (max-combined, `pipeline.ts:240`): **no double count** | — | consistent |
| F5 bleed 1.5 L, then PEEP 5 → 15 | MAP 68 → **45**, CO 2.93 → **1.71 (−42 %)**, HR 130 → 150; EtCO2 34 → 25 (PaCO2 51 → 53) | PEEP in hypovolaemia causes a disproportionate fall in CO (Barash) | **plausible** (state-dependent) |
| F5b healthy, PEEP 5 → 15 | MAP 88 → 83, CO 4.86 → 4.1 (−15 %); plateau 14 → 24.4 | CO −10 to −25 % | plausible |
| F6 VCV 500 → 300 × 12 (permissive hypercapnia) | **VA 0.42 L/min** (300 − 265 mL): PaCO2 44.8 → 75 → 96 → 135 at 10/20/40 min; SpO2 **19 %** at FiO2 0.5 (O2 delivered 0.21 L/min < VO2); pH 6.96; K 4.22 → 4.87; PAP 18.8 → 19.7 at PaCO2 70 (then +5 once hypoxaemic) | VT 300 × 12 in a 70 kg adult: VA ≈ 1.8 L/min, PaCO2 70–90 over an hour, SpO2 normal at FiO2 0.5; K +0.1–0.3 per 0.1 pH (smaller for respiratory acidosis); hypercapnia and acidosis raise PVR (Nunn ch. 7; Balanos 2003) | **wrong** (dead space); hypercapnic pulmonary vasoconstriction **missing** |

**Mechanism.**
- OLV perfusion (`olv` probe): HPV activation reaches 1.0 on both sides and diverts 36 % of pulmonary flow. The
  volatile term is wired to zero: `pipeline.ts:305` passes `volatileMac: 0` to `lungGasStep`, while 7g publishes
  `bus.hpvInhibit` (`pk/combine.ts:108`) that nothing reads.
- There is no pulmonary-vascular response to PaCO2 or pH anywhere in `circ/model.ts`: PVR is
  `base × drug × ext.pvr × lung` (`:219–220`).

### G. Gas-exchange coupling

| cell | model | expected (source) | verdict |
|---|---|---|---|
| G1a 7a `pe` 1 alone | PAP 19 → **62**, MAP 92 → 71, CO 5.3 → 3.5, CVP **9**, **SpO2 99**, EtCO2 40 → 33, PaCO2 +7 | massive PE: SpO2 < 90, EtCO2 falls ≥ 10 with a widened Pa–Et gap, CVP ≥ 15, mPAP rarely > 40 acutely (a normal RV cannot generate more: McIntyre & Sasahara 1971, *Am J Cardiol* 28:288) | wrong (no gas exchange; 08 G6) |
| G1b 7b `pe` 1 alone | PAP 34, MAP 87, CO 4.5, SpO2 98 (PaO2 155 at FiO2 0.5; shunt 0.12), **EtCO2 22 at PaCO2 49 → 63 (gap 27–34)** | as above | gas plausible, haemodynamics weak |
| G1c both | **mean PAP 117**, MAP 62 → 49, CO 2.2, CVP 11, EtCO2 16–21, SpO2 96 | as above | **wrong** (double count) |
| G1d 7b `pe` 1, awake, spontaneous | RR 15.6 → 18.5, VT 520 → 616 (VA 4.1 → 8.4), **PaCO2 41**, SpO2 95, EtCO2 20 | tachypnoea 25–30+ and hypocapnia (PaCO2 30–35) in most acute PE, from J-receptor and vascular-receptor drive, not only chemoreflex (West, pathophysiology; ESC 2019 PE guideline) | **too weak** |
| G2 Hb 5 (profile), awake | SpO2 96 (correct: saturation is normal); CaO2 67 mL/L; **CO 5.4 unchanged, HR 70**; DO2 366 mL/min (vs 1071 at Hb 15); SvO2 42 %; lactate 1.0 → 1.46 in 20 min | acute isovolaemic anaemia to Hb 5 in healthy volunteers: HR +20–30, CI +50–60 %, no lactate rise (Weiskopf 1998, *JAMA* 279:217); chronic anaemia is a high-output state | **missing** (no CaO2 → CO coupling) |
| G3b MetHb 30 % | SpO2 **84** (SaO2 functional 96), CaO2 138 | the oximeter reads toward 85 % (Barker 1989) | plausible |
| G3 COHb 30 %, then FiO2 1.0 for 60 min | SpO2 97 → 99 (falsely normal: correct); CaO2 138 → 159 and **then constant**: COHb does not fall | COHb half-life ≈ 320 min on air, ≈ 74 min on 100 % O2 (Weaver, *NEJM* 2009;360:1217) | **missing** (no CO kinetics) |
| G4 core pinned 36.8 → 34 → 32 → 30 °C (VCV fixed) | PaCO2 45 → 42.5 → 38.5 → 34.3 (VCO2 −7.5 %/°C); PaO2 131 → 161, SaO2 99.7 (left shift); pH 7.35 → 7.45 | as modelled (Nunn ch. 11; Pulse/ODC temperature term). Whether the ABG reports patient-temperature or 37 °C values is a clinical convention question (Q10) | plausible |
| G5 HCl 250 mmol over 10 min, awake | HCO3 24 → 9.6, pH 7.20, **PaCO2 24.9** (Winter's 22.4 ± 2), RR 18–20, VT 590–655 | Winter's 1.5·HCO3 + 8 ± 2 (Albert, Dell & Winters 1967); Kussmaul breathing | plausible (the upper edge) |
| G5b same, ventilated | pH **7.01**, PaCO2 45 → 50 | uncompensated: as modelled | plausible |
| G6 VF at 600, CPR q 1 → q 0.4 (900) → q 1 (1080) → sinus at 1260 | EtCO2 displayed **20–25** (q 1), **9–10** (q 0.4), 26–29; **ROSC 29 → 52–53** within one breath; PaCO2 45 → 62; Pa–Et gap 25–40; displayed SpO2 98–99 throughout CPR | good CPR EtCO2 > 20, poor < 10; ROSC gives an abrupt rise ≥ 10 mmHg (AHA 2020; Sandroni 2018) | **plausible** (SpO2 during CPR: see the monitor-fidelity audit) |
| G7 bleed 2.5 L / 10 min | EtCO2 40 → 36 → 32 → 25 → **14** as CO falls 4.8 → 4.0 → 3.0 → 1.75 → 0.57; then 14 → 22 at constant CO as PaCO2 rises 52 → 76 | EtCO2 falls with pulmonary flow at constant ventilation (Weil 1985; Ornato) | plausible (08 G1 for the non-arrest) |
| G7b tamponade 1 | EtCO2 40 → 32 as CO 4.84 → 3.27 | as above | plausible |

**Mechanism.**
- `circ/model.ts:219`: `p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungL ?? 1);`. 7a's `pe` 1
  gives `ext.pvr = (1/(1 − 0.8))·(1 + 0.5·0.8) = 7.0` (`circ/conditions.ts:23–26`) and 7b's `pe` row gives `pvr ×3.25`
  (`data/lung-pathology.ts:514`), so the product is ×22.75. The RV (08 G5: no RV ischaemia) produces whatever pressure
  the product demands.
- Dyshaemoglobins come from the profile once (`blood/core.ts:77`
  `… cohb: b.cohb ?? 0, methb: b.methb ?? 0 };`), with no elimination.
- No circulation or endocrine code reads CaO2 or DO2 (grep of `l2/circ`, `l2/endo`, `l2/hemo`).

### H. Capnography fidelity (`probe-capno.ts`, `out/capno.txt`; sidestream, displayed trace)

| configuration | displayed EtCO2 / Pa–Et | phase II 10–90 % | phase III slope | notes | verdict |
|---|---|---|---|---|---|
| normal VCV 12 × 500 | 40.1 / 4.6 | 416 ms | 0.8 mmHg/s | α ≈ 105° (test band) | plausible |
| spontaneous awake | 36 / 3.2 | 448 ms | 0.2 mmHg/s | rounded | plausible |
| airway bronchospasm 0.5 / 1 | 38.6 / 9.7; 36.4 / 15.5 | 1104 / **1856** ms | 1.0 / 2.6 | shark fin | plausible |
| lung bronchospasm 1 (7b) | 29.9 / **19.6** | 1168 ms | 1.1 | less shark-like than the airway event at the same severity | inconsistent |
| lung COPD 1 | 30.1 / **26.9** | 1136 ms | 0.9 | severe COPD Pa–Et 5–15, occasionally ~20 (the engine's own `lung-copd.test.ts:35` band is 5–15 at GOLD 3) | gap large; slope shallow for COPD |
| curare cleft (rocuronium wearing off, 30 min) | 42.2 | 416 ms | — | 4 mmHg notch mid-plateau | plausible |
| rebreathing, FiCO2 5 mmHg | 41.4, baseline **5** | 448 ms | 0.5 | baseline raised; **PaCO2 not** (H1: FiCO2 8 for 20 min, PaCO2 46.6 vs 46.6 control) | **wrong** (physiology) |
| RR 6, VT 700 | 41.8 | 416 ms | 0.2 | cardiogenic ripple only **0.9 mmHg** p-p after the sampler | oscillations barely visible (CARDIO_MMHG 1.5 before the sampler) |
| endobronchial | 38.1 / 8.2 | 1248 ms | 1.1 | bifid second half | plausible |
| massive PE (7b) | 24.3 / **29** | 544 ms | 0.5 | low plateau, large gap | plausible |
| VF + CPR q 1 / q 0.4 | 22.6 / 8.4 | 560 / 1648 ms | — | compression ripple 2.2 mmHg | plausible |
| oesophageal | 16 → 10 → flat | — | — | < 6 gastric breaths | plausible |
| VT below dead space (C1) | **42 → 55** at VT 68 → 11 mL | — | — | full plateau with no alveolar ventilation | **wrong** |
| RR ≤ 6 (D1, D4) | numeric **0–22** between breaths; EtCO2-LOW raised 7 times in 10 min (D1) and 15 times in 14 min (D4) | — | — | 10 s window emptied | **wrong** |
| response to RR 12 → 24 | displayed EtCO2 40 → 33 in 55 s (PaCO2 44.8 → 37.1 in 90 s), then 33 → 24 over 20 min | — | — | two-compartment kinetics (fast then slow) | plausible (Q12) |

**Mechanism.**
- `l3/co2-numerics/co2-numerics.ts:9` `ETCO2_WINDOW_S = 10`, and `:65`
  `const et = recent.length > 0 ? Math.max(...recent.map((b) => b.et)) : Math.max(0, shownNow);`. With no breath in the
  last 10 s the numeric falls to the instantaneous trace.
- `gas/co2.ts:41` `const elim = (st.flow * x.vaLpm * st.pf) / K_CO2;` has no inspired-CO2 term. `fico2` is read only
  by the capnogram (`co2/capno.ts:73, 83, 95`).

### I. Interaction checks

**I-a. State-dependence of the drive.**
- Yes for CO2: the slope falls with opioid, hypnotic and volatile, and synergy is present (table under D).
- Yes for metabolic acidosis (Winter's set point).
- Weakly for hypoxia (one multiplicative factor, not drug-sensitive).
- **No** for pain or arousal (`pain: 0`).
- **No** for induction (no wakefulness-drive loss).
- **No** on the ventilator (the drive is not evaluated there).

**I-b. Ventilator link vs the engine's own ventilator** (`probe-link.ts`, `out/link.txt`; same patient, VC 12 × 500,
PEEP 5, FiO2 0.5, GA; airway `bronchospasm` 1 at 21 min):

| | link, MANUAL | link, MODELED | engine ventilator |
|---|---|---|---|
| 10 / 20 min: PaCO2, displayed EtCO2, PaO2 | 46.1, 43, 246 / 48.4, 45, 251 | 46.5, 42, 234 / 49.0, 44, 236 | 44.8, 40, 263 / 46.6, 42, 265 |
| dead space | 265 (the same bookkeeping) | 265 | 265 |
| bronchospasm, 4 min later: ventilator PIP / PLAT / auto-PEEP / VTE | **35 (Pmax limit)** / 12 / 3.3 / **207 mL** (ventilator R 10 → **60**) | 35 / 12 / 3.3 / 207 | engine peak 31.8, plateau 17.8, total PEEP 10.5; VT 400 (500 × 0.8) |
| gas 4 min / 19 min after | **SpO2 53 → 0**, PaCO2 71 → 116 | SpO2 51 → 0, PaCO2 71 → 108, EtCO2 0 | SpO2 99 → 98, PaCO2 54 → 67 |

Reading:
- At baseline the two paths agree within 2–3 mmHg.
- Under pathology they diverge completely. The link scales the ventilator's resistance by the engine's
  total-resistance **ratio** (`ventilator/src/lung-input.ts` `c.resistance = … b.resistance * (ls.resistanceCmH2OPerLps / ll.ref.resistanceCmH2OPerLps)`),
  which is ×6 because 7b applies the multiplier to the airways, and the ventilator then pressure-limits at its default
  Pmax 35.
- The engine's own VCV is a flow source that delivers any VT at any pressure.
- The link's smaller VT meets the inflated 265 mL dead space and the patient dies of hypoxia in 10 minutes. The same
  bronchospasm on the internal ventilator is survivable.

**I-c. The same disease through two commands.**
- PE: **double-counts** (mPAP 117, G1c).
- Tension pneumothorax: max-combined, **no double count** (F4c), but 7a's alone has no lung (F4b).
- Anaphylaxis 7e + lung `anaphylaxis`: 7e's write-back wins, **no double count**.
  - I2a (7e alone): peak 26.7, MAP 22.
  - I2b (lung alone): peak 24.8, MAP 87.
  - I2c (both): identical to I2a.
- Bronchospasm, airway state + lung condition: **multiplicative**, I2d peak **66**, auto-PEEP **21.7**, SpO2 86, MAP
  78 (`rawEvent` × the condition's `raw`).

---

## 3. Ranked gaps

Severity means: would an anaesthesiologist notice within one minute of using the scenario?

| # | gap | severity | key evidence | code |
|---|---|---|---|---|
| **R1** | **Dead-space bookkeeping**: the t = 0 EtCO2 calibration runs in MODELED, on adult default RR/VT whatever the patient; the ETT adds apparatus without removing the bypassed upper airway; the resting pattern is not derived from the patient | **critical** | VD 265 (man) / 329 (woman) / 459 (child); woman at 7 mL/kg PaCO2 103; VT 300 → VA 0.42 → SpO2 19 %; OLV PaCO2 88; the link in bronchospasm → SpO2 0; the pk-bus `it.fails` | `pipeline.ts:125,311–326,163`; `gas/params.ts:30–34`; `l1/state.ts:31–33` |
| **R2** | **No bronchodilator response** (salbutamol, adrenaline, sevoflurane, ketamine) for airway `bronchospasm`, lung `bronchospasm`/`asthma`/`copd` | **critical** | E1 peak 31.8 / auto-PEEP 5.5 and E1b 44 / 11.9 unchanged after all three | `endo/core.ts:140` (only consumer); `pipeline.ts:600` |
| **R3** | **Induction apnoea and obstruction physics**: no loss of the wakefulness drive (no apnoea after propofol); obstruction is a VT multiplier the drive does not see (RR 41 at VT 200); no negative pleural pressure from obstructed efforts (no NPPE, no paradox); uncapped VT demand (1.57 L; PaCO2 −18 in 30 s); residual-block obstruction independent of arousal | **critical/high** | C4 RR 41, VA 0; C4b no apnoea at Ce 3; E2/E2b; D3 VT 141 at TOFR 0.6 | `spont.ts:88–89`; `lung/drive.ts:36–42`; `neuro/drive.ts:67–69`; `circ/pleural.ts:12`; `driver.ts:348` |
| **R4** | **"GA" lung state is a hidden instructor switch**: FRC, VO2/VCO2 and induction atelectasis ignore drugs, NMB and the airway | **high** | apnoea to 90 %: adult 9.75 vs 7.83 min; child 7.8 vs 2.75 min; I1 FRC 2100 after 40 min of propofol | `pipeline.ts:250,301,635`; `organs/inputs.ts:161` (organs derive it, lungs do not) |
| **R5** | **Capnograph fidelity**: a plateau for breaths smaller than the dead space; a 10 s EtCO2 window at low RR | **high** | C1 EtCO2 42 → 55 and EtCO2-HIGH at VT 68; D1/D4 numeric 0–22, EtCO2-LOW flapping | `capno.ts:67`; `co2-numerics.ts:9,65` |
| **R6** | **One disease, two commands**: PE double-counts PVR; 7a tension PTX and 7a PE have no lung; bronchospasm airway × condition multiply, and the two entries disagree at the same severity | **high** | mPAP 117; 7a PE SpO2 99; peak 32 vs 44, together 66 | `circ/model.ts:219–220`; `circ/conditions.ts:23–29`; `pipeline.ts:600` + the lung `raw` |
| **R7** | **The ventilator link diverges from the engine's own ventilator under pathology** (resistance ratio × Pmax, vs a pressure-unlimited internal VCV) | high | bronchospasm: link VT 207 → SpO2 0; internal VT 400 → SpO2 98 | `ventilator/src/lung-input.ts`; `pipeline.ts:222`; `driver.ts:189` |
| **R8** | **Inspired CO2 is display-only** (rebreathing, exhausted absorber) | medium-high | FiCO2 8 for 20 min: PaCO2 46.6 = control | `gas/co2.ts:41` |
| **R9** | **Internal ventilator has no airway pressure physics and no patient–ventilator interaction**: kink shows Paw = PEEP; no triggering or bucking at emergence | medium | E3 Paw 5; D3 RR 12 fixed | `pipeline.ts:219,222,327`; `driver.ts:165–170` |
| **R10** | **Pregnancy is mechanics only**: no progesterone-driven hyperventilation (PaCO2 41.7; the row's own pitfall says 30), no VO2 rise | medium | apnoea to 90 %: 5.6 min with GA (≈ 3–4 expected) | `data/lung-pathology.ts:739–758` |
| **R11** | **O2 content does not reach the circulation or CO kinetics**: no CO/HR response to anaemia (DO2 1/3, SvO2 42 %); COHb never eliminated | medium | G2 CO 5.4, HR 70 at Hb 5; G3 CaO2 flat for 60 min on O2 | `blood/core.ts:77`; no CaO2 reader in circ/endo |
| **R12** | **Non-chemical respiratory drives missing**: pain/arousal (`pain: 0`), PE/J-receptor hyperventilation, selective anaesthetic depression of the hypoxic response | medium | D4 stimulus: RR unchanged; G1d PaCO2 41 in massive PE; HVR +8–13 % in every state | `spont.ts:84`; `lung/drive.ts:35,41` |
| **R13** | **OLV/HPV**: volatile HPV inhibition wired to 0; no lateral-decubitus perfusion shift; hypercapnia (R1) confounds | medium-low | F3 PaO2 80 at FiO2 1.0; sevoflurane no effect | `pipeline.ts:305` `volatileMac: 0`; `pk/combine.ts:108` unused |
| **R14** | **Recruitment without a compliance gain** (ARDS), weak induction atelectasis, no hypercapnic pulmonary vasoconstriction | low-medium | F1 driving pressure 13.8 at every PEEP; A3b shunt 0.04 at FiO2 1.0; F6 PAP flat at PaCO2 70 | lung module (7b calibration); `circ/model.ts:219` |
| **R15** | **Child respiratory baseline** (V.1 Task 1 covers the CO ratio; **the adult L1 RR/VT/EtCO2 defaults and R1 are not in V.1**) | high for paediatrics | awake child: PaCO2 49–52, displayed EtCO2 18–19, VT 590–706 mL, lactate 1.0 → 3.5 in 15 min; MANUAL PaCO2 98–107, SpO2 67–82; SpO2 display lags 60 s | `gas/delay.ts:29`; `l1/state.ts:31–33`; `pipeline.ts:311–326` |

Not re-counted (08): no emergent arrest (tension PTX at MAP 28 for 15 min, MAP 13 in exsanguination); PE RV
ischaemia; sepsis; MANUAL reflex-free.

---

## 4. Smallest physiological mechanism per gap (no bands, R45)

- **R1, dead space.**
  - (a) The t = 0 EtCO2 calibration belongs to MANUAL: run it only when `l1.mode === 'manual'` or when the instructor
    actually changes the EtCO2 target; do not seed `seen.etco2` with NaN in MODELED.
  - (b) Anatomical dead space 2.2 mL/kg IBW is the awake value with an upper airway. An ETT or SGA replaces the
    extrathoracic part: about 1.0–1.2 mL/kg IBW is removed (Nunn ch. 8) and the device's internal volume plus Y-piece
    and HME is added (apparatus 50–100 mL adult; weight-scaled for children).
  - (c) The healthy resting pattern comes from the patient: VT 7 mL/kg IBW and RR such that
    RR·(VT − VD) = 0.863·VCO2 / PaCO2set, with PaCO2set 40 (pregnancy 31; R10). The L1 rr/vt/etco2 defaults become
    derived values for any profile, not fixed adult numbers.
  - The 7b alveolar dead space (`vdAlv`, e/g factors) already carries the pathology; nothing else is needed.
- **R2, bronchodilation.** One airway-smooth-muscle state per side: effective `raw` multiplier =
  1 + (raw_condition − 1)·(1 − B), where B = the β2 bronchodilation already on 7g's bus (salbutamol, adrenaline)
  OR-combined with volatile (Emax about 0.5 at 1 MAC, already in the rows as `bronchodilation`) and ketamine. Apply it
  to the Stage 3 `rawEvent`, to lung `bronchospasm`/`asthma`/`anaphylaxis`, and to COPD's reversible fraction. Time
  course from 7g's effect site. Removes the need for 7e's private `anaphLung` relief term, which becomes one input of
  the same state.
- **R3, drive and obstruction.**
  - (a) Wakefulness drive: loss of consciousness (7f's depth index below its LOC threshold) removes a tonic VE
    component equal to the awake VE at resting PaCO2 minus the chemoreflex at that PaCO2. The apnoeic threshold rises
    to about resting PaCO2 + 3–5 mmHg under hypnotics (Nunn ch. 5), so apnoea follows induction until PaCO2 climbs past
    it. Propofol 2 mg/kg then gives apnoea of 30–90 s in a healthy adult and longer with opioid.
  - (b) Upper-airway obstruction as an **inspiratory resistance** (7b already has `rTube`/airway R): a collapsible
    upper-airway resistance that rises with obstruction (Pcrit model). Inspiration becomes pressure-driven by the
    patient's Pmus (7b's pMax × drive), so VT falls physically and the drive responds with larger efforts, not a higher
    RR. The pleural swing is the effort (Pmus), not VT/C, so obstructed efforts produce −20 to −50 cmH2O swings: pulsus
    through `circuit.ts`, and NPPE through a capillary transmural pressure term into 7c's lung water (EVLWI) when the
    swing exceeds about −30 cmH2O for more than about 30 s.
  - (c) VT ceiling = inspiratory capacity × pMax × fatigue.
  - (d) The residual-block airway term scales with the depth index (an awake patient compensates with dilator muscle
    tone).
- **R4, GA state.** Derive `anaesthetised` in the resp pipeline from the same inputs the organs use (7f's depth
  below the LOC threshold, or NMB > 0.5 with a hypnotic), with FRC relaxing from awake to GA over about 1–2 min
  (Hedenstierna) and VO2 falling with depth. The `thermal` event remains an explicit override.
- **R5, capnography.**
  - (a) A cycle's sampled alveolar fraction = max(0, 1 − VD_series/VT): the plateau height is the mixed-expirate PCO2,
    which is 0 below the dead space and the full EtCO2 well above it (a Fowler/Bohr washout).
  - (b) EtCO2 numeric = the last detected breath's peak, held until the gas-apnoea timer (20 s) fires, then invalid.
    This is what Philips/GE describe; the monitor-fidelity audit covers the skin side.
- **R6, one disease.** One clinical event per disease and one owner per parameter.
  - PE: 7b's `pe` row owns dead space and shunt; 7a's `pe` owns the vascular obstruction φ. A single `pe` event sets
    both from one φ, and the PVR product is applied once (7a's formula).
  - Tension PTX: 7b's per-side pPtx is the only source; 7a's condition is an alias (the 08 audit's G6).
  - Bronchospasm: the Stage 3 airway state becomes an alias of lung `bronchospasm` with the same severity map.
- **R7, link.** Send the engine's absolute airway resistance and compliance (the lungState already carries them) instead
  of ratios, and let the engine's internal VCV respect a Pmax: flow source until Paw ≥ Pmax, then pressure-limited, so
  both paths deliver the same VT for the same lung. Until R1 lands, the link's VT drop is lethal through the inflated
  dead space.
- **R8, inspired CO2.** Add PICO2 to the CO2 mass balance: elimination = φ·VA·(PACO2 − PICO2)/0.863, with PICO2 from
  `fico2` (the rebreathing and absorber-failure scenarios then raise PaCO2 by ≈ FiCO2 at constant VA, with the
  sympathetic response already in `chemoFactors`).
- **R9, ventilator physics.** Internal VCV with Pmax (as R7). Kink = a tube resistance ×20–50 (Paw rises, VT falls).
  When the drive's Pmus exceeds a trigger threshold during expiration, add a triggered mechanical cycle (assist-control)
  and an effort-dependent asynchrony/bucking flag. The stimulus reaching the drive (R12) supplies the emergence cough.
- **R10, pregnancy.** The row adds a PaCO2 set-point shift (−9 mmHg at term, progesterone) through the same
  `paco2Set` path Winter's uses, VO2 +20–30 % and blood volume/CO from the 7a pregnancy profile when it exists.
- **R11, O2 content.**
  - A tissue-O2 term: when DO2/VO2 falls (CaO2·CO), the sympathetic/endocrine layer raises CO and HR (7e already has a
    catecholamine drive; its input would be an O2 extraction ratio > 0.4). Lactate follows the existing anaerobic
    term.
  - COHb/MetHb as blood state: COHb washout rate ∝ VA × FiO2 (half-life 320 → 74 min); MetHb reduction (+ methylene
    blue as a 7g row).
- **R12, other drives.**
  - `pain` = 7e/7f's stimulus × (1 − antinociception), already computed by 7f, replacing the literal `0`.
  - PE and lung-water J-receptor drive through 7b's condition rows (a `drive` effect).
  - The hypoxic factor receives its own depression term (hypnotic and volatile HVR C50 about 3× lower than for the CO2
    response).
- **R13, OLV.** Pass 7g's `bus.hpvInhibit` (or `macBrain`) into `volatileMac`. Posture: a `position` field
  (supine/lateral) that gives the dependent lung its gravitational perfusion share (≈ 60/40 → 22.5 % to the
  non-dependent lung with HPV, Benumof).
- **R14.** Recruitment updates each unit's compliance (the Venegas curve already exists; recruited units must add
  compliance, not only aeration). Induction atelectasis 5–10 % at FiO2 1.0. PVR × (1 + k·(PaCO2 − 40)) with k ≈ 0.01–0.02
  per mmHg (Balanos 2003), plus an acidosis term.
- **R15.** V.1 Task 1 (own resting CO) plus R1(c) (the patient's own resting pattern). V.1 as planned will still
  inherit the 400 mL calibration for a child profile started on the defaults.

---

## 5. Calibrated tests these fixes would move

These come from grepping `packages/engine-core/test` and `packages/ventilator/test`. The executor must rerun them;
they are expectations, not certainties.

- **R1 (dead space):**
  - `engine/pk-bus.test.ts:22`, the `it.fails` "VA at 12 × 500 exceeds 3 L/min", **should start passing**.
  - `engine/lung-circ.test.ts:17`, the OLV `it.fails`: the rig can drop RR 40 → 14 (its comment blames the calibrated
    dead space).
  - `engine/lung-gas.test.ts:16` (healthy Et = Pa − 3 ± 0.8) and `resp-airway.test.ts:25` (M4 +9–15) must stay.
  - `engine/neuro-spont.test.ts:28` ("the drive holds the MANUAL resting pattern: RR within 10 %, PaCO2 within 2") moves
    if the resting pattern is re-derived. Its intent stays.
  - `engine/cpr-etco2.test.ts:24,39` (quality map 12/20/25/29 at 10/min; −3 mmHg per +10/min) depends on VA and must
    be re-measured.
  - The 08 audit's G11: every circulation test that runs long on 12 × 500 loses its hypercapnic pressor term
    (circ-sanity-1/2, organs-htn, neuro-circ). Expect MAP −2 to −5 mmHg in long runs.
  - Ventilator `link-r36.test.ts` (PH crisis EtCO2 +5.0 is already on the edge) and `link-r27`.
  - The child: `resp-oxygen.test.ts:27` and `blood-stage3-recheck.test.ts:21` (Q-7e-8, with V.1).
- **R2 (bronchodilation):**
  - `engine/resp-capnogram.test.ts:6,24` (α vs severity) and `resp-coupling.test.ts:130` (R27 lungState resistance ×4
    on bronchospasm) must stay: they are measured without a drug.
  - New tests are needed. `endo` anaphylaxis tests (7e's `anaphLung` relief) must reproduce their numbers through the
    shared state.
- **R3 (drive):**
  - `l2/neuro/spont.test.ts`, `engine/neuro-spont.test.ts` (4 tests) and `engine/neuro-acceptance.test.ts:30`
    (residual block → smaller breaths: must stay, now arousal-dependent).
  - `l2/neuro/brainstem-gate.test.ts` and `engine/circ-hypoxic-arrest.test.ts` (FU-3's unventilated rigs: induction
    apnoea changes the first minute).
  - `engine/organs-*` ataxia (Cushing breathing uses the same driver).
  - `resp-coupling.test.ts:61` (obstructive apnoea missed by impedance: must stay).
- **R4 (GA state):**
  - `engine/resp-oxygen.test.ts:8,14` (their rig sends the switch; they must stay green, and a no-switch variant
    becomes an ordinary test).
  - `engine/lung-frc.test.ts:18` (FiO2 1.0 at induction → 6 % atelectasis) now triggers from propofol.
  - `resp-coupling.test.ts:160` (R39-7 GA redistribution) and 7e thermal tests use the thermal event: keep the
    override.
- **R5:**
  - `l3/co2-numerics` unit tests and `engine/resp-airway.test.ts:6` (disconnection: awRR apnoea at 20 ± 1 s).
  - `resp-capnogram.test.ts:54` (sidestream vs mainstream at RR 60).
  - `co2-sampling-skin.test.ts` and `resp-coupling.test.ts:43` (RR three ways).
- **R6:**
  - `circ-sanity-2` H5 (PE CO falls ≥ 10 %), `lung-circ` PE and PTX tests.
  - `ventilator/test/link-r36.test.ts` massive PE (keeps both conditions until the unification; V.1 ruling 6).
  - The calibration rows "massive PE EtCO2/PAP/SpO2".
- **R7/R9:** `ventilator/test/link-core`, `link-r27`, `fidelity`, `vent-corrections` (Pmax behaviour),
  `resp-coupling.test.ts:71` (the 50 Hz link test).
- **R8:** `resp-capnogram.test.ts:97` (rebreathing baseline) stays; a PaCO2-rise test is new.
- **R10:** `lung-frc.test.ts:27` (pregnancy FRC) stays; FU-3's pregnancy validation document (V.1 Task 10 re-runs it).
- **R11:** `engine/blood-oxygen.test.ts`, `l2/resp/blood-view.test.ts:10` (low Hb changes the gas step).
- **R13:** `lung-unilateral.test.ts:18,35` (OLV nadir 88–96 % and shunt 0.2–0.3 at 30 min) and `lung-circ.test.ts:17`.
- **R14:** `lung-recruitment.test.ts:11,32,42` (the shunt bands are met today; a compliance assertion is new).

---

## 6. Proposed scripted respiratory scenario suite (a later stage; the orchestrator inspects these before Ali tests)

All MODELED, adult 40 y 70 kg unless stated, the GA state derived (R4), no hand-sent thermal event. The bands are
starting proposals for Ali (§7); the mechanism comes first (R45).

| # | scenario | pass criteria |
|---|---|---|
| RS1 | Healthy intubated, VCV 12 × 7 mL/kg IBW, PEEP 5, FiO2 0.5; man 70 kg and woman 60 kg | PaCO2 35–42 at 30 and 60 min in both; VD/VT 0.25–0.4; EtCO2 = PaCO2 − 2 to 5 |
| RS2 | Preoxygenated apnoea (propofol + rocuronium, no thermal event): adult / obese 127 kg / term pregnancy / child 4 y | SaO2 90 % at 6.5–9.5 / 2–3.5 / 2.5–4.5 / 2–3.2 min; PaCO2 +8–16 in minute 1 then 3–6/min; child displayed SpO2 lag ≤ 20 s |
| RS3 | Propofol 2 mg/kg, natural airway, room air, no support | apnoea ≥ 30 s or obstructed efforts with VT < 100 mL within 60 s; RR never > 30 during obstruction; flat or low capnogram (EtCO2 display < 15) while VT < dead space; SpO2 < 90 within 2 min |
| RS4 | Full induction sequence (C1) | SpO2 ≥ 95 through 3 min of apnoea after preoxygenation; first BVM breath EtCO2 = PaCO2 ± 5; laryngoscopy MAP +15 % or more without opioid |
| RS5 | Remifentanil 0.1 µg/kg/min, awake → 0.2; naloxone 0.1 mg | RR 6–10 → ≤ 6; PaCO2 +5–15; naloxone RR +3 within 2 min; noxious stimulus 1.5 at 0.1 raises VE ≥ 20 % |
| RS6 | Sevoflurane 1 → 1.5 MAC via SGA | RR ≥ 1.4× awake, VT ≤ 0.7× awake; PaCO2 45–55 at 1 MAC and 55–70 at 1.5 MAC |
| RS7 | Severe bronchospasm on VCV (one event) → salbutamol 250 µg IV, or sevoflurane to 1 MAC | peak ≥ 40, auto-PEEP ≥ 8, shark fin α ≥ 140°, SpO2 falls ≥ 4; within 10 min of salbutamol peak −30 % and auto-PEEP −50 %; untreated no spontaneous improvement |
| RS8 | Laryngospasm (a condition or `obstructed`) 90 s after propofol 1 mg/kg on air | SaO2 < 85 within 60 s; pleural swing ≤ −20 cmH2O with pulsus ≥ 10 mmHg; release: PaCO2 falls ≤ 5 mmHg in the first 30 s; NPPE (shunt + EVLWI rise) after ≥ 60 s of severe effort |
| RS9 | Circuit events on VCV: kink, disconnection, oesophageal, endobronchial | kink: peak ≥ Pmax with a high-pressure state and VT ≤ 20 % delivered; disconnection: EtCO2 0 within one breath, apnoea alarm 20 ± 2 s; oesophageal: < 6 gastric breaths then flat; endobronchial: SpO2 85–93 % at FiO2 0.5 by 10 min, peak +5 or more |
| RS10 | COPD severe, RR 10 → 30, then a 30 s disconnection | auto-PEEP ≥ 15 at RR 30 with MAP −25 % or more; the disconnection restores MAP to ≥ 85 % of the RR-10 value within 30 s |
| RS11 | ARDS severe: PEEP 5 → 15 → recruitment | P/F × ≥ 1.5 and driving pressure lower at PEEP 15 after recruitment in a high recruiter; plateau ≤ 30 at 6 mL/kg; PaCO2 ≤ 60 at RR 25 |
| RS12 | OLV lateral, FiO2 1.0, VT 5 mL/kg × 16 | PaO2 150–250 at 20 min; non-dependent lung flow ≤ 25 %; PaCO2 ≤ 50; sevoflurane 1 MAC lowers PaO2 by 5–20 % |
| RS13 | Massive PE (one command), spontaneous then ventilated | spontaneous: RR ≥ 25, PaCO2 ≤ 35, SpO2 ≤ 92 on air; ventilated: EtCO2 falls ≥ 10 with a Pa–Et gap ≥ 15; mPAP 30–45 (never > 50); CVP ≥ 15 |
| RS14 | Rebreathing: FiCO2 8 mmHg (absorber exhausted) 20 min at fixed VCV | PaCO2 and EtCO2 +6–10; the capnogram baseline 8; HR/MAP rise from the hypercapnic sympathetic term |
| RS15 | Link parity: the same patient and settings through the ventilator link and the internal ventilator, healthy and in severe bronchospasm | PaCO2/EtCO2/SpO2 within 3 mmHg / 3 mmHg / 2 % at 10 and 30 min in both states; peak pressure within 10 %; the same delivered VT |

Each also asserts the healthy counterpart stays quiet: RS3's SGA arm has no hypoxaemia at FiO2 0.5, and RS7's
untreated control does not resolve. A MANUAL run of RS2 and RS9 asserts the same timings.

---

## 7. Open clinical questions for Ali (with the model's numbers)

1. **Default ventilation.** For a 70 kg man on 12 × 500 we show PaCO2 60 at 60 min (47 with GA); for a 60 kg woman
   on 12 × 400 (7 mL/kg IBW), PaCO2 103 at 40 min. Do you agree the intubated healthy adult's VD/VT should be about
   0.3 (Pulse's table: 0.2–0.4), i.e. PaCO2 35–42 at 7 mL/kg × 12? Should the engine's resting spontaneous pattern be
   VT 7 mL/kg IBW at RR 12–14?
2. **Induction apnoea.** Propofol 2 mg/kg in a healthy unpremedicated adult: what apnoea incidence and duration should
   the default patient show (always a short apnoea of about 30–60 s? only with opioid?). We show none: RR 17–20, VT
   300–340 via SGA; on a natural airway RR 41 at VT 200 mL.
3. **Bronchospasm and treatment.**
   - After salbutamol 250 µg IV (or 8 puffs via the ETT), adrenaline 10–50 µg and deepening with sevoflurane 1 MAC:
     how fast and how far should peak pressure and auto-PEEP fall?
   - What is "severe" on VCV 500 × 12: peak ≈ 45–50 and auto-PEEP ≈ 10–15? We show 32/5.5 (airway event) and 44/12
     (lung condition), unchanged by all three drugs.
4. **Laryngospasm.**
   - Should there be a dedicated laryngospasm condition (partial with stridor vs complete)?
   - Should NPPE follow a sustained complete spasm, and after how long?
   - Today `obstructed` gives SaO2 94 → 68 in 60 s on air with no intrathoracic pressure effect, and on release PaCO2
     falls 18 mmHg in 30 s.
5. **Pregnancy.** At term (70 kg, supine, preoxygenated), what SaO2-90 % apnoea time do you teach? McClelland's model is
   roughly half the non-pregnant value; we show 5.6 min (7.8 non-pregnant). Should the pregnant default have PaCO2
   about 30 and the ventilator target EtCO2 28–32?
6. **Residual block.** At TOFR 0.6 after extubation, how should an **awake** patient breathe (VT maintained with a weak
   cough and swallow, per Eikermann) vs a sedated one (obstruction)? We cut VT to 30 % whatever the arousal.
7. **The GA switch.** Should "anaesthetised lungs" (FRC −30 %, VO2 −15 %, atelectasis) follow the drugs automatically,
   or stay an instructor toggle? Without it the adult desaturates at 9.8 min and the child at 7.8 min.
8. **Anaemia.** At Hb 5 we show SpO2 96 (correct) with no rise in HR or CO, DO2 one third, SvO2 42 %, lactate drifting
   to 1.5 in 20 min. For teaching, should acute anaemia produce tachycardia and a high CO first, with lactate only
   below a critical DO2 (about 8–10 mL/kg/min)?
9. **MANUAL apnoea.** In MANUAL, an apnoeic patient sits at SaO2 0 % for 10 min with HR 97 and MAP 78 (the instructor
   owns the rhythm). Is that the intended MANUAL behaviour, or should hypoxic bradycardia and arrest apply in both
   modes (the 08 audit's Q9)?
10. **Temperature and blood gases.** At a core of 30 °C we report the patient-temperature PaCO2 34 and PaO2 161. Should
    the ABG panel show α-stat values (measured at 37 °C, uncorrected), the corrected values, or both?
11. **EtCO2 at slow rates.** At RR 4–5 (opioid) the EtCO2 numeric falls to 0–22 between breaths and the EtCO2-LOW alarm
    flaps. Should the numeric hold the last breath's value until the apnoea timer (20 s)?
12. **CO2 washout speed.** After RR 12 → 24, PaCO2 falls 44.8 → 37 in 90 s, then to 27 at 20 min (about 60 % of the way
    to the new steady state). Is a 15–20 min slow phase right for teaching, or should hyperventilation equilibrate
    faster (within about 5–10 min)?

---

## Appendix — files

- `09-audit-scripts/hooks.mjs`: the JSON import-attribute shim (as 08).
- `09-audit-scripts/runner.ts`: engine creation, command builders `A.*`, the 5 s respiratory sampler (fine 0.1 s
  peak-pressure option), measurement/lungState/alarm capture, table, JSON save.
- `09-audit-scripts/scenarios.ts`: the 78 scenarios (A–I).
- `09-audit-scripts/cli.ts`: runs scenarios by name, prefix or `all` (header: rerun instructions).
- `09-audit-scripts/summarize.ts`: per-step windows and apnoea timings → `out/summary.txt`.
- `09-audit-scripts/view.ts`: any columns of a saved run at any resolution.
- `09-audit-scripts/probe-capno.ts` → `out/capno.txt`: capnogram shapes, gaps and response time.
- `09-audit-scripts/probe-deadspace.ts` → `out/deadspace.txt`: the dead-space table.
- `09-audit-scripts/probe-drive.ts` → `out/drive.txt`: hypercapnic/hypoxic responses by drug state (state poke).
- `09-audit-scripts/probe-link.ts` → `out/link.txt`: the ventilator link vs the internal ventilator.
- `09-audit-scripts/probe-olv.ts` → `out/olv.txt`: per-side perfusion, HPV and aeration during OLV.
- `09-audit-scripts/out/tables.txt`: every scenario at its print resolution, plus the rows around each event.
