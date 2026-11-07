// The learner monitor on a SECOND screen. A window opened at `?follow=<code>#/monitor` runs no session of its own: it
// mounts a 'viewer' monitor (main thread, the site's skin) and a ViewerSync over the session's BroadcastChannel — the
// instructor's snapshot, then every command the instructor's session applies, at the host's tick, on the same build
// (sample-identical; samples never cross the channel). A patient restart, a scenario load or a bookmark restore on the
// instructor's screen is a new timeline: the viewer takes a fresh snapshot.
// Same browser only (BroadcastChannel), as the Remote in version 1.0.
//
// THE FOLLOWER'S WIRE CONTRACT (the QR-paired MOBILE learner monitor is built on it — read this,
// do not re-open the code):
//  - Address: `followUrl(code)` = `<origin><path>?follow=<CODE>#/monitor`; CODE is the session code
//    (`normalizeSessionCode`), kept across an instructor reload (`?session=` in the instructor's URL).
//  - Session channel: the controller protocol (`@pme/controller` protocol.ts, `v:1`) on the session's transport.
//    The follower says `hello {role:'viewer'}`; the host answers with the sticky replays (`commandApplied` with
//    `resolved.replay`, incl. `time` scale/pause) and a `snapshot` (same engine build); then `event` batches: `state`
//    (1 Hz, the anchor), `beat` (drift check), `commandApplied` (mirrored at `atTick`), `timeline {cause}` (restart or
//    restore → re-hello and a fresh snapshot). A new host hello (a reload) resets the speed and pause.
//  - A viewer may not command: the host refuses it (`ack accepted:false 'a viewer cannot command'`).
//  - `resolved.mirror` events (the Ventilator view's frames: samples) go ONLY to same-browser BroadcastChannel peers
//    and the relay drops them (a declared deviation from brief §3.7). A network follower gets none: a mobile
//    monitor over the relay must mirror the cockpit's SETTINGS instead, or show the Ventilator view's patient as
//    unsupported.
//  - Liveness: any host message within HOST_SILENT_MS (5 s) while running, else "not answering".
//  - Style: a separate channel `pme-style:<CODE>` — `{kind:'ask'}` → `{kind:'style', skin, theme, ibp}`, and every change
//    (`publishStyle` on the instructor's page). Presentation only, not the session wire. `ibp` (E130): the IBP1/IBP2
//    lane scales; the follower's monitor draws them (AUTO judges the same range from the same samples).
//  - Sound: per window (mount option `audioSilence: 'window'`): the follower's own Sound and
//    "Silence here"; nothing about sound crosses either channel.
//  - A PHONE over the relay (`?join=<CODE>`): the same contract on a
//    WebSocket to `pme-relay`. The relay sends a viewer only VIEWER_EVENTS (protocol.ts) and a hello's replays only to
//    the peers awaiting a snapshot; it refuses a phone past the session's limit (`full`, no retry) and any role but
//    viewer from another device. Style: a phone has no style channel; the instructor's style comes IN
//    the follow stream — a `style` event in every answer to a hello and at every change — and the phone wears it
//    upright (`phoneStyle`; a style with no phone layout: the default, said under the monitor). While the Ventilator
//    view drives the patient the host sends a `cockpit` event once a second to the network instead of its frames: the
//    phone HOLDS (its monitor still, "The ventilator is on the main screen") and takes a fresh snapshot when they stop.
//    UI-A #2: only while the view is ON SCREEN — its close sends `cockpit {off: true}` and the phone follows at once.
//    A page hidden for a while (a locked phone) also takes a fresh snapshot instead of computing the gap.
import { createBroadcastChannelTransport, createWebSocketTransport, ViewerSync, type Instrument, type ManagedTransport, type RelayFrame, type WireMessage } from '@pme/controller';
import { engineKey as engineVersion } from '@pme/engine-core'; // The snapshot key, version + build
import { mountMonitor, type IbpScales, type MonitorHandle } from '@pme/renderer';
import { briefingLayer, followBriefing } from '../briefing.ts';
import { applySkinAlarmColours, type Shell } from '../shell.ts';
import { defibReadout, defibSkin } from '../instrument.ts';
import { DEFAULT_SITE, MONITORS, THEMES, type SiteProfile } from '../site.ts';
import { button, h, pausedMark, setText } from '../ui.ts';
import { followerStatus, hostPause, phoneStyle } from './follower-status.ts';

/**
 * A phone's socket is dropped and reopened when nothing (not even the relay's 10 s heartbeat) arrived for this long — a
 * phone that slept or moved to another access point often keeps a dead socket open [ENG: ui; 1.2 heartbeats].
 */
