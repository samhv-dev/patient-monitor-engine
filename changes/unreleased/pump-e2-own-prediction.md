### Changed

- **A TCI pump now predicts with its own model, blind to the patient (pump rack E2).** Until now the engine's TCI was
  an oracle: it chose its rates from the simulated patient's own state and clearance, so a wrong weight, another set
  or a failing liver changed nothing a learner could notice. Now each TCI pump (the channel-less `tci` event, and a new
  `tci` action on a syringe pump channel) runs the set it names from the TCI-set registry, computed once from the
  patient data typed into it, and keeps its own predicted state, fed with what the pump believes it delivered (on a
  channel, the volume moved times the programmed concentration). It doses to reach the target in that model. The
  patient receives the drug through its own model with its own clearance and distribution, so the pump's displayed
  concentration and the patient's true concentration are two different things, as at the bedside. The `drugs` event
  carries each pump's prediction (`tciPumps` for the channel-less TCI, `pumps[].tci` for a channel); its `drugs` rows
  stay the patient's truth. A `tci` event's `model` no longer changes the patient's own model; a set must be the
  drug's own, a set without a ke0 refuses effect-site targeting, and a set or patient data change is refused while a
  TCI runs (stop it with target 0 first). The `tci` event takes an optional `opioids` flag for Eleveld's opioid
  co-administration (absent: false). In the six-hour drug long run the pumps hold their targets while the patient's
  propofol effect site ends above its target, because the pumps do not see the patient's lower clearance under
  anaesthesia (docs/plans/pump-rack-tci.md, piece E2).
