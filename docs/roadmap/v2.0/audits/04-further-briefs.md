# Jobs 4–14: further briefs

Each section states the goal, the inputs, what to produce and what not to do. All are read-only on the repository
(`https://github.com/samhv-dev/patient-monitor-engine`, branch main). Literature jobs follow the evidence rules in
[README.md](README.md). Outputs go to `<OUT>/<job-name>/` with a `00-summary.md` and a `PROGRESS.md`.

## 4. Code structure and hygiene

**Goal:** judge whether the code is modular, scalable and clean, and write a mechanical clean-up plan.
**Do:** map module boundaries and dependencies of `packages/*` and of `packages/engine-core/src/l2/*` (who imports
whom; cycles; the three large wiring files `engine.ts`, `l2/resp/pipeline.ts`, `l2/hemo/pipeline.ts`: what each
knows about other modules, what could be data-driven); find duplication and near-duplicates; list every place the
development history lives in the code (comments, file names, test titles referring to stages, tasks, rulings and
reviews) with counts per file; comment density and comments that restate the code; dead code and unused exports;
leftover demo pages and scripts; naming consistency; public API surface and its documentation; test organisation
(tests named by stage against tests named by behaviour; the known-miss tests as a list with owner module); build and
CI structure. **Produce:** findings with file:line and severity; a rename map (old path → domain-named path); a list
of comment classes to delete, keep or move into documentation; a proposed documentation tree organised by the model
(per module: purpose, equations, parameters, sources, tests); an order of work that keeps the test suite green at
every step. **Do not** change code.

## 5. Numerical audit

**Goal:** establish whether results depend on the numerical scheme.
**Do:** identify the integration method and step of every module and the order in which modules step; run a fixed
set of scenarios (rest; propofol induction; 30 % haemorrhage over 10 min; apnoea to arrest; hypothermia; a one-hour
anaesthetic) at the default step and at one half and one quarter of it, and with the module order permuted where
the code allows, and report the differences in every monitored variable (maximum, root-mean-square, time shifts of
events such as apnoea or arrest); find stiff couplings (time constants below a few steps), algebraic loops broken
by a one-step delay, and variables whose value depends on evaluation order; measure drift of conserved quantities
over 6 simulated hours; check determinism across runs and across the two browser engines. **Produce:** tables per
scenario; the list of order- or step-dependent results; recommendations stated as requirements for a v2 scheme
(not code).

## 6. Architecture comparison

**Goal:** learn from established open physiology engines before designing the v2 core.
**Do:** for Pulse Physiology Engine, BioGears, HumMod (and its Guyton lineage), CircAdapt, and any other credible
open whole-body or cardiorespiratory engine you find, describe from their documentation, papers and source: how
state, parameters and units are declared; how conservation is enforced; the solver and time-coupling scheme
(circuit solvers, substance transport, step sizes); how autonomic and humoral control are organised; how diseases,
drugs (PK/PD) and interventions are represented; how a patient is parameterised; how they validate and what
accuracy they publish; licences; known limitations stated by their authors or in reviews. **Produce:** a
comparison table; the design choices that recur across engines; what each does that this project should adopt,
adapt or avoid, with reasons; real-time performance implications for a browser. Cite everything.

## 7. Parameter identifiability

**Goal:** for a model meant to be fitted to a patient, know which parameters data can determine.
**Do:** from the code inventory (job 1), list every model parameter; classify each as directly measurable in
routine anaesthesia or intensive care, measurable with special tests, estimable from waveforms or trends, or not
identifiable; find groups of parameters that only appear together (structurally non-identifiable combinations);
state which clinical measurements carry information about which parameters; propose, with literature support,
population priors by age, sex and size for the measurable ones. **Produce:** the table; the list of parameters
that should be merged, fixed or replaced by physically meaningful ones; the minimum measurement set for
personalising each subsystem.

## 8. Citation verification

