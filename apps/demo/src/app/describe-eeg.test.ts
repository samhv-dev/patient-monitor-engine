// EEG plan E12, Q9: the EEG device commands in the Log and the case record (both write describeCommand's line). Before,
// every one of them read "Device setting changed", so a debrief could not tell a loose electrode from the device's start.
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';

const eeg = (action: string, value?: unknown) => describeCommand({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });

describe('the EEG device commands in clinical words (Q9)', () => {
  it('the electrodes and the ECG pickup (the instructor\'s artefact switches)', () => {
    expect(eeg('impedance', [2, 2, 20])).toBe('EEG electrodes 2 · 2 · 20 kΩ');
    expect(eeg('impedance', 2)).toBe('EEG electrodes 2 kΩ each');
    expect(eeg('ecgPickup', true)).toBe('EEG ECG pickup on');
    expect(eeg('ecgPickup', false)).toBe('EEG ECG pickup off');
  });
  it('the device itself (Room setup)', () => {
    expect(eeg('on')).toBe('EEG device on');
    expect(eeg('off')).toBe('EEG device off');
    expect(eeg('model', 'generic')).toBe('EEG device: Processed EEG (generic)');
  });
});
