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

// The instructor role (plan instructor-peer-role.md P2): the new shapes compile.
import type { RelayFrame } from '../src/transport/relay-frames.ts';
import type { WireCommand, WireEvent } from '../src/protocol.ts';
t.send({ ...header, kind: 'hello', role: 'instructor', pin: '4729' });
t.send({ ...header, kind: 'grant', to: 'ctl-abc.1', granted: false, reason: 'the PIN was changed' });
t.send({ ...header, kind: 'command', body: { id: 'c1', issuedBy: 'remote', type: 'note', kind: 'marker', text: 'Objective met' } });
t.send({ ...header, kind: 'event', body: [{ type: 'instructorView', t: 12, body: { rows: [] } }] });
const frames: RelayFrame[] = [
  { relay: 'peers', hostOnline: true, peers: 3, instructors: 1 },
  { relay: 'error', code: 'denied', message: 'wrong PIN' },
  { relay: 'error', code: 'too-many-tries', message: 'wait a minute' },
];
void frames;
// @ts-expect-error — a note is a note or a marker, never a stage mark.
const stageNote: WireCommand = { id: 'c', issuedBy: 'remote', type: 'note', kind: 'stage', text: 'x' };
void stageNote;
// @ts-expect-error — a grant names who it is for.
t.send({ ...header, kind: 'grant', granted: true });
const feed: WireEvent = { type: 'instructorView', t: 0, body: null };
void feed;
