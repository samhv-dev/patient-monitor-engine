# Transcutaneous pacing threshold: what is measured, by placement, patient and pulse width (M0b, brief 178)

**Purpose.** The defibrillator plan (`docs/plans/defibrillator-zoll-m2.md`) names gap **G-THR**: how the current needed
to capture with transcutaneous pacing depends on pad placement and on the patient. The guide says only that
anterior–posterior placement "typically requires lower current" and that typical thresholds are 40–80 mA. Piece E6
keeps today's `paceThresholdMa` (an instructor's setting, default 70 mA, range 10–200) until a source sets more. This
note gathers what is published, with numbers only where a source measured them.

**How it was searched (12 November 2026).** Europe PMC REST search (`/webservices/rest/search`, `resultType=lite`
and `core`), with title and abstract queries on transcutaneous / external / noninvasive / transthoracic pacing combined
with threshold, capture, mA, pulse width or duration, and electrode position or placement (about 1 100 records
screened by title; 33 abstracts read). Crossref was used to look for a DOI where Europe PMC gave none. Every DOI below
was resolved through `https://doi.org/` (HTTP 302 to the publisher on 12 November 2026). Open-access full text was
read as a web page where it existed (one paper, Goldschmied 2026, PMC13153136). **No file was downloaded, no form
filled, no bot check passed, no personal identifier sent.** Everything else rests on the abstract: where the abstract
does not state the device, pulse width or placement, the table says "not stated", and the full text is WANTED.

## 1. What the guide states (Rev. C)

| Statement | Page |
|---|---|
| Pads in apex/sternum or anterior/posterior position; "Anterior/posterior positioning is preferred because it typically requires lower current to achieve capture" | [G 16-3] |
| "The ideal pacer current is the lowest value that maintains capture — it is usually about 10% above threshold. Typical threshold currents range from 40 to 80 mA." Electrode location changes the current; the lowest threshold comes with the most direct path through the heart avoiding large chest muscles | [G 16-6], repeated for fixed mode [G 16-9] |
| Output 8–140 mA in 2 mA steps, ±5 % or 5 mA; pulse rectilinear constant current, 40 ms ± 2 ms | [G 16-5], [G A-10] |
| Paediatric pacing uses the same method; small pads below 15 kg | [G 16-10] |
| Electrical capture: a large ectopic beat after the pulse; mechanical capture: signs of increased flow | [G 1-17], [G 16-5] |

(The French Rev. D renders the 10 % sentence as "10 % en dessous du seuil", 10 % *below* threshold [D 16-6]; that cannot
maintain capture and reads as a translation error. The plan follows Rev. C: `docs/research/defib-zoll-m2-rev-d-differences.md`.)

## 2. Every measured series found

Threshold = the lowest current giving (electrical) ventricular capture, as each paper defines it. "±" is as the
abstract gives it (SD unless the paper says otherwise; Falk 1993's "± 6 mA" across 32 subjects is probably SEM, not
confirmed). AP = anteroposterior; AL = anterolateral (apex–sternum type).

