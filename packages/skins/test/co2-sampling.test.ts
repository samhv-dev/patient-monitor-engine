// R39-5 (research 09 §5): sidestream CO2 transport delay and 10–90 % rise time are per-skin data.
import { describe, expect, it } from 'vitest';
import { resolveSkin, SKINS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const EXPECTED: Record<string, [number, number, string]> = {
  'philips-like': [2.3, 240, 'documented'], // Microstream
  'saadat-like': [2.6, 200, 'documented'], // Masimo ISA module
  'mindray-like': [3.5, 280, 'documented'], // DRYLINE
  'ge-like': [3.5, 280, 'documented'], // 120 mL/min sidestream
  'zoll-like': [2.6, 200, 'assumed'],
  'lifepak-like': [2.6, 200, 'assumed'],
};

describe('R39-5 sidestream CO2 sampling per skin', () => {
  it.each(Object.keys(EXPECTED))('%s: delay/rise and its own provenance', (id) => {
    const [delay, rise, tag] = EXPECTED[id]!;
    const { skin } = resolveSkin(id);
    expect(skin.co2.sidestreamDelayS).toBe(delay);
    expect(skin.co2.riseTimeMs).toBe(rise);
    const prov = SKINS[id]!.provenance;
    for (const k of ['co2.sidestreamDelayS', 'co2.riseTimeMs']) {
      expect(prov[k]?.tag).toBe(tag);
      expect(prov[k]?.source).toContain('research/09 §5');
    }
  });

  it('the schema requires both fields and bounds them (delay 0–10 s, rise 20–1000 ms)', () => {
    const s = structuredClone(resolveSkin('philips-like').skin) as unknown as { co2: Record<string, unknown> };
    s.co2.sidestreamDelayS = 20;
    expect(validate('skin', s).ok).toBe(false);
    s.co2.sidestreamDelayS = 2.3;
    s.co2.riseTimeMs = 5;
    expect(validate('skin', s).ok).toBe(false);
    delete s.co2.riseTimeMs;
    expect(validate('skin', s).errors.join('\n')).toContain("must have required property 'riseTimeMs'");
  });
});
