// Audio context creation and unlock (brief §3.6; research 05 §3.2, §5.5):
// the AudioContext is created AND resumed inside the first user gesture; on iOS a looping silent
// <audio> element keeps Web Audio playing when the ring/silent switch is on (the keep-alive workaround).

export interface AudioOut {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  /** getOutputTimestamp-based mapping from performance.now() ms to audio time. */
  perfToAudio(perfMs: number): number;
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
export async function unlockAudio(): Promise<AudioOut> {
  const keepAlive = document.createElement('audio');
  keepAlive.setAttribute('playsinline', '');
  keepAlive.loop = true;
  keepAlive.src = silentWavDataUri();
  void keepAlive.play().catch(() => undefined);
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const perfToAudio = (perfMs: number): number => {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return ctx.currentTime + (perfMs - performance.now()) / 1000 + ctx.baseLatency;
  };
  return { ctx, master, perfToAudio };
}
