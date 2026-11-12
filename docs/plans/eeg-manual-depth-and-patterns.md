# MANUAL mode: the depth index set by hand and the EEG trace chosen by pattern — Plan

**STATUS: DRAFT FOR REVIEW (12 November 2026, brief 211).** A planning executor wrote this plan. Nothing in it is
ruled until the owner answers §9 and the orchestrator reviews the pieces. No product code, test, constant, card or kit
file was changed while writing it.

**Base.** `origin/main` **45dc8511** (Merge PR #445). Worktree `scratch/wt-plan-eeg-manual`, branch
`plan-eeg-manual-depth-patterns`. Every `file:line` is a starting point only; an executor finds the code by the
function name given, because lines move.

**Checked first.** `gh pr list --state all --search "EEG manual depth patterns plan"` returns nothing. Nobody had
written this plan. The open and merged pieces this plan stands on or must not duplicate are listed in §1.3.

**Plain words.**
- **MANUAL / MODELED:** the two ways a patient runs. In MODELED the body sets every value from the drugs and the
  physiology. In MANUAL the instructor sets the values by hand to show one thing at a time.
- **Pattern:** a named EEG picture (for example "propofol, surgical alpha–delta"). Here a pattern is a **held set of
  the generator's own inputs**: the trace is still generated sample by sample from the seeded noise stream. It is never
  drawn or replayed from a picture.
- **Index:** the number a depth-of-anaesthesia monitor shows (the BIS-type index, State and Response Entropy, the
  present index `di`).
- **Reader:** the code that computes a monitor's numbers from the EEG trace (`l3/eeg-devices/`).
- **Hold:** a value the instructor has set that stays until he releases it.

---

## 0. What the owner asked, and what this plan settles

His words, which are the specification:
- "the depth of anesthesia and the eeg strip might be the parameter someone may want to set by hand on the manual mode.
  so they should be accessed from the vitals tabs IMO"
- "in the manual mode we can have the final BIS number settable by hand. and for EEG different patterns should be
  selectable by hand. like what we do with ECG rhythms"
- Asked whether a hand-set depth should also move the body (breathing, reflexes, pressure), he chose **the monitors
  only**: the hand-set values change what the monitors show and nothing else. The EEG plan's rule that nothing in the
  physiology reads the EEG cortex stands.
- In a MODELED run nothing is held by hand against the physiology (his ruling on question 7). There the row reads that
  it follows the drugs.

The working reading the orchestrator gave him, which he did not contradict:
- the pattern names come from the EEG plan's inventory, none invented;
- with a pattern chosen and no number set, the index is computed from the trace by the monitor's own reader;
- a number set by hand holds until released.

**The structure in one paragraph.** Two holds live in one new record on the engine's pipeline state, beside the MANUAL
targets and outside the EEG device's own state (§3.1). The **pattern hold** replaces only the EEG's *read* of its
inputs. The pipeline's `spectrumNow` takes the held input vector instead of `cortexInputsOf(bus, …)`, and the cortex
step, the spectrum, the generator and the artefacts run unchanged (§1). The **index hold** replaces only the value a
reader *publishes*, at the one place every display, alarm, trend, record and scenario rule takes it from. It sits
above all of them and below everything physiology reads (§2). Two new top-level commands carry the holds:
`setEegPattern` and `setEegIndex`. They are accepted only in MANUAL, logged, replayed by followers, in the snapshot,
and scriptable in a MANUAL card (§3). Entering MODELED returns both to the drugs (§4). The controls are a "Brain" group
in the Patient tool's "Vitals & rhythm" tab (§5). Six pieces build it (§6), and fourteen questions go to the owner
(§9).

---

## 1. The patterns

### 1.1 What a pattern is in the code

Today's EEG (`l2/eeg/pipeline.ts` `spectrumNow`, `advanceEeg`) does this every hop of the generator (1 s, half a
2-s block, `synth.ts` `BLOCK_S`):
1. `cortexInputsOf(bus, {ageY, stimulus, antinoc, do2Rel, tempC, macF})` maps the drug bus and the physiology to a
   `CortexInputs` vector (`types-eeg.ts`). The vector holds:
   - the hypnotic load per class (`hyp.gabaIv`, `barbiturate`, `etomidate`, `benzo`, `dissociative`, ng/mL
     propofol-equivalent);
   - `alpha2Eq`;
   - the volatile MAC fractions;
   - `opioidFentEq`;
   - `stimulus` and `antinoc`;
   - `do2Rel` and `tempC`;
   - `ageY`.
2. `cortexStep(prev, x, dt)` gives the `CortexState`: `hyper`, `lor`, `deep`, `suppressDrive`, `suppress`, `ketDepol`,
   the N2O transient, `opioid`, `arousal`, `metabolic` and `cold`.
3. `spectrumOf(cortex, agentMixOf(x))` gives the target spectrum.
4. `synthNext` draws the samples from `seedStream(seed, 'eeg')`.
5. `artefactSample` adds EMG, blinks, diathermy, mains, impedance noise and ECG pickup from
   `seedStream(seed, 'eeg-artefact')`.

**A pattern is a held `CortexInputs` vector.** When a pattern is held, step 1 returns the pattern's vector, with
`ageY` taken from the patient, instead of the drug bus's. Steps 2–5 are not touched. This is "a held state of the
generator's own mechanisms" in the most literal sense the code allows:
- the cortex still derives `deep`, `suppress`, the forme fruste and the N2O transient from the held inputs by its own
  sourced rules;
- the agent mix (`agentMixOf`) comes from the same vector. The prototype's problem, "a held depth with no drug running
  has no agent mix to shape the spectrum" (`scratch/207-notes.md`), does not arise: every pattern names its agent;
- the age terms (`ageFactors`) stay the patient's (C28);
- the N2O adaptation (`n2oRef`, τ 180 s) still runs, so the "N2O step" pattern shows its transient and then settles,
  as the mechanism says (C16).

**Why the inputs and not the state.** Holding the `CortexState` and the `AgentMix` directly was rejected:
- it would bypass `cortexStep`'s derivations, so `suppress` and `deep` could be set to a combination the cortex's own
  rules never produce;
- it would leave the N2O reference undefined;
- it would carry no age.

**Why only the EEG's read.** The clinical plan's ruling EQ11 = A makes a future brain state always-on and coupled to
the engine's physiology (`eeg-clinical-generator.md` §4.7, piece G2). If the hold were placed on that state, a
hand-set pattern would move the body, against the owner's "monitors only". The hold therefore forks **only the EEG
pipeline's read of the inputs**. G2 and later pieces must keep that fork: the brain state physiology reads is never the
held one. This is written into P1's must-not-touch list and into the clinical plan's note (P1 adds it).

**Body-side inputs under a held pattern.** A pattern's vector holds every input except `ageY`. That covers the drug
part, `stimulus` and `antinoc`, `do2Rel` and `tempC`, so what the screen shows is exactly what was chosen. A surgical
incision in a MANUAL run then does not raise beta on a held "surgical" pattern, and a real fall in brain O2 delivery
does not slow it. The artefact path stays live: EMG still reads the twitch T1, the tube and the held cortex's
`lor`/`arousal`, and diathermy, mains, impedance and ECG pickup act as now. This is the plan's proposal and **a
question for the owner (Q4)**; the alternatives keep the stimulus, or all body-side inputs, flowing through a held
pattern.

