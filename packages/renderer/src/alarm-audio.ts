// Engine alarm state → alarm sound (request E-4a-3; brief §6.4, §6.4.1): the `alarmStatus` event is the single
// source; the bridge raises and clears alarms on the 4a AlarmSounder (which sounds only the highest priority,
// ties first raised) and mirrors the engine's silence/pause. Acknowledged alarms are silent.
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

  constructor(sounder: SounderLike, timeScale: () => number = () => 1) {
    this.sounder = sounder;
    this.timeScale = timeScale;
  }

  /** Apply one alarmStatus event at its sim time. */
  onStatus(st: AlarmStatus): void {
    const t = st.t;
    const want = new Map<string, AlarmLevel>();
    for (const a of st.active) if (!a.acked) want.set(a.id, a.level);
    for (const id of this.audible.keys()) if (!want.has(id)) this.sounder.clear(id, t);
    for (const [id, level] of want) if (this.audible.get(id) !== level) this.sounder.raise(id, level, t);
    this.audible = want;
    const until = st.pausedUntil ?? st.silencedUntil;
    if (until !== null && until !== this.quietUntil) this.sounder.silenceAll(t, (until - t) / this.timeScale());
    if (until === null && this.quietUntil !== null && this.sounder.silencedUntil !== null) this.sounder.endSilence(t);
    this.quietUntil = until;
    this.sounder.setVolume(st.volume);
  }
}
