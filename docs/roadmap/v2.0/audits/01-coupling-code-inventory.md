# Job 1: code inventory of every physiological coupling

Best suited to a tool that reads and runs a large repository. READ-ONLY: change no source file, open no pull request.

```text
Produce a complete, code-grounded inventory of every physiological coupling in a patient-physiology simulation engine. This is a READ-ONLY audit: change no source file, open no pull request.

REPOSITORY: https://github.com/samhv-dev/patient-monitor-engine, branch main (commit 9f239701 or later). The engine is in packages/engine-core/src: l1 (truth), l2 (organ and signal models: circ, lung, resp, gas, blood, renal, neuro, brain, endo, thermal, pk, organs ...), l3 (devices). Tests in packages/engine-core/test show intended behaviour. Do not read docs/gates, docs/roadmap or any research notes for conclusions: derive everything from the code itself.

GOAL: the project owner wants the engine to become a true physiological/pathological model that could later take a real patient's known parameters and simulate forward. I need to know, link by link, what the code actually does today.

A "coupling" is any place where one physiological quantity changes another: an equation, a gain, a lookup curve, a threshold, a clamp, a state machine transition, a drug effect, a device effect.

FOR EVERY COUPLING, one row with these columns:
- id (C-<SYSTEM>-nnn), system, from_variable, to_variable (use the engine's truth-tree paths where they exist)
- file and line range
- form: differential equation / algebraic / sigmoid or Hill / lookup table / piecewise / threshold switch / state machine / clamp
- the equation in plain notation, with every constant, its value and its units
- time behaviour: instantaneous, first-order with tau = ..., delay, integrator
- classification: MECHANISTIC (represents the physical or physiological process with physically meaningful parameters), EMPIRICAL (a fitted whole-effect curve or constant), HEURISTIC (a rule or switch that stands in for physiology), CLAMP (a floor/ceiling), DEVICE
- parameter identifiability: for each constant, could it in principle be measured or estimated in a real patient? yes / indirectly / no
- provenance stated in the code: the citation or tag in the comment (quote it), or "none"
- modifiers: which patient attributes, diseases, drugs or states scale this coupling
- which tests exercise it (file names)

ALSO PRODUCE:
1. CONSERVATION AUDIT: for blood/plasma/interstitial volume, O2, CO2, each electrolyte and buffer, glucose, lactate, heat, and drug mass: where the quantity enters, moves and leaves; whether the code conserves it; every place it is created, destroyed, clamped or reset. Verify numerically with short scripts (run the engine, sum the compartments over time, report drift).
2. CLAMP AND FLOOR LIST: every min/max/clamp/saturation on a physiological variable, with file:line, the limit, and what happens in a simulation when it is reached (measure it).
3. DUPLICATE AND SHADOW PATHS: effects on the same target that arrive by two routes (for example a fitted curve plus a mechanistic term), and legacy paths switched off by a flag.
4. ABSENT INPUTS: for each organ module, the state variables it computes that nothing else reads, and the obvious inputs it ignores (list what you observe, without consulting textbooks).
5. SCRIPTED PATHOLOGY: every disease or acute event implemented as a scripted change of outputs rather than a change of physical parameters, with file:line.
6. A machine-readable copy of the table (CSV and JSON).

HOW TO WORK: system by system, in this order: (1) circulation and autonomic control, (2) lung mechanics, gas exchange and respiratory control, (3) blood, acid-base and electrolytes, (4) kidney and fluids, (5) brain, anaesthetic depth and neuromuscular block, (6) endocrine and metabolic, (7) thermoregulation, (8) liver and other organs, (9) drug kinetics and dynamics as they enter each system, (10) devices and interventions. Finish and write each system before starting the next. You may run the engine (pnpm install; see package.json scripts) for measurements; keep scripts outside the repo.

OUTPUT: <OUT>/COUPLING-CODE/ with one file per system (01-circulation.md ...), the CSV/JSON, 00-summary.md (counts by classification per system, the twenty most consequential clamps/heuristics, conservation results), and PROGRESS.md updated after every system. State plainly what you did not finish or could not determine. No recommendations beyond what the code shows.
```
