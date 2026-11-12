// What a learner monitor says and does, from what it knows — one pure function, so every state a phone can be in (a
// relay it cannot reach, a full session, a lost socket, a silent instructor, the Ventilator view driving the patient)
// is unit-tested without a browser. The second screen (same browser) meets only the last four rows.
import type { TransportStatus, WireMessage } from '@pme/controller';

/** No message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG: ui]. */
export const HOST_SILENT_MS = 5000;
/** The phone has not reached the relay for this long: it is probably not on the classroom network [ENG: ui]. */
export const UNREACHABLE_MS = 6000;
/** The host's `cockpit` events come once a second; this long without one, the Ventilator view has closed [ENG: ui]. */
export const COCKPIT_QUIET_MS = 2500;

export interface FollowerInput {
  code: string;
  /** Over the relay (a phone), not this browser's BroadcastChannel. */
  net: boolean;
  sync: 'waiting' | 'synced' | 'incompatible';
  transport: TransportStatus;
  /** The transport has been open at least once. */
  opened: boolean;
  /** Wall ms since the page started following. */
  sinceStartMs: number;
  /** The relay's refusal, if any (`full`: the session took its last phone). */
  refused: { code: string; message: string } | null;
  /** The relay says the instructor's page is not connected. */
  hostAway: boolean;
  /** Wall ms since the last message from the host. */
  heardAgoMs: number;
  /** The host is paused (its sticky `time pause`). */
  paused: boolean;
  /** Wall ms since the host's last `cockpit` event (Infinity: never). */
  cockpitAgoMs: number;
  /**
   * Brief 195: the host said its simulation has stopped (`engineStopped`, once a second while it lasts), and no new
   * engine has run since (a `timeline`, or a reloaded page's hello). Absent: false.
   */
  stopped?: boolean;
}

export interface FollowerView {
  text: string;
  /** Following normally (the status pill's `data-ok`). */
  ok: boolean;
  /** Hold the monitor still: the Ventilator view drives the patient and this monitor cannot follow it. */
  hold: boolean;
}

/** Brief 195: a host still here whose simulation has stopped (an error while its engine stepped). */
export const ENGINE_STOPPED = "The instructor's simulation has stopped with an error: waiting for the instructor to restart it";

/** Said under a phone's monitor when the instructor's style has no upright (phone) layout. */
export const NO_PHONE_LAYOUT = 'This monitor style has no phone layout: showing the default style';

/**
 * The style a PHONE wears — the instructor's (it comes in the follow stream), upright. A style the phone cannot draw
 * upright (not in `upright`: every shipped style can, measured at 375 px) falls back to `fallback`, the default style, and
 * says so; an unknown theme falls back to the style's own look ('').
 */
export function phoneStyle(want: { skin: string; theme: string }, upright: ReadonlySet<string>, themes: ReadonlySet<string>, fallback: string): { skin: string; theme: string; note: string | null } {
  const theme = themes.has(want.theme) ? want.theme : '';
  return upright.has(want.skin) ? { skin: want.skin, theme, note: null } : { skin: fallback, theme, note: NO_PHONE_LAYOUT };
}

/**
 * Whether the host is paused, as a follower learns it from the host's messages (FX-22): a live `time pause`/`resume`, or
 * the host's own state when it welcomes a follower — the sticky replays, then the snapshot that ends every welcome. A
 * host page that (re)announces itself (`hello`: a reload) has said nothing yet; its welcome without a replayed pause is
 * a running host. (A page reloaded from a pause runs again without ever sending a resume, and the phone kept "(paused)".)
 */
export function hostPause(): { readonly paused: boolean; onMessage(m: WireMessage): void } {
  let paused = false;
  let said: boolean | null = null; // What this host page has said, live or replayed (null: nothing since its hello)
  return {
    get paused() {
      return paused;
    },
    onMessage(m) {
      if (m.kind === 'hello' && m.role === 'host') return void (said = null);
      if (m.kind === 'snapshot') return void (paused = said ?? false); // The end of a welcome: the host's state as it said it
      if (m.kind !== 'event') return;
      for (const e of m.body) {
        const r = e.type === 'commandApplied' ? (e.resolved as { command?: { type?: string; action?: string }; replay?: boolean } | undefined) : undefined;
        const c = r?.command;
        if (c?.type !== 'time' || (c.action !== 'pause' && c.action !== 'resume')) continue;
        said = c.action === 'pause';
        if (!r?.replay) paused = said; // A live command shows at once; a replay with the welcome's snapshot
      }
    },
  };
}

const NOT_ANSWERING = "The instructor's monitor is not answering";

export function followerStatus(i: FollowerInput): FollowerView {
  const no = (text: string): FollowerView => ({ text, ok: false, hold: false });
  if (i.net && i.refused?.code === 'full') return no('This session is full: please watch the main screen');
  if (i.net && i.refused) return no(`The classroom refused this phone: ${i.refused.message}`);
  if (i.sync === 'incompatible') return no(i.net ? 'This phone has another version of the simulator: scan the code again' : 'This window runs another version: reload both windows');
  if (i.net && !i.opened && i.sinceStartMs > UNREACHABLE_MS) return no("Waiting for the instructor: this phone cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?");
  if (i.net && i.opened && i.transport !== 'open') return no('Connection lost: reconnecting…');
  // Brief 195: a stopped host says so every second, so its silence (or the relay's word) means it has gone; it sends no
  // snapshot, so a phone that joined after the stop is never synced and is told the same
  if (i.stopped) return no(i.hostAway || i.heardAgoMs >= HOST_SILENT_MS ? NOT_ANSWERING : ENGINE_STOPPED);
  if (i.sync !== 'synced') return no(`Waiting for the instructor's monitor ${i.code}…`);
  if (i.hostAway || (!i.paused && i.heardAgoMs >= HOST_SILENT_MS)) return no(NOT_ANSWERING);
  if (i.net && i.cockpitAgoMs < COCKPIT_QUIET_MS) return { text: 'The ventilator is on the main screen: this monitor waits until it closes', ok: true, hold: true };
  return { text: `Following session ${i.code}${i.paused ? ' (paused)' : ''}`, ok: true, hold: false };
}
