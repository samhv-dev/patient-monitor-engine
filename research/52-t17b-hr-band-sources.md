# 52. A measured heart-rate band for t17b (β-blocked class III haemorrhage): the search

Brief 116, 9 Nov 2026 (owner's ruling N8: search for a measured statistic first; the derived band stays, labelled derived,
while the search runs). Sourcing only. No probe was run and no band number changed.

## Outcome: (b), indirect evidence only

No source I could read states a heart-rate statistic for β-blocked patients (or β-blocked volunteers or animals) at a
class III loss (30–40 % of blood volume) that meets the audit's test: the source's own mean ± 1 SD, IQR, CI or stated
threshold, for the population closest to the rig (β-blocked, class III, early, before treatment). What exists is:

- a β-blocker effect size on arrival HR in trauma patients with **unmeasured** blood loss (Havens 2012: 83 vs 89 bpm);
- a β-blocker effect size on the **reflex** HR rise in humans under acute blockade during central hypovolaemia
  (Bjurstedt 1977: 48 % of the unblocked rise; Convertino & Sather 2000), which the repository already uses in the
  t17a/t17b cross row;
- animal bleeds under acute blockade that report HR only as "different" or as a diagnostic AUC.

So the t17b band stays as it is, **derived**: Mutschler 2013's class III ED HR (95.9 ± 22.5, Table 2) shifted by Havens
2012's −6 bpm, 67.4–112.4 (PR #347, commit 1). Havens 2012 remains the best indirect citation, because it is the only
source that gives an absolute HR in chronic pre-injury β-blocker users who are bleeding and untreated. The band's source
text now says "derived band" and carries Havens' PMID (22906692). The engine's 64.4 (on `3bca4a61`) remains an amber
miss attributed to the autonomic hub (v2.0 workstream 2, FU-12). The band was not moved.

## Each source checked

"Abstract" means I read only the PubMed abstract; the full text was not open to me. A number I did not read in the source
is not quoted.

### Trauma registries and cohorts with β-blocker status

| Source | What it reports (where) | Qualifies? |
|---|---|---|
| Havens JM, Carter C, Gu X, Rogers SO. Int J Surg 2012;10:518-21. PMID 22906692 | Case-control, 76 deaths + 304 survivors, one level I centre. Mean pre-resuscitation HR 83 on β-blocker vs 89 without (p 0.007); post-resuscitation 80 vs 85 (p 0.02); tachycardia 14.3 vs 29.7 %; bradycardia 7.1 vs 2.3 % (abstract). | **No, indirect.** Means without SD, IQR or CI in the abstract; full text not open access. All trauma, blood loss not measured or classed. It gives an effect size, not a class III band. Best indirect source; already the basis of the derived band. |
| Neideen T, Lam M, Brasel KJ. J Trauma 2008;65:1016-20. PMID 19001968 | Patients > 65 y, 1,479 included, 273 on pre-injury β-blockers. Mortality 14.7 % vs 13.4 %; without head injury, OR 2.1 (95 % CI 1.1–4.3) (abstract). | No. Reports no HR in the abstract; full text not open access. |
| Arbabi S, Campion EM, Hemmila MR, et al. J Trauma 2007;62:56-61. PMID 17215733 | 303 of 4,117 trauma patients received β-blockers in hospital (45 % of them pre-injury); OR for death 0.3 (abstract). | No. Exposure is mostly in-hospital β-blockade; no HR reported. |
| Schroeppel TJ, Fischer PE, Zarzaur BL, et al. J Trauma 2010;69:776-82. PMID 20938265 | Blunt TBI, 506 of 2,601 given more than one in-hospital dose; mortality OR 0.347 (abstract). | No. TBI, in-hospital β-blockade, no HR. |
| Hendrick LE, Schroeppel TJ, Sharpe JP, et al. Am Surg 2016;82:575-9. PMID 27457854 | Non-TBI trauma, 1,854 of 19,151 given in-hospital β-blockers; patients on **pre-hospital** β-blockers were excluded (abstract). | No. Excludes the chronic users; no HR. |
| Bukur M, Lustenberger T, Cotton B, et al. Am J Surg 2012;204:697-703. PMID 22578406 | ISS ≥ 25 without severe TBI; β-blocker within 30 days of ICU admission; mortality 11.2 vs 19.3 % (abstract). | No. ICU exposure; no HR. |
| Ferraris VA, Ferraris SP, Saha SP. J Trauma 2010;69:645-52. PMID 20526211 | 5,971 trauma patients with a usable cardiac history; pre-injury β-blocker OR for death 2.62 (abstract). | No. No HR. |
| Evans DC, Khoo KM, Radulescu A, et al. J Emerg Trauma Shock 2014;7:305-9. PMID 25400393, PMC4231268 (open access) | 645 trauma patients > 45 y, ISS > 10 in 23 %. Text: β-blocker alone did not differ in arrival HR from no cardiac medication; only triple therapy (β-blocker + CCB + ACE-i/ARB) was lower. Table 2 and Fig. 1 give mean initial HR with 95 % CI by group, as images; I did not read their numbers. | No. Unmeasured, mostly minor injury; a group CI there would be arrival HR in all-comers, not class III. |
| Dhalla Z, Nunn K, Teoh V, Arellano D. Surgery 2026 (online 24 Jul). PMID 42618398 | TriNetX, pelvic fracture, pre-injury β-blocker vs RAS inhibitor; outcomes (haemorrhage, infection, VTE, mortality) only (abstract). | No. No HR. |
| Roolvink V, Hemradj VV, Ottervanger JP, et al. Eur Heart J Acute Cardiovasc Care 2020;9:462-8. PMID 29376399 | STEMI, chronic β-blocker vs none; cardiogenic shock and shock index ≥ 0.7 (abstract). | No. Not haemorrhage. |
| De Simone B, Chouillard E, Podda M, et al. The 2023 WSES guidelines on the management of trauma in elderly and frail patients. World J Emerg Surg 2024;19:18. PMID 38816766, PMC11140935 (open access) | Statement 2.2.1: β-blockers can blunt the systemic response to significant blood loss, "with the absence of early tachycardia" (QoE B). No number. | No. Qualitative. |
| Trauma Quality Improvement Program; TraumaRegister DGU (German Trauma Registry) | Europe PMC searches (below) found no analysis that reports HR by β-blocker status. The TQIP hits were outcome studies (rib fractures, TBI β-blocker discontinuation, PMID 37746607). The TR-DGU hits were congress abstract books and a REBOA RISC II paper (PMID 33566834). | Nothing found. |

