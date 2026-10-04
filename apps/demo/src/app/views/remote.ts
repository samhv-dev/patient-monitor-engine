// Remote (research/13 §4.4): on the host screen, how to pair (the code, "open here", and a QR code only where another
// device can use it); in a window opened at #/remote, the instructor panel alone, joined by the 6-letter code over the
// Stage 6a transports (BroadcastChannel in the same browser; the relay when the link carries ?relay=). Version 1.0 is
// same-browser only (review F2, orchestrator ruling 6): tablet pairing over the relay is version 1.1. The Remote never
// runs an engine: it sends commands and reads state, as the 6a remote does.
import { ControllerSession, createBroadcastChannelTransport, createStamper, createWebSocketTransport, newPeerId, normalizeSessionCode, type ManagedTransport, type WireMessage } from '@pme/controller';
import { Link } from '../link.ts';
import { mountPanel } from '../panel/panel.ts';
import { pairingOf } from '../pairing.ts';
import { qrSvg } from '../qr.ts';
import { mountSessionBar } from '../sessionbar.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, input, setText, throttle } from '../ui.ts';
import type { View } from '../shell.ts';

const hashParam = (k: string): string | null => new URLSearchParams(location.hash.split('?')[1] ?? '').get(k);

export function remoteView(o: { site: SiteProfile; hostless: boolean; bar: HTMLElement; code?: string }): View {
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

  // ---- a Remote device ----
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
    const relay = new URLSearchParams(location.search).get('relay');
    const transport: ManagedTransport = relay ? createWebSocketTransport({ url: relay }) : createBroadcastChannelTransport(code);
    const ctl = new ControllerSession({ session: code, transport, issuedBy: 'remote' });
    const link = new Link(ctl, transport, null);
    join.hidden = true;
    holder.append(status);
    mountSessionBar(o.bar, link);
    o.bar.hidden = false;
    const panel = mountPanel(link, { site: o.site, weightKg: () => link.ctl.scenario.doc?.patient?.weightKg ?? 70 });
    holder.append(panel.el);
    // Connected once the host has answered the hello (its snapshot) OR once its 1 Hz state reaches this page: the state
    // is all the panel needs (on a cold Vite start a remote once waited over 10 s for the snapshot answer).
    const draw = throttle(() => setText(status, ctl.hostOnline || ctl.state ? `Connected to ${code}` : `Waiting for the monitor ${code}…`), 500);
    // Joining is robust to a lost or unanswered hello: until the host has answered (snapshot) or its state has arrived,
    // the remote says hello again every 2 s (from its own peer id, so the host's duplicate filter never drops it); the
    // host answers every hello with a fresh snapshot (Stage 6a late join). What arrives is counted for the e2e diagnostics.
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
