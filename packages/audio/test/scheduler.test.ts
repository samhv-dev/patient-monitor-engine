import { describe, expect, it } from 'vitest';
import { ToneScheduler, type ToneRequest } from '../src/scheduler.ts';
import { beepEnvelope, BEEP_MS } from '../src/tones.ts';

/** Audio time == perf seconds in this fake. */
function setup(nowPerfMs: { v: number }, outputLatency: () => number | undefined = () => 0.02) {
  const played: Array<{ tone: ToneRequest; when: number }> = [];
  const stopped: string[] = [];
  const s = new ToneScheduler({
    audioNow: () => nowPerfMs.v / 1000,
    perfToAudio: (p) => p / 1000,
    outputLatency,
    play: (tone, when) => {
      played.push({ tone, when });
      return { stop: () => stopped.push(tone.id) };
    },
  });
  s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1, runS: 0 });
  return { s, played, stopped };
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

  it('plays a QRS tone that is late only by the device output latency (Bluetooth 200 ms), at once', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now, () => 0.2);
    s.enqueue({ t: 1.75, refT: 1.72, id: 'bt', kind: 'qrs' }); // 250 ms "late", 200 ms of it is the device
    expect(played.map((p) => p.tone.id)).toEqual(['bt']);
    expect(played[0]!.when).toBeCloseTo(2, 12);
    expect(s.log[0]!.lateS).toBeCloseTo(0.25, 12);
  });

  it('drops a QRS tone only if it would sound more than 150 ms after its R (net of output latency)', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now, () => 0.02);
    s.enqueue({ t: 1.88, refT: 1.85, id: 'ok', kind: 'qrs' }); // 30 + (120 − 20) = 130 ms after R → play
    s.enqueue({ t: 1.85, refT: 1.82, id: 'stale', kind: 'qrs' }); // 30 + (150 − 20) = 160 ms after R → drop
    expect(played.map((p) => p.tone.id)).toEqual(['ok']);
    expect(s.log.find((l) => l.id === 'stale')!.dropped).toBe(true);
  });

  it('falls back to 20 ms output latency when the browser does not report it', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now, () => undefined);
    s.enqueue({ t: 1.86, refT: 1.83, id: 'a', kind: 'qrs' }); // 30 + 140 − 20 = 150 → play
    s.enqueue({ t: 1.84, refT: 1.81, id: 'b', kind: 'qrs' }); // 30 + 160 − 20 = 170 → drop
    expect(played.map((p) => p.tone.id)).toEqual(['a']);
  });

  it('never drops a non-QRS tone for lateness', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.2, id: 'alarm', kind: 'alarmBurst' });
    expect(played.map((p) => p.tone.id)).toEqual(['alarm']);
  });

  it('plays each tone id once, however often it is posted', () => {
    const now = { v: 1000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.05, id: 'qrs-525', kind: 'qrs' });
    s.enqueue({ t: 1.05, id: 'qrs-525', kind: 'qrs' });
    s.enqueue({ t: 1.3, id: 'qrs-650', kind: 'qrs' });
    s.enqueue({ t: 1.3, id: 'qrs-650', kind: 'qrs' });
    now.v = 1250;
    s.pump();
    s.enqueue({ t: 1.05, id: 'qrs-525', kind: 'qrs' });
    expect(played.map((p) => p.tone.id)).toEqual(['qrs-525', 'qrs-650']);
  });

  it('cancel by id stops a tone that was already handed to the audio system', () => {
    const now = { v: 1000 };
    const { s, played, stopped } = setup(now);
    s.enqueue({ t: 1.06, id: 'a', kind: 'qrs' });
    s.enqueue({ t: 1.09, id: 'b', kind: 'qrs' });
    expect(played).toHaveLength(2); // both inside the 100 ms look-ahead: already scheduled
    s.cancel(['b']);
    expect(stopped).toEqual(['b']);
    s.enqueue({ t: 1.095, id: 'b', kind: 'qrs' }); // a corrected re-post of a cancelled id plays again
    expect(played.map((p) => p.tone.id)).toEqual(['a', 'b', 'b']);
  });

  it('cancelAfter also stops already-scheduled tones after that sim time', () => {
    const now = { v: 1000 };
    const { s, stopped } = setup(now);
    s.enqueue({ t: 1.02, id: 'a', kind: 'qrs' });
    s.enqueue({ t: 1.08, id: 'b', kind: 'qrs' });
    s.cancelAfter(1.05);
    expect(stopped).toEqual(['b']);
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
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 2, runS: 0 });
    s.enqueue({ t: 0.1, id: 'a', kind: 'qrs' });
    expect(played[0]!.when).toBeCloseTo(0.05, 12);
  });

  it('a tone placed on run time keeps its wall time when the speed changes, and holds while paused', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 8, runS: 0 });
    s.enqueue({ t: 4, runT: 0.5, id: 'a', kind: 'alarm' });
    s.clock.setAnchor({ simT: 0.8, perfMs: 100, timeScale: 1, runS: 0.1 });
    now.v = 300;
    s.pump();
    expect(played).toHaveLength(0);
    s.clock.setAnchor({ simT: 1, perfMs: 300, timeScale: 1, runS: 0.3 }); // paused from here
    now.v = 5000;
    s.clock.setAnchor({ simT: 1, perfMs: 5000, timeScale: 1, runS: 0.3 });
    s.pump();
    expect(played).toHaveLength(0);
    now.v = 5150;
    s.clock.setAnchor({ simT: 1.15, perfMs: 5150, timeScale: 1, runS: 0.45 }); // resumed
    s.pump();
    expect(played[0]!.when).toBeCloseTo(5.2, 12);
  });

  it('a tone due on run time is not held behind a sim-time tone that is not due', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 8, runS: 0 });
    s.enqueue({ t: 2, id: 'beep', kind: 'device' }); // 250 ms ahead at ×8
    s.enqueue({ t: 7.2, runT: 0.9, id: 'alarm', kind: 'alarm' });
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1, runS: 0 }); // ×1: the device tone is now 2 s ahead
    now.v = 850;
    s.pump();
    expect(played.map((p) => p.tone.id)).toEqual(['alarm']);
  });

  it('beep envelope: 5 ms attack, 100 ms total, back to zero', () => {
    const env = beepEnvelope(0.5);
    expect(env[1]).toEqual([0.005, 0.5]);
    expect(BEEP_MS).toBe(100);
    expect(env[env.length - 1]).toEqual([0.1, 0]);
  });
});
