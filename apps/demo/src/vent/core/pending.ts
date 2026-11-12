// Select-turn-press (plan vent-skin-edp-ts.md §2.4, §4.3; built in V0 for the EDP-TS face of V1, which the Hamilton
// face never uses): touch a setting's key, turn the knob, press it to apply. The turned value is held HERE, never in
// `cfg`, until the press.
// research/57 O-03, O-04 [M p. 35]: "a key touched with no change for 15 s leaves selection"; "a changed value not
// confirmed within 15 s returns to the previous value". Read as: the time counts from the selection, and again from
// each turn (each turn is a change).
// V1 rulings (brief 154): (1) the 15 s are WALL-clock seconds at every simulation speed — the timeout belongs to the
// resident's hands, not to the patient's time — so the default clock is `performance.now()` and a face never passes
// the simulator's; (2) Ctrl's larger and smaller steps follow research/57's step column: the face passes the step
// count (`turn(10)` for Ctrl + Oxygen, row H-22).
// V1 generalises the selection from a cfg key to a `Setting` in the device's units (a Ti that is a flow in VC, an I:E
// that is an inspiratory time) and to a `Target`, the live cfg or a draft (a mode's settings before its start).
import type { Cockpit } from './cockpit.ts';
import type { NumKey, Range, Setting, Target } from './types.ts';

export const REVERT_MS = 15_000; // research/57 O-03, O-04 [M p. 35]

export interface Pending {
  /** The selected setting's key (a cfg key, or the id a face gave its Setting), or null (none, or dropped by the timer). */
  readonly key: string | null;
  /** The value the knob shows: the turned value, or the setting's own while not turned. */
  readonly value: number | null;
  /** True once the knob has turned the value away from the setting. */
  readonly changed: boolean;
  /** A cfg key (the face's range for it), or a face's Setting with its id; `target` defaults to the live cfg. */
  select(key: NumKey): void;
  select(id: string, setting: Setting, target?: Target): void;
  /**
   * Turn by `steps` of the setting's step (negative: down), within its range. Returns the end of the range the turn
   * was stopped at ('lo' or 'hi'), or null when it was not stopped.
   */
  turn(steps: number): 'lo' | 'hi' | null;
  /** The knob press: the turned value goes to the target; returns the value stored, or null with nothing selected. */
  confirm(): number | null;
  /** Esc: the selection and its turned value are dropped. */
  cancel(): void;
}

/** The number of decimals of a step (0.01 → 2), so a turned value carries no binary fraction (0.1 + 0.2). */
const decimals = (step: number): number => {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};
export const onStep = (v: number, step: number): number => Number((Math.round(v / step) * step).toFixed(decimals(step)));

export function createPending(c: Cockpit, now: () => number = () => performance.now(), revertMs = REVERT_MS): Pending {
  let key: string | null = null;
  let setting: Setting | null = null;
  let target: Target | null = null;
  let value = 0;
  let changed = false;
  let at = 0;
  const live = () => {
    if (key !== null && now() - at >= revertMs) { key = null; changed = false; }
    return key;
  };
  const liveCfg: Target = { cfg: () => c.cfg, apply: (p) => c.write(p) };
  const ofKey = (k: NumKey): Setting => {
    const r: Range = c.face.ranges[k] ?? [-Infinity, Infinity, 1];
    return { range: () => r, read: (cfg) => cfg[k], write: (v) => ({ [k]: v }) };
  };
  const current = () => (setting && target ? setting.read(target.cfg()) : 0);
  return {
    get key() { return live(); },
    get value() { return live() === null ? null : changed ? value : current(); },
    get changed() { return live() !== null && changed; },
    select(k: string, s?: Setting, t?: Target) {
      key = k;
      setting = s ?? ofKey(k as NumKey);
      target = t ?? liveCfg;
      value = current();
      changed = false;
      at = now();
    },
    turn(steps) {
      if (live() === null || !setting || !target) return null;
      const [min, max, step] = setting.range(target.cfg());
      const want = value + steps * step;
      const stop = want < min - 1e-9 ? 'lo' : want > max + 1e-9 ? 'hi' : null;
      const v = onStep(Math.min(max, Math.max(min, want)), step);
      if (v !== value) { value = v; changed = true; }
      at = now(); // a turn is a change, even one the range stops
      return stop;
    },
    confirm() {
      if (live() === null || !setting || !target) return null;
      if (changed) target.apply(setting.write(value, target.cfg()));
      const v = setting.read(target.cfg());
      key = null;
      changed = false;
      return v;
    },
    cancel() { key = null; changed = false; },
  };
}
