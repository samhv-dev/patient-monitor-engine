// Remote (research/13 §4.4): on the host screen, how to pair (the code, "open here", and a QR code only where another
// device can use it); in a window opened at #/remote, the instructor panel alone, joined by the 6-letter code. Without
// a relay the window is a same-browser Remote: a `controller` over the BroadcastChannel, trusted as every window of the
// laptop's browser is. With a relay (`?relay`, the Room page's instructor QR code) it is the instructor's PHONE (plan
// instructor-peer-role.md P7): a PIN form with a numeric keypad, then the role `instructor`, which the laptop grants
// when the PIN matches its own (the Room page shows it behind press-and-hold). The PIN is held in this page's memory
// only (Q3): the form has no name for it and never submits, so it is never in the address or the history, and the
// field is cleared at sign-in and when the page is left. The page says each state in words: signing in, wrong PIN,
// too many tries, taken over by another phone, the PIN changed, the instructor's computer restarted, and a kit that
// does not answer an instructor after 10 s. Signed in, it mounts today's panel, the placeholder the phone layout
// replaces. The Remote never runs an engine: it sends commands and reads state, as the controller's remote page does.
import { ControllerSession, createBroadcastChannelTransport, createStamper, createWebSocketTransport, INSTRUCTOR_REASONS, newPeerId, normalizeSessionCode, PIN_RE, type InstructorAccess, type ManagedTransport, type WireMessage } from '@pme/controller';
import { relayOf } from '../classroom.ts';
import { Link } from '../link.ts';
import { mountPanel } from '../panel/panel.ts';
import { pairingOf } from '../pairing.ts';
import { qrSvg } from '../qr.ts';
import { mountSessionBar } from '../sessionbar.ts';
import { mountFastForward } from '../fast-forward.ts';
import type { SiteProfile } from '../site.ts';
import { button, clock, h, input, setText, throttle } from '../ui.ts';
import type { View } from '../shell.ts';

const hashParam = (k: string): string | null => new URLSearchParams(location.hash.split('?')[1] ?? '').get(k);

/** Plan §1: an older kit's relay drops the instructor's hello and an older host never answers; the phone gives up [ENG]. */
export const GIVE_UP_MS = 10_000;
/** Plan §5: the phone drops a socket that heard nothing for 12 s and opens a new one (as the learner's phone does) [ENG]. */
export const INSTRUCTOR_LIVENESS_MS = 12_000;

/** The words of each state the instructor's phone can be in (plan P7). `at`: the case clock, mm:ss. */
export const PHONE_WORDS = {
  signingIn: "Signing in: waiting for the instructor's computer…",
  signedIn: (code: string) => `Signed in as the instructor's remote · ${code}`,
  signingInAgain: "Signing in again: waiting for the instructor's computer…",
  wrongPin: "Wrong PIN. Enter the PIN the instructor's computer shows on its Room page.",
  tooManyTries: 'Too many wrong PINs from this phone. Wait a minute, then enter the PIN again.',
  takenOver: (at: string) => `Taken over by another phone at ${at}. Enter the PIN to sign in again.`,
  pinChanged: "The PIN was changed on the instructor's computer. Enter the new PIN.",
  noPhone: "The instructor's computer does not take an instructor phone.",
  restarted: (at: string) => `The instructor's computer restarted at ${at}: presses still waiting for an answer were not given.`,
  kitTooOld: 'This classroom kit does not take an instructor phone. Use the kit from the same release as the app.',
  noHost: "The instructor's computer is not in this session: check the code, and that the app is open on the laptop.",
  unreachable: "This phone cannot reach the instructor's computer: check that it is on the same Wi-Fi, then try again.",
  badCode: 'Error: the code has 6 letters and digits, as shown on the Room page.',
  badPin: 'The PIN has 4 to 8 digits.',
} as const;

