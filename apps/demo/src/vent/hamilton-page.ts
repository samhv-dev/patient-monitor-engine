// vent-hamilton.html: the ventilator alone (no ?link) or linked to a monitor in another window/iframe
// (?link=<session>[&profile=<id>]) over BroadcastChannel `pme-vent/<session>`, or over a direct frame port with its
// parent page (`&via=parent`, the app's Ventilator view: FX-1). R8d (plan room-and-instruments.md §7) adds the third link:
// `?join=CODE[&relay=…]#/vent`, a device over the relay, signed in as the `ventilator` with the instructor's PIN typed into
// P7's form (views/pin-form.ts; held in this page's memory only), then the cockpit full screen (device-link.ts).
// A window of the instructor's computer (`?link=` without `&via=parent`: Room setup's "New window") says the cockpit's
// settings once a second and on every change, and whether its page is hidden — as a device's relay port does — so the
// host hands the patient over with them when the window closes or hides (views/vent.ts serveWindowCockpit).
import { createBroadcastPort, createFramePort, createRelayPort, createVentDriver, monitorMatchedFlow, PROFILES, SETTINGS_MS, type CockpitSettings, type LinkPort, type ProfileId, type RelayPort, type VentDriver, type VentWire, type VentWireBody } from '@pme/ventilator';
import { joinCode, relayOf, VENT_HASH } from '../app/classroom.ts';
import { h, setText } from '../app/ui.ts';
import { PHONE_WORDS, pinForm, refusalWords } from '../app/views/pin-form.ts';
import { signInVentilator, type VentDevice } from './device-link.ts';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const settingsOf = (d: VentDriver): CockpitSettings => ({ cfg: { ...d.vs.cfg }, measured: { RR: d.vs.p.measured.RR, VTE: d.vs.p.measured.VTE } });

/**
 * Linked to the monitor, VC runs at the monitor ventilator's flow for the set VT and rate (I:E 1:2, no pause) — the
 * same settings deliver the same volume — until the instructor sets Flow or Pause here.
 */
function matchMonitorFlow(driver: VentDriver): void {
  let matched = true;
  addEventListener('input', (e) => {
    const k = (e.target as HTMLElement | null)?.dataset?.key;
    if (k === 'vcFlow' || k === 'pause') matched = false;
  }, true);
  const frame = driver.frame;
  driver.frame = (ms) => {
    if (matched && driver.vs.cfg.mode === 'VC') Object.assign(driver.vs.cfg, monitorMatchedFlow(driver.vs.cfg));
    frame(ms);
  };
}

/** R8d: a window's cockpit says its settings (and whether it is hidden) on every change and once a second. */
function sayWindowSettings(port: LinkPort, driver: VentDriver): void {
  let said = '';
  let at = -Infinity;
  const say = (force: boolean) => {
    const hidden = document.visibilityState === 'hidden';
    const json = JSON.stringify(settingsOf(driver));
    if (!force && json === said && performance.now() - at < SETTINGS_MS) return;
    said = json;
    at = performance.now();
    port.post({ v: 1, kind: 'settings', ...(JSON.parse(json) as CockpitSettings), ...(hidden ? { hidden: true } : {}) } as VentWireBody as never);
  };
  // a change goes within 200 ms [ENG: ui; a knob turn is seen by the host's next hand-over, well inside the 1 s rule]
  setInterval(() => say(false), 200);
  document.addEventListener('visibilitychange', () => say(true));
  addEventListener('pagehide', () => {
    const hidden = { v: 1, kind: 'settings', ...settingsOf(driver), hidden: true };
    port.post(hidden as VentWireBody as never); // closing: the host hands over at once, not after the 1 s silence
  });
  say(true);
}

/** The words the ventilator's page says (P7's for a refusal). */
export const VENT_WORDS = {
  title: 'Ventilator',
  lede: "Enter the PIN the instructor's computer shows on its Room page (press and hold to see it there). This screen then drives the patient's ventilation.",
  offline: "Offline: the patient is on the computer's own ventilator. This screen signs in again when the network returns.",
  signingInAgain: PHONE_WORDS.signingInAgain,
} as const;

