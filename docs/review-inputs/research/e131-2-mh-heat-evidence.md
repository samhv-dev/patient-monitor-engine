# E131-2 — how fast does the untreated MH core rise? Evidence and verdict (1 Nov 2026)

Question (owner, after running the Malignant hyperthermia card untreated for 38 min at ×8 on the live build, core
37.9 °C): "the temperature still does not rise properly". The engine (main 649ab03c) reaches the card's "established"
38.5 °C at +45.6 min after the succinylcholine; the showcase test band says 16.9–20.7 min. Which side does the evidence
favour?

## VERDICT (binding for E131-2)

**The engine is right for the median human case; the band is wrong.** The band 16.9–20.7 min was never a clinical
number: it is the pre-E131 prototype (705 W of MH heat from three unlinked factors) measured ± 10 %. The best primary
registry number for the rate of rise, the MAXIMAL rate of core rise in grade 5–6 MH (Toyota 2023, 128 cases), is
**median 0.80 °C per 15 min (IQR 0.50–1.00)** in survivors and 0.65 (0.53–1.32) in those who died. The engine's
untreated core rises **0.76 °C per 15 min** once the MH is at full activity (measured: 37.022 → 37.779 °C, minutes
15 → 30 after the sux) — at the registry median. To pass 38.5 °C in 17–21 min from the anaesthetised core of
36.67 °C, the core must rise ≈ 1.3–1.6 °C per 15 min from the moment of the trigger (2.1–3.0 °C per 15 min with the
engine's onset lag): above the 75th percentile of the registry's maximal rates in survivors (1.00), and above the
upper quartile of those who died (1.32). It would need ≈ 300 W net core heat storage, i.e. a whole-body VO₂ of
≈ × 4–5 the resting value from the first minutes; no human measurement and no porcine measurement with constant
ventilation shows that (human × 2–3 by review; swine × 1.8–2.7 measured).

**Band the median untreated case supports.** With the engine's own starting core (36.67 °C) and onset lag (the
linear rise extrapolates back to the starting core at ≈ +7.8 min), the registry's IQR of the maximal rate
(0.50–1.00 °C/15 min) puts "established" (38.5 °C) at **≈ 35–63 min after the trigger, median ≈ 42 min**; the
engine's 45.6 min lies inside it. The "17–21 min" band describes a fulminant, top-quartile-or-faster course only.

**Consequences.** No physiology changes in E131-2 (Task B candidates (a)–(c) are not supported as fixes for the
early rise — see §5). The slow-test establishment band is re-centred on the measured engine (same ± 10 % tolerance,
the evidence range stated beside it); the two engine-level expected failures that carried the textbook "+1 °C per
5–15 min" (heat.test, temp.test) are re-sourced to the registry's 0.50–1.00 °C/15 min and are now met; the card text
that still says "about 37.3 °C at 51 minutes … established after about 100 minutes" is corrected to the build.
The owner's observation (37.9 °C at 38 min untreated) is what the median human case does; a 39–40 °C demonstration in
under 25 min would be a fulminant case and would need a severity input that the registry supports for that tail
(post-demo: severity as a sourced scenario input, already on the roadmap as E134 (c)).

## 1. Rates of core rise in human MH

| Source | What was read | Numbers |
|---|---|---|
| Toyota Y, Kondo T, et al. *Rapid dantrolene administration with body temperature monitoring is associated with decreased mortality in Japanese MH events.* Biomed Res Int 2023;2023:8340209 (PMC9977521) | **full text** | Japanese MH database 1995–2020, 607 cases → 128 with clinical grading scale 5–6. Table 4 (dantrolene-treated): **maximal rate of temperature increase, °C/15 min: survivors 0.80 (0.50–1.00), n = 93; deceased 0.65 (0.53–1.32), n = 8** (P 0.81). Maximal temperature 39.7 (38.8–40.9) vs 41.8 (39.9–43.0) °C. Temperature at the start of dantrolene 39.1 (38.5–40.3) vs 41.6 °C. Induction → first sign 60 (30–130) vs 90 (15–165) min; first sign → dantrolene 45 (25–75) vs 100 (75–135) min. Max EtCO₂ 75 (65–96.5) vs 84 mmHg; max PaCO₂ 70.8 vs 94.8 mmHg. "Temperature abnormality" defined as > 38.8 °C or ≥ 0.5 °C/15 min. |
| Larach MG, Gronert GA, Allen GC, Brandom BW, Lehman EB. *Clinical presentation, treatment, and complications of MH in North America from 1987 to 2006.* Anesth Analg 2010;110:498–507 | abstract (full text paywalled, HTTP 402) | 286 episodes (NAMHR). Temperature abnormality was the 1st–3rd sign in 63.5 %; **median maximal temperature 39.1 °C**; complications × 2.9 per 2 °C of maximal temperature and × 1.6 per 30 min of dantrolene delay; 26 % had metabolic acidosis. No rate or time to 38.5 °C in the abstract. |
| Larach MG, Brandom BW, Allen GC, Gronert GA, Lehman EB. *MH deaths related to inadequate temperature monitoring, 2007–2012.* Anesth Analg 2014;119:1359–66 | abstract (full text paywalled) | 84 cases, 8 deaths (9.5 %); death RR 13.8 with no and 9.7 with skin temperature monitoring vs core; longer anaesthetic exposure before dantrolene → higher peak temperature (P 0.00056). No rate in the abstract. |
| Salazar JH, et al. *MH in children: an analysis of the NAMHR.* Anesth Analg 2014;118:381 (PMID 24299931) | abstract | 264 paediatric records; "rapid temperature increase" in 48.5 %; higher maxima in the 13–18 y cohort. No rate. |
| Glahn K, et al. EMHG *Recognising and managing an MH crisis* (v2024; first BJA 2010;105:417) | guideline page (emhg.org), read | Temperature: "rapid increase in core body temperature" listed among the **later** signs; early signs are the CO₂ production and the increased O₂ consumption. Stop cooling below 38.5 °C. No rate given. |
| Rosenberg H, Pollock N, Schiemann A, Bulger T, Stowell K. *Malignant hyperthermia: a review.* Orphanet J Rare Dis 2015;10:93; and Rosenberg H, Davis M, James D, Pollock N, Stowell K, Orphanet J Rare Dis 2007;2:21 | full text | The textbook sentence "an increase in core temperature at a rate of 1–2 °C every five minutes". 2015 cites it to **Nelson TE, Anesthesiology 1990;73:449–54 — a porcine study** (Pietrain pigs, halothane at rectal 35–37 °C); 2007 gives no citation. |
| Paediatric dentistry case report 1982 (AAPD archive, found by search, not read in full) | search snippet | One fulminant child: 36.0 → 38.8 °C in 15 min, then 42.2 °C 15 min later (≈ 1 °C per 5 min): the fulminant tail exists. |

