# Decisions and evidence record behind the v2.0 roadmap

A curated record of the discussion of 4–5 October 2026 between the project owner (an anaesthesiologist) and the
orchestrating assistant. It keeps the decisions, the reasons and the disagreements; it is not a transcript.

## 1. How clinical statements are treated

Owner: "These are just my feedbacks; you should always check everything against evidence and you may fight me on
these." Clinical statements are hypotheses with a strong prior. Each is checked against cited sources; agreement,
conditions and disagreement are reported back plainly. Product and process decisions remain the owner's.

## 2. Resting sympathetic tone (agreed; merged in v1 as FU-8 Part B)

Before: propofol 2 mg/kg lowered mean pressure by about 20–23 % in every patient, because the sympathetic system only
responded to pressure changes and had no resting level for an anaesthetic to remove. Agreed mechanism: a resting
(tonic) sympathetic share of vascular tone and contractility, sized from muscle sympathetic nerve recordings (about
20 % in a young adult, 30 % at 80 years, +10 points in hypertension, +25 in heart failure). Result: healthy −30 %,
80 years −37 %, untreated hypertension −35 %, 80 years hypertensive −41 %, heart failure −41 %, resting values
unchanged. Sizes are for the owner's calibration pass. Owner's principle stated here: "this is exactly how the body
works and we should try to use the same mechanisms anywhere possible."

## 3. Perfusion floor, decompensation and the cardiac reflexes

The owner's four points and what the evidence audit ([evidence/cardiac-reflexes-audit.md](evidence/cardiac-reflexes-audit.md),
101 references) returned:

| Owner's point | Verdict | What the evidence adds |
|---|---|---|
| A measurable arterial pressure is not perfusion; there is a low-perfusion state and, lower, a no-perfusion state; at a mean pressure in the mid-20s to mid-30s arrest is imminent | Supported with conditions | Two zones are real (coronary zero-flow pressure about 21 mmHg in man; coronary perfusion pressure of at least 15 mmHg needed for return of circulation). The pressure number is not a constant: a mean of 40 has been held deliberately; about a minute at 26 is survivable. Write it as time at low perfusion against demand, by mechanism. |
| The spiral accelerates (heart rate 120 → 60 slowly, 60 → 30 faster, 30 → asystole faster still) | Supported for the ischaemic route; not as one shape | Below the autoregulatory limit coronary flow is pressure-passive, so that route accelerates. The reflex route is a cliff (stable, then sudden bradycardia and hypotension). No study was found that quantifies the 120/60/30 example. |
| The fast path to arrest in acute low preload is reflex (Bezold–Jarisch), not ischaemia | Supported with conditions | Bradycardic phase at about 30 % blood loss; spinal bradycardia about 13 %. Corrections: contractile failure at zero flow begins in about 12 s; the Bezold–Jarisch label is disputed (denervated transplanted hearts still faint). Reflex bradycardia at 30–40 % loss is reversible with fluid alone. |
| All the cardiac reflexes should be added | Supported | Of 14 reflex families in v1: 2 real, 4 partial, 8 absent. One autonomic hub, not eight patches. |

Measured in v1 (main `fecbdcc`): sinus rate clamped at 30/min so no reflex can stop the heart; lower pressure always
means a faster heart; baroreflex resetting is unbounded so shock resolves itself (awake 50 % blood loss settles at a
mean of 63 mmHg, no arrest); under general anaesthesia with 40 % loss the patient sits 24 minutes below a mean of 35;
neuraxial block cannot be expressed; chemoreflex has the wrong sign in the paralysed ventilated patient.

Owner's answers to the three gating questions:

1. **Time at the floor** depends on the cause: an ongoing haemorrhage goes faster. The proposed "2 minutes below a
   mean of 35" was the auditor's teaching rule, not a literature number (the evidence spans minutes to an hour by cause).
   Decision: no fixed time constant. Criteria are written by cause (ongoing haemorrhage, fixed volume loss,
   vasodilatory, obstructive, anaesthetic nadir), each with a graded literature range; the time must emerge from the
   mechanism.
