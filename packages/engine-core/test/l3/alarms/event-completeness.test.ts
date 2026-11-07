// research/41 row 54 (brief 49): every row that leaves the alarm list emits exactly one end event for it in the same
// call — `cleared`, or `paused` when Pause empties the list — and a row that stays in the list (live or latched) emits
// none. Checked on every path that removes or keeps a row, then on a seeded random walk of conditions and actions on
// every skin. Synthetic conditions, stepped at the engine's 20 ms tick; chained suppression as the engine applies it.
import { describe, expect, it } from 'vitest';
import { applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { chain, EVENT_HOLD_S } from '../../../src/l3/alarms/conditions.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { AlarmDeviceAction } from '../../../src/types-device.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
const SKINS = ['philips-like', 'zoll-like', 'mindray-like', 'saadat-like', 'ge-like', 'lifepak-like'];
const C = (id: string, level: 1 | 2 | 3, extra: Partial<Condition> = {}): Condition =>
  ({ id, level, category: 'physiological', text: id, delayS: 0, ...extra });
const ASY = C('ASYSTOLE', 1);
const VF = C('VFIB', 1);
const VT = C('VTAC', 1);
const XT = C('EXTREME_TACHY', 1, { holdS: EVENT_HOLD_S }); // as conditions.ts raises it
const HR = C('HR_HIGH', 2, { numeric: 'hr', delayS: 0.5 });
const APNEA = C('apnoea-co2', 1);
const INOP = C('ecgLeadsOff', 3, { category: 'technical' });
const POOL = [ASY, VF, VT, XT, HR, APNEA, INOP];

type Why = 'step' | AlarmDeviceAction['action'] | 'profile';
/** Run one manager call and check the invariant on its output: one end event per row that left, one `raised` per row
 *  that came, nothing else for those ids, and no end event for a row still listed. Returns the call's events. */
function observed(s: AlarmMgrState, why: Why, call: (out: EngineEvent[]) => void): EngineEvent[] {
  const before = new Set(Object.keys(s.active));
  const out: EngineEvent[] = [];
  call(out);
  const after = new Set(Object.keys(s.active));
  const alarms = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm');
  const end = why === 'pause' ? 'paused' : 'cleared';
  for (const id of before) {
    const ends = alarms.filter((e) => e.id === id && (e.state === 'cleared' || e.state === 'paused')).map((e) => e.state);
    if (after.has(id)) expect(ends, `${why}: ${id} stays listed`).toEqual([]);
    else if (why === 'profile') expect(ends, `${why}: ${id} left`).toEqual(['cleared']);
    else expect(ends, `${why}: ${id} left the list`).toEqual([end]);
  }
  for (const id of after) if (!before.has(id)) expect(alarms.filter((e) => e.id === id).map((e) => e.state), `${why}: ${id} came`).toEqual(['raised']);
  return out;
}
function step(s: AlarmMgrState, t: number, conds: Condition[]): EngineEvent[] {
  return observed(s, 'step', (out) => stepAlarms(s, t, chain(conds.map((c) => ({ ...c })), s), out));
}
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) out.push(...step(s, k * TICK, conds(k * TICK)));
  return out;
}
const act = (s: AlarmMgrState, a: Omit<AlarmDeviceAction, 'device'>, t: number) =>
  observed(s, a.action, (out) => applyAlarmAction(s, { device: 'alarm', ...a } as AlarmDeviceAction, t, out));
const states = (out: EngineEvent[], id: string) => out.flatMap((e) => (e.type === 'alarm' && e.id === id ? [e.state] : []));

