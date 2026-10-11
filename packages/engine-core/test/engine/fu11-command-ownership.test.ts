// FU-11 Task D2 (external review F12, F26): the engine owns what it queued; a started engine can be stopped.
import { describe, expect, it, vi } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-11 D2: the engine owns what it queued; a started engine can be stopped (F12, F26)', () => {
  it('editing a command object after dispatch changes nothing', () => {
    const e = createEngine({ seed: 7 });
    const c = { id: 'm', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80, atTick: 10, ramp: { durationS: 0 } };
    expect(e.dispatch(c as never).accepted).toBe(true);
    c.value = 400;
    c.ramp.durationS = 60;
    e.advanceTo(2);
    const hr = (e.snapshot().state as { st: { hr: { to: number; durationS: number } } }).st.hr;
    expect(hr.to).toBe(80);
    expect(hr.durationS).toBe(0);
  });
  it('a command that is not plain data is refused', () => {
    const e = createEngine({ seed: 7 });
    const r = e.dispatch({ id: 'f', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80, extra: () => 1 } as never);
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/plain data/);
  });
  it('stop() clears the interval start() created; stop twice is harmless; start runs again', () => {
    const set = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const e = createEngine({ seed: 7 });
    e.start();
    const handle = set.mock.results.at(-1)?.value;
    e.pause();
    expect(clear).not.toHaveBeenCalledWith(handle);
    e.stop();
    expect(clear).toHaveBeenCalledWith(handle);
    e.stop();
    e.start();
    expect(set).toHaveBeenCalledTimes(2);
    e.stop();
    set.mockRestore();
    clear.mockRestore();
  });
});
