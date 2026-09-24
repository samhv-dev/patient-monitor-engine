// Type-level half of "raw samples never cross the wire": checked by `tsc` (pnpm typecheck), not run.
import type { Transport, WireMessage } from '../src/protocol.ts';

declare const t: Transport;
const header = { v: 1 as const, session: 'ABC234', from: 'h', seq: 1, sentAt: 0 };

// A real event batch compiles.
t.send({ ...header, kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });

// @ts-expect-error — there is no 'samples' message kind.
t.send({ ...header, kind: 'samples', body: new Float32Array(500) });

// @ts-expect-error — an event body is EngineEvent[], never a typed array.
t.send({ ...header, kind: 'event', body: new Float32Array(500) });

// @ts-expect-error — no event variant has a sample field.
t.send({ ...header, kind: 'event', body: [{ type: 'measurement', t: 1, values: {}, samples: new Float32Array(10) }] });

// @ts-expect-error — `v` is the literal 1.
const bad: WireMessage = { ...header, v: 2, kind: 'hello', role: 'host' };
void bad;