const PHONE_LIVENESS_MS = 12_000;
/** Hidden this long (a locked phone, another tab), the page starts again from a fresh snapshot [ENG: ui]. */
const HIDDEN_RESYNC_MS = 2000;
/** The styles a phone draws upright — every shipped one (measured at 375 px, both engines). */
const UPRIGHT: ReadonlySet<string> = new Set(MONITORS.map((m) => m.id));
const PHONE_THEMES: ReadonlySet<string> = new Set(THEMES.map(([t]) => t));

/**
 * The learner monitor wears the instructor's monitor style and follows its changes. A small same-browser channel beside
 * the session's: the instructor's page answers `ask` and announces every change. Style is presentation, not the
 * patient, so it stays off the session wire (no protocol change).
 */
type StyleMsg = { kind: 'ask' } | { kind: 'style'; skin: string; theme: string; ibp?: IbpScales; defib?: string | null };
const styleChannel = (code: string) => new BroadcastChannel(`pme-style:${code}`);

/** The instructor's side: answer the learner monitor's `ask`, and announce every change. Returns a closer. */
export function publishStyle(code: string, now: () => { skin: string; theme: string; ibp?: IbpScales; defib?: string | null }, onChange: (f: () => void) => () => void): () => void {
  const ch = styleChannel(code);
  const send = () => {
    const s = now();
    ch.postMessage({ kind: 'style', skin: s.skin, theme: s.theme, ...(s.ibp ? { ibp: s.ibp } : {}), ...(s.defib !== undefined ? { defib: s.defib } : {}) } satisfies StyleMsg);
  };
  ch.onmessage = (ev: MessageEvent<StyleMsg>) => {
    if (ev.data?.kind === 'ask') send();
  };
  const off = onChange(send);
  return () => (off(), ch.close());
}

/** The address of the learner monitor that follows session `code` (this page, same browser). */
export function followUrl(code: string, loc: { origin: string; pathname: string } = location): string {
  return `${loc.origin}${loc.pathname}?follow=${code}#/monitor`;
}

export interface Follower {
  readonly monitor: MonitorHandle;
  readonly transport: ManagedTransport;
  /** The style this window shows (the instructor's). */
  style: { skin: string; theme: string };
  sync: ViewerSync | null;
  /** Called once this window has put on a new style (the simulation line follows the header it lands in). */
  onStyle?: (style: { skin: string; theme: string }) => void;
  destroy(): void;
}

/** A learner's phone follows over the relay at this WebSocket address instead of this browser's channel. */
export interface NetFollow {
  relay: string;
}

/** What this window shows and its device's key, said on every hello (plan room-and-instruments.md R4, §4 D1). */
export interface FollowerInstrument {
  show: Extract<Instrument, 'learner' | 'monitor' | 'defib'>;
  device: string;
}

/**
 * The transport with `show` and `device` on every hello it sends; everything else is the transport's own. The page
 * adds them (viewer-sync.ts, which says the hello, is not changed: §4 D1).
 */
