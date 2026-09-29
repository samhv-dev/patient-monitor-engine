// Coverage run NN — the auditor's hand confirmations (research/12 §2.2: every WR/MI/TW/TS/IN is confirmed by hand and
// its mechanism written) and the "already owned" flags. Applied to CELLS after the cell files load (cli.ts, regrade.ts).
// A `hand` verdict replaces the automatic one only where the reason is written here; `known` marks a cell whose fix an
// in-flight plan already owns (reported as "<known> pending"). Gap ids N1–N16 are the report's §3.
import { CELLS, type Verdict } from './spec.ts';

const H: Record<string, { verdict?: Verdict; why?: string; known?: string }> = {
  'NN-01a': { verdict: 'TS', why: 'Confirmed against the design wording only: TOF count 0 (T1 < 3 %) comes at 74 s, but the labelled quantity — time to MAXIMUM block — is 120 s against 1.8 min ± 15 % (PL). The design reads "TOF 0" as maximum block; TOF 0 necessarily precedes it. Definition, not a mechanism (Q1).' },
  'NN-02': { why: 'Onset right (max block 52 s; diaphragm 100 % at 60 s); clinical duration 94.6 min against the label 67 min — the dose–duration relation is too steep: roc 0.6 gives 35.5 min (label 31), roc 1.2 gives 94.6 (label 67). N5.' },
  'NN-03b': { why: 'T1 90 % at 12.0 min: TS (block too long) against the design 8–10 min (Miller), inside the label 10.9 min ± 15 % (9.3–12.5) that FU-3 fitted (7f nmb.ts NMB_PD succinylcholine comment: 11.98 min). A source conflict for Ali (Q2), not a mechanism.' },
  'NN-04a': { why: 'Heterozygous block 18.1 min = 1.5 × normal (12.0); the tables say ×2 (≈ 24 min) and Miller 20–30 min. 7g PCHE_CL_MULT het 0.5 halves clearance but duration scales less than clearance on a steep Hill. N5.' },
  'NN-05b': { why: 'TOFR 0.9 in 2.0 min against the label IQR 2.1–4.3 (median 2.7): marginally fast; sugammadex binding is instantaneous in plasma and the recovery is roc ke0-limited (N5).' },
  'NN-05c': { why: 'Sugammadex 16 mg/kg 3 min after roc 1.2: T1 10 % at 1.9 min (label 1.2), TOFR 0.9 at 2.2 min (Naguib ≈ 1.5). The effect-site washout after instant plasma binding runs at the thumb ke0 0.16/min (t½ 4.4 min): too slow for the immediate-reversal label. N5.' },
  'NN-06a': { why: 'Confirmed: from TOF-count-4 reappearance (TOFR 0.03, T1 0.25) neostigmine 50 µg/kg reaches TOFR 0.9 at 30.3 min (spontaneous: > 40 min). Two terms stack: the ceiling multiplier NEO_SMAX 0.7 (EC50 × ≤ 1.7, neuro/neostigmine.ts:12) and TOFR = T1^2.5 (neuro/nmb.ts TOFR_EXP), which needs T1 0.96 for TOFR 0.9. N4.' },
  'NN-07': { verdict: 'MI', why: 'No paradoxical weakness: neostigmine only raises the non-depolariser EC50 (neuro/neostigmine.ts:16), so at full recovery TOFR rises +0.07. The excess-acetylcholine (desensitisation/depolarising) block has no term. N4 (P2).' },
  'NN-08a': { known: 'FU-6 T5 Step 5', why: 'Obstruction 0.47 at TOFR 0.61 awake: present (PL). FU-6 Task 5 Step 5 adds the arousal factor that lowers the awake share (Eikermann 2003) — re-measure there.' },
  'NN-08b': { verdict: 'MI', known: 'FU-6 T10', why: 'The hypoxic ventilatory response is identical with and without residual block (ΔVE 2.5 vs 2.4 L/min, ratio 1.05): the carotid-body term has no NMB input (lung/drive.ts:27–35). FU-6 Task 10 adds HVR_NMB_EMAX / HVR_NMB_TOFR_LO. Also: a hypoxic GAS (FiO2 < 0.21) is not expressible — the challenge used a shunt (N15).' },
  'NN-09': { known: 'FU-7 T14', why: 'Sevoflurane 0.8 MAC prolongs rocuronium +60.8 % against the design +20–30 % (Miller); FU-7 Task 14 (DI-51) re-sizes the `1 + 0.5·MAC` divisor against 25–80 % — 60.8 would pass FU-7 and fail this design (Q3).' },
  'NN-10': { known: 'FU-7 T14', why: 'MgSO4 4 g raises plasma Mg to 1.92 mmol/L but changes neither onset (0 s) nor duration (+0.2 min): 7f reads only the profile field (neuro/pipeline.ts:186). FU-7 Task 14 Step 1 (DI-90) owns it.' },
  'NN-14': { why: 'TOFR 1.0 → 0.58 after the under-dose (PL), but NO recurarisation mark: the one-shot flag was already spent at the ROCURONIUM ONSET, 19 s after the first dose (neuro/pipeline.ts:224–226: `recovered` is true at baseline TOF 4/1.0, so the onset fade fires the mark). Seen in every first NMB dose of this run (NN-03a 328 s, NN-22a 617 s). N13 (DEV/event).' },
  'NN-15b': { why: 'DI 37 at Ce 4 (band 40–60) and 24.7 at Ce 6: the tables\' Eleveld form DI = 93·(1 − U^γ/(U^γ + 1)) has Emax = E0, so the index crosses 40 at Ce ≈ 3.6 and 30 at Ce ≈ 5.0 (neuro/depth.ts:67–75). N7.' },
  'NN-15c': { why: 'SR > 0 from Ce 5.03 (band 6–8): SR is derived from the same index (SR = (30 − DI)/25, neuro/depth.ts:76), so it inherits NN-15b\'s curve. N7.' },
  'NN-17a': { why: 'MAC reduction 65 % (PL) but the CONTROL fails: propofol Ce 3 alone abolishes movement to incision. neuro/depth.ts:83,87 counts propofol as MAC-equivalents by its BIS Ce50 (2.98 µg/mL at 40 y), while the immobility C50 is ≈ 15 µg/mL (Smith 1994). N1.' },
  'NN-19a': { known: 'FU-7 T17 Step 3', why: 'No early pressor (−1.2 %): the row has no α2B arm (rows-anaesthetic.ts:104–106 "not modelled in v1"); FU-7 Task 17 Step 3 adds it (DI-60).' },
  'NN-19b': { known: 'FU-7 → FU-4 request 1', why: 'HR −4.3 % against −10–20 %: the row\'s HR/SVR emax −0.3 at EC50 1 reaches ≈ −15 % open-loop but the baroreflex restores most of it; the central sympatholysis is FU-4\'s `symp` field (FU-7 "Requests → FU-4" item 1).' },
  'NN-19c': { why: 'No sedation at all: DI unchanged (Δ 0), consciousness kept. 7g publishes bus.cns.dexmedCe (pk/combine.ts:94) but 7f reads it nowhere (neuro/bus.ts readBus; neuro/depth.ts DepthInputs), and FU-7 Task 3\'s hypPropEq lists no dexmedetomidine hypC50. N3.' },
  'NN-20a': { why: 'Midazolam 0.05 mg/kg + fentanyl 1 µg/kg in an 80 y on air: SpO2 nadir 94 %, no apnoea, no obstruction. N2.' },
  'NN-20b': { why: 'Obstruction 0 (confirmed WR): the sedation share needs DI < 60 or an opioid drive depression > 0.3 (neuro/drive.ts:68), neither reached. The "synergy" item is not a valid test in a closed loop (the CO2 rise re-drives breathing, so VE falls do not add); the drive formula itself is supra-multiplicative (neuro/drive.ts:57–61). N2.' },
  'NN-21a': { why: 'End-tidal MAC at eye opening 0.18 (brain 0.33 = MAC-awake): 7f applies MAC-awake to the BRAIN fraction and the brain lags Et by minutes at FGF 6, so the gas monitor reads ≈ half the taught value at emergence. N8.' },
  'NN-23a': { known: 'FU-7 T2', why: 'Naloxone restores VE ≥ 50 % in 12 s (band 1–2 min): 7g gamma rows have zero-slope onset. FU-7 Task 2 moves naloxone to ≈ 40 s — still faster than this design\'s 1–2 min (Q6). Premise: the 7f apnoea flag is set, but VE stays 2.3 L/min (38 %) — fentanyl 5 µg/kg is not apnoeic in the flow (D-7f-3, FENT_VENT_POT 0.55; FU-7 Task 7 owns the one apnoea truth).' },
  'NN-23b': { verdict: 'WR', why: 'No renarcotisation in 100 min: VE ≥ 5.0 L/min throughout; naloxone\'s gamma row keeps an antagonist multiplier of 2.44 at 30 min (rows-other.ts:45, 3600 s tail) while fentanyl 5 µg/kg\'s ventilatory Ce has fallen below its (0.55×-weakened, D-7f-3) C50. N6 (Q6/Q7).' },
  'NN-24': { known: 'FU-7 T2', why: 'Flumazenil wakes the patient in 6 s (band 1–2 min): zero-slope onset (FU-7 Task 2). No resedation in 80 min after midazolam 0.1 mg/kg.' },
  'NN-25b': { why: 'PL after the surge-window read (HR −26 %); the 40-min value is −19.4 % because in MODELED the bradycardia is left to the baroreflex (organs/effects.ts:41 "no hrF").' },
  'NN-25c': { why: 'No herniation in 45 min: ICP rises to 140 mmHg while the Cushing surge (MAP 145) keeps CPP above 10 except for ≤ 20 s at a time; herniation needs CPP ≤ 10 for 60 s CONTINUOUSLY (brain/model.ts:144–145). Pupils stay 4 mm (no unilateral dilatation), no apnoea, no terminal bradycardia/asystole. N9.' },
  'NN-26a': { why: 'The ICP response per mmHg is close: −16.9 % at PaCO2 31.6 (10 min, −6.9 mmHg) = 2.4 %/mmHg against 2.5–3.0 implied by check 19; the 2-min read (−9.3 %) was taken at PaCO2 34.6, because RR 16 lowers PaCO2 over minutes (at RR 30 PaCO2 reaches 19 and ICP −47 %). Minor (TW by a small margin).' },
  'NN-26c': { why: '−31.3 % against the mannitol band −25–30 %: marginal; inside the 7d test\'s own HTS band (−20–40 % at 10 min).' },
  'NN-26d': { why: '−7.5 mmHg against the design −5–7: marginal; inside the tables\' range −3 to −8 (meta-analysis mean −5.6).' },
  'NN-26f': { why: 'Sevoflurane 2 MAC LOWERS ICP (−3.8) and CBF (−0.16) against 1 MAC. Two causes: (1) organs/inputs.ts:98–99 takes 7f\'s CMRO2 (outputs.ts:26: 1 − 0.4·anaes, 0.45 once DI < 30) but 7g\'s direct vasodilation, which pk/combine.ts:97–98 derived against 7g\'s own gentler per-MAC CMRO2 — so volatile CBF is over-coupled (healthy CBF 0.48 of awake at 0.9 MAC); (2) TBI\'s pressure-passive CBF follows the MAP fall (84 → 71). N10.' },
  'NN-26g': { why: 'Ketamine raises ICP +4.6 mmHg (CBF +16 %) under controlled ventilation: the direct vasodilation +40 % at full effect (brain/flow.ts vasoDirect; 7g cbfVaso) acts with no hypnotic CMRO2 fall (7f\'s DI stays high, so cmro2Mult ≈ 1). N11.' },
  'NN-27a': { verdict: 'PL', why: 'CBF 0.898 includes a PaCO2 rise 39.1 → 45.3 (low-flow dead space at fixed ventilation; CO2 factor 1 + 0.03·6.2 = 1.186); pressure alone gives 0.898/1.186 = 0.76, inside 0.6–0.8 — and equal to the autoregulation curve (CPP 60.8 on the HTN lower limit 75: 0.78). The MODELED rig cannot hold PaCO2 constant through a bleed; the 7d MANUAL test measures 0.62.' },
  'NN-27b': { why: 'CBF 0.338 against 0.35–0.40 (marginal) at PaCO2 25 with MAP falling to 54 during the hyperventilation; PbtO2 10.8 in band.' },
  'NN-30a': { verdict: 'MI', why: 'The seizure flag rises at 30 s, before the CV effect (46 s): order right. But the seizure has no physiology — CMRO2 unchanged, lactate +0.2, no apnoea/hypoxaemia: bus.cns.seizure is read by no system (pk/pipeline.ts:413,442). N12.' },
  'NN-30b': { why: 'Bupivacaine 2 mg/kg peaks at 8.0 µg/mL but the CV effect reaches 0.75: MAP −18 %, a 40/min sinus bradycardia, no VF — VF needs cvE ≥ 0.9 (pk/hooks.ts:93); there is no Na-channel conduction slowing (QRS widening) and the Ees −70 % arm is at EC50 4 on a Hill of 2. N12.' },
};

for (const c of CELLS) {
  const h = H[c.id];
  if (!h) continue;
  if (h.known) c.known = h.known;
  if (h.why) c.hand = { verdict: h.verdict ?? (c.hand?.verdict as Verdict) ?? ('' as Verdict), why: h.why };
}
export { H };
