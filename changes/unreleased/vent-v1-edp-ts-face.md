### Added

- **Ventilator: the EDP-TS face, first usable (plan vent-skin-edp-ts.md, piece V1).** `vent-hamilton.html?face=edp-ts`
  (and the embed's `face` option) shows the ventilator as the EDP-TS ICU ventilator is operated: VCV, PCV and PRVC
  chosen through the manual's mode window and its confirmation, the bottom row's settings changed by touching a key,
  turning the knob and pressing it (a change not pressed returns after 15 wall-clock seconds), Ctrl + Oxygen in steps
  of 10, Esc, Menu pressed one to four times, the alarm-limit tags and the Alarm settings window editing the model's
  limits, and the model's alarms in the device's words and colours. Every control the model does not honour yet is
  drawn, marked and says why ("needs piece Vn" or the plan's reason). Every word, number and colour on the face cites
  research/57 (face.json, checked by a test). The cockpit core gains the breath record (Ti, Te, I:E, peak flow, the
  end-expiratory pressure of the last 50 ms), per-sample phase, a face's starting settings and invariants, its alarm
  profile's names and priorities, and settings in a device's own units. The default face stays Hamilton-style.
