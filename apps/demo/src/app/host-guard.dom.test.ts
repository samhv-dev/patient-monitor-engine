// @vitest-environment happy-dom
// Post-demo: a second instructor tab of the same browser does not start a new session silently (host-guard.ts). Host A
// lives on the channel; a new tab without `?session=` is asked; "Open that tab's session here" runs A's code with A's
// kept case, and A stops; "Start a new session" runs a new code and A carries on.
// Two paths: with Web Locks (the browser says which tabs host a session, awake or not: a small lock manager stands in
// for the browser's here, happy-dom has none) and without them (the fallback: the tabs are asked over the channel).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announceHost, askJoin, chooseHostSession, HOST_LOCK, HOSTS_CHANNEL, liveHosts, takeOver } from './host-guard.ts';
import { keepRoomCode, keepsRoomCode, startCode, storedRoomCode } from './room-code.ts';

const stops: Array<() => void> = [];
afterEach(() => {
  for (const s of stops.splice(0)) s();
  document.body.replaceChildren();
  setLocks(undefined);
  vi.unstubAllGlobals();
});

/** Host A: a tab running session `code` with a kept case; `gone` counts its stops. */
function hostA(code: string) {
  const a = { gone: 0 };
  stops.push(announceHost(code, { kept: () => ({ 'pme.position': `{"code":"${code}"}` }), gone: () => void a.gone++ }));
  return a;
}
/** The prompt, answered by its button once shown. */
const answer = (label: RegExp) => async (code: string) => {
  const p = askJoin(code);
  const d = document.querySelector('dialog.host-guard') as HTMLDialogElement;
  expect(d).not.toBeNull();
  expect(d.textContent).toContain(`already running in another tab (code ${code})`);
  ([...d.querySelectorAll('button')].find((b) => label.test(b.textContent ?? '')) as HTMLButtonElement).click();
  return p;
};
const until = async (f: () => boolean) => {
  for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 10));
};
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** A lock manager of one browser (the Web Locks API's request/query, shared and exclusive modes, AbortSignal): what the
 *  browser keeps for every tab whether its page runs or not. */
function fakeLocks() {
  type Req = { name: string; mode: LockMode; go: () => void };
  const held: Array<{ name: string; mode: LockMode }> = [];
  const queue: Req[] = [];
  const grantable = (r: Req) => !held.some((l) => l.name === r.name && (l.mode === 'exclusive' || r.mode === 'exclusive'));
  const pump = () => {
    for (const r of [...queue]) {
      if (queue.some((q) => q !== r && q.name === r.name && queue.indexOf(q) < queue.indexOf(r))) continue; // FIFO per name
      if (!grantable(r)) continue;
      queue.splice(queue.indexOf(r), 1);
      r.go();
    }
  };
  const request = (name: string, opts: LockOptions, cb: (l: Lock | null) => Promise<unknown>) =>
    new Promise((done, fail) => {
      const mode = opts.mode ?? 'exclusive';
      const r: Req = {
        name, mode,
        go: () => {
          const l = { name, mode };
          held.push(l);
          void Promise.resolve(cb(l as Lock)).then(done, fail).finally(() => (held.splice(held.indexOf(l), 1), pump()));
        },
      };
      opts.signal?.addEventListener('abort', () => {
        const i = queue.indexOf(r);
        if (i >= 0) (queue.splice(i, 1), fail(new DOMException('aborted', 'AbortError')));
      });
      queue.push(r);
      pump();
    });
  return { request, query: async () => ({ held: held.map((l) => ({ ...l })), pending: queue.map((q) => ({ name: q.name, mode: q.mode })) }), held };
}
function setLocks(l: ReturnType<typeof fakeLocks> | undefined) {
  Object.defineProperty(navigator, 'locks', { value: l, configurable: true });
}
/** A tab that hosts `code` and is asleep: the browser holds its host lock, its page answers nothing. `wake(kept)`: it
 *  runs again, reads the hand-over request it was sent, and gives its position. `close()`: the tab is closed. */
function sleepingHost(l: ReturnType<typeof fakeLocks>, code: string) {
  let close!: () => void;
  void l.request(HOST_LOCK + code, { mode: 'shared' }, () => new Promise<void>((r) => (close = r)));
  const c = new BroadcastChannel(HOSTS_CHANNEL);
  const inbox: unknown[] = [];
  let awake = false;
  c.onmessage = (e) => {
    inbox.push(e.data); // queued, not answered, while the page does not run
    if (awake && e.data.kind === 'got') close(); // the receipt: it stops
  };
  stops.push(() => c.close());
  return {
    inbox,
    close: () => close(),
    wake: (kept: Record<string, string>) => {
      awake = true;
      if (inbox.some((m) => (m as { kind: string }).kind === 'take')) c.postMessage({ kind: 'given', code, kept });
    },
  };
}

describe.each([
  ['with Web Locks', () => setLocks(fakeLocks())],
  ['without Web Locks (the fallback: the channel ask)', () => setLocks(undefined)],
])('second instructor tab, %s', (_name, setup) => {
  beforeEach(setup);

  it('no other host: no prompt, the page keeps its own code (null: a new one)', async () => {
    let asked = 0;
    const r = await chooseHostSession(null, async () => (asked++, 'new'));
    expect([asked, r]).toEqual([0, { code: null, kept: null }]);
  });

  it('host A live, a new tab without ?session: the prompt; "open that session" = the same code, with its case', async () => {
    const a = hostA('QFBAWA');
    let shown = 0;
    const r = await chooseHostSession(null, async (c) => (shown++, answer(/Open that tab/)(c)));
    expect(shown).toBe(1);
    expect(r).toEqual({ code: 'QFBAWA', kept: { 'pme.position': '{"code":"QFBAWA"}' } });
    await until(() => a.gone > 0);
    expect(a.gone).toBe(1); // A stopped: one host per code
  });

  it('"start a new session" = a new code; host A carries on', async () => {
    const a = hostA('QFBAWA');
    const r = await chooseHostSession(null, answer(/Start a new/));
    expect(r).toEqual({ code: null, kept: null });
    await tick(50);
    expect(a.gone).toBe(0);
  });

  it('a duplicated tab (same ?session) is asked; a tab of another session is not', async () => {
    hostA('QFBAWA');
    let asked = 0;
    const ask = async () => (asked++, 'new' as const);
    expect((await chooseHostSession('KXRMTP', ask)).code).toBe('KXRMTP');
    expect(asked).toBe(0);
    await chooseHostSession('QFBAWA', ask);
    expect(asked).toBe(1);
  });

  // Room plan R1: the bare address starts under the stored room code, so a second tab while the first runs it is asked
  // as a duplicated tab is; "Start a new session" there runs a code for that tab alone and the room keeps its code (§4 D3)
  it('the room code stored and live in tab A: a new tab without ?session is asked about it; "start a new session" does not replace the stored code', async () => {
    // this browser's storage (Node's own localStorage global, without --localstorage-file, stands in front of happy-dom's)
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) });
    keepRoomCode('QFBAWA');
    const a = hostA('QFBAWA');
    const asked: string[] = [];
    let said: 'join' | 'new' | null = null;
    const start = startCode({ param: null, stored: storedRoomCode() });
    expect(start).toBe('QFBAWA');
    const r = await chooseHostSession(start, async (c) => (asked.push(c), (said = await answer(/Start a new/)(c))));
    expect(asked).toEqual(['QFBAWA']);
    expect(r).toEqual({ code: null, kept: null });
    expect(keepsRoomCode({ param: null, answer: said })).toBe(false);
    expect(storedRoomCode()).toBe('QFBAWA');
    await tick(50);
    expect(a.gone).toBe(0);
  });

  it('a tab that starts hosting a code stops the other tab hosting it', async () => {
    const a = hostA('QFBAWA');
    hostA('QFBAWA');
    await until(() => a.gone > 0);
    expect(a.gone).toBe(1);
  });

  it('a host that stopped is no longer offered', async () => {
    const a = hostA('QFBAWA');
    stops.pop()!();
    await tick(); // a lock's release reaches the lock manager after the page lets go (in a browser too)
    expect(await liveHosts(50)).toEqual([]);
    expect(a.gone).toBe(0);
  });
});