describe('alarm event stream: a row that leaves the list emits its end', () => {
  it('a condition that ends: cleared (non-latching skin), or latched and kept with no event until acknowledged', () => {
    const m = createAlarmMgr(deviceProfile('mindray-like'));
    expect(states(run(m, 0, 10, (t) => (t < 4 ? [HR] : [])), 'HR_HIGH')).toEqual(['raised', 'cleared']);
    const z = createAlarmMgr(deviceProfile('zoll-like')); // latching 'lethal'
    expect(states(run(z, 0, 10, (t) => (t < 4 ? [ASY] : [])), 'ASYSTOLE')).toEqual(['raised']);
    expect(z.active.ASYSTOLE).toMatchObject({ latched: true });
    expect(states(act(z, { action: 'ack' }, 10), 'ASYSTOLE')).toEqual(['cleared']);
    expect(z.active.ASYSTOLE).toBeUndefined();
  });

  it('the A3.1 shape: EXTREME_TACHY held, latched, back live, latched again — in the list throughout, no cleared', () => {
    const z = createAlarmMgr(deviceProfile('zoll-like'));
    const on = (t: number) => t < 2 || (t >= 12 && t < 13); // raised at 0, latched after its hold, back at 12, latched again
    const out = run(z, 0, 30, (t) => (on(t) ? [XT] : []));
    expect(states(out, 'EXTREME_TACHY')).toEqual(['raised']);
    expect(z.active.EXTREME_TACHY).toMatchObject({ latched: true });
    const leaves = act(z, { action: 'ack' }, 30); // the end comes with the acknowledgement, the moment it leaves
    expect(states(leaves, 'EXTREME_TACHY')).toEqual(['cleared']);
  });

  it('superseded by a higher alarm in its chain (EXTREME_TACHY → VTAC → VFIB): cleared, never latched', () => {
    for (const skin of SKINS) {
      const s = createAlarmMgr(deviceProfile(skin));
      const out = run(s, 0, 12, (t) => (t < 3 ? [XT, HR] : t < 6 ? [VT, XT, HR] : [VF, VT, XT, HR]));
      expect(states(out, 'EXTREME_TACHY'), skin).toEqual(['raised', 'cleared']);
      expect(states(out, 'VTAC'), skin).toEqual(['raised', 'cleared']);
      expect(Object.keys(s.active), skin).toEqual(['VFIB']);
    }
  });

  it('an event alarm kept by its hold: cleared when the hold ends, at once when superseded', () => {
    const s = createAlarmMgr(deviceProfile('mindray-like'));
    const held = run(s, 0, 10, (t) => (t < 1 ? [XT] : []));
    expect(held.filter((e) => e.type === 'alarm').map((e) => [(e as { state: string }).state, Number((e as { t: number }).t.toFixed(2))])).toEqual([['raised', 0], ['cleared', EVENT_HOLD_S]]);
    const s2 = createAlarmMgr(deviceProfile('mindray-like'));
    const sup = run(s2, 0, 3, (t) => (t < 1 ? [XT] : [VT, XT])); // its condition still present, explained by VTAC
    expect(sup.filter((e) => e.type === 'alarm' && e.id === 'EXTREME_TACHY').map((e) => [(e as { state: string }).state, Number((e as { t: number }).t.toFixed(2))])).toEqual([['raised', 0], ['cleared', 1]]);
  });

  it('Pause empties the list with one `paused` per row; a profile switch clears every row', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, () => [ASY, HR, INOP]);
    expect(act(s, { action: 'pause' }, 2).filter((e) => e.type === 'alarm')).toHaveLength(3);
    expect(s.active).toEqual({});
    const z = createAlarmMgr(deviceProfile('zoll-like'));
    run(z, 0, 4, (t) => (t < 1 ? [ASY] : [HR])); // a latched row and a live one
    expect(observed(z, 'profile', (out) => setProfile(z, deviceProfile('mindray-like'), 4, out)).filter((e) => e.type === 'alarm')).toHaveLength(2);
  });

  it('switching a parameter off: its row clears on the next tick', () => {
    const s = createAlarmMgr(deviceProfile('mindray-like'));
    run(s, 0, 2, () => [HR]);
    act(s, { action: 'enable', param: 'HR', value: false }, 2);
    expect(states(step(s, 2.02, []), 'HR_HIGH')).toEqual(['cleared']); // conditions.ts no longer raises it
  });

  it('a seeded random walk of conditions and actions on every skin keeps the invariant on every call', () => {
    let seed = 0x5eed49;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const ACTIONS: Array<Omit<AlarmDeviceAction, 'device'>> = [{ action: 'ack' }, { action: 'silence' }, { action: 'pause' }];
    let ends = 0;
    for (const skin of SKINS) {
      const s = createAlarmMgr(deviceProfile(skin));
      let on = new Set<Condition>();
      for (let k = 0; k < 20_000; k++) {
        const t = k * TICK;
        if (rnd() < 0.02) on = new Set(POOL.filter(() => rnd() < 0.3));
        if (rnd() < 0.002) {
          const a = ACTIONS[Math.floor(rnd() * ACTIONS.length)] as Omit<AlarmDeviceAction, 'device'>;
          if (a.action !== 'pause' || s.profile.pauseS !== null) act(s, a, t);
        }
        const out = step(s, t, [...on]);
        ends += out.filter((e) => e.type === 'alarm' && (e as { state: string }).state === 'cleared').length;
      }
    }
    expect(ends).toBeGreaterThan(100); // the walk exercised the clearing paths, not only raises
  });
});
