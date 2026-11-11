// EEG artefacts (EEG plan E12; the owner's Q9: the instructor's artefact controls belong to E12, not to the Devices
// sheet, which two other plans are reshaping). The Instructor page's "EEG" sheet: one switch per artefact the engine has
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
import type { PanelCtx } from './ctx.ts';

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
  off: 'No EEG device is on: choose one in Room setup',
  patient: 'Muscle activity (EMG) and eye blinks come from the patient: muscle tone (no neuromuscular block), arousal and the tube. They have no switch.',
};

export function eegTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const view = (): EegStateView | null => link.ctl.state?.eeg ?? null;
  const device = h('p', { class: 'eeg-device', role: 'status' });
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
  const draw = () => {
    const s = view();
    setText(device, s ? (EEG_DEVICES[s.model as EegModelId]?.spec.label ?? s.model) : EEG_WORDS.off);
    for (const r of rows) {
      r.sw.disabled = !s;
      const p = pending.get(r.a.id);
      const on = s ? r.a.on(s) : false;
      if (p && p.on !== on && performance.now() < p.until) continue;
      pending.delete(r.a.id);
      r.sw.set(on);
      setText(r.state, s ? r.a.text(s) : '');
    }
  };
  c.onRefresh(draw);
  draw();
  return h('div', {}, h('h3', {}, 'EEG artefacts'), device, ...rows.map((r) => r.el), h('p', { class: 'hint' }, EEG_WORDS.patient));
}
