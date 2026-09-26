// THE drug library (Stage 7g): every v1 drug as data. Rows live in three files by family; this is the index.
import type { DrugRow } from '../row.ts';
import { ANAESTHETIC_ROWS } from './rows-anaesthetic.ts';
import { CARDIOVASCULAR_ROWS } from './rows-cardiovascular.ts';

const ALL: DrugRow[] = [...ANAESTHETIC_ROWS, ...CARDIOVASCULAR_ROWS];

export const DRUGS: Record<string, DrugRow> = Object.fromEntries(ALL.map((r) => [r.id, r]));
export const DRUG_IDS: readonly string[] = ALL.map((r) => r.id);
export const drugRow = (id: string): DrugRow | undefined => DRUGS[id];
