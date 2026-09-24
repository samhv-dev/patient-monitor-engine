// Audio context creation and unlock (brief §3.6; research 05 §3.2, §5.5):
// the AudioContext is created AND resumed inside the first user gesture; on iOS a looping silent
// <audio> element keeps Web Audio playing when the ring/silent switch is on (the keep-alive workaround).

export interface AudioOut {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  /** getOutputTimestamp-based mapping from performance.now() ms to audio time. */
  perfToAudio(perfMs: number): number;
  /** Measured output latency (s), or undefined when the browser reports none. */
  outputLatency(): number | undefined;
  /** Stop the keep-alive and close the context (iOS caps the number of live contexts). */
  close(): void;
}

/** One reading of the audio and performance clocks. */
export interface ClockReadings {
  currentTime: number; // AudioContext.currentTime (s)
  perfNow: number; // performance.now() (ms) at the same moment
  baseLatency?: number;
  outputLatency?: number;
  ts?: { contextTime?: number; performanceTime?: number }; // AudioContext.getOutputTimestamp()
}

function validTs(r: ClockReadings): { contextTime: number; performanceTime: number } | null {
  const ts = r.ts;
  return ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0
    ? { contextTime: ts.contextTime, performanceTime: ts.performanceTime }
    : null;
}

/**
 * performance.now() ms → the audio time that is HEARD at that moment. With a valid output timestamp:
 * contextTime + (perfMs − performanceTime)/1000. Fallback (no getOutputTimestamp, or performanceTime 0 right after
 * resume): the sample at currentTime is heard base + output latency after now, so that latency is SUBTRACTED
 * (review M6; the Stage 1 code added baseLatency).
 */
export function mapPerfToAudio(perfMs: number, r: ClockReadings): number {
  const ts = validTs(r);
  if (ts) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  return r.currentTime + (perfMs - r.perfNow) / 1000 - ((r.baseLatency ?? 0) + (r.outputLatency ?? 0));
}

/**
 * Output latency (s): AudioContext.outputLatency when reported (> 0), else how far the output position
 * (from getOutputTimestamp) trails currentTime, else undefined (the scheduler then assumes 20 ms, ruling R15).
 */
export function measureOutputLatency(r: ClockReadings): number | undefined {
  if (r.outputLatency !== undefined && Number.isFinite(r.outputLatency) && r.outputLatency > 0) return r.outputLatency;
  const ts = validTs(r);
  if (ts) return Math.max(0, r.currentTime - (ts.contextTime + (r.perfNow - ts.performanceTime) / 1000));
  return undefined;
}

type ResumableContext = EventTarget & { readonly state: string; resume(): Promise<void> };

/**
 * iOS suspends or interrupts the AudioContext when the page is backgrounded and never resumes it (review M7).
 * Resume on visibilitychange (when visible) and pageshow; report every non-running state change so queued tones
 * (whose audio times froze) can be cleared. Returns a function that removes the listeners.
 */
export function keepContextRunning(
  ctx: ResumableContext,
  doc: EventTarget & { readonly visibilityState: string },
  win: EventTarget,
  onInterrupt: () => void = () => undefined,
): () => void {
  const resume = () => {
    if (ctx.state !== 'running' && ctx.state !== 'closed' && doc.visibilityState === 'visible') void ctx.resume().catch(() => undefined);
  };
  const onState = () => {
    if (ctx.state !== 'running') onInterrupt();
  };
  doc.addEventListener('visibilitychange', resume);
  win.addEventListener('pageshow', resume);
  ctx.addEventListener('statechange', onState);
  return () => {
    doc.removeEventListener('visibilitychange', resume);
    win.removeEventListener('pageshow', resume);
    ctx.removeEventListener('statechange', onState);
  };
}

/** A 0.5 s silent 8 kHz mono 8-bit WAV as a data URI (no external file needed). */
export function silentWavDataUri(): string {
  const n = 4000;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  bytes.fill(128, 44); // 8-bit silence
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/** Must be called from a user-gesture handler (click/touch). */
export async function unlockAudio(onInterrupt?: () => void): Promise<AudioOut> {
  const keepAlive = document.createElement('audio');
  keepAlive.setAttribute('playsinline', '');
  keepAlive.loop = true;
  keepAlive.src = silentWavDataUri();
  void keepAlive.play().catch(() => undefined);
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const read = (): ClockReadings => ({
    currentTime: ctx.currentTime,
    perfNow: performance.now(),
    baseLatency: ctx.baseLatency,
    outputLatency: (ctx as AudioContext & { outputLatency?: number }).outputLatency,
    ts: ctx.getOutputTimestamp?.(),
  });
  const unwatch = keepContextRunning(ctx, document, window, onInterrupt);
  return {
    ctx,
    master,
    perfToAudio: (perfMs) => mapPerfToAudio(perfMs, read()),
    outputLatency: () => measureOutputLatency(read()),
    close() {
      unwatch();
      keepAlive.pause();
      keepAlive.removeAttribute('src');
      void ctx.close().catch(() => undefined);
    },
  };
}