/** What the phone says for a refusal (`denied` or `revoked`): the host's or the relay's reason, in the page's words. */
export function refusalWords(a: InstructorAccess, at: string): string {
  if (a.code === 'too-many-tries') return PHONE_WORDS.tooManyTries;
  if (a.reason === INSTRUCTOR_REASONS.wrongPin) return PHONE_WORDS.wrongPin;
  if (a.reason === INSTRUCTOR_REASONS.takenOver) return PHONE_WORDS.takenOver(at);
  if (a.reason === INSTRUCTOR_REASONS.pinChanged) return PHONE_WORDS.pinChanged;
  if (a.reason === INSTRUCTOR_REASONS.noPhone) return PHONE_WORDS.noPhone;
  return `Not signed in: ${a.reason ?? "the instructor's computer refused the phone"}.`;
}

export interface RemoteOptions {
  site: SiteProfile;
  hostless: boolean;
  bar: HTMLElement;
  code?: string;
  /** For tests: the instructor's link to the relay (default a WebSocket with the phone's liveness). */
  connect?: (relay: string) => ManagedTransport;
}

export function remoteView(o: RemoteOptions): View {
  if (!o.hostless) {
    const code = o.code ?? '';
    const p = pairingOf(code, location);
    const el = h('section', { 'aria-labelledby': 'rm-h' }, h('div', { class: 'page narrow' },
      h('h1', { id: 'rm-h' }, 'Pair a remote'),
      h('p', { class: 'lede' }, 'Run the case from a second window while the room watches this monitor. The remote shows the instructor panel alone.'),
      h('p', { class: 'hint pair-note', role: 'note' }, p.note),
      h('div', { class: 'pair' },
        p.qr ? h('div', { class: 'qr', role: 'img', 'aria-label': 'QR code of the pairing link' }, qrSvg(p.url, 200)) : null,
        h('div', {},
          h('p', {}, p.qr ? 'Scan the code with the tablet, or open this address and enter the code:' : 'Open the remote here, or enter this code in a remote window:'),
          p.relay ? h('p', { class: 'mono url' }, p.url) : null,
          h('p', { class: 'bigcode', 'aria-label': `Code ${code.split('').join(' ')}` }, code),
          h('div', { class: 'actions' }, button('Open the remote in a new window', () => window.open(p.url, 'pme-remote', 'width=520,height=900'))))),
    ));
    return { id: 'remote', el };
  }

  const relay = relayOf(location);
  return relay ? instructorPhone(o, relay) : sameBrowserRemote(o);
}

