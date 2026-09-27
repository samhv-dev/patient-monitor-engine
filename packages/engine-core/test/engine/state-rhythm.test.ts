// FU-2 item 4 (G-FU1 item 6): the 1 Hz `state` event carries the running rhythm (id + effective rate), so controllers
// follow rhythm changes the engine makes on its own (shock outcome, drug conversion).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { effectiveRateBpm } from '../../src/l2/ecg/rhythms.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type State = Extract<EngineEvent, { type: 'state' }>;
const lastState = (ev: EngineEvent[]) => ev.filter((x): x is State => x.type === 'state').pop()!;
const defib = (action: string) => cmd({ type: 'applyEvent', event: { kind: 'defib', action } });

describe('state event rhythm (FU-2 item 4)', () => {
  it('effectiveRateBpm: rate-driven rhythms clamp the hr value to their range; flutter = atrial/ratio; arrest and VF 0', () => {
    expect(effectiveRateBpm('sinus', {}, 72)).toBe(72);
    expect(effectiveRateBpm('sinusBrady', {}, 72)).toBe(59);
    expect(effectiveRateBpm('svtAvnrt', {}, 180)).toBe(180);
    expect(effectiveRateBpm('aflutter', { ratio: 4 }, 0)).toBe(75);
    expect(effectiveRateBpm('aflutter', { atrialRateBpm: 280, ratio: 'variable' }, 0)).toBeCloseTo(280 / 3, 9);
    for (const id of ['vfCoarse', 'asystole', 'pWaveAsystole'] as const) expect(effectiveRateBpm(id, {}, 80)).toBe(0);
  });
  it('the state event names the rhythm and its rate, and follows instructor changes', () => {
    const e = createEngine({ seed: 3 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(3);
    expect(lastState(ev).rhythm).toEqual({ id: 'sinus', rateBpm: 75 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(5);
    expect(lastState(ev).rhythm).toEqual({ id: 'svtAvnrt', rateBpm: 180 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'aflutter', opts: { ratio: 4 } }));
    e.advanceTo(7);
    expect(lastState(ev).rhythm).toEqual({ id: 'aflutter', rateBpm: 75 });
  });
  it('an engine-initiated change (VF → shock → asystole, zoll-like seed 4) reaches the state event with no command', () => {
    const { e, ev } = devRig('zoll-like', { seed: 4 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.dispatch(defib('charge'));
    e.advanceTo(6);
    expect(lastState(ev).rhythm).toEqual({ id: 'vfCoarse', rateBpm: 0 });
    e.dispatch(defib('shock'));
    e.advanceTo(20);
    const status = ev.filter((x): x is Extract<EngineEvent, { type: 'deviceStatus' }> => x.type === 'deviceStatus').pop()!;
    expect(status.defib!.lastShock!.outcome).toBe('asystole');
    expect(lastState(ev).rhythm).toEqual({ id: 'asystole', rateBpm: 0 });
  });
});
