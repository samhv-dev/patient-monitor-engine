import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';

function readAll(e: MonitorEngine, ch: 'ecgII' | 'ecgI' | 'ecgIII' | 'vcgX', from: number, to: number): Float32Array {
  const out = new Float32Array(to - from + 1);
  expect(e.readSamples(ch, from, out)).toBe(out.length);
  return out;
}

function cmd(c: Omit<Command, 'id' | 'issuedBy'> & Record<string, unknown>, id = 'c'): Command {
  return { id, issuedBy: 'test', ...c } as Command;
}

describe('engine pipeline', () => {
  it('fills the look-ahead at creation: latest index = 100 ms × 500 Hz', () => {
    const e = createEngine({ seed: 1 });
    expect(e.now()).toEqual({ tick: 0, simT: 0 });
    expect(e.latestSampleIndex('ecgII')).toBe(50);
    expect(e.latestSampleIndex('vcgX')).toBe(50);
    expect(e.sampleRate('ecgII')).toBe(500);
    expect(e.sampleRate('abp')).toBe(125);
    expect(e.sampleRate('co2')).toBe(62.5);
    expect(e.latestSampleIndex('abp')).toBe(-1);
  });

  it('acceptance 11: no drift — after advanceTo(86400) latestSampleIndex(ecgII) = 43,200,000 + 50', { timeout: 300_000 }, async () => {
    const e = createEngine({ seed: 11 });
    // Advance one sim-hour at a time and yield between chunks: 24 h of synchronous ticks takes
    // > 60 s on a 2-vCPU CI runner, which starves the Vitest worker's RPC ("Timeout calling onTaskUpdate").
    for (let h = 1; h <= 24; h++) {
      e.advanceTo(h * 3_600);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(e.now().tick).toBe(4_320_000);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });

  it('acceptance 10: determinism — same seed + same commands give an identical SHA-256 over 60 s of ecgII', () => {
    const script: Array<[number, Command]> = [
      [5, cmd({ type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 10 } }, 'a')],
      [20, cmd({ type: 'setRhythm', rhythm: 'afib' }, 'b')],
      [35, cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }, 'c')],
      [45, cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } }, 'd')],
    ];
    const hashRun = (seed: number) => {
      const e = createEngine({ seed });
      const h = createHash('sha256');
      let from = 0;
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t);
        const to = Math.round(t * 500);
        h.update(readAll(e, 'ecgII', from, to));
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(hashRun(42)).toBe(hashRun(42));
    expect(hashRun(42)).not.toBe(hashRun(43));
  });

  it('acceptance 4 (filtered lanes): with lanes I, II, III the displayed III − (II − I) < 1e-6 mV', () => {
    const e = createEngine({ seed: 4 });
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgI', lane: 0 } }));
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgII', lane: 1 } }));
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgIII', lane: 2 } }));
    e.advanceTo(12);
    const I = readAll(e, 'ecgI', 1000, 5999);
    const II = readAll(e, 'ecgII', 1000, 5999);
    const III = readAll(e, 'ecgIII', 1000, 5999);
    for (let i = 0; i < I.length; i++) expect(Math.abs(III[i]! - (II[i]! - I[i]!))).toBeLessThan(1e-6);
  });

  it('acceptance 9: HR step 80 → 120 reaches 118–122 within 5–11 s and updates at most once per second', () => {
    const e = createEngine({ seed: 9, patient: { baseline: { hr: 80 } } });
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    const hr: Array<{ t: number; v: number | null }> = [];
    e.on((ev) => {
      if (ev.type === 'measurement' && ev.values.hr) hr.push({ t: ev.t, v: ev.values.hr.value });
    }, ['measurement']);
    e.advanceTo(30);
    expect(hr[hr.length - 1]!.v).toBe(80);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120 }));
    const stepT = 30.02;
    e.advanceTo(60);
    const reached = hr.find((m) => m.t > stepT && m.v !== null && m.v >= 118 && m.v <= 122);
    expect(reached).toBeDefined();
    expect(reached!.t - stepT).toBeGreaterThanOrEqual(5);
    expect(reached!.t - stepT).toBeLessThanOrEqual(11);
    const times = hr.map((m) => m.t);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it('emits beat, atrial and measurement events in time order, never ahead of sim time', () => {
    const e = createEngine({ seed: 2 });
    const seen: EngineEvent[] = [];
    e.on((ev) => {
      if (ev.type !== 'tone' && ev.type !== 'toneCancel') {
        expect(ev.t).toBeLessThanOrEqual(e.now().simT + 1e-9);
      }
      seen.push(ev);
    });
    e.advanceTo(10);
    const ts = seen.filter((x) => x.type === 'beat' || x.type === 'atrial').map((x) => (x as { t: number }).t);
    expect(ts.length).toBeGreaterThan(20);
    for (let i = 1; i < ts.length; i++) expect(ts[i]!).toBeGreaterThanOrEqual(ts[i - 1]!);
  });

  it('posts a QRS tone 20–45 ms after each true R (BEEP_DELAY 30 ms, ruling R15), before the tone is due', () => {
    const e = createEngine({ seed: 3 });
    const beats: number[] = [];
    const tones: Array<{ t: number; postedAt: number }> = [];
    e.on((ev) => {
      if (ev.type === 'beat') beats.push(ev.t);
      if (ev.type === 'tone') {
        tones.push({ t: ev.t, postedAt: e.now().simT });
        expect(ev.id).toBe(`qrs-${Math.round(ev.refT! * 500)}`); // stable id: the detected R sample
        expect(ev.t - ev.refT!).toBeCloseTo(0.03, 9);
      }
    });
    for (let t = 0; t <= 30; t += 0.02) e.advanceTo(t); // real-time-like ticking, look-ahead on every tick
    const late = tones.filter((x) => x.t > 3);
    expect(late.length).toBeGreaterThan(30);
    for (const tone of late) {
      const r = beats.reduce((best, b) => (Math.abs(b - tone.t) < Math.abs(best - tone.t) ? b : best), -1e9);
      expect(tone.t - r).toBeGreaterThanOrEqual(0.02);
      expect(tone.t - r).toBeLessThanOrEqual(0.045);
      expect(tone.postedAt).toBeLessThan(tone.t);
    }
  });

  it('chunking invariance: tick-by-tick and bulk advanceTo commit identical samples and events (review §5)', () => {
    const run = (step: number) => {
      const e = createEngine({ seed: 21 });
      const ev: string[] = [];
      e.on((x) => ev.push(JSON.stringify(x)), ['beat', 'atrial', 'measurement']);
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'single', probability: 0.3 } } }));
      for (let t = step; t <= 30 + 1e-9; t += step) e.advanceTo(t);
      return { ev, ii: readAll(e, 'ecgII', 0, 30 * 500) };
    };
    const a = run(0.02);
    const b = run(1.5);
    expect(b.ev).toEqual(a.ev);
    expect(Array.from(b.ii)).toEqual(Array.from(a.ii));
  });
});
