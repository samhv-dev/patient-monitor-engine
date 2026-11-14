# The Patient State Index reader: what the two supplied papers give

**Status: research note, 12 November 2026 (brief 196).** Nothing is built. No code, test, constant or plan changed. It
answers one question for the owner before the depth plan's E11 (PSI reader) is given to an executor: can a reader under
the PSI name be computed **whole** from what is published, with no constant, weight, threshold or function of our own?

**Answer: no.** The two papers give the front end of the development study, the electrode sites, the band edges and the
names of seven features. They do not give the function that turns those features into the index. Both papers call that
function **proprietary** (Prichep 2004 p. 395, twice; Drover & Ortega 2006 pp. 121 and 123). Its coefficients, the
reference distributions it standardises against, and the scaling to 0–100 are not published in either paper. The
details are in §3 and the table in §4.

## Sources and how they were read

Both papers were read in full by the executor (not by a sub-agent). The text came from `pdftotext -layout`, and every page
was also read as a page image, so the figures and tables were read from the page images:

- **P04** = Prichep LS, Gugino LD, John ER, Chabot RJ, Howard B, Merkin H, Tom ML, Wolter S, Rausch L, Kox WJ. The Patient
  State Index as an indicator of the level of hypnosis under general anaesthesia. *Br J Anaesth* 2004;92(3):393–399.
  doi:10.1093/bja/aeh082. Library file `library/sources/papers/eeg/prichep-2004-patient-state-index-bja.pdf`. The paper
  is a retrospective study by the developers (Brain Research Laboratories, NYU), and Physiometrix funded it (p. 399).
- **D06** = Drover D, Ortega HR. Patient state index. *Best Pract Res Clin Anaesthesiol* 2006;20(1):121–128.
  doi:10.1016/j.bpa.2005.07.008. Library file `library/sources/papers/eeg/drover-ortega-2006-patient-state-index-bprca.pdf`.
  The paper is a review. Its second author is the maker's manager (Physiometrix, p. 121).

Page numbers are the journals' printed pages. Nothing in this note is from memory or from any code repository. No file
was downloaded. DOIs were found with Crossref's REST search and checked by resolving them at doi.org (headers only,
HTTP 302 to the publisher for each). No personal identifier was sent in any request.

## 1. Montage and front end, as stated

| Item | What the papers state | Page |
|---|---|---|
| Recording used to build the index | 19 electrodes on the 10/20 system, with mastoids, EOG (diagonally above and below the orbit), a cheek ground and a chest ECG lead | P04 p. 394 |
| Sites used to compute the PSI | "two anterior (FPI and FPZ′), a midline central (Cz) and a midline posterior (Pz)", described as a "minimal set" spanning the anterior–posterior dimension. Read as Fp1 and a primed Fpz (Fpz′). The paper does not define the prime | P04 p. 395 |
| Reference (development recordings) | "monopolar, referenced to linked earlobes" | P04 p. 394 |
| Reference (instrument) | "four distinct electrodes plus an additional reference and ground electrode"; "Referential and bipolar combinations of these four channels". Which combinations are used is not stated, and neither is where the reference sits | D06 p. 124 |
| Analogue band | 0.5–70 Hz (3 dB points) with a 60 Hz notch. Filter order and type are not given | P04 p. 394 |
| Impedance | kept below 5000 Ω (study set-up) | P04 p. 394 |
| Sampling | 200 Hz per channel, 12-bit; "reduced to 100 Hz before analysis, using Fant's resampling algorithm" (citing ref. 16, Wolberg, *Digital Image Warping*, 1990, a book) | P04 p. 394 |
| Segment | the study used artefact-free samples of 24–48 segments of 2.5 s each (induction: the last 12 segments, 30 s) | P04 p. 394 |
| Update in the instrument | "continuous updating of the index every 1.25 s" | P04 p. 394 |
| Spectral estimator | "converted from the time to the frequency domain using a fast Fourier transform"; for each electrode and state, "averaged across artefact-free segments". Window, taper, FFT length and how many segments the live instrument averages are not given | P04 p. 395 |
| Later instruments | PSA4000, then SEDLine (D06 pp. 121, 127). D06 Fig. 3 is labelled "PSArray2" (p. 125), and D06 p. 126 names "PSA Frontal Array". The SEDLine adds a bilateral frontal DSA display (p. 127). Neither paper states the sites of these later sensors | D06 pp. 121, 125–127 |

