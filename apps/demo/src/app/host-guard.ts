// Post-demo (4 November): one instructor tab per session. The demo night test opened the app's address in a second tab
// of the same browser (no `?session=`): it started a NEW session with a new code, silently, and every phone that had
// joined the first one was left following a tab nobody looked at. Now the instructor's page learns which sessions this
// browser's other tabs host before it starts one, and when there is one it offers "open that tab's session here" or
// "start a new session". Opening it here is a hand-over, not a second host of the same code (the relay refuses a second
// host while the first answers, server.ts): the other tab gives its kept position (the running case, position.ts: what a
// reload restores) and stops; this tab starts under the same code with that case, and the phones and learner monitors
// that follow the code find it as after a reload of the instructor's page.
// How a tab's session is known (5 November): from the browser, not from the other tab. A hosting tab holds a Web Lock
// named for its code (HOST_LOCK + code) for as long as it hosts; the browser releases it when the tab stops, closes or
// crashes. A new tab asks the browser's lock manager which host locks are held (`navigator.locks.query()`), and the
// browser answers whether or not the holder's page is running: a background tab the browser has suspended or throttled
// (Safari ≈ 4 min hidden, hidden-tab.ts; WebKit in CI did not answer the old 200 ms ask) is still seen. Before this the
// new tab asked over the channel and waited ASK_MS, so a tab that was asleep was missed and a new code started.
// The hand-over still needs the other tab's page (only it can read its kept position: sessionStorage is the tab's own),
// so it goes over the BroadcastChannel: the new tab asks, and waits for the answer for as long as the browser says that
// tab still hosts the code. The message waits in a sleeping tab's queue; when the tab runs again (shown, or unfrozen) it
// answers with its position and stops. Past TAKE_MS the instructor is told the other tab is asleep and may start here
// at once under the same code, without its case (the sleeping tab then stops when it wakes: the newer tab runs it).
// A tab that starts hosting a code says so on the channel, and any other tab hosting that same code stops.
// Fallback: no Web Locks (Safari < 15.4, Chrome < 69, Firefox < 96, or a page that is not a secure context: the kit's
// instructor page is 127.0.0.1, which is one; an instructor's page opened at the laptop's network address is not) —
// the tabs are asked over the channel as before, and a tab asleep then is not seen: the new tab starts its own session.
// Not covered on either path: another browser or computer (the lock manager and the channel are this browser's).

import { button, h } from './ui.ts';

export const HOSTS_CHANNEL = 'pme.hosts';
/** The Web Lock a hosting tab holds, by code: `pme.host.QFBAWA`. */
export const HOST_LOCK = 'pme.host.';
/** How long a starting instructor page waits for the other tabs to answer, ms, on the fallback path (no Web Locks). A
 *  same-browser round trip takes a few ms [ENG]; this is the delay the check adds to every start of the page there. */
export const ASK_MS = 200;
/** How long it waits for the chosen tab to hand its session over before it says that tab is asleep, ms [ENG]; without
 *  Web Locks, how long before it gives up and starts with no case. */
export const TAKE_MS = 2000;

type Msg =
  | { kind: 'who' }
  | { kind: 'here'; code: string }
  | { kind: 'take'; code: string }
  | { kind: 'given'; code: string; kept: Record<string, string> };

type Channel = { postMessage(m: Msg): void; close(): void; onmessage: ((e: MessageEvent) => void) | null };
const open = (): Channel | null => {
  try {
    return new BroadcastChannel(HOSTS_CHANNEL) as Channel;
  } catch {
    return null; // No BroadcastChannel: no other tab can be asked
  }
};
/** The browser's lock manager; null without Web Locks (an old browser, or a page that is not a secure context). */
const locks = (): LockManager | null => (typeof navigator !== 'undefined' && navigator.locks) || null;

/** The codes of the sessions hosted in this browser's other tabs: with Web Locks the browser's answer (held host locks,
 *  awake or not); without them (fallback), the tabs that answer the channel within `waitMs`. */
export async function liveHosts(waitMs = ASK_MS): Promise<string[]> {
  const l = locks();
  if (l) {
    const { held = [] } = await l.query();
    return [...new Set(held.map((x) => x.name ?? '').filter((n) => n.startsWith(HOST_LOCK)).map((n) => n.slice(HOST_LOCK.length)))];
  }
  const c = open();
  if (!c) return [];
  const codes: string[] = [];
  c.onmessage = (e) => {
    const m = e.data as Msg;
    if (m?.kind === 'here' && !codes.includes(m.code)) codes.push(m.code);
  };
  c.postMessage({ kind: 'who' });
  return new Promise((done) => setTimeout(() => (c.close(), done(codes)), waitMs));
}

/** Ask the tab hosting `code` to hand it over: its kept position (storage key → value; {} when it kept none), or null
 *  when there is none to have. With Web Locks it waits while the browser says that tab hosts `code` (a sleeping tab
 *  answers when it runs again) and ends with null when the tab is gone without answering; past `waitMs` it calls
 *  `slow(code, without)` (default: the notice below), `without()` ending the wait with null at once, and `slow`'s return
 *  takes its notice down. Without Web Locks (fallback) it ends with null at `waitMs`. */
