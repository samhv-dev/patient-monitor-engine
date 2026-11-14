### Added

- **The depth-of-anaesthesia device has its own window in the room (EEG plan E12).** Room setup has a card "Depth of
  anaesthesia in this room": Off (the default: no EEG, as before) or a reader of the engine's EEG registry (today only
  "Processed EEG (generic)"). The host switches the patient's EEG on with it (`device eeg on`, then `device eeg model
  <id>`) at once and at every patient mount; "Off" switches it off. The picker's "Depth of anaesthesia" card no longer
  says "Coming later": its "Show here" opens `#/depth`, and Room setup's card opens the same window on this computer.
  The window is a follower (its own engine replays the host's commands and reads the same samples): the raw EEG over
  8 s, the spectrogram of the last hour (0–50 Hz), the spectral edge frequency with its trend, the median frequency, the
  suppression ratio, the highest electrode impedance and the reader's signal quality. It holds while the Ventilator view
  drives the patient, as every network follower does. Its look is the generic one; a named device later gets a face of
  its own in `views/depth.ts` (`DEPTH_FACES`). The room table lists such a device as "Depth of anaesthesia", followed as
  any other (no longer "Not available yet").

### Fixed

- **The host no longer sends an EEG device's display on the wire.** With an EEG device on, the host queued each
  `eegReading` (its raw samples) with its other events; the wire guard refused the batch, and every event of that batch
  was lost for every follower. The reading now stays on the host, as the plan's D3 says (a follower draws its own).