Two notes on the montage:

- The four computation sites in P04 are **one left frontopolar site and three midline sites**. There is no right-sided
  site among them.
- D06 says the algorithm uses "coherence between bilateral brain regions" (p. 121, and again p. 127). Four sites with
  only one lateral site cannot give a bilateral (left–right) pair. So either the instrument D06 describes uses a
  different array from P04's four sites, or the word means something the paper does not explain. The papers do not
  settle this.

## 2. Features, as stated

**The candidate pool (development only).** For every electrode, P04 computed absolute and relative power in six bands
between 0.5 and 50 Hz. It also computed total power, "intra-hemispheric relationships including power gradients and
synchrony" for all electrode pairs, and "bispectral features … for all pairs of 6 Hz wide bands, between 1 and 50 Hz,
within each electrode site, for coherence and power" (P04 p. 395). D06 gives "approximately 2500 per session" spectral and
bispectral measures of power and coherence (p. 125). This pool is what the developers searched. The index does not use
all of it.

**The bands** (P04 p. 395): low delta 0.5–1.5 Hz, delta 1.5–3.5 Hz, theta 3.5–7.5 Hz, alpha 7.5–12.5 Hz, beta 12.5–25 Hz,
gamma 25–50 Hz.

**The selected features** feed the "multivariate discriminant algorithm (proprietary)". P04 p. 395 says they "include"
the seven below. The word "include" leaves open whether the list is complete:

| # | Feature as printed (P04 p. 395) | Band (P04 p. 395) | Which electrodes | Definition complete enough to compute? |
|---|---|---|---|---|
| F1 | "absolute power gradient between frontopolar and vertex regions in the gamma band" | 25–50 Hz | "frontopolar" (Fp1, Fpz′ or both?) vs vertex (Cz) | **No.** "Gradient" is not defined: a difference, a ratio, or a difference of logs? Which frontopolar site is used is not given |
| F2 | "absolute power changes between midline frontal and central regions in the beta band" | 12.5–25 Hz | midline frontal (presumably Fpz′) vs Cz | **No.** "Changes between" is not defined |
| F3 | "… and between midline frontal and parietal regions in the alpha band" | 7.5–12.5 Hz | midline frontal vs Pz | **No**, for the same reason as F2 |
| F4 | "total spectral power in the frontopolar region" | 0.5–50 Hz by the band list (not stated for this feature) | frontopolar (which site?) | **Nearly.** The quantity is clear. The site and the spectral estimator are not |
| F5 | "mean frequency of the total spectrum in midline frontal region" | total spectrum | midline frontal | **No.** "Mean frequency" is not defined (for example, power-weighted, or over which range), and the estimator is not given |
| F6 | "absolute power in the delta band at the vertex" | 1.5–3.5 Hz | Cz | **Nearly.** Clear apart from the estimator |
| F7 | "posterior relative power in the slow delta range" | low delta 0.5–1.5 Hz ("slow delta" read as the printed "low delta"; the paper does not equate them) | posterior (Pz) | **Nearly.** Relative to the total power presumably, but the paper does not state the denominator |

D06 describes the features only in words. It does not name a single computable feature:

- "changes in power in various EEG frequency bands; (2) changes in symmetry and synchronization between critical brain
  regions; and (3) the inhibition/activation of regions of the frontal cortex" (p. 123);
- "EEG power, frequency and phase information from anterior–posterior relationships of the brain as well as coherence
  between bilateral brain regions" (p. 121; again on p. 127).

