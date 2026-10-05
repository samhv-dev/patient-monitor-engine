# v2.0: a physiological simulation engine

## Vision

The project owner's aim (2026-10-05): the model should become a true physiological and pathophysiological simulation,
accurate enough that one can later give it the parameters known for a patient and run a simulation forward — with its
limits of validity and applicability stated. Every physiological link should exist and work the way it works in the
body where that is possible, and where it does not there must be a written reason.

v1 is a staged build: each stage added a module and wired it to the others. It is well tested and useful for teaching.
It is not yet an engine in this sense. v2.0 is a second-generation core, built against a specification, not another
follow-up stage.

## Principles

1. **Mechanistic by default, empirical with a written reason.** A link is modelled by its mechanism when the learner's
   or clinician's actions and observations couple through it. An empirical whole-effect curve is allowed only where a
   mechanism would add parameters without any observable difference, and the ledger says so.
2. **Parameters have physical meaning.** Each is something that can be measured or estimated in a patient, with units.
3. **Conservation by construction.** Volume, oxygen, carbon dioxide, electrolytes and buffers, glucose and lactate,
   heat and drug mass balance because of how the state is declared, not because a test checks afterwards.
4. **No hidden clamps.** A floor or ceiling on a physiological variable is either a physical limit with a source or a
   missing mechanism to be listed.
5. **Failure emerges.** Arrest, pump failure and decompensation come out of supply and demand, not from switches.
6. **Evidence first, including against the owner.** Clinical statements are hypotheses to check against sources and to
   challenge when the literature disagrees. Every number carries a source, a locator and a strength grade.
7. **The time course is produced by the mechanism.** No fixed timers for physiological events (for example: time to
   arrest at a low pressure depends on the cause, on demand and on whether the insult continues).

## What a true engine needs that v1 does not have

In order of how much each one blocks the vision:

1. **One declared state**: every state variable, parameter and flux with units and compartments.
2. **A defined numerical scheme for coupling in time**, with proof that results do not depend on step size or module
   order. (v1 steps modules in a fixed chain; each sees its neighbour's previous value.)
3. **Control layers as hubs**: one autonomic hub (tonic sympathetic and vagal outflow; every reflex is an afferent
   input) and one humoral hub (renin–angiotensin–aldosterone, vasopressin, catecholamines, cortisol).
4. **Emergent failure**: myocardial and cerebral energy balance instead of an arrest state machine and clamps.
5. **Pathology as parameter change**, not scripted events.
6. **A patient parameter layer**: default distributions by age, sex, size and disease; tools to estimate parameters
   from a patient's data; identifiability analysis.
7. **Predictive validation**: fit an individual's early data, predict the rest, report error and uncertainty.
8. **Physiological drug kinetics**: distribution driven by the model's own flows and organ function.
9. **Missing systems**: coagulation, mechanistic inflammation and sepsis, liver and gut beyond clearance, laboratory
   values, paediatric and obstetric scaling.
10. **Model documentation generated from the code**: equations, parameters, units and sources per module.
11. **A statement of intended use.** A model that predicts for real patients approaches medical-device regulation.
    The boundary is decided and written down before anyone uses it that way.

## How v2.0 is built

- **Specification first.** The coupling ledger ([audits/](audits/README.md), jobs 1–3) is the specification: every
  link, from the literature and from the v1 code, classified as mechanistic, empirical, heuristic, wrong or absent.
- **Incremental, not a rewrite in the dark.** The v1 public API and the v1 test suite and coverage matrices are the
  regression oracle; the new core replaces v1 modules one at a time behind the same interfaces.
- **The autonomic hub is the first workstream**, designed on the new core. The evidence audit and 21 acceptance cells
  are in [evidence/cardiac-reflexes-audit.md](evidence/cardiac-reflexes-audit.md); the owner's answers that shape it
  are in [DECISIONS.md](DECISIONS.md).
- **Same process as v1**: plan, independent review, fixes, execution on a branch, gate with evidence, CI green,
  merge. No acceptance band is widened; an unreachable target is recorded as a known miss with its number.

## Workstreams (draft order)

| # | Workstream | Depends on |
|---|---|---|
| 0 | Specification: coupling ledger, architecture comparison, numerical audit, identifiability review | audits 1–7 |
| 1 | Core: declared state, units, conservation, time-coupling scheme | 0 |
| 2 | Autonomic hub and reflexes; perfusion floor; residue after a survived deep nadir | 1 |
| 3 | Humoral hub | 1 |
| 4 | Emergent failure: energy balance for heart and brain; arrest without a state machine | 1, 2 |
| 5 | Pathology as parameters; patient parameter layer | 1 |
| 6 | Physiological drug kinetics | 1 |
| 7 | Missing systems, one at a time | 1 |
| 8 | Predictive validation and uncertainty | 5 |
| 9 | Generated model documentation; intended-use statement | throughout |

## Open decisions

- Whether a minimal reflex and decompensation subset goes into v1.0 (see [../v1.0-remaining.md](../v1.0-remaining.md)).
- Whether v2.0 keeps TypeScript for the core (performance and numerical libraries) — to be settled by the architecture
  comparison.
- Intended-use boundary (item 11).
