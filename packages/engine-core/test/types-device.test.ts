// Stage 4b public types compile and are exported from the package entry (brief §7.2–§7.3, additive).
import { describe, expect, it } from 'vitest';
import type { AlarmDeviceAction, Command, DeviceEvent, EngineEvent, MonitorDeviceAction } from '../src/index.ts';

describe('Stage 4b types', () => {
  it('commands: applyEvent defib/pacer, device alarm/monitor', () => {
    const cmds: Command[] = [
      { id: 'a', issuedBy: 't', type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
      { id: 'b', issuedBy: 't', type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', ratePpm: 70, mA: 80, fault: 'failureToSense' } },
      { id: 'c', issuedBy: 't', type: 'device', action: { device: 'alarm', action: 'setLimit', param: 'HR', low: 50, high: 120 } satisfies AlarmDeviceAction },
      { id: 'd', issuedBy: 't', type: 'device', action: { device: 'monitor', action: 'skin', value: 'saadat-like' } satisfies MonitorDeviceAction },
    ];
    expect(cmds).toHaveLength(4);
  });

  it('events: alarm carries level, tone carries chargeS, alarmStatus/deviceStatus exist', () => {
    const evs: EngineEvent[] = [
      { type: 'alarm', t: 1, id: 'HR_HIGH', priority: 'medium', category: 'physiological', state: 'raised', text: '**HR 130>120', level: 2 },
      { type: 'tone', t: 1, id: 'defib-charge-1', kind: 'charge', chargeS: 7 },
      { type: 'deviceStatus', t: 1, defib: null, pacer: null, hrDashes: false } satisfies DeviceEvent,
    ];
    expect(evs.map((e) => e.type)).toEqual(['alarm', 'tone', 'deviceStatus']);
  });
});
