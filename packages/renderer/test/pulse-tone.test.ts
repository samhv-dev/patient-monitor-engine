import { beepGain, dbToGain, getAlarmProfile, volumeGain } from '@pme/audio';
import { spo2PitchHz } from '@pme/engine-core';
import { PRESET_IDS, resolveSkin, SKIN_IDS, type ResolvedSkin } from '@pme/skins';
import { describe, expect, it } from 'vitest';
import { beatToneHz, pulseTone } from '../src/pulse-tone.ts';

const STYLES = [...SKIN_IDS, ...PRESET_IDS];
const dB = (a: number, b: number) => 20 * Math.log10(a / b);
/** A high-priority alarm's gain at the style's factory alarm volume. */
const highAlarm = (r: ResolvedSkin) => {
  const v = { ...getAlarmProfile(r.audio.alarm.profile).volume, ...r.audio.alarm.volume };
  return volumeGain(v, v.default);
};
const withBeep = (r: ResolvedSkin, beep: Partial<ResolvedSkin['audio']['beep']>): ResolvedSkin => ({ ...r, audio: { ...r.audio, beep: { ...r.audio.beep, ...beep } } });

describe('the pulse tone of each style comes from its data', () => {
  it.each(STYLES)('%s: level from its beep volume through its alarm volume law', (id) => {
    const r = resolveSkin(id);
    expect(pulseTone(r).gain).toBeCloseTo(beepGain(getAlarmProfile(r.audio.alarm.profile).volume, r.audio.beep), 12);
  });

  it('against a high-priority alarm at factory volume: Saadat-style level with it, IEC-style 6 dB under', () => {
    const rel = (id: string) => +dB(pulseTone(resolveSkin(id)).gain, highAlarm(resolveSkin(id))).toFixed(6);
    expect(Object.fromEntries(SKIN_IDS.map((id) => [id, rel(id)]))).toEqual({
      'ge-like': -6, 'lifepak-like': -6, 'mindray-like': -6, 'philips-like': -6, 'saadat-like': 0, 'zoll-like': -6,
    });
    for (const id of PRESET_IDS) expect(rel(id)).toBe(rel(resolveSkin(id).skinId));
  });

  it.each(STYLES)('%s: no level is a number in code: the beep moves with the data', (id) => {
    const r = resolveSkin(id);
    const g = pulseTone(r).gain;
    expect(pulseTone(withBeep(r, { levelDb: r.audio.beep.levelDb - 6 })).gain / g).toBeCloseTo(dbToGain(-6), 12);
    const up = Math.min(r.audio.beep.volume.max, r.audio.beep.volume.default + 1);
    if (up > r.audio.beep.volume.default) expect(pulseTone(withBeep(r, { volume: { ...r.audio.beep.volume, default: up } })).gain).toBeGreaterThan(g);
  });

  it('the source names the tone: ECG and the HR source take the QRS, the pleth the pulse', () => {
    const r = resolveSkin('philips-like');
    expect(STYLES.map((id) => pulseTone(resolveSkin(id)).kind)).toEqual(STYLES.map(() => 'qrs'));
    expect(pulseTone(withBeep(r, { source: 'HR_SOURCE' })).kind).toBe('qrs');
    expect(pulseTone(withBeep(r, { source: 'PLETH' })).kind).toBe('pulse');
  });
});

describe('the pulse tone without a valid SpO2 sounds at the style\'s neutral pitch', () => {
  it.each(STYLES)('%s: the pitch at a valid SpO2, the neutral pitch from the data when it is lost, the pitch on its return', (id) => {
    const r = resolveSkin(id);
    const low = spo2PitchHz(75);
    const heard = [low, undefined, low].map((f) => beatToneHz(r, f));
    expect(heard).toEqual([low, r.audio.beep.neutralHz, low]);
    expect(heard[1]).toBeLessThanOrEqual(low); // no rise toward the 100 % pitch when the reading is lost
    expect(heard[1]).toBeLessThan(spo2PitchHz(100));
    expect(beatToneHz(withBeep(r, { neutralHz: 900 }), undefined)).toBe(900);
  });
});
