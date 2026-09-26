# Stage 7a gate — circulation (two-sided time-varying-elastance heart)

**Gate question.** Does the two-sided elastance heart reproduce the resting chambers, emergent PPV/PVC/AF effects, the
reflex responses and the R23 ischaemia trajectory, within the CPU budget, while keeping the Stage 2/3 acceptance green?

**Answer.** Mostly. The circuit, valves, pleural input, reflexes, drugs, conditions, CPR, IABP/LVAD, MODELED mode and the
teaching views work and are tested; Stage 2/3 suites are green with the re-specifications listed below. Two acceptance
items need a ruling (NR-1 post-PVC SBP, NR-2 the R23 ischaemic spiral) — both kept as `it.fails` with measured numbers.
Branch `stage-7a-circulation`; plan `docs/plans/stage-7a-circulation.md` (ticked).

## 1. Resting chamber and vessel pressures per profile (bare model after stabilisation; 60–80 s; mmHg, L/min, mL)

Columns: RA mean · RV sys/dia · PA sys/dia (mean) · PCWP mean · LV sys/EDP · aortic · radial · CO · LVEDV · EF % · aortic-valve
transitions per beat / re-openings within 20 ms (0.5 mL/s threshold).

| Profile | Pleura | RA | RV | PA | PCWP | LV | Ao | Radial | CO | EDV | EF | AV |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| adult 40 y 70 kg | spont | 4.9 | 28/-3 | 26/11 (19) | 7.5 | 117/10 | 108/81 | 121/81 | 5.4 | 130 | 61 | 2.94 / 0 |
| adult 40 y 70 kg | PEEP 5 | 7.6 | 30/-1 | 28/12 (20) | 9.7 | 115/8 | 107/83 | 119/83 | 5.0 | 120 | 59 | 3.00 / 0 |
| 75 y HTN | spont | 4.8 | 33/-3 | 31/16 (23) | 13.1 | 157/19 | 155/87 | 156/86 | 5.8 | 163 | 52 | 2.75 / 0 |
| 75 y HTN | PEEP 5 | 7.3 | 33/-0 | 32/15 (23) | 13.4 | 154/14 | 152/90 | 154/89 | 5.2 | 151 | 50 | 2.81 / 0 |
| 75 y AS+CAD+HTN | spont | 5.1 | 32/-3 | 30/15 (22) | 11.8 | 233/18 | 151/87 | 154/85 | 5.9 | 139 | 63 | 2.75 / 0 |
| 75 y AS+CAD+HTN | PEEP 5 | 7.5 | 32/-0 | 31/13 (22) | 11.6 | 222/12 | 149/90 | 152/88 | 5.5 | 129 | 62 | 2.75 / 0 |
| HFrEF 60 y 80 kg | spont | 4.9 | 33/-3 | 31/17 (24) | 13.4 | 108/19 | 105/67 | 106/65 | 5.8 | 210 | 40 | 2.94 / 0 |
| HFrEF 60 y 80 kg | PEEP 5 | 7.6 | 34/-0 | 33/16 (24) | 14.4 | 108/16 | 105/69 | 106/68 | 5.5 | 201 | 39 | 2.88 / 0 |
| woman 30 y 50 kg | spont | 4.8 | 29/-3 | 27/13 (20) | 9.0 | 117/13 | 112/82 | 121/81 | 3.7 | 90 | 61 | 2.94 / 0 |
| woman 30 y 50 kg | PEEP 5 | 7.5 | 31/-0 | 29/13 (21) | 10.9 | 116/10 | 111/84 | 120/83 | 3.7 | 84 | 59 | 2.94 / 0 |
| child 6 y 20 kg | spont | 4.9 | 25/-3 | 23/12 (18) | 7.2 | 117/7 | 115/82 | 121/81 | 1.5 | 32 | 49 | 4.13 / 0 |
| child 6 y 20 kg | PEEP 5 | 7.6 | 27/-1 | 26/13 (20) | 9.6 | 115/5 | 113/85 | 119/83 | 1.3 | 29 | 47 | 4.38 / 0 |

