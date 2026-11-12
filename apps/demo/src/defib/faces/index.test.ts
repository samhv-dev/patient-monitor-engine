// The defibrillator's faces (plan defibrillator-zoll-m2.md §4.2, piece F0): the registry and the room model → face
// mapping. Only the generic face is built; a `zoll-m2` room shows it until F1 registers the M2's own face. The skin the
// window's monitor wears is instrument.ts defibSkin's, unchanged.
import { describe, expect, it } from 'vitest';
import { defibSkin } from '../../app/instrument.ts';
import { DEFIB_FACES, defibFace } from './index.ts';

describe("the defibrillator's faces", () => {
  it('has the generic face only', () => {
    expect(Object.keys(DEFIB_FACES)).toEqual(['generic']);
  });

  it('maps every room model to the generic face for now, wearing the skin defibSkin gives', () => {
    for (const [model, mon] of [['generic', 'saadat-like'], [null, 'philips-like'], ['zoll-m2', 'saadat-like'], ['lifepak-like', 'ge-like']] as const) {
      expect(defibFace(model, mon)).toEqual({ face: 'generic', skin: defibSkin(model, mon) });
    }
    expect(defibFace('generic', 'saadat-like').skin).toBe('zoll-like');
  });
});