**Onset.** `setRhythm` has no ramp. `setEegPattern` has none either: a new pattern takes effect at the generator's
next hop (≤ 1 s). The existing per-hop gain smoothing (`synth.ts`, "a new hop's gains reach the trace without a step")
and the overlap-add of the blocks carry the change without a step. A gradual onset (interpolating the input vector)
would be an engineering choice with no source. It is put to the owner as Q8, not built.

### 1.2 The pattern list

Placement rule: each pattern sits **at an anchor the generator already has**, so no new number is introduced. Each
anchor is named by its constant in `l2/eeg/state.ts` or `spectra.ts` and keeps that constant's own tag (`[TXT]`,
`[INF]` or `[FIT]`). Where the anchor itself is `[FIT]` or `[INF]`, the pattern inherits that tag and says so.
Concentrations are computed from the anchors for the patient's age with `ce50Propofol(age)` and `locPropofol(age)`
(`l2/neuro/depth.ts`), `MAC_AWAKE` (`l2/pk/volatile.ts`) and `DEXMED_EEG_C50_NG_ML` (`l2/pk/combine.ts`). The source
and cell columns use the stage plan's acceptance cells C1–C35 (`stage-eeg-depth-of-anaesthesia.md` §7.2) and the
clinical plan's inventory U1–U41 (`eeg-clinical-generator.md` §1.5).

"Producible today" means the generator on 45dc8511 produces the pattern's described features, as the cited cell's
test shows. The column names the test, or says the course is generated but not yet tested (P1 then adds the test).
The misses recorded on 12 November (stage plan §7.2 note; N139, N140) qualify some rows and are written beside them.

#### Producible today

