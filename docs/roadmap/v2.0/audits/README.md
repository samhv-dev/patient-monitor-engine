# External audits and research jobs for the v2.0 specification

Each job is a self-contained brief for an independent model or reviewer. Jobs are independent of each other unless
stated; two of them (1 and 2) are deliberately kept apart so the literature map is not fitted to the code.
Replace `<OUT>` with an output folder. All jobs are read-only on the repository.

| # | Job | Why | Brief |
|---|---|---|---|
| 1 | Code inventory of every coupling | What the engine actually does, link by link; conservation; clamps | [01-coupling-code-inventory.md](01-coupling-code-inventory.md) |
| 2 | Physiological reference map | What the body does, link by link, with graded evidence | [02-coupling-reference-map.md](02-coupling-reference-map.md) |
| 3 | Reconcile 1 and 2 into the coupling ledger | The v2.0 specification | [03-coupling-ledger.md](03-coupling-ledger.md) |
| 4 | Code structure and hygiene audit | Modularity, the wiring files, history in code, clean-up plan | [04-further-briefs.md](04-further-briefs.md#4-code-structure-and-hygiene) |
| 5 | Numerical audit | Step-size and ordering sensitivity, stiffness, drift | [04-further-briefs.md](04-further-briefs.md#5-numerical-audit) |
| 6 | Architecture comparison | How established open engines organise state, coupling, parameters, validation | [04-further-briefs.md](04-further-briefs.md#6-architecture-comparison) |
| 7 | Parameter identifiability review | Which parameters a patient's data can determine | [04-further-briefs.md](04-further-briefs.md#7-parameter-identifiability) |
| 8 | Citation verification | The reflex audit's references and the parameter tables | [04-further-briefs.md](04-further-briefs.md#8-citation-verification) |
| 9 | Evidence dossiers for the owner's open questions | Evidence-decidable questions only | [04-further-briefs.md](04-further-briefs.md#9-evidence-dossiers) |
| 10 | Single-drug plausibility audit | Every drug at standard doses against textbook ranges | [04-further-briefs.md](04-further-briefs.md#10-single-drug-plausibility) |
| 11 | Target audit | Whether the targets of known-miss tests and the calibration queue are right | [04-further-briefs.md](04-further-briefs.md#11-target-audit) |
| 12 | Release-readiness review | Licences, data provenance, vendor look-alike risk | [04-further-briefs.md](04-further-briefs.md#12-release-readiness) |
| 13 | Educator usability review | The instructor interface | [04-further-briefs.md](04-further-briefs.md#13-educator-usability) |
| 14 | Paediatric reference tables | Lowest priority; nothing depends on it yet | [04-further-briefs.md](04-further-briefs.md#14-paediatric-reference-tables) |

Rules for every literature job: no number without a source; each source with authors, year, journal or textbook
edition and chapter, an identifier (DOI or PMID), and a short verbatim quote or the table or figure that carries the
number; a strength grade (A human experimental or large observational; B small human or consistent animal; C textbook
consensus without a traceable primary number; D disputed); and the mark UNVERIFIED for any source cited second-hand.
