### Added

- **The laptop applies what a resident programs on the pump tablet (pump rack C2).** A pump tablet signs in on the
  learner PIN where the room has a pump rack. Each of its commands is checked again on the laptop, then against the
  channel's kind (syringe or drip, from Room setup) and the reference pump's own figures: the JMS SP-500's rate range
  for the loaded syringe size and its 0.1 mL/h step, the JMS OT-701's range for its IV set, its drops/min range and its
  volume limit. A refusal names those figures and the device ("301 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 50 mL
  syringe, in 0.1 mL/h steps"; "the JMS OT-701 has no TCI"). What a channel loads is resolved on the laptop: a
  preparation of the room's learner remotes (ready, in a syringe or a bag, at the fraction still intact) or a stock
  syringe, never what the tablet says it holds; the preparation then leaves its maker's tray. A bolus and a purge run at
  the pump's rapid rate for the syringe size (the OT-701's purge at its stated 450 mL/h floor). Every applied command is
  filed as the pump tablet's, with its device key, the channel and the value it replaced, in the run record and the /2
  administration record. A remote's or the Drug sheet's change of a drug that runs on one pump channel changes that
  channel; on two it is refused ("running on pumps 1 and 2: change it on the pump"). A same-drug bolus from the pump and
  one from the laptop lock each other for 10 s, as any two boluses do.
- **A syringe that differs from its programme is the instructor's finding.** When a channel's contents and its
  programme differ (another drug, or another concentration than the syringe's label), the instructor's screens are
  told at once; the pump learns of it only when the instructor shows the notice ("syringe and programme differ"; on a
  drip channel "bag and programme differ"). The patient receives the true contents either way. A mismatched channel that
  delivers is a /2 violation of source `pump`, harm modelled. The card on the instructor's screen is piece A3; the host's
  `showPumpNotice(ch)` is its control.

### Fixed

- **A command from a role the laptop does not serve is refused and logged** (finding N99). The host's command branch
  sent every role other than the instructor's down the laptop's own controller path, so a pump tablet (a role the host
  did not know before this piece) or a peer calling itself `host` was applied as the laptop's own panel. Each role now
  has its own branch; any other is refused.
