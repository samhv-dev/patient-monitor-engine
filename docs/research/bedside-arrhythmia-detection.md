# Bedside arrhythmia detection: the sources for the VF, VT and asystole alarms (M0e)

*Research note for the defibrillator plan (`docs/plans/defibrillator-zoll-m2.md`, §3.4, gaps G-BVF and G-CPV), piece
M0e. Written 12 November 2026 for B1 (the bedside VF alarm from the signal) and E4b (Check Patient). No code, no
constant.*

**The rule this note keeps.** A criterion, delay or performance figure is written here only as its source states it,
with the document, revision and page (or table), and only for the maker and monitor family it was stated for. A figure
is never carried from one maker's monitor to another's and never estimated. Where nothing was found, the gap is named.

**How to read the tags.** *[read]*: I read the text myself in this brief. *[repo record]*: the repository's own earlier
research (`research/05`, `research/06` in the project folder, quoted in the skins' `provenance`) records it from a
manual that this brief did not re-read. *[inference]*: my own reasoning from what a source says, marked so that nobody
takes it as the source's statement.

---

## 0. Summary for B1

| Skin (`packages/skins/src/data/skins/`) | Styled after (as the repository states it) | VF criterion found | VF delay found | VT criterion | Asystole | Detector performance |
|---|---|---|---|---|---|---|
| `philips-like` | "IntelliVue-style, OR configuration"; manuals [S1]/[S2] of `research/05` | **Yes.** IntelliVue IFU Rel. D.0: a fibrillatory waveform for 4 consecutive seconds (p. 58) [read]; the same 4 s on the Philips CMS (Aboukhalil 2008, Table 1) [read] | Philips CMS: "typical" 5 s (Aboukhalil 2008, Table 1) [read]; IntelliVue: system delay under 3 s (IFU p. 294) [repo record] | consecutive PVCs over the V-Tach run limit and HR over the V-Tach HR limit (IFU Rel. D.0 p. 58) [read] | no QRS for longer than the asystole threshold, in the absence of VF or chaotic ECG (IFU Rel. D.0 p. 53) [read]; threshold 4.0 s adult, 3.0 s neonate [repo record] | not found (Philips's ST/AR performance note is a download: WANTED W3). One independent bench test of an IntelliVue MX430 (Cosentino 2024, GE-funded) |
| `ge-like` | "CARESCAPE-style bedside"; manual [S3] of `research/05` | **No.** The only GE wording found is a study's own annotation protocol, not GE's definition (§2.2) | not found | not found in a GE document; the study protocols used ≥ 6 at ≥ 100/min (Drew 2014, Table 3) | not found in a GE document; the study protocols used no QRS for about 5–6 s | not found (GE's EK-Pro papers are downloads: WANTED W5, W6). One GE-funded bench test of a GE B125M, EK-Pro v14 (Cosentino 2024) |
| `mindray-like` | "Mindray-like (bedside)"; BeneVision N manual [S4] of `research/05` | **No** | not found | V-Tach rate 130, V-Tach PVCs 6, App. C.1.1.2 [repo record] | asystole delay 5 s, App. C.1.1.2 [repo record] | not found. Bench test of ePM10 and iPM12 (Cosentino 2024) |
| `saadat-like` | "Iranian bedside, B9 family"; Saadat manual D01111-12 (`research/06`) | **No** (VFIB is named and cannot be switched off; its criterion is not recorded) | "less than 1 s" from condition to indication, general [repo record, M p. 50] | rate ≥ 120 and count ≥ 5 [repo record, M p. 302–306] | 10 s (ECG chapter) vs 5 s (arrhythmia chapter), a conflict inside the manual [repo record] | not found |
| `zoll-like` | "ZOLL-like (defibrillator monitor)"; X Series Operator's Guide [S5] of `research/05` | **No** for the X Series. The M2's Check Patient (§4) is a different device | not found | not found | not found | not found |
| `lifepak-like` | "LIFEPAK-like (defibrillator monitor)"; LIFEPAK 15 Operating Instructions [S6] of `research/05` | **No.** Only that CPSS watches for a "potentially shockable rhythm" when the VF/VT alarm is on (Stryker glossary) [read] | not found | not found | not found | not found |

What B1 can build on with a source: **the Philips skin's VF criterion (4 s of fibrillatory waveform)**. For the other
five skins the VF criterion and delay stay **gaps (G-BVF)**. They go to the owner (§5, DQ30); they are never given
Philips's 4 s and never the old 3 s.

---

## 1. The standards

### 1.1 What open sources say the standards require

No standard was read: IEC 60601-2-27 and ANSI/AAMI EC57 are sold, not open (WANTED W1, W2). What follows is only what
open documents state about them.

| Statement | Source, as it states it | Required, or disclosed only? |
|---|---|---|
| The alarm delay for asystole, extreme brady/tachy and VTach/VFib is under 10 s | Aboukhalil 2008, Table 1 column "Time Delay For Alarm AAMI-EC-13 Cardiotach Standard (sec)": "< 10 sec" for asystole, extreme bradycardia, extreme tachycardia and VTach/VFib; "N/A" for VTach. §2.4: the AAMI standards require asystole and rate-limit alarms within 10 seconds [read] | a requirement, as the paper reports it, of **ANSI/AAMI EC13** (the US cardiac monitor standard that the paper cites, ref. 27). The paper does not say whether IEC 60601-2-27:2011 keeps it [inference: the 2011 edition is the one in force; not verified] |
| Critical arrhythmia alarms on the Philips CMS were defined "according to" ANSI/AAMI EC13 | Aboukhalil 2008, §2.2 [read] | — |
| QRS complexes under 150 µV could not count as valid beats under EC13 | Aboukhalil 2008, §4 (the cause of most false asystole alarms) [read] | a requirement as the paper reports it |
| Heart-rate response time, response to irregular rhythms, tachycardia alarm response, tall-T rejection, pacemaker-pulse rejection, recovery after defibrillation | The ZOLL M2 guide states each "per EN/IEC 60601-2-27", with clause numbers 201.7.9.2.9.101 b) 5) and b) 6), 201.12.1.101.17 and 201.12.1.101.13 (Rev. C and Rev. E, pp. A-3 to A-4) [read] | **disclosed** figures (the guide gives its own measured values, e.g. tachycardia response under 8.0 s). [inference: 201.7.9.2.9 sits under 201.7.9.2, the instructions-for-use clause of the IEC 60601 family, which is why these appear as disclosures; not verified in the standard] |
| HR averaging and the 80→120 bpm response under 11 s | Mindray BeneVision N manual, citing IEC 60601-2-27 cl. 201.7.9.2.9.101 [repo record, `research/05` §2.3] | disclosed |
| EC57 is a recommended practice for **testing and reporting**, not a performance standard; it covers ventricular flutter and fibrillation and atrial flutter and fibrillation | ANSI webstore abstract, as summarised by the search engine (the page itself answered 403) | **reporting only** [the abstract was not read directly: it stays to be confirmed in W2] |
| A detected episode counts as true if it overlaps a reference episode at all; VF episodes run from VFON to VFOFF | PhysioNet `epicmp` manual page (the reference implementation of the EC38/EC57 episode statistics; it names EC38:2007) [read] | reporting method |
| The IEC 60601-2-27:2011 abstract | webstore.iec.ch publication 2638: edition 3.0, 2011-03-30, 149 pages, CHF 380; its abstract mentions no arrhythmia detection, VF, asystole, alarm or disclosure [read] | — |

