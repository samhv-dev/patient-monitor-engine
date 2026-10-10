// Runtime half of the "raw samples never cross the wire" guarantee (brief §3.7, §7.5), plus envelope
// validation for untrusted input (relay, postMessage from other frames, WebSocket, DataChannel).
import type { WireMessage } from './protocol.ts';

export const WIRE_LIMITS = {
  /** Largest serialised message accepted anywhere (a Stage 1 snapshot is ≈ 7 KB) [ENG]. */
  maxBytes: 256 * 1024,
  /** Longest all-numeric array allowed in commands and events (0.13 s of ECG at 500 Hz) [ENG]. */
  eventNumericArray: 64,
  /** Longest all-numeric array allowed in a snapshot (the QRS detector history is 128) [ENG]. */
  snapshotNumericArray: 1024,
  /** FU-11 (F01, BA10): deepest nesting accepted (a real snapshot is 10 deep) [ENG]. */
  maxDepth: 32,
  /** FU-11 (F01, BA11): most values in one message (a real snapshot holds ≈ 5 000) [ENG]. */
  maxNodes: 50_000,
} as const;

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
 * FU-11 (F01, BA10, BA11): one ITERATIVE pass over a message (the recursive walk overflowed the stack on 12 000 nested
 * objects in a 72 KB hello and took the relay down). Returns a reason for the first sample-like payload and, with
 * `budget`, for nesting deeper than maxDepth, more than maxNodes values or more than maxBytes of encoded size — the
 * same limits whether the message arrived as a JSON string or as a structured-clone object.
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

/** FU-11 (F01, BA11): the sample guard plus the size, depth and value budgets (every receiving transport applies it). */
export function wireBudgetError(m: WireMessage): string | null {
  return inspect(m, numericLimit(m), true);
}

/** Throws WireSafetyError when `m` carries samples. Every transport calls this in send(). */
export function assertWireSafe(m: WireMessage): void {
  const leak = findSampleLeak(m);
  if (leak) throw new WireSafetyError(`refusing to send sample data: ${leak}`);
}

const KINDS = new Set(['hello', 'command', 'ack', 'event', 'snapshot']);
const ROLES = new Set(['host', 'controller', 'viewer']);

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
      break;
    case 'command': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.id !== 'string' || typeof b.type !== 'string' || typeof b.issuedBy !== 'string') return null;
      break;
    }
    case 'ack':
      if (typeof m.commandId !== 'string' || typeof m.accepted !== 'boolean' || typeof m.tick !== 'number') return null;
      break;
    case 'event':
      if (!Array.isArray(m.body) || !m.body.every((e) => e !== null && typeof e === 'object' && typeof (e as { type?: unknown }).type === 'string')) return null;
      break;
    case 'snapshot': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.schema !== 'string' || typeof b.tick !== 'number') return null;
      break;
    }
  }
  const msg = o as WireMessage;
  return wireBudgetError(msg) ? null : msg;
}
