# The brain without blood flow, and its recovery: one brain energy state, read by the EEG, consciousness and breathing — Plan

**STATUS: DRAFT FOR REVIEW.** A planning executor wrote this plan. Nothing in it is ruled until the owner answers §9
and the orchestrator reviews the pieces. No product code, test, constant, card or other plan was changed while writing
it.

**Base.** `origin/main` **4d8e7742**. The repair that makes MANUAL breathing pass through the brainstem-perfusion gate
(branch `arrest-reaches-the-brain`, open as a draft when this was written) is assumed merged before piece B1 starts;
the gate's split into `stepBrainstem`, `brainstemGate` and `gatedRate` (`l2/neuro/spont.ts`) is the form this plan
reads. Every `file:line` is a starting point only; an executor finds the code by the function name.

**Plain words.**
- **Delivery:** cerebral O2 delivery relative to normal, CBF/CBF0 × CaO2 ÷ the reference CaO2 (today's `brainDo2Rel`).
- **Function** (`fn`, 0–1): how much of a compartment's synaptic, electrical work its energy supply carries now. 1 is
  normal; 0 is electrical silence with the membranes still kept.
- **Store:** the O2 the brain holds in its own blood and tissue, which carries function for some seconds after the
  flow stops.
- **Debt:** the ischaemic dose a compartment has taken; it holds function down after the flow returns until it is
  repaid.
- **Compartment:** cortex or brainstem, each with its own entry in the one state, the same equations and its own
  sourced numbers.
- **Reader:** a model that reads the state (the EEG cortex, consciousness, the breathing gate) or a monitor reader that
  computes from the EEG trace (`l3/eeg-devices/`).
- **Marks:** [FT] read in full text; [ABS] read as an abstract only; [FT-part] full text read in part (named);
  [P] placeholder with its reason; WANTED: not read, with what it would settle.

---

## 0. The defect, and what this plan settles

A measurement of the witnessed-VF card (headless, both modes, one row a second; `research/76-arrest-and-the-brain-measurement.md`)
established:
1. **The cortex's EEG fails on time but the monitor stays awake.** CO 0 at +4 s, CBF 0.25 at +12 s, delivery below
   12/50 at +14 s: `eeg.cortex.metabolic` = `suppress` = 1 from +14 s and the brain signal is 1.5 µV. But the frontalis
   EMG (6.7 µV RMS) and blinks (17/min) are gated on the cortex's `lor`, which is drug-made unresponsiveness only, so
   every reader computes an awake signal: BIS-type 97.7, SR 0, SEF 25 Hz, SE 45–65 for ten minutes.
2. **Nothing makes the patient unconscious.** `l2/neuro/depth.ts` `hypnotic` and `flags.conscious` have no term for
   cerebral perfusion; `conscious` stays true through ten minutes of no flow.
3. **Recovery has no memory.** After two minutes of VF and a shock, the cortex is normal 9–10 s after the circulation
   returns (`cortexStep` is a pure function of delivery now). The breathing gate reopens over a fixed 120 s whatever the
   arrest's length (`GATE_REOPEN_S`).
4. **Under CPR** (CBF 0.30–0.40) the EEG cortex becomes fully normal once delivery passes 0.40, after ≈ 4 min.

The plan settles: the structure (§1), what the brain shows as flow falls and returns (§2), where the state meets the
body (§3), MANUAL and MODELED (§4), the sources (§5), the pieces (§6), what is outside (§7), the self-review (§8) and the
owner's questions (§9).

---

## 1. The structure

### 1.1 The choice: one brain energy state in the organ model, two compartments

**`BrainEnergy`, new file `packages/engine-core/src/l2/brain/energy.ts`, a field of `BrainState`
(`l2/brain/model.ts`), stepped inside `stepBrain` on the brain's 10 Hz grid.** It holds one entry per compartment,
`cortex` and `brainstem`, each `{ store, fn, debt }` once built. It publishes, on the organ view, per compartment:
`delivery`, `fn`, `debt` and, for the cortex, `metabolic` (= the EEG's present definition, §1.3). The cortex entry
arrives in B1; the brainstem entry arrives in B5 as a relocation of the breathing gate's present state and becomes
`{ store, fn, debt }` only in B7 (§6).

Why here:
- **Flow and O2 delivery already live here.** `stepBrain` already computes the delivery/demand ratio for PbtO2 and
  SjvO2 (`brainOxygen`), and the organ model has every input: CBF after autoregulation, CO2 and O2 reactivity, Hb,
  SaO2, PaO2, temperature (`tempCmro2`) and the drugs' CMRO2 (`BrainDrugs.cmro2Mult`). Hypoxaemia, anaemia,
  hypotension, hypothermia and drug-lowered metabolism therefore reach the state through code that exists.
- **It runs in both modes and with no device on.** The organ model is stepped in MANUAL and MODELED (the measurement
  read `organs.brain.cbfRel` in MANUAL) and is not device-gated. That meets the ruling that the brain's core model runs
  always, without a second container.
- **Physiology already reads it.** The breathing gate reads `organs.brain.cbfRel`; the circulation reads it as the
  vasomotor centre's supply. Placing function next to flow keeps one picture of the brain.

Why two compartments and not one state with a threshold per reader: the evidence discriminates.
- After abrupt arrest the EEG is isoelectric at 11 ± 2 s (de Vries 1998 [ABS]), yet swine keep a normal breathing
  pattern through the first minute of VF and gasp in minutes 2–5 (Zuercher 2010 [ABS]), and gasping is seen in 55 % of
  witnessed human arrests (Clark 1992 [ABS]). On return of circulation, spontaneous breathing comes back first, then
  the brainstem reflexes, then consciousness (Jørgensen 1997 [ABS]).
- A single state is already at zero when the cortex goes silent; no reader threshold on a state at zero can produce
  minutes of gasping after it, or a brainstem that recovers before the cortex. Two tissues with different
  vulnerability need two entries.
- The entries share every equation (no duplicated logic); only their sourced numbers differ. Territories (the
  regional-perfusion plan's V0) become further entries later, so the shape does not change when regions arrive.

### 1.2 The alternatives, weighed

- **(B) Separate local states in the EEG and in the neuro model.** Rejected: two pictures of the same brain. The EEG
  runs only while a device is on, so its state would not exist for consciousness or breathing with the device off;
  and the code standards forbid one quantity held twice.
- **(C) Consciousness alone, no recovery dynamics.** Rejected as the end state (it keeps finding 3), kept as the order
  of build: consciousness and the artefacts come before the debt (§6), so the arrest screens are right before the
  recovery question is ruled.
- **A new brain-state container outside the organ model** (the EEG clinical plan's G2). Rejected for these variables:
  energy supply is organ physiology, and the organ model already owns its inputs. The EEG plan's later pieces (its
  metabolic burst-suppression piece, its injury state, its brainstem-function plan) read this state instead of holding
  their own; the hand-over lists the amendments that plan needs.

### 1.3 The state and its equations

Per compartment c, at each 10 Hz step:

1. **Delivery** `D_c` = CBF_c/CBF0 × CaO2 ÷ CaO2_ref (today's `brainDo2Rel`, moved from `eeg/state.ts` to
   `l2/brain/energy.ts`; one function). Both compartments read the whole-brain CBF until regional flow exists [P:
   one global CBF in the engine; brainstem flow separately is a V0 attachment].
2. **Steady-state function** `fnSS_c(D)` = 1 above the compartment's abnormal level, 0 below its failure level, linear
   between. For the cortex these are today's `DO2_EEG_ABNORMAL` 20/50 and `DO2_EEG_LOST` 12/50 (Miller Ch35 p. 1122;
   Ch10 p. 211: EEG ischaemia from about 20, isoelectric at about 15, membranes kept between about 6 and 12), and
   `metabolic` = 1 − fn reproduces today's value exactly. The constants move with the function to `l2/brain/params.ts`.
   **Thresholds stay on delivery, not on delivery ÷ demand** (decision, §1.5).
3. **Store** `S_c` (seconds of the compartment's demand, 0…S_max): while `fnSS_c` < 1 the store drains, and function
   is carried at `max(fnSS, store share)`; while delivery is above the abnormal level the store refills. `S_max` is
   **derived, not fitted**: the extractable O2 in the brain's own blood volume, CBV0_ML × CaO2_ref × (OER_MAX − OER0),
   ÷ the resting whole-brain O2 use CMRO2_0 × BRAIN_G / 100, all existing constants in `l2/brain/params.ts`
   (60 mL × 0.185 mL/mL × 0.42 ≈ 4.7 mL O2 ÷ 46 mL/min ≈ 6 s) [INF: the derivation; the tissue's dissolved O2 and the
   phosphocreatine buffer are not in it, WANTED]. Its validation is end to end (§2.1, cell A1): VF onset → isoelectric
   at 11 ± 2 s. **This cell is red on main today**: with no store the engine reaches isoelectric at +14 s, and a store
   on top can only make it later. The miss is upstream, in the circulation's decay of flow after arrest: de Vries
   records MAP below 30 and middle-cerebral flow velocity 0 at once, where the engine has MAP 54 at +4 s and CBF 0.25 at
   +12 s. That is outside this plan; it is reported in the hand-over, not planned here. **The store is never sized to
   meet the cell.** The store is therefore also tested on its own (unit cell, B6a): a step of cortex delivery from 1 to 0
   → isoelectric at 11 ± 2 s (de Vries's condition, flow velocity 0 at once). If the derived 6 s misses it, the miss is
   reported with the derivation, not tuned.
4. **Demand** `M_c` = `b.cmro2Rel` (drug × temperature, unchanged) × (1 − F_eff × (1 − fn)), with
   F_eff = max(0, F − (1 − cmro2Mult)): the share of demand that electrical silence removes, less what the drugs have
   already removed, so a drug-silenced brain is not reduced twice. **F is one value, shared with the one the engine
   already uses**: `neuroOutputs` puts a burst-suppressed brain's CMRO2 at 0.45 (the engine's tables: −50–60 % at burst
   suppression), so F = 0.55 is moved into one named constant read by both. Hofmeijer 2012 [ABS] (≈ 30 % of the energy
   to synaptic transmission) is consistent in direction but is a different quantity (synaptic only), so it does not set
   F. **[P]: F's value rests on the tables' row, whose primary source is not read here (WANTED: the CMRO2 at an
   isoelectric EEG).** A silent brain therefore drains its store and accrues debt more slowly; a cold brain more slowly
   still.
5. **Debt** `Q_c` (dimensionless, ischaemic dose in "seconds of full demand unmet"): accrues at `M_c` × (1 − fn) while
   the store is empty; is 0 exactly in any patient whose delivery never fell below the abnormal level.
6. **Recovery:** after delivery returns above the abnormal level, function is capped at `fnCap(Q_c)`, and Q_c is repaid
   at a rate that rises with delivery. The two sourced ends (§2.3): after seconds of no flow the cortex is back in
   17 ± 9 s (single-shock ICD test) and 22 ± 12 s (multiple shocks) (de Vries 1998 [ABS]; the VF duration of a test is
   not in the abstract); after a resuscitated arrest of hours-scale injury, continuous EEG within 12 h predicts a good
   outcome (Ruijter 2019 [FT]; arrest duration not read) and awakening comes at a median 46 h from collapse in a cohort
   whose total arrest time (collapse to return of circulation, CPR included, sedated and temperature-managed patients)
   was a median 19 min (Elmer 2023 [FT]; no-flow time not reported). **The curve between the ends is not in any source read: [P], an owner
   question (Q2).**
7. **Lasting injury** (the patient who does not wake) is the EEG plan's injury state, which this plan names as an
   attachment on the debt (§7), not a variable invented here.

Non-ischaemic patients: store clamped full and debt exactly 0 whenever delivery has never been below the abnormal
level, so `fn` = 1 and `metabolic` = 0 bit for bit; nothing new moves (the regression rows are the test, §6).

### 1.4 The readers, and what happens to the present values

| Reader | Reads | Present value, and what it becomes |
|---|---|---|
| EEG cortex (`l2/eeg/state.ts` `cortexStep`) | cortex `metabolic` | `metabolic` is no longer computed inside `cortexStep` from `do2Rel`; the cortex takes it from the organ view through `CortexInputs`. **The holdable input stays in `CortexInputs`** (a field `metabolic`, with `do2Rel` kept only as the pattern table's way to state it), so the MANUAL-depth plan's `ischaemic-slowing` and `ischaemic-loss` patterns still hold a value in the vector and `cortexStep`'s derivation of `metSupp` and `suppress` is unchanged. |
| Consciousness (`l2/neuro/depth.ts`) | cortex `fn`, through `NeuroEnv` (as `neuroglycopenia` arrives) | A new ischaemic term in the consciousness level `hypnotic`, placed inside the EEG's slow phase (van Dijk 2014 [ABS]: loss of consciousness in the first slow phase; flattening only with deeper hypoperfusion). The working form is `isch = metabolic ÷ METABOLIC_SLOW_SHARE` in hypnotic units, which puts loss of consciousness at delivery ≈ 0.32, before any voltage is lost; it adds to the drugs' level as `GLYCO_U` adds neuroglycopenia. **[P]: the onset rests on a [FIT] constant (`METABOLIC_SLOW_SHARE`), not on a source; where loss of consciousness falls is a clinical call, Q4.** Miller Ch10 p. 211 places symptoms at CBF about 30 mL/100 g/min, above the EEG's 20. |
| The present index (`di`, `sr`, BFA sensor only) | the same term, and the cortex's metabolic suppression | Adding the term to the index's `u` cannot show a flat brain: at fn = 0 the formula gives an index ≈ 25 and SR ≈ 20. So the displayed SR is `max(drug SR, 100 × metSupp)` (the cortex's ischaemic suppressed-time fraction, the quantity SR is defined to measure), and the displayed index is the lower of the drug index and the index the formula's own SR relation gives at that SR (`base = 30 − 25 × SR/100`, so SR 100 → 5) [ENG: the present formula's own SR–index relation inverted; no new number]. A separate output beside `diRaw`. **`diRaw` itself, which feeds `neuroOutputs` (`cmro2Mult`, the MAP set-shift) and the drive's sedation term, stays drug-only and unchanged**: the depth plan's ruling keeps the index → physiology coupling exactly as it is until its own piece moves it, and ischaemic demand reduction is the energy state's own functional share (§1.3.4), never counted again through `cmro2Mult`. |
| EEG artefacts (`l2/eeg/artefacts.ts` `emgLevel`, blinks) | the neuro model's consciousness ramp (`loc`) beside the cortex's `lor` | Frontalis tone and blinks follow consciousness: `w = 1 − clamp01(lor + isch)`, the same additive rule the neuro model uses for `hypnotic`, with `isch` the same ischaemic term (one function in `energy.ts`, two readers). The arousal term (`EMG_AROUSAL`) and the tube term are gated by the same `w`. Blinks need consciousness and the brainstem (Magliacano 2021 [ABS]; van Dijk 2014 [ABS]). The readers then compute index and SR from the signal; nothing is set. |
| Breathing gate (`l2/neuro/spont.ts` `stepBrainstem`) | brainstem `fn`, `debt` | First re-expressed with identical output (piece B5): the present anoxia timer `anoxS` becomes the brainstem compartment's state, and the gate's existing constants (the ruled gasp onset, gasp end, rate and VT ceilings, reopening time) become its parameters. Only after the owner's ruling (Q1) are the gasp phase and the reopening re-sourced, and the pulseless withdrawal over `NO_FLOW_S` retired (it is a second mechanism for the same effect once the brainstem's own function exists). Until then the withdrawal stays. |

Consumers of consciousness, and which get the ischaemic term:
- `flags.conscious`, the `lossOfConsciousness`/`emergence` marks, `aware` (conscious and paralysed): yes.
- `neuroResp`'s `loc` (`l2/neuro/drive.ts`, from `hypnotic`): yes. It removes the wakefulness drive and lowers
  upper-airway tone, which are real consequences of unconsciousness. In an arrest the brainstem gate dominates; in a
  partial-flow state (shock, CPR) this is what makes an unconscious hypoperfused patient breathe like one.
- the ventilator "buck" condition (`l2/resp/pipeline.ts`, `n.loc < 0.5`): yes, through `loc`.
- `diRaw` → `cmro2Mult`, `mapSetShiftMmHg`, the drive's sedation term `(60 − di)/20`, `awarenessRisk`: **no** (above).
- The anaesthesia event's `conscious` and the displayed `di`/`sr`: yes.
- `movement` (a stimulus with `hypEq` < 1 and T1 > 0.25): it reads the drug-only `hypEq`, so a laryngoscopy during CPR
  would make a flat-brained patient move. **Yes**: movement also needs cortex `fn` above the failure level, and later
  the brainstem's (spinal reflex movement in brain death is outside this plan).
- The arousal EMG (`EMG_AROUSAL`) and the present index's EMG rise (`EMG_RISE` × stimulus × T1): **yes**, gated as the
  awake tone is.
- `stress` (the sympathetic response to a stimulus, read by the endocrine model): **not yet**; it belongs to the
  brainstem's function and is gated in B7. Until then a stimulus during an arrest still raises it (stated gap).

Order inside a pass: the neuro model steps before the organs (`engine.ts`: neuro, resp, organs, haemodynamics, EEG).
Consciousness and the breathing gate therefore read the brain state one pass late (one 10 Hz brain step or less), as
the breathing gate reads CBF today. The EEG steps after the organs and reads the same pass's state.

### 1.5 Decisions taken (engineering), with their reasons

1. **Thresholds on delivery, not on delivery ÷ demand.** The sourced thresholds are CBF values measured in
   anaesthetised patients (Miller Ch35 p. 1122, carotid surgery); a ratio would move them for every anaesthetised or
   cold patient and shift the C34 rows without a source. Demand acts on the store's drain and on the debt only. That
   anaesthetics lower the critical CBF is a known claim whose numbers are WANTED (an anaesthetic-specific
   critical-CBF study); if found, it changes `fnSS` by a sourced factor, in its own piece.
2. **The functional share does not reach flow–metabolism coupling.** `targetCbf` keeps `cmro2Rel` (drug × temperature)
   exactly. A silent brain lowering its own target flow, which lowers delivery, which keeps it silent, is a latch; its
   real counterpart, post-ischaemic hypoperfusion, is a named attachment (§7). Test, with the points chosen by
   delivery (hypoxaemia at PaO2 35 keeps delivery above 1 through `o2Factor`, so it would test nothing): MAP lowered
   until cortex delivery is 0.30 for 60 s and restored; Hb lowered until delivery is 0.35 and restored; PaO2 lowered
   until delivery is 0.35 and restored. Each time function returns to 1 and debt to 0 (no latch).
3. **One function, two readers for the ischaemic unresponsiveness** (neuro's `hypnotic` and the EEG artefacts' gate).
   The drug side is already held twice today (neuro's `hypnotic` and the cortex's `lor`, both from LOC C50s); this plan
   does not widen that and the hand-over names it.
4. **The pulseless withdrawal stays until Q1.** Removing it changes MODELED arrest breathing; that is a clinical
   ruling, not a structural one.

---

## 2. What the brain shows as flow falls and returns

Each row: mechanism, source, time course, the cell it becomes. Every reader computes from the signal; nothing is set.

### 2.1 Abrupt no flow (VF, asystole), normothermic

| # | What | Mechanism in this plan | Source | Time course / cell |
|---|---|---|---|---|
| A1 | EEG slowing, then isoelectric | cortex store drains, `fn` falls through the slow share then to 0 | Clute 1990 [ABS]: change in 88 % of 93 arrests, mean 10.2 s after the last normal beat, mostly slowing and attenuation; de Vries 1998 [ABS]: fast activity falls, slow rises, isoelectric at 11 ± 2 s; Pana 2016 [ABS], review of 39 studies: EEG lost < 30 s | cell: raw EEG < 5 µV (cortex part) by VF + 9…13 s end to end; must-hold < 30 s |
| A2 | Loss of consciousness | the ischaemic term at the slowing onset | van Dijk 2014 [ABS] (69 tilt syncopes, 1 s video-EEG): LOC in the first slow phase; Pana 2016 [ABS]: LOC within 30 s; Aminoff 1988 [ABS]: ICD-test VT/VF of 15–126 s gave definite LOC in 15 of 22 episodes; Rossen 1943 (time to LOC on arrest of cerebral flow) WANTED | `flags.conscious` false by the A1 slowing onset; band ≤ 30 s |
| A3 | Frontalis tone, blinks, movement, response to command gone | artefacts and movement follow consciousness | Miller Ch36 p. 1142 (frontalis EMG falls with loss of consciousness, the engine's own source for `EMG_AWAKE`); Magliacano 2021 [ABS]; van Dijk 2014 [ABS] | EMG and blinks 0 once unconscious; movement follows the existing `movement` rule only while conscious |
| A4 | Processed index and SR | computed by each reader from the now near-flat signal | Kurita 2012 [ABS] (15 swine, isoflurane): BIS fell suddenly at MAP 22 ± 3 and was isoelectric before resuscitation; Aprea 2014 [ABS] (one calf): BIS 0, SR 100 in asystole | cell: BIS-type SR > 80 and index < 20 by VF + 90 s. The reader's burst-suppression rate runs over the previous 63 s (`bis-type.ts` `bsrWindowS`), so with the cortex isoelectric from about +14 s the window is full of silence only after about +77 s; "+60 s" would be unreachable by the reader's own definition. Direction from Kurita/Aprea; the exact numbers [P] |
| A5 | Myoclonus / tonic activity at onset | **attachment, not built here** (§7) | Lempert 1994 [ABS]: myoclonus in 38 of 42 complete syncopes (90 %), LOC 12.1 ± 4.4 s; Aminoff 1988 [ABS]: tonic activity or twitching in 10 of 22 ICD-test episodes; van Dijk 2014 [ABS]: jerks need a slow, not flat, cortex | named; the slow-phase window is the state's (fn between slow and flat) |
| A6 | Breathing: continued, then gasps, then apnoea | brainstem compartment; today's ruled gate first | the ruling: gasps from 30 s, VT ≤ 0.3 × rest, apnoea by 2 min, plus the pulseless withdrawal to 0 over 60 s. Sources: Zuercher 2010 [FT] (61 isoflurane-anaesthetised swine): all 61 kept a normal breathing pattern at ≈ 10/min through the first minute; in minutes 2–5 gasping in 23–82 % of the animals at fewer than 3 gasps/min; none at 6 min (0 of 16); Lin 2023 [ABS] (pigs): gasps 2–5/min with VT 0.62 ± 0.19 L, larger than baseline; Clark 1992 [ABS]: agonal respirations in 55 % of witnessed and 56 % of VF arrests; Bobrow 2008 [ABS]: gasping in 33 % at EMS arrival, falling with time | **The ruling and the sources differ**: the sources show breathing continuing for about a minute and slow gasps (under 3/min in swine, 2–5/min with a large VT in pigs) lasting minutes; the engine shows almost no gasp (the withdrawal takes the rate to 0 within 60 s, the gasp ceiling is reached for a few seconds). Q1. |
| A7 | Pupils and brainstem reflexes | **not shown**: `neuroOutputs.pupilMm` is published only, read by nothing on the monitor (it appears only in the demo's glossary) | Jørgensen 1997 [ABS] (order of recovery) | attachment (§7) |
| A8 | CPR at partial flow | the same state at delivery ≈ 0.30–0.47 (measured CBF 0.30–0.40) | Kurita 2012 [ABS], Aprea 2014 [ABS] and two case reports (Azim 2004, Jung 2013 [ABS]): BIS rises during CPR; Hossmann 1988 [ABS] (cats, after 1 h of ischaemia): EEG recovery almost always with recirculation CBF > 40 mL/100 g/min; Losasso 1992 (EEG during asystole and CPR, humans) WANTED | **After B3 and before B6b the patient wakes under CPR**: in the measured course (c) cortex delivery passes 0.32 about 60 s into compressions and 0.40 by about 4 min, so consciousness returns, the awake EMG and blinks return and the index reads ≈ 97, under compressions. This is a known miss recorded in B4; it stays for good if Q2 is answered B. With the debt (B6b): function capped while debt remains; repayment at CPR flow is **in conflict** between the BIS-rise reports and Hossmann's 40 mL/100 g/min (cats, after 1 h of ischaemia, recirculation not CPR; the fraction of the cat's own normal flow is not in the abstract). Stated, not chosen: Q2. The BIS-rise reports are also confounded by the compression artefact on the EEG, which the engine does not draw (§7). |
| A9 | Breathing under CPR | brainstem compartment at CPR delivery (B7) | Zuercher 2010, Crit Care Res Pract [FT] (swine): gasping during continuous chest compressions and during 30:2 CPR, more gasps after short than after long untreated VF, more with continuous compressions | today: no gasp under CPR (the pulseless withdrawal holds the effort at 0 while pulseless). After B7 (Q1 = B): gasps resume under compressions as brainstem delivery returns, fewer after a long untreated phase |

### 2.2 Gradual falls: hypotension, hypoxaemia, anaemia, hypoglycaemia, hypothermia

- **Hypotension:** flow is autoregulated down to the lower limit (`CBF_LL` 60 CPP), then pressure-passive; delivery
  falls with it. EEG changes are "bilateral and modest" in hypotension and clear in sudden arrhythmias (Miller Ch35
  p. 1127). The store is irrelevant at these rates; `fnSS` decides. Cell: MAP held so that CBF = 0.3 for 5 min →
  slowing with voltage kept, unconscious (A2's threshold), no debt beyond the failure level.
- **Hypoxaemia:** CBF rises below PaO2 60 (`o2Factor`, ×2 at 30); delivery falls only once that compensation is spent,
  then the EEG slows and is abolished (Miller Ch35 p. 1126) — exactly through `D = CBF × CaO2`. Unchanged physics;
  consciousness is new.
- **Anaemia:** CaO2 falls, and the engine has no CBF rise with anaemia (`targetCbf` has no Hb term) [P: absent,
  named attachment]. So delivery reaches the working loss-of-consciousness level (0.32) at Hb ≈ 4.3 g/dL with normal
  flow (0.32 × 18.5 mL/dL = 1.34 × Hb × 0.97 + 0.29), and **after B2 a haemorrhage patient becomes unconscious from
  anaemia alone at that Hb**, earlier than a patient whose flow rises would. B2 lists every existing row whose delivery
  falls below 0.40 (haemorrhage, haemodilution, hypoxaemia, shock) before claiming that no row moves.
- **Hypoglycaemia:** today a separate hypnotic term (`GLYCO_U` 1.2 [FIT], glucose 60 → 30 mg/dL). Under this structure
  glucose is the second substrate of the same state: `fnSS` takes min(O2 supply, glucose supply), with EEG slowing at
  about 40 mg/dL and suppression below 20 mg/dL (Miller Ch10 p. 219, the EEG plan's U7). Piece B8 moves it and retires
  `GLYCO_U`, so neuroglycopenia is not held twice. Until B8, both exist and the plan says so.
- **Hypothermia:** demand falls 7 %/°C (`Q10_BRAIN`), so store and debt run slower; the cold EEG's own slowing and
  suppression (`cold`, Stecker 2001) stays in `cortexStep` because it is a rate effect on the cortex, not an energy
  failure. Loss of consciousness is common below 28 °C (Miller Ch71 p. 2254): a WANTED-sourced attachment for the
  consciousness term, not built here.
- **Drugs that lower CMRO2** act through `b.cmro2Rel` on demand: slower drain and debt. Hossmann 1988 [ABS] found no
  improvement of recovery after barbiturate anaesthesia in complete ischaemia, which this structure reproduces: in
  complete ischaemia a silent brain's demand is already basal, and a drug cannot lower what the electrical silence has
  already removed.

### 2.3 After the circulation returns

| # | What | Source | Course in this plan |
|---|---|---|---|
| R1 | Brief arrest (ICD testing, seconds): EEG back | de Vries 1998 [ABS]: 17 ± 9 s single-shock, 22 ± 12 s multiple-shock; cerebral O2 uptake lags the EEG | cell (B6b): after a single-shock-test arrest (its VF duration is not in the abstract: [P] on the arrest length the cell uses, stated in the piece), cortex back to fn > 0.9 at 17 ± 9 s after the circulation returns; longer than the measured 9–10 s today |
| R2 | Order of recovery | Jørgensen 1997 [ABS] (111 resuscitations): breathing first, then pupillary light reflex, cough and swallowing, then the ciliospinal reflex; consciousness last | brainstem debt is repaid before the cortex's (its smaller vulnerability, B7); cell: breathing returns before consciousness after any arrest that silenced both |
| R3 | The EEG's course after a long arrest | Jørgensen & Holm 1998 [ABS] (231): intermittent activity, then continuous delta → theta → alpha, over hours to days; Geocadin 2002 [ABS] (rats, 5 or 7 min asphyxia): more bursting in the first 30–40 min in good-outcome animals; Jia 2008 [ABS] (rats, 7 min): EEG recovers through periodic bursting from isoelectricity, burst frequency higher in the first 90 min with hypothermia, earlier return of continuous activity | `fnCap(Q)` rises from 0 through a burst-suppression range (the EEG cortex's existing suppression drives the bursting) to continuous; the hours scale is [P], Q2 |
| R4 | Outcome by the EEG at 12 and 24 h | Ruijter 2019 [FT] (850 patients): generalized suppression (< 10 µV) or synchronous patterns with ≥ 50 % suppression from 6 h onward invariably meant poor outcome; continuous patterns at 12 h predicted good outcome (sensitivity 0.50, specificity 0.91); Westhall 2016 [FT] (103 of the TTM trial): a highly malignant EEG (suppression, suppression with periodic discharges, burst suppression) after rewarming meant poor outcome in all; a benign EEG in 1 % of poor outcomes | validation bands for the injury attachment (§7), not built in this plan's pieces |
| R5 | Awakening | Elmer 2023 [FT] (1 002 + 166 comatose patients with cEEG): awakening = following commands, median 46 h [IQR 33–88] and 65 h [46–123] from collapse at the two centres; total arrest time (collapse to return of circulation, CPR included) 19 [11–29] and 15 [10–30] min, no-flow time not reported; sedation and temperature control standard | the far end of Q2's curve |
| R6 | Hypothermia after return | Jia 2006 [ABS] (rats, 7 and 9 min asphyxia, 33 °C for 12 h): better qEEG recovery and 72-h deficit scores with hypothermia; Jia 2008 [ABS]; Westhall 2016 [FT]: patterns' prognostic value not changed by 33 vs 36 °C | demand falls with temperature; the repayment rate's temperature dependence is [P] in Q2 |
| R7 | Breathing after return | the ruling: the gate reopens over 2 min (ruling "1–3 min"); the MANUAL gate (the merged repair) applies it in MANUAL | B5 re-expresses it unchanged; B7 makes it a function of brainstem debt once Q1/Q2 rule |
| R8 | The patient who does not wake | Ruijter 2019 [FT], Westhall 2016 [FT], Elmer 2023 [FT]; mechanism (synaptic failure becoming lasting) Hofmeijer 2012 [ABS] | the injury state on the debt (§7); Q3 decides whether it is in this plan |

---

## 3. Where the state meets the rest of the body

| Link | In or out | Reason |
|---|---|---|
| Cerebral autoregulation, CO2 and O2 reactivity | **reused** | `autoreg`, `co2Factor`, `o2Factor`, `TAU_VASC_S` already set CBF; the state reads CBF, so hyperventilation and hypercapnia act through flow, as Miller Ch35 p. 1127 says they do |
| Hypothermia | **in** (demand), consciousness below 28 °C **attachment** | demand is existing code; the LOC temperature needs its source read |
| Drugs lowering CMRO2 | **in**, through `b.cmro2Rel` | existing code; the index → `cmro2Mult` coupling is kept as ruled |
| Glucose | **in**, piece B8 | the endocrine glucose state exists; retires `GLYCO_U` |
| Cushing response to raised ICP | **unchanged** | `stepCushing` responds to intracranial hypertension only, by design (a low CPP from systemic hypotension is the circulation's business) |
| CNS ischaemic response (sympathetic drive from medullary ischaemia) | **named attachment** | the coupling is already declared absent (`organs.absent.brainstemToHub`); the brainstem compartment's `fn` is its natural input. Out of scope because the one sympathetic state it would drive is the autonomic plan's |
| Raised ICP | **attachment point only** | CPP already includes ICP, so delivery falls with it; herniation stays the organ model's rule |
| Post-ischaemic hypoperfusion | **attachment** | real (delayed hypoperfusion after reperfusion), but it would couple function to flow (§1.5.2); its sources are not read |
| Regional flow, territories | **attachment** (V0) | one global CBF |
| Pupils, brainstem reflexes | **attachment** | no display reads them; `pupilMm` is published only |
| Seizures and myoclonus | **attachment** (the EEG plan's seizure pieces and the convulsion's muscle) | the sources place jerks in the slow phase (van Dijk); building them needs the muscle/EMG burst source, not this state |
| Evoked potentials | the EEG plan | drug silence and death must differ there (Miller Ch35 p. 1113), which the debt and injury state make possible |

---

## 4. MANUAL and MODELED

- **The state runs in both modes.** The organ model is stepped in MANUAL; so is `stepBrain`, so the energy state is
  always current.
- **MODELED:** every reader acts.
- **MANUAL:** targets are the patient; physiology overrides a target when it forces one, with the override flag (as
  "pulseless → no SBP" and the MANUAL breathing gate do).
  - Consciousness: an ischaemic patient becomes unconscious in MANUAL. Nothing in MANUAL sets consciousness, so there is
    no target to override; the override flag is not needed.
  - Breathing: the instructor's rate passes through the brainstem gate (the merged repair); B5 and B7 change what the
    gate reads, not how MANUAL applies it.
  - EEG: the cortex reads `metabolic` from the state. **A held EEG pattern (MANUAL-depth plan) holds its own
    `CortexInputs`, including `metabolic`**, so a chosen pattern stays exactly what was chosen; the body (consciousness,
    breathing) still reads the real state. The hold forks only the EEG's read, as that plan requires.
  - A hand-set depth index (MANUAL-depth plan) is shown as set; the instructor's row shows what the trace reads. An
    arrest under a held "BIS 45" therefore shows 45 on the bedside and "trace reads N" to the instructor, as that plan
    rules for any disagreement.
  - Artefacts: EMG and blinks follow the real consciousness in both modes (the artefact path stays live under a held
    pattern, per that plan).

---

## 5. Sources

**How they were read.** Abstracts through the Europe PMC REST search service (JSON, read in memory). Open-access full
texts through Europe PMC's `fullTextXML` service, read in memory and searched by phrase; the PMC article pages refused
automated reading with a bot check and were not used. **No file was downloaded.**

| Source | Read | What it gives the plan |
|---|---|---|
| Miller's Anesthesia 10th ed., Ch35 pp. 1105, 1113, 1122, 1126, 1127; Ch10 pp. 211, 219; Ch36 p. 1142; Ch71 p. 2254 | as cited by the engine's own constants and the EEG plans (the book is the engine's reference) | thresholds 20/50 and 12/50; order slowing → voltage loss; hypoxaemia via flow; glucose thresholds; LOC below 28 °C |
| Clute & Levy 1990, Anesthesiology 73:821 (PMID 2240671) | [ABS] | EEG change at mean 10.2 s |
| de Vries et al. 1998, Anesth Analg 87:16 (PMID 9661538) | [ABS] | isoelectric 11 ± 2 s; recovery 17 ± 9 / 22 ± 12 s; O2 uptake lags EEG |
| Pana et al. 2016, J Crit Care 34:77 (PMID 27288615) | [ABS] | EEG lost < 30 s; LOC < 30 s |
| van Dijk et al. 2014, Brain 137:576 (PMID 24343112) | [ABS] | LOC with first slowing; jerks in the slow phase |
| Lempert et al. 1994, Ann Neurol (PMID 8053660) | [ABS] | myoclonus in 90 % of complete syncopes; LOC lasting 12.1 ± 4.4 s |
| Aminoff et al. 1988, Ann Intern Med 108:791 (PMID 3369769) | [ABS] | LOC and motor activity in ICD-test VT/VF |
| Kurita et al. 2012, J Trauma Acute Care Surg 72:1614 (PMID 22695430) | [ABS] | BIS falls suddenly at MAP 22 ± 3; isoelectric before CPR |
| Aprea et al. 2014 (PMID 24400814); Azim 2004 (PMID 15144304); Jung 2013 (PMID 23372890) | [ABS] | BIS 0/SR 100 in asystole; BIS rises during CPR |
| Hossmann 1988, Crit Care Med (PMID 3139367) | [ABS] | recovery needs recirculation CBF > 40 mL/100 g/min (cats; their own normal flow not stated); temperature, pH, glucose influence it; barbiturates did not help |
| Hofmeijer & van Putten 2012, Stroke (PMID 22207505) | [ABS] | ≈ 30 % of energy to synaptic transmission; synaptic failure first, may persist |
| Ching et al. 2012, PNAS (PMC3286963) | [FT-part]: main text; the SI (time constants, the K-ATP gating form) not read | ATP-gated suppression: production at 50 % of baseline gives burst-suppression ratio ≈ 0.5, 30 % ≈ 0.75; bursts and suppressions of 4–10 s; ATP recovers during suppression. The mechanism the EEG plan's metabolic burst-suppression piece names; this plan's `fn` is its input |
| Zuercher et al. 2010, BMC Cardiovasc Disord 10:36 (PMC2928171) | [FT] (searched by phrase) | all 61 breathing at ≈ 10/min in minute 1 of VF; gasping in 23–82 % at < 3/min in minutes 2–5; 0 of 16 at 6 min |
| Zuercher et al. 2010, Crit Care Res Pract (PMC2951081) | [FT] (searched by phrase) | gasping during continuous compressions and 30:2 CPR; more after short untreated VF |
| Lin et al. 2023, Shock 59:948 (PMID 37018832); Clark 1992 (PMID 1443844); Bobrow 2008 (PMID 19029463) | [ABS] (as read for the measurement) | gasp rate and VT; incidence |
| Jørgensen 1997 (PMID 9259054); Jørgensen & Holm 1998 (PMID 9571727) | [ABS] | order of recovery; EEG course over hours to days |
| Geocadin et al. 2002, Resuscitation (PMID 12413758); Jia et al. 2006, Brain Res (PMID 16919609); Jia et al. 2008, Resuscitation (PMID 18597914) | [ABS] | bursting recovery in the first 30–90 min; hypothermia's effect |
| Ruijter et al. 2019, Ann Neurol 86:203 (PMC6771891) | [FT] (searched by phrase) | categories and µV threshold; 6/12/24 h predictions; n = 850 |
| Westhall et al. 2016, Neurology (PMC4836886) | [FT] (searched by phrase) | highly malignant categories; median 77 h; TTM 33 vs 36 °C no effect on prediction |
| Elmer et al. 2023, Crit Care Med 51:503 (PMC10023349) | [FT] (read through a fetch tool) | awakening median 46 h / 65 h; arrest duration 19 / 15 min |
| Magliacano et al. 2021, Sci Rep 11:22393 (PMID 34789832) | [ABS] (as read for the measurement) | blink rate graded by level of consciousness |
| Guo et al. 2023, Ann Clin Transl Neurol (PMC10723251) | [FT-part]: methods and discussion only | 7-min rat arrest model; restates Geocadin's bursting in the first 10–30 min evolving to continuous activity |

**WANTED** (each with what it settles):
- Rossen, Kabat & Anderson 1943 (time to LOC on acute arrest of cerebral flow): A2's band in seconds.
- Losasso et al. 1992, Anesth Analg (EEG during asystole and CPR in humans): A8, whether CPR flow restores the EEG.
- Astrup, Siesjö & Symon 1981, Stroke (thresholds; the penumbra): full text for the flow thresholds and their time
  dependence (no abstract indexed).
- Hofmeijer & van Putten 2012 full text: the synaptic share for §1.3.4.
- Ching et al. 2012 SI: the ATP time constants, if the EEG plan's piece uses them.
- A source for time to EEG and consciousness recovery as a function of no-flow duration between seconds and 15 min
  (human or large-animal VF): the middle of Q2's curve. Searches by title words found none.
- A source for the brainstem's vulnerability relative to the cortex in seconds (the brainstem's `fnSS` thresholds):
  B7.
- An anaesthetic-specific critical-CBF study: §1.5.1.
- A source for loss of consciousness from hypothermia (Miller Ch71 p. 2254 gives "below 28 °C"; the primary study).

---

## 6. The pieces

Every piece: tests first; a source beside each validation cell; the `run-validation` label (each moves or could move a
value under `packages/engine-core/src/**`); the regression rows (`eeg-baseline.json`, the depth, neuro, breathing,
organ and sanity rows) byte-identical unless the piece says which row moves and why, attributed to that piece. Plan
hours are estimates.

**Order.** B1 structure → B2 consciousness (Q4) → B3 artefacts and readers → B4 arrest cells → B5 brainstem relocated
→ B6a cortex store → B6b cortex debt (Q2) → B7 brainstem re-sourced (Q1, Q2; BLOCKED on a source) → B8 glucose.
B1, B3, B4, B5 and B6a need no ruling; B2 needs only Q4, which is a short answer.

### B1. The structure: the cortex's energy entry, moved, with no change (plan 8 h · 1.0–1.3 executor-h). Advisor: design.
- **What:** `l2/brain/energy.ts` with `BrainEnergy` and its cortex entry; `brainDo2Rel`, `DO2_EEG_ABNORMAL`,
  `DO2_EEG_LOST`, `METABOLIC_SLOW_SHARE` and the `metabolic` formula move from `l2/eeg/state.ts`; the organ view
  publishes the cortex's `delivery`, `fn`, `metabolic`; `CortexInputs` takes `metabolic` (the holdable field) and
  `cortexStep` uses it; `eegCtx` passes it. No store, no debt, no brainstem entry: `fn = fnSS(D)` exactly.
- **Tests:** `metabolic` bit-identical to main for a delivery sweep 0…1.2 (unit); the measurement's four courses
  reproduce main's EEG cortex columns exactly (one headless test, MANUAL and MODELED); snapshot round trip; the
  couplings census regenerated (`neuro.eeg.cortex.metabolic` now reads the organ state).
- **Must not change:** any value, in any patient, ischaemic included. `eeg-baseline.json` byte-identical.
- **Owner ruling:** none.

### B2. Consciousness from the cortex's function (plan 9 h · 1.1–1.5 executor-h). Advisor: none.
- **What:** `NeuroEnv` carries the cortex's `fn` and `metabolic`; `depth()` adds the ischaemic term to `hypnotic` and
  produces the displayed index and SR of §1.4; `diRaw` and `neuroOutputs` unchanged; `movement` and the index's EMG
  rise gated (§1.4 consumer list).
- **Tests:** unit: the onset Q4 rules; drug-only `diRaw` unchanged for every existing depth test; the displayed index
  at fn = 0 is 5 with SR 100. Cells: A2 (unconscious by the ruled onset, ≤ 30 s; van Dijk, Pana); the no-latch set of
  §1.5.2. Regression: the piece first lists every existing row with cortex delivery below 0.40 (haemorrhage,
  haemodilution, hypoxaemia, shock, §2.2 anaemia) and states which move; the MODELED arrest's breathing may move through
  `loc` (wakefulness drive), by how much is reported, and the s9b/s9c rows must stay green.
- **Must not change:** `cmro2Mult`, the MAP set-shift, the drive's sedation term, `awarenessRisk`.
- **Owner ruling:** Q4 (where loss of consciousness falls).

### B3. The EEG artefacts and the readers follow consciousness (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** `emgLevel` and the blink gate take `lor + isch` (the additive rule of B2), with the arousal and tube terms
  gated by the same weight.
- **Tests:** unit: EMG 0 and no blinks with `isch` = 1 at `lor` 0; `eeg-baseline.json` byte-identical. Cells: A3; A4
  (BIS-type SR > 80 and index < 20 by VF + 90 s, given its 63-s window; Entropy SE falls likewise).
- **Must not change:** the readers' algorithms (`l3/eeg-devices/`).
- **Owner ruling:** none. Depends on B2.

### B4. The arrest validation cells (plan 5 h · 0.6–0.8 executor-h). Advisor: none.
- **What:** sanity rows in `packages/validation/suites/sanity/` for the witnessed-VF course in both modes: A1 end to end
  (isoelectric by VF + 9…13 s; must-hold < 30 s) **recorded as a known miss** (red on main through the circulation's
  decay, §1.3.3), A2, A4; known misses for course (d)'s instant recovery and for course (c)'s waking under CPR (A8)
  until B6b.
- **Tests:** the rows; `docs/validation/known-misses.md` regenerated.
- **Owner ruling:** none.

### B5. The breathing gate's state relocated into the brainstem entry (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** a relocation only. `anoxS` and `gate` move from `SpontDrive` into `BrainEnergy.brainstem`, keeping their
  meaning, their 1 Hz cadence and their read point (still stepped by `stepBrainstem` in the resp pipeline, reading
  `organs.brain.cbfRel` and the no-flow flag); the ruled constants keep their values. This is **not** yet the
  `{ store, fn, debt }` form: a CBF threshold with a 1 Hz timer is a different mechanism, and B7 replaces it. The
  pulseless withdrawal (`plS`, `NO_FLOW_S`) is untouched.
- **Tests:** the s9b and s9c rows and `manual-brainstem-gate.test.ts` unchanged; MODELED and MANUAL arrest breathing
  bit-identical to main; snapshot round trip (the state's new home, with a reader for old snapshots).
- **Must not change:** any breathing value.
- **Owner ruling:** none. If the orchestrator prefers, B5 folds into B7; it is kept separate so that B7's PR changes
  values only.

### B6a. The cortex's O2 store (plan 7 h · 0.9–1.2 executor-h). Advisor: design.
- **What:** the derived store (§1.3.3) and the demand of §1.3.4 with the one shared F (moving `neuroOutputs`' 0.45 into
  the shared constant without changing its value).
- **Tests:** unit: non-ischaemic patients bit-identical (store full); the store's size computed from the named constants
  (no new literal); the zero-flow step cell (isoelectric at 11 ± 2 s; de Vries), reported as met or missed by the
  derivation, never tuned. Cells: A1 end to end again (expected later than main's +14 s; stays a known miss with its
  upstream cause).
- **Must not change:** `targetCbf`, `cmro2Rel`, `cmro2Mult`'s value, PbtO2, SjvO2.
- **Owner ruling:** none.

### B6b. The cortex's debt: recovery that depends on the arrest (plan 10 h · 1.3–1.7 executor-h). Advisor: design.
- **What:** debt and `fnCap` (§1.3.5–6) as Q2 rules.
- **Tests:** unit: debt exactly 0 in every non-ischaemic patient. Cells: R1 (17 ± 9 s; de Vries, with the arrest length
  stated as [P]); longer arrest → longer recovery, monotonic; colder → less debt for the same arrest; course (c)'s
  waking under CPR moves to whatever Q2 rules; the no-latch set again. The 2-min course (d) moves from the known misses
  to green or to a stated [P] band per Q2. The PR states what a session shows after a 5-minute arrest.
- **Must not change:** `targetCbf`, `cmro2Rel`, PbtO2, SjvO2.
- **Owner ruling: Q2 before it starts.**

### B7. The brainstem re-sourced: continued breathing, gasps and their return (plan 14 h · 1.8–2.3 executor-h). Advisor: design.
- **What:** per Q1: the brainstem's own `{ store, fn, debt }` replacing B5's timer; the gasp phase from its partial
  function with the sourced rate and VT; gasps under CPR (A9); the pulseless withdrawal retired; reopening from the
  brainstem's debt (breathing back before consciousness, R2); `stress` gated by the brainstem's `fn`.
- **BLOCKED on a source** as well as on Q1: no source read gives the brainstem's delivery thresholds or its tolerance in
  seconds relative to the cortex (§5 WANTED). Built without one, its numbers would be fitted to Zuercher's time course,
  which the rules forbid.
- **Tests:** per Q1: Zuercher BMC [FT] (≈ 10/min in minute 1; gasping in 23–82 % at < 3/min in minutes 2–5; none at
  6 min), Lin (gasp VT larger than rest), Zuercher CCRP [FT] (gasps under compressions, fewer after long untreated VF),
  R2 (breathing before consciousness); the s9b/s9c rows re-banded only to their own sources.
- **Owner ruling: Q1 (and Q2 for the reopening) before it starts.**

### B8. Glucose as the second substrate (plan 8 h · 1.0–1.3 executor-h). Advisor: none.
- **What:** `fnSS` = min(O2 term, glucose term) with the Ch10 p. 219 thresholds; `GLYCO_U`'s **consciousness** term
  in `hypnotic` retired in favour of the state. `GLYCO_U` is also in the index's `u`, which feeds `diRaw` →
  `cmro2Mult`: removing it there would move a frozen physiology coupling, so the index part stays until the depth
  plan's own piece moves the index → physiology coupling. B8 says so in its PR.
- **Tests:** the hypoglycaemia rows: glucose 40 → slowing, < 20 → suppressed, unconscious below the slowing; the
  existing hypoglycaemia consciousness tests (moved by attribution to this piece if their numbers change); `cmro2Mult`
  in hypoglycaemia unchanged.
- **Owner ruling:** none.

Total ≈ 73 plan hours (9.1–12.2 executor-hours), estimates.

---

## 7. Named attachments (outside this plan)

- **Lasting injury and the patient who does not wake:** the EEG clinical plan's injury state, reading this state's
  debt; its bands are R4/R5 (Ruijter, Westhall, Elmer). Whether it is built here instead is Q3.
- **Myoclonus and tonic activity at onset:** the slow-phase window of `fn`; needs the muscle burst's source.
- **Pupils and brainstem reflexes:** the brainstem compartment's `fn` and debt; needs a display and the order of
  Jørgensen 1997 as its test.
- **The CNS ischaemic response:** `organs.absent.brainstemToHub` reading the brainstem's `fn`.
- **The EEG's compression artefact during CPR** (it confounds the BIS-rise reports, A8).
- **Anaemia's CBF rise** (`targetCbf` has no Hb term; §2.2).
- **The circulation's flow decay after arrest** (A1's upstream miss, §1.3.3): the circulation's own plan.
- **Post-ischaemic hypoperfusion; anaesthetic-specific critical CBF; regional flow (V0); hypothermic loss of
  consciousness; the EEG plan's metabolic burst suppression** (Ching 2012) reading `fn`.

---

## 8. Self-review against the code (4d8e7742)

- `cortexStep` computes `metabolic` from `x.do2Rel` (`l2/eeg/state.ts`); `brainDo2Rel` is defined there and called from
  `l2/eeg/pipeline.ts`. B1 moves both.
- `stepBrain` already computes the delivery/demand ratio `r` for `brainOxygen`; B1 does not change `r`.
- `artefacts.ts` gates EMG on `1 − clamp01(lor)` and blinks on `lor < 1`; B3 changes only the argument.
- `depth()` feeds `diRaw` to `neuroOutputs` (`cmro2Mult`, `mapSetShiftMmHg`) and to `neuroResp` (`di`); B2 adds a
  separate displayed output and leaves `diRaw`.
- `neuroResp` derives `loc` from `hypnotic` (`LOC_LO`–`LOC_HI`); `loc` reaches the drive's `wake` and the ventilator
  buck condition.
- Pass order neuro → resp → organs → haemodynamics → EEG (`engine.ts`): consciousness and breathing one pass late.
- `pupilMm` is read by nothing on the monitor.
- The MANUAL-depth plan holds `CortexInputs`; B1 keeps a holdable `metabolic` in it.

---

## 9. Questions for the owner

1. **Should the first minute of an arrest show continued breathing and then minutes of slow gasps, as the sources do,
   instead of today's rule?**
   Today: gasps from 30 s with a small tidal volume, apnoea by 2 min, and the patient's effort withdrawn to zero over
   the first minute, so almost no gasp is ever seen, and none under CPR. The sources: all 61 swine kept breathing
   normally (≈ 10/min) through the first minute of VF; in minutes 2–5, 23–82 % gasped at fewer than 3 a minute; none by
   6 min; gasps came back under chest compressions; pig gasps are larger than a normal breath; more than half of
   witnessed VF arrests in people show agonal breaths.
   - (A) Keep today's rule.
   - (B) Re-source it from these studies in piece B7: continued breathing in minute 1, gasps in minutes 2–5 with their
     rate and size, gasps under CPR, apnoea by 6 min, and the effort withdrawal retired. B7 also waits for a source on
     how much longer the brainstem tolerates no flow than the cortex.

   **Proposal B.**
2. **How long should the brain take to come back after the circulation returns, for arrests between a few seconds and
   twenty minutes, and does CPR-level flow bring it back?**
   The sources give only the two ends: after an ICD test's seconds of VF the EEG is back in about 20 s; patients
   resuscitated after a median 19 min (CPR included, then sedated and cooled) who do well have a continuous EEG by 12 h
   and wake at a median of about two days. Nothing read gives the curve between. Whether CPR flow repays the debt is in
   conflict: BIS rises during CPR in case reports, while in cats recovery needed a flow of 40 mL/100 g/min.
   Until this is ruled, the simulated patient **wakes under CPR**: about a minute into compressions the brain's oxygen
   delivery passes the level at which consciousness returns, and the depth monitor reads ≈ 97.
   - (A) Build the debt with the two sourced ends as cells and a marked placeholder curve between them (smooth, rising
     with the arrest's length, falling with cooling), with CPR flow repaying it only slowly; keep looking for the source.
   - (B) Build the onset only (to B6a); recovery stays instant, and waking under CPR stays, as declared known misses until
     a source for the middle is found.
   - (C) As A, but the instructor sets the expected outcome of an arrest (wakes / slow / does not wake) as a case
     parameter instead of a curve.

   **Proposal A**, with what a session shows after a 5-minute arrest stated in the placeholder's PR (it will show
   minutes of burst suppression and no waking within a teaching session; whether that is acceptable is part of this
   answer).
3. **Is the patient who does not wake built in this plan, or left to the EEG plan's injury state?**
   It needs the malignant patterns (suppression, burst suppression with identical bursts) that last for hours, and a
   rule for when injury becomes permanent, which no source read gives as a mechanism.
   - (A) Left to the EEG plan, which reads this plan's debt.
   - (B) Added here as a piece after B6b.

   **Proposal A.**
4. **When the brain's blood supply falls, at what point does the patient lose consciousness?**
   The sources say consciousness goes in the first slow phase of the EEG, before it flattens; the textbook puts symptoms
   at a flow of about 30 mL/100 g/min (60 % of normal) and EEG slowing at about 20 (40 %). The engine's EEG divides the
   range between slowing and flattening at a fitted midpoint.
   - (A) Inside the slow phase (at about a third of normal oxygen delivery: well into the EEG's slowing, before the
     voltage goes). This uses the EEG's fitted midpoint, marked as such.
   - (B) At the first EEG slowing (40 % of normal delivery).
   - (C) At the textbook's symptom level (60 % of normal flow), before the EEG changes.

   One consequence for every answer: the engine does not raise brain flow in anaemia, so an anaemic patient at a
   normal blood pressure loses consciousness at Hb ≈ 4.3 g/dL under A, ≈ 5.5 under B and ≈ 8.3 under C.

   **Proposal A**, because it is the one that keeps loss of consciousness inside the slow phase the sources describe
   and needs no new number.
