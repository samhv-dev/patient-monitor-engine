// Defibrillator plan E7a (docs/plans/defibrillator-zoll-m2.md §3.1 C3, §6 E7a, brief 199): a device can own an alarm
// instance — its own profile, inputs, silence and pause, and its own published block (deviceStatus.m2.alarm) — run by
// the same alarm rules (manager.ts, conditions.ts) as the bedside monitor's, which stays exactly as it is. The M2's own
// profile, limits and Alarm Control are E7b's: here a profile is installed through the seam (instance.ts), as E7b will,
// and a stand-in skin profile (zoll-like, the IEC defaults: a 90 s mute) plays the device's.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { deviceProfile } from '../../src/l3/alarms/profile.ts';
import { applyInstanceAction, instanceBlock, setInstanceProfile, validateInstanceAction } from '../../src/l3/alarms/instance.ts';
import { M2_IDLE_STATUS } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import type { DeviceState } from '../../src/l3/device-layer.ts';
import type { AlarmDeviceAction } from '../../src/types-device.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const bedside = (a: Omit<AlarmDeviceAction, 'device'>): Command => cmd({ type: 'device', action: { device: 'alarm', ...a } as AlarmDeviceAction });
/** The engine's device state (the seam E7b drives through its commands; a test reaches it directly). */
const devOf = (e: MonitorEngine): DeviceState => (e as unknown as { dev: DeviceState }).dev;
/** The bedside monitor's published stream: its alarm life cycle, its summary, and every tone. */
const BEDSIDE = new Set(['alarm', 'alarmStatus', 'tone', 'toneCancel']);
const bedsideOf = (ev: EngineEvent[]) => ev.filter((x) => BEDSIDE.has(x.type));
const SILENCE: AlarmDeviceAction = { device: 'alarm', action: 'silence' };

/**
 * A saadat-like bedside monitor (a 120 s mute) in a ZOLL M2 room. The bedside HR limit is set at 50 so HR_HIGH sounds
 * on the bedside monitor from the patient's sinus rhythm; with `own`, the M2's instance gets the stand-in profile at
 * 1 s and its ECG input is off (the instance's own sensor), so it raises its own ECG LEADS OFF.
 */
function room(own: boolean): { e: MonitorEngine; ev: EngineEvent[] } {
  const r = devRig('saadat-like');
  expect(r.e.dispatch(model('zoll-m2')).accepted).toBe(true);
  expect(r.e.dispatch(bedside({ action: 'setLimit', param: 'HR', high: 50 })).accepted).toBe(true);
  r.e.advanceTo(1);
  if (own) {
    const inst = devOf(r.e).ownAlarms!.defib!;
    setInstanceProfile(inst, deviceProfile('zoll-like'), 1);
    inst.inputs.leadsOff = true;
  }
  return r;
}

