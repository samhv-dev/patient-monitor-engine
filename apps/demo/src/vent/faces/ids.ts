// The ventilator's faces by id and name, apart from their code: Room setup offers them and the app's pages put the chosen
// one in a cockpit's address without loading a face.

export const FACE_CHOICES = [
  { id: 'hamilton-style', label: 'Hamilton-style' },
  { id: 'edp-ts', label: 'EDP-TS' },
] as const;
export type FaceId = (typeof FACE_CHOICES)[number]['id'];
/** The face a room and an address without one get (plan vent-skin-edp-ts.md piece VD switches it). */
export const DEFAULT_FACE: FaceId = 'hamilton-style';

/** A known face id, else the default. */
export const faceOf = (v: unknown): FaceId => FACE_CHOICES.find((c) => c.id === v)?.id ?? DEFAULT_FACE;

/** `?face=<id>`; an unknown or missing id is the default face. */
export const faceFromLocation = (loc: { search: string }): FaceId => faceOf(new URLSearchParams(loc.search).get('face'));
