// Engine alarm state → alarm sound (request E-4a-3; brief §6.4, §6.4.1): the `alarmStatus` event is the single
// source; the bridge raises and clears alarms on the 4a AlarmSounder (which sounds only the highest priority,
// ties first raised) and mirrors the engine's silence/pause. Acknowledged alarms are silent. FU-5: so are latched
// alarms under visual-only latching — the engine's `sounding` flag decides (absent in older events: not acknowledged).
import type { AlarmLevel } from '@pme/audio';
import type { AlarmStatus } from './alarm-view.ts';

/** The part of @pme/audio's AlarmSounder the bridge drives (a fake in tests). */
export interface SounderLike {
  raise(id: string, level: AlarmLevel, t: number): void;
  clear(id: string, t: number): void;
  silenceAll(t: number, durationS?: number): void;
  endSilence(t: number): void;
  setVolume(step: number): void;
  readonly silencedUntil: number | null;
}

export class AlarmAudioBridge {
  private audible = new Map<string, AlarmLevel>();
  private quietUntil: number | null = null;
  private readonly sounder: SounderLike;
  private readonly timeScale: () => number;
  /** FU-11 (owner ruling Q3): this window's own Silence, when it manages its sound itself; ack = until a new alarm. */
  private own: { ack: boolean } | null = null;
  private readonly windowSilence: boolean;

  /**
   * `windowSilence` (FU-11, owner ruling Q3; the second-screen learner monitor): this window's alarm SOUND is managed
   * here — the instructor's Silence (a mute timer or an acknowledge) does not quiet it, and its own Silence
   * (`silenceWindow`) reaches no engine. The alarm conditions and what the monitor shows stay the shared patient's.
   */
  constructor(sounder: SounderLike, timeScale: () => number = () => 1, o: { windowSilence?: boolean } = {}) {
    this.sounder = sounder;
    this.timeScale = timeScale;
    this.windowSilence = o.windowSilence === true;
  }

  /** FU-11 (Q3): this window's own Silence, by the skin's rule (a mute timer, or until a new alarm); pressed again, it
   *  ends. Returns whether this window is now silenced. Only for a bridge made with `windowSilence`. */
  silenceWindow(t: number, s: { durationS: number | null; mode: 'mute' | 'acknowledge' }): boolean {
    if (this.sounder.silencedUntil !== null) {
      this.sounder.endSilence(t);
      this.own = null;
      return false;
    }
    const ack = s.mode === 'acknowledge' || s.durationS === null;
    this.sounder.silenceAll(t, ack ? 1e9 : (s.durationS as number));
    this.own = { ack };
    return true;
  }

  /** Apply one alarmStatus event at its sim time. */
  onStatus(st: AlarmStatus): void {
    const t = st.t;
    const want = new Map<string, AlarmLevel>();
    // in a window that manages its own sound an alarm the instructor acknowledged still sounds here; a latched alarm
    // under visual-only latching (not sounding, not acknowledged) stays silent everywhere
    for (const a of st.active) if (this.windowSilence ? a.acked || a.sounding !== false : (a.sounding ?? !a.acked)) want.set(a.id, a.level);
    for (const id of this.audible.keys()) if (!want.has(id)) this.sounder.clear(id, t);
    const fresh = [...want.keys()].some((id) => !this.audible.has(id));
    for (const [id, level] of want) if (this.audible.get(id) !== level) this.sounder.raise(id, level, t);
    this.audible = want;
    this.sounder.setVolume(st.volume);
    if (this.windowSilence) {
      if (this.own?.ack && fresh && this.sounder.silencedUntil !== null) this.sounder.endSilence(t); // a new alarm sounds
      if (this.sounder.silencedUntil === null) this.own = null;
      return;
    }
    const until = st.pausedUntil ?? st.silencedUntil;
    if (until !== null && until !== this.quietUntil) this.sounder.silenceAll(t, (until - t) / this.timeScale());
    if (until === null && this.quietUntil !== null && this.sounder.silencedUntil !== null) this.sounder.endSilence(t);
    this.quietUntil = until;
  }
}
