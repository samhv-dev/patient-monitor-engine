// The defibrillator window's core (plan docs/plans/defibrillator-zoll-m2.md §3.1 C7, §4.2, piece F0): the logic every
// face needs, knowing nothing of any look, as the ventilator's cockpit core is for its faces. It holds the view model
// read from this window's own engine (`deviceStatus`: the defibrillator, the pacer, the M2 block when present), the
// Trim Knob's cursor and pending value, the quick-key level per mode, the menu stack, and the refusal last said; it turns
// `press(key, phase)` into the face table's command and sends it through the driver. A face draws `view()` and reports
// presses and turns; it holds nothing.
//
// The core's own keys, on a click only: `more` / `back` (the next or previous quick-key level [G 2-14]), `menu` (opens
// the face's menu root; Home inside a menu [G 2-4]), `knob` (the Trim Knob's press [G 2-4], [G 2-16]: sends a turned
// value, else acts on the field under the cursor). `turn(steps)` is the knob's rotation: it turns a selected value, else
// moves the cursor around the screen's fields, both ways [G 2-16].
import { M2_ENERGIES_J } from '@pme/engine-core';
import { defibReadout, defibWords } from '../../app/instrument.ts';
import { createPending } from './pending.ts';
import type { DefibCommand, DefibDriver, DefibFaceSpec, DefibMode, DefibStatusIn, DefibView, Phase } from './types.ts';

export interface DefibCore {
  readonly face: DefibFaceSpec;
  view(): DefibView;
  /** A key's phase from the face; returns the command sent, or null. */
  press(key: string, phase: Phase): DefibCommand | null;
  /** The Trim Knob turned by `steps` detents (negative: counterclockwise). */
  turn(steps: number): void;
  /** After every change of the view (a status, a press, a turn, an ack). */
  onChange(fn: () => void): () => void;
  stop(): void;
}

export interface DefibCoreOptions {
  /** The wall clock the pending value's time-out counts on (ms). */
  now?: () => number;
}

export function createDefibCore(driver: DefibDriver, face: DefibFaceSpec, o: DefibCoreOptions = {}): DefibCore {
  let st: DefibStatusIn = { defib: null, pacer: null };
  let said = '';
  const sent = new Set<string>(); // this window's commands not yet answered
  const levels = new Map<DefibMode, number>(); // the quick-key level per mode [ENG: ui; each mode keeps its own, the guide says nothing]
  let menu: string[] = [];
  let cursor: string | null = null;
  const pending = createPending(o.now ?? (() => performance.now()), face.revertMs);
  const fns = new Set<() => void>();
  const changed = () => fns.forEach((fn) => fn());

  const modeOf = (s: DefibStatusIn): DefibMode => s.m2?.power.selector ?? 'defib';
  /** The view without the pending value (a Setting reads from this). */
  const base = (): DefibView => {
    const mode = modeOf(st);
    const rows = face.levels[mode] ?? [];
    const level = Math.min(levels.get(mode) ?? 0, Math.max(0, rows.length - 1));
    return {
      defib: st.defib, pacer: st.pacer, m2: st.m2 ?? null, mode,
      energiesJ: st.m2 ? M2_ENERGIES_J : null,
      readout: defibReadout(st.defib), said, level, keys: rows[level] ?? [], cursor, menu: [...menu], pending: null,
    };
  };
  const view = (): DefibView => {
    const v = base();
    return { ...v, pending: pending.view(v) };
  };

  const send = (c: DefibCommand): DefibCommand => {
    const id = driver.newId();
    sent.add(id);
    said = '';
    driver.send(c, id);
    return c;
  };
  const screen = (next: string[]) => {
    menu = next;
    cursor = null; // a new screen: the cursor starts again [ENG: ui]
  };
  const step = (by: number) => {
    const v = base();
    const rows = face.levels[v.mode] ?? [];
    levels.set(v.mode, Math.min(rows.length - 1, Math.max(0, v.level + by)));
  };
  const knob = (): DefibCommand | null => {
    const v = base();
    if (pending.key !== null) {
      const c = pending.confirm(v);
      return c ? send(c) : null;
    }
    const f = cursor !== null ? face.fields?.[cursor] : undefined;
    if (!f) return null;
    if ('setting' in f) pending.select(cursor as string, f.setting, v);
    else if ('menu' in f) screen([...menu, f.menu]);
    else screen(menu.slice(0, -1));
    return null;
  };

  const offStatus = driver.onStatus((s) => ((st = s), changed()));
  const offAck = driver.onAck((id, accepted, reason) => {
    if (!sent.delete(id)) return;
    said = accepted ? '' : defibWords(reason);
    changed();
  });

  return {
    face,
    view,
    press(key, phase) {
      let c: DefibCommand | null = null;
      const own = key === 'more' || key === 'back' || key === 'menu' || key === 'knob';
      if (own && phase === 'click') {
        if (key === 'more') step(1);
        else if (key === 'back') step(-1);
        else if (key === 'menu') screen(menu.length ? [] : face.menuRoot ? [face.menuRoot] : []);
        else c = knob();
      } else if (!own) {
        const map = face.keys[key];
        const want = map ? map(phase, base()) : null;
        if (want) c = send(want);
      }
      changed();
      return c;
    },
    turn(steps) {
      const v = base();
      if (pending.key !== null) pending.turn(steps, v);
      else {
        const ring = face.cursor?.(v) ?? [];
        if (ring.length && steps !== 0) {
          const at = cursor === null ? -1 : ring.indexOf(cursor);
          // from no cursor, the first turn lands on the first field clockwise or the last counterclockwise
          const i = at < 0 ? (steps > 0 ? steps - 1 : ring.length + steps) : at + steps;
          cursor = ring[((i % ring.length) + ring.length) % ring.length] as string;
        }
      }
      changed();
    },
    onChange(fn) {
      fns.add(fn);
      return () => void fns.delete(fn);
    },
    stop() {
      offStatus();
      offAck();
      fns.clear();
    },
  };
}
