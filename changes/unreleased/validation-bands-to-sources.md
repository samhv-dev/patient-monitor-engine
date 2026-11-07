### Changed

- **Validation bands go to their sources (physiology audit V-07, V-20 and the twelve "band or rig mis-specified"
  rows).** The six haemorrhage HR/SBP bands are now the trauma registry's (Mutschler 2013 Table 2, mean ± 1 SD; Guly
  2011), not the ATLS column; t12, t14, t16, t18, t24 and the V5 interval rows measure what their sources measured;
  the 172 calibration-pass band proposals are ruled one by one against their own primary sources in
  `docs/validation/target-audit/rulings.tsv` (applied where a source states the edge, declined with the reason
  otherwise); and the lung-pathology catalogue's single values become ranges only where their own source states one.
  No band moved toward the engine; a miss against a corrected band stays a recorded miss.
