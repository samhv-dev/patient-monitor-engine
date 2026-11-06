### Added

- **The same drug is not given twice within 10 s of simulated time, from any device** (the owner's ruling of
  5 November 2026: a guard against two hands entering one event, not a clinical rule). The host refuses a second bolus
  of the same drug (any dose, any route) from the laptop, a Remote or the instructor's phone; its ack is
  `accepted: false`, `code: 'recent'`, the reason "given 4 s ago from the laptop" and `recent: { drugId, agoS, by }`.
  The refused press never reaches the engine or the scenario driver and is not in the run record. Every device reads
  the lock from the applied commands it receives (`ControllerSession.gives`): Instructor v2's ACTION row and Drug sheet
  row and today's Drugs & fluids tab read "given 0:04 ago · 6 s left", counting down. Infusions, TCI, the vaporiser,
  fluids, CPR, defibrillation and the airway are not locked; the card's own script is never refused (a press after it
  is). A `pme-scenario/1` step press whose target state's onEnter gives a locked drug is refused the same way and the
  card does not move (the orchestrator's ruling of 5 November, reversible by the owner; `ScenarioDriver.triggerGives`,
  `HostSessionOptions.scenarioGives`); the step's toast says so instead of "the case has moved". (`@pme/controller`
  `drug-lock.ts`: `SAME_DRUG_LOCK_S`, `RecentGives`, `bolusDrugOf`; the ack gains `code` and `recent`, `AckResult`
  gains `code`.)
