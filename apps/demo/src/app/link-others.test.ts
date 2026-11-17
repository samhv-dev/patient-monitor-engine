// Brief 164: the host's Log (the Log sheet draws `link.log`) names what ANOTHER device had applied: a learner remote's
// give (with the name Room setup gave the phone), the defibrillator window's press and the instructor phone's command,
// at the tick the host applied it. Before, only the laptop's own presses (`Link.send`) wrote a line, so a phone's Give
// reached the engine and the record but the instructor saw nothing in the Log ("not delivered to the laptop model").
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';
import { RunRecord } from './record.ts';
import type { AppSession } from './session.ts';

const S = 'LNK234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const NAMES: Record<string, string> = { bed2remote01: 'bed 2 remote' };
/** The host's AppSession as the Link reads it: its remount hook and its devices' names (its record's, as the app's). */
function stubOf(names: Record<string, string> = NAMES): AppSession {
  const record = new RunRecord(() => ({ patient: '', weightKg: 70 }), () => 0, () => null, (key) => names[key] ?? null);
  return { onMount: () => () => undefined, deviceLabel: (key: string, kind: 'learner' | 'pump' | 'defib') => record.label(key, kind), record: { note: () => undefined } } as unknown as AppSession;
}

function host(app: AppSession | null = stubOf()) {
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
  it("a learner remote's give, at the tick applied, with the phone's Room-setup name, else its number", async () => {
    const { link, applied } = host();
    applied({ ...ephedrine, issuedBy: 'learner', by: 'bed2remote01', prepId: 'p1' });
    applied({ ...ephedrine, issuedBy: 'learner', by: 'unnamed00001', prepId: 'p2' });
    await tick();
    expect(link.log.map((e) => [e.simT, e.kind, e.text])).toEqual([
      [30, 'learner', 'Ephedrine 50 mg IV (bed 2 remote)'],
      [30, 'learner', 'Ephedrine 50 mg IV (Learner remote 2)'],
    ]);
    link.close();
  });

  it("the defibrillator window's press and the instructor phone's command", async () => {
    const { link, applied } = host();
    applied({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 }, issuedBy: 'learner', by: 'defibwin0001' });
    applied({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' }, issuedBy: 'remote' });
    await tick();
    expect(link.log.map((e) => e.kind)).toEqual(['learner', 'instructor']);
    expect(link.log[0]?.text).toMatch(/\(Defibrillator window 1\)$/);
    expect(link.log[1]?.text).toBe("Epinephrine 1 mg IV (instructor's phone)");
    link.close();
  });

  it("a pump tablet's press (pump rack C2): the channel's act, named by the tablet's Room-setup name, as a learner's line", async () => {
    const { link, applied } = host(stubOf({ pumptab0001: 'bed 2 pumps' }));
    const rate = { type: 'applyEvent', event: { kind: 'pump', ch: 2, action: 'rate', rate: 30, unit: 'mL/h' }, pump: { ch: 2 } };
    applied({ ...rate, issuedBy: 'pump', by: 'pumptab0001' });
    applied({ type: 'applyEvent', event: { kind: 'pump', ch: 1, action: 'bolus', volumeMl: 2, rateMlH: 800 }, pump: { ch: 1 }, issuedBy: 'pump', by: 'pumptab0002' });
    // a remote's change routed to the channel (D9) stays the remote's line, naming the channel
    applied({ ...rate, issuedBy: 'learner', by: 'unnamed00001' });
    await tick();
    expect(link.log.map((e) => [e.simT, e.kind, e.text])).toEqual([
      [30, 'learner', 'Channel 2: rate 30 mL/h (bed 2 pumps)'],
      [30, 'learner', 'Channel 1: bolus 2 mL (Pump tablet 2)'],
      [30, 'learner', 'Channel 2: rate 30 mL/h (Learner remote 1)'],
    ]);
    link.close();
  });

  it('two unnamed remotes of one role are told apart, and keep their numbers; no device key is shown', async () => {
    const { link, applied } = host(stubOf({}));
    applied({ ...ephedrine, issuedBy: 'learner', by: 'phoneaaaa001' });
    applied({ ...ephedrine, issuedBy: 'learner', by: 'phonebbbb002' });
    applied({ ...ephedrine, issuedBy: 'learner', by: 'phoneaaaa001' });
    await tick();
    expect(link.log.map((e) => e.text)).toEqual(['Ephedrine 50 mg IV (Learner remote 1)', 'Ephedrine 50 mg IV (Learner remote 2)', 'Ephedrine 50 mg IV (Learner remote 1)']);
    expect(link.log.some((e) => /phone(aaaa|bbbb)/.test(e.text))).toBe(false);
    link.close();
  });

  it("an infusion's start, its rate change (with the rate it replaced) and its stop, from a remote and from a pump tablet", async () => {
    const { link, applied } = host(stubOf({}));
    const inf = (rate: number) => ({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'phenylephrine', rate, unit: 'mL/h' }, issuedBy: 'learner', by: 'phoneaaaa001' });
    applied(inf(10));
    applied({ ...inf(20), replaced: { rate: 10, rateUnit: 'mL/h', by: 'phoneaaaa001' } });
    applied({ ...inf(0), replaced: { rate: 20, rateUnit: 'mL/h', by: 'phoneaaaa001' } });
    const propofol = { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } };
    const pump = (action: string, o: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) =>
      applied({ type: 'applyEvent', event: { kind: 'pump', ch: 2, action, ...o }, pump: { ch: 2, contents: propofol, ...meta }, issuedBy: 'pump', by: 'pumptab0001' });
    pump('rate', { rate: 20, unit: 'mL/h' });
    pump('start');
    pump('rate', { rate: 30, unit: 'mL/h' }, { replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: 'pumptab0001' }] });
    pump('stop');
    await tick();
    expect(link.log.map((e) => e.text)).toEqual([
      'Phenylephrine 10 mL/h infusion started (Learner remote 1)',
      'Phenylephrine infusion rate changed from 10 to 20 mL/h (Learner remote 1)',
      'Phenylephrine infusion stopped (Learner remote 1)',
      'Channel 2 (Propofol): rate 20 mL/h (Pump tablet 1)',
      'Channel 2 (Propofol) started (Pump tablet 1)',
      'Channel 2 (Propofol): rate changed from 20 to 30 mL/h (Pump tablet 1)',
      'Channel 2 (Propofol) stopped (Pump tablet 1)',
    ]);
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
