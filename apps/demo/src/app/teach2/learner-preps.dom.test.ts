// @vitest-environment happy-dom
// Plan learner-action-remote.md L9 ("Tests first"; §4 D7, LQ3 ruled): the instructor's card of what the learner remotes
// staged, on the laptop's dock and on the instructor's phone, over the REAL host (HostSession on the shipped formulary):
// the laptop is a ControllerSession on the host's own transport, the instructor's phone a ControllerSession signed in
// with the instructor PIN on another (the relay's stand-in), the learner remote a raw peer signed in with the learner
// PIN. The card shows within the host tick that staged it, on both; the press reaches the remote once, from either; a
// Give before it is given and the card says so; clean preparations are listed collapsed.
import { ControllerSession, createInProcessHub, createStamper, HostSession, type Formulary, type HostTarget, type ManagedTransport, type WireEvent, type WireMessage } from '@pme/controller';
import type { DispatchResult } from '@pme/engine-core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadShippedFormulary } from '../formulary.ts';
import { Link } from '../link.ts';
import { mountLearnerPreps, PREPS_WORDS } from './learner-preps.ts';

const S = 'LPC234';
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
const KEY = 'bed2remote01';
let F: Formulary;
beforeAll(async () => {
  F = (await loadShippedFormulary()) as Formulary;
  expect(F).not.toBeNull();
});

const closers: Array<() => void> = [];
afterEach(() => {
  for (const c of closers.splice(0)) c();
  document.body.replaceChildren();
});
const until = async (ok: () => boolean, what: string): Promise<void> => {
  for (let i = 0; i < 300 && !ok(); i++) await new Promise((r) => setTimeout(r, 5));
  if (!ok()) throw new Error(`timed out: ${what}`);
};

/** The host on a clock the test moves (`at(s)`), its laptop Link, the instructor phone's Link, and a learner remote. */
async function room() {
  let tick = 0;
  const dispatched: unknown[] = [];
  const target: HostTarget = {
    dispatch: (c): DispatchResult => (dispatched.push(c), { accepted: true, tick }),
    dispatchGroup: (cs) => cs.map((c) => target.dispatch(c) as DispatchResult),
    snapshot: () => ({ schema: 'x', tick }) as never,
    restore: () => undefined,
    on: () => () => undefined,
    now: () => ({ tick, simT: tick * 0.02 }),
    time: () => undefined,
  };
  const host = new HostSession({
    session: S, target, stateIntervalMs: 0, instructorPin: () => INSTRUCTOR_PIN, learnerPin: () => LEARNER_PIN, formulary: () => F,
    deviceName: (k) => (k === KEY ? 'Bed 2' : null),
  });
  closers.push(() => host.close());
  const laptopHub = createInProcessHub();
  host.addTransport(laptopHub.connect());
  const laptopT = laptopHub.connect();
  const laptopCtl = new ControllerSession({ session: S, transport: laptopT });
  const laptop = new Link(laptopCtl, laptopT, null);
  const relayHub = createInProcessHub();
  host.addTransport(relayHub.connect());
  const phoneT = relayHub.connect();
  const phoneCtl = new ControllerSession({ session: S, transport: phoneT, issuedBy: 'remote', role: 'instructor', pin: () => INSTRUCTOR_PIN });
  const phone = new Link(phoneCtl, phoneT, null);
  closers.push(() => (laptop.close(), phone.close(), laptopCtl.close(), phoneCtl.close()));
  await until(() => phoneCtl.access.state === 'granted', 'the phone granted');
  // the learner remote: a raw peer on the relay's side
  const lrT: ManagedTransport = relayHub.connect();
  const got: WireMessage[] = [];
  lrT.onMessage((m) => void got.push(m));
  const st = createStamper(S, 'lr.1');
  let n = 0;
  lrT.send(st({ kind: 'hello', role: 'learner', show: 'learner', device: KEY, pin: LEARNER_PIN } as never));
  await until(() => got.some((m) => m.kind === 'grant' && m.to === 'lr.1' && m.granted), 'the learner granted');
  const send = async (body: Record<string, unknown>) => {
    const id = `lr.1-${++n}`;
    lrT.send(st({ kind: 'command', body: { id, issuedBy: 'learner-page', ...body } as never }));
    await until(() => got.some((m) => m.kind === 'ack' && m.commandId === id), `ack ${id}`);
    return got.find((m) => m.kind === 'ack' && m.commandId === id) as Extract<WireMessage, { kind: 'ack' }>;
  };
  const notices = () => got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e): e is Extract<WireEvent, { type: 'prep' }> => e.type === 'prep' && e.to === 'lr.1' && (e.body as { news: string }).news === 'notice');
  const cards = () => {
    const a = mountLearnerPreps(laptop, { formulary: () => F });
    const b = mountLearnerPreps(phone, { formulary: () => F, inline: true });
    document.body.append(a.el, b.el);
    closers.push(a.destroy, b.destroy);
    return { laptop: a.el, phone: b.el };
  };
  return { host, laptop, phone, send, notices, cards, dispatched, at: (s: number) => void (tick = Math.round(s / 0.02)), tick: () => tick };
}

