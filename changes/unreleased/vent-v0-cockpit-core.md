### Changed

- **Ventilator: the cockpit core, with the Hamilton-style face on it (plan vent-skin-edp-ts.md, piece V0).** The
  cockpit's logic (the 5 ms sample buffers, display-only freeze, holds, manual breath, reset, the settings' writes with
  a face's ranges, the mode table, the alarm view, matched flow as a face option) moves out of `hamilton-ui.ts` into
  `apps/demo/src/vent/core/`; the Hamilton-style face is rebuilt on it (`faces/hamilton/face.ts`), chosen through a
  face registry (`?face=`, default `hamilton-style`), and the patient drawer and asynchrony examples become the
  simulator's own tools (`sim-tools.ts`). Nothing a user sees changes: a DOM test proves the face builds the base
  commit's DOM in 49 states. The select-turn-press pending value the EDP-TS face (V1) needs is built and unit-tested.
