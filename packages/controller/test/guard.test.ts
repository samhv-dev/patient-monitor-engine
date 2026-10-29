import { describe, expect, it } from 'vitest';
import { assertWireSafe, findSampleLeak, parseWireMessage, WIRE_LIMITS, WireSafetyError } from '../src/guard.ts';
import { createStamper, type WireMessage } from '../src/protocol.ts';
import { createEngine } from '@pme/engine-core';

const stamp = createStamper('ABC234', 'host-1');

describe('sample guard (runtime half of "raw samples never cross the wire")', () => {
  it('passes real traffic: events, commands and a real engine snapshot', () => {
    const e = createEngine({ seed: 3 });
    e.advanceTo(20);
    const events: WireMessage = stamp({ kind: 'event', body: [{ type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } }] });
    const snap: WireMessage = stamp({ kind: 'snapshot', body: e.snapshot() });
    expect(findSampleLeak(events)).toBeNull();
    expect(findSampleLeak(snap)).toBeNull();
    expect(JSON.stringify(snap).length).toBeLessThan(WIRE_LIMITS.maxBytes);
  });

  it('refuses typed arrays, ArrayBuffers, long numeric runs and sample-named keys anywhere', () => {
    const ev = (extra: object) => ({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'measurement', t: 0, values: {}, ...extra }] }) as unknown as WireMessage;
    expect(findSampleLeak(ev({ x: new Float32Array(4) }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: { y: new ArrayBuffer(8) } }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 65 }, (_, i) => i) }))).toMatch(/numeric array of 65/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 64 }, (_, i) => i) }))).toBeNull();
    expect(findSampleLeak(ev({ samples: [1, 2] }))).toMatch(/forbidden key/);
    expect(() => assertWireSafe(ev({ waveform: [] }))).toThrow(WireSafetyError);
  });

  it('allows up to 1024-long numeric arrays only inside a snapshot', () => {
    const big = Array.from({ length: 1000 }, () => 0);
    const s = stamp({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: '0', seed: 1, tick: 0, state: { big } } });
    expect(findSampleLeak(s)).toBeNull();
    const s2 = { ...s, body: { ...(s as Extract<WireMessage, { kind: 'snapshot' }>).body, state: { big: [...big, ...big] } } } as WireMessage;
    expect(findSampleLeak(s2)).toMatch(/2000/);
  });
});

describe('parseWireMessage (untrusted input)', () => {
  const good = stamp({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } });
  it('accepts a JSON string or an object', () => {
    expect(parseWireMessage(JSON.stringify(good))).toEqual(good);
    expect(parseWireMessage(good)).toEqual(good);
  });
  it('rejects malformed, wrong-version, unknown-kind, oversized and sample-carrying input', () => {
    expect(parseWireMessage('{nope')).toBeNull();
    expect(parseWireMessage({ ...good, v: 2 })).toBeNull();
    expect(parseWireMessage({ ...good, kind: 'samples' })).toBeNull();
    expect(parseWireMessage({ ...good, seq: 0 })).toBeNull();
    expect(parseWireMessage({ ...good, body: { type: 'setTarget' } })).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'hello', role: 'host' }), role: 'admin' })).toBeNull();
    expect(parseWireMessage('x'.repeat(WIRE_LIMITS.maxBytes + 1))).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'x', data: new Float32Array(2) }] })).toBeNull();
  });
});

describe('the instructor role on the wire (plan instructor-peer-role.md §1, §2, §6; P2)', () => {
  const hello = (role: string, pin?: unknown) => ({ ...stamp({ kind: 'hello', role: 'controller' }), role, ...(pin === undefined ? {} : { pin }) });
  const command = (body: Record<string, unknown>) => ({ ...stamp({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } }), body: { id: 'c2', issuedBy: 'remote', ...body } });

  it('accepts an instructor hello with a PIN of 4 to 8 digits', () => {
    expect(parseWireMessage(hello('instructor', '4729'))).toMatchObject({ kind: 'hello', role: 'instructor', pin: '4729' });
    expect(parseWireMessage(JSON.stringify(hello('instructor', '47291234')))).not.toBeNull();
  });

  it('refuses a PIN on any other role, a non-digit PIN, and a PIN of 3 or of 9 characters', () => {
    for (const role of ['host', 'controller', 'viewer']) expect(parseWireMessage(hello(role, '4729')), role).toBeNull();
    for (const pin of ['47a9', '47 9', '４７２９', '-472', '4729\n', 4729, null, ''])
      expect(parseWireMessage(hello('instructor', pin)), JSON.stringify(pin)).toBeNull();
    expect(parseWireMessage(hello('instructor', '472'))).toBeNull();
    expect(parseWireMessage(hello('instructor', '472912345'))).toBeNull();
  });

  it('accepts grant {to, granted, reason?} and refuses a grant without to or granted', () => {
    const grant = (o: Record<string, unknown>) => ({ ...stamp({ kind: 'ack', commandId: 'x', accepted: true, tick: 0 }), kind: 'grant', commandId: undefined, accepted: undefined, tick: undefined, ...o });
    expect(parseWireMessage(JSON.stringify(grant({ to: 'ctl-abc.1', granted: true })))).toMatchObject({ kind: 'grant', to: 'ctl-abc.1', granted: true });
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: false, reason: 'the PIN was changed' }))).not.toBeNull();
    expect(parseWireMessage(grant({ granted: true }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1' }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: 'yes' }))).toBeNull();
    expect(parseWireMessage(grant({ to: 7, granted: true }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: false, reason: 3 }))).toBeNull();
  });

  it('accepts the note command (kind note or marker, text of at most 500 characters) and refuses a longer text', () => {
    expect(parseWireMessage(command({ type: 'note', kind: 'note', text: 'Dantrolene drawn up' }))).not.toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'marker', text: 'x'.repeat(500) }))).not.toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'note', text: 'x'.repeat(501) }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'stage', text: 'x' }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', text: 'x' }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'note' }))).toBeNull();
  });
});