describe('a host tab that is asleep (the browser runs none of its page: a background tab)', () => {
  it('with Web Locks it is offered at once, from the browser; the hand-over completes when it wakes', async () => {
    const l = fakeLocks();
    setLocks(l);
    const a = sleepingHost(l, 'QFBAWA');
    const t0 = performance.now();
    expect(await liveHosts()).toEqual(['QFBAWA']);
    expect(performance.now() - t0).toBeLessThan(50); // the lock manager's answer, not a wait for the tab
    let slow = 0;
    const r = takeOver('QFBAWA', 30, () => (slow++, () => undefined));
    await tick(80);
    expect(slow).toBe(1); // past the wait: the instructor is told the tab is asleep; nothing has started
    expect(a.inbox).toContainEqual({ kind: 'take', code: 'QFBAWA' });
    a.wake({ 'pme.position': '{"code":"QFBAWA"}' });
    expect(await r).toEqual({ 'pme.position': '{"code":"QFBAWA"}' });
    await until(() => !l.held.length);
    expect(l.held).toEqual([]); // it let go on the receipt
  });

  it('with Web Locks, an answer delivered after the lock is let go still hands the case over (no timing between them)', async () => {
    const l = fakeLocks();
    setLocks(l);
    const a = sleepingHost(l, 'QFBAWA');
    const r = takeOver('QFBAWA', 10, () => () => undefined);
    await tick(20);
    // The old tab answers and the new tab has not read it yet: the old tab still holds its lock (it waits for the
    // receipt), so the wait does not end with no case however late the message is read
    a.wake({ 'pme.position': '{"code":"QFBAWA"}' });
    expect(l.held.map((x) => x.name)).toEqual([HOST_LOCK + 'QFBAWA']);
    expect(await r).toEqual({ 'pme.position': '{"code":"QFBAWA"}' });
  });

  it('a new tab that goes away mid-hand-over leaves the old tab hosting', async () => {
    const a = hostA('QFBAWA');
    const c = new BroadcastChannel(HOSTS_CHANNEL);
    stops.push(() => c.close());
    const got: unknown[] = [];
    c.onmessage = (e) => void got.push(e.data);
    c.postMessage({ kind: 'take', code: 'QFBAWA' }); // and never sends the receipt
    await until(() => got.length > 0);
    await tick(50);
    expect(got).toContainEqual({ kind: 'given', code: 'QFBAWA', kept: { 'pme.position': '{"code":"QFBAWA"}' } });
    expect(a.gone).toBe(0);
  });

  it('with Web Locks, a host tab closed before it answered: the hand-over ends with no case', async () => {
    const l = fakeLocks();
    setLocks(l);
    const a = sleepingHost(l, 'QFBAWA');
    let settled = false;
    const r = takeOver('QFBAWA', 30, () => () => undefined).finally(() => (settled = true));
    await tick(80);
    expect(settled).toBe(false); // asleep, not gone: still waiting past the wait
    a.close();
    expect(await r).toBeNull();
  });

  it('with Web Locks, the instructor may start without the sleeping tab\'s case', async () => {
    const l = fakeLocks();
    setLocks(l);
    sleepingHost(l, 'QFBAWA');
    let dismissed = 0;
    const r = takeOver('QFBAWA', 10, (_c, without) => (setTimeout(without, 40), () => void dismissed++));
    expect(await r).toBeNull();
    expect(dismissed).toBe(1); // the notice is taken down
    expect(l.held.filter((x) => x.mode === 'exclusive')).toEqual([]); // its wait for the lock is withdrawn
  });

  it('without Web Locks it is not seen: the channel ask has no answer within ASK_MS (the gap the fallback keeps)', async () => {
    setLocks(undefined);
    const l = fakeLocks(); // the sleeping tab's lock, kept where this page cannot see it
    sleepingHost(l, 'QFBAWA');
    expect(await liveHosts(30)).toEqual([]);
    expect(await takeOver('QFBAWA', 30)).toBeNull();
  });
});
