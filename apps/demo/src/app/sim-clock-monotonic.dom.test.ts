// @vitest-environment happy-dom
// The host's clock estimate (AppSession.simNow: the last engine event's time run forward on the wall clock) must not run
// backwards. An engine event whose time is below the running estimate (the engine a few ms behind the page's wall
// clock, its events late under load) used to reset the estimate to that event, so a read just after it was earlier
// than a read just before. Three quick gotos on Instructor v2 (teach2-fit.e2e.ts :505, CI run 42113324793 attempt 1,
// Chromium) then gave Induced an entry time earlier than Premedicated's; the strip reads an entry earlier than the one
// before it as a rewind (keptCourse), dropped Premedicated and showed the stage that was entered as skipped.
// The real AppSession, HostSession and ScenarioDriver; the monitor is a stand-in whose events the test emits.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mh from './showcase/showcase-mh.json';

const eng = vi.hoisted(() => ({ fns: [] as Array<(e: unknown) => void> }));
vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  return {
    version: '0.0.0-test',
    mountMonitor: (_el: unknown, o: { skin: string }) => ({
      skin: resolveSkin(o.skin),
      dispatch: (c: { atTick?: number }) => Promise.resolve({ accepted: true, tick: c.atTick ?? 0 }),
      on: (fn: (e: unknown) => void) => (eng.fns.push(fn), () => {}),
      snapshot: () => Promise.resolve({}),
      restore: () => Promise.resolve(),
      advance: () => Promise.resolve({ tick: 0, simT: 0 }),
      setTimeScale: () => {},
      pause: () => {},
      resume: () => {},
      enableSound: () => Promise.resolve(),
      destroy: () => {},
    }),
  };
});

const { AppSession } = await import('./session.ts');
const { stageEntries } = await import('./teach2/strip.ts');
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const emit = (t: number) => eng.fns.at(-1)?.({ type: 'measurement', t, values: {} });

describe('the host clock estimate never runs backwards', () => {
  let wall = 0;
  let s: InstanceType<typeof AppSession>;
  beforeEach(async () => {
    eng.fns.length = 0;
    wall = 1_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => wall);
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N' });
    await settle();
  });
  afterEach(() => {
    s.destroy();
    vi.restoreAllMocks();
  });

  it('a late engine event holds the estimate where it was read; the clock goes on from there once the engine passes it', () => {
    emit(1.3);
    wall += 60; // the page's clock runs on: the estimate reads 1.36
    expect(s.simNow()).toBeCloseTo(1.36, 6);
    emit(1.32); // the engine's next event, 40 ms behind the estimate
    expect(s.simNow()).toBeGreaterThanOrEqual(1.36);
    wall += 20; // the estimate from the event (1.34) is still below the last read
    expect(s.simNow()).toBeGreaterThanOrEqual(1.36);
    wall += 60; // 1.40 from the event: the clock runs from the engine again
    expect(s.simNow()).toBeCloseTo(1.4, 6);
  });

  it('three quick gotos keep their order, and the strip keeps every stage entered', async () => {
    expect(s.loadScenario(mh)).toMatchObject({ ok: true });
    await settle();
    emit(1.3);
    wall += 60;
    for (const target of ['preoxygenated', 'premedicated']) {
      expect((await s.panel.send({ type: 'scenario', action: 'goto', target } as never)).accepted).toBe(true);
      await settle();
    }
    emit(1.32); // late, between two presses
    expect((await s.panel.send({ type: 'scenario', action: 'goto', target: 'induced' } as never)).accepted).toBe(true);
    await settle();
    const sv = s.panel.scenario;
    const ts = sv.history.map((e) => e.t);
    expect(ts, sv.history.map((e) => `${e.stateId} ${e.t}`).join(', ')).toEqual([...ts].sort((a, b) => a - b));
    const doc = sv.doc as Parameters<typeof stageEntries>[0];
    const stages = stageEntries(doc, sv.history, sv, 10).map((e) => e.stateId);
    expect(stages).toEqual(expect.arrayContaining(['preoxygenated', 'premedicated', 'induced']));
  });
});
