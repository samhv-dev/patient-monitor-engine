// @vitest-environment happy-dom
// TCH-11 (classroom): the app ran every card's engine on seed 7 whatever the card said (`engineOptionsOf(doc, 7)` in
// AppSession.loadScenario); only the runner's scenario stream read the card's seed. The card's `seed` now seeds the run:
// the engine and the runner. The real AppSession, HostSession and ScenarioDriver; the monitor is a stand-in that keeps the
// engine options it was mounted with, and each run is replayed on a real engine from them.
import { createEngine, type EngineEvent, type EngineOptions } from '@pme/engine-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import haemorrhage from './showcase/showcase-haemorrhage.json';

const net = vi.hoisted(() => ({ engines: [] as unknown[] }));

vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  return {
    version: '0.0.0-test',
    mountMonitor: (_el: unknown, o: { skin: string; engine: unknown }) => {
      net.engines.push(o.engine);
      let tick = 0;
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick: ++tick }),
        dispatchAll: (cs: unknown[]) => Promise.resolve(cs.map(() => ({ accepted: true, tick: ++tick }))),
        on: () => () => {},
        snapshot: () => Promise.resolve({}),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick, simT: tick * 0.02 }),
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

/** Load the haemorrhage card with `seed` on a fresh session: the engine options it mounted, and its runner's seed. */
async function load(seed: number): Promise<{ engine: EngineOptions; runnerSeed: number | undefined }> {
  net.engines.length = 0;
  const s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N' });
  try {
    const r = s.loadScenario({ ...haemorrhage, seed });
    expect(r.ok).toBe(true);
    expect((await s.lastLoad).accepted).toBe(true); // the runner starts when the host takes the load
    return { engine: net.engines[net.engines.length - 1] as EngineOptions, runnerSeed: (s.driver.phaseRunner ?? s.driver.runner)?.seed };
  } finally {
    s.destroy();
  }
}
/** The run the options give: the beat times of its first 30 s (the seeded streams: heart-rate variability, ectopy). */
function run(o: EngineOptions): number[] {
  const e = createEngine(o);
  const beats: number[] = [];
  e.on((x: EngineEvent) => void (x.type === 'beat' && beats.push(x.t)));
  e.advanceTo(30);
  return beats;
}

describe("the app honours the card's seed", () => {
  afterEach(() => vi.restoreAllMocks());

  it('the engine and the runner take the seed the card states', async () => {
    for (const seed of [7, 11]) {
      const r = await load(seed);
      expect(r.engine.seed).toBe(seed);
      expect(r.runnerSeed).toBe(seed);
    }
  });

  it('two cards with different seeds give different runs; the same seed gives the same run', async () => {
    const a = run((await load(7)).engine);
    const b = run((await load(11)).engine);
    const a2 = run((await load(7)).engine);
    expect(a.length).toBeGreaterThan(20);
    expect(a2).toEqual(a);
    expect(b).not.toEqual(a);
  }, 120_000); // three 30-s engine runs: ≈ 0.4 s idle, 10 s seen on a loaded laptop (the repo's long engine tests take explicit timeouts)
});