export function withInstrument(t: ManagedTransport, i: FollowerInstrument): ManagedTransport {
  const send = (m: WireMessage) => t.send(m.kind === 'hello' ? { ...m, show: i.show, device: i.device } : m);
  return new Proxy(t, {
    get(target, key) {
      if (key === 'send') return send;
      const v: unknown = Reflect.get(target, key, target);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  });
}

/**
 * `defib` (Room plan R5): this window is the defibrillator (`#/defib`): it wears the room's defibrillator model's look
 * (instrument.ts defibSkin; the host's style changes its theme only), landscape, and reads out the energy and CHARGING /
 * READY from its own engine. Its Charge and Shock come with R5d.
 */
export interface FollowerOptions {
  defib?: boolean;
}

/**
 * `o`: what this window shows and its device's key (R4: said on every hello, with "Change" under the monitor), and/or
 * `defib` (R5). `show: 'defib'` is the defibrillator window too.
 */
export function mountFollower(shell: Shell, site: SiteProfile, code: string, bar: HTMLElement, net?: NetFollow, o: Partial<FollowerInstrument> & FollowerOptions = {}): Follower {
  const instrument: FollowerInstrument | undefined = o.show && o.device !== undefined ? { show: o.show, device: o.device } : undefined;
  const defib = o.defib === true || o.show === 'defib';
  applySkinAlarmColours(site.skin, site.theme);
  // This window's alarm SOUND is its own (its Sound and Silence buttons); the alarms are the patient's
  // A phone held upright shows the monitor upright (tiles under the waveforms); turned sideways, the skin's own screen
  // (the whole Saadat-like screen scaled as one unit, the owner's mock-up m14 of 26 October), and it follows each turn
  // R4: the patient monitor (`#/monitor/wide`) stays landscape, held either way; so does the defibrillator (R5)
  const upright = net && instrument?.show !== 'monitor' && !defib ? matchMedia('(orientation: portrait)') : null;
  const monitor = mountMonitor(shell.monitorHost, { skin: site.skin, ...(site.theme ? { theme: site.theme } : {}), role: 'viewer', worker: 'off', audioSilence: 'window', portrait: upright?.matches ?? false });
  const onTurn = () => monitor.setPortrait(upright?.matches ?? false);
  upright?.addEventListener('change', onTurn);
  let refused: { code: string; message: string } | null = null; // The relay's refusal (a full session)
  let hostAway = false; // The relay says the instructor's page is not connected
  let cockpitAt = -Infinity; // Wall ms of the host's last `cockpit` event (the Ventilator view drives)
  const onRelay = (fr: RelayFrame) => {
    if (fr.relay === 'error') refused = fr;
    if (fr.relay === 'peers') hostAway = !fr.hostOnline;
  };
  const link = net ? createWebSocketTransport({ url: net.relay, livenessMs: PHONE_LIVENESS_MS, onRelayFrame: onRelay }) : createBroadcastChannelTransport(code);
  const transport = instrument ? withInstrument(link, instrument) : link;
  const status = h('span', { class: 'status-pill', role: 'status' }, `Waiting for the instructor's monitor ${code}…`);
  // On and off again, this window only
  const drawSound = () => ((sound.textContent = monitor.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(monitor.soundOn)), (hush.disabled = !monitor.soundOn));
  const sound = button('Sound off', () => (monitor.soundOn ? (monitor.disableSound(), drawSound()) : void monitor.enableSound().then(drawSound)), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  // Silence here quiets THIS window's alarm sound only (by the skin's rule); the instructor's Silence does not quiet
  // it, and this one sends nothing to the session
  const hush = button('Silence here', () => {
    const on = monitor.silenceAudio();
    hush.setAttribute('aria-pressed', String(on));
  }, 'small');
  hush.setAttribute('aria-pressed', 'false');
  hush.title = "Silence this window's alarm sound";
  hush.disabled = true;
  bar.append(status, sound, hush);
  // R4: back to the instrument picker (a link, not a control of the patient)
  if (instrument) bar.append(h('a', { class: 'btn small follower-change', href: '#/pick' }, 'Change'));
  // Under a phone's monitor when the instructor's style has no phone layout
  const styleNote = h('p', { class: 'follower-note', hidden: true });
  if (net) bar.append(styleNote);
  // While the Ventilator view drives the patient, a phone's monitor is held still behind this line
  const holdNote = h('div', { class: 'learner-hold', hidden: true }, h('p', {}, 'The ventilator is on the main screen'), h('p', { class: 'muted' }, 'This monitor continues when the ventilator view closes.'));
  shell.stage.append(holdNote);
  // The card's Case briefing over this monitor, from its start time: a phone that joins late shows the remainder
  const briefing = briefingLayer(shell.stage, { phone: !!net });
  let hold = false;
  let raf = 0;
  let offDraw = () => {}; // The pill's redraw on host messages (after the sync's own handler)
  let offReadout = () => {}; // R5: the defibrillator readout's subscription to this window's engine
  const f: Follower = { monitor, transport, sync: null, destroy, style: { skin: site.skin, theme: site.theme } };
  // R5: the defibrillator window's readout, from this window's own engine (its deviceStatus)
  const readout = defib ? h('p', { class: 'defib-readout', role: 'status', 'aria-label': 'Defibrillator' }) : null;
  if (readout) shell.stage.append(readout);
  /** Put on a style: the defibrillator window wears the room model's look whatever the monitor style. */
  const wear = (skin: string, theme: string) => {
    if (skin === f.style.skin && theme === f.style.theme) return;
    f.style = { skin, theme };
    applySkinAlarmColours(skin, theme);
    void monitor.setSkin(skin, theme ? { theme } : {}).then(() => f.onStyle?.(f.style));
  };
  /** E130: the instructor's IBP lane scales on this monitor. */
  let ibpWorn = '{}';
  const wearIbp = (ibp: IbpScales | undefined) => {
    const next = JSON.stringify(ibp ?? {});
    if (next === ibpWorn) return;
    ibpWorn = next;
    monitor.setIbpScales(ibp ?? {});
  };
  const style = net ? null : styleChannel(code); // Same-browser only
  if (style) style.onmessage = (ev: MessageEvent<StyleMsg>) => {
    const m = ev.data;
    if (m?.kind !== 'style') return;
    wearIbp(m.ibp);
    wear(defib ? defibSkin(m.defib ?? null, m.skin) : m.skin, m.theme);
  };
  style?.postMessage({ kind: 'ask' } satisfies StyleMsg);
  void monitor.viewerClock().then((clock) => {
    const sync = new ViewerSync({ session: code, transport, target: clock, engineVersion });
    f.sync = sync;
    if (readout) offReadout = clock.on((e) => void (e.type === 'deviceStatus' && setText(readout, defibReadout(e.defib))), ['deviceStatus']);
    // The pill after every host message, once the sync has taken it (subscribed after it): the 500 ms poll alone showed
    // what the phone knew during an instructor's reload for up to a poll after it was synced again (kit check 30 Oct)
    offDraw = transport.onMessage(drawStatus);
    const loop = () => {
      if (hold) clock.setPaused(true); // It cannot follow the cockpit's patient — still, not wrong
      else sync.follow(); // once per frame: steers this monitor's clock onto the instructor's (a frame behind is fine)
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
  // Back from hidden (a locked phone), start from a fresh snapshot — catching up would compute every tick of the gap on
  // this page's main thread (five minutes = 15 000 ticks)
  let hiddenAt: number | null = null;
  const onVisible = () => {
    if (document.hidden) return void (hiddenAt = performance.now());
    if (hiddenAt !== null && performance.now() - hiddenAt > HIDDEN_RESYNC_MS) f.sync?.resync();
    hiddenAt = null;
  };
  document.addEventListener('visibilitychange', onVisible);
  // Host liveness — a running host sends at least its 1 Hz state; a paused one may be silent. Silence of more than 5 s
  // while running means the instructor's window is gone or reloading (it comes back under the same code).
  let heard = performance.now();
  const pause = hostPause();
  const offHost = transport.onMessage((m) => {
    pause.onMessage(m);
    if (m.kind === 'hello' && m.role !== 'host') return;
    if (m.kind === 'command') return;
    heard = performance.now();
    if (m.kind === 'hello') cockpitAt = -Infinity; // A (re)loaded instructor's page: its Ventilator view is not open yet
    if (m.kind !== 'event') return;
    followBriefing(briefing, m);
    for (const e of m.body) {
      if (e.type === 'cockpit') cockpitAt = e.off ? -Infinity : performance.now(); // `off`: the view closed (UI-A #2)
      if (e.type === 'style' && net) {
        if (defib) wear(defibSkin(e.defib ?? null, e.skin), e.theme); // landscape, the room model's look (R5)
        else wearPhone(e.skin, e.theme);
        wearIbp(e.ibp);
      }
    }
  });
  /** The instructor's style, upright on this phone (or the default, said under the monitor). */
  function wearPhone(skin: string, theme: string): void {
    const w = phoneStyle({ skin, theme }, UPRIGHT, PHONE_THEMES, DEFAULT_SITE.skin);
    styleNote.hidden = w.note === null;
    setText(styleNote, w.note ?? '');
    wear(w.skin, w.theme);
  }
  let opened = false; // The phone has reached the relay at least once
  const t0 = performance.now();
  const offOpen = transport.onStatus((st) => void (st === 'open' && (opened = true)));
  const pausedEl = pausedMark(shell.stage); // UI review #32: the phone's monitor says PAUSED too
  function drawStatus(): void {
    const now = performance.now();
    const paused = pause.paused;
    pausedEl.set(paused);
    const v = followerStatus({
      code, net: !!net, sync: f.sync?.status ?? 'waiting', transport: transport.status, opened, sinceStartMs: now - t0, refused, hostAway,
      heardAgoMs: now - heard, paused, cockpitAgoMs: now - cockpitAt,
    });
    if (hold && !v.hold) f.sync?.resync(); // The ventilator view closed — start again from the host's snapshot
    hold = v.hold;
    holdNote.hidden = !hold;
    setText(status, v.text);
    status.dataset.ok = String(v.ok);
  }
  const draw = setInterval(drawStatus, 500);
  function destroy(): void {
    upright?.removeEventListener('change', onTurn);
    offDraw();
    offReadout();
    readout?.remove();
    offHost();
    offOpen();
    document.removeEventListener('visibilitychange', onVisible);
    holdNote.remove();
    briefing.end();
    style?.close();
    cancelAnimationFrame(raf);
    clearInterval(draw);
    f.sync?.close();
    transport.close();
    monitor.destroy();
  }
  return f;
}
