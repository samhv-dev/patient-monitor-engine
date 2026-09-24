// Defibrillator charge / charge-ready / shock and NIBP-done tones as data (brief §6.5; research 05 §2.6, §2.4).
// The CADENCES are documented (ZOLL: continuous ready tone 20 or 50 s, then a higher tone 10 s, then disarm;
// LIFEPAK: ramping charge tone, auto-disarm 60 s; Philips NBP "Done Tone"); pitches and lengths are [assumed].

/** A tone is a list of segments played back to back; a segment glides linearly from startHz to endHz. */
export interface ToneSegment {
  startHz: number;
  endHz: number;
  durMs: number;
  /** Silence after this segment (ms). */
  gapMs: number;
}

export type ToneSet = 'zoll-like' | 'lifepak-like';
export type DeviceToneKind = 'charge' | 'chargeReady' | 'shock' | 'nibpDone';

/** Charge tone for a charge lasting `chargeS` seconds. */
export function chargeTone(set: ToneSet, chargeS: number): ToneSegment[] {
  const ms = Math.max(0.2, chargeS) * 1000;
  if (set === 'lifepak-like') return [{ startHz: 400, endHz: 1000, durMs: ms, gapMs: 0 }]; // ramping tone [assumed pitch]
  // ZOLL-like "distinctive charging tone" [assumed]: 100 ms pips every 250 ms at 700 Hz.
  const n = Math.max(1, Math.floor(ms / 250));
  return Array.from({ length: n }, () => ({ startHz: 700, endHz: 700, durMs: 100, gapMs: 150 }));
}

/** Charged-and-ready tone until disarm. ZOLL-like: 50 s continuous, then a higher tone for 10 s. LIFEPAK-like: 60 s. */
export function chargeReadyTone(set: ToneSet): ToneSegment[] {
  if (set === 'zoll-like') {
    return [
      { startHz: 1000, endHz: 1000, durMs: 50_000, gapMs: 0 },
      { startHz: 1300, endHz: 1300, durMs: 10_000, gapMs: 0 },
    ];
  }
  return [{ startHz: 1000, endHz: 1000, durMs: 60_000, gapMs: 0 }];
}

/** Short confirmation when a shock is delivered [assumed]. */
export const SHOCK_TONE: ToneSegment[] = [{ startHz: 1200, endHz: 1200, durMs: 120, gapMs: 0 }];
/** NIBP measurement complete (Philips-like "Done Tone") [assumed pitch and length]. */
export const NIBP_DONE_TONE: ToneSegment[] = [{ startHz: 1047, endHz: 1047, durMs: 150, gapMs: 0 }];

export const DEVICE_TONE_PROVENANCE = {
  chargeTone: { tag: 'assumed', source: 'research/05 §2.6 (LIFEPAK ramping tone; ZOLL distinctive charging tone)' },
  chargeReadyTone: { tag: 'documented', source: 'research/05 §2.6 (ZOLL 50 s + 10 s higher; LIFEPAK auto-disarm 60 s)', note: 'pitches [assumed]' },
  SHOCK_TONE: { tag: 'assumed', source: 'brief §6.5' },
  NIBP_DONE_TONE: { tag: 'assumed', source: 'research/05 §2.4 (Philips Done Tone)' },
} as const;

export const toneDurationMs = (segs: readonly ToneSegment[]): number => segs.reduce((a, s) => a + s.durMs + s.gapMs, 0);
