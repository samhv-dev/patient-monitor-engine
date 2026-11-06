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

// The hello's instrument (plan room-and-instruments.md R3): `show` and `device` compile on a viewer hello only.
import type { Instrument } from '../src/protocol.ts';
t.send({ ...header, kind: 'hello', role: 'viewer', show: 'defib', device: 'k3x9q2m7' });
const shown: Instrument = 'learner';
void shown;
// @ts-expect-error — `vent` is not an instrument a hello names (the ventilator is its own role, R8a).
const vent: Instrument = 'vent';
void vent;

// R8a (plan room-and-instruments.md): the ventilator role and the `vent` message. The link kinds of @pme/ventilator (its
// LinkMsg) and of a `vent` body are the same set; every link message but `cmds` rides a `vent` as it is; a `cmds` the
// guard passed is a link `cmds` (its commands are the three the link core builds, LinkMsg types them as any Command).
import type { LinkMsg } from '../../ventilator/src/link/port.ts';
import type { VentLinkBody, VentLinkKind } from '../src/protocol.ts';
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameKinds: Same<LinkMsg['kind'] | 'batch', VentLinkKind> = true; // R8c: `batch` is the relay port's own
declare const link: Exclude<LinkMsg, { kind: 'cmds' }>;
const asBody: VentLinkBody = link;
declare const guarded: Extract<VentLinkBody, { kind: 'cmds' }>;
const asLink: LinkMsg = guarded;
void sameKinds, asBody, asLink;
// R8c: what the relay port sends (`batch` packs the cmds of 20 ms; settings say what the cockpit measured and whether its
// page is hidden) is exactly a `vent` body: the same kinds, each assignable both ways.
import type { VentWireBody } from '../../ventilator/src/link/relay-port.ts';
const sameWireKinds: Same<VentWireBody['kind'], VentLinkKind> = true;
declare const wire: Exclude<VentWireBody, { kind: 'cmds' | 'batch' }>;
const wireAsBody: VentLinkBody = wire;
declare const guardedBatch: Extract<VentLinkBody, { kind: 'batch' }>;
const batchAsWire: VentWireBody = guardedBatch;
void sameWireKinds, wireAsBody, batchAsWire;
t.send({ ...header, kind: 'hello', role: 'ventilator', pin: '4729' });
t.send({ ...header, kind: 'vent', body: { v: 1, kind: 'cmds', tick: 12, cmds: [{ id: 'v1', issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }] } });
t.send({ ...header, kind: 'vent', to: 'vent-a.1', body: { v: 1, kind: 'clock', ventTick: 80 } });
// @ts-expect-error — a `vent` carries the ventilator's own commands only, never another command type
t.send({ ...header, kind: 'vent', body: { v: 1, kind: 'cmds', tick: 12, cmds: [{ id: 'v2', issuedBy: 'ventilator', type: 'time', action: 'pause' }] } });
// @ts-expect-error — a `vent` body is a link message
t.send({ ...header, kind: 'vent', body: { v: 1, kind: 'snapshot' } });
