// Which page of this browser plays a session's sound. The instructor's page, a learner monitor window and a
// defibrillator window each play the whole patient monitor's sound (beeps, alarms, device tones) from their own engine,
// a tenth of a second apart, so two of them on one computer's loudspeaker are heard as a double beep. Among the pages
// of one browser that follow one session code, at most one sounds: a page that switches its sound on says so on the
// session's sound channel, and the page that was sounding switches off and keeps the name of the page that took it. A
// page that closes or reloads gives the sound up and nothing takes it over (a browser starts sound only on a press).
// Another browser or device is not on the channel and keeps its own sound.

export const SOUND_CHANNEL = 'pme.sound.';

type Msg = { kind: 'on'; id: string; where: string; at: number } | { kind: 'off'; id: string };
type Channel = { postMessage(m: Msg): void; close(): void; onmessage: ((e: MessageEvent) => void) | null };

export interface SoundSeat {
  /** Where the session's sound plays when another page of this browser plays it ("the learner monitor"), else null. */
  readonly elsewhere: string | null;
  /** This page now sounds: the page of the session that sounded stops. */
  on(): void;
  /** This page no longer sounds. */
  off(): void;
  onChange(fn: () => void): () => void;
  close(): void;
}

/** The words of a Sound switch: on, off, or off with the page that plays the session's sound. */
export const soundWords = (on: boolean, elsewhere: string | null): string =>
  on ? 'Sound on' : elsewhere ? `Sound off: playing in ${elsewhere}` : 'Sound off';

const open = (name: string): Channel | null => {
  try {
    return new BroadcastChannel(name) as Channel;
  } catch {
    return null;
  }
};

/** This page's seat for session `code`'s sound; `where` names this page to the others; `stop()` silences this page
 *  when another one takes the sound or this page goes away. */
export function soundSeat(code: string, where: string, stop: () => void, win: EventTarget = window): SoundSeat {
  const id = Math.random().toString(36).slice(2);
  const c = open(SOUND_CHANNEL + code);
  const fns = new Set<() => void>();
  const changed = () => fns.forEach((fn) => fn());
  let since: number | null = null; // when this page took the sound; null while it does not sound
  let other: { id: string; where: string; at: number } | null = null;
  const off = () => {
    if (since === null) return;
    since = null;
    c?.postMessage({ kind: 'off', id });
  };
  // A newer press wins, so two pages pressed within the channel's delivery time still leave exactly one sounding
  const newer = (m: { id: string; at: number }, than: { id: string; at: number }) => m.at > than.at || (m.at === than.at && m.id > than.id);
  if (c) c.onmessage = (e) => {
    const m = e.data as Msg;
    if (m?.kind === 'on') {
      if (since !== null && !newer(m, { id, at: since })) return;
      if (other && !newer(m, other)) return;
      other = { id: m.id, where: m.where, at: m.at };
      if (since !== null) {
        since = null;
        stop();
      }
      changed();
    } else if (m?.kind === 'off' && m.id === other?.id) {
      other = null;
      changed();
    }
  };
  const leave = () => {
    if (since === null) return;
    off();
    stop();
    changed();
  };
  win.addEventListener('pagehide', leave);
  return {
    get elsewhere() {
      return other?.where ?? null;
    },
    on() {
      since = performance.timeOrigin + performance.now();
      other = null;
      c?.postMessage({ kind: 'on', id, where, at: since });
      changed();
    },
    off() {
      off();
      changed();
    },
    onChange(fn) {
      fns.add(fn);
      return () => void fns.delete(fn);
    },
    close() {
      win.removeEventListener('pagehide', leave);
      off();
      c?.close();
      fns.clear();
    },
  };
}
