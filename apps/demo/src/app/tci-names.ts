// How a TCI model and its target are written on the pump face, the Log and the Debrief: the model by its author's
// surname, as the SP5 TCI's brochure writes the models it holds (research/84 TB-02); a target with its drug's
// concentration unit. Engine set ids never reach these texts.
import { concUnit, DRUGS, TCI_SETS } from '@pme/engine-core';

const setOf = (setId: string) => TCI_SETS.find((s) => s.meta.id === setId);

/** "Schnider" for the set `schnider`: the registry's name up to its parenthesis. */
export function tciModelName(setId: string): string {
  const set = setOf(setId);
  return set ? (set.meta.name.split(' (')[0] as string) : 'unregistered model';
}

/** "3 µg/mL": a target of `drugId` in the unit its Cp and Ce are shown in. */
export function tciTargetText(target: unknown, drugId: string): string {
  const row = DRUGS[drugId];
  return row ? `${target} ${concUnit(row)}` : String(target);
}

/** The drug a set was written for. */
export const tciSetDrug = (setId: string): string => setOf(setId)?.meta.drugId ?? '';
