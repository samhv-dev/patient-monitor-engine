// The ventilator's alarms on the instructor's side: the host's `ventAlarms` event becomes the Log's lines (raised, a new
// priority, silenced, sounding again, ended), the top count's words and the Debrief's rows (a raise with its end; a
// silence is no end), named with the ventilator as every page names it.
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport, type VentAlarmEntry, type VentScreen, type WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';
import { isVentAlarm, RunRecord } from './record.ts';
import type { AppSession } from './session.ts';
import { ventAlarmChanges } from './vent-alarms.ts';

const S = 'VAL234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const pmax: VentAlarmEntry = { id: 'pmax', text: 'High pressure (Pmax)', priority: 'high', silenced: false };
const mvLow: VentAlarmEntry = { id: 'mvLow', text: 'ExpMinVol low', priority: 'medium', silenced: false };
const ev = (t: number, active: VentAlarmEntry[], screen: VentScreen = 'window'): WireEvent => ({ type: 'ventAlarms', t, screen, active });

describe('ventAlarmChanges', () => {
  it('raised, a new priority, silenced, sounding again and ended, per alarm', () => {
    expect(ventAlarmChanges([], [pmax]).map((c) => c.kind)).toEqual(['raised']);
    expect(ventAlarmChanges([pmax], [pmax])).toEqual([]);
    expect(ventAlarmChanges([pmax], [{ ...pmax, priority: 'medium' }]).map((c) => c.kind)).toEqual(['priority']);
    expect(ventAlarmChanges([pmax, mvLow], [{ ...pmax, silenced: true }, { ...mvLow, silenced: true }]).map((c) => [c.kind, c.alarm.id])).toEqual([['silenced', 'pmax'], ['silenced', 'mvLow']]);
    expect(ventAlarmChanges([{ ...pmax, silenced: true }], [pmax]).map((c) => c.kind)).toEqual(['sounding']);
    expect(ventAlarmChanges([pmax, mvLow], [mvLow]).map((c) => [c.kind, c.alarm.id])).toEqual([['ended', 'pmax']]);
  });
});

function host() {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t: ManagedTransport = hub.connect();
  const app = { onMount: () => () => undefined, record: { note: () => undefined } } as unknown as AppSession;
  const link = new Link(new ControllerSession({ session: S, transport: t }), t, app);
  const stamp = createStamper(S, 'host-1');
  const send = (...body: WireEvent[]) => h.send(stamp({ kind: 'event', body }));
  return { link, send };
}

describe("the instructor's Link", () => {
  it('logs each change of the ventilator\'s alarms at its time, named "Ventilator window: …"', async () => {
    const { link, send } = host();
    send(ev(40, [pmax]));
    send(ev(52, [{ ...pmax, silenced: true }]));
    send(ev(60, [{ ...pmax, silenced: true }, { ...mvLow, silenced: true }]));
    send(ev(172, [mvLow]));
    send(ev(180, []));
    await tick();
    expect(link.log.map((e) => [e.simT, e.kind, e.text])).toEqual([
      [40, 'alarm', 'Ventilator window: High pressure (Pmax) raised, high priority'],
      [52, 'alarm', 'Ventilator window: High pressure (Pmax) sound silenced on the ventilator'],
      [60, 'alarm', 'Ventilator window: ExpMinVol low raised, medium priority, sound silenced'],
      [172, 'alarm', 'Ventilator window: ExpMinVol low sounding again'],
      [172, 'alarm', 'Ventilator window: High pressure (Pmax) ended'],
      [180, 'alarm', 'Ventilator window: ExpMinVol low ended'],
    ]);
    link.close();
  });

  it("counts them with the monitor's: \"No alarms\" only when neither device alarms; the top words are the highest's", async () => {
    const { link, send } = host();
    expect(link.alarmSummary).toMatchObject({ level: null, n: 0, words: null });
    send(ev(40, [mvLow], 'device'));
    await tick();
    expect(link.alarmSummary).toMatchObject({ level: 2, n: 1, top: null, words: 'Ventilator: ExpMinVol low' });
    send({ type: 'alarmStatus', t: 41, active: [{ id: 'SPO2_LOW', level: 2, category: 'physiological', text: '%SPO2 LOW', numeric: 'spo2', since: 41, latched: false, acked: false }] } as never);
    await tick();
    expect(link.alarmSummary, "the monitor's first between equals").toMatchObject({ level: 2, n: 2, words: 'SpO₂ low' });
    send(ev(42, [mvLow, pmax], 'device'));
    await tick();
    expect(link.alarmSummary).toMatchObject({ level: 1, n: 3, top: null, words: 'Ventilator: High pressure (Pmax)' });
    send({ type: 'timeline', t: 0, tick: 0 });
    await tick();
    expect(link.ventAlarms, 'a new case: the host says them again').toBeNull();
    link.close();
  });
});

