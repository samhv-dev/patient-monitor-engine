import { describe, expect, it } from 'vitest';
import { beepGain, dbToGain, volumeGain } from '../src/alarm-bursts.ts';
import { IEC_STYLE, SAADAT } from '../src/profiles/index.ts';

const dB = (a: number, b: number) => 20 * Math.log10(a / b);

describe('the pulse tone level follows the alarm volume law', () => {
  it('a beep step is as loud as the same alarm step when the data put it at 0 dB', () => {
    const beep = { volume: { min: 1, max: 7, default: 1 }, levelDb: 0 };
    expect(beepGain(SAADAT.volume, beep)).toBeCloseTo(volumeGain(SAADAT.volume, 1), 12);
    expect(beepGain(SAADAT.volume, beep)).toBeCloseTo(0.5 * 10 ** (-1.1), 12); // 6 steps of 22/6 dB below the top
  });

  it('the beep keeps its own steps: IEC-style beep 3 of 0–10 is 6 dB under a high alarm at 5', () => {
    const beep = { volume: { min: 0, max: 10, default: 3 }, levelDb: 0 };
    expect(dB(beepGain(IEC_STYLE.volume, beep), volumeGain(IEC_STYLE.volume, 5))).toBeCloseTo(-6, 9);
  });

  it('levelDb moves the beep against the alarm; another step moves it by the law; step 0 is silent', () => {
    const beep = { volume: { min: 0, max: 10, default: 3 }, levelDb: -6 };
    expect(beepGain(IEC_STYLE.volume, beep) / beepGain(IEC_STYLE.volume, { ...beep, levelDb: 0 })).toBeCloseTo(dbToGain(-6), 12);
    expect(dB(beepGain(IEC_STYLE.volume, beep, 4), beepGain(IEC_STYLE.volume, beep))).toBeCloseTo(IEC_STYLE.volume.dbPerStep, 9);
    expect(beepGain(IEC_STYLE.volume, beep, 0)).toBe(0);
  });
});
