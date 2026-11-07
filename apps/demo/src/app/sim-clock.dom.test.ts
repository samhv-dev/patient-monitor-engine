// @vitest-environment happy-dom
// FX-11b (classroom): the host's sim clock (AppSession.simNow) is the last engine event's time run forward on the wall
// clock, capped at EST_CAP_S × speed. During a worker stall it ran ahead to the cap and stepped BACK when the stalled
// worker's next event arrived (0.11–0.42 s steps seen in CI): the session bar's clock, the scenario timers and the
// runner went backwards. The estimate is now monotonic within a timeline: it holds until the engine passes it. A new
// timeline (a restart, a load, a restore) starts it again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => ({ emit: (_e: unknown) => {} }));
vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  return {
    version: '0.0.0-test',
    mountMonitor: (_el: unknown, o: { skin: string }) => {
      const fns = new Set<(e: unknown) => void>();
      net.emit = (e) => fns.forEach((f) => f(e));
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick: 0 }),
        on: (fn: (e: unknown) => void) => (fns.add(fn), () => fns.delete(fn)),
        snapshot: () => Promise.resolve({}),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick: 0, simT: 0 }),
        setTimeScale: () => {},
        pause: () => {},
        resume: () => {},
        enableSound: () => Promise.resolve(),
        destroy: () => {},
      };
    },
  };
});

const { AppSession } = await import('./session.ts');
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };

describe('FX-11b: the host sim clock never steps back within a timeline', () => {
  let wall = 0;
  let s: InstanceType<typeof AppSession>;
  beforeEach(() => {
    wall = 1_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => wall);
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N' });
  });
  afterEach(() => {
    s.destroy();
    vi.restoreAllMocks();
  });

  it('a stall: the estimate runs to its cap, the late event does not take it back, the clock goes on from there', () => {
    s.setTimeScale(8);
    net.emit({ type: 'measurement', t: 10, values: {} });
    wall += 3000; // the worker stalls: 3 s of wall without an event
    const ahead = s.simNow();
    expect(ahead).toBeCloseTo(10 + 1.5 * 8, 6); // capped at EST_CAP_S × speed
    net.emit({ type: 'measurement', t: 10.4, values: {} }); // the stalled worker's next event: the engine is at 10.4
    const seen = [ahead];
    for (let i = 0; i < 40; i++) {
      seen.push(s.simNow());
      wall += 100;
      net.emit({ type: 'measurement', t: 10.4 + (i + 1) * 0.8, values: {} }); // the engine runs on at ×8
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] as number);
    expect(seen.at(-1)).toBeGreaterThan(ahead); // and it moves on once the engine passes it
  });

  it('a new timeline starts the clock again (a restart is not a step back)', () => {
    net.emit({ type: 'measurement', t: 50, values: {} });
    expect(s.simNow()).toBeGreaterThanOrEqual(50);
    s.restart({ spec, mode: 'modeled' });
    expect(s.simNow()).toBeLessThan(1);
  });
});
