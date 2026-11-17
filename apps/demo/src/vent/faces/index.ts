// The ventilator's faces (plan vent-skin-edp-ts.md §4.3, §4.5): the registry and the mount every page uses
// (vent-hamilton.html in its three link modes, and the embed). Their ids, names and default are ids.ts's.
import type { VentDriver } from '@pme/ventilator';
import { createCockpit, type Cockpit } from '../core/cockpit.ts';
import type { FaceEnv, FaceModule } from '../core/types.ts';
import { mountSimTools } from '../sim-tools.ts';
import { edpFace } from './edp-ts/face.ts';
import { hamiltonFace } from './hamilton/face.ts';
import type { FaceId } from './ids.ts';

export { DEFAULT_FACE, faceFromLocation, type FaceId } from './ids.ts';
export const FACES: Readonly<Record<FaceId, FaceModule>> = { 'hamilton-style': hamiltonFace, 'edp-ts': edpFace };

/** The cockpit on the driver, the simulator's tools, and the face on both; `stop` takes them all down. */
export function mountFace(d: VentDriver, id: FaceId, o: { linked: boolean } & FaceEnv): { cockpit: Cockpit; stop(): void } {
  const face = FACES[id];
  const cockpit = createCockpit(d, face.spec, o);
  const tools = mountSimTools(cockpit);
  const ui = face.mount(cockpit, tools, o);
  cockpit.start(ui.draw);
  return { cockpit, stop: () => { ui.stop(); tools.stop(); cockpit.stop(); } };
}
