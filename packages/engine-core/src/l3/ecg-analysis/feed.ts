// The ECG analysis feed (defibrillator plan §3.4.3, piece E4a): the samples a device's analysis sees — one named lead
// after the monitor's front end (electrodes, artefacts, lead-off, mains; engine.ts `ecgFrontEnd`), before any display
// or detection filter, so each analyser applies its own band (the AED's 1–30 Hz, features.ts). The state is plain
// JSON-safe data inside the pipeline state, beside the QRS detector's: it is cloned with the look-ahead as that is,
// it is in the snapshot, and a follower replaying the commands rebuilds it exactly. It draws no randomness. The
// committed state's feed holds committed samples only: the look-ahead writes into its own clone.
import type { LeadId } from '../../types.ts';
import { SEGMENT_S } from './features.ts';

/** The feed holds one analysis segment: a reader takes its segment from the committed frontier. */
export const FEED_S = SEGMENT_S;

export interface EcgFeedState {
  lead: LeadId;
  fs: number;
  /** Ring of the last FEED_S·fs samples; sample n sits at n mod buf.length. */
  buf: number[];
  /** The next sample index expected (the pipeline's committed frontier, for the committed state). */
  next: number;
  /** Samples written since the feed was created, capped at buf.length. */
  held: number;
}

/** What a device sees of the feed (DeviceHost.ecgFeed): the lead's name, its rate and the latest segment. */
export interface EcgFeedView {
  lead: LeadId;
  fs: number;
  /** First sample index not yet committed. */
  committedN: number;
  /** The last `seconds` (default one segment) of committed samples, oldest first; null until that much is held. */
  segment(seconds?: number): Float64Array | null;
}

export function createEcgFeed(lead: LeadId, fs: number, next = 0): EcgFeedState {
  return { lead, fs, buf: new Array<number>(Math.round(FEED_S * fs)).fill(0), next, held: 0 };
}

/** Write sample n. Samples arrive in order; a gap (never expected) starts the feed afresh rather than splice two timelines. */
export function feedWrite(f: EcgFeedState, n: number, v: number): void {
  if (n !== f.next) f.held = 0;
  const len = f.buf.length;
  f.buf[n % len] = v;
  f.next = n + 1;
  if (f.held < len) f.held++;
}

export function feedSegment(f: EcgFeedState, seconds: number = FEED_S): Float64Array | null {
  const len = Math.round(seconds * f.fs);
  if (len <= 0 || len > f.held) return null;
  const out = new Float64Array(len);
  const cap = f.buf.length;
  const n0 = f.next - len;
  for (let i = 0; i < len; i++) out[i] = f.buf[(n0 + i) % cap] as number;
  return out;
}

export function feedView(f: EcgFeedState): EcgFeedView {
  return { lead: f.lead, fs: f.fs, committedN: f.next, segment: (s?: number) => feedSegment(f, s) };
}