### Controlled central hypovolaemia in humans under β-blockade (LBNP)

Lower-body negative pressure as a haemorrhage analogue: Hinojosa-Laborde 2014 (PMID 24356525) maps −22/−41/−54/−71 mmHg
to about 6.25/12.5/18.75/25 % loss in baboons (research/46 §F). None of these studies reaches a mapped 30–40 % loss, and
all of them use acute rather than chronic blockade.

| Source | What it reports | Qualifies? |
|---|---|---|
| Bjurstedt H, Rosenhamer G, Tydén G. Acta Physiol Scand 1977;99:353-60. PMID 15403 | 8 healthy men, propranolol 0.25 mg/kg IV, LBNP −80 mmHg (≥ 25 % by the mapping above): the HR response "averaged 48% of that observed without blockade"; the MAP fall was larger (abstract). | No, indirect. A ratio of the rise, not an HR band; acute non-selective blockade. Already used in the t17a/t17b cross row (ΔHR ratio < 0.6). |
| Convertino VA, Sather TM. Clin Auton Res 2000;10:327-36. PMID 11324988; restated in Convertino 2014, Front Physiol 5:236, PMC4074989 (open access), Fig. 6 | 11 men, propranolol, graded LBNP to presyncope: tolerance −50 % / −39 %; reduced tachycardia, SV unchanged at presyncope (abstract). Fig. 6 shows ΔHR as bars, mean ± 1 SEM; no value in the text. | No. HR change at presyncope (loss not fixed), shown only in a figure, and an SEM, not a band. |
| Rahman MA, Bennett T. Br J Clin Pharmacol 1990;29:69-77. PMID 2297462, PMC1380063 | 18 volunteers, single oral propranolol 80 mg or atenolol 100 mg, LBNP 20 and 30 mmHg; the abstract reports bradycardia and forearm responses, with no HR value. The abstract is truncated; the full text is a scanned PDF that I did not read. | No. LBNP ≤ 30 mmHg is about a class I equivalent, not III. |
| Jacobsen TN, Converse RL, Victor RG. Circulation 1992;85:1072-6. PMID 1537104 | 11 humans, propranolol 0.15 mg/kg IV, graded LBNP; reports MSNA and regional vascular resistance (abstract). | No. No HR statistic. |

### Graded haemorrhage in β-blocked animals

