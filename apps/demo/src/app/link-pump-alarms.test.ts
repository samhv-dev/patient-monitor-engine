// The Log's pump alarm lines: on the host the Link writes a line when the engine raises a channel's alarm (at the event's
// time) and when a command clears it (at the command's tick, unless the engine refuses the command when it applies it),
// names the alarms raised during a fast-forward in its end line, and after a return to a bookmark says at once, from the
// state the return restored, which alarms stand and which do not. A remote writes the host's lines from its feed, each
// at the host's time, and shows the host's standing alarms.
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import type { PumpPanelRow } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';
import { emptyRun } from './record.ts';
import type { RestoredReading } from './restored-state.ts';
import type { AppSession } from './session.ts';

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

function rig(onHost = true) {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t: ManagedTransport = hub.connect();
  let restored: (r: RestoredReading) => void = () => undefined;
  const host = { onMount: () => () => undefined, onRestored: (fn: typeof restored) => ((restored = fn), () => undefined), deviceLabel: () => '', record: { note: () => undefined, data: emptyRun() } } as unknown as AppSession;
  const link = new Link(new ControllerSession({ session: S, transport: t }), t, onHost ? host : null);
  const stamp = createStamper(S, 'host-1');
  let n = 0;
  /** Send the host's events and wait until the Link has taken the last of them: a scenario state event sent after them,
   *  which the Link takes in order and writes as a line. */
  const send = (body: unknown[]) => new Promise<void>((done) => {
    const states = () => link.log.filter((x) => x.kind === 'scenario').length;
    const want = states() + 1;
    const off = link.onChange(() => {
      if (states() < want) return;
      off();
      done();
    });
    h.send(stamp({ kind: 'event', body: [...body, { type: 'scenario', t: 0, stateId: `m${++n}` }] as never }));
  });
  const lines = () => link.log.filter((x) => x.kind === 'alarm' || x.kind === 'system').map((x) => [x.simT, x.text]);
  return { link, send, lines, restore: (r: RestoredReading) => restored(r) };
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

  it('after a return to a bookmark, the case paused: at once, from the restored state, which alarms stand and which do not', async () => {
    const { link, send, lines, restore } = rig();
    await send([drugs(59, [])]);
    await send([raised(60.1), drugs(61, ['infusionComplete'])]);
    restore({ t: 30, amounts: {}, pumps: [row([])] }); // no panel follows: the case stays paused
    await send([{ type: 'timeline', t: 30, tick: 1500, cause: 'restore' }]);
    expect(lines().at(-1)).toEqual([30, `${ALARM}: not standing after the return to the bookmark`]);
    expect(link.pumpAlarms).toEqual([]);
    expect(link.drugs?.pumps?.[0]?.alarms).toEqual([]);
    await send([raised(80), drugs(81, ['infusionComplete']), start(4100), drugs(83, [])]);
    restore({ t: 81, amounts: {}, pumps: [row(['infusionComplete'])] });
    await send([{ type: 'timeline', t: 81, tick: 4050, cause: 'restore' }]);
    expect(lines().at(-1)).toEqual([81, `${ALARM}: standing after the return to the bookmark`]);
    expect(link.pumpAlarms.map((a) => a.id)).toEqual(['pump:2:infusionComplete']);
    link.close();
  });

  it('a clearing command the engine refuses when it applies: no "ended", no second raise', async () => {
    const { link, send, lines } = rig();
    await send([drugs(59, [])]);
    await send([raised(60.1), drugs(61, ['infusionComplete'])]);
    await send([start(3510), { type: 'pumpRefused', t: 70.2, ch: 2, action: 'start', reason: 'the limit is reached' }, drugs(71, ['infusionComplete'])]);
    expect(lines()).toEqual([[60.1, ALARM]]);
    expect(link.pumpAlarms.map((a) => a.id)).toEqual(['pump:2:infusionComplete']);
    link.close();
  });

  it('a remote writes the host\'s pump lines from its feed, each at the host\'s time and once, and shows the host\'s standing alarms', async () => {
    const { link, send } = rig(false);
    const feed = (pumpLog: Array<{ t: number; text: string }>, standing: boolean) => ({ type: 'instructorView', t: 0, body: { pumpLog, pumpAlarms: standing ? [{ id: 'pump:2:infusionComplete', ch: 2, alarm: 'infusionComplete', text: ALARM }] : [] } });
    await send([feed([{ t: 60.1, text: ALARM }], true)]);
    expect(link.pumpAlarms.map((a) => a.text)).toEqual([ALARM]);
    // a phone that was away while the alarm ended: the line comes with the host's time, not the reconnection's
    await send([feed([{ t: 60.1, text: ALARM }, { t: 70.2, text: `${ALARM} ended` }], false)]);
    expect(link.log.filter((x) => x.pump).map((x) => [x.simT, x.text])).toEqual([[60.1, ALARM], [70.2, `${ALARM} ended`]]);
    expect(link.pumpAlarms).toEqual([]);
    link.close();
  });
});
