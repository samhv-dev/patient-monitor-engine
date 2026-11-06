### Added

- **The class IV haemorrhage card in `pme-scenario/2` (plan F9): `showcase-haemorrhage-v2`, beside the `/1` card,
  which is unchanged and still runs.** Six phases on engine truth (Bleeding, Decompensating, Arrest: PEA, Arrest:
  asystole, ROSC, Post-resuscitation after 120 s of ROSC); the bleed and the junctional rhythm are card-set as on the
  `/1` card. **No VF phase and no shock** (the owner's ruling of 5 November: VF comes from the physiology, never from a
  press): measured on this course, the engine draws no VF untreated, with CPR into asystole or with CPR in the PEA, so
  the `/1` card's scripted VF at the first two rhythm checks is gone; the rhythm check stops the compressions and
  changes no rhythm. On the demo's timing (CPR 15 s into asystole) the patient stays in asystole, which this model never
  turns back into a pulse; with CPR in the PEA (measured at 10, 60, 120 and 200 s after the pulse loss) the pulse returns.
  Actions: oxygen, intubate, call for help, CPR, bag, epinephrine every 180–300 s, source control, massive transfusion,
  TXA, rhythm check every 2 min, stop CPR; epinephrine 1 mg IV or IO in ROSC a violation; each action's numbers carry
  their source, quoted and cited, in a new `src` field (Miller's Anesthesia 10th ed. Ch82 and Ch62, the /1 card, the
  design); an action whose sources state no window is recorded, not timed. Opens in Instructor v2 (today's view says to run it there).
- **`pme-scenario/2`, additive (the owner's rulings of 5 November):** a window's `failAfterS` (CPR within 30 s met,
  30 s to 2 min overdue, later failed though started); an action's `preparation: true` (recorded with its time, no
  verdict); the unconditional `repeat` now graded, each interval from the previous dose as given (sooner a deviation,
  later overdue, none due once the action's phases ended). A procedure, sample or communication action is recorded by
  its taking: a press of non-act commands (source control's bleed rate of 0) records one administration of its kind, and
  an action with nothing for the engine (call for help) is the new scenario `record` command, which Instructor v2 sends.
  An action window may open on each taking of another action (`each:action:<id>`, one window per taking: resume CPR
  within 10 s of each rhythm check) or at the earliest of several anchors (`{ first: [...] }`: CPR from the pulse loss
  or the operating-room trigger, whichever is first). A window may also open on a rule on the DISPLAYED numerics
  (`{ display: rule }`): the operating-room trigger reads the monitor, arterial systolic below 40 mmHg (cuff below 50
  without an arterial line) for 30 s with EtCO₂ below 25 mmHg (ERC 2025; Harper et al. 2020; the owner's numbers).
