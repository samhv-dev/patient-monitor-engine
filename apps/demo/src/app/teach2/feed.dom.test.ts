// @vitest-environment happy-dom
// Plan instructor-peer-role.md P6 (§6): the host's view feed and the note path. The real AppSession (its HostSession,
// ScenarioDriver and record) with the host's own panel Link, and an instructor phone (a ControllerSession with role
// `instructor` and the PIN, and a remote Link) on a fake relay that passes every message between them as JSON; the
// monitor is a stand-in whose events the test emits (the sim clock moves with them). The MH card is driven to its
// treatment fan-out (hub "MH treatment under way" with its four spokes), the moment the plan measures the feed at.
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mh from '../showcase/showcase-mh.json';

const net = vi.hoisted(() => ({
  peers: [] as Array<{ fns: Array<(m: unknown) => void> }>,
  sent: [] as Array<{ at: number; m: unknown }>,
  mon: [] as Array<(e: unknown) => void>,
}));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  return {
    ...real,
    // A relay in a few lines: every message one peer sends reaches every other peer, as JSON
    createWebSocketTransport: (): ManagedTransport => {
      const me = { fns: [] as Array<(m: unknown) => void> };
      net.peers.push(me);
      return {
        kind: 'websocket',
        status: 'open',
        send: (m) => {
          net.sent.push({ at: Date.now(), m });
          const copy = JSON.stringify(m);
          for (const p of net.peers) if (p !== me) for (const fn of [...p.fns]) fn(JSON.parse(copy));
        },
        onMessage: (fn) => (me.fns.push(fn as (m: unknown) => void), () => void me.fns.splice(me.fns.indexOf(fn as (m: unknown) => void), 1)),
        onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => {}),
        close: () => void net.peers.splice(net.peers.indexOf(me), 1),
      };
    },
  };
});
vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  return {
    version: '0.0.0-test',
    mountMonitor: (el: HTMLElement, o: { skin: string }) => {
      let tick = 0;
      net.mon.length = 0;
      el.append(Object.assign(document.createElement('div'), { className: 'pme-monitor' }));
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick }),
        on: (fn: (e: unknown) => void) => (net.mon.push(fn), () => {}),
        snapshot: () => Promise.resolve({ schema: 'pme-snapshot/1', tick }),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick, simT: tick * 0.02 }),
        setTimeScale: () => {},
        pause: () => {},
        resume: () => {},
        setFps: () => {},
        enableSound: () => Promise.resolve(),
        disableSound: () => {},
        setSkin: () => Promise.resolve(),
        destroy: () => {},
        /** The test's clock: the engine's 1 Hz state at sim time `t` (core temperature over the Cool guard's 38.5; the
         *  EtCO₂ falling 1 mmHg every 2 s, so the hub's "Recovering: EtCO₂ below 45" row moves with the clock). */
        at: (t: number) => {
          tick = Math.round(t / 0.02);
          for (const fn of [...net.mon]) fn({ type: 'state', t, tick, mode: 'modeled', values: { hr: 120, tempCore: 39.2, etco2: Math.round(70 - t / 2) }, control: {} });
        },
      };
    },
  };
});

const { ControllerSession, VIEWER_EVENTS } = await import('@pme/controller');
const { AppSession } = await import('../session.ts');
const { Link } = await import('../link.ts');
const { boardOf, feedOf } = await import('./feed.ts');
const { judge, pressStep } = await import('./press.ts');
const { stageMarks } = await import('./strip.ts');
const { drugWords } = await import('../glossary.ts');
const { DEFAULT_SITE } = await import('../site.ts');
const { teach2View } = await import('../views/teach2.ts');
const { recognisedButton } = await import('../recognised.ts');
const { recognitionAt } = await import('../debrief-moments.ts');

const CODE = 'KFQB2N';
const PIN = '4729';
const spec = { ageY: 35, sex: 'M' as const, weightKg: 80, heightCm: 180, comorbid: [], attached: true };
const settle = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const feeds = () => net.sent.flatMap(({ at, m }) => ((m as WireMessage).kind === 'event' ? (m as Extract<WireMessage, { kind: 'event' }>).body.map((e) => ({ at, e })) : [])).filter((x) => x.e.type === 'instructorView');
const RECOGNITION = (mh.objectives as Array<{ text: string; debrief?: string }>).find((o) => o.debrief === 'recognition')?.text as string;

