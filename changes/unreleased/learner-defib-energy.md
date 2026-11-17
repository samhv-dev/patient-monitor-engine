### Added

- **The learner's defibrillator window chooses the energy.** Energy select down and up sit beside Charge and Shock. They
  move along the room model's energy list and stop at its ends, and the selected energy is shown and spoken. Charge
  charges to that energy. An energy changed while charging or charged disarms the device, as the guide says. A
  defibrillator screen that joined without a PIN may now send `applyEvent defib selectEnergy` with its `energyJ`; the
  relay and the host check it with the same function. The engine refuses an energy that is not on the model's list,
  from every sender, in words the window shows.
- **The generic defibrillator model has an energy list:** 1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150 and 200 J. These
  are the settings of the ZOLL X Series Operator's Guide (REF 9650-001355-01 Rev. P, p. A-3, Table A-2), recorded with
  that source as data. The instructor's CPR sheet steps along the same list when the room has the generic model. A room
  with no model chosen keeps any 1–360 J and the 10 J step.
- **The instructor sees what the resident delivered.** The resident's energy select is a record row ("Energy 150 J").
  The Log names the device's energy on the window's Charge and Shock ("Shock delivered at 150 J"). A scenario rule with a
  minimum energy reads a bare shock at the device's selected energy, so the witnessed-VF card's 150 J rule can be met
  from the window.
