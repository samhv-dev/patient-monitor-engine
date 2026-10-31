// @vitest-environment happy-dom
// The Case briefing (owner's board Orientation 7b, 30 October): when a card with a `briefing` loads, the learners'
// monitor — the host's Monitor view and every phone following it — shows the briefing over the running monitor for
// `durationS` seconds (the title, the estimated time, the paragraphs, a footer counting down), then fades into the
// monitor; a tap or click ends it on that screen only; the instructor's "End briefing" (today's Instructor view; v2's
// status line under the stage strip, the owner's choice of 31 October) ends it everywhere; a phone that
// joins while it runs shows the remainder. A card without a briefing shows nothing. Persian (`lang: 'fa'`): rtl, the
// reviewed chrome strings, Persian digits.
// The real AppSession and HostSession, and the real follower, on a fake relay that passes every message between them;
// the monitors are stand-ins (no worker, no canvas here).
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mh from './showcase/showcase-mh.json';

const net = vi.hoisted(() => ({
  peers: [] as Array<{ fns: Array<(m: unknown) => void> }>,
  sent: [] as unknown[],
  pauses: 0,
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
          net.sent.push(m);
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
    mountMonitor: (el: HTMLElement, o: { skin: string; role?: string }) => {
      let tick = 0;
      if (o.role === 'viewer') {
        const clock = {
          restore: (s: { tick: number }) => void (tick = s.tick), dispatch: () => ({ accepted: true, tick }), on: () => () => {},
          renderT: () => tick * 0.02, tick: () => tick, setRate: () => {}, setPaused: () => {}, jumpTo: () => {},
        };
        return { soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, setSkin: () => Promise.resolve(), disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false };
      }
      el.append(Object.assign(document.createElement('div'), { className: 'pme-monitor' }));
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick: ++tick }),
        on: () => () => {},
        snapshot: () => Promise.resolve({ schema: 'pme-snapshot/1', tick }),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick, simT: tick * 0.02 }),
        setTimeScale: () => {},
        pause: () => void net.pauses++,
        resume: () => {},
        enableSound: () => Promise.resolve(),
        destroy: () => {},
      };
    },
  };
});
vi.mock('./panel/panel.ts', () => ({ mountPanel: () => ({ el: document.createElement('div'), select: () => {} }) }));

const { AppSession } = await import('./session.ts');
const { mountHostBriefing } = await import('./briefing.ts');
const { mountFollower } = await import('./views/follower.ts');
const { DEFAULT_SITE } = await import('./site.ts');
const { teachView } = await import('./views/teach.ts');
const { mount: mountStrip } = await import('./teach2/strip.ts');

const CODE = 'KKQB2N';
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const card = (id: string, briefing?: unknown) => ({
  schema: 'pme-scenario/1', id, title: id, initialState: 'a', states: [{ id: 'a', label: 'A' }], ...(briefing ? { briefing } : {}),
});
const FA = {
  text: 'شما رزیدنت بیهوشی در اتاق عمل هستید.\n\nبه مانیتور نگاه کنید.',
  estimatedMinutes: 25, durationS: 60, lang: 'fa',
};
const briefings = () => (net.sent as WireMessage[]).flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e: WireEvent) => e.type === 'briefing');
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** A learners' screen: the shell's stage (the monitor host inside it) under a Monitor-view main. */
function screen(): { main: HTMLElement; stage: HTMLElement; monitorHost: HTMLElement; layer: () => HTMLElement | null } {
  const main = document.createElement('main');
  main.className = 'main';
  main.dataset.route = 'monitor';
  const monitorHost = document.createElement('div');
  monitorHost.className = 'monitor-host';
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.append(monitorHost);
  main.append(stage);
  document.body.append(main);
  return { main, stage, monitorHost, layer: () => stage.querySelector<HTMLElement>('.case-briefing:not(.cb-out)') };
}

