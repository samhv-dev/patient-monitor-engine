// A device's name as a person reads it, one for every place that shows it (the Room page, the Log, the Labs sheet, the
// pump tablet's bag list, the instructor's cards and the Debrief): the name typed over it in Room setup, else its role
// and its number among this session's devices of that role, in the order the host first heard of each. A device key
// is never shown.
import type { Role } from '@pme/controller';

/** The roles whose devices act on the patient, each numbered on its own. */
export type DeviceKind = 'learner' | 'pump' | 'defib';
export const DEVICE_WORDS: Readonly<Record<DeviceKind, string>> = { learner: 'Learner remote', pump: 'Pump tablet', defib: 'Defibrillator window' };
/** The device keys of each kind in the order first heard of: the n-th reads "<the kind's word> n". */
export type DeviceOrder = Partial<Record<DeviceKind, string[]>>;

export const kindOf = (role: Role): DeviceKind | null => (role === 'learner' || role === 'pump' || role === 'defib' ? role : null);

/** `key`'s number among its kind, the next one if it is new (`order` keeps it). */
export function numberOf(order: DeviceOrder, kind: DeviceKind, key: string): number {
  const keys = (order[kind] ??= []);
  if (!keys.includes(key)) keys.push(key);
  return keys.indexOf(key) + 1;
}

/** The name a person reads: `given` (Room setup's), else the kind's word and the device's number. */
export function deviceLabel(order: DeviceOrder, kind: DeviceKind, key: string, given: string | null): string {
  const n = numberOf(order, kind, key); // numbered even when named, so clearing the name brings back a stable number
  return given ?? `${DEVICE_WORDS[kind]} ${n}`;
}

/** The number-name a kept order holds for `key`, without numbering it (a saved record is read, never written), or null. */
export function keptLabel(order: DeviceOrder | undefined, kind: DeviceKind, key: string): string | null {
  const i = order?.[kind]?.indexOf(key) ?? -1;
  return i < 0 ? null : `${DEVICE_WORDS[kind]} ${i + 1}`;
}
