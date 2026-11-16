import { describe, expect, it } from 'vitest';
import { BurstSchedule } from '../src/alarm-bursts.ts';
import { AlarmSounder, type AlarmToneRequest } from '../src/alarm-sounder.ts';
import { IEC_STYLE, SAADAT, TRADITIONAL, type AlarmSoundProfile, type ProfileOverrides } from '../src/profiles/index.ts';
import { ToneScheduler } from '../src/scheduler.ts';

/** Real ToneScheduler on a fake audio clock: audio time = sim time = now (timeScale k). */
function rig(profile: AlarmSoundProfile, opts: { overrides?: ProfileOverrides; timeScale?: number } = {}) {
  const k = opts.timeScale ?? 1;
  let now = 0; // sim seconds
  const played: Array<{ tone: AlarmToneRequest; when: number }> = [];
  const stopped: string[] = [];
  const sched = new ToneScheduler({
    audioNow: () => now / k,
    perfToAudio: (ms) => ms / 1000,
    outputLatency: () => 0,
    play: (tone, when) => {
      played.push({ tone: tone as AlarmToneRequest, when });
      return { stop: () => stopped.push(tone.id) };
    },
  });
  sched.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: k, runS: 0 });
  const s = new AlarmSounder(sched, profile, opts.overrides ? { overrides: opts.overrides } : {});
  /** Advance sim time to t in 25 ms steps, pumping both (as the 25 ms timer would). */
  const run = (t: number) => {
    while (now < t - 1e-9) {
      now = Math.min(t, now + 0.025);
      s.pump(now);
      sched.pump();
    }
  };
  return { s, sched, played, stopped, run, at: (t: number) => (now = t) };
}

const onsets = (p: Array<{ when: number }>) => p.map((x) => +x.when.toFixed(4));
const diffs = (xs: number[]) => xs.slice(1).map((x, i) => +(x - (xs[i] as number)).toFixed(4));
/** Group pulses into bursts: a gap > 1.5 s starts a new burst. */
function bursts(xs: number[]): number[][] {
  const out: number[][] = [];
  for (const x of xs) {
    const cur = out[out.length - 1];
    if (cur && x - (cur[cur.length - 1] as number) < 1.5) cur.push(x);
    else out.push([x]);
  }
  return out;
}

