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
import { ControllerSession, createBroadcastChannelTransport, createStamper, createWebSocketTransport, newPeerId, normalizeSessionCode, type Formulary, type ManagedTransport, type WireMessage } from '@pme/controller';
import { PHONE_WORDS, pinForm, refusalWords } from './pin-form.ts';
import { relayOf } from '../classroom.ts';
import { loadShippedFormulary } from '../formulary.ts';
import { mountLearnerPreps } from '../teach2/learner-preps.ts';
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

/** Plan §1: an older kit's relay drops the instructor's hello and an older host never answers; the phone gives up [ENG: ui]. */
export const GIVE_UP_MS = 10_000;
/** Plan §5: the phone drops a socket that heard nothing for 12 s and opens a new one (as the learner's phone does) [ENG: ui]. */
export const INSTRUCTOR_LIVENESS_MS = 12_000;

// P7's words and its PIN form live in pin-form.ts (R8d: the ventilator's page signs in with the same form)
export { PHONE_WORDS, refusalWords } from './pin-form.ts';

export interface RemoteOptions {
  site: SiteProfile;
  hostless: boolean;
  bar: HTMLElement;
  code?: string;
  /** For tests: the instructor's link to the relay (default a WebSocket with the phone's liveness). */
  connect?: (relay: string) => ManagedTransport;
  /** For tests: the formulary the staging card names its sources from (default the shipped one, loaded at sign-in). */
  formulary?: () => Promise<Formulary | null>;
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

/** A connected Remote's first row: the page's heading beside the status. The join form, which holds the other h1, hides on
 *  connecting, so without this the connected page had no visible h1 (the accessibility audit's one-h1 rule; research/41
 *  row 62). */
const connectedHead = (status: HTMLElement) => h('div', { class: 'remote-head' }, h('h1', { class: 'remote-title' }, 'Instructor remote'), status);

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
    holder.append(connectedHead(status));
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
  const { form, pinIn, err, clear } = pinForm({
    title: 'Instructor remote',
    lede: "Enter the PIN the instructor's computer shows on its Room page (press and hold to see it there).",
    code: hashParam('code') ?? '',
    onSignIn: (code, pin) => signIn(code, pin),
  });
  const holder = h('div', { class: 'remote-panel' });
  const el = h('section', { 'aria-label': 'Remote' }, form, holder);

  let live: { stop(): void } | null = null;
  // L9: the learner preparations card names each finding's sources from the shipped formulary (loaded once, at sign-in)
  let formulary: Formulary | null = null;
  let loading: Promise<unknown> | null = null;
  const showForm = (why: string) => {
    live?.stop();
    live = null;
    pinIn.inp.value = '';
    setText(err, why);
    form.hidden = false;
    holder.replaceChildren();
    pinIn.inp.focus();
  };

  function signIn(code: string, pin: string): void {
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
    loading ??= (o.formulary ?? loadShippedFormulary)().then((f) => void (formulary = f), () => undefined);
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
      // L9 (LQ3): the same card as the laptop's dock, above the panel: what the learners staged, and the notice's control
      const preps = mountLearnerPreps(link, { formulary: () => formulary, inline: true });
      void loading?.then(() => preps.refresh());
      mounted = { panel, offs: [mountSessionBar(o.bar, link), mountFastForward(document.body, ctl, { simT: () => link.simT }), preps.destroy] };
      o.bar.hidden = false;
      form.hidden = true;
      // the head, the notice and the card share the grid's first row (.remote-panel: auto, then the panel's 1fr)
      holder.replaceChildren(h('div', { class: 'remote-top' }, connectedHead(status), notice, preps.el), panel.el);
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

  return { id: 'remote', el, leave: clear };
}
