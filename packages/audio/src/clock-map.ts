// Sim time → wall time → audio time (brief §3.6 "Clock mapping"; web.dev "A tale of two clocks").
//   wallMs(t) = anchorWall + (t − anchorSim) · 1000 / timeScale
//   audioTime(wallMs) = contextTime + (wallMs − performanceTime) / 1000   (AudioContext.getOutputTimestamp)

export interface Anchor {
  simT: number; // sim seconds shown on screen at perfMs
  perfMs: number; // main-thread performance.now() of that frame
  timeScale: number;
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
    const a = this.anchor;
    if (!a) throw new Error('ClockMap: no anchor yet');
    return a.perfMs + ((t - a.simT) * 1000) / a.timeScale;
  }
}

/** Map a performance.now() time to the audio clock using an output timestamp. */
export function perfToAudioTime(perfMs: number, ts: OutputTimestamp): number {
  return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
}
