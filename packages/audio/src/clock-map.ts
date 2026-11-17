// Sim time → wall time → audio time (brief §3.6 "Clock mapping"; web.dev "A tale of two clocks").
//   wallMs(t) = anchorWall + (t − anchorSim) · 1000 / timeScale
//   audioTime(wallMs) = contextTime + (wallMs − performanceTime) / 1000   (AudioContext.getOutputTimestamp)
// Run time is the case's running wall time (paused time excluded): a tone placed on it keeps real-time spacing at any
// speed and holds while the case is paused.
//   wallMs(r) = anchorWall + (r − anchorRun) · 1000

export interface Anchor {
  simT: number; // sim seconds shown on screen at perfMs
  perfMs: number; // main-thread performance.now() of that frame
  timeScale: number;
  runS: number; // run seconds at perfMs
}

export interface OutputTimestamp {
  contextTime: number; // seconds
  performanceTime: number; // ms, performance.now() timebase
}

export class ClockMap {
  private anchor: Anchor | null = null;

  setAnchor(a: Anchor): void {
    this.anchor = { ...a };
  }

  get hasAnchor(): boolean {
    return this.anchor !== null;
  }

  /** Sim seconds per wall second (1 until an anchor arrives). */
  get timeScale(): number {
    return this.anchor?.timeScale ?? 1;
  }

  /** performance.now() time (ms) at which sim time t reaches the screen. */
  simToPerfMs(t: number): number {
    const a = this.need();
    return a.perfMs + ((t - a.simT) * 1000) / a.timeScale;
  }

  /** performance.now() time (ms) at which the case has run r seconds. */
  runToPerfMs(r: number): number {
    const a = this.need();
    return a.perfMs + (r - a.runS) * 1000;
  }

  /** Run seconds at sim time t, at the current speed. */
  simToRun(t: number): number {
    const a = this.need();
    return a.runS + (t - a.simT) / a.timeScale;
  }

  /** Sim seconds at run time r, at the current speed. */
  runToSim(r: number): number {
    const a = this.need();
    return a.simT + (r - a.runS) * a.timeScale;
  }

  private need(): Anchor {
    if (!this.anchor) throw new Error('ClockMap: no anchor yet');
    return this.anchor;
  }
}

/** Map a performance.now() time to the audio clock using an output timestamp. */
export function perfToAudioTime(perfMs: number, ts: OutputTimestamp): number {
  return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
}
