// Renderer request R-2 (ruling R25): the IIFE global PatientMonitor.transports carries @pme/controller's adapters.
import { describe, expect, it } from 'vitest';
import { transports as controllerTransports } from '@pme/controller';
import { transports } from '../src/index.ts';

describe('PatientMonitor.transports', () => {
  it('is the five controller adapters under their brief §7.5 names', () => {
    expect(Object.keys(transports).sort()).toEqual(['broadcastChannel', 'inProcess', 'postMessage', 'webrtc', 'websocket']);
    expect(transports).toBe(controllerTransports);
  });
});
