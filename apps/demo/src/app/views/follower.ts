// FU-11 (showcase kit K2): the learner monitor on a SECOND screen. A window opened at `?follow=<code>#/monitor` runs no
// session of its own: it mounts a 'viewer' monitor (main thread, the site's skin) and a Stage 6a ViewerSync over the
// session's BroadcastChannel — the instructor's snapshot, then every command the instructor's session applies, at the
// host's tick, on the same build (sample-identical; samples never cross the channel). A patient restart, a scenario load
// or a bookmark restore on the instructor's screen is a new timeline: the viewer takes a fresh snapshot.
// Same browser only (BroadcastChannel), as the Remote in version 1.0.
//
// THE FOLLOWER'S WIRE CONTRACT (FU-11 G2; a later plan builds a QR-paired MOBILE learner monitor on it — read this,
// do not re-open the code):
//  - Address: `followUrl(code)` = `<origin><path>?follow=<CODE>#/monitor`; CODE is the session code
//    (`normalizeSessionCode`), kept across an instructor reload (`?session=` in the instructor's URL, R50 F5).
//  - Session channel: the Stage 6a protocol (`@pme/controller` protocol.ts, `v:1`) on the session's transport. The
//    follower says `hello {role:'viewer'}`; the host answers with the sticky replays (`commandApplied` with
//    `resolved.replay`, incl. `time` scale/pause) and a `snapshot` (same engine build); then `event` batches: `state`
//    (1 Hz, the anchor), `beat` (drift check), `commandApplied` (mirrored at `atTick`), `timeline {cause}` (restart or
//    restore → re-hello and a fresh snapshot). A new host hello (a reload) resets the speed and pause (R50 F5).
//  - A viewer may not command: the host refuses it (`ack accepted:false 'a viewer cannot command'`, R50 M13).
//  - `resolved.mirror` events (the Ventilator view's frames: samples) go ONLY to same-browser BroadcastChannel peers
//    and the relay drops them (R50 F3, a declared deviation from brief §3.7). A network follower gets none: a mobile
//    monitor over the relay must mirror the cockpit's SETTINGS instead, or show the Ventilator view's patient as
//    unsupported — the later plan decides.
//  - Liveness: any host message within HOST_SILENT_MS (5 s) while running, else "not answering" (R50 F5).
//  - Style: a separate channel `pme-style:<CODE>` — `{kind:'ask'}` → `{kind:'style', skin, theme}`, and every change
//    (owner ruling Q3; `publishStyle` on the instructor's page). Presentation only, not the session wire.
//  - Sound: per window (owner ruling Q3; mount option `audioSilence: 'window'`): the follower's own Sound and
//    "Silence here"; nothing about sound crosses either channel.
import { createBroadcastChannelTransport, ViewerSync, type ManagedTransport } from '@pme/controller';
import { version as engineVersion } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { applySkinAlarmColours, type Shell } from '../shell.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, setText } from '../ui.ts';

/** R50 F5: no message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG]. */
const HOST_SILENT_MS = 5000;

/**
 * FU-11 (owner ruling Q3): the learner monitor wears the instructor's monitor style and follows its changes. A small
 * same-browser channel beside the session's: the instructor's page answers `ask` and announces every change. Style is
 * presentation, not the patient, so it stays off the session wire (no protocol change).
 */
type StyleMsg = { kind: 'ask' } | { kind: 'style'; skin: string; theme: string };
const styleChannel = (code: string) => new BroadcastChannel(`pme-style:${code}`);

