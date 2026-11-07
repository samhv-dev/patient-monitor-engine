### Changed

- **Validation: the five waveform-regression baselines are re-recorded, and each drift is named (brief 73).** The
  pleth and CO2 baselines dated from 2026-09-27. A first-parent bisect of main attributes every changed sample to
  four merged engine pull requests: #24, #25 and #138 for the pleth, #25 and #28 for the CO2. Main reproduces the
  last of them exactly. Only those five arrays changed. The 2 % limit, the other eight channels and the golden
  hashes are untouched.

### Known limitations

- **Validation still has 16 gating rows, each waiting on an owner ruling (brief 73).** These are the arterial timing
  and shape rows (V1, V1-lit, V2, V3-shape), s9 arrest EtCO2, t15 RV infarct CVP/PCWP, t16 warm sepsis MAP, t17b
  β-blocked SBP and t25 breathing after sugammadex. `docs/guides/known-deviations.md` gives the mechanism and the
  measured numbers for each. No band was changed.