**Not found in any open source:** whether IEC 60601-2-27:2011 requires a bedside monitor to have a VF or VT detector
at all, a minimum VF sensitivity, a maximum VF alarm delay, or a disclosure of arrhythmia performance; and EC57's
exact list of VF statistics and databases. These are what W1 and W2 would answer.

### 1.2 What a bedside detector is NOT held to

The goals in the ZOLL guide's Table A-4 (coarse VF > 90 %, rapid VT > 75 %, NSR > 99 %, other non-shockable > 95 %,
asystole > 95 %; fine VF and other VT report only) are for **the AED analysis algorithm, in a single analysis
sequence**, under IEC 60601-2-4 subclause 201.7.9.3.103 and Kerber 1997 (Rev. C and Rev. E, p. A-34) [read]. They are
not a bedside monitor's goals, and nothing read says they apply to a monitor's continuous VF alarm or to Check Patient.
They stay with E4b's AED rule only.

---

## 2. Per skin

### 2.1 `philips-like` (IntelliVue-style)

**The document read.** *IntelliVue Patient Monitor MP20/30, MP40/50 and MP60/70/80/90, Instructions for Use, Release
D.0 with Software Revision D.00.xx*, served page by page as HTML on manualsonline.com
(`https://www.manualsonline.com/manuals/mfg/philips/mp4050.html?p=N`; web page N = printed page N + 20). The page
shows no edition, part number or printing date [read, p=1].

