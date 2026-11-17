// The generic defibrillator's energy list: the ZOLL X Series guide's settings, checked at dispatch from every sender;
// stepping along it stops at its ends; an energy changed while charging or charged disarms the device.
import { describe, expect, it } from 'vitest';
import { defibEnergiesJ, DEFIB_MODELS } from '../../src/l3/alarms/profile.ts';
import { stepEnergy, X_SERIES_ENERGIES_J, X_SERIES_ENERGIES_SOURCE } from '../../src/l3/defib-pacer/x-series.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig, setDefibModel } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const lastDefib = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!.defib!;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });

function generic() {
  const r = devRig('saadat-like');
  setDefibModel(r.e, 'generic');
  r.e.advanceTo(1);
  return r;
}

describe('the generic defibrillator energy list', () => {
  it('is the X Series guide\'s, with its source; 150 J is on it; no model chosen has none', () => {
    expect(X_SERIES_ENERGIES_J).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200]);
    expect(X_SERIES_ENERGIES_SOURCE).toEqual({ document: "ZOLL X Series Operator's Guide, REF 9650-001355-01", revision: 'P', page: 'A-3, Table A-2' });
    expect(DEFIB_MODELS.generic!.energiesJ).toBe(X_SERIES_ENERGIES_J);
    expect(defibEnergiesJ('generic')).toContain(150);
    expect(DEFIB_MODELS.generic!.defib).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50 }); // Shock 1, p. 15-2
    expect([defibEnergiesJ(null), defibEnergiesJ('nonesuch'), defibEnergiesJ('toString')]).toEqual([null, null, null]);
  });

  it('steps along the list and stops at its ends; an energy off it steps to its neighbours', () => {
    const l = X_SERIES_ENERGIES_J;
    expect([stepEnergy(l, 120, 1), stepEnergy(l, 120, -1), stepEnergy(l, 10, 1), stepEnergy(l, 15, -1)]).toEqual([150, 100, 15, 10]);
    expect([stepEnergy(l, 200, 1), stepEnergy(l, 1, -1)]).toEqual([null, null]);
    expect([stepEnergy(l, 360, -1), stepEnergy(l, 140, 1), stepEnergy(l, 140, -1)]).toEqual([200, 150, 120]);
  });

  it('accepts every energy on the list and refuses one off it, for energy select and for a charge that names one', () => {
    const { e } = generic();
    for (const j of X_SERIES_ENERGIES_J) expect(e.dispatch(defib('selectEnergy', { energyJ: j })).accepted, `${j} J`).toBe(true);
    for (const a of ['selectEnergy', 'charge']) for (const j of [0, 11, 140, 300, 360]) expect(e.dispatch(defib(a, { energyJ: j })).accepted, `${a} ${j} J`).toBe(false);
  });

  it('an energy selected while charging or ready disarms the device; the new energy is kept', () => {
    const { e, ev } = generic();
    for (const wait of [0.5, 6]) {
      e.dispatch(defib('charge'));
      e.advanceTo(e.now().simT + wait);
      expect(lastDefib(ev).state).toBe(wait < 1 ? 'charging' : 'ready');
      expect(e.dispatch(defib('selectEnergy', { energyJ: 150 })).accepted).toBe(true);
      e.advanceTo(e.now().simT + 0.1);
      expect(lastDefib(ev)).toMatchObject({ state: 'idle', energyJ: 150 });
      expect(ev.some((x) => x.type === 'marker' && x.kind === 'disarm')).toBe(true);
      e.dispatch(defib('selectEnergy', { energyJ: 120 }));
    }
  });
});
