### Added

- **Pump channels in the drug layer, syringe and drip (pump rack E1).** The engine takes a new event kind `pump`:
  a channel (1–8) is loaded with a syringe or a bag of stated contents (drug, concentration, volume), programmed with a
  drug and concentration, given a rate (mL/h, a dose rate converted with the programmed concentration, or drops/min on
  a drip channel with its IV set), started, stopped, purged, given a bolus (syringe channels) and unloaded. Its volume
  falls at its rate; at empty it stops and raises one `pumpAlarm` event (End on a syringe channel, Empty Container on a
  drip channel), and a drip channel stops at its volume limit with Infusion Complete. Channels of one drug add to each
  other and to the drug's channel-less infusion, and the patient receives what the syringe or bag contains, not what the
  channel was programmed as: a remifentanil syringe programmed as propofol gives remifentanil. A purge before the
  channel has delivered anything goes to waste; after, into the patient. The channels are in the drug state, so a
  snapshot carries them; the `drugs` event lists them under `pumps`. Nothing a learner sees changes yet, and a run with
  no `pump` event is unchanged: the bolus and purge rates, the syringe size and the IV set arrive on the event from the
  host's device profiles, so the engine holds no device number (docs/plans/pump-rack-tci.md, piece E1).
