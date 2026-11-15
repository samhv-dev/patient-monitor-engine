// The defibrillator's faces (plan defibrillator-zoll-m2.md §4.2, piece F0): the registry and the room model → face
// mapping (what instrument.ts defibSkin decided alone before: the skin stays its, the face is added here). Only the
// generic face is built; F1 adds `'zoll-m2'`. Until then a `zoll-m2` room shows the generic face, which says so.
import { defibSkin } from '../../app/instrument.ts';
import { genericFace } from './generic/face.ts';

export const DEFIB_FACES = { generic: genericFace } as const;
export type DefibFaceId = keyof typeof DEFIB_FACES;

/** The face a room's defibrillator model is drawn with, and the skin the window's monitor wears (defibSkin's). */
export function defibFace(model: string | null, monitorSkin: string): { face: DefibFaceId; skin: string } {
  const face: DefibFaceId = model !== null && Object.hasOwn(DEFIB_FACES, model) ? (model as DefibFaceId) : 'generic';
  return { face, skin: defibSkin(model, monitorSkin) };
}
