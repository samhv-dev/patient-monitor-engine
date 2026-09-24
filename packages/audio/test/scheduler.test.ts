import { describe, expect, it } from 'vitest';
import { ToneScheduler, type ToneRequest } from '../src/scheduler.ts';
import { beepEnvelope, BEEP_MS } from '../src/tones.ts';

/** Audio time == perf seconds in this fake. */
function setup(nowPerfMs: { v: number }) {
  const played: Array<{ tone: ToneRequest; when: number }> = [];
  const s = new ToneScheduler({
    audioNow: () => nowPerfMs.v / 1000,
    perfToAudio: (p) => p / 1000,
    play: (tone, when) => played.push({ tone, when }),
  });
  s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  return { s, played };
}

describe('ToneScheduler', () => {
  it('schedules tones within the 100 ms look-ahead at their exact audio time', () => {
    const now = { v: 1000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.05, id: 'a', kind: 'qrs' });
    s.enqueue({ t: 1.5, id: 'b', kind: 'qrs' });
    expect(played.map((p) => p.tone.id)).toEqual(['a']);
    expect(played[0]!.when).toBeCloseTo(1.05, 12);
    now.v = 1420;
    s.pump();
    expect(played.map((p) => p.tone.id)).toEqual(['a', 'b']);
  });

  it('plays a tone up to 30 ms late immediately and drops a later one', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.98, id: 'late20', kind: 'qrs' });
    s.enqueue({ t: 1.9, id: 'late100', kind: 'qrs' });
    expect(played.map((p) => p.tone.id)).toEqual(['late20']);
    expect(played[0]!.when).toBeCloseTo(2, 12);
    expect(s.log.find((l) => l.id === 'late100')!.dropped).toBe(true);
  });

  it('toneCancel revokes queued tones after the given sim time', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.enqueue({ t: 0.5, id: 'x', kind: 'qrs' });
    s.enqueue({ t: 0.9, id: 'y', kind: 'qrs' });
    s.cancelAfter(0.6);
    expect(s.pending).toBe(1);
    now.v = 1000;
    s.pump();
    expect(played).toHaveLength(0); // x was 500 ms late → dropped, y cancelled
  });

  it('follows the time scale (beeps follow sim time)', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 2 });
    s.enqueue({ t: 0.1, id: 'a', kind: 'qrs' });
    expect(played[0]!.when).toBeCloseTo(0.05, 12);
  });

  it('beep envelope: 5 ms attack, 60 ms total, back to zero', () => {
    const env = beepEnvelope(0.5);
    expect(env[1]).toEqual([0.005, 0.5]);
    expect(env[env.length - 1]).toEqual([BEEP_MS / 1000, 0]);
  });
});
