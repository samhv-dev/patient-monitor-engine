### Fixed

- **The pleth pulse is measured against the patient's own resting stroke volume.** The pulse height is PI × SVᵢ/SV₀.
  SV₀ is now the stroke volume the running engine settles this patient at, at rest: breathing spontaneously, not
  ventilated, in sinus rhythm, once the MANUAL trackers (or MODELED's reflexes) have settled. The engine measures it once
  per patient when it is created; nothing is typed in. Before, SV₀ came from the stand-alone stabiliser: 79.1 mL for the default adult,
  against the 88.6 mL the same MANUAL patient settles at. That stabiliser solves the bare circuit for the profile's own
  targets (HR 70, CVP 5) at a constant pleural pressure of −4 mmHg. It leaves out three things: the instructor's numbers
  that the MANUAL trackers then impose (HR 75, CVP 6: about 400 mL more venous volume and LV Emax ×0.74), the
  spontaneous-breathing pleural swing, and, in MODELED, the baroreflex (the MODELED rest is 81.5 mL). The result was a
  sinus pulse under PEEP 5 drawn 8 % taller than the set PI, although ventilation lowers stroke volume (Michard,
  *Anesthesiology* 2005). It now sits at 0.96×.
- The waveform-regression baselines of the three pleth rows are re-recorded for that cause, and only these rows. The
  heights below are per beat, against the 27 September baseline (`978b6538`). The validation gate's expected miss H
  (sinus-75/pleth, waiting on this PR) is taken off, as the gate requires once the row meets its band:
  - **sinus-75 / pleth: 0.95–0.97× (0.949–0.970).** The old baseline divided each pulse by the mean of the last 16 beats. That
    cancelled the steady fall in stroke volume on PEEP 5 (85.7 against 88.6 mL at rest). The baseline was wrong, not
    the drift.
  - **afib-110 / pleth: 0.66–0.71× (×0.893 of PR #327's record).** With no atrial kick and with mechanical restitution, AF ejects less per beat
    than the patient's sinus rest.
  - **hypovolaemia-ppv / pleth: 0.67–0.68× (×0.893 of PR #327's record).** The stroke volume falls (59.4 against 88.6 mL
    at 40–45 s).
  The shapes and the timing are unchanged. No other row moves.
