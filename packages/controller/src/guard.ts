// Runtime half of the "raw samples never cross the wire" guarantee (brief §3.7, §7.5), plus envelope
// validation for untrusted input (relay, postMessage from other frames, WebSocket, DataChannel).
import { INSTRUMENTS, NOTE_EVENTS, type WireMessage } from './protocol.ts';
import type { PkRoute } from '@pme/engine-core';

export const WIRE_LIMITS = {
  /** Largest serialised message accepted anywhere (an L1-only snapshot is ≈ 7 KB) [ENG: network]. */
  maxBytes: 256 * 1024,
  /** Longest all-numeric array allowed in commands and events (0.13 s of ECG at 500 Hz) [ENG: network]. */
  eventNumericArray: 64,
  /** Longest all-numeric array allowed in a snapshot (the QRS detector history is 128) [ENG: network]. */
  snapshotNumericArray: 1024,
  /** Deepest nesting accepted (a real snapshot is 10 deep) [ENG: network]. */
  maxDepth: 32,
  /** Most values in one message (a real snapshot holds ≈ 5 000) [ENG: network]. */
  maxNodes: 50_000,
  /** Longest `note` command text, in characters (plan instructor-peer-role.md §2). */
  noteChars: 500,
} as const;

/**
 * A `vent` body's limits (plan room-and-instruments.md R8a). `cmds`: the most commands the ventilator link core builds on
 * one tick [ENG: network; measured on every profile by test/guard-vent.test.ts]: the profile's stand-in targets once (4 for the
 * two shock profiles, `profiles.ts` STAND_INS), the airway on a circuit change and the tick's VentFrame — 6, not the
 * plan's 4 ("3 plus a spare" counted one stand-in), which would drop the first tick of anaphylaxis and air embolism.
 * `bytes`: a `vent` body's largest JSON [ENG: network; that 6-command first tick is 0.8 KB, a steady tick's `cmds` 0.25 KB].
 */
export const VENT_LIMITS = { cmds: 6, bytes: 4 * 1024, batch: 16 } as const;
// `batch` (R8c): the most `cmds` one relay-port message packs [ENG: network; at ×8 the cockpit runs 8 ticks in 20 ms of wall time;
// 16 holds two windows, an animation frame that came late]; `bytes` bounds it too (a steady tick is 0.25 KB).

/**
 * A learner's `prep` and `infusion` commands (plan learner-action-remote.md §4 D2): `components`, the most products one
 * preparation draws [ENG: network; a drug, its reconstitution and an admixture are 3]; ids are a formulary or drug-library
 * id (camelCase today) or a device's own preparation id.
 */
export const PREP_LIMITS = { components: 8 } as const;
const PREP_ID_RE = /^[a-z0-9]{8}$/;
const ITEM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const UNIT_RE = /^[A-Za-z%/.]{1,16}$/;
/** The routes a preparation is given by: the drug model's (engine-core PkRoute) less `inh`, which is a vaporiser's. */
const PREP_ROUTES: ReadonlySet<unknown> = new Set<PkRoute>(['iv', 'io', 'im', 'neb', 'sc', 'perineural', 'central']);

/** An instructor's PIN on the wire: 4 to 8 ASCII digits (plan §1). */
export const PIN_RE = /^[0-9]{4,8}$/;

/** A device's own key on a viewer's hello: 8 to 16 lower-case ASCII letters or digits (plan room-and-instruments.md §4 D1). */
export const DEVICE_RE = /^[a-z0-9]{8,16}$/;
const SHOWS: ReadonlySet<unknown> = new Set(INSTRUMENTS);

/** Keys that only a waveform leak would use. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['samples', 'sampleData', 'waveform', 'buffer']);

export class WireSafetyError extends Error {
  override readonly name = 'WireSafetyError';
}

/** UTF-8 length of a string, at most 3 bytes per UTF-16 unit (an over-estimate for surrogate pairs; fine for a budget). */
function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
  }
  return n;
}