P04's list of seven has **no coherence, symmetry or phase measure**. Its Discussion does say the selected variables
"include measures of power, power gradients, and covariances among regions" (p. 396). D06's description therefore
reaches beyond P04's list, either because the papers describe different versions of the algorithm or because P04's
list is incomplete ("include"). Neither paper says which.

**Physiology stated as the basis** (D06 pp. 122–123, in words, no numbers):
- loss of consciousness brings frontal beta increase and "anteriorization" of delta, theta and alpha power, and a global
  decrease in gamma (> 25 Hz), "distinct from" EMG loss;
- coherence between the hemispheres falls, more posteriorly;
- prefrontal and frontal regions of each hemisphere couple more closely, while anterior and posterior regions uncouple;
- all of this reverses at return of consciousness.

D06 cites John 2001 and Gugino 2001 for these statements. They tell what a generator would have to show. They are not
the index's method.

## 3. From the features to the index, as stated

| Step | What the papers state | Page | Computable? |
|---|---|---|---|
| Transform to normality | "all features were transformed to obtain normal distributions" "Following neurometric QEEG procedures" (refs 17, 18) | P04 p. 395 | **No.** The transform is not given; it is in the cited neurometric sources, at best |
| Standardisation ("self-norming") | Z-scores "relative to each subject's individual response to anaesthetic and the variance of the baseline (BL) state of the total anaesthetic database of 176 cases" (citing ref. 19, Gugino 1997) | P04 p. 395 | **No.** It needs the database's baseline variance for every feature, which is **not published**. It also needs a rule for obtaining "each subject's individual response" in a live patient (which baseline, recorded when, for how long), which is **not stated** |
| Standardisation (computation section) | "Every element … is transformed to a standard score (Z-score) relative to its distribution in a specific reference state and expressed as the probability of deviation from that state" | P04 p. 395 | **No.** The reference state is not named. Its means and SDs are not given, and neither is the conversion from Z to probability |
| Normative database | the BRL database of 20 000 patients, from which "Statistical normative distributions for these QEEG measures were computed", and the surgical "level of consciousness database" | D06 pp. 124–125 | **No.** Neither database is published in these papers. By the owner's rule, a method that rests on an unpublished normative database cannot be computed |
| Discriminant function | "a proprietary multivariate discriminant algorithm based on these self-normed indicators" (P04 p. 395); "multivariate discriminant algorithm (proprietary)" (P04 p. 395); "proprietary algorithm" (D06 pp. 121, 123); "a complex computation that combines weighted quantitative EEG parameters" (D06 p. 123); "Candidate measures were used to form mathematical classifier functions estimating the most probable level of consciousness" (D06 p. 125) | as given | **No.** The form (linear or quadratic), the weights, the classes, the class means and covariances, and the priors are all missing |
| The ratio | "The PSI is the ratio of the probability that the observation belongs to the reference state vs the sum of the probabilities that the observation belongs to either the reference state or to a different level of arousal. Thus, the PSI value can range from 0 to 100." Read as PSI = 100 · P(ref) / (P(ref) + P(other)); the factor 100 is implied by the range, not printed | P04 p. 395 | **The arithmetic only.** P(ref) and P(other) come from the unpublished discriminant. Which state is "the reference" and what "a different level of arousal" is (one class or several) are not stated. D06 p. 124 describes the output as an estimate of the "likelihood that a patient is adequately anaesthetized", which does not obviously match the high-when-awake scale of P04 |
| Further detail | "A recent publication by Drover and colleagues (ref. 20) provides additional details of this computation" | P04 p. 395 | Points to Drover 2002 (§5), which was not supplied |
| Scaling / calibration | D06 Fig. 2 (p. 124): "Raw Algorithm" → "Raw Trend" → "Scaled Trend", with "Scaled Measures of depth of anesthesia – OAA/S"; the volunteer database (64 procedures, 0.1 MAC steps) "used to assist in the calibration of the PSI" | D06 pp. 124–125 | **No.** There is a scaling step from the raw algorithm's output to the displayed trend, calibrated on volunteers against OAA/S. Its function is not given |
| Smoothing | none stated beyond the 1.25 s update. The study averaged 24–48 segments of 2.5 s for its own analysis, which P04 calls "a conservative approach" that "may result in … longer response time" than the instrument | P04 p. 394 | **No** |
| Artefact handling | the study: technicians' visual editing "augmented by an automatic EEG artifact detection algorithm" (P04 p. 394). The instrument: an artefact library from the BRL database, used to build "algorithms for automatic identification and real-time exclusion of artifact" and "Artifact Classifiers" (D06 p. 124, Fig. 2); "advanced artifact rejection" (D06 pp. 121, 127) | as given | **No.** No rule or threshold is given |
| Burst suppression | **not mentioned** in either paper | — | **No** |
| EMG | gamma loss at loss of consciousness is "distinct from loss of electromyographic (EMG) activity" (D06 p. 122); no handling is described | D06 p. 122 | **No** |
| Age | no age regression is described. D06 p. 122 claims the power spectrum has "a stable (over the age span), state dependent frequency composition" (citing refs 1, 2) | D06 p. 122 | Not part of the method as stated. Whether an age correction sits inside the unpublished normative Z-scores is not said in either paper: an open question, not a fact |

