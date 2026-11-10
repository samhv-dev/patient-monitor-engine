// Brief 126 (N47): the main thread's fast-forward cuts one engine run into slices with the page's event loop between
// them. `advanceTo(simT, false)` runs the ticks without the look-ahead after the last one, so a run cut into pieces of
// which only the last looks ahead is the uncut run, operation for operation: the same events (the QRS tones included,
// which the look-ahead posts) and the same state, bit for bit. A piece that does look ahead is a different run (it posts
// tones from where it ends), which is why the slices defer it.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';
import type { EngineEvent } from '../../src/types.ts';

const bits = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => (typeof x === 'number' ? (Object.is(x, -0) ? '-0' : `n${String(x)}`) : ArrayBuffer.isView(x) ? Array.from(x as unknown as ArrayLike<number>) : x));
function run(cut: (simT: number, to: number) => number[], eager = false) {
  const e = createEngine({ seed: 3, truthHz: 1, patient: { sensors: { spo2: 'on' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => void ev.push(x));
  e.advanceTo(2);
  e.dispatch({ id: 'af', issuedBy: 'test', type: 'setRhythm', rhythm: 'af', when: 'now' } as never);
  for (let s = 2; s < 32; s += 0.5) {
    const pieces = cut(s, s + 0.5);
    pieces.forEach((t, i) => e.advanceTo(t, eager || i === pieces.length - 1));
  }
  return { ev: bits(ev), state: bits(e.snapshot()), tones: ev.filter((x) => x.type === 'tone').length };
}

describe('advanceTo(simT, lookAhead = false): a run in pieces', () => {
  it('pieces of which only the last looks ahead are the uncut run', () => {
    const whole = run((_s, to) => [to]);
    const perTick = (s: number, to: number) => Array.from({ length: Math.round((to - s) / 0.02) }, (_, i) => s + (i + 1) * 0.02);
    const ticks = run(perTick);
    const ragged = run((s, to) => [s + 0.06, s + 0.26, s + 0.28, to]);
    expect(whole.tones).toBeGreaterThan(5); // the look-ahead posted tones in the run
    expect(ticks.ev === whole.ev).toBe(true);
    expect(ticks.state === whole.state).toBe(true);
    expect(ragged.ev === whole.ev).toBe(true);
    expect(ragged.state === whole.state).toBe(true);
    expect(run(perTick, true).ev === whole.ev).toBe(false); // every piece looking ahead: another run
  });
});
