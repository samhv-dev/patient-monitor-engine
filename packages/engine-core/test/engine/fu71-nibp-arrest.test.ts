// FU-7.1 B8 (Ali 2026-10-10): a cuff cycle in a pulseless patient must not leave a normal pressure on the monitor.
// The oscillometric device already finds no envelope without a pulse (l3/nibp: an envelope peak < 0.3 mmHg or an
// SBP < 50 fails the attempt; CPR corrupts every pulse, so the cycle runs to the 170 s safety deflation and fails) —
// what was missing is that a FAILED attempt left the previous result on display. Rig: 58 y 80 kg man with the cuff on,
// one baseline measurement, then a pulseless (PEA) rhythm and a second cycle. SLOW (≈ 30 s wall).
import { describe, expect, it } from 'vitest';
import type { Command, EngineEvent, Measured, MonitorEngine } from '../../src/types.ts';
import { rig6, runTo } from '../helpers/fu6.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `b8-${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
type Nibp = Extract<EngineEvent, { type: 'nibp' }>;

/** One manual cycle: its end event and the nibpSys the monitor shows afterwards. */
async function cycle(e: MonitorEngine): Promise<{ end: Nibp; shown: Measured | undefined }> {
  const seen: Nibp[] = [];
  let shown: Measured | undefined;
  const off = e.on((x) => {
    if (x.type === 'nibp') seen.push(x);
    else if (x.type === 'measurement' && x.values.nibpSys) shown = x.values.nibpSys;
  });
  const t0 = e.now().simT;
  e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
  let end: Nibp | undefined;
  for (let k = 0; k < 400 && !end; k++) {
    await runTo(e, e.now().simT + 1, undefined, 0.5);
    end = seen.find((x) => (x.phase === 'done' || x.phase === 'failed') && x.t > t0);
  }
  off?.();
  if (!end) throw new Error('NIBP never finished');
  return { end, shown };
}

describe('FU-7.1 B8: the cuff in a pulseless patient', { timeout: 600_000 }, () => {
  it('measures normally with a pulse, then fails and BLANKS the numerics in PEA (main: the tile kept the pre-arrest reading)', async () => {
    const e = rig6({ ageY: 58, sex: 'M', weightKg: 80, heightCm: 175, sensors: { nibp: 'on' } });
    await runTo(e, 20);
    const live = await cycle(e);
    expect(live.end.phase).toBe('done');
    expect(live.shown?.flag).toBe('valid');
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true, rateBpm: 70 }, when: 'now' }));
    await runTo(e, e.now().simT + 40);
    const dead = await cycle(e);
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 B8: with a pulse ${live.end.result?.sys}/${live.end.result?.dia} (${live.end.result?.map}); pulseless phase ${dead.end.phase}, result ${dead.end.result ? 'SHOWN' : 'none'}, numeric ${dead.shown?.value ?? '---'} flag ${dead.shown?.flag}`);
    expect(dead.end.phase).toBe('failed');
    expect(dead.end.result).toBeUndefined();
    expect(dead.shown?.value).toBeNull();
    expect(dead.shown?.flag).toBe('invalid');
  });
});
