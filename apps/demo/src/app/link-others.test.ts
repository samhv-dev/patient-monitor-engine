// Brief 164: the host's Log (the Log sheet draws `link.log`) names what ANOTHER device had applied: a learner remote's
// give (with the name Room setup gave the phone), the defibrillator window's press and the instructor phone's command,
// at the tick the host applied it. Before, only the laptop's own presses (`Link.send`) wrote a line, so a phone's Give
// reached the engine and the record but the instructor saw nothing in the Log ("not delivered to the laptop model").
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';
import type { AppSession } from './session.ts';

const S = 'LNK234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const NAMES: Record<string, string> = { bed2remote01: 'bed 2 remote' };
/** The host's AppSession as the Link reads it: its remount hook and the names Room setup keeps. */
const hostStub = { onMount: () => () => undefined, deviceName: (key: string) => NAMES[key] ?? null, record: { note: () => undefined } } as unknown as AppSession;

function host(app: AppSession | null = hostStub) {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t: ManagedTransport = hub.connect();
  const link = new Link(new ControllerSession({ session: S, transport: t }), t, app);
  const stamp = createStamper(S, 'host-1');
  let n = 0;
  const applied = (command: Record<string, unknown>, extra: Record<string, unknown> = {}, id = `other-${++n}`) =>
    h.send(stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: id, tick: 1500, resolved: { command: { id, ...command }, ...extra } }] as never }));
  return { link, applied };
}
const ephedrine = { type: 'applyEvent', event: { kind: 'drug', drugId: 'ephedrine', dose: 50, unit: 'mg', route: 'iv' } };

describe("the host's Log names a command another device had applied", () => {
  it("a learner remote's give, at the tick applied, with the phone's Room-setup name", async () => {
    const { link, applied } = host();
    applied({ ...ephedrine, issuedBy: 'learner', by: 'bed2remote01', prepId: 'p1' });
    applied({ ...ephedrine, issuedBy: 'learner', by: 'unnamed00001', prepId: 'p2' });
    await tick();
    expect(link.log.map((e) => [e.simT, e.kind, e.text])).toEqual([
      [30, 'learner', 'Ephedrine 50 mg IV (learner remote: bed 2 remote)'],
      [30, 'learner', 'Ephedrine 50 mg IV (learner remote)'],
    ]);
    link.close();
  });

  it("the defibrillator window's press and the instructor phone's command", async () => {
    const { link, applied } = host();
    applied({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 }, issuedBy: 'learner', by: 'defibwin0001' });
    applied({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' }, issuedBy: 'remote' });
    await tick();
    expect(link.log.map((e) => e.kind)).toEqual(['learner', 'instructor']);
    expect(link.log[0]?.text).toMatch(/\(defibrillator window\)$/);
    expect(link.log[1]?.text).toBe("Epinephrine 1 mg IV (instructor's phone)");
    link.close();
  });

  it("not this link's own command (logged with its ack), a replay, a cockpit frame, the card's own or the ventilator's", async () => {
    const { link, applied } = host();
    applied({ ...ephedrine, issuedBy: 'controller:x' }, {}, `${link.ctl.peerId}-1`);
    applied({ ...ephedrine, issuedBy: 'learner', by: 'bed2remote01' }, { replay: true });
    applied({ ...ephedrine, issuedBy: 'learner', by: 'bed2remote01' }, { mirror: true });
    applied({ ...ephedrine, issuedBy: 'scenario' });
    applied({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator' }, issuedBy: 'ventilator' });
    await tick();
    expect(link.log).toEqual([]);
    link.close();
  });

  it('a remote page (no AppSession) is unchanged: its Log stays its own presses', async () => {
    const { link, applied } = host(null);
    applied({ ...ephedrine, issuedBy: 'learner', by: 'bed2remote01' });
    await tick();
    expect(link.log).toEqual([]);
    link.close();
  });
});
