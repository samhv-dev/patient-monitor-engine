// Post-demo (4 November): one instructor tab per session. The demo night test opened the app's address in a second tab
// of the same browser (no `?session=`): it started a NEW session with a new code, silently, and every phone that had
// joined the first one was left following a tab nobody looked at. Now the instructor's page asks this browser's other
// tabs, over a BroadcastChannel, which sessions they host before it starts one; when one answers it offers "open that
// tab's session here" or "start a new session". Opening it here is a hand-over, not a second host of the same code
// (the relay refuses a second host while the first answers, server.ts): the other tab gives its kept position (the
// running case, position.ts: what a reload restores) and stops; this tab starts under the same code with that case,
// and the phones and learner monitors that follow the code find it as after a reload of the instructor's page.
// A tab that starts hosting a code says so on the channel, and any other tab hosting that same code stops: of two
// tabs of one session, the newer runs it (a tab the browser had suspended stops when it wakes).
// Not covered: a tab the browser has suspended does not answer (Safari, ≈ 4 min hidden: hidden-tab.ts), so a new tab
// then starts a session of its own as before; another browser or computer is not asked (the channel is this browser's).

import { button, h } from './ui.ts';

export const HOSTS_CHANNEL = 'pme.hosts';
/** How long a starting instructor page waits for the other tabs to answer, ms. A same-browser round trip takes a few
 *  ms [ENG]; this is the delay the check adds to every start of the instructor's page. */
export const ASK_MS = 200;
/** How long it waits for the chosen tab to hand its session over, ms [ENG]. */
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

/** The codes of the sessions hosted in this browser's other tabs that answer within `waitMs`. */
export function liveHosts(waitMs = ASK_MS): Promise<string[]> {
  const c = open();
  if (!c) return Promise.resolve([]);
  const codes: string[] = [];
  c.onmessage = (e) => {
    const m = e.data as Msg;
    if (m?.kind === 'here' && !codes.includes(m.code)) codes.push(m.code);
  };
  c.postMessage({ kind: 'who' });
  return new Promise((done) => setTimeout(() => (c.close(), done(codes)), waitMs));
}

/** Ask the tab hosting `code` to hand it over: its kept position (storage key → value; {} when it kept none), or null
 *  when no tab answered within `waitMs`. */
export function takeOver(code: string, waitMs = TAKE_MS): Promise<Record<string, string> | null> {
  const c = open();
  if (!c) return Promise.resolve(null);
  return new Promise((done) => {
    const t = setTimeout(() => (c.close(), done(null)), waitMs);
    c.onmessage = (e) => {
      const m = e.data as Msg;
      if (m?.kind !== 'given' || m.code !== code) return;
      clearTimeout(t);
      c.close();
      done(m.kept);
    };
    c.postMessage({ kind: 'take', code });
  });
}

/** This tab hosts `code`: say so, answer the other tabs' question, and on a hand-over request (or another tab starting
 *  the same code) give `kept()` and call `gone()`, which must stop this page hosting. Returns a stopper. */
export function announceHost(code: string, d: { kept(): Record<string, string>; gone(): void }): () => void {
  const c = open();
  if (!c) return () => undefined;
  const stop = () => {
    c.close();
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
  return () => c.close();
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
