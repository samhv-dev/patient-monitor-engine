// Header readout of the defibrillator and pacer (brief §6.5), added for the 4b gate screenshots.
import { describe, expect, it } from 'vitest';
import { deviceText } from '../src/device-ui.ts';

const st = (defib: object | null, pacer: object | null) => ({ type: 'deviceStatus', t: 1, defib, pacer, hrDashes: false }) as never;

describe('deviceText', () => {
  it('is empty with the defibrillator idle, SYNC off and the pacer off', () => {
    expect(deviceText(null)).toBe('');
    expect(deviceText(st({ energyJ: 200, state: 'idle', sync: false, readyAt: null, shocks: 0, lastShock: null }, { mode: 'off', ratePpm: 70, mA: 0, paused: false }))).toBe('');
  });
  it('shows energy, charging/ready and SYNC, then the pacer settings', () => {
    expect(deviceText(st({ energyJ: 120, state: 'charging', sync: true, readyAt: null, shocks: 0, lastShock: null }, null))).toBe('120 J CHARGING SYNC');
    expect(deviceText(st({ energyJ: 120, state: 'ready', sync: false, readyAt: 5, shocks: 0, lastShock: null }, { mode: 'fixed', ratePpm: 70, mA: 90, paused: true }))).toBe('120 J READY  PACER FIXED 70 ppm 90 mA PAUSED');
  });
});
