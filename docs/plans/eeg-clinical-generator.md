# A clinical EEG generator: status epilepticus and sleep beside depth of anaesthesia — Plan

**STATUS: DRAFT FOR REVIEW (2026-11-11).** A planning executor wrote this plan for brief 166 of the post-demo set. Nothing
in it is ruled until the owner answers §8 and the orchestrator reviews the pieces. No product code, test, constant, card
or kit file was changed while writing it.

**Why this plan exists.** On 11 November the owner said the EEG model must be precise, so that it can later be used
"for eeg monitoring and strip for cases like status epilepticus or sleep studies". Today's EEG was built for one use: the
depth-of-anaesthesia tile (pieces E0–E6 of `docs/plans/stage-eeg-depth-of-anaesthesia.md`, called "the depth plan"
below). It is a *spectral synthesiser*: it draws random noise whose power at each frequency follows a target spectrum.
It has one frontal channel at 125 samples per second, and the depth plan's §9 put seizures, epileptiform spikes and
sleep out of scope. Four depth readers (BIS-type first, then Entropy, Narcotrend, PSI) are about to be built on it.
Before more is built on it, this plan states five things:

1. what "precise" means, as properties that can be tested;
2. how far today's generator is from them;
3. which mechanism can get there;
4. in what pieces;
5. what stays valid on the way.

**Base.** `origin/main` **44ac1ef4** (Merge PR #414), read in the worktree `scratch/wt-plan-eeg-clinical`, on branch
`plan-eeg-clinical-generator`. Every `file:line` is on 44ac1ef4 and is a starting point only. An executor finds the code
by the function name given, because lines move.

**Checked first.** `gh pr list --state all --search "EEG clinical generator plan"` returns nothing, and `ls docs/plans |
grep -i eeg` lists only `stage-eeg-depth-of-anaesthesia.md`. Nobody had written this plan.

**Sources, and how each was read.** The convention for page numbers is "printed page". In the full Miller PDF the
printed page is the PDF page − 228 in chapters 35–36, and the PDF page − 51 in chapter 9. All PDFs were read with PyMuPDF
under `python3 -I`, and no file was downloaded.

- **Miller's Anesthesia, 10th ed. (2025)**, `library/sources/full-pdfs/miller-10th.pdf`, read by page range:
  - Chapter 9 "Sleep Medicine" (Eikermann, Fassbender, Azimaraghi), pp. 152–160. Below, "Ch09 p. n".
  - Chapter 35 "Neurophysiologic Monitoring", pp. 1104–1107, 1116, 1127. Below, "Ch35 p. n".
  - Chapter 36 "Monitoring the Brain's Response to Anesthesia and Surgery", as the depth plan reads it. Below,
    "Ch36 p. n".
  - The "Neurocritical Care" chapter of section VII, pp. 2578 and 2587. Below, "NCC p. n". Its chapter number was not
    found on the pages read.
- **The depth plan's own sources:** Ch35–36, and `research/43-eeg-sources-review.md` (cited as "research/43" where its
  reading is used).
- **Read as abstract only (tagged [ABS]).** Each was read through the Europe PMC REST service, which returns the
  abstract and the metadata:
  - the model papers in §3.2;
  - Jirsa 2014.

  PMC answered with a reCAPTCHA page, which was not attempted. LWW answered 402, and OUP and PNAS answered paywall or 403.
  So **no model paper was read in full**. An [ABS] row states only what the abstract claims a model can do. It never
  gives a value, and every such paper is on the wanted list (§7).
- **Not read at all** (on the wanted list, cited for nothing):
  - the ACNS critical-care EEG terminology (Hirsch 2021);
  - the Salzburg criteria (Beniczky 2013);
  - the ILAE definition of status epilepticus (Trinka 2015);
  - the AASM scoring manual, and Silber 2007.

  Their DOIs were checked through Europe PMC (§7). The ACNS public-comment draft is a PDF on acns.org and was not
  fetched: a PDF fetch saves a file to disk, which the brief forbids.

**Tags used.**
- `[TXT … p. n]`: the value is on that page.
- `[ABS]`: a capability an abstract claims; never a value.
- `[WANTED: paper]`: no source has been read; the paper that would give it is named.
- `[ENG]`: an engineering choice, with its reason.
- `[EST]`: an estimate, said to be one.

**Plain words.** Terms of signal processing and modelling are explained where they first appear. A short glossary:

- **Montage:** the set of electrode pairs whose voltage differences are drawn as the channels of a strip.
- **Bipolar montage:** each channel is the difference between neighbouring electrodes.
- **Referential montage:** each channel is one electrode against a common reference such as an ear.
- **Sampling rate:** samples per second. The highest frequency a channel can hold is half of it (the *Nyquist* limit).
- **Phase:** where in its cycle a wave is at a given moment.
- **Phase-coherent:** many frequencies lined up so that together they form one sharp shape, such as a spike.

---

## 1. What "precise" means: testable properties for three uses

For each use the plan lists:
- **channels and montage**, **sampling rate and bandwidth**, **amplitude**, **morphology** (wave shape), **topography**
  (where on the head) and **time course**;
- what **physiology and drugs** do to the signal.

Every value has its page. A property without a read source is marked `[WANTED]` and has no value.

### 1.1 Depth of anaesthesia (what E0–E6 already hold)

The depth plan's acceptance cells **C1–C35** (`stage-eeg-depth-of-anaesthesia.md` §7.2) are the properties for this use.
They are sourced there from Ch35 and Ch36 and are not repeated here. In short:
- the awake RMS of about 5–10 µV `[TXT Ch36 p. 1138]`;
- the beta of sedation, the frontal alpha at loss of response, and alpha–delta at surgical depth `[TXT Ch36
  pp. 1138–1139]`;
- the per-agent signatures, ketamine, N2O, opioids and dexmedetomidine `[TXT Ch36 pp. 1142–1145]`;
- burst suppression below 5 µV, and the forme fruste `[TXT Ch36 pp. 1139–1141]`;
- age `[TXT Ch36 p. 1145]`;
- ischaemia and hypothermia `[TXT Ch35 pp. 1105, 1122, 1127]`;
- the artefacts `[TXT Ch36 pp. 1142, 1145–1146]`.

One frontal channel at 125 Hz covers the 0–50 Hz that Miller's spectrograms show (depth plan D2). Anteriorisation (C32)
is the one cell that needs more than one channel.

**What this plan adds to this use:** nothing new to meet. The new generator must keep meeting these cells, or say by
cause which ones it misses (§4.3).

### 1.2 Continuous EEG in the ICU and the operating room: status epilepticus

**What Miller gives (read):**

| Property | Statement | Source |
|---|---|---|
| Amplitude range of the EEG | "commonly from 5 to 500 µV" | `[TXT Ch35 p. 1104]` |
| The normal EEG | patterns on corresponding electrodes of the two hemispheres symmetric in frequency and amplitude; spike (epileptic) waveforms absent | `[TXT Ch35 p. 1104]` |
| Epilepsy on the EEG | "high-voltage spike and slow waves"; regional asymmetry with epilepsy (also tumour, ischaemia) | `[TXT Ch35 p. 1105]` |
| Montages drawn | bipolar chains FP1–F3, FP2–F4, F3–C3, F4–C4, C3–P3, C4–P4, P3–O1, P4–O2 (Fig. 35.4); referential F3–A1, F4–A2, C3–A1, C4–A2, P3–A1, P4–A2 (Fig. 35.5); both at 1 s and 50 µV calibration; eye blinks "best visible in channels that incorporate frontal electrodes" | `[TXT Ch35 p. 1105, Figs 35.4, 35.5]` (the printed figure labels C3–P4 for the right chain; read as C4–P4) |
| Provocation | hypocapnia "is known to activate excitable seizure foci"; hyperventilation or a small dose of methohexital activates a focus for mapping | `[TXT Ch35 p. 1127]`; `[TXT Ch35 p. 1116]` |
| Termination by drugs | seizures triggered by cortical stimulation "can be stopped by" iced saline on the cortex or a small dose of barbiturate or propofol; afterdischarges that may progress to seizure (Fig. 35.16) | `[TXT Ch35 p. 1116]` |
| Anaesthetic spikes | sevoflurane and enflurane cause more epileptiform spikes than desflurane and isoflurane; burst suppression with epileptiform discharges at 2 MAC sevoflurane in two volunteers (Kaisti 1999) | `[TXT Ch36 p. 1143]`; Ch10 p. 209 as read by research/43 |
| Drug effects on the background | barbiturates and etomidate: low dose fast frontal beta, moderate dose frontal alpha-frequency spindles, high dose diffuse delta, then burst suppression, then silence | `[TXT Ch35 p. 1107, Table 35.1]` |
| Status epilepticus: kinds | two main classes: convulsive (typically generalised tonic–clonic) and non-convulsive | `[TXT NCC p. 2587]` |
| Time to treat | "a seizure lasting beyond 5 minutes is unlikely to stop spontaneously"; treat in the first 5–10 min | `[TXT NCC p. 2587]` |
| Treatment ladder | first line: lorazepam 0.1 mg/kg or 4 mg IV, or diazepam 0.2 mg/kg IV; midazolam 10 mg IM without IV access. Second line: fosphenytoin, valproic acid or levetiracetam. Refractory (20–30 % after a benzodiazepine and one second-line agent): midazolam or propofol infusions, or thiopental/pentobarbital. Super-refractory (seizures persisting or recurring after 24 h on third-line therapy): inhaled anaesthetics, ketamine | `[TXT NCC p. 2587]` |
| Paralysis | paralytic agents "should be avoided for the long term due to fear of masking ongoing or recurrent seizures" | `[TXT NCC p. 2587]` |
| Continuous EEG | advisable to direct management and to detect non-convulsive seizures, especially in comatose patients; NCS are frequent in the neuro-ICU, associated with intracranial hypertension and metabolic derangement; automatic detection "fraught with false negatives and false positives" | `[TXT NCC pp. 2578, 2587]` |
| Malignant patterns after anoxia | burst suppression, α-coma and low-voltage delta are associated with a poor outcome; persisting EEG reactivity indicates a good one | `[TXT NCC p. 2578]` |
| Systemic effects | hypoxic respiratory failure, acid–base disturbance, glucose, myocardial depression from treatment, rhabdomyolysis, renal dysfunction | `[TXT NCC p. 2587]` |

**What a clinician must recognise, and what the plan has no source for yet:**