export function takeOver(code: string, waitMs = TAKE_MS, slow: (code: string, without: () => void) => () => void = waitNotice): Promise<Record<string, string> | null> {
  const c = open();
  if (!c) return Promise.resolve(null);
  const l = locks();
  return new Promise((done) => {
    const stop = new AbortController();
    let dismiss: (() => void) | undefined;
    let t: ReturnType<typeof setTimeout> | undefined;
    const end = (v: Record<string, string> | null) => {
      if (stop.signal.aborted) return;
      stop.abort(); // withdraws the wait for the lock below
      clearTimeout(t);
      dismiss?.();
      c.close();
      done(v);
    };
    t = setTimeout(() => (l ? (dismiss = slow(code, () => end(null))) : end(null)), waitMs);
    c.onmessage = (e) => {
      const m = e.data as Msg;
      if (m?.kind === 'given' && m.code === code) end(m.kept);
    };
    c.postMessage({ kind: 'take', code });
    // Granted once no tab holds the host lock any more: the tab stopped, closed or crashed. A tab that answered posted
    // its answer before it let go, but the browser does not order a channel message against a lock release, so an
    // answer already sent is given ASK_MS (a same-browser hop takes a few ms) to arrive before this ends with none.
    l?.request(HOST_LOCK + code, { signal: stop.signal }, async () => void (t = setTimeout(() => end(null), ASK_MS))).catch(() => undefined);
  });
}

/** The wait for a sleeping tab, told to the instructor (a modal dialog: Escape does not choose). Returns its remover. */
export function waitNotice(code: string, without: () => void): () => void {
  const d = h('dialog', { class: 'host-wait', 'aria-labelledby': 'hw-t', 'aria-describedby': 'hw-b' },
    h('h2', { id: 'hw-t' }, `Waiting for the other tab to hand over its session (code ${code})`),
    h('p', { id: 'hw-b' }, 'That tab is asleep: the browser stops a tab that stays in the background. Click that tab once and the session moves here with its case. Or start it here now, with the same code but without its case: the phones come here, and the other tab stops when it wakes.'),
    h('div', { class: 'actions' }, button('Start here without its case', () => without(), 'ghost')));
  d.addEventListener('cancel', (e) => e.preventDefault());
  document.body.append(d);
  d.showModal();
  return () => d.remove();
}

/** This tab hosts `code`: hold its host lock, say so, answer the other tabs' question, and on a hand-over request (or
 *  another tab starting the same code) give `kept()` and call `gone()`, which must stop this page hosting. Returns a
 *  stopper. The lock is shared: in a hand-over both tabs hold it until the older one stops. */
export function announceHost(code: string, d: { kept(): Record<string, string>; gone(): void }): () => void {
  let quitted = false;
  let release = (): void => undefined;
  locks()?.request(HOST_LOCK + code, { mode: 'shared' }, () => (quitted ? undefined : new Promise<void>((r) => (release = r)))).catch(() => undefined);
  const c = open();
  const quit = () => ((quitted = true), release(), c?.close());
  if (!c) return quit;
  const stop = () => {
    quit();
    d.gone();
  };
  c.onmessage = (e) => {
    const m = e.data as Msg;
    if (m?.kind === 'who') c.postMessage({ kind: 'here', code });
    else if (m?.kind === 'take' && m.code === code) {
      c.postMessage({ kind: 'given', code, kept: d.kept() });
      stop();
    } else if (m?.kind === 'here' && m.code === code) stop(); // a newer tab runs this session
  };
  c.postMessage({ kind: 'here', code });
  return quit;
}

/** Which session a starting instructor page runs. `param`: its `?session=` code (null: none). A live session in another
 *  tab is offered when this page has no code of its own, or has that same code (a duplicated tab); a page reloaded
 *  under its own other code is not asked. `ask` puts the choice to the instructor. Resolves with the code to run (null:
 *  a new one) and, after a hand-over, the other tab's kept position. */
export async function chooseHostSession(param: string | null, ask: (code: string) => Promise<'join' | 'new'>, o: { hosts?: () => Promise<string[]>; take?: (code: string) => ReturnType<typeof takeOver> } = {}): Promise<{ code: string | null; kept: Record<string, string> | null }> {
  const live = await (o.hosts ?? liveHosts)();
  const other = param ? live.find((c) => c === param) : live[0];
  if (!other) return { code: param, kept: null };
  if ((await ask(other)) === 'new') return { code: null, kept: null };
  return { code: other, kept: await (o.take ?? takeOver)(other) };
}

/** The choice, put to the instructor (a modal dialog: Escape does not choose). */
export function askJoin(code: string): Promise<'join' | 'new'> {
  return new Promise((done) => {
    const pick = (v: 'join' | 'new') => () => d.close(v);
    const d = h('dialog', { class: 'host-guard', 'aria-labelledby': 'hg-t', 'aria-describedby': 'hg-b' },
      h('h2', { id: 'hg-t' }, `A classroom session is already running in another tab (code ${code})`),
      h('p', { id: 'hg-b' }, 'The phones that joined it follow that tab. Open that session here: that tab stops and its case continues in this one, with the same code. Or start a new session with a new code: phones that joined the other one stay with it.'),
      h('div', { class: 'actions' },
        button('Start a new session', pick('new'), 'ghost'),
        button("Open that tab's session here", pick('join'), 'primary')));
    d.addEventListener('cancel', (e) => e.preventDefault());
    d.addEventListener('close', () => {
      d.remove();
      done(d.returnValue === 'new' ? 'new' : 'join');
    });
    document.body.append(d);
    d.showModal();
  });
}
