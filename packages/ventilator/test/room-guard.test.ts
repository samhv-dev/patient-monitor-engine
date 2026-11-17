// A room's host takes from its ventilator only the ventilator's breaths, its circuit and its settings: every command and
// message the link core builds is checked against ROOM_VENT_MAY_SEND, and a refused one never reaches the engine.
import type { Command, DispatchResult } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import {
  attachMonitorToLink, createLinkCore, createLocalPortPair, createVent, linkTick, PROFILES, roomVentCommandRefusal, roomVentMonitor,
  roomVentPort, setCircuit, type LinkMsg,
} from '../src/index.ts';

const cmd = (body: Record<string, unknown>): Command => ({ id: 'x', issuedBy: 'ventilator', ...body }) as Command;

describe('what a ventilator in a room may send', () => {
  it('its breaths and its circuit, on every profile; the stand-in targets of a profile are refused', () => {
    const kinds = new Map<string, string | null>();
    for (const p of Object.values(PROFILES)) {
      const vs = createVent();
      const core = createLinkCore(vs, p);
      const out = [...linkTick(core, 0.02)];
      setCircuit(vs, 'disconnected');
      out.push(...linkTick(core, 0.02));
      setCircuit(vs, 'connected');
      out.push(...linkTick(core, 0.02));
      for (const c of out) kinds.set(c.type === 'applyEvent' ? `applyEvent ${c.event.kind}` : c.type, roomVentCommandRefusal(c));
    }
    expect(Object.fromEntries(kinds)).toEqual({
      externalDrive: null,
      'applyEvent airway': null,
      setTarget: "a ventilator in a room may not send setTarget: the patient is the room's",
    });
  });

  it("the patient's lungs, effort, disease and rhythm are refused", () => {
    for (const c of [
      cmd({ type: 'applyEvent', event: { kind: 'lungCondition', condition: 'ards', severity: 1 } }),
      cmd({ type: 'setRhythm', rhythm: 'vf' }),
      cmd({ type: 'setModifiers', modifiers: {} }),
      cmd({ type: 'externalDrive', source: 'manual', frame: {} }),
    ]) expect(roomVentCommandRefusal(c)).toMatch(/^a ventilator in a room may not send /);
  });

  it('the link messages it may send (its breaths, its settings, its alarms) reach the host; any other is refused and heard once', () => {
    const [vent, host] = createLocalPortPair();
    const refused: Array<[string, string]> = [];
    const heard: string[] = [];
    roomVentPort(host, (k, why) => refused.push([k, why])).onMessage((m) => heard.push(m.kind));
    const msgs: LinkMsg[] = [
      { v: 1, kind: 'cmds', tick: 1, cmds: [] },
      { v: 1, kind: 'settings', cfg: createVent().cfg },
      { v: 1, kind: 'alarms', tick: 2, alarms: [{ id: 'pmax', text: 'High pressure (Pmax)', priority: 'high', silenced: false }] },
      { v: 1, kind: 'time', action: 'pause' },
      { v: 1, kind: 'control', profile: 'ards-severe-recruitable' },
      { v: 1, kind: 'clock', ventTick: 9 },
    ];
    for (const m of msgs) vent.post(m);
    expect(heard).toEqual(['cmds', 'settings', 'alarms']);
    expect(refused.map(([k]) => k)).toEqual(['time', 'control', 'clock']);
    expect(refused[0]?.[1]).toBe("a ventilator in a room may not send 'time'");
  });

  it('on the link, a refused command never reaches the monitor and is reported with its reason', async () => {
    const [vent, host] = createLocalPortPair();
    const reached: string[] = [];
    const monitor = {
      dispatch: (c: Command): DispatchResult => (reached.push(c.type), { accepted: true, tick: 1 }),
      on: () => () => {},
    };
    const rejected: Array<[string, string | undefined]> = [];
    attachMonitorToLink(roomVentMonitor(monitor), host, (c, r) => rejected.push([c.type, r]));
    vent.post({ v: 1, kind: 'cmds', tick: 1, cmds: [cmd({ type: 'setTarget', variable: 'sbp', value: 70 }), cmd({ type: 'externalDrive', source: 'ventilator', frame: {} })] });
    await Promise.resolve();
    expect(reached).toEqual(['externalDrive']);
    expect(rejected).toEqual([['setTarget', "a ventilator in a room may not send setTarget: the patient is the room's"]]);
  });
});