H1 (normal): RA 2–6 ✓ (4.9; 7.6 absolute under PEEP 5), RV 15–30/2–8 (28/−3 transmural-ish floor: RV diastolic trough sits at
the −4 pleural), PA 15–30/4–12 ✓, mPAP ≤ 20 ✓ (19), PCWP 6–12 ✓, LV 100–140/3–12 ✓, CO 5–6 ✓ (5.4), EF 55–70 ✓. Radial − aortic
SBP +11 (band 5–20 ✓, engine re-check). Stabilisation converges in 20–32 windows (≤ 30 s simulated after warm-up, 16–34 ms wall).
Aortic-valve switching: no re-openings within 20 ms (no chatter) in any profile; the count above 2/beat is a small late
forward-flow blip through the Windkessel inertance after closure (> 20 ms later).

## 2. Deviations and adjustments (every number changed from the plan, and why)

R45 binding mechanisms (all [ENG] magnitudes, for Ali's R44 calibration pass):
- **R45(c) AS + CAD LVEDP**: the stabiliser anchors the LV EDPVR scale A at the EDV actually reached (profiles with an LVEDP
  target: AS, HFrEF, HFpEF; ±2 mmHg; only once CVP settles), severe AS Ees × 1.7 (concentric LVH), AS LVEDP target 18 (tables
  §3). Result 19.2 (was 40; plan's CVP-3 work-around removed). HFrEF 19.6.
- **R45(b) class II haemorrhage**: cardiopulmonary (low-pressure) limb on the true transmural RA pressure (pRa − pIt − pPeri)
  → arteriolar (G_CP_R 0.06/mmHg) and venous tone (G_CP_V 200 mL/mmHg), recruitment cap 12 mL/kg; pulsatile baroreceptor
  sensing MAP + 0.3·ΔPP; g_hs 0.02 → 0.04 with a weaker chronotropic withdrawal (× 0.1) and sympathetic withdrawal × 0.3;
  aortic Zc 0.05 → 0.035 (Stage 2 range 0.03–0.06: at 0.05 PP followed peak flow and the stabiliser needed C 3.5 mL/mmHg);
  T_IT 0.4 → 0.65 (Q28 range 0.2–0.7). Engine class II: SBP 118 → 103 (87 %), HR 111, PP 36 → 20, PPV 13.0 → 17.8 %.
- **R45(a) PESP**: one-beat Emax boost after a premature beat (PESP_MAX 0.5 by prematurity) — insufficient, see NR-1.
- β-blockade: g_hs × 0.2 (tables range 0.2–0.7) for the chronotropic arm, g_c and β-agonists × 0.5 (tables): class III HR 84.
- Phenylephrine SVR × 1.8 → × 1.7 (engine MAP +22.5, HR −13.9).
- Propofol (not prototyped): tables §6.3 row at E 0.9 plus a sympathetic-HR-arm depression × 0.3 (Cullen 1987) and the
  Schnider age sensitivity (tables §6.1 C50 by age) → healthy MAP 75 % at 2 min, HR +12.8; AS+CAD 75 y MAP 65 %.
- CPR (not prototyped): cardiac 60 → 35 mmHg, thoracic 30 → 35 mmHg per unit quality → q 0.8: 73/16, CO 2.1 L/min;
  q 1.0: 91/21, CO 2.5. **3.1 must re-measure CPR EtCO2 against this CO** (R45 request).
- Chemoreflex bradycardia slope 1.6 → 2.5 (the plan's slope failed its own test).
- IABP: balloon volume enters the aortic compliance, not the root Zc (a 60 ms deflation made a −35 mmHg spike);
  engine 1:1 aortic augmentation peak 114 vs unassisted SBP ~108, radial 128/65.
- LVAD: HFrEF MODELED 5400 rpm → radial 79/106, pump 4.1 L/min, PI 7.2.
- Ventricular rhythms take the rhythm engine's k_rhythm as contraction efficiency (full at VT ≤ 150, none at ≤ K_OPEN 0.25):
  VT 220 and torsades are pulseless as in Stage 2.
- Ischaemic diastolic stiffening β_LV × (1 + 0.5·δ) (tables §3 Effects) — was missing from the plan's coronary model.
- CO is a 4 s LPF of forward aortic + LVAD flow (compressions count); pleth pulses are placed at valve opening.
- MANUAL trackers are **set-and-hold**: they run while an instructor change (target, HR, rhythm, volumeStatus) is being met
  and stop after 5–8 s on target (the volume tracker after ≤ 60 s), so PEEP/bleeding/drugs/conditions act on top. Frozen in
  arrest, CPR and while a device runs. MANUAL CVP is the filling state (positive pleural and tamponade pressure show on top).
- Tamponade 200 mL (H7): CVP 15.1, PAWP 17.9, CO −28 %, HR +17 (prototype CVP 9.5). Massive PE φ 0.6: mPAP 38.6, CO −13 %
  (H5 wants −40–60 %: still flagged, needs RV ischaemia). RV infarct: CVP +1.3–1.8 with CVP/PCWP 1.2 (H8 12–20 not reached).
  Severe MR: PAWP 19.4.
- PEEP 5 → 15 in MANUAL (Stage 3 ventilator-link test): CO −14 %, MAP 95 → 83, CVP +2.5; A2 guard (re-check): CO −16.7 %.
  Larger than H10's normovolaemic −5–10 % because of T_IT 0.65 and because the external frames carry Paw (Stage V's palv
  lands with the merge).

## 3. Sanity scenarios vs bands (engine, MODELED, ventilated unless stated)

| Scenario | Result | Band | |
|---|---|---|---|
| Phenylephrine 100 µg | MAP +22.5, HR −13.9 at 40–60 s | +15–25 / −5–15 | ✓ |
| Class II (25 %/10 min) | SBP 118→103, HR 111, PP 36→20, PPV 13.0→17.8 % | SBP near normal, HR 100–120, PPV > 13 | ✓ |
| Class III (35 %, bare model) | 79/66, HR 139, PP 13.6, PPV 15 % | SBP 80–90, HR 120–140, PP 20–25, PPV > 20 | HR ✓ SBP ≈; PP, PPV ✗ (gate note) |
| β-blocked 35 % | HR 84 (engine 75–95 ✓), SBP 81 | HR 80–95, SBP 65–80 | HR ✓, SBP slightly high |
| Propofol 2 mg/kg, 40 y | MAP 75 % at 2 min, HR +12.8 | 60–80 %, < +15 | ✓ |
| AS+CAD propofol → phenylephrine / ephedrine | see NR-2 | R23 | ✗ spiral (NR-2), rescue ✓ |
| Tamponade 200 mL | CVP 15.1 / PAWP 17.9, CO −28 %, HR +17 | equalised within 5 at 15–20 | ✓ |
| Massive PE φ 0.6 | mPAP 38.6 (46/31), CO −13 % | mPAP 30–40, CO −40–60 % | mPAP ✓, CO ✗ |
| RV infarct | CVP +1.8, CVP/PCWP 1.2, CO −18 % | CVP 12–20 | signature ✓, magnitude ✗ |
| Severe MR | PAWP 19.4 | ≥ 15 | ✓ |
| Post-PVC | −10.8 mmHg | +8–15 | ✗ NR-1 |
| AF PP variability | RMSSD > 3× sinus | Stage 2 extra | ✓ |
| Asystole plateau | 12.5–12.8 | 8–20 (A7) | ✓ |
| CPR q 0.8 / 1.0 | 73/16, CO 2.1 / 91/21, CO 2.5 | 60–110/10–30, CO 1–2.5 | ✓ |

## 4. Stage 2 / Stage 3 acceptance re-check

All Stage 2 and 3 engine suites pass (107 tests) with these re-specifications (justification written in each test):
| Test | Old band | New | Why |
|---|---|---|---|
| S2-1 timing | R→radial foot 150–220, pleth 200–300, notch R+PEP+LVET+PTT ±20 | foot 110–220, pleth 170–300, aortic closure vs Weissler ±25 ms | PEP/LVET emergent; aortic opening 59–72 ms after the R peak (Weissler PEP is from Q); the elastance incisura is shallow |
| S2-5b | window to tNext+0.1 | tNext+0.05 | the next beat is potentiated (R45(a)) from its onset |
| S2-5c post-PVC | +8–15 | unchanged, `it.fails` | NR-1 |
| S2-6 pulseless plateau | 10–15, ripple < 1 | 8–20, VT ripple < 3 | emergent Pmsf (A7 10–20); AV-dissociated atria in VT |
| S2-10 / S3-M6 PPV | g_hyp bands | normo 3–12 %, hypo > normo + 2 | PPV emergent from the pleural input; volumeStatus acts on stressed volume |
| S2-11 CVP a wave | 80–100 ms, AF |bump| < 1 | 60–120 ms, AF bump < 1 (one-sided) | atrial activation peak; AF window can fall (y descent) |
| hemo-engine setMode | modeled rejected | accepted | MODELED arrives |
| l2 gas CO / resp condition | CPR formula; 'pe' → Stage 7 | circulation CO; 'pe' is a circ condition | 7a owns them |
Unchanged and green: tracker 90/50 ramp, NIBP bias/SD (sinus and AF), transducer damping/flush, AF deficit, CPR 70–110/10–30,
MAP by integral, Stage 3 capnogram/oxygen/airway/alarms suites, ventilator link (PEEP 15 lowers CO and MAP, raises CVP).

## 5. Oracle, CPU, determinism, 24 h

ORACLE

- CPU: circulation (circuit + control) 0.05 ms per 20 ms tick in plain Node, 0.20 ms under vitest on a loaded machine
  (budget 0.3; prototype claimed 0.016 — evaluate() dominates); whole engine 0.058 ms per tick (MANUAL, 3 lines, no vent).
- Determinism: seed 42 60 s ABP/CVP/PAP hash `021689fb26524591a9c281557ef22ddb52ffb2ddcfdbdd6ebc81da19f27b3603`, repeatable;
  seed 43 differs.
- LONGRUN

## 6. Screenshots (docs/gates/stage-7a/, all ≤ 60 KB)
`resting-monitor.png`, `resting-views.png` (PV loop + chamber pressures), `phenylephrine-*`, `as-cad-rest-*`,
`as-cad-propofol-2min-*`, `as-cad-phenylephrine-*`, `iabp-*`. The demo (`apps/demo/stage7a.html`) mounts the monitor as
stage2 does and draws the teaching views from a deterministic shadow engine fed the same commands at the same ticks.

## 7. R46 seams (coordinator request for 7b)
`CircModelState.ext.pvrLung / pvrLungL / pvrLungR` (default 1, identical state tested) and `HemoCtx.pItExternal(t)` with the
Stage 3 breath-driver path as fallback (`pleuralSource`).

## 8. Requests to other stages
- Stage V: keep `palv ?? paw` in `ext.frames[i+1]` (read by `circ/pleural.ts`).
- Stage 3.1: re-measure CPR EtCO2 (CO is now emergent: 2.1 L/min at quality 0.8, 2.5 at 1.0).
- Stage 7b: consume `circOut.qLungL/qLungR`, write `ext.pvrLung*` and `pItExternal` (R46).
- Stage 7g: replace `circ/drugs.ts` Bateman curves (keep the DrugEffect multiplier shape, incl. gvHr).

## Needs a ruling

### NR-1 — Stage 2 acceptance 5c, post-PVC SBP +8–15 mmHg (R45(a))
R45(a) asked for a one-beat Emax boost after a premature beat instead of loosening the band. The mechanism is in
(`circ/model.ts` PESP_MAX 0.5, scaled by prematurity, for perfused and unperfused premature beats). Measured at engine
level over isolated PVCs (65 % coupling, compensatory pause 1.6 s): **−10.8 mmHg** (PESP 0.5), −9.5 (1.0), −3.4 (1.5 =
Emax × 2.5). The arterial run-off through the compensatory pause (radial DBP 80 → 59–65 mmHg; τ ≈ 1.7 s, which is what
120/80 at HR 75 implies) outweighs the extra stroke volume an elastance LV can eject: diastasis limits the EDV gain to
+5 %, and SV ≤ EDV − V0. Stage 2 reached the band only with FS_CARRY 0.75 (an [ENG] volume carry-over). The test is
`it.fails` with this explanation so CI stays green and flags the gap. Options: (a) re-specify to "post-PVC PP rises,
SBP within −15…+15"; (b) a pressure-dependent arterial compliance / critical-closing-pressure run-off (slows the pause
decay); (c) accept an [ENG] carry-over term. Needs Ali/orchestrator.

### NR-2 — R23 AS + CAD propofol ischaemia trajectory (tables §3 worked example, §7 check 10)
Engine, MODELED, 75 y AS (0.7) + 3-vessel CAD + HTN, propofol 1.5 mg/kg at 60 s. Two tables-sourced mechanisms were
added while chasing it: the Schnider age sensitivity of propofol (tables §6.1 C50 by age → × 1.6 at 75 y) and the
ischaemic diastolic stiffening β_LV × (1 + 0.5·δ) (tables §3 "Effects"). Trajectory (10 s means):

| t | SBP/DBP | HR | LVEDP | LVSP | CPP | S/D | kIsch |
|---|---|---|---|---|---|---|---|
| rest (55 s) | 155/85 | 65 | 18.9 | 235 | 68 | 1.33 | 1.00 |
| +2 min (180 s) | 96/56 | 70 | 12.2 | 171 | 45 | 1.00 | 0.94 |
| +2.4 min (205 s) | 99/58 | 71 | 12.5 | 173 | 47 | 1.04 | 0.93 |
| phenylephrine +30 s (240 s) | 133/79 | 69 | 16.7 | 197 | 64 | 1.47 | 0.95 |
| phenylephrine +90 s (300 s) | 146/86 | 67 | 17.9 | 208 | 69 | 1.61 | 0.98 |
| ephedrine instead, +90 s (300 s) | 124/75 | 78 | 11.8 | 204 | 65 | 1.08 | 0.95 |
| ephedrine, +3.3 min (410 s) | 139/83 | 79 | 11.8 | 221 | 73 | 1.13 | 0.97 |

MAP falls to 65 % of baseline (tables 60–65 % ✓, deeper than the healthy 75 % ✓), phenylephrine restores pressure
and the supply/demand ratio within 90 s ✓, ephedrine raises HR (+13) and rescues more slowly ✓ — but the spiral does
not start: S/D bottoms at 1.00 (tables 0.78), kIsch 0.93 (tables ≤ 0.75), no ST change. The difference is LVEDP: propofol's
venodilation plus the R45(b) venous recruitment LOWER it to 12 instead of the tables' 25, so CPP stays 45 (tables 20–25).
The two R23 tests are `it.fails` with these numbers. Options: (a) accept "hypotension + rescue" as the 7a R23 evidence
and move the spiral to 7g (effect-site propofol, larger Ce in the elderly); (b) make the AS LV preload-intolerant
(stiffer EDPVR so a small EDV fall drops SV); (c) re-weight the tables' demand term (LVSP enters linearly, which falls
with the pressure and cancels most of the supply loss).
