### Changed

- **A blood sample comes back when the real analyser would return it (learner remote L10a, plan
  `docs/plans/learner-action-remote.md` §L10a).** The engine's single unsourced lab turnaround (`LAB_TURNAROUND_S`,
  120 s, `[ENG: device]`) is gone. A sample now runs on a data row (`l2/blood/analysers.ts`):
  - the gas panels (`abg`, `vbg`) on the room's analyser: the Radiometer ABL825 FLEX (the default; the department's
    ABL800 FLEX model is awaiting the owner) at its measuring time of 80 s, or the ABL837 FLEX at 100 s (Radiometer
    specification sheet 928-544, 201104M);
  - the new `chem` panel (Na, K, Cl, Mg, glucose) on the laboratory row at 46.1 min, and the new `coag` panel (INR) at
    45.5 min: the mean urgent intra-laboratory turnaround for potassium and prothrombin time in Hawkins, Clin Biochem
    Rev 2007;28:179–94, Table 6 (2001 cycle), until the owner's laboratory gives its own figure.

  A panel returns only the analytes that its row measures or derives AND that the engine computes, so the gas panel no
  longer reports magnesium (the ABL800 FLEX does not measure it). The time to carry the sample to the analyser has no
  source and is not added. A card's `turnaroundS` still overrides the turnaround (30–3600 s). `labResult` now carries
  `analyser` (the row id) and holds only its panel's analytes. The host may set the room's analyser on the `lab` event
  (`analyser`); a learner's device cannot. A learner may now draw `chem` and `coag`. The liver's placeholder INR
  relation is now marked as the stand-in it is (L10c replaces it).
