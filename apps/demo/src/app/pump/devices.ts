// Plan pump-rack-tci.md D12 (S1's profiles) for the app, and finding N125: the shipped device profiles
// (packages/controller/pump-devices/, every file but its JSON Schema), checked by the same rules as the CI's source check
// (loadPumpDevices). The laptop's host checks every pump command against them (C2: AppSession passes them to its
// HostSession); the pump tablet's faces and flows read the same files, so a range or a gap the face shows is the one the
// host refuses with. Eager: the three files are small, and both the host and the tablet need them before the first
// command. A set that breaks a rule is not used (null): the host then refuses every pump command and the faces say the
// profile is not loaded, rather than half-trust it.
import { loadPumpDevices, type PumpDeviceFiles, type PumpDevices } from '@pme/controller';
import type { FaceProfiles } from './face.ts';

const FILES = import.meta.glob<{ default: unknown }>(['../../../../../packages/controller/pump-devices/*.json', '!**/schema.json'], { eager: true });

let cached: PumpDevices | null | undefined;
/** The shipped device profiles, or null when they break their source rules (said once on the console). */
export function shippedPumpDevices(): PumpDevices | null {
  if (cached !== undefined) return cached;
  const files: PumpDeviceFiles = {};
  for (const [path, mod] of Object.entries(FILES)) files[path.replace(/^.*\/pump-devices\//, '')] = mod.default;
  const r = loadPumpDevices(files);
  if (!r.ok) console.error('[pme] the pump device profiles break their source rules; pump commands are refused', r.problems);
  return (cached = r.ok ? r.devices : null);
}

/** What the generic face reads of them (D12): a syringe channel's SP-500, a drip channel's OT-701, TCI's SP5 TCI. */
export function faceProfilesOf(d: PumpDevices | null): FaceProfiles | null {
  return d ? ({ syringe: d['sp-500'], drip: d['ot-701'], tci: d['sp5-tci'] } as unknown as FaceProfiles) : null;
}
