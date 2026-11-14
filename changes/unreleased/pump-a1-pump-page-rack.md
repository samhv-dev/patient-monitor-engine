### Added

- **Infusion-pump rack, A1: the pump page, the picker card and the rack (plan pump-rack-tci.md §A1, §4 D1, §5, §8; PQ1 = C,
  PQ10 = B).** The instrument picker offers "Infusion pumps" in the owner's words; its Show here opens `#/pump`, whose
  learner-PIN form (L6's) signs the tablet in with a hello `{role: 'pump', show: 'pump', device, pin}` (`pump` is now an
  instrument; the guard admits `show: 'pump'` on a pump's hello only, and a pump shows nothing else). Granted, the tablet
  shows a rack of as many channels as Room setup's new "Pumps in this room" card sets (1 to 8, default 4 syringe
  channels), each a syringe or a drip channel; the setting is kept with the site profile and reaches the tablet on the
  host's `style` event (`pumps`), at every hello and every change. Each channel is one generic face drawn from the
  follower engine's `pumps` rows (E1): the PROGRAMMED drug and concentration, the state, the rate (mL/h with the dose
  rate on a syringe channel; drops/min or mL/h with the other beside it, the IV set and the volume limit on a drip
  channel), the volumes, the time to empty and the engine's alarms. The syringe's or bag's contents never reach the
  page: one projection (`pump/face-row.ts`) drops them before the rack sees a row. A device profile's gap is said in
  the face's words ("near-end time not set", "KVO not set from the manual"); the generic face names no maker or model
  and is English only. The tablet shows no monitor and carries none of its sound.

### Known limitations

- The host grants a pump tablet in C2: until then the tablet says after 10 s that the instructor's computer did not sign
  it in. The device profiles (S1) and the channel flows (A2) join when they merge.
