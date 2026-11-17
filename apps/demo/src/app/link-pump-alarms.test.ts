// The Log's pump alarm lines: the Link writes a line when the engine raises a channel's alarm (at the event's time) and
// when a command clears it (at the command's tick), names the alarms raised during a fast-forward in its end line, and
// after a return to a bookmark says which alarms stand and which do not in the restored engine.
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import type { PumpPanelRow } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';

const S = 'LNK235';
const P = { amount: 100, unit: 'mcg' as const, perMl: 1 };
const ALARM = 'Pump channel 2 (Phenylephrine): Infusion Complete';
const row = (alarms: PumpPanelRow['alarms']): PumpPanelRow => ({
  ch: 2, kind: 'drip', state: alarms.length ? 'alarm' : 'running', programmed: { drugId: 'phenylephrine', concentration: P }, contents: { drugId: 'phenylephrine', concentration: P },
  syringeMl: null, set: 20, mode: 'rate', rate: { rate: 60, unit: 'mL/h' }, rateMlH: 60, limitMl: 1, volumeMl: 99, infusedMl: 1, wasteMl: 0, timeToEmptyMin: null, alarms, tci: null,
});
const drugs = (t: number, alarms: PumpPanelRow['alarms']) => ({ type: 'drugs', t, drugs: [], volatile: null, macTotal: 0, pumps: [row(alarms)] });
const raised = (t: number) => ({ type: 'pumpAlarm', t, ch: 2, channel: 'drip', alarm: 'infusionComplete', programmed: 'phenylephrine' });
const start = (tick: number) => ({ type: 'commandApplied', commandId: `s${tick}`, tick, resolved: { command: { id: `s${tick}`, type: 'applyEvent', event: { kind: 'pump', action: 'start', ch: 2 } } } });

function rig() {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t: ManagedTransport = hub.connect();
  const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
  const stamp = createStamper(S, 'host-1');
  let n = 0;
  /** Send the host's events and wait until the Link has taken the last of them: a host view body (a remote keeps it)
   *  sent after them, which the Link takes in order. */
  const send = (body: unknown[]) => new Promise<void>((done) => {
    const mark = `m${++n}`;
    const off = link.onChange(() => {
      if ((link.view as unknown as { mark?: string } | null)?.mark !== mark) return;
      off();
      done();
    });
    h.send(stamp({ kind: 'event', body: [...body, { type: 'instructorView', t: 0, body: { mark } }] as never }));
  });
  const lines = () => link.log.filter((x) => x.kind === 'alarm' || x.kind === 'system').map((x) => [x.simT, x.text]);
  return { link, send, lines };
}

describe("the Log's pump alarm lines", () => {
  it('raised at the event\'s time, ended at the clearing command\'s tick; raised again within the second, a second line', async () => {
    const { link, send, lines } = rig();
    await send([drugs(59, [])]);
    await send([raised(60.1), drugs(61, ['infusionComplete']), start(3510), raised(70.5), drugs(71, ['infusionComplete'])]);
    expect(lines()).toEqual([[60.1, ALARM], [70.2, `${ALARM} ended`], [70.5, ALARM]]);
    link.close();
  });

  it('a fast-forward\'s end line names the pump alarms raised during it', async () => {
    const { link, send, lines } = rig();
    await send([drugs(59, [])]);
    await send([
      { type: 'fastForward', phase: 'start', t: 59, fromT: 59, toT: 359 },
      raised(120.4), drugs(121, ['infusionComplete']),
      { type: 'fastForward', phase: 'end', t: 359, fromT: 59, toT: 359, alarms: [] },
    ]);
    expect(lines().at(-1)).toEqual([359, `Fast-forward ended; pump alarms during it: ${ALARM} 02:00`]);
    link.close();
  });

  it('after a return to a bookmark: an alarm of the abandoned course is said not standing, one standing again is said standing', async () => {
    const { link, send, lines } = rig();
    await send([drugs(59, [])]);
    await send([raised(60.1), drugs(61, ['infusionComplete'])]);
    await send([{ type: 'timeline', t: 30, tick: 1500, cause: 'restore' }, drugs(30, [])]);
    expect(lines().at(-1)).toEqual([30, `${ALARM}: not standing after the return to the bookmark`]);
    expect(link.pumpAlarms).toEqual([]);
    await send([raised(80), drugs(81, ['infusionComplete']), start(4100), drugs(83, [])]);
    await send([{ type: 'timeline', t: 81, tick: 4050, cause: 'restore' }, drugs(81, ['infusionComplete'])]);
    expect(lines().at(-1)).toEqual([81, `${ALARM}: standing after the return to the bookmark`]);
    expect(link.pumpAlarms.map((a) => a.id)).toEqual(['pump:2:infusionComplete']);
    link.close();
  });
});