/** R8d: the device page over the relay: the PIN form, then the cockpit full screen. */
function devicePage(code: string, relay: string): void {
  const screen = document.getElementById('screen') as HTMLElement;
  const credit = document.querySelector('.credit') as HTMLElement | null;
  const showCockpit = (on: boolean) => {
    screen.style.display = on ? '' : 'none';
    if (credit) credit.style.display = on ? '' : 'none';
  };
  showCockpit(false);
  const status = h('p', { class: 'vent-device-status', role: 'status' });
  status.hidden = true;
  const form = pinForm({ title: VENT_WORDS.title, lede: VENT_WORDS.lede, code, onSignIn: (c, pin) => signIn(c, pin) });
  const holder = h('section', { class: 'vent-signin', 'aria-label': 'Ventilator sign-in' }, form.form);
  document.body.append(holder, status);
  form.pinIn.inp.focus();

  // One cockpit for the page's life, on one relay port whose wire is the current sign-in's
  let dev: VentDevice | null = null;
  let offDev: Array<() => void> = [];
  const bodies = new Set<(b: VentWireBody) => void>();
  const wire: VentWire = { send: (b) => dev?.wire.send(b), onBody: (fn) => (bodies.add(fn), () => void bodies.delete(fn)) };
  let port: RelayPort | null = null;
  let driver: VentDriver | null = null;
  const hook = { state: 'signed out' as string, sender: null as string | null };
  (window as unknown as { __pmeVentDevice: typeof hook }).__pmeVentDevice = hook; // e2e hook

  const showForm = (why: string) => {
    for (const off of offDev.splice(0)) off();
    dev?.close();
    dev = null;
    hook.state = 'signed out';
    form.clear();
    setText(form.err, why);
    status.hidden = true;
    showCockpit(false);
    holder.hidden = false;
    form.pinIn.inp.focus();
  };
  const draw = () => {
    const d = dev;
    if (!d) return;
    hook.state = d.state;
    hook.sender = d.sender;
    if (d.state === 'denied' || d.state === 'revoked') return showForm(refusalWords(d.access, '--:--'));
    if (d.state === 'granted') {
      holder.hidden = true;
      status.hidden = true;
      showCockpit(true);
      if (!driver) {
        let drv: VentDriver | null = null;
        port = createRelayPort(wire, { settings: () => (drv ? settingsOf(drv) : null) });
        drv = createVentDriver(port, profile);
        driver = drv;
        matchMonitorFlow(drv);
        mountHamiltonUi(drv);
        (window as unknown as { __vent: VentDriver }).__vent = drv; // e2e hook
      }
      port?.setHidden(document.visibilityState === 'hidden'); // its settings at once: the host knows what it would hand over
      return;
    }
    // signing in (the first time the form says so; after a grant, over the cockpit), or offline
    if (!driver) return void setText(form.err, PHONE_WORDS.signingIn);
    status.hidden = false;
    status.dataset.state = d.state;
    setText(status, d.state === 'offline' ? VENT_WORDS.offline : VENT_WORDS.signingInAgain);
  };
  function signIn(c: string, pin: string): void {
    for (const off of offDev.splice(0)) off();
    dev?.close();
    setText(form.err, PHONE_WORDS.signingIn);
    const d = signInVentilator({ code: c, relay, pin }); // the PIN is in the sign-in's closure from here on, nowhere else
    dev = d;
    offDev = [d.onChange(draw), d.wire.onBody((b) => {
      for (const fn of [...bodies]) fn(b);
    })];
    draw();
  }
  document.addEventListener('visibilitychange', () => port?.setHidden(document.visibilityState === 'hidden'));
  addEventListener('pagehide', () => {
    port?.setHidden(true); // the host hands over at once
    dev?.close();
  });
}

const join = joinCode(location);
const relay = join ? relayOf(location) : null;
if (join && relay && location.hash === VENT_HASH) devicePage(join, relay);
else {
  const session = q.get('link');
  const embedded = q.get('via') === 'parent' && parent !== window;
  // FX-1: embedded by the app's Ventilator view (`&via=parent`), the link is a direct frame port with the parent page
  const port = session ? (embedded ? createFramePort(session, () => parent) : createBroadcastPort(session)) : null;
  const driver = createVentDriver(port, profile);
  if (port) matchMonitorFlow(driver);
  if (port && !embedded) sayWindowSettings(port, driver);
  mountHamiltonUi(driver);
  (window as unknown as { __vent: typeof driver }).__vent = driver; // e2e hook
}