- **The definitions.** Electrographic seizure; electrographic and electroclinical status epilepticus; the
  ictal–interictal continuum.
  - Their thresholds of frequency, duration and evolution are `[WANTED: Hirsch 2021 (ACNS); Beniczky 2013 (Salzburg)]`.
  - The time points of the operational definition are `[WANTED: Trinka 2015]`. These are the time at which treatment
    must start, and the time after which long-term consequences become likely. Miller's "beyond 5 minutes" is the only
    one read.
- **Rhythmic and periodic patterns.** Generalised, lateralised, bilateral independent and multifocal periodic
  discharges; rhythmic delta activity; spike-and-wave. Also their modifiers ("plus", frequency, prevalence) and what
  "evolution" means in numbers (frequency, morphology, location) `[WANTED: Hirsch 2021]`.
- **Onset, evolution, termination, the post-ictal state.** How a seizure starts, how its frequency, amplitude and
  field change, how it ends, and what follows it. None of these is described in the pages read, so no pattern is named
  here `[WANTED: Hirsch 2021 for terms; Jirsa 2014 full text for the onset and offset dynamics]`.
  - The Jirsa abstract `[ABS]` claims a saddle-node onset and a homoclinic offset, with a baseline (DC) shift at onset
    and a logarithmic lengthening of the interval between spikes towards offset. This is a model's prediction, quoted as
    a capability, not as a property.
- **Burst suppression under treatment, and highly epileptiform bursts.** The suppression and attenuation voltages and
  percentages `[WANTED: Hirsch 2021]`. Miller's below 5 µV (Ch36 p. 1139) is the anaesthesia definition. Whether the ACNS
  uses the same threshold is unread.
- **Channels, sampling rate and bandwidth of a clinical recording.** The 10–20 electrode set appears in Miller's figures
  (Figs 35.4–35.5). The minimum number of electrodes, the sampling rate, the filter settings and the display sensitivity
  for ICU EEG are `[WANTED: the ACNS guideline on minimum technical standards; not yet identified with a verified
  DOI]`.

**Drugs and physiology on the seizure EEG.** From the sources read:
- the treatment ladder above;
- hypocapnia activates foci (Ch35 p. 1127);
- barbiturate or propofol stops stimulated seizures (Ch35 p. 1116);
- the background drug effects (Table 35.1);
- the masking of convulsions by paralysis (NCC p. 2587).

How each drug changes a seizure's frequency, duration and spread on the EEG is `[WANTED]`. No read source gives it.

### 1.3 Sleep

**What Miller gives (read):**

| Property | Statement | Source |
|---|---|---|
| Drowsiness | continuous slowing from attentive β (16–30 Hz) to α "predominantly between 7.5 and 11 Hz" with eyes closed | `[TXT Ch09 p. 153]` |
| Sleep onset | the α → θ transition (θ 4.5–7.5 Hz) "widely accepted as the EEG correlate of sleep onset"; heart rate and heat production fall, respiration regular and deep | `[TXT Ch09 p. 153, Fig. 9.2]` |
| N2 | low amplitude and θ with intermittent sleep spindles and K-complexes; K-complexes reflect brainstem and subcortical activation in response to unexpected input (e.g. sounds); evoked K-complexes in coma mark a better outcome | `[TXT Ch09 p. 154]` |
| N3 | slower frequencies and high amplitudes: slow-wave sleep | `[TXT Ch09 p. 154]` |
| REM | low-voltage, mixed-frequency spectra resembling wakefulness; hippocampal θ not apparent on the human scalp; reduced skeletal muscle tone except the extraocular muscles; irregular respiration, more heart-rate variability, impaired temperature control | `[TXT Ch09 p. 154]` |
| Scoring rules (AASM, as Miller tabulates them) | W: α rhythm (8–13 Hz) in more than 50 % of an epoch. N1: lower amplitude, 4–7 Hz activity (vertex sharp waves and slow eye movements, "not necessary but may be present"). N2: N1 with sleep spindles and K-complexes, slow waves not meeting N3. N3: "20 %–50 % of slow-wave activity (0.5–2 Hz)". R: low-amplitude mixed frequencies, low chin EMG, rapid eye movements | `[TXT Ch09 p. 160, Table 9.3]` |
| The night on a spectrogram | a 7.5-hour night from a portable EEG: awake with strong alpha; N3 dominated by delta power; REM with alpha and theta and no K-complexes or spindles; the architecture readable on the multitaper spectrogram (a spectrogram made with several tapering windows, which lowers its noise) but not on the raw trace | `[TXT Ch09 p. 155, Fig. 9.4]` |
| Spindles on a referential montage | Fig. 35.5, 1 s / 50 µV | `[TXT Ch35 p. 1105]` |

**Miller disagrees with itself here.**

| Disagreement | One statement | The other |
|---|---|---|
| α band | 7.5–11 Hz in the text `[Ch09 p. 153]` | 8–13 Hz in Table 9.3 `[Ch09 p. 160]`; 8–12 Hz in Ch36 Table 36.1 (depth plan Q6) |
| θ band | 4.5–7.5 Hz `[Ch09 p. 153]` | 4–7 Hz `[Ch09 p. 160]`; 4–8 Hz `[Ch36 Table 36.1]` |
| Where spindles belong | slower frequencies of "deep natural sleep with sleep spindles" `[Ch35 p. 1104]` | N2 `[Ch09 p. 154, p. 160]` |
| N3 criterion | "20 %–50 %" slow-wave activity, as printed `[Ch09 p. 160]` | whether the current manual has an upper bound at all is not read; the plan's guess that 50 % is a remnant of an older two-stage split is recall, not a source: to check `[WANTED: AASM manual; Silber 2007]` |

The engine should not choose among these. A sleep scorer uses the AASM manual's own edges once that manual is read
(EQ8). The generator is not tuned to any band edge.

**What the plan has no source for:**
- The graphoelements' numbers: spindle frequency and duration; K-complex duration and amplitude; slow-wave amplitude
  and its frontal predominance; vertex sharp waves; sawtooth waves of REM. `[WANTED: AASM manual; Silber 2007]`. Miller
  gives no numbers for any of them.
- The night's architecture: the length and number of NREM–REM cycles, and the shift of N3 to early and REM to late in
  the night `[WANTED]`. Miller shows one night (Fig. 9.4) but states no cycle numbers.
- The polysomnography channels and their rates: EOG (eye leads), chin EMG, airflow, SpO2 `[WANTED: AASM manual]`.
- Drugs on sleep: benzodiazepine spindles appear in anaesthesia (Ch36 p. 1144). Their effect on natural sleep
  architecture is `[WANTED]`.

### 1.4 The properties as one list (used by the audit and the pieces)

| Id | Property | Use | Source state |
|---|---|---|---|
| P1 | Spectral features of the depth cells C1–C35 | depth | read (depth plan §7.2) |
| P2 | Multiple channels on the 10–20 set, bipolar and referential montages, symmetry of the normal EEG, frontal blink fields | all | read (Ch35 pp. 1104–1105) |
| P3 | Sampling rate and bandwidth of a clinical recording | ICU, sleep | WANTED |
| P4 | Spikes, sharp waves, spike-and-slow-wave (phase-coherent transients) | ICU | read as a property (Ch35 p. 1105); numbers WANTED |
| P5 | A seizure's onset, evolution (frequency, amplitude, field), termination and post-ictal state | ICU | WANTED (terms); [ABS] Jirsa |
| P6 | Rhythmic and periodic patterns (PDs, RDA, SW) and the ictal–interictal continuum | ICU | WANTED |
| P7 | Focal versus generalised onset and spread across channels (topography over time) | ICU | read as a property (asymmetry, Ch35 p. 1105); numbers WANTED |
| P8 | Drug effects on seizures (termination by benzodiazepine, propofol, barbiturate; provocation by hypocapnia) and burst suppression under treatment | ICU | read (Ch35 pp. 1116, 1127; NCC p. 2587); EEG numbers WANTED |
| P9 | Convulsive versus non-convulsive: muscle artefact on the scalp, masked by paralysis | ICU | read (NCC p. 2587) |
| P10 | Sleep stages W, N1, N2, N3, R with Table 9.3's criteria | sleep | read (Ch09 p. 160) |
| P11 | Graphoelements: spindles, K-complexes (also evoked by sound), vertex sharp waves, slow waves, sawtooth waves | sleep | read as properties (Ch09 pp. 154, 160); numbers WANTED |
| P12 | The night's architecture | sleep | WANTED (Fig. 9.4 qualitative) |
| P13 | REM: EEG resembling wakefulness, low chin EMG, rapid eye movements | sleep | read (Ch09 pp. 154, 160) |
| P14 | Determinism (follower identity) and cost | all | engine rule (depth plan D3); PR #320's measurement |

---

## 2. Audit: today's generator against those properties

What was read, and how far:
- **In full:** `packages/engine-core/src/l2/eeg/synth.ts`.
- **Header and constants:** `spectra.ts`, `artefacts.ts`, `l3/eeg-devices/generic.ts`, `spectral.ts`.
- **Header and the suppression lines:** `state.ts` (`cortexStep`, lines 161–172).
- **Header:** `pipeline.ts`.
- **By search:** `types-eeg.ts`.
- **Titles only:** the tests under `test/engine/eeg-*.test.ts`.
- **Also:** the step-time measurement in PR #320's description.

A verdict below rests only on what these parts show. Function bodies of `spectra.ts` and `artefacts.ts` were not read
line by line.

**How it works, in plain words.**
- **The cortical state.** Every half-block, `state.ts` maps the drug bus and the physiology to a handful of cortical
  variables. They include `hyper`, `deep`, `suppress`, `ketDepol` and `arousal` (`cortexStep`).
- **The spectrum.** `spectra.ts` turns those variables into a target spectrum: a 1/f background plus six named Gaussian
  peaks (slow, theta, alpha, spindle, beta, gamma), each with a "burstiness". It also gives a suppressed fraction and a
  forme-fruste level (`spectrumOf`).
- **The samples.** `synth.ts` renders 2-second blocks (256 samples at 125 Hz). For each frequency it draws independent
  Gaussian cosine and sine coefficients, does one inverse FFT (a fast transform from frequencies back to a time trace),
  and overlap-adds the blocks under a sine window (`renderBlock`, `synthNext`). Time structure enters only through
  multiplying gates:
  - a two-state burst/suppression alternation with mean burst 3.58 s (`BS_BURST_S`);
  - forme-fruste drop-outs of the power above 2 Hz (`FF_SPLIT_HZ`);
  - an on/off burst envelope for each peak.