## 4. Item by item: computable from these two papers, or not

| # | Item | Computable from P04 + D06? | Page, or what is missing |
|---|---|---|---|
| 1 | Electrode sites for the computation | **Yes, for the development version** (Fp1, Fpz′, Cz, Pz) | P04 p. 395. Missing: the definition of Fpz′, and the sites of the later PSArray2/SEDLine sensors |
| 2 | Reference | **Yes, for the development recordings** (linked earlobes) | P04 p. 394. Missing: the instrument's reference site and its "bipolar combinations" (D06 p. 124) |
| 3 | Sampling and band | **Yes** (200 Hz → 100 Hz; 0.5–70 Hz; 60 Hz notch) | P04 p. 394. Missing: filter orders and types. Fant's resampling is only cited (to a book) |
| 4 | Segment and update | **Yes** (2.5 s segments; update every 1.25 s) | P04 p. 394. Missing: how many segments the live index averages, and the overlap (a 1.25 s update on 2.5 s segments suggests 50 % overlap; this is an inference) |
| 5 | Spectral estimator | **No** | FFT named (P04 p. 395); window, taper, length and averaging missing |
| 6 | Band edges | **Yes** | P04 p. 395 (six bands, 0.5–50 Hz) |
| 7 | Selected feature list | **Partly**: seven features named | P04 p. 395. Missing: whether the list is complete ("include"), and the coherence/symmetry/phase features D06 names (pp. 121, 123, 127) |
| 8 | Feature definitions | **No** for F1, F2, F3, F5; **nearly** for F4, F6, F7 | P04 p. 395. Missing: "gradient", "changes between", "mean frequency", the relative-power denominator, and which frontopolar site |
| 9 | Normalising transform | **No** | P04 p. 395 cites neurometric procedures (refs 17, 18) without stating the transform |
| 10 | Reference distributions (means and SDs per feature) | **No** | Unpublished: the 176-case BL database (P04 p. 395) and the BRL 20 000-case database (D06 p. 124) |
| 11 | Per-patient self-norming in real time | **No** | P04 p. 395 states the principle; the procedure is missing |
| 12 | Z → probability | **No** | P04 p. 395 states that it is done, not how |
| 13 | Discriminant: form, weights, classes, priors | **No** | "Proprietary" (P04 p. 395; D06 pp. 121, 123) |
| 14 | Ratio to 0–100 | **Arithmetic only** | P04 p. 395; its inputs come from item 13 |
| 15 | Scaling / calibration to the displayed trend | **No** | D06 Fig. 2 p. 124, p. 125: a step exists; the function is missing |
| 16 | Smoothing | **No** | Not stated |
| 17 | Artefact rejection | **No** | Described only (P04 p. 394; D06 pp. 121, 124, 127) |
| 18 | Burst suppression handling | **No** | Not mentioned |
| 19 | EMG handling | **No** | Not stated (D06 p. 122 only distinguishes EMG loss from gamma loss) |
| 20 | Age handling | **No** | Not stated |