/** The instructor's side: answer the learner monitor's `ask`, and announce every change. Returns a closer. */
export function publishStyle(code: string, now: () => { skin: string; theme: string }, onChange: (f: (skin: string, theme: string) => void) => () => void): () => void {
  const ch = styleChannel(code);
  const send = (skin: string, theme: string) => ch.postMessage({ kind: 'style', skin, theme } satisfies StyleMsg);
  ch.onmessage = (ev: MessageEvent<StyleMsg>) => {
    if (ev.data?.kind === 'ask') send(now().skin, now().theme);
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
  /** FU-11 (Q3): the style this window shows (the instructor's). */
  style: { skin: string; theme: string };
  sync: ViewerSync | null;
  destroy(): void;
}

export function mountFollower(shell: Shell, site: SiteProfile, code: string, bar: HTMLElement): Follower {
  applySkinAlarmColours(site.skin, site.theme);
  // owner ruling Q3: this window's alarm SOUND is its own (its Sound and Silence buttons); the alarms are the patient's
  const monitor = mountMonitor(shell.monitorHost, { skin: site.skin, ...(site.theme ? { theme: site.theme } : {}), role: 'viewer', worker: 'off', audioSilence: 'window' });
  const transport = createBroadcastChannelTransport(code);
  const status = h('span', { class: 'status-pill', role: 'status' }, `Waiting for the instructor's monitor ${code}…`);
  // FU-11 (H4): on and off again, this window only
  const drawSound = () => ((sound.textContent = monitor.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(monitor.soundOn)), (hush.disabled = !monitor.soundOn));
  const sound = button('Sound off', () => (monitor.soundOn ? (monitor.disableSound(), drawSound()) : void monitor.enableSound().then(drawSound)), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  // owner ruling Q3: Silence here quiets THIS window's alarm sound only (by the skin's rule); the instructor's Silence
  // does not quiet it, and this one sends nothing to the session
  const hush = button('Silence here', () => {
    const on = monitor.silenceAudio();
    hush.setAttribute('aria-pressed', String(on));
  }, 'small');
  hush.setAttribute('aria-pressed', 'false');
  hush.title = "Silence this window's alarm sound";
  hush.disabled = true;
  bar.append(status, sound, hush);
  let raf = 0;
  const f: Follower = { monitor, transport, sync: null, destroy, style: { skin: site.skin, theme: site.theme } };
  const style = styleChannel(code);
  style.onmessage = (ev: MessageEvent<StyleMsg>) => {
    const m = ev.data;
    if (m?.kind !== 'style' || (m.skin === f.style.skin && m.theme === f.style.theme)) return;
    f.style = { skin: m.skin, theme: m.theme };
    applySkinAlarmColours(m.skin, m.theme);
    void monitor.setSkin(m.skin, m.theme ? { theme: m.theme } : {});
  };
  style.postMessage({ kind: 'ask' } satisfies StyleMsg);
  void monitor.viewerClock().then((clock) => {
    const sync = new ViewerSync({ session: code, transport, target: clock, engineVersion });
    f.sync = sync;
    const loop = () => {
      sync.follow(); // once per frame: steers this monitor's clock onto the instructor's (a frame behind is fine)
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
  // R50 F5: host liveness — a running host sends at least its 1 Hz state; a paused one may be silent. Silence of more than
  // 5 s while running means the instructor's window is gone or reloading (it comes back under the same code).
  let heard = performance.now();
  let paused = false;
  const offHost = transport.onMessage((m) => {
    if (m.kind === 'hello' && m.role !== 'host') return;
    if (m.kind === 'command') return;
    heard = performance.now();
    if (m.kind !== 'event') return;
    for (const e of m.body) {
      const c = e.type === 'commandApplied' ? (e.resolved as { command?: { type?: string; action?: string } } | undefined)?.command : undefined;
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) paused = c.action === 'pause';
    }
  });
  const draw = setInterval(() => {
    const s = f.sync?.status ?? 'waiting';
    const alive = paused || performance.now() - heard < HOST_SILENT_MS;
    setText(status, s === 'incompatible' ? 'This window runs another version: reload both windows' : s !== 'synced' ? `Waiting for the instructor's monitor ${code}…` : !alive ? "The instructor's monitor is not answering" : `Following session ${code}${paused ? ' (paused)' : ''}`);
    status.dataset.ok = String(s === 'synced' && alive);
  }, 500);
  function destroy(): void {
    offHost();
    style.close();
    cancelAnimationFrame(raf);
    clearInterval(draw);
    f.sync?.close();
    transport.close();
    monitor.destroy();
  }
  return f;
}