| Id (label on the picker) | Agent group | Held inputs (all others 0; `ageY` the patient's) | What must be seen, source | Today |
|---|---|---|---|---|
| `awake` (Awake) | No drug | nothing; stimulus 0 | RMS ≈ 5–10 µV, beta base, blinks (C1; Ch36 p. 1138; Ch35 p. 1104) | produced (`eeg-signal.test.ts`). **Note N140:** the blinks dominate the low-frequency power, so the Entropy reader reads awake SE 69, not above 80 (PR 433) |
| `propofol-sedation` (Sedation, beta) | Propofol | `hyp.gabaIv` at `lor` = 0.6: the generator's sedation-beta peak (`BETA_SED_RISE_DB`, "peaking at lor 0.6" **[FIT]**) | beta ↑ 15–25 Hz before loss of response (C2; Ch36 p. 1138) | produced (BIS-type course "sedation" state, `eeg-bis-course.test.ts`) |
| `propofol-lor` (Loss of responsiveness, frontal alpha) | Propofol | `hyp.gabaIv` at `lor` = 1: the class's own LOR point (`locPropofol(age)`) | frontal alpha 8–12 Hz appears (C3; Ch36 p. 1138; Ch35 p. 1106) | produced (course "loss of responsiveness"). Anteriorisation (C32) needs four channels: waits for E10/G5 |
| `propofol-surgical` (Surgical, alpha–delta) | Propofol | `hyp.gabaIv` at `hyper` = 1 (`SLOW_GA_HYPER`, "the propofol BIS-50 Ce50" **[INF]**) | slow-delta + alpha, beta and gamma ↓, alpha ≥ 10 Hz (C4, C7; Ch36 pp. 1139, 1143, 1145) | produced. BIS-type reads 51.1 at the course's surgical state (PR 437, C27 inside 40–60) |
| `propofol-forme-fruste` (Before burst suppression, forme fruste) | Propofol | `hyp.gabaIv` at `suppressDrive` midway between `FORME_FRUSTE_ON` (0.85) and 1 (**[FIT]** both: spectra.ts) | > 2 Hz drop-outs with sustained 0.5–2 Hz (C10; Ch36 pp. 1139–1141) | generated; no course test at this point: P1 adds one |
| `propofol-burst-suppression` (Burst suppression) | Propofol | `hyp.gabaIv` placing `suppress` at the chosen fraction on the generator's own `suppressionCurve` (option `suppressedPct`, default 50 % = `SUPP_ESTABLISHED` **[FIT]**). Onset anchor CP50_BS 4.9 µg/mL (`BS_ONSET_PROP_NG_ML`, Pilge 2014, Ch36 p. 1141) | suppressed stretches < 5 µV, lengthening with dose (C8, C10; Ch36 pp. 1139–1141); 50–80 % when targeted (C25, U4; Ch35 p. 1106) | produced (course "burst suppression"; C29 noisy BS) |
| `propofol-isoelectric` (Isoelectric) | Propofol | `hyp.gabaIv` at `suppress` = 1 (`BS_ISOELECTRIC_MAC` 2.5 MAC-eq **[FIT]**) | silence (C10; Ch36 p. 1141) | generated; P1 adds the test |
| `volatile-sedation` | Volatile (option `agent`: sevoflurane, isoflurane, desflurane; default sevoflurane) | MAC at `lor` = 0.6 (`MAC_AWAKE` units) | as C2, "common to all ethers" (Ch36 p. 1143) **[INF]** | generated; P1 adds the test |
| `volatile-lor` | Volatile | MAC at `lor` = 1 (`MAC_AWAKE`) | frontal alpha (C3) | generated; P1 adds the test |
| `volatile-surgical` (Surgical, alpha + theta) | Volatile | 1 MAC (`hyper` = 1) | alpha ≈ 10 Hz with theta ≈ 4.9 Hz (Ch36 p. 1143; Akeju 2014 via `THETA_HZ`) | produced (`eeg-signal.test.ts` sevoflurane rows) |
| `volatile-alpha-to-delta` (Deep, alpha-to-delta shift) | Volatile | MAC at `deep` = `DEEP_SPAN_MAC` past `DEEP_ONSET` (0.944 MAC, Ch36 p. 1143 ÷ Mapleson 1996 **[INF]**; span **[FIT]**) | > 20 Hz lost; alpha ≈ 10 → 7–8 Hz and fades (C6; Ch36 pp. 1142–1143, Fig. 36.7) | produced (C6 test) |
| `volatile-burst-suppression` | Volatile | MAC placing `suppress` at `suppressedPct` on `suppressionCurve` with the agent's onset (`BS_ONSET_SEVO_MAC` 1.4, `_ISO_` 1.3, `_DES_` 1.25: Pilge 2014; Rampil 1991 **[INF]**) | C9, C10 (Ch36 p. 1141; Ch35 Table 35.1) | produced (C9 direction). The onset itself is `[OWNER P-1]` |
| `volatile-isoelectric` | Volatile | `BS_ISOELECTRIC_MAC` 2.5 **[FIT]** | silence | generated; P1 adds the test |
| `ketamine-adjunct` (Ketamine on a volatile) | Ketamine | `hyp.dissociative` at `ketDepol` = `KET_SAT` (0.3, "the 25–50 mg adjunct range" **[FIT]**) on sevoflurane 0.7 MAC (the cell's own context) | alpha ↓, every index ↑ or unchanged ("spurious elevation") (C14; Ch36 p. 1144, Fig. 36.8) | produced (C14 test) |
| `ketamine-alone` (Ketamine, hypnotic dose) | Ketamine | `ketDepol` = 1 (ketamine-alone LOR) | large slow waves with gamma bursts, no suppression (C15; Ch36 p. 1144; Ch35 Table 35.1) | produced (C15 test) |
| `opioid-alone` (High-dose opioid alone) | Opioid-heavy | `opioidFentEq` at `opioid` = 2 (16 ng/mL; `OPIOID_DELTA_DB` is defined "at opioid 2"; threshold 8 ng/mL `OPIOID_EEG_FENT_NG_ML`, Ch36 p. 1144) | delta ↑, median frequency ↓, never suppression (C11; Ch36 p. 1144; Ch35 pp. 1106–1107) | produced (C11 test) |
| `opioid-with-hypnotic` (Hypnotic with opioid) | Opioid-heavy | `propofol-surgical`'s vector + `opioidFentEq` > 4 ng/mL (C13's threshold) | little change from the hypnotic alone (C12; Ch36 p. 1145) | produced (C12 test) |
| `light-arousal` (Light anaesthesia, noxious arousal) | Propofol | `propofol-lor`'s vector + `stimulus` = 1, `antinoc` = 0, opioid 0 | beta arousal and alpha drop-out (C13; Ch36 pp. 1141, 1145) | produced (C13 test). **Note N139** (arousal blunted under remifentanil) concerns the drug path, not a held vector. This row needs Q4 = A or C |
| `n2o-steady` (Nitrous oxide alone) | Nitrous oxide | N2O 0.6 MAC (`N2O_FAST_DB` is defined "at 0.6 MAC" **[FIT]**), held long enough that `n2oRef` has adapted | minimal change, frontal fast activity > 30 Hz (C16; Ch36 p. 1144; Ch35 Table 35.1) | produced (C16 test) |
| `n2o-step` (Nitrous oxide switched on) | Nitrous oxide | N2O 0 → 0.6 MAC at the moment of choosing; the cortex's own `n2oRef` then adapts (τ `N2O_TRANSIENT_TAU_S` 180 s, Pavone 2016) | a large short-lived delta transient with alpha loss, no suppression (C16) | produced (C16 transient test) |
| `dexmedetomidine` (Dexmedetomidine, spindles) | Dexmedetomidine | `alpha2Eq` at the LOR anchor `DEXMED_LOR_NG_ML` 2.09 ng/mL (Ch36 p. 1144, Fig. 36.9, one patient) | alpha–delta with ≈ 12–13 Hz spindle bursts, no suppression (C17) | produced (C17 test). Dexmedetomidine's potency is `[OWNER P-12]` (Q11) |
| `benzodiazepine` (Benzodiazepine sedation, beta) | Benzodiazepine | `hyp.benzo` at `lor` = 0.6 | "mainly increased beta" (Ch36 p. 1144) | generated (`BETA_SED_RISE_DB` benzo share); P1 adds the test |
| `barbiturate-*` (four rows: fast beta, frontal alpha-frequency spindles, diffuse delta, burst suppression) | Barbiturate / etomidate (option `agent`) | `hyp.barbiturate` or `hyp.etomidate` at `lor` 0.6 / `lor` 1 / `hyper` 1 / `suppressedPct` | Table 35.1's sequence (Ch35 p. 1107; clinical plan §1.2) | generated by the class shares; **no cell tests the barbiturate course**. P1 adds direction tests, and a row whose test fails moves to the waiting list |
| `ischaemic-slowing` (Ischaemia: slowing, voltage kept) | Brain supply | `do2Rel` at `metabolic` = `METABOLIC_SLOW_SHARE` (0.5 **[FIT]**) between `DO2_EEG_ABNORMAL` 20/50 and `DO2_EEG_LOST` 12/50 (Ch35 p. 1122); drugs 0 | slowing with preserved voltage (C34; Ch35 pp. 1105, 1122) | produced (C34 test) |
| `ischaemic-loss` (Ischaemia: loss of voltage) | Brain supply | `do2Rel` = `DO2_EEG_LOST` | voltage lost (C34) | produced |
| `hypothermic-slowing` (Hypothermia: slowing) | Temperature | `tempC` midway between `COLD_SLOW_FROM_C` 37 **[FIT]** and `BS_TEMP_ONSET_C` 24.4 (Stecker 2001) | progressive slowing (C35; Ch35 p. 1127) | produced (C35 test) |
| `hypothermic-burst-suppression` | Temperature | `tempC` between 24.4 and `BS_TEMP_SILENT_C` 17.8 (Stecker 2001) | burst suppression (U17) | produced |
| `hypothermic-silence` (Hypothermia: silence; DHCA) | Temperature | `tempC` ≤ 17.8 | complete suppression at 15–18 °C (C35; U17, Ch35 p. 1127, p. 2314) | produced |

Notes on the list:
- **Three isoelectric rows, one EEG.** Drug, ischaemic and hypothermic silence look alike on the trace. They differ in
  their cause and, later, in the evoked potentials (clinical plan U5). They are listed under their cause and never
  labelled "brain death" (below).
- **The agent is chosen by the group.** The picker is grouped by agent as the rhythm picker is grouped by origin
  (`apps/demo/src/app/rhythms.ts` `RHYTHM_GROUPS`). The volatile and barbiturate/etomidate groups take an `agent`
  option on the command, as `setRhythm` takes `opts`. A pattern that does not exist for an agent is not offered: there
  is no ketamine or dexmedetomidine burst suppression (C15, C17) and no opioid loss of responsiveness (C11).
- **The burst-suppression fraction** is an option (`suppressedPct`, 5–100 %). The same curve the drug path uses turns
  it into the held input. Its shape between the sourced anchors is the generator's own `[FIT]` (research/43 P-1), so
  the fraction the reader then measures can differ from the one asked for. The reader's SR is what the screen shows
  (§2.4).
- **Emergence (U38)** is a course, not a state: it is shown by stepping the patterns back up the list. A held vector
  cannot show neural inertia, and today's cortex has none ("neural inertia none", `state.ts` header).

#### Waiting for their EEG piece (named in the inventory; not producible by today's generator)

These are listed so that the picker can show them later without a redesign. **None is approximated.** Each enters the
pattern table when its piece merges, as a held input of that piece's own mechanism. The P1 test "every pattern id is
producible" keeps them out until then.

| Pattern (inventory name) | Inventory row | Why not today (clinical plan §2) | Waits for |
|---|---|---|---|
| Focal seizure: onset, evolution, spread, end, post-ictal state | U2, P5, P7 | phase-coherent dynamics; one channel | G7a (and G5 for spread) |
| Generalised spike-and-wave | U2, P4, U34 (MERRF) | phase-coherent transient: "cannot in principle" | G7b |
| Status epilepticus under treatment; burst suppression under treatment; highly epileptiform bursts | U2, U4, P8 | as above | G7c |
| Periodic discharges (GPD, LPD, BIPD), rhythmic delta, the ictal–interictal continuum | U2, P6 | as above; definitions `[WANTED: Hirsch 2021]` | G7d, G0b |
| Convulsive seizure with its muscle; masked by paralysis | P9 | needs a convulsion's muscle drive | G7d |
| Epileptiform spikes under sevoflurane, etomidate or hypocapnia | U25 (EQ17), Ch36 p. 1143 | spikes are phase-coherent | G7a/G7b, EQ17 |
| ECT seizure; afterdischarges in cortical mapping | U18, U19 | needs a stimulus input | G7e |
| Sleep stages W, N1, N2 (spindles, K-complexes), N3, R; vertex and sawtooth waves | U3, P10, P11, P13 | K-complexes and vertex waves are phase-coherent; no sleep state | G6a (blocked on G0b's sleep section) |
| The night's architecture | P12 | no sleep state | G6b |
| Post-anoxic α-coma, low-voltage delta, EEG reactivity | U6 | the six post-anoxic categories need G4's metabolic variable and the injury state | G4, I1a |
| Electrocerebral inactivity of brain death | U5 | an isoelectric trace is producible (rows above), but brain death is not an EEG pattern alone: it differs from drug silence in the evoked responses (Ch35 p. 1113) | BD1 (waits for EQ20) |
| Hypoglycaemic slowing, then suppression | U7 | glucose is not a cortex input today | G4b |
| Hypercapnic encephalopathy | U8 | PaCO2 reaches the EEG only through CBF; the direct effect `[WANTED]` | G4b |
| Hepatic encephalopathy, triphasic waves; drug-toxic GPDs (cefepime) | U9, U10, U11 | no ammonia variable, no cefepime row, no periodic mechanism | X0–X2, X4 |
| Uraemic and septic encephalopathy | U12, U13 | uraemic: a physiological basis but no EEG model; septic: open gap (§3.9) | X0′, X3 |
| Focal asymmetry: tumour, stroke, carotid clamping, delayed cerebral ischaemia | U14, U15, U16 | one channel, one global CBF | V0, F1, G5 |
| Frontal anteriorisation; eyes-closed posterior alpha | C32, P2 | one frontal channel | E10, G5 |
| Infant and neonatal EEG | U25 (EQ17) | the depth plan's §9 exclusion, now a question | EQ17 |

---

## 2. The hand-set index

### 2.1 The depth monitors the simulator has or plans

| Monitor | Where | Its index ids | State on 45dc8511 |
|---|---|---|---|
| The present depth index ("BFA" module) | `l2/neuro/depth.ts`, published by `l2/neuro/pipeline.ts` `emitSecond` at 1 Hz while `device depth on` | `di`, `sr` | built; physiology reads its raw value `diRaw` (`l2/neuro/outputs.ts`, `drive.ts`, `pipeline.ts`: stage plan D7) |
| Generic processed-EEG reader | `l3/eeg-devices/generic.ts` | `sef`, `mf`, `eegSr` (no index) | built (E5) |
| BIS-type reader | `l3/eeg-devices/bis-type.ts` (PR 427) | `bis`, `bisSr`, `bisBeta`, `bisConc`, `bisLowMid` | built (E7), C27 inside 40–60 since PR 437 |
| Entropy reader | `l3/eeg-devices/entropy.ts` on `origin/eeg-e8-entropy-reader` (PR 433) | `se`, `re`, `reSe` | **open, not accepted** (N138) |
| Patient State Index reader | E11 | `psi` (stage plan D6) | not built (P-19; research PR 452 open) |
| Narcotrend | E9 | — | **not built** (owner, 12 Nov) |

The bedside tile reads them through `packages/renderer/src/numerics-neuro.ts` `bfaReading`. The chosen EEG reader's
index wins; otherwise the present index's `di`/`sr` is shown.

### 2.2 Which number is set, and whether one value serves all

**Proposal: each index has its own hold, declared by its reader.** The scales differ:
- the BIS-type index is 0–100 (the reader's mixer output, Connor 2022 Table 1);
- the module's SE tops out at 91 and RE at 100 (Viertiö-Oja 2004 p. 159, as `entropy.ts` reads it);
- the present index's formula tops out at 93 (`DI = 93·(1 − …)`, `depth.ts`).

Mapping one number onto three scales would be an invented conversion. So:
- each reader's spec row (`EegDeviceSpec`, `l3/eeg-devices/registry.ts`) gains `settable: [{ id, min, max, tag }]`,
  with its range sourced as above. The present index declares its own beside `depth.ts`;
- the BIS-type reader declares `bis` (0–100);
- the Entropy reader, when PR 433 merges, declares `se` and `re` **as a pair**: both or neither, with RE ≥ SE enforced,
  and `reSe` published as held RE − held SE. RE − SE is the module's EMG indicator (p. 158), so a held pair must not
  publish an impossible EMG;
- the PSI reader declares `psi` when E11 is built;
- the generic reader declares none: SEF and MF are spectral measurements of the trace, not an index. Choosing a
  pattern moves them.

The row shows the stepper(s) of the reader currently chosen in the room. A value held for a reader that is not chosen
stays held (it lives in the engine's record, §3.1) and shows again when that reader is chosen. The alternative, one
value for all, is put to the owner as **Q1**.

**The present index `di`.** The department's BFA tile shows `di` when no EEG reader is in the room. Holding it would
change only its published value, never `diRaw`, which the ventilatory drive, the CMRO2 and the awareness flag read
(D7). Proposal: settable, published only. **Q6.**

### 2.3 The monitor's smoothing and delay

**None of the readers has an index-level smoother into which a number could be inserted.**
- The BIS-type reader averages its components over 30 s and its suppression over 63 s (Connor 2022 Table 1 ll. 13,
  28) before the mixer.
- The Entropy reader reads each frequency from its own window, 1.92–60 s (Viertiö-Oja 2004 p. 155).
- Their delay lies in the spectra, not after the index.

A hand-set number is not a spectrum, so it cannot pass through either.

Proposal: the held value is published directly, moving to its new value with the **MANUAL onset the instructor picks
for every row** (the Vitals sheet's onset select, `setTarget`'s `ramp`: linear, exp or sigmoid over `durationS`). It is
evaluated at each reading's own time stamp, so it keeps the reader's update rate: 0.5 s for BIS-type, 0.64 s for
Entropy, 1 s for `di`. The present index has a display smoother of its own (`smoothDi`, τ 20 s, `depth.ts:127`).
Proposal: it is not applied to a held `di` either, so all held numbers behave alike. Both are choices marked here,
put to the owner as **Q2**. No new time constant is introduced.

### 2.4 What the monitor shows beside a held number

Everything beside the index still comes **from the trace**: the trace follows the chosen pattern, or the drugs when no
pattern is held.
- The BIS-type `bisSr` and its three components (`bisBeta`, `bisConc`, `bisLowMid`).
- The generic `sef`, `mf`, `eegSr`; the present index's `sr`.
- The bands, the raw trace and the density spectral array (`eegReading`).
- The impedance `eegImp` and the device flags (questionable, invalid).

The Saadat-like skin's SQI% and EMG% stay blank: no reader computes them (stage plan anti-goal; P-16, P-20). Nothing
is drawn that no reader computes, apart from the held index itself.

**Flags, run-in, invalid epochs.** Proposal: the hold replaces the reader's **value only where the reader publishes a
number**, and its flag passes through unchanged. So:
- during a reader's run-in (BIS-type's 30-s windows, Entropy's 60 s) the screen stays blank as the real monitor would;
- on an epoch the reader marks invalid (an electrode off, diathermy) the held number is not shown;
- a questionable epoch is shown questionable.

The present index is `null` and questionable while the patient is stimulated and unparalysed (`depth.ts`); a held
`di` follows the same rule. This keeps the signal-quality picture coming from the trace. It is a choice: **Q7**.

### 2.5 When the held number and the chosen pattern disagree

A held BIS-type 45 over an `awake` pattern, or over a 60 % burst suppression whose SR reads 60, is a combination no
real monitor produces. Proposal:
- **The bedside screen shows what was set**, as MANUAL means "every value is what you set" (`panel/vitals.ts` mode
  note).
- **The Instructor's row shows what the trace reads**: "Trace reads 22". The reader keeps computing its own index from
  the trace while a hold is on, and the engine reports it to the instructor (§3.2, `brain.reads`).
- No threshold is invented for when the two disagree. The instructor sees both numbers side by side and decides.

The alternatives are put to the owner as **Q3**: a warning line, or refusing combinations.

---

## 3. The commands and where the held values live

### 3.1 The held record

A new field on the engine's `PipelineState` (`engine.ts`, beside `l1`, `rhythm`, `eeg`), outside `ps.eeg`:

```
brainHold?: {
  pattern: { id: EegPatternId; opts: EegPatternOpts; at: number } | null;
  index: Partial<Record<HeldIndexId, { from: number; to: number; t0: number; ramp?: Ramp }>>;
}
```

- **It survives the EEG device being switched off and on.** `device eeg off` deletes `ps.eeg` (`engine.ts`
  `applyEeg`), never `brainHold`. On `device eeg on`, `createEegState` reads the held pattern, so the first block after
  switch-on is the pattern's, not the drugs'. `device depth off/on` likewise keeps a held `di`. This keeps stage plan
  D4: the EEG still runs only while a device is on. Only the instructor's setting outlives the device.
- **Snapshot, bookmarks, restore.** `PipelineState` is plain JSON-safe data, snapshotted through
  `snapshot-codec.ts` and cloned for bookmarks. `brainHold` is carried without codec changes; a test proves it (P1). An
  older snapshot has no field, which means nothing is held; the engine version key already guards cross-build
  restores.
- **Absent unless used.** An engine that never receives a hold carries no field and computes exactly what it computes
  today. Every existing golden is unchanged.

### 3.2 The commands

Two new top-level command types, like `setRhythm` (`types.ts` `Command`). They are not `setTarget`/`pin` on new
`StateVar` names, and not `device eeg …` actions, because:
- `StateVar` also reaches `pin`, `release 'all'`, `PatientProfile.baseline`, the scenario `DocCommand` and the L1
  target path. Each of these is a way a MODELED hold or a body effect could start, and each would need its own
  refusal;
- a `device …` action is censused only as `'device'` (`protocol.ts` `commandShape`), so the allow-list could not see
  it, and EEG device actions are refused while the EEG is off (`validateEegCommand`), which the hold must not be.

The row is still "built like the other rows": same stepper widget, chip and onset.

```
{ type: 'setEegPattern'; pattern: EegPatternId | 'drugs'; opts?: { agent?: string; suppressedPct?: number } }
{ type: 'setEegIndex';   id: HeldIndexId; value: number | null; ramp?: Ramp }   // null: release, back to the reader
```

- **MANUAL only, checked at apply time.** `validate` refuses both while the mode *when the command applies* is
  MODELED: "MODELED: the EEG and the index follow the drugs". That means a `setMode` still queued counts, as
  `eegOnWhenApplied()` does for `device eeg on/off` (`engine.ts`). A command that was valid when queued but finds
  MODELED on apply is dropped, with a reason in the ack.
- **Validation.**
  - `pattern` must be in the pattern table (`l2/eeg/patterns.ts`, new) or be `'drugs'`.
  - `opts.agent` must be in that pattern's group.
  - `suppressedPct` must be 5–100 and only on a burst-suppression row.
  - `id` must be a `settable` id of a registered reader (any, not only the chosen one).
  - `value` must be inside that id's range; for the Entropy pair, RE ≥ SE against the other held value.
  - `ramp` is checked by `rampReason`, as `setTarget`'s.
- **Release.** `setEegPattern 'drugs'` returns the trace to the drugs; `setEegIndex value: null` returns the index to
  the reader.
- **The state event** (`types-hemo.ts` `state`) gains a `brain` block:
  `{ pattern: id | null, opts, held: Partial<Record<HeldIndexId, number>>, reads: Partial<Record<HeldIndexId, number | null>> }`.
  `reads` is the reader's own value for each held id, for the instructor's "Trace reads N". Like `signals`, it is
  exposure only.
- **An engine event on every change:** `{ type: 'brainHold', t, pattern, held, cause: 'command' | 'modeled' }`, so the
  log, the record and the Debrief see a release caused by entering MODELED, which no command states.

### 3.3 Followers, logs, the Debrief

- **Followers** apply the same commands at the same ticks. Two things make their samples and numbers identical to the
  host's. First, the held vector is a pure function of the pattern, the options and the patient's age. Second, the
  generator still draws from `seedStream(seed, 'eeg')` and the artefacts from `'eeg-artefact'`. No new random stream
  is added: a pattern change changes the target spectrum, never the number of draws per block, so no other stream
  shifts. A follower joining late restores `brainHold` from the snapshot, with the snapshot's seed since PR 445 (N109).
  `controller-session.ts` tracks the host's pattern as it tracks `this.rhythm` (from applied commands and from the
  `state` event's `brain` block).
- **Logs.**
  - Engine `l3/trends/event-log.ts` `describe`: new kind `'eeg'`, "EEG pattern propofol-surgical", "BIS-type index →
    45 over 30 s", "EEG back to the drugs (MODELED)".
  - Controller `describe` (`controller-session.ts`).
  - App `describe.ts` `describeCommand`: "EEG: Propofol, surgical alpha–delta", "BIS-type index 45".
- **The Debrief** reads the record (`apps/demo/src/app/record.ts`), which keeps "every command applied" as action rows
  through `describeCommand`. The new lines therefore reach the Debrief as the instructor's settings, beside "Rhythm:
  Coarse VF". P3 adds the record row for the `brainHold` event with `cause: 'modeled'`.

### 3.4 The allow-list and its census

`INSTRUCTOR_COMMANDS` (`packages/controller/src/protocol.ts`) gains `'setEegPattern'` and `'setEegIndex'`. The census
test (`apps/demo/src/app/teach2/census.dom.test.ts`) measures what the laptop sends. It must find both once the Brain
group exists (P4), and `packages/controller/test/protocol.test.ts` pins the set. A granted instructor's phone may then
send them too, since the allow-list is one for both. No phone control is built here (Q13).

### 3.5 The scenario format and the builder

Today a card may set a rhythm in a state's `onEnter` (`packages/controller/src/scenario/types.ts` `DocCommand`) and in
its patient (`p.rhythm`, `runner.ts`, `phase-runner.ts`). A card also has a `mode` (`types.ts:180`). His analogy ("like
what we do with ECG rhythms") reads as: **a MANUAL card may choose a pattern and set the index as it may a rhythm.**
- `DocCommand` gains `setEegPattern` and `setEegIndex`.
- `validate.ts` warns on an unknown pattern, as it does for an unknown rhythm. It reports an **error** for either
  command in a card whose `mode` is MODELED, or in a state reached after a scripted `setMode modeled`.
- The builder's Script (`apps/demo/src/app/builder/script-commands.ts`) offers "EEG pattern" and "Depth index" only on
  a MANUAL card.

This **amends** the clinical plan's §6.4 ("Scenario event kinds added (each a cause, never a pattern)"). That rule
stands for MODELED cards, where the EEG must come from a cause. A MANUAL card is the instructor's hand, scripted. It is
not clear from the code which the owner means, so it is **Q5**.

---

## 4. Switching between MANUAL and MODELED, and restarting

| Event | What happens | Reason |
|---|---|---|
| MANUAL → MODELED (`setMode modeled`) | both holds are cleared at apply; the trace and the index follow the drugs at the next hop and reading; a `brainHold` event with `cause: 'modeled'`; the row shows "Follows the drugs" | his ruling on question 7: nothing is held against the physiology in MODELED. The engine already hands a MANUAL rate to the reflex on entering MODELED (`engine.ts` FX-10) |
| MODELED → MANUAL | nothing is held; the rows seed from the live values (the pattern picker shows "Follow the drugs", the stepper the reader's current index), as every Vitals row seeds from the first `state` | MANUAL starts from where the patient is |
| `device eeg off` / `on`, `device eeg model …` | holds kept (§3.1); a held index for a reader not chosen waits | brief: "outside the EEG device's own state" |
| Bookmark return, reload of the page (position restore) | the snapshot's `brainHold` comes back with it | the snapshot is the patient |
| "Restart patient" (`session.ts` `restartPatient`) | a new engine: nothing is held. A running case starts again from 0:00 and its script applies its own `setEegPattern` again, as it does a rhythm | a restart is a new body (`restart`) |
| "Save and restart the case" (`RoomKeep`) | not kept: `RoomKeep` keeps probes and the cuff's cycling, not instructor values | as a held heart rate is not kept |

---

## 5. The controls: a "Brain" group in "Vitals & rhythm"

Brief 208 builds one "Patient" tool whose first tab is "Vitals & rhythm" (`panel/vitals.ts` `vitalsTab`). This plan
adds a group there and does not redesign the dock or the sheet.

**The "Brain" group**, after the rhythm picker and before "Rate and pressures". English only on every face and
control.
- **The pattern picker**, built like the rhythm picker (`vitalsTab`'s `rsel`):
  - a `<select>` with one `<optgroup>` per agent group of §1.2 (No drug, Propofol, Volatile, Ketamine, Opioid-heavy,
    Nitrous oxide, Dexmedetomidine, Benzodiazepine, Barbiturate / etomidate, Brain supply, Temperature);
  - first option "Follow the drugs";
  - an agent select only for the Volatile and Barbiturate / etomidate groups, and a "Suppressed %" stepper only on a
    burst-suppression row;
  - a "Stage" button that stages `setEegPattern` through the same staging tray (`staging.submit`, key `eeg-pattern`).
  The labels come from a list in the app, `apps/demo/src/app/eeg-patterns.ts`, built as `rhythms.ts` is: groups over
  the engine's exported `EEG_PATTERN_IDS`, with an id the map does not know placed in "Other".
- **One index row per settable id of the chosen reader** (BIS-type: one row; Entropy: SE and RE rows with RE ≥ SE),
  built like the other rows:
  - the glossary label, the live value, a `stepper`, "Set" (stages `setEegIndex` with the onset chosen below) and
    "Return to the reader" (stages `value: null`);
  - the chip "Held" while held;
  - the line "Trace reads N" from `state.brain.reads` while held.
  With no EEG reader in the room and `device depth on`, the row is the present index's `di`.
- **With no depth monitor in the room**, the group shows its pattern picker and the line "No EEG monitor in the room:
  the setting shows when one is switched on" (Q9).
- **In MODELED** the group shows the live pattern state and index and the line "Follows the drugs: change it with the
  drugs, or switch to MANUAL". There is no picker, no stepper, no "Set", no "Return". This is brief 208's rule 5 for
  model-computed rows.

---

## 6. The pieces

Every engine piece carries the tests the engine's rules require:
- a snapshot round trip (`engine-snapshot-codec.test.ts`, `engine-snapshot-replay.test.ts`);
- follower replay: a host and a follower with the same seed and commands give identical EEG samples and numerics,
  including a follower that joins from a snapshot taken while a hold is on;
- named random streams: no new stream; the `'eeg'` and `'eeg-artefact'` draws per block are unchanged by a pattern;
- the existing goldens unchanged (E0 `eeg-baseline.test.ts`, the readers' course tests, `docs/validation/known-misses.md`
  regenerated unchanged), unless the piece names the change.

Each piece is one PR: tests first (a failing test committed before the code), the common gate, the generated docs
pages regenerated in CI's order with `docs/model` last. Hours are in the stage plan's form.

### P1: The pattern hold in the engine (plan 12 h · 1.5–2.0 executor-h) — `run-validation`

- **Purpose:** §1 and §3.1–3.2 for the pattern: the pattern table, the held record, `setEegPattern`, MANUAL-only at
  apply, switch-on from the hold, the `brainHold` event, the engine log line, the `brain` block's `pattern` field.
- **Depends on:** nothing that is open.
- **Files:**
  - `packages/engine-core/src/l2/eeg/patterns.ts` (new: ids, groups, each id's held `CortexInputs` as a function of
    age and options, built only from the named constants);
  - `l2/eeg/pipeline.ts` (`spectrumNow` and `createEegState` take an optional held vector);
  - `engine.ts` (the field, validate, apply, `modeWhenApplied`, the clear on `setMode modeled`, the event);
  - `types.ts`, `types-eeg.ts`, `types-hemo.ts` (the `brain` block);
  - `l3/trends/event-log.ts`;
  - `index.ts` (export `EEG_PATTERN_IDS`, groups).
- **Tests first:**
  1. **Identity (the defining test).** At the pipeline level, `advanceEeg` with a context whose `cortexInputsOf`
     yields vector X and with X held gives sample-identical traces from the same seed. So a pattern *is* the
     generator's own state, not a drawing.
  2. **Every producible pattern shows its row's features.** Each pattern is tested by the cell named in §1.2's table,
     reusing the cell tests' measurements (`eeg-signal.test.ts`). The barbiturate, forme-fruste, isoelectric,
     benzodiazepine and volatile-sedation/LOR rows get new direction tests. A row whose test fails moves to the
     waiting list in this plan; nothing is tuned.
  3. **D7: monitors only.** A 10-minute MANUAL run with drugs, once without a hold and once with `propofol-isoelectric`
     held, leaves every physiology output identical to the bit: the E0 baseline's outputs, `diRaw`, the drive and
     CMRO2.
  4. Refused in MODELED; refused when a queued `setMode modeled` comes first; accepted after a queued `setMode manual`.
  5. `device eeg off` then `on`: the first block after switch-on is the pattern's (spectrum equal to the held
     vector's).
  6. `setMode modeled` clears the hold, emits `brainHold` with `cause: 'modeled'`, and the next hop follows the drugs.
  7. Snapshot round trip and bookmark restore with a hold; an older snapshot without the field restores with nothing
     held.
  8. Follower identity, including a late join from a snapshot.
  9. Streams: the count of `'eeg'` draws per block is the same for every pattern.
  10. Goldens: unchanged with no hold.
- **Must not touch:**
  - `l2/eeg/state.ts` `cortexStep` and `spectra.ts` `spectrumOf` (no constant moves);
  - `synth.ts`, `artefacts.ts`;
  - `l2/neuro/*` (D7);
  - the readers;
  - any brain state physiology reads (EQ11's G2: the hold forks only the EEG's read).
- **Also:** add a dated note to `eeg-clinical-generator.md` §4.7 (the fork rule) and to the stage plan (the MANUAL
  amendment of "no number the reader did not compute").
- **Gate:** common, plus the validation run read to its conclusion.

### P2: The index hold in the engine (plan 10 h · 1.3–1.7 executor-h) — `run-validation`

- **Purpose:** §2 and §3.2 for the index: `setEegIndex`, the readers' `settable` declarations, publication of the held
  value, the `brain` block's `held` and `reads`.
- **Depends on:** P1 (the record, the mode check, the event).
- **Files:**
  - `l3/eeg-devices/registry.ts`, `bis-type.ts`, `generic.ts` (`settable` rows: BIS-type `bis` 0–100; generic none);
  - `engine.ts` `readEeg` (the one place EEG numerics become `measurement` events: the held value replaces a non-null
    reading, the flag passes through, the ramp is evaluated at the reading's `t`);
  - `l2/neuro/pipeline.ts` `emitSecond` (`di` only, at publication; `diRaw` and `d.*` untouched; Q6's default);
  - `types-eeg.ts`.
- **Tests first:**
  1. A held `bis` reaches every consumer: the `measurement` event, the renderer's `bfaReading`, the trend the record
     keeps, a scenario rule on `bis` (`scenario/driver.ts` reads measurements).
  2. **Nothing physiology reads moves:** test 3 of P1 repeated with `bis` and `di` held at 5 and at 95.
  3. Run-in and invalid epochs: blank stays blank (null), and invalid stays invalid; questionable passes through.
  4. The ramp at the reader's own cadence (0.5 s; 1 s for `di`); release returns the reader's value at the next
     reading.
  5. `reads` equals the reader's own computed value while held.
  6. Refused in MODELED; cleared on entering MODELED; kept across `device eeg off/on` and a model change.
  7. Snapshot, follower and goldens as every piece.
- **Must not touch:** the readers' algorithms and constants; `depth.ts` (`smoothDi`, the formula); `outputs.ts`,
  `drive.ts`.
- **Gate:** common, plus validation.

### P2b: The Entropy pair (plan 4 h · 0.5–0.7 executor-h) — `run-validation`

- **Purpose:** `se` and `re` settable as a pair (RE ≥ SE, SE 0–91, RE 0–100, Viertiö-Oja 2004 p. 159), with `reSe`
  published as their difference.
- **Depends on:** PR 433 merged (held today, N138) and P2.
- **Files:** `l3/eeg-devices/entropy.ts` (its `settable` row), the validation of the pair in `engine.ts`.
- **Tests first:** the pair's validation; `reSe` = RE − SE when held; release of one releases both.
- **Must not touch:** the Entropy algorithm.
- **Gate:** common, plus validation.

### P3: The controller — protocol, logs, record, scenario format (plan 8 h · 1.0–1.3 executor-h)

- **Purpose:** §3.3–3.5: the two shapes in `INSTRUCTOR_COMMANDS`; the controller session's pattern tracking and
  `describe`; the app's `describeCommand` lines and the record row for a `brainHold` with `cause: 'modeled'`; the
  scenario `DocCommand` kinds; `validate.ts`'s warning and its MODELED-card error; the runner and phase runner passing
  them through.
- **Depends on:** P1 (types); P2 for `setEegIndex`. It may start after P1 with the pattern half.
- **Files:**
  - `packages/controller/src/protocol.ts`;
  - `session/controller-session.ts`;
  - `scenario/types.ts`, `scenario/types-v2.ts`, `scenario/validate.ts`, `scenario/runner.ts`, `phase-runner.ts`;
  - `apps/demo/src/app/describe.ts`, `record.ts`;
  - `packages/controller/test/protocol.test.ts`, the scenario tests.
- **Tests first:**
  1. `instructorMay` accepts both shapes and still refuses `setFactor`.
  2. A MODELED card with `setEegPattern` fails validation with a reason; a MANUAL card passes; an unknown pattern
     warns.
  3. The record's rows for a pattern, an index and a release on entering MODELED; the Debrief shows them.
- **Must not touch:** `packages/engine-core`; the census list beyond the two shapes.
- **Gate:** common. No validation label: no engine change.

### P4: The "Brain" group in "Vitals & rhythm" (plan 10 h · 1.3–1.7 executor-h)

- **Purpose:** §5.
- **Depends on:** brief 208 merged (the Patient tool and its tab); P2 and P3.
- **Files:**
  - `apps/demo/src/app/panel/vitals.ts` (the group);
  - `apps/demo/src/app/eeg-patterns.ts` (new: labels and groups);
  - the glossary rows for the new labels (`glossary-data.ts`);
  - `teach2/census.dom.test.ts` (measures the two shapes);
  - CSS only as the existing rows use it.
- **Tests first:**
  1. DOM: the picker's groups and options equal `EEG_PATTERN_IDS` with no id missing; MODELED shows the line and no
     control; MANUAL stages the two commands with the onset; "Trace reads N" while held; the Entropy pair's stepper
     refuses RE < SE; the no-monitor line.
  2. The census finds `setEegPattern` and `setEegIndex`.
  3. One e2e in Chromium and WebKit: in a MANUAL run with the BIS-type reader, choose `propofol-burst-suppression`
     and hold 45. The bedside BFA tile reads 45, the depth window's trace shows suppression, and the row reads "Trace
     reads" a different number. Switch to MODELED and the tile returns to the reader. Run at 1280 × 720 with the
     dock's staging card present, as brief 208's check does.
- **Must not touch:** the dock and the sheet frame (brief 208's); `panel/devices.ts` (the EEG artefact switches,
  PR 447); the engine.
- **Gate:** common. No validation label.

### P5: The builder's Script (plan 4 h · 0.5–0.7 executor-h)

- **Purpose:** §3.5. "EEG pattern" and "Depth index" in the Script of a MANUAL card, not offered on a MODELED one.
- **Depends on:** P3, P4 (the labels list).
- **Files:** `apps/demo/src/app/builder/script-commands.ts` and its test.
- **Tests first:** offered only on a MANUAL card; a scripted pattern round-trips through save and load and runs.
- **Must not touch:** the format beyond P3; the engine.
- **Gate:** common.

### Order and totals

| Order | Piece | Plan h | Executor-h | Label | Waits for |
|---|---|---|---|---|---|
| 1 | P1 pattern hold | 12 | 1.5–2.0 | run-validation | owner's Q4 and Q8 (the defaults are written in) |
| 2 | P2 index hold | 10 | 1.3–1.7 | run-validation | P1; Q1, Q2, Q6, Q7 |
| 3 | P3 controller | 8 | 1.0–1.3 | — | P1 (pattern half), P2; Q5 for the scenario half |
| 4 | P4 Brain group | 10 | 1.3–1.7 | — | brief 208 merged, P2, P3; Q3, Q9 |
| 5 | P5 builder | 4 | 0.5–0.7 | — | P3, P4; Q5 |
| after 2 | P2b Entropy pair | 4 | 0.5–0.7 | run-validation | PR 433 merged |
| | **Total** | **48** | **6.1–8.1** | | |

P3's pattern half may run beside P2. Every other piece is in sequence.

---

## 7. Rules this plan amends (each for MANUAL only)

| Rule | Where | The amendment |
|---|---|---|
| "No number on a device screen the reader did not compute" | stage plan §2, anti-goals | in MANUAL, the held index is shown in place of the reader's. Nothing else is drawn that no reader computes (SQI%, EMG% stay blank) |
| D4: the EEG runs only while a device is on | stage plan §4 | kept; only the instructor's setting outlives the device (§3.1) |
| D7: physiology keeps reading today's index | stage plan §4 | kept, and tested (P1 test 3, P2 test 2): a held `di` is published only, `diRaw` untouched |
| §6.4: a scenario event is "a cause, never a pattern" | clinical plan §6.4 | kept for MODELED cards; a MANUAL card may choose a pattern (Q5) |
| EQ11 = A: the brain state is always-on and coupled to physiology | clinical plan §4.7 | the hold forks only the EEG pipeline's read of the inputs; a later brain state physiology reads is never the held one |
| Brief 208 rule 5: no hold in a modelled run | brief 208 | applied to the Brain group |

---

## 8. Self-review against the code (45dc8511)

- **No depth variable exists today.** `StateVar` has none; `validateEegCommand` knows on, off, impedance, ecgPickup and
  model only (`scratch/207-notes.md`, confirmed on 45dc8511). This plan adds new command types and no `StateVar`.
- `INSTRUCTOR_COMMANDS` already passes every `device` action as one shape (`commandShape` → `'device'`). That is why
  the holds are not `device eeg` actions (§3.2).
- The drug and neuro models run the same in both modes (no mode branch in `l2/pk`), so in MANUAL with no pattern the
  EEG follows the drugs exactly as today.
- The record keeps every applied command through `describeCommand`. A rhythm change reaches the Debrief that way, and
  the new lines follow the same path.
- PR 437 (merged) moved the BIS-type course: surgical depth reads 51.1 (C27 inside 40–60). The `propofol-surgical`
  pattern's reading therefore falls in the expected range on the BIS-type reader. The Entropy reader's misses (N140,
  C27, C28) remain.
- Not checked, and left to the pieces: the exact column layout of the "Vitals & rhythm" tab after brief 208 (P4 reads
  it on main); whether `types-v2.ts`'s phase `give` path needs the new kinds beside `onEnter` (P3).

---

## 9. Questions for the owner

Each has a short explanation, the options, and the proposal the plan builds if no answer comes.

1. **One hand-set number for every monitor, or one per monitor?** BIS-type runs 0–100, Entropy's SE 0–91 with RE
   0–100, and the present index tops out at 93. One number would need a conversion between scales that no source
   gives.
   - (A) One per index, declared by each reader; Entropy as a pair with RE ≥ SE.
   - (B) One number, shown on whichever index is on, clipped to its range.

   **Proposal A.**
2. **Does a hand-set number move gradually like a monitor, or as you set it?** The readers have no smoothing after the
   index; their delay is in the spectra, which a hand-set number does not pass through.
   - (A) It moves with the onset you choose for every MANUAL value (immediate, or over seconds).
   - (B) Also apply the old index's 20-s smoothing.

   **Proposal A.**
3. **When the number and the pattern disagree** (BIS 45 over an awake trace): what should anyone see?
   - (A) The bedside shows what you set; your row shows "Trace reads N".
   - (B) As A, plus a warning line on the Instructor page.
   - (C) Refuse combinations.

   **Proposal A:** no invented threshold.
4. **Under a chosen pattern, do surgery and the body still act on the trace?** That is, the incision's arousal, a fall
   in brain oxygen delivery, and cooling.
   - (A) No: the trace is exactly the pattern chosen (artefacts such as EMG, diathermy and loose electrodes still
     act).
   - (B) The stimulus still acts; oxygen and temperature do not.
   - (C) All body inputs still act.

   **Proposal A.** B or C would make a stimulus able to change a held picture, which may be what you want for
   teaching arousal.
5. **May a scripted MANUAL case choose a pattern and a number, as it may a rhythm?** The EEG plan said a scenario
   gives causes, never patterns, which is right for MODELED cases.
   - (A) Yes in MANUAL cases only.
   - (B) Never.

   **Proposal A.**
6. **The present index (`di`, the BFA tile when no EEG monitor is in the room): settable too?** The body reads its
   raw value for breathing, CMRO2 and the awareness flag. A hold would change only the number shown.
   - (A) Yes, shown only.
   - (B) No, only the EEG readers' indices.

   **Proposal A.**
7. **During the monitor's warm-up, and when the signal is bad, does the held number show?**
   - (A) No: blank and invalid stay as the monitor would show them; the number shows when the monitor would show one.
   - (B) The held number always shows.

   **Proposal A:** the signal quality stays real.
8. **Does a pattern change at once, or over an onset?** The ECG rhythm changes at once.
   - (A) At once (within a second).
   - (B) Over an onset you choose, which would be an engineering interpolation with no source.

   **Proposal A.**
9. **With no depth monitor in the room**, should the Brain group still let you choose a pattern?
   - (A) Yes, with a line saying it shows when a monitor is switched on.
   - (B) Hide the group.

   **Proposal A.**
10. **The burst-suppression percentage.** You choose a percentage, and the generator's own curve sets the drug-like
    input for it. The monitor's suppression ratio is then read from the trace and can differ by a few percent.
    - (A) Keep the monitor's reading.
    - (B) Also let you hand-set the suppression ratio.

    **Proposal A:** you asked for the final index only.
11. **Dexmedetomidine** rests on a potency placeholder (P-12) for its EEG.
    - (A) Offer the pattern with the placeholder marked on the model page.
    - (B) Hold it back until P-12 is ruled.

    **Proposal A.**
12. **Volatile agent choice:** sevoflurane by default, with isoflurane and desflurane as options. Their
    burst-suppression onsets differ (1.4, 1.3, 1.25 MAC).
    - (A) As proposed.
    - (B) Sevoflurane only.

    **Proposal A.**
13. **The phone.** The allow-list lets a granted instructor's phone send the new commands, but no phone control is
    planned (you asked for the Vitals tab).
    - (A) Laptop only for now.
    - (B) Add the controls to the phone's Remote.

    **Proposal A.**
14. **Barbiturate / etomidate rows.** Table 35.1's sequence is generated by the class shares, but no acceptance cell
    tests it yet.
    - (A) Offer the rows once P1's new direction tests pass, dropping any that fails.
    - (B) Hold the group back.

    **Proposal A.**