## 5. Verdict by the owner's test

**Not buildable whole.** Items 1–4 and 6 can be computed; they are the front end and the band edges. Items 7, 8 and 14
can be computed in part. Everything that makes the number (items 9–13, 15–20) is missing. Several of those missing items
are named as proprietary or rest on unpublished databases. Any reader built from these two papers would need our own
definitions of the gradients and the mean frequency, our own reference means and SDs, our own discriminant weights and
our own scaling. The owner's rule forbids exactly those. This matches the Narcotrend finding (hand-over 183): the
developers published the architecture and the input families, not the classifier.

**What a source would have to supply,** in order of value:

1. The discriminant: its form, the classes (the reference state and the "different level of arousal"), the weights or
   class means and covariances, and the priors.
2. The reference distributions: the mean and SD of each selected feature in the reference state(s), and whether they
   are age-regressed.
3. The normalising transform, and the Z-to-probability conversion.
4. Exact definitions of the seven features (gradient and "changes between" as arithmetic; mean frequency; the
   relative-power denominator; the sites behind "frontopolar" and "midline frontal"), plus any coherence or symmetry
   features of the later versions.
5. How a live patient is self-normed (baseline source and duration).
6. The scaling from raw to displayed index, and the smoothing.
7. Artefact, EMG and burst-suppression handling.
8. The sensor sites and derivations of the instrument whose name the reader would carry (PSA4000, PSArray2 or SEDLine).

**The primary references most likely to hold some of this** (cited by the two papers, references as printed; none
read, none used; DOIs found with Crossref and resolved at doi.org):

| Reference as printed | Why it is needed | DOI (verified) |
|---|---|---|
| P04 ref. 20: "Drover D, Lemmens H, Loyd G, et al. Patient state index (PSI): Sensitivity to changes in anesthetic state and optimization of delivery and recovery from anesthesia. Anesthesiology 2002; 97: 82–89". D06 ref. 6 cites the same article differently: "Drover DR, Lemmens HJ, Pierce ET et al. Patient State Index: titration of delivery and recovery from propofol, alfentanil, and nitrous oxide anesthesia. Anesthesiology 2002; 97(1): 82–89." Crossref's title matches D06's | P04 p. 395 says it "provides additional details of this computation": **the first source to read** (items 1–6). It is also the prospective validation (D06 p. 125) | 10.1097/00000542-200207000-00012 |
| P04 ref. 4 / D06 ref. 2: "John ER, Prichep LS, Kox W et al. Invariant reversible QEEG effects of anesthetics. Conscious Cogn 2001; 10(2): 165–183." | the invariant feature set the index was selected from (items 4, 7) | 10.1006/ccog.2001.0507 |
| D06 ref. 4: "Prichep LS, John ER, Gugino LD et al. Quantitative EEG assessment of changes in the level of sedation / hypnosis during surgery under general anesthesia. In Jordan C, Vaughan D & Newton D (eds.) Memory and Awareness in Anesthesia IV. London: Imperial College Press, 2000, pp. 97–107." | an earlier developer description of the surgical database and features (items 4, 10) | 10.1142/9781848160231_0008 |
| P04 ref. 21 / D06 ref. 3: "Gugino LD, Chabot RJ, Prichep LS, John ER, Formanek V, Aglio LS. Quantitative EEG changes associated with loss and return of consciousness in healthy adult volunteers anesthetized with propofol or sevoflurane. Br J Anaesth 2001; 87: 421–8" | the volunteer study used to calibrate the index (D06 p. 125; item 6), and the physiology a generator must show | 10.1093/bja/87.3.421 |
| P04 ref. 17: "John ER, Prichep LS, Friedman J, Easton P. Neurometrics: computer assisted differential diagnosis of brain dysfunctions. Science 1988; 239: 162–9" | the "neurometric QEEG procedures" for the normalising transform and the Z-scores (item 3) | 10.1126/science.3336779 |
| P04 ref. 18: "John ER, Prichep LS. In: Niedermeyer E, Lopes Da Silva F, eds. EEG: Basic Principles, Clinical Applications and Related Fields. Amsterdam: Williams and Wilkins, 1993; 989–1003" | the same procedures (item 3) | not looked up (a book chapter) |
| P04 ref. 19: "Gugino LD, Chabot RJ, Aglio LS, Maddi R, Gosnell J, Aranki S. QEEG and neuropsychological profiles of patients prior undergoing cardiopulmonary bypass surgical procedures. Clin EEG 1997; 28: 87–97" | cited for the self-norming (item 5) | 10.1177/155005949702800206 |
| P04 ref. 16: "Wolberg G. IEEE Computer Society Press. Los Alamitos, CA: Digital Image Warping, 1990" | Fant's resampling (front end only) | not looked up (a book) |