/** A same-browser Remote: a `controller` over this browser's BroadcastChannel (as before P7). */
function sameBrowserRemote(o: RemoteOptions): View {
  const status = h('p', { class: 'status-pill', role: 'status' }, 'Not connected');
  const codeIn = input('Session code', { maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', inputmode: 'text', placeholder: 'For example AGD5YJ' });
  codeIn.inp.value = hashParam('code') ?? '';
  const err = h('p', { class: 'error', role: 'alert' });
  const holder = h('div', { class: 'remote-panel' });
  const join = h('form', { class: 'setup narrow', onsubmit: (e: Event) => {
    e.preventDefault();
    connect(codeIn.inp.value);
  } }, h('h1', {}, 'Instructor remote'), h('p', { class: 'lede' }, 'Enter the 6-letter code the host screen shows under Remote.'), codeIn.el, err, h('div', { class: 'actions' }, button('Connect', () => connect(codeIn.inp.value), 'primary')));
  const el = h('section', { 'aria-label': 'Remote' }, join, holder);

  function connect(raw: string): void {
    const code = normalizeSessionCode(raw);
    if (!code) {
      setText(err, 'Error: the code has 6 letters and digits, as shown on the host screen under Remote.');
      return;
    }
    const transport: ManagedTransport = createBroadcastChannelTransport(code);
    const ctl = new ControllerSession({ session: code, transport, issuedBy: 'remote' });
    const link = new Link(ctl, transport, null);
    join.hidden = true;
    holder.append(status);
    mountSessionBar(o.bar, link);
    mountFastForward(document.body, ctl, { simT: () => link.simT });
    o.bar.hidden = false;
    const panel = mountPanel(link, { site: o.site, weightKg: () => link.ctl.scenario.doc?.patient?.weightKg ?? 70 });
    holder.append(panel.el);
    // Connected once the host has answered the hello (its snapshot) OR once its 1 Hz state reaches this page: the state
    // is all the panel needs (on a cold Vite start a remote once waited over 10 s for the snapshot answer).
    const draw = throttle(() => setText(status, ctl.hostOnline || ctl.state ? `Connected to ${code}` : `Waiting for the monitor ${code}…`), 500);
    // Joining is robust to a lost or unanswered hello: until the host has answered (snapshot) or its state has arrived, the
    // remote says hello again every 2 s (from its own peer id, so the host's duplicate filter never drops it); the host
    // answers every hello with a fresh snapshot (late join). What arrives is counted for the e2e diagnostics.
    const diag = { sent: 0, received: {} as Record<string, number>, transport: () => transport.status };
    transport.onMessage((m: WireMessage) => void (diag.received[m.kind] = (diag.received[m.kind] ?? 0) + 1));
    const stamp = createStamper(code, newPeerId('rejoin'));
    const rejoin = setInterval(() => {
      if (ctl.hostOnline || ctl.state) return void clearInterval(rejoin);
      if (transport.status !== 'open') return;
      transport.send(stamp({ kind: 'hello', role: 'controller' }));
      diag.sent++;
    }, 2000);
    link.onChange(draw);
    draw();
    history.replaceState(null, '', `${location.pathname}${location.search}#/remote?code=${code}`);
    Object.assign(window, { __pmeRemote: { link, panel, diag } }); // e2e hook
  }
  if (normalizeSessionCode(codeIn.inp.value)) queueMicrotask(() => connect(codeIn.inp.value));
  return { id: 'remote', el };
}

/**
 * The instructor's phone: the PIN form, then the role `instructor` over the relay. Every sign-in is a new link and a
 * new session (a refused socket is closed by the relay); every refusal tears them down and shows the form again with
 * the reason. The PIN goes from the field into the session's closure at sign-in and the field is emptied.
 */
function instructorPhone(o: RemoteOptions, relay: string): View {
  const connect = o.connect ?? ((url: string) => createWebSocketTransport({ url, livenessMs: INSTRUCTOR_LIVENESS_MS }));
  const status = h('p', { class: 'status-pill ip-peer-status', role: 'status' });
  const notice = h('p', { class: 'hint ip-peer-notice', role: 'status' });
  notice.hidden = true;
  const codeIn = input('Session code', { maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', inputmode: 'text', placeholder: 'For example AGD5YJ', class: 'input ip-peer-code' });
  codeIn.inp.value = hashParam('code') ?? '';
  // No `name`: the form never submits, and a browser that did submit it could not put the PIN in the address
  const pinIn = input('PIN', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 8, autocomplete: 'off', enterkeyhint: 'go', class: 'input ip-peer-pin' });
  const err = h('p', { class: 'error ip-peer-error', role: 'alert' });
  const type = (d: string) => {
    if (pinIn.inp.value.length < 8) pinIn.inp.value += d;
  };
  const keys = h('div', { class: 'ip-peer-keypad', role: 'group', 'aria-label': 'Keypad' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => button(d, () => type(d), 'ip-peer-key')),
    button('⌫', () => void (pinIn.inp.value = pinIn.inp.value.slice(0, -1)), 'ip-peer-key ip-peer-del', { 'aria-label': 'Delete the last digit' }),
    button('0', () => type('0'), 'ip-peer-key'),
    h('button', { type: 'submit', class: 'btn primary ip-peer-key ip-peer-go' }, 'Sign in'));
  const form = h('form', { class: 'setup narrow ip-peer-form', autocomplete: 'off', onsubmit: (e: Event) => (e.preventDefault(), signIn()) },
    h('h1', {}, 'Instructor remote'),
    h('p', { class: 'lede' }, "Enter the PIN the instructor's computer shows on its Room page (press and hold to see it there)."),
    codeIn.el, pinIn.el, err, keys);
  const holder = h('div', { class: 'remote-panel' });
  const el = h('section', { 'aria-label': 'Remote' }, form, holder);

  let live: { stop(): void } | null = null;
  const showForm = (why: string) => {
    live?.stop();
    live = null;
    pinIn.inp.value = '';
    setText(err, why);
    form.hidden = false;
    holder.replaceChildren();
    pinIn.inp.focus();
  };

  function signIn(): void {
    const code = normalizeSessionCode(codeIn.inp.value);
    const pin = pinIn.inp.value;
    pinIn.inp.value = ''; // the PIN is in this closure from here on, nowhere else
    if (!code) return void (setText(err, PHONE_WORDS.badCode), codeIn.inp.focus());
    if (!PIN_RE.test(pin)) return void (setText(err, PHONE_WORDS.badPin), pinIn.inp.focus());
    live?.stop();
    setText(err, '');
    history.replaceState(null, '', `${location.pathname}${location.search}#/remote?code=${code}`); // the code only
    const transport = connect(relay);
    const ctl = new ControllerSession({ session: code, transport, issuedBy: 'remote', role: 'instructor', pin: () => pin });
    const link = new Link(ctl, transport, null);
    const at = () => clock(link.simT);
    let opened = false;
    let hostSeen = false;
    let hostId: string | null = null;
    let mounted: { panel: ReturnType<typeof mountPanel>; offs: Array<() => void> } | null = null;
    const offs: Array<() => void> = [
      transport.onStatus((s) => void (s === 'open' && (opened = true))),
      transport.onPresence?.((p) => void (p.hostOnline && (hostSeen = true))) ?? (() => undefined),
      transport.onMessage((m: WireMessage) => {
        if (m.kind !== 'hello' || m.role !== 'host') return;
        hostSeen = true;
        // A host hello from a NEW id is the laptop reloaded: the session has answered the pending presses itself
        // (controller-session.ts HOST_RESTARTED_REASON, never given to the reloaded case) and signs in again with the PIN it holds
        if (hostId !== null && m.from !== hostId) {
          setText(notice, PHONE_WORDS.restarted(at()));
          notice.hidden = false;
        }
        hostId = m.from;
      }),
    ];
    const giveUp = setTimeout(() => {
      if (ctl.access.state !== 'pending' || mounted) return;
      showForm(!opened ? PHONE_WORDS.unreachable : !hostSeen ? PHONE_WORDS.noHost : PHONE_WORDS.kitTooOld);
    }, GIVE_UP_MS);
    const mount = () => {
      const panel = mountPanel(link, { site: o.site, weightKg: () => link.ctl.scenario.doc?.patient?.weightKg ?? 70 });
      mounted = { panel, offs: [mountSessionBar(o.bar, link), mountFastForward(document.body, ctl, { simT: () => link.simT })] };
      o.bar.hidden = false;
      form.hidden = true;
      holder.replaceChildren(status, notice, panel.el);
      Object.assign(window, { __pmeRemote: { link, panel } }); // e2e hook
    };
    const draw = () => {
      const a = ctl.access;
      if (a.state === 'denied' || a.state === 'revoked') return showForm(refusalWords(a, at()));
      if (a.state === 'granted') {
        clearTimeout(giveUp);
        if (!mounted) mount();
        setText(status, PHONE_WORDS.signedIn(code));
      } else setText(status, mounted ? PHONE_WORDS.signingInAgain : PHONE_WORDS.signingIn);
      status.dataset.state = a.state;
    };
    live = {
      stop() {
        clearTimeout(giveUp);
        for (const off of offs.splice(0)) off();
        ctl.close();
        transport.close();
        if (mounted) {
          for (const off of mounted.offs) off();
          mounted.panel.destroy();
          o.bar.hidden = true;
        }
        mounted = null;
        notice.hidden = true;
        delete (window as { __pmeRemote?: unknown }).__pmeRemote;
      },
    };
    offs.push(ctl.onChange(draw));
    // Until the grant the form stays, saying it is signing in
    setText(err, PHONE_WORDS.signingIn);
    draw();
  }

  // The field is emptied whenever the page is left (another route, the tab hidden or closed)
  const clearPin = () => void (pinIn.inp.value = '');
  addEventListener('pagehide', clearPin);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && clearPin());
  return { id: 'remote', el, leave: clearPin };
}
