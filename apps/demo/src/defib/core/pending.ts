// The Trim Knob's pending value (plan defibrillator-zoll-m2.md §4.2, §2.1 D16): select a field, turn the knob, press it
// to send [G 2-4], [G 2-16]. The turned value is held HERE, never in the engine, until the press.
// A copy of the ventilator's select-turn-press (apps/demo/src/vent/core/pending.ts), not a share: that one is typed on
// the ventilator's Cockpit and VentConfig (its target is a cfg patch, its steps a [min, max, step] range), and sharing
// it would mean changing the ventilator's code. The rules kept from it: the time-out counts from the selection and
// again from each turn, on the WALL clock (the resident's hands, not the patient's time); a press unchanged stores
// nothing. What differs: the values are the device's own list (the M2's energies [G A-2], its 2 mA steps [G 16-5]),
// a press yields a command instead of writing a cfg, and the time-out is the face's (null = never).
import type { DefibCommand, DefibView, PendingView, Setting } from './types.ts';

export interface Pending {
  view(v: DefibView): PendingView | null;
  select(key: string, s: Setting, v: DefibView): void;
  /** Turn by `steps` places in the setting's list (negative: down), stopping at its ends. */
  turn(steps: number, v: DefibView): void;
  /** The knob press: the command the turned value means (null if unchanged or none selected); the selection ends. */
  confirm(v: DefibView): DefibCommand | null;
  readonly key: string | null;
}

/** The place of `x` in `xs`, or of the nearest value (a status value off the list). */
const placeOf = (xs: readonly number[], x: number): number => {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (Math.abs((xs[i] as number) - x) < Math.abs((xs[best] as number) - x)) best = i;
  return best;
};

export function createPending(now: () => number, revertMs: number | null): Pending {
  let key: string | null = null;
  let setting: Setting | null = null;
  let value = 0;
  let changed = false;
  let at = 0;
  const live = () => {
    if (key !== null && revertMs !== null && now() - at >= revertMs) { key = null; setting = null; changed = false; }
    return key;
  };
  return {
    get key() { return live(); },
    view(v) {
      if (live() === null || !setting) return null;
      return { key: key as string, value: changed ? value : setting.read(v), changed };
    },
    select(k, s, v) {
      key = k;
      setting = s;
      value = s.read(v);
      changed = false;
      at = now();
    },
    turn(steps, v) {
      if (live() === null || !setting) return;
      const xs = setting.values(v);
      if (xs.length === 0) return;
      if (!changed) value = setting.read(v); // not turned yet: from the value the status shows now
      const i = Math.min(xs.length - 1, Math.max(0, placeOf(xs, value) + steps));
      const next = xs[i] as number;
      if (next !== value) { value = next; changed = true; }
      at = now(); // a turn is a change, even one the list's end stops
    },
    confirm(v) {
      if (live() === null || !setting) return null;
      const c = changed ? setting.command(value, v) : null;
      key = null;
      setting = null;
      changed = false;
      return c;
    },
  };
}