| Source | Subjects, setting | n | Threshold (mA) | Range (mA) | Placement | Device; pulse width |
|---|---|---|---|---|---|---|
| Madsen 1988, Am Heart J 116:7 | patients needing pacing (MI blocks, sick sinus, others) | 35 (33 paced) | — | 30–110 | not stated | Zoll noninvasive temporary pacemaker (title); width not stated |
| same, subgroup | pacing before a permanent catheter | 8 | median 55 | 45–90 | not stated | as above |
| Luck 1990, PACE 13:2031 | EP-laboratory patients, 45 ± 17 y | 17 | 64 ± 14 | 40–80 | not stated | not stated |
| Falk 1993, JACC 22:1354 | normal subjects, randomised double-blind, 110 attempts | 32 | 72.5 ± 6 (40 ms, high-impedance pads); 78.7 ± 6 (40 ms, low-impedance); 73.8 ± 7 (20 ms, high); 77.5 ± 7 (20 ms, low); all differences NS | — | not stated | two commercial pacers; 20 and 40 ms |
| Kemnitz 1992, Anesthesiology 77:258 | anaesthetised, implanted ICD patches | 9 | 73 ± 30 (AP) | 40–140 | AP (also right-to-left tried) | transportable pacer; 50 ms |
| same, controls | anaesthetised, before CABG | 9 | 57 ± 20 | 30–90 | AP | 50 ms |
| same, controls | after CABG | 9 | 94 ± 24 | 40–120 | AP | 50 ms |
| Amar 1993, Anesthesiology 79:715 | anaesthetised, right thoracotomy, no cardiac disease | 10 | 86.9 ± 20.6 | — | not stated | not stated |
| same | left thoracotomy | 10 | 106.7 ± 16.2 | — | not stated | not stated |
| Kelly 1989, Anesthesiology 70:747 | cardiac surgery, 24 h | 23 | not given in the abstract (rose over time; highest after chest closure) | — | not stated | not stated |
| Altamura 1990a, PACE 13:2017 | patients with endocardial recordings | 8 | 74 ± 14 (ventricle); 138 ± 25 (atria, captured in 4) | — | AP, 50 cm² pads | Pace Aid 52; "20 sec" in the abstract (20 ms meant) |
| Altamura 1990b, PACE 13:2038 | emergency bradycardia, asystole, pre-op bifascicular block | 32 (30 captured) | mean 81 | — | V3 position and back | PaceAid 50/52; 20 ms |
| Jaworska 2007, Cardiol J 14:137 (PMID 18651449, no DOI found) | anaesthetised, incomplete relaxation | 58 | 70.5 ± 18.3 (rectangular pulse) | — | not stated | 40 ms base; rectangular vs sine-shaped pulses |
| Prochaczek 1989, Kardiol Pol 32:351 (PMID 2632914, Polish, no DOI) | healthy volunteers | 15 (10 captured) | mean 42 | — | not stated | high-impedance pads; width not stated |
| **Moayedi 2022, Resuscitation 181:140** | sedated, right after elective cardioversion; crossover | 20 enrolled, 13 paired | mean **93 (AP)** vs **126 (AL)**; difference 33 (95 % CI 20–45), P = 0.001; non-capture at 140 mA counted as 141 (4 captured in neither position) | — | AP vs AL | Zoll, 40 ms constant current (stated by Goldschmied 2026, not read in Moayedi's own text) |
| **Goldschmied 2026, IJC Heart Vasc 62:101857** (open access, read) | symptomatic bradycardia, sedated; crossover | 16 (32 trials) | median **125 (AP)** [IQR ± 48] vs **140 (AL)** [± 78], P = 0.53; 2/32 trials no capture at 200 mA, both AP, both on beta-blockers (counted as 201) | — | AP vs AL ("similar to Moayedi") | Lifepak 20e, Quik-Combo pads; width not reported |
| Béland 1987, PACE 10:1262 | children 0.9–17.9 y, 6.96–51 kg, at anaesthetic induction | 22 (53/56 trials captured) | 63 ± 14 (adult pads); 53 ± 12 (medium); 51 ± 11 (small) | 42–98; 36–92; 29–82 | not stated | "commercially available device"; width not stated |

**Related numbers that are not thresholds.** Smida 2026 (Resuscitation 219:110934; 299 prehospital patients):
sustained electrical capture in 29 (9.7 %); the *maximum current delivered* was median 90 mA [IQR 70–110]; lower body
weight (aOR 0.95 per kg), lower pre-pacing heart rate and higher current (aOR 1.25 per 10 mA) went with sustained
capture. Falk 1988 (PACE 11:1439, 6 normal subjects): IV propranolol 10 mg or verapamil 10 mg did not change the
threshold (no values in the abstract). Kreinbrook 2024 (PACE, DOI 10.1111/pace.15031) argues that older trials
counted false electrical capture; its abstract gives no numbers.

## 3. What the sources support for G-THR, and where they stop

**Supported.**

1. **A per-patient threshold, not a fixed number.** In every series the threshold varies widely between patients:
   adult means 57–94 mA with SDs of 14–30 mA in elective and anaesthetised groups, ranges from 30 to 140 mA, and higher
   in sicker or post-surgical groups (Kemnitz after CABG 94 ± 24; Amar left thoracotomy 106.7 ± 16.2; Goldschmied
   bradycardic patients median 125–140). The guide's "typical 40–80 mA" [G 16-6] matches the elective series, not the
   emergency bradycardia series. Today's single default of 70 mA lies inside the elective spread.
2. **Placement (AP lower than AL) with the M2's own pulse.** One randomised crossover with a Zoll 40 ms constant-current
   pacer measured AP 33 mA lower than AL (Moayedi 2022). It agrees with the guide's statement [G 16-3]. With a different
   maker's pacer in bradycardic patients the difference was smaller and not significant (Goldschmied 2026), and two of
   its AP trials failed to capture at 200 mA. For an M2 model the Zoll-pulse figure is the one that applies; it rests
   on 13 paired, sedated, post-cardioversion patients.
3. **Pulse width 20 vs 40 ms and pad impedance do not move the threshold** in normal subjects (Falk 1993).
4. **Children.** Thresholds in children 1–18 years are of the same order as adults' (51–63 mA mean by pad size, range
   29–98 mA) and did not vary with age, weight or chest size; smaller pads needed less current (Béland 1987).
