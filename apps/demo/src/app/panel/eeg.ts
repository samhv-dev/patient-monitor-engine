// EEG artefacts (EEG plan E12, Q9). The owner ruled on 12 November that "the EEG should go into devices as a device":
// the Devices sheet (panel/devices.ts) carries this group, "EEG device: artefacts", only while an EEG device is on, and
// the Instructor dock has no EEG tool (an eighth tool overflowed it at 1280 px). One switch per artefact the engine has
// an instructor command for, so the instructor can make the resident's depth reading unreliable the way a real one is:
//   Loose electrode → `device eeg impedance [2, 2, 20]` (one electrode off the skin: over the reader's limit and
//                     unequal, Ch36 p. 1145); off → every electrode back to the engine's default
//   ECG pickup      → `device eeg ecgPickup true|false` (spikes at the engine's own R waves, Ch36 p. 1146)
// Each applies at once (an artefact is an event in the room, as a shock is: never staged), is a Log and record line
// (describe.ts), and shows the state the ENGINE reports in its `state` event (`eeg`), never the press alone; a press
// waits up to 3 s for the engine to report it, as the Devices sheet's sensors do. The followers' engines replay the same
// commands, so a depth window shows the same signal and the same quality (EEG plan D3). Muscle (EMG) and blinks have no
// switch: the engine computes them from the patient (D5). Diathermy and mains are the ECG model's `setModifiers`, which
// no Instructor view may send (plan instructor-peer-role.md §2): not here until that is ruled.
import { EEG_DEVICES, EEG_ELECTRODES, EEG_IMPEDANCE_DEFAULT_KOHM, type EegModelId } from '@pme/engine-core';
import { describeCommand } from '../describe.ts';
import { h, setText, toast, toggle } from '../ui.ts';
import type { Link } from '../link.ts';

/** The loose electrode's impedance, kΩ [ENG: control; an electrode lifted off the skin: well over the 5 kΩ limit of
 *  the generic reader (Ch36 p. 1145 gives 5 or 8 kΩ by device), so every device's quality flag reads it]. */
export const LOOSE_ELECTRODE_KOHM = 20;

/** What the engine's `state` event says of the EEG (types-hemo.ts `eeg`). */
export interface EegStateView {
  model: string;
  impedanceKOhm: number[];
  ecgPickup: boolean;
}

/** The sheet's commands: the engine's own. */
export const eegArtefactCmd = {
  electrode: (on: boolean): Record<string, unknown> => ({
    type: 'device',
    action: { device: 'eeg', action: 'impedance', value: on ? [...new Array<number>(EEG_ELECTRODES - 1).fill(EEG_IMPEDANCE_DEFAULT_KOHM), LOOSE_ELECTRODE_KOHM] : EEG_IMPEDANCE_DEFAULT_KOHM },
  }),
  ecgPickup: (on: boolean): Record<string, unknown> => ({ type: 'device', action: { device: 'eeg', action: 'ecgPickup', value: on } }),
};

/** The switches: id, label, what the engine's state says of it, and its state line. */
export const EEG_ARTEFACTS: ReadonlyArray<{ id: 'electrode' | 'pickup'; label: string; hint: string; on(s: EegStateView): boolean; text(s: EegStateView): string; cmd(on: boolean): Record<string, unknown> }> = [
  {
    id: 'electrode', label: 'Loose electrode', hint: `One electrode at ${LOOSE_ELECTRODE_KOHM} kΩ: a noisier trace, and the device says to check the electrodes.`,
    on: (s) => s.impedanceKOhm.some((z) => z !== EEG_IMPEDANCE_DEFAULT_KOHM), text: (s) => `Electrodes ${s.impedanceKOhm.join(' · ')} kΩ`, cmd: eegArtefactCmd.electrode,
  },
  {
    id: 'pickup', label: 'ECG pickup', hint: 'Spikes at each R wave, most visible in burst suppression.',
    on: (s) => s.ecgPickup, text: (s) => (s.ecgPickup ? 'On' : 'Off'), cmd: eegArtefactCmd.ecgPickup,
  },
];

export const EEG_WORDS = {
  heading: 'EEG device: artefacts',
  patient: 'Muscle activity (EMG) and eye blinks come from the patient: muscle tone (no neuromuscular block), arousal and the tube. They have no switch.',
};

/** The Devices sheet's EEG group: hidden while the engine reports no EEG device. `refresh` is called from the Devices
 *  sheet's own repaint (one registration per tab body). */
export function eegGroup(link: Link): { el: HTMLElement; refresh(): void } {
  const view = (): EegStateView | null => link.ctl.state?.eeg ?? null;
  const device = h('p', { class: 'eeg-device hint' });
  const pending = new Map<string, { on: boolean; until: number }>();
  const rows = EEG_ARTEFACTS.map((a) => {
    const state = h('span', { class: 'eeg-state hint' });
    const sw = toggle(a.label, false, (on) => {
      pending.set(a.id, { on, until: performance.now() + 3000 });
      const cmd = a.cmd(on);
      void link.send(cmd as never).then((r) => {
        if (!r.accepted) pending.delete(a.id);
        toast(r.accepted ? describeCommand(cmd) : `Not done: ${r.reason ?? 'refused'}`);
      });
    });
    return { a, sw, state, el: h('div', { class: 'row', 'data-artefact': a.id }, sw, state, h('span', { class: 'hint' }, a.hint)) };
  });
  const el = h('section', { class: 'eeg-group', 'data-group': 'eeg', 'aria-label': EEG_WORDS.heading },
    h('h3', {}, EEG_WORDS.heading), device, ...rows.map((r) => r.el), h('p', { class: 'hint' }, EEG_WORDS.patient));
  const draw = () => {
    const s = view();
    el.hidden = !s;
    if (!s) return;
    setText(device, EEG_DEVICES[s.model as EegModelId]?.spec.label ?? s.model);
    for (const r of rows) {
      const p = pending.get(r.a.id);
      const on = r.a.on(s);
      if (p && p.on !== on && performance.now() < p.until) continue;
      pending.delete(r.a.id);
      r.sw.set(on);
      setText(r.state, r.a.text(s));
    }
  };
  draw();
  return { el, refresh: draw };
}