| Source | What it reports | Qualifies? |
|---|---|---|
| Jung YS, Cho WS, Suh GJ, et al. J Surg Res 2020;256:468-75. PMID 32798994 | 4 + 4 anaesthetised pigs, esmolol titrated to HR −30 % from baseline, 15 % then 30 % loss in 10-min steps; HR's AUC for 30 % loss 0.733 vs 0.864 (abstract). | No. The HR is held by titration, and only an AUC is reported. Porcine and anaesthetised. |
| Kinsky MP, Vaid SU, Vane LA, et al. Shock 2008;30:55-63. PMID 18323741 | Anaesthetised sheep, esmolol 50–100 µg/kg/min, 20 mL/kg loss: haemodynamics "similar with the exception of heart rate"; no HR value (abstract). | No. |
| Bond RF, Johnson G. Circ Shock 1984;12:9-24. PMID 6323052 | Rats, propranolol, modified Wiggers shock: β-receptors "do not play a major role" in compensation (abstract). | No. No HR statistic; a fixed-pressure model. |
| Prys-Roberts 1976 (PMID 9020); Horan 1977a/b (PMIDs 588397, 588398); Roberts 1976 (PMID 1276013) | Dogs under volatile anaesthesia, acute or chronic propranolol, 20–25 % loss (research/46 §F). | No. Anaesthetised dogs at ≤ 25 %; no HR band. |

Animal heart rates in bpm do not transfer to the cell's patient, who is an awake adult human on a chronic cardioselective
β-blocker. Even a stated SD in these studies would not be a band for this rig.

### Perioperative haemorrhage, variceal bleeding and textbooks

- **Perioperative series:** a PubMed search for β-blocker × (postpartum, intraoperative or surgical bleeding) × HR
  returned one paper, on rhinosinus surgery bleeding (PMID 36401859, Adv Gerontol 2022). It concerns bleeding volume, not
  HR during a large loss.
- **Variceal bleeding on non-selective β-blockers:** 60 titles were screened (search below). They concern prophylaxis,
  HVPG and resting HR targets. None reports presenting HR during a bleed, by β-blocker status, against a measured loss.
- **Library** (read in place with pdftotext): Miller 10e ch. 62, p. 2038 says elderly patients' β-blockers "may worsen
  traumatic shock" by blunting compensation, with no number. Dellinger 5e and Anesthesia and Co-Existing Disease 8e have
  no passage on HR in β-blocked haemorrhage.

## Search record (9 Nov 2026)

PubMed E-utilities (esearch, esummary, efetch) and the Europe PMC REST search and full-text XML endpoints, with no
account, no API key and no e-mail parameter.

- PubMed: `(beta blocker* OR beta-blocker* OR "adrenergic beta-antagonists"[MeSH]) AND (trauma* OR injur*) AND ("heart rate" OR tachycardia OR "shock index")`
- PubMed: `(beta blocker* OR propranolol OR metoprolol OR esmolol OR atenolol) AND (hemorrhage OR haemorrhage OR hypovolemi* OR "blood loss") AND "heart rate"[tiab]`
- PubMed: `(beta blocker* OR propranolol OR metoprolol) AND "lower body negative pressure"` (40 titles screened)
- PubMed, by author: Neideen T; Arbabi S; Schroeppel TJ; Havens JM; Ferraris VA (each with "beta")
- PubMed: `(TraumaRegister OR "German trauma registry" OR "Trauma Quality Improvement") AND beta blocker*`
- PubMed, title-limited: β-blocker × (trauma, injury, shock, haemorrhage, bleeding, hypovolaemia) (60 titles screened)
- PubMed: `"shock index"[ti] AND (beta* OR geriatric OR elderly OR medication*)`; β-blocker[tiab] AND "shock index"[tiab]
- PubMed: β-blocker × (variceal or upper GI bleeding) × (HR, tachycardia or shock index) (60 titles screened)
- PubMed: propranolol/atenolol/metoprolol × haemorrhage/hypovolaemia[ti] × conscious; β-blocker × ("hemorrhagic shock",
  "massive transfusion", "base deficit"); β-blocker × geriatric trauma × HR; propranolol × haemorrhage × volunteers;
  propranolol × (venesection, phlebotomy, blood donation, head-up tilt) × HR
- Europe PMC: β-blocker × "class III" × haemorrhage × "heart rate", open access only (355 hits; the first 25 were
  screened, all cardiology or obstetrics); TraumaRegister/TR-DGU × β-blocker (9 hits); TQIP × β-blocker × HR (7 hits);
  β-blocker × "shock index" × trauma (157 hits; the first 25 were screened)
- Full text read (open access): Evans 2014 (PMC4231268), WSES 2023 (PMC11140935), Convertino 2014 (PMC4074989)
- Not open to me (no open-access copy in Europe PMC): Havens 2012, Neideen 2008, Arbabi 2007, Ferraris 2010, Bjurstedt
  1977 and Convertino & Sather 2000. Havens' full text may give SDs for the 83 and 89 bpm means. They would still describe
  all-comer trauma, not class III, so they would not change the outcome.

## What would change this

A registry analysis that stratifies by β-blocker status **and** by haemorrhage class (base-deficit class as in Mutschler
2013, or the estimated loss as in Guly 2011), and reports ED HR as a mean ± SD or IQR. TR-DGU and TARN hold both
variables. No such analysis was found.