describe('the Debrief record', () => {
  const record = () => new RunRecord(() => ({ patient: 'F 45 y', weightKg: 68 }), () => 0);
  it('a row at each raise, named as the ventilator, ended when it leaves the list; a silence does not end it', () => {
    const r = record();
    r.wire(ev(40, [pmax]));
    r.wire(ev(52, [{ ...pmax, silenced: true }]));
    r.wire(ev(60, [{ ...pmax, silenced: true }, mvLow]));
    r.wire(ev(172, [mvLow]));
    expect(r.data.rows.filter(isVentAlarm)).toEqual([
      { t: 40, kind: 'alarm', text: 'Ventilator window: High pressure (Pmax)', ev: 'ventAlarm:pmax', endT: 172 },
      { t: 60, kind: 'alarm', text: 'Ventilator window: ExpMinVol low', ev: 'ventAlarm:mvLow' },
    ]);
  });

  it('a new case starts with none open; a return to a bookmark keeps an alarm raised before it and undoes one raised after', () => {
    const r = record();
    r.wire(ev(40, [pmax]));
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restart' });
    r.wire(ev(0, [pmax])); // the host says them again after a new timeline
    expect(r.data.rows.filter(isVentAlarm)).toEqual([{ t: 0, kind: 'alarm', text: 'Ventilator window: High pressure (Pmax)', ev: 'ventAlarm:pmax' }]);

    r.wire({ type: 'commandApplied', commandId: 'b1', tick: 2500, resolved: { command: { id: 'b1', type: 'scenario', action: 'bookmark', target: 'before' } } } as never);
    r.wire(ev(70, [pmax, mvLow]));
    r.wire({ type: 'commandApplied', commandId: 'b2', tick: 2500, resolved: { command: { id: 'b2', type: 'scenario', action: 'restoreBookmark', target: 'before' } } } as never);
    r.wire({ type: 'timeline', t: 50, tick: 2500, cause: 'restore' });
    r.wire(ev(50, [pmax, mvLow]));
    const kept = r.data.rows.filter((x) => isVentAlarm(x) && x.undone === undefined);
    expect(kept.map((x) => [x.t, x.ev, x.endT])).toEqual([[0, 'ventAlarm:pmax', undefined], [50, 'ventAlarm:mvLow', undefined]]);
  });

  it('after a reload of the page they end at the restored time; a ventilator still alarming raises them again', () => {
    const r = record();
    r.wire(ev(40, [pmax]));
    r.wire(ev(60, []));
    r.wire(ev(80, [mvLow]));
    r.resume({ data: structuredClone(r.data), active: [], lastVent: null, pulse: null } as never, 100);
    r.wire(ev(100, [mvLow]));
    expect(r.data.rows.filter(isVentAlarm).map((x) => [x.t, x.ev, x.endT])).toEqual([[40, 'ventAlarm:pmax', 60], [80, 'ventAlarm:mvLow', 100], [100, 'ventAlarm:mvLow', undefined]]);
  });
});