| Item | What it says | Where |
|---|---|---|
| VENT FIB/TACH alarm (red, `***`) | "A fibrillatory waveform for 4 consecutive seconds was detected"; from ECG; numeric flashes, red lamp, alarm tone | printed p. 58, *Patient Alarm Messages* [read] |
| VTACH alarm | Consecutive PVCs exceed the V-Tach Run limit and HR exceeds the V-Tach HR limit; the page gives the indication as a yellow lamp and a short yellow alarm | printed p. 58 [read]. *Note:* the page marks it `***` yet describes a yellow indication; reported as printed |
| VENT RHYTHM | adjacent Vs over the vent-rhythm limit and ventricular HR under the V-Tach HR limit | printed p. 58 [read] |
| ASYSTOLE (red) | No QRS for longer than the asystole threshold, in the absence of VF or chaotic ECG | printed p. 53 [read] |
| Rhythm status | VENT FIB/TACH: a fibrillatory wave for 4 consecutive seconds; ASYSTOLE: no QRS for 4 consecutive seconds (status messages, updated every second) | printed p. 110 [read] |
| Chain | an arrhythmia alarm is suppressed when a more serious alarm in the same chain is active, or during a timeout | printed p. 113 (web p=133) [read] |
| Adjustable limits | Vtach HR, Vtach Run, PVCs/min, Vent Rhythm, SVT HR, SVT Run, Asystole Thresh., Pause Threshold (values not on that page) | printed p. 113 [read] |
| Asystole threshold default | 4.0 s adult, 3.0 s neonate | Configuration Guide Rel. J.0 [S1], ECG table [repo record, `research/05` §2.2] |
| System alarm delay | under 3 s, "made up of the system delay time plus the trigger delay time" | IFU MP40–90 [S2] p. 28 and p. 294 [repo record, `philips-like.json` provenance `alarms.delayS`] |
| Arrhythmia analysis off on the OR skin | `arrhythmia.defaultOn: false` | brief §6.4; `research/03` §1.12 [repo record] |

**Another Philips family, for comparison only.** Philips CMS (Aboukhalil 2008, Table 1): VTach/VFib "fibrillatory
waveform for 4 sec or more", typical delay 5 s; asystole "No QRS for 4 sec" (adjustable 2.5–4.0 s), typical delay 5 s;
VTach a run of 5 or more ventricular beats with HR > 100 (adjustable run 3–99, HR 15–300) [read]. The CMS is an older
Philips monitor, not an IntelliVue; the IntelliVue's own manual (above) states the same 4 s, so the 4 s holds for
the skin on the IntelliVue's own page, not by carrying the CMS figure over.

**Disclosed performance.** Not found in any page read. Philips's ST/AR application notes exist only as PDF downloads
(WANTED W3, W4).

**Not found.** The IntelliVue VF alarm's own delay beyond the general system delay; the default V-Tach run and HR limits
in an IntelliVue document read in this brief; any IntelliVue release newer than D.0 read as a page (ManualsLib's
copies are behind a bot check). Whether "fibrillatory waveform" is defined by frequency or amplitude: a search-engine
snippet of a TRx draft manual mentions a 2–10 Hz sinusoid, but that page was not read (ManualsLib), so it is not used.

### 2.2 `ge-like` (CARESCAPE-style)

**Found, from GE.** GE ClinicalView, *Arrhythmia Detection with the EK-Pro Algorithm* (web page, dated 28 August 2026)
[read]:
- EK-Pro analyses four leads at once ("four simultaneous leads with multi-lead analysis"); a single-lead mode
  defaults to lead II.
- Its Lethal mode detects asystole, ventricular fibrillation and ventricular tachycardia.
- With artefact in all analysed leads it shows an Artifact message. Arrhythmia detection is suspended when the noise
  exceeds design thresholds for more than 20 of the last 30 seconds, until the signal recovers.
- A VTACH alarm below High priority escalates when, among other conditions, the event lasts longer than 30 s.
- The page's table of arrhythmia definitions (its "Table 2") is an image whose contents could not be read.

