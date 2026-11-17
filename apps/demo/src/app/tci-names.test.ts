import { TCI_SETS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';
import { shippedPumpDevices } from './pump/devices.ts';
import { tciModelName, tciSetDrug } from './tci-names.ts';

const pump = (setId: string, mode: string, target: number) => describeCommand({ type: 'applyEvent', event: { kind: 'pump', ch: 2, action: 'tci', setId, mode, target } });

describe('a TCI model by its author\'s surname, a target with its unit', () => {
  it('every set the SP5 TCI holds is named as its brochure writes the model', () => {
    const library = shippedPumpDevices()!['sp5-tci'].tci.library;
    const held = TCI_SETS.flatMap((s) => {
      const model = library.find((d) => d.drugId === s.meta.drugId)?.models.find((m) => m.name === tciModelName(s.meta.id));
      return model ? [[s.meta.id, model.name]] : [];
    });
    expect(held).toEqual([['schnider', 'Schnider'], ['marsh', 'Marsh'], ['minto', 'Minto'], ['gepts', 'Gepts']]);
  });
  it('a set the SP5 TCI does not hold keeps its own surname, never its id', () => {
    expect(TCI_SETS.map((s) => tciModelName(s.meta.id))).toEqual(['Eleveld', 'Schnider', 'Marsh', 'Modified Marsh', 'Minto', 'Shafer', 'Gepts']);
    expect(tciModelName('no-such-set')).toBe('unregistered model');
    expect(tciSetDrug('minto')).toBe('remifentanil');
  });
  it('the Log line of a pump TCI and of a TCI event: the model name and the target in its drug\'s concentration unit', () => {
    expect(pump('schnider', 'effect', 3)).toBe('Channel 2: TCI Schnider, Ce target 3 µg/mL');
    expect(pump('minto', 'plasma', 4)).toBe('Channel 2: TCI Minto, Cp target 4 ng/mL');
    expect(pump('marsh', 'plasma', 0)).toBe('Channel 2: TCI stopped');
    expect(describeCommand({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3.5 } })).toBe('Propofol target-controlled infusion, effect-site target 3.5 µg/mL');
  });
});