Honest caveat: both developer papers call the discriminant proprietary, and the reference distributions sit in private
databases (BRL; "Physiometrix Data on File", D06 p. 125). Drover 2002 is a clinical trial; P04 sends the reader there
for "additional details", but a trial paper rarely prints coefficients and normative tables. The coefficients and
reference distributions may never have been published. In that case only the maker could supply them (the depth plan
§10.1 lists "the maker" for P-19). A maker's patent is a possible avenue. It lies outside the sources this brief allowed
and was not searched.

## 6. What the reader would need from the engine that it does not have today

**What the engine has today** (origin/main 039ae809):
- one EEG channel, `eeg`, at `EEG_RATE = 125` Hz, described as "one frontal channel" with three electrodes (signal,
  reference, ground; `packages/engine-core/src/l2/eeg/pipeline.ts`, `EEG_RATE`, `EEG_ELECTRODES`);
- the generator is random-phase spectral synthesis (`l2/eeg/synth.ts`) from one spectrum per cortical state
  (`l2/eeg/spectra.ts`). No electrode site is distinguished: there is no posterior, central or lateral channel, and no
  state variable for eyes open or closed;
- the readers' interface is `create(fsHz)` and `read(state, samples, impedanceKOhm)`, with one sample stream
  (`l3/eeg-devices/registry.ts`). Only `generic` is registered on main.

**What a PSI reader would need, if a source ever supplies the method:**
- **Four channels at the device's sites** (P04: Fp1, Fpz′, Cz, Pz against linked ears, or the later sensor's sites and
  derivations), and a reader interface that takes several sample streams.
- **Region-specific spectra that couple to the drugs separately per site**: frontopolar vs vertex gamma, frontal vs
  central beta, frontal vs parietal alpha, vertex delta, posterior low delta. Each of these features compares regions,
  so a generator that copies one spectrum to four sites would give gradients of zero.
- **Coupling between channels**, if the coherence, symmetry and phase features D06 names are part of the method. Today's
  generator draws each frequency's phase independently and has no designed phase relation between channels (clinical
  plan §2, P2 and P7).
- **The sample rate.** The 100 Hz analysis rate (P04 p. 394) is below the engine's 125 Hz, so 125 Hz covers the 0–50 Hz
  bands. The reader would still have to resample 125 → 100 Hz by a method the papers only cite (Fant, via Wolberg).

**Which plan it belongs to, from what the two plans state:**
- The depth plan puts the montage in **E10**: four channels rendered by the present generator, "needed by PSI only"
  (D2), sites `[OWNER P-19]`. The owner ruled it built (Q10 B, 6 November). That would be a change to the present
  generator.
- The clinical-generator plan (`docs/plans/eeg-clinical-generator.md` §4.6 and EQ3, which the owner has put on hold)
  argues that E10 on the present generator would give channels "by construction" that G5 (regions, head mixing, the
  10–20 electrodes) would later replace. It proposes folding E10 into G5, with PSI waiting behind G5. EQ3 is not ruled.