**What is not GE's.** Drew 2014 (GE Solar 8000i, software 5.4) and Harris 2017 (the same data) list VFIB/VTAC as
"Coarse flutter waves without QRS complexes", VT ≥ 6 consecutive PVCs at ≥ 100 bpm and asystole as no QRS for about
5–6 s (Drew 2014, Table 3; Harris 2017, Methods) [read]. The papers call these their **study's annotation protocol**,
not the monitor's definitions. They are what the annotators judged against and must not be used as GE's criterion.
(The plan's §3.4.1 row I1 calls the Drew wording "GE"; see §5.)

**Disclosed performance.** Not read: *EK-Pro v14 Algorithm Performance Comparison Study* (JB78843US, April 2022) and
the *EK-Pro whitepaper* (JB22468XX) are PDFs (WANTED W5, W6).

**Not found.** GE's VF criterion and delay, GE's asystole and VT defaults, any CARESCAPE B650/B850 manual page (the
manual [S3] is a 12.8 MB download, WANTED W7).

### 2.3 `mindray-like` (BeneVision N)

| Item | What it says | Where |
|---|---|---|
| Asystole delay | 5 s, all patient categories | BeneVision N Operator's Manual App. C.1.1.2 [repo record, `mindray-like.json`] |
| V-Tach | rate 130 (adult), PVCs 6; paed 130, neo 160 | App. C.1.1.2 [repo record] |
| Pause alarm | off, low priority | App. C.1.1.2 [repo record] |
| Limit-alarm delay | 6 s for continuously measured parameters, not apnoea or ST | §10.6.5, §39.4.6 [repo record] |

**Not found.** The VF (Vfib/Vtac) criterion and delay. No Mindray bedside manual was readable as a page: the
BeneVision N manual is a 6.9 MB PDF (WANTED W8); bioclinicalservices.com.au answered 403. Mindray's own disclosed
arrhythmia performance: not found.

### 2.4 `saadat-like` (Alborz B9 family)

All from `research/06` (the Persian user manual D01111-12, Mehr 1403, read in full by an earlier brief) [repo record]:
- ASYSTOLE, VFIB and VTAC are always level 1 and cannot be disabled, even with arrhythmia analysis off [M p. 49, 76,
  78, 98].
- Arrhythmia analysis is off by default; 17 named types; learning about 20 s (6 similar beats) [M p. 69, 73–84].
- Alarm delay "less than 1 s" from condition to indication [M p. 50].
- VTAC rate ≥ 120 (100–200) and count ≥ 5 (5–12) [M p. 302–306].
- Asystole: 10 s in the ECG chapter [M p. 65, 70], 5 s without a valid QRS in the arrhythmia chapter [M p. 83]: a
  conflict inside the manual, already tagged `conflict` in the skin.
- The monitor claims HR behaviour to IEC 60601-2-27:2011 [M p. 4, 264–266, 311].

**Not found.** What VFIB is detected by (criterion and duration). `research/06` does not record it. The manual is a
29.4 MB download (W9); the English manual D01112-V0 (27.6 MB, W10) was never read.

### 2.5 `zoll-like` (X Series)

The skin is styled after the ZOLL **X Series** ([S5], Operator's Guide 9650-001355-01 Rev. G). Nothing on its VF/VT
alarm, delay or performance was read; the guide is a PDF (the ifixit link now answers with an HTML page of length
0) — WANTED W11. The M2's Check Patient (§4) is a different device's feature and is **not** this skin's criterion.

### 2.6 `lifepak-like` (LIFEPAK 15)

Stryker's *LIFEPAK 15 – Glossary* (support web page, modified 30 March 2020) [read]: CPSS (Continuous Patient
Surveillance System) monitors the ECG in LEADS or PADDLES for a potentially shockable rhythm; it is active when the
VF/VT ALARM is selected ON in Setup/Alarms, or after pressing the ALARMS button. The Shock Advisory System is the AED
mode's analysis.

**Not found.** CPSS's criterion, delay, what suspends it, and its performance. Operating Instructions 3314911-030 are a
15.4 MB PDF (W12).

---

## 3. Published bedside performance

Bedside monitors only. AED analysis (ZOLL Table A-4, Kerber 1997, the AED studies in Ruiz de Gauna 2014) is a different
algorithm with different goals and is kept out of this table (§1.2).

| Study | Setting, n | Monitor (as stated) | Alarm criteria used | VF | VT | Asystole | Causes of false alarms, as stated |
|---|---|---|---|---|---|---|---|
| Aboukhalil 2008, DOI 10.1016/j.jbi.2008.03.003 (Table 1, Table 2, §2.1, §4) | MIMIC II, adult ICUs; 447 patients, 41 301 h | Philips CMS; single-lead analysis by the site's choice | the monitor's own (Table 1) | VTach/VFib: 313 alarms, 249 false, 79.6 % | VTach: 1 900 alarms, 885 false, 46.6 % | 579 alarms, 525 false, 90.7 % | single-channel ECG artefact and low-voltage signals (abstract); most false asystole from QRS under 150 µV (§4) |
| Drew 2014, DOI 10.1371/journal.pone.0110274 (Table 6, Table 7) | 5 adult ICUs, 77 beds, 31 days (March 2013); 461 patients; 12 671 arrhythmia alarms annotated | GE Solar 8000i, software 5.4; two leads shown at the bedside, seven stored | the study's annotation protocol (Table 3) | 158 alarms, 107 true, 51 false, 32.3 % | 3 861 alarms, 502 true, 3 352 false, 86.8 % | 792 alarms, 260 true, 531 false, 67.0 % (Table 7 counts 518 false asystole alarms) | VF: artefact mimicking a ventricular arrhythmia in all but one lead; in 8 of 51 (16 %) a single non-artefact lead was visible. VT: artefact; wide QRS from bundle branch block or ventricular pacing. Asystole: low-amplitude QRS in some leads; 469 of 518 (91 %) had visible QRS in at least one lead |
| Harris 2017, DOI 10.2147/TCRM.S126191 (Results) | the Drew 2014 cohort | GE Solar 8000i, 5.4 | as Drew 2014 | per-type counts not given | — | — | 27 % of false alarms had fair or poor signal quality; motion artefact in ventilated patients is the authors' speculation |
| Clifford 2015 (CinC), DOI 10.1109/CIC.2015.7408639, and Clifford 2016, DOI 10.1088/0967-3334/37/8/E5 (Table 1) | PhysioNet/CinC Challenge 2015: 4 hospitals, USA and Europe, "three major manufacturers" (not named); 750 training, 500 test alarms, each with the 5 min before | not named | the Challenge's own definitions: VF/flutter ≥ 4 s; VT ≥ 5 ventricular beats within 2.4 s; asystole ≥ 4 s without beats | training 52 false / 6 true; test 34 false / 6 true | training 253 false / 90 true; test 176 / 45 | training 100 / 20; test 90 / 12 | not given per type. The set was selected, so these are not clinical rates |
| Cosentino 2024, DOI 10.1016/j.cvdhj.2024.02.002 (Tables 1–5); **funded by GE HealthCare, three GE authors** | bench: 57 VT events from 29 ICU patients played back; 205 h of Holter recordings without VT (41 post-PCI patients) | GE B125M (EK-Pro v14); Mindray ePM10 (V2), iPM12 (V5.0); Nihon Kohden Life Scope BSM-3000; Philips Efficia CM120 (A.01.00); Philips IntelliVue MX430 (M.04.00) | each monitor's defaults; VT 6 beats (Life Scope 9) at 100/min; asystole 5 s (IntelliVue 4 s); VF duration in a supplement not read | no separate VF sensitivity: VF and VF/VT alarms on VT counted as correct. False VF/VT alarms in 205 h: B125M 0, ePM10 106, iPM12 84, Life Scope 56, Efficia 4, IntelliVue 3 | sensitivity on 57 events: B125M 56 (0.98), ePM10 44 (0.77), iPM12 48 (0.84), Life Scope 46 (0.81), Efficia 45 (0.79), IntelliVue 43 (0.75). False VT: 4, 36, 34, 1, 475, 294 | false asystole in 205 h: 2, 9, 2, 8, 14, 7 | not analysed by cause. All false alarms: B125M 20, ePM10 324, iPM12 284, Life Scope 292, Efficia 493 (494 in the text), IntelliVue 304 |
| Oh 2025, DOI 10.12659/MSM.949932 (Table 1) | 1 Korean ICU, two trials of 17 and 11 patients, 3 days each | Philips MX700 as comparator (vs an investigational Mediana M50) | not stated | not by type | not by type | not by type | MX700, all arrhythmia alarms: trial 1, 457 alarms, 135 false (29.54 %), 14 of them noise; trial 2, 193 alarms, 30 false (15.54 %), 11 noise. Noise named as muscle noise, baseline wander, power-line interference |
| Paine 2016, DOI 10.1002/jhm.2520 (Table 2) | systematic review | makers not named | — | — | Drew 2014: 0.3 % of 3 861 VT alarms actionable | — | actionable alarms < 1 %–26 % in adult ICUs (all alarm types) |

**Reading the table.** The only per-maker comparison under one protocol is Cosentino 2024, a bench test funded by
the maker that came out best. Its VF figures are false VF/VT alarms on recordings without VT, not VF sensitivity. No
study read gives a bedside monitor's **VF sensitivity** on true VF. The rates in different studies come from
different makers, years, settings and definitions and must not be compared as one monitor's performance.

**Artefact types that cause false alarms, as stated:** artefact in all but one lead mimicking VF (Drew 2014); single
channel artefact and low-voltage signals (Aboukhalil 2008); QRS under 150 µV giving false asystole (Aboukhalil 2008);
low-amplitude QRS in some leads (Drew 2014); bundle branch block and ventricular pacing giving false VT (Drew 2014);
muscle noise, baseline wander, power-line interference (Oh 2025). For the operating room: electrosurgery, whose
frequencies overlap the QRS and can mask the ECG and falsify the HR, 60-Hz interference and the bypass machine
(Miller's Anesthesia 10e, ch. 32, pp. 1001–1002, Fig. 32.10, Box 32.1, which lists further sources such as fluid
warmers, nerve stimulators and haemodialysis machines). Chest-compression artefact on a bedside monitor: no bedside
study read measures it (Ruiz de Gauna 2014 is about AEDs).

---

## 4. ZOLL M2: Check Patient

Read from the local guides: REF 9650-000873-01 **Rev. C** (December 2021, English), REF 9650-000873-02 **Rev. D**
(December 2024, **French**), REF 9650-000873-01 **Rev. E** (August 2023, English). The English Rev. D was not on disk.

| Question | What the guides say | Where |
|---|---|---|
| What it detects | VF or wide complex VT; it sounds an alarm and shows "Check Patient" | C and E p. 6-12; D (fr) p. 6-13 ("Vérif. patient") |
| On which signal | a continuous analysis on the ECG top waveform trace | same pages |
| When it runs | with the HR alarm on, in Monitor mode or Defib mode ("with some AED configurations") | same pages |
| When it does not | in Pacer mode, with the HR alarm on, the unit shows "VF/VT Alarms Disabled" | same pages |
| Priority and type | Patient alarm, High priority: a VF/VT signal detected in Monitor/Manual Defib with the HR alarm on | C and E p. C-2 |
| Delay | Maximum alarm delay with ECG as the source: 10 s (includes the alarm-condition and signal-generation delays) | C and E p. A-7 |
| After a shock | **Rev. D and Rev. E only:** patient alarms are suspended for 10 s after each shock, then resume as configured; equipment alarms are not suspended. **Rev. C has no such note** | E p. 5-5; D (fr) p. 5-5 |
| Under CPR or motion | **not stated** for Check Patient in any of the three. The motionless-patient warning is for AED analysis (C and E p. 12-6), and the warning that the patient must be motionless during compressions is about CPR measurement (E p. 1-18) | — |
| Window and algorithm | **not stated.** The 3-s segments and the 6–12 s sequence are the AED algorithm's (p. A-34) |
| Performance | **not stated.** Table A-4 is the AED algorithm in a single analysis sequence |
| A second meaning of the words | In AED mode, "CHECK PATIENT" is also the prompt for a shockable rhythm found after a full Analysis/CPR cycle when the unit is set to pause after each CPR period | C and E p. 12-11 |

**Where the revisions differ.** The Check Patient paragraph, the C-2 row and the 10-s maximum delay are word for word
the same in Rev. C and Rev. E. The only relevant change is the 10-s post-shock suspension of patient alarms, present
in Rev. D (fr) and Rev. E, absent in Rev. C. *[inference]* Check Patient is a Patient alarm (C-2), so in Rev. D/E it
falls under that suspension; the guides do not say so of Check Patient by name.

**For E4b.** The sourced facts are the lead (top trace), the modes, the Pacer exclusion, High priority, the 10-s
maximum delay and (Rev. D/E) the 10-s post-shock suspension. The window and the CPR/motion behaviour stay gap G-CPV:
no ZOLL statement was found on the web (the R Series and E Series pages that search engines quote are on ManualsLib,
behind a bot check, and were not read).

---

## 5. What this supports for B1, and the questions for the owner

| Skin | B1 may build | Stays a gap |
|---|---|---|
| `philips-like` | VFIB after 4 consecutive seconds of fibrillatory waveform (IntelliVue IFU Rel. D.0 p. 58); ASYSTOLE by the asystole threshold, not in VF or chaotic ECG (p. 53) | what "fibrillatory" means numerically; the IntelliVue VF delay beyond the system delay; whether a newer release changed it |
| `ge-like` | nothing for VF | GE's VF criterion and delay (DQ30) |
| `mindray-like` | nothing for VF (asystole 5 s and VT 130/6 already in the skin) | Mindray's VF criterion and delay (DQ30) |
| `saadat-like` | nothing for VF (VFIB cannot be disabled, as today) | Saadat's VF criterion; the asystole 10 s vs 5 s conflict (already a `conflict` tag) |
| `zoll-like` | nothing | the X Series VF/VT alarm (DQ30) |
| `lifepak-like` | nothing beyond "CPSS when the VF/VT alarm is on" | CPSS's criterion (DQ30) |
| All | B1's tests **report** VF sensitivity and specificity; no bedside performance goal was found to assert | a bedside VF performance requirement (W1, W2) |

**Correction for the plan, not made here (outside this brief's rows).** §3.4.1 row I1 says *GE: "Coarse flutter waves
without QRS complexes" (Drew 2014, Table 3)*. Drew 2014 gives this as its study's annotation protocol, not as GE's
definition (Harris 2017 the same). The row should say so when the plan is next edited.

**DQ30. The VF alarm on the skins with no sourced criterion**
- *Explanation:* Philips's own manual says the IntelliVue raises its VF alarm after 4 seconds of fibrillatory signal,
  so the Philips skin gets exactly that. For GE, Mindray, Saadat, ZOLL X Series and LIFEPAK nothing readable gives the
  criterion: their manuals are downloads (listed in §6), or the pages are behind a bot check. A rule from one maker
  must not be given to another as if it were theirs.
- *Options:* A, you fetch the WANTED manuals (W7–W12) and M0e reads them before B1 sets those skins; B, those skins use
  a single rule marked `eng` (not a maker's), shown as such in the skin's provenance, until a manual is read; C, those
  skins have no signal-based VF alarm until a manual is read (B1 builds the Philips skin only).
- *Proposal:* A for the four manuals you can get quickly (GE CARESCAPE, Mindray BeneVision N, Saadat English, LIFEPAK
  15), with B meanwhile so that B1 is not blocked; the `eng` rule is named as such everywhere it appears.

**DQ31. The standards**
- *Explanation:* No open source says whether IEC 60601-2-27:2011 requires a VF detector, a VF delay or a performance
  disclosure. One paper reports the older US standard (AAMI EC13) as requiring arrhythmia alarms within 10 seconds.
  The two standards are sold (IEC about CHF 380).
- *Options:* A, buy or borrow IEC 60601-2-27:2011 and ANSI/AAMI EC57:2012/(R)2020 so that B1's test limits come from
  the clauses; B, no standard: B1 reports, and the only limit it asserts is "VFIB within 10 s of VF onset", marked as
  the EC13 figure as Aboukhalil 2008 reports it.
- *Proposal:* B now; A only if you want B1 to claim conformity to a standard.

**DQ32. The ZOLL M2's alarms after a shock**
- *Explanation:* The 2023 (Rev. E) and 2024 (Rev. D, French) guides say patient alarms are suspended for 10 seconds
  after each shock; the 2021 guide (Rev. C), which the plan was written from, does not. Check Patient is a patient
  alarm, so after a shock it would stay silent for 10 seconds.
- *Options:* A, model Rev. E (suspension 10 s after each shock); B, model Rev. C (no suspension).
- *Proposal:* A, the newer English guide.

(DQ27–DQ29 of the plan are unchanged by this note; nothing found here bears on them except that GE's EK-Pro analyses
four leads, Cosentino 2024 calls 2- or 3-lead analysis common elsewhere, and the IntelliVue rows read here do not say
how many leads; this is information for DQ28, not an answer.)

---

## 6. WANTED (for the owner's decision; nothing here was downloaded)

| # | What | Where (size from the server's header) | Why |
|---|---|---|---|
| W1 | IEC 60601-2-27:2011, ed. 3.0 (+ COR1:2012), *Particular requirements for the basic safety and essential performance of electrocardiographic monitoring equipment*, 149 pp. | webstore.iec.ch/en/publication/2638 (CHF 380) | whether a VF/VT/asystole detector, delay or disclosure is required |
| W2 | ANSI/AAMI EC57:2012/(R)2020, *Testing and reporting performance results of cardiac rhythm and ST segment measurement algorithms* | webstore.ansi.org (page answered 403) | the VF statistics and databases B1's report should follow |
| W3 | Philips, ST/AR arrhythmia monitoring application note | documents.philips.com/assets/20220223/ad31c11c4a454cbcabb7ae4501256a91.pdf (122 KB) | the IntelliVue algorithm and any VF performance |
| W4 | Philips document found with the same search (content unknown) | documents.philips.com/assets/20170523/2491dcfcb6504217bf55a77c016945eb.pdf (2.9 MB) | possibly the ST/AR performance note 4522 981 82421 (a search engine's description; unverified) |
| W5 | GE, *EK-Pro v14 Algorithm Performance Comparison Study*, JB78843US, April 2022 | gehealthcare.com/static/wisdm/ (167 KB) | GE's disclosed performance |
| W6 | GE, *EK-Pro whitepaper*, JB22468XX | clinicalview.gehealthcare.com/sites/default/files/ (217 KB) | GE's VF criterion |
| W7 | GE, *CARESCAPE Monitors B850/B650 User's Manual*, 2062971-003 | `research/05` [S3] URL (12.8 MB) | GE's VF/VT/asystole criteria and delays |
| W8 | Mindray, *BeneVision N Series Operator's Manual* | `research/05` [S4] URL (6.9 MB) | Mindray's Vfib/Vtac criterion |
| W9 | Saadat, Persian user manual D01111-12 (file D00125-V17.pdf), arrhythmia chapter pp. 73–84 | saadatco.com/wp-content/uploads/2021/12/D00125-V17.pdf (29.4 MB) | Saadat's VFIB criterion |
| W10 | Saadat, English user manual D01112-V0 | saadatco.com/wp-content/uploads/2022/06/D01112-V0.pdf (27.6 MB) | the same, in English |
| W11 | ZOLL, *X Series Operator's Guide* 9650-001355-01 (any revision) | `research/05` [S5] (the ifixit copy no longer serves the PDF) | the zoll-like skin's VF/VT alarm |
| W12 | Stryker, *LIFEPAK 15 Operating Instructions* 3314911-030 | stryker.com operating-instructions (15.4 MB) | CPSS criterion and what suspends it |
| W13 | Philips, *IntelliVue Instructions for Use*, a current release (the MP40–90 IFU of `research/05` [S2] is 4.4 MB) | `research/05` [S2] URL | whether the 4-s rule of Rel. D.0 still holds |
| W14 | Cosentino 2024, Supplemental Table 2 (each monitor's VF settings) | the article's supplementary file | the VF duration each tested monitor used |
| W15 | ZOLL M2 Operator's Guide REF 9650-000873-01 Rev. D (English) | ZOLL | to confirm the Rev. D French wording in English |

---

## 7. What was searched, and what could not be read

**Searched:** Europe PMC REST (false alarms with VF/VT/asystole and ICU or telemetry, 60 results by citations;
named makers with false alarms; EC57 or 60601-2-27 with open access); Crossref (the six-monitor comparison); web
searches for each maker's VF/VT wording and for ZOLL Check Patient; the makers' web pages (GE ClinicalView, Stryker
support); manualsonline.com (Philips IFU as HTML pages); PhysioNet's WFDB manual pages; IEC webstore; the library
(Miller 10e all chapters, Miller 9e, Co-Existing Disease 8e, Dellinger 5e: only Miller 10e ch. 32 pp. 1001–1002 and
ch. 82, already cited by the plan, bear on ECG artefact; none states a monitor's arrhythmia alarm criteria); the local
ZOLL guides (Rev. C, Rev. D French, Rev. E; chapters 5, 6, 12, 17 and appendices A and C). No monitor manual is in
`library/sources/`.

**DOIs resolved at doi.org on 12 November 2026:** 10.1016/j.jbi.2008.03.003, 10.1371/journal.pone.0110274,
10.1088/0967-3334/37/8/E5, 10.1109/CIC.2015.7408639, 10.2147/TCRM.S126191, 10.1016/j.cvdhj.2024.02.002,
10.12659/MSM.949932, 10.1002/jhm.2520, 10.1155/2014/386010.

**Could not read:** ManualsLib (403; bot check, as in brief 182), bioclinicalservices.com.au (403), manualmachine.com
(403), webstore.ansi.org (403); every vendor manual and application note served only as a PDF (§6); the image of
GE's EK-Pro definition table; the last part of Clifford 2016 and Drew 2014 beyond the first 100 000 characters of the
web page (the tables used were within it).