// sodium bicarbonate 8.4 % 10 mL + epinephrine 1 mg/mL 1 mL in one syringe: Stabilis says incompatible (the shipped entry)
const BICARB_EPI = { type: 'prep', action: 'stage', prep: { id: 'bicepi01', components: [{ productId: 'sodium-bicarbonate-84mg-ml', amount: 10, unit: 'mL' }, { productId: 'adrenalin-1mg-ml', amount: 1, unit: 'mL' }], container: 'syringe-pp' } };
const FENTANYL = (id: string) => ({ type: 'prep', action: 'stage', prep: { id, components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' } });

describe('L9: the staging card on the laptop and on the instructor phone', () => {
  it('appears within the host tick of the staging, on both, with the finding and its sources and ONE control', async () => {
    const r = await room();
    const c = r.cards();
    expect(c.laptop.hidden).toBe(true);
    r.at(60);
    const t0 = r.tick();
    expect((await r.send(BICARB_EPI)).accepted).toBe(true);
    await until(() => !c.laptop.hidden && !c.phone.hidden, 'both cards');
    expect(r.tick()).toBe(t0); // the host's clock has not moved: shown within the tick that staged it
    for (const el of [c.laptop, c.phone]) {
      const card = el.querySelector('.lp-card[data-prep="bicepi01"]') as HTMLElement;
      expect(card.querySelector('.lp-what')?.textContent).toMatch(/^Bed 2 remote staged Sodium bicarbonate 8\.4 % 10 mmol \+ Epinephrine 1 mg, one syringe, 11 mL$/);
      const row = card.querySelector('.lp-finding[data-kind="incompatible"]') as HTMLElement;
      expect(row.textContent).toBe('Incompatible: Stabilis (epinephrine monograph): NaHCO3 as solvent degrades epinephrine. (Stabilis Epinephrine hydrochloride (Monographie.php?IdMolecule=106); Trissel 2013 PDF p. 1859 (page stamp 1839) agrees)');
      expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual([PREPS_WORDS.show]);
    }
    expect(r.notices()).toHaveLength(0); // nothing reaches the learner before the press
    expect(r.dispatched).toHaveLength(0);
  });

  it('pressed on the laptop: the remote gets the notice once; both cards read "Notice shown at"; the phone\'s later press is refused', async () => {
    const r = await room();
    const c = r.cards();
    r.at(60);
    await r.send(BICARB_EPI);
    await until(() => !c.laptop.hidden && !c.phone.hidden, 'both cards');
    r.at(75);
    (c.laptop.querySelector('.lp-show') as HTMLButtonElement).click();
    await until(() => r.notices().length === 1, 'the notice at the remote');
    await until(() => c.phone.querySelector('.lp-shown') !== null, 'the phone card updated');
    for (const el of [c.laptop, c.phone]) {
      expect(el.querySelector('.lp-shown')?.textContent).toBe('Notice shown at 01:15');
      expect(el.querySelector('.lp-show')).toBeNull();
    }
    expect(r.host.preparation(KEY, 'bicepi01')?.notice).toEqual({ shownAt: 75 });
    const again = await r.phone.send({ type: 'prep', action: 'notice', by: KEY, prepId: 'bicepi01' });
    expect(again).toMatchObject({ accepted: false, reason: 'the notice was shown at 01:15' });
    expect(r.notices()).toHaveLength(1);
  });

  it('pressed on the phone: the same, once', async () => {
    const r = await room();
    const c = r.cards();
    r.at(30);
    await r.send(BICARB_EPI);
    await until(() => !c.phone.hidden, 'the phone card');
    r.at(42);
    (c.phone.querySelector('.lp-show') as HTMLButtonElement).click();
    await until(() => c.laptop.querySelector('.lp-shown') !== null, 'the laptop card updated');
    expect(c.laptop.querySelector('.lp-shown')?.textContent).toBe('Notice shown at 00:42');
    expect(r.notices()).toHaveLength(1);
  });

  it('a Give before the press is given; the card says "given at mm:ss, notice not shown", and the control stays', async () => {
    const r = await room();
    const c = r.cards();
    r.at(60);
    await r.send(BICARB_EPI);
    r.at(200);
    expect((await r.send({ type: 'prep', action: 'deliver', prepId: 'bicepi01', volumeMl: 2, route: 'iv' })).accepted).toBe(true);
    await until(() => c.laptop.querySelector('.lp-fate') !== null && c.phone.querySelector('.lp-fate') !== null, 'the fate line');
    for (const el of [c.laptop, c.phone]) expect(el.querySelector('.lp-fate')?.textContent).toBe('given at 03:20, notice not shown');
    expect(c.laptop.querySelector('.lp-show')).not.toBeNull();
    expect(r.host.preparation(KEY, 'bicepi01')?.notice).toBeNull();
  });

  it('clean preparations are listed collapsed ("2 preparations, no finding"); with only clean ones there is no control', async () => {
    const r = await room();
    const c = r.cards();
    r.at(10);
    await r.send(FENTANYL('fent0001'));
    await r.send(FENTANYL('fent0002'));
    await until(() => !c.laptop.hidden && (c.laptop.querySelector('.lp-clean-sum')?.textContent ?? '').startsWith('2'), 'the clean line');
    for (const el of [c.laptop, c.phone]) {
      expect(el.querySelector('.lp-clean-sum')?.textContent).toBe('2 preparations, no finding');
      expect((el.querySelector('.lp-clean') as HTMLDetailsElement).open).toBe(false);
      expect(el.querySelectorAll('.lp-clean-row')).toHaveLength(2);
      expect(el.querySelectorAll('.lp-card, button')).toHaveLength(0);
    }
    await r.send(BICARB_EPI);
    await until(() => c.laptop.querySelector('.lp-card') !== null, 'the finding card');
    expect(c.laptop.querySelector('.lp-clean-sum')?.textContent).toBe('2 preparations, no finding');
  });

  it("the Link takes the instructor's copy only, and a new timeline empties the board", async () => {
    const r = await room();
    r.at(5);
    await r.send(FENTANYL('fent0003'));
    await until(() => r.phone.preps.entries.length === 1 && r.laptop.preps.entries.length === 1, 'both boards');
    expect(r.phone.preps.entries[0]?.prep).toMatchObject({ by: KEY, name: 'Bed 2', findings: [] });
    r.host.newTimeline('restart');
    await until(() => r.laptop.preps.entries.length === 0 && r.phone.preps.entries.length === 0, 'the boards emptied');
  });
});
