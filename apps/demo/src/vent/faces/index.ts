// The ventilator's faces (plan vent-skin-edp-ts.md §4.3, §4.5): the registry, the choice from the address, and the
// mount every page uses (vent-hamilton.html in its three link modes, and the embed). V1 adds 'edp-ts' (`?face=edp-ts`).
// The default is 'hamilton-style' until piece VD.
import type { VentDriver } from '@pme/ventilator';
import { createCockpit, type Cockpit } from '../core/cockpit.ts';
import type { FaceEnv, FaceModule } from '../core/types.ts';
import { mountSimTools } from '../sim-tools.ts';
import { edpFace } from './edp-ts/face.ts';
import { hamiltonFace } from './hamilton/face.ts';

export const FACES = { 'hamilton-style': hamiltonFace, 'edp-ts': edpFace } as const satisfies Record<string, FaceModule>;
export type FaceId = keyof typeof FACES;
export const DEFAULT_FACE: FaceId = 'hamilton-style';

/** `?face=<id>`; an unknown or missing id is the default face. */
export function faceFromLocation(loc: { search: string }): FaceId {
  const id = new URLSearchParams(loc.search).get('face');
  return id !== null && id in FACES ? (id as FaceId) : DEFAULT_FACE;
}

/** The cockpit on the driver, the simulator's tools, and the face on both; `stop` takes them all down. */
export function mountFace(d: VentDriver, id: FaceId, o: { linked: boolean } & FaceEnv): { cockpit: Cockpit; stop(): void } {
  const face = FACES[id];
  const cockpit = createCockpit(d, face.spec, o);
  const tools = mountSimTools(cockpit);
  const ui = face.mount(cockpit, tools, o);
  cockpit.start(ui.draw);
  return { cockpit, stop: () => { ui.stop(); tools.stop(); cockpit.stop(); } };
}