describe('the Case briefing', () => {
  let s: InstanceType<typeof AppSession>;
  let host: ReturnType<typeof screen>;
  const followers: Array<{ destroy(): void }> = [];
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    net.peers.length = 0;
    net.sent.length = 0;
    net.pauses = 0;
    document.body.replaceChildren();
    host = screen();
    s = new AppSession(host.monitorHost, { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: CODE, relay: 'ws://relay.test/' });
    mountHostBriefing(host.stage, s);
    await settle();
  });
  afterEach(() => {
    for (const f of followers.splice(0)) f.destroy();
    s.lastLoad.catch(() => undefined); // a load still unanswered when the page closes
    s.destroy();
    vi.useRealTimers();
  });

  /** A phone that opens the learner address now. */
  async function phone(): Promise<ReturnType<typeof screen>> {
    const p = screen();
    const bar = document.createElement('div');
    p.main.append(bar);
    followers.push(mountFollower({ stage: p.stage, monitorHost: p.monitorHost } as never, DEFAULT_SITE, CODE, bar, { relay: 'ws://relay.test/' }));
    await vi.advanceTimersByTimeAsync(50); // its viewer clock, its hello, the host's answer
    await settle();
    return p;
  }

  it('a card load with a briefing shows it over the running monitor: title, estimated time, paragraphs, footer', async () => {
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await settle();
    const el = host.layer();
    expect(el, 'the layer shows').toBeTruthy();
    const b = mh.briefing as { text: string };
    expect(text(el?.querySelector('.cb-title'))).toBe('Case briefing');
    expect(text(el?.querySelector('.cb-est'))).toBe('Estimated scenario time about 25 minutes');
    expect([...(el?.querySelectorAll('.cb-p') ?? [])].map(text)).toEqual(b.text.split(/\n\s*\n/).map((x) => x.replace(/\s+/g, ' ').trim()));
    expect(el?.querySelectorAll('.cb-p')).toHaveLength(2);
    expect([...(el?.querySelectorAll('.cb-foot > span') ?? [])].map(text)).toEqual(['The monitor appears in 1:00', 'Tap or click anywhere to continue now']);
    expect(el?.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Case briefing');
    expect(el?.getAttribute('dir')).toBe('ltr');
    // the monitor stays under it, dimmed, never paused
    expect(host.stage.dataset.briefing).toBe('on');
    expect(host.monitorHost.isConnected && !host.monitorHost.hidden).toBe(true);
    expect(host.monitorHost.querySelector('.pme-monitor')).toBeTruthy();
  });

  it('counts the seconds down and fills the bottom line; after durationS it fades out and is gone; the monitor kept running', async () => {
    s.loadScenario(mh);
    await settle();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(text(host.layer()?.querySelector('.cb-count'))).toBe('0:48');
    expect(parseFloat((host.layer()?.querySelector('.cb-fill') as HTMLElement).style.width)).toBeCloseTo(20, 0);
    await vi.advanceTimersByTimeAsync(47_000);
    expect(text(host.layer()?.querySelector('.cb-count'))).toBe('0:01');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(host.layer(), 'gone at 60 s').toBeNull();
    expect(host.stage.dataset.briefing).toBeUndefined();
    await vi.advanceTimersByTimeAsync(600);
    expect(host.stage.querySelector('.case-briefing'), 'faded out and removed').toBeNull();
    expect(s.paused).toBe(false);
    expect(net.pauses).toBe(0);
    expect(s.briefing).toBeNull();
  });

  it('a click ends it on that screen only', async () => {
    s.loadScenario(mh);
    await settle();
    const p = await phone();
    expect(p.layer(), 'the phone shows it').toBeTruthy();
    p.layer()?.click();
    expect(p.layer()).toBeNull();
    expect(host.layer(), 'the host still shows it').toBeTruthy();
    expect(s.briefing).not.toBeNull();
    host.layer()?.click();
    expect(host.layer()).toBeNull();
  });

  it('a card without a briefing shows nothing and sends nothing; a briefing running ends with that load', async () => {
    s.loadScenario(card('plain'));
    await settle();
    expect(host.stage.querySelector('.case-briefing')).toBeNull();
    expect(briefings()).toEqual([]);
    s.loadScenario(mh);
    await settle();
    expect(host.layer()).toBeTruthy();
    s.loadScenario(card('plain'));
    await settle();
    expect(host.layer()).toBeNull();
    expect(briefings().at(-1)).toMatchObject({ ended: true });
  });

  it('a Persian card renders rtl with the reviewed chrome strings and Persian digits', async () => {
    s.loadScenario(card('fa-card', FA));
    await settle();
    await vi.advanceTimersByTimeAsync(12_000);
    const el = host.layer() as HTMLElement;
    expect(el.getAttribute('dir')).toBe('rtl');
    expect(el.getAttribute('lang')).toBe('fa');
    expect(text(el.querySelector('.cb-title'))).toBe('معرفی سناریو');
    expect(text(el.querySelector('.cb-est'))).toBe('زمان تقریبی سناریو: حدود ۲۵ دقیقه');
    expect([...el.querySelectorAll('.cb-foot > span')].map(text)).toEqual(['مانیتور تا ۰:۴۸ دیگر نمایش داده می‌شود', 'برای ادامه، هر جای صفحه را لمس یا کلیک کنید']);
    expect(el.querySelectorAll('.cb-p')).toHaveLength(2);
    // the monitor's own labels stay as they are
    expect(host.monitorHost.closest('[dir="rtl"]')).toBeNull();
    const p = await phone();
    expect(text(p.layer()?.querySelectorAll('.cb-foot > span')[1] ?? null)).toBe('برای ادامه، هر جای صفحه را لمس کنید');
  });

  it('reaches the phones with its start time: a phone that joins mid-briefing shows the remainder', async () => {
    s.loadScenario(mh);
    await settle();
    const first = briefings()[0] as Extract<WireEvent, { type: 'briefing' }>;
    expect(first).toMatchObject({ durationS: 60, estimatedMinutes: 25, lang: 'en', text: (mh.briefing as { text: string }).text });
    expect(typeof first.startedAt).toBe('number');
    await vi.advanceTimersByTimeAsync(20_000);
    const p = await phone();
    const el = p.layer();
    expect(el, 'the late phone shows it').toBeTruthy();
    expect(text(el?.querySelector('.cb-count'))).toBe('0:40');
    expect([...(el?.querySelectorAll('.cb-foot > span') ?? [])].map(text)).toEqual(['The monitor appears in 0:40', 'Tap anywhere to continue now']);
    expect(el?.dataset.phone).toBe('');
    await vi.advanceTimersByTimeAsync(40_000);
    expect(p.layer(), 'it ends with the host').toBeNull();
    // after the briefing a phone that joins shows nothing
    const late = await phone();
    expect(late.stage.querySelector('.case-briefing')).toBeNull();
  });

  it("the instructor's End briefing (today's view and v2's status line) ends it on the host and every phone", async () => {
    const teach = teachView({ host: s } as never, { site: DEFAULT_SITE, main: document.createElement('main'), stage: document.createElement('div'), weightKg: () => 70, loadScenario: () => true });
    const nav = document.createElement('nav');
    const strip = mountStrip(nav, { link: { ctl: { scenario: { doc: null } }, host: s }, keys: { escape: () => () => undefined } } as never);
    const todays = () => teach.el.querySelector<HTMLElement>('.cb-end');
    const status = () => nav.querySelector<HTMLElement>('.ip2-status');
    const v2End = () => [...(status()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'End briefing') as HTMLButtonElement | undefined;
    expect(todays()?.hidden, 'no control without a briefing').toBe(true);
    expect(status()?.hidden, 'v2: no status line without a briefing').toBe(true);
    expect(nav.hasAttribute('data-briefing')).toBe(false);
    s.loadScenario(mh);
    await settle();
    const p = await phone();
    expect(p.layer()).toBeTruthy();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(todays()?.hidden).toBe(false);
    expect(text(todays())).toContain('0:59');
    // v2 (the owner's choice of 31 October): the status line under the strip carries it; the chips' row carries nothing
    expect(nav.querySelector('.cb-end'), 'no briefing element in the strip').toBeNull();
    expect(nav.hasAttribute('data-briefing')).toBe(true);
    expect(status()?.hidden).toBe(false);
    expect(text(status()?.querySelector('.ip2-status-text'))).toBe('Case briefing on every screen · 0:59 left');
    expect(v2End()).toBeTruthy();
    await vi.advanceTimersByTimeAsync(11_000);
    expect(text(status()?.querySelector('.ip2-status-text'))).toBe('Case briefing on every screen · 0:48 left');
    v2End()?.click();
    await settle();
    expect(host.layer()).toBeNull();
    expect(p.layer()).toBeNull();
    expect(briefings().at(-1)).toMatchObject({ ended: true });
    expect(todays()?.hidden).toBe(true);
    expect(status()?.hidden, 'the status line returns to its ordinary state').toBe(true);
    expect(nav.hasAttribute('data-briefing')).toBe(false);
    // a phone that joins now shows nothing
    const late = await phone();
    expect(late.stage.querySelector('.case-briefing')).toBeNull();
    strip.destroy();
  });

  it("v2's status line: the briefing's line goes when it ends by itself; a card without one never shows it", async () => {
    const nav = document.createElement('nav');
    const strip = mountStrip(nav, { link: { ctl: { scenario: { doc: null } }, host: s }, keys: { escape: () => () => undefined } } as never);
    const status = () => nav.querySelector<HTMLElement>('.ip2-status');
    s.loadScenario(card('plain'));
    await settle();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(status()?.hidden).toBe(true);
    expect(nav.hasAttribute('data-briefing')).toBe(false);
    s.loadScenario(mh);
    await settle();
    expect(status()?.hidden).toBe(false);
    expect(text(status()?.querySelector('.ip2-status-text'))).toBe('Case briefing on every screen · 1:00 left');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.briefing).toBeNull();
    expect(status()?.hidden).toBe(true);
    expect(nav.hasAttribute('data-briefing')).toBe(false);
    strip.destroy();
  });

  it('is not shown again by the load that restores a case after the instructor reloads the page', async () => {
    s.restoring = true;
    s.loadScenario(mh);
    s.restoring = false;
    await settle();
    expect(host.stage.querySelector('.case-briefing')).toBeNull();
    expect(briefings()).toEqual([]);
  });
});

describe("the MH demonstration card's briefing", () => {
  it('is the reviewed learner text, 25 minutes, 60 s, English, and never names the diagnosis', () => {
    expect(mh.briefing).toEqual({
      text: 'You are the anaesthesia resident in theatre. A fit 35-year-old man, 80 kg, is on the table for elective surgery: awake, monitored, breathing room air. He will be premedicated with midazolam and fentanyl, preoxygenated, induced with propofol and succinylcholine, intubated, and maintained on sevoflurane 2 % with the ventilator at 12 × 500; then surgery begins.\n\nWatch the monitor. Say what you see as it changes, and what you would do about it.',
      estimatedMinutes: 25, durationS: 60, lang: 'en',
    });
    expect(mh.briefing.text).not.toMatch(/hyperthermia|\bMH\b|malignant/i);
    // the card's patient and its first state, as the briefing says them
    expect(mh.patient).toMatchObject({ ageY: 35, sex: 'M', weightKg: 80 });
    expect(mh.initialState).toBe('awake');
  });

  it('is the only card of the library with a briefing', async () => {
    const { LIBRARY } = await import('./scenarios.ts');
    expect(LIBRARY.filter((c) => c.doc.briefing).map((c) => c.id)).toEqual(['showcase-mh']);
  });
});
