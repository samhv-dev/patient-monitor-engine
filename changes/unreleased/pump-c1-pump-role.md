### Added

- **Infusion-pump rack, C1: the `pump` role on the wire and at the relay (plan pump-rack-tci.md §C1, §4 D1, D2, §7).** A
  `pump` hello carries the learner PIN (required; 4 to 8 digits on the wire) and its device key. The relay admits it
  exactly as the learner action remote: from another device in a learner's place under `--max-peers`, PENDING until the
  host's grant under the same per-address wrong-PIN and hello limits (one count per address), sent a viewer's frames
  granted or not plus the host's `prep` events that name it, and it forwards to the host only `PUMP_COMMANDS` (`pump`
  `load`, `program`, `rate`, `tci`, `bolus`, `start`, `stop`, `purge`, `unload`, each on one channel 1 to 8) with their
  own fields only (`pumpMay`); a raw `applyEvent pump`, `applyEvent drug`, `prep`, `time`, `scenario`, `atTick` and a
  `load` that says what the syringe holds are `forbidden`; more than 6 commands a second close the socket. The guard
  types every pump command's values, from anyone. The host does not yet grant or apply a pump's commands: that is C2.
