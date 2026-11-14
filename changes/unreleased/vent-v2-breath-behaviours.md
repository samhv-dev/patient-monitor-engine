### Added

- **Ventilator: the EDP-TS device's breath behaviours (plan vent-skin-edp-ts.md, piece V2).** Three options of the
  ventilator model, each off by default, so the Hamilton-style face and every reference trace are unchanged bit for
  bit: `backupMode` ('VC' or 'PC'): in PSV, no patient breath for the apnoea time starts backup breaths of that kind
  at the set rate while the Apnea alarm stays raised, until the patient breathes again (manual pp. 49–50);
  `pmaxAction: 'cycle'`: a breath whose pressure reaches the maximum is ended, not held at it, and raises High
  Pressure (manual p. 95); `flowPattern: 'ramp0'`: the descending flow, from twice the mean flow to zero at Ti,
  delivering the set VT (manual p. 43). The EDP-TS face (`?face=edp-ts`) turns them on: PSV/CPAP in the mode window,
  Menu → Backup ventilation (mode VCV or PCV, apnoea time 5 to 60 s, Accept applies and Esc returns to the previous
  values), "Backup: VCV" in the top-left block, and Descending as the starting flow waveform. The PSV pressure
  criterion the manual states unclearly is not built; the face's strip says what the simulated PSV breath ends on.