2. **Residue:** yes. A survived deep nadir leaves lasting damage, graded by depth and duration.
3. **The sympathoinhibitory collapse** is not deterministic: a healthy patient can become unstable and survive.
   Decision: a graded event that depends on the patient (reserve, age, drugs, volume state), seeded at published base
   rates (7–29 %), with an instructor control to force or suppress it.

Related v1 observations to carry into v2: after the tonic share was added, class III haemorrhage plus propofol
2 mg/kg arrests at +89 s as a cliff (before: nadir 26 mmHg for about a minute, clean recovery); an obstructive arrest
(tamponade) is not reversible by relieving the obstruction once the pulse is lost; adrenaline 1 mg with compressions
started on a still-beating, severely hypovolaemic heart gives ventricular fibrillation and no recovery, while the same
ten seconds later recovers.

## 4. Mechanism against empirical curves (a worked example)

A v1 regression: insulin–dextrose at a potassium of 7.0 lowered potassium by 1.25 mmol/L (accepted 0.6–1.1). Cause:
an empirical curve fitted to the whole potassium fall, with the newly modelled counter-regulatory adrenaline response
stacked on top. Decision: the combined entry uses the same insulin potassium mechanism as plain insulin and the
empirical curve is retired when the drug layer is present; the adrenaline shift remains a separate, real term
(result −0.88). This is the rule in miniature: one mechanism, one source of truth; and each empirical piece replaced
needs re-calibration and can break neighbours.

## 5. Where the assistant pushed back, and what was agreed

- **"Every link exactly as in the body"** has no floor. Agreed wording: mechanistic by default, empirical with a
  written reason; the ledger records which and why.
- **"Evidence weighting for all physiology, pathology, drugs and interventions"** cannot be done well as one job and
  would produce an unverified document that gets cited as reviewed. Agreed form: bounded jobs — verify existing
  citations; upgrade parameters tagged as engineering estimates; check whether the targets of known-miss tests are
  themselves right; and the coupling ledger system by system.
- **Delegating the owner's open questions to an external model:** only evidence-decidable questions go out. Local or
  authenticity questions (what a specific monitor does) and preferences stay with the owner. Answers must carry a
  verbatim quote, a locator and an identifier per source and an explicit "could not open" flag. An answer is accepted
  provisionally only with at least two independent concordant sources (one primary human), no conflicting source and a
  small effect on teaching; everything else goes to the owner with the dossier; the owner spot-checks a tenth of what
  was accepted.
- **More audits are not automatically progress.** Only audits that prevent rework, reduce the owner's review load or
  protect credibility are run, and they must output tables and acceptance cells.
- **v2.0 is a second-generation core**, not another stage on v1. v1.0 ships as the teaching simulator; v1.x is
  maintenance only.

## 6. State of the v1 code (measured 2026-10-05, engine source)

204 source files, 26,194 lines (largest file 1,075); 457 test files, 28,062 lines; 3 uses of loose typing; 1 TODO in
the repository; about 21 % comment lines; 2,275 references to stages, rulings, reviews and tasks inside source; 189
files named after a stage; 222 known-miss markers in tests; a 23-line README; 28 demo pages of which one is the app.
Reading: strict and well tested, with the development history embedded in the code and documentation organised by
process rather than by the model. A clean-up stage is scheduled for v1.0 after hardening.

## 7. Other owner decisions recorded here because they shape the product

- Alarm silence: a new higher-priority alarm breaks through a silence of a lower-priority alarm, as in real life;
  where a specific vendor's device documentably differs, that is reported as a conflict.
- Second screen: the learner monitor uses the same monitor style as the instructor's; sound management is separate
  per window.
- The Saadat-style monitor shows the capnogram in place of the respiration trace when the CO₂ line is attached.
