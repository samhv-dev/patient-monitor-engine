### Added

- **A learner sends a sample from the phone and reads its result (plan learner-action-remote.md L11; LQ2, LQ13).** The
  learner remote's Labs tab has four buttons: arterial blood gas, venous blood gas, chemistry and coagulation. A sample
  sent is listed at once as "drawn mm:ss, result expected mm:ss", with the analyser that runs it (the room's blood-gas
  analyser, by default the Radiometer ABL825 FLEX at 80 s; the hospital laboratory for chemistry and coagulation, at
  the urgent turnaround Hawkins 2007 reports). The time is the machine's or the laboratory's own: carrying the sample
  there is not added, and the line says so. The result appears when the phone's own simulation produces it, as a table
  with each test's unit and reference range, values outside the range marked with an arrow, and values at the Kost
  list's critical limits marked "critical". Earlier results stay listed, the latest first. The phone shows only the
  samples it sent: another phone's and the instructor's are not listed.
- **The lab table's ranges carry their sources.** Each reference range is the app's adult normal from its glossary;
  each critical limit is the 2024 median of the Kost list (Shah et al., Diagnostics 2025). The table now also shows
  magnesium, osmolality and INR when a panel holds them.

### Changed

- **The log and the record name the panel that was sent.** A chemistry or coagulation sample was logged as an arterial
  blood gas; it now reads "Chemistry sample sent" or "Coagulation sample sent".

### Known limitations

- **Three tests are shown without a normal range:** arterial PO₂ (its normal depends on the inspired oxygen), haemoglobin
  (it depends on the patient's sex) and the venous pH, PCO₂ and FO₂Hb (no venous range is sourced). Their critical
  limits are still marked where the list gives one.
- **Coagulation shows INR only, and chemistry has no creatinine or CK yet:** the simulator does not compute the other
  tests yet, so nothing is shown for them.
- **The two new log lines print in English in the Persian Debrief** until their Persian is drafted and read.
