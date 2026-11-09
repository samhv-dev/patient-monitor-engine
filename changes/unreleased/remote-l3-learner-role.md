### Added

- **Learner action remote, L3: the `learner` role on the wire and at the relay (plan learner-action-remote.md §L3, D2,
  D9; LQ1 ruled 9 November).** A `learner` hello carries the learner PIN (required; 4 to 8 digits on the wire). The
  relay admits it from another device in a learner's place under `--max-peers`, keeps it PENDING until the host's grant
  under the instructor's per-address wrong-PIN and hello limits (one count per address), sends it a viewer's frames
  granted or not plus the host's `prep` events that name it, and forwards to the host only `LEARNER_COMMANDS`
  (`prep stage`, `prep discard`, `prep deliver`, `prep infuse`, `infusion set`, `applyEvent lab` of `abg`/`vbg`) with
  their own fields only (`learnerMay`); anything else is `forbidden`, more than 6 commands a second close the socket.
  The host does not yet grant or apply a learner's commands: that is L4.
