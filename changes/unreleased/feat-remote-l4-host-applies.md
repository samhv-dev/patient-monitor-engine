### Added

- **The laptop admits a learner's phone on the learner PIN and gives what it prepares (plan learner-action-remote.md
  L4, §4 D3, D7, D8, D9; LQ1, LQ3, LQ4).** The host grants the `learner` role on the LEARNER PIN only. The
  instructor's PIN does not grant it, and the learner PIN does not grant the instructor's role. While the two are
  equal, neither is granted. A new learner PIN revokes every granted remote. The app keeps the learner PIN under
  `pme.learnerPin`, drawn once and never equal to the instructor's. The host checks every learner command itself
  (`learnerMay`), whatever the relay did. It keeps the table of staged preparations per device: concentration, volume
  left, findings and ready time, all computed from the formulary on the host. A delivery becomes the instructor's own
  `applyEvent drug`. Its dose is the volume × the formulary's concentration × the fraction still intact at the
  preparation's age, read from the source's stability points. It goes through the same path as the laptop's gives:
  the drug lock ("given 4 s ago from a learner's remote"), staged delivery of a tray, the engine's validation. `prep
  infuse` starts an infusion with the preparation's concentration. `infusion set` changes or stops any running
  infusion, whoever started it. It keeps that infusion's syringe and records the rate it replaced and who had set it.
  Every give is filed `issuedBy: "learner"` with the device key (`by`) and the preparation (`prepId`). The scenario
  driver's record and the run record carry them, and the Debrief names a learner remote as one. A preparation's news
  goes to the remote that staged it (without the findings, which the instructor decides to show) and to the
  instructor's screens (with them). A delivery before the ready time is refused "not ready yet (m:ss)". The remote's
  page (L6), its drugs and infusions menus (L7, L8) and the instructor's notice control (L9) are later pieces.

### Fixed

- **A powder reconstituted with its label's volume and not diluted further can be staged.** The wire guard refused a
  diluent of 0 mL, which the preparation core uses for exactly that case (a 20 mg dantrolene vial in its 60 mL of water,
  for one).
