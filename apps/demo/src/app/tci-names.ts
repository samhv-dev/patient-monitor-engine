// How a TCI model and its target are written on the pump face, the Log and the Debrief: the model by its author's
// surname, as the SP5 TCI's brochure writes the models it holds (research/84 TB-02); a target with its drug's
// concentration unit. Engine set ids never reach these texts. Whether the TCI pump holds a set is read from its device
// profile's library, matched by drug and surname.
import type { Sp5TciModel, Sp5TciProfile } from '@pme/controller';
import { concUnit, DRUGS, TCI_SETS } from '@pme/engine-core';

const setOf = (setId: string) => TCI_SETS.find((s) => s.meta.id === setId);
const surname = (name: string): string => name.split(' (')[0] as string;

/** "Schnider" for the set `schnider`: the registry's name up to its parenthesis. */
export function tciModelName(setId: string): string {
  const set = setOf(setId);
  return set ? surname(set.meta.name) : 'unregistered model';
}


/** "3 µg/mL": a target of `drugId` in the unit its Cp and Ce are shown in. */
export function tciTargetText(target: unknown, drugId: string): string {
  const row = DRUGS[drugId];
  return row ? `${target} ${concUnit(row)}` : String(target);
}

/** The drug a set was written for. */
export const tciSetDrug = (setId: string): string => setOf(setId)?.meta.drugId ?? '';

/** The models the pump's library holds for `drugId`, as its brochure writes them. */
export const pumpModels = (pump: Sp5TciProfile | null | undefined, drugId: string): Sp5TciModel[] =>
  pump?.tci.library.find((d) => d.drugId === drugId)?.models ?? [];

/** The pump's own entry for set `setId`, or undefined when the pump does not hold that model. */
export const pumpModel = (pump: Sp5TciProfile | null | undefined, setId: string): Sp5TciModel | undefined =>
  pumpModels(pump, tciSetDrug(setId)).find((m) => surname(m.name) === tciModelName(setId));
