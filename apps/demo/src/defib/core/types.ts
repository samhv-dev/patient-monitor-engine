// The defibrillator window's core types (plan docs/plans/defibrillator-zoll-m2.md §3.1 C7, §4.2, piece F0). The same
// cut as the ventilator's cockpit core (apps/demo/src/vent/core/): what the patient, the record or another window can
// observe is ENGINE state (deviceStatus); what only the operator sees while moving (the cursor, the quick-key level, an
// open menu, a value being turned before it is pressed) is this core's. A face builds DOM from the core's view and
// reports presses; it holds no state of its own.
import type { DeviceEvent, M2Status } from '@pme/engine-core';

type Status = Extract<DeviceEvent, { type: 'deviceStatus' }>;
/** What the core reads from each `deviceStatus`: the defibrillator, the pacer, and the M2 block when present. */
export type DefibStatusIn = Pick<Status, 'defib' | 'pacer'> & { m2?: M2Status | undefined };

/**
 * A key's phase. `down` and `up` are the pointer's (the M2's press-and-hold Shock [G 2-4], [G 14-12] needs them, F1);
 * `click` is a completed activation (a pointer's click, Enter or Space), the only phase today's window acts on.
 */
export type Phase = 'down' | 'up' | 'click';

/** A command the window sends: everything but the id and `issuedBy`, which the driver stamps (as FollowerCommand). */
export type DefibCommand = { type: string } & Record<string, unknown>;

/** The device's mode: the M2's selector [G 2-4]; a generic model has none and is always Defib (today's window). */
export type DefibMode = 'off' | 'monitor' | 'defib' | 'pacer';

/** A value the Trim Knob turns before it is pressed [G 2-4], [G 2-16]. */
export interface PendingView {
  /** The field the value belongs to. */
  key: string;
  /** The turned value, or the setting's own while not turned. */
  value: number;
  changed: boolean;
}

export interface DefibView {
  defib: DefibStatusIn['defib'];
  pacer: DefibStatusIn['pacer'];
  /** The M2's state; null on any other model. */
  m2: M2Status | null;
  mode: DefibMode;
  /** The model's energy list, J; null = any 1–360 J (the generic model). */
  energiesJ: readonly number[] | null;
  /** The selected energy, then CHARGING or READY, and SYNC (instrument.ts defibReadout). */
  readout: string;
  /** The host's refusal of this window's last press, in the device's words (instrument.ts defibWords), or ''. */
  said: string;
  /** The quick-key level showing in this mode (0 = first), and its keys (the face's table) [G 2-13], [G 2-14]. */
  level: number;
  keys: readonly string[];
  /** The field the cursor is on, or null. */
  cursor: string | null;
  /** Open menus and windows, the innermost last; empty = the main screen. */
  menu: readonly string[];
  pending: PendingView | null;
}

/**
 * A field the Trim Knob can set: its values in the device's own steps (a list, as the M2's energies are [G A-2]),
 * the value it shows now, and the command a pressed value means (null: nothing to send).
 */
export interface Setting {
  values(v: DefibView): readonly number[];
  read(v: DefibView): number;
  command(value: number, v: DefibView): DefibCommand | null;
}

/** What pressing the Trim Knob on a field does: select a setting, open a window, or close the innermost one (its X). */
export type Field = { setting: Setting } | { menu: string } | { close: true };

/** A face's key → command table entry: the command a phase of that key sends, or null. */
export type KeyMap = (phase: Phase, v: DefibView) => DefibCommand | null;

export interface DefibFaceSpec {
  id: string;
  label: string;
  /**
   * The quick-key levels per mode, each the keys of one level (five slots on the M2 [G 2-13]). A key named `more`
   * goes to the next level and `back` to the previous [G 2-14]. A mode with no entry has no quick keys.
   */
  levels: Partial<Record<DefibMode, ReadonlyArray<ReadonlyArray<string>>>>;
  /** Every key that sends a command, by name. The core's own keys (`more`, `back`, `menu`, `knob`) are not listed. */
  keys: Readonly<Record<string, KeyMap>>;
  /** The window the Menu button opens [G 2-4]; absent: the face has no Menu button. */
  menuRoot?: string;
  /** The fields the Trim Knob's cursor travels around, in order, on the screen showing (the innermost menu's, or the main one's). */
  cursor?: (v: DefibView) => readonly string[];
  fields?: Readonly<Record<string, Field>>;
  /**
   * Wall-clock ms after which a selected value that was not pressed is dropped, counted from the selection and again
   * from each turn (as the ventilator's pending.ts); null = never. The M2's guide gives no such time ([G 2-4], [G 2-16]
   * read): F1 sets it as a marked choice.
   */
  revertMs: number | null;
}

/** The window's end of the wire: how a command goes out, and what comes back. */
export interface DefibDriver {
  /** A fresh command id. The core notes it as its own BEFORE `send`, so an ack the send answers at once is not missed. */
  newId(): string;
  send(c: DefibCommand, id: string): void;
  /** Every `deviceStatus` of this window's own engine. */
  onStatus(fn: (s: DefibStatusIn) => void): () => void;
  /** The host's ack of a command (by id). */
  onAck(fn: (commandId: string, accepted: boolean, reason?: string) => void): () => void;
}
