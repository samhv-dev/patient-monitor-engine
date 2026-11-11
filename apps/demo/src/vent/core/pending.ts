// Select-turn-press (plan vent-skin-edp-ts.md §2.4, §4.3; built in V0 for the EDP-TS face of V1, which the Hamilton
// face never uses): touch a setting's key, turn the knob, press it to apply. The turned value is held HERE, never in
// `cfg`, until the press, which goes through the cockpit's `set` (the face's range and step).
// §2.4 [M p. 35]: "A selection with no change for 15 s is dropped; a change not confirmed within 15 s returns to the
// old value". Read as: the time counts from the selection, and again from each turn (each turn is a change).
// Open for V1 against the device: whether that time is the wall clock or the simulator's (the clock is injected),
// and Ctrl's larger and smaller steps (`turn` takes a step count; a face with Ctrl passes its own multiple).
import type { Cockpit } from './cockpit.ts';
import type { NumKey } from './types.ts';

export const REVERT_MS = 15_000; // §2.4 [M p. 35]

export interface Pending {
  /** The selected setting, or null (none selected, or dropped by the timer). */
  readonly key: NumKey | null;
  /** The value the knob shows: the turned value, or the setting's own while not turned. */
  readonly value: number | null;
  /** True once the knob has turned the value away from the setting. */
  readonly changed: boolean;
  select(key: NumKey): void;
  /** Turn by `steps` of the face's step for the key (negative: down), within the face's range. */
  turn(steps: number): void;
  /** The knob press: the turned value goes to `cfg` through `set`; returns the value stored, or null with nothing selected. */
  confirm(): number | null;
  /** Esc: the selection and its turned value are dropped. */
  cancel(): void;
}

export function createPending(c: Cockpit, now: () => number = () => performance.now(), revertMs = REVERT_MS): Pending {
  let key: NumKey | null = null;
  let value = 0;
  let changed = false;
  let at = 0;
  const live = () => {
    if (key !== null && now() - at >= revertMs) { key = null; changed = false; }
    return key;
  };
  const range = (k: NumKey) => c.face.ranges[k] ?? ([-Infinity, Infinity, 1] as const);
  return {
    get key() { return live(); },
    get value() { const k = live(); return k === null ? null : changed ? value : c.cfg[k]; },
    get changed() { return live() !== null && changed; },
    select(k) { key = k; value = c.cfg[k]; changed = false; at = now(); },
    turn(steps) {
      const k = live();
      if (k === null) return;
      const [min, max, step] = range(k);
      value = Math.min(max, Math.max(min, Math.round((value + steps * step) / step) * step));
      changed = true;
      at = now();
    },
    confirm() {
      const k = live();
      if (k === null) return null;
      const v = changed ? c.set(k, value) : c.cfg[k];
      key = null;
      changed = false;
      return v;
    },
    cancel() { key = null; changed = false; },
  };
}
