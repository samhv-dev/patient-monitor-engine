// FU-11 Task B1 (external review F19, browser audit BA08 A02/A03): a cancel stops a voice that is already sounding, and
// the scheduler keeps a long voice (a 60 s ready tone) until it has ended, not for a fixed 2 s.
import { describe, expect, it } from 'vitest';
import { ToneScheduler } from '../src/scheduler.ts';

function rig(durS: number) {
  const now = { s: 0 };
  const stops: number[] = [];
  const s = new ToneScheduler({
    audioNow: () => now.s,
    perfToAudio: (p) => p / 1000,
    outputLatency: () => 0,
    play: (_tone, when) => ({ endsAt: when + durS, stop: () => stops.push(now.s) }),
  });
  s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  return { s, now, stops };
}

describe('FU-11 B1: cancelling a sounding voice', () => {
  for (const at of [0.25, 2.5, 30]) {
    it(`a 60 s ready tone cancelled ${at} s after it started is stopped once`, () => {
      const { s, now, stops } = rig(60);
      s.enqueue({ t: 0, id: 'ready', kind: 'chargeReady' });
      now.s = at;
      s.pump();
      s.cancel(['ready']);
      s.cancel(['ready']);
      expect(stops).toEqual([at]);
    });
  }
  it('a voice that has ended is not stopped again, and is forgotten 2 s after its end', () => {
    const { s, now, stops } = rig(0.06);
    s.enqueue({ t: 0, id: 'beep', kind: 'qrs' });
    now.s = 1;
    s.pump();
    s.cancel(['beep']);
    expect(stops).toEqual([]);
    now.s = 2.2;
    s.pump();
    s.enqueue({ t: 2.2, id: 'beep', kind: 'qrs' }); // forgotten → a new tone with the same id plays
    expect(s.log.filter((l) => l.id === 'beep')).toHaveLength(2);
  });
  it('a restore to before a sounding ready tone stops it (the engine\'s toneCancel {after}); a forward restore does not (R50 M12)', () => {
    const { s, now, stops } = rig(60);
    s.enqueue({ t: 3, id: 'ready', kind: 'chargeReady' });
    now.s = 6;
    s.pump();
    s.cancelAfter(10); // a bookmark LATER than the tone: the known limit — the old timeline's tone keeps sounding
    expect(stops).toEqual([]);
    s.cancelAfter(1); // a bookmark before the charge: the tone belongs to the discarded future
    expect(stops).toEqual([6]);
  });
  it('a cancel before the start still prevents it (unchanged)', () => {
    const { s, now, stops } = rig(1);
    s.enqueue({ t: 0.5, id: 'x', kind: 'alarm' }); // beyond the 100 ms look-ahead: still queued
    s.cancel(['x']);
    now.s = 1;
    s.pump();
    expect(s.log.some((l) => l.id === 'x')).toBe(false);
    expect(stops).toEqual([]);
  });
});