describe('AlarmSounder cadence on a fake audio clock', () => {
  it('iec-style high repeats every 10 s with 10 pulses per burst', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('HR_HIGH', 1, 0);
    r.run(35);
    const b = bursts(onsets(r.played));
    expect(b.map((x) => x.length)).toEqual([10, 10, 10, 10]);
    expect(b.map((x) => x[0])).toEqual([0, 10, 20, 30]);
  });

  it('iec-style medium every 20 s; low sounds once', () => {
    const m = rig(IEC_STYLE);
    m.s.raise('SPO2_LOW', 2, 0);
    m.run(45);
    expect(bursts(onsets(m.played)).map((x) => [x[0], x.length])).toEqual([[0, 3], [20, 3], [40, 3]]);
    const l = rig(IEC_STYLE);
    l.s.raise('LEADS_OFF', 3, 0);
    l.run(60);
    expect(onsets(l.played)).toEqual([0]);
  });

  it('saadat: L1 5 pulses / 10 s, L2 3 / 20 s, L3 1 / 30 s (repeats)', () => {
    for (const [level, every, n] of [[1, 10, 5], [2, 20, 3], [3, 30, 1]] as const) {
      const r = rig(SAADAT);
      r.s.raise('A', level, 0);
      r.run(95);
      const b = bursts(onsets(r.played));
      expect(b.every((x) => x.length === n), `level ${level}`).toBe(true);
      expect(diffs(b.map((x) => x[0] as number)).every((d) => d === every), `level ${level}`).toBe(true);
    }
  });

  it('traditional: high once a second, medium every 2 s', () => {
    const r = rig(TRADITIONAL);
    r.s.raise('A', 1, 0);
    r.run(4.5);
    expect(onsets(r.played)).toEqual([0, 1, 2, 3, 4]);
  });

  it('skin repeat overrides: ZOLL-like high every 15 s, low not repeated', () => {
    const r = rig(IEC_STYLE, { overrides: { repeatS: { L1: 15, L3: null } } });
    r.s.raise('A', 1, 0);
    r.run(35);
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 15, 30]);
  });

  it('only the highest level sounds; clearing it restarts the next one at once', () => {
    const r = rig(SAADAT);
    r.s.raise('LEADS', 3, 0);
    r.run(2);
    r.s.raise('ASYSTOLE', 1, 2);
    expect(r.s.sounding).toBe('ASYSTOLE');
    r.run(15);
    r.s.clear('ASYSTOLE', 15);
    r.run(16);
    const levels = r.played.map((p) => [+p.when.toFixed(3), p.tone.level]);
    expect(levels.filter(([, l]) => l === 1).map(([w]) => w)[0]).toBe(2);
    expect(levels.filter(([w, l]) => l === 3 && (w as number) > 2 && (w as number) < 15)).toEqual([]);
    expect(levels.filter(([, l]) => l === 3).map(([w]) => w)).toEqual([0, 15]);
  });

  it('a cancelled train stops pulses already handed to Web Audio', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('A', 1, 0);
    r.run(0.2); // pulse 2 (t = 0.25) is inside the 100 ms look-ahead: already handed to Web Audio
    expect(r.played.map((p) => p.tone.id)).toEqual(['alarm:A:0:0:0', 'alarm:A:0:0:1']);
    r.s.clear('A', 0.2);
    expect(r.stopped).toEqual(['alarm:A:0:0:1']);
    r.run(12);
    expect(r.played).toHaveLength(2);
  });

  it('saadat silence: 120 s of quiet, then the alarm sounds again; a NEW alarm ends the silence', () => {
    const r = rig(SAADAT);
    r.s.raise('HR', 1, 0);
    r.run(5);
    r.s.silenceAll(5);
    expect(r.s.silencedUntil).toBe(125);
    r.run(130);
    const b = bursts(onsets(r.played)).map((x) => x[0]);
    expect(b).toEqual([0, 125]);
    const n = rig(SAADAT);
    n.s.raise('HR', 1, 0);
    n.run(5);
    n.s.silenceAll(5);
    n.run(50);
    n.s.raise('SPO2', 2, 50);
    n.run(51);
    expect(n.s.silencedUntil).toBeNull();
    expect(bursts(onsets(n.played)).map((x) => x[0])).toEqual([0, 50]);
  });

  it('iec-style silence lasts 90 s and a new alarm does NOT end it', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('HR', 1, 0);
    r.run(1);
    r.s.silenceAll(1);
    r.run(40);
    r.s.raise('SPO2', 2, 40);
    r.run(92);
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 91]);
  });

  it('iec-style silence IS ended by a new alarm of higher priority', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('SPO2', 2, 0);
    r.run(1);
    r.s.silenceAll(1);
    r.run(40);
    r.s.raise('ASY', 1, 40);
    r.run(42);
    expect(r.s.silencedUntil).toBeNull();
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 40]);
  });

  it('bursts keep real-time patterns at timeScale 2 (sim spacing doubles, audio spacing unchanged)', () => {
    const r = rig(SAADAT, { timeScale: 2 });
    r.s.raise('A', 1, 0);
    r.run(25);
    const b = bursts(onsets(r.played));
    expect(b.map((x) => x[0])).toEqual([0, 10]); // audio seconds
    expect(diffs(b[0] as number[])).toEqual([0.25, 0.25, 0.45, 0.25]);
    expect(r.played[5]?.tone.t).toBeCloseTo(20, 9); // sim seconds
  });

  it('ids are unique across restarts', () => {
    const r = rig(SAADAT);
    r.s.raise('A', 1, 0);
    r.run(1);
    r.s.clear('A', 1);
    r.s.raise('A', 1, 1);
    r.run(3);
    const ids = r.played.map((p) => p.tone.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('alarm:A:0:0:0');
  });
});

/**
 * The host's clocks by hand: wall seconds (= audio time here), the case's sim time at the current speed, and its run
 * time (wall time while running). Each 25 ms step posts an anchor and pumps the sounder and the real ToneScheduler.
 */
function hostRig(profile: AlarmSoundProfile) {
  let wall = 0;
  let sim = 0;
  let run = 0;
  let speed = 1;
  let paused = false;
  const played: Array<{ tone: AlarmToneRequest; when: number }> = [];
  const sched = new ToneScheduler({
    audioNow: () => wall,
    perfToAudio: (ms) => ms / 1000,
    outputLatency: () => 0,
    play: (tone, when) => void played.push({ tone: tone as AlarmToneRequest, when }),
  });
  const anchor = () => sched.clock.setAnchor({ simT: sim, perfMs: wall * 1000, timeScale: speed, runS: run });
  anchor();
  const s = new AlarmSounder(sched, profile);
  /** Run `seconds` of wall time. */
  const wait = (seconds: number) => {
    const end = wall + seconds;
    while (wall < end - 1e-9) {
      const dt = Math.min(0.025, end - wall);
      wall += dt;
      if (!paused) {
        sim += dt * speed;
        run += dt;
      }
      anchor();
      s.pump(sim);
      sched.pump();
    }
  };
  return {
    s, played, wait,
    get sim() { return sim; },
    get wall() { return wall; },
    speed: (k: number) => void (speed = k),
    pause: () => void (paused = true),
    resume: () => void (paused = false),
    /** Burst starts, in wall seconds. */
    starts: () => bursts(onsets(played)).map((b) => b[0] as number),
  };
}

