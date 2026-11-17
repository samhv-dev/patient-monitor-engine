// The Log's pump alarm lines: the Link reads the engine's `pumpAlarm` and its channel rows from the host's events, writes
// a line when a channel's alarm is raised (at the event's time) and when it ends (at the first rows without it), keeps
// the last rows and the room's rack for the instructor's view, and starts again with no edge on a new timeline.
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import type { PumpPanelRow } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';

const S = 'LNK235';
const tick = () => new Promise((r) => setTimeout(r, 0));
const P = { amount: 100, unit: 'mcg' as const, perMl: 1 };
const row = (alarms: PumpPanelRow['alarms']): PumpPanelRow => ({
  ch: 2, kind: 'drip', state: alarms.length ? 'alarm' : 'running', programmed: { drugId: 'phenylephrine', concentration: P }, contents: { drugId: 'phenylephrine', concentration: P },
  syringeMl: null, set: 20, mode: 'rate', rate: { rate: 60, unit: 'mL/h' }, rateMlH: 60, limitMl: 1, volumeMl: 99, infusedMl: 1, wasteMl: 0, timeToEmptyMin: null, alarms, tci: null,
});

describe('the Log\'s pump alarm lines', () => {
  it('raised at the engine\'s time, ended at the first rows without it; a new timeline starts with no edge', async () => {
    const hub = createInProcessHub();
    const h = hub.connect();
    const t: ManagedTransport = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    const stamp = createStamper(S, 'host-1');
    const send = async (body: unknown[]) => {
      h.send(stamp({ kind: 'event', body: body as never }));
      await tick();
    };
    const drugs = (at: number, alarms: PumpPanelRow['alarms']) => ({ type: 'drugs', t: at, drugs: [], volatile: null, macTotal: 0, pumps: [row(alarms)] });
    await send([{ type: 'style', skin: 's', theme: '', pumps: ['syringe', 'drip'] }, drugs(59, [])]);
    expect(link.rack).toEqual(['syringe', 'drip']);
    await send([{ type: 'pumpAlarm', t: 60.1, ch: 2, channel: 'drip', alarm: 'infusionComplete', programmed: 'phenylephrine' }, drugs(61, ['infusionComplete'])]);
    await send([drugs(62, ['infusionComplete']), drugs(75, [])]);
    expect(link.log.filter((x) => x.kind === 'alarm').map((x) => [x.simT, x.text])).toEqual([
      [60.1, 'Pump channel 2 (Phenylephrine): Infusion Complete'],
      [75, 'Pump channel 2 (Phenylephrine): Infusion Complete ended'],
    ]);
    expect(link.drugs?.pumps?.[0]?.alarms).toEqual([]);
    // a return to a bookmark: the restored engine's alarm is where the run went back to, not a new one
    await send([{ type: 'timeline', t: 50, cause: 'restore' }, drugs(50, ['infusionComplete'])]);
    expect(link.log.filter((x) => x.kind === 'alarm')).toHaveLength(2);
    expect(link.pumpAlarms.map((a) => a.id)).toEqual(['pump:2:infusionComplete']);
    link.close();
  });
});