5. **Things that raise it, by direction.** Surgery and chest closure (Kelly 1989; Kemnitz 1992); left thoracotomy more
   than right (Amar 1993); beta-blocker therapy in bradycardic patients (Goldschmied 2026, B = 72 mA, mixed model),
   but not acute IV propranolol or verapamil in normal hearts (Falk 1988); lower LV mass raises it (Goldschmied 2026).

**Not reached (stays a gap).**

- **No measured relation to body size, chest wall or transthoracic impedance in adults** in any abstract read; Smida
  2026 gives only an association of weight with sustained capture. A threshold that scales with the patient's build
  would be invented.
- **No measured effect of hypoxia, acidosis, hyperkalaemia, ischaemia or arrest duration on threshold.** Zoll 1985
  reports that its 29 failures of 134 occurred with prolonged hypoxia or severe discomfort, but gives no threshold.
- **AL vs AP with the Zoll pulse in bradycardic (not post-cardioversion) patients** is not measured.
- **The paediatric placement effect** is not measured; Béland gives pad size, not placement.
- **Mechanical vs electrical capture.** All series measure electrical capture; the current for a palpable pulse is
  not published as a series.
- **Full texts.** Moayedi 2022, Falk 1993, Kemnitz 1992, Amar 1993, Kelly 1989, Luck 1990, Madsen 1988 and Béland 1987
  are not open access; their placements, devices and SD/SEM conventions not in the abstracts are WANTED (§4).

**What E6 can therefore take, if the owner agrees (a proposal, not a decision).** Keep the instructor's
`paceThresholdMa` as the patient's threshold for the default (apex–sternum/AL) placement and apply a measured AP offset
of −33 mA (95 % CI 20–45; Moayedi 2022) when the pads are placed anterior–posterior, with the source cited beside the
constant; offer the instructor presets from the measured series (elective about 60–75 mA, post-surgical about 95,
bradycardic emergency about 125) rather than one number. Nothing is fitted; anything about body size or physiology stays
the instructor's choice until a series is found.

## 4. Sources

