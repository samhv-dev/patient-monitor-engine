// Stage 12: the QR moment. With a relay (the classroom), the top bar has "Phones": a sheet over every view, the monitor
// in full screen included, with a QR code as large as the projector allows, the address and the code beneath it, and the
// number of phones following, live. Where phones cannot join (no relay answering, no network, a loopback-only page) it
// says why instead of showing a code nobody can use.
import { qrTarget, relayInfo } from './classroom.ts';
import { qrSvg } from './qr.ts';
import type { AppSession } from './session.ts';
import { button, h, setText } from './ui.ts';

export function mountClassroomPanel(right: HTMLElement, session: AppSession, relay: string): { open(): Promise<void> } {
  const count = h('p', { class: 'phones-count', role: 'status' });
  const body = h('div', { class: 'phones-body' });
  const dlg = h('dialog', { class: 'phones-sheet', 'aria-labelledby': 'phones-h' },
    h('h2', { id: 'phones-h' }, "Learners' phones: scan to follow this monitor"), body, count,
    h('div', { class: 'actions' }, button('Close', () => dlg.close(), 'small')));
  const drawCount = (n: number) => setText(count, n === 1 ? '1 phone following' : `${n} phones following`);
  session.onFollowers(drawCount);
  drawCount(session.followers);
  async function open(): Promise<void> {
    body.replaceChildren(h('p', { class: 'muted' }, 'Looking for this computer on the network…'));
    if (!dlg.open) dlg.showModal();
    const t = qrTarget(session.code, location, relay, await relayInfo(relay));
    body.replaceChildren(...(t.ok
      ? [
          h('div', { class: 'phones-qr', role: 'img', 'aria-label': `QR code of ${t.url}` }, qrSvg(t.url, 480)),
          h('p', { class: 'mono phones-url' }, t.url),
          h('p', { class: 'phones-code', 'aria-label': `Code ${session.code.split('').join(' ')}` }, session.code),
          h('p', { class: 'hint' }, 'Phones must be on the same Wi-Fi as this computer. Sound on a phone starts only when its owner taps Sound.'),
          ...(t.others.length ? [h('p', { class: 'hint mono' }, `If the code does not open: ${t.others.join('  ·  ')}`)] : []),
        ]
      : [h('p', { class: 'error', role: 'alert' }, t.why)]));
  }
  right.prepend(button('Phones', () => void open(), 'small phones-btn'));
  document.body.append(dlg);
  return { open };
}
