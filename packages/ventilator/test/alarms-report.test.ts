// The ventilator reports the alarms its face shows to the monitor side: once per change, again when it is linked anew,
// stamped with its tick, which the monitor side turns into the engine tick it dispatches that tick's frame on.
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, type LinkMsg, type MonitorLike, type VentAlarmReport } from '../src/index.ts';

const pmax: VentAlarmReport = { id: 'pmax', text: 'High pressure (Pmax)', priority: 'high', silenced: false };
const alarmsOf = (got: LinkMsg[]) => got.filter((m): m is Extract<LinkMsg, { kind: 'alarms' }> => m.kind === 'alarms');

describe('VentDriver.reportAlarms', () => {
  it('sends each change once, with the tick it was shown on, and nothing for a repeat', () => {
    const [vent, mon] = createLocalPortPair();
    const got: LinkMsg[] = [];
    mon.onMessage((m) => got.push(m));
    const d = createVentDriver(vent, 'normal');
    d.frame(0);
    d.frame(100); // 5 ticks
    d.reportAlarms([pmax]);
    d.reportAlarms([pmax]);
    d.reportAlarms([{ ...pmax, silenced: true }]);
    d.reportAlarms([]);
    expect(alarmsOf(got).map((m) => [m.tick, m.alarms.map((a) => a.silenced)])).toEqual([[5, [false]], [5, [true]], [5, []]]);
  });

  it('says its alarms again when a link resumes it, and says nothing when it has none', () => {
    const [vent, mon] = createLocalPortPair();
    const got: LinkMsg[] = [];
    mon.onMessage((m) => got.push(m));
    const d = createVentDriver(vent, 'normal');
    mon.post({ v: 1, kind: 'time', action: 'resume' });
    expect(alarmsOf(got)).toHaveLength(0);
    d.reportAlarms([pmax]);
    mon.post({ v: 1, kind: 'time', action: 'pause' });
    mon.post({ v: 1, kind: 'time', action: 'resume' });
    expect(alarmsOf(got).map((m) => m.alarms)).toEqual([[pmax], [pmax]]);
  });
});

describe('LinkDetach.engineTick', () => {
  it('is null until the link has learnt its offset, then the ventilator tick plus that offset', async () => {
    const [vent, mon] = createLocalPortPair();
    let engTick = 100;
    const monitor: MonitorLike = { dispatch: () => ({ accepted: true, tick: ++engTick }), on: () => () => undefined };
    const link = attachMonitorToLink(monitor, mon);
    expect(link.engineTick(7)).toBeNull();
    const d = createVentDriver(vent, 'normal');
    d.frame(0);
    d.frame(20); // tick 1: its first command probes the offset (the engine's next tick, 101, less tick 1, plus LEAD_TICKS)
    await Promise.resolve();
    expect(link.engineTick(7)).toBe(7 + 100 + 5);
    link();
  });
});
