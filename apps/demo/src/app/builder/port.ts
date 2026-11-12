// The builder's port-check line (docs/plans/scenario-builder.md §7.1, §7.3; piece B7): what a draft that came from a
// library card says about its port. A /1 card's draft lists the converter's flags, each in words at its place; a card with
// a row in ports.json shows the twin run's last result as that row records it (the words CI's ports.slow.test.ts last
// read; the test fails when the run no longer reads so), never computed in the page. Pure, no DOM.
import type { ScenarioDoc } from '@pme/controller/scenario';
import manifest from '../showcase/ports.json';
import { LIBRARY } from '../scenarios.ts';
import { convertV1, type PortFlag } from './convert.ts';

/** Where a draft came from (§7.1: the original's id and format, kept in the draft's metadata, not in the card). */
export interface DraftOrigin { id: string; schema: 'pme-scenario/1' | 'pme-scenario/2' }

/** What the builder reads of a ports.json row: the /1 card's id and the twin run's words. */
export interface PortCheckRow { card: string; result: string }
export const PORT_ROWS: readonly PortCheckRow[] = (manifest as { ports: PortCheckRow[] }).ports;

/** The port check's line for a draft whose card or original has one of `ids`. */
export function portCheckLine(ids: readonly string[], rows: readonly PortCheckRow[] = PORT_ROWS): string {
  const row = rows.find((r) => ids.includes(r.card));
  return row ? row.result : 'Port check: no port of this card in ports.json yet, so no twin run has been read';
}

/** A flag in words, as a line the builder places by its path: `<at>: <what it was>. To port it: <what a port must decide>.` */
export const flagLine = (f: PortFlag): string => `${f.at}: ${f.was}. To port it: ${f.decide}.`;

/** The converter's flags of a /1 library card (none for another origin, or a card no longer in the library). */
export function originFlags(origin: DraftOrigin | undefined): PortFlag[] {
  if (origin?.schema !== 'pme-scenario/1') return [];
  const c = LIBRARY.find((x) => x.id === origin.id);
  return c && (c.doc as { schema?: string }).schema === 'pme-scenario/1' ? convertV1(c.doc as ScenarioDoc).flags : [];
}