- **The rest.** `artefacts.ts` adds EMG, diathermy, blinks, ECG pickup, impedance noise and mains. `pipeline.ts` runs
  all of this at 125 Hz on one channel, only while `device eeg on` (depth plan D4), from `seedStream(seed, 'eeg')` and
  `seedStream(seed, 'eeg-artefact')` (D3).
- **Cost.** The EEG costs **3.33 µs per 20 ms engine tick, +6.0 % of E0's 55.4 µs/tick**, against the depth plan's
  ≤ 10 % budget (PR #320, measured over 30 min, 3 runs). The engine as a whole ran at **2.77 ms per simulated second**,
  "361× real time" (`research/00-orchestrator-rulings.md`, the E0 report).

| Property | Verdict | Why (from the code) |
|---|---|---|
| P1 depth cells | **Meets** (at the spectrum and signal level; the readers' cells as their readers merge) | `spectrumOf` holds each sourced feature; `eeg-signal.test.ts` checks C18, C20–C22 on the engine. But many magnitudes between the anchors are `[FIT]` or `[ENG]` in `synth.ts` and `spectra.ts` (for example `OSC_DUTY_MIN`, `FF_DROP_MAX`, `FF_FLOOR`): the shapes are set, not produced by a mechanism |
| P2 several channels, montage, symmetry | **Extension, but only by construction** | One channel (`EEG_RATE`, one buffer). Copying it to many electrodes with chosen correlations gives "channels", but a field and its symmetry would be stated, not arise. Nor is there an eyes-open/eyes-closed state: no such input appears in `state.ts` or `spectra.ts` (by search), so posterior alpha's reactivity (Ch35 Fig. 35.4) has no place to come from |
| P3 rate and bandwidth | **Extension** | The generator is rate-agnostic (`createSynth(rng, fs, …)`); the engine offers 500, 125 and 62.5 Hz (`types.ts:197`). Which rate a clinical channel needs is WANTED |
| P4 spikes, spike-and-slow-wave | **Cannot in principle** | A spike is a phase-coherent transient: many frequencies aligned for an instant. Random-phase synthesis gives every frequency an independent random phase in every block, so it never produces a phase-coherent shape. A spike could be added only as a drawn template, which is the fitted shape the owner's rule forbids |
| P5 onset, evolution, termination, post-ictal | **Cannot in principle as dynamics; scriptable as a spectral sequence** | The spectrum could be stepped through a scripted course, but the course would be a script. Nothing in the model makes a seizure start, change frequency, spread or stop. Termination by a drug would be a hand rule per drug, the "hand correction" the depth plan's anti-goals reject |
| P6 rhythmic and periodic patterns | **Cannot in principle** | A periodic discharge is a repeated phase-coherent waveform at a fixed interval; as P4 |
| P7 focal onset and spread | **Cannot in principle** | One channel, and no spatial state. Spread is a time-ordered phase relation between channels, which independent random phases cannot carry |
| P8 drugs on seizures | **Cannot by mechanism** | Only as per-drug rules on a scripted spectrum |
| P9 convulsive or not, masked by paralysis | **Partly meets the path** | The EMG artefact already reads scalp muscle × arousal and goes to 0 as T1 → 0 (C18, `artefacts.ts`). A convulsion would need its own muscle drive |
| P10 sleep stages | **Extension, by construction** | A sleep state could select spectra (alpha for W, theta for N1, delta for N3). The stage would be an input chosen per stage, not an outcome |
| P11 graphoelements | **Sleep spindles: extension only by construction. K-complexes, vertex sharp waves, sawtooth waves: cannot in principle** | The existing `spindle` peak is dexmedetomidine's anaesthetic spindle (`spectra.ts` `SPINDLE_HZ` 13 Hz, Akeju 2014; `SPINDLE_BURSTINESS` 0.8 [FIT]), not a sleep spindle; a sleep spindle could reuse its bursty-peak machinery, but nothing would tie it to N2, to slow-wave phase or to the thalamus. A K-complex or a vertex wave is a single large phase-coherent transient (as P4) |
| P12 night architecture | **Not a generator property** | Needs a sleep state that evolves through the night; no such state exists anywhere in the engine |
| P13 REM | **Extension** | EEG spectral; rapid eye movements and chin EMG would need eye and chin channels (blinks exist, `artefacts.ts`) |
| P14 determinism, cost | **Meets** | `eeg-signal.test.ts` "deterministic (D3)": two engines, same seed and commands, identical samples; cost as above |

**One finding that matters to the readers now.**
- `synth.ts` draws every frequency's phase independently. The only shared time structure is that the gates multiply
  several slots at once: burst suppression multiplies all of them, and the forme fruste multiplies everything above 2 Hz.
- So by construction today's signal has **amplitude co-modulation but no designed phase coupling between
  frequencies**. A *bispectral* measure is a measure of phase coupling between frequency pairs. Miller names
  "coherence/bispectral" terms among the components BIS combines (Ch36 p. 1147, as the depth plan reads it). What such a
  measure reads on today's signal is **not measured**; the plan predicts low values except through the gates, and G1
  measures it.
- Any generator with real nonlinear dynamics (the recommendation below) may give that measure different values on the
  same clinical state. This is the reason for the split of reader tests in §4.1.

**Summary.** Today's generator meets the depth use and could stretch to a spectrally scripted sleep. It cannot produce,
in principle, the phase-coherent events of clinical EEG: spikes, periodic discharges, K-complexes, vertex waves, and a
seizure's propagating onset. Nor can it produce any course that comes from a cause rather than a script.

---

## 3. The mechanism

### 3.1 What the mechanism must provide

The owner's rule is mechanisms first: a behaviour comes from a modelled mechanism, never from a fitted shape. From §2, a
generator for clinical EEG needs four things:
- **(a) nonlinear population dynamics**, so that phase-coherent events (spikes, K-complexes) and rhythms arise from the
  same equations;
- **(b) a thalamocortical loop.** Miller ties the anaesthetic alpha and the hypnotics' action to the thalamocortical
  system (Ch36 p. 1142; Ch08 p. 137, via the depth plan). That spindles and generalised spike-and-wave also arise there
  is what the corticothalamic papers' abstracts claim [ABS Robinson 2001, 2002], not a statement read in Miller;
- **(c) several coupled regions**, so that focal onset, spread and symmetry arise;
- **(d) slow variables** that move the fast dynamics across states. A slow variable is a quantity that changes over
  seconds to hours and shifts the fast system's behaviour. Three are needed: sleep pressure and arousal, seizure
  excitability, and metabolism (for burst suppression).

### 3.2 Candidate families from the literature (all [ABS]: abstract only)

| Family | Representative paper | What its abstract claims it produces | What it does not claim | Thalamic loop? | Drug mapping published on the same family? | Cost class [EST] |
|---|---|---|---|---|---|---|
| **Lumped cortical column (neural mass)** | Jansen 1995 | "a wide range of EEG-like waveforms and rhythms"; coupled columns replicate the spatial distribution of alpha and beta; evoked potentials | thalamus, sleep, seizures | no | not in this abstract | lowest: a few ordinary differential equations per region |
| **Neural mass with fast inhibition, for focal seizures** | Wendling 2002 | interictal-to-fast-ictal transition explained by impaired dendritic GABA inhibition, compared with intracerebral recordings in human focal epilepsy | thalamus, sleep, scalp EEG | no | GABA mechanisms are its subject; anaesthetics not stated | low |
| **Corticothalamic mean-field (Robinson type)** | Robinson 2001; Robinson 2002 | 2001: EEG spectra from neurophysiology, including filtering by CSF, skull and scalp; alpha and beta peaks from thalamic feedback; sleep spectra and spindles. 2002: instabilities at the clinical rhythms' peaks evolving into limit cycles (self-sustaining oscillations) that it maps to petit mal and grand mal seizure EEGs; parameters inferred from observed EEGs | focal seizures, burst suppression | **yes** | Hindriks 2012 (propofol: increased local cortical inhibition explains delta, theta and frontal alpha changes) uses "a meanfield model of the thalamo-cortical system"; whether it is the same equations is unread | low as lumped regions; high as a field on a cortical grid |
| **Cortical mean-field with anaesthetic receptor action (Bojak type)** | Bojak 2005 | anaesthetic action on ligand-gated channels; a whole-cortex grid of partial differential equations; many plausible parameter sets; isoflurane's biphasic power rise | thalamus, sleep, seizures | no | **yes** (isoflurane) | high on a grid (its published form); lumped form unknown |
| **Conductance-based thalamocortical network** | Ching 2010 | propofol changes thalamocortical loop dynamics to give persistent, synchronous frontal alpha | — (mechanism stated, details not in the abstract) | yes | yes (propofol) | highest: individual model neurons; a mechanism reference, not a browser generator |
| **Metabolic burst suppression** | Ching 2012 | burst suppression from a fall in cerebral metabolic rate with ATP-gated potassium channels; links to deep anaesthesia, hypothermia, coma | — | — | via metabolism | a slow variable to add to any family |
| **Phenomenological seizure dynamics (Epileptor)** | Jirsa 2014 | a few state variables on separate fast and slow time scales; saddle-node onset, homoclinic offset; predicted baseline shift and logarithmic interval scaling; checked on mouse hippocampus in vitro, human and zebrafish seizures | which cells or synapses are which variables | no | no | very low |
| **Sleep–wake switch (ascending arousal system)** | Phillips 2007 | brainstem and hypothalamic populations, with circadian and homeostatic drives entering through the VLPO; a flip-flop with hysteresis; "parameters are not free since they correspond to physiological observables" | any EEG | — | — | very low (a slow drive) |

Notes on the table:
- **The rows are not one model.** "A corticothalamic mass, plus the sleep switch, plus an Epileptor-like variable, plus a
  metabolic variable" is this plan's own composition. Whether any paper publishes these joined, with their joints
  derived, is unread. The joints are where a fitted constant would hide.
- **Is the Epileptor a mechanism?** Its abstract describes a dynamical model whose variables are not named as cells or
  channels. Whether such a model meets the owner's rule is his call (EQ2).
- **Lumped versus grid.** Several regions with a few equations each are "lumped". A field on a grid of cortex (Bojak
  2005's published form) costs orders of magnitude more `[EST]`. For a scalp montage on the 10–20 set, the plan sees
  no gain in a fine grid that the montage then averages away. That is an inference, to be checked in G0a.

### 3.3 How several channels arise

- **Sources.** Each modelled region produces a source signal, its mean cortical membrane potential. The family's papers
  tie this to the EEG (Robinson 2001 [ABS] includes CSF, skull and scalp filtering).
- **Head model.** A fixed *mixing matrix* maps the regions' sources to the 10–20 electrodes. Each electrode sees a
  weighted sum of nearby regions; this is "volume conduction", the spread of current through the head. The simplest
  version is a few-shell sphere. Its weights are `[WANTED: a head-model reference, not yet identified with a verified
  DOI]`.
- **Montage.** Montage channels are electrode differences (Ch35 Figs 35.4–35.5). They are computed in the device or
  view layer from the electrode signals, so one engine state serves every montage.
- **Topography from couplings.**
  - Symmetry of the normal EEG (Ch35 p. 1104) arises from symmetric regions.
  - Asymmetry (Ch35 p. 1105) arises from a focus or a lesion in one region.
  - Spread arises from coupling between regions.
  - The frontal blink field (Fig. 35.4) remains an artefact added at the frontal electrodes, as `artefacts.ts` does now.

### 3.4 Where the parameters come from, and what stays an input

The second advisor point, adopted: **today's fitted cortical variables are not fed into the new model.** `state.ts`'s
`hyper`, `deep`, `suppress` and `formeFruste` are the map from drugs to spectra that the new model is meant to replace.
Feeding them into synaptic gains would re-dress the same fit.

- **These stay inputs** (they are physiology, not EEG shape):
  - the drug bus by class, `bus.cns.hypByClass` (gabaIv, barbiturate, etomidate, benzo, dissociative);
  - the volatile MAC fractions per agent, the fentanyl equivalent, and dexmedetomidine Ce;
  - stimulus and antinociception, giving arousal;
  - age;
  - brain CBF and DO2, core temperature and glycopenia;
  - TOF T1, for the muscle that EMG needs.
- **Each drug class acts on one named model parameter**, as its family's paper states. Examples [ABS]: propofol through
  increased local cortical inhibition (Hindriks 2012); anaesthetics on ligand-gated channels (Bojak 2005).
  - The size of each action comes from the paper's own human fit or from receptor pharmacology, never from matching a
  depth cell.
  - Where no paper gives a class's action on the chosen family (ketamine, N2O, dexmedetomidine and opioids are not in
    any abstract read), that class stays on today's spectral generator in a coexisting mode (EQ5 option C) or is
    `[WANTED]`. It does not get a fitted gain.
- **These must emerge from the model:**
  - the alpha peak and its anteriorisation;
  - the alpha-to-delta shift;
  - burst suppression with its burst and suppression lengths;
  - spindles, K-complexes and slow waves;
  - a seizure's onset, frequency course, spread and end.

  The cells that test them (C1–C17 at the signal level, P4–P13) are the model's acceptance, and the bands come from the
  sources in §1.

### 3.5 Cost in a browser, and how to measure it

**The present budget.** The depth plan set "step time with the EEG on ≤ E0's + 10 %" [ENG]. Today's EEG uses +6.0 % of it
(PR #320). A model with 8–19 regions, a thalamic loop with a conduction delay (a delay buffer for each region) and an
internal step fine enough for its fastest population will exceed the remaining 4 % `[EST]`.

| Item | Estimate [EST] | How it is measured (G1) |
|---|---|---|
| One lumped corticothalamic region | about 8–12 state variables; an internal step of 1 ms or finer; one sigmoid (the firing-rate curve) per population per step | count from the chosen paper's equations |
| 19 regions at 1 kHz internal, 125 or 500 Hz out | ≈ 19 × 4 populations × 1000 steps per simulated second ≈ 76 000 sigmoid evaluations per simulated second | the PR #320 method: the pipeline step alone over 30 min of samples, ticked as the engine ticks, median of 3 runs, the 1-minute load average written beside it |
| Snapshot and clone | the delay buffers of every region enter the snapshot (followers restore from it) | time and size of `snapshot()`/`restore()` with the model on, against off |

**The budget is a decision.** EQ9 proposes a new budget, for example "≤ 2× the present EEG cost while only a depth tile
is shown; a stated absolute ceiling in ms per simulated second while a clinical EEG window is open". The plan does not
claim a number before G1 measures one. The engine's present speed, 2.77 ms per simulated second (361× real time), leaves
room in real time. Fast-forward is what a heavy EEG would slow.

### 3.6 Follower identity under nonlinear dynamics

**How identity works today.** A follower runs its own engine, restores the host's snapshot and replays every command at
the host's tick. "On the same build this is sample-identical (the engine is deterministic)", and a mismatch resyncs by a
fresh snapshot (`packages/controller/src/session/viewer-sync.ts:1–6`).

**What changes with nonlinear dynamics.** A chaotic or near-unstable system amplifies the smallest difference in
arithmetic, and the JavaScript standard does not fix the last bit of `Math.exp`, `Math.sin` or `Math.log` across
browser engines. The present generator already uses `Math.sin`, `Math.exp` and a Gaussian draw. The tests checked
identity on one engine (Node), not across browsers. A nonlinear model would turn any last-bit difference into a
different trace within seconds.

**Two remedies** (G1 measures first, EQ10 rules):
- **(A)** the model uses only correctly rounded arithmetic (+, −, ×, ÷, √, which IEEE 754 fixes), with its own sigmoid
  and exponential built from those, and so does its noise input: the Gaussian draw (`rng/sfc32.ts` `normal`) is checked
  for `Math.log`, `Math.cos` or `Math.sin` and replaced by an exactly rounded method if it uses them;
- **(B)** the follower accepts drift and resyncs by snapshot at a fixed interval.

The plan proposes (A), because (B) would make a follower's strip jump.

### 3.7 Recommendation

**Firm on the architecture:**
- an always-on, low-rate **patient brain state** that holds the slow variables (sleep pressure and arousal, seizure
  excitability per focus, metabolism);
- a device-gated **renderer** that runs the fast population dynamics in a few coupled regions, with a thalamic loop;
- a fixed **head mixing** to the 10–20 electrodes;
- **montages** derived in the device and view layer;
- the present `eeg` channel kept as one derived frontal channel, so that the depth readers keep their input.

**Conditional on the equation family.** The candidate that best matches §3.1 on the abstracts read is the **lumped
corticothalamic mean-field family** (Robinson 2001/2002, with Hindriks 2012 for propofol). It is the only family whose
abstracts claim a thalamic loop, sleep spectra and spindles, generalised seizure limit cycles, and a published
anaesthetic mapping. The alternatives:
- **Wendling 2002** is the candidate for **focal** seizure onset (fast activity from impaired dendritic inhibition),
  inside one region.
- **Ching 2012** adds burst suppression as a metabolic slow variable.
- **Phillips 2007** drives sleep.

**What would change the recommendation** (the kill criteria G0a applies when the papers are read):
1. **No human parameter set.** If the corticothalamic family's full texts give no published human parameter set, or give
   one that does not reproduce the awake eyes-closed alpha and its loss at propofol LOR without a fitted constant, choose
   the next family.
2. **No published drug actions.** If no paper maps ketamine, N2O, opioids and dexmedetomidine onto the family, those
   classes stay on the spectral generator (EQ5 option C), and the plan says so on the model page.
3. **The joints are not published.** If the joint "corticothalamic region + Epileptor-like slow variable" or "+ metabolic
   variable" is not published, and its coupling term would have to be fitted, the seizure piece uses only what the
   family itself produces (Robinson 2002's limit cycles [ABS]) and the owner rules EQ2.
4. **Cost.** If G1 measures a region's cost so high that 19 regions miss the EQ9 budget, use fewer regions (for example
   8, one per bipolar chain area), with the montage still on 10–20 positions.
5. **Cross-browser identity.** If identity across browsers cannot be kept with correctly rounded arithmetic, EQ10's
   option B is the fallback.

In five sentences:
1. The EEG should come from a small number of coupled corticothalamic regions, each a few equations for the average
   activity of cortical and thalamic cell populations with a loop delay.
2. Drugs act on the parameters their papers name, and natural rhythms, spindles, K-complexes and seizures arise from the
   same equations rather than being drawn.
3. Slow variables for sleep pressure, seizure excitability and brain metabolism live in an always-on brain state and move
   the fast dynamics across sleep stages, into and out of seizures, and into burst suppression.
4. A fixed head model turns regions into the 10–20 electrodes, montages are differences of electrodes, and today's
   frontal `eeg` channel becomes one derived channel, so every depth reader keeps its input.
5. The equation family is chosen by a sources review once the full papers are read (G0a), against stated kill criteria;
   until then this is the leading candidate, not a ruling.

---

## 4. The transition

### 4.1 What stays behind the present interface

- **The channel.** The `eeg` channel keeps its meaning: one frontal derivation, µV, at `EEG_RATE` (`pipeline.ts`). With
  the new renderer it is computed as an electrode difference over the forehead. The sites are `[WANTED: each depth
  device's sensor sites]`, with one constraint stated now: **not a difference between homologous left and right sites**
  (such as Fp1–Fp2), because a symmetric, widely synchronous alpha (Ch36 p. 1143, via the depth plan) would cancel in it
  and C3 and C4 would fail for that reason alone.
  - If EQ4 raises the clinical rate, the `eeg` channel can stay at 125 Hz, decimated from the internal rate. A
    *decimator* is a filter that removes frequencies above the new Nyquist limit and then keeps every n-th sample.
- **The device layer.** Readers keep the signature `reader(samples, fsHz, impedanceKOhm, state)` and the import-boundary
  test (depth plan §5, D8). No reader reads the generator's state.
- **Reader tests split into two kinds.** This is what lets the BIS-type reader proceed now:
  - **generator-independent**: on fixed inputs (synthetic signals with known content, or the published checks of the
    reader's own paper). They stay valid on any generator.
  - **generator-dependent courses**: the reader on the engine's EEG through a clinical course (for example C14 ketamine,
    C27 surgical depth). They are re-run on the new renderer at G11. A difference is reported by cause, for example "the
    new signal has phase coupling, the bispectral term reads X instead of Y". It is never re-baselined to pass.
- **Commands.** `device eeg on/off/model/impedance/ecgPickup` stay. A generator choice is a new, separate setting (G1),
  and the default does not change until G11.
- **The physiology that reads the old index** (`outputs.ts`, `drive.ts`, `pipeline.ts:323`; depth plan D7, Q4) is not
  moved by the renderer.

### 4.2 The always-on brain state moves physiology, and how that is proven

**The second advisor point, adopted.** Sleep stage, a seizure and brain metabolism must exist whether or not an EEG
device is on. Switching the EEG on at hour 4 of a night must show the right stage, and a convulsion's effects on the body must not depend on
whether an EEG is shown. They therefore live in a brain state that is always on, outside D4's device
gate.
- **At its defaults it changes nothing:** awake, no focus, metabolism normal. E0's baseline
  (`test/engine/fixtures/eeg-baseline.json`) stays byte-identical. That is G2's acceptance.
- **The pieces that couple it to physiology move numbers.** These are a convulsion's muscle drive (its effects on oxygen
  use, CO2, lactate and temperature are `[WANTED]`; Miller lists hypoxic respiratory failure, acid–base disturbance and
  rhabdomyolysis among SE's complications, NCC p. 2587), and sleep's breathing and heart rate (Ch09 pp. 153–154). Each needs the validation workflow, and each is EQ6 (in scope now, later, or out). The depth plan's Q4
  (physiology reading the cortical state instead of today's index) is the same question for anaesthesia. The plan
  proposes that both be ruled together.

**Pinned courses and baselines that would move, and their proofs.**

| Pinned item | Moves when | Proof (the re-recording rule: a control in the same rig) |
|---|---|---|
| `eeg-baseline.json` (physiology outputs, E0) | never by G1–G5 (the renderer is read-only; the brain state is inert at defaults) | byte equality |
| `eeg-signal.test.ts` sample-level cases (determinism, C18, C20–C22) | when the default generator switches (G11) | each case run twice in one test file: `spectral` (the control, unchanged result) and the new renderer; the new values recorded with the cause |
| Depth cells C1–C35 | never re-recorded: they are source cells | the per-cell table (§4.3) on both generators |
| Reader course tests (generic now, BIS-type when merged) | at G11 | both generators in one run; differences by cause |
| Physiology baselines (validation workflow) | only in the pieces of EQ6 | the workflow on the PR, the control being `main` |

### 4.3 Which depth cells the new family has a published mechanism for

[ABS] means an abstract claims the mechanism; "—" means no abstract read claims it.

| Cell group | Corticothalamic family | Wendling | Bojak | Ching 2010/2012 | Plan for a cell without a mechanism |
|---|---|---|---|---|---|
| C1 awake, C3 frontal alpha at LOR, C32 anteriorisation | alpha from thalamic feedback [ABS Robinson 2001]; propofol frontal alpha [ABS Hindriks 2012] | — | — | propofol alpha [ABS 2010] | — |
| C2 beta of sedation, C4 alpha–delta, C5 slope, C7 propofol alpha ≥ 10 Hz | propofol delta, theta and alpha changes [ABS Hindriks 2012] | — | isoflurane power course [ABS] | — | WANTED full texts |
| C6 sevoflurane alpha slowing | — | — | ethers via ligand-gated channels [ABS] | — | WANTED |
| C8–C10 burst suppression, C34 CBF, C35 hypothermia | — | — | — | metabolic burst suppression incl. hypothermia [ABS 2012] | joint to the family WANTED |
| C11–C13 opioids, C14–C15 ketamine, C16 N2O, C17 dexmedetomidine | — | — | — | — | stay on the spectral generator (EQ5 C) or WANTED |
| C28 age | — | — | — | — | WANTED |
| C18–C23 artefacts | unchanged: `artefacts.ts` adds them to any brain signal | | | | — |

The plan therefore does **not** promise parity on C1–C35. It promises the table above, filled in by G0a and measured in
G3a–G4.

### 4.4 The present generator: fallback, and for how long

Three options, ruled by EQ5:
- **(A)** retired at G11 once the new renderer meets every cell it has a mechanism for;
- **(B)** kept as a fallback for a fixed period (for example one release);
- **(C)** both coexist, chosen per scenario: depth-only cards and drug classes without a published mechanism on the
  spectral generator, clinical EEG cards on the renderer.

The plan proposes (C) until the wanted papers for ketamine, N2O, opioids and dexmedetomidine are read. Then (A).

### 4.5 Follower identity

- Determinism stays: seeded streams `seedStream(seed, 'eeg')` and `'eeg-artefact'` (D3), plus one new stream for the
  renderer's noise input.
- The renderer's state (regions, delay buffers) is in the pipeline state, so it is snapshotted and cloned like
  `SynthState`.
- G1 adds a cross-browser identity probe: chromium and webkit render the same 60 s from the same seed and commands, and
  the sample hashes are compared, on the present generator first. §3.6 states the remedy.
- No EEG sample crosses the wire, now or later.

### 4.6 The depth plan's four-channel montage (E10) and E12

- The owner ruled the depth plan's Q10 as B: build the four-channel montage. There is no `l2/eeg/montage.ts` on 44ac1ef4,
  so E10 is not built.
- This plan's G5 makes the 10–20 electrodes, and PSI's four channels become a derivation of them. So E10 should **not**
  be built separately on the spectral generator: building it there would create channels "by construction" (§2, P2),
  later replaced.
- This is a scope interaction to rule in EQ3. Until it is ruled, the PSI reader (E11) waits behind G5 rather than E10.
- The depth window E12 (`apps/demo/src/app/views/depth.ts`) does **not exist** on 44ac1ef4. What exists is the renderer's
  strip, `packages/renderer/src/eeg-strip.ts` (with `test/eeg-strip.test.ts`), and the generic tile e2e
  `apps/demo/e2e/eeg-generic-tile.e2e.ts`.

---

## 5. The pieces

Effort is in **plan hours** and **executor-hours** (plan hours ÷ 8 to ÷ 6, the depth plan's conversion from
`research/42` §2.1). Both are **estimates**.

"Validation" means the piece needs the `run-validation` label: any PR under `packages/engine-core/src/**` that can move a
value (00-common-rules). Every piece writes its tests first, keeps the depth plan's §5 "must not touch" list, and runs
the common gate of the depth plan §5.

**The BIS-type reader proceeds independently.** It is being built from Rampil 1998 and Connor 2022 on today's spectral
generator.
- Its generator-independent tests (§4.1) are its acceptance now.
- Its course tests run on the spectral generator now, and on both at G11.
- No piece here changes a reader's algorithm. Two pieces add a file under `l3/eeg-devices/`: G5 adds `montage.ts`
  (electrode differences only), and G11 re-runs the course tests.

```
G0a sources: equation family ─┐          G0b sources: clinical definitions (ACNS, Salzburg, Trinka, AASM)
G1 seam, harness, measures ───┼─► G2 brain-state container (empty)        │
                              └─► G3a one region, propofol ─► G3b other drug actions
                                        │
                                        ├─► G4 burst suppression (parallel with G5; drug part waits on Q4/EQ6)
                                        └─► G5 regions, head, montage ─┬─► G6a sleep stages ─► G6b the night   ┐ order: EQ1
                                                                       └─► G7a focal ─► G7b generalised ─►     ┘
                                                                            G7c drug termination ─► G7d periodic + convulsive
                                            G5 ─► G8 EEG monitoring window ─► G9 sleep view (EQ8)
                                            G6/G7 pieces ─► G10 scenario events ─► G11 default switch (EQ5)
```

G0b feeds G6 and G7 only, so a late manual blocks neither G3 nor G5.

### G0a: Sources review — the equation family (plan 16 h · 2.0–2.7 executor-h; no code)

**Purpose:** read in full the papers of §7 group 1 and Ching 2012 (group 4) once the owner supplies them, and settle
§3.7's choice against its kill criteria. **Depends on:** those papers. **Files:** `research/<n>-eeg-generator-sources.md`
(new).

**Output:**
- the equations in words;
- the human parameter set, with pages;
- each drug class's published action;
- the joints that are published and those that are not;
- §4.3's table filled in.

**Gate:** docs test. **Validation:** no.

### G0b: Sources review — the clinical definitions (plan 12 h · 1.5–2.0 executor-h; no code)

**Purpose:** answer §1's WANTED rows from the ACNS terminology, the Salzburg criteria, Trinka 2015, the AASM manual and
Silber 2007, and the technical standard for P3. **Depends on:** group 2 and 3 papers. It can run section by section as
papers arrive. **Files:** the same research note, its own section. **Validation:** no.

### G1: The generator seam, the dual-run harness, the measurements (plan 12 h · 1.5–2.0 executor-h)

**Purpose:** let two generators sit behind one interface, run any cell on both, and measure cost, identity and the
bispectral prediction of §2 before the model is built. **Depends on:** nothing (it can start now). **Files:**
- `l2/eeg/generator.ts` (new interface; `synth.ts` wrapped as `spectral`, unchanged);
- `pipeline.ts` (choose by setting);
- `test/helpers/eeg-dual.ts` (new);
- `test/engine/eeg-generator-seam.test.ts` (new);
- an e2e probe `apps/demo/e2e/eeg-identity.e2e.ts`.

**Tests first:**
1. With `spectral` chosen, every existing EEG test is byte-identical.
2. The harness runs C1 to C25 on a named generator and reports per cell.
3. Cross-browser identity: the same 60 s on chromium and webkit gives equal sample hashes, or the probe reports the first
   differing sample (§3.6).
4. Snapshot and clone time and size recorded; step time by the PR #320 method.
5. A bicoherence measure (normalised bispectrum) of today's signal recorded for the awake, alpha–delta and burst
   suppression states, as a measurement, not a pass/fail.

**Must not touch:** `synth.ts`'s arithmetic, the readers. **Gate:** common + the e2e at 2 workers. **Validation:** yes
(engine source; expected unchanged).

### G2: The always-on brain-state container, empty (plan 6 h · 0.8–1.0 executor-h)

**Purpose:** a low-rate state outside D4's device gate, holding no variable yet. Each slow variable arrives with its
piece: metabolism with G4, sleep drive with G6a, seizure excitability with G7a. **Depends on:** G1. **Files:**
`l2/brain-state/` (new), `types-brain-state.ts`, the engine step after the neuro and organ steps.

**Tests first:**
1. `eeg-baseline.json` byte-identical.
2. Snapshot round trip.
3. The state advances with the EEG device off, and switching the device on at any time reads the current state.

**Must not touch:** physiology couplings (EQ6). **Gate:** common. **Validation:** yes.

### G3a: One-region renderer: the numerics, and propofol (plan 24 h · 3.0–4.0 executor-h)

**Purpose:** the hardest piece. It holds:
- the chosen family's region, with its integration step, conduction delay buffers and snapshot;
- one drug action, propofol's published one (Hindriks 2012 or Ching 2010, as G0a settles);
- rendering of the frontal `eeg` channel, with the new generator selectable.

**Depends on:** G0a, G1. **Files:** `l2/eeg/renderer/region.ts`, `drug-actions.ts`, tests.

**Tests first:**
- C1 (RMS 5–10 µV, Ch36 p. 1138);
- C3 (frontal alpha 8–12 Hz at LOR, Ch36 p. 1138);
- C4 (alpha–delta, peaks ≈ 40 µV, Ch36 pp. 1139, 1145);
- C2, C5, C7 (Ch36 pp. 1138–1139, 1143);
- each as "met / missed by cause", per §4.3.
- An import test: `region.ts` reads none of `state.ts`'s fitted variables (§3.4).
- Cost against EQ9; snapshot size.

**Must not touch:** `synth.ts`, `spectra.ts`, the readers. **Gate:** common. **Validation:** yes.

### G3b: The other drug classes on the region (plan 16 h · 2.0–2.7 executor-h)

**Purpose:** the classes whose actions G0a found published on the family: volatiles, barbiturate, etomidate,
benzodiazepine, and any of ketamine, N2O, opioids and dexmedetomidine. A class with no published action stays on the
spectral generator (EQ5 C). **Depends on:** G3a. **Tests first:** C6, C11–C17 per §4.3, met or missed by cause.
**Validation:** yes.

### G4: Burst suppression by the metabolic mechanism (plan 14 h · 1.8–2.3 executor-h; parallel with G5)

**Purpose:** suppression arises from a metabolic slow variable (Ching 2012 [ABS]) acting on the region. **What it
reads:**
- the brain's relative oxygen delivery and the core temperature, the inputs today's `state.ts` already uses
  (`metabolic` from `do2Rel`, `cold` from `tempC`, `cortexStep` lines 161–172);
- for drugs, a drug-to-metabolism action, which needs its own source.

The engine's present CMRO2 multiplier comes from the old index (depth plan §3.1), and reading it would rest the
mechanism on a display-like number. So the drug half is **blocked on the depth plan's Q4 and EQ6**. The hypoxic and
hypothermic halves can go first.

**Depends on:** G2, G3a. **Files:** `l2/eeg/renderer/metabolic.ts`, tests.

**Tests first:**
- C34 (CBF 20 → 12 mL/100 g/min, Ch35 pp. 1105, 1122);
- C35 (15–18 °C, Ch35 p. 1127);
- C10 (< 5 µV, lengthening, forme fruste, Ch36 pp. 1139–1141);
- after Q4/EQ6: C8 (propofol ≈ 5 mcg/mL onset, Ch36 p. 1141), C9 (P-1 as ruled; research/43), C25 (SR 50–80 % when
  targeted, Ch36 p. 1140).

**Must not touch:** CMRO2 physiology. **Gate:** common. **Validation:** yes.

### G5: Regions, the head mixing, the 10–20 electrodes and montages (plan 20 h · 2.5–3.3 executor-h)

**Purpose:** several coupled regions; a fixed mixing to the 10–20 electrodes; montage derivation; `eeg` becomes the
frontal derivation (§4.1's constraint on its sites). **Depends on:** G3a; the head-model reference (§7 group 4); EQ3.
**Files:**
- `l2/eeg/renderer/regions.ts`, `head.ts`;
- `l3/eeg-devices/montage.ts` (electrode differences only: the one new file under the readers' folder);
- `types.ts` (electrode channel ids or one multichannel buffer, decided in the PR with the orchestrator);
- tests.

**Tests first:**
1. Symmetry of homologous channels in the normal EEG (Ch35 p. 1104).
2. Posterior alpha with eyes closed, lost when the eyes open (Ch35 Fig. 35.4). This needs an eyes-open input, which the
   engine lacks (§2, P2), and adds it to the brain state.
3. C32 anteriorisation (Ch36 p. 1138).
4. Blinks largest in the frontal channels (Ch35 Fig. 35.4).
5. The depth readers' tests on the `eeg` channel pass on both generators, or differ by cause (§4.1).

It replaces the depth plan's E10 (§4.6, EQ3). **Gate:** common; cost. **Validation:** yes.

### G6a: Sleep stages and their graphoelements (plan 24 h · 3.0–4.0 executor-h; BLOCKED on G0b's sleep section)

**Purpose:** a sleep drive in the brain state (the Phillips type, once G0a confirms it) moves the regions through W, N1,
N2, N3 and R, and graphoelements arise. A sound evokes a K-complex (Ch09 p. 154). **Depends on:** G2, G5, G0b. **Files:**
`l2/brain-state/sleep.ts`, `l2/eeg/renderer/sleep.ts`, `test/engine/eeg-sleep.test.ts`, and a scorer helper in the tests
only (the AASM rules as read).

**Tests first:**
- Table 9.3's criteria per stage (Ch09 p. 160);
- the α → θ transition at sleep onset (Ch09 p. 153);
- spindles and K-complexes in N2, not in REM (Ch09 pp. 154–155);
- N3 dominated by delta power (Fig. 9.4);
- REM with low chin EMG and eye movements (Ch09 p. 160; channels per EQ8);
- graphoelement numbers from the manual once read.

**Must not touch:** breathing and heart rate (EQ6). **Validation:** yes.

### G6b: The night (plan 12 h · 1.5–2.0 executor-h; BLOCKED on an architecture source)

**Purpose:** the sleep drive's course over a night gives the NREM–REM cycles, with the hypnogram (the plot of stage
against time) read by the G6a scorer. **Tests first:** P12's numbers once sourced. Until then, only that Fig. 9.4's
qualitative picture is met (strong alpha awake, delta-dominated N3, REM with alpha and theta). **Validation:** yes.

### G7a: Focal seizure: onset, evolution, spread, end, post-ictal state (plan 24 h · 3.0–4.0 executor-h; BLOCKED on G0b's ACNS section and the seizure papers; EQ2)

**Purpose:** a focus's excitability (a slow variable in the brain state) takes one region into seizure. Onset, frequency
evolution, spread to coupled regions, termination and the post-ictal state come from the dynamics (Wendling 2002 [ABS]
for focal onset; the slow variable per EQ2). **Depends on:** G2, G5. **Files:** `l2/brain-state/seizure.ts`,
`l2/eeg/renderer/seizure.ts`, tests.

**Tests first:**
1. High-voltage spike and slow waves on the EEG (Ch35 p. 1105).
2. Focal onset is asymmetric (Ch35 p. 1105).
3. Hypocapnia raises excitability (Ch35 p. 1127).
4. A seizure past 5 min is "unlikely to stop spontaneously" (NCC p. 2587): over many seeds most seizures that pass 5 min
   continue. This is a direction test; the share is not a source number.
5. The ACNS definitions of electrographic seizure and evolution, once read; until then the PR stops at the tests above.

**Validation:** yes.

### G7b: Generalised spike-and-wave from the thalamic loop (plan 14 h · 1.8–2.3 executor-h)

**Purpose:** the family's own generalised limit cycles (Robinson 2002 [ABS]). **Depends on:** G7a. **Tests first:**
bilateral synchrony; the ACNS spike-and-wave definition once read. **Validation:** yes.

### G7c: Termination by drugs, and burst suppression under treatment (plan 14 h · 1.8–2.3 executor-h)

**Purpose:** benzodiazepine, propofol and barbiturate end a seizure through each class's published action on the region
(G3b), not a per-drug rule. Third-line treatment gives burst suppression (G4). **Depends on:** G7a, G3b, G4.

**Tests first:**
- stimulation seizures stopped by barbiturate or propofol (Ch35 p. 1116);
- the treatment ladder ends seizures in the order NCC p. 2587 describes (direction);
- burst suppression under refractory treatment.

**Validation:** yes.

### G7d: Periodic and rhythmic patterns, and the convulsion's muscle (plan 16 h · 2.0–2.7 executor-h; BLOCKED on ACNS)

**Purpose:** periodic discharges and rhythmic delta, if the family produces them (G0a). Convulsive seizures drive scalp
EMG through the existing path, masked under paralysis (NCC p. 2587; C18's path). **Tests first:** the ACNS definitions;
EMG → 0 as T1 → 0 during a convulsive seizure. **Must not touch:** physiology couplings (EQ6). **Validation:** yes.

### G8: The EEG monitoring window (plan 16 h · 2.0–2.7 executor-h)

**Purpose:** a clinical EEG strip with a montage selector, sensitivity (µV per mm), time base, filters and a
spectrogram. It is a follower that computes the host's samples (§4.5). **Depends on:** G5; EQ7. **Files:**
`apps/demo/src/app/views/eeg.ts` (new), its e2e, `packages/renderer/src/eeg-strip.ts` (multichannel). §6 has the detail.

**Tests first:**
- Ch35 Figs 35.4–35.5's two montages drawn at 1 s and 50 µV;
- the follower's samples equal the host's;
- the filter and sensitivity defaults `[WANTED: the technical standard, G0b]`.

**Must not touch:** the engine. **Gate:** common + the touched e2e at 2 workers. **Validation:** no.

### G9: The sleep-study view (plan 12 h · 1.5–2.0 executor-h; only if EQ8 says so)

**Purpose:** 30 s epochs, a hypnogram from G6a's scorer, and EOG and chin EMG channels. **Depends on:** G6a, G8. **Tests
first:** the epoch length and the channel set from the AASM manual. **Validation:** no.

### G10: Scenario event kinds (plan 10 h · 1.3–1.7 executor-h)

**Purpose:** cards can script a seizure or a night (§6.2). **Depends on:** G6a or G7a (each event kind with its piece).
**Files:** the scenario format's event list, the controller, `docs/model/` regenerated. **Tests first:**
- each event kind validated;
- a card with a focus at t = 60 s shows a seizure on the strip;
- a card "lights off" moves the sleep drive.

**Must not touch:** existing cards. **Validation:** yes.

### G11: Default switch, re-run of the readers' courses (plan 6 h · 0.8–1.0 executor-h)

**Purpose:** run §4.2's table on both generators and apply EQ5's ruling. **Depends on:** G3a–G5, the readers merged.
**Tests first:** the dual-run report committed; every difference by cause. **Validation:** yes.

| Piece | Plan h | Executor-h [EST] | Validation | Blocked on |
|---|---|---|---|---|
| G0a | 16 | 2.0–2.7 | no | §7 group 1, Ching 2012 |
| G0b | 12 | 1.5–2.0 | no | §7 groups 2–3 |
| G1 | 12 | 1.5–2.0 | yes | — |
| G2 | 6 | 0.8–1.0 | yes | — |
| G3a | 24 | 3.0–4.0 | yes | G0a |
| G3b | 16 | 2.0–2.7 | yes | G0a (drug actions) |
| G4 | 14 | 1.8–2.3 | yes | G0a; drug half on Q4/EQ6 |
| G5 | 20 | 2.5–3.3 | yes | head-model reference; EQ3 |
| G6a | 24 | 3.0–4.0 | yes | G0b (AASM, Silber); EQ1 |
| G6b | 12 | 1.5–2.0 | yes | an architecture source |
| G7a | 24 | 3.0–4.0 | yes | G0b (ACNS, Salzburg, Trinka); seizure papers; EQ1, EQ2 |
| G7b | 14 | 1.8–2.3 | yes | G7a |
| G7c | 14 | 1.8–2.3 | yes | G7a, G3b, G4 |
| G7d | 16 | 2.0–2.7 | yes | ACNS |
| G8 | 16 | 2.0–2.7 | no | EQ7; the technical standard |
| G9 | 12 | 1.5–2.0 | no | EQ8 |
| G10 | 10 | 1.3–1.7 | yes | G6a/G7a |
| G11 | 6 | 0.8–1.0 | yes | EQ5 |
| **All** | **268** | **≈ 34–45** | | |

---

## 6. What the instruments need

### 6.1 The EEG monitoring window and its sharing with the depth window

- **Own route, own instrument (EQ7).** `#/eeg` as its own instrument in the room's picker, one instrument per screen as
  the room plan rules. The depth window (`views/depth.ts`, depth plan E12) is not built yet.
- **What both windows share:**
  - `packages/renderer/src/eeg-strip.ts` (the strip renderer; G8 makes it multichannel);
  - the spectrogram (density spectral array): the generic reader publishes one column, the epoch's own PSD over 0–50 Hz
    in dB, every 2 s (`l3/eeg-devices/generic.ts` header), from the periodogram of `spectral.ts`;
  - the follower rule (§4.5);
  - the impedance display (Ch36 p. 1145).
- **What only the clinical window has:**
  - montage selection, bipolar and referential (Ch35 Figs 35.4–35.5);
  - sensitivity and time base (the figures' calibration is 1 s and 50 µV);
  - filters (low- and high-frequency cut-offs and a mains notch: values `[WANTED: ACNS technical standard]`);
  - event marks (drug given, seizure noted by the instructor).
- **No automatic seizure detector on screen.** Miller states automatic detection is "fraught with false negatives and
  false positives" (NCC p. 2578). If one is ever wanted, it is a reader with its own source.

### 6.2 What a scenario card needs

| Event kind | Fields | Source of its meaning |
|---|---|---|
| `seizure` | focus region, start time, excitability course (or "until treated"), convulsive yes/no | definitions: Trinka 2015, Hirsch 2021 [WANTED]; treatment response from the model (G7); 5 min (NCC p. 2587) |
| `provocation` | hypocapnia already in the engine (PaCO2); a methohexital bolus once the drug row exists | Ch35 pp. 1116, 1127 |
| `sleep` | lights-off time, sleep pressure at start, a sound stimulus (evokes a K-complex) | Ch09 pp. 153–154; Phillips 2007 [ABS] |
| `eeg montage` (instructor or card) | the montage shown on the clinical window | Ch35 Figs 35.4–35.5 |

---

## 7. Papers wanted

**How the DOIs were checked.** Author lists are given as the first author "et al." where only Europe PMC's first-author field was read; Trinka, Brophy and Claassen are as Miller's reference lists print them. All except those marked "not verified" were checked on 11 November 2026 through the
Europe PMC REST search: a query by DOI, title and first author matched, with the returned title and DOI copied. The
abstract was read through the same service where §3.2 says [ABS]. The DOI
`10.1016/j.neuroimage.2012.02.012`, tried first for Hindriks 2012, resolved to an unrelated paper (Touroutoglou 2012).
The correct DOI below was returned by a title search. Group 0 (the BIS-type, Entropy, Narcotrend and PSI readers) is
`research/58-papers-wanted-eeg-2026-11-11.md` and is not repeated.

**Group 1: the equation family (unblocks G0a, G3a, G3b, G5)**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Robinson PA, et al. Prediction of electroencephalographic spectra from neurophysiology. Phys Rev E 2001;63(2 Pt 1):021903 | the corticothalamic family's equations, its human parameter set, scalp filtering | 10.1103/PhysRevE.63.021903 | Europe PMC, DOI query |
| Robinson PA, et al. Dynamics of large-scale brain activity in normal arousal states and epileptic seizures. Phys Rev E 2002;65(4 Pt 1):041924 | arousal states and generalised seizure limit cycles on the same equations | 10.1103/PhysRevE.65.041924 | Europe PMC, title query |
| Hindriks R, et al. Meanfield modeling of propofol-induced changes in spontaneous EEG rhythms. NeuroImage 2012;60(4):2323–2334 | propofol's action on a thalamocortical mean-field model | 10.1016/j.neuroimage.2012.02.042 | Europe PMC, title query |
| Bojak I, et al. Modeling the effects of anesthesia on the electroencephalogram. Phys Rev E 2005;71(4 Pt 1):041902 | anaesthetic action on ligand-gated channels; parameter sets | 10.1103/PhysRevE.71.041902 | Europe PMC, DOI query |
| Ching S, et al. Thalamocortical model for a propofol-induced alpha-rhythm associated with loss of consciousness. PNAS 2010;107(52):22665–22670 | the mechanism of frontal alpha; a reference for the lumped model's propofol action | 10.1073/pnas.1017069108 | Europe PMC, DOI query |
| Jansen BH, et al. Electroencephalogram and visual evoked potential generation in a mathematical model of coupled cortical columns. Biol Cybern 1995;73(4):357–366 | the alternative family (lumped column) | 10.1007/BF00199471 | Europe PMC, DOI query |
| Drug actions for ketamine, N2O, opioids and dexmedetomidine on the chosen family | §4.3's empty rows | — | not identified |

**Group 2: sleep (unblocks G0b, G6a, G6b, G9)**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| American Academy of Sleep Medicine. The AASM Manual for the Scoring of Sleep and Associated Events (current version) | the scoring rules, graphoelement definitions, channels and epochs | a manual (no DOI); the owner's purchase | — |
| Silber MH, et al. The visual scoring of sleep in adults. J Clin Sleep Med 2007;3(2):121–131 | the evidence review behind the AASM rules | 10.5664/jcsm.26814 | Europe PMC, DOI query |
| Phillips AJ, et al. A quantitative model of sleep-wake dynamics based on the physiology of the brainstem ascending arousal system. J Biol Rhythms 2007;22(2):167–179 | the sleep drive (G2) | 10.1177/0748730406297512 | Europe PMC, title query |
| A paper joining the arousal model to the corticothalamic EEG model (if published) | the joint of §3.2 | — | not identified |
| A source on the night's architecture (cycle length and number, the distribution of N3 and REM) | P12 | — | not identified |

**Group 3: status epilepticus (unblocks G0b, G7a–G7d, G8, G10)**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Hirsch LJ, et al. American Clinical Neurophysiology Society's Standardized Critical Care EEG Terminology: 2021 Version. J Clin Neurophysiol 2021;38(1):1–29 | definitions of seizure, ESE, periodic and rhythmic patterns, evolution, burst suppression | 10.1097/WNP.0000000000000806 | Europe PMC, DOI query (full text blocked: PMC captcha, LWW 402) |
| Beniczky S, et al. Unified EEG terminology and criteria for nonconvulsive status epilepticus. Epilepsia 2013;54 Suppl 6:28–29 | the Salzburg criteria | 10.1111/epi.12270 | Europe PMC, DOI query |
| Trinka E, Cock H, Hesdorffer D, et al. A definition and classification of status epilepticus — Report of the ILAE Task Force. Epilepsia 2015;56(10):1515–1523 | the time points; Miller's ref. 298 (NCC p. 2587) | 10.1111/epi.13121 | Europe PMC, DOI query |
| Jirsa VK, et al. On the nature of seizure dynamics. Brain 2014;137(Pt 8):2210–2230 | onset and offset dynamics (EQ2) | 10.1093/brain/awu133 | Europe PMC, DOI query; OUP page paywalled |
| Wendling F, et al. Epileptic fast activity can be explained by a model of impaired GABAergic dendritic inhibition. Eur J Neurosci 2002;15(9):1499–1508 | focal onset inside a region | 10.1046/j.1460-9568.2002.01985.x | Europe PMC, DOI query |
| Brophy GM, Bell R, Claassen J, et al. Guidelines for the evaluation and management of status epilepticus. Neurocrit Care 2012 | treatment timing; Miller's ref. 300 (NCC p. 2587) | not verified | citation from Miller's reference list only |
| Claassen J, Taccone FS, Horn P, et al. Recommendations on the use of EEG monitoring in critically ill patients. Intensive Care Med 2013;39:1337–1351 | cEEG indications and technique; Miller's ref. 110 (NCC p. 2578) | not verified | citation from Miller's reference list |
| The ACNS guideline on minimum technical standards for EEG recording (sampling rate, filters, electrodes) | P3, G8 | not identified | — |

**Group 4: burst suppression and the head (unblocks G0a, G4, G5)**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Ching S, et al. A neurophysiological-metabolic model for burst suppression. PNAS 2012;109(8):3095–3100 | the metabolic slow variable | 10.1073/pnas.1121461109 | Europe PMC, DOI query |
| A head-model reference (a few-shell sphere, or a lead field for the 10–20 set) | the mixing matrix of G5 | — | not identified |

---

## 8. Questions for the owner

**EQ1. Which comes first after the common base: sleep or status epilepticus?**
*Explanation:* both need G0a–G5 first. Then sleep (G6a–G6b, about 4.5–6 executor-hours) and seizures (G7a–G7d, about
9–12 executor-hours) follow, and each is blocked on different papers (AASM,
or ACNS).
*Options:*
- A: status epilepticus first;
- B: sleep first;
- C: whichever's papers arrive first.

*Proposal:* C, with A if both arrive together. Status epilepticus is an anaesthesiologist's emergency (NCC p. 2587).

**EQ2. Does a phenomenological seizure model count as a mechanism?**
*Explanation:* Jirsa's Epileptor (abstract read) describes seizures with five variables whose meaning is dynamical, not
named cells or channels. The alternative is to use only the seizures the corticothalamic family produces itself
(generalised limit cycles, Robinson 2002 abstract) and Wendling's inhibition mechanism for focal onset.
*Options:*
- A: allowed for the slow seizure variable;
- B: not allowed; only cell- or synapse-named mechanisms;
- C: decide after G0a reads the full texts.

*Proposal:* C.

**EQ3. How many channels and which montage; and the depth plan's four-channel E10?**
*Explanation:*
- Miller shows the 10–20 bipolar and referential chains (Ch35 Figs 35.4–35.5).
- More regions give a truer topography and cost more.
- E10 (ruled "built" on 6 November) is not built yet. Building it on today's generator would be replaced.

*Options:*
- A: the full 10–20 set (19–21 electrodes) from about 8–19 regions, with E10 folded into G5;
- B: a reduced ICU set;
- C: keep E10 on the spectral generator now, and G5 later.

*Proposal:* A, E10 folded into G5, PSI waiting behind G5.

**EQ4. Sampling rate of the clinical channels.**
*Explanation:*
- The engine offers 500, 125 and 62.5 Hz.
- 125 Hz holds up to 62.5 Hz. 500 Hz holds up to 250 Hz, and costs more to store and draw.
- The clinical standard's rate is not yet read.

*Options:*
- A: 125 Hz everywhere;
- B: 500 Hz for the clinical channels, with `eeg` staying 125 Hz (decimated);
- C: a new 250 Hz engine rate.

*Proposal:* B until the ACNS standard is read. It uses an existing rate and leaves the depth readers' input unchanged.
One interaction: the depth plan's P-6 may move the `eeg` channel itself to 500 Hz if the BIS source needs an EMG band
above 62.5 Hz. If P-6 is so ruled, `eeg` is decimated to 500 Hz instead, and option B still holds.

**EQ5. What happens to the present generator?**
*Explanation:* the new model has no published mechanism yet for several drug classes (§4.3).
*Options:*
- A: retire it at G11;
- B: keep it as a fallback for one release;
- C: both coexist, chosen per scenario, until the missing drug actions are read.

*Proposal:* C, then A.

**EQ6. Does the always-on brain state couple to physiology now?**
*Explanation:* status epilepticus brings hypoxic respiratory failure, acid–base disturbance, myocardial depression from
treatment and rhabdomyolysis (NCC p. 2587); how much a convulsion raises oxygen use or lactate is `[WANTED]`. Sleep changes breathing and heart rate (Ch09 pp. 153–154). Each such coupling moves physiology numbers
and needs the validation workflow. It is the same question as the depth plan's Q4 for anaesthesia.
*Options:*
- A: couple now, in G6a and the G7 pieces;
- B: EEG only now, couplings as later pieces;
- C: never.

*Proposal:* B, ruled together with the depth plan's Q4.

**EQ7. Is the clinical EEG window its own instrument in the room?**
*Explanation:* the depth window shows an index and a frontal trace. A clinical EEG window shows a montage strip.
*Options:*
- A: its own instrument (`#/eeg`), beside the depth window;
- B: a mode of the depth window.

*Proposal:* A. They share the strip renderer and the spectrogram (§6.1).

**EQ8. What is a "sleep study" in the simulator?**
*Explanation:* a full polysomnogram adds eye, chin, airflow and oximetry channels. An EEG-only view shows stages on the
strip and spectrogram (Fig. 9.4).
*Options:*
- A: EEG and spectrogram only;
- B: a polysomnography view with EOG and chin EMG (the AASM channels);
- C: B plus breathing (needs EQ6).

*Proposal:* A first, B once the AASM manual is read.

**EQ9. The step-time budget for the EEG.**
*Explanation:* today the EEG costs +6 % of the engine's step against a +10 % budget (PR #320). A model of several
regions will cost more. The engine runs at 361× real time, so the limit is fast-forward, not real time.
*Options:*
- A: keep +10 %;
- B: a separate budget while a clinical EEG window is open (for example a ceiling in ms per simulated second, measured
  in G1), the depth tile alone staying within +10 %;
- C: no budget.

*Proposal:* B, with the number set after G1 measures.

**EQ10. Follower identity across browsers.**
*Explanation:* a nonlinear model magnifies last-bit differences between browsers' `Math.exp` and `Math.sin`.
*Options:*
- A: the model uses only exactly rounded arithmetic (its own exponential and sigmoid);
- B: accept drift and resync by snapshot.

*Proposal:* A, if G1's probe shows a difference; nothing if it shows none.

---

## 9. Self-review against the codebase (44ac1ef4) and the sources

| Claim | File and line, or page |
|---|---|
| One frontal channel at 125 Hz; three electrodes; default impedance 2 kΩ | `packages/engine-core/src/l2/eeg/pipeline.ts` (`EEG_RATE`, `EEG_ELECTRODES`, `EEG_IMPEDANCE_DEFAULT_KOHM`) |
| `'eeg'` channel id; sample rates 500, 125, 62.5 | `packages/engine-core/src/types.ts:23`, `:197` |
| Random-phase synthesis, 2 s blocks, sine-window overlap-add, six peaks, BS gate 3.58 s, forme fruste above 2 Hz | `l2/eeg/synth.ts` (`BLOCK_S`, `FF_SPLIT_HZ`, `BS_BURST_S`, `renderBlock`, `synthNext`) |
| Independent phase per frequency; shared gates only | `synth.ts` `renderBlock` (independent `normal()` draws per bin and slot), `synthNext` (gBS × (low + gFF × (bg + Σ e_p · peak_p))) |
| The `spindle` peak is dexmedetomidine's (13 Hz, Akeju 2014), not a sleep spindle | `l2/eeg/spectra.ts` `SPINDLE_HZ`, `SPINDLE_BURSTINESS`, `DEX_SPINDLE_BELOW_PROP_DB` |
| `metabolic` from brain DO2 and `cold` from core temperature feed `suppress` | `l2/eeg/state.ts` `cortexStep`, lines 161–172 |
| Generic reader: SEF95/MF over 0.5–30 Hz, SR over 60 s, a spectrogram column every 2 s | `l3/eeg-devices/generic.ts` header |
| Fitted constants in the generator | `synth.ts` `OSC_BURST_S`, `OSC_DUTY_MIN`, `OSC_RAMP_S`, `FF_DROP_MAX`, `FF_DROP_S`, `FF_FLOOR` tagged `[FIT]` |
| Cortical variables `hyper`, `lor`, `deep`, `suppress`, `ketDepol`, `arousal`, `ageSlope`, `metabolic`, `cold` | `packages/engine-core/src/types-eeg.ts:38–68`; `l2/eeg/state.ts` header |
| EEG device actions on/off/impedance/ecgPickup/model; numerics `sef`, `mf`, `eegSr`, `eegImp` | `types-eeg.ts:107–118` |
| Two seeded streams; nothing read back by physiology | `pipeline.ts` header comment |
| Determinism test; C18, C20–C22 on the engine | `packages/engine-core/test/engine/eeg-signal.test.ts:70`, `:125`, `:138`, `:152`, `:172` |
| E0 baseline fixture | `packages/engine-core/test/engine/fixtures/eeg-baseline.json`; `eeg-baseline.test.ts:124` |
| Readers present: generic only | `packages/engine-core/src/l3/eeg-devices/` (`generic.ts`, `spectral.ts`, `registry.ts`) |
| No `montage.ts`, no `views/depth.ts`; strip renderer exists | file search on 44ac1ef4; `packages/renderer/src/eeg-strip.ts`; `apps/demo/e2e/eeg-generic-tile.e2e.ts` |
| Follower: own engine, snapshot and command replay, identical "on the same build" | `packages/controller/src/session/viewer-sync.ts:1–6` |
| EEG cost +6.0 % (3.33 µs per tick against 55.4 µs) | PR #320's description ("Step-time cost") |
| Engine 2.77 ms per simulated second, 361× real time | `research/00-orchestrator-rulings.md`, the E0 report (line 3990) |
| BIS-type sub-parameters named, incl. SynchFastSlow | `research/58-papers-wanted-eeg-2026-11-11.md` (Rampil 1998 row) |
| Miller pages | Ch09 pp. 153, 154, 155, 160; Ch35 pp. 1104, 1105, 1107, 1116, 1127; Ch36 as the depth plan; NCC pp. 2578, 2587 (the full PDF's pages 204–206, 211; 1332–1333, 1335, 1344, 1355; 3088, 3097) |

**What could not be verified:**
0. Of the code, only `synth.ts` was read in full. `spectra.ts`, `artefacts.ts`, `generic.ts` and `spectral.ts` were read
   by header and constants, `state.ts` by header and the suppression lines, and the tests by title (§2).
1. No model paper was read in full. Every capability in §3.2 is an abstract's claim.
2. The ACNS, Salzburg, Trinka and AASM documents were not read. No value of theirs is used.
3. The chapter number of Miller's "Neurocritical Care" chapter was not found on the pages read.
4. Cross-browser identity of today's EEG has not been measured (G1 does).
5. The cost of a corticothalamic region is an estimate until G1 measures it.
6. Fig. 35.4's printed label "C3–P4" for the right central–parietal chain is read as C4–P4 (a likely typesetting slip;
   the figure itself was not viewed as an image).
7. The DOIs of Brophy 2012 and Claassen 2013 are not verified.

**Disagreements found:**
1. Miller's band edges differ across Ch09's text, Ch09's Table 9.3 and Ch36's Table 36.1 (§1.3).
2. Miller places spindles in "deep" sleep (Ch35) and in N2 (Ch09) (§1.3).
3. Table 9.3's N3 "20 %–50 %" may reflect the older two-stage split. It is to be checked against the AASM manual.
4. The depth plan ruled E10 built (Q10 B); this plan proposes folding it into G5 (EQ3).
5. The depth plan's D7 keeps physiology off the EEG. This plan's always-on brain state is inert by default but invites
   the couplings of EQ6.
