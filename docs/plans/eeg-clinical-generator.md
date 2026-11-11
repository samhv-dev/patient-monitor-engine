# A clinical EEG generator: status epilepticus and sleep beside depth of anaesthesia — Plan

**STATE OF READINESS (12 November 2026, brief 170).** The build is **on hold until the owner's word**. The plan is ready
for that word in the following sense.
- **Settled:**
  - the inventory of clinical uses (§1.5, U1–U37), checked against a full pass over Miller's chapters (the sentence
    on completeness is at the end of §1.5);
  - the owner's rulings, written in: EQ11 = A (the brain's core model always runs), the hold, and the four depth
    readers built now on today's generator (§4.1, §4.6);
  - the four mechanism gaps, each searched and given one outcome (§3.9);
  - the order of the pieces: every sources review comes before any build piece (§5, §5.2).
- **Waits for papers:**
  - the choice of equation family (EQ12), decided in G0a, G0d and X0 together. No model paper is in the library yet:
    `library/sources/papers/eeg/` holds the six reader papers only (§7);
  - every [ABS] row, which stays at abstract level until its paper is read in full;
  - the clinical definitions (ACNS, Salzburg, Trinka, AASM), for G0b.
- **Waits for his rulings:** EQ1–EQ10 and EQ12–EQ23 (§8). Three of them change the structure:
  - EQ3: the montage, now that PSI is built on today's generator;
  - EQ16: the evoked-potential pathways and the motor-evoked potential, as their own plan;
  - EQ21: the ion-concentration layer, and with it spreading depolarisation.

**REFINEMENT (brief 170, 12 November 2026).** Base: `origin/plan-eeg-clinical-generator-amend` **96ea653e** (PR #426,
still open when this was written; it holds the amendment). Worktree `scratch/wt-plan-eeg-refine`, branch
`plan-eeg-clinical-generator-refine`. The refinement:
- adds the full pass and its pages to §1.5, with twelve new uses (U26–U37);
- adds §3.9, the four gap searches and their outcomes;
- writes in the owner's rulings (EQ11 = A; the hold; four readers now, BIS-type first, PR #427);
- adds sources-review pieces G0c, G0d and X0′, puts G1 behind them, and resizes EP2 and EP3 (§5.2);
- reconciles §7 with `research/58-papers-wanted-eeg-2026-11-11.md`;
- revises EQ3, EQ12, EQ13, EQ14 and EQ16, removes EQ11 (ruled), and adds EQ20–EQ23;
- adds a refinement self-review (§9.3).

No code, test, constant, card or kit file was changed.

**STATUS: DRAFT FOR REVIEW (2026-11-11).** A planning executor wrote this plan for brief 166 of the post-demo set. Nothing
in it is ruled until the owner answers §8 and the orchestrator reviews the pieces. No product code, test, constant, card
or kit file was changed while writing it.

