// The generic defibrillator face (plan defibrillator-zoll-m2.md §4.2, piece F0): today's window (Room plan R5, R5d),
// moved onto the core with no change in what it shows or sends. The readout (the energy, then CHARGING or READY, and
// SYNC) on the stage; Charge and Shock, always enabled (the host's device decides, Q5 ruled 5 November), with the
// device's words for a refusal under them, in the bar. A press goes once; a lost one is pressed again, as on the device.
// It has no quick keys, no menu and no Trim Knob. Each key reports its pointer-down and pointer-up to the core as well
// as its click (the M2's press-and-hold Shock needs the phases, F1); the generic table sends on the click only.
// In a `zoll-m2` room, until F1 registers the M2's own face, this face is shown with the M2's energy list and a plain
// line saying so.
import { button, h, setText } from '../../../app/ui.ts';
import type { DefibCore } from '../../core/core.ts';
import type { DefibCommand, DefibFaceSpec, Phase } from '../../core/types.ts';

const press = (action: 'charge' | 'shock') => (phase: Phase): DefibCommand | null => (phase === 'click' ? { type: 'applyEvent', event: { kind: 'defib', action } } : null);

export const GENERIC_SPEC: DefibFaceSpec = {
  id: 'generic',
  label: 'Generic defibrillator',
  levels: {},
  keys: { charge: press('charge'), shock: press('shock') },
  revertMs: null, // no Trim Knob
};

/** "1–10, 15, 20, …": a list with its consecutive runs folded (as m2-vocabulary.ts writes it in a refusal). */
function listText(xs: readonly number[]): string {
  const out: string[] = [];
  for (let i = 0; i < xs.length; ) {
    let j = i;
    while (j + 1 < xs.length && (xs[j + 1] as number) === (xs[j] as number) + 1) j++;
    out.push(j - i >= 2 ? `${xs[i]}–${xs[j]}` : xs.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

export interface FaceMount {
  /** Where today's window put its parts: the readout on the stage, the keys in the bar. */
  stage: HTMLElement;
  bar: HTMLElement;
}

export const genericFace = {
  spec: GENERIC_SPEC,
  mount(core: DefibCore, at: FaceMount): { stop(): void } {
    const readout = h('p', { class: 'defib-readout', role: 'status', 'aria-label': 'Defibrillator' });
    at.stage.append(readout);
    const said = h('p', { class: 'defib-said', role: 'status', 'aria-live': 'polite' });
    const key = (label: string, name: 'charge' | 'shock', cls?: string) => {
      const b = button(label, () => void core.press(name, 'click'), cls);
      b.addEventListener('pointerdown', () => void core.press(name, 'down'));
      b.addEventListener('pointerup', () => void core.press(name, 'up'));
      return b;
    };
    const keys = h('div', { class: 'defib-keys', role: 'group', 'aria-label': 'Defibrillator' }, key('Charge', 'charge'), key('Shock', 'shock', 'primary'));
    at.bar.append(keys, said);
    let note: HTMLElement | null = null; // made only in an M2 room, so a generic room's window is today's to the element
    const draw = () => {
      const v = core.view();
      setText(readout, v.readout);
      setText(said, v.said);
      if (v.m2 && !note) at.bar.append((note = h('p', { class: 'defib-note' })));
      if (note) {
        note.hidden = !v.m2;
        setText(note, v.m2 ? `ZOLL M2: its own face is not built yet; this is the generic window. Energies ${listText(v.energiesJ ?? [])} J.` : '');
      }
    };
    const off = core.onChange(draw);
    return {
      stop() {
        off();
        readout.remove(); // as today's window: the keys stay in the page's bar
      },
    };
  },
};