/**
 * One ITERATIVE pass over a message (the recursive walk overflowed the stack on 12 000 nested objects in a 72 KB hello
 * and took the relay down). Returns a reason for the first sample-like payload and, with `budget`, for nesting deeper
 * than maxDepth, more than maxNodes values or more than maxBytes of encoded size — the same limits whether the message
 * arrived as a JSON string or as a structured-clone object.
 */
function inspect(m: unknown, limit: number, budget: boolean): string | null {
  const seen = new Set<object>();
  const stack: Array<[unknown, string, number]> = [[m, 'message', 0]];
  let nodes = 0;
  let bytes = 0;
  const over = () => `more than ${WIRE_LIMITS.maxBytes} bytes`;
  while (stack.length > 0) {
    const [v, path, depth] = stack.pop() as [unknown, string, number];
    if (budget && ++nodes > WIRE_LIMITS.maxNodes) return `more than ${WIRE_LIMITS.maxNodes} values`;
    if (v === null || typeof v !== 'object') {
      if (budget) bytes += typeof v === 'string' ? utf8Bytes(v) + 2 : 8;
      if (bytes > WIRE_LIMITS.maxBytes) return over();
      continue;
    }
    if (depth > WIRE_LIMITS.maxDepth) return `${path}: nested deeper than ${WIRE_LIMITS.maxDepth}`;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return `${path}: binary data (${v.constructor.name})`;
    if (seen.has(v)) continue;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > limit && v.every((x) => typeof x === 'number')) return `${path}: numeric array of ${v.length} > ${limit}`;
      for (let i = v.length - 1; i >= 0; i--) stack.push([v[i], `${path}[${i}]`, depth + 1]);
      continue;
    }
    const entries = Object.entries(v);
    for (const [k] of entries) if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: forbidden key`;
    for (let i = entries.length - 1; i >= 0; i--) {
      const [k, x] = entries[i] as [string, unknown];
      if (budget) bytes += utf8Bytes(k) + 4;
      stack.push([x, `${path}.${k}`, depth + 1]);
    }
    if (bytes > WIRE_LIMITS.maxBytes) return over();
  }
  return null;
}

const numericLimit = (m: WireMessage) => (m.kind === 'snapshot' ? WIRE_LIMITS.snapshotNumericArray : WIRE_LIMITS.eventNumericArray);

/** Returns a description of the first sample-like payload in `m`, or null when the message is clean. */
export function findSampleLeak(m: WireMessage): string | null {
  return inspect(m, numericLimit(m), false);
}

/** The sample guard plus the size, depth and value budgets (every receiving transport applies it). */
export function wireBudgetError(m: WireMessage): string | null {
  return inspect(m, numericLimit(m), true);
}

/** Throws WireSafetyError when `m` carries samples. Every transport calls this in send(). */
export function assertWireSafe(m: WireMessage): void {
  const leak = findSampleLeak(m);
  if (leak) throw new WireSafetyError(`refusing to send sample data: ${leak}`);
}

const KINDS = new Set(['hello', 'command', 'ack', 'event', 'snapshot', 'grant', 'vent']);
const ROLES = new Set(['host', 'controller', 'viewer', 'instructor', 'ventilator', 'defib', 'learner']);
/**
 * The roles a hello may name an instrument and a device key with: a learner's follower, the defibrillator window (R5c) and
 * the learner action remote (learner-action-remote.md §4 D1: its device key is its `by`).
 */
const SHOWS_WITH: ReadonlySet<unknown> = new Set(['viewer', 'defib', 'learner']);
/** The roles whose hello proves a PIN (the instructor's, or for `learner` the learner PIN); the last two must carry one. */
const PIN_WITH: ReadonlySet<unknown> = new Set(['instructor', 'ventilator', 'learner']);

const isObj = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
const TIME_ACTIONS: ReadonlySet<unknown> = new Set(['pause', 'resume', 'scale']);
const CIRCUITS: ReadonlySet<unknown> = new Set(['connected', 'disconnected']);
/** One command a ventilator's `cmds` may carry (R8a): its VentFrame, the airway, a stand-in target; nothing else. */
function ventCommandOk(c: unknown): boolean {
  if (!isObj(c) || typeof c.id !== 'string' || typeof c.issuedBy !== 'string') return false;
  if (c.type === 'externalDrive') return c.source === 'ventilator' && isObj(c.frame);
  if (c.type === 'applyEvent') return isObj(c.event) && c.event.kind === 'airway';
  return c.type === 'setTarget' && typeof c.variable === 'string' && typeof c.value === 'number';
}
/** Whether a `vent` body is one of the ventilator link's messages, within VENT_LIMITS (plan R8a). */
const cmdsOk = (b: unknown): boolean =>
  isObj(b) && b.v === 1 && b.kind === 'cmds' && Number.isInteger(b.tick) && Array.isArray(b.cmds) && b.cmds.length <= VENT_LIMITS.cmds && b.cmds.every(ventCommandOk);
const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const isPos = (x: unknown) => isNum(x) && (x as number) > 0;
const isId = (x: unknown) => typeof x === 'string' && ITEM_ID_RE.test(x);
/** The value types of a `prep` or `infusion` command (§4 D2), whoever sends it; which fields a learner may send is learnerMay's. */
function prepBodyOk(b: Record<string, unknown>): boolean {
  if (b.type === 'infusion') return b.action === 'set' && isId(b.drugId) && isNum(b.rateMlH) && (b.rateMlH as number) >= 0;
  if (b.action === 'stage') {
    const p = b.prep;
    if (!isObj(p) || typeof p.id !== 'string' || !PREP_ID_RE.test(p.id)) return false;
    if (!Array.isArray(p.components) || p.components.length === 0 || p.components.length > PREP_LIMITS.components) return false;
    if (!p.components.every((k) => isObj(k) && isId(k.productId) && isPos(k.amount) && typeof k.unit === 'string' && UNIT_RE.test(k.unit))) return false;
    // 0 mL: a powder reconstituted with its label's own volume and not diluted further (formulary/prepare.ts, L4)
    if (p.diluent !== undefined && !(isObj(p.diluent) && isId(p.diluent.id) && isNum(p.diluent.volumeMl) && (p.diluent.volumeMl as number) >= 0)) return false;
    return p.container === undefined || isId(p.container);
  }
  if (typeof b.prepId !== 'string' || !PREP_ID_RE.test(b.prepId)) return false;
  switch (b.action) {
    case 'discard':
      return true;
    case 'deliver':
      return (b.volumeMl === 'all' || isPos(b.volumeMl)) && PREP_ROUTES.has(b.route) && (b.overS === undefined || (isNum(b.overS) && (b.overS as number) >= 0));
    case 'infuse':
      return isPos(b.rateMlH);
    case 'notice': // L9: the instructor's notice names the learner's device key
      return typeof b.by === 'string' && DEVICE_RE.test(b.by);
    default:
      return false;
  }
}
function ventBodyOk(b: unknown): boolean {
  if (!isObj(b) || b.v !== 1) return false;
  switch (b.kind) {
    case 'cmds':
      if (!cmdsOk(b)) return false;
      break;
    case 'batch': // R8c: the relay port's `cmds` of 20 ms, each one a valid `cmds`
      if (!Array.isArray(b.msgs) || b.msgs.length === 0 || b.msgs.length > VENT_LIMITS.batch || !b.msgs.every(cmdsOk)) return false;
      break;
    case 'lungState':
      if (!isObj(b.ev) || b.ev.type !== 'lungState') return false;
      break;
    case 'clock':
    case 'run':
      if (!Number.isInteger(b.ventTick)) return false;
      break;
    case 'time':
      if (!TIME_ACTIONS.has(b.action) || (b.value !== undefined && typeof b.value !== 'number')) return false;
      break;
    case 'control':
      if ((b.patch !== undefined && !isObj(b.patch)) || (b.circuit !== undefined && !CIRCUITS.has(b.circuit)) || (b.profile !== undefined && typeof b.profile !== 'string')) return false;
      break;
    case 'settings':
      if (!isObj(b.cfg) || (b.hidden !== undefined && typeof b.hidden !== 'boolean')) return false;
      if (b.measured !== undefined && !(isObj(b.measured) && isNum(b.measured.RR) && isNum(b.measured.VTE))) return false;
      break;
    default:
      return false;
  }
  return utf8Bytes(JSON.stringify(b)) <= VENT_LIMITS.bytes;
}

/**
 * Parses and validates untrusted input (a JSON string or a structured-clone object). Returns null for anything
 * that is not a well-formed v1 WireMessage, is too large, or carries samples.
 */
export function parseWireMessage(data: unknown): WireMessage | null {
  let o: unknown = data;
  if (typeof data === 'string') {
    if (data.length > WIRE_LIMITS.maxBytes) return null;
    try {
      o = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (o === null || typeof o !== 'object') return null;
  const m = o as Record<string, unknown>;
  if (m.v !== 1 || typeof m.session !== 'string' || typeof m.from !== 'string') return null;
  if (!Number.isInteger(m.seq) || (m.seq as number) < 1 || typeof m.sentAt !== 'number') return null;
  if (typeof m.kind !== 'string' || !KINDS.has(m.kind)) return null;
  switch (m.kind) {
    case 'hello':
      if (!ROLES.has(m.role as string)) return null;
      if (m.pin !== undefined && (!PIN_WITH.has(m.role) || typeof m.pin !== 'string' || !PIN_RE.test(m.pin))) return null;
      // R8a: a device that drives the patient proves the PIN; L3 (LQ1): the learner remote proves the learner PIN
      if ((m.role === 'ventilator' || m.role === 'learner') && m.pin === undefined) return null;
      if (m.show !== undefined && (!SHOWS_WITH.has(m.role) || !SHOWS.has(m.show))) return null;
      if (m.device !== undefined && (!SHOWS_WITH.has(m.role) || typeof m.device !== 'string' || !DEVICE_RE.test(m.device))) return null;
      break;
    case 'command': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.id !== 'string' || typeof b.type !== 'string' || typeof b.issuedBy !== 'string') return null;
      if (b.type === 'note' && ((b.kind !== 'note' && b.kind !== 'marker') || typeof b.text !== 'string' || b.text.length > WIRE_LIMITS.noteChars)) return null;
      if (b.type === 'note' && b.ev !== undefined && !(NOTE_EVENTS as readonly unknown[]).includes(b.ev)) return null; // a known tag only
      if ((b.type === 'prep' || b.type === 'infusion') && !prepBodyOk(b)) return null; // L3: a learner's shapes, typed
      break;
    }
    case 'ack':
      if (typeof m.commandId !== 'string' || typeof m.accepted !== 'boolean' || typeof m.tick !== 'number') return null;
      break;
    case 'grant':
      if (typeof m.to !== 'string' || typeof m.granted !== 'boolean' || (m.reason !== undefined && typeof m.reason !== 'string')) return null;
      break;
    case 'event':
      if (!Array.isArray(m.body) || !m.body.every((e) => e !== null && typeof e === 'object' && typeof (e as { type?: unknown }).type === 'string')) return null;
      break;
    case 'snapshot': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.schema !== 'string' || typeof b.tick !== 'number') return null;
      break;
    }
    case 'vent':
      if ((m.to !== undefined && typeof m.to !== 'string') || !ventBodyOk(m.body)) return null;
      break;
  }
  const msg = o as WireMessage;
  return wireBudgetError(msg) ? null : msg;
}