| Source | Identifier | How verified | Read |
|---|---|---|---|
| Madsen JK et al. Transcutaneous pacing: experience with the Zoll noninvasive temporary pacemaker. Am Heart J 1988;116:7–10 | DOI 10.1016/0002-8703(88)90242-6; PMID 3394635 | Europe PMC record; DOI resolves | abstract |
| Luck JC, Grubb BP, Markel ML. Description of the strength-interval relation with external noninvasive pacing. PACE 1990;13:2031–2037 | DOI 10.1111/j.1540-8159.1990.tb06937.x; PMID 1704588 | as above | abstract |
| Falk RH, Battinelli NJ. External cardiac pacing using low impedance electrodes suitable for defibrillation: a comparative blinded study. JACC 1993;22:1354–1358 | DOI 10.1016/0735-1097(93)90542-9; PMID 8227791 | as above | abstract |
| Kemnitz J et al. Transcutaneous cardiac pacing in patients with automatic implantable cardioverter defibrillators and epicardial patch electrodes. Anesthesiology 1992;77:258–262 | DOI 10.1097/00000542-199208000-00006; PMID 1642344 | as above | abstract (truncated at 250 words by the index) |
| Amar D et al. Transcutaneous cardiac pacing during thoracic surgery. Anesthesiology 1993;79:715–723 | DOI 10.1097/00000542-199310000-00013; PMID 8214750 | as above | abstract |
| Kelly JS et al. Efficacy of noninvasive transcutaneous cardiac pacing in patients undergoing cardiac surgery. Anesthesiology 1989;70:747–751 | DOI 10.1097/00000542-198905000-00006; PMID 2719306 | as above | abstract |
| Altamura G et al. Transcutaneous cardiac pacing: evaluation of cardiac activation. PACE 1990;13:2017–2021 | DOI 10.1111/j.1540-8159.1990.tb06934.x; PMID 1704585 | as above | abstract |
| Altamura G et al. Emergency cardiac pacing for severe bradycardia. PACE 1990;13:2038–2043 | DOI 10.1111/j.1540-8159.1990.tb06938.x; PMID 1704589 | as above | abstract |
| Jaworska K, Prochaczek F, Gałecka J. Influence of the shape of the pacing pulse on ventricular excitation threshold… Cardiol J 2007;14:137–142 | PMID 18651449; no DOI found (Europe PMC, Crossref) | Europe PMC record | abstract |
| Prochaczek F et al. [Transcutaneous stimulation of the heart ventricles…]. Kardiol Pol 1989;32:351–357 | PMID 2632914; no DOI | Europe PMC record | English abstract |
| Moayedi S et al. Anteroposterior pacer pad position is better than anterolateral for transcutaneous cardiac pacing. Resuscitation 2022;181:140–146 | DOI 10.1016/j.resuscitation.2022.11.009; PMID 36410605; NCT03898050 | as above | abstract |
| Moayedi S et al. (research letter, same trial) Circulation 2022;146:1103–1104 | DOI 10.1161/circulationaha.122.060735; PMID 36191069 | DOI resolves | not read (no abstract) |
| Goldschmied A et al. Anteroposterior versus anterolateral pacer pad position in patients with symptomatic bradycardia. Int J Cardiol Heart Vasc 2026;62:101857 | DOI 10.1016/j.ijcha.2025.101857; PMC13153136 | DOI resolves; open-access text | full text (web page) |
| Béland MJ et al. Noninvasive transcutaneous cardiac pacing in children. PACE 1987;10:1262–1270 | DOI 10.1111/j.1540-8159.1987.tb04962.x; PMID 2446273 | as above | abstract |
| Smida T et al. The prevalence of sustained electrical capture during prehospital transcutaneous pacing. Resuscitation 2026;219:110934 | DOI 10.1016/j.resuscitation.2025.110934; PMID 41443580 | as above | abstract |
| Falk RH, Knowlton AA, Battinelli NJ. The effect of propranolol and verapamil on external pacing threshold. PACE 1988;11:1439–1443 | DOI 10.1111/j.1540-8159.1988.tb04993.x; PMID 2462221 | as above | abstract |
| Zoll PM et al. External noninvasive temporary cardiac pacing: clinical trials. Circulation 1985;71:937–944 | DOI 10.1161/01.cir.71.5.937; PMID 3886190 | as above | abstract (no threshold values) |
| Kreinbrook J, Kimbrell J. Historical discrepancies in transcutaneous pacing trials. PACE 2024 | DOI 10.1111/pace.15031; PMID 38967985 | Europe PMC record | abstract (no numbers) |

**Searched and found nothing usable:** Falk 1983 NEJM (DOI 10.1056/nejm198311103091907, no abstract in the index);
the prehospital cohorts of 2024–2026 other than Smida 2026 give capture rates, not thresholds; no open-access text of
Moayedi 2022 was found.
