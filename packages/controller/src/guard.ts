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
} as const;

/** Keys that only a waveform leak would use. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['samples', 'sampleData', 'waveform', 'buffer']);

export class WireSafetyError extends Error {
  override readonly name = 'WireSafetyError';
}

/** Returns a description of the first sample-like payload in `m`, or null when the message is clean. */
export function findSampleLeak(m: WireMessage): string | null {
  const limit = m.kind === 'snapshot' ? WIRE_LIMITS.snapshotNumericArray : WIRE_LIMITS.eventNumericArray;
  const seen = new Set<object>();
  const walk = (v: unknown, path: string): string | null => {
    if (v === null || typeof v !== 'object') return null;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return `${path}: binary data (${v.constructor.name})`;
    if (seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > limit && v.every((x) => typeof x === 'number')) return `${path}: numeric array of ${v.length} > ${limit}`;
      for (let i = 0; i < v.length; i++) {
        const r = walk(v[i], `${path}[${i}]`);
        if (r) return r;
      }
      return null;
    }
    for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: forbidden key`;
      const r = walk(x, `${path}.${k}`);
      if (r) return r;
    }
    return null;
  };
  return walk(m, 'message');
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
  return findSampleLeak(msg) ? null : msg;
}
