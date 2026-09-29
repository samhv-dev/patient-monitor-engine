# 22 — Coverage run BF: blood, fluids, electrolytes, acid–base, transfusion (R54 matrix)

*Coverage auditor, 2026-09-29. Read-only on the repo. The engine is this branch's source: `audit/coverage-bf` =
`main` **776ebb5** (FU-5 merged; **FU-4 not merged**) plus the audit inputs, which touch only `docs/review-inputs/`.
Seed 7 throughout. Scripts: `22-audit-scripts/`, which can be re-run; `out/cells.json` holds one graded record per
cell and no raw rows.*

> **Provenance.** A previous session pushed the runner scaffolding (7a12030) and ran no cells. This run kept its
> `runner.ts`, `grade.ts`, `cli.ts`, `regrade.ts`, `merge.ts` and `hooks.mjs`. It extended `spec.ts` and wrote the
> cells (`cells-a/b/c.ts`), `report.ts` and `ledger.ts`. It then ran every cell: P1 first, and within each tier the
> fluid, transfusion and acid–base cells before the electrolyte-extreme and poisoning cells. Results were committed
> after every ≈ 10 cells (checkpoints 9808fe5, 14259dc, 2d59538, fdd1ee3, 9864e96).
>
> Four measurement artefacts were fixed before grading. Each is marked "resume fix" in the scripts:
> - **BF-17:** the first rig overshot to PaCO₂ 16 instead of 25.
> - **BF-30:** the draw was not discriminating, because Hb had not changed by the time the result came back.
> - **BF-08a:** the QRS was read after the succinylcholine K⁺ peak.
> - **BF-09:** a TOF device command was rejected. It was not needed, because the truth event carries T1.

## 0. Headline

- **74 cells:**
  - the 70 cells of research/12 §5.10 (BF-01…31);
  - 2 carbon-monoxide cells the brief asked for (BF-32a/b);
  - 2 MANUAL twins (BF-M1/M2).

  By tier: **44 P1, 29 P2, 1 P3**. Every intervention cell has a control arm at the same sim time. Where
  state-dependence is the question (BF-02, 06, 20), there is also a healthy reference pair.
- **Verdicts:**

  | verdict | all | P1 | P2 | P3 | of which already owned (FU-4 / audit 09 R11) |
  |---|---|---|---|---|---|
  | plausible (PL) | **26** | 19 | 7 | — | 1 (BF-M2, FU-4) |
  | too weak (TW) | **8** | 5 | 3 | — | 1 (BF-18b, R11) |
  | too strong (TS) | **4** | 2 | 2 | — | — |
  | wrong (WR) | **12** | 7 | 5 | — | 6 (BF-07a/b/c and 08a: FU-4 G3 for the arrhythmia; BF-18a and 19: R11) |
  | missing (MI) | **4** | — | 4 | — | 1 (BF-32b, R11) |
  | inconsistent (IN) | **1** | — | 1 | — | — |
  | not expressible (NE) | **19** | 11 | 7 | 1 | 17 are 7i (v1.1) |

  - **29 cells are graded non-PL and non-NE.** 25 of them have at least one **new** mechanism that no stage owns; the other 4 wait only on audit 09 R11.
  - BF-07a/b and 08a are WR because of a **new** display defect (F2), not because of FU-4's arrhythmia work.
  - Run time: ≈ 39 min of engine wall time for all cells.
- **New findings, ranked** (§3 has the full list and the smallest mechanism for each):
  1. **An expanded circulation is never excreted (F1; P1; 7 cells).** 7d's volume factor stops at 1 above
     normovolaemia, so a litre of Ringer's raises urine by 11–17 mL/h. The consequences:
     - 53 % of the litre is still intravascular 30 min after it ends (Hahn: 20–30 %), and 50 % at 90 min;
     - awake, GA and class III retain exactly the same amount;
     - one RBC unit raises Hb by only +0.55 g/dL;
     - 5 L of saline leaves 3.4 L in the plasma, dropping Hb 15 → 8.8;
     - the dilution also blunts the hyperchloraemic acidosis, because albumin falls 10–14 g/L.
  2. **A profile hyper- or hypokalaemia never reaches the ECG (F2; P1).** A patient built with K⁺ 8.5 (or 2.5) shows
     a normal ECG: ECG K⁺ 4.2, QRS 93 ms. 7c pushes only the *change* from the profile set point into
     `Modifiers.k`. Calcium given to that K⁺ 7.5 patient then drives the displayed ECG to K⁺ 3.1, so the monitor
     shows **hypo**kalaemic morphology.
  3. **SvO₂ rises as cardiac output falls (F3; P1).** After a 2 L bleed (CO 4.6 → 2.1), SvO₂ goes 77 → 84 % while
     lactate climbs to 3.6. The regional supply-dependence term removes 62 % of VO₂ at a DO₂ still at its critical
     value, instead of raising extraction. The VBG therefore reports a high venous saturation in haemorrhagic shock.
  4. **Massive transfusion hides the shock acidosis (F5; P1).**
     - Citrate is not an anion in the strong-ion difference, so every FFP unit (Na 165, Cl 75) alkalinises at once:
       BE never falls below 0 while lactate reaches 7.1 (ATLS class IV: BE ≤ −10).
     - Citrate clearance scales with (CO/CO₀)², so iCa falls to **0.42** at 1 unit per 2 min.
     - Without products, the same class IV bleed is mostly a *respiratory* acidosis: PaCO₂ 38 → 53 at fixed
       ventilation, BE −3.6.
  5. **Septic capillary leak does not reach the lung (F4).** The same 30 mL/kg load gives +1.7 mL/kg of lung water
     in a healthy patient, 0 in septic shock, and PaO₂ **rises** 15 mmHg in sepsis. The MAP gain from the bolus is
     still 111 % of its peak an hour later (Glassford: it dissipates).
  6. **Hypoalbuminaemia (F8).**
     - COP is 8.7 mmHg at albumin 20 g/L (expected 12–16), because total protein is taken as 1.6 × albumin, so the
       globulins fall with it. The lung-oedema threshold drops to PAWP 6.7.
     - A *profile* albumin of 20 keeps a normal AG and BE, while the *same* albumin reached by dilution lowers the
       AG by 3.7 (IN).
  7. **Metabolic alkalosis is not compensated (F9).** At HCO₃ 34, PaCO₂ is 38.8 and pH 7.55 (expected PaCO₂ +7).
  8. **Chronic hypercapnia is built as acute (F7).** The COPD GOLD 3 profile gives PaCO₂ 45 with HCO₃ 25.0, i.e.
     +1.25 per 10 mmHg (chronic compensation is +3.5).
  9. **Renal K⁺ excretion is blind to plasma K⁺ and to diuretics (F6).** Furosemide raises urine by 173 mL/h but
     lowers K⁺ 7.5 by 0.01 in 3 h.
  10. **Missing couplings:**
      - the brain ignores plasma osmolality: glycine absorption to Na 119 gives an ICP change of 0.08 (F11);
      - hypokalaemia does not potentiate rocuronium (F10);
      - CO has no elimination: COHb stays at 30 % after 60 min on FiO₂ 1.0 (R11, still open).
- **What works:**
  - saline chloride (+5.4 for 2 L; +11.4 for 5 L);
  - the saline-vs-balanced BE difference (+2.2);
  - iso-oncotic colloid volume effect in class II (albumin 0.99, gelatin 0.94 at the end; 0.93 / 0.86 at 60 min);
  - stored-blood K⁺ (+1.2 with 35-day units);
  - cold units (−2.95 °C for 10 unwarmed units vs warmed);
  - calcium in hypocalcaemia: iCa +0.24, and MAP +7 against 0 when normocalcaemic, which is correct
    state-dependence;
  - bicarbonate: PaCO₂ +5.8, iCa −0.04, pH +0.07;
  - acute hypercapnia buffering (+1.1 HCO₃ per 10 mmHg);
  - hyperventilation: iCa −0.05 and K⁺ −0.16 per 0.1 pH, CBF −36 % at PaCO₂ 23.5;
  - the Pv–aCO₂ gap (17 low flow vs 6 normal);
  - lab turnaround reflecting the draw time;
  - insulin–dextrose (−0.93 at 60 min) and salbutamol (−0.64 at 30 min);
  - bicarbonate barely lowering a non-acidotic K⁺ (−0.15);
  - the acute hyperkalaemia morphology (QRS 121 at 7.5, sine wave 253 ms at 8.5);
  - Mg terminating torsades (110 s) and plasma Mg +0.45;
  - 7.5 % saline Na +6.9;
  - glycine absorption to Na 119.5 with the TURP haemodynamics;
  - HFrEF + 1.5 L: PAWP 13 → 26, extra lung water 3.9 mL/kg;
  - CO poisoning SpO₂ over-read (97 % at COHb 30 %, fractional SO₂ 67.5) and CaO₂ × 0.70;
  - MetHb 30 % SpO₂ 84 %.

## 1. Method and rig

- **Design source:** research/12 §5.10 (BF, 31 scenarios / 70 cells), §2 (cell record and grading), §3 (tiers) and
  §6 (runner). Names follow the research/11 glossary: MAP, HR, CO, SvO₂, PaCO₂, EtCO₂, HCO₃, BE, AG, iCa, K⁺, COP,
  EVLWI, PAWP, T1.
- **Rig.** Adult 40 y, 70 kg, 175 cm, male; sensors ABP/CVP/PAP/SpO₂/CO₂/temp on.
  - **"GA vent":** ETT + VCV 12 × 600 mL, PEEP 5, FiO₂ 0.5 and the Stage 3 GA flag (`thermal anaesthesia general`)
    from t = 1 s.
  - **"Awake":** no airway device; the engine's own spontaneous breathing on room air unless FiO₂ is stated.
  - Interventions at t = 300 s in plain rigs. Haemorrhage states: a 10-min bleed started at 60 s (class II 1000 mL,
    class III 1500 mL, class IV 2100 mL); the intervention is given at 960 s.
  - Warm septic shock: 7e `condition sepsis 1 warm` at 60 s; intervention at 1260 s.
- **Contexts:**
  - X-A;
  - HFrEF 60 y 80 kg;
  - severe MR 60 y;
  - COPD GOLD 3 (`copd` 0.75);
  - profile chemistry via `patient.blood` (K 2.5/6.5/7.5/8.5, iCa 0.9, Mg 0.5, HCO₃ 34, albumin 20, COHb 0.3,
    MetHb 0.3);
  - acute hyperkalaemia via `blood.burns` b + succinylcholine 1.5 mg/kg, with b = (K − 4.7)/6 so the 7c pulse
    peaks at the target K⁺ at 4 min.
- **Arms.** Every intervention cell runs its control arm (the same timeline without the intervention, at the same sim
  time). "Retention" and "volume effect" are Δ blood volume (plasma + red cells) against that control, divided by
  the infused volume. State-dependence (R53) is the difference of differences against the healthy pair (BF-06b,
  BF-20a).