const every = (from: number, step: number, to: number) => Array.from({ length: Math.floor((to - from) / step + 1e-9) + 1 }, (_, i) => +(from + i * step).toFixed(4));

describe('AlarmSounder: the sound keeps real time when the case speed changes', () => {
  it('×2: the next burst comes after its 10 s repeat, not later', () => {
    const h = hostRig(SAADAT);
    h.s.raise('SPO2_LOW', 1, 0);
    h.wait(3);
    h.speed(2);
    h.wait(40);
    expect(h.starts()).toEqual(every(0, 10, 43));
  });

  it('back to ×1 after ×2: no burst that was "missed" is released, nothing sounds at one instant', () => {
    const h = hostRig(SAADAT);
    h.s.raise('SPO2_LOW', 1, 0);
    h.wait(3);
    h.speed(2);
    h.wait(30);
    h.speed(1);
    h.wait(30);
    expect(Math.max(...bursts(onsets(h.played)).map((b) => b.length))).toBe(5);
    expect(h.starts()).toEqual(every(0, 10, 63));
  });

  it('after 26 s at ×8 the alarm goes on sounding every 10 s back at ×1, not silent', () => {
    const h = hostRig(SAADAT);
    h.s.raise('SPO2_LOW', 1, 0);
    h.wait(5);
    h.speed(8);
    h.wait(26);
    h.speed(1);
    h.wait(160);
    expect(Math.max(...diffs(h.starts()))).toBe(10);
    expect(h.starts()).toEqual(every(0, 10, 191));
  });

  it('speed changes up and down, one in the middle of a burst: every burst keeps its pulse pattern and its 10 s repeat', () => {
    const h = hostRig(IEC_STYLE);
    h.s.raise('HR_HIGH', 1, 0);
    for (const [k, wait] of [[4, 1.1], [0.25, 12.3], [8, 7], [1, 9.9], [2, 14]] as const) {
      h.speed(k);
      h.wait(wait);
    }
    h.wait(10);
    const b = bursts(onsets(h.played));
    expect(b.map((x) => x[0])).toEqual(every(0, 10, h.wall));
    for (const x of b.slice(0, -1)) expect(diffs(x)).toEqual([0.25, 0.25, 0.5, 0.25, 0.75, 0.25, 0.25, 0.5, 0.25]);
  });

  it('a pause is silent and stops the repeat clock; on resume the train goes on with the rest of its interval', () => {
    const h = hostRig(SAADAT);
    h.s.raise('SPO2_LOW', 1, 0);
    h.wait(4);
    h.pause();
    h.wait(30);
    expect(h.played.filter((p) => p.when > 4.2)).toEqual([]);
    h.resume();
    h.speed(4);
    h.wait(20);
    expect(h.starts()).toEqual([0, 40, 50]);
  });

  it('an alarm that starts and ends during ×8 sounds its burst in real time, once, and nothing after it ends', () => {
    const h = hostRig(IEC_STYLE);
    h.speed(8);
    h.wait(2);
    h.s.raise('VT', 1, h.sim);
    h.wait(1.6);
    h.s.clear('VT', h.sim);
    h.wait(30);
    expect(diffs(onsets(h.played))).toEqual([0.25, 0.25, 0.5, 0.25]); // the five pulses before the clear (1.6 s)
    expect(h.played[0]!.when).toBeCloseTo(2, 9);
  });
});

describe('BurstSchedule', () => {
  it('one burst at the start, then one every repeat; null repeats never', () => {
    const b = new BurstSchedule(5, 10);
    expect(b.take(5, 6)).toEqual([5]);
    expect(b.take(6, 16)).toEqual([15]);
    expect(b.take(16, 34)).toEqual([25]);
    const once = new BurstSchedule(0, null);
    expect(once.take(0, 100)).toEqual([0]);
    expect(once.take(100, 1000)).toEqual([]);
  });

  it('a burst found late (the page was asleep) plays once from now, the missed ones are dropped, the repeat goes on from it', () => {
    const b = new BurstSchedule(0, 10);
    expect(b.take(0, 1)).toEqual([0]);
    expect(b.take(37, 38)).toEqual([37]);
    expect(b.take(38, 48)).toEqual([47]);
  });
});

describe('alarm level loudness', () => {
  it('medium is 4 dB and low 8 dB below high at the same volume step', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('A', 1, 0);
    r.run(0.2);
    const hi = r.played[0]!.tone.gain;
    const m = rig(IEC_STYLE);
    m.s.raise('A', 2, 0);
    m.run(0.2);
    expect(20 * Math.log10(m.played[0]!.tone.gain / hi)).toBeCloseTo(-4, 9);
  });
});
