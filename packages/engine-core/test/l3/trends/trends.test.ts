// Stage 4b acceptance: 8 h of 1 Hz values retained at ≤ 3 MB; event-log entries for every command, alarm and shock.
import { describe, expect, it } from 'vitest';
import { EventLog } from '../../../src/l3/trends/event-log.ts';
import { TREND_NUMERICS, TREND_SLOTS, TrendStore } from '../../../src/l3/trends/trend-store.ts';
import type { EngineEvent, Measured, NumericId } from '../../../src/types.ts';
import { cmd, devRig } from '../../helpers/device.ts';

const meas = (t: number, v: number): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(TREND_NUMERICS.map((k) => [k, { value: v, flag: 'valid', at: t } satisfies Measured])) as Partial<Record<NumericId, Measured>>,
});

describe('trend store', () => {
  it('holds 8 h of every numeric at 1 Hz in ≤ 3 MB and drops what is older', () => {
    const s = new TrendStore();
    expect(s.bytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    for (let t = 1; t <= TREND_SLOTS + 10; t++) s.record(meas(t, t % 1000));
    expect(s.latestS).toBe(TREND_SLOTS + 10);
    expect(s.oldestS).toBe(11);
    const first = s.series('hr', 11, 20);
    expect(Array.from(first)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(Number.isNaN(s.series('hr', 5, 5)[0] as number)).toBe(true);
    expect(s.bytes).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  it('gaps read NaN; the table takes the latest value in each step', () => {
    const s = new TrendStore();
    s.record({ type: 'measurement', t: 10, values: { hr: { value: 70, flag: 'valid', at: 10 } } });
    s.record({ type: 'measurement', t: 40, values: { hr: { value: 90, flag: 'valid', at: 40 }, spo2: { value: 97, flag: 'invalid', at: 40 } } });
    expect(Number.isNaN(s.series('hr', 20, 20)[0] as number)).toBe(true);
    const rows = s.table(['hr', 'spo2'], 30, 0, 59);
    expect(rows).toEqual([{ t: 0, values: { hr: 70 } }, { t: 30, values: { hr: 90 } }]);
  });
});

describe('event log', () => {
  it('logs every accepted command, alarm change and shock; CSV rows per kind match', () => {
    const { e, ev } = devRig('zoll-like');
    const log = new EventLog();
    e.on((x) => log.event(x));
    const send = (c: ReturnType<typeof cmd>) => {
      if (e.dispatch(c).accepted) log.command(c, e.now().simT);
    };
    send(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    send(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }));
    e.advanceTo(8);
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    e.advanceTo(8.1);
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } })); // rejected: no longer charged
    e.advanceTo(12);
    const alarmEvents = ev.filter((x) => x.type === 'alarm' && x.level !== undefined).length;
    expect(log.count('alarm')).toBe(alarmEvents);
    expect(log.count('command')).toBe(2);
    expect(log.count('rhythm')).toBe(1);
    expect(log.count('sensor')).toBe(1);
    expect(log.count('defib')).toBe(3); // chargeStart, chargeReady, shock
    const csv = log.toCSV().split('\n');
    expect(csv[0]).toBe('t,kind,issuedBy,text');
    expect(csv.length - 1).toBe(log.entries.length);
    for (const kind of ['alarm', 'command', 'defib'] as const) expect(csv.filter((r) => r.split(',')[1] === kind).length).toBe(log.count(kind));
    expect(log.toJSON()[0]?.issuedBy).toBe('test');
  });
});