**Goal:** protect credibility: check that existing claims are supported by their stated sources.
**Inputs:** [../evidence/cardiac-reflexes-audit.md](../evidence/cardiac-reflexes-audit.md) (101 references) and the
parameter tables under `docs/physiology/`. **Do:** for every reference: does the source exist; does it contain the
number or statement attributed to it (quote and locator); is the population and setting as described; is there a
newer or stronger source that contradicts it. Give each claim one of: CONFIRMED / CONFIRMED WITH A DIFFERENT NUMBER
(state it) / NOT FOUND IN SOURCE / SOURCE NOT ACCESSIBLE / CONTRADICTED. **Do not** soften a failure: a claim whose
source could not be opened is "not accessible", not "confirmed". **Produce:** one row per claim; a summary of
every claim that fails and what depends on it.

## 9. Evidence dossiers

**Goal:** reduce the owner's review load without replacing his judgement.
**Input:** a list of evidence-decidable questions supplied separately (questions about what a specific device does,
and preferences, are excluded). **For each question:** restate it; the options; for each option the supporting and
the opposing evidence with quotes, locators, identifiers and grades; where the evidence is thin or conflicting, say
so; a recommended answer with a confidence level and what would change it; the effect of each option on what a
trainee would learn. **Rules:** argue both sides in full before recommending; never fill a gap with a plausible
number; mark anything not opened as UNVERIFIED.

## 10. Single-drug plausibility

**Goal:** input for the drug-leftovers stage.
**Do:** for every drug in the engine's library (`packages/engine-core/src/l2/pk/data/`), at standard adult doses
by each supported route and at one overdose: run the engine in a default adult and record onset, peak and duration
of each clinically relevant effect (consciousness, breathing, heart rate, pressures, neuromuscular block, others
specific to the drug); compare with textbook ranges (Miller, Stoelting, Goodman and Gilman, product monographs),
cited. Then the fifteen most common anaesthetic combinations. **Produce:** one row per drug–dose–effect with engine
value, reference range, source, verdict (plausible / too fast / too slow / too large / too small / wrong
direction / no effect modelled); a ranked list of what a senior anaesthesiologist would object to.

## 11. Target audit

**Goal:** check the targets, not the model.
**Inputs:** every test marked as a known miss (`it.fails`) and the calibration queue under `docs/validation/`.
**Do:** for each, extract the target band and its stated source; verify the source and whether the band reflects
it; look for better evidence; say whether the band is right, too narrow, too wide, mis-specified (for example a
fixed time where the literature gives a cause-dependent range), or not supported. **Produce:** one row per target
with a verdict and, where the target should change, the proposed band with sources. Changing a target is the
owner's decision; this job only supplies the evidence.

## 12. Release readiness

**Goal:** nothing embarrassing or risky at the public release.
**Do:** check every third-party item against `NOTICES.md` and its licence; the provenance and licence of every data
set used in validation; anything in the repository that should not be public; the vendor look-alike monitor styles
("Saadat-style", "Philips-style" and others): what is imitated (layout, colours, alarm sounds, legends), what the
disclaimers say, and the trade-dress and trademark considerations to raise with a lawyer (identify the questions;
do not give legal conclusions); the wording of the "education only, not a medical device" statements; accessibility
basics of the app. **Produce:** a checklist with pass/fail and the open questions.

## 13. Educator usability

**Goal:** make the instructor interface usable by a clinician who has not been trained on it.
**Do:** a heuristic walkthrough of the instructor view, the scenario library, drug and fluid entry, airway and
ventilation, defibrillation and pacing, devices and alarms, the patient builder and the log, as an anaesthesia
educator running a session alone: where is the next action unclear, where are errors easy, what takes too many
steps under time pressure, which labels a clinician would misread, what is missing for debriefing. **Produce:**
findings by severity with screenshots, and the ten changes that would help most.

## 14. Paediatric reference tables

**Goal:** prepare paediatric scaling for v2.0. Lowest priority.
**Do:** for neonate, infant, 1–5 years, 6–12 years and adolescent: normal ranges and scaling laws for every
parameter in the reference map (job 2), drug dosing and kinetics differences, airway and ventilation differences,
and the integrated responses that differ in kind from adults (for example bradycardia as the response to hypoxia).
Graded evidence as above.