**AMENDMENT (11 November 2026, the owner's order after reading the merged draft).** The owner asked whether the model
can show brain death, burst suppression, the encephalopathies, sleep studies, "or anything else that EEG might be used
for". He ruled that what is built must "cover everything, exactly like how body physiology works". Patchwork,
half-finished work and non-physiological workarounds "should never be the choice". The amendment therefore:
- widens the plan from three uses to the whole of clinical EEG (§1.5, the inventory);
- gives each use a mechanism, or an honest gap put to the owner (§3.8);
- makes the always-on brain state and its coupling to the engine's physiology central (§4.7);
- adds the pieces (§5.1), instruments (§6.3), papers (§7, groups 5–9) and questions (EQ11–EQ19);
- revises EQ1, EQ4, EQ5, EQ6 and EQ9.

It also removes every "out of scope" that the plan, not the owner, had decided. The depth plan's §9 exclusions are now
questions (EQ17). Base for the amendment: `origin/main` **33168f2f** (Merge PR #425), worktree
`scratch/wt-plan-eeg-amend`, branch `plan-eeg-clinical-generator-amend`.

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
- **Added by the refinement (brief 170): the full pass.** The 10th edition has no index: the book ends with Ch87's
  references (PDF p. 3283), and the three-page table of contents (`library/sources/tocs/miller-10th-toc.pdf`) lists
  chapters only. **A keyword sweep over all 3283 PDF pages stood in for the index.** Its terms were EEG,
  electroencephalog-, evoked potential or response, SSEP, MEP, BAEP, AEP, brain death, death by neurologic criteria,
  burst suppression, isoelectric, electrocerebral, BIS, bispectral, spectral edge, PSI, entropy, seizure, convulsion,
  epileptic, status epilepticus, myoclonus, polysomnography, REM and slow-wave sleep, sleep architecture, spindle,
  triphasic, encephalopathy and electrocorticography. Every hit outside Ch09/35/36/80 was read in context (about 600
  passages). The four core chapters were read section by section from their headings:
  - Ch09 pp. 152–176;
  - Ch35 pp. 1099–1131, with Table 35.5 in full;
  - Ch36 pp. 1138–1156;
  - Ch80 pp. 2570–2591.

  Printed pages were set from each chapter's running header. The offset (PDF page − printed page) was measured per
  chapter, for example 87 in Ch16, 113 in Ch21, 123 in Ch22, 137 in Ch23, 159 in Ch25, 334 in Ch52, 339 in Ch53,
  445 in Ch71, 476 in Ch75 and 520 in Ch82. Note: Ch24 (neuromuscular blocking drugs) sits inside the split file named
  "Ch23"; its printed pages start at 674 (PDF 820).
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

### 1.5 The inventory: every clinical use of the EEG and evoked potentials found in the sources

**How it was built.** The amendment built U1–U25 from the Miller passages it had read (pages below) and from the
clinical-application passages of Ch35 (pp. 1115–1128). **The refinement (brief 170) did the full pass** described under
"Sources": a section-by-section reading of Ch09, Ch35, Ch36 and Ch80, plus every passage the keyword sweep found in the
other 80 chapters. The pass gave three things:
- new pages and constraints for U1–U25 (§1.5.1);
- twelve new uses, U26–U37 (§1.5.2);
- the completeness statement (§1.5.3).

G0b no longer has to do this pass. Page convention as before. Two more page conventions:
- Ch10 "Cerebral Physiology and the Effects of Anesthetic Drugs": PDF page 278 prints p. 219 (read from the running
  header).
- The Neurocritical Care chapter is **Chapter 80** (its own Table 80.8, p. 2584), still written "NCC".

**Column "Mechanism" uses three levels:**
- **[ABS-claimed]**: an abstract read claims the mechanism produces it.
- **[plausible]**: the planned structure could produce it, but no source read claims so; to be shown.
- **[none identified; searched: …]**: no mechanism found in the search named.

| # | Use | What must be seen (with source, or WANTED) | Mechanism in the planned structure | Level | Piece |
|---|---|---|---|---|---|
| U1 | Depth of anaesthesia, sedation titration | depth cells C1–C35 (depth plan §7.2) | region + drug actions (§3.4) | as §4.3 | G3a, G3b, G4 |
| U2 | Status epilepticus, non-convulsive seizures, seizures after cardiac surgery | §1.2; postoperative subclinical seizures in high-risk children (p. 2314); NCS in critically ill children (p. 2455) | slow excitability + fast dynamics (§3.7) | [ABS-claimed] for generalised (Robinson 2002), focal (Wendling 2002) | G7a–G7d |
| U3 | Sleep and sleep studies | §1.3 | arousal drive + corticothalamic region | [ABS-claimed] spectra and spindles (Robinson 2001) | G6a, G6b, G9 |
| U4 | Barbiturate coma and burst suppression titration | "monitor the effects of barbiturates administered to induce coma" (p. 2455); SR 50–80 % when targeted (Ch36 p. 1140) | metabolic slow variable (Ching 2012) + drug action | [ABS-claimed] (Ching 2012) | G4, G7c |
| U5 | Brain death (electrocerebral inactivity) | prerequisites: an irreversible cause clear; adequate oxygenation and perfusion; confounders corrected: hypothermia, metabolic compromise, sedative or neuromuscular drugs; an apnoea trial with PaCO2 confirmation; an ancillary test when an examination step cannot be completed (NCC p. 2591). EEG used to diagnose "isoelectric brain death" (p. 2455). Recording standard WANTED (ACNS Guideline 6) | global failure of the metabolic variable, made irreversible by an injury state (I1); confounders through the existing drug, temperature and glucose inputs. **A constraint from p. 1113:** thiopental far beyond an isoelectric EEG preserves early cortical and subcortical SSEPs and BAEPs. So drug silence and death must differ in the evoked responses, and the suppression mechanism must reproduce that | EEG silence [ABS-claimed] (Ching 2012 for metabolic suppression); irreversibility: split by the refinement (§3.9 gap 4) into 4a, loss of function and terminal depolarisation (**published mechanism [ABS-claimed]**), and 4b, the transition to cell death (**physiological basis, no EEG model**) | G4, I1a, I1b, BD1, BD2 |
| U6 | Hypoxic-ischaemic injury, cardiac-arrest prognosis | malignant patterns burst suppression, α-coma, low-voltage delta; persisting reactivity good (NCC p. 2578); standardised patterns WANTED (Westhall 2016) | metabolic variable + injury state per region; reactivity = the region's response to the stimulus input | burst suppression [ABS-claimed]; the six common postanoxic categories and their transitions [ABS-claimed] (Ruijter 2017, a mean-field model with thalamic input; refinement, §3.9 gap 4a); α-coma, reactivity [plausible] | G4, I1a, C1 |
| U7 | Hypoglycaemic encephalopathy | glucose falling to about 40 mg/dL: alpha and beta shift to delta and theta; below 20 mg/dL: suppression (flat); persisting: seizures and hippocampal injury (Ch10 p. 219) | glucose as substrate of the metabolic variable (the endocrine glucose state exists) | [plausible] (Ching 2012 claims metabolic suppression; glucose as its input is unread) | G4b |
| U8 | Hypercapnic encephalopathy | hypercapnia has "only indirect effects secondary to increased CBF" unless severe with hypoxaemia (Ch35 p. 1127) | PaCO2 → CBF (the brain model's own) → the metabolic variable; a direct CO2 effect on neurons is WANTED | [plausible] | G4b |
| U9 | Hepatic encephalopathy, triphasic waves | patterns WANTED (Kaplan 2004; ACNS 2021) | ammonia raising neuronal excitability, impairing synaptic transmission, enhancing inhibition, on a Liley-type neural mass | **[ABS-claimed]**: Ligtenstein 2021 (GPDs and their suppression by GABA-ergic drugs; a shared mechanism with NCSE argued); Song 2018 and Song 2019 (Liley family; triphasic-wave periodicity). Note: the Song models' parameters are **fitted to patient EEG by particle filtering**, which the owner's rule would reject as a parameter source | X0, X1, X2 |
| U10 | Minimal hepatic encephalopathy | alpha disturbance WANTED | neuron–astrocyte coupling, reduced astrocytic GABA uptake | [ABS-claimed] (Song 2024) | X2 |
| U11 | Drug-toxic encephalopathy | cefepime: triphasic-like GPDs with a high negative component | GABA-A antagonism; interneuron auto-inhibition | [ABS-claimed] (Tamune 2019); other drugs [none identified; searched: Europe PMC title query "triphasic / encephalopathy + model"] | X4 |
| U12 | Uraemic encephalopathy | patterns WANTED (Kaplan 2004); uraemia lists "muscular irritability, myoclonus, coma" (Ch55 p. 1808) | uraemic guanidino compounds antagonising GABA-A and glycine responses → the region's inhibitory synapse (§3.9 gap 1) | **physiological basis, no EEG model** (refinement, §3.9) | X0′, X3 |
| U13 | Septic encephalopathy | EEG grades normal, excess theta, predominant delta, triphasic waves, suppression or burst suppression (Young 1992 [ABS]) | — | **nothing found as a model; open gap** (refinement, §3.9) | X3 |
| U14 | Focal lesions: tumour, stroke | regional asymmetry with tumours, epilepsy, ischaemia or infarction (Ch35 p. 1105) | a per-region structural property of the patient (lesion) + per-region perfusion | [plausible] | F1, V0 |
| U15 | Carotid endarterectomy, regional ischaemia | EEG abnormal from CBF 20 mL/100 g/min, cell survival threatened at 12, normal 50 (Ch35 p. 1122, Xe washout comparison); SSEP threshold similar but slightly lower (p. 1123); hemispheric ischaemia after ICA clamping (Fig. 35.22, p. 1124) | per-hemisphere / per-territory perfusion → the metabolic variable per region; slowing with voltage preserved first (Ch35 p. 1105) via the "slows only" share | [plausible]; synaptic failure first [ABS-claimed as a mechanism, not an EEG model] (Hofmeijer 2012) | V0, G4b, F1 |
| U16 | Delayed cerebral ischaemia after SAH | a fall of the alpha/delta ratio (Claassen 2004 [ABS]); EEG monitoring in high-risk SAH (NCC p. 2583) | per-territory perfusion falling with vasospasm (a vascular model) | [plausible] | V0 |
| U17 | Hypothermia, CPB, deep hypothermic circulatory arrest | complete suppression usually at 15–18 °C (Ch35 p. 1127); in DHCA, residual activity "is associated with ongoing cerebral metabolism", and "isoelectric silence can then be induced by further cooling" (p. 2314) | temperature acting on metabolism and on synaptic rates | [plausible]; the temperature dependence of rates is WANTED | G4b |
| U18 | ECT | seizure duration prolonged with remifentanil 1 mcg/kg + methohexital 0.625 mg/kg compared with methohexital 1.25 mg/kg alone (Ch22 p. 571) | an electrical stimulus into the region → the seizure mechanism; drugs through their actions | [plausible] | G7e |
| U19 | Intraoperative seizure mapping, awake craniotomy, electrocorticography | afterdischarges after cortical stimulation that may progress to seizures; stopped by iced saline or a small dose of barbiturate or propofol; foci activated by hyperventilation or methohexital (Ch35 p. 1116) | the same stimulus input, on a cortical (not scalp) electrode; temperature per region | [plausible] | G7e |
| U20 | Somatosensory evoked potentials (spine, aortic, carotid, motor strip) | generators: N9 brachial plexus, N11 posterior columns or roots, N13/P13 dorsal column nuclei, N14–15 brainstem or thalamus, N19/P22 parietal cortex (Table 35.2, p. 1109); latency and amplitude (Fig. 35.7, p. 1108); volatiles raise cortical latency and lower amplitude, not subcortical; 0.5–1 MAC with N2O compatible (p. 1112); propofol preferred (p. 1113); thiopental preserves them beyond an isoelectric EEG (p. 1113); etomidate raises cortical amplitude (p. 1113); opioids compatible even in high doses (p. 1113); temperature affects them (p. 1127) | cortical peaks: a stimulus pulse into the thalamic input of the region (Jansen 1995 [ABS] simulates VEPs so). Peripheral and subcortical peaks: a pathway conduction model (nerve, dorsal column, brainstem, thalamus) with temperature-dependent conduction | cortical [ABS-claimed] for VEP only; the pathway: **sourced parts, the joint is this plan's composition** (refinement, §3.9 gap 2) | EP1, EP2 |
| U21 | Brainstem auditory evoked potentials (posterior fossa) | far-field, often < 0.3 µV, 500–2000 repetitions; waves I–VII, VI–VII unreliable under GA (p. 1110); volatiles raise latency without much amplitude change (p. 1112); fentanyl 50 mcg/kg no change (p. 1113) | pathway conduction model (cochlea to inferior colliculus, Fig. 35.10) | **published mechanism [ABS-claimed]**: Dau 2003, Verhulst 2015/2018 (refinement, §3.9 gap 2) | EP2 |
| U22 | Visual evoked potentials | dose-dependent latency rise with volatiles, with or without amplitude change; waveform variability (p. 1112) | pulse into an occipital region (Jansen 1995 [ABS]) | [ABS-claimed] | EP1 |
| U23 | Transcranial motor evoked potentials | anaesthetics' effects "surprisingly profound", because the spinal α-motor neuron integrates corticospinal, propriospinal, cerebellar and subcortical input (p. 1113); 0.3 MAC isoflurane effect shown (Fig. 35.14); infants exquisitely sensitive (p. 1126) | a motor-cortex output → corticospinal conduction → a motor-neuron pool integrating its inputs, with the drug actions on it | **sourced parts, the joint is this plan's composition** (refinement, §3.9 gap 3) | EP3 |
| U24 | EMG and nerve monitoring (cranial nerves, peripheral nerve action potentials) | EMG responses reaching a threshold become audible feedback (p. 1114); nerve action potentials (Fig. 35.21, p. 1122) | peripheral nerve and muscle models (the engine has TOF only) | [none identified] | EQ17 |
| U25 | The depth plan's §9 exclusions: infants and neonates; anaesthetic epileptiform spikes (sevoflurane, etomidate, hypocapnia); xenon; connectivity and complexity indices; nociception indices; auditory evoked potentials (for depth) | as the depth plan cites them | each as its row's mechanism | — | EQ17 |

**Disagreement found.** Status epilepticus in children is defined as more than 20 minutes of continuous motor seizure, or
seizures without awakening in between (p. 2461). The adult chapter says a seizure past 5 minutes is unlikely to stop
(NCC p. 2587). The definitions themselves are G0b's (Trinka 2015).

#### 1.5.1 What the full pass added to U1–U25 (refinement)

**Rule used.** A use was folded into an existing row only when its mechanism, its engine input and its piece are all
the same. Otherwise it got a new row (§1.5.2). Rows were never renumbered.

| Row | Added from the pass (printed pages) |
|---|---|
| U1 | EEG used as the drug-effect measure in PK/PD work: spectral edge and BIS for the effect-site delay (Ch16 pp. 356–358; Ch22 pp. 568–570; Ch23 p. 629 and Table on p. 633). Index-guided closed-loop delivery is U28. Sedation vs anaesthesia (Ch09 p. 167). Airway management raises EEG activity, CMR and CBF (Ch40 p. 1235). Pregnancy: anaesthetic EEG effects similar (Ch58 pp. 1889, 1904). Propofol and sleep EEG similar (Ch17 p. 378; Ch26 p. 779). Depth readers used in cardiac surgery, with the BIS lagging events by its 15–30 s processing (Ch50 pp. 1581–1582, 1600) |
| U2 | NCS frequent in the neuro-ICU; cEEG continuous in unconscious patients (NCC p. 2578). Refractory SE 20–30 % after a benzodiazepine and one second-line agent; super-refractory after 24 h (p. 2587). Early post-traumatic seizures reduced by phenytoin (p. 2581). EEG monitoring in high-risk SAH (p. 2583). Seizures in encephalitis and meningitis (pp. 2589–2590). cEEG in the PICU (Ch75 pp. 2433, 2455). Subclinical seizures after neonatal cardiac surgery (Ch73 p. 2314). NCSE in the differential of terminal delirium (Ch48 p. 1499). Systemic causes are U26 |
| U3 | Opioids reduce deep sleep on polysomnography (Ch22 p. 568). Sleep beyond staging is U29 |
| U4 | Barbiturate therapy under EEG monitoring for raised ICP (NCC p. 2581). EEG to confirm metabolic suppression during temporary aneurysm clipping (Ch35 p. 1119; Ch53 p. 1763). Burst suppression by barbiturate or propofol in total circulatory arrest (Ch50 p. 1623). Barbiturate burst suppression with CBF and CMR about 50 % at complete EEG suppression (Ch10 p. 199; Ch21 p. 524). Tolerance: the thiamylal dose to keep burst suppression rose within 24 h (Ch10 p. 199) |
| U5 | Death by neurologic criteria, and the absence of CBF as an ancillary sign (Ch07 p. 126). CBF studies are the "gold standard" ancillary test, required during barbiturate coma or when an apnoea test cannot be done (Ch75 p. 2456). The systemic course of brain death (Table 57.1, Ch57 p. 1872): catecholamine storm, then profound hypotension; pituitary failure with diabetes insipidus and loss of T3, T4 and ACTH (p. 1873); diabetes insipidus (Ch75 p. 2465). These belong to BD2, not to the EEG |
| U6 | Post-arrest care: "EEG monitoring" in the algorithm (Ch82 p. 2635). The SSEP part is U36 |
| U7 | Infants: insulin hypoglycaemia to 30 mg/dL did not alter the EEG; after 10 minutes of hypocapnic hypoglycaemia it became flat (Ch73 p. 2324). Hypoglycaemia lists seizure activity (Ch29 p. 892) |
| U8 | **Hypocapnia added:** EEG abnormalities and paraesthesia in volunteers hyperventilating to PaCO2 below 20 mmHg (Ch53 p. 1745). Ch35's section "Hypercarbia and Hypocarbia" (p. 1127). The row now reads "hyper- and hypocapnia" |
| U9 | Hepatic encephalopathy defined as brain dysfunction from hepatic insufficiency (Ch13 p. 316). The EEG patterns themselves stay WANTED (Kaplan 2004) |
| U10, U11 | No Miller page found for either. Both stay WANTED for their patterns (Song 2024; Tamune 2019) |
| U14 | A thalamocortical model of cortical lesions after acute ischaemic stroke [ABS-claimed] (van Wijngaarden 2016, found by the gap search). Mechanism level becomes [ABS-claimed] for the lesion's effect on thalamocortical rhythms |
| U15 | Global CBF 50 mL/100 g/min; symptoms at about 30; EEG ischaemia from about 20; isoelectric at about 15. Flat EEG with membranes preserved between about 6 and 12: the penumbra (Ch10 p. 211, Fig. 10.20). Processed EEG less sensitive than raw (Ch52 p. 1733). Contralateral occlusion raises significant ischaemic changes at clamping to nearly 50 % (p. 1733). EEG misses subcortical or small cortical ischaemia; most strokes are embolic (p. 1734). Hyperperfusion after the repair: headache, seizure, oedema (p. 1735). At least four channels (two per side) needed (Ch35 p. 1123). NIRS and EEG/SSEP watch different territories (p. 1124). EEG as a guide during temporary occlusion in aneurysm surgery (Ch53 p. 1763). Interventional neuroradiology (Ch69 p. 2199) |
| U16 | No new page |
| U17 | Accidental hypothermia: EEG activity declines and is absent with progressive hypothermia; reflexes absent below 28 °C (Ch71 p. 2254). EEG silence below the movement threshold, with individual variability (p. 2256). Neonatal hypoxic–ischaemic encephalopathy: whole-body hypothermia to 33.5 °C for 72 h (Ch10 p. 215). Brainstem and cortical EPs and processed EEG altered after DHCA (Ch73 p. 2323). Hypothermia-induced EEG isoelectricity as the endpoint of cooling (Ch50 p. 1623). Evoked-potential temperature data: Stockard 1978 and Markand 1990 (§3.9 gap 2), test bands only |
| U18 | Esmolol shortens ECT seizures (Ch10 p. 197); etomidate gives longer ECT seizures than other hypnotics (Ch21 p. 543); the thiobarbiturate at ECT (Ch21 p. 526); ECT in the pacemaker patient (Ch34 pp. 1096–1097); ambulatory ECT (Ch68 p. 2156) |
| U19 | Video-telemetry electrode placement; propofol stopped at least 15 minutes before the recording, with a residual high-frequency footprint; provocative manoeuvres (Ch53 pp. 1772–1773). Dexmedetomidine does not reduce focal epileptiform activity (Ch21 p. 547); etomidate activates foci (Ch21 p. 542); enflurane's EEG activation used to find foci (Ch10 p. 209). Stereo-EEG and DBS by robot (Ch67 p. 2145) |
| U20 | **Physiological confounders (Ch35 pp. 1127–1128):** below autoregulation the SSEP amplitude falls until loss, with no latency change; cortical responses are more sensitive to hypoperfusion than spinal, brainstem or non-synaptic ones; transient amplitude falls with rapid pressure drops above the lower limit. Hypothermia raises latency and lowers amplitude for all modalities; hyperthermia lowers SSEP amplitude, lost at 42 °C. Hypoxia lowers amplitude. Anaemia raises SSEP and VEP latency below a haematocrit of 15 %, amplitudes fall at about 7 %. **Positioning and limbs:** see U33. **Surgery:** see U32 |
| U21 | BAEPs resist even profound hypotension (MAP 20 mmHg in dogs; Ch35 p. 1127). The other surgical criteria are in U32 |
| U22 | Glycine VEPs: see U35 |
| U23 | Volatiles impede MEPs, and MEPs degrade nonlinearly over a narrow dose range (Ch35 p. 1128). Ketamine and etomidate may improve evoked potentials (p. 1128). Fentanyl and ketamine have little effect on myogenic MEPs (Ch52 p. 1714). Complete NMB makes MEPs impossible (p. 1714). The surgical criteria are in U32 |
| U24 | Spontaneous EMG from stretch, compression, electrocautery heat or ischaemia (Ch35 p. 1122); neurotonic discharges; sharp section may give none (p. 1118); cranial-nerve EMG to tongue and glottis (p. 1118). Triggered EMG for pedicle screws (p. 1121; Table 35.5, p. 1130). A surface-EMG model exists in the motor-unit-pool paper (Fuglevand 1993 [ABS], §3.9 gap 3) |
| U25 | **Infants:** EEG and MAC relation substantially different, cause unknown (Ch72 p. 2273); EEG unreliable in infants (p. 2272). Isoelectric patterns in young children under GA with hypotension (p. 2287). Infants under 3 months barely change from rest to anaesthesia; alpha and theta from 4 months (Ch35 p. 1126). Neonatal tracé alternant (Ch36 p. 1150). Cortical EEG present only 2 % of the time at 24 weeks' gestation (Ch59 p. 1941). **Anaesthetic spikes:** sevoflurane epileptiform activity and tonic–clonic seizures (Ch59 p. 1942; Ch72 p. 2273; Ch10 p. 210). **Research measures:** TMS–EEG connectivity, ERPs by summation over trials, midlatency AEP Pa/Na and implicit memory (Ch08 pp. 138, 145, 149). Phase–amplitude coupling and slow-wave saturation (Ch36 p. 1155) |

#### 1.5.2 New uses found by the full pass (U26–U37)

Same columns and levels as U1–U25. "Engine input" was checked by a search of `packages/engine-core/src` on this
branch; where it was not checked, the row says so.

| # | Use | What must be seen (with source, or WANTED) | Mechanism in the planned structure; engine input | Level | Piece |
|---|---|---|---|---|---|
| U26 | **Provoked seizures from systemic causes** (each cause has its own level; no shared tag) | (a) local anaesthetic toxicity: seizures reported with lidocaine as low as 1.4 mg/kg; the CC/CNS ratio lower for bupivacaine (Ch25 pp. 755, 761–762); infants with bupivacaine infusions (p. 760). (b) Hyponatraemia: seizures and coma, TURP (Ch43 pp. 1353–1354; Ch55 p. 1819, below 110 mEq/L); children below 120 mEq/L (Ch75 p. 2463). (c) Hypocalcaemia and hypomagnesaemia (Ch43 pp. 1356, 1358). (d) Tranexamic acid, through GABA-A binding (Ch46 p. 1449); more seizures at loading doses of 100 mg/kg, 20 mg/kg proposed as the balance (Ch50 p. 1612). (e) Hyperbaric oxygen: seizures rising with PO2 and time (Ch71 pp. 2234, 2244). (f) Eclampsia (Ch58 p. 1908). (g) Normeperidine (Ch22 p. 604; Ch72 p. 2275). (h) Alcohol and drug withdrawal lower the threshold (NCC p. 2587; Ch28 p. 857). (i) Anaesthetic pro-convulsants: large-dose methohexital, ketamine, etomidate, sevoflurane (Ch10 pp. 209–210; Ch21 pp. 527, 542). (j) Others named: cyanide (Ch83 p. 2657), nerve agents (Ch64 p. 2070), CAR-T neurotoxicity (Ch79 p. 2564), retrobulbar local anaesthetic spread (Ch65 p. 2091) | (a) Na-channel block, with its EEG action WANTED; engine: a lidocaine PK row exists, PD antinociception only (`l2/pk/row.ts`). (b, c) Plasma Na, iCa and Mg exist (`l2/blood/solutes.ts`); the brain effect does not. (d) GABA-A antagonism, the same joint as U11; TXA row exists but is inert (`l2/pk/data/rows-other.ts`). (e) No CNS oxygen-toxicity input (ambient pressure not checked). (f–j) Not checked | (a) none identified, not searched; (b, c) none identified, not searched; (d) **physiological basis stated by Miller**, joins U11's mechanism; (e–j) not searched; (i) → U25 | X0′, G7f |
| U27 | **Delirium risk; the elderly patient** | Avoid burst suppression; MAC falls 6 % per decade (Ch61 p. 1995). Severe suppression including burst suppression consistently associated with delirium; EEG-guided trials mixed (p. 1996; Ch78 pp. 2541–2547). Indices less reliable in the elderly; peak alpha slows with age (Ch36 p. 1150). Deep anaesthesia by burst suppression or low index linked with postoperative delirium (p. 1155) | the same region and drug actions as U1 and U4, with age as a patient property (depth cell C28, WANTED) | as U1/U4; age [plausible] | G3b, G4 |
| U28 | **Index-guided closed-loop delivery** | BIS as the controlled variable with PID or model-based controllers for propofol and remifentanil (Ch23 pp. 665–670); TCI with BIS targets (pp. 663–664); PSI-2 against response to stimulation (p. 635) | a controller device reading a depth reader's output and setting a pump; no new physiology. The engine has TCI pumps (not checked) | no new mechanism needed | EQ22 |
| U29 | **Sleep beyond staging** | Respiratory arousal ends an apnoea through chemoreceptors, upper-airway sensors and effort (Ch09 p. 164, Fig. 9.9). Up to 70 % of sedated or ventilated ICU patients show EEG that fits no standard sleep or wake category; deep NREM and REM reduced (p. 173; Table, p. 174). Opioids reduce REM (p. 175). Narcolepsy, cataplexy even under regional anaesthesia (pp. 175–176). Periodic limb movements with arousals (p. 176). High altitude: altered architecture, periodic breathing (Ch70 pp. 2214–2215) | the sleep model's arousal drive with chemical and mechanical airway inputs; engine: airway obstruction exists (`drive.obstruction`, `AirwayState`); chemoreceptor drive not checked | [plausible]; arousal drive [ABS] (Phillips 2007) | G6c |
| U30 | **Spreading depolarisation** (electrocorticography after brain injury) | detection "might" be possible by intracranial ECoG (NCC p. 2578) | ion concentrations and the energy of the pumps in the region: spreading depression and the anoxic "wave of death" (Wei 2014 [ABS]); not in the engine | **published mechanism [ABS-claimed]** | SD1 (not sized), EQ21 |
| U31 | **Acute global hypoxaemia, hypotension, anaemia and CPB during anaesthesia** | hypoxaemia: no EEG change while CBF compensates, then slowing, then abolition (Ch35 p. 1126). Hypotension: changes bilateral and modest, clear in sudden arrhythmias (p. 1127). Evoked-potential confounders as in U20 (pp. 1127–1128). CPB: changes mimic ischaemia (p. 1125; Ch50 p. 1582) | global DO2 and CBF → the metabolic variable; engine: `BrainSummary.cbf`, `pbto2`, haemoglobin (not checked by name) | [plausible] | B1, G4b, EP1, EP2 |
| U32 | **Intraoperative monitoring criteria and procedures** | SSEP phase reversal across the central fissure from a subdural strip (Ch35 p. 1116). Retraction-induced BAEP I–V prolongation (p. 1117). Lateral spread response in hemifacial spasm (p. 1117). Alert examples: 0.5 ms wave V latency, 50 % cortical SSEP amplitude, 80 % tcMEP CMAP (p. 1129). Unilateral change unlikely to be anaesthetic (p. 1129). MEP below 25 % of baseline in TAA repair, every minute (Ch52 p. 1714). D-wave recorded epidurally, resistant to anaesthesia and NMB (Ch60 p. 1980). tcMEP from the anal sphincter; bulbocavernosus reflex (Ch35 p. 1126). Table 35.5 (pp. 1130–1131): the procedures and monitors, including aortic coarctation | each through EP1–EP3 and U24, with surgical causes (retraction, clip, screw, cross-clamp) as scenario events (§6.4); the dipole orientation across the fissure needs region geometry (G5) | as EP1–EP3 | EP1–EP4 |
| U33 | **Positioning and limb ischaemia** | ulnar SSEP and arm position (Ch30 p. 946); brachial-plexus SSEP in sternal retraction and prone arm positions; reversible changes without deficit (p. 948); tongue injury from tcMEP bite (p. 950); limb ischaemia delays peripheral conduction (Ch52 p. 1714) | a compression or perfusion state of a peripheral segment of the pathway; not in the engine | none identified; not searched | EP2 |
| U34 | **Pre-existing neurological disease** | abnormal evoked potentials in MS (Ch31 p. 985); MERRF: generalised spike-and-wave with slowing (p. 982); EEG in the differential of myotonia congenita (p. 979); diabetic neuropathy needs higher MEP stimulation; incomplete myelination in young children (Ch35 p. 1128) | slowed conduction in the pathway (demyelination); a patient property per segment | [plausible]; temperature and MS VEP delay [ABS] (Regan 1977, found in §3.9) | EP2, F1 |
| U35 | **Glycine absorption (TURP)** | VEP prolongation with deteriorating vision after a few hundred mL of 1.5 % glycine (Ch55 p. 1819); hyperglycinaemia and hyperammonaemia in the TURP syndrome (p. 1820) | glycine as a retinal inhibitory transmitter (not read); engine: glycine osmoles exist (`osmOther`, `l2/blood/solutes.ts`) | none identified; not searched | EP1 |
| U36 | **Post-arrest prognosis by SSEP and myoclonus** | SSEPs are much less influenced by drugs and metabolic derangement; bilateral absent N20 and status myoclonus within 72 h are markers of poor outcome (Ch82 p. 2639); in children, a continuous and reactive EEG in the first 7 days predicts good outcome (p. 2647) | the cortical SSEP of EP1 on a region with injury (I1a); myoclonus not modelled | N20 [plausible] via EP1 + I1a; myoclonus none identified, not searched | EP1, C1 |
| U37 | **Hyperthermia** | SSEP amplitude falls with temperature, lost at 42 °C (Ch35 p. 1127) | temperature on the pathway's rates (the same WANTED source as G4b) | [plausible] | EP2, G4b |

#### 1.5.3 Completeness

**The sentence.** Against Miller's 10th edition, the inventory U1–U37 now holds every use of the EEG or of evoked
potentials that its chapters describe in the passages a keyword sweep of the whole book finds, and in Ch09, Ch35, Ch36
and Ch80 read section by section.

**What was not read, and what that leaves open:**
- **Uses described without any keyword of the sweep.** For example, a passage on "brain monitoring" that names neither
  EEG nor a modality was not found. The book has no index to catch these.
- **Pharmacology chapters (Ch16, 17, 21–24) beyond their EEG and seizure passages.** Their drug-by-drug EEG actions
  feed U1 and depth cells C1–C35, and they were taken from the depth plan's reading.
- **The figures and tables of Ch36**, and the figure legends elsewhere, beyond what the text cites.
- **The Miller 9th edition, and every other book in the library.**
- **All references** ("Complete references available online").

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
    any abstract read), that class is `[WANTED]` and does not get a fitted gain. Until its source is read, it may stay on today's spectral
    generator only as a transition with an end condition: the day its action is read and built (EQ5, amended).
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
   classes are WANTED; the spectral generator carries them only as a transition that ends when their actions are read
   (EQ5, amended), and the plan says so on the model page.
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

### 3.8 Mechanism or gap, for every use of §1.5 (amendment)

**1. The family choice gains a discriminator.** The encephalopathy models found are on the **Liley family**, the same as
Bojak 2005's anaesthesia model:
- Song 2018 [ABS]: a mean-field version of "the bursting Liley model, adapted from an earlier cerebral anoxia model";
- Song 2019 [ABS]: a modified Liley neural mass;
- Ligtenstein 2021 [ABS]: "a neural mass model", family not named in the abstract.

The corticothalamic family has the sleep, spindle and generalised-seizure claims (Robinson 2001, 2002). §3.7's leading
candidate therefore stands only if G0a finds the encephalopathy and anoxia mechanisms transferable to it. Otherwise the
choice is a **Liley-type cortex with a thalamic loop added**.

That joint is this plan's composition unless a paper publishes it. G0a's discriminators become:
1. the thalamic loop;
2. a human parameter set;
3. published drug actions;
4. published anoxia and encephalopathy actions;
5. cost per region;
6. **the thiopental constraint** (G0a kill criterion 6): a suppression that silences the EEG while early SSEPs and BAEPs
   survive (Ch35 p. 1113).

**2. Where the structure produces the pattern, and from which state variables.**

| Pattern | Variables | Engine inputs (as they exist on 33168f2f) |
|---|---|---|
| Electrocerebral inactivity | the metabolic variable per region at zero supply, made lasting by the injury state; confounders through drug, temperature and glucose | `BrainSummary.cbf`, `cmro2`, `pbto2` (`types-organs.ts:35–41`), core temperature, the glucose state (`l2/endo/glucose.ts`), the drug bus |
| Hypoxic, hypoglycaemic, hypothermic slowing then silence | the metabolic variable's supply (O2, glucose) and rate (temperature) | as above |
| Regional ischaemia, focal lesion, DCI | the metabolic variable **per region**, from per-territory perfusion | **does not exist**: the brain model has one global CBF; no territories, collaterals or carotid clamp (V0) |
| Hepatic encephalopathy, triphasic waves | excitability, synaptic transmission and inhibition parameters of the region, moved by brain ammonia | **does not exist**: no ammonia variable; the liver publishes `liverFn`, `lactate`, `inr` (`types-organs.ts:47–48`) |
| Cefepime GPDs | GABA-A antagonism on interneuron auto-inhibition | **does not exist**: no cefepime drug row |
| Reactivity | the region's response to the stimulus input (`stimulus`, `antinoc` in `EegCtx`) | exists |
| Cortical evoked potentials | a stimulus pulse into the region's thalamic input, with real sweeps averaged | the region (G3a) |

**3. Where it cannot, and what does, joined to the same structure.**

| Pattern | What joins |
|---|---|
| Peripheral and subcortical SSEP peaks, BAEP | a **pathway conduction model**: a chain of conduction stages with a latency each, temperature-dependent, feeding the region's thalamic input at its end. It is a separate model that shares the region; no paper identified (EP2) |
| tcMEP | a **motor-neuron-pool model**: it integrates the corticospinal drive with the other inputs Miller names (p. 1113), plus the drug actions on it; no paper identified (EP3). The engine's NMB model (TOF) supplies the junction |
| Brain death beyond the EEG | brainstem reflexes, the apnoea test, pupils. The engine has none: `pupilMm` follows opioids only (`l2/neuro/outputs.ts:29`); respiratory drive is not tied to brainstem perfusion; `herniated` is a label set when CPP ≤ 10 mmHg for 60 s, tagged [FIT] (`l2/brain/params.ts:77–78`, `model.ts:153–154`), and changes nothing else. A **brainstem function state** fed by brainstem perfusion and injury is needed (BD2), beyond this plan's EEG |
| Uraemic, septic encephalopathy | **none identified** (searched: one Europe PMC title query for triphasic or encephalopathy with "model"; 25 hits, models only for hepatic and cefepime). Not built until a source exists (EQ14). The engine variables they would need (uraemic solutes; a sepsis brain mediator) also do not exist: the kidney publishes `gfr`, `akiStage`; the sepsis condition has a phase (`types-endo.ts:14–17`); urea appears only as a constant in the osmolality formula (`l2/blood/solutes.ts:48`) |

**Refinement note.** The "no paper identified" and "none identified" entries in this table for EP2, EP3 and the uraemic
and septic rows were written before a proper search. §3.9 replaces them.

**4. No drawn waveform, no fitted shape, no scripted spectrum anywhere in this table.** Where a mechanism is
missing, the row says so and EQ14 asks the owner. A chain is accepted only if every link is sourced and ends on a
parameter the chosen family already has. For example "ammonia → excitability" is sourced in Ligtenstein 2021's
abstract, but the size of the step from a blood ammonia to that parameter is unread.

**5. The fast dynamics and the body (the structural point).**
- A seizure's end, burst suppression's effect on CMRO2, and the seizure's rise in CMR and CBF ("Seizures cause dramatic
  increases in CMR and CBF", Ch10 p. 219) must exist whether or not an EEG device is on.
- If the fast regions run only while a device is on (depth plan D4), nothing decides whether a seizure ends with the
  screen off.
- Three options (EQ11):
  - **(A)** the region model always on, so D4 is lifted for the renderer core; the montage, head mixing and readers stay
    device-gated;
  - **(B)** a published reduced form of the slow course that the fast model agrees with: none identified;
  - **(C)** a scenario declares that the EEG is on throughout. This is a workaround by the owner's rule, so it is not
    offered.
- The plan proposes **(A)**. Cost is then always paid, which makes EQ9 binding and G1's measurement a precondition of G2.

**6. Time scales of the evoked potentials.**
- SSEP and BAEP live on axes of 0–40 ms (Fig. 35.11) and about 0–10 ms (Fig. 35.12; BAEP peaks I–VII within it).
- At the engine's highest rate, 500 Hz (2 ms a sample), BAEP waves cannot be resolved.
- So the evoked-potential sweeps are computed at their own rate, only while an evoked-potential instrument stimulates,
  and averaged over real sweeps (500–2000 for BAEP, p. 1110). Averaging is the instrument's real work, never a
  noise-free template.
- The rate is `[WANTED: the ACNS evoked-potential standard]`. EQ4 is revised accordingly.

**7. EQ11 is ruled A (the owner, 12 November 2026): "the model should always run".**
- The brain's core model runs always. The electrodes, montage, head mixing and readers are switched on with a device.
- Every always-on layer this plan adds joins G1's cost measurement and EQ9's budget for the always-on core. These are
  the region core, the injury state I1a, and, if EQ21 adds it, the ion-concentration layer.
- The evoked-potential sweeps stay instrument-gated, because they exist only while a stimulator runs (point 6).

### 3.9 The four gaps, searched (refinement, brief 170)

**How the searches were done.**
- **Service:** the Europe PMC REST search (`/webservices/rest/search`), read as JSON in memory; no file was saved.
- **Queries:** several per gap, by title words, author and topic, sorted by citations or by relevance.
- **Read:** each paper named below, at least as its abstract through the same service ([ABS]).
- **DOIs:** every DOI below is the one Europe PMC's record returned for that title and first author. No full text was
  read, so no value below comes from these papers; their numbers are WANTED.
- **The test for each outcome:** does a paper publish equations that produce the response recorded clinically? If yes,
  outcome 1. If the parts are published but not their joint, the joint is this plan's composition, with every link
  sourced (outcome 1 for each part, outcome 2 for the joint). Relations between a variable and a measured response
  (latency against temperature, F-wave against MAC) are **test bands, never mechanisms**.

**Gap 1a: uraemic encephalopathy — outcome 2: a physiological basis exists, no EEG model.**
- Searched:
  - "uremic/uraemic encephalopathy" with EEG (281 hits);
  - the same with mechanism, pathophysiology or guanidino (933 hits);
  - title words with GABA, NMDA or neurotransmitter (19 hits);
  - guanidino compounds with GABA or NMDA and uraemia (50 hits);
  - neural-mass or computational models with uraemia or renal failure and EEG (no relevant hit).
- Found:
  - De Deyn & Macdonald 1990 (Ann Neurol, 10.1002/ana.410280505). Guanidine, methylguanidine, creatinine and
    guanidinosuccinic acid, raised in uraemic CSF and brain, inhibit GABA and glycine responses of mouse spinal
    neurons, reversibly and dose-dependently. Guanidinosuccinic acid is the most potent.
  - De Deyn et al. 2001 (Kidney Int Suppl, 10.1046/j.1523-1755.2001.59780077.x): these four compounds are experimental
    convulsants, and epileptic and cognitive symptoms are typical of uraemic encephalopathy.
- **What would have to be modelled:**
  - a uraemic guanidino-compound concentration in the brain, from the kidney's clearance. The engine has `gfr` and
    `akiStage`, and urea only in the osmolality formula;
  - its antagonism of the region's GABA-A synapse. This is the joint that cefepime (U11) and tranexamic acid (U26d)
    also use: one mechanism, three causes.
- The concentration–effect relation is in De Deyn 1990's full text (WANTED). The step from plasma creatinine to
  brain guanidino level is unidentified.
- Note: a mouse spinal-neuron culture is not a human cortex. Whether the same action holds at the cortical synapse is
  for X0′ to state.

**Gap 1b: septic encephalopathy — outcome 3: nothing found as a model; open, named gap.**
- Searched:
  - sepsis-associated or septic encephalopathy with EEG and model, computational, neural mass or mechanism (441 hits);
  - title words with EEG (155 hits);
  - sepsis, LPS or cytokines with neural-mass, neural-field, computational or network models and EEG, cortex or
    delirium (1392 hits; none relevant in the first pages by citation).
- Found:
  - Mazeraud 2020 (Neurotherapeutics, 10.1007/s13311-020-00862-1), a review: the pathophysiology "may involve
    neurotransmitter dysfunction, inflammatory and ischemic lesions to the brain, microglial activation, and
    blood-brain barrier dysfunction".
  - Young 1992 (J Clin Neurophysiol, 10.1097/00004691-199201000-00016): five EEG grades in 62 bacteraemic patients
    (normal, excessive theta, predominant delta, triphasic waves, suppression or burst suppression), the EEG more
    sensitive than the clinical criteria.
- No single mechanism, and no model. The parts that are ischaemic or metabolic would join existing joints: per-region
  perfusion (V0) and the hepatic and uraemic joints. The septic part itself stays an **open gap for the owner (EQ14)**.

**Gap 2: the subcortical SSEP peaks and the BAEP — outcome 1 for each part, outcome 2 for the joint.**
- Searched:
  - ABR or BAEP with model, simulation, computational or "unitary response" (848 hits by citation, no relevant top
    hits), then title words (45 hits);
  - author searches for Dau and Verhulst;
  - "somatosensory evoked" with far-field, generator or model in the title (91 hits);
  - far-field, stationary-peak or junction potential with dipole, volume conductor or model (57 hits);
  - evoked potentials with hypothermia or temperature in the title (19 + 25 hits).
- **BAEP: a published mechanism.**
  - Dau 2003 (J Acoust Soc Am, 10.1121/1.1534833): the ABR is computed as the convolution of a unitary response with
    the instantaneous discharge rate of a nonlinear auditory-nerve model.
  - Verhulst et al. 2015 (J Acoust Soc Am, 10.1121/1.4928305): human ABR from auditory-nerve, cochlear-nucleus and
    inferior-colliculus cell models with broadband peripheral excitation.
  - Verhulst et al. 2018 (Hear Res, 10.1016/j.heares.2017.12.018): the human periphery with evoked potentials and
    hearing loss.
  - Rattay & Danner 2014 (Hear Res, 10.1016/j.heares.2014.07.001): peak I from the somatic regions of type I spiral
    ganglion cells, by a biophysical model.
- **Subcortical SSEP: the parts are published.**
  - Stegeman et al. 1987 (Electroencephalogr Clin Neurophysiol, 10.1016/0013-4694(87)90042-3): a propagating volley
    that meets a change in the volume conductor, or a change of direction, produces non-moving ("far-field") components.
  - Dumitru & Jewett 1993 (Muscle Nerve, 10.1002/mus.880160302), a review of far-field potentials (title only).
  - Mauguière et al. 1983 (10.1016/0013-4694(83)90253-5): the generators of P14 and N18, from lesions of the thalamus
    or its radiations (title only).
  - Desmedt & Cheron 1981 (10.1016/0013-4694(81)90055-9) and 1983 (10.1016/0013-4694(83)90031-7): oesophageal
    recordings of the spinal and far-field components (titles only).
  - No paper found joins these into one simulated SSEP from nerve to cortex.
- **Temperature: test bands only.**
  - Stockard et al. 1978 (Ann Neurol, 10.1002/ana.410030416): hypothermia prolongs central auditory conduction time
    in humans.
  - Markand et al. 1990 (10.1016/0168-5597(90)90002-u): N10, P14 and N19 latencies rise from 37 °C to 20 °C on CPB,
    more for the later components.
- **How it joins the structure:**
  - A volley travels along a chain of segments (peripheral nerve, root, dorsal column, nucleus, medial lemniscus,
    thalamus), each with a conduction delay and a temperature dependence.
  - Each change of the volume conductor along the way gives a stationary peak (Stegeman 1987).
  - At its end, the volley is the thalamic input pulse to the cortical region (EP1), which makes N20/P22.
  - The BAEP chain ends in the inferior colliculus. Its continuation to the thalamus and auditory cortex gives the
    midlatency AEP that U25 needs for depth.
  - The drug actions on these brainstem synapses (volatiles lengthen latency, p. 1112) are WANTED.
- EQ16 becomes "its own plan, now with papers".

**Gap 3: the motor-neuron pool behind the MEP — outcome 1 for each part, outcome 2 for the joint.**
- Searched:
  - motor-unit or motoneuron pool with model or simulation in the title (8 hits);
  - I-wave, D-wave or corticospinal volley with model (41 hits, mostly physics);
  - anaesthetics with motoneuron, spinal cord, F-wave or H-reflex and excitability (108 hits);
  - author searches for Fuglevand, Rampil, Rusu and Zhou;
  - MEP with train, multipulse or temporal summation (5 hits).
- Found:
  - Fuglevand et al. 1993 (J Neurophysiol, 10.1152/jn.1993.70.6.2470): a pool of 120 motor units, recruitment and
    firing times under excitatory drive, with force and surface EMG.
  - Rusu et al. 2014 (Brain Stimul, 10.1016/j.brs.2014.02.009): a model of TMS-induced I-waves in motor cortex.
    Schaworonkow & Triesch 2018 (10.1016/j.brs.2018.03.010): ongoing rhythms shape I-waves (title only).
  - Taylor et al. 1993 (J Neurol Neurosurg Psychiatry, 10.1136/jnnp.56.1.104): a double pulse gives temporal
    summation in the cord, so a maximal CMAP is obtained under good surgical anaesthesia.
  - King & Rampil 1994 (Anesthesiology, 10.1097/00000542-199412000-00024) and Rampil & King 1996 (Anesthesiology,
    10.1097/00000542-199607000-00018): volatile anaesthetics depress α-motoneuron excitability, measured by F-waves
    in rats.
  - Zhou & Zhu 2000 (Anesthesiology, 10.1097/00000542-200007000-00010): isoflurane's effect on the MEP and the F-wave
    in 12 patients.
- **How it joins the structure:**
  - the motor region (G3a, G5) makes a D-wave and I-waves (Rusu 2014);
  - corticospinal conduction is the pathway model of gap 2;
  - the motor-neuron pool (Fuglevand 1993) sums the descending volleys; its excitability is lowered by the drug
    actions;
  - the junction is the engine's NMB model (TOF);
  - the CMAP is the pool's summed output.
- Miller's "surprisingly profound" effect (p. 1113) is then the product of cortical, spinal and junctional
  depression, a result to be shown rather than drawn.
- The motoneuron dose–response for each drug is WANTED: the rat F-wave abstracts are not human; Zhou 2000's full
  text is.

**Gap 4: what makes ischaemic injury irreversible — split into two items, one outcome each.**
- Searched:
  - Jones 1981 by author and title;
  - van Putten as author, with postanoxic, anoxia, "wave of death", ischaemia or synaptic, and with model (20 hits);
  - ischaemia, anoxia or hypoxia with model and neuron, ion or depolarisation in the title (337 hits, mostly
    pharmacology);
  - spreading depolarisation or depression with model in the title (105 hits);
  - author searches for Kalia, Zandt, Dronne (0 hits) and Wei/Schiff.
- **4a. Loss of function and the terminal (anoxic) depolarisation — outcome 1: a published mechanism [ABS].**
  - Wei, Ullah & Schiff 2014 (J Neurosci, 10.1523/jneurosci.0516-14.2014): Hodgkin–Huxley extended with conservation
    of particles and charge and the energy to restore ionic gradients. As a function of potassium and oxygen it
    produces spikes, seizures, spreading depression and the terminal anoxic "wave of death".
  - Zandt et al. 2011 (PLoS One, 10.1371/journal.pone.0022127): one neuron with its ion concentrations. When the
    Na/K pumps stop, membrane oscillations give the high-amplitude slow wave seen about a minute after decapitation.
  - Zandt et al. 2014 (J Comput Neurosci, 10.1007/s10827-014-0517-5): neural-mass equations built from single-cell
    dynamics, so that ion concentrations act on the EEG.
  - Ruijter et al. 2017 (Clin Neurophysiol, 10.1016/j.clinph.2017.06.245): a mean-field model (excitatory and
    inhibitory neurons, thalamic afferents). Anoxic damage is aggravated short-term synaptic depression recovering
    over many hours, with excitatory transmission potentiated. It reproduces the six common postanoxic EEG categories
    and their transitions in time, against 155 patients. Whether its parameters were fitted to those patients is not
    stated in the abstract (EQ13).
  - Kalia et al. 2023 (bioRxiv **preprint**, 10.1101/2023.04.07.535995): interacting thalamic and cortical neural
    masses with energy-dependent synaptic transmission reproduce the EEG of ischaemia. No peer-reviewed version was
    found in Europe PMC.
  - **Structural consequence:** these models carry an ion-and-energy layer that may be the same thing as the
    "metabolic variable" of Ching 2012 (its ATP-gated potassium current). That is a seventh G0a discriminator (EQ12,
    EQ21).
- **4b. The transition to cell death — outcome 2: a physiological basis, no EEG model.**
  - Miller: between about 10 and 20 mL/100 g/min neuronal dysfunction is temporarily reversible, and neurons die
    if flow is not restored (Ch10 p. 211, Fig. 10.20). In the 6–12 range, energy cannot support electrical activity
    but can prevent complete membrane failure "for extended periods" (Fig. 10.20 legend). The cascade from energy
    failure through calcium, enzymes, radicals and DNA damage to death is Ch10 p. 212, Fig. 10.22.
  - Jones et al. 1981 (J Neurosurg, 10.3171/jns.1981.54.6.0773), awake monkeys: thresholds of flow for paralysis and
    for infarction that depend on duration (abstract; full text WANTED).
  - **What would have to be modelled:** the death of tissue as a function of how far and how long the supply falls.
    No paper found models this so that it ends on a parameter of an EEG family.
  - A flow × duration integrator drawn through two thresholds would be a fitted rule, so **I1b is not sized on it**.
    The thresholds of Ch10 p. 211 and Jones 1981 are offered as **test bands** for whatever mechanism the owner
    accepts (EQ20).
  - The thiopental constraint (Ch35 p. 1113) still holds for both items: drug silence must not be death.

**New use found by the searches.** U14 gains van Wijngaarden et al. 2016 (PLoS Comput Biol,
10.1371/journal.pcbi.1005048), a thalamocortical model of the effect of cortical lesions after acute ischaemic stroke
[ABS]. U34 gains Regan et al. 1977 (J Neurol Neurosurg Psychiatry, 10.1136/jnnp.40.11.1083), body temperature and VEP
delay in multiple sclerosis, as a test band.

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
- **The owner's ruling (12 November 2026):** all four named depth readers are built now on today's spectral
  generator, BIS-type first (PR #427, from Rampil 1998 and Connor 2022), then Entropy, Narcotrend and PSI. The build of
  this plan is on hold. So this section must keep all four valid through every piece, and it does so by the split
  below. PR #427 already records one generator-dependent fact for G11 to explain: on today's generator the mean
  bicoherence is at the level of no phase coupling (0.163–0.167 at every depth), "as expected from a spectral
  synthesiser with random phases". It also records C28 (age) as an expected miss.
- **Reader tests split into two kinds.** This is what lets the four readers proceed now:
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

The plan proposes (C) **only as a transition with an end condition** (amended): it ends class by class when each
class's action is read and built. Then (A). By the owner's rule a permanent coexistence would be a workaround.

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
- **Superseded by the owner's ruling (refinement, 12 November 2026).** PSI is among the four readers built now on today's
  generator, so it cannot wait behind G5, and its four channels must come from somewhere before G5. The plan's answer
  keeps every reader valid without channels "by construction" being presented as physiology:
  - **E10 is built now as an interface:** the montage as electrode differences over named sites (the file G5 would
    have added, `l3/eeg-devices/montage.ts`). The reader takes N channels through it.
  - **Its channel source on today's generator is the depth plan's own E10 design.** The PSI features that need true
    topography (for example anteriorisation, asymmetry) are recorded as expected misses in
    `docs/validation/known-misses.md` with the cause "one generator source", never tuned.
  - **At G5 the source becomes the 10–20 electrodes of the regions and head mixing.** The montage file does not
    change; PSI's course tests are re-run at G11 with the other three readers, and each difference is reported by
    cause.
  - EQ3 is revised to ask the owner exactly this.
- The depth window E12 (`apps/demo/src/app/views/depth.ts`) does **not exist** on 44ac1ef4. What exists is the renderer's
  strip, `packages/renderer/src/eeg-strip.ts` (with `test/eeg-strip.test.ts`), and the generic tile e2e
  `apps/demo/e2e/eeg-generic-tile.e2e.ts`.

### 4.7 The brain state and the engine's physiology (amendment: now central)

**Every input is produced by physiology, never by a scenario flag.** A card may cause a cause: a carotid clamp, an
insulin overdose, a liver failure, a cardiac arrest. It never switches a pattern on.

| Brain-state input | Exists on 33168f2f | Missing | Piece |
|---|---|---|---|
| Oxygen delivery and CBF, global | `BrainSummary.cbf` (relative to 50), `cmro2`, `pbto2`, `cpp`, `icp` | — | B1 |
| CBF and DO2 per region | — | per-territory perfusion, collaterals, carotid clamp, vasospasm | V0 (own plan, EQ15) |
| Glucose | the endocrine glucose state (`l2/endo/glucose.ts`) | brain glucose uptake as a function of supply | B1, G4b |
| CO2 | `BrainSummary.paco2`; the brain model's CO2 reactivity of CBF | a direct neuronal CO2 effect (WANTED) | B1 |
| Temperature | core temperature (`CortexInputs.tempC`, `types-eeg.ts`) | brain temperature distinct from core (WANTED) | B1 |
| Liver failure | `LiverSummary.liverFn`; condition `hepaticFailure` (`types-organs.ts:31`) | blood and brain ammonia | X1 |
| Kidney failure | `KidneySummary.gfr`, `akiStage` | uraemic guanidino compounds in brain (§3.9 gap 1a) | X0′, X3 |
| Sepsis | endocrine condition `sepsis` with phase | no mechanism (§3.9 gap 1b) | X3 (open gap) |
| Electrolytes (refinement) | plasma Na, K, iCa, Mg, glycine osmoles (`l2/blood/solutes.ts`) | their brain effects (U26b–c, U35) | X0′, G7f |
| Drugs that provoke seizures (refinement) | lidocaine PK row (PD antinociception only); TXA row (inert) | their convulsant actions (U26a, d) | X0′, G7f |
| Peripheral and spinal pathway (refinement) | — | segment perfusion, compression, temperature, demyelination (U33, U34) | EP2 |
| Ion concentrations and pump energy (refinement) | — | the layer of §3.9 gap 4a, if EQ21 adds it | G0d, SD1 |
| Drugs | the drug bus (`hypByClass`, MAC fractions, fentanyl equivalent, dexmedetomidine Ce) | cefepime, methohexital, phenytoin-class rows as needed | G3b, X4, G7c |
| Injury and irreversibility | — | 4a: synaptic and energy failure per region (published, §3.9); 4b: cell death (no EEG model, EQ20) | I1a, I1b |
| Brainstem function | — | reflexes, pupils, drive from brainstem perfusion | BD2 (own plan, EQ15) |

**What the brain state gives back** (each a validation-workflow piece, B2):
- seizure → CMRO2 and CBF (Ch10 p. 219), and muscle oxygen use (the paediatric chapter states increased brain and
  skeletal-muscle metabolism and oxygen consumption in status epilepticus, p. 2461; its size WANTED);
- burst suppression → CMRO2 (depth plan Q4; Ch36 p. 1141);
- sleep → breathing and heart rate (Ch09 pp. 153–154; sizes WANTED).

This replaces EQ6's "whether" with "which first".

---

## 5. The pieces

Effort is in **plan hours** and **executor-hours** (plan hours ÷ 8 to ÷ 6, the depth plan's conversion from
`research/42` §2.1). Both are **estimates**.

"Validation" means the piece needs the `run-validation` label: any PR under `packages/engine-core/src/**` that can move a
value (00-common-rules). Every piece writes its tests first, keeps the depth plan's §5 "must not touch" list, and runs
the common gate of the depth plan §5.

**The four depth readers proceed independently** (the owner's ruling, 12 November 2026). BIS-type is being built
first, from Rampil 1998 and Connor 2022 (PR #427), then Entropy, Narcotrend and PSI, all on today's spectral
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

**Order amended by the refinement (§5.2):** G1 no longer starts in parallel with G0a. Every sources review (G0a, G0b,
G0c, G0d, X0′) comes before any build piece.

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
bispectral prediction of §2 before the model is built. **Depends on:** the owner's word to start, and (refinement,
by the brief's order rule) the sources reviews G0a, G0b, G0c, G0d and X0′ being done. G1 itself needs no paper; it
waits only so that no build piece starts before the sources. **Files:**
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

### 5.1 Pieces added by the amendment

Same rules as §5: tests first, sources beside each test, the validation workflow for every engine piece, estimates
only. **The BIS-type reader still proceeds now.** None of these touches a reader's algorithm.

**Order changes:**
- G1 now also measures the cost of the region model running always (EQ11 A). Its result is a precondition of G2.
- G2 holds the region core when EQ11 is ruled A.
- G4 now runs per region from the start, so G5's regions nest inside V0's territories (or inside the hemispheres until
  V0 exists).

```
G1 ─► G2 (+ region core always on, EQ11) ─► B1 inputs ─► G4 / G4b ─► I1 injury ─► C1 coma, reactivity, prognosis
                                              │                        └─► BD1 brain-death view; BD2 own plan
                                              ├─► B2 the brain state back to the body (EQ6)
G5 ─► F1 focal lesions ─► (V0 own plan) ─► regional ischaemia, DCI cells
X0 sources ─► X1 ammonia ─► X2 hepatic / triphasic;  X4 cefepime;  X3 blocked (uraemic, septic)
G3a ─► EP1 cortical EPs ─► EP4 EP instrument;  EP2 pathways, EP3 MEP: own plans or pieces (EQ16)
G7a ─► G7e ECT and cortical stimulation
```

**B1. Brain-state inputs from physiology (plan 10 h · 1.3–1.7 executor-h).** The brain state reads the inputs of §4.7's
"exists" column every step. **Tests first:** each input moves the state in the direction its source states:
- CBF 20 → 12 mL/100 g/min (Ch35 p. 1122);
- glucose 40 → 20 mg/dL (Ch10 p. 219);
- 15–18 °C (Ch35 p. 1127).

At defaults E0's baseline is byte-identical. **Validation:** yes.

**B2. The brain state back to the body (plan 20 h · 2.5–3.3 executor-h; EQ6, with the depth plan's Q4).**
Seizure → CMRO2 and CBF (Ch10 p. 219) and muscle oxygen use (p. 2461); burst suppression → CMRO2. **Tests first:**
directions from those pages; sizes WANTED, so a direction test until sourced. **Validation:** yes. **Must not touch:**
`depth.ts`'s old index until Q4 is ruled.

**G4b. Substrates and temperature: hypoxia, hypoglycaemia, hypercapnia, cooling and DHCA (plan 16 h · 2.0–2.7
executor-h).** **Tests first:**
- glucose 40 mg/dL → alpha and beta to delta and theta; below 20 mg/dL → flat; persisting → seizures (Ch10 p. 219);
- ischaemia: slowing with voltage kept, then loss (Ch35 p. 1105);
- hypercapnia only through CBF unless severe with hypoxaemia (Ch35 p. 1127);
- 15–18 °C → complete suppression; residual activity in deep hypothermia falls to silence with further cooling
  (Ch35 p. 1127; p. 2314).

**Validation:** yes. **Blocked on:** the temperature dependence of the family's rates (WANTED).

**I1. The injury state: irreversibility (plan 16 h · 2.0–2.7 executor-h; BLOCKED on its mechanism).**
A per-region energy debt turning into lasting synaptic and then membrane failure (Hofmeijer 2012, van Putten 2016
[ABS], full texts WANTED). **Tests first:** silence that persists after supply returns, only past the source's
threshold; reversible silence under thiopental (Ch35 p. 1113 constraint). **Validation:** yes.

**C1. Coma patterns, reactivity, prognosis after cardiac arrest (plan 16 h · 2.0–2.7 executor-h).**
**Tests first:**
- burst suppression, α-coma and low-voltage delta after anoxia; reactivity present means a good course (NCC p. 2578);
- Westhall 2016's standardised categories once read.

A pattern the model does not produce is a recorded miss, never drawn. **Depends on:** G4, I1, G5. **Validation:** yes.

**F1. Focal lesions (plan 12 h · 1.5–2.0 executor-h).** A lesion is a patient property per region (structure, like an
anatomical condition), not a pattern flag. **Tests first:** asymmetry with a lesion (Ch35 p. 1105); symmetry without.
**Depends on:** G5. **Validation:** yes.

**V0. Regional cerebral perfusion (its own plan; not sized here, as the hub plan's H11c).** **Interface the EEG needs:**
- per-territory (at least per hemisphere) CBF and DO2;
- a carotid clamp action;
- collateral flow;
- vasospasm.

**Cells it must meet:** Ch35 p. 1122 (20 / 12 / 50 mL/100 g/min), Fig. 35.22, and Claassen 2004's alpha/delta fall (full
text WANTED). EQ15.

**X0. Sources review: encephalopathies (plan 10 h · 1.3–1.7 executor-h; no code).** Read in full Kaplan 2004,
Ligtenstein 2021, Song 2018, Song 2019, Song 2024 and Tamune 2019, plus a search for uraemic and septic mechanisms.
State for each:
- which parameters are physiological;
- which are fitted to EEG (the Song models' particle filter);
- whether they transfer to the chosen family.

**X1. Ammonia in the engine (its own piece in the liver model; not sized: equations unidentified).** Blood ammonia from
liver function and its brain level. Source WANTED (a hepatic ammonia kinetics paper). **Validation:** yes.

**X2. Hepatic encephalopathy and triphasic waves (plan 20 h · 2.5–3.3 executor-h; BLOCKED on X0, X1).**
Ammonia → excitability, synaptic impairment and inhibition on the region (Ligtenstein 2021 [ABS]). **Tests first:**
- GPDs/triphasic waves appear with rising ammonia;
- they are suppressed by a GABA-ergic drug (Ligtenstein 2021 [ABS]);
- the minimal form's alpha disturbance (Song 2024 [ABS]);
- the ACNS definitions (G0b).

**Validation:** yes.

**X3. Uraemic and septic encephalopathy (not built; BLOCKED on a source of mechanism).** EQ14. X0's search result is
written to the model page as a known gap.

**X4. Drug-toxic encephalopathy: cefepime (plan 12 h · 1.5–2.0 executor-h; BLOCKED on X0 and a cefepime drug row with
its PK).** GABA-A antagonism → interneuron auto-inhibition (Tamune 2019 [ABS]). **Tests first:** the Tri-HNC pattern and
its recovery course. **Validation:** yes.

**G7e. ECT and cortical stimulation (plan 10 h · 1.3–1.7 executor-h).** An electrical stimulus into the region drives
the seizure mechanism. **Tests first:**
- remifentanil + methohexital prolongs the seizure against methohexital alone (Ch22 p. 571, direction);
- afterdischarges after cortical stimulation, stopped by barbiturate or propofol, and activated by hyperventilation or
  methohexital (Ch35 p. 1116).

**Depends on:** G7a. **Validation:** yes.

**EP1. Cortical evoked potentials (plan 20 h · 2.5–3.3 executor-h).** A stimulus pulse into the thalamic input of the
sensory, auditory or visual region (Jansen 1995 [ABS] for VEPs), computed at the EP rate (§3.8 point 6) and averaged over
real sweeps. **Tests first:**
- volatiles raise cortical SSEP latency and lower amplitude (p. 1112);
- etomidate raises amplitude (p. 1113);
- propofol permits monitoring (p. 1113);
- thiopental beyond an isoelectric EEG preserves the early cortical SSEP (p. 1113: the kill criterion);
- cortical SSEPs fail at a CBF slightly below the EEG's threshold (p. 1123, direction);
- temperature moves them (p. 1127).

**Validation:** yes.

**EP2. Pathway conduction for subcortical SSEP peaks and the BAEP (own plan or piece, EQ16; not sized: no paper).**
Must meet the generator table (Table 35.2), BAEP waves I–V (p. 1110), volatile latency without amplitude (p. 1112) and
fentanyl 50 mcg/kg no change (p. 1113).

**EP3. Motor evoked potentials (own plan or piece, EQ16; not sized: no paper).** Must meet "surprisingly profound"
anaesthetic depression through the motor-neuron pool's integration (p. 1113), and Fig. 35.14's 0.3 MAC isoflurane
effect.

**EP4. The evoked-potential instrument (plan 16 h · 2.0–2.7 executor-h).** §6.3. **Validation:** no.

**BD1. The brain-death recording view (plan 12 h · 1.5–2.0 executor-h; BLOCKED on ACNS Guideline 6).** §6.3.
**Validation:** no.

**BD2. Brainstem function (its own plan; not sized).** Reflexes, pupils, apnoea-test response from brainstem perfusion
and injury (§3.8 point 3). EQ15.

| Piece | Plan h | Executor-h [EST] | Validation | Blocked on |
|---|---|---|---|---|
| B1 | 10 | 1.3–1.7 | yes | G2 |
| B2 | 20 | 2.5–3.3 | yes | EQ6, depth Q4 |
| G4b | 16 | 2.0–2.7 | yes | temperature dependence WANTED |
| I1 | 16 | 2.0–2.7 | yes | injury mechanism WANTED |
| C1 | 16 | 2.0–2.7 | yes | G4, I1, Westhall 2016 |
| F1 | 12 | 1.5–2.0 | yes | G5 |
| X0 | 10 | 1.3–1.7 | no | the encephalopathy papers |
| X2 | 20 | 2.5–3.3 | yes | X0, X1 |
| X4 | 12 | 1.5–2.0 | yes | X0, a cefepime row |
| G7e | 10 | 1.3–1.7 | yes | G7a |
| EP1 | 20 | 2.5–3.3 | yes | G3a, the EP rate source |
| EP4 | 16 | 2.0–2.7 | no | EP1 |
| BD1 | 12 | 1.5–2.0 | no | ACNS Guideline 6 |
| **Added** | **190** | **≈ 24–32** | | |
| **Plan total with §5** | **458** | **≈ 57–76** | | |
| Not sized (own plans or unidentified equations) | V0, BD2, EP2, EP3, X1, X3 | | | |

### 5.2 Pieces changed or added by the refinement (brief 170)

**The order rule (the brief): nothing of the build starts before the sources-review pieces.** All five reviews are
documents and need no code:
- G0a, the equation family;
- G0b, the clinical definitions;
- G0c, the evoked-potential pathways and the motor system (new);
- G0d, ischaemia, injury and ion dynamics (new);
- X0′, the encephalopathies and provoked seizures (X0 widened).

Every build piece follows them, G1 included. Two dependencies matter most:
- **The family decision (EQ12) waits for G0a, G0d and X0′ together.** The anoxia, ischaemia and encephalopathy models
  bear on the choice: their ion-and-energy layer and their mean-field families (§3.9 gap 4a; §3.8 point 1).
- **G0b still gates only G6 and G7.** A late manual blocks neither G3 nor G5.

```
G0a family ─┐
G0d ischaemia, injury, ions ─┼─► EQ12 ruled ─► G1 seam, harness, cost (now incl. every always-on layer)
X0′ encephalopathies, seizures ─┘                    │
G0b clinical definitions ──────────────────────────────┼─► (G6, G7 only)
G0c EP pathways, motor ──────────────────────────────┼─► EP2, EP3 (own plan, EQ16)
                                                     └─► G2 … G11 as §5 and §5.1
```

**G0c. Sources review: evoked-potential pathways and the motor system (plan 12 h · 1.5–2.0 executor-h; no code).**
- **Read in full:** Dau 2003, Verhulst 2015 and 2018, Rattay & Danner 2014, Stegeman 1987, Dumitru & Jewett 1993,
  Mauguière 1983, Fuglevand 1993, Rusu 2014, Taylor 1993, King & Rampil 1994, Rampil & King 1996, Zhou & Zhu 2000,
  Stockard 1978 and Markand 1990, plus the ACNS evoked-potential standard once identified.
- **State for each:** the equations in words; which parameters are human; which were fitted; and how it ends on the
  region's thalamic input (sensory, auditory) or the NMB model (motor).
- **Output:** EP2's and EP3's own plan (EQ16).
- **Validation:** no.

**G0d. Sources review: ischaemia, injury and ion dynamics (plan 12 h · 1.5–2.0 executor-h; no code).**
- **Read in full:** Wei 2014, Zandt 2011 and 2014, Ruijter 2017, Kalia 2023 (or its journal version), Hofmeijer 2012,
  van Putten 2016 and Jones 1981.
- **State:**
  - whether the ion-and-energy layer is the same variable as Ching 2012's metabolic one (EQ12, EQ21);
  - whether Ruijter 2017's values were fitted to patients (EQ13);
  - what 4b's test bands are.
- **Validation:** no.

**X0′. Sources review: encephalopathies and provoked seizures (X0 widened; plan 14 h · 1.8–2.3 executor-h; no code).**
- X0's list, plus De Deyn & Macdonald 1990, De Deyn 2001, Young 1992 and Mazeraud 2020.
- For each cause of U26: one search for a mechanism on the chosen family, with its outcome in §3.9's three-way form.
- **Validation:** no.

**I1 split.** I1a, synaptic and energy failure per region (plan 16 h · 2.0–2.7 executor-h, as I1 was), is unblocked
once G0d reads its papers. I1b, cell death, is **not sized**: there is no EEG model (EQ20). C1 and BD1 depend on I1a
only. A lasting silence that needs 4b is a recorded miss until EQ20 is ruled.

**G7f. Provoked seizures (plan 16 h · 2.0–2.7 executor-h; BLOCKED on X0′ and G7a).**
- Each cause of U26 that has a mechanism moves the region's excitability. Drugs act through their PK rows, and
  electrolytes through `l2/blood/solutes.ts`.
- **Tests first:**
  - lidocaine's seizure dose (Ch25 p. 755, direction);
  - hyponatraemic seizures (Ch55 p. 1819; Ch75 p. 2463, direction);
  - TXA's dose relation (Ch50 p. 1612, direction).
- A cause without a mechanism stays a recorded miss.
- **Validation:** yes.

**G6c. Respiratory arousal and sleep in the ICU (plan 10 h · 1.3–1.7 executor-h; after G6a and B1).**
- Arousal from chemoreceptor, airway and effort inputs (Ch09 p. 164, Fig. 9.9), read by the sleep model's arousal
  drive; opioids' REM reduction (p. 175).
- **Tests first:** directions only until sizes are sourced.
- **Validation:** yes.

**EP2, EP3: no longer "no paper".** Their own plan (EQ16), written from G0c. Sized as estimates for the hub totals:
EP2 24 h (3.0–4.0 executor-h), EP3 24 h (3.0–4.0 executor-h). EP2 now also meets:
- the physiological confounders of U20 and U31 (Ch35 pp. 1127–1128);
- the criteria of U32 (p. 1129);
- positioning and demyelination, U33 and U34.

**SD1. Spreading depolarisation (not sized; EQ21).** Needs the ion layer of G0d and a DC-coupled cortical electrode.

**G11 (amended).** Re-runs the course tests of all four readers (BIS-type, Entropy, Narcotrend, PSI), not only one,
with each difference reported by cause.

| Piece | Plan h | Executor-h [EST] | Validation | Blocked on |
|---|---|---|---|---|
| G0c | 12 | 1.5–2.0 | no | its papers |
| G0d | 12 | 1.5–2.0 | no | its papers |
| X0′ (X0 + 4) | +4 | +0.5–0.7 | no | its papers |
| G7f | 16 | 2.0–2.7 | yes | X0′, G7a |
| G6c | 10 | 1.3–1.7 | yes | G6a, B1 |
| EP2 | 24 | 3.0–4.0 | yes | G0c, EP1 |
| EP3 | 24 | 3.0–4.0 | yes | G0c, EP2, the NMB model |
| **Added by the refinement** | **102** | **≈ 13–17** | | |
| **Plan total** | **560** | **≈ 70–93** | | |
| Not sized | V0, BD2, X1, X3, I1b, SD1 | | | |

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

### 6.3 Instruments added by the amendment

**The brain-death recording view (BD1).** It is a mode of the clinical EEG window, with the technical requirements of
ACNS Guideline 6 (Stecker 2016): electrode count and spacing, impedances, sensitivity, filter settings, recording
duration, stimulation for reactivity, and the checks for instrument noise. **Every value is `[WANTED: ACNS Guideline 6]`.
None is set before it is read.** The view refuses to label a recording "electrocerebral inactivity" while a confounder is
present in the engine:
- core temperature below the guideline's threshold;
- sedative concentrations above it;
- neuromuscular block;
- shock or hypoxaemia (NCC p. 2591's prerequisites).

Each is read from the engine's own state, not entered.

**The evoked-potential instrument (EP4).** Stimulation site (median or posterior tibial nerve, click, flash, transcranial
electrical), rate and intensity; recording sites on the 10–20 positions (Ch35 p. 1108). Further:
- averaging of real sweeps with a counter (500–2000 for BAEP, p. 1110);
- latency and amplitude cursors against a stored baseline (Fig. 35.7);
- the warning criteria `[WANTED: the source the owner names; Miller p. 1112 says Table 35.3 does not quantify drug
  effects]`.

It shares the strip renderer and the follower rule with the EEG window. Whether it is its own instrument in the room is
EQ18.

### 6.4 Scenario event kinds added (each a cause, never a pattern)

| Event | Fields | What produces the EEG effect |
|---|---|---|
| `carotidClamp` | side, on/off | V0's territory flow → the metabolic variable per region |
| `cardiacArrest` / `rosc` | — (the circulation exists) | DO2 → metabolic variable → injury state |
| `ectStimulus` | charge, electrode placement | G7e's stimulus input |
| `corticalStimulation` | region, current | G7e |
| `epStimulus` | modality, site, rate | EP1/EP2/EP3 |
| `lesion` (patient profile, not an event) | region, kind (tumour, infarct) | F1 |
| liver failure, AKI, sepsis, insulin | already engine conditions and drugs (`hepaticFailure`, `aki`, `sepsis`) | the brain-state inputs (§4.7) |

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

**Group 5: brain death and technical standards (unblocks BD1, G0b, G8; amendment).** All verified on 11 November 2026
through the Europe PMC REST search (by DOI, with title and first author matched).

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Stecker MM, et al. American Clinical Neurophysiology Society Guideline 6: Minimum Technical Standards for EEG Recording in Suspected Cerebral Death. J Clin Neurophysiol 2016;33(4):324–327 | the brain-death recording standard | 10.1097/WNP.0000000000000322 | Europe PMC, DOI query |
| Sinha SR, et al. American Clinical Neurophysiology Society Guideline 1: Minimum Technical Requirements for Performing Clinical Electroencephalography. J Clin Neurophysiol 2016;33(4):303–307 | electrodes, sampling, filters, sensitivity (P3) | 10.1097/WNP.0000000000000308 | Europe PMC, DOI query |
| Brophy GM, et al. Guidelines for the evaluation and management of status epilepticus. Neurocrit Care 2012;17(1):3–23 | SE treatment timing (moved from "not verified") | 10.1007/s12028-012-9695-z | Europe PMC, DOI query |
| Claassen J, et al. Recommendations on the use of EEG monitoring in critically ill patients. Intensive Care Med 2013;39(8):1337–1351 | cEEG indications (moved from "not verified") | 10.1007/s00134-013-2938-4 | Europe PMC, DOI query |
| The ACNS standard for evoked-potential recording (sampling rate, averaging, warning criteria) | EP1, EP4 | not identified | — |

**Group 6: encephalopathies and coma (unblocks X0, X2, X4, C1).**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Kaplan PW. The EEG in metabolic encephalopathy and coma. J Clin Neurophysiol 2004;21(5):307–318 (PMID 15592005) | the patterns by cause | **no DOI listed by Europe PMC.** The DOI given to this plan, 10.1097/01.WNP.0000139782.16070.68, resolves to another paper by the same author (Kaplan PW, "Mind, brain, body, and soul…", J Clin Neurophysiol 2004;21(4):301–304) | title query (citation); DOI query (the wrong DOI) |
| Ligtenstein S, et al. Do Triphasic Waves and Nonconvulsive Status Epilepticus Arise From Similar Mechanisms? A Computational Model. J Clin Neurophysiol 2021;38(5):366–375 | ammonia mechanism; GPDs; GABA-ergic suppression | 10.1097/WNP.0000000000000719 | Europe PMC, DOI query |
| Song JL, et al. A novel neural computational model of generalized periodic discharges in acute hepatic encephalopathy. J Comput Neurosci 2019;47(2–3):109–124 | Liley-family triphasic periodicity | 10.1007/s10827-019-00727-3 | Europe PMC, DOI query |
| Song J, et al. A Mean Field Model of Acute Hepatic Encephalopathy. Annu Int Conf IEEE Eng Med Biol Soc 2018:2366–2369 | the bursting Liley model from an anoxia model | 10.1109/EMBC.2018.8512786 | Europe PMC, DOI query |
| Song J, et al. A neural mass model for disturbance of alpha rhythm in the minimal hepatic encephalopathy. Mol Cell Neurosci 2024;128:103918 | neuron–astrocyte mechanism | 10.1016/j.mcn.2024.103918 | Europe PMC, DOI query |
| Tamune H, et al. Cefepime-induced encephalopathy: Neural mass modeling of triphasic wave-like generalized periodic discharges with a high negative component (Tri-HNC). Psychiatry Clin Neurosci 2019;73(1):34–42 | GABA-A antagonism mechanism | 10.1111/pcn.12795 | Europe PMC, DOI query |
| Kwon OY, et al. Source localization of triphasic waves: implications for the pathophysiological mechanism. Clin EEG Neurosci 2007;38(3):161–167 | medial frontal generators: where the region sits | 10.1177/155005940703800313 | Europe PMC, title query |
| Westhall E, et al. Standardized EEG interpretation accurately predicts prognosis after cardiac arrest. Neurology 2016;86(16):1482–1490 | prognostic categories | 10.1212/WNL.0000000000002462 | Europe PMC, DOI query |
| The "earlier cerebral anoxia model" on the Liley family that Song 2018 adapts | anoxia and burst suppression on Liley | not identified | named in Song 2018's abstract |
| A source of mechanism for uraemic and for septic encephalopathy | X3 | none identified (searched: Europe PMC title query, 25 hits) | — |
| A hepatic ammonia kinetics source | X1 | not identified | — |

**Group 7: ischaemia and injury (unblocks V0, I1, G4b).**

| Paper | Why | DOI | Verified |
|---|---|---|---|
| Hofmeijer J, et al. Ischemic cerebral damage: an appraisal of synaptic failure. Stroke 2012;43(2):607–615 | synaptic failure before membrane failure | 10.1161/STROKEAHA.111.632943 | Europe PMC, title query |
| van Putten MJ, et al. EEG Monitoring in Cerebral Ischemia: Basic Concepts and Clinical Applications. J Clin Neurophysiol 2016;33(3):203–210 | energy limitation and the EEG | 10.1097/WNP.0000000000000272 | Europe PMC, title query |
| Claassen J, et al. Quantitative continuous EEG for detecting delayed cerebral ischemia in patients with poor-grade subarachnoid hemorrhage. Clin Neurophysiol 2004;115(12):2699–2710 | alpha/delta ratio in DCI | 10.1016/j.clinph.2004.06.017 | Europe PMC, title query |
| A source on the temperature dependence of synaptic and membrane rates in the chosen family | G4b, EP1 | not identified | — |

**Group 8: evoked-potential pathways and the motor-neuron pool (unblocks EP2, EP3).** None identified. G0a searches them.
*Superseded by group 9 (refinement).*

**Group 9: found by the gap searches (refinement, 12 November 2026; unblocks G0c, G0d, X0′).**
- **DOIs:** each is the DOI of the Europe PMC record whose title and first author match.
- **Read:** the abstract only, through the same service, for each paper not marked "title only".
- **Library:** none is in the library.

| Paper | Why | DOI |
|---|---|---|
| De Deyn PP, Macdonald RL. Guanidino compounds that are increased in cerebrospinal fluid and brain of uremic patients inhibit GABA and glycine responses on mouse neurons in cell culture. Ann Neurol 1990 | uraemic mechanism (gap 1a) | 10.1002/ana.410280505 |
| De Deyn PP, et al. Endogenous guanidino compounds as uremic neurotoxins. Kidney Int Suppl 2001 | the same | 10.1046/j.1523-1755.2001.59780077.x |
| Young GB, et al. The electroencephalogram in sepsis-associated encephalopathy. J Clin Neurophysiol 1992 | septic EEG grades (U13) | 10.1097/00004691-199201000-00016 |
| Mazeraud A, et al. Septic-associated encephalopathy: a comprehensive review. Neurotherapeutics 2020 | septic pathophysiology (gap 1b) | 10.1007/s13311-020-00862-1 |
| Dau T. The importance of cochlear processing for the formation of auditory brainstem and frequency following responses. J Acoust Soc Am 2003 | BAEP mechanism | 10.1121/1.1534833 |
| Verhulst S, et al. Functional modeling of the human auditory brainstem response to broadband stimulation. J Acoust Soc Am 2015 | BAEP, human | 10.1121/1.4928305 |
| Verhulst S, Altoè A, Vasilkov V. Computational modeling of the human auditory periphery. Hear Res 2018 | BAEP, human periphery | 10.1016/j.heares.2017.12.018 |
| Rattay F, Danner SM. Peak I of the human auditory brainstem response results from the somatic regions of type I spiral ganglion cells. Hear Res 2014 | BAEP wave I | 10.1016/j.heares.2014.07.001 |
| Stegeman DF, et al. Far-field evoked potential components induced by a propagating generator: computational evidence. Electroencephalogr Clin Neurophysiol 1987 | subcortical SSEP peaks | 10.1016/0013-4694(87)90042-3 |
| Dumitru D, Jewett DL. Far-field potentials. Muscle Nerve 1993 (title only) | the same, review | 10.1002/mus.880160302 |
| Mauguière F, et al. Neural generators of N18 and P14 far-field SEPs… Electroencephalogr Clin Neurophysiol 1983 (title only) | generators | 10.1016/0013-4694(83)90253-5 |
| Stockard JJ, et al. Effects of hypothermia on the human brainstem auditory response. Ann Neurol 1978 | test band | 10.1002/ana.410030416 |
| Markand ON, et al. Effects of hypothermia on short latency somatosensory evoked potentials in humans. Electroencephalogr Clin Neurophysiol 1990 | test band | 10.1016/0168-5597(90)90002-u |
| Fuglevand AJ, et al. Models of recruitment and rate coding organization in motor-unit pools. J Neurophysiol 1993 | motor-neuron pool | 10.1152/jn.1993.70.6.2470 |
| Rusu CV, et al. A model of TMS-induced I-waves in motor cortex. Brain Stimul 2014 | D- and I-waves | 10.1016/j.brs.2014.02.009 |
| Taylor BA, et al. Temporal summation — the key to motor evoked potential spinal cord monitoring in humans. J Neurol Neurosurg Psychiatry 1993 | pulse trains | 10.1136/jnnp.56.1.104 |
| King BS, Rampil IJ. Anesthetic depression of spinal motor neurons… Anesthesiology 1994 | drug on the pool (rat) | 10.1097/00000542-199412000-00024 |
| Rampil IJ, King BS. Volatile anesthetics depress spinal motor neurons. Anesthesiology 1996 | the same | 10.1097/00000542-199607000-00018 |
| Zhou HH, Zhu C. Comparison of isoflurane effects on motor evoked potential and F wave. Anesthesiology 2000 | drug on the pool (human) | 10.1097/00000542-200007000-00010 |
| Wei Y, Ullah G, Schiff SJ. Unification of neuronal spikes, seizures, and spreading depression. J Neurosci 2014 | ion and energy layer; SD; wave of death | 10.1523/jneurosci.0516-14.2014 |
| Zandt BJ, et al. Neural dynamics during anoxia and the "wave of death". PLoS One 2011 | anoxic depolarisation | 10.1371/journal.pone.0022127 |
| Zandt BJ, et al. A neural mass model based on single cell dynamics to model pathophysiology. J Comput Neurosci 2014 | ions into a neural mass | 10.1007/s10827-014-0517-5 |
| Ruijter BJ, et al. Synaptic damage underlies EEG abnormalities in postanoxic encephalopathy: a computational study. Clin Neurophysiol 2017 | postanoxic EEG (U6) | 10.1016/j.clinph.2017.06.245 |
| Kalia M, et al. A neural mass model for the EEG in ischemia. bioRxiv 2023 (**preprint**) | ischaemia EEG | 10.1101/2023.04.07.535995 |
| Jones TH, et al. Thresholds of focal cerebral ischemia in awake monkeys. J Neurosurg 1981 | 4b test bands | 10.3171/jns.1981.54.6.0773 |
| van Wijngaarden JB, et al. The impact of cortical lesions on thalamo-cortical network dynamics after acute ischaemic stroke. PLoS Comput Biol 2016 | focal lesions (U14) | 10.1371/journal.pcbi.1005048 |
| Regan D, et al. Effect of body temperature on visual evoked potential delay and visual perception in multiple sclerosis. J Neurol Neurosurg Psychiatry 1977 (title only) | U34 test band | 10.1136/jnnp.40.11.1083 |

**Reconciliation with `research/58-papers-wanted-eeg-2026-11-11.md` (refinement).** That file is outside this
repository; the corrections below are stated here and reported, and the file itself was not edited.
- **Its groups 1–4 (the readers): complete in the library.** `library/sources/papers/eeg/` (listed 12 November 2026)
  holds the six reader papers:
  - `connor-2022-open-reimplementation-bis-anesth-analg.pdf`, 20 pp;
  - `rampil-1998-primer-eeg-signal-processing-anesthesiology.pdf`, 23 pp;
  - `viertio-oja-2004-entropy-algorithm-acta-anaesthesiol-scand.pdf`, 8 pp;
  - `kreuer-wilhelm-2006-narcotrend-monitor-bprca.pdf`, 9 pp;
  - `drover-ortega-2006-patient-state-index-bprca.pdf`, 8 pp;
  - `prichep-2004-patient-state-index-bja.pdf`, 7 pp.

  These are the reader papers, not generator papers, so **step 4 of the brief does not apply**: no model paper is in
  the library, and §3's claims stay at abstract level.
- **DOIs corrected or confirmed.**
  - Drover & Ortega 2006 (10.1016/j.bpa.2005.07.008) and Prichep 2004 (10.1093/bja/aeh082) were marked "from memory,
    not confirmed by search". Both are now confirmed: by Europe PMC DOI query (PMIDs 16634419, 14742326) and by the
    DOI printed in the library PDFs.
  - The other reader DOIs also resolve by Europe PMC DOI query to the titles listed: Kreuer 2006, Viertiö-Oja 2004,
    Connor 2022 and Rampil 1998.
  - Kaplan 2004 is correct in both lists: no DOI, PMID 15592005.
- **Duplicates and a stale row in this section.**
  - Brophy 2012 and Claassen 2013 appear in group 3 (as "not verified") and in group 5 (verified). The group 5 rows
    stand.
  - Group 3's "ACNS guideline on minimum technical standards… not identified" is Sinha 2016 (group 5) and is
    identified.
- **A number to check.** `research/58`'s group 4 row for Stecker 2016 gives the brain-death recording standard as
  "nothing over 2 µV, electrode pairs at least 10 cm apart". That paper has not been read by this plan, so those numbers
  are not cited here until G0b reads it.
- **Its "still not identified" list is now shorter.**
  - Still not identified: a septic mechanism (gap 1b); the evoked-potential recording standard; ammonia kinetics; the
    temperature dependence of the family's rates.
  - Now identified: a uraemic basis (gap 1a), the EP pathway parts (gap 2) and the motor parts (gap 3).
- **Its group 5 matches this section's groups 5–7** (Ligtenstein, Song ×3, Tamune, Kwon, Westhall, Hofmeijer, van
  Putten, Claassen 2004), with the same DOIs.

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
*Amended:* the order now spans every use of §1.5. The proposal is the body's own chain first: B1/G4/G4b/I1 (hypoxia,
glucose, cooling, brain death's EEG half), because they rest on inputs the engine already has. Then seizures, sleep and
the encephalopathies as their papers arrive. Then regional ischaemia and the evoked potentials with their own plans.

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

*Revised by the refinement (the owner ruled that all four readers, PSI included, are built now on today's generator):*
- **Option D:** E10 built now as the montage interface (electrode differences, `l3/eeg-devices/montage.ts`), fed by
  the depth plan's E10 channel design on today's generator. PSI's topography-dependent features are recorded as
  expected misses with the cause "one generator source". At G5 the montage's source becomes the 10–20 electrodes,
  without changing the file, and PSI is re-run at G11 (§4.6).
- **New proposal:** A for the full set at G5, reached through D now. Option C is what D does honestly: D names its
  limit and C did not.

**EQ4. Sampling rate of the clinical channels.**
*Explanation:*
- The engine offers 500, 125 and 62.5 Hz.
- 125 Hz holds up to 62.5 Hz. 500 Hz holds up to 250 Hz, and costs more to store and draw.
- The clinical standard's rate is not yet read.

*Options:*
- A: 125 Hz everywhere;
- B: 500 Hz for the clinical channels, with `eeg` staying 125 Hz (decimated);
- C: a new 250 Hz engine rate.

*Amended:* the evoked potentials need a far higher rate than any engine rate (§3.8 point 6), computed only while an
evoked-potential instrument stimulates; its rate is WANTED (the ACNS evoked-potential standard). ACNS Guideline 1 sets
the EEG's own minimum (WANTED, Sinha 2016).
*Proposal:* B until the ACNS standard is read. It uses an existing rate and leaves the depth readers' input unchanged.
One interaction: the depth plan's P-6 may move the `eeg` channel itself to 500 Hz if the BIS source needs an EMG band
above 62.5 Hz. If P-6 is so ruled, `eeg` is decimated to 500 Hz instead, and option B still holds.

**EQ5. What happens to the present generator?**
*Explanation:* the new model has no published mechanism yet for several drug classes (§4.3).
*Options:*
- A: retire it at G11;
- B: keep it as a fallback for one release;
- C: both coexist, chosen per scenario, until the missing drug actions are read.

*Proposal:* C, then A. *Amended:* C only as a transition, ending class by class when each class's action is read and
built (§4.4); never a permanent coexistence.

**EQ6. Does the always-on brain state couple to physiology now?**
*Explanation:* status epilepticus brings hypoxic respiratory failure, acid–base disturbance, myocardial depression from
treatment and rhabdomyolysis (NCC p. 2587); how much a convulsion raises oxygen use or lactate is `[WANTED]`. Sleep changes breathing and heart rate (Ch09 pp. 153–154). Each such coupling moves physiology numbers
and needs the validation workflow. It is the same question as the depth plan's Q4 for anaesthesia.
*Options:*
- A: couple now, in G6a and the G7 pieces;
- B: EEG only now, couplings as later pieces;
- C: never.

*Amended by the owner's order:* coupling is no longer a "whether". The question is which coupling first (§4.7, B2).
*Proposal (amended):* first the inputs (B1: DO2, glucose, CO2, temperature), then seizure → CMRO2 and CBF and burst
suppression → CMRO2 (B2, ruled with the depth plan's Q4), then sleep's breathing.

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

*Proposal:* B, with the number set after G1 measures. *Amended:* if EQ11 is ruled A, the region core runs always,
so a budget for the always-on core is needed as well. The plan proposes setting both from G1's measurement.

**EQ10. Follower identity across browsers.**
*Explanation:* a nonlinear model magnifies last-bit differences between browsers' `Math.exp` and `Math.sin`.
*Options:*
- A: the model uses only exactly rounded arithmetic (its own exponential and sigmoid);
- B: accept drift and resync by snapshot.

*Proposal:* A, if G1's probe shows a difference; nothing if it shows none.

**Questions added by the amendment (EQ11–EQ19), and the revisions of EQ1, EQ4, EQ5, EQ6 and EQ9 above (marked
"amended").**

**EQ11. Does the region model run always, so that the body responds to a seizure or burst suppression with no EEG
shown?**
*Explanation:* the slow variables alone cannot decide when a seizure ends; the fast dynamics do (§3.8 point 5).
*Options:*
- A: the region core always on (depth plan D4 lifted for the core; montage and readers stay device-gated);
- B: a published reduced slow form (none identified);
- C: no body coupling until B exists.

*Proposal:* A, with the cost set by EQ9 after G1 measures it.

**RULED A by the owner (12 November 2026):** "the model should always run". The brain's core model runs always;
electrodes and readers are switched on with a device. Written into §3.8 point 7, §4.7 and G1. This question is closed
and is no longer counted among the open questions.

**EQ12. Which family: corticothalamic, Liley-type, or a Liley cortex with a thalamic loop?**
*Explanation:*
- the sleep, spindle and generalised-seizure abstracts are corticothalamic (Robinson);
- the anaesthesia (Bojak), anoxia and hepatic-encephalopathy abstracts (Song) are Liley-type;
- a joined model would be this plan's own composition unless published.

*Options:*
- A: corticothalamic;
- B: Liley;
- C: Liley cortex plus thalamic loop, only if its joint is published;
- D: decide in G0a against its six discriminators.

*Proposal:* D.

*Revised by the refinement:*
- **A seventh discriminator:** the ion-and-energy layer. The anoxia and ischaemia models found (Wei 2014; Zandt
  2011, 2014; Ruijter 2017; Kalia 2023, §3.9 gap 4a) are mean-field or single-cell models with thalamic input and
  energy-dependent synapses. Ching 2012's metabolic variable may be the same variable.
- **The decision waits for G0d and X0′ as well as G0a.**
- Ruijter 2017 and Kalia 2023 are mean-field models with a thalamic input. If G0d finds their cortex is Liley-type or
  Jansen-type, that weighs toward option C.
- **New proposal:** D, decided in G0a, G0d and X0′ together.

**EQ13. May a mechanism be taken from a paper whose parameters were fitted to patients' EEG?**
*Explanation:* Song 2018/2019 fit their parameters to EEG by a particle filter. The mechanism (ammonia → excitability,
synaptic impairment, inhibition) is a physiological claim, but the fitted values are not.
*Options:*
- A: the mechanism yes, its fitted values never; values come from physiology sources or stay WANTED;
- B: neither;
- C: both.

*Proposal:* A.

*Refinement:* Ruijter 2017 (§3.9 gap 4a) compared its simulations with 155 patients. Whether its values were fitted to
them is not in the abstract. G0d states it; the ruling then applies to it as to Song.

**EQ14. Uraemic and septic encephalopathy (revised by the refinement).**
*Explanation:* the proper search (§3.9 gap 1) splits them.
- **Uraemic:** a physiological basis exists. Uraemic guanidino compounds inhibit GABA and glycine responses and are
  convulsants (De Deyn 1990, 2001). It would join the region at the same GABA-A joint as cefepime and tranexamic
  acid. It needs a uraemic-solute state in the engine and the concentration–effect relation from the full text.
- **Septic:** nothing found as a model, and the basis is multifactorial (Mazeraud 2020).

*Options:*
- A: uraemic built through the GABA-A joint once X0′ reads De Deyn 1990 in full and a uraemic-solute source exists;
  septic listed as an open gap on the model page;
- B: both wait for you to supply sources;
- C: septic built from the hepatic or uraemic mechanism by analogy. This is not a mechanism by your rule, so it is
  not proposed.

*Proposal:* A.

**EQ15. Regional cerebral perfusion (V0) and brainstem function (BD2): their own plans?**
*Explanation:* both are new physiology outside the EEG. Regional ischaemia, carotid clamping, DCI and brain death depend
on them.
*Options:*
- A: their own plans, written next, with the interfaces of §5.1;
- B: pieces inside this plan.

*Proposal:* A (as the hub plan does with H11c).

**EQ16. Evoked-potential pathways (EP2) and motor evoked potentials (EP3): here or their own plan? (revised by the
refinement)**
*Explanation:* papers now exist (§3.9 gaps 2 and 3).
- The BAEP has published models (Dau 2003, Verhulst 2015/2018).
- The SSEP's far-field peaks have a published mechanism (Stegeman 1987).
- The MEP's parts are published: the motor-unit pool (Fuglevand 1993), I-waves (Rusu 2014), and anaesthetic
  depression of motoneurons (Rampil & King; Zhou 2000). Their joint is this plan's composition.
- They share the region, but they are separate models with their own time scale (§3.8 point 6).

*Options:*
- A: their own plan, written from G0c's reading;
- B: pieces here (EP2, EP3 as sized in §5.2).

*Proposal:* A. The hub totals carry them as estimates.

**EQ17. The exclusions the plans made without your ruling: which are in?**
*Explanation:* the depth plan's §9 left out infants and neonates, anaesthetic epileptiform spikes (sevoflurane,
etomidate, hypocapnia), xenon, connectivity and complexity indices, nociception indices and auditory evoked potentials.
This plan had not covered EMG and nerve monitoring (Ch35 pp. 1114, 1122).
*Options:*
- A: all in, each as its own row and piece once its sources are read;
- B: you name which.

*Proposal:* A. Anaesthetic spikes join G7a, auditory EPs join EP2, infants need their own source review.

*Refinement:* the pass gave each exclusion its Miller pages (§1.5.1, row U25). EMG now has a published surface-EMG
model inside the motor-unit-pool paper (Fuglevand 1993 [ABS]), so it can join EP3's plan rather than wait.

**EQ18. Is the evoked-potential monitor its own instrument in the room?**
*Options:*
- A: yes, its own (`#/ep`);
- B: a mode of the EEG window.

*Proposal:* A. It stimulates and averages, which the EEG window does not.

**EQ19. The brain-death recording: what may the simulator say?**
*Explanation:* brain death is a clinical determination with legal steps (NCC p. 2591). The simulator can show an EEG that
meets the recording standard and flag the confounders.
*Options:*
- A: the view shows "recording meets / does not meet the technical standard" and lists confounders, never a diagnosis;
- B: it states "consistent with electrocerebral inactivity" when every condition holds.

*Proposal:* A.

**Questions added by the refinement (EQ20–EQ23).**

**EQ20. The death of brain tissue (I1b): what may stand in for a mechanism that is not published?**
*Explanation:*
- The loss of function and the terminal depolarisation have published models (§3.9 gap 4a).
- That tissue dies after enough time at low flow has a physiological basis: Ch10 p. 211, Fig. 10.20; Jones 1981.
  No model found ends this on an EEG family's parameter.
- A rule "death after flow below X for Y minutes", drawn through two thresholds, is a fitted rule.

*Options:*
- A: I1b stays unbuilt. A silence that should last is a recorded miss. The thresholds are test bands for any future
  mechanism.
- B: a cell-death model from the cascade (Ch10 Fig. 10.22), if G0d finds one published.
- C: the threshold rule. This is not proposed, being a fitted rule by your standard.

*Proposal:* A, with B searched in G0d.

**EQ21. An ion-and-energy layer in the region, and spreading depolarisation (U30)?**
*Explanation:*
- The models that produce the anoxic depolarisation and spreading depression carry ion concentrations and the pumps'
  energy (Wei 2014; Zandt 2011, 2014).
- They may also be the metabolic variable of burst suppression (EQ12's seventh discriminator).
- They cost more, and with EQ11 = A they run always.

*Options:*
- A: yes, if G0d shows it is the same variable as the metabolic one. Then SD1 follows.
- B: no ion layer. Spreading depolarisation and the terminal depolarisation stay gaps.
- C: decide after G1 measures the cost.

*Proposal:* A, with the cost measured in G1 before G2.

**EQ22. Index-guided closed-loop delivery (U28): an instrument in the room?**
*Explanation:*
- Miller describes controllers that set a propofol or remifentanil pump from the BIS (Ch23 pp. 665–670).
- No new physiology is needed: it is a device that reads a depth reader.

*Options:*
- A: a later instrument plan, after the four readers;
- B: not in the simulator.

*Proposal:* A.

**EQ23. Which provoked seizures (U26) first?**
*Explanation:*
- Ten causes were found, each with its own mechanism level.
- Tranexamic acid shares the GABA-A joint with cefepime and uraemia, so one built joint serves three causes.
- Local anaesthetic toxicity is an operating-room cause with a dose threshold in Miller (Ch25 p. 755). Its EEG
  mechanism is not yet searched.

*Options:*
- A: the GABA-A joint first (TXA, cefepime, uraemia), then local anaesthetics once X0′ finds a mechanism;
- B: local anaesthetics first;
- C: you name the order.

*Proposal:* A.

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

**Amendment self-review (33168f2f).**

| Claim | File and line, or page |
|---|---|
| One global brain CBF; no territories | `packages/engine-core/src/types-organs.ts:35–41` (`BrainSummary`) |
| `herniated` set at CPP ≤ 10 mmHg for 60 s, [FIT], used only as a state label | `l2/brain/params.ts:77–78`; `l2/brain/model.ts:153–154`; `l2/organs/pipeline.ts:248` |
| Pupils follow opioids only | `l2/neuro/outputs.ts:29` |
| Liver publishes `liverFn`, `lactate`, `inr`; no ammonia | `types-organs.ts:47–48`; search for "ammonia" under `packages/engine-core/src`: none |
| Kidney publishes `gfr`, `akiStage`; urea only as a constant in osmolality | `types-organs.ts:43–45`; `l2/blood/solutes.ts:48` |
| Sepsis is an endocrine condition with phases | `types-endo.ts:14–17` |
| Conditions `tbi`, `hepaticFailure`, `aki` | `types-organs.ts:31`; `l2/organs/pipeline.ts:40` |
| Glucose state | `l2/endo/glucose.ts:22`, `:46` |
| Miller pages | Ch10 p. 219 (PDF 278, running header); Ch22 p. 571 (PDF 694); Ch35 pp. 1105, 1108–1114, 1116, 1122–1128 (PDF 1333–1356); NCC (Ch80) pp. 2578, 2583, 2591 (PDF 3088, 3093, 3101); paediatric anaesthesia p. 2314 (PDF 2773); paediatric critical care pp. 2455, 2461 (PDF 2931, 2937) |

**What could not be verified (amendment):**
1. No new paper read in full; every mechanism claim of §1.5 and §3.8 is an abstract's.
2. ACNS Guideline 6 and Guideline 1 are verified as citations only.
3. The inventory is from passages read, not a heading-by-heading pass (G0b does it).
4. Ch80's chapter number comes from its own table numbering (Table 80.8).
5. The Kaplan 2004 DOI given to this plan is wrong (§7 group 6); its correct DOI was not found.

**Disagreements found (amendment):**
1. Paediatric SE is defined as more than 20 min (p. 2461); the adult chapter uses 5 min (NCC p. 2587).
2. The encephalopathy models sit on a different family (Liley) from the one §3.7 leads with (corticothalamic): EQ12.
3. The Song models' parameters are fitted to EEG: EQ13.

### 9.3 Refinement self-review (brief 170, base 96ea653e)

| Claim | File and line, or page |
|---|---|
| Miller 10th has no index | the book ends with Ch87's references at PDF p. 3283; `library/sources/tocs/miller-10th-toc.pdf` (3 pp.) has no "Index" entry |
| Ch80 is "Neurocritical Care" | its opening page (PDF 3080) prints "80" and "Neurocritical Care", p. 2570 (this replaces the amendment's inference from Table 80.8) |
| Ch24 inside the "Ch23" split file | PDF 820 prints p. 674, "Pharmacology of Neuromuscular Blocking Drugs"; the table of contents gives 674 |
| Plasma Na, K, iCa, Mg and glycine osmoles exist | `packages/engine-core/src/l2/blood/solutes.ts:8`, `:15`, `:24` |
| Lidocaine has a PK row with antinociception only | `l2/pk/row.ts:21`; `types-pk.ts:174` |
| Tranexamic acid row is inert | `l2/pk/data/rows-other.ts:104–106` |
| Airway obstruction exists as a state | `types-neuro.ts:65` (`drive.obstruction`); `types-resp.ts:12` (`AirwayState`) |
| PR #427's bicoherence on today's generator | the PR's description (read 12 November 2026) |
| Every DOI of §3.9 and §7 group 9 | Europe PMC REST records, title and first author matched |
| The library's EEG folder | `ls library/sources/papers/eeg/`, 12 November 2026: six reader PDFs |

**What could not be verified (refinement):**
1. No paper found by the gap searches was read in full. Every §3.9 claim is an abstract's, and some rows are titles
   only (marked).
2. Kalia 2023 is a preprint; no peer-reviewed version was found in Europe PMC.
3. Whether Ruijter 2017 fitted its values to patients is not in its abstract.
4. The keyword sweep cannot find a use described without its keywords (§1.5.3).
5. The engine-input column of U26–U37 was checked by name search only, and some rows say "not checked".
6. Hits that a context window cut short were read only as far as the window. Ch35 pp. 1127–1128 and Table 35.5 were
   read in full.

**Disagreements found (refinement):**
1. **Where the EEG goes flat.** Ch10 p. 211 says the cortical EEG is isoelectric at about 15 mL/100 g/min, and gives
   6–12 as the range where the EEG is flat but membranes hold. Ch35 p. 1122 says the cell's survival is threatened from
   about 12. Both stay as test bands, each with its page. Neither is averaged into one number.
2. **Seizure duration in children.** The paediatric chapter (Ch75 p. 2461) and NCC (p. 2587) still differ, as before.
3. **E10.** The depth plan ruled E10 built (Q10 B); the plan had proposed folding it into G5. The owner's ruling that
   PSI is built now settles this toward building E10 now as an interface (§4.6, EQ3).