- Read together: as ruled today, the montage is the depth plan's E10, a change to the present generator. Inter-channel
  coherence and symmetry of the kind D06 describes are what the clinical plan says the present generator cannot carry,
  and G5 is where they would come from. Since the PSI cannot be built anyway (§5), **nothing in this note needs E10
  now**. E10's other consumer is cell C32 (anteriorisation).

## 7. Acceptance numbers the papers give (not a method; never to be used as one)

These are outcomes. They may set the PSI rows of C27 (and add to C33) only once a reader exists from a published method.

| What | Numbers | Page |
|---|---|---|
| Mean PSI by stage, all anaesthetics (95 % CI; n) | baseline awake/sedated 80.0 (77.3–82.6; 166); early surgical plane 32.2 (29.1–35.3; 155); uneventful surgical plane 33.6 (32.2–35.1; 672); ≈ 1 min before somatic events 72.1 (63.2–81.1; 21); emergence −2 (≈ 10 min before eyes open) 56.4 (52.0–60.9; 125); emergence −1 (≈ 5 min before) 62.7 (58.7–66.7; 148); eyes open 75.6 (72.0–79.1; 150) | P04 Table 3, p. 397 |
| The same by regimen | GAS 78.5 / 26.9 / 28.6 / 54.7 / 54.5 / 62.4 / 77.1; TIVA 82.1 / 28.3 / 32.2 / 74.1 / 60.6 / 70.2 / 79.0; N/N 79.9 / 41.2 / 41.1 / 73.9 / 53.9 / 56.5 / 71.1 (same columns; N/N higher during surgery, "lighter" state, p. 396) | P04 Table 3, p. 397 |
| By volatile | desflurane 75.2 / 22.4 / 25.6 / 69.1 (n = 1) / 51.0 / 61.3 / 81.6; isoflurane 80.5 / 32.8 / 32.4 / 40.3 (n = 1) / 64.1 / 68.6 / 80.9; sevoflurane 79.3 / 19.7 / 24.5 / NA / 35.5 / 49.2 / 63.4 | P04 Table 4, p. 398 |
| Stage curve | Fig. 1, read from the page image (± 2): ≈ 92 the day before surgery (a00); ≈ 80 after premedication (a02); ≈ 21 at loss of consciousness (c02); ≈ 25–43 through intubation and maintenance; rising to ≈ 78–80 at eyes open | P04 Fig. 1, p. 397 |
| PSI vs OAA/S regression | R² 0.63 all; 0.71 GAS; 0.65 TIVA; 0.56 N/N (all P < 0.0001). Curves in Fig. 2: arousal score ≈ 0 at PSI ≈ 15–20, rising to ≈ 4 at PSI ≈ 85–100 | P04 p. 396, Fig. 2 p. 398 |
| PSI vs modified OAA/S (volunteers) | Fig. 4, read from the page image (± 2): OAA/S 0 ≈ 21; 1 ≈ 38; 3 ≈ 67; 4 ≈ 73; 5 ≈ 84 (no point at 2) | D06 Fig. 4, p. 126 |
| Mean PSI by stage, "PSArray2", N = 176 | Fig. 3, read from the page image (± 2), as IA / TIVA / N/N / ALL: baseline ≈ 89 / 91 / 92 / 91; early surgical ≈ 39 / 38 / 61 / 46; uneventful surgical ≈ 40 / 42 / 60 / 47; somatic events ≈ 57 / 78 / 82 / 78; emergence −2 ≈ 58 / 64 / 63 / 61; emergence −1 ≈ 65 / 70 / 66 / 67; eyes open ≈ 79 / 82 / 77 / 79 | D06 Fig. 3, p. 125 |
| Clinical target used in a trial | PSI 38–50 | D06 p. 126 (ref. 7) |
| PSI vs BIS, detection of consciousness | ROC area PSI 0.95 ± 0.04 vs BIS 0.79 ± 0.04 (PSArray vs A2000), and electrocautery affected PSI 16 % vs BIS 65 % (ref. 11); PSA Frontal Array vs BIS XP: 0.98 ± 0.05 vs 0.97 ± 0.05, cautery 31 % vs 73 % (ref. 12) | D06 p. 126 |
| Correlation with end-tidal desflurane | at eye opening r = 0.57 (BIS 0.11); at extubation r = 0.72 (BIS 0.33) | D06 p. 127 |
| ICU sedation | prediction probability 0.92 ± 0.037 vs Ramsay score (41 patients); r = −0.98 in 30 CVICU patients | D06 p. 127 |