describe('E7a: a device owns a second alarm instance', () => {
  it('the generic room has no owned instance; an M2 room has one, idle, and publishes the idle block', () => {
    const g = devRig('saadat-like');
    g.e.advanceTo(1);
    expect('ownAlarms' in devOf(g.e)).toBe(false);
    const z = room(false);
    z.e.advanceTo(2);
    const inst = devOf(z.e).ownAlarms!.defib!;
    expect(inst.alarms).toBeNull();
    expect(lastStatus(z.ev).m2!.alarm).toEqual(M2_IDLE_STATUS.alarm);
    expect(validateInstanceAction(inst, SILENCE)).toMatch(/no alarm profile/);
    // back to generic: the instance goes with the M2 state
    z.e.dispatch(model('generic'));
    z.e.advanceTo(3);
    expect('ownAlarms' in devOf(z.e)).toBe(false);
  });

  it('the second instance is raised and silenced alone: the bedside monitor is unchanged in state, timing and audio', () => {
    const a = room(true);
    const c = room(false); // control: the same room with the M2 instance idle
    a.e.advanceTo(10);
    c.e.advanceTo(10);
    const ia = devOf(a.e).ownAlarms!.defib!;
    expect(Object.keys(ia.alarms!.active)).toContain('ecgLeadsOff');
    expect(Object.keys(devOf(a.e).alarms.active)).toContain('HR_HIGH');
    expect(Object.keys(devOf(a.e).alarms.active)).not.toContain('ecgLeadsOff');
    expect(lastStatus(a.ev).m2!.alarm.active.map((x) => x.id)).toContain('ecgLeadsOff');
    // silence the M2 alone (E7b's Alarm Control will reach it through the same seam)
    expect(validateInstanceAction(ia, SILENCE)).toBeUndefined();
    applyInstanceAction(ia, SILENCE, 10);
    a.e.advanceTo(30);
    c.e.advanceTo(30);
    expect(ia.alarms!.silencedUntil).toBe(100); // the stand-in profile's 90 s mute
    expect(lastStatus(a.ev).m2!.alarm).toMatchObject({ audio: 'paused', untilS: 100 });
    expect(devOf(a.e).alarms).toEqual(devOf(c.e).alarms);
    expect(devOf(a.e).alarms.silencedUntil).toBeNull();
    expect(devOf(a.e).inputs).toEqual(devOf(c.e).inputs);
    // every bedside alarm, summary and tone event, at the same times
    expect(bedsideOf(a.ev)).toEqual(bedsideOf(c.ev));
    expect(bedsideOf(a.ev).some((x) => x.type === 'alarm' && x.id === 'ecgLeadsOff')).toBe(false);
  });

  it('and the reverse: silencing the bedside monitor leaves the M2 instance as it was', () => {
    const a = room(true);
    const b = room(true);
    a.e.advanceTo(10);
    b.e.advanceTo(10);
    expect(a.e.dispatch(bedside({ action: 'silence' })).accepted).toBe(true);
    a.e.advanceTo(30);
    b.e.advanceTo(30);
    expect(devOf(a.e).alarms.silencedUntil).not.toBeNull();
    expect(devOf(b.e).alarms.silencedUntil).toBeNull();
    const ia = devOf(a.e).ownAlarms!.defib!;
    expect(ia).toEqual(devOf(b.e).ownAlarms!.defib);
    expect(ia.alarms!.silencedUntil).toBeNull();
    expect(lastStatus(a.ev).m2!.alarm).toEqual(lastStatus(b.ev).m2!.alarm);
    expect(lastStatus(a.ev).m2!.alarm.audio).toBe('on');
    // a bedside skin change re-profiles the bedside monitor only
    a.e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'philips-like' } }));
    a.e.advanceTo(31);
    b.e.advanceTo(31);
    expect(devOf(a.e).alarms.profile.skin).toBe('philips-like');
    expect(devOf(a.e).ownAlarms!.defib!.alarms!.profile.skin).toBe('zoll-like');
    expect(devOf(a.e).ownAlarms!.defib!.alarms!.active).toEqual(devOf(b.e).ownAlarms!.defib!.alarms!.active);
  });

  it('a change in the instance reaches deviceStatus at once, not only at the 1 Hz beat', () => {
    const a = room(true);
    a.e.advanceTo(10);
    const ia = devOf(a.e).ownAlarms!.defib!;
    const n = a.ev.length;
    applyInstanceAction(ia, SILENCE, 10);
    a.e.advanceTo(10.1);
    const st = a.ev.slice(n).filter((x): x is Status => x.type === 'deviceStatus');
    expect(st.length).toBeGreaterThan(0);
    expect(st[0]!.t).toBeLessThan(10.1);
    expect(st[0]!.m2!.alarm.audio).toBe('paused');
  });

  it('the snapshot round trip and a follower hold both instances, and the silence ends on time in each', () => {
    const run = () => {
      const r = room(true);
      r.e.advanceTo(10);
      applyInstanceAction(devOf(r.e).ownAlarms!.defib!, SILENCE, 10);
      expect(r.e.dispatch(bedside({ action: 'silence' })).accepted).toBe(true);
      r.e.advanceTo(20);
      return r;
    };
    const host = run();
    const follower = run();
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(devOf(follower.e).ownAlarms).toEqual(devOf(host.e).ownAlarms);
    const restored = createEngine({ seed: 11, device: { skin: 'saadat-like' } });
    const rev: EngineEvent[] = [];
    restored.on((x) => rev.push(x));
    restored.restore(host.e.snapshot());
    expect(devOf(restored).ownAlarms).toEqual(devOf(host.e).ownAlarms);
    expect(devOf(restored).alarms).toEqual(devOf(host.e).alarms);
    const n = host.ev.length;
    restored.advanceTo(140);
    host.e.advanceTo(140);
    // the M2's 90 s mute ends at 100 s, the bedside monitor's 120 s mute at 130 s, in both
    expect(devOf(restored).ownAlarms!.defib!.alarms!.silencedUntil).toBeNull();
    expect(devOf(restored).alarms.silencedUntil).toBeNull();
    expect(devOf(restored).ownAlarms).toEqual(devOf(host.e).ownAlarms);
    // (a restore first revokes the tones queued past its time: the one toneCancel only the restored engine has)
    expect(bedsideOf(rev).slice(1)).toEqual(bedsideOf(host.ev.slice(n)));
    expect(bedsideOf(rev)[0]).toEqual({ type: 'toneCancel', after: 20 });
    expect(lastStatus(rev)).toEqual(lastStatus(host.ev));
  });

  it('the published block reads the instance (instanceBlock): limits and active from the instance, idle without a profile', () => {
    const z = room(true);
    z.e.advanceTo(5);
    const inst = devOf(z.e).ownAlarms!.defib!;
    const b = instanceBlock(inst, 5);
    expect(Object.keys(b.limits).sort()).toEqual(Object.keys(deviceProfile('zoll-like').limits).sort());
    expect(b.active.map((x) => x.id)).toEqual(['ecgLeadsOff']);
    expect(b).toMatchObject({ audio: 'on', alarmsOff: false, untilS: null });
  });
});
