# 07 — Physiology integration audit (FU-4, R53)

*Measured audit of how the organ stages link to each other. Engine: `origin/main` 9f864b3 (7fc1f27 plus the RESUME
doc commit), MODELED and MANUAL, seed 7, adult 40 y 70 kg male default profile unless stated. 72 scripted scenarios
plus 5 what-if probes and 2 state probes. Written 2026-09-27 by the FU-4 integration auditor. Read-only on the repo:
all runs used a throwaway worktree.*

Scripts and raw tables: `research/08-audit-scripts/`. Run instructions are in the header of `cli.ts`. A full rerun
takes about 5 minutes. `out/tables.txt` holds every scenario's table at 60 s resolution plus the rows around each
event, `out/summary.txt` gives each step's pre-dose value, nadir and end value (with the drug multipliers and the
baroreflex state), `out/matrix.md` is the propofol state-dependence matrix, and `out/whatif.txt` holds the
sympathetic-withdrawal probes. `out/tables-first-pass-vt500.txt` is the first pass on VCV 12 × 500 mL (see gap G11).

---

## 0. Headline

1. **Nothing arrests.** No condition, drug, or combination of them produces an arrest on main. States include MAP
   13 mmHg with SV 2 mL for 15 min (Ali's case, B7), tension PTX at MAP 33 and CO 0.3 for 24 min, a 2.5 L bleed at
   MAP 22, anaphylaxis grade IV at MAP 25 for 24 min, K 9.8, core 43 °C with pH 6.6, and SpO2 0 % for 10 min. In
   every one the monitor shows **sinus** rhythm at up to 187/min. The only engine-initiated rhythm changes on main are
   adenosine, LAST → VF and magnesium on torsades (`l2/pk/hooks.ts`).
2. **Propofol's effect barely depends on the patient's state.** Propofol 2 mg/kg, measured against a no-drug control
   at the same sim time:
   - healthy: **−9.5 mmHg (−10 %)**, HR **+17**
   - 80 y hypertensive: −11 %
   - AS + CAD: −11 %
   - HFrEF: −10 %
   - severe tamponade: **−13.8 mmHg (−16 %)**, MAP 89 → 73
   - hypovolaemia −1.5 L: −20 mmHg (−25 %), MAP 82 → 60
   - massive PE: −16 %
   - septic shock: −15 %

   **CO does not change in any state** (≤ 0.3 L/min). Neither 4 mg/kg in tamponade (MAP 66) nor 4 mg/kg plus
   remifentanil 2 µg/kg in a healthy adult (MAP 75) collapses anyone.
3. **The mechanism is known and measured.** Propofol and the volatiles only scale the **gain** of the sympathetic
   baroreflex (`gSymp × gv`, gv = 1 − 0.6·E). The reflex output is proportional to the pressure error, so the error
   simply grows until the output is restored: in tamponade the sympathetic error term goes from 10 to 23 after
   propofol. In a what-if probe, removing the sympathetic reflex output (the clinical effect of propofol's central
   sympatholysis) with the circuit left unchanged gives:
   - healthy + propofol 2 mg/kg: MAP **96 → 63** (−34 %, inside the 60–80 % band that the `it.fails` in
     circ-sanity-1 wants)
   - tamponade: **89 → 52**, and **→ 42** with propofol
   - hypovolaemia + propofol: **82 → 11.5**, with kIsch at its 0.2 floor

   The circulation can collapse. The anaesthetic cannot make it collapse.
4. Other gaps an anaesthesiologist would see within a minute:
   - Hyperkalaemia does nothing to the rhythm or the pump. In addition, a hyperkalaemic *profile* draws a normal ECG
     (mods.k 4.2 with blood K 8.5).
   - In VF and during CPR, the coronary model, CBF, the `circ` event's CPP and the endocrine MAP all read the last
     beat before the arrest: CPP 79 and CBF 1.0 throughout VF.
   - The coronary model is LV-only and ignores O2 content.
   - Severe tamponade has no pulsus paradoxus (3 mmHg).
   - The `pe` condition alone leaves SpO2 at 99 % and EtCO2 at 36.
   - The default ventilator (12 × 500 mL) drifts to PaCO2 60, which adds a hypercapnic pressor effect of up to +20 %
     SVR to every long run.
   - In MANUAL mode insults act with no compensation (tamponade MAP 107 → 58, HR 75 → 78). The tracker does *not*
     hold the instructor's BP on current main.

---

## 1. Method and rig

- **Runner** (`runner.ts`):
  - `createEngine({ seed: 7, mode, patient: { ageY 40, sex M, weightKg 70, …, sensors abp/cvp/pap/spo2 } })`.
  - A scripted timeline of `dispatch` bodies, the same shapes the physiology console sends (`actions.ts`).
  - The state is sampled every 5 s by reading the committed pipeline state read-only (`engine.st`), because the
    `truth` event is pruned:
    - circulation: beat-averaged SBP/DBP/MAP over the last 6 s, `circOut`, `baro`, `cor`, `ext`
    - gas exchange and temperature: `resp.o2/co2/etco2/temp`
    - blood: `blood.out`, `blood.core.ab`
    - organs: `organs.brain.cbfRel`, `renal.uopMlMin`
    - drugs and endocrine: `pk.fx`, `pk.bus.cns`, `endo.core.out`
    - HR is the monitor's `measurement` event.
  - "NO-EJECT" means no aortic ejection for more than 3 s (CO 0). "PULSELESS" means a commanded pulseless rhythm. The
    runner yields once per simulated minute.
- **Rig.** Every scenario except I1, A0c and B0s starts intubated (`airwayDevice ett`) on VCV **12 × 600 mL**, PEEP 5,
  FiO2 0.5, with the baseline running to 300 s. The ventilator removes 7f's propofol airway obstruction and hypoxia as
  confounders. The tidal volume is 600 rather than 500 because 12 × 500 settles at alveolar ventilation 2.82 L/min
  and PaCO2 60 (gap G11). Everything was first run at 500 (`out/tables-first-pass-vt500.txt`); the conclusions are the
  same, but the 500 runs sit 5–20 mmHg higher in long scenarios because of the hypercapnic pressor term.
- **Seams.** Two scenarios poke state, and both are labelled as such:
  - G4/G4b cool the core through 7e's test seam `pinCoreTemp`, because no command cools a patient to 28 °C in
    minutes.
  - The W probes set `hemo.circ.prof.gSymp = 0`. These are what-if runs, not engine behaviour.
- **Deltas.** The drug-effect matrix (K) subtracts a no-drug control run at the same sim time. The engine is
  deterministic, so both runs are identical up to the dose.

---

## 2. Scenario results

Numbers are the measured 30 s mean before a step, the nadir after it, and the end of the window. "Expected" is the
textbook-level course with its source.

### A. Healthy adult, single interventions (ventilated, baseline 118/83, MAP 96, HR 73, CO 4.95, CVP 7.7)

| cell | model | expected (source) | verdict |
|---|---|---|---|
| A1 propofol 2 mg/kg | MAP 96 → **86** at +2.8 min (−10 %), HR 73 → **91**, CO −0.07, SV 68 → 55; Ce 3.05 | MAP −25 to −40 %, HR unchanged or slightly lower; sympathetic outflow (MSNA) falls and the baroreflex resets (Miller *Anesthesia*, IV anaesthetics chapter; Ebert 1992, *Anesthesiology* 76:725; Sellgren 1994, *Anesthesiology* 80:534). Engine band: circ-sanity-1 `it.fails` "MAP ≈ 70 % (60–80 %), HR rise < 15" | **too weak; HR goes the wrong way** |
| A1b propofol 1 mg/kg | MAP −6, HR +13 | MAP −10 to −20 % | too weak |
| A2 sevoflurane 2 % dial, 20 min (MAC 0.65 reached) | MAP 96 → 90 (−6 %), HR +16 | at 0.65 MAC MAP −10 to −20 %, HR ≈ unchanged (Miller, inhaled anaesthetics chapter) | too weak; HR wrong |
| A3 PEEP 5 → 15 | CO 4.95 → 4.35 (−12 %), MAP 96 → 94 → 96, CVP 7.7 → 11 | CO −10 to −25 %, MAP held by the reflex when normovolaemic (Barash, mechanical ventilation) | **plausible** |
| A4 bleed 500 mL / 5 min | MAP 94, HR 83, CO −11 % | class I: little change (ATLS) | plausible |
| A5 bleed 1500 mL / 10 min (31 % BV) | HR peak **127**, SBP 92, MAP 80, CO 3.1, lactate 3.3 at 25 min, UOP 6 mL/h | class III: HR 120–140, SBP falling below 90, UOP 5–15 (ATLS) | plausible to slightly weak (calibration row 3) |
| A6 phenylephrine 100 µg | MAP **+24**, HR −14 at 30–60 s | MAP +15 to +25, HR −5 to −15 (brief §4.9 check 1) | plausible |
| A7 ephedrine 10 mg | MAP +7, HR +1 | MAP +10 to +20 %, HR +5 to +15 | weak |
| A8 adrenaline 100 µg | MAP **+28**, HR +13, Ees ×1.52 | large pressor and tachycardic response | plausible (HR on the low side) |
| A9 atropine 0.5 mg | HR 73 → 101 | +20 to +40 | plausible |

**Mechanism (A1, A2).** `l2/pk/data/rows-anaesthetic.ts:25–26`:

```ts
{ target: 'svr', emax: -0.45, ec50: 3.5 }, { target: 'ees', emax: -0.2, ec50: 3.5 }, { target: 'v0Frac', emax: 0.08, ec50: 3.5 },
{ target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
```

`l2/circ/model.ts:197`:

```ts
stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, …
```

At the nadir the drug multipliers are SVR ×0.79, Ees ×0.91, V0 +3.7 % BV (≈ 180 mL) and gain ×0.72. The
sympathetic error `es` rises from 1 to 12, so the delivered SVR is ×0.88 rather than ×0.79. HR rises because the
vagal limb withdraws (the vagal gain is only ×0.72) and the sympathetic HR arm still fires at a large error.
`l2/circ/drugs.ts:5` says "no drug ever moves the baroreflex set point (A11)", so nothing models propofol's reset of
the baroreflex.

### B. Severe tamponade (severity 1 = 250 mL, the engine's maximum)

Tamponade alone (B0), ventilated:
- 1 s after onset: MAP 96 → 73, CO 5.0 → 2.95, PP 18.
- Compensated by 1 min: **MAP 89–92, HR 104–110, CVP 17, PAWP ≈ 17–19 (equalised), CO 3.06, SV 30**.
- Then a slow drift down, as the baroreflex resets: set point 95 → 82 over 45 min, MAP 83 at 45 min.

Spontaneously breathing (B0s): MAP 90, HR 100, CVP 17, and **beat-to-beat SBP swing 3 mmHg**, against 2 at rest.

| step (from compensated tamponade, MAP 89, HR 104, CO 3.06) | model nadir | expected | verdict |
|---|---|---|---|
| B1 propofol 1 mg/kg | MAP **79** (−10), HR 103, CO 3.20 (unchanged), es 10 → 15 | induction in tamponade: profound hypotension, possible cardiac arrest, even with a moderate dose. The patient is on the steep part of Starling and held up by sympathetic tone; keep spontaneous breathing, avoid venodilators and negative inotropes, drain under local anaesthesia (Barash, pericardial disease; Miller, cardiac anaesthesia). Ali (R53): "even a moderate dose can cause haemodynamic collapse and arrest" | **wrong** |
| B2 propofol 2 mg/kg | MAP **73** (−16 % vs control), CO 3.05 (unchanged), es 10 → 19 | MAP < 50, PEA possible | **wrong** |
| B9 propofol 4 mg/kg | MAP 66, CO 3.04 | collapse or arrest | wrong |
| B3 PEEP 10 | MAP 89 → 84, CO 3.06 → 2.90 (−5 %) | positive-pressure ventilation and PEEP worsen tamponade markedly (Barash) | too weak |
| B3b PEEP 15 | MAP 84, CO 2.76 (−10 %) | as above | too weak |
| B4 sevoflurane 2 % | MAP 75 at 20 min, CO unchanged | worsens | too weak |
| B5 bleed 1 L / 5 min | MAP 75, CVP 17 → 9, CO 2.6 | severe decompensation or arrest | too weak |
| B6 chain: propofol 1 + 1 → PEEP 10 → sevo 2 % → bleed 1 L | 79 → 75 → 73 → 71 → **54** (CO 2.3, HR 106, sinus) | arrest well before the bleed | **wrong** |
| B7 Ali's case: propofol 2 + 1 → PEEP 15 → sevo → bleed 2 L | 76 → 70 → 69 → 67 → **13** (CO 0.32, SV 2 mL, HR **187 sinus**, kIsch 0.24 → 0.20, EtCO2 11–16, SpO2 **98–99**) for 15 min | PEA arrest | **wrong: reproduces Ali's finding exactly** |
| B8 tamponade 0.8 (200 mL) + propofol 2 | MAP 95 → 82, CO 3.9 → 4.1 | as B2 | wrong |

**Mechanisms (confirmed in code):**
- (a) Anaesthetic sympatholysis is a gain scale, as described under A. The compensated tamponade patient's tone is an
  error-proportional reflex output, so the error doubles and the output comes back. It saturates only at SYMP_SAT 0.6
  and 12 mL/kg of venous recruitment (`baroreflex.ts:24,50`).
- (b) Pericardial–pleural coupling **exists**: `circuit.ts` has `const ext = pit + ct + peri`, so PEEP does add to
  the pericardial constraint (FU-4 item 5's worry is only half true). The effect is small because the reflex
  recruits volume (Pmsf rises from 18.4 to 19.4 under PEEP 15) and because the cardiopulmonary limb reads transmural
  RA pressure. No mechanism makes PEEP's effect larger in tamponade than in health.
- (c) Tamponade is a static volume, `conditions.ts:21`: `m.ext.vFluid = TAMPONADE_ML * s;` with `TAMPONADE_ML = 250`.
  There is no accumulation rate and nothing beyond 250 mL.
- (d) No pulsus paradoxus. `SPONT_SWING_CMH2O = 4` (`params.ts:98`) gives a pleural swing of about 3 mmHg, and nothing
  raises the inspiratory effort of a dyspnoeic tamponade patient. Ventricular interdependence through the shared
  pericardium is present but gets too little swing to act on.
- (e) No low-flow arrest (gap G1).

### C. Hypovolaemia (bleed 1.5 L over 10 min, then +5 min)

- The bleed alone (C0) stabilises at MAP 80, HR 97–108, CO 3.2–3.4 and lactate 3.7 at 30 min.

| step | model (Δ vs control) | expected | verdict |
|---|---|---|---|
| C1 propofol 2 mg/kg | MAP 82 → **60** (−20 mmHg, −25 %), HR 120 → 116, CO 3.08 → 2.89 | severe hypotension or arrest; dose must be cut by 50–80 %. In haemorrhagic shock, propofol concentrations **and** potency rise (Johnson 2003, *Anesthesiology* 99:409, porcine haemorrhage; Miller) | too weak |
| C2 sevoflurane 2 % | MAP 67 at 20 min | worsens | too weak |
| C3 spinal-like sympathectomy | **no such model.** The only "neuraxial" switch is thermal (`thermal.anaesthesia = 'neuraxial'`), which changes nothing haemodynamic (MAP 80) | profound hypotension in a hypovolaemic patient | **missing** |
| C4 bleed 2.5 L / 10 min (51 %) | MAP **22**, CO 0.74, HR 184, kIsch 0.46 at 10 min, then MAP 36, HR 183 → **116** (the baroreflex resets), CO 1.25, lactate 7.7 at 40 min; sinus throughout | class IV: PEA/bradyasystolic arrest within minutes of MAP < 30; before that a paradoxical (Bezold–Jarisch/vagal) bradycardia (ATLS; Barcroft–Edholm) | **wrong** (no arrest; the HR falls through reflex resetting rather than decompensation) |

The propofol peak effect-site concentration hardly depends on flow:
- healthy (CO 5.3): 3.05 at +180 s
- hypovolaemic (CO 3.1): **3.46**
- tension PTX (CO 0.38): **3.66 at +210 s**

`pkCtx.coLpm` reaches only the volatile model (`l2/pk/pipeline.ts:356`). The Eleveld compartments are not scaled by
cardiac output or blood volume (gap G10).

### D. Massive PE (severity 1, φ 0.8)

| step | model | expected | verdict |
|---|---|---|---|
| D0 `pe` 1 alone | MAP 96 → 66 → 75–84 (compensated), HR 115, CO 3.4, **CVP 9**, **SpO2 99 %, EtCO2 30–36** | massive PE: RV dilatation and failure, CVP ≥ 15, SpO2 < 90 %, EtCO2 falls by ≥ 10 mmHg, frequent PEA (ACLS "T": thrombosis) | **wrong on gas exchange**; CVP too low |
| D3 `pe` + 7b `lungCondition pe` 1 | MAP 47 → 62, CO 2.0–2.35, SpO2 95, EtCO2 17–23, PaCO2 76 (gap 50) | as above | closer. It needs two commands for one disease (calibration row 5 suspected this) |
| K-pe propofol 2 mg/kg | MAP 84 → 67 (−16 % vs control), CO unchanged | collapse or arrest (RV ischaemia spiral) | too weak |
| D1/D2 + PEEP 15 | CO 3.76 → 2.96 (−21 %), MAP −7 | worsens RV afterload | plausible direction |

**Mechanism.**
- `conditions.ts:25` sets only `m.ext.pvr`; there is no dead-space or shunt effect unless 7b's lung condition is also
  sent.
- `model.ts:220`: `m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * …`, with **no `kIsch` term**. The RV has no
  coronary supply/demand, so the RV ischaemia death spiral of PE cannot occur.

### E. Tension pneumothorax (10 min, then PEEP 15)

| step | model | expected | verdict |
|---|---|---|---|
| E1 7b `lungCondition ptxTension` 1 R (pPtx 25) | within 25 s: MAP **33–37**, CO 0.31–0.38, SV 2, CVP 26, HR **177–181 sinus**, SpO2 58, EtCO2 7–12; 10 min unchanged | obstructive shock → PEA within minutes. The catalogue row itself says "PEA ≈ 20–25" (`data/lung-pathology.ts:471`) | **wrong** (no PEA) |
| E1 + PEEP 15 | **CO 0, NO-EJECT, rhythm "sinus" 180** | PEA | **wrong**: electromechanical dissociation with no rhythm consequence |
| E2 7a `tensionPtx` 1 (pPtx 20, bilateral) | MAP 55–61, CO 1.4–1.5, HR 118–140; + PEEP 15 → MAP 33, CO 0.31 | as above | inconsistent with E1 |

**Mechanism.**
- Two tension PTX implementations: 7a's `PTX_MMHG = 20` (`conditions.ts:14`) is added to the whole pleural pressure,
  while 7b's is 25 mmHg on one side, max-combined (`resp/pipeline.ts:239`).
- The PEA the catalogue expects has no pathway (gap G1).

### F. Sepsis, anaphylaxis, MH

| cell | model | expected | verdict |
|---|---|---|---|
| F0 septic shock, warm, severity 1 | at 40 min: MAP 66, **HR 185** (= hrMax 180 + measurement), CO 4.5, SV 25, lactate 11, pH 6.99, PaCO2 84 on fixed ventilation, kIsch 0.79 | hyperdynamic: CO 7–9, HR 110–130, low SVR (the tables' 7e row). The existing `it.fails` Q-7e-7 reports HR 131 and CO 5.0 in its rig | **wrong** (known, worse on this rig) |
| F1 sepsis + propofol 2 mg/kg | MAP 80 → 63 (−15 % vs control) | severe hypotension | too weak |
| F2 anaphylaxis severity 1 (grade IV), untreated | MAP 88 (1 min) → 40 (4 min) → **25–28 from 10 to 25 min**, HR 184, CO 2.6–2.9, kIsch **0.20** (floor), sinus | Ring–Messmer grade IV **is** cardiac or respiratory arrest | **wrong** |
| F3 anaphylaxis + PEEP 15 | MAP 19–22, CO 1.3 | arrest | wrong |
| F4 MH (condition `mh` 1) under sevo, untreated 50 min | EtCO2 53/79/112/137, T 37.0/37.9/40.4/43.1 °C, pH 7.25/7.08/6.88/6.62, K 4.5/5.3/6.7/7.4, lactate 19, **MAP 110–125**, HR 183, sinus | fulminant MH, untreated: hyperkalaemic VF/arrest, historic mortality around 70–80 % (MHAUS; Miller, MH chapter) | **wrong** (no arrest; hypertensive at pH 6.6) |

**Mechanism.**
- Sepsis stage 3: `endo/conditions.ts:33` sets `hrF: 1.3, svrF: 0.4, eesF: 0.8, dV0Frac: 0.12, …`, multiplied on top of
  a maximal baroreflex. The HR saturates at hrMax. No myocardial O2 or K pathway reaches the rhythm.
- The contractility loss from acidosis is present (`circ-adapter.ts:60`, pH < 7.2 → ×0.3 floor) but is overridden by
  the catecholamine and reflex terms.

### G. Electrolytes and temperature

| cell | model | expected | verdict |
|---|---|---|---|
| G1/G2/G2b profile K 7.5/8.5/9.5 | blood K 7.5/8.6/9.6, **ECG `mods.k` 4.2** (normal ECG), HR 73, MAP 97, sinus | peaked T → wide QRS → sine wave → VF/asystole from K ≈ 8–9 (ALS guidelines, hyperkalaemia) | **wrong (bug + missing)** |
| G3b burns + succinylcholine 1.5 mg/kg | K 4.2 → **9.8** peak (10.5 in a probe), ECG k 9.85 (sine-wave morphology), **HR 74, MAP 95, sinus, kChem 1.00** | sux in burns: hyperkalaemic VF/asystole (Miller, neuromuscular blockers) | **wrong** |
| G3 bleed 2.5 L, then 10 u RBC (35 d) over ≈ 10 min, no calcium | K max 6.4, iCa nadir **0.93**; haemodynamics restored (MAP 89) | K up to 6–7 and iCa 0.6–0.9 with rapid transfusion | plausible (iCa on the mild side) |
| G4 core cooled 36.8 → 28 °C (awake, ventilated) | HR 73 → 60, MAP ≈ 95; **shivering continues to 28 °C**, so VO2 rises: lactate **16.5**, PaCO2 115, pH 6.87 | shivering stops below about 30–31 °C; VCO2 falls about 8 %/°C | **wrong (7e thermal)** |
| G4b same under propofol + rocuronium | HR 74 → **44**, MAP 96 → 73, PaCO2 → 20 (VCO2 falls on a fixed ventilator), **sinus throughout** | HR 40–50 at 28 °C is plausible; AF below 32 °C is common; VF risk at < 28–30 °C (ERC hypothermia) | HR plausible; **rhythm missing** |

**Mechanism.**
- `blood/circ-adapter.ts:61`: `return acid * Math.min(1, (iCa / 1.1) ** 1.5);` has no K term, although the `ext.kChem`
  comment in `model.ts` says "K, Ca, pH".
- `blood/pipeline.ts:210`: `return { k: bs.core.out.kEcg - bs.core.so.set.k, … }`. The ECG gets the **change** from the
  profile's K, so a hyperkalaemic profile shows a normal ECG.
- `l2/ecg/morphology/electrolytes.ts` is morphology only. No rhythm rule reads K or temperature.

### H. Vagal

| cell | model | expected | verdict |
|---|---|---|---|
| H1 fentanyl 10 µg/kg, no atropine | HR 73 → 68, MAP 96 → 90 | HR −15 to −30 %; severe bradycardia is common at high dose (Miller, opioids) | too weak |
| H1b remifentanil 3 µg/kg bolus | HR 73 → 68 | bradycardia; asystole reported after boluses | too weak |
| H2 succinylcholine 1.5, then 1 mg/kg at +5 min | HR 73 → 73, K +0.4 | a second dose causes sinus bradycardia, junctional rhythm or asystole (Miller) | **missing** |
| H3 neostigmine 0.05 mg/kg, no glycopyrrolate | HR 73 → **55** at 15 min | bradycardia (possibly severe) | plausible (onset slow) |

**Mechanism.** The opioid rows are `hr emax −0.25`, a multiplier on the rate set point. Nothing is modelled as a vagal
event (a sudden RR prolongation, AV block, or sinus arrest), and there is no sux cholinergic hook in `hooks.ts`.

### I. Apnoea after induction (propofol 2 + rocuronium 0.6 mg/kg, no ventilation)

| time | SpO2 | PaCO2 | HR | MAP | rhythm |
|---|---|---|---|---|---|
| 4 min | 91 % | 66 | 91 | 94 | sinus |
| 5 min | 66 % | 70 | **56** (hypoxic bradycardia fires at SaO2 < 0.6) | 88 | sinus |
| 7 min | 7 % | 76 | 51 | 91 | sinus |
| 10–20 min | **0 %** | 87 → 123 | 52–55 | **94–97** | **sinus** |

Lactate reaches 4.4 at 20 min. Expected: bradycardia, then PEA or asystole within minutes of SpO2 < 50 %. **Wrong**;
FU-3 Task 5 is building this pathway. Note also that the pulse oximeter shows "0 %" rather than a dropout, and that
the coronary supply ignores CaO2 (`coronary.ts:48`), so hypoxaemia cannot reach the myocardial O2 balance.

### J. Overdose

| cell | model | expected | verdict |
|---|---|---|---|
| J1 propofol 4 mg/kg + remifentanil 2 µg/kg, healthy 40 y | MAP 96 → **75** (−22 %), HR 73 → 79, CO unchanged | MAP around 50–60, HR down | too weak |
| J2 same, 80 y hypertensive (baseline 153/89, MAP 122) | MAP 122 → 90 (−26 %), HR 68 | MAP −40 to −50 %, possible arrest in the frail | too weak |
| J3 80 y hypertensive, propofol 2 mg/kg | MAP 122 → 108 (−11 %), HR +12 | −30 to −40 % in elderly hypertensives (Miller, geriatric chapter; Reich 2005, *Anesth Analg* 101:622, post-induction hypotension) | **too weak** |

### K. Propofol state-dependence matrix (propofol 2 mg/kg minus a no-drug control at the same time; `out/matrix.md`)

| operating point | pre MAP | pre HR | pre CO | ΔMAP nadir | ΔMAP % | ΔHR | ΔCO | min MAP | arrest |
|---|---|---|---|---|---|---|---|---|---|
| healthy 40 y | 96 | 73 | 4.95 | −9.5 | −10 % | **+17** | −0.07 | 86 | no |
| 80 y hypertensive | 122 | 68 | 4.72 | −13.4 | −11 % | +12 | +0.04 | 109 | no |
| AS + CAD + HTN 75 y | 117 | 68 | 5.23 | −12.4 | −11 % | +12 | −0.04 | 105 | no |
| HFrEF 60 y | 87 | 70 | 5.45 | −8.7 | −10 % | +14 | 0.00 | 78 | no |
| tamponade 0.8 (vs pre-dose) | 95 | 88 | 3.88 | −12.0 | −13 % | +7 | +0.08 | 83 | no |
| **tamponade 1** | 89 | 104 | 3.06 | **−13.8** | **−16 %** | +3 | +0.02 | 73 | no |
| hypovolaemia −1.5 L | 82 | 120 | 3.08 | −20.0 | −25 % | +7 | −0.28 | 60 | no |
| massive PE | 84 | 115 | 3.76 | −13.3 | −16 % | −2 | −0.08 | 67 | no |
| tension PTX (7b) | 37 | 181 | 0.38 | −7.8 | −21 % | 0 | −0.16 | 29 | no |
| septic shock (warm) | 80 | 181 | 4.55 | −12.0 | −15 % | 0 | −0.02 | 66 | no |
| MANUAL healthy (vs pre-dose) | 107 | 75 | 6.57 | −22.6 | −21 % | 0 | −0.34 | 84 | no |
| MANUAL hypovolaemia | 53 | 80 | 3.26 | −16.4 | −30 % | +3 | −0.47 | 38 | no |

**Reading.**
- State-dependence exists only through the Frank–Starling slope of the circuit, which is a 1.5–2.5× amplification in
  preload-dependent states. It is not the order-of-magnitude change seen clinically.
- Chronic cardiovascular disease profiles (elderly HTN, AS + CAD, HFrEF) behave exactly like the healthy adult.
- CO never falls, because the reflex re-recruits the venodilated volume and the SVR fall unloads the ventricle.
- MANUAL (no reflex) gives about twice the MODELED effect, which isolates the reflex as the buffer.

**What-if: the sympathetic reflex output removed (`gSymp = 0` state poke; `whatif.ts`, `out/whatif.txt`).**

| probe | MAP pre → nadir | HR | CO | CPP / kIsch |
|---|---|---|---|---|
| W1 healthy, sympathetic removed | 96 → 82 | 73 → 72 | 5.0 → 4.84 | 68 / 1.00 |
| W5 healthy, sympathetic removed + propofol 2 | 96 → **63** (−34 %) | 78 | 4.41 | 52 / 1.00 |
| W2 tamponade, sympathetic removed | 89 → **52** | 104 → 85 | 3.1 → 2.63 | 34 / 1.00 |
| W3 tamponade, sympathetic removed + propofol 2 | 89 → **42** | 87 | 2.63 | 28 / 1.00 |
| W4 hypovolaemia, sympathetic removed + propofol 2 | 82 → **11.5** | 106 | 0.74 | 9 / **0.20** (floor) |

Conclusion: the circuit and conditions are strong enough. Modelling propofol's central sympatholysis as a suppression
of the **output** would put healthy induction inside the target band and make tamponade and hypovolaemia collapse.
Even then nothing would arrest, because of G1.

### L. MANUAL mode

MANUAL baseline differs from MODELED: 135/89, MAP 107, CO 6.6, from the L1 defaults.

| cell | model | comment |
|---|---|---|
| L-B0 tamponade 1 | MAP 107 → **58**, HR 75 → 78, CO 3.07, held flat for 25 min | no reflex, no tachycardia. The set-and-hold tracker stops 8 s after its target is met (`MANUAL_HOLD_S = 8`, `hemo/pipeline.ts:290`), so later insults act unopposed |
| L-B6 chain | 58 → propofol 52 → 50 → PEEP 51 → sevo 51 → bleed **37**, HR 78–88, sinus | no arrest |
| L-C0 bleed 1.5 L | MAP 52, HR 77 | no tachycardia (HR is the instructor's in MANUAL) |
| L-C1 + propofol 2 | MAP 53 → **38** | |
| L-C4 bleed 2.5 L | MAP **10–16** for 35 min, CO 0.5–0.9, HR 87–98 sinus | no arrest |

Finding: on current main the MANUAL pressure tracker **does not hold the instructor's BP against later insults**. It
is set-and-hold, so insults act on the circuit with no reflex at all. This differs from FU-4 item 4(b)'s assumption;
Ali's "BP held until the bleed" was the MODELED reflex (B7 reproduces it). MANUAL needs the same arrest pathway (G1),
and Ali needs to rule whether MANUAL shows reflex-free physiology (Q9).

### X. Commanded VF + CPR (probe for the arrest pathway)

VF at 300 s, CPR from 330 s, adrenaline 1 mg at 450 s:
- CO 1.3–1.6 L/min, MAP 47–54, EtCO2 11 → 20–24.
- **The `circ` event's CPP reads 79, kIsch stays 1.00, CBF 1.00–1.49, and UOP 84 mL/h in VF.** All of these are
  last-beat values, stale during the arrest.

Code:
- `coronary.ts:40`: `const b = beats[beats.length - 1]; if (!b) return;` The coronary model stops updating when beats
  stop.
- `organs/inputs.ts:146`: `map: site.map` is the last completed site beat.
- `endo/adapters.ts:60`: `mapOf` is the last beat's MAP.
- `hemo/pipeline.ts:423`: `cpp: lb ? lb.aoDia - lb.lvedp : 0`.

Paradis 1990 (*JAMA* 263:1106): CPP ≥ 15 mmHg during CPR is necessary for ROSC. The model cannot compute a
CPR-phase CPP at all.

---

## 3. Ranked gaps

Ranked by severity, meaning whether an anaesthesiologist would notice within one minute. Each gap lists the measured
evidence and the confirmed code location.

| # | gap | severity | evidence | code |
|---|---|---|---|---|
| **G1** | **No emergent arrest from low flow, ischaemia, hypoxia, K or temperature.** kIsch is floored at 0.2, the rhythm never changes, and a no-ejection state still shows "sinus 180" | **critical** | B7 MAP 13 / SV 2 for 15 min; E1 CO 0 with "sinus 182"; C4 MAP 22; F2 MAP 25 for 24 min; I1 SpO2 0 for 10 min; F4 pH 6.62 and K 7.4 | `coronary.ts:52` `Math.max(0.2, 1 - G_ISCH * c.delta)`; `hooks.ts` only has adenosine/LAST/Mg; `hemo/pipeline.ts:204` perfusion follows the rhythm id only |
| **G2** | **Anaesthetic sympatholysis is a gain scale, not an output suppression**, and no drug resets the baroreflex. The result is state-independent ΔMAP, unchanged CO and HR rising under propofol and sevo | **critical** | matrix: −10 % healthy, −16 % tamponade; HR +17; what-if: 63 / 42 / 11.5 | `model.ts:197` `gSymp: m.prof.gSymp * de.gv`; `rows-anaesthetic.ts:25–26`; `drugs.ts:5` (A11); `baroreflex.ts` outputs ∝ es |
| **G3** | **Hyperkalaemia is ECG morphology only** (no conduction effect, no arrhythmia, no contractility effect); the profile K never reaches the ECG | critical | K 9.8: HR 74, MAP 95, sinus; profile K 8.5 → mods.k 4.2 | `circ-adapter.ts:61` (no K); `blood/pipeline.ts:210` (delta vs profile) |
| **G4** | **Last-beat state is read during arrest and CPR** (coronary, organs, endocrine, `circ` event CPP) | high | VF: CPP 79, CBF 1.0, kIsch 1.0, UOP 84 | `coronary.ts:40`, `organs/inputs.ts:146`, `endo/adapters.ts:60`, `hemo/pipeline.ts:423` |
| **G5** | **The myocardial O2 balance is LV-only and blind to O2 content** (no RV ischaemia; hypoxaemia never reaches the heart) | high | PE: CVP 9, no RV spiral; I1 SpO2 0 with kIsch 1.0 | `model.ts:220` (kRv without kIsch); `coronary.ts:48` (supply without CaO2) |
| **G6** | **Obstructive-shock phenotypes**: tamponade has no pulsus and a weak PEEP effect, is a static volume capped at 250 mL; PE needs two commands for one disease; two tension PTX models disagree | high | B0s swing 3 mmHg; B3 −5 mmHg; D0 SpO2 99; E1 MAP 33 vs E2 60 | `conditions.ts:11–29`; `params.ts:98`; `resp/pipeline.ts:239` |
| **G7** | **No acute vagal events or pre-arrest bradycardia**: sux repeat, opioid boluses, Bezold–Jarisch in severe hypovolaemia; HR sits at hrMax 180 in every shock | high | H2 HR unchanged; H1b −5; C4, E1 and B7 HR 177–187 | opioid rows `hr −0.25`; `profile.ts:111` `hrMax: 208 − 0.7·age` |
| G8 | **Terminal systemic states do not terminate**; sepsis is not hyperdynamic | medium | F0 HR 185, CO 4.5; F2 grade IV, no arrest; F4 MAP 110 at pH 6.6 | `endo/conditions.ts:33,42`; G1 |
| G9 | **MANUAL mode**: insults act unopposed and without reflex; no arrest; MANUAL and MODELED baselines differ (135/89 vs 118/83) | medium (a design question) | L-B0 58, L-C4 MAP 10 for 35 min | `hemo/pipeline.ts:290` set-and-hold |
| G10 | **IV PK is insensitive to flow** (shock does not raise propofol concentration or delay it) | medium | Ce 3.05 vs 3.46 (CO 3.1) vs 3.66 (CO 0.38), onset 180 vs 210 s | `pk/pipeline.ts:356` (coLpm reaches volatiles only) |
| G11 | **Default ventilation 12 × 500 → VA 2.82 L/min → PaCO2 60**, feeding the hypercapnic pressor term (+1 %/mmHg above 50, up to +20 % SVR) and CBF ×1.5 into every long ventilated run | medium (confounder) | `probe-va.ts`: PaCO2 50/57/60 at 10/30/60 min; VT 600 → 42 | known `it.fails` `pk-bus.test.ts:22`; `model.ts:176` |
| G12 | **Thermal**: shivering continues to 28 °C; no hypothermic AF/VF | medium | G4 lactate 16.5, PaCO2 115; G4b sinus at 28 °C | 7e thermal cascade; no temperature rhythm rule |
| G13 | Baroreflex resetting in 7 min erodes compensation during shock | low–medium (question) | C4 HR 183 → 116 at MAP 36; tamponade set point 95 → 80 | `baroreflex.ts:35` `RESET_HOLD_S = 420`, gain 0.35 |
| G14 | **Oximetry**: SpO2 reads 98–99 % at MAP 13 and SV 2 mL; shows "0" rather than a dropout at SaO2 0 | low (visible) | B7, I1 | pleth or SpO2 validity is not tied to pulse amplitude in near-arrest |
| G15 | Ephedrine and fentanyl slightly weak; the adrenaline HR response is low | low | A7 +7 MAP; A8 HR +13 | rows (calibration, R44) |

---

## 4. Smallest physiological mechanism per gap (no bands, R45)

- **G1, low-flow arrest (FU-4 item 4).** Build one myocardial energy balance that both FU-3's hypoxic PEA and FU-4
  use:
  - Supply is computed continuously from pressures, not from the last beat (see G4):
    - LV: `(Pao_diastolic − LVEDP)` while beating; `(Pao relaxation − RAP)` during CPR.
    - × diastolic time fraction × **CaO2 / CaO2,0** (G5).
  - Demand is the existing RPP/wall-stress term.
  - **Remove the 0.2 floor.** Let kIsch → 0 with a time constant, so a deficit that persists drives Emax toward zero
    (SV → 0, a pulseless state).
  - **Electrical consequence:** when the energy deficit persists (kIsch < about 0.3 for more than 30–60 s, or MAP
    below the coronary zero-flow pressure for about 60 s), the rhythm engine receives a request. Ischaemic or hypoxic
    bradycardia comes first, then either PEA (an organised QRS with no ejection, with the `pulseless` flag set) or VF.
    VF should be a hazard that rises with ischaemia × catecholamines × K × temperature. These requests go through the
    same `rhythmRequest` path 7g already uses (`hooks.ts`), extended with inputs from the circulation and blood.
  - **ROSC** through the existing CPR model: CPP ≥ 15 mmHg sustained (Paradis 1990) plus reperfusion lets kIsch
    recover and the rhythm return (defibrillation for VF).
  - Applies in MODELED and MANUAL alike.
- **G2, anaesthetic sympatholysis as output suppression.**
  - Represent resting sympathetic tone explicitly:
    - SVR = R_intrinsic × (1 + tone + reflex)
    - venous V0 = V0_intrinsic − (tone + reflex)·gV
    - The profile stabiliser splits today's base values into intrinsic × tone so the resting point does not move.
  - Anaesthetic agents act on the total central sympathetic **output**, `(tone + reflex(es)) × (1 − I(Ce, MAC))`,
    where I is a Hill curve of propofol Ce and of volatile MAC with Imax around 0.8–0.9 (MSNA suppression: Ebert 1992,
    Sellgren 1994). They also shift the baroreflex set point down (reset: the A11 rule is revisited for anaesthetics
    only).
  - The direct vascular terms in the rows (SVR −0.45·E, V0 +8 %·E) then shrink to their direct smooth-muscle share.
    State-dependence follows automatically: patients whose pressure depends on tone lose it. The what-if shows the
    size.
- **G3, potassium.**
  - Drive the ECG's `mods.k` from **absolute** blood K when blood owns K, rather than the delta from the profile; keep
    the delta only for the instructor's `setModifiers`.
  - K → conduction: sinus rate depression, PR/QRS widening (already morphological), AV block at K > 8, then a
    sine-wave → VF/asystole hazard at K > 9 (ALS).
  - Add a K term in `kChem` (depressed contractility at K > 8).
  - Add a calcium stabilisation term that shifts the K thresholds.
- **G4, no-beat states.** One circulation accessor ("current arterial pressure and flow") used by the coronary model,
  7d and 7e in place of `beats[last]` and `lastSite`. It is computed from the continuous `circOut`, averaged over
  about 2 s, with CO taken from the `qFwd` that already exists.
- **G5, a right-ventricular coronary term.**
  - RV perfusion pressure = MAP − mean RV pressure (the RV is perfused through both systole and diastole).
  - RV demand ∝ RV systolic pressure × HR.
  - kIschRv feeds `m.kRv`. The same CaO2 factor applies. This produces the PE and RV-infarct spiral.
- **G6, obstructive shock.**
  - Tamponade: an accumulation rate (mL/min) up to a pericardial-reserve-dependent limit, not a static 250 mL.
  - Spontaneous inspiratory effort that rises with dyspnoea or low PaO2 (a 7f drive hook), so pleural swings of 8–15
    cmH2O produce pulsus through the interdependence already in `circuit.ts`.
  - PE: one clinical event that drives both 7a (PVR) and 7b (dead space/shunt) — the catalogue already has the lung
    row; one alias is enough.
  - Tension PTX: one pressure source (7b's per-side pPtx), with 7a's condition as an alias to it, and optionally a
    per-breath build-up on PPV.
- **G7, vagal events.** A vagal-event channel in the rhythm engine: a sudden RR prolongation or sinus arrest with a
  probability or dose relation for:
  - sux (especially the second dose)
  - opioid boluses
  - neostigmine
  - an empty-ventricle (Bezold–Jarisch) trigger when LVEDV < about 40 % of baseline in hypovolaemia

  HR in shock is then set by reflex minus vagal events rather than sitting at hrMax.
- **G8.** This follows from G1 and G3. Sepsis hyperdynamics are the existing Q-7e-7 calibration row: a vasoplegia
  mechanism with high output (venodilation plus arteriolar vasoplegia, preserved Emax).
- **G9.** An Ali ruling (Q9). The minimum is that MANUAL uses the same arrest pathway.
- **G10.** Scale the Eleveld central volume and the fast intercompartmental clearance by (blood volume / baseline) and
  (CO / baseline), a flow-limited mixing term. Delay the effect-site onset by circulation time at low CO.
- **G11.** A lung/V.1 item, not this plan: the dead space at 12 × 500 (VD/VT 0.53) is too large. Anatomical dead space
  with an ETT should be around 1 mL/kg, and alveolar dead space in a healthy lung small. Until then, demo presets use
  600 mL or RR 14.
- **G12.** A 7e item: the shivering gain goes to 0 below about 31 °C; AF hazard below 32 °C and VF hazard below
  28–30 °C through the G1 hazard hook.
- **G13, G14, G15.** Calibration items and questions (§6).

---

## 5. Calibrated tests these fixes would move

These are from grepping the tests. The executor must rerun each one; they are expectations, not certainties.

- **G2 (sympatholysis):**
  - `circ-sanity-1.test.ts:69`, the `it.fails` "propofol 2 mg/kg: MAP ≈ 70 % … HR rise < 15", **should start
    passing**. Remove the `it.fails`.
  - `circ-sanity-2.test.ts:49,58`, the R23 AS + CAD propofol → ischaemia `it.fails`: likely passes (deeper
    hypotension).
  - `neuro-circ.test.ts:33`, the `it.fails` "sevoflurane blunts reflex bradycardia to phenylephrine ≥ 20 %": likely
    passes.
  - `neuro-circ.test.ts:40` (nadir < 0.95): stays green.
  - The 7g Task 20 propofol refit notes, and the 8a calibration rows O4 (propofol vs Pulse) and 4, will move.
  - The phenylephrine band test (`circ-sanity-1.test.ts:28`), class II haemorrhage (`:38`) and β-blocked 35 %
    haemorrhage (`:77`) must stay green: they are reflex tests with no anaesthetic, so an output-suppression term
    scoped to agents should not move them. The explicit-tone refactor must reproduce the stabilised resting point
    exactly.
- **G1 (arrest):**
  - Any test that runs deep shock long enough to cross the new threshold, for example the 8a Pulse oracle O2
    haemorrhage (Pulse itself "aborts at 1,570 s when bled out", so the two would now agree), and 7d/7e scenarios
    with MAP < 30.
  - The CPR EtCO2 calibration row (16.3 vs 17–23) and the Stage 5 device tests (commanded VF/defibrillation/ROSC)
    must stay green.
  - The FU-3 Task 5 hypoxic-PEA tests must share the same mechanism.
- **G3 (K):**
  - The 7c sux-K tests: K values unchanged, but a rhythm consequence is new.
  - Any test using a `blood.k` profile with ECG assertions.
  - Stage 5 electrolyte morphology tests use `setModifiers k` and are unchanged.
- **G4:** 7x console tests on the `circ` event (the CPP field), and 7d organ tests that run through VF or CPR.
- **G5, G6:**
  - `circ-sanity-2.test.ts` H5 (PE CO falls ≥ 10 %), H7 (tamponade CVP ≈ PCWP, CO −15 %, HR up) and H8 (RV infarct).
  - The 7b `lung-circ` PE and PTX tests.
  - The calibration rows "tamponade PAWP 22.4" and "massive PE EtCO2/PAP/SpO2".
- **G11:** `pk-bus.test.ts:22`'s `it.fails` (VA > 3) passes, and a batch of Stage 3/7b capnography and EtCO2 tests
  calibrated at 12 × 500 would move. This is V.1's business.

---

## 6. Proposed clinical scenario suite for FU-4 (scripted tests; the orchestrator inspects these before Ali tests)

All MODELED unless stated, adult 40 y 70 kg on the audit rig (ETT, VCV 12 × 600, PEEP 5, FiO2 0.5). The bands are
starting proposals for Ali's ruling (§7); the mechanism comes first (R45).

| # | scenario | pass criteria |
|---|---|---|
| S1 | Healthy, propofol 2 mg/kg | MAP nadir 60–80 % of baseline at 2–5 min; HR change −10 to +10; no arrest; recovers to ≥ 85 % by 15 min |
| S2 | Healthy, sevoflurane to 1 MAC | MAP −15 to −30 %; HR change ≤ +10 |
| S3 | Severe tamponade (compensated: MAP ≥ 75, HR ≥ 100, CVP ≈ PAWP ± 5), spontaneous breathing | pulsus paradoxus ≥ 10 mmHg |
| S4 | S3, then propofol 1 mg/kg (ventilated) | MAP < 55 within 3 min; CO falls ≥ 25 %; untreated → PEA within 10 min (flag set, organised QRS, no ejection) |
| S5 | S3, then PEEP 10 | CO falls ≥ 20 % and MAP ≥ 10 mmHg more than the same PEEP in a healthy patient |
| S6 | Hypovolaemia −30 %, then propofol 2 mg/kg | MAP < 50; propofol peak Ce ≥ 1.3× the healthy value; 1 mg/kg gives a smaller but ≥ 1.5× healthy ΔMAP |
| S7 | Class IV haemorrhage (50 % in 10 min), untreated | tachycardia, then pre-arrest bradycardia, then PEA/asystole within 15 min of MAP < 30; CPR plus volume gives ROSC with CPP ≥ 15 |
| S8 | Tension PTX (ventilated), untreated | PEA within 3–10 min; decompression before PEA restores MAP ≥ 65 within 1 min |
| S9 | Massive PE (one command) | SpO2 < 90, EtCO2 falls ≥ 10 mmHg, CVP ≥ 15, MAP < 65; then propofol 1 mg/kg → PEA |
| S10 | Anaphylaxis grade IV, untreated | arrest within 10 min; adrenaline 50–100 µg repeated → MAP ≥ 65 without arrest |
| S11 | Burns + succinylcholine | K ≥ 8 → sine wave → VF/asystole within 5 min; CaCl2 1 g before sux-K peak delays or prevents it |
| S12 | Apnoea after induction without ventilation (FU-3 shared) | SpO2 < 70 → bradycardia < 50 → PEA/asystole within 3–5 min of SpO2 < 50 |
| S13 | VF + CPR (quality 1) | continuous CPP 15–25 mmHg during compressions (not the last beat); EtCO2 15–25; adrenaline raises CPP; defibrillation with CPP ≥ 15 for ≥ 2 min → ROSC |
| S14 | 80 y hypertensive, propofol 2 mg/kg | MAP −30 to −45 %; HR change ≤ +10 |
| S15 | Vagal: sux second dose; remifentanil 1 µg/kg bolus; neostigmine without glycopyrrolate | sinus bradycardia, junctional rhythm or pause in ≥ 1 of 3 sux seeds; remifentanil HR −15 to −30 %; neostigmine HR −25 to −40 % |
| S16 | Untreated MH | arrest (hyperkalaemic VF or asystole) before T 43 °C / pH 6.6, timing per Ali (Q6) |

Each test also asserts **"no arrest in the healthy counterpart"** (S1, S2) so the pathway is not trigger-happy, and a
MANUAL run of S4 and S7 asserts the same arrest.

---

## 7. Open questions for Ali (clinical, with the model's numbers)

1. **Healthy propofol induction.** Healthy 40 y, 2 mg/kg on a ventilator: we show MAP 96 → 86 (−10 %) with HR 73 → 91.
   Is the target **MAP −25 to −35 % with HR unchanged**? (Our "sympathetic output removed" what-if gives −34 % with HR
   +5.)
2. **Tamponade induction.**
   - Compensated severe tamponade: MAP 89, HR 104, CVP 17, CO 3.1 L/min, 250 mL. What course do you expect after
     propofol **1 mg/kg**: nadir MAP, time to nadir, and share of patients who arrest? We show MAP 79 and no arrest.
   - Should **PEEP 10** alone in that patient drop CO by more than 20 %? We show −5 %.
3. **Low-flow arrest threshold.** What sustained state should end in PEA: MAP < 30 or CPP < 15–20 mmHg for how many
   seconds? (We sit at MAP 13 and SV 2 mL for 15 min.) After exsanguination, tamponade or tension PTX: PEA first,
   bradyasystole, or VF, and in what proportion? Should a paradoxical bradycardia precede it (we stay at 180–187)?
4. **HR ceiling in shock.** HR reaches hrMax (180 at 40 y) in every severe shock state (sepsis, anaphylaxis, class IV,
   tension PTX). Should decompensated shock HR be around 130–150, with bradycardia as a pre-arrest sign?
5. **Hyperkalaemia thresholds.** At what K should the model show bradycardia or AV block (8?), a sine wave (8.5–9?) and
   VF/asystole (> 9?), and how fast after sux in a burns patient (we reach K 9.8 at 3–4 min)?
6. **Untreated MH.** At 50 min we show T 43.1 °C, pH 6.62, K 7.4, lactate 19, MAP 110, HR 183 and no arrest. At what
   point should an untreated patient arrest, and how (hyperkalaemic VF)?
7. **Grade IV anaphylaxis.** Should "severity 1" be arrest itself (Ring–Messmer IV), or profound shock that arrests
   within minutes? (We show MAP 25 for 24 min.)
8. **Baroreflex resetting.** The set point moves 35 % toward MAP after 7 min off target. In class IV haemorrhage this
   brings HR 183 → 116 at a fixed MAP of 36 within 30 min, and in tamponade the set point falls 95 → 80 over 40 min.
   Is acute resetting on that time scale acceptable, or should it be hours?
9. **MANUAL mode.** On main, MANUAL insults act unopposed with no reflex (tamponade MAP 107 → 58 at HR 75; a 2.5 L bleed
   leaves MAP 10–16 for 35 min at HR 90). Should MANUAL:
   - arrest by the same physiological pathway,
   - keep the instructor's rate and pressure unless the insult is "lethal", or
   - add a MANUAL-only "patient compensates" switch?
10. **Default ventilation.** 12 × 500 mL in a 70 kg adult settles at PaCO2 60 on main (dead space 265 mL/breath). Should
    the demo default be 12 × 600 (PaCO2 42), or is fixing the dead space (V.1) the only acceptable answer?
11. **Hypothermia.** At 28 °C under GA we show sinus 44/min and MAP 73. Should AF appear below 32 °C and VF become a risk
    below 28–30 °C (on manipulation)? Should an awake, cooled patient stop shivering around 30–31 °C? (We shiver to 28
    and reach lactate 16.)
12. **Hypovolaemia PK.** Should 2 mg/kg in a 30 % haemorrhage produce a clearly higher propofol concentration and a
    stronger effect? Johnson 2003 (porcine haemorrhage) reports higher concentrations and a left-shifted potency; the
    FU-4 plan writer should extract the numbers. We show a Ce 13 % higher.

---

## Appendix — files

- `08-audit-scripts/hooks.mjs`: Node JSON import-attribute shim (engine-core imports skin JSON without `with { type:
  'json' }`).
- `08-audit-scripts/runner.ts`: the scenario runner (engine creation, command builders `A.*`, 5 s sampler, table,
  extremes, JSON save).
- `08-audit-scripts/scenarios.ts`: the 72 scenarios (A–L, X).
- `08-audit-scripts/cli.ts`: runs scenarios by name or prefix, or `all`.
- `08-audit-scripts/summarize.ts`: per-step pre/nadir/end with drug multipliers and baroreflex state.
- `08-audit-scripts/matrix.ts`: the control-subtracted propofol matrix (K).
- `08-audit-scripts/whatif.ts`: the sympathetic-withdrawal probes (state poke; not engine behaviour).
- `08-audit-scripts/probe-va.ts`: alveolar ventilation and PaCO2 at 12 × 500, 14 × 500 and 12 × 600.
- `08-audit-scripts/probe-k.ts`: profile K → ECG `mods.k`; burns + sux K time course.
- `08-audit-scripts/out/`: `tables.txt`, `summary.txt`, `matrix.md`, `whatif.txt`, `tables-first-pass-vt500.txt`.

Raw per-scenario JSON (about 26 MB) is not kept; `cli.ts all` regenerates it.
