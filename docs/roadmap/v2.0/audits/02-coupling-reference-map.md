# Job 2: evidence-graded reference map of physiological links

Best suited to a tool that finds, opens and quotes sources. It must NOT see the simulator's code or notes.

```text
Build an evidence-graded reference map of the causal links of human physiology and pathophysiology that matter in anaesthesia, critical care and resuscitation. It will be compared against a simulation engine's code by a separate process; you must NOT look at any simulator code or notes, so the map is independent.

PURPOSE: the target is a model that could eventually take a real patient's measured parameters and simulate forward, so I need each link's direction, size, time course and the parameters that define it, with the evidence.

A "link" is one causal influence: quantity A changes quantity B (for example: mean arterial pressure -> carotid baroreceptor firing -> sinus node rate; PaCO2 -> cerebral blood flow; plasma potassium -> resting membrane potential -> ECG morphology; core temperature -> oxygen consumption; insulin -> cellular potassium uptake).

FOR EVERY LINK, one row:
- id (L-<SYSTEM>-nnn), system, from, to, the mechanism in one sentence
- direction and shape (linear, saturating, threshold, biphasic)
- magnitude with numbers and units (gain, slope, EC50, percent change per unit) and its normal range across healthy adults
- time course: onset, time constant or half-time, recovery
- operating range and limits: where the relation saturates or reverses; what happens at the extremes
- modifiers: age, sex, body size, pregnancy, chronic disease (hypertension, heart failure, COPD, diabetes, renal and hepatic failure), anaesthetic and other drugs, temperature
- patient-measurable parameters that set this link in an individual, and how they are measured clinically
- evidence: for each number, the source (authors, year, journal or textbook edition and chapter, DOI or PMID), a short verbatim quote or the table/figure number that carries the number, and a grade: A human experimental or large observational data; B small human studies or consistent animal data; C textbook consensus without a traceable primary number; D disputed. If you could not open a source and are citing it second-hand, mark it UNVERIFIED. Never give a number without a source or the mark "no quantitative source found".
- where sources disagree, give both values and the likely reason
- clinical importance for an anaesthesia trainee: essential / important / specialist

ALSO, per system: the conserved quantities and their balance equations (volumes, O2, CO2, electrolytes, heat, drug mass) with normal stores and fluxes; the integrated responses that emerge from several links together and their expected time courses with sources (for example the response to 10/20/30/40 % haemorrhage, apnoea, hypothermia, induction of anaesthesia, the Valsalva manoeuvre, spinal anaesthesia, positive-pressure ventilation, hyperkalaemia treatment); and a list of well-known links you deliberately left out as negligible, with the reason.

SOURCES: standard texts first (Guyton and Hall; Boron and Boulpaep; West; Nunn; Berne and Levy; Miller's Anesthesia; Barash; Stoelting's Pharmacology and Physiology; Brenner and Rector for the kidney; Goodman and Gilman), then primary papers and guidelines for the numbers. Prefer human data.

ORDER (finish and write each before the next): (1) circulation and autonomic control including all cardiovascular reflexes, (2) lung mechanics, gas exchange and control of breathing, (3) blood, acid-base and electrolytes, (4) kidney and body fluids, (5) brain, cerebral circulation, anaesthetic depth, neuromuscular transmission, (6) endocrine and metabolic, (7) thermoregulation, (8) liver and gut, (9) general pharmacokinetics and pharmacodynamics as they couple to the systems above (not individual drug monographs), (10) effects of interventions: ventilation, fluids and blood, CPR, defibrillation and pacing, mechanical circulatory support.

OUTPUT: <OUT>/COUPLING-REFERENCE/ with one file per system, a CSV and JSON of all rows, 00-summary.md (counts by grade per system, the links with the weakest evidence, the disagreements), and PROGRESS.md updated after every system. Depth over breadth: a finished, well-sourced system is worth more than ten thin ones. State plainly what you did not finish.
```