- **Sampling.** The committed state is read-only every 5–30 s. The runner also keeps the 1 Hz `anaesthesia` event
  (T1/TOF), `measurement` HR, `beat` QRS, and every `labResult`. Rhythm transitions are taken from the sampled
  rhythm id. No pokes. Long arms advance in ≤ 60 s slices and yield to the event loop once per simulated minute.
- **Grading** (research/12 §2.2): automatic first, then every non-PL is confirmed by hand. `HAND` in the tables gives
  the code reason where the verdict changed.
  - band → PL / TW / TS by direction; WR if opposite. `invert` is used where a lower value is the stronger effect:
    iCa nadir, COP, SpO₂.
  - direction-only → PL when the sign matches beyond a tolerance.
  - quiet → PL within tolerance.
  - event → PL when it matches.
  - rejected command → NE; absent quantity → MI.

  Bands are **proposals for Ali** with their source. None was widened (R45). Cells without a sourced magnitude are
  flagged `dirOnly` and listed in §6.
- **FU-4 pending.** FU-4 (PR #25) is not merged here. Its G3 work (potassium → arrhythmia and arrest) owns the
  arrhythmia items of BF-07/08/M2, which are marked "FU-4 pending". The profile-K display defect in the same cells
  is new (F2).
- **MANUAL.** Q9 is open, so the two MANUAL twins are graded direction-only.

## 2. Results

How to read the tables:
- **Measured** values are control-subtracted unless the key names an arm. Keys:
  - `d…`: absolute difference;
  - `…Pct`: % against the control;
  - `ret…` / `eff…`: fraction of the infused volume still intravascular;
  - `…S`: seconds from the intervention.
- **Graded items** give value vs band [source].
- Gap ids refer to §3. `7i` marks a cell blocked on stage 7i (§4).
- Every table is regenerated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 Fluids.**
  - Chloride chemistry and colloid volume effect are right.
  - Crystalloid kinetics are wrong: fluid stays in the circulation, context-blind (F1).
- **2.2 Transfusion.**
  - K⁺, temperature and calcium are right.
  - Citrate handling is wrong: the iCa fall is too strong and there is no acidosis (F5).
- **2.3 Acid–base.**
  - Buffering, bicarbonate CO₂, hyperventilation effects and the Pv–aCO₂ gap are right.
  - SvO₂ is wrong in low flow (F3).
  - The chronic COPD compensation is too weak (F7).
- **2.4 Coagulation:** every cell is NE (7i, v1.1).
- **2.5 Hyperkalaemia.**
  - The acute morphology and the K⁺-lowering drugs are right.
  - A profile K⁺ is invisible on the ECG, and calcium then shows hypokalaemia (F2).
  - No arrhythmia at 8.5 (FU-4 G3).
  - Furosemide does not remove K⁺ (F6).
- **2.6 P2 fluids.**
  - Hypertonic saline, the overload PAWP and lung water in HFrEF are right.
  - Anaemia does not drive CO (R11).
  - Septic leak does not reach the lung (F4).
  - Hypoalbuminaemic COP is too low and inconsistent (F8).
- **2.7:** metabolic alkalosis is uncompensated (F9); coagulation is NE.
- **2.8:**
  - hyponatraemia chemistry is right;
  - the brain ignores it (F11);
  - hypokalaemia is invisible on the ECG (F2) and does not act on the NMB (F10);
  - CO over-read is right, but CO does not wash out (R11);
  - MetHb is shown correctly, and its antidote is NE.
- **2.9 MANUAL:** a fluid bolus in class III raises MAP by 29. The K⁺ morphology shows in MANUAL.

### 2.1 Crystalloids and colloids (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-01a | P1 | X-A GA vent · normovolaemic, GA → 0.9 % saline 2 L over 60 min (read at the end of the infusion) | dCl 5.445; dBE -0.827; dHco3 -1.042; dPh 0.01; dNa 0.715; dBE90 -1.571; dAg -3.688; dAlb -10.574 | PL: dCl = 5.445 in [3, 8] [Reid 2003 Clin Sci 104:17 (2 L saline in volunteers: Cl +5–7); Kellum/Stewart; research/12 BF-01 (Cl +5)]<br>TW: dBE = -0.827 above [-4, -1] [Reid 2003; Scheingraber 1999 Anesthesiology 90:1265 (hyperchloraemic acidosis, dose-dependent); research/12 BF-01 (BE −2)]<br>HAND TW (automatic TW): Cl +5.4 is right, but the saline stays in the plasma (F1: no excretion of an expanded volume), so albumin falls 10.6 g/L; the lost albumin weak acid raises BE ≈ +3 (Figge) and offsets the hyperchloraemic fall to −0.8 | **TW** | F1 · 7c solutes.ts / 7d renal (F1) |
| BF-01b | P1 | X-A GA vent · normovolaemic, GA → Plasma-Lyte 148 2 L over 60 min vs saline | dCl -0.75; dBE 1.377; dHco3 0.814; dPh 0.045; dNa 0; dBE90 0.94; dAg -0.064; dAlb -10.369; dBEvsSaline 2.2 | PL: dCl = -0.75 (quiet, tol ±2) [Plasma-Lyte Cl 98: no hyperchloraemia (Reid 2003; Kellum)]<br>WR: dBE = 1.377 (quiet, tol ±1) [balanced crystalloid: BE ≈ 0 (research/12 BF-01; Scheingraber 1999 RL arm)]<br>PL: dBEvsSaline = 2.2 (sign 1, beyond 1) [balanced vs saline: BE higher by ≈ 2 (research/12 BF-01)]<br>HAND TS (automatic WR): BE +1.4 instead of ≈ 0: the direction a balanced fluid can take, but it comes from the same albumin dilution (−10.4 g/L, F1) that weakens BF-01a, not from the fluid's SID; the saline–balanced difference (+2.2) is right | **TS** | F1 · 7c solutes.ts / 7d renal (F1) |
| BF-02a | P1 | X-A awake spontaneous vs X-A GA vent · normovolaemic → Ringer's lactate 1 L over 30 min: intravascular retention 30 min after the end | retEndAwake 0.74; retAwake30 0.53; retEndGA 0.74; retGA30 0.53; gaMinusAwake 0; dUopAwake 17; dUopGA 11; retAwake90 0.5 | TS: retAwake30 = 0.53 above [0.2, 0.3] [Hahn 2010 Anesthesiology 113:470 (volume kinetics: 20–30 % of a crystalloid bolus intravascular 30 min after it ends, awake); research/12 BF-02]<br>WR: gaMinusAwake = 0 (expected sign 1) [Hahn 2010; Norberg 2007 Anesthesiology 107:24 (anaesthesia cuts crystalloid elimination 50–80 %: more is retained)]<br>HAND WR (automatic WR): awake and GA retain the same 53 % at 30 min and 50 % at 90 min: with 7d present its urine replaces 7c's volume-receptor elimination (and 7c's GA ×0.2), but 7d's volume factor saturates at 1 for any expansion (renal/model.ts:49–54), so a litre of Ringer's raises urine by only 11–17 mL/h | **WR** | F1 · 7d renal/model.ts volumeFactor (F1) |
| BF-02b | P1 | X-A GA vent · class III (1500 mL / 10 min) vs normovolaemic GA → Ringer's lactate 1 L over 30 min: retention 30 min after the end | retHypo30 0.53; retGA30 0.53; hypoMinusGA 0; dMapHypo 10; dCoHypo 0.68; dHbHypo -2.407 | WR: hypoMinusGA = 0 (expected sign 1) [Drobin & Hahn 1999 Anesthesiology 90:81 (haemorrhage slows crystalloid elimination: retention rises); research/12 BF-02]<br>PL: dMapHypo = 10 (sign 1, beyond 3) [a fluid bolus in class III raises MAP (ATLS 10e)]<br>HAND WR (automatic WR): retention after class III equals normovolaemic GA (0.53 both): the kidney excretes almost nothing above basal in either state (F1), so the context-sensitivity of volume kinetics cannot appear | **WR** | F1 · 7d renal/model.ts volumeFactor (F1) |
| BF-03a | P1 | X-A GA vent · class II (1000 mL / 10 min) → albumin 5 % 500 mL over 15 min: volume effect (Δ blood volume ÷ 500 mL) | effEnd 0.99; eff60 0.93; effRLEnd 0.82; effRL60 0.49; dCop 1.804; dMap 4 | PL: effEnd = 0.99 in [0.8, 1] [research/12 BF-03 (80–100 %); Chappell 2008 Anesthesiology 109:723 (iso-oncotic colloid replacing blood loss stays ≈ 90 % intravascular; ≈ 40 % in normovolaemia)]<br>PL: eff60 = 0.93 in [0.7, 1] [colloid persists at 60 min (gelatin t½ 2–3 h; albumin longer) (Chappell 2008; tables `t12Colloid`)] | **PL** | — · 7c fluids.ts |
| BF-03b | P1 | X-A GA vent · class II (1000 mL / 10 min) → gelatin 4 % 500 mL over 15 min: volume effect (Δ blood volume ÷ 500 mL) | effEnd 0.94; eff60 0.86; effRLEnd 0.82; effRL60 0.49; dCop 0.039; dMap 4 | PL: effEnd = 0.94 in [0.8, 1] [research/12 BF-03 (80–100 %); Chappell 2008 Anesthesiology 109:723 (iso-oncotic colloid replacing blood loss stays ≈ 90 % intravascular; ≈ 40 % in normovolaemia)]<br>PL: eff60 = 0.86 in [0.7, 1] [colloid persists at 60 min (gelatin t½ 2–3 h; albumin longer) (Chappell 2008; tables `t12Colloid`)] | **PL** | — · 7c fluids.ts |

### 2.2 Transfusion and calcium (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-04 | P1 | X-A GA vent · normovolaemic, Hb 15 → 1 u RBC (280 mL, Hct 0.6) over 30 min, 14 d, warmed; Hb at +1 h and +4 h | dHb1h 0.546; dHb4h 0.547; dBv1h 191; dK 0.05; dICa -0.01 | TW: dHb1h = 0.546 below [0.7, 1.3] [one RBC unit raises Hb ≈ 1 g/dL in a 70 kg adult (AABB Technical Manual; Wiesen 1994 Transfusion 34:32)]<br>HAND TW (automatic TW): Hb +0.55 at 1 h and 4 h: 191 of the unit's 280 mL stay in the circulation for hours (F1), so the red cells are diluted in an expanded blood volume instead of the unit's plasma being excreted | **TW** | F1 · 7d renal/model.ts volumeFactor (F1) |
| BF-05a | P1 | X-A GA vent · class IV (2.1 L) + ongoing loss 4 L / 40 min → 10 u RBC 35 d + 10 u FFP over 40 min (1 u / 2 min), no calcium: ionised Ca | iCaPre 1.21; iCaNadir 0.422; tNadirS 2400; citratePeak 7.934; iCa30AfterEnd 1.058 | TS: iCaNadir = 0.422 below [0.6, 0.95] (lower = stronger/faster) [Giancarelli 2016 J Surg Res 202:182 (hypocalcaemia in 97 % of massive transfusion; severe < 0.9 in about half); Ho & Leonard 2011 Anaesth Intensive Care 39:46 (iCa 0.6–0.8 above 1 u / 5 min without Ca)] | **TS** | F5 · 7c solutes.ts (citrate) |
| BF-05b | P1 | X-A GA vent · class IV + ongoing loss → 10 u RBC 35 d stored, 1 u / 4 min: plasma K | kPre 4.19; kPeak 5.372; dkPeak 1.18; k60AfterEnd 4.063 | PL: dkPeak = 1.18 in [0.3, 2] [Aboudara 2008 J Trauma 64:S86 (K rises with rapid old units; hyperkalaemia in ≈ 30 % of massive transfusion); Raza 2015 Transfus Med 25:45 (supernatant K ≈ 1 mmol/L per storage day)] | **PL** | — · 7c params.ts storedK |
| BF-05c | P1 | X-A GA vent · class IV + ongoing loss → 10 u RBC unwarmed (4 °C) vs warmed: core temperature | tPre 36.325; tEndCold 32.838; tEndWarm 35.79; dTcold -2.95 | PL: dTcold = -2.95 in [-3, -1.5] [Sessler 2008 Lancet 371:1791 (one unit of refrigerated blood lowers mean body temperature ≈ 0.25 °C: 10 u → ≈ −2.5 °C); ATLS 10e] | **PL** | — · 7e thermal/environment.ts ivInflow |
| BF-05d | P1 | X-A GA vent · class IV (2.1 L in 10 min) + ongoing loss → the shock itself and its transfusion: base excess, lactate, pH | bePre -0.06; beNadir -0.064; lactPeak 7.119; phNadir 7.266; mapNadir 49.184; coNadir 1.777; arrest false | TW: beNadir = -0.064 above [-20, -10] [ATLS 10e table 3-1: class IV base deficit ≤ −10 mmol/L]<br>PL: lactPeak = 7.119 in [4, 12] [class IV shock: lactate > 4 mmol/L (ATLS 10e; tables §7 17a gives 3–5 for class III)]<br>HAND TW (automatic TW): lactate reaches 7.1 but BE never falls below 0: citrate is not an anion in the strong-ion difference (solutes.ts:37–38 sidOf), so each FFP unit (Na 165, Cl 75) adds a ≈ 90 mEq/L strong-ion excess at once instead of after hepatic citrate metabolism; stored RBC carry no lactate or acid. The same bleed WITHOUT products reaches lactate 5.9 at BE −3.6 with PaCO2 38 → 53 at fixed ventilation: the class IV acidosis is mostly respiratory | **TW** | F5 · 7c solutes.ts sidOf (citrate) / params.ts PRODUCTS |
| BF-05e | P1 | X-A GA vent · class IV + ongoing loss → ≈ 1 blood volume replaced: dilutional coagulopathy (INR, fibrinogen, platelets) | inrEnd 1; albEnd 31 | no coagulation model: INR here is 7d liver-function only; fibrinogen, platelets and TEG/ROTEM absent (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-06a | P1 | X-A GA vent, profile iCa 0.9 · hypocalcaemia iCa 0.9 → calcium chloride 1 g IV: ionised Ca | iCaBase 0.894; dICaPeak 0.24; dICa10 0.12; dICa30 0.03 | PL: dICaPeak = 0.24 in [0.2, 0.3] [research/12 BF-06 (iCa +0.2–0.3 after 1 g CaCl2 = 6.8 mmol); Miller 10e ch. 47] | **PL** | — · 7c pipeline.ts observeDoses |
| BF-06b | P1 | X-A GA vent, profile iCa 0.9 vs normocalcaemic · hypocalcaemia iCa 0.9 → calcium chloride 1 g IV: MAP (state-dependence) | mapBaseHypo 95; mapBaseNorm 96; dMapHypo 7.17; dMapNorm 0; extra 7.2; dCoHypo 0.84 | PL: dMapHypo = 7.17 (sign 1, beyond 2) [calcium restores contractility and tone in hypocalcaemia (Miller 10e ch. 47; research/12 BF-06 "MAP ↑ in hypocalcaemia")]<br>PL: extra = 7.2 (sign 1, beyond 1) [the pressor effect of calcium is larger when iCa is low (state-dependence, R53)] | **PL** | — · 7c circ-adapter.ts chemistryContractility |

### 2.3 Acid–base, CO2 and the blood gas (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-13a | P1 | X-A GA vent (fixed minute ventilation) · class IV shock, lactic acidosis → sodium bicarbonate 1 mmol/kg: PaCO2 and EtCO2 | phBefore 7.298; lactBefore 3.68; dPaco2Peak 5.81; dEtco2Peak 3.18; dPaco2At20 1.737 | PL: dPaco2Peak = 5.81 in [3, 10] [Hindman 1990 Anesthesiology 72:1064 (bicarbonate generates CO2: PaCO2 rises at fixed ventilation); Cooper 1990 Ann Intern Med 112:492] | **PL** | — · 7c treatments.ts bicarbCo2MlMin |
| BF-13b | P1 | X-A GA vent · class IV shock, lactic acidosis → sodium bicarbonate 1 mmol/kg: ionised Ca | iCaBefore 1.251; dICa -0.04 | PL: dICa = -0.04 in [-0.15, -0.03] [Cooper 1990 Ann Intern Med 112:492 (bicarbonate lowered ionised calcium in lactic acidosis)] | **PL** | — · 7c solutes.ts ionisedCa |
| BF-13c | P1 | X-A GA vent · class IV shock, lactic acidosis → sodium bicarbonate 1 mmol/kg: pH (peak and 30 min) | dPhPeak 0.07; tPeakS 5; dPh30 0.081; dHco3 4.199; dNa 1.929; dLact30 -0.512 | PL: dPhPeak = 0.07 in [0.03, 0.15] [Cooper 1990 Ann Intern Med 112:492 (a small pH rise, no haemodynamic benefit); Miller 10e ch. 47] | **PL** | — · 7c |
| BF-16a | P1 | X-A GA vent · acute respiratory acidosis → VCV RR 12 → 6 for 30 min: ΔHCO3 per 10 mmHg ΔPaCO2 | paco2 60.238; dPaco2 25.7; dHco3 2.85; hco3Per10 1.11; ph 7.256; dK 0.273 | PL: hco3Per10 = 1.11 in [0.5, 1.5] [Brackett, Cohen & Schwartz 1965 NEJM 272:6 (acute: HCO3 +1 per 10 mmHg PaCO2; "Boston rules")] | **PL** | — · 7c acid-base.ts |
| BF-16b | P1 | COPD GOLD 3 (lung copd 0.75) awake spontaneous, room air · chronic hypercapnia (the COPD profile) → baseline: HCO3 against PaCO2 (renal compensation) | paco2Copd 45.067; hco3Copd 25.024; phCopd 7.357; dPaco2 6.2; hco3Per10 1.25 | PL: dPaco2 = 6.2 in [5, 15] [GOLD 3 chronic hypercapnia PaCO2 45–55 (tables §1.5 copd; research/12 CM-07)]<br>TW: hco3Per10 = 1.25 below [3, 4.5] [Brackett 1965 / Schwartz 1965 (chronic: HCO3 +3.5 per 10 mmHg PaCO2; "Boston rules")]<br>HAND TW (automatic TW): the COPD profile raises PaCO2 to 45 but leaves the HCO3 at the acute-buffer value (25.0, pH 7.36): the chronic renal compensation of a chronic lung state is not set when the profile is built (7c createBloodCore calibrates HCO3 to the profile's 24.4 unless blood.hco3 is given) | **TW** | F7 · 7b copd profile → 7c HCO3 (F7) |
| BF-17a | P1 | X-A GA vent · acute respiratory alkalosis → VCV 18 × 600 for 30 min (PaCO2 ≈ 25): ionised Ca per +0.1 pH | paco2 23.507; dPh 0.13; dICa -0.065; iCaPer01 -0.05 | PL: iCaPer01 = -0.05 in [-0.06, -0.03] [Fogh-Andersen 1981 Clin Chem 27:1264 / Wang 2002 (iCa falls ≈ 0.04–0.05 mmol/L per 0.1 pH rise)] | **PL** | — · 7c solutes.ts ionisedCa |
| BF-17b | P1 | X-A GA vent · acute respiratory alkalosis → VCV 18 × 600 for 30 min: plasma K per +0.1 pH | dPh 0.13; dK -0.212; kPer01 -0.16; dK40 -0.278 | PL: kPer01 = -0.16 in [-0.4, -0.1] [Adrogué & Madias 1981 Am J Med 71:456 (respiratory acid–base disorders move K only 0.1–0.4 mmol/L per 0.1 pH, less than mineral acidosis)] | **PL** | — · 7c core.ts kSet (phNonOrg) |
| BF-17c | P1 | X-A GA vent · acute respiratory alkalosis → VCV 18 × 600 for 30 min: cerebral blood flow | paco2 23.507; cbfPct -36.3; dIcp -1.59 | PL: cbfPct = -36.3 in [-50, -25] [CBF −2–4 %/mmHg PaCO2 (Miller 10e ch. 11); tables §7 check 18 (≈ −35–40 % at PaCO2 25)] | **PL** | — · 7d brain |
| BF-29a | P1 | X-A GA vent · low cardiac output (2 L bleed, CO ≈ half) → ABG + VBG drawn together: venous–arterial PCO2 gap (vs the same draw at normal CO) | coLow 2.168; gapLow 17; gapNormal 6; vbgPhLow 7.22; abgPhLow 7.33 | PL: gapLow = 17 in [6, 20] [Mallat 2016 Ann Intensive Care 6:10 / Cuschieri 2005 Intensive Care Med 31:818 (Pv–aCO2 > 6 mmHg marks low flow)]<br>PL: gapNormal = 6 in [2, 6] [normal Pv–aCO2 gap 2–6 mmHg (Mallat 2016)] | **PL** | — · 7c labs.ts |
| BF-29b | P1 | X-A GA vent · low cardiac output (2 L bleed) → VBG: venous O2 saturation | svo2Low 84.3; svo2Normal 85.7; svo2Truth 84.287; lactLow 2.825 | TS: svo2Low = 84.3 above [30, 65] [SvO2 < 65 % in low output / haemorrhagic shock (Rivers 2001 NEJM 345:1368; Vincent & De Backer 2013 NEJM 369:1726)]<br>TS: svo2Normal = 85.7 above [70, 85] [normal SvO2 70–80 % under GA (Miller 10e ch. 36)]<br>HAND WR (automatic TS): SvO2 RISES from 77 to 84 % as CO falls 4.6 → 2.1 L/min while lactate climbs to 3.6: the regional supply-dependence term (oxygen.ts:24–27, REGIONAL_* in params.ts:65–67) removes 57 % of VO2 (203 → 78 mL/min) at a DO2 still at the critical 6 mL/kg/min instead of letting extraction rise to ER_MAX; venous saturation and lactate contradict each other (a septic, not a haemorrhagic, signature) | **WR** | F3 · 7c oxygen.ts o2Delivery (F3) |
| BF-30 | P1 | X-A GA vent · normal, then NaHCO3 100 mmol 5 s after the draw → ABG drawn at 420 s (default turnaround): the result shows the draw-time values | resultAtS 540; drawnAtS 420; hco3Result 24.1; hco3TruthAtDraw 24.1; hco3TruthAtResult 30.5; matchesDraw true | PL: matchesDraw = true (expected true) [a blood gas reports the sample at its draw time; the analyser adds only a delay (7c plan decision 13)] | **PL** | — · 7c labs.ts |

### 2.4 Coagulation (P1, 7i: not expressible)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-24 | P1 | X-A GA vent · class III bleeding → tranexamic acid 1 g: fibrinolysis (LY30) | dMap 0; dHb 0 | TXA is a 7g placeholder row (accepted, no PD); no fibrinolysis, LY30 or bleeding-rate term (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-25a | P1 | X-A GA vent · dilution ≈ 1.5 BV; 33 °C + pH 7.1 → INR/PT and aPTT | hbEnd 11.093; albEnd 17.607; inrEnd 1 | no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-25b | P1 | X-A GA vent · dilution ≈ 1.5 BV; 33 °C + pH 7.1 → fibrinogen < 1.5 g/L | hbEnd 11.093; albEnd 17.607; inrEnd 1 | no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-25c | P1 | X-A GA vent · dilution ≈ 1.5 BV; 33 °C + pH 7.1 → platelets < 100 | hbEnd 11.093; albEnd 17.607; inrEnd 1 | no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-25d | P1 | X-A GA vent · dilution ≈ 1.5 BV; 33 °C + pH 7.1 → ROTEM CT / A10 (EXTEM, FIBTEM) | hbEnd 11.093; albEnd 17.607; inrEnd 1 | no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-25e | P1 | X-A GA vent · dilution ≈ 1.5 BV; 33 °C + pH 7.1 → hypothermia 33 °C + pH 7.1 worsening clotting | hbEnd 11.093; albEnd 17.607; inrEnd 1 | no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-26a | P1 | X-A GA vent · coagulopathy (dilutional) → fibrinogen concentrate 4 g: targeted correction by FIBTEM/EXTEM | — | no coagulation model to correct (7i); fibrinogen concentrate 4 g is not in the library | **NE** | 7i · 7i |
| BF-26b | P1 | X-A GA vent · coagulopathy (dilutional) → cryoprecipitate 10 u: targeted correction by FIBTEM/EXTEM | — | no coagulation model to correct (7i); cryoprecipitate 10 u is not in the library | **NE** | 7i · 7i |
| BF-26c | P1 | X-A GA vent · coagulopathy (dilutional) → PCC 25 IU/kg: targeted correction by FIBTEM/EXTEM | — | no coagulation model to correct (7i); PCC 25 IU/kg is not in the library | **NE** | 7i · 7i |
| BF-26d | P1 | X-A GA vent · coagulopathy (dilutional) → platelets 1 pool targeted by EXTEM A10: targeted correction by FIBTEM/EXTEM | — | no coagulation model to correct (7i); platelets 1 pool targeted by EXTEM A10 is accepted as volume only | **NE** | 7i · 7i |

### 2.5 Hyperkalaemia and its treatment (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-07a | P1 | X-A GA vent · hyperkalaemia 6.5 (profile blood.k 6.5; acute: burns 0.3 + succinylcholine 1.5 mg/kg) → none — the state itself (peaked T only) | kProfile 6.491; ecgKProfile 4.2; qrsProfile 93; kAcutePeak 6.485; ecgKAcutePeak 6.478; qrsAcutePeak 93; mapMinAcute 94.858; hrMinAcute 72; arrestAny false; malignantAny false; rhythmsAcute 5s sinus; rhythmsProfile 5s sinus | TW: ecgKProfile = 4.2 below [6.2, 6.8] [the ECG reads the patient's plasma K (brief §5 electrolytes; UK Renal Association 2023: K ≥ 6.5 is ECG-significant)]<br>PL: ecgKAcutePeak = 6.478 in [6, 7] [the same K reached acutely shows on the ECG (7c plan decision 9)]<br>PL: arrestAny = false (expected false) [K 6.5: peaked T, arrhythmia uncommon (UK RA 2023; Mattu 2000 Am J Emerg Med 18:721)]<br>HAND WR (automatic TW): the acute rise shows on the ECG (ecgK 6.48), but the PROFILE patient with the same plasma K 6.5 shows a normal ECG (ecgK 4.2, QRS 93): bloodEcgTargets pushes only kEcg − set point (blood/pipeline.ts:209–211) into a Modifiers.k that starts at 4.2 (modifiers.ts:16) — the displayed ECG contradicts the plasma K (F2, new) | **WR** (FU-4 pending) | F2 · FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-07b | P1 | X-A GA vent · hyperkalaemia 7.5 (profile blood.k 7.5; acute: burns 0.467 + succinylcholine 1.5 mg/kg) → none — the state itself (P flattening, QRS widening) | kProfile 7.491; ecgKProfile 4.2; qrsProfile 93; kAcutePeak 7.487; ecgKAcutePeak 7.45; qrsAcutePeak 121; mapMinAcute 94.805; hrMinAcute 72; arrestAny false; malignantAny false; rhythmsAcute 5s sinus; rhythmsProfile 5s sinus | TW: ecgKProfile = 4.2 below [7.2, 7.8] [the ECG reads the plasma K (brief §5)]<br>TW: qrsProfile = 93 below [110, 180] [K 7–8: P flattening, QRS widening (Mattu 2000; Stage 5.1 morphology: QRS +20–100 % from K 7)]<br>PL: qrsAcutePeak = 121 in [110, 180] [as above, acute rise (Mattu 2000)]<br>HAND WR (automatic TW): the acute rise shows on the ECG (ecgK 7.48), but the PROFILE patient with the same plasma K 7.5 shows a normal ECG (ecgK 4.2, QRS 93): bloodEcgTargets pushes only kEcg − set point (blood/pipeline.ts:209–211) into a Modifiers.k that starts at 4.2 (modifiers.ts:16) — the displayed ECG contradicts the plasma K (F2, new) | **WR** (FU-4 pending) | F2 · FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-07c | P1 | X-A GA vent · hyperkalaemia 8.5 (profile blood.k 8.5; acute: burns 0.633 + succinylcholine 1.5 mg/kg) → none — the state itself (sine wave → VF/asystole) | kProfile 8.491; ecgKProfile 4.2; qrsProfile 93; kAcutePeak 8.483; ecgKAcutePeak 8.456; qrsAcutePeak 253; mapMinAcute 94.616; hrMinAcute 73; arrestAny false; malignantAny false; rhythmsAcute 5s sinus; rhythmsProfile 5s sinus | TW: ecgKProfile = 4.2 below [8.2, 8.8] [the ECG reads the plasma K (brief §5)]<br>PL: qrsAcutePeak = 253 in [140, 300] [K ≥ 8: sine wave (Mattu 2000; Stage 5.1: complete at 8.5)]<br>WR: malignantAny = false (expected true) [research/12 BF-07: VF/asystole/conduction block from K 8–9 (UK RA 2023; ERC 2021 special circumstances)]<br>HAND WR (automatic WR): the acute rise to 8.5 draws a sine wave (QRS 253 ms) in sinus rhythm at MAP 95 for 15 min with no VF, asystole or block (FU-4 G3 pending: K acts on morphology only); the PROFILE patient with K 8.5 shows a normal ECG (ecgK 4.2, QRS 93) because only the change from the profile set point reaches the ECG (F2, new) | **WR** (FU-4 pending) | F2, F12 · FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-08a | P1 | X-A GA vent · hyperkalaemia 7.5 (profile; and acute sux + burns) → calcium chloride 1 g: ECG reversal without lowering K | dK5min -0.003; ecgKProfileBase 4.2; ecgKProfileAfterCa 3.072; qrsAcuteNoCa 102; qrsAcuteCa 93; dQrsCa3min -9; kAcute 7.109; ecgKAcuteCa 6.268 | PL: dK5min = -0.003 (quiet, tol ±0.15) [calcium stabilises the membrane without lowering K (UK Renal Association 2023)]<br>TW: dQrsCa3min = -9 (sign -1, beyond 10) [calcium narrows the QRS within 1–3 min (UK RA 2023; research/12 BF-08)]<br>TW: ecgKProfileAfterCa = 3.072 below [3.5, 7.6] [calcium must not push the ECG into hypokalaemic morphology (a quiet check on the displayed K)]<br>HAND WR (automatic TW): in the PROFILE hyperkalaemic patient, calcium drives the displayed ECG K from 4.2 to 3.1 — the monitor shows HYPOkalaemic morphology (U waves) in a patient with K 7.5 (F2); the acute arm is graded on the QRS | **WR** (FU-4 pending) | F2 · 7c pipeline.ts bloodEcgTargets (F2) / FU-4 G3 |
| BF-08b | P1 | X-A GA vent, profile K 7.5 · hyperkalaemia 7.5 → insulin 10 U + dextrose 25 g: K at 30 and 60 min | dK30 -0.636; dK60 -0.927; dGluMin 0 | PL: dK60 = -0.927 in [-1, -0.6] [insulin–dextrose: K −0.6 to −1.0 mmol/L at 30–60 min (UK Renal Association 2023; research/12 BF-08)] | **PL** | — · 7c treatments.ts |
| BF-08c | P1 | X-A GA vent, profile K 7.5 · hyperkalaemia 7.5 → salbutamol 10 mg nebulised: K at 30 and 60 min; HR | dK30 -0.635; dK60 -0.747; dHrMax 27 | PL: dK30 = -0.635 in [-1, -0.5] [nebulised salbutamol 10–20 mg: K −0.5 to −1.0 within 30 min (UK RA 2023; Allon 1989 Ann Intern Med 110:426)] | **PL** | — · 7g salbutamol kShift / 7c |
| BF-08d | P1 | X-A GA vent, profile K 7.5 (normal pH) · hyperkalaemia 7.5 without acidosis → sodium bicarbonate 50 mmol (K at 60 min); furosemide 40 mg (K at 3 h) | dKBicarb60 -0.154; dKFuro3h -0.014; dUopFuro 173 | PL: dKBicarb60 = -0.154 in [-0.4, 0] [bicarbonate alone barely lowers K without acidosis (Blumberg 1988 Am J Med 85:507; UK RA 2023: not first line)]<br>TW: dKFuro3h = -0.014 (sign -1, beyond 0.1) [loop diuretic: kaliuresis over hours if the kidney works (UK RA 2023)]<br>HAND TW (automatic TW): furosemide raises urine by 173 mL/h but K falls only 0.01 in 3 h: the seam excretes K at a FIXED urine concentration (organs/pipeline.ts:168–172), independent of plasma K, aldosterone or the loop diuretic, while the lost water concentrates the rest | **TW** | F6 · 7d organs/pipeline.ts renalSeam (F6) |

### 2.6 Fluids, anaemia, leak and overload (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-12 | P2 | X-A GA vent · normovolaemic → 7.5 % saline 250 mL (7g hypertonicSaline, runs over 15 min): Na 30 min after the end | dNa45 6.917; dNaPeak 9.8; dNa2h 6.916; dOsm45 13.835; dBv45 555; dIcp -2.19 | PL: dNa45 = 6.917 in [4, 7] [research/12 BF-12 (Na +4–6); Adrogué & Madias 2000 NEJM 342:1581 formula: (1283 − 140)/(42 + 1) × 0.25 = +6.6] | **PL** | — · 7c pipeline.ts observeDoses |
| BF-14 | P2 | X-A GA vent · normovolaemic, GA → 0.9 % saline 5 L over 2 h (≈ 36 mL/kg/h): BE and Cl at the end | dBE -3.796; dCl 11.447; dPh -0.041; dAlb -14.007; dHb -6.19; retained 3378; evlwiExtra 9.481 | TW: dBE = -3.796 above [-8, -4] [Scheingraber 1999 Anesthesiology 90:1265 (saline 30 mL/kg/h × 2 h: BE ≈ −7, Cl ≈ 115); research/12 BF-14 (BE −5)]<br>PL: dCl = 11.447 in [6, 12] [Scheingraber 1999 (Cl 105 → 115)]<br>HAND TW (automatic TW): Cl +11.4 is right, but 3.4 of the 5 L are still intravascular at the end (F1): Hb falls 15 → 8.8 and albumin −14 g/L, and the lost albumin weak acid offsets the chloride acidosis (BE −3.8 vs ≈ −7); extra lung water 9.5 mL/kg in a healthy patient | **TW** | F1 · 7d renal/model.ts volumeFactor (F1) |
| BF-18a | P2 | X-A awake spontaneous, room air · acute isovolaemic haemodilution to Hb ≈ 7 → exchange 3.7 L blood for albumin 5 % over 60 min: heart rate | hbEnd 6.718; dBv 234; dHr -1; dMap 2 | WR: dHr = -1 below [10, 20] [Weiskopf 1998 JAMA 279:217 (awake isovolaemic haemodilution: HR rises linearly as Hb falls; research/12 BF-18 +10–20 at Hb 7)]<br>HAND WR (automatic WR): HR −1 bpm at Hb 6.7 with DO2 −50 % and SvO2 57 %: no chemoreceptor/sympathetic or viscosity path from Hb to the circulation (audit 09 R11, still open) | **WR** (audit 09 R11 pending) | F12 · 7a / 7c (anaemia → CO) |
| BF-18b | P2 | X-A awake spontaneous, room air · acute isovolaemic haemodilution to Hb ≈ 7 → the same exchange: cardiac output, DO2, SvO2 | coPct 10.7; do2Pct -49.6; svo2 56.829; svo2Ctl 75.58; lact 0.966; svrPct -3.7 | TW: coPct = 10.7 below [20, 60] [Weiskopf 1998 JAMA 279:217 (CI 2.9 → 4.8 L/min/m² at Hb 5, linear: ≈ +45 % at Hb 7; research/12 BF-18 "CO ↑")]<br>HAND TW (automatic TW): CO +10.7 % (expected ≈ +45 %) comes only from the albumin volume (+234 mL blood volume): Hb itself does not act on CO (R11) | **TW** (audit 09 R11 pending) | F12 · 7a / 7c (anaemia → CO) |
| BF-19 | P2 | X-A GA vent · acute normovolaemic haemodilution (ANH) → exchange 1.5 L blood for albumin 5 % over 30 min (Hb 15 → ≈ 11): DO2 kept by CO | hbEnd 10.803; coPct -7.4; do2Pct -32.2; dHr -1; svo2 79.895 | WR: coPct = -7.4 below [10, 40] [Messmer 1975 / Habler & Messmer 1997 (ANH to Hct 25–30: CO rises by lower viscosity and venous return, DO2 kept)]<br>TS: do2Pct = -32.2 below [-15, 5] [DO2 maintained during ANH down to Hct ≈ 25 % (Habler 1997; research/12 BF-19)]<br>HAND WR (automatic WR): CO FALLS 7 % during ANH under GA and DO2 falls 32 %: no viscosity/venous-return or sympathetic response to haemodilution (R11); ANH as taught (DO2 kept by CO) cannot be shown | **WR** (audit 09 R11 pending) | F12 · 7a / 7c (anaemia → CO) |
| BF-20a | P2 | X-A GA vent, FiO2 0.5 · septic shock warm (7e sepsis 1: kfMult × leak) → 0.9 % saline 30 mL/kg over 30 min: lung water and PaO2 (vs the same load healthy) | kf 2.594; dEvlwiSepsis 0; dEvlwiHealthy 1.734; dPao2Sepsis 15; dPao2Healthy 9; dVisfSepsis 1296; dVisfHealthy 1019 | WR: dEvlwiSepsis = 0 (expected sign 1) [capillary leak: a fluid load raises extravascular lung water in sepsis (Sakka 2002 Chest 122:2080; tables §5e)]<br>WR: dPao2Sepsis = 15 (expected sign -1) [lung water lowers PaO2 at fixed FiO2 (tables §5e; research/12 BF-20)]<br>HAND WR (automatic WR): the same 30 mL/kg gives +1.7 mL/kg lung water in a HEALTHY patient and 0 in septic shock (kfMult 2.6), and PaO2 RISES 15 mmHg: 7c's lung-water step filters only above the oedema threshold σ·COP − 2 (circ-adapter.ts:80–81) and nothing lowers σ in sepsis (7e writes kfMult only, endo/adapters.ts:173–181), so a leak without high pulmonary venous pressure makes no lung water | **WR** | F4 · 7e adapters.ts writeBlood → 7c lungWaterStep (F4) |
| BF-20b | P2 | X-A GA vent · septic shock warm → 30 mL/kg saline: MAP gain at the end and 60 min later (transient) | mapBase 78; dMapPeak 9.17; dMap60After 10.1; keptFrac 1.11; dCoPeak 2.02 | PL: dMapPeak = 9.17 in [3, 15] [fluid bolus in septic shock: MAP +5–10 mmHg (Glassford 2014 Crit Care 18:696)]<br>TS: keptFrac = 1.11 above [0, 0.5] [the MAP gain dissipates within 60 min (Glassford 2014; Nunes 2014 Ann Intensive Care 4:25)]<br>HAND TS (automatic TS): the MAP gain is still +10 mmHg an hour after the bolus (kept 111 %): the expanded volume is neither excreted (F1) nor lost fast enough to the leaky interstitium (+1.3 L ISF), so the bolus acts like a durable volume expansion | **TS** | F1, F4 · 7d renal volumeFactor (F1) / 7c fluids.ts leak (F4) |
| BF-21a | P2 | HFrEF 60 y 80 kg (and severe MR 60 y) awake, room air · compensated HFrEF / chronic severe MR → 0.9 % saline 1.5 L over 30 min: PAWP | pawpBaseHF 13; pawpPeakHF 26; pawpBaseMR 19; pawpPeakMR 32 | PL: pawpPeakHF = 26 in [25, 40] [tables §7 check 11 (HFrEF/MR + 1.5 L: PAWP 15 → > 25); research/12 BF-21] | **PL** | — · 7a circ / 7c |
| BF-21b | P2 | HFrEF awake · compensated HFrEF → 1.5 L saline: extravascular lung water (7c extra EVLWI above the 7b baseline ≈ 7 mL/kg) | evlwiExtraHF 3.857; evlwiExtraMR 7.799; copEnd 14.655 | PL: evlwiExtraHF = 3.857 in [3, 15] [tables §7 check 11 (EVLWI > 10 mL/kg from a normal ≈ 7: Sakka 2002 Chest 122:2080)] | **PL** | — · 7c circ-adapter.ts lungWaterStep |
| BF-21c | P2 | HFrEF awake, room air · compensated HFrEF → 1.5 L saline: SpO2 | spo2BaseHF 96; spo2MinHF 95; spo2MinMR 92; rrMaxHF 17.218 | TW: spo2MinHF = 95 above [89, 92] (lower = stronger/faster) [tables §7 check 11 (SpO2 96 → 89–92)] | **TW** | F13 · 7b lung water → gas exchange |
| BF-22a | P2 | X-A GA vent, profile albumin 20 g/L · hypoalbuminaemia → baseline: plasma COP and the lung-oedema threshold (COP − 2) | cop 8.655; copNormal 22.353; oedemaThreshold 6.7 | TS: cop = 8.655 below [11, 17] (lower = stronger/faster) [Weil 1979 Crit Care Med 7:113 / Mangialardi 2000 J Trauma 48:37 (COP ≈ 12–16 mmHg at albumin 20 g/L; normal 22–25)]<br>HAND TS (automatic TS): COP 8.7 mmHg at albumin 20 g/L: total protein is taken as 1.6 × albumin (fluids.ts:53–54), so the globulins (≈ 25–30 g/L, a third of normal COP) fall with the albumin; the lung-oedema threshold drops to PAWP 6.7 | **TS** | F8 · 7c fluids.ts copPlasma (F8) |
| BF-22b | P2 | X-A GA vent, profile albumin 20 g/L · hypoalbuminaemia → baseline: anion gap and base excess (Figge) | ag 11.846; agNormal 11.886; dAg -0.041; dBE 0.05; dHco3 0.043 | TW: dAg = -0.041 above [-6.5, -3.5] [Figge 1998 Crit Care Med 26:1807 (AG falls 2.5 mmol/L per 10 g/L albumin fall)]<br>HAND IN (automatic TW): a PROFILE albumin of 20 g/L gives the normal AG (11.8) and BE 0, because createBloodCore solves the unmeasured anions to hold HCO3 24.4 (core.ts:78–84) and so absorbs the albumin charge; the SAME hypoalbuminaemia reached by dilution (BF-01a, albumin −10.6) lowers the AG by 3.7 as Figge predicts — one state, two answers | **IN** | F8 · 7c core.ts createBloodCore (calibrateXa) (F8) |
| BF-22c | P2 | X-A GA vent, profile albumin 20 g/L · hypoalbuminaemia → propofol 2 mg/kg: free (unbound) drug fraction and effect | dMapPct 0; cePropMaxLowAlb 3.054; cePropMaxNormal 3.053 | MI: freeFraction: absent [free fraction of highly bound drugs rises in hypoalbuminaemia (Miller 10e ch. 20; research/12 BF-22)] | **MI** | F13 · 7g (no protein binding) |

### 2.7 Metabolic alkalosis; coagulation P2 (NE)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-15a | P2 | X-A awake · metabolic alkalosis from vomiting / NG loss → the state: an alkali-gaining (H+ and Cl loss) event | — | no gastric/alkali-loss event; the state exists only as a profile HCO3 (research/12 §5.10 "P 2") | **NE** | F13 · FU-7 (7c event) |
| BF-15b | P2 | X-A awake spontaneous, room air, profile HCO3 34 · metabolic alkalosis HCO3 34 (profile proxy) → baseline: compensatory hypoventilation | paco2 38.815; ph 7.553; hco3 33.826; dPaco2 -0.06; dVe 0.015; iCa 1.123; k 4.183 | WR: dPaco2 = -0.06 below [5, 9] [Javaheri 1982 / "Boston rules": PaCO2 +0.7 per 1 mmol/L HCO3 rise (+7 ± 2 for HCO3 34)]<br>HAND WR (automatic WR): PaCO2 38.8 at HCO3 34 (pH 7.55): the chemoreflex set point moves only DOWN for metabolic acidosis (spont.ts:7 and paco2SetPoint at :55, "metabolic alkalosis is not compensated (v1)"), so there is no compensatory hypoventilation | **WR** | F9 · 7f neuro/spont.ts (F9) |
| BF-27a | P2 | X-A GA vent · cardiac-surgery anticoagulation → ACT > 480 s after heparin 300 u/kg | — | no heparin or protamine in the library, no ACT (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-27b | P2 | X-A GA vent · cardiac-surgery anticoagulation → protamine: systemic hypotension | — | no heparin or protamine in the library, no ACT (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-27c | P2 | X-A GA vent · cardiac-surgery anticoagulation → protamine: pulmonary hypertension (type III reaction) | — | no heparin or protamine in the library, no ACT (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-28a | P2 | X-A GA vent · sepsis / AFE → DIC → platelets ↓, fibrinogen ↓ | — | no DIC state or coagulation readouts (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-28b | P2 | X-A GA vent · sepsis / AFE → DIC → D-dimer ↑, microvascular bleeding | — | no DIC state or coagulation readouts (7i, R58/R60 v1.1) | **NE** | 7i · 7i |
| BF-31 | P2 | X-A GA vent · core 32 °C → ABG reported α-stat (37 °C) vs temperature-corrected (pH-stat) | labKeys ph,pco2,po2,hco3,be,so2,cohb,methb,lactate,na,k,cl,iCa,mg,hb,glucose,ag,osm | the lab panel has no patient-temperature field or corrected values (7i, R58) | **NE** | 7i · 7i |

### 2.8 Electrolyte extremes and poisoning (P2/P3)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-09a | P2 | X-A GA vent, profile K 2.5 · hypokalaemia 2.5 → the state: ECG (U waves, T flattening) and ectopy | k 2.493; ecgK 4.2; qrs 93; rhythms 10s sinus | TS: ecgK = 4.2 above [2.2, 2.8] [K 2.5: U waves, T flattening, ST depression (Mattu 2000; Stage 5.1 morphology from K < 3.5)]<br>HAND WR (automatic TS): the ECG shows K 4.2 for a plasma K of 2.5: bloodEcgTargets pushes only the CHANGE from the profile set point (blood/pipeline.ts:209–211, engine.ts:857–866), so a profile hypo/hyperkalaemia never reaches the ECG; no ectopy mechanism exists either | **WR** | F2 · 7c pipeline.ts bloodEcgTargets (F2) |
| BF-09b | P2 | X-A GA vent, profile K 2.5 · hypokalaemia 2.5 → rocuronium 0.6 mg/kg: clinical duration (T1 25 %) vs normokalaemia | t25LowK 35.7; t25Normal 35.7; dMin 0 | WR: dMin = 0 (expected sign 1) [hypokalaemia potentiates and prolongs non-depolarising block (Miller 10e ch. 27; research/12 BF-09)]<br>HAND MI (automatic WR): identical T1 25 % time at K 2.5 and 4.2: ec50Multipliers reads volatile MAC, Mg (from the neuro profile), temperature and the nm profile, never plasma K (neuro/interactions.ts:23–45) | **MI** | F10 · 7f neuro/interactions.ts (F10) |
| BF-10a | P2 | X-A GA vent, profile Mg 0.5 · hypomagnesaemia with torsades de pointes → magnesium sulfate 2 g over 2 min: termination | rhythmsI 5s sinus,305s torsades,470s sinus; rhythmsC 5s sinus,305s torsades; convertedS 110 | PL: convertedS = 110 in [5, 300] [MgSO4 2 g terminates torsades within minutes (ERC 2021 ALS; research/12 BF-10)] | **PL** | — · 7g hooks.ts |
| BF-10b | P2 | X-A GA vent, profile Mg 0.5 · hypomagnesaemia → magnesium sulfate 2 g: plasma Mg at 15 min | mgBase 0.5; dMg15 0.452; dMgPeak 0.58 | PL: dMg15 = 0.452 in [0.3, 0.8] [2 g MgSO4 = 8.1 mmol into ≈ 14 L ECF → +0.58, then redistribution (Miller 10e ch. 47; research/12 BF-10)] | **PL** | — · 7c pipeline.ts observeDoses |
| BF-11a | P2 | X-A awake (TURP under spinal) · glycine 1.5 % absorption 3 L in 30 min → the state: plasma Na and osmolality | naMin 119.487; naEnd 119.487; osmEnd 281.433; osm2h 275.263; dMapPeak 11.37; dHrMin -7 | PL: naMin = 119.487 in [115, 125] [TURP syndrome: 3 L glycine absorbed → Na ≈ 120 (Hahn 2006 BJA 96:8; research/12 RH-23)] | **PL** | — · 7c fluids.ts / solutes.ts |
| BF-11b | P2 | X-A awake · glycine absorption 3 L → the same: CNS signs (brain water, ICP, consciousness) | dIcp2h 0.02; dIcpMax 0.08; osm2h 275.263 | TW: dIcpMax = 0.08 (sign 1, beyond 1) [hypo-osmolality swells the brain: confusion, seizures, raised ICP (Hahn 2006; Barash TURP syndrome)]<br>HAND MI (automatic TW): the brain model reads only mannitol/hypertonic-saline doses (brain/model.ts:81–95), never plasma osmolality or Na, so hyponatraemic brain swelling and its CNS signs do not exist | **MI** | F11 · 7d brain/model.ts (reads osmotherapy only) |
| BF-32a | P2 | X-A awake spontaneous · CO poisoning, COHb 30 % (profile) → pulse oximetry vs co-oximetry; O2 content | spo2 97; so2Fractional 67.5; cohb0 30; cao2Ratio 0.7; lact 1.014 | PL: spo2 = 97 in [94, 100] [Barker & Tremper 1987 Anesthesiology 66:677 (SpO2 ≈ HbO2 + COHb: the oximeter over-reads)]<br>PL: cao2Ratio = 0.7 in [0.6, 0.8] [COHb 30 % removes ≈ 30 % of the O2-carrying Hb (Hampson 2012 AJRCCM 186:1095)] | **PL** | — · 7c odc.ts / FU-5 pulse oximetry |
| BF-32b | P2 | X-A awake spontaneous, FiO2 1.0 · CO poisoning, COHb 30 % → normobaric O2 for 60 min: COHb elimination | cohb0 30; cohb60 30; ratio60 1 | TS: ratio60 = 1 above [0.4, 0.65] [COHb t½ 74 ± 25 min on FiO2 1.0 (Weaver 2000 Chest 117:801): 60 min → 0.4–0.65 of the start]<br>HAND MI (automatic TS): COHb is a static profile fraction (odc.cohb set once in createBloodCore, core.ts:77): 30 % at 0 and at 60 min on FiO2 1.0 — no CO uptake/elimination kinetics (audit 09 A09-G3, R11 still open) | **MI** (audit 09 R11 pending) | F12 · 7c odc.ts / 3 gas (no CO kinetics) |
| BF-23 | P3 | X-A awake spontaneous, FiO2 0.5 · methaemoglobinaemia 30 % (profile) → methylene blue 2 mg/kg | spo2 84; sao2 99.807; pao2 270 | methylene blue is not in the library and MetHb has no kinetics (static profile fraction) | **NE** | F13 · FU-7 (drug) / 7c odc.ts |

### 2.9 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| BF-M1 | P1 | X-A GA vent MANUAL · class III (1500 mL / 10 min) → Ringer's lactate 1 L over 30 min (MODELED twin BF-02b) | mapBase 53; dMap 29; dHr -3; dCvp 3.026 | PL: dMap = 29 (sign 1, beyond 2) [a fluid bolus raises MAP in hypovolaemia (non-reflex physiology; audit 08 Q9)] | **PL** | — · Q9 (MANUAL physiology) |
| BF-M2 | P1 | X-A GA vent MANUAL · acute hyperkalaemia ≈ 8.5 (burns 0.633 + succinylcholine) → the state (MODELED twin BF-07c): ECG and arrest | kPeak 8.48; qrsPeak 253; rhythms 5s sinus; arrest false | PL: qrsPeak = 253 (sign 1, beyond 120) [the K ECG morphology is physiology, shown in MANUAL too (QRS > 120 at K 8.5; Mattu 2000)] | **PL** (FU-4 pending) | F12 · Q9 / FU-4 G3 |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

Gaps are ranked by clinical reach: the number of cells, weighted by P1 and by what a trainee sees in the first
minutes. Line numbers are on 776ebb5. Mechanism comes first; no band was widened (R45).

### F1 — An expanded blood volume is never excreted (new, P1; owner 7d, with 7c)
- **Cells:** BF-02a (WR), BF-02b (WR), BF-04 (TW), BF-01a (TW), BF-01b (TS), BF-14 (TW), BF-20b (TS).
- **Measured:**
  - 1 L of Ringer's over 30 min is 74 % intravascular at the end, 53 % 30 min later and 50 % at 90 min.
  - Awake and GA give the same retention (0.53), and so does class III (0.53).
  - Urine rises only 11–17 mL/h.
  - 1 u RBC: Hb +0.55 g/dL at 1 h and at 4 h, with 191 of its 280 mL still circulating.
  - 5 L of saline: 3.4 L intravascular at the end, Hb 15 → 8.8, albumin −14 g/L, extra lung water 9.5 mL/kg in a
    healthy lung.
- **Expected:**
  - 20–30 % retention 30 min after the end awake, more under GA and in hypovolaemia (Hahn 2010; Norberg 2007;
    Drobin & Hahn 1999);
  - Hb +1 g/dL per unit (Wiesen 1994).
- **Code:**
  - `renal/model.ts:49–54`: `volumeFactor` returns 1 for any `bvRel ≥ 1`, so an expansion sends no natriuretic or
    ADH-suppression signal. Urine above basal then comes only from pressure natriuresis on a barely changed MAP.
  - When 7d is present its seam replaces 7c's volume-receptor elimination (`blood/core.ts` step 1, `fluids.ts`
    `elimMlMin`). With it goes 7c's GA factor `K_EL_GA_FACTOR` (`params.ts:45`), so GA and awake are identical.
- **Smallest mechanism:** give `volumeFactor` an expansion branch (V > 1 for `bvRel > 1`: atrial stretch → ANP and
  ADH suppression). Size its slope so that 1 L of RL awake is ≈ half eliminated 30 min after the end (7c's own
  fitted t½ ≈ 30 min, tables `t12El`). Keep `S_GA` (`renal/model.ts:101`) and hypovolaemia's `vNh` acting on it, so
  GA and bleeding retain more. No new state is needed.
- **Tests moved:**
  - `test/l2/blood/fluids.test.ts` (the 51 %/16 % crystalloid fit, which runs without 7d);
  - `test/l2/renal/model.test.ts`;
  - the 7c/7d soak (water balance, R-gate "urine 2.68 % vs ±2 %");
  - research/12 RH-01/RH-03.

### F2 — A profile hyper- or hypokalaemia never reaches the ECG; calcium then shows hypokalaemia (new, P1; owner 7c)
- **Cells:** BF-07a/b/c (WR), BF-08a (WR), BF-09a (WR). DI-26 noted the offset in passing; no plan carries it.
- **Measured:**
  - A profile K⁺ of 6.5, 7.5, 8.5 or 2.5 shows ECG K⁺ 4.2 and QRS 93 ms.
  - The same K⁺ reached acutely shows correctly: ECG K⁺ 6.48 / 7.45 / 8.46, QRS 93 / 121 / 253.
  - Calcium 1 g in the profile-K⁺ 7.5 patient drives the displayed K⁺ to 3.1, i.e. U waves.
- **Code:** `blood/pipeline.ts:209–211`. `bloodEcgTargets` returns `kEcg − so.set.k`, and `engine.ts:857–866` adds
  that delta to `Modifiers.k`, which starts at 4.2 (`modifiers.ts:16`) whatever the profile.
- **Smallest mechanism:** make the target absolute relative to the Modifiers default: `kEcg − 4.2`. Or seed
  `ps.blood.ecg.k` at creation with `4.2 − set.k`, so the first push carries the profile K⁺. An instructor's own
  `setModifiers` k is still preserved by the delta rule.
- **Tests moved:** `test/l2/blood/pipeline.test.ts` (ECG push); DI-26 (research/14) QRS row; FU-4 Task 7's
  potassium tests, which start from a profile K⁺.

### F3 — Low flow cuts O₂ uptake instead of raising extraction: SvO₂ rises in haemorrhage (new, P1; owner 7c)
- **Cell:** BF-29b (WR).
- **Measured:** after a 2 L bleed:
  - CO 4.6 → 2.1;
  - DO₂ 955 → 420 mL/min (6 mL/kg/min);
  - VO₂ 203 → 78 mL/min;
  - SvO₂ 77 → 84 % (lab VBG SO₂ 84.3);
  - lactate 1.0 → 3.6 over 25 min.
- **Expected:** extraction rises toward ER_max (SvO₂ < 65 %) before VO₂ becomes supply-dependent (Rivers 2001;
  Vincent & De Backer 2013).
- **Code:** `blood/oxygen.ts:24–27`. The regional deficit `demand·REGIONAL_FRAC·f(q)` (`params.ts:65–67`) is
  subtracted from VO₂ as soon as flow falls below 88 % of rest. Venous content is then computed from that reduced
  VO₂ (`core.ts` step 3).
- **Smallest mechanism:** keep the regional-flow criterion for lactate, but let the regional beds extract up to
  `ER_MAX` (`params.ts`) of their own delivery first. Regional VO₂ = min(regional demand, ER_MAX × regional DO₂),
  where regional DO₂ = flow share(q) × CaO₂. The deficit is what remains. SvO₂ then falls with CO, and lactate still
  appears at the same flows.
- **Tests moved:**
  - `test/l2/blood/oxygen.test.ts`;
  - tables §7 17a (class III lactate 3–5 at 30 min, which must hold);
  - BF-29 and every VBG row.

### F4 — Septic capillary leak does not make lung water (new, P2; owner 7e → 7c)
- **Cells:** BF-20a (WR), BF-20b (TS, with F1).
- **Measured** (30 mL/kg saline in warm septic shock, `kfMult` 2.6):
  - extra EVLWI +0.0 in sepsis vs +1.7 mL/kg healthy;
  - PaO₂ +15 mmHg (it rises);
  - ISF +1.3 L;
  - MAP +9 at the end and still +10 an hour later.
- **Code:**
  - `blood/circ-adapter.ts:80–81`: lung water filters only above `σ·COP − 2`;
  - `endo/adapters.ts:173–181`: 7e writes `kfMult` but never `σ` (its own comment flags the gap);
  - so a leak without a high pulmonary venous pressure makes no lung water.
- **Smallest mechanism:** 7e writes `fl.sigma` from its condition rows alongside `kfMult` (sepsis/anaphylaxis/burns:
  σ 0.9 → 0.5–0.7 by grade [ENG, Q for Ali]). 7c already passes `sigmaRel` to `lungWaterStep` and uses `f.sigma` in
  `starling()`, so no new term is needed.
- **Tests moved:** `test/l2/blood/circ-adapter.test.ts`; the 7e sepsis/anaphylaxis tests (lung row); tables §5e.

### F5 — Citrate: missing from the SID and cleared too slowly in low flow; stored products carry no acid (new, P1; owner 7c)
- **Cells:** BF-05d (TW), BF-05a (TS).
- **Measured** (class IV plus 10 u RBC + 10 u FFP over 40 min, no calcium):
  - BE never below −0.1 while lactate reaches 7.1;
  - iCa nadir 0.42 at the end of the transfusion, with free citrate 7.9 mmol/L;
  - the bleed alone gives lactate 5.9 at BE −3.6, with PaCO₂ 38 → 53 at fixed ventilation.
- **Expected:**
  - class IV BE ≤ −10 (ATLS), with the metabolic alkalosis coming later, after citrate is metabolised
    (Driscoll 1987);
  - iCa 0.6–0.95 (Giancarelli 2016; Ho & Leonard 2011).
- **Code:**
  - `blood/solutes.ts:37–38`: `sidOf` omits `citrate`, so citrate-carried Na counts as a strong cation at once;
  - `params.ts:157–158`: product compositions carry no lactate or acid;
  - `solutes.ts` `stepSolutes`: citrate τ = 5 min / (`hbfRel × liver`), with `hbfRel = (CO/CO₀)²`
    (`params.ts` `HBF_EXP`).
- **Smallest mechanism:**
  - subtract free citrate (3 mEq/mmol) in `sidOf`. Metabolism then turns it into bicarbonate by construction, giving
    the early acidosis and the late alkalosis;
  - add the stored-RBC supernatant lactate (≈ storage days / 2 mmol/L [VERIFY]).

  The iCa depth then depends only on the citrate clearance. Q for Ali: the hepatic-flow exponent for citrate, or a
  floor.
- **Tests moved:** `test/l2/blood/solutes.test.ts`, `treatments.test.ts`; A08-G3 (10 u RBC, PL on audit 08: re-check).
- **Related, not graded here (Q for Ali):** PaCO₂ rising 15 mmHg at fixed ventilation in class IV shock.

### F6 — Renal K⁺ excretion is independent of plasma K⁺ and of diuretics (new, P1 treatment cell; owner 7d)
- **Cell:** BF-08d (TW).
- **Measured:** furosemide 40 mg at K⁺ 7.5: urine +173 mL/h, K⁺ −0.01 at 3 h.
- **Code:** `organs/pipeline.ts:168–172`. `renalSeam` excretes K⁺ at the fixed `URINE_K` × the urine above basal.
- **Smallest mechanism:** urine K⁺ ∝ plasma K⁺ (distal secretion) × an aldosterone/flow factor, with furosemide's
  distal-flow boost (7d already carries `furoE`).
- **Tests moved:** `test/l2/renal/model.test.ts`; RH-07 (research/12 §5.1).

### F7 — Chronic lung states start with acute acid–base (new, P1; owner 7b profile → 7c)
- **Cell:** BF-16b (TW).
- **Measured:** COPD GOLD 3 gives PaCO₂ 45.1, HCO₃ 25.0, pH 7.36, i.e. +1.25 per 10 mmHg (chronic: +3.5).
- **Code:** `blood/core.ts:78–84` calibrates HCO₃ to 24.4 at PaCO₂ 40 unless `blood.hco3` is given. The COPD lung
  condition does not supply it.
- **Smallest mechanism:** when a chronic hypercapnic lung condition is in the profile, set the profile HCO₃ from the
  chronic rule (24 + 0.35 × (PaCO₂ − 40)), from the lung condition's resting PaCO₂.
- **Tests moved:** CM-07 (research/12 §5.7); the 7b COPD condition tests (`test/l2/lung`), which pin the baseline PaCO₂.

### F8 — Albumin: COP from 1.6 × albumin, and profile calibration hides the albumin anion (new, P2; owner 7c)
- **Cells:** BF-22a (TS), BF-22b (IN).
- **Measured:**
  - at albumin 20 g/L: COP 8.7 mmHg (normal 22.4), lung-oedema threshold PAWP 6.7, AG 11.8 (unchanged), BE 0;
  - dilution to albumin −10.6 (BF-01a) lowers the AG by 3.7.
- **Code:**
  - `blood/fluids.ts:53–54`: total protein = 1.6 × (albumin + colloid), so the globulins scale with albumin;
  - `blood/core.ts:78–84`: `calibrateXa` holds HCO₃ 24.4 whatever the albumin.
- **Smallest mechanism:**
  - total protein = albumin + a fixed globulin mass (≈ 25–30 g/L, diluted with the plasma);
  - for a profile albumin, calibrate XA at the NORMAL albumin and then apply the profile albumin, so the Figge
    alkalosis and the low AG appear (or state it as a Q: should a profile's HCO₃ be the patient's measured one?).
- **Tests moved:** `test/l2/blood/fluids.test.ts`, `core.test.ts`, `circ-adapter.test.ts` (oedema threshold).

### F9 — Metabolic alkalosis is not compensated (new, P2; owner 7f)
- **Cell:** BF-15b (WR). Its state is made only through the profile (BF-15a NE: no gastric-loss event, FU-7).
- **Measured:** HCO₃ 34 gives PaCO₂ 38.8 and pH 7.55 (expected PaCO₂ ≈ 47).
- **Code:** `neuro/spont.ts:7` and `paco2SetPoint` at `:55`: the set point moves only down (Winter).
- **Smallest mechanism:** a symmetric set point, `paco2Set = paco2Rest + 0.7·(HCO₃ − 24)` above 24, capped at ≈ 55.
- **Tests moved:** `test/l2/neuro/spont.test.ts`.

### F10 — Hypokalaemia does not potentiate non-depolarisers (new, P2; owner 7f)
- **Cell:** BF-09b (MI).
- **Measured:** rocuronium 0.6 mg/kg T1 25 % at 35.7 min at both K⁺ 2.5 and 4.2.
- **Code:** `neuro/interactions.ts:23–45`: no K⁺ input. Mg comes from the neuro profile, not 7c (DI-90 IN).
- **Smallest mechanism:** read 7c's `out.k` and `out.mg` into `InteractionCtx`, with a K⁺ term below 3.5
  ([ENG] size, Q for Ali).
- **Tests moved:** `test/l2/neuro/interactions.test.ts`; DI-90.

### F11 — The brain ignores plasma osmolality (new, P2; owner 7d)
- **Cell:** BF-11b (MI).
- **Measured:** glycine 3 L gives Na 119.5, osm 281 → 275, and ΔICP ≤ 0.08 mmHg.
- **Code:** `brain/model.ts:81–95`: brain water moves only for mannitol/hypertonic-saline doses.
- **Smallest mechanism:** brain water follows the plasma effective-osmolality change (7c `out.osm`) with the same
  τ-in/τ-out as osmotherapy. That gives hyponatraemic swelling, and makes the osmotherapy terms one mechanism.
- **Tests moved:** `test/l2/brain`; NN-26; RH-23.

### F12 — Owned elsewhere (measured, not re-reported as new)
- **FU-4 G3** (potassium → arrhythmia/arrest): BF-07c. At K⁺ 8.5 the heart is in sinus rhythm at MAP 95 with a
  253 ms sine wave for 15 min. BF-M2 is the same in MANUAL.
- **Audit 09 R11** (anaemia → CO; CO kinetics):
  - BF-18a: HR −1 at Hb 6.7;
  - BF-18b: CO +10.7 %, from the albumin volume only; DO₂ −50 %; SvO₂ 57;
  - BF-19: CO −7 % during ANH; DO₂ −32 %;
  - BF-32b: COHb 30 → 30 % after 60 min on FiO₂ 1.0.

### F13 — Smaller gaps
- **BF-21c (TW, 7b):** 1.5 L in HFrEF raises extra lung water 3.9 mL/kg and PAWP to 26, but SpO₂ falls only
  96 → 95 (MR 92). The lung-water → shunt coupling is weak.
- **BF-22c (MI, 7g):** no protein binding, so hypoalbuminaemia leaves propofol Ce 3.05 vs 3.05.
- **BF-15a (NE, FU-7 7c event):** no alkali-loss (vomiting/NG) event.
- **BF-23 (NE):** methylene blue is absent and MetHb has no kinetics (a static profile fraction).
- **Observed, not graded:**
  - Glucose was flat under insulin–dextrose (BF-08b `dGluMin` 0): the 7g `insulinDextrose` row has an empty PD
    (`pk/data/rows-other.ts:26`), so only 7c's K⁺ curve acts. The ET run owns glucose.
  - Class IV haemorrhage at fixed ventilation raises PaCO₂ 38 → 53 (F5, Q4).

## 4. Cells blocked by missing features

| blocker | cells | what is missing | owner |
|---|---|---|---|
| **7i labs & coagulation** (R58; deferred to **v1.1** by R60) | BF-05e, 24, 25a–e, 26a–d, 27a–c, 28a–b, 31 (**17**, of which 11 P1) | coagulation factors, fibrinogen, platelets, INR/aPTT beyond 7d's liver-function INR (stays 1.00 after ≈ 1.5 BV dilution: albumin 17.6, Hb 11.1), TEG/ROTEM, fibrinolysis/TXA PD (TXA is an accepted placeholder), heparin/protamine and ACT, cryo/fibrinogen/PCC (rejected), a DIC state, temperature-corrected gases | 7i |
| alkali-loss event | BF-15a | gastric/NG loss (H⁺ and Cl⁻) | FU-7 (7c event) |
| missing drug | BF-23 | methylene blue (and MetHb kinetics) | FU-7 library / 7c |

Probe numbers are stored with each NE cell, so 7i starts from what exists today. Its acceptance list is BF-24…28,
BF-31 and BF-05e as designed in research/12 §5.10, with the expected responses:
- INR/aPTT ↑, fibrinogen < 1.5 g/L and platelets < 100 at 1.5 BV;
- EXTEM CT ↑ / A10 ↓, FIBTEM A10 < 7;
- LY30 ↓ with TXA;
- ACT > 480 s after heparin 300 u/kg;
- protamine hypotension/PH.

## 5. Proposed scripted suite (the owners' acceptance cells)

`22-audit-scripts/cli.ts all` re-runs every cell in ≈ 40 min of wall time; `report.ts` prints the tables.

| owner | cells to re-measure at its gate | acceptance items (bands are Ali's proposals) |
|---|---|---|
| **7d** (F1, F6, F11) | BF-02a/b, 04, 01a/b, 14, 20b, 08d, 11b | RL 1 L: retention 20–30 % awake 30 min after the end, GA − awake ≥ +0.05, class III − GA ≥ +0.05; 1 u RBC Hb +0.7–1.3; 2 L saline BE −1 to −4; furosemide at K⁺ 7.5 lowers K⁺; glycine hyponatraemia raises ICP |
| **7c** (F2, F3, F5, F8) | BF-07a/b, 08a, 09a, 29b, 05a, 05d, 22a/b | ECG K⁺ = plasma K⁺ ± 0.3 for a profile; calcium never shows K⁺ < 3.5 on the ECG; SvO₂ < 65 % at CO ≈ 2 with lactate rising; class IV + MTP BE ≤ −10; iCa 0.6–0.95 at 1 u / 2 min; COP 11–17 and AG −3.5 to −6.5 at albumin 20 |
| **7e → 7c** (F4) | BF-20a/b | septic 30 mL/kg: EVLWI ↑ and PaO₂ ↓ more than healthy; MAP gain ≤ 50 % at 60 min |
| **7f** (F9, F10) | BF-15b, 09b | PaCO₂ +5–9 at HCO₃ 34; rocuronium longer at K⁺ 2.5 |
| **7b / profile** (F7, F13) | BF-16b, 21c | COPD HCO₃ +3–4.5 per 10 mmHg; HFrEF + 1.5 L SpO₂ 89–92 |
| **FU-4 G3** | BF-07c, M2 | VF/asystole/block at K⁺ 8.5 (and no arrest at 6.5: BF-07a) |
| **R11 owner (FU-6/7i)** | BF-18a/b, 19, 32b | HR +10–20 and CO +20–60 % at Hb 7 awake; CO +10–40 % in ANH; COHb t½ 50–100 min on FiO₂ 1 |
| **7i** | §4 cells | as designed |
| **regression** (PL today) | BF-01a (Cl), 03a/b, 05b/c, 06a/b, 08b/c, 10a/b, 12, 13a–c, 16a, 17a–c, 21a/b, 29a, 30, 32a | must stay PL |

For each gate the owner runs `node --import ./hooks.mjs --experimental-strip-types cli.ts <ids>` against its
branch's worktree (`PME_ENGINE=…`) and puts the `report.ts` rows in its gate note beside this run's column
(research/12 §7).

## 6. Questions for Ali (with the model's numbers)

1. **Crystalloid kinetics (F1).**
   - Today, 1 L of Ringer's is still 53 % intravascular 30 min after it ends, whatever the context (awake, GA,
     class III), and 50 % at 90 min.
   - Hahn's volume kinetics say 20–30 % awake, with GA and hypovolaemia retaining more.

   Should the kidney excrete an expanded volume at Hahn's rate (t½ ≈ 30 min awake, ≈ 2.5 h under GA)? This decides
   the Hb after transfusion (+0.55 today, +1 expected) and how long a fluid bolus holds MAP in sepsis (111 % at 1 h
   today).
2. **SvO₂ in haemorrhage (F3).** At CO 2.1 after a 2 L bleed, the model's SvO₂ is 84 % and lactate 3.6. Is
   "SvO₂ < 60–65 % before lactate rises" what you teach for haemorrhagic shock? The fix moves every VBG and SvO₂
   readout in low flow.
3. **Massive transfusion (F5).** At 10 u RBC + 10 u FFP in 40 min without calcium, iCa reaches 0.42. How low
   should iCa go at 1 unit per 2 minutes without calcium (the literature's severe cases: 0.6–0.8)? And should the
   early acidosis then late alkalosis of citrate be taught? Today the transfusion alkalinises at once, so BE stays 0
   at lactate 7.
4. **Class IV at fixed ventilation.** PaCO₂ rises 38 → 53 while EtCO₂ falls. Is a ≈ 15 mmHg arterial rise at a
   fixed minute ventilation acceptable for a 43 % bleed, or should the acidosis be mainly metabolic
   (BE ≤ −10, ATLS)?
5. **Hypoalbuminaemia (F8).** For a patient built with albumin 20 g/L:
   - should the profile show the Figge picture (low AG ≈ 6.5, a mild alkalosis), or should the profile HCO₃ be
     honoured as the patient's measured value?
   - should COP be ≈ 14 mmHg (globulins kept) rather than today's 8.7?
6. **Septic leak (F4).** The σ values for sepsis/anaphylaxis/burns are not in the tables. Is σ 0.9 → ≈ 0.6 in septic
   shock acceptable as the lung-water driver? Today septic lungs get less water than healthy ones from the same
   30 mL/kg.
7. **Direction-only cells** (no sourced magnitude; `dirOnly` in the scripts):
   - calcium's pressor effect in hypocalcaemia: +7 mmHg at iCa 0.9 vs 0 when normocalcaemic;
   - furosemide's K⁺ effect;
   - the Mg rise after 2 g (+0.45 at 15 min);
   - the two MANUAL twins.

   Please confirm the directions or give bands.
8. **Weiskopf interpolation (BF-18).** research/12's band is HR +10–20 at Hb 7. A linear interpolation of Weiskopf
   1998 (to Hb 5) gives ≈ +23 bpm and CI +45 %. Which should 7i/FU-6 target? The model gives −1 bpm and +11 %.
9. **Profile potassium on the ECG (F2).** Should a patient *built* with K⁺ 8.5 arrive with a sine wave (as a patient
   sent from the ward would)? We assume yes; today the ECG is normal until the K⁺ changes.

## 7. Files and how to re-run

All files are in `22-audit-scripts/`. Nothing outside `docs/review-inputs/` was changed.
- `runner.ts`: the arm runner. It loads the engine from `PME_ENGINE` (default: this checkout's
  `packages/engine-core/src/index.ts`), samples the committed state read-only, keeps `labResult` events, and yields
  once per simulated minute.
- `spec.ts`: cell type, contexts, states (class II/III/IV, sepsis) and measure helpers.
- `grade.ts`: automatic grading, with `invert`, `hand`, `known` and `ne`. `regrade.ts` re-applies the specs to the
  stored values.
- `cells-a.ts`: P1 fluids, transfusion, acid–base, coagulation. `cells-b.ts`: P1 hyperkalaemia.
  `cells-c.ts`: P2/P3, CO and MANUAL.
- `cli.ts`: runs the cells into `out/cells.json` (or `BF_OUT=<file>`; `merge.ts <file>` folds it back in).
- `report.ts`: writes `out/matrix.md`, the §2 tables with gap ids. `ledger.ts`: writes `out/ledger.md`, the
  research/12 §4 ledger.

```
npx -y pnpm@9.15.9 install --frozen-lockfile          # repo root
cd docs/review-inputs/22-audit-scripts
node --import ./hooks.mjs --experimental-strip-types cli.ts all      # or P1, BF-05, new
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```

To measure another commit, create a worktree of it, install, and set
`PME_ENGINE=<wt>/packages/engine-core/src/index.ts`.
