### Added

- **Infusion-pump rack, A2: the channel flows on the pump tablet's face, wired to the host (plan pump-rack-tci.md §A2,
  §4 D2, D6, D7, D12; §5, §8; PQ8 = A).** Each channel of the rack now has the buttons §5 names — Load, Program, Rate,
  TCI, Bolus, Start/Stop, Purge, Unload (a drip channel has no TCI and no Bolus) — and each builds one of the pump's
  allowed commands and sends it through the tablet's learner-PIN follower. Load lists the LABELS of the room's
  preparations in the channel's container and the formulary's stock items of its kind, never what a syringe holds;
  Program offers the pump's drug list and, on a drip channel, the OT-701's set types; Rate takes mL/h, a dose rate, or
  drops/min on a drip channel, with a volume limit; TCI offers only the sets the engine has registered for the
  programmed drug, asks for the mode, the target and the patient, with "Copy from the case sheet", and shows the
  paper's range for a typed value outside the studied population; Bolus and Purge as §5 and D7 state them. Every range
  and gap the forms show is the shipped device profile's, in the face's words; nothing reads as done before the host's
  acknowledgement, and a refusal is the host's own words. The laptop's host now grants a pump tablet on the learner PIN
  and checks its commands against the rack set on Room setup and the device profiles (C2's options, wired). A channel
  whose syringe or bag and programme differ shows a card on the instructor's dock at once, with one control, "Show the
  mismatch notice to the learner", which shows "syringe and programme differ" on that channel of the tablet.

### Fixed

- The pump page was given no device profiles, so every face said "device profile not loaded" (finding N125): the app
  now loads the shipped profiles for the host and the tablet alike.
- The laptop's Link read the host's pump-mismatch news as a learner preparation's and threw on it.

### Known limitations

- The channel's history list, the notice's sound on the tablet, the instructor phone's copy of the mismatch card and
  the Pumps sheet are later pieces (A3); the record does not yet say whether TCI's patient was copied or typed.
