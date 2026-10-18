// What a learner monitor says and does, from what it knows — one pure function, so every state a phone can be in (a
// relay it cannot reach, a full session, a lost socket, a silent instructor, the Ventilator view driving the patient)
// is unit-tested without a browser. The second screen (same browser) meets only the last four rows.
import type { TransportStatus } from '@pme/controller';

/** No message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG]. */
export const HOST_SILENT_MS = 5000;
/** The phone has not reached the relay for this long: it is probably not on the classroom network [ENG]. */
export const UNREACHABLE_MS = 6000;
/** The host's `cockpit` events come once a second; this long without one, the Ventilator view has closed [ENG]. */
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
}

export interface FollowerView {
  text: string;
  /** Following normally (the status pill's `data-ok`). */
  ok: boolean;
  /** Hold the monitor still: the Ventilator view drives the patient and this monitor cannot follow it. */
  hold: boolean;
}

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

export function followerStatus(i: FollowerInput): FollowerView {
  const no = (text: string): FollowerView => ({ text, ok: false, hold: false });
  if (i.net && i.refused?.code === 'full') return no('This session is full: please watch the main screen');
  if (i.net && i.refused) return no(`The classroom refused this phone: ${i.refused.message}`);
  if (i.sync === 'incompatible') return no(i.net ? 'This phone has another version of the simulator: scan the code again' : 'This window runs another version: reload both windows');
  if (i.net && !i.opened && i.sinceStartMs > UNREACHABLE_MS) return no("Waiting for the instructor: this phone cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?");
  if (i.net && i.opened && i.transport !== 'open') return no('Connection lost: reconnecting…');
  if (i.sync !== 'synced') return no(`Waiting for the instructor's monitor ${i.code}…`);
  if (i.hostAway || (!i.paused && i.heardAgoMs >= HOST_SILENT_MS)) return no("The instructor's monitor is not answering");
  if (i.net && i.cockpitAgoMs < COCKPIT_QUIET_MS) return { text: 'The ventilator is on the main screen: this monitor waits until it closes', ok: true, hold: true };
  return { text: `Following session ${i.code}${i.paused ? ' (paused)' : ''}`, ok: true, hold: false };
}