**Where "1–2 °C every 5 min" comes from:** the review literature (Rosenberg 2007/2015), traced to a porcine
experiment (Nelson 1990) and to fulminant single cases. 1–2 °C per 5 min is 3–6 °C per 15 min, 4–8 × the registry's
median MAXIMAL rate; sustained, it would put every untreated human case above 44 °C within 30 min, against median
maxima of 39.1 °C (NAMHR) and 39.7 °C (Japan, survivors). It describes fulminant swine and single fulminant human
cases, not the median human case. The tables' "+1 °C per 5–15 min" (engine tables §7 check 21) has the same origin;
its slow end (1 °C/15 min) is the registry's 75th percentile.

**Median time from trigger to > 38.5 °C:** not reported in any source reached (the NAMHR full texts are paywalled; the
Japanese paper gives induction → first sign 60 min, and no time to a temperature). It is derived above from the
registry rate (≈ 35–63 min, median ≈ 42 min, on the engine's starting core and onset). Gap: the NAMHR full text
(Larach 2010 tables) should be read when available — VERIFY.

## 2. Whole-body VO₂ (and VCO₂) in MH

| Source | What was read | Numbers |
|---|---|---|
| Gronert GA, Theye RA. *Halothane-induced porcine MH: metabolic and hemodynamic changes.* Anesthesiology 1976;44:36–43 (PMID 1244773) | abstract | **Constant-volume ventilation**, untreated: whole-body VO₂ "almost twofold", hind-limb muscle VO₂ "almost threefold"; muscle ≈ 55 % of the whole-body increase; lactate first (non-hypoxic), > 20 mmol/L. |
| Gronert GA, Milde JH, Theye RA. Anesthesiology 1976;44:124–32 (PMID 3127) | abstract | Fulminant swine, untreated arm; "maximal changes in VO₂ were equivalent with either drug or both". No number in the abstract. |
| Already in params.ts (E131): Gronert 1977 Can Anaesth Soc J 24:103 (muscle share; extrapolated × 2.7 on a human resting VO₂); Gronert 1986 Anesthesiology 64:24 (6.5 → 11.6 mL/kg/min, × 1.8) | abstracts (E131) | swine × 1.8–2.7 |
| Nelson TE, Flewellen EH. *The malignant hyperthermia syndrome.* N Engl J Med 1983;309:416 | search snippet (publisher 403) | "total body oxygen consumption … increases two to three times" (review statement) |
| Nelson TE. Biosci Rep 2001;21:169 (E131) | abstract | "5-fold" as the extreme (review). |
| APSF letters on FiO₂ − FetO₂ as an MH monitor; EMHG 2024 | read | Increased O₂ consumption is an early sign; no human crisis VO₂ in mL/min found. |

**No human calorimetry or gas-exchange measurement during an MH crisis was found; nothing measured exceeds × 2.5–3.**
MH_VO2_PEAK_X = 2.5 sits in the sourced range, and with the heat kept in the core (#209) it reproduces the registry's
median maximal rate (0.76 vs 0.80 °C/15 min). Raising it to 3 (the review's upper end) would give ≈ 1.0 °C/15 min,
the registry's 75th percentile — a severity choice, not a correction.

Heat-budget check (the brief's arithmetic): 0.80 °C/15 min into the core compartment of 70 kg (2/3 × 3.5 kJ/kg/°C =
163 kJ/°C) is 145 W net storage — the size of the oxygen-derived MH heat (× 2.5 of 250 mL/min ≈ +130 W at 70 kg;
≈ 140 W on the 80-kg card). The band's 17–21 min needs ≈ 300 W net (1.83 °C in ≈ 18 min into 187 kJ/°C at 80 kg), i.e.
≈ 900 mL/min of extra O₂ — whole-body × 4–5. The two numbers in the brief cannot both be right, and the registry sides
with the oxygen.

## 3. Muscle versus core temperature

| Source | What was read | Numbers |
|---|---|---|
| Iaizzo PA, Kehler CH, Zink RS, Belani KG, Sessler DI. *Thermal response in acute porcine MH.* Anesth Analg 1996;82:782–9 | abstract | 6 swine, halothane + sux, fulminant within 10 min. **Intramuscular temperatures (5 muscles) were 1–2 °C LOWER than pulmonary-artery and oesophageal temperatures** throughout; kidney, liver and brain rose faster than PA and were equal or slightly higher; visceral organs warmed **before** contractures; "core hyperthermia during acute MH arises largely from central organs rather than skeletal muscle". Axillary skin tracked the core trend; neck/forehead did not. |
| Hall GM, Bendall JR, Lucke JN, Lister D. *Porcine MH. II: Heat production.* Br J Anaesth 1976;48:305–8 | abstract | Muscle temperature compared with the O₂-predicted temperature (see §4). |

**Muscle does not lead the core; it lags it.** An oesophageal or nasopharyngeal probe reads the central blood
temperature, which is the hottest well-perfused site. Candidate (c) — the probe reading a muscle-local temperature
that runs ahead of the core — is contradicted by the only site-by-site porcine measurement found.

## 4. The anaerobic share

| Source | What was read | Numbers |
|---|---|---|
| Hall GM, Bendall JR, Lucke JN, Lister D. Br J Anaesth 1976;48:305–8 (OUP: PDF behind subscription) | abstract | 7 Pietrain pigs: heat production is **"largely aerobic in origin" early**; only in the **terminal** stages does aerobic metabolism account for "only about half" of the observed rise in muscle temperature. No numbers in the abstract. |
| Lucke JN, Hall GM, Lister D. *Porcine MH. I.* Br J Anaesth 1976;48:297–304 | abstract | qualitative only |
| E131 params.ts (already in the engine): glycogenolysis ≈ 65 kJ/mol ATP vs oxidation 72 (Curtin & Woledge 1978; Woledge & Reilly 1988), ≈ 98 kJ/mol lactate in vivo (di Prampero 1999) | as cited in E131 | — |

**Bound with the engine's own lactate:** untreated, blood lactate is 5.3 mmol/L at +20 min and 12.2 at +45.6 min.
Distributed in ≈ 0.6 L/kg (≈ 48 L at 80 kg), that is ≈ 250 mmol by 20 min and ≈ 590 mmol by 46 min; at 98 kJ/mol
lactate the glycolytic heat is **≈ 20 W averaged over the first 20 min** and ≈ 21 W to establishment — about 15 % of
the ≈ 140 W oxygen heat, ≈ +0.1 °C by +20 min. Muscle glycogen (≈ 400 g ≈ 4.4 mol lactate ≈ 430 kJ) is not the
binding limit in the first hour; the lactate the blood model already makes is. This agrees with Hall 1976 (early heat
largely aerobic) and is too small to move establishment by more than ≈ 2–3 min. It is a real omission in the energy
bookkeeping and belongs with E134 (anaerobic glycolysis with its pH/glycogen limit), post-demo; it is not the
answer to the owner's question and is not built here.

## 5. Task B candidates, judged against §1–4 (none built)

| Candidate | Evidence | Effect on the early rise | Decision |
|---|---|---|---|
| (a) glycolytic heat bounded by glycogen and pH | Hall 1976: early heat aerobic; the bound above ≈ 20 W | ≈ +0.1 °C by +20 min; established ≈ 2–3 min earlier | not a fix for this question; E134 post-demo (bookkeeping) |
| (b) MH_VO2_PEAK_X at the upper range | human × 2–3 (review), swine × 1.8–2.7; nothing > 3 measured | × 3 → ≈ 1.0 °C/15 min = the registry's 75th percentile | not a correction (2.5 already gives the median); a severity choice for the owner |
| (c) muscle-local temperature on the probe | Iaizzo 1996: muscle 1–2 °C below the core | would LOWER the reading | contradicted |

## Sources not reached / to verify
- Larach 2010 and 2014 full texts (NAMHR tables: times to first temperature change, rate of rise) — paywalled (HTTP 402).
- Larach MG et al. *Temperature changes are not late signs of MH*, ASA 2008 abstract A374 — not found online.
- Britt BA, Kalow W. *Malignant hyperthermia: a statistical review.* Can Anaesth Soc J 1970;17:293 — paywalled.
- Hall 1976 full text (the aerobic/anaerobic split in numbers) — paywalled.
- No owner identifier was sent in any request; no service that asks for an e-mail was used.
