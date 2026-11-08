### Changed

- **Validation: the gate tells the truth again (brief 84).** Rows that wait on a named mechanism carry an
  expected-failure mark (its id in `docs/guides/known-deviations.md`, the mechanism, the date, the value when marked)
  and are reported as 🟣 in their own count, never as green; their bands are unchanged. `pnpm validate` now fails only on
  an unmarked red row, on a marked row that meets its band, or on non-determinism. Seventeen rows are marked, under ids
  A, B, D, E, F, G and H.
- **Validation: cells C, E and F follow their sources (research 46).** s9: true EtCO2 < 5 at two washout time constants
  computed from the rig (58–85 s; 75 s), and the displayed value within a capnograph's response of it (≤ true + 10 s;
  83 s). t16: an established-shock state row on an anaesthetised, ventilated rig (MAP 49–60, Garcia 2023) and a
  30 mL/kg sub-row (MAP < 65, Sepsis-3). t17b: the unsourced SBP 65–80 band is replaced by rows that compare it with
  t17a (blunted HR response; SBP and CO no higher).

### Known limitations

- **The engine still misses 17 validation rows, now recorded as expected failures (brief 84):** arterial timing (A,
  7 rows), pleth shape (B, 3), RV infarct CVP/PCWP (D, 2), established septic shock collapses to arrest under
  anaesthesia (E, 1), the β-blocked bleeder keeps its output (F, 2), effort under the ventilator (G, 1) and the sinus-75
  pleth regression row (H, PR #333).
