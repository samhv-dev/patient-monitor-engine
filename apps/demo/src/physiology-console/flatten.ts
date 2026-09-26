// Stage 7x: flatten the truth tree and the engine's summary events into one map of dotted paths → leaf values.
// Paths: the truth tree as-is (`hemo.circ.p.rSys`), events under `ev.<type>.` (`ev.circ.svr`), monitor numerics under
// `mon.<id>` (the value the monitor shows). Arrays of objects are keyed by `id`/`drugId`/`agent` when they carry one
// (7g's `drugs` rows → `ev.drugs.drugs.propofol.ce`), by index otherwise — as the engine's pruneTruth does.
import type { EngineEvent } from '@pme/engine-core';

export type Leaf = number | boolean | string | null;
export type Leaves = Map<string, Leaf>;

/** Arrays longer than this inside events are histories, not values. */
const MAX_EVENT_ARRAY = 16;
/** Event leaves that are timestamps or counters, not physiology. */
const EVENT_SKIP_KEYS = new Set(['t', 'tick', 'seq']);
/**
 * Event types that are not folded: discrete marks (tones, markers, alarms, atrial activations), the alarm manager's
 * configuration, and `truth` itself (ingested whole by the model). Every other event type, including those of stages
 * not merged yet, is folded automatically.
 */
export const SKIP_EVENTS: ReadonlySet<string> = new Set(['tone', 'toneCancel', 'marker', 'alarm', 'atrial', 'alarmStatus', 'truth', 'measurement']);

/** The key of one array element: its `id`/`drugId`/`agent` when it has one (a drug row, a lung unit), else the index. */
function keyOf(x: unknown, i: number): string {
  if (x === null || typeof x !== 'object') return String(i);
  const o = x as { id?: unknown; drugId?: unknown; agent?: unknown };
  const id = o.id ?? o.drugId ?? o.agent;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : String(i);
}

export function flatten(v: unknown, prefix: string, out: Leaves, skipKeys?: ReadonlySet<string>, depth = 0): void {
  if (v === null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
    out.set(prefix, v);
    return;
  }
  if (typeof v !== 'object' || depth > 12 || ArrayBuffer.isView(v)) return;
  if (Array.isArray(v)) {
    if (v.length > MAX_EVENT_ARRAY) return;
    v.forEach((x, i) => flatten(x, prefix ? `${prefix}.${keyOf(x, i)}` : keyOf(x, i), out, skipKeys, depth + 1));
    return;
  }
  for (const [k, x] of Object.entries(v)) {
    if (skipKeys?.has(k)) continue;
    flatten(x, prefix ? `${prefix}.${k}` : k, out, skipKeys, depth + 1);
  }
}

/**
 * Fold one engine event into `out`. Each event of a type REPLACES that type's previous leaves (`ev.<type>.*` is
 * cleared first), so a drug that stopped or an optional field that went away leaves the page. Returns false when the
 * event type is not folded.
 */
export function foldEvent(e: EngineEvent, out: Leaves): boolean {
  if (e.type === 'measurement') {
    for (const [id, m] of Object.entries(e.values)) if (m) out.set(`mon.${id}`, m.value);
    return true;
  }
  if (SKIP_EVENTS.has(e.type)) return false;
  const { type, ...rest } = e as { type: string } & Record<string, unknown>;
  const prefix = `ev.${type}`;
  for (const k of out.keys()) if (k.startsWith(`${prefix}.`)) out.delete(k);
  flatten(rest, prefix, out, EVENT_SKIP_KEYS);
  return true;
}
