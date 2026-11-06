### Added

- **The room's defibrillator, apart from the monitor style (Room plan R5a, R5b, R5; owner's Q6 ruling of 5
  November).** The engine's device layer takes a defibrillator model of its own, `device {device:'defib',
  action:'model', value}`: the energies, the charge time and the low-energy outcome rule then read the model's spec,
  whatever monitor skin the engine wears, and a skin change keeps it; with no model set nothing changes. One model
  ships, `generic` (120 J adult, 50 J paediatric, no AED ladder, the 7 s per 200 J charge rule: the fallback's values,
  equal to the Zoll-style skin's block); the pacer stays the skin's. Room gains a "Defibrillator in this room" card
  (the generic model, and "Your department's machine: not named yet"); the choice is kept with the site profile, the
  instructor's page sends it to the patient at every patient start and scenario load, and every follower replays it.
  The Defib tab's energy starts at the model's adult energy (200 J, as before, with no model). A follower page at
  `#/defib` (`?follow=CODE#/defib` on this computer, `?join=CODE#/defib` over the relay) is the defibrillator window:
  the model's look, and the energy and CHARGING / READY from its own engine. A window wearing the LIFEPAK-style skin
  beside a Saadat-style host was READY 2.6 s early at 360 J (10.02 s against 12.62 s); with the room's model it is
  READY on the host's tick.
