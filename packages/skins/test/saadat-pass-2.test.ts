// Saadat fidelity pass 2 (the rc.3 photo review, IMG_8113; owner rulings E114–E116): the new optional skin keys are
// validated, the shipped skin carries them, themes darken a strip field's own hex, and the as-found preset keeps its
// alarms off.
import { describe, expect, it } from 'vitest';
import { contrastRatio, resolveSkin, SKINS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const saadat = () => structuredClone(resolveSkin('saadat-like').skin) as unknown as Record<string, any>;

describe('pass 2 skin keys', () => {
  it('saadat-like carries them; no other skin does', () => {
    const s = resolveSkin('saadat-like').skin;
    expect(s.layout.laneText).toMatchObject({ fontPx: 18, gutterPx: { ecg: 0, wave: 18 }, rightInsetPx: 45, ecgLabelX: [10, 65, 183], scaleX: { edge: 30, mid: 85 } });
    expect(s.layout.grid).toMatchObject({ labelPx: { HR: 41, CO2: 21, TEMP: 20 }, labelWeight: 700 });
    expect(s.sweep).toMatchObject({ gapPx: 10, lineWidthPx: 2, pxPerMm: 3.1 });
    expect(s.co2.scaleLineTop).toBe(true);
    expect(s.ecg.laneLeads).toEqual(['II', 'II']); // E116
    for (const id of Object.keys(SKINS).filter((k) => k !== 'saadat-like')) {
      const o = resolveSkin(id).skin;
      expect([o.sweep.pxPerMm, o.co2.scaleLineTop, o.layout.laneText, o.layout.grid], id).toEqual([undefined, undefined, undefined, undefined]);
    }
  });

  it('the schema takes each key in range and refuses one out of range', () => {
    expect(validate('skin', saadat()).errors).toEqual([]);
    const bad: Array<[string, (s: Record<string, any>) => void]> = [
      ['fontPx', (s) => (s.layout.laneText.fontPx = 60)],
      ['gutterPx', (s) => (s.layout.laneText.gutterPx = { ecg: 0, wave: 80 })],
      ['gutterPx (both kinds)', (s) => (s.layout.laneText.gutterPx = { ecg: 0 })],
      ['rightInsetPx', (s) => (s.layout.laneText.rightInsetPx = -1)],
      ['ecgLabelX', (s) => (s.layout.laneText.ecgLabelX = [])],
      ['scaleX', (s) => (s.layout.laneText.scaleX = { edge: 30 })],
      ['labelPx', (s) => (s.layout.grid.labelPx = { XX: 20 })],
      ['labelWeight', (s) => (s.layout.grid.labelWeight = 950)],
      ['strip colour', (s) => (s.layout.grid.strip.fields[4].color = 'yellow')],
      ['pxPerMm', (s) => (s.sweep.pxPerMm = 20)],
      ['scaleLineTop', (s) => (s.co2.scaleLineTop = 'yes')],
    ];
    for (const [what, f] of bad) {
      const s = saadat();
      f(s);
      expect(validate('skin', s).ok, what).toBe(false);
    }
  });

  it('C6: a strip field may name its own hex; a theme darkens it like the colour keys', () => {
    const own = resolveSkin('saadat-like').skin.layout.grid!.strip.fields.find((f) => f.label === '%SpMet')!;
    expect(own.color).toBe('#ECE84A');
    const lit = resolveSkin('saadat-like', { theme: 'projector-light' }).skin;
    const f = lit.layout.grid!.strip.fields.find((x) => x.label === '%SpMet')!;
    expect(f.color).not.toBe('#ECE84A');
    expect(contrastRatio(f.color!, lit.background)).toBeGreaterThanOrEqual(3);
  });

  it('E114: alarms on at power-on; the as-found preset keeps them off', () => {
    expect(resolveSkin('saadat-like').skin.alarms.factoryEnabled).toBe(true);
    expect(resolveSkin('iran-icu-as-found').skin.alarms.factoryEnabled).toBe(false);
  });

  it('E115: the adult limits the tiles print and the alarms honour', () => {
    const l = resolveSkin('saadat-like').limits.adult!;
    expect(l).toMatchObject({
      HR: [50, 150], SpO2: [90, 100], NIBP_S: [90, 160], NIBP_D: [50, 100], NIBP_M: [60, 110], EtCO2: [30, 50], AWRR: [5, 30],
      ART_S: [70, 165], ART_D: [35, 100], ART_M: [60, 115], CVP_M: [-5, 15], T1: [35, 39], T2: [35, 39],
    });
    expect(l.EtCO2_pctV).toBeUndefined();
  });
});