describe('P6: the view feed and the note path', () => {
  let s: InstanceType<typeof AppSession>;
  let hostLink: InstanceType<typeof Link>;
  let el: HTMLElement;
  const closers: Array<() => void> = [];
  const pin = { v: PIN as string | null };
  const clock = (t: number) => ((s.monitor as unknown as { at(t: number): void }).at(t));
  /** Run the wall clock (the driver polls at 10 Hz, the feed at 1 Hz) with the sim clock at `t`. */
  const run = async (t: number, ms = 400) => {
    clock(t);
    await vi.advanceTimersByTimeAsync(ms);
    await settle();
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    net.peers.length = 0;
    net.sent.length = 0;
    pin.v = PIN;
    document.body.replaceChildren();
    el = document.createElement('div');
    document.body.append(el);
    s = new AppSession(el, { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: CODE, relay: 'ws://relay.test/', instructorPin: () => pin.v });
    hostLink = new Link(s.panel, s.panelTransport, s);
    // as main.ts wires it
    s.serveInstructors({ note: (text, kind, t, ev) => hostLink.note(text, kind, t, ev), feed: () => feedOf(hostLink) });
    await settle();
  });
  afterEach(() => {
    for (const c of closers.splice(0)) c();
    s.lastLoad.catch(() => undefined);
    s.destroy();
    vi.useRealTimers();
  });

  /** An instructor phone that signs in with `p` now (a page opened or reloaded: a fresh session and Link). */
  async function phone(p = PIN) {
    const transport = (await import('@pme/controller')).createWebSocketTransport({ url: 'ws://relay.test/' });
    const ctl = new ControllerSession({ session: CODE, transport, role: 'instructor', pin: () => p });
    const link = new Link(ctl, transport, null);
    closers.push(() => (link.close(), ctl.close(), transport.close()));
    await vi.advanceTimersByTimeAsync(50);
    await settle();
    return { ctl, link };
  }

  /** The MH card at its treatment fan-out: the crisis called, the hub entered, one spoke (dantrolene) pressed from
   *  `by` and its 2-s hop back to the hub run. */
  async function fanOut(by: () => InstanceType<typeof Link>) {
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await run(1);
    const r = await hostLink.send({ type: 'scenario', action: 'goto', target: 'treating' });
    expect(r.accepted).toBe(true);
    await run(10);
    expect(hostLink.ctl.scenario.stateId).toBe('treating');
    await pressStep(by(), 'Dantrolene 2.5 mg/kg');
    await run(11);
    expect(hostLink.ctl.scenario.stateId).toBe('dantrolene');
    await run(14, 1200); // the spoke's afterS 2: back to the hub
    expect(hostLink.ctl.scenario.stateId).toBe('treating');
  }

  it("at the MH fan-out the phone's board() deep-equals the host's (list, finished, looks, rights, at), also after the phone's page reloads; without the feed a reloaded phone offers the dantrolene again", async () => {
    const first = await phone();
    expect(first.ctl.access.state).toBe('granted');
    await fanOut(() => first.link);
    await run(14, 1100); // the next feed
    const host = boardOf(hostLink);
    expect(host?.finished.map((r) => [r.row.kind === 'step' ? r.row.label : '', r.look])).toContainEqual(['Dantrolene 2.5 mg/kg', 'taken']);
    expect(first.link.viewNow()).not.toBeNull();
    expect(boardOf(first.link)).toEqual(host);

    // the phone's page reloads: its scenario history starts empty
    const again = await phone();
    expect(again.link.ctl.scenario.stateId).toBe('treating');
    const local = again.link.view;
    again.link.view = null; // as before P6: read from what the phone has
    const degraded = boardOf(again.link);
    expect(degraded?.list.map((r) => (r.row.kind === 'step' ? r.row.label : r.row.kind))).toContain('Dantrolene 2.5 mg/kg'); // the hazard
    again.link.view = local;
    await run(14, 1100);
    expect(again.link.viewNow()).not.toBeNull();
    expect(boardOf(again.link)).toEqual(boardOf(hostLink));
    expect(boardOf(again.link)?.list.map((r) => (r.row.kind === 'step' ? r.row.label : r.row.kind))).not.toContain('Dantrolene 2.5 mg/kg');

    // the feed's size at that moment (plan §6: ≤ 16 KB) [ENG]
    const sizes = feeds().map((x) => JSON.stringify(x.e).length);
    const last = sizes.at(-1) as number;
    console.log(`[P6] instructorView at the MH fan-out: ${last} bytes (largest so far ${Math.max(...sizes)}; board ${JSON.stringify(feedOf(hostLink).board).length} bytes)`);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(16 * 1024);
  });

  it('the feed goes only while an instructor is granted, at most once a second, only on a change', async () => {
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await run(1);
    await hostLink.send({ type: 'scenario', action: 'goto', target: 'treating' });
    await run(1, 3000);
    expect(feeds(), 'no phone: no feed').toHaveLength(0);
    const p = await phone('0000');
    expect(p.ctl.access.state).toBe('denied');
    await run(1, 3000);
    expect(feeds(), 'a wrong PIN: no feed').toHaveLength(0);

    await phone();
    s.setPaused(true); // nothing changes while paused
    await run(1, 4000);
    expect(feeds(), 'one body on the grant, none while nothing changes').toHaveLength(1);
    s.setPaused(false);
    for (let t = 2; t < 12; t += 0.25) await run(t, 250); // the clock runs: the A row's EtCO₂ moves every 2 s of sim
    const at = feeds().map((x) => x.at);
    expect(at.length).toBeGreaterThan(2);
    for (let i = 1; i < at.length; i++) expect((at[i] as number) - (at[i - 1] as number)).toBeGreaterThanOrEqual(1000);
    const bodies = feeds().map((x) => JSON.stringify((x.e as { body: unknown }).body));
    for (let i = 1; i < bodies.length; i++) expect(bodies[i], 'each one changed').not.toBe(bodies[i - 1]);

    pin.v = '1111';
    s.host.instructorPinChanged(); // every grant revoked
    const n = feeds().length;
    await run(13, 3000);
    expect(feeds(), 'revoked: no more').toHaveLength(n);
  });

  it("the feed is instructor-only: its one event type is never in VIEWER_EVENTS, and no event a learner's copy keeps carries its body", async () => {
    const p = await phone();
    await fanOut(() => p.link);
    await run(14, 1100);
    expect(feeds().length).toBeGreaterThan(0);
    expect(VIEWER_EVENTS.has('instructorView')).toBe(false);
    const learnerKept = net.sent.flatMap(({ m }) => ((m as WireMessage).kind === 'event' ? (m as Extract<WireMessage, { kind: 'event' }>).body : [])).filter((e: WireEvent) => VIEWER_EVENTS.has(e.type));
    expect(learnerKept.some((e) => /"finished"|"offCard"|"marks"/.test(JSON.stringify(e)))).toBe(false);
  });

  it("a phone's judged objective lands in the host's record.data.rows as the laptop's does (same text, same kind), once, in its log and on its board", async () => {
    const p = await phone();
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await run(5);
    const rows = () => s.record.data.rows.filter((r) => r.text === `Objective met: ${drugWords(RECOGNITION)}`);
    judge(p.link, RECOGNITION);
    await run(6);
    expect(rows()).toHaveLength(1);
    expect(hostLink.log.filter((x) => x.kind === 'marker' && x.text === `Objective met: ${drugWords(RECOGNITION)}`)).toHaveLength(1);
    judge(hostLink, RECOGNITION); // the laptop's own press, for the comparison
    await run(7);
    const [phoneRow, laptopRow] = rows();
    expect(phoneRow).toMatchObject({ kind: 'note', text: laptopRow?.text });
    expect(laptopRow?.kind).toBe('note');
    expect(Object.keys(phoneRow ?? {}).sort()).toEqual(Object.keys(laptopRow ?? {}).sort());
    // no second row for the command itself (record.ts files a remote's commands as `remote` rows)
    expect(s.record.data.rows.filter((r) => r.kind === 'remote')).toHaveLength(0);
  });

  it("the phone's Recognised press on a free run (brief 52) files the laptop's own row { kind: note, text, ev: recognised } at the host's sim time, once, and the Debrief's recognitionAt reads it", async () => {
    const p = await phone();
    await run(20);
    s.setPaused(true); // the host's clock holds while the note crosses
    await run(20, 400);
    expect(s.record.data.doc ?? null, 'a free run').toBeNull();
    // P6's `t`: the host files a remote's note at its own sim-time estimate when it applies the command (HostSession
    // onNote; AppSession.simNow), which runs on the wall clock past the last 1 Hz state the laptop's Link shows
    const at = s.simNow();
    const onPhone = recognisedButton(p.link, 'btn small');
    expect(onPhone.el.hidden, 'the form shows on the phone').toBe(false);
    onPhone.el.click();
    await vi.advanceTimersByTimeAsync(50);
    await settle();
    const pressed = () => s.record.data.rows.filter((r) => r.kind === 'note' && r.ev === 'recognised');
    expect(pressed()).toEqual([{ t: at, kind: 'note', text: 'Recognised (instructor)', ev: 'recognised' }]);
    expect(s.record.data.keeps).toContain('recognised');
    expect(recognitionAt(s.record.data)).toMatchObject({ source: 'press', t: at });
    expect(hostLink.log.filter((x) => x.ev === 'recognised'), "in the host's log once").toHaveLength(1);
    // no second row for the command itself (record.ts files a remote's commands as `remote` rows)
    expect(s.record.data.rows.filter((r) => r.kind === 'remote')).toHaveLength(0);
    recognisedButton(hostLink, 'btn small').el.click(); // the laptop's own press, for the comparison
    await settle();
    const [fromPhone, fromLaptop] = pressed();
    expect(fromLaptop?.t).toBe(hostLink.simT); // the laptop stamps its press with its Link's time
    expect({ ...fromPhone, t: 0 }, 'the same row but its time').toEqual({ ...fromLaptop, t: 0 });
  });

  it('stage marks are placed while an instructor is granted with the laptop on the Monitor view (no Instructor v2 shown), and the phone returns by their labels', async () => {
    const p = await phone();
    await fanOut(() => p.link);
    await run(14, 1100);
    expect(s.driver.stageMarks().length).toBeGreaterThan(0);
    const entries = feedOf(hostLink).entries;
    const past = entries.slice(0, -1).find((e) => stageMarks.of(hostLink, e) !== null);
    expect(past, 'a past stage with a mark').toBeTruthy();
    expect(stageMarks.of(p.link, past as never)).toBe(stageMarks.of(hostLink, past as never));
  });

  it("the host's own Instructor v2 renders byte-identically with and without the feed (its outerHTML at a fixed paused state)", async () => {
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await run(1);
    await hostLink.send({ type: 'scenario', action: 'goto', target: 'treating' });
    await run(10);
    s.setPaused(true);
    await hostLink.send({ type: 'time', action: 'pause' });
    s.endBriefing(); // its countdown runs on the wall clock
    await run(10, 1500);
    const v = teach2View(hostLink, { site: DEFAULT_SITE, weightKg: () => 80, loadScenario: () => true });
    document.body.append(v.el);
    closers.push(() => v.destroy());
    v.enter?.('');
    await run(10, 1500);
    v.enter?.('');
    const without = v.el.outerHTML;
    await run(10, 50);
    v.enter?.('');
    expect(v.el.outerHTML, 'the fixed state draws the same twice').toBe(without);
    await phone();
    await run(10, 50);
    expect(feeds().length, 'the feed runs').toBeGreaterThan(0);
    v.enter?.('');
    const withFeed = v.el.outerHTML;
    const at = [...withFeed].findIndex((c, i) => c !== without[i]);
    expect(at < 0 ? '' : `${without.slice(Math.max(0, at - 120), at + 80)}\n≠\n${withFeed.slice(Math.max(0, at - 120), at + 80)}`).toBe('');
    expect(withFeed).toBe(without);
  });
});
