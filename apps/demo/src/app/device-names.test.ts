// A device's one readable name (device-names.ts), kept by the host's record: Room setup's name, else its role and its
// number among the session's devices of that role, in the order the host first heard of each; never its key.
import type { RelayDevice, WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { deviceLabel, keptLabel, type DeviceOrder } from './device-names.ts';
import { RunRecord } from './record.ts';

const relay = (role: RelayDevice['role'], device: string | null): RelayDevice => ({ id: `peer-${device}`, role, show: null, device, granted: true, rttMs: 5, sinceMs: 0 });
const record = (names: Record<string, string> = {}) => new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, (k) => names[k] ?? null);

describe('device names', () => {
  it('numbers each role on its own, in the order first heard of; a name typed in Room setup wins, and the number stays', () => {
    const order: DeviceOrder = {};
    expect(deviceLabel(order, 'learner', 'phoneaaaa001', null)).toBe('Learner remote 1');
    expect(deviceLabel(order, 'pump', 'tabletaaa001', null)).toBe('Pump tablet 1');
    expect(deviceLabel(order, 'learner', 'phonebbbb002', 'bed 2')).toBe('bed 2');
    expect(deviceLabel(order, 'learner', 'phonebbbb002', null)).toBe('Learner remote 2');
    expect(deviceLabel(order, 'defib', 'defibaaaa001', null)).toBe('Defibrillator window 1');
    expect(deviceLabel(order, 'learner', 'phoneaaaa001', null)).toBe('Learner remote 1');
    expect(order).toEqual({ learner: ['phoneaaaa001', 'phonebbbb002'], pump: ['tabletaaa001'], defib: ['defibaaaa001'] });
  });

  it('a kept order is read without being written', () => {
    const order: DeviceOrder = { learner: ['phoneaaaa001'] };
    expect(keptLabel(order, 'learner', 'phoneaaaa001')).toBe('Learner remote 1');
    expect(keptLabel(order, 'learner', 'phonebbbb002')).toBeNull();
    expect(keptLabel(undefined, 'pump', 'phoneaaaa001')).toBeNull();
    expect(order).toEqual({ learner: ['phoneaaaa001'] });
  });
});

describe("the host's record keeps the numbers", () => {
  it("the relay's table numbers the acting devices in the order they joined; a viewer is not numbered", () => {
    const r = record();
    r.heard([relay('viewer', 'monitoraa001'), relay('learner', 'phonebbbb002'), relay('pump', 'tabletaaa001'), relay('learner', 'phoneaaaa001'), relay('learner', null)]);
    expect(r.label('phoneaaaa001', 'learner')).toBe('Learner remote 2');
    expect(r.label('phonebbbb002', 'learner')).toBe('Learner remote 1');
    expect(r.label('tabletaaa001', 'pump')).toBe('Pump tablet 1');
    expect(r.data.devices).toEqual({ learner: ['phonebbbb002', 'phoneaaaa001'], pump: ['tabletaaa001'] });
  });

  it('a new case keeps them; a reload of the page keeps them, the kept ones first', () => {
    const r = record();
    r.heard([relay('learner', 'phoneaaaa001'), relay('learner', 'phonebbbb002')]);
    r.wire({ type: 'timeline', t: 0, tick: 0 } as WireEvent); // a new patient or card: a new record
    expect(r.data.rows).toEqual([]);
    expect(r.label('phonebbbb002', 'learner')).toBe('Learner remote 2');
    const kept = JSON.parse(JSON.stringify(r.keep())) as ReturnType<RunRecord['keep']>;
    const after = record(); // the reloaded page heard a new phone before the case came back
    after.heard([relay('learner', 'phonecccc003'), relay('learner', 'phonebbbb002')]);
    after.resume(kept, 0);
    expect(after.label('phoneaaaa001', 'learner')).toBe('Learner remote 1');
    expect(after.label('phonebbbb002', 'learner')).toBe('Learner remote 2');
    expect(after.label('phonecccc003', 'learner')).toBe('Learner remote 3');
  });

  it("a learner's give, its rate change's replaced remote and a pump tablet's press are numbered as they act", () => {
    const r = record({ phonebbbb002: 'bed 2' });
    const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
      ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, type: 'applyEvent', ...command } } }) as WireEvent;
    r.wire(applied(100, { issuedBy: 'learner', by: 'phoneaaaa001', event: { kind: 'infusion', drugId: 'propofol', rate: 20, unit: 'mL/h' }, replaced: { rate: 10, rateUnit: 'mL/h', by: 'phonebbbb002' } }));
    r.wire(applied(200, { issuedBy: 'pump', by: 'tabletaaa001', event: { kind: 'pump', ch: 1, action: 'start' }, pump: { ch: 1 } }));
    expect(r.data.devices).toEqual({ learner: ['phoneaaaa001', 'phonebbbb002'], pump: ['tabletaaa001'] });
    expect(r.data.rows.map((x) => x.name ?? null)).toEqual([null, null]);
    expect(r.label('phonebbbb002', 'learner')).toBe('bed 2');
  });
});
