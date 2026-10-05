# Job 3: reconcile jobs 1 and 2 into the coupling ledger

Run only after jobs 1 and 2 exist for at least one system. Inputs: `<OUT>/COUPLING-CODE/` and `<OUT>/COUPLING-REFERENCE/`.

```text
You are given two independent tables for the same body system: a code inventory of every coupling in a simulation engine (rows C-...) and an evidence-graded reference map of the physiological links (rows L-...). Join them into one ledger, one row per physiological link:

- the L row (and all C rows that implement it, or "none")
- status: PRESENT-MECHANISTIC / PRESENT-EMPIRICAL / PRESENT-HEURISTIC / PRESENT-WRONG (sign, size or time course outside the evidence range: give both numbers) / ABSENT / CODE-ONLY (in the code with no counterpart in the reference map: say whether it is an artefact or a link the map missed)
- for PRESENT rows: engine magnitude and time constant beside the reference range and its evidence grade
- parameter mapping: which engine constants correspond to which patient-measurable parameters; which have no physical meaning
- conservation: balance equations from the reference map beside the engine's audit result
- what the absence or error BLOCKS: list the integrated responses (from the reference map) that cannot come out right without it
- effort class to make it mechanistic: local change / new state variable / needs a hub or a new module / needs the core redesign
- teaching importance (from the map) and a priority: P1 blocks a core integrated response; P2 visibly wrong in common scenarios; P3 refinement

Then: a ranked gap list; the minimal set of new state variables and hubs that would close the P1 gaps; and every place where the reference map itself is weak (grade C or D, or UNVERIFIED) on a P1 link, because those need the owner's review before they become acceptance criteria. Do not propose code. Output: <OUT>/COUPLING-LEDGER/<system>.md plus CSV/JSON and 00-summary.md.
```
