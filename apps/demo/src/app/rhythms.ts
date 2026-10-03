// The rhythm picker's groups (research/13 brief §7 "Rhythm picker"): the 36 library rhythms in the order a clinician
// looks for them. Labels come from the controller's rhythm vocabulary; an id this map does not know (a rhythm a later
// stage adds) lands in "Other" with its vocabulary label.
import { RHYTHM_IDS } from '@pme/engine-core';
import { stage1Vocabulary } from '@pme/controller';

const LABELS = new Map(stage1Vocabulary().rhythms.map((r) => [r.id as string, r.label]));
export const rhythmLabel = (id: string): string => LABELS.get(id) ?? 'Other rhythm';

export const RHYTHM_GROUPS: ReadonlyArray<[string, readonly string[]]> = [
  ['Sinus', ['sinus', 'sinusBrady', 'sinusTachy', 'sinusArrhythmia', 'sinusPause']],
  ['Atrial', ['afib', 'aflutter', 'atrialTach', 'mat', 'svtAvnrt', 'svtAvrt', 'wpwSinus', 'preexcitedAf']],
  ['Junctional', ['junctionalEscape', 'junctionalAccel', 'junctionalTachy']],
  ['AV block', ['avb1', 'avb2Mobitz1', 'avb2Mobitz2', 'avb2to1', 'avbHighGrade', 'avb3Narrow', 'avb3Wide']],
  ['Ventricular', ['idioventricular', 'aivr', 'vtMono', 'vtPoly', 'torsades']],
  ['Arrest', ['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal']],
  ['Paced', ['pacedAAI', 'pacedVVI', 'pacedDDD']],
];

/** Groups with every library id placed once ("Other" collects ids the map does not name). */
export function rhythmGroups(): Array<[string, string[]]> {
  const known = new Set<string>(RHYTHM_IDS);
  const placed = new Set<string>();
  const out: Array<[string, string[]]> = RHYTHM_GROUPS.map(([g, ids]) => [g, ids.filter((id) => known.has(id) && !placed.has(id) && placed.add(id))]);
  const rest = [...known].filter((id) => !placed.has(id));
  if (rest.length) out.push(['Other', rest]);
  return out.filter(([, ids]) => ids.length > 0);
}