**Cautions on these numbers:**
- **Two versions disagree.** D06 Fig. 3 (labelled "PSArray2", N = 176, "Physiometrix Data on File, 2002") and P04
  Table 3 appear to describe the same 176-case retrospective series. Their values differ: baseline ≈ 91 vs 80.0; early
  surgical plane ≈ 46 vs 32.2. The difference fits a change of algorithm version or scaling between the papers. So an
  acceptance band must name the version it comes from.
- **The group sizes do not agree within P04.** Table 1 (p. 394) and the text (p. 396) give 49 TIVA, 68 GAS and 59 N/N.
  The legend of Fig. 1 (p. 397) prints "Gas (n=68), N/N (n=49), TIVA (n=57)". The regressions use 46, 63 and 57
  (p. 396).
- **One citation in D06 is wrong.** D06 cites the ICU study as "Schneider et al. (ref. 13)" (p. 127), but its ref. 13 is
  Schnider TW, Minto CF, Shafer SL, "The influence of age on propofol pharmacodynamics", Anesthesiology 1999
  (p. 128), a propofol pharmacodynamic paper. The ICU source for the 0.92 is therefore not identified in D06.
- **Not from these two papers.** The C33 cells (Kuizenga 2019, via Miller Ch23 p. 633) come from Miller.

## 8. The question for the owner

**The PSI reader cannot be computed from the two papers. What do you want for P-19 and E11?**

*Explanation:* The papers name the electrode sites (Fp1, Fpz′, Cz, Pz), the bands and seven features. The step that
turns those features into the number is a "proprietary multivariate discriminant". It rests on reference distributions
from the developers' unpublished databases, followed by an unpublished scaling. The developer paper itself points to
Drover et al. 2002 (Anesthesiology 97:82–89) for "additional details of this computation". That is the one remaining
cited source with a real chance of adding something. Like the Narcotrend papers, though, it is more likely to hold the
trial than the coefficients.

*Options:*
- **A.** Close P-19 now as "not buildable from published sources", as was done for Narcotrend. E11 is not built, and E10
  is not built for the PSI.
- **B.** Supply Drover 2002 (and, if you wish, John 2001 and the Prichep 2000 chapter) for one more reading round, then
  decide by the same test.
- **C.** Ask the maker for the method (the discriminant, the reference distributions, the scaling and the sensor sites).
- (Rejected, listed only for completeness: build a "PSI-type" reader from the seven named features with our own
  definitions, weights and scaling. That is a constant and a function of our own under the device's name, which your
  rule forbids.)

*Proposal:* **B, then A if Drover 2002 does not give items 1–3 of §5.** One paper is a small cost, and the developers
themselves point to it. Meanwhile, do not build E10 for the PSI. The montage's only other consumer is C32, and whether
it belongs on the present generator is the open EQ3 of the clinical-generator plan.

**What the depth plan's P-19 row should then say** (this note does not edit the plan): "PSI montage, features, scale —
not buildable from Prichep 2004 + Drover & Ortega 2006 (docs/research/eeg-psi-reader-sources.md): sites, bands and seven
features named, but the discriminant, its coefficients, the reference distributions and the scaling are proprietary or
unpublished. Next: Drover 2002, Anesthesiology 97:82–89 (doi:10.1097/00000542-200207000-00012), or the maker."
